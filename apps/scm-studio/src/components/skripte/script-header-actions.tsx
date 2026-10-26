"use client";
// Aktionen im Kopf der Skript-Seite. Im Editor speichern „Als fertig markieren“, „Zurück zu Entwurf“ und „Duplizieren“
// die aktuellen Eingaben mit (ein Absenden des Editor-Formulars), damit nichts Ungespeichertes verloren geht.
// In der Drehbuch-Ansicht (ohne Editor) wirken sie direkt auf den gespeicherten Stand.
import { CheckCircle2, Copy, FileDown, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Menu, menuItemClass } from "@/components/ui/menu";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";

type Act = () => Promise<ActionState>;

function editorForm(formId: string) {
  return document.getElementById(formId) as HTMLFormElement | null;
}
const isDirty = (form: HTMLFormElement | null) => Boolean(form?.querySelector('[data-dirty="true"]'));

export function ScriptHeaderActions({
  title,
  status,
  editing,
  pdfHref,
  setFinal,
  setDraft,
  duplicate,
  remove,
  formId,
}: {
  title: string;
  status: string;
  /** true: Editor ist auf der Seite (Reiter Bearbeiten) */
  editing: boolean;
  pdfHref: string;
  setFinal: Act;
  setDraft: Act;
  duplicate: Act;
  remove: Act;
  /** ID des Editor-Formulars (scriptFormId) */
  formId: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  const run = (act: Act) =>
    start(async () => {
      const r = await act();
      if (r?.ok) {
        toast.dismiss();
        if (r.message) toast.success(r.message);
        if (r.redirectTo) router.push(r.redirectTo);
      } else if (r?.error) toast.error(r.error);
    });

  /** Mit ungespeicherten Änderungen: Editor mit Absicht absenden (speichert mit), sonst direkt die Aktion. */
  const viaEditor = (intent: "final" | "entwurf" | "duplizieren", act: Act) => {
    const form = editing ? editorForm(formId) : null;
    if (form && isDirty(form)) {
      const btn = form.querySelector<HTMLButtonElement>(`button[data-intent="${intent}"]`);
      if (btn) {
        form.requestSubmit(btn);
        return;
      }
    }
    run(act);
  };

  const final = status === "final";
  return (
    <>
      <a
        href={pdfHref}
        target="_blank"
        rel="noreferrer"
        className={buttonClass("secondary")}
        onClick={async (e) => {
          if (!editing || !isDirty(editorForm(formId))) return;
          e.preventDefault();
          const ok = await confirm({
            title: "Ungespeicherte Änderungen",
            message: "Das PDF zeigt den zuletzt gespeicherten Stand. Speichert vorher, wenn eure Änderungen drinstehen sollen.",
            confirmLabel: "PDF trotzdem öffnen",
            cancelLabel: "Zurück",
            tone: "default",
          });
          if (ok) window.open(pdfHref, "_blank", "noopener");
        }}
      >
        <FileDown className="size-4" /> PDF öffnen
      </a>
      {final ? (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => viaEditor("entwurf", setDraft)}>
          <RotateCcw className="size-4" /> Zurück zu Entwurf
        </Button>
      ) : (
        <Button type="button" variant={editing ? "secondary" : "primary"} disabled={pending} onClick={() => viaEditor("final", setFinal)}>
          <CheckCircle2 className="size-4" /> Als fertig markieren
        </Button>
      )}
      <Menu label={`Weitere Aktionen für „${title}“`} triggerClassName={cn(buttonClass("secondary"), "w-11 px-0 sm:w-[38px]")}>
        <button
          type="button"
          role="menuitem"
          className={menuItemClass}
          disabled={pending}
          onClick={async () => {
            const form = editing ? editorForm(formId) : null;
            if (form && isDirty(form)) {
              const ok = await confirm({
                title: "Mit Änderungen duplizieren?",
                message: "Die Kopie übernimmt eure aktuellen Eingaben. Sie werden dabei auch in diesem Skript gespeichert.",
                confirmLabel: "Speichern und duplizieren",
                cancelLabel: "Abbrechen",
                tone: "default",
              });
              if (!ok) return;
            }
            viaEditor("duplizieren", duplicate);
          }}
        >
          <Copy className="size-4" /> Duplizieren
        </button>
        <button
          type="button"
          role="menuitem"
          className={cn(menuItemClass, "text-accent-ink [&_svg]:text-accent-ink")}
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              title: `„${title}“ löschen?`,
              message: "Das Skript wird endgültig gelöscht. Ein verknüpftes Video bleibt erhalten.",
              confirmLabel: "Löschen",
              tone: "danger",
            });
            if (!ok) return;
            run(remove);
          }}
        >
          <Trash2 className="size-4" /> Löschen
        </button>
      </Menu>
    </>
  );
}
