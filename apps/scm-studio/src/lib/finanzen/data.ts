// Datenzugriff Finanzen (nur Server, nur angemeldet).
import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, notInArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Invoice } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getCompany, getSetting, isDemo } from "@/lib/settings";
import { getFileMeta, verifyFile } from "@/lib/storage";
import { monthIso, monthRange, shiftMonth, todayIso } from "@/lib/time";
import { calcTotals, DATEV_DEFAULTS, roundHalfUp, periodRange, type DatevSettings, type DocKind, type JournalExpense, type JournalInvoice, type PeriodKind } from "./core";
import { finalizeBlockers, loadInvoice } from "./workflow";

export async function getFinanceContext() {
  await requireUser();
  const [company, demo] = await Promise.all([getCompany(), isDemo()]);
  return { company, demo, smallBusiness: Boolean(company?.smallBusiness) };
}

export async function getClientOptions() {
  await requireUser();
  const db = await getDb();
  return db
    .select({
      id: schema.clients.id,
      name: schema.clients.name,
      status: schema.clients.status,
      packageVideos: schema.clients.packageVideos,
      packagePriceCents: schema.clients.packagePriceCents,
      contactName: schema.clients.contactName,
      street: schema.clients.street,
      zip: schema.clients.zip,
      city: schema.clients.city,
      ort: schema.clients.ort,
      vatId: schema.clients.vatId,
      email: schema.clients.email,
      buyerReference: schema.clients.buyerReference,
    })
    .from(schema.clients)
    .orderBy(asc(schema.clients.name));
}
export type ClientOption = Awaited<ReturnType<typeof getClientOptions>>[number];

/** Offene Anfragen (noch kein Kunde), damit Angebote direkt an eine Anfrage gehen können. */
export async function getLeadOptions() {
  await requireUser();
  const db = await getDb();
  return db
    .select({ id: schema.leads.id, company: schema.leads.company, name: schema.leads.name, stage: schema.leads.stage })
    .from(schema.leads)
    .where(and(isNull(schema.leads.clientId), notInArray(schema.leads.stage, ["gewonnen", "verloren"])))
    .orderBy(asc(schema.leads.company));
}

/** Kurzangaben für den Seitentitel (generateMetadata). */
export async function getInvoiceTitle(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ kind: schema.invoices.kind, number: schema.invoices.number, finalizedAt: schema.invoices.finalizedAt })
    .from(schema.invoices)
    .where(eq(schema.invoices.id, id));
  return row ?? null;
}

export async function getExpenseTitle(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db.select({ supplier: schema.expenses.supplier }).from(schema.expenses).where(eq(schema.expenses.id, id));
  return row?.supplier ?? null;
}

/**
 * Nachgereichte Belegdateien zu exportierten Ausgaben (Ausgabe → Datei). Exportierte Ausgaben sind unveränderlich,
 * die Verknüpfung steht deshalb im Änderungsprotokoll (Aktion "datei_nachgereicht").
 */
export async function lateReceiptMap(expenseIds?: number[]): Promise<Map<number, number>> {
  if (expenseIds && expenseIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select({ entityId: schema.auditLog.entityId, detail: schema.auditLog.detail })
    .from(schema.auditLog)
    .where(
      and(
        eq(schema.auditLog.entity, "expense"),
        eq(schema.auditLog.action, "datei_nachgereicht"),
        expenseIds ? inArray(schema.auditLog.entityId, expenseIds) : undefined,
      ),
    )
    .orderBy(asc(schema.auditLog.id));
  const map = new Map<number, number>();
  for (const r of rows) {
    const fileId = (r.detail as { fileId?: number } | null)?.fileId;
    if (r.entityId && fileId && !map.has(r.entityId)) map.set(r.entityId, fileId);
  }
  return map;
}

/** Effektiver Status für die Anzeige: offene Rechnungen nach Fälligkeit gelten als überfällig. */
export function displayStatus(inv: Pick<Invoice, "kind" | "status" | "dueDate">, today = todayIso()): string {
  if (inv.kind === "rechnung" && inv.status === "offen" && inv.dueDate && inv.dueDate < today) return "ueberfaellig";
  return inv.status;
}

/**
 * Liste je Art. Stornobelege erscheinen bei den Rechnungen im Filter "Storniert" (zusammen mit den stornierten Rechnungen).
 * Entwürfe zeigen ihre Summe live aus den Positionen (gespeicherte Summen gelten erst ab dem Festschreiben).
 */
export async function listInvoices(opts: { kind: "rechnung" | "angebot"; status?: string; q?: string }) {
  await requireUser();
  const db = await getDb();
  const kinds = opts.kind === "rechnung" ? ["rechnung", "storno"] : [opts.kind];
  const rows = await db
    .select({ inv: schema.invoices, clientName: schema.clients.name, clientColor: schema.clients.color })
    .from(schema.invoices)
    .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .where(inArray(schema.invoices.kind, kinds))
    .orderBy(desc(sql`coalesce(${schema.invoices.issueDate}, '9999-12-31')`), desc(schema.invoices.id));

  // Entwürfe: Summen aus den Positionen
  const draftIds = rows.filter((r) => !r.inv.finalizedAt).map((r) => r.inv.id);
  if (draftIds.length) {
    const [items, company] = await Promise.all([db.select().from(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, draftIds)), getCompany()]);
    for (const r of rows) {
      if (r.inv.finalizedAt) continue;
      const t = calcTotals(items.filter((i) => i.invoiceId === r.inv.id), company?.smallBusiness);
      r.inv = { ...r.inv, netCents: t.netCents, taxCents: t.taxCents, grossCents: t.grossCents };
    }
  }

  const today = todayIso();
  const all = rows.map((r) => ({ ...r, display: r.inv.kind === "storno" ? "storniert" : displayStatus(r.inv, today) }));
  const q = opts.q?.trim().toLowerCase();
  const searched = q
    ? all.filter((r) => [r.inv.number, r.inv.recipient?.name, r.clientName, r.inv.title].some((x) => x?.toLowerCase().includes(q)))
    : all;
  // Ohne Statusfilter: Stornobelege nicht doppelt neben der stornierten Rechnung zeigen
  const filtered = opts.status
    ? searched.filter((r) => r.display === opts.status || (opts.status === "offen" && r.display === "ueberfaellig"))
    : searched.filter((r) => r.inv.kind !== "storno");
  const counts: Record<string, number> = {};
  for (const r of searched) counts[r.display] = (counts[r.display] ?? 0) + 1;
  // "Offen" umfasst überfällige Rechnungen (wie der Filter)
  counts.offen = (counts.offen ?? 0) + (counts.ueberfaellig ?? 0);
  const finalized = filtered.filter((r) => r.inv.finalizedAt);
  return {
    rows: filtered,
    counts,
    total: all.filter((r) => r.inv.kind !== "storno").length,
    finalizedCount: finalized.length,
    draftCount: filtered.length - finalized.length,
    sumNet: finalized.reduce((s, r) => s + r.inv.netCents, 0),
    sumGross: finalized.reduce((s, r) => s + r.inv.grossCents, 0),
    sumOpen: filtered.filter((r) => r.inv.kind === "rechnung" && r.inv.status === "offen").reduce((s, r) => s + r.inv.grossCents, 0),
  };
}

export async function getInvoiceDetail(id: number) {
  await requireUser();
  const db = await getDb();
  const loaded = await loadInvoice(db, id);
  if (!loaded) return null;
  const { invoice, items } = loaded;
  const [client] = invoice.clientId ? await db.select().from(schema.clients).where(eq(schema.clients.id, invoice.clientId)) : [];
  const refIds = [invoice.cancelsId, invoice.fromOfferId].filter((x): x is number => Boolean(x));
  const refs = refIds.length ? await db.select().from(schema.invoices).where(inArray(schema.invoices.id, refIds)) : [];
  const children = await db
    .select()
    .from(schema.invoices)
    .where(sql`${schema.invoices.cancelsId} = ${id} or ${schema.invoices.fromOfferId} = ${id}`);
  const history = await db
    .select({ a: schema.auditLog, user: schema.teamMembers.name })
    .from(schema.auditLog)
    .leftJoin(schema.teamMembers, eq(schema.auditLog.userId, schema.teamMembers.id))
    .where(and(eq(schema.auditLog.entity, "invoice"), eq(schema.auditLog.entityId, id)))
    .orderBy(desc(schema.auditLog.at));
  const company = await getCompany();
  const file = invoice.fileId ? await getFileMeta(invoice.fileId) : null;
  const intact = invoice.fileId ? await verifyFile(invoice.fileId).catch(() => false) : null;
  return {
    invoice,
    items,
    client: client ?? null,
    cancels: refs.find((r) => r.id === invoice.cancelsId) ?? null,
    fromOffer: refs.find((r) => r.id === invoice.fromOfferId) ?? null,
    stornos: children.filter((c) => c.cancelsId === id),
    converted: children.filter((c) => c.fromOfferId === id),
    reminders: history.filter((h) => h.a.action === "zahlungserinnerung").map((h) => ({ at: h.a.at, ...(h.a.detail as { level: number; fileId: number }) })),
    history,
    company,
    file,
    intact,
    blockers: invoice.finalizedAt ? [] : finalizeBlockers(invoice, items, company),
    display: displayStatus(invoice),
  };
}

// ------------------------------------------------------------------
// Überblick
// ------------------------------------------------------------------
type VatBox = {
  output: { rate: number; netCents: number; taxCents: number }[];
  outputTax: number;
  inputTax: number;
  rcNet: number;
  rcTax: number;
  rcDeductible: number;
  payable: number;
};

function vatFor(invoices: Pick<Invoice, "netCents" | "taxCents" | "id">[], itemsByInvoice: Map<number, { quantity: number; unitPriceCents: number; taxRate: number }[]>, expenses: { taxCents: number; netCents: number; taxRate: number; reverseCharge: boolean }[], small: boolean): VatBox {
  const groups = new Map<number, { netCents: number; taxCents: number }>();
  for (const inv of invoices) {
    for (const g of calcTotals(itemsByInvoice.get(inv.id) ?? [], small).groups) {
      const cur = groups.get(g.rate) ?? { netCents: 0, taxCents: 0 };
      groups.set(g.rate, { netCents: cur.netCents + g.netCents, taxCents: cur.taxCents + g.taxCents });
    }
  }
  const output = [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([rate, v]) => ({ rate, ...v }));
  const outputTax = output.reduce((s, g) => s + g.taxCents, 0);
  const inputTax = small ? 0 : expenses.filter((e) => !e.reverseCharge).reduce((s, e) => s + e.taxCents, 0);
  const rc = expenses.filter((e) => e.reverseCharge);
  const rcNet = rc.reduce((s, e) => s + e.netCents, 0);
  const rcTax = rc.reduce((s, e) => s + roundHalfUp((e.netCents * e.taxRate) / 100), 0);
  const rcDeductible = small ? 0 : rcTax;
  return { output, outputTax, inputTax, rcNet, rcTax, rcDeductible, payable: outputTax + rcTax - inputTax - rcDeductible };
}

export async function getOverview(kind: PeriodKind, ym: string) {
  const { company, smallBusiness } = await getFinanceContext();
  const db = await getDb();
  const p = periodRange(kind, ym);
  const today = todayIso();

  const finalizedIn = (from: string, to: string) =>
    and(inArray(schema.invoices.kind, ["rechnung", "storno"]), isNotNull(schema.invoices.finalizedAt), gte(schema.invoices.issueDate, from), lte(schema.invoices.issueDate, to));

  // Verlauf: 12 Monate bis zum Ende des Zeitraums
  const endMonth = p.months[p.months.length - 1];
  const chartMonths = Array.from({ length: 12 }, (_, i) => shiftMonth(endMonth, i - 11));
  const chartFrom = `${chartMonths[0]}-01`;
  const [invRows, expRows] = await Promise.all([
    db.select().from(schema.invoices).where(finalizedIn(chartFrom < p.from ? chartFrom : p.from, p.to)),
    db
      .select()
      .from(schema.expenses)
      .where(and(gte(schema.expenses.date, chartFrom < p.from ? chartFrom : p.from), lte(schema.expenses.date, p.to))),
  ]);
  const inPeriod = <T extends { d: string | null }>(x: T) => Boolean(x.d && x.d >= p.from && x.d <= p.to);
  const invP = invRows.filter((i) => inPeriod({ d: i.issueDate }));
  const expP = expRows.filter((e) => inPeriod({ d: e.date }));
  const items = invP.length
    ? await db.select().from(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, invP.map((i) => i.id)))
    : [];
  const byInv = new Map<number, typeof items>();
  for (const it of items) byInv.set(it.invoiceId, [...(byInv.get(it.invoiceId) ?? []), it]);

  const paidIn = await db
    .select({ sum: sql<number>`coalesce(sum(${schema.invoices.grossCents}),0)::int`, n: sql<number>`count(*)::int` })
    .from(schema.invoices)
    .where(and(eq(schema.invoices.kind, "rechnung"), isNotNull(schema.invoices.paidAt), gte(schema.invoices.paidAt, p.from), lte(schema.invoices.paidAt, p.to)));

  const open = await db
    .select({ inv: schema.invoices, clientName: schema.clients.name })
    .from(schema.invoices)
    .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .where(and(eq(schema.invoices.kind, "rechnung"), eq(schema.invoices.status, "offen")))
    .orderBy(asc(schema.invoices.dueDate));

  const drafts = await db
    .select({ kind: schema.invoices.kind, n: sql<number>`count(*)::int` })
    .from(schema.invoices)
    .where(and(eq(schema.invoices.status, "entwurf"), inArray(schema.invoices.kind, ["rechnung", "angebot"])))
    .groupBy(schema.invoices.kind);

  // Monatsexport: ist der Vormonat schon abgeschlossen? (Protokoll "datev_export", Zeitraum deckt den Monat ab)
  const exportMonth = shiftMonth(monthIso(), -1);
  const em = monthRange(exportMonth);
  const exportsDone = await db
    .select({ detail: schema.auditLog.detail })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.entity, "export"), eq(schema.auditLog.action, "datev_export")));
  const exported = exportsDone.some((e) => {
    const d = e.detail as { from?: string; to?: string } | null;
    return Boolean(d?.from && d?.to && d.from <= em.from && d.to >= em.to);
  });
  const late = await lateReceiptMap(expP.filter((e) => !e.fileId).map((e) => e.id));

  const incomeNet = invP.reduce((s, i) => s + i.netCents, 0);
  const expenseNet = expP.reduce((s, e) => s + (smallBusiness ? e.grossCents : e.netCents), 0);

  const chart = chartMonths.map((m) => ({
    month: m,
    einnahmen: invRows.filter((i) => i.issueDate?.startsWith(m)).reduce((s, i) => s + i.netCents, 0) / 100,
    ausgaben: expRows.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + (smallBusiness ? e.grossCents : e.netCents), 0) / 100,
  }));

  return {
    company,
    smallBusiness,
    period: p,
    incomeNet,
    incomeCount: invP.length,
    expenseNet,
    expenseCount: expP.length,
    profit: incomeNet - expenseNet,
    paidIn: paidIn[0] ?? { sum: 0, n: 0 },
    vat: vatFor(invP, byInv, expP, smallBusiness),
    open: open.map((o) => ({ ...o, overdue: Boolean(o.inv.dueDate && o.inv.dueDate < today) })),
    drafts: { rechnung: drafts.find((d) => d.kind === "rechnung")?.n ?? 0, angebot: drafts.find((d) => d.kind === "angebot")?.n ?? 0 },
    monthExport: { month: exportMonth, done: exported },
    missingReceipts: expP.filter((e) => !e.fileId && !late.has(e.id)).length,
    chart,
    today,
  };
}

// ------------------------------------------------------------------
// Ausgaben
// ------------------------------------------------------------------
export async function listExpenses(month: string, category?: string) {
  await requireUser();
  const db = await getDb();
  const { from, to } = monthRange(month);
  const rows = await db
    .select({ e: schema.expenses, clientName: schema.clients.name })
    .from(schema.expenses)
    .leftJoin(schema.clients, eq(schema.expenses.clientId, schema.clients.id))
    .where(and(gte(schema.expenses.date, from), lte(schema.expenses.date, to)))
    .orderBy(desc(schema.expenses.date), desc(schema.expenses.id));
  const late = await lateReceiptMap(rows.filter((r) => !r.e.fileId && r.e.exportedAt).map((r) => r.e.id));
  const all = rows.map((r) => ({ ...r, hasFile: Boolean(r.e.fileId || late.has(r.e.id)) }));
  const filtered = category ? all.filter((r) => r.e.category === category) : all;
  const sum = (f: (e: (typeof rows)[number]["e"]) => number) => filtered.reduce((s, r) => s + f(r.e), 0);
  return {
    rows: filtered,
    categories: [...new Set(rows.map((r) => r.e.category))],
    netCents: sum((e) => e.netCents),
    taxCents: sum((e) => e.taxCents),
    grossCents: sum((e) => e.grossCents),
    rcNetCents: sum((e) => (e.reverseCharge ? e.netCents : 0)),
    withoutReceipt: filtered.filter((r) => !r.hasFile).length,
  };
}

export async function getExpense(id: number) {
  await requireUser();
  const db = await getDb();
  const [e] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id));
  if (!e) return null;
  const lateId = !e.fileId && e.exportedAt ? (await lateReceiptMap([e.id])).get(e.id) : undefined;
  const fileId = e.fileId ?? lateId;
  const file = fileId ? await getFileMeta(fileId) : null;
  return { expense: e, file, late: Boolean(lateId) };
}

// ------------------------------------------------------------------
// Export
// ------------------------------------------------------------------
export async function getDatevSettings(): Promise<DatevSettings> {
  const saved = await getSetting<Partial<DatevSettings> | null>("datev", null);
  return { ...DATEV_DEFAULTS, ...(saved ?? {}), aufwand: { ...DATEV_DEFAULTS.aufwand, ...(saved?.aufwand ?? {}) } };
}

/** Alle exportierbaren Buchungen eines Zeitraums (festgeschriebene Rechnungen/Stornos und Ausgaben). */
export async function getJournal(from: string, to: string) {
  await requireUser();
  const db = await getDb();
  const company = await getCompany();
  const small = Boolean(company?.smallBusiness);
  const invs = await db
    .select({ inv: schema.invoices, clientName: schema.clients.name })
    .from(schema.invoices)
    .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .where(
      and(inArray(schema.invoices.kind, ["rechnung", "storno"]), isNotNull(schema.invoices.finalizedAt), gte(schema.invoices.issueDate, from), lte(schema.invoices.issueDate, to)),
    )
    .orderBy(asc(schema.invoices.issueDate), asc(schema.invoices.number));
  const items = invs.length ? await db.select().from(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, invs.map((r) => r.inv.id))) : [];
  const exps = await db
    .select()
    .from(schema.expenses)
    .where(and(gte(schema.expenses.date, from), lte(schema.expenses.date, to)))
    .orderBy(asc(schema.expenses.date), asc(schema.expenses.id));
  const journalInvoices: (JournalInvoice & { fileId: number | null })[] = invs.map(({ inv, clientName }) => ({
    id: inv.id,
    kind: inv.kind as DocKind,
    number: inv.number!,
    issueDate: inv.issueDate!,
    clientId: inv.clientId,
    partner: inv.recipient?.name ?? clientName ?? "",
    title: inv.title,
    netCents: inv.netCents,
    taxCents: inv.taxCents,
    grossCents: inv.grossCents,
    groups: calcTotals(items.filter((i) => i.invoiceId === inv.id), small).groups,
    status: inv.status,
    paidAt: inv.paidAt,
    fileId: inv.fileId,
  }));
  const late = await lateReceiptMap(exps.filter((e) => !e.fileId).map((e) => e.id));
  const journalExpenses: (JournalExpense & { fileId: number | null; exportedAt: Date | null })[] = exps.map((e) => ({
    id: e.id,
    date: e.date,
    supplier: e.supplier,
    description: e.description,
    category: e.category,
    netCents: e.netCents,
    taxRate: e.taxRate,
    taxCents: e.taxCents,
    grossCents: e.grossCents,
    reverseCharge: e.reverseCharge,
    paidOn: e.paidOn,
    supplierInvoiceNo: e.supplierInvoiceNo,
    hasReceipt: Boolean(e.fileId ?? late.get(e.id)),
    fileId: e.fileId ?? late.get(e.id) ?? null,
    exportedAt: e.exportedAt,
  }));
  return { invoices: journalInvoices, expenses: journalExpenses, smallBusiness: small, company };
}

export async function getExportOverview(from: string, to: string) {
  const journal = await getJournal(from, to);
  const db = await getDb();
  const drafts = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.invoices)
    .where(and(eq(schema.invoices.status, "entwurf"), eq(schema.invoices.kind, "rechnung")));
  const exports = await db
    .select({ a: schema.auditLog, user: schema.teamMembers.name })
    .from(schema.auditLog)
    .leftJoin(schema.teamMembers, eq(schema.auditLog.userId, schema.teamMembers.id))
    .where(and(eq(schema.auditLog.entity, "export"), eq(schema.auditLog.action, "datev_export")))
    .orderBy(desc(schema.auditLog.at))
    .limit(12);
  return { ...journal, settings: await getDatevSettings(), draftInvoices: drafts[0]?.n ?? 0, exports };
}

/** Standard-Zeitraum für den Export: Vormonat. */
export const defaultExportMonth = () => shiftMonth(monthIso(), -1);
