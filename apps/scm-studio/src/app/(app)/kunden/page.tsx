import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientCard } from "@/components/crm/client-card";
import { FilterChips, hrefWith } from "@/components/crm/filters";
import { SearchBox } from "@/components/crm/search-box";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
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
        description="Alle Betriebe mit Paket, Kontingent und nächstem Termin."
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

async function Clients({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const filter: ClientFilterKey = sp.status && sp.status in CLIENT_FILTERS ? (sp.status as ClientFilterKey) : "aktuell";
  const { clients, counts, month } = await getClients(filter, sp.q);
  const countFor = (k: ClientFilterKey) => CLIENT_FILTERS[k].statuses.reduce((s, st) => s + (counts[st] ?? 0), 0);
  const active = clients.filter((c) => c.client.status === "aktiv");
  const mrr = active.reduce((s, c) => s + (c.client.packagePriceCents ?? 0), 0);
  const soll = clients.reduce((s, c) => s + (c.kontingent?.soll ?? 0), 0);
  const fertig = clients.reduce((s, c) => s + Math.min(c.kontingent?.fertig ?? 0, c.kontingent?.soll ?? 0), 0);

  return (
    <div className="grid gap-5">
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
        <div className="flex items-baseline gap-2">
          <dt className="text-muted">Aktive Pakete</dt>
          <dd className="text-[18px] font-bold">{active.length}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted">Monatlich netto</dt>
          <dd className="text-[18px] font-bold">{eurShort(mrr)}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted">Kontingent {monthLabel(month)}</dt>
          <dd className="text-[18px] font-bold">
            {fertig}/{soll} fertig
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          label="Status"
          chips={(Object.keys(CLIENT_FILTERS) as ClientFilterKey[]).map((k) => ({
            label: CLIENT_FILTERS[k].label,
            href: hrefWith("/kunden", { status: k === "aktuell" ? undefined : k, q: sp.q }),
            active: filter === k,
            count: countFor(k),
          }))}
        />
        <SearchBox placeholder="Name, Ort, Instagram" label="Kunden durchsuchen" />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title={sp.q ? `Keine Kunden zu „${sp.q}“` : "Hier ist noch niemand"}
          action={
            <LinkButton href="/kunden/neu" variant="secondary">
              Kunden anlegen
            </LinkButton>
          }
        >
          {sp.q ? "Prüft die Schreibweise oder wechselt den Status-Filter." : "Legt einen Kunden an oder wandelt eine gewonnene Anfrage um."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map(({ client, kontingent, nextEvent }) => (
            <ClientCard key={client.id} client={client} kontingent={kontingent} nextEvent={nextEvent} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientsSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-7 w-96" />
      <Skeleton className="h-10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
