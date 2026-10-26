// Richtungsbeschreibung für die nächtliche Trend-Recherche: wonach gesucht wird und was zu SCM passt.
// Startwert, in der App unter Ideen & Skripte → Recherche änderbar (Einstellung "trends.richtung").
// Grundlage: Briefing vom 21.10.2026 und Analyse der Reels von @scm.creatives (.preview-cache/scm/recherche/).
// Wird von Server und Browser genutzt, enthält nichts Geheimes.

export type Richtung = { beschreibung: string; stichwoerter: string[] };

export const DEFAULT_RICHTUNG: Richtung = {
  beschreibung: `Wer wir sind: SCM Creatives, Social-Media-Agentur aus Kiel und der Lübecker Bucht. Wir schreiben, drehen und schneiden Kurzvideos (Instagram Reels, TikTok) für Betriebe aus der Region und kommen dafür zu den Kunden in Laden oder Betrieb. Unsere Videos entstehen ohne KI: echte Menschen, echte Orte.

Unsere Kunden: Gastronomie, Immobilien, Handwerk und regionale Unternehmen (Freizeit, Einzelhandel, Dienstleister). Offen für jede Branche.

Was bei uns funktioniert: Alltags-Comedy und Sketche, in denen sich Kunden oder Branchenleute wiedererkennen (Kunden-Stereotype, POV), Entweder-oder mit den Inhabern, Ortsanalysen, Angebote mit Frist, Recruiting (Ein Tag als Azubi) und Serien je Kunde statt Einzelvideos. Jedes Skript folgt dem Bauplan Hook, Wiedererkennen, Steigerung, Pointe, Aufruf.

Wonach wir suchen: Formate, Trends, Sounds und Hooks, die gerade auf TikTok und Instagram laufen und die sich mit 1 bis 3 Personen und einem Smartphone im Betrieb nachdrehen lassen. Besonders wertvoll: Trends, die sich auf eine Branche übertragen lassen (zum Beispiel ein Sketch-Format, das gerade viral geht, als Version für Maler, Kellner oder Makler).

Was wir nicht wollen: KI-Filter und KI-generierte Trends, Challenges mit Risiko oder Gefahr, Trends, die Personen bloßstellen, politische Themen, Sounds, die für Unternehmenskonten nicht freigegeben sind.

Für jede Idee gilt: kurz beschreiben, warum sie zu einem unserer Kunden oder einer Branche passt, und den Trend mit Quelle belegen. Nichts erfinden, was nicht in den Quellen steht.`,
  stichwoerter: [
    "TikTok Trends diese Woche Deutschland",
    "Instagram Reels Trends aktuell",
    "TikTok Creative Center Trends Deutschland",
    "trending audio Instagram Reels this week",
    "virale Reel Formate für Unternehmen",
    "Gastro TikTok Trend Restaurant Sketch",
    "Kellner POV Trend",
    "Handwerk TikTok Trend Baustelle",
    "Azubi Handwerk Reels Recruiting",
    "Immobilienmakler Reels Trend",
    "Entweder oder Trend Team",
    "Mitarbeiter vorstellen Reel Trend",
    "Day in the life Azubi Reel",
    "lokale Unternehmen Social Media Trend Deutschland",
    "Kiel Instagram",
    "Lübecker Bucht Instagram",
  ],
};

/** Grenzen, damit die Richtung handlich bleibt (und der Prompt klein). */
export const RICHTUNG_LIMITS = { beschreibung: 4000, stichwoerter: 30, stichwort: 80 } as const;
