// Datenzugriff für Anfragen und Kunden (nur Server). Jede Funktion prüft die Anmeldung.
import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getKontingente, type Kontingent } from "@/lib/data/kontingent";
import { LEAD_STAGES } from "@/lib/labels";
import { monthIso } from "@/lib/time";

const { leads, clients, videos, videoMetrics, events, invoices, documents, auditLog, teamMembers } = schema;

// ------------------------------------------------------------------
// Anfragen
// ------------------------------------------------------------------
export type LeadFilter = { score?: string; quelle?: string; q?: string };

export async function getLeads(f: LeadFilter = {}) {
  await requireUser();
  const db = await getDb();
  const where: SQL[] = [];
  if (f.score && ["A", "B", "C"].includes(f.score)) where.push(eq(leads.score, f.score));
  if (f.quelle) where.push(eq(leads.source, f.quelle));
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(leads.company, like), ilike(leads.name, like), ilike(leads.ort, like))!);
  }
  const rows = await db
    .select({ lead: leads, clientName: clients.name })
    .from(leads)
    .leftJoin(clients, eq(leads.clientId, clients.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`${leads.nextStepAt} asc nulls last`, asc(leads.score), desc(leads.createdAt));
  const order = new Map<string, number>(LEAD_STAGES.map((s, i) => [s.key, i]));
  return rows.sort((a, b) => (order.get(a.lead.stage) ?? 99) - (order.get(b.lead.stage) ?? 99));
}

export type LeadRow = Awaited<ReturnType<typeof getLeads>>[number];

/** Filter wie in getLeads, aber auf schon geladenen Zeilen (Kennzahlen kommen aus allen Anfragen). */
export function filterLeads(rows: LeadRow[], f: LeadFilter) {
  const q = f.q?.trim().toLocaleLowerCase("de");
  return rows.filter(
    ({ lead: l }) =>
      (!f.score || l.score === f.score) &&
      (!f.quelle || l.source === f.quelle) &&
      (!q || [l.company, l.name, l.ort].some((v) => v?.toLocaleLowerCase("de").includes(q))),
  );
}

export async function getLead(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ lead: leads, clientName: clients.name })
    .from(leads)
    .leftJoin(clients, eq(leads.clientId, clients.id))
    .where(eq(leads.id, id));
  return row ?? null;
}

export async function getLeadEvents(leadId: number) {
  await requireUser();
  const db = await getDb();
  return db.select().from(events).where(eq(events.leadId, leadId)).orderBy(asc(events.startsAt));
}

// ------------------------------------------------------------------
// Kunden
// ------------------------------------------------------------------
export const CLIENT_FILTERS = {
  aktuell: { label: "Aktuell", statuses: ["aktiv", "test", "pausiert"] },
  aktiv: { label: "Aktiv", statuses: ["aktiv"] },
  test: { label: "Testvideos", statuses: ["test"] },
  pausiert: { label: "Pausiert", statuses: ["pausiert"] },
  beendet: { label: "Beendet", statuses: ["beendet"] },
  alle: { label: "Alle", statuses: ["aktiv", "test", "pausiert", "beendet"] },
} as const;
export type ClientFilterKey = keyof typeof CLIENT_FILTERS;

export async function getClients(filter: ClientFilterKey = "aktuell", q?: string, now = new Date()) {
  await requireUser();
  const db = await getDb();
  const where: SQL[] = [inArray(clients.status, [...CLIENT_FILTERS[filter].statuses])];
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(clients.name, like), ilike(clients.contactName, like), ilike(clients.ort, like), ilike(clients.city, like), ilike(clients.instagram, like))!);
  }
  const rows = await db.select().from(clients).where(and(...where)).orderBy(asc(clients.name));
  const month = monthIso(now);
  const kont = new Map<number, Kontingent>((await getKontingente(month)).map((k) => [k.clientId, k]));
  const nextEvents = await db
    .selectDistinctOn([events.clientId], { clientId: events.clientId, startsAt: events.startsAt, title: events.title, kind: events.kind })
    .from(events)
    .where(gte(events.startsAt, now))
    .orderBy(events.clientId, asc(events.startsAt));
  const nextByClient = new Map(nextEvents.map((e) => [e.clientId, e]));
  const counts = await db.select({ status: clients.status, n: count() }).from(clients).groupBy(clients.status);
  // Kennzahlen immer über alle aktiven Kunden, unabhängig von Filter und Suche
  const active = await db
    .select({ id: clients.id, price: clients.packagePriceCents })
    .from(clients)
    .where(eq(clients.status, "aktiv"));
  const activeKont = active.map((a) => kont.get(a.id)).filter((k): k is Kontingent => Boolean(k));
  return {
    month,
    clients: rows.map((c) => ({ client: c, kontingent: kont.get(c.id) ?? null, nextEvent: nextByClient.get(c.id) ?? null })),
    counts: Object.fromEntries(counts.map((r) => [r.status, r.n])) as Record<string, number>,
    kpi: {
      active: active.length,
      mrr: active.reduce((s, a) => s + (a.price ?? 0), 0),
      soll: activeKont.reduce((s, k) => s + k.soll, 0),
      fertig: activeKont.reduce((s, k) => s + Math.min(k.fertig, k.soll), 0),
    },
  };
}

export async function getClient(id: number) {
  await requireUser();
  const db = await getDb();
  const [c] = await db.select().from(clients).where(eq(clients.id, id));
  return c ?? null;
}

/** Letzter Messwert je Video (Aufrufe, Likes) */
async function latestMetrics(videoIds: number[]) {
  if (!videoIds.length) return new Map<number, { views: number; likes: number; comments: number; measuredOn: string }>();
  const db = await getDb();
  const rows = await db
    .selectDistinctOn([videoMetrics.videoId], {
      videoId: videoMetrics.videoId,
      views: videoMetrics.views,
      likes: videoMetrics.likes,
      comments: videoMetrics.comments,
      measuredOn: videoMetrics.measuredOn,
    })
    .from(videoMetrics)
    .where(inArray(videoMetrics.videoId, videoIds))
    .orderBy(videoMetrics.videoId, desc(videoMetrics.measuredOn));
  return new Map(rows.map((r) => [r.videoId, r]));
}

export async function getClientCounts(id: number) {
  await requireUser();
  const db = await getDb();
  const [[v], [i], [d]] = await Promise.all([
    db.select({ n: count() }).from(videos).where(eq(videos.clientId, id)),
    db.select({ n: count() }).from(invoices).where(eq(invoices.clientId, id)),
    db.select({ n: count() }).from(documents).where(and(eq(documents.clientId, id), isNull(documents.deletedAt))),
  ]);
  return { videos: v?.n ?? 0, invoices: i?.n ?? 0, documents: d?.n ?? 0 };
}

export async function getClientOverview(id: number, now = new Date()) {
  await requireUser();
  const db = await getDb();
  const month = monthIso(now);
  const upcoming = await db
    .select()
    .from(events)
    .where(and(eq(events.clientId, id), gte(events.startsAt, now)))
    .orderBy(asc(events.startsAt))
    .limit(5);
  const recent = await db
    .select()
    .from(videos)
    .where(eq(videos.clientId, id))
    .orderBy(sql`${videos.postDate} desc nulls last`, desc(videos.updatedAt))
    .limit(6);
  const metrics = await latestMetrics(recent.map((v) => v.id));
  const kontingent = (await getKontingente(month)).find((k) => k.clientId === id) ?? null;
  const open = await db
    .select({ sum: sql<number>`coalesce(sum(${invoices.grossCents}),0)::int`, n: count() })
    .from(invoices)
    .where(and(eq(invoices.clientId, id), eq(invoices.kind, "rechnung"), eq(invoices.status, "offen")));
  const origin = await db.select().from(leads).where(eq(leads.clientId, id)).limit(1);
  return {
    month,
    upcoming,
    recent: recent.map((v) => ({ video: v, metric: metrics.get(v.id) ?? null })),
    kontingent,
    openSum: open[0]?.sum ?? 0,
    openCount: open[0]?.n ?? 0,
    origin: origin[0] ?? null,
  };
}

export async function getClientVideos(id: number) {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.clientId, id))
    .orderBy(desc(videos.month), sql`${videos.postDate} desc nulls last`, desc(videos.id));
  const metrics = await latestMetrics(rows.map((v) => v.id));
  return rows.map((v) => ({ video: v, metric: metrics.get(v.id) ?? null }));
}

export async function getClientInvoices(id: number) {
  await requireUser();
  const db = await getDb();
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, id))
    .orderBy(sql`${invoices.issueDate} desc nulls first`, desc(invoices.id));
}

export async function getClientDocuments(id: number) {
  await requireUser();
  const db = await getDb();
  return db.select().from(documents).where(and(eq(documents.clientId, id), isNull(documents.deletedAt))).orderBy(desc(documents.updatedAt));
}

export async function getClientHistory(id: number) {
  await requireUser();
  const db = await getDb();
  return db
    .select({ entry: auditLog, userName: teamMembers.name })
    .from(auditLog)
    .leftJoin(teamMembers, eq(auditLog.userId, teamMembers.id))
    .where(and(eq(auditLog.entity, "client"), eq(auditLog.entityId, id)))
    .orderBy(desc(auditLog.id))
    .limit(30);
}

/** Abhängige Datensätze: entscheidet, ob ein Kunde gelöscht werden darf. */
export async function clientDependencies(id: number) {
  const db = await getDb();
  const [[v], [i], [d], [e], [x], [s]] = await Promise.all([
    db.select({ n: count() }).from(videos).where(eq(videos.clientId, id)),
    db.select({ n: count() }).from(invoices).where(eq(invoices.clientId, id)),
    db.select({ n: count() }).from(documents).where(and(eq(documents.clientId, id), isNull(documents.deletedAt))),
    db.select({ n: count() }).from(events).where(eq(events.clientId, id)),
    db.select({ n: count() }).from(schema.expenses).where(eq(schema.expenses.clientId, id)),
    db.select({ n: count() }).from(schema.scripts).where(eq(schema.scripts.clientId, id)),
  ]);
  return (v?.n ?? 0) + (i?.n ?? 0) + (d?.n ?? 0) + (e?.n ?? 0) + (x?.n ?? 0) + (s?.n ?? 0);
}

/** Erste noch nicht vergebene Kundenfarbe (für neue Kunden). */
export async function suggestClientColor(palette: string[]) {
  await requireUser();
  const db = await getDb();
  const used = new Set((await db.select({ color: clients.color }).from(clients)).map((r) => r.color.toLowerCase()));
  return palette.find((c) => !used.has(c.toLowerCase())) ?? palette[0];
}
