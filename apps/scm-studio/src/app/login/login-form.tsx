"use client";
import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { login, type LoginState } from "./actions";

export function LoginForm({ team, next }: { team: { id: number; name: string }[]; next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Wer bist du?">
        <Select name="user" required defaultValue={team[0]?.id}>
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Passwort" hint="Vorschau-Zugang. Später Login mit E-Mail und Zwei-Faktor über Supabase.">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error && <p className="text-sm font-medium text-accent-ink">{state.error}</p>}
      <SubmitButton pendingText="Anmelden …" className="mt-2 w-full">
        Anmelden
      </SubmitButton>
    </form>
  );
}
