// Zentrale Begriffe und Status (deutsch), damit alle Bereiche gleich sprechen.
export type Tone = "neutral" | "accent" | "ok" | "warn" | "info" | "dark";

export const BRANCHEN: Record<string, string> = {
  gastronomie: "Gastronomie",
  immobilien: "Immobilien",
  handwerk: "Handwerk",
  unternehmen: "Unternehmen",
};

export const CLIENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  test: { label: "Testvideos", tone: "warn" },
  aktiv: { label: "Aktiv", tone: "ok" },
  pausiert: { label: "Pausiert", tone: "neutral" },
  beendet: { label: "Beendet", tone: "neutral" },
};

export const LEAD_STAGES = [
  { key: "neu", label: "Neu" },
  { key: "kontaktiert", label: "Kontaktiert" },
  { key: "kennenlernen", label: "Kennenlernen" },
  { key: "testvideos", label: "Testvideos" },
  { key: "angebot", label: "Angebot" },
  { key: "gewonnen", label: "Gewonnen" },
  { key: "verloren", label: "Verloren" },
] as const;

export const LEAD_SCORE: Record<string, { label: string; tone: Tone; hint: string }> = {
  A: { label: "A", tone: "accent", hint: "Heute zurückrufen" },
  B: { label: "B", tone: "warn", hint: "Innerhalb von 24 Stunden" },
  C: { label: "C", tone: "neutral", hint: "Will sich informieren" },
};

export const VIDEO_STATUS = [
  { key: "idee", label: "Idee", tone: "neutral" },
  { key: "skript", label: "Skript", tone: "info" },
  { key: "dreh", label: "Dreh", tone: "warn" },
  { key: "schnitt", label: "Schnitt", tone: "warn" },
  { key: "fertig", label: "Fertig", tone: "ok" },
  { key: "online", label: "Online", tone: "dark" },
] as const satisfies readonly { key: string; label: string; tone: Tone }[];

export const videoStatus = (k: string) => VIDEO_STATUS.find((s) => s.key === k) ?? VIDEO_STATUS[0];

export const EVENT_KINDS: Record<string, { label: string; tone: Tone }> = {
  dreh: { label: "Dreh", tone: "info" },
  gespraech: { label: "Gespräch", tone: "ok" },
  deadline: { label: "Abgabe", tone: "warn" },
  intern: { label: "Intern", tone: "neutral" },
};

export const INVOICE_STATUS: Record<string, { label: string; tone: Tone }> = {
  entwurf: { label: "Entwurf", tone: "neutral" },
  offen: { label: "Offen", tone: "warn" },
  bezahlt: { label: "Bezahlt", tone: "ok" },
  storniert: { label: "Storniert", tone: "neutral" },
  versendet: { label: "Versendet", tone: "info" },
  angenommen: { label: "Angenommen", tone: "ok" },
  abgelehnt: { label: "Abgelehnt", tone: "neutral" },
};

export const DOC_KINDS: Record<string, { label: string; plural: string; hint: string }> = {
  vertrag: { label: "Dienstleistungsvertrag", plural: "Verträge", hint: "Paketvertrag mit Laufzeit und Nutzungsrechten" },
  einwilligung: { label: "Einwilligung", plural: "Einwilligungen", hint: "Für Personen im Video (KUG, DSGVO)" },
  drehplan: { label: "Drehplan", plural: "Drehpläne", hint: "Briefing und Shotlist für den Drehtag" },
  monatsbericht: { label: "Monatsbericht", plural: "Monatsberichte", hint: "Leistungen und Zahlen für den Kunden" },
};

export const EXPENSE_CATEGORIES: Record<string, string> = {
  technik: "Technik und Equipment",
  software: "Software und Abos",
  werbung: "Werbeanzeigen",
  fahrt: "Fahrtkosten",
  musik: "Musik und Lizenzen",
  buero: "Büro",
  bewirtung: "Bewirtung",
  fremdleistung: "Fremdleistungen",
  sonstiges: "Sonstiges",
};

export const LEGAL_FORMS: Record<string, { label: string; merchant: boolean | null }> = {
  einzelunternehmen: { label: "Einzelunternehmen (nicht eingetragen)", merchant: false },
  ek: { label: "e. K. (eingetragener Kaufmann)", merchant: true },
  gbr: { label: "GbR", merchant: false },
  ohg: { label: "OHG", merchant: true },
  kg: { label: "KG", merchant: true },
  gmbh: { label: "GmbH", merchant: true },
  ug: { label: "UG (haftungsbeschränkt)", merchant: true },
  gmbh_co_kg: { label: "GmbH & Co. KG", merchant: true },
  ag: { label: "AG", merchant: true },
  verein: { label: "Verein", merchant: false },
  freiberuf: { label: "Freiberufler", merchant: false },
  sonstige: { label: "Sonstige", merchant: null },
};

/** Einheiten für Rechnungspositionen mit UN/ECE-Code (Rec. 20) für die E-Rechnung */
export const UNITS: Record<string, { label: string; code: string }> = {
  stueck: { label: "Stück", code: "C62" },
  pauschal: { label: "Pauschal", code: "LS" },
  monat: { label: "Monat", code: "MON" },
  stunde: { label: "Stunde", code: "HUR" },
  tag: { label: "Tag", code: "DAY" },
  km: { label: "km", code: "KMT" },
};

export const PAYMENT_METHODS: Record<string, string> = {
  ueberweisung: "Überweisung",
  lastschrift: "Lastschrift",
  karte: "Karte",
  paypal: "PayPal",
  bar: "Bar",
};

export const PLATFORMS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  beide: "Instagram + TikTok",
};

export const LEAD_SOURCES: Record<string, string> = {
  website: "Website-Quiz",
  instagram: "Instagram",
  empfehlung: "Empfehlung",
  telefon: "Anruf",
  sonstiges: "Sonstiges",
};

export const CONTACT_WAYS: Record<string, string> = {
  anruf: "Anruf",
  whatsapp: "WhatsApp",
  mail: "E-Mail",
};
