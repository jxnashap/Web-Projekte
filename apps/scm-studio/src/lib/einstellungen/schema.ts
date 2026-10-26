// Formen und Prüfungen der Einstellungen (ohne server-only, auch im Browser nutzbar).
import { z } from "zod";

/** IBAN-Prüfung nach ISO 13616 (Prüfziffer mod 97), deutsche IBAN zusätzlich mit 22 Stellen */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  if (iban.startsWith("DE") && iban.length !== 22) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of digits) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

const opt = (max = 200) => z.string().max(max).optional();

export const companySchema = z.object({
  brand: z.string({ error: "Markenname fehlt" }).min(2, "Markenname fehlt").max(80),
  legalName: z.string({ error: "Firmenname fehlt" }).min(2, "Firmenname fehlt").max(120),
  owner: opt(120),
  street: z.string({ error: "Straße fehlt" }).min(3, "Straße fehlt").max(120),
  zip: z.string({ error: "PLZ fehlt" }).regex(/^\d{5}$/, "PLZ mit 5 Ziffern"),
  city: z.string({ error: "Ort fehlt" }).min(2, "Ort fehlt").max(80),
  vatId: z
    .string()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .refine((v) => !v.startsWith("DE") || /^DE\d{9}$/.test(v), "Deutsche USt-IdNr.: DE und 9 Ziffern")
    .optional(),
  taxNumber: opt(40),
  email: z.email("Bitte eine gültige E-Mail eingeben").optional(),
  phone: opt(40),
  web: opt(120),
  bankName: opt(80),
  iban: z
    .string()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .refine(isValidIban, "IBAN ungültig (Prüfziffer stimmt nicht)")
    .optional(),
  bic: z
    .string()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .refine((v) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v), "BIC mit 8 oder 11 Zeichen")
    .optional(),
  paymentDays: z.coerce.number({ error: "Zahl erwarten" }).int("ganze Zahl").min(0, "mindestens 0").max(90, "höchstens 90 Tage"),
  smallBusiness: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const AI_MODELS = [
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", hint: "Standard. Laut OpenAI fast so stark wie Astra zu einem Fünftel des Preises. 2 / 10 USD je 1 Mio. Tokens, etwa 0,01 bis 0,02 USD pro Skript." },
  { id: "gpt-6-astra", label: "GPT-6 Astra", hint: "Premium für wichtige Pitches. 10 / 50 USD je 1 Mio. Tokens, etwa 0,06 bis 0,10 USD pro Skript." },
  { id: "gpt-6-luna", label: "GPT-6 Luna", hint: "Günstig für Kleinkram wie Hashtags und Captions. 0,10 / 0,50 USD je 1 Mio. Tokens." },
] as const;

export const AI_EFFORTS = {
  none: "Kein Nachdenken (am schnellsten)",
  low: "Niedrig (empfohlen für kreative Texte)",
  medium: "Mittel",
  high: "Hoch (langsam, teurer)",
} as const;

export const aiSchema = z.object({
  model: z.string().regex(/^[a-z0-9][a-z0-9.\-]{2,60}$/, "Modell-ID wie gpt-6.1-sol"),
  effort: z.enum(Object.keys(AI_EFFORTS) as [keyof typeof AI_EFFORTS]),
});
export type AiSettings = z.infer<typeof aiSchema>;
export const AI_DEFAULT: AiSettings = { model: "gpt-6.1-sol", effort: "low" };

export const legalSchema = z.object({
  approvedBy: z.string({ error: "Kanzlei oder Name fehlt" }).min(3, "Kanzlei oder Name fehlt").max(160),
  approvedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum wählen"),
  confirm: z.literal("on", { error: "Bitte bestätigen" }),
});

export const AVV_PROVIDERS = [
  { key: "supabase", label: "Supabase", note: "Datenbank, Anmeldung, Dateien. DPA zur Selbstbedienung (supabase.com/legal/dpa)." },
  { key: "vercel", label: "Vercel", note: "Hosting. DPA, zertifiziert nach EU-U.S. Data Privacy Framework." },
  { key: "openai", label: "OpenAI", note: "Skript-Entwürfe. store:false, keine Personendaten; Missbrauchsprotokolle bis 30 Tage." },
  { key: "google", label: "Google", note: "Kalender. Für Firmen besser Workspace statt privatem Gmail." },
  { key: "meta", label: "Meta", note: "Instagram-Statistik der Kunden (später)." },
] as const;
export type AvvKey = (typeof AVV_PROVIDERS)[number]["key"];
export type PrivacySettings = { avv: Partial<Record<AvvKey, string>> };

export const privacySchema = z.object(
  Object.fromEntries(AVV_PROVIDERS.map((p) => [p.key, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum wählen").optional()])) as Record<AvvKey, z.ZodOptional<z.ZodString>>,
);
