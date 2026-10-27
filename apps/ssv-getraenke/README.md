# SSV Getränkekasse

iPad-Kasse für den Getränkekasten im Schwartauer Segler-Verein: Mitglied
suchen → 4-stellige PIN → Getränk antippen → Menge oder ganzer Kasten →
buchen. Der Kassenwart rechnet per Knopfdruck ab und bekommt fertige
A4-Rechnungen mit GiroCode, SEPA-Liste und CSV-Export.

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

Die Demo bringt 24 erfundene Mitglieder (PIN überall `1234`), 8 Getränke
mit **Beispielpreisen [PLATZHALTER]** und rund 10 Wochen Buchungsverlauf
mit.

## Ablauf an der Kasse

| Schritt | Was passiert |
|---|---|
| Wer bucht? | Namensliste mit A–Z-Leiste und Suchfeld |
| PIN | 4 Ziffern, nach 5 Fehlversuchen 5 Minuten gesperrt |
| Getränke | Kacheln mit Preis; antippen → 1–6 Stück oder 1–2 Kästen |
| Bon | Mehrere Getränke sammeln, dann „Jetzt buchen · 13,00 €“ |
| Fertig | „Prost, Jan!“, Monatssumme, Abmeldung nach 6 s |
| Fehlbuchung | „Meine Buchungen“ → innerhalb von 15 Minuten selbst rückgängig machen |

Nach 60 Sekunden ohne Eingabe meldet sich die Kasse von allein ab.

## Kassenwart-Bereich

- **Übersicht:** Monatsumsatz, offene Beträge, meistgebuchte Getränke.
- **Mitglieder:** anlegen, CSV-Import (z. B. Export aus easyVerein), PIN
  vergeben. Eine PIN wird nur einmal angezeigt und ist danach nur
  verschlüsselt gespeichert. PIN-Zettel lassen sich drucken (10 pro A4-Seite).
- **Getränke & Preise:** Kacheln, Symbol, Farbe, Stück- und Kastenpreis.
- **Buchungen:** Filter, Storno, Nachtragen, CSV-Export.
- **Abrechnung:** Zeitraum wählen (letzter Monat, Quartal, Saison …),
  Vorschau prüfen, Rechnungen erstellen. Jede Buchung wird genau einmal
  abgerechnet, die Rechnungsnummern laufen fortlaufend (`SSV-G-2026-0001`).
  Danach: drucken oder als PDF sichern (mit Anlage der Einzelbuchungen),
  als bezahlt markieren, stornieren, E-Mail-Entwurf öffnen, SEPA-Liste und
  Rechnungsliste als CSV.
- **Einstellungen:** Vereinsdaten, Bankverbindung, Steuerhinweis,
  Zahlungsziel, Storno- und Abmeldezeit.

## Echtbetrieb: eine zentrale Datenbank

Damit iPad und Kassenwart-Laptop dieselben Daten sehen, braucht es eine
Datenbank. `supabase/schema.sql` enthält das fertige, lokal mit PostgreSQL 16
getestete Schema:

- Die Kasse sieht nur Namen und darf nur buchen. Jede Anfrage braucht den
  Geräteschlüssel des freigeschalteten iPads und die PIN des Mitglieds.
- PINs werden als bcrypt-Hash gespeichert. Auch der Kassenwart sieht sie nie.
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
- Bankverbindung und IBAN des Vereins.
- Abrechnungsrhythmus (monatlich, quartalsweise, zum Saisonende).
- Wer hat Kassenwart-Zugänge?

## Dateien

```
index.html          Kasse (iPad)
kassenwart.html     Verwaltung
drucken.html        Rechnungen und PIN-Zettel (A4, Druck/PDF)
js/config.js        Modus: demo oder supabase
js/store.js         Datenschicht (Demo- und Datenbank-Speicher, gleiche Schnittstelle)
js/kiosk.js         Kassen-Logik
js/admin.js         Kassenwart-Logik
js/drucken.js       Rechnungslayout, GiroCode (EPC-QR)
js/qrcode*.js       QR-Bibliothek (Kazuhiko Arase, MIT)
supabase/schema.sql Tabellen, RLS, Funktionen
sw.js               Offline-Cache der Oberfläche (Daten werden nie gecacht)
```
