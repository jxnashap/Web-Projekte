// Gruppierte Listen wie in den iOS-Einstellungen: Gruppe mit Überschrift, Zeilen mit Wert rechts und Pfeil.
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Gruppe mit kleiner Überschrift. `level` legt die Überschriftenebene fest: 2 in der Seitenliste
 * (gleichrangig mit dem Bereichstitel), 3 innerhalb eines Bereichs.
 */
export function Group({
  title,
  footer,
  children,
  className,
  level = 3,
}: {
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  level?: 2 | 3;
}) {
  const id = useId();
  const H = level === 2 ? "h2" : "h3";
  return (
    <section className={cn("grid gap-1.5", className)} aria-labelledby={title ? id : undefined}>
      {title && (
        <H id={id} className="px-4 font-[family-name:var(--font-sans)] text-[13px] font-normal tracking-normal text-muted">
          {title}
        </H>
      )}
      <div className="squircle overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        <ul className="divide-y divide-hairline">{children}</ul>
      </div>
      {footer && <div className="px-4 text-[13px] leading-relaxed text-muted">{footer}</div>}
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

export function RowIcon({ icon: Icon, tone = "gray" }: { icon: LucideIcon; tone?: keyof typeof ICON_TONES }) {
  return (
    <span className={cn("grid size-[30px] shrink-0 place-items-center rounded-[8px]", ICON_TONES[tone])} aria-hidden>
      <Icon className="size-[17px]" strokeWidth={2.1} />
    </span>
  );
}

/** Fokus für Listenzeilen: innerer Ring im Akzent, deutlich von der aktiven Auswahl (Füllung) zu unterscheiden */
export const rowFocusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

export function Row({
  href,
  icon,
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
      {icon && <RowIcon icon={icon} tone={tone} />}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      {value !== undefined && <span className="max-w-[45%] shrink-0 truncate text-right text-[15px] text-muted">{value}</span>}
      {children}
      {href && <ChevronRight className="size-[18px] shrink-0 text-line-2" aria-hidden />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          scroll={false}
          aria-current={active ? "page" : undefined}
          className={cn("flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-fill-2", rowFocusClass, active && "lg:bg-fill")}
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
