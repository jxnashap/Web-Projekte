"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Nur-Lese-Feld mit Kopierknopf (z. B. Abo-Link, Verbindungslink). Gefüllt wie ein Eingabefeld, ohne Rahmen. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-transparent bg-sunken px-3 text-[14px] text-ink-2 focus:border-accent focus:bg-surface focus:outline-none sm:h-10 sm:text-[13px]"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success("Link kopiert");
            setTimeout(() => setCopied(false), 1800);
          } catch {
            toast.error("Kopieren nicht möglich. Bitte den Link markieren und kopieren.");
          }
        }}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-fill text-ink-2 transition-colors hover:bg-[rgb(120_120_128/0.18)] hover:text-ink sm:size-10"
        aria-label={`${label} kopieren`}
      >
        {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
