"use client";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { setNewPassword, type LoginState } from "../actions";
import { FormMessage } from "../auth-card";

export function SetPasswordForm() {
  const [state, action] = useActionState<LoginState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="grid gap-4">
      <Field label="Neues Passwort">
        <Input name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field label="Wiederholen">
        <Input name="repeat" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <FormMessage error={state.error} />
      <SubmitButton pendingText="Speichert …" className="w-full">
        Passwort speichern
      </SubmitButton>
    </form>
  );
}
