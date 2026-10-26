import { ArrowLeft, ExternalLink, FileDown, ScrollText, Sparkles, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScriptLinkForm } from "@/components/produktion/script-link-form";
import { StatusStepper } from "@/components/produktion/status-stepper";
import { VideoForm } from "@/components/produktion/video-form";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { compact, dateDe, dateShort, monthLabel, num, pct } from "@/lib/format";
import { deleteVideo, updateVideo } from "@/lib/produktion/actions";
import { getVideo, getVideoFormOptions } from "@/lib/produktion/data";

export const metadata: Metadata = { title: "Video" };

export default function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <VideoDetail params={params} />
    </Suspense>
  );
}

async function VideoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [data, options] = await Promise.all([getVideo(id), getVideoFormOptions()]);
  if (!data) notFound();
  const { video, client, script, linkable, metrics } = data;
  const latest = metrics[0];
  const engagement = latest && latest.views > 0 ? (latest.likes + latest.comments + (latest.shares ?? 0) + (latest.saves ?? 0)) / latest.views : null;
  const backHref = `/produktion?monat=${video.month}`;

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Produktion {monthLabel(video.month)}
      </Link>
      <PageHeader
        scene="Szene 04 · Produktion"
        title={video.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Link href={`/kunden/${client.id}`} className="inline-flex items-center gap-1.5 font-semibold text-ink-2 hover:underline">
              <Dot color={client.color} /> {client.name}
            </Link>
            {video.format && <span>· {video.format}</span>}
            {video.isTest && <Badge tone="warn">Testvideo</Badge>}
          </span>
        }
        actions={
          video.url ? (
            <LinkButton href={video.url} target="_blank" rel="noreferrer" variant="secondary">
              <ExternalLink className="size-4" /> Beitrag öffnen
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid content-start gap-6 xl:col-span-2">
          <Card>
            <CardHeader title="Status" sub="Antippen, um das Video weiterzuschieben" />
            <div className="p-5">
              <StatusStepper id={video.id} status={video.status} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Video bearbeiten" />
            <div className="p-5">
              <VideoForm action={updateVideo.bind(null, video.id)} options={options} video={video} submitLabel="Speichern" />
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader
              title="Skript"
              sub={script ? (script.status === "final" ? "Final" : "Entwurf") : "Noch kein Skript"}
              action={
                script ? (
                  <LinkButton href={`/skripte/${script.id}`} variant="ghost" size="sm">
                    Öffnen
                  </LinkButton>
                ) : undefined
              }
            />
            <div className="grid gap-4 p-5">
              {script ? (
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <div className="font-semibold">{script.title}</div>
                  {script.hook && <p className="mt-2 font-mono text-[13px] leading-relaxed text-ink-2">„{script.hook}“</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkButton href={`/skripte/${script.id}?ansicht=drehbuch`} variant="secondary" size="sm">
                      <ScrollText className="size-4" /> Drehbuch
                    </LinkButton>
                    <LinkButton href={`/api/skripte/${script.id}/pdf`} target="_blank" variant="secondary" size="sm" prefetch={false}>
                      <FileDown className="size-4" /> PDF
                    </LinkButton>
                  </div>
                </div>
              ) : (
                <LinkButton href={`/skripte/neu?video=${video.id}`}>
                  <Sparkles className="size-4" /> Skript schreiben
                </LinkButton>
              )}
              {linkable.length > 0 && <ScriptLinkForm videoId={video.id} current={script?.id ?? null} scripts={linkable} />}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Zahlen"
              sub={latest ? `Stand ${dateDe(latest.measuredOn)}` : "Noch keine Zahlen erfasst"}
              action={
                <LinkButton href="/zahlen" variant="ghost" size="sm">
                  Zahlen
                </LinkButton>
              }
            />
            {latest ? (
              <div className="p-5">
                <dl className="grid grid-cols-3 gap-4">
                  <Metric label="Aufrufe" value={compact(latest.views)} />
                  <Metric label="Likes" value={num(latest.likes)} />
                  <Metric label="Kommentare" value={num(latest.comments)} />
                  <Metric label="Geteilt" value={latest.shares != null ? num(latest.shares) : "k. A."} />
                  <Metric label="Gespeichert" value={latest.saves != null ? num(latest.saves) : "k. A."} />
                  <Metric label="Interaktion" value={engagement != null ? pct(engagement) : "k. A."} />
                </dl>
                {metrics.length > 1 && (
                  <ol className="mt-4 grid gap-1 border-t border-line pt-3 text-[12px] text-muted">
                    {metrics.slice(0, 5).map((m) => (
                      <li key={m.id} className="flex justify-between">
                        <span>{dateShort(m.measuredOn)}</span>
                        <span>
                          {num(m.views)} Aufrufe · {num(m.likes)} Likes
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : (
              <p className="p-5 text-[13px] text-muted">Sobald das Video online ist, tragt die Zahlen unter Zahlen ein oder verbindet das Instagram-Konto.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Video löschen" />
            <div className="p-5">
              {metrics.length > 0 ? (
                <p className="text-[13px] text-muted">Für dieses Video gibt es schon Zahlen. Es bleibt deshalb erhalten.</p>
              ) : (
                <ActionButton action={deleteVideo.bind(null, video.id)} confirm={`„${video.title}“ wirklich löschen?`} variant="danger">
                  <Trash2 className="size-4" /> Löschen
                </ActionButton>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="scene-label">{label}</dt>
      <dd className="mt-1 text-[18px] font-bold">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-16 w-2/3" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[520px] xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
