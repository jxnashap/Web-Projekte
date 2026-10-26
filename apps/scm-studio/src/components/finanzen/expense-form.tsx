"use client";
// Beleg erfassen oder bearbeiten: Brutto oder Netto eingeben, Steuer wird live gerechnet; § 13b-Schalter;
// Foto/PDF/XML anhängen. Fotos werden vor dem Hochladen verkleinert (Vercel erlaubt 4,5 MB je Anfrage).
import { FileText, ImageIcon, Info, Paperclip } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ActionForm, FieldError } from "@/components/ui/action-form";
import { Checkbox, Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { saveExpense } from "@/lib/finanzen/actions";
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

const MAX_SIDE = 2400;
const TARGET_BYTES = 3.5 * 1024 * 1024;

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

export function ExpenseForm({ defaults, clients, exported = false }: { defaults: ExpenseDefaults; clients: { id: number; name: string }[]; exported?: boolean }) {
  const editing = Boolean(defaults.id);
  const [mode, setMode] = useState<"brutto" | "netto">(defaults.reverseCharge ? "netto" : "brutto");
  const [amount, setAmount] = useState(() => {
    const c = defaults.reverseCharge ? defaults.netCents : defaults.grossCents;
    return c ? (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, useGrouping: false }) : "";
  });
  const [rate, setRate] = useState(defaults.taxRate ?? 19);
  const [rc, setRc] = useState(Boolean(defaults.reverseCharge));
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string; shrunk: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cents = parseCents(amount);
  const calc = useMemo(() => {
    if (cents === null || cents <= 0) return null;
    if (rc) return { netCents: cents, taxCents: 0, grossCents: cents };
    return mode === "netto" ? fromNet(cents, rate) : splitGross(cents, rate);
  }, [cents, rc, mode, rate]);
  const rcTax = rc && cents ? roundHalfUp((cents * rate) / 100) : 0;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return setFileInfo(null);
    setBusy(true);
    try {
      const small = await shrinkImage(f);
      if (small !== f && fileRef.current) {
        const dt = new DataTransfer();
        dt.items.add(small);
        fileRef.current.files = dt.files;
      }
      setFileInfo({ name: small.name, size: small.size, type: small.type, shrunk: small !== f });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionForm action={saveExpense} className="grid gap-4">
      {editing && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="amountMode" value={rc ? "netto" : mode} />
      <FormGrid>
        <Field label="Belegdatum" name="date">
          <Input type="date" name="date" defaultValue={defaults.date} required disabled={exported} />
        </Field>
        <Field label="Kategorie" name="category">
          <Select name="category" defaultValue={defaults.category ?? "sonstiges"} disabled={exported}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lieferant" name="supplier">
          <Input name="supplier" defaultValue={defaults.supplier} placeholder="z. B. Kamera-Shop" required disabled={exported} autoComplete="off" />
        </Field>
        <Field label="Wofür" name="description">
          <Input name="description" defaultValue={defaults.description} placeholder="z. B. Funkmikrofon" required disabled={exported} />
        </Field>
      </FormGrid>

      <div className="grid gap-3 rounded-2xl bg-sunken/70 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={rc ? "Rechnungsbetrag (ohne USt)" : mode === "brutto" ? "Betrag brutto" : "Betrag netto"} name="amount" className="min-w-40 flex-1">
            <Input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="text-[17px] tabular-nums" required disabled={exported} />
          </Field>
          {!rc && (
            <div className="inline-flex rounded-full bg-surface p-0.5 ring-1 ring-line" role="radiogroup" aria-label="Betrag ist">
              {(["brutto", "netto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  disabled={exported}
                  onClick={() => setMode(m)}
                  className={cn("h-9 rounded-full px-3 text-[13px] font-semibold transition-colors", mode === m ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-sunken")}
                >
                  {m === "brutto" ? "Brutto" : "Netto"}
                </button>
              ))}
            </div>
          )}
          <Field label="Steuersatz" name="taxRate" className="w-28">
            <Select name="taxRate" value={rate} onChange={(e) => setRate(Number(e.target.value))} disabled={exported}>
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
        <Checkbox name="reverseCharge" checked={rc} onChange={(e) => setRc(e.target.checked)} disabled={exported} label="Rechnung ohne Umsatzsteuer aus dem EU-Ausland (§ 13b UStG)" />
        {rc && (
          <p className="text-[12px] text-muted">
            Beispiel: Werbeanzeigen bei Meta, abgerechnet über Meta Platforms Ireland. Die Steuer schuldet ihr selbst; mit Vorsteuerabzug gleicht sie sich in der Regel aus. Als
            Kleinunternehmer gibt es keinen Vorsteuerabzug. Mit eurer Steuerberatung abstimmen.
          </p>
        )}
      </div>

      <FormGrid>
        <Field label="Zahlungsart" name="paymentMethod" optional>
          <Select name="paymentMethod" defaultValue={defaults.paymentMethod ?? ""} disabled={exported}>
            <option value="">nicht angegeben</option>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bezahlt am" name="paidOn" optional>
          <Input type="date" name="paidOn" defaultValue={defaults.paidOn ?? ""} disabled={exported} />
        </Field>
        <Field label="Rechnungsnummer des Lieferanten" name="supplierInvoiceNo" optional>
          <Input name="supplierInvoiceNo" defaultValue={defaults.supplierInvoiceNo ?? ""} disabled={exported} />
        </Field>
        <Field label="Für Kunde" name="clientId" optional hint="Z. B. Werbebudget, das ihr weiterberechnet.">
          <Select name="clientId" defaultValue={defaults.clientId ?? ""} disabled={exported}>
            <option value="">kein Kunde</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>

      {!exported && (
        <div className="grid gap-1.5">
          <span className="text-[13px] font-semibold text-ink-2">
            {editing && defaults.receiptName ? "Beleg ersetzen" : "Beleg"} <span className="ml-1 font-normal text-faint">optional</span>
          </span>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-2 bg-surface px-4 py-3 text-[14px] hover:border-faint">
            {fileInfo ? fileInfo.type.startsWith("image/") ? <ImageIcon className="size-5 text-ink-2" /> : <FileText className="size-5 text-ink-2" /> : <Paperclip className="size-5 text-muted" />}
            <span className="min-w-0 flex-1 truncate">
              {busy ? "Bereite Foto vor …" : fileInfo ? `${fileInfo.name} · ${(fileInfo.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB${fileInfo.shrunk ? " (verkleinert)" : ""}` : "Datei wählen oder Foto aufnehmen"}
            </span>
            <input ref={fileRef} type="file" name="beleg" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.xml,application/xml,text/xml" onChange={onFile} className="sr-only" />
          </label>
          <span className="text-[12px] text-muted">Foto, PDF oder E-Rechnung (XML), höchstens 10 MB. Fotos werden automatisch verkleinert.</span>
          <FieldError name="beleg" />
        </div>
      )}

      <Field label="Notiz" name="notes" optional>
        <Textarea name="notes" defaultValue={defaults.notes ?? ""} rows={2} disabled={exported} />
      </Field>

      {!exported && (
        <FormActions>
          <SubmitButton pendingText="Speichert …" disabled={busy}>
            {editing ? "Änderungen speichern" : "Beleg speichern"}
          </SubmitButton>
        </FormActions>
      )}
    </ActionForm>
  );
}
