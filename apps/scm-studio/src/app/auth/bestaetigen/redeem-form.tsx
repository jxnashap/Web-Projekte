"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { redeemAccessLink, type LoginState } from "../../login/actions";
import { FormMessage } from "../../login/auth-card";

export function RedeemForm({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [state, action] = useActionState<LoginState, FormData>(redeemAccessLink, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <FormMessage error={state.error} />
      <SubmitButton pendingText="Prüft den Link …" className="w-full">
        Weiter
      </SubmitButton>
      <p className="text-center text-[13px] text-muted">Der Link gilt nur einmal und nur für kurze Zeit.</p>
    </form>
  );
}
