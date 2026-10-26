"use client";
// Filter, die ihren Zustand in der URL halten (teilbar, Zurück-Knopf funktioniert). Nutzen die Kit-Felder.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
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

type Opt = { value: string; label: string };

function UrlSelectInner({ param, label, options, allLabel }: { param: string; label: string; options: Opt[]; allLabel: string }) {
  const { sp, set, pending } = useSetParam();
  return (
    <label className={cn("w-full sm:w-44", pending && "opacity-60")}>
      <span className="sr-only">{label}</span>
      <Select value={sp.get(param) ?? ""} onChange={(e) => set(param, e.target.value || null)}>
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

export function UrlSelect(p: { param: string; label: string; options: Opt[]; allLabel: string }) {
  return (
    <Suspense fallback={<Skeleton className="h-10 w-full sm:w-44" />}>
      <UrlSelectInner {...p} />
    </Suspense>
  );
}

function UrlToggleInner({ param, label }: { param: string; label: string }) {
  const { sp, set, pending } = useSetParam();
  const on = sp.get(param) === "1";
  return (
    <span className={cn("inline-flex h-10 items-center", pending && "opacity-60")}>
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
    <label className="w-full sm:min-w-56 sm:flex-1">
      <span className="sr-only">{placeholder}</span>
      <Input type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function UrlSearch(p: { param: string; placeholder: string }) {
  return (
    <Suspense fallback={<Skeleton className="h-10 w-full sm:min-w-56 sm:flex-1" />}>
      <UrlSearchInner {...p} />
    </Suspense>
  );
}
