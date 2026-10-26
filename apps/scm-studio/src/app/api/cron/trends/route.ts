// Nächtliche Trend-Recherche (TikTok und Instagram über die Websuche von OpenAI), Vorschläge landen unter Ideen & Skripte.
// Vercel Cron: GET mit "Authorization: Bearer <CRON_SECRET>".
import { isCronRequest } from "@/lib/cron";
import { integrations } from "@/lib/env";
import { runTrendResearch } from "@/lib/skripte/trends";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response("Nicht erlaubt", { status: 401 });
  if (!integrations.openai()) return Response.json({ uebersprungen: "OPENAI_API_KEY fehlt" });
  const r = await runTrendResearch({ trigger: "nacht" });
  return Response.json(r, { status: r.ok ? 200 : 500 });
}
