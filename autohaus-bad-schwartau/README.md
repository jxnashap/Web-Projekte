# Autohaus Bad Schwartau – Website-Relaunch

Moderner, mehrseitiger Webauftritt für die **Autohaus Bad Schwartau GmbH & Co. KG**
(Bosch Car Service) – mit einer großen 360°-Scroll-Animation des eigenen MINI Cooper C vor dem Ladenlokal
direkt im Hero (aus dem echten Inseratsfoto, KI-Turntable in **4K**) und klarem
Conversion-Ziel: **Werkstatt-Terminanfrage**.

Hintergrund: Die bisherige Website ist wegen eines defekten SSL-Zertifikats faktisch
offline (Browser-Sicherheitswarnung). Dieser Auftritt ist ein kompletter Neuaufbau.

## Struktur

```
/
├── index.html            Startseite: 360°-Scroll-Animation als Hero (ganz oben), Leistungen, Termin-CTA
├── leistungen.html       Inspektion/Wartung · HU/AU · Reifen & Klima · Unfall · Diagnose
├── fahrzeuge.html        Fahrzeugangebote (Platzhalter) + echte Links zu mobile.de/AutoScout24
├── ueber-uns.html        Inhaber Arndt & Kaske, Werte, Standort
├── termin.html           Terminanfrage-Formular (validiert), Karte, Öffnungszeiten, FAQ
├── impressum.html        Platzhalter-Gerüst (rechtlich prüfen!)
├── datenschutz.html      Platzhalter-Gerüst (rechtlich prüfen!)
├── css/style.css         zentrales Design-System (Carbon/Silber/Logo-Blau)
├── js/script.js          Header, mobiles Menü, Scroll-Reveal, FAQ, Formular-Validierung
└── assets/
    ├── img/fotos/                 lokal gebündelte Fotos (echte Bestandsfahrzeuge
    │                              von mobile.de + Standort-Fotos + Stock-Motive)
    └── animation/                 60 WebP-Frames der Hero-Scroll-Animation, aus dem
                                   4K-Master extrahiert (2160px) + still.webp (Poster)
```

## Deployment

**Netlify (Drag & Drop):** https://app.netlify.com → „Add new site" → „Deploy manually"
→ diesen Ordner hineinziehen. **Vercel:** https://vercel.com/new → Ordner als statisches
Projekt („Other") deployen. Kein Build-Schritt nötig.

Wichtig: Beim Aufschalten auf die bestehende Domain unbedingt ein **gültiges
SSL-Zertifikat** einrichten (bei Netlify/Vercel automatisch via Let's Encrypt) –
der SSL-Defekt war der Hauptgrund für den Neuaufbau.

## Hero-Scroll-Animation (Startseite, ganz oben)

Der MINI Cooper C aus dem echten Bestand dreht sich beim Scrollen um ~360° vor dem
realen Ladenlokal – als großer Hero direkt am Seitenanfang (Frame-Sequenz im
Apple-Stil, Canvas-Scrubbing). Basis: Original-Inseratsfoto (mobile.de) →
16:9-Outpainting → KI-Turntable-Video (Higgsfield/Kling) → **4K-Upscale** →
60 WebP-Frames à 2160px. Fallbacks: Standbild bei `prefers-reduced-motion` und
ohne JavaScript; mobil wird nur jeder 2. Frame geladen.

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

- Logo: Nachbau des Original-Logos „AUTOHAUS BAD SCHWARTAU" (Barlow Condensed,
  Logo-Blau #205ca0) als scharfe HTML/CSS-Lockup – skaliert verlustfrei.
- Google Fonts: Barlow + Barlow Condensed (bei Bedarf DSGVO-konform lokal einbinden).
- Responsive (mobile-first), semantisches HTML5, Meta/OG je Seite, SVG-Favicon.
