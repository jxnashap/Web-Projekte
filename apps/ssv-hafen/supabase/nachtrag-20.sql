-- ============================================================================
-- Nachtrag 20 · Getränkebuchungen: Freigabe durch den Kassenwart
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -19). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
--
-- Wunsch des Vereins (Nov. 2026): Jede Buchung am Getränke-iPad ist zunächst „unbestätigt“.
-- Der Kassenwart bestätigt sie (einzeln oder alle auf einmal); der Vorstand sieht im Hafen-Manager
-- unter Finanzen → Getränke alle Buchungen mit ihrem Stand („unbestätigt“ / „bestätigt von … am …“).
-- Bestehende Buchungen bleiben unbestätigt, bis der Kassenwart sie bestätigt.
-- ============================================================================
-- Spalten: wann und von wem bestätigt (leer = unbestätigt)
alter table public.buchungen add column if not exists bestaetigt_am  timestamptz;
alter table public.buchungen add column if not exists bestaetigt_von text;
create index if not exists buchungen_unbestaetigt on public.buchungen (zeit) where bestaetigt_am is null and storniert_am is null;

-- Wer darf bestätigen? Der Kassenwart (Rolle), dazu ein reiner Kassen-Verwalter (Tabelle admins) ohne Vorstandsrolle.
-- Der Vorstand sieht alle Buchungen samt Stand, bestätigt aber nicht selbst.
create or replace function public.darf_buchungen_bestaetigen() returns boolean
language sql stable security definer set search_path = public as $$
  select public.hat_rolle('kassenwart')
      or (exists (select 1 from public.admins where user_id = auth.uid()) and not public.hat_rolle('vorstand'));
$$;

-- Schutz in der Datenbank: Bestätigung nur durch den Kassenwart – auch nicht am Programm vorbei änderbar
create or replace function public._buchung_bestaetigung_pruefen() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.bestaetigt_am is distinct from old.bestaetigt_am or new.bestaetigt_von is distinct from old.bestaetigt_von)
     and auth.uid() is not null and not public.darf_buchungen_bestaetigen() then
    raise exception 'Nur der Kassenwart kann Buchungen bestätigen.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists buchung_bestaetigung on public.buchungen;
create trigger buchung_bestaetigung before update on public.buchungen
  for each row execute function public._buchung_bestaetigung_pruefen();

-- Bestätigen (einzeln oder viele auf einmal); Name des Kassenwarts aus dem Mitgliederstamm
create or replace function public.buchungen_bestaetigen(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int; wer text;
begin
  if not public.darf_buchungen_bestaetigen() then
    raise exception 'Nur der Kassenwart kann Buchungen bestätigen.' using errcode = '42501';
  end if;
  select nullif(btrim(coalesce(vorname, '') || ' ' || coalesce(nachname, '')), '') into wer from public.mitglieder where user_id = auth.uid() limit 1;
  update public.buchungen set bestaetigt_am = now(), bestaetigt_von = coalesce(wer, 'Kassenwart')
   where id = any (p_ids) and bestaetigt_am is null and storniert_am is null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.buchungen_bestaetigen(uuid[]) from public, anon;
revoke execute on function public.darf_buchungen_bestaetigen() from public, anon;
grant execute on function public.buchungen_bestaetigen(uuid[]), public.darf_buchungen_bestaetigen() to authenticated;
