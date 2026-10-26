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
| Kontaktdaten sind eingetragen: Telefon und WhatsApp 0172 5361079, E-Mail scm.creatives@gmx.de | `TEL`, `WHATSAPP`, `MAIL` oben im Generator | erledigt |
| Antwortzeit: „innerhalb von 24 Stunden“ | `ANTWORTZEIT` oben im Generator | erledigt |
| Preis: wird im Kennenlerngespräch genannt | `PREIS_SATZ` oben im Generator | erledigt |
| Impressum: Blacksnapper Consulting, Andreas Mattolat, Hüttenweg 4, 21516 Tramm, USt-IdNr. DE265142237 | `ANBIETER` oben im Generator | erledigt |
| Datenschutz: Vercel-Logs, WhatsApp- und Meta-Anschrift, Data Privacy Framework sind eingetragen (Quellen: vercel.com/docs/runtime-logs, vercel.com/legal/dpa, vercel.com/kb/guide/is-vercel-certified-under-dpf, whatsapp.com/legal/privacy-policy-eea). Offen: Vertrag zur Auftragsverarbeitung, gilt laut vercel.com/legal/dpa nur für Pro und Enterprise. **Nach Buchung des Pro-Plans `VERCEL_PRO = True` setzen und neu bauen.** Danach rechtlich prüfen lassen | `VERCEL_PRO` oben im Generator, `build_legal()` | 1× |
| Achtung Datenschutz: Der Text sagt, dass SCM die Server-Logs höchstens einen Tag lang einsehen kann (Vercel Pro: 1 Tag, Hobby: 1 Stunde). Wer Observability Plus (30 Tage) oder einen Log Drain bucht, muss diesen Satz anpassen | `build_legal()` | |
| Team: Namen, Rollen und Kurztexte stehen (aus den About-me-Posts). Offen: Fotos von Oskar und Yannick ohne Schrift, Hochformat, als Originaldatei | `TEAM` oben im Generator, `build_ueber()` | 2× |
| Kundenstimmen (BS, Maler Rohwer, Jan & Hein & Klaas & Pit, Steakhouse, Kletterwald), schriftlich freigegeben. Der Zitat-Block ist bis dahin ausgeblendet | `case_details(..., with_quote=True)` in `build_case()` | |
| Ort von Maler Rohwer: Kiel (laut maler-rohwer.de, Goethestraße 8), Website auf der Referenzseite verlinkt | `CLIENTS["maler-rohwer"]["ort"]` | erledigt |
| Weinbar „Die Drei": Instagram-Profil ist verlinkt. Offen: Videos, Format, Stimme | `CLIENTS["die-drei"]`, `REELS`. Seite ist bis dahin `noindex` und nicht in der Sitemap | 1× |
| Pakete: Drehtermine individuell (Restaurant z. B. einmal pro Woche), Laufzeit und Preis im Kennenlerngespräch | `build_pakete()`, `FAQ_*` | erledigt |
| Testvideos: einmal pro Betrieb, zum Hochladen gedacht; Dauer bis zur Lieferung steht bewusst nicht auf der Seite | `build_testvideos()`, `FAQ_*` | erledigt |
| Nutzungsrechte: Die fertigen Videos gehören dem Kunden, Rohmaterial bleibt bei SCM | `FAQ_MORE` | erledigt |
| Darsteller: Wer mitspielt, entscheidet der Kunde | `FAQ_CORE`, Branchen-FAQ | erledigt |
| Aktionen in der Gastronomie: kein fester Vorlauf, SCM kommt vorbereitet zum Drehtermin | `BRANCHEN["gastronomie"]` | erledigt |
| Einwilligung der Mitarbeitenden: wird individuell mit dem Kunden abgesprochen | `FAQ_OBJ` | erledigt |
| Einwilligung aller gezeigten Personen (Darsteller, Marc und Leon von BS, Mitarbeitende der Kunden) für die Nutzung der Videos auf dieser Website | schriftlich bei SCM ablegen, das Briefing belegt nur die Freigabe durch die Kunden | |
| Auf der Seite mit „von SCM bestätigen" markiert: Drehtermine pro Monat (Pakete). Vertrag zur Auftragsverarbeitung mit Vercel (Datenschutz) folgt mit dem Pro-Konto | `build_pakete()`, `build_legal()` | |
| Logo: Originaldateien von SCM liegen in `marke/`. Daraus erzeugt: `logo.svg` (transparent, Rand beschnitten), `logo-dark.svg`/`.png`, `favicon.svg` (Avatar), `favicon-96.png`, `favicon.ico`, `apple-touch-icon.png`, `og*.jpg` | `public/img/` | erledigt |

## 2. Von SCM zu bestätigen (steht so auf der Seite, ist aber nicht belegt)

Diese Aussagen sind sinnvolle Annahmen aus Gespräch und Instagram, aber nicht ausdrücklich bestätigt. Bitte einmal lesen und Bescheid geben, was nicht stimmt.

- **Pakete:** Die Pakete heißen nach ihrem Rhythmus („Einmal pro Woche", „Zweimal pro Woche", „Dreimal pro Woche"), das 8er-Paket trägt das Etikett „Der Mittelweg". Eigene Paketnamen oder eine echte Empfehlung von SCM hier eintragen (`packs()`).
- **Gäste im Bild** nur mit Einverständnis (Branche Gastronomie, FAQ).
- **Erledigt:** Kunden sehen die Videos nicht vor der Veröffentlichung (Aussage entfernt). „Auswerten und nachschärfen“ ist bestätigt. Instagram-Zahlen sind entfernt, weil sie schnell veralten. KI-Hinweis bei den BS-Videos ist bestätigt.
- **Erledigt:** Das Skript lesen nur die, die im Video mitspielen.
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
   - `SMTP_HOST` = `mail.gmx.net`, `SMTP_PORT` = `587`, `SMTP_USER` = `scm.creatives@gmx.de`, `SMTP_PASS` = Passwort des GMX-Postfachs
   - `MAIL_TO` = `scm.creatives@gmx.de`, `MAIL_FROM` = `scm.creatives@gmx.de` (GMX verschickt nur mit der eigenen Adresse als Absender)
   - In GMX unter Einstellungen → POP3/IMAP Abruf den Versand über externe Programme erlauben, sonst lehnt GMX die Anmeldung ab.
   - Bitte prüfen, ob GMX für die geschäftliche Nutzung einen Vertrag zur Auftragsverarbeitung anbietet. Sonst später auf eine Adresse mit eigener Domain wechseln (z. B. bei Einrichtung von scm-creatives.de).
   - **`MAIL_TEST` in Production nicht setzen.** Mit `MAIL_TEST=1` wird nichts verschickt, nur ins Log geschrieben.
5. Deploy, dann auf der Vorschau-Adresse (`*.vercel.app`) eine Testanfrage über `/anfrage` schicken und den Eingang prüfen. Vorschau-Adressen senden `noindex`, Google nimmt sie nicht auf.
6. **Erledigt (Oktober 2026):** scm-creatives.de ist verbunden, https läuft. **Domains:** `scm-creatives.de` als Hauptdomain hinzufügen, DNS beim Registrar wie von Vercel angezeigt eintragen. `www.scm-creatives.de` und (falls gekauft) `scmcreatives.de` ebenfalls hinzufügen, die Weiterleitung auf die Hauptdomain steht schon in `vercel.json`.
7. Nach dem Livegang in den Domain-Einstellungen die Produktions-Adresse `*.vercel.app` auf `scm-creatives.de` umleiten.
8. **Pflicht vor dem Livegang · Firewall → Rate Limiting:** Regel für Pfad `/api/anfrage`, Methode POST, 5 Anfragen je IP in 10 Minuten, Aktion „Deny". Die Function prüft zusätzlich Herkunft, Honeypot, Ausfülldauer und drosselt selbst, aber nur pro Instanz.

## 6. Nach dem Livegang

- [ ] **Sperre für Suchmaschinen aufheben, sobald das Impressum vollständig ist:** In `vercel.json` in der Regel für den Host `scm-creatives\\.de` den Eintrag `X-Robots-Tag: noindex` löschen und neu hochladen. Bis dahin nimmt Google die Seite unter scm-creatives.de nicht auf.

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

## 8. Kunden-Merkblatt „Werbekosten absetzen“ (`merkblatt/`)

Fertig gebaut (9 Seiten, `auslieferung/SCM-Creatives-Merkblatt-Werbekosten.pdf`). Vor dem Verteilen an Kunden:

- [ ] Von einer Steuerberatung gegenlesen lassen (§§ 2, 5 StBerG, Abmahnrisiko durch die Steuerberaterkammer)
- [ ] Bestätigen, dass SCM (Blacksnapper Consulting) regelbesteuert ist und 19 % Umsatzsteuer ausweist. Die Modellrechnung nimmt das an.
- [ ] Klären, ob SCM Werbebudgets weiterberechnet oder Kunden über ihr eigenes Werbekonto zahlen. Das Merkblatt beschreibt beide Wege neutral.
- [ ] Rechenwert 1.000 € netto pro Monat im Beispiel bei Bedarf in `BEISPIEL` anpassen, dann `python3 build_merkblatt.py`
- [ ] Jährlich aktualisieren (Steuertarif, Hebesätze, E-Rechnung), Werte stehen in `steuer2026.py`
