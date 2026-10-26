// Data Access Layer: jede Datenfunktion und jede Server Action prüft hier den Nutzer.
import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { readSessionUserId } from "./session";

export type CurrentUser = { id: number; name: string; initials: string; role: string };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const uid = await readSessionUserId();
  if (!uid) return null;
  const db = await getDb();
  const [u] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, uid));
  return u ? { id: u.id, name: u.name, initials: u.initials, role: u.role } : null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Für Server Actions: wirft statt umzuleiten, damit Formulare eine Meldung zeigen können. */
export async function assertUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nicht angemeldet");
  return user;
}
