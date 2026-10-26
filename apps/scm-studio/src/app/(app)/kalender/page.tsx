import { Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AgendaView } from "@/components/kalender/agenda-view";
import { MonthView, type ShootHint } from "@/components/kalender/month-view";
import { NewEventDialog } from "@/components/kalender/new-event-dialog";
import { StatusToast } from "@/components/kalender/status-toast";
import { SyncPanel } from "@/components/kalender/sync-panel";
import { WeekView } from "@/components/kalender/week-view";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodStepper } from "@/components/ui/period-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { fmt } from "@/lib/format";
import { getGoogleStatus } from "@/lib/google/calendar";
import { saveEvent } from "@/lib/kalender/actions";
import { getCalendarOptions, getEventsBetween, getIcalSettings, getShootVideosBetween } from "@/lib/kalender/data";
import { addDaysIso, isIsoDay, isoWeek, shiftAnchor, type View, viewRange, VIEWS } from "@/lib/kalender/dates";
import { asView, calHref, kindStyle } from "@/lib/kalender/href";
import { publicOrigin } from "@/lib/kalender/origin";
import { EVENT_KINDS } from "@/lib/labels";
import { todayIso } from "@/lib/time";

export const metadata = { title: "Kalender" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const GOOGLE_MESSAGES = {
  verbunden: { ok: true, text: "Google Kalender verbunden. Termine werden ab jetzt übertragen." },
  abgebrochen: { ok: false, text: "Verbindung mit Google abgebrochen." },
  fehler: { ok: false, text: "Verbindung mit Google fehlgeschlagen. Details stehen in der Google-Karte." },
  "nicht-eingerichtet": { ok: false, text: "Google Kalender ist noch nicht eingerichtet. Das erledigt einmalig, wer die App betreut." },
};

export default function KalenderPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 06 · Kalender"
        title="Kalender"
        description="Drehs, Gespräche und Abgaben. Auf Wunsch gespiegelt in Google Kalender oder als Abo im Handy."
        actions={
          <Suspense fallback={<Skeleton className="h-10 w-36 rounded-full" />}>
            <NewButton searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarBody searchParams={searchParams} />
      </Suspense>
      <div className="mt-10">
        <Suspense fallback={<Skeleton className="h-40" />}>
          <Sync />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <NewDialog searchParams={searchParams} />
      </Suspense>
      <StatusToast param="google" messages={GOOGLE_MESSAGES} />
    </>
  );
}

async function NewButton({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return (
    <Link href={calHref({ ansicht: asView(one(sp.ansicht)), datum: one(sp.datum), neu: true })} scroll={false} className={buttonClass("primary")}>
      <Plus className="size-4" /> Neuer Termin
    </Link>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-[560px]" />
    </div>
  );
}

function Toolbar({ view, anchor, today, className }: { view: View; anchor: string; today: string; className?: string }) {
  const range = viewRange(view, anchor);
  const label =
    view === "monat"
      ? fmt(anchor, "MMMM yyyy")
      : view === "woche"
        ? `KW ${isoWeek(range.days[0])} · ${fmt(range.days[0], "d. MMM")} bis ${fmt(range.days[6], "d. MMM")}`
        : `${fmt(range.days[0], "d. MMM")} bis ${fmt(range.days[27], "d. MMM")}`;
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <PeriodStepper
        label={label}
        prevHref={calHref({ ansicht: view, datum: shiftAnchor(view, anchor, -1) })}
        nextHref={calHref({ ansicht: view, datum: shiftAnchor(view, anchor, 1) })}
        todayHref={calHref({ ansicht: view, datum: today })}
      />
      <Segmented
        label="Ansicht"
        className="w-full sm:w-auto [&>a]:flex-1"
        items={VIEWS.map((v) => ({ href: calHref({ ansicht: v.key, datum: anchor }), label: v.label, active: v.key === view }))}
      />
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-3 hidden flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted md:flex" aria-label="Legende">
      {Object.entries(EVENT_KINDS).map(([k, v]) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: kindStyle(k).dot }} aria-hidden />
          {v.label}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span className="h-3 w-[3px] rounded-full bg-ink-2" aria-hidden /> Leiste in Kundenfarbe
      </li>
    </ul>
  );
}

async function CalendarBody({ searchParams }: { searchParams: SP }) {
  await connection();
  const sp = await searchParams;
  const today = todayIso();
  const explicit = asView(one(sp.ansicht));
  const datum = one(sp.datum);
  const anchor = isIsoDay(datum) ? datum : today;

  // Ohne gewählte Ansicht: Monat am Computer, Liste auf dem Handy (per CSS)
  const views: View[] = explicit ? [explicit] : ["monat", "liste"];
  const ranges = views.map((v) => viewRange(v, anchor));
  const from = ranges.map((r) => r.from).sort()[0];
  const to = ranges.map((r) => r.to).sort().at(-1)!;

  const [rows, shoots, options] = await Promise.all([getEventsBetween(from, to), getShootVideosBetween(from, to), getCalendarOptions()]);

  // Drehdaten ohne passenden Drehtermin am selben Tag → Hinweis
  const clientName = new Map(options.clients.map((c) => [c.id, c.name]));
  const videoCount: Record<string, number> = {};
  for (const s of shoots) if (s.shootDate) videoCount[`${s.clientId}:${s.shootDate}`] = (videoCount[`${s.clientId}:${s.shootDate}`] ?? 0) + 1;
  const hasShootEvent = new Set(
    rows.filter((r) => r.e.kind === "dreh" && r.e.clientId).flatMap((r) => {
      const keys: string[] = [];
      const last = todayIso(new Date(r.e.endsAt.getTime() - 1));
      for (let d = todayIso(r.e.startsAt); d <= last && keys.length <= 31; d = addDaysIso(d, 1)) keys.push(`${r.e.clientId}:${d}`);
      return keys;
    }),
  );
  const hints: Record<string, ShootHint[]> = {};
  for (const [key, count] of Object.entries(videoCount)) {
    if (hasShootEvent.has(key)) continue;
    const [cid, day] = key.split(":");
    if (day < today) continue;
    (hints[day] ??= []).push({ clientId: Number(cid), clientName: clientName.get(Number(cid)) ?? "Kunde", count });
  }

  const highlight = Number(one(sp.neu_id)) || undefined;
  const agenda = { rows, today, team: options.team, hints, videoCount, highlight };
  const render = (v: View) => {
    const r = viewRange(v, anchor);
    if (v === "monat")
      return (
        <>
          <MonthView rows={rows} days={r.days} anchor={anchor} today={today} hints={hints} highlight={highlight} />
          {/* Handy: Termine des gewählten Tages unter dem Raster */}
          <div className="mt-5 sm:hidden">
            <AgendaView {...agenda} days={[anchor]} view="monat" showEmptyDays />
          </div>
        </>
      );
    if (v === "woche")
      return (
        <>
          <div className="hidden md:block">
            <WeekView rows={rows} days={r.days} today={today} now={new Date()} highlight={highlight} />
          </div>
          {/* Handy: die Woche als Liste, Tag für Tag */}
          <div className="md:hidden">
            <AgendaView {...agenda} days={r.days} view="woche" showEmptyDays />
          </div>
        </>
      );
    return <AgendaView {...agenda} days={r.days} view={explicit} />;
  };

  if (explicit)
    return (
      <div>
        <Toolbar view={explicit} anchor={anchor} today={today} />
        {render(explicit)}
        {explicit !== "liste" && <Legend />}
      </div>
    );

  return (
    <div>
      <div className="hidden md:block">
        <Toolbar view="monat" anchor={anchor} today={today} />
        {render("monat")}
        <Legend />
      </div>
      <div className="md:hidden">
        <Toolbar view="liste" anchor={anchor} today={today} />
        {render("liste")}
      </div>
    </div>
  );
}

async function Sync() {
  await connection();
  const origin = await publicOrigin();
  const ua = (await headers()).get("user-agent") ?? "";
  const [ical, google] = await Promise.all([getIcalSettings(), getGoogleStatus(origin)]);
  return <SyncPanel ical={ical} origin={origin} google={google} ios={/iPhone|iPad|iPod/.test(ua)} />;
}

async function NewDialog({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const options = await getCalendarOptions();
  await connection();
  const datum = one(sp.datum);
  const kunde = Number(one(sp.kunde));
  const lead = Number(one(sp.lead));
  const art = one(sp.art);
  const von = one(sp.von);
  const start = /^\d{2}:\d{2}$/.test(von ?? "") ? von! : "10:00";
  const [h, m] = start.split(":").map(Number);
  const endH = Math.min(h + 2, 23);
  const leadRow = options.leads.find((l) => l.id === lead);
  const kind = art && art in EVENT_KINDS ? art : leadRow && !kunde ? "gespraech" : "dreh";
  return (
    <NewEventDialog
      action={saveEvent}
      options={options}
      defaults={{
        startDate: isIsoDay(datum) ? datum : todayIso(),
        startTime: start,
        endTime: `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        clientId: options.clients.some((c) => c.id === kunde) ? kunde : null,
        leadId: leadRow ? lead : null,
        kind,
        title: leadRow && kind === "gespraech" ? `Kennenlernen ${leadRow.company}` : "",
        location: kind === "gespraech" ? "Telefon" : options.clients.find((c) => c.id === kunde)?.city ?? "",
      }}
    />
  );
}
