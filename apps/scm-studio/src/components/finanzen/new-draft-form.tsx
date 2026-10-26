"use client";
// Neuer Entwurf: Art, Empfänger (Kunde oder Anfrage), Leistungsmonat. Das Paket des Kunden wird als Position vorgeschlagen.
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, FormActions, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { createDraft } from "@/lib/finanzen/actions";

type ClientOpt = { id: number; name: string; status: string; packageVideos: number | null; packagePriceCents: number | null };
type LeadOpt = { id: number; company: string; name: string };

const eur = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

export function NewDraftForm({
  clients,
  leads,
  kind: initialKind,
  recipient,
  month,
}: {
  clients: ClientOpt[];
  leads: LeadOpt[];
  kind: "rechnung" | "angebot";
  /** Vorauswahl "kunde:ID" oder "anfrage:ID" */
  recipient?: string;
  month: string;
}) {
  const [kind, setKind] = useState(initialKind);
  const [ref, setRef] = useState(recipient ?? "");
  const client = ref.startsWith("kunde:") ? clients.find((c) => `kunde:${c.id}` === ref) : undefined;
  const hasPackage = Boolean(client?.packageVideos && client.packagePriceCents);
  // Anfragen gibt es als Empfänger nur für Angebote; beim Wechsel zur Rechnung fällt eine Anfrage-Auswahl weg
  const value = kind === "rechnung" && ref.startsWith("anfrage:") ? "" : ref;
  return (
    <ActionForm action={createDraft} className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-ink-2">Art</legend>
        <div className="grid grid-cols-2 rounded-[10px] bg-fill p-[2px]" role="radiogroup" aria-label="Art">
          {(["rechnung", "angebot"] as const).map((k) => (
            <label
              key={k}
              className={cn(
                "relative flex h-10 cursor-pointer items-center justify-center rounded-[8px] text-[15px] transition-[background-color,box-shadow] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent sm:h-9 sm:text-[14px]",
                kind === k ? "bg-surface font-semibold text-ink shadow-[var(--shadow-thumb)]" : "font-medium text-ink-2 hover:bg-fill-2",
              )}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {k === "rechnung" ? "Rechnung" : "Angebot"}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label={kind === "angebot" ? "Kunde oder Anfrage" : "Kunde"}
        name="empfaenger"
        hint="Ohne Auswahl tragt ihr den Empfänger im nächsten Schritt von Hand ein."
      >
        <Select name="empfaenger" value={value} onChange={(e) => setRef(e.target.value)}>
          <option value="">Empfänger von Hand eintragen</option>
          <optgroup label="Kunden">
            {clients.map((c) => (
              <option key={c.id} value={`kunde:${c.id}`}>
                {c.name}
                {c.status === "beendet" ? " (beendet)" : ""}
              </option>
            ))}
          </optgroup>
          {kind === "angebot" && leads.length > 0 && (
            <optgroup label="Offene Anfragen">
              {leads.map((l) => (
                <option key={l.id} value={`anfrage:${l.id}`}>
                  {l.company}
                  {l.name ? ` (${l.name})` : ""}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>
      {kind === "rechnung" && (
        <Field label="Leistungsmonat" name="month">
          <Input type="month" name="month" defaultValue={month} required />
        </Field>
      )}
      {hasPackage && (
        <Checkbox
          name="paket"
          defaultChecked
          label={`Paket übernehmen: ${client!.packageVideos} Videos für ${eur(client!.packagePriceCents!)} netto${kind === "angebot" ? " pro Monat" : ""}`}
        />
      )}
      <FormActions>
        <SubmitButton pendingText="Legt an …">{kind === "rechnung" ? "Rechnungsentwurf anlegen" : "Angebotsentwurf anlegen"}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
