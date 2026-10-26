"use client";
// Richtungsbeschreibung der Trend-Recherche bearbeiten: Beschreibung und Suchbegriffe (einer je Zeile).
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import type { Richtung } from "@/lib/skripte/richtung";

export function RichtungForm({ action, value, readOnly }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; value: Richtung; readOnly: boolean }) {
  return (
    <ActionForm action={action} className="grid gap-4">
      <Field label="Wonach gesucht wird" name="beschreibung" hint="Wer ihr seid, was zu euch passt und was nicht">
        <Textarea name="beschreibung" defaultValue={value.beschreibung} rows={14} readOnly={readOnly} className="min-h-72" />
      </Field>
      <Field label="Suchbegriffe" name="stichwoerter" hint="Einer je Zeile. Die Recherche kombiniert sie frei und ergänzt eigene.">
        <Textarea name="stichwoerter" defaultValue={value.stichwoerter.join("\n")} rows={10} readOnly={readOnly} className="min-h-56 font-mono text-[14px]" />
      </Field>
      {!readOnly && (
        <FormActions className="mt-0">
          <SubmitButton>Richtung speichern</SubmitButton>
        </FormActions>
      )}
    </ActionForm>
  );
}
