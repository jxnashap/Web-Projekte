// KI-Einstellungen (Modell, Denkaufwand). Die Creative Engine selbst liegt in ./engine.
import "server-only";
import { getSetting } from "@/lib/settings";
import { DEFAULT_AI, EFFORTS, type Effort } from "./pricing";

export type AiConfig = { model: string; effort: Effort };

export async function getAiConfig(): Promise<AiConfig> {
  const raw = await getSetting<Partial<AiConfig>>("ai", {});
  const effort = EFFORTS.includes(raw.effort as Effort) ? (raw.effort as Effort) : DEFAULT_AI.effort;
  return { model: raw.model?.trim() || DEFAULT_AI.model, effort };
}
