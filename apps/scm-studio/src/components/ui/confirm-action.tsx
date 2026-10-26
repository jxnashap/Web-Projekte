"use client";
// Ein Knopf, der eine Server Action ausführt, optional nach Rückfrage im Apple-Stil (Löschen, Storno, Festschreiben).
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action";
import { Button } from "./button";
import { useConfirm, type ConfirmOptions } from "./confirm";

export function ActionButton({
  action,
  confirm,
  children,
  variant = "secondary",
  size = "sm",
  className,
  title,
}: {
  action: () => Promise<ActionState>;
  /** Rückfrage: Text (wird zum Titel) oder Optionen mit Titel, Erklärung und Beschriftung der Aktion */
  confirm?: string | ConfirmOptions;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const ask = useConfirm();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      title={title}
      disabled={pending}
      aria-busy={pending}
      onClick={async () => {
        if (confirm) {
          const opts: ConfirmOptions =
            typeof confirm === "string"
              ? { title: confirm, confirmLabel: typeof children === "string" ? children : "Bestätigen", tone: variant === "danger" ? "danger" : "default" }
              : confirm;
          if (!(await ask(opts))) return;
        }
        start(async () => {
          const r = await action();
          if (r?.ok) {
            toast.dismiss();
            if (r.message) toast.success(r.message);
            if (r.redirectTo) router.push(r.redirectTo);
          } else if (r?.error) toast.error(r.error);
        });
      }}
    >
      {children}
    </Button>
  );
}
