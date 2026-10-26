import { cn } from "@/lib/cn";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("squircle rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]", className)} {...p} />;
}

export function CardHeader({ title, action, sub }: { title: React.ReactNode; action?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-2.5 pt-4">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action && <div className="-mr-2 shrink-0">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "accent" | "ok" | "warn" }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="scene-label truncate">{label}</div>
      <div
        className={cn(
          "mt-1.5 font-[family-name:var(--font-display)] text-[26px] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[32px]",
          tone === "accent" && "text-accent-ink",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-2 text-[12px] leading-snug text-muted sm:text-[13px]">{sub}</div>}
    </Card>
  );
}
