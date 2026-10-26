"use client";
import { LogOut, Menu, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/cn";
import { isActive, NAV } from "./nav";
import { QUICK_ACTIONS } from "./quick-actions";
import { Sheet } from "./sheet";

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

export function QuickList({ onPick }: { onPick?: () => void }) {
  return (
    <ul className="grid gap-1">
      {QUICK_ACTIONS.map(({ href, label, hint, icon: Icon }) => (
        <li key={href}>
          <Link href={href} onClick={onPick} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-sunken">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Icon className="size-[18px]" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{label}</span>
              <span className="block truncate text-[13px] text-muted">{hint}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Desktop: "Neu"-Knopf in der Kopfzeile. */
export function QuickAddButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-ink lg:inline-flex"
      >
        <Plus className="size-4" /> Neu
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Schnell erfassen">
        <QuickList onPick={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

/** Handy: Leiste unten mit Heute, Produktion, Plus, Kalender, Mehr. */
export function MobileNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<null | "neu" | "mehr">(null);
  const items = NAV.filter((n) => ["/", "/produktion", "/kalender"].includes(n.href));
  const tab = (href: string) => {
    const it = items.find((i) => i.href === href)!;
    const active = isActive(pathname, href);
    const Icon = it.icon;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-accent-ink" : "text-muted")}
      >
        <Icon className="size-5" strokeWidth={1.8} />
        {it.label}
      </Link>
    );
  };
  const moreActive = !["/", "/produktion", "/kalender"].some((h) => isActive(pathname, h));
  return (
    <>
      <nav
        aria-label="Navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {tab("/")}
        {tab("/produktion")}
        <div className="grid place-items-center">
          <button
            type="button"
            onClick={() => setSheet("neu")}
            aria-label="Schnell erfassen"
            className="grid size-12 place-items-center rounded-full bg-accent text-white shadow-[var(--shadow-pop)] active:scale-95"
          >
            <Plus className="size-6" />
          </button>
        </div>
        {tab("/kalender")}
        <button
          type="button"
          onClick={() => setSheet("mehr")}
          className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", moreActive ? "text-accent-ink" : "text-muted")}
        >
          <Menu className="size-5" strokeWidth={1.8} />
          Mehr
        </button>
      </nav>
      <Sheet open={sheet === "neu"} onClose={() => setSheet(null)} title="Schnell erfassen">
        <QuickList onPick={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "mehr"} onClose={() => setSheet(null)} title="Alle Bereiche">
        <ul className="grid grid-cols-2 gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setSheet(null)}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium", active ? "bg-accent-soft text-accent-ink" : "hover:bg-sunken")}
                >
                  <Icon className="size-[18px]" strokeWidth={1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={logout} className="mt-3 border-t border-line pt-3">
          <button className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] text-muted hover:bg-sunken hover:text-ink">
            <LogOut className="size-[18px]" /> Abmelden
          </button>
        </form>
      </Sheet>
    </>
  );
}
