# Konkurrenzanalyse: Websites von Social-Media- und Kurzvideo-Agenturen (DACH)

**Für:** SCM Creatives (@scm.creatives): echte, nach Skript gedrehte Kurzvideos (Reels/TikTok/Shorts) für Gastronomie, Immobilien/Makler, Handwerk und Mittelstand
**Stand der Recherche:** 21.10.2026

---

## 0. Methodik und Einschränkungen (bitte zuerst lesen)

- **Seiten direkt öffnen ging nicht.** WebFetch brach bei allen Hosts mit einem DNS-Fehler ab (`getaddrinfo ENOTFOUND`, sogar bei example.com). Auch ein direkter Abruf per curl wurde von der Netzwerkrichtlinie der Umgebung blockiert (`connect_rejected`, z. B. für gastro-impact.de, diereelagentur.de, web.archive.org).
- **Woher die Angaben stammen:** aus **WebSearch-Indexauszügen**, die je Domain mit `allowed_domains` gefiltert wurden. Pro Agentur liefen 2 bis 4 gezielte Suchen, insgesamt rund 45. Diese Auszüge geben Seitentexte wieder: Titel, Überschriften, Preise, Prozess, FAQ und Fallstudien.
- **Was sich daraus nicht sicher sagen lässt:** rein visuelle bzw. UX-Merkmale wie Autoplay, Hochformat-Galerien, Layout, Hero-Video oder die einzelnen Formularfelder. Das ist im Folgenden jeweils als **„nicht ermittelbar"** markiert. Wo ein Auszug ein Merkmal ausdrücklich beschreibt (z. B. eingebettete Kundenvideos bei ROMO), ist das vermerkt.
- **Zitate:** Text in „…" ist wörtlich aus dem Suchauszug übernommen. Alles andere ist sinngemäß wiedergegeben.
- **Eigenangaben:** Alle Zahlen (Views, Anfragen, Einstellungen, Bewertungen) sind **Eigenangaben der Agenturen** und wurden nicht unabhängig geprüft. Widersprüche zwischen Unterseiten derselben Agentur sind vermerkt.
- **Empfehlung vor dem Design:** die 5 Top-Wettbewerber (siehe Kapitel 3.1) einmal manuell im Browser auf dem Handy durchklicken (Hero, Videogalerie, Funnel), um die visuellen Punkte zu ergänzen.

---

## 1. Übersicht der 15 Kern-Wettbewerber

| # | Agentur | URL | Segment | Preis-Transparenz | Skript sichtbar? | Stärkster Beleg | Conversion |
|---|---|---|---|---|---|---|---|
| A1 | Gastronomie123 | https://gastronomie123.de/ | Gastro | „ab 499 €/Monat" + Paketnamen | nein | „900M+" Views (Eigenangabe) | Kostenloser Strategie-Call, kostenloses Self-Service-Tool |
| A2 | GastroImpact | https://www.gastro-impact.de/ | Gastro (Hamburg) | keine | nein | keiner gefunden | Kostenloses Erstgespräch, Antwort innerhalb von 12 h |
| A3 | Len Digital | https://len-digital.de/social-media | Gastro (Gera) | **voll transparent** (490/890/1.490 €) | Redaktionsplan-Freigabe | Ehrlichkeitsblock „was nicht zugesagt wird" | Projekt anfragen, Erstgespräch, Telefon |
| A4 | Sparkful Media | https://www.sparkful.media/social-media-fuer-gastronomie | Gastro + Handwerk (NRW) | „ab 1.190 €" bzw. Spanne 1.190–4.990 € | ja (Skripting, Teleprompter-Skripte*) | Kundennamen ohne Zahlen | „Kostenloses Erstgespräch buchen" |
| B1 | Drilon Productions | https://drilon-production.de/ | Makler (DACH) | keine („keine vorgefertigten Pakete") | **ja** (Skripte 2 Tage vor dem Dreh, Teleprompter) | 30 Reels/Monat, 90-Tage-Projektion | Strategiegespräch |
| B2 | Tobias Wittmann | https://tobiaswittmann.de/ | Makler (DACH) | transparent, aber widersprüchlich | teils | 5/5 Google (19–21 Bewertungen) | 15-Min-Erstgespräch, kostenloser Content-Plan |
| B3 | Maurice Veith (MV Media) | https://maurice-veith.com/social-media-immobilienmakler | Makler (Stuttgart/Ulm) | **voll transparent** (290 €, 299 €, 490 €, 1.190 € …) | ja (im Monatspaket) | Rechts-FAQ, 300+ Objekte | Anfrage |
| B4 | ImmoReels | https://www.immoreels.net/ | Makler (Rhein-Neckar) | keine | Konzeption erwähnt | keiner gefunden | „Jetzt Termin Buchen" |
| C1 | Agentur Ausdruckslos | https://www.ausdruckslos.de/recruiting-handwerk/ | Handwerk/Recruiting | teilweise „ab" (Recruitingfilm ab 4.500 €) | nein | **harte Recruiting-Cases**, „Mitarbeitende statt KI" | 15-Min-Telefonat |
| C2 | Social Lift | https://sociallift.media/ | Handwerk/lokal (Ortenau) | **Spannen + eigene Preisseite** | Themenentwicklung | Zimmerei: 4 Einstellungen in 2,5 Monaten | Kostenloses 30-Min-Gespräch (Telefon oder vor Ort) |
| C3 | SocialNatives | https://socialnatives.de/mitarbeitergewinnung-im-handwerk/ | Handwerk/Mittelstand-Recruiting | Festpreis 5.000 €/Stelle | nein | HR-Testimonials (Sana, Edeka), Einstellungszahlen | Kostenloser Recruiting-Check |
| C4 | OWL Vision Media | https://owl-vision-media.de/unsere-leistungen/social-media-fuer-handwerksbetriebe/ | Handwerk (Bielefeld) | **voll transparent** (479–3.579 €) | nein | „300+ Projekte" (Web) | „In 60 Sekunden zum Angebot" |
| D1 | Catapult Content | https://www.catapult-content.de/ | Benchmark Short-Form | keine | Hooks und Formate (System) | 200 Mio. Views, Bäcker-Case | Kostenloses Strategiegespräch |
| D2 | FUTRIZE | https://futrize.com/ | Benchmark Short-Form | **sehr transparent** (Testmonat 990 €, Abo ~2.000–3.000 €) | **ja** (bis zu 30 „datenbasierte Skripte", Teleprompter) | Förde Sparkasse: 9 Mio. Reichweite; eigener Account als Beleg | Testmonat, Freigabe per Handy |
| D3 | ROMO Marketing | https://romomarketing.de/ | Benchmark lokal (Stuttgart), u. a. Restaurants | Pakete ohne Preis | **ja** (Skript, Freigabe, Dreh) | eingebettete Kundenvideos | Kostenloses Erstgespräch |

\* Teleprompter-Skripte bei Sparkful tauchten nur in einem von zwei Suchauszügen auf.

**Zusätzlich gesichtet (Kurzprofile in Abschnitt 2.5):** Die Reel Agentur, wivid, JS Media, The Brand Content, imagetown, Leisure.one sowie KI-Anbieter als indirekte Konkurrenz.

---

## 2. Agentur-Profile

### 2.1 Gastronomie / Hotellerie

#### A1 · Gastronomie123
- **URLs:** https://gastronomie123.de/ · https://gastronomie123.de/social-media-marketing-restaurant · https://gastronomie123.de/restaurant-marketing-koeln · https://gastronomie123.de/shop · https://gastronomie123.de/influencer-katalog · https://gastronomie123.de/mehr-gaeste-im-restaurant
- **Claim (wörtlich, Seitentitel):** „Gastronomie123 - Nr. 1 Marketing Agentur für Restaurants". Auf der Startseite steht sinngemäß „Nr. 1 Marketing-Agentur für Restaurants in Deutschland", mit Leistungen von „Social Media, Reels, Websites und mehr". Die Gründer stellen sich selbst als Gastronomen vor.
- **Zielgruppen:** Restaurants, Cafés, Bars, Pizzerien, Steakhäuser, Hotels, Lieferdienste, Foodtrucks, Bäckereien und Eisdielen in DACH.
- **Hero:** Headline entspricht dem „Nr. 1"-Claim. CTA ist ein kostenloser Strategie-Call. Auf der Social-Media-Unterseite steht der CTA „Kostenlose Strategie in 24h". Ob im Hero ein Video oder ein Bild läuft, war nicht ermittelbar.
- **Struktur/Navigation:** Menüpunkt „Erfolgs-Stories", Shop (Bewertungskarten, Food-Fotografie, Websites, digitale Speisekarten), Influencer-Katalog („Food Creator & Influencer finden"), Städte-Landingpages (z. B. Köln), Ratgeber („Wie bekomme ich mehr Gäste in mein Restaurant? 25 Maßnahmen") und FAQ.
- **Angebot:** „…übernehmen wir alles – von der Content-Strategie über die Produktion von Viral Reels bis hin zum Community Management." Dazu Influencer-Kooperationen.
- **Preise:** „Unsere Marketing-Pakete für Restaurants starten bei 499 €/Monat. Das Self-Service Growth OS ist kostenlos verfügbar." In den strukturierten Daten der Köln-Seite stehen drei Pakete: **PRÄSENZ 499 €**, **INS GESPRÄCH 1.500 €** und **STADTGESPRÄCH 3.000 €**. Was die Pakete enthalten, war nicht ermittelbar. Laut Blog liegt ein typisches Budget bei „500–1.500 €/Monat".
- **Prozess:** „Im kostenlosen 15-Minuten-Call analysieren wir deinen Status quo und priorisieren die nächsten 3 Schritte für dich."
- **Social Proof:** „900M+" Views (Eigenangabe). Laut FAQ zeigen sich erste messbare Ergebnisse „typischerweise innerhalb von 4–6 Wochen". Die Inhalte der Erfolgs-Stories-Seite und Testimonials tauchten in den Auszügen nicht auf.
- **Videos auf der Seite:** nicht ermittelbar.
- **Conversion:** Strategie-Call („Ein unverbindliches Erstgespräch ist immer kostenfrei"). Dazu kommt das kostenlose Self-Service-Tool „Growth OS" als Einstieg mit wenig Verbindlichkeit (Lead-Magnet).
- **Lead-Qualifizierung:** In den Auszügen war kein Formular zu finden, also nicht ermittelbar.
- **FAQ:** vorhanden (Kosten, Zeit bis zum Ergebnis).
- **Auffällige Muster:** Die Pakete sind produktisiert und tragen Gastro-Namen (Präsenz, Ins Gespräch, Stadtgespräch), die sich gut merken lassen. Die Agentur baut ein Ökosystem aus Shop, Creator-Katalog, Tool und Ratgeber.
- **Schwächen:** Der Superlativ „Nr. 1" ist unbelegt, und Fallstudien sind nicht sichtbar. Die Agentur deckt sehr viel ab (Website, Shop, Bewertungskarten), dadurch ist Video nur ein Baustein. „Viral Reels" ist ein Versprechen ohne erklärte Methodik.

#### A2 · GastroImpact
- **URL:** https://www.gastro-impact.de/ (One-Pager)
- **Claim/Hero (wörtlich):** Headline „Mehr Gäste durch besseren Content", Tagline „Social Media Content, der Gäste bringt."
- **Zielgruppen:** Hotels, Restaurants, Bistros und Cafés in Hamburg und Umgebung.
- **Angebot:** „Professionelle Reels & Shorts für Instagram, TikTok und Facebook – direkt in deinem Restaurant gedreht". Dazu Food-Fotografie, Social-Media-Betreuung, Content-Planung, Instagram Reels und TikTok-Content. Technisch nennt die Seite 4K-Aufnahmen, moderne Kameratechnik, professionelles Licht und **„KI-gestützte Postproduktion"**.
- **Preise:** keine.
- **Prozess:** Beschrieben ist nur der erste Schritt, ein kostenloses Erstgespräch.
- **Social Proof:** In einem Auszug stand „50+ zufriedene Kunden", ein zweiter Auszug bestätigte das nicht. Testimonials oder Fallstudien wurden nicht gefunden.
- **Videos auf der Seite:** nicht ermittelbar.
- **Conversion:** Kostenloses, unverbindliches Erstgespräch, Antwort innerhalb von 12 Stunden. Dazu E-Mail und Telefon.
- **Lead-Qualifizierung / FAQ:** nicht ermittelbar bzw. nicht gefunden.
- **Auffällige Muster:** Das Reaktionszeit-Versprechen (12 h) ist ein einfacher Vertrauensbaustein. Die Headline ist ergebnisorientiert und spricht von Gästen statt von Content.
- **Schwächen:** Die Seite argumentiert über Technik-Daten (4K) statt über Ergebnisse. Es gibt keine Preise und keine Belege. **Dass die Agentur mit KI-gestützter Postproduktion wirbt, eröffnet SCM die Chance, sich klar über „echt" abzugrenzen.**

#### A3 · Len Digital
- **URLs:** https://len-digital.de/social-media · https://len-digital.de/ · https://len-digital.de/kontakt (dazu Unterseiten zu Fotografie, Google Business, Speisekarte, Interior und Lieferando)
- **Positionierung (Titel der Startseite):** „Digitalisierung für Gastronomie: Website & Abläufe". Die Agentur sitzt in Gera und stellt den Inhaber namentlich vor.
- **Zielgruppen:** Restaurants (es gibt eine eigene Unterseite für asiatische Gastronomie).
- **Angebot und Preise (voll transparent, netto pro Monat, 3 Monate Mindestlaufzeit, danach monatlich kündbar):**
  - **Starter, 490 €:** 8 Feed-Beiträge pro Monat, Basis-Community-Management, Redaktionsplan und Mini-Reporting. Ein Content-Shooting vor Ort gibt es als Add-on ab 590 €.
  - **Wachstum, 890 €:** 12 Feed-Beiträge plus **4 Reels**, tägliche Stories, Hashtag-Strategie und SEO sowie eine Influencer-Kooperation pro Quartal.
  - **Full Focus, 1.490 €:** täglicher Content, Influencer-Management, Ads-Setup und -Betreuung, wöchentliche Calls sowie ein Shooting pro Monat.
  - Das Werbebudget (empfohlen ab 300 €/Monat) zahlt der Kunde direkt an Meta.
- **Prozess (monatlich):** Content-Säulen und Ziele festlegen → Redaktionsplan zur Freigabe („…es wird nur veröffentlicht, was Sie genehmigt haben") → Produktion → Veröffentlichung inklusive Antworten auf Kommentare und Rezensionen → Monatsbericht.
- **Social Proof:** In den Auszügen nicht gefunden.
- **Videos auf der Seite:** nicht ermittelbar.
- **Conversion:** „Projekt anfragen" (Kontaktseite), kostenloses Erstgespräch, Telefonnummer des Inhabers.
- **Auffällige Muster:** ein eigener **„Was nicht zugesagt wird"-Block**: keine Garantie auf Reichweite, Follower, Reservierungen oder Umsatz. Das ist ehrliches Erwartungsmanagement und schafft Vertrauen. Dazu kommt eine sehr klare Paket-Tabelle.
- **Schwächen:** Reels gibt es erst ab dem zweiten Paket, und der Fokus liegt auf Feed-Posts. Das Shooting ist im Basispreis nicht enthalten. Video-Belege waren nicht sichtbar bzw. nicht ermittelbar.

#### A4 · Sparkful Media
- **URLs:** https://www.sparkful.media/social-media-fuer-gastronomie · https://www.sparkful.media/ · https://www.sparkful.media/social-media-agentur-f%C3%BCrs-handwerk · zahlreiche Stadtseiten (Dortmund, Düsseldorf, Köln, Hamburg, München, Essen u. a.)
- **Claim (Seitentitel der Startseite):** „SPARKFUL Media - Deutschlands einfachster Social Media Service".
- **Zielgruppen:** Restaurants, Bars und Cafés (Sitz in NRW, Kunden deutschlandweit), dazu Handwerksbetriebe über eine eigene Branchenseite.
- **Angebot:** Videos und Fotos direkt im Betrieb, etwa Einblicke in die Küche, Cocktail-Zubereitung, Event-Abende und Team-Momente. Die Seite setzt auf Storytelling statt klassischer Werbung und verknüpft das mit Google Maps und Local SEO.
- **Prozess:** Erstgespräch → Konzept (standardisiertes Interview, Designvorschläge, geplante Posts) → Vorbereitung (Skripting, Themenplanung, Zielabstimmung) → Shooting Day → Schnitt, Farbkorrektur, Untertitel und Captions → Posting → monatlicher Content-Call. Am Set gibt es Anleitung, damit sich Kunden vor der Kamera wohler fühlen. „Teleprompter-Skripte mit Hooks und CTA-Ideen" standen nur in einem Auszug.
- **Preise („ab"):** Gastro „ab 1190€ zzgl. Mwst" für 4 Videos und 4 Grafiken pro Monat, Handwerk „ab 1990€" für 8 Videos und 8 Grafiken. In der FAQ heißt es: „Kundinnen und Kunden investieren meist zwischen 1190€ und 4.990 € netto pro Monat". Ein Blogartikel nennt dagegen „ca. 1.800 €/Monat". Die Retainer laufen in der Regel 12 Monate.
- **Social Proof:** Kundennamen ohne Zahlen: Kaiser Schlips und Zum Schlips (Dortmund), Pure Oelde (Rooftop Bar, Pure Club), muto Heimatgastronomie, Red Bowl Oelde. Ein Google-Bewertungs-Element war nur als leeres Seitenelement erkennbar.
- **Videos auf der Seite:** nicht ermittelbar.
- **Conversion:** „Kostenloses Erstgespräch buchen".
- **FAQ:** „Häufig gestellte Fragen" auf den Stadtseiten (Kosten, Ablauf, Postingfrequenz).
- **Auffällige Muster:** Branchen-Landingpages für Gastro und Handwerk sowie ein großes Netz an SEO-Stadtseiten.
- **Schwächen:** Die Stadtseiten bestehen aus identischen Textbausteinen. Die Preise widersprechen sich zwischen Seiten, die Bindung von 12 Monaten ist lang, und Ergebniszahlen fehlen.

### 2.2 Immobilien / Makler

#### B1 · Drilon Productions
- **URLs:** https://drilon-production.de/ · https://www.drilon-production.de/impressum
- **Claim (wörtlich, Seitentitel/Headline):** „Werde die Makler-Adresse in deiner Region".
- **Zielgruppen:** Immobilienmakler in DACH. Sitz ist Berlin, gedreht wird laut Seite regelmäßig in München, Hamburg, Frankfurt, Köln, Zürich, Wien „und dazwischen".
- **Angebot:** **30 Reels pro Monat aus einem Drehtag von etwa 4 Stunden.** Skripte, Equipment, Schnitt und Upload kommen aus einer Hand, gepostet wird auf Instagram, TikTok, LinkedIn und YouTube Shorts. Die Skripte kommen zwei Tage vor dem Dreh, mit einer kurzen Skript-Durchsicht. Am Set gibt es Teleprompter bzw. „Souffleur" (nur in einem von zwei Auszügen erwähnt). Der Zeitaufwand für den Kunden liegt bei etwa einem halben Tag. YouTube-Longform und Podcast gibt es gegen Aufpreis.
- **Preise:** keine. „Vorgefertigte Pakete gibt es bei uns nicht." Im Strategiegespräch rechnet die Agentur vor, was der Kunde investiert und welche Reichweite in den ersten 90 Tagen realistisch ist.
- **Prozess:** Strategiegespräch → Skripte (2 Tage vorher) → Drehtag → Schnitt → Upload.
- **Social Proof:** „6+ Jahre", „300+ Produktionen", Trustpilot 4,4 (eine Trustpilot-Seite wurde nicht gefunden), Testimonials ohne Namen. Ergebnisversprechen: Das erste Reel bringt in den ersten zwei Wochen oft spürbar mehr Reichweite, Anfragen steigen ab Monat 3, und etwa „80 %" der Anfragen über Reels seien vorqualifiziert.
- **Videos auf der Seite / Lead-Qualifizierung / FAQ:** Eine FAQ ist vorhanden (u. a. zu Preisen). Videos und Formularfelder waren nicht ermittelbar.
- **Conversion:** Strategiegespräch.
- **Auffällige Muster:** Die Seite verspricht eine konkrete Menge (30 Reels) und beziffert den Aufwand des Kunden (halber Tag). Sie macht einen **zeitlichen Erwartungsplan** (2 Wochen, Monat 3, 90 Tage) und stellt den Skript-Prozess ausdrücklich dar. Dazu kommt eine klare Identität als Makler-Spezialist.
- **Schwächen:** Die Testimonials sind anonym und die Zahlen nicht belegt. Die Kontaktdaten sind uneinheitlich (Startseite info@…de, Impressum info@…com), und im Impressum steht ein Fotostudio. Es gibt keinerlei Preisanker.

#### B2 · Tobias Wittmann (TW Media & Consulting)
- **URLs:** https://tobiaswittmann.de/ · https://www.tobiaswittmann.de/immobilienvideo-muenchen/ · https://www.tobiaswittmann.de/videoschnitt-immobilien-schweiz/ · https://www.tobiaswittmann.de/ki-staging/ · Regionalseiten (Nürnberg, Esslingen)
- **Claim/Positionierung:** Seitentitel „Tobias Wittmann: Immobilienmarketing & Personal Branding". Ziel ist laut Startseite „eine Maklermarke, die Menschen kennen, mögen und weiterempfehlen". Video gilt dabei als Werkzeug, das eigentliche Produkt ist die Wahrnehmung des Maklers.
- **Zielgruppen:** Makler und Maklermarken in DACH (München/Oberbayern, Nürnberg, Esslingen/Stuttgart, Schweiz remote).
- **Angebot:** Objekt-Reels, Markt-Einordnung, Persönlichkeitsvideos, Fotos, Drohne, Grundriss und 360°-Rundgang. Dazu **KI-Staging** und „Cut Only": Der Makler filmt selbst per Smartphone nach Anleitung, Wittmann schneidet.
- **Preise (transparent, aber widersprüchlich):** **Kennenlern-Drehtag 1.790 € einmalig** (Video und Fotos für ein Objekt). Wachstums-Paket „ab 1.890 €" pro Monat (3 Monate, 3 Reels/Monat; 5 Reels für 2.590 €, 7 Reels für 3.290 €). Einzelvideo ab 590 €. Komplett-Paket Immobilienpräsentation ab 1.590 €. Premium ab 3.490 €. Cut Only ab 290 €/Video (Schweiz-Seite, ab 3 Videos) bzw. ab 790 € (Startseite). Ein anderer Auszug nennt die Stufen Visibility, Growth und Brand ab etwa 1.790 €.
- **Prozess:** Erstgespräch (Objekt, Zeitrahmen) → Drehtermin vor Ort → fertiges Video „innerhalb weniger Werktage".
- **Social Proof:** „5 / 5" Google-Sterne bei 19, 20 oder 21 Bewertungen (je nach Seite) und „86+ Projekte".
- **Videos auf der Seite:** nicht ermittelbar.
- **Conversion:** „Kostenloses Erstgespräch (15 Min)". **Lead-Magnet:** kostenloser Content-Plan für Makler.
- **Auffällige Muster:** Ein bezahlter Einstieg zum Festpreis (Kennenlern-Drehtag) ist ein guter Weg, das Risiko für Neukunden zu senken. Die Upgrade-Preise sind nach Reel-Anzahl gestaffelt. Personal Branding steht im Mittelpunkt, nicht das Objekt.
- **Schwächen:** Die Preise auf verschiedenen Seiten widersprechen sich, ebenso die Zahl der Bewertungen. Das Portfolio mischt Fotograf, Videograf und KI-Staging, dadurch verwischt das Profil, und KI ist Teil des Angebots.

#### B3 · Maurice Veith (MV Media)
- **URLs:** https://maurice-veith.com/social-media-immobilienmakler · https://maurice-veith.com/immobilienfotograf-stuttgart · https://maurice-veith.com/content-produktion · https://maurice-veith.com/projekt-bungalow-herrenberg
- **Positionierung:** Immobilienfotograf für Stuttgart und Ulm (Seitentitel „Immobilienfotograf Stuttgart — 48h Lieferung, faire Preise"). Reels laufen als Zusatz im selben Termin wie die Exposé-Fotos.
- **Angebot:** Objekt-Reel (20–35 Sek., auf Wunsch mit Drohnen-Einstieg) und Makler-Vorstellung (30–60 Sek., vor dem Objekt oder im Büro). Format 9:16, Untertitel fest im Bild. Ausdrücklich **kein** Community Management und keine Ads.
- **Preise (voll transparent, netto):** Makler-Vorstellungsclip 290 €. Objekt-Reel als Zusatz zum Fototermin **299 €**, einzeln 490 €. Monatspakete 1.190 € (inklusive Konzept und Skript, halber Drehtag), 1.999 € und 3.490 €.
- **Prozess:** 30–60 Minuten Mehraufwand vor Ort, Download-Link per E-Mail „in der Regel innerhalb von 48 Stunden".
- **FAQ (stark):** Zustimmung des Eigentümers: „Die Veröffentlichung von Innenaufnahmen einer fremden Wohnung … geht über den üblichen Vermarktungsauftrag hinaus", deshalb sollte sie schriftlich im Maklervertrag festgehalten werden. Datenschutz: Persönliche Gegenstände und Kennzeichen werden entfernt oder unkenntlich gemacht, Bewohner nur mit schriftlicher Einwilligung gefilmt.
- **Social Proof:** 300+ fotografierte Objekte. Referenzprojekte sind u. a. eine historische Villa in Stuttgart-Degerloch mit Drohnenüberflug und die Projektseite „Bungalow Herrenberg". Die Seite sagt offen, dass es noch keine Reichweitenzahlen gibt.
- **Videos auf der Seite / Conversion-Details:** nicht ermittelbar.
- **Auffällige Muster:** Eine Preisliste wie im Handwerk und eine rechtliche FAQ als Vertrauensbaustein.
- **Schwächen:** Die Seite ist im Kern eine Fotografen-Seite, Reels sind ein Zusatzverkauf. Es gibt keine Wachstums- oder Personal-Brand-Story.

#### B4 · ImmoReels (powered by ImmoPixels)
- **URLs:** https://www.immoreels.net/ · https://www.immoreels.net/immobilienvideo-mannheim/
- **Claim (wörtlich):** „Wir machen Makler sichtbar – emotional, authentisch und professionell."
- **Zielgruppen:** Makler, Bauträger und Immobilienunternehmen in Mannheim, Frankfurt, Darmstadt, Heidelberg, Ludwigshafen, Speyer und im Rhein-Neckar-Gebiet.
- **Angebot (wörtlich):** „Je nach Projekt übernehmen wir Konzeption, Drehplanung, Immobilienvideo, Drohnenaufnahmen, Instagram Reels, YouTube Shorts, Schnitt, Farbkorrektur, Musik, Untertitel und Branding." Geliefert wird im Hoch- und Querformat. Einsatzzwecke sind Objektvermarktung, Website, Imagekampagnen und Personal Branding.
- **Preise / Prozess / Social Proof / FAQ:** In den Auszügen nichts gefunden.
- **Conversion:** „Jetzt Termin Buchen". Dazu Orts-Landingpages.
- **Schwächen:** Die Seite bleibt generisch und liefert weder Preise noch Belege. Reels erscheinen als Leistungsliste, nicht als Strategie.

### 2.3 Handwerk / Mittelstand (inkl. Recruiting)

#### C1 · Agentur Ausdruckslos
- **URLs:** https://www.ausdruckslos.de/recruiting-handwerk/ · https://www.ausdruckslos.de/ · https://www.ausdruckslos.de/social-recruiting-kampagnen/ · https://www.ausdruckslos.de/portfolio/gloria/ · https://www.ausdruckslos.de/portfolio/blasius-schuster/ · https://www.ausdruckslos.de/portfolio/amodes/ · https://www.ausdruckslos.de/social-recruiting/social-recruiting-benchmark-2025/
- **Positionierung:** Seitentitel „Agentur Ausdruckslos: Social-Media-Kampagnen & Videoproduktion". Sitz Braunschweig, seit 2009, etwa 10 Mitarbeitende. Schwerpunkte sind Pflege/Gesundheit und Handwerk. **Als einzige Agentur im Sample positioniert sie sich ausdrücklich gegen KI:** Recruitingfilme zeigen „die eigenen Mitarbeiter*innen … statt KI-generiertem Material", denn „An austauschbaren Bildern scrollt man auf Social Media vorbei." Gedreht wird mit festangestelltem Team und eigener Technik.
- **Angebot:** Kampagnenkonzept, Foto- und Videoproduktion, Karriere-Website, Anzeigenschaltung und laufende Optimierung. Die Nutzungsrechte sind ausdrücklich geregelt (z. B. „uneingeschränkte Nutzungsrechte").
- **Preise (teils „ab"):** Recruitingfilm ab 4.500 €, Imagefilm ab 4.000 €, Fotoshooting im Schnitt 1.000–5.000 €. Social Recruiting kostet Agenturhonorar plus Werbebudget und wird individuell festgelegt.
- **Prozess:** 15-Minuten-Telefonat → Idee → sorgfältige Drehplanung → 1–2 Drehtage vor Ort → Kampagne → Optimierung.
- **Social Proof (stark, mit Zahlen):**
  - GLORIA Fahrzeugbau: 5 qualifizierte Fachkräfte in 4 Monaten. 2 Drehtage, 8 Ads auf Instagram und Facebook, die auf eine Karriereseite führen.
  - Blasius Schuster (Logistik): 107 Bewerbungen von LKW-Fahrern und 44 von Baumaschinenführern in einem Monat, im Schnitt 0,96 € pro Bewerbung.
  - Amodes: 2 humorvolle Recruitingvideos und 4 statische Anzeigen.
  - Städtisches Klinikum Braunschweig: Recruitingfilm für Hebammen.
- **Erwartungsmanagement:** eigener „Social Recruiting Benchmark 2025". Für Engpassberufe (Elektro, Dach, Zerspanung) rechnet er mit etwa 1 qualifizierten Bewerbung pro Woche, für Standardgewerke mit etwa 3.
- **Videos auf der Seite / FAQ / Formular:** Eine FAQ ist vorhanden (u. a. zum Ablauf). Videos und Formular waren nicht ermittelbar.
- **Conversion:** 15-Minuten-Telefonat.
- **Schwächen:** Der Fokus liegt auf Kampagnen und Recruiting, nicht auf laufendem Reel-Content. Das Leistungsspektrum ist breit (Erklärvideo, Imagefilm usw.).

#### C2 · Social Lift
- **URLs:** https://sociallift.media/ · https://sociallift.media/mitarbeiter-finden-handwerk/ · https://sociallift.media/preise/ · https://sociallift.media/leistungen/social-media-betreuung/ · https://sociallift.media/ueber-michael-hetzel/
- **Hero (wörtlich):** „Dein Name soll fallen, bevor jemand anfängt zu suchen". Seitentitel „Social-Media-Agentur Lahr & Ortenau: Content vom Drehtag".
- **Kernmodell (wörtlich):** „Ein Drehtag bei dir, daraus entsteht Content für zwei bis drei Monate. Wir entwickeln die Themen, drehen 4 bis 8 Stunden vor Ort und übernehmen Schnitt, Aufbereitung und Veröffentlichung."
- **Zielgruppen:** lokale Betriebe in Lahr und der Ortenau, vor allem Handwerk (Recruiting).
- **Preise (Spannen, mit eigener Preisseite „Was kostet eine Social-Media-Agentur?"):** laufende Betreuung 1.500–3.500 €/Monat. Werbeanzeigen ab 2.000 €/Monat plus Budget. Imagefilm 4.000–8.000 €. **Social Recruiting „ab 2.500 € im Monat, dazu kommt dein Werbebudget"**, inklusive Drehtag, Videos, Anzeigen, Zielseite und Auswertung.
- **Prozess:** Themen → 4–8 Stunden Dreh im laufenden Betrieb → Schnitt → regionale Ausspielung auf Instagram und Facebook, teils mit eigener Zielseite.
- **Social Proof:** Zimmerei Hellmuth: 4 Einstellungen in 2,5 Monaten, mit dem Hinweis „Ergebnis aus dieser Kampagne, keine Zusage". Erster Kunde war ein Fahrradladen, die Zusammenarbeit läuft seit mehr als 1,5 Jahren. Bewertungen wurden nicht gefunden.
- **Content-Muster:** Die Seite erklärt den Unterschied: Ein Recruitingvideo richtet sich an künftige Kollegen, ein Imagefilm an Kunden. Sie ordnet Social Recruiting als Ergänzung zur Stellenanzeige ein, nicht als Ersatz.
- **Conversion:** kostenloses Erstgespräch, 30 Minuten, telefonisch oder vor Ort.
- **Auffällige Muster:** eine eigene Seite über den Inhaber (Gesicht der Agentur), offene Preis-Spannen und ein Ergebnis mit Disclaimer.
- **Schwächen:** sehr regional, wenig Proof, Videos nicht ermittelbar.

#### C3 · SocialNatives
- **URLs:** https://socialnatives.de/mitarbeitergewinnung-im-handwerk/ · https://socialnatives.de/ · https://socialnatives.de/mitarbeitergewinnung-im-baugewerbe/ · https://socialnatives.de/ueber-uns/ · https://socialnatives.de/presse/
- **Claim (Seitentitel):** „Markenbildung für Recruiting & Kundengewinnung" bzw. „Personalgewinnung für den Mittelstand".
- **Modell:** eine Mischung aus Personalberatung und Social Recruiting. **„5.000 € Festpreis pro Stelle"**, die Erstbesetzung ist kostenlos, wenn der Kandidat aus dem Talentpool kommt, die zweite Stelle kostet 3.000 €. Als Vergleich nennt die Seite Headhunter mit 25–30 % des Jahresgehalts. Dazu kommt KI-gestütztes Talentpool-Matching in der Region.
- **Social Proof (stark):** Testimonials von HR-Mitarbeitenden (u. a. Sana Kliniken, Edeka). Thomas Rath GmbH (Malerbetrieb): 6 neue Mitarbeitende in 3 Monaten. Eine Mittelstandskundin: etwa 270 Bewerbungen und 5 Einstellungen in 6 Monaten, vorher „eher zwei Bewerbungen pro Jahr". Servicetechniker: 151 Bewerbungen, 5 Einstellungen. Dazu Gesamtzahlen wie „+3500 Einstellungen" und „1000+ zufriedene Partner", die anderen Seiten widersprechen (700 Unternehmen, 2.500 besetzte Stellen). Es gibt außerdem Presse- und Veranstaltungsseiten (HR Impulstag).
- **Conversion:** kostenloser, unverbindlicher Recruiting-Check.
- **Videos / FAQ:** nicht ermittelbar.
- **Schwächen:** Die Zahlen sind inkonsistent und einige Seiten veraltet. Video ist nur ein Mittel zum Zweck und kein Qualitätsversprechen.

#### C4 · OWL Vision Media
- **URLs:** https://owl-vision-media.de/unsere-leistungen/social-media-fuer-handwerksbetriebe/ · https://owl-vision-media.de/angebot/ · https://owl-vision-media.de/
- **Positionierung:** Werbe- und Webagentur aus Bielefeld (Webdesign mit „300+ Projekten") für Handwerk und Industrie.
- **Preise (voll transparent, netto):** **479 €/Monat** (Starter, 24 Monate Laufzeit) bis **3.579 €/Monat** (All-In, 3 Monate Laufzeit). Wählbar sind 3, 12 oder 24 Monate, eine längere Laufzeit macht den Monat günstiger. Einmalige Setup-Gebühr 299 €.
  - **Starter:** Der Betrieb liefert Fotos und Videos selbst, bis zu 6 Posts, 3 professionelle Fotobegleitungen pro Jahr.
  - **Booster:** monatlicher Contentdrehtag (bis zu 5 Stunden).
  - **All-In:** bis zu 12 Posts, Community Management und eine Mitarbeiterschulung.
- **Prozess:** Analyse des bestehenden Profils → Strategie und Contentkalender → Dreh, Schnitt, Posting.
- **Conversion:** Seite „Angebot einholen" mit dem Versprechen **„In 60 Sekunden zum Angebot"**. Das deutet auf einen mehrstufigen Funnel hin, die Felder waren aber nicht ermittelbar.
- **Social Proof / Videos:** nicht ermittelbar.
- **Schwächen:** Social Media ist eine von vielen Leistungen (der Schwerpunkt liegt auf Web). Die 24-Monats-Bindung im günstigsten Paket wirkt wie ein Lock-in. Im Starter-Paket filmt der Kunde selbst.

### 2.4 Benchmarks: allgemeine Kurzvideo-/Content-Agenturen

#### D1 · Catapult Content
- **URLs:** https://www.catapult-content.de/ · https://www.catapult-content.de/agentur · https://www.catapult-content.de/mitarbeitergewinnung · https://www.catapult-content.de/brand-building · https://www.catapult-content.de/social-media-agentur/nuernberg · https://www.catapult-content.de/blog/die-besten-social-media-agenturen
- **Claim (Seitentitel):** „Social Media Agentur für Reichweite" bzw. „Social Media Agentur für messbare Ergebnisse". Sitz Nürnberg und Neumarkt, „Deutschlandweit aktiv".
- **Positionierung (wörtlich):** keine „zufälligen Einzelposts", sondern „klare Content-Systeme: Zielgruppenanalyse, starke Hooks, wiederkehrende Formate, Produktion, Distribution und datenbasierte Optimierung". Die Agentur verbindet „Strategie, Daten und Content-Produktion zu einem System, das Reichweite in Ergebnisse übersetzt".
- **Angebot:** Short-Form für TikTok, Reels und Shorts. Dazu Brand Building, Mitarbeitergewinnung (mit „Talentpool-System"), Stadtseiten (München, Regensburg, Ingolstadt, Neumarkt, Nürnberg) und ein Blog zu Kosten und Plattformwahl.
- **Preise:** keine. Die Kosten richten sich nach Ziel und Umfang und werden im kostenlosen Strategiegespräch besprochen. Ein Blogartikel nennt für einfache Betreuung den „unteren vierstelligen" Monatsbereich. Die Agentur verspricht „Garantien je nach Zusammenarbeit".
- **Prozess:** kostenloses Erstgespräch (Analyse) → klarer Plan, transparente Konditionen, definierte Ziele.
- **Social Proof:** eine Zahlenwand mit „200 Mio. Views" (an anderer Stelle 155 Mio.), „+15.000 Anfragen", „35+ Marken" und „80+ Kampagnen". Als Case **Der Bäcker Feihl**: 11.000+ neue Follower, 35 Mio. Views und mehr Umsatz. Ein „Top 10"-Ranking im eigenen Blog setzt Catapult auf Platz 1, das ist Eigenwerbung. Ein externes Ranking (soenkesproll.de) sieht sie ebenfalls auf Platz 1.
- **Videos / FAQ / Formular:** nicht ermittelbar.
- **Auffällige Muster:** Die Seite spricht in Systemen und Formaten, rechnet Ergebnisse in Anfragen statt nur in Views und zeigt einen lokalen Betrieb als Hero-Case (Bäckerei), was für Gastro direkt übertragbar ist.
- **Schwächen:** Das Ranking ist selbst gemacht, die Zahlen schwanken, und Preisanker fehlen.

#### D2 · FUTRIZE
- **URLs:** https://futrize.com/ · https://futrize.com/social-media-agentur-hamburg/ · https://futrize.com/services/social-media-agentur-neumunster/ · https://futrize.com/personal-branding-agentur/ · https://futrize.com/referenzen/ · https://futrize.com/wissen/social-media-agentur-preise/
- **Hero (wörtlich, Hamburg-Seite):** „Kurzvideos für mehr Anfragen, als Hamburg Regentage hat." Seitentitel: „Social Media Agentur Hamburg - Kunden und Bewerber per Video". Jedes Video bekommt eine Aufgabe: Anfragen, Bewerbungen oder Bekanntheit.
- **Produkt:** „Unser Kernprodukt ist das DCS Growth System für datenbasiertes Kurzvideo-Wachstum auf Instagram, TikTok und YouTube Shorts." Im „DCS Studio" bekommt der Kunde fertige Skripte, spricht sie in eigenen Worten und lädt das Material hoch. Alternativ gibt es Content Days vor Ort mit Teleprompter.
- **Preise (sehr transparent, aber je Seite verschieden):** **Testmonat 990 € einmalig, ohne Vertragsbindung.** Er umfasst Branchenanalyse, „bis zu 30 datenbasierte Skripte", erste fertige Videos, Studio-Zugang, 1:1-Slack-Support und einen Report. Das Abo mit „rund 15 Videos im Monat" kostet ab etwa 2.000 € (Kunde dreht selbst) bis etwa 3.000 € (FUTRIZE kommt zum Dreh). Die Neumünster-Seite nennt 2.790 €/Monat für 15 Kurzvideos mit „Unlimited datenbasierte Skripte". Ein Content Day vor Ort kostet 1.490 €. Dazu kommen SEO-Preisartikel („Social Media Agentur Preise 2026: 800 bis 15.000 €", „Was kostet ein 30-Sekunden-Video 2026?").
- **Prozess:** Skripte werden vorher abgestimmt → Content Day (der Kunde ist „ein paar Stunden dabei") → **Freigabe per Handy: „anschauen, Daumen hoch, fertig."** Der Testmonat ist in Phasen gegliedert (Tag 1–5 Branchenanalyse usw.).
- **Social Proof:** Förde Sparkasse: 9 Mio. Reichweite auf TikTok in 12 Monaten, dazu das Zitat „Preis-Leistung ist hier wirklich unschlagbar …". Weitere Kunden sind THORNAR AG und FRIES Holz und Boden. Der **eigene Account @ambastious** ging laut Seite in 5 Monaten von 0 auf 1,4 Mio. Reach und dient so als Beleg am eigenen Kanal.
- **Videos auf der Seite:** nicht ermittelbar.
- **Auffällige Muster:** ein bezahlter Testmonat als Einstieg, Skripte als zählbares Liefer-Objekt („30 Skripte") und eine sehr reibungsarme Freigabe. Dazu kommt Preis-Content für SEO.
- **Schwächen:** Die Preisangaben sind zwischen den Seiten inkonsistent, die Marke vermischt Werbeagentur, Web und Video, und es gibt viele SEO-Stadtseiten.

#### D3 · ROMO Marketing
- **URL:** https://romomarketing.de/ (One-Pager, Sitz Waldenbuch, für Stuttgart und Böblingen)
- **Hero (wörtlich):** „Social Media Agentur · Stuttgart & Böblingen" und „Content, der bewegt." Darunter der Hinweis auf Reels und Kurzvideos für Unternehmen in der Region.
- **Zielgruppen:** „Restaurants, Läden und Studios" in Stuttgart, Böblingen, Sindelfingen, Leinfelden-Echterdingen, Filderstadt, Tübingen, Herrenberg und Umgebung.
- **Pakete (ohne Preis):** **Starter** mit 4 Videos und 1 Drehtag, **Growth** mit 8 Videos und 2 Drehtagen, **Pro** mit 12 Videos und 3 Drehtagen. Alle Pakete enthalten Skript, Drehtag, Schnitt und Thumbnails. „Du brauchst nur einen Drehtag pro vier Videos." Zum Preis heißt es: „Den Preis rechnen wir dir im Erstgespräch passend zu deinem Umfang aus".
- **Prozess (3 Schritte):** kostenloses, unverbindliches Erstgespräch → Videoideen und **Skripte, die der Kunde vor dem Dreh freigibt** → Drehtag vor Ort mit mehreren Videos.
- **Videos auf der Seite:** **eingebettete Kurzvideos mit Kundenbeispielen**, u. a. vom Restaurant „Lucky am Markt" (Leinfelden) und einem Fußballkindergarten. In einem Beispiel erklärt eine Mitarbeiterin vor der Kamera, „warum Tapas glücklich machen". Ob die Videos automatisch abspielen oder im Hochformat gezeigt werden, war nicht ermittelbar.
- **Social Proof / FAQ:** keine Bewertungen, kein FAQ-Abschnitt gefunden.
- **Einordnung:** **Dies ist der Anbieter, der dem Modell von SCM Creatives am nächsten kommt** (Skript, Freigabe, Dreh, Gastro als Zielgruppe). Er zeigt Beispiele, belegt aber keine Ergebnisse, nennt keine Preise und hat keine Branchenseiten.

### 2.5 Weitere gesichtete Anbieter (Kurzprofile)

- **Die Reel Agentur**, https://www.diereelagentur.de/: „Wir erstellen detaillierte Wort-für-Wort-Skripte, um eine klare Struktur, Konsistenz und effiziente Produktion zu gewährleisten." „Ein Drehtag ergibt 2-3 Monate Content." Der Erstkontakt ist ein etwa 15-minütiges Telefonat, für das der Geschäftsführer vorab ein kostenloses Konzept erstellt. Als Beleg: „Im Durchschnitt > 11.000 Views pro Kurzvideo. Entspricht circa 200€ Werbeausgaben." **Die Agentur übersetzt Views in einen Gegenwert in Werbe-Euro**, ein gutes Muster. Preise und Referenzen wurden nicht gefunden.
- **wivid**, https://wivid.de/: Content Day „ab 5.000 € netto" mit Konzept, Skript, Shotlist, Drehtag, Grading, Sound, Untertiteln und einer Korrekturrunde. Geliefert werden „8 bis 10 fertig geschnittene Clips in 9:16, 16:9 und 1:1" innerhalb von 7–10 Werktagen. Ein Imagefilm kostet ab 10.000 €. Dient als Preisanker im oberen Segment.
- **JS Media**, https://js-handwerk.de/: ein Handwerk-Spezialist mit monatlichem Drehtag. Der erste Dreh findet innerhalb von zwei Wochen nach Vertragsabschluss statt, die Reels gehen 3–7 Tage nach dem Dreh online, nachdem der Kunde sie per Link freigegeben hat. Add-ons stehen in einer offenen Preisliste: Kurzvideo 120 €, Longform 300 €, Foto 60 €, Karussell 130 €, Beratung 200 €/h, zusätzliche Persona 80 €, **zusätzliches Skript 40 €**. Ein Pilotangebot für die „ersten drei" Betriebe setzt auf Knappheit. Der Preis des Grundpakets ist nicht genannt.
- **The Brand Content**, https://www.thebrandcontent.de/ (München): „Einmal im Monat stehst du für 4 Stunden vor der Kamera", dabei entstehen 30 Reels. Das Versprechen: entspannt, ohne Stress und **ohne Text auswendig zu lernen**. Skripte, Hooks, Coaching, Schnitt und Upload übernimmt die Agentur, das Onboarding dauert etwa eine Stunde. Gutes Muster gegen Kamera-Angst. Preise wurden nicht gefunden.
- **imagetown**, https://imagetown.de/social-media-marketing-fuer-immobilienmakler/ (Berlin): Immobilien-Foto, -Video und -3D. Statt Standardpaketen gibt es „durchdachte Lösungen" mit individuellem Angebot und mindestens einem Jahr Laufzeit.
- **Leisure.one**, https://leisure.one/marketing/restaurant/ (Hamburg): „Wir kommen selbst aus der Hospitality-Branche." Food-Content, Reels, Stories und Community Management. Keine Preise.
- **Indirekte Konkurrenz durch KI:** AIdentical (https://aidentical.de/) mit KI-Avataren und der Behauptung „79% empfinden täglich sichtbare KI-Avatare als authentischer…" ohne Quelle. KI-Film Agentur (https://ki-film-agentur.com/social-media-video-agentur) mit „Realdreh, Hybrid, KI". Reel Estate (KI-Videos aus Makler-Fotos, laut Trustpilot-Listing). KI-Syndikat (https://www.ki-syndikat.de/usecases/gastronomie/08-social-media/) stellt KI-Captions für etwa 40 €/Monat Agenturkosten von 400–1.200 € gegenüber. **Fazit: Der Markt wird mit KI-Angeboten überschwemmt. „Echt gedreht" wird damit zum Unterscheidungsmerkmal.**

---

## 3. Synthese

### 3.1 Die 5 stärksten Wettbewerber (Website-Qualität und Relevanz für SCM)

1. **FUTRIZE** (https://futrize.com/): transparenteste Preislogik, Testmonat für 990 €, Skripte als Liefer-Objekt, Freigabe per Handy und der eigene Account als Beleg.
2. **Drilon Productions** (https://drilon-production.de/): klarste Nischen-Positionierung für Makler, ein Mengenversprechen (30 Reels aus 4 Stunden), Skript- und Teleprompter-Prozess und ein Erwartungsplan über 90 Tage.
3. **Catapult Content** (https://www.catapult-content.de/): die stärkste System- und Format-Sprache, eine Zahlenwand und ein lokaler Hero-Case (Bäckerei).
4. **Agentur Ausdruckslos** (https://www.ausdruckslos.de/recruiting-handwerk/): als einzige ausdrücklich „echte Mitarbeitende statt KI", dazu harte Recruiting-Cases mit Zahlen und ein ehrlicher Benchmark.
5. **ROMO Marketing** (https://romomarketing.de/): der direkteste Modell-Konkurrent (Skript, Freigabe, Drehtag, Gastro), mit eingebetteten Kundenvideos und einfachen Paketen.

Lobend zu erwähnen: **Len Digital** (Preis-Transparenz und der Block „was nicht zugesagt wird") und **Social Lift** (starke Hero-Zeile, Preisseite, Ergebnis mit Disclaimer).

### 3.2 Muster, die die stärksten Seiten teilen

1. **Konkrete Mengen statt abstrakter Leistung.** „30 Reels aus ~4 Std." (Drilon, The Brand Content), „Ein Drehtag ergibt 2-3 Monate Content" (Die Reel Agentur, Social Lift), „einen Drehtag pro vier Videos" (ROMO), „rund 15 Videos im Monat" (FUTRIZE). **Der Aufwand des Kunden wird mitbeziffert** (halber Tag, ein paar Stunden).
2. **Skript und Freigabe vor dem Dreh als Prozessschritt** (ROMO, Drilon, FUTRIZE, Die Reel Agentur, Sparkful), meist in 3–4 Schritten: Erstgespräch → Skripte → Drehtag → Schnitt/Posting/Freigabe.
3. **Zahlenbelege mit Name und Zeitraum**, z. B. Bäcker Feihl (35 Mio. Views), Zimmerei Hellmuth (4 Einstellungen in 2,5 Monaten), GLORIA (5 Fachkräfte in 4 Monaten), Förde Sparkasse (9 Mio. Reichweite in 12 Monaten). Am glaubwürdigsten wirken Ergebnisse, die einen Disclaimer tragen (Social Lift) oder in Werbe-Euro umgerechnet sind (Die Reel Agentur).
4. **Ein niedrigschwelliger oder risikoarmer Einstieg:** kostenloses 15–30-Min-Gespräch (fast alle), bezahlter Testmonat für 990 € (FUTRIZE), Kennenlern-Drehtag für 1.790 € (Wittmann), kostenloses Tool (Gastronomie123), Recruiting-Check (SocialNatives) oder Content-Plan als Lead-Magnet (Wittmann). Dazu ein Reaktionszeit-Versprechen (GastroImpact: 12 h).
5. **Erwartungsmanagement und Ehrlichkeit als Vertrauenshebel:** „Was nicht zugesagt wird" (Len), „keine Zusage" (Social Lift), Benchmark-Werte (Ausdruckslos), 90-Tage-Projektion (Drilon).
6. **Preisanker:** Die Mehrheit nennt mindestens „ab"-Preise oder Spannen. Die stärksten Pakete haben Namen und sind nach Videoanzahl gestaffelt.
7. **Branchen- und Stadt-Landingpages für SEO** (Sparkful, Catapult, FUTRIZE, Wittmann, Gastronomie123). Kopierte Texte auf diesen Seiten schaden allerdings der Glaubwürdigkeit.
8. **Reibungsarme Freigabe:** „anschauen, Daumen hoch, fertig" (FUTRIZE), Freigabe per Link (JS Media).
9. **Branchenspezifische FAQ mit Rechtsfragen:** Eigentümerzustimmung und Datenschutz bei Makler-Drehs (Veith), Nutzungsrechte (Ausdruckslos).

### 3.3 Was fast allen fehlt (Lücken für SCM Creatives)

1. **„Skript statt Zufall" als Kernversprechen.** Bei den meisten ist das Skript nur eine Zeile im Prozess. **Kein einziger Anbieter zeigt in den ausgewerteten Inhalten ein echtes Skript neben dem fertigen Video** (Hook, Hauptteil, CTA mit Timecodes). Die Methode, warum ein Skript die Wiedergabedauer und die Anfragen erhöht, erklärt niemand für Laien. Am nächsten kommen Catapult („Hooks, Formate") und FUTRIZE („datenbasierte Skripte"), beide bleiben aber abstrakt.
2. **„Echt gedreht, kein KI, kein Stock" als ausdrückliche Garantie.** Das tut nur Ausdruckslos, und nur fürs Recruiting. GastroImpact wirbt sogar mit „KI-gestützter Postproduktion", Wittmann bietet KI-Staging an, dazu kommen KI-Avatar-Anbieter. In Gastro und Immobilien besetzt **niemand** das Thema Echtheit.
3. **Video-Belege direkt auf der Website.** Viele Seiten setzen auf Technik-Daten (4K), Leistungslisten oder Zahlenwände. Kennzahlen direkt am jeweiligen Video (Views, Zeitraum, Ergebnis) waren in keinem Auszug zu sehen. (Einschränkung: Das Visuelle war nicht prüfbar. Nur ROMO bettet nachweislich Kundenvideos ein.)
4. **Mehrere Branchen mit echter Tiefe.** Spezialisten bedienen nur eine Nische, Generalisten kopieren Stadtseiten. Branchen-Landingpages mit **eigenen Formaten, eigenen Cases, eigener FAQ und eigenem CTA** sind die Ausnahme (Sparkful zum Teil).
5. **Preis-Transparenz gerade bei Modellen mit Skript und Dreh.** Die Anbieter, die SCM am ähnlichsten sind (ROMO, Drilon, Die Reel Agentur, Catapult, GastroImpact, ImmoReels), verstecken ihre Preise. Offen sind vor allem Posting-lastige Anbieter (Len, OWL) und Fotografen (Veith).
6. **Kaum jemand legt einen Formatkatalog offen.** Kaum ein Anbieter benennt konkrete, wiederkehrende Formate pro Branche (z. B. „Gericht in 15 Sek.", „Marktupdate", „Azubi-Tag").
7. **Lead-Qualifizierung.** Fast überall gibt es nur „Erstgespräch buchen". Ein Multi-Step-Funnel bzw. Quiz ist nur bei OWL erkennbar („In 60 Sekunden zum Angebot").
8. **Kamera-Angst wird selten auf der Seite aufgegriffen.** Ausnahmen sind The Brand Content („ohne auswendig zu lernen"), Drilon und FUTRIZE (Teleprompter) und Sparkful (Anleitung am Set). Gerade Handwerker und Makler zögern deshalb.
9. **Bindung.** Viele verlangen 12–24 Monate (Sparkful, imagetown, OWL Starter). Kurze Laufzeiten bzw. ein Probemonat können ein Wettbewerbsvorteil sein.

### 3.4 Empfohlene Seitenstruktur (Sitemap) für SCM Creatives

```
/                         Startseite (Hero mit BTS-Video, Skript↔Video-Demo, Branchen-Weiche, Proof, Prozess, Pakete-Teaser, FAQ, CTA)
/so-arbeiten-wir          Methode „Skript statt Zufall": Erstgespräch → Skript → Freigabe → Drehtag → Schnitt → Posting/Auswertung
/branchen/gastronomie     Landingpage Gastro (Formate, Cases, FAQ, CTA „Drehtag anfragen")
/branchen/immobilien      Landingpage Makler (Personal Brand + Objekt-Reels, Eigentümer-/DSGVO-FAQ)
/branchen/handwerk        Landingpage Handwerk (Kunden-Reels + Abschnitt Recruiting-Reels)
/branchen/unternehmen     Landingpage Mittelstand (Employer Branding, Vertrieb, Freigabe-/Compliance-Prozess)
/arbeiten                 Referenzen: Hochformat-Reel-Galerie, filterbar nach Branche
/arbeiten/[case]          Case-Detail: Ausgangslage → Skript → Video → Zahlen (mit Datum + Freigabe)
/preise                   Pakete mit „ab"-Preisen, Inklusivleistungen, Laufzeiten, Einstiegsangebot
/ueber-uns                Team mit Gesicht, Equipment, „Wir drehen echt"-Versprechen, Instagram-Einbindung
/faq                      Zentrale FAQ (zusätzlich Branchen-FAQ auf den Landingpages)
/erstgespraech            Quiz-Funnel (4–6 Fragen) → Kalenderbuchung + WhatsApp/Telefon als Alternative
/impressum, /datenschutz  Pflichtseiten
(Phase 2) /ratgeber       Artikel: Kosten, Hooks pro Branche, Reels für Restaurants/Makler/Handwerk
(Phase 2) Stadtseiten     nur mit echten lokalen Cases, keine Textkopien
```

**Fragen für den Quiz-Funnel (Vorschlag):** 1) Branche · 2) Ziel (mehr Gäste/Anfragen, Eigentümer-Leads, Bewerber, Markenbekanntheit) · 3) Aktuelle Situation (postet selbst / gar nicht / andere Agentur) · 4) Gewünschte Menge (z. B. 4, 8 oder 12 Videos/Monat) · 5) Budgetrahmen in Spannen · 6) Wer steht vor der Kamera (Inhaber, Team, unklar) · 7) Ort/PLZ (Anfahrt).

### 3.5 Messaging pro Zielgruppe

**Gastronomie**
- *Schmerzpunkte:* keine Zeit neben Küche und Service, eigene Posts verpuffen, unter der Woche leere Tische, Abhängigkeit von Portalen und Google, Content wirkt austauschbar, Personal fehlt.
- *Versprechen:* „Ein Drehtag, ein Monat Reels, die Hunger machen." Echtes Essen, echtes Team, echte Atmosphäre statt Stock und KI. Jedes Video folgt einem Skript mit Hook in den ersten Sekunden und einem klaren Call-to-Action (reservieren, Mittagstisch, Event).
- *Formate:* Signature-Gericht in 15 Sekunden, „Chef erklärt", Wochenkarte, Team- und Recruiting-Reel, Event-Teaser, Gästereaktion.
- *Messgrößen:* Reservierungsanfragen, Profilaufrufe, Routenanfragen in Google Maps, Views.

**Immobilien / Makler**
- *Schmerzpunkte:* austauschbar neben Portalen und Ketten, Eigentümer-Akquise als Engpass, Objekt-Reels allein bringen keine Verkäufer, Hemmungen vor der Kamera, keine Zeit.
- *Versprechen:* „Werde der Makler, den Eigentümer schon kennen, bevor sie anrufen." Personal-Brand-Reels nach Skript (Marktupdates, Wissen, Persönlichkeit) plus Objekt-Reels. Teleprompter, kein Auswendiglernen. Eigentümerzustimmung und DSGVO-Fragen sind sauber geregelt.
- *Formate:* 60-Sekunden-Marktupdate, Eigentümerfrage der Woche, Objekt-Rundgang mit Hook, „Verkauft in X Tagen"-Story, Makler-Vorstellung.
- *Messgrößen:* Bewertungsanfragen und Eigentümer-Leads, Profilaufrufe, Wiedergabedauer.

**Handwerk**
- *Schmerzpunkte:* Fachkräfte- und Azubimangel, Stellenanzeigen bringen nichts, Aufträge werden nur über den Preis verglichen, keine Lust auf „TikTok-Tanzen", Angst, sich zu blamieren.
- *Versprechen:* „Echte Baustelle, echte Leute, klare Skripte, kein Tanzen." Reels, die Kunden Vertrauen geben und Bewerbern den echten Arbeitsalltag zeigen. Recruiting-Videos mit dem eigenen Team (bewusst gegen KI und Stock abgegrenzt), dazu ein einfacher Bewerbungsweg. Ehrliche Erwartungswerte statt Garantien.
- *Formate:* Vorher/Nachher, „Ein Tag als Azubi", Meister erklärt in 30 Sekunden, Kunden-Statement, Werkzeug- und Fahrzeug-Reel.
- *Messgrößen:* Bewerbungen und Einstellungen, Kundenanfragen, lokale Reichweite.

**Unternehmen / Mittelstand**
- *Schmerzpunkte:* kleines Marketingteam, lange Freigabeschleifen, Sorge um Marke und Compliance, unklar, was auf TikTok und Reels „seriös" funktioniert, bisher nur Imagefilm.
- *Versprechen:* „Planbarer Video-Output mit voller Kontrolle." Jedes Video ist vor dem Dreh als Skript freigegeben, es gibt keine Überraschungen und einen fixen Drehtag-Rhythmus. Das Material dient zugleich Employer Branding und Vertrieb.
- *Formate:* Experten-Statements, Produkt in 30 Sekunden, Mitarbeiter-Porträts, FAQ-Reels, Messe- und Event-Clips.
- *Messgrößen:* Bewerbungen, qualifizierte Anfragen, LinkedIn- und Instagram-Reichweite.

### 3.6 Empfehlung zur Preisdarstellung

**Empfehlung: „ab"-Preise mit klarer Paketlogik, dazu ein Einstiegsangebot zum Festpreis und ein Hinweis auf das individuelle Angebot.**

- **Pakete nach Videoanzahl** (z. B. 4, 8 oder 12 Videos/Monat) mit Angabe, was enthalten ist (Skripte, Drehtag(e), Schnitt, Untertitel, Posting) und was nicht (Werbebudget, Anfahrt außerhalb des Radius). Die Pakete als „ab"-Preise angeben.
- **Ein Einstiegsprodukt zum Festpreis**, z. B. ein „Skript-Drehtag" oder Kennenlern-Drehtag mit festem Ergebnis (x Videos plus Skripte). Vorbilder sind der Testmonat von FUTRIZE (990 €) und der Kennenlern-Drehtag von Wittmann (1.790 €).
- **Laufzeit offen nennen**, möglichst kurz (z. B. 3 Monate, danach monatlich kündbar, wie bei Len Digital). Damit setzt sich SCM bewusst von Bindungen über 12–24 Monate ab.
- **Begründung:**
  1. Gastronomen und Handwerker sind Inhaber, die selbst und preisbewusst entscheiden. Ein Anker filtert unpassende Anfragen, bevor sie Zeit im Erstgespräch kosten, und senkt die Hürde für passende Anfragen.
  2. Im Markt sind „ab"-Preise bereits verbreitet (Gastronomie123 ab 499 €, Sparkful ab 1.190 €, OWL ab 479 €, Social Lift ab 2.500 € für Recruiting). Gerade die Anbieter, die SCM am ähnlichsten sind (ROMO, Drilon, Catapult, Die Reel Agentur), verstecken ihre Preise. Transparenz ist hier also ein **Unterscheidungsmerkmal**.
  3. Starre Komplettpreise passen nicht, weil Anfahrt, Drehorte und Umfang stark schwanken. „Ab" lässt diesen Spielraum.
  4. Ein reines „auf Anfrage" wirkt bei kleinen Betrieben wie „teuer und kompliziert". Das ist eine Einschätzung, keine gemessene Größe.
  5. Ein Negativbeispiel: Bei Sparkful, FUTRIZE und Wittmann widersprechen sich die Preise zwischen Unterseiten. **Preise deshalb nur an einer Stelle pflegen** (z. B. eine zentrale Komponente bzw. Datenquelle).

### 3.7 Ideen: Wie die Website „zeigt statt behauptet"

1. **Skript ↔ Video im Split-Screen:** links das Original-Skript mit den Abschnitten Hook, Hauptteil und CTA samt Timecodes, rechts das fertige Reel. Beim Abspielen wird die passende Skriptzeile hervorgehoben. Das macht „Skript statt Zufall" in Sekunden sichtbar, und kein Wettbewerber zeigt so etwas.
2. **Hero-Video „Ein Drehtag in 30 Sekunden" (Behind the Scenes):** echtes Team, Kamera, Licht, Teleprompter beim echten Kunden. Das belegt „echt gedreht, keine KI" sofort und nimmt die Kamera-Angst.
3. **Reel-Wand im Hochformat pro Branche:** 9:16-Videos laufen stumm automatisch ab, ein Tipp schaltet den Ton ein. Direkt am Video steht eine **Kennzahl mit Datum** (z. B. Views, Wiedergabedauer, Ergebnis wie „+X Reservierungsanfragen im Monat"), nur mit Freigabe des Kunden.
4. **Vergleich „mit Skript / ohne Skript" oder Vorher/Nachher:** ein vom Kunden selbst gefilmter Post neben dem SCM-Reel zum gleichen Thema, wo möglich mit den Insights beider Videos (Wiedergabedauer, Reichweite).
5. **Case-Seiten mit echten Screenshots aus Instagram/TikTok Insights** (anonymisiert bzw. freigegeben), aufgebaut als Ausgangslage, Skript, Video und Zahlen. Wo es keine Zahlen gibt, das offen sagen (Vorbild Veith und Social Lift).
6. **Video-Testimonials im Hochformat:** Gastronom, Makler oder Meister sprechen 15–20 Sekunden selbst, statt anonymer Textzitate (die Schwäche bei Drilon).
7. **„Echt-Garantie" als Badge und eigener Abschnitt:** „100 % real gedreht, keine KI-Avatare, kein Stock". Verlinkt auf das BTS-Video und gegebenenfalls auf Roh-Footage-Ausschnitte. Eine Abgrenzung zu KI-Anbietern ohne Namen zu nennen.
8. **Interaktiver Formatkatalog bzw. Hook-Bibliothek pro Branche:** 3–5 Beispiel-Hooks pro Branche, ein Klick spielt das passende Beispielvideo ab. Optional als Lead-Magnet: „3 Skripte für deine Branche gratis" gegen E-Mail, nach dem Vorbild von Wittmanns Content-Plan und den Skripten im FUTRIZE-Testmonat.
9. *(Bonus)* **Den eigenen Kanal als Beleg einbinden:** aktuelle Reels von @scm.creatives auf der Seite, nach dem Vorbild von FUTRIZE und @ambastious. So demonstriert SCM sein Können am eigenen Account.

---

### Quellen (Haupt-URLs)
Gastro: https://gastronomie123.de/ · https://www.gastro-impact.de/ · https://len-digital.de/social-media · https://www.sparkful.media/social-media-fuer-gastronomie · https://leisure.one/marketing/restaurant/
Immobilien: https://drilon-production.de/ · https://tobiaswittmann.de/ · https://maurice-veith.com/social-media-immobilienmakler · https://www.immoreels.net/ · https://imagetown.de/social-media-marketing-fuer-immobilienmakler/
Handwerk: https://www.ausdruckslos.de/recruiting-handwerk/ · https://sociallift.media/ · https://socialnatives.de/mitarbeitergewinnung-im-handwerk/ · https://owl-vision-media.de/unsere-leistungen/social-media-fuer-handwerksbetriebe/ · https://js-handwerk.de/
Benchmarks: https://www.catapult-content.de/ · https://futrize.com/ · https://romomarketing.de/ · https://www.diereelagentur.de/ · https://wivid.de/ · https://www.thebrandcontent.de/
KI-Wettbewerb/Kontext: https://aidentical.de/ · https://ki-film-agentur.com/social-media-video-agentur · https://www.ki-syndikat.de/usecases/gastronomie/08-social-media/ · https://www.communita.de/2026/08/11/ki-videos-vs-authentische-aufnahmen/
