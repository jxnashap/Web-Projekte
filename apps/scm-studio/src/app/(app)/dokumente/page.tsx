import { ChevronRight, FileSignature, Plus, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar, FilterSelect } from "@/components/crm/filter-bar";
import { KindIcon } from "@/components/dokumente/kind-icon";
import { Badge, Dot } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { LinkTabs } from "@/components/ui/tabs";
import { UrlSearch } from "@/components/ui/url-search";
import { countTrash, getClientOptions, listDocuments, type DocRow } from "@/lib/dokumente/data";
import { DOC_KIND_KEYS, docStatus, isDocKind, STATUS_FILTER, statusFiltersFor, ZWECKE, type DocKind, type EinwilligungData, type ZweckKey } from "@/lib/dokumente/schema";
import { dateDe, dateShort } from "@/lib/format";
import { DOC_KINDS } from "@/lib/labels";
import { cn } from "@/lib/cn";

export const metadata = { title: "Dokumente" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Kurze Reiternamen, damit alle fünf auf dem Handy Platz finden */
const TAB_LABEL: Record<DocKind, string> = { vertrag: "Verträge", einwilligung: "Einwilligungen", drehplan: "Drehpläne", monatsbericht: "Berichte" };

const CREATE_LABEL: Record<DocKind, string> = { vertrag: "Vertrag anlegen", einwilligung: "Einwilligung anlegen", drehplan: "Drehplan anlegen", monatsbericht: "Bericht anlegen" };

const rowFocus = "transition-colors hover:bg-fill-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

export default function DokumentePage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 09 · Dokumente"
        title="Dokumente"
        description={<span className="max-sm:hidden">Verträge, Einwilligungen, Drehpläne und Monatsberichte. Einwilligungen unterschreibt ihr direkt am Handy.</span>}
        actions={
          <>
            <LinkButton href="/dokumente/neu?art=einwilligung" variant="secondary">
              <FileSignature className="size-4" /> Einwilligung am Set
            </LinkButton>
            {/* auf dem Handy legt das Plus der Tab-Leiste neue Dokumente an */}
            <LinkButton href="/dokumente/neu" className="max-sm:hidden">
              <Plus className="size-4" /> Neues Dokument
            </LinkButton>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <DocumentList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DocumentList({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const art = one(sp.art);
  const activeArt = isDocKind(art) ? art : undefined;
  const kunde = Number(one(sp.kunde)) || undefined;
  const rawStatus = one(sp.status);
  // Status nur, wenn er zur Art passt (Drehpläne werden nie unterschrieben)
  const status = rawStatus && rawStatus in STATUS_FILTER && (!activeArt || STATUS_FILTER[rawStatus].kinds.includes(activeArt)) ? rawStatus : undefined;
  const q = one(sp.q)?.trim() || undefined;
  const [all, clients, trash] = await Promise.all([listDocuments({ kunde, status, q }), getClientOptions(), countTrash()]);
  const docs = activeArt ? all.filter((d) => d.kind === activeArt) : all;
  const countOf = (k?: DocKind) => (k ? all.filter((d) => d.kind === k).length : all.length);

  const href = (p: { art?: string; kunde?: number; status?: string; q?: string }) => {
    const u = new URLSearchParams();
    if (p.art) u.set("art", p.art);
    if (p.kunde) u.set("kunde", String(p.kunde));
    if (p.status) u.set("status", p.status);
    if (p.q) u.set("q", p.q);
    const s = u.toString();
    return s ? `/dokumente?${s}` : "/dokumente";
  };
  const current = { art: activeArt, kunde, status, q };
  const tabHref = (k?: DocKind) => href({ ...current, art: k, status: status && (!k || STATUS_FILTER[status].kinds.includes(k)) ? status : undefined });
  const filtered = Boolean(kunde || status || q);

  return (
    <div className="grid gap-5">
      <LinkTabs
        items={[
          { href: tabHref(), label: "Alle", count: countOf(), active: !activeArt },
          ...DOC_KIND_KEYS.map((k) => ({ href: tabHref(k), label: TAB_LABEL[k], count: countOf(k), active: activeArt === k })),
        ]}
      />
      <FilterBar
        search={<UrlSearch placeholder="Dokumente durchsuchen" />}
        active={(kunde ? 1 : 0) + (status ? 1 : 0)}
        filters={
          // Auswahlfelder auf dem grauen Seitengrund mit kräftigerer Füllung (wie das Suchfeld), sonst sind sie kaum zu sehen
          <div className="contents [&_select]:bg-fill">
            <FilterSelect
              label="Kunde"
              options={[
                { value: "", label: "Alle Kunden", href: href({ ...current, kunde: undefined }), active: !kunde },
                ...clients.map((c) => ({ value: String(c.id), label: c.name, href: href({ ...current, kunde: c.id }), active: kunde === c.id })),
              ]}
            />
            <FilterSelect
              label="Status"
              options={[
                { value: "", label: "Jeder Status", href: href({ ...current, status: undefined }), active: !status },
                ...statusFiltersFor(activeArt).map(([k, v]) => ({ value: k, label: v.label, href: href({ ...current, status: k }), active: status === k })),
              ]}
            />
          </div>
        }
      />

      {docs.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title={q ? `Keine Treffer für „${q}“` : "Keine Treffer"}
            action={
              <LinkButton href={href({ art: activeArt })} variant="secondary">
                Filter zurücksetzen
              </LinkButton>
            }
          >
            Zu diesen Filtern gibt es kein Dokument.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<KindIcon kind={activeArt ?? ""} className="size-5" />}
            title={activeArt ? `Noch keine ${DOC_KINDS[activeArt].plural}` : "Noch keine Dokumente"}
            action={
              <LinkButton href={activeArt ? `/dokumente/neu?art=${activeArt}` : "/dokumente/neu"} variant="secondary">
                <Plus className="size-4" /> {activeArt ? CREATE_LABEL[activeArt] : "Dokument anlegen"}
              </LinkButton>
            }
          >
            {activeArt ? DOC_KINDS[activeArt].hint : "Legt einen Vertrag, eine Einwilligung, einen Drehplan oder einen Monatsbericht an."}
          </EmptyState>
        )
      ) : activeArt === "einwilligung" ? (
        <ConsentRegister docs={docs} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {docs.map((d) => (
              <DocItem key={d.id} d={d} />
            ))}
          </ul>
        </Card>
      )}
      {trash > 0 && (
        <Link href="/dokumente/papierkorb" className="inline-flex items-center gap-1.5 justify-self-start rounded-lg text-[14px] text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Trash2 className="size-4" aria-hidden /> Papierkorb ({trash})
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ d, className }: { d: DocRow; className?: string }) {
  const s = docStatus(d.kind, d.status, d.revokedAt);
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

function DocItem({ d }: { d: DocRow }) {
  const kindLabel = DOC_KINDS[d.kind]?.label ?? d.kind;
  const showKind = !d.title.startsWith(kindLabel);
  const showClient = d.clientName && !d.title.includes(d.clientName);
  return (
    <li>
      <Link href={`/dokumente/${d.id}`} className={cn("flex items-center gap-3.5 px-4 py-3 sm:px-5", rowFocus)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fill-2 text-ink-2">
          <KindIcon kind={d.kind} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{d.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <StatusBadge d={d} className="sm:hidden" />
            {showKind && <span>{kindLabel}</span>}
            {showClient && (
              <span className="inline-flex items-center gap-1.5">
                <Dot color={d.clientColor ?? "var(--color-line-2)"} /> {d.clientName}
              </span>
            )}
            <span>geändert {dateShort(d.updatedAt)}</span>
          </span>
        </span>
        <StatusBadge d={d} className="max-sm:hidden" />
        <ChevronRight className="size-4 shrink-0 text-line-2" aria-hidden />
      </Link>
    </li>
  );
}

function ConsentRegister({ docs }: { docs: DocRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pb-3 pt-4">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Einwilligungs-Register</h2>
        <p className="mt-0.5 text-[13px] text-muted">Wer hat wann wofür eingewilligt, und wurde widerrufen? Bei einem Widerruf die betroffenen Videos prüfen.</p>
      </div>
      <ul className="divide-y divide-hairline border-t border-hairline">
        {docs.map((d) => {
          const data = d.data as unknown as EinwilligungData;
          const zwecke = (data.zweckeBeiUnterschrift ?? data.zwecke ?? []) as ZweckKey[];
          const signed = d.status === "unterschrieben" && !d.revokedAt;
          return (
            <li key={d.id}>
              <Link href={`/dokumente/${d.id}`} className={cn("grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4", rowFocus)}>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{data.personName || d.signerName || d.title}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {[d.clientName ?? "eigener Dreh", data.drehtag ? `Dreh ${dateDe(data.drehtag)}` : null, data.minderjaehrig ? "minderjährig" : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {zwecke.map((z) => (
                    <Badge key={z} tone={signed ? "ok" : "neutral"}>
                      {ZWECKE[z]?.label ?? z}
                    </Badge>
                  ))}
                </span>
                <span className="flex items-center gap-2 sm:justify-end">
                  {d.revokedAt ? (
                    <Badge tone="accent">Widerrufen am {dateDe(d.revokedAt)}</Badge>
                  ) : d.status === "unterschrieben" ? (
                    <Badge tone="ok">Unterschrieben {d.signedAt ? dateDe(d.signedAt) : ""}</Badge>
                  ) : d.status === "final" ? (
                    <Badge tone="warn">Unterschrift offen</Badge>
                  ) : (
                    <Badge tone="neutral">Entwurf</Badge>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
