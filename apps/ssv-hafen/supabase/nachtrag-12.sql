-- ============================================================================
-- Nachtrag 12 · Liegeplätze laut Luftbild und Verein: 54 statt 79
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -11). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- Vorhanden sind (Angabe des Vereins, Nov. 2026, geprüft am amtlichen Luftbild vom 13.06.2025):
--   Ostbrücke 1–16 · Westbrücke 25–56 (bis zum T-Stück) · Schwimmbrücke 71–76 · längsseits L1, L2
-- Die übrigen Nummern aus der Gebührenordnung 2024 (17–24, 57–70, 77–79) werden NICHT gelöscht,
-- sondern als „nicht vorhanden“ markiert und gesperrt. Der Hafen-Manager blendet sie aus; wer sie
-- später wieder braucht, setzt vorhanden = true und gesperrt = false.
alter table public.liegeplaetze add column if not exists vorhanden boolean not null default true;

update public.liegeplaetze l
   set vorhanden = false,
       gesperrt = true,
       notiz = 'Nicht vorhanden (Luftbild 2025, Angabe Verein Nov. 2026)'
 where l.vorhanden
   and l.nr ~ '^[0-9]+$'
   and (l.nr::int between 17 and 24 or l.nr::int between 57 and 70 or l.nr::int between 77 and 79)
   and not exists (select 1 from public.belegungen b where b.platz_id = l.id)
   and not exists (select 1 from public.gaeste g where g.platz_id = l.id and g.status <> 'storniert');

-- Kontrolle: so viele Plätze sind jetzt vorhanden (soll 54 + L1/L2 = 56)
select count(*) filter (where vorhanden) as vorhanden, count(*) filter (where not vorhanden) as ausgeblendet from public.liegeplaetze;
