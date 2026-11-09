# SSV Hafen-Manager – Plan für den Prototyp

Die Fragen aus der Recherche sind noch offen. Gebaut wird mit den folgenden
**Annahmen**. Alles ist im Programm umstellbar und im Prototyp als
`[ANNAHME]` oder `[PLATZHALTER]` gekennzeichnet.

| # | Frage | Annahme im Prototyp |
|---|---|---|
| 1 | Zuordnung der Brücken | wie im Luftbild-Entwurf: Ost 1–24 ab Vereinsheim nach Osten, West 25–70 ab Vereinsheim nach Westen, Schwimmbrücke 71–79 am Westende, 2 Längsseits-Plätze |
| 2 | Bedeutung Box I/II/III | Größenklassen. Maximalmaße je Platz sind änderbar; Vorgabe I ≤ 11 × 3,7 m, II ≤ 9 × 3,1 m, III ≤ 7 × 2,6 m `[PLATZHALTER]` |
| 3 | Landflächen | im Plan: 40 Palettenplätze, Halle (4 Plätze, m²), Außenlager (m²) |
| 4 | Gebühren | Gebührenordnung 2024 als Startwert, je Saison änderbar |
| 5 | Einzug | eigene Rechnungen plus Lastschrift-Datei pain.008.001.08 für die Bank, dazu CSV. easyVerein entfällt (Entscheidung Nov. 2026), Mitglieder kommen einmalig per CSV |
| 6 | Tageslieger | bar beim Hafenmeister mit Quittung, wahlweise Überweisung |
| 7 | Rollen | Vorstand (alles), Kassenwart (Abrechnung, Gebühren, Bankdaten), Hafenmeister (Plan, Gäste, Abwesenheiten, Kran), Brückenwartin (Plan, Plätze, Boote, Belegung, Warteliste, Ein-/Auslagern) |
| 8 | Grünes Schild | digital, das Mitglied meldet selbst. Gäste melden sich per QR-Code an, der Hafenmeister weist den Platz zu |
| 9 | Warteliste / Arbeitsdienst | beides drin. Arbeitsdienst nur erfasst, nicht berechnet (Satzung: Rückstufung statt Geld) |
| 10 | Mitgliederzugang | „Mein SSV“ als Demo für jedes Mitglied |
| 11 | Ein System | ja. Der Prototyp ist eigenständig, die Datenbank wird mit Getränkekasse und Website zusammengelegt |
| 12 | Konten | später **neue, eigene** Supabase- und Vercel-Projekte nur für den SSV |
| 13 | Datenübernahme | CSV-Import vorgesehen. Die Demo-Daten sind frei erfunden |

## Abrechnungslogik (aus der Gebührenordnung)

- **Sommer** (Einzug nach dem Auslagern), Wasserliegeplatz:
  - ausübend/Probe: Sommerliegegebühr[Box] + Umlage Wasserpacht[Box] + Stromumlage `[ANNAHME: über die Hafenrechnung]`
  - fördernd: Sommerlieger[Box]
  - Saison-Gast: Gast-Sommerlieger[Box]
  - Längsseits: Sonderpreis je Platz
- **Sommer an Land:** Palette 100 €/Halbjahr bzw. außen m² × 4 €. Ab dem 2. Sommer in Folge verdoppelt sich die Sommergebühr jedes Jahr.
- **Winter** (Einzug nach dem Einlagern): Palette 100 €, außen m² × 4 €, Halle m² × 6 €
- **Kran:** Schiffskran 75 €, Mastenkran 25 € je angefangene Stunde
- **Fläche** = Länge × Breite des Bootes, aufgerundet `[ANNAHME]`, je Belegung änderbar

## Module

Hafenplan (Karte) · Liegeplätze · Boote · Eigner & Bankdaten · Belegung je
Saison · Abwesenheiten („grünes Schild“) · Gastlieger + QR-Anmeldung ·
Warteliste · Ein-/Auslagern + Kran · Arbeitsdienst · Abrechnung (Rechnungen,
SEPA-XML, CSV) · Gebührenordnung · Einstellungen · „Mein SSV“
