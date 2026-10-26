// Kalender-Abo (iCal). Öffentlich erreichbar, geschützt durch den geheimen Token aus settings "ical".
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { safeEqual } from "@/lib/crypto";
import { EVENT_KINDS } from "@/lib/labels";
import { buildIcs } from "@/lib/kalender/ical";
import { getSetting } from "@/lib/settings";
import { todayIso } from "@/lib/time";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const ical = await getSetting<{ token: string } | null>("ical", null);
  if (!ical?.token || !token || !safeEqual(token, ical.token)) {
    return new Response("Nicht gefunden", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const db = await getDb();
  const now = Date.now();
  const rows = await db
    .select({ e: schema.events, clientName: schema.clients.name, leadCompany: schema.leads.company })
    .from(schema.events)
    .leftJoin(schema.clients, eq(schema.events.clientId, schema.clients.id))
    .leftJoin(schema.leads, eq(schema.events.leadId, schema.leads.id))
    .where(and(gte(schema.events.endsAt, new Date(now - 90 * 86_400_000)), lte(schema.events.startsAt, new Date(now + 400 * 86_400_000))))
    .orderBy(asc(schema.events.startsAt))
    .limit(2000);

  const body = buildIcs(
    rows.map(({ e, clientName, leadCompany }) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      kindLabel: EVENT_KINDS[e.kind]?.label ?? e.kind,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      allDay: e.allDay,
      location: e.location,
      description: [clientName ? `Kunde: ${clientName}` : null, leadCompany ? `Anfrage: ${leadCompany}` : null, e.notes].filter(Boolean).join("\n") || null,
      updatedAt: e.updatedAt,
      createdAt: e.createdAt,
    })),
    { name: "SCM Studio", host: url.host || "scm-studio", dayOf: (d) => todayIso(d) },
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="scm-studio.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
