import { ArrowUpRight, ChevronRight, CircleAlert, FileUp, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientBars, Delta, FormatBars } from "@/components/zahlen/bars";
import { ViewsByClientChart } from "@/components/zahlen/charts";
import { ClientFilter } from "@/components/zahlen/client-filter";
import { AccountsPanel } from "@/components/zahlen/accounts";
import { MetricDialog } from "@/components/zahlen/metric-form";
import { VideoTable } from "@/components/zahlen/video-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";
import { LinkTabs, Segmented } from "@/components/ui/tabs";
import { dateShort, fmt, num, pct } from "@/lib/format";
import { todayIso } from "@/lib/time";
import { saveMetric } from "@/lib/zahlen/actions";
import { getClientsForFilter, getStaleVideos, getVideoOptions, getVideoTable, getZahlenOverview, type Period, PERIODS } from "@/lib/zahlen/data";

export const metadata = { title: "Zahlen" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TABS = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "videos", label: "Videos" },
  { key: "konten", label: "Konten" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function href(p: { reiter?: Tab; zeitraum?: number; kunde?: number | string; extra?: Record<string, string> }) {
  const q = new URLSearchParams();
  if (p.reiter && p.reiter !== "uebersicht") q.set("reiter", p.reiter);
  if (p.zeitraum && p.zeitraum !== 30) q.set("zeitraum", String(p.zeitraum));
  if (p.kunde) q.set("kunde", String(p.kunde));
  for (const [k, v] of Object.entries(p.extra ?? {})) q.set(k, v);
  const s = q.toString();
  return s ? `/zahlen?${s}` : "/zahlen";
}

function parse(sp: Record<string, string | string[] | undefined>) {
  const reiter = (TABS.find((t) => t.key === one(sp.reiter))?.key ?? "uebersicht") as Tab;
  const z = Number(one(sp.zeitraum));
  const zeitraum: Period = (PERIODS as readonly number[]).includes(z) ? (z as Period) : 30;
  const kunde = Number(one(sp.kunde)) || undefined;
  return { reiter, zeitraum, kunde };
}

export default function ZahlenPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 07 · Zahlen"
        title="Zahlen"
        description="Wie die Videos laufen: Aufrufe, Reichweite und Interaktionen je Kunde, Video und Format."
        actions={
          <>
            <LinkButton href="/zahlen/import" variant="secondary">
              <FileUp className="size-4" /> CSV importieren
            </LinkButton>
            <Suspense fallback={<Skeleton className="h-10 w-40 rounded-full" />}>
              <NewButton searchParams={searchParams} />
            </Suspense>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="mb-6 h-10 w-80" />}>
        <Tabs searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<OverviewSkeleton />}>
        <Body searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <Dialog />
      </Suspense>
    </>
  );
}

async function NewButton({ searchParams }: { searchParams: SP }) {
  const p = parse(await searchParams);
  return (
    <LinkButton href={href({ ...p, extra: { neu: "1" } })} scroll={false}>
      <Plus className="size-4" /> Zahlen erfassen
    </LinkButton>
  );
}

async function Tabs({ searchParams }: { searchParams: SP }) {
  const p = parse(await searchParams);
  return <LinkTabs className="mb-6" items={TABS.map((t) => ({ href: href({ ...p, reiter: t.key }), label: t.label, active: t.key === p.reiter }))} />;
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-9 w-72" />
      <SkeletonCards count={4} />
      <Skeleton className="h-80" />
    </div>
  );
}

async function Dialog() {
  await connection();
  const videos = await getVideoOptions();
  return <MetricDialog action={saveMetric} videos={videos} today={todayIso()} />;
}

async function Body({ searchParams }: { searchParams: SP }) {
  await connection();
  const p = parse(await searchParams);
  if (p.reiter === "konten") return <AccountsPanel />;
  const clients = await getClientsForFilter();
  const filters = (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {p.reiter === "uebersicht" && (
        <Segmented items={PERIODS.map((d) => ({ href: href({ ...p, zeitraum: d }), label: `${d} Tage`, active: d === p.zeitraum }))} />
      )}
      <ClientFilter clients={clients} />
    </div>
  );
  if (p.reiter === "videos") {
    const rows = await getVideoTable(p.kunde);
    return (
      <>
        {filters}
        <VideoTable rows={rows} />
      </>
    );
  }
  return (
    <>
      {filters}
      <Overview days={p.zeitraum} clientId={p.kunde} />
    </>
  );
}

async function Overview({ days, clientId }: { days: Period; clientId?: number }) {
  const [o, stale] = await Promise.all([getZahlenOverview({ days, clientId }), getStaleVideos(clientId)]);
  const range = `${fmt(o.from, "d. MMM")} bis ${fmt(o.to, "d. MMM")}`;
  if (o.now.views === 0 && o.top.length === 0)
    return (
      <div className="grid gap-6">
        <EmptyState
          title="Für diesen Zeitraum gibt es noch keine Zahlen"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href="/zahlen?neu=1">Zahlen erfassen</LinkButton>
              <LinkButton href="/zahlen/import" variant="secondary">
                CSV importieren
              </LinkButton>
            </div>
          }
        >
          Tragt den aktuellen Stand aus der Instagram-Statistik ein oder importiert eine CSV. Später holt die Instagram-Anbindung die Zahlen täglich selbst.
        </EmptyState>
        {stale.length > 0 && <StaleCard stale={stale} />}
      </div>
    );
  const perDay = o.now.views / o.days;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aufrufe" value={num(o.now.views)} sub={<Delta value={change(o.now.views, o.before.views)} />} />
        <Stat label="Interaktionen" value={num(o.now.interactions)} sub={<Delta value={change(o.now.interactions, o.before.interactions)} />} />
        <Stat
          label="Interaktionsrate"
          value={o.now.rate === null ? "k. A." : pct(o.now.rate)}
          sub={<span>Likes, Kommentare, Teilen und Speichern je Aufruf</span>}
        />
        <Stat
          label="Ø Wiedergabezeit"
          value={o.now.avgWatch === null ? "k. A." : `${num(Math.round(o.now.avgWatch * 10) / 10)} s`}
          sub={<span>gewichtet nach Aufrufen · Reichweite {num(o.now.reach)}</span>}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
          <div>
            <div className="text-[13px] font-semibold text-muted">Aufrufe pro {o.unit === "tag" ? "Tag" : "Woche"} · {range}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums">{num(Math.round(perDay))}</span>
              <span className="text-[14px] text-muted">pro Tag im Schnitt</span>
            </div>
          </div>
        </div>
        <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
          <ViewsByClientChart data={o.series} series={o.clients.map((c) => ({ id: c.id, name: c.name, color: c.color }))} unit={o.unit} />
          {o.clients.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2" aria-label="Legende">
              {o.clients.map((c) => (
                <li key={c.id} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: c.color }} aria-hidden />
                  {c.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-muted">
            Zuwachs der Aufrufe, zwischen zwei Messungen gleichmäßig verteilt. Werte aus den Gesamtständen je Video.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Top-Videos" sub={`Nach Aufrufen im Zeitraum (${range})`} />
          <ol className="divide-y divide-line">
            {o.top.map((v, i) => (
              <li key={v.id}>
                <Link href={`/zahlen/${v.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-sunken/50">
                  <span className="w-5 shrink-0 text-[13px] font-semibold tabular-nums text-muted">{i + 1}</span>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: v.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{v.title}</span>
                      {v.demo && <Badge>Demo</Badge>}
                    </div>
                    <div className="truncate text-[13px] text-muted">
                      {[v.clientName, v.format, v.postDate ? `seit ${dateShort(v.postDate)}` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums">{num(v.periodViews)}</div>
                    <div className="text-[12px] tabular-nums text-muted">{num(v.totalViews)} gesamt</div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Formate im Vergleich" sub="Ø Aufrufe je Video bisher, Videos mit Aufrufen im Zeitraum" />
          {o.formats.length ? <FormatBars rows={o.formats} /> : <p className="p-5 text-[13px] text-muted">Noch keine Formate mit Zahlen.</p>}
        </Card>
      </div>

      {!clientId && o.byClient.length > 0 && (
        <Card>
          <CardHeader title="Kunden im Vergleich" sub={`Aufrufe im Zeitraum (${range}). Antippen filtert die Seite auf den Kunden.`} />
          <ClientBars rows={o.byClient} hrefFor={(id) => href({ zeitraum: days, kunde: id })} />
        </Card>
      )}

      {stale.length > 0 && <StaleCard stale={stale} />}
    </div>
  );
}

const change = (a: number, b: number) => (b > 0 ? (a - b) / b : null);

function StaleCard({ stale }: { stale: Awaited<ReturnType<typeof getStaleVideos>> }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <CircleAlert className="size-4 text-warn" aria-hidden /> Zahlen nachtragen
          </span>
        }
        sub="Online-Videos der letzten 45 Tage ohne Messung in den letzten 7 Tagen"
      />
      <ul className="divide-y divide-line">
        {stale.slice(0, 8).map((v) => (
          <li key={v.id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{v.title}</div>
              <div className="truncate text-[13px] text-muted">
                {v.clientName} · {v.lastMeasured ? `zuletzt gemessen ${dateShort(v.lastMeasured)}` : "noch nie gemessen"}
              </div>
            </div>
            <LinkButton href={`/zahlen?neu=1&video=${v.id}`} variant="secondary" size="sm" scroll={false}>
              Erfassen <ArrowUpRight className="size-3.5" />
            </LinkButton>
          </li>
        ))}
      </ul>
    </Card>
  );
}
