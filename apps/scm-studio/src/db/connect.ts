// Verbindungsaufbau ohne "server-only", damit auch Skripte (Seed, Tests) ihn nutzen können.
import fs from "node:fs";
import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

export async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    // Supabase Transaction Pooler (Port 6543): keine Prepared Statements; wenige Verbindungen je Function-Instanz
    const client = postgres(url, { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 3), idle_timeout: 20, connect_timeout: 10 });
    return drizzle(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as DB;
}
