// Formular für ein Video (Anlegen und Bearbeiten).
// Anlegen (compact): erst grob mit Titel, Kunde und Monat, alles Weitere hinter „Mehr Details“. Neue Videos starten als Idee.
import { ChevronDown } from "lucide-react";
import type { Video } from "@/db/schema";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { monthLabel } from "@/lib/format";
import { PLATFORMS } from "@/lib/labels";
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
  submitVariant = "primary",
  compact = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  options: Opts;
  video?: Video | null;
  defaults?: { clientId?: number; month?: string };
  submitLabel: string;
  submitVariant?: "primary" | "secondary";
  compact?: boolean;
}) {
  const current = monthIso();
  const month = video?.month ?? defaults?.month ?? current;
  const months = Array.from(new Set([...Array.from({ length: 10 }, (_, i) => shiftMonth(current, i - 3)), month])).sort();

  const details = (
    <>
      <Field label="Format" name="format" optional>
        <Input name="format" list="video-formate" defaultValue={video?.format ?? ""} placeholder="z. B. Kunden-Sketch" />
        <datalist id="video-formate">
          {FORMATS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
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
      <div className="flex items-end sm:col-span-2">
        <Checkbox name="isTest" label="Testvideo (zählt nicht zum Paket)" defaultChecked={video?.isTest ?? false} />
      </div>
    </>
  );

  return (
    <ActionForm action={action} resetOnSuccess={!video}>
      <FormGrid>
        <Field label="Titel oder Idee" name="title" className="sm:col-span-2">
          <Input name="title" defaultValue={video?.title ?? ""} placeholder="z. B. Der Kunde, der alles besser weiß" required />
        </Field>
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
        {!compact && (
          <>
            {details}
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
      {compact && (
        <details className="group mt-4">
          <summary className="-ml-1 inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-1 text-[15px] font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            Mehr Details
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            <span className="ml-1 font-normal text-muted">Format, Drehtermin, Zuständig</span>
          </summary>
          <FormGrid className="mt-3">{details}</FormGrid>
        </details>
      )}
      <FormActions>
        <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
