"use server";
// Zahlen erfassen (manuell, CSV) und Konten verbinden.
import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { type ActionState, done, fail, parseForm } from "@/lib/action";
import { assertUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { integrations } from "@/lib/env";
import { syncInstagramAccount } from "@/lib/instagram/sync";
import { setSetting } from "@/lib/settings";
import { todayIso } from "@/lib/time";
import { isIsoDay } from "@/lib/kalender/dates";
import { mediaKey, normTitle, parseCount, parseDay, parseSeconds } from "./parse";

// ---------------- Manuell ----------------
const count = (label: string, required = false, zeroHint = false) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      const n = parseCount(v);
      if (n === null) {
        if (required) ctx.addIssue({ code: "custom", message: `Bitte ${label} eintragen${zeroHint ? ", bei keinen eine 0" : ""}` });
        return null;
      }
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: "custom", message: "Bitte eine ganze Zahl ab 0 eingeben, z. B. 4.100" });
        return null;
      }
      return n;
    });

const metricSchema = z.object({
  videoId: z.coerce.number({ error: "Bitte ein Video wählen" }).int().positive("Bitte ein Video wählen"),
  measuredOn: z.string({ error: "Bitte das Datum wählen" }).refine(isIsoDay, "Bitte das Datum wählen"),
  views: count("die Aufrufe", true),
  reach: count("die Reichweite"),
  // Likes und Kommentare zeigt Instagram immer; leer würde als 0 gespeichert und die Rate verfälschen
  likes: count("die Likes", true, true),
  comments: count("die Kommentare", true, true),
  shares: count("Geteilt"),
  saves: count("Gespeichert"),
  avgWatchSeconds: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const n = parseSeconds(v);
      if (Number.isNaN(n)) ctx.addIssue({ code: "custom", message: "Sekunden als Zahl, z. B. 8,5" });
      return Number.isNaN(n) ? null : n;
    }),
});

/** Nicht-API-Quellen: pro Video und Tag gilt nur ein Eintrag, der neueste ersetzt den alten. */
async function replaceOtherManual(videoId: number, measuredOn: string, keep: "manuell" | "csv") {
  const db = await getDb();
  await db
    .delete(schema.videoMetrics)
    .where(
      and(
        eq(schema.videoMetrics.videoId, videoId),
        eq(schema.videoMetrics.measuredOn, measuredOn),
        eq(schema.videoMetrics.source, keep === "manuell" ? "csv" : "manuell"),
      ),
    );
}

export async function saveMetric(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = parseForm(metricSchema, fd);
  if (!parsed.success) return parsed.state;
  const v = parsed.data;
  if (v.measuredOn > todayIso()) return fail("Das Datum liegt in der Zukunft.", { measuredOn: ["Das Datum liegt in der Zukunft"] });
  const db = await getDb();
  const [video] = await db.select({ id: schema.videos.id, title: schema.videos.title }).from(schema.videos).where(eq(schema.videos.id, v.videoId));
  if (!video) return fail("Video nicht gefunden.", { videoId: ["Bitte ein Video wählen"] });
  const values = {
    videoId: v.videoId,
    measuredOn: v.measuredOn,
    views: v.views ?? 0,
    reach: v.reach,
    likes: v.likes ?? 0,
    comments: v.comments ?? 0,
    shares: v.shares,
    saves: v.saves,
    avgWatchSeconds: v.avgWatchSeconds,
    totalInteractions: (v.likes ?? 0) + (v.comments ?? 0) + (v.shares ?? 0) + (v.saves ?? 0),
    source: "manuell",
  };
  await db
    .insert(schema.videoMetrics)
    .values(values)
    .onConflictDoUpdate({
      target: [schema.videoMetrics.videoId, schema.videoMetrics.measuredOn, schema.videoMetrics.source],
      set: { ...values, createdAt: new Date() },
    });
  // Eine manuelle Eingabe ist eine bewusste Korrektur: ein CSV-Wert vom selben Tag fällt weg
  await replaceOtherManual(v.videoId, v.measuredOn, "manuell");
  await audit(user.id, "video_metrics", v.videoId, "erfasst", { measuredOn: v.measuredOn, views: values.views });
  refresh();
  return done(`Zahlen für „${video.title}“ gespeichert`);
}

export async function deleteMetric(id: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  const [row] = await db.delete(schema.videoMetrics).where(eq(schema.videoMetrics.id, id)).returning();
  if (!row) return fail("Messpunkt nicht gefunden.");
  await audit(user.id, "video_metrics", row.videoId, "geloescht", { measuredOn: row.measuredOn, source: row.source, views: row.views });
  refresh();
  return done("Messpunkt gelöscht");
}

// ---------------- CSV-Import ----------------
export type ImportRow = {
  line: number;
  link?: string;
  title?: string;
  date?: string;
  views?: string;
  reach?: string;
  likes?: string;
  comments?: string;
  shares?: string;
  saves?: string;
  watch?: string;
};

export type CheckedRow = {
  line: number;
  ok: boolean;
  errors: string[];
  videoId: number | null;
  videoTitle: string | null;
  clientName: string | null;
  matchedBy: "link" | "titel" | null;
  measuredOn: string | null;
  values: { views: number; reach: number | null; likes: number; comments: number; shares: number | null; saves: number | null; avgWatchSeconds: number | null } | null;
};

const importRowSchema = z.object({
  line: z.number().int(),
  link: z.string().max(500).optional(),
  title: z.string().max(500).optional(),
  date: z.string().max(40).optional(),
  views: z.string().max(40).optional(),
  reach: z.string().max(40).optional(),
  likes: z.string().max(40).optional(),
  comments: z.string().max(40).optional(),
  shares: z.string().max(40).optional(),
  saves: z.string().max(40).optional(),
  watch: z.string().max(40).optional(),
});
const importSchema = z.array(importRowSchema).max(2000, "Höchstens 2.000 Zeilen pro Import");

async function checkRows(rows: ImportRow[]): Promise<CheckedRow[]> {
  const db = await getDb();
  const videos = await db
    .select({ id: schema.videos.id, title: schema.videos.title, url: schema.videos.url, ext: schema.videos.externalMediaId, clientName: schema.clients.name })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id));
  const byKey = new Map<string, (typeof videos)[number]>();
  for (const v of videos) {
    const k = mediaKey(v.url);
    if (k) byKey.set(k, v);
    if (v.ext) byKey.set(`ext:${v.ext}`, v);
  }
  const titles = videos.map((v) => ({ v, t: normTitle(v.title) }));
  const today = todayIso();

  return rows.map((r) => {
    const errors: string[] = [];
    let video: (typeof videos)[number] | undefined;
    let matchedBy: CheckedRow["matchedBy"] = null;
    const key = mediaKey(r.link);
    if (key) video = byKey.get(key);
    if (!video && r.link && /^\d+$/.test(r.link.trim())) video = byKey.get(`ext:${r.link.trim()}`);
    if (video) matchedBy = "link";
    if (!video && r.title) {
      const t = normTitle(r.title);
      const exact = titles.filter((x) => x.t === t);
      const partial = exact.length ? exact : t.length >= 6 ? titles.filter((x) => x.t.includes(t) || t.includes(x.t)) : [];
      if (partial.length === 1) {
        video = partial[0].v;
        matchedBy = "titel";
      } else if (partial.length > 1) errors.push("Titel passt zu mehreren Videos");
    }
    if (!video && !errors.length) errors.push(r.link || r.title ? "Kein passendes Video gefunden" : "Link oder Titel fehlt");

    const measuredOn = parseDay(r.date);
    if (!measuredOn) errors.push(r.date ? `Datum „${r.date}“ nicht lesbar` : "Datum fehlt");
    else if (measuredOn > today) errors.push("Datum liegt in der Zukunft");

    const n = (raw: string | undefined, label: string, required = false) => {
      const v = parseCount(raw);
      if (v === null && required) errors.push(`${label} fehlt`);
      if (v !== null && Number.isNaN(v)) {
        errors.push(`${label}: „${raw}“ ist keine Zahl`);
        return null;
      }
      return v;
    };
    const views = n(r.views, "Aufrufe", true);
    const values = {
      views: views ?? 0,
      reach: n(r.reach, "Reichweite"),
      likes: n(r.likes, "Likes") ?? 0,
      comments: n(r.comments, "Kommentare") ?? 0,
      shares: n(r.shares, "Geteilt"),
      saves: n(r.saves, "Gespeichert"),
      avgWatchSeconds: (() => {
        const w = parseSeconds(r.watch);
        if (Number.isNaN(w)) {
          errors.push(`Wiedergabezeit „${r.watch}“ nicht lesbar`);
          return null;
        }
        return w;
      })(),
    };
    return {
      line: r.line,
      ok: errors.length === 0,
      errors,
      videoId: video?.id ?? null,
      videoTitle: video?.title ?? null,
      clientName: video?.clientName ?? null,
      matchedBy,
      measuredOn,
      values: errors.length ? null : values,
    };
  });
}

/** Prüft die Zeilen und ordnet Videos zu (ohne zu speichern). */
export async function checkImport(rows: ImportRow[]): Promise<{ ok: true; rows: CheckedRow[] } | { ok: false; error: string }> {
  await assertUser();
  const parsed = importSchema.safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Daten" };
  return { ok: true, rows: await checkRows(parsed.data) };
}

/** Speichert alle fehlerfreien Zeilen (Quelle "csv"; ein vorhandener Eintrag für Video und Tag wird ersetzt). */
export async function commitImport(rows: ImportRow[]): Promise<ActionState> {
  const user = await assertUser();
  const parsed = importSchema.safeParse(rows);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Daten");
  const checked = await checkRows(parsed.data);
  const good = checked.filter((c) => c.ok && c.videoId && c.measuredOn && c.values);
  if (!good.length) return fail("Keine gültigen Zeilen zum Importieren.");
  const db = await getDb();
  // gleiche Video+Datum-Kombination nur einmal (letzte Zeile gewinnt)
  const unique = new Map<string, (typeof good)[number]>();
  for (const g of good) unique.set(`${g.videoId}:${g.measuredOn}`, g);
  for (const g of unique.values()) {
    const v = g.values!;
    const values = {
      videoId: g.videoId!,
      measuredOn: g.measuredOn!,
      ...v,
      totalInteractions: v.likes + v.comments + (v.shares ?? 0) + (v.saves ?? 0),
      source: "csv",
    };
    await db
      .insert(schema.videoMetrics)
      .values(values)
      .onConflictDoUpdate({ target: [schema.videoMetrics.videoId, schema.videoMetrics.measuredOn, schema.videoMetrics.source], set: { ...values, createdAt: new Date() } });
    // der neuere Import ersetzt einen manuellen Eintrag vom selben Tag
    await replaceOtherManual(values.videoId, values.measuredOn, "csv");
  }
  await audit(user.id, "video_metrics", null, "csv_import", { zeilen: unique.size, fehler: checked.length - good.length });
  refresh();
  const skipped = checked.length - good.length;
  return done(`${unique.size} Messpunkt${unique.size === 1 ? "" : "e"} importiert${skipped ? `, ${skipped} Zeile${skipped === 1 ? "" : "n"} übersprungen` : ""}`, {
    redirectTo: "/zahlen?reiter=videos",
  });
}

// ---------------- Konten ----------------
export async function createConnectLink(clientId: number): Promise<ActionState> {
  const user = await assertUser();
  if (!integrations.instagram()) return fail("Die Instagram-Anbindung ist noch nicht eingerichtet.");
  const db = await getDb();
  const [client] = await db.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).where(eq(schema.clients.id, clientId));
  if (!client) return fail("Kunde nicht gefunden.");
  const token = randomToken(18);
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await setSetting(`connect:${token}`, { clientId, platform: "instagram", expiresAt, createdAt: new Date().toISOString(), createdBy: user.id });
  await audit(user.id, "social_account", null, "verbindungslink", { clientId, expiresAt });
  refresh();
  return done(`Verbindungslink für ${client.name} erzeugt (7 Tage gültig)`);
}

export async function revokeConnectLink(token: string): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  await db.delete(schema.settings).where(eq(schema.settings.key, `connect:${token}`));
  await audit(user.id, "social_account", null, "verbindungslink_geloescht");
  refresh();
  return done("Link gelöscht");
}

export async function syncAccountNow(accountId: number): Promise<ActionState> {
  const user = await assertUser();
  if (!integrations.instagram()) return fail("Die Instagram-Anbindung ist noch nicht eingerichtet.");
  try {
    const r = await syncInstagramAccount(accountId);
    await audit(user.id, "social_account", accountId, "abgleich", r);
    refresh();
    return done(`Abgleich fertig: ${r.matched} Videos zugeordnet, ${r.points} Messpunkte`);
  } catch (e) {
    refresh();
    return fail(e instanceof Error ? e.message : "Abgleich fehlgeschlagen");
  }
}

export async function disconnectAccount(accountId: number): Promise<ActionState> {
  const user = await assertUser();
  const db = await getDb();
  await db
    .update(schema.socialAccounts)
    .set({ status: "widerrufen", accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null })
    .where(and(eq(schema.socialAccounts.id, accountId), inArray(schema.socialAccounts.status, ["aktiv", "abgelaufen"])));
  await audit(user.id, "social_account", accountId, "getrennt");
  refresh();
  return done("Konto getrennt. Bisherige Zahlen bleiben erhalten.");
}
