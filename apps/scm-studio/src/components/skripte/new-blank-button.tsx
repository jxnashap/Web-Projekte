import { FilePlus2 } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

/** Öffnet ein leeres Skript nach dem Bauplan (angelegt wird erst beim Speichern). */
export function NewBlankButton() {
  return (
    <LinkButton href="/skripte/leer" variant="secondary">
      <FilePlus2 className="size-4" /> Leeres Skript
    </LinkButton>
  );
}
