// Testlink auf Vercel ohne Supabase: legt beim Build die Demo-Daten an und packt sie zusammen.
// Ergebnis: .data/demo/pglite.tar.gz (Datenbank) und .data/demo/files/ (Belege, Rechnungs-PDFs).
// Zur Laufzeit lädt src/db/connect.ts beides in den Speicher bzw. nach /tmp.
// Aufruf: npm run build:vercel (macht danach "next build"). Mit DATABASE_URL (Supabase) passiert nichts.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL gesetzt: keine Demo-Daten, die App nutzt die echte Datenbank.");
    return;
  }
  const work = path.join(process.cwd(), ".data", "demo-build", "pglite");
  const out = path.join(process.cwd(), ".data", "demo");
  fs.rmSync(work, { recursive: true, force: true });
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  execFileSync(process.execPath, [path.join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/seed.ts"], {
    stdio: "inherit",
    env: { ...process.env, PGLITE_DIR: work, FILES_DIR: path.join(out, "files") },
  });

  const pg = await PGlite.create(work);
  const dump = await pg.dumpDataDir("gzip");
  await pg.close();
  const file = path.join(out, "pglite.tar.gz");
  fs.writeFileSync(file, Buffer.from(await dump.arrayBuffer()));
  fs.rmSync(path.dirname(work), { recursive: true, force: true });
  console.log(`Demo-Datenbank gepackt: ${(fs.statSync(file).size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
