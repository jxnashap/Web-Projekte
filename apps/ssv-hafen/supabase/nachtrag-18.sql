-- ============================================================================
-- Nachtrag 18 · Winterlager West: 8 große Plätze (P41–P48) statt 20
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -17). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
--
-- Laut Verein (Nov. 2026) stehen auf dem Westparkplatz 8 Boote in zwei Reihen hintereinander (je 12 × 4,5 m,
-- Bug zur Messe); die Fläche zum Kran bleibt frei. Die Plätze P49–P60 gibt es damit nicht mehr.
-- Gelöscht wird ein Platz nur, wenn kein Boot darauf eingetragen ist – sonst bleibt er stehen
-- (im Lageplan-Fenster erscheint er dann als „Landplatz ohne Lagerfeld“).
-- ============================================================================
delete from public.landplaetze l
 where l.id in ('P49','P50','P51','P52','P53','P54','P55','P56','P57','P58','P59','P60')
   and not exists (select 1 from public.belegungen b where b.platz_id = l.id);
