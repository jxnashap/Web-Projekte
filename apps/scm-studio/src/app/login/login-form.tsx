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
      <Field label="Wer meldet sich an?">
        <Select name="user" required defaultValue={state.user ?? team[0]?.id} key={state.user ?? "start"}>
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Passwort" hint="Vorschau-Zugang. Später meldet ihr euch mit E-Mail und Zwei-Faktor-Code an." error={state.error ? " " : undefined}>
        <Input name="password" type="password" autoComplete="current-password" required autoFocus={Boolean(state.error)} />
      </Field>
      <FormMessage error={state.error} />
      <SubmitButton pendingText="Anmelden …" className="mt-1 h-11 w-full text-[15px]">
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
        <Input name="email" type="email" autoComplete="username" required defaultValue={state.email} key={state.email ?? "leer"} />
      </Field>
      <Field label="Passwort">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage error={state.error} />
      <SubmitButton pendingText="Anmelden …" className="mt-1 h-11 w-full text-[15px]">
        Weiter
      </SubmitButton>
      <Link href="/login/passwort-vergessen" className="text-center text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline">
        Passwort vergessen?
      </Link>
    </form>
  );
}
