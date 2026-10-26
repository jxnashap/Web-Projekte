"use client";
// Kleines Aufklappmenü (z. B. "Mehr" an Zeilen). Schließt bei Klick außerhalb und mit Escape.
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function Menu({ children, label = "Mehr", align = "right", trigger }: { children: React.ReactNode; label?: string; align?: "left" | "right"; trigger?: React.ReactNode }) {
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
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-fill hover:text-ink"
      >
        {trigger ?? <MoreHorizontal className="size-4" />}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "material-light absolute z-40 mt-1.5 min-w-52 overflow-hidden rounded-[14px] p-1.5 shadow-[var(--shadow-pop)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-left text-[14px] text-ink hover:bg-accent hover:text-white [&_svg]:text-muted hover:[&_svg]:text-white";
