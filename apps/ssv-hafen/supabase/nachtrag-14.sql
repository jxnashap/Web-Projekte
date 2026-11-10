-- ============================================================================
-- Nachtrag 14 · Veranstaltungen abrechnen (Rechnungen aus den Zusagen)
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -13). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- 1 · Neue Rechnungsart „veranstaltung“ (z. B. Wintertreffen: 2 Personen × 22 €)
alter table public.hafen_rechnungen drop constraint if exists hafen_rechnungen_periode_check;
alter table public.hafen_rechnungen add constraint hafen_rechnungen_periode_check
  check (periode in ('sommer', 'winter', 'beitrag', 'veranstaltung'));

-- 2 · Bezug zur Veranstaltung (bleibt als Text in den Positionen erhalten, auch wenn die Veranstaltung gelöscht wird)
alter table public.hafen_rechnungen add column if not exists veranstaltung_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'hafen_rechnungen_veranstaltung_fk') then
    alter table public.hafen_rechnungen add constraint hafen_rechnungen_veranstaltung_fk
      foreign key (veranstaltung_id) references public.veranstaltungen (id) on delete set null;
  end if;
end $$;

-- 3 · Schutz gegen doppelte Rechnungen:
--     Hafen/Beitrag wie bisher je Mitglied, Saison und Art; Veranstaltungen je Mitglied und Veranstaltung
drop index if exists public.hafen_rechnungen_einmal;
create unique index hafen_rechnungen_einmal
  on public.hafen_rechnungen (mitglied_id, saison, periode)
  where storniert_am is null and periode <> 'veranstaltung';
create unique index if not exists hafen_rechnungen_veranstaltung_einmal
  on public.hafen_rechnungen (mitglied_id, veranstaltung_id)
  where storniert_am is null and veranstaltung_id is not null;
