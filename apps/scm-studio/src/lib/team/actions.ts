"use server";
// Team verwalten: einladen (mit Supabase per E-Mail), Rolle ändern, deaktivieren.
// Ohne Supabase wird nur der Eintrag angelegt (Anmeldung dann über den Vorschau-Zugang).
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { done, fail, parseForm, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertAdmin } from "@/lib/auth";
import { authMode } from "@/lib/auth-mode";
import { appUrl, integrations } from "@/lib/env";

const InviteSchema = z.object({
  name: z.string({ error: "Name fehlt" }).min(2, "Name fehlt").max(120),
  email: z.email("Bitte eine gültige E-Mail eingeben").transform((v) => v.toLowerCase()),
  role: z.enum(["admin", "team"]).default("team"),
});

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-ZÄÖÜ]/.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();

export async function inviteTeamMember(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await assertAdmin();
  const parsed = parseForm(InviteSchema, fd);
  if (!parsed.success) return parsed.state;
  const { name, email, role } = parsed.data;
  const db = await getDb();
  const [exists] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.email, email));
  if (exists && exists.active) return fail("Diese Adresse gehört schon zum Team.", { email: ["Schon im Team"] });
  const [member] = exists
    ? await db.update(schema.teamMembers).set({ active: true, name, role }).where(eq(schema.teamMembers.id, exists.id)).returning()
    : await db.insert(schema.teamMembers).values({ name, email, role, initials: initialsOf(name) }).returning();

  if (authMode() === "supabase") {
    if (!integrations.supabaseStorage()) return fail("Für Einladungen fehlt SUPABASE_SECRET_KEY.");
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const admin = await createSupabaseAdmin();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${appUrl()}/auth/bestaetigen`, data: { name } });
    if (error && !/already/i.test(error.message)) return fail(`Einladung nicht verschickt: ${error.message}`);
  }
  await audit(me.id, "team", member.id, exists ? "reaktiviert" : "eingeladen", { email, role });
  refresh();
  return done(authMode() === "supabase" ? `Einladung an ${email} verschickt.` : `${name} ist angelegt (Vorschau-Zugang).`);
}

export async function setTeamMemberActive(id: number, active: boolean): Promise<ActionState> {
  const me = await assertAdmin();
  if (id === me.id && !active) return fail("Ihr könnt euch nicht selbst deaktivieren.");
  const db = await getDb();
  const admins = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.role, "admin"));
  if (!active && admins.filter((a) => a.active && a.id !== id).length === 0) return fail("Mindestens ein aktiver Inhaber muss bleiben.");
  await db.update(schema.teamMembers).set({ active }).where(eq(schema.teamMembers.id, id));
  await audit(me.id, "team", id, active ? "aktiviert" : "deaktiviert");
  refresh();
  return done(active ? "Wieder aktiv." : "Deaktiviert. Kein Zugang mehr.");
}

export async function setTeamMemberRole(id: number, role: "admin" | "team"): Promise<ActionState> {
  const me = await assertAdmin();
  const db = await getDb();
  if (role === "team") {
    const admins = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.role, "admin"));
    if (admins.filter((a) => a.active && a.id !== id).length === 0) return fail("Mindestens ein aktiver Inhaber muss bleiben.");
  }
  await db.update(schema.teamMembers).set({ role }).where(eq(schema.teamMembers.id, id));
  await audit(me.id, "team", id, "rolle", { role });
  refresh();
  return done("Rolle geändert.");
}
