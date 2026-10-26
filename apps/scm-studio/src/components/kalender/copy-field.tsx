"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Nur-Lese-Feld mit Kopierknopf (z. B. Abo-Link, Verbindungslink). */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="h-10 min-w-0 flex-1 rounded-lg border border-line-2 bg-sunken px-3 font-mono text-[12px] text-ink-2 focus:border-ink focus:outline-none"
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
        className="grid size-10 shrink-0 place-items-center rounded-full border border-line-2 bg-surface text-ink-2 hover:border-ink"
        aria-label={`${label} kopieren`}
      >
        {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
