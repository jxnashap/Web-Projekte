import { differenceInCalendarDays, parseISO } from "date-fns";
import { CheckCircle2, Clock, Film, Phone, ReceiptEuro } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { KontingentBar } from "@/components/kontingent-bar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, ListRow, Stat } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/data/dashboard";
import { dateLong, dateShort, eur, eurShort, monthLabel, num, time, weekday } from "@/lib/format";
import { EVENT_KINDS, LEAD_SCORE, LEAD_STAGES } from "@/lib/labels";
import { hourBerlin, todayIso } from "@/lib/time";

export const metadata: Metadata = { title: "Heute" };

export default function HeutePage() {
  return (
    <>
      <PageHeader
        eyebrow={<Suspense fallback={" "}>{<Today />}</Suspense>}
        title={<Suspense fallback="Guten Tag">{<Greeting />}</Suspense>}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Greeting() {
  await connection();
  const h = hourBerlin();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

async function Today() {
  await connection();
  return <>{dateLong(new Date()).replace(/ \d{4}$/, "")}</>;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <SkeletonCards />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-[var(--radius-card)] xl:col-span-2" />
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

/** "Heute", "Morgen" oder Wochentag mit Datum */
function relDay(d: Date, today: string) {
  const diff = differenceInCalendarDays(parseISO(todayIso(d)), parseISO(today));
  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  return `${weekday(d)} ${dateShort(d).replace(/\.\s.*/, ".")}`;
}

const TONES = {
  red: "bg-accent-soft text-accent-ink",
  orange: "bg-warn-soft text-warn",
  blue: "bg-info-soft text-info",
  gray: "bg-fill text-ink-2",
};

async function Dashboard() {
  await connection();
  const now = new Date();
  const today = todayIso(now);
  const d = await getDashboard(now);
  const stageLabel = (k: string) => LEAD_STAGES.find((s) => s.key === k)?.label ?? k;
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const overdueSum = d.overdue.reduce((s, i) => s + i.grossCents, 0);

  // Was brennt: höchstens vier Punkte, nach Dringlichkeit, jeweils mit dem nächsten konkreten Fall
  const firstOverdue = d.overdue[0];
  const alerts = [
    firstOverdue && {
      key: "geld",
      tone: TONES.red,
      icon: ReceiptEuro,
      title: d.overdue.length === 1 ? "Rechnung überfällig" : `${d.overdue.length} Rechnungen überfällig, zusammen ${eur(overdueSum)}`,
      sub: `${firstOverdue.clientName || firstOverdue.number}, ${eur(firstOverdue.grossCents)}, seit ${differenceInCalendarDays(parseISO(today), parseISO(firstOverdue.dueDate!))} Tagen fällig`,
      href: d.overdue.length === 1 ? `/finanzen/rechnungen/${firstOverdue.id}` : "/finanzen/rechnungen?status=offen",
    },
    d.leadsOverdue.length > 0 && {
      key: "anfragen",
      tone: TONES.orange,
      icon: Phone,
      title: n(d.leadsOverdue.length, "Rückmeldung überfällig", "Rückmeldungen überfällig"),
      sub: `${d.leadsOverdue[0].company}: ${d.leadsOverdue[0].nextStep ?? "melden"} (geplant ${dateShort(d.leadsOverdue[0].nextStepAt)})`,
      href: d.leadsOverdue.length === 1 ? `/anfragen/${d.leadsOverdue[0].id}` : "/anfragen",
    },
    d.needScript.length > 0 && {
      key: "skripte",
      tone: TONES.blue,
      icon: Film,
      title: n(d.needScript.length, "Dreh ohne Skript", "Drehs ohne Skript"),
      sub: `Als Nächstes: „${d.needScript[0].title}“, ${d.needScript[0].clientName}, ${dateShort(d.needScript[0].shootDate)}`,
      href: `/skripte/neu?video=${d.needScript[0].id}`,
    },
    d.unplanned.length > 0 && {
      key: "kontingent",
      tone: TONES.gray,
      icon: Clock,
      title: n(d.unplanned.length, "Kunde mit offenem Kontingent", "Kunden mit offenem Kontingent"),
      sub: (() => {
        const [top] = [...d.unplanned].sort((a, b) => b.soll - b.geplant - (a.soll - a.geplant));
        const more = d.unplanned.length - 1;
        return `${top.name}: ${top.soll - top.geplant} von ${top.soll} Videos noch nicht geplant${more > 0 ? `, dazu ${more} ${more === 1 ? "weiterer Kunde" : "weitere Kunden"}` : ""}`;
      })(),
      href: "/produktion",
    },
  ].filter((a): a is { key: string; tone: string; icon: typeof Clock; title: string; sub: string; href: string } => Boolean(a));

  const upcoming = d.agenda.filter(({ e }) => e.endsAt >= now);

  return (
    <div className="grid gap-6">
      {/* Kennzahlen wie Widgets: antippbar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat href="/kalender" label="Drehs in 7 Tagen" value={d.shootsThisWeek} sub={d.agenda.length ? `${d.agenda.length} Termine insgesamt` : "Keine Termine"} />
        <Stat href="/produktion" label="Im Schnitt" value={d.inProduction} sub="Gedreht bis Abnahme" />
        <Stat
          href="/finanzen/rechnungen?status=offen"
          label="Offene Rechnungen"
          value={eurShort(d.openSum)}
          sub={d.overdue.length ? `davon ${eurShort(overdueSum)} überfällig` : d.openInvoices.length ? `${d.openInvoices.length} offen, nichts überfällig` : "Alles bezahlt"}
          tone={d.overdue.length ? "accent" : undefined}
        />
        <Stat
          href="/anfragen"
          label="Offene Anfragen"
          value={d.leads.length}
          sub={d.hotLeads.length ? `${d.hotLeads.length} bis morgen fällig` : "Alles im grünen Bereich"}
          tone={d.hotLeads.length ? "warn" : undefined}
        />
      </div>

      {/* Was brennt: gruppierte Liste */}
      {alerts.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader title="Was brennt" sub={n(alerts.length, "Punkt braucht euch", "Punkte brauchen euch")} />
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.key}>
                <ListRow href={a.href}>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${a.tone}`}>
                    <a.icon className="size-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{a.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{a.sub}</span>
                  </span>
                </ListRow>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="flex items-center gap-3 px-5 py-4">
          <CheckCircle2 className="size-5 text-ok" />
          <span className="text-[15px] font-medium">Nichts brennt. Alles im Plan.</span>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Die nächsten 7 Tage"
            sub="Drehs, Gespräche und Abgaben"
            action={<LinkButton href="/kalender" variant="ghost" size="sm">Kalender</LinkButton>}
          />
          {upcoming.length === 0 ? (
            <EmptyState variant="inline" title="Keine Termine in den nächsten 7 Tagen" action={<LinkButton href="/kalender?neu=1" variant="secondary" size="sm">Termin anlegen</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map(({ e, clientName, clientColor }) => {
                const day = relDay(e.startsAt, today);
                return (
                  <li key={e.id}>
                    <ListRow href={`/kalender/${e.id}`} className="py-3">
                      <div className="w-16 shrink-0 tabular-nums">
                        <div className={`text-[12px] font-semibold ${day === "Heute" ? "text-accent-ink" : "text-muted"}`}>{day}</div>
                        <div className="text-[16px] font-semibold tracking-[-0.02em]">{e.allDay ? "ganztags" : time(e.startsAt)}</div>
                      </div>
                      <div className="h-10 w-1 shrink-0 rounded-full" style={{ background: clientColor ?? "var(--color-line-2)" }} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 font-semibold leading-snug">{e.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                          <Badge tone={EVENT_KINDS[e.kind]?.tone} className="h-5 px-1.5 text-[11px]">
                            {EVENT_KINDS[e.kind]?.label ?? e.kind}
                          </Badge>
                          <span className="truncate">{[clientName, e.location].filter(Boolean).join(" · ")}</span>
                        </div>
                      </div>
                    </ListRow>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title={`Kontingent ${monthLabel(d.month).replace(/ \d{4}$/, "")}`}
            sub="Kräftig: fertig. Hell: geplant."
            action={<LinkButton href="/produktion" variant="ghost" size="sm">Produktion</LinkButton>}
          />
          {d.kontingente.length === 0 ? (
            <EmptyState variant="inline" title="Keine aktiven Pakete" action={<LinkButton href="/kunden" variant="secondary" size="sm">Kunden ansehen</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line">
              {d.kontingente.map((k) => (
                <li key={k.clientId}>
                  <ListRow href={`/produktion?kunde=${k.clientId}`} className="py-3">
                    <div className="min-w-0 flex-1">
                      <KontingentBar k={k} />
                    </div>
                  </ListRow>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Anfragen, die warten" sub="Bewertung A zuerst" action={<LinkButton href="/anfragen" variant="ghost" size="sm">Alle</LinkButton>} />
          {d.leads.length === 0 ? (
            <EmptyState variant="inline" title="Keine offenen Anfragen" action={<LinkButton href="/anfragen?neu=1" variant="secondary" size="sm">Anfrage erfassen</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line">
              {d.leads.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center">
                  <ListRow href={`/anfragen/${l.id}`} className="min-w-0 flex-1 pr-2">
                    <Badge tone={l.score ? LEAD_SCORE[l.score]?.tone : "neutral"} className="w-7 justify-center px-0">
                      {l.score ?? "?"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{l.company}</div>
                      <div className="truncate text-[13px] text-muted">
                        {stageLabel(l.stage)}
                        {l.nextStep ? ` · ${l.nextStep}` : ""}
                        {l.nextStepAt && l.nextStepAt < today ? <span className="text-accent-ink"> · überfällig</span> : null}
                      </div>
                    </div>
                  </ListRow>
                  {l.phone && (
                    <a
                      href={`tel:${l.phone.replace(/\s/g, "")}`}
                      className="mr-3 grid size-11 shrink-0 place-items-center rounded-full bg-fill text-ok hover:bg-ok-soft"
                      aria-label={`${l.name} anrufen`}
                    >
                      <Phone className="size-[18px]" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Beste Videos" sub="Letzte 30 Tage, nach Aufrufen" action={<LinkButton href="/zahlen" variant="ghost" size="sm">Zahlen</LinkButton>} />
          {d.top.length === 0 ? (
            <EmptyState variant="inline" title="Noch keine Zahlen erfasst" action={<LinkButton href="/zahlen?neu=1" variant="secondary" size="sm">Zahlen eintragen</LinkButton>} />
          ) : (
            <ol className="divide-y divide-line">
              {d.top.map((v, i) => (
                <li key={v.videoId}>
                  <ListRow href={`/zahlen/${v.videoId}`}>
                    <span className="w-5 shrink-0 text-[15px] font-semibold tabular-nums text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{v.title}</div>
                      <div className="truncate text-[13px] text-muted">{v.clientName}</div>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <div className="font-semibold">{num(v.views)}</div>
                      <div className="text-[12px] text-muted">Aufrufe · {num(v.likes)} Likes</div>
                    </div>
                  </ListRow>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

