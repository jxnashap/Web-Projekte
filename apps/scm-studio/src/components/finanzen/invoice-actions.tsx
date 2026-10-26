"use client";
// Aktionen für festgeschriebene Belege: Zahlung erfassen, Storno mit Grund.
import { Ban, CheckCircle2 } from "lucide-react";
import { DialogButton } from "@/components/ui/dialog";
import { Field, FormActions, Input, Textarea } from "@/components/ui/field";
import { FinanceForm, FinanceSubmit } from "./finance-form";
import { cancel, markPaid } from "@/lib/finanzen/actions";

export function PayButton({ id, today, number }: { id: number; today: string; number: string }) {
  return (
    <DialogButton label="Zahlung erfassen" icon={<CheckCircle2 className="size-4" />} title={`Zahlung zu ${number}`} description="Datum des Geldeingangs laut Kontoauszug.">
      <FinanceForm action={markPaid}>
        <input type="hidden" name="id" value={id} />
        <Field label="Bezahlt am" name="paidAt">
          <Input type="date" name="paidAt" defaultValue={today} max={today} required />
        </Field>
        <FormActions>
          <FinanceSubmit pendingText="Speichert …">Als bezahlt markieren</FinanceSubmit>
        </FormActions>
      </FinanceForm>
    </DialogButton>
  );
}

export function CancelButton({ id, number }: { id: number; number: string }) {
  return (
    <DialogButton
      label="Stornieren"
      variant="danger"
      icon={<Ban className="size-4" />}
      title={`${number} stornieren`}
      description="Es entsteht ein eigener Stornobeleg (ST-…) mit negativen Beträgen. Die Rechnung selbst bleibt unverändert erhalten."
    >
      <FinanceForm action={cancel}>
        <input type="hidden" name="id" value={id} />
        <Field label="Grund" name="reason" hint="Erscheint auf dem Stornobeleg, z. B. „Rechnung an falsche Anschrift“.">
          <Textarea name="reason" rows={2} required />
        </Field>
        <FormActions>
          <FinanceSubmit variant="danger" pendingText="Storniert …">
            Stornobeleg erstellen
          </FinanceSubmit>
        </FormActions>
      </FinanceForm>
    </DialogButton>
  );
}
