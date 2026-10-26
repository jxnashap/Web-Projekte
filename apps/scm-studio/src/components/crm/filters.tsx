// Filter als Links (Zustand in der URL). Segmente für 2 bis 5 Werte; die Leiste selbst steht in filter-bar.tsx.
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

export type Chip = { label: string; href: string; active: boolean };

/** Segmente mit sichtbarer Beschriftung (für 2 bis 5 Werte). */
export function FilterChips({ label, chips, className }: { label: string; chips: Chip[]; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="shrink-0 text-[13px] font-medium text-muted" aria-hidden>
        {label}
      </span>
      <Segmented label={label} className="w-max shrink-0" items={chips.map((c) => ({ href: c.href, label: c.label, active: c.active }))} />
    </div>
  );
}

/** URL aus Basis + Parametern bauen (leere Werte fallen weg). */
export function hrefWith(base: string, params: Record<string, string | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
