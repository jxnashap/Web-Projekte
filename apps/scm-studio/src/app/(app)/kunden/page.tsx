import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientCard, ClientRow } from "@/components/crm/client-card";
import { FilterBar, FilterSelect } from "@/components/crm/filter-bar";
import { hrefWith } from "@/components/crm/filters";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { UrlSearch } from "@/components/ui/url-search";
import { CLIENT_FILTERS, type ClientFilterKey, getClients } from "@/lib/crm/data";
import { eurShort, monthLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Kunden" };

type SP = { status?: string; q?: string };

export default function KundenPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        scene="Szene 03 · Kunden"
        title="Kunden"
        description={<span className="max-sm:hidden">Alle Betriebe mit Paket, Kontingent und nächstem Termin.</span>}
        actions={
          <LinkButton href="/kunden/neu">
            <Plus className="size-4" /> Neuer Kunde
          </LinkButton>
        }
      />
      <Suspense fallback={<ClientsSkeleton />}>
        <Clients searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const EMPTY_FILTER: Record<ClientFilterKey, string> = {
  aktuell: "Keine aktuellen Kunden",
  aktiv: "Keine aktiven Kunden",
  test: "Keine Kunden mit Testvideos",
  pausiert: "Keine pausierten Kunden",
  beendet: "Keine beendeten Kunden",
  alle: "Noch keine Kunden",
};

async function Clients({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const filter: ClientFilterKey = sp.status && sp.status in CLIENT_FILTERS ? (sp.status as ClientFilterKey) : "aktuell";
  const { clients, month, counts, kpi } = await getClients(filter, sp.q);
  const countFor = (k: ClientFilterKey) => CLIENT_FILTERS[k].statuses.reduce((s, st) => s + (counts[st] ?? 0), 0);
  const total = countFor("alle");

  return (
    <div className="grid gap-5">
      {/* Kennzahlen über alle aktiven Kunden, unabhängig von Filter und Suche */}
      <dl className="grid grid-cols-3 gap-2 text-[14px] sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
        <Kpi label="Aktive Pakete" value={kpi.active} />
        <Kpi label="Monatlich netto" value={eurShort(kpi.mrr)} />
        <Kpi label={`Kontingent ${monthLabel(month).split(" ")[0]}`} value={`${kpi.fertig}/${kpi.soll} fertig`} />
      </dl>

      <FilterBar
        search={<UrlSearch placeholder="Name, Ort, Instagram" />}
        viewInline
        view={
          <FilterSelect
            label="Status"
            className="[&>span]:max-md:sr-only"
            options={(Object.keys(CLIENT_FILTERS) as ClientFilterKey[]).map((k) => ({
              value: k,
              label: `${CLIENT_FILTERS[k].label} (${countFor(k)})`,
              href: hrefWith("/kunden", { status: k === "aktuell" ? undefined : k, q: sp.q }),
              active: filter === k,
            }))}
          />
        }
      />

      {clients.length === 0 ? (
        sp.q || filter !== "aktuell" ? (
          <EmptyState
            title={sp.q ? `Keine Treffer für „${sp.q}“` : EMPTY_FILTER[filter]}
            action={
              <LinkButton href="/kunden" variant="secondary">
                Filter zurücksetzen
              </LinkButton>
            }
          >
            {sp.q
              ? "Prüft die Schreibweise oder wählt beim Status „Alle“."
              : `Mit „Filter zurücksetzen“ seht ihr wieder die aktuellen Kunden${total ? `, unter „Alle“ alle ${total}` : ""}.`}
          </EmptyState>
        ) : (
          <EmptyState
            title="Noch keine Kunden"
            action={
              <LinkButton href="/anfragen" variant="secondary">
                Zu den Anfragen
              </LinkButton>
            }
          >
            Legt oben einen Kunden an oder macht eine gewonnene Anfrage zum Kunden.
          </EmptyState>
        )
      ) : (
        <>
          <Card className="overflow-hidden sm:hidden">
            <ul className="divide-y divide-line">
              {clients.map(({ client, kontingent, nextEvent }) => (
                <li key={client.id}>
                  <ClientRow client={client} kontingent={kontingent} nextEvent={nextEvent} />
                </li>
              ))}
            </ul>
          </Card>
          <div className="hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-3">
            {clients.map(({ client, kontingent, nextEvent }) => (
              <ClientCard key={client.id} client={client} kontingent={kontingent} nextEvent={nextEvent} month={month} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  // Handy: Wert über der Beschriftung in drei Spalten, ab Tablet in einer Zeile
  return (
    <div className="flex min-w-0 flex-col-reverse sm:flex-row sm:items-baseline sm:gap-2">
      <dt className="truncate text-[12px] text-muted sm:text-[14px]">{label}</dt>
      <dd className="truncate text-[18px] font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function ClientsSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-6 w-96 max-w-full" />
      <Skeleton className="h-10 max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-[var(--radius-card)] sm:h-64" />
        ))}
      </div>
    </div>
  );
}
