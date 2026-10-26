// Welche Anbindungen sind eingerichtet? Ohne Schlüssel läuft die App im Vorschau-/Demo-Modus.
import "server-only";

export const integrations = {
  supabase: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseStorage: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY),
  database: () => Boolean(process.env.DATABASE_URL),
  openai: () => Boolean(process.env.OPENAI_API_KEY),
  google: () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  instagram: () => Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET),
  tiktok: () => Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
  smtp: () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
};

/** Öffentliche Basis-URL (für OAuth-Rückleitungen, iCal-Links). */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
