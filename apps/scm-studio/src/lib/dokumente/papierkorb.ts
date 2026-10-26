// Papierkorb für Dokumente: Löschen legt ein Dokument 14 Tage zur Seite, danach wird es samt PDFs endgültig entfernt.
// Endgültig löschen erlaubt die Datenbank nur mit studio.endgueltig = 'ja' in derselben Transaktion (Trigger aus 0008).
import "server-only";
import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { removeObjects } from "@/lib/storage";
import { TRASH_DAYS } from "./schema";

const DAY = 864e5;

/** Ab wann ein gelöschtes Dokument endgültig entfernt wird. */
export const purgeAt = (deletedAt: Date) => new Date(deletedAt.getTime() + TRASH_DAYS * DAY);

/** Verbleibende Tage im Papierkorb (mindestens 0). */
export const daysLeft = (deletedAt: Date, now = Date.now()) => Math.max(0, Math.ceil((purgeAt(deletedAt).getTime() - now) / DAY));

/**
 * Dokumente aus dem Papierkorb endgültig löschen, mit allen PDF-Fassungen (auch früheren, laut Änderungsprotokoll).
 * Nur Dokumente, die im Papierkorb liegen. Liefert die Zahl der gelöschten Dokumente.
 */
export async function purgeDocuments(ids: number[], userId: number | null): Promise<number> {
  if (ids.length === 0) return 0;
  const db = await getDb();
  const docs = await db
    .select({ id: schema.documents.id, kind: schema.documents.kind, title: schema.documents.title, fileId: schema.documents.fileId })
    .from(schema.documents)
    .where(and(inArray(schema.documents.id, ids), isNotNull(schema.documents.deletedAt)));
  if (docs.length === 0) return 0;
  const docIds = docs.map((d) => d.id);
  // frühere Fassungen: "final", "unterschrieben" und "wieder_geoeffnet" vermerken die Datei im Protokoll
  const logged = await db
    .select({ detail: schema.auditLog.detail })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.entity, "document"), inArray(schema.auditLog.entityId, docIds)));
  const fileIds = new Set<number>(docs.flatMap((d) => (d.fileId ? [d.fileId] : [])));
  for (const { detail } of logged) {
    const d = detail as { fileId?: unknown; previousFileId?: unknown } | null;
    for (const v of [d?.fileId, d?.previousFileId]) if (typeof v === "number") fileIds.add(v);
  }
  const removed = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('studio.endgueltig', 'ja', true)`);
    const files = fileIds.size
      ? await tx
          .delete(schema.files)
          .where(and(inArray(schema.files.id, [...fileIds]), eq(schema.files.bucket, "dokumente")))
          .returning({ path: schema.files.path })
      : [];
    await tx.delete(schema.documents).where(and(inArray(schema.documents.id, docIds), isNotNull(schema.documents.deletedAt)));
    return files.map((f) => f.path);
  });
  // erst nach erfolgreicher Transaktion aus der Ablage entfernen; Fehler beim Aufräumen brechen nichts ab
  await removeObjects(removed).catch(() => undefined);
  for (const d of docs) await audit(userId, "document", d.id, "endgueltig_geloescht", { kind: d.kind, title: d.title });
  return docs.length;
}

/** Alles, was länger als 14 Tage im Papierkorb liegt, endgültig löschen (nächtlich über /api/cron/aufraeumen). */
export async function purgeExpired(): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - TRASH_DAYS * DAY);
  const due = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(and(isNotNull(schema.documents.deletedAt), lte(schema.documents.deletedAt, cutoff)));
  return purgeDocuments(due.map((d) => d.id), null);
}
