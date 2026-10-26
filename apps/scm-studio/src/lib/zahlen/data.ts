// Datenzugriff Zahlen (nur Server).
import "server-only";
import { and, asc, desc, eq, inArray, like, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { addDaysIso } from "@/lib/kalender/dates";
import { todayIso } from "@/lib/time";
import {
  buckets,
  change,
  cumulativeAt,
  dedupeSnapshots,
  growth,
  interactionsOf,
  latestUntil,
  type Snapshot,
} from "./compute";
import { seriesColorMap } from "./palette";

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

type VideoInfo = {
  id: number;
  title: string;
  format: string | null;
  postDate: string | null;
  url: string | null;
  status: string;
  clientId: number;
  clientName: string;
};

async function loadAll(clientId?: number) {
  const db = await getDb();
  const metricRows = await db
    .select({
      videoId: schema.videoMetrics.videoId,
      measuredOn: schema.videoMetrics.measuredOn,
      views: schema.videoMetrics.views,
      reach: schema.videoMetrics.reach,
      likes: schema.videoMetrics.likes,
      comments: schema.videoMetrics.comments,
      shares: schema.videoMetrics.shares,
      saves: schema.videoMetrics.saves,
      avgWatchSeconds: schema.videoMetrics.avgWatchSeconds,
      source: schema.videoMetrics.source,
    })
    .from(schema.videoMetrics)
    .innerJoin(schema.videos, eq(schema.videoMetrics.videoId, schema.videos.id))
    .where(clientId ? eq(schema.videos.clientId, clientId) : undefined)
    .orderBy(asc(schema.videoMetrics.measuredOn));
  const videoIds = [...new Set(metricRows.map((m) => m.videoId))];
  const videos: VideoInfo[] = videoIds.length
    ? await db
        .select({
          id: schema.videos.id,
          title: schema.videos.title,
          format: schema.videos.format,
          postDate: schema.videos.postDate,
          url: schema.videos.url,
          status: schema.videos.status,
          clientId: schema.videos.clientId,
          clientName: schema.clients.name,
        })
        .from(schema.videos)
        .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
        .where(inArray(schema.videos.id, videoIds))
    : [];
  const snaps = new Map<number, Snapshot[]>();
  for (const m of metricRows) {
    const list = snaps.get(m.videoId) ?? [];
    list.push(m);
    snaps.set(m.videoId, list);
  }
  for (const [k, v] of snaps) snaps.set(k, dedupeSnapshots(v));
  return { videos, snaps };
}

export type ClientRef = { id: number; name: string; color: string };

export async function getClientsForFilter(): Promise<ClientRef[]> {
  await requireUser();
  const db = await getDb();
  return db
    .select({ id: schema.clients.id, name: schema.clients.name, color: schema.clients.color })
    .from(schema.clients)
    .where(notInArray(schema.clients.status, ["beendet"]))
    .orderBy(asc(schema.clients.name));
}

async function allClientIds() {
  const db = await getDb();
  return (await db.select({ id: schema.clients.id }).from(schema.clients)).map((c) => c.id);
}

export type Kpis = { views: number; reach: number; interactions: number; rate: number | null; avgWatch: number | null; activeVideos: number };

export async function getZahlenOverview(opts: { days: Period; clientId?: number }) {
  await requireUser();
  const today = todayIso();
  const to = today;
  const from = addDaysIso(today, -(opts.days - 1));
  const prevTo = addDaysIso(from, -1);
  const prevFrom = addDaysIso(from, -opts.days);
  const [{ videos, snaps }, ids] = await Promise.all([loadAll(opts.clientId), allClientIds()]);
  const colors = seriesColorMap(ids);

  const perVideo = videos.map((v) => {
    const s = snaps.get(v.id) ?? [];
    const g = (a: string, b: string) => ({
      views: growth(s, v.postDate, a, b, "views"),
      reach: growth(s, v.postDate, a, b, "reach"),
      interactions: growth(s, v.postDate, a, b, "interactions"),
    });
    const latest = latestUntil(s, to);
    return { v, s, cur: g(from, to), prev: g(prevFrom, prevTo), latest };
  });

  const kpis = (key: "cur" | "prev"): Kpis => {
    const views = perVideo.reduce((a, p) => a + p[key].views, 0);
    const interactions = perVideo.reduce((a, p) => a + p[key].interactions, 0);
    const reach = perVideo.reduce((a, p) => a + p[key].reach, 0);
    let wSum = 0;
    let wTot = 0;
    for (const p of perVideo) {
      const w = p[key].views;
      const watch = p.latest?.avgWatchSeconds;
      if (w > 0 && watch) {
        wSum += w * watch;
        wTot += w;
      }
    }
    return {
      views: Math.round(views),
      reach: Math.round(reach),
      interactions: Math.round(interactions),
      rate: views > 0 ? interactions / views : null,
      avgWatch: wTot > 0 ? wSum / wTot : null,
      activeVideos: perVideo.filter((p) => p[key].views >= 1).length,
    };
  };
  const now = kpis("cur");
  const before = kpis("prev");

  // Verlauf je Kunde
  const axis = buckets(from, to);
  const clientsInData = [...new Map(videos.map((v) => [v.clientId, v.clientName])).entries()]
    .map(([id, name]) => ({ id, name, color: colors.get(id) ?? "#2a78d6" }))
    .sort((a, b) => a.id - b.id);
  const series = axis.list.map((b) => {
    const point: Record<string, number | string> = { key: b.key, from: b.from, to: b.to };
    for (const c of clientsInData) {
      let sum = 0;
      for (const p of perVideo) if (p.v.clientId === c.id) sum += growth(p.s, p.v.postDate, b.from, b.to, "views");
      point[`c${c.id}`] = Math.round(sum);
    }
    return point;
  });

  const top = perVideo
    .filter((p) => p.cur.views >= 1)
    .sort((a, b) => b.cur.views - a.cur.views)
    .slice(0, 8)
    .map((p) => ({
      id: p.v.id,
      title: p.v.title,
      format: p.v.format,
      clientId: p.v.clientId,
      clientName: p.v.clientName,
      color: colors.get(p.v.clientId) ?? "#2a78d6",
      postDate: p.v.postDate,
      url: p.v.url,
      periodViews: Math.round(p.cur.views),
      totalViews: p.latest?.views ?? 0,
      rate: p.latest && p.latest.views > 0 ? interactionsOf(p.latest) / p.latest.views : null,
      demo: p.v.title.startsWith("Demo-Reel"),
    }));

  const byClient = clientsInData
    .map((c) => {
      const mine = perVideo.filter((p) => p.v.clientId === c.id);
      const views = mine.reduce((a, p) => a + p.cur.views, 0);
      const inter = mine.reduce((a, p) => a + p.cur.interactions, 0);
      const prevViews = mine.reduce((a, p) => a + p.prev.views, 0);
      return {
        ...c,
        views: Math.round(views),
        interactions: Math.round(inter),
        rate: views > 0 ? inter / views : null,
        videos: mine.filter((p) => p.cur.views >= 1).length,
        change: change(views, prevViews),
      };
    })
    .sort((a, b) => b.views - a.views);

  // Formate: Videos mit Aufrufen im Zeitraum, Lebenszeit-Werte
  const formatMap = new Map<string, { n: number; views: number; inter: number }>();
  for (const p of perVideo) {
    if (p.cur.views < 1 || !p.latest) continue;
    const f = p.v.format ?? "Ohne Format";
    const cur = formatMap.get(f) ?? { n: 0, views: 0, inter: 0 };
    cur.n++;
    cur.views += p.latest.views;
    cur.inter += interactionsOf(p.latest);
    formatMap.set(f, cur);
  }
  const formats = [...formatMap.entries()]
    .map(([format, f]) => ({ format, videos: f.n, avgViews: Math.round(f.views / f.n), rate: f.views > 0 ? f.inter / f.views : null }))
    .sort((a, b) => b.avgViews - a.avgViews);

  return { from, to, days: opts.days, unit: axis.unit, now, before, clients: clientsInData, series, top, byClient, formats };
}

/** Online-Videos der letzten 45 Tage, deren letzte Messung älter als 7 Tage ist (oder fehlt). */
export async function getStaleVideos(clientId?: number) {
  await requireUser();
  const db = await getDb();
  const today = todayIso();
  const rows = await db
    .select({
      id: schema.videos.id,
      title: schema.videos.title,
      postDate: schema.videos.postDate,
      clientName: schema.clients.name,
      clientId: schema.videos.clientId,
    })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(and(eq(schema.videos.status, "online"), clientId ? eq(schema.videos.clientId, clientId) : undefined))
    .orderBy(desc(schema.videos.postDate));
  const recent = rows.filter((r) => r.postDate && r.postDate >= addDaysIso(today, -45));
  if (!recent.length) return [];
  const last = await db
    .selectDistinctOn([schema.videoMetrics.videoId], { videoId: schema.videoMetrics.videoId, measuredOn: schema.videoMetrics.measuredOn })
    .from(schema.videoMetrics)
    .where(inArray(schema.videoMetrics.videoId, recent.map((r) => r.id)))
    .orderBy(schema.videoMetrics.videoId, desc(schema.videoMetrics.measuredOn));
  const lastBy = new Map(last.map((l) => [l.videoId, l.measuredOn]));
  return recent
    .map((r) => ({ ...r, lastMeasured: lastBy.get(r.id) ?? null }))
    .filter((r) => !r.lastMeasured || r.lastMeasured < addDaysIso(today, -7));
}

/** Alle Videos mit letztem Stand (Reiter "Videos"). */
export async function getVideoTable(clientId?: number) {
  await requireUser();
  const { videos, snaps } = await loadAll(clientId);
  const ids = await allClientIds();
  const colors = seriesColorMap(ids);
  const today = todayIso();
  return videos
    .map((v) => {
      const s = snaps.get(v.id) ?? [];
      const latest = latestUntil(s, today);
      return {
        ...v,
        color: colors.get(v.clientId) ?? "#2a78d6",
        latest,
        points: s.length,
        rate: latest && latest.views > 0 ? interactionsOf(latest) / latest.views : null,
        week: Math.round(growth(s, v.postDate, addDaysIso(today, -6), today, "views")),
      };
    })
    .sort((a, b) => (b.postDate ?? "").localeCompare(a.postDate ?? ""));
}

export async function getVideoDetail(videoId: number) {
  await requireUser();
  const db = await getDb();
  const [video] = await db
    .select({
      v: schema.videos,
      clientName: schema.clients.name,
      clientColor: schema.clients.color,
    })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(eq(schema.videos.id, videoId));
  if (!video) return null;
  const rows = await db
    .select()
    .from(schema.videoMetrics)
    .where(eq(schema.videoMetrics.videoId, videoId))
    .orderBy(desc(schema.videoMetrics.measuredOn), asc(schema.videoMetrics.source));
  const snaps = dedupeSnapshots(rows);
  const today = todayIso();
  const latest = latestUntil(snaps, today);
  // Verlauf (kumuliert) täglich ab Posting bis heute bzw. höchstens 90 Tage
  const start = video.v.postDate ?? snaps[0]?.measuredOn ?? today;
  const end = today;
  const curve: { day: string; views: number; measured: number | null }[] = [];
  if (snaps.length) {
    const first = start < addDaysIso(end, -89) ? addDaysIso(end, -89) : start;
    const measured = new Map(snaps.map((s) => [s.measuredOn, s.views]));
    for (let d = first; d <= end; d = addDaysIso(d, 1)) {
      curve.push({ day: d, views: Math.round(cumulativeAt(snaps, video.v.postDate, d, "views")), measured: measured.get(d) ?? null });
    }
  }
  return { video: video.v, clientName: video.clientName, clientColor: video.clientColor, rows, latest, curve };
}

export type VideoOption = { id: number; title: string; clientName: string; postDate: string | null };

/** Auswahl für "Zahlen erfassen": veröffentlichte oder fertige Videos, neueste zuerst. */
export async function getVideoOptions(): Promise<VideoOption[]> {
  await requireUser();
  const db = await getDb();
  return db
    .select({ id: schema.videos.id, title: schema.videos.title, clientName: schema.clients.name, postDate: schema.videos.postDate })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(inArray(schema.videos.status, ["online", "fertig"]))
    .orderBy(asc(schema.clients.name), desc(schema.videos.postDate));
}

// ---------------- Konten (Instagram/TikTok) ----------------
export type ConnectLink = { token: string; clientId: number; platform: string; expiresAt: string; createdAt: string; createdBy: number | null };

export async function getAccountsOverview() {
  await requireUser();
  const db = await getDb();
  const [clients, accounts, links] = await Promise.all([
    db
      .select({ id: schema.clients.id, name: schema.clients.name, instagram: schema.clients.instagram, tiktok: schema.clients.tiktok, color: schema.clients.color, status: schema.clients.status })
      .from(schema.clients)
      .where(notInArray(schema.clients.status, ["beendet"]))
      .orderBy(asc(schema.clients.name)),
    db.select().from(schema.socialAccounts),
    db.select().from(schema.settings).where(like(schema.settings.key, "connect:%")),
  ]);
  const colors = seriesColorMap(await allClientIds());
  const now = new Date().toISOString();
  const openLinks = links
    .map((l) => ({ token: l.key.slice("connect:".length), ...(l.value as Omit<ConnectLink, "token">) }))
    .filter((l) => l.expiresAt > now);
  return clients.map((c) => ({
    ...c,
    color: colors.get(c.id) ?? c.color,
    accounts: accounts
      .filter((a) => a.clientId === c.id)
      .map((a) => ({ ...a, expiresSoon: Boolean(a.tokenExpiresAt && a.tokenExpiresAt.getTime() - Date.now() < 10 * 86_400_000) })),
    links: openLinks.filter((l) => l.clientId === c.id),
  }));
}
