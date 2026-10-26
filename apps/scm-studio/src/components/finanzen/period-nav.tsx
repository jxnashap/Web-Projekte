import { PeriodStepper } from "@/components/ui/period-stepper";
import { Segmented } from "@/components/ui/tabs";
import type { PeriodKind } from "@/lib/finanzen/core";
import { monthLabel } from "@/lib/format";
import { shiftMonth } from "@/lib/time";

const STEP: Record<PeriodKind, number> = { monat: 1, quartal: 3, jahr: 12 };
const KIND_TEXT: Record<PeriodKind, string> = { monat: "Monat", quartal: "Quartal", jahr: "Jahr" };

/**
 * Zeitraumwahl (Monat/Quartal/Jahr) mit Vor/Zurück. Zustand in der URL (?zeitraum=…&bezug=YYYY-MM).
 * `homeYm` ist der Bezug für den Sprung zurück (z. B. aktueller Monat oder beim Export der Vormonat).
 */
export function PeriodNav({ base, kind, ym, label, homeYm, homeLabel }: { base: string; kind: PeriodKind; ym: string; label: string; homeYm: string; homeLabel: string }) {
  const href = (k: PeriodKind, m: string) => `${base}?zeitraum=${k}&bezug=${m}`;
  const atHome = periodKey(kind, ym) === periodKey(kind, homeYm);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
      <Segmented label="Zeitraum" items={(["monat", "quartal", "jahr"] as const).map((k) => ({ href: href(k, ym), label: KIND_TEXT[k], active: k === kind }))} />
      <PeriodStepper
        label={<span className="capitalize">{label || monthLabel(ym)}</span>}
        prevHref={href(kind, shiftMonth(ym, -STEP[kind]))}
        nextHref={href(kind, shiftMonth(ym, STEP[kind]))}
        todayHref={atHome ? undefined : href(kind, homeYm)}
        todayLabel={homeLabel}
      />
    </div>
  );
}

/** Gleicher Zeitraum? (z. B. Oktober und November liegen im selben Quartal) */
function periodKey(kind: PeriodKind, ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return kind === "jahr" ? `${y}` : kind === "quartal" ? `${y}-Q${Math.floor((m - 1) / 3)}` : ym;
}

export function parsePeriod(sp: Record<string, string | string[] | undefined>, fallbackYm: string): { kind: PeriodKind; ym: string } {
  const z = typeof sp.zeitraum === "string" ? sp.zeitraum : "";
  const b = typeof sp.bezug === "string" ? sp.bezug : "";
  return {
    kind: z === "quartal" || z === "jahr" ? z : "monat",
    ym: /^\d{4}-(0[1-9]|1[0-2])$/.test(b) ? b : fallbackYm,
  };
}
