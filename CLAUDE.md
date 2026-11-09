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
  Luftbild (Ost 1–24, West 25–70, Schwimm 71–79, L1/L2 – Zuordnung = Annahme), Belegung
  Sommer/Winter, grünes Schild, Gastlieger + QR-Anmeldung, Warteliste, Kran, Arbeitsdienst,
  Abrechnung nach Gebührenordnung 2024, SEPA-XML pain.008.001.08 (XSD-geprüft), „Mein SSV“ für jedes
  Mitglied (Hafen- + Getränkerechnungen, grünes Schild, Getränke-Code ändern; lädt `../ssv-getraenke/js/store.js`).
  **Ersetzt easyVerein:** Mitgliederstamm (Arten laut Satzung, Geburtsdatum/Geschlecht/Eintritt), CSV-Import,
  Online-Aufnahmeantrag `aufnahme.html` → Vorstand nimmt auf, Beitragseinzug (Gebührenordnung 2024, `SSV-B-…`),
  Verbandsmeldung (Bestandserhebung 1.1.). Website verlinkt Antrag + Mein SSV (`../ssv-hafen/`).
  Recherche/Annahmen: `RECHERCHE.md`, `PLAN.md`.
  **Echtbetrieb-Konten (nur SSV, getrennt von allen anderen Projekten):**
  Supabase Org „SSV Manager“, Projekt `jprpgadcycaawxlyozkm` (Frankfurt) – Schema aus
  `apps/ssv-hafen/supabase/ssv-komplett.sql` eingespielt (Kasse + Website + Hafen/Mitglieder, RLS je Rolle).
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
