// Verbindungsaufbau ohne "server-only", damit auch Skripte (Seed, Tests) ihn nutzen können.
import fs from "node:fs";
import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

/** Dateiablage des Testlinks auf Vercel (dort ist nur /tmp beschreibbar). */
export const DEMO_FILES_DIR = "/tmp/scm-files";

/**
 * Testlink auf Vercel ohne Supabase: die beim Build gepackten Demo-Daten (scripts/demo-snapshot.ts) laufen im
 * Speicher. Änderungen gelten nur, bis Vercel die Funktion neu startet, und jede Instanz hat ihren eigenen Stand.
 */
async function connectDemoSnapshot(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "demo");
  const files = process.env.FILES_DIR ?? DEMO_FILES_DIR;
  // turbopackIgnore: Pfade erst zur Laufzeit bekannt; sonst verfolgt der Bundler das ganze Projekt in jede Function
  if (!fs.existsSync(/*turbopackIgnore: true*/ files)) fs.cpSync(/*turbopackIgnore: true*/ path.join(dir, "files"), files, { recursive: true });
  const tar = fs.readFileSync(/*turbopackIgnore: true*/ path.join(dir, "pglite.tar.gz"));
  const client = await PGlite.create({ loadDataDir: new Blob([tar]) });
  return drizzle(client, { schema }) as unknown as DB;
}

export async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    // Supabase Transaction Pooler (Port 6543): keine Prepared Statements; wenige Verbindungen je Function-Instanz.
    // max_pipeline 1: Der Pooler verträgt keine mehrfach hintereinander geschickten Abfragen auf einer Verbindung,
    // Seiten mit vielen parallelen Abfragen blieben sonst hängen. Dafür ein paar Verbindungen mehr.
    // (max_pipeline fehlt in den Typen von postgres.js, existiert aber; Standard 100.)
    const options = { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 5), max_pipeline: 1, idle_timeout: 20, connect_timeout: 10 };
    let client: ReturnType<typeof postgres>;
    try {
      client = postgres(url, options as Parameters<typeof postgres>[1]);
    } catch (err) {
      // Häufigster Grund: Sonderzeichen im Datenbank-Passwort. Die Adresse selbst nicht ausgeben (enthält das Passwort).
      throw new Error(
        "DATABASE_URL lässt sich nicht lesen. Sonderzeichen im Passwort (# % ? /) müssen kodiert sein (z. B. # als %23), " +
          "einfacher ist ein Passwort nur aus Buchstaben und Ziffern. Eckige Klammern um das Passwort gehören nicht hinein.",
        { cause: err },
      );
    }
    return drizzle(client, { schema });
  }
  // PGLITE_DIR gesetzt heißt: bewusst eine Datei-Datenbank (z. B. beim Erzeugen der Demo-Daten im Vercel-Build)
  if (process.env.VERCEL && !process.env.PGLITE_DIR) return connectDemoSnapshot();
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
