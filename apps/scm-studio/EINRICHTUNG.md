# SCM Studio · Einrichtung für den echten Betrieb

> **Ganz wichtig: nichts über MyImmo.** SCM Studio bekommt eine **eigene Supabase-Organisation mit eigenem Projekt**
> und ein **eigenes Vercel-Team bzw. Projekt**. Keine Schlüssel, Projekte, Domains oder Teams von MyImmo verwenden.

Bis zu diesem Schritt läuft alles lokal (Vorschau mit eingebetteter Datenbank, Demo-Daten, Vorschau-Passwort).
Die Reihenfolge unten ist so gewählt, dass ihr nach jedem Schritt prüfen könnt, ob es klappt.

---

## 0. Was ihr braucht

| Dienst | Wofür | Kosten (Stand Recherche, vor Abschluss prüfen) |
|---|---|---|
| Supabase (neue Organisation „SCM Creatives“) | Datenbank, Anmeldung mit Zwei-Faktor, privater Dateispeicher | Free reicht für den Start, Pro für tägliche Backups |
| Vercel (neues Team „SCM Creatives“) | Hosting der App, geplante Aufgaben (Cron) | Hobby nur privat; für ein Geschäft Pro |
| OpenAI API (eigenes Projekt) | KI-Skripte | nach Verbrauch, Ausgabelimit setzen |
| Google Cloud (eigenes Projekt) | Google Kalender | kostenlos |
| Meta Developer (eigene App) | Instagram-Zahlen der Kunden | kostenlos |

---

## 1. Supabase-Projekt anlegen

1. Auf supabase.com **neue Organisation** „SCM Creatives“ anlegen (nicht in der MyImmo-Organisation!).
2. Neues Projekt „scm-studio“, Region **Frankfurt (eu-central-1)**, starkes Datenbank-Passwort im Passwortmanager ablegen.
3. **Authentication → Sign In / Providers**
   - E-Mail an, **„Allow new users to sign up“ aus** (nur Einladungen).
   - Mindestlänge Passwort 12.
4. **Authentication → Multi-Factor**: TOTP an (Standard).
5. **Authentication → URL Configuration**
   - Site URL: `https://studio.scm-creatives.de` (bzw. eure Vercel-Adresse)
   - Redirect URLs: `https://studio.scm-creatives.de/**` und für lokale Tests `http://localhost:3100/**`
6. **Authentication → Emails → Templates**: In „Invite user“ und „Reset password“ den Link ersetzen durch
   - Einladung: `{{ .SiteURL }}/auth/bestaetigen?token_hash={{ .TokenHash }}&type=invite`
   - Passwort: `{{ .SiteURL }}/auth/bestaetigen?token_hash={{ .TokenHash }}&type=recovery`
   - Texte auf Deutsch, Absender „SCM Studio“. Für eigene Absenderadresse SMTP unter „Emails → SMTP Settings“ eintragen.
7. **Project Settings → API Keys**: Publishable Key (`sb_publishable_…`) und Secret Key (`sb_secret_…`) notieren.
8. **Project Settings → Database → Connection string**:
   - Transaction Pooler (Port 6543) → `DATABASE_URL`
   - Session Pooler (Port 5432) → `MIGRATION_DATABASE_URL`

## 2. Datenbank füllen (einmalig, vom eigenen Rechner)

```bash
cd apps/scm-studio
npm ci
MIGRATION_DATABASE_URL="postgresql://…:5432/postgres" npm run db:migrate
```

Danach im Supabase **SQL Editor** den Inhalt von `supabase/setup.sql` ausführen
(sperrt das Schema `studio` für die öffentliche API, legt den privaten Speicher-Bucket `studio` an, prüft RLS).

Echte Grunddaten ohne Demo (Firmendaten laut Impressum + Team):

```bash
DATABASE_URL="postgresql://…:6543/postgres" npm run bootstrap -- \
  "Oskar von Esebeck|EMAIL|admin" "Yannick Ruch|EMAIL|admin" "Andreas Mattolat|EMAIL|admin"
```

Die E-Mail-Adressen des Teams sind noch **[PLATZHALTER]**. In der Vorschau stehen Beispieladressen.

## 3. Team einladen

Supabase → **Authentication → Users → Invite user** mit genau den Adressen aus Schritt 2.
Die Person klickt den Link, setzt ein Passwort, richtet die Authenticator-App ein und ist drin.
Wer nicht in `team_members` steht oder auf inaktiv gesetzt ist, kommt nicht hinein.

## 4. Vercel-Projekt anlegen

1. Auf vercel.com **neues Team** „SCM Creatives“ (nicht das MyImmo-Team).
2. „Add New → Project“ → GitHub-Repo `jxnashap/Web-Projekte` importieren.
3. **Root Directory: `apps/scm-studio`**, Framework Next.js, Node 22.
4. Umgebungsvariablen aus `.env.example` eintragen (Production + Preview), mindestens:
   `APP_URL`, `SESSION_SECRET`, `TOKEN_ENC_KEY`, `CRON_SECRET`, `DATABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
   Werte erzeugen: `openssl rand -base64 48` (SESSION_SECRET), `openssl rand -base64 32` (TOKEN_ENC_KEY), `openssl rand -hex 32` (CRON_SECRET).
5. Region ist über `vercel.json` auf Frankfurt (`fra1`) gesetzt, Cron für Instagram ebenfalls.
6. Deploy. Danach eigene Domain `studio.scm-creatives.de` verbinden und `APP_URL` anpassen.
7. **Deployment Protection** für Preview-Deployments anlassen.

**Testlink ohne Supabase:** Fehlt `DATABASE_URL`, legt der Build (`npm run build:vercel`, steht in `vercel.json`)
die Demo-Daten an und die App läuft damit im Speicher. Dafür reichen `SESSION_SECRET`, `TOKEN_ENC_KEY`, `CRON_SECRET`
und `STUDIO_PREVIEW_PASSWORD` (Passwort für die Anmeldung). Was ihr dort eingebt, ist nicht dauerhaft gespeichert:
Es verschwindet, sobald Vercel die Funktion neu startet, und mehrere gleichzeitige Instanzen sehen je ihren eigenen Stand.
Echte Daten erst nach Schritt 1 bis 3 mit `DATABASE_URL`.

## 5. KI-Skripte (OpenAI)

1. platform.openai.com → **eigenes Projekt** „SCM Studio“, API-Key anlegen → `OPENAI_API_KEY`.
2. Monatliches Ausgabelimit setzen. Datenfreigabe für Training ist bei der API standardmäßig aus.
3. In der App unter Einstellungen → KI das Modell wählen. Die Modellnamen aus der Recherche
   (z. B. `gpt-6.1-sol`) vor dem Livegang mit der Modellliste im OpenAI-Dashboard abgleichen.
4. Keine Namen oder Personendaten in Briefings schreiben (steht auch in der App).

## 6. Google Kalender

1. console.cloud.google.com → **neues Projekt** „SCM Studio“ → „Google Calendar API“ aktivieren.
2. OAuth-Zustimmungsbildschirm: Name „SCM Studio“, Support-Mail, Datenschutzerklärung-URL.
   Scopes: `.../auth/calendar.app.created` (optional `.../auth/calendar.freebusy`).
3. Zielgruppe: mit Google Workspace „Internal“; sonst „External“ und **auf „In production“ stellen**
   (im Status „Testing“ laufen die Zugänge nach 7 Tagen ab).
4. Anmeldedaten → OAuth-Client „Webanwendung“, Weiterleitungs-URI `APP_URL/api/google/callback`
   → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
5. In der App: Kalender → „Mit Google verbinden“. Die App legt einen eigenen Kalender „SCM Drehs“ an.
   Ohne Google geht weiterhin das iCal-Abo (Kalender → Abonnieren).

## 7. Instagram-Zahlen

1. developers.facebook.com → **neue App** (Typ Business) → Produkt „Instagram“ → „API setup with Instagram login“.
2. Weiterleitungs-URI `APP_URL/api/instagram/callback`, Berechtigungen `instagram_business_basic`,
   `instagram_business_manage_insights` → `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`.
3. Solange nur eure Kunden verbunden werden: jedes Kundenkonto unter „App-Rollen → Instagram-Tester“ eintragen
   und die Einladung im Instagram-Konto annehmen lassen (dann ist keine App-Prüfung nötig).
4. In der App: Zahlen → Konten → „Verbindungslink erzeugen“ und dem Kunden schicken.
5. Datenschutzerklärung und Löschweg als URLs in der Meta-App hinterlegen.

## 8. Website-Anfragen ins Studio

1. Gleichen geheimen Wert setzen: im Studio `LEADS_WEBHOOK_SECRET`, im Vercel-Projekt der Website `STUDIO_LEADS_SECRET`
   und `STUDIO_LEADS_URL=https://studio.scm-creatives.de/api/anfragen/eingang`.
2. Die Weiterleitung ist in `webseiten/scm-creatives/api/anfrage.js` schon eingebaut und wird mit den beiden Variablen aktiv
   (Details und Testergebnis: `docs/website-anbindung.md`). Zusätzlich im Studio eine Rate-Limit-Regel der Vercel-Firewall
   für `/api/anfragen/eingang` anlegen.

## 9. Vor dem Livegang (Checkliste)

- [ ] Vertrags- und Einwilligungsvorlagen anwaltlich prüfen lassen, dann in Einstellungen → Rechtliches freigeben
      (bis dahin tragen alle Verträge den Vermerk „Entwurf · anwaltlich zu prüfen“).
- [ ] Mit der Steuerberatung: Kontenrahmen und Konten für den DATEV-Export, Berater- und Mandantennummer,
      Regel- oder Kleinunternehmerbesteuerung bestätigen.
- [ ] Firmendaten vervollständigen: IBAN, BIC, Bank, Steuernummer (Einstellungen → Firma).
- [ ] Eine echte Rechnung festschreiben und mit einem Validator (Mustang oder KoSIT) prüfen.
- [ ] AV-Verträge abschließen: Supabase, Vercel, OpenAI, Google, Meta. Datenschutzerklärung der Website ergänzen.
- [ ] Backups: Supabase Pro (tägliche Backups) oder eigener täglicher Export.
- [ ] Offene Vertragspunkte klären (stehen als [PLATZHALTER] in den PDFs und unter Einstellungen → Rechtliches): Übertrag oder
      Verfall nicht abgerufener Videos, Frist bei abgesagten Drehs, Umgang mit veröffentlichten Videos nach Widerruf,
      Aufbewahrung der Einwilligungsnachweise, Kontakt für Datenschutzfragen, AV-Vertrag als Anlage, ob SCM Kaufmann ist.
- [ ] DATEV: Berater- und Mandantennummer, BU-Schlüssel für § 13b, SKR03-Konten mit der Steuerberatung abstimmen und
      einen EXTF-Import einmal testen (Einstellungen in Finanzen → Export).
- [ ] Demo-IBAN DE02120300000000202051 ersetzen (nur in der Vorschau gesetzt) und Firmendaten vervollständigen.
- [ ] KI: Modell-IDs und Preise (`src/lib/skripte/pricing.ts`) mit der OpenAI-Modellliste abgleichen.
- [ ] Instagram: API-Version v25.0 und Kennzahlnamen mit einem echten Business-Konto prüfen; Link zur Datenschutzerklärung
      auf der Kundenseite `/verbinden/…` eintragen.
- [ ] Demo-Modus ist nach `npm run bootstrap` aus. Keine Demo-Daten in die echte Datenbank seeden.
