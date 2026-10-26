"use client";
// KI-Skriptgenerator: links das Briefing, rechts der Entwurf mit Hook-Auswahl, Verfeinern und Speichern.
// Beim Verfeinern bleiben selbst gewählter Hook und geänderter Titel erhalten.
import { Check, Info, Minus, Smile, Sparkles, Waves, Wand2 } from "lucide-react";
import { useId, useMemo, useRef, useState, useTransition } from "react";
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
import { BAUPLAN, FORMATS, LENGTHS, TONES, ZIELE, type GenResult, type ScriptDraft } from "@/lib/skripte/schema";
import { useLeaveGuard } from "./use-leave-guard";

type ClientOpt = { id: number; name: string; color: string };
type VideoOpt = { id: number; title: string; clientId: number; format: string | null; scriptId: number | null };
type GenError = { message?: string; fieldErrors?: GenState["fieldErrors"]; where: "neu" | "refine" };

// Auswahl als gefüllte Kapseln: gewählt = dunkel (Rot bleibt dem Speichern vorbehalten)
const chip =
  "relative inline-flex h-11 cursor-pointer select-none items-center rounded-full bg-fill px-4 text-[14px] font-medium text-ink transition-colors hover:bg-[rgb(120_120_128/0.18)] has-checked:bg-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink sm:h-9 sm:px-3.5 sm:text-[13px]";
const legend = "mb-1.5 text-[13px] font-medium text-ink-2";
const errorText = "mt-1.5 text-[13px] font-medium text-accent-ink";

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
  const [format, setFormat] = useState<string>(initial.format?.trim() || "Kunden-Sketch");
  const [ton, setTon] = useState<string>(TONES[0]);
  const [length, setLength] = useState<number>(30);
  const [result, setResult] = useState<GenResult | null>(null);
  const [suggested, setSuggested] = useState("");
  const [title, setTitle] = useState("");
  const [hookChoice, setHookChoice] = useState("");
  const [touched, setTouched] = useState({ title: false, hook: false });
  const [refineText, setRefineText] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [error, setError] = useState<GenError | null>(null);
  const [saved, setSaved] = useState(false);
  const [used, setUsed] = useState<{ format: string; briefing: string }>({ format: "", briefing: "" });
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const ids = { form: useId(), free: useId(), format: useId(), ton: useId(), length: useId(), neu: useId(), refine: useId() };

  const draft = result?.draft ?? null;
  useLeaveGuard(Boolean(draft) && !saved, {
    title: "Entwurf verwerfen?",
    message: "Der Entwurf ist noch nicht gespeichert. Wenn ihr die Seite verlasst, ist er weg.",
  });

  const clientVideos = useMemo(() => videos.filter((v) => !clientId || String(v.clientId) === clientId), [videos, clientId]);
  const selectedVideo = videos.find((v) => String(v.id) === videoId);
  // Format des Videos, das nicht in der Liste steht (z. B. „Sketch“), als eigene, gewählte Kapsel anbieten
  const formatOptions: string[] = format && !(FORMATS as readonly string[]).includes(format) ? [...FORMATS, format] : [...FORMATS];
  const fe = error?.fieldErrors ?? {};

  const run = (fd: FormData, refine: string | null) => {
    setError(null);
    start(async () => {
      let r: GenState;
      try {
        r = await generateAction({}, fd);
      } catch {
        r = { ok: false, error: "Das hat nicht geklappt. Bitte noch einmal versuchen." };
      }
      if (r.ok && r.result) {
        let d = r.result.draft;
        // Verfeinern: selbst gewählten Hook und Titel behalten
        const keepHook = refine && touched.hook ? hookChoice : null;
        if (keepHook) {
          const all = [d.hook, ...d.hookVariants];
          d = { ...d, hook: keepHook, hookVariants: all.filter((h) => h !== keepHook).slice(0, 3) };
        }
        setResult({ ...r.result, draft: d });
        setSuggested(keepHook ? suggested : r.result.draft.hook);
        setHookChoice(d.hook);
        if (!(refine && touched.title)) setTitle(d.title);
        if (!refine) setTouched({ title: false, hook: false });
        setSaved(false);
        setRefineText("");
        if (refine === "kuerzer" && !r.result.notice) setLength((l) => (l > 30 ? 30 : 15));
        if (r.result.notice) toast.info(r.result.notice);
        else if (refine) toast.success("Entwurf überarbeitet.");
        // auf dem Handy steht das Ergebnis unter dem Formular: einmal hinscrollen (nicht beim Verfeinern)
        if (!refine && window.matchMedia("(max-width: 1023px)").matches) {
          requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
      } else {
        setError({ message: r.error ?? "Bitte die markierten Felder prüfen.", fieldErrors: r.fieldErrors, where: refine ? "refine" : "neu" });
        const first = ["format", "ziel", "ton", "length"].find((k) => r.fieldErrors?.[k]?.length);
        if (first) {
          requestAnimationFrame(() => {
            const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
            el?.focus({ preventScroll: true });
            el?.closest("fieldset, label")?.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }
      }
    });
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    fd.delete("refine");
    setUsed({ format: String(fd.get("format") ?? ""), briefing: String(fd.get("briefing") ?? "") });
    if (sub?.name === "refine" && draft) {
      const value = sub.value === "frei" ? refineText.trim() : sub.value;
      if (!value) return;
      const hook = hookChoice || draft.hook;
      fd.set("refine", value);
      fd.set(
        "previous",
        JSON.stringify({ ...draft, title, hook, hookVariants: [draft.hook, ...draft.hookVariants].filter((h) => h !== hook).slice(0, 3) } satisfies ScriptDraft),
      );
      setLastAction(sub.value);
      run(fd, value);
    } else {
      fd.delete("previous");
      setLastAction("neu");
      run(fd, null);
    }
  };

  const generalError = (where: GenError["where"]) =>
    error?.where === where && error.message && !pending ? (
      <p id={where === "neu" ? ids.neu : ids.refine} role="alert" className="rounded-[10px] bg-accent-soft px-3 py-2 text-[14px] font-medium text-accent-ink">
        {error.message}
      </p>
    ) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* Briefing */}
      <Card className="h-fit p-5">
        <form id={ids.form} ref={formRef} onSubmit={submit} noValidate className="grid gap-5" aria-busy={pending}>
          <Field label="Kunde" hint="Branche und Ort helfen der KI. Den Namen setzen wir erst danach ein.">
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
          <Field label="Für Video" optional>
            <Select
              name="videoId"
              value={videoId}
              onChange={(e) => {
                setVideoId(e.target.value);
                const v = videos.find((x) => String(x.id) === e.target.value);
                if (v) {
                  setClientId(String(v.clientId));
                  if (v.format?.trim()) setFormat(v.format.trim());
                }
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

          <fieldset aria-describedby={fe.format ? ids.format : undefined}>
            <legend className={legend}>Format</legend>
            <div className="flex flex-wrap gap-2">
              {formatOptions.map((f) => (
                <label key={f} className={chip}>
                  <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                  {f}
                </label>
              ))}
            </div>
            {fe.format && (
              <p id={ids.format} className={errorText}>
                {fe.format[0]}
              </p>
            )}
          </fieldset>

          <Field label="Ziel des Videos" error={fe.ziel?.[0]}>
            <Select name="ziel" defaultValue={ZIELE[0]}>
              {ZIELE.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </Field>

          <RadioSegmented
            name="ton"
            legend="Tonalität"
            value={ton}
            onChange={setTon}
            options={TONES.map((t) => ({ value: t, label: t }))}
            error={fe.ton?.[0]}
            errorId={ids.ton}
          />
          <RadioSegmented
            name="length"
            legend="Länge"
            value={String(length)}
            onChange={(v) => setLength(Number(v))}
            options={LENGTHS.map((l) => ({ value: String(l), label: `${l} Sekunden` }))}
            error={fe.length?.[0]}
            errorId={ids.length}
          />

          <Field
            label="Briefing"
            optional
            error={fe.briefing?.[0]}
            hint="Situation, Idee oder Angebot in eigenen Worten. Bitte keine Namen oder anderen Personendaten eingeben."
          >
            <Textarea name="briefing" maxLength={1500} placeholder="z. B. Kunden fragen ständig, ob es nicht auch günstiger geht" />
          </Field>

          <div className="grid gap-3">
            <Button
              type="submit"
              variant={draft ? "secondary" : "primary"}
              disabled={pending}
              aria-busy={pending && lastAction === "neu"}
              aria-describedby={error?.where === "neu" ? ids.neu : undefined}
              className="w-full"
            >
              <Sparkles className="size-4" />
              {pending && lastAction === "neu" ? (live ? "Die KI schreibt …" : "Entwurf entsteht …") : draft ? "Neu schreiben" : "Skript schreiben"}
            </Button>
            {generalError("neu")}
          </div>
          <p className="flex items-start gap-2 text-[13px] text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {live ? (
              <span>
                Schreibt mit {modelName}. An OpenAI gehen nur Branche, Ort, Format, Ziel und Briefing. Dort wird nichts gespeichert.
              </span>
            ) : (
              <span>Demo-Modus: Ohne OpenAI-Schlüssel schreibt ein eingebauter Generator Beispiel-Skripte nach dem SCM-Bauplan.</span>
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
          <Card className={cn("overflow-hidden transition-opacity", pending && "opacity-60")} aria-busy={pending}>
            <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-3">
              <span className="text-[15px] font-semibold text-ink">Entwurf</span>
              {result?.demo ? <Badge tone="warn">Demo</Badge> : <Badge tone="info">{modelName}</Badge>}
              {result?.usage && (
                <span className="text-[13px] text-muted">
                  {num(result.usage.input + result.usage.output)} Tokens
                  {result.usage.reasoning > 0 ? `, davon ${num(result.usage.reasoning)} zum Nachdenken` : ""}
                </span>
              )}
              {pending && <span className="ml-auto text-[13px] font-semibold text-ink-2">{lastAction === "neu" ? "Schreibt neu …" : "Überarbeitet …"}</span>}
            </div>

            <div className="grid gap-6 p-5">
              <Field label="Titel">
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTouched((t) => ({ ...t, title: true }));
                  }}
                  className="text-[16px] font-semibold"
                />
              </Field>

              <fieldset>
                <legend className={legend}>Hook wählen</legend>
                <div className="squircle overflow-hidden rounded-[14px] bg-sunken">
                  {[draft.hook, ...draft.hookVariants].map((h, i) => (
                    <label
                      key={`${i}-${h}`}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-fill-2 has-focus-visible:bg-fill-2 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink",
                        i > 0 && "border-t border-hairline",
                      )}
                    >
                      <input
                        type="radio"
                        name="hookChoice"
                        value={h}
                        checked={hookChoice === h}
                        onChange={() => {
                          setHookChoice(h);
                          setTouched((t) => ({ ...t, hook: true }));
                        }}
                        className="sr-only"
                      />
                      <span className={cn("min-w-0 flex-1 text-[15px] leading-snug text-ink", hookChoice === h && "font-semibold")}>
                        {h}
                        {h === suggested && <span className="ml-2 whitespace-nowrap text-[13px] font-normal text-muted">Vorschlag</span>}
                      </span>
                      <Check className={cn("size-5 shrink-0 text-ink transition-opacity", hookChoice === h ? "opacity-100" : "opacity-0")} strokeWidth={2.4} aria-hidden />
                    </label>
                  ))}
                </div>
              </fieldset>

              <section aria-label="Ablauf" className="squircle rounded-[14px] bg-sunken p-4 sm:p-5">
                <div className="mb-3 text-[13px] font-medium text-muted">Drehbuch</div>
                <ol className="grid gap-4">
                  {draft.beats.map((b, i) => (
                    <li key={i} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 font-script text-[15px] leading-relaxed">
                      <span className="pt-0.5 text-[13px] font-bold tabular-nums text-accent-ink">{b.tc}</span>
                      <div>
                        <div className="text-[13px] font-bold text-muted">{b.label}</div>
                        <p className="text-ink">{i === 0 && b.label === "Hook" ? hookChoice || b.text : b.text}</p>
                        {b.shot && <p className="mt-0.5 text-[14px] text-muted">({b.shot})</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <div>
                <div className="mb-1.5 text-[13px] font-medium text-muted">Caption</div>
                <p className="text-[15px] text-ink-2">{draft.caption}</p>
                <p className="mt-2 text-[14px] text-info">{draft.hashtags.join(" ")}</p>
              </div>

              {/* Verfeinern: sendet das Briefing-Formular mit Änderungswunsch */}
              <div className="squircle grid gap-3 rounded-[14px] bg-sunken p-4">
                <div className="text-[15px] font-semibold text-ink">Verfeinern</div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" form={ids.form} name="refine" value="kuerzer" variant="secondary" disabled={pending} className="bg-surface hover:bg-surface/70">
                    <Minus className="size-4" /> Kürzer
                  </Button>
                  <Button type="submit" form={ids.form} name="refine" value="lustiger" variant="secondary" disabled={pending} className="bg-surface hover:bg-surface/70">
                    <Smile className="size-4" /> Lustiger
                  </Button>
                  <Button type="submit" form={ids.form} name="refine" value="lokal" variant="secondary" disabled={pending} className="bg-surface hover:bg-surface/70">
                    <Waves className="size-4" /> Mehr lokal
                  </Button>
                </div>
                <div className="grid gap-1.5">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Eigener Änderungswunsch</span>
                      <Input
                        value={refineText}
                        onChange={(e) => setRefineText(e.target.value)}
                        maxLength={300}
                        disabled={!live}
                        aria-describedby={!live ? `${ids.refine}-demo` : undefined}
                        placeholder="Eigener Wunsch, z. B. mit Azubi statt Chef"
                        className="bg-surface hover:bg-surface"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const btn = document.getElementById(ids.free) as HTMLButtonElement | null;
                            if (btn && !btn.disabled) formRef.current?.requestSubmit(btn);
                          }
                        }}
                      />
                    </label>
                    <Button
                      id={ids.free}
                      type="submit"
                      form={ids.form}
                      name="refine"
                      value="frei"
                      variant="secondary"
                      disabled={pending || !live || !refineText.trim()}
                      className="bg-surface hover:bg-surface/70"
                    >
                      <Wand2 className="size-4" /> Anwenden
                    </Button>
                  </div>
                  {!live && (
                    <p id={`${ids.refine}-demo`} className="text-[13px] text-muted">
                      Eigene Wünsche setzt erst die KI mit OpenAI-Schlüssel um. Im Demo-Modus wirken die drei Knöpfe.
                    </p>
                  )}
                </div>
                {generalError("refine")}
              </div>

              <ActionForm
                action={saveGenerated}
                onSuccess={() => setSaved(true)}
                className="flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <input type="hidden" name="draft" value={JSON.stringify(draft)} />
                <input type="hidden" name="hookChoice" value={hookChoice} />
                <input type="hidden" name="title" value={title} />
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="videoId" value={videoId} />
                <input type="hidden" name="format" value={used.format} />
                <input type="hidden" name="briefing" value={used.briefing} />
                <input type="hidden" name="source" value={result?.demo ? "demo" : "ki"} />
                <input type="hidden" name="model" value={result?.model ?? ""} />
                <p className="text-[13px] text-muted">
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
      </div>
    </div>
  );
}

/** Auswahl aus wenigen Werten im Stil des iOS-Segmented-Control (echte Radios, Pfeiltasten funktionieren). */
function RadioSegmented({
  name,
  legend: title,
  value,
  onChange,
  options,
  error,
  errorId,
}: {
  name: string;
  legend: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  errorId: string;
}) {
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className={legend}>{title}</legend>
      <div className="flex rounded-[10px] bg-fill p-[2px]">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex h-11 min-w-0 flex-1 cursor-pointer select-none items-center justify-center rounded-[8px] px-1 text-center text-[14px] font-medium leading-tight text-ink transition-[background-color,box-shadow] has-checked:bg-surface has-checked:font-semibold has-checked:shadow-[var(--shadow-thumb)] has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink sm:h-8 sm:text-[13px]"
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className={errorText}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

function EmptyDraft() {
  return (
    <div className="squircle grid min-h-96 place-items-center rounded-[var(--radius-card)] bg-fill-2 p-8 text-center">
      <div className="max-w-sm">
        <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Hier erscheint euer Entwurf</p>
        <p className="mt-1 text-[15px] text-muted">Jedes Skript folgt dem SCM-Bauplan:</p>
        <ol className="mt-4 grid gap-1.5 text-left text-[15px] text-ink-2">
          {BAUPLAN.map((b, i) => (
            <li key={b} className="flex gap-3">
              <span className="w-5 font-semibold tabular-nums text-muted">{i + 1}</span>
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
      <p className="text-[15px] font-semibold text-ink-2">{live ? "Die KI schreibt euer Skript …" : "Der Entwurf entsteht …"}</p>
      <Skeleton className="h-10" />
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </Card>
  );
}
