"use server";
// Server Actions Finanzen. Jede Action prüft die Anmeldung, validiert mit zod und protokolliert.
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { Party } from "@/db/schema";
import { done, fail, parseForm, type ActionState, zOptDate } from "@/lib/action";
import { assertUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseEuroToCents } from "@/lib/format";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/labels";
import { getCompany, setSetting } from "@/lib/settings";
import { MAX_UPLOAD_BYTES, putFile, RECEIPT_TYPES } from "@/lib/storage";
import { monthIso, monthRange, todayIso } from "@/lib/time";
import { addDaysIso, calcTotals, DATEV_DEFAULTS, fromNet, KIND_LABEL, partyFromClient, splitGross, TAX_RATES, UNIT_LABELS, type DocKind } from "./core";
import { getDatevSettings } from "./data";
import { buildExportZip } from "./export";
import { cancelInvoice, createReminder, FinanceError, finalizeInvoice, loadInvoice, offerToInvoice } from "./workflow";

const msg = (e: unknown) => (e instanceof FinanceError ? e.message : e instanceof Error && /GoBD/.test(e.message) ? e.message.replace(/^.*GoBD: /, "GoBD: ") : "Das hat nicht geklappt. Bitte erneut versuchen.");

// ------------------------------------------------------------------
// Entwurf anlegen
// ------------------------------------------------------------------
const createSchema = z.object({
  kind: z.enum(["rechnung", "angebot"]),
  clientId: z.coerce.number().int().positive().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  paket: z.string().optional(),
});

export async function createDraft(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(createSchema, fd);
  if (!p.success) return p.state;
  const { kind, clientId, month = monthIso(), paket } = p.data;
  const db = await getDb();
  const company = await getCompany();
  const [client] = clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, clientId)) : [];
  if (clientId && !client) return fail("Kunde nicht gefunden.");
  const range = monthRange(month);
  const withPackage = paket === "on" && client?.packageVideos && client.packagePriceCents;
  const { monthLabel } = await import("@/lib/format");
  const [inv] = await db
    .insert(schema.invoices)
    .values({
      kind,
      status: "entwurf",
      clientId: client?.id ?? null,
      recipient: client ? partyFromClient(client) : null,
      title: withPackage ? "Social-Media-Paket" : KIND_LABEL[kind],
      serviceFrom: kind === "rechnung" && withPackage ? range.from : null,
      serviceTo: kind === "rechnung" && withPackage ? range.to : null,
      buyerReference: client?.buyerReference ?? null,
      intro:
        kind === "angebot"
          ? "Vielen Dank für das nette Gespräch. Wie besprochen, hier unser Vorschlag:"
          : "Vielen Dank für die Zusammenarbeit. Wir berechnen euch folgende Leistungen:",
      outro: kind === "angebot" ? "Wir freuen uns auf eure Rückmeldung." : "Fragen zur Rechnung? Meldet euch einfach bei uns.",
    })
    .returning();
  if (withPackage) {
    await db.insert(schema.invoiceItems).values({
      invoiceId: inv.id,
      position: 1,
      description: `Social-Media-Paket ${client.packageVideos} Videos, ${monthLabel(month)}: Konzept, Dreh, Schnitt, Untertitel`,
      quantity: 1,
      unit: "Monat",
      unitPriceCents: client.packagePriceCents!,
      taxRate: company?.smallBusiness ? 0 : 19,
    });
  }
  await audit(user.id, "invoice", inv.id, "entwurf_angelegt", { kind, clientId: client?.id ?? null });
  return done(`${KIND_LABEL[kind]}sentwurf angelegt`, { redirectTo: `/finanzen/rechnungen/${inv.id}`, id: inv.id });
}

// ------------------------------------------------------------------
// Entwurf speichern (und optional festschreiben)
// ------------------------------------------------------------------
const itemSchema = z.object({
  description: z.string().trim().min(1, "Beschreibung fehlt").max(1000),
  quantity: z.coerce.number().refine((n) => Number.isFinite(n) && n !== 0, "Menge fehlt"),
  unit: z.string().refine((u) => UNIT_LABELS.includes(u), "Unbekannte Einheit"),
  price: z.string(),
  taxRate: z.coerce.number().refine((r) => (TAX_RATES as readonly number[]).includes(r), "Steuersatz 19, 7 oder 0 %"),
});

const draftSchema = z.object({
  id: z.coerce.number().int().positive(),
  intent: z.enum(["speichern", "festschreiben"]).default("speichern"),
  title: z.string().trim().min(1, "Titel fehlt").max(160),
  recipientName: z.string().trim().min(1, "Empfänger fehlt").max(200),
  recipientContact: z.string().max(200).optional(),
  recipientStreet: z.string().max(200).optional(),
  recipientZip: z.string().max(20).optional(),
  recipientCity: z.string().max(120).optional(),
  recipientVatId: z.string().max(40).optional(),
  recipientEmail: z.email("E-Mail-Adresse prüfen").optional(),
  clientId: z.coerce.number().int().positive().optional(),
  issueDate: zOptDate,
  serviceFrom: zOptDate,
  serviceTo: zOptDate,
  dueDays: z.coerce.number().int().min(0).max(120).optional(),
  validUntil: zOptDate,
  buyerReference: z.string().max(100).optional(),
  intro: z.string().max(2000).optional(),
  outro: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  items: z.string(),
});

export async function saveDraft(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(draftSchema, fd);
  if (!p.success) return p.state;
  const d = p.data;
  const db = await getDb();
  const loaded = await loadInvoice(db, d.id);
  if (!loaded) return fail("Beleg nicht gefunden.");
  if (loaded.invoice.finalizedAt) return fail("Der Beleg ist festgeschrieben und kann nicht mehr geändert werden.");

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(d.items);
  } catch {
    return fail("Positionen konnten nicht gelesen werden.");
  }
  const parsedItems = z.array(itemSchema).max(100).safeParse(rawItems);
  if (!parsedItems.success) return fail(`Positionen prüfen: ${parsedItems.error.issues[0]?.message ?? "ungültig"}`);
  let items: { description: string; quantity: number; unit: string; unitPriceCents: number; taxRate: number }[];
  try {
    items = parsedItems.data.map((it) => ({ description: it.description, quantity: it.quantity, unit: it.unit, unitPriceCents: parseEuroToCents(it.price), taxRate: it.taxRate }));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Betrag prüfen");
  }
  if (d.serviceFrom && d.serviceTo && d.serviceFrom > d.serviceTo) return fail("Leistungszeitraum: Beginn liegt nach dem Ende.", { serviceTo: ["Ende vor Beginn"] });

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
  return done("Entwurf gespeichert");
}

export async function deleteDraft(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const loaded = await loadInvoice(db, id);
  if (!loaded) return fail("Beleg nicht gefunden.");
  if (loaded.invoice.finalizedAt) return fail("Festgeschriebene Belege werden nicht gelöscht. Bitte stornieren.");
  if (loaded.invoice.number) return fail("Dieser Entwurf hat schon eine Nummer und muss festgeschrieben werden (lückenlose Nummernfolge).");
  await db.delete(schema.invoices).where(and(eq(schema.invoices.id, id), isNull(schema.invoices.finalizedAt)));
  await audit(user.id, "invoice", id, "entwurf_geloescht", { kind: loaded.invoice.kind });
  refresh();
  return done("Entwurf gelöscht", { redirectTo: `/finanzen/rechnungen?art=${loaded.invoice.kind}` });
}

// ------------------------------------------------------------------
// Nach dem Festschreiben: Versand, Zahlung, Storno, Angebot, Erinnerung
// ------------------------------------------------------------------
async function finalized(id: number) {
  const db = await getDb();
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
  if (!inv) throw new FinanceError("Beleg nicht gefunden.");
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

const paidSchema = z.object({ id: z.coerce.number().int().positive(), paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum wählen") });

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

const cancelSchema = z.object({ id: z.coerce.number().int().positive(), reason: z.string().trim().min(3, "Bitte kurz den Grund nennen").max(300) });

export async function cancel(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum wählen"),
  supplier: z.string().trim().min(1, "Lieferant fehlt").max(160),
  description: z.string().trim().min(1, "Beschreibung fehlt").max(300),
  category: z.string().refine((c) => c in EXPENSE_CATEGORIES, "Kategorie wählen"),
  amount: z.string({ error: "Betrag fehlt" }).min(1, "Betrag fehlt"),
  amountMode: z.enum(["brutto", "netto"]).default("brutto"),
  taxRate: z.coerce.number().refine((r) => (TAX_RATES as readonly number[]).includes(r), "Steuersatz wählen"),
  reverseCharge: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  paymentMethod: z.string().refine((m) => m in PAYMENT_METHODS, "Zahlungsart wählen").optional(),
  paidOn: zOptDate,
  supplierInvoiceNo: z.string().max(60).optional(),
  clientId: z.coerce.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

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

  const company = await getCompany();
  // § 13b: Rechnung ohne Umsatzsteuer, der Betrag ist netto; die Steuer schuldet ihr selbst (Vorschau rechnet sie aus)
  const amounts = d.reverseCharge
    ? { netCents: amountCents, taxCents: 0, grossCents: amountCents }
    : d.amountMode === "netto"
      ? fromNet(amountCents, d.taxRate)
      : splitGross(amountCents, d.taxRate);

  let fileId: number | undefined;
  let receiptName: string | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) return fail("Der Beleg ist größer als 10 MB.", { beleg: ["Datei zu groß"] });
    const mime = file.type || "application/octet-stream";
    if (!RECEIPT_TYPES.includes(mime)) return fail("Bitte ein Foto (JPG, PNG, WebP, HEIC), ein PDF oder eine XML-E-Rechnung hochladen.", { beleg: ["Dateityp nicht erlaubt"] });
    const stored = await putFile({ bucket: "belege", name: file.name || "beleg", mime, data: new Uint8Array(await file.arrayBuffer()), userId: user.id });
    fileId = stored.id;
    receiptName = file.name;
  }

  const db = await getDb();
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
  void company;
  try {
    if (d.id) {
      const [cur] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, d.id));
      if (!cur) return fail("Beleg nicht gefunden.");
      if (cur.exportedAt) return fail("Dieser Beleg wurde schon an die Buchhaltung exportiert und ist festgeschrieben.");
      await db.update(schema.expenses).set(values).where(eq(schema.expenses.id, d.id));
      await audit(user.id, "expense", d.id, "geaendert", { grossCents: amounts.grossCents, fileId: fileId ?? cur.fileId });
      refresh();
      return done("Beleg gespeichert");
    }
    const [row] = await db.insert(schema.expenses).values({ ...values, createdBy: user.id }).returning();
    await audit(user.id, "expense", row.id, "erfasst", { grossCents: amounts.grossCents, fileId: fileId ?? null });
    refresh();
    return done(fileId ? "Beleg mit Datei erfasst" : "Beleg erfasst (Datei könnt ihr später ergänzen)", { id: row.id });
  } catch (e) {
    return fail(msg(e));
  }
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
const konto = z.string().trim().regex(/^\d{3,9}$/, "Kontonummer: nur Ziffern");
const datevSchema = z.object({
  beraterNr: z.string().trim().regex(/^\d{0,7}$/, "Beraternummer: bis zu 7 Ziffern").optional(),
  mandantNr: z.string().trim().regex(/^\d{0,5}$/, "Mandantennummer: bis zu 5 Ziffern").optional(),
  sachkontenlaenge: z.coerce.number().int().min(4).max(8),
  kontenrahmen: z.enum(["03", "04"]),
  erloes19: konto,
  erloes7: konto,
  erloes0: konto,
  erloesKlein: konto,
  debitorStart: z.coerce.number().int().min(10000).max(699999),
  kreditor: konto,
  bank: konto,
  buVorsteuer19: z.string().trim().max(4).optional(),
  buVorsteuer7: z.string().trim().max(4).optional(),
  buReverseCharge: z.string().trim().max(4).optional(),
  ...Object.fromEntries(Object.keys(EXPENSE_CATEGORIES).map((k) => [`aufwand_${k}`, konto])),
});

export async function saveDatevSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
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
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().max(60),
  confirm: z.literal("on", { error: "Bitte bestätigen, dass das Paket an die Steuerberatung geht." }),
});

/** Erstellt das Export-Paket, legt es ab und schreibt die Belege des Zeitraums fest. */
export async function completeExport(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(exportSchema, fd);
  if (!p.success) return p.state;
  const { from, to, label } = p.data;
  if (from > to) return fail("Zeitraum prüfen.");
  if (to >= todayIso()) return fail("Bitte nur abgeschlossene Zeiträume festschreiben (Ende vor heute).");
  const db = await getDb();
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
  });
  refresh();
  return done(`Export abgeschlossen: ${marked.length} Belege festgeschrieben`);
}

/** Für Tests/Entwicklung nicht nötig, aber praktisch: verhindert unbenutzte Importe in Typen. */
export type { DocKind };
void inArray;
void getDatevSettings;
