import { ArrowLeft, CheckCircle2, Copy, FileDown, RotateCcw, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DrehbuchView } from "@/components/skripte/drehbuch-view";
import { ScriptEditor } from "@/components/skripte/script-editor";
import { SourceBadge } from "@/components/skripte/source-badge";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { LinkTabs } from "@/components/ui/tabs";
import { dateTime, monthLabel } from "@/lib/format";
import { videoStatus } from "@/lib/labels";
import { deleteScript, duplicateScript, linkToVideo, saveScript, setScriptStatus } from "@/lib/skripte/actions";
import { getScript, getScriptOptions } from "@/lib/skripte/data";
import { modelLabel } from "@/lib/skripte/pricing";

export const metadata: Metadata = { title: "Skript" };

type Params = Promise<{ id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export default function SkriptPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <SkriptDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SkriptDetail({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const sp = await searchParams;
  const view = sp.ansicht === "drehbuch" ? "drehbuch" : "bearbeiten";
  const [row, opts] = await Promise.all([getScript(id), getScriptOptions()]);
  if (!row) notFound();
  const { s, client, video, author } = row;
  const videoChoices = opts.videos.filter((v) => !s.clientId || v.clientId === s.clientId);
  if (video && !videoChoices.some((v) => v.id === video.id)) videoChoices.unshift({ ...video, scriptId: video.scriptId });

  return (
    <>
      <Link href="/skripte" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Alle Skripte
      </Link>
      <PageHeader
        scene="Szene 05 · Skripte"
        title={s.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {client ? (
              <Link href={`/kunden/${client.id}`} className="inline-flex items-center gap-1.5 font-semibold text-ink-2 hover:underline">
                <Dot color={client.color} /> {client.name}
              </Link>
            ) : (
              <span>Ohne Kunde</span>
            )}
            {s.format && <span>· {s.format}</span>}
            <SourceBadge source={s.source} />
            <Badge tone={s.status === "final" ? "ok" : "neutral"}>{s.status === "final" ? "Final" : "Entwurf"}</Badge>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/api/skripte/${s.id}/pdf`} target="_blank" variant="secondary" prefetch={false}>
              <FileDown className="size-4" /> PDF
            </LinkButton>
            <ActionButton action={duplicateScript.bind(null, s.id)} variant="secondary" size="md">
              <Copy className="size-4" /> Duplizieren
            </ActionButton>
            {s.status === "final" ? (
              <ActionButton action={setScriptStatus.bind(null, s.id, "entwurf")} variant="secondary" size="md">
                <RotateCcw className="size-4" /> Wieder Entwurf
              </ActionButton>
            ) : (
              <ActionButton action={setScriptStatus.bind(null, s.id, "final")} variant="primary" size="md">
                <CheckCircle2 className="size-4" /> Final
              </ActionButton>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 content-start gap-5">
          <LinkTabs
            items={[
              { href: `/skripte/${s.id}`, label: "Bearbeiten", active: view === "bearbeiten" },
              { href: `/skripte/${s.id}?ansicht=drehbuch`, label: "Drehbuch", active: view === "drehbuch" },
            ]}
          />
          {view === "drehbuch" ? (
            <DrehbuchView script={s} clientName={client?.name ?? null} />
          ) : (
            <Card className="p-5 sm:p-6">
              <ScriptEditor
                key={s.updatedAt.toISOString()}
                action={saveScript.bind(null, s.id)}
                script={{ title: s.title, format: s.format, hook: s.hook, beats: s.beats, caption: s.caption, cta: s.cta, status: s.status, clientId: s.clientId }}
                clients={opts.clients}
              />
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader title="Video" sub={video ? "Verknüpft" : "Noch nicht verknüpft"} />
            <div className="grid gap-4 p-5">
              {video && (
                <Link href={`/produktion/${video.id}`} className="rounded-xl border border-line bg-canvas p-3 hover:border-line-2">
                  <div className="font-semibold">{video.title}</div>
                  <div className="mt-1 text-[12px] text-muted">
                    {videoStatus(video.status).label} · {monthLabel(video.month)}
                  </div>
                </Link>
              )}
              <ActionForm action={linkToVideo.bind(null, s.id)} className="grid gap-2">
                <Field label={video ? "Anderes Video" : "Mit Video verknüpfen"} name="videoId">
                  <Select name="videoId" defaultValue={String(video?.id ?? "")}>
                    <option value="">Kein Video</option>
                    {videoChoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="flex justify-end">
                  <SubmitButton variant="secondary" size="sm">
                    Übernehmen
                  </SubmitButton>
                </div>
              </ActionForm>
            </div>
          </Card>

          <Card>
            <CardHeader title="Infos" />
            <dl className="grid gap-3 p-5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Entstanden</dt>
                <dd className="text-right">{s.source === "ki" ? `KI (${modelLabel(s.model ?? "")})` : s.source === "demo" ? "Demo-Generator" : "Von Hand"}</dd>
              </div>
              {author && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Von</dt>
                  <dd className="text-right">{author}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Zuletzt geändert</dt>
                <dd className="text-right">{dateTime(s.updatedAt)}</dd>
              </div>
              {s.briefing && (
                <div className="border-t border-line pt-3">
                  <dt className="text-muted">Briefing</dt>
                  <dd className="mt-1 whitespace-pre-line text-ink-2">{s.briefing}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Skript löschen" />
            <div className="p-5">
              <ActionButton action={deleteScript.bind(null, s.id)} confirm={`„${s.title}“ wirklich löschen?`} variant="danger">
                <Trash2 className="size-4" /> Löschen
              </ActionButton>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-2/3" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Skeleton className="h-[640px]" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
