# Neon-Baukasten v1

Für Clubs, Partyreihen und Bars: Schwarz, Leuchtröhren-Glow, breite Versalien, echte
Event-Videos. Vanilla HTML, CSS und JS, keine Abhängigkeiten, animiert wird nur
`transform`, `opacity`, `filter`, `clip-path` und `text-shadow`.
Erstes Projekt: Cherry Moon (`generatoren/build_cherry_moon.py`).

## Signature-Effekte

- **Röhre zündet:** `.neon-split` zerlegt Überschriften in Zeichen, die einzeln flackernd angehen.
- **Einschalt-Intro** `.boot`: Kirsche zeichnet sich, Wortmarke flackert an, einmal pro Sitzung.
- **Neon-Linien** `.neon-rule`, Abschnittsköpfe `.sec-head` mit leuchtender Linie.
- **Event-Karten** `.ev` mit Datum, pulsierendem Badge, Preis und Ticket-Button.
- **Automatische Event-Liste:** `[data-events]` sortiert nach Datum, vergangene Karten wandern
  ins Archiv (`data-archive`), `[data-next]` füllt das nächste Event samt Countdown.
- **Stadt und Strand** `.duo`: zwei Hochkant-Videos nebeneinander, laden erst beim Scrollen.
- **Bento-Galerie** `.bento` mit Lightbox (`[data-lb]`, Tastatur, Fokus).
- **Marquee** `.mq` mit Outline-Schrift, die beim Hover aufleuchtet.
- **Lichtkegel** folgt der Maus, Magnet-Buttons `.mag`, leichtes Filmkorn.

## Zugänglichkeit

`prefers-reduced-motion` schaltet Intro, Flackern, Marquee und Videos ab. Ein Knopf
„Bewegung anhalten“ im Footer pausiert alles (WCAG 2.2.2). Bei Save-Data oder 2G
bleiben Videos Standbilder. Menü und Lightbox mit Escape und Fokusführung.

## Neues Projekt

1. `generatoren/build_cherry_moon.py` kopieren, Daten oben ersetzen (`EVENTS`, `RUECKBLICK`, `VENUES`).
2. Farben in `:root` von `css/neon.css` anpassen (`--cherry`, `--neon`, `--neon-soft`).
3. Medien mit einem eigenen `media_*.py` erzeugen (WebP in zwei Breiten, H.264-Loops ohne Ton).
4. Bauen, dann QA: `tools/shot.js <site> <out> [--mobile]`, `tools/umbruch.js <site>`, `tools/interact.js <site>`.

Hinweis zum Test: Das mitgelieferte Chromium spielt kein H.264. `interact.js` prüft dort,
dass Quelle und Abspielbefehl gesetzt sind; echte Browser spielen die Videos.
