"use client";
// Skript-Editor: Titel, Kunde, Format, Ablauf (Schritte) mit Zeit, Abschnitt, Text und Einstellung, Caption.
// Hook und Aufruf sind die Texte der Abschnitte „Hook“ und „Aufruf“ (eine Quelle der Wahrheit).
// Der Status wird nicht hier geführt, sondern über den Seitenkopf: „Als fertig markieren“ speichert die Eingaben mit
// (versteckte Knöpfe mit intent=final/entwurf/duplizieren, siehe ScriptHeaderActions).
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { cn } from "@/lib/cn";
import { BAUPLAN, FORMATS, mergeHookAndCta, tc, toSec } from "@/lib/skripte/schema";
import { useLeaveGuard } from "@/components/ui/use-leave-guard";

type Beat = { key: number; tc: string; label: string; text: string; shot: string };
export type ScriptData = {
  title: string;
  format: string | null;
  hook: string | null;
  beats: { tc: string; label: string; text: string; shot?: string }[];
  caption: string | null;
  cta: string | null;
  clientId: number | null;
};


// Kleine Symbolknöpfe: auf dem Handy 44 px, am Computer 32 px
const mini =
  "grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-fill hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent sm:size-8";

/** Textfelder wachsen mit dem Inhalt: per CSS (field-sizing), in älteren Browsern per Skript. */
function fitTextarea(el: HTMLTextAreaElement) {
  if (typeof CSS !== "undefined" && CSS.supports("field-sizing", "content")) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}
function useAutoGrow(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    ref.current?.querySelectorAll("textarea").forEach(fitTextarea);
  });
}

export function ScriptEditor({
  action,
  script,
  clients,
  isNew = false,
  formId,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  script: ScriptData;
  clients: { id: number; name: string }[];
  /** neues Skript: wird erst beim Speichern angelegt */
  isNew?: boolean;
  formId: string;
}) {
  const [beats, setBeats] = useState<Beat[]>(() =>
    mergeHookAndCta(script.beats, script.hook, script.cta).map((b, i) => ({ key: i + 1, tc: b.tc, label: b.label, text: b.text, shot: b.shot ?? "" })),
  );
  const keyRef = useRef(beats.length + 1);
  const [dirty, setDirty] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  useAutoGrow(areaRef);

  // Neues Skript: Titel am Computer gleich markiert (auf Touch-Geräten keine Tastatur, die ungefragt hochspringt)
  useEffect(() => {
    if (!isNew || !window.matchMedia("(pointer: fine)").matches) return;
    const title = areaRef.current?.querySelector<HTMLInputElement>('input[name="title"]');
    title?.focus();
    title?.select();
  }, [isNew]);

  useLeaveGuard(dirty);

  const update = (key: number, patch: Partial<Beat>) => {
    setBeats((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => {
    setBeats((bs) => {
      const next = [...bs];
      const [b] = next.splice(i, 1);
      next.splice(i + d, 0, b);
      return next;
    });
    setDirty(true);
  };
  const remove = (key: number) => {
    setBeats((bs) => bs.filter((b) => b.key !== key));
    setDirty(true);
  };
  const add = () => {
    const key = keyRef.current++;
    setBeats((bs) => {
      const last = bs[bs.length - 1];
      const at = last ? tc((toSec(last.tc) ?? 0) + 4) : "00:00";
      const label = BAUPLAN[Math.min(bs.length, BAUPLAN.length - 1)];
      return [...bs, { key, tc: at, label, text: "", shot: "" }];
    });
    setDirty(true);
    // neues Textfeld fokussieren
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(`#${CSS.escape(formId)} li:last-child textarea`)?.focus());
  };

  return (
    <ActionForm action={action} id={formId} onSuccess={() => setDirty(false)} className="grid gap-6">
      <div
        ref={areaRef}
        onInput={(e) => {
          setDirty(true);
          if (e.target instanceof HTMLTextAreaElement) fitTextarea(e.target);
        }}
        data-dirty={dirty ? "true" : "false"}
        className="grid gap-6"
      >
        <FormGrid>
          <Field label="Titel" name="title" className="sm:col-span-2">
            <Input
              name="title"
              defaultValue={script.title}
              required
              className="text-[16px] font-semibold"
            />
          </Field>
          <Field label="Kunde" name="clientId" optional>
            <Select name="clientId" defaultValue={String(script.clientId ?? "")}>
              <option value="">Ohne Kunde</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Format" name="format" optional>
            <Input name="format" list="skript-formate" defaultValue={script.format ?? ""} placeholder="z. B. Kunden-Sketch" />
            <datalist id="skript-formate">
              {FORMATS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>
        </FormGrid>

        <fieldset className="grid gap-3">
          <legend className="mb-2 grid w-full gap-0.5">
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Ablauf</span>
            <span className="text-[13px] text-muted">
              Bauplan: {BAUPLAN.join(", ")}. Der Text im Abschnitt Hook ist der Hook, der im Abschnitt Aufruf der Aufruf am Ende.
            </span>
          </legend>
          <datalist id="bauplan-abschnitte">
            {BAUPLAN.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <ol className="grid gap-3">
            {beats.map((b, i) => (
              <li key={b.key} className="squircle grid gap-2 rounded-[14px] bg-sunken p-3 sm:p-4">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid w-[84px] gap-1">
                    <span className="text-[12px] font-medium text-muted">Zeit</span>
                    <Input
                      value={b.tc}
                      onChange={(e) => update(b.key, { tc: e.target.value })}
                      inputMode="numeric"
                      placeholder="00:00"
                      className="bg-surface tabular-nums"
                      aria-label={`Zeit Schritt ${i + 1}`}
                    />
                  </label>
                  <label className="grid min-w-0 flex-1 gap-1 sm:max-w-64">
                    <span className="text-[12px] font-medium text-muted">Abschnitt</span>
                    <Input
                      value={b.label}
                      onChange={(e) => update(b.key, { label: e.target.value })}
                      list="bauplan-abschnitte"
                      className="bg-surface font-semibold"
                      aria-label={`Abschnitt Schritt ${i + 1}`}
                    />
                  </label>
                  <div className="flex items-center max-sm:order-first max-sm:-mt-1 max-sm:w-full max-sm:justify-between sm:ml-auto">
                    <span className="text-[13px] font-semibold text-muted sm:hidden">Schritt {i + 1}</span>
                    <div className="flex items-center">
                      <button type="button" className={mini} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Schritt ${i + 1} nach oben`}>
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" className={mini} onClick={() => move(i, 1)} disabled={i === beats.length - 1} aria-label={`Schritt ${i + 1} nach unten`}>
                        <ArrowDown className="size-4" />
                      </button>
                      <button type="button" className={mini} onClick={() => remove(b.key)} aria-label={`Schritt ${i + 1} entfernen`}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <label className="grid gap-1">
                  <span className="sr-only">Text Schritt {i + 1}</span>
                  <Textarea
                    value={b.text}
                    onChange={(e) => update(b.key, { text: e.target.value })}
                    placeholder="Was gesagt wird oder im Bild steht"
                    rows={2}
                    className="field-sizing-content min-h-[72px] resize-none bg-surface"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="sr-only">Einstellung Schritt {i + 1}</span>
                  <Textarea
                    value={b.shot}
                    onChange={(e) => update(b.key, { shot: e.target.value })}
                    placeholder="Einstellung, z. B. Halbnah"
                    rows={1}
                    className="field-sizing-content min-h-11 resize-none bg-surface py-[9px] text-[15px] text-ink-2 sm:min-h-10 sm:text-[14px]"
                  />
                </label>
              </li>
            ))}
          </ol>
          {beats.length === 0 && <p className="rounded-[14px] bg-fill-2 px-4 py-6 text-center text-[15px] text-muted">Noch kein Ablauf. Fügt den ersten Schritt hinzu.</p>}
          <div>
            <Button type="button" variant="secondary" onClick={add}>
              <Plus className="size-4" /> Schritt hinzufügen
            </Button>
          </div>
          <input type="hidden" name="beats" value={JSON.stringify(beats.map(({ tc: t, label, text, shot }) => ({ tc: t, label, text, shot })))} />
        </fieldset>

        <Field label="Caption" name="caption" optional hint="Text unter dem Beitrag, gern mit Hashtags">
          <Textarea name="caption" defaultValue={script.caption ?? ""} className="field-sizing-content min-h-24 resize-none" />
        </Field>
      </div>

      <div
        className={cn(
          "squircle material-light sticky bottom-[calc(var(--tabbar-h,54px)+12px)] z-10 -mx-1 flex items-center justify-end gap-3 rounded-2xl px-3 py-2 shadow-[var(--shadow-raised)] lg:bottom-4",
        )}
      >
        <span className={cn("mr-auto pl-2 text-[13px] font-semibold", dirty ? "text-ink-2" : "text-muted")} aria-live="polite">
          {isNew ? "Noch nicht angelegt" : dirty ? "Ungespeicherte Änderungen" : "Alles gespeichert"}
        </span>
        <SubmitButton disabled={!isNew && !dirty}>{isNew ? "Skript anlegen" : "Speichern"}</SubmitButton>
      </div>
      {/* Ziele der Kopf-Aktionen: speichern und zugleich Status setzen oder kopieren */}
      <button type="submit" name="intent" value="final" data-intent="final" hidden tabIndex={-1} aria-hidden />
      <button type="submit" name="intent" value="entwurf" data-intent="entwurf" hidden tabIndex={-1} aria-hidden />
      <button type="submit" name="intent" value="duplizieren" data-intent="duplizieren" hidden tabIndex={-1} aria-hidden />
    </ActionForm>
  );
}
