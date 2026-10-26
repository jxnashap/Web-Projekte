import { CalendarPlus, RotateCcw, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactList } from "@/components/crm/contact-links";
import { DirtySubmit } from "@/components/crm/dirty-submit";
import { LeadActions } from "@/components/crm/lead-actions";
import { NextStep } from "@/components/crm/lead-card";
import { LeadDialogsProvider } from "@/components/crm/lead-dialogs";
import { LeadFields } from "@/components/crm/lead-fields";
import { StageSelect } from "@/components/crm/stage-select";
import { EventForm } from "@/components/kalender/event-form";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, ListRow } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { DialogButton } from "@/components/ui/dialog";
import { FormActions } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { addLeadEvent, reopenLead, updateLead } from "@/lib/crm/actions";
import { getLead, getLeadEvents } from "@/lib/crm/data";
import { ageInDays, packageShort, SCORE_TEXT, START_WISH } from "@/lib/crm/labels";
import { dateDe, dateShort, time } from "@/lib/format";
import { getCalendarOptions } from "@/lib/kalender/data";
import { EVENT_KINDS, LEAD_SCORE, LEAD_SOURCES } from "@/lib/labels";
import { todayIso } from "@/lib/time";
import { getBranchen } from "@/lib/branchen";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  const row = Number.isInteger(id) ? await getLead(id).catch(() => null) : null;
  return { title: row ? `${row.lead.company} · Anfragen` : "Anfrage" };
}

export default function LeadPage({ params }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LeadDetail params={params} />
    </Suspense>
  );
}

async function LeadDetail({ params }: Props) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const row = await getLead(id);
  if (!row) notFound();
  const { lead, clientName } = row;
  const [leadEvents, calendar, branchen] = await Promise.all([getLeadEvents(id), getCalendarOptions(), getBranchen()]);
  const today = todayIso();
  const score = lead.score ? LEAD_SCORE[lead.score] : null;
  const answers = Object.entries(lead.answers ?? {});
  const lost = lead.stage === "verloren";
  const converted = Boolean(lead.clientId);
  // offen = noch nicht Kunde und nicht verloren (auch "Gewonnen" ohne Kunde aus älteren Daten lässt sich umwandeln)
  const open = !lost && !converted;
  const working = open && lead.stage !== "gewonnen";
  const ref = { id: lead.id, company: lead.company, branche: lead.branche, packageInterest: lead.packageInterest, stage: lead.stage };
  const ageDays = ageInDays(lead.createdAt);

  return (
    <LeadDialogsProvider branchen={branchen}>
      <PageHeader
        back={{ href: "/anfragen", label: "Anfragen" }}
        title={lead.company}
        description={
          <>
            {[lead.name !== lead.company ? lead.name : null, lead.ort].filter(Boolean).join(" · ")}
            {lead.name !== lead.company || lead.ort ? <br /> : null}
            <span className="text-[14px]">
              Eingang {dateDe(lead.createdAt)} über {LEAD_SOURCES[lead.source] ?? lead.source}
            </span>
          </>
        }
        actions={
          converted ? (
            <>
              <LinkButton href={`/kunden/${lead.clientId}`} variant="secondary">
                <UserCheck className="size-4" /> Zum Kunden {clientName}
              </LinkButton>
              <LeadActions lead={ref} open={false} />
            </>
          ) : lost ? (
            <>
              <ActionButton action={reopenLead.bind(null, lead.id)} size="md">
                <RotateCcw className="size-4" /> Wieder öffnen
              </ActionButton>
              <LeadActions lead={ref} open={false} />
            </>
          ) : (
            <LeadActions lead={ref} open />
          )
        }
      />

      <TodayNote nextStepAt={lead.nextStepAt} step={lead.nextStep} closed={!working} today={today} />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card className="order-3 lg:order-none">
          <CardHeader title="Angaben" sub="Alles, was ihr über den Betrieb wisst" />
          <div className="p-5">
            {/* Neu aufbauen, wenn sich die Anfrage serverseitig ändert (z. B. verloren: nächster Schritt entfällt) */}
            <ActionForm key={lead.updatedAt.getTime()} action={updateLead.bind(null, lead.id)}>
              <LeadFields lead={lead} today={today} />
              <FormActions>
                <DirtySubmit variant={open ? "secondary" : "primary"}>Speichern</DirtySubmit>
              </FormActions>
            </ActionForm>
          </div>
        </Card>

        <div className="contents lg:grid lg:grid-cols-[minmax(0,1fr)] lg:content-start lg:gap-6">
          <Card className="order-1">
            <CardHeader title="Kontakt" sub={lead.name !== lead.company ? lead.name : undefined} />
            <div className="px-2 pb-2">
              <ContactList phone={lead.phone} email={lead.email} preferred={lead.contactWay} />
            </div>
          </Card>

          <Card className="order-2">
            <CardHeader title="Wie geht es weiter" />
            <div className="grid gap-4 px-5 pb-5">
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium text-ink-2">Stufe</span>
                {converted ? (
                  <p className="text-[15px]">
                    <Badge tone="ok">Gewonnen</Badge> <span className="ml-1 text-ink-2">Kunde: {clientName}</span>
                  </p>
                ) : (
                  <StageSelect lead={ref} label="Stufe" />
                )}
                {lost && <p className="text-[14px] text-ink-2">{lead.lostReason ? `Grund: ${lead.lostReason}` : "Ohne Grund als verloren markiert."}</p>}
                {lead.stage === "gewonnen" && !converted && (
                  <p className="text-[13px] text-muted">Noch kein Kunde angelegt. Wählt „Gewonnen …“, um ihn anzulegen.</p>
                )}
              </div>
              {working && (
                <div className="grid gap-1.5">
                  <span className="text-[13px] font-medium text-ink-2">Nächster Schritt</span>
                  {lead.nextStep || lead.nextStepAt ? (
                    <NextStep step={lead.nextStep} at={lead.nextStepAt} today={today} className="text-[14px]" />
                  ) : (
                    <p className="text-[14px] text-muted">Noch keiner eingetragen. Tragt ihn unten bei den Angaben ein oder legt einen Termin an.</p>
                  )}
                </div>
              )}
              {working && (
                <DialogButton
                  label="Termin anlegen"
                  icon={<CalendarPlus className="size-4" />}
                  variant="secondary"
                  title="Termin anlegen"
                  description={`Der Termin wird zum nächsten Schritt von ${lead.company}.`}
                  dialogSize="lg"
                >
                  <EventForm
                    action={addLeadEvent.bind(null, lead.id)}
                    options={calendar}
                    submitLabel="Termin anlegen"
                    defaults={{
                      startDate: today,
                      startTime: "10:00",
                      endTime: "11:00",
                      kind: "gespraech",
                      leadId: lead.id,
                      title: `Kennenlernen ${lead.company}`,
                      location: "Telefon",
                    }}
                  />
                </DialogButton>
              )}
            </div>
            {leadEvents.length > 0 && (
              <ul className="border-t border-line">
                {leadEvents.map((e) => (
                  <li key={e.id} className="border-b border-line/70 last:border-b-0">
                    <ListRow href={`/kalender/${e.id}`}>
                      <div className="w-14 shrink-0">
                        <div className="text-[12px] text-muted">{dateShort(e.startsAt)}</div>
                        <div className="text-[14px] font-bold tabular-nums">{time(e.startsAt)}</div>
                      </div>
                      <div className="min-w-0 flex-1 truncate text-[14px] font-semibold">{e.title}</div>
                      <Badge tone={EVENT_KINDS[e.kind]?.tone}>{EVENT_KINDS[e.kind]?.label ?? e.kind}</Badge>
                    </ListRow>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="order-4">
            <CardHeader title="Bewertung" />
            <div className="grid gap-3 px-5 pb-5 text-[14px]">
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
            <Card className="order-5">
              <CardHeader title="Aus dem Website-Quiz" />
              <div className="px-5 pb-5">
                {lead.message && <blockquote className="mb-4 rounded-[12px] bg-fill-2 px-3.5 py-2.5 text-[14px] text-ink-2">„{lead.message}“</blockquote>}
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

          <Card className="order-6">
            <CardHeader title="Datenschutz" />
            <div className="grid gap-3 px-5 pb-5 text-[14px] text-muted">
              {!converted && ageDays > 365 ? (
                <p className="rounded-[12px] bg-warn-soft px-3 py-2 font-medium text-warn">
                  Diese Anfrage ist älter als 12 Monate und wurde nicht zum Auftrag. Bitte löschen (Menü „Mehr“ oben).
                </p>
              ) : (
                <p>
                  Anfragen ohne Auftrag löscht ihr nach spätestens 12 Monaten, über das Menü „Mehr“ oben. Diese Anfrage ist vom {dateDe(lead.createdAt)}.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </LeadDialogsProvider>
  );
}

function TodayNote({ nextStepAt, step, closed, today }: { nextStepAt: string | null; step: string | null; closed: boolean; today: string }) {
  if (closed || !nextStepAt || nextStepAt > today) return null;
  const overdue = nextStepAt < today;
  return (
    <p
      role="status"
      className={
        overdue
          ? "mb-6 rounded-[14px] bg-accent-soft px-4 py-3 text-[15px] font-semibold text-accent-ink"
          : "mb-6 rounded-[14px] bg-surface px-4 py-3 text-[15px] font-semibold text-ink shadow-[var(--shadow-card)]"
      }
    >
      {overdue ? `Überfällig seit ${dateDe(nextStepAt)}: ` : /heute/i.test(step ?? "") ? "Fällig: " : "Fällig heute: "}
      {step ?? "Nächster Schritt"}
    </p>
  );
}
