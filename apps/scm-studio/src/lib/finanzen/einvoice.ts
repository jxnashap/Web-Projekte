// E-Rechnung: ZUGFeRD/Factur-X im Profil EN 16931 (PDF/A-3b mit eingebetteter factur-x.xml) über
// @e-invoice-eu/core. Eingabe ist UBL-artiges JSON; die Bibliothek setzt CustomizationID passend zum Format.
// Stolpersteine laut Test (Recherche): Schriften müssen im PDF eingebettet sein, cac:Delivery ist ein Objekt
// mit Lieferdatum, Verkäufer-Kontakt (BG-6) angeben, Zahlungsart 58 (SEPA-Überweisung) mit IBAN.
import type { Invoice as Ubl } from "@e-invoice-eu/core";
import type { Invoice, InvoiceItem, Party } from "@/db/schema";
import type { Company } from "@/lib/settings";
import { calcTotals, lineNetCents, unitCode, type DocKind } from "./core";

const amt = (cents: number) => (Math.abs(cents) / 100).toFixed(2);
const qty = (q: number) => String(Math.round(Math.abs(q) * 10000) / 10000);
const price = (cents: number) => String(Math.abs(cents) / 100);

export type EInvoiceInput = {
  invoice: Pick<Invoice, "number" | "issueDate" | "dueDate" | "serviceFrom" | "serviceTo" | "buyerReference" | "title"> & { kind: DocKind };
  items: Pick<InvoiceItem, "position" | "description" | "quantity" | "unit" | "unitPriceCents" | "taxRate">[];
  recipient: Party;
  company: Company;
  /** bei Storno: Bezug auf die Originalrechnung */
  cancels?: { number: string; issueDate: string } | null;
};

function taxCategory(rate: number, smallBusiness: boolean) {
  if (smallBusiness) return { "cbc:ID": "E", "cbc:Percent": "0" } as const;
  if (rate === 0) return { "cbc:ID": "Z", "cbc:Percent": "0" } as const;
  return { "cbc:ID": "S", "cbc:Percent": String(rate) } as const;
}

/** Baut das Eingabe-JSON für @e-invoice-eu/core. Stornos werden als Gutschrift (381) mit positiven Beträgen übertragen. */
export function buildUbl({ invoice, items, recipient, company, cancels }: EInvoiceInput): Ubl {
  const small = company.smallBusiness;
  const totals = calcTotals(items, small);
  const issue = invoice.issueDate!;
  const notes: string[] = [];
  if (small) notes.push("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
  if (cancels) notes.push(`Storno zu Rechnung ${cancels.number} vom ${cancels.issueDate}.`);

  const sellerTax: { "cbc:CompanyID": string; "cac:TaxScheme": { "cbc:ID": string } }[] = [];
  if (company.vatId) sellerTax.push({ "cbc:CompanyID": company.vatId.replace(/\s+/g, ""), "cac:TaxScheme": { "cbc:ID": "VAT" } });
  if (company.taxNumber) sellerTax.push({ "cbc:CompanyID": company.taxNumber, "cac:TaxScheme": { "cbc:ID": "FC" } });

  const ubl: Ubl = {
    "ubl:Invoice": {
      "cbc:ID": invoice.number!,
      "cbc:IssueDate": issue,
      ...(invoice.dueDate && invoice.kind === "rechnung" ? { "cbc:DueDate": invoice.dueDate } : {}),
      "cbc:InvoiceTypeCode": invoice.kind === "storno" ? "381" : "380",
      ...(notes.length ? { "cbc:Note": notes } : {}),
      "cbc:DocumentCurrencyCode": "EUR",
      ...(invoice.buyerReference ? { "cbc:BuyerReference": invoice.buyerReference } : {}),
      ...(invoice.serviceFrom && invoice.serviceTo
        ? { "cac:InvoicePeriod": { "cbc:StartDate": invoice.serviceFrom, "cbc:EndDate": invoice.serviceTo } }
        : {}),
      ...(cancels ? { "cac:BillingReference": [{ "cac:InvoiceDocumentReference": { "cbc:ID": cancels.number, "cbc:IssueDate": cancels.issueDate } }] } : {}),
      "cac:AccountingSupplierParty": {
        "cac:Party": {
          "cbc:EndpointID": company.email,
          "cbc:EndpointID@schemeID": "EM",
          "cac:PartyName": { "cbc:Name": company.brand || company.legalName },
          "cac:PostalAddress": {
            "cbc:StreetName": company.street,
            "cbc:CityName": company.city,
            "cbc:PostalZone": company.zip,
            "cac:Country": { "cbc:IdentificationCode": company.country || "DE" },
          },
          "cac:PartyTaxScheme": sellerTax.slice(0, 2) as [],
          "cac:PartyLegalEntity": { "cbc:RegistrationName": company.legalName },
          "cac:Contact": {
            "cbc:Name": company.owner || company.legalName,
            ...(company.phone ? { "cbc:Telephone": company.phone } : {}),
            "cbc:ElectronicMail": company.email,
          },
        },
      },
      "cac:AccountingCustomerParty": {
        "cac:Party": {
          ...(recipient.email ? { "cbc:EndpointID": recipient.email, "cbc:EndpointID@schemeID": "EM" } : {}),
          "cac:PostalAddress": {
            ...(recipient.street ? { "cbc:StreetName": recipient.street } : {}),
            ...(recipient.city ? { "cbc:CityName": recipient.city } : {}),
            ...(recipient.zip ? { "cbc:PostalZone": recipient.zip } : {}),
            "cac:Country": { "cbc:IdentificationCode": recipient.country || "DE" },
          },
          ...(recipient.vatId
            ? { "cac:PartyTaxScheme": { "cbc:CompanyID": recipient.vatId.replace(/\s+/g, ""), "cac:TaxScheme": { "cbc:ID": "VAT" } } }
            : {}),
          "cac:PartyLegalEntity": { "cbc:RegistrationName": recipient.name },
          ...(recipient.contact ? { "cac:Contact": { "cbc:Name": recipient.contact } } : {}),
        },
      },
      "cac:Delivery": { "cbc:ActualDeliveryDate": invoice.serviceTo ?? issue },
      ...(invoice.kind === "rechnung"
        ? {
            "cac:PaymentMeans": [
              {
                "cbc:PaymentMeansCode": "58",
                "cbc:PaymentID": invoice.number!,
                "cac:PayeeFinancialAccount": {
                  "cbc:ID": company.iban.replace(/\s+/g, "").toUpperCase(),
                  "cbc:Name": company.legalName,
                  ...(company.bic ? { "cac:FinancialInstitutionBranch": { "cbc:ID": company.bic } } : {}),
                },
              },
            ],
          }
        : {}),
      ...(invoice.kind === "rechnung" && invoice.dueDate ? { "cac:PaymentTerms": { "cbc:Note": `Zahlbar ohne Abzug bis ${invoice.dueDate}.` } } : {}),
      "cac:TaxTotal": [
        {
          "cbc:TaxAmount": amt(totals.taxCents),
          "cbc:TaxAmount@currencyID": "EUR",
          "cac:TaxSubtotal": totals.groups.map((g) => ({
            "cbc:TaxableAmount": amt(g.netCents),
            "cbc:TaxableAmount@currencyID": "EUR" as const,
            "cbc:TaxAmount": amt(g.taxCents),
            "cbc:TaxAmount@currencyID": "EUR" as const,
            "cac:TaxCategory": {
              ...taxCategory(g.rate, small),
              ...(small ? { "cbc:TaxExemptionReason": "Kleinunternehmer gemäß § 19 UStG" } : {}),
              "cac:TaxScheme": { "cbc:ID": "VAT" },
            },
          })),
        },
      ],
      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": amt(totals.netCents),
        "cbc:LineExtensionAmount@currencyID": "EUR",
        "cbc:TaxExclusiveAmount": amt(totals.netCents),
        "cbc:TaxExclusiveAmount@currencyID": "EUR",
        "cbc:TaxInclusiveAmount": amt(totals.grossCents),
        "cbc:TaxInclusiveAmount@currencyID": "EUR",
        "cbc:PayableAmount": amt(totals.grossCents),
        "cbc:PayableAmount@currencyID": "EUR",
      },
      "cac:InvoiceLine": items.map((it, i) => ({
        "cbc:ID": String(i + 1),
        "cbc:InvoicedQuantity": qty(it.quantity),
        "cbc:InvoicedQuantity@unitCode": unitCode(it.unit),
        "cbc:LineExtensionAmount": amt(lineNetCents(it)),
        "cbc:LineExtensionAmount@currencyID": "EUR" as const,
        "cac:Item": {
          "cbc:Name": it.description.split("\n")[0].slice(0, 200),
          ...(it.description.includes("\n") ? { "cbc:Description": it.description } : {}),
          "cac:ClassifiedTaxCategory": { ...taxCategory(it.taxRate, small), "cac:TaxScheme": { "cbc:ID": "VAT" } },
        },
        "cac:Price": { "cbc:PriceAmount": price(it.unitPriceCents), "cbc:PriceAmount@currencyID": "EUR" as const },
      })) as Ubl["ubl:Invoice"]["cac:InvoiceLine"],
    },
  };
  return ubl;
}

/** Hängt die XML an das (mit eingebetteten Schriften gerenderte) PDF an und macht daraus PDF/A-3b. */
export async function toFacturX(pdf: Uint8Array, input: EInvoiceInput, filename: string): Promise<Uint8Array> {
  const { InvoiceService } = await import("@e-invoice-eu/core");
  const quiet = { log: () => {}, warn: (m: string) => console.warn(`[e-rechnung] ${m}`), error: (m: string) => console.error(`[e-rechnung] ${m}`) };
  const out = await new InvoiceService(quiet).generate(buildUbl(input), {
    format: "Factur-X-EN16931",
    lang: "de-de",
    pdf: { buffer: pdf, filename, mimetype: "application/pdf" },
    customMetadata: { title: filename.replace(/\.pdf$/, ""), author: input.company.brand, creator: "SCM Studio", producer: "SCM Studio" },
  });
  if (typeof out === "string") throw new Error("E-Rechnung: unerwartetes Ausgabeformat");
  return out;
}
