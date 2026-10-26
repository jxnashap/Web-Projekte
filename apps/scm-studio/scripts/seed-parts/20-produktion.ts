// Demo-Daten Produktion und Skripte: weitere Skripte an geplanten Videos, Zuständige an allen Videos.
// Unbekannte Fakten über die Kunden (Preise, Ortsdetails) stehen als [PLATZHALTER] im Text.
// Hook und Aufruf entsprechen den Texten der Abschnitte „Hook“ und „Aufruf“ (eine Quelle der Wahrheit wie im Editor).
import { and, eq, isNull } from "drizzle-orm";
import * as s from "../../src/db/schema";
import type { SeedPart } from "../seed";

const part: SeedPart = async (db, ctx) => {
  const { team, clients, realVideos, videos } = ctx;
  const [oskar, yannick] = team;
  const byTitle = (t: string) => videos.find((v) => v.title === t);

  // Zuständige: Videos ohne Zuständigen abwechselnd an Oskar und Yannick
  const open = await db.select().from(s.videos).where(isNull(s.videos.assignee));
  for (const [i, v] of open.entries()) {
    await db.update(s.videos).set({ assignee: (i % 2 === 0 ? oskar : yannick).id }).where(eq(s.videos.id, v.id));
  }

  // vorhandenes Skript (Grunddaten) mit dem echten Reel verknüpfen
  const nachbar = realVideos.find((v) => v.title.startsWith("Also mein Nachbar"));
  if (nachbar) {
    const [sc] = await db.select().from(s.scripts).where(and(eq(s.scripts.clientId, clients.maler.id), isNull(s.scripts.videoId)));
    if (sc) {
      await db.update(s.scripts).set({ videoId: nachbar.id }).where(eq(s.scripts.id, sc.id));
      await db.update(s.videos).set({ scriptId: sc.id }).where(eq(s.videos.id, nachbar.id));
    }
  }

  const scripts: (Omit<typeof s.scripts.$inferInsert, "videoId"> & { video?: string })[] = [
    {
      video: "Ortsanalyse Teil 2: Preetz, Raisdorf, Flintbek",
      clientId: clients.bs.id,
      title: "Ortsanalyse Teil 2: Preetz, Raisdorf, Flintbek",
      format: "Ortsanalyse",
      status: "final",
      source: "manuell",
      hook: "Text im Bild: Ortsanalyse Teil 2. Drei Orte, eine ehrliche Bewertung.",
      beats: [
        { tc: "00:00", label: "Hook", text: "Text im Bild: Ortsanalyse Teil 2. Drei Orte, eine ehrliche Bewertung.", shot: "Drohne über Preetz, Titel eingeblendet" },
        { tc: "00:03", label: "Wiedererkennen", text: "Ihr wollt raus aus Kiel, aber nicht ganz weg? Dann bleibt dran.", shot: "Halbnah, beide Makler gehen auf die Kamera zu" },
        { tc: "00:08", label: "Steigerung", text: "Preetz: [PLATZHALTER: zwei belegte Vorteile]. Raisdorf: [PLATZHALTER]. Flintbek: [PLATZHALTER].", shot: "Je Ort 3 Sekunden Gehen durch den Ortskern, Gimbal" },
        { tc: "00:22", label: "Pointe", text: "Und welcher gewinnt? Der, bei dem ihr am Samstag einen Parkplatz findet.", shot: "Nah, Augenzwinkern" },
        { tc: "00:27", label: "Aufruf", text: "Welchen Ort sollen wir als Nächstes prüfen? Schreibt ihn in die Kommentare.", shot: "Karte mit Pins im Bild" },
      ],
      cta: "Welchen Ort sollen wir als Nächstes prüfen? Schreibt ihn in die Kommentare.",
      caption: "Teil 2 unserer Ortsanalyse rund um Kiel 🏡 Welcher Ort ist euer Favorit?\n\n#Kiel #Immobilien #Preetz #Raisdorf #Flintbek",
      createdBy: yannick.id,
    },
    {
      video: "Ein Tag als Azubi",
      clientId: clients.maler.id,
      title: "Ein Tag als Azubi",
      format: "Recruiting",
      status: "entwurf",
      source: "manuell",
      hook: "Ihr sucht einen Job, bei dem ihr abends seht, was ihr geschafft habt?",
      beats: [
        { tc: "00:00", label: "Hook", text: "Ihr sucht einen Job, bei dem ihr abends seht, was ihr geschafft habt?", shot: "Selfie im Transporter, früh am Morgen" },
        { tc: "00:03", label: "Wiedererkennen", text: "7 Uhr: Kaffee, Plan für den Tag, ein Spruch vom Meister.", shot: "Zeitraffer Baustelle einrichten" },
        { tc: "00:12", label: "Steigerung", text: "Mittag: die große Wand. Der Azubi darf ran. Der Meister schaut zu. Sehr genau.", shot: "Detail auf Rolle und Hände, dann Gegenschuss Meister" },
        { tc: "00:22", label: "Pointe", text: "Feierabend. Vorher, nachher. Der Meister nickt. Mehr Lob gibt es nicht. Reicht aber.", shot: "Split Screen vorher und nachher" },
        { tc: "00:27", label: "Aufruf", text: "Bock drauf? Schreibt uns eine Nachricht. [PLATZHALTER: Ausbildungsstart]", shot: "Team winkt in die Kamera" },
      ],
      cta: "Bock drauf? Schreibt uns eine Nachricht. [PLATZHALTER: Ausbildungsstart]",
      caption: "Ein ganz normaler Tag als Azubi bei uns 🎨\n\n#Kiel #Ausbildung #Maler #Handwerk #Azubi",
      createdBy: oskar.id,
    },
    {
      video: "Studenten-Mittwoch",
      clientId: clients.steak.id,
      title: "Studenten-Mittwoch",
      format: "Angebot mit Frist",
      status: "entwurf",
      source: "demo",
      hook: "Stopp. Studierende in Kiel, das hier ist für euch.",
      beats: [
        { tc: "00:00", label: "Hook", text: "Stopp. Studierende in Kiel, das hier ist für euch.", shot: "Hand stoppt die Kamera" },
        { tc: "00:02", label: "Wiedererkennen", text: "Ende des Monats, das Konto sagt Nudeln mit Ketchup.", shot: "POV: Blick in leeren Kühlschrank" },
        { tc: "00:10", label: "Steigerung", text: "Jeden Mittwoch: [PLATZHALTER: Angebot mit Preis].", shot: "Teller wird auf den Tisch gestellt, Nahaufnahme" },
        { tc: "00:20", label: "Pointe", text: "Freundschaft endet trotzdem bei den Pommes.", shot: "Gabel klaut Pommes vom Nachbarteller" },
        { tc: "00:26", label: "Aufruf", text: "Markiert die Person, mit der ihr Mittwoch kommt.", shot: "Text im Bild: Jeden Mittwoch" },
      ],
      cta: "Markiert die Person, mit der ihr Mittwoch kommt.",
      caption: "Mittwoch ist Studenten-Tag 🥩 Wer kommt mit?\n\n#Kiel #Studenten #Steakhouse #KielEssen",
      createdBy: oskar.id,
    },
    {
      video: "Testvideo 2: Weinempfehlung in 10 Sekunden",
      clientId: clients.drei.id,
      title: "Weinempfehlung in 10 Sekunden",
      format: "Tipp",
      status: "entwurf",
      source: "manuell",
      hook: "Ihr habt 10 Sekunden. Welcher Wein passt?",
      beats: [
        { tc: "00:00", label: "Hook", text: "Ihr habt 10 Sekunden. Welcher Wein passt?", shot: "Countdown im Bild, Nah auf die Bar" },
        { tc: "00:02", label: "Wiedererkennen", text: "Gast: „Irgendwas Trockenes, aber nicht zu trocken.“", shot: "Gegenschuss Gast, über die Schulter" },
        { tc: "00:05", label: "Pointe", text: "Glas, Flasche, eingeschenkt. [PLATZHALTER: Weinempfehlung des Hauses]", shot: "Schnelle Schnitte, Detail Glas" },
        { tc: "00:09", label: "Aufruf", text: "Was bestellt ihr, wenn ihr euch nicht entscheiden könnt?", shot: "Nah, Blick in die Kamera" },
      ],
      cta: "Was bestellt ihr, wenn ihr euch nicht entscheiden könnt?",
      caption: "Weinberatung im Schnelldurchlauf 🍷\n\n#Kiel #Weinbar #KielerNächte",
      createdBy: yannick.id,
    },
  ];

  let n = 0;
  for (const { video, ...row } of scripts) {
    const v = video ? byTitle(video) : undefined;
    const [sc] = await db.insert(s.scripts).values({ ...row, videoId: v?.id ?? null }).returning();
    if (v) {
      await db
        .update(s.videos)
        .set({ scriptId: sc.id, status: v.status === "idee" ? "skript" : v.status })
        .where(eq(s.videos.id, v.id));
    }
    n++;
  }
  return `${n} Skripte, ${open.length} Zuständige`;
};

export default part;
