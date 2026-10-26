# PDF-Erzeugung, Unterschrift, Manipulationsschutz

Recherche für SCM Studio, Stand 26.10.2026 (Websuche + npm-Registry, je Thema ein Rechercheur). Aussagen mit Sicherheit "mittel" vor dem Livegang an der Quelle prüfen.

## Zusammenfassung

Empfehlung: @react-pdf/renderer 4.9.0 als einzige PDF-Engine für alle sechs Dokumente. Für die E-Rechnung kommt @e-invoice-eu/core 3.4.2 dazu (ZUGFeRD/Factur-X Profil EN 16931, PDF/A-3). Nachbearbeitung mit @cantoo/pdf-lib 2.11.1, dem gepflegten Fork; das Original pdf-lib wurde zuletzt 2022 veröffentlicht. Die Unterschrift läuft über signature_pad 5.1.4 im Browser. Danach rendert der Server das Dokument neu, mit der Unterschrift als Vektor und einem Prüfprotokoll. Optional kommt ein PAdES-Siegel per @signpdf 4.0.0 und ein RFC-3161-Zeitstempel dazu. Abgelegt wird nur anfügend: privater Bucket mit Insert-only-Regeln, Audit-Tabelle mit Hash-Kette, optional ein WORM-Bucket mit S3 Object Lock.

Lokal geprüft im Scratchpad:
- Eine Testapp mit Next 16.4.3, React 19.3.1 und Turbopack-Build. Der Route Handler liefert ein PDF/A-3b mit eingebetteter Schrift: erster Aufruf 0,40 s, danach 27 ms.
- Eine zweiseitige Rechnung mit 38 Positionen: Tabellenkopf wiederholt sich auf Seite 2, Fußzeile zeigt „Seite x / y“, das SCM-Logo ist als Vektor aus logo-dark.svg drin (#0E0E11 und #FF3B21 auf Weiß).
- e-invoice-eu hängt factur-x.xml mit AFRelationship /Alternative an und schreibt die XMP-Metadaten (pdfaid 3/B, fx:ConformanceLevel „EN 16931“) sowie die OutputIntent.
- Das PAdES-Siegel prüft pdfsig als „Signature is Valid“, die PDF/A-Metadaten bleiben erhalten.

Drei Stolpersteine gefunden:
1. lineHeight auf <Page> lässt absolut positionierte Fußzeilen verschwinden und lässt Überschriften überlappen.
2. Die variable Archivo-woff2 wird eingebettet, die Buchstaben bleiben aber unsichtbar.
3. Die Courier-Prime-woff2 bricht mit einem Fehler ab.

Deshalb statische TTF/OTF-Dateien über die Asset-Bridge holen.

Chromium (puppeteer-core 25.16 oder playwright-core 1.64 mit @sparticuz/chromium 153) passt technisch auf Vercel: rund 67 MB komprimiert, 209 MB entpackt. Es braucht aber mindestens 1600 MB RAM, hat mehrere Sekunden Kaltstart und erzeugt kein PDF/A. Das ist nur Plan B.

pdfme 6.2.8 eignet sich später, wenn das Team Vorlagen ohne Code selbst gestalten soll (WYSIWYG-Designer, Tabellen-Plugin). PDF/A kann es nicht.

## Einzelergebnisse

### 1. @react-pdf/renderer 4.9.0 ist die aktuelle Version (Stand 27.08.2026) und erlaubt React ^19.0.0 als Peer-Dependency. Offiziell ist React 19 seit v4.1.0 unterstützt.

Sicherheit: hoch

npm view: version 4.9.0, peerDependencies react "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0", Abhängigkeit pdfkit 0.20.1. Laut Kompatibilitätsseite von react-pdf.org: React 19 seit v4.1.0. Der Hinweis zu Next < 14.1.1 (Absturz, serverComponentsExternalPackages nötig) ist für Next 16 veraltet. Lokal geprüft: next@16.4.3 + react@19.3.1 + react-dom@19.3.1, `next build` (Ausgabe „Next.js 16.4.3 (Turbopack)“) ohne Fehler; GET /api/rechnung liefert HTTP 200 und ein PDF mit eingebetteter Schrift (Inter, CID Type 0C). Erster Aufruf 0,40 s, zweiter 0,027 s.

Quellen:

- https://www.npmjs.com/package/@react-pdf/renderer („version 4.9.0; peerDependencies: react ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 (npm view, 26.10.2026)“)
- https://react-pdf.org/compatibility („compatible with React 16 (16.8.0 or later), React 17, React 18 and React 19 (since v4.1.0) (Auszug laut Suchergebnis)“)
- /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/nextpoc/app/api/rechnung/route.tsx („Eigener Test: ▲ Next.js 16.4.3 (Turbopack) … ƒ /api/rechnung → HTTP 200 time 0.399632s; 2nd call 0.026783s“)

### 2. Next.js 16.4.3 führt @react-pdf/renderer, @sparticuz/chromium, @sparticuz/chromium-min, puppeteer-core und playwright-core bereits ab Werk als serverExternalPackages. Eigene Einträge sind nicht nötig. Eigene Schriftdateien sollte man per outputFileTracingIncludes ins Function-Bundle zwingen.

Sicherheit: hoch

Die Liste steht in der Datei dist/lib/server-external-packages.jsonc des Pakets next@16.4.3. Der lokale Build hat die pdfkit-Daten automatisch ins Bundle aufgenommen (15 Dateien inkl. sRGB_IEC61966_2_1.icc, das für PDF/A gebraucht wird; route.js.nft.json). Muster: next.config.ts → outputFileTracingIncludes: { '/api/dokumente/**': ['./assets/fonts/**/*'] }. Schriften im Code mit path.join(process.cwd(), 'assets/fonts/…') registrieren. Der Route Handler braucht `export const runtime = 'nodejs'`. Bei der Antwort `new Response(new Uint8Array(buf))` verwenden, sonst gibt es einen BodyInit-Typfehler.

Quellen:

- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages („server-external-packages.jsonc (next@16.4.3): "@react-pdf/renderer", … "@sparticuz/chromium", "@sparticuz/chromium-min", … "playwright-core", … "puppeteer-core"“)
- /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/nextpoc/next.config.ts („Eigener Build ohne manuelles Include: pdfkit data files traced: 15 … pdfkit/js/data/sRGB_IEC61966_2_1.icc“)

### 3. react-pdf erzeugt PDF/A direkt: die Document-Prop `conformance` akzeptiert 'PDF/A-1', 'PDF/A-1b', 'PDF/A-2', 'PDF/A-2b', 'PDF/A-3' und 'PDF/A-3b'. pdfkit schreibt dann XMP mit pdfaid und eine OutputIntent.

Sicherheit: hoch

In react-pdf 4.9.0 wird `conformance` als pdfkit-`subset` weitergereicht und die PDF-Version automatisch auf 1.7 gesetzt (1.4 bei PDF/A-1). pdfkit 0.20.1 kann außerdem Dateianhänge mit AFRelationship (doc.file), das react-pdf aber nicht nach außen anbietet. Deshalb wird das XML nachträglich angehängt (siehe e-invoice-eu). Eigener Test: out-plain.pdf hat pdfaid part 3 / conformance B, OutputIntents vorhanden, /Lang de-DE. PDF/A-3 erlaubt Transparenz, daher ist das PNG/SVG der Unterschrift kein Problem. Grenze: Standardschriften (Helvetica) werden nicht eingebettet. Für PDF/A muss jede genutzte Schrift per Font.register eingebunden sein.

Quellen:

- https://unpkg.com/@react-pdf/renderer@4.9.0/lib/react-pdf.js („// PDF/A-1 requires PDF 1.4; PDF/A-2/3 require PDF 1.7. pdfkit defaults to 1.3, which skips writing the metadata that marks the file as PDF/A. … subset: conformance,“)
- https://unpkg.com/@react-pdf/types/pdf.d.ts („export type PDFConformance = | 'PDF/A-1' | 'PDF/A-1b' | 'PDF/A-2' | 'PDF/A-2b' | 'PDF/A-3' | 'PDF/A-3b';“)
- https://unpkg.com/pdfkit@0.20.1/CHANGELOG.md („Add support for PDF/A-1b, PDF/A-1a, PDF/A-2b, PDF/A-2a, PDF/A-3b, PDF/A-3a … Fix PDF/A3 compliance of attachments … Load the PDF/A ICC profile from disk only when needed in Node“)

### 4. Für ZUGFeRD/Factur-X nimmt @e-invoice-eu/core 3.4.2 (22.10.2026) das react-pdf-PDF entgegen, hängt factur-x.xml an und macht daraus PDF/A-3. Im lokalen Test hat das funktioniert.

Sicherheit: hoch

Aufruf: new InvoiceService(console).generate(invoiceUbJson, { format: 'Factur-X-EN16931', lang: 'de-de', pdf: { buffer, filename, mimetype: 'application/pdf' } }). Die Rechnungsdaten werden im internen UBL-JSON-Format übergeben ('ubl:Invoice' mit cbc:/cac:-Feldern; Beträge als String plus '@currencyID'). Intern nutzt die Bibliothek @cantoo/pdf-lib und setzt: Anhang factur-x.xml (bei XRECHNUNG xrechnung.xml) mit AFRelationship Alternative, Catalog /AF, OutputIntent GTS_PDFA1 mit sRGB-ICC, MarkInfo, StructTreeRoot, Trailer-ID, XMP mit pdfaid und fx:-Extension-Schema. Ergebnis des eigenen Tests (out-facturx.pdf, 2 Seiten, 39 KB): attachments {'factur-x.xml': 46046}, AFRelationship /Alternative, Subtype /text/xml, pdfaid:part 3, conformance B, fx:DocumentType INVOICE, fx:Version 1.0, fx:ConformanceLevel 'EN 16931', alle Schriften eingebettet. Laufzeit lokal: Rendern 573–657 ms, Factur-X-Schritt rund 400 ms. Achtung: Title, Author und Creator werden überschrieben („Blacksnapper Consulting: Invoice …“); anpassbar über options.customMetadata. Alternative node-zugferd ist WIP (0.1.1-beta.1, zuletzt 08/2025), daher nicht empfohlen.

Quellen:

- https://www.npmjs.com/package/@e-invoice-eu/core („Factur-X/ZUGFeRD (all profiles including XRECHNUNG) with full PDF/A support … The format is a Factur-X/ZUGFeRD format and `data` was **not** specified [→ Argument pdf erforderlich]“)
- https://github.com/gflohr/e-invoice-eu („Generate e-invoices (E-Rechnung in German) conforming to EN16931 (Factur-X/ZUGFeRD, UBL, CII, XRechnung aka X-Rechnung) from LibreOffice Calc/Excel data or JSON.“)
- /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/poc/run.tsx („Eigener Test: AFRelationship /Alternative factur-x.xml /text/xml; OutputIntents ['/GTS_PDFA1']; pdfaid:part ['3']; fx:ConformanceLevel ['EN 16931']“)
- https://www.npmjs.com/package/node-zugferd („🚨 Caution [WIP] This package is still under development.“)

### 5. Rechtsrahmen E-Rechnung: ZUGFeRD ab Version 2.0.1 ist zulässig, außer den Profilen MINIMUM und BASIC-WL. Ziel ist das Profil EN 16931 (Comfort). Aktuell ist ZUGFeRD 2.5 / Factur-X 1.09 (Juni 2026) auf Basis von EN 16931-1:2026.

Sicherheit: mittel

Die Ausgabe von e-invoice-eu verwendet urn:cen.eu:en16931:2017 als Guideline-ID. Mit dem Validator prüfen (KoSIT oder Mustang), ob das unter ZUGFeRD 2.5 / EN 16931-1:2026 noch akzeptiert wird. Laut Suche gibt es ein neues BMF-Schreiben vom 15.10.2026. Den Inhalt prüft der Buchhaltungs-Agent. Für öffentliche Auftraggeber das Profil XRECHNUNG wählen (format 'Factur-X-XRechnung', dann xrechnung.xml).

Quellen:

- https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html („XRechnung und ZUGFeRD ab Version 2.0.1 (mit Ausnahme der Profile MINIMUM und BASIC-WL) erfüllen die umsatzsteuerlichen Voraussetzungen (Auszug laut Suchergebnis)“)
- https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/Umsatzsteuer-Anwendungserlass/2025-10-15-einfuehrung-obligatorische-e-rechnung.pdf?__blob=publicationFile&v=5 („Das hybride Format ZUGFeRD ab Version 2.0.1 – ausgenommen die Profile MINIMUM und BASIC-WL – beruht auf der Normenreihe EN 16931 (Auszug laut Suchergebnis)“)
- https://www.ferd-net.de/fileadmin/user_upload/FeRD/f%C3%BCr_FeRD-Meldungen/20260610_ZUGFeRD_2_5_Factur-X_1_09_Press_Release_DE.pdf („ZUGFeRD 2.5 / Factur-X 1.09 … Profile EXTENDED und EN 16931 orientieren sich an der überarbeiteten Norm EN 16931-1:2026 (Auszug laut Suchergebnis)“)
- https://www.ferd-net.de/standards/zugferd-faq („Um EU-konforme elektronische Rechnungen zu erstellen, ist die Rechnungsstellung mit dem ZUGFeRD-Profil EN 16931 zu empfehlen.“)

### 6. Seitenumbruch, Tabellen und das SVG-Logo funktionieren in react-pdf mit Bordmitteln. Zwei Stolpersteine: lineHeight auf <Page> lässt die absolut positionierte Fußzeile verschwinden, und variable oder bestimmte woff2-Schriften gehen nicht.

Sicherheit: hoch

Getestete Muster: Tabellenkopf als <View fixed> (wiederholt sich auf jeder Seite), Zeilen mit wrap={false} (werden nicht zerteilt), Summenblock mit wrap={false} minPresenceAhead={60}, Fußzeile als <View fixed style={{position:'absolute',bottom:32,left:56,right:56}}> mit <Text render={({pageNumber,totalPages}) => `Seite ${pageNumber} / ${totalPages}`}/>. Logo: SVG-Pfade aus webseiten/scm-creatives/public/img/logo-dark.svg (viewBox '90 90 1020 357.72', zwei Pfade #0E0E11 und #FF3B21 mit Q-Kurven) als <Svg viewBox><Path d fill/></Svg>, wird als Vektor korrekt dargestellt. Fehler 1: `lineHeight: 1.45` auf Page → Fußzeile fehlt komplett, mit fester Höhe fehlt der render-Text, H1 überlappt die Zeile darunter. Lösung: lineHeight nur in Text-Styles setzen. Fehler 2: archivo-var.woff2 (variabel) wird als „Archivo-SemiBold“ eingebettet, die Glyphen sind aber unsichtbar. courier-prime-400-normal.woff2 wirft „Offset is outside the bounds of the DataView“. Lösung: statische TTF/OTF je Schnitt (Archivo Regular/SemiBold/ExtraBold, Courier Prime Regular/Bold) über die Asset-Bridge holen. Font.registerHyphenationCallback(w => [w]) schaltet die englische Silbentrennung ab.

Quellen:

- /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/poc/Rechnung.tsx („Eigener Test t4: pageLH (fehlt) | pageLH_footHeight 'FUSS links' (Seitenzahl fehlt) | textLHonly 'FUSS links Seite 1 / 1'“)
- /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/poc/t5.tsx („Eigener Test: FEHLER Offset is outside the bounds of the DataView (courier-prime woff2); Archivo var woff2 eingebettet als CZZZZZ+Archivo-SemiBold, Text unsichtbar“)
- https://react-pdf.org/advanced#page-breaks („index.d.ts 4.9.0: fixed?: boolean — Render component in all wrapped pages … break?: boolean … minPresenceAhead?: number“)

### 7. Chromium auf Vercel (puppeteer-core 25.16.0 oder playwright-core 1.64.1 mit @sparticuz/chromium 153.0.0) passt in das 250-MB-Limit. Es braucht aber 1600 MB RAM oder mehr, hat einen spürbaren Kaltstart und erzeugt kein PDF/A. Deshalb nur Plan B.

Sicherheit: hoch

Gemessen: chromium.br ist 67 MB groß (Paket gesamt 67 MB) und entpackt 209 MB. Allein das Brotli-Entpacken dauert lokal 2,5 s auf 4 Kernen; auf 1 vCPU (Vercel Standard) ist mit mehreren Sekunden Kaltstart plus Browserstart zu rechnen. Die Engine verlangt Node ^22.17.0 || >=24. Das volle Paket enthält nur x64. Die -min-Variante lädt das Paket zur Laufzeit per URL (z. B. aus Vercel Blob). Vercel-Limits: 250 MB unkomprimiert; Hobby max. 2 GB / 1 vCPU, Pro bis 4 GB / 2 vCPU; maxDuration Standard 300 s, Pro bis 800 s. Code-Muster: const browser = await puppeteer.launch({ args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }), executablePath: await chromium.executablePath(), headless: 'shell' }); await page.setContent(html,{waitUntil:'networkidle0'}); await page.pdf({ format:'A4', printBackground:true, tagged:true, preferCSSPageSize:true }). Vorteil: Tailwind/HTML und variable Webfonts wiederverwendbar. Nachteil: kein PDF/A, Ghostscript zum Umwandeln fehlt auf Vercel, die Chromium-Version muss zur Puppeteer-Version passen.

Quellen:

- https://github.com/Sparticuz/chromium („You should allocate at least 512 MB of RAM to your instance; however, 1600 MB (or more) is recommended. … If your vendor does not allow large deployments (since `chromium.br` is over 50 MB), you will need to host the `chromium-v#-pack.tar` separately and use the @sparticuz/chromium-min package.“)
- https://vercel.com/docs/functions/limitations („maximum uncompressed size is 250 MB … Hobby: 2 GB / 1 vCPU; Pro/Enterprise bis 4 GB / 2 vCPU … maxDuration default 300s, Pro max 800s (Auszug laut Suchergebnis)“)
- /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/pkgs/x_sparticuz-chromium-153.0.0/package/README.md („Eigene Messung: chromium decompressed MB 209.0 ms 2467“)

### 8. pdfme 6.2.8 (23.10.2026) ist ein vorlagenbasierter Generator mit WYSIWYG-Designer und Tabellen-Schema mit Seitenumbruch. PDF/A und Dateianhänge kann es nicht. Sinnvoll erst, wenn das Team Vorlagen selbst gestalten soll.

Sicherheit: mittel

Das Tabellen-Schema gibt es seit v4.5.0, es kommt aus @pdfme/schemas und wird in Node per plugins übergeben. Dynamischer Umbruch geht nur mit leerem basePdf (Breite, Höhe, Padding); Kopf- und Fußzeilen über staticSchema. Schriften werden über options.font übergeben, Standard ist Roboto. Nutzt den eigenen Fork @pdfme/pdf-lib. Für SCM ist react-pdf flexibler (Komponenten, Bedingungen, gleiche TSX-Welt wie die App).

Quellen:

- https://pdfme.com/docs/tables („table schema … available since V4.5.0 … A blank basePdf with width, height, and padding is the setup that enables dynamic layout (Auszug laut Suchergebnis)“)
- https://pdfme.com/docs/headers-and-footers („Headers and footers can be pinned to every page with a staticSchema property on basePdf (Auszug laut Suchergebnis)“)
- https://www.npmjs.com/package/@pdfme/generator („version 6.2.8, time.modified 2026-10-23“)

### 9. pdf-lib 1.17.1 wurde zuletzt 2022 veröffentlicht und gilt als unbetreut. Für Nachbearbeitung (Anhänge, Metadaten, Stempel) den gepflegten Fork @cantoo/pdf-lib 2.11.1 verwenden, den auch e-invoice-eu nutzt.

Sicherheit: hoch

pdf-lib eignet sich nicht für Layouts, weil es keinen Textumbruch und keine Tabellen kann. Wer mit pdf-lib nachträglich Text in ein PDF/A-Dokument zeichnet, bricht PDF/A, wenn die Schrift nicht eingebettet ist (StandardFonts). Deshalb Unterschrift und Prüfprotokoll nicht hineinstempeln, sondern das Dokument mit react-pdf neu rendern.

Quellen:

- https://www.npmjs.com/package/pdf-lib („version 1.17.1, time.modified 2022-05-12“)
- https://www.npmjs.com/package/@cantoo/pdf-lib („version 2.11.1, time.modified 2026-09-15“)

### 10. Für Dienstleistungsvertrag und Einwilligung reicht rechtlich eine einfache elektronische Signatur (EES), weil beide formfrei sind. Die Beweislast trägt aber SCM. Deshalb braucht es einen guten Nachweis: Hash der gelesenen Fassung, E-Mail-OTP, Serverzeit, IP, User-Agent, Prüfprotokoll. Wo das Gesetz Schriftform verlangt (§ 126 BGB), hilft nur eine qualifizierte Signatur (§ 126a).

Sicherheit: mittel

Einwilligung von Personen im Video: Für die Verbreitung von Bildnissen gilt § 22 KUG, für die Verarbeitung Art. 7 Abs. 1 DSGVO. Beide schreiben keine Form vor, verlangen aber einen Nachweis. Ein Widerruf nach Art. 7 Abs. 3 DSGVO muss im Datenmodell abbildbar sein. Bei Minderjährigen müssen die Eltern zustimmen. Die zitierten Gesetzeswortlaute habe ich in dieser Sitzung nicht abgerufen; sie stammen aus meinem Wissen. Bitte vor dem Livegang juristisch prüfen.

Quellen:

- https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32014R0910 („Art. 25 Abs. 1 eIDAS: Einer elektronischen Signatur darf die Rechtswirkung und die Zulässigkeit als Beweismittel in Gerichtsverfahren nicht allein deshalb abgesprochen werden, weil sie in elektronischer Form vorliegt oder weil sie die Anforderungen an qualifizierte elektronische Signaturen nicht erfüllt.“)
- https://www.gesetze-im-internet.de/bgb/__126a.html („Soll die gesetzlich vorgeschriebene schriftliche Form durch die elektronische Form ersetzt werden, so muss der Aussteller der Erklärung dieser seinen Namen hinzufügen und das elektronische Dokument mit einer qualifizierten elektronischen Signatur versehen.“)
- https://www.gesetze-im-internet.de/kunsturhg/__22.html („Bildnisse dürfen nur mit Einwilligung des Abgebildeten verbreitet oder öffentlich zur Schau gestellt werden.“)
- https://eur-lex.europa.eu/eli/reg/2016/679/oj („Art. 7 Abs. 1 DSGVO: Beruht die Verarbeitung auf einer Einwilligung, muss der Verantwortliche nachweisen können, dass die betroffene Person in die Verarbeitung ihrer personenbezogenen Daten eingewilligt hat.“)
- https://opus4.kobv.de/opus4-bib-info/files/18848/Ludwig-Elektronisches_Signieren.pdf („EES … frei richterlich nach § 286 ZPO gewürdigt (Auszug laut Suchergebnis)“)

### 11. Signatur im Browser: signature_pad 5.1.4 direkt in einer Client-Komponente verwenden; der React-Wrapper react-signature-canvas ist nur eine Alpha-Version. Nur die Geometrie der Striche speichern, ohne time und pressure, damit keine biometrischen Daten entstehen.

Sicherheit: hoch

API: new SignaturePad(canvas, { penColor:'#0E0E11', minWidth, maxWidth }), isEmpty(), toData() (PointGroup[] mit points {x,y,pressure,time}), toSVG(), toDataURL('image/png'). Das Canvas muss mit devicePixelRatio skaliert werden. Muster: onFertig(pad.toData().map(g => g.points.map(p => [Math.round(p.x), Math.round(p.y)]))). Im PDF wird die Unterschrift als <Svg viewBox='0 0 600 200'><Polyline points stroke='#0E0E11' strokeWidth={3} fill='none'/></Svg> gezeichnet, also als Vektor. Getestet in vertrag-signiert.pdf.

Quellen:

- https://github.com/szimek/signature_pad („signaturePad.toSVG(); … const data = signaturePad.toData(); … To correctly handle canvas on low and high DPI screens one has to take `devicePixelRatio` into account“)
- https://www.npmjs.com/package/react-signature-canvas („version 1.1.0-alpha.2, time.modified 2025-03-29“)

### 12. Manipulationsschutz in Schichten. (1) Server rendert die finale Fassung mit Unterschrift und Prüfprotokoll neu. (2) Optionales PAdES-Siegel per @signpdf 4.0.0 als inkrementelles Update; PDF/A bleibt erhalten, im Test „Signature is Valid“. (3) SHA-256 und RFC-3161-Zeitstempel. (4) Anfügende Ablage: Bucket nur mit Insert- und Select-Regeln, Audit-Tabelle mit Hash-Kette.

Sicherheit: mittel

Getestet: plainAddPlaceholder({ pdfBuffer, reason, contactInfo, name, location, signatureLength: 8192 }) + new P12Signer(p12, { passphrase }) + signpdf.sign(...). Bei ESM/tsx-Import heißt es `(mod.default ?? mod).sign`. pdfsig: „Signature Type: adbe.pkcs7.detached … Total document signed … Signature Validation: Signature is Valid“. Mit einem selbstsignierten Zertifikat erscheint „Certificate issuer isn't Trusted“: das sichert die Integrität, schafft aber kein Vertrauen beim Empfänger. pypdf meldet „incorrect startxref pointer(3)“, die Datei ist aber lesbar; mit veraPDF prüfen. Für den RFC-3161-Zeitstempel gibt es pkijs 4.0.0 oder @peculiar/asn1-tsp 2.11.1 (Stand Oktober 2026). Supabase-Hinweise: Für Upsert braucht es SELECT und UPDATE; der service key umgeht RLS komplett. Echtes WORM gibt es also nur über eine externe Ablage mit Object Lock, z. B. AWS S3 eu-central-1 im Compliance-Modus.
SQL-Muster:
- create table audit_log(id bigint generated always as identity primary key, dokument_id uuid not null, ereignis text not null, daten jsonb not null, erstellt_am timestamptz default now(), prev_hash text, row_hash text not null);
- Ein BEFORE-INSERT-Trigger mit pg_advisory_xact_lock liest den letzten row_hash und setzt new.row_hash = encode(extensions.digest(coalesce(prev_hash,'')||dokument_id||ereignis||daten::text||erstellt_am::text,'sha256'),'hex').
- BEFORE UPDATE OR DELETE sowie BEFORE TRUNCATE lösen raise exception aus.
- Storage-Regeln nur 'for insert' und 'for select' auf bucket_id='dokumente-final', Upload mit upsert:false.

Quellen:

- https://github.com/vbuch/node-signpdf („import signpdf from '@signpdf/signpdf'; const signedPdf = await signpdf.sign(fs.readFileSync(PATH_TO_PDF_FILE), signer);“)
- /tmp/claude-0/-home-user-Web-Projekte/ccad7eff-784c-5019-94f5-fcf609054df1/scratchpad/poc/sign.tsx („Eigener Test: Signed Ranges: [0 - 15295], [31681 - 32606] - Total document signed - Signature Validation: Signature is Valid. pdfaid ['3'] ['B']“)
- https://supabase.com/docs/guides/storage/security/access-control („To allow overwriting files using the `upsert` functionality you will need to additionally grant `SELECT` and `UPDATE` permissions. … Service keys entirely bypass RLS policies, granting you unrestricted access to all Storage APIs.“)
- https://www.rfc-editor.org/rfc/rfc3161 („A time-stamping service supports assertions of proof that a datum existed before a particular time. (nicht in dieser Sitzung abgerufen)“)
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html („S3 Object Lock … can help prevent Amazon S3 objects from being deleted or overwritten for a fixed amount of time or indefinitely (write-once-read-many, WORM) (nicht in dieser Sitzung abgerufen)“)

### 13. Die Bundle-Größe ist für den empfohlenen Stack unkritisch. Große PDFs (Monatsbericht mit Bildern) sollten aber über den Storage mit signierter URL ausgeliefert werden statt als Function-Antwort.

Sicherheit: mittel

node_modules lokal: @react-pdf 2,6 MB, pdfkit 11 MB, @e-invoice-eu 21 MB (enthält xlsx und ICC), @cantoo 32 MB. Das ist weit unter 250 MB. Vercel begrenzt Request- und Response-Body von Functions auf 4,5 MB. Diese Zahl ist aus meinem Wissen und war über das Vercel-Doku-Tool nicht belegbar, bitte auf der Limits-Seite prüfen. Deshalb festgeschriebene Dokumente im Bucket ablegen und per createSignedUrl ausliefern.

Quellen:

- https://vercel.com/docs/functions/limitations („maximum uncompressed size is 250 MB including layers (Auszug laut Suchergebnis); 4,5-MB-Payload-Limit nicht in dieser Sitzung belegt“)
- https://supabase.com/docs/guides/storage/buckets/fundamentals („Create a signed URL with the createSignedUrl method that can be accessed for a limited time.“)
