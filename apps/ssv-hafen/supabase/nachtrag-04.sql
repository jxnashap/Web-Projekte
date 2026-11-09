-- ============================================================================
-- Nachtrag 4 · Mein SSV: früher zurück, eigener Arbeitsdienst (Feedback-Runde 2)
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -03). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- Früher zurück bzw. geplante Abwesenheit löschen: Platz ist ab heute wieder belegt.
-- Gibt die Gäste zurück, die auf dem Platz noch eingeplant sind (für den Hinweis an das Mitglied).
create or replace function public.meine_abwesenheit_beenden(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen(); a public.abwesenheiten; gs jsonb;
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  select aw.* into a from public.abwesenheiten aw join public.boote b on b.id = aw.boot_id where aw.id = p_id and b.eigner_id = mid;
  if not found then raise exception 'Abwesenheit nicht gefunden'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('bootsname', g.bootsname, 'bis', g.ankunft + g.naechte)), '[]'::jsonb) into gs
    from public.gaeste g where g.platz_id = a.platz_id and g.status not in ('storniert', 'abgereist') and g.ankunft + g.naechte > current_date and g.ankunft <= a.bis;
  if a.von >= current_date then delete from public.abwesenheiten where id = p_id;
  else update public.abwesenheiten set bis = current_date - 1, notiz = left(coalesce(notiz, '') || ' (früher zurück)', 200) where id = p_id; end if;
  return jsonb_build_object('ok', true, 'gaeste', gs);
end $$;

-- Eigene Arbeitsdienst-Stunden (dieses und die zwei vorigen Jahre)
create or replace function public.mein_arbeitsdienst() returns setof public.arbeitsdienst
language sql stable security definer set search_path = public as $$
  select * from public.arbeitsdienst where mitglied_id = public._mein_mitglied() and datum >= make_date(extract(year from current_date)::int - 2, 1, 1) order by datum desc
$$;

revoke execute on function public.meine_abwesenheit_beenden(uuid), public.mein_arbeitsdienst() from public, anon;
grant execute on function public.meine_abwesenheit_beenden(uuid), public.mein_arbeitsdienst() to authenticated;
