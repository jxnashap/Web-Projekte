import { FilePlus2, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Figure } from "@/components/finanzen/figure";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { InvoiceStatus, STATUS_FILTERS } from "@/components/finanzen/status";
import { Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { KIND_LABEL, KIND_PLURAL, type DocKind } from "@/lib/finanzen/core";
import { listInvoices } from "@/lib/finanzen/data";
import { dateDe, eur } from "@/lib/format";

export const metadata = { title: "Rechnungen und Angebote" };

const KINDS: DocKind[] = ["rechnung", "angebot", "storno"];

export default function RechnungenPage({ searchParams }: PageProps<"/finanzen/rechnungen">) {
  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title="Rechnungen und Angebote"
        description="Entwürfe könnt ihr frei bearbeiten. Festgeschriebene Belege bleiben unverändert und werden bei Bedarf storniert."
        actions={
          <>
            <LinkButton href="/finanzen/rechnungen/neu?art=angebot" variant="secondary">
              <FilePlus2 className="size-4" /> Neues Angebot
            </LinkButton>
            <LinkButton href="/finanzen/rechnungen/neu">
              <Plus className="size-4" /> Neue Rechnung
            </LinkButton>
          </>
        }
      />
      <FinanzenNav active="rechnungen" />
      <Suspense fallback={<div className="grid gap-4"><Skeleton className="h-10 w-96" /><SkeletonTable /></div>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/finanzen/rechnungen">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const kind: DocKind = KINDS.includes(sp.art as DocKind) ? (sp.art as DocKind) : "rechnung";
  const filters = STATUS_FILTERS[kind];
  const status = typeof sp.status === "string" && filters.some((f) => f.key === sp.status) ? sp.status : "";
  const data = await listInvoices({ kind, status: status || undefined });
  const href = (k: DocKind, st = "") => `/finanzen/rechnungen?art=${k}${st ? `&status=${st}` : ""}`;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented items={KINDS.map((k) => ({ href: href(k), label: KIND_PLURAL[k], active: k === kind }))} />
        {filters.length > 1 && (
          <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1" aria-label="Status filtern">
            {filters.map((f) => (
              <Link
                key={f.key}
                href={href(kind, f.key)}
                scroll={false}
                aria-current={f.key === status ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                  f.key === status ? "bg-accent-soft text-accent-ink" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-sunken",
                )}
              >
                {f.label}
                {f.key && data.counts[f.key] ? <span className="tabular-nums opacity-70">{data.counts[f.key]}</span> : null}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {data.total > 0 && (
        <Card className="p-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Figure label={`${data.rows.length} ${data.rows.length === 1 ? KIND_LABEL[kind] : KIND_PLURAL[kind]}`} value={eur(data.sumGross)} sub="brutto, festgeschrieben" />
            <Figure label="Netto" value={eur(data.sumNet)} />
            {kind === "rechnung" && <Figure label="Davon offen" value={eur(data.sumOpen)} tone={data.sumOpen ? "warn" : undefined} />}
          </div>
        </Card>
      )}

      {data.rows.length === 0 ? (
        <EmptyState
          title={data.total === 0 ? `Noch keine ${KIND_PLURAL[kind]}` : "Nichts in diesem Filter"}
          action={
            kind !== "storno" ? (
              <LinkButton href={`/finanzen/rechnungen/neu${kind === "angebot" ? "?art=angebot" : ""}`}>
                <Plus className="size-4" /> {kind === "angebot" ? "Angebot anlegen" : "Rechnung anlegen"}
              </LinkButton>
            ) : undefined
          }
        >
          {kind === "storno" ? "Stornos entstehen, wenn ihr eine festgeschriebene Rechnung storniert." : "Legt einen Entwurf an, prüft die Vorschau und schreibt ihn dann fest."}
        </EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {data.rows.map(({ inv, clientName, clientColor, display }) => (
              <li key={inv.id}>
                <Link href={`/finanzen/rechnungen/${inv.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-sunken/60 sm:grid-cols-[150px_1fr_120px_130px_110px]">
                  <div className="font-mono text-[13px] text-ink-2 sm:order-none">{inv.number ?? "Entwurf"}</div>
                  <div className="order-3 col-span-2 flex min-w-0 items-center gap-2 sm:order-none sm:col-span-1">
                    <Dot color={clientColor ?? "var(--color-line-2)"} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{inv.recipient?.name ?? clientName ?? "Ohne Empfänger"}</div>
                      <div className="truncate text-[13px] text-muted">{inv.title}</div>
                    </div>
                  </div>
                  <div className="hidden text-[13px] text-muted sm:block">
                    {inv.issueDate ? dateDe(inv.issueDate) : "ohne Datum"}
                    {kind === "rechnung" && inv.dueDate && inv.finalizedAt ? <div>fällig {dateDe(inv.dueDate)}</div> : null}
                  </div>
                  <div className="order-2 text-right font-semibold tabular-nums sm:order-none">{eur(inv.grossCents)}</div>
                  <div className="order-4 col-span-2 sm:order-none sm:col-span-1 sm:text-right">
                    <InvoiceStatus kind={inv.kind} status={display} />
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
