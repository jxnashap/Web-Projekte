"use client";
// Schalter wie in iOS für die Demo-Hinweise. Wirkt sofort, ohne eigenen Speichern-Knopf.
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";

export function DemoSwitch({ on, disabled, action, label }: { on: boolean; disabled?: boolean; action: (next: boolean) => Promise<ActionState>; label: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(on);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          setValue(!value);
          const r = await action(!value);
          if (r?.ok) toast.success(r.message ?? "Gespeichert");
          else if (r?.error) toast.error(r.error);
        })
      }
      className={cn(
        "hit relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
        value ? "bg-ok" : "bg-[rgb(120_120_128/0.24)]",
      )}
    >
      <span
        className={cn(
          "absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)] transition-transform duration-200",
          value && "translate-x-5",
        )}
        aria-hidden
      />
    </button>
  );
}
