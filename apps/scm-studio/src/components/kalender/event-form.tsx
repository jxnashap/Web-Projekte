"use client";
// Terminformular (Anlegen und Bearbeiten). Ganztägig blendet die Uhrzeiten aus.
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, FormActions, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import type { CalendarOptions } from "@/lib/kalender/data";
import { EVENT_KINDS } from "@/lib/labels";

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
  submitLabel = "Speichern",
  onSaved,
  view,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: EventDefaults;
  options: CalendarOptions;
  submitLabel?: string;
  onSaved?: (s: ActionState) => void;
  /** aktuelle Kalenderansicht (nach dem Anlegen springt der Kalender dorthin) */
  view?: string;
}) {
  const [allDay, setAllDay] = useState(Boolean(defaults.allDay));
  const [kind, setKind] = useState(defaults.kind ?? "dreh");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate ?? defaults.startDate);
  const [multiDay, setMultiDay] = useState(Boolean(defaults.endDate && defaults.endDate !== defaults.startDate));

  return (
    <ActionForm action={action} onSuccess={onSaved} className="grid gap-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {view && <input type="hidden" name="ansicht" value={view} />}
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-ink-2">Art</legend>
        <div className="grid grid-cols-4 gap-0.5 rounded-[9px] bg-fill p-[2px] sm:inline-grid sm:w-fit">
          {Object.entries(EVENT_KINDS).map(([k, v]) => (
            <label
              key={k}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center rounded-[7px] px-1.5 text-[13px] transition-[background-color,box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 sm:h-8 sm:px-3.5",
                kind === k ? "bg-surface font-semibold text-ink shadow-[var(--shadow-thumb)]" : "font-medium text-ink hover:bg-fill-2",
              )}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormGrid>
        <Field label="Kunde" name="clientId" optional={kind !== "dreh"} hint={kind === "dreh" ? "Empfohlen. Ohne Kunde bitte einen Titel angeben." : undefined}>
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

      <div className="flex flex-wrap gap-x-6">
        <Checkbox label="Ganztägig" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        <Checkbox
          label="Mehrere Tage"
          checked={multiDay}
          onChange={(e) => {
            setMultiDay(e.target.checked);
            if (!e.target.checked) setEndDate(startDate);
          }}
        />
      </div>

      <div className={cn("grid gap-4", multiDay ? "sm:grid-cols-2" : allDay ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        <Field label={multiDay ? "Von (Datum)" : "Datum"} name="startDate" className={!multiDay && !allDay ? "col-span-2 sm:col-span-1" : undefined}>
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
        {!allDay && (
          <>
            <Field label="Beginn" name="startTime">
              <Input type="time" name="startTime" step={300} defaultValue={defaults.startTime ?? "10:00"} required />
            </Field>
            <Field label="Ende" name="endTime">
              <Input type="time" name="endTime" step={300} defaultValue={defaults.endTime ?? "12:00"} required />
            </Field>
          </>
        )}
      </div>

      <Field label="Ort" name="location" optional>
        <Input name="location" defaultValue={defaults.location ?? ""} placeholder="z. B. Kiel, Baustelle oder Telefon" maxLength={300} />
      </Field>

      {options.team.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
            Team <span className="ml-1 font-normal text-muted">optional</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.team.map((t) => (
              <label
                key={t.id}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-fill-2 px-3.5 text-[14px] text-ink-2 transition-colors has-[:checked]:bg-info-soft has-[:checked]:font-medium has-[:checked]:text-info has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 sm:h-9 sm:text-[13px]"
              >
                <input type="checkbox" name="teamIds[]" value={t.id} defaultChecked={defaults.teamIds?.includes(t.id)} className="size-4 accent-[var(--color-info)]" />
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
