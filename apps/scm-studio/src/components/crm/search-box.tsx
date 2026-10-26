"use client";
// Suchfeld: schreibt ?q= in die URL (verzögert), damit Liste und Zurück-Knopf zusammenpassen.
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";

function Inner({ placeholder, label }: { placeholder: string; label: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const push = (v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v.trim()) next.set("q", v.trim());
    else next.delete("q");
    const q = next.toString();
    start(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
  };

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        aria-label={label}
        aria-busy={pending}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          const v = e.target.value;
          timer.current = setTimeout(() => push(v), 250);
        }}
        className="h-10 w-full rounded-full border border-line-2 bg-surface pl-9 pr-9 text-[14px] placeholder:text-faint hover:border-faint focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            push("");
          }}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
          aria-label="Suche leeren"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function SearchBox({ placeholder = "Suchen …", label = "Suchen" }: { placeholder?: string; label?: string }) {
  return (
    <Suspense fallback={<div className="h-10 w-full rounded-full border border-line-2 bg-surface sm:max-w-xs" />}>
      <Inner placeholder={placeholder} label={label} />
    </Suspense>
  );
}
