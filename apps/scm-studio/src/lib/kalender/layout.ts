// Verteilung der Termine auf Tage und Spalten (Wochenansicht). Reine Funktionen.
import { berlinDateTime, todayIso } from "@/lib/time";
import { addDaysIso } from "./dates";

type HasTimes = { e: { startsAt: Date; endsAt: Date; allDay: boolean; id: number } };

export function eventsOnDay<T extends HasTimes>(rows: T[], day: string): T[] {
  const from = berlinDateTime(day).getTime();
  const to = berlinDateTime(addDaysIso(day, 1)).getTime();
  return rows.filter((r) => r.e.startsAt.getTime() < to && r.e.endsAt.getTime() > from);
}

/** Beginnt der Termin an einem früheren Tag? (für "Fortsetzung"-Darstellung) */
export const startsBefore = (row: HasTimes, day: string) => todayIso(row.e.startsAt) < day;

/** Minuten seit Mitternacht (Berlin) */
export function minutesOfDay(d: Date): number {
  const [h, m] = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(d)
    .split(":")
    .map(Number);
  return h * 60 + m;
}

export type Placed<T> = { row: T; top: number; height: number; col: number; cols: number; clippedTop: boolean; clippedBottom: boolean };

/**
 * Zeitraster-Platzierung für einen Tag: sich überschneidende Termine teilen sich die Breite.
 * startHour/endHour begrenzen das sichtbare Raster; Werte in Minuten relativ zu startHour.
 */
export function placeDay<T extends HasTimes>(rows: T[], day: string, startHour: number, endHour: number): Placed<T>[] {
  const dayStart = berlinDateTime(day).getTime();
  const dayEnd = berlinDateTime(addDaysIso(day, 1)).getTime();
  const lo = startHour * 60;
  const hi = endHour * 60;
  const items = rows
    .filter((r) => !r.e.allDay)
    .map((row) => {
      const s = row.e.startsAt.getTime() <= dayStart ? 0 : minutesOfDay(row.e.startsAt);
      const e = row.e.endsAt.getTime() >= dayEnd ? 24 * 60 : minutesOfDay(row.e.endsAt) || 24 * 60;
      const top = Math.min(Math.max(s, lo), hi - 20) - lo;
      const bottom = Math.max(Math.min(e, hi), lo + 20) - lo;
      return { row, start: s, end: e, top, height: Math.max(bottom - top, 22), clippedTop: s < lo, clippedBottom: e > hi };
    })
    .sort((a, b) => a.top - b.top || b.height - a.height);

  // Gruppen überlappender Termine bilden, darin Spalten vergeben
  const out: Placed<T>[] = [];
  let group: typeof items = [];
  let groupEnd = -1;
  const flush = () => {
    const colsEnd: number[] = [];
    const assigned = group.map((it) => {
      let col = colsEnd.findIndex((end) => end <= it.top);
      if (col === -1) {
        col = colsEnd.length;
        colsEnd.push(0);
      }
      colsEnd[col] = it.top + it.height;
      return { it, col };
    });
    for (const { it, col } of assigned)
      out.push({ row: it.row, top: it.top, height: it.height, col, cols: colsEnd.length, clippedTop: it.clippedTop, clippedBottom: it.clippedBottom });
    group = [];
    groupEnd = -1;
  };
  for (const it of items) {
    if (group.length && it.top >= groupEnd) flush();
    group.push(it);
    groupEnd = Math.max(groupEnd, it.top + it.height);
  }
  if (group.length) flush();
  return out;
}
