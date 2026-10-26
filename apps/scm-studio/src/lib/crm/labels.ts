// Begriffe für Anfragen und Kunden. Die Quiz-Labels und die A/B/C-Einstufung sind 1:1 aus
// webseiten/scm-creatives/api/anfrage.js übernommen, damit Website und Studio gleich sprechen.

export const QUIZ_LABELS = {
  branche: { gastronomie: "Gastronomie", immobilien: "Immobilien", handwerk: "Handwerk", unternehmen: "Unternehmen", andere: "Andere Branche" },
  ziel: { gaeste: "Mehr Gäste oder Kunden", anfragen: "Mehr Anfragen", mitarbeiter: "Mitarbeitende finden", bekanntheit: "Bekannter werden in der Region", mehreres: "Mehreres davon" },
  paket: { "4": "4 Videos im Monat", "8": "8 Videos im Monat", "12": "12 Videos im Monat", offen: "Wissen wir noch nicht" },
  extras: { posting: "Posting und Community", ads: "Werbeanzeigen", recruiting: "Recruiting-Videos", fotos: "Fotos oder Imagefilm" },
  start: { sofort: "So bald wie möglich", "1-3": "In 1 bis 3 Monaten", spaeter: "Später, erst mal informieren" },
  region: { kiel: "Kiel und Umgebung", luebeck: "Lübeck und Lübecker Bucht", woanders: "Woanders" },
  kontaktweg: { anruf: "Anruf", whatsapp: "WhatsApp", email: "E-Mail" },
} as const satisfies Record<string, Record<string, string>>;

export type QuizKey = keyof typeof QUIZ_LABELS;

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
export const quizLabel = (k: QuizKey, v: string | null | undefined) =>
  v && has(QUIZ_LABELS[k], v) ? (QUIZ_LABELS[k] as Record<string, string>)[v] : (v ?? "");

/** Einstufung wie auf der Website: A = großes Paket und schneller Start, B = konkreter Start oder großes Paket, C = erst informieren. */
export function scoreFor(paket?: string | null, start?: string | null): "A" | "B" | "C" {
  const big = paket === "8" || paket === "12";
  return big && start === "sofort" ? "A" : start === "sofort" || start === "1-3" || big ? "B" : "C";
}

export const SCORE_TEXT: Record<string, string> = {
  A: "Großes Paket und schneller Start. Am besten heute zurückrufen.",
  B: "Konkretes Interesse. Innerhalb der zugesagten Antwortzeit melden.",
  C: "Möchte sich erst informieren.",
};

/** Paketwunsch der Anfrage (Spalte package_interest) */
export const PACKAGE_INTEREST: Record<string, string> = {
  "4": "4 Videos im Monat",
  "8": "8 Videos im Monat",
  "12": "12 Videos im Monat",
  unsicher: "Noch offen",
};

/** Kurzform für Karten und Listen */
export const packageShort = (k?: string | null) =>
  !k ? "" : k === "unsicher" ? "Paket offen" : `${k} Videos`;

/** Startwunsch (Spalte start_wish) */
export const START_WISH: Record<string, string> = {
  sofort: "So bald wie möglich",
  "1-3": "In 1 bis 3 Monaten",
  spaeter: "Später",
};

/** Branchen inklusive "andere" aus dem Quiz */
export const LEAD_BRANCHEN: Record<string, string> = {
  gastronomie: "Gastronomie",
  immobilien: "Immobilien",
  handwerk: "Handwerk",
  unternehmen: "Unternehmen",
  andere: "Andere Branche",
};

/** Ruhige Kundenfarben (gut lesbar auf Weiß, unterscheidbar im Kalender) */
export const CLIENT_COLORS = [
  "#1F4E79",
  "#2E7D32",
  "#3E7C59",
  "#B5651D",
  "#8E2A1C",
  "#6D2E46",
  "#5B4B8A",
  "#0F766E",
  "#A16207",
  "#E1251B",
  "#3D3D42",
];

/** Deutsche Nummer für tel: und wa.me (0431 … → +49431 …), wie auf der Website. */
export function intlPhone(tel: string): string {
  let d = tel.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  else if (d.startsWith("0")) d = "+49" + d.slice(1);
  else if (!d.startsWith("+")) d = "+49" + d;
  if (d.startsWith("+490")) d = "+49" + d.slice(4);
  return d;
}

export const telHref = (tel: string) => `tel:${intlPhone(tel)}`;
export const waHref = (tel: string) => `https://wa.me/${intlPhone(tel).replace("+", "")}`;
export const mailHref = (mail: string) => `mailto:${mail}`;
export const hasPhone = (tel?: string | null): tel is string => Boolean(tel && tel.replace(/\D/g, "").length >= 6);

export const igHref = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
export const tiktokHref = (handle: string) => `https://www.tiktok.com/@${handle.replace(/^@/, "")}`;
export const webHref = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);

/** Aufrufe lesbar: bis 9.999 genau, darüber kompakt (12.400 → 12,4 Tsd.) */
export const views = (n: number) =>
  n < 10000 ? new Intl.NumberFormat("de-DE").format(n) : new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 }).format(n);
