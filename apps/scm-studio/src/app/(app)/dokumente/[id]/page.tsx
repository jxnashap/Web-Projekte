import { ArrowLeft, Download, ExternalLink, FileSignature, PenLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DrehplanForm, EinwilligungForm, MonatsberichtForm, VertragForm } from "@/components/dokumente/forms";
import { ScmSign } from "@/components/dokumente/scm-sign";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Dot } from "@/components/ui/badge";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { DialogButton } from "@/components/ui/dialog";
import { Field, FormActions, Input, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/lib/auth";
import { deleteDocument, finalizeDocument, reopenDocument, revokeConsent, saveDocument } from "@/lib/dokumente/actions";
import { buildDrehplanSnapshot, buildReportSnapshot, getDocument, getTeam, isLegalApproved } from "@/lib/dokumente/data";
import {
  DOC_STATUS,
  LEGAL_TEMPLATE_VERSION,
  needsSignature,
  SIGNER_SHORT,
  ZWECKE,
  type DrehplanData,
  type EinwilligungData,
  type MonatsberichtData,
  type SignatureEntry,
  type VertragData,
  type ZweckKey,
} from "@/lib/dokumente/schema";
import { compact, dateDe, dateTime, num } from "@/lib/format";
import { DOC_KINDS } from "@/lib/labels";
import { todayIso } from "@/lib/time";

export const metadata = { title: "Dokument" };

type P = Promise<{ id: string }>;

export default function DokumentPage({ params }: { params: P }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-24" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[600px]" />
        <Skeleton className="h-[600px]" />
      </div>
    </div>
  );
}

async function Detail({ params }: { params: P }) {
  const { id } = await params;
  const found = await getDocument(Number(id));
  if (!found) notFound();
  const { doc, client } = found;
  const [user, legalApproved] = await Promise.all([getCurrentUser(), isLegalApproved()]);
  const status = DOC_STATUS[doc.status] ?? DOC_STATUS.entwurf;
  const pdfHref = `/api/dokumente/${doc.id}/pdf`;
  const data = doc.data as Record<string, unknown>;
  const legal = needsSignature(doc.kind);
  const scmSigned = doc.kind === "vertrag" && Boolean((data as unknown as VertragData).scmSignature);
  const save = saveDocument.bind(null, doc.id);
  const version = `${doc.updatedAt.getTime()}`;

  return (
    <>
      <Link href="/dokumente" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Alle Dokumente
      </Link>
      <PageHeader
        scene={`Szene 09 · ${DOC_KINDS[doc.kind]?.label ?? "Dokument"}`}
        title={<span className="break-words">{doc.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {doc.revokedAt ? <Badge tone="accent">Widerrufen</Badge> : <Badge tone={status.tone}>{status.label}</Badge>}
            {client && (
              <Link href={`/kunden/${client.id}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Dot color={client.color} /> {client.name}
              </Link>
            )}
            {doc.templateVersion && <span className="text-[13px]">Vorlage {doc.templateVersion}</span>}
          </span>
        }
        actions={
          <>
            {doc.status === "entwurf" && (
              <>
                <ActionButton action={deleteDocument.bind(null, doc.id)} confirm="Diesen Entwurf wirklich löschen?" variant="ghost" size="md">
                  Löschen
                </ActionButton>
                <ActionButton
                  action={finalizeDocument.bind(null, doc.id)}
                  variant="primary"
                  size="md"
                  confirm={legal ? "Fassung festhalten? Danach wird nur noch unterschrieben. Änderungen gehen erst wieder über „Wieder bearbeiten“." : "Final machen und als PDF ablegen?"}
                >
                  {legal ? "Final machen" : "Final machen und ablegen"}
                </ActionButton>
              </>
            )}
            {doc.status === "final" && (
              <>
                <ActionButton action={reopenDocument.bind(null, doc.id)} variant="ghost" size="md" confirm={scmSigned ? "Wieder bearbeiten? Die Unterschrift von SCM wird dabei entfernt." : undefined}>
                  <PenLine className="size-4" /> Wieder bearbeiten
                </ActionButton>
                {doc.kind === "vertrag" && !scmSigned && (
                  <DialogButton label="SCM unterschreibt" title="Unterschrift für SCM" variant="secondary" dialogSize="lg">
                    <ScmSign docId={doc.id} name={user?.name ?? "SCM"} />
                  </DialogButton>
                )}
                {legal && (
                  <LinkButton href={`/dokumente/${doc.id}/unterschreiben`}>
                    <FileSignature className="size-4" /> Unterschreiben
                  </LinkButton>
                )}
              </>
            )}
            {doc.status === "unterschrieben" && doc.kind === "einwilligung" && !doc.revokedAt && (
              <DialogButton label="Widerruf vermerken" title="Widerruf vermerken" description="Die Einwilligung gilt ab dem Datum nicht mehr (Art. 7 Abs. 3 DSGVO)." variant="danger">
                <ActionForm action={revokeConsent.bind(null, doc.id)} className="grid gap-4">
                  <Field label="Widerrufen am" name="revokedOn">
                    <Input name="revokedOn" type="date" defaultValue={todayIso()} max={todayIso()} />
                  </Field>
                  <Field label="Vermerk" name="note" optional hint="z. B. wie der Widerruf kam und welche Videos betroffen sind">
                    <Textarea name="note" rows={3} />
                  </Field>
                  <FormActions>
                    <SubmitButton variant="danger">Widerruf speichern</SubmitButton>
                  </FormActions>
                </ActionForm>
              </DialogButton>
            )}
            {doc.status !== "entwurf" && (
              <a href={`${pdfHref}?download=1`} className={buttonClass("secondary", "md")}>
                <Download className="size-4" /> PDF
              </a>
            )}
          </>
        }
      />

      {legal && !legalApproved && (
        <p className="mb-6 flex gap-2 rounded-xl bg-warn-soft px-4 py-3 text-[14px] text-warn">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Vorlage {LEGAL_TEMPLATE_VERSION} ist noch nicht anwaltlich freigegeben. Das PDF trägt deshalb den Vermerk „Entwurf, anwaltlich zu prüfen“. Freigabe eintragen unter{" "}
            <Link href="/einstellungen?reiter=recht" className="font-semibold underline underline-offset-2">
              Einstellungen, Rechtliches
            </Link>
            .
          </span>
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          {doc.status === "entwurf" ? (
            <Card className="p-5 sm:p-6">
              {doc.kind === "vertrag" && (
                <VertragForm action={save} title={doc.title} data={data as unknown as VertragData} isMerchant={Boolean(client?.isMerchant)} clientName={client?.signatoryName ?? client?.contactName ?? ""} />
              )}
              {doc.kind === "einwilligung" && <EinwilligungForm action={save} title={doc.title} data={data as unknown as EinwilligungData} />}
              {doc.kind === "drehplan" && (
                <Suspense fallback={<Skeleton className="h-96" />}>
                  <DrehplanEdit action={save} title={doc.title} data={data as unknown as DrehplanData} />
                </Suspense>
              )}
              {doc.kind === "monatsbericht" && <MonatsberichtForm action={save} title={doc.title} data={data as unknown as MonatsberichtData} />}
            </Card>
          ) : (
            <Summary docId={doc.id} />
          )}
          {doc.kind === "drehplan" && doc.status === "entwurf" && (
            <Suspense fallback={<Skeleton className="h-40" />}>
              <DrehplanScenes clientId={doc.clientId} data={data as unknown as DrehplanData} />
            </Suspense>
          )}
          {doc.kind === "monatsbericht" && doc.status === "entwurf" && doc.clientId && (
            <Suspense fallback={<Skeleton className="h-40" />}>
              <ReportPreview clientId={doc.clientId} month={(data as unknown as MonatsberichtData).month} />
            </Suspense>
          )}
        </div>

        <Card className="flex flex-col overflow-hidden xl:sticky xl:top-24 xl:self-start">
          <CardHeader
            title="PDF-Vorschau"
            sub={doc.status === "entwurf" ? "Nach dem Speichern aktualisiert" : doc.fileId ? "Abgelegte Fassung" : "Fassung zur Unterschrift"}
            action={
              <a href={pdfHref} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
                Öffnen <ExternalLink className="size-4" />
              </a>
            }
          />
          <iframe key={version} src={`${pdfHref}#view=FitH`} title={`PDF-Vorschau ${doc.title}`} className="hidden h-[78vh] w-full bg-sunken lg:block" />
          <div className="grid gap-3 p-5 lg:hidden">
            <p className="text-[14px] text-muted">Auf dem Handy öffnet sich das PDF in einem eigenen Fenster.</p>
            <a href={pdfHref} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md")}>
              PDF ansehen
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}

async function DrehplanEdit({ action, title, data }: { action: (p: never, f: FormData) => Promise<unknown>; title: string; data: DrehplanData }) {
  const team = await getTeam();
  return <DrehplanForm action={action as never} title={title} data={data} team={team.filter((t) => t.active).map((t) => ({ id: t.id, name: t.name }))} />;
}

async function DrehplanScenes({ clientId, data }: { clientId: number | null; data: DrehplanData }) {
  const snap = await buildDrehplanSnapshot(clientId, { drehtag: data.drehtag, teamIds: data.teamIds ?? [] });
  return (
    <Card>
      <CardHeader title="Szenen an diesem Drehtag" sub={`Videos mit Drehdatum ${dateDe(data.drehtag)}`} action={<LinkButton href="/produktion" variant="ghost" size="sm">Produktion</LinkButton>} />
      {snap.videos.length === 0 ? (
        <p className="p-5 text-[14px] text-muted">
          Noch keine Videos mit diesem Drehdatum. Tragt in der Produktion bei den Videos den Drehtag ein, dann erscheinen sie hier und im Drehplan.
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {snap.videos.map((v, i) => (
            <li key={v.id} className="flex items-center gap-4 px-5 py-3">
              <span className="w-16 shrink-0 text-[13px] font-semibold text-accent">Szene {i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{v.title}</span>
                <span className="block truncate text-[13px] text-muted">{v.script ? `Skript: ${v.script.beats.length} Abschnitte` : "noch ohne Skript"}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

async function ReportPreview({ clientId, month }: { clientId: number; month: string }) {
  const r = await buildReportSnapshot(clientId, month);
  const rate = r.totals.views ? r.totals.interactions / r.totals.views : 0;
  return (
    <Card>
      <CardHeader title="Zahlen für den Bericht" sub={r.stand ? `Stand ${dateDe(r.stand)}${r.demo ? " · Demo-Werte" : ""}` : "Noch keine Messwerte"} action={<LinkButton href="/zahlen" variant="ghost" size="sm">Zahlen</LinkButton>} />
      <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        {[
          ["Videos online", num(r.posted)],
          ["Aufrufe", compact(r.totals.views)],
          ["Interaktionen", compact(r.totals.interactions)],
          ["Rate", new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 }).format(rate)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="mt-1 text-[22px] font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

async function Summary({ docId }: { docId: number }) {
  const found = await getDocument(docId);
  if (!found) return null;
  const { doc } = found;
  const data = doc.data as Record<string, unknown>;
  const signatures = (data.signatures as SignatureEntry[] | undefined) ?? [];
  const scm = (data as unknown as VertragData).scmSignature;
  const zwecke = ((data as unknown as EinwilligungData).zweckeBeiUnterschrift ?? (data as unknown as EinwilligungData).zwecke ?? []) as ZweckKey[];
  const rows: [string, React.ReactNode][] = [["Status", DOC_STATUS[doc.status]?.label ?? doc.status]];
  if (doc.kind === "einwilligung") rows.push(["Zwecke", zwecke.map((z) => ZWECKE[z]?.label ?? z).join(", ") || "keine"]);
  if (scm && doc.status === "final") rows.push(["SCM", `unterschrieben von ${scm.name}, ${dateTime(scm.signedAt)}`]);
  for (const s of signatures) rows.push([`Unterschrift ${SIGNER_SHORT[s.role] ?? ""}`.trim(), `${s.name}, ${dateTime(s.signedAt)}`]);
  if (doc.signMeta) {
    rows.push(["Inhalts-Hash", <span key="h" className="break-all font-mono text-[12px]">{doc.signMeta.versionHash}</span>]);
    if (doc.signMeta.place) rows.push(["Ort", doc.signMeta.place]);
  }
  if (doc.contentHash) rows.push(["Datei-Hash (SHA-256)", <span key="f" className="break-all font-mono text-[12px]">{doc.contentHash}</span>]);
  if (doc.revokedAt) rows.push(["Widerrufen am", `${dateDe(doc.revokedAt)}${doc.revokeNote ? ` · ${doc.revokeNote}` : ""}`]);
  return (
    <Card>
      <CardHeader
        title={doc.status === "unterschrieben" ? "Unterschrieben und abgelegt" : doc.fileId ? "Final und abgelegt" : "Bereit zur Unterschrift"}
        sub={
          doc.status === "unterschrieben"
            ? "Die Fassung ist unveränderlich. Nur ein Widerruf kann vermerkt werden."
            : doc.fileId
              ? "Die abgelegte PDF-Datei bleibt byte-genau erhalten."
              : "Inhalt festgehalten. Zum Ändern „Wieder bearbeiten“ wählen."
        }
      />
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="min-w-0 text-[14px]">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
