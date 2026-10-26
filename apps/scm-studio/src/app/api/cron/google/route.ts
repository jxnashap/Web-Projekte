// Täglicher Abgleich mit Google Kalender (heilt Termine, deren Übertragung fehlgeschlagen ist).
// Vercel Cron: GET mit "Authorization: Bearer <CRON_SECRET>".
import { isCronRequest } from "@/lib/cron";
import { syncUpcoming } from "@/lib/google/calendar";

export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response("Nicht erlaubt", { status: 401 });
  const result = await syncUpcoming();
  return Response.json({ erfolgreich: result.ok, fehlgeschlagen: result.failed, hinweis: result.skipped ?? null });
}
