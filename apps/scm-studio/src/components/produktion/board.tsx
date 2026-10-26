"use client";
// Produktions-Board: eine Spalte je Status, jede Karte ist ein Video.
// Status ändern per „Weiter“-Knopf, Menü oder (Desktop) Ziehen und Ablegen. Änderungen erscheinen sofort (optimistisch).
// „Online“ ist eine schmale, aufklappbare Spalte: erledigte Videos verdrängen die Arbeit nicht aus dem Bild.
import { ArrowRight, Camera, Check, ChevronLeft, ChevronRight, ExternalLink, GripVertical, ScrollText } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge, Dot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Menu, menuItemClass } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { dateShort } from "@/lib/format";
import { VIDEO_STATUS } from "@/lib/labels";
import type { BoardVideo } from "@/lib/produktion/data";
import { useVideoMove } from "./use-video-move";

export const TONE_DOT: Record<string, string> = {
  neutral: "var(--color-muted)",
  info: "var(--color-info)",
  warn: "var(--color-warn)",
  ok: "var(--color-ok)",
  dark: "var(--color-ink)",
  accent: "var(--color-accent)",
};

export const videosLabel = (n: number) => `${n} ${n === 1 ? "Video" : "Videos"}`;

// Aufgeklappte Online-Spalte merken (nur in diesem Browser; ohne Speicher nur bis zum Neuladen)
const ONLINE_KEY = "scm.produktion.online-offen";
const onlineListeners = new Set<() => void>();
let onlineMemory = false;
function readOnline() {
  try {
    return localStorage.getItem(ONLINE_KEY) === "1";
  } catch {
    return onlineMemory;
  }
}
function writeOnline(open: boolean) {
  onlineMemory = open;
  try {
    localStorage.setItem(ONLINE_KEY, open ? "1" : "0");
  } catch {
    /* Speicher gesperrt */
  }
  onlineListeners.forEach((l) => l());
}
function subscribeOnline(cb: () => void) {
  onlineListeners.add(cb);
  return () => void onlineListeners.delete(cb);
}

export function Board({ videos: initial }: { videos: BoardVideo[] }) {
  const { videos, move, dialog } = useVideoMove(initial);
  const [over, setOver] = useState<string | null>(null);
  const onlineOpen = useSyncExternalStore(subscribeOnline, readOnline, () => false);
  const toggleOnline = () => writeOnline(!onlineOpen);
  // Verlauf am rechten Rand als Hinweis, solange es seitlich weitergeht
  const scroller = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setFade(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <>
      <div
        ref={scroller}
        className={cn(
          "relative -mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto px-4 pb-3 outline-none [scrollbar-width:thin] focus-visible:outline-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:snap-none",
          fade && "[mask-image:linear-gradient(to_right,black_calc(100%-56px),transparent)]",
        )}
        role="region"
        aria-label="Produktions-Board, seitlich scrollbar"
        tabIndex={0}
      >
          {VIDEO_STATUS.map((st) => {
            const items = videos.filter((v) => v.status === st.key);
            const collapsed = st.key === "online" && !onlineOpen;
            const dropProps = {
              onDragOver: (e: React.DragEvent) => {
                e.preventDefault();
                setOver(st.key);
              },
              onDragLeave: () => setOver((o) => (o === st.key ? null : o)),
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                setOver(null);
                move(Number(e.dataTransfer.getData("text/plain")), st.key);
              },
            };
            if (collapsed)
              return (
                <section key={st.key} aria-label={`${st.label}, ${videosLabel(items.length)}`} {...dropProps} className="snap-start">
                  <button
                    type="button"
                    onClick={toggleOnline}
                    aria-expanded={false}
                    className={cn(
                      "flex min-h-40 w-14 flex-col items-center gap-3 rounded-2xl bg-fill-2 px-2 py-3 text-ink transition-colors hover:bg-fill",
                      over === st.key && "bg-fill outline-2 outline-ink/30",
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ background: TONE_DOT[st.tone] }} aria-hidden />
                    <span className="text-[14px] font-semibold [writing-mode:vertical-rl]">{st.label}</span>
                    <span className="text-[13px] tabular-nums text-muted">{items.length}</span>
                    <ChevronLeft className="mt-auto size-4 text-muted" aria-hidden />
                    <span className="sr-only">Spalte aufklappen</span>
                  </button>
                </section>
              );
            return (
              <section
                key={st.key}
                aria-label={`${st.label}, ${videosLabel(items.length)}`}
                {...dropProps}
                className={cn(
                  "flex w-[80vw] max-w-80 shrink-0 snap-start flex-col rounded-2xl bg-fill-2 p-2 transition-colors sm:w-auto sm:min-w-[196px] sm:flex-1 sm:shrink",
                  over === st.key && "bg-fill outline-2 outline-ink/30",
                )}
              >
                <header className="flex min-h-9 items-center gap-2 px-2 pb-1">
                  <span className="size-2 rounded-full" style={{ background: TONE_DOT[st.tone] }} aria-hidden />
                  <h2 className="text-[15px] font-semibold text-ink">{st.label}</h2>
                  <span className="ml-auto text-[13px] tabular-nums text-muted">{items.length}</span>
                  {st.key === "online" && (
                    <button
                      type="button"
                      onClick={toggleOnline}
                      aria-expanded
                      aria-label="Spalte Online zuklappen"
                      className="hit grid size-7 place-items-center rounded-full text-muted hover:bg-fill hover:text-ink"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  )}
                </header>
                <div className="grid min-h-24 content-start gap-2">
                  {items.map((v) => (
                    <VideoCard key={v.id} v={v} onMove={move} />
                  ))}
                  {items.length === 0 && <p className="rounded-xl bg-fill-2 px-3 py-6 text-center text-[13px] text-muted">Keine Videos in {st.label}</p>}
                </div>
              </section>
            );
          })}
        {/* Abstand am Ende, damit die letzte Spalte nicht am Rand klebt */}
        <div aria-hidden className="w-px shrink-0" />
      </div>
      {dialog}
    </>
  );
}

function VideoCard({ v, onMove }: { v: BoardVideo; onMove: (id: number, status: string) => void }) {
  const idx = VIDEO_STATUS.findIndex((s) => s.key === v.status);
  const next = VIDEO_STATUS[idx + 1];
  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(v.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group relative p-3 transition-shadow hover:shadow-[var(--shadow-raised)]"
    >
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Dot color={v.clientColor} />
        <span className="min-w-0 flex-1 truncate">{v.clientName}</span>
        {v.isTest && <Badge tone="warn">Test</Badge>}
        <GripVertical className="hidden size-3.5 shrink-0 text-muted opacity-0 group-hover:opacity-100 lg:block" aria-hidden />
      </div>
      {/* ganze Karte antippbar (Fläche des Links über der Karte), Knöpfe liegen darüber */}
      <Link
        href={`/produktion/${v.id}`}
        className="mt-1.5 line-clamp-3 block text-[15px] font-semibold leading-snug text-ink after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] hover:underline"
      >
        {v.title}
      </Link>
      {v.format && <div className="mt-1 text-[13px] text-muted">{v.format}</div>}
      <div className="mt-2.5 flex min-h-6 items-center gap-2.5 text-[13px] text-muted">
        {v.status === "online" && v.postDate ? (
          <span className="inline-flex items-center gap-1" title="Online seit">
            Online {dateShort(v.postDate)}
          </span>
        ) : (
          v.shootDate && (
            <span className="inline-flex items-center gap-1" title="Drehtermin">
              <Camera className="size-3.5" aria-hidden />
              <span className="sr-only">Dreh </span>
              {dateShort(v.shootDate)}
            </span>
          )
        )}
        {v.hasScript && (
          <span className="inline-flex items-center gap-1 text-info" title="Skript vorhanden">
            <ScrollText className="size-3.5" aria-hidden />
            <span className="sr-only">Skript vorhanden</span>
          </span>
        )}
        {v.url && (
          <a href={v.url} target="_blank" rel="noreferrer" className="hit-lg relative inline-flex items-center gap-1 rounded hover:text-ink" title="Beitrag öffnen">
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">Beitrag „{v.title}“ öffnen</span>
          </a>
        )}
        <span className="ml-auto">
          {v.assignee ? (
            <span
              className="grid size-6 place-items-center rounded-full bg-fill text-[11px] font-semibold text-ink-2"
              title={`Zuständig: ${v.assignee.name}`}
              role="img"
              aria-label={`Zuständig: ${v.assignee.name}`}
            >
              {v.assignee.initials}
            </span>
          ) : (
            <span className="grid size-6 place-items-center rounded-full bg-fill-2 text-[11px] font-semibold text-muted" title="Niemand zuständig" role="img" aria-label="Niemand zuständig">
              ?
            </span>
          )}
        </span>
      </div>
      <div className="relative mt-2.5 flex items-center gap-1 border-t border-hairline pt-2">
        {next ? (
          <button
            type="button"
            onClick={() => onMove(v.id, next.key)}
            aria-label={`„${v.title}“ weiter auf ${next.label}`}
            className="relative -ml-1 inline-flex h-11 min-w-0 flex-1 items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[14px] font-semibold text-ink-2 hover:bg-fill-2 hover:text-ink sm:h-8 sm:text-[13px]"
          >
            <span className="truncate">Weiter: {next.label}</span>
            <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          </button>
        ) : (
          <span className="inline-flex h-11 flex-1 items-center gap-1.5 px-1 text-[13px] font-semibold text-ok sm:h-8">
            <Check className="size-3.5" aria-hidden /> Online
          </span>
        )}
        <Menu label={`Status von „${v.title}“ ändern`}>
          <p className="px-3 pb-1 pt-1.5 text-[13px] font-semibold text-muted">Status ändern</p>
          {VIDEO_STATUS.map((s) => (
            <button key={s.key} type="button" role="menuitem" className={menuItemClass} onClick={() => onMove(v.id, s.key)} aria-current={s.key === v.status ? "true" : undefined}>
              <span className="w-4">{s.key === v.status && <Check className="size-4 text-ink" aria-hidden />}</span>
              {s.label}
            </button>
          ))}
        </Menu>
      </div>
    </Card>
  );
}
