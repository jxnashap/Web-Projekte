// Webhook für das Website-Quiz: POST mit JSON und Header "x-studio-secret: <LEADS_WEBHOOK_SECRET>".
// Antwort 201 { ok, id } bzw. 200 { ok, id, duplicate } bei doppelter Einsendung.
import { safeEqual } from "@/lib/crypto";
import { mapWebsiteLead, storeWebsiteLead, webhookSchema } from "@/lib/crm/webhook";

const MAX_BYTES = 20_000;
// Einfache Drossel pro Instanz (die Website-Function ist der einzige erwartete Absender)
const HITS = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const win = 10 * 60 * 1000;
  const arr = (HITS.get(key) ?? []).filter((t) => now - t < win);
  arr.push(now);
  HITS.set(key, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length > 30;
}

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function secret() {
  if (process.env.LEADS_WEBHOOK_SECRET) return process.env.LEADS_WEBHOOK_SECRET;
  // lokal ohne Einrichtung testbar, in Produktion Pflicht
  return process.env.NODE_ENV === "production" ? null : "scm-studio-lokal";
}

export async function POST(request: Request) {
  const expected = secret();
  if (!expected) return json(503, { ok: false, msg: "Eingang ist noch nicht eingerichtet (LEADS_WEBHOOK_SECRET fehlt)." });
  const given = request.headers.get("x-studio-secret") ?? "";
  if (!safeEqual(given, expected)) return json(401, { ok: false, msg: "Nicht berechtigt." });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unbekannt";
  if (limited(ip)) return json(429, { ok: false, msg: "Zu viele Anfragen." });

  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > MAX_BYTES) return json(413, { ok: false, msg: "Zu groß." });
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json(415, { ok: false, msg: "Bitte JSON senden." });
  const text = await request.text();
  if (text.length > MAX_BYTES) return json(413, { ok: false, msg: "Zu groß." });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json(400, { ok: false, msg: "Ungültiges JSON." });
  }
  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) return json(422, { ok: false, msg: "Felder ungültig." });

  let values;
  try {
    values = mapWebsiteLead(parsed.data);
  } catch (e) {
    return json(422, { ok: false, msg: (e as Error).message });
  }
  try {
    const r = await storeWebsiteLead(values);
    return json(r.duplicate ? 200 : 201, { ok: true, id: r.id, duplicate: r.duplicate, score: values.score });
  } catch (e) {
    console.error("Anfrage konnte nicht gespeichert werden:", (e as Error).message);
    return json(500, { ok: false, msg: "Speichern fehlgeschlagen." });
  }
}

export function GET() {
  return json(405, { ok: false, msg: "Nur POST." });
}
