"use client";
// Entwurfs-Editor für Rechnung und Angebot: Empfänger, Angaben, Positionen mit Live-Summen, Texte.
// Speichern, Vorschau und Festschreiben laufen über dieselbe Server Action (intent). Was vor dem Festschreiben
// noch fehlt, prüft der Editor live mit denselben Regeln wie der Server (draftBlockers in core.ts).
import { ArrowDown, ArrowUp, CheckCircle2, Eye, Lock, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { ActionButton } from "@/components/ui/confirm-action";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Party } from "@/db/schema";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import { deleteDraft, saveDraft } from "@/lib/finanzen/actions";
import { calcTotals, draftBlockers, lineNetCents, partyFromClient, TAX_RATES, UNIT_LABELS } from "@/lib/finanzen/core";

type Item = { key: number; description: string; quantity: string; unit: string; price: string; taxRate: number };
type ClientOpt = { id: number; name: string; contactName: string | null; street: string | null; zip: string | null; city: string | null; ort: string | null; vatId: string | null; email: string | null; buyerReference: string | null };

export type EditorInvoice = {
  id: number;
  kind: "rechnung" | "angebot";
  number: string | null;
  title: string;
  clientId: number | null;
  recipient: Party | null;
  issueDate: string | null;
  serviceFrom: string | null;
  serviceTo: string | null;
  dueDate: string | null;
  validUntil: string | null;
  buyerReference: string | null;
  intro: string | null;
  outro: string | null;
  notes: string | null;
};

const eurFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const eur = (c: number) => eurFmt.format(c / 100);
const centsToInput = (c: number) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
function parseCents(v: string): number | null {
  const raw = v.trim().replace(/\s|€/g, "");
  if (!raw) return null;
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
const parseQty = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

const TEMPLATES = [
  { label: "Zusätzliches Video", description: "Zusätzliches Video (Reel, Hochformat): Konzept, Dreh, Schnitt", unit: "Stück" },
  { label: "Drehtag", description: "Zusätzlicher Drehtag (halber Tag)", unit: "Pauschal" },
  { label: "Fahrtkosten", description: "Fahrtkosten", unit: "km" },
  { label: "Werbeanzeigen-Betreuung", description: "Werbeanzeigen-Betreuung", unit: "Monat" },
];

/** Feld im Editor fokussieren und in den Blick holen (Sprung aus der Hindernis-Liste). */
function focusField(name: string) {
  const el = document.querySelector<HTMLElement>(`#rechnung-editor [name="${CSS.escape(name)}"]`);
  el?.focus({ preventScroll: true });
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
}

let nextKey = 1000;

export function InvoiceEditor({
  invoice,
  items: initialItems,
  clients,
  paymentDays,
  smallBusiness,
  companyMissing,
  isOwner,
}: {
  invoice: EditorInvoice;
  items: { description: string; quantity: number; unit: string; unitPriceCents: number; taxRate: number }[];
  clients: ClientOpt[];
  paymentDays: number;
  smallBusiness: boolean;
  /** fehlende Firmendaten (Pflichtangaben des Ausstellers) */
  companyMissing: string[];
  isOwner: boolean;
}) {
  const offer = invoice.kind === "angebot";
  const label = offer ? "Angebot" : "Rechnung";
  const confirm = useConfirm();
  const preview = useRef<Window | null>(null);
  const [items, setItems] = useState<Item[]>(() =>
    initialItems.length
      ? initialItems.map((it, i) => ({ key: i + 1, description: it.description, quantity: String(it.quantity).replace(".", ","), unit: it.unit, price: centsToInput(it.unitPriceCents), taxRate: it.taxRate }))
      : [{ key: 1, description: "", quantity: "1", unit: "Stück", price: "", taxRate: smallBusiness ? 0 : 19 }],
  );
  const [r, setR] = useState<Party>(invoice.recipient ?? { name: "", country: "DE" });
  const [clientId, setClientId] = useState(invoice.clientId ? String(invoice.clientId) : "");
  const [buyerRef, setBuyerRef] = useState(invoice.buyerReference ?? "");
  const [issueDate, setIssueDate] = useState(invoice.issueDate ?? "");
  const [serviceFrom, setServiceFrom] = useState(invoice.serviceFrom ?? "");
  const [serviceTo, setServiceTo] = useState(invoice.serviceTo ?? "");

  const lines = useMemo(
    () => items.map((it) => ({ description: it.description, quantity: parseQty(it.quantity), unitPriceCents: parseCents(it.price) ?? 0, taxRate: it.taxRate })),
    [items],
  );
  const totals = useMemo(() => calcTotals(lines, smallBusiness), [lines, smallBusiness]);
  const blockers = useMemo(
    () => draftBlockers({ kind: invoice.kind, recipient: r, serviceFrom, serviceTo, items: lines, companyMissing, smallBusiness }),
    [invoice.kind, r, serviceFrom, serviceTo, lines, companyMissing, smallBusiness],
  );
  const serialized = JSON.stringify(items.map(({ description, quantity, unit, price, taxRate }) => ({ description, quantity: quantity.replace(",", "."), unit, price, taxRate })));
  const dueDays = invoice.issueDate && invoice.dueDate ? daysBetween(invoice.issueDate, invoice.dueDate) : paymentDays;

  const update = (key: number, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setItems((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const add = (t?: { description: string; unit: string }) => {
    setItems((xs) => [...xs, { key: nextKey++, description: t?.description ?? "", quantity: "1", unit: t?.unit ?? "Stück", price: "", taxRate: smallBusiness ? 0 : 19 }]);
    // neue Position: Preis (Vorlage) bzw. Beschreibung fokussieren
    requestAnimationFrame(() => focusField(`items.${items.length}.${t ? "price" : "description"}`));
  };

  const takeClient = (id: string) => {
    setClientId(id);
    const c = clients.find((x) => String(x.id) === id);
    if (c) {
      setR(partyFromClient(c));
      setBuyerRef(c.buyerReference ?? "");
    }
  };
  const setField = (k: keyof Party) => (e: React.ChangeEvent<HTMLInputElement>) => setR((p) => ({ ...p, [k]: e.target.value }));

  // Vorschau: das Fenster muss im Klick selbst aufgehen (sonst blockiert der Browser es), gefüllt wird es nach dem Speichern
  const submit = async (prev: ActionState, fd: FormData) => {
    try {
      const res = await saveDraft(prev, fd);
      if (preview.current) {
        if (res.ok) preview.current.location.href = `/api/finanzen/rechnungen/${invoice.id}/pdf?stand=${Date.now()}`;
        else preview.current.close();
        preview.current = null;
      }
      return res;
    } catch (e) {
      preview.current?.close();
      preview.current = null;
      throw e;
    }
  };

  const finalizeDisabled = !isOwner || blockers.length > 0;

  return (
    <ActionForm action={submit} id="rechnung-editor" className="grid gap-6 max-lg:pb-20 lg:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="id" value={invoice.id} />
      <input type="hidden" name="items" value={serialized} />
      <input type="hidden" name="clientId" value={clientId} />

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader title="Empfänger" sub={offer ? "Für Angebote reicht der Name." : "Vollständige Anschrift ist Pflicht auf Rechnungen (§ 14 Abs. 4 UStG)."} />
          <div className="grid gap-4 px-5 pb-5 pt-2">
            <Field label="Aus Kunde übernehmen" optional>
              <Select value={clientId} onChange={(e) => takeClient(e.target.value)}>
                <option value="">Kein Kunde (Empfänger von Hand)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <FormGrid>
              <Field label="Name oder Firma" name="recipientName">
                <Input name="recipientName" value={r.name} onChange={setField("name")} required autoComplete="organization" />
              </Field>
              <Field label="Ansprechpartner" name="recipientContact" optional>
                <Input name="recipientContact" value={r.contact ?? ""} onChange={setField("contact")} maxLength={200} />
              </Field>
              <Field label="Straße und Hausnummer" name="recipientStreet" optional={offer}>
                <Input name="recipientStreet" value={r.street ?? ""} onChange={setField("street")} autoComplete="street-address" maxLength={200} />
              </Field>
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <Field label="PLZ" name="recipientZip" optional={offer}>
                  <Input name="recipientZip" value={r.zip ?? ""} onChange={setField("zip")} inputMode="numeric" autoComplete="postal-code" maxLength={20} />
                </Field>
                <Field label="Ort" name="recipientCity" optional={offer}>
                  <Input name="recipientCity" value={r.city ?? ""} onChange={setField("city")} autoComplete="address-level2" maxLength={120} />
                </Field>
              </div>
              <Field label="USt-IdNr. des Kunden" name="recipientVatId" optional>
                <Input name="recipientVatId" value={r.vatId ?? ""} onChange={setField("vatId")} maxLength={40} />
              </Field>
              <Field label="E-Mail für den Versand" name="recipientEmail" optional>
                <Input name="recipientEmail" type="email" inputMode="email" value={r.email ?? ""} onChange={setField("email")} />
              </Field>
            </FormGrid>
          </div>
        </Card>

        <Card>
          <CardHeader title="Angaben" />
          <div className="grid gap-4 px-5 pb-5 pt-2">
            <Field label="Titel" name="title" hint="Steht unter der Überschrift, z. B. „Social-Media-Paket Oktober“.">
              <Input name="title" defaultValue={invoice.title} required maxLength={160} />
            </Field>
            <FormGrid className="lg:grid-cols-3">
              <Field label={offer ? "Angebotsdatum" : "Rechnungsdatum"} name="issueDate" hint="Leer lassen: heute beim Festschreiben.">
                <Input type="date" name="issueDate" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </Field>
              {offer ? (
                <Field label="Gültig bis" name="validUntil" optional hint="Leer lassen: 30 Tage.">
                  <Input type="date" name="validUntil" defaultValue={invoice.validUntil ?? ""} />
                </Field>
              ) : (
                <Field label="Zahlungsziel in Tagen" name="dueDays">
                  <Input type="number" name="dueDays" min={0} max={120} defaultValue={dueDays} inputMode="numeric" />
                </Field>
              )}
              <Field label="Käuferreferenz" name="buyerReference" optional hint="Bestellnummer oder Leitweg-ID, falls der Kunde eine vorgibt.">
                <Input name="buyerReference" value={buyerRef} onChange={(e) => setBuyerRef(e.target.value)} maxLength={100} />
              </Field>
            </FormGrid>
            <FormGrid>
              <Field label="Leistung von" name="serviceFrom" optional={offer}>
                <Input type="date" name="serviceFrom" value={serviceFrom} onChange={(e) => setServiceFrom(e.target.value)} />
              </Field>
              <Field label="Leistung bis" name="serviceTo" optional={offer} hint={offer ? undefined : "Ohne Zeitraum gilt: Leistungsdatum = Rechnungsdatum."}>
                <Input type="date" name="serviceTo" value={serviceTo} onChange={(e) => setServiceTo(e.target.value)} />
              </Field>
            </FormGrid>
          </div>
        </Card>

        <Card>
          <CardHeader title="Positionen" sub={smallBusiness ? "Kleinunternehmer: ohne Umsatzsteuer" : "Preise netto"} />
          <ol className="divide-y divide-line border-t border-line">
            {items.map((it, i) => {
              const cents = parseCents(it.price);
              const n = i + 1;
              return (
                <li key={it.key} className="grid gap-3 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-muted">Position {n}</span>
                    <div className="-mr-2 flex items-center gap-0.5 sm:gap-1">
                      <IconBtn label={`Position ${n} nach oben`} onClick={() => move(i, -1)} disabled={i === 0}>
                        <ArrowUp className="size-4" />
                      </IconBtn>
                      <IconBtn label={`Position ${n} nach unten`} onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                        <ArrowDown className="size-4" />
                      </IconBtn>
                      <IconBtn label={`Position ${n} entfernen`} onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} disabled={items.length === 1}>
                        <Trash2 className="size-4" />
                      </IconBtn>
                    </div>
                  </div>
                  <Field label="Leistung" name={`items.${i}.description`}>
                    <Textarea
                      name={`items.${i}.description`}
                      value={it.description}
                      onChange={(e) => update(it.key, { description: e.target.value })}
                      rows={Math.max(2, Math.ceil(it.description.length / 48))}
                      placeholder="Leistung beschreiben"
                      maxLength={1000}
                      className="min-h-16 field-sizing-content"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-[90px_120px_1fr_100px_150px]">
                    <Field label="Menge" name={`items.${i}.quantity`}>
                      <Input name={`items.${i}.quantity`} value={it.quantity} onChange={(e) => update(it.key, { quantity: e.target.value })} inputMode="decimal" className="tabular-nums" />
                    </Field>
                    <Field label="Einheit" name={`items.${i}.unit`}>
                      <Select name={`items.${i}.unit`} value={it.unit} onChange={(e) => update(it.key, { unit: e.target.value })}>
                        {UNIT_LABELS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label="Einzelpreis netto"
                      name={`items.${i}.price`}
                      error={it.price && cents === null ? "Betrag prüfen, z. B. 49,90" : undefined}
                      hint={!it.price.trim() ? "Preis fehlt" : undefined}
                    >
                      <Input name={`items.${i}.price`} value={it.price} onChange={(e) => update(it.key, { price: e.target.value })} inputMode="decimal" placeholder="0,00" className="tabular-nums" />
                    </Field>
                    <Field label="USt" name={`items.${i}.taxRate`}>
                      <Select name={`items.${i}.taxRate`} value={smallBusiness ? 0 : it.taxRate} onChange={(e) => update(it.key, { taxRate: Number(e.target.value) })} disabled={smallBusiness}>
                        {TAX_RATES.map((t) => (
                          <option key={t} value={t}>
                            {t} %
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="col-span-2 flex items-baseline justify-between gap-3 border-t border-line pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <div className="text-[13px] font-medium text-ink-2 sm:mb-1.5">Betrag</div>
                      <div className="font-semibold tabular-nums sm:flex sm:h-10 sm:items-center sm:justify-end">
                        {eur(lineNetCents({ quantity: parseQty(it.quantity), unitPriceCents: cents ?? 0, taxRate: it.taxRate }))}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="grid gap-3 border-t border-line p-5">
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => add()}>
                <Plus className="size-4" /> Leere Position
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[13px] text-muted">Aus Vorlage:</span>
              {TEMPLATES.map((t) => (
                <Button key={t.label} type="button" variant="secondary" size="sm" onClick={() => add(t)}>
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Texte" sub="Erscheinen über und unter den Positionen" />
          <div className="grid gap-4 px-5 pb-5 pt-2">
            <Field label="Einleitung" name="intro" optional>
              <Textarea name="intro" defaultValue={invoice.intro ?? ""} rows={2} maxLength={2000} />
            </Field>
            <Field label="Schluss" name="outro" optional>
              <Textarea name="outro" defaultValue={invoice.outro ?? ""} rows={2} maxLength={2000} />
            </Field>
            <Field label="Interne Notiz" name="notes" optional hint={`Nur für euch, erscheint nicht ${offer ? "auf dem Angebot" : "auf der Rechnung"}.`}>
              <Textarea name="notes" defaultValue={invoice.notes ?? ""} rows={2} maxLength={2000} />
            </Field>
          </div>
        </Card>
      </div>

      <aside id="abschluss" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <div className="text-[13px] text-muted">{offer ? "Angebotssumme" : "Gesamtbetrag"}</div>
          <div className="mt-1 text-[34px] font-semibold leading-tight tracking-tight tabular-nums">{eur(totals.grossCents)}</div>
          <dl className="mt-3 grid gap-1.5 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-muted">Netto</dt>
              <dd className="tabular-nums">{eur(totals.netCents)}</dd>
            </div>
            {smallBusiness ? (
              <div className="flex justify-between">
                <dt className="text-muted">Umsatzsteuer (§ 19 UStG)</dt>
                <dd className="tabular-nums">{eur(0)}</dd>
              </div>
            ) : (
              totals.groups.map((g) => (
                <div key={g.rate} className="flex justify-between">
                  <dt className="text-muted">USt {g.rate} %</dt>
                  <dd className="tabular-nums">{eur(g.taxCents)}</dd>
                </div>
              ))
            )}
          </dl>

          {blockers.length > 0 ? (
            <div className="mt-4 rounded-xl bg-warn-soft p-3 text-[13px] text-warn" aria-live="polite">
              <div className="mb-1 font-semibold">Noch offen vor dem Festschreiben</div>
              <ul className="grid gap-0.5">
                {blockers.map((b) => (
                  <li key={b.text}>
                    {b.href ? (
                      <Link href={b.href} className="font-medium underline underline-offset-2">
                        {b.text}
                      </Link>
                    ) : b.field ? (
                      <button type="button" onClick={() => focusField(b.field!)} className="text-left font-medium underline underline-offset-2">
                        {b.text}
                      </button>
                    ) : (
                      b.text
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok-soft p-3 text-[13px] font-medium text-ok" aria-live="polite">
              <CheckCircle2 className="size-4 shrink-0" /> Alle Pflichtangaben sind da.
            </p>
          )}

          <div className="mt-5 grid gap-2">
            <SubmitButton name="intent" value="speichern" variant="secondary" pendingText="Speichert …" className="max-lg:hidden">
              Speichern
            </SubmitButton>
            <Button
              type="submit"
              name="intent"
              value="vorschau"
              variant="secondary"
              onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.title = `Vorschau ${label}`;
                  w.document.body.style.font = "15px system-ui, sans-serif";
                  w.document.body.textContent = "Vorschau wird vorbereitet …";
                }
                preview.current = w;
              }}
            >
              <Eye className="size-4" /> Speichern und Vorschau
            </Button>
            <Button
              type="submit"
              name="intent"
              value="festschreiben"
              disabled={finalizeDisabled}
              onClick={async (e) => {
                e.preventDefault();
                const btn = e.currentTarget;
                const ok = await confirm({
                  title: `${label} festschreiben?`,
                  message: offer
                    ? "Das Angebot bekommt seine Nummer (AN-…) und ein PDF. Danach lässt es sich nicht mehr ändern."
                    : "Die Rechnung bekommt ihre endgültige Nummer und wird als E-Rechnung abgelegt. Danach lässt sie sich nicht mehr ändern, nur noch stornieren.",
                  confirmLabel: "Festschreiben",
                  tone: "default",
                });
                if (ok) btn.form?.requestSubmit(btn);
              }}
            >
              <Lock className="size-4" /> Speichern und festschreiben
            </Button>
            {!isOwner && <p className="text-[12px] text-muted">Festschreiben dürfen nur Inhaber.</p>}
            <p className="text-[12px] text-muted">
              {offer ? "Festgeschriebene Angebote bekommen eine Nummer (AN-…) und ein PDF." : "Rechnungen werden als E-Rechnung (ZUGFeRD, EN 16931) festgeschrieben."}
            </p>
          </div>
          {!invoice.number && (
            <div className="mt-4 border-t border-line pt-3">
              <ActionButton
                action={deleteDraft.bind(null, invoice.id)}
                confirm={{ title: "Entwurf löschen?", message: "Der Entwurf wird endgültig entfernt. Eine Nummer ist noch nicht vergeben.", confirmLabel: "Löschen", tone: "danger" }}
                variant="ghost"
                size="sm"
                className="w-full text-accent-ink hover:text-accent-ink"
              >
                <Trash2 className="size-4" /> Entwurf löschen
              </ActionButton>
            </div>
          )}
        </Card>
      </aside>

      {/* Handy: Summe und Speichern immer greifbar, über der Tab-Leiste */}
      <div className="material-light fixed inset-x-3 bottom-[calc(var(--tabbar-h,calc(54px+env(safe-area-inset-bottom)))+12px)] z-30 flex items-center gap-3 rounded-[20px] py-2 pl-4 pr-2 shadow-[var(--shadow-pop)] lg:hidden">
        <a href="#abschluss" className="flex min-h-11 min-w-0 flex-1 flex-col justify-center" aria-label={`${offer ? "Angebotssumme" : "Gesamtbetrag"} ${eur(totals.grossCents)}, zum Festschreiben springen`}>
          <div className="text-[12px] leading-tight text-muted">{offer ? "Angebotssumme" : "Gesamtbetrag"}</div>
          <div className="truncate text-[18px] font-semibold leading-tight tabular-nums">{eur(totals.grossCents)}</div>
        </a>
        <SubmitButton name="intent" value="speichern" variant="secondary" pendingText="Speichert …" className={cn("bg-ink px-5 text-white hover:bg-ink-2")}>
          Speichern
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-fill-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30 sm:size-8"
    >
      {children}
    </button>
  );
}
