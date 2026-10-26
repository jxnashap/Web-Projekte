import { ArrowLeft, CalendarCheck, ChartColumn, FileSignature, ScrollText } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NewDocumentForm } from "@/components/dokumente/new-document";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { createDocument } from "@/lib/dokumente/actions";
import { getClientOptions, getShootEvents } from "@/lib/dokumente/data";
import { isDocKind, type DocKind } from "@/lib/dokumente/schema";
import { dateShort, time } from "@/lib/format";
import { DOC_KINDS } from "@/lib/labels";
import { monthIso, shiftMonth, todayIso } from "@/lib/time";

export const metadata = { title: "Neues Dokument" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const ICONS = { vertrag: ScrollText, einwilligung: FileSignature, drehplan: CalendarCheck, monatsbericht: ChartColumn } as const;

export default function NeuPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader scene="Szene 09 · Dokumente" title="Neues Dokument" description="Wählt die Art. Alles Weitere füllt SCM Studio aus Kunde, Kalender und Produktion vor." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Inner searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inner({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const art = one(sp.art);
  const kunde = Number(one(sp.kunde)) || undefined;
  const kind: DocKind | null = isDocKind(art) ? art : null;
  const q = kunde ? `&kunde=${kunde}` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <nav aria-label="Dokumentart" className="grid content-start gap-2">
        {(Object.keys(ICONS) as DocKind[]).map((k) => {
          const Icon = ICONS[k];
          const active = kind === k;
          return (
            <Link
              key={k}
              href={`/dokumente/neu?art=${k}${q}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-colors ${active ? "border-accent bg-surface shadow-[var(--shadow-card)]" : "border-line bg-surface/60 hover:border-line-2 hover:bg-surface"}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-accent text-white" : "bg-sunken text-ink-2"}`}>
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{DOC_KINDS[k].label}</span>
                <span className="block text-[13px] text-muted">{DOC_KINDS[k].hint}</span>
              </span>
            </Link>
          );
        })}
        <Link href="/dokumente" className="mt-2 inline-flex items-center gap-1.5 px-1 text-[13px] text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Zurück zu den Dokumenten
        </Link>
      </nav>
      <Card className="p-5 sm:p-6">
        {kind ? (
          <Suspense fallback={<Skeleton className="h-80" />}>
            <KindForm kind={kind} kunde={kunde} />
          </Suspense>
        ) : (
          <div className="grid h-full place-items-center py-16 text-center">
            <div>
              <p className="font-semibold">Welche Art von Dokument?</p>
              <p className="mt-1 text-[14px] text-muted">Links auswählen. Für den Dreh am Set ist „Einwilligung“ der schnellste Weg.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

async function KindForm({ kind, kunde }: { kind: DocKind; kunde?: number }) {
  await connection();
  const [clients, events] = await Promise.all([getClientOptions(), kind === "drehplan" ? getShootEvents() : Promise.resolve([])]);
  const shoots = events.map(({ e, clientName }) => ({
    id: e.id,
    clientId: e.clientId,
    day: todayIso(e.startsAt),
    label: `${dateShort(e.startsAt)}, ${time(e.startsAt)} · ${clientName ?? e.title}`,
  }));
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-[17px] font-semibold">{DOC_KINDS[kind].label}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{DOC_KINDS[kind].hint}</p>
      </div>
      <NewDocumentForm
        kind={kind}
        clients={clients.filter((c) => c.status !== "beendet").map((c) => ({ id: c.id, name: c.name }))}
        defaultClientId={kunde}
        shoots={shoots}
        defaultMonth={shiftMonth(monthIso(), -1)}
        today={todayIso()}
        action={createDocument}
      />
    </div>
  );
}
