"use server";
// Logo eines Kunden hochladen oder entfernen.
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema } from "@/db";
import { done, fail, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { LOGO_TYPES, MAX_LOGO_BYTES, putLogo, removeLogo } from "./logo";

export async function uploadClientLogo(clientId: number, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const file = fd.get("logo");
  if (!(file instanceof File) || file.size === 0) return fail("Keine Datei.");
  if (!LOGO_TYPES.includes(file.type)) return fail("Bitte ein Bild als PNG, JPG oder WebP.");
  if (file.size > MAX_LOGO_BYTES) return fail("Das Bild ist zu groß.");
  const db = await getDb();
  const [c] = await db.select({ logoPath: schema.clients.logoPath }).from(schema.clients).where(eq(schema.clients.id, clientId));
  if (!c) return fail("Kunde nicht gefunden.");
  const key = await putLogo(clientId, new Uint8Array(await file.arrayBuffer()), file.type);
  await db.update(schema.clients).set({ logoPath: key, updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
  if (c.logoPath) await removeLogo(c.logoPath).catch(() => undefined);
  await audit(user.id, "client", clientId, "geändert", { felder: ["Logo"] });
  refresh();
  return done("Logo gespeichert.");
}

export async function deleteClientLogo(clientId: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [c] = await db.select({ logoPath: schema.clients.logoPath }).from(schema.clients).where(eq(schema.clients.id, clientId));
  if (!c?.logoPath) return fail("Kein Logo hinterlegt.");
  await db.update(schema.clients).set({ logoPath: null, updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
  await removeLogo(c.logoPath).catch(() => undefined);
  await audit(user.id, "client", clientId, "geändert", { felder: ["Logo entfernt"] });
  refresh();
  return done("Logo entfernt.");
}
