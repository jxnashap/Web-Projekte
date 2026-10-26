"use client";
// Zeigt nach der Rückkehr von Google (oder Instagram) eine Meldung und entfernt den Parameter aus der URL.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";

function Inner({ param, messages }: { param: string; messages: Record<string, { ok: boolean; text: string }> }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef<string | null>(null);
  const value = sp.get(param);
  useEffect(() => {
    if (!value || shown.current === value) return;
    shown.current = value;
    const m = messages[value];
    if (m) (m.ok ? toast.success : toast.error)(m.text);
    const next = new URLSearchParams(sp.toString());
    next.delete(param);
    next.delete("grund");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [value, messages, param, pathname, router, sp]);
  return null;
}

export function StatusToast(props: { param: string; messages: Record<string, { ok: boolean; text: string }> }) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
