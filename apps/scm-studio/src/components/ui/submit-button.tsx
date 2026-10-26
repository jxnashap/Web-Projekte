"use client";
import { useFormStatus } from "react-dom";
import { useFormCtx } from "./action-form";
import { Button } from "./button";

export function SubmitButton({
  children,
  pendingText = "Speichert …",
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const status = useFormStatus();
  const ctx = useFormCtx();
  const pending = status.pending || ctx.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
