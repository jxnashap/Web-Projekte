"use client";
// Blatt nach unten wegwischen (iOS-Geste): am Griff bzw. Kopf ziehen, ab 90 px oder schnellem Wisch schließen.
import { useRef } from "react";

export function useSwipeDown(target: React.RefObject<HTMLElement | null>, onDismiss: () => void | Promise<void>) {
  const start = useRef<{ y: number; t: number } | null>(null);
  const dy = useRef(0);

  const reset = (animate = true) => {
    const el = target.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)" : "";
    el.style.transform = "";
  };

  return {
    onPointerDown(e: React.PointerEvent) {
      if (e.pointerType === "mouse" || window.innerWidth >= 640) return;
      // Knöpfe und Felder im Kopf bleiben normal bedienbar (z. B. Schließen)
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      start.current = { y: e.clientY, t: performance.now() };
      dy.current = 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent) {
      if (!start.current || !target.current) return;
      dy.current = Math.max(0, e.clientY - start.current.y);
      target.current.style.transition = "none";
      target.current.style.transform = `translateY(${dy.current}px)`;
    },
    async onPointerUp() {
      if (!start.current) return;
      const speed = dy.current / Math.max(1, performance.now() - start.current.t);
      start.current = null;
      if (dy.current > 90 || speed > 0.6) {
        reset(false);
        await onDismiss();
      } else reset();
    },
    onPointerCancel() {
      start.current = null;
      reset();
    },
  };
}
