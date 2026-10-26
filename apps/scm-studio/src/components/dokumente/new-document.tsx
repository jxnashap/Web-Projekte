"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field, FormActions, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { defaultEinwilligung, type DocKind } from "@/lib/dokumente/schema";
import { EinwilligungFields } from "./forms";

type Opt = { id: number; name: string };
type Shoot = { id: number; clientId: number | null; day: string; label: string };

export function NewDocumentForm({
  kind,
  clients,
  defaultClientId,
  shoots,
  defaultMonth,
  today,
  action,
}: {
  kind: DocKind;
  clients: Opt[];
  defaultClientId?: number;
  shoots: Shoot[];
  defaultMonth: string;
  today: string;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [clientId, setClientId] = useState<string>(defaultClientId ? String(defaultClientId) : "");
  const myShoots = shoots.filter((s) => !clientId || s.clientId === Number(clientId));
  const [eventId, setEventId] = useState<string>("");
  const [day, setDay] = useState<string>(myShoots.find((s) => s.day >= today)?.day ?? today);

  return (
    <ActionForm action={action} className="grid gap-6">
      <input type="hidden" name="kind" value={kind} />
      <Field label={kind === "einwilligung" ? "Auftraggeber (Kunde)" : "Kunde"} name="clientId" optional={kind === "einwilligung"}>
        <Select
          name="clientId"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setEventId("");
          }}
          required={kind !== "einwilligung"}
        >
          <option value="">{kind === "einwilligung" ? "ohne Kunde (eigener Dreh von SCM)" : "Kunde wählen"}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      {kind === "vertrag" && (
        <p className="rounded-xl bg-sunken px-4 py-3 text-[14px] text-ink-2">
          Paket, Preis, Unterzeichner und Rechtsform kommen aus dem Kunden. Danach passt ihr Laufzeit, Leistungen und Nutzungsrechte an.
        </p>
      )}

      {kind === "einwilligung" && <EinwilligungFields data={defaultEinwilligung(today)} />}

      {kind === "drehplan" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Drehtermin aus dem Kalender" name="eventId" optional>
            <Select
              name="eventId"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                const s = shoots.find((x) => String(x.id) === e.target.value);
                if (s) {
                  setDay(s.day);
                  if (s.clientId && !clientId) setClientId(String(s.clientId));
                }
              }}
            >
              <option value="">{myShoots.length ? "frei eintragen" : "keine Drehtermine gefunden"}</option>
              {myShoots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Drehtag" name="drehtag">
            <Input name="drehtag" type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
          </Field>
        </div>
      )}

      {kind === "monatsbericht" && (
        <Field label="Monat" name="month" hint="Standard ist der Vormonat. Die Zahlen kommen aus „Zahlen“.">
          <Input name="month" type="month" defaultValue={defaultMonth} required />
        </Field>
      )}

      <FormActions>
        {kind === "einwilligung" ? (
          <>
            <Button type="submit" name="intent" value="save" variant="secondary">
              Als Entwurf speichern
            </Button>
            <SubmitButton name="intent" value="sign" pendingText="Wird vorbereitet …">
              Jetzt unterschreiben
            </SubmitButton>
          </>
        ) : (
          <SubmitButton pendingText="Wird angelegt …">Anlegen</SubmitButton>
        )}
      </FormActions>
    </ActionForm>
  );
}
