// Bauplan, Formate und Hilfen rund um den Ablauf eines Skripts. Server und Browser, nichts Geheimes.

/** Der SCM-Bauplan: jedes Skript folgt diesen fünf Abschnitten. */
export const BAUPLAN = ["Hook", "Wiedererkennen", "Steigerung", "Pointe", "Aufruf"] as const;

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

/** Gedankenstriche entfernen (Hausregel): Spannen werden zu „bis“, sonst Komma. */
export const noDashes = (t: string) =>
  t
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 bis $2")
    .replace(/\s+[–—]\s+/g, ", ")
    .replace(/[–—]/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();

/** Sekunden → "MM:SS" */
export const tc = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** "MM:SS" → Sekunden (ungültig: null) */
export const toSec = (v: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

type BeatLike = { tc: string; label: string; text: string; shot?: string; action?: string; overlay?: string; sound?: string; cut?: string };
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
