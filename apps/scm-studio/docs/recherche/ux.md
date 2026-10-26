# UX, Arbeitsabläufe, Datenschutz (TOMs)

Recherche für SCM Studio, Stand 26.10.2026 (Websuche + npm-Registry, je Thema ein Rechercheur). Aussagen mit Sicherheit "mittel" vor dem Livegang an der Quelle prüfen.

## Zusammenfassung

Etablierte Agentur-Tools haben jeweils einen Schwerpunkt: Planable die Freigaben, Metricool die Berichte, Productive und MOCO die Retainer, Zeiten und Rechnungen, StudioBinder die Drehtage. Für 2 Gründer mit 5 bis 15 Kunden muss SCM Studio diese Tools nicht nachbauen. Es reicht, die Kette Anfrage → Testvideos → Vertrag → Skript → Dreh → Schnitt → Freigabe → Veröffentlichung → Monatsbericht → Rechnung lückenlos abzubilden.

Das Herzstück sind drei Dinge:
1. Eine Produktions-Pipeline, in der jede Karte ein Video ist und nicht ein Kunde.
2. Ein Kontingent pro Kunde und Monat (Soll aus dem Paket 4/8/12, Ist aus freigegebenen Videos, Regel für den Übertrag).
3. Eine Startseite „Heute“ mit Drehs, überfälligen Freigaben, Kontingent-Ampeln und offenen Rechnungen.

**Muss (V1):** Kunden und Leads, Produktion, Kontingent, Skript-Editor mit KI-Entwurf, Drehplan mobil, Kalender, Angebote, Rechnungen inklusive Monats-Serienrechnung, Belege, PDF-Dokumente, Cmd+K, 2FA.

**Soll (V2):** Freigabelinks ohne Login, manuelle Video-Zahlen mit automatischem Monatsbericht-Entwurf, einfache Zeiterfassung für Rentabilität, Einwilligungs-Register, Lead-Webhook aus dem bestehenden Quiz (`api/anfrage.js`).

**Später:** Instagram- und TikTok-API, Kundenportal, direktes Posten, Best-Time-Heatmap, Konkurrenzanalyse, mehrstufige Freigaben.

**UX:** drei Ansichten pro Datenmenge (Board, Liste, Kalender), cmdk 1.1.1 als Kommandozeile mit deutschen Synonymen, ein globaler Plus-Button zur Schnellerfassung (Beleg-Foto, Idee, Lead) und eine Bottom-Navigation für den Einsatz am Set.

**Datenschutz und Technik:**
- TOTP-2FA verpflichtend, in Supabase per aal2-Claim in RLS erzwungen. Die LfD Niedersachsen hält 2FA bei hohem Risiko für notwendig und bevorzugt TOTP.
- Registrierung nur per Einladung, eine Rolle „admin“, ein Audit-Log.
- OpenAI ohne personenbezogene Daten und mit `store: false`. Abuse-Logs bleiben standardmäßig bis zu 30 Tage; EU-Residency und ZDR gibt es nur mit Freigabe durch OpenAI.
- Löschkonzept: Leads 12 Monate nach dem letzten Kontakt, Geschäftsbriefe 6 Jahre, Buchungsbelege 8 Jahre.
- AV-Verträge mit Supabase (supabase.com/legal/dpa), Vercel (DPA, DPF), OpenAI und Google. Für Google ist Workspace statt privatem Gmail zu prüfen.

Die Paketversionen sind am 26.10.2026 per npm-Registry geprüft: next 16.4.3, react 19.3.1, @supabase/ssr 0.12.7, @supabase/supabase-js 2.118.0, cmdk 1.1.1, @dnd-kit/react 0.5.1.

## Einzelergebnisse

### 1. Planable kennt drei Freigabe-Stufen: keine/optional, Pflichtfreigabe (Pro) und mehrstufig (Enterprise). Die Pflichtfreigabe gilt als Standard für Agentur und Kunde. Dazu kommen ein Arbeitsbereich pro Kunde, vier Ansichten (Kalender, Feed, Liste, Raster) und interne Notizen.

Sicherheit: hoch

Folgerung für SCM: Eine einstufige Pflichtfreigabe reicht. Ein Video kann erst auf „Geplant/Veröffentlicht“ gehen, wenn eine Kundenfreigabe protokolliert ist (wer, wann, über welchen Kanal, z. B. WhatsApp, Link, mündlich). Mehrstufige Freigaben braucht ein 2-Personen-Team nicht. Übernommen werden die Trennung in interne und kundensichtbare Kommentare, Kalender per Drag and Drop und eigene Labels. Achtung: Planstufen und Preise sind auf Planable-Seiten uneinheitlich beschrieben.

Quellen:

- https://planable.io/guides/content-approvals-in-planable/ („Posts cannot be scheduled or published until at least one person has approved them. This is the standard setup for agency-client workflows. ... Multiple approval stages run in sequence.“)
- https://planable.io/blog/agency-workflow-software/ („Create a separate workspace for each client and customize the entire process, from content approval workflows to label colors.“)
- https://planable.io/pricing („Planstufen-Gates (Pro/Enterprise) laut Guide; aktuelle Limits auf der Preisseite prüfen“)

### 2. Metricool ist im Reporting führend. Kennzahlen lassen sich pro Marke wählen, Berichte tragen das Agentur-Branding (Hintergrund, Farben, Logo) und werden automatisch per Zeitplan verschickt. Es gibt fertige Vorlagen für Konkurrenzanalyse und beste Posting-Zeiten sowie eine Heatmap im Planer.

Sicherheit: mittel

Folgerung: Der Monatsbericht kommt als PDF in Weiß mit SCM-Logo und wird am Monatsersten automatisch als Entwurf erzeugt. Ein Gründer ergänzt 3 Learnings und den Plan für den Folgemonat und gibt ihn dann frei. Kennzahlen-Set pro Kunde wählbar (Views, Reichweite, Wiedergabezeit, Saves, Shares, Follower-Zuwachs, Top-Video, Business-Kennzahl wie Anfragen oder Bewerbungen). Heatmap und Konkurrenzanalyse kommen erst mit API-Daten (Später). Planbezeichnungen und Preise widersprechen sich auf Metricool-Seiten.

Quellen:

- https://metricool.com/landing-reports-agencies/ („choose the metrics that matter for each brand, add your agency's look and feel, and schedule reports to send automatically“)
- https://metricool.com/customized-social-media-reports („Advanced or Custom plan users can customize report templates, changing the background, colors and logo.“)
- https://help.metricool.com/en/article/1p20lkd/ („pre-built templates for competitor analysis, posting times, content ideas, multi-period comparisons“)

### 3. Productive bildet Retainer als wiederkehrendes Budget ab (Intervall wöchentlich bis jährlich, offenes Enddatum). Wird ein Retainer-Deal gewonnen, legt das System automatisch ein Budget mit sich wiederholenden Perioden an. Ein Übertrag von Retainer-Stunden ist als Funktion angekündigt, die Mechanik ist aber nicht dokumentiert gefunden.

Sicherheit: hoch

Übertragen auf SCM: Wechselt ein Lead auf „Gewonnen“, wird ein Vertrag mit Paket (4/8/12 Videos) angelegt. Daraus entsteht automatisch je Monat eine Kontingent-Periode mit Soll, Übertrag aus dem Vormonat und Ist. Die Übertrag-Regel wird pro Vertrag festgelegt (ja/nein, maximal n Videos, verfällt nach x Monaten). Die 3 Testvideos laufen als eigenes Kontingent mit Soll 3, ohne Rechnung.

Quellen:

- https://help.productive.io/en/articles/2179582-recurring-budgets („Use recurring budgets to manage retainer or maintenance projects ... weekly, biweekly, monthly, quarterly, semiannually, annually“)
- https://help.productive.io/en/articles/14998906-retainer-deals („A retainer deal is for ongoing work billed on a recurring basis ... When won, creates a recurring budget with automatically repeating periods.“)
- https://www.teamwork.com/blog/retainer-management-software/ („lists hours rollover, budget overrun and profit margin forecasts as Productive's retainer features (Drittquelle)“)

### 4. MOCO, eine Agentursoftware aus DACH, deckt einen durchgängigen Prozess ab: Lead → Angebot → Projekt → Zeiterfassung → Rechnung. Abgerechnet wird pauschal, nach Aufwand oder als Retainer, dazu kommen XRechnung, DATEV-Anbindung und eine Mobile-App für Zeiterfassung und Spesen-Scan. Nutzer kritisieren wenig anpassbare Berichte und eine schwache Mobile-App. Eine Serienrechnung fehlt laut OMR.

Sicherheit: mittel

Folgerung: Für Monatspakete ist eine Serien- oder Monatsrechnung ein Muss (aus dem Vertrag erzeugt, Entwurf am Monatsersten). Der Beleg-Scan per Handykamera ist das richtige Muster zur Schnellerfassung. Zeiterfassung ist bei Pauschalpaketen kein Abrechnungs-, sondern ein Rentabilitäts-Werkzeug (Stunden und Euro je Video und je Kunde), daher Soll statt Muss. Die Preisangaben in den Quellen widersprechen sich (Pro 19 € oder 21 €).

Quellen:

- https://omr.com/de/reviews/contenthub/beste-agentursoftware („durchgängiger Prozess: Lead, Angebot, Projekt, Zeiterfassung, Rechnung ... Flexible Abrechnung (Pauschal, nach Aufwand, Retainer) und XRechnung“)
- https://www.ki-syndikat.de/tools/moco/ („Zeiterfassung, Projektmanagement, Angebots- und Rechnungserstellung und Reporting in einem Tool ... DATEV-Integration, Datenhaltung in der Schweiz und EU“)
- https://omr.com/de/reviews/product/moco/all/5 („Kritisiert werden Einschränkungen bei der Anpassung von Berichten und der Funktionalität der mobilen App (Zusammenfassung Nutzerbewertungen)“)

### 5. StudioBinder ist die Referenz für Drehtage. Die Tagesdispo (Call Sheet) enthält Drehdetails, Kontakte, Wetter und Karten, wird per E-Mail und SMS verschickt und zeigt den Lese- und Bestätigungsstatus. Der Drehplan hat per Drag and Drop sortierbare Szenen mit Tagesumbrüchen. Shotlisten enthalten Einstellungsgröße, Art und Kamerabewegung und werden nur einmal erfasst.

Sicherheit: mittel

Folgerung für SCM (kleine Drehs beim Kunden vor Ort): eine schlanke Drehplan-Ansicht pro Drehtermin mit:
- Adresse als Maps-Link und Ansprechpartner als tel:-Link
- Videos und Skripte des Tages, die Shotlist wird automatisch aus den Skript-Abschnitten abgeleitet (Hook, Wiedererkennen, Steigerung, Pointe, Aufruf) und lässt sich am Set abhaken
- Checkliste Technik und Requisiten
- Status der Einwilligungen pro Person

Wetter und Versand an Dritte kommen später. Belege zur aktuellen StudioBinder-Mobile-App sind dünn, eine Quelle ist von 2015.

Quellen:

- https://www.studiobinder.com/call-sheet-app/ („each call sheet can be populated with shoot day details, contact information, weather forecasts, and maps“)
- https://www.studiobinder.com/blog/tag/pre-production/ („scripts can be uploaded and scenes reordered by drag-and-drop, with day breaks, banners, and locations and talent assigned to scenes“)
- https://amt-lab.org/reviews/2019/12/streamlining-the-film-production-process-with-studiobinder-combining-pre-production-management-tools („each scene can be given a number of shots, camera movement, and shot type and size (Review 2019)“)

### 6. Die interne SCM-Recherche (21.10.2026) beschreibt bereits einen Kunden-Lebenszyklus in 11 Phasen und zwei Pipelines. Das Anfrage-Quiz der Website liefert strukturierte Lead-Felder samt A/B/C-Bewertung. Beides sollte das Datenmodell der App direkt übernehmen.

Sicherheit: hoch

Lead-Felder aus webseiten/scm-creatives/api/anfrage.js: name, betrieb, kontaktweg (anruf/whatsapp/email), telefon (normalisiert auf +49), email, branche (gastronomie/immobilien/handwerk/unternehmen/andere + Freitext andere), ziel, paket, extras, start (sofort/1-3/spaeter), region bzw. ort, Bewertung A/B/C.

Pipelines aus der Recherche:
- Vertrieb: Neue Anfrage → Kontakt aufgenommen → Erstgespräch gebucht → Erstgespräch geführt → Angebot versendet → Verhandlung → Gewonnen | Verloren (Grund pflegen)
- Kundenbetreuung: Onboarding → Skript → Dreh geplant → Schnitt/Feedback → Live → Reporting → Verlängerung fällig

Für SCM fehlt die Stufe „Testvideos (3 kostenlos)“ zwischen Erstgespräch und Angebot. Laut Briefing landen Anfragen heute nur per E-Mail und es gibt kein CRM.

Quellen:

- file:///home/user/Web-Projekte/.preview-cache/scm/recherche/ux-kundenmanagement.md („Neue Anfrage → Kontakt aufgenommen → Erstgespräch gebucht → Erstgespräch geführt → Angebot versendet → Verhandlung → Gewonnen (→ Onboarding) | Verloren (Grund pflegen!)“)
- file:///home/user/Web-Projekte/webseiten/scm-creatives/api/anfrage.js („const tier = big && start === 'sofort' ? 'A' : (start === 'sofort' || start === '1-3' || big) ? 'B' : 'C';“)
- file:///home/user/Web-Projekte/.preview-cache/scm/recherche/briefing.md („Einstieg: 3 kostenlose Testvideos ... Anfragen landen: nur per E-Mail (kein CRM)“)

### 7. cmdk 1.1.1 (14.03.2025, Peer-Dependency react ^18 oder ^19) ist der Standard für eine Cmd+K-Kommandozeile in React. Command.Dialog baut auf Radix Dialog auf und wird über open und onOpenChange gesteuert. Mit keywords lassen sich Aliase für Suche und Ranking hinterlegen.

Sicherheit: hoch

Muster für SCM: Gruppen „Springen zu“ (Kunden, Videos, Rechnungen), „Neu“ (Lead, Video, Skript, Beleg, Rechnung, Termin) und „Aktionen“ (Skript mit KI für …, Monatsbericht erzeugen für …). Deutsche Synonyme kommen als keywords hinzu, z. B. Beleg: ["Quittung","Ausgabe","Kassenbon"], Video: ["Reel","Clip","Short"].

Code-Kern:
<Command.Dialog open={open} onOpenChange={setOpen} label="Befehlsmenü"><Command.Input placeholder="Suchen oder Befehl …"/><Command.List><Command.Empty>Nichts gefunden.</Command.Empty><Command.Group heading="Neu"><Command.Item keywords={["Quittung","Ausgabe"]} onSelect={…}>Beleg erfassen</Command.Item></Command.Group></Command.List></Command.Dialog>

Umschalten per keydown-Listener auf (e.metaKey || e.ctrlKey) && e.key === 'k'. Seit März 2025 gab es kein Release mehr: stabil, aber wenig aktiv.

Quellen:

- https://www.npmjs.com/package/cmdk („Command.Dialog: Props are forwarded to Command. Composes Radix UI's Dialog component. The overlay is always rendered. ... Can be controlled with the open and onOpenChange props. / Keywords act as aliases for the item value, and can also affect the rank of the item.“)

### 8. Die npm-Registry wurde am 26.10.2026 abgefragt. Aktuelle Versionen: next 16.4.3, react 19.3.1, @supabase/ssr 0.12.7, @supabase/supabase-js 2.118.0, cmdk 1.1.1, @dnd-kit/react 0.5.1 (neue API, noch vor 1.0), @dnd-kit/core 6.3.1 und @dnd-kit/sortable 10.0.0 (letztes Release Dezember 2024), sonner 2.0.8, vaul 1.1.2 (letztes Release Dezember 2024), @tanstack/react-table 9.3.1, recharts 3.10.1, react-hook-form 7.91.0, zod 4.6.7, nuqs 2.10.2, date-fns 4.4.0, @radix-ui/react-dialog 1.3.1.

Sicherheit: hoch

Die Peer-Dependencies passen alle zu React 19.

Empfehlungen nach Einsatzzweck:
- **Kanban:** @dnd-kit/react 0.5.1, wenn die neue API gewünscht ist. Weil das Paket noch vor 1.0 steht, kann sich die API ändern; die Version daher exakt pinnen. Die konservative Alternative ist @dnd-kit/core 6.3.1 mit sortable 10.0.0.
- **Toasts mit „Rückgängig“:** sonner.
- **Bottom-Sheets auf Mobil:** vaul.
- **Tabellen für Rechnungen und Belege:** TanStack Table 9.
- **Filter in der URL (teilbare Ansichten):** nuqs.
- **Diagramme im Monatsbericht und im Dashboard:** recharts 3.

Quellen:

- https://www.npmjs.com/package/@dnd-kit/react („npm view @dnd-kit/react version → 0.5.1; peerDependencies react ^18.0.0 || ^19.0.0“)
- https://www.npmjs.com/package/next („npm view next version → 16.4.3 (abgefragt 26.10.2026)“)
- https://www.npmjs.com/package/@dnd-kit/core („6.3.1: 2024-12-05T17:10:19.974Z (letztes Release)“)
- https://www.npmjs.com/package/vaul („version 1.1.2; Vaul is an unstyled drawer component for React that can be used as a Dialog replacement on tablet and mobile devices.“)

### 9. Supabase Auth unterstützt MFA per TOTP und Telefon. Der JWT enthält die Sicherheitsstufe als Claim (aal1/aal2), und Row Level Security kann aal2 auf Datenbankebene erzwingen.

Sicherheit: hoch

Muster (vor Einsatz gegen die aktuelle Supabase-MFA-Doku prüfen):
create policy "nur mit 2FA" on public.kunden as restrictive for all to authenticated using ((select auth.jwt()->>'aal') = 'aal2');
Das gilt für jede Tabelle mit Kunden-, Finanz- oder Vertragsdaten.

Dazu gehören:
- Öffentliche Registrierung abschalten, Nutzer nur einladen (2 Gründer).
- Faktor-Registrierung beim ersten Login erzwingen.
- In Server Actions und Route Handlers zusätzlich die aktuelle Stufe prüfen und bei aal1 auf /2fa umleiten.
- service_role-Key ausschließlich serverseitig verwenden.

Quellen:

- https://supabase.com/features/multi-factor-authentication („Authenticator Assurance Levels: JWT claims (aal1, aal2) to indicate the level of identity verification. Database integration: Row Level Security policies to enforce MFA rules at the database level.“)
- https://supabase.com/blog/mfa-auth-via-rls („JWTs now carry an AAL claim that RLS can check (MFA-Launch 2022)“)

### 10. Supabase stellt einen DPA (AV-Vertrag) zur Selbstbedienung bereit (supabase.com/legal/dpa, PDF-Stände 231211 und 250314). Für Nutzungsdaten ist Supabase selbst Verantwortlicher, die übrigen Daten verarbeitet es weisungsgebunden. Die Compliance ist geteilte Verantwortung.

Sicherheit: mittel

To-do: DPA im Supabase-Dashboard abschließen und als PDF ablegen, Liste der Unterauftragsverarbeiter prüfen, Projekt in der Region eu-central-1 (Frankfurt) anlegen. Supabase ist ein US-Unternehmen; die CLOUD-Act-Diskussion kommt aus einer Konkurrenzquelle und ist als Meinung einzuordnen. Der aktuelle DPA-Text mit Stand 2026 ist hier nicht verifiziert.

Quellen:

- https://supabase.com/downloads/docs/Supabase+DPA+250314.pdf („for GDPR purposes Supabase acts as a controller for Usage Data ... otherwise processes Covered Data on the customer's instructions“)
- https://github.com/orgs/supabase/discussions/2341 („the DPA is available self-service at supabase.com/legal/dpa“)
- https://sota.io/blog/supabase-eu-alternative-gdpr-cloud-act-2026 („argues CLOUD Act exposure is a concern for EU data (Wettbewerber-Meinung)“)

### 11. Die OpenAI-API speichert Abuse-Monitoring-Logs standardmäßig bis zu 30 Tage. Zero Data Retention und Modified Abuse Monitoring gibt es nur nach Freigabe durch OpenAI. EU-Datenresidenz (Projekt-Region Europa, ohne Speicherung im Ruhezustand) ist nur für berechtigte Kunden verfügbar. Wegen der NYT-Klage kann eine Aufbewahrungsanordnung die 30-Tage-Löschung aushebeln.

Sicherheit: mittel

Folgerungen für den Skript-Generator:
- Prompt nur mit Branche, Betriebsname, Angebot, Ziel und Tonalität. Keine Namen von Mitarbeitenden, keine Telefonnummern oder E-Mail-Adressen, keine Rechnungsdaten.
- Auf der Responses- bzw. Chat-Completions-API store: false setzen.
- API-Key nur serverseitig und in einem eigenen OpenAI-Projekt mit Budgetlimit.
- DPA mit OpenAI abschließen und EU-Residency anfragen.
- In der App deutlich als „KI-Entwurf“ kennzeichnen, menschliche Überarbeitung ist Pflicht.

Quellen:

- https://developers.openai.com/api/docs/guides/your-data („By default, abuse monitoring logs are generated for all API feature usage and retained for up to 30 days ... these controls are subject to prior approval by OpenAI and acceptance of additional requirements“)
- https://openai.com/blog/introducing-data-residency-in-europe („eligible API customers can create a project, select Europe as the region ... handled with zero data retention“)
- https://community.openai.com/t/nyt-lawsuit-and-30-days-data-retention/1289975 („court preservation order in the NYT litigation requires OpenAI to keep output logs that would otherwise be deleted“)

### 12. Nach den Hinweisen der LfD Niedersachsen ist Zwei-Faktor-Authentisierung bei Verarbeitungen mit hohem Risiko notwendig, nicht nur empfohlen (risikobasierter Ansatz nach Art. 32 DSGVO). Bevorzugt werden offene Verfahren wie TOTP, die keine zusätzlichen personenbezogenen Daten offenlegen; WebAuthn wird als standardisiertes Verfahren genannt.

Sicherheit: mittel

SCM Studio enthält Kundenstammdaten, Vertrags- und Finanzdaten sowie Einwilligungen mit Bildern von Personen. Daher TOTP-2FA für beide Konten ohne Ausnahme, keine SMS-2FA (spart Telefonnummer und SIM-Swap-Risiko). Passkeys oder WebAuthn sind optional später. Ob 2FA rechtlich zwingend ist, ist nicht abschließend geklärt; als Stand der Technik ist sie aber faktisch erwartet. Den Originalwortlaut des BSI konnte ich nicht prüfen.

Quellen:

- https://lfd.niedersachsen.de/download/61775 („Eine Zwei-Faktor-Authentisierung ist bei Verarbeitungen mit hohem Risiko keine reine Empfehlung, sondern zum Erreichen eines angemessenen Schutzniveaus notwendig. ... bevorzugt offene Verfahren wie Time-based One-time Password Algorithmus (TOTP)“)
- https://www.weka.de/datenschutz/zwei-faktor-authentifizierung-sinnvoll-oder-nicht/ („Haben personenbezogene Daten also einen hohen Schutzbedarf, muss auch der Schutz vor unbefugten Zugang entsprechend hoch sein.“)

### 13. Aufbewahrung und Löschung (laut bestehender SCM-Recherche): Buchungsbelege und Rechnungen müssen seit dem BEG IV 8 Jahre aufbewahrt werden, Angebote und Geschäftsbriefe 6 Jahre. Nicht konvertierte Leads werden etwa 12 Monate nach dem letzten Kontakt gelöscht.

Sicherheit: hoch

Umsetzung in der App:
- **Feld loeschen_ab je Datensatz.** Die Frist beginnt mit dem Ende des Kalenderjahres.
- **Monatlicher Lauf mit Bestätigung.** Er listet fällige Datensätze, ein Mensch bestätigt, dann wird gelöscht oder anonymisiert.
- **Festgeschriebene Rechnungen sind nicht änderbar.** Korrekturen laufen nur über Storno oder Gutschrift (GoBD-Unveränderbarkeit, Details beim Buchhaltungs-Thema).
- **Fristen für Einwilligungen sind eine offene Frage.** Sie gelten mindestens so lange, wie das Video genutzt wird, plus Nachweisfrist.

Quellen:

- https://www.haufe.de/steuern/gesetzgebung-politik/viertes-buerokratieentlastungsgesetz_168_613390.html („Buchungsbelege/Rechnungen seit dem BEG IV 8 Jahre (zitiert in ux-kundenmanagement.md, Abschnitt C2)“)
- https://www.iww.de/pfb/steuern-und-recht-aktuell/abgabenordnung-verkuerzung-der-aufbewahrungsfrist-fuer-buchungsbelege-n163275 („Verkürzung der Aufbewahrungsfrist für Buchungsbelege“)
- file:///home/user/Web-Projekte/.preview-cache/scm/recherche/ux-kundenmanagement.md („Nicht konvertierte Leads z. B. 12 Monate nach letztem Kontakt löschen. Angebote/Geschäftsbriefe 6 Jahre“)

### 14. Einwilligungen von Personen im Video brauchen bei Mitarbeitenden der Kunden die schriftliche oder elektronische Form (BAG 8 AZR 1010/13). Sie erlöschen nicht automatisch mit dem Ausscheiden, und ein Widerruf ist möglich. Unterschriften sollen vor dem Dreh eingesammelt werden.

Sicherheit: mittel

Daraus folgt die Funktion „Einwilligungs-Register“:
- Person, Kunde, Zwecke (eigene Kanäle des Kunden, Anzeigen, Referenz von SCM), Datum, PDF und Status (gültig/widerrufen)
- Verknüpfung mit den Videos, in denen die Person vorkommt
- Bei Widerruf: Warnung, welche Videos betroffen sind, plus Aufgabe „aus Kanälen entfernen“
- Am Set: Einwilligung auf dem Handy mit Signaturfeld unterschreiben, die App erzeugt das PDF

Hinweis aus eigenem Wissen, nicht in dieser Recherche belegt: § 26 BDSG steht seit EuGH C-34/21 (2023) teilweise in Frage. Die Vorlagen deshalb anwaltlich prüfen lassen.

Quellen:

- https://cms.law/de/deu/legal-updates/mitarbeiterfotos-im-netz-bag-will-es-schriftlich („Das BAG verlangt seit 2015 Schriftform für Mitarbeiter-Videos (zitiert in ux-kundenmanagement.md, C3)“)
- file:///home/user/Web-Projekte/.preview-cache/scm/recherche/ux-kundenmanagement.md („Unterschriebene Einwilligungen (Papier oder E-Signatur) vor dem Dreh einsammeln ... Wer nicht einwilligt: nicht erkennbar filmen oder nachträglich herausschneiden.“)

### 15. Vercel ist nach dem EU-U.S. Data Privacy Framework zertifiziert und arbeitet zusätzlich mit Standardvertragsklauseln. Functions sollten in fra1 laufen (laut bestehender SCM-Recherche, nicht neu geprüft).

Sicherheit: mittel

Für SCM Studio gelten dieselben Regeln: Function-Region fra1, nahe an Supabase eu-central-1. DPA im Vercel-Konto akzeptieren. Logs enthalten IP-Adressen, das gehört ins Verzeichnis von Verarbeitungstätigkeiten. Die App läuft hinter Login und wird nicht indexiert (robots noindex und Header X-Robots-Tag).

Quellen:

- https://vercel.com/kb/guide/is-vercel-certified-under-dpf („US-Unternehmen, EU-U.S. Data Privacy Framework zertifiziert, zusätzlich SCCs (zitiert in ux-kundenmanagement.md, C2)“)

### 16. Konflikt mit dem Briefing: SCM hat am 21.10.2026 „100 % ohne KI“ für die Videos festgelegt. Die App soll Skripte aber per OpenAI erzeugen.

Sicherheit: hoch

Das muss vor dem Bau geklärt werden. Vorschlag: Die KI liefert nur interne Entwürfe, Skripte schreiben und verantworten die Gründer. Am Skript wird intern gespeichert, ob ein KI-Entwurf genutzt wurde. Nach außen ändert sich nichts, es sei denn SCM entscheidet anders.

Quellen:

- file:///home/user/Web-Projekte/.preview-cache/scm/recherche/briefing.md („KI: 100 % ohne KI (Videos von SCM). KI-Bilder nur als Platzhalter beim Website-Bau“)
