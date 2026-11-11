-- ============================================================================
-- Nachtrag 17 · Öffentliche Hafenkarte: freie Gastliegeplätze ohne Anmeldung
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -16). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
--
-- Die Seite hafenplan.html (und später die Vereinswebsite) zeigt Gästen, welche Plätze frei sind.
-- Bewusst sparsam:
--   · nur frei / belegt je Platznummer und die Boxmaße – keine Namen, keine Boote, kein Grund
--     („grünes Schild“ und „unvergeben“ sehen von außen gleich aus);
--   · der Vorstand schaltet es ein: Einstellungen → „Hafenkarte öffentlich“
--     (hafen_einstellungen.daten->>'karte_oeffentlich': 'aus' = Standard | 'heute' | 'vorschau');
--   · bei 'vorschau' höchstens karte_tage Tage voraus (Standard 14, nie mehr als 60), höchstens 14 Nächte.
-- Außerhalb der Saison (saisons.auslagern … einlagern) meldet die Funktion „Winterpause“.
-- ============================================================================

create or replace function public.hafen_karte(p_von date default null, p_naechte int default 1) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  e      jsonb;
  modus  text;
  tage   int;
  von    date;
  n      int;
  s      public.saisons;
begin
  select daten into e from public.hafen_einstellungen where id = 1;
  modus := coalesce(e->>'karte_oeffentlich', 'aus');
  if modus not in ('heute', 'vorschau') then
    return jsonb_build_object('ok', false, 'grund', 'aus');
  end if;
  tage := case when modus = 'heute' then 0
               else least(60, greatest(0, coalesce(nullif(e->>'karte_tage', '')::int, 14))) end;
  von := least(greatest(coalesce(p_von, current_date), current_date), current_date + tage);
  n := least(14, greatest(1, coalesce(p_naechte, 1)));
  if von + n - 1 > current_date + tage then n := greatest(1, current_date + tage - von + 1); end if;
  select * into s from public.saisons where jahr = extract(year from von)::int;
  if s.jahr is null or von < s.auslagern or von >= s.einlagern then
    return jsonb_build_object('ok', true, 'winter', true, 'von', von, 'naechte', n, 'tage', tage,
      'oeffnet', (select min(x.auslagern) from public.saisons x where x.auslagern > von),
      'plan', e->'lageplan', 'plaetze', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'winter', false, 'von', von, 'naechte', n, 'tage', tage, 'stand', now(),
    'plan', e->'lageplan',
    'plaetze', coalesce((
      select jsonb_agg(jsonb_build_object('nr', l.nr, 'box', l.box, 'l', l.max_laenge, 'b', l.max_breite,
        'frei', (
          not l.gesperrt
          and not exists (select 1 from public.gaeste g where g.platz_id = l.id and g.status <> 'storniert'
                            and g.ankunft < von + n and g.ankunft + g.naechte > von)
          and (not exists (select 1 from public.belegungen b where b.platz_id = l.id and b.saison = s.jahr and b.periode = 'sommer')
               or not exists (select 1 from generate_series(von, von + n - 1, interval '1 day') t(tag)
                              where not exists (select 1 from public.abwesenheiten a where a.platz_id = l.id and t.tag::date between a.von and a.bis)))
        )) order by l.id)
      from public.liegeplaetze l where l.vorhanden), '[]'::jsonb));
end $$;

revoke execute on function public.hafen_karte(date, int) from public;
grant execute on function public.hafen_karte(date, int) to anon, authenticated;
