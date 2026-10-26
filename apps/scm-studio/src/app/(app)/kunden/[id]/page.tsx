import { docStatus } from "@/lib/dokumente/schema";
import { AlertCircle, ArrowUpRight, CalendarPlus, ChevronDown, FileSignature, FileText, FolderOpen, Pencil, Plus, Receipt, ScrollText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ActiveTabIntoView } from "@/components/crm/active-tab-into-view";
import { ContactIcons, ContactList } from "@/components/crm/contact-links";
import { DirtySubmit } from "@/components/crm/dirty-submit";
import { KontingentMini } from "@/components/crm/kontingent-mini";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, ListRow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Field, FormActions, Textarea } from "@/components/ui/field";
import { Menu, menuItemClass } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import { Table, Td, Th } from "@/components/ui/table";
import { LinkTabs } from "@/components/ui/tabs";
import type { Client } from "@/db/schema";
import { updateClientNotes } from "@/lib/crm/actions";
import { PROFILE_FIELDS } from "@/lib/skripte/engine/profile";
import { saveCreativeProfile } from "@/lib/skripte/engine/profile-actions";
import {
  getClient,
  getClientCounts,
  getClientDocuments,
  getClientHistory,
  getClientInvoices,
  getClientOverview,
  getClientVideos,
} from "@/lib/crm/data";
import { dateDe, dateShort, dateTime, eur, eurShort, monthLabel, num, time } from "@/lib/format";
import { views } from "@/lib/crm/labels";
import { BRANCHEN, CLIENT_STATUS, DOC_KINDS, EVENT_KINDS, INVOICE_STATUS, LEGAL_FORMS, PLATFORMS, videoStatus } from "@/lib/labels";


const TABS = [
  { key: "ueberblick", label: "Überblick" },
  { key: "videos", label: "Videos" },
  { key: "rechnungen", label: "Rechnungen" },
  { key: "dokumente", label: "Dokumente" },
  { key: "profil", label: "Kreativprofil" },
  { key: "notizen", label: "Notizen" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ reiter?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const id = Number((await params).id);
  const client = Number.isInteger(id) ? await getClient(id).catch(() => null) : null;
  return { title: client ? `${client.name} · Kunden` : "Kunde" };
}

export default function KundePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ClientDetail params={params} searchParams={searchParams} />
    </Suspense>
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
        back={{ href: "/kunden", label: "Kunden" }}
        title={
          <span className="inline-flex items-center gap-3">
            <span className="inline-block size-4 shrink-0 rounded-full sm:size-5" style={{ background: client.color }} aria-hidden />
            <span className="break-words">{client.name}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {st && <Badge tone={st.tone}>{st.label}</Badge>}
            <span>{[BRANCHEN[client.branche] ?? client.branche, client.ort ?? client.city].filter(Boolean).join(" · ")}</span>
            <ContactIcons phone={client.phone} email={client.email} name={client.contactName ?? client.name} className="w-full xl:hidden" />
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

      <ActiveTabIntoView active={tab} className="mb-6">
        <LinkTabs
          items={TABS.map((t) => ({
            href: t.key === "ueberblick" ? `/kunden/${id}` : `/kunden/${id}?reiter=${t.key}`,
            label: t.label,
            count: countOf[t.key],
            active: tab === t.key,
          }))}
        />
      </ActiveTabIntoView>

      <Suspense key={tab} fallback={<ListSkeleton rows={5} />}>
        {tab === "ueberblick" && <Overview client={client} />}
        {tab === "videos" && <VideosTab id={id} />}
        {tab === "rechnungen" && <InvoicesTab id={id} />}
        {tab === "dokumente" && <DocumentsTab id={id} />}
        {tab === "profil" && <ProfileTab client={client} />}
        {tab === "notizen" && <NotesTab client={client} />}
      </Suspense>
    </>
  );
}

/** "Für diesen Kunden …": Anlegen mit Kunde vorbelegt. Grau, damit der rote Neu-Knopf der Kopfzeile die einzige rote Aktion bleibt. */
function QuickActions({ id }: { id: number }) {
  const items = [
    { href: `/skripte/neu?kunde=${id}`, label: "Ideen und Skript mit KI", icon: Sparkles },
    { href: `/skripte/leer?kunde=${id}`, label: "Skript selbst schreiben", icon: ScrollText },
    { href: `/produktion/material/${id}`, label: "Material hochladen", icon: FolderOpen },
    { href: `/kalender?neu=1&kunde=${id}`, label: "Termin anlegen", icon: CalendarPlus },
    { href: `/finanzen/rechnungen/neu?kunde=${id}`, label: "Rechnung schreiben", icon: Receipt },
    { href: `/finanzen/rechnungen/neu?art=angebot&kunde=${id}`, label: "Angebot schreiben", icon: FileText },
    { href: `/dokumente/neu?art=vertrag&kunde=${id}`, label: "Vertrag erstellen", icon: FileSignature },
  ];
  return (
    <Menu
      label="Für diesen Kunden anlegen"
      triggerClassName={buttonClass("secondary")}
      triggerHasText
      trigger={
        <>
          <Plus className="size-4" /> Für diesen Kunden <ChevronDown className="size-4" />
        </>
      }
    >
      {items.map((i) => (
        <Link key={i.href} href={i.href} role="menuitem" className={menuItemClass}>
          <i.icon className="size-4" /> {i.label}
        </Link>
      ))}
    </Menu>
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
  const contract = (
    [
      ["Rechtsform", c.legalForm ? (LEGAL_FORMS[c.legalForm]?.label ?? c.legalForm) : null],
      ["Kaufmann", c.legalForm ? (c.isMerchant ? "Ja" : "Nein") : null],
      ["Register", c.registerNumber],
      ["Unterzeichner", c.signatoryName ? [c.signatoryName, c.signatoryRole].filter(Boolean).join(", ") : null],
      ["USt-IdNr.", c.vatId],
      ["Steuernummer", c.taxNumber],
      ["Käuferreferenz", c.buyerReference],
    ] as [string, string | null][]
  ).filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-3 xl:items-start">
      <div className="contents xl:col-span-2 xl:grid xl:grid-cols-[minmax(0,1fr)] xl:content-start xl:gap-6">
        <Card className="order-2">
          <CardHeader
            title="Paket und Kontingent"
            sub={monthLabel(o.month)}
            action={
              <LinkButton href={`/produktion?kunde=${c.id}`} variant="ghost" size="sm">
                Zur Produktion
              </LinkButton>
            }
          />
          <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
            <Info label="Paket" value={c.packageVideos ? `${c.packageVideos} Videos im Monat` : c.status === "test" ? "Testvideos" : "Kein Paket"} />
            <Info label="Preis netto" value={c.packagePriceCents != null ? `${eur(c.packagePriceCents)} im Monat` : "Nicht hinterlegt"} muted={c.packagePriceCents == null} />
            <Info label="Kunde seit" value={c.startDate ? dateDe(c.startDate) : "Nicht hinterlegt"} muted={!c.startDate} />
            {o.kontingent && (
              <div className="col-span-2 sm:col-span-3">
                <KontingentMini k={o.kontingent} month={o.month} legend />
              </div>
            )}
            {o.openCount > 0 && (
              <p className="col-span-2 text-[14px] sm:col-span-3">
                <Link href={`/kunden/${c.id}?reiter=rechnungen`} className="inline-flex min-h-11 items-center font-semibold text-warn hover:underline sm:min-h-0">
                  {o.openCount === 1 ? "1 offene Rechnung" : `${o.openCount} offene Rechnungen`} über {eurShort(o.openSum)}
                </Link>
              </p>
            )}
          </div>
        </Card>

        <Card className="order-4">
          <CardHeader
            title="Letzte Videos"
            sub="Mit Aufrufen laut letzter Messung"
            action={
              <LinkButton href={`/kunden/${c.id}?reiter=videos`} variant="ghost" size="sm">
                Alle Videos
              </LinkButton>
            }
          />
          {o.recent.length === 0 ? (
            <EmptyState
              variant="inline"
              title="Noch keine Videos"
              action={
                <LinkButton href={`/produktion?neu=1&kunde=${c.id}`} variant="secondary">
                  Erste Video-Idee anlegen
                </LinkButton>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {o.recent.map(({ video: v, metric }) => (
                <li key={v.id}>
                  <VideoRow video={v} metric={metric} sub={[v.format, v.postDate ? `online seit ${dateShort(v.postDate)}` : monthLabel(v.month), v.isTest ? "Testvideo" : null]} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="contents xl:grid xl:grid-cols-[minmax(0,1fr)] xl:content-start xl:gap-6">
        <Card className="order-1">
          <CardHeader title="Kontakt" sub={c.contactName ?? undefined} />
          <div className="px-2 pb-2">
            <ContactList phone={c.phone} email={c.email} instagram={c.instagram} tiktok={c.tiktok} website={c.website} />
            {address.length > 0 && <p className="px-3 pb-2 pt-1 text-[14px] text-muted">{address.join(", ")}</p>}
          </div>
        </Card>

        <Card className="order-3">
          <CardHeader
            title="Nächste Termine"
            action={
              <LinkButton href={`/kalender?neu=1&kunde=${c.id}`} variant="ghost" size="sm">
                <CalendarPlus className="size-4" /> Termin anlegen
              </LinkButton>
            }
          />
          {o.upcoming.length === 0 ? (
            <p className="px-5 pb-5 text-[14px] text-muted">Kein Termin geplant.</p>
          ) : (
            <ul className="divide-y divide-line">
              {o.upcoming.map((e) => (
                <li key={e.id}>
                  <ListRow href={`/kalender/${e.id}`}>
                    <div className="w-14 shrink-0">
                      <div className="text-[12px] text-muted">{dateShort(e.startsAt)}</div>
                      <div className="text-[14px] font-bold tabular-nums">{time(e.startsAt)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">{e.title}</div>
                      {e.location && <div className="truncate text-[13px] text-muted">{e.location}</div>}
                    </div>
                    <Badge tone={EVENT_KINDS[e.kind]?.tone}>{EVENT_KINDS[e.kind]?.label ?? e.kind}</Badge>
                  </ListRow>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="order-5">
          <CardHeader
            title="Vertragsdaten"
            action={
              <LinkButton href={`/kunden/${c.id}/bearbeiten`} variant="ghost" size="sm">
                Ergänzen
              </LinkButton>
            }
          />
          <div className="grid gap-3 px-5 pb-5 text-[14px]">
            {missing.length > 0 && (
              <p className="flex items-start gap-2 rounded-[12px] bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> Für Vertrag und E-Rechnung fehlen: {missing.join(", ")}.
              </p>
            )}
            {contract.length > 0 ? (
              <dl className="grid gap-2">
                {contract.map(([label, value]) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </dl>
            ) : (
              <p className="text-muted">Noch keine Vertragsdaten hinterlegt.</p>
            )}
          </div>
        </Card>

        {o.origin && (
          <p className="order-6 text-[13px] text-muted">
            Kam über die{" "}
            <Link href={`/anfragen/${o.origin.id}`} className="font-semibold text-ink-2 underline underline-offset-2 hover:text-ink">
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
      <div className="text-[13px] text-muted">{label}</div>
      <div className={muted ? "mt-1 text-[15px] text-muted" : "mt-1 text-[15px] font-semibold"}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}

// ------------------------------------------------------------------
// Videos
// ------------------------------------------------------------------
type VideoWithMetric = Awaited<ReturnType<typeof getClientVideos>>[number];

/** Zeile in Listen (Überblick, Handy): ganze Zeile führt zum Video, rechts Aufrufe oder Status. */
function VideoRow({ video: v, metric, sub }: { video: VideoWithMetric["video"]; metric: VideoWithMetric["metric"]; sub: (string | null | false)[] }) {
  const vs = videoStatus(v.status);
  return (
    <ListRow href={`/produktion/${v.id}`}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{v.title}</div>
        <div className="truncate text-[13px] text-muted">{sub.filter(Boolean).join(" · ")}</div>
      </div>
      {metric ? (
        <div className="shrink-0 text-right">
          <div className="font-bold tabular-nums">{views(metric.views)}</div>
          <div className="text-[12px] text-muted">Aufrufe</div>
        </div>
      ) : (
        <Badge tone={vs.tone}>{vs.label}</Badge>
      )}
    </ListRow>
  );
}

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
      >
        Video-Ideen, Drehs und fertige Reels dieses Kunden erscheinen hier, mit Aufrufen laut letzter Messung.
      </EmptyState>
    );
  return (
    <>
      {/* Handy: Liste mit dem Wichtigsten (Status oder Aufrufe) */}
      <Card className="overflow-hidden sm:hidden">
        <ul className="divide-y divide-line">
          {rows.map(({ video: v, metric }) => (
            <li key={v.id}>
              <VideoRow video={v} metric={metric} sub={[monthLabel(v.month), v.format, v.isTest ? "Testvideo" : null]} />
            </li>
          ))}
        </ul>
      </Card>
      <Card className="hidden overflow-hidden sm:block">
        <Table style={{ fontVariantNumeric: "normal" }}>
          <thead>
            <tr>
              <Th>Video</Th>
              <Th>Monat</Th>
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
                <tr key={v.id} className="transition-colors hover:bg-fill-2">
                  <Td className="max-w-80">
                    <Link href={`/produktion/${v.id}`} className="block truncate font-semibold hover:underline">
                      {v.title}
                    </Link>
                    <div className="truncate text-[13px] text-muted">
                      {[v.format, v.platform ? PLATFORMS[v.platform] : null, v.isTest ? "Testvideo" : null].filter(Boolean).join(" · ")}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-ink-2">{monthLabel(v.month)}</Td>
                  <Td>
                    <Badge tone={vs.tone}>{vs.label}</Badge>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-[13px] tabular-nums md:table-cell">
                    {v.url ? (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold hover:underline">
                        {v.postDate ? dateDe(v.postDate) : "Beitrag öffnen"} <ArrowUpRight className="size-3.5" aria-hidden />
                      </a>
                    ) : v.postDate ? (
                      dateDe(v.postDate)
                    ) : (
                      <span className="text-muted" aria-label="nicht online">·</span>
                    )}
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">{metric ? num(metric.views) : <span className="text-muted" aria-label="keine Messung">·</span>}</Td>
                  <Td className="hidden text-right tabular-nums lg:table-cell">{metric ? num(metric.likes) : <span className="text-muted" aria-label="keine Messung">·</span>}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
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
      >
        Angebote und Rechnungen schreibt ihr in Finanzen. Hier seht ihr alle für diesen Kunden.
      </EmptyState>
    );
  return (
    <>
      <Card className="overflow-hidden sm:hidden">
        <ul className="divide-y divide-line">
          {rows.map((i) => {
            const s = INVOICE_STATUS[i.status];
            return (
              <li key={i.id}>
                <ListRow href={`/finanzen/rechnungen/${i.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate whitespace-nowrap text-[15px] font-semibold">
                      {INVOICE_KIND[i.kind] ?? i.kind} {i.number ?? "(Entwurf)"}
                    </div>
                    <div className="truncate text-[13px] text-muted">{[i.issueDate ? dateDe(i.issueDate) : null, i.title].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="grid shrink-0 justify-items-end gap-1">
                    <span className="text-[14px] font-semibold tabular-nums">{eur(i.grossCents)}</span>
                    <Badge tone={s?.tone}>{s?.label ?? i.status}</Badge>
                  </div>
                </ListRow>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card className="hidden overflow-hidden sm:block">
        <Table style={{ fontVariantNumeric: "normal" }}>
          <thead>
            <tr>
              <Th>Nummer</Th>
              <Th>Datum</Th>
              <Th className="text-right">Brutto</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const s = INVOICE_STATUS[i.status];
              return (
                <tr key={i.id} className="transition-colors hover:bg-fill-2">
                  <Td className="max-w-96">
                    <Link href={`/finanzen/rechnungen/${i.id}`} className="whitespace-nowrap font-semibold hover:underline">
                      {INVOICE_KIND[i.kind] ?? i.kind} {i.number ?? "(Entwurf)"}
                    </Link>
                    <div className="truncate text-[13px] text-muted">{i.title}</div>
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] tabular-nums">{i.issueDate ? dateDe(i.issueDate) : <span className="text-muted">Entwurf</span>}</Td>
                  <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{eur(i.grossCents)}</Td>
                  <Td>
                    <Badge tone={s?.tone}>{s?.label ?? i.status}</Badge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

// ------------------------------------------------------------------
// Dokumente (nur lesen)
// ------------------------------------------------------------------

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
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line">
        {rows.map((d) => {
          const s = docStatus(d.kind, d.status, d.revokedAt);
          return (
            <li key={d.id}>
              <ListRow href={`/dokumente/${d.id}`} className="py-3">
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[15px] font-semibold leading-snug">{d.title}</div>
                  <div className="truncate text-[13px] text-muted">
                    {DOC_KINDS[d.kind]?.label ?? d.kind} · geändert {dateDe(d.updatedAt)}
                    {d.revokedAt ? ` · widerrufen am ${dateDe(d.revokedAt)}` : ""}
                  </div>
                </div>
                {d.revokedAt ? <Badge tone="accent">Widerrufen</Badge> : <Badge tone={s?.tone}>{s?.label ?? d.status}</Badge>}
              </ListRow>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ------------------------------------------------------------------
// Kreativprofil (für die Creative Engine)
// ------------------------------------------------------------------
function ProfileTab({ client: c }: { client: Client }) {
  const p = c.creativeProfile ?? {};
  return (
    <Card className="max-w-4xl">
      <CardHeader
        title="Kreativprofil"
        sub="Das weiß die KI über diesen Kunden, wenn sie Ideen und Skripte entwickelt. Rollen statt Namen, keine Personendaten."
        action={
          <LinkButton href={`/skripte/neu?kunde=${c.id}`} variant="ghost" size="sm">
            <Sparkles className="size-4" /> Ideen entwickeln
          </LinkButton>
        }
      />
      <div className="px-5 pb-5">
        <ActionForm action={saveCreativeProfile.bind(null, c.id)}>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROFILE_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} name={f.key} optional hint={f.hint}>
                <Textarea name={f.key} defaultValue={p[f.key] ?? ""} placeholder={f.placeholder} rows={3} />
              </Field>
            ))}
          </div>
          <FormActions>
            <DirtySubmit>Profil speichern</DirtySubmit>
          </FormActions>
        </ActionForm>
      </div>
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
        <div className="px-5 pb-5">
          <ActionForm action={updateClientNotes.bind(null, c.id)}>
            <Field label="Notizen" name="notes">
              <Textarea name="notes" defaultValue={c.notes ?? ""} rows={12} />
            </Field>
            <FormActions>
              <DirtySubmit>Speichern</DirtySubmit>
            </FormActions>
          </ActionForm>
        </div>
      </Card>
      <Card>
        <CardHeader title="Verlauf" sub="Änderungen an den Kundendaten" />
        {history.length === 0 ? (
          <p className="px-5 pb-5 text-[14px] text-muted">Noch keine Einträge.</p>
        ) : (
          <ol className="divide-y divide-line">
            {history.map(({ entry, userName }) => {
              const detail = entry.detail as { felder?: string[]; status?: string; ausAnfrage?: number } | null;
              return (
                <li key={entry.id} className="px-5 py-3 text-[13px]">
                  <div className="font-semibold text-ink">
                    {userName ?? "System"} hat {ACTION_LABEL[entry.action] ?? entry.action}
                  </div>
                  {detail?.felder && <div className="text-ink-2">{detail.felder.join(", ")}</div>}
                  {detail?.status && <div className="text-ink-2">neu: {CLIENT_STATUS[detail.status]?.label ?? detail.status}</div>}
                  {detail?.ausAnfrage && (
                    <Link href={`/anfragen/${detail.ausAnfrage}`} className="font-medium text-ink-2 underline underline-offset-2 hover:text-ink">
                      aus einer Anfrage
                    </Link>
                  )}
                  <div className="text-[12px] tabular-nums text-muted">{dateTime(entry.at)}</div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
