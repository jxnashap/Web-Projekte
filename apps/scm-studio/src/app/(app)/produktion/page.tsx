import { ChevronDown, ChevronRight, Clapperboard, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KontingentBar } from "@/components/kontingent-bar";
import { Board } from "@/components/produktion/board";
import { FilterSheet, UrlSelect, UrlToggle } from "@/components/produktion/url-controls";
import { VideoForm } from "@/components/produktion/video-form";
import { VideoList } from "@/components/produktion/video-list";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodStepper } from "@/components/ui/period-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import type { Kontingent } from "@/lib/data/kontingent";
import { monthLabel } from "@/lib/format";
import { createVideo } from "@/lib/produktion/actions";
import { getBoard, getVideoFormOptions } from "@/lib/produktion/data";
import { monthIso, shiftMonth } from "@/lib/time";

export const metadata: Metadata = { title: "Produktion" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function ProduktionPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 04 · Produktion"
        title="Produktion"
        description="Jede Karte ist ein Video. Von der Idee bis online, je Monat und Paket."
      />
      <Suspense fallback={<ProduktionSkeleton />}>
        <Produktion searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function hrefWith(sp: Record<string, string | undefined>, patch: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "neu") next.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  const q = next.toString();
  return q ? `/produktion?${q}` : "/produktion";
}

async function Produktion({ searchParams }: { searchParams: SP }) {
  await connection();
  const raw = await searchParams;
  const current = monthIso();
  const monthParam = one(raw.monat);
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : current;
  const clientId = Number(one(raw.kunde)) || undefined;
  const onlyTest = one(raw.test) === "1";
  const view = one(raw.ansicht) === "liste" ? "liste" : "board";
  const sp = { monat: monthParam, kunde: one(raw.kunde), test: one(raw.test), ansicht: one(raw.ansicht) };
  const filterCount = [clientId, onlyTest].filter(Boolean).length;

  const [{ videos, kontingente }, options] = await Promise.all([getBoard({ month, clientId, onlyTest }), getVideoFormOptions()]);
  const clientOptions = options.clients.map((c) => ({ value: String(c.id), label: c.name }));
  const newHref = hrefWith(sp, { neu: "1" });

  const viewSwitch = (
    <Segmented
      className="max-sm:flex max-sm:w-full max-sm:[&>a]:flex-1"
      items={[
        { href: hrefWith(sp, { ansicht: null }), label: "Spalten", active: view === "board" },
        { href: hrefWith(sp, { ansicht: "liste" }), label: "Liste", active: view === "liste" },
      ]}
    />
  );

  return (
    <div className="grid gap-6">
      {/* Filterleiste: Monat, Filter, Ansicht. Handy: Monat und „Filter“ in einer Zeile, darunter die Ansicht. */}
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <div className="flex items-center justify-between gap-2 sm:contents">
          <PeriodStepper
            label={<span className="capitalize">{monthLabel(month)}</span>}
            prevHref={hrefWith(sp, { monat: shiftMonth(month, -1) })}
            nextHref={hrefWith(sp, { monat: shiftMonth(month, 1) })}
            todayHref={month !== current ? hrefWith(sp, { monat: null }) : undefined}
            todayLabel="Dieser Monat"
          />
          <FilterSheet count={filterCount} className="sm:hidden">
            <UrlSelect param="kunde" label="Kunde" allLabel="Alle Kunden" options={clientOptions} inSheet />
            <UrlToggle param="test" label="Nur Testvideos" />
          </FilterSheet>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <UrlSelect param="kunde" label="Kunde filtern" allLabel="Alle Kunden" options={clientOptions} />
          <UrlToggle param="test" label="Nur Testvideos" />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {viewSwitch}
          <LinkButton href={newHref} scroll={false} className="max-sm:hidden">
            <Plus className="size-4" /> Neue Video-Idee
          </LinkButton>
        </div>
      </div>

      {/* Kontingent: am Computer offen, auf dem Handy zugeklappt (die Videos zuerst) */}
      {kontingente.length > 0 && !onlyTest && <KontingentCard kontingente={kontingente} month={month} sp={sp} />}

      {videos.length === 0 ? (
        filterCount > 0 ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title="Keine Videos für diese Filter"
            action={
              <LinkButton href={hrefWith(sp, { kunde: null, test: null })} scroll={false} variant="secondary">
                Filter zurücksetzen
              </LinkButton>
            }
          >
            Im {monthLabel(month)} passt kein Video zu Kunde oder Testvideo.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<Clapperboard className="size-5" />}
            title={`Noch keine Videos für ${monthLabel(month)}`}
            action={
              <LinkButton href={newHref} scroll={false} variant="secondary">
                <Plus className="size-4" /> Video-Idee anlegen
              </LinkButton>
            }
          >
            Legt Ideen an und schiebt sie über Skript, Dreh und Schnitt bis online.
          </EmptyState>
        )
      ) : view === "liste" ? (
        <VideoList key={`${month}-${clientId}-${onlyTest}`} videos={videos} />
      ) : (
        <Board key={`${month}-${clientId}-${onlyTest}`} videos={videos} />
      )}

      <ParamDialog title="Neue Video-Idee" description="Erst grob anlegen, Details kommen später.">
        <VideoForm action={createVideo} options={options} defaults={{ clientId, month }} submitLabel="Video anlegen" compact />
      </ParamDialog>
    </div>
  );
}

function KontingentCard({ kontingente, month, sp }: { kontingente: Kontingent[]; month: string; sp: Record<string, string | undefined> }) {
  const under = kontingente.filter((k) => k.geplant < k.soll).length;
  const rows = (
    <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
      {kontingente.map((k) => (
        <li key={k.clientId}>
          <Link
            href={hrefWith(sp, { kunde: String(k.clientId) })}
            scroll={false}
            className="-mx-2 flex min-h-12 items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-fill-2"
          >
            <div className="min-w-0 flex-1">
              <KontingentBar k={k} />
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="sr-only">, nach diesem Kunden filtern</span>
          </Link>
        </li>
      ))}
    </ul>
  );
  const sub = "Fertig oder online je Paket, Testvideos zählen nicht. Antippen filtert nach Kunde.";
  return (
    <>
      <Card className="hidden sm:block">
        <CardHeader title={`Kontingent ${monthLabel(month)}`} sub={sub} />
        <div className="px-5 pb-4">{rows}</div>
      </Card>
      <details className="group squircle rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)] sm:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-5 py-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold tracking-[-0.02em]">Kontingent</span>
            <span className="block text-[13px] text-muted">
              {kontingente.length} {kontingente.length === 1 ? "Kunde" : "Kunden"}
              {under > 0 ? `, ${under} noch nicht voll geplant` : ", alles geplant"}
            </span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="px-5 pb-4">
          <p className="mb-2 text-[13px] text-muted">{sub}</p>
          {rows}
        </div>
      </details>
    </>
  );
}

function ProduktionSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-36 rounded-[var(--radius-card)] max-sm:h-14" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-80 min-w-[80vw] flex-1 sm:min-w-[208px]" />
        ))}
      </div>
    </div>
  );
}
