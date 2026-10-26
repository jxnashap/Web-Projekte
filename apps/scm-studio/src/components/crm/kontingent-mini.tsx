// Kontingent ohne Kundennamen (Kundenkarte, Handy-Zeile, Kundenseite). Gleiche Tonregel wie KontingentBar auf Heute:
// alles fertig = grün, noch nicht verplant = orange, sonst neutral. Rot bleibt Alarmen vorbehalten.
import { cn } from "@/lib/cn";
import type { Kontingent } from "@/lib/data/kontingent";
import { monthLabel } from "@/lib/format";

export function kontingentTone(k: Kontingent) {
  return k.fertig >= k.soll ? "text-ok" : k.geplant < k.soll ? "text-warn" : "text-ink-2";
}

function Bar({ k, className }: { k: Kontingent; className?: string }) {
  const done = Math.min(100, (k.fertig / k.soll) * 100);
  const planned = Math.min(100, (k.geplant / k.soll) * 100);
  return (
    <div
      className={cn("relative h-1.5 overflow-hidden rounded-full bg-fill", className)}
      role="img"
      aria-label={`${k.fertig} von ${k.soll} Videos fertig, ${k.geplant} geplant`}
    >
      <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${planned}%`, background: k.color }} />
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${done}%`, background: k.color }} />
    </div>
  );
}

export function KontingentMini({ k, month, legend = false }: { k: Kontingent; month: string; legend?: boolean }) {
  const open = Math.max(0, k.soll - k.geplant);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate text-muted">Kontingent {monthLabel(month).split(" ")[0]}</span>
        <span className={cn("shrink-0 font-medium tabular-nums", kontingentTone(k))}>
          {k.fertig}/{k.soll} fertig{open > 0 ? ` · ${open} nicht geplant` : ""}
        </span>
      </div>
      <Bar k={k} />
      {legend && (
        <div className="flex gap-4 text-[12px] text-muted" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: k.color }} /> fertig
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full opacity-35" style={{ background: k.color }} /> geplant
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-fill" /> noch offen
          </span>
        </div>
      )}
    </div>
  );
}

/** Ganz knapp für Listenzeilen: "3/8" mit kurzem Balken. */
export function KontingentTiny({ k }: { k: Kontingent }) {
  return (
    <div className="grid w-14 shrink-0 justify-items-end gap-1">
      <span className={cn("text-[13px] font-semibold tabular-nums", kontingentTone(k))}>
        {k.fertig}/{k.soll}
      </span>
      <Bar k={k} className="w-full" />
    </div>
  );
}
