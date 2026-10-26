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
              "group flex h-9 items-center gap-3 rounded-[9px] px-2.5 text-[14px] transition-colors",
              active ? "bg-fill font-semibold text-ink" : "font-medium text-ink-2 hover:bg-fill-2 hover:text-ink",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-accent" : "text-muted group-hover:text-ink-2")} strokeWidth={active ? 2.1 : 1.8} />
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
          <Link href={href} onClick={onPick} className="flex items-center gap-3.5 rounded-[14px] px-2 py-2 transition-colors hover:bg-fill-2">
            <span className="squircle grid size-10 shrink-0 place-items-center rounded-[11px] bg-accent text-white shadow-[0_1px_2px_rgb(225_37_27/0.3)]">
              <Icon className="size-[19px]" strokeWidth={2} />
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
        className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent pl-3 pr-4 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgb(225_37_27/0.3)] transition-colors hover:bg-[#cc1f15] active:scale-[0.97] lg:inline-flex"
      >
        <Plus className="size-4" strokeWidth={2.6} /> Neu
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
        className={cn("flex h-[54px] flex-col items-center justify-center gap-[3px] text-[10px] font-medium", active ? "text-accent" : "text-[#8e8e93]")}
      >
        <Icon className="size-6" strokeWidth={active ? 2.1 : 1.7} />
        {it.label}
      </Link>
    );
  };
  const moreActive = !["/", "/produktion", "/kalender"].some((h) => isActive(pathname, h));
  return (
    <>
      <nav
        aria-label="Navigation"
        className="material-light fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-hairline pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {tab("/")}
        {tab("/produktion")}
        <div className="grid place-items-center">
          <button
            type="button"
            onClick={() => setSheet("neu")}
            aria-label="Schnell erfassen"
            className="grid size-11 place-items-center rounded-full bg-accent text-white shadow-[0_4px_14px_-2px_rgb(225_37_27/0.55)] transition-transform active:scale-90"
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
        </div>
        {tab("/kalender")}
        <button
          type="button"
          onClick={() => setSheet("mehr")}
          className={cn("flex h-[54px] flex-col items-center justify-center gap-[3px] text-[10px] font-medium", moreActive ? "text-accent" : "text-[#8e8e93]")}
        >
          <Menu className="size-6" strokeWidth={moreActive ? 2.1 : 1.7} />
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
                  className={cn("flex h-12 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium", active ? "bg-fill font-semibold text-ink" : "hover:bg-fill-2")}
                >
                  <Icon className={cn("size-[19px]", active ? "text-accent" : "text-muted")} strokeWidth={1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={logout} className="mt-3 border-t border-line pt-3">
          <button className="flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-[15px] text-accent-ink hover:bg-fill-2">
            <LogOut className="size-[18px]" /> Abmelden
          </button>
        </form>
      </Sheet>
    </>
  );
}
