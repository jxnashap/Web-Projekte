// Reiter "Videos": alle Videos mit Zahlen. Handy: Liste, ab md: Tabelle (ganze Zeile antippbar, sortierbar).
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Table, Td, Th } from "@/components/ui/table";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { dateShort, num, pct } from "@/lib/format";
import type { getVideoTable } from "@/lib/zahlen/data";
import { sourceLabel } from "@/lib/zahlen/sources";

type Row = Awaited<ReturnType<typeof getVideoTable>>[number];
export type VideoSort = "neu" | "aufrufe" | "woche";

const SORT_LABEL: Record<VideoSort, string> = { neu: "Neueste", aufrufe: "Aufrufe", woche: "7 Tage" };

/** Kopfzelle zum Sortieren (absteigend); aria-sort für Screenreader. */
function SortTh({ label, value, sort, href, right }: { label: string; value: VideoSort; sort: VideoSort; href: string; right?: boolean }) {
  const active = sort === value;
  return (
    <Th className={cn(right && "text-right")} aria-sort={active ? "descending" : "none"}>
      <Link href={href} scroll={false} className={cn("hit inline-flex items-center gap-1 hover:text-ink", right && "flex-row-reverse", active && "text-ink")}>
        {label}
        <ChevronDown className={cn("size-3.5", active ? "opacity-100" : "opacity-0")} aria-hidden />
      </Link>
    </Th>
  );
}

export function VideoTable({
  rows,
  sort,
  sortHref,
  filtered,
  resetHref,
}: {
  rows: Row[];
  sort: VideoSort;
  sortHref: (s: VideoSort) => string;
  filtered: boolean;
  resetHref: string;
}) {
  if (!rows.length)
    return filtered ? (
      <EmptyState
        title="Keine passenden Videos"
        action={
          <LinkButton href={resetHref} variant="secondary">
            Filter zurücksetzen
          </LinkButton>
        }
      >
        Für diese Suche oder diesen Kunden gibt es noch keine Videos mit Zahlen.
      </EmptyState>
    ) : (
      <EmptyState
        title="Noch keine Videos mit Zahlen"
        action={
          <LinkButton href="/zahlen?reiter=videos&neu=1" variant="secondary" scroll={false}>
            Zahlen erfassen
          </LinkButton>
        }
      >
        Sobald ihr für ein veröffentlichtes Video Zahlen eintragt, erscheint es hier.
      </EmptyState>
    );

  // in der Tabelle: jede Zelle ist ein Link, nur der Titel ist per Tab erreichbar
  const cell = (r: Row, children: React.ReactNode, className?: string) => (
    <Link href={`/zahlen/${r.id}`} tabIndex={-1} aria-hidden className={cn("block px-4 py-3", className)}>
      {children}
    </Link>
  );

  return (
    <>
      <Segmented
        label="Sortieren"
        className="mb-3 w-full md:hidden [&>a]:flex-1"
        items={(Object.keys(SORT_LABEL) as VideoSort[]).map((s) => ({ href: sortHref(s), label: SORT_LABEL[s], active: s === sort }))}
      />
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line md:hidden">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/zahlen/${r.id}`} className="flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-fill-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 font-semibold leading-snug">{r.title}</div>
                  <div className="mt-0.5 truncate text-[13px] text-muted">{[r.clientName, r.postDate ? dateShort(r.postDate) : null].filter(Boolean).join(" · ")}</div>
                  <div className="text-[13px] tabular-nums text-muted">+{num(r.week)} in 7 Tagen</div>
                </div>
                <div className="shrink-0 text-right font-semibold tabular-nums">{num(r.latest?.views)}</div>
                <ChevronRight className="size-4 shrink-0 text-line-2" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <Table>
            <thead>
              <tr>
                <Th>Video</Th>
                <SortTh label="Veröffentlicht" value="neu" sort={sort} href={sortHref("neu")} />
                <SortTh label="Aufrufe" value="aufrufe" sort={sort} href={sortHref("aufrufe")} right />
                <SortTh label="7 Tage" value="woche" sort={sort} href={sortHref("woche")} right />
                <Th className="text-right">Likes</Th>
                <Th className="text-right">Interaktionsrate</Th>
                <Th>Stand</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-fill-2 has-[a:focus-visible]:bg-fill-2">
                  <Td className="max-w-[360px] p-0">
                    <Link href={`/zahlen/${r.id}`} className="flex items-center gap-2.5 px-4 py-3 focus-visible:outline-offset-[-2px]">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                      <span className="min-w-0 [font-variant-numeric:normal]">
                        <span className="block truncate font-semibold">{r.title}</span>
                        <span className="block truncate text-[12px] text-muted">{[r.clientName, r.format].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap p-0 text-ink-2">{cell(r, r.postDate ? dateShort(r.postDate) : "offen")}</Td>
                  <Td className="p-0 text-right font-semibold tabular-nums">{cell(r, num(r.latest?.views))}</Td>
                  <Td className="p-0 text-right tabular-nums text-ink-2">{cell(r, `+${num(r.week)}`)}</Td>
                  <Td className="p-0 text-right tabular-nums text-ink-2">{cell(r, num(r.latest?.likes))}</Td>
                  <Td className="p-0 text-right tabular-nums text-ink-2">{cell(r, r.rate === null ? "k. A." : pct(r.rate))}</Td>
                  <Td className="whitespace-nowrap p-0">
                    {cell(
                      r,
                      r.latest ? (
                        <span className="inline-flex items-center gap-2 text-[13px] text-ink-2">
                          {dateShort(r.latest.measuredOn)} <Badge>{sourceLabel(r.latest.source)}</Badge>
                        </span>
                      ) : (
                        <span className="text-muted">keine Messung</span>
                      ),
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </>
  );
}
