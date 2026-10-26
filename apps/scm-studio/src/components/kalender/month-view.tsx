import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { fmt } from "@/lib/format";
import type { EventRow } from "@/lib/kalender/data";
import { calHref } from "@/lib/kalender/href";
import { eventsOnDay, startsBefore } from "@/lib/kalender/layout";
import { monthOfIso } from "@/lib/kalender/dates";
import { EventChip, KindDot } from "./event-chip";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX_CHIPS = 3;

export type ShootHint = { clientId: number; clientName: string; count: number };

/** Monatsraster (6 Wochen). Auf schmalen Bildschirmen Punkte statt Titel, Tippen öffnet den Tag in der Liste. */
export function MonthView({ rows, days, anchor, today, hints }: { rows: EventRow[]; days: string[]; anchor: string; today: string; hints: Record<string, ShootHint[]> }) {
  const month = monthOfIso(anchor);
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-7 border-b border-line bg-sunken/60">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={cn("px-2 py-2 text-center font-mono text-[11px] uppercase tracking-wider text-muted sm:text-left sm:px-3", i >= 5 && "text-faint")}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const list = eventsOnDay(rows, day);
          const inMonth = monthOfIso(day) === month;
          const isToday = day === today;
          const weekend = i % 7 >= 5;
          const hidden = list.length - MAX_CHIPS;
          return (
            <div
              key={day}
              className={cn(
                "group relative min-h-[64px] border-b border-r border-line p-1 sm:min-h-[118px] sm:p-1.5",
                i % 7 === 6 && "border-r-0",
                i >= 35 && "border-b-0",
                !inMonth && "bg-canvas/60",
                weekend && inMonth && "bg-canvas/30",
              )}
            >
              <div className="flex items-center justify-between">
                <Link
                  href={calHref({ ansicht: "woche", datum: day })}
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-[13px] font-semibold transition-colors hover:bg-sunken",
                    !inMonth && "text-faint",
                    isToday && "bg-accent text-white hover:bg-accent-ink",
                  )}
                  aria-label={`${fmt(day, "EEEE, d. MMMM")}${list.length ? `, ${list.length} Termine` : ""}, Woche öffnen`}
                >
                  {Number(day.slice(8))}
                </Link>
                <Link
                  href={calHref({ ansicht: "monat", datum: day, neu: true, extra: { von: "10:00" } })}
                  scroll={false}
                  className="hidden size-6 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-sunken hover:text-ink focus:opacity-100 group-hover:opacity-100 sm:grid"
                  aria-label={`Termin am ${fmt(day, "d. MMMM")} anlegen`}
                >
                  <Plus className="size-3.5" />
                </Link>
              </div>
              {/* Handy: Punkte */}
              <Link href={calHref({ ansicht: "liste", datum: day })} className="mt-1 flex flex-wrap gap-1 px-1 sm:hidden" aria-label={`${list.length} Termine am ${fmt(day, "d. MMMM")}`}>
                {list.slice(0, 4).map((r) => (
                  <KindDot key={r.e.id} kind={r.e.kind} color={r.clientColor} />
                ))}
                {(hints[day]?.length ?? 0) > 0 && <span className="size-2 rounded-full border border-accent" aria-hidden />}
              </Link>
              {/* ab sm: Titel */}
              <div className="mt-1 hidden gap-1 sm:grid">
                {list.slice(0, MAX_CHIPS).map((r) => (
                  <EventChip key={r.e.id} row={r} continued={startsBefore(r, day)} />
                ))}
                {(hints[day] ?? []).map((h) => (
                  <Link
                    key={h.clientId}
                    href={calHref({ ansicht: "monat", datum: day, neu: true, extra: { kunde: h.clientId, art: "dreh", von: "10:00" } })}
                    scroll={false}
                    className="truncate rounded-md border border-dashed border-accent/50 px-1.5 py-0.5 text-[11px] font-medium text-accent-ink hover:bg-accent-soft"
                    title={`${h.count} Video${h.count === 1 ? "" : "s"} von ${h.clientName} mit Drehdatum, aber ohne Termin. Termin anlegen`}
                  >
                    Dreh ohne Termin: {h.clientName}
                  </Link>
                ))}
                {hidden > 0 && (
                  <Link href={calHref({ ansicht: "liste", datum: day })} className="px-1 text-[12px] font-semibold text-muted hover:text-ink">
                    +{hidden} weitere
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
