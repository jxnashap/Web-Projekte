// Kontext für die Creative Engine: Kreativprofil, Kunden-Gedächtnis (gedreht, geplant, verworfen),
// vorsichtige Muster aus den Zahlen und die Referenz-Skripte. An die KI gehen keine Personendaten:
// der Name des Betriebs wird überall durch {{BETRIEB}} ersetzt.
import "server-only";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { CreativeProfile } from "@/db/schema";
import { getSetting } from "@/lib/settings";
import { PROFILE_FIELDS } from "./profile";
import { DEFAULT_REFERENZEN, REFERENZEN_KEY } from "./referenzen";

const BRANCHE_TEXT: Record<string, string> = {
  gastronomie: "Gastronomie (Restaurant, Café, Bar)",
  immobilien: "Immobilien (Makler, Verwaltung)",
  handwerk: "Handwerk (Meisterbetrieb)",
  unternehmen: "regionales Unternehmen",
};

export type EngineContext = {
  clientName: string | null;
  branche: string;
  region: string;
  profile: CreativeProfile | null;
  done: string[];
  rejected: string[];
  performance: string[];
  formatStats: string[];
  references: string;
};

const fmt = (n: number) => new Intl.NumberFormat("de-DE").format(Math.round(n));

export async function engineContext(clientId: number | undefined): Promise<EngineContext> {
  const db = await getDb();
  const references = (await getSetting<string>(REFERENZEN_KEY, "")).trim() || DEFAULT_REFERENZEN;

  // Zahlen: letzter Messwert je Video (Agentur gesamt, für Muster je Format)
  const latest = await db
    .selectDistinctOn([schema.videoMetrics.videoId], {
      videoId: schema.videoMetrics.videoId,
      views: schema.videoMetrics.views,
      shares: schema.videoMetrics.shares,
      saves: schema.videoMetrics.saves,
      comments: schema.videoMetrics.comments,
      avgWatch: schema.videoMetrics.avgWatchSeconds,
      clientId: schema.videos.clientId,
      title: schema.videos.title,
      format: schema.videos.format,
    })
    .from(schema.videoMetrics)
    .innerJoin(schema.videos, eq(schema.videoMetrics.videoId, schema.videos.id))
    .orderBy(schema.videoMetrics.videoId, desc(schema.videoMetrics.measuredOn));

  const byFormat = new Map<string, number[]>();
  for (const m of latest) {
    const f = m.format?.trim() || "ohne Format";
    byFormat.set(f, [...(byFormat.get(f) ?? []), m.views]);
  }
  const formatStats = [...byFormat.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([f, v]) => ({ f, n: v.length, avg: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.avg - a.avg)
    .map((x) => `${x.f}: im Schnitt ${fmt(x.avg)} Aufrufe (${x.n} Videos)`);

  if (!clientId) {
    return { clientName: null, branche: BRANCHE_TEXT.unternehmen, region: "Kiel und Lübecker Bucht", profile: null, done: [], rejected: [], performance: [], formatStats, references };
  }

  const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId));
  const name = c?.name ?? null;
  const anon = (t: string) => (name ? t.split(name).join("{{BETRIEB}}") : t);

  const videos = await db
    .select({ title: schema.videos.title, format: schema.videos.format, status: schema.videos.status })
    .from(schema.videos)
    .where(eq(schema.videos.clientId, clientId))
    .orderBy(desc(schema.videos.createdAt))
    .limit(40);
  const scripts = await db
    .select({ title: schema.scripts.title })
    .from(schema.scripts)
    .where(eq(schema.scripts.clientId, clientId))
    .orderBy(desc(schema.scripts.updatedAt))
    .limit(30);
  const rejected = await db
    .select({ title: schema.ideas.title, mechanic: schema.ideas.mechanic })
    .from(schema.ideas)
    .where(and(eq(schema.ideas.clientId, clientId), eq(schema.ideas.status, "verworfen")))
    .orderBy(desc(schema.ideas.updatedAt))
    .limit(30);
  const openIdeas = await db
    .select({ title: schema.ideas.title })
    .from(schema.ideas)
    .where(and(eq(schema.ideas.clientId, clientId), inArray(schema.ideas.status, ["offen", "vorschlag"]), isNotNull(schema.ideas.title)))
    .orderBy(desc(schema.ideas.updatedAt))
    .limit(30);

  const mine = latest.filter((m) => m.clientId === clientId).sort((a, b) => b.views - a.views);
  const line = (m: (typeof mine)[number]) =>
    `${anon(m.title)} (${m.format ?? "ohne Format"}): ${fmt(m.views)} Aufrufe` +
    (m.avgWatch ? `, Ø ${m.avgWatch.toLocaleString("de-DE", { maximumFractionDigits: 1 })} s angesehen` : "") +
    (m.shares ? `, ${fmt(m.shares)} geteilt` : "") +
    (m.saves ? `, ${fmt(m.saves)} gespeichert` : "") +
    `, ${fmt(m.comments)} Kommentare`;
  const performance = [
    ...mine.slice(0, 4).map((m) => `Stark: ${line(m)}`),
    ...(mine.length > 5 ? mine.slice(-2).map((m) => `Schwächer: ${line(m)}`) : []),
  ];

  const done = [...new Set([...videos.map((v) => `${anon(v.title)}${v.format ? ` (${v.format})` : ""}`), ...scripts.map((s) => anon(s.title)), ...openIdeas.map((i) => anon(i.title))])].slice(0, 60);

  const profile = c?.creativeProfile
    ? (Object.fromEntries(Object.entries(c.creativeProfile).map(([k, v]) => [k, anon(String(v))])) as CreativeProfile)
    : null;

  return {
    clientName: name,
    branche: BRANCHE_TEXT[c?.branche ?? ""] ?? c?.branche ?? BRANCHE_TEXT.unternehmen,
    region: c?.ort || c?.city || "Kiel und Lübecker Bucht",
    profile,
    done,
    rejected: rejected.map((r) => `${anon(r.title)}${r.mechanic ? ` (Mechanik: ${anon(r.mechanic)})` : ""}`),
    performance,
    formatStats,
    references,
  };
}

/** Kontext als Text für die KI. */
export function contextText(ctx: EngineContext): string {
  const parts: string[] = [`Kunde: {{BETRIEB}}, ${ctx.branche}, ${ctx.region}`];
  const prof = PROFILE_FIELDS.filter((f) => ctx.profile?.[f.key]?.trim()).map((f) => `- ${f.label}: ${ctx.profile![f.key]}`);
  parts.push(prof.length ? `Kreativprofil:\n${prof.join("\n")}` : "Kreativprofil: noch nicht ausgefüllt. Bleibe bei typischen, realistischen Situationen der Branche.");
  if (ctx.done.length) parts.push(`Kunden-Gedächtnis, schon gedreht, geplant oder als Idee vorhanden (nicht wiederholen, auch nicht leicht abgewandelt):\n${ctx.done.map((d) => `- ${d}`).join("\n")}`);
  if (ctx.rejected.length) parts.push(`Abgelehnt (nie wieder vorschlagen, auch nicht dieselbe Mechanik):\n${ctx.rejected.map((d) => `- ${d}`).join("\n")}`);
  if (ctx.performance.length || ctx.formatStats.length) {
    parts.push(
      [
        "Zahlen (wenige Videos, nur vorsichtige Hinweise, kein Gesetz):",
        ...ctx.performance.map((p) => `- ${p}`),
        ...(ctx.formatStats.length ? ["Formate über alle Kunden:", ...ctx.formatStats.map((p) => `- ${p}`)] : []),
      ].join("\n"),
    );
  }
  parts.push(`Referenz-Skripte von SCM Creatives (Maßstab für Humor, Tempo und Originalität, nicht kopieren):\n${ctx.references}`);
  return parts.join("\n\n");
}
