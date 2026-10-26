import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/**
 * Großer Seitentitel im Apple-Stil. `scene` (z. B. "Szene 02 · Anfragen") bleibt als Prop erhalten,
 * wird aber nicht angezeigt. `eyebrow` steht klein über dem Titel, `back` ergibt einen einheitlichen Zurück-Link.
 */
export function PageHeader({
  scene,
  eyebrow,
  back,
  title,
  description,
  actions,
}: {
  scene?: string;
  eyebrow?: React.ReactNode;
  back?: { href: string; label: string };
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  void scene;
  return (
    <header className="mb-7">
      {back && <BackLink href={back.href} label={back.label} className="mb-2" />}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <div className="mb-0.5 text-[15px] font-semibold text-muted">{eyebrow}</div>}
          <h1 className="display text-[32px] text-ink sm:text-[40px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[16px] leading-snug text-muted sm:text-[17px]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Zurück-Link wie in iOS: Pfeil + Ziel als Substantiv ("Rechnungen", "Kalender"), 44 px Trefferfläche. */
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`-ml-1.5 inline-flex min-h-11 items-center gap-0.5 rounded-lg pr-2 text-[15px] font-medium text-accent-ink hover:opacity-80 ${className ?? ""}`}
    >
      <ChevronLeft className="size-5" strokeWidth={2.2} />
      {label}
    </Link>
  );
}
