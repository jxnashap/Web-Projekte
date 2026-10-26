import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { fmt } from "@/lib/format";
import { getGoogleStatus } from "@/lib/google/calendar";
import { saveEvent } from "@/lib/kalender/actions";
import { getCalendarOptions, getEventsBetween, getIcalSettings, getShootVideosBetween } from "@/lib/kalender/data";
import { addDaysIso, isIsoDay, isoWeek, shiftAnchor, type View, viewRange, VIEWS } from "@/lib/kalender/dates";
import { calHref } from "@/lib/kalender/href";
import { publicOrigin } from "@/lib/kalender/origin";
import { EVENT_KINDS } from "@/lib/labels";
import { todayIso } from "@/lib/time";

export const metadata = { title: "Kalender" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const asView = (v: string | undefined): View | undefined => (v === "monat" || v === "woche" || v === "liste" ? v : undefined);

const GOOGLE_MESSAGES = {
  verbunden: { ok: true, text: "Google Kalender verbunden. Termine werden ab jetzt übertragen." },
  abgebrochen: { ok: false, text: "Verbindung mit Google abgebrochen." },
  fehler: { ok: false, text: "Verbindung mit Google fehlgeschlagen. Details stehen in der Google-Karte." },
  "nicht-eingerichtet": { ok: false, text: "Google ist noch nicht eingerichtet (GOOGLE_CLIENT_ID fehlt)." },
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
  const prev = shiftAnchor(view, anchor, -1);
  const next = shiftAnchor(view, anchor, 1);
  const range = viewRange(view, anchor);
  const label =
    view === "monat"
      ? fmt(anchor, "MMMM yyyy")
      : view === "woche"
        ? `KW ${isoWeek(range.days[0])} · ${fmt(range.days[0], "d. MMM")} bis ${fmt(range.days[6], "d. MMM yyyy")}`
        : `${fmt(range.days[0], "d. MMM")} bis ${fmt(range.days[27], "d. MMM yyyy")}`;
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-line-2 bg-surface">
          <Link href={calHref({ ansicht: view, datum: prev })} className="grid size-9 place-items-center rounded-l-full text-ink-2 hover:bg-sunken" aria-label="Zurück" scroll={false}>
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={calHref({ ansicht: view, datum: today })} className="flex h-9 items-center border-x border-line-2 px-3 text-[13px] font-semibold hover:bg-sunken" scroll={false}>
            Heute
          </Link>
          <Link href={calHref({ ansicht: view, datum: next })} className="grid size-9 place-items-center rounded-r-full text-ink-2 hover:bg-sunken" aria-label="Weiter" scroll={false}>
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <h2 className="text-[17px] font-semibold" aria-live="polite">
          {label}
        </h2>
      </div>
      <Segmented items={VIEWS.map((v) => ({ href: calHref({ ansicht: v.key, datum: anchor }), label: v.label, active: v.key === view }))} />
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 hidden flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted md:flex" aria-label="Legende">
      {Object.entries(EVENT_KINDS).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cn("size-3 rounded", k === "dreh" ? "bg-accent-soft" : k === "gespraech" ? "bg-info-soft" : k === "deadline" ? "bg-warn-soft" : "bg-sunken")} />
          {v.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-[3px] rounded-full bg-ink-2" /> Leiste in Kundenfarbe
      </span>
    </div>
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

  const render = (v: View) => {
    const r = viewRange(v, anchor);
    if (v === "monat") return <MonthView rows={rows} days={r.days} anchor={anchor} today={today} hints={hints} />;
    if (v === "woche") return <WeekView rows={rows} days={r.days} today={today} now={new Date()} />;
    return <AgendaView rows={rows} days={r.days} today={today} team={options.team} hints={hints} videoCount={videoCount} />;
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
  const [ical, google] = await Promise.all([getIcalSettings(), getGoogleStatus(origin)]);
  return <SyncPanel ical={ical} origin={origin} google={google} />;
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
