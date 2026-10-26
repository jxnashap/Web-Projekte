// Öffentliche Adresse der App für Links, die außerhalb geöffnet werden (Abo-Link, Verbindungslink).
// APP_URL hat Vorrang; ohne APP_URL (lokale Vorschau) wird die Adresse aus der Anfrage genommen.
import "server-only";
import { headers } from "next/headers";
import { appUrl } from "@/lib/env";

export async function publicOrigin(): Promise<string> {
  if (process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL) return appUrl();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return appUrl();
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
