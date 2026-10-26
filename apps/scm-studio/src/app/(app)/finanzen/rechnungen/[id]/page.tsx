import { BellRing, Check, CheckCircle2, Download, ExternalLink, FileCheck2, Mail, Send, ShieldAlert, ShieldCheck, Undo2, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AmountRow, Figure } from "@/components/finanzen/figure";
import { CancelButton, PayButton } from "@/components/finanzen/invoice-actions";
import { InvoiceEditor } from "@/components/finanzen/invoice-editor";
import { InvoiceStatus } from "@/components/finanzen/status";
import { Badge } from "@/components/ui/badge";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, ListRow } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { convertOffer, markSent, remind, setOfferStatus, undoPaid } from "@/lib/finanzen/actions";
import { calcTotals, customerNumber, KIND_LABEL, lineNetCents, missingCompanyFields, unitText, type DocKind } from "@/lib/finanzen/core";
import { getClientOptions, getInvoiceDetail, getInvoiceTitle } from "@/lib/finanzen/data";
import { dateDe, dateTime, eur } from "@/lib/format";
import { fileHref } from "@/lib/storage";
import { todayIso } from "@/lib/time";

type Params = Promise<{ id: string }>;

const LIST: Record<DocKind, { href: string; label: string }> = {
  rechnung: { href: "/finanzen/rechnungen", label: "Rechnungen" },
  angebot: { href: "/finanzen/rechnungen?art=angebot", label: "Angebote" },
  storno: { href: "/finanzen/rechnungen?status=storniert", label: "Rechnungen" },
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const row = Number.isInteger(id) && id > 0 ? await getInvoiceTitle(id).catch(() => null) : null;
  if (!row) return { title: "Rechnungen" };
  const kind = row.kind as DocKind;
  return { title: `${row.number ?? `${KIND_LABEL[kind]}sentwurf`} · ${LIST[kind].label}` };
}

export default function RechnungPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Params }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const user = await requireUser();
  const d = await getInvoiceDetail(id);
  if (!d) notFound();
  const { invoice: inv } = d;
  const kind = inv.kind as DocKind;
  const label = KIND_LABEL[kind];
  const back = LIST[kind];
  const recipientName = inv.recipient?.name ?? d.client?.name ?? "";

  if (!inv.finalizedAt) {
    const clients = await getClientOptions();
    return (
      <>
        <PageHeader
          scene="Szene 08 · Finanzen"
          back={back}
          eyebrow={inv.number ? `Nummer ${inv.number} ist reserviert` : undefined}
          title={`${label}sentwurf`}
          description={`${recipientName || "Noch ohne Empfänger"}. Entwürfe könnt ihr beliebig ändern.`}
        />
        <InvoiceEditor
          invoice={{ ...inv, kind: kind === "angebot" ? "angebot" : "rechnung" }}
          items={d.items}
          clients={clients}
          paymentDays={d.company?.paymentDays ?? 14}
          smallBusiness={Boolean(d.company?.smallBusiness)}
          companyMissing={missingCompanyFields(d.company, kind)}
          isOwner={user.role === "admin"}
        />
      </>
    );
  }

  const today = todayIso();
  const small = Boolean(d.company?.smallBusiness);
  const totals = calcTotals(d.items, small);
  const email = inv.recipient?.email ?? d.client?.email ?? "";
  const mailBody = [
    `Hallo${inv.recipient?.contact ? ` ${inv.recipient.contact}` : ""},`,
    "",
    kind === "angebot"
      ? `anbei unser Angebot ${inv.number} über ${eur(inv.grossCents)}.`
      : `anbei unsere ${label} ${inv.number} über ${eur(inv.grossCents)}${inv.dueDate && kind === "rechnung" ? `, zahlbar bis ${dateDe(inv.dueDate)}` : ""}.`,
    kind === "rechnung" ? "Die PDF-Datei ist zugleich eine E-Rechnung (ZUGFeRD)." : "",
    "",
    "Viele Grüße",
    d.company?.brand ?? "SCM Creatives",
  ]
    .filter((x, i, a) => !(x === "" && a[i - 1] === ""))
    .join("\n");
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`${label} ${inv.number}`)}&body=${encodeURIComponent(mailBody)}`;
  const isInvoice = kind === "rechnung";
  const isOffer = kind === "angebot";
  const openInvoice = isInvoice && inv.status === "offen";
  const overdue = d.display === "ueberfaellig";
  const isAdmin = user.role === "admin";

  const mailButton = (primary: boolean) => (
    <a href={mailto} className={buttonClass(primary ? "primary" : "secondary")}>
      <Mail className="size-4" /> Per E-Mail vorbereiten
    </a>
  );
  const mailHint =
    (openInvoice || (isOffer && inv.status === "offen")) && (
      <p className="text-[13px] text-muted">
        {email ? (
          <>Der Text wird vorbereitet, das PDF hängt ihr in eurem Mailprogramm an.</>
        ) : (
          <>
            Für den Versand ist keine E-Mail-Adresse hinterlegt.{" "}
            {inv.clientId ? (
              <Link href={`/kunden/${inv.clientId}/bearbeiten`} className="font-medium text-accent-ink hover:underline">
                E-Mail-Adresse beim Kunden ergänzen
              </Link>
            ) : (
              "Ihr tragt sie im Mailprogramm ein."
            )}
          </>
        )}
      </p>
    );

  // Nächster Schritt je Status: genau eine Hauptaktion (rot), alles andere ruhig
  let next: React.ReactNode = null;
  if (openInvoice && !inv.sentAt) {
    next = (
      <>
        {mailButton(true)}
        <ActionButton action={markSent.bind(null, inv.id)} variant="secondary" size="md">
          <Send className="size-4" /> Als versendet markieren
        </ActionButton>
        <PayButton id={inv.id} today={today} number={inv.number!} variant="secondary" />
      </>
    );
  } else if (openInvoice) {
    next = (
      <>
        <PayButton id={inv.id} today={today} number={inv.number!} />
        {overdue && inv.dunningLevel < 3 && (
          <ActionButton
            action={remind.bind(null, inv.id)}
            variant="secondary"
            size="md"
            confirm={{
              title: `${inv.dunningLevel + 1}. Zahlungserinnerung erstellen?`,
              message: "Es entsteht ein freundliches PDF ohne Gebühren mit neuer Zahlungsfrist (7 Tage). Verschicken könnt ihr es danach per E-Mail.",
              confirmLabel: "Erstellen",
              tone: "default",
            }}
          >
            <BellRing className="size-4" /> {inv.dunningLevel + 1}. Zahlungserinnerung
          </ActionButton>
        )}
        {mailButton(false)}
      </>
    );
  } else if (isInvoice && inv.status === "bezahlt") {
    next = (
      <>
        <p className="flex items-center gap-2 text-[15px] font-medium text-ok">
          <CheckCircle2 className="size-5" /> Erledigt, bezahlt am {dateDe(inv.paidAt)}
        </p>
        <ActionButton
          action={undoPaid.bind(null, inv.id)}
          variant="ghost"
          size="sm"
          className="sm:ml-auto"
          confirm={{ title: "Zahlung zurücknehmen?", message: "Die Rechnung gilt dann wieder als offen.", confirmLabel: "Zurücknehmen", tone: "danger" }}
        >
          <Undo2 className="size-4" /> Zahlung zurücknehmen
        </ActionButton>
      </>
    );
  } else if (isInvoice && inv.status === "storniert") {
    next = (
      <p className="text-[15px] text-ink-2">
        Storniert
        {d.stornos.map((s) => (
          <span key={s.id}>
            {" "}
            mit{" "}
            <Link href={`/finanzen/rechnungen/${s.id}`} className="font-semibold text-accent-ink hover:underline">
              {s.number}
            </Link>
          </span>
        ))}
        . Die Rechnung bleibt unverändert erhalten.
      </p>
    );
  } else if (isOffer && inv.status === "offen") {
    next = (
      <>
        {mailButton(true)}
        <ActionButton action={setOfferStatus.bind(null, inv.id, "angenommen")} variant="secondary" size="md">
          <Check className="size-4" /> Angenommen
        </ActionButton>
        <ActionButton action={setOfferStatus.bind(null, inv.id, "abgelehnt")} variant="secondary" size="md">
          <X className="size-4" /> Abgelehnt
        </ActionButton>
      </>
    );
  } else if (isOffer) {
    const converted = d.converted[0];
    next = (
      <>
        {converted ? (
          <p className="text-[15px] text-ink-2">
            Umgewandelt in{" "}
            <Link href={`/finanzen/rechnungen/${converted.id}`} className="font-semibold text-accent-ink hover:underline">
              {converted.number ? `Rechnung ${converted.number}` : "einen Rechnungsentwurf"}
            </Link>
            .
          </p>
        ) : inv.status === "angenommen" ? (
          <ActionButton action={convertOffer.bind(null, inv.id)} variant="primary" size="md">
            In Rechnung umwandeln
          </ActionButton>
        ) : (
          <p className="text-[15px] text-ink-2">Das Angebot wurde abgelehnt.</p>
        )}
        {!converted && (
          <ActionButton action={setOfferStatus.bind(null, inv.id, "offen")} variant="ghost" size="sm" className="sm:ml-auto">
            <Undo2 className="size-4" /> Wieder auf offen setzen
          </ActionButton>
        )}
      </>
    );
  } else if (kind === "storno" && d.cancels) {
    next = (
      <p className="text-[15px] text-ink-2">
        Hebt die Rechnung{" "}
        <Link href={`/finanzen/rechnungen/${d.cancels.id}`} className="font-semibold text-accent-ink hover:underline">
          {d.cancels.number}
        </Link>{" "}
        vollständig auf.
      </p>
    );
  }

  const links = [
    ...d.converted.map((c) => ({ href: `/finanzen/rechnungen/${c.id}`, text: `Rechnung ${c.number ?? "(Entwurf)"} aus diesem Angebot` })),
    ...d.stornos.map((c) => ({ href: `/finanzen/rechnungen/${c.id}`, text: `Stornobeleg ${c.number}` })),
    ...(d.cancels ? [{ href: `/finanzen/rechnungen/${d.cancels.id}`, text: `Stornierte Rechnung ${d.cancels.number}` }] : []),
    ...(d.fromOffer ? [{ href: `/finanzen/rechnungen/${d.fromOffer.id}`, text: `Angebot ${d.fromOffer.number ?? "(Entwurf)"}` }] : []),
  ];

  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        back={back}
        title={inv.number ?? label}
        description={`${label} an ${recipientName || "ohne Empfänger"}${inv.title && inv.title !== label ? ` · ${inv.title}` : ""}`}
        actions={
          inv.fileId ? (
            <LinkButton href={fileHref(inv.fileId, true)} variant="secondary" prefetch={false}>
              <Download className="size-4" /> PDF laden
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Figure
                label={isOffer ? "Angebotssumme" : kind === "storno" ? "Storno brutto" : "Rechnungsbetrag"}
                value={eur(inv.grossCents)}
                sub={`netto ${eur(inv.netCents)}${small ? "" : ` · USt ${eur(inv.taxCents)}`}`}
              />
              <InvoiceStatus kind={kind} status={d.display} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-[14px] sm:grid-cols-3">
              <Meta label="Datum" value={dateDe(inv.issueDate)} />
              {isInvoice && <Meta label="Fällig am" value={dateDe(inv.dueDate)} tone={overdue ? "accent" : undefined} />}
              {isOffer && <Meta label="Gültig bis" value={dateDe(inv.validUntil)} />}
              {inv.serviceFrom && inv.serviceTo && <Meta label="Leistung" value={`${dateDe(inv.serviceFrom)} bis ${dateDe(inv.serviceTo)}`} />}
              {inv.clientId && (
                <Meta
                  label="Kunde"
                  value={
                    <Link className="underline-offset-2 hover:underline" href={`/kunden/${inv.clientId}`}>
                      {customerNumber(inv.clientId)} {d.client?.name}
                    </Link>
                  }
                />
              )}
              {inv.sentAt && <Meta label="Versendet" value={dateTime(inv.sentAt)} />}
              {inv.paidAt && <Meta label="Bezahlt am" value={dateDe(inv.paidAt)} />}
              {inv.dunningLevel > 0 && <Meta label="Erinnerungen" value={`${inv.dunningLevel}, zuletzt ${dateDe(inv.lastDunningAt)}`} />}
            </dl>
            {next && (
              <div className="mt-5 grid gap-3 border-t border-line pt-4">
                <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:w-full">{next}</div>
                {mailHint}
              </div>
            )}
          </Card>

          {inv.fileId && (
            <Card className="overflow-hidden">
              <CardHeader
                title="Positionen"
                sub={`Festgeschriebener Stand${inv.sentAt ? `, versendet am ${dateDe(inv.sentAt)}` : ""}`}
                action={
                  <LinkButton href={fileHref(inv.fileId)} target="_blank" variant="ghost" size="sm" prefetch={false}>
                    PDF öffnen <ExternalLink className="size-4" />
                  </LinkButton>
                }
              />
              <ul className="divide-y divide-line border-t border-line">
                {d.items.map((it) => (
                  <li key={it.id} className="flex items-start justify-between gap-4 px-5 py-3 text-[14px]">
                    <div className="min-w-0">
                      <div>{it.description}</div>
                      <div className="text-[13px] tabular-nums text-muted">
                        {unitText(it.quantity, it.unit)} × {eur(it.unitPriceCents)}
                      </div>
                    </div>
                    <div className="shrink-0 tabular-nums">{eur(lineNetCents(it))}</div>
                  </li>
                ))}
                <li className="px-5 py-2">
                  <AmountRow label="Netto" value={eur(totals.netCents)} />
                  {!small && totals.groups.map((g) => <AmountRow key={g.rate} label={`USt ${g.rate} %`} value={eur(g.taxCents)} />)}
                  <AmountRow strong label="Gesamt" value={eur(totals.grossCents)} />
                </li>
              </ul>
              <details className="group hidden border-t border-line md:block">
                <summary className="cursor-pointer px-5 py-3 text-[14px] font-medium text-ink-2 hover:text-ink">PDF-Vorschau anzeigen</summary>
                <iframe src={fileHref(inv.fileId)} loading="lazy" title={`${label} ${inv.number}`} className="h-[820px] w-full bg-sunken" />
              </details>
            </Card>
          )}

          {isInvoice && inv.status !== "storniert" && isAdmin && (
            <Card>
              <CardHeader title="Stornieren" sub="Fehler auf der Rechnung? Ein Stornobeleg hebt sie auf. Die Rechnung selbst bleibt unverändert erhalten (GoBD)." />
              <div className="px-5 pb-5 pt-1">
                <CancelButton id={inv.id} number={inv.number!} />
              </div>
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-6">
          {links.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Verknüpft" />
              <div className="divide-y divide-line border-t border-line">
                {links.map((l) => (
                  <ListRow key={l.href} href={l.href}>
                    <span className="text-[15px]">{l.text}</span>
                  </ListRow>
                ))}
              </div>
            </Card>
          )}

          {overdue && (
            <Card>
              <CardHeader title="Wenn eine Rechnung offen bleibt" />
              <p className="px-5 pb-5 text-[13px] leading-relaxed text-ink-2">
                Gegenüber Unternehmen tritt Verzug spätestens 30 Tage nach Fälligkeit und Zugang der Rechnung ein (§ 286 Abs. 3 BGB). Verzugszinsen und eine Pauschale von
                40 € sind möglich (§ 288 BGB). Die Erinnerungen hier sind bewusst freundlich und ohne Gebühren. Rechtliche Schritte bitte vorher anwaltlich klären.
              </p>
            </Card>
          )}

          {d.reminders.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Zahlungserinnerungen" />
              <ul className="divide-y divide-line border-t border-line">
                {d.reminders.map((r) => (
                  <li key={r.fileId}>
                    <a href={fileHref(r.fileId)} target="_blank" className="flex min-h-12 items-center justify-between px-5 py-3 text-[14px] hover:bg-fill-2">
                      <span>Stufe {r.level}</span>
                      <span className="text-muted">{dateTime(r.at)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <div className="px-5 pb-5 pt-4">
              <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
                {d.intact ? <ShieldCheck className="size-[18px] text-ok" /> : <ShieldAlert className="size-[18px] text-accent-ink" />}
                {d.intact ? "Datei unverändert" : "Datei weicht vom gespeicherten Hash ab"}
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Festgeschrieben am {dateTime(inv.finalizedAt)}.{" "}
                {isOffer
                  ? "Änderungen sind gesperrt. Für Änderungen ein neues Angebot anlegen."
                  : kind === "storno"
                    ? "Stornobelege sind endgültig."
                    : "Änderungen sind gesperrt, Korrekturen nur per Storno (GoBD)."}
              </p>
              {!isOffer && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-2">
                  <FileCheck2 className="size-4" /> E-Rechnung ZUGFeRD, Profil EN 16931
                </p>
              )}
              {inv.contentHash && (
                <details className="mt-2 text-[13px]">
                  <summary className="cursor-pointer py-2 font-medium text-ink-2 hover:text-ink">Prüfsumme anzeigen</summary>
                  <p className="break-all font-mono text-[12px] text-muted">SHA-256 {inv.contentHash}</p>
                </details>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Verlauf" />
            <ol className="divide-y divide-line border-t border-line">
              {d.history.map(({ a, user: who }) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-2.5 text-[13px]">
                  <span className="text-ink-2">{ACTION_LABEL[a.action] ?? a.action}</span>
                  <span className="shrink-0 text-right text-muted">
                    {dateTime(a.at)}
                    {who ? <div>{who}</div> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          {inv.notes && (
            <Card className="p-5 text-[14px]">
              <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
                Interne Notiz <Badge>nur intern</Badge>
              </h2>
              <p className="whitespace-pre-line text-ink-2">{inv.notes}</p>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

const ACTION_LABEL: Record<string, string> = {
  entwurf_angelegt: "Entwurf angelegt",
  entwurf_gespeichert: "Entwurf gespeichert",
  festgeschrieben: "Festgeschrieben",
  versendet: "Als versendet markiert",
  bezahlt: "Zahlung erfasst",
  zahlung_zurueckgenommen: "Zahlung zurückgenommen",
  storniert: "Storniert",
  zahlungserinnerung: "Zahlungserinnerung erstellt",
  angebot_angenommen: "Angebot angenommen",
  angebot_abgelehnt: "Angebot abgelehnt",
  angebot_offen: "Angebot wieder offen",
  in_rechnung_umgewandelt: "In Rechnung umgewandelt",
};

function Meta({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "accent" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={tone === "accent" ? "font-semibold text-accent-ink" : "font-medium"}>{value || "nicht gesetzt"}</dd>
    </div>
  );
}
