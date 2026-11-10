-- ============================================================================
-- Nachtrag 8 · Arbeitsbereiche (Kran, Boote fahren, Lager, Steg …) mit Aufgaben und Mitgliedern
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -07). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- 1 · Bereiche: Name, Beschreibung, Treffpunkt/Hinweise und die Aufgabenliste
--     aufgaben = [{ "titel": "Kran vor Saisonbeginn prüfen", "zeitraum": "März", "stunden": 3, "hinweis": "…" }, …]
create table if not exists public.arbeitsbereiche (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) between 1 and 60),
  beschreibung text,
  treffpunkt   text,
  aufgaben     jsonb not null default '[]'::jsonb check (jsonb_typeof(aufgaben) = 'array'),
  sort         int not null default 0,
  aktiv        boolean not null default true,
  erstellt     timestamptz not null default now()
);

-- 2 · Wer gehört zu welchem Bereich (ein Mitglied kann in mehreren Bereichen sein)
create table if not exists public.arbeitsbereich_mitglieder (
  id          uuid primary key default gen_random_uuid(),
  bereich_id  uuid not null references public.arbeitsbereiche (id) on delete cascade,
  mitglied_id uuid not null references public.mitglieder (id) on delete cascade,
  rolle       text not null default 'mitglied' check (rolle in ('leitung', 'mitglied')),
  unique (bereich_id, mitglied_id)
);
create index if not exists arbeitsbereich_mitglieder_mitglied on public.arbeitsbereich_mitglieder (mitglied_id);

-- 3 · Stunden und Einsätze können einem Bereich zugeordnet werden
alter table public.arbeitsdienst add column if not exists bereich_id uuid;
alter table public.arbeitseinsaetze add column if not exists bereich_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'arbeitsdienst_bereich_fk') then
    alter table public.arbeitsdienst add constraint arbeitsdienst_bereich_fk foreign key (bereich_id) references public.arbeitsbereiche (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'arbeitseinsaetze_bereich_fk') then
    alter table public.arbeitseinsaetze add constraint arbeitseinsaetze_bereich_fk foreign key (bereich_id) references public.arbeitsbereiche (id) on delete set null;
  end if;
end $$;

-- Stunden aus einem Arbeitseinsatz übernehmen dessen Bereich (auch wenn das Mitglied per QR-Code meldet)
create or replace function public._arbeitsdienst_bereich() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.bereich_id is null and new.einsatz_id is not null then
    select bereich_id into new.bereich_id from public.arbeitseinsaetze where id = new.einsatz_id;
  end if;
  return new;
end $$;
drop trigger if exists arbeitsdienst_bereich on public.arbeitsdienst;
create trigger arbeitsdienst_bereich before insert on public.arbeitsdienst for each row execute function public._arbeitsdienst_bereich();
revoke execute on function public._arbeitsdienst_bereich() from public, anon, authenticated;

-- 4 · Rechte: Vereinsämter pflegen alles, Mitglieder sehen ihre Bereiche nur über die Funktion unten
alter table public.arbeitsbereiche enable row level security;
alter table public.arbeitsbereich_mitglieder enable row level security;
drop policy if exists personal on public.arbeitsbereiche;
create policy personal on public.arbeitsbereiche for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists personal on public.arbeitsbereich_mitglieder;
create policy personal on public.arbeitsbereich_mitglieder for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
revoke all on public.arbeitsbereiche, public.arbeitsbereich_mitglieder from anon;
grant select, insert, update, delete on public.arbeitsbereiche, public.arbeitsbereich_mitglieder to authenticated;

-- Änderungsverlauf wie bei den übrigen Tabellen
drop trigger if exists protokoll on public.arbeitsbereiche;
create trigger protokoll after insert or update or delete on public.arbeitsbereiche for each row execute function public._protokoll();
drop trigger if exists protokoll on public.arbeitsbereich_mitglieder;
create trigger protokoll after insert or update or delete on public.arbeitsbereich_mitglieder for each row execute function public._protokoll();

-- 5 · Mein SSV: „Deine Arbeitsbereiche“ – Aufgaben, Treffpunkt und wer den Bereich leitet (Name + Telefon)
create or replace function public.meine_arbeitsbereiche() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'name', b.name, 'beschreibung', b.beschreibung, 'treffpunkt', b.treffpunkt, 'aufgaben', b.aufgaben, 'rolle', ich.rolle,
    'leitung', (select coalesce(jsonb_agg(jsonb_build_object('name', m.vorname || ' ' || m.nachname, 'tel', m.tel)), '[]'::jsonb)
                  from public.arbeitsbereich_mitglieder l join public.mitglieder m on m.id = l.mitglied_id
                 where l.bereich_id = b.id and l.rolle = 'leitung'),
    'anzahl', (select count(*) from public.arbeitsbereich_mitglieder z where z.bereich_id = b.id)
  ) order by b.sort, b.name), '[]'::jsonb)
  from public.arbeitsbereich_mitglieder ich join public.arbeitsbereiche b on b.id = ich.bereich_id
  where ich.mitglied_id = public._mein_mitglied() and b.aktiv;
$$;
revoke execute on function public.meine_arbeitsbereiche() from public, anon;
grant execute on function public.meine_arbeitsbereiche() to authenticated;
