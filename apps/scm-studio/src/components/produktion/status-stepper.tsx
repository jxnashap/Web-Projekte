"use client";
// Status eines Videos als Schrittfolge. Antippen setzt den Status (optimistisch).
import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { VIDEO_STATUS } from "@/lib/labels";
import { setVideoStatus } from "@/lib/produktion/actions";

export function StatusStepper({ id, status }: { id: number; status: string }) {
  const [current, setCurrent] = useOptimistic(status);
  const [pending, start] = useTransition();
  const idx = VIDEO_STATUS.findIndex((s) => s.key === current);
  return (
    <ol className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1 sm:grid-cols-6" aria-busy={pending}>
      {VIDEO_STATUS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key}>
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              onClick={() =>
                !active &&
                start(async () => {
                  setCurrent(s.key);
                  const r = await setVideoStatus(id, s.key);
                  if (r.ok) toast.success(r.message);
                  else toast.error(r.error ?? "Status konnte nicht geändert werden.");
                })
              }
              className={cn(
                "flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors",
                active && "bg-surface font-semibold text-accent-ink ring-1 ring-line",
                done && "text-ok hover:bg-surface/60",
                !active && !done && "text-ink-2 hover:bg-surface/60",
              )}
            >
              {done && <Check className="size-3.5" aria-hidden />}
              {s.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
