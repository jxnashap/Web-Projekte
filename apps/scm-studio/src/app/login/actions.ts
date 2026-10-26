"use server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const userId = Number(formData.get("user"));
  const password = String(formData.get("password") ?? "");
  const expected = process.env.STUDIO_PREVIEW_PASSWORD ?? "scm-studio";
  if (!userId || password !== expected) return { error: "Anmeldung fehlgeschlagen. Passwort prüfen." };
  const db = await getDb();
  const [u] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, userId));
  if (!u) return { error: "Unbekanntes Teammitglied." };
  await createSession(u.id);
  await audit(u.id, "session", null, "login");
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
