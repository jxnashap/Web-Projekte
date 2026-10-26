"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { AI_EFFORTS, AI_MODELS, type AiSettings } from "@/lib/einstellungen/schema";

export function AiForm({ action, value, disabled }: { action: (p: ActionState, f: FormData) => Promise<ActionState>; value: AiSettings; disabled?: boolean }) {
  const known = AI_MODELS.some((m) => m.id === value.model);
  const [model, setModel] = useState(known ? value.model : "eigenes");
  const hint = AI_MODELS.find((m) => m.id === model)?.hint;
  return (
    <ActionForm action={action} className="grid gap-4">
      <Field label="Modell" name="model" hint={hint ?? "Eigene Modell-ID, z. B. aus der OpenAI-Modellliste"}>
        <Select name="model" value={model} onChange={(e) => setModel(e.target.value)} disabled={disabled}>
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value="eigenes">Eigene Modell-ID …</option>
        </Select>
      </Field>
      {model === "eigenes" && (
        <Field label="Modell-ID" name="customModel">
          <Input name="customModel" defaultValue={known ? "" : value.model} placeholder="gpt-6.1-sol" autoComplete="off" disabled={disabled} />
        </Field>
      )}
      <Field label="Nachdenken" name="effort" hint="Längeres Nachdenken kostet mehr Zeit und Geld. Für kreative Kurztexte reicht „Niedrig“.">
        <Select name="effort" defaultValue={value.effort} disabled={disabled}>
          {Object.entries(AI_EFFORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      {!disabled && (
        <FormActions className="mt-2">
          <SubmitButton>Speichern</SubmitButton>
        </FormActions>
      )}
    </ActionForm>
  );
}
