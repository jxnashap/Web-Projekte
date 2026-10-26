// Geschätzte API-Kosten je Modell in US-Dollar pro 1 Mio. Tokens (Standard-Tier).
// Quelle: Recherche vom 26.10.2026 über die OpenAI-Modellseiten (developers.openai.com/api/docs/models/…).
// Vor dem Livegang auf developers.openai.com/api/docs/pricing prüfen und hier anpassen.
// Hinweise: Reasoning-Tokens sind in output_tokens enthalten. Cache-Schreibzuschläge sind nicht eingerechnet.
export const PRICES_USD_PER_MTOK: Record<string, { input: number; cached: number; output: number; label: string }> = {
  "gpt-6.1-sol": { input: 2, cached: 0.1, output: 10, label: "GPT-6.1 Sol" },
  "gpt-6-astra": { input: 10, cached: 1, output: 50, label: "GPT-6 Astra" },
  "gpt-6-sol": { input: 2, cached: 0.2, output: 10, label: "GPT-6 Sol" },
  "gpt-6-luna": { input: 0.1, cached: 0.01, output: 0.5, label: "GPT-6 Luna" },
  "gpt-5.6-sol": { input: 4, cached: 0.4, output: 20, label: "GPT-5.6 Sol" },
  // Für Terra/Luna ist kein Cache-Preis belegt: vorsichtig wie normaler Input gerechnet
  "gpt-5.6-terra": { input: 2, cached: 2, output: 12, label: "GPT-5.6 Terra" },
  "gpt-5.6-luna": { input: 0.2, cached: 0.2, output: 1.2, label: "GPT-5.6 Luna" },
};

export const PRICES_CHECKED_ON = "26.10.2026";

export const DEFAULT_AI = { model: "gpt-6.1-sol", effort: "low" as const };
export const EFFORTS = ["none", "low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];

export const modelLabel = (m: string) => (m === "demo" ? "Demo" : (PRICES_USD_PER_MTOK[m]?.label ?? m));

/** Kosten in US-Dollar oder null, wenn das Modell keinen Preis hinterlegt hat. */
export function estimateUsd(model: string, t: { input: number; cached: number; output: number }): number | null {
  const p = PRICES_USD_PER_MTOK[model];
  if (!p) return null;
  const uncached = Math.max(0, t.input - t.cached);
  return (uncached * p.input + t.cached * p.cached + t.output * p.output) / 1_000_000;
}
