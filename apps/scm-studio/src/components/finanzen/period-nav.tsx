import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Segmented } from "@/components/ui/tabs";
import type { PeriodKind } from "@/lib/finanzen/core";
import { monthLabel } from "@/lib/format";
import { shiftMonth } from "@/lib/time";

const STEP: Record<PeriodKind, number> = { monat: 1, quartal: 3, jahr: 12 };

/** Zeitraumwahl (Monat/Quartal/Jahr) mit Vor/Zurück. Zustand in der URL (?zeitraum=…&bezug=YYYY-MM). */
export function PeriodNav({ base, kind, ym, label }: { base: string; kind: PeriodKind; ym: string; label: string }) {
  const href = (k: PeriodKind, m: string) => `${base}?zeitraum=${k}&bezug=${m}`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Segmented
        items={(["monat", "quartal", "jahr"] as const).map((k) => ({ href: href(k, ym), label: k === "monat" ? "Monat" : k === "quartal" ? "Quartal" : "Jahr", active: k === kind }))}
      />
      <div className="flex items-center gap-1">
        <Link href={href(kind, shiftMonth(ym, -STEP[kind]))} scroll={false} className="grid size-9 place-items-center rounded-full border border-line-2 bg-surface hover:border-ink" aria-label="Voriger Zeitraum">
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-36 text-center text-[15px] font-semibold capitalize">{label || monthLabel(ym)}</span>
        <Link href={href(kind, shiftMonth(ym, STEP[kind]))} scroll={false} className="grid size-9 place-items-center rounded-full border border-line-2 bg-surface hover:border-ink" aria-label="Nächster Zeitraum">
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function parsePeriod(sp: Record<string, string | string[] | undefined>, fallbackYm: string): { kind: PeriodKind; ym: string } {
  const z = typeof sp.zeitraum === "string" ? sp.zeitraum : "";
  const b = typeof sp.bezug === "string" ? sp.bezug : "";
  return {
    kind: z === "quartal" || z === "jahr" ? z : "monat",
    ym: /^\d{4}-(0[1-9]|1[0-2])$/.test(b) ? b : fallbackYm,
  };
}
