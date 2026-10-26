# DIE DREI Weinbar Kiel – Neubau „ruhig & modern“ (gemeinsames Briefing)

Repo: /home/user/Web-Projekte (Branch claude/kind-goodall-rs48pg — Agents committen/pushen NICHT, das macht der Koordinator).
Scratch: S=/tmp/claude-0/-home-user-Web-Projekte/5cb5e08b-fc38-5aa0-ac8f-0ea76d68a5dd/scratchpad/diedrei
Ziel-Ordner der Website: /home/user/Web-Projekte/webseiten/diedrei/
Kein Internet im Container (nur Bridge). Alles nötige liegt lokal.

## Quellen (lokal, alle belegt)
- Original-Site: .preview-cache/dd/home.md (Text), home.html (Roh), impressum.html, datenschutz.md
- Screenshots Original: .preview-cache/dd/shot-top.png, shot-full.png (Kontaktbögen: $S/../dd/*.jpg)
- 20 Originalfotos: .preview-cache/dd/photos/*.jpg (1920×1280 quer bzw. 1067×1600 hoch)
- Logos: .preview-cache/dd/brand/dd-logo-white.png, dd-logo-black.png (500×348), dd-favicon.png (512)
- Weinkarte: .preview-cache/dd/weinkarte.pdf (9 Seiten, Stand 07.05.2025, inkl. Brotzeit/Cocktails/Liköre/Softdrinks)
- Verzeichnisse: .preview-cache/dd/falstaff.md, restaurantguru.md, toogoodtogo.md
- Fonts (OFL, lokal): .preview-cache/fonts/Fraunces.ttf, Fraunces-Italic.ttf, Inter.ttf
- Baukasten-Basis: baukaesten/premium-estate/ (css/style.css, js/script.js, tools/shot.js, README.md)

Regel: nur belegte Fakten. Unbelegtes als [PLATZHALTER: …]. Original-Texte dürfen
umformuliert/gekürzt werden (Du-Ansprache wie im Original), aber keine neuen Behauptungen.
Die AdobeStock-Illustration des Originals wird NICHT verwendet.

## Marke
- Name: DIE DREI · Weinbar · Kiel — Claim (Original): „Jeder Schluck erzählt eine Geschichte."
- Das „Pink“ der Original-Site = Beere/Magenta **#5B0041** (Sektionsflächen, Laufband). Hauptfarbe.
- Original-Headline-Font ist eine weiche, fette Serif → wir nehmen **Fraunces** (weich, leicht) + **Inter**.

## Design-System „Quiet Rosé“ (ruhig, modern)
Tokens (:root):
  --porcelain #FBF7F5 (Seitengrund) · --blush #F5E9EE (weiche Sektionen) · --blush-2 #EBD5DF (Linien/Flächen)
  --berry #5B0041 (Marke) · --berry-deep #3F002D (Footer/dunkel) · --rose #E6B7CD (Pink-Akzent auf Beere)
  --ink #2B1424 (Text hell) · --ink-dim rgba(43,20,36,.68)
Typo: Fraunces Display Light/Regular (wght 300–420, SOFT 100, WONK 0), <em> kursiv in Beere bzw. Rosé auf dunkel.
  Inter 400 Fließtext 17px/1.7; Labels Inter 500 .72rem, Tracking .22em, Versalien.
Ruhe: viel Weißraum (Sektionen clamp(5rem,12vw,10rem)), Textspalten ≤ 36em, max-width ~1320px,
  wenige, langsame Bewegungen. Fotos (orange Wände!) nicht umfärben — nur sanfte, beerige Veils.
Motion (nur transform/opacity/clip-path): Fade-Rise-Reveals (24px, 1.1s), Clip-Reveal für Bilder
  (inset 6%→0, Bild 1.08→1, 1.6s), Wort-Masken für Headlines, Haarlinien scaleX, langsames Laufband
  „Weißwein · Rotwein · Roséwein · Champagner · Prosecco“ (Hommage ans Original), dezentes Parallax
  (≤0.06). KEIN Preloader, KEIN Seitenvorhang, KEINE Cursor-/Tilt-/Magnet-Effekte.
  Pflicht: prefers-reduced-motion aus, ohne JS alles sichtbar, natives Scrollen.
Datenschutzfreundlich: keine Drittanbieter-Requests (Fonts self-hosted WOFF2, keine Map-Einbettung,
  kein Tracking) → kein Cookie-Banner nötig. Karte nur als externer Link (OpenStreetMap/Google Maps).

## Seiten (statisch, 6 Stück)
1. index.html — Hero (Foto teller-glas o. ä.) + Claim · Intro · 3 Kacheln (Die Bar / Weinkarte / Brotzeit)
   · Laufband · Stimmen (6 Google-Rezensionen aus Original) · Öffnungszeiten kompakt · Reservierungs-CTA
2. bar.html — Die Bar: Atmosphäre (Original-Text „Einladend, gemütlich und unvergesslich.“), Galerie, seit 2024,
   Brotzeit/Kleinigkeiten (aus PDF Seite 9 + Falstaff)
3. weinkarte.html — komplette Karte aus weinkarte.json (Sprungnavigation, Glas/Flasche-Spalten, tabular-nums),
   Hinweis „Stand 07.05.2025 · Preise laut Karte“, PDF-Download (assets/weinkarte.pdf)
4. besuch.html — Öffnungszeiten (heute hervorgehoben per JS), Adresse, telefonische Reservierung, größere
   Feiern (nur telefonisch, wie im Original), Zahlungsarten (Falstaff), Anfahrt-Link
5. impressum.html — echte Angaben (s. fakten.md)
6. datenschutz.html — schlanke Erklärung für statische Seite ohne Cookies, Lücken als [PLATZHALTER]
Header: Logo links (weiß auf Hero, beere nach Scroll), Nav (Die Bar · Weinkarte · Besuch), Pill-CTA
„Tisch reservieren“ → tel:+4943171978976. Mobile: Burger → Vollbild-Overlay in Beere.
Footer: berry-deep, Logo weiß, Adresse, Zeiten kurz, Instagram/Yelp/Google, Impressum/Datenschutz.
SEO: Title/Description je Seite, OG (assets/brand/og.jpg), JSON-LD (BarOrPub/Winery-ähnlich: BarOrPub),
canonical https://diedreibar.de/…

## Asset-Vertrag (Agent „Assets“ erzeugt, alle anderen nutzen nur diese Pfade)
webseiten/diedrei/assets/img/<slug>-s.webp (lange Seite 1000px) und <slug>-l.webp (lange Seite 1920px bzw. Original)
Slugs:  1-DSC09632→flammkuchen · 2-DSC09668→teller-tisch · 3-DSC09669→teller-glas · 7-DSC09699→dip-cracker
  11-DSC09743→gaeste-sekt · 12-DSC09765→bar-detail · 13-DSC09775→raum-weinschrank · 14-DSC09778→kaeseplatte
  15-DSC09785→rose-flaschen · 20-DSC09816→tresen-fenster · 21-DSC09822→raum-panorama · 22-IMG_9919→eingang-terrasse
  26-DSC09606-1→spiegel-raum · 27-DSC09602→raum-sofa · 28-DSC09597→nische-blau · 29-DSC09592→tresen
  30-DSC09573→weinkuehlschrank · 31-DSC09569→zitronen-korken · 32-DSC09543→sauternes-kiste · 33-DSC09535→raum-lampen
webseiten/diedrei/assets/img/index.json  — [{slug, orientation, s:{w,h,bytes}, l:{w,h,bytes}, alt}]
webseiten/diedrei/assets/brand/logo-white.(svg|png), logo-berry.(svg|png), logo-black.(svg|png), favicon.svg|favicon-32.png,
  apple-touch-icon.png (180), og.jpg (1200×630)
webseiten/diedrei/assets/fonts/fraunces.woff2, fraunces-italic.woff2, inter.woff2 (+ assets/fonts/fonts.css mit @font-face)
webseiten/diedrei/assets/weinkarte.pdf

## Inhalts-Vertrag (Agent „Inhalte“)
$S/weinkarte.json · $S/fakten.md · $S/datenschutz-entwurf.html (Fragment)

## Budget
Gesamter Ordner webseiten/diedrei/ ≤ 10 MB (hart). Ziel ≤ 6 MB. Bilder WebP, Fonts WOFF2-Subsets.

## QA
Playwright (Chromium vorinstalliert, require('playwright'), chromium.launch() ohne Optionen),
Desktop 1440 + Mobile 390, Reveal-Zählung n/n, 0 Konsolenfehler, keine 404, Kontrast AA.
