# DIE DREI – Weinbar Kiel · Faktenblatt

Erstellt vom Inhalts-Agenten am 26.10.2026 aus den lokalen Abzügen in `.preview-cache/dd/`.
Regel: Hier steht nur, was in einer Quelle steht – Wortlaut exakt, Quelle je Fakt.
Unbelegtes steht unten unter **Offen / [PLATZHALTER]**. `[sic]` = Fehler im Original, nicht stillschweigend korrigiert.

**Quellenkürzel**

| Kürzel | Datei | Inhalt / Stand |
|---|---|---|
| **H** | `home.md` + `home.html` | Original-Startseite https://diedreibar.de/ (JSON-LD: datePublished 2024-06-12, dateModified 2025-05-08) – **Hauptquelle** |
| **I** | `impressum.html` | Impressum (Roh-HTML; Text daraus extrahiert, `impressum.md` enthält nur das Cookie-Banner) |
| **D** | `datenschutz.md` | Datenschutzerklärung des Originals, Stand „Mai 2025“ |
| **K** | `weinkarte.pdf` | „Karte-Webseite-07.05.2025.pdf“, 9 Seiten; strukturiert in `weinkarte.json` |
| **F** | `falstaff.md` | https://www.falstaff.com/de/weinbars/die-drei-weinbar |
| **RG** | `restaurantguru.md` + `.html` | https://de.restaurantguru.com/DIE-DREI-Weinbar-Kiel-Kiel („Aktualisiert am: Sep 04, 2026“) |
| **TG** | `toogoodtogo.md` | https://www.toogoodtogo.com/de/find/kiel/diedreiweinbar/other/50055690894768672 |
| **MS** | `meinestadt.md` | Branchenbuch-Eintrag (nur ergänzend) |
| **B** | `photos/*.jpg` | Bildbefund – kein Textfakt |

---

## 1. Name und Schreibweisen

| Schreibweise | Wo | Quelle |
|---|---|---|
| **DIE DREI** | Fließtexte, Untertitel „DIE DREI \| Weinbar \| Kiel“, „Dein Team von DIE DREI!“ | H |
| **DIE DREI Weinbar Kiel** | Adressblock (fett) | H |
| DIEDREI | `<title>` der Unterseiten, og:site_name, Footer „© 2026 DIEDREI.“, JSON-LD Organization `name` | H, I, D |
| DIEDREI Weinbar | Footer-Zeile „2024 \| DIEDREI Weinbar \| Kiel“; Ortsname im (gesperrten) Google-Maps-Embed | H |
| DIE DREI \| Weinbar Kiel | `<title>` der Startseite | H |
| DieDreiBar | Fußzeile jeder Seite der Weinkarte | K |
| DIE DREI GmbH & Co. KG | Firma (Impressum, Datenschutz) | I, D |
| DIE DREI Weinbar | Eintragsname | TG |
| die_drei_weinbar | Instagram-Handle | H |

Empfehlung (keine Quelle, Entscheidung offen): im Fließtext „DIE DREI“, rechtlich „DIE DREI GmbH & Co. KG“.
Das Logo (Wortmarke „DIE DREI WEINBAR“, im PDF und in `brand/` sichtbar) ist ein Bildbefund.

## 2. Claim, Untertitel, Team-Zitat, Eröffnung

- **Claim (H1 Hero):** „Jeder Schluck erzählt eine Geschichte.“ — H
- **Untertitel (H2 Hero):** „DIE DREI | Weinbar | Kiel“ — H
- **Team-Zitat** (H2, mit Zeilenumbruch `<br />` nach dem Ausrufezeichen) — H:
  > Dein Team von DIE DREI!
  > Wo Wein und Kultur zusammenfließen.
- **Eröffnungsjahr:** 2024 — H, SEO-Text: „Seit unserer Eröffnung im Jahr 2024 …“; Footer-Zeile „2024 | DIEDREI Weinbar | Kiel“.
  Genaues Datum: nicht belegt (Website-Veröffentlichung laut JSON-LD 2024-06-12 ≠ Eröffnungsdatum).
- **Sommelier:** „Jeder einzelne Wein wurde sorgfältig von unserem erfahrenen Sommelier ausgewählt.“ — H (Name nicht genannt)
- **Laufband-Text im Original:** „Weißwein / Rotwein / Roséwein / Champagner / Prosecco /“ (5× wiederholt) — H
- **Ansprache:** Website durchgehend Du-Form („Deiner Weinbar“, „Du“ großgeschrieben); Impressum/Datenschutz/Cookie-Banner in Sie-Form — H, D

## 3. Kontakt

| Feld | Wert (exakt) | Quelle |
|---|---|---|
| Adressblock Website | **DIE DREI Weinbar Kiel** / Knooper Weg 189 / 24118 Kiel | H |
| Firmenanschrift | DIE DREI GmbH & Co. KG, Knooper Weg 189, 24118 Kiel, Deutschland | I |
| Telefon – Anzeige Website | `0431 / 71978976` (Label im Original: „Phone:“) | H |
| Telefon – Anzeige Impressum | `0431 71978976` | I, D, MS |
| Telefon – international (Drittquelle) | `+49 431 71978976` | RG |
| Telefon – Link | `tel:+4943171978976` | H (Header, Footer, Reservierung) |
| E-Mail | `info@diedreibar.de` (`mailto:info@diedreibar.de`) | H, I, D |
| Domain / canonical | `https://diedreibar.de/` | H |

**Links (exakte URLs aus H):**

| Dienst | URL | Bemerkung |
|---|---|---|
| Instagram | `https://www.instagram.com/die_drei_weinbar/` | H („Besuche uns auf: Instagram“); auch JSON-LD `sameAs` |
| Yelp | `https://yelp.de/biz/WB2g2Ljv48X9yp3cV70TaQ` | H („Bewerte uns auf: Yelp“). Achtung: Der Abzug `yelp.md` dieser URL zeigt nur eine allgemeine Yelp-Trefferliste „Best Weinbar in Kiel …“ ohne DIE DREI → Link vor Übernahme prüfen |
| Google (Unternehmensprofil) | `https://g.co/kgs/jAAEs6p` | H (Icon „google-plus“ in Header/Footer) |
| Weinkarte (PDF, Original) | `https://diedreibar.de/wp-content/uploads/2025/05/Karte-Webseite-07.05.2025.pdf` | H (Button „Öffnen“) |
| Google Maps (Original-Embed, gesperrt) | Ort „DIEDREI Weinbar“, Maps-ID `0x47b257ba03029edf:0x306601647f7bcf98` | H (base64 im Borlabs-Platzhalter) – wird im Neubau NICHT eingebettet |
| Koordinaten (Drittquelle) | 54.33834270, 10.13290660 | RG (JSON-LD `geo`) – nur für einen externen OSM-/Maps-Link, vorher prüfen |

## 4. Öffnungszeiten

**Laut Original-Website (Hauptquelle, H):**

| Tag | Zeit (Wortlaut) |
|---|---|
| Montag | Geschlossen |
| Dienstag | Geschlossen |
| Mittwoch | 17:00 Uhr bis 23:00 Uhr |
| Donnerstag | 17:00 Uhr bis 23:00 Uhr |
| Freitag | 17:00 Uhr bis 23:00 Uhr |
| Samstag | 17:00 Uhr bis 23:00 Uhr |
| Sonntag | 17:00 Uhr bis 23:00 Uhr |

**Abweichungen anderer Quellen (nur als Hinweis, nicht übernehmen ohne Rückfrage):**

| Tag | H (Website) | RG (Text + JSON-LD, Stand Sep 2026) |
|---|---|---|
| Mo | Geschlossen | Geschlossen |
| Di | Geschlossen | Geschlossen |
| Mi | 17:00–23:00 | **17:00–22:00** |
| Do | 17:00–23:00 | 17:00–23:00 |
| Fr | 17:00–23:00 | **18:00–01:00** |
| Sa | 17:00–23:00 | **18:00–01:00** |
| So | 17:00–23:00 | **Geschlossen** |

- F (Falstaff): Im Abzug sind **keine** Öffnungszeiten enthalten.
- MS: „Keine Öffnungszeiten angegeben“.
- RG ist jünger (Sep 2026) als die Website (zuletzt geändert 2025-05-08), aber Drittquelle → **[PLATZHALTER: aktuelle Öffnungszeiten vom Betreiber bestätigen lassen]**. Bis dahin gilt laut Briefing die Website (H).

## 5. Impressum (exakt, aus `impressum.html`)

```
Impressum

Angaben gemäß § 5 TMG:

DIE DREI GmbH & Co. KG
Knooper Weg 189
24118 Kiel
Deutschland

Telefon: 0431 71978976
E-Mail: info@diedreibar.de

Vertreten durch:
DIE DREI Verwaltungs-GmbH (persönlich haftende Gesellschafterin)
Diese vertreten durch den Geschäftsführer: Cecil Pfeifer

Registereintrag:
Eintragung im Handelsregister.
Registergericht: Amtsgericht Kiel
Handelsregisternummer: HRA 12185 KI

Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
DE 364785520

Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
Cecil Pfeifer
Knooper Weg 189
24118 Kiel
```

Fett im Original: „Impressum“, „DIE DREI GmbH & Co. KG“, „DIE DREI Verwaltungs-GmbH“, „Cecil Pfeifer“ (beide Stellen), „DE 364785520“. Die E-Mail ist im Original ein `<a>` ohne `href`.

Hinweise (Rechtsstand, keine Quellenfakten – vor Veröffentlichung prüfen lassen):
- „§ 5 TMG“ ist seit 14.05.2024 durch **§ 5 DDG** ersetzt; „§ 55 Abs. 2 RStV“ seit 07.11.2020 durch **§ 18 Abs. 2 MStV**.
- Bei einer GmbH & Co. KG werden üblicherweise auch Sitz/Registergericht/HRB der Komplementär-GmbH angegeben → **[PLATZHALTER: Sitz, Registergericht und HRB-Nummer der DIE DREI Verwaltungs-GmbH]**.

## 6. Datenschutz des Originals (Kurzbefund, D)

- Sie-Form; Stand „**Mai 2025**“; nennt Verantwortlichen wie Impressum.
- Behandelt Server-Logfiles (Art. 6 Abs. 1 lit. f), Kontakt „per E-Mail oder Kontaktformular“ (ein Kontaktformular gibt es auf der Seite nicht), Weitergabe, Betroffenenrechte (Art. 15, 16, 17, 18, 20, 7 Abs. 3, 77), Widerspruchsrecht, „SSL-Verfahren (Secure Socket Layer)“.
- Nicht erwähnt, aber im Original technisch vorhanden (H): Borlabs Cookie, Google Tag Manager (Site Kit), gesperrter Google-Maps-Embed. Entfällt im Neubau.
- Für den Neubau: eigener Entwurf in `datenschutz-entwurf.html` (Sie-Form).

## 7. Google-Rezensionen der Original-Startseite (wörtlich)

Alle mit Zusatz „via Google Rezensionen“ (H). Sterne aus der Breite des Sternebalkens im HTML (100 % = 5, 80 % = 4).

| # | Name | Sterne | Text (exakt) |
|---|---|---|---|
| 1 | Erich L. | 5 | Was für eine absolut gelungene Location! Sowas habe ich bisher in Kiel nicht erleben dürfen. Sehr geschmackvoll eingerichtetes Ambiente, was einen schon beim Betreten der Bar zum längeren Verweilen animiert. |
| 2 | Nadine S. | 5 | Wir hatten einen schönen Abend mit Freunden. Endlich ein neuer Laden in Kiel … mal anders! |
| 3 | Lea S. | 5 | Sehr schönes Ambiente, freundliches Personal, leckere Kleinigkeiten und eine wirklich nette Chefin. Wir kommen gerne wieder! |
| 4 | Christian S. | 5 | Sehr schöner Abend mit Freunden in der neuen Weinbar, tolles Weinangebot zu fairen Preisen. |
| 5 | Jonathan L. | 5 | Endlich leckere Weine aus der Reihngau in Kiel. **⚠ [sic] „Reihngau“ (gemeint wohl Rheingau) – Entscheidung offen: unverändert / mit [sic] / korrigiert / weglassen** |
| 6 | Dietmar D. | 4 | Wir sind noch am Antesten als Ex-SOTO Stammgast, gute und große Weinauswahl, angenehme und modernes Ambiente, sehr freundlich, kleine Snackauswahl, wir kommen wieder. *(„angenehme und modernes“ [sic]; „SOTO“ unbekannt)* |

## 8. Original-Texte (wörtlich, Material zum Umformulieren)

**Intro 1 (H2):**
> Herzlich willkommen bei DIE DREI, Deiner Weinbar in Kiel, wo sich Lebensfreude und die Faszination für Wein vereinen. Tauche ein in ein Ambiente, das zum Verweilen einlädt und entdecke unsere sorgfältig zusammengestellte Weinkarte.

**Intro 2 (H2):**
> Bei uns erlebst Du die Vielfalt des Weins – von klassischen Rebsorten bis hin zu verborgenen Schätzen kleiner Winzer. Jeder Schluck erzählt eine Geschichte, spiegelt sein Terroir und die Leidenschaft der Winzer wider. Lass Dich von uns auf eine Reise durch die Welt der Weine führen und genieße das besondere Lebensgefühl, das nur ein gutes Glas Wein hervorrufen kann.

**Unsere Bar** — Headline: „Einladend, gemütlich und unvergesslich.“
> Bei uns steht der Genuss im Vordergrund. Egal, ob Du einen langen Tag ausklingen lassen möchtest oder auf der Suche nach einem besonderen Abend bist – in unserer Weinbar in Kiel findest Du genau das Richtige. Unsere gemütlichen Räume laden zum Verweilen ein und bieten den perfekten Rahmen für gesellige Abende. Mit stimmungsvoller Musik und liebevoller Einrichtung schaffen wir eine Atmosphäre, in der Du Dich sofort wohlfühlen wirst. Erlebe unvergessliche Momente in bester Gesellschaft und genieße die besondere Stimmung.

**Unsere Weine** — Headline: „Von Kennern für Genießer.“
> Die Auswahl an Weinen in unserer Weinbar ist etwas ganz Besonderes und einmalig in Kiel. Jeder einzelne Wein wurde sorgfältig von unserem erfahrenen Sommelier ausgewählt. Wir bieten Dir eine abwechslungsreiche Karte mit Weinen aus den besten Anbaugebieten der Welt. Ob Rotwein, Weißwein oder Rosé – bei uns findest Du den perfekten Tropfen für jeden Geschmack. Lass Dich von unserem Team beraten und entdecke neue Lieblingsweine, die Deinen Gaumen verzaubern werden. Unsere Weinkarte lädt Dich ein, eine Reise durch die Welt des Weins zu unternehmen. Entdecke unser vielseitiges Angebot und finde Deinen persönlichen Favoriten. Klicke hier, um unsere Weinkarte als PDF zu öffnen und schon einmal einen Blick auf unser Sortiment zu werfen.

(„einmalig in Kiel“ ist eine Eigenbehauptung des Originals – nur übernehmen, wenn gewünscht.)

**Unsere Weinkarte** — Headline: „Von Klassikern bis zu verborgenen Schätzen.“, Button „Öffnen“ (→ PDF)
> Unsere Weinkarte lädt Dich ein, eine Reise durch die Welt des Weins zu unternehmen. Entdecke unser vielseitiges Angebot und finde Deinen persönlichen Favoriten. Wir haben für Dich eine Auswahl an erlesenen Weinen zusammengestellt, die jeden Anlass zu etwas Besonderem machen. Klicke hier, um unsere Weinkarte als PDF zu öffnen und schon einmal einen Blick auf unser Sortiment zu werfen.

**Gedicht-Zitat (H2; im Original stehen zwei AdobeStock-Bilder inline zwischen den Wörtern – nicht übernehmen):**
> Ein guter Wein ist wie ein Gedicht in einem Glas. Er erzählt Geschichten, weckt Erinnerungen und lädt zum Träumen ein.

(Autor nicht angegeben.)

**Reservierung** — Headline (H1): „Telefonische Reservierung“
> Möchtest Du einen gemütlichen Abend bei uns mit Deinen Liebsten verbringen? Oder planst Du eine größere Feier? Dann freuen wir uns auf Deine telefonische Reservierung:
>
> Phone: 0431 / 71978976

**SEO-Text (Fußbereich, grau, 10 px)** — Überschrift (fett): „Entdecke DIE DREI – Deine Weinbar in Kiel“
> Willkommen bei DIE DREI, Deiner Weinbar in Kiel, wo Weinliebhaber und Genießer auf ihre Kosten kommen. Unsere Weinbar in Kiel bietet Dir eine einzigartige Kombination aus gemütlicher Atmosphäre, sorgfältig ausgewählten Weinen und herzlicher Gastfreundschaft. Seit unserer Eröffnung im Jahr 2024 haben wir es uns zur Aufgabe gemacht, Dir unvergessliche Genussmomente zu bereiten.
>
> In unserer Weinbar in Kiel steht der Genuss im Vordergrund. Unsere gemütlichen Räume laden zum Verweilen ein und bieten den perfekten Rahmen für gesellige Abende. Mit stimmungsvoller Musik und liebevoller Einrichtung schaffen wir eine Atmosphäre, in der Du Dich sofort wohlfühlen wirst. Ob Du einen langen Tag ausklingen lassen möchtest oder auf der Suche nach einem besonderen Abend bist – bei uns findest Du genau das Richtige.
>
> Unsere Weinauswahl in der Weinbar Kiel ist etwas ganz Besonderes. Jeder einzelne Wein wurde sorgfältig von unserem erfahrenen Sommelier ausgewählt. Wir bieten Dir eine abwechslungsreiche Karte mit Weinen aus den besten Anbaugebieten der Welt. Ob Rotwein, Weißwein oder Rosé – bei uns findest Du den perfekten Tropfen für jeden Geschmack. Lass Dich von unserem Team beraten und entdecke neue Lieblingsweine, die Deinen Gaumen verzaubern werden.
>
> Unsere Weinkarte lädt Dich ein, eine Reise durch die Welt des Weins zu unternehmen. Entdecke unser vielseitiges Angebot und finde Deinen persönlichen Favoriten. Klicke hier, um unsere Weinkarte als PDF zu öffnen und schon einmal einen Blick auf unser Sortiment zu werfen.
>
> Planst Du einen gemütlichen Abend mit Deinen Liebsten oder eine größere Feier? Unsere Weinbar in Kiel bietet Dir die perfekte Location. Rufe uns einfach an oder nutze unser Online-Reservierungssystem, um Deinen Tisch zu reservieren. Wir freuen uns darauf, Dich bei uns in der DIE DREI Weinbar Kiel begrüßen zu dürfen.

⚠ Widerspruch: „nutze unser Online-Reservierungssystem“ – ein solches System gibt es auf der Seite nicht; der Reservierungsabschnitt nennt nur Telefon. → Im Neubau nur telefonische Reservierung.

**Meta-Daten des Originals (H):**
- `<title>`: „DIE DREI | Weinbar Kiel“
- meta description: „DIE DREI. Erlebe die Vielfalt des Weins in unserer gemütlichen Weinbar in Kiel. Genieße und entdecke sorgfältig ausgewählte Weine.“
- og:title (2. Satz): „DIEDREI | Deine Weinbar in Kiel“; og:description: „DIEDREI. Erlebe die Vielfalt des Weins in unserer Weinbar in Kiel. Genieße erlesene Weine in gemütlicher Atmosphäre und entdecke sorgfältig ausgewählte Weine von kleinen Winzern.“

## 9. Falstaff (F)

- **Gesamtwertung:** 87 (Punkte; = Summe der Teilwertungen)
- **Teilwertungen:** Weinangebot **44/50** · Service **18/20** · Essen **17/20** · Ambiente **8/10**
- **Beschreibung (exakt):** „Eine Reise durch die Welt des Weins, jeder Schluck voller Geschichten: von Klassikern bis zu verborgenen Schätzen kleiner Winzer sorgfältig kuratierte Tropfen aus den besten Anbaugebieten der Welt. Für den kleinen Hunger: Brotzeit mit Käse und Schinken oder Flammkuchen.“
- **Merkmal:** „Kalte Speisen“
- **Zahlungsmöglichkeiten:** „Bargeld, EC-Karte, Kreditkarte, NFC“
- **Öffnungszeiten:** im Abzug nicht enthalten.
- Jahr/Ausgabe der Bewertung: nicht angegeben → [PLATZHALTER].

## 10. restaurantguru (RG) – Drittquelle

- Kategorie: „Weinbar“ · „#13 von 350 Pubs & Bars in Kiel“
- Google-Bewertung: **4.7/5**, **48** Stimmen (Text „Google (4.7/5) 48“, „48 Stimmen“). JSON-LD `aggregateRating`: ratingValue „4“, reviewCount „48“ (gerundet/abweichend → nicht verwenden).
- Preisspanne pro Person: **€20 - €30** (JSON-LD `priceRange`: „$$$$“).
- „Besonderheiten: **Barrierefrei**“ (Icon Rollstuhl) – unbestätigt.
- Merkmal-Tags aus Gästebewertungen: great selection, guter Service, weinkarte, gemütliche Atmosphäre, käse, tarte flambee, kuchen, wein, bier, craftbier.
- Automatische Zusammenfassung (RG-Text, nicht vom Betreiber): u. a. „Guter Wein ist das, was euch in diese Bar zurückkommen lassen kann. … Durchschnittsbewertung … auf Google ist 4.7 Sterne.“
- 3 sichtbare Google-Rezensionen (Jette Jäkel: Food/Service/Atmosphere 5/5/5, „Price per person: €20–30“, lobt alkoholfreien Wein; lisa möller: negativ, „Service: 1“, erwähnt „draußen“; Jutta Mohwinkel: 5/5/5, „Price per person: €10–20“). Nicht für die Website gedacht.
- Achtung: Die Listen „Leckere Gerichte in Kiel“ und „Restauranteigenschaften in Kiel“ (u. a. „Sitzplätze im Freien“, „Frühstück“, „Lieferservice“) sind **allgemeine Kiel-Links**, keine Merkmale von DIE DREI.

## 11. Weitere Verzeichnisse

- **TG (Too Good To Go):** Eintrag „DIE DREI Weinbar“, Knooper Weg 189, 24118 Kiel; Preisangabe „12,00€4,00€“ (Wert/Preis einer Überraschungstüte); zum Abrufzeitpunkt „Heute kein Angebot“; Tag „Fleisch und Fisch“. → Teilnahme belegt, aber nicht website-relevant ohne Rückfrage.
- **MS (meinestadt):** „DIE DREI GmbH & Co. KG“, Knooper Weg 189, 24118 Kiel, 0431 71978976, info@diedreibar.de, Branche „Restaurant“, „Keine Öffnungszeiten angegeben“.
- **Instagram-Abzug:** nur Login-Wand, keine Inhalte. **Yelp-Abzug:** nur allgemeine Trefferliste (s. o.).

## 12. Weinkarte – Eckdaten (K, Details in `weinkarte.json`)

- Stand: Dateiname „Karte-Webseite-07.05.2025.pdf“; PDF erzeugt 07.05.2025. (PDF-interner Titel lautet „Karten NEU Stand 01.05.2025.xlsx“; das Autor-Feld der PDF-Metadaten enthält einen Personennamen → beim Wiederveröffentlichen ggf. Metadaten bereinigen, Rückfrage.)
- Seiten 1–5 „Übersicht Weine“, 6–9 „Übersicht Getränke“ (auch die Speisen auf S. 9).
- Positionen: Schaumweine 9 · Weißweine 11 (davon Weissweinschorle, Apfelwein) · Roséweine 5 · Rotweine 13 · Süßweine 5 → **41 Weine** (+ Schorle, Apfelwein) laut Stand 07.05.2025. Gesamt 115 Positionen in 17 Rubriken.
- Wein im Glas ab 3,90 € (0,1 l; Apfelwein 0,2 l: 2,90 €), Flaschen von 26,00 € (0,75 l) bis 350,00 € (1999 Château d'Yquem, 0,375 l); größte Formate: Magnum 1,5 l und Jéroboam 3,0 l (Winzer-Champagner, Thierry Tailliet).
- Hauswein: „2022 Muskateller, trocken, Unser Hauswein!“
- Alkoholfrei auf der Karte: Allendorf Rosé alkoholfrei, Heineken 0,0 Vol.%, Paulaner Hefe Weissbier alkoholfrei, Funky Falcon Pale Ale 0,2 Vol.%, Softdrinks/Wasser, Heißgetränke.
- **Flaschen außer Haus (Fußnote S. 5, exakt):** „Alle unsere Weinfalschen können auch außer Haus gekauft werden. Wir gewähren 20% Rabatt auf alle Flaschen unter 60 €.“ – „Weinfalschen“ [sic] (= Weinflaschen).
- Rotary Gin „Blue Squirrel“: „(Erlös für einen guten Zweck)“ – Zweck nicht genannt.

## 13. Speisen (Brotzeit) – Kurzfassung (K, Seite 9)

- **Brotzeit:** Käse allerlei mit Brot und Dip (2 Personen) 16,50 €, … mit Rinderschinken 19,50 € · (1 Person) 8,90 € · zusätzliches Brot zur Käseplatte 3,00 € · Brotkorb – verschiedene Brote mit Dip 6,50 €
- **Flammkuchen:** nach griechischer Art (mit Schmand, Käse, Peperoni) 10,90 € · nach Nordischer Art (mit Schmand, Lachs, Dill) 10,90 € · nach Hähnchen Art (NEU) (mit Schmand und Hähnchen) 10,90 € · der Vegane (mit verschiedenen Gemüsesorten) 12,90 €
- **Warme Speisen (NEU):** Hähnchenbruststücke in Panaeng-Kokos-Curry Sauce mit Reis 14,90 € · Hähnchenbrust in Zitronensauce mit Olivenöl verfeinert, mit Reis 18,90 € · Tomatensuppe mit Brot 6,50 €
- **Knabberkram:** Nussmix 5,00 € · Kleine Brezel 3,00 €
- **Nachtisch:** Aprikose trifft Milchschokolade im Glas (Nuss – Crunch, Vanille und Olivenöl) 5,90 € · Erdbeere Muffin im Glas 5,90 € · Flammkuchen süß mit süßem Schmand, Apfel, Sultaninen & Zimt 12,90 €
- Passend dazu F: „Für den kleinen Hunger: Brotzeit mit Käse und Schinken oder Flammkuchen.“; H-Rezension: „leckere Kleinigkeiten“, „kleine Snackauswahl“.
- „vegan“ ist nur beim Flammkuchen „der Vegane“ ausgewiesen; Allergene/Zusatzstoffe: nicht angegeben.

## 14. Widersprüche und Auffälligkeiten (Sammelliste)

1. **Öffnungszeiten:** H (Mi–So 17–23 Uhr) ≠ RG (Mi 17–22, Do 17–23, Fr/Sa 18–01, So geschlossen). F/MS ohne Angaben.
2. **Reservierung:** H-Abschnitt „Telefonische Reservierung“ vs. SEO-Text „Online-Reservierungssystem“ (existiert nicht).
3. **Kontaktformular** in D erwähnt, auf der Seite nicht vorhanden.
4. **Name:** „DIE DREI“ vs. „DIEDREI“ vs. „DieDreiBar“.
5. **Telefon-Schreibweise:** „0431 / 71978976“ (H) vs. „0431 71978976“ (I, D).
6. **Bewertung:** RG-Text 4.7 vs. RG-JSON-LD „4“; Preisniveau „€20 - €30“ vs. „$$$$“.
7. **Rechtsgrundlagen im Impressum veraltet** (TMG/RStV, s. Abschnitt 5).
8. **Yelp-Link** führt im Abzug nicht zum Profil.
9. **Tippfehler im Original:** „Reihngau“ (Rezension), „Weinfalschen“ (Karte S. 5), „angenehme und modernes“ (Rezension), „Stein- Harfe“ (Karte S. 5), uneinheitliche Akzente in der Karte („Rose“/„Rosé“, „Cuvee“/„Cuvée“, „Superieur“, „dOc“).
10. **PDF-Stand:** Dateiname 07.05.2025 vs. interner Titel „Stand 01.05.2025“.

## 15. Bildbefunde (B) – keine Textfakten

- `22-IMG_9919.jpg`: Außenansicht mit Fensterfront, geöffneten Türen, Bistrotischen und Stühlen auf dem Gehweg, Holzfass mit „DIE DREI“-Logo, Fassadenschriftzug „DIE DREI“ auf beerenfarbener Blende. → Außenplätze sichtbar, aber nicht textlich belegt.
- RG-Rezension (lisa möller) erwähnt „draußen“ – Indiz, kein Beleg.

---

## Offen / [PLATZHALTER]

Nützlich für die Website, aber **nicht belegt** – nur mit Bestätigung des Betreibers verwenden:

- [PLATZHALTER: Öffnungszeiten aktuell bestätigen (Website vs. restaurantguru), inkl. Küchenzeiten/Feiertage/Betriebsferien]
- [PLATZHALTER: Terrasse/Außenplätze – ja/nein, saisonal? (nur Bildbefund Foto 22)]
- [PLATZHALTER: Anzahl Sitzplätze innen/außen; maximale Gruppengröße für „größere Feiern“; exklusive Anmietung möglich?]
- [PLATZHALTER: Barrierefreiheit (Stufe am Eingang? WC?) – nur RG „Barrierefrei“, unbestätigt]
- [PLATZHALTER: Anzahl Weine als Werbeaussage – Karte 07.05.2025 zählt 41 Weine; Aussage veraltet bei Kartenwechsel]
- [PLATZHALTER: Aktualität der Weinkarte/Preise (Stand 07.05.2025) – neuere Karte vorhanden?]
- [PLATZHALTER: genaues Eröffnungsdatum 2024]
- [PLATZHALTER: Name/Vorstellung Sommelier bzw. Team/Inhaberin („Chefin“ nur aus Rezension)]
- [PLATZHALTER: Herkunft „DIE DREI“ – Bedeutung des Namens (nirgends erklärt)]
- [PLATZHALTER: Zahlungsarten – nur Falstaff (Bargeld, EC-Karte, Kreditkarte, NFC); bestätigen]
- [PLATZHALTER: Falstaff-Bewertung – Jahr/Ausgabe, Erlaubnis zur Nennung/Logo-Nutzung]
- [PLATZHALTER: Google-Bewertung (4,7/48) – nur mit Datum nennen oder weglassen; ändert sich laufend]
- [PLATZHALTER: Rezension Jonathan L. – „Reihngau“ unverändert/[sic]/korrigiert/weglassen; Einwilligung zur Namensnennung der Rezensenten?]
- [PLATZHALTER: Too Good To Go – auf der Website erwähnen?]
- [PLATZHALTER: Anfahrt – ÖPNV-Haltestelle, Parkmöglichkeiten (nirgends belegt)]
- [PLATZHALTER: Allergen-/Zusatzstoffkennzeichnung der Speisen]
- [PLATZHALTER: Zweck der Spende „Rotary Gin – Erlös für einen guten Zweck“]
- [PLATZHALTER: Events/Weinproben/Tastings (nirgends erwähnt)]
- [PLATZHALTER: Gutscheine (nirgends erwähnt)]
- [PLATZHALTER: Hosting-Anbieter (Name, Anschrift, Serverstandort, AV-Vertrag) für Datenschutz]
- [PLATZHALTER: E-Mail-Provider des Postfachs info@diedreibar.de; ggf. eingesetztes Reservierungsbuch/-tool]
- [PLATZHALTER: Komplementär-GmbH – Sitz, Registergericht, HRB-Nummer (Impressum)]
- [PLATZHALTER: Rechtliche Prüfung von Impressum (DDG/MStV) und Datenschutzerklärung]
- [PLATZHALTER: Bildrechte der 20 Originalfotos / Fotograf-Credit]
- [PLATZHALTER: Datum „Stand“ der neuen Datenschutzerklärung]
