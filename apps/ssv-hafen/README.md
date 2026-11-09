# SSV Hafen-Manager (Prototyp)

Liegeplatzverwaltung für den Schwartauer Segler-Verein: Hafenplan, Belegung,
Abwesenheiten („grünes Schild“), Gastlieger mit QR-Anmeldung, Warteliste,
Ein-/Auslagern und Kran, Arbeitsdienst, Abrechnung mit SEPA-Lastschrift-Datei
und der Mitgliederbereich „Mein SSV“.

**Stand: Demo.** Alles läuft im Browser (localStorage), alle Personen, Boote
und Bankdaten sind erfunden. Es ist nichts deployt. Annahmen: siehe `PLAN.md`,
Recherche: `RECHERCHE.md`.

## Ausprobieren

```bash
cd apps/ssv-hafen && python3 -m http.server 8080
# Verwaltung:       http://localhost:8080/            (Rolle wählen)
# Mitgliederbereich: http://localhost:8080/mein-ssv.html
# Gast-Anmeldung:   http://localhost:8080/gast.html   (das öffnet der QR-Code am Steg)
```

## Rollen

| Rolle | sieht |
|---|---|
| Vorstand | alles |
| Brückenwartin | Plan, Plätze, Boote, Eigner (ohne Bankdaten), Belegung, Abwesenheiten, Gäste, Warteliste, Ein-/Auslagern |
| Hafenmeister | Plan, Plätze, Gastlieger, Abwesenheiten, Ein-/Auslagern & Kran |
| Kassenwart | Plan, Eigner inkl. Bankdaten, Abrechnung, Gebührenordnung, Arbeitsdienst, Einstellungen |

## Was umgesetzt ist

- **Hafenplan:** Schematische Karte nach Luftbild mit Ost-, West- und Schwimmbrücke (Plätze 1–79, Längsseits L1/L2), Winterlager mit Paletten, Halle und Außenlager. Die Status-Farben gelten für einen wählbaren Tag. Zoom auf jede Brücke, Platzdetails per Klick, Links zu Google Maps und Apple Karten.
- **Regeln aus der Hafenbetriebsordnung:** Warnung bei Booten über 10 t, Prüfung „Boot passt zum Platz“, Erinnerung an den Versicherungsnachweis, Kennzeichen „nicht kranen“, Kfz-Kennzeichen.
- **Grünes Schild:** Mitglieder melden ihre Abwesenheit in „Mein SSV“, der Platz wird grün, und der Hafenmeister kann ihn an Gäste geben. Bei der Platzwahl für Gäste werden nur Plätze angeboten, die über den ganzen Zeitraum frei oder grün sind und deren Maße passen.
- **Mein SSV:** Jedes Mitglied (mit oder ohne Boot) hat einen Zugang: Boot und Liegeplatz, grünes Schild, Warteliste, alle Rechnungen (Hafen und Getränke) als PDF, Getränkebuchungen des Monats, Getränke-Code ändern oder neu festlegen, Kontaktdaten und Versicherung aktualisieren. In der Demo wählt man oben rechts, als wer man die Seite ansieht.
- **Gastlieger:** Anmeldung per QR-Code (Deutsch, Englisch, Dänisch), Zuweisung durch den Hafenmeister, Quittung, druckbares QR-Plakat.
- **Abrechnung nach Gebührenordnung 2024:** Box-Tarife je Mitgliedsart, Wasserpacht, Stromumlage, Landstellplätze (m² oder Palette), Verdopplung ab dem 2. Sommer an Land, Kran je angefangene Stunde. Rechnungen im persönlichen Ton mit Lastschrift-Ankündigung, CSV-Export.
- **SEPA-Lastschrift:** XML im Format **pain.008.001.08**, geprüft gegen das offizielle XSD-Schema. Je Fälligkeitstag entsteht eine Datei, IBAN und Gläubiger-ID werden geprüft.

## Getestet

- Kern (Node): Gebühren je Mitgliedsart, Verdopplungsregel, Kran-Nachberechnung, keine Doppelabrechnung, IBAN-Prüfziffer, SEPA-XML ist gültig nach `pain.008.001.08.xsd`.
- Browser (Playwright): alle Bereiche, QR-Anmeldung, Zuweisung, Winter-Abrechnung, SEPA-Download (wieder gegen das XSD geprüft), Druckansichten, Mein SSV, Rollenrechte, Handy-Ansicht. Keine Konsolenfehler.

## Nächste Schritte für den Echtbetrieb

1. Echten Liegeplatzplan und Box-Maße einarbeiten (Annahmen in `js/plan.js` und `js/daten.js`).
2. Datenbank-Schema (Supabase) mit Getränkekasse und Website zusammenführen, inklusive Rechten je Rolle (Row Level Security).
3. Konten für Funktionsträger und Mitglieder, Mailversand.
4. Daten übernehmen: Mitglieder, Boote und Liegeplätze einmalig per CSV aus der bisherigen Verwaltung (easyVerein entfällt – der Mitgliederstamm liegt künftig hier).
