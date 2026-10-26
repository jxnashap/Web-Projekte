import { ArrowUpRight, CalendarDays, Phone } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KontingentBar } from "@/components/kontingent-bar";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/data/dashboard";
import { compact, dateLong, dateShort, eurShort, monthLabel, num, time } from "@/lib/format";
import { EVENT_KINDS, LEAD_SCORE, LEAD_STAGES } from "@/lib/labels";
import { hourBerlin } from "@/lib/time";

export default function HeutePage() {
  return (
    <>
      <PageHeader
        scene="Szene 01 · Heute"
        title={<Suspense fallback="Guten Tag">{<Greeting />}</Suspense>}
        description={<Suspense fallback=" ">{<Today />}</Suspense>}
        actions={
          <>
            <LinkButton href="/skripte/neu" variant="secondary">Skript schreiben</LinkButton>
            <LinkButton href="/produktion?neu=1">Neue Video-Idee</LinkButton>
          </>
        }
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
  return <>Heute ist {dateLong(new Date())}. Das steht an.</>;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <SkeletonCards />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

async function Dashboard() {
  await connection();
  const now = new Date();
  const d = await getDashboard(now);
  const stageLabel = (k: string) => LEAD_STAGES.find((s) => s.key === k)?.label ?? k;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Drehs in 7 Tagen" value={d.shootsThisWeek} sub={d.agenda.length ? `${d.agenda.length} Termine insgesamt` : "Keine Termine"} />
        <Stat label="In Produktion" value={d.inProduction} sub="Videos von Idee bis Schnitt" />
        <Stat
          label="Offene Rechnungen"
          value={eurShort(d.openSum)}
          sub={d.overdue.length ? `${d.overdue.length} überfällig` : `${d.openInvoices.length} offen, nichts überfällig`}
          tone={d.overdue.length ? "accent" : undefined}
        />
        <Stat label="Anfragen" value={d.leads.length} sub={d.hotLeads.length ? `${d.hotLeads.length} brauchen heute Aufmerksamkeit` : "Alles im grünen Bereich"} tone={d.hotLeads.length ? "warn" : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Die nächsten 7 Tage" sub="Drehs, Gespräche und Abgaben" action={<LinkButton href="/kalender" variant="ghost" size="sm">Kalender <ArrowUpRight className="size-4" /></LinkButton>} />
          {d.agenda.length === 0 ? (
            <div className="p-5"><EmptyState title="Keine Termine in den nächsten 7 Tagen" /></div>
          ) : (
            <ul className="divide-y divide-line">
              {d.agenda.map(({ e, clientName, clientColor }) => (
                <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-16 shrink-0 text-center">
                    <div className="font-mono text-[11px] uppercase text-muted">{dateShort(e.startsAt)}</div>
                    <div className="text-[15px] font-bold">{time(e.startsAt)}</div>
                  </div>
                  <div className="h-10 w-1 rounded-full" style={{ background: clientColor ?? "var(--color-line-2)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{e.title}</div>
                    <div className="truncate text-[13px] text-muted">{[clientName, e.location].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Badge tone={EVENT_KINDS[e.kind]?.tone}>{EVENT_KINDS[e.kind]?.label ?? e.kind}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={`Kontingent ${monthLabel(d.month)}`} sub="Fertige Videos je Paket" action={<LinkButton href="/produktion" variant="ghost" size="sm">Produktion <ArrowUpRight className="size-4" /></LinkButton>} />
          <div className="grid gap-4 p-5">
            {d.kontingente.length === 0 ? <EmptyState title="Keine aktiven Pakete" /> : d.kontingente.map((k) => <KontingentBar key={k.clientId} k={k} />)}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Anfragen, die warten" sub="Bewertung A zuerst" action={<LinkButton href="/anfragen" variant="ghost" size="sm">Alle <ArrowUpRight className="size-4" /></LinkButton>} />
          <ul className="divide-y divide-line">
            {d.leads.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                {l.score && <Badge tone={LEAD_SCORE[l.score]?.tone}>{l.score}</Badge>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.company}</div>
                  <div className="truncate text-[13px] text-muted">{stageLabel(l.stage)}{l.nextStep ? ` · ${l.nextStep}` : ""}</div>
                </div>
                {l.phone && (
                  <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="grid size-8 place-items-center rounded-full border border-line text-ink-2 hover:border-ink" aria-label={`${l.name} anrufen`}>
                    <Phone className="size-4" />
                  </a>
                )}
              </li>
            ))}
            {d.leads.length === 0 && <li className="p-5"><EmptyState title="Keine offenen Anfragen" /></li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Geld" sub={monthLabel(d.month)} action={<LinkButton href="/finanzen" variant="ghost" size="sm">Finanzen <ArrowUpRight className="size-4" /></LinkButton>} />
          <dl className="grid gap-4 p-5 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Umsatz netto (Rechnungsdatum)</dt><dd className="font-semibold">{eurShort(d.revenueMonthNet)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Offen</dt><dd className="font-semibold">{eurShort(d.openSum)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Davon überfällig</dt><dd className={d.overdue.length ? "font-semibold text-accent-ink" : "font-semibold"}>{eurShort(d.overdue.reduce((s, i) => s + i.grossCents, 0))}</dd></div>
            <div className="flex justify-between border-t border-line pt-4"><dt className="text-muted">USt-Vorschau (Zahllast)</dt><dd className="font-semibold">{eurShort(d.vatPreview)}</dd></div>
            <p className="text-[12px] text-muted">Vorschau aus Rechnungen und Belegen. Die Voranmeldung macht eure Steuerberatung.</p>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Beste Videos" sub="Letzte 30 Tage, nach Aufrufen" action={<LinkButton href="/zahlen" variant="ghost" size="sm">Zahlen <ArrowUpRight className="size-4" /></LinkButton>} />
          <ol className="divide-y divide-line">
            {d.top.map((v, i) => (
              <li key={v.videoId} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 font-mono text-[13px] text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{v.title}</div>
                  <div className="truncate text-[13px] text-muted">{v.clientName}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{compact(v.views)}</div>
                  <div className="text-[12px] text-muted">{num(v.likes)} Likes</div>
                </div>
              </li>
            ))}
            {d.top.length === 0 && <li className="p-5"><EmptyState title="Noch keine Zahlen erfasst" /></li>}
          </ol>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-[12px] text-muted">
        <CalendarDays className="size-3.5" /> Daten werden bei jedem Aufruf frisch aus der Datenbank geladen.
        <Link href="/einstellungen" className="underline-offset-2 hover:underline">Anbindungen verwalten</Link>
        <Dot color="var(--color-ok)" />
      </p>
    </div>
  );
}
