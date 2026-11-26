# SSV Getränkekasse

iPad-Kasse für den Getränkekasten im Schwartauer Segler-Verein: Mitglied
suchen → 4-stelliger Code → Getränk antippen → Menge oder ganzer Kasten →
buchen. Der Kassenwart rechnet per Knopfdruck ab und bekommt fertige
A4-Rechnungen, die zugleich als SEPA-Vorabankündigung dienen,
SEPA-Liste und CSV-Export.

**Stand: Demo-Version.** Alle Daten liegen im Browser des Geräts
(localStorage). Es ist **kein** Server, kein Supabase-Projekt und kein
Hosting angelegt. Für den Echtbetrieb braucht es eine zentrale Datenbank
(siehe unten).

## Ausprobieren

```bash
cd apps/ssv-getraenke && python3 -m http.server 8080
# Kasse:      http://localhost:8080/
# Kassenwart: http://localhost:8080/kassenwart.html   (kassenwart@demo / demo)
```

Die Demo bringt 24 erfundene Mitglieder (Code überall `1234`), 8 Getränke
mit **Beispielpreisen [PLATZHALTER]** und rund 10 Wochen Buchungsverlauf
mit.

## Ablauf an der Kasse

| Schritt | Was passiert |
|---|---|
| Wer bucht? | Namensliste mit A–Z-Leiste und Suchfeld |
| Code | 4 Ziffern, nach 5 Fehlversuchen 5 Minuten gesperrt |
| Erstes Mal | Wer noch keinen Code hat („Erstes Mal? Code festlegen“), tippt auf seinen Namen und legt den Code selbst fest (2× eingeben, ohne Mitgliedsnummer; jeder 4-stellige Code ist erlaubt, auch 1234). Danach geht es zurück zur Namensliste: Namen antippen, neuen Code eingeben. In den Einstellungen abschaltbar. |
| Getränke | Kacheln mit Preis; antippen → 1–6 Stück oder 1–2 Kästen |
| Bon | Mehrere Getränke sammeln, dann „Jetzt buchen · 13,00 €“ |
| Fertig | „Prost, Jan!“, Monatssumme, Abmeldung nach 6 s |
| Fehlbuchung | „Meine Buchungen“ → innerhalb von 15 Minuten selbst rückgängig machen |

Nach 60 Sekunden ohne Eingabe meldet sich die Kasse von allein ab.

## Kassenwart-Bereich

- **Übersicht:** Monatsumsatz, offene Beträge, meistgebuchte Getränke.
- **Mitglieder:** anlegen, CSV-Import (z. B. Liste aus Excel, auch auf dem
  iPad über die Dateien-App), Mandatsreferenz, Code
  vergeben oder „Code zurücksetzen“ (das Mitglied legt dann selbst einen neuen fest). Ein Code wird nur einmal angezeigt und ist danach nur
  verschlüsselt gespeichert. Code-Zettel lassen sich drucken (10 pro A4-Seite, mit Vereinskopf).
- **Getränke & Preise:** Kacheln, Symbol, Farbe, Stück- und Kastenpreis.
- **Buchungen:** Filter (auch „Freigabe: unbestätigt/bestätigt“), Bestätigen einzeln oder alle, Storno, Nachtragen, CSV-Export.
  Jede Buchung startet „unbestätigt“; nur der Kassenwart bestätigt (der Vorstand sieht den Stand im Hafen-Manager → Finanzen → Getränke).
- **Abrechnung:** Zeitraum wählen (letzter Monat, Quartal, Saison …),
  Vorschau prüfen, Rechnungen erstellen. Jede Buchung wird genau einmal
  abgerechnet, die Rechnungsnummern laufen fortlaufend (`SSV-G-2026-0001`).
  Jede Rechnung ist zugleich die SEPA-Vorabankündigung: Betrag, Einzugstermin,
  Mandatsreferenz, Gläubiger-ID. Mitglieder ohne Mandat bekommen stattdessen
  die Bankverbindung zur Überweisung.
  Danach: drucken oder als PDF sichern (mit Anlage der Einzelbuchungen),
  per E-Mail senden, als bezahlt markieren, stornieren (im ⋯-Menü der Zeile),
  Rechnungsliste als CSV. **Lastschrift (SEPA-Datei):** offene Lastschrift-Rechnungen
  als SEPA-XML (pain.008.001.08, mit `../ssv-hafen/js/sepa.js`) für die Sammellastschrift
  im Online-Banking; IBAN/BIC/Mandatsdatum kommen aus dem gemeinsamen Mitgliederstamm
  (Demo: Hafen-Manager, Datenbank: `mitglieder_bank`), Vereins-IBAN/Gläubiger-ID aus den
  Kassen-Einstellungen, sonst aus dem Hafen-Manager. Schon eingereichte Rechnungen merkt
  sich die Kasse (`einstellungen.sepa_laeufe`), damit nichts doppelt eingezogen wird.
  Druckseiten (`js/drucken.js`): jedes Blatt ist genau eine A4-Seite mit Briefkopf oben und Fußzeile unten. Knapp zu lange
  Blätter werden etwas enger gesetzt („knapp“); passt es dann noch nicht, teilt `seitenAufbauen()` die Tabelle auf Folgeblätter
  auf (Briefkopf, „Fortsetzung · Seite 2 von 3“, Zwischensumme/Übertrag; Zahlungstext, Gruß und Steuerhinweis stehen immer mit
  mindestens einer Position auf der letzten Seite). Gemessen wird ohne die Handy-Verkleinerung, geprüft wird auch die Blatthöhe
  (≤ 297 mm) – so gibt es nie eine Seite nur mit Fußzeile oder Steuerhinweis und keine Seite ohne Fußzeile.
- **Einstellungen:** Vereinsdaten, Bankverbindung, Steuerhinweis,
  Zahlungsziel, Storno- und Abmeldezeit, Code selbst festlegen (an/aus).

## Mein SSV (Mitgliederbereich)

Im Mitgliederbereich des Hafen-Managers (`../ssv-hafen/mein-ssv.html`) sieht
jedes Mitglied seine Getränkebuchungen, die Summe des Monats, die
Getränkerechnungen (als PDF) neben den Hafenrechnungen und kann seinen Code
ändern oder einen vergessenen Code neu festlegen. In der Demo teilen sich
Kasse und Hafen-Manager den Mitgliederstamm (`../ssv-hafen/js/daten.js`);
fehlt der Ordner, nutzt die Kasse eigene Beispieldaten.

Im Echtbetrieb meldet sich das Mitglied mit seiner E-Mail-Adresse an
(Supabase-Konto). Beim ersten Login wird das Konto über die **bestätigte**
E-Mail mit dem Mitglied verknüpft (`mitglieder.user_id`). Es sieht nur seine
eigenen Rechnungen und Buchungen (Row Level Security).

## Echtbetrieb: eine zentrale Datenbank

Damit iPad und Kassenwart-Laptop dieselben Daten sehen, braucht es eine
Datenbank. `supabase/schema.sql` enthält das fertige, lokal mit PostgreSQL 16
getestete Schema:

- Die Kasse sieht nur Namen und darf nur buchen. Jede Anfrage braucht den
  Geräteschlüssel des freigeschalteten iPads und den Code des Mitglieds.
- Codes werden als bcrypt-Hash gespeichert. Auch der Kassenwart sieht sie nie.
- Preise berechnet ausschließlich die Datenbank, nie das Gerät.
- Rechnungen entstehen atomar, mit fortlaufender Nummer.

Möglicher Betrieb (Entscheidung offen):

1. **Supabase in Frankfurt (eu-central-1)**: eigenes Vereinskonto, im
   kostenlosen Tarif. `schema.sql` im SQL-Editor einspielen, Kassenwart
   anlegen, URL und anon-Key in `js/config.js` eintragen, `modus: 'supabase'`.
2. **Selbst betrieben**: Supabase ist Open Source und läuft z. B. auf einem
   kleinen Server bei einem deutschen Hoster oder auf einem Mini-PC im
   Vereinsheim. Das Schema bleibt dasselbe.

Hosting der Oberfläche: Es reichen beliebige statische Dateien mit HTTPS,
z. B. als Unterordner der Vereins-Website (`/kasse/`). Auf dem iPad in
Safari „Zum Home-Bildschirm“ wählen, dann startet die Kasse im Vollbild.
Für den Dauerbetrieb lässt sich das iPad mit „Geführter Zugriff“ auf die
App festsetzen.

## Offene Punkte für den Verein

- Echte Getränkepreise und Kastengrößen.
- Umsatzsteuer-Hinweis auf der Rechnung mit Kassenwart oder Steuerberater
  klären (Feld „Steuerhinweis“).
- Gläubiger-ID des Vereins und die Mandatsreferenzen der Mitglieder (einmalig aus der bisherigen Verwaltung übernehmen).
- Abrechnungsrhythmus (monatlich, quartalsweise, zum Saisonende).
- Wer hat Kassenwart-Zugänge?

## Dateien

```
index.html          Kasse (iPad)
kassenwart.html     Verwaltung
drucken.html        Rechnungen und Code-Zettel (A4, Druck/PDF)
js/config.js        Modus: demo oder supabase
js/store.js         Datenschicht (Demo- und Datenbank-Speicher, gleiche Schnittstelle)
js/kiosk.js         Kassen-Logik
js/admin.js         Kassenwart-Logik
js/drucken.js       Rechnungslayout inkl. SEPA-Vorabankündigung
supabase/schema.sql Tabellen, RLS, Funktionen
sw.js               Offline-Cache der Oberfläche (Daten werden nie gecacht)
```
