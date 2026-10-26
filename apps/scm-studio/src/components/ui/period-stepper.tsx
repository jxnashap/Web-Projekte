import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Zeitraum-Navigation (Monat, Woche, Quartal) im Apple-Stil: gefüllte Kapsel, Pfeile mit 44-px-Trefferfläche. */
export function PeriodStepper({
  label,
  prevHref,
  nextHref,
  todayHref,
  todayLabel = "Heute",
  className,
}: {
  label: React.ReactNode;
  prevHref: string;
  nextHref: string;
  todayHref?: string;
  todayLabel?: string;
  className?: string;
}) {
  const arrow = "hit grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface hover:text-ink";
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div className="inline-flex h-9 items-center gap-0.5 rounded-full bg-fill px-0.5">
        <Link href={prevHref} scroll={false} className={arrow} aria-label="Zurück">
          <ChevronLeft className="size-4" strokeWidth={2.4} />
        </Link>
        <span className="min-w-28 px-1 text-center text-[14px] font-semibold tabular-nums" aria-live="polite">
          {label}
        </span>
        <Link href={nextHref} scroll={false} className={arrow} aria-label="Weiter">
          <ChevronRight className="size-4" strokeWidth={2.4} />
        </Link>
      </div>
      {todayHref && (
        <Link href={todayHref} scroll={false} className="hit inline-flex h-9 items-center rounded-full px-3 text-[14px] font-medium text-accent-ink hover:bg-fill-2">
          {todayLabel}
        </Link>
      )}
    </div>
  );
}
