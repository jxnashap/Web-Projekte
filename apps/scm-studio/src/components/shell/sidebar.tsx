"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, NAV } from "./nav";

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5" aria-label="Hauptnavigation">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors",
              active ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-surface/70 hover:text-ink",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-accent" : "text-muted group-hover:text-ink-2")} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV.filter((n) => ["/", "/produktion", "/kalender", "/kunden", "/finanzen"].includes(n.href));
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-accent-ink" : "text-muted")}>
            <Icon className="size-5" strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
