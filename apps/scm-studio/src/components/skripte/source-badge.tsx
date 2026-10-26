import { Badge } from "@/components/ui/badge";

const SOURCES: Record<string, { label: string; tone: "info" | "warn" | "neutral" }> = {
  ki: { label: "KI", tone: "info" },
  demo: { label: "Demo", tone: "warn" },
  manuell: { label: "Von Hand", tone: "neutral" },
};

/** Zeigt nur KI oder Demo an; von Hand geschriebene Skripte brauchen kein Etikett. */
export function SourceBadge({ source }: { source: string }) {
  if (source === "manuell") return null;
  const s = SOURCES[source] ?? SOURCES.manuell;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
