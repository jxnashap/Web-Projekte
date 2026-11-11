# SSV Hafen-Manager (Prototyp)

Hafen- und Mitgliederverwaltung für den Schwartauer Segler-Verein (ersetzt
easyVerein): Mitgliederstamm mit Import, Online-Aufnahmeantrag,
Beitragseinzug, Verbandsmeldung, Hafenplan, Belegung, Abwesenheiten
(„grünes Schild“), Gastlieger mit QR-Anmeldung, Warteliste, Ein-/Auslagern
und Kran, Arbeitsdienst, Abrechnung mit SEPA-Lastschrift-Datei und der
Mitgliederbereich „Mein SSV“.

**Stand: Demo.** Alles läuft im Browser (localStorage), alle Personen, Boote
und Bankdaten sind erfunden. Es ist nichts deployt. Annahmen: siehe `PLAN.md`,
Recherche: `RECHERCHE.md`.

## Ausprobieren

```bash
cd apps/ssv-hafen && python3 -m http.server 8080
# Verwaltung:       http://localhost:8080/            (Rolle wählen)
# Mitgliederbereich: http://localhost:8080/mein-ssv.html
# Gast-Anmeldung:   http://localhost:8080/gast.html   (das öffnet der QR-Code am Steg)
# Mitglied werden:  http://localhost:8080/aufnahme.html (Online-Aufnahmeantrag, verlinkt von der Website)
```

## Rollen

| Rolle | sieht |
|---|---|
| Vorstand | alles, entscheidet über Aufnahmeanträge |
| Brückenwartin | Plan, Plätze, Boote, Eigner (ohne Bankdaten), Belegung, Abwesenheiten, Gäste, Warteliste, Ein-/Auslagern |
| Hafenmeister | Plan, Plätze, Gastlieger, Abwesenheiten, Ein-/Auslagern & Kran |
| Kassenwart | Plan, Mitglieder inkl. Bankdaten und Import, Aufnahmeanträge (nur lesen), Verbandsmeldung, Abrechnung, Gebührenordnung, Arbeitsdienst, Einstellungen |

## Was umgesetzt ist

- **Hafenplan / Hafenkarte:** Maßstäbliche Karte nach amtlichem Luftbild mit Ost-, West- und Schwimmbrücke, Winterlager mit Paletten, Halle und Außenlager. Boote in echter Größe, je Platz eine Boje als Ampel (grün = frei für Gäste, rot = belegt), Abendansicht, Schwebekarte. Der Stand gilt für einen wählbaren Tag. Zoom auf jede Brücke, Platzdetails per Klick, Links zu Google Maps und Apple Karten.
- **Lageplan bearbeiten:** Stege, Flächen, Punkte und Lagerfelder zeichnen; einzelne Boxen und Lagerplätze verschieben, in der Größe ändern, entfernen, neu setzen. **Planungen** als Entwürfe neben dem gültigen Plan („so will ich es nächstes Jahr“), **Druck** im Vereinsbriefkopf mit Belegungsliste.
- **Gäste – Karte & Kalender:** Anreise und Nächte wählen, freie Plätze auf der Karte sehen, Gast direkt eintragen; Zeitleiste je Platz mit grünem Schild (auch aus „Mein SSV“), Gästen und Dauerliegern.
- **Öffentliche Hafenkarte** `hafenplan.html`: zeigt Gästen nur frei/belegt je Platz, ohne Namen; vom Vorstand ein- und ausschaltbar (Einstellungen), Deutsch/Englisch/Dänisch. Plan und Recherche: `PLAN-HAFENKARTE.md`.
- **Regeln aus der Hafenbetriebsordnung:** Warnung bei Booten über 10 t, Prüfung „Boot passt zum Platz“, Erinnerung an den Versicherungsnachweis, Kennzeichen „nicht kranen“, Kfz-Kennzeichen.
- **Grünes Schild:** Mitglieder melden ihre Abwesenheit in „Mein SSV“, der Platz wird grün, und der Hafenmeister kann ihn an Gäste geben. Bei der Platzwahl für Gäste werden nur Plätze angeboten, die über den ganzen Zeitraum frei oder grün sind und deren Maße passen.
- **Mein SSV:** Jedes Mitglied (mit oder ohne Boot) hat einen Zugang: Boot und Liegeplatz, grünes Schild, Warteliste, alle Rechnungen (Hafen und Getränke) als PDF, Getränkebuchungen des Monats, Getränke-Code ändern oder neu festlegen, Kontaktdaten und Versicherung aktualisieren. In der Demo wählt man oben rechts, als wer man die Seite ansieht.
- **Mitgliederstamm:** Mitgliedsarten laut Satzung (ausübend, Probe, fördernd, Ehe-/Lebenspartner, Jugend, Geschwisterkind, in Ausbildung) plus Saison-Gäste, mit Geburtsdatum, Geschlecht, Eintritt und Austritt.
- **Mitglieder-Import:** CSV aus easyVerein oder Excel. Spalten werden am Namen erkannt (Mitgliedsnummer, Anschrift, Geburtsdatum, Geschlecht, Mitgliedsart, Eintritt, IBAN, BIC, Kontoinhaber, Mandatsreferenz, Mandatsdatum …), Datumsformate 01.02.2015 und 2015-02-01, Windows- und UTF-8-Dateien. Vorschau mit „neu / aktualisieren / Fehler“, ungültige IBANs werden nicht übernommen, leere Zellen überschreiben nichts. Vorlage zum Herunterladen.
- **Online-Aufnahmeantrag** (`aufnahme.html`): Mitgliedsart mit Jahresbeitrag, persönliche Angaben, bei Minderjährigen die erziehungsberechtigte Person, optional Boot und Warteliste, SEPA-Lastschriftmandat (IBAN-Prüfung), Satzung und Datenschutz. Der Vorstand nimmt im Bereich „Aufnahmeanträge“ auf (Mitgliedsnummer, Mandatsreferenz, Wartelisten-Eintrag, Begrüßungs-E-Mail) oder lehnt ab.
- **Beitragseinzug:** Jahresbeitrag laut Gebührenordnung 2024 – Vereins- plus Verbandsbeitrag je Mitgliedsart, Eintrittsgeld-Rate für Probemitglieder (130 € je Probejahr). Eigene Rechnungsnummern (`SSV-B-2027-0001`), Rechnung im persönlichen Ton, SEPA-Datei wie beim Hafengeld, Beiträge in der Gebührenordnung änderbar.
- **Verbandsmeldung:** Bestandserhebung zum 1.1. nach Altersgruppen (bis 6, 7–14, 15–18, 19–26, 27–40, 41–60, über 60) und Geschlecht, Aufstellung nach Mitgliedsart mit Verbandsbeiträgen, Liste fehlender Angaben, CSV und Druck. Altersgruppen und Meldeweg mit dem Landessportverband abgleichen.
- **Gastlieger:** Anmeldung per QR-Code (Deutsch, Englisch, Dänisch), Zuweisung durch den Hafenmeister, Quittung, druckbares QR-Plakat.
- **Abrechnung nach Gebührenordnung 2024:** Box-Tarife je Mitgliedsart, Wasserpacht, Stromumlage, Landstellplätze (m² oder Palette), Verdopplung ab dem 2. Sommer an Land, Kran je angefangene Stunde. Rechnungen im persönlichen Ton mit Lastschrift-Ankündigung, CSV-Export.
- **SEPA-Lastschrift:** XML im Format **pain.008.001.08**, geprüft gegen das offizielle XSD-Schema. Je Fälligkeitstag entsteht eine Datei, IBAN und Gläubiger-ID werden geprüft.

## Getestet

- Kern (Node): Gebühren je Mitgliedsart, Verdopplungsregel, Kran-Nachberechnung, keine Doppelabrechnung, IBAN-Prüfziffer, SEPA-XML ist gültig nach `pain.008.001.08.xsd`.
- Browser (Playwright): alle Bereiche, QR-Anmeldung, Zuweisung, Winter-Abrechnung, SEPA-Download (wieder gegen das XSD geprüft), Druckansichten, Mein SSV, Rollenrechte, Handy-Ansicht. Keine Konsolenfehler.
- Mitgliederverwaltung (Playwright): Online-Antrag → Aufnahme durch den Vorstand (Nummer, Mandat, Warteliste) bzw. Ablehnung, Beitrag 2027 abrechnen, Beitrags-SEPA-Datei (gegen das XSD geprüft), Verbandsmeldung mit CSV, CSV-Import (neu, aktualisieren, Fehlerzeilen, ungültige IBAN), neue Mitglieder erscheinen in der Getränkekasse, Beitragsrechnung in Mein SSV.

## Nächste Schritte für den Echtbetrieb

1. Echten Liegeplatzplan und Box-Maße einarbeiten (Annahmen in `js/plan.js` und `js/daten.js`).
2. Datenbank-Schema (Supabase) mit Getränkekasse und Website zusammenführen, inklusive Rechten je Rolle (Row Level Security).
3. Konten für Funktionsträger und Mitglieder, Mailversand.
4. Daten übernehmen: Mitglieder einmalig per CSV-Import aus easyVerein (vor der Kündigung exportieren), Boote und Liegeplätze nach Liste der Brückenwartin.
5. Offen beim Verein: Beitrag bei Eintritt im laufenden Jahr (anteilig oder voll?), Altersgruppen und Meldeweg der Verbandsmeldung, ob die Bank ein online erteiltes Lastschriftmandat akzeptiert, Löschfrist für abgelehnte Anträge.
