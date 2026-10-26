"use server";
// Team verwalten: einladen, Zugangslink erzeugen, Rolle ändern, deaktivieren.
// Mit Supabase bekommt jede Person einen einmaligen Zugangslink, den ein Inhaber selbst weitergibt (z. B. per WhatsApp).
// So braucht es keinen Mailversand: Supabase schickt ohne eigenen SMTP-Server nur an Mitglieder der Organisation.
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

/**
 * Einmaliger Zugangslink ohne E-Mail (Supabase generateLink). Neue Personen bekommen einen Einladungslink,
 * wer schon ein Konto hat, einen Link zum Passwort neu setzen. Gültig so lange wie in Supabase unter
 * Authentication → Email → "Email OTP Expiration" eingestellt (Standard eine Stunde).
 */
async function accessLink(email: string, name: string): Promise<{ link?: string; error?: string }> {
  if (!integrations.supabaseStorage()) return { error: "Für Zugangslinks fehlt SUPABASE_SECRET_KEY." };
  const { createSupabaseAdmin } = await import("@/lib/supabase/server");
  const admin = await createSupabaseAdmin();
  let type: "invite" | "recovery" = "invite";
  let res = await admin.auth.admin.generateLink({ type, email, options: { data: { name } } });
  if (res.error && /already|registered|exists/i.test(res.error.message)) {
    type = "recovery";
    res = await admin.auth.admin.generateLink({ type, email });
  }
  const token = res.data?.properties?.hashed_token;
  if (res.error && /invalid api key/i.test(res.error.message)) {
    return {
      error:
        "Supabase lehnt den geheimen Schlüssel ab. In Vercel unter SUPABASE_SECRET_KEY den Secret key aus dem " +
        "Supabase-Projekt scm-studio (Frankfurt) eintragen, Project Settings → API Keys, und neu deployen.",
    };
  }
  if (res.error || !token) return { error: `Zugangslink nicht erzeugt: ${res.error?.message ?? "keine Antwort von Supabase"}` };
  return { link: `${appUrl()}/auth/bestaetigen?token_hash=${encodeURIComponent(token)}&type=${type}` };
}

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

  await audit(me.id, "team", member.id, exists ? "reaktiviert" : "eingeladen", { email, role });
  refresh();
  if (authMode() !== "supabase") return done(`${name} ist angelegt (Vorschau-Zugang).`);
  const { link, error } = await accessLink(email, name);
  if (!link) return fail(`${name} ist angelegt, aber: ${error}`);
  return done(`${name} ist angelegt. Jetzt den Zugangslink weitergeben.`, { link });
}

/** Neuer Zugangslink für eine Person aus dem Team (z. B. Link abgelaufen oder Passwort vergessen). */
export async function createAccessLink(id: number): Promise<ActionState> {
  const me = await assertAdmin();
  if (authMode() !== "supabase") return fail("Zugangslinks gibt es erst mit Supabase. In der Vorschau gilt das gemeinsame Passwort.");
  const db = await getDb();
  const [member] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, id));
  if (!member) return fail("Diese Person gibt es nicht mehr.");
  if (!member.active) return fail("Der Zugang ist gesperrt. Erst wieder freigeben, dann einen Link erzeugen.");
  const { link, error } = await accessLink(member.email, member.name);
  if (!link) return fail(error ?? "Zugangslink nicht erzeugt.");
  await audit(me.id, "team", member.id, "zugangslink");
  return done("Zugangslink erzeugt.", { link });
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
