// Täglicher Instagram-Abgleich aller verbundenen Konten (inkl. Token-Verlängerung).
// Vercel Cron: GET mit "Authorization: Bearer <CRON_SECRET>".
import { isCronRequest } from "@/lib/cron";
import { integrations } from "@/lib/env";
import { syncAllInstagram } from "@/lib/instagram/sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response("Nicht erlaubt", { status: 401 });
  if (!integrations.instagram()) return Response.json({ uebersprungen: "Instagram nicht eingerichtet" });
  const results = await syncAllInstagram();
  return Response.json({ konten: results.length, fehler: results.filter((r) => !r.ok).length, ergebnisse: results });
}
