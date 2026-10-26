"use client";
// Mehr-Menü im Kopf der Terminseite: Löschen mit Rückfrage im Apple-Stil.
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Menu, menuItemClass } from "@/components/ui/menu";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";

export function EventMoreMenu({ title, remove, googleLinked }: { title: string; remove: () => Promise<ActionState>; googleLinked: boolean }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Menu label={`Weitere Aktionen für „${title}“`} triggerClassName={cn(buttonClass("secondary"), "w-11 px-0 sm:w-[38px]")}>
      <button
        type="button"
        role="menuitem"
        disabled={pending}
        className={cn(menuItemClass, "text-accent-ink [&_svg]:text-accent-ink")}
        onClick={async () => {
          const ok = await confirm({
            title: `„${title}“ löschen?`,
            message: googleLinked ? "Der Termin verschwindet auch aus dem Google Kalender." : "Der Termin verschwindet aus dem Kalender und dem Abo.",
            confirmLabel: "Löschen",
            tone: "danger",
          });
          if (!ok) return;
          start(async () => {
            const r = await remove();
            if (r.ok) {
              toast.success(r.message);
              if (r.redirectTo) router.push(r.redirectTo);
            } else if (r.error) toast.error(r.error);
          });
        }}
      >
        <Trash2 className="size-4" aria-hidden /> Termin löschen
      </button>
    </Menu>
  );
}
