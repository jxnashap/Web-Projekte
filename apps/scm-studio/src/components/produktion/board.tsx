"use client";
// Produktions-Board: eine Spalte je Status, jede Karte ist ein Video.
// Status ändern per „Weiter“-Knopf, Menü oder (Desktop) Ziehen und Ablegen. Änderungen erscheinen sofort (optimistisch).
import { ArrowRight, Camera, Check, ExternalLink, GripVertical, ScrollText } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge, Dot } from "@/components/ui/badge";
import { Menu, menuItemClass } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { dateShort } from "@/lib/format";
import { VIDEO_STATUS } from "@/lib/labels";
import { setVideoStatus } from "@/lib/produktion/actions";
import type { BoardVideo } from "@/lib/produktion/data";

const TONE_DOT: Record<string, string> = {
  neutral: "var(--color-faint)",
  info: "var(--color-info)",
  warn: "var(--color-warn)",
  ok: "var(--color-ok)",
  dark: "var(--color-ink)",
  accent: "var(--color-accent)",
};

export function useVideoMove(videos: BoardVideo[]) {
  const [optimistic, apply] = useOptimistic(videos, (state, m: { id: number; status: string }) =>
    state.map((v) => (v.id === m.id ? { ...v, status: m.status } : v)),
  );
  const [pending, start] = useTransition();
  const move = (id: number, status: string) =>
    start(async () => {
      apply({ id, status });
      const r = await setVideoStatus(id, status);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error ?? "Status konnte nicht geändert werden.");
    });
  return { videos: optimistic, move, pending };
}

export function Board({ videos: initial }: { videos: BoardVideo[] }) {
  const { videos, move } = useVideoMove(initial);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-8 sm:px-8" role="region" aria-label="Produktions-Board, seitlich scrollbar">
      <div className="flex gap-3">
        {VIDEO_STATUS.map((st) => {
          const items = videos.filter((v) => v.status === st.key);
          return (
            <section
              key={st.key}
              aria-label={`${st.label}, ${items.length} Videos`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(st.key);
              }}
              onDragLeave={() => setOver((o) => (o === st.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = Number(e.dataTransfer.getData("text/plain"));
                const v = videos.find((x) => x.id === id);
                if (v && v.status !== st.key) move(id, st.key);
              }}
              className={cn(
                "flex min-w-[80vw] flex-1 flex-col rounded-2xl border border-transparent bg-sunken/70 p-2 transition-colors sm:min-w-[236px]",
                over === st.key && "border-ink/30 bg-sunken",
              )}
            >
              <header className="flex items-center gap-2 px-2 pb-2 pt-1.5">
                <span className="size-2 rounded-full" style={{ background: TONE_DOT[st.tone] }} />
                <h2 className="text-[13px] font-semibold text-ink">{st.label}</h2>
                <span className="ml-auto rounded-full bg-surface px-2 font-mono text-[11px] text-ink-2">{items.length}</span>
              </header>
              <div className="grid min-h-24 content-start gap-2">
                {items.map((v) => (
                  <VideoCard key={v.id} v={v} onMove={move} />
                ))}
                {items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-2 px-3 py-6 text-center text-[12px] text-faint">
                    Keine Videos in {st.label}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function VideoCard({ v, onMove }: { v: BoardVideo; onMove: (id: number, status: string) => void }) {
  const idx = VIDEO_STATUS.findIndex((s) => s.key === v.status);
  const next = VIDEO_STATUS[idx + 1];
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(v.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-card)] transition-colors hover:border-line-2"
    >
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Dot color={v.clientColor} />
        <span className="min-w-0 flex-1 truncate">{v.clientName}</span>
        {v.isTest && <Badge tone="warn" className="h-5 px-2 text-[11px]">Test</Badge>}
        <GripVertical className="hidden size-3.5 shrink-0 text-faint opacity-0 group-hover:opacity-100 lg:block" aria-hidden />
      </div>
      <Link href={`/produktion/${v.id}`} className="mt-1.5 line-clamp-3 block text-[14px] font-semibold leading-snug text-ink hover:underline">
        {v.title}
      </Link>
      {v.format && <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">{v.format}</div>}
      <div className="mt-2.5 flex items-center gap-2.5 text-[12px] text-muted">
        {v.shootDate && (
          <span className="inline-flex items-center gap-1" title="Drehtermin">
            <Camera className="size-3.5" aria-hidden />
            {dateShort(v.shootDate)}
          </span>
        )}
        {v.hasScript && (
          <span className="inline-flex items-center gap-1 text-info" title="Skript vorhanden">
            <ScrollText className="size-3.5" aria-hidden />
            <span className="sr-only">Skript vorhanden</span>
          </span>
        )}
        {v.url && (
          <a href={v.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink" title="Beitrag öffnen">
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">Beitrag öffnen</span>
          </a>
        )}
        <span className="ml-auto">
          {v.assignee ? (
            <span
              className="grid size-6 place-items-center rounded-full bg-ink text-[10px] font-bold text-white"
              title={`Zuständig: ${v.assignee.name}`}
              aria-label={`Zuständig: ${v.assignee.name}`}
            >
              {v.assignee.initials}
            </span>
          ) : (
            <span className="grid size-6 place-items-center rounded-full border border-dashed border-line-2 text-[10px] text-faint" title="Niemand zuständig">
              ?
            </span>
          )}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1 border-t border-line pt-2">
        {next ? (
          <button
            type="button"
            onClick={() => onMove(v.id, next.key)}
            className="inline-flex h-8 flex-1 items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold text-ink-2 hover:bg-sunken hover:text-ink"
          >
            Weiter: {next.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        ) : (
          <span className="flex-1 px-2 text-[12px] font-semibold text-ok">Online</span>
        )}
        <Menu label={`Status von „${v.title}“ ändern`}>
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Status</p>
          {VIDEO_STATUS.map((s) => (
            <button key={s.key} type="button" role="menuitem" className={menuItemClass} onClick={() => s.key !== v.status && onMove(v.id, s.key)}>
              <span className="w-4">{s.key === v.status && <Check className="size-4 text-ok" aria-hidden />}</span>
              {s.label}
            </button>
          ))}
        </Menu>
      </div>
    </article>
  );
}
