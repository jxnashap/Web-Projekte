// Demo-Generator: erzeugt ohne OpenAI-Schlüssel ein Skript nach dem SCM-Bauplan.
// Deterministisch (gleiche Eingaben, gleiches Ergebnis), damit Vorschau und Tests stabil sind.
import { tc, type GenContext, type GenInput, type ScriptDraft } from "./schema";

// Rollen bewusst im generischen Maskulinum, damit Artikel und Pronomen in den Vorlagen stimmen.
type Vocab = { ort: string; kunde: string; kundeAkk: string; team: string; chef: string; papier: string; aufgabe: string; tag: string };

const VOCAB: Record<string, Vocab> = {
  gastronomie: { ort: "im Laden", kunde: "Gast", kundeAkk: "Gast", team: "Koch", chef: "Küchenchef", papier: "die Wochenkarte", aufgabe: "den Mittagsansturm überstehen", tag: "#Gastro" },
  handwerk: { ort: "auf der Baustelle", kunde: "Kunde", kundeAkk: "Kunden", team: "Azubi", chef: "Meister", papier: "Angebote", aufgabe: "die Wand streichen", tag: "#Handwerk" },
  immobilien: { ort: "bei der Besichtigung", kunde: "Interessent", kundeAkk: "Interessenten", team: "Makler", chef: "Chef", papier: "Exposés", aufgabe: "die Wohnung zeigen", tag: "#Immobilien" },
  unternehmen: { ort: "im Betrieb", kunde: "Kunde", kundeAkk: "Kunden", team: "Azubi", chef: "Chef", papier: "Angebote", aufgabe: "den Auftrag erklären", tag: "#Unternehmen" },
};

const LOCAL: Record<string, { spot: string; tags: string[] }> = {
  kiel: { spot: "an der Kiellinie", tags: ["#Kiel", "#KielerFörde"] },
  "lübeck": { spot: "in Travemünde", tags: ["#Lübeck", "#LübeckerBucht"] },
  default: { spot: "hier im Norden", tags: ["#SchleswigHolstein", "#Norddeutschland"] },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}
const pick = <T,>(arr: readonly T[], seed: number, offset = 0) => arr[(seed + offset) % arr.length];

function localOf(region: string | null) {
  const r = (region ?? "").toLowerCase();
  if (r.includes("kiel")) return LOCAL.kiel;
  if (r.includes("lübeck") || r.includes("travemünde") || r.includes("bucht")) return LOCAL["lübeck"];
  return LOCAL.default;
}

type Five = { hook: string; wieder: string; steig: string; pointe: string; aufruf: string; shots: [string, string, string, string, string]; title: string };

function template(format: string, v: Vocab, seed: number, lokal: string | null): Five {
  const where = lokal ?? v.ort;
  switch (format) {
    case "POV-Sketch":
      return {
        title: `POV: Der ${v.kunde} kommt fünf Minuten vor Feierabend`,
        hook: `POV: Es ist 17:55 und ein ${v.kunde} kommt noch rein.`,
        wieder: `„Ich will auch gar nicht lange stören.“ Er stört genau 45 Minuten.`,
        steig: `Jetzt holt er noch Fotos raus. Von einem anderen Betrieb. „Können Sie das genauso?“`,
        pointe: `Der ${v.team} schaut auf die Uhr. Die Uhr schaut zurück. Beide wissen Bescheid.`,
        aufruf: `Wer kennt diesen ${v.kundeAkk}? Markiert die Person, die immer um 17:55 kommt.`,
        shots: ["Totale, Uhr im Bild", "Halbnah, Gegenschuss", "Detail: Handy mit Fotos", "Nah auf das Gesicht, Pause", "Selfie-Perspektive, direkt in die Kamera"],
      };
    case "Entweder oder":
      return {
        title: `Entweder oder: ${v.chef}-Edition`,
        hook: `Entweder oder, aber nur mit ehrlichen Antworten. Los geht's.`,
        wieder: `Frühschicht oder Spätschicht? „Frühschicht. Da redet noch keiner.“`,
        steig: `${v.papier[0].toUpperCase()}${v.papier.slice(1)} schreiben oder ${v.aufgabe}? Lange Pause. „Gibt es eine dritte Option?“`,
        pointe: `Letzte Frage: Urlaub oder noch schnell ${v.papier} schreiben? Er schreibt. Aus Gewohnheit.`,
        aufruf: `Was hättet ihr gewählt? Schreibt eure Antworten in die Kommentare.`,
        shots: ["Nah, zwei Personen frontal", "Schnelle Schnitte, Text im Bild", "Detail auf das Gesicht beim Überlegen", "Halbnah, Lacher", "Zoom raus, beide winken"],
      };
    case "Ortsanalyse":
      return {
        title: `Drei Orte rund um ${lokal ? lokal.replace(/^(an der|in|hier im)\s/, "") : "die Stadt"} im Check`,
        hook: `Wo würdet ihr hinziehen? Drei Orte, eine ehrliche Bewertung.`,
        wieder: `Ort eins: kurze Wege, aber am Samstag findet ihr keinen Parkplatz.`,
        steig: `Ort zwei: ruhig, grün, und der Bäcker kennt nach einer Woche euren Namen.`,
        pointe: `Ort drei: der Geheimtipp. Warum? Verraten wir im nächsten Teil.`,
        aufruf: `Welchen Ort sollen wir als Nächstes prüfen? Schreibt ihn in die Kommentare.`,
        shots: ["Drohne oder Totale über dem Ort", "Gehend durch die Straße, Gimbal", "Details: Bäcker, Spielplatz, Bus", "Nah auf den Sprecher, Augenzwinkern", "Karte mit Pins im Bild"],
      };
    case "Angebot mit Frist":
      return {
        title: `Nur bis Sonntag: das Angebot, über das alle reden`,
        hook: `Stopp. Das hier gibt es nur bis Sonntag.`,
        wieder: `Ihr kennt das: Ihr wollt etwas ausprobieren und dann ist es vorbei.`,
        steig: `Diesmal nicht. ${pick(["Diese Woche", "Nur dieses Wochenende", "Bis Sonntag"], seed)} gibt es [PLATZHALTER: Angebot mit Preis].`,
        pointe: `Und ja, der ${v.chef} hat es selbst getestet. Zweimal. Zur Sicherheit.`,
        aufruf: `Speichert das Video und schickt es der Person, mit der ihr hingeht.`,
        shots: ["Hand stoppt die Kamera", "Halbnah, Sprecher erklärt", "Detail auf das Angebot", "Kurzer Gag mit dem Chef", "Text im Bild: Frist und Ort"],
      };
    case "Recruiting":
      return {
        title: `Ein Tag als ${v.team} bei {{BETRIEB}}`,
        hook: `Ihr sucht einen Job, bei dem ihr abends seht, was ihr geschafft habt?`,
        wieder: `7 Uhr: Kaffee, Plan für den Tag, kurzer Spruch vom ${v.chef}.`,
        steig: `Mittag: ${v.aufgabe}. Danach weiß jeder, warum man das hier lernt.`,
        pointe: `Feierabend. Der ${v.team} zeigt stolz das Ergebnis. Der ${v.chef} nickt. Das reicht.`,
        aufruf: `Bock drauf? Schreibt uns eine Nachricht, der Link ist in der Bio.`,
        shots: ["Selfie beim Ankommen", "Zeitraffer der Arbeit", "Detail auf Hände und Werkzeug", "Halbnah, Vorher und Nachher", "Team winkt in die Kamera"],
      };
    case "Einblick":
      return {
        title: `Was ihr bei uns nie seht`,
        hook: `Das hier seht ihr normalerweise nie.`,
        wieder: `Bevor ihr kommt, passiert ${where} schon eine ganze Menge.`,
        steig: `Um 6 Uhr ist das Licht an. Um 7 Uhr läuft die Kaffeemaschine zum dritten Mal.`,
        pointe: `Und wenn ihr reinkommt, sieht alles ganz entspannt aus. Genau so soll es sein.`,
        aufruf: `Sollen wir mehr hinter die Kulissen zeigen? Ja oder ja?`,
        shots: ["Tür öffnet sich, dunkel", "Zeitraffer Vorbereitung", "Details: Kaffee, Werkzeug, Hände", "Totale, alles fertig", "Nah, Sprecher grinst"],
      };
    case "Tipp":
      return {
        title: `Ein Tipp, den euch keiner sagt`,
        hook: `Ein Tipp vom ${v.chef}, den euch sonst keiner sagt.`,
        wieder: `Die meisten machen es so. Und wundern sich dann.`,
        steig: `Besser: [PLATZHALTER: konkreter Tipp aus dem Betrieb]. Dauert zehn Sekunden.`,
        pointe: `Der ${v.chef} sagt: „Hab ich schon tausendmal erklärt.“ Jetzt habt ihr es auch.`,
        aufruf: `Speichert euch das und schickt es jemandem, der es braucht.`,
        shots: ["Nah, direkter Blick in die Kamera", "Detail: falsch gemacht", "Detail: richtig gemacht", "Halbnah, Augenrollen", "Text im Bild: Merken"],
      };
    case "Kunden-Sketch":
    default:
      return {
        title: pick([`Also mein Nachbar hätte das anders gemacht`, `Der ${v.kunde}, der alles besser weiß`, `Kann man da noch was am Preis machen?`], seed),
        hook: `POV: Jede Person aus der Branche kennt diesen ${v.kundeAkk}.`,
        wieder: `„${pick(["Mein Nachbar hat das aber früher immer anders gemacht.", "Das geht doch bestimmt auch schneller, oder?", "Ich hab das mal auf YouTube gesehen."], seed, 1)}“`,
        steig: `Er hat noch etwas im Keller gefunden. „Kann man das nicht gegenrechnen?“`,
        pointe: `Am Ende will er es lieber selbst lernen. Damit es nächstes Mal günstiger wird.`,
        aufruf: `Was war der beste Spruch, den ihr euch ${where} anhören musstet?`,
        shots: ["Text im Bild, Totale", "Halbnah, Kunde gestikuliert", "Detail: Gegenstand aus dem Keller", "Nah auf den Mitarbeiter, Blick in die Kamera", "Selfie-Perspektive, Frage an die Zuschauer"],
      };
  }
}

const shorten = (t: string) => {
  const first = t.split(/(?<=[.!?“])\s+/)[0];
  return first.length >= 12 ? first : t;
};

/** Demo-Skript erzeugen. `refine` (kuerzer, lustiger, lokal) verändert den vorherigen Entwurf. */
export function demoScript(input: GenInput, ctx: GenContext, previous?: ScriptDraft | null): { draft: ScriptDraft; notice?: string } {
  const v = VOCAB[ctx.branche] ?? VOCAB.unternehmen;
  const local = localOf(ctx.region);
  const seed = hash([input.format, input.ziel, input.ton, input.length, input.briefing ?? "", ctx.branche].join("|"));
  const refine = (input.refine ?? "").trim();
  const wantsLocal = refine === "lokal";
  let length = input.length;
  if (refine === "kuerzer") length = length > 30 ? 30 : 15;

  const t = template(input.format, v, seed, wantsLocal ? local.spot : null);
  let parts = [t.hook, t.wieder, t.steig, t.pointe, t.aufruf];
  if (input.ton === "Sachlich") parts = parts.map((p, i) => (i === 3 ? p.replace(/Zur Sicherheit\.|Das reicht\./, "").trim() : p));
  if (refine === "lustiger") {
    parts[2] = `${parts[2]} ${pick(["Und dann klingelt auch noch sein Handy. Klingelton: Möwengeschrei.", "Im Hintergrund fällt leise eine Leiter um.", "Der Kollege filmt heimlich mit."], seed, 2)}`;
    parts[3] = `${parts[3]} ${pick(["Abspann. Der Chef sucht immer noch seine Brille.", "Schnitt. Alle tun so, als wäre nichts passiert.", "Und der Kaffee ist natürlich kalt."], seed, 3)}`;
  }
  if (wantsLocal) parts[1] = `${parts[1]} Und das mitten ${local.spot}.`;
  if (refine === "kuerzer") parts = parts.map(shorten);
  if (input.briefing && input.briefing.trim().length > 10) {
    parts[1] = `${parts[1]} (Bezug zum Briefing: ${input.briefing.trim().slice(0, 90)}${input.briefing.trim().length > 90 ? " …" : ""})`;
  }

  // Timecodes passend zur Länge: Hook 0 s, dann ca. 8 %, 40 %, 70 %, 88 %
  const marks = [0, Math.max(1, Math.round(length * 0.08)), Math.round(length * 0.4), Math.round(length * 0.7), Math.round(length * 0.88)];
  const beats = parts.map((text, i) => ({ tc: tc(marks[i]), label: ["Hook", "Wiedererkennen", "Steigerung", "Pointe", "Aufruf"][i], text, shot: t.shots[i] }));

  const hookVariants = [
    pick([`Wenn der ${v.kunde} sagt: „Das kann doch nicht so schwer sein.“`, `Niemand: … Der ${v.kunde} um 17:55:`, `Das passiert jede Woche ${v.ort}.`], seed, 4),
    pick([`Drei Sätze, die jeder ${v.team} kennt.`, `Ehrlich gesagt: Das hier nervt uns am meisten.`, `Wir müssen über diesen einen ${v.kundeAkk} reden.`], seed, 5),
    wantsLocal ? `Nur Leute ${local.spot} verstehen dieses Video.` : pick([`Bitte nicht nachmachen.`, `Wartet aufs Ende.`, `Ihr werdet euch wiedererkennen.`], seed, 6),
  ];

  const draft: ScriptDraft = {
    title: refine && previous ? previous.title : t.title,
    hook: parts[0],
    hookVariants,
    beats,
    caption: pick(
      [`Jeder kennt so einen Moment 😅 Wie ist das bei euch?`, `Ehrlich, so läuft das bei uns 🙈`, `Ein ganz normaler Tag bei {{BETRIEB}} 😄`],
      seed,
      7,
    ),
    cta: parts[4],
    hashtags: [...local.tags, v.tag, `#${input.format.replace(/[^A-Za-zÄÖÜäöüß]/g, "")}`, "#Reels", "#Norddeutsch"],
  };
  const notice =
    refine && !["kuerzer", "lustiger", "lokal"].includes(refine)
      ? "Im Demo-Modus werden nur die Knöpfe Kürzer, Lustiger und Mehr lokal umgesetzt. Freie Änderungswünsche gehen erst mit OpenAI-Schlüssel."
      : undefined;
  return { draft, notice };
}
