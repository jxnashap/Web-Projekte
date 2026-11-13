# Let's Drive Kiel – neue Website bei IONOS veröffentlichen

Stand: 13.11.2026 · Paket: `auslieferung/lets-drive-kiel-website.zip` (≈ 1,5 MB)
Neu: **Redaktion** unter `/verwaltung/` (Schritt 3b) für Hinweis, Bürozeiten,
Theoriezeiten, Motorrad-Termine und Stellenanzeige.

## Wichtig vorab

Die bisherige Seite läuft im IONOS-Baukasten **„MyWebsite Now"** (steht so im
Quelltext der alten Seite). In diesen Baukasten kann man **keine eigenen Dateien
hochladen**. Die neue Seite braucht deshalb ein **IONOS-Webhosting-Paket**
(Webspace mit PHP – das kleinste Paket reicht, die Seite hat 1,6 MB).

Domain `lets-drive-kiel.de` und das Postfach `info@lets-drive-kiel.de` bleiben
bei IONOS. Es wird nur umgestellt, *wohin* die Domain zeigt.

---

## Schritt 0 · Prüfen, was im IONOS-Konto vorhanden ist

1. Im IONOS-Konto anmelden → **Menü → Hosting**.
2. Gibt es dort einen Vertrag mit der Kachel **„Webspace"**, weiter mit Schritt 1.
3. Gibt es nur **„Websites & Shops"** (MyWebsite Now): ein Webhosting-Paket im
   **selben Kundenkonto** dazubuchen (mit PHP und SSL-Zertifikat).

## Schritt 1 · Dateien hochladen (im Browser, ohne Zusatzprogramm)

1. **Menü → Hosting** → Vertrag wählen → in der Kachel **Webspace** auf
   **„Webspace nutzen"** klicken. Der Webspace Explorer öffnet sich.
2. Links das Hauptverzeichnis **/** wählen → **Hochladen** →
   `lets-drive-kiel-website.zip` auswählen → **Hochladen**
   (Limit im Explorer: 50 MB, die Datei hat 1,5 MB).
3. Die ZIP-Datei markieren → **Entpacken**. Es entsteht der Ordner
   **`/lets-drive-kiel/`**. Die ZIP-Datei danach löschen.
4. Kontrolle: Im Ordner liegen u. a. `index.html`, `kontakt.php`, `css/`, `js/`,
   `assets/`, `verwaltung/`, `daten/` und die versteckte Datei **`.htaccess`** (ggf. „versteckte Dateien
   anzeigen" einschalten). Ohne `.htaccess` fehlen Weiterleitungen und HTTPS-Zwang.

*Alternative:* per SFTP (z. B. FileZilla) den **Inhalt** des Ordners
`lets-drive-kiel/` nach `/lets-drive-kiel/` hochladen. Zugangsdaten stehen im
IONOS-Konto unter Hosting → SFTP & SSH.

## Schritt 2 · Domain auf den neuen Ordner umstellen

> Ab hier ist die alte Seite offline, bis die neue verbunden ist (meist wenige
> Minuten). Am besten außerhalb der Bürozeiten umstellen.

1. **Domain vom Baukasten lösen:** Eine Domain, die mit MyWebsite Now verbunden
   ist, muss laut IONOS zuerst *in der Anwendung* getrennt werden – also in
   MyWebsite Now bei den Domain-Einstellungen der Website die Verbindung lösen.
2. **Menü → Domains & SSL** → bei `lets-drive-kiel.de` das Zahnrad / die
   Aktionen öffnen → **Verwendungsart anpassen** → **Webspace** → Zielverzeichnis
   **`/lets-drive-kiel/`** wählen. Der Status wechselt von „Verbinde mit Webspace"
   auf **„Aktiv"**.
3. Dasselbe für **`www.lets-drive-kiel.de`**: gleiches Zielverzeichnis.
   (Die Seite leitet automatisch auf `https://www.…` um.)
4. **SSL:** unter Domains & SSL prüfen, dass für beide Adressen ein
   SSL-Zertifikat aktiv ist (Schloss-Symbol im Browser).

Falls die Domain im Auswahlmenü fehlt, liegt sie in einem anderen Vertrag:
IONOS-Hilfe „Domain ist im falschen Vertrag" oder kurz beim IONOS-Support anrufen.

## Schritt 3 · Testen (10 Minuten)

- [ ] `https://www.lets-drive-kiel.de` lädt die neue Seite, auch auf dem Handy.
- [ ] `http://lets-drive-kiel.de` leitet auf `https://www.lets-drive-kiel.de` um.
- [ ] Alte Adressen funktionieren weiter, z. B. `…/kontakt/` → `kontakt.html`,
      `…/fahrerlaubnisklassen/` → `fahrerlaubnisklassen.html`.
- [ ] **Kontaktformular:** eine Testnachricht schicken. Sie muss bei
      `info@lets-drive-kiel.de` ankommen (Absender „Website Let's Drive Kiel",
      „Antworten" geht direkt an die Person aus dem Formular).
- [ ] Eine nicht vorhandene Adresse (z. B. `…/test123`) zeigt die eigene 404-Seite.
- [ ] `…/daten/privat/` und `…/daten/archiv/` zeigen **„Forbidden“** (Schutz greift).

## Schritt 3b · Redaktion einrichten (5 Minuten, am besten gemeinsam mit dem Kunden)

Der Kunde legt sein Passwort **selbst** fest. Es steht nirgends, auch nicht bei uns.

1. `https://www.lets-drive-kiel.de/verwaltung/` aufrufen. Es erscheint
   „Redaktion einrichten“ und fragt nach einem **Einrichtungscode**.
2. Den Code holen: im **Webspace Explorer** den Ordner
   `/lets-drive-kiel/daten/privat/` öffnen, Datei **`einrichtungscode.php`**
   herunterladen und mit einem Texteditor öffnen. Oben steht
   `// Einrichtungscode für die Redaktion: XXXX-XXXX`.
   (Die Datei entsteht erst beim ersten Aufruf von `/verwaltung/`.)
3. Code eintragen, eigenes Passwort festlegen (mindestens 10 Zeichen) →
   **Redaktion einrichten**. Die Code-Datei löscht sich dabei selbst.
4. Kurzer Rundgang: links die fünf Bereiche, in der Mitte das Formular, rechts die
   Vorschau mit den ungespeicherten Änderungen. Erst **Speichern** macht sie live.
   **Ältere Fassungen** holt einen früheren Stand zurück (die letzten 30).
5. Test: Hinweis einschalten, Text eingeben, speichern, Website neu laden →
   Hinweis steht oben. Danach wieder ausschalten und speichern.

**Passwort vergessen?** Im Webspace Explorer `daten/privat/zugang.php` löschen,
dann `/verwaltung/` aufrufen: ein neuer Einrichtungscode entsteht, weiter ab Punkt 2.
Die Inhalte bleiben dabei erhalten.

## Schritt 4 · Abschließen

- **Auftragsverarbeitung:** Im IONOS-Konto den **Vertrag zur
  Auftragsverarbeitung (AV-Vertrag)** abschließen – die Datenschutzerklärung
  nennt IONOS als Hoster und setzt diesen Vertrag voraus.
- **Datenschutzerklärung prüfen lassen** (Anwalt oder Datenschutz-Generator).
- **MyWebsite Now erst kündigen, wenn alles läuft** – und nur, wenn Domain und
  E-Mail-Postfach **nicht** in diesem Vertrag stecken. Sonst gehen sie mit!
  Im Zweifel vorher beim IONOS-Support nachfragen.
- Optional: In der Google Search Console die Sitemap
  `https://www.lets-drive-kiel.de/sitemap.xml` einreichen.

## Wenn etwas schiefgeht

| Problem | Lösung |
|---|---|
| „500 Internal Server Error" | `.htaccess` im Webspace Explorer in `htaccess.txt` umbenennen → Seite lädt wieder (dann ohne Weiterleitungen). Bitte melden. |
| Formular-Nachricht kommt nicht an | Postfach `info@lets-drive-kiel.de` im IONOS-Konto prüfen (muss existieren), Spam-Ordner prüfen. Besucher sehen in dem Fall automatisch die E-Mail-Variante. |
| Zurück zur alten Seite | Domain unter Domains & SSL wieder mit MyWebsite Now verbinden. |
| Redaktion: „Der Server antwortet nicht wie erwartet … Läuft PHP?“ | Im Webhosting-Paket PHP aktivieren (Hosting → PHP-Einstellungen, Version 8.x). |
| Redaktion: „Speichern auf dem Server nicht möglich“ | Im Webspace Explorer beim Ordner `daten/` die Rechte prüfen: Schreiben für den Besitzer erlaubt (755). |
| Redaktion: „Zu viele Versuche“ | Nach 5 falschen Passwörtern ist die Anmeldung 15 Minuten gesperrt. Abwarten. |
| Änderung erscheint nicht | Seite neu laden (Strg + F5). Im Zweifel in der Redaktion prüfen, ob „Alles gespeichert“ unten steht. |

## Später ändern

**Was der Kunde selbst ändert** (Redaktion): Hinweis oben auf jeder Seite,
Bürozeiten (inkl. „Jetzt geöffnet“ und Google-Daten), Tage und Uhrzeit des
Theorieunterrichts, Motorrad-Termine, Stellenanzeige an/aus.

**Alles andere** wird im Repo über `baukaesten/ruhig-modern/generatoren/build_letsdrive.py`
gepflegt. Neues ZIP: `python3 baukaesten/ruhig-modern/generatoren/build_letsdrive.py --zip`.
Das ZIP enthält **keine** gespeicherten Inhalte und keinen Zugang, ein erneutes
Entpacken über den alten Ordner überschreibt also nichts vom Kunden.
**Wichtig:** Beim Update den Ordner `daten/` **nie löschen**, nur überschreiben lassen.
Dauerhaft geänderte Bürozeiten zusätzlich im Google-Unternehmensprofil eintragen.
**AGB:** Sobald der Text vorliegt, wird die AGB-Seite eingeschaltet (`AGB_TEXT`).
