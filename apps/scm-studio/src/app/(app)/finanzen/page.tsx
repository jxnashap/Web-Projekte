import { AlertTriangle, ArrowUpRight, FileText, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FinanceChart } from "@/components/finanzen/finance-chart";
import { AmountRow, Figure } from "@/components/finanzen/figure";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { parsePeriod, PeriodNav } from "@/components/finanzen/period-nav";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";
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
      <Skeleton className="h-10 w-80" />
      <SkeletonCards />
      <Skeleton className="h-80" />
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

  return (
    <div className="grid gap-6">
      <PeriodNav base="/finanzen" kind={kind} ym={ym} label={label} />

      <Card className="p-5 sm:p-6">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Figure label="Einnahmen netto" value={eur(o.incomeNet)} sub={`${o.incomeCount} Belege nach Rechnungsdatum`} />
          <Figure label={o.smallBusiness ? "Ausgaben" : "Ausgaben netto"} value={eur(o.expenseNet)} sub={`${o.expenseCount} Belege`} />
          <Figure label="Überschuss (vorläufig)" value={eur(o.profit)} tone={o.profit < 0 ? "accent" : undefined} sub="Einnahmen minus Ausgaben" />
          <Figure
            label={o.vat.payable >= 0 ? "Umsatzsteuer-Zahllast" : "Erstattung (Vorschau)"}
            value={eur(Math.abs(o.vat.payable))}
            sub="Vorschau, keine Voranmeldung"
          />
        </div>
        <p className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
          Zahlungseingänge im Zeitraum: <span className="font-semibold text-ink tabular-nums">{eur(o.paidIn.sum)}</span> aus {o.paidIn.n}{" "}
          {o.paidIn.n === 1 ? "Rechnung" : "Rechnungen"}. Einnahmen zählen hier nach Rechnungsdatum; ob eure Gewinnermittlung nach Zahlungseingang rechnet, klärt ihr mit eurer
          Steuerberatung.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Einnahmen und Ausgaben" sub="Je Monat, netto" />
          <div className="p-5">
            <FinanceChart data={o.chart} />
          </div>
        </Card>

        <Card>
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
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Offene Rechnungen"
            sub={o.open.length ? `${o.open.length} offen über ${eur(openSum)}${overdue.length ? `, davon ${overdue.length} überfällig` : ""}` : "Alles bezahlt"}
            action={
              <LinkButton href="/finanzen/rechnungen?status=offen" variant="ghost" size="sm">
                Alle <ArrowUpRight className="size-4" />
              </LinkButton>
            }
          />
          {o.open.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Keine offenen Rechnungen">Sobald ihr eine Rechnung festschreibt, erscheint sie hier, bis sie bezahlt ist.</EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {o.open.slice(0, 8).map(({ inv, clientName, overdue: late }) => (
                <li key={inv.id}>
                  <Link href={`/finanzen/rechnungen/${inv.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-sunken/60">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{inv.recipient?.name ?? clientName}</div>
                      <div className="truncate text-[13px] text-muted">
                        <span className={late ? "font-medium text-accent-ink sm:font-normal sm:text-muted" : undefined}>
                          {late ? <span className="sm:hidden">überfällig seit </span> : <span>fällig </span>}
                          {late ? <span className="hidden sm:inline">fällig </span> : null}
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Zu erledigen" />
          <ul className="divide-y divide-line">
            <Todo href="/finanzen/rechnungen?status=entwurf" icon={<FileText className="size-4" />} done={o.draftCount === 0} text={o.draftCount ? `${o.draftCount} ${o.draftCount === 1 ? "Entwurf" : "Entwürfe"} noch nicht festgeschrieben` : "Keine offenen Entwürfe"} />
            <Todo
              href={`/finanzen/ausgaben?monat=${ym}`}
              icon={<Receipt className="size-4" />}
              done={o.missingReceipts === 0}
              text={o.missingReceipts ? `${o.missingReceipts} ${o.missingReceipts === 1 ? "Ausgabe" : "Ausgaben"} ohne Belegdatei` : "Alle Ausgaben haben einen Beleg"}
            />
            <Todo
              href="/finanzen/rechnungen?status=ueberfaellig"
              icon={<AlertTriangle className="size-4" />}
              done={overdue.length === 0}
              text={overdue.length ? `${overdue.length} ${overdue.length === 1 ? "überfällige Rechnung" : "überfällige Rechnungen"} nachfassen` : "Nichts überfällig"}
            />
            <Todo href="/finanzen/export" icon={<ArrowUpRight className="size-4" />} done={false} text="Monatsexport für die Steuerberatung" />
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Todo({ href, icon, text, done }: { href: string; icon: React.ReactNode; text: string; done: boolean }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-3.5 text-[14px] hover:bg-sunken/60">
        <span className={done ? "text-ok" : "text-accent-ink"}>{icon}</span>
        <span className={done ? "text-muted" : "text-ink"}>{text}</span>
      </Link>
    </li>
  );
}
