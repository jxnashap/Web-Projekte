// SCM Creative Engine: Kategorien, Ziele und die festen Ausgabeformate (Structured Outputs) für Ideen und Skripte.
// Wird von Server und Browser genutzt, enthält nichts Geheimes.
import { z } from "zod";

/** Kategorien, kombinierbar. `dramaturgy` steuert, wie die KI ein Skript dieser Kategorie aufbaut. */
export const CATEGORIES = [
  {
    key: "comedy",
    label: "Comedy, Sketch, POV",
    short: "Comedy",
    hint: "Alltagssituationen, Missverständnisse, unerwartete Wendungen",
    dramaturgy:
      "Situation in der ersten Sekunde, ohne Erklärung. Ein Missverständnis oder eine Erwartung, die kippt. Eskalation in 2 bis 3 Stufen, jede absurder. Pointe als Wendung, optional ein kurzer Nachklapp. Dialoge kurz, natürlich, gesprochen wie im Norden. Kein Erklärtext.",
  },
  {
    key: "ad",
    label: "Werbung, Performance-Ad, Evergreen",
    short: "Werbung",
    hint: "Problem, Aufmerksamkeit, Nutzen, Beweis, Handlung",
    dramaturgy:
      "Problem oder Wunsch der Zielgruppe sofort zeigen, Aufmerksamkeit über ein konkretes Bild. Nutzen in einem Satz. Beweis durch Zeigen statt Behaupten (Ergebnis, Ablauf, echte Reaktion). Klare Handlungsaufforderung. Mehrere testbare Hooks für dieselbe Anzeige. Zeitlos formulieren, damit das Video lange läuft.",
  },
  {
    key: "education",
    label: "Education, Expertenwissen",
    short: "Wissen",
    hint: "Irrtümer, konkrete Tipps, Vergleiche, häufige Fragen",
    dramaturgy:
      "Hook über einen verbreiteten Irrtum, eine häufige Frage oder einen überraschenden Vergleich. Dann 2 bis 3 konkrete, sofort nutzbare Punkte, jeweils mit Bild oder Demonstration. Ein Aha-Moment. Kein Vortrag, keine Fachbegriffe ohne Bild. Abschluss mit Merksatz oder Frage.",
  },
  {
    key: "persoenlichkeit",
    label: "Persönlichkeit, Behind the Scenes",
    short: "Einblick",
    hint: "Mitarbeitende, ehrliche Reaktionen, Challenges, Teamdynamik",
    dramaturgy:
      "Echte Menschen aus dem Betrieb, ehrliche Reaktionen statt gespielter Werbung. Eine kleine Challenge, ein Ritual oder ein Einblick, der Nähe schafft. Spannungsbogen über eine Frage an das Team oder einen Wettstreit. Ende mit einem sympathischen Moment.",
  },
  {
    key: "aktion",
    label: "Events, Aktionen, Angebote",
    short: "Aktion",
    hint: "Ankündigungen, Rabatte, neue Produkte, Veranstaltungen",
    dramaturgy:
      "In den ersten Sekunden: was, für wen, bis wann. Ein Bild, das Lust macht. Frist oder Knappheit nur, wenn sie stimmt. Alle Fakten (Datum, Preis, Ort) als [PLATZHALTER], falls nicht im Briefing. Klarer Abschluss: wo und wie mitmachen oder buchen.",
  },
  {
    key: "cinematic",
    label: "Cinematic, Ästhetik, Storytelling",
    short: "Cinematic",
    hint: "Bildsprache, Atmosphäre, Bewegung, Sounddesign",
    dramaturgy:
      "Wirkung über Bild und Ton statt Dialog. Präzise Shotlist: Kamerabewegung, Licht, Details, Übergänge. Sounddesign und Musikstimmung je Szene. Höchstens ein oder zwei Sätze Sprechertext oder Text im Bild. Ein emotionaler Bogen von Ruhe zu Höhepunkt.",
  },
  {
    key: "interaktion",
    label: "Interaktion, Umfragen, Community",
    short: "Interaktion",
    hint: "Entweder-oder, Alltagsfragen, Quiz, Rankings",
    dramaturgy:
      "Eine Frage oder ein Format, das Kommentare von selbst auslöst: Entweder-oder, Ranking, Quiz, leicht kontroverse Alltagsfrage. Antwortmöglichkeiten sichtbar im Bild. Personen zeigen ihre Wahl mit Reaktion. Ende mit der Frage an die Zuschauer.",
  },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];
export const categoryLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.short ?? k;

export const GOALS = ["Reichweite", "Anfragen und Leads", "Buchungen und Besuche", "Markenbekanntheit", "Mitarbeitende finden", "Angebot bewerben"] as const;
export const TONES = ["Humorvoll", "Locker", "Herzlich", "Sachlich", "Hochwertig"] as const;
export const LENGTHS = [15, 30, 45, 60] as const;

/** Eingaben für die Ideen (ohne Personendaten; der Name des Betriebs wird ersetzt). */
export const Briefing = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  ideaId: z.coerce.number().int().positive().optional(),
  videoId: z.coerce.number().int().positive().optional(),
  topic: z.string().max(1500, "Thema bitte kürzer fassen (höchstens 1.500 Zeichen)").optional(),
  categories: z.array(z.enum(CATEGORY_KEYS)).min(1, "Bitte mindestens eine Kategorie wählen").max(3, "Höchstens drei Kategorien"),
  goal: z.string().min(1, "Bitte ein Ziel wählen").max(80),
  tone: z.string().min(1).max(40),
  length: z.coerce.number().int().refine((n) => (LENGTHS as readonly number[]).includes(n), "Bitte eine Länge wählen"),
  people: z.coerce.number().int().min(1).max(6),
  frame: z.string().max(800, "Rahmen bitte kürzer fassen").optional(),
});
export type Briefing = z.infer<typeof Briefing>;

// --- KI-Ausgabe: Konzepte (Structured Outputs: alle Felder Pflicht) ---------------------------------
const ProductionOut = z.object({
  actors: z.number().int().describe("Personen vor der Kamera"),
  roles: z.array(z.string()).describe("Rollen, z. B. Chef, Gast, Azubi"),
  props: z.array(z.string()).describe("Requisiten"),
  location: z.string().describe("Drehort im Betrieb"),
  minutes: z.number().int().describe("Geschätzte Drehzeit in Minuten"),
});

export const Concept = z.object({
  title: z.string().describe("Arbeitstitel, höchstens 8 Wörter"),
  categories: z.array(z.enum(CATEGORY_KEYS)).describe("1 bis 3 Kategorien, die erste ist die führende"),
  hook: z.string().describe("Exakter Einstieg der ersten 1 bis 3 Sekunden: was man sieht und hört"),
  concept: z.string().describe("Was im Video passiert, 2 bis 4 Sätze, konkret"),
  mechanic: z.string().describe("Die kreative Mechanik in einem Satz: warum es anders ist als das Übliche"),
  production: ProductionOut,
  scores: z.object({
    hook: z.number().int().describe("Stärke des Hooks, 1 bis 10"),
    originality: z.number().int().describe("Originalität, 1 bis 10"),
    feasibility: z.number().int().describe("Drehbarkeit mit Smartphone im Betrieb, 1 bis 10"),
    fit: z.number().int().describe("Passung zu Kunde, Ziel und Tonalität, 1 bis 10"),
    reason: z.string().describe("Ehrliche Begründung der Bewertung in einem Satz, auch Schwächen"),
  }),
});
export type Concept = z.infer<typeof Concept>;
export const ConceptSet = z.object({ concepts: z.array(Concept).describe("Genau fünf grundverschiedene Konzepte") });

// --- KI-Ausgabe: Skript -----------------------------------------------------------------------------
export const Scene = z.object({
  start: z.number().int().describe("Beginn in Sekunden"),
  end: z.number().int().describe("Ende in Sekunden"),
  label: z.string().describe("Abschnitt: erste Szene immer Hook, eine Szene mit Aufforderung am Ende heißt Aufruf, sonst passend zur Dramaturgie"),
  camera: z.string().describe("Kamera: Einstellungsgröße, Position, Bewegung, kurz"),
  action: z.string().describe("Was im Bild passiert"),
  dialogue: z.string().describe("Wer sagt was, als 'Rolle: Text'; leer, wenn niemand spricht"),
  overlay: z.string().describe("Text im Bild; leer, wenn keiner"),
  sound: z.string().describe("Ton, Musik oder Soundeffekt; leer, wenn nichts Besonderes"),
  cut: z.string().describe("Schnitt: Cut, Zoom, Übergang, Tempo; leer, wenn normaler Schnitt"),
});
export type Scene = z.infer<typeof Scene>;

export const ScriptPlan = z.object({
  title: z.string().describe("Arbeitstitel, höchstens 8 Wörter"),
  hook: z.string().describe("Der Hook, wie er im Video steht"),
  concept: z.string().describe("Handlung in 2 bis 3 Sätzen"),
  scenes: z.array(Scene).describe("4 bis 9 Szenen, lückenlos von 0 bis zur Ziellänge"),
  cta: z.string().describe("Abschluss oder Aufforderung; leer, wenn ein CTA dem Video schaden würde"),
  caption: z.string().describe("Caption 1 bis 2 Sätze mit einem passenden Emoji, ohne Hashtags"),
  hashtags: z.array(z.string()).describe("5 bis 8 Hashtags, regional und zur Branche"),
  production: ProductionOut,
  alternativeHooks: z.array(z.string()).describe("Genau drei alternative Hooks mit anderem Ansatz"),
  alternativePunchlines: z.array(z.string()).describe("Zwei alternative Pointen oder Enden"),
});
export type ScriptPlan = z.infer<typeof ScriptPlan>;

export const REFINEMENTS = [
  { key: "kuerzer", label: "Kürzer" },
  { key: "lustiger", label: "Lustiger" },
  { key: "lokal", label: "Mehr lokal" },
  { key: "pointe", label: "Andere Pointe" },
  { key: "einfacher", label: "Einfacher zu drehen" },
] as const;

/** Sekunden → "MM:SS" */
export const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** Ein Konzept, wie es die Oberfläche zwischen Ideen und Skript weiterreicht (auch aus einer gespeicherten Idee). */
export type ConceptInput = Pick<Concept, "title" | "categories" | "hook" | "concept" | "mechanic"> & { production?: Concept["production"] };
