"use server";
// Kreativprofil eines Kunden speichern.
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import type { CreativeProfile } from "@/db/schema";
import { done, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { PROFILE_FIELDS } from "./profile";

export async function saveCreativeProfile(clientId: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const profile: CreativeProfile = {};
  for (const f of PROFILE_FIELDS) {
    const v = String(fd.get(f.key) ?? "").trim().slice(0, 1200);
    if (v) profile[f.key] = v;
  }
  const db = await getDb();
  await db.update(schema.clients).set({ creativeProfile: profile, updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
  await audit(user.id, "client", clientId, "geändert", { felder: ["Kreativprofil"] });
  refresh();
  return done("Kreativprofil gespeichert.");
}
