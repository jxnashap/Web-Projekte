"use server";
// Server Actions für das Material je Kunde. Jede Aktion prüft die Anmeldung und schreibt ins Änderungsprotokoll.
import { and, eq, inArray, ne, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { done, fail, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth";
import { SUPABASE_BUCKET, supabaseAdmin } from "@/lib/storage";
import { keyBelongsTo, materialInFolder, materialKey, materialLinks, removeObjects, uploadMode, writeLocal } from "./material";
import { cleanFolder, isJunkFile, MAX_FILES_PER_UPLOAD, MAX_MATERIAL_BYTES } from "./material-shared";

/** Gleichnamige Dateien im selben Ordner ersetzen: ältere Einträge samt Datei entfernen. */
async function replaceOlder(clientId: number, kept: { id: number; folder: string; name: string }[]) {
  if (kept.length === 0) return;
  const db = await getDb();
  const old = await db
    .delete(schema.materials)
    .where(
      and(
        eq(schema.materials.clientId, clientId),
        or(...kept.map((k) => and(eq(schema.materials.folder, k.folder), eq(schema.materials.name, k.name), ne(schema.materials.id, k.id)))),
      ),
    )
    .returning({ path: schema.materials.path });
  await removeObjects(old.map((o) => o.path)).catch(() => undefined);
}

const mimeOf = (type: string) => (/^[\w.+-]+\/[\w.+-]+$/.test(type) ? type : "application/octet-stream");

async function clientExists(clientId: number) {
  const db = await getDb();
  const [c] = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.id, clientId));
  return Boolean(c);
}

const PlannedFile = z.object({ name: z.string().min(1).max(200), folder: z.string().max(400), size: z.number().int().nonnegative(), type: z.string().max(120) });
export type PlannedFile = z.infer<typeof PlannedFile>;

export type UploadTarget = { key: string; token: string };

/** Supabase: signierte Upload-Links je Datei. Der Browser lädt danach direkt in den Bucket. */
export async function prepareMaterialUpload(clientId: number, files: PlannedFile[]): Promise<{ ok: true; bucket: string; targets: UploadTarget[] } | { ok: false; error: string }> {
  await assertUser();
  if (uploadMode() !== "supabase") return { ok: false, error: "Direktes Hochladen geht nur mit Supabase." };
  const parsed = z.array(PlannedFile).max(MAX_FILES_PER_UPLOAD).safeParse(files);
  if (!parsed.success) return { ok: false, error: `Höchstens ${MAX_FILES_PER_UPLOAD} Dateien auf einmal.` };
  if (!(await clientExists(clientId))) return { ok: false, error: "Kunde nicht gefunden." };
  const max = MAX_MATERIAL_BYTES.supabase;
  const tooBig = parsed.data.find((f) => f.size > max);
  if (tooBig) return { ok: false, error: `„${tooBig.name}“ ist größer als ${max / 1024 / 1024} MB.` };
  const sb = await supabaseAdmin();
  const bucket = sb.storage.from(SUPABASE_BUCKET);
  const targets: UploadTarget[] = [];
  for (const f of parsed.data) {
    const key = materialKey(clientId, f.name);
    const { data, error } = await bucket.createSignedUploadUrl(key);
    if (error || !data) return { ok: false, error: `Hochladen nicht vorbereitet: ${error?.message ?? "keine Antwort"}` };
    targets.push({ key, token: data.token });
  }
  return { ok: true, bucket: SUPABASE_BUCKET, targets };
}

const Uploaded = z.object({ key: z.string().max(300), name: z.string().min(1).max(200), folder: z.string().max(400), type: z.string().max(120), size: z.number().int().nonnegative() });

/** Supabase: hochgeladene Dateien eintragen. Größe und Typ kommen aus der Ablage selbst, nicht aus dem Browser. */
export async function registerMaterial(clientId: number, items: z.infer<typeof Uploaded>[]): Promise<ActionState> {
  const user = await assertUser();
  const parsed = z.array(Uploaded).max(MAX_FILES_PER_UPLOAD).safeParse(items);
  if (!parsed.success || parsed.data.some((i) => !keyBelongsTo(i.key, clientId))) return fail("Ungültige Dateien.");
  if (parsed.data.length === 0) return done("Nichts hochgeladen.");
  const sb = await supabaseAdmin();
  const bucket = sb.storage.from(SUPABASE_BUCKET);
  const rows = [];
  for (const i of parsed.data) {
    const { data, error } = await bucket.info(i.key);
    if (error || !data) continue; // Upload ist nicht angekommen
    rows.push({
      clientId,
      folder: cleanFolder(i.folder),
      name: i.name.slice(0, 200),
      path: i.key,
      mime: mimeOf(data.contentType ?? i.type),
      size: data.size ?? i.size,
      createdBy: user.id,
    });
  }
  if (rows.length === 0) return fail("Keine Datei ist angekommen. Bitte noch einmal versuchen.");
  const db = await getDb();
  const inserted = await db.insert(schema.materials).values(rows).returning();
  await replaceOlder(clientId, inserted);
  await audit(user.id, "material", clientId, "hochgeladen", { anzahl: rows.length });
  refresh();
  return done(rows.length === 1 ? "1 Datei hochgeladen." : `${rows.length} Dateien hochgeladen.`);
}

/** Lokal und Testlink: eine Datei je Aufruf über die App (Grenze je nach Weg, siehe MAX_MATERIAL_BYTES). */
export async function uploadMaterialFile(clientId: number, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const mode = uploadMode();
  if (mode === "supabase") return fail("Mit Supabase lädt der Browser direkt hoch.");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Keine Datei.");
  if (isJunkFile(file.name)) return done("Übersprungen.");
  if (file.size > MAX_MATERIAL_BYTES[mode]) return fail(`„${file.name}“ ist zu groß für diesen Weg (höchstens ${MAX_MATERIAL_BYTES[mode] / 1024 / 1024} MB).`);
  if (!(await clientExists(clientId))) return fail("Kunde nicht gefunden.");
  const key = materialKey(clientId, file.name);
  await writeLocal(key, new Uint8Array(await file.arrayBuffer()));
  const db = await getDb();
  const inserted = await db
    .insert(schema.materials)
    .values({
      clientId,
      folder: cleanFolder(String(fd.get("folder") ?? "")),
      name: file.name.slice(0, 200),
      path: key,
      mime: mimeOf(file.type),
      size: file.size,
      createdBy: user.id,
    })
    .returning();
  await replaceOlder(clientId, inserted);
  return done("Hochgeladen.");
}

/** Nach dem lokalen Hochladen einmal protokollieren und die Seite neu laden. */
export async function finishLocalUpload(clientId: number, count: number): Promise<ActionState> {
  const user = await assertUser();
  if (count > 0) await audit(user.id, "material", clientId, "hochgeladen", { anzahl: count });
  refresh();
  return done(count === 1 ? "1 Datei hochgeladen." : `${count} Dateien hochgeladen.`);
}

export async function deleteMaterial(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [row] = await db.delete(schema.materials).where(eq(schema.materials.id, id)).returning();
  if (!row) return fail("Datei nicht gefunden.");
  await removeObjects([row.path]).catch(() => undefined);
  await audit(user.id, "material", row.clientId, "gelöscht", { name: row.name, ordner: row.folder });
  refresh();
  return done(`„${row.name}“ gelöscht.`);
}

export async function deleteMaterialFolder(clientId: number, folder: string): Promise<ActionState> {
  const user = await assertUser();
  const f = cleanFolder(folder);
  if (!f) return fail("Ordner fehlt.");
  const rows = await materialInFolder(clientId, f);
  if (rows.length === 0) return fail("Der Ordner ist leer.");
  const db = await getDb();
  await db.delete(schema.materials).where(and(eq(schema.materials.clientId, clientId), inArray(schema.materials.id, rows.map((r) => r.id))));
  await removeObjects(rows.map((r) => r.path)).catch(() => undefined);
  await audit(user.id, "material", clientId, "ordner_geloescht", { ordner: f, anzahl: rows.length });
  refresh();
  return done(`Ordner „${f.split("/").pop()}“ gelöscht.`);
}

export type ZipEntry = { path: string; url: string; size: number };

/** Dateien eines Ordners (samt Unterordnern) mit Ladelinks, damit der Browser sie zu einem ZIP packt. */
export async function materialForZip(clientId: number, folder: string): Promise<{ ok: true; entries: ZipEntry[] } | { ok: false; error: string }> {
  await assertUser();
  const f = cleanFolder(folder);
  const rows = await materialInFolder(clientId, f);
  if (rows.length === 0) return { ok: false, error: "Hier liegt noch nichts." };
  const links = await materialLinks(rows, { download: false, seconds: 600 });
  const strip = f ? f.length + 1 : 0;
  const seen = new Set<string>();
  const unique = (p: string) => {
    let out = p;
    for (let n = 2; seen.has(out.toLowerCase()); n++) out = p.replace(/(\.[^./]+)?$/, ` (${n})$1`);
    seen.add(out.toLowerCase());
    return out;
  };
  return {
    ok: true,
    entries: rows.flatMap((r) => {
      const url = links.get(r.id);
      const dir = r.folder.slice(strip);
      return url ? [{ path: unique(dir ? `${dir}/${r.name}` : r.name), url, size: r.size }] : [];
    }),
  };
}

const zUrl = z.url({ protocol: /^https?$/, error: "Link bitte vollständig mit https:// eingeben" }).max(500, "Der Link ist zu lang");

/** Link zum Ordner mit Rohmaterial (Google Drive, Dropbox …). Leer = entfernen. */
export async function saveMaterialUrl(clientId: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const raw = String(fd.get("materialUrl") ?? "").trim();
  const parsed = raw ? zUrl.safeParse(raw) : null;
  if (parsed && !parsed.success) return fail("Bitte den Link prüfen.", { materialUrl: [parsed.error.issues[0]?.message ?? "Ungültiger Link"] });
  const db = await getDb();
  await db.update(schema.clients).set({ materialUrl: parsed?.data ?? null, updatedAt: new Date() }).where(eq(schema.clients.id, clientId));
  await audit(user.id, "material", clientId, "rohmaterial_link", { gesetzt: Boolean(parsed) });
  refresh();
  return done(parsed ? "Link gespeichert." : "Link entfernt.");
}
