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

- **Gewicht:** Infrastruktur bis 10 t Gesamtmasse, Wasserliegeplätze ab LP 2 nur bis 10 t, Kranen nur bis 10 t inkl. Zubehör. Die Software sollte das Bootsgewicht prüfen. **Entscheidung des Vereins (Nov. 2026): Kran bis 9 t** (wie auf der Website), Wasserliegeplatz bis 10 t laut HBO – im Hafen-Manager als zwei Einstellungen.
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
- **Stand 10.11.2026 – maßstäblicher Lageplan:** Grundlage ist das amtliche Luftbild DOP20 (20 cm Bodenauflösung) des LVermGeo SH,
  WMS `service.gdi-sh.de/WMS_SH_DOP20col_OpenGBD`, Layer `sh_dop20_rgb`, ETRS89/UTM32N, BBOX 611544.1,5974837.6 – 611944.1,5975137.6
  (400 × 300 m, Gitternord oben). Lizenz CC BY 4.0, Quellenvermerk **„© GeoBasis-DE/LVermGeo SH/CC BY 4.0“** – steht im Plan (Luftbild-Ansicht)
  und im Editor. Datei: `img/luftbild-dop20.jpg`. Abgelesene Stegmaße: Westbrücke 121 m + 50 m (Knick am Bootsschuppen), Ostbrücke 106 m,
  blauer Schwimmsteg quer 19 m – deckt sich mit dem Arbeitsentwurf des Vereins (A 120 m, B 52 m, C 107 m, D 18 m).
  Vom Verein bestätigt: Kran an der Kaimauer am Parkplatz; Slip zwischen Vereinsheim und Opti-Schuppen am Schwimmsteg; Gebäude östlich = Mastenlager + Trecker.
  Offen (Annahme): Platznummern je Steg, Lage „Halle“ H1–H4, Winterlager-Felder, Längsseits-Plätze – der Verein zeichnet das im Lageplan-Editor nach.
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

> **Update (Nov. 2026):** Der Verein möchte easyVerein ablösen. Mitgliederstamm,
> Mitglieder-Login („Mein SSV“) und Einzug laufen dann über den Hafen-Manager
> und die Getränkekasse. Was easyVerein bisher zusätzlich erledigt
> (Beitragseinzug, Aufnahmeantrag, ggf. Verbandsmeldung), muss noch geklärt werden.

## 4. Technische Eckpunkte

- **SEPA:** Aktuelles Format ist pain.008.001.08 (DK-TVS 3.8). Die Altformate pain.008.001.02 enden laut Banken im **November 2026**, die neue Version ist also Pflicht. Alternativ übernimmt easyVerein den Einzug, wenn die API verfügbar ist.
- **Gemeinsame Datenbank** für Hafen-Manager, Getränkekasse, Website-Redaktion und Mitgliederbereich. Das Schema der Kasse (Mitglieder, Rechnungen, RLS) wird erweitert.
- **Rollen:** Vorstand, Kassenwart, Hafenmeister (Gastlieger), Brückenwartin (Dauerlieger, Belegung), Mitglied.

## 5. Quellen

- Vereinsunterlagen: `webseiten/ssv-segelverein/dokumente/` (Gebühren 2024, Hafenbetriebsordnung 10/2020, Satzung 2014)
- Software: corporate.dock24.com/hafenmanager · hafenverwaltung-yabook.de · marinaprofi.de · hafenmeister.app · ausguck.com · netxp-verein.de/funktionen/vereinsarten/segeln · wm-verein-system.de · harba.co · metarina.com
- SEPA: Bundesbank, technische Spezifikationen SEPA-Lastschriften 11/2024 · Commerzbank/Deutsche Bank Formatübersichten
- Lage: visit-luebeck.com · seame.com (Teerhofinsel) · marinas.com

## Nordlager (Angabe des Vereins, Nov. 2026)
- Im nördlichen Lager verläuft ein **Lagerweg in der Mitte**, er endet als **Sackgasse**.
- **Links** (zur Bahn hin) stehen die Boote **in einer Reihe** nebeneinander – nicht in zwei Lagen.
- **Rechts** stehen sie **in zwei Reihen** nebeneinander.
- **Vorne links** stehen sie **schräg in zwei Reihen, mit dem Bug zur Messe** (Vereinsheim).
- Umsetzung im Plan nach dem DOP20 vermessen (Lagerfläche ca. 20–23 m breit, ca. 100 m lang). Weil vorn zwischen Fußweg
  und Lagerweg nur etwa 6 m frei wären, führt der Lagerweg vorn an der Messe vorbei und läuft dann mittig bis zum Ende.
  Rechte Reihen: Boote längs zum Weg (je ca. 8,8 × 4 m). Platzzahl (36) und Lage der „Halle“ H1–H4 sind **[ANNAHME]**,
  bis der Verein sie bestätigt – beides lässt sich im Lageplan-Editor ändern.

## Liegeplätze: 54 statt 79 (Nov. 2026)
- Die Gebührenordnung 2024 nummeriert 79 Plätze (Ost 1–24, West 25–70, Schwimm 71–79), die Website nennt „etwa 80“.
- Auswertung des amtlichen Luftbilds (Bildflug **13.06.2025**, DOP20, Metadaten über `WMS_SH_MD_DOP`): Stege gerade gerückt
  und vermessen – Oststeg 106 m, Weststeg 51 m + 121 m bis zum T-Stück, dahinter versetzt die Schwimmbrücke (ca. 28 m).
  Darauf liegen rund 50 Boote: Ost ca. 15 (Abstand 4–5 m), West ca. 34, Schwimmbrücke ca. 6.
- **Angabe des Vereins:** etwa zwei Drittel – der Plan hat jetzt **54 Plätze**: Ost 1–16 (je ca. 5,5 m), West 25–34 und 35–56
  (je ca. 5,4 m, bis zum T-Stück), Schwimmbrücke 71–76 (je ca. 4,6 m), dazu längsseits L1/L2.
- Die übrigen Nummern (17–24, 57–70, 77–79) sind in der Datenbank nur ausgeblendet (`vorhanden = false`, Nachtrag 12).
- Offen: Welche Nummer an welcher Box hängt, und ob die Website-Angabe „80 Liegeplätze“ angepasst werden soll.

## Angaben des Vereins zum Lageplan (12.11.2026)

- **Westbrücke:** Die vorderen Boxen (nördlicher Teil, am Land) sind die größten, nach hinten werden sie immer kleiner.
  Bootsplätze insgesamt 10–14 m lang und 4–5 m breit. Umgesetzt: Boxtiefe 14 m (Platz 25) gleichmäßig fallend auf 10 m (Platz 56),
  Breite wie bisher aus der Steglänge (rund 5 m je Box).
- **Winterlager West (Parkplatz):** Das Grundstück läuft im Südwesten gerade zum Wasser hinunter (Zaun zum Nachbargrundstück).
  Die Boote stehen vor dem Zaun: je zwei hintereinander Richtung Vereinsheim (Bug zur Messe), vier solcher Reihen nebeneinander
  Richtung Wasser – 8 Plätze P41–P48 mit 12 × 4,5 m. Der Parkplatz ist nach dem amtlichen Luftbild neu umrissen (Hecke zum Weg).
- **Kran:** 10 bis 15 m weiter östlich als bisher gezeichnet, an Land.
- **Hinter dem Wendekreis der Sackgasse (oben rechts):** nur links oben zwei Reihen, etwa 6 Boote, fast bis an den Wendekreis
  (A1–A6). Rechts davon Lagerfläche für Gestelle (alte Gestelle bzw. die Gestelle im Sommer). Davor liegt ein Busch, der auf Höhe
  des Wendekreises etwas weiter rechts beginnt, und rechts davon ein kleiner weiterer Lagerbereich. Eine Bootshalle gibt es dort nicht –
  die Plätze H1–H4 sind aus dem Plan genommen, stehen aber noch in den Stammdaten.
- **Grünfläche östlich vom Masten- und Treckerlager:** Grillplatz rechts neben dem Gebäude, Spielplatz etwa in der Mitte.
- **[ANNAHME]** genaue Lage der Plätze, des Krans, von Grill- und Spielplatz (alles nach Luftbild geschätzt, im Lageplan-Fenster verschiebbar); Ostbrücke (10 m) und
  Schwimmbrücke (8 m) sowie die Maße im Nordlager sind unverändert und noch nicht bestätigt.
- Die Höchstmaße je Liegeplatz für die Gast-Zuweisung („bis 11,0 × 3,7 m“) stehen weiter in den Stammdaten unter „Liegeplätze“
  und wurden nicht verändert.

