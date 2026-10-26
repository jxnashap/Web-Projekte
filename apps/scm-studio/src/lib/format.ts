// Deutsche Formatierung für Geld, Zahlen und Datum.
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { inBerlin } from "./time";

const eurFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const eurRound = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("de-DE");
const compactFmt = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });

export const eur = (cents: number | null | undefined) => eurFmt.format((cents ?? 0) / 100);
export const eurShort = (cents: number | null | undefined) => eurRound.format((cents ?? 0) / 100);
export const num = (n: number | null | undefined) => numFmt.format(n ?? 0);
export const compact = (n: number | null | undefined) => compactFmt.format(n ?? 0);
export const pct = (x: number, digits = 1) =>
  new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: digits }).format(x);

// Immer in Berliner Zeit formatieren (Server laufen in UTC).
const toDate = (v: string | Date) => (typeof v === "string" ? parseISO(v, { in: inBerlin }) : v);
type D = string | Date | null | undefined;
export const fmt = (v: D, pattern: string) => (v ? format(toDate(v), pattern, { locale: de, in: inBerlin }) : "");
export const dateDe = (v: D) => fmt(v, "dd.MM.yyyy");
export const dateShort = (v: D) => fmt(v, "d. MMM");
export const dateLong = (v: D) => fmt(v, "EEEE, d. MMMM yyyy");
export const weekday = (v: D) => fmt(v, "EEEEEE");
export const time = (v: D) => fmt(v, "HH:mm");
export const dateTime = (v: D) => fmt(v, "dd.MM.yyyy, HH:mm");
export const monthLabel = (ym: string) => fmt(`${ym}-01`, "MMMM yyyy");
export const monthShort = (ym: string) => fmt(`${ym}-01`, "MMM yy");

/** "1.234,56" oder "1234.56" → Cent */
export function parseEuroToCents(input: FormDataEntryValue | null): number {
  const raw = String(input ?? "").trim().replace(/\s|€/g, "");
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error(`Ungültiger Betrag: ${raw}`);
  return Math.round(value * 100);
}
