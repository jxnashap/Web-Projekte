import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { fmt } from "@/lib/format";
import type { EventRow } from "@/lib/kalender/data";
import { monthOfIso } from "@/lib/kalender/dates";
import { calHref } from "@/lib/kalender/href";
import { eventsOnDay, startsBefore } from "@/lib/kalender/layout";
import { EventChip, KindDot } from "./event-chip";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX_CHIPS = 3;

export type ShootHint = { clientId: number; clientName: string; count: number };

const termine = (n: number) => `${n} Termin${n === 1 ? "" : "e"}`;

/**
 * Monatsraster (6 Wochen). Ab sm mit Titeln; auf dem Handy wie im iOS-Kalender: Tage mit Punkten,
 * Antippen wählt den Tag, seine Termine stehen unter dem Raster (siehe Seite).
 */
export function MonthView({
  rows,
  days,
  anchor,
  today,
  hints,
  highlight,
}: {
  rows: EventRow[];
  days: string[];
  anchor: string;
  today: string;
  hints: Record<string, ShootHint[]>;
  highlight?: number;
}) {
  const month = monthOfIso(anchor);
  return (
    <div className="squircle overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-7 border-b border-line bg-sunken/60" aria-hidden>
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[12px] font-medium text-muted sm:px-3 sm:text-left">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const list = eventsOnDay(rows, day);
          const dayHints = hints[day] ?? [];
          const inMonth = monthOfIso(day) === month;
          const isToday = day === today;
          const selected = day === anchor;
          const weekend = i % 7 >= 5;
          const hidden = list.length - MAX_CHIPS;
          const dayName = fmt(day, "EEEE, d. MMMM");
          return (
            <div
              key={day}
              className={cn(
                "group relative border-b border-r border-line sm:min-h-[118px] sm:p-1.5",
                i % 7 === 6 && "border-r-0",
                i >= 35 && "border-b-0",
                !inMonth && "bg-canvas/60",
                weekend && inMonth && "bg-canvas/30",
              )}
            >
              {/* Handy: ganze Zelle wählt den Tag */}
              <Link
                href={calHref({ ansicht: "monat", datum: day })}
                scroll={false}
                aria-current={selected ? "date" : undefined}
                aria-label={`${dayName}${list.length ? `, ${termine(list.length)}` : ", keine Termine"}`}
                className="flex min-h-[52px] flex-col items-center gap-1 pt-1.5 focus-visible:bg-fill-2 sm:hidden"
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-[15px] font-medium",
                    !inMonth && "text-muted",
                    selected && !isToday && "bg-ink font-semibold text-white",
                    isToday && (selected ? "bg-accent font-semibold text-white" : "font-semibold text-accent-ink"),
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <span className="flex h-1.5 items-center gap-[3px]" aria-hidden>
                  {list.slice(0, 3).map((r) => (
                    <KindDot key={r.e.id} kind={r.e.kind} color={r.clientColor} />
                  ))}
                  {dayHints.length > 0 && <span className="size-1.5 rounded-full ring-1 ring-warn ring-inset" />}
                </span>
              </Link>

              {/* ab sm: Titel */}
              <div className="hidden sm:block">
                <div className="flex items-center justify-between">
                  <Link
                    href={calHref({ ansicht: "woche", datum: day })}
                    className={cn(
                      "hit grid size-7 place-items-center rounded-full text-[13px] font-semibold transition-colors hover:bg-fill",
                      !inMonth && "text-muted",
                      isToday && "bg-accent text-white hover:bg-accent-ink",
                    )}
                    aria-label={`${dayName}${list.length ? `, ${termine(list.length)}` : ""}, Woche öffnen`}
                  >
                    {Number(day.slice(8))}
                  </Link>
                  <Link
                    href={calHref({ ansicht: "monat", datum: day, neu: true, extra: { von: "10:00" } })}
                    scroll={false}
                    tabIndex={-1}
                    className="grid size-6 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-fill hover:text-ink group-hover:opacity-100"
                    aria-label={`Termin am ${fmt(day, "d. MMMM")} anlegen`}
                  >
                    <Plus className="size-3.5" />
                  </Link>
                </div>
                <div className="mt-1 grid gap-1">
                  {list.slice(0, MAX_CHIPS).map((r) => (
                    <EventChip key={r.e.id} row={r} view="monat" continued={startsBefore(r, day)} highlight={r.e.id === highlight} />
                  ))}
                  {dayHints.map((h) => (
                    <Link
                      key={h.clientId}
                      href={calHref({ ansicht: "monat", datum: day, neu: true, extra: { kunde: h.clientId, art: "dreh", von: "10:00" } })}
                      scroll={false}
                      className="truncate rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn hover:bg-[#ffe8cc]"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
