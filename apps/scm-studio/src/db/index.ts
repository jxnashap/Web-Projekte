// Datenbankzugang für die App: lokal PGlite (eingebettetes Postgres in .data/), mit DATABASE_URL
// Postgres über postgres.js (Supabase, Transaction Pooler, daher prepare: false).
import "server-only";
import { connect, type DB } from "./connect";
import * as schema from "./schema";

const g = globalThis as unknown as { __scmDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__scmDb) g.__scmDb = connect();
  return g.__scmDb;
}

export { schema };
export type { DB };
