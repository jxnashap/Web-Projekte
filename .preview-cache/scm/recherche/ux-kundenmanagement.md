# SCM Creatives – Recherche: Conversion-UX, Lead- & Kundenmanagement, DSGVO/Recht

**Stand:** 21.10.2026 · **Kontext:** Statische Website (HTML/CSS/JS, kein CMS) auf Vercel · Zielgruppen: Gastronomie, Immobilien/Makler, Handwerk, Unternehmen (überwiegend B2B) · Leistung: skriptbasierte Kurzvideos (Reels/TikTok/Shorts)

> **Hinweis zur Quellenlage:** Recherchiert per Websuche (Oktober 2026). Viele Preisangaben stammen aus Vergleichs-/Affiliate-Seiten mit Stand 2026 und wurden, wo möglich, mit mehreren Quellen abgeglichen. **Vor dem Kauf auf den offiziellen Preisseiten prüfen.** Conversion-Zahlen von Tool-Anbietern sind Herstellerangaben und nur als Richtwert zu verstehen. Die rechtlichen Ausführungen sind eine fundierte Einordnung, aber **keine Rechtsberatung**. Impressum, Datenschutzerklärung und Einwilligungsvorlagen sollten über einen Generator mit Haftungsübernahme (z. B. IT-Recht Kanzlei, eRecht24, Händlerbund) oder anwaltlich erstellt werden.

---

## 0. Executive Summary

**Empfohlener Stack (Kern):**

| Baustein | Empfehlung | Kosten/Monat |
|---|---|---|
| Hosting | **Vercel Pro** (Hobby ist für kommerzielle Websites nicht erlaubt), Functions-Region `fra1` | 20 $ (≈ 17–19 € netto) pro Seat |
| Formular | **Eigener Multi-Step-Funnel** (Vanilla JS) → **Vercel Function** `/api/anfrage` | 0 € (im Pro-Kontingent) |
| Spam-Schutz | **Honeypot + Zeitfalle + ALTCHA** (Open Source, self-hosted, ohne Drittanbieter) | 0 € |
| CRM | **Brevo** (Sales-CRM mit Pipelines/Deals/Aufgaben, EU-Server, AVV) | 0 € (Free) → ca. 7–9 € (Starter), falls Newsletter |
| Termin | **Brevo Meetings** (kostenlos, im CRM), als **Link** statt iFrame · Alternative: **zeeg** (deutsche Server) | 0 € (zeeg Professional ≈ 10 €/Nutzer) |
| Mail (transaktional) | **Brevo API** (Bestätigung an Lead, Benachrichtigung ans Team) | 0 € (bis 300 Mails/Tag) |
| Analytics | **Vercel Web Analytics** (cookielos) · Alternative: **Plausible** (EU) | ≈ 0–1 $ (aus Pro-Guthaben) · Plausible ≈ 9 € |
| **Summe Kern** | | **≈ 20–30 €/Monat** |

Optionale Ergänzungen für den Kunden-Lifecycle: Frame.io Pro (15 $/Nutzer), Notion Plus (≈ 10–12 $/Nutzer), Lexware Office oder sevdesk (≈ 10–25 €), Yousign One (≈ 9 €), ProvenExpert Basic (29,99 € bei Jahreszahlung, nicht zwingend). Komplett-Setup für 2 Personen: **≈ 90–130 €/Monat**.

**Formular-/Funnel-Strategie:** Ein **4–5-stufiger Quiz-Funnel** (Branche → Ziel → Umfang/Budget → Start → Kontakt) als Haupt-CTA, auf Branchenseiten mit vorausgewählter Branche. **Danach sofort Terminlink** auf der Danke-Seite (bei qualifizierten Leads), plus **WhatsApp-Click-to-Chat** und **Anrufen** als niedrigschwellige Nebenkanäle in einer mobilen Sticky-Leiste. Kein Calendly-iFrame, kein Typeform.

**Recht in einem Satz:** Mit selbst gehosteten Videos und Schriften, ohne Social-Embeds und mit cookieloser Analyse ist **kein Cookie-Banner nötig**. Das Formular braucht **keine Pflicht-Checkbox** (Art. 6 Abs. 1 lit. b DSGVO), wohl aber Datenschutzhinweis und AV-Verträge. Das **BFSG greift für SCM Creatives sehr wahrscheinlich nicht** (B2B und Kleinstunternehmen). Barrierearme Gestaltung lohnt sich trotzdem.

---

# TEIL A – Conversion-UX für die Agentur-Website

## A1. Was bei kleinen Dienstleistern nachweislich konvertiert

### Vorbemerkung zur Evidenz
Unabhängige, kontrollierte Studien speziell für kleine deutsche Dienstleister gibt es kaum. Belastbar sind vor allem diese Quellen:
- **Unbounce Conversion Benchmark Report 2024** (57 Mio. Conversions): Median-Conversion-Rate über alle Branchen **6,6 %**. Bei Professional Services konvertiert Desktop mit 11,6 %, Mobile mit 8,3 %, aber **rund 81 % der Landingpage-Besuche kommen mobil**. Texte auf einfachem Sprachniveau (5.–7. Klasse) erreichen im Median **11,1 %**, schwierigere Texte 7,1 %. ([Unbounce Benchmark](https://unbounce.com/conversion-benchmark-report/?trk=s-bl), [Professional Services](https://unbounce.com/conversion-benchmark-report/professional-services-conversion-rate/), [Newswire-Zusammenfassung](https://www.newswire.ca/news-releases/unbounce-s-2024-conversion-benchmark-report-proves-that-attention-spans-are-declining-and-so-are-conversion-rates-831617439.html))
- **NN/g „Scrolling and Attention“** (Eyetracking, 2018): **57 %** der Betrachtungszeit entfallen auf den Bereich oberhalb des Folds, **74 %** auf die ersten zwei Bildschirmhöhen. ([NN/g](https://www.nngroup.com/articles/scrolling-and-attention/))
- **BrightLocal Local Consumer Review Survey 2026** (US-Stichprobe): 97 % nutzen Bewertungen bei Kaufentscheidungen, **74 % achten auf Bewertungen der letzten 3 Monate**, 31 % nutzen nur Betriebe ab 4,5 Sternen. Video-Plattformen gewinnen als Bewertungsquelle an Bedeutung. ([BrightLocal](https://www.brightlocal.com/learn/local-consumer-Review-survey), [PinMeTo-Zusammenfassung](https://www.pinmeto.com/news/brightlocal-local-consumer-review-survey-2026/))
- **Wyzowl State of Video Marketing 2026:** 91 % der Unternehmen nutzen Video. Laut Sekundärquellen sagen 85 % der Konsumenten, ein Video habe sie zum Kauf bewegt. ([Wyzowl](https://www.wyzowl.com/sovm-results-2016), [SocialPilot-Zusammenfassung](https://www.socialpilot.co/blog/video-marketing-statistic))

### Hero-Aufbau (mobil zuerst gedacht)
1. **Headline mit Ergebnis statt Leistung:** max. ca. 8 Wörter, z. B. „Kurzvideos, die Gäste, Käufer & Azubis bringen“. Einfache Sprache lohnt sich nachweislich (siehe Unbounce oben).
2. **Subline (≤ 20 Wörter):** Was, für wen, wo. Beispiel: „Skript, Dreh & Schnitt aus einer Hand – für Gastro, Makler & Handwerk in [Region].“
3. **Primär-CTA** („Kostenloses Erstgespräch anfragen“) und **Sekundär-CTA** („Beispiele ansehen“, springt zur Reels-Galerie). Auf einem 375 × 667-Viewport müssen beide **ohne Scrollen sichtbar** sein.
4. **Hochformat-Showreel (9:16)** im Smartphone-Rahmen: stumm, als Loop, 6–10 Sekunden, mit Poster-Bild als LCP-Element und „Ton an“-Button. Auf Mobile läuft es *neben bzw. unter* der Headline, nicht als bildschirmfüllender Hintergrund.
5. **Trust-Zeile direkt unter dem CTA:** „★ 4,9 bei Google (37 Bewertungen) · 40+ Betriebe aus der Region · 300+ Videos produziert“. **Nur echte, belegbare Zahlen verwenden** (Irreführungsverbot, § 5 UWG).

### Video-first-Beweise
- **Reels-Galerie nach Branche filterbar** (Gastro | Immobilien | Handwerk | Unternehmen). Unter jedem Video steht ein Ergebnis-Label wie „87.000 Aufrufe · 14 Bewerbungen in 3 Wochen“. Zahlen nur mit Freigabe des Kunden zeigen.
- **2–3 Mini-Cases** nach dem Schema „Ausgangslage → Skript-Idee → Ergebnis“, jeweils mit eingebettetem Reel.
- **Video-Testimonials** (der Kunde spricht selbst, 20–40 s, mit Untertiteln). Für eine Video-Agentur ist das der stärkste Beweis, weil Format und Qualität gleichzeitig demonstriert werden.
- **Behind-the-Scenes-Reel** vom Drehtag: nimmt die Angst vor „Ich vor der Kamera?“.

### Social Proof: Platzierung & Format
- **Direkt am CTA:** Sternebewertung und 1 Kurz-Zitat unter jedem Haupt-CTA (Hero, Mitte, Seitenende) und im letzten Funnel-Schritt („Über 40 Betriebe vertrauen uns“).
- **Format-Hierarchie:** Video-Testimonial > Case mit Zahlen > Text-Zitat mit Foto, Name, Firma > Logo-Leiste > reine Sternanzeige.
- **Aktualität sichtbar machen** (Datum an Bewertungen), weil 74 % auf Bewertungen der letzten 3 Monate achten (BrightLocal).
- **Rechtlich:** Bewertungen nur mit Echtheitshinweis nach § 5b Abs. 3 UWG zeigen (siehe Teil B6/C).

### Sticky-CTA auf Mobile
- In A/B-Tests (überwiegend E-Commerce, Agenturberichte) liegen die Uplifts für mobile Sticky-CTAs zwischen **+6 % und +69 %**. Eine untere Platzierung schnitt dabei besser ab als eine obere (+7 % im Test von Little Bible Stories). ([Blend Commerce Tests](https://blendcommerce.com/blogs/ab-tests-shopify/better-placed-sticky-add-to-cart-product-page-conversion), [CleanCommit](https://cleancommit.io/ab-tests/sticky-mobile-add-to-cart-button/), [Convertica](https://convertica.org/ecommerce-case-study-sticky-cta/))
- **Empfehlung:** Eine **untere Leiste** mit drei Aktionen: **[Anfrage starten]** (primär, breit) · **[WhatsApp]** · **[Anrufen]** (Icons mit Label). Sie erscheint erst, wenn der Hero-CTA aus dem Bild gescrollt ist, und verschwindet, sobald der Funnel sichtbar ist oder die Tastatur offen ist. `padding-bottom: env(safe-area-inset-bottom)` beachten.
- Auf dem Desktop reicht ein CTA-Button im Sticky-Header.

### Seitenlänge
- Videoproduktion ist eine **erklärungsbedürftige Leistung mit hohem Ticket** (monatliche Retainer). Für solche Angebote sprechen die verfügbaren Tests für **längere, gut gegliederte Seiten, die Einwände beantworten**. Kürzere Seiten gewinnen bei niedrigschwelligen Zielen. ([Unbounce](https://unbounce.com/?p=20484), [Convert](https://blog.convert.com/ab-testing-the-long-page-version-and-the-short-page-version.html), [VWO](https://vwo.com/blog/short-landing-pages/))
- Wegen des Aufmerksamkeitsabfalls nach dem Fold (NN/g) gilt: **Das Wichtigste gehört in die ersten zwei Bildschirmhöhen**, und **CTAs wiederholen sich etwa alle 2 Bildschirmhöhen**.
- **Empfohlene Reihenfolge der Startseite:** Hero → Trust-Leiste → Branchen-Kacheln (4) → Reels-Galerie → 2 Cases mit Zahlen → „So arbeiten wir“ (5 Schritte) → Pakete mit „ab“-Preisen → Video-Testimonials → Team (Gesichter!) → FAQ (Einwände: Preis, Aufwand, „Ich bin nicht kamerafreundlich“, Rechte, Vertragslaufzeit) → Abschluss-CTA mit eingebettetem Funnel-Start.

### Branchen-Landingpages
- **Eigene Seiten:** `/gastronomie`, `/immobilien`, `/handwerk`, `/unternehmen`. Jede Seite bekommt eine eigene Headline, branchenspezifische Probleme (z. B. Handwerk: Fachkräfte/Azubis; Makler: Objektvermarktung & Eigentümer-Akquise; Gastro: Tische füllen, Events), **nur Reels aus der Branche**, Branchen-FAQ und einen Branchen-Case.
- **Message-Match** für Ads und Local SEO („Social-Media-Videos für Handwerker in [Stadt]“).
- **Funnel vorausfüllen:** `/anfrage?branche=handwerk` überspringt Schritt 1. Ein Schritt weniger bedeutet weniger Abbrüche.

## A2. Mobile-first: konkrete Layout-Folgen

**Datenlage:** Laut StatCounter liegt Deutschland je nach Monat 2026 etwa bei **50:50 Desktop zu Mobile** (Seitenaufrufe insgesamt, Werte schwanken stark). ([StatCounter DE](https://gs.statcounter.com/platform-market-share/desktop-mobile/germany)) Für die Zielgruppen ist der Mobile-Anteil deutlich höher: Inhaber und Makler sind unterwegs, Traffic kommt aus Instagram/TikTok-Profilen und Ads. Bei Professional-Services-Landingpages kamen **≈ 81 % der Besuche mobil** (Unbounce). **Design-Annahme: 75–85 % Mobile.**

**Daumenzone:** 49 % der Nutzer bedienen das Smartphone einhändig, 36 % „cradled“, 10 % mit zwei Daumen (Steven Hoober). Am leichtesten erreichbar ist das untere Drittel in der Mitte, am schwersten sind die oberen Ecken. ([Smashing Magazine](https://smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users), [Addy Osmani](https://addyosmani.com/blog/touch-friendly-design/))

**Konkrete Regeln:**
| Thema | Regel |
|---|---|
| Primäraktionen | Unten (Sticky-Bar), Funnel-Buttons „Weiter“ unten und vollbreit |
| Tap-Ziele | ≥ 48 × 48 px, ≥ 8 px Abstand. Antwortoptionen im Funnel als große Karten statt Radio-Buttons |
| Navigation | Burger-Menü oben ist ok (selten genutzt); CTA nie nur im Menü |
| Formularfelder | `font-size ≥ 16px` (verhindert iOS-Zoom), korrekte `type`/`inputmode`/`autocomplete` (`tel`, `email`, `name`, `organization`, `postal-code`) |
| Video | Hochformat 9:16 nativ, keine Querformat-Letterbox. Galerie als horizontaler Swipe-Slider mit Scroll-Snap (2–2,5 Karten sichtbar = Swipe-Affordance) |
| Ladezeit | Core Web Vitals (75. Perzentil): **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1** ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)). Die bekannte Google-Studie: **53 % der mobilen Besuche brechen ab, wenn das Laden > 3 s dauert** (Daten von 2016, aber Richtung weiter gültig) ([Think with Google](https://thinkwithgoogle.com/intl/en-gb/marketing-strategies/app-and-mobile/mobile-page-speed-new-industry-benchmarks)) |
| Performance-Budget | Above-the-fold < 200 KB (ohne Video), JS gesamt < 50 KB gzip, Fonts self-hosted WOFF2 mit Subset und `font-display: swap`, Hero-Poster als AVIF/WebP mit `fetchpriority="high"` |
| Telefon | Nummer als `tel:`-Link. Gastronomen und Handwerker rufen oft lieber an |

## A3. Formular-Strategie

### Optionen im Vergleich

| Option | Stärken | Schwächen | Daten/Evidenz |
|---|---|---|---|
| **Einfaches Kontaktformular** (Name, E-Mail, Nachricht) | Schnell, vertraut | Kaum Qualifizierung, „Was kostet das?“-Anfragen, leeres Blatt | Kurze Formulare konvertieren bei *wenig* Feldern gut. Der Vorteil von Multi-Step schrumpft bei sehr kurzen Formularen ([Reform](https://reform.app/blog/single-page-vs-multi-step-forms-which-converts-better)) |
| **Multi-Step-Funnel (Quiz)** | Niedrige Einstiegshürde (1. Frage = 1 Tipp), Qualifizierung, Commitment-Effekt, Lead-Scoring möglich | Etwas mehr Bauaufwand, Abbruch in späten Schritten möglich | Häufig zitiert: ø 13,9 % (Multi-Step) vs. 4,5 % (Single-Step), Formstack/HubSpot-Daten. Das sind **Herstellerdurchschnitte, keine kontrollierten Studien** ([Leadgen Economy](https://www.leadgen-economy.com/blog/multi-step-forms-conversion-optimization/), [Bird Marketing](https://bird.marketing/blog/digital-marketing/guide/conversion-rate-optimization/multi-step-vs-single-step-forms-conversions/)) |
| **Direkte Terminbuchung** (Kalender) | Höchste Verbindlichkeit, spart E-Mail-Pingpong | Hohe Hürde für „kalte“ Besucher. Kalender-Embeds von US-Anbietern brauchen Consent | Chili Piper (≈ 4 Mio. Formulareinsendungen): Formular → gebuchter Termin **30–40 % bei manueller Nachfassung vs. 66,7 % bei sofortiger Terminauswahl** nach dem Formular (Herstellerdaten) ([Chili Piper](https://help.chilipiper.com/hc/en-us/articles/39011890386835)) |
| **WhatsApp Click-to-Chat** (`wa.me`-Link) | Extrem niedrigschwellig, Zielgruppe nutzt WhatsApp ohnehin | Unstrukturiert, keine Qualifizierung, kein automatischer CRM-Eintrag, Datenschutz-Fragen beim Business-App-Einsatz | Keine belastbaren Studien zu Website-Buttons. Kursierende Zahlen stammen von Anbietern und beziehen sich auf Kampagnen ([Übersicht Chatmaxima](https://chatmaxima.com/blog/whatsapp-business-statistics-2026/)) |
| **Rückruf-Bitte** | Passt zu Handwerk/Gastro (wenig Zeit, telefonaffin) | Erreichbarkeit, Telefon-Pingpong | Speed-to-Lead: Kontakt **innerhalb von 5 Min.** erhöht die Qualifizierungschance laut MIT/InsideSales-Studie um das **21-Fache** ggü. 30 Min. (Datensatz 2007) ([Close](https://close.com/blog/test), [Guideflow](https://www.guideflow.com/blog/speed-to-lead)) |

### Empfehlung für SCM Creatives: „Funnel + Sofort-Termin + 2 Nebenkanäle“

**1. Hauptweg: Quiz-Funnel auf `/anfrage`** (zusätzlich als Inline-Block am Seitenende jeder Seite). Eine Frage pro Screen, Fortschrittsbalken, Zurück-Button, große Antwortkarten mit Icons:

| Schritt | Frage | Antworten |
|---|---|---|
| 1 | In welcher Branche sind Sie? | Gastronomie · Immobilien/Makler · Handwerk · Unternehmen/Sonstiges |
| 2 | Was soll Video für Sie erreichen? (Mehrfachauswahl) | Mehr Gäste/Kunden · Mitarbeiter & Azubis finden · Objekte/Leistungen präsentieren · Marke/Bekanntheit · Weiß ich noch nicht |
| 3 | Wie viel Content stellen Sie sich vor? | Einmaliges Projekt (z. B. 3–5 Videos) · Laufend 4 Videos/Monat · Laufend 8+ Videos/Monat · Beratung gewünscht |
| 4 | Welches Monatsbudget ist realistisch? | < 500 € · 500–1.000 € · 1.000–2.500 € · > 2.500 € · Noch offen |
| 5 | Wann möchten Sie starten? (+ PLZ) | So schnell wie möglich · In 1–3 Monaten · Später/unklar |
| 6 | Kontakt | Vorname/Name*, Firma*, E-Mail*, Telefon (optional, mit Hinweis „für schnelle Rückfragen“), bevorzugter Kontaktweg (Anruf/WhatsApp/E-Mail), Freitext (optional) |

- Budget erst in Schritt 4, wenn schon Commitment da ist. Immer mit „Noch offen“-Option, damit niemand abbricht.
- Kontaktdaten **zuletzt** abfragen. Pflichtfelder minimal halten.
- Unter dem Absende-Button steht ein **Datenschutzhinweis** mit Link, **keine Pflicht-Checkbox** (siehe C1).

**2. Danke-Seite = Termin-Seite:** Bei Score A/B gibt es die Überschrift „Passt! Wählen Sie direkt einen Termin für Ihr 20-Min-Erstgespräch“ mit Button zum Buchungslink (Brevo Meetings/zeeg, **neuer Tab statt iFrame**). Score C bekommt die Rückmeldung „Wir melden uns innerhalb von 24 h“ plus Link zu 3 passenden Branchen-Reels. Das nutzt den in den Chili-Piper-Daten sichtbaren Effekt der sofortigen Terminwahl, ohne kalte Besucher mit einem Kalender abzuschrecken.

**3. Nebenkanäle in der Sticky-Bar:** **WhatsApp** (`https://wa.me/49…?text=Hallo%20SCM%2C%20ich%20interessiere%20mich%20für…`, ein reiner Link ohne Widget-Skript) und **Anrufen** (`tel:`). Auf der Kontaktseite zusätzlich eine kurze **Rückruf-Variante** (Name, Telefon, Wunschzeitfenster).

**Messen:** Funnel-Schritte als Custom Events tracken (Vercel Web Analytics / Plausible), also Abbruch je Schritt, Anteil WhatsApp/Anruf/Formular und Terminbuchungsquote. Nach ca. 100 Leads Schritt 3/4 per A/B-Test optimieren.

## A4. Video auf der Website: performant & UX-gerecht

**Grundmuster (nach [web.dev „Lazy loading video“](https://web.dev/articles/lazy-loading-video)):**
```html
<!-- Galerie-Karte: lädt nichts, bis sie in den Viewport kommt -->
<video class="reel" muted loop playsinline preload="none"
       poster="/media/reels/gastro-01.avif" width="720" height="1280"
       aria-label="Reel: Pizzeria Beispiel – Mittagstisch-Aktion">
  <source data-src="/media/reels/gastro-01-720.mp4" type="video/mp4">
</video>
<button class="sound-toggle" aria-pressed="false">Ton an</button>
```
- `muted` + `playsinline` sind Pflicht für Autoplay auf iOS. Autoplay mit Ton blockieren Browser ohnehin, und unerwarteter Ton erzeugt negative Erstreaktionen ([a11y project](https://www.a11yproject.com/posts/never-use-auto-play/), [Video.js](https://videojs.org/blog/2)).
- **IntersectionObserver:** `src` erst setzen, wenn die Karte nahe dem Viewport ist. Abspielen bei ≥ 60 % Sichtbarkeit, **pausieren außerhalb**. **Immer nur ein Video spielt gleichzeitig.**
- **`prefers-reduced-motion: reduce`:** kein Autoplay, nur Poster mit Play-Button.
- **Poster-Bilder:** 9:16, AVIF/WebP, ca. 20–40 KB. Width/Height setzen (verhindert CLS). Das Hero-Poster ist das LCP-Element und wird per `<link rel="preload">` geladen.
- **Encoding:** Galerie in 720 × 1280, H.264-MP4, ca. 1,5–2,5 Mbit/s, ohne Tonspur für Vorschau-Loops (spart ~10 %). Lightbox in 1080 × 1920. Vorschau-Loops auf 6–10 s kürzen, die volle Version erst in der Lightbox laden.
- **Lightbox:** Auf Mobile Vollbild mit vertikalem Swipe zum nächsten Reel (TikTok-Muster, gelernt). Ton an, sichtbare Controls, Schließen mit Esc und großem X, Fokus-Falle, Fokus kehrt nach dem Schließen zurück.
- **Ton-an-Button:** Eindeutig beschriftet, `aria-pressed`. Ton ist immer eine Nutzeraktion.
- **Hosting:** Für ≤ ~30 Reels **selbst hosten auf Vercel** (Pro enthält 1 TB Fast Data Transfer/Monat ([Vercel Pro Docs](https://docs.vercel.com/docs/plans/pro-plan)); bei ~3 MB pro Vorschau-Loop reicht das für Hunderttausende Abrufe). Bei wachsender Bibliothek oder Wunsch nach adaptivem HLS: **Bunny Stream** (EU-Anbieter aus Slowenien, Speicher/Auslieferung ab ca. 0,005–0,01 $/GB) ([Bunny Docs](https://docs.bunny.net/stream/pricing), [Swarmify Review](https://swarmify.com/blog/bunny-stream-review/)). Dann mit `hls.js` direkt einbinden statt Bunny-iFrame, AVV abschließen.
- **Keine YouTube-/Instagram-/TikTok-Embeds** für die Referenzen: Sie sind langsam (≥ 500 KB JS je Embed), setzen Drittanbieter-Cookies und brauchen Consent (siehe C1).

## A5. Barrierefreiheit (BFSG) – betrifft das SCM Creatives?

**Kurzantwort: Sehr wahrscheinlich nein. Freiwillige Umsetzung von WCAG 2.2 AA (Kernpunkte) wird trotzdem empfohlen.**

1. **Das BFSG erfasst Websites nicht pauschal**, sondern nur „Dienstleistungen im elektronischen Geschäftsverkehr“, die *im Hinblick auf den Abschluss eines **Verbrauchervertrags*** erbracht werden (§ 2 Nr. 26 BFSG). Reine B2B-Angebote sind nicht erfasst. ([BMAS-Leitlinien](https://www.bundesfachstelle-barrierefreiheit.de/SharedDocs/Downloads/DE/Externe-Veroeffentlichungen/bmas-leitlinien-bfsg.pdf?__blob=publicationFile), [IHK Köln](https://www.ihk.de/koeln/hauptnavigation/recht-steuern/barrierefreiheit-von-webseiten-dienstleistungen-und-produkten-5921172), [e-recht24](https://www.e-recht24.de/ecommerce/13236-barrierefreiheitsstaerkungsgesetz.html)) SCM Creatives verkauft an Gastronomen, Makler, Handwerker und Unternehmen, also an **Unternehmer**.
2. **Kleinstunternehmen, die Dienstleistungen erbringen, sind ausgenommen** (§ 3 Abs. 3 BFSG): **< 10 Beschäftigte und Jahresumsatz *oder* Jahresbilanzsumme ≤ 2 Mio. €**. ([IHK Aachen](https://www.ihk.de/aachen/recht/rechtsinformationen/aktuelle-dokumente-zum-thema-recht/barrierefreiheitsstaerkungsgesetz-bfsg-6517836), [HWK Dortmund FAQ](https://www.hwk-do.de/wp-content/uploads/2025/06/20250228_2_Anlage_Praxis_Recht_Barrierefreie_Webseiten_Betriebe_FAQ.pdf)) Ein 1–5-Personen-Team fällt klar darunter.
3. **Grauzone:** Kontaktformulare oder Terminbuchungen, die konkret einen Verbrauchervertrag anbahnen, werden teils als erfasst angesehen ([Sandra Löwe/Härting](https://www.sandraloewe.de/blog/bfsg-und-das-kontaktformular-warum-auch-kostenlose-angebote-zur-grauzone-werden-koennen/), [Ostend Digital](https://ostend.digital/barrierefreiheit-website/)). Das ist für SCM wegen B2B *und* Kleinstunternehmen-Ausnahme doppelt irrelevant. Würde SCM wachsen (≥ 10 MA oder > 2 Mio. €) **und** B2C-Leistungen online anbahnen, wäre neu zu prüfen.
4. **Dokumentieren:** Kurze interne Notiz, warum das BFSG nicht greift (B2B, Kleinstunternehmen, Stand Datum). Teilweise wird empfohlen, die Inanspruchnahme der Ausnahme zu dokumentieren. ([Händlerbund](https://www.haendlerbund.de/de/ratgeber/recht/barrierefreiheitsstaerkungsgesetz-bfsg))

**Warum trotzdem barrierearm bauen?** Bessere Mobile-UX, SEO und Professionalität. Außerdem sind manche Kunden der Agentur (z. B. größere Makler) selbst BFSG-pflichtig, und Barrierefreiheit ist dann ein Verkaufsargument für Untertitel in deren Videos.

**Pragmatische Checkliste (WCAG 2.2, Auszug):**
- Kontrast Fließtext **≥ 4,5:1**, große Schrift/UI-Elemente **≥ 3:1** (1.4.3/1.4.11). Text auf Video **nur mit Overlay/Scrim**.
- **Untertitel** für Videos mit Sprache (1.2.2): Reels haben meist eingebrannte Untertitel (Open Captions), in der Lightbox zusätzlich eine WebVTT-`<track>`-Datei. Untertitel sind auch Conversion-relevant, weil viele stumm schauen.
- **Autoplay > 5 s braucht Pause-Möglichkeit** (2.2.2): ein sichtbarer Pause-Button am Hero-Loop. Ton nie automatisch (1.4.2). ([BrowserStack-Regel](https://www.browserstack.com/docs/accessibility/rules/a11y-engine/4.1/pause-moving-content), [a11y project](https://www.a11yproject.com/posts/never-use-auto-play/))
- Tastaturbedienbarkeit von Galerie, Lightbox und Funnel. Sichtbarer Fokus (2.4.7, 2.4.11). `lang="de"`, sinnvolle Überschriften-Hierarchie, `alt`-Texte, Formular-Labels, Fehlermeldungen als Text (nicht nur rot), Zielgröße ≥ 24 × 24 px (2.5.8; wir nehmen 48 px).
- `prefers-reduced-motion` respektieren.

---

# TEIL B – Kunden- und Lead-Management

## B1. CRM-Optionen für 1–5 Personen

| CRM | Kosten (netto, Stand 2026) | DSGVO/Datenort | Plus | Minus | Eignung |
|---|---|---|---|---|---|
| **Brevo** (FR) | **Free:** Sales-CRM mit Pipelines/Deals, Meetings-Buchungsseite, 300 Mails/Tag · Starter ab ca. 7–9 €/Monat · Sales Pro ca. 12 $/Nutzer | **Server in der EU**, ISO 27001, AVV im Account ([Brevo Sicherheit](https://www.brevo.com/de/sicherheit/)) | CRM + Transaktionsmail + Newsletter + Terminbuchung **in einem** EU-Tool, gute API | CRM weniger ausgefeilt als Pipedrive, Automationsumfang im Free-Plan begrenzt | **★ Empfehlung** |
| **Pipedrive** (EE) | Lite 14 €/24 € · Growth 39 €/49 € pro Nutzer (jährl./monatl.) · kein Free-Plan | EU-Rechenzentrum Frankfurt (Rackspace) ([Rackspace](https://www.rackspace.com/de-de/case-studies/pipedrive)) | Beste Pipeline-UX, sehr gute Mobile-App | Automationen erst ab Growth, Web-Forms nur als LeadBooster-Add-on, Kosten pro Nutzer | Upgrade-Pfad bei viel Vertrieb ([meetergo](https://meetergo.com/blog/pipedrive-preise), [Pipedrive Limits](https://support.pipedrive.com/nl/article/usage-limits-in-pipedrive)) |
| **HubSpot Free/Starter** (US) | Free (Limits: u. a. Nutzer/Pipelines, Branding) · Starter ca. 7 € (jährl.) bis 20 € (monatl.) pro Platz | EU-Rechenzentrum Frankfurt wählbar, Teile der Infrastruktur in den USA ([HubSpot EU DC](https://hubspot.com/eu-data-centre), [Community](https://community.hubspot.com/t/gdpr-and-data-storage-in-europe/66415)) | Sehr mächtig, viele Integrationen | Tracking-Skript/Formular-Embeds setzen Cookies → Banner. Preissprung zu Professional enorm, US-Konzern | Ok, aber für dieses Setup überdimensioniert ([Spotdev](https://www.spotdev.co.uk/blog/is-hubspot-free), [meetergo](https://meetergo.com/blog/hubspot-preise)) |
| **Zoho Bigin** (IN) | Free (1 Nutzer, 500 Datensätze) · Express ≈ 7 €, Premier ≈ 12 € pro Nutzer | EU-Rechenzentren (zoho.eu) | Günstig, schlank | Weniger Ökosystem in DE, Support | Budget-Alternative ([Capterra](https://capterra.com/p/204998/Bigin-by-Zoho-CRM/pricing/)) |
| **CentralStationCRM** (DE) | Starter 0 € (3 Nutzer, 200 Kontakte) · **Team 24 €/Monat (3 Nutzer, 3.000 Kontakte)** · Small Office 75 € | Deutscher Anbieter, Hosting in DE | Sehr einfach, „deutsch & DSGVO-ruhig“, API | Keine eigene Mail-Automation/Transaktionsmail → separates Mail-Tool nötig | Alternative, wenn „Made in Germany“ Priorität hat ([taxandbytes](https://www.taxandbytes.de/tools/crm-systeme/centralstationcrm/preise), [trusted.de](https://trusted.de/centralstation-crm-kosten)) |
| **weclapp** (DE) | ERP-Pakete ab ca. 39 €/Nutzer, Dienstleistung ≈ 86 €/Nutzer (jährl.) | Hosting in DE | CRM + Angebote + Projekte + Rechnungen in einem | Für 1–5 Personen teuer und komplex | Erst ab ~5+ MA mit Projektcontrolling ([zeeg](https://zeeg.me/de/blog/content/weclapp-preise)) |
| **Close** (US) | Solo 9 $ (jährl.)/19 $ (monatl.) · Essentials 35 $/49 $ pro Nutzer | US | Stark für Telefon-/E-Mail-Vertrieb | US, Fokus Outbound-Calling | Nicht passend ([Automation Atlas](https://automationatlas.io/answers/close-crm-pricing-explained-2026/)) |
| **Notion / Airtable** | Notion Plus ≈ 10–12 $/Nutzer · Airtable Team 20–24 $/Nutzer (Free: 1.000 Datensätze/Base) | US-Anbieter | Maximal flexibel, gut als Kundenportal/Projekt-DB | Kein echtes CRM (Mail-Tracking, Erinnerungen, Pipeline-Reports, Sequenzen fehlen) | **Notion als Projekt-/Kundenportal**, nicht als CRM ([Breeze](https://www.breeze.pm/articles/notion-ai-pricing), [Jetadmin](https://www.jetadmin.io/blog/airtable-pricing-in-2026-plans-real-costs-and-when-to-upgrade/)) |

**Empfehlung: Brevo als zentrales CRM.**
- Es deckt **CRM-Pipeline, Transaktionsmails (Bestätigung/Benachrichtigung), Terminbuchung (Meetings) und später Newsletter (DOI)** mit einem EU-Anbieter und **einem AVV** ab. Weniger Tools bedeutet weniger Datenflüsse und weniger Pflege.
- Startkosten 0 €. Upgrade auf Starter (~7–9 €) erst, wenn Newsletter oder mehr Versand nötig ist. ([Brevo Sales](https://www.brevo.com/sales-crm/), [Website Planet zu Meetings](https://websiteplanet.com/news/brevo-introduces-new-sales-solutions), [Sender.net Free-Plan](https://www.sender.net/reviews/brevo/pricing/free-plan))
- **Wechselkriterium zu Pipedrive Growth:** > 30 gleichzeitig offene Deals, ≥ 2 Vertriebspersonen, Bedarf an Pipeline-Forecasts. Migration per CSV/API ist unproblematisch.

**Pipeline-Stufen (Brevo Deals):**
`Neue Anfrage → Kontakt aufgenommen → Erstgespräch gebucht → Erstgespräch geführt → Angebot versendet → Verhandlung → Gewonnen (→ Onboarding) | Verloren (Grund pflegen!)`
Für Bestandskunden zusätzlich eine **zweite Pipeline „Kundenbetreuung“**: `Onboarding → Skript → Dreh geplant → Schnitt/Feedback → Live → Reporting → Verlängerung fällig`.

## B2. Formular → CRM auf statischer Vercel-Seite

### Optionen

| Weg | Vorteile | Nachteile | DSGVO | Kosten |
|---|---|---|---|---|
| **A) Vercel Function + Brevo API** ★ | Volle Kontrolle über Design und Funnel, Lead-Scoring serverseitig, ein Request legt Kontakt + Deal an und schickt beide Mails, kein Drittanbieter-Skript im Browser | ~150–250 Zeilen Code, API-Key als Env-Variable | Vercel (DPA, DPF-zertifiziert) + Brevo (EU, AVV) | 0 € zusätzlich |
| B) Vercel Function + Resend/Postmark | Sehr gute Entwickler-Mail-APIs | Nur Mail, CRM separat. Resend speichert Account-/Logdaten in den USA, auch bei EU-Versandregion | Weiterer US-Auftragsverarbeiter | Resend Free 3.000 Mails/Monat (max. 100/Tag), Pro 20 $ · Postmark ab 15 $/10.000 ([Resend Pricing](https://www.resend.com/pricing.md), [Resend Regions](https://resend.com/docs/dashboard/domains/regions), [Postmark](https://automationatlas.io/answers/postmark-pricing-explained-2026/)) |
| C) Formspree | In 10 Minuten fertig | Free nur 50 Einsendungen/Monat, keine Webhooks im Free-Plan, US | US-Transfer | ab ~10–15 $/Monat ([Splitforms-Vergleich](https://splitforms.com/formspree-pricing)) |
| D) Web3Forms | 250 Einsendungen/Monat gratis | Datenhaltung/AVV unklar, Mail-only | unklar | Free/Pro ([Web3Forms](https://web3forms.com/pricing)) |
| E) Tally-Embed | EU (Belgien), Daten in Europa, Webhooks, Free-Plan gut | Fremd-iFrame/JS, Design nur begrenzt anpassbar, Branding entfernen kostet (Pro ≈ 20–29 €) | Gut (EU) | 0–29 €/Monat ([Tally](https://www.tally.so/pricing), [European Purpose](https://europeanpurpose.com/tool/tally)) |
| F) Typeform-Embed | Schöne UX | Basic: 100 Antworten/Monat für ≈ 25–39 $, **EU-Rechenzentrum nur Enterprise** | US | teuer ([Tinycommand](https://tinycommand.com/blogs/typeform-pricing-explained)) |
| G) CRM-Formular direkt (HubSpot Forms, Pipedrive LeadBooster) | Kein Code | Tracking-Skripte/Cookies → Consent nötig, Design-Bruch, Pipedrive-Web-Forms = Add-on | Banner nötig | variabel |

**Empfehlung: A) Vercel Function + Brevo API.** Begründung: Volle Gestaltungsfreiheit für den Video-/Quiz-Funnel, kein Fremd-Skript im Browser (dadurch kein Consent nötig), Scoring und Routing serverseitig, ein Anbieter für CRM und Mails, Kosten 0 €.

### Architektur
```
Browser (Funnel, Vanilla JS)
   │  POST /api/anfrage  (JSON: Antworten, Kontakt, altcha-payload, hp-Feld, t_start)
   ▼
Vercel Function (Node, Region fra1)          ← vercel.json: "regions": ["fra1"]
   1. Validierung (Pflichtfelder, E-Mail-Format, Längenlimits)
   2. Spam: Honeypot leer? Ausfüllzeit > 4 s? ALTCHA-Proof gültig?
   3. Lead-Score berechnen (siehe B3) → A/B/C
   4. Brevo API
      a) Kontakt anlegen/aktualisieren (Attribute: Branche, Ziel, Budget, Start, PLZ, Score)
      b) Deal in Pipeline "Neue Anfrage" anlegen, mit Kontakt verknüpfen, Owner zuweisen
      c) Notiz mit allen Antworten + Aufgabe "Lead kontaktieren" (fällig: A = 1 h, B = 4 h, C = 24 h)
      d) Transaktionsmail an Lead (Template "Bestätigung", mit Terminlink bei A/B)
      e) Transaktionsmail an Team (Betreff: "[A] Neue Anfrage Handwerk – 1.000–2.500 €")
   5. Antwort {ok:true, tier:"A"} → Frontend zeigt passende Danke-Ansicht
   ✖ Fehlerfall: Frontend zeigt "Bitte rufen Sie uns an / WhatsApp" + mailto-Fallback
      mit vorausgefüllten Antworten. Keine personenbezogenen Daten in Logs schreiben.
```
- **API-Key** nur als Vercel-Umgebungsvariable (`BREVO_API_KEY`), niemals im Frontend.
- **Absender-Domain** in Brevo verifizieren (SPF, DKIM, DMARC), damit Bestätigungsmails nicht im Spam landen.
- Brevo-Endpunkte (v3): Contacts, CRM Deals/Notes/Tasks, Transactional Email (`/smtp/email`). Vor der Implementierung gegen die offizielle Doku (developers.brevo.com) prüfen. Deals per API anzulegen ist in der Praxis gängig ([Beispiel Windmill](https://hub.windmill.dev/scripts/brevo/11590/create-a-deal-brevo/11620/versions), [Softr](https://docs.softr.io/workflows/integrations/brevo)).

### Spam-Schutz ohne Google reCAPTCHA

| Methode | Wirkung | Datenschutz | Kosten | Bewertung |
|---|---|---|---|---|
| **Honeypot** (verstecktes Feld, `tabindex="-1"`, `autocomplete="off"`, per CSS ausgeblendet, `aria-hidden`) | Filtert einfache Bots | Keine Daten | 0 € | **Pflicht** |
| **Zeitfalle** (Absenden < 4 s nach Laden = Bot) | Gut gegen Skript-Bots | Keine | 0 € | **Pflicht** |
| **ALTCHA** (Proof-of-Work, MIT-Lizenz, Challenge/Verify in eigener Vercel Function) | Gut, unsichtbar für Nutzer | Laut Anbieter keine Cookies, kein Fingerprinting, keine Dritten. WCAG-2.2-AA-konform | 0 € | **★ Empfehlung** ([ALTCHA](https://altcha.org/), [FAQ](https://altcha.org/faq/)) |
| **Friendly Captcha** (DE) | Gut (PoW + Risiko-Signale) | EU, AVV, deutscher Anbieter | Free nur nicht-kommerziell, kommerziell kostenpflichtig (Starter, Preis prüfen) | Gute Managed-Alternative ([IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/recaptcha-dsgvo-alternativen.html)) |
| **Cloudflare Turnstile** | Sehr gut | IP-Übermittlung an US-Anbieter, Datenschutzerklärung nötig. Ob Einwilligung nötig ist, ist umstritten | 0 € (20 Widgets) | Nur als Fallback ([e-recht24](https://www.e-recht24.de/dsg/13110-cloudflare-turnstile.html), [Cloudflare Plans](https://developers.cloudflare.com/turnstile/plans/)) |
| **Vercel BotID (Basic)** | Unsichtbar, ML-basiert | Vercel ist ohnehin Auftragsverarbeiter, Client-Signale sind aber unter § 25 TDDDG zu prüfen | Basic kostenlos, Deep Analysis ~1 $/1.000 Checks | Option, falls ALTCHA nicht reicht ([Vercel BotID](https://vercel.com/docs/botid)) |
| Google reCAPTCHA | Gut | Einwilligungspflichtig, US | 0 € | **Nicht verwenden** ([IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/google-recaptcha-einwilligungspflicht.html?print=1)) |

Zusätzlich serverseitig: Längenlimits, Ablehnung von Links im Namensfeld und eine einfache Rate-Limit-Regel (z. B. max. 5 Einsendungen/IP/Stunde über die Vercel Firewall, sofern im Plan verfügbar).

## B3. Qualifizierungsfragen & Lead-Scoring

### Im Funnel (max. 5–6 Fragen, siehe A3)
Branche · Hauptziel · Umfang (Projekt vs. laufend) · Budget · Startzeitpunkt + PLZ · Kontakt/Kanal.

### Im Erstgespräch (Discovery, 20–30 Min., Gesprächsleitfaden als Notion-/Brevo-Template)
1. **Ziel & KPI:** Woran merken Sie in 3 Monaten, dass es funktioniert hat (Reservierungen, Bewerbungen, Anfragen, Objektanfragen)?
2. **Status quo:** Welche Kanäle (IG/TikTok/YT/LinkedIn), Follower, Posting-Frequenz? Wer postet heute?
3. **Zielgruppe:** Wen wollen Sie erreichen (Gäste lokal, Eigentümer, Azubis 16–20, B2B-Entscheider)?
4. **Kamera:** Wer steht vor der Kamera? Inhaber/Mitarbeiter bereit? (Wichtig für die Einwilligungen, siehe C3.)
5. **Drehbedingungen:** Ort(e), Öffnungszeiten, Saisonalität, Objekte (Makler: Eigentümer-Zustimmung).
6. **Entscheidung & Freigabe:** Wer entscheidet? Wer gibt Skripte frei? Wie schnell?
7. **Budget & Laufzeit:** Monatsbudget, Ads-Budget für Reichweite (Paid Distribution)?
8. **Marke:** CI/Logo/Farben, Tonalität, No-Gos, Vorbilder/Wettbewerber.
9. **Veröffentlichung:** Wer lädt hoch (Agentur oder Kunde)? Zugänge?
10. **Rechte:** Musik (kommerzielle Accounts dürfen nicht jede Plattform-Musik nutzen), Nutzung der Videos als Agentur-Referenz.

### Lead-Scoring-Modell (Punkte, im Function-Code)
| Kriterium | Ausprägung → Punkte |
|---|---|
| Branche | Zielbranche (Gastro/Immo/Handwerk) 15 · Unternehmen 10 · Sonstiges 0 |
| Ziel | Mitarbeiter/Azubis 15 · Neukunden/Gäste/Objekte 15 · Marke 10 · „Weiß nicht“ 5 |
| Umfang | Laufend 8+/Monat 25 · Laufend 4/Monat 20 · Projekt 10 · Beratung 5 |
| Budget | > 2.500 € 30 · 1.000–2.500 € 25 · 500–1.000 € 15 · < 500 € 0 · Noch offen 8 |
| Start | ASAP 15 · 1–3 Monate 10 · Später 0 |
| Region | PLZ im Drehradius (z. B. ≤ 80 km) 10 · außerhalb 0 |
| Telefon angegeben | 5 |

**Klassen:**
- **A ≥ 75 „heiß“:** Terminlink sofort auf der Danke-Seite, Anruf/WhatsApp **innerhalb 1 Std.** zu Geschäftszeiten.
- **B 45–74:** Terminlink sofort, persönliche Kontaktaufnahme am selben Tag.
- **C < 45:** Danke-Seite mit Branchen-Reels und Paketübersicht. Kontakt innerhalb 24 h per E-Mail mit Preisrahmen. Bei < 500 € Budget ggf. auf ein „Starter-Paket“ oder einen Workshop verweisen.

Nach 3–6 Monaten die Gewichte anhand der gewonnenen/verlorenen Deals in Brevo nachjustieren.

## B4. Automatisierungen

| Zeitpunkt | Aktion | Kanal | Technik |
|---|---|---|---|
| **T+0 s** | Bestätigung an Interessenten: Danke, Zusammenfassung der Antworten, „So geht's weiter“ (3 Schritte), **Terminlink** (A/B), WhatsApp-Link, 1 Branchen-Reel, Ansprechpartner mit Foto | E-Mail | Vercel Function → Brevo Transaktions-Template |
| **T+0 s** | Team-Benachrichtigung mit Score im Betreff, alle Antworten, Direktlink zum Deal, Klick-zum-Anrufen | E-Mail (+ Push über Brevo-App, optional Slack/Telegram-Webhook) | Function |
| **T+0 s** | CRM-Aufgabe „Kontaktieren“ mit Fälligkeit nach Score | Brevo Task | Function |
| **Bei Buchung** | Kalendereinladung mit Videolink, Erinnerung 24 h und 1 h vorher, Deal → „Erstgespräch gebucht“ | E-Mail | Brevo Meetings / zeeg |
| **T+1 Tag (kein Termin)** | Persönlicher Anruf oder WhatsApp (falls als Kanal gewählt) | Telefon/WA | Aufgabe im CRM |
| **T+3 Tage** | Follow-up 1: persönlich, mit 1 passendem Case aus der Branche + Terminlink | E-Mail (Vorlage, manuell oder Workflow) | Brevo |
| **T+7 Tage** | Follow-up 2 („Soll ich Ihre Anfrage offen halten?“), danach Stopp | E-Mail | Brevo |
| **Nach Erstgespräch** | Angebot binnen 48 h. Nachfassen nach 3 und 10 Tagen | E-Mail/Telefon | CRM-Aufgaben |
| **Verloren** | Grund erfassen. Newsletter **nur mit DOI-Einwilligung** | – | Brevo-Liste |

**Rechtliche Leitplanke (§ 7 UWG):** Antworten und kurze, **persönliche Nachfassungen, die sich auf die konkrete Anfrage beziehen**, sind Teil der angefragten Kommunikation. **Allgemeine Werbe-Sequenzen oder Newsletter brauchen eine nachweisbare Einwilligung**, auch im B2B. Die Bestandskunden-Ausnahme (§ 7 Abs. 3 UWG) greift erst nach einem Verkauf. ([IHK München](https://www.ihk-muenchen.de/email-marketing/), [IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/werbung-email-social-media-telefon-fax-was-ist-erlaubt.html)) Daher: max. 2–3 anfragebezogene Follow-ups, Abmeldung respektieren, Newsletter-Opt-in als **separate, nicht vorangekreuzte** Checkbox im Funnel + Double-Opt-In.

**Speed-to-Lead als Team-Regel:** Werktags 8–18 Uhr Rückmeldung auf A-Leads innerhalb von 60 Minuten. Die Team-Mail landet als Push auf dem Handy.

## B5. Kunden-Lifecycle einer Skript-Video-Agentur

| # | Phase | Ziel/Output | Tools | Templates |
|---|---|---|---|---|
| 1 | **Erstgespräch** (20–30 Min., Video) | Bedarf, Fit, Budget klären | Brevo Meetings/zeeg, Google Meet/Zoom/Jitsi | Discovery-Leitfaden (B3), Deal-Notiz |
| 2 | **Angebot** (≤ 48 h) | 2–3 Paketoptionen (Good/Better/Best) | Lexware Office / sevdesk (Angebote & Rechnungen, ≈ 8–25 €) ([Vergleich](https://kostenlose-erechnung.de/ratgeber/lexoffice-vs-sevdesk/)) | Angebotsvorlage inkl. Leistungsbeschreibung, Korrekturschleifen, Nutzungsrechte |
| 3 | **Vertrag** | Unterschrift, Rechte geklärt | Yousign (Free 2 Signaturen/Monat, One ≈ 9 €, EU-Anbieter) ([Verdocs](https://verdocs.com/?p=13994)) | Rahmenvertrag/AGB, AVV (falls Agentur Kundendaten verarbeitet, z. B. Social-Logins/Community-Management), **Einwilligungs-Vorlagen für Personen im Video** (C3) |
| 4 | **Onboarding/Kickoff** (60 Min.) | Ziele, Zugänge, Drehplanung | **Notion-Kundenportal** (1 Seite pro Kunde: Ziele, Termine, Skripte, Freigaben, Rohdaten-Links, Reporting) | Onboarding-Fragebogen, Zugangs-Checkliste, Markenleitfaden-Abfrage |
| 5 | **Skript-Erstellung & Freigabe** | 4–12 Skripte/Monat freigegeben | Notion (Status: Entwurf → Review → Freigegeben) oder Google Docs mit Kommentaren | Skript-Template: Hook (0–3 s), Problem, Lösung, Proof, CTA, On-Screen-Text, Shotlist |
| 6 | **Drehtag** | Alle Szenen im Kasten | Drehplan (Notion), Call-Sheet | Call-Sheet, Shotlist, **unterschriebene Einwilligungen** vor Ort einsammeln |
| 7 | **Schnitt** | V1 aller Videos | NLE (Premiere/DaVinci/CapCut), Rohdaten in Drive/NAS | Export-Presets 9:16, Untertitel-Styling |
| 8 | **Feedback-Schleifen** (2 inklusive) | Freigabe | **Frame.io** (Free 2 GB/2 Projekte, Pro 15 $/Nutzer, bis 5 Nutzer) für timecode-genaue Kommentare ([Capterra](https://www.capterra.com/p/148214/Frame-io/pricing/)) | Feedback-Regeln: 1 gebündeltes Feedback pro Runde, Frist 3 Werktage |
| 9 | **Veröffentlichung** | Posts live, Redaktionsplan | Meta Business Suite / TikTok / Planungstool, Notion-Kalender | Caption-Vorlagen, Hashtag-Sets, Posting-Zeiten |
| 10 | **Reporting** (monatlich) | Kennzahlen + Learnings | Plattform-Insights → Notion/Google Looker Studio | 1-seitiger Report: Views, Watchtime, Saves/Shares, Profilbesuche, **Business-KPI** (Anfragen, Bewerbungen) + 3 Learnings + Plan nächster Monat |
| 11 | **Verlängerung/Upsell** | Vertragsverlängerung, Bewertung | Brevo (Pipeline „Kundenbetreuung“, Erinnerung 30 Tage vor Laufzeitende) | Quartals-Review-Termin, Bitte um Google-Bewertung + Video-Testimonial |

**Darstellung auf der Website: Abschnitt „So arbeiten wir“** (vertrauensbildend, beantwortet „Wie viel Aufwand habe ich?“):

> **1 · Erstgespräch (20 Min., kostenlos)** – Wir verstehen Ihr Ziel und sagen ehrlich, ob Video passt.
> **2 · Strategie & Skripte (Woche 1–2)** – Wir schreiben die Skripte, Sie geben frei. *Ihr Aufwand: ca. 30 Min.*
> **3 · Drehtag (½–1 Tag vor Ort)** – Wir bringen Technik und Regie mit und coachen Ihr Team vor der Kamera.
> **4 · Schnitt & Feedback (Woche 3)** – Sie kommentieren direkt im Video. 2 Korrekturrunden inklusive.
> **5 · Veröffentlichung & Reporting** – Wir posten (optional) und zeigen monatlich, was wirkt.

Umsetzung als vertikale Timeline mit Nummern, Dauer-Chips und „Ihr Aufwand“-Badges. Dazu jeweils ein kurzes Behind-the-Scenes-Clip und ein Hinweis „Alles DSGVO-konform: Einwilligungsvorlagen für Ihr Team inklusive“. Das ist ein echtes Differenzierungsmerkmal.

## B6. Bewertungen sammeln & rechtssicher zeigen

**Sammeln:**
1. **Google-Unternehmensprofil** einrichten bzw. pflegen (Kategorie „Videoproduktion“/„Marketingagentur“, Leistungen, Reels als Fotos/Videos). Den **direkten Bewertungslink** („Rezension schreiben“) aus dem Profil generieren.
2. **Zeitpunkt:** Nach dem ersten Reporting mit sichtbaren Ergebnissen (ca. Tag 30–45) und bei Verlängerung. Persönliche Bitte per WhatsApp/E-Mail mit Link, plus QR-Code am Drehtag.
3. **Video-Testimonial** am nächsten Drehtag gleich mitdrehen (Einwilligung inkl. Nutzung auf der SCM-Website!).
4. **Verboten:** Anreize wie Gutscheine, Rabatte oder Spenden für Bewertungen (LG Hildesheim, 28.12.2021, 11 O 12/21; Google-Richtlinien) und **Review-Gating**, also nur zufriedene Kunden gezielt um Bewertungen bitten, sowie Bewertungs-Quoten. ([ra-plutte](https://www.ra-plutte.de/lg-hildesheim-amazon-gutschein-gegen-google-bewertung/), [Google-Richtlinie](https://support.google.com/contributionpolicy/answer/7400114?hl=en), [ppc.land](https://ppc.land/google-tightens-maps-review-policy-staff-names-and-quotas-now-banned/))
5. **Auf jede Bewertung individuell antworten.** 80 % bevorzugen Betriebe, die antworten, generische Antworten schrecken 50 % ab (BrightLocal 2026).
6. **ProvenExpert** ist optional: Free (10 sichtbare Bewertungen) · Basic 29,99 €/Monat (jährl.) mit Widget/3 externen Quellen · Plus 49,99 € ([ecom-tools](https://ecom-tools.de/provenexpert/)). Für den Start reicht Google. ProvenExpert lohnt sich erst, wenn Siegel/Umfragen aktiv im Vertrieb genutzt werden.

**Auf der Website zeigen:**
- **Statisch statt Widget:** Bewertungen als HTML-Text mit Sternen, Datum und Quelle sowie einem Link „Alle Bewertungen auf Google ansehen“. Ein Google-/ProvenExpert-Widget lädt Drittanbieter-Skripte und braucht dann Consent.
- **Pflichthinweis nach § 5b Abs. 3 UWG** gut sichtbar direkt am Bewertungsbereich (nicht versteckt hinter einem unklaren Link; OLG Frankfurt, OLG Köln 6 U 59/24). Die bloße Nennung der Plattform reicht nicht. ([IT-Recht Kanzlei FAQ](https://www.it-recht-kanzlei.de/faq-informationspflicht-echtheit-kundenbewertungen.html), [ra-plutte OLG Koblenz](https://www.ra-plutte.de/olg-koblenz-werbung-mit-bewertungen-ohne-infos-zur-echtheit/), [onlinemarktplatz](https://onlinemarktplatz.de/270958/kundenbewertungen-im-shop/))

  Mustertext:
  > *„Hinweis zur Echtheit: Die gezeigten Bewertungen sind eine Auswahl aus unserem Google-Unternehmensprofil (Stand: 01.10.2026). Wir veröffentlichen hier nur Bewertungen von Unternehmen, für die wir nachweislich ein Projekt umgesetzt haben (Abgleich mit unserer Kundenliste). Auf Google selbst prüfen wir Bewertungen nicht; dort gelten die Richtlinien von Google. Alle Bewertungen: [Link]“*
- **Namen und Fotos** von Bewertern bzw. Testimonial-Gebern nur mit Einwilligung, sonst Vorname + Initial bzw. Firmenname.
- Sternedurchschnitt („4,9 aus 37“) nur mit aktuellem Stand-Datum und regelmäßiger Aktualisierung.

---

# TEIL C – DSGVO & Recht für genau diese Website

## C1. Einwilligungspflichten & Cookie-Banner

| Element | Einwilligung nötig? | Empfehlung |
|---|---|---|
| **Kontakt-/Anfrageformular** | **Nein.** Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen), ggf. lit. f. Eine Pflicht-Checkbox „Ich stimme der Datenschutzerklärung zu“ ist **unnötig** und rechtlich schief (keine echte Einwilligung). ([e-recht24](https://www.e-recht24.de/online-marketing/10651-abmahnung-kontaktformular.html), [Dr. Datenschutz](https://www.dr-datenschutz.de/kontaktformulare-aber-mit-welcher-rechtsgrundlage/)) | Unter dem Button: *„Wir verarbeiten Ihre Angaben zur Bearbeitung Ihrer Anfrage und speichern sie in unserem CRM (Brevo, EU). Details: [Datenschutzerklärung].“* Nur nötige Pflichtfelder, TLS. **Newsletter = separate, nicht vorangekreuzte Checkbox + DOI** (Kopplungsverbot Art. 7 Abs. 4 DSGVO) |
| **YouTube/Instagram/TikTok-Embeds** | **Ja** (§ 25 TDDDG + DSGVO). Auch `youtube-nocookie.com` überträgt IP-Adressen an Google ([IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/youtube-videos-online-shop.html), [Händlerbund](https://www.haendlerbund.de/de/news/aktuelles/wissenssnack/kurz-erklaert-datenschutz-youtube-videos), [Dr. Datenschutz/BfDI](https://www.dr-datenschutz.de/bfdi-prueft-bundes-webseiten-youtube-einbindungen-im-visier/)) | **Videos selbst hosten.** Falls doch nötig: **2-Klick-Lösung** (Platzhalterbild + „Video laden – dabei werden Daten an Google/Meta übertragen“), nach Bremer Vermerk eine eindeutig bestätigende Handlung ([Bremen](https://www.kogis.bremen.de/sixcms/media.php/13/Vermerk_datenschutzkonformes%20Einbetten%20von%20YouTube-Videos.pdf)). Instagram-Feed als statische Kacheln mit Link nach außen |
| **Calendly/Cal.com-Embed** | **Ja** bei Inline-Embed (Cookies, US-Transfer, teils reCAPTCHA/Stripe) ([e-recht24 Calendly](https://www.e-recht24.de/dsg/12620-calendly.html), [meetergo](https://meetergo.com/blog/calendly-dsgvo-konform-einbinden)) | Kein Embed. **Link in neuem Tab** zu Brevo Meetings oder zeeg (deutsche Server bei der Telekom-Cloud, AVV inklusive) ([zeeg](https://zeeg.me/de/blog/content/dsgvo-konforme-terminplanung)). Hinweis: cal.eu wird laut mehreren Quellen eingestellt ([Nylas](https://www.nylas.com/?p=49882)) |
| **Google Fonts** | Bei Laden von Google-Servern: rechtswidrig ohne Einwilligung (LG München I, 20.01.2022, 3 O 17493/20: 100 € Schadensersatz, danach Abmahnwelle) ([Otto Schmidt](https://www.otto-schmidt.de/news/wirtschaftsrecht/dynamische-einbindung-von-google-fonts-in-internetseite-birgt-risiko-einer-datenschutzrechtlichen-abmahnung-2022-08-17.html), [LfD Niedersachsen](https://lfd.niedersachsen.de/download/190184)) | **Lokal hosten** (WOFF2 im Repo), auch Icon-Fonts. Keine CDNs für CSS/Fonts |
| **Google Maps** | Ja | Statisches Kartenbild (selbst gehostet) + Link „Route in Google Maps öffnen“ |
| **WhatsApp-Button** | Nein, solange es ein **reiner `wa.me`-Link** ohne Widget-Skript ist (keine Datenübertragung vor dem Klick) | In der Datenschutzerklärung erwähnen. Bei Nutzung der **WhatsApp Business App**: Adressbuch-Abgleich ist datenschutzrechtlich heikel → **separates Firmenhandy nur mit Geschäftskontakten**, keine sensiblen Unterlagen per WA ([Dr. Datenschutz](https://www.dr-datenschutz.de/whatsapp-und-datenschutz-antworten-auf-die-wichtigsten-fragen/), [DHZ](https://www.deutsche-handwerks-zeitung.de/whatsapp-und-dsgvo-das-gilt-rechtlich-beim-datenschutz-149009/), [Sinch](https://sinch.com/de/blog/whatsapp-datenschutz-unternehmen/)). Später ggf. WhatsApp Business Platform über einen EU-Anbieter |
| **Analytics: Vercel Web Analytics** | Nach überwiegender Praxis **ohne Banner** nutzbar: **keine Cookies**, Besucher werden über einen **täglich rotierenden Hash** aus dem Request erkannt, kein seiten- oder tagesübergreifendes Tracking ([Vercel Analytics Privacy](https://vercel.com/docs/analytics/privacy-policy), [Vercel Docs](https://vercel.com/docs/analytics)) | In der Datenschutzerklärung aufführen (Art. 6 Abs. 1 lit. f). **Restrisiko:** Die Aufsichtsbehörden sehen Reichweitenmessung nicht automatisch als „unbedingt erforderlich“ an ([DSK OH Digitale Dienste 11/2024](https://datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf), [Dr. Datenschutz](https://www.dr-datenschutz.de/webanalyse-datenschutz-nutzerstatistiken-ohne-einwilligung/)). Das Risiko ist bei cookieloser Messung ohne Profilbildung gering |
| **Analytics: Plausible** | Wie oben (cookielos, EU) | Alternative mit besseren Funnels/Goals, ab ca. 9 €/Monat ([Capterra](https://capterra.com/p/187430/Plausible-Insights/)) |
| **GA4, Meta-Pixel, TikTok-Pixel, LinkedIn Insight, Hotjar** | **Ja** | Vermeiden. Wenn SCM eigene Ads schaltet und ein Pixel braucht: **Consent-Banner** (z. B. ein Open-Source-Consent-Tool, self-hosted) |
| **Spam-Schutz ALTCHA / Honeypot** | Nein | Kurz in der Datenschutzerklärung beschreiben |
| **Cloudflare Turnstile** | Umstritten | Nur als Fallback. Dann in der DSE (US-Transfer) aufführen ([e-recht24](https://www.e-recht24.de/dsg/13110-cloudflare-turnstile.html)) |

**Fazit Cookie-Banner:** Mit dem empfohlenen Stack (selbst gehostete Videos und Fonts, keine Embeds, Vercel Web Analytics bzw. Plausible, ALTCHA, `wa.me`-/`tel:`-Links, Termin per Link) werden **keine einwilligungspflichtigen Cookies oder Drittanbieter-Requests** ausgelöst. Damit ist **kein Cookie-Banner erforderlich** ([datenschutz-generator.de](https://datenschutz-generator.de/tdddg-cookies/), [Heuking](https://www.heuking.de/de/news-events/newsletter-fachbeitraege/artikel/aktuelle-rechtslage-zum-einsatz-von-trackingtools-auf-websites.html)). Sobald ein Pixel, Embed oder Widget dazukommt, wird ein Consent-Tool nötig. Diese Regel gehört **ins Projekt-README** als „Definition of Done“.

Bußgeldrahmen bei Verstößen gegen § 25 TDDDG: bis 300.000 € (§ 28 TDDDG) ([BIHK-Leitfaden 07/2025](https://www.bihk.de/fileadmin/eigene_dateien/bihk/Teaserbilder/Sonstiges/Digitalisierung/20250728_Webseiten_datenschutzkonform_gestalten.pdf)). Praktisch relevanter sind Abmahnungen und Art.-82-Schadensersatzforderungen.

## C2. AV-Verträge & EU-Datenhaltung

| Dienst | Rolle | AVV/DPA | Datenort / Transfer | Hinweis |
|---|---|---|---|---|
| **Vercel** | Hosting, Functions, Analytics | DPA (online) | US-Unternehmen, **EU-U.S. Data Privacy Framework zertifiziert**, zusätzlich SCCs ([Vercel DPF](https://vercel.com/kb/guide/is-vercel-certified-under-dpf)). Functions in **`fra1`** ausführen | Statische Dateien kommen global vom CDN. IP-Adressen in Logs → DSE |
| **Brevo** | CRM, Mails, Meetings | AVV im Account | **Server in der EU**, ISO 27001 ([Brevo](https://www.brevo.com/de/sicherheit/)) | Unterauftragsverarbeiter-Liste prüfen |
| zeeg (falls statt Brevo Meetings) | Terminbuchung | AVV inklusive | Deutschland (Telekom-Cloud) | – |
| Bunny.net (optional) | Video-CDN | DPA | EU (Slowenien) | – |
| Frame.io (Adobe) | Video-Review mit Kunden | Adobe DPA | US/global, Speicherort prüfen | Kundenvideos zeigen Personen → AVV wichtig |
| Notion | Kundenportal | DPA | US, DPF-Status prüfen | Keine sensiblen Daten, nur Projektdaten |
| Google Workspace / Drive (optional) | Rohdaten, Docs | Data Processing Amendment | US/EU | Alternativ deutsche Cloud (z. B. IONOS HiDrive, Nextcloud) |
| Lexware Office / sevdesk | Angebote, Rechnungen | AVV | Deutschland | – |
| Yousign | E-Signatur | DPA | EU (FR/DE laut Drittquelle) | – |
| Resend/Postmark (nur falls genutzt) | Mailversand | DPA | Resend: Versand aus Irland möglich, **Account-/Logdaten in den USA** ([Resend Regions](https://resend.com/docs/dashboard/domains/regions)) | Mit Brevo nicht nötig |

**Pflichten im Überblick:**
- AVV nach Art. 28 DSGVO mit jedem Dienst, der personenbezogene Daten **im Auftrag** verarbeitet (Hosting, CRM, Mail, Formular, Termin) ([e-recht24 Webhosting](https://www.e-recht24.de/datenschutz/13053-webhoster-und-datenschutz.html), [IT-Recht Kanzlei](https://www.it-recht-kanzlei.de/auftragsdatenverarbeitung-dsgvo-datenschutzgrundverordnung.html)). Die AVVs als PDF ablegen.
- **Verzeichnis von Verarbeitungstätigkeiten** (Art. 30) für Website/Anfragen, CRM/Vertrieb, Kundenprojekte (Videodrehs mit Personen!), Buchhaltung.
- **Löschkonzept:** Nicht konvertierte Leads z. B. 12 Monate nach letztem Kontakt löschen. Angebote/Geschäftsbriefe 6 Jahre, Buchungsbelege/Rechnungen seit dem BEG IV **8 Jahre** ([Haufe](https://www.haufe.de/steuern/gesetzgebung-politik/viertes-buerokratieentlastungsgesetz_168_613390.html), [iww](https://www.iww.de/pfb/steuern-und-recht-aktuell/abgabenordnung-verkuerzung-der-aufbewahrungsfrist-fuer-buchungsbelege-n163275)).
- Bei US-Diensten: DPF-Zertifizierung auf dataprivacyframework.gov prüfen und in der DSE nennen.

## C3. Pflichtseiten & Bildrechte

**Impressum** (§ 5 DDG, seit 14.05.2024 statt § 5 TMG; inhaltlich unverändert) ([IHK Bonn](https://ihk-bonn.de/recht-und-steuern/recht/aktuelles/das-digitale-dienste-gesetz-ersetzt-das-telemediengesetz), [IHK Nürnberg](https://www.ihk-nuernberg.de/ihr-unternehmen/rechtsinformationen-fuer-unternehmen/internetrecht-recht-des-e-commerce/impressumspflicht)):
- Name/Firma + Rechtsform, ladungsfähige Anschrift, Vertretungsberechtigte, E-Mail **und** ein weiterer schneller Kontaktweg (Telefon), Registereintrag (falls vorhanden), USt-IdNr. (falls vorhanden).
- Bei redaktionellen Inhalten (Blog/Ratgeber): Verantwortlicher nach § 18 Abs. 2 MStV.
- **Keinen Link zur OS-Plattform mehr** (seit 20.07.2025 abgeschaltet, ein toter Link gilt als irreführend). Die § 36 VSBG-Angabe ist nur für Verbraucherverträge relevant ([Händlerbund](https://www.haendlerbund.de/de/leistungen/rechtssicherheit/hilfe-bei-abmahnung/abmahnung-os-link), [IHK Bayreuth](https://www.ihk.de/bayreuth/hauptnavigation/service/recht/allgemeine-rechtsthemen/anpassung-des-internet-impressums-erforderlich--6512524)).
- Kein „§ 5 TMG“ mehr zitieren. Gesetzesnennung ist ohnehin nicht nötig.
- Erreichbar mit max. 2 Klicks: Footer-Link „Impressum“ auf jeder Seite, auch im Funnel.

**Datenschutzerklärung** (Art. 13 DSGVO) – Abschnitte für diesen Stack:
Verantwortlicher · Hosting Vercel (Logs, CDN, DPF/SCC) · Anfrage-Funnel & Brevo-CRM (Zwecke, Rechtsgrundlage lit. b/f, Speicherdauer) · Transaktions-E-Mails · Terminbuchung (Brevo Meetings/zeeg, nach Klick auf den Link) · Vercel Web Analytics (cookielos, lit. f) · ALTCHA/Honeypot · WhatsApp- und Telefon-Kontakt · selbst gehostete Videos & Schriften · ggf. Newsletter (DOI, Widerruf) · Social-Media-Profile (nur Links) · Betroffenenrechte, Beschwerderecht · Verweis auf **TDDDG** (nicht mehr „TTDSG“).

**Bildrechte & Einwilligungen bei Videos mit Personen**

*a) Mitarbeitende der Kunden (z. B. Azubi im Handwerksbetrieb, Servicekraft im Restaurant):*
- Rechtlich verantwortlich ist primär **der Kunde als Arbeitgeber**. Die Einwilligung im Beschäftigungsverhältnis muss **schriftlich oder elektronisch** erfolgen (§ 26 Abs. 2 BDSG) und **freiwillig** sein. Wer ablehnt, darf keine Nachteile haben. Das BAG verlangt seit 2015 Schriftform für Mitarbeiter-Videos (8 AZR 1010/13). Eine zeitlich unbegrenzt erteilte Einwilligung **erlischt nicht automatisch mit dem Ausscheiden** (8 AZR 1011/13). Ob der Widerruf unter der DSGVO (Art. 7 Abs. 3: jederzeit) erleichtert ist, ist nicht abschließend geklärt. ([CMS](https://cms.law/de/deu/legal-updates/mitarbeiterfotos-im-netz-bag-will-es-schriftlich), [Osborne Clarke](https://www.osborneclarke.com/de/insights/unternehmen-darf-mit-bildern-von-gekundigtem-mitarbeiter-weiterwerben), [Dr. Datenschutz](https://www.dr-datenschutz.de/veroeffentlichung-von-mitarbeiterfotos-nur-mit-einwilligung/))
- **Praxis für SCM:**
  1. Im Vertrag: Der Kunde sichert zu, alle erforderlichen Einwilligungen seiner Mitarbeitenden einzuholen. SCM stellt dafür eine **Vorlage**.
  2. Die Vorlage nennt konkret: Zwecke (Social-Media-Kanäle des Kunden, Website, **bezahlte Anzeigen**, **Referenz-/Portfolio-Nutzung durch SCM Creatives**), Plattformen (auch Drittland-Hinweis: Meta/TikTok/Google), Dauer, Widerrufsfolgen (keine Pflicht zur Löschung bereits veröffentlichter Posts Dritter, aber Entfernung aus eigenen Kanälen im Rahmen des Möglichen).
  3. Unterschriebene Einwilligungen (Papier oder E-Signatur) **vor dem Dreh einsammeln** und im Notion-Kundenordner ablegen.
  4. Wer nicht einwilligt: nicht erkennbar filmen oder nachträglich herausschneiden.
- **Gäste/Passanten** (Restaurant, Baustelle): Personen als bloßes „Beiwerk“ (§ 23 Abs. 1 Nr. 2 KUG) sind ein unsicherer Graubereich. Besser: Drehzeiten außerhalb der Öffnungszeiten, Hinweisschild beim Dreh, erkennbare Gäste nur mit Einwilligung, Gesichter sonst unscharf/außer Fokus.
- **Makler-Objekte:** Zustimmung von Eigentümer/Mieter zum Dreh. Keine privaten Fotos, Dokumente, Kennzeichen oder Hausnummern ohne Freigabe im Bild.
- **Musik:** Für Unternehmens-Accounts nur lizenzierte bzw. kommerziell freigegebene Musik verwenden (z. B. Commercial-Music-Libraries der Plattformen oder Stock-Lizenzen). Das im Vertrag regeln.
- **Nutzungsrechte am Video:** Im Vertrag klar regeln, welche Rechte der Kunde erhält (Plattformen, Dauer, Ads, Bearbeitung) und dass **SCM die Videos als Referenz auf Website/Social zeigen darf** (mit Widerspruchsmöglichkeit des Kunden). Ohne diese Klausel und die passenden Personen-Einwilligungen dürfen Kundenvideos nicht in die SCM-Galerie.

---

# Lead-to-Kunde – Ablaufgrafik

```
 ┌─────────────────────────────── AUFMERKSAMKEIT ───────────────────────────────┐
 │ Instagram/TikTok-Profil · Google-Profil · Empfehlung · Local SEO · Ads        │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         ▼
 ┌──────────────────────────── WEBSITE (mobile-first) ──────────────────────────┐
 │ Branchen-Landingpage → Reels-Galerie → Cases → „So arbeiten wir“ → FAQ        │
 │ Sticky-Bar:  [ Anfrage starten ]   [ WhatsApp ]   [ Anrufen ]                 │
 └──────────┬────────────────────────────┬──────────────────────────┬────────────┘
            ▼                            ▼                          ▼
   QUIZ-FUNNEL (5 Schritte)      WhatsApp (wa.me)              Telefon (tel:)
   Branche→Ziel→Umfang/Budget    manuell als Kontakt +         manuell als Kontakt +
   →Start/PLZ→Kontakt            Deal in Brevo anlegen         Deal in Brevo anlegen
            │                            └─────────────┬────────────┘
            ▼                                          │
   Vercel Function (fra1): Validierung · Honeypot · ALTCHA · SCORE
            │                                          │
            ▼                                          ▼
 ┌──────────────────────────────── BREVO CRM ────────────────────────────────────┐
 │ Kontakt + Deal „Neue Anfrage“ + Notiz + Aufgabe (A: 1 h · B: 4 h · C: 24 h)   │
 │ Mail an Lead (Bestätigung + Terminlink)   ·   Mail/Push an Team ([A]/[B]/[C]) │
 └──────────┬───────────────────────────────┬────────────────────────────────────┘
            ▼                               ▼
   A/B: Danke-Seite mit TERMINLINK   C: Danke-Seite mit Reels + Paketinfo
   (Brevo Meetings/zeeg, neuer Tab)     → Kontakt innerhalb 24 h per E-Mail
            │                               │
            ▼                               ▼
   ERSTGESPRÄCH (20–30 Min.)  ◄──── kein Termin? T+1 Anruf/WA · T+3 Case-Mail · T+7 letzte Mail
            │                                                      └─► Stopp (Newsletter nur mit DOI)
            ▼
   ANGEBOT ≤ 48 h (Lexware/sevdesk, 3 Pakete) ── Nachfassen T+3 / T+10 ──► VERLOREN (Grund erfassen)
            │
            ▼
   VERTRAG + AGB + Nutzungsrechte + Einwilligungsvorlagen (Yousign)  ──► Deal „Gewonnen“
            │
 ═══════════╪════════════════ PIPELINE „KUNDENBETREUUNG“ ═════════════════════════
            ▼
   ONBOARDING/KICKOFF (Notion-Kundenportal, Zugänge, Ziele/KPIs)
            ▼
   SKRIPTE (Hook→Problem→Lösung→Proof→CTA) ──► Freigabe durch Kunden (Notion)
            ▼
   DREHTAG (Call-Sheet · Shotlist · Einwilligungen unterschrieben)
            ▼
   SCHNITT ──► FEEDBACK in Frame.io (2 Runden) ──► FREIGABE
            ▼
   VERÖFFENTLICHUNG (Redaktionsplan, Captions, Untertitel)
            ▼
   MONATS-REPORTING (Views · Watchtime · Anfragen/Bewerbungen · 3 Learnings)
            ▼
   T+30–45: Bitte um Google-Bewertung + Video-Testimonial (ohne Anreize)
            ▼
   T–30 vor Laufzeitende: Quartals-Review ──► VERLÄNGERUNG / UPSELL ──┐
            ▲                                                         │
            └───────────────────── nächster Zyklus (Skripte) ◄────────┘
```

---

# Konkrete Stack-Empfehlung inkl. Kosten

### Kern (Website + Leads) – ab Tag 1
| Baustein | Tool | Kosten/Monat (netto) |
|---|---|---|
| Hosting/Functions/CDN | Vercel Pro (1 Seat) | 20 $ (≈ 17–19 €). Enthält 20 $ Nutzungsguthaben, 1 TB Fast Data Transfer ([Vercel Pro](https://docs.vercel.com/docs/plans/pro-plan)). **Hobby ist für kommerzielle Seiten nicht zulässig** ([Fair Use](https://vercel.com/docs/limits/fair-use-guidelines)) |
| Formular/Funnel | Eigenbau (Vanilla JS) + Vercel Function | 0 € |
| Spam-Schutz | Honeypot + Zeitfalle + ALTCHA | 0 € |
| CRM + Transaktionsmails + Termin | Brevo Free (Sales-CRM, Meetings, 300 Mails/Tag) | 0 € |
| Analytics | Vercel Web Analytics (cookielos) | ≈ 0–1 $ (Events werden über das Pro-Guthaben abgerechnet, Preise variieren je nach Quelle ([Vercel Analytics Pricing](https://vercel.com/docs/analytics/pricing))) |
| Fonts/Videos | Self-hosted auf Vercel | 0 € |
| Reviews | Google-Unternehmensprofil, statisch eingebunden | 0 € |
| Domain | z. B. .de | ≈ 1 € |
| **Summe** | | **≈ 20 €/Monat** |

### Ausbau (empfohlen, sobald Kunden laufen)
| Baustein | Tool | Kosten/Monat |
|---|---|---|
| Newsletter/mehr Versand | Brevo Starter | ≈ 7–9 € |
| Analytics mit Funnels (statt Vercel WA) | Plausible | ≈ 9 € |
| Video-Review | Frame.io Pro | 15 $/Nutzer |
| Kundenportal/Projektmanagement | Notion Plus | ≈ 10–12 $/Nutzer |
| Angebote & Rechnungen | Lexware Office oder sevdesk | ≈ 8–25 € |
| E-Signatur | Yousign One (Free bei ≤ 2/Monat) | 0–9 € |
| Terminbuchung mit mehr Funktionen (optional statt Brevo Meetings) | zeeg Professional | ≈ 10 €/Nutzer |
| Video-CDN bei großer Bibliothek (optional) | Bunny Stream | ≈ 1–5 $ |
| Bewertungssiegel (optional) | ProvenExpert Basic | 29,99 € (jährl.) |
| **Summe für 2 Personen (ohne Optionen)** | | **≈ 90–130 €/Monat** |

### Upgrade-Pfade
- **Mehr Vertrieb:** Brevo CRM → Pipedrive Growth (39 €/Nutzer jährl.).
- **„Nur deutsche Anbieter“:** CentralStationCRM Team (24 €/3 Nutzer) + Brevo nur für Mails + zeeg.
- **Viel Spam trotz ALTCHA:** Friendly Captcha (DE) oder Vercel BotID.

---

# Top-Regeln kompakt

**5 wichtigste UX-Regeln**
1. **Daumenzone first:** Sticky-Bottom-Bar (Anfrage · WhatsApp · Anrufen), Tap-Ziele ≥ 48 px, Funnel mit großen Antwortkarten und einer Frage pro Screen.
2. **Video-first, aber schnell:** Poster-Bild als LCP, Videos `muted playsinline preload="none"` + IntersectionObserver, immer nur eins spielt, Ton nur per Klick. Ziele: LCP ≤ 2,5 s, CLS ≤ 0,1.
3. **Beweis direkt am CTA:** Branchen-gefilterte Reels mit Ergebniszahlen, Video-Testimonials und Google-Rating (mit Datum und Echtheitshinweis) neben jedem CTA.
4. **Branchen-Landingpages mit Message-Match** und vorausgefülltem Funnel (`?branche=…`), CTA alle ~2 Bildschirmhöhen, einfache Sprache.
5. **Unsicherheit abbauen:** Prozess in 5 Schritten mit „Ihr Aufwand“, „ab“-Preise/Pakete, FAQ zu Kamera-Scheu, Rechten und Laufzeit. Nach dem Absenden sofort Terminlink, Antwort auf A-Leads < 1 h.

**3 wichtigste Rechtspunkte**
1. **Keine Drittanbieter ohne Consent:** Videos und Fonts selbst hosten, YouTube/Instagram/Calendly nur als Link oder 2-Klick, cookielose Analyse. Dann ist **kein Cookie-Banner nötig**.
2. **Formular & CRM:** Art. 6 Abs. 1 lit. b DSGVO, **keine Pflicht-Checkbox**, Datenschutzhinweis am Button, AVVs (Vercel, Brevo), Löschfristen. Follow-ups nur anfragebezogen, Newsletter nur mit DOI. Impressum nach **§ 5 DDG**, OS-Link entfernen.
3. **Personen & Bewertungen:** Schriftliche oder elektronische Einwilligungen aller Gefilmten (Mitarbeitende: § 26 Abs. 2 BDSG/KUG), einschließlich Portfolio-Nutzung durch SCM, vertraglich mit dem Kunden geregelt. Bewertungen mit **§ 5b Abs. 3 UWG-Echtheitshinweis**, ohne Anreize und ohne Review-Gating. **BFSG greift nicht** (B2B + Kleinstunternehmen), barrierearm bauen trotzdem.
