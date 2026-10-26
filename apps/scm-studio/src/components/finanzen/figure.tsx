import { cn } from "@/lib/cn";

/** Große Zahl mit kleiner Beschriftung (wie in Apple Wallet). */
export function Figure({ label, value, sub, tone, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "accent" | "ok" | "warn"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[13px] text-muted">{label}</div>
      <div className={cn("mt-1 truncate text-[30px] font-semibold leading-tight tracking-tight tabular-nums", tone === "accent" && "text-accent-ink", tone === "ok" && "text-ok", tone === "warn" && "text-warn")}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-[13px] text-muted">{sub}</div> : null}
    </div>
  );
}

/** Zeile in einer gruppierten Liste: Beschriftung links, Betrag rechts. */
export function AmountRow({ label, value, strong, hint }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; hint?: React.ReactNode }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2.5", strong && "font-semibold")}>
      <div className="min-w-0">
        <div className={cn("text-[14px]", !strong && "text-ink-2")}>{label}</div>
        {hint ? <div className="text-[12px] text-muted">{hint}</div> : null}
      </div>
      <div className="shrink-0 text-[14px] tabular-nums">{value}</div>
    </div>
  );
}
