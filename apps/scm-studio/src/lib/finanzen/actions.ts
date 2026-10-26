"use server";
// Server Actions Finanzen. Jede Action prüft die Anmeldung, validiert mit zod und protokolliert.
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { Party } from "@/db/schema";
import { done, fail, parseForm, type ActionState, zOptDate, zText } from "@/lib/action";
import { assertUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseEuroToCents } from "@/lib/format";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/labels";
import { getCompany, setSetting } from "@/lib/settings";
import { MAX_UPLOAD_BYTES, putFile, RECEIPT_TYPES } from "@/lib/storage";
import { monthIso, monthRange, todayIso } from "@/lib/time";
import { addDaysIso, calcTotals, DATEV_DEFAULTS, fromNet, KIND_LABEL, partyFromClient, plural, splitGross, TAX_RATES, UNIT_LABELS, type DocKind } from "./core";
import { lateReceiptMap } from "./data";
import { buildExportZip } from "./export";
import { cancelInvoice, createReminder, FinanceError, finalizeInvoice, loadInvoice, offerToInvoice } from "./workflow";

/** Festschreiben, Storno und Export nur durch Inhaber (role admin). */
async function assertOwner() {
  const user = await assertUser();
  return user.role === "admin" ? { user, denied: null } : { user, denied: fail("Das dürfen nur Inhaber (Festschreiben, Storno, Export).") };
}

/** Optionaler Text mit verständlicher Meldung bei Überlänge */
const zOpt = (label: string, max: number) => z.string().max(max, `${label} ist zu lang (höchstens ${max.toLocaleString("de-DE")} Zeichen)`).optional();
const zDay = (label: string) => z.string({ error: `${label} fehlt` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label}: Datum wählen`);

const msg = (e: unknown) => (e instanceof FinanceError ? e.message : e instanceof Error && /GoBD/.test(e.message) ? e.message.replace(/^.*GoBD: /, "GoBD: ") : "Das hat nicht geklappt. Bitte erneut versuchen.");

// ------------------------------------------------------------------
// Entwurf anlegen
// ------------------------------------------------------------------
const createSchema = z.object({
  kind: z.enum(["rechnung", "angebot"], { error: "Bitte Rechnung oder Angebot wählen" }),
  // "kunde:5" oder "anfrage:3"; leer = Empfänger von Hand
  empfaenger: z
    .string()
    .regex(/^(kunde|anfrage):\d+$/, "Empfänger wählen")
    .optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Leistungsmonat wählen").optional(),
  paket: z.string().optional(),
});

export async function createDraft(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(createSchema, fd);
  if (!p.success) return p.state;
  const { kind, empfaenger, month = monthIso(), paket } = p.data;
  const [refKind, refId] = empfaenger ? (empfaenger.split(":") as ["kunde" | "anfrage", string]) : [null, ""];
  const db = await getDb();
  const company = await getCompany();
  const [lead] = refKind === "anfrage" ? await db.select().from(schema.leads).where(eq(schema.leads.id, Number(refId))) : [];
  if (refKind === "anfrage" && !lead) return fail("Anfrage nicht gefunden.", { empfaenger: ["Anfrage nicht gefunden"] });
  // Ist die Anfrage schon Kunde geworden, gilt der Kunde
  const clientId = refKind === "kunde" ? Number(refId) : (lead?.clientId ?? null);
  const [client] = clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, clientId)) : [];
  if (clientId && !client) return fail("Kunde nicht gefunden.", { empfaenger: ["Kunde nicht gefunden"] });
  const range = monthRange(month);
  const withPackage = paket === "on" && client?.packageVideos && client.packagePriceCents;
  const { monthLabel } = await import("@/lib/format");
  const item = withPackage
    ? {
        position: 1,
        description: `Social-Media-Paket ${client.packageVideos} Videos, ${monthLabel(month)}: Konzept, Dreh, Schnitt, Untertitel`,
        quantity: 1,
        unit: "Monat",
        unitPriceCents: client.packagePriceCents!,
        taxRate: company?.smallBusiness ? 0 : 19,
      }
    : null;
  // Summen gleich mitschreiben, damit die Liste schon vor dem ersten Speichern den richtigen Betrag zeigt
  const totals = calcTotals(item ? [item] : [], company?.smallBusiness);
  const recipient: Party | null = client
    ? partyFromClient(client)
    : lead
      ? { name: lead.company, contact: lead.name || null, street: null, zip: null, city: lead.ort ?? null, country: "DE", vatId: null, email: lead.email ?? null }
      : null;
  const [inv] = await db
    .insert(schema.invoices)
    .values({
      kind,
      status: "entwurf",
      clientId: client?.id ?? null,
      recipient,
      title: withPackage ? "Social-Media-Paket" : KIND_LABEL[kind],
      serviceFrom: kind === "rechnung" && withPackage ? range.from : null,
      serviceTo: kind === "rechnung" && withPackage ? range.to : null,
      buyerReference: client?.buyerReference ?? null,
      intro:
        kind === "angebot"
          ? "Vielen Dank für das nette Gespräch. Wie besprochen, hier unser Vorschlag:"
          : "Vielen Dank für die Zusammenarbeit. Wir berechnen euch folgende Leistungen:",
      outro: kind === "angebot" ? "Wir freuen uns auf eure Rückmeldung." : "Fragen zur Rechnung? Meldet euch einfach bei uns.",
      notes: lead && !client ? `Zur Anfrage von ${lead.company}` : null,
      netCents: totals.netCents,
      taxCents: totals.taxCents,
      grossCents: totals.grossCents,
    })
    .returning();
  if (item) await db.insert(schema.invoiceItems).values({ ...item, invoiceId: inv.id });
  await audit(user.id, "invoice", inv.id, "entwurf_angelegt", { kind, clientId: client?.id ?? null, leadId: lead?.id ?? null });
  return done(`${KIND_LABEL[kind]}sentwurf angelegt`, { redirectTo: `/finanzen/rechnungen/${inv.id}`, id: inv.id });
}

// ------------------------------------------------------------------
// Entwurf speichern (und optional festschreiben)
// ------------------------------------------------------------------
const draftSchema = z.object({
  id: z.coerce.number().int().positive(),
  intent: z.enum(["speichern", "festschreiben", "vorschau"]).default("speichern"),
  title: zText("Titel", 160),
  recipientName: zText("Name oder Firma", 200),
  recipientContact: zOpt("Ansprechpartner", 200),
  recipientStreet: zOpt("Straße", 200),
  recipientZip: zOpt("PLZ", 20),
  recipientCity: zOpt("Ort", 120),
  recipientVatId: zOpt("USt-IdNr.", 40),
  recipientEmail: z.email("E-Mail-Adresse prüfen, z. B. name@firma.de").optional(),
  clientId: z.coerce.number().int().positive().optional(),
  issueDate: zOptDate,
  serviceFrom: zOptDate,
  serviceTo: zOptDate,
  dueDays: z.coerce
    .number({ error: "Zahlungsziel: Zahl der Tage eingeben" })
    .int("Zahlungsziel: ganze Tage eingeben")
    .min(0, "Zahlungsziel: 0 bis 120 Tage")
    .max(120, "Zahlungsziel: 0 bis 120 Tage")
    .optional(),
  validUntil: zOptDate,
  buyerReference: zOpt("Käuferreferenz", 100),
  intro: zOpt("Einleitung", 2000),
  outro: zOpt("Schluss", 2000),
  notes: zOpt("Interne Notiz", 2000),
  items: z.string({ error: "Positionen fehlen" }),
});

type DraftItem = { description: string; quantity: number; unit: string; unitPriceCents: number; taxRate: number };

/** Positionen aus dem Editor prüfen. Fehler je Feld als "items.<Index>.<Feld>", damit der Editor sie an der Position zeigt. */
function parseItems(json: string): { items: DraftItem[] } | { state: ActionState } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { state: fail("Positionen konnten nicht gelesen werden. Bitte die Seite neu laden.") };
  }
  if (!Array.isArray(raw)) return { state: fail("Positionen konnten nicht gelesen werden. Bitte die Seite neu laden.") };
  if (raw.length > 100) return { state: fail("Höchstens 100 Positionen je Rechnung.") };
  const errors: Record<string, string[]> = {};
  const items: DraftItem[] = [];
  raw.forEach((r: Record<string, unknown>, i) => {
    const description = String(r?.description ?? "").trim();
    if (!description) errors[`items.${i}.description`] = ["Beschreibung fehlt"];
    else if (description.length > 1000) errors[`items.${i}.description`] = ["Beschreibung ist zu lang (höchstens 1.000 Zeichen)"];
    const quantity = Number(String(r?.quantity ?? "").replace(",", "."));
    if (!Number.isFinite(quantity) || quantity === 0) errors[`items.${i}.quantity`] = ["Menge fehlt"];
    let unitPriceCents = 0;
    try {
      unitPriceCents = parseEuroToCents(String(r?.price ?? ""));
    } catch {
      errors[`items.${i}.price`] = ["Betrag prüfen, z. B. 49,90"];
    }
    const unit = String(r?.unit ?? "");
    if (!UNIT_LABELS.includes(unit)) errors[`items.${i}.unit`] = ["Einheit wählen"];
    const taxRate = Number(r?.taxRate);
    if (!(TAX_RATES as readonly number[]).includes(taxRate)) errors[`items.${i}.taxRate`] = ["Steuersatz 19, 7 oder 0 %"];
    items.push({ description, quantity, unit, unitPriceCents, taxRate });
  });
  const bad = new Set(Object.keys(errors).map((k) => k.split(".")[1])).size;
  if (bad) return { state: fail(bad === 1 ? "Bitte die markierte Position prüfen." : "Bitte die markierten Positionen prüfen.", errors) };
  return { items };
}

export async function saveDraft(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(draftSchema, fd);
  if (!p.success) return p.state;
  const d = p.data;
  const db = await getDb();
  const loaded = await loadInvoice(db, d.id);
  if (!loaded) return fail("Rechnung oder Angebot nicht gefunden.");
  if (loaded.invoice.finalizedAt) return fail("Schon festgeschrieben. Änderungen sind nicht mehr möglich.");

  const parsed = parseItems(d.items);
  if ("state" in parsed) return parsed.state;
  const { items } = parsed;
  if (d.serviceFrom && d.serviceTo && d.serviceFrom > d.serviceTo) return fail("Leistungszeitraum: Beginn liegt nach dem Ende.", { serviceTo: ["Ende liegt vor dem Beginn"] });

  const company = await getCompany();
  const kind = loaded.invoice.kind as DocKind;
  const recipient: Party = {
    name: d.recipientName,
    contact: d.recipientContact ?? null,
    street: d.recipientStreet ?? null,
    zip: d.recipientZip ?? null,
    city: d.recipientCity ?? null,
    country: "DE",
    vatId: d.recipientVatId ?? null,
    email: d.recipientEmail ?? null,
  };
  const totals = calcTotals(items, company?.smallBusiness);
  const issueDate = d.issueDate ?? null;
  const dueDate = kind === "rechnung" && issueDate && d.dueDays !== undefined ? addDaysIso(issueDate, d.dueDays) : null;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.invoices)
      .set({
        title: d.title,
        clientId: d.clientId ?? null,
        recipient,
        issueDate,
        serviceFrom: d.serviceFrom ?? null,
        serviceTo: d.serviceTo ?? null,
        dueDate,
        validUntil: kind === "angebot" ? (d.validUntil ?? null) : null,
        buyerReference: d.buyerReference ?? null,
        intro: d.intro ?? null,
        outro: d.outro ?? null,
        notes: d.notes ?? null,
        netCents: totals.netCents,
        taxCents: totals.taxCents,
        grossCents: totals.grossCents,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.invoices.id, d.id), isNull(schema.invoices.finalizedAt)));
    await tx.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, d.id));
    if (items.length) await tx.insert(schema.invoiceItems).values(items.map((it, i) => ({ ...it, invoiceId: d.id, position: i + 1 })));
  });
  await audit(user.id, "invoice", d.id, "entwurf_gespeichert", { positions: items.length, grossCents: totals.grossCents });

  if (d.intent === "festschreiben") {
    if (user.role !== "admin") return fail("Gespeichert. Festschreiben dürfen nur Inhaber.");
    // Zahlungsziel: Tage ab Rechnungsdatum (Datum wird beim Festschreiben auf heute gesetzt, falls leer)
    if (kind === "rechnung" && !issueDate && d.dueDays !== undefined) {
      const today = todayIso();
      await db.update(schema.invoices).set({ issueDate: today, dueDate: addDaysIso(today, d.dueDays) }).where(eq(schema.invoices.id, d.id));
    }
    try {
      const fin = await finalizeInvoice(db, d.id, user.id);
      refresh();
      return done(`${KIND_LABEL[kind]} ${fin.number} festgeschrieben`, { redirectTo: `/finanzen/rechnungen/${d.id}` });
    } catch (e) {
      refresh();
      return fail(msg(e));
    }
  }
  refresh();
  return done(d.intent === "vorschau" ? "Gespeichert, die Vorschau öffnet sich" : "Entwurf gespeichert");
}

export async function deleteDraft(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const loaded = await loadInvoice(db, id);
  if (!loaded) return fail("Entwurf nicht gefunden.");
  if (loaded.invoice.finalizedAt) return fail("Festgeschriebene Rechnungen werden nicht gelöscht. Bitte stornieren.");
  if (loaded.invoice.number) return fail("Dieser Entwurf hat schon eine Nummer und muss festgeschrieben werden (lückenlose Nummernfolge).");
  await db.delete(schema.invoices).where(and(eq(schema.invoices.id, id), isNull(schema.invoices.finalizedAt)));
  await audit(user.id, "invoice", id, "entwurf_geloescht", { kind: loaded.invoice.kind });
  refresh();
  return done("Entwurf gelöscht", { redirectTo: loaded.invoice.kind === "angebot" ? "/finanzen/rechnungen?art=angebot" : "/finanzen/rechnungen" });
}

// ------------------------------------------------------------------
// Nach dem Festschreiben: Versand, Zahlung, Storno, Angebot, Erinnerung
// ------------------------------------------------------------------
async function finalized(id: number) {
  const db = await getDb();
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
  if (!inv) throw new FinanceError("Rechnung oder Angebot nicht gefunden.");
  if (!inv.finalizedAt) throw new FinanceError("Bitte zuerst festschreiben.");
  return { db, inv };
}

export async function markSent(id: number): Promise<ActionState> {
  const user = await assertUser();
  try {
    const { db, inv } = await finalized(id);
    await db.update(schema.invoices).set({ sentAt: new Date(), updatedAt: new Date() }).where(eq(schema.invoices.id, id));
    await audit(user.id, "invoice", id, "versendet", { number: inv.number });
    refresh();
    return done("Als versendet markiert");
  } catch (e) {
    return fail(msg(e));
  }
}

const paidSchema = z.object({ id: z.coerce.number().int().positive(), paidAt: zDay("Datum des Geldeingangs") });

export async function markPaid(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(paidSchema, fd);
  if (!p.success) return p.state;
  try {
    const { db, inv } = await finalized(p.data.id);
    if (inv.kind !== "rechnung") return fail("Nur Rechnungen werden bezahlt.");
    if (inv.status === "storniert") return fail("Die Rechnung ist storniert.");
    if (p.data.paidAt > todayIso()) return fail("Das Zahlungsdatum liegt in der Zukunft.", { paidAt: ["Datum liegt in der Zukunft"] });
    await db.update(schema.invoices).set({ status: "bezahlt", paidAt: p.data.paidAt, updatedAt: new Date() }).where(eq(schema.invoices.id, inv.id));
    await audit(user.id, "invoice", inv.id, "bezahlt", { paidAt: p.data.paidAt, grossCents: inv.grossCents });
    refresh();
    return done(`${inv.number} als bezahlt markiert`);
  } catch (e) {
    return fail(msg(e));
  }
}

export async function undoPaid(id: number): Promise<ActionState> {
  const user = await assertUser();
  try {
    const { db, inv } = await finalized(id);
    if (inv.status !== "bezahlt") return fail("Die Rechnung ist nicht als bezahlt markiert.");
    await db.update(schema.invoices).set({ status: "offen", paidAt: null, updatedAt: new Date() }).where(eq(schema.invoices.id, id));
    await audit(user.id, "invoice", id, "zahlung_zurueckgenommen", { previousPaidAt: inv.paidAt });
    refresh();
    return done("Zahlung zurückgenommen");
  } catch (e) {
    return fail(msg(e));
  }
}

const cancelSchema = z.object({
  id: z.coerce.number().int().positive(),
  reason: z.string({ error: "Bitte kurz den Grund nennen" }).trim().min(3, "Bitte kurz den Grund nennen (mindestens 3 Zeichen)").max(300, "Grund ist zu lang (höchstens 300 Zeichen)"),
});

export async function cancel(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = await assertOwner();
  if (denied) return denied;
  const p = parseForm(cancelSchema, fd);
  if (!p.success) return p.state;
  try {
    const db = await getDb();
    const st = await cancelInvoice(db, p.data.id, user.id, p.data.reason);
    refresh();
    return done(`Storniert mit ${st.number}`, { redirectTo: `/finanzen/rechnungen/${st.id}` });
  } catch (e) {
    return fail(msg(e));
  }
}

export async function setOfferStatus(id: number, status: "angenommen" | "abgelehnt" | "offen"): Promise<ActionState> {
  const user = await assertUser();
  try {
    const { db, inv } = await finalized(id);
    if (inv.kind !== "angebot") return fail("Nur für Angebote.");
    await db.update(schema.invoices).set({ status, updatedAt: new Date() }).where(eq(schema.invoices.id, id));
    await audit(user.id, "invoice", id, `angebot_${status}`, { number: inv.number });
    refresh();
    return done(status === "angenommen" ? "Angebot angenommen" : status === "abgelehnt" ? "Angebot abgelehnt" : "Angebot wieder offen");
  } catch (e) {
    return fail(msg(e));
  }
}

export async function convertOffer(id: number): Promise<ActionState> {
  const user = await assertUser();
  try {
    const db = await getDb();
    const inv = await offerToInvoice(db, id, user.id);
    refresh();
    return done("Rechnungsentwurf aus dem Angebot angelegt", { redirectTo: `/finanzen/rechnungen/${inv.id}` });
  } catch (e) {
    return fail(msg(e));
  }
}

export async function remind(id: number): Promise<ActionState> {
  const user = await assertUser();
  try {
    const db = await getDb();
    const r = await createReminder(db, id, user.id);
    refresh();
    return done(`Zahlungserinnerung (Stufe ${r.level}) erstellt`);
  } catch (e) {
    return fail(msg(e));
  }
}

// ------------------------------------------------------------------
// Ausgaben (Belege)
// ------------------------------------------------------------------
const expenseSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  date: zDay("Belegdatum"),
  supplier: zText("Lieferant", 160),
  description: zText("Zweck", 300),
  category: z.string({ error: "Kategorie wählen" }).refine((c) => c in EXPENSE_CATEGORIES, "Kategorie wählen"),
  amount: z.string({ error: "Betrag fehlt" }).min(1, "Betrag fehlt"),
  amountMode: z.enum(["brutto", "netto"]).default("brutto"),
  taxRate: z.coerce.number({ error: "Steuersatz wählen" }).refine((r) => (TAX_RATES as readonly number[]).includes(r), "Steuersatz wählen"),
  reverseCharge: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  paymentMethod: z.string().refine((m) => m in PAYMENT_METHODS, "Zahlungsart wählen").optional(),
  paidOn: zOptDate,
  supplierInvoiceNo: zOpt("Rechnungsnummer", 60),
  clientId: z.coerce.number().int().positive().optional(),
  notes: zOpt("Notiz", 1000),
});

/** Dateityp aus dem Browser, notfalls aus der Endung (manche Geräte liefern bei XML oder HEIC keinen Typ). */
function receiptMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().split(".").pop();
  return ext === "xml" ? "application/xml" : ext === "heic" ? "image/heic" : ext === "pdf" ? "application/pdf" : "application/octet-stream";
}

/** Belegdatei prüfen und ablegen. */
async function storeReceipt(file: File, userId: number): Promise<{ stored: { id: number; sha256: string; name: string } } | { state: ActionState }> {
  if (file.size > MAX_UPLOAD_BYTES) return { state: fail("Die Datei ist größer als 10 MB.", { beleg: ["Datei zu groß (höchstens 10 MB)"] }) };
  const mime = receiptMime(file);
  if (!RECEIPT_TYPES.includes(mime))
    return { state: fail("Bitte ein Foto (JPG, PNG, WebP, HEIC), ein PDF oder eine XML-E-Rechnung hochladen.", { beleg: ["Dateityp nicht erlaubt"] }) };
  const stored = await putFile({ bucket: "belege", name: file.name || "beleg", mime, data: new Uint8Array(await file.arrayBuffer()), userId });
  return { stored: { id: stored.id, sha256: stored.sha256, name: file.name || "beleg" } };
}

export async function saveExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const file = fd.get("beleg");
  fd.delete("beleg");
  const p = parseForm(expenseSchema, fd);
  if (!p.success) return p.state;
  const d = p.data;
  let amountCents: number;
  try {
    amountCents = parseEuroToCents(d.amount);
  } catch {
    return fail("Betrag prüfen", { amount: ["Betrag im Format 12,34 eingeben"] });
  }
  if (amountCents <= 0) return fail("Betrag muss größer als 0 sein", { amount: ["Betrag muss größer als 0 sein"] });
  if (d.date > todayIso()) return fail("Das Belegdatum liegt in der Zukunft.", { date: ["Datum liegt in der Zukunft"] });

  // § 13b: Rechnung ohne Umsatzsteuer, der Betrag ist netto; die Steuer schuldet ihr selbst (Vorschau rechnet sie aus)
  const amounts = d.reverseCharge
    ? { netCents: amountCents, taxCents: 0, grossCents: amountCents }
    : d.amountMode === "netto"
      ? fromNet(amountCents, d.taxRate)
      : splitGross(amountCents, d.taxRate);

  const db = await getDb();
  // Exportierte Belege früh ablehnen (vor dem Ablegen einer Datei)
  const [cur] = d.id ? await db.select().from(schema.expenses).where(eq(schema.expenses.id, d.id)) : [];
  if (d.id && !cur) return fail("Beleg nicht gefunden.");
  if (cur?.exportedAt) return fail("Dieser Beleg wurde schon an die Buchhaltung exportiert und ist festgeschrieben. Eine fehlende Datei könnt ihr nachreichen.");

  let fileId: number | undefined;
  let receiptName: string | undefined;
  if (file instanceof File && file.size > 0) {
    const r = await storeReceipt(file, user.id);
    if ("state" in r) return r.state;
    fileId = r.stored.id;
    receiptName = r.stored.name;
  }

  const values = {
    date: d.date,
    supplier: d.supplier,
    description: d.description,
    category: d.category,
    taxRate: d.taxRate,
    ...amounts,
    reverseCharge: d.reverseCharge,
    paymentMethod: d.paymentMethod ?? null,
    paidOn: d.paidOn ?? null,
    supplierInvoiceNo: d.supplierInvoiceNo ?? null,
    clientId: d.clientId ?? null,
    notes: d.notes ?? null,
    ...(fileId ? { fileId, receiptName } : {}),
  };
  try {
    if (cur) {
      await db.update(schema.expenses).set(values).where(eq(schema.expenses.id, cur.id));
      await audit(user.id, "expense", cur.id, "geaendert", { grossCents: amounts.grossCents, fileId: fileId ?? cur.fileId });
      refresh();
      return done(fileId && !cur.fileId ? "Beleg mit Datei gespeichert" : "Beleg gespeichert");
    }
    const [row] = await db.insert(schema.expenses).values({ ...values, createdBy: user.id }).returning();
    await audit(user.id, "expense", row.id, "erfasst", { grossCents: amounts.grossCents, fileId: fileId ?? null });
    refresh();
    return done(fileId ? "Beleg mit Datei angelegt" : "Beleg angelegt. Die Datei könnt ihr später ergänzen.", { id: row.id });
  } catch (e) {
    return fail(msg(e));
  }
}

/**
 * Datei zu einem schon exportierten Beleg nachreichen. Der Beleg selbst bleibt unverändert (GoBD); die Datei wird
 * revisionssicher abgelegt und über das Änderungsprotokoll (Hash-Kette) mit dem Beleg verknüpft.
 */
export async function attachLateReceipt(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const id = Number(fd.get("id"));
  const file = fd.get("beleg");
  if (!Number.isInteger(id) || id <= 0) return fail("Beleg nicht gefunden.");
  if (!(file instanceof File) || file.size === 0) return fail("Bitte zuerst ein Foto aufnehmen oder eine Datei wählen.", { beleg: ["Datei fehlt"] });
  const db = await getDb();
  const [cur] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id));
  if (!cur) return fail("Beleg nicht gefunden.");
  if (!cur.exportedAt) return fail("Dieser Beleg ist noch nicht exportiert. Die Datei bitte im Formular anhängen und speichern.");
  if (cur.fileId || (await lateReceiptMap([id])).has(id)) return fail("Zu diesem Beleg gibt es schon eine Datei.");
  const r = await storeReceipt(file, user.id);
  if ("state" in r) return r.state;
  const { stored } = r;
  await audit(user.id, "expense", id, "datei_nachgereicht", { fileId: stored.id, sha256: stored.sha256, name: stored.name });
  refresh();
  return done("Datei nachgereicht. Schickt sie bitte auch eurer Steuerberatung.");
}

export async function deleteExpense(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [cur] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id));
  if (!cur) return fail("Beleg nicht gefunden.");
  if (cur.exportedAt) return fail("Exportierte Belege sind festgeschrieben und werden nicht gelöscht.");
  try {
    await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
  } catch (e) {
    return fail(msg(e));
  }
  await audit(user.id, "expense", id, "geloescht", { supplier: cur.supplier, grossCents: cur.grossCents, fileId: cur.fileId });
  refresh();
  return done("Beleg gelöscht", { redirectTo: `/finanzen/ausgaben?monat=${cur.date.slice(0, 7)}` });
}

// ------------------------------------------------------------------
// DATEV-Einstellungen und Export abschließen
// ------------------------------------------------------------------
const konto = (label: string) => z.string({ error: `${label}: Konto fehlt` }).trim().regex(/^\d{3,9}$/, `${label}: nur Ziffern (3 bis 9)`);
const datevSchema = z.object({
  beraterNr: z.string().trim().regex(/^\d{0,7}$/, "Beraternummer: bis zu 7 Ziffern").optional(),
  mandantNr: z.string().trim().regex(/^\d{0,5}$/, "Mandantennummer: bis zu 5 Ziffern").optional(),
  sachkontenlaenge: z.coerce.number({ error: "Sachkontenlänge: Zahl von 4 bis 8" }).int("Sachkontenlänge: Zahl von 4 bis 8").min(4, "Sachkontenlänge: Zahl von 4 bis 8").max(8, "Sachkontenlänge: Zahl von 4 bis 8"),
  kontenrahmen: z.enum(["03", "04"], { error: "Kontenrahmen wählen" }),
  erloes19: konto("Erlöse 19 %"),
  erloes7: konto("Erlöse 7 %"),
  erloes0: konto("Erlöse 0 %"),
  erloesKlein: konto("Erlöse Kleinunternehmer"),
  debitorStart: z.coerce.number({ error: "Debitoren ab: Zahl eingeben" }).int("Debitoren ab: ganze Zahl").min(10000, "Debitoren ab: 10000 bis 699999").max(699999, "Debitoren ab: 10000 bis 699999"),
  kreditor: konto("Kreditor"),
  bank: konto("Bank"),
  buVorsteuer19: zOpt("Steuerschlüssel", 4),
  buVorsteuer7: zOpt("Steuerschlüssel", 4),
  buReverseCharge: zOpt("Steuerschlüssel", 4),
  ...Object.fromEntries(Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => [`aufwand_${k}`, konto(label)])),
});

export async function saveDatevSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = await assertOwner();
  if (denied) return denied;
  const p = parseForm(datevSchema, fd);
  if (!p.success) return p.state;
  const d = p.data as Record<string, string | number | undefined>;
  const aufwand = Object.fromEntries(Object.keys(EXPENSE_CATEGORIES).map((k) => [k, String(d[`aufwand_${k}`])]));
  const value = {
    ...DATEV_DEFAULTS,
    beraterNr: String(d.beraterNr ?? ""),
    mandantNr: String(d.mandantNr ?? ""),
    sachkontenlaenge: Number(d.sachkontenlaenge),
    kontenrahmen: d.kontenrahmen as "03" | "04",
    erloes19: String(d.erloes19),
    erloes7: String(d.erloes7),
    erloes0: String(d.erloes0),
    erloesKlein: String(d.erloesKlein),
    debitorStart: Number(d.debitorStart),
    kreditor: String(d.kreditor),
    bank: String(d.bank),
    buVorsteuer19: String(d.buVorsteuer19 ?? ""),
    buVorsteuer7: String(d.buVorsteuer7 ?? ""),
    buReverseCharge: String(d.buReverseCharge ?? ""),
    aufwand,
  };
  await setSetting("datev", value);
  await audit(user.id, "settings", null, "datev_gespeichert", { beraterNr: value.beraterNr ? "gesetzt" : "leer", mandantNr: value.mandantNr ? "gesetzt" : "leer" });
  refresh();
  return done("DATEV-Einstellungen gespeichert");
}

const exportSchema = z.object({
  from: z.string({ error: "Zeitraum fehlt" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Zeitraum prüfen"),
  to: z.string({ error: "Zeitraum fehlt" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Zeitraum prüfen"),
  label: zOpt("Bezeichnung", 60),
  confirm: z.string().optional(),
  ohneBeleg: z.string().optional(),
});

/** Erstellt das Export-Paket, legt es ab und schreibt die Belege des Zeitraums fest. */
export async function completeExport(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, denied } = await assertOwner();
  if (denied) return denied;
  const p = parseForm(exportSchema, fd);
  if (!p.success) return p.state;
  const { from, to, confirm, ohneBeleg } = p.data;
  const label = p.data.label ?? `${from} bis ${to}`;
  if (confirm !== "on") return fail("Bitte bestätigen, dass das Paket an eure Steuerberatung geht.", { confirm: ["Bitte bestätigen"] });
  if (from > to) return fail("Zeitraum prüfen.");
  if (to >= todayIso()) return fail("Bitte nur abgeschlossene Zeiträume festschreiben (Ende vor heute).");
  const db = await getDb();
  // Fehlende Belegdateien: nach dem Festschreiben lassen sie sich nur noch nachreichen, deshalb ausdrücklich bestätigen
  const open = await db
    .select({ id: schema.expenses.id, fileId: schema.expenses.fileId })
    .from(schema.expenses)
    .where(and(gte(schema.expenses.date, from), lte(schema.expenses.date, to), isNull(schema.expenses.exportedAt)));
  const late = await lateReceiptMap(open.map((e) => e.id));
  const missing = open.filter((e) => !e.fileId && !late.has(e.id)).length;
  if (missing && ohneBeleg !== "on")
    return fail(`${plural(missing, "Ausgabe hat", "Ausgaben haben")} noch keine Belegdatei. Bitte nachreichen oder bestätigen, dass ihr trotzdem festschreiben wollt.`, {
      ohneBeleg: ["Bitte bestätigen oder Belege ergänzen"],
    });
  const zip = await buildExportZip(from, to, label, user.name);
  const file = await putFile({ bucket: "rechnungen", name: `Export-${from}-bis-${to}.zip`, mime: "application/zip", data: zip.data, userId: user.id });
  const marked = await db
    .update(schema.expenses)
    .set({ exportedAt: new Date() })
    .where(and(gte(schema.expenses.date, from), lte(schema.expenses.date, to), isNull(schema.expenses.exportedAt)))
    .returning({ id: schema.expenses.id });
  await audit(user.id, "export", null, "datev_export", {
    from,
    to,
    label,
    fileId: file.id,
    sha256: file.sha256,
    invoices: zip.invoiceCount,
    expenses: zip.expenseCount,
    lockedExpenses: marked.map((m) => m.id),
    withoutReceipt: missing,
  });
  refresh();
  return done(`Export abgeschlossen: ${plural(marked.length, "Beleg", "Belege")} festgeschrieben`);
}
