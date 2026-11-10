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
  Code (4-stellig) legt das Mitglied beim ersten Mal selbst fest (Mitgliedsnummer-Abfrage, abschaltbar),
  ändern in „Mein SSV“; Demo teilt den Mitgliederstamm mit `../ssv-hafen/js/daten.js` (gleiche IDs);
  Datenbankschema `supabase/schema.sql` lokal getestet, **nichts deployt** – auf
  Wunsch des Nutzers keine Verknüpfung mit bestehenden Supabase-/Vercel-Projekten.
- `apps/ssv-hafen/` – Hafen-Manager für den SSV (Prototyp, Demo-Modus): SVG-Hafenplan nach
  amtlichem Luftbild (Ost 1–24, West 25–70, Schwimm 71–79, L1/L2 – Zuordnung = Annahme), Belegung
  Sommer/Winter, grünes Schild, Gastlieger + QR-Anmeldung, Warteliste, Kran, Arbeitsdienst,
  Abrechnung nach Gebührenordnung 2024, SEPA-XML pain.008.001.08 (XSD-geprüft), „Mein SSV“ für jedes
  Mitglied (Hafen- + Getränkerechnungen, grünes Schild, Getränke-Code ändern; lädt `../ssv-getraenke/js/store.js`).
  **Ersetzt easyVerein:** Mitgliederstamm (Arten laut Satzung, Geburtsdatum/Geschlecht/Eintritt), CSV-Import,
  Online-Aufnahmeantrag `aufnahme.html` → Vorstand nimmt auf, Beitragseinzug (Gebührenordnung 2024, `SSV-B-…`),
  Verbandsmeldung (Bestandserhebung 1.1.). Website verlinkt Antrag + Mein SSV (`../ssv-hafen/`).
  Menü: 7 Bereiche (`BEREICHE` in `js/app.js`) mit Reitern oben, Zurück-Taste über `#tab`-Verlauf.
  Hafenplan maßstäblich (1000 × 750 Einheiten = 400 × 300 m) aus einem Lageplan-Datensatz (`STANDARD` in `js/plan.js`, eigener Plan des Vereins in
  `einstellungen.lageplan`, Zeichenfenster `js/plan-editor.js`); Luftbild `img/luftbild-dop20.jpg` = amtliches DOP20, Quellenvermerk
  „© GeoBasis-DE/LVermGeo SH/CC BY 4.0“ muss sichtbar bleiben (Details `RECHERCHE.md`).
  Arbeitsdienst: 12 Arbeitsgruppen laut Vorstand (Vorlage `js/bereiche-vorlage.js`, live eingespielt), Aufgaben je Gruppe mit `pos` (Aktionsliste),
  `art` aufgabe|besorgen, `erledigt` (Datum) im jsonb `arbeitsbereiche.aufgaben`; Ansicht „Arbeitsgruppen“ mit Gruppen/Aufgabenliste/Einkaufsliste.
  Gewichtsgrenze Steg/Kran nur über `einstellungen.max_gewicht_t` (`Q.maxT()/Q.zuSchwer()/Q.maxTxt()`, Standard 10 t laut HBO; Website sagt 9 t – Vorstand klärt, `grenze_bestaetigt`).
  Gastlieger: Status wird aus Daten berechnet (`gastLage()` in app.js: Aufenthalt/Platz/Zahlung, Ansichten Heute & offen/Anreisen/Im Hafen/Abreisen/Archiv);
  Finanzen: Reiter „Übersicht“ (`V.finanzen`, liest die Getränkekasse über `window.SSV.speicher` – index.html lädt dafür `../ssv-getraenke/js/store.js`), Rechnungskette `stufe()`/`kette()` mit „Gutschrift ist da“ je SEPA-Lauf;
  Sicherung zurückspielen: `HAFEN.sicherungLesen()/zurueckspielen()` (nur Vorstand, über den normalen Speicherweg – Mitglieder/Rechnungen werden nie gelöscht).
  Mitgliedsakte `mitgliedAkte(m)` (Zeilenklick; Verlauf über `HAFEN.verlauf({ datensaetze })` für Mitglied+Boote+Belegungen+Rechnungen+Stunden), Bearbeiten → `mitgliedForm` → zurück zur Akte;
  Gebührenordnung in Fassungen (`d.gebuehren[jahr]` = gültig ab Saison, `fassungen()`), Abrechnung als 5-Schritte-Ablauf (Prüfliste, Zustell-Vermerk `einstellungen.abrechnung_zugestellt['periode-jahr']`).
  Tabellen: eine Hauptaktion je Zeile, Rest im ⋯-Menü (`zeilenMenue()`, fest positioniert); Übersicht max. 5 Punkte je Gruppe, Etikett = Thema.
  **Alle Druck-/PDF-Seiten im SSV-Briefkopf: Flagge oben links + Vereinsadresse rechts** (`kopf` in `js/drucken.js`, `druckKopf()` in app.js für direkt gedruckte Seiten) – Vorgabe des Nutzers.
  Recherche/Annahmen: `RECHERCHE.md`, `PLAN.md`.
  **Echtbetrieb-Konten (nur SSV, getrennt von allen anderen Projekten):**
  Supabase Org „SSV Manager“, Projekt `jprpgadcycaawxlyozkm` (Frankfurt) – Schema aus
  `apps/ssv-hafen/supabase/ssv-komplett.sql` eingespielt (Kasse + Website + Hafen/Mitglieder, RLS je Rolle).
  Bestehende DB nachziehen mit `nachtrag-01…10.sql` (05 = Kasse ohne Netz, `kasse_buchen_nach` mit Kennung; 06 = Arbeitseinsätze/QR, Mitteilungen, Push-Tabellen; 07 = Gast gibt Platz vom grünen Schild an und bezahlt sofort, `gast_zahlung_melden`; 08 = Arbeitsbereiche + Zuordnung, `meine_arbeitsbereiche`; 09 = Toilettencode `gast_toilette` + `gast_status`; 10 = eindeutiger Index `hafen_rechnungen_einmal` gegen doppelte Rechnungen; Gäste zahlen per GiroCode/EPC-QR `H.epc()`); Edge Function `push` (Quelle `apps/ssv-hafen/supabase/functions/push`) ist deployt (Anleitung `apps/ssv-hafen/INBETRIEBNAHME.md`; 03 = Doppelvergabe-Schutz,
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
