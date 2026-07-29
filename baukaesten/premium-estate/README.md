# Baukasten „Premium-Estate"

Editorial-Premium-Baukasten für teure Zielgruppen: Golfclubs, Reithöfe,
hochwertige Ferienvermietung, Resorts, Estates. Design-Vorbild ist die
Sprache von era-residence.com (GSAP + Lenis + Barba) — hier aber als
**reine Vanilla-Reimplementierung**: kein Framework, kein Smooth-Scroll-
Wrapper, animiert werden ausschließlich `transform`, `opacity` und
`clip-path`. Ergebnis: das Premium-Gefühl, aber flüssig auf jedem Gerät.

Erstes gebautes Projekt: `webseiten/strandgruen/` (Golfresort Strandgrün,
Timmendorfer Strand). Generator: `generatoren/build_strandgruen.py`.

---

## Design-Sprache

| Baustein | Umsetzung |
|---|---|
| Bühne | Tiefe, dunkle Grundfarbe (`--bg`), Elfenbein-Text, Messing-Akzent. Helle „Papier"-Sektionen als Kontrast (`.sec-paper` kippt alle Vordergrund-Tokens). |
| Typo | Riesiges Serif-Display (`--serif`, Playfair Display), winzige gesperrte Labels (`.lbl`, .32em Tracking), Script-Geisterschrift (`--script`, Pinyon Script) als Wasserzeichen (`.ghost`). |
| Rahmen | `.vframe` — fixer 1px-Viewport-Rahmen mit gekappten Ecken, `mix-blend-mode:difference` invertiert ihn automatisch auf hellen Sektionen. |
| Erzählung | Vollbild-Hero mit Veil-Gradient → Editorial-Intro mit Ghost → Sticky-Kapitel → Kennzahlen → CTA-Panel. |

## Animations-Inventar (alles GPU-freundlich)

- **Preloader** `.preloader`: Script-Zeile + Wortmarke mit Tracking-Einflug + wachsende Linie, dann hebt sich der Vorhang (`translateY`). Nur beim ersten Besuch (sessionStorage `pe-seen`), danach Kurzfassung. Nur sichtbar mit JS (`html.js .preloader`).
- **Seitenübergang** `.curtain`: interne Links heben einen Vorhang (`body.leaving`), dann Navigation. Respektiert `target=_blank`, Anker, externe Links, Modifier-Tasten.
- **Wort-Masken** `.split`: JS zerlegt Überschriften in `<span class="w"><span>Wort</span></span>`, Overflow-Maske, gestaffeltes Hochschieben (`--ease` expo-out). `<em>`/`<br>` bleiben erhalten.
- **Clip-Reveal** `.rv-img`: Container `clip-path:inset(10% 8%)` → `inset(0)`, Bild von `scale(1.16)` → `1` — der era-Signature-Look.
- **Parallax** `[data-plx="0.12"]`: ein einziger rAF-Loop, `translate3d`, nur im Viewport, Faktor pro Element.
- **Sticky-Kapitel** `.chapter`: haftende Medienspalte (`position:sticky`, 100svh) + darüberfließender Text. `.flip` spiegelt.
- **Marquee** `.marquee > .mq-track`: CSS-Keyframe `translateX(-50%)`, JS dupliziert den Inhalt einmal. Tempo via `--mq-s`.
- **Count-up** `[data-count="27"] [data-suffix="+"]`: rAF, cubic-out, deutsches Komma.
- **Linien** `.line-h`/`.line-v`: `scaleX/Y` 0→1.
- **Overlay-Menü**: `clip-path:inset(0 0 100% 0)` → `inset(0)`, nummerierte Serif-Links mit Stagger (JS setzt `transition-delay`), Bildpanel mit Verlauf.
- **Magnet** `.magnet`: ±6px Zug zum Cursor, nur `pointer:fine`, nie auf Touch.
- **Buttons**: `.btn-line` (Unterstrich-Antwort + Pfeilschub), `.btn-solid` (Messing-Sweep via `background-position`), `.btn-ghost`.

**Reveals** über einen einzigen IntersectionObserver (threshold .16,
`unobserve` nach Enthüllung). Hero-Inhalte enthüllen auf `pe:arrived`
(nach Preloader), nicht erst beim Scrollen.

## v2 · Hyperreal-Arsenal

- **Lerp-Engine**: EIN zentraler rAF-Loop glättet alle scrollgebundenen Werte
  mit Nachlauf (Faktor ~0.12–0.22) — der „GSAP-Feel" ohne Smooth-Scroll-Hijack.
  Loop schläft, sobald alle Werte eingerastet sind (CPU-schonend).
- **Zeichen-Masken** `data-split="chars"`: Buchstaben schieben sich hoch und
  werden von Blur scharf (`filter:blur(10px)→0`) — nur auf Text einsetzen.
- **Scroll-Scrub-Kapitel** `[data-scrub]` (Höhe ~320vh, `.scrub-stage` sticky):
  JS setzt `--p` (0…1); CSS rechnet damit Zoom/Veil (`calc(1.35 - var(--p)*.33)`).
  `.scrub-step` mit `data-at`/`data-until` blendet Text-Stationen ein.
- **Video-Scrub** `[data-video-scrub]`: `currentTime` folgt dem Scrollfortschritt
  geglättet (Apple-Stil). Video mit dichten Keyframes encodieren: `ffmpeg -g 1`.
- **Video-Hero**: `<video muted loop playsinline data-webm="…" data-mp4="…">` —
  JS wählt AV1-WebM (klein) oder H.264-MP4 per `canPlayType`.
- **3D-Tilt** `.tilt3d`: ±7° rotateX/Y + wanderndes Glanzlicht (`--gx/--gy`).
- **Spotlight** `.spot`: Radial-Licht folgt dem Cursor (nur `pointer:fine`).
- **Gerät-Rahmen** `.device`: Browser-Chrome-Andeutung für App-Screens.
- **Float-Chips** `.float-chip`: schwebende Glas-Badges über Medien.
- **Lebendiger Hero**: Dauerzoom 1.02→1.08 über 26 s nach der Ankunft.

Higgsfield-Rezept (Qualität günstig): erst Nano-Banana-Still (2 Cr.) mit
exakter Art-Direction, dann Kling 3.0 Turbo als Bild-zu-Video animieren
(7,5–10 Cr.) — fotorealistische Szene für unter 10 Credits. Loops per
ffmpeg-xfade, Auslieferung AV1-WebM + H.264-MP4.

## Fallbacks (Pflicht)

- `html:not(.js)` — alles sichtbar, Preloader/Vorhang weg.
- `prefers-reduced-motion` — Transitions ≈0, Marquee steht, Parallax aus, Count-up springt aufs Ziel.
- Kein Smooth-Scroll-Hijacking: **natives Scrollen bleibt immer nativ.**

## Palette tauschen (einziger Eingriff)

Nur `:root` in `css/style.css` ändern — Namen bleiben:
`--bg/--bg-2` (Bühne), `--ivory/…` (Text dunkel), `--accent/--accent-2`,
`--paper/--paper-2/--ink` (helle Sektionen), `--navy` (Sekundär).
Dazu die vier `rgba(…)`-Streufarben (`--line`, `.hero::before`,
`.cta-panel::before`, `.nav-side .ns-img::after`) — **gespaced UND
ungespaced suchen!**

## Arbeitsprozess (bewährt, aus quiet-luxury übernommen)

1. **Recherche über die GitHub-Actions-Brücke** (`assets-manifest.json` →
   Workflow lädt → committet zurück). Subagent extrahiert Fakten + Bild-URLs.
2. **Nur belegte Fakten**, alles andere `[PLATZHALTER: …]`. Referenzen
   inspirieren, werden nie kopiert.
3. **Generator** (Python im Scratchpad, Kopie in `generatoren/`):
   `head()`, `header()`, `FOOTER`, `PAGES`-Dict → statische HTML-Seiten.
4. **QA mit Playwright** (`tools/shot.js`): lokaler Server, Font-Interception
   auf lokale TTFs, Reveal-Zählung muss n/n sein, End-State-CSS vor
   fullPage-Screenshot (Screenshot startet CSS-Animationen neu!).
5. **Auslieferung**: ZIP in `auslieferung/`, Previews via SendUserFile, PR.

## Stolpersteine

- `curl` glob-t eckige Klammern → Font-URLs im Manifest mit `%5B%5D`.
- Variable Fonts von google/fonts (`PlayfairDisplay[wght].ttf`) decken alle Gewichte ab — eine Datei pro Familie reicht für QA.
- `.vframe` mit `mix-blend-mode:difference` braucht keinen Sektionswechsel-Code — aber auf Mobile ausblenden (Rahmen frisst Platz).
- Overlay-Menü: `visibility` mit 0s-Delay in beide Richtungen schalten, sonst bleiben Links fokussierbar.
- `overflow-x:clip` (nicht `hidden`) am Body — `hidden` bricht `position:sticky` in manchen Browsern.
- Bilder der Ziel-Site über die Brücke holen statt Higgsfield, wenn keine Credits da sind — Original-Assets sind ohnehin authentischer.
