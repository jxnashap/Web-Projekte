"use client";
// Unteres Blatt für das Handy (auf großen Bildschirmen mittig). Basis <dialog> für Fokus und Escape.
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSwipeDown } from "@/components/ui/use-swipe-down";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const swipe = useSwipeDown(ref, onClose);
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
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
      className="squircle m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[26px] border-0 bg-surface p-0 pb-[env(safe-area-inset-bottom)] text-ink shadow-[var(--shadow-pop)] backdrop:bg-black/25 sm:m-auto sm:max-w-md sm:rounded-[22px]"
    >
      {open && (
        <div className="px-4 pb-4 pt-3">
          <div {...swipe} className="-mt-3 touch-none pb-3 pt-3 sm:hidden">
            <div className="mx-auto h-[5px] w-9 rounded-full bg-line-2" aria-hidden />
          </div>
          <div {...swipe} className="mb-2 flex items-center justify-between px-2 max-sm:touch-none">
            <h2 className="text-[20px] font-bold tracking-[-0.025em]">{title}</h2>
            <button type="button" onClick={onClose} className="grid size-[30px] place-items-center rounded-full bg-fill text-muted hover:text-ink" aria-label="Schließen">
              <X className="size-4" strokeWidth={2.4} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
