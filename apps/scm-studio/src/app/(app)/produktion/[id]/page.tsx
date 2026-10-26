import { ExternalLink, FileDown, ScrollText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScriptLinkForm } from "@/components/produktion/script-link-form";
import { StatusStepper } from "@/components/produktion/status-stepper";
import { VideoMoreMenu } from "@/components/produktion/video-actions";
import { VideoForm } from "@/components/produktion/video-form";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { compact, dateDe, dateShort, monthLabel, num, pct } from "@/lib/format";
import { deleteVideo, updateVideo } from "@/lib/produktion/actions";
import { getVideo, getVideoFormOptions, getVideoTitle } from "@/lib/produktion/data";
import { scriptStatusLabel } from "@/lib/skripte/schema";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const title = Number.isInteger(id) && id > 0 ? await getVideoTitle(id) : null;
  return { title: title ? `${title} · Produktion` : "Video" };
}

export default function VideoPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <VideoDetail params={params} />
    </Suspense>
  );
}

async function VideoDetail({ params }: { params: Params }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [data, options] = await Promise.all([getVideo(id), getVideoFormOptions()]);
  if (!data) notFound();
  const { video, client, script, linkable, metrics } = data;
  const latest = metrics[0];
  const engagement = latest && latest.views > 0 ? (latest.likes + latest.comments + (latest.shares ?? 0) + (latest.saves ?? 0)) / latest.views : null;

  return (
    <>
      <PageHeader
        scene="Szene 04 · Produktion"
        back={{ href: `/produktion?monat=${video.month}`, label: "Produktion" }}
        eyebrow={<span className="capitalize">{monthLabel(video.month)}</span>}
        title={video.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Link href={`/kunden/${client.id}`} className="hit inline-flex items-center gap-1.5 font-semibold text-ink-2 hover:underline">
              <Dot color={client.color} /> {client.name}
            </Link>
            {video.format && <span>· {video.format}</span>}
            {video.isTest && <Badge tone="warn">Testvideo</Badge>}
          </span>
        }
        actions={
          <>
            {video.url && (
              <LinkButton href={video.url} target="_blank" rel="noreferrer" variant="secondary">
                <ExternalLink className="size-4" /> Beitrag öffnen
              </LinkButton>
            )}
            <VideoMoreMenu title={video.title} remove={deleteVideo.bind(null, video.id)} hasMetrics={metrics.length > 0} />
          </>
        }
      />

      {/* Reihenfolge im DOM = Reihenfolge auf dem Handy: Status, Skript, Zahlen, Bearbeiten.
          Am Computer stehen Skript und Zahlen rechts daneben. */}
      <div className="grid items-start gap-6 xl:grid-cols-3 xl:grid-rows-[auto_1fr]">
        <Card className="xl:col-span-2">
          <CardHeader title="Status" sub="Antippen, um das Video weiterzuschieben" />
          <div className="px-5 pb-5">
            <StatusStepper video={{ id: video.id, title: video.title, status: video.status, url: video.url }} />
          </div>
        </Card>

        <div className="grid content-start gap-6 xl:col-start-3 xl:row-span-2 xl:row-start-1">
          <Card>
            <CardHeader
              title="Skript"
              sub={script ? scriptStatusLabel(script.status) : "Noch kein Skript"}
              action={
                script ? (
                  <LinkButton href={`/skripte/${script.id}`} variant="ghost" size="sm">
                    Bearbeiten
                  </LinkButton>
                ) : undefined
              }
            />
            <div className="grid gap-4 px-5 pb-5">
              {script ? (
                <div className="squircle rounded-[14px] bg-sunken p-4">
                  <div className="font-semibold">{script.title}</div>
                  {script.hook && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">„{script.hook}“</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <LinkButton href={`/skripte/${script.id}?ansicht=drehbuch`} variant="secondary" size="sm" className="bg-surface hover:bg-surface/70">
                      <ScrollText className="size-4" /> Drehbuch ansehen
                    </LinkButton>
                    <LinkButton href={`/api/skripte/${script.id}/pdf`} target="_blank" variant="secondary" size="sm" prefetch={false} className="bg-surface hover:bg-surface/70">
                      <FileDown className="size-4" /> PDF öffnen
                    </LinkButton>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[15px] text-muted">Die KI schreibt einen Entwurf nach dem SCM-Bauplan, Kunde und Format sind schon eingetragen.</p>
                  <LinkButton href={`/skripte/neu?video=${video.id}`}>
                    <Sparkles className="size-4" /> Skript schreiben
                  </LinkButton>
                </>
              )}
              {linkable.length > 0 && <ScriptLinkForm videoId={video.id} current={script?.id ?? null} scripts={linkable} />}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Zahlen"
              sub={latest ? `Stand ${dateDe(latest.measuredOn)}` : "Noch keine Zahlen erfasst"}
              action={
                <LinkButton href={`/zahlen/${video.id}`} variant="ghost" size="sm">
                  {latest ? "Verlauf" : "Zahlen eintragen"}
                </LinkButton>
              }
            />
            {latest ? (
              <div className="px-5 pb-5">
                <dl className="grid grid-cols-3 gap-4">
                  <Metric label="Aufrufe" value={compact(latest.views)} />
                  <Metric label="Likes" value={num(latest.likes)} />
                  <Metric label="Kommentare" value={num(latest.comments)} />
                  <Metric label="Geteilt" value={latest.shares != null ? num(latest.shares) : "k. A."} />
                  <Metric label="Gespeichert" value={latest.saves != null ? num(latest.saves) : "k. A."} />
                  <Metric label="Interaktion" value={engagement != null ? pct(engagement) : "k. A."} />
                </dl>
                {metrics.length > 1 && (
                  <ol className="mt-4 grid gap-1 border-t border-hairline pt-3 text-[13px] text-muted">
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
              <p className="px-5 pb-5 text-[15px] text-muted">
                {video.status === "online"
                  ? "Tragt die ersten Zahlen ein oder verbindet das Instagram-Konto unter Zahlen."
                  : "Sobald das Video online ist, tragt ihr hier Aufrufe und Likes ein."}
              </p>
            )}
          </Card>
        </div>

        <Card className="xl:col-span-2">
          <CardHeader title="Video bearbeiten" />
          <div className="px-5 pb-5">
            <VideoForm
              action={updateVideo.bind(null, video.id)}
              options={options}
              video={video}
              submitLabel="Speichern"
              submitVariant={script ? "primary" : "secondary"}
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-1 text-[18px] font-bold tabular-nums">{value}</dd>
    </div>
  );
}
