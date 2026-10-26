"use client";
// Modaler Dialog auf Basis von <dialog> (Fokusfalle, Escape, Barrierefreiheit vom Browser).
// Desktop: mittig. Handy: Blatt von unten mit Griff. Ein Tipp neben den Dialog schließt nichts;
// wurden Eingaben geändert, fragt der Dialog vor dem Schließen nach ("Eingaben verwerfen?").
// ParamDialog öffnet sich, wenn ?neu=1 (oder ein anderer Parameter) in der URL steht. So funktionieren
// Links aus dem Befehlsmenü (⌘K) und die Plus-Knöpfe ohne eigene Seiten.
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { useConfirm } from "./confirm";

type DialogApi = { close: () => void };
const DialogCtx = createContext<DialogApi | null>(null);
export const useDialog = () => useContext(DialogCtx);

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dirty = useRef(false);
  const titleId = useId();
  const descId = useId();
  const confirm = useConfirm();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      dirty.current = false;
      d.showModal();
      // Startfokus: am Computer das erste Feld, auf Touch-Geräten die Überschrift (keine Tastatur, die hochspringt)
      requestAnimationFrame(() => {
        const fine = window.matchMedia("(pointer: fine)").matches;
        const field = bodyRef.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select, textarea");
        if (fine && field) field.focus();
        else d.querySelector<HTMLElement>(`#${CSS.escape(titleId)}`)?.focus();
      });
    }
    if (!open && d.open) d.close();
  }, [open, titleId]);

  /** Schließen mit Rückfrage, falls etwas eingegeben wurde. */
  const requestClose = useCallback(async () => {
    if (dirty.current) {
      const ok = await confirm({
        title: "Eingaben verwerfen?",
        message: "Was ihr hier eingegeben habt, ist noch nicht gespeichert.",
        confirmLabel: "Verwerfen",
        cancelLabel: "Weiter bearbeiten",
      });
      if (!ok) return;
    }
    dirty.current = false;
    onClose();
  }, [confirm, onClose]);

  // Nach erfolgreichem Speichern ohne Rückfrage schließen
  const closeNow = useCallback(() => {
    dirty.current = false;
    onClose();
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        void requestClose();
      }}
      onClose={() => open && onClose()}
      className={cn(
        "as-sheet squircle m-auto max-h-[92dvh] w-[calc(100vw-24px)] overflow-visible rounded-[22px] border-0 bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-black/25 backdrop:backdrop-blur-[3px]",
        // Handy: Blatt von unten
        "max-sm:mb-0 max-sm:mt-auto max-sm:max-h-[94dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-[26px]",
        size === "md" && "sm:max-w-lg",
        size === "lg" && "sm:max-w-2xl",
        size === "xl" && "sm:max-w-4xl",
      )}
    >
      {open && (
        <DialogCtx.Provider value={{ close: closeNow }}>
          <div className="flex max-h-[inherit] flex-col" onInput={() => (dirty.current = true)}>
            <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-line-2 sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-3 sm:pt-5">
              <div className="min-w-0">
                <h2 id={titleId} tabIndex={-1} className="text-[20px] font-bold tracking-[-0.025em] outline-none">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-[14px] text-muted">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void requestClose()}
                className="hit-lg -mr-1 grid size-[30px] shrink-0 place-items-center rounded-full bg-fill text-muted transition-colors hover:bg-[rgb(120_120_128/0.2)] hover:text-ink"
                aria-label="Schließen"
              >
                <X className="size-4" strokeWidth={2.4} />
              </button>
            </div>
            <div ref={bodyRef} className="overflow-y-auto overscroll-contain px-6 pb-6 pt-3">
              {children}
            </div>
          </div>
        </DialogCtx.Provider>
      )}
    </dialog>
  );
}

/** Knopf + Dialog mit eigenem Zustand. */
export function DialogButton({
  label,
  title,
  description,
  children,
  variant = "primary",
  size = "md",
  dialogSize,
  icon,
  className,
}: {
  label: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  dialogSize?: "md" | "lg" | "xl";
  icon?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} className={className} aria-haspopup="dialog">
        {icon}
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description} size={dialogSize}>
        {children}
      </Dialog>
    </>
  );
}

function ParamDialogInner({ param, value, title, description, children, size }: ParamDialogProps & { param: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = value ? sp.get(param) === value : sp.has(param);
  const close = useCallback(() => {
    const next = new URLSearchParams(sp.toString());
    next.delete(param);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [sp, param, pathname, router]);
  return (
    <Dialog open={open} onClose={close} title={title} description={description} size={size}>
      {children}
    </Dialog>
  );
}

type ParamDialogProps = { param?: string; value?: string; title: string; description?: string; children: React.ReactNode; size?: "md" | "lg" | "xl" };

export function ParamDialog({ param = "neu", ...p }: ParamDialogProps) {
  return (
    <Suspense fallback={null}>
      <ParamDialogInner param={param} {...p} />
    </Suspense>
  );
}
