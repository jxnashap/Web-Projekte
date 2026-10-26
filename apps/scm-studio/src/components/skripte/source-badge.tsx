import { Badge } from "@/components/ui/badge";

const SOURCES: Record<string, { label: string; tone: "info" | "warn" | "neutral" }> = {
  ki: { label: "KI", tone: "info" },
  demo: { label: "Demo", tone: "warn" },
  manuell: { label: "Von Hand", tone: "neutral" },
};

export function SourceBadge({ source }: { source: string }) {
  const s = SOURCES[source] ?? SOURCES.manuell;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
