// Struktur eines Skript-Entwurfs (KI und Demo liefern dasselbe Format) und Auswahllisten für den Generator.
// Wird von Server und Browser genutzt, enthält deshalb nichts Geheimes.
import { z } from "zod";

/** Der SCM-Bauplan: jedes Skript folgt diesen fünf Abschnitten. */
export const BAUPLAN = ["Hook", "Wiedererkennen", "Steigerung", "Pointe", "Aufruf"] as const;

// Für Structured Outputs: alle Felder Pflicht, keine Längenvorgaben im Schema (prüfen wir danach selbst).
export const DraftBeat = z.object({
  tc: z.string().describe("Timecode MM:SS, aufsteigend"),
  label: z.string().describe("Abschnitt aus dem Bauplan: Hook, Wiedererkennen, Steigerung, Pointe oder Aufruf"),
  text: z.string().describe("Was gesagt wird oder im Bild steht, kurz und gesprochen"),
  shot: z.string().describe("Einstellung für den Dreh mit dem Smartphone: Perspektive, Ort, Requisite"),
});

export const ScriptDraft = z.object({
  title: z.string().describe("Arbeitstitel des Videos, höchstens 8 Wörter"),
  hook: z.string().describe("Der Hook: erster Satz oder Text im Bild"),
  hookVariants: z.array(z.string()).describe("Genau drei alternative Hooks mit anderem Ansatz"),
  beats: z.array(DraftBeat).describe("Ablauf nach dem Bauplan, 5 bis 8 Beats"),
  caption: z.string().describe("Caption für den Post, 1 bis 2 Sätze, ein passendes Emoji"),
  cta: z.string().describe("Aufruf am Ende, eine Frage oder Aufforderung, die Kommentare auslöst"),
  hashtags: z.array(z.string()).describe("5 bis 8 Hashtags ohne Leerzeichen, regional und zur Branche"),
});
export type ScriptDraft = z.infer<typeof ScriptDraft>;
export type DraftBeat = z.infer<typeof DraftBeat>;

export const FORMATS = [
  "Kunden-Sketch",
  "POV-Sketch",
  "Entweder oder",
  "Ortsanalyse",
  "Angebot mit Frist",
  "Recruiting",
  "Einblick",
  "Tipp",
] as const;

export const ZIELE = [
  "Mehr Gäste oder Kunden",
  "Mehr Anfragen",
  "Mitarbeitende finden",
  "Bekannter werden in der Region",
  "Angebot bewerben",
] as const;

export const TONES = ["Humorvoll", "Locker", "Herzlich", "Sachlich"] as const;

export const LENGTHS = [15, 30, 60] as const;

export const REFINEMENTS = [
  { key: "kuerzer", label: "Kürzer" },
  { key: "lustiger", label: "Lustiger" },
  { key: "lokal", label: "Mehr lokal" },
] as const;

/** Eingaben des Generators (ohne Personendaten). */
export const GenInput = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  videoId: z.coerce.number().int().positive().optional(),
  format: z.string().min(1, "Format wählen").max(60),
  ziel: z.string().min(1, "Ziel wählen").max(80),
  ton: z.string().min(1, "Tonalität wählen").max(40),
  length: z.coerce.number().int().refine((n) => (LENGTHS as readonly number[]).includes(n), "Länge wählen"),
  briefing: z.string().max(1500, "Briefing bitte kürzer fassen (höchstens 1.500 Zeichen)").optional(),
  refine: z.string().max(300).optional(),
  previous: z.string().max(20000).optional(),
});
export type GenInput = z.infer<typeof GenInput>;

/** Kontext zum Betrieb, der an die KI geht: nur Branche und Region, nie Namen. */
export type GenContext = { branche: string; region: string | null; clientName: string | null };

export type GenResult = {
  draft: ScriptDraft;
  demo: boolean;
  model: string;
  usage?: { input: number; cached: number; output: number; reasoning: number };
  notice?: string;
};

/** Gedankenstriche entfernen (Hausregel), Platzhalter für den Betrieb einsetzen, Hashtags säubern. */
export function cleanDraft(d: ScriptDraft, clientName: string | null): ScriptDraft {
  const fix = (t: string) =>
    t
      .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 bis $2")
      .replace(/\s+[–—]\s+/g, ", ")
      .replace(/[–—]/g, ", ")
      .replace(/\{\{\s*BETRIEB\s*\}\}/g, clientName ?? "[BETRIEB]")
      .replace(/\s{2,}/g, " ")
      .trim();
  const tags = d.hashtags
    .map((h) => h.trim().replace(/\s+/g, ""))
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
  return {
    title: fix(d.title),
    hook: fix(d.hook),
    hookVariants: d.hookVariants.map(fix).filter(Boolean).slice(0, 3),
    beats: d.beats.slice(0, 10).map((b) => ({ tc: b.tc.trim(), label: fix(b.label), text: fix(b.text), shot: fix(b.shot) })),
    caption: fix(d.caption),
    cta: fix(d.cta),
    hashtags: Array.from(new Set(tags)).slice(0, 10),
  };
}

/** Sekunden → "MM:SS" */
export const tc = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
