"use client";
// Filter, die ihren Zustand in der URL halten (teilbar, Zurück-Knopf funktioniert).
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";

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

const selectCls =
  "h-9 rounded-full border border-line-2 bg-surface pl-3 pr-8 text-[13px] font-semibold text-ink-2 hover:border-faint focus:border-ink focus:outline-none appearance-none bg-[length:10px] bg-[right_12px_center] bg-no-repeat";
const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%236b6b72' stroke-width='1.6'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E\")";

type Opt = { value: string; label: string };

function UrlSelectInner({ param, label, options, allLabel }: { param: string; label: string; options: Opt[]; allLabel: string }) {
  const { sp, set, pending } = useSetParam();
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        className={cn(selectCls, pending && "opacity-60")}
        style={{ backgroundImage: chevron }}
        value={sp.get(param) ?? ""}
        onChange={(e) => set(param, e.target.value || null)}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function UrlSelect(p: { param: string; label: string; options: Opt[]; allLabel: string }) {
  return (
    <Suspense fallback={<span className={cn(selectCls, "inline-flex w-36 items-center")}>{p.allLabel}</span>}>
      <UrlSelectInner {...p} />
    </Suspense>
  );
}

function UrlToggleInner({ param, label }: { param: string; label: string }) {
  const { sp, set, pending } = useSetParam();
  const on = sp.get(param) === "1";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => set(param, on ? null : "1")}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors",
        on ? "border-warn/40 bg-warn-soft text-warn" : "border-line-2 bg-surface text-ink-2 hover:border-faint",
        pending && "opacity-60",
      )}
    >
      <span className={cn("size-2 rounded-full", on ? "bg-warn" : "bg-line-2")} />
      {label}
    </button>
  );
}

export function UrlToggle(p: { param: string; label: string }) {
  return (
    <Suspense fallback={null}>
      <UrlToggleInner {...p} />
    </Suspense>
  );
}

function UrlSearchInner({ param, placeholder }: { param: string; placeholder: string }) {
  const { sp, set } = useSetParam();
  const [value, setValue] = useState(sp.get(param) ?? "");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => set(param, value.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label className="relative flex h-9 min-w-0 flex-1 items-center sm:max-w-xs">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 size-4 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-full border border-line-2 bg-surface pl-9 pr-3 text-[13px] placeholder:text-faint hover:border-faint focus:border-ink focus:outline-none"
      />
    </label>
  );
}

export function UrlSearch(p: { param: string; placeholder: string }) {
  return (
    <Suspense fallback={<span className="h-9 w-full rounded-full border border-line-2 bg-surface sm:max-w-xs" />}>
      <UrlSearchInner {...p} />
    </Suspense>
  );
}
