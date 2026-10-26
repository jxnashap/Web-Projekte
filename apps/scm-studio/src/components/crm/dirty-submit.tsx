"use client";
// Speichern-Knopf, der erst aktiv wird, wenn im Formular etwas geändert wurde (wie "Fertig" in iOS).
// Nach erfolgreichem Speichern ist er wieder inaktiv.
import { useEffect, useRef, useState } from "react";
import { useFormCtx } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";

export function DirtySubmit({ children, ...props }: React.ComponentProps<typeof SubmitButton>) {
  const ref = useRef<HTMLSpanElement>(null);
  const { state } = useFormCtx();
  const stateRef = useRef(state);
  // Rückmeldung, die beim letzten Ändern galt: ein späteres erfolgreiches Speichern macht das Formular wieder "sauber"
  const [changedAt, setChangedAt] = useState<ActionState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const mark = () => setChangedAt(stateRef.current);
    form.addEventListener("input", mark);
    form.addEventListener("change", mark);
    return () => {
      form.removeEventListener("input", mark);
      form.removeEventListener("change", mark);
    };
  }, []);

  const dirty = changedAt !== null && !(state.ok && state !== changedAt);

  return (
    <span ref={ref} className="contents">
      <SubmitButton {...props} disabled={!dirty || props.disabled} title={dirty ? undefined : "Noch nichts geändert"}>
        {children}
      </SubmitButton>
    </span>
  );
}
