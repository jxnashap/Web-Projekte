// Reiter "Videos": alle Videos mit Zahlen, neueste zuerst. Handy: Liste, ab md: Tabelle.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { LinkButton } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { dateShort, num, pct } from "@/lib/format";
import type { getVideoTable } from "@/lib/zahlen/data";

type Row = Awaited<ReturnType<typeof getVideoTable>>[number];

const SOURCE: Record<string, string> = { manuell: "manuell", csv: "CSV", instagram: "Instagram", tiktok: "TikTok" };

export function VideoTable({ rows }: { rows: Row[] }) {
  if (!rows.length)
    return (
      <EmptyState title="Noch keine Videos mit Zahlen" action={<LinkButton href="/zahlen?reiter=videos&neu=1">Zahlen erfassen</LinkButton>}>
        Sobald ihr für ein veröffentlichtes Video Zahlen eintragt, erscheint es hier.
      </EmptyState>
    );
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/zahlen/${r.id}`} className="flex items-center gap-3 px-4 py-3">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.title}</div>
                <div className="truncate text-[13px] text-muted">
                  {r.clientName}
                  {r.postDate ? ` · ${dateShort(r.postDate)}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold tabular-nums">{num(r.latest?.views)}</div>
                <div className="text-[12px] tabular-nums text-muted">+{num(r.week)} in 7 Tagen</div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Video</Th>
              <Th>Veröffentlicht</Th>
              <Th className="text-right">Aufrufe</Th>
              <Th className="text-right">7 Tage</Th>
              <Th className="text-right">Likes</Th>
              <Th className="text-right">Rate</Th>
              <Th>Stand</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-sunken/50">
                <Td className="max-w-[360px]">
                  <Link href={`/zahlen/${r.id}`} className="flex items-center gap-2.5">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold hover:underline">{r.title}</span>
                      <span className="block truncate text-[12px] text-muted">{[r.clientName, r.format].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-2">{r.postDate ? dateShort(r.postDate) : "offen"}</Td>
                <Td className="text-right font-semibold tabular-nums">{num(r.latest?.views)}</Td>
                <Td className="text-right tabular-nums text-ink-2">+{num(r.week)}</Td>
                <Td className="text-right tabular-nums text-ink-2">{num(r.latest?.likes)}</Td>
                <Td className="text-right tabular-nums text-ink-2">{r.rate === null ? "k. A." : pct(r.rate)}</Td>
                <Td className="whitespace-nowrap">
                  {r.latest ? (
                    <span className="inline-flex items-center gap-2 text-[13px] text-ink-2">
                      {dateShort(r.latest.measuredOn)} <Badge>{SOURCE[r.latest.source] ?? r.latest.source}</Badge>
                    </span>
                  ) : (
                    <span className="text-muted">keine Messung</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
