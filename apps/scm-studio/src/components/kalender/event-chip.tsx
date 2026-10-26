import Link from "next/link";
import { cn } from "@/lib/cn";
import { time } from "@/lib/format";
import type { EventRow } from "@/lib/kalender/data";
import { kindStyle } from "@/lib/kalender/href";
import { EVENT_KINDS } from "@/lib/labels";

/** Kompakter Termin im Monatsraster: Kundenfarbe als Leiste, Art als Hintergrund. */
export function EventChip({ row, showTime = true, continued = false }: { row: EventRow; showTime?: boolean; continued?: boolean }) {
  const { e, clientColor } = row;
  const st = kindStyle(e.kind);
  return (
    <Link
      href={`/kalender/${e.id}`}
      className={cn(
        "group flex min-w-0 items-center gap-1.5 rounded-md py-0.5 pl-1 pr-1.5 text-[12px] leading-tight text-ink ring-1 ring-transparent transition-shadow",
        st.bg,
        st.ring,
      )}
      title={`${EVENT_KINDS[e.kind]?.label ?? e.kind}: ${e.title}${row.clientName ? ` · ${row.clientName}` : ""}`}
    >
      <span className="h-3.5 w-[3px] shrink-0 rounded-full" style={{ background: clientColor ?? st.dot }} aria-hidden />
      {showTime && !e.allDay && !continued && <span className="shrink-0 font-mono text-[11px] text-ink-2">{time(e.startsAt)}</span>}
      <span className="truncate font-medium">{continued ? `↳ ${e.title}` : e.title}</span>
    </Link>
  );
}

export function KindDot({ kind, color }: { kind: string; color?: string | null }) {
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: color ?? kindStyle(kind).dot }} aria-hidden />;
}
