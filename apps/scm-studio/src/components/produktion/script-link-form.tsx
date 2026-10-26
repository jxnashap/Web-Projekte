// Vorhandenes Skript desselben Kunden mit dem Video verknüpfen.
import { ActionForm } from "@/components/ui/action-form";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { linkScript } from "@/lib/produktion/actions";

export function ScriptLinkForm({ videoId, current, scripts }: { videoId: number; current: number | null; scripts: { id: number; title: string; status: string }[] }) {
  return (
    <ActionForm action={linkScript.bind(null, videoId)} className="grid gap-2 border-t border-hairline pt-4">
      <Field label="Anderes Skript verknüpfen" name="scriptId">
        <Select name="scriptId" defaultValue={String(current ?? 0)}>
          <option value="0">Kein Skript</option>
          {scripts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.status === "final" ? " (fertig)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" size="sm">
          Verknüpfen
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
