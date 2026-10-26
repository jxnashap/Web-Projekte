// Datenzugriff für Dokumente (nur Server). Jede Funktion prüft die Anmeldung.
import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, ne, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Client, Doc } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getKontingente } from "@/lib/data/kontingent";
import { getCompany, getSetting, isDemo } from "@/lib/settings";
import { berlinDateTime, monthRange, shiftMonth, todayIso } from "@/lib/time";
import {
  consentController,
  controllerProblem,
  interactionsOf,
  isDocKind,
  LEGAL_TEMPLATE_VERSION,
  matchesStatus,
  STATUS_FILTER,
  type DrehplanData,
  type DrehplanSnapshot,
  type PartySnapshot,
  type ReportSnapshot,
  type ReportTotals,
  type ReportVideo,
} from "./schema";

export type LegalApproval = { approvedVersion: string; approvedBy: string; approvedAt: string } | null;

export const getLegalApproval = () => getSetting<LegalApproval>("legal", null);
export async function isLegalApproved() {
  const a = await getLegalApproval();
  return Boolean(a && a.approvedVersion === LEGAL_TEMPLATE_VERSION);
}

export type DocRow = Doc & { clientName: string | null; clientColor: string | null };

/**
 * Dokumente für die Liste. Kunde filtert die Datenbank, Status (nach STATUS_FILTER, je Art anders benannt)
 * und Suche filtern im Speicher. Die Art filtert die Seite selbst, damit die Zähler der Reiter zu den übrigen
 * Filtern passen.
 */
export async function listDocuments(f: { art?: string; kunde?: number; status?: string; q?: string }): Promise<DocRow[]> {
  await requireUser();
  const db = await getDb();
  const where: SQL[] = [];
  if (f.art && isDocKind(f.art)) where.push(eq(schema.documents.kind, f.art));
  if (f.kunde) where.push(eq(schema.documents.clientId, f.kunde));
  const rows = await db
    .select({ d: schema.documents, clientName: schema.clients.name, clientColor: schema.clients.color })
    .from(schema.documents)
    .leftJoin(schema.clients, eq(schema.documents.clientId, schema.clients.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.documents.updatedAt));
  const q = f.q?.trim().toLowerCase();
  return rows
    .map((r) => ({ ...r.d, clientName: r.clientName, clientColor: r.clientColor }))
    .filter((d) => !f.status || !(f.status in STATUS_FILTER) || matchesStatus(d, f.status))
    .filter((d) => !q || d.title.toLowerCase().includes(q) || (d.clientName ?? "").toLowerCase().includes(q) || (d.signerName ?? "").toLowerCase().includes(q));
}

export async function getDocument(id: number): Promise<{ doc: Doc; client: Client | null } | null> {
  await requireUser();
  if (!Number.isInteger(id) || id <= 0) return null;
  const db = await getDb();
  const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
  if (!doc) return null;
  const client = doc.clientId ? ((await db.select().from(schema.clients).where(eq(schema.clients.id, doc.clientId)))[0] ?? null) : null;
  return { doc, client };
}

export async function getClientOptions() {
  await requireUser();
  const db = await getDb();
  return db
    .select({ id: schema.clients.id, name: schema.clients.name, status: schema.clients.status, color: schema.clients.color })
    .from(schema.clients)
    .orderBy(asc(schema.clients.name));
}

export async function getClient(id: number | undefined | null) {
  if (!id) return null;
  await requireUser();
  const db = await getDb();
  const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, id));
  return c ?? null;
}

export async function getTeam() {
  await requireUser();
  const db = await getDb();
  return db.select().from(schema.teamMembers).orderBy(asc(schema.teamMembers.id));
}

/**
 * Für die Einwilligung: Was fehlt der verantwortlichen Stelle (Name, Anschrift, E-Mail)? Je Kunde und für SCM,
 * damit das Formular vor dem Unterschreiben darauf hinweisen kann.
 */
export async function getConsentIssues(): Promise<{ byClient: Record<number, string | null>; scm: string | null }> {
  await requireUser();
  const db = await getDb();
  const [rows, company] = await Promise.all([db.select().from(schema.clients), getCompany()]);
  return {
    byClient: Object.fromEntries(rows.map((c) => [c.id, controllerProblem(consentController("kunde", partyOf(c), company), true)])),
    scm: controllerProblem(consentController("scm", null, company), false),
  };
}

export function partyOf(c: Client): PartySnapshot {
  return {
    name: c.name,
    legalForm: c.legalForm,
    isMerchant: c.isMerchant,
    registerNumber: c.registerNumber,
    street: c.street,
    zip: c.zip,
    city: c.city ?? c.ort,
    vatId: c.vatId,
    signatoryName: c.signatoryName ?? c.contactName,
    signatoryRole: c.signatoryRole,
    email: c.email,
  };
}

/** Drehtermine (Kalender, Art "dreh") der letzten 30 und nächsten 60 Tage, optional je Kunde. */
export async function getShootEvents(clientId?: number | null) {
  await requireUser();
  const db = await getDb();
  const now = new Date();
  const from = berlinDateTime(todayIso(new Date(now.getTime() - 30 * 864e5)));
  const to = berlinDateTime(todayIso(new Date(now.getTime() + 60 * 864e5)));
  const where: SQL[] = [eq(schema.events.kind, "dreh"), gte(schema.events.startsAt, from), lte(schema.events.startsAt, to)];
  if (clientId) where.push(eq(schema.events.clientId, clientId));
  return db
    .select({ e: schema.events, clientName: schema.clients.name })
    .from(schema.events)
    .leftJoin(schema.clients, eq(schema.events.clientId, schema.clients.id))
    .where(and(...where))
    .orderBy(asc(schema.events.startsAt));
}

// ------------------------------------------------------------------
// Drehplan: Videos mit Drehdatum + Skripte + Team
// ------------------------------------------------------------------
export async function buildDrehplanSnapshot(clientId: number | null, data: Pick<DrehplanData, "drehtag" | "teamIds">): Promise<DrehplanSnapshot> {
  const db = await getDb();
  const vids = clientId
    ? await db
        .select()
        .from(schema.videos)
        .where(and(eq(schema.videos.clientId, clientId), eq(schema.videos.shootDate, data.drehtag)))
        .orderBy(asc(schema.videos.id))
    : [];
  const scriptIds = vids.map((v) => v.scriptId).filter((x): x is number => Boolean(x));
  const videoIds = vids.map((v) => v.id);
  const allScripts = vids.length
    ? await db
        .select()
        .from(schema.scripts)
        .where(scriptIds.length ? or(inArray(schema.scripts.id, scriptIds), inArray(schema.scripts.videoId, videoIds)) : inArray(schema.scripts.videoId, videoIds))
    : [];
  const team = data.teamIds.length ? await db.select().from(schema.teamMembers).where(inArray(schema.teamMembers.id, data.teamIds)) : [];
  return {
    videos: vids.map((v) => {
      const sc = allScripts.find((s) => s.id === v.scriptId) ?? allScripts.find((s) => s.videoId === v.id) ?? null;
      return {
        id: v.id,
        title: v.title,
        format: v.format,
        status: v.status,
        script: sc ? { title: sc.title, hook: sc.hook, beats: sc.beats ?? [] } : null,
      };
    }),
    team: team.map((t) => ({ id: t.id, name: t.name, initials: t.initials })),
  };
}

// ------------------------------------------------------------------
// Monatsbericht: Kennzahlen je Video (letzter Messwert bis Monatsende)
// ------------------------------------------------------------------
const emptyTotals = (): ReportTotals => ({ videos: 0, views: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, interactions: 0 });

async function videosWithMetrics(clientId: number, month: string): Promise<ReportVideo[]> {
  const db = await getDb();
  const { from, to } = monthRange(month);
  // gepostete Videos des Monats (nach Posting-Datum) und Videos des Kontingentmonats
  const vids = await db
    .select()
    .from(schema.videos)
    .where(and(eq(schema.videos.clientId, clientId), eq(schema.videos.isTest, false)))
    .orderBy(asc(schema.videos.postDate));
  const relevant = vids.filter((v) => (v.postDate && v.postDate >= from && v.postDate <= to) || v.month === month);
  if (!relevant.length) return [];
  const metrics = await db
    .select()
    .from(schema.videoMetrics)
    .where(and(inArray(schema.videoMetrics.videoId, relevant.map((v) => v.id)), lte(schema.videoMetrics.measuredOn, to)))
    .orderBy(desc(schema.videoMetrics.measuredOn));
  return relevant.map((v) => {
    const m = metrics.find((x) => x.videoId === v.id);
    return {
      id: v.id,
      title: v.title,
      format: v.format,
      status: v.status,
      postDate: v.postDate,
      url: v.url,
      views: m?.views ?? 0,
      reach: m?.reach ?? null,
      likes: m?.likes ?? 0,
      comments: m?.comments ?? 0,
      shares: m?.shares ?? null,
      saves: m?.saves ?? null,
      measuredOn: m?.measuredOn ?? null,
    };
  });
}

function totalsOf(videos: ReportVideo[], month: string): ReportTotals {
  const { from, to } = monthRange(month);
  const posted = videos.filter((v) => v.postDate && v.postDate >= from && v.postDate <= to);
  return posted.reduce((t, v) => {
    t.videos += 1;
    t.views += v.views;
    t.reach += v.reach ?? 0;
    t.likes += v.likes;
    t.comments += v.comments;
    t.shares += v.shares ?? 0;
    t.saves += v.saves ?? 0;
    t.interactions += interactionsOf(v);
    return t;
  }, emptyTotals());
}

export async function buildReportSnapshot(clientId: number, month: string): Promise<ReportSnapshot> {
  const { from, to } = monthRange(month);
  const prev = shiftMonth(month, -1);
  const [videos, prevVideos, kont, demo] = await Promise.all([
    videosWithMetrics(clientId, month),
    videosWithMetrics(clientId, prev),
    getKontingente(month),
    isDemo(),
  ]);
  const k = kont.find((x) => x.clientId === clientId);
  const stand = videos.map((v) => v.measuredOn).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    month,
    produced: videos.filter((v) => v.status === "fertig" || v.status === "online").length,
    posted: videos.filter((v) => v.postDate && v.postDate >= from && v.postDate <= to).length,
    videos: videos.sort((a, b) => b.views - a.views),
    totals: totalsOf(videos, month),
    prevTotals: totalsOf(prevVideos, prev),
    kontingent: k ? { soll: k.soll, fertig: k.fertig, geplant: k.geplant } : null,
    stand,
    demo,
  };
}

/** Letzte Einträge des Änderungsprotokolls; Anmeldungen nur auf Wunsch (sie füllen die Liste sonst schnell). */
export async function getRecentAudit(limit = 25, opts: { withLogins?: boolean } = {}) {
  await requireUser();
  const db = await getDb();
  return db
    .select({ a: schema.auditLog, userName: schema.teamMembers.name })
    .from(schema.auditLog)
    .leftJoin(schema.teamMembers, eq(schema.auditLog.userId, schema.teamMembers.id))
    .where(opts.withLogins ? undefined : ne(schema.auditLog.entity, "session"))
    .orderBy(desc(schema.auditLog.id))
    .limit(limit);
}
