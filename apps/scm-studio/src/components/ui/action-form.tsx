"use client";
// Formular für Server Actions mit Rückmeldung: zeigt Erfolg/Fehler als Toast, Feldfehler am Feld,
// schließt einen umgebenden Dialog und behält Eingaben bei Fehlern (kein automatisches Zurücksetzen).
import { useRouter } from "next/navigation";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action";
import { useDialog } from "./dialog";

type Ctx = { state: ActionState; pending: boolean };
const FormCtx = createContext<Ctx>({ state: {}, pending: false });
export const useFormCtx = () => useContext(FormCtx);

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  toastOnSuccess = true,
  onSuccess,
  id,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  toastOnSuccess?: boolean;
  onSuccess?: (s: ActionState) => void;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const dialog = useDialog();
  const router = useRouter();
  const last = useRef<ActionState>(state);

  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.ok) {
      if (toastOnSuccess && state.message) toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      dialog?.close();
      onSuccess?.(state);
      if (state.redirectTo) router.push(state.redirectTo);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, toastOnSuccess, resetOnSuccess, dialog, onSuccess, router]);

  return (
    <FormCtx.Provider value={{ state, pending }}>
      <form
        id={id}
        ref={ref}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
      </form>
    </FormCtx.Provider>
  );
}

/** Fehlermeldung zu einem Feld aus dem letzten Absenden. */
export function FieldError({ name }: { name: string }) {
  const { state } = useFormCtx();
  const msg = state.fieldErrors?.[name]?.[0];
  return msg ? <span className="text-[12px] font-medium text-accent-ink">{msg}</span> : null;
}
