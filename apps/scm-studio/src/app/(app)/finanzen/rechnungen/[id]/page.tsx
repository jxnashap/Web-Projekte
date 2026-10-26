import { ArrowLeft, BellRing, Check, Download, ExternalLink, FileCheck2, Mail, Send, ShieldAlert, ShieldCheck, Undo2, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AmountRow, Figure } from "@/components/finanzen/figure";
import { FinanzenNav } from "@/components/finanzen/finanzen-nav";
import { CancelButton, PayButton } from "@/components/finanzen/invoice-actions";
import { InvoiceEditor } from "@/components/finanzen/invoice-editor";
import { InvoiceStatus } from "@/components/finanzen/status";
import { Badge } from "@/components/ui/badge";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/confirm-action";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { convertOffer, markSent, remind, setOfferStatus, undoPaid } from "@/lib/finanzen/actions";
import { calcTotals, customerNumber, KIND_LABEL, lineNetCents, qtyText, type DocKind } from "@/lib/finanzen/core";
import { getClientOptions, getInvoiceDetail } from "@/lib/finanzen/data";
import { dateDe, dateTime, eur } from "@/lib/format";
import { fileHref } from "@/lib/storage";
import { todayIso } from "@/lib/time";

export const metadata = { title: "Beleg" };

export default function BelegPage({ params }: PageProps<"/finanzen/rechnungen/[id]">) {
  return (
    <>
      <Link href="/finanzen/rechnungen" className="mb-3 inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Rechnungen und Angebote
      </Link>
      <Suspense fallback={<Skeleton className="h-[70vh]" />}>
        <Beleg params={params} />
      </Suspense>
    </>
  );
}

async function Beleg({ params }: { params: PageProps<"/finanzen/rechnungen/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const user = await requireUser();
  const d = await getInvoiceDetail(Number(id));
  if (!d) notFound();
  const { invoice: inv } = d;
  const kind = inv.kind as DocKind;
  const label = KIND_LABEL[kind];
  const recipientName = inv.recipient?.name ?? d.client?.name ?? "Ohne Empfänger";

  if (!inv.finalizedAt) {
    const clients = await getClientOptions();
    return (
      <>
        <PageHeader
          scene="Szene 08 · Finanzen"
          title={`${label}sentwurf`}
          description={`${recipientName}${inv.number ? ` · Nummer ${inv.number} ist reserviert` : ""}. Entwürfe könnt ihr beliebig ändern.`}
        />
        <FinanzenNav active="rechnungen" />
        <InvoiceEditor
          invoice={{ ...inv, kind: kind === "angebot" ? "angebot" : "rechnung" }}
          items={d.items}
          clients={clients}
          paymentDays={d.company?.paymentDays ?? 14}
          smallBusiness={Boolean(d.company?.smallBusiness)}
          blockers={d.blockers}
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
  const isOpenInvoice = kind === "rechnung" && inv.status === "offen";
  const overdue = d.display === "ueberfaellig";

  return (
    <>
      <PageHeader
        scene="Szene 08 · Finanzen"
        title={inv.number ?? label}
        description={`${label} an ${recipientName}${inv.title && inv.title !== label ? ` · ${inv.title}` : ""}`}
        actions={
          <>
            {inv.fileId && (
              <LinkButton href={fileHref(inv.fileId, true)} variant="secondary" prefetch={false}>
                <Download className="size-4" /> PDF
              </LinkButton>
            )}
            {kind !== "storno" && (
              <a href={mailto} className={buttonClass("primary")}>
                <Mail className="size-4" /> Per E-Mail vorbereiten
              </a>
            )}
          </>
        }
      />
      <FinanzenNav active="rechnungen" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Figure label={kind === "angebot" ? "Angebotssumme" : kind === "storno" ? "Storno brutto" : "Rechnungsbetrag"} value={eur(inv.grossCents)} sub={`netto ${eur(inv.netCents)}${small ? "" : ` · USt ${eur(inv.taxCents)}`}`} />
              <InvoiceStatus kind={kind} status={d.display} />
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 text-[14px] sm:grid-cols-3">
              <Meta label="Datum" value={dateDe(inv.issueDate)} />
              {kind === "rechnung" && <Meta label="Fällig am" value={dateDe(inv.dueDate)} tone={overdue ? "accent" : undefined} />}
              {kind === "angebot" && <Meta label="Gültig bis" value={dateDe(inv.validUntil)} />}
              {inv.serviceFrom && inv.serviceTo && <Meta label="Leistung" value={`${dateDe(inv.serviceFrom)} bis ${dateDe(inv.serviceTo)}`} />}
              {inv.clientId && <Meta label="Kunde" value={<Link className="underline-offset-2 hover:underline" href={`/kunden/${inv.clientId}`}>{customerNumber(inv.clientId)} {d.client?.name}</Link>} />}
              {inv.sentAt && <Meta label="Versendet" value={dateTime(inv.sentAt)} />}
              {inv.paidAt && <Meta label="Bezahlt am" value={dateDe(inv.paidAt)} />}
              {inv.dunningLevel > 0 && <Meta label="Erinnerungen" value={`${inv.dunningLevel}, zuletzt ${dateDe(inv.lastDunningAt)}`} />}
            </dl>
          </Card>

          {inv.fileId && (
            <Card className="overflow-hidden">
              <CardHeader
                title="Beleg"
                sub="So wie festgeschrieben und versendet"
                action={
                  <LinkButton href={fileHref(inv.fileId)} target="_blank" variant="ghost" size="sm" prefetch={false}>
                    Öffnen <ExternalLink className="size-4" />
                  </LinkButton>
                }
              />
              <iframe src={fileHref(inv.fileId)} title={`${label} ${inv.number}`} className="hidden h-[820px] w-full bg-sunken md:block" />
              <ul className="divide-y divide-line md:hidden">
                {d.items.map((it, i) => (
                  <li key={it.id} className="flex items-start justify-between gap-4 px-5 py-3 text-[14px]">
                    <div className="min-w-0">
                      <div>{it.description}</div>
                      <div className="text-[13px] text-muted">
                        {i + 1}. · {qtyText(it.quantity)} {it.unit} × {eur(it.unitPriceCents)}
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
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader title="Nächste Schritte" />
            <div className="grid gap-2 p-5">
              {kind === "rechnung" && !inv.sentAt && inv.status !== "storniert" && (
                <ActionButton action={markSent.bind(null, inv.id)} variant="secondary" size="md">
                  <Send className="size-4" /> Als versendet markieren
                </ActionButton>
              )}
              {isOpenInvoice && <PayButton id={inv.id} today={today} number={inv.number!} />}
              {isOpenInvoice && overdue && inv.dunningLevel < 3 && (
                <ActionButton
                  action={remind.bind(null, inv.id)}
                  variant="secondary"
                  size="md"
                  confirm={`Zahlungserinnerung Stufe ${inv.dunningLevel + 1} als PDF erstellen?`}
                >
                  <BellRing className="size-4" /> {inv.dunningLevel + 1}. Zahlungserinnerung erstellen
                </ActionButton>
              )}
              {kind === "rechnung" && inv.status === "bezahlt" && (
                <ActionButton action={undoPaid.bind(null, inv.id)} variant="ghost" size="md" confirm="Zahlung zurücknehmen? Die Rechnung gilt dann wieder als offen.">
                  <Undo2 className="size-4" /> Zahlung zurücknehmen
                </ActionButton>
              )}
              {kind === "rechnung" && inv.status !== "storniert" && user.role === "admin" && <CancelButton id={inv.id} number={inv.number!} />}
              {kind === "angebot" && inv.status === "offen" && (
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton action={setOfferStatus.bind(null, inv.id, "angenommen")} variant="secondary" size="md">
                    <Check className="size-4" /> Angenommen
                  </ActionButton>
                  <ActionButton action={setOfferStatus.bind(null, inv.id, "abgelehnt")} variant="secondary" size="md">
                    <X className="size-4" /> Abgelehnt
                  </ActionButton>
                </div>
              )}
              {kind === "angebot" && inv.status !== "abgelehnt" && d.converted.length === 0 && (
                <ActionButton action={convertOffer.bind(null, inv.id)} size="md">
                  In Rechnung umwandeln
                </ActionButton>
              )}
              {kind === "angebot" && inv.status !== "offen" && (
                <ActionButton action={setOfferStatus.bind(null, inv.id, "offen")} variant="ghost" size="md">
                  Wieder auf offen setzen
                </ActionButton>
              )}
              {d.converted.map((c) => (
                <Link key={c.id} href={`/finanzen/rechnungen/${c.id}`} className="text-[14px] text-ink-2 underline-offset-2 hover:underline">
                  Rechnung {c.number ?? "(Entwurf)"} aus diesem Angebot
                </Link>
              ))}
              {d.stornos.map((c) => (
                <Link key={c.id} href={`/finanzen/rechnungen/${c.id}`} className="text-[14px] text-ink-2 underline-offset-2 hover:underline">
                  Stornobeleg {c.number}
                </Link>
              ))}
              {d.cancels && (
                <Link href={`/finanzen/rechnungen/${d.cancels.id}`} className="text-[14px] text-ink-2 underline-offset-2 hover:underline">
                  Storniert Rechnung {d.cancels.number}
                </Link>
              )}
              {d.fromOffer && (
                <Link href={`/finanzen/rechnungen/${d.fromOffer.id}`} className="text-[14px] text-ink-2 underline-offset-2 hover:underline">
                  Aus Angebot {d.fromOffer.number ?? "(Entwurf)"}
                </Link>
              )}
              {kind !== "storno" && !email && <p className="text-[12px] text-muted">Für den Mailversand fehlt eine E-Mail-Adresse beim Kunden.</p>}
              {kind !== "storno" && (
                <p className="text-[12px] text-muted">Per E-Mail: Text wird vorbereitet, das PDF hängt ihr in eurem Mailprogramm an.</p>
              )}
            </div>
          </Card>

          {overdue && (
            <Card className="p-5 text-[13px] text-ink-2">
              <div className="mb-1 font-semibold text-ink">Wenn eine Rechnung offen bleibt</div>
              Gegenüber Unternehmen tritt Verzug spätestens 30 Tage nach Fälligkeit und Zugang der Rechnung ein (§ 286 Abs. 3 BGB). Verzugszinsen und eine Pauschale von 40 € sind
              möglich (§ 288 BGB). Die Erinnerungen hier sind bewusst freundlich und ohne Gebühren. Rechtliche Schritte bitte vorher anwaltlich klären.
            </Card>
          )}

          {d.reminders.length > 0 && (
            <Card>
              <CardHeader title="Zahlungserinnerungen" />
              <ul className="divide-y divide-line">
                {d.reminders.map((r) => (
                  <li key={r.fileId}>
                    <a href={fileHref(r.fileId)} target="_blank" className="flex items-center justify-between px-5 py-3 text-[14px] hover:bg-sunken/60">
                      <span>Stufe {r.level}</span>
                      <span className="text-muted">{dateTime(r.at)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-2 font-semibold">
              {d.intact ? <ShieldCheck className="size-4 text-ok" /> : <ShieldAlert className="size-4 text-accent-ink" />}
              {d.intact ? "Datei unverändert" : "Datei weicht vom gespeicherten Hash ab"}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Festgeschrieben am {dateTime(inv.finalizedAt)}. Änderungen sind gesperrt, Korrekturen nur per Storno (GoBD).
            </p>
            {kind !== "angebot" && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-2">
                <FileCheck2 className="size-4" /> E-Rechnung ZUGFeRD, Profil EN 16931
              </p>
            )}
            <p className="mt-3 break-all font-mono text-[11px] text-muted">SHA-256 {inv.contentHash}</p>
          </Card>

          <Card>
            <CardHeader title="Verlauf" />
            <ol className="divide-y divide-line">
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
              <div className="mb-1 flex items-center gap-2 font-semibold">
                Interne Notiz <Badge>nur intern</Badge>
              </div>
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
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={tone === "accent" ? "font-semibold text-accent-ink" : "font-medium"}>{value || "nicht gesetzt"}</dd>
    </div>
  );
}
