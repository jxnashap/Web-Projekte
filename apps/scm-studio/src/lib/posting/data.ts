// Daten für den Posting-Kalender: geplante und gepostete Videos je Zeitraum, dazu die fertigen Videos ohne Termin.
import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { berlinDateTime } from "@/lib/time";

export type PostItem = {
  id: number;
  title: string;
  status: string;
  platform: string | null;
  /** geplanter Zeitpunkt (ISO) oder null, wenn nur das Online-Datum bekannt ist */
  at: string | null;
  /** Tag im Kalender (YYYY-MM-DD, Berlin) */
  day: string;
  url: string | null;
  caption: string;
  clientId: number;
  clientName: string;
  clientColor: string;
  format: string | null;
};

const dayOf = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(d);

/** Captions aus den verknüpften Skripten (Vorlage, solange keine eigene Posting-Caption gespeichert ist). */
async function scriptCaptions(videoIds: number[]) {
  if (videoIds.length === 0) return new Map<number, string>();
  const db = await getDb();
  const rows = await db
    .select({ videoId: schema.scripts.videoId, caption: schema.scripts.caption })
    .from(schema.scripts)
    .where(and(inArray(schema.scripts.videoId, videoIds), isNotNull(schema.scripts.caption)))
    .orderBy(desc(schema.scripts.updatedAt));
  const map = new Map<number, string>();
  for (const r of rows) if (r.videoId && r.caption && !map.has(r.videoId)) map.set(r.videoId, r.caption);
  return map;
}

const select = {
  v: schema.videos,
  clientName: schema.clients.name,
  clientColor: schema.clients.color,
};

/** Geplante Posts und schon gepostete Videos zwischen from (inkl.) und to (exkl.), YYYY-MM-DD. */
export async function getPosts(from: string, to: string, clientId?: number): Promise<PostItem[]> {
  await requireUser();
  const db = await getDb();
  const start = berlinDateTime(from);
  const end = berlinDateTime(to);
  const rows = await db
    .select(select)
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(
      and(
        clientId ? eq(schema.videos.clientId, clientId) : undefined,
        or(
          and(gte(schema.videos.scheduledAt, start), lt(schema.videos.scheduledAt, end)),
          and(isNull(schema.videos.scheduledAt), eq(schema.videos.status, "online"), gte(schema.videos.postDate, from), lt(schema.videos.postDate, to)),
        ),
      ),
    )
    .orderBy(asc(schema.videos.scheduledAt), asc(schema.videos.id));
  const captions = await scriptCaptions(rows.map((r) => r.v.id));
  return rows.map(({ v, clientName, clientColor }) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    platform: v.platform,
    at: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : null,
    day: v.scheduledAt ? dayOf(new Date(v.scheduledAt)) : v.postDate!,
    url: v.url,
    caption: v.postCaption ?? captions.get(v.id) ?? "",
    clientId: v.clientId,
    clientName,
    clientColor,
    format: v.format,
  }));
}

/** Fertige Videos ohne Posting-Termin: die Warteschlange „Bereit zum Posten“. */
export async function getReadyToPost(clientId?: number): Promise<PostItem[]> {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select(select)
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(and(eq(schema.videos.status, "fertig"), isNull(schema.videos.scheduledAt), clientId ? eq(schema.videos.clientId, clientId) : undefined))
    .orderBy(asc(schema.videos.month), asc(schema.videos.id));
  const captions = await scriptCaptions(rows.map((r) => r.v.id));
  return rows.map(({ v, clientName, clientColor }) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    platform: v.platform,
    at: null,
    day: "",
    url: v.url,
    caption: v.postCaption ?? captions.get(v.id) ?? "",
    clientId: v.clientId,
    clientName,
    clientColor,
    format: v.format,
  }));
}
