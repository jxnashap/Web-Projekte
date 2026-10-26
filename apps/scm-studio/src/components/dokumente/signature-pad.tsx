"use client";
// Unterschriftsfeld auf Basis von signature_pad. Gespeichert wird nur die Strich-Geometrie (x/y),
// keine Zeit- oder Druckwerte, damit keine biometrischen Daten entstehen.
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignaturePadLib, { type PointGroup } from "signature_pad";
import { cn } from "@/lib/cn";

export type SignatureData = PointGroup[];
export type SignaturePadHandle = { strokes: () => number[][][]; data: () => SignatureData; clear: () => void; isEmpty: () => boolean };

export function SignaturePad({
  ref,
  label,
  onChange,
  initial,
  fill = false,
  className,
}: {
  ref?: React.Ref<SignaturePadHandle>;
  label: string;
  onChange?: (empty: boolean) => void;
  /** schon gezeichnete Striche (z. B. nach "Zurück"), werden wiederhergestellt */
  initial?: SignatureData;
  /** füllt die verfügbare Höhe (Vollbild beim Unterschreiben) statt fester Höhe */
  fill?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [empty, setEmpty] = useState(!initial?.length);
  const changeRef = useRef(onChange);
  const initialRef = useRef(initial);
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
    if (initialRef.current?.length) pad.fromData(initialRef.current);
    // Größe erst nach dem Layout sicher bekannt (z. B. in Dialogen und im Vollbild)
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

  const clear = () => {
    padRef.current?.clear();
    setEmpty(true);
    changeRef.current?.(true);
  };

  useImperativeHandle(ref, () => ({
    strokes: () => (padRef.current?.toData() ?? []).map((g) => g.points.map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10])).filter((s) => s.length > 0),
    data: () => padRef.current?.toData() ?? [],
    clear,
    isEmpty: () => padRef.current?.isEmpty() ?? true,
  }));

  return (
    <div className={cn("flex flex-col gap-2", fill && "min-h-0 flex-1", className)}>
      <div className={cn("relative overflow-hidden rounded-2xl bg-sunken", fill ? "min-h-[150px] flex-1" : "h-56 sm:h-72")}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full touch-none"
          aria-label={`${label}: hier mit Finger oder Maus unterschreiben`}
          role="img"
          data-testid="signature-canvas"
        />
        {/* Unterschriftslinie (einzige gestrichelte Linie der App) */}
        <div className="pointer-events-none absolute inset-x-6 bottom-12 border-b border-dashed border-line-2" />
        <span className="pointer-events-none absolute bottom-4 left-6 text-[13px] text-muted">{label}</span>
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[15px] text-muted">Hier unterschreiben</span>}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clear}
          disabled={empty}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-fill-2 disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden /> Neu unterschreiben
        </button>
      </div>
    </div>
  );
}

/** Kleine Vorschau einer Unterschrift aus der Strich-Geometrie (z. B. im letzten Schritt vor dem Abschließen). */
export function SignaturePreview({ strokes, className }: { strokes: number[][][]; className?: string }) {
  const pts = strokes.flat();
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs) - 4;
  const minY = Math.min(...ys) - 4;
  const w = Math.max(...xs) - minX + 4;
  const h = Math.max(...ys) - minY + 4;
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className={className} role="img" aria-label="Vorschau der Unterschrift" preserveAspectRatio="xMinYMid meet">
      {strokes.map((st, i) => (
        <polyline key={i} points={st.map((p) => `${p[0]},${p[1]}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
