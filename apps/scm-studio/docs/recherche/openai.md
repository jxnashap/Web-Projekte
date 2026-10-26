# KI-Skripte mit OpenAI

Recherche für SCM Studio, Stand 26.10.2026 (Websuche + npm-Registry, je Thema ein Rechercheur). Aussagen mit Sicherheit "mittel" vor dem Livegang an der Quelle prüfen.

## Zusammenfassung

Stand 26.10.2026 (nur WebSearch-Auszüge, kein WebFetch; Preise vor dem Livegang auf developers.openai.com/api/docs/pricing prüfen). Aktuell ist die GPT-6-Familie: GPT-6 Astra (Flaggschiff, 10/50 USD je 1 Mio. Input/Output), GPT-6.1 Sol (seit 29.09.2026, 2/10 USD, laut OpenAI fast so stark wie Astra zu einem Fünftel des Preises), GPT-6 Sol (2/10 USD) und GPT-6 Luna (0,10/0,50 USD). Alle haben 1,05 Mio. Tokens Kontext und 128k Tokens Output. Die GPT-5.6-Reihe (Sol/Terra/Luna, Juli 2026) ist die Vorgängergeneration, GPT-5 ist als deprecated markiert. Für kreative deutsche Kurzvideo-Skripte empfehle ich GPT-6.1 Sol als Standard mit reasoning effort "low", GPT-6 Astra als Premium-Schalter für wichtige Pitches und GPT-6 Luna für Kleinkram (Captions, Hashtags, Hook-Varianten, Klassifizierung). Ein Skript mit 1.500 Input- und 800 Output-Tokens kostet ohne Reasoning-Tokens etwa 0,011 USD mit 6.1 Sol, 0,055 USD mit Astra und 0,0006 USD mit Luna. Reasoning-Tokens werden als Output abgerechnet und können das grob verdoppeln. Für Neubauten empfiehlt OpenAI die Responses API (POST /v1/responses). Chat Completions wird weiter unterstützt, die Assistants API ist seit 26.08.2026 abgeschaltet, und Astra/6.1 Sol brauchen für Tool-Calling die Responses API. Strukturierte Ausgabe: openai-SDK v7 (ab v7.0.0 Node 22 Pflicht) mit zodTextFormat aus "openai/helpers/zod" und client.responses.parse() liefert output_parsed. Zod v3, v4 und v4-mini werden unterstützt. Gestreamt wird über client.responses.stream() bzw. stream:true in einem Next.js Route Handler, der einen ReadableStream zurückgibt. Prompt-Caching läuft automatisch ab 1.024 Tokens, die TTL steuert prompt_cache_options.ttl (30m Standard, 12h möglich). Cache-Writes kosten bei GPT-6.x extra (1,25-fach), und weil bei Skripten der Output den Preis treibt, spart Caching hier nur wenig. Datenschutz: Mit API-Daten wird standardmäßig nicht trainiert. Abuse-Monitoring-Logs werden bis 30 Tage aufbewahrt. ZDR und EU-Datenresidenz (eu.api.openai.com) gibt es nur nach Freigabe durch OpenAI, nur für neue Projekte und mit Aufpreis. Das ChatGPT-Abo (Plus 20 USD/Monat) enthält keine API-Nutzung, die API wird separat nach Verbrauch abgerechnet.

## Einzelergebnisse

### 1. Die aktuelle Modellgeneration im Oktober 2026 ist GPT-6: GPT-6 Astra (Flaggschiff), GPT-6.1 Sol (seit 29.09.2026), GPT-6 Sol und GPT-6 Luna. Die GPT-5.6-Reihe (Sol/Terra/Luna) ist die Vorgängergeneration, und das ursprüngliche GPT-5 ist als deprecated markiert.

Sicherheit: mittel

Preise in USD je 1 Mio. Tokens, Standard-Tier (Input / Cached Input / Cache-Write / Output):
- gpt-6-astra: 10,00 / 1,00 / 12,50 / 50,00. Kontext 1.050.000, max. Output 128.000. Über 272k Input-Tokens: 2x Input und Cache, 1,5x Output für den ganzen Request.
- gpt-6.1-sol: 2,00 / 0,10 / 2,50 (30m-Write) bzw. 5,00 (12h-Write) / 10,00. Kontext 1.050.000, Output 128.000.
- gpt-6-sol: 2,00 / 0,20 (Changelog) oder 0,10 (Pricing-Seite), Widerspruch ungeklärt / 2,50 / 10,00. Kontext 1.050.000.
- gpt-6-luna: 0,10 / 0,01 / 0,125 / 0,50. Kontext 1.050.000, max. Input 922.000.
Vorgänger: gpt-5.6-sol 4/0,40/20 (Aktionspreis mindestens bis 21.11.2026), gpt-5.6-terra 2/12, gpt-5.6-luna 0,20/1,20 (Preise seit 30.07.2026, beim Launch 2,50/15 bzw. 1/6), gpt-5.5 5/0,50/30, gpt-5.4 2,50/15, gpt-5.4-mini 0,75/4,50, gpt-5 1,25/10 (deprecated), gpt-5-nano 0,05/0,40 (deprecated, OpenAI verweist auf Luna). Die Modell-IDs (z. B. gpt-6.1-sol) sind aus den URL-Slugs der Modellseiten abgeleitet und müssen per GET /v1/models bestätigt werden.

Quellen:

- https://developers.openai.com/api/docs/models/gpt-6-astra („Input $10.00 / cached input $1.00 / cache writes $12.50 / output $50.00; context window 1,050,000; 128,000 max output (Auszug laut Suchergebnis)“)
- https://developers.openai.com/api/docs/models/gpt-6.1-sol („$2.00 input, $0.10 cached input, $2.50 cache writes, $10.00 output; 1,050,000 context window“)
- https://developers.openai.com/api/docs/models/gpt-6-luna („$0.10 input, $0.01 cached input, $0.125 cache writes, $0.50 output ... maximum input tokens: 922,000“)
- https://developers.openai.com/api/docs/models/gpt-6-sol („$2.00 input, $0.20 cached input, $2.50 cache writes, $10.00 output“)
- https://developers.openai.com/api/docs/models/gpt-5.6-sol („$4.00 input, $0.40 cached input, $20.00 output ... promotional ... at least through November 21, 2026“)
- https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/ („starting July 30, API pricing is $2 per million input tokens and $12 per million output tokens for Terra, and $0.20 ... $1.20 ... for Luna“)
- https://developers.openai.com/api/docs/models/gpt-5-nano („deprecated ... start with GPT-5.6 Luna for most new speed- and cost-sensitive workloads“)
- https://developers.openai.com/api/docs/models/compare

### 2. GPT-6.1 Sol ist das beste Preis-Leistungs-Modell für kreative Texte: Laut OpenAI liefert es fast Astra-Intelligenz zu einem Fünftel von Astras Token-Preisen und ist seit 29.09.2026 in der API verfügbar.

Sicherheit: mittel

Empfehlung für SCM: Standardmodell gpt-6.1-sol mit reasoning.effort "low" (kreatives Schreiben braucht wenig Planung, spart Reasoning-Tokens). Premium-Schalter gpt-6-astra für Pitches und Neukunden-Testvideos. gpt-6-luna für Hashtags, Captions, Hook-Varianten, Zusammenfassungen und Klassifizierung (z. B. Lead-Branche). Benchmarks speziell für deutsches kreatives Schreiben habe ich nicht gefunden, deshalb vor der Festlegung einen Blindtest mit 10 echten Briefings machen. Ultrafast (service_tier "ultrafast", laut Community-Post 12/60 USD) ist für Skripte unnötig.

Quellen:

- https://community.openai.com/t/gpt-6-1-sol-in-the-api-a-meaningful-step-up-in-cost-performance/1402388 („near-Astra intelligence for coding, computer use, and professional work at one-fifth of Astra's standard API input and output token prices (Auszug laut Suchergebnis)“)
- https://developers.openai.com/api/docs/changelog („GPT-6.1 Sol released September 29, 2026 ... setting service_tier: "ultrafast" with gpt-6.1-sol“)
- https://openai.com/index/practical-guide-building-gpt-6/ („A model guide for the GPT-6 family“)

### 3. Die GPT-5.6- und GPT-6-Modelle haben einstellbares Reasoning (none, low, medium als Standard, high, xhigh, max). Reasoning-Tokens laufen als Output-Tokens, und für GPT-5.6 Terra/Luna gibt es einen unbestätigten Community-Bericht über stark überhöhte output_tokens.

Sicherheit: mittel

Konsequenz: reasoning: { effort: "low" } oder "none" explizit setzen, sonst gilt medium. max_output_tokens großzügig wählen (4.000 bis 6.000), weil Reasoning mitzählt, sonst kommt status "incomplete" zurück. usage (input_tokens, input_tokens_details.cached_tokens, output_tokens, output_tokens_details.reasoning_tokens) pro Aufruf in der DB speichern und gegen die OpenAI-Rechnung prüfen. Der Bug-Bericht (output_tokens ca. 9x der echten Generierung) ist kein offizielles OpenAI-Statement.

Quellen:

- https://developers.openai.com/api/docs/models/gpt-5.6-luna („none, low, medium (default), high, xhigh, and max (Auszug laut Suchergebnis zu Terra/Luna)“)
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://community.openai.com/t/gpt-5-6-usage-output-tokens-is-9x-actual-generation-re-summed-once-per-reasoning-item-exceeds-max-output-tokens-and-is-what-gets-billed/1386467 („usage.output_tokens is ~9x actual generation ... exceeds max_output_tokens, and is what gets billed“)

### 4. Kosten pro Skript (1.500 Input, 800 Output, ohne Reasoning-Tokens): GPT-6.1 Sol ca. 0,011 USD, GPT-6 Astra ca. 0,055 USD, GPT-6 Luna ca. 0,00055 USD. Mit rund 1.000 Reasoning-Tokens: etwa 0,021, 0,105 bzw. 0,001 USD.

Sicherheit: mittel

Rechenweg (Preis je 1 Mio. Tokens geteilt durch 1.000.000):
- 6.1 Sol: 1.500 x 2 + 800 x 10 = 0,003 + 0,008 = 0,011 USD
- Astra: 1.500 x 10 + 800 x 50 = 0,015 + 0,040 = 0,055 USD
- 6 Luna: 1.500 x 0,10 + 800 x 0,50 = 0,00015 + 0,0004 = 0,00055 USD
- 5.6 Sol 0,022 / 5.6 Terra 0,0126 / 5.6 Luna 0,00126 / 5.5 0,0315 USD
Mit Caching (1.200 statische Tokens gecacht, 6.1 Sol): 0,00012 + 0,0006 + 0,008 = ca. 0,0087 USD, also rund 20 % weniger. Der erste Write kostet aber 1,25x Input. Weil der Output dominiert, ist Caching hier nur ein kleiner Hebel.
Monatsszenario mit 500 Skript-Aufrufen (z. B. 15 Kunden x 8 Videos x ca. 4 Läufe): 6.1 Sol ca. 5,50 bis 10,50 USD, Astra ca. 27,50 bis 52,50 USD, Luna unter 1 USD. Batch/Flex halbieren das.

Quellen:

- https://developers.openai.com/api/docs/pricing („gpt-6.1-sol $2.00 input, $0.10 cached input, $2.50 for a 30m write, and $5.00 for a 12h write ... (Auszug laut Suchergebnis)“)
- https://developers.openai.com/api/docs/models/gpt-6-astra („Input $10.00 ... output $50.00“)
- https://developers.openai.com/api/docs/models/gpt-6-luna („$0.10 input ... $0.50 output“)

### 5. Für neue Projekte empfiehlt OpenAI die Responses API (POST /v1/responses). Chat Completions wird weiter unterstützt und hat kein angekündigtes Abschaltdatum. Die Assistants API ist seit 26.08.2026 abgeschaltet. GPT-6 Astra und GPT-6.1 Sol brauchen die Responses API für Tool-Calling.

Sicherheit: hoch

Für SCM Studio heißt das: ausschließlich client.responses.* nutzen (create, parse, stream). Keine Assistants- oder Threads-Muster aus alten Tutorials übernehmen, Ersatz sind Responses + Conversations API. Die Legacy-Completions-Modelle (gpt-3.5-turbo-instruct, babbage-002, davinci-002) hatten ihr Abschaltdatum am 28.09.2026. Unbestätigt: Laut einem Community-Kommentar stehen die Dashboard-'Prompts'-Objekte ab 30.11.2026 auf der Deprecation-Liste. Prompts deshalb versioniert im Code halten statt als Dashboard-Prompt-ID.

Quellen:

- https://developers.openai.com/api/docs/guides/migrate-to-responses („While Chat Completions remains supported, Responses is recommended for all new projects“)
- https://developers.openai.com/api/docs/deprecations („Assistants API shut down on August 26, 2026 ... recommended replacement is Responses API and Conversations API (Auszug laut Suchergebnis)“)
- https://community.openai.com/t/assistants-api-beta-deprecation-august-26-2026-sunset/1354666 („Assistants API beta deprecation — August 26, 2026 sunset“)
- https://developers.openai.com/api/docs/changelog?mw_entry=2026-08-20-974ac0734e053853 („GPT-6 Astra and GPT-6.1 Sol require the Responses API for tool calling“)
- https://developers.openai.com/api/docs/guides/completions („gpt-3.5-turbo-instruct, babbage-002, and davinci-002 ... shutdown date of September 28, 2026“)

### 6. Structured Outputs mit zod im offiziellen SDK: zodTextFormat(schema, name) aus "openai/helpers/zod" zusammen mit client.responses.parse(); das Ergebnis steht typisiert in response.output_parsed. Unterstützt werden Schemas aus zod/v3, zod/v4 und zod/v4-mini, für Function-Tools gibt es zodResponsesFunction().

Sicherheit: hoch

Code-Muster (lib/ai/skript.ts, nur serverseitig):
import 'server-only';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
const Baustein = z.object({ text: z.string(), bild: z.string(), sekunden: z.number() });
export const Skript = z.object({
  titel: z.string(),
  hook: Baustein, wiedererkennen: Baustein, steigerung: Baustein, pointe: Baustein, aufruf: Baustein,
  hook_varianten: z.array(z.string()),
  caption: z.string(), hashtags: z.array(z.string()),
  offene_fakten: z.array(z.string()), // [PLATZHALTER]-Liste
  hinweis_dreh: z.string().nullable()
});
const client = new OpenAI();
const res = await client.responses.parse({
  model: process.env.OPENAI_MODEL_SKRIPT ?? 'gpt-6.1-sol',
  instructions: STIMME_UND_BAUPLAN,
  input: [{ role: 'user', content: briefingText }],
  text: { format: zodTextFormat(Skript, 'skript') },
  reasoning: { effort: 'low' }, store: false, max_output_tokens: 5000,
  prompt_cache_key: `kunde:${kundeId}`
});
const skript = res.output_parsed; // null bei Refusal oder incomplete prüfen
Hinweise: Im Strict-Modus sind alle Felder Pflicht. Optionale Felder als .nullable() modellieren, nicht nur .optional(). Laut SDK-Doku parsen die Responses-Helper nur Text mit phase final_answer, fehlend oder null. Der alte Zod-4-Fehler (Issue #1602) ist laut aktueller Doku behoben; die zod-Importversion muss zur installierten zod-Version passen.

Quellen:

- https://github.com/openai/openai-node/blob/main/docs/structured-outputs.md („Zod helpers support schemas imported from zod/v3, zod/v4, and zod/v4-mini ... zodTextFormat ... client.responses.parse() ... output_parsed ... zodResponsesFunction() (Auszug laut Suchergebnis)“)
- https://platform.openai.com/docs/guides/structured-outputs („Structured model outputs“)
- https://github.com/openai/openai-node/issues/1602 („zodTextFormat breaks with Zod 4“)

### 7. Das openai-npm-Paket ist bei Version 7.x. v7.0.0 (27.07.2026) hat als einzigen Breaking Change Node.js 22 als Mindestversion eingeführt. Spätere 7.x-Releases (mindestens 7.32.0 in Abhängigkeits-PRs zu sehen) bringen Features.

Sicherheit: mittel

Für SCM Studio: "openai": "^7" und "zod": "^4" in package.json. Node 22 LTS oder 24 lokal und auf Vercel setzen (engines.node ">=22"). Die genaue Versionsnummer vor dem Setup mit npm view openai version prüfen; die offizielle Release-Seite habe ich nicht direkt gesehen, nur Zitate aus Bot-PRs.

Quellen:

- https://github.com/openai/openai-node/releases („require Node.js 22 and codify version support (#2026) (Changelog-Zitat aus Dependabot/Renovate-PRs)“)
- https://github.com/danny-avila/LibreChat/pull/16187 („v7.0.0 only raises the minimum Node.js version to >=22“)
- https://github.com/openai/openai-node/releases/tag/v7.10.0 („Release v7.10.0“)

### 8. Streaming in Next.js: Der Route Handler (app/api/skripte/route.ts, POST) ruft client.responses.stream() oder responses.create({ stream: true }) auf, reicht die Events vom Typ response.output_text.delta in einen ReadableStream weiter und speichert nach finalResponse() das geparste Ergebnis.

Sicherheit: mittel

Code-Muster:
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const { briefing, kundeId } = await req.json();
  const stream = client.responses.stream({ model, instructions, input: briefing, text: { format: zodTextFormat(Skript, 'skript') }, reasoning: { effort: 'low' }, store: false });
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(c) {
      try {
        for await (const ev of stream) { if (ev.type === 'response.output_text.delta') c.enqueue(enc.encode(ev.delta)); }
        const final = await stream.finalResponse(); // output_parsed + usage in DB speichern
      } catch (e) { c.error(e); return; }
      c.close();
    },
    cancel() { stream.abort(); }
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
Im Client per fetch().body.getReader() lesen. Bei strukturiertem Output kommt teilweises JSON an; zur Anzeige einen Partial-JSON-Parser nutzen oder die Bausteine erst nach dem Abschluss rendern und währenddessen ein Skeleton zeigen. Alternative ist das Vercel AI SDK (streamObject/useObject); dessen aktuelle Version habe ich nicht geprüft. Die Event-Namen stammen aus der SDK-Doku und waren in dieser Recherche nicht live abrufbar.

Quellen:

- https://github.com/openai/openai-node („openai-node README: responses.create({ stream: true }) / responses.stream() (nicht live verifiziert, WebFetch nicht verfügbar)“)
- https://github.com/openai/openai-node/blob/main/docs/structured-outputs.md („Responses helpers parse message text only when phase is final_answer, missing, or null“)
- https://github.com/vercel/ai/issues/14011 („v7 (Vercel AI SDK, Hinweis auf Kompatibilität mit openai v7)“)

### 9. Prompt-Caching ist automatisch und greift ab 1.024 Tokens (GPT-5.6 und neuer). Die TTL wird über prompt_cache_options.ttl gesetzt (Standard "30m", in der Responses API auch "12h"), prompt_cache_retention ist deprecated. Cache-Writes werden bei neueren Modellen gesondert abgerechnet, bei GPT-5.6 mit dem 1,25-fachen Input-Preis.

Sicherheit: mittel

Umsetzung: Den statischen Teil an den Anfang stellen (Agentur-Stimme, Bauplan, Regeln, Few-Shot-Beispiele, Kundenprofil), das variable Briefing ans Ende. Nur wenn das Präfix über 1.024 Tokens liegt, wird überhaupt gecacht. prompt_cache_key ist ab GPT-5.6 optional und dient vor allem der getrennten Cache-Abrechnung pro Kunde (z. B. "kunde:<id>"). Die Cache-Write-Preisstufe ersetzt den normalen Input-Preis und wird nicht aufgeschlagen. Der 12h-Write kostet bei 6.1 Sol 5,00 statt 2,50 USD und lohnt sich nur bei vielen Läufen pro Kunde am Tag. Bei Organisationen ohne ZDR war für ältere Modelle 24h der Standard.

Quellen:

- https://developers.openai.com/api/docs/guides/prompt-caching („The minimum cacheable prompt length is 1,024 tokens for GPT-5.6 and later ... The prompt_cache_retention parameter is deprecated. Use prompt_cache_options.ttl instead (Auszug laut Suchergebnis)“)
- https://developers.openai.com/api/docs/pricing („$2.50 for a 30m write, and $5.00 for a 12h write“)
- https://developers.openai.com/cookbook/examples/prompt_caching_201 („Prompt Caching 201“)

### 10. Datenschutz: Mit API-Daten trainiert OpenAI standardmäßig nicht. Abuse-Monitoring-Logs entstehen bei jeder API-Nutzung und bleiben bis zu 30 Tage gespeichert. Zero Data Retention (ZDR) und Modified Abuse Monitoring gibt es nur für freigegebene Kunden.

Sicherheit: hoch

Für SCM Studio: In jedem Request store: false setzen, damit Responses nicht als Anwendungszustand bei OpenAI liegen; Skripte nur in der eigenen DB (später Supabase Frankfurt) speichern. Keine personenbezogenen Daten Dritter ins Briefing (Mitarbeiternamen, Telefonnummern), stattdessen Platzhalter, die die App nach der Generierung ersetzt. Den Data Processing Addendum (DPA) von OpenAI abschließen und OpenAI im Verarbeitungsverzeichnis als Auftragsverarbeiter führen. Laut OpenAI-Mitteilung vom Oktober 2025 betraf die Aufbewahrungsanordnung aus dem NYT-Verfahren keine API-Kunden mit ZDR-Endpunkten.

Quellen:

- https://openai.com/enterprise-privacy/ („does not train our models on your data by default“)
- https://platform.openai.com/docs/guides/your-data („abuse monitoring logs are generated for all API feature usage and retained for up to 30 days, unless longer retention is required by law (Auszug laut Suchergebnis)“)
- https://developers.openai.com/api/docs/guides/your-data („Zero Data Retention eligible endpoints do not retain any customer content for application state“)
- https://openai.com/index/response-to-nyt-data-demands/ („this does not impact API customers who are using Zero Data Retention endpoints under our ZDR amendment“)

### 11. Für EU-Datenresidenz gibt es den Endpunkt eu.api.openai.com (EWR + Schweiz). Voraussetzung sind die Freigabe für Abuse-Monitoring-Controls und ein unterzeichnetes Modified-Retention-Amendment. Die Residenz lässt sich nur für neue Projekte einrichten, und regionale Verarbeitung kostet Aufschlag (bei GPT-5.5 10 %).

Sicherheit: mittel

Laut OpenAI werden Requests in EU-Projekten in der Region und ohne Speicherung (Zero Data Retention) verarbeitet. Praktisch ist das kein Self-Service: Laut Forum schaltet das Sales-Team es frei, ohne Zusage von Genehmigung oder Zeitrahmen. Für eine 2-Personen-Agentur ist das realistisch erst später ein Thema. Bis dahin: Standard-API + DPA + store:false + datensparsame Briefings. Technisch später nur new OpenAI({ baseURL: 'https://eu.api.openai.com/v1', apiKey }) mit dem Key des EU-Projekts. Ob EU-Residenz für die GPT-6-Modelle mit gleichem Aufschlag verfügbar ist, habe ich nicht verifiziert.

Quellen:

- https://openai.com/index/introducing-data-residency-in-europe/ („API requests initiated through these Projects will be handled in-region by OpenAI with zero data retention, meaning model requests and responses are not stored at rest on our servers“)
- https://platform.openai.com/docs/guides/your-data („must be approved for abuse monitoring controls, and execute a Modified Retention amendment (Auszug laut Suchergebnis)“)
- https://community.openai.com/t/how-can-an-api-customer-become-eligible-for-eu-data-residency/1381888 („we can't promise approval or a timeline“)
- https://developers.openai.com/api/docs/models/gpt-5.5 („Regional processing for data residency ... 10% uplift (Auszug laut Suchergebnis)“)

### 12. Das ChatGPT-Abo und die API werden getrennt abgerechnet. ChatGPT Plus (20 USD/Monat) deckt nur die ChatGPT-Apps ab, API-Nutzung wird eigenständig nach Modell und Funktion berechnet und braucht eine eigene Zahlungsmethode im API-Konto.

Sicherheit: hoch

Für SCM Studio ist kein ChatGPT-Abo nötig. Nötig sind: ein API-Konto auf platform.openai.com, Guthaben bzw. Zahlungsmethode, ein eigenes Projekt "scm-studio" mit projektgebundenem API-Key, ein Budget- bzw. Nutzungslimit und Warn-E-Mails. Das Abo bleibt sinnvoll für freies Brainstorming im Team. Abgerechnet wird pro Token, Rechnungen kommen aus dem Platform-Billing.

Quellen:

- https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus („API usage is separate and billed independently (Auszug laut Suchergebnis)“)
- https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform („ChatGPT and the API platform have separate billing systems“)

### 13. Batch und Flex kosten die Hälfte des Standardpreises, Priority das 2,5-fache, der Fast-Modus das Doppelte.

Sicherheit: mittel

Für die Monatsplanung (z. B. am Monatsanfang 8 bis 12 Skriptentwürfe pro Kunde im Hintergrund erzeugen) passt service_tier "flex" oder die Batch API (POST /v1/batches, Ergebnis innerhalb von 24h). Interaktive Einzelskripte im Editor laufen im Standard-Tier mit Streaming. Bei Flex kann es zu höherer Latenz und Kapazitätsfehlern kommen, deshalb mit Retry und Fallback auf Standard bauen (Details nicht live verifiziert).

Quellen:

- https://developers.openai.com/api/docs/pricing („Batch and Flex pricing are available at half the standard API rate (Auszug laut Suchergebnis)“)
- https://openai.com/api-fast-mode/ („Fast mode is priced at 2x the applicable rates (Auszug laut Suchergebnis)“)

### 14. Prompt-Best-Practices von OpenAI: Ton und Rolle gehören in die System- bzw. Developer-Nachricht (in der Responses API in instructions), aufgabenspezifische Details und Beispiele in die User-Nachrichten. Few-Shot heißt, das Modell mit einigen Input/Output-Beispielen zu steuern, ohne Fine-Tuning. Bei Reasoning-Modellen erst zero-shot testen und Beispiele nur bei komplexen Anforderungen ergänzen. Beispiele lassen sich gut als YAML-artige Blöcke pflegen.

Sicherheit: mittel

Aufbau für die SCM-Markenstimme:
1) instructions (statisch, gecacht): Identität ("Du bist Texter bei SCM Creatives, Kiel/Lübecker Bucht"), Zielformat Reel 9:16, 20 bis 45 Sekunden, Bauplan mit den 5 Bausteinen Hook (0 bis 3 s), Wiedererkennen, Steigerung, Pointe, Aufruf, Stilregeln (gesprochene Sprache, kurze Sätze, norddeutsch-locker, keine Gedankenstriche, keine erfundenen Fakten oder Preise, Fehlendes als [PLATZHALTER] im Feld offene_fakten).
2) Few-Shot (statisch je Branche): 2 bis 3 echte, gut gelaufene SCM-Skripte für Gastro, Handwerk und Makler, jeweils Briefing und Skript, als YAML-Block.
3) Kundenprofil (statisch je Kunde): Anrede du/Sie, Tonalität, Zielgruppe, Angebote, Do/Don't, frühere Hooks zur Vermeidung von Wiederholungen.
4) Briefing (variabel): Thema, Drehort, Personen, Aktion, gewünschter Aufruf.
Im selben Aufruf 3 Hook-Varianten erzeugen lassen statt 3 Aufrufe. Danach automatisch prüfen: Gedankenstriche per Regex entfernen, Sekundensumme kontrollieren. Später die Skripte mit den besten Video-Zahlen (Modul Performance) automatisch als Few-Shot-Beispiele vorschlagen. Für die GPT-6-Familie gibt es eigene Prompting-Hinweise im Leitfaden "Using GPT-6".

Quellen:

- https://developers.openai.com/api/docs/guides/prompting („tone and role guidance in the system message ... task-specific details and examples in user messages ... YAML-style or bulleted block (Auszug laut Suchergebnis)“)
- https://developers.openai.com/api/docs/guides/prompt-engineering („few-shot learning ... including a handful of input/output examples ... instead of fine-tuning“)
- https://platform.openai.com/docs/guides/reasoning-best-practices („try zero-shot first, then add examples if the requirements are complex (Auszug laut Suchergebnis)“)
- https://developers.openai.com/api/docs/guides/latest-model („Using GPT-6 ... prompting best practices“)
