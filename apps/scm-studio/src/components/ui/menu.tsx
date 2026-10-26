"use client";
// Kleines Aufklappmenü (z. B. "Mehr" an Zeilen). Tastatur: Pfeiltasten, Pos1/Ende, Escape gibt den Fokus zurück.
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function Menu({
  children,
  label = "Mehr",
  align = "right",
  trigger,
  triggerClassName,
  triggerHasText = false,
}: {
  children: React.ReactNode;
  label?: string;
  align?: "left" | "right";
  trigger?: React.ReactNode;
  /** eigene Klassen für den Auslöser, z. B. buttonClass("secondary") für einen Text-Knopf */
  triggerClassName?: string;
  /** Auslöser zeigt sichtbaren Text: dann kein zusätzliches aria-label */
  triggerHasText?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerHasText ? undefined : label}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName ?? "hit grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-fill hover:text-ink"}
      >
        {trigger ?? <MoreHorizontal className="size-4" />}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onClick={() => close(false)}
          onKeyDown={(e) => {
            const list = items();
            const i = list.indexOf(document.activeElement as HTMLElement);
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              list[(i + 1) % list.length]?.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              list[(i - 1 + list.length) % list.length]?.focus();
            } else if (e.key === "Home") {
              e.preventDefault();
              list[0]?.focus();
            } else if (e.key === "End") {
              e.preventDefault();
              list[list.length - 1]?.focus();
            } else if (e.key === "Tab") {
              setOpen(false);
            }
          }}
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
  "flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-left text-[15px] text-ink outline-none hover:bg-fill focus-visible:bg-fill sm:min-h-0 sm:text-[14px] [&_svg]:text-muted";
