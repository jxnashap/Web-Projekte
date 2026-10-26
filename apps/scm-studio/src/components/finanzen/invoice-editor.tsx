"use client";
// Entwurfs-Editor für Rechnung und Angebot: Empfänger, Angaben, Positionen mit Live-Summen, Texte.
// Speichern und Festschreiben laufen über dieselbe Server Action (intent).
import { ArrowDown, ArrowUp, Eye, Lock, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import type { Party } from "@/db/schema";
import { deleteDraft, saveDraft } from "@/lib/finanzen/actions";
import { calcTotals, lineNetCents, partyFromClient, TAX_RATES, UNIT_LABELS } from "@/lib/finanzen/core";
import { FinanceForm, FinanceSubmit } from "./finance-form";

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
  { description: "Zusätzliches Video (Reel, Hochformat): Konzept, Dreh, Schnitt", unit: "Stück" },
  { description: "Zusätzlicher Drehtag (halber Tag)", unit: "Pauschal" },
  { description: "Fahrtkosten", unit: "km" },
  { description: "Werbeanzeigen-Betreuung", unit: "Monat" },
];

let nextKey = 1000;

export function InvoiceEditor({
  invoice,
  items: initialItems,
  clients,
  paymentDays,
  smallBusiness,
  blockers,
  isOwner,
}: {
  invoice: EditorInvoice;
  items: { description: string; quantity: number; unit: string; unitPriceCents: number; taxRate: number }[];
  clients: ClientOpt[];
  paymentDays: number;
  smallBusiness: boolean;
  blockers: string[];
  isOwner: boolean;
}) {
  const offer = invoice.kind === "angebot";
  const [items, setItems] = useState<Item[]>(() =>
    initialItems.length
      ? initialItems.map((it, i) => ({ key: i + 1, description: it.description, quantity: String(it.quantity).replace(".", ","), unit: it.unit, price: centsToInput(it.unitPriceCents), taxRate: it.taxRate }))
      : [{ key: 1, description: "", quantity: "1", unit: "Stück", price: "", taxRate: smallBusiness ? 0 : 19 }],
  );
  const [r, setR] = useState<Party>(invoice.recipient ?? { name: "", country: "DE" });
  const [clientId, setClientId] = useState(invoice.clientId ? String(invoice.clientId) : "");
  const [buyerRef, setBuyerRef] = useState(invoice.buyerReference ?? "");
  const [issueDate, setIssueDate] = useState(invoice.issueDate ?? "");

  const totals = useMemo(
    () => calcTotals(items.map((it) => ({ quantity: parseQty(it.quantity), unitPriceCents: parseCents(it.price) ?? 0, taxRate: it.taxRate })), smallBusiness),
    [items, smallBusiness],
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
  const add = (t?: { description: string; unit: string }) =>
    setItems((xs) => [...xs, { key: nextKey++, description: t?.description ?? "", quantity: "1", unit: t?.unit ?? "Stück", price: "", taxRate: smallBusiness ? 0 : 19 }]);

  const takeClient = (id: string) => {
    setClientId(id);
    const c = clients.find((x) => String(x.id) === id);
    if (c) {
      setR(partyFromClient(c));
      setBuyerRef(c.buyerReference ?? "");
    }
  };
  const setField = (k: keyof Party) => (e: React.ChangeEvent<HTMLInputElement>) => setR((p) => ({ ...p, [k]: e.target.value }));

  return (
    <FinanceForm action={saveDraft} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="id" value={invoice.id} />
      <input type="hidden" name="items" value={serialized} />
      <input type="hidden" name="clientId" value={clientId} />

      <div className="grid gap-6">
        <Card>
          <CardHeader title="Empfänger" sub={offer ? "Für Angebote reicht der Name." : "Vollständige Anschrift ist Pflicht auf Rechnungen (§ 14 Abs. 4 UStG)."} />
          <div className="grid gap-4 p-5">
            <Field label="Aus Kunde übernehmen" optional>
              <Select value={clientId} onChange={(e) => takeClient(e.target.value)} aria-label="Kunde wählen">
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
                <Input name="recipientContact" value={r.contact ?? ""} onChange={setField("contact")} />
              </Field>
              <Field label="Straße und Hausnummer" name="recipientStreet" optional={offer}>
                <Input name="recipientStreet" value={r.street ?? ""} onChange={setField("street")} autoComplete="street-address" />
              </Field>
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <Field label="PLZ" name="recipientZip" optional={offer}>
                  <Input name="recipientZip" value={r.zip ?? ""} onChange={setField("zip")} inputMode="numeric" autoComplete="postal-code" />
                </Field>
                <Field label="Ort" name="recipientCity" optional={offer}>
                  <Input name="recipientCity" value={r.city ?? ""} onChange={setField("city")} autoComplete="address-level2" />
                </Field>
              </div>
              <Field label="USt-IdNr. des Kunden" name="recipientVatId" optional>
                <Input name="recipientVatId" value={r.vatId ?? ""} onChange={setField("vatId")} />
              </Field>
              <Field label="E-Mail für die E-Rechnung" name="recipientEmail" optional>
                <Input name="recipientEmail" type="email" value={r.email ?? ""} onChange={setField("email")} />
              </Field>
            </FormGrid>
          </div>
        </Card>

        <Card>
          <CardHeader title="Angaben" />
          <div className="grid gap-4 p-5">
            <Field label="Titel" name="title" hint="Steht unter der Überschrift, z. B. „Social-Media-Paket Oktober“.">
              <Input name="title" defaultValue={invoice.title} required />
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
                <Input name="buyerReference" value={buyerRef} onChange={(e) => setBuyerRef(e.target.value)} />
              </Field>
            </FormGrid>
            <FormGrid>
              <Field label="Leistung von" name="serviceFrom" optional={offer}>
                <Input type="date" name="serviceFrom" defaultValue={invoice.serviceFrom ?? ""} />
              </Field>
              <Field label="Leistung bis" name="serviceTo" optional={offer} hint={offer ? undefined : "Ohne Zeitraum gilt: Leistungsdatum = Rechnungsdatum."}>
                <Input type="date" name="serviceTo" defaultValue={invoice.serviceTo ?? ""} />
              </Field>
            </FormGrid>
          </div>
        </Card>

        <Card>
          <CardHeader title="Positionen" sub={smallBusiness ? "Kleinunternehmer: ohne Umsatzsteuer" : "Preise netto"} />
          <ol className="divide-y divide-line">
            {items.map((it, i) => {
              const cents = parseCents(it.price);
              return (
                <li key={it.key} className="grid gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-2.5 w-6 shrink-0 text-[13px] tabular-nums text-muted">{i + 1}</span>
                    <Textarea
                      aria-label={`Beschreibung Position ${i + 1}`}
                      value={it.description}
                      onChange={(e) => update(it.key, { description: e.target.value })}
                      rows={2}
                      placeholder="Leistung beschreiben"
                      className="min-h-16 flex-1"
                    />
                    <div className="flex shrink-0 flex-col gap-1">
                      <IconBtn label={`Position ${i + 1} nach oben`} onClick={() => move(i, -1)} disabled={i === 0}>
                        <ArrowUp className="size-4" />
                      </IconBtn>
                      <IconBtn label={`Position ${i + 1} nach unten`} onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                        <ArrowDown className="size-4" />
                      </IconBtn>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pl-9 sm:grid-cols-[90px_120px_1fr_100px_150px]">
                    <Field label="Menge">
                      <Input value={it.quantity} onChange={(e) => update(it.key, { quantity: e.target.value })} inputMode="decimal" className="tabular-nums" />
                    </Field>
                    <Field label="Einheit">
                      <Select value={it.unit} onChange={(e) => update(it.key, { unit: e.target.value })}>
                        {UNIT_LABELS.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Einzelpreis netto" error={it.price && cents === null ? "Betrag prüfen" : undefined}>
                      <Input value={it.price} onChange={(e) => update(it.key, { price: e.target.value })} inputMode="decimal" placeholder="0,00" className="tabular-nums" />
                    </Field>
                    <Field label="USt">
                      <Select value={smallBusiness ? 0 : it.taxRate} onChange={(e) => update(it.key, { taxRate: Number(e.target.value) })} disabled={smallBusiness}>
                        {TAX_RATES.map((t) => (
                          <option key={t} value={t}>
                            {t} %
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="col-span-2 flex items-end justify-between gap-3 sm:col-span-1 sm:justify-end">
                      <div className="pb-2 text-right">
                        <div className="text-[12px] text-muted">Betrag</div>
                        <div className="font-semibold tabular-nums">{eur(lineNetCents({ quantity: parseQty(it.quantity), unitPriceCents: cents ?? 0, taxRate: it.taxRate }))}</div>
                      </div>
                      <IconBtn label={`Position ${i + 1} entfernen`} onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} disabled={items.length === 1}>
                        <Trash2 className="size-4" />
                      </IconBtn>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-2 border-t border-line p-5">
            <Button type="button" variant="secondary" size="sm" onClick={() => add()}>
              <Plus className="size-4" /> Position
            </Button>
            {TEMPLATES.map((t) => (
              <Button key={t.description} type="button" variant="ghost" size="sm" onClick={() => add(t)}>
                {t.description.split(":")[0].split(" (")[0]}
              </Button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Texte" sub="Erscheinen über und unter den Positionen" />
          <div className="grid gap-4 p-5">
            <Field label="Einleitung" name="intro" optional>
              <Textarea name="intro" defaultValue={invoice.intro ?? ""} rows={2} />
            </Field>
            <Field label="Schluss" name="outro" optional>
              <Textarea name="outro" defaultValue={invoice.outro ?? ""} rows={2} />
            </Field>
            <Field label="Interne Notiz" name="notes" optional hint="Nur für euch, erscheint nicht auf dem Beleg.">
              <Textarea name="notes" defaultValue={invoice.notes ?? ""} rows={2} />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
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

          {blockers.length > 0 && (
            <div className="mt-4 rounded-xl bg-warn-soft p-3 text-[13px] text-warn">
              <div className="mb-1 font-semibold">Vor dem Festschreiben (Stand der letzten Speicherung)</div>
              <ul className="list-disc space-y-0.5 pl-4">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {blockers.some((b) => b.startsWith("In den Firmendaten")) && (
                <a href="/einstellungen" className="mt-2 inline-block font-semibold underline underline-offset-2">
                  Firmendaten ergänzen
                </a>
              )}
            </div>
          )}

          <div className="mt-5 grid gap-2">
            <FinanceSubmit name="intent" value="speichern" variant="secondary" pendingText="Speichert …">
              Entwurf speichern
            </FinanceSubmit>
            <LinkButton href={`/api/finanzen/rechnungen/${invoice.id}/pdf`} target="_blank" variant="ghost">
              <Eye className="size-4" /> Vorschau (gespeicherter Stand)
            </LinkButton>
            <FinanceSubmit
              name="intent"
              value="festschreiben"
              pendingText="Schreibt fest …"
              disabled={!isOwner}
              onClick={(e) => {
                if (!window.confirm(`${offer ? "Angebot" : "Rechnung"} jetzt festschreiben?\n\nNummer und Datum werden vergeben. Danach lässt sich der Beleg nicht mehr ändern${offer ? "" : ", nur noch stornieren"}.`))
                  e.preventDefault();
              }}
            >
              <Lock className="size-4" /> Speichern und festschreiben
            </FinanceSubmit>
            {!isOwner && <p className="text-[12px] text-muted">Festschreiben dürfen nur Inhaber.</p>}
            <p className="text-[12px] text-muted">
              {offer ? "Festgeschriebene Angebote bekommen eine Nummer (AN-…) und ein PDF." : "Rechnungen werden als E-Rechnung (ZUGFeRD, EN 16931) festgeschrieben."}
            </p>
          </div>
          {!invoice.number && (
            <div className="mt-4 border-t border-line pt-4">
              <ActionButton action={deleteDraft.bind(null, invoice.id)} confirm="Diesen Entwurf löschen?" variant="danger" size="sm" className="w-full">
                <Trash2 className="size-4" /> Entwurf löschen
              </ActionButton>
            </div>
          )}
        </Card>
      </aside>
    </FinanceForm>
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
      className="grid size-8 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
