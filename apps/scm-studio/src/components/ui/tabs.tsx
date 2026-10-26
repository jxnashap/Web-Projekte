import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = { href: string; label: string; count?: number; active?: boolean };

/** Reiter als Links (Zustand in der URL, damit Zurück-Knopf und Teilen funktionieren). */
export function LinkTabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn("-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1", className)} aria-label="Bereiche">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "relative -mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[14px] font-semibold transition-colors",
            t.active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-sunken px-1.5 font-mono text-[11px] text-ink-2">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Umschalter für Ansichten (Board/Liste/Kalender) als Links. */
export function Segmented({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-full border border-line-2 bg-surface p-0.5", className)} role="tablist">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          role="tab"
          aria-selected={t.active}
          scroll={false}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
            t.active ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
