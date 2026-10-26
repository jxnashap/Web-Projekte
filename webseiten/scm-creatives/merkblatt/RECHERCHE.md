# Merkblatt „Werbekosten absetzen“: Recherche, Belege, offene Punkte

Stand: 26.10.2026 · Steuerjahr 2026 · Ergebnis: `SCM-Creatives-Merkblatt-Werbekosten.pdf` (8 Seiten A4),
Kopie in `auslieferung/`. Neu bauen: `python3 build_merkblatt.py` (rechnet alle Zahlen mit `steuer2026.py`).

## Wie recherchiert wurde

- **6 Themen per Workflow**, je ein Rechercheur und ein Gegenprüfer, der die Aussagen zu widerlegen versuchte:
  Betriebsausgaben, Umsatzsteuer, Werbeanzeigen, Steuersätze 2026, Zeitpunkt und Buchhaltung, Rechtsrahmen für das Merkblatt.
  Rohdaten: Journale der Workflow-Läufe (Session-Verzeichnis), Kernaussagen unten.
- **Primärquellen über die Asset-Bridge** (`.preview-cache/scm/steuern/`): Gesetzestexte von gesetze-im-internet.de und buzer.de
  (Stand 25.10.2026, mit Fassungshistorie), DIHK-Hebesätze 2026, FG Rheinland-Pfalz 5 K 1815/10 im Volltext, Meta-Hilfeseite zur
  Umsatzsteuer, BMF-FAQ E-Rechnung, Haufe zur Anlage EÜR.
- **Review des fertigen Merkblatts** durch 4 Prüfer: Fakten, unabhängige Nachrechnung, Steuerberatungs- und Werberecht, Lesbarkeit.

## Belegte Kernaussagen (im Merkblatt verwendet)

| Aussage | Beleg |
|---|---|
| Agenturkosten für Werbung sind Betriebsausgaben, keine Kürzung wie bei Geschenken/Bewirtung | § 4 Abs. 4, 5 EStG |
| Laufende Werbung sofort abziehbar; einmaliger Film: echte Auftragsproduktion = Aktivierung, unechte = Sofortabzug | § 5 Abs. 2 EStG; FG Rheinland-Pfalz 29.03.2012, 5 K 1815/10 (Volltext in `quellen/`) |
| GWG-Sofortabschreibung gilt nicht für immaterielle Wirtschaftsgüter (Filme) | § 6 Abs. 2 EStG; BFH III B 7/14 (laut Recherche) |
| Einkommensteuertarif 2026 (Grundfreibetrag 12.348 €, Formeln) | § 32a Abs. 1 EStG, Fassung ab VZ 2026 |
| Soli-Freigrenze 2026: 20.350 € / 40.700 € | § 3 Abs. 3 SolZG |
| Gewerbesteuer: Freibetrag 24.500 €, Messzahl 3,5 %, Anrechnung 4,0 × Messbetrag | § 11 GewStG, § 35 EStG |
| Hebesatz Kiel und Lübeck 2026: 450 % | DIHK, Hebesätze Stand 01.07.2026 (`quellen/dihk-hebesaetze-2026.*`) |
| KSt 15 % bis 2027, dann 14/13/12/11 %, ab 2032 10 % | § 23 Abs. 1 KStG (Investitionssofortprogramm 14.07.2025) |
| Kleinunternehmer: Vorjahr ≤ 25.000 €, laufendes Jahr ≤ 100.000 €, kein Vorsteuerabzug | § 19 Abs. 1 UStG, § 15 Abs. 2 UStG |
| Meta rechnet über Meta Platforms Ireland ab, bei geschäftlichem Kauf ohne USt, Kunde muss selbst versteuern | Meta Business-Hilfe (`quellen/meta-vat-help.md`), § 13b Abs. 1, 5 UStG |
| Kleinunternehmer schulden § 13b-Steuer, ohne Vorsteuerabzug, Voranmeldung nach § 18 Abs. 4a | § 13b Abs. 5, § 15 Abs. 2, § 18 Abs. 4a, § 19 Abs. 1 UStG |
| E-Rechnung: Empfang seit 2025 Pflicht; PDF für Leistungen 2026 nur bei Übermittlung bis 31.12.2026; 2027 nur Aussteller ≤ 800.000 €; ab 2028 Pflicht | § 14, § 27 Abs. 38 UStG; BMF 15.10.2024/2025/2026 |
| 10-Tage-Regel: Zahlung und Fälligkeit zwischen 22.12. und 10.01. | § 11 Abs. 2 EStG; BFH 16.02.2022, X R 2/21 |
| Buchungsbelege 8 Jahre aufbewahren | § 147 Abs. 3 AO (seit 2025) |
| Buchführungspflicht erst ab 800.000 € Umsatz oder 80.000 € Gewinn; GmbH immer | § 141 AO; § 6, § 238 HGB, § 13 Abs. 3 GmbHG |
| Merkblatt darf nur allgemein informieren, keine Prüfung des Einzelfalls | § 2 Abs. 2 StBerG n. F. (ab 01.09.2026), §§ 5, 6 StBerG |

## Vor dem Verteilen an Kunden zu klären (SCM)

1. **Steuerberater gegenlesen lassen.** Das Merkblatt ist allgemein formuliert und als Modellrechnung gekennzeichnet. Wegen §§ 2, 5 StBerG
   (Bußgeld, Abmahnung durch die Steuerberaterkammer möglich) trotzdem einmal von einer Steuerberatung prüfen lassen.
2. **Weist SCM Umsatzsteuer aus?** Das Impressum nennt eine USt-IdNr (Blacksnapper Consulting). Ist SCM regelbesteuert, stimmt die
   Modellrechnung (Vorsteuer zurück). Wäre SCM Kleinunternehmer, gäbe es keine Vorsteuer auf SCM-Rechnungen. Das Merkblatt formuliert deshalb
   allgemein („Umsatzsteuer auf einer ordnungsgemäßen Rechnung“).
3. **Werbebudget:** Läuft es bei SCM über das Werbekonto der Kunden oder rechnet SCM es weiter? Das Merkblatt beschreibt beide Wege neutral.
4. **E-Rechnung bei SCM:** Dezember-2026-Leistungen bis 31.12.2026 abrechnen oder als E-Rechnung schicken (§ 27 Abs. 38 Nr. 1 UStG).
   Ab Leistungen 2028 nur noch E-Rechnungen (XRechnung/ZUGFeRD).
5. **Paketpreis im Beispiel:** 1.000 € netto pro Monat ist ein Rechenwert (sichtbar so gekennzeichnet). Bei Bedarf in `BEISPIEL` anpassen.

## Offen geblieben (nicht im Merkblatt, weil nicht belegt)

- Welche TikTok-Gesellschaft Werbekunden in Deutschland abrechnet (nur die Hilfeseite „EU & UK: VAT“ ist belegt).
- Kennzahlen der Umsatzsteuer-Voranmeldung 2026 für § 13b-Leistungen.
- Förderprogramme in Schleswig-Holstein für Marketing (BAFA, IB.SH): nicht recherchiert, Social-Media-Produktion vermutlich nicht förderfähig.
- Einkommensteuerreformgesetz 2027 (Regierungsentwurf, BT-Drs. 21/8235): noch nicht beschlossen, Tarif 2027 deshalb nicht im Merkblatt.
