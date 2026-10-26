import Link from "next/link";
import { cn } from "@/lib/cn";
import { fmt, time } from "@/lib/format";
import type { EventRow } from "@/lib/kalender/data";
import { calHref, eventHref, kindStyle } from "@/lib/kalender/href";
import { eventsOnDay, minutesOfDay, placeDay } from "@/lib/kalender/layout";
import { EventChip, eventLabel } from "./event-chip";

const START = 7;
const END = 21;
const HOUR_PX = 52;

/** Wochenansicht mit Zeitraster 7 bis 21 Uhr (ab md; auf dem Handy zeigt die Seite die Woche als Liste). */
export function WeekView({ rows, days, today, now, highlight }: { rows: EventRow[]; days: string[]; today: string; now: Date; highlight?: number }) {
  const hours = Array.from({ length: END - START }, (_, i) => START + i);
  const height = (END - START) * HOUR_PX;
  const nowMin = minutesOfDay(now);
  const allDayByDay = days.map((d) => eventsOnDay(rows, d).filter((r) => r.e.allDay));
  const hasAllDay = allDayByDay.some((l) => l.length);

  return (
    <div className="squircle overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Kopf */}
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line bg-sunken/60">
            <div />
            {days.map((d) => (
              <Link
                key={d}
                href={calHref({ ansicht: "liste", datum: d })}
                aria-label={`${fmt(d, "EEEE, d. MMMM")} als Liste öffnen`}
                className={cn("flex items-baseline gap-1.5 border-l border-line px-2 py-2 hover:bg-fill-2", d === today && "text-accent-ink")}
              >
                <span className={cn("text-[12px] font-medium", d === today ? "text-accent-ink" : "text-muted")}>{fmt(d, "EEEEEE")}</span>
                <span className={cn("text-[15px] font-bold", d === today && "rounded-full bg-accent px-1.5 text-white")}>{Number(d.slice(8))}.</span>
              </Link>
            ))}
          </div>
          {/* Ganztägig */}
          {hasAllDay && (
            <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line">
              <div className="px-2 py-1.5 text-right text-[11px] leading-tight text-muted">ganz&shy;tägig</div>
              {allDayByDay.map((list, i) => (
                <div key={days[i]} className="grid content-start gap-1 border-l border-line p-1">
                  {list.map((r) => (
                    <EventChip key={r.e.id} row={r} view="woche" showTime={false} highlight={r.e.id === highlight} />
                  ))}
                </div>
              ))}
            </div>
          )}
          {/* Raster */}
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            <div className="relative" style={{ height }} aria-hidden>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className={cn("absolute right-2 text-[11px] tabular-nums text-muted", i > 0 && "-translate-y-1/2")}
                  style={{ top: i === 0 ? 3 : i * HOUR_PX }}
                >
                  {`${String(h).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const placed = placeDay(eventsOnDay(rows, d), d, START, END);
              const showNow = d === today && nowMin >= START * 60 && nowMin <= END * 60;
              return (
                <div key={d} className={cn("relative border-l border-line", d === today && "bg-accent-soft/25")} style={{ height }}>
                  {hours.map((h, i) => (
                    <Link
                      key={h}
                      href={calHref({ ansicht: "woche", datum: d, neu: true, extra: { von: `${String(h).padStart(2, "0")}:00` } })}
                      scroll={false}
                      className="absolute inset-x-0 border-t border-line/70 hover:bg-fill-2"
                      style={{ top: i * HOUR_PX, height: HOUR_PX }}
                      aria-label={`Termin am ${fmt(d, "d. MMMM")} um ${h} Uhr anlegen`}
                      tabIndex={-1}
                    />
                  ))}
                  {placed.map((p) => {
                    const st = kindStyle(p.row.e.kind);
                    const w = 100 / p.cols;
                    const compact = p.height < 50 || p.cols > 1;
                    return (
                      <Link
                        key={p.row.e.id}
                        href={eventHref(p.row.e.id, "woche")}
                        aria-label={eventLabel(p.row)}
                        className={cn(
                          "absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[12px] leading-tight text-ink shadow-[0_1px_2px_rgb(17_17_18/0.08)] ring-1 ring-surface hover:z-20 hover:shadow-[var(--shadow-pop)]",
                          st.bg,
                          p.row.e.id === highlight && "ring-2 ring-ink/40",
                        )}
                        style={{
                          top: (p.top / 60) * HOUR_PX + 1,
                          height: Math.max((p.height / 60) * HOUR_PX - 2, 20),
                          left: `calc(${p.col * w}% + 2px)`,
                          width: `calc(${w}% - 4px)`,
                          borderLeftColor: p.row.clientColor ?? st.dot,
                        }}
                        title={`${time(p.row.e.startsAt)} bis ${time(p.row.e.endsAt)} · ${p.row.e.title}`}
                      >
                        {compact ? (
                          <div className={cn("overflow-hidden", p.cols > 1 && p.height >= 50 ? "" : "flex items-baseline gap-1 whitespace-nowrap")}>
                            <span className="text-[11px] tabular-nums text-ink-2">{time(p.row.e.startsAt)}</span>{" "}
                            <span className={cn("font-semibold", p.cols > 1 && p.height >= 50 ? "line-clamp-3 hyphens-auto" : "truncate")}>{p.row.e.title}</span>
                          </div>
                        ) : (
                          <>
                            <div className="text-[11px] tabular-nums text-ink-2">
                              {p.clippedTop ? "↑ " : ""}
                              {time(p.row.e.startsAt)} bis {time(p.row.e.endsAt)}
                            </div>
                            <div className="line-clamp-3 font-semibold hyphens-auto">{p.row.e.title}</div>
                            {p.height >= 70 && p.row.e.location && <div className="truncate text-[11px] text-ink-2">{p.row.e.location}</div>}
                          </>
                        )}
                      </Link>
                    );
                  })}
                  {showNow && (
                    <div className="pointer-events-none absolute inset-x-0 z-30 flex items-center" style={{ top: ((nowMin - START * 60) / 60) * HOUR_PX }} aria-hidden>
                      <span className="-ml-1 size-2 rounded-full bg-accent" />
                      <span className="h-px flex-1 bg-accent" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
