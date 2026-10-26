export function PageHeader({
  scene,
  title,
  description,
  actions,
}: {
  scene: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="scene-label flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-accent" />
          {scene}
        </div>
        <h1 className="display mt-2 text-[38px] text-ink sm:text-[44px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
