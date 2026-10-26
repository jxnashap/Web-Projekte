import { AlertCircle, ArrowLeft, ArrowUpRight, CalendarPlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactList } from "@/components/crm/contact-links";
import { NewMenu } from "@/components/crm/new-menu";
import { KontingentBar } from "@/components/kontingent-bar";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Field, FormActions, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, Td, Th } from "@/components/ui/table";
import { LinkTabs } from "@/components/ui/tabs";
import type { Client } from "@/db/schema";
import { updateClientNotes } from "@/lib/crm/actions";
import {
  getClient,
  getClientCounts,
  getClientDocuments,
  getClientHistory,
  getClientInvoices,
  getClientOverview,
  getClientVideos,
} from "@/lib/crm/data";
import { compact, dateDe, dateShort, dateTime, eur, eurShort, monthLabel, num, time } from "@/lib/format";
import { BRANCHEN, CLIENT_STATUS, DOC_KINDS, EVENT_KINDS, INVOICE_STATUS, LEGAL_FORMS, PLATFORMS, videoStatus } from "@/lib/labels";

export const metadata: Metadata = { title: "Kunde" };

const TABS = [
  { key: "ueberblick", label: "Überblick" },
  { key: "videos", label: "Videos" },
  { key: "rechnungen", label: "Rechnungen" },
  { key: "dokumente", label: "Dokumente" },
  { key: "notizen", label: "Notizen" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ reiter?: string }> };

export default function KundePage({ params, searchParams }: Props) {
  return (
    <>
      <Link href="/kunden" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Alle Kunden
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ClientDetail params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ClientDetail({ params, searchParams }: Props) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [client, sp] = await Promise.all([getClient(id), searchParams]);
  if (!client) notFound();
  const tab: TabKey = TABS.some((t) => t.key === sp.reiter) ? (sp.reiter as TabKey) : "ueberblick";
  const counts = await getClientCounts(id);
  const st = CLIENT_STATUS[client.status];
  const countOf: Partial<Record<TabKey, number>> = { videos: counts.videos, rechnungen: counts.invoices, dokumente: counts.documents };

  return (
    <>
      <PageHeader
        scene="Szene 03 · Kunde"
        title={
          <span className="inline-flex items-center gap-3">
            <span className="inline-block size-4 shrink-0 rounded-full sm:size-5" style={{ background: client.color }} aria-hidden />
            <span className="break-words">{client.name}</span>
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            {st && <Badge tone={st.tone}>{st.label}</Badge>}
            <span>{[BRANCHEN[client.branche] ?? client.branche, client.ort ?? client.city].filter(Boolean).join(" · ")}</span>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/kunden/${id}/bearbeiten`} variant="secondary">
              <Pencil className="size-4" /> Bearbeiten
            </LinkButton>
            <QuickActions id={id} />
          </>
        }
      />

      <LinkTabs
        className="mb-6"
        items={TABS.map((t) => ({
          href: t.key === "ueberblick" ? `/kunden/${id}` : `/kunden/${id}?reiter=${t.key}`,
          label: t.label,
          count: countOf[t.key],
          active: tab === t.key,
        }))}
      />

      <Suspense key={tab} fallback={<SkeletonTable rows={5} />}>
        {tab === "ueberblick" && <Overview client={client} />}
        {tab === "videos" && <VideosTab id={id} />}
        {tab === "rechnungen" && <InvoicesTab id={id} />}
        {tab === "dokumente" && <DocumentsTab id={id} />}
        {tab === "notizen" && <NotesTab client={client} />}
      </Suspense>
    </>
  );
}

function QuickActions({ id }: { id: number }) {
  return (
    <NewMenu
      items={[
        { href: `/produktion?neu=1&kunde=${id}`, label: "Video-Idee" },
        { href: `/skripte/neu?kunde=${id}`, label: "Skript schreiben" },
        { href: `/kalender?neu=1&kunde=${id}`, label: "Termin anlegen" },
        { href: `/finanzen/rechnungen/neu?kunde=${id}`, label: "Rechnung schreiben" },
        { href: `/finanzen/rechnungen/neu?art=angebot&kunde=${id}`, label: "Angebot schreiben" },
        { href: `/dokumente/neu?art=vertrag&kunde=${id}`, label: "Vertrag erstellen" },
      ]}
    />
  );
}

// ------------------------------------------------------------------
// Überblick
// ------------------------------------------------------------------
async function Overview({ client: c }: { client: Client }) {
  const o = await getClientOverview(c.id);
  const missing = [
    !c.legalForm && "Rechtsform",
    !c.street && "Straße",
    !(c.zip && c.city) && "PLZ und Ort",
    !c.signatoryName && "Unterzeichner",
  ].filter(Boolean) as string[];
  const address = [c.street, [c.zip, c.city].filter(Boolean).join(" ")].filter(Boolean);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="grid content-start gap-6 xl:col-span-2">
        <Card>
          <CardHeader
            title="Paket und Kontingent"
            sub={monthLabel(o.month)}
            action={
              <LinkButton href={`/produktion?kunde=${c.id}`} variant="ghost" size="sm">
                Produktion <ArrowUpRight className="size-4" />
              </LinkButton>
            }
          />
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <Info label="Paket" value={c.packageVideos ? `${c.packageVideos} Videos im Monat` : c.status === "test" ? "Testvideos" : "Kein Paket"} />
            <Info label="Preis netto" value={c.packagePriceCents != null ? `${eur(c.packagePriceCents)} im Monat` : "Nicht hinterlegt"} muted={c.packagePriceCents == null} />
            <Info label="Kunde seit" value={c.startDate ? dateDe(c.startDate) : "Nicht hinterlegt"} muted={!c.startDate} />
            {o.kontingent && (
              <div className="sm:col-span-3">
                <KontingentBar k={o.kontingent} />
              </div>
            )}
            {o.openCount > 0 && (
              <p className="text-[14px] sm:col-span-3">
                <Link href={`/kunden/${c.id}?reiter=rechnungen`} className="font-semibold text-warn hover:underline">
                  {o.openCount === 1 ? "1 offene Rechnung" : `${o.openCount} offene Rechnungen`} über {eurShort(o.openSum)}
                </Link>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Letzte Videos"
            sub="Mit Aufrufen laut letzter Messung"
            action={
              <LinkButton href={`/kunden/${c.id}?reiter=videos`} variant="ghost" size="sm">
                Alle <ArrowUpRight className="size-4" />
              </LinkButton>
            }
          />
          {o.recent.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Noch keine Videos"
                action={
                  <LinkButton href={`/produktion?neu=1&kunde=${c.id}`} variant="secondary">
                    Erste Video-Idee anlegen
                  </LinkButton>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {o.recent.map(({ video: v, metric }) => {
                const vs = videoStatus(v.status);
                return (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/produktion/${v.id}`} className="block truncate font-semibold hover:underline">
                        {v.title}
                      </Link>
                      <div className="truncate text-[13px] text-muted">
                        {[v.format, v.postDate ? `online seit ${dateShort(v.postDate)}` : monthLabel(v.month), v.isTest ? "Testvideo" : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {metric ? (
                      <div className="text-right">
                        <div className="font-bold">{compact(metric.views)}</div>
                        <div className="text-[12px] text-muted">Aufrufe</div>
                      </div>
                    ) : (
                      <Badge tone={vs.tone}>{vs.label}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader title="Kontakt" sub={c.contactName ?? undefined} />
          <div className="p-2">
            <ContactList phone={c.phone} email={c.email} instagram={c.instagram} website={c.website} />
            {c.tiktok && (
              <a href={`https://www.tiktok.com/@${c.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[14px] text-ink-2 hover:bg-sunken hover:text-ink">
                <span className="w-4 text-center font-mono text-[12px] text-muted">TT</span> {c.tiktok}
              </a>
            )}
            {address.length > 0 && <p className="px-3 pb-2 pt-1 text-[14px] text-muted">{address.join(", ")}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Nächste Termine"
            action={
              <LinkButton href={`/kalender?neu=1&kunde=${c.id}`} variant="ghost" size="sm">
                Neu <CalendarPlus className="size-4" />
              </LinkButton>
            }
          />
          {o.upcoming.length === 0 ? (
            <p className="p-5 text-[14px] text-muted">Kein Termin geplant.</p>
          ) : (
            <ul className="divide-y divide-line">
              {o.upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-14 shrink-0">
                    <div className="font-mono text-[11px] uppercase text-muted">{dateShort(e.startsAt)}</div>
                    <div className="text-[14px] font-bold">{time(e.startsAt)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{e.title}</div>
                    {e.location && <div className="truncate text-[13px] text-muted">{e.location}</div>}
                  </div>
                  <Badge tone={EVENT_KINDS[e.kind]?.tone}>{EVENT_KINDS[e.kind]?.label ?? e.kind}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Vertragsdaten"
            action={
              <LinkButton href={`/kunden/${c.id}/bearbeiten`} variant="ghost" size="sm">
                Ergänzen
              </LinkButton>
            }
          />
          <div className="grid gap-3 p-5 text-[14px]">
            {missing.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> Für Vertrag und E-Rechnung fehlen: {missing.join(", ")}.
              </p>
            )}
            <dl className="grid gap-2">
              <Row label="Rechtsform" value={c.legalForm ? (LEGAL_FORMS[c.legalForm]?.label ?? c.legalForm) : null} />
              <Row label="Kaufmann" value={c.legalForm ? (c.isMerchant ? "Ja" : "Nein") : null} />
              <Row label="Register" value={c.registerNumber} />
              <Row label="Unterzeichner" value={c.signatoryName ? [c.signatoryName, c.signatoryRole].filter(Boolean).join(", ") : null} />
              <Row label="USt-IdNr." value={c.vatId} />
              <Row label="Steuernummer" value={c.taxNumber} />
              <Row label="Käuferreferenz" value={c.buyerReference} />
            </dl>
          </div>
        </Card>

        {o.origin && (
          <p className="text-[13px] text-muted">
            Kam über die{" "}
            <Link href={`/anfragen/${o.origin.id}`} className="font-semibold text-ink-2 underline-offset-2 hover:underline">
              Anfrage vom {dateDe(o.origin.createdAt)}
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div className="scene-label">{label}</div>
      <div className={muted ? "mt-1 text-[15px] text-muted" : "mt-1 text-[15px] font-semibold"}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={value ? "break-words font-medium" : "text-faint"}>{value || "nicht hinterlegt"}</dd>
    </div>
  );
}

// ------------------------------------------------------------------
// Videos
// ------------------------------------------------------------------
async function VideosTab({ id }: { id: number }) {
  const rows = await getClientVideos(id);
  if (rows.length === 0)
    return (
      <EmptyState
        title="Noch keine Videos"
        action={
          <LinkButton href={`/produktion?neu=1&kunde=${id}`} variant="secondary">
            Video-Idee anlegen
          </LinkButton>
        }
      />
    );
  return (
    <Card className="overflow-hidden">
      <Table>
        <thead>
          <tr>
            <Th>Video</Th>
            <Th className="hidden sm:table-cell">Monat</Th>
            <Th>Status</Th>
            <Th className="hidden md:table-cell">Online</Th>
            <Th className="text-right">Aufrufe</Th>
            <Th className="hidden text-right lg:table-cell">Likes</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ video: v, metric }) => {
            const vs = videoStatus(v.status);
            return (
              <tr key={v.id}>
                <Td className="max-w-80">
                  <Link href={`/produktion/${v.id}`} className="block truncate font-semibold hover:underline">
                    {v.title}
                  </Link>
                  <div className="truncate text-[13px] text-muted">
                    {[v.format, v.platform ? PLATFORMS[v.platform] : null, v.isTest ? "Testvideo" : null].filter(Boolean).join(" · ")}
                  </div>
                </Td>
                <Td className="hidden whitespace-nowrap text-[13px] text-ink-2 sm:table-cell">{monthLabel(v.month)}</Td>
                <Td>
                  <Badge tone={vs.tone}>{vs.label}</Badge>
                </Td>
                <Td className="hidden whitespace-nowrap text-[13px] md:table-cell">
                  {v.url ? (
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold hover:underline">
                      {v.postDate ? dateDe(v.postDate) : "Ansehen"} <ArrowUpRight className="size-3.5" />
                    </a>
                  ) : v.postDate ? (
                    dateDe(v.postDate)
                  ) : (
                    <span className="text-faint">·</span>
                  )}
                </Td>
                <Td className="text-right font-semibold">{metric ? num(metric.views) : <span className="text-faint">·</span>}</Td>
                <Td className="hidden text-right lg:table-cell">{metric ? num(metric.likes) : <span className="text-faint">·</span>}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

// ------------------------------------------------------------------
// Rechnungen (nur lesen, bearbeitet wird in Finanzen)
// ------------------------------------------------------------------
const INVOICE_KIND: Record<string, string> = { rechnung: "Rechnung", angebot: "Angebot", storno: "Storno" };

async function InvoicesTab({ id }: { id: number }) {
  const rows = await getClientInvoices(id);
  if (rows.length === 0)
    return (
      <EmptyState
        title="Noch keine Angebote oder Rechnungen"
        action={
          <LinkButton href={`/finanzen/rechnungen/neu?kunde=${id}`} variant="secondary">
            Rechnung schreiben
          </LinkButton>
        }
      />
    );
  return (
    <Card className="overflow-hidden">
      <Table>
        <thead>
          <tr>
            <Th>Beleg</Th>
            <Th className="hidden sm:table-cell">Datum</Th>
            <Th className="text-right">Brutto</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => {
            const s = INVOICE_STATUS[i.status];
            return (
              <tr key={i.id}>
                <Td>
                  <Link href={`/finanzen/rechnungen/${i.id}`} className="font-semibold hover:underline">
                    {INVOICE_KIND[i.kind] ?? i.kind} {i.number ?? "(Entwurf)"}
                  </Link>
                  <div className="truncate text-[13px] text-muted">{i.title}</div>
                </Td>
                <Td className="hidden whitespace-nowrap text-[13px] sm:table-cell">{i.issueDate ? dateDe(i.issueDate) : <span className="text-faint">·</span>}</Td>
                <Td className="whitespace-nowrap text-right font-semibold">{eur(i.grossCents)}</Td>
                <Td>
                  <Badge tone={s?.tone}>{s?.label ?? i.status}</Badge>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

// ------------------------------------------------------------------
// Dokumente (nur lesen)
// ------------------------------------------------------------------
const DOC_STATUS: Record<string, { label: string; tone: "neutral" | "info" | "ok" }> = {
  entwurf: { label: "Entwurf", tone: "neutral" },
  final: { label: "Fertig", tone: "info" },
  unterschrieben: { label: "Unterschrieben", tone: "ok" },
};

async function DocumentsTab({ id }: { id: number }) {
  const rows = await getClientDocuments(id);
  if (rows.length === 0)
    return (
      <EmptyState
        title="Noch keine Dokumente"
        action={
          <LinkButton href={`/dokumente/neu?art=vertrag&kunde=${id}`} variant="secondary">
            Vertrag erstellen
          </LinkButton>
        }
      >
        Verträge, Einwilligungen, Drehpläne und Monatsberichte dieses Kunden erscheinen hier.
      </EmptyState>
    );
  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map((d) => {
          const s = DOC_STATUS[d.status];
          return (
            <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <Link href={`/dokumente/${d.id}`} className="block truncate font-semibold hover:underline">
                  {d.title}
                </Link>
                <div className="truncate text-[13px] text-muted">
                  {DOC_KINDS[d.kind]?.label ?? d.kind} · zuletzt geändert {dateDe(d.updatedAt)}
                  {d.revokedAt ? ` · widerrufen am ${dateDe(d.revokedAt)}` : ""}
                </div>
              </div>
              {d.revokedAt ? <Badge tone="accent">Widerrufen</Badge> : <Badge tone={s?.tone}>{s?.label ?? d.status}</Badge>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ------------------------------------------------------------------
// Notizen + Verlauf
// ------------------------------------------------------------------
const ACTION_LABEL: Record<string, string> = { angelegt: "angelegt", geändert: "geändert", status: "Status geändert", gelöscht: "gelöscht" };

async function NotesTab({ client: c }: { client: Client }) {
  const history = await getClientHistory(c.id);
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Notizen" sub="Ton, Formate, Wünsche, Besonderheiten beim Dreh" />
        <div className="p-5">
          <ActionForm action={updateClientNotes.bind(null, c.id)}>
            <Field label="Notizen" name="notes">
              <Textarea name="notes" defaultValue={c.notes ?? ""} rows={12} className="font-mono text-[13.5px]" />
            </Field>
            <FormActions>
              <SubmitButton>Notizen speichern</SubmitButton>
            </FormActions>
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title="Verlauf" sub="Änderungen an den Kundendaten" />
        {history.length === 0 ? (
          <p className="p-5 text-[14px] text-muted">Noch keine Einträge.</p>
        ) : (
          <ol className="divide-y divide-line">
            {history.map(({ entry, userName }) => {
              const detail = entry.detail as { felder?: string[]; status?: string; ausAnfrage?: number } | null;
              return (
                <li key={entry.id} className="px-5 py-3 text-[13px]">
                  <div className="font-semibold text-ink">
                    {userName ?? "System"} hat {ACTION_LABEL[entry.action] ?? entry.action}
                  </div>
                  {detail?.felder && <div className="text-muted">{detail.felder.join(", ")}</div>}
                  {detail?.status && <div className="text-muted">neu: {CLIENT_STATUS[detail.status]?.label ?? detail.status}</div>}
                  {detail?.ausAnfrage && <div className="text-muted">aus einer Anfrage</div>}
                  <div className="font-mono text-[11px] text-faint">{dateTime(entry.at)}</div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-96" />
      <Skeleton className="h-10" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-96 xl:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

