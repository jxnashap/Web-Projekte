// Daten für den Bereich Skripte.
import "server-only";
import { and, asc, desc, eq, gte, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { integrations } from "@/lib/env";
import { berlinDateTime, monthIso, monthRange } from "@/lib/time";
import { getAiConfig } from "./ai";
import { estimateUsd } from "./pricing";

export type ScriptFilter = { q?: string; clientId?: number; status?: string; source?: string };

export async function listScripts(f: ScriptFilter) {
  await requireUser();
  const db = await getDb();
  const where: SQL[] = [];
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(schema.scripts.title, like), ilike(schema.scripts.hook, like), ilike(schema.scripts.caption, like))!);
  }
  if (f.clientId) where.push(eq(schema.scripts.clientId, f.clientId));
  if (f.status) where.push(eq(schema.scripts.status, f.status));
  if (f.source) where.push(eq(schema.scripts.source, f.source));
  return db
    .select({
      s: schema.scripts,
      clientName: schema.clients.name,
      clientColor: schema.clients.color,
      videoTitle: schema.videos.title,
      videoStatus: schema.videos.status,
    })
    .from(schema.scripts)
    .leftJoin(schema.clients, eq(schema.scripts.clientId, schema.clients.id))
    .leftJoin(schema.videos, eq(schema.scripts.videoId, schema.videos.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.scripts.updatedAt));
}

export async function getScript(id: number) {
  await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ s: schema.scripts, client: schema.clients, video: schema.videos, author: schema.teamMembers.name })
    .from(schema.scripts)
    .leftJoin(schema.clients, eq(schema.scripts.clientId, schema.clients.id))
    .leftJoin(schema.videos, eq(schema.scripts.videoId, schema.videos.id))
    .leftJoin(schema.teamMembers, eq(schema.scripts.createdBy, schema.teamMembers.id))
    .where(eq(schema.scripts.id, id));
  return row ?? null;
}

/** Kunden und Videos für Auswahlfelder (Videos ohne Skript zuerst). */
export async function getScriptOptions() {
  await requireUser();
  const db = await getDb();
  const clients = await db
    .select({ id: schema.clients.id, name: schema.clients.name, branche: schema.clients.branche, ort: schema.clients.ort, color: schema.clients.color })
    .from(schema.clients)
    .where(ne(schema.clients.status, "beendet"))
    .orderBy(asc(schema.clients.name));
  const videos = await db
    .select({
      id: schema.videos.id,
      title: schema.videos.title,
      clientId: schema.videos.clientId,
      format: schema.videos.format,
      status: schema.videos.status,
      month: schema.videos.month,
      scriptId: schema.videos.scriptId,
    })
    .from(schema.videos)
    .where(ne(schema.videos.status, "online"))
    .orderBy(asc(schema.videos.month), asc(schema.videos.title));
  return { clients, videos };
}

/** KI-Nutzung im laufenden Monat (Berliner Zeit). */
export async function getAiUsage() {
  await requireUser();
  const db = await getDb();
  const { from } = monthRange(monthIso());
  const rows = await db
    .select({
      model: schema.aiRuns.model,
      calls: sql<number>`count(*)::int`,
      failed: sql<number>`count(*) filter (where not ${schema.aiRuns.ok})::int`,
      input: sql<number>`coalesce(sum(${schema.aiRuns.inputTokens}),0)::int`,
      cached: sql<number>`coalesce(sum(${schema.aiRuns.cachedTokens}),0)::int`,
      output: sql<number>`coalesce(sum(${schema.aiRuns.outputTokens}),0)::int`,
      reasoning: sql<number>`coalesce(sum(${schema.aiRuns.reasoningTokens}),0)::int`,
    })
    .from(schema.aiRuns)
    .where(gte(schema.aiRuns.at, berlinDateTime(from)))
    .groupBy(schema.aiRuns.model);
  const real = rows.filter((r) => r.model !== "demo");
  const demo = rows.find((r) => r.model === "demo");
  let usd = 0;
  let unknownPrice = false;
  for (const r of real) {
    const c = estimateUsd(r.model, r);
    if (c === null) unknownPrice = true;
    else usd += c;
  }
  const cfg = await getAiConfig();
  return {
    live: integrations.openai(),
    config: cfg,
    calls: real.reduce((s, r) => s + r.calls, 0),
    failed: real.reduce((s, r) => s + r.failed, 0),
    tokens: real.reduce((s, r) => s + r.input + r.output, 0),
    reasoning: real.reduce((s, r) => s + r.reasoning, 0),
    usd,
    unknownPrice,
    demoCalls: demo?.calls ?? 0,
    byModel: real,
  };
}

/** Skripte, die noch an keinem Video hängen (für die Verknüpfung). */
export async function unlinkedScripts(clientId: number) {
  const db = await getDb();
  return db
    .select({ id: schema.scripts.id, title: schema.scripts.title })
    .from(schema.scripts)
    .where(and(eq(schema.scripts.clientId, clientId), isNull(schema.scripts.videoId)));
}
