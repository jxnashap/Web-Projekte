import { defineConfig } from "drizzle-kit";

// Migrationen erzeugen: npm run db:generate
// Auf Supabase anwenden: MIGRATION_DATABASE_URL (Session Pooler, Port 5432) setzen, dann npm run db:migrate
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["studio"],
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgres://localhost/scm_studio" },
});
