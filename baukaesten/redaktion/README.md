# Baukasten „Redaktion“

Wiederverwendbares Schema, mit dem eine statische Kunden-Website einen eigenen Redaktionsbereich
(`/verwaltung/`) bekommt – Texte, Termine, Preise und Fotos pflegt der Kunde selbst, ohne neues
Hochladen.

| Datei | Zweck |
|---|---|
| `Redaktion-Schema.md` | das vollständige Bauschema: Aufbau, Inhaltsmodell, Datenbank, Sicherheit, Ablauf „alte Website → neue Website mit Redaktion“, Auftrag für einen anderen Chat |
| `Uebergabeformular-Vorlage.md` | Übergabe an den Kunden: Adressen, was er selbst ändern kann, erste Schritte, Kosten, offene Punkte, Abnahme |

Beide Dateien sind als **Obsidian-Notizen** geschrieben (Kopfdaten, `bereich: Website-Entwicklung`)
und gehören in die Vault unter „Website-Entwicklung“. Hier im Repo liegt die Fassung, die zum Code passt.

Referenz-Umsetzung: `webseiten/ssv-segelverein/` (Generator
`baukaesten/quiet-luxury/generatoren/build_ssv.py`).
