"use server";
// Server Actions für Videos (Produktion). Jede Aktion prüft die Anmeldung und schreibt ins Änderungsprotokoll.
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { done, fail, parseForm, zBool, zOptDate, zOptText, zText, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { VIDEO_STATUS } from "@/lib/labels";
import { monthIso } from "@/lib/time";

const STATUS_KEYS = VIDEO_STATUS.map((s) => s.key) as [string, ...string[]];

const videoSchema = z.object({
  clientId: z.coerce.number({ error: "Kunde wählen" }).int().positive("Kunde wählen"),
  title: zText("Titel", 200),
  format: zOptText(80),
  status: z.enum(STATUS_KEYS).optional(), // fehlt im Bearbeiten-Formular (Status läuft dort über die Schrittleiste)
  month: z.string().regex(/^\d{4}-\d{2}$/, "Monat wählen").optional(),
  isTest: zBool,
  shootDate: zOptDate,
  postDate: zOptDate,
  platform: z.enum(["instagram", "tiktok", "beide"]).optional(),
  url: z.url({ protocol: /^https?$/, error: "Link muss mit https:// beginnen" }).max(500).optional(),
  assignee: z.coerce.number().int().positive().optional(),
  notes: zOptText(4000),
});

const toRow = (d: z.infer<typeof videoSchema>) => ({
  clientId: d.clientId,
  title: d.title,
  format: d.format ?? null,
  ...(d.status ? { status: d.status } : {}),
  month: d.month ?? monthIso(),
  isTest: d.isTest,
  shootDate: d.shootDate ?? null,
  postDate: d.postDate ?? null,
  platform: d.platform ?? "instagram",
  url: d.url ?? null,
  assignee: d.assignee ?? null,
  notes: d.notes ?? null,
});

export async function createVideo(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(videoSchema, fd);
  if (!parsed.success) return parsed.state;
  const db = await getDb();
  const [v] = await db.insert(schema.videos).values({ ...toRow(parsed.data), status: parsed.data.status ?? "idee" }).returning();
  await audit(user.id, "video", v.id, "angelegt", { title: v.title, clientId: v.clientId });
  refresh();
  return done(`„${v.title}“ ist angelegt.`, { id: v.id });
}

export async function updateVideo(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(videoSchema, fd);
  if (!parsed.success) return parsed.state;
  const db = await getDb();
  const [v] = await db
    .update(schema.videos)
    .set({ ...toRow(parsed.data), updatedAt: new Date() })
    .where(eq(schema.videos.id, id))
    .returning();
  if (!v) return fail("Video nicht gefunden.");
  await audit(user.id, "video", id, "geändert", { status: v.status });
  refresh();
  return done("Gespeichert.");
}

export async function setVideoStatus(id: number, status: string): Promise<ActionState> {
  const user = await assertUser();
  if (!STATUS_KEYS.includes(status)) return fail("Unbekannter Status.");
  const db = await getDb();
  const [v] = await db.update(schema.videos).set({ status, updatedAt: new Date() }).where(eq(schema.videos.id, id)).returning();
  if (!v) return fail("Video nicht gefunden.");
  await audit(user.id, "video", id, "status", { status });
  refresh();
  const label = VIDEO_STATUS.find((s) => s.key === status)?.label ?? status;
  return done(`„${v.title}“ steht jetzt auf ${label}.`);
}

export async function deleteVideo(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [m] = await db.select({ id: schema.videoMetrics.id }).from(schema.videoMetrics).where(eq(schema.videoMetrics.videoId, id)).limit(1);
  if (m) return fail("Für dieses Video gibt es schon Zahlen. Es bleibt deshalb erhalten.");
  const [v] = await db.select().from(schema.videos).where(eq(schema.videos.id, id));
  if (!v) return fail("Video nicht gefunden.");
  await db.update(schema.scripts).set({ videoId: null }).where(eq(schema.scripts.videoId, id));
  await db.delete(schema.videos).where(eq(schema.videos.id, id));
  await audit(user.id, "video", id, "gelöscht", { title: v.title });
  return done(`„${v.title}“ ist gelöscht.`, { redirectTo: "/produktion" });
}

/** Skript mit Video verknüpfen (scriptId 0 = Verknüpfung lösen). */
export async function linkScript(videoId: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const scriptId = Number(fd.get("scriptId") ?? 0);
  const db = await getDb();
  const [v] = await db.select().from(schema.videos).where(eq(schema.videos.id, videoId));
  if (!v) return fail("Video nicht gefunden.");
  await db.update(schema.scripts).set({ videoId: null }).where(eq(schema.scripts.videoId, videoId));
  if (scriptId) {
    const [s] = await db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId));
    if (!s) return fail("Skript nicht gefunden.");
    await db.update(schema.scripts).set({ videoId, clientId: s.clientId ?? v.clientId, updatedAt: new Date() }).where(eq(schema.scripts.id, scriptId));
    await db
      .update(schema.videos)
      .set({ scriptId, status: v.status === "idee" ? "skript" : v.status, updatedAt: new Date() })
      .where(and(eq(schema.videos.id, videoId)));
  } else {
    await db.update(schema.videos).set({ scriptId: null, updatedAt: new Date() }).where(eq(schema.videos.id, videoId));
  }
  await audit(user.id, "video", videoId, "skript", { scriptId: scriptId || null });
  refresh();
  return done(scriptId ? "Skript ist verknüpft." : "Verknüpfung gelöst.");
}
