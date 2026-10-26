"use client";
// Kopfaktionen einer Anfrage: eine Hauptaktion ("Zum Kunden machen") und das Menü "Mehr" mit
// "Als verloren markieren" und "Anfrage löschen" (mit Rückfrage).
import { Trash2, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Menu, menuItemClass } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { deleteLead } from "@/lib/crm/actions";
import { type LeadRef, useLeadDialogs } from "./lead-dialogs";

export function LeadActions({ lead, open }: { lead: LeadRef; open: boolean }) {
  const dialogs = useLeadDialogs();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();

  const remove = async () => {
    const ok = await confirm({
      title: "Anfrage löschen?",
      message: `Die Anfrage von ${lead.company} wird endgültig gelöscht. Termine dazu bleiben im Kalender.`,
      confirmLabel: "Löschen",
      tone: "danger",
    });
    if (!ok) return;
    start(async () => {
      const r = await deleteLead(lead.id);
      if (r.ok) {
        toast.success(r.message);
        router.push(r.redirectTo ?? "/anfragen");
      } else toast.error(r.error ?? "Konnte die Anfrage nicht löschen");
    });
  };

  return (
    <>
      {open && (
        <Button type="button" onClick={() => dialogs.convert(lead)} aria-haspopup="dialog">
          <UserCheck className="size-4" /> Zum Kunden machen
        </Button>
      )}
      <Menu label="Mehr" triggerClassName={cn(buttonClass("secondary", "md"), "w-11 px-0 sm:w-[38px]")}>
        {open && (
          <button type="button" role="menuitem" className={menuItemClass} onClick={() => dialogs.lost(lead)}>
            <UserX className="size-4" /> Als verloren markieren
          </button>
        )}
        <button type="button" role="menuitem" className={cn(menuItemClass, "text-accent-ink [&_svg]:text-accent-ink")} onClick={remove} disabled={pending}>
          <Trash2 className="size-4" /> Anfrage löschen
        </button>
      </Menu>
    </>
  );
}
