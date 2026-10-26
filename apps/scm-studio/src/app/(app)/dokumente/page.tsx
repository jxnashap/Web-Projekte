import { ChevronRight, FilePen, FileSignature, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Dot } from "@/components/ui/badge";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonTable } from "@/components/ui/skeleton";
import { LinkTabs } from "@/components/ui/tabs";
import { countByKind, getClientOptions, listDocuments, type DocRow } from "@/lib/dokumente/data";
import { DOC_STATUS, isDocKind, ZWECKE, type EinwilligungData, type ZweckKey } from "@/lib/dokumente/schema";
import { dateDe, dateShort } from "@/lib/format";
import { DOC_KINDS } from "@/lib/labels";

export const metadata = { title: "Dokumente" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function DokumentePage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <PageHeader
        scene="Szene 09 · Dokumente"
        title="Dokumente"
        description="Verträge, Einwilligungen, Drehpläne und Monatsberichte. Edel in Weiß mit Logo, unterschreiben direkt am Handy oder Tablet."
        actions={
          <>
            <LinkButton href="/dokumente/neu?art=einwilligung" variant="secondary">
              <FileSignature className="size-4" /> Einwilligung am Set
            </LinkButton>
            <LinkButton href="/dokumente/neu">
              <Plus className="size-4" /> Neues Dokument
            </LinkButton>
          </>
        }
      />
      <Suspense fallback={<SkeletonTable />}>
        <DocumentList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DocumentList({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const art = one(sp.art);
  const kunde = Number(one(sp.kunde)) || undefined;
  const status = one(sp.status);
  const q = one(sp.q);
  const [docs, counts, clients] = await Promise.all([listDocuments({ art, kunde, status, q }), countByKind(), getClientOptions()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const href = (a?: string) => {
    const p = new URLSearchParams();
    if (a) p.set("art", a);
    if (kunde) p.set("kunde", String(kunde));
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/dokumente?${s}` : "/dokumente";
  };
  const activeArt = art && isDocKind(art) ? art : undefined;
  const filtered = Boolean(kunde || status || q);

  return (
    <div className="grid gap-5">
      <LinkTabs
        items={[
          { href: href(), label: "Alle", count: total, active: !activeArt },
          ...(["vertrag", "einwilligung", "drehplan", "monatsbericht"] as const).map((k) => ({
            href: href(k),
            label: k === "einwilligung" ? "Einwilligungs-Register" : DOC_KINDS[k].plural,
            count: counts[k] ?? 0,
            active: activeArt === k,
          })),
        ]}
      />
      <form className="grid gap-2 sm:grid-cols-[1fr_200px_180px_auto]" action="/dokumente" role="search">
        {activeArt && <input type="hidden" name="art" value={activeArt} />}
        <label className="sr-only" htmlFor="dok-q">
          Suchen
        </label>
        <Input id="dok-q" name="q" defaultValue={q} placeholder="Titel, Kunde oder Person suchen" />
        <label className="sr-only" htmlFor="dok-kunde">
          Kunde
        </label>
        <Select id="dok-kunde" name="kunde" defaultValue={kunde ? String(kunde) : ""}>
          <option value="">Alle Kunden</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="dok-status">
          Status
        </label>
        <Select id="dok-status" name="status" defaultValue={status ?? ""}>
          <option value="">Jeder Status</option>
          {Object.entries(DOC_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("secondary", "md", "flex-1 sm:flex-none")}>
            Filtern
          </button>
          {filtered && (
            <Link href={href(activeArt)} className={buttonClass("ghost", "md")} replace>
              Zurücksetzen
            </Link>
          )}
        </div>
      </form>

      {docs.length === 0 ? (
        <EmptyState
          title={filtered ? "Nichts gefunden" : activeArt ? `Noch keine ${DOC_KINDS[activeArt].plural}` : "Noch keine Dokumente"}
          action={
            <LinkButton href={activeArt ? `/dokumente/neu?art=${activeArt}` : "/dokumente/neu"}>
              <Plus className="size-4" /> {activeArt ? `${DOC_KINDS[activeArt].label} anlegen` : "Erstes Dokument anlegen"}
            </LinkButton>
          }
        >
          {filtered ? "Passt die Filter an oder setzt sie zurück." : "Legt einen Vertrag, eine Einwilligung, einen Drehplan oder einen Monatsbericht an."}
        </EmptyState>
      ) : activeArt === "einwilligung" ? (
        <ConsentRegister docs={docs} />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {docs.map((d) => (
              <DocItem key={d.id} d={d} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ d }: { d: DocRow }) {
  if (d.revokedAt) return <Badge tone="accent">Widerrufen</Badge>;
  const s = DOC_STATUS[d.status] ?? DOC_STATUS.entwurf;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function DocItem({ d }: { d: DocRow }) {
  return (
    <li>
      <Link href={`/dokumente/${d.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunken/50 focus-visible:bg-sunken/60 focus-visible:outline-none">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-ink-2" aria-hidden>
          <FilePen className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{d.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <span className="font-medium text-ink-2">{DOC_KINDS[d.kind]?.label ?? d.kind}</span>
            {d.clientName && (
              <span className="inline-flex items-center gap-1.5">
                <Dot color={d.clientColor ?? "var(--color-line-2)"} /> {d.clientName}
              </span>
            )}
            <span>geändert {dateShort(d.updatedAt)}</span>
          </span>
        </span>
        <StatusBadge d={d} />
        <ChevronRight className="hidden size-4 text-faint sm:block" aria-hidden />
      </Link>
    </li>
  );
}

function ConsentRegister({ docs }: { docs: DocRow[] }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold">Einwilligungs-Register</h2>
        <p className="mt-0.5 text-[13px] text-muted">Wer hat wann wofür eingewilligt, und wurde widerrufen? Bei einem Widerruf die betroffenen Videos prüfen.</p>
      </div>
      <ul className="divide-y divide-line">
        {docs.map((d) => {
          const data = d.data as unknown as EinwilligungData;
          const zwecke = (data.zweckeBeiUnterschrift ?? data.zwecke ?? []) as ZweckKey[];
          return (
            <li key={d.id}>
              <Link href={`/dokumente/${d.id}`} className="grid gap-2 px-5 py-4 transition-colors hover:bg-sunken/50 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{data.personName || d.signerName || d.title}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {[d.clientName ?? "eigener Dreh", data.drehtag ? `Dreh ${dateDe(data.drehtag)}` : null, data.minderjaehrig ? "minderjährig" : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {zwecke.map((z) => (
                    <Badge key={z} tone={d.status === "unterschrieben" && !d.revokedAt ? "ok" : "neutral"}>
                      {ZWECKE[z]?.label ?? z}
                    </Badge>
                  ))}
                </span>
                <span className="flex items-center gap-2 text-[13px] text-muted sm:justify-end">
                  {d.revokedAt ? (
                    <Badge tone="accent">Widerrufen am {dateDe(d.revokedAt)}</Badge>
                  ) : d.status === "unterschrieben" ? (
                    <Badge tone="ok">Unterschrieben {d.signedAt ? dateDe(d.signedAt) : ""}</Badge>
                  ) : (
                    <Badge tone="warn">Noch nicht unterschrieben</Badge>
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
