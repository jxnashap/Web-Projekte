-- ============================================================================
-- Nachtrag 9 · Toilettencode für Gastlieger (nach der Zahlung) und Zahlstand für die Gast-Seite
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -08). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- 1 · Eine Zeile mit dem aktuellen Code. Eigene Tabelle (nicht in den Einstellungen), damit der Hafenmeister
--     den Code selbst wechseln kann, ohne Zugriff auf Bank- und Vereinsdaten zu bekommen.
--     regel: ''           = Code wird Gästen nicht angezeigt
--            'gemeldet'   = sofort, sobald der Gast „bezahlt“ meldet (PayPal, Überweisung, bar) – Vertrauensprinzip
--            'bestaetigt' = erst, wenn der Verein den Zahlungseingang bestätigt hat
create table if not exists public.gast_toilette (
  id            int primary key default 1 check (id = 1),
  code          text not null default '',
  regel         text not null default '' check (regel in ('', 'gemeldet', 'bestaetigt')),
  hinweis       text not null default '',
  geaendert     timestamptz not null default now(),
  geaendert_von text
);
insert into public.gast_toilette (id) values (1) on conflict do nothing;
alter table public.gast_toilette enable row level security;
drop policy if exists personal on public.gast_toilette;
create policy personal on public.gast_toilette for select to authenticated using (public.ist_personal());
drop policy if exists personal_aendern on public.gast_toilette;
create policy personal_aendern on public.gast_toilette for update to authenticated using (public.ist_personal()) with check (public.ist_personal());
revoke all on public.gast_toilette from anon;
grant select, update on public.gast_toilette to authenticated;
drop trigger if exists protokoll on public.gast_toilette;
create trigger protokoll after update on public.gast_toilette for each row execute function public._protokoll();

-- 2 · Darf dieser Gast den Code sehen? Nur während des Aufenthalts (Ankunft −1 Tag bis Abreisetag)
create or replace function public._gast_code(g public.gaeste) returns text
language sql stable security definer set search_path = public as $$
  select case when t.code <> '' and g.status <> 'storniert'
               and current_date between g.ankunft - 1 and g.ankunft + g.naechte
               and ((t.regel = 'gemeldet' and (g.zahlung_gemeldet is not null or g.bezahlt_am is not null))
                 or (t.regel = 'bestaetigt' and g.bezahlt_am is not null))
              then t.code end
  from public.gast_toilette t where t.id = 1;
$$;
revoke execute on function public._gast_code(public.gaeste) from public, anon, authenticated;

-- 3 · Gast-Seite: aktueller Stand der eigenen Anmeldung (die ID kennt nur der Gast selbst)
create or replace function public.gast_status(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g public.gaeste; t public.gast_toilette;
begin
  select * into g from public.gaeste where id = p_id and quelle = 'qr';
  if not found then raise exception 'Anmeldung nicht gefunden'; end if;
  select * into t from public.gast_toilette where id = 1;
  return jsonb_build_object('gemeldet', g.zahlung_gemeldet is not null, 'bezahlt', g.bezahlt_am is not null,
    'code', public._gast_code(g), 'regel', coalesce(t.regel, ''), 'hinweis', nullif(t.hinweis, ''));
end $$;

-- 4 · „Habe bezahlt“ melden – gibt den Code gleich mit zurück, wenn die Regel das erlaubt
create or replace function public.gast_zahlung_melden(p_id uuid, p_art text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.gaeste;
begin
  if p_art not in ('paypal', 'ueberweisung', 'bar') then raise exception 'Zahlart unbekannt'; end if;
  update public.gaeste set zahlung = p_art, zahlung_gemeldet = now()
   where id = p_id and quelle = 'qr' and bezahlt_am is null and status <> 'storniert' and erstellt > now() - interval '35 days'
  returning * into g;
  if not found then raise exception 'Anmeldung nicht gefunden – bitte beim Hafenmeister melden'; end if;
  return jsonb_build_object('ok', true, 'code', public._gast_code(g), 'hinweis', (select nullif(hinweis, '') from public.gast_toilette where id = 1),
                            'regel', (select regel from public.gast_toilette where id = 1));
end $$;

-- 5 · Gast-Seite vorab: gibt es einen Toilettencode (ohne ihn zu verraten)?
create or replace function public.gast_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gast_nacht', coalesce((select (daten->>'gast_nacht')::numeric from public.gebuehren where jahr <= extract(year from now()) order by jahr desc limit 1), 15),
    'hafenmeister_name', e.daten->>'hafenmeister_name', 'hafenmeister_tel', e.daten->>'hafenmeister_tel', 'verein_name', e.daten->>'verein_name',
    'iban', e.daten->>'iban', 'bic', e.daten->>'bic', 'paypal_me', e.daten->>'paypal_me', 'gast_bar_hinweis', e.daten->>'gast_bar_hinweis',
    'toilette', (select regel from public.gast_toilette where id = 1 and code <> ''))
  from public.hafen_einstellungen e where e.id = 1;
$$;

revoke execute on function public.gast_status(uuid), public.gast_zahlung_melden(uuid, text) from public;
grant execute on function public.gast_info(), public.gast_status(uuid), public.gast_zahlung_melden(uuid, text) to anon, authenticated;
