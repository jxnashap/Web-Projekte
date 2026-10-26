// Links innerhalb des Kalenders (Zustand in der URL: Ansicht, Datum, Dialog).
import type { Tone } from "@/lib/labels";
import type { View } from "./dates";

export function calHref(p: { ansicht?: View; datum?: string; neu?: boolean; extra?: Record<string, string | number | undefined> }) {
  const q = new URLSearchParams();
  if (p.ansicht) q.set("ansicht", p.ansicht);
  if (p.datum) q.set("datum", p.datum);
  if (p.neu) q.set("neu", "1");
  for (const [k, v] of Object.entries(p.extra ?? {})) if (v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `/kalender?${s}` : "/kalender";
}

/** Link zum Termin; die Herkunftsansicht reist mit, damit "Kalender" dorthin zurückführt. */
export const eventHref = (id: number, view?: View) => `/kalender/${id}${view ? `?ansicht=${view}` : ""}`;

export const asView = (v: unknown): View | undefined => (v === "monat" || v === "woche" || v === "liste" ? v : undefined);

/**
 * Farben je Terminart (Fläche, Punkt, Badge-Ton). Rot bleibt Aktionen und Alarmen vorbehalten:
 * Dreh blau, Gespräch grün, Abgabe orange, Intern grau.
 */
export const KIND_STYLE: Record<string, { bg: string; dot: string; ring: string; tone: Tone }> = {
  dreh: { bg: "bg-info-soft", dot: "var(--color-info)", ring: "hover:ring-info/40", tone: "info" },
  gespraech: { bg: "bg-ok-soft", dot: "var(--color-ok)", ring: "hover:ring-ok/40", tone: "ok" },
  deadline: { bg: "bg-warn-soft", dot: "var(--color-warn)", ring: "hover:ring-warn/40", tone: "warn" },
  intern: { bg: "bg-fill", dot: "var(--color-muted)", ring: "hover:ring-ink/20", tone: "neutral" },
};
export const kindStyle = (k: string) => KIND_STYLE[k] ?? KIND_STYLE.intern;
