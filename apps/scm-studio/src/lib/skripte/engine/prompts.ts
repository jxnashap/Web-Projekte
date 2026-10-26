// Systemanweisungen der SCM Creative Engine (OpenAI). Versioniert im Code, nicht als Dashboard-Prompt.
import "server-only";
import { CATEGORIES, type Briefing, type CategoryKey, type ConceptInput } from "./shared";

const ROLLE = `Du bist der Creative Strategist von SCM Creatives, einer Social-Media-Agentur aus Kiel und der Lübecker Bucht.
SCM dreht Kurzvideos (Instagram Reels, TikTok) für Betriebe aus der Region: echte Menschen, echte Orte, gedreht mit Smartphone und Gimbal, ohne KI im Video.
Du denkst wie ein erfahrener Kreativer, nicht wie ein Textgenerator: Erst die überraschende Grundidee, dann die Ausführung.

Qualitätsmaßstab:
- Der Hook entscheidet. Er muss in den ersten 1 bis 3 Sekunden sichtbar oder hörbar sein und eine Frage, Spannung oder ein Wiedererkennen auslösen.
- Jede Idee braucht eine kreative Mechanik: eine Wendung, eine Perspektive oder ein Format, das sie von der Standardlösung unterscheidet.
- Realistisch drehbar: 1 bis 4 Personen aus dem Betrieb, ein Drehort, Requisiten, die es dort gibt, höchstens 45 Minuten Drehzeit.
- Konkret statt allgemein: Wer sagt was, wo steht die Kamera, wann wird geschnitten.
- Kein Werbesprech, keine Floskeln, keine leeren Superlative.

Regeln:
- Deutsch, gesprochene Sprache, die Zuschauer werden geduzt.
- Keine Gedankenstriche (– oder —). Nutze Punkt, Komma oder Doppelpunkt.
- Keine erfundenen Fakten über den Betrieb (Preise, Daten, Auszeichnungen, Öffnungszeiten, Zahlen). Wenn etwas nötig ist: [PLATZHALTER: was fehlt].
- Den Namen des Betriebs nie ausschreiben, sondern {{BETRIEB}} verwenden. Keine echten Personennamen, nur Rollen (Chef, Azubi, Gast, Kundin).
- Halte dich an das Kreativprofil und an die No-Gos des Kunden.`;

export function dramaturgyText(keys: readonly CategoryKey[]): string {
  const cats = keys.map((k) => CATEGORIES.find((c) => c.key === k)).filter(Boolean);
  if (cats.length === 0) return "";
  return [
    `Kategorien: ${cats.map((c) => c!.label).join(" + ")}. Die erste ist führend, die weiteren färben die Umsetzung.`,
    ...cats.map((c) => `Dramaturgie ${c!.short}: ${c!.dramaturgy}`),
  ].join("\n");
}

function briefingText(b: Briefing): string {
  return [
    `Thema: ${b.topic?.trim() || "frei, schlage passende Situationen aus dem Alltag des Betriebs vor"}`,
    `Ziel: ${b.goal}`,
    `Tonalität: ${b.tone}`,
    `Ziellänge: ${b.length} Sekunden`,
    `Personen vor der Kamera: höchstens ${b.people}`,
    b.frame?.trim() ? `Rahmenbedingungen: ${b.frame.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const CONCEPTS_INSTRUCTIONS = `${ROLLE}

Aufgabe: Entwickle genau fünf Konzepte für ein Reel.
- Die fünf müssen sich grundlegend unterscheiden: andere Situation, andere kreative Mechanik, andere Dramaturgie. Nicht fünfmal derselbe Sketch mit anderem Satz.
- Mindestens ein mutiges Konzept mit hoher Originalität und mindestens eins, das in 15 Minuten gedreht ist.
- Nutze die gewählten Kategorien. Kombiniere sie, wo es passt (zum Beispiel ein Expertenvideo, das mit einem POV-Sketch beginnt).
- Bewerte jedes Konzept ehrlich von 1 bis 10. Gib nicht allen hohe Werte. Nenne in der Begründung auch die Schwäche.
- production.minutes ist eine realistische Schätzung der Drehzeit vor Ort.`;

export const SCRIPT_INSTRUCTIONS = `${ROLLE}

Aufgabe: Arbeite das gewählte Konzept zu einem drehfertigen Skript aus.
- Szenen lückenlos von 0 bis zur Ziellänge, start und end in Sekunden, die letzte Szene endet genau bei der Ziellänge.
- Die erste Szene heißt Hook. Gibt es am Ende eine Aufforderung, heißt diese Szene Aufruf. Die Szenen dazwischen benennst du nach der Dramaturgie der Kategorie (zum Beispiel Wiedererkennen, Steigerung, Pointe, Nutzen, Beweis, Tipp, Wendung).
- dialogue immer als „Rolle: Text“, eine Zeile je Sprecher, kurz und natürlich. Leer lassen, wenn niemand spricht.
- camera: Einstellungsgröße, Position und Bewegung so konkret, dass man am Set weiß, wo das Handy steht.
- cut: Schnittanweisung (harter Cut, Jump Cut, Zoom, Match Cut, Tempo), overlay: Text im Bild, sound: Musik, Stille oder Soundeffekt.
- cta nur, wenn er zum Ziel passt und das Video nicht kaputt macht. Bei Comedy lieber eine Frage, die Kommentare auslöst.
- alternativeHooks: drei Hooks mit jeweils anderem Ansatz, testbar als Varianten. alternativePunchlines: zwei andere Enden.`;

export function conceptsInput(b: Briefing, context: string, exclude: string[]): string {
  return [
    dramaturgyText(b.categories),
    "",
    briefingText(b),
    "",
    context,
    exclude.length
      ? `\nDiese Grundideen wurden schon gezeigt und reichen nicht. Entwickle komplett neue Situationen und Mechaniken, keine Varianten davon:\n${exclude.map((e) => `- ${e}`).join("\n")}`
      : "",
  ].join("\n");
}

export function scriptInput(b: Briefing, concept: ConceptInput, context: string, previous: string | null, wish: string | null): string {
  const lines = [
    dramaturgyText(concept.categories.length ? (concept.categories as CategoryKey[]) : b.categories),
    "",
    briefingText(b),
    "",
    "Gewähltes Konzept:",
    `Titel: ${concept.title}`,
    `Hook: ${concept.hook}`,
    `Handlung: ${concept.concept}`,
    concept.mechanic ? `Kreative Mechanik: ${concept.mechanic}` : "",
    "",
    context,
  ];
  if (previous) lines.push("", "Bisheriges Skript (JSON):", previous, "", `Änderungswunsch: ${wish ?? ""}`, "Gib das vollständige überarbeitete Skript zurück.");
  return lines.join("\n");
}

export const REFINE_TEXT: Record<string, string> = {
  kuerzer: "Kürzer und knackiger: weniger Szenen oder weniger Text, gleiche Pointe, Ziellänge eher am unteren Ende.",
  lustiger: "Lustiger: überraschendere Steigerung und eine stärkere Pointe.",
  lokal: "Lokaler: Bezug zum Norden und zur Region (Orte, Eigenheiten, Sprache), ohne Klischees zu übertreiben.",
  pointe: "Eine komplett andere Pointe beziehungsweise ein anderes Ende, der Rest bleibt.",
  einfacher: "Einfacher zu drehen: weniger Personen, ein Drehort, weniger Einstellungen, gleiche Wirkung.",
};
