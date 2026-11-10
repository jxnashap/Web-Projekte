-- ============================================================================
-- Nachtrag 10 · Schutz gegen doppelte Hafen- und Beitragsrechnungen
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -09). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- Je Mitglied, Saison und Art (Beitrag / Sommer / Winter) darf es nur EINE gültige Rechnung geben.
-- Stornierte Rechnungen zählen nicht – nach einem Storno kann neu abgerechnet werden.
-- Klicken zwei Personen gleichzeitig auf „Rechnungen erstellen“, lehnt die Datenbank die zweite
-- Rechnung ab; der Hafen-Manager meldet das und lädt den aktuellen Stand neu.
-- (Gäbe es schon doppelte Rechnungen, bricht der Befehl mit einer Meldung ab – dann erst eine stornieren.)
create unique index if not exists hafen_rechnungen_einmal
  on public.hafen_rechnungen (mitglied_id, saison, periode)
  where storniert_am is null;
