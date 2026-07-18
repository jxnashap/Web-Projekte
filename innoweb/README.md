# InnoWeb – Studio-Website („Quiet Luxury")

Die eigene, mehrseitige Website der Web-Agentur **InnoWeb** – digitale Baukunst aus
Norddeutschland. Kernbotschaft: **„Websites, über die man spricht."** Gestaltet im
Quiet-Luxury-Stil: Wirkung durch Weite, Ruhe und Präzision statt Effekte.

## Design-System

- **Farben:** warmes Off-White `#F6F3EE` (Basis) · Weiß (Karten) · Nachtblau-Schwarz
  `#111820`/`#1B2530` (Text & dunkle Sektionen) · Champagner-Gold `#B08D57`/`#C9A96A`
  (nur für feine Linien, Zahlen, aktive Zustände)
- **Typografie:** Cormorant Garamond (Serif-Display, wichtige Wörter kursiv in Gold) +
  Inter 300/400 (Fließtext); Labels/Menü in Großbuchstaben mit weiter Sperrung
- **Logo:** eigenes I/W-Monogramm – ein goldenes „I" mit Serifen, durch die geöffnete
  Spitze des „W" gefädelt (SVG, im Header/Footer eingebettet; Favicon passend)
- **Header (Fontenay-Stil):** Logo-Lockup (Monogramm + INNOWEB + Unterzeile) exakt
  mittig, Kreis-Burger mit „Menü"-Label links, Pill-CTA rechts; beim Scrollen wird
  die Bar schmaler, papierfarben und unten abgerundet; Menü = Fullscreen-Overlay
  (Nachtblau) mit nummerierten Serif-Links + Ostsee-Motiv
- **Animation:** langsam & weich (0.6–1.1s), sanfte gestaffelte Scroll-Reveals,
  dezente Hover – nichts Ruckartiges

## Signature-Elemente

1. **4K-Cinematic-Hero:** vollflächiges, nahtlos geloopte Hyperreal-Video
   (Ostsee-Buhnen im Morgennebel, Higgsfield-generiert + 4K-Upscale) hinter dem
   Hero – AV1-WebM (klein) mit H.264-MP4-Fallback, Poster-JPG als Sofortbild.
2. **Hero-Wireframe:** ein SVG-Website-Layout zeichnet sich beim Laden selbst
   (stroke-dashoffset) und füllt sich anschließend dezent mit Flächen + Gold-Akzent.
3. **Vier Schichten** (Fundament → Gestalt → Bewegung → Schutz), die beim Scrollen
   nacheinander erscheinen.
4. **Sicherheit sichtbar:** sich zeichnendes Schild + „Verschlüsselungs"-Scramble
   (Buchstaben lösen sich zu „VERSCHLÜSSELT" auf) in der dunklen Sektion.

## Eigener Cinematic-Hero + Animation pro Seite

Jede Hauptseite hat einen eigenen Hintergrund-Hero (Thema Web · Creative · Design,
Higgsfield-generiert) plus eine Signature-Animation:

| Seite | Hero (Hintergrund) | Signature-Animation |
|---|---|---|
| Start | 4K-Video: Ostsee-Buhnen im Morgennebel | selbstzeichnendes Wireframe |
| Leistungen | Video: Hand zeichnet Wireframe mit Füllfederhalter | Blueprint-Icons zeichnen sich |
| Arbeitsweise | Video: Blaupausen-Skizzen mit Lineal & Bleistift | wachsende Gold-Prozesslinie |
| Sicherheit | Video: Tresor-Mechanik aus Messing (dunkel) | Schild + „VERSCHLÜSSELT"-Scramble |
| Über uns | Bild + Ken-Burns: Hanseatisches Studio | Parallax + Ostsee-Welle |
| Referenzen | Bild + Ken-Burns: Galerie gerahmter Designs | Vorhang-Reveal-Galerie |
| Kontakt | Bild + Ken-Burns: Espresso am Ostsee-Fenster | selbstzeichnender Briefumschlag |
| Impressum/Datenschutz | ruhig, ohne Video | §-Siegel zeichnet sich |

Die Videos liegen als AV1-WebM + H.264-MP4 in 1080p („-2k") und 720p („-hd") vor,
jeweils nahtlos geloopt, mit Poster-JPG. Bei den drei Ken-Burns-Seiten kann später
per `video=True` im Generator ein Video nachgerüstet werden (Dateien ins
`assets/hero/`-Schema legen genügt).

Alle Effekte mit Fallback: bei `prefers-reduced-motion` und ohne JavaScript werden
Inhalte statisch angezeigt (Video bleibt aus, Poster-Bild erscheint).

## Struktur

```
/
├── index.html          Hero · Manifest · 4 Schichten · Sicherheit · Innovation · Prozess · Norden · Kontakt
├── leistungen.html     Websites · Relaunch · Shops · Pflege & Hosting
├── sicherheit.html     Die 6 Schutzschichten im Detail (dunkel, Schild + Scramble)
├── arbeitsweise.html   4 Schichten + 5-Schritte-Prozess ausführlich
├── ueber-uns.html      Studio & Norddeutschland
├── referenzen.html     [PLATZHALTER]-Galerie
├── kontakt.html        Anfrageformular + Kontakt
├── impressum.html · datenschutz.html   (Platzhalter-Gerüste)
├── css/style.css · js/script.js
└── assets/
    ├── favicon.svg · img/  (Higgsfield-Hyperrealbilder)
    └── hero/  innoweb-hero-4k.webm|mp4 · innoweb-hero-hd.webm|mp4 · hero-poster.jpg
```

## Deployment

Statischer Ordner – ohne Build-Schritt bei **Netlify** (Drag & Drop unter
app.netlify.com) oder **Vercel** (vercel.com/new, „Other") deploybar.

## To-dos

- Logo: I/W-Monogramm ist gesetzt – bei Bedarf durch eine finale Reinzeichnung ersetzen
- **[PLATZHALTER]** Echte Kontaktdaten (E-Mail/Telefon/Adresse) – aktuell `hallo@innoweb.de` als Platzhalter
- **[PLATZHALTER]** Impressum & Datenschutz befüllen und rechtlich prüfen
- Kontaktformular an Backend/Mail-Dienst anbinden (z. B. Netlify Forms)
- Referenzen-Galerie mit echten Projekten befüllen; [ECHTES FOTO EINSETZEN]-Marker ersetzen
- Google Fonts bei Bedarf DSGVO-konform lokal einbinden
