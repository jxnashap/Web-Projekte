// Datenzugriff Kalender (nur Server). Jede Funktion prüft die Anmeldung.
import "server-only";
import { and, asc, eq, gt, gte, inArray, lt, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { CalendarEvent } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { berlinDateTime } from "@/lib/time";

export type EventRow = {
  e: CalendarEvent;
  clientName: string | null;
  clientColor: string | null;
  leadCompany: string | null;
};

/** Termine, die den Zeitraum [from, to) (Berliner Tage) berühren. */
export async function getEventsBetween(fromDay: string, toDay: string): Promise<EventRow[]> {
  await requireUser();
  const db = await getDb();
  return db
    .select({
      e: schema.events,
      clientName: schema.clients.name,
      clientColor: schema.clients.color,
      leadCompany: schema.leads.company,
    })
    .from(schema.events)
    .leftJoin(schema.clients, eq(schema.events.clientId, schema.clients.id))
    .leftJoin(schema.leads, eq(schema.events.leadId, schema.leads.id))
    .where(and(lt(schema.events.startsAt, berlinDateTime(toDay)), gt(schema.events.endsAt, berlinDateTime(fromDay))))
    .orderBy(asc(schema.events.startsAt));
}

export async function getEvent(id: number): Promise<EventRow | null> {
  await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({
      e: schema.events,
      clientName: schema.clients.name,
      clientColor: schema.clients.color,
      leadCompany: schema.leads.company,
    })
    .from(schema.events)
    .leftJoin(schema.clients, eq(schema.events.clientId, schema.clients.id))
    .leftJoin(schema.leads, eq(schema.events.leadId, schema.leads.id))
    .where(eq(schema.events.id, id));
  return row ?? null;
}

export type CalendarOptions = {
  clients: { id: number; name: string; color: string; city: string | null }[];
  leads: { id: number; company: string; name: string; ort: string | null }[];
  team: { id: number; name: string; initials: string }[];
};

/** Auswahllisten für das Terminformular */
export async function getCalendarOptions(): Promise<CalendarOptions> {
  await requireUser();
  const db = await getDb();
  const [clients, leads, team] = await Promise.all([
    db
      .select({ id: schema.clients.id, name: schema.clients.name, color: schema.clients.color, city: schema.clients.city })
      .from(schema.clients)
      .where(notInArray(schema.clients.status, ["beendet"]))
      .orderBy(asc(schema.clients.name)),
    db
      .select({ id: schema.leads.id, company: schema.leads.company, name: schema.leads.name, ort: schema.leads.ort })
      .from(schema.leads)
      .where(notInArray(schema.leads.stage, ["gewonnen", "verloren"]))
      .orderBy(asc(schema.leads.company)),
    db
      .select({ id: schema.teamMembers.id, name: schema.teamMembers.name, initials: schema.teamMembers.initials })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.active, true))
      .orderBy(asc(schema.teamMembers.id)),
  ]);
  return { clients, leads, team };
}

/** Videos eines Kunden mit Drehdatum an diesem Tag (für Drehtermine). */
export async function getShootVideos(clientId: number, days: string[]) {
  await requireUser();
  if (!days.length) return [];
  const db = await getDb();
  return db
    .select({ id: schema.videos.id, title: schema.videos.title, status: schema.videos.status, format: schema.videos.format, isTest: schema.videos.isTest, shootDate: schema.videos.shootDate })
    .from(schema.videos)
    .where(and(eq(schema.videos.clientId, clientId), inArray(schema.videos.shootDate, days)))
    .orderBy(asc(schema.videos.id));
}

/** Für die Ansichten: Videos mit Drehdatum im Zeitraum, je Kunde und Tag zählbar. */
export async function getShootVideosBetween(fromDay: string, toDay: string) {
  await requireUser();
  const db = await getDb();
  return db
    .select({ clientId: schema.videos.clientId, shootDate: schema.videos.shootDate, title: schema.videos.title })
    .from(schema.videos)
    .where(and(gte(schema.videos.shootDate, fromDay), lt(schema.videos.shootDate, toDay)));
}

export type IcalSettings = { token: string; createdAt: string } | null;
export const getIcalSettings = () => getSetting<IcalSettings>("ical", null);
