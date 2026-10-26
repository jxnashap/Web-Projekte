import { PeriodNav } from "./period-nav";
import type { PeriodKind } from "@/lib/finanzen/core";

export function ExportPeriod({ kind, ym, label }: { kind: PeriodKind; ym: string; label: string }) {
  return <PeriodNav base="/finanzen/export" kind={kind} ym={ym} label={label} />;
}
