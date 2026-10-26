import { ChevronRight } from "lucide-react";
import Link from "next/link";
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

export function Stat({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "accent" | "ok" | "warn";
  /** macht die Kachel antippbar (wie ein iOS-Widget) */
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="scene-label truncate">{label}</span>
        {href && <ChevronRight className="size-4 shrink-0 text-line-2 transition-colors group-hover:text-muted" />}
      </div>
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
    </>
  );
  if (href)
    return (
      <Link href={href} className="group squircle block rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)] sm:p-5">
        {body}
      </Link>
    );
  return <Card className="p-4 sm:p-5">{body}</Card>;
}

/** Zeile einer gruppierten Liste (iOS): ganze Zeile antippbar, Pfeil rechts, mindestens 44 px hoch. */
export function ListRow({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex min-h-12 items-center gap-3 px-5 py-2.5 transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none", className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      <ChevronRight className="size-4 shrink-0 text-line-2" />
    </Link>
  );
}
