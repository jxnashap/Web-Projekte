"use client";
// "Neu"-Knopf mit Aufklappmenü für Schnellaktionen eines Kunden.
import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";

export type NewMenuItem = { href: string; label: string };

export function NewMenu({ items, label = "Neu" }: { items: NewMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={buttonClass("primary")}>
        <Plus className="size-4" /> {label} <ChevronDown className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center rounded-lg px-3 text-[14px] text-ink-2 hover:bg-sunken hover:text-ink"
            >
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
