// Rechenweg für die Zahlen (rein, ohne Datenbank).
// Messwerte sind Gesamtstände eines Videos an einem Tag (z. B. 4.100 Aufrufe am 23.10.).
// Für Zeiträume zählt der Zuwachs: Stand am Ende minus Stand vor Beginn. Zwischen zwei Messungen
// wird linear verteilt, vor der ersten Messung ab dem Posting-Tag (Stand 0), nach der letzten bleibt der Stand.
import { addDaysIso, diffDaysIso, startOfWeekIso } from "@/lib/kalender/dates";

export type Snapshot = {
  measuredOn: string;
  views: number;
  reach: number | null;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
  avgWatchSeconds: number | null;
  source: string;
};

export type MetricKey = "views" | "reach" | "interactions";

const SOURCE_RANK: Record<string, number> = { instagram: 4, tiktok: 3, csv: 2, manuell: 1 };

/** Pro Tag ein Messwert (bei mehreren Quellen gewinnt die API vor CSV vor manuell), aufsteigend sortiert. */
export function dedupeSnapshots(rows: Snapshot[]): Snapshot[] {
  const byDay = new Map<string, Snapshot>();
  for (const r of rows) {
    const cur = byDay.get(r.measuredOn);
    if (!cur || (SOURCE_RANK[r.source] ?? 0) > (SOURCE_RANK[cur.source] ?? 0)) byDay.set(r.measuredOn, r);
  }
  return [...byDay.values()].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
}

export const interactionsOf = (s: Pick<Snapshot, "likes" | "comments" | "shares" | "saves">) => s.likes + s.comments + (s.shares ?? 0) + (s.saves ?? 0);

const valueOf = (s: Snapshot, k: MetricKey) => (k === "views" ? s.views : k === "reach" ? s.reach ?? 0 : interactionsOf(s));

/** Kumulierter Stand an einem Tag (Ende des Tages). */
export function cumulativeAt(snaps: Snapshot[], postDate: string | null, day: string, key: MetricKey): number {
  if (!snaps.length) return 0;
  const start = postDate ?? addDaysIso(snaps[0].measuredOn, -1);
  if (day < start) return 0;
  let prevDay = start;
  let prevVal = 0;
  for (const s of snaps) {
    const v = valueOf(s, key);
    if (s.measuredOn === day) return v;
    if (s.measuredOn > day) {
      const span = diffDaysIso(s.measuredOn, prevDay);
      if (span <= 0) return prevVal;
      return prevVal + ((v - prevVal) * diffDaysIso(day, prevDay)) / span;
    }
    prevDay = s.measuredOn;
    prevVal = v;
  }
  return prevVal;
}

/** Zuwachs im Zeitraum [from, to] (beide inklusive). */
export const growth = (snaps: Snapshot[], postDate: string | null, from: string, to: string, key: MetricKey) =>
  Math.max(0, cumulativeAt(snaps, postDate, to, key) - cumulativeAt(snaps, postDate, addDaysIso(from, -1), key));

/** Letzter Messwert bis einschließlich `day` */
export function latestUntil(snaps: Snapshot[], day: string): Snapshot | null {
  let last: Snapshot | null = null;
  for (const s of snaps) {
    if (s.measuredOn > day) break;
    last = s;
  }
  return last;
}

export type Bucket = { key: string; from: string; to: string };

/** Tage (bis 31 Tage) oder Kalenderwochen (darüber) als Zeitachse. */
export function buckets(from: string, to: string): { unit: "tag" | "woche"; list: Bucket[] } {
  const days = diffDaysIso(to, from) + 1;
  if (days <= 31) {
    return { unit: "tag", list: Array.from({ length: days }, (_, i) => addDaysIso(from, i)).map((d) => ({ key: d, from: d, to: d })) };
  }
  const list: Bucket[] = [];
  for (let w = startOfWeekIso(from); w <= to; w = addDaysIso(w, 7)) {
    list.push({ key: w, from: w < from ? from : w, to: addDaysIso(w, 6) > to ? to : addDaysIso(w, 6) });
  }
  return { unit: "woche", list };
}

/** Prozentuale Veränderung, null wenn keine Basis. */
export const change = (now: number, before: number) => (before > 0 ? (now - before) / before : null);
