"use client";
// Neuer Entwurf: Art, Kunde, Leistungsmonat. Paket des Kunden wird als Position vorgeschlagen.
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, FormActions, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createDraft } from "@/lib/finanzen/actions";
import { cn } from "@/lib/cn";

type Opt = { id: number; name: string; status: string; packageVideos: number | null; packagePriceCents: number | null };

const eur = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

export function NewDraftForm({ clients, kind: initialKind, clientId, month }: { clients: Opt[]; kind: "rechnung" | "angebot"; clientId?: number; month: string }) {
  const [kind, setKind] = useState(initialKind);
  const [cid, setCid] = useState(clientId ? String(clientId) : "");
  const client = clients.find((c) => String(c.id) === cid);
  const hasPackage = Boolean(client?.packageVideos && client.packagePriceCents);
  return (
    <ActionForm action={createDraft} className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[13px] font-semibold text-ink-2">Art</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["rechnung", "angebot"] as const).map((k) => (
            <label
              key={k}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors",
                kind === k ? "border-accent bg-accent-soft/50" : "border-line-2 bg-surface hover:border-faint",
              )}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="accent-[var(--color-accent)]" />
              <span className="font-semibold">{k === "rechnung" ? "Rechnung" : "Angebot"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Kunde" name="clientId" hint="Ohne Kunde tragt ihr den Empfänger im nächsten Schritt von Hand ein (z. B. für eine Anfrage).">
        <Select name="clientId" value={cid} onChange={(e) => setCid(e.target.value)}>
          <option value="">Ohne Kunde</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.status === "beendet" ? " (beendet)" : ""}
            </option>
          ))}
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
