# SCM Creatives: Platzhalter und Livegang-Liste

Alles hier muss vor dem Livegang erledigt sein. Platzhalter sind auf der Seite
rot gestreift als `[PLATZHALTER: …]` sichtbar. Texte und Daten stehen im
Generator `baukaesten/drehbuch/generatoren/build_scm.py`, danach neu bauen:
`python3 baukaesten/drehbuch/generatoren/build_scm.py`.

Aufbau des Projekts:

```
webseiten/scm-creatives/
  public/        alle Seiten, CSS, JS, Schriften, Bilder, Videos (wird ausgeliefert)
  api/anfrage.js Vercel Function: Quiz-Anfrage per SMTP an SCM
  package.json   nodemailer (einzige Abhängigkeit), Node 22
  vercel.json    saubere URLs, Weiterleitungen, Sicherheits-Header
```

## 1. Daten von SCM

| Was | Wo eintragen | Kommt vor |
|---|---|---|
| Telefon, WhatsApp-Nummer, E-Mail | `TEL`, `WHATSAPP`, `MAIL` oben im Generator. Bis dahin führen Anruf- und WhatsApp-Knöpfe auf /kontakt | 10× |
| Antwortzeit (z. B. „innerhalb eines Werktags") | `ANTWORTZEIT` oben im Generator. **Nur eintragen, was SCM wirklich halten kann** | 15× |
| Zeitpunkt der Preisnennung (Empfehlung: im Kennenlerngespräch, also vor den Testvideos) | `PREIS_SATZ` oben im Generator | 8× |
| Impressum: Rechtsform, Inhaber oder vertretungsberechtigte Personen, Anschrift, USt-ID oder Kleinunternehmer, Register, Verantwortlicher § 18 MStV | `build_legal()` → Impressum | |
| Datenschutz: Verantwortlicher, E-Mail-Anbieter, Löschfrist der Anfragen, Speicherdauer der Vercel-Logs | `build_legal()` → Datenschutz, danach rechtlich prüfen lassen | |
| Team: Namen, Rollen, Fotos, Gründungsjahr, Bedeutung „SCM", Anzahl | `build_ueber()` | |
| Kundenstimmen (BS, Maler Rohwer, Jan & Hein & Klaas & Pit, Steakhouse, Kletterwald), schriftlich freigegeben | `build_case()` → Zitat-Block | 5× |
| Ort von Maler Rohwer | `CLIENTS["maler-rohwer"]["ort"]` | |
| Weinbar „Die Drei": Instagram-Profil, Videos, Format, Stimme | `CLIENTS["die-drei"]`, `REELS`. Seite ist bis dahin `noindex` und nicht in der Sitemap | |
| Pakete: Mindestlaufzeit, Kündigungsfrist, Drehtermine pro Monat | `build_pakete()`, `FAQ_MORE` | |
| Testvideos: Dauer bis zur Lieferung, Bedingungen (z. B. einmal pro Betrieb), dürfen Kunden sie ohne Vertrag posten? | `build_testvideos()`, `FAQ_*` | |
| Nutzungsrechte an den Videos, Rohmaterial | `FAQ_MORE` | |
| Darsteller, wenn das Team nicht vor die Kamera will | `FAQ_OBJ`, Branchen-FAQ | 4× |
| Dauer eines Drehtermins, Vorlauf für Aktionen | `FAQ_*`, `BRANCHEN["gastronomie"]` | |
| Einwilligungsvorlage für Mitarbeitende im Video | `FAQ_*` | |
| Einwilligung aller gezeigten Personen (Darsteller, Marc und Leon von BS, Mitarbeitende der Kunden) für die Nutzung der Videos auf dieser Website | schriftlich bei SCM ablegen, das Briefing belegt nur die Freigabe durch die Kunden | |
| Auf der Seite mit „von SCM bestätigen" markiert: Freigabe der Videos vor Veröffentlichung, Schritt 6 „Auswerten und nachschärfen", Plattformen für Werbeanzeigen, Verzicht auf Verbraucherschlichtung (Impressum), Vertrag zur Auftragsverarbeitung mit Vercel (Datenschutz) | jeweilige Stelle im Generator (`STEPS`, `FAQ_*`, `build_leistungen()`, `build_legal()`) | 6× |
| Logo als Vektordatei (Normalversion) | `public/img/logo.svg`, `logo-dark.svg` ersetzen (aktuell nachgebaute Wortmarke), danach `favicon.svg`, `favicon-96.png`, `favicon.ico`, `apple-touch-icon.png`, `og*.jpg` neu erzeugen | |

## 2. Von SCM zu bestätigen (steht so auf der Seite, ist aber nicht belegt)

Diese Aussagen sind sinnvolle Annahmen aus Gespräch und Instagram, aber nicht ausdrücklich bestätigt. Bitte einmal lesen und Bescheid geben, was nicht stimmt.

- **Pakete:** Die Pakete heißen nach ihrem Rhythmus („Einmal pro Woche", „Zweimal pro Woche", „Dreimal pro Woche"), das 8er-Paket trägt das Etikett „Der Mittelweg". Eigene Paketnamen oder eine echte Empfehlung von SCM hier eintragen (`packs()`).
- **Gäste im Bild** nur mit Einverständnis (Branche Gastronomie, FAQ).
- **Zahlen von Instagram, Stand 21.10.2026:** 209 Likes und 24 Kommentare beim Maler-Sketch, 20 Kommentare beim Mittagstisch-Sketch. Vor dem Livegang aktualisieren oder Stand-Datum anpassen (`build_home()`, `BRANCHEN[...]["proof"]`).
- **KI-Hinweis bei BS Immobiliengruppe:** Auf der Seite steht, dass Teile der beiden BS-Videos mithilfe von KI erstellt wurden (wie im Original auf Instagram gekennzeichnet). Bitte bestätigen, sonst Feld `ki` in `REELS` entfernen.
- **Untertitel prüfen:** Die Untertitel (`public/media/*.de.vtt`) und die Transkripte auf den Referenzseiten sind automatisch erkannt (Whisper) und von Hand geglättet. Bei Das kleine Steakhouse sind einzelne Sätze unsicher. Bitte gegenlesen.

## 3. Videos

- Die 6 Reels stammen aus Instagram (720p). **Musik aus der Instagram-Bibliothek darf außerhalb von Instagram meist nicht genutzt werden.** Bitte Original-Exporte (1080×1920) ohne Musik oder mit lizenzfreier Musik liefern.
- SCM schickt weitere Reel-Links, sobald die Seite steht. Neue Videos: Eintrag in `REELS`, Encoding und Untertitel laut Baukasten-README.

## 4. KI-Platzhalter (durch echte Fotos ersetzen)

Alle Dateien heißen `ki-platzhalter-*` und tragen auf der Seite das Etikett „KI-Platzhalter".

| Datei (in `public/`) | Verwendet auf |
|---|---|
| `img/ki-platzhalter-gastro-dreh` + Video | Branche Gastronomie, Startseite (Karte), So arbeiten wir (Kopf-Video) |
| `img/ki-platzhalter-immobilien-dreh` | Branche Immobilien, Karten |
| `img/ki-platzhalter-handwerk-dreh` | Branche Handwerk, Karten |
| `img/ki-platzhalter-unternehmen-dreh` | Branche Unternehmen, Karten |
| `img/ki-platzhalter-schnitt` | Leistungen (Kopf), Über uns |
| `img/ki-platzhalter-skript` | Vision |
| `img/ki-platzhalter-kiel-foerde` + Video | Angebots-Block auf vielen Seiten, 3 Testvideos (Kopf-Video), Über uns |
| `img/ki-platzhalter-luebecker-bucht` | Vision (Kopf) |

## 5. Vercel einrichten (von Hand, im SCM-Konto)

Das Projekt konnte aus dieser Umgebung nicht direkt angelegt werden (fehlende Berechtigung). So geht es im eigenen Vercel-Konto von SCM:

1. Vercel-Konto anlegen, **Pro-Plan** (gewerbliche Nutzung, Auftragsverarbeitungsvertrag).
2. **Add New → Project →** GitHub-Repository importieren (oder Ordner `webseiten/scm-creatives` in ein eigenes Repo kopieren).
3. Einstellungen beim Import:
   - **Root Directory:** `webseiten/scm-creatives`
   - **Framework Preset:** Other
   - Build Command: leer lassen · Output Directory: `public` (steht auch in `vercel.json`)
   - Node.js-Version: 22.x
4. **Environment Variables** (Production):
   - `SMTP_HOST` (z. B. Server des Mail-Anbieters), `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASS`
   - `MAIL_TO` (Postfach für Anfragen), optional `MAIL_FROM` (Absender, meist gleich `SMTP_USER`)
   - **`MAIL_TEST` in Production nicht setzen.** Mit `MAIL_TEST=1` wird nichts verschickt, nur ins Log geschrieben.
5. Deploy, dann auf der Vorschau-Adresse (`*.vercel.app`) eine Testanfrage über `/anfrage` schicken und den Eingang prüfen. Vorschau-Adressen senden `noindex`, Google nimmt sie nicht auf.
6. **Domains:** `scm-creatives.de` als Hauptdomain hinzufügen, DNS beim Registrar wie von Vercel angezeigt eintragen. `www.scm-creatives.de` und (falls gekauft) `scmcreatives.de` ebenfalls hinzufügen, die Weiterleitung auf die Hauptdomain steht schon in `vercel.json`.
7. Nach dem Livegang in den Domain-Einstellungen die Produktions-Adresse `*.vercel.app` auf `scm-creatives.de` umleiten.
8. **Pflicht vor dem Livegang · Firewall → Rate Limiting:** Regel für Pfad `/api/anfrage`, Methode POST, 5 Anfragen je IP in 10 Minuten, Aktion „Deny". Die Function prüft zusätzlich Herkunft, Honeypot, Ausfülldauer und drosselt selbst, aber nur pro Instanz.

## 6. Nach dem Livegang

- [ ] Google Search Console: Domain-Property per DNS-TXT bestätigen, `https://scm-creatives.de/sitemap.xml` einreichen, Startseite und Referenzseiten zur Indexierung anmelden
- [ ] Google-Unternehmensprofil als Servicegebiet (Kiel, Lübecker Bucht) ohne Adresse anlegen
- [ ] Firewall-Regel aus Schritt 5.8 aktiv und mit einer Testanfrage geprüft
- [ ] Instagram-Bio auf `https://scm-creatives.de/testvideos?utm_source=instagram` verlinken. Die Kampagnenquelle steht in der Anfrage-Mail, wenn die Anfrage auf dieser Seite oder direkt von ihr aus gestartet wird (eine Seite weiter geht sie verloren, dafür wird bewusst nichts im Browser gespeichert).
- [ ] Optional: Vercel Web Analytics (cookielos) aktivieren, dann Absatz in der Datenschutzerklärung ergänzen
- [ ] Impressum und Datenschutz rechtlich prüfen lassen

## 7. So kommen Anfragen an

Jede Anfrage aus dem Quiz landet als E-Mail bei `MAIL_TO`. Betreff zum Beispiel:
`[A] 3 Testvideos: Name, Betrieb (Gastronomie · 8 Videos · sofort · Kiel)`

- **A:** 8 oder 12 Videos und Start „so bald wie möglich": am besten noch am selben Tag zurückrufen.
- **B:** konkreter Start oder großes Paket: innerhalb der zugesagten Antwortzeit melden.
- **C:** möchte sich erst informieren.

In der Mail stehen Knöpfe zum Anrufen, für WhatsApp und zum Antworten, dazu der gewünschte Kontaktweg, die Seite, von der die Anfrage kam, und die Eingangszeit. „Antworten" im Mailprogramm geht direkt an die anfragende Person.
