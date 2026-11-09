# SSV – Inbetriebnahme mit der Vereinsdatenbank

Stand: Datenbank (Supabase „SSV Manager“, Frankfurt) ist eingerichtet, die Live-Version
liegt geschützt bei Vercel (Team „ssv-manager“, Projekt **ssv-live**). Die Demo liegt im
Projekt **ssv-vorschau**. Beide sind nur nach Vercel-Login sichtbar, bis der Verein sie
freigibt.

## 1 · Datenbank-Nachtrag einspielen (einmalig)

Supabase → Projekt „SSV Manager“ → **SQL Editor** → New query → Inhalt von
`apps/ssv-hafen/supabase/nachtrag-01.sql` einfügen → **Run**.
(Vereinsangaben für Mitglieder lesbar, Vorstand speichert Antragsentscheidungen, fester Suchpfad.)

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
   **Einstellungen**: IBAN, BIC, Gläubiger-ID, Kassenwart, Hafenmeister. **Gebührenordnung** prüfen.
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

## 6 · Website-Redaktion

Konto mit Rolle `redaktion` (oder Vorstand) → `…/website/verwaltung/` anmelden →
Hinweis, Aktuelles, Termine, Zeiten, Fotos pflegen. Änderungen sind sofort live.

## 7 · Mitglieder informieren

Mitglieder legen ihr Konto in **Mein SSV** (`…/ssv-hafen/mein-ssv.html` → „Konto anlegen“) selbst an –
mit der E-Mail-Adresse, die im Mitgliederstamm steht. Voraussetzung: eigenes SMTP (Schritt 2).

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
