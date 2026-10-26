// Seed-Teil Kalender und Zahlen: Messreihen der letzten 60 Tage (DEMO-WERTE) für die Diagramme,
// Vormonatsvideos mit Zahlen, vergangene Termine, Team an Terminen, Kalender-Abo-Token.
// Die echten Likes/Kommentare der 6 Reels aus dem Grund-Seed bleiben unverändert.
import { randomBytes } from "node:crypto";
import { addDays } from "date-fns";
import { eq } from "drizzle-orm";
import * as s from "../../src/db/schema";
import { berlinDateTime, monthIso, todayIso } from "../../src/lib/time";
import type { SeedPart } from "../seed";

// kleiner deterministischer Zufall (gleiche Demo-Daten bei jedem Seed)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const part: SeedPart = async (db, ctx) => {
  const rnd = mulberry32(4242);
  const between = (a: number, b: number) => a + (b - a) * rnd();
  const { today, team, clients } = ctx;
  const d = (x: Date) => todayIso(x);
  const ago = (n: number) => addDays(today, -n);

  // ---------------- Demo-Reels der letzten 60 Tage ----------------
  type Plan = { client: s.Client; format: string; daysAgo: number; total: number };
  const plans: Plan[] = [
    { client: clients.jhkp, format: "Sketch", daysAgo: 56, total: 5200 },
    { client: clients.bs, format: "Ortsanalyse", daysAgo: 53, total: 3100 },
    { client: clients.steak, format: "Tisch-Sketch", daysAgo: 50, total: 4300 },
    { client: clients.kletter, format: "Angebot mit Frist", daysAgo: 47, total: 2700 },
    { client: clients.jhkp, format: "POV-Sketch", daysAgo: 44, total: 7400 },
    { client: clients.bs, format: "Entweder oder", daysAgo: 37, total: 2400 },
    { client: clients.maler, format: "Kunden-Sketch", daysAgo: 35, total: 9800 },
    { client: clients.kletter, format: "Event", daysAgo: 31, total: 2100 },
    { client: clients.steak, format: "Angebot", daysAgo: 29, total: 2900 },
    { client: clients.jhkp, format: "Speed-Format", daysAgo: 26, total: 4100 },
    { client: clients.maler, format: "Recruiting", daysAgo: 22, total: 3600 },
    { client: clients.bs, format: "Einblick", daysAgo: 17, total: 1900 },
    { client: clients.jhkp, format: "Sketch", daysAgo: 14, total: 6100 },
    { client: clients.steak, format: "Tisch-Sketch", daysAgo: 11, total: 5000 },
  ];
  const counter = new Map<string, number>();
  const demoVideos: { video: s.Video; total: number }[] = [];
  for (const p of plans) {
    const post = ago(p.daysAgo);
    if (p.client.startDate && d(post) < p.client.startDate) continue;
    const n = (counter.get(p.client.name + p.format) ?? 0) + 1;
    counter.set(p.client.name + p.format, n);
    const [video] = await db
      .insert(s.videos)
      .values({
        clientId: p.client.id,
        title: `Demo-Reel ${p.format}${n > 1 ? ` ${n}` : ""}`,
        format: p.format,
        status: "online",
        month: monthIso(post),
        postDate: d(post),
        shootDate: d(addDays(post, -Math.round(between(3, 8)))),
        platform: "instagram",
        assignee: team[Math.floor(rnd() * 2)].id,
        notes: "Demo-Video für die Diagramme (Beispieldaten, kein echtes Reel).",
      })
      .returning();
    demoVideos.push({ video, total: p.total });
  }

  // Vormonatsvideos aus dem Grund-Seed bekommen ein Posting-Datum und Zahlen
  const prev = ctx.videos.filter((v) => v.month === ctx.prevMonth && v.status === "online" && !v.postDate);
  for (const [i, v] of prev.entries()) {
    const post = ago(40 - i * 7);
    const [updated] = await db
      .update(s.videos)
      .set({ postDate: d(post), notes: "Posting-Datum und Zahlen sind Beispielwerte." })
      .where(eq(s.videos.id, v.id))
      .returning();
    demoVideos.push({ video: updated, total: i === 0 ? 3400 : 4800 });
  }

  // Messpunkte: typische Sättigungskurve, Messung nach 1, 2, 3, 5, 7, 10, 14, 21, 28, 35, 45 und 60 Tagen
  const checkpoints = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35, 45, 60];
  let points = 0;
  for (const { video, total } of demoVideos) {
    const post = new Date(`${video.postDate}T12:00:00Z`);
    const k = between(2.5, 5.5);
    const likeRate = between(0.012, 0.03);
    const commentRate = between(0.0015, 0.005);
    const shareRate = between(0.002, 0.009);
    const saveRate = between(0.002, 0.007);
    const reachRate = between(0.72, 0.86);
    const watch = Math.round(between(6, 12) * 10) / 10;
    const rows: (typeof s.videoMetrics.$inferInsert)[] = [];
    for (const t of checkpoints) {
      const day = addDays(post, t);
      if (d(day) > d(today)) break;
      const share = 1 - Math.exp(-t / k);
      const views = Math.round(total * share);
      const likes = Math.round(views * likeRate);
      const comments = Math.round(views * commentRate);
      const shares = Math.round(views * shareRate);
      const saves = Math.round(views * saveRate);
      rows.push({
        videoId: video.id,
        measuredOn: d(day),
        views,
        reach: Math.round(views * reachRate),
        likes,
        comments,
        shares,
        saves,
        totalInteractions: likes + comments + shares + saves,
        avgWatchSeconds: watch,
        totalWatchSeconds: Math.round(views * watch * 0.92),
        source: "manuell",
      });
    }
    if (rows.length) {
      await db.insert(s.videoMetrics).values(rows);
      points += rows.length;
    }
  }

  // ---------------- Kalender ----------------
  const at = (day: Date, hhmm: string) => berlinDateTime(d(day), hhmm);
  const [oe, yr, am] = team;
  // Team an bestehende Termine
  const existing = await db.select().from(s.events);
  for (const e of existing) {
    const teamIds = e.kind === "dreh" ? [oe.id, yr.id] : e.kind === "gespraech" ? [am.id] : e.kind === "deadline" ? [oe.id, yr.id, am.id] : [];
    await db.update(s.events).set({ teamIds }).where(eq(s.events.id, e.id));
  }
  const pastShoots = [
    { client: clients.maler, daysAgo: 9, from: "08:00", to: "11:30", location: "Baustelle Kiel" },
    { client: clients.jhkp, daysAgo: 8, from: "10:30", to: "13:00", location: "Kiel" },
    { client: clients.steak, daysAgo: 8, from: "15:00", to: "17:00", location: "Kiel, Kirchhofallee" },
    { client: clients.bs, daysAgo: 12, from: "09:00", to: "12:00", location: "Kiel und Umgebung" },
    { client: clients.kletter, daysAgo: 13, from: "10:00", to: "14:00", location: "Lübeck-Travemünde" },
  ];
  const newEvents: (typeof s.events.$inferInsert)[] = pastShoots.map((p) => ({
    title: `Dreh ${p.client.name}`,
    kind: "dreh",
    startsAt: at(ago(p.daysAgo), p.from),
    endsAt: at(ago(p.daysAgo), p.to),
    location: p.location,
    clientId: p.client.id,
    teamIds: [oe.id, yr.id],
  }));
  // Wöchentliche Redaktionsplanung (montags 09:00), 4 Wochen zurück und 4 voraus
  const monday = addDays(today, -((today.getUTCDay() + 6) % 7));
  for (let w = -4; w <= 4; w++) {
    const day = addDays(monday, w * 7);
    newEvents.push({
      title: "Redaktionsplanung",
      kind: "intern",
      startsAt: at(day, "09:00"),
      endsAt: at(day, "10:00"),
      location: "Büro",
      teamIds: [oe.id, yr.id, am.id],
      notes: "Ideen sammeln, Drehs der Woche festlegen, Kontingente prüfen.",
    });
  }
  // Ganztägiger Schnittblock über zwei Tage
  const cutStart = addDays(today, 9);
  newEvents.push({
    title: "Schnitttage November-Videos",
    kind: "intern",
    allDay: true,
    startsAt: berlinDateTime(d(cutStart)),
    endsAt: berlinDateTime(d(addDays(cutStart, 2))),
    teamIds: [yr.id],
  });
  await db.insert(s.events).values(newEvents);

  // Kalender-Abo-Token für die Vorschau
  await db
    .insert(s.settings)
    .values({ key: "ical", value: { token: randomBytes(24).toString("base64url"), createdAt: new Date().toISOString() } })
    .onConflictDoNothing();

  return `${demoVideos.length} Videos mit ${points} Messpunkten (Demo), ${newEvents.length} Termine`;
};

export default part;
