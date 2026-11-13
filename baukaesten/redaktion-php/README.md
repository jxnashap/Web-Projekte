# Baukasten „Redaktion PHP“

Kunden pflegen ausgewählte Inhalte ihrer Website selbst: Hinweise, Öffnungszeiten,
Termine, Stellenanzeigen. Läuft auf jedem normalen Webspace mit PHP (IONOS, STRATO,
All-Inkl, netcup …), **ohne Datenbank, ohne Zusatzkosten, ohne externe Dienste**.

Gegenstück für Vercel-Projekte ist die Supabase-Variante (siehe Vault
`03 - InnoWeb/Prozess/Redaktion-Baustein.md`).

## Aufbau

```
verwaltung/            die Redaktion unter /verwaltung/
  index.html           Oberfläche (lädt redaktion.js + redaktion.css)
  redaktion.js         baut alle Formulare aus schema.json, Live-Vorschau, Archiv
  redaktion.css        ruhige, große Oberfläche, Akzentfarbe aus schema.json
  api.php              Anmeldung, Speichern, Archiv, Passwort
  schema.json          PRO PROJEKT: welche Bereiche und Felder es gibt
  .htaccess            noindex, no-store, CSP, kein Einbetten
daten/
  inhalte.standard.json  PRO PROJEKT: Grundfassung (= was statisch vorgerendert ist)
  inhalte.json           entsteht beim ersten Speichern, NIE ausliefern
  privat/                zugang.php (bcrypt-Hash), einrichtungscode.php, sperre.json
  archiv/                die letzten 30 Fassungen
  .htaccess              nur inhalte(.standard).json öffentlich lesbar
js/cms-kern.js         auf der Website: lädt inhalte.json, ruft window.CMS_RENDER(d)
```

## Prinzip

1. Der Generator rendert die Seiten **statisch mit der Grundfassung**. Ohne
   `inhalte.json` (oder ohne JavaScript) ist die Seite vollständig.
2. `js/cms-kern.js` lädt `daten/inhalte.json`. Gibt es sie, ruft es
   `window.CMS_RENDER(inhalte)` aus dem projekteigenen `js/inhalte.js` auf und
   löst danach `cms:geladen` auf `document` aus.
3. Der Renderer tauscht nur markierte Stellen (`data-cms="…"`) und setzt Texte
   **immer per textContent**, nie per innerHTML.
4. Vorschau: Die Redaktion lädt die Seite mit `?vorschau=1` im iframe und schickt
   die ungespeicherten Inhalte per `postMessage` (nur gleiche Herkunft).

## Schema

```json
{
  "titel": "Kunde · Redaktion",
  "akzent": "#139d27", "akzent_dunkel": "#0f7f20",
  "seite": "index.html",
  "bereiche": [
    { "id": "hinweis", "titel": "Hinweis-Banner", "kurz": "Urlaub, Neuigkeiten",
      "hilfe": "Erklärt in einem Satz, was der Bereich tut.", "seite": "index.html",
      "felder": [
        { "id": "aktiv", "typ": "schalter", "label": "Banner anzeigen" },
        { "id": "text", "typ": "text", "label": "Text", "max": 160, "pflicht": false }
      ] },
    { "id": "termine", "typ": "liste", "titel": "Termine", "eintrag": "Termin", "max": 30,
      "sortieren": "datum", "titelfelder": ["datum", "titel"], "seite": "termine.html#liste",
      "felder": [ { "id": "datum", "typ": "datum", "label": "Datum", "pflicht": true } ] }
  ]
}
```

Feldtypen: `schalter`, `text` (max 120), `textlang` (max 1000), `uhrzeit` (HH:MM),
`datum` (JJJJ-MM-TT), `wochentage` (0 = So … 6 = Sa), `auswahl` (`optionen`:
`[["wert","Anzeige"], …]`), `zahl` (`min`, `max`, `schritt`).
Optionen je Feld: `label`, `hilfe`, `platzhalter`, `pflicht`, `standard`.
Listen: `eintrag` (Name eines Eintrags), `max`, `sortieren` (Feld-ID), `titelfelder`,
`neu` (Vorgaben für neue Einträge), `leer` (Text bei leerer Liste).
Listen mit Datumsfeld bekommen „Vergangene entfernen“; der Renderer blendet
vergangene Termine ohnehin aus.

Der Server prüft **jeden** Wert gegen das Schema (Typ, Länge, Pflicht, erlaubte
Auswahl) und verwirft unbekannte Felder. Links also nur über `auswahl`, nie als
freies Textfeld.

## Sicherheit

- Einrichtung mit Einmal-Code aus `daten/privat/einrichtungscode.php` (liegt nur
  auf dem Webspace, wird nach dem Einrichten gelöscht). Kein Standardpasswort.
- Passwort nur als bcrypt-Hash, mindestens 10 Zeichen.
- Sitzungs-Cookie HttpOnly, SameSite=Strict, Secure unter https, 2 h Leerlauf.
- Jeder POST: gleiche Herkunft (Origin/Referer) und CSRF-Token.
- Sperre: 5 Fehlversuche in 15 Minuten sperren die IP 15 Minuten (gehasht gespeichert).
- Atomisches Schreiben mit Dateisperre, Archiv der letzten 30 Fassungen.
- `privat/` enthält nur `.php`-Dateien ohne Ausgabe, damit selbst ohne `.htaccess`
  (z. B. nginx) nichts lesbar ist.
- Passwort vergessen: `daten/privat/zugang.php` per Webspace-Explorer löschen,
  `/verwaltung/` aufrufen, neuer Code entsteht.

## Einbau in ein Projekt (Generator)

1. `schema.json` und `inhalte.standard.json` aus **einer** Python-Struktur im
   Generator schreiben, mit derselben Struktur statisch vorrendern.
2. Stellen markieren: `<span data-cms="theorie-von">19:00</span>`.
3. `js/inhalte.js` mit `window.CMS_RENDER = function (d) { … }` schreiben.
4. Auf jeder Seite vor `</body>`:
   `<script src="js/inhalte.js" defer></script><script src="js/cms-kern.js" defer></script>`
5. Ordner `verwaltung/`, `daten/` (ohne `inhalte.json`, `privat/*.php`, `archiv/*.json`)
   und `js/cms-kern.js` kopieren.
6. Datenschutzerklärung: technisch notwendiges Sitzungs-Cookie nur für angemeldete
   Redakteure, keine Einwilligung nötig (§ 25 Abs. 2 Nr. 2 TDDDG).
7. ZIP **ohne** `daten/inhalte.json`, damit ein erneuter Upload nie Kundendaten
   überschreibt. In der Anleitung: Ordner `daten/` beim Update nie löschen.

## Testen

```bash
php -S 127.0.0.1:8765 -t webseiten/<projekt>   # .htaccess greift hier nicht
```
Ablauf: `/verwaltung/` → Code aus `daten/privat/einrichtungscode.php` → Passwort →
Bereich ändern → Vorschau prüfen → Speichern → Website neu laden.
Erstes Projekt: lets-drive-kiel (`baukaesten/ruhig-modern/generatoren/build_letsdrive.py`).
