"use client";
// Blatt nach unten wegwischen (iOS-Geste): am Griff bzw. Kopf ziehen, ab 90 px oder schnellem Wisch schließen.
// Bewegt wird der umgebende <dialog>.
import { useRef } from "react";

export function useSwipeDown(onDismiss: () => void | Promise<void>) {
  const start = useRef<{ y: number; t: number; el: HTMLElement } | null>(null);
  const dy = useRef(0);

  const move = (el: HTMLElement, y: number | null, animate: boolean) => {
    el.style.setProperty("transition", animate ? "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)" : "none");
    el.style.setProperty("transform", y === null ? "" : `translateY(${y}px)`);
  };

  return {
    onPointerDown(e: React.PointerEvent) {
      if (e.pointerType === "mouse" || window.innerWidth >= 640) return;
      // Knöpfe und Felder im Kopf bleiben normal bedienbar (z. B. Schließen)
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      const el = (e.currentTarget as HTMLElement).closest("dialog");
      if (!el) return;
      start.current = { y: e.clientY, t: performance.now(), el };
      dy.current = 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent) {
      if (!start.current) return;
      dy.current = Math.max(0, e.clientY - start.current.y);
      move(start.current.el, dy.current, false);
    },
    async onPointerUp() {
      const s = start.current;
      if (!s) return;
      start.current = null;
      const speed = dy.current / Math.max(1, performance.now() - s.t);
      if (dy.current > 90 || speed > 0.6) {
        move(s.el, null, false);
        await onDismiss();
      } else move(s.el, null, true);
    },
    onPointerCancel() {
      if (start.current) move(start.current.el, null, true);
      start.current = null;
    },
  };
}
