"use client";
// Unteres Blatt für das Handy (auf großen Bildschirmen mittig). Basis <dialog> für Fokus und Escape.
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
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
      aria-label={title}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-line bg-surface p-0 pb-[env(safe-area-inset-bottom)] text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/30 sm:m-auto sm:max-w-md sm:rounded-2xl"
    >
      {open && (
        <div className="px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-2 sm:hidden" aria-hidden />
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted hover:bg-sunken" aria-label="Schließen">
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
