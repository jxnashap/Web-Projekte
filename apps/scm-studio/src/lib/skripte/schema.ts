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
  format: z.string({ error: "Bitte ein Format wählen" }).min(1, "Bitte ein Format wählen").max(60, "Das Format bitte kürzer fassen (höchstens 60 Zeichen)"),
  ziel: z.string({ error: "Bitte ein Ziel wählen" }).min(1, "Bitte ein Ziel wählen").max(80),
  ton: z.string({ error: "Bitte eine Tonalität wählen" }).min(1, "Bitte eine Tonalität wählen").max(40),
  length: z.coerce
    .number({ error: "Bitte eine Länge wählen" })
    .int()
    .refine((n) => (LENGTHS as readonly number[]).includes(n), "Bitte eine Länge wählen"),
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

/** "MM:SS" → Sekunden (ungültig: null) */
export const toSec = (v: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

type BeatLike = { tc: string; label: string; text: string; shot?: string };
const isLabel = (b: BeatLike, label: string) => b.label.trim().toLowerCase() === label.toLowerCase();

/**
 * Eine Quelle der Wahrheit: der Hook ist der Text des Abschnitts „Hook“, der Aufruf der Text des letzten Abschnitts „Aufruf“.
 * Ältere Skripte hatten beides zusätzlich als eigene Felder. Fehlt der passende Abschnitt oder ist er leer,
 * wird der alte Wert in den Ablauf übernommen, damit beim Speichern nichts verloren geht.
 */
export function mergeHookAndCta<B extends BeatLike>(beats: B[], hook: string | null | undefined, cta: string | null | undefined): BeatLike[] {
  const out: BeatLike[] = beats.map((b) => ({ ...b }));
  const h = hook?.trim();
  if (h) {
    const i = out.findIndex((b) => isLabel(b, "Hook"));
    if (i === -1) out.unshift({ tc: "00:00", label: "Hook", text: h, shot: "" });
    else if (!out[i].text.trim()) out[i] = { ...out[i], text: h };
  }
  const c = cta?.trim();
  if (c) {
    const i = out.findLastIndex((b) => isLabel(b, "Aufruf"));
    if (i === -1) {
      const last = out[out.length - 1];
      out.push({ tc: last ? tc((toSec(last.tc) ?? 0) + 4) : "00:00", label: "Aufruf", text: c, shot: "" });
    } else if (!out[i].text.trim()) out[i] = { ...out[i], text: c };
  }
  return out;
}

/** Hook und Aufruf aus dem Ablauf ableiten (für Listen, Suche und das Video). */
export function hookAndCta(beats: BeatLike[]) {
  const hook = beats.find((b) => isLabel(b, "Hook"))?.text.trim() || null;
  const cta = beats.findLast((b) => isLabel(b, "Aufruf"))?.text.trim() || null;
  return { hook, cta };
}

/** Ungefähre Länge: Start des letzten Abschnitts plus etwa 4 Sekunden, auf 5 Sekunden gerundet. Leerer Ablauf: null. */
export function lengthLabel(beats: BeatLike[]): string | null {
  if (!beats.some((b) => b.text.trim())) return null;
  const last = toSec(beats[beats.length - 1]?.tc ?? "");
  if (last === null) return null;
  const sec = Math.max(5, Math.round((last + 4) / 5) * 5);
  return `ca. ${sec} Sekunden`;
}

/** Anzeigename des Skript-Status */
export const scriptStatusLabel = (status: string) => (status === "final" ? "Fertig" : "Entwurf");

/** Eindeutige Formular-ID des Editors je Skript (Next behält besuchte Seiten verborgen im DOM, IDs dürfen sich nicht doppeln). */
export const scriptFormId = (id: number | "neu") => `skript-form-${id}`;
