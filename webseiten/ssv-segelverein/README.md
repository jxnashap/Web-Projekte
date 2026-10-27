# Schwartauer Segler-Verein e.V. · Website mit Redaktionszugang

Neue Website für ssv-net.de (Quiet-Luxury-Baukasten, Farben aus dem
Vereinsstander: Marineblau, Signalrot, Segeltuch-Weiß). Texte, Termine,
Vorstand, Gebühren und Fotos stammen von der bisherigen Seite.
Unbelegtes ist als `[PLATZHALTER]` markiert, Beispielinhalte als `[BEISPIEL]`.

**Stand: Demo-Version.** Es ist kein Server, keine Datenbank und kein
Hosting eingerichtet.

## Ausprobieren

```bash
cd webseiten/ssv-segelverein && python3 -m http.server 8080
# Website:   http://localhost:8080/
# Redaktion: http://localhost:8080/verwaltung/   (redaktion@demo / demo)
```

## Was die Redaktion selbst ändern kann (ohne neues Hochladen)

| Bereich | Wo er erscheint |
|---|---|
| Hinweis-Banner | Startseite, direkt unter dem Startbild (an/aus) |
| Aktuelles | Startseite (die neuesten 3, Anheften möglich), mit Foto und Link |
| Termine | Terminseite (nach Jahr und Monat) und „Nächste Termine“ auf der Startseite. Alte Termine lassen sich als Vorlage fürs nächste Jahr kopieren. |
| Zeiten & Preise | Karten auf Start-, Jugend- und Hafenseite (Training, Gastlieger, Messe, Kran) |
| Fotos | Galerie mit Lightbox, die ersten 6 auch auf der Startseite. Upload direkt vom Handy, die Fotos werden automatisch verkleinert. |
| Startbild | Großes Hero-Foto, Überschrift, Text |
| Vorstand | Verein-Seite: Gruppen, Ämter, Namen, Fotos, Reihenfolge |
| Zahlen | Dunkles Zahlenband auf der Startseite |

Jede Änderung wird sofort gespeichert. Auf großen Bildschirmen zeigt die
Redaktion rechts eine Live-Vorschau. Die Bedienung funktioniert auch auf dem
Handy.

**Demo-Modus:** Änderungen landen im Browser der Redakteurin oder des
Redakteurs. Die Website zeigt sie dort als „Vorschau“, für andere Besucher
bleibt der Standard. **Echtbetrieb:** In `js/konfig.js` `modus: 'supabase'`
setzen und die URL eintragen. Dann sind Änderungen sofort für alle sichtbar.

## Technik

- Statische HTML-Seiten, erzeugt mit
  `baukaesten/quiet-luxury/generatoren/build_ssv.py`. Die Standardinhalte
  stehen dort und landen in `js/inhalte-standard.js`.
- `js/cms.js` füllt alle `data-cms`-Bereiche. Ohne Datenbank kommen die
  Standardinhalte, mit Datenbank die Live-Inhalte.
- `supabase/website.sql`: Tabelle `website_inhalte` (lesen darf jeder,
  schreiben nur Redakteure) und Foto-Bucket `website`. Lokal mit
  PostgreSQL 16 getestet.
- Schriften liegen auf dem eigenen Server (keine Google Fonts), es gibt keine
  Cookies, kein Tracking und keine eingebettete Google-Karte (nur ein Link zu
  OpenStreetMap).
- QA: `node baukaesten/quiet-luxury/tools/shot-ssv.js index,verein,jugend,hafen,termine,galerie 1440 <ordner>`.
  Bei 1440 px und 390 px stimmen alle Reveals (n/n), es gibt keinen
  horizontalen Scroll und keine leeren Bereiche.

## Vor dem Livegang

- Impressum: vertretungsberechtigter Vorstand, Registergericht und
  VR-Nummer, Verantwortlicher nach MStV.
- Datenschutz: Hosting, ggf. Datenbankanbieter, Fotohinweis. Die Fassung
  juristisch prüfen lassen.
- Öffnungszeiten der Messe (Karte „Messe & Vereinsheim“).
- `[BEISPIEL]`-Meldung und Beispiel-Hinweis löschen oder ersetzen.
- Termine 2027 eintragen (alle Termine 2026 liegen in der Vergangenheit).
- Gebühren-PDF ist von 2024: ggf. aktuelles PDF unter `dokumente/` ablegen.
- Einwilligung der Vorstandsmitglieder zur Veröffentlichung der Fotos
  (die Bilder stammen von der bisherigen Website).
