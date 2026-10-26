// Dateiablage mit zwei Speichern: lokal (.data/files) für die Vorschau, später ein privater
// Supabase-Storage-Bucket ("studio"). Jede Datei bekommt einen SHA-256 und eine Zeile in studio.files.
// Abgelegte Dateien werden nie überschrieben (GoBD: Belege und festgeschriebene Rechnungen bleiben byte-genau).
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { StoredFile } from "@/db/schema";
import { randomToken, sha256 } from "./crypto";
import { integrations } from "./env";

export type Bucket = "belege" | "rechnungen" | "dokumente";
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "studio";
const localRoot = () => process.env.FILES_DIR ?? path.join(process.cwd(), ".data", "files");

async function supabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const safeName = (name: string) =>
  name.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80) || "datei";

export async function putFile(opts: { bucket: Bucket; name: string; mime: string; data: Uint8Array; userId?: number | null }): Promise<StoredFile> {
  const hash = sha256(opts.data);
  const year = new Date().getUTCFullYear();
  const key = `${opts.bucket}/${year}/${randomToken(9)}-${safeName(opts.name)}`;
  if (integrations.supabaseStorage()) {
    const sb = await supabaseAdmin();
    const { error } = await sb.storage.from(SUPABASE_BUCKET).upload(key, opts.data, { contentType: opts.mime, upsert: false });
    if (error) throw new Error(`Ablage fehlgeschlagen: ${error.message}`);
  } else {
    const full = path.join(localRoot(), key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, opts.data, { flag: "wx" });
  }
  const db = await getDb();
  const [row] = await db
    .insert(schema.files)
    .values({ bucket: opts.bucket, path: key, name: opts.name, mime: opts.mime, size: opts.data.byteLength, sha256: hash, createdBy: opts.userId ?? null })
    .returning();
  return row;
}

export async function getFileMeta(id: number): Promise<StoredFile | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.files).where(eq(schema.files.id, id));
  return row ?? null;
}

export async function readFile(id: number): Promise<{ meta: StoredFile; data: Uint8Array } | null> {
  const meta = await getFileMeta(id);
  if (!meta) return null;
  let data: Uint8Array;
  if (integrations.supabaseStorage()) {
    const sb = await supabaseAdmin();
    const { data: blob, error } = await sb.storage.from(SUPABASE_BUCKET).download(meta.path);
    if (error || !blob) throw new Error(`Datei nicht lesbar: ${error?.message}`);
    data = new Uint8Array(await blob.arrayBuffer());
  } else {
    data = new Uint8Array(await fs.readFile(path.join(localRoot(), meta.path)));
  }
  return { meta, data };
}

/** Prüft, ob die abgelegte Datei noch zum gespeicherten Hash passt. */
export async function verifyFile(id: number): Promise<boolean> {
  const f = await readFile(id);
  return Boolean(f && sha256(f.data) === f.meta.sha256);
}

/** Link zur Auslieferung über die App (prüft die Anmeldung). */
export const fileHref = (id: number, download = false) => `/api/dateien/${id}${download ? "?download=1" : ""}`;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf", "application/xml", "text/xml"];
