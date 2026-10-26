"use client";
// Fehlerseite innerhalb der App: freundlich, mit Neu-Laden und Weg zurück. Details nur im Protokoll.
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="display text-[32px]">Das hat nicht geklappt</h1>
      <p className="mt-3 text-[16px] text-muted">
        Beim Laden ist ein Fehler passiert. Versucht es noch einmal. Wenn es bleibt, notiert den Code und gebt ihn an die Technik weiter
        {error.digest ? <code className="ml-1 font-mono text-ink">{error.digest}</code> : null}.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" /> Neu laden
        </Button>
        <LinkButton href="/" variant="secondary">
          Zur Startseite
        </LinkButton>
      </div>
    </div>
  );
}
