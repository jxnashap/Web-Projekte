"use client";
// Terminformular (Anlegen und Bearbeiten). Ganztägig blendet die Uhrzeiten aus.
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import { EVENT_KINDS } from "@/lib/labels";
import type { CalendarOptions } from "@/lib/kalender/data";

export type EventDefaults = {
  id?: number;
  title?: string;
  kind?: string;
  allDay?: boolean;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  location?: string | null;
  clientId?: number | null;
  leadId?: number | null;
  teamIds?: number[];
  notes?: string | null;
};

export function EventForm({
  action,
  defaults,
  options,
  submitLabel = "Termin speichern",
  onSaved,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: EventDefaults;
  options: CalendarOptions;
  submitLabel?: string;
  onSaved?: (s: ActionState) => void;
}) {
  const [allDay, setAllDay] = useState(Boolean(defaults.allDay));
  const [kind, setKind] = useState(defaults.kind ?? "dreh");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate ?? defaults.startDate);
  const [multiDay, setMultiDay] = useState(Boolean(defaults.endDate && defaults.endDate !== defaults.startDate));

  return (
    <ActionForm action={action} onSuccess={onSaved} className="grid gap-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Art</legend>
        <div className="grid grid-cols-2 gap-0.5 rounded-control bg-fill p-0.5 sm:inline-grid sm:grid-cols-4" role="radiogroup">
          {Object.entries(EVENT_KINDS).map(([k, v]) => (
            <label
              key={k}
              className={cn(
                "flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-3.5 text-[13px] font-semibold transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/30",
                kind === k ? "bg-surface text-ink shadow-thumb" : "text-ink-2 hover:text-ink",
              )}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormGrid>
        <Field label="Kunde" name="clientId" optional={kind !== "dreh"}>
          <Select name="clientId" defaultValue={defaults.clientId ?? ""}>
            <option value="">Kein Kunde</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Anfrage" name="leadId" optional>
          <Select name="leadId" defaultValue={defaults.leadId ?? ""}>
            <option value="">Keine Anfrage</option>
            {options.leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.company} ({l.name})
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>

      <Field
        label="Titel"
        name="title"
        hint={kind === "dreh" ? "Leer lassen ergibt „Dreh <Kunde>“." : undefined}
      >
        <Input name="title" defaultValue={defaults.title ?? ""} placeholder={kind === "dreh" ? "z. B. Dreh Azubi-Tag" : "z. B. Kennenlerngespräch"} maxLength={200} />
      </Field>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="inline-flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="allDay" className="size-4 accent-[var(--color-accent)]" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          Ganztägig
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-accent)]"
            checked={multiDay}
            onChange={(e) => {
              setMultiDay(e.target.checked);
              if (!e.target.checked) setEndDate(startDate);
            }}
          />
          Mehrere Tage
        </label>
      </div>

      <FormGrid>
        <Field label={multiDay ? "Von (Datum)" : "Datum"} name="startDate">
          <Input
            type="date"
            name="startDate"
            required
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (!multiDay || endDate < e.target.value) setEndDate(e.target.value);
            }}
          />
        </Field>
        {multiDay ? (
          <Field label="Bis (Datum)" name="endDate">
            <Input type="date" name="endDate" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        ) : (
          <input type="hidden" name="endDate" value={startDate} />
        )}
      </FormGrid>
      {!allDay && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Beginn" name="startTime">
            <Input type="time" name="startTime" step={300} defaultValue={defaults.startTime ?? "10:00"} required />
          </Field>
          <Field label="Ende" name="endTime">
            <Input type="time" name="endTime" step={300} defaultValue={defaults.endTime ?? "12:00"} required />
          </Field>
        </div>
      )}

      <Field label="Ort" name="location" optional>
        <Input name="location" defaultValue={defaults.location ?? ""} placeholder="z. B. Kiel, Baustelle oder Telefon" maxLength={300} />
      </Field>

      {options.team.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">
            Team <span className="font-normal text-faint">optional</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.team.map((t) => (
              <label
                key={t.id}
                className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-fill-2 px-3 text-[13px] text-ink-2 transition-colors has-[:checked]:bg-accent-soft has-[:checked]:text-accent-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/30"
              >
                <input type="checkbox" name="teamIds[]" value={t.id} defaultChecked={defaults.teamIds?.includes(t.id)} className="size-4 accent-[var(--color-accent)]" />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Notizen" name="notes" optional>
        <Textarea name="notes" defaultValue={defaults.notes ?? ""} rows={3} maxLength={4000} placeholder="Ablauf, Ansprechpartner vor Ort, was mitbringen" />
      </Field>

      <FormActions className="mt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
