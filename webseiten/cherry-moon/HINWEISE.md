# Cherry Moon · Website-Vorlage im Neon-Design

Statische Website mit 12 Seiten plus 404 im Neon-Look der bestehenden cherry-moon.de:
Schwarz, Kirsch-Neon (#ff2d55 / #e4103f), Archivo und Archivo Black, Leuchtröhren-Glow.
Alle Links sind relativ: Die Seite läuft auf jedem Webspace, auch in einem Unterordner,
ohne Server-Regeln. Ordner-URLs wie `/events/silvester/`.

**Der Ticketshop bleibt.** „Ticket kaufen“, Bestellungen, Cherry Account, Newsletter,
AGB und Widerruf führen zum bestehenden Shop auf cherry-moon.de. Diese Vorlage verkauft
selbst nichts und setzt keine Cookies.

## Seiten

| Seite | Inhalt |
|---|---|
| `/` | Video-Hero (Neon-Wortmarke zündet), nächstes Event mit Countdown, Next Dates, Stadt und Strand mit Videos, Zahlen, Galerie, VIP-Tische, Newsletter |
| `/events/` | Kommende Events, automatisch sortiert; vergangene wandern ins Archiv; Rückblick „Gewesen“ |
| `/events/cherry-moon-x-coda/`, `/events/silvester/`, `/events/tanz-in-den-mai-2027/` | Tickets, Gut zu wissen, Anfahrt (Google, Apple, Bus und Bahn), Tisch per WhatsApp, Tischplan, Kalenderdatei (.ics) |
| `/rueckblick/` | Galerie mit Lightbox, Saison 2026 mit 30 Nächten |
| `/tische/` | So läuft die Tischreservierung, alle Tischpläne |
| `/ueber-uns/` | Geschichte, Formate, Locations, Kooperationen |
| `/faq/` | Tickets, Rückgabe, Einlass, Weitergabe, Account, Tische, Fotos |
| `/kontakt/` | Mail nach Thema, WhatsApp, Instagram, TikTok |
| `/impressum/`, `/datenschutz/` | Angaben der Bywater GmbH; Datenschutz für diese statische Seite |

## Vor dem Livegang

- **Suchmaschinen:** Die Vorlage ist auf `noindex` gestellt (`NOINDEX = True` im Generator,
  dazu `robots.txt` mit `Disallow`). Für den Livegang `NOINDEX = False` setzen und neu bauen.
- **Datenschutz:** Ein Platzhalter für den Hoster dieser Seite (Name, Anschrift, Speicherdauer
  der Logs, Vertrag zur Auftragsverarbeitung). Danach rechtlich prüfen lassen.
- **Events pflegen:** Termine stehen in `EVENTS` im Generator. Vergangene Events verschwinden
  von selbst aus „Next Dates“ und rücken ins Archiv; die Startseite zeigt immer das nächste.
- **Zahlen:** „1,2 Mio. Aufrufe“ (TikTok, Rooftop Scharbeutz) und „30 Nächte 2026“ sind Stand
  November 2026.
- **404:** `404.html` nutzt absolute Pfade und funktioniert nur im Hauptverzeichnis der Domain.
  Auf Apache: `ErrorDocument 404 /404.html` (steht in `.htaccess`).

## Quellen

- Texte, Preise, Einlasszeiten, Tische, Impressum, AGB und Datenschutz: cherry-moon.de
- Saison 2026 und Videos: TikTok @cherrymoonhamburg (eigene Clips, die eingebrannten Texte
  sind weggeschnitten)
- Fotos: cherry-moon.de (Start, Rückblick, Tischpläne)
- Alles über die Asset-Bridge gespiegelt in `.preview-cache/cherry-moon/`

## Neu bauen

```
python3 baukaesten/neon/generatoren/media_cherry_moon.py      # Bilder und Videos (einmal)
NODE_PATH=/opt/node22/lib/node_modules node baukaesten/neon/generatoren/og_cherry_moon.js   # Vorschaubilder
python3 baukaesten/neon/generatoren/build_cherry_moon.py      # Seiten
```

QA: `baukaesten/neon/tools/shot.js` (Desktop und `--mobile`), `umbruch.js`, `interact.js`.
