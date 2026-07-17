# Autohaus Bad Schwartau – Website-Relaunch

Moderner, mehrseitiger Webauftritt für die **Autohaus Bad Schwartau GmbH & Co. KG**
(Bosch Car Service) – mit interaktivem 3D-Automodell im Hero (mit Higgsfield generiert)
und klarem Conversion-Ziel: **Werkstatt-Terminanfrage**.

Hintergrund: Die bisherige Website ist wegen eines defekten SSL-Zertifikats faktisch
offline (Browser-Sicherheitswarnung). Dieser Auftritt ist ein kompletter Neuaufbau.

## Struktur

```
/
├── index.html            Startseite mit 3D-Auto-Hero, Leistungen, Bosch-Vertrauen, Termin-CTA
├── leistungen.html       Inspektion/Wartung · HU/AU · Reifen & Klima · Unfall · Diagnose
├── fahrzeuge.html        Fahrzeugangebote (Platzhalter) + echte Links zu mobile.de/AutoScout24
├── ueber-uns.html        Inhaber Arndt & Kaske, Werte, Standort
├── termin.html           Terminanfrage-Formular (validiert), Karte, Öffnungszeiten, FAQ
├── impressum.html        Platzhalter-Gerüst (rechtlich prüfen!)
├── datenschutz.html      Platzhalter-Gerüst (rechtlich prüfen!)
├── css/style.css         zentrales Design-System (Carbon/Silber/Signalrot)
├── js/script.js          Header, mobiles Menü, Scroll-Reveal, FAQ, Formular-Validierung
└── assets/
    ├── 3d/autohaus-fahrzeug.glb   drehbares 3D-Automodell (Hero)
    └── img/hero-poster.png        Standbild-Fallback / Poster des 3D-Modells
```

## Deployment

**Netlify (Drag & Drop):** https://app.netlify.com → „Add new site" → „Deploy manually"
→ diesen Ordner hineinziehen. **Vercel:** https://vercel.com/new → Ordner als statisches
Projekt („Other") deployen. Kein Build-Schritt nötig.

Wichtig: Beim Aufschalten auf die bestehende Domain unbedingt ein **gültiges
SSL-Zertifikat** einrichten (bei Netlify/Vercel automatisch via Let's Encrypt) –
der SSL-Defekt war der Hauptgrund für den Neuaufbau.

## Vor dem Livegang (To-dos)

- Alle `[PLATZHALTER: …]`-Markierungen füllen (Öffnungszeiten bestätigen, HRA/HRB,
  USt-IdNr., Prüforganisation, Ersatzwagen-Regelung, Kundenzitate).
- `<!-- [ECHTES FOTO EINSETZEN: …] -->`: Unsplash-Platzhalter gegen echte Fotos von
  Werkstatt, Team und Fahrzeugen tauschen.
- Offizielles **Bosch Car Service Partner-Logo** einsetzen (Lizenzmaterial von Bosch,
  nicht selbst nachbauen).
- Fahrzeugbestand anbinden (mobile.de-/AutoScout24-Widget oder manuelle Pflege).
- Formular-Backend anbinden (z. B. Netlify Forms) – siehe Kommentar in `js/script.js`.
- Impressum & Datenschutz juristisch prüfen lassen; `og:image` auf absolute URL stellen.

## Technik-Hinweise

- 3D-Viewer: [`<model-viewer>`](https://modelviewer.dev) via CDN, lazy geladen;
  Poster-Standbild als sofortiger Fallback (auch für schwache Geräte).
- Google Fonts: Barlow + Barlow Condensed (bei Bedarf DSGVO-konform lokal einbinden).
- Responsive (mobile-first), semantisches HTML5, Meta/OG je Seite, SVG-Favicon.
