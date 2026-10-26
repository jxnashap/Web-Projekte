// Änderungsprotokoll (GoBD: nachvollziehbar, wer wann was geändert hat). Jeder Eintrag trägt den Hash
// des vorherigen Eintrags in sich (Hash-Kette): wird später etwas verändert oder gelöscht, fällt das auf.
import "server-only";
import { asc, desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sha256 } from "./crypto";

// jsonb sortiert Schlüssel um, deshalb kanonisch (Schlüssel sortiert) serialisieren
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`
      : JSON.stringify(v ?? null);

const payloadOf = (e: { at: Date; userId: number | null; entity: string; entityId: number | null; action: string; detail: unknown }) =>
  canonical({ at: e.at.toISOString(), userId: e.userId, entity: e.entity, entityId: e.entityId, action: e.action, detail: e.detail ?? null });

export async function audit(userId: number | null, entity: string, entityId: number | null, action: string, detail?: unknown) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(7311)`);
    const [prev] = await tx.select({ hash: schema.auditLog.hash }).from(schema.auditLog).orderBy(desc(schema.auditLog.id)).limit(1);
    const at = new Date();
    const entry = { at, userId, entity, entityId, action, detail: detail ?? null };
    await tx.insert(schema.auditLog).values({ ...entry, hash: sha256((prev?.hash ?? "") + payloadOf(entry)) });
  });
}

/** Prüft die Hash-Kette. Ergebnis: ok oder die ID des ersten auffälligen Eintrags. */
export async function verifyAuditChain(): Promise<{ ok: true; count: number } | { ok: false; brokenAt: number }> {
  const db = await getDb();
  const rows = await db.select().from(schema.auditLog).orderBy(asc(schema.auditLog.id));
  let prev = "";
  for (const r of rows) {
    const expected = sha256(prev + payloadOf({ at: r.at, userId: r.userId, entity: r.entity, entityId: r.entityId, action: r.action, detail: r.detail }));
    if (r.hash !== expected) return { ok: false, brokenAt: r.id };
    prev = r.hash;
  }
  return { ok: true, count: rows.length };
}
