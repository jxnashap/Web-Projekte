// Kalender-Rechnen mit Datums-Strings (YYYY-MM-DD). Tage werden in UTC-Mitternacht gerechnet,
// damit Sommer/Winterzeit keine Tage verschiebt; Uhrzeiten kommen erst über src/lib/time.ts dazu.
export type View = "monat" | "woche" | "liste";
export const VIEWS: { key: View; label: string }[] = [
  { key: "monat", label: "Monat" },
  { key: "woche", label: "Woche" },
  { key: "liste", label: "Liste" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDay = (v: unknown): v is string => typeof v === "string" && ISO.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export const addDaysIso = (iso: string, n: number) => {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
};

/** Wochentag mit Montag = 0 … Sonntag = 6 */
export const weekdayIso = (iso: string) => (toUtc(iso).getUTCDay() + 6) % 7;

export const startOfWeekIso = (iso: string) => addDaysIso(iso, -weekdayIso(iso));

export const diffDaysIso = (a: string, b: string) => Math.round((toUtc(a).getTime() - toUtc(b).getTime()) / 86_400_000);

export const monthOfIso = (iso: string) => iso.slice(0, 7);

/** 6 Wochen ab dem Montag vor dem Monatsersten (immer 42 Tage, ruhiges Raster) */
export function monthGrid(anchor: string): string[] {
  const first = `${monthOfIso(anchor)}-01`;
  const start = startOfWeekIso(first);
  return Array.from({ length: 42 }, (_, i) => addDaysIso(start, i));
}

export const weekDays = (anchor: string) => {
  const start = startOfWeekIso(anchor);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
};

export function shiftAnchor(view: View, anchor: string, dir: -1 | 1): string {
  if (view === "monat") {
    const [y, m] = anchor.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    return fromUtc(d);
  }
  return addDaysIso(anchor, dir * (view === "woche" ? 7 : 28));
}

/** Zeitraum (Tage, inklusiv/exklusiv) der Ansicht */
export function viewRange(view: View, anchor: string): { from: string; to: string; days: string[] } {
  if (view === "monat") {
    const days = monthGrid(anchor);
    return { from: days[0], to: addDaysIso(days[41], 1), days };
  }
  if (view === "woche") {
    const days = weekDays(anchor);
    return { from: days[0], to: addDaysIso(days[6], 1), days };
  }
  const days = Array.from({ length: 28 }, (_, i) => addDaysIso(anchor, i));
  return { from: anchor, to: addDaysIso(anchor, 28), days };
}

/** ISO-Kalenderwoche */
export function isoWeek(iso: string): number {
  const d = toUtc(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}
