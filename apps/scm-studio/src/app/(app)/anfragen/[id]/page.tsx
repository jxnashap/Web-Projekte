import { ArrowLeft, CalendarPlus, UserCheck, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactList } from "@/components/crm/contact-links";
import { LeadFields } from "@/components/crm/lead-fields";
import { StageSelect } from "@/components/crm/stage-select";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { DialogButton } from "@/components/ui/dialog";
import { Field, FormActions, Input, Select, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { convertLead, deleteLead, markLeadLost, reopenLead, updateLead } from "@/lib/crm/actions";
import { getLead, getLeadEvents } from "@/lib/crm/data";
import { packageShort, SCORE_TEXT, START_WISH } from "@/lib/crm/labels";
import { dateDe, dateShort, time } from "@/lib/format";
import { EVENT_KINDS, LEAD_SCORE, LEAD_SOURCES } from "@/lib/labels";
import { todayIso } from "@/lib/time";

export const metadata: Metadata = { title: "Anfrage" };

type Props = { params: Promise<{ id: string }> };

export default function LeadPage({ params }: Props) {
  return (
    <>
      <Link href="/anfragen" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Alle Anfragen
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <LeadDetail params={params} />
      </Suspense>
    </>
  );
}

async function LeadDetail({ params }: Props) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const row = await getLead(id);
  if (!row) notFound();
  const { lead, clientName } = row;
  const leadEvents = await getLeadEvents(id);
  const score = lead.score ? LEAD_SCORE[lead.score] : null;
  const answers = Object.entries(lead.answers ?? {});
  const closed = lead.stage === "gewonnen" || lead.stage === "verloren";
  const suggestedPackage = lead.packageInterest && lead.packageInterest !== "unsicher" ? lead.packageInterest : "";

  return (
    <>
      <PageHeader
        scene="Szene 02 · Anfrage"
        title={lead.company}
        description={
          <>
            {[lead.name !== lead.company ? lead.name : null, lead.ort].filter(Boolean).join(" · ")}
            {lead.name !== lead.company || lead.ort ? <br /> : null}
            <span className="text-[13px]">
              Eingang {dateDe(lead.createdAt)} über {LEAD_SOURCES[lead.source] ?? lead.source}
            </span>
          </>
        }
        actions={<StageSelect id={lead.id} stage={lead.stage} label="Stufe ändern" size="md" />}
      />

      <TodayNote nextStepAt={lead.nextStepAt} step={lead.nextStep} closed={closed} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Angaben" sub="Alles, was ihr über den Betrieb wisst" />
          <div className="p-5">
            <ActionForm action={updateLead.bind(null, lead.id)}>
              <LeadFields lead={lead} />
              <FormActions>
                <SubmitButton>Speichern</SubmitButton>
              </FormActions>
            </ActionForm>
          </div>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Kontakt" sub={lead.name} />
            <div className="p-2">
              <ContactList phone={lead.phone} email={lead.email} preferred={lead.contactWay} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Wie geht es weiter" />
            <div className="grid gap-2 p-5">
              {lead.clientId ? (
                <LinkButton href={`/kunden/${lead.clientId}`}>
                  <UserCheck className="size-4" /> Zum Kunden {clientName}
                </LinkButton>
              ) : lead.stage !== "verloren" ? (
                <DialogButton
                  label="In Kunden umwandeln"
                  icon={<UserCheck className="size-4" />}
                  title="In Kunden umwandeln"
                  description="Legt einen Kunden mit den Kontaktdaten an und setzt die Anfrage auf „Gewonnen“."
                >
                  <ActionForm action={convertLead.bind(null, lead.id)}>
                    <div className="grid gap-4">
                      <Field label="Kundenname" name="name">
                        <Input name="name" defaultValue={lead.company} required />
                      </Field>
                      <Field label="Start mit" name="status">
                        <Select name="status" defaultValue={lead.stage === "testvideos" ? "test" : "aktiv"}>
                          <option value="test">Testvideos (noch kein Paket)</option>
                          <option value="aktiv">Paket (aktiver Kunde)</option>
                        </Select>
                      </Field>
                      <Field label="Videos pro Monat" name="packageVideos" optional hint="Preis und Vertragsdaten ergänzt ihr danach beim Kunden.">
                        <Select name="packageVideos" defaultValue={suggestedPackage}>
                          <option value="">Noch offen</option>
                          <option value="4">4 Videos</option>
                          <option value="8">8 Videos</option>
                          <option value="12">12 Videos</option>
                        </Select>
                      </Field>
                    </div>
                    <FormActions>
                      <SubmitButton pendingText="Legt an …">Kunde anlegen</SubmitButton>
                    </FormActions>
                  </ActionForm>
                </DialogButton>
              ) : null}

              {!closed && (
                <LinkButton href={`/kalender?neu=1&lead=${lead.id}`} variant="secondary">
                  <CalendarPlus className="size-4" /> Termin anlegen
                </LinkButton>
              )}

              {lead.stage === "verloren" ? (
                <>
                  {lead.lostReason && <p className="rounded-lg bg-sunken px-3 py-2 text-[14px] text-ink-2">Grund: {lead.lostReason}</p>}
                  <ActionButton action={reopenLead.bind(null, lead.id)} size="md">
                    Wieder öffnen
                  </ActionButton>
                </>
              ) : (
                !lead.clientId && (
                  <DialogButton label="Als verloren markieren" icon={<UserX className="size-4" />} variant="ghost" title="Als verloren markieren" description="Der Grund hilft später beim Nachfassen.">
                    <ActionForm action={markLeadLost.bind(null, lead.id)}>
                      <Field label="Grund" name="lostReason">
                        <Textarea name="lostReason" rows={3} placeholder="z. B. Budget, Saison vorbei, hat sich für Inhouse entschieden" required />
                      </Field>
                      <FormActions>
                        <SubmitButton variant="danger">Als verloren markieren</SubmitButton>
                      </FormActions>
                    </ActionForm>
                  </DialogButton>
                )
              )}
            </div>
            {leadEvents.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {leadEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-14 shrink-0">
                      <div className="text-[12px] text-muted">{dateShort(e.startsAt)}</div>
                      <div className="text-[14px] font-bold">{time(e.startsAt)}</div>
                    </div>
                    <div className="min-w-0 flex-1 truncate text-[14px] font-semibold">{e.title}</div>
                    <Badge tone={EVENT_KINDS[e.kind]?.tone}>{EVENT_KINDS[e.kind]?.label ?? e.kind}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Bewertung" />
            <div className="grid gap-3 p-5 text-[14px]">
              {score ? (
                <div className="flex items-start gap-3">
                  <Badge tone={score.tone}>{score.label}</Badge>
                  <p className="text-ink-2">{SCORE_TEXT[lead.score!]}</p>
                </div>
              ) : (
                <p className="text-muted">Noch nicht bewertet. Tragt Paket und Start ein, dann bewertet das Studio automatisch.</p>
              )}
              {(lead.packageInterest || lead.startWish) && (
                <p className="text-muted">
                  {[packageShort(lead.packageInterest), lead.startWish ? `Start: ${START_WISH[lead.startWish]}` : null].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </Card>

          {(answers.length > 0 || lead.message) && (
            <Card>
              <CardHeader title="Aus dem Website-Quiz" />
              <div className="p-5">
                {lead.message && <blockquote className="mb-4 border-l-2 border-accent pl-3 text-[14px] italic text-ink-2">{lead.message}</blockquote>}
                {answers.length > 0 && (
                  <dl className="grid gap-2 text-[14px]">
                    {answers.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                        <dt className="text-muted">{k.charAt(0).toUpperCase() + k.slice(1)}</dt>
                        <dd className="break-words font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Datenschutz" />
            <div className="grid gap-3 p-5 text-[13px] text-muted">
              <p>Anfragen ohne Auftrag löscht ihr nach spätestens 12 Monaten. Diese Anfrage ist vom {dateDe(lead.createdAt)}.</p>
              <div>
                <ActionButton action={deleteLead.bind(null, lead.id)} variant="danger" confirm={`Anfrage von ${lead.company} endgültig löschen?`}>
                  Anfrage löschen
                </ActionButton>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function TodayNote({ nextStepAt, step, closed }: { nextStepAt: string | null; step: string | null; closed: boolean }) {
  const today = todayIso();
  if (closed || !nextStepAt || nextStepAt > today) return null;
  const overdue = nextStepAt < today;
  return (
    <p
      role="status"
      className={
        overdue
          ? "mb-6 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[14px] font-semibold text-accent-ink"
          : "mb-6 rounded-xl border border-line bg-surface px-4 py-3 text-[14px] font-semibold text-ink"
      }
    >
      {step ?? "Nächster Schritt"}: {overdue ? `seit ${dateDe(nextStepAt)} überfällig` : "heute fällig"}
    </p>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24 w-96" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[600px]" />
        <div className="grid content-start gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}
