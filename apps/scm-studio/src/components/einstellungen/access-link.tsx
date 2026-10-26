"use client";
// Zugangslink zum Weitergeben: kopieren oder direkt senden (Teilen-Menü am Handy, sonst WhatsApp).
import { Send } from "lucide-react";
import { CopyField } from "@/components/kalender/copy-field";
import { Button } from "@/components/ui/button";

export function AccessLinkShare({ link, name }: { link: string; name: string }) {
  const first = name.split(/\s+/)[0] ?? name;
  const text = `Hallo ${first}, hier ist dein Zugang zu SCM Studio. Einmal öffnen, Passwort festlegen, Authenticator-App einrichten, fertig:`;
  const send = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Zugang zu SCM Studio", text, url: link });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
  };
  return (
    <div className="grid gap-3">
      <CopyField value={link} label={`Zugangslink für ${name}`} />
      <Button type="button" onClick={send} className="w-full">
        <Send className="size-4" aria-hidden />
        An {first} senden
      </Button>
      <p className="text-[13px] leading-snug text-muted">
        Der Link gilt nur einmal und nur kurze Zeit. Schickt ihn nur an {first} selbst, zum Beispiel per WhatsApp. Ist er abgelaufen, erzeugt ihr unter Team einfach einen neuen.
      </p>
    </div>
  );
}
