"use client";
// Filterleiste für Anfragen und Kunden: Suche links, Filter daneben, Ansicht rechts. Alles wirkt sofort über die URL.
// Auf dem Handy liegen die Filter hinter dem Knopf "Filter" (mit Zähler), damit der Inhalt früher beginnt.
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/** Auswahlliste, die beim Wechsel die URL setzt (ab 6 Werten statt Segmenten). */
export function FilterSelect({
  label,
  options,
  className,
}: {
  label: string;
  options: { value: string; label: string; href: string; active: boolean }[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = options.find((o) => o.active)?.value ?? options[0]?.value;
  return (
    <label className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="shrink-0 text-[13px] font-medium text-muted">{label}</span>
      <Select
        value={current}
        aria-busy={pending}
        onChange={(e) => {
          const o = options.find((x) => x.value === e.target.value);
          if (o) start(() => router.push(o.href, { scroll: false }));
        }}
        className="h-10 w-auto min-w-0 cursor-pointer bg-fill hover:bg-[rgb(120_120_128/0.16)] sm:h-9"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

/**
 * Anordnung der Filterleiste. Handy: oben Suche (und "Filter"), darunter die Ansicht über die volle Breite
 * (oder mit `viewInline` neben der Suche). `filters` erscheinen auf dem Handy erst nach Tipp auf "Filter"
 * (bei aktiven Filtern gleich offen). Ab Tablet steht alles in einer Zeile, die Ansicht rechts.
 */
export function FilterBar({
  search,
  view,
  viewInline = false,
  filters,
  active = 0,
}: {
  search: React.ReactNode;
  view?: React.ReactNode;
  viewInline?: boolean;
  filters?: React.ReactNode;
  active?: number;
}) {
  const [open, setOpen] = useState(active > 0);
  const id = useId();
  return (
    <div className="grid gap-3 md:flex md:flex-wrap md:items-center md:gap-x-5">
      <div className="flex items-center gap-2 md:contents">
        <div className="min-w-0 flex-1 md:w-72 md:flex-none">{search}</div>
        {filters && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "hit inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[15px] font-medium transition-colors md:hidden",
              open ? "bg-ink text-white" : "bg-fill text-ink",
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filter
            {active > 0 && (
              <span className={cn("grid size-5 place-items-center rounded-full text-[12px] font-semibold tabular-nums", open ? "bg-white text-ink" : "bg-ink text-white")}>
                {active}
              </span>
            )}
          </button>
        )}
        {view && viewInline && <div className="shrink-0 md:order-last md:ml-auto">{view}</div>}
      </div>
      {filters && (
        <div id={id} className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", !open && "max-md:hidden")}>
          {filters}
        </div>
      )}
      {view && !viewInline && <div className="min-w-0 md:order-last md:ml-auto">{view}</div>}
    </div>
  );
}
