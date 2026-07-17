# Autohaus Bad Schwartau – Website-Relaunch

Moderner, mehrseitiger Webauftritt für die **Autohaus Bad Schwartau GmbH & Co. KG**
(Bosch Car Service) – mit einem sofort startenden Drehvideo des eigenen MINI Cooper C vor dem Ladenlokal
im Hero (KI-generiert aus dem echten Inseratsfoto) und klarem Conversion-Ziel:
**Werkstatt-Terminanfrage**.

Hintergrund: Die bisherige Website ist wegen eines defekten SSL-Zertifikats faktisch
offline (Browser-Sicherheitswarnung). Dieser Auftritt ist ein kompletter Neuaufbau.

## Struktur

```
/
├── index.html            Startseite mit Auto-Drehvideo im Hero, Scroll-Animation, Leistungen, Termin-CTA
├── leistungen.html       Inspektion/Wartung · HU/AU · Reifen & Klima · Unfall · Diagnose
├── fahrzeuge.html        Fahrzeugangebote (Platzhalter) + echte Links zu mobile.de/AutoScout24
├── ueber-uns.html        Inhaber Arndt & Kaske, Werte, Standort
├── termin.html           Terminanfrage-Formular (validiert), Karte, Öffnungszeiten, FAQ
├── impressum.html        Platzhalter-Gerüst (rechtlich prüfen!)
├── datenschutz.html      Platzhalter-Gerüst (rechtlich prüfen!)
├── css/style.css         zentrales Design-System (Carbon/Silber/Logo-Blau)
├── js/script.js          Header, mobiles Menü, Scroll-Reveal, FAQ, Formular-Validierung
└── assets/
    ├── video/auto-drehung.mp4     Hero-Drehvideo (autoplay, stumm, Loop, 752 KB)
    ├── img/fotos/                 lokal gebündelte Fotos (echte Bestandsfahrzeuge
    │                              von mobile.de + Standort-Fotos + Stock-Motive)
    └── animation/                 60 WebP-Frames der Scroll-Animation (360°-MINI
                                   vor dem Ladenlokal) + still.webp (auch Video-Poster)
```

## Deployment

**Netlify (Drag & Drop):** https://app.netlify.com → „Add new site" → „Deploy manually"
→ diesen Ordner hineinziehen. **Vercel:** https://vercel.com/new → Ordner als statisches
Projekt („Other") deployen. Kein Build-Schritt nötig.

Wichtig: Beim Aufschalten auf die bestehende Domain unbedingt ein **gültiges
SSL-Zertifikat** einrichten (bei Netlify/Vercel automatisch via Let's Encrypt) –
der SSL-Defekt war der Hauptgrund für den Neuaufbau.

## Scroll-Animation (Startseite)

Unter dem Hero dreht sich beim Scrollen ein MINI Cooper C aus dem echten Bestand
um ~360° vor dem realen Ladenlokal (Frame-Sequenz im Apple-Stil, Canvas-Scrubbing).
Basis: Original-Inseratsfoto (mobile.de) → 16:9-Outpainting → KI-Turntable-Video
(Higgsfield/Kling) → 60 komprimierte WebP-Frames. Fallbacks: Standbild bei
`prefers-reduced-motion` und ohne JavaScript; mobil wird nur jeder 2. Frame geladen.

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

- Hero-Video: H.264, 1280px, ohne Ton, `autoplay muted loop playsinline`,
  Poster-Standbild als Fallback; bei `prefers-reduced-motion` pausiert es automatisch.
- Google Fonts: Barlow + Barlow Condensed (bei Bedarf DSGVO-konform lokal einbinden).
- Responsive (mobile-first), semantisches HTML5, Meta/OG je Seite, SVG-Favicon.
