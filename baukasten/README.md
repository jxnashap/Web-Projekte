# Website-Baukasten („Quiet-Luxury-Bauweise")

Der wiederverwendbare Baukasten hinter InnoWeb (PR #3), Room 23 (PR #4) und
Buchtquartier (PR #5). Ein neues Projekt entsteht in ~5 Schritten, ohne dass
etwas von Grund auf neu gebaut werden muss.

## Bestandteile

```
baukasten/
├── css/style.css        Design-System (Master: InnoWeb-Gold-Palette)
├── js/script.js         Alle Verhaltensbausteine (framework-frei, ~250 Zeilen)
├── generatoren/         Die drei Referenz-Generatoren (Python, erzeugen alle Seiten)
│   ├── build_innoweb.py     · Agentur, Gold/Nachtblau, Video-Heros
│   ├── build_room23.py      · Tattoo-Studio, Tannengrün/Bronze, echte IG-Inhalte
│   └── build_bq.py          · Ferienvermietung, Sand/Nautik-Blau, echtes Logo
├── tools/shot.js        QA-Screenshots (Playwright, lokale Fonts, Reveal-Zählung)
└── workflow/fetch-assets.yml   GitHub-Actions-Asset-Bridge (inkl. Secret-Redaction)
```

## Die Bauweise (was jede Seite bekommt)

1. **Fontenay-Header:** Kreis-Burger + „Menü" links · Logo-Lockup exakt mittig
   (Monogramm/echtes Logo + Wortmarke + Unterzeile) · Pill-CTA rechts. Beim
   Scrollen: schwebende Bar (94 %), Hintergrund in Papierfarbe, runde untere
   Ecken. Menü = Fullscreen-Overlay mit nummerierten Serif-Links + Bildpanel.
2. **Cinematic-Hero pro Seite:** Vollflächiges Bild (Higgsfield, rechts
   gewichtet – links Ruhe für die Headline) mit Veil-Verlauf und Fade in die
   Folgesektion. Optional Video (AV1-WebM + H.264-MP4 + Poster, nahtloser
   Crossfade-Loop, siehe InnoWeb).
3. **Signature-Animationen** (alle CSS/SVG/JS, keine Libraries):
   selbstzeichnende SVGs (`.icon-draw`/`data-draw` + `--len`), Scroll-Reveals
   (IntersectionObserver), wachsende Linie (`[data-timeline]`), Dotwork-Linie,
   Curtain-Reveal + Polaroid-Tilt-Galerie, Parallax, Nadellinie, Ink-/Wellen-
   Sweep-Buttons, §-Siegel. Für jede Seite eine thematisch passende Auswahl.
4. **Typografie:** Cormorant Garamond (Serif-Display, wichtige Wörter kursiv im
   Akzentton) + Inter 300/400; Labels in gesperrten Großbuchstaben.
5. **Qualität:** Fallbacks für `prefers-reduced-motion` und ohne JavaScript,
   responsiv (≤940/760 px), semantisches HTML, statisch deploybar.

## Neues Projekt in 5 Schritten

1. **Branch:** `git checkout -B claude/<projekt> origin/main`, Workflow +
   `.preview-cache/fonts/` vom letzten Projekt-Branch übernehmen.
2. **Recherche über die Asset-Bridge:** `assets-manifest.json` mit Quellen
   befüllen (Website direkt, `r.jina.ai/<url>` für Bot-Wälle, IG-Viewer,
   Screenshot-Dienste wie microlink/thum.io) → committen → Workflow lädt alles
   ins Repo. Farben, Logo, Fakten extrahieren; nichts erfinden,
   Unbelegtes als `[PLATZHALTER]` markieren.
3. **Palette-Swap:** `css/style.css` kopieren und NUR die Werte in `:root`
   ersetzen (paper/night/gold-Slots + die zugehörigen rgba-Streuwerte per
   Suchen-Ersetzen). Variablennamen unverändert lassen – dann folgt das
   gesamte System automatisch.
4. **Generator:** einen der drei Referenz-Generatoren kopieren, `NAV`, Inhalte
   und Signature-SVGs anpassen, laufen lassen. Heros mit Higgsfield erzeugen
   (nano_banana = 1 Credit/Bild, 16:9, rechts gewichtet) und via Bridge holen.
5. **QA + Auslieferung:** `tools/shot.js` (Reveal-Zählung muss n/n sein;
   erzwingt Animations-Endzustände, da Playwright-fullPage CSS-Animationen
   neu startet) → ZIP nach `auslieferung/` → PR.

## Gelernte Stolpersteine

- Playwright-Chromium hat kein H.264 → Videos zusätzlich als AV1-WebM ausliefern.
- `scroll-behavior:smooth` bricht programmatische Scroll-QA → im Shot-Tool
  `html{scroll-behavior:auto!important}` injizieren.
- Instagram anonym gesperrt → IG-Viewer (imginn/pixnoy) + `web_profile_info`-API
  mit `x-ig-app-id`-Header über die Bridge.
- Gescannte Seiten können Secrets enthalten (Push Protection!) → der Workflow
  schwärzt Token-Muster vor dem Commit.
- Dropbox-Transfer-Links liefern nur Thumbnails → Preview-URLs mit
  `?size=2048x2048&size_mode=3` laden.
