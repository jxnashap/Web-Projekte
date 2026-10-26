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
        title: pick([`Der ${v.kunde}, der alles besser weiß`, `Kann man da noch was am Preis machen?`, `Das geht doch bestimmt auch schneller`], seed),
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

const LABELS = ["Hook", "Wiedererkennen", "Steigerung", "Pointe", "Aufruf"] as const;
const GAGS_STEIG = ["Und dann klingelt auch noch sein Handy. Klingelton: Möwengeschrei.", "Im Hintergrund fällt leise eine Leiter um.", "Der Kollege filmt heimlich mit."];
const GAGS_POINTE = ["Abspann. Der Chef sucht immer noch seine Brille.", "Schnitt. Alle tun so, als wäre nichts passiert.", "Und der Kaffee ist natürlich kalt."];

/** Timecodes passend zur Länge: Hook 0 s, dann ca. 8 %, 40 %, 70 %, 88 % (bei anderer Anzahl gleichmäßig verteilt). */
function marks(count: number, length: number) {
  if (count === 5) return [0, Math.max(1, Math.round(length * 0.08)), Math.round(length * 0.4), Math.round(length * 0.7), Math.round(length * 0.88)];
  return Array.from({ length: count }, (_, i) => (count < 2 ? 0 : Math.round((length * 0.88 * i) / (count - 1))));
}

/** Erster noch nicht verwendeter Gag (deterministisch), sonst null. */
function nextGag(list: string[], text: string, seed: number, offset: number) {
  for (let k = 0; k < list.length; k++) {
    const g = pick(list, seed, offset + k);
    if (!text.includes(g)) return g;
  }
  return null;
}

/**
 * Verfeinern im Demo-Modus: arbeitet auf dem bisherigen Entwurf (gewählter Hook, Titel und frühere Änderungen bleiben).
 * `input.length` ist die Länge, die gerade im Formular steht.
 */
function refineDemo(prev: ScriptDraft, refine: string, input: GenInput, ctx: GenContext): { draft: ScriptDraft; notice?: string } {
  const local = localOf(ctx.region);
  const seed = hash([prev.title, input.format, ctx.branche].join("|"));
  const beats = prev.beats.map((b) => ({ ...b }));
  // Der gewählte Hook steht im Abschnitt Hook
  const hi = beats.findIndex((b) => b.label === "Hook");
  if (hi >= 0) beats[hi].text = prev.hook;
  const by = (label: string) => beats.find((b) => b.label === label);
  let hookVariants = prev.hookVariants.filter((h) => h !== prev.hook);
  let hashtags = prev.hashtags;
  let notice: string | undefined;

  if (refine === "kuerzer") {
    const length = input.length > 30 ? 30 : 15;
    const before = JSON.stringify(beats);
    beats.forEach((b, i) => {
      if (i !== hi) b.text = shorten(b.text);
    });
    const m = marks(beats.length, length);
    beats.forEach((b, i) => (b.tc = tc(m[i])));
    if (JSON.stringify(beats) === before) notice = "Kürzer geht es im Demo-Modus nicht. Mit OpenAI-Schlüssel kürzt die KI auch einzelne Sätze.";
  } else if (refine === "lustiger") {
    const steig = by("Steigerung");
    const pointe = by("Pointe");
    const g1 = steig ? nextGag(GAGS_STEIG, steig.text, seed, 2) : null;
    const g2 = pointe ? nextGag(GAGS_POINTE, pointe.text, seed, 3) : null;
    if (steig && g1) steig.text = `${steig.text} ${g1}`;
    if (pointe && g2) pointe.text = `${pointe.text} ${g2}`;
    if (!g1 && !g2) notice = "Mehr Gags hat der Demo-Generator nicht. Mit OpenAI-Schlüssel schreibt die KI neue Pointen.";
  } else if (refine === "lokal") {
    const w = by("Wiedererkennen");
    const add = `Und das mitten ${local.spot}.`;
    if (w && !w.text.includes(add)) w.text = `${w.text} ${add}`;
    else notice = "Der Entwurf ist schon lokal. Mit OpenAI-Schlüssel baut die KI mehr Bezug zur Region ein.";
    const localHook = `Nur Leute ${local.spot} verstehen dieses Video.`;
    if (prev.hook !== localHook && !hookVariants.includes(localHook)) hookVariants = [...hookVariants.slice(0, 2), localHook];
    hashtags = Array.from(new Set([...local.tags, ...hashtags]));
  } else {
    notice = "Im Demo-Modus setzt der Generator nur Kürzer, Lustiger und Mehr lokal um. Eigene Wünsche schreibt erst die KI mit OpenAI-Schlüssel um.";
  }
  const aufruf = beats.findLast((b) => b.label === "Aufruf");
  return { draft: { ...prev, hookVariants, beats, hashtags, cta: aufruf?.text ?? prev.cta }, notice };
}

/** Demo-Skript erzeugen. Mit `refine` und `previous` wird der bisherige Entwurf verändert statt neu geschrieben. */
export function demoScript(input: GenInput, ctx: GenContext, previous?: ScriptDraft | null): { draft: ScriptDraft; notice?: string } {
  const refine = (input.refine ?? "").trim();
  if (refine && previous) return refineDemo(previous, refine, input, ctx);

  const v = VOCAB[ctx.branche] ?? VOCAB.unternehmen;
  const local = localOf(ctx.region);
  const seed = hash([input.format, input.ziel, input.ton, input.length, input.briefing ?? "", ctx.branche].join("|"));
  const length = input.length;

  const t = template(input.format, v, seed, null);
  let parts = [t.hook, t.wieder, t.steig, t.pointe, t.aufruf];
  if (input.ton === "Sachlich") parts = parts.map((p, i) => (i === 3 ? p.replace(/Zur Sicherheit\.|Das reicht\./, "").trim() : p));
  if (length <= 15) parts = parts.map((p, i) => (i === 0 ? p : shorten(p)));

  const m = marks(5, length);
  const beats = parts.map((text, i) => ({ tc: tc(m[i]), label: LABELS[i], text, shot: t.shots[i] }));

  const hookVariants = [
    pick([`Wenn der ${v.kunde} sagt: „Das kann doch nicht so schwer sein.“`, `Niemand: … Der ${v.kunde} um 17:55:`, `Das passiert jede Woche ${v.ort}.`], seed, 4),
    pick([`Drei Sätze, die jeder ${v.team} kennt.`, `Ehrlich gesagt: Das hier nervt uns am meisten.`, `Wir müssen über diesen einen ${v.kundeAkk} reden.`], seed, 5),
    pick([`Bitte nicht nachmachen.`, `Wartet aufs Ende.`, `Ihr werdet euch wiedererkennen.`], seed, 6),
  ];

  const draft: ScriptDraft = {
    title: t.title,
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
    input.briefing && input.briefing.trim().length > 0
      ? "Demo-Modus: Das Briefing wird mit dem Skript gespeichert, fließt aber erst mit OpenAI-Schlüssel in den Text ein."
      : undefined;
  return { draft, notice };
}
