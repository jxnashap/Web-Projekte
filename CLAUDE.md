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
- `webseiten/scm-creatives/` – Social Media Agentur Kiel/Lübecker Bucht (Drehbuch-
  Baukasten, Schwarz/Weiß/Rot, Archivo + Courier Prime, echte Reels der Kunden,
  Anfrage-Quiz mit Vercel Function per SMTP, Vercel-ready mit vercel.json,
  Sitemap mit Video-Einträgen). Statische Dateien in `public/`, daneben `api/`.
  Platzhalter, Vercel-Einrichtung + Livegang: `PLATZHALTER.md`.
  Recherche und Plan: `.preview-cache/scm/recherche/` · PR #10
  Kunden-Merkblatt „Werbekosten absetzen“ (PDF, Modellrechnung 2026): `merkblatt/`
  (`build_merkblatt.py` + `steuer2026.py`, Belege in `RECHERCHE.md` und `.preview-cache/scm/steuern/`)

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
- `baukaesten/drehbuch/` – für Video-, Social-Media- und Kreativagenturen: Seite
  erzählt sich als Film (Szene 01…, Klappe als Preloader, Handy-Rahmen mit REC und
  Live-Timecode, Skript-Kapitel mit Scroll-Scrub, HUD-Timecode, Abspann-Footer,
  Mehrschritt-Quiz). Engine aus premium-estate v2. Erstes Projekt: scm-creatives
  (`generatoren/build_scm.py`), QA mit `tools/shot.js` (saubere URLs, --mobile),
  `tools/umbruch.js` (Wortbrüche in Überschriften) und `tools/interact.js`.

## Arbeitsweise
- Pro Projekt ein Branch `claude/<projekt>` + ein PR; Auslieferung als ZIP nach `auslieferung/`.
- Externe Assets kommen über die GitHub-Actions-Asset-Bridge
  (`.github/workflows/fetch-assets.yml` + `assets-manifest.json` am Repo-Root) –
  die Build-Umgebung hat keinen freien Internetzugriff.
- Recherche-Regeln: nur belegte Fakten verwenden, Unbelegtes als `[PLATZHALTER]`
  markieren; Design-Referenzen inspirieren, werden aber nie kopiert.
- QA immer über die Screenshot-Tools der Baukästen (Reveal-Zählung muss n/n sein).
- Protokoll und Vorlieben stehen in der Memory Vault (privates Repo `jxnashap/Memory`,
  `03 - InnoWeb/Prozess/Projektablauf.md`, `semantic/preferences/schreibregeln.md`):
  5 Phasen (Gespräch, Konzept, Design, Entwicklung, Launch); in Website-Texten
  **keine Gedankenstriche**.
