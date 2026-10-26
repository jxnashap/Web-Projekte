"use client";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { startMfaEnroll, verifyMfa, type LoginState } from "../actions";
import { FormMessage } from "../auth-card";

export function MfaForm({ next, enroll }: { next: string; enroll: boolean }) {
  const [state, action] = useActionState<LoginState, FormData>(verifyMfa, {});
  const [setup, setSetup] = useState<LoginState | null>(null);
  const [pending, start] = useTransition();

  if (enroll && !setup?.qr) {
    return (
      <div className="grid gap-4">
        <ol className="grid list-decimal gap-1.5 pl-5 text-[14px] text-ink-2">
          <li>Authenticator-App öffnen (z. B. Google Authenticator, 1Password, Microsoft Authenticator).</li>
          <li>QR-Code anzeigen lassen und scannen.</li>
          <li>Den sechsstelligen Code eingeben.</li>
        </ol>
        <FormMessage error={setup?.error} />
        <Button type="button" disabled={pending} onClick={() => start(async () => setSetup(await startMfaEnroll()))}>
          {pending ? "Einen Moment …" : "QR-Code anzeigen"}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {setup?.factorId && <input type="hidden" name="factorId" value={setup.factorId} />}
      {setup?.qr && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-line p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR-Code für die Authenticator-App" width={180} height={180} />
          <p className="text-center text-[12px] text-muted">
            Kein Scan möglich? Schlüssel eingeben: <code className="break-all font-mono text-ink">{setup.secret}</code>
          </p>
        </div>
      )}
      <Field label="Code aus der App">
        <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="123 456" className="text-center font-mono text-[20px] tracking-[0.3em]" />
      </Field>
      <FormMessage error={state.error} />
      <SubmitButton pendingText="Prüfe …" className="w-full">
        Bestätigen
      </SubmitButton>
    </form>
  );
}
