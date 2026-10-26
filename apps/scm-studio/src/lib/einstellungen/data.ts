// Daten der Einstellungen (nur Server). Umgebungsvariablen werden nur auf Vorhandensein geprüft, Werte nie ausgegeben.
import "server-only";
import { and, asc, count, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { authMode } from "@/lib/auth-mode";
import { getCompany, getSetting, isDemo } from "@/lib/settings";
import { monthRange, monthIso } from "@/lib/time";
import { DEFAULT_REFERENZEN, REFERENZEN_KEY } from "@/lib/skripte/engine/referenzen";
import { AI_DEFAULT, type AiSettings, type PrivacySettings } from "./schema";

export type Integration = { key: string; label: string; purpose: string; vars: string[]; optional?: string[]; ok: boolean; missing: string[]; later?: boolean };

const has = (v: string) => Boolean(process.env[v]);

function integration(key: string, label: string, purpose: string, vars: string[], extra: Partial<Integration> = {}): Integration {
  const missing = vars.filter((v) => !has(v));
  return { key, label, purpose, vars, ok: missing.length === 0, missing, ...extra };
}

export function getIntegrations(): Integration[] {
  return [
    integration("db", "Datenbank (Supabase Postgres)", "Alle Daten; ohne läuft die lokale Vorschau-Datenbank", ["DATABASE_URL"], { optional: ["MIGRATION_DATABASE_URL"] }),
    integration("auth", "Anmeldung (Supabase Auth)", "E-Mail, Passwort und Zwei-Faktor; ohne gilt der Vorschau-Zugang", ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]),
    integration("storage", "Dateiablage (Supabase Storage)", "Belege, Rechnungen, unterschriebene Dokumente", ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"], { optional: ["SUPABASE_STORAGE_BUCKET"] }),
    integration("openai", "OpenAI", "Skript-Entwürfe; ohne läuft der Demo-Generator", ["OPENAI_API_KEY"]),
    integration("google", "Google Kalender", "Drehs in einen eigenen Kalender spiegeln", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]),
    integration("instagram", "Instagram", "Zahlen der Kunden automatisch abholen", ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"]),
    integration("tiktok", "TikTok", "Zahlen von TikTok (braucht App-Prüfung)", ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"], { later: true }),
    integration("smtp", "E-Mail-Versand (SMTP)", "Rechnungen und Berichte direkt verschicken", ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"], { optional: ["SMTP_PORT"] }),
    integration("leads", "Website-Anfragen", "Quiz der Website legt Anfragen direkt an", ["LEADS_WEBHOOK_SECRET"]),
    integration("security", "Sicherheit und Betrieb", "Sitzungen, Verschlüsselung der Zugänge, geplante Aufgaben, Adresse", ["SESSION_SECRET", "TOKEN_ENC_KEY", "CRON_SECRET", "APP_URL"]),
  ];
}

export async function getSettingsOverview() {
  await requireUser();
  const db = await getDb();
  const year = Number(monthIso().slice(0, 4));
  const { from } = monthRange(monthIso());
  const [company, team, sequences, ai, legal, privacy, demo, aiRuns, referenzen] = await Promise.all([
    getCompany(),
    db.select().from(schema.teamMembers).orderBy(asc(schema.teamMembers.id)),
    db.select().from(schema.numberSequences).where(eq(schema.numberSequences.year, year)),
    getSetting<AiSettings>("ai", AI_DEFAULT),
    getSetting<{ approvedVersion: string; approvedBy: string; approvedAt: string } | null>("legal", null),
    getSetting<PrivacySettings>("privacy", { avv: {} }),
    isDemo(),
    db.select({ n: count() }).from(schema.aiRuns).where(and(gte(schema.aiRuns.at, new Date(`${from}T00:00:00Z`)))),
    getSetting<string>(REFERENZEN_KEY, ""),
  ]);
  const integrations = getIntegrations();
  return {
    company,
    team,
    year,
    sequences,
    ai: { ...AI_DEFAULT, ...ai },
    legal,
    privacy: { avv: privacy?.avv ?? {} },
    demo,
    aiRunsMonth: aiRuns[0]?.n ?? 0,
    referenzen: referenzen.trim() || DEFAULT_REFERENZEN,
    integrations,
    authMode: authMode(),
  };
}

export const SEQ_PREFIX: Record<string, string> = { rechnung: "RE", angebot: "AN", storno: "ST" };
export const SEQ_LABEL: Record<string, string> = { rechnung: "Rechnungen", angebot: "Angebote", storno: "Stornos" };
export const nextNumber = (kind: string, year: number, next: number) => `${SEQ_PREFIX[kind] ?? kind.toUpperCase()}-${year}-${String(next).padStart(4, "0")}`;
