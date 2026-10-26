"use client";
// Listenansicht der Produktion: kompakt, mit Status-Auswahl je Zeile.
import { ScrollText } from "lucide-react";
import Link from "next/link";
import { Badge, Dot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { dateShort } from "@/lib/format";
import { PLATFORMS, VIDEO_STATUS } from "@/lib/labels";
import type { BoardVideo } from "@/lib/produktion/data";
import { useVideoMove } from "./board";

const statusSelect =
  "h-8 rounded-full border border-line-2 bg-surface px-2.5 text-[12px] font-semibold text-ink-2 hover:border-faint focus:border-ink focus:outline-none";

export function VideoList({ videos: initial }: { videos: BoardVideo[] }) {
  const { videos, move } = useVideoMove(initial);
  if (videos.length === 0) return <EmptyState title="Keine Videos für diese Auswahl" />;
  return (
    <>
      {/* Handy: Karten */}
      <ul className="grid gap-2 md:hidden">
        {videos.map((v) => (
          <li key={v.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <Dot color={v.clientColor} />
              <span className="min-w-0 flex-1 truncate">{v.clientName}</span>
              {v.isTest && <Badge tone="warn" className="h-5 px-2 text-[11px]">Test</Badge>}
            </div>
            <Link href={`/produktion/${v.id}`} className="mt-1 block font-semibold leading-snug hover:underline">
              {v.title}
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <select aria-label="Status" className={statusSelect} value={v.status} onChange={(e) => move(v.id, e.target.value)}>
                {VIDEO_STATUS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-muted">{v.shootDate ? `Dreh ${dateShort(v.shootDate)}` : v.format}</span>
              {v.assignee && <span className="ml-auto text-[12px] font-semibold text-ink-2">{v.assignee.initials}</span>}
            </div>
          </li>
        ))}
      </ul>
      {/* ab Tablet: Tabelle */}
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface md:block">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12px] font-semibold uppercase tracking-wide text-muted">
              <th className="border-b border-line px-4 py-2.5">Video</th>
              <th className="border-b border-line px-4 py-2.5">Kunde</th>
              <th className="border-b border-line px-4 py-2.5">Status</th>
              <th className="border-b border-line px-4 py-2.5">Dreh</th>
              <th className="border-b border-line px-4 py-2.5">Online</th>
              <th className="border-b border-line px-4 py-2.5">Zuständig</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="hover:bg-canvas">
                <td className="border-b border-line px-4 py-3">
                  <Link href={`/produktion/${v.id}`} className="font-semibold hover:underline">
                    {v.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                    {v.format && <span className="font-mono uppercase">{v.format}</span>}
                    {v.isTest && <Badge tone="warn" className="h-5 px-2 text-[11px]">Test</Badge>}
                    {v.hasScript && (
                      <span className="inline-flex items-center gap-1 text-info">
                        <ScrollText className="size-3.5" aria-hidden /> Skript
                      </span>
                    )}
                  </div>
                </td>
                <td className="border-b border-line px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <Dot color={v.clientColor} /> {v.clientName}
                  </span>
                </td>
                <td className="border-b border-line px-4 py-3">
                  <select aria-label={`Status von ${v.title}`} className={statusSelect} value={v.status} onChange={(e) => move(v.id, e.target.value)}>
                    {VIDEO_STATUS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-line px-4 py-3 text-ink-2">{dateShort(v.shootDate) || <span className="text-faint">offen</span>}</td>
                <td className="border-b border-line px-4 py-3 text-ink-2">
                  {v.postDate ? (
                    v.url ? (
                      <a href={v.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                        {dateShort(v.postDate)} · {PLATFORMS[v.platform ?? "instagram"] ?? v.platform}
                      </a>
                    ) : (
                      dateShort(v.postDate)
                    )
                  ) : (
                    <span className="text-faint">noch nicht</span>
                  )}
                </td>
                <td className="border-b border-line px-4 py-3 text-ink-2">{v.assignee?.name ?? <span className="text-faint">niemand</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
