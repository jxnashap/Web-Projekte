# SCM Studio · Plan, Architektur, UX

Internes Programm für SCM Creatives (Social-Media-Videos für Betriebe in Kiel und an der Lübecker Bucht).
Ein Ort für die ganze Kette: **Anfrage → Testvideos → Vertrag → Skript → Dreh → Schnitt → Online → Zahlen → Monatsbericht → Rechnung → Buchhaltung**.

Stand: 26.10.2026 · Next.js 16.4.3 · React 19.3.1 · Recherche mit Quellen: `docs/recherche/*.md`

---

## 1. Entscheidungen aus der Recherche

| Thema | Entscheidung | Warum (Kurzfassung, Details in docs/recherche) |
|---|---|---|
| Framework | Next.js 16.4.3 mit Cache Components, Turbopack, `proxy.ts` | aktuelle LTS, Sicherheitsfixes ab 16.4.1 (`nextjs.md`) |
| Daten | Postgres über Drizzle; lokal PGlite, später Supabase (Transaction Pooler, `prepare:false`) | gleiche SQL-Welt lokal und live, keine Docker-Pflicht |
| Schutz der Daten | eigenes Schema `studio`, RLS an, Data API gesperrt (`supabase/setup.sql`), Zugriff nur serverseitig | Publishable Key liegt im Browser, darf aber nichts lesen |
| Anmeldung | Supabase Auth, nur Einladung, TOTP-Zwei-Faktor Pflicht (aal2), Abgleich mit Teamliste | TOMs: 2FA bei Kunden- und Finanzdaten (`ux.md`) |
| GoBD | Festschreiben statt Ändern, Storno statt Löschen, lückenlose Nummern, Hash je Datei, Hash-Kette im Protokoll, **Trigger in der Datenbank** | § 146 Abs. 4, § 147 AO, GoBD (`erechnung.md`) |
| E-Rechnung | ZUGFeRD/Factur-X EN 16931 als PDF/A-3b (@react-pdf + @e-invoice-eu/core) | ab 2028 Pflicht, ab sofort sinnvoll (`erechnung.md`) |
| Buchhaltung | DATEV-Buchungsstapel (EXTF) + ZIP mit Belegen für die Steuerberatung | API nur für DATEV-Partner, abgekündigt (`erechnung.md`) |
| Dokumente | weiße PDFs mit Logo als Vektor, Archivo + Courier Prime, einfache E-Signatur mit Prüfprotokoll | EES reicht, Beweis über Hash, Zeit, Gerät (`pdf.md`, `vertraege.md`) |
| Verträge | versionierte Klauseln, „Entwurf · anwaltlich zu prüfen“ bis zur Freigabe, Gerichtsstand nur bei Kaufleuten | § 307 BGB, § 38 ZPO, § 31 Abs. 5 UrhG (`vertraege.md`) |
| Einwilligungen | getrennte Zwecke, Widerruf mit Wirkung für die Zukunft, Minderjährige über Sorgeberechtigte | § 22 KUG, Art. 7 DSGVO (`vertraege.md`) |
| KI | OpenAI Responses API mit strukturierter Ausgabe, `store:false`, keine Personendaten, Protokoll der Tokens | Kosten im Cent-Bereich je Skript (`openai.md`) |
| Kalender | Stufe 0 iCal-Abo, Stufe 1 Google mit eigenem Kalender „SCM Drehs“ (`calendar.app.created`) | minimale Rechte, keine Prüfung nötig (`google.md`) |
| Zahlen | Stufe 1 manuell/CSV, Stufe 2 Instagram API with Instagram Login, TikTok später | Kennzahl „views“ seit 2025 (`social.md`) |
| Zeitzone | alles in Europe/Berlin (`src/lib/time.ts`), Server laufen in UTC | sonst falsche Uhrzeiten auf Vercel |

## 2. Module (Navigation = Szenen)

| Szene | Bereich | Kern |
|---|---|---|
| 01 | **Heute** | Drehs der Woche, Anfragen mit Handlungsbedarf, Kontingent-Ampeln, offenes Geld, beste Videos |
| 02 | **Anfragen** | Pipeline (Board/Liste), A/B/C-Bewertung aus dem Website-Quiz, Webhook, Umwandeln in Kunde |
| 03 | **Kunden** | Stammdaten inkl. Rechtsform/Kaufmann, Paket, Kontingent, alles zum Kunden auf einen Blick |
| 04 | **Produktion** | jede Karte ein Video: Idee → Skript → Dreh → Schnitt → Fertig → Online, Kontingent je Monat |
| 05 | **Skripte** | KI-Generator nach SCM-Bauplan (Hook, Wiedererkennen, Steigerung, Pointe, Aufruf), Drehbuch-Ansicht, PDF |
| 06 | **Kalender** | Monat/Woche/Liste, iCal-Abo, Google-Spiegelung |
| 07 | **Zahlen** | Aufrufe, Reichweite, Interaktionen je Video/Kunde/Format, CSV-Import, Instagram-Anbindung |
| 08 | **Finanzen** | Angebote, Rechnungen (E-Rechnung), Storno, Erinnerungen, Belege mit Foto, USt-Vorschau, DATEV-Export |
| 09 | **Dokumente** | Dienstleistungsvertrag, Einwilligung mit Unterschrift am Set, Drehplan, Monatsbericht |
| 10 | **Einstellungen** | Firma, Team, Nummernkreise, Anbindungen, KI, Rechtliches, Datenschutz |

Überall: ⌘K-Befehlsmenü mit deutschen Suchwörtern, „Neu“-Aktionen per `?neu=1`, Handy-Navigation unten für den Einsatz am Set.

## 3. UX-Grundsätze

- **Heute zuerst**: die Startseite beantwortet „Was steht an, was brennt, wo hängt Geld?“ in höchstens vier Kacheln.
- **Ein Video ist die Einheit** der Produktion, nicht der Kunde. Kontingent zählt fertige Videos, Testvideos zählen nicht.
- **Drei Ansichten** wo es Mengen gibt (Board, Liste, Kalender), Zustand in der URL (teilbar, Zurück-Knopf funktioniert).
- **Handy am Set**: große Tippflächen, Unterschrift im Vollbild, Belegfoto direkt aus der Kamera.
- **Sprache**: Deutsch, ihr-Form, keine Gedankenstriche, Fachbegriffe erklärt (z. B. § 13b, Kleinbetrag).
- **Marke**: Papierweiß, Tinte, ein Signalrot; Archivo schmal-fett für Titel, Courier Prime für Drehbuch-Elemente und Etiketten.
- **Ehrlich**: Demo-Werte sind sichtbar markiert, Unbelegtes steht als [PLATZHALTER] im Text.

## 4. Architektur

```
src/
  app/(app)/<bereich>/     Seiten (Server Components, Daten in <Suspense>)
  app/api/                 Route Handler (PDF, Webhooks, OAuth, Cron, Dateien)
  app/login, app/auth      Anmeldung (Vorschau oder Supabase + 2FA)
  lib/<bereich>/           data.ts (lesen, server-only) und actions.ts (Server Actions)
  lib/pdf/                 gemeinsame PDF-Bausteine (Logo, Kopf, Fußzeile, Tabellen, Unterschrift)
  lib/{auth,audit,storage,crypto,time,format,env,cron,action}.ts
  db/schema.ts             Datenmodell (Schema "studio")
drizzle/                   Migrationen (0001 = GoBD-Trigger)
scripts/seed.ts + seed-parts/   Demo-Daten für die Vorschau
scripts/bootstrap.ts       echte Grunddaten ohne Demo
supabase/setup.sql         einmalige Supabase-Einrichtung
```

Jede Server Action: Anmeldung prüfen → Eingaben mit zod prüfen → schreiben → Protokoll (Hash-Kette) → Seite auffrischen.

## 5. Sicherheit und Datenschutz (TOMs, Kurzfassung)

- Zugang nur für eingeladene Teammitglieder, Zwei-Faktor Pflicht, Sitzung in HttpOnly-Cookies.
- Daten nur serverseitig; Schema `studio` für die öffentliche API gesperrt, RLS an.
- Tokens (Google, Instagram) AES-256-GCM-verschlüsselt; Geheimnisse nur in Umgebungsvariablen.
- Dateien privat (lokal bzw. privater Bucket), Auslieferung nur nach Anmeldung, SHA-256 je Datei.
- Änderungsprotokoll mit Hash-Kette, Prüfung unter Einstellungen → Datenschutz.
- KI: keine Personendaten, `store:false`, nur Token-Zahlen werden protokolliert.
- Hosting in der EU (Supabase Frankfurt, Vercel-Region `fra1`), AV-Verträge laut `EINRICHTUNG.md`.
- Löschkonzept: Anfragen 12 Monate nach letztem Kontakt, Geschäftsbriefe 6 Jahre, Belege 8 Jahre, Bücher 10 Jahre.

## 6. Phasen

| Phase | Inhalt | Stand |
|---|---|---|
| 1 Vorschau | alle Module lokal mit Demo-Daten, PDFs, QA durch UX-Prüfer | diese Lieferung |
| 2 Anbindung | neues Supabase- und Vercel-Projekt (nicht MyImmo), Team einladen, echte Daten | nach eurem Go, `EINRICHTUNG.md` |
| 3 Integrationen | OpenAI-Key, Google Kalender, Instagram-Konten der Kunden, Website-Webhook | Schlüssel eintragen, Code ist fertig |
| 4 Später | Kundenportal (Freigabelinks, Berichte, Rechnungen), TikTok, Zeiterfassung, Rechnungsversand per E-Mail, Serienrechnungen | gemerkt |

## 7. Offene Punkte für SCM

- Team-E-Mail-Adressen, IBAN/BIC/Bank, Steuernummer: **[PLATZHALTER]**.
- Regel- oder Kleinunternehmerbesteuerung bestätigen (Impressum nennt eine USt-IdNr.).
- Paketpreise in der Vorschau sind Demo-Werte.
- Anwaltliche Prüfung der Vertrags- und Einwilligungsvorlagen.
- DATEV-Konten mit der Steuerberatung abstimmen.
