// Links innerhalb des Kalenders (Zustand in der URL: Ansicht, Datum, Dialog).
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

/** Farben je Terminart (Hintergrund + Punkt), passend zu den Badge-Tönen */
export const KIND_STYLE: Record<string, { bg: string; dot: string; ring: string }> = {
  dreh: { bg: "bg-accent-soft", dot: "var(--color-accent)", ring: "hover:ring-accent/40" },
  gespraech: { bg: "bg-info-soft", dot: "var(--color-info)", ring: "hover:ring-info/40" },
  deadline: { bg: "bg-warn-soft", dot: "var(--color-warn)", ring: "hover:ring-warn/40" },
  intern: { bg: "bg-sunken", dot: "var(--color-faint)", ring: "hover:ring-ink/20" },
};
export const kindStyle = (k: string) => KIND_STYLE[k] ?? KIND_STYLE.intern;
