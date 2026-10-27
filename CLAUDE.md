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

## `apps/` – Web-Apps
- `apps/ssv-getraenke/` – Getränkekasse für den SSV: iPad-Kiosk (Name → PIN → Kacheln →
  Stück/Kasten), Kassenwart-Bereich (Mitglieder, CSV-Import, PIN-Zettel, Preise,
  Abrechnung, A4-Rechnungen im persönlichen Ton mit Lastschrift-Ankündigung, SEPA-/CSV-Export). Demo-Modus (localStorage);
  Datenbankschema `supabase/schema.sql` lokal getestet, **nichts deployt** – auf
  Wunsch des Nutzers keine Verknüpfung mit bestehenden Supabase-/Vercel-Projekten.

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
