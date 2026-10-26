"use client";
// PDF-Vorschau: lädt das PDF als Blob und zeigt es per blob:-URL an. So greift die globale
// X-Frame-Options-Sperre (DENY) nicht, und die Vorschau bleibt trotzdem nur für angemeldete Nutzer sichtbar.
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function PdfPreview({ src, version, title }: { src: string; version: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    // auf dem Handy wird die Vorschau nicht angezeigt (PDF öffnet sich dort separat)
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    fetch(src, { cache: "no-store" })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setError(false);
        setUrl(objectUrl);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, version]);
  if (error) return <p className="p-5 text-[14px] text-muted">Die Vorschau konnte nicht geladen werden. Über „Öffnen“ geht es trotzdem.</p>;
  if (!url) return <Skeleton className="m-5 h-[70vh]" />;
  return <iframe src={`${url}#view=FitH`} title={title} className="h-[78vh] w-full bg-sunken" />;
}
