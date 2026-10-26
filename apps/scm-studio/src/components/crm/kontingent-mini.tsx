// Kontingent ohne Kundennamen (für Kundenkarte und Kundenseite, wo der Name schon steht).
import type { Kontingent } from "@/lib/data/kontingent";
import { monthLabel } from "@/lib/format";

export function KontingentMini({ k, month }: { k: Kontingent; month: string }) {
  const done = Math.min(100, (k.fertig / k.soll) * 100);
  const planned = Math.min(100, (k.geplant / k.soll) * 100);
  const open = Math.max(0, k.soll - k.geplant);
  const tone = k.fertig >= k.soll ? "text-ok" : open > 0 ? "text-warn" : "text-ink-2";
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate text-muted">Kontingent {monthLabel(month).split(" ")[0]}</span>
        <span className={`shrink-0 text-[13px] font-medium tabular-nums ${tone}`}>
          {k.fertig}/{k.soll} fertig{open > 0 ? ` · ${open} nicht geplant` : ""}
        </span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-sunken"
        role="img"
        aria-label={`${k.fertig} von ${k.soll} Videos fertig, ${k.geplant} geplant`}
      >
        <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${planned}%`, background: k.color }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${done}%`, background: k.color }} />
      </div>
    </div>
  );
}
