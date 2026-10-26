// Daten für Video-Ideen (eigene und Vorschläge aus der nächtlichen Recherche) und für Videos vor dem Dreh.
import "server-only";
import { and, asc, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PRE_SHOOT_KEYS } from "@/lib/labels";

export type IdeaFilter = { status?: "vorschlag" | "offen" | "verworfen"; clientId?: number };

export async function listIdeas(f: IdeaFilter = {}) {
  await requireUser();
  const db = await getDb();
  const where: SQL[] = [];
  if (f.status) where.push(eq(schema.ideas.status, f.status));
  else where.push(ne(schema.ideas.status, "verworfen"));
  if (f.clientId) where.push(eq(schema.ideas.clientId, f.clientId));
  const rows = await db
    .select({
      i: schema.ideas,
      clientName: schema.clients.name,
      clientColor: schema.clients.color,
      videoStatus: schema.videos.status,
      videoMonth: schema.videos.month,
    })
    .from(schema.ideas)
    .leftJoin(schema.clients, eq(schema.ideas.clientId, schema.clients.id))
    .leftJoin(schema.videos, eq(schema.ideas.videoId, schema.videos.id))
    .where(and(...where))
    .orderBy(desc(schema.ideas.createdAt));
  const ids = rows.map((r) => r.i.id);
  const scripts = ids.length
    ? await db
        .select({ id: schema.scripts.id, ideaId: schema.scripts.ideaId, title: schema.scripts.title, status: schema.scripts.status })
        .from(schema.scripts)
        .where(inArray(schema.scripts.ideaId, ids))
        .orderBy(desc(schema.scripts.updatedAt))
    : [];
  return rows.map((r) => ({ ...r, scripts: scripts.filter((s) => s.ideaId === r.i.id) }));
}

export type IdeaRow = Awaited<ReturnType<typeof listIdeas>>[number];

export async function countIdeas() {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select({ status: schema.ideas.status, n: sql<number>`count(*)::int` })
    .from(schema.ideas)
    .groupBy(schema.ideas.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  return { vorschlag: by.vorschlag ?? 0, offen: by.offen ?? 0, verworfen: by.verworfen ?? 0 };
}

export async function getIdea(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ i: schema.ideas, client: schema.clients, video: schema.videos, author: schema.teamMembers.name })
    .from(schema.ideas)
    .leftJoin(schema.clients, eq(schema.ideas.clientId, schema.clients.id))
    .leftJoin(schema.videos, eq(schema.ideas.videoId, schema.videos.id))
    .leftJoin(schema.teamMembers, eq(schema.ideas.createdBy, schema.teamMembers.id))
    .where(eq(schema.ideas.id, id));
  if (!row) return null;
  const scripts = await db.select().from(schema.scripts).where(eq(schema.scripts.ideaId, id)).orderBy(desc(schema.scripts.updatedAt));
  return { ...row, scripts };
}

export async function getIdeaTitle(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db.select({ title: schema.ideas.title }).from(schema.ideas).where(eq(schema.ideas.id, id));
  return row?.title ?? null;
}

/** Videos vor dem Dreh (Idee, Skript, Dreh geplant), nach Monat und Drehtermin. */
export async function listPreShoot(f: { month?: string; clientId?: number } = {}) {
  await requireUser();
  const db = await getDb();
  const where: SQL[] = [inArray(schema.videos.status, [...PRE_SHOOT_KEYS])];
  if (f.month) where.push(eq(schema.videos.month, f.month));
  if (f.clientId) where.push(eq(schema.videos.clientId, f.clientId));
  const rows = await db
    .select({
      v: schema.videos,
      clientName: schema.clients.name,
      clientColor: schema.clients.color,
      scriptTitle: schema.scripts.title,
      scriptStatus: schema.scripts.status,
    })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .leftJoin(schema.scripts, eq(schema.videos.scriptId, schema.scripts.id))
    .where(and(...where))
    .orderBy(asc(schema.videos.month), asc(schema.videos.shootDate), asc(schema.videos.id));
  return rows;
}

/** Letzte Läufe der Trend-Recherche (neuester zuerst). */
export async function latestTrendRuns(limit = 5) {
  await requireUser();
  const db = await getDb();
  return db.select().from(schema.trendRuns).orderBy(desc(schema.trendRuns.startedAt)).limit(limit);
}

/** Läuft dieser Lauf noch? (Ohne Ende und jünger als 10 Minuten; ältere gelten als abgebrochen.) */
export const runIsActive = (r: { finishedAt: Date | null; startedAt: Date }) => !r.finishedAt && Date.now() - new Date(r.startedAt).getTime() < 10 * 60_000;
