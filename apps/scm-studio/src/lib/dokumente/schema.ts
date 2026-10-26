// Datenformen der vier Dokumentarten (Vertrag, Einwilligung, Drehplan, Monatsbericht).
// Ohne "server-only": wird von Formularen (Client), Server Actions und dem Seed genutzt.
import { z } from "zod";

/** Version des Vorlagensatzes (Vertrag + Einwilligung). Neue Fassung = neue Version = neue anwaltliche Freigabe. */
export const LEGAL_TEMPLATE_VERSION = "2026-10-v1";
export const REPORT_TEMPLATE_VERSION = "2026-10-v1";

export type DocKind = "vertrag" | "einwilligung" | "drehplan" | "monatsbericht";
export const DOC_KIND_KEYS: DocKind[] = ["vertrag", "einwilligung", "drehplan", "monatsbericht"];
export const isDocKind = (k: unknown): k is DocKind => typeof k === "string" && (DOC_KIND_KEYS as string[]).includes(k);
/** Tage im Papierkorb, danach wird ein gelöschtes Dokument samt PDF endgültig entfernt. */
export const TRASH_DAYS = 14;

export const needsSignature = (k: string) => k === "vertrag" || k === "einwilligung";

type StatusInfo = { label: string; tone: "neutral" | "info" | "ok" | "warn" | "accent" };

/**
 * Status je Dokumentart. "final" heißt bei Vertrag und Einwilligung "bereit zur Unterschrift",
 * bei Drehplan und Monatsbericht "als PDF abgelegt".
 */
export function docStatus(kind: string, status: string, revokedAt?: Date | string | null): StatusInfo {
  if (revokedAt) return { label: "Widerrufen", tone: "accent" };
  if (status === "unterschrieben") return { label: "Unterschrieben", tone: "ok" };
  if (status === "final") return needsSignature(kind) ? { label: "Bereit zur Unterschrift", tone: "warn" } : { label: "Abgelegt", tone: "info" };
  return { label: "Entwurf", tone: "neutral" };
}

/** Beschriftung der Aktion, die einen Entwurf festhält */
export const finalizeLabel = (kind: string) => (needsSignature(kind) ? "Zur Unterschrift freigeben" : "Abschließen und ablegen");

/** Filterwerte für den Status in der Liste (je Art nur die passenden) */
export const STATUS_FILTER: Record<string, { label: string; kinds: DocKind[] }> = {
  entwurf: { label: "Entwurf", kinds: ["vertrag", "einwilligung", "drehplan", "monatsbericht"] },
  bereit: { label: "Bereit zur Unterschrift", kinds: ["vertrag", "einwilligung"] },
  unterschrieben: { label: "Unterschrieben", kinds: ["vertrag", "einwilligung"] },
  widerrufen: { label: "Widerrufen", kinds: ["einwilligung"] },
  abgelegt: { label: "Abgelegt", kinds: ["drehplan", "monatsbericht"] },
};
export const statusFiltersFor = (kind?: DocKind) => Object.entries(STATUS_FILTER).filter(([, v]) => !kind || v.kinds.includes(kind));

/** Passt ein Dokument zum Statusfilter? */
export function matchesStatus(d: { kind: string; status: string; revokedAt?: Date | string | null }, filter: string) {
  switch (filter) {
    case "entwurf":
      return d.status === "entwurf";
    case "bereit":
      return d.status === "final" && needsSignature(d.kind);
    case "abgelegt":
      return d.status === "final" && !needsSignature(d.kind);
    case "unterschrieben":
      return d.status === "unterschrieben" && !d.revokedAt;
    case "widerrufen":
      return Boolean(d.revokedAt);
    default:
      return true;
  }
}

// ------------------------------------------------------------------
// Gemeinsame Bausteine
// ------------------------------------------------------------------
export type Strokes = number[][][];
/** Kurzbezeichnung je Unterschriftsrolle (für Übersichten und Prüfprotokoll) */
export const SIGNER_SHORT: Record<string, string> = {
  scm: "SCM",
  kunde: "Auftraggeber",
  person: "Gefilmte Person",
  sorge1: "Erziehungsberechtigte Person",
  sorge2: "Zweite erziehungsberechtigte Person",
  kind: "Minderjährige Person",
};
export type SignatureEntry = { role: string; label: string; name: string; strokes: Strokes; signedAt: string; byUserId?: number | null };

/** Momentaufnahme des Kunden beim Finalisieren (spätere Änderungen am Kunden ändern das Dokument nicht). */
export type PartySnapshot = {
  name: string;
  legalForm?: string | null;
  isMerchant?: boolean;
  registerNumber?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  vatId?: string | null;
  signatoryName?: string | null;
  signatoryRole?: string | null;
  email?: string | null;
};

const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const optText = (max = 2000) => z.string().max(max).optional();
const intIn = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `${label}: Zahl erwarten` }).int(`${label}: ganze Zahl`).min(min, `${label}: mindestens ${min}`).max(max, `${label}: höchstens ${max}`);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum wählen");
const listOf = <T extends string>(keys: readonly T[]) =>
  z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(keys as unknown as [T, ...T[]])));

// ------------------------------------------------------------------
// Dienstleistungsvertrag
// ------------------------------------------------------------------
export const LEISTUNGEN = {
  konzept: "Konzeption und Skripte",
  dreh: "Dreh vor Ort",
  schnitt: "Schnitt mit Untertiteln und Hochformat 9:16",
  posting: "Veröffentlichung und Community auf den Kanälen des Auftraggebers",
  ads: "Betreuung von Werbeanzeigen",
  bericht: "Monatsbericht mit Kennzahlen",
} as const;
export type LeistungKey = keyof typeof LEISTUNGEN;
const LEISTUNG_KEYS = Object.keys(LEISTUNGEN) as LeistungKey[];

export const PLATTFORMEN = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube Shorts",
  linkedin: "LinkedIn",
  website: "eigene Website des Auftraggebers",
} as const;
export type PlattformKey = keyof typeof PLATTFORMEN;
const PLATTFORM_KEYS = Object.keys(PLATTFORMEN) as PlattformKey[];

export const NUTZUNGSDAUER = {
  unbefristet: "zeitlich unbefristet",
  laufzeit: "für die Dauer dieses Vertrags",
  laufzeit_12: "für die Dauer dieses Vertrags und 12 Monate darüber hinaus",
} as const;

export const GEBIET = {
  weltweit: "weltweit, beschränkt auf die genannten Plattformen",
  dach: "Deutschland, Österreich und Schweiz",
  deutschland: "Deutschland",
} as const;

export const KI_REGEL = {
  keine: "SCM produziert die Videos ohne KI-generierte Bild-, Ton- oder Videoinhalte.",
  absprache: "KI-generierte oder KI-bearbeitete Inhalte setzt SCM nur nach vorheriger Absprache in Textform ein und kennzeichnet sie, soweit gesetzlich erforderlich.",
} as const;

export const EINWILLIGUNG_DURCH = {
  scm: "SCM holt die Einwilligungen der gefilmten Personen ein (Formular in SCM Studio).",
  kunde: "Der Auftraggeber holt die Einwilligungen seiner Mitarbeitenden und Gäste ein; SCM stellt dafür ein Formular bereit.",
} as const;

export const vertragSchema = z.object({
  paketVideos: intIn(1, 60, "Videos pro Monat"),
  preisEuro: z.string().regex(/^\d{1,6}([.,]\d{1,2})?$/, "Preis netto, z. B. 900 oder 900,00"),
  beginn: isoDate,
  mindestlaufzeitMonate: intIn(1, 36, "Mindestlaufzeit"),
  kuendigungsfristWochen: intIn(0, 26, "Kündigungsfrist"),
  drehtageProMonat: intIn(0, 20, "Drehtage"),
  korrekturschleifen: intIn(0, 10, "Korrekturschleifen"),
  freigabeTage: intIn(1, 30, "Freigabefrist"),
  leistungen: listOf(LEISTUNG_KEYS),
  plattformen: listOf(PLATTFORM_KEYS).refine((v) => v.length > 0, "Mindestens eine Plattform wählen"),
  organisch: bool,
  werbung: bool,
  nutzungsdauer: z.enum(Object.keys(NUTZUNGSDAUER) as [keyof typeof NUTZUNGSDAUER]),
  gebiet: z.enum(Object.keys(GEBIET) as [keyof typeof GEBIET]),
  exklusiv: bool,
  bearbeitung: bool,
  portfolio: bool,
  einwilligungenDurch: z.enum(["scm", "kunde"]),
  ki: z.enum(["keine", "absprache"]),
  avv: bool,
  gerichtsstand: optText(80),
  unterzeichnerName: optText(120),
  unterzeichnerFunktion: optText(120),
  besonderes: optText(3000),
});
export type VertragData = z.infer<typeof vertragSchema> & { party?: PartySnapshot; scmSignature?: SignatureEntry; signatures?: SignatureEntry[]; companySnapshot?: unknown };

export function defaultVertrag(c?: { packageVideos?: number | null; packagePriceCents?: number | null; startDate?: string | null; signatoryName?: string | null; signatoryRole?: string | null; contactName?: string | null }, today = new Date().toISOString().slice(0, 10)): z.infer<typeof vertragSchema> {
  const price = c?.packagePriceCents ?? null;
  return {
    paketVideos: c?.packageVideos ?? 4,
    preisEuro: price !== null ? (price / 100).toFixed(2).replace(".", ",") : "",
    beginn: c?.startDate && c.startDate >= today ? c.startDate : firstOfNextMonth(today),
    mindestlaufzeitMonate: 3,
    kuendigungsfristWochen: 4,
    drehtageProMonat: 1,
    korrekturschleifen: 2,
    freigabeTage: 5,
    leistungen: ["konzept", "dreh", "schnitt", "bericht"],
    plattformen: ["instagram", "tiktok"],
    organisch: true,
    werbung: false,
    nutzungsdauer: "unbefristet",
    gebiet: "weltweit",
    exklusiv: false,
    bearbeitung: false,
    portfolio: true,
    einwilligungenDurch: "scm",
    ki: "keine",
    avv: false,
    gerichtsstand: "",
    unterzeichnerName: c?.signatoryName ?? c?.contactName ?? "",
    unterzeichnerFunktion: c?.signatoryRole ?? "",
    besonderes: "",
  };
}

function firstOfNextMonth(today: string) {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------
// Einwilligung für Personen im Video
// ------------------------------------------------------------------
export const ROLLEN = {
  mitarbeitend: "Mitarbeitende des Auftraggebers",
  gast: "Gast oder Kundschaft",
  statist: "Statist oder Komparse",
  darsteller: "Darsteller (vergütet)",
} as const;

export const ZWECKE = {
  aufnahme: { label: "Aufnahme", text: "Ich willige ein, dass SCM mich am genannten Drehtag filmt und fotografiert." },
  kanaele: { label: "Kanäle des Auftraggebers", text: "Ich willige ein, dass Videos und Fotos mit mir auf den Social-Media-Kanälen und der Website des oben genannten Auftraggebers veröffentlicht werden." },
  werbung: { label: "Werbeanzeigen", text: "Ich willige ein, dass diese Videos und Fotos auch als bezahlte Werbeanzeigen ausgespielt werden." },
  portfolio: { label: "SCM-Portfolio", text: "Ich willige ein, dass SCM die Videos und Fotos als Arbeitsprobe auf eigenen Kanälen und der eigenen Website zeigt." },
} as const;
export type ZweckKey = keyof typeof ZWECKE;
export const ZWECK_KEYS = Object.keys(ZWECKE) as ZweckKey[];

export const einwilligungSchema = z
  .object({
    personName: z.string({ error: "Name fehlt" }).min(2, "Name fehlt").max(120),
    kontakt: optText(160),
    rolle: z.enum(Object.keys(ROLLEN) as [keyof typeof ROLLEN]),
    drehtag: isoDate,
    ort: optText(160),
    projekt: optText(400),
    minderjaehrig: bool,
    ab14: bool,
    erziehungsberechtigt1: optText(120),
    erziehungsberechtigt2: optText(120),
    alleinigesSorgerecht: bool,
    verantwortlich: z.enum(["kunde", "scm"]),
    verguetung: optText(200),
    zwecke: listOf(ZWECK_KEYS),
  })
  .superRefine((v, ctx) => {
    if (v.minderjaehrig && !v.erziehungsberechtigt1) ctx.addIssue({ code: "custom", path: ["erziehungsberechtigt1"], message: "Bei Minderjährigen unterschreibt die erziehungsberechtigte Person" });
    if (v.minderjaehrig && !v.alleinigesSorgerecht && !v.erziehungsberechtigt2)
      ctx.addIssue({ code: "custom", path: ["erziehungsberechtigt2"], message: "Bei gemeinsamer Sorge unterschreiben beide (oder alleiniges Sorgerecht ankreuzen)" });
  });
export type EinwilligungData = z.infer<typeof einwilligungSchema> & { party?: PartySnapshot; signatures?: SignatureEntry[]; companySnapshot?: unknown; zweckeBeiUnterschrift?: ZweckKey[] };

export function defaultEinwilligung(day: string, hasClient = true): z.infer<typeof einwilligungSchema> {
  return {
    personName: "",
    kontakt: "",
    rolle: "gast",
    drehtag: day,
    ort: "",
    projekt: "",
    minderjaehrig: false,
    ab14: false,
    erziehungsberechtigt1: "",
    erziehungsberechtigt2: "",
    alleinigesSorgerecht: false,
    verantwortlich: hasClient ? "kunde" : "scm",
    verguetung: "",
    zwecke: hasClient ? ["aufnahme", "kanaele"] : ["aufnahme", "portfolio"],
  };
}

/** Zwecke, die zur Einwilligung passen: ohne Auftraggeber gibt es keine "Kanäle des Auftraggebers". */
export const zweckKeysFor = (hasClient: boolean) => ZWECK_KEYS.filter((k) => hasClient || k !== "kanaele");

/** Verantwortliche Stelle (Art. 13 DSGVO) einer Einwilligung mit allem, was für die Datenschutzhinweise fehlt. */
export type ConsentController = { isClient: boolean; name: string; address: string; email: string; missing: string[] };

export function consentController(
  verantwortlich: "kunde" | "scm",
  party: PartySnapshot | null | undefined,
  company: { legalName?: string | null; street?: string | null; zip?: string | null; city?: string | null; email?: string | null } | null | undefined,
): ConsentController {
  const src = verantwortlich === "kunde" ? party : company ? { name: company.legalName, street: company.street, zip: company.zip, city: company.city, email: company.email } : null;
  const name = (src?.name ?? "").trim();
  const street = (src?.street ?? "").trim();
  const city = [src?.zip, src?.city].filter(Boolean).join(" ").trim();
  const email = (src?.email ?? "").trim();
  const missing: string[] = [];
  if (!name) missing.push(verantwortlich === "kunde" ? "der Auftraggeber" : "der Firmenname");
  if (!street || !src?.city) missing.push("die Anschrift");
  if (!email) missing.push("die E-Mail");
  return { isClient: verantwortlich === "kunde", name, address: [street, city].filter(Boolean).join(", "), email, missing };
}

/** Satz für die Oberfläche, wenn die verantwortliche Stelle unvollständig ist (sonst null). */
export function controllerProblem(c: ConsentController, hasClient: boolean): string | null {
  if (c.isClient && !hasClient) return "Ohne Auftraggeber ist SCM verantwortlich. Bitte bei „Verantwortlich“ SCM wählen.";
  if (!c.missing.length) return null;
  const list = c.missing.join(" und ");
  const verb = c.missing.length > 1 ? "fehlen" : "fehlt";
  return c.isClient
    ? `Beim Kunden ${verb} ${list} für Datenschutzfragen. Bitte im Kunden ergänzen oder SCM als verantwortlich wählen.`
    : `In den Firmendaten von SCM ${verb} ${list}. Bitte unter Einstellungen, Firma ergänzen.`;
}

/** Welche Unterschriften braucht eine Einwilligung? (Minderjährige: Sorgeberechtigte, ab etwa 14 Jahren zusätzlich das Kind) */
export function consentSigners(d: Pick<EinwilligungData, "personName" | "minderjaehrig" | "ab14" | "erziehungsberechtigt1" | "erziehungsberechtigt2" | "alleinigesSorgerecht">) {
  if (!d.minderjaehrig) return [{ role: "person", label: "Unterschrift der gefilmten Person", name: d.personName }];
  const out = [{ role: "sorge1", label: "Unterschrift erziehungsberechtigte Person", name: d.erziehungsberechtigt1 ?? "" }];
  if (!d.alleinigesSorgerecht && d.erziehungsberechtigt2) out.push({ role: "sorge2", label: "Unterschrift zweite erziehungsberechtigte Person", name: d.erziehungsberechtigt2 });
  if (d.ab14) out.push({ role: "kind", label: "Unterschrift der minderjährigen Person", name: d.personName });
  return out;
}

// ------------------------------------------------------------------
// Drehplan
// ------------------------------------------------------------------
export const drehplanSchema = z.object({
  drehtag: isoDate,
  eventId: z.coerce.number().int().optional(),
  ort: optText(200),
  treffpunkt: optText(200),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Uhrzeit wählen").optional(),
  ende: z.string().regex(/^\d{2}:\d{2}$/, "Uhrzeit wählen").optional(),
  ansprechpartner: optText(160),
  ansprechpartnerTelefon: optText(60),
  teamIds: z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.coerce.number().int())),
  zeitplan: optText(3000), // je Zeile "09:00 Aufbau"
  requisiten: optText(3000), // je Zeile ein Punkt
  checkliste: optText(3000),
  notizen: optText(3000),
});
export type DrehplanData = z.infer<typeof drehplanSchema> & { snapshot?: DrehplanSnapshot; party?: PartySnapshot };
export type DrehplanSnapshot = {
  videos: { id: number; title: string; format: string | null; status: string; script: { title: string; hook: string | null; beats: { tc: string; label: string; text: string; shot?: string }[] } | null }[];
  team: { id: number; name: string; initials: string }[];
};

export const DEFAULT_CHECKLISTE = ["Akkus geladen, Ersatz dabei", "Speicherkarten leer", "Mikrofone getestet", "Einwilligungen für alle Personen im Bild", "Musik nur aus der Plattform-Bibliothek planen"].join("\n");

// ------------------------------------------------------------------
// Monatsbericht
// ------------------------------------------------------------------
export const monatsberichtSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Monat wählen"),
  highlights: optText(2000),
  ausblick: optText(3000),
});
export type MonatsberichtData = z.infer<typeof monatsberichtSchema> & { snapshot?: ReportSnapshot; party?: PartySnapshot };

export type ReportVideo = {
  id: number;
  title: string;
  format: string | null;
  status: string;
  postDate: string | null;
  url: string | null;
  views: number;
  reach: number | null;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
  measuredOn: string | null;
};
export type ReportTotals = { videos: number; views: number; reach: number; likes: number; comments: number; shares: number; saves: number; interactions: number };
export type ReportSnapshot = {
  month: string;
  produced: number;
  posted: number;
  videos: ReportVideo[];
  totals: ReportTotals;
  prevTotals: ReportTotals;
  kontingent: { soll: number; fertig: number; geplant: number } | null;
  stand: string | null; // letzter Messtag
  demo: boolean;
};

export const interactionsOf = (v: { likes: number; comments: number; shares: number | null; saves: number | null }) => v.likes + v.comments + (v.shares ?? 0) + (v.saves ?? 0);

/** Zeilen aus einem Textfeld (leere Zeilen weg) */
export const lines = (t?: string | null) => (t ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Kanonisches JSON (Schlüssel sortiert) für reproduzierbare Inhalts-Hashes */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as object)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v ?? null);
}

/** Strich-Geometrie validieren (nur x/y, keine Zeit/Druck = keine biometrischen Daten) */
export const strokesSchema = z
  .array(z.array(z.tuple([z.number().finite(), z.number().finite()])).min(1).max(4000))
  .min(1, "Bitte unterschreiben")
  .max(300)
  .refine((s) => s.reduce((n, st) => n + st.length, 0) <= 20000, "Unterschrift zu groß");
