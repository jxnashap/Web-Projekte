"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset, type LoginState } from "../actions";
import { FormMessage } from "../auth-card";

export function ResetForm() {
  const [state, action] = useActionState<LoginState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className="grid gap-4">
      <Field label="E-Mail">
        <Input name="email" type="email" autoComplete="username" required />
      </Field>
      <FormMessage error={state.error} info={state.info} />
      <SubmitButton pendingText="Sende …" className="w-full">
        Link schicken
      </SubmitButton>
      <Link href="/login" className="text-center text-[13px] text-muted hover:text-ink">
        Zurück zur Anmeldung
      </Link>
    </form>
  );
}
