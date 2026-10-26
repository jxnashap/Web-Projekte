"use client";
// Formular für Finanz-Aktionen, deren Knopf nach dem Speichern verschwindet (Festschreiben, Zahlung, Storno).
// Rückmeldung (Toast, Weiterleitung) läuft in der Fortsetzung des Absendens statt in einem Effekt,
// damit sie auch ankommt, wenn die Seite das Formular nach refresh() nicht mehr zeigt.
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/ui/dialog";
import type { ActionState } from "@/lib/action";

const PendingCtx = createContext(false);

export function FinanceForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();
  const dialog = useDialog();
  return (
    <PendingCtx.Provider value={pending}>
      <form
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          start(async () => {
            try {
              const r = await action({}, fd);
              if (r.ok) {
                setErrors([]);
                if (r.message) toast.success(r.message);
                dialog?.close();
                if (r.redirectTo) router.push(r.redirectTo);
              } else {
                setErrors(Object.values(r.fieldErrors ?? {}).flatMap((x) => x ?? []));
                toast.error(r.error ?? "Das hat nicht geklappt.");
              }
            } catch {
              toast.error("Verbindung unterbrochen. Bitte erneut versuchen.");
            }
          });
        }}
      >
        {errors.length > 0 && (
          <ul role="alert" className="mb-4 list-disc rounded-xl bg-accent-soft py-2.5 pl-8 pr-4 text-[13px] text-accent-ink lg:col-span-full">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        {children}
      </form>
    </PendingCtx.Provider>
  );
}

/** Absenden-Knopf mit Ladezustand für FinanceForm. */
export function FinanceSubmit({ children, pendingText = "Speichert …", ...props }: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const pending = useContext(PendingCtx);
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
