"use server";
// Server Actions der Creative Engine: Konzepte entwickeln, Skript ausarbeiten oder verfeinern, als Idee merken, speichern.
// Aufruf aus dem Browser mit Objekten (keine Formulare), jede Aktion prüft die Anmeldung und die Eingaben.
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { ScriptBeat } from "@/db/schema";
import { done, fail, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { generateConcepts, generatePlan } from "./ai";
import { engineContext } from "./context";
import { Briefing, CATEGORY_KEYS, categoryLabel, Concept, mmss, ScriptPlan, type Concept as ConceptT, type ScriptPlan as Plan } from "./shared";

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
export type ConceptsResult = { ok: true; concepts: ConceptT[]; demo: boolean; model: string } | Fail;
export type PlanResult = { ok: true; plan: Plan; demo: boolean; model: string } | Fail;

const ConceptIn = z.object({
  title: z.string().min(1).max(200),
  categories: z.array(z.enum(CATEGORY_KEYS)).max(3),
  hook: z.string().max(500),
  concept: z.string().max(2000),
  mechanic: z.string().max(500).optional().default(""),
  production: Concept.shape.production.optional(),
});

function briefingOf(raw: unknown): { ok: true; data: Briefing } | Fail {
  const p = Briefing.safeParse(raw);
  if (p.success) return { ok: true, data: p.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const i of p.error.issues) (fieldErrors[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return { ok: false, error: "Bitte die markierten Angaben prüfen.", fieldErrors };
}

async function clientOf(b: Briefing) {
  if (b.clientId) return b.clientId;
  if (!b.videoId) return undefined;
  const db = await getDb();
  const [v] = await db.select({ clientId: schema.videos.clientId }).from(schema.videos).where(eq(schema.videos.id, b.videoId));
  return v?.clientId;
}

/** Fünf grundverschiedene Konzepte. `exclude`: schon gezeigte Grundideen („Komplett neue Grundideen“). */
export async function conceptsAction(raw: unknown, exclude: string[] = []): Promise<ConceptsResult> {
  const user = await assertUser();
  const b = briefingOf(raw);
  if (!b.ok) return b;
  const ctx = await engineContext(await clientOf(b.data));
  const ex = z.array(z.string().max(400)).max(40).safeParse(exclude);
  const r = await generateConcepts(b.data, ctx, ex.success ? ex.data : [], user.id);
  if (!r.ok) return r;
  return { ok: true, concepts: r.data, demo: r.demo, model: r.model };
}

/** Skript zum gewählten Konzept, optional als Überarbeitung des bisherigen Skripts. */
export async function planAction(raw: unknown, concept: unknown, previous?: unknown, refine?: string): Promise<PlanResult> {
  const user = await assertUser();
  const b = briefingOf(raw);
  if (!b.ok) return b;
  const c = ConceptIn.safeParse(concept);
  if (!c.success) return { ok: false, error: "Das Konzept ist unvollständig. Bitte neu wählen." };
  const prev = previous ? ScriptPlan.safeParse(previous) : null;
  if (refine && !prev?.success) return { ok: false, error: "Erst ein Skript erzeugen, dann verfeinern." };
  const wish = refine?.trim().slice(0, 300) || null;
  const ctx = await engineContext(await clientOf(b.data));
  const r = await generatePlan(b.data, c.data, ctx, prev?.success ? prev.data : null, wish, user.id);
  if (!r.ok) return r;
  return { ok: true, plan: r.data, demo: r.demo, model: r.model };
}

async function insertIdea(b: Briefing, c: z.infer<typeof ConceptIn> & { scores?: ConceptT["scores"] }, userId: number, clientId: number | undefined) {
  const db = await getDb();
  const [i] = await db
    .insert(schema.ideas)
    .values({
      title: c.title,
      hook: c.hook || null,
      description: c.concept || null,
      format: c.categories[0] ? categoryLabel(c.categories[0]) : null,
      categories: c.categories,
      goal: b.goal,
      mechanic: c.mechanic || null,
      scores: c.scores ?? null,
      production: c.production ?? null,
      clientId: clientId ?? null,
      status: "offen",
      source: "eigene",
      createdBy: userId,
    })
    .returning();
  await audit(userId, "idee", i.id, "angelegt", { title: i.title, quelle: "creative-engine" });
  return i;
}

/** Konzept als Video-Idee merken (ohne Skript). */
export async function saveConceptAsIdea(raw: unknown, concept: unknown): Promise<ActionState> {
  const user = await assertUser();
  const b = briefingOf(raw);
  if (!b.ok) return fail(b.error);
  const c = Concept.safeParse(concept);
  if (!c.success) return fail("Das Konzept ist unvollständig.");
  const i = await insertIdea(b.data, c.data, user.id, await clientOf(b.data));
  return done(`„${i.title}“ ist als Idee gemerkt.`, { id: i.id });
}

const SaveIn = z.object({
  title: z.string().min(1, "Titel fehlt").max(200),
  hookChoice: z.string().max(500).optional(),
  model: z.string().max(60),
  demo: z.boolean(),
});

/** Skript speichern. Ohne bestehende Idee wird das Konzept als Idee angelegt: Idee und Skript gehören zusammen. */
export async function saveEngineScript(raw: unknown, concept: unknown, planRaw: unknown, meta: unknown): Promise<ActionState> {
  const user = await assertUser();
  const b = briefingOf(raw);
  if (!b.ok) return fail(b.error);
  const c = ConceptIn.extend({ scores: Concept.shape.scores.optional() }).safeParse(concept);
  const p = ScriptPlan.safeParse(planRaw);
  const m = SaveIn.safeParse(meta);
  if (!c.success || !p.success || !m.success) return fail("Der Entwurf ist unvollständig. Bitte neu erzeugen.");
  const plan = p.data;
  const db = await getDb();
  const clientId = await clientOf(b.data);

  // Gewählter Hook ersetzt den Text der Hook-Szene (Text im Bild bzw. Dialog), Alternativen bleiben erhalten
  const hook = m.data.hookChoice?.trim() || plan.hook;
  const altHooks = [plan.hook, ...plan.alternativeHooks].filter((h) => h && h !== hook).slice(0, 4);
  const beats: ScriptBeat[] = plan.scenes.map((s, i) => {
    const text = s.dialogue || (i === 0 ? hook : "");
    // Stand der ursprüngliche Hook als Text im Bild, wird er durch den gewählten ersetzt (ohne Doppelung zum Text)
    let overlay = i === 0 && s.overlay === plan.hook ? (s.dialogue ? hook : "") : s.overlay;
    if (overlay === text) overlay = "";
    return {
      tc: mmss(s.start),
      label: s.label,
      text,
      ...(s.camera ? { shot: s.camera } : {}),
      ...(s.action ? { action: s.action } : {}),
      ...(overlay ? { overlay } : {}),
      ...(s.sound ? { sound: s.sound } : {}),
      ...(s.cut ? { cut: s.cut } : {}),
    };
  });
  const caption = [plan.caption, plan.hashtags.join(" ")].filter(Boolean).join("\n\n");

  let ideaId = b.data.ideaId ?? null;
  if (!ideaId) ideaId = (await insertIdea(b.data, c.data, user.id, clientId)).id;
  else await db.update(schema.ideas).set({ status: "offen", updatedAt: new Date() }).where(eq(schema.ideas.id, ideaId));

  // Video: aus der Eingabe oder das Video, als das die Idee eingeplant ist
  let videoId = b.data.videoId ?? null;
  if (!videoId) {
    const [idea] = await db.select({ videoId: schema.ideas.videoId }).from(schema.ideas).where(eq(schema.ideas.id, ideaId));
    videoId = idea?.videoId ?? null;
  }
  const [v] = videoId ? await db.select().from(schema.videos).where(eq(schema.videos.id, videoId)) : [];

  const [s] = await db
    .insert(schema.scripts)
    .values({
      clientId: clientId ?? v?.clientId ?? null,
      videoId: v?.id ?? null,
      ideaId,
      title: m.data.title,
      format: c.data.categories[0] ? categoryLabel(c.data.categories[0]) : null,
      hook,
      beats,
      caption,
      cta: plan.cta || null,
      status: "entwurf",
      source: m.data.demo ? "demo" : "ki",
      model: m.data.demo ? null : m.data.model,
      briefing: b.data.topic?.trim() || null,
      categories: c.data.categories,
      goal: b.data.goal,
      durationSeconds: plan.scenes.at(-1)?.end ?? b.data.length,
      concept: plan.concept || c.data.concept,
      production: plan.production,
      alternatives: { hooks: altHooks, punchlines: plan.alternativePunchlines },
      createdBy: user.id,
    })
    .returning();
  if (v) {
    await db.update(schema.scripts).set({ videoId: null }).where(eq(schema.scripts.videoId, v.id));
    await db.update(schema.scripts).set({ videoId: v.id }).where(eq(schema.scripts.id, s.id));
    await db.update(schema.videos).set({ scriptId: s.id, status: v.status === "idee" ? "skript" : v.status, updatedAt: new Date() }).where(eq(schema.videos.id, v.id));
  }
  await audit(user.id, "skript", s.id, "angelegt", { source: s.source, ideeId: ideaId, videoId: v?.id ?? null });
  return done("Skript gespeichert.", { redirectTo: `/skripte/${s.id}`, id: s.id });
}
