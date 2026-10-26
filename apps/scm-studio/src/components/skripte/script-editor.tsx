"use client";
// Skript-Editor: Kopf, Hook, Ablauf (Beats) mit Timecode, Abschnitt, Text und Einstellung, Caption und Aufruf.
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action";
import { BAUPLAN, FORMATS } from "@/lib/skripte/schema";

type Beat = { key: number; tc: string; label: string; text: string; shot: string };
type ScriptData = {
  title: string;
  format: string | null;
  hook: string | null;
  beats: { tc: string; label: string; text: string; shot?: string }[];
  caption: string | null;
  cta: string | null;
  status: string;
  clientId: number | null;
};

const toSec = (tc: string) => {
  const [m, s] = tc.split(":").map(Number);
  return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : 0;
};
const toTc = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
const mini = "grid size-8 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink disabled:opacity-30";

export function ScriptEditor({
  action,
  script,
  clients,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  script: ScriptData;
  clients: { id: number; name: string }[];
}) {
  const [beats, setBeats] = useState<Beat[]>(() => script.beats.map((b, i) => ({ key: i + 1, tc: b.tc, label: b.label, text: b.text, shot: b.shot ?? "" })));
  const keyRef = useRef(script.beats.length + 1);
  const [dirty, setDirty] = useState(false);

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
      const tc = last ? toTc(toSec(last.tc) + 4) : "00:00";
      const label = BAUPLAN[Math.min(bs.length, BAUPLAN.length - 1)];
      return [...bs, { key, tc, label, text: "", shot: "" }];
    });
    setDirty(true);
  };

  return (
    <ActionForm action={action} onSuccess={() => setDirty(false)} className="grid gap-6">
      <div onInput={() => setDirty(true)} className="grid gap-6">
        <FormGrid>
          <Field label="Titel" name="title" className="sm:col-span-2">
            <Input name="title" defaultValue={script.title} required className="text-[16px] font-semibold" />
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
            <Input name="format" list="skript-formate" defaultValue={script.format ?? ""} />
            <datalist id="skript-formate">
              {FORMATS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>
          <Field label="Status" name="status">
            <Select name="status" defaultValue={script.status}>
              <option value="entwurf">Entwurf</option>
              <option value="final">Final</option>
            </Select>
          </Field>
          <Field label="Hook" name="hook" className="sm:col-span-2" hint="Der erste Satz oder Text im Bild. Entscheidet in zwei Sekunden, ob jemand bleibt.">
            <Textarea name="hook" defaultValue={script.hook ?? ""} className="min-h-16" />
          </Field>
        </FormGrid>

        <fieldset className="grid gap-3">
          <legend className="mb-2 flex w-full items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold text-ink">Ablauf</span>
            <span className="text-[12px] text-muted">Bauplan: {BAUPLAN.join(", ")}</span>
          </legend>
          <datalist id="bauplan-abschnitte">
            {BAUPLAN.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <ol className="grid gap-3">
            {beats.map((b, i) => (
              <li key={b.key} className="rounded-xl bg-sunken/60 p-3 sm:p-4">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid w-20 gap-1">
                    <span className="text-[12px] font-medium text-muted">Zeit</span>
                    <Input
                      value={b.tc}
                      onChange={(e) => update(b.key, { tc: e.target.value })}
                      pattern="\d{2}:\d{2}"
                      placeholder="00:00"
                      className="tabular-nums"
                      aria-label={`Timecode Beat ${i + 1}`}
                    />
                  </label>
                  <label className="grid min-w-0 flex-1 gap-1 sm:max-w-56">
                    <span className="text-[12px] font-medium text-muted">Abschnitt</span>
                    <Input
                      value={b.label}
                      onChange={(e) => update(b.key, { label: e.target.value })}
                      list="bauplan-abschnitte"
                      className="font-semibold"
                      aria-label={`Abschnitt Beat ${i + 1}`}
                    />
                  </label>
                  <div className="ml-auto flex items-center">
                    <button type="button" className={mini} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Beat ${i + 1} nach oben`}>
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" className={mini} onClick={() => move(i, 1)} disabled={i === beats.length - 1} aria-label={`Beat ${i + 1} nach unten`}>
                      <ArrowDown className="size-4" />
                    </button>
                    <button type="button" className={mini} onClick={() => remove(b.key)} aria-label={`Beat ${i + 1} entfernen`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <label className="mt-2 grid gap-1">
                  <span className="sr-only">Text Beat {i + 1}</span>
                  <Textarea
                    value={b.text}
                    onChange={(e) => update(b.key, { text: e.target.value })}
                    placeholder="Was gesagt wird oder im Bild steht"
                    className="min-h-16"
                  />
                </label>
                <label className="mt-2 grid gap-1">
                  <span className="sr-only">Einstellung Beat {i + 1}</span>
                  <Input
                    value={b.shot}
                    onChange={(e) => update(b.key, { shot: e.target.value })}
                    placeholder="Einstellung, z. B. Halbnah, Gegenschuss"
                   
                  />
                </label>
              </li>
            ))}
          </ol>
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={add}>
              <Plus className="size-4" /> Beat hinzufügen
            </Button>
          </div>
          <input type="hidden" name="beats" value={JSON.stringify(beats.map(({ tc, label, text, shot }) => ({ tc, label, text, shot })))} />
        </fieldset>

        <FormGrid>
          <Field label="Caption" name="caption" optional className="sm:col-span-2">
            <Textarea name="caption" defaultValue={script.caption ?? ""} />
          </Field>
          <Field label="Aufruf am Ende" name="cta" optional className="sm:col-span-2">
            <Input name="cta" defaultValue={script.cta ?? ""} />
          </Field>
        </FormGrid>
      </div>

      <div className="sticky bottom-20 z-10 -mx-1 flex items-center justify-end gap-3 rounded-2xl border border-line bg-surface/95 px-3 py-2 backdrop-blur lg:bottom-4">
        <span className="mr-auto pl-2 text-[12px] font-semibold text-muted" aria-live="polite">
          {dirty ? "Ungespeicherte Änderungen" : "Alles gespeichert"}
        </span>
        <SubmitButton>Speichern</SubmitButton>
      </div>
    </ActionForm>
  );
}
