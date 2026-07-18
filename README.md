# Propp Elektrotechnik GmbH – Website-Relaunch

Deploy-fertige, mehrseitige Website für die **Propp Elektrotechnik GmbH** (Lübeck, seit 1949).
Logo, Markenfarbe (Azur #009EE3 / HKS 47) und alle Inhalte wurden von der bestehenden
Seite `propp.de` übernommen. Kern-Feature: eine **Kabel-Scroll-Animation** (Strom-Kabel
zeichnet sich beim Scrollen, Funke wandert entlang, Leistungen erscheinen nacheinander).

Der fertige Website-Ordner liegt unter **`propp-elektrotechnik/`** – Details siehe
`propp-elektrotechnik/README.md`.

## Seiten
Start · Elektroinstallation · Blitzschutz & Erdung · Über uns · Karriere · Kontakt
(+ Impressum, Datenschutz). Navigation mit Leistungen-Dropdown, identischer Header/Footer.

## Deploy
Statischer Ordner `propp-elektrotechnik/` – ohne Build-Schritt bei Netlify/Vercel
hochladbar. Hinweis: Das SSL-Zertifikat der aktuellen Domain `propp.de` ist abgelaufen
(Seite nur über http) und sollte beim Livegang erneuert werden.
