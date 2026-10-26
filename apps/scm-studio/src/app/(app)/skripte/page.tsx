import { FilePlus2, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { UrlSearch, UrlSelect } from "@/components/produktion/url-controls";
import { AiUsageCard } from "@/components/skripte/ai-usage-card";
import { NewBlankButton } from "@/components/skripte/new-blank-button";
import { SourceBadge } from "@/components/skripte/source-badge";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { dateShort } from "@/lib/format";
import { videoStatus } from "@/lib/labels";
import { getScriptOptions, listScripts } from "@/lib/skripte/data";

export const metadata: Metadata = { title: "Skripte" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

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
        <aside className="order-first grid content-start gap-6 xl:order-none">
          <Suspense fallback={<Skeleton className="h-48" />}>
            <AiUsageCard />
          </Suspense>
        </aside>
      </div>
    </>
  );
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

  return (
    <div className="grid content-start gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <UrlSearch param="q" placeholder="Titel, Hook oder Caption suchen" />
        <UrlSelect param="kunde" label="Kunde filtern" allLabel="Alle Kunden" options={clients.map((c) => ({ value: String(c.id), label: c.name }))} />
        <UrlSelect
          param="status"
          label="Status filtern"
          allLabel="Jeder Status"
          options={[
            { value: "entwurf", label: "Entwurf" },
            { value: "final", label: "Final" },
          ]}
        />
        <UrlSelect
          param="quelle"
          label="Quelle filtern"
          allLabel="Jede Quelle"
          options={[
            { value: "ki", label: "KI" },
            { value: "demo", label: "Demo" },
            { value: "manuell", label: "Von Hand" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState title="Kein Skript passt zu diesen Filtern" action={<LinkButton href="/skripte" variant="secondary">Filter zurücksetzen</LinkButton>} />
        ) : (
          <EmptyState
            title="Noch keine Skripte"
            action={
              <LinkButton href="/skripte/neu">
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
                className="flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-line-2"
              >
                <div className="flex items-center gap-2 text-[12px] text-muted">
                  {clientName ? (
                    <>
                      <Dot color={clientColor ?? "var(--color-line-2)"} />
                      <span className="min-w-0 flex-1 truncate">{clientName}</span>
                    </>
                  ) : (
                    <span className="flex-1">Ohne Kunde</span>
                  )}
                  <SourceBadge source={s.source} />
                  <Badge tone={s.status === "final" ? "ok" : "neutral"}>{s.status === "final" ? "Final" : "Entwurf"}</Badge>
                </div>
                <h2 className="mt-2 text-[16px] font-semibold leading-snug text-ink">{s.title}</h2>
                {s.hook && <p className="mt-2 line-clamp-2 font-mono text-[13px] leading-relaxed text-ink-2">„{s.hook}“</p>}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[12px] text-muted">
                  {s.format && <span className="font-mono uppercase">{s.format}</span>}
                  <span>{s.beats.length} Beats</span>
                  {videoTitle ? (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <span className="truncate">Video: {videoTitle}</span>
                      {vs && <span className="text-ink-2">({videoStatus(vs).label})</span>}
                    </span>
                  ) : (
                    <span>ohne Video</span>
                  )}
                  <span className="ml-auto">{dateShort(s.updatedAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 text-[12px] text-muted">
        <FilePlus2 className="size-3.5" aria-hidden /> Tipp: Aus einem Video heraus geschrieben, wird das Skript direkt verknüpft.
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid content-start gap-4">
      <Skeleton className="h-9 w-full max-w-lg rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}
