import Link from "next/link";
import { cn } from "@/lib/cn";
import { time } from "@/lib/format";
import type { EventRow } from "@/lib/kalender/data";
import type { View } from "@/lib/kalender/dates";
import { eventHref, kindStyle } from "@/lib/kalender/href";
import { EVENT_KINDS } from "@/lib/labels";

/** Zugänglicher Name eines Termins, z. B. "Intern, 09:00 bis 10:00 Uhr, Redaktionsplanung, Büro". */
export function eventLabel(row: EventRow, continued = false) {
  const { e } = row;
  return [
    EVENT_KINDS[e.kind]?.label ?? e.kind,
    e.allDay ? "ganztägig" : continued ? "Fortsetzung" : `${time(e.startsAt)} bis ${time(e.endsAt)} Uhr`,
    e.title,
    row.clientName,
    e.location,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Kompakter Termin im Raster: Kundenfarbe als Leiste, Art als Fläche. */
export function EventChip({
  row,
  view,
  showTime = true,
  continued = false,
  highlight = false,
}: {
  row: EventRow;
  view?: View;
  showTime?: boolean;
  continued?: boolean;
  highlight?: boolean;
}) {
  const { e, clientColor } = row;
  const st = kindStyle(e.kind);
  return (
    <Link
      href={eventHref(e.id, view)}
      aria-label={eventLabel(row, continued)}
      className={cn(
        "group flex min-w-0 items-center gap-1.5 rounded-md py-0.5 pl-1 pr-1.5 text-[12px] leading-tight text-ink ring-1 ring-transparent transition-shadow",
        st.bg,
        st.ring,
        highlight && "ring-2 ring-ink/40",
      )}
      title={eventLabel(row, continued)}
    >
      <span className="h-3.5 w-[3px] shrink-0 rounded-full" style={{ background: clientColor ?? st.dot }} aria-hidden />
      {showTime && !e.allDay && !continued && <span className="shrink-0 text-[11px] tabular-nums text-ink-2">{time(e.startsAt)}</span>}
      <span className="truncate font-medium">{continued ? `↳ ${e.title}` : e.title}</span>
    </Link>
  );
}

export function KindDot({ kind, color }: { kind: string; color?: string | null }) {
  return <span className="inline-block size-1.5 shrink-0 rounded-full" style={{ background: color ?? kindStyle(kind).dot }} aria-hidden />;
}
