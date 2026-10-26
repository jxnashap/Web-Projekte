import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KontingentBar } from "@/components/kontingent-bar";
import { Board } from "@/components/produktion/board";
import { UrlSelect, UrlToggle } from "@/components/produktion/url-controls";
import { VideoForm } from "@/components/produktion/video-form";
import { VideoList } from "@/components/produktion/video-list";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
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

  const [{ videos, kontingente }, options] = await Promise.all([getBoard({ month, clientId, onlyTest }), getVideoFormOptions()]);

  return (
    <div className="grid gap-6">
      {/* Filterleiste */}
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex items-center gap-1 rounded-full border border-line-2 bg-surface p-0.5" aria-label="Monat wählen">
          <Link
            href={hrefWith(sp, { monat: shiftMonth(month, -1) })}
            scroll={false}
            className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-sunken"
            aria-label="Vormonat"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-28 text-center text-[13px] font-semibold capitalize">{monthLabel(month)}</span>
          <Link
            href={hrefWith(sp, { monat: shiftMonth(month, 1) })}
            scroll={false}
            className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-sunken"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="size-4" />
          </Link>
        </nav>
        {month !== current && (
          <Link href={hrefWith(sp, { monat: null })} scroll={false} className="text-[13px] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
            Aktueller Monat
          </Link>
        )}
        <UrlSelect param="kunde" label="Kunde filtern" allLabel="Alle Kunden" options={options.clients.map((c) => ({ value: String(c.id), label: c.name }))} />
        <UrlToggle param="test" label="Nur Testvideos" />
        <div className="ml-auto flex items-center gap-2">
          <Segmented
            items={[
              { href: hrefWith(sp, { ansicht: null }), label: "Board", active: view === "board" },
              { href: hrefWith(sp, { ansicht: "liste" }), label: "Liste", active: view === "liste" },
            ]}
          />
          <LinkButton href={hrefWith(sp, { neu: "1" })} scroll={false}>
            <Plus className="size-4" /> Neue Video-Idee
          </LinkButton>
        </div>
      </div>

      {/* Kontingent */}
      {kontingente.length > 0 && !onlyTest && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold">Kontingent {monthLabel(month)}</h2>
            <p className="text-[12px] text-muted">Fertig oder online je Paket. Testvideos zählen nicht.</p>
          </div>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {kontingente.map((k) => (
              <Link key={k.clientId} href={hrefWith(sp, { kunde: String(k.clientId) })} scroll={false} className="rounded-lg outline-offset-4 hover:opacity-80">
                <KontingentBar k={k} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {videos.length === 0 ? (
        <EmptyState
          title={`Noch keine Videos für ${monthLabel(month)}`}
          action={
            <LinkButton href={hrefWith(sp, { neu: "1" })} scroll={false}>
              <Plus className="size-4" /> Erste Video-Idee anlegen
            </LinkButton>
          }
        >
          Legt Ideen an und schiebt sie über Skript, Dreh und Schnitt bis online.
        </EmptyState>
      ) : view === "liste" ? (
        <VideoList key={`${month}-${clientId}-${onlyTest}`} videos={videos} />
      ) : (
        <Board key={`${month}-${clientId}-${onlyTest}`} videos={videos} />
      )}

      <ParamDialog title="Neue Video-Idee" description="Erst grob anlegen, Details kommen später." size="lg">
        <VideoForm
          action={createVideo}
          options={options}
          defaults={{ clientId: Number(one(raw.kunde)) || undefined, month }}
          submitLabel="Video anlegen"
          compact
        />
      </ParamDialog>
    </div>
  );
}

function ProduktionSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-full max-w-xl rounded-full" />
      <Skeleton className="h-36" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-80 min-w-[236px] flex-1" />
        ))}
      </div>
    </div>
  );
}
