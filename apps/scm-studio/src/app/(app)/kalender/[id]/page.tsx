import { ArrowLeft, CalendarCheck2, Clapperboard, FileText, MapPin, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventForm } from "@/components/kalender/event-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { dateLong, time } from "@/lib/format";
import { getGoogleStatus } from "@/lib/google/calendar";
import { deleteEvent, saveEvent } from "@/lib/kalender/actions";
import { getCalendarOptions, getEvent, getShootVideos } from "@/lib/kalender/data";
import { addDaysIso } from "@/lib/kalender/dates";
import { calHref } from "@/lib/kalender/href";
import { EVENT_KINDS, videoStatus } from "@/lib/labels";
import { todayIso } from "@/lib/time";

export const metadata = { title: "Termin" };

type Params = Promise<{ id: string }>;

export default function TerminPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-full max-w-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[560px]" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

async function Detail({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();
  const [row, options, google] = await Promise.all([getEvent(eventId), getCalendarOptions(), getGoogleStatus()]);
  if (!row) notFound();
  const { e } = row;
  const startDay = todayIso(e.startsAt);
  const lastDay = todayIso(new Date(e.endsAt.getTime() - 1));
  const days: string[] = [];
  for (let d = startDay; d <= lastDay && days.length < 32; d = addDaysIso(d, 1)) days.push(d);
  const videos = e.kind === "dreh" && e.clientId ? await getShootVideos(e.clientId, days) : [];
  const members = options.team.filter((t) => e.teamIds?.includes(t.id));
  const when = e.allDay
    ? lastDay === startDay
      ? `${dateLong(startDay)}, ganztägig`
      : `${dateLong(startDay)} bis ${dateLong(lastDay)}`
    : todayIso(e.endsAt) === startDay
      ? `${dateLong(startDay)}, ${time(e.startsAt)} bis ${time(e.endsAt)} Uhr`
      : `${dateLong(startDay)}, ${time(e.startsAt)} Uhr bis ${dateLong(todayIso(e.endsAt))}, ${time(e.endsAt)} Uhr`;

  return (
    <>
      <div className="mb-4">
        <Link href={calHref({ datum: startDay })} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Zum Kalender
        </Link>
      </div>
      <PageHeader
        scene={`Szene 06 · ${EVENT_KINDS[e.kind]?.label ?? "Termin"}`}
        title={e.title}
        description={when}
        actions={
          <ActionButton action={deleteEvent.bind(null, e.id)} confirm={`Termin „${e.title}“ wirklich löschen?`} variant="danger" size="md">
            <Trash2 className="size-4" /> Löschen
          </ActionButton>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Termin bearbeiten" sub="Änderungen gehen sofort an Google, falls verbunden." />
          <div className="p-5">
            <EventForm
              key={e.updatedAt.toISOString()}
              action={saveEvent}
              options={options}
              defaults={{
                id: e.id,
                title: e.title,
                kind: e.kind,
                allDay: e.allDay,
                startDate: startDay,
                startTime: time(e.startsAt),
                endDate: e.allDay ? lastDay : todayIso(e.endsAt),
                endTime: time(e.endsAt),
                location: e.location,
                clientId: e.clientId,
                leadId: e.leadId,
                teamIds: e.teamIds,
                notes: e.notes,
              }}
            />
          </div>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Auf einen Blick" />
            <dl className="grid gap-3 p-5 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Art</dt>
                <dd>
                  <Badge tone={EVENT_KINDS[e.kind]?.tone}>{EVENT_KINDS[e.kind]?.label ?? e.kind}</Badge>
                </dd>
              </div>
              {row.clientName && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Kunde</dt>
                  <dd>
                    <Link href={`/kunden/${e.clientId}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                      <span className="size-2.5 rounded-full" style={{ background: row.clientColor ?? undefined }} />
                      {row.clientName}
                    </Link>
                  </dd>
                </div>
              )}
              {row.leadCompany && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Anfrage</dt>
                  <dd>
                    <Link href={`/anfragen/${e.leadId}`} className="font-semibold hover:underline">
                      {row.leadCompany}
                    </Link>
                  </dd>
                </div>
              )}
              {e.location && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Ort</dt>
                  <dd className="text-right">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                      <MapPin className="size-3.5" /> {e.location}
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Team</dt>
                <dd className="flex items-center gap-1.5 text-right">
                  {members.length ? (
                    <>
                      <Users className="size-3.5 text-muted" /> {members.map((m) => m.name).join(", ")}
                    </>
                  ) : (
                    <span className="text-faint">niemand eingetragen</span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-line pt-3">
                <dt className="text-muted">Google</dt>
                <dd className="flex items-center gap-1.5 text-right text-[13px]">
                  {google.state !== "verbunden" ? (
                    <span className="text-faint">nicht verbunden</span>
                  ) : e.googleEventId ? (
                    <>
                      <CalendarCheck2 className="size-3.5 text-ok" /> eingetragen
                    </>
                  ) : (
                    <span className="text-warn">noch nicht übertragen</span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          {e.kind === "dreh" && (
            <Card>
              <CardHeader
                title="Videos für diesen Dreh"
                sub={row.clientName ? `Drehdatum ${days.length > 1 ? "in diesem Zeitraum" : "an diesem Tag"}` : "Kunde wählen, um Videos zu sehen"}
                action={
                  e.clientId ? (
                    <LinkButton href={`/produktion?neu=1&kunde=${e.clientId}`} variant="ghost" size="sm">
                      Video planen
                    </LinkButton>
                  ) : undefined
                }
              />
              {videos.length ? (
                <ul className="divide-y divide-line">
                  {videos.map((v) => {
                    const st = videoStatus(v.status);
                    return (
                      <li key={v.id}>
                        <Link href={`/produktion/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-sunken/60">
                          <Clapperboard className="size-4 shrink-0 text-muted" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{v.title}</div>
                            <div className="truncate text-[13px] text-muted">{[v.format, v.isTest ? "Testvideo" : null].filter(Boolean).join(" · ")}</div>
                          </div>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 py-4 text-[13px] text-muted">
                  {e.clientId ? "Noch keine Videos mit diesem Drehdatum. Plant sie in der Produktion und tragt das Drehdatum ein." : "Ohne Kunde keine Videoliste."}
                </p>
              )}
              {e.clientId && (
                <div className="border-t border-line px-5 py-3">
                  <Link
                    href={`/dokumente/neu?art=drehplan&kunde=${e.clientId}&datum=${startDay}&termin=${e.id}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink"
                  >
                    <FileText className="size-4" /> Drehplan erstellen
                  </Link>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
