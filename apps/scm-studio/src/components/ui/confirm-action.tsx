"use client";
// Ein Knopf, der eine Server Action ausführt, optional nach Rückfrage (für Löschen, Storno, Festschreiben).
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action";
import { useRouter } from "next/navigation";
import { Button } from "./button";

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
  confirm?: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      title={title}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await action();
          if (r.ok) {
            if (r.message) toast.success(r.message);
            if (r.redirectTo) router.push(r.redirectTo);
          } else if (r.error) toast.error(r.error);
        });
      }}
    >
      {children}
    </Button>
  );
}
