"use client";
// Beleg erfassen oder bearbeiten. Das Foto kommt zuerst (am Set die eigentliche Handlung), dann Betrag, Lieferant,
// Zweck und Datum; seltene Angaben stehen unter "Weitere Angaben". Brutto oder Netto eingeben, die Steuer wird live
// gerechnet; § 13b-Schalter. Fotos werden vor dem Hochladen verkleinert (Vercel erlaubt 4,5 MB je Anfrage).
import { Camera, ChevronRight, ExternalLink, FileText, Info, Lock, Paperclip, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionForm, FieldError, useFormCtx } from "@/components/ui/action-form";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import { attachLateReceipt, saveExpense } from "@/lib/finanzen/actions";
import { fromNet, roundHalfUp, SMALL_AMOUNT_LIMIT_CENTS, splitGross, TAX_RATES } from "@/lib/finanzen/core";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/labels";

const eurFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const eur = (c: number) => eurFmt.format(c / 100);
function parseCents(v: string): number | null {
  const raw = v.trim().replace(/\s|€/g, "");
  if (!raw) return null;
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export type ExpenseDefaults = {
  id?: number;
  date: string;
  supplier?: string;
  description?: string;
  category?: string;
  grossCents?: number;
  netCents?: number;
  taxRate?: number;
  reverseCharge?: boolean;
  paymentMethod?: string | null;
  paidOn?: string | null;
  supplierInvoiceNo?: string | null;
  clientId?: number | null;
  notes?: string | null;
  receiptName?: string | null;
};

/** Gespeicherte Belegdatei (Detailseite) */
export type ExpenseFile = { href: string; mime: string; name: string; sizeKb: number; sha256: string; late: boolean };

const sizeText = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("de-DE")} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

const MAX_SIDE = 2400;
const TARGET_BYTES = 3.5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf,.xml,application/xml,text/xml";
const EXTRA_FIELDS = ["paymentMethod", "paidOn", "supplierInvoiceNo", "clientId", "notes"];

/** Fotos verkleinern (JPEG, max. 2400 px), damit der Upload unter dem Limit bleibt. PDFs/XML bleiben unverändert. */
async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  if (file.size < 1.2 * 1024 * 1024) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  for (const q of [0.85, 0.75, 0.65]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
    if (blob && (blob.size <= TARGET_BYTES || q === 0.65)) return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  }
  return file;
}

/**
 * Große Fotokachel: "Foto aufnehmen" (Kamera, nur auf Touch-Geräten) und "Datei wählen", am Computer auch per Ziehen und Ablegen.
 * Die Dateiauswahl liegt bewusst außerhalb des Formulars (sonst bekäme sie im Dialog den Startfokus); die gewählte Datei
 * meldet die Kachel per onFile, das Formular hängt sie beim Absenden als "beleg" an.
 */
function ReceiptPicker({ onFile, onBusy, replace }: { onFile: (f: File | null) => void; onBusy: (busy: boolean) => void; replace?: boolean }) {
  const { state } = useFormCtx();
  const inputs = useRef<{ file?: HTMLInputElement; cam?: HTMLInputElement }>({});
  const [info, setInfo] = useState<{ name: string; size: number; type: string; shrunk: boolean; url?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const error = state.fieldErrors?.beleg?.[0];

  useEffect(() => () => void (info?.url && URL.revokeObjectURL(info.url)), [info]);
  useEffect(() => {
    const els = inputs.current;
    return () => {
      els.file?.remove();
      els.cam?.remove();
    };
  }, []);

  const take = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    onBusy(true);
    try {
      const small = await shrinkImage(f);
      onFile(small);
      setInfo({ name: small.name, size: small.size, type: small.type, shrunk: small !== f, url: small.type.startsWith("image/") ? URL.createObjectURL(small) : undefined });
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const takeRef = useRef(take);
  useEffect(() => {
    takeRef.current = take;
  });

  const pick = (camera: boolean) => {
    const key = camera ? "cam" : "file";
    let el = inputs.current[key];
    if (!el) {
      el = document.createElement("input");
      el.type = "file";
      el.accept = camera ? "image/*" : ACCEPT;
      if (camera) el.setAttribute("capture", "environment");
      el.style.display = "none";
      const input = el;
      input.addEventListener("change", () => {
        void takeRef.current(input.files?.[0]);
        input.value = "";
      });
      document.body.appendChild(input);
      inputs.current[key] = input;
    }
    el.click();
  };

  return (
    <div className="grid gap-1.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "squircle grid gap-4 rounded-[18px] bg-fill-2 p-4 transition-colors sm:p-5",
          over && "bg-accent-soft",
          error && "bg-accent-soft/60 ring-2 ring-accent/40",
        )}
      >
        <div className="flex items-center gap-3" aria-live="polite">
          {info?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.url} alt="" className="size-14 shrink-0 rounded-xl bg-surface object-cover shadow-[var(--shadow-card)]" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface text-ink-2 shadow-[var(--shadow-card)]">
              {info ? <FileText className="size-6" /> : <Camera className="size-6" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">
              {busy ? "Bereite Foto vor …" : info ? info.name : replace ? "Datei ersetzen" : "Belegfoto oder Datei"}
            </div>
            <div className="text-[13px] text-muted">
              {info
                ? `${sizeText(info.size)}${info.shrunk ? ", verkleinert" : ""} · wird beim Speichern hochgeladen`
                : "Foto, PDF oder E-Rechnung (XML), höchstens 10 MB"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => pick(true)} className={cn(buttonClass("secondary"), "hidden flex-1 bg-ink text-white hover:bg-ink-2 pointer-coarse:inline-flex")}>
            <Camera className="size-4" /> Foto aufnehmen
          </button>
          <button
            type="button"
            onClick={() => pick(false)}
            className={cn(buttonClass("secondary"), "flex-1 bg-surface shadow-[var(--shadow-card)] hover:bg-surface sm:flex-none")}
          >
            <Upload className="size-4" /> {info ? "Andere Datei" : "Datei wählen"}
          </button>
          <span className="hidden self-center text-[13px] text-muted pointer-fine:inline">oder hierher ziehen</span>
        </div>
      </div>
      <FieldError name="beleg" />
    </div>
  );
}

/** Formular-Action mit angehängter Belegdatei */
function withReceipt(action: (prev: ActionState, fd: FormData) => Promise<ActionState>, file: File | null) {
  return (prev: ActionState, fd: FormData) => {
    if (file) fd.set("beleg", file, file.name);
    return action(prev, fd);
  };
}

/** Seltene Angaben eingeklappt; klappt von selbst auf, wenn dort ein Fehler steht. */
function MoreDetails({ defaultOpen, children }: { defaultOpen: boolean; children: React.ReactNode }) {
  const { state } = useFormCtx();
  const hasError = EXTRA_FIELDS.some((k) => state.fieldErrors?.[k]?.length);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details open={open || hasError} onToggle={(e) => setOpen(e.currentTarget.open)} className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" /> Weitere Angaben
        <span className="font-normal text-muted">Zahlung, Rechnungsnummer, Kunde, Notiz</span>
      </summary>
      <div className="grid gap-4 pt-3">{children}</div>
    </details>
  );
}

function Fields({ defaults, clients, disabled }: { defaults: ExpenseDefaults; clients: { id: number; name: string }[]; disabled: boolean }) {
  const [mode, setMode] = useState<"brutto" | "netto">(defaults.reverseCharge ? "netto" : "brutto");
  const [amount, setAmount] = useState(() => {
    const c = defaults.reverseCharge ? defaults.netCents : defaults.grossCents;
    return c ? (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, useGrouping: false }) : "";
  });
  const [rate, setRate] = useState(defaults.taxRate ?? 19);
  const [rc, setRc] = useState(Boolean(defaults.reverseCharge));

  const cents = parseCents(amount);
  const calc = useMemo(() => {
    if (cents === null || cents <= 0) return null;
    if (rc) return { netCents: cents, taxCents: 0, grossCents: cents };
    return mode === "netto" ? fromNet(cents, rate) : splitGross(cents, rate);
  }, [cents, rc, mode, rate]);
  const rcTax = rc && cents ? roundHalfUp((cents * rate) / 100) : 0;
  const hasExtras = Boolean(defaults.paymentMethod || defaults.paidOn || defaults.supplierInvoiceNo || defaults.clientId || defaults.notes);

  return (
    <>
      <input type="hidden" name="amountMode" value={rc ? "netto" : mode} />
      <div className="grid gap-3 rounded-2xl bg-fill-2 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={rc ? "Rechnungsbetrag (ohne USt)" : mode === "brutto" ? "Betrag brutto" : "Betrag netto"} name="amount" className="min-w-40 flex-1">
            <Input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="bg-surface text-[17px] tabular-nums" required disabled={disabled} />
          </Field>
          {!rc && (
            <div className="inline-flex h-11 items-center rounded-[10px] bg-fill p-[2px] sm:h-10" role="radiogroup" aria-label="Betrag ist">
              {(["brutto", "netto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  disabled={disabled}
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-full min-w-16 rounded-[8px] px-3 text-[14px] transition-[background-color,box-shadow] duration-200",
                    mode === m ? "bg-surface font-semibold text-ink shadow-[var(--shadow-thumb)]" : "font-medium text-ink-2 hover:bg-fill-2",
                  )}
                >
                  {m === "brutto" ? "Brutto" : "Netto"}
                </button>
              ))}
            </div>
          )}
          <Field label="Steuersatz" name="taxRate" className="w-28">
            <Select name="taxRate" value={rate} onChange={(e) => setRate(Number(e.target.value))} disabled={disabled} className="bg-surface">
              {TAX_RATES.map((t) => (
                <option key={t} value={t}>
                  {t} %
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="text-[13px] tabular-nums text-ink-2" aria-live="polite">
          {calc ? (
            <>
              Netto {eur(calc.netCents)} · {rc ? `Steuer nach § 13b ${eur(rcTax)} (selbst geschuldet)` : `Vorsteuer ${eur(calc.taxCents)}`} · Brutto {eur(calc.grossCents)}
            </>
          ) : (
            "Betrag eingeben, die Steuer wird automatisch gerechnet."
          )}
        </div>
        {calc && !rc && calc.grossCents <= SMALL_AMOUNT_LIMIT_CENTS && (
          <p className="flex gap-2 text-[12px] text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Kleinbetragsrechnung bis 250 € brutto: Ein Kassenbon mit Name und Anschrift des Ausstellers, Datum, Leistung, Bruttobetrag und Steuersatz reicht (§ 33 UStDV).
          </p>
        )}
        <Checkbox name="reverseCharge" checked={rc} onChange={(e) => setRc(e.target.checked)} disabled={disabled} label="Rechnung ohne Umsatzsteuer aus dem EU-Ausland (§ 13b UStG)" />
        {rc && (
          <p className="text-[12px] text-muted">
            Beispiel: Werbeanzeigen bei Meta, abgerechnet über Meta Platforms Ireland. Die Steuer schuldet ihr selbst; mit Vorsteuerabzug gleicht sie sich in der Regel aus. Als
            Kleinunternehmer gibt es keinen Vorsteuerabzug. Mit eurer Steuerberatung abstimmen.
          </p>
        )}
      </div>

      <FormGrid>
        <Field label="Lieferant" name="supplier">
          <Input name="supplier" defaultValue={defaults.supplier} placeholder="z. B. Kamera-Shop" required disabled={disabled} autoComplete="off" maxLength={160} />
        </Field>
        <Field label="Wofür" name="description">
          <Input name="description" defaultValue={defaults.description} placeholder="z. B. Funkmikrofon" required disabled={disabled} maxLength={300} />
        </Field>
        <Field label="Belegdatum" name="date">
          <Input type="date" name="date" defaultValue={defaults.date} required disabled={disabled} />
        </Field>
        <Field label="Kategorie" name="category">
          <Select name="category" defaultValue={defaults.category ?? "sonstiges"} disabled={disabled}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>

      <MoreDetails defaultOpen={hasExtras}>
        <FormGrid>
          <Field label="Zahlungsart" name="paymentMethod" optional>
            <Select name="paymentMethod" defaultValue={defaults.paymentMethod ?? ""} disabled={disabled}>
              <option value="">nicht angegeben</option>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bezahlt am" name="paidOn" optional>
            <Input type="date" name="paidOn" defaultValue={defaults.paidOn ?? ""} disabled={disabled} />
          </Field>
          <Field label="Rechnungsnummer des Lieferanten" name="supplierInvoiceNo" optional>
            <Input name="supplierInvoiceNo" defaultValue={defaults.supplierInvoiceNo ?? ""} disabled={disabled} maxLength={60} />
          </Field>
          <Field label="Für Kunde" name="clientId" optional hint="Z. B. Werbebudget, das ihr weiterberechnet.">
            <Select name="clientId" defaultValue={defaults.clientId ?? ""} disabled={disabled}>
              <option value="">kein Kunde</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Notiz" name="notes" optional>
          <Textarea name="notes" defaultValue={defaults.notes ?? ""} rows={2} disabled={disabled} maxLength={1000} />
        </Field>
      </MoreDetails>
    </>
  );
}

/** Neuer Beleg im Dialog (auf dem Handy als Blatt): Foto zuerst. */
export function ExpenseForm({ defaults, clients }: { defaults: ExpenseDefaults; clients: { id: number; name: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  return (
    <ActionForm action={withReceipt(saveExpense, file)} className="grid gap-5">
      <ReceiptPicker onBusy={setBusy} onFile={setFile} />
      <Fields defaults={defaults} clients={clients} disabled={false} />
      <FormActions>
        <SubmitButton pendingText="Speichert …" disabled={busy}>
          Beleg anlegen
        </SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

/** Detailseite: Belegdatei (Vorschau oder Upload) und Angaben. Exportierte Belege sind gesperrt; eine fehlende Datei lässt sich nachreichen. */
export function ExpenseEditor({
  defaults,
  clients,
  exported,
  file,
}: {
  defaults: ExpenseDefaults & { id: number };
  clients: { id: number; name: string }[];
  exported: boolean;
  file: ExpenseFile | null;
}) {
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  // nach dem Speichern: Kachel leeren (die Datei steht dann in der Vorschau)
  const [pickerKey, setPickerKey] = useState(0);
  const reset = () => {
    setPicked(null);
    setPickerKey((k) => k + 1);
  };

  const filePanel = (
    <Card className="overflow-hidden">
      <CardHeader
        title="Belegdatei"
        sub={file ? `${file.name} · ${file.sizeKb.toLocaleString("de-DE")} KB${file.late ? " · nachgereicht" : ""}` : exported ? "Fehlt noch" : undefined}
        action={
          file ? (
            <LinkButton href={file.href} target="_blank" variant="ghost" size="sm" prefetch={false}>
              Öffnen <ExternalLink className="size-4" />
            </LinkButton>
          ) : undefined
        }
      />
      {file ? (
        <>
          {file.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.href} alt={`Beleg ${defaults.supplier ?? ""}`} className="max-h-[60vh] w-full bg-sunken object-contain" />
          ) : file.mime === "application/pdf" ? (
            <>
              {/* Handy: PDF-Vorschau im Rahmen klappt nicht überall, deshalb dort ein Link */}
              <iframe src={file.href} title={`Beleg ${defaults.supplier ?? ""}`} className="hidden h-[60vh] w-full bg-sunken md:block" />
              <a href={file.href} target="_blank" className="mx-5 mb-4 flex min-h-12 items-center gap-3 rounded-xl bg-fill-2 px-4 text-[15px] font-medium md:hidden">
                <FileText className="size-5 text-ink-2" /> PDF ansehen
              </a>
            </>
          ) : (
            <p className="flex items-center gap-2 px-5 pb-4 text-[14px] text-muted">
              <Paperclip className="size-4" /> Keine Vorschau für diesen Dateityp. Über „Öffnen“ herunterladen.
            </p>
          )}
          <details className="border-t border-line px-5 text-[13px]">
            <summary className="cursor-pointer py-3 font-medium text-ink-2 hover:text-ink">Prüfsumme anzeigen</summary>
            <p className="break-all pb-3 font-mono text-[12px] text-muted">SHA-256 {file.sha256}</p>
          </details>
        </>
      ) : exported ? (
        <div className="px-5 pb-5">
          <p className="mb-3 text-[14px] text-ink-2">
            Ohne Belegdatei erkennt das Finanzamt die Vorsteuer nicht an. Der Beleg selbst bleibt festgeschrieben; die Datei wird archiviert und im Protokoll mit ihm verknüpft.
          </p>
          <ActionForm action={withReceipt(attachLateReceipt, picked)} onSuccess={reset} className="grid gap-3">
            <input type="hidden" name="id" value={defaults.id} />
            <ReceiptPicker key={pickerKey} onBusy={setBusy} onFile={setPicked} />
            <FormActions className="mt-1">
              <SubmitButton pendingText="Lädt hoch …" disabled={busy}>
                Datei nachreichen
              </SubmitButton>
            </FormActions>
          </ActionForm>
        </div>
      ) : null}
    </Card>
  );

  if (exported) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="lg:order-2 lg:sticky lg:top-24 lg:self-start">{filePanel}</div>
        <Card className="p-5 sm:p-6 lg:order-1">
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-fill-2 p-4 text-[14px]">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">Festgeschrieben</div>
              <div className="text-muted">An die Buchhaltung exportiert. Korrekturen bitte mit eurer Steuerberatung abstimmen.</div>
            </div>
          </div>
          <fieldset disabled className="grid gap-5">
            <Fields defaults={defaults} clients={clients} disabled />
          </fieldset>
        </Card>
      </div>
    );
  }

  return (
    <ActionForm action={withReceipt(saveExpense, picked)} onSuccess={reset} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <input type="hidden" name="id" value={defaults.id} />
      <div className="grid content-start gap-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
        {/* ohne Datei ist die Fotokachel das Upload-Ziel (auf dem Handy ganz oben), mit Datei dient sie zum Ersetzen */}
        {file ? (
          <>
            {filePanel}
            <details className="group" open={Boolean(picked)}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-1 text-[15px] font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" /> Datei ersetzen
              </summary>
              <div className="pt-2">
                <ReceiptPicker key={pickerKey} onBusy={setBusy} onFile={setPicked} replace />
              </div>
            </details>
          </>
        ) : (
          <ReceiptPicker key={pickerKey} onBusy={setBusy} onFile={setPicked} />
        )}
      </div>
      <Card className="grid content-start gap-5 p-5 sm:p-6 lg:order-1">
        <Fields defaults={defaults} clients={clients} disabled={false} />
        <FormActions className="mt-2">
          <SubmitButton pendingText="Speichert …" disabled={busy}>
            Speichern
          </SubmitButton>
        </FormActions>
      </Card>
    </ActionForm>
  );
}
