import { CalendarCheck2, Clapperboard, FileText, MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventForm } from "@/components/kalender/event-form";
import { EventMoreMenu } from "@/components/kalender/event-menu";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { dateLong, time } from "@/lib/format";
import { getGoogleStatus } from "@/lib/google/calendar";
import { deleteEvent, saveEvent } from "@/lib/kalender/actions";
import { getCalendarOptions, getEvent, getShootVideos } from "@/lib/kalender/data";
import { addDaysIso } from "@/lib/kalender/dates";
import { asView, calHref, kindStyle } from "@/lib/kalender/href";
import { EVENT_KINDS, videoStatus } from "@/lib/labels";
import { todayIso } from "@/lib/time";

type Params = Promise<{ id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const row = Number.isInteger(id) && id > 0 ? await getEvent(id).catch(() => null) : null;
  return { title: row ? `${row.e.title} · Kalender` : "Termin" };
}

export default function TerminPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** Zeile einer Infoliste: Bezeichnung links, Wert rechts (auf dem Handy untereinander bei langen Werten). */
function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-12 items-start justify-between gap-4 px-5 py-3", className)}>
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

async function Detail({ params, searchParams }: { params: Params; searchParams: SP }) {
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();
  const [row, options, google] = await Promise.all([getEvent(eventId), getCalendarOptions(), getGoogleStatus()]);
  if (!row) notFound();
  const { e } = row;
  const view = asView(Array.isArray(sp.ansicht) ? sp.ansicht[0] : sp.ansicht);
  const startDay = todayIso(e.startsAt);
  const lastDay = todayIso(new Date(e.endsAt.getTime() - 1));
  const days: string[] = [];
  for (let d = startDay; d <= lastDay && days.length < 32; d = addDaysIso(d, 1)) days.push(d);
  const isShoot = e.kind === "dreh";
  const videos = isShoot && e.clientId ? await getShootVideos(e.clientId, days) : [];
  const members = options.team.filter((t) => e.teamIds?.includes(t.id));
  const kind = EVENT_KINDS[e.kind]?.label ?? "Termin";
  const when = e.allDay
    ? lastDay === startDay
      ? `${dateLong(startDay)}, ganztägig`
      : `${dateLong(startDay)} bis ${dateLong(lastDay)}`
    : todayIso(e.endsAt) === startDay
      ? `${dateLong(startDay)}, ${time(e.startsAt)} bis ${time(e.endsAt)} Uhr`
      : `${dateLong(startDay)}, ${time(e.startsAt)} Uhr bis ${dateLong(todayIso(e.endsAt))}, ${time(e.endsAt)} Uhr`;
  const editHref = `/kalender/${e.id}?${new URLSearchParams({ ...(view ? { ansicht: view } : {}), bearbeiten: "1" })}`;

  return (
    <>
      <PageHeader
        scene={`Szene 06 · ${kind}`}
        back={{ href: calHref({ ansicht: view, datum: startDay }), label: "Kalender" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: kindStyle(e.kind).dot }} aria-hidden />
            {kind}
          </span>
        }
        title={e.title}
        description={when}
        actions={
          <>
            <LinkButton href={editHref} scroll={false} variant="secondary">
              <Pencil className="size-4" aria-hidden /> Bearbeiten
            </LinkButton>
            <EventMoreMenu title={e.title} remove={deleteEvent.bind(null, e.id, view)} googleLinked={Boolean(e.googleEventId) && google.state === "verbunden"} />
          </>
        }
      />

      <div className={cn("grid gap-6", isShoot ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "max-w-2xl")}>
        <Card className="self-start">
          <CardHeader title="Auf einen Blick" />
          <dl className="divide-y divide-line border-t border-line text-[15px]">
            {e.location && (
              <Row label="Ort">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-start gap-1 font-semibold text-accent-ink hover:underline"
                >
                  <MapPin className="mt-1 size-3.5 shrink-0" aria-hidden /> {e.location}
                </a>
              </Row>
            )}
            {row.clientName && (
              <Row label="Kunde">
                <Link href={`/kunden/${e.clientId}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                  <span className="size-2.5 rounded-full" style={{ background: row.clientColor ?? undefined }} aria-hidden />
                  {row.clientName}
                </Link>
              </Row>
            )}
            {row.leadCompany && (
              <Row label="Anfrage">
                <Link href={`/anfragen/${e.leadId}`} className="font-semibold hover:underline">
                  {row.leadCompany}
                </Link>
              </Row>
            )}
            <Row label="Team">{members.length ? members.map((m) => m.name).join(", ") : <span className="text-muted">niemand eingetragen</span>}</Row>
            {e.notes && (
              <div className="px-5 py-3">
                <dt className="text-muted">Notizen</dt>
                <dd className="mt-1 whitespace-pre-line text-ink">{e.notes}</dd>
              </div>
            )}
            <Row label="Google" className="text-[14px]">
              {google.state !== "verbunden" ? (
                <span className="text-muted">nicht verbunden</span>
              ) : e.googleEventId ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck2 className="size-4 text-ok" aria-hidden /> eingetragen
                </span>
              ) : (
                <span className="text-warn">noch nicht übertragen</span>
              )}
            </Row>
          </dl>
        </Card>

        {isShoot && (
          <Card className="self-start">
            <CardHeader
              title="Videos für diesen Dreh"
              sub={row.clientName ? `Drehdatum ${days.length > 1 ? "in diesem Zeitraum" : "an diesem Tag"}` : undefined}
              action={
                e.clientId && videos.length > 0 ? (
                  <LinkButton href={`/produktion?neu=1&kunde=${e.clientId}`} variant="ghost" size="sm">
                    Video planen
                  </LinkButton>
                ) : undefined
              }
            />
            {!e.clientId ? (
              <EmptyState
                variant="inline"
                title="Noch kein Kunde gewählt"
                action={
                  <LinkButton href={editHref} scroll={false} variant="secondary">
                    Kunde eintragen
                  </LinkButton>
                }
              >
                Mit Kunde zeigt diese Karte die Videos, die an diesem Tag gedreht werden.
              </EmptyState>
            ) : videos.length ? (
              <ul className="divide-y divide-line border-t border-line">
                {videos.map((v) => {
                  const st = videoStatus(v.status);
                  return (
                    <li key={v.id}>
                      <Link href={`/produktion/${v.id}`} className="flex min-h-12 items-center gap-3 px-5 py-3 transition-colors hover:bg-fill-2">
                        <Clapperboard className="size-4 shrink-0 text-muted" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{v.title}</div>
                          {(v.format || v.isTest) && <div className="text-[13px] text-muted">{[v.format, v.isTest ? "Testvideo" : null].filter(Boolean).join(" · ")}</div>}
                        </div>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                variant="inline"
                title="Noch keine Videos mit diesem Drehdatum"
                action={
                  <LinkButton href={`/produktion?neu=1&kunde=${e.clientId}`} variant="secondary">
                    Video planen
                  </LinkButton>
                }
              >
                Plant die Videos in der Produktion und tragt dort das Drehdatum ein.
              </EmptyState>
            )}
            {e.clientId && (
              <div className="border-t border-line px-3 py-1.5">
                <Link
                  href={`/dokumente/neu?art=drehplan&kunde=${e.clientId}&datum=${startDay}&termin=${e.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-[15px] font-semibold text-accent-ink hover:bg-fill-2"
                >
                  <FileText className="size-4" aria-hidden /> Drehplan erstellen
                </Link>
              </div>
            )}
          </Card>
        )}
      </div>

      <ParamDialog param="bearbeiten" title="Termin bearbeiten" description="Änderungen gehen sofort an Google, falls verbunden." size="lg">
        <EventForm
          key={e.updatedAt.getTime()}
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
      </ParamDialog>
    </>
  );
}
