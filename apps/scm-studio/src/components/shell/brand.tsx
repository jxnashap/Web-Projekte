import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** App-Icon von SCM Studio (Sucherrahmen + Aufnahmeknopf). */
export function AppIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src={size <= 24 ? "/brand/scm-studio-icon-small.svg" : "/brand/scm-studio-icon.svg"}
      alt=""
      width={size}
      height={size}
      priority
      className={cn("shrink-0 drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.18)]", className)}
    />
  );
}

/** Wortmarke "SCM Studio" mit Icon. */
export function Brand({ href = "/", size = 28, className }: { href?: string; size?: number; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg", className)} aria-label="SCM Studio, zur Startseite">
      <AppIcon size={size} />
      <span className="font-[family-name:var(--font-display)] text-[17px] tracking-[-0.025em]">
        <span className="font-bold text-ink">SCM</span> <span className="font-medium text-muted">Studio</span>
      </span>
    </Link>
  );
}
