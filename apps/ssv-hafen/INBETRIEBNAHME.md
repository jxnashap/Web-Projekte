# SSV – Inbetriebnahme mit der Vereinsdatenbank

Stand: Datenbank (Supabase „SSV Manager“, Frankfurt) ist eingerichtet, die Live-Version
liegt geschützt bei Vercel (Team „ssv-manager“, Projekt **ssv-live**). Die Demo liegt im
Projekt **ssv-vorschau**. Beide sind nur nach Vercel-Login sichtbar, bis der Verein sie
freigibt.

## 1 · Datenbank-Nachträge einspielen (einmalig, in dieser Reihenfolge)

Bereits eingespielt: 01–08. Neu: 09.

Supabase → Projekt „SSV Manager“ → **SQL Editor** → New query → Inhalt einfügen → **Run**:

1. `apps/ssv-hafen/supabase/nachtrag-01.sql` – Vereinsangaben für Mitglieder lesbar, Vorstand speichert
   Antragsentscheidungen, fester Suchpfad.
2. `apps/ssv-hafen/supabase/nachtrag-02.sql` – Sicherheit und Datenschutz aus dem Gesamt-Check:
   Spaltenrechte für Mitglieder (Konto-Verknüpfung, Getränke-Code und Bankdaten nicht mehr durch
   Hafen-Rollen änderbar), Admin-Liste nur für den Vorstand, Hafenplan-Status nur für Mitglieder,
   wachsende Sperre nach falschen Getränke-Codes, Jugendschutz an der Kasse (`ab_alter`),
   Aufnahmeantrag prüft Alter und Zustimmung der Eltern, Löschfristen (`daten_aufraeumen()`),
   Mitglieder ändern ihre Anschrift selbst.

3. `apps/ssv-hafen/supabase/nachtrag-03.sql` – verlässlicher Datenstand (Feedback-Runde): keine Doppelvergabe
   von Plätzen (auch nicht, wenn zwei Personen gleichzeitig einweisen), Prüfung der Gastlieger in der Datenbank
   (Freigabe des Eigners, Boxmaße, Tiefgang), Änderungsverlauf, Versicherungsnachweise und Dokumente,
   Zahlungen je Rechnung (Teilzahlung, Rücklastschrift), Schäden & Wartung, Arbeitsdienst-Befreiung.
   **Erst diesen Nachtrag einspielen, dann die neue Version in Vercel freischalten** – die Oberfläche braucht die neuen Spalten.

4. `apps/ssv-hafen/supabase/nachtrag-04.sql` – Mein SSV: „Früher zurück“ (mit Hinweis, wenn noch ein Gast auf
   dem Platz liegt) und der eigene Arbeitsdienst-Stundenstand.
5. `apps/ssv-hafen/supabase/nachtrag-05.sql` – Getränkekasse ohne Netz: Buchungen werden auf dem iPad gemerkt und
   nachgetragen; jede Buchung zählt nur einmal. Nicht verbuchbare (z. B. Code falsch) zeigt das iPad oben rechts an.
6. `apps/ssv-hafen/supabase/nachtrag-06.sql` – Arbeitseinsätze mit QR-Check-in (Stunden „eingereicht“ → vom Verein
   „bestätigt“), Mitteilungen an Mitglieder (Mein SSV, Kassen-iPad), Tabellen für Push-Benachrichtigungen.
7. `apps/ssv-hafen/supabase/nachtrag-07.sql` – Gastlieger ohne Warten: Der Gast gibt die Platznummer vom grünen
   Schild an und steht sofort „im Hafen“ (passt der Platz laut Plan nicht, wird er trotzdem angenommen und unter
   „Platz prüfen“ angezeigt). Danach bezahlt er direkt (PayPal, Überweisung, bar) und meldet „bezahlt“; den Eingang
   bestätigt der Hafenmeister mit einem Klick. Behebt außerdem: leere Breite/Tiefgang wurden als Höchstmaß gespeichert.
   Danach in Verwaltung → Einstellungen den **PayPal.me-Namen** des Vereins und den **Hinweis für Barzahlung** eintragen
   (ohne PayPal-Namen sehen Gäste nur Überweisung und bar).
8. `apps/ssv-hafen/supabase/nachtrag-08.sql` – Arbeitsbereiche (z. B. Kran, Boote fahren, Lager, Steg): Bereiche mit
   Aufgabenliste, Mitglieder mit Rolle „Leitung“/„Mitglied“, Stunden und Arbeitseinsätze je Bereich, PDF je Bereich,
   „Deine Arbeitsbereiche“ in Mein SSV. Nach dem Einspielen ist die Liste leer – Bereiche unter Betrieb →
   Arbeitsbereiche anlegen (die Demo zeigt Beispiele mit typischen Aufgaben).
   **Stand 10.11.2026:** Die 12 Arbeitsgruppen des Vereins (plus „Weitere Aufgaben – noch zuordnen“) mit allen Aufgaben aus
   „Aktionsliste2024“ und „Arbeitsdienst 2025“ sind in der Live-Datenbank angelegt (Quelle `js/bereiche-vorlage.js`).
   Mitglieder zuordnen: Betrieb → Arbeitsgruppen → „Zuordnung aus Excel“.
9. `apps/ssv-hafen/supabase/nachtrag-09.sql` – Toilettencode für Gastlieger: eigene Tabelle `gast_toilette`
   (der Hafenmeister ändert den Code selbst unter Gäste & Schild → „Code ändern“), Regel „sofort nach
   Zahlungsmeldung“ oder „erst nach bestätigtem Eingang“; Gast-Seite fragt den Stand über `gast_status` ab.
   Der Code steht nie in den öffentlichen Gast-Infos und erscheint nur während des eigenen Aufenthalts.
   Zahlen per **GiroCode** (EPC-QR) braucht keine Einrichtung – nur IBAN, BIC und Vereinsname unter Einstellungen.
10. `apps/ssv-hafen/supabase/nachtrag-10.sql` – Schutz gegen doppelte Rechnungen: je Mitglied, Saison und Art
   (Beitrag/Sommer/Winter) nur eine gültige Hafen-/Beitragsrechnung (eindeutiger Index `hafen_rechnungen_einmal`,
   stornierte zählen nicht). Der Hafen-Manager holt vor „Rechnungen erstellen“ zusätzlich den neuesten Stand.
11. `apps/ssv-hafen/supabase/nachtrag-11.sql` – Lagerplätze nach dem echten Nordlager: P01–P36 im Norden (vorne schräg,
   links eine Reihe, rechts zwei Reihen), Winterlager West wandert von P21–P40 nach P41–P60 (nur solange dort noch
   nichts belegt ist).
12. `apps/ssv-hafen/supabase/nachtrag-12.sql` – 54 statt 79 Liegeplätze (Angabe Verein, Luftbild 2025): Ost 1–16,
   West 25–56, Schwimmbrücke 71–76 (+ L1/L2). Die übrigen Nummern werden nicht gelöscht, sondern als
   „nicht vorhanden“ markiert (`vorhanden = false`, gesperrt) und im Hafen-Manager ausgeblendet.

Alle dürfen mehrfach ausgeführt werden. Für neue Projekte reicht `ssv-komplett.sql` (enthält alles).

**Löschfristen automatisch:** Database → Extensions → `pg_cron` aktivieren, dann einmal im SQL Editor:
`select cron.schedule('ssv-loeschfristen', '0 3 * * 1', $$select public.daten_aufraeumen()$$);`
(abgelehnte Anträge nach 6 Monaten, Gast-Kontaktdaten 12 Monate nach Abreise, Kontakt-/Bankdaten
Ausgetretener nach 1 Jahr; Rechnungen bleiben wegen § 147 AO.)

## 2 · Anmelde-Einstellungen in Supabase

Authentication → **URL Configuration**:
- **Site URL**: Adresse der Live-Version, z. B. `https://ssv-live-ssv-manager.vercel.app`
  (später die Vereinsdomain, z. B. `https://mein.ssv-net.de`)
- **Redirect URLs**: `https://ssv-live-ssv-manager.vercel.app/ssv-hafen/mein-ssv.html`
  (für „E-Mail bestätigen“ und „Passwort vergessen“)

Authentication → **Emails / SMTP**: Solange kein eigenes Postfach eingetragen ist, verschickt
Supabase Mails nur an Mitglieder des Supabase-Teams und nur wenige pro Stunde. Für alle
Mitglieder: eigenes SMTP eintragen (z. B. `noreply@ssv-net.de` beim Mail-Anbieter des Vereins).

## 3 · Konten für Funktionsträger anlegen

Authentication → Users → **Add user → Create new user**: E-Mail + vorläufiges Passwort,
**Auto Confirm User** anhaken. Danach im SQL Editor die Rolle vergeben:

```sql
insert into public.funktionen (user_id, rolle, name)
select id, 'vorstand', 'Vorname Nachname' from auth.users where email = 'vorstand@ssv-net.de';
-- Rollen: vorstand · kassenwart · brueckenwart · hafenmeister · redaktion
```

Eine Person kann mehrere Rollen haben (eine Zeile je Rolle).

## 4 · Stammdaten

1. **Hafen-Manager** (`/ssv-hafen/`) als Vorstand oder Kassenwart anmelden →
   **Einstellungen**: IBAN, BIC, Gläubiger-ID, Kassenwart, Hafenmeister. **Gebührenordnung** prüfen (Fassung ab der laufenden Saison; neue Preise nach der JHV als neue Fassung ab der nächsten Saison anlegen).
2. **Mitglieder importieren**: Mitglieder & Eigner → „Mitglieder importieren (CSV)“ mit dem
   easyVerein-Export (Mitgliedsnummer, Anschrift, Geburtsdatum, IBAN, Mandatsreferenz, Mandatsdatum).
   Die Getränkekasse nutzt automatisch denselben Mitgliederstamm.
3. **Boote und Liegeplätze** eintragen (Boote, Belegung Sommer/Winter).
4. **Getränkekasse** (`/ssv-getraenke/kassenwart.html`) als Kassenwart: Getränke & Preise anlegen.

## 5 · iPad als Kasse einrichten

Auf dem iPad in Safari `…/ssv-getraenke/kassenwart.html` öffnen, als Kassenwart anmelden →
Einstellungen → **Dieses Gerät als Kasse einrichten**. Danach `…/ssv-getraenke/` öffnen,
„Teilen → Zum Home-Bildschirm“, und mit **Geführter Zugriff** auf die Kasse festsetzen.
Mitglieder legen ihren 4-stelligen Code beim ersten Mal selbst fest (mit Mitgliedsnummer).

## 5a · Getränke mit Jugendschutz

In der Getränkekasse (Kassenwart → Getränke) bei Bier, Wein, Sekt „ab 16“, bei Spirituosen „ab 18“
wählen. Mitglieder ohne Geburtsdatum oder unter der Grenze sehen diese Getränke an der Kasse nicht.

## 6 · Website-Redaktion

Konto mit Rolle `redaktion` (oder Vorstand) → `…/website/verwaltung/` anmelden →
Hinweis, Aktuelles, Termine, Zeiten, Fotos pflegen. Änderungen sind sofort live.

## 7 · Mitglieder informieren

Mitglieder legen ihr Konto in **Mein SSV** (`…/ssv-hafen/mein-ssv.html` → „Konto anlegen“) selbst an –
mit der E-Mail-Adresse, die im Mitgliederstamm steht. Voraussetzung: eigenes SMTP (Schritt 2).

## 6a · Regeln und Grunddaten im Hafen-Manager festlegen (Vorstand)

- **Einstellungen → Steuerhinweis** für Hafen-Rechnungen und Quittungen wählen (mit dem Steuerberater klären).
  Solange nichts gewählt ist, steht auf Rechnungen kein Steuersatz und die Abrechnung zeigt eine Warnung.
- **Einstellungen → Arbeitsdienst**: Soll, Aufforderung ab, Befreiung ab Alter, Ersatzzahlung je Fehlstunde,
  Übertrag aus dem Vorjahr – dann „vom Vorstand beschlossen“ anhaken. Erst danach wird eine Ersatzzahlung berechnet
  (mit der Beitragsrechnung des Folgejahres). Einzelne Befreiungen beim Mitglied eintragen.
- **Liegeplätze → Maße**: echte Boxmaße, Brücke und – wenn bekannt – Wassertiefe je Platz; danach unter
  Einstellungen „Boxmaße geprüft“ anhaken. Bis dahin kennzeichnet der Hafen-Manager die Platzempfehlung als Annahme.
- **Einstellungen → Saisontermine**: Auslagern/Einlagern für dieses und das nächste Jahr (erscheinen in „Mein SSV“ unter Termine).

## 6a2 · Push-Benachrichtigungen (optional)

Die Server-Funktion `push` ist im Supabase-Projekt bereitgestellt (Quelle: `apps/ssv-hafen/supabase/functions/push`).
Sie legt beim ersten Aufruf ihr Schlüsselpaar selbst an – es gibt keine Geheimnisse einzutragen.
1. Nach Nachtrag 06: Hafen-Manager → Einstellungen → „Push-Benachrichtigungen anbieten“ anhaken.
2. Selbst testen: „Mein SSV“ auf dem Handy öffnen (iPhone: erst *Teilen → Zum Home-Bildschirm*, dann von dort öffnen)
   → Meine Daten → „Benachrichtigungen einschalten“. Dann im Hafen-Manager → Mitteilungen eine Test-Mitteilung mit
   „als Push senden“ veröffentlichen.
3. Klappt etwas nicht: Supabase → Edge Functions → push → Logs.

## 6b · Datensicherung

- Supabase sichert die Datenbank im **Pro-Tarif täglich** (7 Tage, Wiederherstellung per Klick); im kostenlosen
  Tarif gibt es keine automatische Sicherung. Für den Echtbetrieb Pro empfehlen.
- Zusätzlich: Hafen-Manager → Einstellungen → **Datensicherung herunterladen** (JSON, enthält Bankdaten –
  verschlüsselt aufbewahren), z. B. monatlich und vor jeder Jahresabrechnung.
- **Zurückspielen** (nur Vorstand): Einstellungen → „Sicherung zurückspielen …“ → Datei wählen → Vergleich
  Sicherung ↔ jetzt prüfen → `ZURÜCKSPIELEN` eintippen. Fehlendes kommt zurück, Geändertes wird auf den Stand
  der Sicherung gesetzt, später Angelegtes entfernt; Mitglieder und Rechnungen werden dabei nie gelöscht.
  Hochgeladene Dokumente, Toilettencode und Getränkekasse gehören nicht zu dieser Sicherung (dafür die
  Supabase-Sicherung bzw. die Sicherung im Kassenwart-Bereich der Kasse). Einmal im Jahr testweise
  zurückspielen (z. B. in der Vorschau), damit im Ernstfall jeder Handgriff sitzt.
- Wer wann was geändert hat, steht im **Änderungsverlauf** (Vorstand und Kassenwart), 3 Jahre lang.

## 7a · Vor der Veröffentlichung prüfen

- Website → **Impressum** und **Datenschutz**: alle `[PLATZHALTER]` ergänzen (Vorstand nach § 26 BGB,
  Vereinsregister, Telefon, Bank, E-Mail-Versanddienst) und vom Vorstand freigeben lassen.
- Mit Vercel und Supabase je einen **Auftragsverarbeitungsvertrag** (DPA) abschließen
  (Vercel: Dashboard → Settings → Legal; Supabase: Organization → Legal Documents).

## 8 · Freigeben und Domain

- In Vercel beim Projekt die gewünschte Version auf „Production“ setzen (Deployments → ⋯ → Promote).
- Domain verbinden (Projekt → Settings → Domains), danach Schritt 2 (Site URL) anpassen.
- Öffentlich machen: Projekt → Settings → Deployment Protection → für die eigene Domain ist die
  Seite automatisch öffentlich (Standard Protection schützt nur die vercel.app-Adressen).

## Neu bauen und hochladen

```bash
python3 apps/ssv-hafen/tools/paket_bauen.py /tmp/ssv-live supabase https://jprpgadcycaawxlyozkm.supabase.co <anon-key>
NODE_USE_ENV_PROXY=1 node apps/ssv-hafen/tools/vercel-vorschau.js /tmp/ssv-live ssv-live
```
