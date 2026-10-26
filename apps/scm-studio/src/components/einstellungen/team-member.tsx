"use client";
// Teamzeile: für Inhaber antippbar, öffnet ein Blatt mit Rolle (Team oder Inhaber) und "Zugang sperren".
import { ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import { rowFocusClass } from "./grouped";

type Act = () => Promise<ActionState>;

export function TeamMemberRow({
  name,
  email,
  role,
  active,
  children,
  makeTeam,
  makeAdmin,
  toggleActive,
}: {
  name: string;
  email: string;
  role: string;
  active: boolean;
  /** Inhalt der Zeile (Avatar, Name, Kennzeichen) */
  children: React.ReactNode;
  makeTeam: Act;
  makeAdmin: Act;
  toggleActive: Act;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ask = useConfirm();

  const run = (action: Act, close = false) =>
    start(async () => {
      const r = await action();
      if (r?.ok) {
        toast.dismiss();
        if (r.message) toast.success(r.message);
        if (close) setOpen(false);
      } else if (r?.error) toast.error(r.error);
    });

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn("flex min-h-14 w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fill-2", rowFocusClass)}
      >
        {children}
        <ChevronRight className="size-[18px] shrink-0 text-line-2" aria-hidden />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={name} description={email}>
        <div className="grid gap-6">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[13px] font-medium text-ink-2">Rolle</legend>
            <div className="grid grid-cols-2 gap-[2px] rounded-[10px] bg-fill p-[2px]" role="radiogroup" aria-label="Rolle">
              {[
                { value: "team", label: "Team", action: makeTeam },
                { value: "admin", label: "Inhaber", action: makeAdmin },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={role === o.value}
                  disabled={pending}
                  onClick={() => role !== o.value && run(o.action)}
                  className={cn(
                    "h-11 rounded-[8px] text-[15px] font-medium transition-[background-color,box-shadow] sm:h-9 sm:text-[14px]",
                    role === o.value ? "bg-surface font-semibold shadow-[var(--shadow-thumb)]" : "hover:bg-fill-2",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-muted">Inhaber dürfen Einstellungen ändern, Rechnungen festschreiben und exportieren.</p>
          </fieldset>
          <div className="grid gap-2 border-t border-hairline pt-5">
            {active ? (
              <Button
                variant="danger"
                disabled={pending}
                onClick={async () => {
                  const ok = await ask({
                    title: `Zugang von ${name} sperren?`,
                    message: "Die Person kann sich dann nicht mehr anmelden. Ihre Einträge bleiben erhalten.",
                    confirmLabel: "Zugang sperren",
                    tone: "danger",
                  });
                  if (ok) run(toggleActive, true);
                }}
              >
                Zugang sperren
              </Button>
            ) : (
              <Button variant="secondary" disabled={pending} onClick={() => run(toggleActive, true)}>
                Zugang wieder freigeben
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </li>
  );
}
