import { cn } from "@/lib/cn";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]", className)} {...p} />;
}

export function CardHeader({ title, action, sub }: { title: React.ReactNode; action?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "accent" | "ok" | "warn" }) {
  return (
    <Card className="p-5">
      <div className="scene-label">{label}</div>
      <div className={cn("mt-2 text-[28px] font-bold leading-none tracking-tight", tone === "accent" && "text-accent-ink", tone === "ok" && "text-ok", tone === "warn" && "text-warn")}>
        {value}
      </div>
      {sub && <div className="mt-2 text-[13px] text-muted">{sub}</div>}
    </Card>
  );
}
