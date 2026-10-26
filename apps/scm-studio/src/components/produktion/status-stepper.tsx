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
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-busy={pending}>
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
                "flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border text-[13px] font-semibold transition-colors",
                active && "border-ink bg-ink text-white",
                done && "border-ok/30 bg-ok-soft text-ok hover:border-ok",
                !active && !done && "border-line-2 bg-surface text-ink-2 hover:border-ink",
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
