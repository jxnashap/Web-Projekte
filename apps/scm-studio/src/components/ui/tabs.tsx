import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = { href: string; label: string; count?: number; active?: boolean };

/** Reiter als Links (Zustand in der URL, damit Zurück-Knopf und Teilen funktionieren). */
export function LinkTabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn("-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 [scrollbar-width:none]", className)} aria-label="Bereiche">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "relative -mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[15px] transition-colors",
            t.active ? "border-accent font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-fill px-1.5 text-[12px] font-semibold tabular-nums text-ink-2">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Umschalter für Ansichten (Board/Liste/Kalender) als Links, im Stil des iOS-Segmented-Control. */
export function Segmented({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-[9px] bg-fill p-[2px]", className)} role="tablist">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          role="tab"
          aria-selected={t.active}
          scroll={false}
          className={cn(
            "flex h-7 min-w-16 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 text-[13px] transition-[background-color,box-shadow] duration-200",
            t.active ? "bg-surface font-semibold text-ink shadow-[var(--shadow-thumb)]" : "font-medium text-ink hover:bg-fill-2",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
