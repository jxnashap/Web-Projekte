// Formular für ein Video (Anlegen und Bearbeiten).
import type { Video } from "@/db/schema";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { monthLabel } from "@/lib/format";
import { PLATFORMS, VIDEO_STATUS } from "@/lib/labels";
import { FORMATS } from "@/lib/skripte/schema";
import { monthIso, shiftMonth } from "@/lib/time";

type Opts = {
  clients: { id: number; name: string }[];
  team: { id: number; name: string }[];
};

export function VideoForm({
  action,
  options,
  video,
  defaults,
  submitLabel,
  compact = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  options: Opts;
  video?: Video | null;
  defaults?: { clientId?: number; month?: string };
  submitLabel: string;
  compact?: boolean;
}) {
  const current = monthIso();
  const month = video?.month ?? defaults?.month ?? current;
  const months = Array.from(new Set([...Array.from({ length: 10 }, (_, i) => shiftMonth(current, i - 3)), month])).sort();
  return (
    <ActionForm action={action} resetOnSuccess={!video}>
      <FormGrid>
        <Field label="Kunde" name="clientId">
          <Select name="clientId" defaultValue={String(video?.clientId ?? defaults?.clientId ?? "")} required>
            <option value="" disabled>
              Kunde wählen
            </option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Monat (Kontingent)" name="month">
          <Select name="month" defaultValue={month}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Titel oder Idee" name="title" className="sm:col-span-2">
          <Input name="title" defaultValue={video?.title ?? ""} placeholder="z. B. Der Kunde, der alles besser weiß" required autoFocus={!video} />
        </Field>
        <Field label="Format" name="format" optional>
          <Input name="format" list="video-formate" defaultValue={video?.format ?? ""} placeholder="Kunden-Sketch" />
          <datalist id="video-formate">
            {FORMATS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label="Status" name="status">
          <Select name="status" defaultValue={video?.status ?? "idee"}>
            {VIDEO_STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Drehtermin" name="shootDate" optional>
          <Input type="date" name="shootDate" defaultValue={video?.shootDate ?? ""} />
        </Field>
        <Field label="Zuständig" name="assignee" optional>
          <Select name="assignee" defaultValue={String(video?.assignee ?? "")}>
            <option value="">Niemand</option>
            {options.team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plattform" name="platform">
          <Select name="platform" defaultValue={video?.platform ?? "instagram"}>
            {Object.entries(PLATFORMS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end pb-2">
          <Checkbox name="isTest" label="Testvideo (zählt nicht zum Paket)" defaultChecked={video?.isTest ?? false} />
        </div>
        {!compact && (
          <>
            <Field label="Online seit" name="postDate" optional>
              <Input type="date" name="postDate" defaultValue={video?.postDate ?? ""} />
            </Field>
            <Field label="Link zum Beitrag" name="url" optional hint="Instagram- oder TikTok-Link, für die Zahlen">
              <Input type="url" name="url" inputMode="url" defaultValue={video?.url ?? ""} placeholder="https://www.instagram.com/reel/…" />
            </Field>
            <Field label="Notizen" name="notes" optional className="sm:col-span-2">
              <Textarea name="notes" defaultValue={video?.notes ?? ""} placeholder="Requisiten, Ideen, Absprachen mit dem Kunden" />
            </Field>
          </>
        )}
      </FormGrid>
      <FormActions>
        <SubmitButton>{submitLabel}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
