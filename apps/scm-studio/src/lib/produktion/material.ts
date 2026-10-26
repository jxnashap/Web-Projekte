// Material je Kunde (Logos, Schriften, Musik) für den Schnitt: Ablage, Übersicht, Links zum Herunterladen.
// Mit Supabase lädt der Browser direkt in den privaten Bucket (signierte Upload-Links), ohne Umweg über Vercel.
// Lokal und auf dem Testlink geht jede Datei per Server Action in den lokalen Ablageordner.
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Material } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { integrations } from "@/lib/env";
import { localRoot, safeName, SUPABASE_BUCKET, supabaseAdmin } from "@/lib/storage";
import type { UploadMode } from "./material-shared";

export function uploadMode(): UploadMode {
  if (integrations.supabaseStorage()) return "supabase";
  return process.env.VERCEL ? "testlink" : "local";
}

/** Ablage-Schlüssel: material/<Kunde>/<Zufall>-<Name>. Der Ordner steht nur in der Datenbank (Umbenennen ohne Kopieren). */
export const materialKey = (clientId: number, name: string) => `material/${clientId}/${randomToken(9)}-${safeName(name)}`;
export const keyBelongsTo = (key: string, clientId: number) => new RegExp(`^material/${clientId}/[\\w-]+-[\\w.\\-]+$`).test(key);

const localPath = (key: string) => path.join(/*turbopackIgnore: true*/ localRoot(), key);

export async function writeLocal(key: string, data: Uint8Array) {
  const full = localPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data, { flag: "wx" });
}

export async function readLocal(key: string): Promise<Uint8Array> {
  return new Uint8Array(await fs.readFile(localPath(key)));
}

/** Dateien in der Ablage löschen (Supabase in Paketen zu 100). Fehler beim Aufräumen brechen nichts ab. */
export async function removeObjects(keys: string[]) {
  if (keys.length === 0) return;
  if (integrations.supabaseStorage()) {
    const sb = await supabaseAdmin();
    for (let i = 0; i < keys.length; i += 100) await sb.storage.from(SUPABASE_BUCKET).remove(keys.slice(i, i + 100));
  } else {
    await Promise.all(keys.map((k) => fs.rm(localPath(k), { force: true })));
  }
}

/** Kunden mit Anzahl und Größe ihres Materials (ohne beendete Kunden, außer sie haben noch Material). */
export async function listMaterialClients() {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.clients.id,
      name: schema.clients.name,
      color: schema.clients.color,
      status: schema.clients.status,
      materialUrl: schema.clients.materialUrl,
      files: sql<number>`count(${schema.materials.id})::int`,
      size: sql<number>`coalesce(sum(${schema.materials.size}), 0)::bigint`,
      last: sql<string | null>`max(${schema.materials.createdAt})`,
    })
    .from(schema.clients)
    .leftJoin(schema.materials, eq(schema.materials.clientId, schema.clients.id))
    .groupBy(schema.clients.id)
    .orderBy(asc(schema.clients.name));
  return rows.filter((r) => r.status !== "beendet" || r.files > 0).map((r) => ({ ...r, size: Number(r.size) }));
}

export async function getMaterial(clientId: number) {
  await requireUser();
  const db = await getDb();
  const [client] = await db
    .select({ id: schema.clients.id, name: schema.clients.name, color: schema.clients.color, materialUrl: schema.clients.materialUrl })
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId));
  if (!client) return null;
  const files = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.clientId, clientId))
    .orderBy(asc(schema.materials.folder), asc(schema.materials.name));
  return { client, files };
}

/** Material in einem Ordner samt Unterordnern. */
export async function materialInFolder(clientId: number, folder: string): Promise<Material[]> {
  const db = await getDb();
  const scope = folder
    ? or(eq(schema.materials.folder, folder), like(schema.materials.folder, `${folder.replace(/[%_\\]/g, "\\$&")}/%`))
    : undefined;
  return db
    .select()
    .from(schema.materials)
    .where(and(eq(schema.materials.clientId, clientId), scope))
    .orderBy(asc(schema.materials.folder), asc(schema.materials.name));
}

export const PREVIEW_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

/**
 * Links zum Ansehen oder Laden. Supabase: signierte Links direkt aus dem Bucket (gelten `seconds`),
 * sonst über /api/material/<id>, das die Anmeldung prüft.
 */
export async function materialLinks(rows: Pick<Material, "id" | "path" | "name">[], opts: { download: boolean; seconds: number }) {
  const out = new Map<number, string>();
  if (rows.length === 0) return out;
  if (integrations.supabaseStorage()) {
    const sb = await supabaseAdmin();
    const bucket = sb.storage.from(SUPABASE_BUCKET);
    if (opts.download) {
      // createSignedUrls kennt keinen Dateinamen für den Download: je Datei einzeln (nur für kleine Mengen genutzt)
      await Promise.all(
        rows.map(async (r) => {
          const { data } = await bucket.createSignedUrl(r.path, opts.seconds, { download: r.name });
          if (data) out.set(r.id, data.signedUrl);
        }),
      );
    } else {
      const { data } = await bucket.createSignedUrls(rows.map((r) => r.path), opts.seconds);
      data?.forEach((d, i) => d.signedUrl && out.set(rows[i].id, d.signedUrl));
    }
  } else {
    for (const r of rows) out.set(r.id, `/api/material/${r.id}${opts.download ? "?download=1" : ""}`);
  }
  return out;
}

export async function getMaterialRow(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(schema.materials).where(eq(schema.materials.id, id));
  return row ?? null;
}
