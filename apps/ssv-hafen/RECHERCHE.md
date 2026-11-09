# SSV Hafen-Manager – Recherche (Stand 09.11.2026)

Grundlage für die gemeinsame Planung. Noch nichts gebaut.

## 1. Was die Vereinsunterlagen schon festlegen

### Liegeplätze (Gebührenordnung 2024, „Liegeplätze und Boxen“)

| Brücke | Box I | Box II | Box III | Summe |
|---|---|---|---|---|
| Ostbrücke | Nr. 1–16, 18–24 | Nr. 17 | – | 24 |
| Westbrücke | Nr. 63–70 | Nr. 25–62 | – | 46 |
| Schwimmbrücke | – | Nr. 72, 74, 77–79 | Nr. 71, 73, 75, 76 | 9 |
| **Summe** | **31** | **44** | **4** | **79** + Längsseits (Spezialtarif) |

Die Website nennt „etwa 80 Liegeplätze“, das passt. Welche Box für welche
Bootsgröße steht, steht nicht in den Unterlagen.

### Gebühren 2024 (inkl. MwSt., Einzug per Lastschrift)

| Posten | Box I | Box II | Box III |
|---|---|---|---|
| Ausübende/Probe: Sommerliegegebühr | 92 € | 60 € | 40 € |
| Ausübende/Probe: Umlage Wasserpacht | 45 € | 30 € | 18 € |
| Fördernde: Sommerlieger (Saison) | 580 € | 500 € | 400 € |
| Gäste: Sommerlieger (Saison) | 745 € | 635 € | 515 € |

- Gäste, einzelne Übernachtung: 15 €
- Stromumlage (Ausübende/Probe): 75 €
- Landstellplatz außen 4 €/m², Halle 6 €/m² (nur Winter), Palette 100 €/Halbjahr; nur für ausübende und Probemitglieder
- Sommer an Land: Ab dem 2. durchgehenden Sommer an Land verdoppelt sich die Sommergebühr gegenüber dem Vorjahr (+100 % je Jahr).
- Schlüsselpfand 50 €, Mastenkran 25 €/angef. Stunde, Schiffskran 75 €/angef. Stunde
- Einzug: Sommer nach dem Auslagern, Winter nach dem Einlagern
- Saison-Gastlieger melden sich online an, Tageslieger beim Hafenmeister.

### Hafenbetriebsordnung (Stand 10/2020) – relevant für die Software

- **Gewicht:** Infrastruktur bis 10 t Gesamtmasse, Wasserliegeplätze ab LP 2 nur bis 10 t, Kranen nur bis 10 t inkl. Zubehör. Die Software sollte das Bootsgewicht prüfen.
- **Versicherungspflicht** (Personen-, Sach-, Umweltschäden, Bergung): Nachweis samt Ablaufdatum erfassen.
- **An- und Abmeldung von Booten** ist Pflicht, Bootsverkauf sofort melden, und die Übergabe an den neuen Eigner findet nur im Wasser statt.
- **Abwesenheit:** Bei längeren Fahrten wird das Liegeplatzschild auf **grün** gedreht und die Abwesenheit dem Hafenmeister oder der Brückenwartin gemeldet, „auch durch Eintragung in eine geeignete Liste“. Das ist der perfekte Fall für eine digitale Lösung.
- **Winterlager:** Boote stehen nur auf vereinseigenen Schiffspaletten, dazu gibt es ein Mastenlager. Boote, die beim Auslagern nicht gekrant werden sollen, müssen 1 Woche vorher gemeldet werden.
- **Ein-/Auslagern** in Gemeinschaftsarbeit: Die Reihenfolge richtet sich nach dem **Belegungsplan**.
- **Kfz-Kennzeichen** sollen über die Vereinssoftware hinterlegt werden.
- **Brückenwart** darf Boote verlegen, der **Hafenmeister** betreut die Gastlieger.

### Satzung

- Jedes ausübende Mitglied hat im Rahmen der Möglichkeiten **Anspruch auf einen Liegeplatz** (§ 10 I), daher braucht es eine Warteliste.
- **Arbeitsdienst-Pflicht**: Ab 25 Fehlstunden folgen Aufforderungen, im letzten Schritt die Rückstufung auf fördernd (§ 10 II).
- Mitgliedsarten: ausübend, Probe (max. 3 Jahre), fördernd, Jugend, Ehrenmitglied.
- Bootsdaten und Bankverbindung werden laut Satzung schon heute erhoben (Datenschutz-Absatz).

## 2. Lage (für den Hafenplan)

- Zur Teerhofsinsel 5B, 23554 Lübeck, nördlicher Travearm („Altes Fahrwasser“), 53°54'41" N, 10°42'04" O. In einigen Verzeichnissen wird die Adresse auch Bad Schwartau zugeordnet.
- Luftbild-Auswertung: `recherche/luftbild-zuordnung-entwurf.jpg`. Zu erkennen sind ein langer Steg westlich des Vereinsheims, ein Steg östlich davon und ein kurzes Stück am Westende. Die Zuordnung zu Ost-, West- und Schwimmbrücke ist **geschätzt** und muss vom Verein bestätigt werden.
- Für die App zeichne ich einen eigenen, schematischen Hafenplan (SVG). Das Luftbild dient nur als Zeichenvorlage. „Anfahrt“ und „Route“ laufen wie vereinbart über Google Maps und Apple Karten.

## 3. Was vergleichbare Programme können (Marktüberblick)

Ausgewertet: DOCK24 Hafenmanager, Yabook, Marinaprofi, Hafenmeister.App, Ausguck,
netXP-Verein (Segeln), WM-Verein (Yachtclubs), Harba, Metarina, ITN.

| Funktion | Verbreitung | Für den SSV |
|---|---|---|
| Digitaler Hafenplan mit Status-Farben (belegt, frei, reserviert, gesperrt) | Standard | ja |
| Freiplatz-Prognose, „Platz frei solange Eigner unterwegs“ | mehrere | ja, entspricht dem grünen Schild |
| Gastlieger: Datumssuche, Rechnung, Online-Buchung oder QR-Code am Steg | Standard | Tageslieger ja, Online-Buchung optional |
| Warteliste mit Bootsmaßen, automatischer Platzvorschlag | Harba u. a. | ja (Anspruch laut Satzung) |
| Boots-Stammdaten, Prüfung Boot passt zum Platz | Standard | ja, inkl. 10-t-Grenze |
| Kran-/Slip-Termine | Hafenmeister.App u. a. | ja: Ein-/Auslager-Belegungsplan |
| Abrechnung Liegeplatz + Strom + Nebenkosten, SEPA-Lastschrift, Mahnwesen | Standard | ja |
| Arbeitsdienst-Stunden, Fehlstunden abrechnen | netXP-Verein | optional |
| Kurtaxe-Berechnung für Gäste | DOCK24 | für Lübeck wohl nicht nötig, prüfen |
| Eigner-App / Mitgliederportal | mehrere | „Mein SSV“ |

easyVerein hat laut allen gefundenen Beschreibungen **keine eigene
Liegeplatzverwaltung**. Der Hafen-Manager ergänzt easyVerein also und
ersetzt es nicht.

## 4. Technische Eckpunkte

- **SEPA:** Aktuelles Format ist pain.008.001.08 (DK-TVS 3.8). Die Altformate pain.008.001.02 enden laut Banken im **November 2026**, die neue Version ist also Pflicht. Alternativ übernimmt easyVerein den Einzug, wenn die API verfügbar ist.
- **Gemeinsame Datenbank** für Hafen-Manager, Getränkekasse, Website-Redaktion und Mitgliederbereich. Das Schema der Kasse (Mitglieder, Rechnungen, RLS) wird erweitert.
- **Rollen:** Vorstand, Kassenwart, Hafenmeister (Gastlieger), Brückenwartin (Dauerlieger, Belegung), Mitglied.

## 5. Quellen

- Vereinsunterlagen: `webseiten/ssv-segelverein/dokumente/` (Gebühren 2024, Hafenbetriebsordnung 10/2020, Satzung 2014)
- Software: corporate.dock24.com/hafenmanager · hafenverwaltung-yabook.de · marinaprofi.de · hafenmeister.app · ausguck.com · netxp-verein.de/funktionen/vereinsarten/segeln · wm-verein-system.de · harba.co · metarina.com
- SEPA: Bundesbank, technische Spezifikationen SEPA-Lastschriften 11/2024 · Commerzbank/Deutsche Bank Formatübersichten
- Lage: visit-luebeck.com · seame.com (Teerhofinsel) · marinas.com
