"use client";
// "Mehr"-Menü der Dokument-Detailseite: seltene Aktionen (PDF laden, wieder bearbeiten, löschen) mit Rückfrage.
import { Download, PenLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/ui/button";
import { useConfirm, type ConfirmOptions } from "@/components/ui/confirm";
import { Menu, menuItemClass } from "@/components/ui/menu";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";

type Run = { action: () => Promise<ActionState>; confirm?: ConfirmOptions };

export function DocMenu({ pdfHref, reopen, remove }: { pdfHref?: string; reopen?: Run; remove?: Run & { label: string } }) {
  const ask = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = async ({ action, confirm }: Run) => {
    if (confirm && !(await ask(confirm))) return;
    start(async () => {
      const r = await action();
      if (r?.ok) {
        toast.dismiss();
        if (r.message) toast.success(r.message);
        if (r.redirectTo) router.push(r.redirectTo);
      } else if (r?.error) toast.error(r.error);
    });
  };
  return (
    <Menu label="Weitere Aktionen" triggerClassName={buttonClass("secondary", "md", "w-11 px-0 sm:w-[38px]")}>
      {pdfHref && (
        <a role="menuitem" href={pdfHref} className={menuItemClass}>
          <Download className="size-4" aria-hidden /> PDF laden
        </a>
      )}
      {reopen && (
        <button type="button" role="menuitem" className={menuItemClass} disabled={pending} onClick={() => void run(reopen)}>
          <PenLine className="size-4" aria-hidden /> Wieder bearbeiten
        </button>
      )}
      {remove && (
        <button type="button" role="menuitem" className={cn(menuItemClass, "text-accent-ink [&_svg]:text-accent-ink")} disabled={pending} onClick={() => void run(remove)}>
          <Trash2 className="size-4" aria-hidden /> {remove.label}
        </button>
      )}
    </Menu>
  );
}
