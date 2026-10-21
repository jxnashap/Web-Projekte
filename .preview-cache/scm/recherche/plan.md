# SCM Creatives: Website-Plan (Phase 2 Konzept, Entwurf zur gemeinsamen Durchsicht)

Grundlage: briefing.md, instagram.md, konkurrenz.md, konkurrenz-visuell.md, ux-kundenmanagement.md, seo-search-console.md, protokoll-memory-vault.md

## 1. Positionierung
- **Kernversprechen:** Echte Videos mit echten Menschen, nach Skript gedreht. 100 % ohne KI.
- **Region:** Kiel und Lübecker Bucht. „Wir kommen zu euch in den Laden.“
- **Einstieg ohne Risiko:** 3 kostenlose Testvideos, danach entscheidet ihr. Das ist der Haupt-CTA überall: **„3 Testvideos anfragen“**.
  Stärker als FUTRIZE (Lübeck, bezahlter Testmonat).
- **Beweise:** Kunden aus Kiel und Umgebung mit Videos, Skript-Aufbau in 5 Schritten, Ablauf mit „euer Aufwand“.
- **Abgrenzung:** Die Konkurrenz sieht gleich aus (schwarz + rot/orange). SCM unterscheidet sich durch die Drehbuch-Signatur, den erklärten Skript-Aufbau, die kostenlosen Testvideos und „100 % ohne KI“.

Hero-Headline, drei Vorschläge (ohne Gedankenstriche):
1. „Kein Zufall. Ein Skript.“ / Sub: „Echte Videos für Betriebe in Kiel und an der Lübecker Bucht. Geschrieben, gedreht und geschnitten von uns. Ohne KI.“
2. „Echte Menschen. Echte Videos. Ein Plan dahinter.“
3. „Videos, die nach euch klingen.“

## 2. Seitenstruktur (Sitemap)
| URL | Seite | Zweck |
|---|---|---|
| `/` | Start | Überblick, Beweise, Haupt-CTA |
| `/so-arbeiten-wir` | Ablauf | 6 Schritte mit „euer Aufwand“, Skript-Aufbau ausführlich |
| `/leistungen` | Leistungen | Kurzvideos, Posting & Community, Werbeanzeigen, Recruiting-Videos, Fotos & Imagefilm |
| `/branchen` | Branchen | „Jede Branche, in der Menschen arbeiten“, Beispiele + Formate |
| `/branchen/gastronomie` `/immobilien` `/handwerk` `/unternehmen` | 4 Branchenseiten | Formate, passende Referenzen, FAQ, vorausgefülltes Quiz |
| `/referenzen` | Referenzen | Reel-Wand, Filter nach Branche |
| `/referenzen/<kunde>` | 6 Kundenseiten | Video oben, Ausgangslage, Format, Ergebnis (nur belegte Zahlen); eigene Seite pro Video für die Google-Videosuche |
| `/pakete` | Pakete | 4 / 8 / 12 Videos ohne Preise, Zusatzleistungen, Einstieg mit 3 Testvideos |
| `/testvideos` | 3 Testvideos | Landingpage für das Angebot (auch als Link in der Instagram-Bio) |
| `/vision` | Vision | Haltung: warum echt, warum Skript, warum ohne KI |
| `/ueber-uns` | Über uns | Team (Platzhalter), Region, Arbeitsweise |
| `/faq` | FAQ | Echte Einwände: Zeit, Kamera-Scheu, Kosten, Region, Ergebnisse, Rechte |
| `/kontakt` | Kontakt | WhatsApp, Telefon, E-Mail, Einzugsgebiet |
| `/anfrage` | Quiz | 5 Schritte, danach `/danke` (noindex) |
| `/impressum` `/datenschutz` | Rechtliches | mit Platzhaltern |
| 404 | Fehlerseite | „Diese Szene wurde rausgeschnitten.“ |

Kundenseiten: bs-immobiliengruppe, maler-rohwer, jan-hein-klaas-pit, das-kleine-steakhouse, kletterwald-travemuende, die-drei (Weinbar, Material folgt).

## 3. Startseite (Wireframe, als Drehbuch erzählt)
1. **Kopfzeile:** Logo, Navigation, Button „3 Testvideos anfragen“
2. **SZENE 01 Hero:** Headline + Sub + 2 Buttons; rechts 3 Handy-Rahmen mit echten Reels (Maler, Jan & Hein, Steakhouse), stumm, REC-Punkt, laufender Timecode. Vertrauenszeile: „100 % echt gedreht · Kiel & Lübecker Bucht · Wir kommen zu euch“
3. **Kunden-Band:** Namen der Kunden als Laufband
4. **SZENE 02 Das Problem:** „Viele posten. Wenige werden gesehen.“
5. **SZENE 03 Das Skript:** Beispiel-Skript als Drehbuchseite (Courier-Schrift): Hook, Wiedererkennen, Steigerung, Pointe, Aufruf. Beim Scrollen läuft eine Zeitleiste 0:00 bis 0:30 mit
6. **SZENE 04 Branchen:** 4 Karten + „und jede andere Branche“
7. **SZENE 05 Referenzen:** Reel-Wand mit Kunde, Branche, Format
8. **SZENE 06 Ablauf:** 6 Schritte mit „euer Aufwand“
9. **SZENE 07 3 Testvideos kostenlos:** So läuft es: Gespräch, 3 Testvideos, ihr entscheidet, Paket
10. **Pakete-Vorschau:** 4 / 8 / 12
11. **100 % ohne KI:** Haltung in 3 Sätzen, Link zu Vision
12. **FAQ:** 6 Fragen
13. **ABSPANN (Footer):** wie Film-Credits: Kontakt, Einzugsgebiet, Rechtliches
Mobil: untere Leiste mit „Anfrage“, „WhatsApp“, „Anrufen“, erscheint nach dem Hero.

## 4. Design
- **Farben:** Schwarz `#0B0B0C`, Graphit `#161618`, Linien `#2A2A2D`, Papierweiß `#F5F3EF`, Grau `#A6A6AB`,
  Rot für Text/Akzente `#F0382E` (Kontrast 4,97 auf Schwarz), Rot für Buttons `#E1251B` mit weißer Schrift (4,69), Drehbuchpapier `#F2EFE8` mit schwarzer Schrift (16,4)
- **Schriften (lokal, WOFF2):** Archivo (variabel, schmal und fett für Headlines, normal für Text), Courier Prime (Drehbuch-Schrift für Skripte, Timecodes, Szenen-Labels)
- **Drehbuch-Signatur:** Szenen-Labels „SZENE 01“, Szenenköpfe „INNEN. STEAKHOUSE KIEL. ABEND.“, Sucher-Ecken um Videos, REC-Punkt, Timecode, der mit dem Scrollen läuft, Filmklappe als Seiten-Intro, Drehbuchseiten als helle Karten, Abspann-Footer
- **Bewegung (premium-estate v2):** Zeichen-Reveals, Scroll-Scrub, Lerp-Nachlauf, Schreibmaschinen-Effekt für Skriptzeilen, Sucher „stellt scharf“ (Unschärfe zu scharf). Alles mit `prefers-reduced-motion`-Fallback
- **Mobile First**, Tap-Flächen 48 px, Daumenzone

## 5. Technik
- Statisches HTML aus Python-Generator (`baukaesten/premium-estate/generatoren/build_scm.py`), Baukasten um ein wiederverwendbares Modul „drehbuch“ erweitert
- Videos selbst gehostet: H.264 MP4 + AV1 WebM, Poster als AVIF/JPG, Lazy Loading, festes 9:16-Format (kein Layout-Springen)
- **Quiz `/anfrage`:** Branche, Ziel, Paket-Interesse (4/8/12/unsicher), Start, Kontakt. Branchenseiten springen mit vorausgewählter Branche hinein
- **Versand nur per E-Mail:** Vercel Function `/api/anfrage` (Region Frankfurt) schickt die Anfrage per SMTP an das SCM-Postfach; Zugangsdaten als Umgebungsvariablen im SCM-Vercel-Konto. Spam-Schutz: Honeypot + Zeitsperre. Fällt der Versand aus, zeigt die Seite WhatsApp und Telefon
- **Datenschutz:** keine Cookies, kein Banner, keine Instagram- oder YouTube-Einbettung, Schriften und Videos lokal. Statistik optional mit Vercel Web Analytics (cookielos)
- **SEO / Search Console:** eigene Title und Description pro Seite, Canonical, sitemap.xml mit Video-Einträgen, robots.txt, strukturierte Daten (Organization mit Einzugsgebiet Kiel und Lübecker Bucht, WebSite, Service pro Branche, Breadcrumbs, VideoObject auf Kundenseiten). Domain-Bestätigung in der Search Console per DNS-Eintrag, sobald die Domain registriert ist. Keine Städte-Spamseiten
- **vercel.json:** saubere URLs, Weiterleitungen (www und andere Schreibweisen auf scm-creatives.de), Sicherheits-Header (CSP, HSTS), Caching
- Ziele: LCP unter 2,5 s, CLS unter 0,1, Lighthouse über 95

## 6. Higgsfield (max. 50 Credits, nur Platzhalter)
8 Standbilder mit Nano Banana (je 2 Credits = 16): Drehtag im Restaurant, Handwerker auf der Baustelle mit Handy-Rig, Makler-Duo in einer Wohnung, Team im Büro, Weinbar am Abend, Drehbuchseite mit Handy-Rig auf dem Tisch, Monitor mit Hochformat-Aufnahme an der Kieler Förde, Crew an der Lübecker Bucht.
2 Videoloops mit Kling Turbo 720p (je 7,5 Credits = 15) für die Ablauf- und Vision-Seite. Rest (ca. 19) als Puffer.
Der Hero zeigt **echte** Reels. Alle KI-Dateien heißen `ki-platzhalter-*` und stehen in `PLATZHALTER.md`.
**Vor dem Livegang müssen alle ersetzt sein**, sonst wäre „100 % ohne KI“ irreführende Werbung.

## 7. Ablauf nach Freigabe
1. Design-Prototyp der Startseite (Desktop + Handy) zur Freigabe
2. Alle Seiten bauen, Texte nach Schreibregeln (keine Gedankenstriche, nur belegte Fakten, Rest `[PLATZHALTER]`)
3. QA: Screenshot-Tools, Reveal-Zählung n/n, Lighthouse, Formular-Test, Links
4. Vorschau auf Vercel, ZIP nach `auslieferung/`, PR
5. Launch-Checkliste für SCM: Domain registrieren, Vercel-Pro-Konto, SMTP-Zugang, Impressum, Kontaktdaten, Logo, Originalvideos, KI-Platzhalter ersetzen, Search Console

## 8. Entscheidungen für die Durchsicht
1. Hero-Headline (Vorschlag 1, 2 oder 3)
2. Ansprache: du / ihr (wie auf Instagram) oder Sie
3. **Konflikt:** Zwei BS-Videos tragen „Teile dieses Videos sind KI generiert“ (Ortsanalyse und Entweder-oder). Bei „100 % ohne KI“ dürfen sie nicht auf die Website. Vorschlag: BS bleibt Referenz, aber mit anderen BS-Videos ohne KI
4. Vorschau: vorerst in deinem Vercel-Team, Übertragung an das SCM-Konto zum Livegang
