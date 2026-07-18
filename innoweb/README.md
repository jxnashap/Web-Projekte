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
- **Animation:** langsam & weich (0.6–1.1s), sanfte gestaffelte Scroll-Reveals,
  dezente Hover – nichts Ruckartiges

## Signature-Elemente

1. **Hero-Wireframe:** ein SVG-Website-Layout zeichnet sich beim Laden selbst
   (stroke-dashoffset) und füllt sich anschließend dezent mit Flächen + Gold-Akzent.
2. **Vier Schichten** (Fundament → Gestalt → Bewegung → Schutz), die beim Scrollen
   nacheinander erscheinen.
3. **Sicherheit sichtbar:** sich zeichnendes Schild + „Verschlüsselungs"-Scramble
   (Buchstaben lösen sich zu „VERSCHLÜSSELT" auf) in der dunklen Sektion.

Alle Effekte mit Fallback: bei `prefers-reduced-motion` und ohne JavaScript werden
Inhalte statisch angezeigt.

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
└── assets/  (Favicon, Bilder)
```

## Deployment

Statischer Ordner – ohne Build-Schritt bei **Netlify** (Drag & Drop unter
app.netlify.com) oder **Vercel** (vercel.com/new, „Other") deploybar.

## To-dos

- **[PLATZHALTER]** Echtes InnoWeb-Logo einsetzen (aktuell Wortmarke „InnoWeb", „Web" in Gold)
- **[PLATZHALTER]** Echte Kontaktdaten (E-Mail/Telefon/Adresse) – aktuell `hallo@innoweb.de` als Platzhalter
- **[PLATZHALTER]** Impressum & Datenschutz befüllen und rechtlich prüfen
- Kontaktformular an Backend/Mail-Dienst anbinden (z. B. Netlify Forms)
- Referenzen-Galerie mit echten Projekten befüllen; [ECHTES FOTO EINSETZEN]-Marker ersetzen
- Google Fonts bei Bedarf DSGVO-konform lokal einbinden
