import { Lock, Paperclip, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ExpenseForm } from "@/components/finanzen/expense-form";
import { Figure } from "@/components/finanzen/figure";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodStepper } from "@/components/ui/period-stepper";
import { FormSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { plural } from "@/lib/finanzen/core";
import { getClientOptions, listExpenses } from "@/lib/finanzen/data";
import { dateShort, eur, monthLabel } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/labels";
import { monthIso, shiftMonth, todayIso } from "@/lib/time";

export const metadata = { title: "Ausgaben" };

export default function AusgabenPage({ searchParams }: PageProps<"/finanzen/ausgaben">) {
  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title="Ausgaben"
        description="Belege fotografieren oder hochladen. Nach dem Export an die Steuerberatung sind sie festgeschrieben."
        actions={
          <LinkButton href="/finanzen/ausgaben?neu=1" scroll={false}>
            <Plus className="size-4" /> Beleg erfassen
          </LinkButton>
        }
      />
      <FinanzenNav active="ausgaben" />
      <Suspense fallback={<ListSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
      <ParamDialog title="Beleg erfassen" description="Pflicht sind Betrag, Lieferant, Zweck und Datum. Die Datei könnt ihr auch später ergänzen." size="lg">
        <Suspense fallback={<FormSkeleton fields={4} />}>
          <NewExpense />
        </Suspense>
      </ParamDialog>
    </>
  );
}

async function NewExpense() {
  await connection();
  const clients = await getClientOptions();
  return <ExpenseForm defaults={{ date: todayIso() }} clients={clients.filter((c) => c.status !== "beendet")} />;
}

async function List({ searchParams }: { searchParams: PageProps<"/finanzen/ausgaben">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const current = monthIso();
  const month = typeof sp.monat === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.monat) ? sp.monat : current;
  const cat = typeof sp.kategorie === "string" && sp.kategorie in EXPENSE_CATEGORIES ? sp.kategorie : undefined;
  const data = await listExpenses(month, cat);
  const href = (m: string, c?: string) => `/finanzen/ausgaben?monat=${m}${c ? `&kategorie=${c}` : ""}`;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <PeriodStepper
          label={<span className="capitalize">{monthLabel(month)}</span>}
          prevHref={href(shiftMonth(month, -1), cat)}
          nextHref={href(shiftMonth(month, 1), cat)}
          todayHref={month === current ? undefined : href(current, cat)}
          todayLabel="Dieser Monat"
        />
        {data.categories.length > 1 && (
          <div className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <Segmented
              label="Kategorie"
              className="w-max"
              items={[undefined, ...data.categories].map((c) => ({ href: href(month, c), label: c ? EXPENSE_CATEGORIES[c] : "Alle", active: c === cat }))}
            />
          </div>
        )}
      </div>

      {data.rows.length > 0 && (
        <Card className="p-5">
          <p className="text-[15px] tabular-nums text-ink-2 sm:hidden">
            <span className="font-semibold text-ink">{plural(data.rows.length, "Ausgabe", "Ausgaben")}</span> · netto {eur(data.netCents)}
            {data.withoutReceipt ? <span className="font-semibold text-warn"> · {data.withoutReceipt} ohne Beleg</span> : null}
          </p>
          <div className="hidden gap-5 sm:grid sm:grid-cols-2 xl:grid-cols-4">
            <Figure label="Ausgaben netto" value={eur(data.netCents)} sub={plural(data.rows.length, "Beleg", "Belege")} />
            <Figure label="Vorsteuer" value={eur(data.taxCents)} />
            <Figure label="Brutto bezahlt" value={eur(data.grossCents)} />
            <Figure
              label="Ohne Belegdatei"
              value={String(data.withoutReceipt)}
              tone={data.withoutReceipt ? "warn" : "ok"}
              sub={data.rcNetCents ? `§ 13b netto: ${eur(data.rcNetCents)}` : undefined}
            />
          </div>
        </Card>
      )}

      {data.rows.length === 0 ? (
        <EmptyState
          title={`Keine Ausgaben im ${monthLabel(month)}`}
          action={
            <LinkButton href={`/finanzen/ausgaben?monat=${month}&neu=1`} scroll={false} variant="secondary">
              <Plus className="size-4" /> Beleg erfassen
            </LinkButton>
          }
        >
          Tipp: Belege direkt nach dem Kauf mit dem Handy fotografieren. So fehlt am Monatsende nichts.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {data.rows.map(({ e, clientName, hasFile }) => (
              <li key={e.id}>
                <Link
                  href={`/finanzen/ausgaben/${e.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none"
                >
                  <div className="hidden w-14 shrink-0 text-[13px] tabular-nums text-muted sm:block">{dateShort(e.date)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{e.supplier}</div>
                    <div className="truncate text-[13px] text-muted">
                      {!hasFile && <span className="font-medium text-warn sm:hidden">ohne Beleg · </span>}
                      <span className="sm:hidden">{dateShort(e.date)} · </span>
                      {e.description}
                      <span className="hidden sm:inline"> · {EXPENSE_CATEGORIES[e.category] ?? e.category}</span>
                      {clientName ? <span className="hidden sm:inline"> · für {clientName}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {e.reverseCharge && (
                      <span className="hidden sm:inline-flex">
                        <Badge tone="info">§ 13b</Badge>
                      </span>
                    )}
                    {e.exportedAt && (
                      <span title="Exportiert und festgeschrieben" className="hidden text-muted sm:inline">
                        <Lock className="size-4" aria-label="festgeschrieben" />
                      </span>
                    )}
                    {hasFile ? (
                      <span title="Beleg vorhanden" className="text-ok">
                        <Paperclip className="size-4" aria-label="Beleg vorhanden" />
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex">
                        <Badge tone="warn">ohne Beleg</Badge>
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums">{eur(e.grossCents)}</div>
                    <div className="hidden text-[12px] tabular-nums text-muted sm:block">netto {eur(e.netCents)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
