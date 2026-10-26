export function EmptyState({ title, children, action, icon }: { title: string; children?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="squircle rounded-[var(--radius-card)] bg-fill-2 px-6 py-10 text-center">
      {icon && <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-card)]">{icon}</div>}
      <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-[15px] text-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
