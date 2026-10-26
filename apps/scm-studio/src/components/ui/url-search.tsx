"use client";
// Suchfeld, das den Suchbegriff in die URL schreibt (?q=…), entprellt; andere Parameter bleiben erhalten.
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

function Inner({ param, placeholder, className }: { param: string; placeholder: string; className?: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(sp.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const push = (v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v.trim()) next.set(param, v.trim());
    else next.delete(param);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  return (
    <label className={cn("relative flex h-10 min-w-0 items-center rounded-[10px] bg-fill px-3 sm:h-9", className)}>
      <Search className="size-4 shrink-0 text-muted" strokeWidth={2.2} aria-hidden />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => push(e.target.value), 300);
        }}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-[16px] outline-none placeholder:text-muted sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Suche leeren"
          onClick={() => {
            setValue("");
            push("");
          }}
          className="hit grid size-5 place-items-center rounded-full bg-[rgb(120_120_128/0.35)] text-white"
        >
          <X className="size-3" strokeWidth={3} />
        </button>
      )}
    </label>
  );
}

export function UrlSearch({ param = "q", placeholder = "Suchen", className }: { param?: string; placeholder?: string; className?: string }) {
  return (
    <Suspense fallback={<div className={cn("h-10 rounded-[10px] bg-fill sm:h-9", className)} />}>
      <Inner param={param} placeholder={placeholder} className={className} />
    </Suspense>
  );
}
