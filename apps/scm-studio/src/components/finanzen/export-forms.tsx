"use client";
// Export abschließen (mit Bestätigung) und DATEV-Kontenzuordnung.
import { Lock } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, FormActions, FormGrid, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { completeExport, saveDatevSettings } from "@/lib/finanzen/actions";
import type { DatevSettings } from "@/lib/finanzen/core";
import { EXPENSE_CATEGORIES } from "@/lib/labels";

export function CompleteExportForm({ from, to, label, openCount, disabled }: { from: string; to: string; label: string; openCount: number; disabled: boolean }) {
  return (
    <ActionForm action={completeExport} className="grid gap-3">
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="label" value={label} />
      <Checkbox name="confirm" label="Das Paket geht an unsere Steuerberatung. Belege dieses Zeitraums danach festschreiben." disabled={disabled} />
      <FormActions className="mt-1 justify-start">
        <SubmitButton disabled={disabled} pendingText="Erstellt Paket …">
          <Lock className="size-4" /> Export abschließen{openCount ? ` (${openCount} Belege)` : ""}
        </SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

export function DatevSettingsForm({ s, canEdit }: { s: DatevSettings; canEdit: boolean }) {
  return (
    <ActionForm action={saveDatevSettings} className="grid gap-5">
      <FormGrid className="lg:grid-cols-4">
        <Field label="Beraternummer" name="beraterNr" hint="Von eurer Steuerberatung">
          <Input name="beraterNr" defaultValue={s.beraterNr} inputMode="numeric" placeholder="[PLATZHALTER]" disabled={!canEdit} />
        </Field>
        <Field label="Mandantennummer" name="mandantNr" hint="Von eurer Steuerberatung">
          <Input name="mandantNr" defaultValue={s.mandantNr} inputMode="numeric" placeholder="[PLATZHALTER]" disabled={!canEdit} />
        </Field>
        <Field label="Kontenrahmen" name="kontenrahmen">
          <Select name="kontenrahmen" defaultValue={s.kontenrahmen} disabled={!canEdit}>
            <option value="03">SKR03</option>
            <option value="04">SKR04</option>
          </Select>
        </Field>
        <Field label="Sachkontenlänge" name="sachkontenlaenge">
          <Input name="sachkontenlaenge" type="number" min={4} max={8} defaultValue={s.sachkontenlaenge} disabled={!canEdit} />
        </Field>
      </FormGrid>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-[15px] font-semibold">Erlöse, Bank, Personenkonten</legend>
        <FormGrid className="lg:grid-cols-4">
          <Konto name="erloes19" label="Erlöse 19 %" v={s.erloes19} d={!canEdit} />
          <Konto name="erloes7" label="Erlöse 7 %" v={s.erloes7} d={!canEdit} />
          <Konto name="erloes0" label="Erlöse 0 %" v={s.erloes0} d={!canEdit} />
          <Konto name="erloesKlein" label="Erlöse Kleinunternehmer" v={s.erloesKlein} d={!canEdit} />
          <Konto name="bank" label="Bank" v={s.bank} d={!canEdit} />
          <Konto name="kreditor" label="Kreditor (unbezahlt)" v={s.kreditor} d={!canEdit} />
          <Field label="Debitoren ab" name="debitorStart" hint="Kunde 5 → 10005">
            <Input name="debitorStart" type="number" defaultValue={s.debitorStart} disabled={!canEdit} />
          </Field>
        </FormGrid>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-[15px] font-semibold">Steuerschlüssel (BU) für Ausgaben</legend>
        <FormGrid className="lg:grid-cols-3">
          <Field label="Vorsteuer 19 %" name="buVorsteuer19">
            <Input name="buVorsteuer19" defaultValue={s.buVorsteuer19} disabled={!canEdit} />
          </Field>
          <Field label="Vorsteuer 7 %" name="buVorsteuer7">
            <Input name="buVorsteuer7" defaultValue={s.buVorsteuer7} disabled={!canEdit} />
          </Field>
          <Field label="§ 13b (Reverse Charge)" name="buReverseCharge" hint="[PLATZHALTER] mit Steuerberatung festlegen">
            <Input name="buReverseCharge" defaultValue={s.buReverseCharge} placeholder="leer" disabled={!canEdit} />
          </Field>
        </FormGrid>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-[15px] font-semibold">Aufwandskonten je Kategorie</legend>
        <FormGrid className="lg:grid-cols-3">
          {Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => (
            <Konto key={k} name={`aufwand_${k}`} label={label} v={s.aufwand[k] ?? ""} d={!canEdit} />
          ))}
        </FormGrid>
      </fieldset>
      {canEdit ? (
        <FormActions>
          <SubmitButton variant="secondary">Zuordnung speichern</SubmitButton>
        </FormActions>
      ) : (
        <p className="text-[13px] text-muted">Ändern dürfen nur Inhaber.</p>
      )}
    </ActionForm>
  );
}

function Konto({ name, label, v, d }: { name: string; label: string; v: string; d: boolean }) {
  return (
    <Field label={label} name={name}>
      <Input name={name} defaultValue={v} inputMode="numeric" className="tabular-nums" disabled={d} />
    </Field>
  );
}
