// Nur zum Testen des PDF-Layouts (wird vor dem Livegang entfernt).
import { renderPdf, pdfResponse } from "@/lib/pdf/render";
import { AddressHead, KeyValues, Note, P, PdfDocument, PdfPage, PdfTable, Section, SignatureBox, Title } from "@/lib/pdf/components";

const company = {
  brand: "SCM Creatives", legalName: "Blacksnapper Consulting", owner: "Andreas Mattolat", street: "Hüttenweg 4", zip: "21516",
  city: "Tramm", country: "DE", vatId: "DE265142237", taxNumber: "", email: "scm.creatives@gmx.de", phone: "0172 5361079",
  web: "scm-creatives.de", bankName: "", iban: "", bic: "", paymentDays: 14, smallBusiness: false,
};
const rows = Array.from({ length: 26 }, (_, i) => ({ pos: i + 1, text: `Social-Media-Video ${i + 1} (Reel, 9:16, bis 60 Sek.)`, qty: 1, price: "200,00 €" }));
const strokes = [[[10, 60], [30, 20], [50, 70], [70, 25], [95, 65], [120, 30]], [[130, 50], [180, 48], [220, 52]]];

const doc = (
  <PdfDocument title="Probe" company={company} pdfa>
    <PdfPage company={company} kind="Rechnung" reference="RE-2026-0001" watermark="Entwurf · anwaltlich zu prüfen">
      <AddressHead company={company} recipient={["Jens Rohwer Malermeister", "z. Hd. Jens Rohwer", "Goethestraße 8", "24116 Kiel"]}
        meta={[["Datum", "26.10.2026"], ["Rechnung", "RE-2026-0001"], ["Kunde", "K-0002"], ["Leistung", "Oktober 2026"]]} />
      <Title kicker="Szene 01 · Rechnung">Rechnung</Title>
      <P>Hallo Jens, vielen Dank für die Zusammenarbeit im Oktober. Wir berechnen euch folgende Leistungen:</P>
      <PdfTable cols={[
        { key: "pos", label: "Pos", width: "8%", render: (r) => String(r.pos) },
        { key: "text", label: "Leistung", width: "57%", render: (r) => r.text },
        { key: "qty", label: "Menge", width: "15%", align: "right", render: (r) => `${r.qty} Stk.` },
        { key: "price", label: "Betrag", width: "20%", align: "right", render: (r) => r.price },
      ]} rows={rows} />
      <Section title="Projektdaten" number="01">
        <KeyValues rows={[["Paket", "4 Videos pro Monat"], ["Laufzeit", "3 Monate, danach monatlich kündbar"], ["Ansprechpartner", "Oskar von Esebeck"]]} />
      </Section>
      <Note tone="accent">Dieses Dokument ist eine Vorlage. Vor dem ersten Einsatz anwaltlich prüfen lassen.</Note>
      <SignatureBox label="Unterschrift Kunde" name="Jens Rohwer" place="Kiel" date="26.10.2026" strokes={strokes} />
    </PdfPage>
  </PdfDocument>
);
export async function GET() {
  return pdfResponse(await renderPdf(doc), "probe.pdf");
}
