-- ============================================================================
-- Nachtrag 11 · Lagerplätze nach dem echten Nordlager
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -10). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- Nordlager laut Verein: Lagerweg in der Mitte (Sackgasse), links eine Reihe, rechts zwei Reihen nebeneinander,
-- vorne links zwei Reihen schräg mit dem Bug zur Messe. Das sind 36 Paletten-Plätze:
--   P01–P10 vorne links (schräg) · P11–P22 links · P23–P36 rechts (zwei Reihen)
-- Damit die Nummern im Norden durchlaufen, wandert das Winterlager West von P21–P40 nach P41–P60.
-- Umbenannt wird nur, solange noch keine Belegung auf P21–P40 zeigt (sonst bleibt alles, wie es ist).
do $$
begin
  if exists (select 1 from public.landplaetze where id = 'P41') then
    raise notice 'Nachtrag 11: schon eingespielt.';
  elsif exists (select 1 from public.belegungen where platz_id in (select 'P' || lpad(i::text, 2, '0') from generate_series(21, 40) i)) then
    raise notice 'Nachtrag 11: Es gibt Belegungen auf P21–P40 – Umbenennung übersprungen, bitte mit dem Lageplan-Editor anpassen.';
  else
    update public.landplaetze
       set id = 'P' || lpad((substring(id from 2)::int + 20)::text, 2, '0'),
           bez = 'Palette ' || (substring(id from 2)::int + 20)
     where bereich = 'west' and id ~ '^P[0-9]+$' and substring(id from 2)::int between 21 and 40;
    insert into public.landplaetze (id, bez, art, bereich)
    select 'P' || lpad(i::text, 2, '0'), 'Palette ' || i, 'palette', 'nord' from generate_series(1, 36) i
    on conflict (id) do nothing;
  end if;
end $$;
