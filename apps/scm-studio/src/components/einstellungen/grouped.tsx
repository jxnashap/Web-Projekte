// Gruppierte Listen wie in den iOS-Einstellungen: Gruppe mit Überschrift, Zeilen mit Wert rechts und Pfeil.
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Group({ title, footer, children, className }: { title?: string; footer?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-1.5", className)}>
      {title && <h3 className="px-4 text-[13px] text-muted">{title}</h3>}
      <div className="squircle overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        <ul className="divide-y divide-hairline">{children}</ul>
      </div>
      {footer && <div className="px-4 text-[12px] leading-relaxed text-muted">{footer}</div>}
    </section>
  );
}

const ICON_TONES = {
  red: "bg-accent text-white",
  gray: "bg-faint text-white",
  blue: "bg-info text-white",
  green: "bg-ok text-white",
  orange: "bg-warn text-white",
} as const;

export function Row({
  href,
  icon: Icon,
  tone = "gray",
  label,
  sub,
  value,
  active,
  children,
}: {
  href?: string;
  icon?: LucideIcon;
  tone?: keyof typeof ICON_TONES;
  label: React.ReactNode;
  sub?: React.ReactNode;
  value?: React.ReactNode;
  active?: boolean;
  children?: React.ReactNode;
}) {
  const inner = (
    <>
      {Icon && (
        <span className={cn("grid size-[30px] shrink-0 place-items-center rounded-[8px]", ICON_TONES[tone])} aria-hidden>
          <Icon className="size-[17px]" strokeWidth={2.1} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      {value !== undefined && <span className="max-w-[45%] shrink-0 truncate text-right text-[15px] text-muted">{value}</span>}
      {children}
      {href && <ChevronRight className="size-[18px] shrink-0 text-faint" aria-hidden />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          scroll={false}
          aria-current={active ? "page" : undefined}
          className={cn("flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none", active && "lg:bg-fill")}
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-h-12 items-center gap-3 px-4 py-2.5">{inner}</div>
      )}
    </li>
  );
}

/** Statuspunkt wie bei iOS (grün = eingerichtet, grau = fehlt) */
export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
      <span className={cn("size-2 rounded-full", ok ? "bg-ok" : "bg-line-2")} aria-hidden />
      {label}
    </span>
  );
}
