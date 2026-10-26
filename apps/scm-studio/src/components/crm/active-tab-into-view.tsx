"use client";
// Holt den aktiven Reiter einer waagerecht scrollenden Reiterleiste in den Blick (Handy), auch nach dem Neuladen.
import { useEffect, useRef } from "react";

export function ActiveTabIntoView({ children, active, className }: { children: React.ReactNode; active: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nav = ref.current?.querySelector<HTMLElement>("nav");
    const current = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    const left = current.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    nav.scrollTo({ left: left - (nav.clientWidth - current.offsetWidth) / 2, behavior: "instant" });
  }, [active]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
