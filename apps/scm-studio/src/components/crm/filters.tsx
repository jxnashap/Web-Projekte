// Filter als Links (Zustand in der URL) und eine Suche, die die URL beim Tippen aktualisiert.
import Link from "next/link";
import { cn } from "@/lib/cn";

export type Chip = { label: string; href: string; active: boolean; count?: number };

export function FilterChips({ label, chips, className }: { label: string; chips: Chip[]; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto", className)} role="group" aria-label={label}>
      <span className="mr-1 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {chips.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          scroll={false}
          aria-current={c.active ? "true" : undefined}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
            c.active ? "border-ink bg-ink text-white" : "border-line-2 bg-surface text-ink-2 hover:border-ink",
          )}
        >
          {c.label}
          {c.count !== undefined && <span className={cn("font-mono text-[11px]", c.active ? "text-white/70" : "text-muted")}>{c.count}</span>}
        </Link>
      ))}
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
