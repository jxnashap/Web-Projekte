import type { Kontingent } from "@/lib/data/kontingent";

/**
 * Kontingent eines Kunden im Monat: kräftiger Balken = fertig, heller Balken = geplant.
 * Tonregel: alles fertig = grün, noch nicht verplant = orange, sonst neutral. Rot bleibt echten Alarmen vorbehalten.
 * future: Monat hat noch nicht begonnen, dann neutral ("8 offen") statt Warnung.
 */
export function KontingentBar({ k, compact = false, future = false, label }: { k: Kontingent; compact?: boolean; future?: boolean; label?: React.ReactNode }) {
  const pctDone = Math.min(100, (k.fertig / k.soll) * 100);
  const pctPlanned = Math.min(100, (k.geplant / k.soll) * 100);
  const rest = k.soll - k.fertig;
  const unplanned = Math.max(0, k.soll - k.geplant);
  const tone = rest <= 0 ? "text-ok" : future ? "text-muted" : unplanned > 0 ? "text-warn" : "text-ink-2";
  const text = future && k.fertig === 0 ? `${unplanned} offen` : `${k.fertig}/${k.soll} fertig${!compact && unplanned > 0 ? ` · ${unplanned} nicht geplant` : ""}`;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate font-semibold">{label ?? k.name}</span>
        <span className={`shrink-0 text-[12px] font-medium tabular-nums ${tone}`}>{text}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-fill" role="img" aria-label={`${k.fertig} von ${k.soll} Videos fertig, ${k.geplant} geplant`}>
        <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${pctPlanned}%`, background: k.color }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pctDone}%`, background: k.color }} />
      </div>
    </div>
  );
}
