"use client";
// Formular für Server Actions mit Rückmeldung: Erfolg/Fehler als Toast, Feldfehler am Feld, schließt einen
// umgebenden Dialog und behält Eingaben bei Fehlern (kein automatisches Zurücksetzen).
// Die Rückmeldung läuft direkt in der Fortsetzung des Absendens, nicht in einem Effekt: so geht sie auch dann
// nicht verloren, wenn das Formular nach refresh() verschwindet (z. B. nach "bezahlt" oder "festschreiben").
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action";
import { useDialog } from "./dialog";

type Ctx = { state: ActionState; pending: boolean; registerActions?: () => () => void };
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
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  // Zeigt FormActions den Fehler schon an? Sonst zeigt ihn das Formular selbst (wichtig im Dialog).
  const [actionsCount, setActionsCount] = useState(0);
  const registerActions = useCallback(() => {
    setActionsCount((n) => n + 1);
    return () => setActionsCount((n) => n - 1);
  }, []);
  const ref = useRef<HTMLFormElement>(null);
  const dialog = useDialog();
  const router = useRouter();

  return (
    <FormCtx.Provider value={{ state, pending, registerActions }}>
      <form
        id={id}
        ref={ref}
        className={className}
        noValidate
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const form = e.currentTarget;
          const fd = new FormData(form);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          start(async () => {
            let result: ActionState;
            try {
              // Actions, die redirect() aufrufen, lösen die Navigation selbst aus und liefern nichts zurück.
              result = (await action(state, fd)) ?? {};
            } catch (err) {
              // redirect()/notFound() von Next nicht verschlucken
              if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
              console.error(err);
              result = { ok: false, error: "Das hat nicht geklappt. Bitte noch einmal versuchen." };
            }
            setState(result);
            if (result.ok) {
              toast.dismiss();
              if (toastOnSuccess && result.message) toast.success(result.message);
              if (resetOnSuccess) form.reset();
              dialog?.close();
              onSuccess?.(result);
              if (result.redirectTo) router.push(result.redirectTo);
            } else {
              // Im Dialog steht der Fehler im Dialog (FormActions); ein Toast läge hinter dem modalen Dialog.
              if (result.error && !dialog) toast.error(result.error);
              // Erstes fehlerhaftes Feld fokussieren und in den Blick holen
              const first = Object.keys(result.fieldErrors ?? {}).find((k) => result.fieldErrors?.[k]?.length);
              if (first) {
                requestAnimationFrame(() => {
                  const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"], [name="${CSS.escape(first)}[]"]`);
                  el?.focus({ preventScroll: true });
                  el?.scrollIntoView({ block: "center", behavior: "smooth" });
                });
              }
            }
          });
        }}
      >
        {children}
        {dialog && actionsCount === 0 && state.ok === false && state.error && (
          <p role="alert" className="mt-4 rounded-[10px] bg-accent-soft px-3 py-2 text-[14px] font-medium text-accent-ink">
            {state.error}
          </p>
        )}
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
