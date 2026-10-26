"use client";
// Modaler Dialog auf Basis von <dialog> (Fokusfalle, Escape, Barrierefreiheit vom Browser).
// ParamDialog öffnet sich, wenn ?neu=1 (oder ein anderer Parameter) in der URL steht. So funktionieren
// Links aus dem Befehlsmenü (⌘K) und die Plus-Knöpfe ohne eigene Seiten.
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

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
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto max-h-[92dvh] w-[calc(100vw-24px)] overflow-visible rounded-2xl border border-line bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
        size === "xl" && "max-w-4xl",
      )}
    >
      {open && (
        <DialogCtx.Provider value={{ close: onClose }}>
          <div className="flex max-h-[92dvh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h2 className="text-[17px] font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="-mr-2 grid size-8 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label="Schließen">
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
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
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} className={className}>
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
