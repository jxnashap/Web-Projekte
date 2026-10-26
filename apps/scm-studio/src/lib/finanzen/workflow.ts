// Belegfluss (GoBD): Festschreiben mit lückenloser Nummer, Ablage der Datei byte-genau mit SHA-256,
// Storno statt Ändern, Angebot in Rechnung umwandeln, Zahlungserinnerung. Die Datenbank schützt
// festgeschriebene Belege zusätzlich per Trigger (drizzle/0001_gobd_schutz.sql).
// Bewusst ohne "server-only" an dieser Stelle: der Seed nutzt dieselbe Logik (siehe scripts/seed-parts/30-finanzen.ts).
import { and, asc, eq, isNull } from "drizzle-orm";
import { createElement } from "react";
import type { DB } from "@/db/connect";
import * as schema from "@/db/schema";
import type { Invoice, InvoiceItem } from "@/db/schema";
import { audit } from "@/lib/audit";
import { renderPdf } from "@/lib/pdf/render";
import type { Company } from "@/lib/settings";
import { putFile } from "@/lib/storage";
import { todayIso } from "@/lib/time";
import { addDaysIso, calcTotals, draftBlockers, formatDocNumber, KIND_LABEL, missingCompanyFields, type DocKind } from "./core";
import { toFacturX } from "./einvoice";
import { InvoicePdf, ReminderPdf } from "./pdf";

export class FinanceError extends Error {}

export async function readSettingDb<T>(db: DB, key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return (row?.value as T) ?? fallback;
}

export async function loadInvoice(db: DB, id: number): Promise<{ invoice: Invoice; items: InvoiceItem[] } | null> {
  const [invoice] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
  if (!invoice) return null;
  const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, id)).orderBy(asc(schema.invoiceItems.position));
  return { invoice, items };
}

async function cancelsRef(db: DB, invoice: Invoice) {
  if (!invoice.cancelsId) return null;
  const [orig] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.cancelsId));
  return orig?.number && orig.issueDate ? { number: orig.number, issueDate: orig.issueDate } : null;
}

/** PDF (Entwurf oder endgültig) rendern; endgültige Rechnungen und Stornos als ZUGFeRD/Factur-X. */
export async function renderInvoiceFile(db: DB, invoice: Invoice, items: InvoiceItem[], company: Company | null, draft: boolean): Promise<Uint8Array> {
  const kind = invoice.kind as DocKind;
  const cancels = await cancelsRef(db, invoice);
  // Vorschau mit Beispiel-IBAN: im PDF deutlich als Demo markieren, damit niemand auf das Testkonto überweist
  const demoIban = Boolean((await readSettingDb<{ testIban?: boolean } | null>(db, "demo:finanzen", null))?.testIban);
  const pdf = await renderPdf(
    createElement(InvoicePdf, { invoice: { ...invoice, kind }, items, recipient: invoice.recipient ?? null, company, draft, cancels, demoIban }),
  );
  if (draft || kind === "angebot" || !company || !invoice.recipient) return pdf;
  return toFacturX(
    pdf,
    { invoice: { ...invoice, kind }, items, recipient: invoice.recipient, company, cancels },
    `${invoice.number}.pdf`,
  );
}

/** Nummer reservieren (Zeilensperre auf dem Nummernkreis). Einmal vergeben, bleibt sie an diesem Beleg. */
async function reserveNumber(db: DB, invoice: Invoice, company: Company): Promise<Invoice> {
  if (invoice.number) return invoice;
  const kind = invoice.kind as DocKind;
  const issueDate = invoice.issueDate ?? todayIso();
  const year = Number(issueDate.slice(0, 4));
  return db.transaction(async (tx) => {
    await tx.insert(schema.numberSequences).values({ kind, year, next: 1 }).onConflictDoNothing();
    const [seq] = await tx
      .select()
      .from(schema.numberSequences)
      .where(and(eq(schema.numberSequences.kind, kind), eq(schema.numberSequences.year, year)))
      .for("update");
    const number = formatDocNumber(kind, year, seq.next);
    await tx.update(schema.numberSequences).set({ next: seq.next + 1 }).where(eq(schema.numberSequences.id, seq.id));
    const [updated] = await tx
      .update(schema.invoices)
      .set({
        number,
        issueDate,
        dueDate: kind === "rechnung" ? (invoice.dueDate ?? addDaysIso(issueDate, company.paymentDays || 14)) : invoice.dueDate,
        validUntil: kind === "angebot" ? (invoice.validUntil ?? addDaysIso(issueDate, 30)) : invoice.validUntil,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.invoices.id, invoice.id), isNull(schema.invoices.number)))
      .returning();
    if (!updated) throw new FinanceError("Das wurde gerade anderweitig bearbeitet. Bitte die Seite neu laden.");
    return updated;
  });
}

/** Prüft, ob ein Entwurf festgeschrieben werden kann. Liefert verständliche Gründe (Regeln in core.ts). */
export function finalizeBlockers(
  invoice: Invoice,
  items: Pick<InvoiceItem, "description" | "quantity" | "unitPriceCents" | "taxRate">[],
  company: Company | null,
  opts: { demo?: boolean } = {},
): string[] {
  return draftBlockers({
    kind: invoice.kind as DocKind,
    recipient: invoice.recipient,
    serviceFrom: invoice.serviceFrom,
    serviceTo: invoice.serviceTo,
    items,
    companyMissing: missingCompanyFields(company, invoice.kind as DocKind),
    smallBusiness: company?.smallBusiness,
    demo: opts.demo,
  }).map((b) => b.text);
}

/** Entwurf festschreiben: Summen, Nummer, Datei (bei Rechnungen ZUGFeRD), Hash, Zeitpunkt. */
export async function finalizeInvoice(db: DB, id: number, userId: number | null, opts: { demo?: boolean } = {}): Promise<Invoice> {
  const loaded = await loadInvoice(db, id);
  if (!loaded) throw new FinanceError("Rechnung oder Angebot nicht gefunden.");
  let { invoice } = loaded;
  const { items } = loaded;
  if (invoice.finalizedAt) throw new FinanceError("Schon festgeschrieben.");
  const company = await readSettingDb<Company | null>(db, "company", null);
  const blockers = finalizeBlockers(invoice, items, company, opts);
  if (blockers.length) throw new FinanceError(blockers.join(" "));

  const totals = calcTotals(items, company!.smallBusiness);
  await db
    .update(schema.invoices)
    .set({ netCents: totals.netCents, taxCents: totals.taxCents, grossCents: totals.grossCents, updatedAt: new Date() })
    .where(eq(schema.invoices.id, id));
  invoice = await reserveNumber(db, { ...invoice, ...totals }, company!);

  const data = await renderInvoiceFile(db, invoice, items, company, false);
  const file = await putFile({ bucket: "rechnungen", name: `${invoice.number}.pdf`, mime: "application/pdf", data, userId });
  const [done] = await db
    .update(schema.invoices)
    .set({ finalizedAt: new Date(), fileId: file.id, contentHash: file.sha256, status: "offen", updatedAt: new Date() })
    .where(and(eq(schema.invoices.id, id), isNull(schema.invoices.finalizedAt)))
    .returning();
  if (!done) throw new FinanceError("Das wurde gerade anderweitig festgeschrieben. Bitte die Seite neu laden.");
  await audit(userId, "invoice", id, "festgeschrieben", { kind: done.kind, number: done.number, grossCents: done.grossCents, fileId: file.id, sha256: file.sha256 });
  return done;
}

/** Storno: eigener festgeschriebener Beleg mit negativen Beträgen und Bezug auf das Original. */
export async function cancelInvoice(db: DB, id: number, userId: number | null, reason?: string, opts: { demo?: boolean } = {}): Promise<Invoice> {
  const loaded = await loadInvoice(db, id);
  if (!loaded) throw new FinanceError("Rechnung nicht gefunden.");
  const { invoice, items } = loaded;
  if (invoice.kind !== "rechnung") throw new FinanceError("Nur Rechnungen können storniert werden.");
  if (!invoice.finalizedAt) throw new FinanceError("Entwürfe könnt ihr einfach löschen oder ändern.");
  if (invoice.status === "storniert") throw new FinanceError("Die Rechnung ist bereits storniert.");
  const today = todayIso();
  const [storno] = await db
    .insert(schema.invoices)
    .values({
      kind: "storno",
      status: "entwurf",
      clientId: invoice.clientId,
      recipient: invoice.recipient,
      title: `Storno zu ${invoice.number}`,
      issueDate: today,
      serviceFrom: invoice.serviceFrom,
      serviceTo: invoice.serviceTo,
      intro: reason ? `Grund: ${reason}` : null,
      cancelsId: invoice.id,
      buyerReference: invoice.buyerReference,
    })
    .returning();
  await db.insert(schema.invoiceItems).values(
    items.map((it) => ({
      invoiceId: storno.id,
      position: it.position,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPriceCents: -it.unitPriceCents,
      taxRate: it.taxRate,
    })),
  );
  // Der Storno übernimmt die Anschrift der Originalrechnung (die beim Festschreiben bereits geprüft wurde)
  const done = await finalizeInvoice(db, storno.id, userId, { demo: true, ...opts });
  await db.update(schema.invoices).set({ status: "storniert", updatedAt: new Date() }).where(eq(schema.invoices.id, invoice.id));
  await audit(userId, "invoice", invoice.id, "storniert", { stornoId: done.id, stornoNumber: done.number, reason: reason ?? null });
  return done;
}

/** Angebot in Rechnungsentwurf umwandeln (Positionen und Empfänger werden übernommen). */
export async function offerToInvoice(db: DB, offerId: number, userId: number | null): Promise<Invoice> {
  const loaded = await loadInvoice(db, offerId);
  if (!loaded || loaded.invoice.kind !== "angebot") throw new FinanceError("Angebot nicht gefunden.");
  const { invoice: offer, items } = loaded;
  const [inv] = await db
    .insert(schema.invoices)
    .values({
      kind: "rechnung",
      status: "entwurf",
      clientId: offer.clientId,
      recipient: offer.recipient,
      title: offer.title === KIND_LABEL.angebot ? KIND_LABEL.rechnung : offer.title,
      serviceFrom: offer.serviceFrom,
      serviceTo: offer.serviceTo,
      intro: offer.number ? `Wie in unserem Angebot ${offer.number} vereinbart, berechnen wir euch folgende Leistungen:` : null,
      outro: "Vielen Dank für die Zusammenarbeit!",
      fromOfferId: offer.id,
      buyerReference: offer.buyerReference,
    })
    .returning();
  if (items.length) {
    await db.insert(schema.invoiceItems).values(
      items.map((it) => ({ invoiceId: inv.id, position: it.position, description: it.description, quantity: it.quantity, unit: it.unit, unitPriceCents: it.unitPriceCents, taxRate: it.taxRate })),
    );
  }
  if (offer.finalizedAt && offer.status !== "angenommen") {
    await db.update(schema.invoices).set({ status: "angenommen", updatedAt: new Date() }).where(eq(schema.invoices.id, offer.id));
  }
  await audit(userId, "invoice", offer.id, "in_rechnung_umgewandelt", { invoiceId: inv.id });
  return inv;
}

/** Zahlungserinnerung (Stufe 1 bis 3) als PDF ablegen; keine Gebühren. */
export async function createReminder(db: DB, id: number, userId: number | null): Promise<{ fileId: number; level: number }> {
  const loaded = await loadInvoice(db, id);
  if (!loaded) throw new FinanceError("Rechnung nicht gefunden.");
  const { invoice } = loaded;
  const today = todayIso();
  if (invoice.kind !== "rechnung" || invoice.status !== "offen") throw new FinanceError("Erinnerungen gibt es nur für offene Rechnungen.");
  if (!invoice.dueDate || invoice.dueDate >= today) throw new FinanceError("Die Rechnung ist noch nicht fällig.");
  if (invoice.dunningLevel >= 3) throw new FinanceError("Es wurden bereits drei Erinnerungen erstellt. Bitte persönlich nachfassen.");
  const level = invoice.dunningLevel + 1;
  const company = await readSettingDb<Company | null>(db, "company", null);
  const demoIban = Boolean((await readSettingDb<{ testIban?: boolean } | null>(db, "demo:finanzen", null))?.testIban);
  const data = await renderPdf(
    createElement(ReminderPdf, {
      demoIban,
      level,
      date: today,
      payUntil: addDaysIso(today, 7),
      invoice: { number: invoice.number!, issueDate: invoice.issueDate!, dueDate: invoice.dueDate, grossCents: invoice.grossCents, clientId: invoice.clientId, title: invoice.title },
      recipient: invoice.recipient ?? null,
      company,
    }),
  );
  const file = await putFile({ bucket: "rechnungen", name: `Zahlungserinnerung-${level}-${invoice.number}.pdf`, mime: "application/pdf", data, userId });
  await db.update(schema.invoices).set({ dunningLevel: level, lastDunningAt: today, updatedAt: new Date() }).where(eq(schema.invoices.id, id));
  await audit(userId, "invoice", id, "zahlungserinnerung", { level, fileId: file.id, sha256: file.sha256 });
  return { fileId: file.id, level };
}
