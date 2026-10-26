"use client";
// Schutz vor dem Verlassen mit ungespeicherten Änderungen:
// Tab schließen oder neu laden fragt der Browser (beforeunload), interne Links (Seitenleiste, Zurück, Reiter)
// fragen im Apple-Stil nach ("Änderungen verwerfen?"). Links in neuen Tabs und Downloads bleiben unberührt.
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConfirm, type ConfirmOptions } from "@/components/ui/confirm";

const DEFAULT: ConfirmOptions = {
  title: "Änderungen verwerfen?",
  message: "Was ihr hier geändert habt, ist noch nicht gespeichert.",
  confirmLabel: "Verwerfen",
  cancelLabel: "Weiter bearbeiten",
  tone: "danger",
};

export function useLeaveGuard(active: boolean, options?: Partial<ConfirmOptions>) {
  const confirm = useConfirm();
  const router = useRouter();
  const opts = useRef<ConfirmOptions>({ ...DEFAULT, ...options });
  const asking = useRef(false);

  useEffect(() => {
    opts.current = { ...DEFAULT, ...options };
  });

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // ältere Browser brauchen returnValue
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // fremde Seite: fragt beforeunload
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // nur Sprungmarke
      e.preventDefault();
      e.stopPropagation();
      if (asking.current) return;
      asking.current = true;
      void confirm(opts.current).then((ok) => {
        asking.current = false;
        if (ok) {
          window.removeEventListener("beforeunload", onBeforeUnload);
          document.removeEventListener("click", onClick, true);
          router.push(`${url.pathname}${url.search}${url.hash}`);
        }
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, confirm, router]);
}
