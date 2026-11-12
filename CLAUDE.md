# Web-Projekte – Wegweiser

Repo für alle Website-Projekte. Struktur:

## `webseiten/` – fertige, gebaute Websites
- `webseiten/innoweb/` – Agentur-Website (Quiet Luxury, Gold/Nachtblau, Video-Heros) · PR #3
- `webseiten/room23-tattoo/` – Tattoo-Studio Lübeck (Tannengrün/Bronze, echtes IG-Logo) · PR #4
- `webseiten/buchtquartier/` – Ferienvermietung Lübecker Bucht (Sand/Nautik-Blau) · PR #5
- `webseiten/strandgruen/` – Golfresort Timmendorfer Strand (Premium-Baukasten,
  Tannengrün/Elfenbein/Messing, Original-Bilder via Asset-Bridge) · PR #7
- `webseiten/myimmoapp/` – MyImmo-SaaS für private Vermieter (Premium-Estate v2,
  Fraunces/Outfit, Gold/Charcoal, Higgsfield-Video-Hero + Scroll-Scrub,
  echte App-Screenshots) · PR #8
- `webseiten/ssv-segelverein/` – Schwartauer Segler-Verein e.V., Lübeck (Stander-Marine/
  Rot, Playfair/Inter lokal, Original-Fotos). **Mit Redaktionszugang** `/verwaltung/`:
  Hinweis-Banner, Aktuelles, Termine, Zeiten & Preise, Fotos, Startbild, Vorstand,
  Zahlen – gepflegt ohne neues Deployment (`js/cms.js`, `supabase/website.sql`).
  Generator `baukaesten/quiet-luxury/generatoren/build_ssv.py`. Noch Demo-Modus.
  **easyVerein ist raus** (Wunsch des Nutzers): Aufnahmeantrag vorerst per E-Mail,
  Fußzeile/Menü/Dokumente verlinken „Mein SSV“ (`MEIN_SSV` im Generator, Vorschau `../ssv-hafen/`).

## `apps/` – Web-Apps
- `apps/ssv-getraenke/` – Getränkekasse für den SSV: iPad-Kiosk (Name → PIN → Kacheln →
  Stück/Kasten), Kassenwart-Bereich (Mitglieder, CSV-Import, PIN-Zettel, Preise,
  Abrechnung, A4-Rechnungen im persönlichen Ton mit Lastschrift-Ankündigung, SEPA-/CSV-Export). Demo-Modus (localStorage);
  Gestaltung wie Hafen-Manager: dezenter Nautik-Stil am Ende von `css/app.css` (nur `@media screen`, Rechnungen `r-…` unberührt);
  Code (4-stellig) legt das Mitglied beim ersten Mal selbst fest (Mitgliedsnummer-Abfrage, abschaltbar),
  ändern in „Mein SSV“; Demo teilt den Mitgliederstamm mit `../ssv-hafen/js/daten.js` (gleiche IDs);
  Datenbankschema `supabase/schema.sql` lokal getestet, **nichts deployt** – auf
  Wunsch des Nutzers keine Verknüpfung mit bestehenden Supabase-/Vercel-Projekten.
- `apps/ssv-hafen/` – Hafen-Manager für den SSV (Prototyp, Demo-Modus): SVG-Hafenplan nach
  amtlichem Luftbild (54 Plätze laut Verein Nov. 2026: Ost 1–16, West 25–56 bis zum T-Stück, Schwimmbrücke 71–76, dazu L1/L2; Lage der Nummern = Annahme), Belegung
  Sommer/Winter, grünes Schild, Gastlieger + QR-Anmeldung, Warteliste, Kran, Arbeitsdienst,
  Abrechnung nach Gebührenordnung 2024, SEPA-XML pain.008.001.08 (XSD-geprüft), „Mein SSV“ für jedes
  Mitglied (Hafen- + Getränkerechnungen, grünes Schild, Getränke-Code ändern; lädt `../ssv-getraenke/js/store.js`).
  **Ersetzt easyVerein:** Mitgliederstamm (Arten laut Satzung, Geburtsdatum/Geschlecht/Eintritt), CSV-Import,
  Online-Aufnahmeantrag `aufnahme.html` → Vorstand nimmt auf, Beitragseinzug (Gebührenordnung 2024, `SSV-B-…`),
  Verbandsmeldung (Bestandserhebung 1.1.). Website verlinkt Antrag + Mein SSV (`../ssv-hafen/`).
  Menü: 7 Bereiche (`BEREICHE` in `js/app.js`; „Betrieb“ heißt jetzt „Arbeit & Termine“) mit Reitern oben, Zurück-Taste über `#tab`-Verlauf.
  Hafenplan maßstäblich (1000 × 750 Einheiten = 400 × 300 m) aus einem Lageplan-Datensatz (`STANDARD` in `js/plan.js`, eigener Plan des Vereins in
  `einstellungen.lageplan`, Zeichenfenster `js/plan-editor.js`); Luftbild `img/luftbild-dop20.jpg` = amtliches DOP20, Quellenvermerk
  „© GeoBasis-DE/LVermGeo SH/CC BY 4.0“ muss sichtbar bleiben (Details `RECHERCHE.md`).
  Arbeitsdienst: 12 Arbeitsgruppen laut Vorstand (Vorlage `js/bereiche-vorlage.js`, live eingespielt), Aufgaben je Gruppe mit `pos` (Aktionsliste),
  `art` aufgabe|besorgen, `erledigt` (Datum) im jsonb `arbeitsbereiche.aufgaben`; Ansicht „Arbeitsgruppen“ mit Gruppen/Aufgabenliste/Einkaufsliste.
  **Hafenkarte (Nov. 2026, Plan/Recherche `PLAN-HAFENKARTE.md`):** `PLAN.zeichnen` malt Wasser mit Tiefenzonen, Holzstege, Boote in echter Größe
  (`bootSvg`, aus Länge/Breite des Boots; Gäste gelb, Saison-Gäste lila, im Winter mit Plane) und je Platz eine **Boje als Ampel**
  (grün pulsierend = frei/grünes Schild, rot = belegt, grau = gesperrt/zu klein); Schwebekarte beim Zeigen, Abendansicht (`opts.abend`),
  Maßstab/Nord als feste Einblendung (`.plan-mass`). Bewegt wird nur transform/opacity; Schaukeln nur in der Nahansicht (gemessen: sonst ruckelt es auf älteren Geräten).
  Optionen: `opts.wasser(p) → { status, boot, gast }` (eigene Belegung, z. B. Zeitraum), `opts.karte(id)` (Inhalt Schwebekarte), `opts.daten = { liegeplaetze }`
  (Seiten ohne Vereinsdaten), `opts.entwurf` (zeigt neue Plätze gestrichelt gelb).
  **Einzelne Plätze im Lageplan:** `stege[].aus[Nr] = { b, t (Meter), l, q (frei verschoben, Plan-Einheiten längs/quer zum Steg), w (Drehung), weg }`,
  `lager[].aus[Index] = { mx, my, w, h, neig, weg }`, Einzelbox = `laengs[]` (jetzt mit Breite `h`), Einzel-Lagerplatz = Lagerfeld mit Anzahl 1.
  Zeichenfenster: Box/Lagerplatz antippen = einzeln wählen (ziehen, Griffe für Maße, Entf = entfernen, „wieder einsetzen“ am Steg/Feld);
  ist ein Lagerfeld gewählt, verschiebt Ziehen das ganze Feld. Neue Nummern legt `plaetzeAnlegen()` nach Rückfrage als Liege-/Landplatz an
  (`zeilen()` schreibt `liegeplaetze.vorhanden = true`, damit ein nach Nachtrag 12 ausgeblendeter Platz wieder erscheint).
  **Planungen:** `einstellungen.lageplan_planungen = [{ id, name, plan, stand }]` – Entwürfe neben dem gültigen Plan (Auswahl `#plan-wahl`,
  „Gültig schalten“ tauscht und sichert den bisherigen Plan als Planung). **Plan drucken:** `planDrucken()` baut eine Druckseite im SSV-Briefkopf
  (Flagge links, Adresse rechts) mit Legende und Belegungsliste (A4/A3 quer, „hell“ spart Tinte).
  **Gäste → „Karte & Kalender“** (`V.gastkarte`): Anreise + Nächte → Karte mit `zeitraumLage()`, Platz antippen → Monatskalender des Platzes,
  „Gast hier eintragen“; Kalender = Zeitleiste je Platz (`tagLage()`: Dauerlieger, grünes Schild aus Mein SSV, Gast), freien Tag antippen = Gast eintragen.
  **Öffentliche Karte `hafenplan.html`** (Deutsch/Englisch/Dänisch, `?einbetten=1` für die Website): zeigt nur frei/belegt je Platznummer und Boxmaße,
  keine Namen, belegte Plätze bekommen ein beliebiges Boot. Vom Vorstand schaltbar: Einstellungen → `karte_oeffentlich` (aus = Standard | heute | vorschau)
  und `karte_tage` (höchstens 60); Datenbank-Funktion `hafen_karte(p_von, p_naechte)` (Nachtrag 17, für anon).
  **Auf der Website eingebettet:** `hafen.html` Abschnitt `#plaetze` (`HAFENKARTE` im Generator, `js/hafenkarte.js`, Rahmen `<iframe …?einbetten=1>`):
  die Karte meldet Höhe und Zustand per `postMessage` (nur gleiche Herkunft); bei „aus“/Fehler/fehlender Seite entfernt sich der Abschnitt selbst.
  Gast wählt einen Platz → „Hier anmelden“ (`target=_top`) → `gast.html?platz=…&ankunft=…&naechte=…` ist vorbelegt. Geht nur, solange Website und
  Hafen-Manager unter derselben Adresse liegen (`X-Frame-Options: SAMEORIGIN` in `vercel.json`).
  Hafenplan-Kamera `HAFEN_PLAN.kamera(svg)` (Ziehen, Mausrad/Kneifen, Doppeltipp, Trägheit, Vollbild, Ausschnitt bleibt in `planStand.vb`),
  **Handy (Vorgabe des Nutzers):** Karte füllt ihren Rahmen immer ganz – Herauszoomen endet am Plan, kein Schieben über den Rand (`passend()`), Rahmen am Handy quadratisch;
  Finger nicht mit `setPointerCapture` binden (löst `lostpointercapture` aus und brach das Wischen ab – nur Maus/Stift), `touch-action: none` auch am Rahmen `.plan-flaeche.mit-kamera`;
  Seiten haben `minimum-scale=1` (kleiner zoomen geht nicht, hinein schon) und `overscroll-behavior: none` (kein Gummiband, kein Ziehen-zum-Neuladen); die Karte hält `touchmove` selbst fest.
  Tests `t_touch.js` (Wischen/Kneifen mit echten Touch-Ereignissen), `t_webkarte.js` (Website → Platz wählen → Anmeldung vorbelegt). Auftakt-/Wellen-/Schaukel-Animationen per CSS (aus bei „Bewegung reduzieren“).
  **Laut Verein (Nov. 2026):** Westbrücke – vorne (am Land) die großen Boxen, nach hinten gleichmäßig kleiner (14 m … 10 m lang, 4–5 m breit):
  Steg-Felder `tiefe` (Boxtiefe am Anfang) und `tiefe2` (am Ende), dazwischen stuft `plaetzeVon()` gleichmäßig ab. Ostbrücke (10 m) und Schwimmbrücke (8 m) unverändert – noch nicht bestätigt.
  Winterlager West (Parkplatz): **8 große Plätze P41–P48** (12 × 4,5 m), zwei Reihen nebeneinander, Boote hintereinander mit dem Bug zur Messe/Vereinsheim; die Fläche zum Kran bleibt frei
  (Lage auf dem Parkplatz = Annahme). P49–P60 entfallen (Nachtrag 18; Demo räumt selbst um). Nordlager-Maße unverändert (3,6 × 7,6 m u. a.) – offen, ob auch dort 10–14 m gelten.
  Nordlager laut Verein: Lagerweg mittig als Sackgasse (vorne an der Messe vorbei), links eine Reihe P11–P22, rechts zwei Reihen P23–P36, vorne links zwei schräge Reihen P01–P10 mit Bug zur Messe (Lager-Felder `neig`/`bug`/`lw`/`lh`).
  Gewichtsgrenzen nur über die Einstellungen: **Kran 9 t** (`kran_max_t`, Entscheidung des Nutzers, so auch auf der Website) und **Steg/Wasserliegeplatz 10 t** (`max_gewicht_t`, HBO 3.1.4); `Q.maxT(art)/Q.zuSchwer(b, art)/Q.maxTxt(art)` mit art 'kran' (Standard) | 'steg' (nur `Q.passt` für Wasserplätze).
  Gastlieger: Status wird aus Daten berechnet (`gastLage()` in app.js: Aufenthalt/Platz/Zahlung, Ansichten Heute & offen/Anreisen/Im Hafen/Abreisen/Archiv);
  Finanzen: Reiter „Übersicht“ (`V.finanzen`, liest die Getränkekasse über `window.SSV.speicher` – index.html lädt dafür `../ssv-getraenke/js/store.js`), Rechnungskette `stufe()`/`kette()` mit „Gutschrift ist da“ je SEPA-Lauf;
  Sicherung zurückspielen: `HAFEN.sicherungLesen()/zurueckspielen()` (nur Vorstand, über den normalen Speicherweg – Mitglieder/Rechnungen werden nie gelöscht).
  Mitgliedsakte `mitgliedAkte(m)` (Zeilenklick; Verlauf über `HAFEN.verlauf({ datensaetze })` für Mitglied+Boote+Belegungen+Rechnungen+Stunden), Bearbeiten → `mitgliedForm` → zurück zur Akte;
  Gebührenordnung in Fassungen (`d.gebuehren[jahr]` = gültig ab Saison, `fassungen()`), Abrechnung als 5-Schritte-Ablauf (Prüfliste, Zustell-Vermerk `einstellungen.abrechnung_zugestellt['periode-jahr']`).
  Gestaltung: dezenter Nautik-Stil am Ende von `css/hafen.css` (nur `@media screen`: Seekarten-Gradnetz, Tau-Linien in Messing `--tau`, Kompassrose `--kompass`, Wellenkanten `--wellen-hell`; Druck/PDF unberührt).
  Veranstaltungen (Betrieb → Veranstaltungen, Vorstand/Kassenwart/Brückenwartin): Mitglieder sagen in „Mein SSV“ zu/ab (Frist, Begleitung, max. Plätze – Regeln doppelt in `HAFEN.zusageSetzen` und SQL `meine_zusage`), Teilnehmerliste mit Druck/CSV, Antworten vom Verein `quelle = 'verein'`, vom Getränke-iPad `quelle = 'kasse'` (Kiosk zeigt nach Code-Anmeldung Einladungen, `S.kasseVeranstaltungen/kasseZusage`); „Kosten abrechnen“ erzeugt je Zusage eine Rechnung `SSV-V-…` (periode `veranstaltung`).
  Kontoauszug (Finanzen → Kontoauszug, Vorstand/Kassenwart): `js/kontoauszug.js` liest CAMT.053/CSV (Windows-1252 erkannt) und ordnet zu (Rechnungsnr. im Verwendungszweck/End-to-End, Sammellastschrift `SSV-SEPA-…` oder Betrag, Rücklastschrift, Gast Bootsname+Betrag, Mitglied per IBAN/Name = Vorschlag); gebucht wird in `zahlungen` mit `ref` = Umsatz-Schlüssel (kein Doppelbuchen), Getränke über `SSV.speicher.rechnungBezahlt`.
  Rechnungen per E-Mail: Edge Function `rechnung-mail` (deployt; Quelle `supabase/functions/rechnung-mail`, Inhalt/PDF in `inhalt.js` mit pdf-lib) – Browser schickt nur IDs, Adresse kommt serverseitig aus `mitglieder.email` des Rechnungs-Mitglieds, `erwartet` (beim Prüfen gesehene Adressen) muss übereinstimmen, je Mail genau 1 Empfänger + 1 PDF, Protokoll `rechnung_versand`; Mail-Dienst Brevo/Resend per Secrets `MAIL_API_KEY`/`MAIL_ABSENDER` (noch einzutragen). Dialog `mailVersandDialog()` in app.js (Abrechnung Schritt 3, Zeilenmenü, Veranstaltung) und `mailDialog()` in ssv-getraenke/js/admin.js; Demo vermerkt nur im Browser.
  Verständlichkeit (Zielgruppe 50+): Suche „Was suchen Sie?“ (`sucheOeffnen()` in app.js, Strg+K oder „/“, Knopf in Seitenleiste/Kopfleiste) findet Aufgaben (`AUFGABEN` mit Alltagswörtern), Hilfe in Schritten (`HILFE`), Seiten und Datensätze je Rolle – Umlaute/Tippfehler egal; Mein SSV hat „Was möchtest du tun?“ (`TUN`/`FRAGEN` in mein.js);
  Lesbarkeits-Ebene am Ende von `css/hafen.css` und `ssv-getraenke/css/app.css` (16 px Grundschrift, Knöpfe ≥ 40 px, keine Mini-Großbuchstaben), Schalter „Schrift größer“ (`html.schrift-gross`, localStorage `ssv-schrift-gross`, gilt geräteweit); lange `.hinweis`-Texte klappt `einklappen()` hinter „Erklärung anzeigen“ (Warnungen/Hinweise mit Knöpfen nie), lange Untertitel zeigen erst den ersten Satz.
  Tabellen: eine Hauptaktion je Zeile, Rest im ⋯-Menü (`zeilenMenue()`, fest positioniert); Übersicht max. 5 Punkte je Gruppe, Etikett = Thema.
  **Alle Druck-/PDF-Seiten im SSV-Briefkopf: Flagge oben links + Vereinsadresse rechts** (`kopf` in `js/drucken.js`, `druckKopf()` in app.js für direkt gedruckte Seiten) – Vorgabe des Nutzers.
  Recherche/Annahmen: `RECHERCHE.md`, `PLAN.md`.
  **Echtbetrieb-Konten (nur SSV, getrennt von allen anderen Projekten):**
  Supabase Org „SSV Manager“, Projekt `jprpgadcycaawxlyozkm` (Frankfurt) – Schema aus
  `apps/ssv-hafen/supabase/ssv-komplett.sql` eingespielt (Kasse + Website + Hafen/Mitglieder, RLS je Rolle).
  Bestehende DB nachziehen mit `nachtrag-01…18.sql` (05 = Kasse ohne Netz, `kasse_buchen_nach` mit Kennung; 06 = Arbeitseinsätze/QR, Mitteilungen, Push-Tabellen; 07 = Gast gibt Platz vom grünen Schild an und bezahlt sofort, `gast_zahlung_melden`; 08 = Arbeitsbereiche + Zuordnung, `meine_arbeitsbereiche`; 09 = Toilettencode `gast_toilette` + `gast_status`; 10 = eindeutiger Index `hafen_rechnungen_einmal` gegen doppelte Rechnungen; 11 = Lagerplätze Nordlager P01–P36, West → P41–P60; 12 = Spalte `liegeplaetze.vorhanden`, 17–24/57–70/77–79 ausgeblendet (nicht gelöscht, beim Laden gefiltert); 13 = `veranstaltungen` + `zusagen`, RPC `meine_zusage`/`meine_veranstaltungen`; 14 = Rechnungsart `veranstaltung` + `hafen_rechnungen.veranstaltung_id`, Index `hafen_rechnungen_einmal` ohne Veranstaltungen; 15 = Versandprotokoll `rechnung_versand` (nur Edge Function schreibt); 16 = Zusage am Getränke-iPad `kasse_veranstaltungen`/`kasse_zusage` (Gerät+Code), gemeinsame Regeln `_zusage_setzen`; 17 = öffentliche Hafenkarte `hafen_karte` (in der Live-Datenbank, geprüft 12.11.2026); 18 = Winterlager West nur noch P41–P48, löscht unbelegte P49–P60 (**noch nicht in der Live-Datenbank**); Gäste zahlen per GiroCode/EPC-QR `H.epc()`); Edge Function `push` (Quelle `apps/ssv-hafen/supabase/functions/push`) ist deployt (Anleitung `apps/ssv-hafen/INBETRIEBNAHME.md`; 03 = Doppelvergabe-Schutz,
  Gast-Prüfung per Trigger, Änderungsverlauf `aenderungen`, `dokumente`, `aufgaben`, Zahlungen je Rechnung);
  Speichern im DB-Modus: erst löschen, dann neue Zeilen einfügen, Geändertes nur feldweise per PATCH (kein Überschreiben fremder Änderungen);
  `ssv-komplett.sql` wird aus schema.sql + website.sql + hafen.sql erzeugt – nie von Hand ändern.
  Live (DB-Modus, geschützt): Projekt `ssv-live`; Paket bauen mit `apps/ssv-hafen/tools/paket_bauen.py`.
  Vercel-Konto schwartauerseglerverein@gmail.com, Team `ssv-manager` (team_PFmpBlwDeIPapupD2s1QuY2J),
  Projekt `ssv-vorschau` (Standard Protection = nur Team-Login). Hochladen: `apps/ssv-hafen/tools/vercel-vorschau.js`
  (Account-Token liegt als Netzwerk-Secret für api.vercel.com in der Umgebung; Node mit NODE_USE_ENV_PROXY=1).
  Öffentlich schalten nur mit ausdrücklicher Freigabe des Nutzers.

Ältere Projekte (bbi-mbh, autohaus-bad-schwartau, propp-elektrotechnik) liegen auf
ihren ursprünglichen Branches (PR #1/#2).

## `baukaesten/` – wiederverwendbare Website-Kits
- `baukaesten/quiet-luxury/` – die Standard-Bauweise (Fontenay-Header, Cinematic-
  Heros, Signature-Animationen). README dort erklärt „Neues Projekt in 5 Schritten".
- `baukaesten/redaktion/` – Bauschema für den Redaktionsbereich `/verwaltung/` (Kunde pflegt Texte, Termine,
  Preise, Fotos selbst): `Redaktion-Schema.md` (Aufbau, Inhaltsmodell, SQL, Ablauf „alte Website → neue
  Website mit Redaktion“, Auftrag für einen anderen Chat) und `Uebergabeformular-Vorlage.md`. Als
  Obsidian-Notizen geschrieben (Vault-Bereich „Website-Entwicklung“); Referenz: `webseiten/ssv-segelverein/`.
- `baukaesten/premium-estate/` – Premium-Variante nach era-residence-Vorbild
  (Preloader, Masken-Reveals, Sticky-Chapter, Marquee, Cut-Corner-Rahmen,
  Ghost-Schriftzug) für teure Zielgruppen: Golfclubs, Reithöfe, gehobene
  Ferienvermietung. Alles Vanilla, nur transform/opacity/clip-path.
  Erstes Projekt: strandgruen (`generatoren/build_strandgruen.py`) · PR #7.
  **v2 „Hyperreal-Arsenal"** (PR #8): Lerp-Engine mit Nachlauf, Zeichen-Masken
  mit Blur, Scroll-Scrub-Kapitel, Video-Scrub, 3D-Tilt, Spotlight, Video-Hero
  (AV1+H264), Gerät-Rahmen, Float-Chips. Higgsfield-Rezept: Still (Nano Banana,
  2 Cr.) → Kling 3.0 Turbo Bild-zu-Video (7,5–10 Cr.).

## Arbeitsweise
- Pro Projekt ein Branch `claude/<projekt>` + ein PR; Auslieferung als ZIP nach `auslieferung/`.
- Externe Assets kommen über die GitHub-Actions-Asset-Bridge
  (`.github/workflows/fetch-assets.yml` + `assets-manifest.json` am Repo-Root) –
  die Build-Umgebung hat keinen freien Internetzugriff.
- Recherche-Regeln: nur belegte Fakten verwenden, Unbelegtes als `[PLATZHALTER]`
  markieren; Design-Referenzen inspirieren, werden aber nie kopiert.
- QA immer über die Screenshot-Tools der Baukästen (Reveal-Zählung muss n/n sein).
- **Karten/Anfahrt: immer Google Maps und/oder Apple Karten – kein OpenStreetMap** (Vorgabe
  des Nutzers). Standard: Buttons „In Google Maps öffnen“ (`google.com/maps/search/?api=1&query=lat,lng`)
  und „In Apple Karten öffnen“ (`maps.apple.com/?ll=lat,lng&q=Name`); eine eingebettete
  Google-Karte nur per 2-Klick-Lösung (lädt erst nach Klick, Hinweis + Datenschutz-Absatz),
  Vorlage: `webseiten/ssv-segelverein/js/karte.js`.
