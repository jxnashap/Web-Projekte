/**
 * Großer Seitentitel im Apple-Stil. `scene` (z. B. "Szene 02 · Anfragen") bleibt als Prop erhalten,
 * wird aber nicht mehr angezeigt; für eine kleine Zeile über dem Titel `eyebrow` nutzen.
 */
export function PageHeader({
  scene,
  eyebrow,
  title,
  description,
  actions,
}: {
  scene?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  void scene;
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">{eyebrow}</div>}
        <h1 className="display text-[32px] text-ink sm:text-[40px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[16px] leading-snug text-muted sm:text-[17px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
