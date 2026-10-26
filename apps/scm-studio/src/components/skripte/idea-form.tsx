"use client";
// Formular für eine Video-Idee (anlegen und bearbeiten) und zum Einplanen als Video.
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Idea } from "@/db/schema";
import type { ActionState } from "@/lib/action";
import { monthLabel } from "@/lib/format";
import { FORMATS } from "@/lib/skripte/schema";
import { monthIso, shiftMonth } from "@/lib/time";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function IdeaForm({ action, clients, idea, submitLabel }: { action: Action; clients: { id: number; name: string }[]; idea?: Idea | null; submitLabel: string }) {
  return (
    <ActionForm action={action} resetOnSuccess={!idea}>
      <FormGrid>
        <Field label="Idee in einem Satz" name="title" className="sm:col-span-2">
          <Input name="title" defaultValue={idea?.title ?? ""} placeholder="z. B. Der Gast, der alles besser weiß" required />
        </Field>
        <Field label="Hook" name="hook" optional hint="Erster Satz oder Text im Bild" className="sm:col-span-2">
          <Input name="hook" defaultValue={idea?.hook ?? ""} placeholder="POV: Du bist Kellner und …" />
        </Field>
        <Field label="Worum geht es?" name="description" optional className="sm:col-span-2">
          <Textarea name="description" defaultValue={idea?.description ?? ""} placeholder="Situation, Steigerung, Pointe in Stichworten" />
        </Field>
        <Field label="Format" name="format" optional>
          <Input name="format" list="idee-formate" defaultValue={idea?.format ?? ""} placeholder="z. B. POV-Sketch" />
          <datalist id="idee-formate">
            {FORMATS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label="Für Kunde" name="clientId" optional hint="Leer lassen, wenn die Idee für mehrere passt">
          <Select name="clientId" defaultValue={String(idea?.clientId ?? "")}>
            <option value="">Noch offen</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>
      <FormActions>
        <SubmitButton>{submitLabel}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

/** Idee als Video einplanen: Kunde und Monat (Kontingent). */
export function PlanForm({ action, clients, clientId }: { action: Action; clients: { id: number; name: string }[]; clientId: number | null }) {
  const current = monthIso();
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(current, i));
  return (
    <ActionForm action={action}>
      <FormGrid>
        <Field label="Kunde" name="clientId">
          <Select name="clientId" defaultValue={String(clientId ?? "")} required>
            <option value="" disabled>
              Kunde wählen
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Monat (Kontingent)" name="month">
          <Select name="month" defaultValue={current}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>
      <FormActions>
        <SubmitButton>Einplanen</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
