import { ChevronDown, ChevronRight, CircleAlert, FileUp, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientBars, Delta, FormatBars } from "@/components/zahlen/bars";
import { ViewsByClientChart } from "@/components/zahlen/charts";
import { ClientFilter } from "@/components/zahlen/client-filter";
import { AccountsPanel } from "@/components/zahlen/accounts";
import { MetricDialog } from "@/components/zahlen/metric-form";
import { VideoTable, type VideoSort } from "@/components/zahlen/video-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";
import { LinkTabs, Segmented } from "@/components/ui/tabs";
import { UrlSearch } from "@/components/ui/url-search";
import { dateShort, fmt, num, pct } from "@/lib/format";
import { todayIso } from "@/lib/time";
import { saveMetric } from "@/lib/zahlen/actions";
import { getClientsForFilter, getStaleVideos, getVideoOptions, getVideoTable, getZahlenOverview, type Period, PERIODS } from "@/lib/zahlen/data";

export const metadata = { title: "Zahlen" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const TABS = [
  { key: "uebersicht", label: "Überblick" },
  { key: "videos", label: "Videos" },
  { key: "konten", label: "Konten" },
] as const;
type Tab = (typeof TABS)[number]["key"];

type Sort = VideoSort;
const SORTS: Sort[] = ["neu", "aufrufe", "woche"];

function href(p: { reiter?: Tab; zeitraum?: number; kunde?: number | string; sort?: Sort; q?: string; extra?: Record<string, string> }) {
  const q = new URLSearchParams();
  if (p.reiter && p.reiter !== "uebersicht") q.set("reiter", p.reiter);
  if (p.zeitraum && p.zeitraum !== 30) q.set("zeitraum", String(p.zeitraum));
  if (p.kunde) q.set("kunde", String(p.kunde));
  if (p.reiter === "videos" && p.sort && p.sort !== "neu") q.set("sort", p.sort);
  if (p.reiter === "videos" && p.q) q.set("q", p.q);
  for (const [k, v] of Object.entries(p.extra ?? {})) q.set(k, v);
  const s = q.toString();
  return s ? `/zahlen?${s}` : "/zahlen";
}

function parse(sp: Record<string, string | string[] | undefined>) {
  const reiter = (TABS.find((t) => t.key === one(sp.reiter))?.key ?? "uebersicht") as Tab;
  const z = Number(one(sp.zeitraum));
  const zeitraum: Period = (PERIODS as readonly number[]).includes(z) ? (z as Period) : 30;
  const kunde = Number(one(sp.kunde)) || undefined;
  const sort: Sort = SORTS.find((x) => x === one(sp.sort)) ?? "neu";
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  return { reiter, zeitraum, kunde, sort, q };
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
  if (p.reiter === "videos") {
    const all = await getVideoTable(p.kunde);
    const needle = p.q?.toLowerCase();
    const rows = (needle ? all.filter((r) => r.title.toLowerCase().includes(needle) || r.clientName.toLowerCase().includes(needle)) : all).sort((a, b) =>
      p.sort === "aufrufe" ? (b.latest?.views ?? 0) - (a.latest?.views ?? 0) : p.sort === "woche" ? b.week - a.week : 0,
    );
    return (
      <>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <UrlSearch placeholder="Video oder Kunde suchen" className="w-full sm:w-72" />
          <ClientFilter clients={clients} />
        </div>
        <VideoTable
          rows={rows}
          sort={p.sort}
          sortHref={(s: Sort) => href({ ...p, sort: s })}
          filtered={Boolean(p.q || p.kunde)}
          resetHref={href({ reiter: "videos" })}
        />
      </>
    );
  }
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented label="Zeitraum" items={PERIODS.map((d) => ({ href: href({ ...p, zeitraum: d }), label: `${d} Tage`, active: d === p.zeitraum }))} />
        <ClientFilter clients={clients} />
      </div>
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
        {stale.length > 0 && <StaleHint stale={stale} />}
        <EmptyState
          title="Für diesen Zeitraum gibt es noch keine Zahlen"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href="/zahlen?neu=1" variant="secondary" scroll={false}>
                Zahlen erfassen
              </LinkButton>
              <LinkButton href="/zahlen/import" variant="secondary">
                CSV importieren
              </LinkButton>
            </div>
          }
        >
          Tragt den aktuellen Stand aus der Instagram-Statistik ein oder importiert eine CSV. Später holt die Instagram-Anbindung die Zahlen täglich selbst.
        </EmptyState>
      </div>
    );
  const weekly = o.unit === "woche";
  const perUnit = weekly ? o.now.views / (o.days / 7) : o.now.views / o.days;
  const partialKey = weekly && o.partialDays < 7 ? String(o.series.at(-1)?.key ?? "") : undefined;
  return (
    <div className="grid gap-6">
      {stale.length > 0 && <StaleHint stale={stale} />}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Aufrufe" value={num(o.now.views)} sub={<Delta value={change(o.now.views, o.before.views)} />} />
        <Stat label="Reichweite" value={num(o.now.reach)} sub={<Delta value={change(o.now.reach, o.before.reach)} />} />
        <Stat
          label="Interaktionen"
          value={num(o.now.interactions)}
          sub={o.now.rate === null ? "Likes, Kommentare, Teilen, Speichern" : `${pct(o.now.rate)} je Aufruf (Interaktionsrate)`}
        />
        <Stat
          label="Ø Wiedergabezeit"
          value={o.now.avgWatch === null ? "k. A." : `${num(Math.round(o.now.avgWatch * 10) / 10)} s`}
          sub="gewichtet nach Aufrufen"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-[13px] font-semibold text-muted">
              Aufrufe pro {weekly ? "Woche" : "Tag"} · {range}
            </h2>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums">{num(Math.round(perUnit))}</span>
              <span className="text-[14px] text-muted">pro {weekly ? "Woche" : "Tag"} im Schnitt</span>
            </div>
          </div>
        </div>
        <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
          <ViewsByClientChart data={o.series} series={o.clients.map((c) => ({ id: c.id, name: c.name, color: c.color }))} unit={o.unit} partialKey={partialKey} />
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
            Zuwachs der Aufrufe, zwischen zwei Messungen gleichmäßig verteilt.
            {partialKey && ` Die letzte Woche läuft noch (${o.partialDays} von 7 Tagen) und ist deshalb niedriger.`}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="self-start xl:col-span-3">
          <CardHeader title="Top-Videos" sub={`Nach Aufrufen im Zeitraum (${range})`} />
          <ol className="divide-y divide-line">
            {o.top.map((v, i) => (
              <li key={v.id}>
                <Link href={`/zahlen/${v.id}`} className="flex min-h-12 items-center gap-3 px-5 py-3 transition-colors hover:bg-fill-2">
                  <span className="w-4 shrink-0 text-[13px] font-semibold tabular-nums text-muted">{i + 1}</span>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: v.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-semibold leading-snug sm:line-clamp-1">{v.title}</div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
                      <span className="truncate">
                        {v.clientName}
                        <span className="hidden sm:inline">{v.format ? ` · ${v.format}` : ""}</span>
                      </span>
                      {v.demo && <Badge className="hidden h-[18px] px-1.5 text-[11px] sm:inline-flex">Demo</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[13px] tabular-nums text-muted sm:hidden">
                      {num(v.totalViews)} gesamt
                      {v.demo && <Badge className="h-[18px] px-1.5 text-[11px]">Demo</Badge>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums">{num(v.periodViews)}</div>
                    <div className="hidden text-[12px] tabular-nums text-muted sm:block">{num(v.totalViews)} gesamt</div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-line-2" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="self-start xl:col-span-2">
          <CardHeader title="Formate im Vergleich" sub="Ø Aufrufe je Video im Zeitraum, nur Videos mit Aufrufen" />
          {o.formats.length ? <FormatBars rows={o.formats} /> : <p className="p-5 pt-2 text-[13px] text-muted">Noch keine Formate mit Zahlen.</p>}
        </Card>
      </div>

      {!clientId && o.byClient.length > 0 && (
        <Card>
          <CardHeader title="Kunden im Vergleich" sub={`Aufrufe im Zeitraum (${range}). Antippen filtert die Seite auf den Kunden.`} />
          <ClientBars rows={o.byClient} hrefFor={(id) => href({ zeitraum: days, kunde: id })} />
        </Card>
      )}
    </div>
  );
}

const change = (a: number, b: number) => (b > 0 ? (a - b) / b : null);

/** Handlungsbedarf oben als kompakte Zeile, die Liste klappt auf. */
function StaleHint({ stale }: { stale: Awaited<ReturnType<typeof getStaleVideos>> }) {
  const n = stale.length;
  return (
    <details className="group squircle rounded-[var(--radius-card)] bg-warn-soft/70">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-[14px] [&::-webkit-details-marker]:hidden">
        <CircleAlert className="size-4 shrink-0 text-warn" aria-hidden />
        <span className="min-w-0 flex-1 text-ink-2">
          <span className="font-semibold text-ink">
            {n} Video{n === 1 ? "" : "s"} ohne aktuelle Zahlen
          </span>
          <span className="hidden sm:inline"> · online seit höchstens 45 Tagen, letzte Messung älter als 7 Tage</span>
        </span>
        <span className="shrink-0 font-semibold text-accent-ink">Nachtragen</span>
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="mx-2 mb-2 divide-y divide-line rounded-[14px] bg-surface">
        {stale.slice(0, 8).map((v) => (
          <li key={v.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 font-semibold leading-snug">{v.title}</div>
              <div className="truncate text-[13px] text-muted">
                {v.clientName} · {v.lastMeasured ? `zuletzt gemessen ${dateShort(v.lastMeasured)}` : "noch nie gemessen"}
              </div>
            </div>
            <LinkButton href={`/zahlen?neu=1&video=${v.id}`} variant="secondary" size="sm" scroll={false}>
              Erfassen
            </LinkButton>
          </li>
        ))}
      </ul>
    </details>
  );
}
