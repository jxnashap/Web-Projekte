"use client";
// KI-Skriptgenerator: links das Briefing, rechts der Entwurf mit Hook-Auswahl, Verfeinern und Speichern.
import { Info, Minus, Smile, Sparkles, Waves, Wand2 } from "lucide-react";
import { startTransition, useActionState, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { num } from "@/lib/format";
import { generateAction, saveGenerated, type GenState } from "@/lib/skripte/actions";
import { BAUPLAN, FORMATS, LENGTHS, TONES, ZIELE, type ScriptDraft } from "@/lib/skripte/schema";

type ClientOpt = { id: number; name: string; color: string };
type VideoOpt = { id: number; title: string; clientId: number; format: string | null; scriptId: number | null };

// Auswahl-Chips: ausgewählt = roter Akzent (kein schwarz gefüllter Zustand)
const chip =
  "relative inline-flex h-9 cursor-pointer select-none items-center rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-line-2 has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent-ink has-focus-visible:ring-2 has-focus-visible:ring-accent/30";

export function ScriptGenerator({
  clients,
  videos,
  initial,
  live,
  modelName,
}: {
  clients: ClientOpt[];
  videos: VideoOpt[];
  initial: { clientId?: number; videoId?: number; format?: string };
  live: boolean;
  modelName: string;
}) {
  const [clientId, setClientId] = useState<string>(initial.clientId ? String(initial.clientId) : "");
  const [videoId, setVideoId] = useState<string>(initial.videoId ? String(initial.videoId) : "");
  const [draft, setDraft] = useState<ScriptDraft | null>(null);
  const [title, setTitle] = useState("");
  const [hookChoice, setHookChoice] = useState("");
  const [refineText, setRefineText] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [used, setUsed] = useState<{ format: string; briefing: string }>({ format: "", briefing: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Ergebnis direkt in der Aktion übernehmen (kein Effekt nötig)
  const [state, formAction, pending] = useActionState<GenState, FormData>(async (prev, fd) => {
    const r = await generateAction(prev, fd);
    if (r.ok && r.result) {
      setDraft(r.result.draft);
      setTitle(r.result.draft.title);
      setHookChoice(r.result.draft.hook);
      setRefineText("");
      if (r.result.notice) toast.info(r.result.notice);
      // auf dem Handy steht das Ergebnis unter dem Formular: einmal hinscrollen (nicht beim Verfeinern)
      if (!fd.get("refine") && window.matchMedia("(max-width: 1023px)").matches) {
        requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } else if (r.error) {
      toast.error(r.error);
    }
    return r;
  }, {});

  const clientVideos = useMemo(() => videos.filter((v) => !clientId || String(v.clientId) === clientId), [videos, clientId]);
  const selectedVideo = videos.find((v) => String(v.id) === videoId);
  const meta = state.result ?? null;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    fd.delete("refine");
    setUsed({ format: String(fd.get("format") ?? ""), briefing: String(fd.get("briefing") ?? "") });
    if (sub?.name === "refine") {
      const value = sub.value === "frei" ? refineText.trim() : sub.value;
      if (!value) {
        toast.error("Bitte einen Änderungswunsch eingeben.");
        return;
      }
      fd.set("refine", value);
      if (draft) fd.set("previous", JSON.stringify({ ...draft, title, hook: hookChoice || draft.hook }));
      setLastAction(sub.value);
    } else {
      fd.delete("previous");
      setLastAction("neu");
    }
    startTransition(() => formAction(fd));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* Briefing */}
      <Card className="h-fit p-5">
        <form id="gen-form" ref={formRef} onSubmit={submit} noValidate className="grid gap-5">
          <Field label="Kunde" name="clientId" hint="Branche und Ort helfen der KI. Den Namen setzen wir erst danach ein.">
            <Select
              name="clientId"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setVideoId("");
              }}
            >
              <option value="">Ohne Kunde</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Für Video" name="videoId" optional>
            <Select
              name="videoId"
              value={videoId}
              onChange={(e) => {
                setVideoId(e.target.value);
                const v = videos.find((x) => String(x.id) === e.target.value);
                if (v) setClientId(String(v.clientId));
              }}
            >
              <option value="">Kein Video verknüpfen</option>
              {clientVideos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                  {v.scriptId ? " (hat Skript)" : ""}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Format</legend>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <label key={`${f}-${selectedVideo?.id ?? 0}`} className={chip}>
                  <input type="radio" name="format" value={f} defaultChecked={(selectedVideo?.format ?? initial.format ?? "Kunden-Sketch") === f} className="sr-only" />
                  {f}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Ziel des Videos" name="ziel">
            <Select name="ziel" defaultValue={ZIELE[0]}>
              {ZIELE.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Tonalität</legend>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t, i) => (
                <label key={t} className={chip}>
                  <input type="radio" name="ton" value={t} defaultChecked={i === 0} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Länge</legend>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <label key={l} className={chip}>
                  <input type="radio" name="length" value={l} defaultChecked={l === 30} className="sr-only" />
                  {l} Sekunden
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="Briefing"
            name="briefing"
            optional
            hint="Situation, Idee oder Angebot in eigenen Worten. Bitte keine Namen oder anderen Personendaten eingeben."
          >
            <Textarea name="briefing" maxLength={1500} placeholder="z. B. Kunden fragen ständig, ob es nicht auch günstiger geht" />
          </Field>

          <SubmitButton pendingText={live ? "Die KI schreibt …" : "Entwurf entsteht …"} disabled={pending} className="w-full">
            <Sparkles className="size-4" /> {draft ? "Neu schreiben" : "Skript schreiben"}
          </SubmitButton>
          <p className="flex items-start gap-2 text-[12px] text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {live ? (
              <span>
                Schreibt mit {modelName}. An OpenAI gehen nur Branche, Ort, Format, Ziel und Briefing, gespeichert wird dort nichts (store: false).
              </span>
            ) : (
              <span>Demo-Modus: ohne OpenAI-Schlüssel erzeugt ein eingebauter Generator Beispiel-Skripte nach dem SCM-Bauplan.</span>
            )}
          </p>
        </form>
      </Card>

      {/* Entwurf */}
      <div ref={resultRef} className="min-w-0 scroll-mt-20" aria-live="polite">
        {pending && !draft ? (
          <WritingSkeleton live={live} />
        ) : !draft ? (
          <EmptyDraft />
        ) : (
          <Card className={cn("overflow-hidden transition-opacity", pending && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
              <span className="text-[13px] font-semibold text-ink">Entwurf</span>
              {meta?.demo ? <Badge tone="warn">Demo</Badge> : <Badge tone="info">{modelName}</Badge>}
              {meta?.usage && (
                <span className="text-[12px] text-muted">
                  {num(meta.usage.input + meta.usage.output)} Tokens
                  {meta.usage.reasoning > 0 ? `, davon ${num(meta.usage.reasoning)} zum Nachdenken` : ""}
                </span>
              )}
              {pending && <span className="ml-auto text-[12px] font-semibold text-ink-2">{lastAction === "neu" ? "Schreibt neu …" : "Überarbeitet …"}</span>}
            </div>

            <div className="grid gap-6 p-5">
              <Field label="Titel">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-[16px] font-semibold" />
              </Field>

              <fieldset className="grid gap-2">
                <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Hook wählen</legend>
                {[draft.hook, ...draft.hookVariants].map((h, i) => (
                  <label
                    key={`${i}-${h}`}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-2 has-checked:border-accent has-checked:bg-accent-soft/50"
                  >
                    <input
                      type="radio"
                      name="hookChoice"
                      value={h}
                      checked={hookChoice === h}
                      onChange={() => setHookChoice(h)}
                      className="mt-1 size-4 accent-[var(--color-accent)]"
                    />
                    <span className="text-[14px] leading-relaxed text-ink">{h}</span>
                    {i === 0 && <span className="ml-auto shrink-0 text-[12px] text-muted">Vorschlag</span>}
                  </label>
                ))}
              </fieldset>

              <section aria-label="Ablauf" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
                <div className="mb-3 text-[12px] font-medium text-muted">Drehbuch</div>
                <ol className="grid gap-4">
                  {draft.beats.map((b, i) => (
                    <li key={i} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 font-script text-[14px] leading-relaxed">
                      <span className="pt-0.5 text-[12px] font-bold text-accent-ink">{b.tc}</span>
                      <div>
                        <div className="text-[12px] font-bold text-muted">{b.label}</div>
                        <p className="text-ink">{i === 0 && b.label === "Hook" ? hookChoice || b.text : b.text}</p>
                        {b.shot && <p className="mt-0.5 text-[13px] text-muted">({b.shot})</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[12px] font-medium text-muted">Caption</div>
                  <p className="text-[14px] text-ink-2">{draft.caption}</p>
                  <p className="mt-2 text-[13px] text-info">{draft.hashtags.join(" ")}</p>
                </div>
                <div>
                  <div className="mb-1.5 text-[12px] font-medium text-muted">Aufruf</div>
                  <p className="text-[14px] text-ink-2">{draft.cta}</p>
                </div>
              </div>

              {/* Verfeinern: sendet das Briefing-Formular mit Änderungswunsch */}
              <div className="grid gap-3 rounded-xl border border-dashed border-line-2 p-4">
                <div className="text-[13px] font-semibold text-ink-2">Verfeinern</div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" form="gen-form" name="refine" value="kuerzer" variant="secondary" size="sm" disabled={pending}>
                    <Minus className="size-4" /> Kürzer
                  </Button>
                  <Button type="submit" form="gen-form" name="refine" value="lustiger" variant="secondary" size="sm" disabled={pending}>
                    <Smile className="size-4" /> Lustiger
                  </Button>
                  <Button type="submit" form="gen-form" name="refine" value="lokal" variant="secondary" size="sm" disabled={pending}>
                    <Waves className="size-4" /> Mehr lokal
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Eigener Änderungswunsch</span>
                    <Input
                      value={refineText}
                      onChange={(e) => setRefineText(e.target.value)}
                      maxLength={300}
                      placeholder="Eigener Wunsch, z. B. mit Azubi statt Chef"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const btn = document.getElementById("refine-frei") as HTMLButtonElement | null;
                          formRef.current?.requestSubmit(btn ?? undefined);
                        }
                      }}
                    />
                  </label>
                  <Button id="refine-frei" type="submit" form="gen-form" name="refine" value="frei" variant="secondary" disabled={pending}>
                    <Wand2 className="size-4" /> Anwenden
                  </Button>
                </div>
              </div>

              <ActionForm action={saveGenerated} className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <input type="hidden" name="draft" value={JSON.stringify(draft)} />
                <input type="hidden" name="hookChoice" value={hookChoice} />
                <input type="hidden" name="title" value={title} />
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="videoId" value={videoId} />
                <input type="hidden" name="format" value={used.format} />
                <input type="hidden" name="briefing" value={used.briefing} />
                <input type="hidden" name="source" value={meta?.demo ? "demo" : "ki"} />
                <input type="hidden" name="model" value={meta?.model ?? ""} />
                <p className="text-[12px] text-muted">
                  {selectedVideo ? <>Wird mit „{selectedVideo.title}“ verknüpft. </> : null}
                  Danach könnt ihr alles im Editor anpassen.
                </p>
                <SubmitButton pendingText="Speichert …" disabled={pending}>
                  Skript speichern
                </SubmitButton>
              </ActionForm>
            </div>
          </Card>
        )}
        {state.error && !pending && (
          <p role="alert" className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-[13px] font-medium text-accent-ink">
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyDraft() {
  return (
    <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-line-2 bg-surface/60 p-8 text-center">
      <div className="max-w-sm">
        <p className="font-semibold text-ink">Hier erscheint euer Entwurf</p>
        <p className="mt-1 text-[14px] text-muted">Jedes Skript folgt dem SCM-Bauplan:</p>
        <ol className="mt-4 grid gap-1.5 text-left text-[14px] text-ink-2">
          {BAUPLAN.map((b, i) => (
            <li key={b} className="flex gap-3">
              <span className="text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
              {b}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function WritingSkeleton({ live }: { live: boolean }) {
  return (
    <Card className="grid gap-4 p-5" aria-busy="true">
      <p className="text-[13px] font-semibold text-ink-2">{live ? "Die KI schreibt euer Skript …" : "Der Entwurf entsteht …"}</p>
      <Skeleton className="h-10" />
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </Card>
  );
}
