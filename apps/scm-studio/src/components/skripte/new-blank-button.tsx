import { FilePlus2 } from "lucide-react";
import { ActionButton } from "@/components/ui/confirm-action";
import { createBlankScript } from "@/lib/skripte/actions";

/** Legt ein leeres Skript nach dem Bauplan an und öffnet es. */
export function NewBlankButton() {
  return (
    <ActionButton action={createBlankScript} variant="secondary" size="md">
      <FilePlus2 className="size-4" /> Leeres Skript
    </ActionButton>
  );
}
