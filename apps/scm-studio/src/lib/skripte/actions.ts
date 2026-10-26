"use server";
// Server Actions für Skripte: speichern, Status, duplizieren, löschen, KI-Generator.
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { ScriptBeat } from "@/db/schema";
import { done, fail, parseForm, zOptText, zText, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { generateScript } from "./ai";
import { GenInput, hookAndCta, ScriptDraft, type GenResult } from "./schema";

const beatsJson = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return [] as ScriptBeat[];
    try {
      const arr = z
        .array(z.object({ tc: z.string().max(10), label: z.string().max(60), text: z.string().max(2000), shot: z.string().max(300).optional() }))
        .max(40)
        .parse(JSON.parse(s));
      return arr
        .map((b) => ({ tc: b.tc.trim(), label: b.label.trim(), text: b.text.trim(), ...(b.shot?.trim() ? { shot: b.shot.trim() } : {}) }))
        .filter((b) => b.text || b.label);
    } catch {
      ctx.addIssue({ code: "custom", message: "Der Ablauf konnte nicht gelesen werden." });
      return z.NEVER;
    }
  });

// Hook und Aufruf stehen nur noch im Ablauf (Abschnitte „Hook“ und „Aufruf“) und werden beim Speichern abgeleitet.
const scriptSchema = z.object({
  title: zText("Titel", 200),
  format: zOptText(80),
  beats: beatsJson,
  caption: zOptText(2200),
  clientId: z.coerce.number().int().positive().optional(),
  /** Speichern und zugleich: Status setzen oder eine Kopie anlegen (Knöpfe im Seitenkopf) */
  intent: z.enum(["speichern", "final", "entwurf", "duplizieren"]).optional(),
});

/** Ein fertiges Skript bringt ein verknüpftes Video von „Idee“ auf „Skript“. */
async function bumpVideo(videoId: number | null) {
  if (!videoId) return;
  const db = await getDb();
  const [v] = await db.select().from(schema.videos).where(eq(schema.videos.id, videoId));
  if (v?.status === "idee") await db.update(schema.videos).set({ status: "skript", updatedAt: new Date() }).where(eq(schema.videos.id, v.id));
}

async function copyOf(orig: typeof schema.scripts.$inferSelect, userId: number) {
  const db = await getDb();
  const [copy] = await db
    .insert(schema.scripts)
    .values({
      clientId: orig.clientId,
      title: `${orig.title} (Kopie)`.slice(0, 200),
      format: orig.format,
      hook: orig.hook,
      beats: orig.beats,
      caption: orig.caption,
      cta: orig.cta,
      status: "entwurf",
      source: orig.source,
      model: orig.model,
      briefing: orig.briefing,
      createdBy: userId,
    })
    .returning();
  await audit(userId, "skript", copy.id, "dupliziert", { von: orig.id });
  return copy;
}

/** Editor speichern. Mit intent=final/entwurf wird zugleich der Status gesetzt, mit intent=duplizieren danach kopiert. */
export async function saveScript(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(scriptSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const { hook, cta } = hookAndCta(d.beats);
  const status = d.intent === "final" ? "final" : d.intent === "entwurf" ? "entwurf" : undefined;
  const db = await getDb();
  const [s] = await db
    .update(schema.scripts)
    .set({
      title: d.title,
      format: d.format ?? null,
      hook,
      beats: d.beats,
      caption: d.caption ?? null,
      cta,
      ...(status ? { status } : {}),
      clientId: d.clientId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.scripts.id, id))
    .returning();
  if (!s) return fail("Skript nicht gefunden.");
  await audit(user.id, "skript", id, "geändert", { status: s.status, schritte: d.beats.length });
  if (status === "final") await bumpVideo(s.videoId);
  if (d.intent === "duplizieren") {
    const copy = await copyOf(s, user.id);
    return done("Gespeichert und Kopie angelegt.", { redirectTo: `/skripte/${copy.id}`, id: copy.id });
  }
  refresh();
  if (status === "final") return done("Gespeichert und als fertig markiert.");
  if (status === "entwurf") return done("Gespeichert. Das Skript ist wieder ein Entwurf.");
  return done("Skript gespeichert.");
}

/** Status ohne Editor setzen (Drehbuch-Ansicht). */
export async function setScriptStatus(id: number, status: "entwurf" | "final"): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [s] = await db.update(schema.scripts).set({ status, updatedAt: new Date() }).where(eq(schema.scripts.id, id)).returning();
  if (!s) return fail("Skript nicht gefunden.");
  if (status === "final") await bumpVideo(s.videoId);
  await audit(user.id, "skript", id, "status", { status });
  refresh();
  return done(status === "final" ? "Skript ist als fertig markiert." : "Skript ist wieder ein Entwurf.");
}

/** Leeres Skript aus dem Editor anlegen (erst beim Speichern, ein Fehlklick legt nichts an). */
export async function createScript(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(scriptSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const { hook, cta } = hookAndCta(d.beats);
  const db = await getDb();
  const [s] = await db
    .insert(schema.scripts)
    .values({
      title: d.title,
      format: d.format ?? null,
      hook,
      beats: d.beats,
      caption: d.caption ?? null,
      cta,
      clientId: d.clientId ?? null,
      status: d.intent === "final" ? "final" : "entwurf",
      source: "manuell",
      createdBy: user.id,
    })
    .returning();
  await audit(user.id, "skript", s.id, "angelegt", { source: "manuell" });
  return done("Skript angelegt.", { redirectTo: `/skripte/${s.id}`, id: s.id });
}

/** Kopie aus dem gespeicherten Stand (Drehbuch-Ansicht; im Editor über saveScript mit intent=duplizieren). */
export async function duplicateScript(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [orig] = await db.select().from(schema.scripts).where(eq(schema.scripts.id, id));
  if (!orig) return fail("Skript nicht gefunden.");
  const copy = await copyOf(orig, user.id);
  return done("Kopie angelegt.", { redirectTo: `/skripte/${copy.id}`, id: copy.id });
}

export async function deleteScript(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [s] = await db.select().from(schema.scripts).where(eq(schema.scripts.id, id));
  if (!s) return fail("Skript nicht gefunden.");
  await db.update(schema.videos).set({ scriptId: null }).where(eq(schema.videos.scriptId, id));
  await db.delete(schema.scripts).where(eq(schema.scripts.id, id));
  await audit(user.id, "skript", id, "gelöscht", { title: s.title });
  return done(`„${s.title}“ ist gelöscht.`, { redirectTo: "/skripte" });
}

// ------------------------------------------------------------------
// KI-Generator
// ------------------------------------------------------------------
export type GenState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined>; result?: GenResult; at?: number };

async function contextFor(input: GenInput) {
  const db = await getDb();
  let clientId = input.clientId;
  if (!clientId && input.videoId) {
    const [v] = await db.select({ clientId: schema.videos.clientId }).from(schema.videos).where(eq(schema.videos.id, input.videoId));
    clientId = v?.clientId;
  }
  if (!clientId) return { branche: "unternehmen", region: null, clientName: null };
  const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId));
  return { branche: c?.branche ?? "unternehmen", region: c?.ort ?? c?.city ?? null, clientName: c?.name ?? null };
}

export async function generateAction(_: GenState, fd: FormData): Promise<GenState> {
  const user = await assertUser();
  const parsed = parseForm(GenInput, fd);
  if (!parsed.success) return { ok: false, error: parsed.state.error, fieldErrors: parsed.state.fieldErrors, at: Date.now() };
  const input = parsed.data;
  let previous: ScriptDraft | null = null;
  if (input.refine && input.previous) {
    try {
      const p = ScriptDraft.safeParse(JSON.parse(input.previous));
      if (p.success) previous = p.data;
    } catch {
      previous = null;
    }
  }
  if (input.refine && !previous) return { ok: false, error: "Erst ein Skript erzeugen, dann verfeinern.", at: Date.now() };
  const ctx = await contextFor(input);
  const r = await generateScript(input, ctx, previous, user.id);
  if (!r.ok) return { ok: false, error: r.error, at: Date.now() };
  return { ok: true, result: r.result, at: Date.now() };
}

const saveGenSchema = z.object({
  draft: z.string().min(2, "Kein Entwurf vorhanden"),
  hookChoice: z.string().max(500).optional(),
  title: zText("Titel", 200),
  clientId: z.coerce.number().int().positive().optional(),
  videoId: z.coerce.number().int().positive().optional(),
  format: zOptText(80),
  briefing: zOptText(1500),
  source: z.enum(["ki", "demo"]),
  model: z.string().max(60).optional(),
});

export async function saveGenerated(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(saveGenSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  let draft: ScriptDraft;
  try {
    draft = ScriptDraft.parse(JSON.parse(d.draft));
  } catch {
    return fail("Der Entwurf ist beschädigt. Bitte neu erzeugen.");
  }
  const db = await getDb();
  let clientId = d.clientId ?? null;
  if (d.videoId) {
    const [v] = await db.select().from(schema.videos).where(eq(schema.videos.id, d.videoId));
    if (!v) return fail("Video nicht gefunden.");
    clientId = clientId ?? v.clientId;
  }
  const hook = d.hookChoice?.trim() || draft.hook;
  const beats: ScriptBeat[] = draft.beats.map((b, i) => ({
    tc: b.tc,
    label: b.label,
    text: i === 0 && b.label === "Hook" ? hook : b.text,
    ...(b.shot ? { shot: b.shot } : {}),
  }));
  const caption = [draft.caption, draft.hashtags.join(" ")].filter(Boolean).join("\n\n");
  const derived = hookAndCta(beats);
  const [s] = await db
    .insert(schema.scripts)
    .values({
      clientId,
      videoId: d.videoId ?? null,
      title: d.title,
      format: d.format ?? null,
      hook: derived.hook ?? hook,
      beats,
      caption,
      cta: derived.cta ?? draft.cta,
      status: "entwurf",
      source: d.source,
      model: d.source === "ki" ? (d.model ?? null) : null,
      briefing: d.briefing ?? null,
      createdBy: user.id,
    })
    .returning();
  if (d.videoId) {
    await db.update(schema.scripts).set({ videoId: null }).where(eq(schema.scripts.videoId, d.videoId));
    await db.update(schema.scripts).set({ videoId: d.videoId }).where(eq(schema.scripts.id, s.id));
    const [v] = await db.select().from(schema.videos).where(eq(schema.videos.id, d.videoId));
    await db
      .update(schema.videos)
      .set({ scriptId: s.id, status: v?.status === "idee" ? "skript" : v?.status, updatedAt: new Date() })
      .where(eq(schema.videos.id, d.videoId));
  }
  await audit(user.id, "skript", s.id, "angelegt", { source: d.source, videoId: d.videoId ?? null });
  return done("Skript gespeichert.", { redirectTo: `/skripte/${s.id}`, id: s.id });
}

/** Skript mit einem Video verknüpfen (videoId leer = lösen). */
export async function linkToVideo(scriptId: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const videoId = Number(fd.get("videoId") ?? 0) || null;
  const db = await getDb();
  const [s] = await db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId));
  if (!s) return fail("Skript nicht gefunden.");
  await db.update(schema.videos).set({ scriptId: null }).where(eq(schema.videos.scriptId, scriptId));
  if (videoId) {
    const [v] = await db.select().from(schema.videos).where(eq(schema.videos.id, videoId));
    if (!v) return fail("Video nicht gefunden.");
    await db.update(schema.scripts).set({ videoId: null }).where(eq(schema.scripts.videoId, videoId));
    await db.update(schema.scripts).set({ videoId, clientId: s.clientId ?? v.clientId, updatedAt: new Date() }).where(eq(schema.scripts.id, scriptId));
    await db
      .update(schema.videos)
      .set({ scriptId, status: v.status === "idee" ? "skript" : v.status, updatedAt: new Date() })
      .where(eq(schema.videos.id, videoId));
  } else {
    await db.update(schema.scripts).set({ videoId: null, updatedAt: new Date() }).where(eq(schema.scripts.id, scriptId));
  }
  await audit(user.id, "skript", scriptId, "video", { videoId });
  refresh();
  return done(videoId ? "Mit Video verknüpft." : "Verknüpfung gelöst.");
}
