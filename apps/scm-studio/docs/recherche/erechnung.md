# E-Rechnung, GoBD, DATEV

Recherche für SCM Studio, Stand 26.10.2026 (Websuche + npm-Registry, je Thema ein Rechercheur). Aussagen mit Sicherheit "mittel" vor dem Livegang an der Quelle prüfen.

## Zusammenfassung

Stand 26.10.2026. Empfehlung: Den PDF-Teil selbst mit @react-pdf/renderer 4.9.0 erzeugen (React 19.3, die Markenschriften als TTF registriert). Danach macht @e-invoice-eu/core 3.4.2 (npm, 22.10.2026) daraus eine ZUGFeRD/Factur-X-Rechnung im Profil EN 16931 als PDF/A-3b mit eingebetteter factur-x.xml. Für Behördenkunden gibt es zusätzlich XRECHNUNG-CII bzw. -UBL. Diese Kette habe ich in der Sandbox durchgespielt: Mustang-CLI 2.26.0 meldet „Parsed PDF:valid XML:valid“ und „flavour=3b, isCompliant=true“. Die XRechnung-Variante besteht ebenfalls, aber erst mit Verkäufer-Kontakt (BR-DE-2). Ohne eingebettete Schriften fällt PDF/A durch.

node-zugferd ist noch Beta (0.1.1-beta.1) und scheidet aus. @stackforge-eu/factur-x 1.4.3 (EUPL) ist eine Alternative und eignet sich zum Auslesen eingehender Rechnungen.

Rechtslage (Primärtext aus dem Repo-Cache): Die Pflichtangaben stehen in § 14 Abs. 4 UStG. Eingehende E-Rechnungen muss SCM seit 2025 annehmen können. Rechnungen für Leistungen 2026 dürfen nach § 27 Abs. 38 UStG bis 31.12.2026 noch als PDF oder Papier gehen. Für Leistungen 2027 gilt das weiter bei höchstens 800.000 € Vorjahresumsatz. Ab 2028 ist die E-Rechnung zwischen Firmen im Inland Pflicht.

Aufbewahrung nach § 147 AO: Buchungsbelege 8 Jahre, Bücher und Organisationsunterlagen (dazu gehört die Verfahrensdokumentation) 10 Jahre, Geschäftsbriefe 6 Jahre. Für die GoBD heißt das: Festschreiben statt Ändern, Storno statt Löschen, Änderungsprotokoll, Nummern pro Jahr und Kreis ohne Lücken. Dazu kommt die GoBD-Änderung vom 14.07.2025 zur E-Rechnung (laut Sekundärquellen).

DATEV: Das EXTF-Format hat Header-Version 700, Kategorie 21 „Buchungsstapel“ und Formatversion 13 (Minimum 12). Die API accounting:extf-files ist abgekündigt (deprecated), und für den API-Zugang braucht man vermutlich eine DATEV-Partnerschaft. Deshalb Phase 1 als EXTF-CSV plus ZIP mit den Belegen, eine API erst später.

12 Websuchen verbraucht. Die npm-Registry und Maven Central waren über den Proxy erreichbar, GitHub, gesetze-im-internet.de und developer.datev.de waren gesperrt.

## Einzelergebnisse

### 1. @e-invoice-eu/core ist in Version 3.4.2 aktuell (npm, geändert 22.10.2026, Lizenz WTFPL). Die Bibliothek erzeugt EN-16931-konforme Rechnungen in den Formaten Factur-X/ZUGFeRD (alle Profile inkl. XRechnung), CII, UBL, XRECHNUNG-CII und XRECHNUNG-UBL, mit PDF/A-Unterstützung.

Sicherheit: hoch

Per FormatFactoryService().listFormatServices() in der Sandbox ausgelesene Formatnamen: CII, UBL, Factur-X-Minimum, Factur-X-Basic WL, Factur-X-Basic, Factur-X-EN16931 (Alias Factur-X-Comfort), Factur-X-Extended, Factur-X-XRechnung, XRECHNUNG-CII, XRECHNUNG-UBL. Die XRechnung-Formate nutzen die CustomizationID 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0'.

Abhängigkeiten: @cantoo/pdf-lib ^2.11.1, xmlbuilder2, ajv. Das Eingabeformat ist UBL-artiges JSON ({ 'ubl:Invoice': { 'cbc:ID', 'cac:AccountingSupplierParty', ... } }) und wird per Ajv gegen ein JSON-Schema geprüft.

API: new InvoiceService(logger).generate(invoice, { format, lang, pdf?, data?, embedPDF?, attachments? }). LibreOffice braucht man nur, wenn man Tabellendaten (data) statt eines fertigen PDFs übergibt. Das ist für uns nicht nötig, wir übergeben pdf. Paket @e-invoice-eu/cli 3.4.2 ist parallel erschienen. In npm-Suchergebnissen steht teils noch 2.1.7, das ist veraltet.

Quellen:

- https://www.npmjs.com/package/@e-invoice-eu/core („Factur-X/ZUGFeRD (all profiles including XRECHNUNG) with full PDF/A support (README; npm view: version 3.4.2, time.modified 2026-10-22T15:15:54Z)“)
- https://cdn.jsdelivr.net/npm/@e-invoice-eu/core@3.1.0/README.md („In case of Factur-X/ZUGFeRD they are attached to the PDF, additionally to the mandatory attachment `factur-x.xml`.“)

### 2. Eigener Test in der Sandbox. Zuerst ein PDF mit @react-pdf/renderer 4.9.0 und React 19.3.1 rendern (TTF per Font.register eingebunden), dann InvoiceService.generate(..., { format: 'Factur-X-EN16931', lang: 'de-de', pdf }). Ergebnis ist ein gültiges PDF/A-3b mit gültiger EN-16931-XML, geprüft mit Mustang-CLI 2.26.0. Ohne eingebettete Schrift (pdf-lib-Standardschrift Helvetica) schlägt die PDF/A-Prüfung fehl.

Sicherheit: hoch

Mustang-Ausgabe für die react-pdf-Variante: 'Parsed PDF:valid XML:valid ... Profile:urn:cen.eu:en16931:2017 ... Errors:[]' und 'ValidationResult [flavour=3b, totalAssertions=892, assertions=[], isCompliant=true]', Dateigröße 21 KB. Erster Versuch mit StandardFonts: 'ISO 19005-3:2012, clause=6.2.11.4.1 ... The font program is not embedded'. Variante mit @cantoo/pdf-lib und @pdf-lib/fontkit: subset:true stürzt ab, subset:false ist gültig, aber 438 KB groß. Darum für die PDFs @react-pdf/renderer verwenden, das Schriften als Teilmenge einbettet.

Code-Muster (Server Action oder Route Handler mit runtime 'nodejs'):
const pdf = await renderToBuffer(<RechnungPdf data={snap} />);
const out = await new InvoiceService(console).generate(ubl, { format: 'Factur-X-EN16931', lang: 'de-de', pdf: { buffer: pdf, filename: `${nr}.pdf`, mimetype: 'application/pdf' } });
const bytes = Buffer.from(out);

Testskripte: /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/scripts/rpdf.mjs und /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/scripts/gen4.cjs (dort steht ein vollständiges, gültiges Rechnungs-JSON).

Quellen:

- https://www.npmjs.com/package/@react-pdf/renderer („npm view: version 4.9.0, modified 2026-08-27; peerDependency react ^16.8.0 || ^17 || ^18 || ^19“)
- https://repo1.maven.org/maven2/org/mustangproject/Mustang-CLI/2.26.0/Mustang-CLI-2.26.0.jar („Mustang-CLI 2.26.0 (Maven Central, lastUpdated 20260825): 'Parsed PDF:valid XML:valid ... isCompliant=true'“)

### 3. Fallstricke im Eingabeformat von @e-invoice-eu/core, ebenfalls im Test geprüft: (a) cbc:CustomizationID weglassen, die Bibliothek setzt sie passend zum Format. (b) cac:Delivery muss ein Objekt sein, kein Array. (c) Ohne Lieferdatum entsteht ein leeres Element und die Warnung PEPPOL-EN16931-R008. (d) XRechnung verlangt die Gruppe BG-6 Seller Contact (BR-DE-2).

Sicherheit: hoch

Gibt man CustomizationID 'urn:cen.eu:en16931:2017' mit, übernimmt die Bibliothek diesen Wert auch bei XRECHNUNG-CII. Das XML läuft dann nicht gegen die XRechnung-Regeln. Ohne das Feld steht korrekt '...#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0' im XML.

Mustang 2.26.0 bringt die Prüfregeln EN16931-CII, XR_30 (XRechnung 3.0) und ZF_250 mit. Fehlermeldung ohne Kontakt: '[BR-DE-2] Die Gruppe "SELLER CONTACT" (BG-6) muss übermittelt werden'. Mit 'cac:Contact': { 'cbc:Name', 'cbc:Telephone', 'cbc:ElectronicMail' } ist das Ergebnis 'XML:valid'.

Außerdem verwendet: 'cbc:EndpointID' samt '@schemeID': 'EM' (E-Mail) für Verkäufer und Käufer, 'cac:PaymentMeans' mit Code 58 (SEPA-Überweisung) und IBAN, 'cbc:BuyerReference', 'cac:Delivery': { 'cbc:ActualDeliveryDate' } bzw. 'cac:InvoicePeriod' (Leistungszeitraum, § 14 Abs. 4 Nr. 6 UStG).

Quellen:

- https://www.npmjs.com/package/@e-invoice-eu/core („Ajv-Fehler im Test: instancePath '/ubl:Invoice/cac:Delivery' ... message 'must be object'“)
- https://github.com/itplr-kosit/validator-configuration-xrechnung („Releases bündeln XML Schema und Schematron für UBL und CII gegen XRechnung (Mustang-Lauf: XSLT /xslt/XR_30/XRechnung-CII-validation.xslt)“)

### 4. node-zugferd ist noch Beta (0.1.1-beta.1, letzte Änderung 07.08.2025). Schematron-Prüfung und natives XRechnung stehen auf der Roadmap. Damit ist es für den Produktivbetrieb nicht geeignet.

Sicherheit: hoch

MIT-Lizenz, Abhängigkeiten pdf-lib 1.17.1, zod 3 und fast-xml-parser. Funktionen: XML erzeugen, an PDF/A-3b anhängen (embedInPdf), Prüfung nur per XSD. Das README warnt selbst: MINIMUM und BASIC WL gelten in Deutschland nicht als Rechnung.

Quellen:

- https://www.npmjs.com/package/node-zugferd („A Node.js library for creating ZUGFeRD/Factur-X compliant documents ... (npm view: 0.1.1-beta.1, modified 2025-08-07)“)
- https://unpkg.com/node-zugferd@0.0.10-beta.1/README.md („Documents containing only information of the first two profiles (MINIMUM and BASIC WL) are not considered to be invoices according to German fiscal law“)

### 5. Alternative: @stackforge-eu/factur-x 1.4.3 (28.09.2026, Lizenz EUPL-1.2). Die Bibliothek erzeugt CII-XML nach Factur-X 1.09 bzw. ZUGFeRD 2.5 und prüft gegen XSD (libxml2-wasm). Sie bettet das XML als PDF/A-3b ein, gibt XRechnung-CII aus und kann mit extractXml das XML aus eingehenden ZUGFeRD-PDFs lesen.

Sicherheit: hoch

Gut geeignet für das Belege-Modul (eingehende E-Rechnungen auslesen und Felder vorbefüllen). Geprüft wird nur gegen XSD, nicht gegen Schematron. Die EUPL ist ein schwaches Copyleft, für eine rein interne App unkritisch.

Quellen:

- https://jsr.io/@stackforge-eu/factur-x/1.4.0/README.md („Generates UN/CEFACT CII XML (Factur-X 1.09 / ZUGFeRD 2.5) ... Validates the XML against official XSD schemas (via WASM) ... Embeds it into a PDF with PDF/A-3b metadata“)
- https://www.npmjs.com/package/@stackforge-eu/factur-x („npm view: version 1.4.3, modified 2026-09-28, license EUPL-1.2“)

### 6. Zur Validierung: Mustang-CLI 2.26.0 (Java, Maven Central, 25.08.2026) prüft PDF/A-3 (veraPDF-basiert) und das XML gegen EN 16931, ZUGFeRD 2.5 und XRechnung 3.0. Der KoSIT-Validator mit XRechnung-Konfiguration ist die offizielle Referenz für XRechnung. Beide brauchen Java und laufen nicht in Vercel Functions.

Sicherheit: mittel

Geprüfter Aufruf: java -jar Mustang-CLI-2.26.0.jar --action validate --source RE-2026-0001.pdf --no-notices (gibt XML mit <summary status="valid"/> aus).

KoSIT-Konfiguration: Das letzte auf GitHub gesehene Release 3.0.2 stammt vom 20.06.2024. Ein Drittanbieter nennt schon 'XRechnung configuration v2026-01-31' und 'KoSIT Validator 1.6.0', das ist nicht offiziell bestätigt. Maven-Metadaten zu de.kosit:validationtool zeigen nur 1.5.0 (2022), die aktuellen Versionen liegen auf GitHub-Releases (aus der Sandbox gesperrt).

Quellen:

- https://repo1.maven.org/maven2/org/mustangproject/Mustang-CLI/maven-metadata.xml („<release>2.26.0</release> <lastUpdated>20260825114726</lastUpdated>“)
- https://github.com/itplr-kosit/validator-configuration-xrechnung („needs the separate validator to run them; latest release shown 3.0.2, 2024-06-20“)
- https://apify.com/kamerozkan/xrechnung-xml-batch-validator-api („KoSIT Validator 1.6.0, XRechnung configuration v2026-01-31, Mustangproject rule bundle 2.24.0, veraPDF 1.30.2“)

### 7. Stand der Standards: ZUGFeRD 2.4 / Factur-X 1.08 gilt seit 15.01.2026 (veröffentlicht 04.12.2025, rückwärtskompatibel, neu sind Unterpositionen). ZUGFeRD 2.3 ist damit veraltet. Hinweise auf ZUGFeRD 2.5 / Factur-X 1.09 (ab Mitte 2026) gibt es nur indirekt (stackforge, Mustang-Regelpaket ZF_250), keine offizielle Quelle gefunden. XRechnung 3.0.x ist aktuell, eine Version 4.0 ist nur von Anbietern angekündigt.

Sicherheit: mittel

Für unser Profil EN 16931 bleibt die Kennung im XML 'urn:cen.eu:en16931:2017'. Ein Versionswechsel betrifft vor allem Erweiterungen und Codelisten, deshalb Bibliotheken festpinnen und jährlich gegen Mustang und KoSIT neu prüfen.

Quellen:

- https://fnfe-mpe.org/wp-content/uploads/2025/12/2025-12-04_ZUGFeRD_2.4_Factur-X_1.08_Meldung_DE.pdf („Gemeinsame Veröffentlichung ZUGFeRD 2.4 / Factur-X 1.08 am 4.12.2025, Inkrafttreten 15.01.2026, EN-16931-konform, Unterpositionen möglich“)
- https://www.ferd-net.de/en/downloads/publications/details/zugferd-24-english („ZUGFeRD 2.4 (FeRD-Download-Seite)“)
- https://kostenlose-erechnung.de/ratgeber/e-rechnung-format-vergleich/ („Sekundärquelle: XRechnung 3.0.2 aktuell; ZUGFeRD 2.5 seit 1.7.2026 (unbestätigt)“)

### 8. § 14 Abs. 1 und 2 UStG (Fassung JStG 2024): Eine E-Rechnung ist eine Rechnung in einem strukturierten elektronischen Format nach EN 16931. Bei Leistungen an andere Unternehmer im Inland muss sie als E-Rechnung ausgestellt werden, und zwar innerhalb von 6 Monaten. Ihre Übermittlung braucht dann keine Zustimmung. Bei Privatkunden gibt es keine E-Rechnungspflicht.

Sicherheit: hoch

Übergang nach § 27 Abs. 38 UStG: Nr. 1 erlaubt für Leistungen 2025 und 2026 Papier oder (mit Zustimmung) PDF bis 31.12.2026. Nr. 2 erlaubt für Leistungen 2027 Papier oder PDF bis 31.12.2027, wenn der Gesamtumsatz im Vorjahr höchstens 800.000 € betrug. Ab Leistungen 2028 also nur noch E-Rechnungen zwischen Firmen. Den Empfang müssen alle Unternehmer schon heute können, denn dafür gibt es keine Übergangsregel.

Für SCM (Kunden aus Gastro, Handwerk, Maklerei, also Unternehmen) heißt das: Gleich ab Start Factur-X EN 16931 ausstellen. Die Datei ist zugleich ein schönes PDF und eine gültige E-Rechnung.

Quellen:

- https://www.gesetze-im-internet.de/ustg_1980/__14.html („Eine elektronische Rechnung ist eine Rechnung, die in einem strukturierten elektronischen Format ausgestellt, übermittelt und empfangen wird und eine elektronische Verarbeitung ermöglicht. (Abs. 1 S. 3) ... die Rechnung ist als elektronische Rechnung ... auszustellen, wenn der leistende Unternehmer und der Leistungsempfänger im Inland ... ansässig sind (Abs. 2 S. 2 Nr. 1); Text laut buzer.de, zuletzt geändert durch G. v. 10.02.2026“)
- https://www.gesetze-im-internet.de/ustg_1980/__27.html („(38) ... 2. bis zum 31. Dezember 2027 für einen nach dem 31. Dezember 2026 und vor dem 1. Januar 2028 ausgeführten Umsatz ... wenn der Gesamtumsatz (§ 19 Absatz 2) ... im vorangegangenen Kalenderjahr nicht mehr als 800 000 Euro betragen hat“)

### 9. § 14 Abs. 4 UStG nennt die Pflichtangaben: (1) vollständiger Name und Anschrift von Leistendem und Empfänger, (2) Steuernummer oder USt-IdNr., (3) Ausstellungsdatum, (4) fortlaufende, einmalig vergebene Rechnungsnummer (eine oder mehrere Zahlenreihen), (5) Menge und Art bzw. Umfang und Art der Leistung, (6) Leistungszeitpunkt, (7) Entgelt aufgeschlüsselt nach Steuersätzen und Befreiungen, dazu vorab vereinbarte Minderungen, (8) Steuersatz und Steuerbetrag bzw. Hinweis auf Steuerbefreiung, (9) Hinweis auf die Aufbewahrungspflicht des Empfängers (§ 14b Abs. 1 S. 5), (10) das Wort „Gutschrift“ bei Abrechnung durch den Empfänger.

Sicherheit: hoch

Zuordnung zum strukturierten Teil nach EN 16931 (aus dem Normwissen, nicht in dieser Sitzung gegen den Normtext geprüft; Absicherung über Mustang/KoSIT):
- Nr. 1: BT-27 und BG-5 (BT-35, BT-37, BT-38, BT-40) für den Verkäufer, BT-44 und BG-8 für den Käufer.
- Nr. 2: BT-31 USt-IdNr. (schemeID VA) oder BT-32 Steuernummer (schemeID FC).
- Nr. 3: BT-2. Nr. 4: BT-1.
- Nr. 5: Menge BT-129, Einheit BT-130 (UN/ECE Rec 20: C62 Stück, HUR Stunde, MON Monat, LS Pauschale), Bezeichnung BT-153 und BT-154.
- Nr. 6: BT-72 Lieferdatum oder BG-14 Abrechnungszeitraum (BT-73, BT-74), je Position BG-26.
- Nr. 7 und 8: BG-23 Steueraufschlüsselung (BT-116 bis BT-119), BT-110 Steuer gesamt, Nachlässe BG-20 bzw. BG-27, Skonto in BT-20.
- Befreiung: Kategorie E bzw. AE mit BT-120 und BT-121 als Begründung, z. B. Kleinunternehmer § 19 UStG oder Reverse Charge nach § 13b.
- Nr. 9: BT-22 (Bemerkung). Nr. 10: Rechnungsart BT-3 = 389.
- Für XRechnung zusätzlich: BT-10 Käuferreferenz (bei Behörden die Leitweg-ID), BT-34 und BT-49 elektronische Adressen, BG-6 Verkäufer-Kontakt, BG-16 Zahlungsdaten.

Quellen:

- https://www.gesetze-im-internet.de/ustg_1980/__14.html („(4) Eine Rechnung muss folgende Angaben enthalten: 1. den vollständigen Namen und die vollständige Anschrift des leistenden Unternehmers und des Leistungsempfängers, 2. die ... Steuernummer oder ... Umsatzsteuer-Identifikationsnummer, 3. das Ausstellungsdatum, 4. eine fortlaufende Nummer mit einer oder mehreren Zahlenreihen, die zur Identifizierung der Rechnung vom Rechnungsaussteller einmalig vergeben wird ... 6. den Zeitpunkt der Lieferung oder sonstigen Leistung ... 10. ... die Angabe „Gutschrift“.“)

### 10. Zweites BMF-Schreiben zur E-Rechnung vom 15.10.2025 (III C 2 - S 7287-a/00019/007/243): MINIMUM und BASIC-WL gelten nicht als E-Rechnung. Formatfehler (kaputte XML-Struktur) bedeuten, dass keine E-Rechnung vorliegt. Verstöße gegen Geschäftsregeln (z. B. fehlende Käuferreferenz) sind heilbar, die Rechnung bleibt in der Regel gültig. Pflichtangaben gehören in den strukturierten Teil und nicht nur in Anhänge.

Sicherheit: mittel

Die Regel zu Anhängen stammt aus dem Entwurf (IHK Berlin), die endgültige Fassung ist nicht geprüft. Den Volltext beim BMF konnte ich nicht abrufen (Bot-Sperre, siehe Cache /home/user/Web-Projekte/.preview-cache/scm/steuern/quellen/bmf-faq-e-rechnung.md). Folge für die Umsetzung: Alle Pflichtangaben im XML abbilden, Profil EN 16931 nutzen, und das PDF darf dem XML nicht widersprechen.

Quellen:

- https://www.ihk.de/koeln/hauptnavigation/recht-steuern/steuern/bmf-schreiben-zur-e-rechnung-vom-15-10-2025-6774012 („EN-16931-konforme Formate wie XRechnung und ZUGFeRD 2.x werden akzeptiert, ausgenommen die Profile MINIMUM und BASIC-WL“)
- https://europe.thomsonreuters.com/de/blog/bmf-schreiben-pflichten-e-rechnung-unternehmer („Formatfehler ... keine E-Rechnung i.S.d. § 14 UStG; Geschäftsregelfehler ... heilbar, Rechnung grundsätzlich gültig“)
- https://www.ihk.de/berlin/service-und-beratung/recht-und-steuern/steuern-und-finanzen/erechnung-6184420 („Verweis im strukturierten Teil auf Anlagen mit unstrukturierten Pflichtangaben gilt nicht als ordnungsgemäße Rechnung (Entwurfsstand)“)

### 11. § 14 Abs. 3 UStG: Echtheit der Herkunft, Unversehrtheit des Inhalts und Lesbarkeit müssen gesichert sein. Das darf über ein innerbetriebliches Kontrollverfahren mit verlässlichem Prüfpfad zwischen Rechnung und Leistung geschehen. Eine qualifizierte Signatur braucht man nicht.

Sicherheit: hoch

Umsetzung in der App: Verknüpfung Auftrag oder Paket → Leistungsnachweis (Drehtermin, gelieferte Videos) → Rechnung → Zahlung. Dazu SHA-256 je Datei und ein Änderungsprotokoll. Das ist der Prüfpfad.

Quellen:

- https://www.gesetze-im-internet.de/ustg_1980/__14.html („Dies kann durch jegliche innerbetriebliche Kontrollverfahren erreicht werden, die einen verlässlichen Prüfpfad zwischen Rechnung und Leistung schaffen können.“)

### 12. Aufbewahrung nach § 147 AO (aktuelle Fassung nach BEG IV): Bücher, Aufzeichnungen und die zu ihrem Verständnis nötigen Arbeitsanweisungen und Organisationsunterlagen 10 Jahre (darunter fällt die Verfahrensdokumentation). Buchungsbelege, also auch Rechnungen, 8 Jahre. Empfangene und abgesandte Geschäftsbriefe sowie sonstige Unterlagen 6 Jahre. Die Frist beginnt am Ende des Kalenderjahres und läuft nicht ab, solange die Festsetzungsfrist offen ist.

Sicherheit: hoch

Nach § 147 Abs. 2 Nr. 2 AO müssen die Daten während der ganzen Frist verfügbar sein, sich jederzeit lesbar machen und maschinell auswerten lassen. Abs. 6 regelt den Datenzugriff der Prüfer (unmittelbar Z1, mittelbar Z2, Datenträgerüberlassung Z3). Daraus folgt ein Export aller Buchungsdaten als CSV oder JSON samt Belegen.

Datenmodell: Feld retention_until = Ende des Belegjahres + 8 Jahre (Belege) bzw. + 10 Jahre (Journal, Verfahrensdokumentation). Löschen nie automatisch, nur nach manueller Freigabe, weil die Frist wegen offener Festsetzungsfrist länger laufen kann. Nach § 14b Abs. 1 UStG gelten auch für Rechnungen 8 Jahre (laut Haufe).

Quellen:

- https://www.gesetze-im-internet.de/ao_1977/__147.html („(3) Die in Absatz 1 Nummer 1 und 4a aufgeführten Unterlagen sind zehn Jahre, die in Absatz 1 Nummer 4 aufgeführten Unterlagen acht Jahre und die sonstigen in Absatz 1 aufgeführten Unterlagen sechs Jahre aufzubewahren ... Die Aufbewahrungsfrist läuft jedoch nicht ab, soweit und solange die Unterlagen für Steuern von Bedeutung sind, für welche die Festsetzungsfrist noch nicht abgelaufen ist“)
- https://www.haufe.de/steuern/gesetzgebung-politik/viertes-buerokratieentlastungsgesetz_168_613390.html („Mit dem Vierten Bürokratieentlastungsgesetz (BEG IV) vom 29.10.2024 ... die Aufbewahrungsfrist für Buchungsbelege von 10 auf 8 Jahre verkürzt ... auch ... § 14b Abs. 1 Satz 1 UStG ... angepasst“)

### 13. Die GoBD wurden mit BMF-Schreiben vom 14.07.2025 (IV D 2 - S 0316/00128/005/088) zum zweiten Mal geändert und gelten sofort. Schwerpunkte sind die Aufbewahrung von E-Rechnungen (der strukturierte Datensatz ist maßgeblich und muss im Original erhalten bleiben) und ein erweiterter mittelbarer Datenzugriff (Z2).

Sicherheit: mittel

Folge: Ausgehende und eingehende E-Rechnungen byte-genau so speichern, wie sie versendet oder empfangen wurden (XML bzw. ZUGFeRD-PDF), mit Hash. Eine Bild- oder PDF-Ansicht ist nur eine Darstellung. Den BMF-Volltext konnte ich nicht abrufen, die Angaben stammen aus Sekundärquellen.

Quellen:

- https://www.zdh.de/ueber-uns/fachbereich-steuern-und-finanzen/abgabenordnung/aktuelles/veroeffentlichung-aktualisierter-gobd/ („neue Regeln zur Aufbewahrung von E-Rechnungen und Erweiterung des mittelbaren Datenzugriffs (Z2); Anwendung ab sofort“)
- https://www.ey.com/de_de/technical/steuernachrichten/konkretisierung-der-gobd-mit-blick-auf-e-rechnungen („Konkretisierung der GoBD mit Blick auf E-Rechnungen, insbesondere strukturierte Datensätze“)
- https://www.ihk.de/gera/recht-und-steuern/aktuelles-rechtundsteuern/aufbewahrung-von-e-rechnungen-6636974 („Eingehende E-Rechnungen sind bereits ordnungsgemäß zu archivieren“)

### 14. GoBD-Pflichten an ein Rechnungsprogramm: Erfasste Daten dürfen nicht unterdrückt oder unbemerkt überschrieben werden, Änderungen sind zu protokollieren (Rz. 58, ab Rz. 107). Das lässt sich über Hardware, Software oder Organisation sichern. Fotos von Belegen per Smartphone gelten wie Scannen. Für das ersetzende Scannen braucht es eine Verfahrensdokumentation (wer erfasst wann was, Sichtprüfung, Vollständigkeit samt Rückseiten). BSI TR-RESISCAN ist empfohlen, aber nicht bindend.

Sicherheit: mittel

Die Rz.-Angaben stammen aus Kommentaren zur GoBD-Fassung 2014. Die geltende Fassung (BMF 28.11.2019, geändert 2024/2025) kann anders nummerieren, das ist vor Zitat zu prüfen. Grundlage im Gesetz ist § 146 Abs. 4 AO: Eine Buchung darf nicht so verändert werden, dass der ursprüngliche Inhalt nicht mehr feststellbar ist. Abgeleitete Funktionen: Status Entwurf → festgeschrieben, danach keine Bearbeitung mehr; Korrektur nur per Stornobeleg; Änderungsprotokoll nur mit Anfügen; Foto-Erfassung mit Zeitstempel, Benutzer, Original und Hash.

Quellen:

- https://www.ihk.de/wiesbaden/recht/rechtsberatung/steuern/gobd-was-ist-zu-tun--5277818 („Es muss sichergestellt werden, dass Dokumente nicht verändert werden beziehungsweise Änderungen protokolliert werden.“)
- https://www.psp.eu/assets/pdfs/beitrag_expertenerlaeuterungen_gobd_unveraenderbarkeit_final.pdf („Die Unveränderbarkeit ... kann sowohl hardwaremäßig als auch softwaremäßig oder organisatorisch gewährleistet werden.“)
- https://www.psp.eu/assets/pdfs/gobd-beitrag_mobiles_scannen_04082015.pdf („mobile Geräte sind Teil des DV-Systems und unterliegen den Anforderungen an die Unveränderbarkeit“)
- https://www.lexware.de/wissen/buchhaltung-finanzen/ersetzendes-scannen/ („Datei darf nach dem Scannen nicht veränderbar sein; Empfehlung mind. 300 dpi; TR-RESISCAN empfohlen“)

### 15. DATEV-Format (EXTF) Buchungsstapel: Zeile 1 ist der Header mit Kennzeichen „EXTF“ (Fremdanwendung) und Versionsnummer 700, Formatkategorie 21 „Buchungsstapel“, Formatversion 13 (Mindestanforderung 12). Zeile 2 enthält die Spaltenüberschriften, ab Zeile 3 folgen die Daten. Trennzeichen Semikolon, Zeilenende CR/LF, Text in Anführungszeichen, Dezimalkomma ohne Tausenderpunkt.

Sicherheit: mittel

Header-Muster (Feldfolge aus der DATEV-Spezifikation, aus dem Gedächtnis ergänzt, vor der Umsetzung gegen developer.datev.de prüfen):
"EXTF";700;21;"Buchungsstapel";13;<Erzeugt am JJJJMMTTHHMMSSmmm>;;"RE";"SCM Studio";;<Beraternr>;<Mandantennr>;<WJ-Beginn JJJJMMTT>;<Sachkontenlänge 4>;<Datum vom>;<Datum bis>;"Ausgangsrechnungen 10/2026";"SC";1;0;0;"EUR";;"";;;"03";;;"";""

Wichtigste Datenspalten: Umsatz (ohne Soll/Haben-Kennzeichen); Soll/Haben-Kennzeichen; WKZ Umsatz; Kurs; Basis-Umsatz; WKZ Basis-Umsatz; Konto; Gegenkonto (ohne BU-Schlüssel); BU-Schlüssel; Belegdatum (TTMM, das Jahr kommt aus dem Header); Belegfeld 1 (Rechnungsnummer, max. 36 Zeichen); Belegfeld 2; Skonto; Buchungstext (max. 60 Zeichen).

Beispielzeile: 1190,00;"S";"EUR";;;;10007;8400;;3110;"RE-2026-0001";;;"Kunde GmbH Paket 10/2026"

Zeichensatz: DATEV erwartet traditionell ANSI (Windows-1252). Das mit einem Testimport beim Steuerberater prüfen.

Quellen:

- https://developer.datev.de/datev/platform/en/dtvf/formate/header („Header: first field "EXTF" (third-party app) or "DTVF"; version number must be 700; category 21 'Buchungsstapel'; format version 13“)
- https://developer.datev.de/datev/platform/en/schnittstellenvorgaben/dtvf („minimum version required is the main version 700 with the format versions Posting batch = 12 and Accounts receivable/payable = 5“)
- https://developer.datev.de/datev/platform/en/dtvf („Line 1: Header; Line 2: Header line for user data; Line 3-n: User data; semicolons, CR/LF, quoted text, decimal comma“)

### 16. DATEV-API: Der Dienst accounting:extf-files (Buchungsdatenservice) ist abgekündigt (deprecated). Für Belege in „Belege online“ (DATEV Unternehmen online) gibt es accounting:documents. Der Zugang setzt laut Community eine DATEV-Partnerschaft bzw. Registrierung voraus. Andere Wege: Belegbilderservice (nur Belege) und Rechnungsdatenservice 1.0 (Belege mit Kontierung).

Sicherheit: mittel

Für zwei Gründer ohne DATEV-Partnerstatus ist die API in Phase 1 unverhältnismäßig. Robuster ist ein monatlicher Export: EXTF-CSV plus ZIP mit den Belegen (Dateiname = Belegfeld 1). Der Steuerberater importiert ihn selbst, oder die Belege kommen per Upload in DUO. Den Nachfolger von extf-files habe ich nicht bestätigt.

Quellen:

- https://developer.datev.de/datev/platform/en/product/30729 („accounting:extf-files DEPRECATED ... essentially required for the data service called "DATEV Buchungsdatenservice" ... accounting:documents for uploading documents to Belege online“)
- https://www.datev-community.de/t5/Unternehmen-online/Buchungsdatenservice-ohne-Buchhaltungssoftware-nur-zum-Upload/m-p/412039/highlight/true („Man kann DATEV-Partner werden, das ist aber nicht mit zwei Klicks erledigt (sinngemäß)“)
- https://helpcenter.spendesk.com/en/articles/5588495-introduction-to-datev-unternehmen-online („Belegbilderservice ... upload receipts only to DATEV UO; Rechnungsdatenservice 1.0 ... receipts enriched with chart of account information“)

### 17. Kleinbetragsrechnung (§ 33 UStDV): Bis 250 € brutto genügen Name und Anschrift des Ausstellers, Ausstellungsdatum, Menge und Art der Leistung, Bruttobetrag und Steuersatz (bzw. Hinweis auf Befreiung). Die Vorsteuer wird aus dem Brutto herausgerechnet (§ 35 UStDV). Kleinbetragsrechnungen und Kleinunternehmer-Rechnungen (§ 34a UStDV, neu seit JStG 2024) fallen nicht unter die E-Rechnungspflicht. Kleinunternehmer-Grenzen: 25.000 € im Vorjahr und 100.000 € im laufenden Jahr.

Sicherheit: mittel

Für SCM betrifft das vor allem eingehende Belege (Tanken, Material, Bewirtung). Im Belege-Modul: Merker 'kleinbetrag' bei Brutto ≤ 250 €, Vorsteuer = Brutto × Satz / (100 + Satz). Die Ausnahme von der E-Rechnungspflicht nach § 33/34a UStDV ist nur über Sekundärquellen belegt, der Wortlaut ist ungeprüft. Den § 19 UStG gibt es als Primärtext im Repo-Cache.

Quellen:

- https://www.gesetze-im-internet.de/ustg_1980/__19.html („steuerfrei, wenn der Gesamtumsatz ... im vorangegangenen Kalenderjahr 25 000 Euro nicht überschritten hat und im laufenden Kalenderjahr 100 000 Euro nicht überschreitet“)
- https://www.spendesk.com/de/blog/kleinbetragsrechnung/ („Kleinbetragsrechnung bis 250 Euro: Pflichtangaben und E-Rechnung-Ausnahme“)
- https://www.dws-medien.de/var/assets/%C3%96ffentlich/Hinweise/MI_209_Hinweise.pdf („für Kleinbetragsrechnungen (§ 33 UStDV), Fahrausweise (§ 34 UStDV) und Kleinunternehmer-Rechnungen (§ 34a UStDV) ab 2025 keine Pflicht zur E-Rechnung“)
- https://www.haufe.de/id/norm/umsatzsteuer-durchfuehrungsverordnung-34a-rechnungen-von-kleinunternehmern-HI775669_p34a.html („§ 34a UStDV Rechnungen von Kleinunternehmern“)

### 18. Grundlagen fürs Mahnwesen: Bei Geldforderungen kommt der Schuldner spätestens 30 Tage nach Fälligkeit und Zugang der Rechnung in Verzug, Verbraucher nur bei Hinweis in der Rechnung (§ 286 Abs. 3 BGB). Verzugszinsen betragen 5 Prozentpunkte über dem Basiszinssatz, ohne Verbraucherbeteiligung 9 Prozentpunkte (§ 288 Abs. 1, 2 BGB). Gegenüber Unternehmern kommt eine Pauschale von 40 € hinzu (§ 288 Abs. 5 BGB).

Sicherheit: hoch

Die Vorschriften gelten seit Jahren unverändert, waren aber aus der Sandbox nicht abrufbar (Proxy 403). Den Basiszinssatz setzt die Bundesbank zum 1.1. und 1.7. neu fest, deshalb als Einstellung mit Gültigkeitsdatum pflegen. Mahnungen sind Geschäftsbriefe (6 Jahre aufbewahren) und dürfen die Rechnung nicht ändern.

Quellen:

- https://www.gesetze-im-internet.de/bgb/__286.html („(3) Der Schuldner einer Entgeltforderung kommt spätestens in Verzug, wenn er nicht innerhalb von 30 Tagen nach Fälligkeit und Zugang einer Rechnung ... leistet; dies gilt gegenüber einem Schuldner, der Verbraucher ist, nur, wenn auf diese Folgen in der Rechnung ... besonders hingewiesen worden ist.“)
- https://www.gesetze-im-internet.de/bgb/__288.html („(2) Bei Rechtsgeschäften, an denen ein Verbraucher nicht beteiligt ist, beträgt der Zinssatz für Entgeltforderungen neun Prozentpunkte über dem Basiszinssatz. ... (5) ... Anspruch auf Zahlung einer Pauschale in Höhe von 40 Euro.“)

### 19. Repo-Kontext: Rechnungssteller ist laut Impressum Blacksnapper Consulting, Andreas Mattolat, Hüttenweg 4, 21516 Tramm, USt-IdNr. DE265142237. Ob regelbesteuert wird (19 % USt), ist noch offen. Das Merkblatt nennt außerdem ein BMF-Schreiben zur E-Rechnung vom 15.10.2026, das ich nicht unabhängig prüfen konnte.

Sicherheit: mittel

Fundstellen: /home/user/Web-Projekte/webseiten/scm-creatives/PLATZHALTER.md Z. 25 und Z. 121 ('Bestätigen, dass SCM (Blacksnapper Consulting) regelbesteuert ist'), /home/user/Web-Projekte/webseiten/scm-creatives/merkblatt/build_merkblatt.py Z. 55 ('BMF-Schreiben zur E-Rechnung vom 15.10.2024, 15.10.2025 und 15.10.2026'). Primärtexte im Cache: /home/user/Web-Projekte/.preview-cache/scm/steuern/gesetze/ (§ 14 UStG als buzer-ustg-14.html, § 147 AO, § 19 und § 27 UStG).

Quellen:

- file:///home/user/Web-Projekte/webseiten/scm-creatives/PLATZHALTER.md („Impressum: Blacksnapper Consulting, Andreas Mattolat, Hüttenweg 4, 21516 Tramm, USt-IdNr. DE265142237“)
