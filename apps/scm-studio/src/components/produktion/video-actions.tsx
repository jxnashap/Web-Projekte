"use client";
// Mehr-Menü im Kopf der Videoseite: Löschen mit Rückfrage (nur ohne Zahlen möglich).
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Menu, menuItemClass } from "@/components/ui/menu";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";

export function VideoMoreMenu({ title, remove, hasMetrics }: { title: string; remove: () => Promise<ActionState>; hasMetrics: boolean }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Menu label={`Weitere Aktionen für „${title}“`} triggerClassName={cn(buttonClass("secondary"), "w-11 px-0 sm:w-[38px]")}>
      {hasMetrics ? (
        <p className="max-w-64 px-2.5 py-2 text-[13px] text-muted">Für dieses Video gibt es schon Zahlen. Es kann deshalb nicht gelöscht werden.</p>
      ) : (
        <button
          type="button"
          role="menuitem"
          disabled={pending}
          className={cn(menuItemClass, "text-accent-ink [&_svg]:text-accent-ink")}
          onClick={async () => {
            const ok = await confirm({
              title: `„${title}“ löschen?`,
              message: "Das Video verschwindet aus Produktion und Kontingent. Ein verknüpftes Skript bleibt erhalten.",
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
          <Trash2 className="size-4" /> Video löschen
        </button>
      )}
    </Menu>
  );
}
