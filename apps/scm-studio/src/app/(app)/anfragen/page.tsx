import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FilterBar, FilterSelect } from "@/components/crm/filter-bar";
import { FilterChips, hrefWith } from "@/components/crm/filters";
import { LeadBoard } from "@/components/crm/lead-board";
import type { LeadCardData } from "@/components/crm/lead-card";
import { LeadDialogsProvider } from "@/components/crm/lead-dialogs";
import { LeadFields } from "@/components/crm/lead-fields";
import { LeadList } from "@/components/crm/lead-list";
import { ParamLink } from "@/components/crm/param-link";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { FormActions } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton, ListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { Segmented } from "@/components/ui/tabs";
import { UrlSearch } from "@/components/ui/url-search";
import { createLead } from "@/lib/crm/actions";
import { filterLeads, getLeads, type LeadRow } from "@/lib/crm/data";
import { cn } from "@/lib/cn";
import { LEAD_SOURCES } from "@/lib/labels";
import { todayIso } from "@/lib/time";
import { getBranchen } from "@/lib/branchen";

export const metadata: Metadata = { title: "Anfragen" };

type SP = { ansicht?: string; score?: string; quelle?: string; q?: string };

export default function AnfragenPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        scene="Szene 02 · Anfragen"
        title="Anfragen"
        description={<span className="max-sm:hidden">Vom ersten Kontakt bis zum Kunden. Sortiert nach Fälligkeit, überfällige Schritte sind rot.</span>}
        actions={<ParamLink>Neue Anfrage</ParamLink>}
      />
      <Suspense fallback={<LeadsSkeleton />}>
        <Leads searchParams={searchParams} />
      </Suspense>
      <ParamDialog title="Neue Anfrage" description="Für Anrufe, Empfehlungen und Instagram. Anfragen aus dem Website-Quiz kommen von selbst.">
        <Suspense fallback={<FormSkeleton fields={4} />}>
          <NewLeadForm />
        </Suspense>
      </ParamDialog>
    </>
  );
}

async function NewLeadForm() {
  await connection();
  return (
    <ActionForm action={createLead} resetOnSuccess>
      <LeadFields compact today={todayIso()} />
      <FormActions>
        <SubmitButton pendingText="Legt an …">Anfrage anlegen</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

const toCard = (r: LeadRow): LeadCardData & { createdAt: Date } => ({
  id: r.lead.id,
  company: r.lead.company,
  name: r.lead.name,
  ort: r.lead.ort,
  branche: r.lead.branche,
  score: r.lead.score,
  stage: r.lead.stage,
  nextStep: r.lead.nextStep,
  nextStepAt: r.lead.nextStepAt,
  phone: r.lead.phone,
  email: r.lead.email,
  contactWay: r.lead.contactWay,
  packageInterest: r.lead.packageInterest,
  startWish: r.lead.startWish,
  source: r.lead.source,
  clientId: r.lead.clientId,
  clientName: r.clientName,
  lostReason: r.lead.lostReason,
  createdAt: r.lead.createdAt,
});

async function Leads({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  // Ohne Wahl: Handy Liste, ab Tablet Spalten
  const view = sp.ansicht === "liste" ? "liste" : sp.ansicht === "spalten" || sp.ansicht === "board" ? "spalten" : null;
  const today = todayIso();
  const all = (await getLeads()).map((r) => ({ row: r, card: toCard(r) }));
  const score = sp.score && ["A", "B", "C"].includes(sp.score) ? sp.score : undefined;
  const quelle = sp.quelle && sp.quelle in LEAD_SOURCES ? sp.quelle : undefined;
  const shown = new Set(filterLeads(all.map((x) => x.row), { score, quelle, q: sp.q }).map((r) => r.lead.id));
  const leads = all.filter((x) => shown.has(x.row.lead.id)).map((x) => x.card);

  // Kennzahlen immer über alle Anfragen, unabhängig von Filter und Suche
  const open = all.map((x) => x.card).filter((l) => l.stage !== "gewonnen" && l.stage !== "verloren");
  const overdue = open.filter((l) => l.nextStepAt && l.nextStepAt < today).length;
  const dueToday = open.filter((l) => l.nextStepAt === today).length;
  const hot = open.filter((l) => l.score === "A").length;

  const base = { ansicht: view ?? undefined, score, quelle, q: sp.q };
  const activeFilters = (score ? 1 : 0) + (quelle ? 1 : 0);
  const filtered = Boolean(activeFilters || sp.q);
  const viewItems = (fallback: "spalten" | "liste") => [
    { label: "Spalten", href: hrefWith("/anfragen", { ...base, ansicht: "spalten" }), active: (view ?? fallback) === "spalten" },
    { label: "Liste", href: hrefWith("/anfragen", { ...base, ansicht: "liste" }), active: (view ?? fallback) === "liste" },
  ];

  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-4 gap-2 text-[14px] sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
        <Kpi label="Offen" value={open.length} />
        <Kpi label="A-Anfragen" value={hot} />
        <Kpi label="Heute fällig" value={dueToday} />
        <Kpi label="Überfällig" value={overdue} alarm={overdue > 0} />
      </dl>

      <FilterBar
        active={activeFilters}
        search={<UrlSearch placeholder="Betrieb, Name oder Ort" />}
        view={
          <>
            <Segmented label="Ansicht" className="flex w-full md:hidden [&>a]:flex-1" items={viewItems("liste")} />
            <Segmented label="Ansicht" className="hidden md:inline-flex" items={viewItems("spalten")} />
          </>
        }
        filters={
          <>
            <FilterChips
              label="Bewertung"
              chips={[
                { label: "Alle", href: hrefWith("/anfragen", { ...base, score: undefined }), active: !score },
                ...["A", "B", "C"].map((s) => ({ label: s, href: hrefWith("/anfragen", { ...base, score: s }), active: score === s })),
              ]}
            />
            <FilterSelect
              label="Quelle"
              options={[
                { value: "", label: "Alle Quellen", href: hrefWith("/anfragen", { ...base, quelle: undefined }), active: !quelle },
                ...Object.entries(LEAD_SOURCES).map(([k, v]) => ({ value: k, label: v, href: hrefWith("/anfragen", { ...base, quelle: k }), active: quelle === k })),
              ]}
            />
          </>
        }
      />

      {leads.length === 0 ? (
        filtered ? (
          <EmptyState
            title={sp.q ? `Keine Treffer für „${sp.q}“` : "Keine Anfragen für diese Auswahl"}
            action={
              <LinkButton href={hrefWith("/anfragen", { ansicht: view ?? undefined })} variant="secondary">
                Filter zurücksetzen
              </LinkButton>
            }
          >
            {sp.q ? "Prüft die Schreibweise oder sucht nach Ort oder Ansprechpartner." : "Mit diesen Filtern gibt es gerade keine Anfrage."}
          </EmptyState>
        ) : (
          <EmptyState title="Noch keine Anfragen" action={<ParamLink variant="secondary">Anfrage eintragen</ParamLink>}>
            Anfragen aus dem Website-Quiz landen automatisch hier. Anrufe und Empfehlungen tragt ihr selbst ein.
          </EmptyState>
        )
      ) : (
        <LeadDialogsProvider branchen={await getBranchen()}>
          {view !== "liste" && (
            <div className={cn(view === null && "hidden md:block")}>
              <LeadBoard leads={leads} today={today} />
            </div>
          )}
          {view !== "spalten" && (
            <div className={cn(view === null && "md:hidden")}>
              <LeadList leads={leads} today={today} only={view === null ? "mobile" : undefined} />
            </div>
          )}
        </LeadDialogsProvider>
      )}
    </div>
  );
}

function Kpi({ label, value, alarm }: { label: string; value: number; alarm?: boolean }) {
  // Handy: Zahl über der Beschriftung in vier Spalten, ab Tablet in einer Zeile
  return (
    <div className="flex min-w-0 flex-col-reverse sm:flex-row sm:items-baseline sm:gap-2">
      <dt className="truncate text-[12px] text-muted sm:text-[14px]">{label}</dt>
      <dd className={cn("text-[18px] font-bold tabular-nums", alarm && "text-accent-ink")}>{value}</dd>
    </div>
  );
}

function LeadsSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-6 w-80 max-w-full" />
      <div className="hidden gap-3 overflow-hidden md:flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-80 min-w-[200px] flex-1" />
        ))}
      </div>
      <div className="md:hidden">
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
