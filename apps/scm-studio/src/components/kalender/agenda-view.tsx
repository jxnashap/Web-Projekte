import { Clapperboard, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, time } from "@/lib/format";
import type { EventRow } from "@/lib/kalender/data";
import type { View } from "@/lib/kalender/dates";
import { calHref, eventHref, kindStyle } from "@/lib/kalender/href";
import { eventsOnDay, startsBefore } from "@/lib/kalender/layout";
import { EVENT_KINDS } from "@/lib/labels";
import { todayIso } from "@/lib/time";
import { eventLabel } from "./event-chip";
import type { ShootHint } from "./month-view";

type Team = { id: number; name: string; initials: string };

/**
 * Liste nach Tagen (Standard auf dem Handy): nur Tage mit Terminen, heute hervorgehoben.
 * `view` ist die Ansicht, aus der die Liste stammt (für Links und den Rückweg). Mit `showEmptyDays` erscheinen
 * auch leere Tage, knapp als Zeile (Woche auf dem Handy, gewählter Tag im Monat).
 */
export function AgendaView({
  rows,
  days,
  today,
  team,
  hints,
  videoCount,
  view,
  highlight,
  showEmptyDays = false,
}: {
  rows: EventRow[];
  days: string[];
  today: string;
  team: Team[];
  hints: Record<string, ShootHint[]>;
  videoCount: Record<string, number>;
  view?: View;
  highlight?: number;
  /** auch Tage ohne Termine zeigen (Woche auf dem Handy, gewählter Tag im Monat) */
  showEmptyDays?: boolean;
}) {
  const groups = days.map((d) => ({ day: d, list: eventsOnDay(rows, d), hints: hints[d] ?? [] })).filter((g) => showEmptyDays || g.list.length || g.hints.length);
  const byId = new Map(team.map((t) => [t.id, t]));

  if (!groups.length)
    return (
      <EmptyState
        title="Keine Termine in diesem Zeitraum"
        action={
          <Link href={calHref({ ansicht: view, datum: days[0], neu: true })} scroll={false} className={buttonClass("secondary")}>
            <Plus className="size-4" /> Termin anlegen
          </Link>
        }
      >
        Legt Drehs, Kennenlerngespräche und Abgaben an. Sie erscheinen hier und auf Wunsch im Google Kalender.
      </EmptyState>
    );

  return (
    <ol className={cn("grid", showEmptyDays ? "gap-4" : "gap-5")}>
      {groups.map(({ day, list, hints: dayHints }) => (
        <li key={day} className="grid gap-2 md:grid-cols-[148px_minmax(0,1fr)] md:gap-5">
          <h3 className={cn("flex items-baseline gap-2 md:block md:pt-3", day === today && "text-accent-ink")}>
            <span className="text-[13px] font-medium text-muted md:block">{day === today ? "Heute" : fmt(day, "EEEE")}</span>
            <span className="text-[17px] font-bold md:mt-0.5 md:block">{fmt(day, "d. MMMM")}</span>
          </h3>
          <ul className="grid gap-2">
            {list.length === 0 && dayHints.length === 0 && (
              <li className="flex min-h-12 items-center justify-between gap-3 rounded-[14px] bg-fill-2 py-1 pl-4 pr-1.5 text-[14px] text-muted">
                Keine Termine
                <Link
                  href={calHref({ ansicht: view, datum: day, neu: true, extra: { von: "10:00" } })}
                  scroll={false}
                  className={buttonClass("ghost", "sm", "text-accent-ink")}
                  aria-label={`Termin am ${fmt(day, "d. MMMM")} anlegen`}
                >
                  <Plus className="size-3.5" /> Termin
                </Link>
              </li>
            )}
            {list.map((r) => {
              const st = kindStyle(r.e.kind);
              const members = (r.e.teamIds ?? []).map((id) => byId.get(id)).filter(Boolean) as Team[];
              const vc = r.e.kind === "dreh" && r.e.clientId ? videoCount[`${r.e.clientId}:${day}`] ?? 0 : 0;
              const cont = startsBefore(r, day);
              return (
                <li key={r.e.id}>
                  <Link
                    href={eventHref(r.e.id, view)}
                    aria-label={eventLabel(r, cont)}
                    className={cn(
                      "squircle flex items-stretch gap-3 rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)] sm:gap-4 sm:p-4",
                      r.e.id === highlight && "ring-2 ring-ink/30",
                    )}
                  >
                    <div className="w-16 shrink-0 pt-0.5">
                      {r.e.allDay ? (
                        <div className="text-[13px] font-medium text-muted">ganztägig</div>
                      ) : cont ? (
                        <>
                          <div className="text-[13px] font-medium text-muted">Fortsetzung</div>
                          <div className="text-[12px] tabular-nums text-muted">bis {todayIso(r.e.endsAt) === day ? time(r.e.endsAt) : fmt(r.e.endsAt, "d.M.")}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-[15px] font-bold tabular-nums">{time(r.e.startsAt)}</div>
                          <div className="text-[12px] tabular-nums text-muted">bis {todayIso(r.e.endsAt) === day ? time(r.e.endsAt) : fmt(r.e.endsAt, "d.M.")}</div>
                        </>
                      )}
                    </div>
                    <span className="w-1 shrink-0 rounded-full" style={{ background: r.clientColor ?? st.dot }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold">{r.e.title}</span>
                        <Badge tone={st.tone}>{EVENT_KINDS[r.e.kind]?.label ?? r.e.kind}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                        {r.clientName && <span>{r.clientName}</span>}
                        {r.leadCompany && <span>Anfrage: {r.leadCompany}</span>}
                        {r.e.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden /> {r.e.location}
                          </span>
                        )}
                        {vc > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clapperboard className="size-3.5" aria-hidden /> {vc} Video{vc === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                    {members.length > 0 && (
                      <div className="hidden shrink-0 items-center -space-x-1.5 sm:flex" aria-label={`Team: ${members.map((m) => m.name).join(", ")}`}>
                        {members.map((m) => (
                          <span key={m.id} title={m.name} className="grid size-7 place-items-center rounded-full border-2 border-surface bg-fill text-[10px] font-semibold text-ink-2">
                            {m.initials}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
            {dayHints.map((h) => (
              <li key={`hint-${h.clientId}`}>
                <Link
                  href={calHref({ ansicht: view, datum: day, neu: true, extra: { kunde: h.clientId, art: "dreh", von: "10:00" } })}
                  scroll={false}
                  className="squircle flex items-center gap-3 rounded-[var(--radius-card)] bg-warn-soft/70 p-3 text-[14px] text-ink-2 transition-colors hover:bg-warn-soft sm:p-4"
                >
                  <Clapperboard className="size-4 shrink-0 text-warn" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-ink">{h.clientName}:</span> {h.count} Video{h.count === 1 ? "" : "s"} mit Drehdatum, aber noch kein Termin.
                  </span>
                  <span className="shrink-0 font-semibold text-accent-ink">Termin anlegen</span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
