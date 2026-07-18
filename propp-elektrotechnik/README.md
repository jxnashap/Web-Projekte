# Propp Elektrotechnik GmbH – Website-Relaunch

Moderner, deploy-fertiger One-Pager für die **Propp Elektrotechnik GmbH** (Lübeck,
seit 1949). Alle Inhalte, das Logo und die Markenfarbe (**Azur #009EE3 / HKS 47**)
wurden von der bestehenden Seite `propp.de` übernommen. Kern-Feature ist eine
**Kabel-Scroll-Animation**: Beim Herunterscrollen zeichnet sich ein Stromkabel (SVG),
ein leuchtender Funke wandert daran entlang, und die Leistungen erscheinen nacheinander.

## Struktur

```
/
├── index.html            One-Pager: Hero · Leistungen (Kabel) · Über uns · Karriere · Kontakt
├── impressum.html        Impressum (echte Registerdaten übernommen)
├── datenschutz.html      Datenschutz (Platzhalter-Gerüst – juristisch prüfen)
├── css/style.css         Design-System (Azur / Navy / Gold)
├── js/script.js          Header, Menü, Kabel-Animation, Reveals, Formular-Validierung
├── assets/
│   ├── propp-logo.png            Original-Logo (von propp.de)
│   ├── 75-jahre.svg              Original 75-Jahre-Jubiläumslogo
│   ├── cert-*.png/.jpg           VDB, Blitzschutz-Fachkraft, E-Innung, zert-bau
│   ├── favicon.svg               Blitz-Favicon in Markenfarbe
│   └── img/elektro-arbeit.jpg    Platzhalterfoto Über-uns
└── README.md
```

## Kabel-Scroll-Animation

Ein SVG-Pfad (`.cable-line`) mit `stroke-dasharray/‑dashoffset`, gebunden an die
Scrollposition der Leistungs-Sektion – das Kabel „zeichnet" sich von oben nach unten.
Ein Funke (`.spark`) folgt via `getPointAtLength(progress · Länge)`. Die Stations-
Knoten leuchten (Gold), sobald der Funke sie passiert. Die Leistungskarten fahren per
`IntersectionObserver` nacheinander ein, die Detailpunkte gestaffelt (transition-delay).
**Fallbacks:** bei `prefers-reduced-motion` und ohne JavaScript werden alle Inhalte
statisch angezeigt (Kabel-Grafik ausgeblendet); mobil bleibt alles flüssig.

## Deployment (Netlify / Vercel)

Statischer Ordner, kein Build-Schritt. **Netlify:** app.netlify.com → „Add new site" →
„Deploy manually" → Ordner hineinziehen. **Vercel:** vercel.com/new → als statisches
Projekt deployen.

## To-dos vor dem Livegang

- **[To-do] SSL erneuern:** Das Zertifikat der aktuellen Domain `propp.de` ist
  abgelaufen (Seite läuft nur über http). Beim Aufschalten ein gültiges Zertifikat
  einrichten (bei Netlify/Vercel automatisch via Let's Encrypt).
- **[PLATZHALTER] Google-Maps-Karte:** aktuell Standard-Embed der Adresse – ggf. durch
  offizielles Maps-Embed/Place-ID ersetzen und DSGVO-konform (Consent) laden.
- **[PLATZHALTER] Bewerbungs-/Kontaktformular an Backend anbinden** (z. B. Netlify Forms
  oder Formspree) – aktuell nur Client-Validierung + Erfolgsmeldung (siehe `js/script.js`).
- **[ECHTES FOTO EINSETZEN]** Über-uns-Bild gegen ein echtes Team-/Firmenfoto tauschen.
- **[PLATZHALTER] Datenschutz** juristisch finalisieren; Impressum-Angaben gegenprüfen.
- Google Fonts bei Bedarf DSGVO-konform lokal einbinden.

## Farben & Logo

- Markenfarbe **Azur #009EE3** (exakt aus Logo/CSS der Originalseite, HKS 47).
- Ergänzend Navy (#0c2233) für Kontrast-Sektionen, Gold (#d7b469, aus dem 75-Jahre-Logo).
- Original-Logo (`propp-logo.png`, transparentes PNG) unverändert übernommen.
- Schrift: Barlow / Barlow Condensed.
