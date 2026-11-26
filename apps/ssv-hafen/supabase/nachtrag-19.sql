-- ============================================================================
-- Nachtrag 19 · Getränke-Code: jeder 4-stellige Code erlaubt, keine Mitgliedsnummer
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -18). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
--
-- Wunsch des Vereins (Nov. 2026): Am Getränke-iPad tippt das Mitglied auf seinen Namen und gibt
-- nur seinen Code ein. Beim ersten Mal legt es den Code selbst fest (zweimal eingeben) – ohne
-- vorher die Mitgliedsnummer einzugeben. Jeder 4-stellige Code ist erlaubt, auch 1234 oder 1111.
-- Bleibt: nach 5 falschen Eingaben wird der Name kurz gesperrt; der Code wird nur verschlüsselt gespeichert.
-- ============================================================================

-- Nur noch das Format prüfen (genau 4 Ziffern)
create or replace function public._pin_ok(p text) returns boolean
language sql immutable as $$
  select coalesce(p, '') ~ '^[0-9]{4}$';
$$;

-- Mitgliedsnummer beim ersten Code nicht mehr abfragen
update public.einstellungen
   set daten = coalesce(daten, '{}'::jsonb) || '{"pin_erst_nr_pruefen": false, "pin_selbst_festlegen": true}'::jsonb
 where id = 1;
