# SCM Creatives: Platzhalter und Livegang-Liste

Alles hier muss vor dem Livegang erledigt sein. Platzhalter sind auf der Seite
rot gestreift als `[PLATZHALTER: …]` sichtbar. Texte und Daten stehen im
Generator `baukaesten/drehbuch/generatoren/build_scm.py`, danach neu bauen:
`python3 baukaesten/drehbuch/generatoren/build_scm.py`.

## 1. Daten von SCM

| Was | Wo eintragen |
|---|---|
| Telefon, WhatsApp-Nummer, E-Mail | `TEL`, `WHATSAPP`, `MAIL` oben im Generator (Buttons verlinken bis dahin auf /kontakt) |
| Impressum: Rechtsform, Inhaber, Anschrift, USt-ID, Register, Verantwortlicher § 18 MStV | `build_legal()` → Impressum |
| Datenschutz: Verantwortlicher, E-Mail-Anbieter, Löschfrist | `build_legal()` → Datenschutz, danach rechtlich prüfen lassen |
| Team: Namen, Rollen, Fotos, Gründungsjahr, Bedeutung „SCM" | `build_ueber()` |
| Kundenstimmen (BS, Maler Rohwer, Jan & Hein & Klaas & Pit, Steakhouse, Kletterwald) | `build_case()` → Zitat-Block |
| Ort von Maler Rohwer | `CLIENTS["maler-rohwer"]["ort"]` |
| Weinbar „Die Drei": Instagram-Profil, Videos, Format | `CLIENTS["die-drei"]` (Seite ist bis dahin `noindex` und nicht in der Sitemap) |
| Laufzeit und Konditionen der Pakete | `build_pakete()` |
| Nutzungsrechte an Videos und Testvideos, Dauer bis zu den Testvideos | `FAQ_MORE`, `build_testvideos()` |
| Logo als Vektordatei (Normalversion) | `img/logo.svg`, `img/logo-dark.svg` ersetzen (aktuell nachgebaute Wortmarke) |

## 2. Videos

- Die 6 Reels stammen aus Instagram (720p). **Musik aus der Instagram-Bibliothek darf außerhalb von Instagram meist nicht genutzt werden.** Bitte Original-Exporte (1080×1920) ohne Musik oder mit lizenzfreier Musik liefern.
- SCM schickt weitere Reel-Links, sobald die Seite steht. Neue Videos: Eintrag in `REELS`, Encoding laut Baukasten-README.

## 3. KI-Platzhalter (durch echte Fotos ersetzen)

Alle Dateien heißen `ki-platzhalter-*` und tragen auf der Seite das Etikett „KI-Platzhalter".

| Datei | Verwendet auf |
|---|---|
| `img/ki-platzhalter-gastro-dreh` + Video | Branche Gastronomie, Startseite (Karte), So arbeiten wir (Kopf-Video) |
| `img/ki-platzhalter-immobilien-dreh` | Branche Immobilien, Karten |
| `img/ki-platzhalter-handwerk-dreh` | Branche Handwerk, Karten |
| `img/ki-platzhalter-unternehmen-dreh` | Branche Unternehmen, Karten |
| `img/ki-platzhalter-schnitt` | Leistungen (Kopf), Über uns |
| `img/ki-platzhalter-skript` | Vision |
| `img/ki-platzhalter-kiel-foerde` + Video | Angebots-Block auf vielen Seiten, 3 Testvideos (Kopf-Video), Über uns |
| `img/ki-platzhalter-luebecker-bucht` | Vision (Kopf) |
| `img/ki-platzhalter-weinbar` | Referenz Die Drei |

## 4. Technik und Livegang

- [ ] Vercel-Konto von SCM anlegen, **Pro-Plan** (gewerbliche Nutzung, Auftragsverarbeitungsvertrag), Projekt übertragen
- [ ] Umgebungsvariablen setzen: `SMTP_HOST`, `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, optional `MAIL_FROM`
- [ ] Testanfrage über `/anfrage` schicken und Eingang prüfen
- [ ] Domain `scm-creatives.de` registrieren, in Vercel als Hauptdomain hinterlegen, `www` und `scmcreatives.de` als Weiterleitung (Regeln in `vercel.json` sind vorbereitet)
- [ ] Google Search Console: Domain-Property per DNS-TXT bestätigen, `https://scm-creatives.de/sitemap.xml` einreichen
- [ ] Google-Unternehmensprofil als Servicegebiet (Kiel, Lübecker Bucht) ohne Adresse anlegen
- [ ] Optional: Vercel Web Analytics (cookielos) aktivieren, dann Absatz in der Datenschutzerklärung ergänzen
- [ ] Impressum und Datenschutz rechtlich prüfen lassen
