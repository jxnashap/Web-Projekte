import { FilePlus2, SearchX, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FilterSheet, UrlSearch, UrlSelect } from "@/components/produktion/url-controls";
import { AiUsageCard } from "@/components/skripte/ai-usage-card";
import { NewBlankButton } from "@/components/skripte/new-blank-button";
import { SourceBadge } from "@/components/skripte/source-badge";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { dateShort } from "@/lib/format";
import { videoStatus } from "@/lib/labels";
import { getScriptOptions, listScripts } from "@/lib/skripte/data";
import { scriptStatusLabel } from "@/lib/skripte/schema";

export const metadata: Metadata = { title: "Skripte" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SOURCE_OPTIONS = [
  { value: "ki", label: "KI" },
  { value: "demo", label: "Demo" },
  { value: "manuell", label: "Von Hand" },
];

export default function SkriptePage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 05 · Skripte"
        title="Skripte"
        description="Drehbücher nach dem SCM-Bauplan: Hook, Wiedererkennen, Steigerung, Pointe, Aufruf."
        actions={
          <>
            <NewBlankButton />
            <LinkButton href="/skripte/neu">
              <Sparkles className="size-4" /> Mit KI schreiben
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Suspense fallback={<ListSkeleton />}>
          <ScriptList searchParams={searchParams} />
        </Suspense>
        <aside className="grid content-start gap-6">
          <Suspense fallback={<Skeleton className="h-48 rounded-[var(--radius-card)]" />}>
            <AiUsageCard />
          </Suspense>
        </aside>
      </div>
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
  return q ? `/skripte?${q}` : "/skripte";
}

async function ScriptList({ searchParams }: { searchParams: SP }) {
  await connection();
  const raw = await searchParams;
  const q = one(raw.q)?.slice(0, 80);
  const clientId = Number(one(raw.kunde)) || undefined;
  const status = ["entwurf", "final"].includes(one(raw.status) ?? "") ? one(raw.status) : undefined;
  const source = ["ki", "manuell", "demo"].includes(one(raw.quelle) ?? "") ? one(raw.quelle) : undefined;
  const [rows, { clients }] = await Promise.all([listScripts({ q, clientId, status, source }), getScriptOptions()]);
  const filtered = Boolean(q || clientId || status || source);
  const sp = { q, kunde: one(raw.kunde), status, quelle: source };

  const clientOptions = clients.map((c) => ({ value: String(c.id), label: c.name }));
  const statusSeg = (full: boolean) => (
    <Segmented
      label="Status"
      className={full ? "flex w-full [&>a]:flex-1" : undefined}
      items={[
        { href: hrefWith(sp, { status: null }), label: "Alle", active: !status },
        { href: hrefWith(sp, { status: "entwurf" }), label: "Entwurf", active: status === "entwurf" },
        { href: hrefWith(sp, { status: "final" }), label: "Fertig", active: status === "final" },
      ]}
    />
  );

  return (
    <div className="grid content-start gap-4">
      {/* Filterleiste: Suche links, dann Filter. Handy: Suche plus Knopf „Filter“. */}
      <div className="flex flex-wrap items-center gap-2">
        <UrlSearch param="q" placeholder="Skripte suchen" className="min-w-0 flex-1 sm:max-w-72" />
        <FilterSheet count={[clientId, status, source].filter(Boolean).length} className="sm:hidden">
          <UrlSelect param="kunde" label="Kunde" allLabel="Alle Kunden" options={clientOptions} inSheet />
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Status</span>
            {statusSeg(true)}
          </div>
          <UrlSelect param="quelle" label="Entstanden" allLabel="Jede Quelle" options={SOURCE_OPTIONS} inSheet />
        </FilterSheet>
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <UrlSelect param="kunde" label="Kunde filtern" allLabel="Alle Kunden" options={clientOptions} className="sm:w-44" />
          {statusSeg(false)}
          <UrlSelect param="quelle" label="Quelle filtern" allLabel="Jede Quelle" options={SOURCE_OPTIONS} className="sm:w-36" />
        </div>
      </div>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title={q ? `Keine Treffer für „${q}“` : "Kein Skript passt zu diesen Filtern"}
            action={
              <LinkButton href="/skripte" variant="secondary">
                Filter zurücksetzen
              </LinkButton>
            }
          >
            Andere Suchwörter probieren oder Filter lösen.
          </EmptyState>
        ) : (
          <EmptyState
            title="Noch keine Skripte"
            action={
              <LinkButton href="/skripte/neu" variant="secondary">
                <Sparkles className="size-4" /> Erstes Skript schreiben
              </LinkButton>
            }
          >
            Die KI schreibt einen ersten Entwurf nach dem SCM-Bauplan. Ihr verfeinert und speichert.
          </EmptyState>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ s, clientName, clientColor, videoTitle, videoStatus: vs }) => (
            <li key={s.id}>
              <Link
                href={`/skripte/${s.id}`}
                className="squircle flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]"
              >
                <div className="flex items-center gap-2 text-[13px] text-muted">
                  {clientName ? (
                    <>
                      <Dot color={clientColor ?? "var(--color-line-2)"} />
                      <span className="min-w-0 flex-1 truncate">{clientName}</span>
                    </>
                  ) : (
                    <span className="flex-1">Ohne Kunde</span>
                  )}
                  <SourceBadge source={s.source} />
                  <Badge tone={s.status === "final" ? "ok" : "neutral"}>{scriptStatusLabel(s.status)}</Badge>
                </div>
                <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-ink">{s.title}</h2>
                {s.hook && <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-ink-2">„{s.hook}“</p>}
                <div className="mt-auto grid gap-1 pt-4 text-[13px] text-muted">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {s.format && <span>{s.format}</span>}
                    <span>
                      {s.beats.length} {s.beats.length === 1 ? "Schritt" : "Schritte"}
                    </span>
                    <span className="ml-auto">{dateShort(s.updatedAt)}</span>
                  </div>
                  {videoTitle ? (
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate">Video: {videoTitle}</span>
                      {vs && <span className="shrink-0">· Status {videoStatus(vs).label}</span>}
                    </div>
                  ) : (
                    <div>Ohne Video</div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <FilePlus2 className="size-4 shrink-0" aria-hidden /> Tipp: Aus einem Video heraus geschrieben, wird das Skript direkt verknüpft.
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid content-start gap-4">
      <Skeleton className="h-9 w-full max-w-lg" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}
