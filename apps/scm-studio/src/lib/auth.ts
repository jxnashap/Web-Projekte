// Data Access Layer: jede Datenfunktion und jede Server Action prüft hier den Nutzer.
// Zwei Betriebsarten (src/lib/auth-mode.ts):
// - "supabase": Supabase Auth (E-Mail + Passwort), Zwei-Faktor (TOTP) ist Pflicht (aal2), Zugang nur für
//   eingetragene, aktive Teammitglieder (Abgleich über auth_user_id bzw. E-Mail).
// - "preview": lokaler Vorschau-Zugang mit gemeinsamem Passwort und signiertem Cookie.
import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { authMode } from "./auth-mode";
import { readSessionUserId } from "./session";

export type CurrentUser = { id: number; name: string; initials: string; role: string; email: string };

export type AuthState =
  | { status: "anonymous" }
  | { status: "mfa"; enroll: boolean; email: string | null }
  | { status: "no-team"; email: string | null }
  | { status: "ok"; user: CurrentUser };

const toUser = (u: typeof schema.teamMembers.$inferSelect): CurrentUser => ({ id: u.id, name: u.name, initials: u.initials, role: u.role, email: u.email });

export const getAuthState = cache(async (): Promise<AuthState> => {
  const db = await getDb();
  if (authMode() === "preview") {
    const uid = await readSessionUserId();
    if (!uid) return { status: "anonymous" };
    const [u] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, uid));
    return u && u.active ? { status: "ok", user: toUser(u) } : { status: "anonymous" };
  }

  const { createSupabaseServer } = await import("./supabase/server");
  const sb = await createSupabaseServer();
  const { data } = await sb.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { status: "anonymous" };
  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : null;
  if (claims.aal !== "aal2") {
    const { data: factors } = await sb.auth.mfa.listFactors();
    return { status: "mfa", enroll: !(factors?.totp?.length), email };
  }
  let [member] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.authUserId, claims.sub));
  if (!member && email) {
    // erste Anmeldung: Teammitglied über die E-Mail verknüpfen
    [member] = await db
      .update(schema.teamMembers)
      .set({ authUserId: claims.sub })
      .where(and(sql`lower(${schema.teamMembers.email}) = ${email}`, isNull(schema.teamMembers.authUserId)))
      .returning();
  }
  if (!member || !member.active) return { status: "no-team", email };
  return { status: "ok", user: toUser(member) };
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await getAuthState();
  return s.status === "ok" ? s.user : null;
});

export async function requireUser(): Promise<CurrentUser> {
  const s = await getAuthState();
  if (s.status === "ok") return s.user;
  if (s.status === "mfa") redirect("/login/zwei-faktor");
  if (s.status === "no-team") redirect("/login?fehler=kein-team");
  redirect("/login");
}

/** Für Server Actions: wirft statt umzuleiten, damit Formulare eine Meldung zeigen können. */
export async function assertUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nicht angemeldet");
  return user;
}

/** Nur Inhaber (role admin), z. B. für Einstellungen, Festschreiben, Export. */
export async function assertAdmin(): Promise<CurrentUser> {
  const user = await assertUser();
  if (user.role !== "admin") throw new Error("Nur für Inhaber");
  return user;
}
