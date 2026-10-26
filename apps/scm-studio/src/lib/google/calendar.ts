// Google Kalender, Stufe 1: SCM Studio legt im Google-Konto einen eigenen Kalender "SCM Drehs" an
// und spiegelt Termine dorthin (nur in eine Richtung, best effort). Minimaler Scope
// calendar.app.created: die App sieht und ändert nur Kalender, die sie selbst angelegt hat.
// Refresh-Token verschlüsselt in settings "google" (AES-256-GCM, TOKEN_ENC_KEY).
import "server-only";
import { auth, calendar, type calendar_v3 } from "@googleapis/calendar";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { decrypt, encrypt, sha256 } from "@/lib/crypto";
import { appUrl, integrations } from "@/lib/env";
import { EVENT_KINDS } from "@/lib/labels";
import { getSetting, setSetting } from "@/lib/settings";
import { TZ, todayIso } from "@/lib/time";

export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.app.created"];
export const GOOGLE_CALENDAR_NAME = "SCM Drehs";

export type GoogleSettings = {
  refreshTokenEnc: string;
  calendarId: string;
  connectedAt: string;
  connectedBy: number | null;
  connectedByName?: string | null;
  lastSyncAt?: string | null;
  lastError?: { at: string; message: string } | null;
};

export const googleRedirectUri = () => `${appUrl()}/api/google/callback`;

export function oauthClient() {
  return new auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleRedirectUri());
}

export const getGoogleSettings = () => getSetting<GoogleSettings | null>("google", null);

export type GoogleStatus =
  | { state: "nicht_eingerichtet"; redirectUri: string }
  | { state: "nicht_verbunden"; redirectUri: string }
  | { state: "verbunden"; settings: GoogleSettings; redirectUri: string };

export async function getGoogleStatus(): Promise<GoogleStatus> {
  const redirectUri = googleRedirectUri();
  if (!integrations.google()) return { state: "nicht_eingerichtet", redirectUri };
  const s = await getGoogleSettings();
  if (!s?.refreshTokenEnc) return { state: "nicht_verbunden", redirectUri };
  return { state: "verbunden", settings: s, redirectUri };
}

async function api(): Promise<{ cal: calendar_v3.Calendar; calendarId: string } | null> {
  if (!integrations.google()) return null;
  const s = await getGoogleSettings();
  if (!s?.refreshTokenEnc || !s.calendarId) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: decrypt(s.refreshTokenEnc) });
  return { cal: calendar({ version: "v3", auth: client }), calendarId: s.calendarId };
}

async function patchSettings(patch: Partial<GoogleSettings>) {
  const s = await getGoogleSettings();
  if (!s) return;
  await setSetting("google", { ...s, ...patch });
}

const errorMessage = (e: unknown) => {
  const err = e as { response?: { data?: { error?: { message?: string } | string } }; message?: string };
  const data = err.response?.data?.error;
  return (typeof data === "string" ? data : data?.message) ?? err.message ?? String(e);
};
const statusOf = (e: unknown) => (e as { code?: number; status?: number; response?: { status?: number } }).response?.status ?? (e as { code?: number }).code;

/** Stabile Google-Event-ID (base32hex: nur 0-9 und a-v), eindeutig auch nach Neuaufbau der Datenbank. */
export const googleEventIdFor = (id: number, createdAt: Date) => `scm${sha256(`${id}:${createdAt.toISOString()}`).slice(0, 24)}`;

function eventResource(
  e: typeof schema.events.$inferSelect,
  clientName: string | null,
  leadCompany: string | null,
): calendar_v3.Schema$Event {
  const dayOf = (d: Date) => todayIso(d);
  const lines = [
    EVENT_KINDS[e.kind]?.label ?? e.kind,
    clientName ? `Kunde: ${clientName}` : null,
    leadCompany ? `Anfrage: ${leadCompany}` : null,
    e.notes ? `\n${e.notes}` : null,
    "\nVerwaltet in SCM Studio. Änderungen bitte dort vornehmen.",
  ].filter(Boolean);
  return {
    summary: e.title,
    location: e.location ?? undefined,
    description: lines.join("\n"),
    start: e.allDay ? { date: dayOf(e.startsAt) } : { dateTime: e.startsAt.toISOString(), timeZone: TZ },
    end: e.allDay ? { date: dayOf(e.endsAt) } : { dateTime: e.endsAt.toISOString(), timeZone: TZ },
    source: { title: "SCM Studio", url: `${appUrl()}/kalender/${e.id}` },
    extendedProperties: { private: { scmStudioId: String(e.id) } },
  };
}

/** Termin in Google anlegen oder aktualisieren. Wirft bei Fehlern (Aufrufer fangen ab). */
async function upsertOne(cal: calendar_v3.Calendar, calendarId: string, eventId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ e: schema.events, clientName: schema.clients.name, leadCompany: schema.leads.company })
    .from(schema.events)
    .leftJoin(schema.clients, eq(schema.events.clientId, schema.clients.id))
    .leftJoin(schema.leads, eq(schema.events.leadId, schema.leads.id))
    .where(eq(schema.events.id, eventId));
  if (!row) return;
  const body = eventResource(row.e, row.clientName, row.leadCompany);
  const gid = row.e.googleEventId ?? googleEventIdFor(row.e.id, row.e.createdAt);
  try {
    await cal.events.update({ calendarId, eventId: gid, requestBody: body });
  } catch (e) {
    const st = statusOf(e);
    if (st !== 404 && st !== 410) throw e;
    try {
      await cal.events.insert({ calendarId, requestBody: { ...body, id: gid } });
    } catch (e2) {
      // 409: ID existiert (z. B. gelöscht im Papierkorb) → mit neuer ID anlegen
      if (statusOf(e2) !== 409) throw e2;
      const res = await cal.events.insert({ calendarId, requestBody: body });
      if (res.data.id) await db.update(schema.events).set({ googleEventId: res.data.id }).where(eq(schema.events.id, eventId));
      return;
    }
  }
  if (row.e.googleEventId !== gid) await db.update(schema.events).set({ googleEventId: gid }).where(eq(schema.events.id, eventId));
}

/** Nach dem Speichern eines Termins aufrufen (z. B. in after()). Fehler landen in den Einstellungen. */
export async function mirrorEvent(eventId: number) {
  const a = await api().catch(() => null);
  if (!a) return;
  try {
    await upsertOne(a.cal, a.calendarId, eventId);
    await patchSettings({ lastSyncAt: new Date().toISOString(), lastError: null });
  } catch (e) {
    console.error("Google Kalender: Termin nicht gespiegelt", eventId, errorMessage(e));
    await patchSettings({ lastError: { at: new Date().toISOString(), message: errorMessage(e).slice(0, 300) } });
  }
}

/** Nach dem Löschen eines Termins aufrufen. */
export async function deleteMirror(googleEventId: string | null) {
  if (!googleEventId) return;
  const a = await api().catch(() => null);
  if (!a) return;
  try {
    await a.cal.events.delete({ calendarId: a.calendarId, eventId: googleEventId });
  } catch (e) {
    const st = statusOf(e);
    if (st === 404 || st === 410) return;
    console.error("Google Kalender: Löschen nicht gespiegelt", googleEventId, errorMessage(e));
    await patchSettings({ lastError: { at: new Date().toISOString(), message: errorMessage(e).slice(0, 300) } });
  }
}

/** Alle Termine der nächsten 180 Tage (und 7 Tage zurück) abgleichen. Für Verbinden und Cron. */
export async function syncUpcoming(limit = 250): Promise<{ ok: number; failed: number; skipped?: string }> {
  const a = await api().catch(() => null);
  if (!a) return { ok: 0, failed: 0, skipped: "nicht verbunden" };
  const db = await getDb();
  const now = Date.now();
  const rows = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(and(gte(schema.events.endsAt, new Date(now - 7 * 86_400_000)), lte(schema.events.startsAt, new Date(now + 180 * 86_400_000))))
    .orderBy(asc(schema.events.startsAt))
    .limit(limit);
  let ok = 0;
  let failed = 0;
  let lastError: string | null = null;
  for (const r of rows) {
    try {
      await upsertOne(a.cal, a.calendarId, r.id);
      ok++;
    } catch (e) {
      failed++;
      lastError = errorMessage(e);
      if (statusOf(e) === 401 || /invalid_grant/i.test(lastError)) break; // Zugang widerrufen
    }
  }
  await patchSettings({
    lastSyncAt: new Date().toISOString(),
    lastError: lastError ? { at: new Date().toISOString(), message: lastError.slice(0, 300) } : null,
  });
  return { ok, failed };
}

/** OAuth-Rückkehr: Code tauschen, Kalender "SCM Drehs" anlegen (oder wiederverwenden), speichern. */
export async function completeGoogleConnect(code: string, user: { id: number; name: string }) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  const previous = await getGoogleSettings();
  const refresh = tokens.refresh_token ?? (previous?.refreshTokenEnc ? decrypt(previous.refreshTokenEnc) : null);
  if (!refresh) throw new Error("Google hat keinen Refresh-Token geliefert. Bitte Zugriff in den Google-Kontoeinstellungen entfernen und erneut verbinden.");
  client.setCredentials({ refresh_token: refresh, access_token: tokens.access_token ?? undefined });
  const cal = calendar({ version: "v3", auth: client });

  let calendarId: string | null = null;
  if (previous?.calendarId) {
    try {
      const got = await cal.calendars.get({ calendarId: previous.calendarId });
      calendarId = got.data.id ?? null;
    } catch {
      calendarId = null;
    }
  }
  if (!calendarId) {
    const created = await cal.calendars.insert({
      requestBody: { summary: GOOGLE_CALENDAR_NAME, timeZone: TZ, description: "Drehs, Gespräche und Abgaben aus SCM Studio." },
    });
    calendarId = created.data.id ?? null;
  }
  if (!calendarId) throw new Error("Kalender konnte nicht angelegt werden");

  await setSetting("google", {
    refreshTokenEnc: encrypt(refresh),
    calendarId,
    connectedAt: new Date().toISOString(),
    connectedBy: user.id,
    connectedByName: user.name,
    lastSyncAt: null,
    lastError: null,
  } satisfies GoogleSettings);
}

/** Verbindung trennen: Token bei Google widerrufen (best effort) und lokal löschen. Der Kalender bleibt im Google-Konto. */
export async function disconnectGoogleAccount() {
  const s = await getGoogleSettings();
  if (s?.refreshTokenEnc && integrations.google()) {
    try {
      await oauthClient().revokeToken(decrypt(s.refreshTokenEnc));
    } catch (e) {
      console.error("Google: Widerruf fehlgeschlagen", errorMessage(e));
    }
  }
  const db = await getDb();
  await db.delete(schema.settings).where(eq(schema.settings.key, "google"));
  await db.update(schema.events).set({ googleEventId: null });
}
