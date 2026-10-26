import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/labels";

const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2",
  accent: "bg-accent-soft text-accent-ink",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
  dark: "bg-ink text-white",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color }} />;
}
