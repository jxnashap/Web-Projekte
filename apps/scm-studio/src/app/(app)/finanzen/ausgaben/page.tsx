import { ChevronLeft, ChevronRight, Lock, Paperclip, Plus } from "lucide-react";
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
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
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
      <Suspense fallback={<div className="grid gap-4"><Skeleton className="h-10 w-72" /><SkeletonTable /></div>}>
        <List searchParams={searchParams} />
      </Suspense>
      <ParamDialog title="Beleg erfassen" description="Pflicht sind Datum, Lieferant, Zweck und Betrag. Die Datei könnt ihr auch später ergänzen." size="lg">
        <Suspense fallback={<Skeleton className="h-96" />}>
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
  const month = typeof sp.monat === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.monat) ? sp.monat : monthIso();
  const cat = typeof sp.kategorie === "string" && sp.kategorie in EXPENSE_CATEGORIES ? sp.kategorie : undefined;
  const data = await listExpenses(month, cat);
  const href = (m: string, c?: string) => `/finanzen/ausgaben?monat=${m}${c ? `&kategorie=${c}` : ""}`;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={href(shiftMonth(month, -1), cat)} scroll={false} className="grid size-9 place-items-center rounded-full bg-surface shadow-[var(--shadow-card)] hover:bg-sunken" aria-label="Voriger Monat">
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-36 text-center text-[17px] font-semibold capitalize">{monthLabel(month)}</span>
          <Link href={href(shiftMonth(month, 1), cat)} scroll={false} className="grid size-9 place-items-center rounded-full bg-surface shadow-[var(--shadow-card)] hover:bg-sunken" aria-label="Nächster Monat">
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {data.categories.length > 1 && (
          <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1" aria-label="Kategorie filtern">
            {[undefined, ...data.categories].map((c) => (
              <Link
                key={c ?? "alle"}
                href={href(month, c)}
                scroll={false}
                aria-current={c === cat ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-medium",
                  c === cat ? "bg-accent-soft text-accent-ink" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-sunken",
                )}
              >
                {c ? EXPENSE_CATEGORIES[c] : "Alle"}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {data.rows.length > 0 && (
        <Card className="p-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Figure label="Ausgaben netto" value={eur(data.netCents)} sub={`${data.rows.length} Belege`} />
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
            <LinkButton href={`/finanzen/ausgaben?monat=${month}&neu=1`} scroll={false}>
              <Plus className="size-4" /> Ersten Beleg erfassen
            </LinkButton>
          }
        >
          Tipp: Belege direkt nach dem Kauf mit dem Handy fotografieren. So fehlt am Monatsende nichts.
        </EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {data.rows.map(({ e, clientName }) => (
              <li key={e.id}>
                <Link href={`/finanzen/ausgaben/${e.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-sunken/60">
                  <div className="w-14 shrink-0 text-[13px] text-muted tabular-nums">{dateShort(e.date)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{e.supplier}</div>
                    <div className="truncate text-[13px] text-muted">
                      {e.description} · {EXPENSE_CATEGORIES[e.category] ?? e.category}
                      {clientName ? ` · für ${clientName}` : ""}
                    </div>
                  </div>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    {e.reverseCharge && <Badge tone="info">§ 13b</Badge>}
                    {e.exportedAt && (
                      <span title="Exportiert und festgeschrieben" className="text-muted">
                        <Lock className="size-4" />
                      </span>
                    )}
                    {e.fileId ? (
                      <span title="Beleg vorhanden" className="text-ok">
                        <Paperclip className="size-4" />
                      </span>
                    ) : (
                      <Badge tone="warn">ohne Beleg</Badge>
                    )}
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <div className="font-semibold tabular-nums">{eur(e.grossCents)}</div>
                    <div className="text-[12px] text-muted tabular-nums">netto {eur(e.netCents)}</div>
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
