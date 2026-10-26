import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Planner } from "@/components/posting/planner";
import { UrlSelect } from "@/components/produktion/url-controls";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodStepper } from "@/components/ui/period-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { fmt } from "@/lib/format";
import { addDaysIso, isIsoDay, isoWeek, monthGrid, weekDays } from "@/lib/kalender/dates";
import { getPosts, getReadyToPost } from "@/lib/posting/data";
import { getVideoFormOptions } from "@/lib/produktion/data";
import { todayIso } from "@/lib/time";

export const metadata: Metadata = { title: "Posting" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function PostingPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 06 · Posting"
        title="Posting"
        description="Wann welches fertige Video online geht, je Kunde und Plattform. Fertige Videos auf einen Tag ziehen, Uhrzeit und Caption festlegen, nach dem Posten abhaken."
      />
      <Suspense fallback={<PostingSkeleton />}>
        <Posting searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function hrefWith(sp: Record<string, string | undefined>, patch: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) next.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  const q = next.toString();
  return q ? `/posting?${q}` : "/posting";
}

async function Posting({ searchParams }: { searchParams: SP }) {
  await connection();
  const raw = await searchParams;
  const today = todayIso();
  const mode = one(raw.ansicht) === "monat" ? "monat" : "woche";
  const anchor = isIsoDay(one(raw.datum)) ? one(raw.datum)! : today;
  const clientId = Number(one(raw.kunde)) || undefined;
  const sp = { ansicht: mode === "monat" ? "monat" : undefined, datum: one(raw.datum), kunde: one(raw.kunde) };

  const days = mode === "monat" ? monthGrid(anchor) : weekDays(anchor);
  const [posts, queue, options] = await Promise.all([
    getPosts(days[0], addDaysIso(days[days.length - 1], 1), clientId),
    getReadyToPost(clientId),
    getVideoFormOptions(),
  ]);
  const shift = (dir: -1 | 1) => {
    if (mode === "woche") return addDaysIso(anchor, dir * 7);
    const [y, m] = anchor.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10);
  };
  const label = mode === "woche" ? `KW ${isoWeek(days[0])} · ${fmt(days[0], "d. MMM")} bis ${fmt(days[6], "d. MMM yyyy")}` : fmt(anchor, "MMMM yyyy");
  const planned = posts.filter((p) => p.status !== "online").length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodStepper
          label={<span className={mode === "monat" ? "capitalize" : undefined}>{label}</span>}
          prevHref={hrefWith(sp, { datum: shift(-1) })}
          nextHref={hrefWith(sp, { datum: shift(1) })}
          todayHref={days.includes(today) ? undefined : hrefWith(sp, { datum: null })}
          todayLabel="Heute"
        />
        <UrlSelect param="kunde" label="Kunde filtern" allLabel="Alle Kunden" options={options.clients.map((c) => ({ value: String(c.id), label: c.name }))} className="sm:w-48" />
        <span className="text-[13px] text-muted">
          {planned === 1 ? "1 Post geplant" : `${planned} Posts geplant`}, {queue.length} bereit
        </span>
        <Segmented
          className="ml-auto"
          items={[
            { href: hrefWith(sp, { ansicht: null }), label: "Woche", active: mode === "woche" },
            { href: hrefWith(sp, { ansicht: "monat" }), label: "Monat", active: mode === "monat" },
          ]}
        />
      </div>
      <Planner key={`${mode}-${days[0]}-${clientId ?? ""}`} mode={mode} days={days} month={anchor.slice(0, 7)} today={today} now={Date.parse(new Date().toISOString())} posts={posts} queue={queue} />
      <p className="text-[13px] text-muted">
        Gepostet wird von Hand in Instagram oder TikTok. Automatisches Veröffentlichen bräuchte zusätzliche Freigaben bei Meta und TikTok und ist noch nicht angebunden.
      </p>
    </div>
  );
}

function PostingSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
        <Skeleton className="h-[460px] rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
