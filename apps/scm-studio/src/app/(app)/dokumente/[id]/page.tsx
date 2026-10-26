import { Download, ExternalLink, FileSignature, PenLine, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocMenu } from "@/components/dokumente/doc-menu";
import { DrehplanForm, EinwilligungForm, MonatsberichtForm, VertragForm } from "@/components/dokumente/forms";
import { PdfPreview } from "@/components/dokumente/pdf-preview";
import { ScmSign } from "@/components/dokumente/scm-sign";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Dot } from "@/components/ui/badge";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { DialogButton } from "@/components/ui/dialog";
import { Field, FormActions, Input, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton, Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Client, Doc } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { reopenDocument, revokeConsent, saveDocument, trashDocument } from "@/lib/dokumente/actions";
import { buildDrehplanSnapshot, buildReportSnapshot, getDocument, getTeam, isLegalApproved, partyOf } from "@/lib/dokumente/data";
import {
  consentController,
  controllerProblem,
  docStatus,
  LEGAL_TEMPLATE_VERSION,
  needsSignature,
  NUTZUNGSDAUER,
  ROLLEN,
  SIGNER_SHORT,
  TRASH_DAYS,
  ZWECKE,
  type DrehplanData,
  type EinwilligungData,
  type MonatsberichtData,
  type SignatureEntry,
  type VertragData,
  type ZweckKey,
} from "@/lib/dokumente/schema";
import { compact, dateDe, dateTime, monthLabel, num } from "@/lib/format";
import { DOC_KINDS } from "@/lib/labels";
import { getCompany, type Company } from "@/lib/settings";
import { todayIso } from "@/lib/time";

type P = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const id = Number((await params).id);
  const found = Number.isInteger(id) && id > 0 ? await getDocument(id).catch(() => null) : null;
  return { title: found ? `${found.doc.title} · Dokumente` : "Dokumente" };
}

export default function DokumentPage({ params }: { params: P }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

/** Was der verantwortlichen Stelle einer Einwilligung fehlt: bei finalen Fassungen aus der Momentaufnahme. */
function consentIssueOf(doc: Doc, client: Client | null, company: Company | null) {
  const d = doc.data as unknown as EinwilligungData;
  const frozen = doc.status !== "entwurf";
  const party = frozen ? (d.party ?? null) : client ? partyOf(client) : null;
  const comp = frozen ? ((doc.data as { companySnapshot?: Company }).companySnapshot ?? null) : company;
  return {
    kunde: controllerProblem(consentController("kunde", party, comp), Boolean(doc.clientId)),
    scm: controllerProblem(consentController("scm", party, comp), Boolean(doc.clientId)),
    current: controllerProblem(consentController(d.verantwortlich, party, comp), Boolean(doc.clientId)),
  };
}

async function Detail({ params }: { params: P }) {
  const { id } = await params;
  const found = await getDocument(Number(id));
  if (!found) notFound();
  const { doc, client } = found;
  const [user, legalApproved, company] = await Promise.all([getCurrentUser(), isLegalApproved(), getCompany()]);
  const status = docStatus(doc.kind, doc.status, doc.revokedAt);
  const pdfHref = `/api/dokumente/${doc.id}/pdf`;
  const data = doc.data as Record<string, unknown>;
  const legal = needsSignature(doc.kind);
  const scmSigned = doc.kind === "vertrag" && Boolean((data as unknown as VertragData).scmSignature);
  const save = saveDocument.bind(null, doc.id);
  const version = `${doc.updatedAt.getTime()}`;
  const consent = doc.kind === "einwilligung" ? consentIssueOf(doc, client, company) : null;
  const signBlocked = doc.status === "final" && Boolean(consent?.current);
  const pdfInHeader = doc.status === "unterschrieben" || (doc.status === "final" && !legal);
  const signed = doc.status === "unterschrieben";
  const remove = {
    action: trashDocument.bind(null, doc.id),
    label: doc.status === "entwurf" ? "Entwurf löschen" : "Dokument löschen",
    confirm: {
      title: signed ? "Unterschriebenes Dokument löschen?" : doc.status === "entwurf" ? "Entwurf löschen?" : "Dokument löschen?",
      message: signed
        ? `Es kommt in den Papierkorb und wird nach ${TRASH_DAYS} Tagen samt PDF endgültig gelöscht, damit fehlt dann auch der Nachweis der Unterschrift. Löscht so nur Test- oder Fehldokumente. Bis dahin könnt ihr es im Papierkorb wiederherstellen.`
        : `Es kommt in den Papierkorb und wird nach ${TRASH_DAYS} Tagen endgültig gelöscht. Bis dahin könnt ihr es dort wiederherstellen.`,
      confirmLabel: "In den Papierkorb",
      tone: "danger" as const,
    },
  };
  const reopen = {
    action: reopenDocument.bind(null, doc.id),
    confirm: scmSigned
      ? { title: "Wieder bearbeiten?", message: "Die Unterschrift von SCM wird dabei entfernt und muss danach neu geleistet werden.", confirmLabel: "Wieder bearbeiten", tone: "danger" as const }
      : undefined,
  };

  return (
    <>
      <PageHeader
        scene={`Szene 09 · ${DOC_KINDS[doc.kind]?.label ?? "Dokument"}`}
        back={{ href: "/dokumente", label: "Dokumente" }}
        title={<span className="break-words">{doc.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[15px]">
            <Badge tone={status.tone}>{status.label}</Badge>
            {client && (
              <Link href={`/kunden/${client.id}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Dot color={client.color} /> {client.name}
              </Link>
            )}
            {doc.templateVersion && legal && <span className="text-[13px]">Vorlage {doc.templateVersion}</span>}
          </span>
        }
        actions={
          <>
            {doc.status === "entwurf" && <DocMenu remove={remove} />}
            {doc.status === "final" && (
              <>
                {legal ? (
                  <>
                    {doc.kind === "vertrag" && !scmSigned && (
                      <DialogButton label="SCM unterschreibt" title="Unterschrift für SCM" variant="secondary" dialogSize="lg">
                        <ScmSign docId={doc.id} name={user?.name ?? "SCM"} />
                      </DialogButton>
                    )}
                    {!signBlocked && (
                      <LinkButton href={`/dokumente/${doc.id}/unterschreiben`}>
                        <FileSignature className="size-4" /> Unterschreiben
                      </LinkButton>
                    )}
                    <DocMenu pdfHref={`${pdfHref}?download=1`} reopen={reopen} remove={remove} />
                  </>
                ) : (
                  <>
                    <ActionButton action={reopenDocument.bind(null, doc.id)} variant="secondary" size="md">
                      <PenLine className="size-4" /> Wieder bearbeiten
                    </ActionButton>
                    <a href={`${pdfHref}?download=1`} className={buttonClass("secondary", "md")}>
                      <Download className="size-4" /> PDF laden
                    </a>
                    <DocMenu remove={remove} />
                  </>
                )}
              </>
            )}
            {doc.status === "unterschrieben" && (
              <>
                {doc.kind === "einwilligung" && !doc.revokedAt && (
                  <DialogButton label="Widerruf vermerken" title="Widerruf vermerken" description="Die Einwilligung gilt ab dem Datum nicht mehr (Art. 7 Abs. 3 DSGVO)." variant="danger">
                    <ActionForm action={revokeConsent.bind(null, doc.id)} className="grid gap-4">
                      <Field label="Widerrufen am" name="revokedOn">
                        <Input name="revokedOn" type="date" defaultValue={todayIso()} max={todayIso()} />
                      </Field>
                      <Field label="Vermerk" name="note" optional hint="z. B. wie der Widerruf kam und welche Videos betroffen sind">
                        <Textarea name="note" rows={3} />
                      </Field>
                      <FormActions>
                        <SubmitButton>Widerruf speichern</SubmitButton>
                      </FormActions>
                    </ActionForm>
                  </DialogButton>
                )}
                <a href={`${pdfHref}?download=1`} className={buttonClass("secondary", "md")}>
                  <Download className="size-4" /> PDF laden
                </a>
                <DocMenu remove={remove} />
              </>
            )}
          </>
        }
      />

      {legal && !legalApproved && doc.status !== "unterschrieben" && (
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

      {signBlocked && consent?.current && (
        <p role="status" className="mb-6 flex gap-2 rounded-xl bg-warn-soft px-4 py-3 text-[14px] text-warn">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {consent.current} Danach „Wieder bearbeiten“ wählen und erneut freigeben, damit die Angaben in die Fassung kommen.{" "}
            {client && (
              <Link href={`/kunden/${client.id}/bearbeiten`} className="font-semibold underline underline-offset-2">
                Kunden bearbeiten
              </Link>
            )}
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
              {doc.kind === "einwilligung" && (
                <EinwilligungForm
                  action={save}
                  title={doc.title}
                  data={data as unknown as EinwilligungData}
                  hasClient={Boolean(doc.clientId)}
                  issues={consent ? { kunde: consent.kunde, scm: consent.scm } : undefined}
                  clientEditHref={client ? `/kunden/${client.id}/bearbeiten` : undefined}
                />
              )}
              {doc.kind === "drehplan" && (
                <Suspense fallback={<Skeleton className="h-96" />}>
                  <DrehplanEdit action={save} title={doc.title} data={data as unknown as DrehplanData} />
                </Suspense>
              )}
              {doc.kind === "monatsbericht" && <MonatsberichtForm action={save} title={doc.title} data={data as unknown as MonatsberichtData} />}
            </Card>
          ) : (
            <Summary doc={doc} client={client} />
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

        {/* Handy: nur ein PDF-Knopf. Wo die Kopfzeile schon "PDF laden" zeigt, entfällt die Vorschau-Karte. */}
        <Card className={`flex flex-col overflow-hidden xl:sticky xl:top-24 xl:self-start ${pdfInHeader ? "max-lg:hidden" : ""}`}>
          <CardHeader
            title="PDF-Vorschau"
            sub={doc.status === "entwurf" ? "Zeigt den gespeicherten Stand" : doc.status === "unterschrieben" ? "Unterschriebene Fassung" : doc.fileId ? "Abgelegte Fassung" : "Fassung zur Unterschrift"}
            action={
              <a href={pdfHref} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm", "max-lg:hidden")}>
                In neuem Tab <ExternalLink className="size-4" aria-hidden />
              </a>
            }
          />
          <div className="hidden lg:block">
            <PdfPreview src={pdfHref} version={version} title={`PDF-Vorschau ${doc.title}`} />
          </div>
          <div className="grid gap-3 px-5 pb-5 lg:hidden">
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
      <CardHeader
        title="Szenen an diesem Drehtag"
        sub={`Videos mit Drehdatum ${dateDe(data.drehtag)}`}
        action={
          <LinkButton href="/produktion" variant="ghost" size="sm">
            Produktion öffnen
          </LinkButton>
        }
      />
      {snap.videos.length === 0 ? (
        <p className="px-5 pb-5 text-[14px] text-muted">
          Noch keine Videos mit diesem Drehdatum. Tragt in der Produktion bei den Videos den Drehtag ein, dann erscheinen sie hier und im Drehplan.
        </p>
      ) : (
        <ol className="divide-y divide-hairline">
          {snap.videos.map((v, i) => (
            <li key={v.id} className="flex items-center gap-4 px-5 py-3">
              <span className="w-16 shrink-0 font-script text-[13px] font-bold text-ink-2">Szene {String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{v.title}</span>
                <span className="block truncate text-[13px] text-muted">{v.script ? `Skript mit ${v.script.beats.length} Abschnitten` : "noch ohne Skript"}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const rateFmt = new Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Zahlen wie im PDF: bis 9.999 ausgeschrieben, darüber kompakt */
const count = (n: number) => (n < 10000 ? num(n) : compact(n));

async function ReportPreview({ clientId, month }: { clientId: number; month: string }) {
  const r = await buildReportSnapshot(clientId, month);
  const rate = r.totals.views ? r.totals.interactions / r.totals.views : 0;
  return (
    <Card>
      <CardHeader
        title="Zahlen für den Bericht"
        sub={r.stand ? `Stand ${dateDe(r.stand)}${r.demo ? " · Demo-Werte" : ""}` : "Noch keine Messwerte"}
        action={
          <LinkButton href="/zahlen" variant="ghost" size="sm">
            Zahlen öffnen
          </LinkButton>
        }
      />
      <dl className="grid grid-cols-2 gap-4 px-5 pb-5 sm:grid-cols-4">
        {[
          ["Videos online", num(r.posted)],
          ["Aufrufe", count(r.totals.views)],
          ["Interaktionen", count(r.totals.interactions)],
          ["Rate", rateFmt.format(rate)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Kerndaten einer festgehaltenen Fassung, damit man vor dem Übergeben des Geräts prüfen kann, ob alles stimmt. */
function coreRows(doc: Doc, client: Client | null): [string, React.ReactNode][] {
  const data = doc.data as Record<string, unknown>;
  if (doc.kind === "einwilligung") {
    const d = data as unknown as EinwilligungData;
    const zwecke = (d.zweckeBeiUnterschrift ?? d.zwecke ?? []) as ZweckKey[];
    const ctrl = consentController(d.verantwortlich, d.party ?? null, (data.companySnapshot as Company | undefined) ?? null);
    return [
      ["Person", `${d.personName}${d.minderjaehrig ? " (minderjährig)" : ""}`],
      ["Rolle", ROLLEN[d.rolle] ?? d.rolle],
      ["Drehtag und Ort", [dateDe(d.drehtag), d.ort].filter(Boolean).join(", ")],
      ["Auftraggeber", d.party?.name ?? client?.name ?? "keiner, eigener Dreh von SCM"],
      ["Verantwortlich", [ctrl.name, ctrl.address, ctrl.email].filter(Boolean).join(", ") || "fehlt"],
      [doc.status === "unterschrieben" ? "Eingewilligt in" : "Vorausgewählte Zwecke", zwecke.map((z) => ZWECKE[z]?.label ?? z).join(", ") || "keine"],
    ];
  }
  if (doc.kind === "vertrag") {
    const d = data as unknown as VertragData;
    return [
      ["Auftraggeber", d.party?.name ?? client?.name ?? ""],
      ["Paket", `${d.paketVideos} Videos pro Monat`],
      ["Preis", d.preisEuro ? `${d.preisEuro} € netto im Monat` : "fehlt"],
      ["Beginn und Laufzeit", `ab ${dateDe(d.beginn)}, mindestens ${d.mindestlaufzeitMonate} Monate`],
      ["Nutzungsrechte", NUTZUNGSDAUER[d.nutzungsdauer] ?? d.nutzungsdauer],
      ["Unterschreibt", [d.unterzeichnerName || d.party?.signatoryName, d.unterzeichnerFunktion].filter(Boolean).join(", ") || "noch offen"],
    ];
  }
  if (doc.kind === "drehplan") {
    const d = data as unknown as DrehplanData;
    return [
      ["Drehtag", [dateDe(d.drehtag), [d.start, d.ende].filter(Boolean).join(" bis ")].filter(Boolean).join(", ")],
      ["Ort", d.ort || "fehlt"],
      ["Szenen", d.snapshot ? `${d.snapshot.videos.length} Videos` : ""],
      ["Team", d.snapshot?.team.map((t) => t.name).join(", ") || "noch nicht eingeteilt"],
    ];
  }
  const d = data as unknown as MonatsberichtData;
  return [
    ["Monat", monthLabel(d.month)],
    ["Videos online", d.snapshot ? num(d.snapshot.posted) : ""],
    ["Aufrufe", d.snapshot ? num(d.snapshot.totals.views) : ""],
  ];
}

function Summary({ doc, client }: { doc: Doc; client: Client | null }) {
  const data = doc.data as Record<string, unknown>;
  const signatures = (data.signatures as SignatureEntry[] | undefined) ?? [];
  const scm = (data as unknown as VertragData).scmSignature;
  const rows = coreRows(doc, client).filter(([, v]) => v !== "");
  if (scm && doc.status === "final") rows.push(["SCM", `unterschrieben von ${scm.name}, ${dateTime(scm.signedAt)}`]);
  for (const s of signatures) rows.push([SIGNER_SHORT[s.role] ?? "Unterschrift", `unterschrieben von ${s.name}, ${dateTime(s.signedAt)}`]);
  if (doc.signMeta) {
    if (doc.signMeta.place) rows.push(["Ort der Unterschrift", doc.signMeta.place]);
    rows.push(["Inhalts-Hash", <span key="h" className="break-all font-mono text-[12px]">{doc.signMeta.versionHash}</span>]);
  }
  if (doc.contentHash) rows.push(["Datei-Hash (SHA-256)", <span key="f" className="break-all font-mono text-[12px]">{doc.contentHash}</span>]);
  if (doc.revokedAt) rows.push(["Widerrufen am", `${dateDe(doc.revokedAt)}${doc.revokeNote ? ` · ${doc.revokeNote}` : ""}`]);
  const legal = needsSignature(doc.kind);
  return (
    <Card>
      <CardHeader
        title={doc.status === "unterschrieben" ? "Unterschrieben und abgelegt" : legal ? "Bereit zur Unterschrift" : "Abgeschlossen und abgelegt"}
        sub={
          doc.status === "unterschrieben"
            ? "Die Fassung ist unveränderlich. Nur ein Widerruf kann vermerkt werden."
            : legal
              ? "Bitte vor dem Unterschreiben prüfen. Zum Ändern im Menü „Wieder bearbeiten“ wählen."
              : "Die abgelegte PDF-Datei bleibt byte-genau erhalten."
        }
      />
      <dl className="divide-y divide-hairline">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-0.5 px-5 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="min-w-0 text-[15px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
