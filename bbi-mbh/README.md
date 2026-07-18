# BBI mbH – Website-Relaunch

Moderner, mehrseitiger Webauftritt für die **BBI Bau- Betriebs- und Immobiliengesellschaft mbH**,
Timmendorfer Strand – mit interaktivem 3D-Gebäudemodell im Hero (mit Higgsfield generiert).

## Struktur

```
/
├── index.html            Startseite mit interaktivem 3D-Hero
├── leistungen.html       Projektentwicklung · Bauträger & Hochbau · Immobilien & Bestand
├── projekte.html         Referenz-Galerie (Platzhalter für reale Projekte)
├── ueber-uns.html        Historie, Familie Lindner, Werte, Standort
├── ablauf.html           6-Schritte-Ablauf + FAQ-Akkordeon
├── karriere.html         Arbeitgeberseite + Stellen-Platzhalter
├── kontakt.html          Anfrageformular (validiert), Karte, Kontaktdaten
├── impressum.html        Platzhalter-Gerüst (rechtlich prüfen!)
├── datenschutz.html      Platzhalter-Gerüst (rechtlich prüfen!)
├── css/style.css         zentrales Design-System (Marineblau/Sand/Bronze)
├── js/script.js          Header, mobiles Menü, Scroll-Reveal, FAQ, Formular-Validierung
└── assets/
    ├── 3d/bbi-gebaeude.glb   drehbares 3D-Gebäudemodell (Hero)
    └── img/hero-poster.png   Standbild-Fallback / Poster des 3D-Modells
```

## Deployment

**Netlify (Drag & Drop):**
1. https://app.netlify.com → „Add new site" → „Deploy manually"
2. Diesen kompletten Ordner (`bbi-mbh/`) in die Fläche ziehen – fertig.

**Vercel:**
1. https://vercel.com/new → Projekt anlegen, diesen Ordner als Root wählen
2. Framework-Preset: „Other" (statische Seite), keine Build-Einstellungen nötig.

Es gibt keinen Build-Schritt – reines HTML/CSS/JS.

## Vor dem Livegang (To-dos)

- Alle `[PLATZHALTER: …]`-Markierungen im HTML mit echten Daten füllen
  (Projekte, HRB-Nummer, USt-IdNr., Stellen, Bürozeiten).
- Alle `<!-- [ECHTES FOTO EINSETZEN: …] -->`-Kommentare beachten:
  Unsplash-Platzhalterbilder gegen echte Firmen-/Projektfotos tauschen.
- Formular-Backend anbinden (z. B. Netlify Forms: `data-netlify="true"` am
  `<form>` ergänzen – oder Formspree/eigenes Skript), siehe `js/script.js`.
- Impressum & Datenschutz juristisch prüfen lassen.
- `og:image` auf absolute URL der Live-Domain umstellen.
- Social-Media-Kanäle anlegen und die Footer-Icons verlinken.

## Technik-Hinweise

- 3D-Viewer: [`<model-viewer>`](https://modelviewer.dev) via CDN, lädt lazy;
  bis dahin und auf schwachen Geräten erscheint automatisch das Poster-Standbild.
- Google Fonts: Cormorant Garamond + Jost (bei Bedarf DSGVO-konform lokal einbinden).
- Responsive (mobile-first), semantisches HTML5, Meta/OG je Seite, Favicon als SVG.
