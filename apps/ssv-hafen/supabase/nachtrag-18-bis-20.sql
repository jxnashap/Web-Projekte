-- ============================================================================
-- Nachträge 18 bis 20 in einer Datei – für die Live-Datenbank (Stand: Nachtrag 17 ist eingespielt)
-- Im Supabase SQL Editor: Inhalt komplett einfügen und einmal „Run“. Läuft als ein Block:
-- klappt etwas nicht, wird nichts geändert. Darf auch mehrfach laufen.
--
--   18 · Winterlager West: nur noch 8 große Plätze P41–P48 (P49–P60 entfallen, sofern kein Boot darauf steht)
--   19 · Getränke-Code: jeder 4-stellige Code erlaubt, beim ersten Mal keine Mitgliedsnummer
--   20 · Getränkekasse: Freigabe der Monatsrechnungen durch den Kassenwart
-- ============================================================================
begin;


-- ---------------------------------------------------------------- Nachtrag 18
delete from public.landplaetze l
 where l.id in ('P49','P50','P51','P52','P53','P54','P55','P56','P57','P58','P59','P60')
   and not exists (select 1 from public.belegungen b where b.platz_id = l.id);

-- ---------------------------------------------------------------- Nachtrag 19

-- Nur noch das Format prüfen (genau 4 Ziffern)
create or replace function public._pin_ok(p text) returns boolean
language sql immutable as $$
  select coalesce(p, '') ~ '^[0-9]{4}$';
$$;

-- Mitgliedsnummer beim ersten Code nicht mehr abfragen
update public.einstellungen
   set daten = coalesce(daten, '{}'::jsonb) || '{"pin_erst_nr_pruefen": false, "pin_selbst_festlegen": true}'::jsonb
 where id = 1;

-- ---------------------------------------------------------------- Nachtrag 20
drop trigger if exists buchung_bestaetigung on public.buchungen;
drop function if exists public.buchungen_bestaetigen(uuid[]);
drop function if exists public._buchung_bestaetigung_pruefen();
drop function if exists public.darf_buchungen_bestaetigen();
drop index if exists public.buchungen_unbestaetigt;
alter table public.buchungen drop column if exists bestaetigt_am;
alter table public.buchungen drop column if exists bestaetigt_von;

-- Monatsrechnungen der Getränkekasse: wann und von wem freigegeben (leer = noch nicht freigegeben)
alter table public.rechnungen add column if not exists freigegeben_am  timestamptz;
alter table public.rechnungen add column if not exists freigegeben_von text;

-- Wer darf freigeben? Der Kassenwart (Rolle), dazu ein reiner Kassen-Verwalter (Tabelle admins) ohne Vorstandsrolle.
-- Der Vorstand sieht alle Rechnungen samt Stand, gibt aber nicht selbst frei.
create or replace function public.darf_rechnungen_freigeben() returns boolean
language sql stable security definer set search_path = public as $$
  select public.hat_rolle('kassenwart')
      or (exists (select 1 from public.admins where user_id = auth.uid()) and not public.hat_rolle('vorstand'));
$$;

-- Schutz in der Datenbank: Freigabe nur durch den Kassenwart – auch nicht am Programm vorbei änderbar
create or replace function public._rechnung_freigabe_pruefen() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.freigegeben_am is distinct from old.freigegeben_am or new.freigegeben_von is distinct from old.freigegeben_von)
     and auth.uid() is not null and not public.darf_rechnungen_freigeben() then
    raise exception 'Nur der Kassenwart kann Rechnungen freigeben.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists rechnung_freigabe on public.rechnungen;
create trigger rechnung_freigabe before update on public.rechnungen
  for each row execute function public._rechnung_freigabe_pruefen();

-- Freigeben (einzeln oder alle eines Monats); Name des Kassenwarts aus dem Mitgliederstamm
create or replace function public.rechnungen_freigeben(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int; wer text;
begin
  if not public.darf_rechnungen_freigeben() then
    raise exception 'Nur der Kassenwart kann Rechnungen freigeben.' using errcode = '42501';
  end if;
  select nullif(btrim(coalesce(vorname, '') || ' ' || coalesce(nachname, '')), '') into wer from public.mitglieder where user_id = auth.uid() limit 1;
  update public.rechnungen set freigegeben_am = now(), freigegeben_von = coalesce(wer, 'Kassenwart')
   where id = any (p_ids) and freigegeben_am is null and storniert_am is null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.rechnungen_freigeben(uuid[]) from public, anon;
revoke execute on function public.darf_rechnungen_freigeben() from public, anon;
grant execute on function public.rechnungen_freigeben(uuid[]), public.darf_rechnungen_freigeben() to authenticated;

commit;
