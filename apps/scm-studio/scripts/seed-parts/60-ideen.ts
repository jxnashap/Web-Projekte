// Demo-Daten Ideen: eigene Video-Ideen des Teams, eine davon schon als Video eingeplant.
// Vorschläge aus der Trend-Recherche gibt es in den Demo-Daten bewusst nicht: die stammen nur aus echten, belegten Quellen.
import * as s from "../../src/db/schema";
import type { SeedPart } from "../seed";

const part: SeedPart = async (db, ctx) => {
  const { team, clients, videos } = ctx;
  const [oskar, yannick] = team;
  const farbtoene = videos.find((v) => v.title === "Farbtöne, die Kunden falsch aussprechen");

  const rows: (typeof s.ideas.$inferInsert)[] = [
    {
      title: "Farbtöne, die Kunden falsch aussprechen",
      hook: "Wir haben Kunden gebeten, diese Farbtöne vorzulesen.",
      description: "Kunden lesen Farbnamen vom Farbfächer vor, jeder Versuch schräger. Pointe: der Meister liest selbst falsch vor. Aufruf: Welche Farbe könnt ihr nicht aussprechen?",
      format: "Kunden-Sketch",
      clientId: clients.maler.id,
      videoId: farbtoene?.id ?? null,
      createdBy: oskar.id,
    },
    {
      title: "Der Gast, der die Karte auswendig kennt",
      hook: "POV: Der Stammgast bestellt, bevor du fragst.",
      description: "Stammgast kommt rein, Service will die Karte reichen, er bestellt schon. Steigerung: er kennt auch die Tagesgerichte von nächster Woche. Aufruf: Markiert euren Stammgast.",
      format: "POV-Sketch",
      clientId: clients.jhkp.id,
      createdBy: yannick.id,
    },
    {
      title: "Makler erraten Baujahre",
      hook: "Wir zeigen Marc ein Haus. Er hat drei Sekunden für das Baujahr.",
      description: "Schnelles Quiz-Format mit beiden Maklern, Fotos von Objekten [PLATZHALTER: nur freigegebene Objekte]. Aufruf: Wer lag näher dran?",
      format: "Entweder oder",
      clientId: clients.bs.id,
      createdBy: yannick.id,
    },
    {
      title: "Was ein Azubi in der ersten Woche lernt",
      hook: "Woche eins als Azubi. Tag für Tag.",
      description: "Recruiting-Serie für Handwerksbetriebe: fünf kurze Szenen, je Tag ein Satz. Passt zu jedem Kunden, der Azubis sucht.",
      format: "Recruiting",
      branche: "handwerk",
      createdBy: oskar.id,
    },
  ];
  const inserted = await db.insert(s.ideas).values(rows).returning();

  return `${inserted.length} Ideen`;
};

export default part;
