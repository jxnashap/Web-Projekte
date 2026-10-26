"use client";
// Stufe einer Anfrage direkt ändern (Liste, Detailseite).
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { setLeadStage } from "@/lib/crm/actions";
import { LEAD_STAGES } from "@/lib/labels";

export function StageSelect({ id, stage, label, size = "sm", className }: { id: number; stage: string; label: string; size?: "sm" | "md"; className?: string }) {
  const [value, setValue] = useState(stage);
  const [pending, start] = useTransition();
  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={pending}
        aria-busy={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          start(async () => {
            const r = await setLeadStage(id, next);
            if (r.ok) toast.success(r.message);
            else {
              setValue(prev);
              toast.error(r.error ?? "Konnte die Stufe nicht ändern");
            }
          });
        }}
        className={cn(
          "cursor-pointer rounded-full border border-line-2 bg-surface pl-3 pr-2 font-semibold text-ink-2 hover:border-ink focus:border-ink focus:outline-none disabled:opacity-60",
          size === "sm" ? "h-9 text-[12.5px]" : "h-10 text-[14px]",
        )}
      >
        {LEAD_STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
