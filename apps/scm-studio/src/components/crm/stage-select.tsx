"use client";
// Stufe einer Anfrage direkt ändern (Liste, Detailseite).
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { setLeadStage } from "@/lib/crm/actions";
import { LEAD_STAGES } from "@/lib/labels";

export function StageSelect({ id, stage, label, size = "sm", className }: { id: number; stage: string; label: string; size?: "sm" | "md"; className?: string }) {
  const [value, setValue] = useState(stage);
  const [pending, start] = useTransition();
  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <Select
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
        className={cn("cursor-pointer disabled:opacity-60", size === "md" && "min-w-40")}
      >
        {LEAD_STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
