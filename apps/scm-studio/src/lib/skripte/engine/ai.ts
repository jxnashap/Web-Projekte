// SCM Creative Engine: zweistufig. Erst fünf grundverschiedene Konzepte (bewertet), dann das Skript zum gewählten.
// OpenAI Responses API mit Structured Outputs (zod). store:false, Prompts werden nicht protokolliert.
// Ohne OPENAI_API_KEY liefert ein Demo-Modus Beispielinhalte im selben Format.
import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getDb, schema } from "@/db";
import { integrations } from "@/lib/env";
import { getAiConfig } from "../ai";
import { contextText, type EngineContext } from "./context";
import { CONCEPTS_INSTRUCTIONS, conceptsInput, REFINE_TEXT, SCRIPT_INSTRUCTIONS, scriptInput } from "./prompts";
import { CATEGORIES, ConceptSet, ScriptPlan, type Briefing, type Concept, type ConceptInput, type ScriptPlan as Plan } from "./shared";

type Usage = { input: number; cached: number; output: number; reasoning: number };
export type EngineResult<T> = { ok: true; data: T; demo: boolean; model: string } | { ok: false; error: string };

/** Gedankenstriche raus, Platzhalter für den Betrieb einsetzen. */
function fix(t: string, clientName: string | null) {
  return t
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 bis $2")
    .replace(/\s+[–—]\s+/g, ", ")
    .replace(/[–—]/g, ", ")
    .replace(/\{\{\s*BETRIEB\s*\}\}/g, clientName ?? "[BETRIEB]")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n || 0)));

function cleanProduction(p: Concept["production"], name: string | null): Concept["production"] {
  return {
    actors: clamp(p.actors, 0, 8),
    roles: p.roles.map((r) => fix(r, name)).filter(Boolean).slice(0, 8),
    props: p.props.map((r) => fix(r, name)).filter(Boolean).slice(0, 12),
    location: fix(p.location, name),
    minutes: clamp(p.minutes, 5, 240),
  };
}

function cleanConcept(c: Concept, name: string | null): Concept {
  return {
    title: fix(c.title, name),
    categories: [...new Set(c.categories)].slice(0, 3),
    hook: fix(c.hook, name),
    concept: fix(c.concept, name),
    mechanic: fix(c.mechanic, name),
    production: cleanProduction(c.production, name),
    scores: {
      hook: clamp(c.scores.hook, 1, 10),
      originality: clamp(c.scores.originality, 1, 10),
      feasibility: clamp(c.scores.feasibility, 1, 10),
      fit: clamp(c.scores.fit, 1, 10),
      reason: fix(c.scores.reason, name),
    },
  };
}

function cleanPlan(p: Plan, name: string | null, length: number): Plan {
  const scenes = p.scenes.slice(0, 12).map((s) => ({
    start: clamp(s.start, 0, 600),
    end: clamp(s.end, 0, 600),
    label: fix(s.label, name) || "Szene",
    camera: fix(s.camera, name),
    action: fix(s.action, name),
    dialogue: fix(s.dialogue, name),
    overlay: fix(s.overlay, name),
    sound: fix(s.sound, name),
    cut: fix(s.cut, name),
  }));
  if (scenes.length) scenes[scenes.length - 1].end = Math.max(scenes[scenes.length - 1].end, Math.min(length, 600));
  const tags = p.hashtags.map((h) => h.trim().replace(/\s+/g, "")).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`));
  return {
    title: fix(p.title, name),
    hook: fix(p.hook, name),
    concept: fix(p.concept, name),
    scenes,
    cta: fix(p.cta, name),
    caption: fix(p.caption, name),
    hashtags: [...new Set(tags)].slice(0, 10),
    production: cleanProduction(p.production, name),
    alternativeHooks: p.alternativeHooks.map((h) => fix(h, name)).filter(Boolean).slice(0, 3),
    alternativePunchlines: p.alternativePunchlines.map((h) => fix(h, name)).filter(Boolean).slice(0, 3),
  };
}

async function logRun(userId: number, purpose: string, model: string, ok: boolean, usage?: Usage, error?: string) {
  const db = await getDb();
  await db.insert(schema.aiRuns).values({
    userId,
    purpose,
    model,
    inputTokens: usage?.input ?? 0,
    cachedTokens: usage?.cached ?? 0,
    outputTokens: usage?.output ?? 0,
    reasoningTokens: usage?.reasoning ?? 0,
    ok,
    error: error ?? null,
  });
}

function explain(e: unknown, model: string): string {
  if (e instanceof OpenAI.APIConnectionTimeoutError) return "Die KI hat zu lange gebraucht. Bitte noch einmal versuchen.";
  if (e instanceof OpenAI.APIError) {
    const code = String(e.code ?? "");
    if (e.status === 401) return "Der OpenAI-Schlüssel wird nicht akzeptiert. Bitte unter Einstellungen, KI prüfen.";
    if (e.status === 404 || code === "model_not_found") return `Das Modell „${model}“ ist für diesen Schlüssel nicht verfügbar. In den Einstellungen unter KI ein anderes wählen.`;
    if (e.status === 429) return code === "insufficient_quota" ? "Das OpenAI-Guthaben ist aufgebraucht." : "OpenAI meldet zu viele Anfragen. Bitte gleich noch einmal.";
    if (e.status === 400) return `OpenAI hat die Anfrage abgelehnt: ${e.message.slice(0, 160)}`;
    if (e.status && e.status >= 500) return "OpenAI ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.";
  }
  if (e instanceof Error && /timeout|timed out/i.test(e.message)) return "Die KI hat zu lange gebraucht. Bitte noch einmal versuchen.";
  return "Das hat nicht geklappt. Bitte noch einmal versuchen.";
}

async function call<T>(opts: { purpose: string; userId: number; instructions: string; input: string; format: Parameters<typeof zodTextFormat>[0]; name: string; maxTokens: number }) {
  const cfg = await getAiConfig();
  try {
    const client = new OpenAI({ timeout: 150_000, maxRetries: 1 });
    const res = await client.responses.parse({
      model: cfg.model,
      instructions: opts.instructions,
      input: opts.input,
      text: { format: zodTextFormat(opts.format, opts.name) },
      // Kreative Konzepte brauchen etwas Denkzeit, mindestens "low"
      reasoning: { effort: cfg.effort === "none" ? "low" : cfg.effort },
      store: false,
      max_output_tokens: opts.maxTokens,
    });
    const usage = res.usage
      ? {
          input: res.usage.input_tokens,
          cached: res.usage.input_tokens_details?.cached_tokens ?? 0,
          output: res.usage.output_tokens,
          reasoning: res.usage.output_tokens_details?.reasoning_tokens ?? 0,
        }
      : undefined;
    if (!res.output_parsed) {
      await logRun(opts.userId, opts.purpose, cfg.model, false, usage, `incomplete:${res.incomplete_details?.reason ?? "unbekannt"}`);
      return { ok: false as const, error: res.incomplete_details?.reason === "max_output_tokens" ? "Die Antwort war zu lang. Bitte noch einmal versuchen." : "Die Antwort war unvollständig. Bitte noch einmal versuchen." };
    }
    await logRun(opts.userId, opts.purpose, cfg.model, true, usage);
    return { ok: true as const, data: res.output_parsed as T, model: cfg.model };
  } catch (e) {
    const status = e instanceof OpenAI.APIError ? `${e.status ?? ""} ${e.code ?? ""}`.trim() : e instanceof Error ? e.name : "Fehler";
    await logRun(opts.userId, opts.purpose, cfg.model, false, undefined, status.slice(0, 120));
    return { ok: false as const, error: explain(e, cfg.model) };
  }
}

export async function generateConcepts(b: Briefing, ctx: EngineContext, exclude: string[], userId: number): Promise<EngineResult<Concept[]>> {
  if (!integrations.openai()) {
    await logRun(userId, "ideen", "demo", true);
    return { ok: true, data: demoConcepts(b, exclude.length), demo: true, model: "demo" };
  }
  const r = await call<{ concepts: Concept[] }>({
    purpose: "ideen",
    userId,
    instructions: CONCEPTS_INSTRUCTIONS,
    input: conceptsInput(b, contextText(ctx), exclude),
    format: ConceptSet,
    name: "konzepte",
    maxTokens: 9000,
  });
  if (!r.ok) return r;
  const concepts = r.data.concepts.slice(0, 5).map((c) => cleanConcept(c, ctx.clientName));
  if (concepts.length === 0) return { ok: false, error: "Die KI hat keine Konzepte geliefert. Bitte noch einmal versuchen." };
  return { ok: true, data: concepts, demo: false, model: r.model };
}

export async function generatePlan(
  b: Briefing,
  concept: ConceptInput,
  ctx: EngineContext,
  previous: Plan | null,
  refine: string | null,
  userId: number,
): Promise<EngineResult<Plan>> {
  if (!integrations.openai()) {
    await logRun(userId, "skript", "demo", true);
    return { ok: true, data: demoPlan(b, concept, previous, refine), demo: true, model: "demo" };
  }
  // Namen des Betriebs vor dem Senden wieder durch den Platzhalter ersetzen
  const prev = previous ? JSON.stringify(previous).split(ctx.clientName || "\u0000").join("{{BETRIEB}}") : null;
  const anon = (t: string) => (ctx.clientName ? t.split(ctx.clientName).join("{{BETRIEB}}") : t);
  const c = { ...concept, title: anon(concept.title), hook: anon(concept.hook), concept: anon(concept.concept), mechanic: anon(concept.mechanic ?? "") };
  const wish = refine ? (REFINE_TEXT[refine] ?? refine) : null;
  const r = await call<Plan>({
    purpose: "skript",
    userId,
    instructions: SCRIPT_INSTRUCTIONS,
    input: scriptInput(b, c, contextText(ctx), prev, wish),
    format: ScriptPlan,
    name: "skript",
    maxTokens: 9000,
  });
  if (!r.ok) return r;
  return { ok: true, data: cleanPlan(r.data, ctx.clientName, b.length), demo: false, model: r.model };
}

// ------------------------------------------------------------------
// Demo-Modus (ohne OpenAI-Schlüssel): feste Beispiele im selben Format
// ------------------------------------------------------------------
const DEMO: Record<string, { title: string; hook: string; concept: string; mechanic: string }[]> = {
  comedy: [
    { title: "Der Gast, der alles besser weiß", hook: "POV: Du arbeitest hier und er war einmal im Urlaub in Italien.", concept: "Ein Gast erklärt dem Team ihr eigenes Handwerk. Jede Belehrung wird absurder, bis das Team ihm die Schürze reicht.", mechanic: "Rollentausch: Der Besserwisser muss es am Ende selbst machen." },
    { title: "Drei Arten von Kunden", hook: "Text im Bild: Welcher Kunde bist du?", concept: "Dieselbe Szene dreimal mit drei Kundentypen: der Eilige, der Zweifler, der Stammkunde. Am Ende stellt sich heraus, alle drei sind dieselbe Person.", mechanic: "Wiederholung mit Variation, Twist am Ende." },
  ],
  ad: [{ title: "Vorher, nachher, ohne Worte", hook: "Ein einziges Bild: so sah es vorher aus.", concept: "Problem zeigen, dann in schnellen Schnitten die Lösung, am Ende das Ergebnis mit ehrlicher Reaktion.", mechanic: "Beweis durch Zeigen statt Behaupten." }],
  education: [{ title: "Der häufigste Irrtum", hook: "Das machen 9 von 10 falsch. [PLATZHALTER: belegte Zahl oder weglassen]", concept: "Der Chef zeigt den typischen Fehler, dann die richtige Lösung in zwei Handgriffen.", mechanic: "Falsch gegen richtig im direkten Vergleich." }],
  persoenlichkeit: [{ title: "Das Team rät", hook: "Wer im Team kann das am schnellsten?", concept: "Kleine Challenge im Betrieb, jeder tippt vorher, das Ergebnis überrascht.", mechanic: "Wettstreit mit Prognose, echte Reaktionen." }],
  aktion: [{ title: "Nur diese Woche", hook: "Wenn du das hier siehst, hast du noch [PLATZHALTER: Tage] Zeit.", concept: "Das Angebot wird als Countdown erzählt, jede Szene ein Grund mehr.", mechanic: "Countdown als Dramaturgie." }],
  cinematic: [{ title: "Ein Morgen im Betrieb", hook: "Stille. Dann das erste Geräusch des Tages.", concept: "Die Vorbereitung vor der Öffnung in ruhigen Detailaufnahmen, Ton als Rhythmus, am Ende geht die Tür auf.", mechanic: "Sounddesign trägt die Geschichte." }],
  interaktion: [{ title: "Entweder oder, Team-Edition", hook: "Text im Bild: Entweder oder. Keine Ausreden.", concept: "Das Team wählt zwischen zwei Optionen, jede Wahl mit kurzer Reaktion, die letzte Frage geht an die Zuschauer.", mechanic: "Zuschauer stimmen in den Kommentaren mit ab." }],
};

function demoConcepts(b: Briefing, round: number): Concept[] {
  const pool = [...b.categories.flatMap((k) => DEMO[k] ?? []), ...CATEGORIES.flatMap((c) => DEMO[c.key])];
  const unique = [...new Map(pool.map((p) => [p.title, p])).values()];
  const start = (round * 5) % unique.length;
  return Array.from({ length: 5 }, (_, i) => unique[(start + i) % unique.length]).map((d, i) => ({
    ...d,
    categories: [b.categories[i % b.categories.length]],
    production: { actors: Math.min(b.people, 2), roles: ["Chef", "Gast"].slice(0, Math.min(b.people, 2)), props: ["[PLATZHALTER: Produkt]"], location: "Im Betrieb", minutes: 15 + i * 5 },
    scores: { hook: 8 - (i % 3), originality: 6 + (i % 4), feasibility: 9 - (i % 3), fit: 7, reason: "Demo-Bewertung. Mit OpenAI-Schlüssel bewertet die KI ehrlich." },
  }));
}

function demoPlan(b: Briefing, c: ConceptInput, previous: Plan | null, refine: string | null): Plan {
  const len = refine === "kuerzer" ? Math.min(b.length, 15) : b.length;
  const parts = ["Hook", "Situation", "Steigerung", "Pointe", "Aufruf"];
  const step = Math.floor(len / parts.length);
  return {
    title: previous?.title ?? c.title,
    hook: c.hook,
    concept: c.concept,
    scenes: parts.map((label, i) => ({
      start: i * step,
      end: i === parts.length - 1 ? len : (i + 1) * step,
      label,
      camera: ["Halbnah, Handy auf Augenhöhe", "Totale vom Tresen", "Nah, Handkamera", "Close-up auf das Gesicht", "Halbnah, Blick in die Kamera"][i],
      action: i === 0 ? "Einstieg mit dem Hook, sofort in der Situation" : i === parts.length - 1 ? "Blick in die Kamera" : c.concept,
      dialogue: i === 0 ? "" : i === parts.length - 1 ? "Chef: Und was sagt ihr dazu? Schreibt es in die Kommentare." : "Chef: [PLATZHALTER: Text]",
      overlay: i === 0 ? c.hook : "",
      sound: i === 3 ? "Kurze Stille, dann Lacher" : "",
      cut: i === 2 ? "Jump Cuts, Tempo anziehen" : "",
    })),
    cta: "Und was sagt ihr dazu? Schreibt es in die Kommentare.",
    caption: "Kennt ihr das auch? 😄",
    hashtags: ["#Kiel", "#LübeckerBucht", "#SchleswigHolstein", "#Reels"],
    production: c.production ?? { actors: 2, roles: ["Chef", "Gast"], props: ["[PLATZHALTER: Produkt]"], location: "Im Betrieb", minutes: 20 },
    alternativeHooks: ["Text im Bild: Das hier passiert jeden Tag.", "POV: Du bist neu im Team.", "Rate mal, wie das ausgeht."],
    alternativePunchlines: ["Der Chef macht es am Ende genauso.", "Der Gast kommt am nächsten Tag wieder, mit Notizblock."],
  };
}
