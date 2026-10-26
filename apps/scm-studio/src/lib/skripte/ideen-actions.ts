"use server";
// Server Actions für Video-Ideen: anlegen, bearbeiten, übernehmen oder verwerfen, als Video einplanen.
import { desc, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { done, fail, parseForm, zOptText, zText, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { monthIso } from "@/lib/time";

const ideaSchema = z.object({
  title: zText("Titel", 200),
  description: zOptText(2000),
  hook: zOptText(300),
  format: zOptText(80),
  clientId: z.coerce.number().int().positive().optional(),
});

const toRow = (d: z.infer<typeof ideaSchema>) => ({
  title: d.title,
  description: d.description ?? null,
  hook: d.hook ?? null,
  format: d.format ?? null,
  clientId: d.clientId ?? null,
});

export async function createIdea(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(ideaSchema, fd);
  if (!parsed.success) return parsed.state;
  const db = await getDb();
  const [i] = await db.insert(schema.ideas).values({ ...toRow(parsed.data), status: "offen", source: "eigene", createdBy: user.id }).returning();
  await audit(user.id, "idee", i.id, "angelegt", { title: i.title });
  refresh();
  return done(`Idee „${i.title}“ gespeichert.`, { id: i.id, redirectTo: `/skripte/ideen/${i.id}` });
}

export async function updateIdea(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(ideaSchema, fd);
  if (!parsed.success) return parsed.state;
  const db = await getDb();
  const [i] = await db
    .update(schema.ideas)
    .set({ ...toRow(parsed.data), updatedAt: new Date() })
    .where(eq(schema.ideas.id, id))
    .returning();
  if (!i) return fail("Idee nicht gefunden.");
  await audit(user.id, "idee", id, "geändert");
  refresh();
  return done("Gespeichert.");
}

/** Vorschlag übernehmen (offen), verwerfen oder zurückholen. */
export async function setIdeaStatus(id: number, status: "offen" | "verworfen"): Promise<ActionState> {
  const user = await assertUser();
  if (!["offen", "verworfen"].includes(status)) return fail("Unbekannter Status.");
  const db = await getDb();
  const [old] = await db.select({ status: schema.ideas.status, title: schema.ideas.title }).from(schema.ideas).where(eq(schema.ideas.id, id));
  if (!old) return fail("Idee nicht gefunden.");
  await db.update(schema.ideas).set({ status, updatedAt: new Date() }).where(eq(schema.ideas.id, id));
  const action = status === "verworfen" ? "verworfen" : old.status === "vorschlag" ? "uebernommen" : "status";
  await audit(user.id, "idee", id, action, { status });
  refresh();
  return done(status === "verworfen" ? `„${old.title}“ verworfen.` : old.status === "vorschlag" ? `„${old.title}“ übernommen.` : "Wieder offen.");
}

export async function deleteIdea(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [i] = await db.delete(schema.ideas).where(eq(schema.ideas.id, id)).returning();
  if (!i) return fail("Idee nicht gefunden.");
  await audit(user.id, "idee", id, "gelöscht", { title: i.title });
  refresh();
  return done(`„${i.title}“ gelöscht.`, { redirectTo: "/skripte" });
}

const planSchema = z.object({
  clientId: z.coerce.number({ error: "Bitte einen Kunden wählen" }).int().positive("Bitte einen Kunden wählen"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Monat wählen"),
});

/**
 * Idee für einen Kunden und Monat einplanen: legt ein Video an (zählt ins Kontingent).
 * Gibt es schon ein Skript zur Idee, hängt das neueste am Video und das Video startet auf „Skript“.
 */
export async function planIdea(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(planSchema, fd);
  if (!parsed.success) return parsed.state;
  const d = parsed.data;
  const db = await getDb();
  const [idea] = await db.select().from(schema.ideas).where(eq(schema.ideas.id, id));
  if (!idea) return fail("Idee nicht gefunden.");
  if (idea.videoId) return fail("Diese Idee ist schon eingeplant.");
  const [script] = await db
    .select({ id: schema.scripts.id, videoId: schema.scripts.videoId })
    .from(schema.scripts)
    .where(eq(schema.scripts.ideaId, id))
    .orderBy(desc(schema.scripts.updatedAt))
    .limit(1);
  const freeScript = script && !script.videoId ? script.id : null;
  const [v] = await db
    .insert(schema.videos)
    .values({
      clientId: d.clientId,
      title: idea.title,
      format: idea.format,
      status: freeScript ? "skript" : "idee",
      month: d.month ?? monthIso(),
      scriptId: freeScript,
    })
    .returning();
  if (freeScript) await db.update(schema.scripts).set({ videoId: v.id, clientId: d.clientId, updatedAt: new Date() }).where(eq(schema.scripts.id, freeScript));
  await db
    .update(schema.ideas)
    .set({ videoId: v.id, clientId: idea.clientId ?? d.clientId, status: "offen", updatedAt: new Date() })
    .where(eq(schema.ideas.id, id));
  await audit(user.id, "idee", id, "eingeplant", { videoId: v.id, monat: d.month });
  await audit(user.id, "video", v.id, "angelegt", { title: v.title, clientId: v.clientId, ideeId: id });
  refresh();
  return done(`Eingeplant: „${v.title}“.`, { id: v.id });
}
