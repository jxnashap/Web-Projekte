"use client";
// Aktionen für festgeschriebene Rechnungen: Zahlung erfassen und Storno mit Grund (jeweils im Dialog, auf dem Handy als Blatt).
import { Ban, CheckCircle2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { DialogButton } from "@/components/ui/dialog";
import { Field, FormActions, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cancel, markPaid } from "@/lib/finanzen/actions";

export function PayButton({ id, today, number, variant = "primary" }: { id: number; today: string; number: string; variant?: "primary" | "secondary" }) {
  return (
    <DialogButton
      label="Zahlung erfassen"
      variant={variant}
      icon={<CheckCircle2 className="size-4" />}
      title={`Zahlung zu ${number}`}
      description="Datum des Geldeingangs laut Kontoauszug."
    >
      <ActionForm action={markPaid}>
        <input type="hidden" name="id" value={id} />
        <Field label="Bezahlt am" name="paidAt">
          <Input type="date" name="paidAt" defaultValue={today} max={today} required />
        </Field>
        <FormActions>
          <SubmitButton pendingText="Speichert …">Als bezahlt markieren</SubmitButton>
        </FormActions>
      </ActionForm>
    </DialogButton>
  );
}

export function CancelButton({ id, number }: { id: number; number: string }) {
  return (
    <DialogButton
      label="Rechnung stornieren"
      variant="danger"
      icon={<Ban className="size-4" />}
      title={`${number} stornieren?`}
      description="Es entsteht ein eigener Stornobeleg (ST-…) mit negativen Beträgen. Die Rechnung selbst bleibt unverändert erhalten."
    >
      <ActionForm action={cancel}>
        <input type="hidden" name="id" value={id} />
        <Field label="Grund" name="reason" hint="Erscheint auf dem Stornobeleg, z. B. „Rechnung an falsche Anschrift“.">
          <Textarea name="reason" rows={2} required maxLength={300} />
        </Field>
        <FormActions>
          <SubmitButton pendingText="Storniert …">Stornobeleg erstellen</SubmitButton>
        </FormActions>
      </ActionForm>
    </DialogButton>
  );
}
