// Filter als Links (Zustand in der URL), dargestellt mit dem Segmented-Control aus dem UI-Kit.
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

export type Chip = { label: string; href: string; active: boolean };

export function FilterChips({ label, chips, className }: { label: string; chips: Chip[]; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} role="group" aria-label={label}>
      <span className="shrink-0 text-[13px] font-medium text-muted">{label}</span>
      <div className="min-w-0 overflow-x-auto">
        <Segmented className="shrink-0" items={chips.map((c) => ({ href: c.href, label: c.label, active: c.active }))} />
      </div>
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
