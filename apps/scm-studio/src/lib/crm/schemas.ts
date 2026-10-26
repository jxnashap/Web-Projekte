// Prüfregeln für Anfragen und Kunden (zod, deutsche Meldungen). Getrennt von actions.ts,
// weil "use server"-Dateien nur async-Funktionen exportieren dürfen.
import { z } from "zod";
import { zBool, zOptDate, zOptText, zText } from "@/lib/action";
import { parseEuroToCents } from "@/lib/format";
import { BRANCHEN, CLIENT_STATUS, CONTACT_WAYS, LEAD_SCORE, LEAD_SOURCES, LEAD_STAGES, LEGAL_FORMS } from "@/lib/labels";
import { LEAD_BRANCHEN, PACKAGE_INTEREST, START_WISH } from "./labels";

const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [string, ...string[]];

export const STAGE_KEYS = LEAD_STAGES.map((s) => s.key) as [string, ...string[]];

const optEmail = z.email("Bitte eine gültige E-Mail-Adresse eingeben").max(160).optional();
const optPhone = z
  .string()
  .max(40, "Telefonnummer ist zu lang")
  .refine((v) => v.replace(/\D/g, "").length >= 6, "Telefonnummer prüfen")
  .optional();

export const leadSchema = z.object({
  name: zText("Name", 120),
  company: zText("Betrieb", 160),
  branche: z.enum(keys(LEAD_BRANCHEN)).optional(),
  ort: zOptText(120),
  phone: optPhone,
  email: optEmail,
  contactWay: z.enum(keys(CONTACT_WAYS)).optional(),
  source: z.enum(keys(LEAD_SOURCES)).default("sonstiges"),
  packageInterest: z.enum(keys(PACKAGE_INTEREST)).optional(),
  startWish: z.enum(keys(START_WISH)).optional(),
  score: z.enum([...keys(LEAD_SCORE), "auto"]).optional(),
  stage: z.enum(STAGE_KEYS).optional(),
  nextStep: zOptText(200),
  nextStepAt: zOptDate,
  message: zOptText(2000),
  notes: zOptText(4000),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const lostSchema = z.object({ lostReason: zText("Grund", 300) });

export const convertSchema = z.object({
  name: zText("Kundenname", 160),
  status: z.enum(["test", "aktiv"]),
  packageVideos: z.coerce.number().int().min(1).max(60).optional(),
});

/** Betrag in Euro ("1.600,00") → Cent; leer → null */
const zEuro = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    try {
      const cents = parseEuroToCents(v);
      if (cents < 0) throw new Error("negativ");
      return cents;
    } catch {
      ctx.addIssue({ code: "custom", message: "Betrag prüfen, z. B. 1.600,00" });
      return z.NEVER;
    }
  });

/** @handle, Profil-URL oder Name → reiner Benutzername */
const zHandle = z
  .string()
  .max(200)
  .optional()
  .transform((v) => {
    if (!v) return null;
    const m = v.match(/(?:instagram\.com|tiktok\.com)\/@?([^/?#\s]+)/i);
    return (m ? m[1] : v).replace(/^@/, "").trim() || null;
  });

export const clientSchema = z.object({
  name: zText("Name", 160),
  branche: z.enum(keys(BRANCHEN)).default("unternehmen"),
  status: z.enum(keys(CLIENT_STATUS)).default("aktiv"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Farbe wählen").default("#1F4E79"),
  contactName: zOptText(160),
  email: optEmail,
  phone: optPhone,
  website: zOptText(200),
  instagram: zHandle,
  tiktok: zHandle,
  street: zOptText(160),
  zip: z.string().max(10, "PLZ prüfen").optional(),
  city: zOptText(120),
  ort: zOptText(120),
  vatId: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\s+/g, "").toUpperCase() : null))
    .refine((v) => !v || /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v), "USt-IdNr. prüfen, z. B. DE123456789"),
  taxNumber: zOptText(40),
  legalForm: z.enum(keys(LEGAL_FORMS)).optional(),
  isMerchant: zBool,
  registerNumber: zOptText(80),
  signatoryName: zOptText(160),
  signatoryRole: zOptText(120),
  buyerReference: zOptText(200),
  packageVideos: z.coerce.number().int("Ganze Zahl").min(1, "Mindestens 1").max(60, "Höchstens 60").optional(),
  packagePrice: zEuro,
  startDate: zOptDate,
  notes: zOptText(8000),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const notesSchema = z.object({ notes: zOptText(8000) });
