// Klauseln des Dienstleistungsvertrags (Vorlagensatz LEGAL_TEMPLATE_VERSION). Grundlage ist die Vertragsrecherche
// vom 26.10.2026 (gemischter Vertrag, AGB-Kontrolle § 307 BGB, § 31 Abs. 5 UrhG, § 38 ZPO, Art. 28 DSGVO, Art. 50 KI-VO).
// ENTWURF: vor dem ersten Einsatz anwaltlich prüfen lassen. Sprache: neutral in der dritten Person (SCM / Auftraggeber),
// weil das in Verträgen üblich ist und weder Duzen noch Siezen festlegt.
import type { Company } from "@/lib/settings";
import { LEGAL_FORMS } from "@/lib/labels";
import { EINWILLIGUNG_DURCH, GEBIET, KI_REGEL, LEISTUNGEN, NUTZUNGSDAUER, PLATTFORMEN, type PartySnapshot, type VertragData } from "./schema";

export type Clause = { title: string; items: (string | { bullets: string[] })[] };

const euro = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n) : s;
};
const dateDe = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};
const joinList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} und ${xs.at(-1)}`);

export function scmPartyLines(c: Company | null): string[] {
  if (!c) return ["SCM Creatives", "[PLATZHALTER: Firmendaten in den Einstellungen eintragen]"];
  return [
    c.legalName,
    c.owner ? `Inhaber ${c.owner}` : "",
    `handelnd unter der Marke ${c.brand}`,
    `${c.street}, ${c.zip} ${c.city}`,
    c.vatId ? `USt-IdNr. ${c.vatId}` : "",
  ].filter(Boolean);
}

export function clientPartyLines(p: PartySnapshot | null, d: Pick<VertragData, "unterzeichnerName" | "unterzeichnerFunktion">): string[] {
  if (!p) return ["[PLATZHALTER: Auftraggeber wählen]"];
  const form = p.legalForm ? LEGAL_FORMS[p.legalForm]?.label : null;
  const signer = d.unterzeichnerName || p.signatoryName;
  const role = d.unterzeichnerFunktion || p.signatoryRole;
  return [
    p.name,
    form ? `Rechtsform: ${form}` : "Rechtsform: [PLATZHALTER]",
    p.registerNumber ? `Register: ${p.registerNumber}` : "",
    p.street || p.city ? [p.street, [p.zip, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "Anschrift: [PLATZHALTER]",
    signer ? `vertreten durch ${signer}${role ? ` (${role})` : ""}` : "vertreten durch [PLATZHALTER]",
  ].filter(Boolean);
}

export function buildVertragClauses(d: VertragData, party: PartySnapshot | null, company: Company | null): Clause[] {
  const smallBusiness = Boolean(company?.smallBusiness);
  const paymentDays = company?.paymentDays ?? 14;
  const leistungen = d.leistungen.map((k) => LEISTUNGEN[k]);
  const plattformen = d.plattformen.map((k) => PLATTFORMEN[k]);
  const arten = [d.organisch ? "Veröffentlichung auf den eigenen Kanälen des Auftraggebers (organisch)" : "", d.werbung ? "Ausspielung als bezahlte Werbeanzeigen" : ""].filter(Boolean);
  const merchant = Boolean(party?.isMerchant);
  const avvNoetig = d.avv || d.leistungen.includes("posting");

  const clauses: Clause[] = [
    {
      title: "Gegenstand und Vertragsart",
      items: [
        "SCM produziert für den Auftraggeber kurze Videos für soziale Medien und erbringt die in § 2 genannten Leistungen.",
        "Die Herstellung der einzelnen Videos schuldet SCM als Werkleistung. Begleitende Leistungen wie Beratung, Veröffentlichung, Community-Betreuung und Werbeanzeigen erbringt SCM als Dienstleistung.",
        "Einen bestimmten wirtschaftlichen Erfolg, etwa Reichweite, Aufrufe, Follower, Anfragen oder Umsätze, schuldet SCM nicht. Entscheidungen der Plattformen über Ausspielung, Sperren oder Funktionen liegen außerhalb des Einflusses von SCM.",
      ],
    },
    {
      title: "Leistungsumfang",
      items: [
        `Paket: ${d.paketVideos} ${d.paketVideos === 1 ? "Video" : "Videos"} pro Kalendermonat.`,
        { bullets: leistungen.length ? leistungen : ["[PLATZHALTER: Leistungen wählen]"] },
        d.leistungen.includes("dreh")
          ? `Enthalten ${d.drehtageProMonat === 1 ? "ist ein Drehtag" : `sind bis zu ${d.drehtageProMonat} Drehtage`} pro Monat vor Ort beim Auftraggeber.`
          : "Drehtage vor Ort sind nicht Teil des Pakets.",
        "Werden Videos eines Monats aus Gründen, die der Auftraggeber zu vertreten hat, nicht abgerufen, gilt: [PLATZHALTER: Übertrag in den Folgemonat oder Verfall festlegen].",
        "Weitere Leistungen, etwa zusätzliche Videos, Drehtage oder Reisen, vereinbaren die Parteien gesondert in Textform.",
      ],
    },
    {
      title: "Ablauf, Freigabe und Abnahme",
      items: [
        "SCM stimmt Themen und Skripte vor dem Dreh mit dem Auftraggeber ab.",
        `Der Auftraggeber erhält jedes fertige Video zur Freigabe. Je Video sind ${d.korrekturschleifen === 0 ? "keine Korrekturschleifen" : d.korrekturschleifen === 1 ? "eine Korrekturschleife" : `${d.korrekturschleifen} Korrekturschleifen`} enthalten. Weitere Änderungen nach Absprache.`,
        `Der Auftraggeber prüft ein bereitgestelltes Video innerhalb von ${d.freigabeTage} Werktagen und erklärt die Abnahme (§ 640 BGB) in Textform, zum Beispiel per E-Mail oder Messenger.`,
        "Ein Video gilt auch als abgenommen, wenn der Auftraggeber es veröffentlicht oder veröffentlichen lässt, oder wenn SCM nach Fertigstellung eine angemessene Frist zur Abnahme gesetzt hat und der Auftraggeber die Abnahme nicht innerhalb dieser Frist unter Angabe mindestens eines Mangels verweigert hat (§ 640 Abs. 2 BGB).",
      ],
    },
    {
      title: "Mitwirkung des Auftraggebers",
      items: [
        "Der Auftraggeber ermöglicht den Zugang zu den Drehorten, benennt eine Ansprechperson vor Ort und stellt benötigte Informationen und Materialien wie Logos, Preise und Angebote rechtzeitig bereit.",
        "Für die Richtigkeit von Angaben zu eigenen Produkten, Preisen und Angeboten sowie für die Rechte an selbst gelieferten Materialien ist der Auftraggeber verantwortlich.",
        "Absage oder Verschiebung vereinbarter Drehtermine durch den Auftraggeber: [PLATZHALTER: Frist und Folgen festlegen].",
      ],
    },
    {
      title: "Vergütung und Zahlung",
      items: [
        smallBusiness
          ? `Die Vergütung beträgt ${euro(d.preisEuro)} pro Monat. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.`
          : `Die Vergütung beträgt ${euro(d.preisEuro)} netto pro Monat zuzüglich der gesetzlichen Umsatzsteuer.`,
        `SCM rechnet monatlich im Voraus zum Monatsbeginn ab. Rechnungen sind innerhalb von ${paymentDays} Tagen nach Zugang ohne Abzug zahlbar.`,
        "SCM stellt Rechnungen elektronisch aus (E-Rechnung im Format ZUGFeRD) und übermittelt sie per E-Mail.",
      ],
    },
    {
      title: "Laufzeit und Kündigung",
      items: [
        `Der Vertrag beginnt am ${dateDe(d.beginn)} und hat eine Mindestlaufzeit von ${d.mindestlaufzeitMonate} ${d.mindestlaufzeitMonate === 1 ? "Monat" : "Monaten"}. Danach verlängert er sich jeweils um einen Monat, wenn ihn keine Partei mit einer Frist von ${d.kuendigungsfristWochen} ${d.kuendigungsfristWochen === 1 ? "Woche" : "Wochen"} zum Ende der Mindestlaufzeit oder eines Verlängerungsmonats in Textform kündigt.`,
        "Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.",
        "Kündigt der Auftraggeber die Herstellung noch nicht fertiggestellter Videos nach § 648 BGB, richtet sich die Vergütung nach § 648 Satz 2 und 3 BGB.",
      ],
    },
    {
      title: "Nutzungsrechte",
      items: [
        `Mit vollständiger Zahlung der jeweiligen Monatsvergütung räumt SCM dem Auftraggeber an den abgenommenen Videos ein ${d.exklusiv ? "ausschließliches" : "einfaches, nicht ausschließliches"} Nutzungsrecht in folgendem Umfang ein:`,
        {
          bullets: [
            `Plattformen: ${joinList(plattformen)}`,
            `Nutzungsarten: ${arten.length ? joinList(arten) : "[PLATZHALTER: Nutzungsart wählen]"}`,
            `Gebiet: ${GEBIET[d.gebiet]}`,
            `Dauer: ${NUTZUNGSDAUER[d.nutzungsdauer]}`,
            d.bearbeitung
              ? "Bearbeitung: Der Auftraggeber darf die Videos kürzen, zuschneiden und mit Text versehen."
              : "Bearbeitung: nur mit Zustimmung von SCM in Textform",
          ],
        },
        "Andere Nutzungsarten, etwa Fernsehen, Kino, Druck, Außenwerbung oder die Weitergabe an Dritte, sind nicht eingeräumt (§ 31 Abs. 5 UrhG) und bedürfen einer gesonderten Vereinbarung.",
        "Rohmaterial, Projektdateien und nicht verwendete Aufnahmen verbleiben bei SCM (§§ 89, 94 UrhG). Eine Herausgabe erfolgt nur nach gesonderter Vereinbarung.",
        d.portfolio
          ? "SCM darf die Videos und den Namen des Auftraggebers als Referenz auf eigenen Kanälen und der eigenen Website zeigen. Der Auftraggeber kann dem jederzeit in Textform widersprechen."
          : "SCM zeigt die Videos nicht als Referenz.",
        "Musik verwendet SCM nur aus den Bibliotheken der jeweiligen Plattform, die für Unternehmenskonten freigegeben sind (zum Beispiel Meta Sound Collection, TikTok Commercial Music Library). Diese Freigaben gelten nur innerhalb der jeweiligen Plattform. Für eine Nutzung außerhalb dieser Plattform räumt SCM an der Musik keine Rechte ein.",
      ],
    },
    {
      title: "Personen im Video",
      items: [
        EINWILLIGUNG_DURCH[d.einwilligungenDurch],
        "Personen werden nur gefilmt, wenn ihre Einwilligung vorliegt. Widerruft eine Person ihre Einwilligung, informieren sich die Parteien unverzüglich gegenseitig. Umgang mit bereits veröffentlichten Videos: [PLATZHALTER: anwaltlich festlegen].",
      ],
    },
    {
      title: "Künstliche Intelligenz",
      items: [KI_REGEL[d.ki], "Kennzeichnungspflichten nach Art. 50 der EU-Verordnung über künstliche Intelligenz bleiben unberührt."],
    },
    {
      title: "Datenschutz",
      items: [
        "Beide Parteien beachten die Datenschutz-Grundverordnung (DSGVO).",
        avvNoetig
          ? "SCM betreut Kanäle des Auftraggebers und verarbeitet dabei personenbezogene Daten in dessen Auftrag, etwa Kommentare und Direktnachrichten. Die Parteien schließen dazu einen Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO als Anlage zu diesem Vertrag. [PLATZHALTER: AV-Vertrag beifügen]"
          : "SCM erhält keinen Zugriff auf Konten des Auftraggebers mit personenbezogenen Daten Dritter. Soll SCM später Konten betreuen, schließen die Parteien vorher einen Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.",
      ],
    },
    {
      title: "Haftung",
      items: [
        "SCM haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie nach dem Produkthaftungsgesetz.",
        "Bei leichter Fahrlässigkeit haftet SCM nur für die Verletzung wesentlicher Vertragspflichten, also solcher Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Auftraggeber regelmäßig vertrauen darf. Die Haftung ist dann auf den vertragstypischen, vorhersehbaren Schaden begrenzt.",
      ],
    },
  ];

  if (d.besonderes?.trim()) clauses.push({ title: "Besondere Vereinbarungen", items: d.besonderes.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean) });

  const schluss: Clause = {
    title: "Schlussbestimmungen",
    items: [
      "Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform.",
      "Es gilt das Recht der Bundesrepublik Deutschland.",
      "Sollte eine Bestimmung dieses Vertrags unwirksam sein oder werden, bleibt der Vertrag im Übrigen wirksam. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.",
      "Die Parteien unterzeichnen diesen Vertrag elektronisch (einfache elektronische Signatur). Ein Prüfprotokoll ist beigefügt.",
    ],
  };
  if (merchant && d.gerichtsstand?.trim()) {
    schluss.items.splice(2, 0, `Sind beide Parteien Kaufleute, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ${d.gerichtsstand.trim()} (§ 38 ZPO).`);
  }
  clauses.push(schluss);
  return clauses;
}
