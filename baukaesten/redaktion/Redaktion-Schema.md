---
titel: Redaktion für Kunden-Websites – Bauschema
bereich: Website-Entwicklung
tags: [website, redaktion, cms, supabase, baukasten, uebergabe]
stand: 2026-11-12
referenz: Schwartauer Segler-Verein (webseiten/ssv-segelverein im Repo jxnashap/Web-Projekte)
---

# Redaktion für Kunden-Websites – Bauschema

Dieses Schema beschreibt, wie eine statische Website eine eigene **Redaktion** bekommt: einen
geschützten Bereich `/verwaltung/`, in dem der Kunde Texte, Termine, Preise und Fotos selbst
ändert – ohne dass die Website neu hochgeladen wird. Es ist so geschrieben, dass ein anderer
Chat damit aus einer alten Website eine neue Website **samt Redaktion** bauen und sie dem Kunden
mit dem Übergabeformular übergeben kann.

Referenz-Umsetzung: `webseiten/ssv-segelverein/` im Repo `jxnashap/Web-Projekte`. Alle Angaben
unten sind dort nachgelesen, nicht aus dem Gedächtnis.

> [!info] In einem Satz
> Die Seiten sind fertiges HTML mit Platzhaltern (`data-cms="…"`). Ein kleines Skript füllt sie:
> zuerst mit den Standardinhalten aus einer Datei, dann – falls eine Datenbank angeschlossen ist –
> mit den Inhalten aus der Datenbank. Die Redaktion schreibt genau diese Inhalte.

---

## 1 · Wofür das Schema passt – und wofür nicht

**Passt:** Vereine, Handwerker, Praxen, Gastronomie, Ferienvermietung – Websites mit 5 bis 15
Seiten, bei denen sich ein paar Dinge regelmäßig ändern: Hinweise, Neuigkeiten, Termine,
Öffnungszeiten und Preise, Fotos, Ansprechpartner.

**Passt nicht:** Shops, Blogs mit Hunderten Artikeln, mehrsprachige Redaktionen mit Freigabestufen,
Seiten, deren Aufbau der Kunde selbst umbauen will. Dafür ist ein richtiges CMS die bessere Wahl.

Grundsatz: **Der Aufbau der Seiten bleibt fest, nur die Inhalte in den Platzhaltern sind
pflegbar.** Das hält die Redaktion so einfach, dass auch Menschen über 50 ohne Schulung
zurechtkommen.

---

## 2 · Aufbau auf einen Blick

```
Generator (Python)                     erzeugt einmalig
  baukaesten/…/generatoren/build_<kunde>.py
        │
        ├─► *.html                     feste Seiten mit Platzhaltern  data-cms="aktuelles" …
        └─► js/inhalte-standard.js     Standardinhalte (JSON) = Ausgangszustand

Im Browser des Besuchers
  js/konfig.js      modus: 'demo' | 'supabase', Adresse und öffentlicher Schlüssel
  js/cms.js         füllt alle Platzhalter: Standard sofort, danach Live-Inhalte

Redaktion  /verwaltung/
  index.html        Anmeldung + Menü
  redaktion.js      Formulare je Bereich, speichert sofort, Live-Vorschau
  redaktion.css

Speicher
  Demo:      localStorage des Redakteurs (nur er sieht die Änderung, Kennzeichen „Vorschau“)
  Echtbetrieb: Supabase – Tabelle website_inhalte (ein Schlüssel je Bereich, JSON),
               Foto-Ablage „website“, Anmeldung über Supabase Auth, Rechte über RLS
```

Es gibt **keine Bibliotheken**: kein Framework, kein supabase-js. Alles ist einfaches JavaScript
mit `fetch`. Das macht die Seite schnell und über Jahre wartungsarm.

---

## 3 · Dateien der Referenz

| Datei | Aufgabe |
|---|---|
| `baukaesten/quiet-luxury/generatoren/build_ssv.py` | erzeugt alle Seiten; `INHALTE` = Standardinhalte; schreibt `js/inhalte-standard.js` |
| `webseiten/ssv-segelverein/js/konfig.js` | `window.SSV_WEB_KONFIG = { modus, supabaseUrl, supabaseAnonKey }` |
| `…/js/inhalte-standard.js` | `window.SSV_INHALTE_STANDARD = { version: 1, hinweis, hero, aktuelles, … }` |
| `…/js/cms.js` | Darstellung: `R` (ein Renderer je Platzhalter), `laden()`, `anwenden()`, Lightbox, Zähl-Animation |
| `…/verwaltung/index.html` | Anmeldemaske, Menü, lädt `konfig.js`, `inhalte-standard.js`, `cms.js`, `redaktion.js` |
| `…/verwaltung/redaktion.js` | Speicher-Adapter `Demo` und `Supa`, Bereiche `T.start`, `T.hinweis`, … |
| `…/verwaltung/redaktion.css` | Gestaltung der Redaktion |
| `…/supabase/website.sql` | Tabellen, Rechte, Foto-Ablage |
| `baukaesten/quiet-luxury/tools/shot-ssv.js` | Qualitätsprüfung mit Bildschirmfotos |
| `apps/ssv-hafen/tools/paket_bauen.py` | baut das Auslieferungspaket und trägt Modus, Adresse und Schlüssel ein |

Reihenfolge der Skripte auf jeder Seite (am Ende von `<body>`):
`konfig.js` → `inhalte-standard.js` → `cms.js` → `script.js` → weitere.

---

## 4 · Inhaltsmodell

Ein **Schlüssel** je Bereich. Der Wert ist JSON – in der Datei, im Browser-Speicher und in der
Datenbank immer in derselben Form. Listen-Einträge haben eine `id` (kurze Zufallskennung).

| Schlüssel | Form | Felder |
|---|---|---|
| `hinweis` | Objekt | `aktiv` (ja/nein), `text` (höchstens 240 Zeichen), `link`, `link_text` |
| `hero` | Objekt | `bild`, `eyebrow` (kleine Zeile darüber), `titel`, `betont` (hervorgehobenes Ende der Überschrift), `text` (höchstens 220 Zeichen) |
| `aktuelles` | Liste | `id`, `datum` (JJJJ-MM-TT), `titel` (höchstens 90), `text` (Absätze durch Leerzeile), `bild`, `link`, `link_text`, `angeheftet` |
| `termine` | Liste | `id`, `datum`, `bis` (mehrtägig, sonst leer), `zeit` (HH:MM), `titel` (höchstens 80), `ort`, `text` |
| `zeiten` | Liste von Karten | `id`, `titel`, `zeilen`: Liste aus `label` und `wert` |
| `zahlen` | Liste | `id`, `wert` (Zahl), `suffix` (z. B. „+“), `label` |
| `galerie` | Liste | `id`, `bild`, `titel` (Bildunterschrift, höchstens 90) |
| `vorstand` | Liste | `id`, `gruppe`, `rolle`, `name`, `zusatz`, `bild` |

Dazu `version: 1` (nur in Datei und Demo-Speicher).

**Bilder:** entweder ein Pfad relativ zur Website (`bilder/steg.jpg`) oder eine vollständige
Adresse (`https://…`, in der Demo `data:`). `cms.js` setzt bei relativen Pfaden die Basis davor –
in der Redaktion ist das `../`, weil sie eine Ebene tiefer liegt (`setzeBasis('../')`).

**Die `id` in `zeiten` ist fest verdrahtet:** Seiten rufen einzelne Karten gezielt ab
(`data-id="hafen,kran"`). Diese Kennungen dürfen sich nicht ändern; neue Karten bekommen
Zufallskennungen.

---

## 5 · Platzhalter auf den Seiten

Ein Platzhalter ist ein leeres Element mit `data-cms`. Zusätze steuern die Ausgabe.

| `data-cms` | Zusatz | Zeigt | In der Referenz auf |
|---|---|---|---|
| `hinweis` | – | Banner, nur wenn `aktiv` und Text da | Startseite unter dem Startbild |
| `hero-bild` | – | großes Foto | Startseite |
| `hero-text` | – | kleine Zeile, Überschrift, Text | Startseite |
| `aktuelles` | `data-limit="3"` | Meldungen, angeheftete zuerst, dann neueste | Startseite |
| `termine-naechste` | `data-limit="4"` | kommende Termine; ohne kommende: Hinweis und die zwei letzten | Startseite |
| `termine` | – | alle Termine nach Jahr und Monat, vergangene abgeblendet | Termine |
| `zeiten` | `data-limit` oder `data-id="a,b"` | Karten mit Zeilen | Start, Jugend, Hafen |
| `zahlen` | – | Zahlenband, zählt beim Erscheinen hoch | Startseite |
| `galerie` | `data-limit="6"` | Fotos mit Großansicht | Start (Auszug), Galerie |
| `vorstand` | – | Personen nach Gruppe | Verein |

Regeln für Platzhalter:

- Im HTML steht möglichst schon der Ausgangsinhalt (z. B. das Startbild), damit ohne JavaScript
  nichts leer ist. Wo das nicht geht: `<noscript>`-Hinweis.
- Ein Platzhalter darf zusätzlich Klassen für Einblend-Effekte tragen (`reveal`).
- Leere Ergebnisse bekommen die Klasse `cms-leer-slot` – so lassen sich leere Abschnitte ausblenden.

---

## 6 · Darstellung (`cms.js`)

- **Renderer sind reine Funktionen:** Inhalte hinein, HTML heraus. Dieselben Funktionen nutzt die
  Redaktion für die Vorschau. Kein Renderer greift auf die Seite zu.
- **Alles wird maskiert** (`esc`), bevor es ins HTML kommt. Der Kunde kann kein HTML einschleusen.
  Absätze entstehen nur aus Leerzeilen (`absaetze`).
- **Links werden geprüft** (`sicherLink`): erlaubt sind `https://`, `http://`, `mailto:`, `tel:`,
  eigene Seiten (`name.html`), `#anker` und `dokumente/…`. Alles andere wird nicht verlinkt.
- **Ablauf beim Laden** (`start()`): sofort die Standardinhalte einsetzen, dann `laden()`; kommen
  andere Inhalte zurück, noch einmal einsetzen. Schlägt das Laden fehl, bleiben die
  Standardinhalte stehen – die Website ist nie leer.
- **`laden()` im Echtbetrieb:** `GET <url>/rest/v1/website_inhalte?select=schluessel,daten` mit dem
  öffentlichen Schlüssel. Ergebnis wird über die Standardinhalte gelegt:
  `{ ...standard, ...live }`. Ein Bereich, den die Redaktion noch nie gespeichert hat, zeigt also
  weiter den Standard.
- **Demo:** Inhalte aus `localStorage` (`<kürzel>-web-demo-v1`). Dann bekommt `<html>` die Klasse
  `cms-vorschau` und unten links erscheint „Vorschau mit lokalen Änderungen“.
- **Sortierung:** Aktuelles – angeheftet zuerst, dann Datum absteigend. Termine – Datum, dann Uhrzeit.
- **Extras:** Lightbox für die Galerie (Pfeiltasten, Esc), Zahlen zählen hoch (aus bei
  „Bewegung reduzieren“).
- **Schalter:** `window.<KÜRZEL>_CMS_KEIN_AUTOSTART = true` vor dem Laden verhindert den
  Selbststart – die Redaktion setzt ihn, weil sie die Inhalte selbst lädt.

---

## 7 · Redaktion (`/verwaltung/`)

### Bedienung

- **Anmeldung** mit E-Mail und Passwort. In der Demo: `redaktion@demo` / `demo`, vorausgefüllt.
- **Menü links** (am Handy oben): Übersicht, Hinweis-Banner, Aktuelles, Termine, Zeiten & Preise,
  Fotos, Startbild, Vorstand, Zahlen; unten „Website ansehen“ und „Abmelden“.
- **Übersicht** mit Kacheln („Was möchtest du heute auf der Website ändern?“) und Zählern.
- **Jede Änderung wird sofort gespeichert.** Rückmeldung als kurze Einblendung:
  „Gespeichert – jetzt online“ bzw. in der Demo „… – Vorschau in diesem Browser“.
- **Live-Vorschau rechts** auf großen Bildschirmen: die echte Seite in einem Rahmen, wird nach
  jedem Speichern neu geladen. Welche Seite zu welchem Bereich gehört, steht in `VORSCHAU`.
- **Am Handy bedienbar** – Fotos lassen sich direkt aus der Kamera hochladen.
- `<meta name="robots" content="noindex, nofollow">` – Suchmaschinen sollen die Redaktion nicht finden.

### Bausteine in `redaktion.js`

| Baustein | Was er tut |
|---|---|
| `Demo` / `Supa` | zwei Speicher mit derselben Schnittstelle: `anmelden`, `angemeldet`, `abmelden`, `laden`, `speichern(schluessel, daten, alles)`, `bildHochladen(blob)`; `Demo` zusätzlich `zuruecksetzen` |
| `speichern(schluessel, meldung)` | schreibt genau einen Bereich, zeigt die Einblendung, lädt die Vorschau neu |
| `fotoVerkleinern` | dreht nach den Bilddaten richtig herum, verkleinert auf höchstens 2000 px (Demo 1280), speichert als JPEG mit Qualität 0,85 (Demo 0,78) |
| `linkFeld` | Auswahl „kein Link / eine Seite der Website / eigene Adresse“ – die Liste `SEITEN` je Kunde anpassen |
| `bildFeld` | „Foto hochladen“, „Aus Galerie“, „Entfernen“ |
| `verschieben` | Reihenfolge mit Pfeil-Knöpfen |
| `T.<bereich>` | je Bereich eine Funktion, die die Seite baut und ihre Knöpfe verdrahtet |
| `zeige(t)` | wechselt den Bereich, merkt ihn in der Adresse (`#termine`) |

Besonderheiten je Bereich:

- **Termine:** kommende und vergangene getrennt; ein alter Termin lässt sich „Kopieren“ – als
  Vorlage fürs nächste Jahr.
- **Fotos:** mehrere auf einmal hochladen, neue stehen vorn, Bildunterschrift nachtragen, sortieren.
- **Zeiten & Preise:** Karten mit beliebig vielen Zeilen (Bezeichnung und Wert), Reihenfolge änderbar.
- **Startbild:** Foto, kleine Zeile, Überschrift, hervorgehobenes Ende, Text.
- **Demo:** „Zurücksetzen“ stellt die Ausgangsinhalte wieder her.

### Speicher im Echtbetrieb (`Supa`) – die genauen Aufrufe

| Zweck | Aufruf |
|---|---|
| anmelden | `POST /auth/v1/token?grant_type=password` mit `{ email, password }`; Antwort in `localStorage` (`<kürzel>-red-session`) |
| Berechtigung prüfen | `POST /rest/v1/rpc/ist_redakteur` – nur bei `true` bleibt man angemeldet |
| Sitzung verlängern | `POST /auth/v1/token?grant_type=refresh_token`, sobald weniger als 60 s übrig sind |
| laden | `GET /rest/v1/website_inhalte?select=schluessel,daten` |
| speichern | `POST /rest/v1/website_inhalte?on_conflict=schluessel` mit `Prefer: resolution=merge-duplicates` und `{ schluessel, daten }` |
| Foto hochladen | `POST /storage/v1/object/website/<JJJJ-MM>/<zufall>.jpg`, `Content-Type: image/jpeg`; öffentliche Adresse: `/storage/v1/object/public/website/…` |

Kopfzeilen immer: `apikey: <öffentlicher Schlüssel>` und `Authorization: Bearer <Sitzung oder öffentlicher Schlüssel>`.

---

## 8 · Datenbank (Supabase)

Vollständiges SQL – einmal im SQL-Editor ausführen. Die Liste der Schlüssel in der `check`-Regel
muss zu den Bereichen des Kunden passen.

```sql
create table if not exists public.redakteure (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name    text
);

create table if not exists public.website_inhalte (
  schluessel    text primary key
                check (schluessel in ('hinweis','hero','aktuelles','termine','zeiten','zahlen','galerie','vorstand')),
  daten         jsonb not null,
  geaendert     timestamptz not null default now(),
  geaendert_von uuid default auth.uid()
);

create or replace function public.ist_redakteur() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.redakteure where user_id = auth.uid());
$$;

create or replace function public._inhalt_gestempelt() returns trigger
language plpgsql as $$
begin new.geaendert := now(); new.geaendert_von := auth.uid(); return new; end $$;
drop trigger if exists inhalt_stempel on public.website_inhalte;
create trigger inhalt_stempel before insert or update on public.website_inhalte
  for each row execute function public._inhalt_gestempelt();

alter table public.redakteure      enable row level security;
alter table public.website_inhalte enable row level security;

drop policy if exists lesen on public.website_inhalte;
create policy lesen on public.website_inhalte for select to anon, authenticated using (true);
drop policy if exists schreiben on public.website_inhalte;
create policy schreiben on public.website_inhalte for all to authenticated
  using (public.ist_redakteur()) with check (public.ist_redakteur());
drop policy if exists selbst on public.redakteure;
create policy selbst on public.redakteure for select to authenticated using (user_id = auth.uid());

revoke all on public.website_inhalte from anon;
grant select on public.website_inhalte to anon;
grant select, insert, update, delete on public.website_inhalte to authenticated;
grant select on public.redakteure to authenticated;
grant execute on function public.ist_redakteur() to authenticated;

-- Fotos: öffentliche Ablage „website“, höchstens 5 MB, nur JPEG/PNG/WebP
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('website', 'website', true, 5242880, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do nothing;
    drop policy if exists website_hochladen on storage.objects;
    create policy website_hochladen on storage.objects for insert to authenticated
      with check (bucket_id = 'website' and public.ist_redakteur());
    drop policy if exists website_loeschen on storage.objects;
    create policy website_loeschen on storage.objects for delete to authenticated
      using (bucket_id = 'website' and public.ist_redakteur());
  end if;
end $$;
```

Redakteur freischalten – das Konto vorher unter *Authentication → Users* anlegen:

```sql
insert into public.redakteure (user_id, name)
select id, 'Redaktion' from auth.users where email = 'redaktion@kunde.de';
```

Was die Regeln bewirken:

- **Lesen darf jeder** – die Website ist öffentlich.
- **Schreiben und Fotos hochladen darf nur**, wer in `redakteure` steht. Ein beliebiges neues
  Konto kann nichts ändern.
- Jede Änderung trägt Zeit und Konto (`geaendert`, `geaendert_von`).
- Die Tabelle muss **nicht vorbefüllt** werden: solange ein Schlüssel fehlt, zeigt die Website
  den Standard aus `inhalte-standard.js`.

---

## 9 · Sicherheit und Datenschutz – feste Regeln

- Im Browser steht nur der **öffentliche Schlüssel** (anon). Der geheime Schlüssel (service role)
  gehört nie in eine Datei der Website.
- Rechte regelt die Datenbank (RLS), nicht das Skript.
- Eingaben werden maskiert, Links geprüft, Fotos auf Größe und Format begrenzt.
- **Je Kunde ein eigenes Supabase-Projekt** und ein eigenes Hosting-Projekt. Nie mit anderen
  Kunden oder eigenen Projekten mischen.
- Schriften liegen auf dem eigenen Server. Keine Cookies, kein Tracking – dann braucht es kein
  Cookie-Banner.
- **Karten:** nur Google Maps und Apple Karten als Links; eine eingebettete Google-Karte nur mit
  Zwei-Klick-Lösung (Vorlage `js/karte.js`). Kein OpenStreetMap.
- Fotos von Personen nur mit Einwilligung – im Übergabeformular abfragen.
- Impressum und Datenschutzerklärung: Angaben des Kunden einsetzen, Unbelegtes als
  `[PLATZHALTER]` markieren, juristische Prüfung empfehlen. Datenbankanbieter und Hosting in der
  Datenschutzerklärung nennen.
- Geheimnisse (Passwörter, Schlüssel) nie in den Chat – der Kunde trägt sie selbst ein.

---

## 10 · Ablauf: alte Website → neue Website mit Redaktion

### A · Was der Chat vom Auftraggeber braucht

- die **alte Website** als ZIP oder ihre Adresse (ohne freien Internetzugang: ZIP hochladen oder
  Dateien über die Asset-Bridge holen – `.github/workflows/fetch-assets.yml` und
  `assets-manifest.json` am Repo-Anfang);
- Logo, Farben, Wunschbild („ruhig“, „modern“, „traditionell“);
- wer die Redaktion bedient (Alter, Handy oder Rechner) und **was sich bei ihm regelmäßig ändert**;
- Domain, bisheriger Anbieter, gewünschter Starttermin.

### B · Bestandsaufnahme der alten Website

1. Alle Seiten auflisten: Titel, Zweck, Texte, Bilder, PDFs, Formulare, eingebundene Dienste.
2. Fakten herausschreiben: Adresse, Telefon, Zeiten, Preise, Namen, Termine. **Nur Belegtes
   übernehmen**; Fehlendes als `[PLATZHALTER]`, Erfundenes zur Ansicht als `[BEISPIEL]` markieren.
3. Jeden Inhalt einordnen:

| Frage | Ja → | Nein → |
|---|---|---|
| Ändert er sich mehrmals im Jahr? | **pflegbar** (Schlüssel in der Redaktion) | fest im Generator |
| Kann der Kunde ihn ohne Gestaltungswissen pflegen (Text, Datum, Foto, Zahl)? | pflegbar | fest |
| Hängt die Gestaltung der Seite daran (Abschnittsfolge, Überschriften)? | fest | – |

4. Bilder sichten: Qualität, Rechte, Personen. Unbrauchbares ersetzen oder weglassen.

### C · Bereiche festlegen

Die acht Standardbereiche (`hinweis`, `hero`, `aktuelles`, `termine`, `zeiten`, `zahlen`,
`galerie`, `vorstand`) decken die meisten Kunden ab – umbenannt nach Branche:

| Branche | `zeiten` heißt | `vorstand` heißt | `zahlen` zeigt |
|---|---|---|---|
| Verein | Zeiten & Preise | Vorstand | Mitglieder, Boote, Gründungsjahr |
| Handwerk | Leistungen & Preise | Team | Jahre, Projekte, Mitarbeiter |
| Praxis | Sprechzeiten | Team | – (weglassen) |
| Gastronomie | Öffnungszeiten & Karte | Team | – |
| Ferienvermietung | Preise & Saisonzeiten | Gastgeber | Betten, Entfernung zum Strand |

Nicht gebrauchte Bereiche **weglassen** (Menüpunkt, Kachel, Platzhalter, Schlüssel).

**Neuen Bereich hinzufügen** – immer an diesen fünf Stellen:

1. Generator: Standardinhalt in `INHALTE['<schlüssel>']`.
2. `cms.js`: Renderer `R['<platzhalter>']` (reine Funktion, alles maskieren).
3. Seite: Platzhalter `<div data-cms="<platzhalter>"></div>`.
4. `redaktion.js`: Bereich `T.<schlüssel>` mit Formular, Eintrag in `VORSCHAU`, Kachel in `T.start`;
   in `verwaltung/index.html` der Menüknopf `data-tab="<schlüssel>"`.
5. SQL: Schlüssel in die `check`-Regel von `website_inhalte` aufnehmen.

Bewährte Zusatzbereiche: Downloads (Titel und Datei), Häufige Fragen (Frage und Antwort),
Sponsoren/Partner (Logo und Link), Stellenangebote, Speisekarte (Gruppe, Gericht, Preis).

### D · Bauen

1. Baukasten wählen: `baukaesten/quiet-luxury/` (Standard) oder `baukaesten/premium-estate/`
   (teure Zielgruppen). Farben aus dem Logo, Schriften lokal.
2. Generator `build_<kunde>.py` anlegen: Seiten in `PAGES`, Standardinhalte in `INHALTE`,
   am Ende `js/inhalte-standard.js` schreiben.
3. Aus der Referenz kopieren und anpassen: `js/cms.js`, `js/konfig.js`, `verwaltung/` (alle drei
   Dateien), `supabase/website.sql`.
4. **Kennungen umbenennen** – sonst teilen sich zwei Kunden-Websites im selben Browser den Speicher:

| In der Referenz | Ersetzen durch |
|---|---|
| `SSV_WEB_KONFIG` | `<KÜRZEL>_WEB_KONFIG` |
| `SSV_INHALTE_STANDARD` | `<KÜRZEL>_INHALTE_STANDARD` |
| `SSV_CMS`, `SSV_CMS_KEIN_AUTOSTART` | `<KÜRZEL>_CMS`, `<KÜRZEL>_CMS_KEIN_AUTOSTART` |
| `ssv-web-demo-v1` | `<kürzel>-web-demo-v1` |
| `ssv-red`, `ssv-red-session` | `<kürzel>-red`, `<kürzel>-red-session` |
| Titel, Logo-Zeichen (`#stander`), Farben in `redaktion.css` | Name, Logo und Farben des Kunden |
| Liste `SEITEN` und Zuordnung `VORSCHAU` in `redaktion.js` | Seiten des Kunden |

5. Texte der Redaktion in der Sprache des Kunden: Anrede (du/Sie), Begriffe aus seinem Alltag.

### E · Prüfen

- **Website:** Bildschirmfoto-Werkzeug des Baukastens bei 1440 px und 390 px –
  Einblend-Zählung muss n/n sein, kein Querscrollen, keine leeren Platzhalter.
- **Redaktion, jeden Bereich:** anlegen, ändern, löschen, sortieren; Foto vom Handy hochladen;
  Vorschau stimmt; am Handy bedienbar; falsches Passwort wird abgewiesen.
- **Datenbank:** SQL einmal gegen eine lokale PostgreSQL laufen lassen (die Foto-Ablage wird dort
  übersprungen). Prüfen: ohne Anmeldung lesen geht, schreiben nicht; angemeldet ohne
  Freischaltung schreiben geht nicht; freigeschaltet geht es.
- **Ohne JavaScript und ohne Datenbank:** Seite zeigt die Standardinhalte.

### F · Echtbetrieb einrichten

1. Supabase-Projekt für den Kunden anlegen (Region EU), SQL ausführen.
2. Konto der Redaktion unter *Authentication → Users* anlegen, in `redakteure` freischalten.
3. `js/konfig.js`: `modus: 'supabase'`, Projekt-Adresse, öffentlicher Schlüssel.
4. Hochladen (Vercel oder jeder Webspace – es sind nur Dateien). Sicherheits-Kopfzeilen setzen;
   **die Sperre für Suchmaschinen (`X-Robots-Tag: noindex`) gehört nur in Vorschauen** und muss
   für die echte Website raus.
5. Domain umstellen, verschlüsselten Zugriff prüfen.
6. Öffentlich schalten erst nach ausdrücklicher Freigabe des Kunden.

### G · Übergeben

1. `Uebergabeformular-Vorlage.md` ausfüllen (alle `{{…}}` ersetzen), als PDF sichern, zuschicken.
2. Zugangsdaten **getrennt** vom Formular übermitteln (Passwort am Telefon oder per Einmal-Link).
3. 30 Minuten Einweisung: Hinweis-Banner an- und ausschalten, eine Meldung schreiben, ein Foto
   hochladen, einen Termin eintragen.
4. Abnahme auf dem Formular bestätigen lassen.

---

## 11 · Gestaltungsregeln für die Redaktion

- Zielgruppe oft 50+: Grundschrift mindestens 16 px, Knöpfe mindestens 40 px hoch, eine
  Hauptaktion je Ansicht.
- Sprache des Alltags: „Hinweis-Banner“, „Startbild“, „Fotos“ – nicht „Hero“, „Slot“, „Upload“.
- Jede Ansicht sagt in einem Satz, wo der Inhalt auf der Website erscheint.
- Speichern meldet sich zurück und sagt, ob es „jetzt online“ ist.
- Nichts kann die Website kaputt machen: feste Felder, Längenbegrenzung, geprüfte Links,
  leere Bereiche werden ausgeblendet.
- Löschen fragt nach.

---

## 12 · Grenzen und Stolpersteine

- **Demo-Speicher ist klein:** Fotos liegen in der Demo als Daten im Browser-Speicher (rund 5 MB).
  Ist er voll, meldet die Redaktion das. Im Echtbetrieb gibt es die Grenze nicht.
- **Neuer Schlüssel ohne SQL-Anpassung:** Speichern scheitert an der `check`-Regel.
- **Die Foto-Ablage gibt es nur in Supabase** – in einer lokalen Test-Datenbank fehlt sie.
- **Kein Rückgängig, keine Versionen:** gespeichert ist gespeichert. Für wichtige Inhalte vor
  größeren Änderungen eine Kopie der Tabelle ziehen. Eine Sicherung zum Herunterladen ist eine
  sinnvolle Erweiterung.
- **Zwei Redakteure gleichzeitig:** je Bereich gewinnt, wer zuletzt speichert.
- **Entfernte Fotos bleiben in der Ablage** liegen; sie werden nur nicht mehr gezeigt.
- **Einbetten fremder Seiten** (z. B. eine Karte aus einer App desselben Kunden) geht nur unter
  derselben Adresse, solange `X-Frame-Options: SAMEORIGIN` gesetzt ist.
- **Bildpfade in der Redaktion** brauchen die Basis `../` – sonst fehlen dort die Bilder.

---

## 13 · Auftrag für einen anderen Chat (zum Kopieren)

> Baue aus der beigefügten alten Website eine neue Website **mit Redaktion** nach dem Bauschema
> „Redaktion für Kunden-Websites“ (Vault, Bereich Website-Entwicklung). Referenz ist
> `webseiten/ssv-segelverein/` im Repo `jxnashap/Web-Projekte`.
>
> 1. Mach die Bestandsaufnahme (Abschnitt 10 B) und zeig mir die Tabelle „fest / pflegbar“.
> 2. Schlage die Bereiche der Redaktion vor (Abschnitt 10 C) und warte auf mein Ja.
> 3. Baue Website und Redaktion (10 D), prüfe sie (10 E) und gib mir eine Vorschau im Demo-Modus.
> 4. Fülle das Übergabeformular aus und sag mir, welche Angaben noch fehlen.
>
> Regeln: nur belegte Fakten, Unbelegtes als `[PLATZHALTER]`; eigenes Supabase- und
> Hosting-Projekt je Kunde; keine Geheimnisse in den Chat; öffentlich erst nach meiner Freigabe;
> Karten nur Google Maps und Apple Karten.
>
> Kunde: {{Name}} · Branche: {{Branche}} · Kürzel: {{kürzel}} · Anrede in der Redaktion: {{du/Sie}}

---

## 14 · Verweise

- Referenz-Website: `webseiten/ssv-segelverein/` (README dort: was die Redaktion kann, was vor dem
  Start zu erledigen ist)
- Übergabeformular: `baukaesten/redaktion/Uebergabeformular-Vorlage.md`
- Baukästen: `baukaesten/quiet-luxury/README.md`, `baukaesten/premium-estate/`
- Arbeitsregeln des Repos: `CLAUDE.md` (Abschnitt „Arbeitsweise“)
