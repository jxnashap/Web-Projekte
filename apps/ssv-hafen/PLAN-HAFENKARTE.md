# Hafenkarte – Recherche und Plan (Nov. 2026)

Auftrag: Die Hafengrafik aufwendig ausbauen (leuchtende Bojen grün = frei, rot = belegt), maßstäblich,
aber anpassbar; einzelne Boxen und Winterlager-Plätze verschieben, hinzufügen, löschen, Größe ändern;
Planung „so will ich es nächstes Jahr“; als Plan drucken; Gäste-Karte „wer liegt wann wo“ mit Kalender;
später auf der Website zeigen, was frei ist.

## 1 · Recherche (Kurzfassung)

| Frage | Ergebnis | Folge für uns |
|---|---|---|
| Wie zeigen Marina-Programme Belegung? | Karte mit Echtzeit-Belegung, auf der das Hafenbüro Boote direkt einweist (DockMaster, Speedydock); dazu eine Zeitleiste „welcher Platz ist in den nächsten Wochen frei“ (Metarina); Gäste wählen den Platz auf der Karte. | Zwei Sichten auf dieselben Daten: **Karte** (ein Tag/Zeitraum) und **Kalender** (Zeitleiste je Platz). Eintragen direkt aus beiden. |
| Gibt es bei Vereinen eine Live-Karte mit rot/grün? | Kaum – üblich sind Schilder am Platz und Buchungs-Apps; Yacht.de beschreibt einen „Flickenteppich“. | Das grüne Schild des Vereins wird 1:1 zur grünen Boje; die Karte ist ein echter Mehrwert für Gäste. |
| Was bleibt bei vielen bewegten SVG-Teilen flüssig? | Nur `transform` und `opacity` animieren; Weichzeichner-Filter sind teuer (WebKit-Fehlerbericht: > 500 ms auf älteren iPhones); `will-change` sparsam. | Leuchten über Farbverläufe statt Filter, Puls nur über `opacity`/`transform`; beim Ziehen pausieren; „Bewegung reduzieren“ schaltet alles ab. |
| Datenschutz öffentliche Karte | Bisher bewusst: Mitglieder sehen den Status nur für „heute“ (`hafen_platzstatus`), damit niemand ablesen kann, wann ein Boot weg ist. | Öffentlich nur **frei / belegt** je Platznummer, ohne Namen, ohne Unterschied „grünes Schild“ / „unvergeben“; Zeitraum begrenzt; Vorstand schaltet es ein (Standard: aus). |

Quellen: dockmaster.com/solutions/marina-management · speedydock.com/products/slip-reservations ·
metarina.com/features · yacht.de (Liegeplatz-Buchung per App, Teil 1) · web.dev/animations-guide ·
motion.dev/blog/web-animation-performance-tier-list · bugs.webkit.org 226321.

Higgsfield: bewusst **nicht** für die Karte selbst – ein KI-Bild ist nicht maßstäblich, nicht druckbar als
Vektor und ließe sich nicht verschieben. Sinnvoll erst für ein Stimmungsbild/-video neben der Karte auf der Website.

## 2 · Datenmodell (abwärtskompatibel, `einstellungen.lageplan`)

- **Einzelne Box am Steg**: `stege[].aus = { "<Nr>": { b, t, l, q, w, weg } }`
  `b`/`t` = Breite/Tiefe in Metern (die übrigen Boxen teilen sich den Rest des Stegs), `l`/`q` = frei verschoben
  (Lage längs/quer zum Steg in Plan-Einheiten – wandert mit, wenn der Steg verschoben wird), `w` = Drehung,
  `weg` = Box entfernt.
- **Einzelplatz im Wasser**: wie bisher `laengs[]`, neu mit Breite `h` – für Plätze ohne Steg-Raster.
- **Einzelner Lagerplatz**: `lager[].aus = { "<Index>": { mx, my, w, h, neig, weg } }` (Lage/Größe im Feld);
  ein Lagerfeld mit Anzahl 1 ist ein frei stehender Einzelplatz.
- **Planungen**: `einstellungen.lageplan_planungen = [{ id, name, plan, stand }]` – Entwürfe neben dem gültigen
  Plan; „gültig schalten“ tauscht (der bisherige Plan bleibt als Planung erhalten).
- Neue Nummern im Plan, die es im Verein noch nicht gibt, legt das Programm auf Wunsch als Liege-/Landplatz an.

## 3 · Bausteine und Reihenfolge

1. **Grafik** (`js/plan.js`, `css/hafen.css`): Wasser mit Tiefe, Uferzone, Lichtreflexe; Holzstege mit Planken,
   Pfählen und Schatten; Boote in echter Größe (aus Länge/Breite des Boots), Segel-/Motorboot, Gäste farbig;
   Bojen je Platz – grün pulsierend = frei für Gäste, rot ruhig = belegt, mit Lichtschein auf dem Wasser;
   Bäume, Gebäude mit Dach und Schatten, Kran, Kompassrose; Schwebekarte beim Zeigen/Antippen.
2. **Zeichenfenster** (`js/plan-editor.js`): einzelne Box / einzelner Lagerplatz auswählen, ziehen, drehen,
   Maße in Metern, löschen; Einzelplatz hinzufügen; Lagerfeld als Ganzes bleibt verschiebbar.
3. **Planungen + Druck**: „Als Planung speichern“, Planung ansehen, gültig schalten; Druck A4/A3 quer im
   SSV-Briefkopf (Flagge links, Adresse rechts) mit Legende, Maßstab, Nordpfeil, wahlweise Bootsnamen.
4. **Gäste-Karte + Kalender** (Gäste & grünes Schild): Anreise + Nächte wählen → Karte zeigt, was im ganzen
   Zeitraum frei ist; Platz antippen → Gast eintragen; Kalender = Zeitleiste je Platz (grünes Schild aus
   Mein SSV, Gäste, Dauerlieger), freie Tage antippen → eintragen.
5. **Öffentliche Karte** (`hafenplan.html`, Nachtrag 17): nur frei/belegt, vom Vorstand schaltbar; auf der
   Website verlinkt/eingebettet.
6. Tests (Demo + Datenbank), Anleitung, Pakete, Vorschau.

## 4 · Grenzen

- Die Lage der Platznummern bleibt eine Annahme, bis der Verein sie bestätigt.
- Die öffentliche Karte geht erst online, wenn der Vorstand sie einschaltet und die Live-Fassung freigibt.
