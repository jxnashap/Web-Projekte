"use client";
// SCM Creative Engine: 1. Briefing (Kunde, Thema, Kategorien, Rahmen), 2. fünf grundverschiedene, bewertete Konzepte,
// 3. drehfertiges Skript zum gewählten Konzept mit Szenen, Schnitt, Drehaufwand und Alternativen.
// „Komplett neue Grundideen“ schickt alle bisher gezeigten Konzepte als Ausschluss mit.
import { ArrowLeft, Bookmark, Check, Clapperboard, Clock, MapPin, RefreshCw, Sparkles, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaveGuard } from "@/components/ui/use-leave-guard";
import { cn } from "@/lib/cn";
import { conceptsAction, planAction, saveConceptAsIdea, saveEngineScript } from "@/lib/skripte/engine/actions";
import {
  CATEGORIES,
  categoryLabel,
  GOALS,
  LENGTHS,
  mmss,
  REFINEMENTS,
  TONES,
  type Briefing,
  type CategoryKey,
  type Concept,
  type ConceptInput,
  type ScriptPlan,
} from "@/lib/skripte/engine/shared";

type ClientOpt = { id: number; name: string; profile: number };
type VideoOpt = { id: number; title: string; clientId: number; scriptId: number | null };
type Initial = {
  clientId?: number;
  videoId?: number;
  ideaId?: number;
  topic?: string;
  categories?: CategoryKey[];
  goal?: string;
  concept?: ConceptInput & { scores?: Concept["scores"] };
};
type Errors = Record<string, string[] | undefined>;

const chip =
  "relative inline-flex h-11 cursor-pointer select-none items-center rounded-full bg-fill px-4 text-[14px] font-medium text-ink transition-colors hover:bg-[rgb(120_120_128/0.18)] has-checked:bg-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink sm:h-9 sm:px-3.5 sm:text-[13px]";
const legend = "mb-1.5 text-[13px] font-medium text-ink-2";
const errorText = "mt-1.5 text-[13px] font-medium text-accent-ink";
const PROFILE_TOTAL = 8;

export function CreativeEngine({
  clients,
  videos,
  initial,
  live,
  modelName,
}: {
  clients: ClientOpt[];
  videos: VideoOpt[];
  initial: Initial;
  live: boolean;
  modelName: string;
}) {
  const router = useRouter();
  const catsErrorId = useId();
  const [clientId, setClientId] = useState(initial.clientId ? String(initial.clientId) : "");
  const [videoId, setVideoId] = useState(initial.videoId ? String(initial.videoId) : "");
  const [topic, setTopic] = useState(initial.topic ?? "");
  const [cats, setCats] = useState<CategoryKey[]>(initial.categories?.length ? initial.categories : ["comedy"]);
  const [goal, setGoal] = useState(initial.goal ?? GOALS[0]);
  const [tone, setTone] = useState<string>(TONES[0]);
  const [length, setLength] = useState(30);
  const [people, setPeople] = useState(2);
  const [frame, setFrame] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [shown, setShown] = useState<string[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [chosen, setChosen] = useState<(ConceptInput & { scores?: Concept["scores"] }) | null>(initial.concept ?? null);
  const [plan, setPlan] = useState<ScriptPlan | null>(null);
  const [meta, setMeta] = useState<{ demo: boolean; model: string }>({ demo: !live, model: "" });
  const [title, setTitle] = useState("");
  const [hookChoice, setHookChoice] = useState("");
  const [refineText, setRefineText] = useState("");
  const [busy, setBusy] = useState<null | "ideen" | "skript" | "verfeinern" | "speichern">(null);
  const [, start] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  useLeaveGuard(Boolean(plan) && busy !== "speichern", { title: "Skript verwerfen?", message: "Das Skript ist noch nicht gespeichert. Wenn ihr die Seite verlasst, ist es weg." });

  const client = clients.find((c) => String(c.id) === clientId);
  const clientVideos = useMemo(() => videos.filter((v) => !clientId || String(v.clientId) === clientId), [videos, clientId]);
  const briefing = (): Briefing => ({
    clientId: Number(clientId) || undefined,
    videoId: Number(videoId) || undefined,
    ideaId: initial.ideaId,
    topic: topic.trim() || undefined,
    categories: cats,
    goal,
    tone,
    length,
    people,
    frame: frame.trim() || undefined,
  });

  const scrollToResult = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const develop = (fresh: boolean) => {
    setErrors({});
    setBusy("ideen");
    start(async () => {
      const exclude = fresh ? shown : [];
      const r = await conceptsAction(briefing(), exclude).catch(() => ({ ok: false as const, error: "Das hat nicht geklappt. Bitte noch einmal versuchen." }));
      setBusy(null);
      if (!r.ok) {
        if ("fieldErrors" in r && r.fieldErrors) setErrors(r.fieldErrors);
        toast.error(r.error);
        return;
      }
      setConcepts(r.concepts);
      setShown((s) => [...new Set([...(fresh ? s : []), ...r.concepts.map((c) => `${c.title}: ${c.mechanic}`)])].slice(-40));
      setSaved({});
      setPlan(null);
      setChosen(null);
      setMeta({ demo: r.demo, model: r.model });
      scrollToResult();
    });
  };

  const writeScript = (c: ConceptInput & { scores?: Concept["scores"] }, refine?: string) => {
    setErrors({});
    setBusy(refine ? "verfeinern" : "skript");
    start(async () => {
      const keepHook = refine ? hookChoice : "";
      const keepTitle = refine ? title : "";
      const r = await planAction(briefing(), c, refine ? plan : undefined, refine).catch(() => ({ ok: false as const, error: "Das hat nicht geklappt. Bitte noch einmal versuchen." }));
      setBusy(null);
      if (!r.ok) {
        if ("fieldErrors" in r && r.fieldErrors) setErrors(r.fieldErrors);
        toast.error(r.error);
        return;
      }
      setChosen(c);
      setPlan(r.plan);
      setMeta({ demo: r.demo, model: r.model });
      setTitle(keepTitle || r.plan.title);
      setHookChoice(keepHook || r.plan.hook);
      setRefineText("");
      if (refine) toast.success("Skript überarbeitet.");
      scrollToResult();
    });
  };

  const remember = (c: Concept) => {
    start(async () => {
      const r = await saveConceptAsIdea(briefing(), c);
      if (r.ok) {
        setSaved((s) => ({ ...s, [c.title]: true }));
        toast.success(r.message);
      } else toast.error(r.error ?? "Nicht gespeichert.");
    });
  };

  const save = () => {
    if (!plan || !chosen) return;
    setBusy("speichern");
    start(async () => {
      const r = await saveEngineScript(briefing(), chosen, plan, { title: title.trim() || plan.title, hookChoice, model: meta.model, demo: meta.demo });
      if (r.ok && r.redirectTo) {
        toast.success(r.message);
        router.push(r.redirectTo);
        return;
      }
      setBusy(null);
      toast.error(r.error ?? "Nicht gespeichert.");
    });
  };

  const toggleCat = (k: CategoryKey) =>
    setCats((c) => (c.includes(k) ? (c.length > 1 ? c.filter((x) => x !== k) : c) : c.length >= 3 ? c : [...c, k]));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* 1. Briefing */}
      <Card className="grid gap-5 p-5 lg:sticky lg:top-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Briefing</h2>
          {live ? <Badge tone="ok">{modelName}</Badge> : <Badge tone="warn">Demo-Modus</Badge>}
        </div>

        <Field label="Kunde" optional>
          <Select
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
        {client && (
          <p className="-mt-3 text-[13px] text-muted">
            {client.profile > 0 ? `Kreativprofil: ${client.profile} von ${PROFILE_TOTAL} Feldern. ` : "Noch kein Kreativprofil. "}
            <Link href={`/kunden/${client.id}?reiter=profil`} className="font-semibold text-accent-ink hover:underline">
              {client.profile > 0 ? "Ansehen" : "Ausfüllen"}
            </Link>
          </p>
        )}
        {clientVideos.length > 0 && (
          <Field label="Für Video" optional>
            <Select value={videoId} onChange={(e) => setVideoId(e.target.value)}>
              <option value="">Kein Video verknüpfen</option>
              {clientVideos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                  {v.scriptId ? " (hat Skript)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Thema" optional hint="Anlass, Produkt, Situation oder Angebot. Keine Namen oder Personendaten.">
          <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={1500} rows={3} placeholder="z. B. Neue Mittagskarte, Studenten sollen mittags kommen" />
        </Field>

        <fieldset aria-describedby={errors.categories ? catsErrorId : undefined}>
          <legend className={legend}>Kategorien (bis zu drei, kombinierbar)</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c.key} className={chip} title={c.hint}>
                <input type="checkbox" checked={cats.includes(c.key)} onChange={() => toggleCat(c.key)} className="sr-only" />
                {c.short}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[13px] text-muted">{cats.map((k) => CATEGORIES.find((c) => c.key === k)?.hint).join(" · ")}</p>
          {errors.categories && (
            <p id={catsErrorId} className={errorText}>
              {errors.categories[0]}
            </p>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ziel">
            <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
              {GOALS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tonalität">
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              {TONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Länge">
            <Select value={length} onChange={(e) => setLength(Number(e.target.value))}>
              {LENGTHS.map((l) => (
                <option key={l} value={l}>
                  {l} Sekunden
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Personen">
            <Select value={people} onChange={(e) => setPeople(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n === 4 ? "4 oder mehr" : `höchstens ${n}`}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Rahmen" optional hint="Drehort, Requisiten, Zeit, was nicht geht">
          <Textarea value={frame} onChange={(e) => setFrame(e.target.value)} maxLength={800} rows={2} placeholder="z. B. nur im Gastraum, Dreh vor 11 Uhr, Chef spielt mit" />
        </Field>

        <div className="grid gap-2">
          <Button type="button" onClick={() => develop(false)} disabled={busy !== null} aria-busy={busy === "ideen"} className="w-full">
            <Sparkles className="size-4" /> {concepts.length ? "Neu entwickeln" : "5 Ideen entwickeln"}
          </Button>
          {initial.concept && !plan && (
            <Button type="button" variant="secondary" onClick={() => writeScript(initial.concept!)} disabled={busy !== null} className="w-full" title={`Skript zur Idee „${initial.concept.title}“`}>
              <Wand2 className="size-4" /> Direkt Skript zur Idee
            </Button>
          )}
          {!live && <p className="text-[13px] text-muted">Ohne OpenAI-Schlüssel kommen Beispielinhalte. Mit Schlüssel arbeitet die KI mit Kreativprofil, Kunden-Gedächtnis und Zahlen.</p>}
        </div>
      </Card>

      {/* 2. und 3. Ergebnis */}
      <div ref={resultRef} className="grid min-w-0 scroll-mt-4 gap-4">
        {busy === "ideen" || busy === "skript" ? (
          <Working what={busy} />
        ) : plan && chosen ? (
          <ScriptResult
            plan={plan}
            chosen={chosen}
            demo={meta.demo}
            title={title}
            setTitle={setTitle}
            hookChoice={hookChoice}
            setHookChoice={setHookChoice}
            refineText={refineText}
            setRefineText={setRefineText}
            busy={busy}
            onRefine={(k) => writeScript(chosen, k)}
            onBack={concepts.length ? () => setPlan(null) : undefined}
            onSave={save}
            live={live}
          />
        ) : concepts.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Fünf Ideen</h2>
                <p className="text-[14px] text-muted">Wählt eine aus, die KI arbeitet das Skript aus. Keine dabei? Dann komplett neu.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => develop(true)} disabled={busy !== null}>
                <RefreshCw className="size-4" /> Komplett neue Grundideen
              </Button>
            </div>
            <ul className="grid gap-4 xl:grid-cols-2">
              {concepts.map((c) => (
                <li key={c.title}>
                  <ConceptCard c={c} saved={Boolean(saved[c.title])} busy={busy !== null} onPick={() => writeScript(c)} onRemember={() => remember(c)} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyResult />
        )}
      </div>
    </div>
  );
}

function Working({ what }: { what: "ideen" | "skript" }) {
  return (
    <Card className="grid gap-4 p-5" aria-live="polite" aria-busy>
      <p className="text-[15px] font-semibold text-ink">{what === "ideen" ? "Die KI entwickelt fünf grundverschiedene Ideen …" : "Die KI schreibt das Skript mit Szenen, Kamera und Schnitt …"}</p>
      <p className="text-[13px] text-muted">Das dauert meist 20 bis 60 Sekunden.</p>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </Card>
  );
}

function EmptyResult() {
  return (
    <Card className="grid gap-3 p-6 text-[15px] text-ink-2">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">So arbeitet die Creative Engine</h2>
      <ol className="grid gap-2">
        <li>
          <span className="font-semibold text-ink">1. Briefing:</span> Kunde, Thema, Kategorien und Rahmen. Die KI kennt das Kreativprofil, was schon gedreht oder verworfen wurde und was gut lief.
        </li>
        <li>
          <span className="font-semibold text-ink">2. Fünf Ideen:</span> grundverschieden, mit Hook, Handlung, kreativer Mechanik, Drehaufwand und ehrlicher Bewertung.
        </li>
        <li>
          <span className="font-semibold text-ink">3. Skript:</span> Szenen mit Zeit, Kamera, Handlung, Dialog, Text im Bild, Ton und Schnitt, dazu Requisiten und alternative Hooks.
        </li>
      </ol>
      <p className="text-[13px] text-muted">Gespeichert wird das Skript zusammen mit der Idee. Am Set öffnet ihr es im Drehmodus.</p>
    </Card>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[96px_1fr_20px] items-center gap-2 text-[12px] text-muted">
      <span>{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-fill" aria-hidden>
        <span className={cn("block h-full rounded-full", value >= 8 ? "bg-ok" : value >= 5 ? "bg-ink-2" : "bg-warn")} style={{ width: `${value * 10}%` }} />
      </span>
      <span className="text-right tabular-nums text-ink-2" aria-label={`${label}: ${value} von 10`}>
        {value}
      </span>
    </div>
  );
}

function ConceptCard({ c, saved, busy, onPick, onRemember }: { c: Concept; saved: boolean; busy: boolean; onPick: () => void; onRemember: () => void }) {
  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex flex-wrap gap-1.5">
        {c.categories.map((k) => (
          <Badge key={k} tone="neutral">
            {categoryLabel(k)}
          </Badge>
        ))}
      </div>
      <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.02em] text-ink">{c.title}</h3>
      <p className="text-[15px] leading-relaxed text-ink">„{c.hook}“</p>
      <p className="text-[14px] leading-relaxed text-ink-2">{c.concept}</p>
      <p className="text-[13px] text-muted">
        <span className="font-semibold text-ink-2">Mechanik:</span> {c.mechanic}
      </p>
      <div className="grid gap-1">
        <ScoreBar label="Hook" value={c.scores.hook} />
        <ScoreBar label="Originalität" value={c.scores.originality} />
        <ScoreBar label="Drehbarkeit" value={c.scores.feasibility} />
        <ScoreBar label="Passung" value={c.scores.fit} />
        <p className="mt-1 text-[13px] text-muted">{c.scores.reason}</p>
      </div>
      <ProductionLine p={c.production} />
      <div className="mt-auto flex flex-wrap gap-2 border-t border-hairline pt-3">
        <Button type="button" size="sm" onClick={onPick} disabled={busy}>
          <Wand2 className="size-4" /> Skript ausarbeiten
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRemember} disabled={busy || saved}>
          {saved ? <Check className="size-4" /> : <Bookmark className="size-4" />} {saved ? "Gemerkt" : "Als Idee merken"}
        </Button>
      </div>
    </Card>
  );
}

function ProductionLine({ p }: { p: Concept["production"] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
      <span className="inline-flex items-center gap-1">
        <Users className="size-3.5" aria-hidden /> {p.actors} {p.actors === 1 ? "Person" : "Personen"}
        {p.roles.length ? ` (${p.roles.join(", ")})` : ""}
      </span>
      {p.location && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden /> {p.location}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3.5" aria-hidden /> ca. {p.minutes} Min. Dreh
      </span>
    </div>
  );
}

function ScriptResult({
  plan,
  chosen,
  demo,
  title,
  setTitle,
  hookChoice,
  setHookChoice,
  refineText,
  setRefineText,
  busy,
  onRefine,
  onBack,
  onSave,
  live,
}: {
  plan: ScriptPlan;
  chosen: ConceptInput;
  demo: boolean;
  title: string;
  setTitle: (v: string) => void;
  hookChoice: string;
  setHookChoice: (v: string) => void;
  refineText: string;
  setRefineText: (v: string) => void;
  busy: string | null;
  onRefine: (k: string) => void;
  onBack?: () => void;
  onSave: () => void;
  live: boolean;
}) {
  const hooks = [plan.hook, ...plan.alternativeHooks.filter((h) => h !== plan.hook)];
  const len = plan.scenes.at(-1)?.end ?? 0;
  return (
    <Card className="grid gap-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1.5">
            {chosen.categories.map((k) => (
              <Badge key={k} tone="neutral">
                {categoryLabel(k)}
              </Badge>
            ))}
            <Badge tone="info">{len} Sekunden</Badge>
            {demo && <Badge tone="warn">Demo</Badge>}
          </div>
          <label className="grid gap-1">
            <span className="sr-only">Titel</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-[18px] font-semibold" />
          </label>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{plan.concept}</p>
        </div>
        {onBack && (
          <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy !== null}>
            <ArrowLeft className="size-4" /> Zu den Ideen
          </Button>
        )}
      </div>

      <fieldset>
        <legend className={legend}>Hook wählen (die anderen bleiben als Alternativen gespeichert)</legend>
        <div className="grid gap-2">
          {hooks.map((h) => (
            <label key={h} className="flex cursor-pointer items-start gap-3 rounded-xl bg-fill-2 p-3 text-[15px] has-checked:bg-ink has-checked:text-white">
              <input type="radio" name="hook" checked={hookChoice === h} onChange={() => setHookChoice(h)} className="mt-1" />
              <span>„{h}“</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section aria-label="Szenen" className="grid gap-3">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Szenen</h3>
        <ol className="grid gap-3">
          {plan.scenes.map((s, i) => (
            <li key={i} className="squircle grid gap-2 rounded-[14px] bg-sunken p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] font-bold text-ink">
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </span>
                <span className="font-script text-[13px] font-bold tabular-nums text-accent-ink">
                  {mmss(s.start)} bis {mmss(s.end)}
                </span>
              </div>
              {(i === 0 ? hookChoice : "") && s.dialogue === "" && <p className="text-[16px] font-semibold text-ink">„{hookChoice}“</p>}
              {s.dialogue && <p className="whitespace-pre-line font-script text-[16px] leading-relaxed text-ink">{s.dialogue}</p>}
              <dl className="grid gap-1 text-[13px] text-ink-2 sm:grid-cols-2">
                {s.action && <Meta k="Handlung" v={s.action} />}
                {s.camera && <Meta k="Kamera" v={s.camera} />}
                {s.overlay && <Meta k="Text im Bild" v={s.overlay} />}
                {s.sound && <Meta k="Ton" v={s.sound} />}
                {s.cut && <Meta k="Schnitt" v={s.cut} />}
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="grid content-start gap-2 rounded-2xl bg-fill-2 p-4">
          <h3 className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
            <Clapperboard className="size-4" aria-hidden /> Drehaufwand
          </h3>
          <ProductionLine p={plan.production} />
          {plan.production.props.length > 0 && <p className="text-[13px] text-ink-2">Requisiten: {plan.production.props.join(", ")}</p>}
        </section>
        <section className="grid content-start gap-2 rounded-2xl bg-fill-2 p-4">
          <h3 className="text-[15px] font-semibold">Alternative Pointen</h3>
          <ul className="grid gap-1 text-[14px] text-ink-2">
            {plan.alternativePunchlines.map((p) => (
              <li key={p}>„{p}“</li>
            ))}
          </ul>
        </section>
      </div>

      {(plan.cta || plan.caption) && (
        <section className="grid gap-1 text-[14px]">
          {plan.cta && (
            <p>
              <span className="font-semibold">Abschluss: </span>
              {plan.cta}
            </p>
          )}
          <p className="text-ink-2">
            <span className="font-semibold text-ink">Caption: </span>
            {plan.caption} <span className="text-muted">{plan.hashtags.join(" ")}</span>
          </p>
        </section>
      )}

      <section className="grid gap-2 rounded-2xl bg-fill-2 p-4" aria-label="Verfeinern">
        <h3 className="text-[15px] font-semibold">Verfeinern</h3>
        <div className="flex flex-wrap gap-2">
          {REFINEMENTS.map((r) => (
            <Button key={r.key} type="button" size="sm" variant="secondary" className="bg-surface" onClick={() => onRefine(r.key)} disabled={busy !== null}>
              {r.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={refineText} onChange={(e) => setRefineText(e.target.value)} maxLength={300} placeholder="Eigener Wunsch, z. B. Chef soll die Pointe haben" className="bg-surface" />
          <Button type="button" variant="secondary" className="bg-surface" disabled={busy !== null || !refineText.trim() || !live} onClick={() => onRefine(refineText.trim())}>
            <Wand2 className="size-4" /> Anwenden
          </Button>
        </div>
        {busy === "verfeinern" && <p className="text-[13px] text-muted" aria-live="polite">Überarbeitet …</p>}
      </section>

      <div className="flex flex-col gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted">Wird mit der Idee gespeichert. Danach im Editor anpassen oder im Drehmodus öffnen.</p>
        <Button type="button" onClick={onSave} disabled={busy !== null} aria-busy={busy === "speichern"}>
          {busy === "speichern" ? "Speichert …" : "Skript speichern"}
        </Button>
      </div>
    </Card>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="inline font-semibold text-ink">{k}: </dt>
      <dd className="inline">{v}</dd>
    </div>
  );
}
