# Baukasten „Ruhig-Modern"

Helle, ruhige, moderne Bauweise für Dienstleister mit breiter Zielgruppe
(Fahrschulen, Praxen, Handwerk, Beratung): viel Weißraum, **eine** Akzentfarbe,
eine Schriftfamilie, dezente Bewegung. Vanilla HTML/CSS/JS, keine Libraries,
**keine externen Requests** (Schrift selbst gehostet, Karten nur nach Klick).

Erstes Projekt: `webseiten/lets-drive-kiel/` (Fahrschule Let's Drive Kiel).
Generator: `generatoren/build_letsdrive.py`.

```
ruhig-modern/
├── css/style.css            Design-System (Tokens in :root, Komponenten)
├── js/script.js             Header, Mobile-Nav, Reveals, Tabs, Bürozeiten, Formular, Map-Consent
├── generatoren/build_letsdrive.py   erzeugt alle Seiten + sitemap.xml + robots.txt
└── tools/shot.js            QA: Screenshots Desktop/Mobil, Reveal-Zählung, Fremd-Host-Check, Größe
```

## Design-Sprache

| Baustein | Umsetzung |
|---|---|
| Fläche | Warmes Off-White `--paper` statt Reinweiß, dunkle Sektionen in `--ink` (Markenfarbe des Kunden) |
| Akzent | genau eine Farbe in drei Stufen: `--green` (Marke/Deko), `--green-ink` (Text/Buttons, AA), `--green-deep` (Hover) |
| Typo | Manrope variabel (eine Datei, ~40 KB woff2), große ruhige Headlines mit engem Tracking, Akzentwort per `<em>` in Grün |
| Rhythmus | Sektionen `clamp(72px,10vw,140px)`, Inhalte max. 1200 px, Karten mit Haarlinie statt Schatten |
| Bewegung | nur `opacity`/`transform`/`clip-path`, 600–900 ms, ein IntersectionObserver; Hero-Zoom 1.06→1 |

## Komponenten

Header (transparent über dunklem Hero → kompakte Glas-Leiste), Mobile-Nav mit
Fokus-Falle, Hero (Startseite dunkel/Vollbild · Unterseiten hell mit Brotkrumen),
Karten/USPs, Klassen-Karten mit Badge, Schritte mit wachsender Linie, Tabs-Filter
mit Deep-Link, Fakten-Raster (`dl.facts`), Stundenplan + Tage-Chips, Lektionsliste,
Zitate, Bürozeiten mit „Jetzt geöffnet"-Badge (Europe/Berlin), Kontaktliste,
Formular (Validierung → `mailto:`), Google-Maps-2-Klick-Lösung, CTA-Band, Footer.

## Neues Projekt

1. Recherche über die Asset-Bridge (`assets-manifest.json`): Website, `r.jina.ai`,
   microlink-Screenshot, Verzeichnisse (Telefonbuch, Bewertungsportale) für Fakten.
2. Farben aus dem Original (`#rrggbb`-Häufigkeit im HTML + Screenshot) → nur `:root` tauschen,
   Kontraste mit WCAG-Formel prüfen (Akzent für Text auf hell ≥ 4,5:1 abdunkeln).
3. Bilder: Original-Assets bevorzugen; Lücken mit Higgsfield-Stills (Nano Banana 2.1,
   2k, 2 Credits) schließen → WebP in 2–3 Breiten, Hero ≤ 350 KB.
4. Generator kopieren, `NAV`/Inhalte ersetzen, laufen lassen.
5. QA: `node tools/shot.js <site> <out>` → Reveals n/n, 0 Fremd-Requests, 0 Fehler,
   kein Overflow, Größe < Budget. Dann ZIP nach `auslieferung/`.

## Recht & Qualität (Stand 2026)

- **DSGVO:** Schrift lokal (LG München I, 2022: Google-Fonts-CDN = IP-Übermittlung),
  keine Cookies/Tracker → kein Cookie-Banner nötig; Karten erst nach Einwilligung.
- **Impressum** nach § 5 DDG, bei erlaubnispflichtigen Berufen Aufsichtsbehörde nennen.
- **Barrierefreiheit:** BFSG seit 28.06.2025 (Kleinstunternehmen bei Dienstleistungen
  ausgenommen) – trotzdem WCAG 2.1 AA als Maßstab: Kontrast, Fokus, Skip-Link,
  Touch-Ziele ≥ 44 px, `prefers-reduced-motion`, funktionsfähig ohne JS.
- **Core Web Vitals:** LCP ≤ 2,5 s (Hero preload + `fetchpriority`, WebP, nie lazy),
  CLS ≤ 0,1 (alle Bilder mit width/height, Font `swap` + Preload), INP ≤ 200 ms
  (kleines JS, ein Observer, passive Listener).
- **SEO lokal:** JSON-LD (`DrivingSchool`/`LocalBusiness`) mit Adresse, Zeiten,
  `sameAs`; sprechende Titles/Descriptions, Canonical, Sitemap, Rechtsseiten `noindex`.
