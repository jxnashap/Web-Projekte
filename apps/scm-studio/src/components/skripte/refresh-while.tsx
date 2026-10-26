"use client";
// Lädt die Seite in Abständen neu, solange etwas im Hintergrund läuft (z. B. die Trend-Recherche).
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshWhile({ active, everyMs = 15_000 }: { active: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [active, everyMs, router]);
  return null;
}
