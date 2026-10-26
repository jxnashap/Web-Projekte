# DIE DREI – Weinbar Kiel

Neubau der Website von diedreibar.de: ruhig, modern, in der Beerenfarbe des
Originals (`#5B0041`). Statisch, ohne Drittanbieter-Requests beim Aufruf (Fonts lokal, kein Tracking;
Google Maps nur per 2-Klick-Lösung), deshalb ohne Cookie-Banner.
Quelle der Inhalte: diedreibar.de (Texte, Fotos, Logo, Weinkarte-PDF vom
07.05.2025), Impressum und Falstaff. Texte sind neu formuliert, Unbelegtes ist als
`[PLATZHALTER: …]` markiert.

## Design-System „Quiet Rosé“

- **Farben:** Porzellan `#FBF7F5` (Grund) · Blush `#F5E9EE`/`#EBD5DF` (weiche
  Sektionen) · Beere `#5B0041` (Marke) · Beere tief `#3F002D` (Footer) · Rosé
  `#E6B7CD` (Akzent auf Beere) · Tinte `#2B1424` (Text)
- **Typografie:** Fraunces (variabel, SOFT 100, Light/Regular, Kursiv für
  Akzente) + Inter. Beide als WOFF2-Subsets selbst gehostet (OFL).
- **Bewegung:** nur sanfte Fade-Rise- und Clip-Reveals, Wort-Masken, Haarlinien,
  langsames Laufband „Weißwein · Rotwein · Roséwein · Champagner · Prosecco“,
  dezentes Parallax. Kein Preloader, keine Cursor-Effekte. `prefers-reduced-motion`
  wird beachtet, ohne JavaScript ist alles sichtbar.
- **Logo:** Original-Wortmarke, als SVG nachgezeichnet (weiß / Beere).

## Seiten

| Seite | Inhalt |
|---|---|
| `index.html` | Hero mit Claim „Jeder Schluck erzählt eine Geschichte.“ und Heute-Status · Event-Ticker · Intro · 3 Kacheln · Laufband · Stimmen (Google) · Öffnungszeiten + Reservierung · Events (Afterwork, „Coming Soon“) |
| `bar.html` | Atmosphäre · Galerie · Weine · Feiern · Brotzeit |
| `weinkarte.html` | komplette Karte (17 Kategorien, 115 Einträge) mit Sprungnavigation und PDF |
| `besuch.html` | Zeiten (heute markiert) · Adresse · Reservierung · Anfahrt mit Google-Maps-Karte (2-Klick-Lösung wie Let's Drive Kiel) + Route planen |
| `impressum.html` / `datenschutz.html` | Rechtstexte (Datenschutz als Entwurf) |
| `404.html` | Fehlerseite im Seitendesign (`noindex`, root-relative Pfade) |
| alle Seiten | Social-Icons in der Footer-Grundzeile und im Mobil-Menü: Instagram @die_drei_weinbar, TikTok @diedreiweinbar (Facebook folgt, sobald die URL bekannt ist: `FACEBOOK` im Generator) |

## Technik

- Generator: `baukaesten/premium-estate/generatoren/build_diedrei.py`
  (Daten: `generatoren/diedrei-daten/` – Weinkarte, Fakten, Datenschutz-Entwurf,
  Bild-Index `img-index.json` mit Alt-Texten/Fokus). Erzeugt alle Seiten **und**
  `404.html`, `robots.txt`, `sitemap.xml`, `.htaccess` – nie von Hand ändern.
- QA: `baukaesten/premium-estate/tools/shot-diedrei.js` (Desktop 1440, Tablet 834,
  Mobil 390; Reveal-Zählung, 404/externe Requests, Hochskalierung der Bilder,
  Kontrast, Menü-Fokusfalle, Öffnungszeiten-Zustände)
- Bilder: WebP in zwei Größen (`-s` 1000 px, `-l` Original), `srcset`/`sizes`.
  Heros mit Art-Direction (`<picture>`): auf Telefonen ein Hochformat-Motiv,
  sonst Querformat; Preload je Quelle mit derselben Media-Query.
- **Relaunch / Server (Apache):** `.htaccess` leitet die alten WordPress-Adressen
  per 301 um (`/impressum/` → `/impressum.html`, `/datenschutz/` → `/datenschutz.html`,
  altes Weinkarten-PDF → `/assets/weinkarte.pdf`) und setzt `ErrorDocument 404 /404.html`.
  Bei einem anderen Hoster (nginx, Netlify …) dieselben Regeln sinngemäß übertragen.
  `robots.txt` verweist auf `sitemap.xml` (6 Seiten, https://diedreibar.de/…).
- **Events:** Termine im Generator unter `EVENTS` eintragen (`titel`, `datum` JJJJ-MM-TT, `zeit`, `text`).
  Leer → Ticker und Events-Block zeigen „Coming Soon“; mit Terminen → Datumsliste,
  Ticker mit Daten und schema.org-`Event`-JSON-LD. Vergangene Termine fallen beim Bauen heraus
  (also nach einem Termin neu bauen).
- **Karte:** `.map-consent` lädt das Google-Maps-iframe erst nach Klick (`js/script.js`), nichts
  wird gespeichert; Datenschutzerklärung Abschnitt 5 beschreibt das.
- Gesamtgröße: rund 4,1 MB (Limit 10 MB), Auslieferung: `auslieferung/diedrei-website.zip`

## Vor dem Livegang klären

- **Öffnungszeiten** bestätigen (Website: Mi–So 17–23 Uhr; Verzeichnisse weichen ab)
- **Weinkarte** auf Aktualität prüfen (Stand 07.05.2025)
- **Impressum:** Registerangaben der Verwaltungs-GmbH, Hinweis Verbraucherstreitbeilegung
- **Datenschutz:** Hoster, AV-Vertrag, Log-Speicherdauer, E-Mail-Anbieter, Stand-Datum
- Einverständnis zur Namensnennung der Rezensenten und zur Falstaff-Erwähnung
- **Afterwork-Termine** eintragen, sobald sie feststehen (`EVENTS` im Generator)
- **Facebook-Seite**: URL vom Betreiber erfragen und im Generator bei `FACEBOOK` eintragen
- Fotonachweis (Urheber der Originalfotos)
