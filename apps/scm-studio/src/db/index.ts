// Datenbankzugang für die App: lokal PGlite (eingebettetes Postgres in .data/), mit DATABASE_URL
// Postgres über postgres.js (Supabase, Transaction Pooler, daher prepare: false).
import "server-only";
import { connection } from "next/server";
import { connect, type DB } from "./connect";
import * as schema from "./schema";

const g = globalThis as unknown as { __scmDb?: Promise<DB> };

/**
 * Datenbank holen. connection() sorgt dafür, dass Datenbankabfragen nie beim Bauen (Prerendering) laufen:
 * PGlite antwortet so schnell, dass Next sie sonst für statisch hält und mitrendert.
 */
export async function getDb(): Promise<DB> {
  try {
    await connection();
  } catch (err) {
    // Außerhalb von Next (Seed, Skripte) gibt es keinen Request: dann ohne Prüfung weiter.
    // Alle anderen Signale von Next (z. B. "dynamisch rendern") müssen durchgereicht werden.
    if (!(err instanceof Error && err.message.includes("outside a request scope"))) throw err;
  }
  if (!g.__scmDb) g.__scmDb = connect();
  return g.__scmDb;
}

export { schema };
export type { DB };
