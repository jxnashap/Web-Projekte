// Daten für den Bereich Produktion (Videos je Monat, Board, Detail).
import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getKontingente } from "@/lib/data/kontingent";

export type BoardFilter = { month: string; clientId?: number; onlyTest?: boolean };

export type BoardVideo = {
  id: number;
  title: string;
  format: string | null;
  status: string;
  month: string;
  isTest: boolean;
  shootDate: string | null;
  postDate: string | null;
  platform: string | null;
  url: string | null;
  clientId: number;
  clientName: string;
  clientColor: string;
  assignee: { id: number; initials: string; name: string } | null;
  hasScript: boolean;
};

export async function getBoard(f: BoardFilter) {
  await requireUser();
  const db = await getDb();
  const where = [eq(schema.videos.month, f.month)];
  if (f.clientId) where.push(eq(schema.videos.clientId, f.clientId));
  if (f.onlyTest) where.push(eq(schema.videos.isTest, true));

  const rows = await db
    .select({
      v: schema.videos,
      clientName: schema.clients.name,
      clientColor: schema.clients.color,
      tmId: schema.teamMembers.id,
      tmInitials: schema.teamMembers.initials,
      tmName: schema.teamMembers.name,
    })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .leftJoin(schema.teamMembers, eq(schema.videos.assignee, schema.teamMembers.id))
    .where(and(...where))
    .orderBy(asc(schema.videos.shootDate), asc(schema.videos.id));

  const ids = rows.map((r) => r.v.id);
  const withScript = ids.length
    ? new Set(
        (await db.select({ videoId: schema.scripts.videoId }).from(schema.scripts).where(inArray(schema.scripts.videoId, ids))).map((s) => s.videoId),
      )
    : new Set<number | null>();

  const videos: BoardVideo[] = rows.map(({ v, clientName, clientColor, tmId, tmInitials, tmName }) => ({
    id: v.id,
    title: v.title,
    format: v.format,
    status: v.status,
    month: v.month,
    isTest: v.isTest,
    shootDate: v.shootDate,
    postDate: v.postDate,
    platform: v.platform,
    url: v.url,
    clientId: v.clientId,
    clientName,
    clientColor,
    assignee: tmId ? { id: tmId, initials: tmInitials!, name: tmName! } : null,
    hasScript: Boolean(v.scriptId) || withScript.has(v.id),
  }));

  const kontingente = (await getKontingente(f.month)).filter((k) => !f.clientId || k.clientId === f.clientId);
  return { videos, kontingente };
}

/** Auswahllisten für Formulare: Kunden (ohne beendete), Team, Skripte. */
export async function getVideoFormOptions() {
  await requireUser();
  const db = await getDb();
  const clients = await db
    .select({ id: schema.clients.id, name: schema.clients.name, color: schema.clients.color, status: schema.clients.status })
    .from(schema.clients)
    .where(ne(schema.clients.status, "beendet"))
    .orderBy(asc(schema.clients.name));
  const team = await db
    .select({ id: schema.teamMembers.id, name: schema.teamMembers.name, initials: schema.teamMembers.initials })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.active, true))
    .orderBy(asc(schema.teamMembers.name));
  return { clients, team };
}

export async function getVideo(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ v: schema.videos, client: schema.clients })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(eq(schema.videos.id, id));
  if (!row) return null;

  const scripts = await db
    .select()
    .from(schema.scripts)
    .where(row.v.scriptId ? or(eq(schema.scripts.id, row.v.scriptId), eq(schema.scripts.videoId, id)) : eq(schema.scripts.videoId, id))
    .orderBy(desc(schema.scripts.updatedAt));
  const script = scripts.find((s) => s.id === row.v.scriptId) ?? scripts[0] ?? null;

  // Skripte desselben Kunden ohne Video (zum Verknüpfen)
  const linkable = await db
    .select({ id: schema.scripts.id, title: schema.scripts.title, status: schema.scripts.status })
    .from(schema.scripts)
    .where(and(eq(schema.scripts.clientId, row.v.clientId), or(eq(schema.scripts.videoId, id), isNull(schema.scripts.videoId))))
    .orderBy(desc(schema.scripts.updatedAt));

  const metrics = await db
    .select()
    .from(schema.videoMetrics)
    .where(eq(schema.videoMetrics.videoId, id))
    .orderBy(desc(schema.videoMetrics.measuredOn))
    .limit(10);

  return { video: row.v, client: row.client, script, linkable, metrics };
}

/** Nur der Titel (für den Seitentitel im Browser). */
export async function getVideoTitle(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db.select({ title: schema.videos.title }).from(schema.videos).where(eq(schema.videos.id, id));
  return row?.title ?? null;
}
