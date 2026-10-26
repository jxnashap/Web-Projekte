"use client";
// Listenansicht der Produktion: nach Ablauf gruppiert (Idee bis Online), innerhalb nach Drehtermin.
// Status je Zeile über das Kit-Select; bei Online steht das Online-Datum statt des Drehtermins.
import { ScrollText } from "lucide-react";
import Link from "next/link";
import { Badge, Dot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Table, Td, Th } from "@/components/ui/table";
import { dateShort } from "@/lib/format";
import { PLATFORMS, VIDEO_STATUS } from "@/lib/labels";
import type { BoardVideo } from "@/lib/produktion/data";
import { TONE_DOT, videosLabel } from "./board";
import { useVideoMove } from "./use-video-move";

const byShoot = (a: BoardVideo, b: BoardVideo) => (a.shootDate ?? "9999").localeCompare(b.shootDate ?? "9999") || a.id - b.id;

function StatusSelect({ v, onMove, className }: { v: BoardVideo; onMove: (id: number, status: string) => void; className?: string }) {
  return (
    <Select aria-label={`Status von „${v.title}“`} value={v.status} onChange={(e) => onMove(v.id, e.target.value)} className={className}>
      {VIDEO_STATUS.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}

function when(v: BoardVideo) {
  if (v.status === "online") return v.postDate ? `Online ${dateShort(v.postDate)}` : "Online, Datum offen";
  return v.shootDate ? `Dreh ${dateShort(v.shootDate)}` : "Dreh offen";
}

export function VideoList({ videos: initial }: { videos: BoardVideo[] }) {
  const { videos, move, dialog } = useVideoMove(initial);
  const groups = VIDEO_STATUS.map((st) => ({ st, items: videos.filter((v) => v.status === st.key).sort(byShoot) })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Handy: Karten je Abschnitt */}
      <div className="grid gap-6 md:hidden">
        {groups.map(({ st, items }) => (
          <section key={st.key} aria-label={`${st.label}, ${videosLabel(items.length)}`} className="grid gap-2">
            <h2 className="flex items-center gap-2 px-1 text-[15px] font-semibold">
              <span className="size-2 rounded-full" style={{ background: TONE_DOT[st.tone] }} aria-hidden />
              {st.label}
              <span className="font-normal tabular-nums text-muted">{items.length}</span>
            </h2>
            {items.map((v) => (
              <Card key={v.id} className="relative p-4">
                <div className="flex items-center gap-2 text-[13px] text-muted">
                  <Dot color={v.clientColor} />
                  <span className="min-w-0 flex-1 truncate">{v.clientName}</span>
                  {v.isTest && <Badge tone="warn">Test</Badge>}
                </div>
                <Link
                  href={`/produktion/${v.id}`}
                  className="mt-1 block text-[16px] font-semibold leading-snug after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] hover:underline"
                >
                  {v.title}
                </Link>
                <div className="relative mt-3 flex items-center gap-3">
                  <StatusSelect v={v} onMove={move} className="w-36 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{when(v)}</span>
                  {v.assignee && (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fill text-[11px] font-semibold text-ink-2" role="img" aria-label={`Zuständig: ${v.assignee.name}`}>
                      {v.assignee.initials}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </section>
        ))}
      </div>

      {/* ab Tablet: Tabelle mit Abschnittsköpfen */}
      <Card className="hidden overflow-hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Video</Th>
              <Th>Kunde</Th>
              <Th>Status</Th>
              <Th>Dreh</Th>
              <Th>Online</Th>
              <Th>Zuständig</Th>
            </tr>
          </thead>
          {groups.map(({ st, items }) => (
            <tbody key={st.key}>
              <tr>
                <th colSpan={6} scope="colgroup" className="bg-fill-2 px-4 py-2 text-left text-[13px] font-semibold text-ink-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: TONE_DOT[st.tone] }} aria-hidden />
                    {st.label}
                    <span className="font-normal tabular-nums text-muted">{items.length}</span>
                  </span>
                </th>
              </tr>
              {items.map((v) => (
                <tr key={v.id}>
                  <Td>
                    <Link href={`/produktion/${v.id}`} className="font-semibold hover:underline">
                      {v.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
                      {v.format && <span>{v.format}</span>}
                      {v.isTest && <Badge tone="warn">Test</Badge>}
                      {v.hasScript && (
                        <span className="inline-flex items-center gap-1 text-info">
                          <ScrollText className="size-3.5" aria-hidden /> Skript
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <Dot color={v.clientColor} /> {v.clientName}
                    </span>
                  </Td>
                  <Td>
                    <StatusSelect v={v} onMove={move} className="w-32 sm:h-8 sm:text-[14px]" />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-2">{dateShort(v.shootDate) || <span className="text-muted">offen</span>}</Td>
                  <Td className="whitespace-nowrap text-ink-2">
                    {v.postDate ? (
                      v.url ? (
                        <a href={v.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                          {dateShort(v.postDate)} · {PLATFORMS[v.platform ?? "instagram"] ?? v.platform}
                        </a>
                      ) : (
                        dateShort(v.postDate)
                      )
                    ) : (
                      <span className="text-muted">noch nicht</span>
                    )}
                  </Td>
                  <Td className="text-ink-2">{v.assignee?.name ?? <span className="text-muted">niemand</span>}</Td>
                </tr>
              ))}
            </tbody>
          ))}
        </Table>
      </Card>
      {dialog}
    </>
  );
}
