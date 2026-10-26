import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FilterChips, hrefWith } from "@/components/crm/filters";
import { LeadBoard } from "@/components/crm/lead-board";
import type { LeadCardData } from "@/components/crm/lead-card";
import { LeadFields } from "@/components/crm/lead-fields";
import { LeadList } from "@/components/crm/lead-list";
import { ParamLink } from "@/components/crm/param-link";
import { SearchBox } from "@/components/crm/search-box";
import { ActionForm } from "@/components/ui/action-form";
import { ParamDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { FormActions } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { Segmented } from "@/components/ui/tabs";
import { createLead } from "@/lib/crm/actions";
import { getLeads, type LeadRow } from "@/lib/crm/data";
import { LEAD_SOURCES } from "@/lib/labels";
import { todayIso } from "@/lib/time";

export const metadata: Metadata = { title: "Anfragen" };

type SP = { ansicht?: string; score?: string; quelle?: string; q?: string };

export default function AnfragenPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader
        scene="Szene 02 · Anfragen"
        title="Anfragen"
        description="Vom ersten Kontakt bis zum Kunden. A-Anfragen zuerst, überfällige Schritte sind rot."
        actions={<ParamLink>Neue Anfrage</ParamLink>}
      />
      <Suspense fallback={<LeadsSkeleton />}>
        <Leads searchParams={searchParams} />
      </Suspense>
      <ParamDialog title="Neue Anfrage" description="Anfragen aus dem Website-Quiz kommen automatisch. Hier tragt ihr Anrufe, Empfehlungen und Instagram-Nachrichten ein." size="lg">
        <Suspense fallback={<Skeleton className="h-96" />}>
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
      <LeadFields showStage today={todayIso()} />
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
  const view = sp.ansicht === "liste" ? "liste" : "board";
  const today = todayIso();
  const rows = await getLeads({ score: sp.score, quelle: sp.quelle, q: sp.q });
  const leads = rows.map(toCard);
  const open = leads.filter((l) => l.stage !== "gewonnen" && l.stage !== "verloren");
  const overdue = open.filter((l) => l.nextStepAt && l.nextStepAt < today).length;
  const dueToday = open.filter((l) => l.nextStepAt === today).length;
  const hot = open.filter((l) => l.score === "A").length;
  const base = { ansicht: view === "liste" ? "liste" : undefined, score: sp.score, quelle: sp.quelle, q: sp.q };
  const filtered = Boolean(sp.score || sp.quelle || sp.q);

  return (
    <div className="grid gap-5">
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
        <Kpi label="Offen" value={open.length} />
        <Kpi label="A-Anfragen" value={hot} tone={hot ? "accent" : undefined} />
        <Kpi label="Heute fällig" value={dueToday} />
        <Kpi label="Überfällig" value={overdue} tone={overdue ? "accent" : undefined} />
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
          <FilterChips
            label="Bewertung"
            chips={[
              { label: "Alle", href: hrefWith("/anfragen", { ...base, score: undefined }), active: !sp.score },
              ...["A", "B", "C"].map((s) => ({ label: s, href: hrefWith("/anfragen", { ...base, score: s }), active: sp.score === s })),
            ]}
          />
          <FilterChips
            label="Quelle"
            chips={[
              { label: "Alle", href: hrefWith("/anfragen", { ...base, quelle: undefined }), active: !sp.quelle },
              ...Object.entries(LEAD_SOURCES).map(([k, v]) => ({ label: v, href: hrefWith("/anfragen", { ...base, quelle: k }), active: sp.quelle === k })),
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <SearchBox placeholder="Betrieb oder Name" label="Anfragen durchsuchen (Betrieb, Name, Ort)" />
          <Segmented
            className="shrink-0"
            items={[
              { label: "Board", href: hrefWith("/anfragen", { ...base, ansicht: undefined }), active: view === "board" },
              { label: "Liste", href: hrefWith("/anfragen", { ...base, ansicht: "liste" }), active: view === "liste" },
            ]}
          />
        </div>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title={filtered ? "Keine Anfragen für diese Auswahl" : "Noch keine Anfragen"}
          action={filtered ? undefined : <ParamLink>Erste Anfrage eintragen</ParamLink>}
        >
          {filtered
            ? "Ändert die Filter oder leert die Suche."
            : "Sobald das Website-Quiz verbunden ist, landen neue Anfragen automatisch hier. Anrufe und Empfehlungen tragt ihr selbst ein."}
        </EmptyState>
      ) : view === "board" ? (
        <LeadBoard leads={leads} today={today} />
      ) : (
        <LeadList leads={leads} today={today} />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "accent" }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={tone === "accent" ? "text-[18px] font-bold text-accent-ink" : "text-[18px] font-bold"}>{value}</dd>
    </div>
  );
}

function LeadsSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-7 w-80" />
      <Skeleton className="h-10" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-80 w-[280px] shrink-0" />
        ))}
      </div>
    </div>
  );
}
