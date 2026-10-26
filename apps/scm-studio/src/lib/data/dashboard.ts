import "server-only";
import { addDays, subDays } from "date-fns";
import { and, asc, desc, eq, gte, inArray, isNull, lte, notInArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { berlinDateTime, monthIso, monthRange, todayIso } from "@/lib/time";
import { getKontingente } from "./kontingent";

export async function getDashboard(now: Date) {
  await requireUser();
  const db = await getDb();
  const month = monthIso(now);
  const today = todayIso(now);
  const { from: monthFrom, to: monthTo } = monthRange(month);

  const agenda = await db
    .select({ e: schema.events, clientName: schema.clients.name, clientColor: schema.clients.color })
    .from(schema.events)
    .leftJoin(schema.clients, eq(schema.events.clientId, schema.clients.id))
    .where(and(gte(schema.events.startsAt, berlinDateTime(today)), lte(schema.events.startsAt, berlinDateTime(todayIso(addDays(now, 7))))))
    .orderBy(asc(schema.events.startsAt));

  const leadsRaw = await db
    .select()
    .from(schema.leads)
    .where(notInArray(schema.leads.stage, ["gewonnen", "verloren"]))
    .orderBy(asc(schema.leads.nextStepAt));
  // Bewertung A zuerst, dann B, C, ohne; innerhalb nach nächstem Schritt
  const rank = (s: string | null) => ({ A: 0, B: 1, C: 2 })[s ?? ""] ?? 3;
  const leads = [...leadsRaw].sort((a, b) => rank(a.score) - rank(b.score) || (a.nextStepAt ?? "9999").localeCompare(b.nextStepAt ?? "9999"));

  const inProduction = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.videos)
    .where(inArray(schema.videos.status, ["gedreht", "schnitt", "abnahme"]));

  const openRows = await db
    .select({ inv: schema.invoices, clientName: schema.clients.name })
    .from(schema.invoices)
    .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .where(and(eq(schema.invoices.kind, "rechnung"), eq(schema.invoices.status, "offen")))
    .orderBy(asc(schema.invoices.dueDate));
  const open = openRows.map((r) => ({ ...r.inv, clientName: r.clientName ?? r.inv.recipient?.name ?? "" }));

  const paidThisMonth = await db
    .select({ net: sql<number>`coalesce(sum(${schema.invoices.netCents}),0)::int`, tax: sql<number>`coalesce(sum(${schema.invoices.taxCents}),0)::int` })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.kind, "rechnung"),
        inArray(schema.invoices.status, ["offen", "bezahlt"]),
        gte(schema.invoices.issueDate, monthFrom),
        lte(schema.invoices.issueDate, monthTo),
      ),
    );

  const inputTax = await db
    .select({ tax: sql<number>`coalesce(sum(${schema.expenses.taxCents}),0)::int` })
    .from(schema.expenses)
    .where(and(gte(schema.expenses.date, monthFrom), lte(schema.expenses.date, monthTo), eq(schema.expenses.reverseCharge, false)));

  // Beste Videos der letzten 30 Tage: letzter Messwert je Video
  const latest = await db
    .selectDistinctOn([schema.videoMetrics.videoId], {
      videoId: schema.videoMetrics.videoId,
      views: schema.videoMetrics.views,
      likes: schema.videoMetrics.likes,
      comments: schema.videoMetrics.comments,
      title: schema.videos.title,
      clientName: schema.clients.name,
      postDate: schema.videos.postDate,
    })
    .from(schema.videoMetrics)
    .innerJoin(schema.videos, eq(schema.videoMetrics.videoId, schema.videos.id))
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(gte(schema.videos.postDate, todayIso(subDays(now, 30))))
    .orderBy(schema.videoMetrics.videoId, desc(schema.videoMetrics.measuredOn));
  const top = latest.sort((a, b) => b.views - a.views).slice(0, 4);

  const kontingente = await getKontingente(month);

  // Drehs in den nächsten 7 Tagen, für die noch kein Skript verknüpft ist
  const needScript = await db
    .select({ id: schema.videos.id, title: schema.videos.title, shootDate: schema.videos.shootDate, clientName: schema.clients.name })
    .from(schema.videos)
    .innerJoin(schema.clients, eq(schema.videos.clientId, schema.clients.id))
    .where(
      and(
        gte(schema.videos.shootDate, today),
        lte(schema.videos.shootDate, todayIso(addDays(now, 7))),
        isNull(schema.videos.scriptId),
        inArray(schema.videos.status, ["idee", "skript", "dreh"]),
      ),
    )
    .orderBy(asc(schema.videos.shootDate));

  return {
    month,
    agenda,
    leads,
    hotLeads: leads.filter((l) => l.score === "A" || (l.nextStepAt && l.nextStepAt <= todayIso(addDays(now, 1)))),
    inProduction: inProduction[0]?.n ?? 0,
    openInvoices: open,
    openSum: open.reduce((s, i) => s + i.grossCents, 0),
    overdue: open.filter((i) => i.dueDate && i.dueDate < today),
    revenueMonthNet: paidThisMonth[0]?.net ?? 0,
    vatPreview: (paidThisMonth[0]?.tax ?? 0) - (inputTax[0]?.tax ?? 0),
    shootsThisWeek: agenda.filter((a) => a.e.kind === "dreh").length,
    top,
    kontingente,
    needScript,
    leadsOverdue: leads.filter((l) => l.nextStepAt && l.nextStepAt < today),
    unplanned: kontingente.filter((k) => k.geplant < k.soll),
  };
}
