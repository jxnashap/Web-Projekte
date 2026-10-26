// Ein Symbol je Dokumentart (Liste, Neu-Seite, Detail), damit man die Art auf einen Blick erkennt.
import { CalendarCheck, ChartColumn, FileSignature, FileText, ScrollText, type LucideIcon } from "lucide-react";

export const KIND_ICONS: Record<string, LucideIcon> = {
  vertrag: ScrollText,
  einwilligung: FileSignature,
  drehplan: CalendarCheck,
  monatsbericht: ChartColumn,
};

export function KindIcon({ kind, className }: { kind: string; className?: string }) {
  const Icon = KIND_ICONS[kind] ?? FileText;
  return <Icon className={className} aria-hidden />;
}
