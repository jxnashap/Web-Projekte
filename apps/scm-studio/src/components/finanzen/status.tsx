import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS, type Tone } from "@/lib/labels";

const EXTRA: Record<string, { label: string; tone: Tone }> = {
  ueberfaellig: { label: "Überfällig", tone: "accent" },
};

/** Status einer Rechnung oder eines Angebots. Stornobelege zeigen „Stornobeleg“. */
export function InvoiceStatus({ kind, status }: { kind: string; status: string }) {
  if (kind === "storno") return <Badge tone="dark">Stornobeleg</Badge>;
  const s = EXTRA[status] ?? INVOICE_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Statusfilter je Art. Stornobelege stehen bei den Rechnungen unter „Storniert“. */
export const STATUS_FILTERS: Record<"rechnung" | "angebot", { key: string; label: string }[]> = {
  rechnung: [
    { key: "", label: "Alle" },
    { key: "entwurf", label: "Entwürfe" },
    { key: "offen", label: "Offen" },
    { key: "ueberfaellig", label: "Überfällig" },
    { key: "bezahlt", label: "Bezahlt" },
    { key: "storniert", label: "Storniert" },
  ],
  angebot: [
    { key: "", label: "Alle" },
    { key: "entwurf", label: "Entwürfe" },
    { key: "offen", label: "Offen" },
    { key: "angenommen", label: "Angenommen" },
    { key: "abgelehnt", label: "Abgelehnt" },
  ],
};
