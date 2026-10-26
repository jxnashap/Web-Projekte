// Zeitzone: Server (Vercel, Container) laufen in UTC, das Team arbeitet in Europe/Berlin.
// Alles, was "heute", "dieser Monat" oder eine Uhrzeit ist, läuft deshalb über diese Helfer.
import { TZDate, tz } from "@date-fns/tz";
import { format } from "date-fns";

export const TZ = "Europe/Berlin";
export const inBerlin = tz(TZ);

export const nowBerlin = () => TZDate.tz(TZ);
/** Heute als YYYY-MM-DD (Berlin). */
export const todayIso = (now: Date = new Date()) => format(now, "yyyy-MM-dd", { in: inBerlin });
/** Aktueller Monat als YYYY-MM (Berlin). */
export const monthIso = (now: Date = new Date()) => format(now, "yyyy-MM", { in: inBerlin });
export const hourBerlin = (now: Date = new Date()) => Number(format(now, "H", { in: inBerlin }));

/** "2026-10-27" + "10:00" (Berliner Ortszeit) → Date */
export function berlinDateTime(day: string, hhmm = "00:00"): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh || 0, mm || 0, TZ).getTime());
}

/** Wert aus <input type="datetime-local"> ("2026-10-27T10:00") als Berliner Zeit lesen. */
export function fromLocalInput(value: string): Date {
  const [day, t = "00:00"] = value.split("T");
  return berlinDateTime(day, t.slice(0, 5));
}

/** Date → Wert für <input type="datetime-local"> in Berliner Zeit. */
export const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm", { in: inBerlin });

/** Erster und letzter Tag eines Monats (YYYY-MM) als YYYY-MM-DD. */
export function monthRange(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` };
}

/** Monat verschieben: shiftMonth("2026-10", -1) → "2026-09" */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
