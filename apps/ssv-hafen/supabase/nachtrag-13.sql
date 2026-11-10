-- ============================================================================
-- Nachtrag 13 · Veranstaltungen mit Zu- und Absage in „Mein SSV“
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -12). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- 1 · Veranstaltungen (Wintertreffen, Jahreshauptversammlung, Ansegeln …), gepflegt im Hafen-Manager
create table if not exists public.veranstaltungen (
  id             uuid primary key default gen_random_uuid(),
  datum          date not null,
  beginn         text,
  ende           text,
  titel          text not null check (length(btrim(titel)) between 1 and 90),
  ort            text,
  text           text check (length(text) <= 1500),
  anmeldung_bis  date,                                                        -- leer = bis zum Tag selbst
  max_personen   int check (max_personen is null or max_personen between 1 and 2000),
  begleitung     int not null default 0 check (begleitung between 0 and 9),  -- so viele Gäste darf jedes Mitglied mitbringen
  kosten         numeric check (kosten is null or kosten >= 0),                -- je Person, nur zur Information
  kosten_hinweis text,                                                        -- z. B. „bar vor Ort“
  abgesagt       boolean not null default false,
  erstellt       timestamptz not null default now(),
  erstellt_von   text
);

-- 2 · Antworten der Mitglieder: eine je Mitglied und Veranstaltung
create table if not exists public.zusagen (
  id               uuid primary key default gen_random_uuid(),
  veranstaltung_id uuid not null references public.veranstaltungen (id) on delete cascade,
  mitglied_id      uuid not null references public.mitglieder (id) on delete cascade,
  antwort          text not null check (antwort in ('ja', 'nein')),
  personen         int not null default 1 check (personen between 0 and 10),   -- bei „ja“: Mitglied plus Begleitung
  bemerkung        text check (length(bemerkung) <= 200),                      -- z. B. „vegetarisch“
  quelle           text not null default 'mein-ssv' check (quelle in ('mein-ssv', 'verein')),
  geaendert        timestamptz not null default now(),
  unique (veranstaltung_id, mitglied_id)
);
create index if not exists zusagen_mitglied on public.zusagen (mitglied_id);

-- 3 · Rechte: Vereinsämter pflegen alles. Mitglieder lesen Veranstaltungen und nur die eigenen Antworten;
--     antworten können sie nur über die Funktion unten (prüft Frist und freie Plätze).
alter table public.veranstaltungen enable row level security;
alter table public.zusagen enable row level security;
drop policy if exists personal on public.veranstaltungen;
create policy personal on public.veranstaltungen for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists mitglieder_lesen on public.veranstaltungen;
create policy mitglieder_lesen on public.veranstaltungen for select to authenticated using (public._mein_mitglied() is not null and datum >= current_date - 30);
drop policy if exists personal on public.zusagen;
create policy personal on public.zusagen for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists selbst on public.zusagen;
create policy selbst on public.zusagen for select to authenticated using (mitglied_id = public._mein_mitglied());
revoke all on public.veranstaltungen, public.zusagen from anon;
grant select, insert, update, delete on public.veranstaltungen, public.zusagen to authenticated;

drop trigger if exists protokoll on public.veranstaltungen;
create trigger protokoll after insert or update or delete on public.veranstaltungen for each row execute function public._protokoll();
drop trigger if exists protokoll on public.zusagen;
create trigger protokoll after insert or update or delete on public.zusagen for each row execute function public._protokoll();

-- 4 · Mein SSV: kommende Veranstaltungen mit eigener Antwort und Zahl der Zusagen (ohne Namen anderer)
create or replace function public.meine_veranstaltungen() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(v) || jsonb_build_object(
    'belegt', (select coalesce(sum(z.personen), 0) from public.zusagen z where z.veranstaltung_id = v.id and z.antwort = 'ja'),
    'meine', (select to_jsonb(z) - 'mitglied_id' from public.zusagen z where z.veranstaltung_id = v.id and z.mitglied_id = public._mein_mitglied())
  ) order by v.datum, v.beginn), '[]'::jsonb)
  from public.veranstaltungen v
  where public._mein_mitglied() is not null and v.datum >= current_date
$$;

-- 5 · Mein SSV: zu- oder absagen (oder die Antwort ändern) – bis zur Anmeldefrist und solange Plätze frei sind
create or replace function public.meine_zusage(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  mid uuid := public._mitglied_verknuepfen();
  v public.veranstaltungen;
  ant text := p->>'antwort';
  pers int := case when p->>'antwort' = 'ja' then coalesce(nullif(p->>'personen', '')::int, 1) else 0 end;
  andere int;
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  if ant not in ('ja', 'nein') then raise exception 'Bitte zu- oder absagen.'; end if;
  select * into v from public.veranstaltungen where id = (p->>'veranstaltung_id')::uuid for update;   -- sperrt die Zeile: keine Überbuchung bei gleichzeitigen Zusagen
  if not found then raise exception 'Diese Veranstaltung gibt es nicht mehr.'; end if;
  if v.abgesagt then raise exception 'Die Veranstaltung wurde abgesagt.'; end if;
  if v.datum < current_date or current_date > coalesce(v.anmeldung_bis, v.datum) then
    raise exception 'Die Anmeldefrist ist vorbei – bitte direkt beim Vorstand melden.';
  end if;
  if ant = 'ja' and (pers < 1 or pers > 1 + v.begleitung) then
    raise exception '%', case when v.begleitung = 0 then 'Zu dieser Veranstaltung kannst du nur dich selbst anmelden.' when v.begleitung = 1 then 'Du kannst eine Begleitperson mitbringen.' else 'Du kannst bis zu ' || v.begleitung || ' Begleitpersonen mitbringen.' end;
  end if;
  if ant = 'ja' and v.max_personen is not null then
    select coalesce(sum(personen), 0) into andere from public.zusagen where veranstaltung_id = v.id and antwort = 'ja' and mitglied_id <> mid;
    if andere + pers > v.max_personen then
      raise exception '%', case when v.max_personen - andere <= 0 then 'Leider ist die Veranstaltung schon ausgebucht.' when v.max_personen - andere = 1 then 'Es ist nur noch 1 Platz frei.' else 'Es sind nur noch ' || (v.max_personen - andere) || ' Plätze frei.' end;
    end if;
  end if;
  insert into public.zusagen (veranstaltung_id, mitglied_id, antwort, personen, bemerkung, quelle, geaendert)
  values (v.id, mid, ant, pers, nullif(left(btrim(coalesce(p->>'bemerkung', '')), 200), ''), 'mein-ssv', now())
  on conflict (veranstaltung_id, mitglied_id) do update
    set antwort = excluded.antwort, personen = excluded.personen, bemerkung = excluded.bemerkung, quelle = 'mein-ssv', geaendert = now();
  return jsonb_build_object('ok', true, 'antwort', ant, 'personen', pers);
end $$;

revoke execute on function public.meine_veranstaltungen(), public.meine_zusage(jsonb) from public, anon;
grant execute on function public.meine_veranstaltungen(), public.meine_zusage(jsonb) to authenticated;
