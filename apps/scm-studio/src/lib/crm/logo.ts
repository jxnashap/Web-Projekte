// Logo eines Kunden als Profilbild. Der Browser verkleinert es vorher auf ein Quadrat (512 px, WebP),
// abgelegt wird es privat (Supabase-Bucket bzw. lokal) unter logos/<Kunde>/…, ausgeliefert über /api/kunden/<id>/logo.
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomToken } from "@/lib/crypto";
import { integrations } from "@/lib/env";
import { localRoot, SUPABASE_BUCKET, supabaseAdmin } from "@/lib/storage";

export const LOGO_TYPES = ["image/webp", "image/png", "image/jpeg"];
export const MAX_LOGO_BYTES = 1024 * 1024;

const local = (key: string) => path.join(/*turbopackIgnore: true*/ localRoot(), key);

export async function putLogo(clientId: number, data: Uint8Array, mime: string): Promise<string> {
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
  const key = `logos/${clientId}/${randomToken(9)}.${ext}`;
  if (integrations.supabaseStorage()) {
    const sb = await supabaseAdmin();
    const { error } = await sb.storage.from(SUPABASE_BUCKET).upload(key, data, { contentType: mime, upsert: false });
    if (error) throw new Error(`Ablage fehlgeschlagen: ${error.message}`);
  } else {
    await fs.mkdir(path.dirname(local(key)), { recursive: true });
    await fs.writeFile(local(key), data, { flag: "wx" });
  }
  return key;
}

export async function readLogo(key: string): Promise<Uint8Array | null> {
  if (integrations.supabaseStorage()) {
    const sb = await supabaseAdmin();
    const { data } = await sb.storage.from(SUPABASE_BUCKET).download(key);
    return data ? new Uint8Array(await data.arrayBuffer()) : null;
  }
  return fs.readFile(local(key)).then((b) => new Uint8Array(b)).catch(() => null);
}

export async function removeLogo(key: string) {
  if (integrations.supabaseStorage()) {
    const sb = await supabaseAdmin();
    await sb.storage.from(SUPABASE_BUCKET).remove([key]);
  } else {
    await fs.rm(local(key), { force: true });
  }
}

export const logoMime = (key: string) => (key.endsWith(".png") ? "image/png" : key.endsWith(".jpg") ? "image/jpeg" : "image/webp");
