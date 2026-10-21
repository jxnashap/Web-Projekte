# Baukasten „Drehbuch"

Für Video-, Social-Media- und Kreativagenturen: Die Website erzählt sich wie ein
Film. Sektionen heißen „Szene 01, 02 …", Videos laufen in Handy-Rahmen mit REC
und Timecode, Skripte stehen auf Drehbuchpapier in Courier, der Footer ist ein
Abspann. Erstes Projekt: `webseiten/scm-creatives/` (Generator
`generatoren/build_scm.py`).

Technisch die Engine aus `premium-estate` v2 (Lerp-Loop, Masken, Reveals,
Scrub), ergänzt um Drehbuch-Module. Vanilla, keine Abhängigkeiten, natives
Scrollen, animiert werden nur transform, opacity, clip-path und filter.

## Design-Sprache

| Baustein | Umsetzung |
|---|---|
| Bühne | Schwarz `--bg`, Graphit `--bg-2`, ein Signalrot (`--red` für Text 4,97:1, `--red-btn` für Flächen mit weißer Schrift 4,69:1). Helle Drehbuch-Sektionen mit `.paper`. |
| Typo | Archivo variabel: Headlines `font-stretch:72%`, 850, Versalien (`.d1/.d2/.d3`, `<em>` wird rot). Courier Prime für Labels, Timecodes, Skripte (`.lbl`, `.mono`, `.sheet`). |
| Signatur | `.lbl` mit rotem Punkt („Szene 03 · Das Skript"), Sucher-Ecken `.vf`, Handy-Rahmen `.phone` mit `.phone-ui` (REC, Live-Timecode, Label), Klappe als Preloader, HUD unten links mit Timecode zum Scrollen, Abspann-Footer `.credits`. |

## Komponenten (CSS)

`.hero` mit `.hero-phones` (3 Handys, Parallax) · `.page-head` (Unterseitenkopf, optional mit Bild/Video und `.ki-tag`) ·
`.marquee` · `.say` (Wort-Aufhellung) · `.skript` (Sticky-Kapitel: `.sheet` mit `.beat`, Handy, Zeitleiste `.tl`, `.explain .scrub-step`) ·
`.bcards`/`.bcard` (Branchen-Karten) · `.reels` (horizontale Reel-Leiste, Einrasten) und `.reel-grid` mit `.filter` ·
`.drehplan`/`.dp-row` (Tabelle mit „Euer Aufwand") · `.offer` mit `.takes` · `.packs`/`.pack` · `.svc`, `.formats` mit `.hookline` ·
`.facts`, `.quote`, `.faq` (details), `.case-grid` mit `.beats` (Videoaufbau mit Timecodes) · `.team`, `.region`, `.ways` ·
`.quiz` (Mehrschritt-Anfrage) · `.credits` · `.mbar` (Mobil-Leiste) · `.hud` · `.ph` (sichtbarer Platzhalter).

## JS-Module (`js/drehbuch.js`)

- **Klappe**: nur auf der Startseite beim ersten Besuch der Sitzung (`sessionStorage db-seen`), 700 ms, entfällt bei reduzierter Bewegung, danach `db:arrived`.
- **Bewegung anhalten** `.motion-btn` im Header (WCAG 2.2.2): pausiert Videos, Laufband und Animationen, gemerkt in `sessionStorage db-still`.
- **Vorhang** bei internen Links (nicht zu /anfrage), **Overlay-Menü** mit Fokusfalle (`inert` auf dem Rest der Seite) und Escape.
- **Masken** `.split` (Wörter) und `data-split="chars"` (Zeichen mit Blur). Der Text steht einmal als `.sr-only` im Element; die sichtbaren Zeichen kommen per CSS aus `data-c` (`::before`) in einem `aria-hidden`-Container, so steht der Text im DOM (und für Google) nur einmal. Wörter werden an Bindestrich und `&shy;` geteilt; der Trennstrich einer weichen Stelle erscheint nur, wenn dort wirklich umbrochen wird.
- **Reveals** `.rv`, `.rv-img`, `.rv-focus` (Unschärfe zu scharf), `.line-h`, `.dp-row`, `[data-count]`.
- **Mobil-Leiste** blendet sich über dem Abspann und über den Quiz-Knöpfen (`.q-nav`) aus.
- **Lerp-Engine** für Header, Parallax `[data-plx]`, Scrub `[data-scrub]` (setzt `--p`, schaltet `.scrub-step` und `.beat`), Wort-Aufhellung `[data-say]`, HUD (Timecode = Scrollfortschritt × `data-runtime`, Szene aus `[data-scene]`), Mobil-Leiste.
- **Videos**: `video[data-mp4][data-webm]` werden erst nach `load` und nahe dem Viewport geladen (AV1 bevorzugt), bei Datensparmodus gar nicht. `data-auto` spielt stumm im Bild und pausiert außerhalb. Referenzvideos (`phone(..., watch=True)`) haben statische `<source>`, `controls` ohne JS und Untertitel (`<track>` aus `media/<slug>.de.vtt`). Timecode im `.phone` folgt `currentTime`. `.sound` schaltet Ton und Untertitel; bei Referenzvideos (`data-watch`, Knopf „Ton + Untertitel“) erscheinen dazu die nativen Steuerelemente, die Deko des Handy-Rahmens weicht und der Knopf rückt nach oben. Datensparmodus und `load` gelten auch für `play()`.
- **Filter** `.filter [data-f]` blendet `[data-branche]` ein und aus.
- **Quiz** `form.quiz`: `.q-step` pro Frage, `data-req` = Pflicht-Radio mit `.q-err`, `data-auto` = springt nach Auswahl per Maus oder Finger weiter (nicht per Pfeiltaste), Fokus wandert mit. Kontaktprüfung je nach gewähltem Kontaktweg (Anruf/WhatsApp → Telefon, E-Mail → Adresse), Fehler mit `aria-invalid` und `aria-describedby`. Jeder Schritt bekommt einen Verlaufseintrag (`#frage-n`), Browser-Zurück führt zur vorigen Frage. Der Kontaktweg ist abwählbar („Egal“), der Hinweis passt sich an. Vorauswahl über `?branche=…&paket=…&extras=…`, Versand als JSON an `form.action` mit Quelle (vorherige Seite) und `utm_source`, danach `/danke?b=<branche>`. Bei Fehlern füllt `.q-msg` WhatsApp- und Mail-Link mit einer Zusammenfassung. Ohne JS: normales Formular.

## Neues Projekt

1. `generatoren/build_scm.py` kopieren und Daten oben austauschen (Kontakt, `REELS`, `CLIENTS`, `BRANCHEN`, FAQ).
2. Videos encodieren: volle Länge 720×1280 H.264 (CRF 25, faststart) + AV1 (SVT, CRF 40); Loops 8 s, 432×768, stumm; Poster als WebP.
3. `python3 generatoren/build_<projekt>.py` schreibt die Site (saubere URLs: `/branchen/gastronomie` → `branchen/gastronomie.html`).
4. QA mit `NODE_PATH=/opt/node22/lib/node_modules`:
   - `node tools/shot.js <site> <out> [--mobile] [--flat]` → Reveals n/n, JS-Fehler, 404, Überlaufen (gegen die eingestellte Breite), Gedankenstriche, Platzhalter-Zahl.
   - `node tools/umbruch.js <site> [breiten…]` → Wörter, die in animierten Überschriften mitten im Wort brechen (Standard 1440 bis 320 px). Muss „keine gebrochenen Wörter" melden.
   - `node tools/interact.js <site> <out>` → Klappe, Skript-Scrub, Menü, Quiz-Durchlauf, Danke-Seite, Filter.
5. Projektordner wie bei SCM: statische Dateien in `public/`, daneben `api/anfrage.js` (SMTP, Herkunftsprüfung, Mindestzeit, Drossel, A/B/C-Einstufung), `package.json` (nodemailer, Node 22) und `vercel.json` (`outputDirectory: public`, cleanUrls, Weiterleitungen, CSP getrennt nach Live-Host und Vorschau, Caching). Die Generator-Konstante `SITE` zeigt auf `public/`.

## Stolpersteine (gelernt bei SCM)

- Mobil wächst `innerWidth` mit zu breitem Inhalt mit. Überlaufen deshalb gegen die eingestellte Viewport-Breite messen, nicht gegen `innerWidth`.
- `overflow-wrap:break-word` rettet zu lange Wörter in Masken-Überschriften nur durch einen Bruch mitten im Wort. Lösung: Schriftgröße im zweispaltigen Seitenkopf begrenzen (`.head-grid .d1`, `.case-head .d1`) und mit `tools/umbruch.js` prüfen.
- Text im ersten Viewport nicht per `opacity` einblenden (LCP wartet sonst auf die Animation), nur per `transform`.

- `[hidden]` braucht `display:none!important`, sonst gewinnt `.btn{display:inline-flex}`.
- Masken mit `overflow:hidden` schneiden Umlaut-Punkte bei enger Zeilenhöhe ab: `.split .w` braucht Innenabstand oben.
- Karten in horizontalen Leisten werden vom IntersectionObserver nie „sichtbar": `.rv` auf den Container, nicht auf die Karten.
- `.phone` hat nur `aspect-ratio`: In Flex-Containern eine Breite setzen (`.duo .phone{flex:0 0 …}`), sonst kollabiert es auf 0.
- Parallax setzt `transform`; Drehungen deshalb mit der Eigenschaft `rotate`, damit sie nicht überschrieben werden.
- Python 3.11: keine Backslashes in f-String-Ausdrücken.
- Playwright: `file://`-Bilder laden nicht aus `setContent` (about:blank), sondern nur aus einer echten Datei per `goto`.
- KI-Loops nahtlos: Clip ab Sekunde 1 nehmen und die erste Sekunde per `xfade` ans Ende blenden.
