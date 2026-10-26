// Nächtliches Aufräumen: Dokumente, die länger als 14 Tage im Papierkorb liegen, samt PDFs endgültig löschen.
// Vercel Cron: GET mit "Authorization: Bearer <CRON_SECRET>".
import { isCronRequest } from "@/lib/cron";
import { purgeExpired } from "@/lib/dokumente/papierkorb";

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response("Nicht erlaubt", { status: 401 });
  try {
    return Response.json({ geloescht: await purgeExpired() });
  } catch (e) {
    return Response.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
