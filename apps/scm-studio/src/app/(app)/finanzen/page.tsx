import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, FileText, Info, Plus, Receipt } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { FinanceChart } from "@/components/finanzen/finance-chart";
import { AmountRow, Figure } from "@/components/finanzen/figure";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { parsePeriod, PeriodNav } from "@/components/finanzen/period-nav";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, ListRow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/finanzen/core";
import { getOverview } from "@/lib/finanzen/data";
import { dateDe, eur, monthLabel } from "@/lib/format";
import { monthIso } from "@/lib/time";

export const metadata = { title: "Finanzen" };

export default function FinanzenPage({ searchParams }: PageProps<"/finanzen">) {
  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title="Finanzen"
        description="Rechnungen, Belege und Umsatzsteuer auf einen Blick. Alle Zahlen sind eine Vorschau für euch und eure Steuerberatung."
        actions={
          <>
            <LinkButton href="/finanzen/ausgaben?neu=1" variant="secondary">
              <Receipt className="size-4" /> Beleg erfassen
            </LinkButton>
            <LinkButton href="/finanzen/rechnungen/neu">
              <Plus className="size-4" /> Neue Rechnung
            </LinkButton>
          </>
        }
      />
      <FinanzenNav active="ueberblick" />
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-9 w-full max-w-md" />
      <SkeletonCards />
      <Skeleton className="h-80 rounded-[var(--radius-card)]" />
    </div>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/finanzen">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const { kind, ym } = parsePeriod(sp, monthIso());
  const o = await getOverview(kind, ym);
  const label = o.period.label || monthLabel(ym);
  const overdue = o.open.filter((x) => x.overdue);
  const openSum = o.open.reduce((s, x) => s + x.inv.grossCents, 0);
  const draftsTotal = o.drafts.rechnung + o.drafts.angebot;
  const exportLabel = monthLabel(o.monthExport.month);

  return (
    // Handy: was brennt und wo Geld hängt zuerst (Zu erledigen, Offene Rechnungen), dann die Zahlen des Zeitraums
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="order-3 xl:order-none xl:col-span-3">
        <PeriodNav base="/finanzen" kind={kind} ym={ym} label={label} homeYm={monthIso()} homeLabel="Aktuell" />
      </div>

      <Card className="order-4 p-5 sm:p-6 xl:order-none xl:col-span-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-6 xl:grid-cols-4">
          <Figure label="Einnahmen netto" value={eur(o.incomeNet)} sub={plural(o.incomeCount, "Rechnung", "Rechnungen")} />
          <Figure label={o.smallBusiness ? "Ausgaben" : "Ausgaben netto"} value={eur(o.expenseNet)} sub={plural(o.expenseCount, "Beleg", "Belege")} />
          <Figure label="Überschuss (vorläufig)" value={eur(o.profit)} tone={o.profit < 0 ? "accent" : undefined} sub="Einnahmen minus Ausgaben" />
          <Figure label={o.vat.payable >= 0 ? "USt-Zahllast" : "USt-Erstattung"} value={eur(Math.abs(o.vat.payable))} sub="Vorschau" />
        </div>
        <div className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
          Zahlungseingänge im Zeitraum: <span className="font-semibold text-ink tabular-nums">{eur(o.paidIn.sum)}</span> aus{" "}
          {plural(o.paidIn.n, "Rechnung", "Rechnungen")}.
          <details className="mt-1">
            <summary className="-mx-1 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md px-1 font-medium text-ink-2 hover:text-ink sm:min-h-9 [&::-webkit-details-marker]:hidden">
              <Info className="size-4" /> Wie wird gezählt?
            </summary>
            <p className="mt-1 max-w-2xl">
              Einnahmen zählen nach Rechnungsdatum, Ausgaben nach Belegdatum. Ob eure Gewinnermittlung nach Zahlungseingang rechnet, klärt ihr mit eurer Steuerberatung. Die
              Umsatzsteuer ist eine Vorschau und keine Voranmeldung.
            </p>
          </details>
        </div>
      </Card>

      <Card className="order-6 xl:order-none xl:col-span-2">
        <CardHeader title="Einnahmen und Ausgaben" sub="Letzte 12 Monate, netto" />
        <div className="px-5 pb-3">
          <FinanceChart data={o.chart} highlight={o.period.months} />
        </div>
      </Card>

      <Card className="order-5 xl:order-none">
        <CardHeader title={`Umsatzsteuer ${label}`} sub="Vorschau aus festgeschriebenen Rechnungen und Belegen" />
        <div className="divide-y divide-line px-5 pb-4">
          {o.smallBusiness ? (
            <AmountRow label="Umsatzsteuer auf eure Rechnungen" value={eur(0)} hint="Kleinunternehmer nach § 19 UStG" />
          ) : o.vat.output.length ? (
            o.vat.output.map((g) => <AmountRow key={g.rate} label={`Umsatzsteuer ${g.rate} %`} hint={`auf ${eur(g.netCents)} netto`} value={eur(g.taxCents)} />)
          ) : (
            <AmountRow label="Umsatzsteuer auf eure Rechnungen" value={eur(0)} />
          )}
          {!o.smallBusiness && <AmountRow label="Vorsteuer aus Belegen" value={`− ${eur(o.vat.inputTax)}`} />}
          {o.vat.rcNet > 0 && (
            <>
              <AmountRow label="Steuer nach § 13b UStG (geschuldet)" hint={`auf ${eur(o.vat.rcNet)} netto, z. B. Werbeanzeigen aus Irland`} value={eur(o.vat.rcTax)} />
              <AmountRow
                label="davon als Vorsteuer abziehbar"
                hint={o.smallBusiness ? "als Kleinunternehmer kein Vorsteuerabzug" : undefined}
                value={`− ${eur(o.vat.rcDeductible)}`}
              />
            </>
          )}
          <AmountRow strong label={o.vat.payable >= 0 ? "Zahllast" : "Erstattung"} value={eur(Math.abs(o.vat.payable))} />
        </div>
        <p className="border-t border-line px-5 py-3 text-[12px] text-muted">
          Keine Voranmeldung und keine Steuerberatung. Die Umsatzsteuer-Voranmeldung erstellt eure Steuerberatung.
        </p>
      </Card>

      <Card className="order-2 overflow-hidden xl:order-none xl:col-span-2">
        <CardHeader
          title="Offene Rechnungen"
          sub={o.open.length ? `${plural(o.open.length, "Rechnung", "Rechnungen")} über ${eur(openSum)}${overdue.length ? `, davon ${overdue.length} überfällig` : ""}` : "Alles bezahlt"}
          action={
            o.open.length ? (
              <LinkButton href="/finanzen/rechnungen?status=offen" variant="ghost" size="sm">
                Alle <ChevronRight className="size-4" />
              </LinkButton>
            ) : undefined
          }
        />
        {o.open.length === 0 ? (
          <EmptyState
            variant="inline"
            title="Keine offenen Rechnungen"
            action={
              <LinkButton href="/finanzen/rechnungen/neu" variant="secondary">
                <Plus className="size-4" /> Rechnung anlegen
              </LinkButton>
            }
          >
            Sobald ihr eine Rechnung festschreibt, steht sie hier, bis sie bezahlt ist.
          </EmptyState>
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {o.open.slice(0, 8).map(({ inv, clientName, overdue: late }) => (
              <ListRow key={inv.id} href={`/finanzen/rechnungen/${inv.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{inv.recipient?.name ?? clientName}</div>
                  <div className="truncate text-[13px] text-muted">
                    <span className={late ? "font-medium text-accent-ink" : undefined}>
                      {late ? "überfällig seit " : "fällig "}
                      {dateDe(inv.dueDate)}
                    </span>
                    {" · "}
                    {inv.number}
                    {inv.dunningLevel ? ` · ${inv.dunningLevel}. Erinnerung` : ""}
                  </div>
                </div>
                {late && (
                  <span className="hidden sm:inline-flex">
                    <Badge tone="accent">Überfällig</Badge>
                  </span>
                )}
                <div className="shrink-0 text-right font-semibold tabular-nums sm:w-28">{eur(inv.grossCents)}</div>
              </ListRow>
            ))}
          </div>
        )}
      </Card>

      <Card className="order-1 overflow-hidden xl:order-none">
        <CardHeader title="Zu erledigen" />
        <div className="divide-y divide-line border-t border-line">
          {draftsTotal === 0 && <Todo href="/finanzen/rechnungen?status=entwurf" icon={<FileText className="size-4" />} done text="Keine offenen Entwürfe" />}
          {o.drafts.rechnung > 0 && (
            <Todo
              href="/finanzen/rechnungen?status=entwurf"
              icon={<FileText className="size-4" />}
              text={`${plural(o.drafts.rechnung, "Rechnungsentwurf", "Rechnungsentwürfe")} noch nicht festgeschrieben`}
            />
          )}
          {o.drafts.angebot > 0 && (
            <Todo
              href="/finanzen/rechnungen?art=angebot&status=entwurf"
              icon={<FileText className="size-4" />}
              text={`${plural(o.drafts.angebot, "Angebotsentwurf", "Angebotsentwürfe")} noch nicht festgeschrieben`}
            />
          )}
          <Todo
            href={`/finanzen/ausgaben?monat=${ym}`}
            icon={<Receipt className="size-4" />}
            done={o.missingReceipts === 0}
            text={o.missingReceipts ? `${plural(o.missingReceipts, "Ausgabe", "Ausgaben")} ohne Belegdatei` : "Alle Ausgaben haben einen Beleg"}
          />
          <Todo
            href="/finanzen/rechnungen?status=ueberfaellig"
            icon={<AlertTriangle className="size-4" />}
            done={overdue.length === 0}
            alarm
            text={overdue.length ? `${plural(overdue.length, "überfällige Rechnung", "überfällige Rechnungen")} nachfassen` : "Nichts überfällig"}
          />
          <Todo
            href="/finanzen/export"
            icon={<ArrowUpRight className="size-4" />}
            done={o.monthExport.done}
            text={o.monthExport.done ? `${exportLabel} exportiert` : `Export ${exportLabel} für die Steuerberatung`}
          />
        </div>
      </Card>
    </div>
  );
}

function Todo({ href, icon, text, done = false, alarm = false }: { href: string; icon: React.ReactNode; text: string; done?: boolean; alarm?: boolean }) {
  return (
    <ListRow href={href}>
      <span className={cn("shrink-0", done ? "text-ok" : alarm ? "text-accent-ink" : "text-muted")}>{done ? <CheckCircle2 className="size-4" /> : icon}</span>
      <span className={cn("min-w-0 text-[15px]", done ? "text-muted" : "font-medium text-ink")}>{text}</span>
    </ListRow>
  );
}
