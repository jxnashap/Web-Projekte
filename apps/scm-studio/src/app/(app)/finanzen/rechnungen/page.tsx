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
import { ListSkeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/tabs";
import { UrlSearch } from "@/components/ui/url-search";
import { KIND_LABEL, KIND_PLURAL, plural } from "@/lib/finanzen/core";
import { listInvoices } from "@/lib/finanzen/data";
import { dateDe, eur } from "@/lib/format";

export const metadata = { title: "Rechnungen" };

type Kind = "rechnung" | "angebot";

export default function RechnungenPage({ searchParams }: PageProps<"/finanzen/rechnungen">) {
  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title="Rechnungen"
        description="Rechnungen und Angebote. Entwürfe könnt ihr frei bearbeiten, festgeschriebene Rechnungen bleiben unverändert und werden bei Bedarf storniert."
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
      <Suspense fallback={<ListSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/finanzen/rechnungen">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const kind: Kind = sp.art === "angebot" ? "angebot" : "rechnung";
  const filters = STATUS_FILTERS[kind];
  // ältere Links mit ?art=storno landen bei den Rechnungen im Filter "Storniert"
  const status = sp.art === "storno" ? "storniert" : typeof sp.status === "string" && filters.some((f) => f.key === sp.status) ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const data = await listInvoices({ kind, status: status || undefined, q });
  const href = (k: Kind, st = "", search = q) => {
    const p = new URLSearchParams();
    if (k === "angebot") p.set("art", k);
    if (st) p.set("status", st);
    if (search) p.set("q", search);
    const s = p.toString();
    return s ? `/finanzen/rechnungen?${s}` : "/finanzen/rechnungen";
  };
  const nounOne = KIND_LABEL[kind];
  const nounMany = KIND_PLURAL[kind];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Art"
            items={(["rechnung", "angebot"] as const).map((k) => ({ href: href(k, ""), label: KIND_PLURAL[k], active: k === kind }))}
          />
          <UrlSearch placeholder="Nummer, Kunde oder Titel" className="min-w-48 flex-1 sm:max-w-xs" />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <Segmented
            label="Status"
            className="w-max"
            items={filters.map((f) => ({
              href: href(kind, f.key),
              label: f.key && data.counts[f.key] ? `${f.label} ${data.counts[f.key]}` : f.label,
              active: f.key === status,
            }))}
          />
        </div>
      </div>

      {data.rows.length > 0 && (
        <Card className="p-5">
          <p className="text-[15px] tabular-nums text-ink-2 sm:hidden">
            <span className="font-semibold text-ink">{plural(data.finalizedCount, nounOne, nounMany)}</span> · {eur(data.sumGross)}
            {kind === "rechnung" && !status && data.sumOpen ? <> · offen {eur(data.sumOpen)}</> : null}
            {data.draftCount ? <span className="block text-[13px] text-muted">dazu {plural(data.draftCount, "Entwurf", "Entwürfe")}</span> : null}
          </p>
          <div className="hidden gap-5 sm:grid sm:grid-cols-3">
            <Figure
              label="Festgeschrieben, brutto"
              value={eur(data.sumGross)}
              sub={`${plural(data.finalizedCount, nounOne, nounMany)}${data.draftCount ? `, dazu ${plural(data.draftCount, "Entwurf", "Entwürfe")}` : ""}`}
            />
            <Figure label="Netto" value={eur(data.sumNet)} />
            {kind === "rechnung" && !status && <Figure label="Davon offen" value={eur(data.sumOpen)} tone={data.sumOpen ? "warn" : undefined} />}
          </div>
        </Card>
      )}

      {data.rows.length === 0 ? (
        data.total === 0 ? (
          <EmptyState
            title={`Noch keine ${nounMany}`}
            action={
              <LinkButton href={`/finanzen/rechnungen/neu${kind === "angebot" ? "?art=angebot" : ""}`} variant="secondary">
                <Plus className="size-4" /> {kind === "angebot" ? "Angebot anlegen" : "Rechnung anlegen"}
              </LinkButton>
            }
          >
            Legt einen Entwurf an, prüft die Vorschau und schreibt ihn dann fest.
          </EmptyState>
        ) : (
          <EmptyState
            title={q ? `Keine ${nounMany} zu „${q}“` : "Nichts in diesem Filter"}
            action={
              <LinkButton href={href(kind, "", "")} variant="secondary" scroll={false}>
                Alle {nounMany} zeigen
              </LinkButton>
            }
          >
            {q ? "Sucht nach Rechnungsnummer, Kunde oder Titel." : `Zu diesem Status gibt es gerade keine ${nounMany}.`}
          </EmptyState>
        )
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {data.rows.map(({ inv, clientName, clientColor, display }) => {
              const name = inv.recipient?.name ?? clientName ?? "Ohne Empfänger";
              const when = inv.finalizedAt ? dateDe(inv.issueDate) : `geändert ${dateDe(inv.updatedAt)}`;
              const due = inv.kind === "rechnung" && inv.dueDate && inv.finalizedAt ? `fällig ${dateDe(inv.dueDate)}` : null;
              return (
                <li key={inv.id}>
                  <Link
                    href={`/finanzen/rechnungen/${inv.id}`}
                    className="block px-5 py-3.5 transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none"
                  >
                    {/* Handy: Kunde und Betrag tragen die Zeile */}
                    <div className="flex items-start justify-between gap-3 sm:hidden">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Dot color={clientColor ?? "var(--color-line-2)"} />
                          <span className="truncate font-semibold">{name}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[13px] text-muted">
                          {inv.number ?? "Entwurf"} · {when}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold tabular-nums">{eur(inv.grossCents)}</div>
                        <div className="mt-1">
                          <InvoiceStatus kind={inv.kind} status={display} />
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-x-4 sm:grid sm:grid-cols-[120px_minmax(0,1fr)_130px_120px_110px]">
                      <div className="text-[13px] font-medium text-ink-2">{inv.number ?? "Entwurf"}</div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Dot color={clientColor ?? "var(--color-line-2)"} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{name}</div>
                          <div className="truncate text-[13px] text-muted">{inv.title}</div>
                        </div>
                      </div>
                      <div className="text-[13px] text-muted">
                        {when}
                        {due ? <div>{due}</div> : null}
                      </div>
                      <div className="text-right font-semibold tabular-nums">{eur(inv.grossCents)}</div>
                      <div className="text-right">
                        <InvoiceStatus kind={inv.kind} status={display} />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
