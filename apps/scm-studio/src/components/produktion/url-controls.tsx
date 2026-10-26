"use client";
// Filter, die ihren Zustand in der URL halten (teilbar, Zurück-Knopf funktioniert). Nutzen die Kit-Felder.
// Auf dem grauen Seitengrund sind die Felder weiß mit Schatten (sonst verschwinden sie im Grund).
// Auf dem Handy bündelt FilterSheet die Filter hinter einem Knopf „Filter“ (Blatt von unten).
import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Felder direkt auf dem Seitengrund */
export const onCanvas = "bg-surface shadow-[var(--shadow-card)] hover:bg-surface";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const q = next.toString();
    start(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
  };
  return { sp, set, pending };
}

type Opt = { value: string; label: string };
type SelectProps = { param: string; label: string; options: Opt[]; allLabel: string; className?: string; inSheet?: boolean };

function UrlSelectInner({ param, label, options, allLabel, className, inSheet }: SelectProps) {
  const { sp, set, pending } = useSetParam();
  return (
    <label className={cn(inSheet ? "grid gap-1.5" : "w-full sm:w-48", pending && "opacity-60", className)}>
      <span className={inSheet ? "text-[13px] font-medium text-ink-2" : "sr-only"}>{label}</span>
      <Select value={sp.get(param) ?? ""} onChange={(e) => set(param, e.target.value || null)} className={cn(!inSheet && onCanvas, "sm:h-9")}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function UrlSelect(p: SelectProps) {
  return (
    <Suspense fallback={<Skeleton className={cn("h-11 w-full sm:h-9 sm:w-48", p.className)} />}>
      <UrlSelectInner {...p} />
    </Suspense>
  );
}

function UrlToggleInner({ param, label }: { param: string; label: string }) {
  const { sp, set, pending } = useSetParam();
  const on = sp.get(param) === "1";
  return (
    <span className={cn("inline-flex items-center", pending && "opacity-60")}>
      <Checkbox label={label} checked={on} onChange={() => set(param, on ? null : "1")} />
    </span>
  );
}

export function UrlToggle(p: { param: string; label: string }) {
  return (
    <Suspense fallback={null}>
      <UrlToggleInner {...p} />
    </Suspense>
  );
}

/**
 * Suchfeld (Optik wie UrlSearch im Kit), schreibt ?q= entprellt in die URL und gleicht sich mit der URL ab:
 * „Filter zurücksetzen“ leert also auch das Feld.
 */
function UrlSearchInner({ param, placeholder, className }: { param: string; placeholder: string; className?: string }) {
  const { sp, set } = useSetParam();
  const urlValue = sp.get(param) ?? "";
  const [value, setValue] = useState(urlValue);
  const [seen, setSeen] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // URL von außen geändert (Zurücksetzen, Zurück-Knopf): Feld nachziehen, ohne beim Tippen dazwischenzufunken
  if (urlValue !== seen) {
    setSeen(urlValue);
    if (urlValue !== value.trim()) setValue(urlValue);
  }
  const push = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set(param, v.trim() || null), 300);
  };
  return (
    <label className={cn("relative flex h-11 min-w-0 items-center rounded-[10px] px-3 sm:h-9", onCanvas, className)}>
      <Search className="size-4 shrink-0 text-muted" strokeWidth={2.2} aria-hidden />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          push(e.target.value);
        }}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-[16px] outline-none placeholder:text-muted sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Suche leeren"
          onClick={() => {
            setValue("");
            if (timer.current) clearTimeout(timer.current);
            set(param, null);
          }}
          className="hit-lg grid size-5 shrink-0 place-items-center rounded-full bg-[rgb(120_120_128/0.35)] text-white"
        >
          <X className="size-3" strokeWidth={3} />
        </button>
      )}
    </label>
  );
}

export function UrlSearch(p: { param: string; placeholder: string; className?: string }) {
  return (
    <Suspense fallback={<Skeleton className={cn("h-11 rounded-[10px] sm:h-9", p.className)} />}>
      <UrlSearchInner {...p} />
    </Suspense>
  );
}

/**
 * Knopf „Filter“ mit Anzahl aktiver Filter; öffnet ein Blatt (Handy: von unten) mit den Filtern.
 * Änderungen wirken sofort über die URL, deshalb fragt das Blatt beim Schließen nicht nach.
 */
export function FilterSheet({ count, children, className, title = "Filter" }: { count: number; children: React.ReactNode; className?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(onCanvas, "hover:bg-fill-2", className)}
      >
        <SlidersHorizontal className="size-4" />
        Filter
        {count > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[12px] font-semibold tabular-nums text-white">
            <span className="sr-only">aktiv: </span>
            {count}
          </span>
        )}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        {/* Eingaben hier sind sofort gespeichert (URL): nicht als „ungespeichert“ zählen */}
        <div className="grid gap-5" onInput={(e) => e.stopPropagation()}>
          {children}
          <Button type="button" className="w-full" onClick={() => setOpen(false)}>
            Ergebnisse zeigen
          </Button>
        </div>
      </Dialog>
    </>
  );
}
