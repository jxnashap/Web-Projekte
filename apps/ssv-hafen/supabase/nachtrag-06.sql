-- ============================================================================
-- Nachtrag 6 · Arbeitseinsätze mit QR-Check-in, Mitteilungen (Sturmwarnung …), Push
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -05). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- 1 · Arbeitsstunden mit Stand: vom Verein erfasst (bestätigt) oder vom Mitglied gemeldet (eingereicht)
alter table public.arbeitsdienst add column if not exists status text not null default 'bestaetigt' check (status in ('eingereicht', 'bestaetigt', 'abgelehnt'));
alter table public.arbeitsdienst add column if not exists einsatz_id uuid;
alter table public.arbeitsdienst add column if not exists gemeldet timestamptz;
alter table public.arbeitsdienst add column if not exists geprueft_von text;

-- Arbeitseinsätze (Termine); der Check-in-Code liegt getrennt, damit Mitglieder ihn nicht lesen können
create table if not exists public.arbeitseinsaetze (
  id           uuid primary key default gen_random_uuid(),
  datum        date not null,
  titel        text not null,
  beginn       text,
  ende         text,
  stunden      numeric not null default 4 check (stunden > 0 and stunden <= 12),
  notiz        text,
  erstellt_von text
);
create table if not exists public.arbeitseinsatz_codes (
  einsatz_id uuid primary key references public.arbeitseinsaetze (id) on delete cascade,
  code       text not null unique
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'arbeitsdienst_einsatz_fk') then
    alter table public.arbeitsdienst add constraint arbeitsdienst_einsatz_fk foreign key (einsatz_id) references public.arbeitseinsaetze (id) on delete set null;
  end if;
end $$;
create unique index if not exists arbeitsdienst_einmal_je_einsatz on public.arbeitsdienst (mitglied_id, einsatz_id) where einsatz_id is not null and status <> 'abgelehnt';
alter table public.arbeitseinsaetze enable row level security;
alter table public.arbeitseinsatz_codes enable row level security;
drop policy if exists personal on public.arbeitseinsaetze;
create policy personal on public.arbeitseinsaetze for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists mitglieder_lesen on public.arbeitseinsaetze;
create policy mitglieder_lesen on public.arbeitseinsaetze for select to authenticated using (public._mein_mitglied() is not null);
drop policy if exists personal on public.arbeitseinsatz_codes;
create policy personal on public.arbeitseinsatz_codes for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop trigger if exists protokoll on public.arbeitseinsaetze;
create trigger protokoll after insert or update or delete on public.arbeitseinsaetze for each row execute function public._protokoll();

-- Mitglied meldet Stunden: per QR-Code am Einsatztag (Code muss stimmen) oder frei (z. B. Gartenarbeit) – beides zur Bestätigung
create or replace function public.mein_arbeitsdienst_melden(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen(); e public.arbeitseinsaetze; st numeric := nullif(replace(p->>'stunden', ',', '.'), '')::numeric; neu uuid; tag date := coalesce(nullif(p->>'datum', '')::date, current_date);
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  if st is null or st <= 0 or st > 12 then raise exception 'Bitte zwischen 0,5 und 12 Stunden angeben.'; end if;
  if coalesce(p->>'code', '') <> '' then
    select a.* into e from public.arbeitseinsaetze a join public.arbeitseinsatz_codes c on c.einsatz_id = a.id where c.code = upper(btrim(p->>'code'));
    if not found then raise exception 'Der Code passt zu keinem Arbeitseinsatz.'; end if;
    if e.datum not between current_date - 1 and current_date then raise exception 'Der Check-in geht nur am Tag des Einsatzes.'; end if;
    if exists (select 1 from public.arbeitsdienst where mitglied_id = mid and einsatz_id = e.id and status <> 'abgelehnt') then raise exception 'Für diesen Einsatz bist du schon eingetragen.'; end if;
    tag := e.datum;
  elsif tag > current_date or tag < current_date - 60 then raise exception 'Bitte ein Datum aus den letzten 60 Tagen angeben.';
  end if;
  if (select count(*) from public.arbeitsdienst where mitglied_id = mid and gemeldet > now() - interval '1 day') >= 5 then raise exception 'Heute wurden schon genug Stunden gemeldet.'; end if;
  insert into public.arbeitsdienst (mitglied_id, datum, stunden, taetigkeit, status, einsatz_id, gemeldet)
  values (mid, tag, st, left(coalesce(nullif(btrim(p->>'taetigkeit'), ''), e.titel, 'Arbeitseinsatz'), 120), 'eingereicht', e.id, now())
  returning id into neu;
  return jsonb_build_object('ok', true, 'id', neu, 'einsatz', e.titel, 'datum', tag);
end $$;

-- eigener Arbeitsdienst inklusive gemeldeter (noch nicht bestätigter) Stunden
create or replace function public.mein_arbeitsdienst() returns setof public.arbeitsdienst
language sql stable security definer set search_path = public as $$
  select * from public.arbeitsdienst where mitglied_id = public._mein_mitglied() and datum >= make_date(extract(year from current_date)::int - 2, 1, 1) order by datum desc
$$;

-- 2 · Mitteilungen des Vereins (z. B. „Sturmwarnung – Boote sichern!“)
create table if not exists public.mitteilungen (
  id           uuid primary key default gen_random_uuid(),
  titel        text not null,
  text         text,
  wichtig      boolean not null default false,
  zielgruppe   text not null default 'alle' check (zielgruppe in ('alle', 'bootseigner', 'liegeplatz')),
  gueltig_bis  date,
  erstellt     timestamptz not null default now(),
  erstellt_von text,
  push_gesendet timestamptz
);
alter table public.mitteilungen enable row level security;
drop policy if exists personal on public.mitteilungen;
create policy personal on public.mitteilungen for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists mitglieder_lesen on public.mitteilungen;
create policy mitglieder_lesen on public.mitteilungen for select to authenticated using (public._mein_mitglied() is not null and (gueltig_bis is null or gueltig_bis >= current_date));
drop trigger if exists protokoll on public.mitteilungen;
create trigger protokoll after insert or update or delete on public.mitteilungen for each row execute function public._protokoll();

-- Kasse (iPad, ohne Login): aktuelle wichtige Mitteilungen anzeigen
create or replace function public.kasse_mitteilungen(p_token text) returns setof public.mitteilungen
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')) then
    raise exception 'Kasse nicht eingerichtet' using errcode = '28000';
  end if;
  return query select * from public.mitteilungen where (gueltig_bis is null or gueltig_bis >= current_date) and zielgruppe = 'alle' order by wichtig desc, erstellt desc limit 3;
end $$;

-- 3 · Push-Benachrichtigungen (freiwillig, je Gerät). Versand über die Edge Function „push“.
create table if not exists public.push_abos (
  id          uuid primary key default gen_random_uuid(),
  mitglied_id uuid not null references public.mitglieder (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  geraet      text,
  erstellt    timestamptz not null default now()
);
alter table public.push_abos enable row level security;
drop policy if exists selbst on public.push_abos;
create policy selbst on public.push_abos for all to authenticated using (mitglied_id = public._mein_mitglied()) with check (mitglied_id = public._mein_mitglied());
-- Schlüsselpaar für Web-Push: legt die Edge Function beim ersten Aufruf selbst an; niemand außer ihr liest es
create table if not exists public.push_schluessel (
  id         int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  erstellt   timestamptz not null default now()
);
alter table public.push_schluessel enable row level security;
revoke all on public.push_schluessel from anon, authenticated;

revoke execute on function public.mein_arbeitsdienst_melden(jsonb) from public, anon;
grant execute on function public.mein_arbeitsdienst_melden(jsonb), public.mein_arbeitsdienst() to authenticated;
revoke execute on function public.kasse_mitteilungen(text) from public;
grant execute on function public.kasse_mitteilungen(text) to anon, authenticated;
