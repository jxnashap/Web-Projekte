// Welche Anmeldung gilt? Mit Supabase-Schlüsseln: E-Mail + Passwort + Zwei-Faktor (TOTP).
// Ohne: Vorschau-Zugang mit gemeinsamem Passwort (nur für die lokale Vorschau gedacht).
export const authMode = (): "supabase" | "preview" =>
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "supabase" : "preview";
