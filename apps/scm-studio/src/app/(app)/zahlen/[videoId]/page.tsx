import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { VideoCurveChart } from "@/components/zahlen/charts";
import { MetricDialog } from "@/components/zahlen/metric-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";
import { Table, Td, Th } from "@/components/ui/table";
import { dateDe, dateLong, num, pct } from "@/lib/format";
import { videoStatus } from "@/lib/labels";
import { todayIso } from "@/lib/time";
import { deleteMetric, saveMetric } from "@/lib/zahlen/actions";
import { interactionsOf } from "@/lib/zahlen/compute";
import { getVideoDetail, getVideoOptions } from "@/lib/zahlen/data";

export const metadata = { title: "Video-Zahlen" };

type Params = Promise<{ videoId: string }>;
const SOURCE: Record<string, string> = { manuell: "Manuell", csv: "CSV", instagram: "Instagram", tiktok: "TikTok" };

export default function VideoZahlenPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6">
          <Skeleton className="h-24 max-w-xl" />
          <SkeletonCards />
          <Skeleton className="h-72" />
        </div>
      }
    >
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Params }) {
  await connection();
  const { videoId } = await params;
  const id = Number(videoId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [d, videos] = await Promise.all([getVideoDetail(id), getVideoOptions()]);
  if (!d) notFound();
  const { video: v, latest } = d;
  const st = videoStatus(v.status);
  const inter = latest ? interactionsOf(latest) : 0;

  return (
    <>
      <div className="mb-4">
        <Link href="/zahlen?reiter=videos" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Alle Videos
        </Link>
      </div>
      <PageHeader
        scene="Szene 07 · Zahlen"
        title={v.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: d.clientColor }} aria-hidden />
              {d.clientName}
            </span>
            {v.format && <span>· {v.format}</span>}
            <span>· {v.postDate ? `veröffentlicht ${dateLong(v.postDate)}` : "noch nicht veröffentlicht"}</span>
            <Badge tone={st.tone}>{st.label}</Badge>
          </span>
        }
        actions={
          <>
            {v.url && (
              <a href={v.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink-2 hover:bg-sunken">
                Ansehen <ExternalLink className="size-4" />
              </a>
            )}
            <LinkButton href={`/produktion/${v.id}`} variant="secondary">
              In der Produktion
            </LinkButton>
            <LinkButton href={`/zahlen/${v.id}?neu=1&video=${v.id}`} scroll={false}>
              <Plus className="size-4" /> Stand erfassen
            </LinkButton>
          </>
        }
      />

      {!latest ? (
        <EmptyState title="Für dieses Video gibt es noch keine Zahlen" action={<LinkButton href={`/zahlen/${v.id}?neu=1&video=${v.id}`}>Ersten Stand erfassen</LinkButton>}>
          Tragt die Zahlen aus der Instagram-Statistik ein. Mehrere Messungen ergeben den Verlauf.
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat label="Aufrufe" value={num(latest.views)} sub={`Stand ${dateDe(latest.measuredOn)}`} />
            <Stat label="Reichweite" value={latest.reach === null ? "k. A." : num(latest.reach)} sub="erreichte Konten" />
            <Stat label="Interaktionen" value={num(inter)} sub={`${num(latest.likes)} Likes · ${num(latest.comments)} Kommentare`} />
            <Stat
              label="Interaktionsrate"
              value={latest.views > 0 ? pct(inter / latest.views) : "k. A."}
              sub={latest.avgWatchSeconds ? `Ø Wiedergabe ${num(latest.avgWatchSeconds)} s` : "Wiedergabezeit nicht erfasst"}
            />
          </div>
          <Card>
            <CardHeader title="Aufrufe insgesamt" sub="Rote Punkte sind Messungen, dazwischen geschätzt" />
            <div className="px-3 pb-4 sm:px-5">
              <VideoCurveChart data={d.curve} />
            </div>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Messpunkte" sub={`${d.rows.length} Einträge, neueste zuerst`} />
            <Table>
              <thead>
                <tr>
                  <Th>Datum</Th>
                  <Th className="text-right">Aufrufe</Th>
                  <Th className="hidden text-right sm:table-cell">Reichweite</Th>
                  <Th className="text-right">Likes</Th>
                  <Th className="hidden text-right sm:table-cell">Kommentare</Th>
                  <Th className="hidden text-right md:table-cell">Geteilt</Th>
                  <Th className="hidden text-right md:table-cell">Gespeichert</Th>
                  <Th className="hidden md:table-cell">Quelle</Th>
                  <Th>
                    <span className="sr-only">Aktionen</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap">{dateDe(r.measuredOn)}</Td>
                    <Td className="text-right font-semibold tabular-nums">{num(r.views)}</Td>
                    <Td className="hidden text-right tabular-nums sm:table-cell">{r.reach === null ? "" : num(r.reach)}</Td>
                    <Td className="text-right tabular-nums">{num(r.likes)}</Td>
                    <Td className="hidden text-right tabular-nums sm:table-cell">{num(r.comments)}</Td>
                    <Td className="hidden text-right tabular-nums md:table-cell">{r.shares === null ? "" : num(r.shares)}</Td>
                    <Td className="hidden text-right tabular-nums md:table-cell">{r.saves === null ? "" : num(r.saves)}</Td>
                    <Td className="hidden md:table-cell">
                      <Badge>{SOURCE[r.source] ?? r.source}</Badge>
                    </Td>
                    <Td className="w-10 text-right">
                      <ActionButton
                        action={deleteMetric.bind(null, r.id)}
                        confirm={`Messpunkt vom ${dateDe(r.measuredOn)} löschen?`}
                        variant="ghost"
                        title="Messpunkt löschen"
                        className="text-muted"
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Messpunkt vom {dateDe(r.measuredOn)} löschen</span>
                      </ActionButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
      <MetricDialog action={saveMetric} videos={videos} today={todayIso()} videoId={v.id} />
    </>
  );
}
