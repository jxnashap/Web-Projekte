"use client";
// Rückfrage im Apple-Stil (statt window.confirm): Titel, ein Satz Erklärung, "Abbrechen" und eine klar benannte Aktion.
// Auf dem Handy als Aktionsblatt von unten. Verwendung: const confirm = useConfirm(); if (await confirm({ … })) …
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
const Ctx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const ctx = useContext(Ctx);
  return useCallback(
    (o: ConfirmOptions) => (ctx ? ctx(o) : Promise.resolve(window.confirm([o.title, o.message].filter(Boolean).join("\n\n")))),
    [ctx],
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const msgId = useId();

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (pending && !d.open) d.showModal();
    if (!pending && d.open) d.close();
  }, [pending]);

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const danger = (pending?.tone ?? "danger") === "danger";
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <dialog
        ref={ref}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={pending?.message ? msgId : undefined}
        onCancel={(e) => {
          e.preventDefault();
          finish(false);
        }}
        className={cn(
          "as-sheet squircle m-auto w-[calc(100vw-24px)] max-w-[340px] rounded-[20px] border-0 bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-black/30",
          "max-sm:mb-[max(12px,env(safe-area-inset-bottom))] max-sm:mt-auto max-sm:max-w-none",
        )}
      >
        {pending && (
          <div className="p-5 text-center">
            <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.02em]">
              {pending.title}
            </h2>
            {pending.message && (
              <p id={msgId} className="mt-1.5 text-[14px] leading-snug text-muted">
                {pending.message}
              </p>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={danger ? "danger" : "primary"}
                className={cn("w-full sm:order-2", danger && "bg-accent text-white hover:bg-[#cc1f15]")}
                onClick={() => finish(true)}
                autoFocus={!danger}
              >
                {pending.confirmLabel ?? "Bestätigen"}
              </Button>
              <Button type="button" variant="secondary" className="w-full sm:order-1" onClick={() => finish(false)} autoFocus={danger}>
                {pending.cancelLabel ?? "Abbrechen"}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}
