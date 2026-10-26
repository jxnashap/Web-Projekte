"use server";
// Posting-Kalender: Video einplanen, verschieben, ausplanen, als gepostet markieren.
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { done, fail, parseForm, zOptText, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { berlinDateTime, todayIso } from "@/lib/time";

const zDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum wählen");
const zTime = z.string().regex(/^\d{2}:\d{2}$/, "Uhrzeit wählen");

const planSchema = z.object({
  day: zDay,
  time: zTime,
  platform: z.enum(["instagram", "tiktok", "beide"]),
  caption: zOptText(2200),
});

/** Einplanen oder Termin ändern (Dialog). */
export async function schedulePost(videoId: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(planSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const [v] = await db
    .update(schema.videos)
    .set({ scheduledAt: berlinDateTime(p.data.day, p.data.time), platform: p.data.platform, postCaption: p.data.caption?.trim() || null, updatedAt: new Date() })
    .where(eq(schema.videos.id, videoId))
    .returning();
  if (!v) return fail("Video nicht gefunden.");
  await audit(user.id, "video", videoId, "eingeplant", { tag: p.data.day, zeit: p.data.time, plattform: p.data.platform });
  refresh();
  return done(`„${v.title}“ ist eingeplant.`);
}

/** Per Ziehen auf einen Tag legen: Uhrzeit bleibt, neue Videos bekommen 18:00. */
export async function movePost(videoId: number, day: string): Promise<ActionState> {
  const user = await assertUser();
  if (!zDay.safeParse(day).success) return fail("Ungültiges Datum.");
  const db = await getDb();
  const [old] = await db.select().from(schema.videos).where(eq(schema.videos.id, videoId));
  if (!old) return fail("Video nicht gefunden.");
  if (old.status === "online") return fail("Schon gepostet. Das Datum steht im Video.");
  const time = old.scheduledAt
    ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(old.scheduledAt))
    : "18:00";
  await db.update(schema.videos).set({ scheduledAt: berlinDateTime(day, time), updatedAt: new Date() }).where(eq(schema.videos.id, videoId));
  await audit(user.id, "video", videoId, "eingeplant", { tag: day, zeit: time });
  refresh();
  return done(`„${old.title}“ am ${day.split("-").reverse().join(".")} um ${time} Uhr.`);
}

export async function unschedulePost(videoId: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [v] = await db.update(schema.videos).set({ scheduledAt: null, updatedAt: new Date() }).where(eq(schema.videos.id, videoId)).returning();
  if (!v) return fail("Video nicht gefunden.");
  await audit(user.id, "video", videoId, "ausgeplant");
  refresh();
  return done(`„${v.title}“ ist wieder in „Bereit zum Posten“.`);
}

const postedSchema = z.object({
  url: z.url({ protocol: /^https?$/, error: "Link bitte vollständig mit https:// eingeben" }).max(500).optional(),
  postDate: zDay.optional(),
});

/** Gepostet: Video auf Online, mit Link (für die Zahlen) und Datum. */
export async function markPosted(videoId: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const p = parseForm(postedSchema, fd);
  if (!p.success) return p.state;
  const db = await getDb();
  const [old] = await db.select().from(schema.videos).where(eq(schema.videos.id, videoId));
  if (!old) return fail("Video nicht gefunden.");
  const postDate = p.data.postDate ?? (old.scheduledAt ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(old.scheduledAt)) : todayIso());
  await db
    .update(schema.videos)
    .set({ status: "online", url: p.data.url ?? old.url, postDate, updatedAt: new Date() })
    .where(eq(schema.videos.id, videoId));
  await audit(user.id, "video", videoId, "status", { status: "online", link: Boolean(p.data.url ?? old.url) });
  refresh();
  return done(`„${old.title}“ ist online.`);
}
