// Skript-Generator: OpenAI Responses API mit strukturierter Ausgabe (zod), sonst Demo-Modus.
// Datenschutz: an OpenAI gehen nur Branche, Region, Format, Ziel, Ton, Länge und das Briefing.
// Der Name des Betriebs wird als Platzhalter {{BETRIEB}} übertragen und erst hier eingesetzt.
// store:false (keine Speicherung der Antwort bei OpenAI für spätere Abrufe), Prompts werden nicht protokolliert.
import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getDb, schema } from "@/db";
import { integrations } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { demoScript } from "./demo";
import { DEFAULT_AI, EFFORTS, type Effort } from "./pricing";
import { BAUPLAN, cleanDraft, ScriptDraft, type GenContext, type GenInput, type GenResult } from "./schema";

export type AiConfig = { model: string; effort: Effort };

export async function getAiConfig(): Promise<AiConfig> {
  const raw = await getSetting<Partial<AiConfig>>("ai", {});
  const effort = EFFORTS.includes(raw.effort as Effort) ? (raw.effort as Effort) : DEFAULT_AI.effort;
  return { model: raw.model?.trim() || DEFAULT_AI.model, effort };
}

const BRANCHE_TEXT: Record<string, string> = {
  gastronomie: "Gastronomie (Restaurant, Café, Bar)",
  immobilien: "Immobilien (Makler, Verwaltung)",
  handwerk: "Handwerk (Meisterbetrieb)",
  unternehmen: "regionales Unternehmen",
};

const INSTRUCTIONS = `Du schreibst Kurzvideo-Skripte (Instagram Reels, TikTok) für SCM Creatives, eine Social-Media-Agentur aus Kiel und der Lübecker Bucht.
Ihre Videos funktionieren, weil Zuschauer sich wiedererkennen: Alltagssituationen aus der Branche, trockener norddeutscher Humor, echte Leute aus dem Betrieb statt Werbesprache.

Bauplan, immer in dieser Reihenfolge (das Feld label der beats nutzt genau diese Wörter):
1. ${BAUPLAN[0]} (0 bis 2 Sekunden): ein Satz oder Bild, das sofort hängen bleibt. Text im Bild ist möglich (POV:, Wenn …).
2. ${BAUPLAN[1]}: die Situation, die jeder aus der Branche oder als Kunde kennt.
3. ${BAUPLAN[2]}: es wird konkreter oder absurder.
4. ${BAUPLAN[3]}: Auflösung mit Lacher oder Aha.
5. ${BAUPLAN[4]}: eine Frage oder Aufforderung, die Kommentare auslöst. Keine harte Werbung.
Ein Abschnitt darf aus mehreren beats bestehen, insgesamt 5 bis 8 beats.

Regeln:
- Deutsch, kurze Sätze, gesprochene Sprache. Die Zuschauer werden geduzt.
- Keine Gedankenstriche (– oder —). Nutze Punkt, Komma oder Doppelpunkt.
- Keine erfundenen Fakten über den Betrieb (Preise, Auszeichnungen, Zahlen, Öffnungszeiten). Wenn etwas nötig ist, schreibe [PLATZHALTER: was fehlt].
- Den Namen des Betriebs nie ausschreiben, sondern immer den Platzhalter {{BETRIEB}} verwenden.
- Keine echten Personennamen, nur Rollen (Chef, Azubi, Gast, Kundin).
- Timecodes im Format MM:SS, aufsteigend, passend zur Ziellänge. Der letzte beat beginnt spätestens 3 Sekunden vor dem Ende.
- shot: kurz und mit dem Smartphone drehbar (Perspektive, Ort, Requisite).
- caption: 1 bis 2 Sätze mit einem passenden Emoji, ohne Hashtags. hashtags separat, 5 bis 8 Stück, regional und zur Branche.
- hookVariants: genau drei alternative Hooks mit jeweils anderem Ansatz.`;

const REFINE_TEXT: Record<string, string> = {
  kuerzer: "Mach das Skript kürzer und knackiger. Weniger Wörter pro beat, gleiche Pointe.",
  lustiger: "Mach das Skript lustiger. Eine überraschendere Steigerung und eine stärkere Pointe.",
  lokal: "Mach das Skript lokaler: Bezug zur Region (Orte, Eigenheiten, Sprache im Norden), ohne Klischees zu übertreiben.",
};

function userPrompt(input: GenInput, ctx: GenContext, previous: string | null) {
  const lines = [
    `Branche: ${BRANCHE_TEXT[ctx.branche] ?? ctx.branche}`,
    `Region: ${ctx.region || "Schleswig-Holstein"}`,
    `Format: ${input.format}`,
    `Ziel des Videos: ${input.ziel}`,
    `Tonalität: ${input.ton}`,
    `Ziellänge: ${input.length} Sekunden`,
    `Briefing: ${input.briefing?.trim() || "keins, schlage eine typische Situation aus der Branche vor"}`,
  ];
  if (previous) {
    const wish = REFINE_TEXT[input.refine ?? ""] ?? input.refine ?? "";
    lines.push("", "Bisheriger Entwurf (JSON):", previous, "", `Änderungswunsch: ${wish}`, "Gib den vollständigen überarbeiteten Entwurf zurück.");
  }
  return lines.join("\n");
}

/** Verständliche Meldung für typische API-Fehler. */
function explain(e: unknown, model: string): string {
  if (e instanceof OpenAI.APIConnectionTimeoutError) return "Die KI hat zu lange gebraucht. Bitte noch einmal versuchen.";
  if (e instanceof OpenAI.APIConnectionError) return "OpenAI ist von hier aus nicht erreichbar. Bitte Internetverbindung oder Firewall prüfen.";
  if (e instanceof OpenAI.APIError) {
    const code = String(e.code ?? "");
    if (e.status === 401) return "Der OpenAI-Schlüssel wird nicht akzeptiert. Bitte OPENAI_API_KEY prüfen.";
    if (e.status === 404 || code === "model_not_found")
      return `Das Modell „${model}“ ist für diesen Schlüssel nicht verfügbar. In den Einstellungen unter KI ein anderes Modell wählen.`;
    if (e.status === 429)
      return code === "insufficient_quota"
        ? "Das OpenAI-Guthaben ist aufgebraucht. Bitte im OpenAI-Konto aufladen."
        : "OpenAI meldet zu viele Anfragen. Bitte in einer Minute noch einmal versuchen.";
    if (e.status === 400) return `OpenAI hat die Anfrage abgelehnt: ${e.message.slice(0, 160)}`;
    if (e.status && e.status >= 500) return "OpenAI ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.";
  }
  if (e instanceof Error && /timeout|timed out/i.test(e.message)) return "Die KI hat zu lange gebraucht. Bitte noch einmal versuchen.";
  return "Das Skript konnte nicht erzeugt werden. Bitte noch einmal versuchen.";
}

async function logRun(userId: number, model: string, ok: boolean, usage?: GenResult["usage"], error?: string) {
  const db = await getDb();
  await db.insert(schema.aiRuns).values({
    userId,
    purpose: "skript",
    model,
    inputTokens: usage?.input ?? 0,
    cachedTokens: usage?.cached ?? 0,
    outputTokens: usage?.output ?? 0,
    reasoningTokens: usage?.reasoning ?? 0,
    ok,
    error: error ?? null,
  });
}

/**
 * Skript erzeugen oder überarbeiten. `previousDraft` ist der aktuelle Entwurf (für Verfeinerungen).
 * Wirft nie: Fehler kommen als { error } zurück.
 */
export async function generateScript(
  input: GenInput,
  ctx: GenContext,
  previousDraft: ScriptDraft | null,
  userId: number,
): Promise<{ ok: true; result: GenResult } | { ok: false; error: string }> {
  if (!integrations.openai()) {
    const { draft, notice } = demoScript(input, ctx, previousDraft);
    await logRun(userId, "demo", true);
    return { ok: true, result: { draft: cleanDraft(draft, ctx.clientName), demo: true, model: "demo", notice } };
  }

  const cfg = await getAiConfig();
  // Namen des Betriebs vor dem Senden wieder durch den Platzhalter ersetzen
  const previous = previousDraft
    ? JSON.stringify(previousDraft).split(ctx.clientName || "\u0000").join("{{BETRIEB}}")
    : null;

  try {
    const client = new OpenAI({ timeout: 90_000, maxRetries: 1 });
    const res = await client.responses.parse({
      model: cfg.model,
      instructions: INSTRUCTIONS,
      input: userPrompt(input, ctx, previous),
      text: { format: zodTextFormat(ScriptDraft, "skript") },
      reasoning: { effort: cfg.effort },
      store: false,
      max_output_tokens: 6000,
    });
    const usage = res.usage
      ? {
          input: res.usage.input_tokens,
          cached: res.usage.input_tokens_details?.cached_tokens ?? 0,
          output: res.usage.output_tokens,
          reasoning: res.usage.output_tokens_details?.reasoning_tokens ?? 0,
        }
      : undefined;
    if (res.status === "incomplete" || !res.output_parsed) {
      const why = res.incomplete_details?.reason === "max_output_tokens" ? "Die Antwort war zu lang und wurde abgeschnitten." : "Die Antwort war unvollständig.";
      await logRun(userId, cfg.model, false, usage, `incomplete:${res.incomplete_details?.reason ?? "unbekannt"}`);
      return { ok: false, error: `${why} Bitte noch einmal versuchen.` };
    }
    await logRun(userId, cfg.model, true, usage);
    return { ok: true, result: { draft: cleanDraft(res.output_parsed, ctx.clientName), demo: false, model: cfg.model, usage } };
  } catch (e) {
    const status = e instanceof OpenAI.APIError ? `${e.status ?? ""} ${e.code ?? ""}`.trim() : e instanceof Error ? e.name : "Fehler";
    await logRun(userId, cfg.model, false, undefined, status.slice(0, 120));
    return { ok: false, error: explain(e, cfg.model) };
  }
}
