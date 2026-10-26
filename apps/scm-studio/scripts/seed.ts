// Demo-Daten für die lokale Vorschau. Echte Kunden und Reels von SCM (Stand Instagram 20.10.2026),
// Paketgrößen, Preise, Aufrufe und Finanzzahlen sind DEMO-WERTE und in der App als Demo markiert.
// Aufruf: npm run seed   (leert die lokale Datenbank vorher)
// Aufbau: hier die Grunddaten (Team, Kunden, Anfragen, Videos, Termine), danach laufen alle Dateien
// aus scripts/seed-parts/ in alphabetischer Reihenfolge (je Bereich eine Datei, z. B. 30-finanzen.ts).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { addDays } from "date-fns";
import { sql } from "drizzle-orm";
import { connect } from "../src/db/connect";
import * as s from "../src/db/schema";
import { berlinDateTime, monthIso, shiftMonth, todayIso } from "../src/lib/time";

const d = (x: Date) => todayIso(x);
/** Termin in Berliner Ortszeit */
const at = (day: Date, hh: number, mm = 0) => berlinDateTime(todayIso(day), `${hh}:${mm}`);

async function main() {
  const db = await connect();
  const today = new Date();
  const month = monthIso(today);
  const prevMonth = shiftMonth(month, -1);

  await db.execute(sql`TRUNCATE studio.audit_log, studio.settings, studio.documents, studio.expenses, studio.number_sequences,
    studio.invoice_items, studio.invoices, studio.video_metrics, studio.social_accounts, studio.events, studio.scripts,
    studio.videos, studio.leads, studio.clients, studio.team_members, studio.files, studio.ai_runs RESTART IDENTITY CASCADE`);
  // lokale Dateiablage leeren (nur Vorschau)
  fs.rmSync(process.env.FILES_DIR ?? path.join(process.cwd(), ".data", "files"), { recursive: true, force: true });

  // ---------------- Team ----------------
  const team = await db
    .insert(s.teamMembers)
    .values([
      // E-Mail-Adressen sind Platzhalter (.example), die echten Team-Adressen trägt ihr beim Livegang ein
      { name: "Oskar von Esebeck", email: "oskar@scm-creatives.example", role: "admin", initials: "OE" },
      { name: "Yannick Ruch", email: "yannick@scm-creatives.example", role: "admin", initials: "YR" },
      { name: "Andreas Mattolat", email: "andreas@scm-creatives.example", role: "admin", initials: "AM" },
    ])
    .returning();

  // ---------------- Einstellungen ----------------
  await db.insert(s.settings).values([
    { key: "demo", value: true },
    {
      key: "company",
      value: {
        brand: "SCM Creatives",
        legalName: "Blacksnapper Consulting",
        owner: "Andreas Mattolat",
        street: "Hüttenweg 4",
        zip: "21516",
        city: "Tramm",
        country: "DE",
        vatId: "DE265142237",
        taxNumber: "",
        email: "scm.creatives@gmx.de",
        phone: "0172 5361079",
        web: "scm-creatives.de",
        bankName: "",
        iban: "",
        bic: "",
        paymentDays: 14,
        smallBusiness: false,
      },
    },
  ]);

  // ---------------- Kunden ----------------
  const clients = await db
    .insert(s.clients)
    .values([
      { name: "BS Immobiliengruppe", branche: "immobilien", ort: "Kiel", city: "Kiel", contactName: "Marc und Leon",
        instagram: "bs.immobiliengruppe", packageVideos: 8, packagePriceCents: 160000, startDate: "2026-09-01", color: "#1F4E79",
        notes: "Ortsanalyse-Serie und Entweder-oder. KI-Hinweis bei zwei Videos wie im Original." },
      { name: "Jens Rohwer Malermeister", branche: "handwerk", ort: "Kiel", street: "Goethestraße 8", city: "Kiel",
        contactName: "Jens Rohwer", website: "https://www.maler-rohwer.de", instagram: "maler.rohwer", packageVideos: 4,
        packagePriceCents: 90000, startDate: "2026-09-15", color: "#B5651D", notes: "Baustellen-Humor, Azubi-Serie geplant." },
      { name: "Jan & Hein & Klaas & Pit", branche: "gastronomie", ort: "Kiel", city: "Kiel", instagram: "janheinklaaspit",
        packageVideos: 8, packagePriceCents: 160000, startDate: "2026-08-01", color: "#2E7D32", notes: "Mittagstisch-Sketche." },
      { name: "Das kleine Steakhouse", branche: "gastronomie", ort: "Kiel", street: "Kirchhofallee", city: "Kiel",
        instagram: "das_kleine_steakhouse", packageVideos: 4, packagePriceCents: 90000, startDate: "2026-09-01", color: "#8E2A1C",
        notes: "Tisch-Sketche, Studenten-Mittwoch." },
      { name: "Kletterwald Travemünde", branche: "unternehmen", ort: "Lübeck-Travemünde", city: "Lübeck",
        instagram: "kletterwaldtravemuende", packageVideos: 4, packagePriceCents: 90000, startDate: "2026-09-01", color: "#3E7C59",
        notes: "Saisonbetrieb, Angebots-Ansagen mit Frist." },
      { name: "Weinbar „Die Drei“", branche: "gastronomie", ort: "Kiel", city: "Kiel", status: "test", color: "#6D2E46",
        notes: "Testvideos in Arbeit." },
    ])
    .returning();
  const [bs, maler, jhkp, steak, kletter, drei] = clients;

  // ---------------- Anfragen ----------------
  await db.insert(s.leads).values([
    { name: "Svenja Paulsen", company: "Café Hafenblick", branche: "gastronomie", ort: "Eckernförde", phone: "0151 0000000",
      contactWay: "whatsapp", source: "website", packageInterest: "8", startWish: "sofort", stage: "neu", score: "A",
      nextStep: "Heute zurückrufen", nextStepAt: d(today), message: "Wir wollen im Winter mehr Gäste am Wochenende.",
      answers: { branche: "Gastronomie", ziel: "Mehr Gäste", start: "Sofort", paket: "8 Videos" } },
    { name: "Tobias Wendt", company: "Wendt Dachbau", branche: "handwerk", ort: "Neumünster", email: "info@example.de",
      contactWay: "mail", source: "instagram", packageInterest: "unsicher", stage: "kennenlernen", score: "B",
      nextStep: "Kennenlerngespräch", nextStepAt: d(addDays(today, 2)) },
    { name: "Mira Hansen", company: "Hansen Immobilien", branche: "immobilien", ort: "Plön", contactWay: "anruf",
      source: "empfehlung", packageInterest: "4", stage: "testvideos", score: "B", nextStep: "Testvideos drehen",
      nextStepAt: d(addDays(today, 5)) },
    { name: "Kai Petersen", company: "Fitnessstudio Nordform", branche: "unternehmen", ort: "Kiel", contactWay: "mail",
      source: "website", packageInterest: "unsicher", stage: "kontaktiert", score: "C" },
    { name: "Lena Brandt", company: "Strandkiosk Scharbeutz", branche: "gastronomie", ort: "Scharbeutz", stage: "verloren",
      source: "website", notes: "Saison vorbei, im März wieder melden.", lostReason: "Saison vorbei, kein Budget bis März" },
  ]);

  // ---------------- Videos (die 6 echten Reels + Planung) ----------------
  const real = await db
    .insert(s.videos)
    .values([
      { clientId: maler.id, title: "Also mein Nachbar hätte das anders gemacht", format: "Kunden-Sketch", status: "online",
        month, postDate: "2026-10-20", url: "https://www.instagram.com/reel/DeuGwFgs_PK/", assignee: team[0].id },
      { clientId: jhkp.id, title: "Gespräche für guten Mittagstisch opfern", format: "POV-Sketch", status: "online", month,
        postDate: "2026-10-20", url: "https://www.instagram.com/reel/DetkcAvpH3H/", assignee: team[1].id },
      { clientId: steak.id, title: "Freundschaft endet bei meinen Pommes", format: "Tisch-Sketch", status: "online", month,
        postDate: "2026-10-20", url: "https://www.instagram.com/reel/Det_06XPmbX/", assignee: team[0].id },
      { clientId: bs.id, title: "Entweder oder: Makler-Edition", format: "Entweder oder", status: "online", month,
        postDate: "2026-10-20", url: "https://www.instagram.com/reel/DeuM70KtRNq/", assignee: team[1].id },
      { clientId: kletter.id, title: "Klassenausflug im Kletterwald", format: "Angebot mit Frist", status: "online", month,
        postDate: "2026-10-19", url: "https://www.instagram.com/reel/DerbG9WBf2C/", assignee: team[0].id },
      { clientId: bs.id, title: "Drei Orte rund um Kiel im Check", format: "Ortsanalyse", status: "online", month,
        postDate: "2026-10-18", url: "https://www.instagram.com/reel/DepDiWkN88H/", assignee: team[1].id },
    ])
    .returning();

  const plan = (clientId: number, title: string, format: string, status: string, shootIn?: number, m = month) => ({
    clientId, title, format, status, month: m, shootDate: shootIn !== undefined ? d(addDays(today, shootIn)) : null,
  });
  await db.insert(s.videos).values([
    plan(bs.id, "Ortsanalyse Teil 2: Preetz, Raisdorf, Flintbek", "Ortsanalyse", "dreh", 3),
    plan(bs.id, "Ein Tag im Büro", "Einblick", "skript", 3),
    plan(bs.id, "Besichtigung: Altbau in Kiel", "Objekt", "schnitt"),
    plan(maler.id, "Ein Tag als Azubi", "Recruiting", "skript", 6),
    plan(maler.id, "Farbtöne, die Kunden falsch aussprechen", "Kunden-Sketch", "idee"),
    plan(jhkp.id, "Wochenkarte als Wetterbericht", "Sketch", "dreh", 1),
    plan(jhkp.id, "Der Stammgast", "POV-Sketch", "fertig"),
    plan(jhkp.id, "Mittagspause in 15 Sekunden", "Speed-Format", "idee"),
    plan(steak.id, "Studenten-Mittwoch", "Angebot", "skript", 8),
    plan(kletter.id, "Halloween im Kletterwald", "Event", "fertig"),
    { ...plan(drei.id, "Testvideo 1: Der erste Schluck", "Sketch", "dreh", 4), isTest: true },
    { ...plan(drei.id, "Testvideo 2: Weinempfehlung in 10 Sekunden", "Tipp", "skript"), isTest: true },
    { ...plan(drei.id, "Testvideo 3: Feierabend in Kiel", "Stimmung", "idee"), isTest: true },
    plan(bs.id, "Ortsanalyse: Eckernförde", "Ortsanalyse", "online", undefined, prevMonth),
    plan(jhkp.id, "Mittagstisch-Sketch September", "Sketch", "online", undefined, prevMonth),
  ]);

  // ---------------- Zahlen (Likes/Kommentare echt, Aufrufe Demo) ----------------
  const stats: [number, number, number, number, number][] = [
    // [videoIndex, views, likes, comments, shares]
    [0, 18400, 209, 24, 61],
    [1, 6900, 63, 20, 14],
    [2, 4100, 43, 8, 9],
    [3, 2600, 36, 3, 4],
    [4, 3300, 37, 11, 7],
    [5, 3900, 47, 2, 6],
  ];
  for (const [i, views, likes, comments, shares] of stats) {
    const v = real[i];
    const post = new Date(v.postDate!);
    for (const [dayOffset, share] of [[1, 0.55], [3, 0.82], [6, 1]] as const) {
      const day = addDays(post, dayOffset);
      if (day > today) continue;
      await db.insert(s.videoMetrics).values({
        videoId: v.id, measuredOn: d(day), views: Math.round(views * share), likes: Math.round(likes * share),
        comments: Math.round(comments * share), shares: Math.round(shares * share), saves: Math.round(likes * 0.18 * share),
        reach: Math.round(views * 0.78 * share), avgWatchSeconds: 7 + (i % 4) * 2.5, source: "manuell",
      });
    }
  }

  // ---------------- Termine ----------------
  await db.insert(s.events).values([
    { title: "Dreh BS Immobiliengruppe", kind: "dreh", startsAt: at(addDays(today, 3), 9), endsAt: at(addDays(today, 3), 13),
      location: "Kiel, Büro BS", clientId: bs.id },
    { title: "Dreh Jan & Hein & Klaas & Pit", kind: "dreh", startsAt: at(addDays(today, 1), 10), endsAt: at(addDays(today, 1), 12),
      location: "Kiel", clientId: jhkp.id },
    { title: "Testvideos Weinbar „Die Drei“", kind: "dreh", startsAt: at(addDays(today, 4), 18), endsAt: at(addDays(today, 4), 20),
      location: "Kiel", clientId: drei.id },
    { title: "Kennenlernen Wendt Dachbau", kind: "gespraech", startsAt: at(addDays(today, 2), 15), endsAt: at(addDays(today, 2), 15, 45),
      location: "Telefon" },
    { title: "Monatsberichte verschicken", kind: "deadline", startsAt: berlinDateTime(`${shiftMonth(month, 1)}-01`, "09:00"),
      endsAt: berlinDateTime(`${shiftMonth(month, 1)}-01`, "10:00") },
    { title: "Dreh Maler Rohwer: Azubi-Tag", kind: "dreh", startsAt: at(addDays(today, 6), 7, 30), endsAt: at(addDays(today, 6), 11),
      location: "Baustelle Kiel", clientId: maler.id },
  ]);

  // ---------------- Skripte ----------------
  await db.insert(s.scripts).values({
    clientId: maler.id, title: "Also mein Nachbar hätte das anders gemacht", format: "Kunden-Sketch", status: "final",
    hook: "POV: Jeder Handwerker kennt diese Art von Kunden", source: "manuell",
    beats: [
      { tc: "00:00", label: "Einstieg", text: "Text im Bild: „POV: jeder Handwerker kennt diese Art von Kunden“." },
      { tc: "00:01", label: "Wiedererkennen", text: "Kunde: „Mein Nachbar hat das aber früher immer anders gemacht.“" },
      { tc: "00:09", label: "Steigerung", text: "Er hat noch Material im Schuppen gefunden. Kann man das gegenrechnen?" },
      { tc: "00:17", label: "Pointe", text: "Er will es sich lieber selbst beibringen, damit es nächstes Mal günstiger wird." },
    ],
    cta: "Was war der nervigste Spruch, den ihr euch auf der Baustelle anhören musstet?",
    caption: "Jeder Handwerker kennt EINEN … 😅 #Kiel #Handwerk #Malermeister",
    createdBy: team[0].id,
  });

  // ---------------- Bereiche (scripts/seed-parts/*.ts) ----------------
  const allVideos = await db.select().from(s.videos);
  const ctx: SeedCtx = {
    today, month, prevMonth, team, clients: { bs, maler, jhkp, steak, kletter, drei }, realVideos: real, videos: allVideos,
  };
  const dir = path.join(process.cwd(), "scripts", "seed-parts");
  const parts = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).sort() : [];
  for (const f of parts) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    const res = await (mod.default as SeedPart)(db, ctx);
    console.log(`  ${f}: ${res ?? "ok"}`);
  }

  console.log(`Demo-Daten angelegt: ${clients.length} Kunden, ${real.length} echte Reels, Team ${team.length}, ${parts.length} Bereiche.`);
  process.exit(0);
}

export type SeedCtx = {
  today: Date;
  month: string;
  prevMonth: string;
  team: s.TeamMember[];
  clients: Record<"bs" | "maler" | "jhkp" | "steak" | "kletter" | "drei", s.Client>;
  realVideos: s.Video[];
  videos: s.Video[];
};
export type SeedPart = (db: Awaited<ReturnType<typeof connect>>, ctx: SeedCtx) => Promise<string | void>;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
