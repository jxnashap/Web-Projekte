// PDF-Vorlagen für Rechnung, Angebot, Storno und Zahlungserinnerung (weiß, Logo, Markenschriften).
import type { Invoice, InvoiceItem, Party } from "@/db/schema";
import { AddressHead, Note, P, PdfDocument, PdfPage, PdfTable, s, Text, Title, View } from "@/lib/pdf/components";
import { C, MM } from "@/lib/pdf/theme";
import type { Company } from "@/lib/settings";
import { calcTotals, customerNumber, eurText, isoToDe, KIND_LABEL, lineNetCents, qtyText, recipientLines, type DocKind } from "./core";

export type InvoicePdfData = {
  invoice: Pick<
    Invoice,
    "number" | "title" | "issueDate" | "serviceFrom" | "serviceTo" | "dueDate" | "validUntil" | "intro" | "outro" | "buyerReference" | "clientId"
  > & { kind: DocKind };
  items: Pick<InvoiceItem, "description" | "quantity" | "unit" | "unitPriceCents" | "taxRate">[];
  recipient: Party | null;
  company: Company | null;
  draft: boolean;
  cancels?: { number: string; issueDate: string } | null;
};

export function InvoicePdf({ invoice, items, recipient, company, draft, cancels }: InvoicePdfData) {
  const kind = invoice.kind;
  const label = KIND_LABEL[kind];
  const small = Boolean(company?.smallBusiness);
  const totals = calcTotals(items, small);
  const number = invoice.number ?? "Entwurf";
  const issue = invoice.issueDate;
  const meta: [string, string][] = [
    ["Datum", issue ? isoToDe(issue) : "bei Festschreibung"],
    [kind === "angebot" ? "Angebot" : kind === "storno" ? "Storno" : "Rechnung", number],
  ];
  if (invoice.clientId) meta.push(["Kunde", customerNumber(invoice.clientId)]);
  if (invoice.serviceFrom && invoice.serviceTo)
    meta.push(["Leistung", invoice.serviceFrom === invoice.serviceTo ? isoToDe(invoice.serviceFrom) : `${isoToDe(invoice.serviceFrom)} bis ${isoToDe(invoice.serviceTo)}`]);
  if (kind === "rechnung" && invoice.dueDate) meta.push(["Fällig am", isoToDe(invoice.dueDate)]);
  if (kind === "angebot" && invoice.validUntil) meta.push(["Gültig bis", isoToDe(invoice.validUntil)]);
  if (invoice.buyerReference) meta.push(["Ihre Referenz", invoice.buyerReference]);
  if (cancels) meta.push(["Bezug", cancels.number]);

  const sub = invoice.title && invoice.title !== label ? invoice.title : undefined;
  const isEInvoice = kind !== "angebot" && !draft;

  return (
    <PdfDocument title={`${label} ${number}`} subject={sub ?? label} company={company} pdfa={isEInvoice}>
      <PdfPage company={company} kind={label} reference={number} watermark={draft ? "Entwurf · nicht gültig" : undefined}>
        <AddressHead company={company} recipient={recipientLines(recipient)} meta={meta} />
        <Title kicker={recipient?.name ? `Für ${recipient.name}` : (company?.brand ?? "SCM Creatives")} sub={sub}>
          {label}
        </Title>
        {cancels ? (
          <P>
            Hiermit stornieren wir die Rechnung {cancels.number} vom {isoToDe(cancels.issueDate)} vollständig. Die Beträge werden mit umgekehrtem Vorzeichen ausgewiesen.
          </P>
        ) : null}
        {invoice.intro ? <P style={{ marginBottom: 4 * MM }}>{invoice.intro}</P> : null}

        <PdfTable
          cols={[
            { key: "pos", label: "Pos", width: "7%", render: (_, i) => String(i + 1) },
            { key: "text", label: "Leistung", width: "45%", render: (r) => r.description },
            { key: "qty", label: "Menge", width: "14%", align: "right", render: (r) => `${qtyText(r.quantity)} ${r.unit}` },
            { key: "price", label: "Einzelpreis", width: "16%", align: "right", render: (r) => eurText(r.unitPriceCents) },
            { key: "sum", label: "Betrag", width: "18%", align: "right", render: (r) => eurText(lineNetCents(r)) },
          ]}
          rows={items}
        />

        <View wrap={false} minPresenceAhead={60} style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 * MM, marginBottom: 6 * MM }}>
          <View style={{ width: "48%" }}>
            <SumRow label="Summe netto" value={eurText(totals.netCents)} />
            {small ? (
              <SumRow label="Umsatzsteuer" value="0,00 €" />
            ) : (
              totals.groups.map((g) => <SumRow key={g.rate} label={`Umsatzsteuer ${g.rate} % auf ${eurText(g.netCents)}`} value={eurText(g.taxCents)} />)
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.ink, paddingTop: 5, marginTop: 3 }}>
              <Text style={[s.h3, { fontSize: 11 }]}>{kind === "angebot" ? "Angebotssumme" : "Gesamtbetrag"}</Text>
              <Text style={[s.h3, { fontSize: 11 }]}>{eurText(totals.grossCents)}</Text>
            </View>
          </View>
        </View>

        {small ? <P>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</P> : null}
        {kind !== "angebot" && !(invoice.serviceFrom && invoice.serviceTo) ? <P>Das Leistungsdatum entspricht dem Rechnungsdatum.</P> : null}
        {kind === "rechnung" ? (
          <P>
            Bitte überweist den Gesamtbetrag{invoice.dueDate ? ` bis zum ${isoToDe(invoice.dueDate)}` : ""} ohne Abzug auf das unten genannte Konto
            {company?.iban ? ` (IBAN ${company.iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim()})` : ""}. Verwendungszweck: {number}.
          </P>
        ) : null}
        {kind === "angebot" && invoice.validUntil ? <P>Dieses Angebot gilt bis zum {isoToDe(invoice.validUntil)}.</P> : null}
        {invoice.outro ? <P style={{ marginTop: 2 * MM }}>{invoice.outro}</P> : null}
        {isEInvoice ? (
          <View style={{ marginTop: 6 * MM }}>
            <Note>Diese Rechnung ist eine E-Rechnung im Format ZUGFeRD (Profil EN 16931). Die maschinenlesbaren Rechnungsdaten sind in dieser PDF-Datei eingebettet.</Note>
          </View>
        ) : null}
      </PdfPage>
    </PdfDocument>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 }}>
      <Text style={s.p}>{label}</Text>
      <Text style={[s.p, { color: C.ink }]}>{value}</Text>
    </View>
  );
}

export type ReminderPdfData = {
  level: number;
  date: string;
  payUntil: string;
  invoice: { number: string; issueDate: string; dueDate: string | null; grossCents: number; clientId: number | null; title: string };
  recipient: Party | null;
  company: Company | null;
};

const REMINDER_TITLE = ["Zahlungserinnerung", "Zweite Zahlungserinnerung", "Letzte Zahlungserinnerung"];

/** Freundliche Zahlungserinnerung ohne Gebühren. */
export function ReminderPdf({ level, date, payUntil, invoice, recipient, company }: ReminderPdfData) {
  const title = REMINDER_TITLE[Math.min(Math.max(level, 1), 3) - 1];
  const greeting = recipient?.contact ? `Hallo ${recipient.contact},` : "Hallo,";
  const body =
    level <= 1
      ? `im Alltag rutscht so etwas schnell durch: Zu unserer Rechnung ${invoice.number} konnten wir bisher noch keinen Zahlungseingang finden. Bitte überweist den offenen Betrag bis zum ${isoToDe(payUntil)}.`
      : level === 2
        ? `wir haben euch bereits an die Rechnung ${invoice.number} erinnert und bisher keinen Zahlungseingang gefunden. Bitte überweist den offenen Betrag bis zum ${isoToDe(payUntil)}. Wenn es Fragen zur Rechnung gibt, meldet euch gern direkt bei uns.`
        : `trotz unserer bisherigen Erinnerungen ist die Rechnung ${invoice.number} noch offen. Bitte überweist den offenen Betrag bis spätestens ${isoToDe(payUntil)}. Falls es einen Grund für die Verzögerung gibt, sprecht uns bitte an, damit wir gemeinsam eine Lösung finden.`;
  return (
    <PdfDocument title={`${title} ${invoice.number}`} company={company}>
      <PdfPage company={company} kind={title} reference={invoice.number}>
        <AddressHead
          company={company}
          recipient={recipientLines(recipient)}
          meta={[
            ["Datum", isoToDe(date)],
            ["Rechnung", invoice.number],
            ...(invoice.clientId ? ([["Kunde", customerNumber(invoice.clientId)]] as [string, string][]) : []),
          ]}
        />
        <Title kicker={`${company?.brand ?? "SCM Creatives"} · Stufe ${level}`}>{title}</Title>
        <P>{greeting}</P>
        <P>{body}</P>
        <View style={{ marginVertical: 5 * MM }}>
          <PdfTable
            cols={[
              { key: "nr", label: "Rechnung", width: "25%", render: (r) => r.number },
              { key: "datum", label: "Datum", width: "20%", render: (r) => isoToDe(r.issueDate) },
              { key: "faellig", label: "Fällig seit", width: "20%", render: (r) => isoToDe(r.dueDate) },
              { key: "betrag", label: "Offener Betrag", width: "35%", align: "right", render: (r) => eurText(r.grossCents) },
            ]}
            rows={[invoice]}
          />
        </View>
        <P>
          Bankverbindung: {company?.legalName}
          {company?.iban ? `, IBAN ${company.iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim()}` : ""}
          {company?.bic ? `, BIC ${company.bic}` : ""}. Verwendungszweck: {invoice.number}.
        </P>
        <P>Falls sich eure Zahlung mit diesem Schreiben überschnitten hat, betrachtet es bitte als erledigt. Vielen Dank!</P>
        <P style={{ marginTop: 4 * MM }}>Viele Grüße{company?.owner ? `\n${company.owner}` : ""}</P>
      </PdfPage>
    </PdfDocument>
  );
}
