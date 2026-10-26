import type { Kontingent } from "@/lib/data/kontingent";

export function KontingentBar({ k, compact = false }: { k: Kontingent; compact?: boolean }) {
  const pctDone = Math.min(100, (k.fertig / k.soll) * 100);
  const pctPlanned = Math.min(100, (k.geplant / k.soll) * 100);
  const rest = k.soll - k.fertig;
  // fertig = grün, noch nicht verplant = orange; Rot bleibt Alarmen vorbehalten
  const tone = rest <= 0 ? "text-ok" : k.geplant < k.soll ? "text-warn" : "text-ink-2";
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate font-semibold">{k.name}</span>
        <span className={`shrink-0 text-[12px] font-medium tabular-nums ${tone}`}>
          {k.fertig}/{k.soll} fertig{!compact && k.geplant < k.soll ? ` · ${k.soll - k.geplant} nicht geplant` : ""}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-fill" role="img" aria-label={`${k.fertig} von ${k.soll} Videos fertig, ${k.geplant} geplant`}>
        <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${pctPlanned}%`, background: k.color }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pctDone}%`, background: k.color }} />
      </div>
    </div>
  );
}
