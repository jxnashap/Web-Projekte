// Demo-Finanzen (alles Beispielwerte, in der App als Demo markiert): festgeschriebene Rechnungen über
// dieselbe Logik wie die App (Nummern, PDF/ZUGFeRD, Hash, Ablage), Angebote, Belege mit Demo-Kassenbon.
//
// Technik: tsx lädt den Seed als CommonJS, react-pdf ist reines ESM. Deshalb bündelt esbuild
// src/lib/finanzen/seed-entry.ts einmalig als ESM nach .data/build/ ("server-only" wird dabei leer ersetzt)
// und der Seed reicht seine Datenbank über globalThis.__scmDb an getDb() weiter.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import * as s from "../../src/db/schema";
import { addDaysIso, fromNet, partyFromClient, splitGross } from "../../src/lib/finanzen/core";
import { monthLabel } from "../../src/lib/format";
import { monthRange, todayIso as isoOf } from "../../src/lib/time";
import type { SeedPart } from "../seed";

type Workflow = typeof import("../../src/lib/finanzen/seed-entry");

async function loadWorkflow(): Promise<Workflow> {
  const root = process.cwd();
  const outfile = path.join(root, ".data", "build", "finanzen-seed.mjs");
  const esbuild = await import("esbuild");
  await esbuild.build({
    entryPoints: [path.join(root, "src", "lib", "finanzen", "seed-entry.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    outfile,
    packages: "external",
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    logLevel: "error",
    plugins: [
      {
        name: "server-only-leer",
        setup(b) {
          b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "leer" }));
          b.onLoad({ filter: /.*/, namespace: "leer" }, () => ({ contents: "export {};", loader: "js" }));
        },
      },
    ],
  });
  return (await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)) as Workflow;
}

export default (async (db, ctx) => {
  const { clients: c, today, month, prevMonth } = ctx;
  const prev = monthRange(prevMonth);
  const cur = monthRange(month);
  const todayIso = isoOf(today);
  const day = (iso: string, d: number) => (iso.slice(0, 8) + String(d).padStart(2, "0")) as string;
  const oskar = ctx.team[0].id;

  // Firmen-IBAN ist echt noch leer: für die Demo eine offensichtliche Test-IBAN, damit Rechnungen festgeschrieben werden können
  const [companyRow] = await db.select().from(s.settings).where(eq(s.settings.key, "company"));
  const company = { ...(companyRow?.value as Record<string, unknown>), iban: "DE02120300000000202051", bic: "", bankName: "Test-IBAN (Demo, vor dem Livegang ersetzen)" };
  await db.update(s.settings).set({ value: company }).where(eq(s.settings.key, "company"));
  await db.insert(s.settings).values({ key: "demo:finanzen", value: { testIban: true, hinweis: "IBAN in den Firmendaten ist eine Beispiel-IBAN" } });

  // ---------------- Rechnungs- und Angebotsentwürfe ----------------
  const pkg = (cl: s.Client, m: string) => ({
    description: `Social-Media-Paket ${cl.packageVideos} Videos, ${monthLabel(m)}: Konzept, Dreh, Schnitt, Untertitel`,
    quantity: 1,
    unit: "Monat",
    unitPriceCents: cl.packagePriceCents ?? 90000,
    taxRate: 19,
  });
  type Draft = { kind: "rechnung" | "angebot"; client: s.Client | null; recipient?: s.Party; title: string; issueDate: string; from?: string; to?: string; items: ReturnType<typeof pkg>[]; intro?: string; outro?: string; validUntil?: string };
  const intro = "Vielen Dank für die Zusammenarbeit. Wir berechnen euch folgende Leistungen:";
  const outro = "Fragen zur Rechnung? Meldet euch einfach bei uns.";
  const drafts: Draft[] = [
    { kind: "rechnung", client: c.bs, title: "Social-Media-Paket", issueDate: prev.to, from: prev.from, to: prev.to, items: [pkg(c.bs, prevMonth)], intro, outro },
    { kind: "rechnung", client: c.jhkp, title: "Social-Media-Paket", issueDate: prev.to, from: prev.from, to: prev.to, items: [pkg(c.jhkp, prevMonth)], intro, outro },
    { kind: "rechnung", client: c.maler, title: "Social-Media-Paket", issueDate: prev.to, from: prev.from, to: prev.to, items: [pkg(c.maler, prevMonth)], intro, outro },
    { kind: "rechnung", client: c.steak, title: "Social-Media-Paket", issueDate: day(cur.from, 15), from: cur.from, to: cur.to, items: [pkg(c.steak, month)], intro, outro },
    {
      kind: "rechnung", client: c.kletter, title: "Social-Media-Paket und Eventdreh", issueDate: day(cur.from, 20), from: cur.from, to: cur.to, intro, outro,
      items: [pkg(c.kletter, month), { description: "Zusätzlicher Drehtag Halloween-Event (halber Tag)", quantity: 1, unit: "Pauschal", unitPriceCents: 25000, taxRate: 19 }],
    },
    {
      kind: "angebot", client: c.drei, title: "Social-Media-Paket ab November", issueDate: day(cur.from, 10), validUntil: addDaysIso(day(cur.from, 10), 30),
      intro: "Nach unseren Testvideos schlagen wir euch dieses Paket vor:",
      outro: "Wir freuen uns auf eure Rückmeldung.",
      items: [
        { description: "Social-Media-Paket 8 Videos pro Monat: Konzept, Dreh, Schnitt, Untertitel", quantity: 3, unit: "Monat", unitPriceCents: 160000, taxRate: 19 },
      ],
    },
    {
      kind: "angebot", client: null, recipient: { name: "Wendt Dachbau", contact: "Tobias Wendt", city: "Neumünster", country: "DE" }, title: "Social-Media-Paket",
      issueDate: todayIso, intro: "Wie besprochen, hier unser Vorschlag für den Start:", outro: "Das Angebot ist unverbindlich. Wir freuen uns auf euch!",
      items: [
        { description: "Social-Media-Paket 4 Videos pro Monat: Konzept, Dreh, Schnitt, Untertitel", quantity: 3, unit: "Monat", unitPriceCents: 90000, taxRate: 19 },
        { description: "Einrichtung und Profil-Check Instagram", quantity: 1, unit: "Pauschal", unitPriceCents: 15000, taxRate: 19 },
      ],
    },
  ];
  const ids: number[] = [];
  for (const d of drafts) {
    const [inv] = await db
      .insert(s.invoices)
      .values({
        kind: d.kind,
        status: "entwurf",
        clientId: d.client?.id ?? null,
        recipient: d.recipient ?? (d.client ? partyFromClient(d.client) : null),
        title: d.title,
        issueDate: d.issueDate,
        serviceFrom: d.from ?? null,
        serviceTo: d.to ?? null,
        validUntil: d.validUntil ?? null,
        intro: d.intro ?? null,
        outro: d.outro ?? null,
        notes: "Demo-Beleg (Seed)",
      })
      .returning();
    await db.insert(s.invoiceItems).values(d.items.map((it, i) => ({ ...it, invoiceId: inv.id, position: i + 1 })));
    ids.push(inv.id);
  }

  // ---------------- Festschreiben mit der App-Logik ----------------
  const wf = await loadWorkflow();
  (globalThis as unknown as { __scmDb?: Promise<unknown> }).__scmDb = Promise.resolve(db);
  const [reBs, reJhkp, reMaler, reSteak, reKletter, anDrei] = ids;
  // demo: die echten Kunden haben in der Vorschau keine vollständige Anschrift; in der App ist sie Pflicht
  for (const id of [reBs, reJhkp, reMaler, reSteak, reKletter, anDrei]) await wf.finalizeInvoice(db, id, oskar, { demo: true });
  await db.update(s.invoices).set({ status: "bezahlt", paidAt: day(cur.from, 8), sentAt: new Date(`${prev.to}T10:00:00Z`) }).where(eq(s.invoices.id, reBs));
  await db.update(s.invoices).set({ status: "bezahlt", paidAt: day(cur.from, 12), sentAt: new Date(`${prev.to}T10:00:00Z`) }).where(eq(s.invoices.id, reJhkp));
  await db.update(s.invoices).set({ sentAt: new Date(`${prev.to}T10:00:00Z`) }).where(eq(s.invoices.id, reMaler));
  await db.update(s.invoices).set({ status: "angenommen" }).where(eq(s.invoices.id, anDrei));

  // ---------------- Belege ----------------
  const receipt = await wf.demoReceiptPdf({ shop: "Tankstelle Kiel (Demo)", date: day(cur.from, 14), rate: 19, lines: [["Super E10 25,31 l", 4280]] });
  const receiptFile = await wf.putFile({ bucket: "belege", name: "Demo-Kassenbon.pdf", mime: "application/pdf", data: receipt, userId: oskar });
  const net = (cents: number, rate: number) => fromNet(cents, rate);
  const gross = (cents: number, rate: number) => splitGross(cents, rate);
  const expenses: (typeof s.expenses.$inferInsert)[] = [
    { date: day(cur.from, 3), supplier: "Meta Platforms Ireland Ltd.", description: "Werbeanzeigen Kletterwald (Boost Halloween)", category: "werbung", taxRate: 19,
      netCents: 15000, taxCents: 0, grossCents: 15000, reverseCharge: true, paymentMethod: "karte", paidOn: day(cur.from, 3), clientId: c.kletter.id,
      supplierInvoiceNo: "FBADS-DEMO-001", notes: "Demo: Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)" },
    { date: day(cur.from, 5), supplier: "Schnittsoftware-Abo (Demo)", description: "Monatsabo Videoschnitt", category: "software", taxRate: 19,
      ...net(5999, 19), reverseCharge: false, paymentMethod: "karte", paidOn: day(cur.from, 5), supplierInvoiceNo: "SW-2026-10" },
    { date: day(cur.from, 14), supplier: "Tankstelle Kiel (Demo)", description: "Tanken Fahrt zum Dreh", category: "fahrt", taxRate: 19,
      ...gross(4280, 19), reverseCharge: false, paymentMethod: "karte", paidOn: day(cur.from, 14), fileId: receiptFile.id, receiptName: "Demo-Kassenbon.pdf" },
    { date: day(cur.from, 18), supplier: "Musiklizenz-Abo (Demo)", description: "Lizenzmusik für Reels", category: "musik", taxRate: 19,
      ...net(1260, 19), reverseCharge: false, paymentMethod: "paypal", paidOn: day(cur.from, 18) },
    { date: day(prev.from, 12), supplier: "Kamera-Shop Kiel (Demo)", description: "Funkmikrofon-Set", category: "technik", taxRate: 19,
      ...net(18900, 19), reverseCharge: false, paymentMethod: "ueberweisung", paidOn: day(prev.from, 14), supplierInvoiceNo: "KS-48211" },
    { date: day(prev.from, 22), supplier: "Buchhandlung (Demo)", description: "Fachbuch Kurzvideo-Marketing", category: "buero", taxRate: 7,
      ...gross(2490, 7), reverseCharge: false, paymentMethod: "bar", paidOn: day(prev.from, 22) },
    { date: day(prev.from, 3), supplier: "Meta Platforms Ireland Ltd.", description: "Werbeanzeigen BS Immobiliengruppe", category: "werbung", taxRate: 19,
      netCents: 20000, taxCents: 0, grossCents: 20000, reverseCharge: true, paymentMethod: "karte", paidOn: day(prev.from, 3), clientId: c.bs.id, supplierInvoiceNo: "FBADS-DEMO-000" },
  ];
  await db.insert(s.expenses).values(expenses.map((e) => ({ ...e, createdBy: oskar })));
  return `${ids.length} Belege (5 Rechnungen festgeschrieben, 2 Angebote), ${expenses.length} Ausgaben`;
}) satisfies SeedPart;
