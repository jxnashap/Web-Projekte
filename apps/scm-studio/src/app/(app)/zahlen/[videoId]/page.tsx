import { ExternalLink, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
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
import { DetailSkeleton } from "@/components/ui/skeleton";
import { Table, Td, Th } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { dateDe, dateLong, num, pct } from "@/lib/format";
import { videoStatus } from "@/lib/labels";
import { todayIso } from "@/lib/time";
import { deleteMetric, saveMetric } from "@/lib/zahlen/actions";
import { dedupeSnapshots, interactionsOf } from "@/lib/zahlen/compute";
import { getVideoDetail, getVideoName, getVideoOptions } from "@/lib/zahlen/data";
import { sourceLabel } from "@/lib/zahlen/sources";

type Params = Promise<{ videoId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).videoId);
  const title = Number.isInteger(id) && id > 0 ? await getVideoName(id).catch(() => null) : null;
  return { title: title ? `${title} · Zahlen` : "Video-Zahlen" };
}

export default function VideoZahlenPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
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
  // Welche Messpunkte zählen? Pro Tag einer (Schnittstelle vor manuell vor CSV), die anderen sind ersetzt.
  const used = new Set(dedupeSnapshots(d.rows).map((r) => r.id));
  const dupDays = new Set(d.rows.filter((r) => !used.has(r.id)).map((r) => r.measuredOn));
  const addHref = `/zahlen/${v.id}?neu=1&video=${v.id}`;

  return (
    <>
      <PageHeader
        scene="Szene 07 · Zahlen"
        back={{ href: "/zahlen?reiter=videos", label: "Videos" }}
        title={v.title}
        description={
          <span className="grid gap-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.clientColor }} aria-hidden />
              {[d.clientName, v.format].filter(Boolean).join(" · ")}
            </span>
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge tone={v.status === "online" ? "ok" : st.tone === "dark" ? "neutral" : st.tone}>{st.label}</Badge>
              {v.postDate ? `veröffentlicht ${dateLong(v.postDate)}` : "noch nicht veröffentlicht"}
            </span>
          </span>
        }
        actions={
          <>
            {v.url && (
              <LinkButton href={v.url} target="_blank" rel="noreferrer" variant="secondary">
                <ExternalLink className="size-4" aria-hidden /> Beitrag öffnen
              </LinkButton>
            )}
            <LinkButton href={`/produktion/${v.id}`} variant="secondary">
              In der Produktion
            </LinkButton>
            <LinkButton href={addHref} scroll={false}>
              <Plus className="size-4" aria-hidden /> Stand erfassen
            </LinkButton>
          </>
        }
      />

      {!latest ? (
        <EmptyState
          title="Für dieses Video gibt es noch keine Zahlen"
          action={
            <LinkButton href={addHref} variant="secondary" scroll={false}>
              Ersten Stand erfassen
            </LinkButton>
          }
        >
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
            <CardHeader title="Aufrufe insgesamt" sub="Punkte sind Messungen, dazwischen geschätzt" />
            <div className="px-3 pb-4 sm:px-5">
              <VideoCurveChart data={d.curve} />
            </div>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader
              title="Messpunkte"
              sub={`${d.rows.length} Einträge, neueste zuerst${dupDays.size ? ". Gibt es an einem Tag mehrere Quellen, zählt die Schnittstelle vor manuell vor CSV." : ""}`}
            />
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
                {d.rows.map((r) => {
                  const replaced = !used.has(r.id);
                  return (
                    <tr key={r.id} className={cn(replaced && "text-muted")}>
                      <Td className="whitespace-nowrap">
                        {dateDe(r.measuredOn)}
                        {dupDays.has(r.measuredOn) && (
                          <span className="ml-2 text-[12px] font-medium">{replaced ? "ersetzt" : <span className="text-ok">wird verwendet</span>}</span>
                        )}
                      </Td>
                      <Td className={cn("text-right tabular-nums", !replaced && "font-semibold")}>{num(r.views)}</Td>
                      <Td className="hidden text-right tabular-nums sm:table-cell">{r.reach === null ? "" : num(r.reach)}</Td>
                      <Td className="text-right tabular-nums">{num(r.likes)}</Td>
                      <Td className="hidden text-right tabular-nums sm:table-cell">{num(r.comments)}</Td>
                      <Td className="hidden text-right tabular-nums md:table-cell">{r.shares === null ? "" : num(r.shares)}</Td>
                      <Td className="hidden text-right tabular-nums md:table-cell">{r.saves === null ? "" : num(r.saves)}</Td>
                      <Td className="hidden md:table-cell">
                        <Badge>{sourceLabel(r.source)}</Badge>
                      </Td>
                      <Td className="w-12 py-1.5 text-right">
                        <ActionButton
                          action={deleteMetric.bind(null, r.id)}
                          confirm={{
                            title: `Messpunkt vom ${dateDe(r.measuredOn)} löschen?`,
                            message: `${num(r.views)} Aufrufe (${sourceLabel(r.source)}). Diagramme und Summen rechnen danach ohne diesen Wert.`,
                            confirmLabel: "Löschen",
                            tone: "danger",
                          }}
                          variant="ghost"
                          title="Messpunkt löschen"
                          className="w-8 px-0 text-muted"
                        >
                          <Trash2 className="size-4" aria-hidden />
                          <span className="sr-only">Messpunkt vom {dateDe(r.measuredOn)} löschen</span>
                        </ActionButton>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
      <MetricDialog action={saveMetric} videos={videos} today={todayIso()} videoId={v.id} />
    </>
  );
}
