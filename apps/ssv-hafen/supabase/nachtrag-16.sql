-- ============================================================================
-- Nachtrag 16 · Veranstaltungen am Getränke-iPad zu- oder absagen
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -15). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
--
-- Wer sich an der Kasse mit seinem Code anmeldet, sieht die kommenden Veranstaltungen und kann antworten.
-- Geprüft wird wie beim Buchen: eingerichtetes Gerät + Code des Mitglieds (_kasse_pruefen, mit Sperre bei Fehlversuchen).
-- Die Regeln (Frist, Begleitung, freie Plätze, keine Überbuchung) sind dieselben wie in „Mein SSV“.
-- ============================================================================

-- 1 · Herkunft „kasse“ zulassen
alter table public.zusagen drop constraint if exists zusagen_quelle_check;
alter table public.zusagen add constraint zusagen_quelle_check check (quelle in ('mein-ssv', 'verein', 'kasse'));

-- 2 · Gemeinsame Regeln für Zusagen (intern, nicht direkt aufrufbar)
create or replace function public._zusage_setzen(mid uuid, p jsonb, p_quelle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v public.veranstaltungen;
  ant text := p->>'antwort';
  pers int := case when p->>'antwort' = 'ja' then coalesce(nullif(p->>'personen', '')::int, 1) else 0 end;
  andere int;
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  if ant is null or ant not in ('ja', 'nein') then raise exception 'Bitte zu- oder absagen.'; end if;
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
  values (v.id, mid, ant, pers, nullif(left(btrim(coalesce(p->>'bemerkung', '')), 200), ''), p_quelle, now())
  on conflict (veranstaltung_id, mitglied_id) do update
    set antwort = excluded.antwort, personen = excluded.personen, bemerkung = excluded.bemerkung, quelle = excluded.quelle, geaendert = now();
  return jsonb_build_object('ok', true, 'antwort', ant, 'personen', pers);
end $$;

-- Kommende Veranstaltungen aus Sicht eines Mitglieds (Zahl der Zusagen, eigene Antwort – keine Namen anderer)
create or replace function public._veranstaltungen_fuer(mid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(v) || jsonb_build_object(
    'belegt', (select coalesce(sum(z.personen), 0) from public.zusagen z where z.veranstaltung_id = v.id and z.antwort = 'ja'),
    'meine', (select to_jsonb(z) - 'mitglied_id' from public.zusagen z where z.veranstaltung_id = v.id and z.mitglied_id = mid)
  ) order by v.datum, v.beginn), '[]'::jsonb)
  from public.veranstaltungen v
  where mid is not null and v.datum >= current_date
$$;
revoke execute on function public._zusage_setzen(uuid, jsonb, text), public._veranstaltungen_fuer(uuid) from public, anon, authenticated;

-- 3 · Mein SSV nutzt dieselben Regeln
create or replace function public.meine_zusage(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public._zusage_setzen(public._mitglied_verknuepfen(), p, 'mein-ssv');
end $$;
create or replace function public.meine_veranstaltungen() returns jsonb
language sql stable security definer set search_path = public as $$
  select public._veranstaltungen_fuer(public._mein_mitglied())
$$;

-- 4 · Getränke-iPad: nach Anmeldung mit Code
create or replace function public.kasse_veranstaltungen(p_token text, p_mitglied uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f jsonb;
begin
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  return jsonb_build_object('ok', true, 'liste', public._veranstaltungen_fuer(p_mitglied));
end $$;
create or replace function public.kasse_zusage(p_token text, p_mitglied uuid, p_pin text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f jsonb;
begin
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  return public._zusage_setzen(p_mitglied, p, 'kasse');
end $$;
revoke execute on function public.kasse_veranstaltungen(text, uuid, text), public.kasse_zusage(text, uuid, text, jsonb) from public;
grant execute on function public.kasse_veranstaltungen(text, uuid, text), public.kasse_zusage(text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.meine_veranstaltungen(), public.meine_zusage(jsonb) to authenticated;
