// Finanzen: reine Rechen- und Formatlogik (ohne Datenbank, ohne "server-only"), damit App, Seed und Tests
// dieselben Regeln nutzen. Geld immer in Cent, kaufmännisch gerundet (ab ,5 vom Nullpunkt weg).
import type { Party } from "@/db/schema";
import { UNITS } from "@/lib/labels";
import type { Company } from "@/lib/settings";

// ------------------------------------------------------------------
// Runden und Summen
// ------------------------------------------------------------------

/** Kaufmännisch runden (ROUND_HALF_UP, vom Nullpunkt weg), robust gegen Gleitkomma-Reste. */
export function roundHalfUp(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const cleaned = Math.round(abs * 1e6) / 1e6;
  return sign * Math.floor(cleaned + 0.5);
}

export type LineInput = { quantity: number; unitPriceCents: number; taxRate: number };

export const lineNetCents = (l: LineInput) => roundHalfUp(l.quantity * l.unitPriceCents);

export type TaxGroup = { rate: number; netCents: number; taxCents: number };
export type Totals = { netCents: number; taxCents: number; grossCents: number; groups: TaxGroup[] };

/**
 * Summen einer Rechnung: Positionen netto, Steuer je Steuersatz auf die Summe der Positionen
 * (so verlangt es auch die E-Rechnung nach EN 16931). Kleinunternehmer: keine Umsatzsteuer.
 */
export function calcTotals(lines: LineInput[], smallBusiness = false): Totals {
  const byRate = new Map<number, number>();
  for (const l of lines) {
    const rate = smallBusiness ? 0 : l.taxRate;
    byRate.set(rate, (byRate.get(rate) ?? 0) + lineNetCents(l));
  }
  const groups = [...byRate.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, netCents]) => ({ rate, netCents, taxCents: roundHalfUp((netCents * rate) / 100) }));
  const netCents = groups.reduce((s, g) => s + g.netCents, 0);
  const taxCents = groups.reduce((s, g) => s + g.taxCents, 0);
  return { netCents, taxCents, grossCents: netCents + taxCents, groups };
}

/** Netto ↔ Brutto für Belege (Steuer aus dem Brutto herausrechnen wie bei Kleinbetragsrechnungen, § 35 UStDV). */
export function splitGross(grossCents: number, rate: number) {
  const netCents = roundHalfUp((grossCents * 100) / (100 + rate));
  return { netCents, taxCents: grossCents - netCents, grossCents };
}
export function fromNet(netCents: number, rate: number) {
  const taxCents = roundHalfUp((netCents * rate) / 100);
  return { netCents, taxCents, grossCents: netCents + taxCents };
}

/** Kleinbetragsrechnung bis 250 € brutto (§ 33 UStDV). */
export const SMALL_AMOUNT_LIMIT_CENTS = 25000;

// ------------------------------------------------------------------
// Nummernkreise
// ------------------------------------------------------------------
export type DocKind = "rechnung" | "angebot" | "storno";
export const KIND_PREFIX: Record<DocKind, string> = { rechnung: "RE", angebot: "AN", storno: "ST" };
export const KIND_LABEL: Record<DocKind, string> = { rechnung: "Rechnung", angebot: "Angebot", storno: "Stornorechnung" };
export const KIND_PLURAL: Record<DocKind, string> = { rechnung: "Rechnungen", angebot: "Angebote", storno: "Stornos" };

export const formatDocNumber = (kind: DocKind, year: number, n: number) => `${KIND_PREFIX[kind]}-${year}-${String(n).padStart(4, "0")}`;
export const customerNumber = (clientId: number | null | undefined) => (clientId ? `K-${String(clientId).padStart(4, "0")}` : "");

// ------------------------------------------------------------------
// Einheiten (UN/ECE Rec. 20) und Steuersätze
// ------------------------------------------------------------------
export const TAX_RATES = [19, 7, 0] as const;

/** Einheit wird als Klartext gespeichert ("Stück", "Monat" …); für die E-Rechnung der Code. */
export function unitCode(label: string): string {
  const hit = Object.values(UNITS).find((u) => u.label.toLowerCase() === label.trim().toLowerCase());
  return hit?.code ?? "C62";
}
export const UNIT_LABELS = Object.values(UNITS).map((u) => u.label);

// ------------------------------------------------------------------
// Empfänger und Firmenangaben
// ------------------------------------------------------------------
type ClientLike = {
  name: string;
  contactName?: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  ort?: string | null;
  vatId?: string | null;
  email?: string | null;
};

/** Empfänger als Momentaufnahme (spätere Änderungen am Kunden ändern alte Rechnungen nicht). */
export function partyFromClient(c: ClientLike): Party {
  return {
    name: c.name,
    contact: c.contactName ?? null,
    street: c.street ?? null,
    zip: c.zip ?? null,
    city: c.city ?? c.ort ?? null,
    country: "DE",
    vatId: c.vatId ?? null,
    email: c.email ?? null,
  };
}

export function recipientLines(p: Party | null | undefined): string[] {
  if (!p) return [];
  return [p.name, p.contact ? `z. Hd. ${p.contact}` : "", p.street ?? "", [p.zip, p.city].filter(Boolean).join(" "), p.country && p.country !== "DE" ? p.country : ""].filter(
    Boolean,
  );
}

/** Pflichtangaben des Ausstellers nach § 14 Abs. 4 UStG plus Bankverbindung für die Zahlung. */
export function missingCompanyFields(c: Company | null, kind: DocKind): string[] {
  if (!c) return ["Firmendaten"];
  const miss: string[] = [];
  if (!c.legalName?.trim()) miss.push("Name des Unternehmens");
  if (!c.street?.trim() || !c.zip?.trim() || !c.city?.trim()) miss.push("Anschrift");
  if (!c.vatId?.trim() && !c.taxNumber?.trim()) miss.push("Steuernummer oder USt-IdNr.");
  if (kind !== "angebot" && !c.iban?.trim()) miss.push("IBAN");
  if (kind !== "angebot" && !c.email?.trim()) miss.push("E-Mail-Adresse");
  return miss;
}

/** Hindernis vor dem Festschreiben; `field` ist der Name des Formularfelds (für Sprung und Markierung). */
export type Blocker = { text: string; field?: string; href?: string };

/**
 * Prüft einen Entwurf vor dem Festschreiben (rein, ohne Datenbank): die App zeigt die Liste live im Editor,
 * der Server prüft beim Festschreiben dieselben Regeln (siehe workflow.ts).
 */
export function draftBlockers(input: {
  kind: DocKind;
  recipient: Pick<Party, "name" | "street" | "zip" | "city"> | null | undefined;
  serviceFrom?: string | null;
  serviceTo?: string | null;
  items: { description: string; quantity: number; unitPriceCents: number; taxRate: number }[];
  companyMissing: string[];
  smallBusiness?: boolean;
  demo?: boolean;
}): Blocker[] {
  const out: Blocker[] = [];
  const { kind, recipient: r, items } = input;
  if (input.companyMissing.length) out.push({ text: `In den Firmendaten fehlt: ${input.companyMissing.join(", ")}.`, href: "/einstellungen" });
  if (!r?.name?.trim()) out.push({ text: "Empfänger fehlt.", field: "recipientName" });
  else if (kind === "rechnung" && !input.demo && (!r.street?.trim() || !r.zip?.trim() || !r.city?.trim())) {
    const field = !r.street?.trim() ? "recipientStreet" : !r.zip?.trim() ? "recipientZip" : "recipientCity";
    out.push({ text: "Die vollständige Anschrift des Empfängers fehlt (Straße, PLZ, Ort; Pflichtangabe nach § 14 Abs. 4 UStG).", field });
  }
  if (!items.length) out.push({ text: "Mindestens eine Position anlegen." });
  items.forEach((it, i) => {
    if (!it.description.trim()) out.push({ text: `Position ${i + 1} braucht eine Beschreibung.`, field: `items.${i}.description` });
    else if (kind !== "storno" && it.unitPriceCents === 0) out.push({ text: `Position ${i + 1} hat noch keinen Preis.`, field: `items.${i}.price` });
  });
  if (kind === "rechnung" && items.length && calcTotals(items, input.smallBusiness).grossCents <= 0) out.push({ text: "Der Rechnungsbetrag muss größer als 0 sein." });
  if (kind === "rechnung" && input.serviceFrom && input.serviceTo && input.serviceFrom > input.serviceTo)
    out.push({ text: "Leistungszeitraum: Beginn liegt nach dem Ende.", field: "serviceTo" });
  return out;
}

export function validIban(iban: string): boolean {
  const s = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const re = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const ch of re) {
    const v = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

// ------------------------------------------------------------------
// Zeiträume
// ------------------------------------------------------------------
export type PeriodKind = "monat" | "quartal" | "jahr";

/** Zeitraum aus Art + Bezugsmonat (YYYY-MM). */
export function periodRange(kind: PeriodKind, ym: string): { from: string; to: string; label: string; months: string[] } {
  const [y, m] = ym.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  if (kind === "jahr") {
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Jahr ${y}`, months: Array.from({ length: 12 }, (_, i) => `${y}-${pad(i + 1)}`) };
  }
  if (kind === "quartal") {
    const q = Math.floor((m - 1) / 3);
    const first = q * 3 + 1;
    return {
      from: `${y}-${pad(first)}-01`,
      to: `${y}-${pad(first + 2)}-${lastDay(y, first + 2)}`,
      label: `${q + 1}. Quartal ${y}`,
      months: [0, 1, 2].map((i) => `${y}-${pad(first + i)}`),
    };
  }
  return { from: `${ym}-01`, to: `${ym}-${lastDay(y, m)}`, label: "", months: [ym] };
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export const isoToDe = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

/** Geld für Texte/PDF ohne Intl-Abhängigkeit (Seed läuft ohne Next). */
export function eurText(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "−" : ""}${euros},${String(abs % 100).padStart(2, "0")} €`;
}

/** Menge deutsch ohne überflüssige Nachkommastellen. */
export const qtyText = (q: number) => (Number.isInteger(q) ? String(q) : q.toLocaleString("de-DE", { maximumFractionDigits: 3 }));

// Mehrzahl der Einheiten für Texte und PDF (die E-Rechnung nutzt weiter die Einheitencodes)
const UNIT_PLURAL: Record<string, string> = { Monat: "Monate", Tag: "Tage", Stunde: "Stunden" };

/** Menge mit Einheit in der passenden Zahl: "1 Monat", "3 Monate", "0,5 Stunden"; Stück, Pauschal und km bleiben. */
export function unitText(qty: number, unit: string): string {
  return `${qtyText(qty)} ${Math.abs(qty) === 1 ? unit : (UNIT_PLURAL[unit] ?? unit)}`;
}

/** Zahl mit Wort in Einzahl oder Mehrzahl: plural(1, "Rechnung", "Rechnungen") → "1 Rechnung". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ------------------------------------------------------------------
// DATEV-Export (Buchungsstapel EXTF) und CSV-Journale
// ------------------------------------------------------------------
export type DatevSettings = {
  beraterNr: string;
  mandantNr: string;
  sachkontenlaenge: number;
  kontenrahmen: "03" | "04";
  erloes19: string;
  erloes7: string;
  erloes0: string;
  erloesKlein: string;
  debitorStart: number;
  kreditor: string;
  bank: string;
  buVorsteuer19: string;
  buVorsteuer7: string;
  buReverseCharge: string;
  aufwand: Record<string, string>;
};

/**
 * Vorschlag für SKR03. Kontenzuordnung und Steuerschlüssel sind keine Beratung: vor dem ersten Import
 * mit der Steuerberatung abstimmen (siehe Export-Seite).
 */
export const DATEV_DEFAULTS: DatevSettings = {
  beraterNr: "",
  mandantNr: "",
  sachkontenlaenge: 4,
  kontenrahmen: "03",
  erloes19: "8400",
  erloes7: "8300",
  erloes0: "8200",
  erloesKlein: "8195",
  debitorStart: 10000,
  kreditor: "70000",
  bank: "1200",
  buVorsteuer19: "9",
  buVorsteuer7: "8",
  buReverseCharge: "",
  aufwand: {
    technik: "4985",
    software: "4806",
    werbung: "4600",
    fahrt: "4673",
    musik: "4964",
    buero: "4930",
    bewirtung: "4650",
    fremdleistung: "3100",
    sonstiges: "4900",
  },
};

export type JournalInvoice = {
  id: number;
  kind: DocKind;
  number: string;
  issueDate: string;
  clientId: number | null;
  partner: string;
  title: string;
  netCents: number;
  taxCents: number;
  grossCents: number;
  groups: TaxGroup[];
  status: string;
  paidAt: string | null;
};

export type JournalExpense = {
  id: number;
  date: string;
  supplier: string;
  description: string;
  category: string;
  netCents: number;
  taxRate: number;
  taxCents: number;
  grossCents: number;
  reverseCharge: boolean;
  paidOn: string | null;
  supplierInvoiceNo: string | null;
  hasReceipt: boolean;
};

export const expenseDocNo = (id: number) => `BEL-${String(id).padStart(5, "0")}`;

const dq = (s: string) => `"${s.replace(/"/g, '""')}"`;
const dec = (cents: number) => (Math.abs(cents) / 100).toFixed(2).replace(".", ",");
const ttmm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
const ymd = (iso: string) => iso.replace(/-/g, "");

/** Spalten 1 bis 20 des DATEV-Buchungsstapels (Reihenfolge laut Spezifikation, Rest bleibt leer). */
export const EXTF_COLUMNS = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
  "Beleglink",
];

export type ExtfRow = { umsatzCents: number; sh: "S" | "H"; konto: string; gegenkonto: string; bu: string; date: string; beleg1: string; beleg2?: string; text: string };

export function extfRows(invoices: JournalInvoice[], expenses: JournalExpense[], s: DatevSettings, smallBusiness: boolean): ExtfRow[] {
  const rows: ExtfRow[] = [];
  for (const inv of invoices) {
    if (inv.kind === "angebot") continue;
    const debitor = String(s.debitorStart + (inv.clientId ?? 0));
    for (const g of inv.groups) {
      const erloes = smallBusiness ? s.erloesKlein : g.rate === 19 ? s.erloes19 : g.rate === 7 ? s.erloes7 : s.erloes0;
      const gross = g.netCents + g.taxCents;
      // Ausgangsrechnung: Debitor an Erlös (Automatikkonto rechnet die Umsatzsteuer heraus); Storno umgekehrt
      rows.push({
        umsatzCents: Math.abs(gross),
        sh: gross >= 0 ? "S" : "H",
        konto: debitor,
        gegenkonto: erloes,
        bu: "",
        date: inv.issueDate,
        beleg1: inv.number,
        text: `${inv.partner}`.slice(0, 60),
      });
    }
  }
  for (const e of expenses) {
    const aufwand = s.aufwand[e.category] ?? s.aufwand.sonstiges ?? "4900";
    const bu = smallBusiness ? "" : e.reverseCharge ? s.buReverseCharge : e.taxRate === 19 ? s.buVorsteuer19 : e.taxRate === 7 ? s.buVorsteuer7 : "";
    rows.push({
      umsatzCents: e.grossCents,
      sh: "S",
      konto: aufwand,
      gegenkonto: e.paidOn ? s.bank : s.kreditor,
      bu,
      date: e.date,
      beleg1: expenseDocNo(e.id),
      beleg2: e.supplierInvoiceNo ?? undefined,
      text: `${e.supplier} ${e.description}`.slice(0, 60),
    });
  }
  return rows;
}

export function buildExtf(opts: {
  rows: ExtfRow[];
  settings: DatevSettings;
  from: string;
  to: string;
  label: string;
  createdAt: Date;
  user: string;
}): string {
  const { settings: s } = opts;
  const c = opts.createdAt;
  const stamp =
    `${c.getUTCFullYear()}${String(c.getUTCMonth() + 1).padStart(2, "0")}${String(c.getUTCDate()).padStart(2, "0")}` +
    `${String(c.getUTCHours()).padStart(2, "0")}${String(c.getUTCMinutes()).padStart(2, "0")}${String(c.getUTCSeconds()).padStart(2, "0")}${String(c.getUTCMilliseconds()).padStart(3, "0")}`;
  const header = [
    dq("EXTF"), "700", "21", dq("Buchungsstapel"), "13", stamp, "", dq("RE"), dq(opts.user.slice(0, 25)), "",
    s.beraterNr || "", s.mandantNr || "", `${opts.from.slice(0, 4)}0101`, String(s.sachkontenlaenge), ymd(opts.from), ymd(opts.to),
    dq(opts.label.slice(0, 30)), dq("SC"), "1", "0", "0", dq("EUR"), "", dq(""), "", "", dq(s.kontenrahmen), "", "", dq(""), dq(""),
  ].join(";");
  const cols = EXTF_COLUMNS.map(dq).join(";");
  const lines = opts.rows.map((r) =>
    [
      dec(r.umsatzCents), dq(r.sh), dq("EUR"), "", "", "", r.konto, r.gegenkonto, r.bu ? dq(r.bu) : "", ttmm(r.date),
      dq(r.beleg1.slice(0, 36)), dq((r.beleg2 ?? "").slice(0, 12)), "", dq(r.text), "", "", "", "", "", "",
    ].join(";"),
  );
  return [header, cols, ...lines].join("\r\n") + "\r\n";
}

/** Einfaches Journal (UTF-8 mit BOM, Semikolon) für Tabellenprogramme und die Steuerberatung. */
export function buildJournalCsv(invoices: JournalInvoice[], expenses: JournalExpense[]): string {
  const head = ["Datum", "Belegnummer", "Art", "Geschäftspartner", "Beschreibung", "Netto", "Steuersatz", "Steuer", "Brutto", "§ 13b", "Bezahlt am", "Beleg"];
  const rows: string[][] = [];
  for (const i of invoices) {
    const rates = i.groups.map((g) => `${g.rate} %`).join(" / ");
    rows.push([isoToDe(i.issueDate), i.number, KIND_LABEL[i.kind], i.partner, i.title, money(i.netCents), rates, money(i.taxCents), money(i.grossCents), "", isoToDe(i.paidAt), `${i.number}.pdf`]);
  }
  for (const e of expenses) {
    rows.push([
      isoToDe(e.date), expenseDocNo(e.id), "Ausgabe", e.supplier, e.description, money(-e.netCents), `${e.taxRate} %`, money(-e.taxCents), money(-e.grossCents),
      e.reverseCharge ? "ja" : "", isoToDe(e.paidOn), e.hasReceipt ? expenseDocNo(e.id) : "fehlt",
    ]);
  }
  rows.sort((a, b) => a[0].split(".").reverse().join("").localeCompare(b[0].split(".").reverse().join("")));
  return "﻿" + [head, ...rows].map((r) => r.map((v) => dq(v)).join(";")).join("\r\n") + "\r\n";
}

const money = (cents: number) => (cents < 0 ? "-" : "") + dec(cents);

/** Windows-1252 (ANSI), wie DATEV-Importe es üblicherweise erwarten. Unbekannte Zeichen werden zu "?". */
export function toCp1252(text: string): Uint8Array {
  const special: Record<string, number> = {
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c,
    "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b,
    "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f, "−": 0x2d,
  };
  const out = new Uint8Array(text.length);
  let i = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    out[i++] = code < 0x80 || (code >= 0xa0 && code <= 0xff) ? code : (special[ch] ?? 0x3f);
  }
  return out.slice(0, i);
}

/** Dateiendung für Belege im ZIP */
export function extFor(mime: string, name: string): string {
  const fromName = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (fromName && fromName.length <= 5) return fromName;
  return ({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/xml": "xml", "text/xml": "xml" } as Record<string, string>)[mime] ?? "bin";
}
