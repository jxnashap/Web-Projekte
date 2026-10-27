-- ============================================================================
-- SSV Website · Redaktionsinhalte (läuft in derselben Datenbank wie die
-- Getränkekasse, siehe apps/ssv-getraenke/supabase/schema.sql)
--
-- · Jeder darf die Inhalte LESEN (die Website ist öffentlich).
-- · Nur freigeschaltete Redakteure dürfen sie ÄNDERN und Fotos hochladen.
-- · Ein Inhalt = ein Schlüssel (hinweis, hero, aktuelles, termine, zeiten,
--   zahlen, galerie, vorstand) mit JSON-Daten – genau das Format aus
--   js/inhalte-standard.js.
-- ============================================================================

create table if not exists public.redakteure (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name    text
);

create table if not exists public.website_inhalte (
  schluessel   text primary key check (schluessel in ('hinweis','hero','aktuelles','termine','zeiten','zahlen','galerie','vorstand')),
  daten        jsonb not null,
  geaendert    timestamptz not null default now(),
  geaendert_von uuid default auth.uid()
);

create or replace function public.ist_redakteur() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.redakteure where user_id = auth.uid());
$$;

create or replace function public._inhalt_gestempelt() returns trigger
language plpgsql as $$
begin new.geaendert := now(); new.geaendert_von := auth.uid(); return new; end $$;
drop trigger if exists inhalt_stempel on public.website_inhalte;
create trigger inhalt_stempel before insert or update on public.website_inhalte
  for each row execute function public._inhalt_gestempelt();

alter table public.redakteure      enable row level security;
alter table public.website_inhalte enable row level security;

drop policy if exists lesen on public.website_inhalte;
create policy lesen on public.website_inhalte for select to anon, authenticated using (true);
drop policy if exists schreiben on public.website_inhalte;
create policy schreiben on public.website_inhalte for all to authenticated
  using (public.ist_redakteur()) with check (public.ist_redakteur());
drop policy if exists selbst on public.redakteure;
create policy selbst on public.redakteure for select to authenticated using (user_id = auth.uid());

revoke all on public.website_inhalte from anon;
grant select on public.website_inhalte to anon;
grant select, insert, update, delete on public.website_inhalte to authenticated;
grant select on public.redakteure to authenticated;
grant execute on function public.ist_redakteur() to authenticated;

-- ------------------------------------------------------------- Fotos --
-- Öffentlicher Bucket „website“: jeder sieht Fotos, nur Redakteure laden hoch.
-- (Abschnitt nur in Supabase ausführbar – dort existiert das Schema storage.)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('website', 'website', true, 5242880, array['image/jpeg','image/png','image/webp'])
    on conflict (id) do nothing;
    drop policy if exists website_hochladen on storage.objects;
    create policy website_hochladen on storage.objects for insert to authenticated
      with check (bucket_id = 'website' and public.ist_redakteur());
    drop policy if exists website_loeschen on storage.objects;
    create policy website_loeschen on storage.objects for delete to authenticated
      using (bucket_id = 'website' and public.ist_redakteur());
  end if;
end $$;

-- Redakteur freischalten (Konto vorher unter Authentication → Users anlegen):
--   insert into public.redakteure (user_id, name)
--   select id, 'Redaktion' from auth.users where email = 'redaktion@ssv-net.de';
