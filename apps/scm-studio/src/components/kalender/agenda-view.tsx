import { Clapperboard, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { cn } from "@/lib/cn";
import { fmt, time } from "@/lib/format";
import type { EventRow } from "@/lib/kalender/data";
import { calHref, kindStyle } from "@/lib/kalender/href";
import { eventsOnDay, startsBefore } from "@/lib/kalender/layout";
import { EVENT_KINDS } from "@/lib/labels";
import { todayIso } from "@/lib/time";
import type { ShootHint } from "./month-view";

type Team = { id: number; name: string; initials: string };

/** Liste nach Tagen (Standard auf dem Handy): nur Tage mit Terminen, heute hervorgehoben. */
export function AgendaView({
  rows,
  days,
  today,
  team,
  hints,
  videoCount,
}: {
  rows: EventRow[];
  days: string[];
  today: string;
  team: Team[];
  hints: Record<string, ShootHint[]>;
  videoCount: Record<string, number>;
}) {
  const groups = days.map((d) => ({ day: d, list: eventsOnDay(rows, d), hints: hints[d] ?? [] })).filter((g) => g.list.length || g.hints.length);
  const byId = new Map(team.map((t) => [t.id, t]));

  if (!groups.length)
    return (
      <EmptyState
        title="Keine Termine in diesem Zeitraum"
        action={
          <Link href={calHref({ ansicht: "liste", datum: days[0], neu: true })} scroll={false} className={buttonClass("primary")}>
            <Plus className="size-4" /> Termin anlegen
          </Link>
        }
      >
        Legt Drehs, Kennenlerngespräche und Abgaben an. Sie erscheinen hier und auf Wunsch im Google Kalender.
      </EmptyState>
    );

  return (
    <ol className="grid gap-5">
      {groups.map(({ day, list, hints: dayHints }) => (
        <li key={day} className="grid gap-2 md:grid-cols-[148px_minmax(0,1fr)] md:gap-5">
          <div className={cn("flex items-baseline gap-2 md:block md:pt-3", day === today && "text-accent-ink")}>
            <div className="text-[12px] font-medium text-muted">{day === today ? "Heute" : fmt(day, "EEEE")}</div>
            <div className="text-[17px] font-bold md:mt-0.5">{fmt(day, "d. MMMM")}</div>
          </div>
          <ul className="grid gap-2">
            {list.map((r) => {
              const st = kindStyle(r.e.kind);
              const members = (r.e.teamIds ?? []).map((id) => byId.get(id)).filter(Boolean) as Team[];
              const vc = r.e.kind === "dreh" && r.e.clientId ? videoCount[`${r.e.clientId}:${day}`] ?? 0 : 0;
              const cont = startsBefore(r, day);
              return (
                <li key={r.e.id}>
                  <Link
                    href={`/kalender/${r.e.id}`}
                    className="flex items-stretch gap-3 rounded-card border border-line bg-surface p-3 shadow-card transition-colors hover:border-line-2 sm:gap-4 sm:p-4"
                  >
                    <div className="w-14 shrink-0 pt-0.5 sm:w-16">
                      {r.e.allDay || cont ? (
                        <div className="text-[12px] font-medium text-muted">{r.e.allDay ? "ganztägig" : "weiter"}</div>
                      ) : (
                        <>
                          <div className="text-[15px] font-bold">{time(r.e.startsAt)}</div>
                          <div className="text-[12px] tabular-nums text-muted">bis {todayIso(r.e.endsAt) === day ? time(r.e.endsAt) : fmt(r.e.endsAt, "d.M.")}</div>
                        </>
                      )}
                    </div>
                    <span className="w-1 shrink-0 rounded-full" style={{ background: r.clientColor ?? st.dot }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold">{r.e.title}</span>
                        <Badge tone={EVENT_KINDS[r.e.kind]?.tone}>{EVENT_KINDS[r.e.kind]?.label ?? r.e.kind}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                        {r.clientName && <span>{r.clientName}</span>}
                        {r.leadCompany && <span>Anfrage: {r.leadCompany}</span>}
                        {r.e.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" /> {r.e.location}
                          </span>
                        )}
                        {vc > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clapperboard className="size-3.5" /> {vc} Video{vc === 1 ? "" : "s"}
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
                  href={calHref({ ansicht: "liste", datum: day, neu: true, extra: { kunde: h.clientId, art: "dreh", von: "10:00" } })}
                  scroll={false}
                  className="flex items-center gap-3 rounded-card border border-dashed border-accent/50 p-3 text-[13px] text-accent-ink hover:bg-accent-soft sm:p-4"
                >
                  <Clapperboard className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{h.clientName}:</span> {h.count} Video{h.count === 1 ? "" : "s"} mit Drehdatum, aber noch kein Termin.
                  </span>
                  <span className="shrink-0 font-semibold">Termin anlegen</span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
