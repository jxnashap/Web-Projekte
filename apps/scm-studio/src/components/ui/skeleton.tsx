import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-fill-2", className)} />;
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-[var(--radius-card)]" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

/** Detailseite: Zurück-Link, Titel, Hauptkarte und Seitenkarte */
export function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-[var(--radius-card)] lg:col-span-2" />
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

/** Liste mit Filterleiste */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-9 w-full max-w-lg" />
      <div className="grid gap-2 rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)]">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

/** Formular */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-4 rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-card)] sm:grid-cols-2">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10" />
        </div>
      ))}
    </div>
  );
}
