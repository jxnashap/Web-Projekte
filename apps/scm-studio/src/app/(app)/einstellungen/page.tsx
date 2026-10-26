import { Building2, ChevronLeft, FlaskConical, Hash, LayoutGrid, Plug, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Group, Row } from "@/components/einstellungen/grouped";
import { AnbindungenPane, DatenschutzPane, DemoPane, FirmaPane, KiPane, NummernPane, PortalPane, RechtPane, TeamPane } from "@/components/einstellungen/sections";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getRecentAudit } from "@/lib/dokumente/data";
import { LEGAL_TEMPLATE_VERSION } from "@/lib/dokumente/schema";
import { getSettingsOverview, nextNumber } from "@/lib/einstellungen/data";
import { AI_MODELS } from "@/lib/einstellungen/schema";

export const metadata = { title: "Einstellungen" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const REITER = ["firma", "team", "nummern", "anbindungen", "ki", "recht", "datenschutz", "portal", "demo"] as const;
type Reiter = (typeof REITER)[number];
const TITLES: Record<Reiter, string> = {
  firma: "Firma",
  team: "Team",
  nummern: "Nummernkreise",
  anbindungen: "Anbindungen",
  ki: "KI für Skripte",
  recht: "Rechtliches",
  datenschutz: "Datenschutz",
  portal: "Kundenportal",
  demo: "Demo-Daten",
};

export default function EinstellungenPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader scene="Szene 10 · Einstellungen" title="Einstellungen" description="Firma, Team, Anbindungen und alles Rechtliche an einem Ort." />
      <Suspense fallback={<Skeleton className="h-[640px]" />}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Settings({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.reiter) ? sp.reiter[0] : sp.reiter;
  const reiter = REITER.includes(raw as Reiter) ? (raw as Reiter) : null;
  const [me, o] = await Promise.all([requireUser(), getSettingsOverview()]);
  const isAdmin = me.role === "admin";
  const current: Reiter = reiter ?? "firma";
  const href = (r: Reiter) => `/einstellungen?reiter=${r}`;
  const ready = o.integrations.filter((i) => i.ok).length;
  const approved = o.legal?.approvedVersion === LEGAL_TEMPLATE_VERSION;
  const rechnung = o.sequences.find((s) => s.kind === "rechnung");
  const avvCount = Object.values(o.privacy.avv).filter(Boolean).length;
  const modelLabel = AI_MODELS.find((m) => m.id === o.ai.model)?.label ?? o.ai.model;

  const list = (
    <div className="grid content-start gap-6">
      <Group title="SCM Creatives">
        <Row href={href("firma")} active={current === "firma"} icon={Building2} tone="red" label="Firma" value={o.company?.legalName ?? "fehlt"} />
        <Row href={href("team")} active={current === "team"} icon={Users} tone="blue" label="Team" value={`${o.team.filter((t) => t.active).length} Personen`} />
        <Row href={href("nummern")} active={current === "nummern"} icon={Hash} tone="gray" label="Nummernkreise" value={nextNumber("rechnung", o.year, rechnung?.next ?? 1)} />
      </Group>
      <Group title="Technik">
        <Row href={href("anbindungen")} active={current === "anbindungen"} icon={Plug} tone="green" label="Anbindungen" value={`${ready} von ${o.integrations.length}`} />
        <Row href={href("ki")} active={current === "ki"} icon={Sparkles} tone="orange" label="KI für Skripte" value={modelLabel} />
      </Group>
      <Group title="Recht und Datenschutz">
        <Row href={href("recht")} active={current === "recht"} icon={Scale} tone="gray" label="Rechtliches" value={approved ? "freigegeben" : "Prüfung offen"} />
        <Row href={href("datenschutz")} active={current === "datenschutz"} icon={ShieldCheck} tone="green" label="Datenschutz" value={`${avvCount} von 5 AVV`} />
      </Group>
      <Group title="Weiteres">
        <Row href={href("portal")} active={current === "portal"} icon={LayoutGrid} tone="blue" label="Kundenportal" value="kommt später" />
        <Row href={href("demo")} active={current === "demo"} icon={FlaskConical} tone="orange" label="Demo-Daten" value={o.demo ? "an" : "aus"} />
      </Group>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* Handy: Liste, oder Detail mit Zurück. Desktop: Liste links, Detail rechts. */}
      <aside className={reiter ? "hidden lg:block" : ""} aria-label="Bereiche der Einstellungen">
        {list}
      </aside>
      <section className={reiter ? "" : "hidden lg:block"} aria-label={TITLES[current]}>
        {reiter && (
          <Link href="/einstellungen" className="mb-4 inline-flex items-center gap-0.5 text-[15px] text-accent lg:hidden">
            <ChevronLeft className="size-5" /> Einstellungen
          </Link>
        )}
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Detail reiter={current} o={o} isAdmin={isAdmin} meId={me.id} />
        </Suspense>
      </section>
    </div>
  );
}

async function Detail({ reiter, o, isAdmin, meId }: { reiter: Reiter; o: Awaited<ReturnType<typeof getSettingsOverview>>; isAdmin: boolean; meId: number }) {
  switch (reiter) {
    case "team":
      return <TeamPane o={o} isAdmin={isAdmin} meId={meId} />;
    case "nummern":
      return <NummernPane o={o} />;
    case "anbindungen":
      return <AnbindungenPane o={o} />;
    case "ki":
      return <KiPane o={o} isAdmin={isAdmin} />;
    case "recht":
      return <RechtPane o={o} isAdmin={isAdmin} />;
    case "datenschutz":
      return <DatenschutzPane o={o} isAdmin={isAdmin} audit={await getRecentAudit(25)} />;
    case "portal":
      return <PortalPane />;
    case "demo":
      return <DemoPane o={o} isAdmin={isAdmin} />;
    default:
      return <FirmaPane o={o} isAdmin={isAdmin} />;
  }
}
