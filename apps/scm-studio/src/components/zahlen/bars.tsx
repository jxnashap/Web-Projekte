// Waagerechte Balken in HTML (gestochen scharf, Werte am Balkenende, Tabellenwerte daneben).
import Link from "next/link";
import { cn } from "@/lib/cn";
import { num, pct } from "@/lib/format";

export function Delta({ value, label = "zum Vorzeitraum" }: { value: number | null; label?: string }) {
  if (value === null) return <span className="text-muted">kein Vergleich</span>;
  const up = value >= 0;
  return (
    <span className={cn("font-medium", up ? "text-ok" : "text-accent-ink")}>
      {up ? "▲" : "▼"} {pct(Math.abs(value), 0)} <span className="font-normal text-muted">{label}</span>
    </span>
  );
}

export function ClientBars({
  rows,
  hrefFor,
}: {
  rows: { id: number; name: string; color: string; views: number; interactions: number; rate: number | null; videos: number; change: number | null }[];
  hrefFor: (id: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={hrefFor(r.id)} scroll={false} className="grid gap-2 px-5 py-3.5 hover:bg-sunken/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                <span className="truncate font-semibold">{r.name}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 min-w-0 flex-1 rounded-full bg-fill">
                  <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (r.views / max) * 100)}%`, background: r.color }} />
                </div>
                <span className="w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums">{num(r.views)}</span>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-[12px] sm:w-72">
              <div>
                <dt className="text-muted">Interaktionen</dt>
                <dd className="font-semibold tabular-nums">{num(r.interactions)}</dd>
              </div>
              <div>
                <dt className="text-muted">Rate</dt>
                <dd className="font-semibold tabular-nums">{r.rate === null ? "k. A." : pct(r.rate)}</dd>
              </div>
              <div>
                <dt className="text-muted">Videos</dt>
                <dd className="font-semibold tabular-nums">{r.videos}</dd>
              </div>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FormatBars({ rows }: { rows: { format: string; videos: number; avgViews: number; rate: number | null }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.avgViews));
  return (
    <ul className="grid gap-3.5 p-5">
      {rows.map((r, i) => (
        <li key={r.format}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-semibold">{r.format}</span>
            <span className="shrink-0 text-muted">
              {r.videos} Video{r.videos === 1 ? "" : "s"} · Rate {r.rate === null ? "k. A." : pct(r.rate)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2.5 min-w-0 flex-1 rounded-full bg-fill">
              <div className={cn("h-2.5 rounded-full", i === 0 ? "bg-accent" : "bg-line-2")} style={{ width: `${Math.max(2, (r.avgViews / max) * 100)}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums">{num(r.avgViews)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
