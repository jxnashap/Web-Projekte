import { Check } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KIND_ICONS } from "@/components/dokumente/kind-icon";
import { NewDocumentForm, type Shoot } from "@/components/dokumente/new-document";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { FormSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { createDocument } from "@/lib/dokumente/actions";
import { getClientOptions, getConsentIssues, getShootEvents } from "@/lib/dokumente/data";
import { DOC_KIND_KEYS, isDocKind, type DocKind } from "@/lib/dokumente/schema";
import { fmt } from "@/lib/format";
import { DOC_KINDS } from "@/lib/labels";
import { monthIso, shiftMonth, todayIso } from "@/lib/time";

export const metadata = { title: "Neues Dokument" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Kurze Namen für die kompakte Auswahl auf dem Handy */
const SHORT: Record<DocKind, string> = { vertrag: "Vertrag", einwilligung: "Einwilligung", drehplan: "Drehplan", monatsbericht: "Bericht" };
const TILE: Record<DocKind, string> = { vertrag: "bg-ink", einwilligung: "bg-[#af52de]", drehplan: "bg-info", monatsbericht: "bg-ok" };

export default function NeuPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader scene="Szene 09 · Dokumente" back={{ href: "/dokumente", label: "Dokumente" }} title="Neues Dokument" />
      <Suspense fallback={<Skeleton className="h-96 rounded-[var(--radius-card)]" />}>
        <Inner searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inner({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const art = one(sp.art);
  const kind: DocKind | null = isDocKind(art) ? art : null;
  const keep = new URLSearchParams();
  for (const k of ["kunde", "termin", "datum"]) {
    const v = one(sp[k]);
    if (v) keep.set(k, v);
  }
  const href = (k: DocKind) => `/dokumente/neu?${new URLSearchParams({ art: k, ...Object.fromEntries(keep) })}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Art: am Computer immer als Liste links; auf dem Handy als Liste nur, solange noch keine Art gewählt ist */}
      <nav aria-label="Dokumentart" className={kind ? "max-lg:hidden" : ""}>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {DOC_KIND_KEYS.map((k) => {
              const Icon = KIND_ICONS[k];
              const active = kind === k;
              return (
                <li key={k}>
                  <Link
                    href={href(k)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-fill-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${active ? "bg-fill-2" : ""}`}
                  >
                    <span className={`grid size-[30px] shrink-0 place-items-center rounded-[8px] text-white ${TILE[k]}`}>
                      <Icon className="size-[17px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink">{DOC_KINDS[k].label}</span>
                      <span className="block text-[13px] text-muted">{DOC_KINDS[k].hint}</span>
                    </span>
                    {active && <Check className="size-[18px] shrink-0 text-accent-ink" strokeWidth={2.6} aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <p className="mt-3 px-4 text-[13px] text-muted">Für den Dreh am Set ist „Einwilligung“ der schnellste Weg.</p>
      </nav>

      <div className={kind ? "grid content-start gap-4" : "max-lg:hidden"}>
        {kind && <Segmented label="Dokumentart" className="w-full lg:hidden [&>a]:flex-1" items={DOC_KIND_KEYS.map((k) => ({ href: href(k), label: SHORT[k], active: k === kind }))} />}
        <Card className="p-5 sm:p-6">
          {kind ? (
            <Suspense fallback={<FormSkeleton fields={4} />}>
              <KindForm kind={kind} kunde={Number(one(sp.kunde)) || undefined} termin={Number(one(sp.termin)) || undefined} datum={one(sp.datum)} />
            </Suspense>
          ) : (
            <EmptyState variant="inline" title="Welche Art von Dokument?" className="py-16">
              Links auswählen. Danach füllt SCM Studio alles Weitere aus Kunde, Kalender und Produktion vor.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}

async function KindForm({ kind, kunde, termin, datum }: { kind: DocKind; kunde?: number; termin?: number; datum?: string }) {
  await connection();
  const today = todayIso();
  const needShoots = kind === "drehplan" || kind === "einwilligung";
  const [clients, events, issues] = await Promise.all([
    getClientOptions(),
    needShoots ? getShootEvents() : Promise.resolve([]),
    kind === "einwilligung" ? getConsentIssues() : Promise.resolve(undefined),
  ]);
  const shoots: Shoot[] = events.map(({ e, clientName }) => ({
    id: e.id,
    clientId: e.clientId,
    day: todayIso(e.startsAt),
    label: `${fmt(e.startsAt, "EEEEEE., d. MMM, HH:mm")} · ${clientName ?? e.title}`,
    past: todayIso(e.startsAt) < today,
  }));
  // Einwilligung am Set: Kunde aus dem heutigen Drehtermin vorbelegen
  const todaysClient = kind === "einwilligung" && !kunde ? (shoots.find((s) => s.day === today && s.clientId)?.clientId ?? undefined) : undefined;
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-[20px] font-bold tracking-[-0.025em]">{DOC_KINDS[kind].label}</h2>
        <p className="mt-0.5 text-[14px] text-muted">
          {kind === "einwilligung" && todaysClient ? "Kunde aus dem heutigen Drehtermin übernommen." : DOC_KINDS[kind].hint}
        </p>
      </div>
      <NewDocumentForm
        kind={kind}
        clients={clients.filter((c) => c.status !== "beendet").map((c) => ({ id: c.id, name: c.name }))}
        defaultClientId={kunde ?? todaysClient}
        defaultEventId={termin}
        defaultDay={datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : undefined}
        shoots={shoots}
        defaultMonth={shiftMonth(monthIso(), -1)}
        today={today}
        consentIssues={issues}
        action={createDocument}
      />
    </div>
  );
}
