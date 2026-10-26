// Demo-Anfragen für Anfragen und Pipeline. Alle Betriebe, Personen und Nummern sind ERFUNDEN
// (Telefonnummern 0170 000…, E-Mails @example.de) und gehören zu den Demo-Daten der Vorschau.
// Echte Kunden bekommen hier keine Rechtsform oder Vertragsdaten: die trägt das Team ein, wenn sie belegt sind.
import { addDays, subDays } from "date-fns";
import * as s from "../../src/db/schema";
import { todayIso } from "../../src/lib/time";
import type { SeedPart } from "../seed";

const seed: SeedPart = async (db, { today }) => {
  const d = (x: Date) => todayIso(x);
  const rows: (typeof s.leads.$inferInsert)[] = [
    {
      name: "Jonas Möller",
      company: "Ostsee Ferienwohnungen Möller",
      branche: "unternehmen",
      ort: "Timmendorfer Strand",
      phone: "0170 0000001",
      email: "jonas@example.de",
      contactWay: "anruf",
      source: "website",
      packageInterest: "12",
      startWish: "sofort",
      stage: "kontaktiert",
      score: "A",
      nextStep: "Angebot für 12 Videos schicken",
      nextStepAt: d(subDays(today, 1)),
      message: "Wir möchten vor der Saison 2027 sichtbarer werden, vor allem auf Instagram.",
      answers: {
        Branche: "Unternehmen",
        Ziel: "Mehr Gäste oder Kunden",
        Paket: "12 Videos im Monat",
        Zusätzlich: "Werbeanzeigen",
        Start: "So bald wie möglich",
        Region: "Lübeck und Lübecker Bucht",
        "Gewünschter Kontakt": "Anruf",
      },
      createdAt: subDays(today, 3),
    },
    {
      name: "Hanna Lüth",
      company: "Bäckerei Lüth",
      branche: "gastronomie",
      ort: "Kiel-Gaarden",
      phone: "0170 0000002",
      contactWay: "whatsapp",
      source: "website",
      packageInterest: "4",
      startWish: "1-3",
      stage: "neu",
      score: "B",
      nextStep: "Innerhalb der zugesagten Antwortzeit melden",
      nextStepAt: d(addDays(today, 1)),
      answers: {
        Branche: "Gastronomie",
        Ziel: "Mitarbeitende finden",
        Paket: "4 Videos im Monat",
        Zusätzlich: "Recruiting-Videos",
        Start: "In 1 bis 3 Monaten",
        Region: "Kiel und Umgebung",
        "Gewünschter Kontakt": "WhatsApp",
      },
      createdAt: subDays(today, 0),
    },
    {
      name: "Dr. Selin Arslan",
      company: "Zahnarztpraxis am Hafen",
      branche: "andere",
      ort: "Kiel",
      email: "praxis@example.de",
      contactWay: "mail",
      source: "instagram",
      packageInterest: "unsicher",
      startWish: "spaeter",
      stage: "neu",
      score: "C",
      nextStep: "Infos und Beispielvideos schicken",
      nextStepAt: d(addDays(today, 2)),
      message: "Per Instagram-Nachricht: Was kostet so etwas ungefähr?",
      createdAt: subDays(today, 1),
    },
    {
      name: "Timo Brodersen",
      company: "Tischlerei Brodersen",
      branche: "handwerk",
      ort: "Plön",
      phone: "0170 0000003",
      email: "info@example.de",
      contactWay: "anruf",
      source: "empfehlung",
      packageInterest: "8",
      startWish: "1-3",
      stage: "angebot",
      score: "B",
      nextStep: "Nachfassen zum Angebot",
      nextStepAt: d(addDays(today, 4)),
      notes: "Empfehlung über einen bestehenden Kunden. Interessiert an Azubi-Videos.",
      createdAt: subDays(today, 12),
    },
    {
      name: "Lea Kruse",
      company: "Surfschule Kruse",
      branche: "unternehmen",
      ort: "Scharbeutz",
      phone: "0170 0000004",
      contactWay: "whatsapp",
      source: "telefon",
      packageInterest: "4",
      startWish: "spaeter",
      stage: "verloren",
      score: "C",
      lostReason: "Saisonbetrieb, will im Februar noch einmal sprechen.",
      createdAt: subDays(today, 30),
    },
  ];
  await db.insert(s.leads).values(rows);
  return `${rows.length} weitere Demo-Anfragen`;
};

export default seed;
