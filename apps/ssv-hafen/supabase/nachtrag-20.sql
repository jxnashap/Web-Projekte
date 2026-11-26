-- ============================================================================
-- Nachtrag 20 · Getränkekasse: Freigabe der Monatsrechnungen durch den Kassenwart
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -19). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
--
-- Wunsch des Vereins (Nov. 2026): Buchungen am Getränke-iPad brauchen keine Bestätigung.
-- Am Monatsende gibt der Kassenwart die einzelnen Monatsrechnungen frei; der Vorstand sieht im
-- Hafen-Manager unter Finanzen → Getränke alle Buchungen und bei jeder Rechnung den Stand
-- („noch nicht freigegeben“ / „freigegeben von … am …“).
-- ============================================================================
-- Frühere Fassung dieses Nachtrags (Freigabe je Buchung) zurücknehmen, falls sie schon eingespielt war
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
