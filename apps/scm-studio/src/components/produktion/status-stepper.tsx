"use client";
// Status eines Videos als Schrittfolge. Antippen setzt den Status (optimistisch, mit „Rückgängig“).
// Zwei Abschnitte: vor dem Dreh (Idee bis Gedreht) und Schnitt (Gedreht bis Online), je nachdem, wo das Video steht.
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { CUT_STATUS, isPreShoot, VIDEO_STATUS } from "@/lib/labels";
import { useVideoMove } from "./use-video-move";

export function StatusStepper({ video }: { video: { id: number; title: string; status: string; url: string | null } }) {
  const { videos, move, pending, dialog } = useVideoMove([video]);
  const current = videos[0]?.status ?? video.status;
  const steps = isPreShoot(current) ? VIDEO_STATUS.filter((s) => isPreShoot(s.key) || s.key === "gedreht") : CUT_STATUS;
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <>
      <ol
        className={cn("grid gap-1 rounded-[12px] bg-fill p-[3px]", steps.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-5")}
        aria-busy={pending}
        aria-label="Status"
      >
        {steps.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => !active && move(video.id, s.key)}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-1.5 rounded-[9px] text-[14px] font-medium transition-[background-color,box-shadow] sm:h-9",
                  active && "bg-surface font-semibold text-ink shadow-[var(--shadow-thumb)]",
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
      {dialog}
    </>
  );
}
