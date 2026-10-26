// Nächtliche Trend-Recherche: OpenAI (Responses API) mit Websuche sucht nach aktuellen TikTok- und Instagram-Trends,
// die zur Richtungsbeschreibung passen, und schlägt Video-Ideen vor.
// TikTok und Instagram lassen sich nicht direkt durchsuchen (Login, keine offene Such-API; die Instagram-Anbindung
// über Instagram Login hat keine Hashtag-Suche). Die Websuche findet, was öffentlich über Trends berichtet wird
// (TikTok Creative Center, Fachportale, Plattform-Blogs, öffentliche Beiträge).
// Belegpflicht: Jeder Trend braucht mindestens eine Quelle, die die Websuche tatsächlich geöffnet oder zitiert hat.
// Ideen ohne belegten Trend werden verworfen. An OpenAI gehen nur Branchen und Region, keine Kundennamen.
import "server-only";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { TrendFinding, TrendSource } from "@/db/schema";
import { integrations } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { getAiConfig } from "./ai";
import { DEFAULT_RICHTUNG, type Richtung } from "./richtung";
import { cleanDraft } from "./schema";

export const RICHTUNG_KEY = "trends.richtung";
/** Unbearbeitete Vorschläge räumen sich nach so vielen Tagen selbst weg (landen unter „Verworfen“). */
export const SUGGESTION_DAYS = 14;
const MAX_TRENDS = 6;
const MAX_IDEAS = 8;

export async function getRichtung(): Promise<Richtung> {
  const raw = await getSetting<Partial<Richtung>>(RICHTUNG_KEY, {});
  return {
    beschreibung: raw.beschreibung?.trim() || DEFAULT_RICHTUNG.beschreibung,
    stichwoerter: raw.stichwoerter?.length ? raw.stichwoerter : DEFAULT_RICHTUNG.stichwoerter,
  };
}

const BRANCHE_KEYS = ["gastronomie", "immobilien", "handwerk", "unternehmen", "alle"] as const;

// Structured Outputs: alle Felder Pflicht, Grenzen prüfen wir danach selbst
const Report = z.object({
  trends: z
    .array(
      z.object({
        titel: z.string().describe("Name des Trends oder Formats, kurz"),
        plattform: z.enum(["TikTok", "Instagram", "beide"]),
        beschreibung: z.string().describe("Was den Trend ausmacht, 1 bis 3 Sätze, nur was in den Quellen steht"),
        warum_passend: z.string().describe("Warum er zu SCM und einer unserer Branchen passt, 1 Satz"),
        quellen: z.array(z.object({ titel: z.string(), url: z.string() })).describe("Seiten aus der Websuche, die den Trend belegen"),
      }),
    )
    .describe(`Höchstens ${MAX_TRENDS} aktuelle Trends`),
  ideen: z
    .array(
      z.object({
        titel: z.string().describe("Die Video-Idee in einem Satz, höchstens 12 Wörter"),
        hook: z.string().describe("Erster Satz oder Text im Bild"),
        beschreibung: z.string().describe("Ablauf in Stichworten: Situation, Steigerung, Pointe, Aufruf"),
        format: z.string().describe("Format, z. B. POV-Sketch, Entweder oder, Einblick, Recruiting"),
        branche: z.enum(BRANCHE_KEYS),
        trend_nr: z.number().int().describe("Index des Trends in der Liste trends (ab 0), auf dem die Idee aufbaut"),
      }),
    )
    .describe(`Höchstens ${MAX_IDEAS} Video-Ideen`),
});

function instructions(r: Richtung) {
  return `Du bist Trend-Rechercheur für SCM Creatives. Suche im Web nach Trends, Formaten, Sounds und Hooks, die in den letzten 14 Tagen auf TikTok und Instagram Reels laufen, vor allem in Deutschland.

Richtungsbeschreibung (wonach du suchst und was passt):
${r.beschreibung}

Suchbegriffe als Ausgangspunkt (frei kombinieren, eigene ergänzen):
${r.stichwoerter.map((s) => `- ${s}`).join("\n")}

Regeln:
- Nutze die Websuche mehrmals mit verschiedenen Begriffen. Bevorzuge aktuelle Quellen (TikTok Creative Center, Plattform-Blogs, Fachportale für Social Media, öffentliche Beiträge).
- Jeder Trend braucht mindestens eine Quelle, die du in dieser Suche wirklich gefunden hast. Gib die URL genau so an. Nichts erfinden: keine Zahlen, Namen oder Sounds, die nicht in den Quellen stehen.
- Höchstens ${MAX_TRENDS} Trends und höchstens ${MAX_IDEAS} Ideen. Lieber weniger, dafür passend.
- Ideen sind mit einem Smartphone und 1 bis 3 Personen im Betrieb drehbar, auf Deutsch, die Zuschauer werden geduzt, trockener norddeutscher Humor ist willkommen.
- Keine Gedankenstriche (– oder —). Keine Namen echter Personen, nur Rollen (Chef, Azubi, Gast).
- Wiederhole keine Ideen aus der Liste „Schon vorhanden“.`;
}

/** URL vergleichbar machen: ohne Tracking-Parameter, Anker und Schrägstrich am Ende. */
function normUrl(u: string): string | null {
  try {
    const url = new URL(u.trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|igshid)/i.test(k)) url.searchParams.delete(k);
    url.hostname = url.hostname.replace(/^www\./, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Alle URLs, die die Websuche in dieser Antwort gefunden, geöffnet oder zitiert hat. */
function seenUrls(output: OpenAI.Responses.ResponseOutputItem[]): { urls: Set<string>; searches: number } {
  const urls = new Set<string>();
  let searches = 0;
  for (const item of output) {
    if (item.type === "web_search_call") {
      searches++;
      const a = item.action as { type: string; url?: string | null; sources?: { url: string }[] } | undefined;
      if (a?.url) urls.add(normUrl(a.url) ?? "");
      for (const s of a?.sources ?? []) urls.add(normUrl(s.url) ?? "");
    }
    if (item.type === "message") {
      for (const c of item.content) {
        if (c.type !== "output_text") continue;
        for (const an of c.annotations) if (an.type === "url_citation") urls.add(normUrl(an.url) ?? "");
      }
    }
  }
  urls.delete("");
  return { urls, searches };
}

const clean = (t: string) => cleanDraft({ title: t, hook: "", hookVariants: [], beats: [], caption: "", cta: "", hashtags: [] }, null).title;

export type TrendResult = { ok: true; runId: number; trends: number; ideas: number } | { ok: false; error: string; runId?: number };

/** Kontext für die KI: Branchen und Orte der aktiven Kunden (ohne Namen) und vorhandene Ideen (gegen Doppelungen). */
async function context() {
  const db = await getDb();
  const clients = await db
    .select({ branche: schema.clients.branche, ort: schema.clients.ort, status: schema.clients.status })
    .from(schema.clients);
  const active = clients.filter((c) => c.status === "aktiv" || c.status === "test");
  const branchen = [...new Set(active.map((c) => c.branche))];
  const orte = [...new Set(active.map((c) => c.ort).filter(Boolean))].slice(0, 10);
  const existing = await db
    .select({ title: schema.ideas.title })
    .from(schema.ideas)
    .orderBy(desc(schema.ideas.createdAt))
    .limit(60);
  return { branchen, orte, existing: existing.map((e) => e.title) };
}

/**
 * Eine Recherche ausführen und Vorschläge speichern. Läuft bereits eine (jünger als 10 Minuten), passiert nichts.
 * Wirft nie: Fehler stehen im Lauf (trend_runs.error) und im Ergebnis.
 */
export async function runTrendResearch(opts: { trigger: "nacht" | "manuell"; userId?: number | null }): Promise<TrendResult> {
  if (!integrations.openai()) return { ok: false, error: "Für die Recherche fehlt OPENAI_API_KEY." };
  const db = await getDb();
  const [running] = await db
    .select({ id: schema.trendRuns.id })
    .from(schema.trendRuns)
    .where(and(isNull(schema.trendRuns.finishedAt), gte(schema.trendRuns.startedAt, new Date(Date.now() - 10 * 60_000))));
  if (running) return { ok: false, error: "Es läuft schon eine Recherche.", runId: running.id };

  const cfg = await getAiConfig();
  const model = process.env.OPENAI_MODEL_TRENDS?.trim() || cfg.model;
  const [run] = await db
    .insert(schema.trendRuns)
    .values({ trigger: opts.trigger, triggeredBy: opts.userId ?? null, model })
    .returning({ id: schema.trendRuns.id });

  const finish = async (patch: Partial<typeof schema.trendRuns.$inferInsert>) =>
    db.update(schema.trendRuns).set({ finishedAt: new Date(), ...patch }).where(eq(schema.trendRuns.id, run.id));

  try {
    const [richtung, ctx] = await Promise.all([getRichtung(), context()]);
    const input = [
      `Heute: ${new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}`,
      `Branchen unserer aktiven Kunden: ${ctx.branchen.join(", ") || "Gastronomie, Immobilien, Handwerk, Unternehmen"}`,
      `Orte: ${ctx.orte.join(", ") || "Kiel, Lübecker Bucht"}`,
      "",
      "Schon vorhanden (nicht wiederholen):",
      ...(ctx.existing.length ? ctx.existing.map((t) => `- ${t}`) : ["- (noch keine)"]),
    ].join("\n");

    const client = new OpenAI({ timeout: 270_000, maxRetries: 0 });
    const res = await client.responses.parse({
      model,
      instructions: instructions(richtung),
      input,
      tools: [
        {
          type: "web_search",
          search_context_size: "medium",
          user_location: { type: "approximate", country: "DE", region: "Schleswig-Holstein", city: "Kiel", timezone: "Europe/Berlin" },
        },
      ],
      include: ["web_search_call.action.sources"],
      text: { format: zodTextFormat(Report, "trend_bericht") },
      reasoning: { effort: "medium" },
      store: false,
      max_output_tokens: 16000,
    });

    const { urls, searches } = seenUrls(res.output);
    const usage = res.usage;
    await db.insert(schema.aiRuns).values({
      userId: opts.userId ?? null,
      purpose: "trends",
      model,
      inputTokens: usage?.input_tokens ?? 0,
      cachedTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
      searchCalls: searches,
      ok: Boolean(res.output_parsed),
      error: res.output_parsed ? null : `incomplete:${res.incomplete_details?.reason ?? "unbekannt"}`,
    });
    const report = res.output_parsed;
    if (!report) {
      const error = res.incomplete_details?.reason === "max_output_tokens" ? "Die Antwort war zu lang." : "Die Antwort war unvollständig.";
      await finish({ ok: false, error, searchCalls: searches });
      return { ok: false, error, runId: run.id };
    }

    // Nur belegte Trends: Quellen müssen aus dieser Websuche stammen
    const trendMap = new Map<number, TrendFinding>();
    report.trends.slice(0, MAX_TRENDS).forEach((t, idx) => {
      const sources: TrendSource[] = [];
      for (const q of t.quellen) {
        const u = normUrl(q.url);
        if (u && urls.has(u) && !sources.some((s) => s.url === u)) sources.push({ title: clean(q.titel).slice(0, 160), url: u });
      }
      if (sources.length === 0) return;
      trendMap.set(idx, {
        title: clean(t.titel).slice(0, 120),
        platform: t.plattform,
        summary: clean(t.beschreibung).slice(0, 600),
        fit: clean(t.warum_passend).slice(0, 300),
        sources: sources.slice(0, 5),
      });
    });
    const trends = [...trendMap.values()];

    const existing = new Set(ctx.existing.map((t) => t.toLowerCase()));
    const ideas = report.ideen
      .filter((i) => trendMap.has(i.trend_nr) && !existing.has(i.titel.trim().toLowerCase()))
      .slice(0, MAX_IDEAS)
      .map((i) => {
        const t = trendMap.get(i.trend_nr)!;
        return {
          title: clean(i.titel).slice(0, 200),
          hook: clean(i.hook).slice(0, 300) || null,
          description: clean(i.beschreibung).slice(0, 2000) || null,
          format: clean(i.format).slice(0, 80) || null,
          branche: i.branche === "alle" ? null : i.branche,
          status: "vorschlag",
          source: "recherche",
          trend: t.title,
          sources: t.sources,
          runId: run.id,
        };
      });

    // Alte, nie gesichtete Vorschläge wegräumen, damit die Liste überschaubar bleibt
    await db
      .update(schema.ideas)
      .set({ status: "verworfen", updatedAt: new Date() })
      .where(and(eq(schema.ideas.status, "vorschlag"), lt(schema.ideas.createdAt, new Date(Date.now() - SUGGESTION_DAYS * 86_400_000))));
    if (ideas.length) await db.insert(schema.ideas).values(ideas);
    await finish({ ok: true, trends, ideaCount: ideas.length, searchCalls: searches, error: trends.length ? null : "Keine Trends mit belegter Quelle gefunden." });
    return { ok: true, runId: run.id, trends: trends.length, ideas: ideas.length };
  } catch (e) {
    const msg =
      e instanceof OpenAI.APIError
        ? e.status === 401
          ? "Der OpenAI-Schlüssel wird nicht akzeptiert."
          : e.status === 429
            ? "OpenAI-Guthaben aufgebraucht oder zu viele Anfragen."
            : `OpenAI: ${e.message.slice(0, 160)}`
        : e instanceof Error && /timeout|timed out/i.test(e.message)
          ? "Die Recherche hat zu lange gebraucht."
          : "Die Recherche ist fehlgeschlagen.";
    await finish({ ok: false, error: msg }).catch(() => undefined);
    return { ok: false, error: msg, runId: run.id };
  }
}
