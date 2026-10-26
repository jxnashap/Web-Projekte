import { Camera, FilePlus2, Lightbulb, Plus, ScrollText, SearchX, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FilterSheet, UrlSearch, UrlSelect } from "@/components/produktion/url-controls";
import { VideoForm } from "@/components/produktion/video-form";
import { AiUsageCard } from "@/components/skripte/ai-usage-card";
import { IdeaCard } from "@/components/skripte/idea-card";
import { IdeaForm } from "@/components/skripte/idea-form";
import { TrendCard } from "@/components/skripte/trend-card";
import { NewBlankButton } from "@/components/skripte/new-blank-button";
import { SourceBadge } from "@/components/skripte/source-badge";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { DialogButton, ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkTabs, Segmented } from "@/components/ui/tabs";
import { dateShort, monthLabel } from "@/lib/format";
import { videoStatus } from "@/lib/labels";
import { createVideo, setVideoStatus } from "@/lib/produktion/actions";
import { getVideoFormOptions } from "@/lib/produktion/data";
import { getScriptOptions, listScripts } from "@/lib/skripte/data";
import { countIdeas, listIdeas, listPreShoot } from "@/lib/skripte/ideen";
import { createIdea } from "@/lib/skripte/ideen-actions";
import { scriptStatusLabel } from "@/lib/skripte/schema";

export const metadata: Metadata = { title: "Ideen & Skripte" };
// „Jetzt recherchieren“ (Seitenleiste) läuft als Server Action dieser Seite im Hintergrund weiter
export const maxDuration = 300;

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SOURCE_OPTIONS = [
  { value: "ki", label: "KI" },
  { value: "demo", label: "Demo" },
  { value: "manuell", label: "Von Hand" },
];

type View = "ideen" | "skripte" | "eingeplant";
const viewOf = (v: string | undefined): View => (v === "skripte" || v === "eingeplant" ? v : "ideen");

export default function SkriptePage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 05 · Ideen & Skripte"
        title="Ideen & Skripte"
        description="Video-Ideen sammeln, das passende Skript dazu schreiben und Videos bis zum Dreh begleiten. Jede Nacht kommen Vorschläge aus der Trend-Recherche dazu."
        actions={
          <>
            <Suspense fallback={null}>
              <NewIdeaButton />
            </Suspense>
            <NewBlankButton />
            <LinkButton href="/skripte/neu">
              <Sparkles className="size-4" /> Creative Engine
            </LinkButton>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="mb-6 h-11 w-96 max-w-full" />}>
        <Tabs searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewIdeaButton() {
  await connection();
  const { clients } = await getScriptOptions();
  return (
    <>
      <DialogButton label="Neue Idee" title="Neue Video-Idee" description="Kurz festhalten, das Skript kommt später." variant="secondary" icon={<Lightbulb className="size-4" />}>
        <IdeaForm action={createIdea} clients={clients} submitLabel="Idee speichern" />
      </DialogButton>
      {/* dieselbe Eingabe über die Schnellaktion (/skripte?neu=idee) */}
      <ParamDialog value="idee" title="Neue Video-Idee" description="Kurz festhalten, das Skript kommt später.">
        <IdeaForm action={createIdea} clients={clients} submitLabel="Idee speichern" />
      </ParamDialog>
    </>
  );
}

async function Tabs({ searchParams }: { searchParams: SP }) {
  await connection();
  const view = viewOf(one((await searchParams).ansicht));
  const [counts, pre] = await Promise.all([countIdeas(), listPreShoot()]);
  return (
    <LinkTabs
      className="mb-6"
      items={[
        { href: "/skripte", label: "Ideen", count: counts.vorschlag + counts.offen, active: view === "ideen" },
        { href: "/skripte?ansicht=skripte", label: "Skripte", active: view === "skripte" },
        { href: "/skripte?ansicht=eingeplant", label: "Vor dem Dreh", count: pre.length, active: view === "eingeplant" },
      ]}
    />
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  await connection();
  const raw = await searchParams;
  const view = viewOf(one(raw.ansicht));
  if (view === "eingeplant") return <PreShoot searchParams={searchParams} />;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      {view === "skripte" ? <ScriptList searchParams={searchParams} /> : <Ideas searchParams={searchParams} />}
      <aside className="grid content-start gap-6">
        {view === "ideen" && (
          <Suspense fallback={<Skeleton className="h-48 rounded-[var(--radius-card)]" />}>
            <TrendCard />
          </Suspense>
        )}
        <Suspense fallback={<Skeleton className="h-48 rounded-[var(--radius-card)]" />}>
          <AiUsageCard />
        </Suspense>
      </aside>
    </div>
  );
}

async function Ideas({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const showDiscarded = one(raw.status) === "verworfen";
  if (showDiscarded) {
    const rows = await listIdeas({ status: "verworfen" });
    return (
      <div className="grid content-start gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Verworfene Ideen</h2>
          <LinkButton href="/skripte" variant="ghost" size="sm">
            Zurück zu den Ideen
          </LinkButton>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Nichts verworfen">Verworfene Vorschläge und Ideen landen hier und lassen sich zurückholen.</EmptyState>
        ) : (
          <IdeaGrid rows={rows} />
        )}
      </div>
    );
  }
  const [suggestions, own, counts] = await Promise.all([listIdeas({ status: "vorschlag" }), listIdeas({ status: "offen" }), countIdeas()]);
  return (
    <div className="grid content-start gap-8">
      {suggestions.length > 0 && (
        <section className="grid gap-3" aria-labelledby="vorschlaege">
          <div>
            <h2 id="vorschlaege" className="text-[20px] font-semibold tracking-[-0.02em]">
              Neu aus der Recherche
            </h2>
            <p className="text-[15px] text-muted">Übernehmen, was passt. Der Rest lässt sich verwerfen.</p>
          </div>
          <IdeaGrid rows={suggestions} />
        </section>
      )}
      <section className="grid gap-3" aria-labelledby="eigene">
        <h2 id="eigene" className="text-[20px] font-semibold tracking-[-0.02em]">
          Eure Ideen
        </h2>
        {own.length === 0 ? (
          <EmptyState icon={<Lightbulb className="size-5" />} title="Noch keine Ideen">
            Haltet Ideen mit „Neue Idee“ fest oder übernehmt Vorschläge aus der Recherche. Zu jeder Idee schreibt ihr dann das Skript.
          </EmptyState>
        ) : (
          <IdeaGrid rows={own} />
        )}
      </section>
      {counts.verworfen > 0 && (
        <Link href="/skripte?status=verworfen" className="text-[15px] font-medium text-accent-ink hover:underline">
          Verworfene Ideen ansehen ({counts.verworfen})
        </Link>
      )}
    </div>
  );
}

function IdeaGrid({ rows }: { rows: Awaited<ReturnType<typeof listIdeas>> }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {rows.map((r) => (
        <li key={r.i.id}>
          <IdeaCard row={r} />
        </li>
      ))}
    </ul>
  );
}

async function PreShoot({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const monthParam = one(raw.monat);
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : undefined;
  const [rows, options] = await Promise.all([listPreShoot({ month }), getVideoFormOptions()]);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.v.month, [...(groups.get(r.v.month) ?? []), r]);
  return (
    <div className="grid content-start gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[15px] text-muted">
          Eingeplante Videos bis zum Dreh. Nach dem Dreh auf „Gedreht“ setzen, dann wandern sie in die Produktion zum Schnitt.
          {month && (
            <>
              {" "}
              Gefiltert auf <span className="capitalize">{monthLabel(month)}</span>.{" "}
              <Link href="/skripte?ansicht=eingeplant" className="font-medium text-accent-ink hover:underline">
                Alle Monate
              </Link>
            </>
          )}
        </p>
        <DialogButton label="Video einplanen" title="Video einplanen" description="Für einen Kunden und Monat, zählt ins Kontingent." icon={<Plus className="size-4" />}>
          <VideoForm action={createVideo} options={options} defaults={{ month, status: "idee" }} submitLabel="Einplanen" compact />
        </DialogButton>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Camera className="size-5" />} title="Nichts vor dem Dreh">
          Plant eine Idee für einen Kunden ein oder legt ein Video an. Es steht dann hier, bis es gedreht ist.
        </EmptyState>
      ) : (
        [...groups.entries()].map(([m, items]) => (
          <section key={m} className="grid gap-2" aria-label={monthLabel(m)}>
            <h2 className="px-1 text-[17px] font-semibold capitalize">
              {monthLabel(m)} <span className="font-normal text-muted">{items.length}</span>
            </h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-hairline">
                {items.map(({ v, clientName, clientColor, scriptTitle }) => {
                  const st = videoStatus(v.status);
                  return (
                    <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap">
                      <div className="min-w-0 flex-1 basis-60">
                        <div className="flex items-center gap-2 text-[13px] text-muted">
                          <Dot color={clientColor} />
                          <span className="truncate">{clientName}</span>
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {v.shootDate && <span className="shrink-0">Dreh {dateShort(v.shootDate)}</span>}
                        </div>
                        <Link href={`/produktion/${v.id}`} className="mt-0.5 block truncate text-[15px] font-semibold text-ink hover:underline">
                          {v.title}
                        </Link>
                        {scriptTitle ? (
                          <Link href={`/skripte/${v.scriptId}`} className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-info hover:underline">
                            <ScrollText className="size-3.5" aria-hidden /> {scriptTitle}
                          </Link>
                        ) : (
                          <span className="mt-0.5 block text-[13px] text-muted">Noch ohne Skript</span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {!scriptTitle && (
                          <LinkButton href={`/skripte/neu?video=${v.id}`} variant="ghost" size="sm">
                            <Sparkles className="size-4" aria-hidden /> Skript
                          </LinkButton>
                        )}
                        <ActionButton action={setVideoStatus.bind(null, v.id, "gedreht")}>
                          <Camera className="size-4" aria-hidden /> Gedreht
                        </ActionButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))
      )}
    </div>
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
  const sp = { ansicht: "skripte", q, kunde: one(raw.kunde), status, quelle: source };

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
              <LinkButton href="/skripte?ansicht=skripte" variant="secondary">
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
