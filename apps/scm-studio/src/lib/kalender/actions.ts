"use server";
// Termine anlegen, ändern, löschen; Kalender-Abo und Google-Verbindung verwalten.
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { type ActionState, done, fail, parseForm } from "@/lib/action";
import { assertUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { deleteMirror, disconnectGoogleAccount, mirrorEvent, syncUpcoming } from "@/lib/google/calendar";
import { EVENT_KINDS } from "@/lib/labels";
import { setSetting } from "@/lib/settings";
import { berlinDateTime, todayIso } from "@/lib/time";
import { addDaysIso, isIsoDay } from "./dates";
import { asView, calHref } from "./href";

const zTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM");
const zId = z.coerce.number().int().positive();

const eventSchema = z
  .object({
    id: zId.optional(),
    title: z.string().max(200, "Titel ist zu lang").optional(),
    kind: z.enum(Object.keys(EVENT_KINDS) as [string, ...string[]], { error: "Art wählen" }),
    allDay: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    startDate: z.string({ error: "Datum fehlt" }).refine(isIsoDay, "Datum fehlt"),
    startTime: zTime.optional(),
    endDate: z.string().refine(isIsoDay, "Enddatum prüfen").optional(),
    endTime: zTime.optional(),
    location: z.string().max(300).optional(),
    clientId: zId.optional(),
    leadId: zId.optional(),
    teamIds: z.array(zId).optional(),
    notes: z.string().max(4000, "Notizen sind zu lang").optional(),
    // Ansicht, aus der ein neuer Termin angelegt wurde (danach dorthin springen)
    ansicht: z.string().max(10).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.allDay && !v.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Beginn fehlt" });
    if (!v.allDay && !v.endTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "Ende fehlt" });
    if (!v.title && !(v.kind === "dreh" && v.clientId))
      ctx.addIssue({ code: "custom", path: ["title"], message: v.kind === "dreh" ? "Titel fehlt (oder einen Kunden wählen)" : "Titel fehlt" });
  });

export async function saveEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(eventSchema, fd);
  if (!parsed.success) return parsed.state;
  const v = parsed.data;
  const db = await getDb();

  const endDay = v.endDate ?? v.startDate;
  let startsAt: Date;
  let endsAt: Date;
  if (v.allDay) {
    startsAt = berlinDateTime(v.startDate);
    endsAt = berlinDateTime(addDaysIso(endDay < v.startDate ? v.startDate : endDay, 1));
  } else {
    startsAt = berlinDateTime(v.startDate, v.startTime);
    endsAt = berlinDateTime(endDay, v.endTime);
    if (endsAt <= startsAt) return fail("Das Ende liegt vor dem Beginn.", { endTime: ["Das Ende muss nach dem Beginn liegen"] });
  }
  if (endsAt.getTime() - startsAt.getTime() > 31 * 86_400_000) return fail("Ein Termin kann höchstens 31 Tage dauern.", { endDate: ["Zeitraum zu lang"] });

  let title = v.title?.trim();
  if (!title && v.clientId) {
    const [c] = await db.select({ name: schema.clients.name }).from(schema.clients).where(eq(schema.clients.id, v.clientId));
    title = `Dreh ${c?.name ?? ""}`.trim();
  }

  const values = {
    title: title!,
    kind: v.kind,
    allDay: v.allDay,
    startsAt,
    endsAt,
    location: v.location ?? null,
    clientId: v.clientId ?? null,
    leadId: v.leadId ?? null,
    teamIds: v.teamIds ?? [],
    notes: v.notes ?? null,
    updatedAt: new Date(),
  };

  let id = v.id;
  if (id) {
    const res = await db.update(schema.events).set(values).where(eq(schema.events.id, id)).returning({ id: schema.events.id });
    if (!res.length) return fail("Termin nicht gefunden.");
    await audit(user.id, "event", id, "geaendert", { title: values.title, start: startsAt.toISOString() });
  } else {
    const [row] = await db.insert(schema.events).values(values).returning({ id: schema.events.id });
    id = row.id;
    await audit(user.id, "event", id, "angelegt", { title: values.title, start: startsAt.toISOString() });
  }
  const eventId = id;
  after(() => mirrorEvent(eventId));
  refresh();
  if (v.id) return done("Termin gespeichert", { id: eventId });
  // Neu: zum Datum des Termins in der aktuellen Ansicht springen und ihn kurz hervorheben
  return done("Termin angelegt", { id: eventId, redirectTo: calHref({ ansicht: asView(v.ansicht), datum: v.startDate, extra: { neu_id: eventId } }) });
}

export async function deleteEvent(id: number, view?: string): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [row] = await db.delete(schema.events).where(eq(schema.events.id, id)).returning();
  if (!row) return fail("Termin nicht gefunden.");
  await audit(user.id, "event", id, "geloescht", { title: row.title, start: row.startsAt.toISOString() });
  after(() => deleteMirror(row.googleEventId));
  // kein refresh(): die Detailseite gibt es nicht mehr, der Client wechselt zum Kalender
  return done("Termin gelöscht", { redirectTo: calHref({ ansicht: asView(view), datum: todayIso(row.startsAt) }) });
}

/** Neuen geheimen Abo-Link erzeugen (der alte wird sofort ungültig). */
export async function renewIcalToken(): Promise<ActionState> {
  const user = await assertUser();
  await setSetting("ical", { token: randomToken(24), createdAt: new Date().toISOString() });
  await audit(user.id, "settings", null, "ical_token_neu");
  refresh();
  return done("Neuer Abo-Link erzeugt. Der alte Link funktioniert nicht mehr.");
}

export async function disconnectGoogle(): Promise<ActionState> {
  const user = await assertUser();
  await disconnectGoogleAccount();
  await audit(user.id, "settings", null, "google_getrennt");
  refresh();
  return done("Google Kalender getrennt. Der Kalender „SCM Drehs“ bleibt in eurem Google-Konto.");
}

export async function syncGoogleNow(): Promise<ActionState> {
  const user = await assertUser();
  const r = await syncUpcoming();
  await audit(user.id, "settings", null, "google_abgleich", r);
  refresh();
  if (r.skipped) return fail("Google Kalender ist nicht verbunden.");
  return r.failed ? fail(`${r.ok} Termine abgeglichen, ${r.failed} fehlgeschlagen.`) : done(`${r.ok} Termine mit Google abgeglichen`);
}
