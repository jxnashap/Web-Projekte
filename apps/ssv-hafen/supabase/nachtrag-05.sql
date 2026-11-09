-- ============================================================================
-- Nachtrag 5 · Getränkekasse ohne Netz: Buchungen nachtragen (Feedback-Runde 2)
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -04). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- Kennungen bereits verbuchter Buchungen (gegen doppeltes Nachtragen nach Verbindungsabbruch)
create table if not exists public.kasse_nachtraege (
  ref     text primary key,
  eingang timestamptz not null default now()
);
alter table public.kasse_nachtraege enable row level security;
revoke all on public.kasse_nachtraege from anon, authenticated;

-- Buchen mit eigener Kennung und Buchungszeit: das iPad merkt sich Buchungen ohne Netz und trägt sie später nach.
-- Der Code wird beim Nachtragen geprüft; dieselbe Kennung wird nur einmal verbucht.
create or replace function public.kasse_buchen_nach(p_token text, p_mitglied uuid, p_pin text, p_posten jsonb, p_zeit timestamptz, p_ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; s numeric;
begin
  if p_ref is null or length(p_ref) < 8 or length(p_ref) > 64 then raise exception 'Buchungskennung fehlt'; end if;
  perform pg_advisory_xact_lock(hashtext('ssv-kasse:' || p_ref));
  if exists (select 1 from public.kasse_nachtraege where ref = p_ref) then
    return jsonb_build_object('ok', true, 'doppelt', true) || public._summen(p_mitglied);
  end if;
  if p_zeit is null or p_zeit > now() + interval '10 minutes' or p_zeit < now() - interval '14 days' then raise exception 'Buchungszeit unplausibel'; end if;
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  s := public._buchen(p_mitglied, p_posten, case when p_zeit < now() - interval '2 minutes' then 'kasse (nachgetragen)' else 'kasse' end, p_zeit);
  insert into public.kasse_nachtraege (ref) values (p_ref);
  delete from public.kasse_nachtraege where eingang < now() - interval '60 days';
  return jsonb_build_object('ok', true, 'summe', s) || public._summen(p_mitglied);
end $$;
revoke execute on function public.kasse_buchen_nach(text, uuid, text, jsonb, timestamptz, text) from public;
grant execute on function public.kasse_buchen_nach(text, uuid, text, jsonb, timestamptz, text) to anon, authenticated;
