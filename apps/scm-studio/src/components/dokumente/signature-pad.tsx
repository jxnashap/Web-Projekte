"use client";
// Unterschriftsfeld auf Basis von signature_pad. Gespeichert wird nur die Strich-Geometrie (x/y),
// keine Zeit- oder Druckwerte, damit keine biometrischen Daten entstehen.
import { Eraser } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { cn } from "@/lib/cn";

export type SignaturePadHandle = { strokes: () => number[][][]; clear: () => void; isEmpty: () => boolean };

export function SignaturePad({
  ref,
  label,
  onChange,
  className,
}: {
  ref?: React.Ref<SignaturePadHandle>;
  label: string;
  onChange?: (empty: boolean) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [empty, setEmpty] = useState(true);
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const pad = padRef.current;
    if (!canvas || !pad) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const data = pad.toData();
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    pad.clear();
    if (data.length) pad.fromData(data);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const pad = new SignaturePadLib(canvasRef.current, { penColor: "#0E0E11", minWidth: 0.9, maxWidth: 2.6, backgroundColor: "rgba(0,0,0,0)" });
    padRef.current = pad;
    const onEnd = () => {
      const e = pad.isEmpty();
      setEmpty(e);
      changeRef.current?.(e);
    };
    pad.addEventListener("endStroke", onEnd);
    resize();
    // Größe erst nach dem Layout sicher bekannt (z. B. in Dialogen)
    const raf = requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      pad.removeEventListener("endStroke", onEnd);
      window.removeEventListener("resize", resize);
      pad.off();
      padRef.current = null;
    };
  }, [resize]);

  useImperativeHandle(ref, () => ({
    strokes: () => (padRef.current?.toData() ?? []).map((g) => g.points.map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10])).filter((s) => s.length > 0),
    clear: () => {
      padRef.current?.clear();
      setEmpty(true);
      changeRef.current?.(true);
    },
    isEmpty: () => padRef.current?.isEmpty() ?? true,
  }));

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="relative h-56 overflow-hidden rounded-2xl border border-line-2 bg-white sm:h-72">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full touch-none"
          aria-label={`${label}: hier mit Finger oder Maus unterschreiben`}
          role="img"
          data-testid="signature-canvas"
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-12 border-b border-dashed border-line-2" />
        <span className="pointer-events-none absolute bottom-4 left-6 text-[12px] text-faint">{label}</span>
        {empty && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-[15px] text-faint">Hier unterschreiben</span>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            padRef.current?.clear();
            setEmpty(true);
            changeRef.current?.(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-sunken"
        >
          <Eraser className="size-4" /> Löschen
        </button>
      </div>
    </div>
  );
}
