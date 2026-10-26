"use client";
// Formular "Neues Dokument": Kunde, dann je Art die nötigen Angaben. Beim Drehplan ist der nächste Drehtermin
// samt Kunde vorausgewählt; wechselt der Kunde, springt der Termin auf dessen nächsten Dreh.
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field, FormActions, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { defaultEinwilligung, type DocKind } from "@/lib/dokumente/schema";
import { EinwilligungFields } from "./forms";

type Opt = { id: number; name: string };
export type Shoot = { id: number; clientId: number | null; day: string; label: string; past: boolean };

const CREATE_LABEL: Record<DocKind, string> = { vertrag: "Vertrag anlegen", einwilligung: "Einwilligung anlegen", drehplan: "Drehplan anlegen", monatsbericht: "Bericht anlegen" };

export function NewDocumentForm({
  kind,
  clients,
  defaultClientId,
  defaultEventId,
  defaultDay,
  shoots,
  defaultMonth,
  today,
  consentIssues,
  action,
}: {
  kind: DocKind;
  clients: Opt[];
  defaultClientId?: number;
  defaultEventId?: number;
  /** Drehtag aus dem Link, falls der Termin nicht in der Liste steht */
  defaultDay?: string;
  shoots: Shoot[];
  defaultMonth: string;
  today: string;
  /** Einwilligung: fehlende Angaben der verantwortlichen Stelle je Kunde bzw. für SCM (null = vollständig) */
  consentIssues?: { byClient: Record<number, string | null>; scm: string | null };
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const nextShootOf = (cid: string) => shoots.find((s) => !s.past && (!cid || s.clientId === Number(cid)));
  // Startwerte: Termin aus dem Link (Kalender), sonst der nächste kommende Dreh (beim Drehplan samt Kunde)
  const [initial] = useState(() => {
    const fromLink = shoots.find((s) => s.id === defaultEventId);
    const cid = defaultClientId ? String(defaultClientId) : "";
    const shoot = kind === "drehplan" ? (fromLink ?? (defaultDay ? undefined : nextShootOf(cid))) : undefined;
    return { clientId: cid || (shoot?.clientId ? String(shoot.clientId) : ""), eventId: shoot ? String(shoot.id) : "", day: shoot?.day ?? defaultDay ?? "" };
  });
  const [clientId, setClientId] = useState<string>(initial.clientId);
  const [eventId, setEventId] = useState<string>(initial.eventId);
  const [day, setDay] = useState<string>(initial.day);
  const myShoots = shoots.filter((s) => !clientId || s.clientId === Number(clientId));
  const upcoming = myShoots.filter((s) => !s.past);
  const past = myShoots.filter((s) => s.past).reverse();

  return (
    <ActionForm action={action} className="grid gap-6">
      <input type="hidden" name="kind" value={kind} />
      <Field label={kind === "einwilligung" ? "Auftraggeber (Kunde)" : "Kunde"} name="clientId" optional={kind === "einwilligung"}>
        <Select
          name="clientId"
          value={clientId}
          onChange={(e) => {
            const cid = e.target.value;
            setClientId(cid);
            if (kind === "drehplan") {
              const next = cid ? nextShootOf(cid) : undefined;
              setEventId(next ? String(next.id) : "");
              setDay(next?.day ?? "");
            }
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

      {kind === "einwilligung" && (
        <EinwilligungFields
          data={defaultEinwilligung(today, Boolean(clientId))}
          hasClient={Boolean(clientId)}
          issues={consentIssues ? { kunde: clientId ? (consentIssues.byClient[Number(clientId)] ?? null) : null, scm: consentIssues.scm } : undefined}
          clientEditHref={clientId ? `/kunden/${clientId}/bearbeiten` : undefined}
          autoFocusName
        />
      )}

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
                  if (s.clientId) setClientId(String(s.clientId));
                }
              }}
            >
              <option value="">{myShoots.length ? "ohne Termin, Datum eintragen" : "keine Drehtermine im Kalender"}</option>
              {upcoming.length > 0 && (
                <optgroup label="Kommende Drehs">
                  {upcoming.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {past.length > 0 && (
                <optgroup label="Vergangene Drehs">
                  {past.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              )}
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
            {/* Handy: untereinander, Hauptaktion oben; die Eingabetaste speichert den Entwurf (erster Knopf) */}
            <Button type="submit" name="intent" value="save" variant="secondary" className="max-sm:order-2 max-sm:w-full">
              Als Entwurf speichern
            </Button>
            <SubmitButton name="intent" value="sign" pendingText="Wird vorbereitet …" className="max-sm:order-1 max-sm:w-full">
              Jetzt unterschreiben
            </SubmitButton>
          </>
        ) : (
          <SubmitButton pendingText="Wird angelegt …">{CREATE_LABEL[kind]}</SubmitButton>
        )}
      </FormActions>
    </ActionForm>
  );
}
