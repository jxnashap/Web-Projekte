"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { login, loginWithPassword, type LoginState } from "./actions";
import { FormMessage } from "./auth-card";

/** Vorschau: Teammitglied wählen + gemeinsames Passwort. */
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
      <Field label="Passwort" hint="Vorschau-Zugang. Mit Supabase meldet ihr euch später mit E-Mail und Zwei-Faktor-Code an.">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage error={state.error} />
      <SubmitButton pendingText="Anmelden …" className="mt-2 w-full">
        Anmelden
      </SubmitButton>
    </form>
  );
}

/** Supabase: E-Mail + Passwort, danach Zwei-Faktor. */
export function EmailLoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginWithPassword, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {notice && <FormMessage error={notice} />}
      <Field label="E-Mail">
        <Input name="email" type="email" autoComplete="username" required defaultValue={undefined} />
      </Field>
      <Field label="Passwort">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage error={state.error} />
      <SubmitButton pendingText="Anmelden …" className="mt-2 w-full">
        Weiter
      </SubmitButton>
      <Link href="/login/passwort-vergessen" className="text-center text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline">
        Passwort vergessen?
      </Link>
    </form>
  );
}
