-- ============================================================================
-- Nachtrag 7 · Gastlieger ohne Warten: Platz selbst angeben (Schild grün), sofort bezahlen
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -06). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
-- ============================================================================

-- 1 · Neue Spalten: welchen Platz der Gast selbst angegeben hat, warum er nicht passte, wann er „bezahlt“ gemeldet hat
alter table public.gaeste add column if not exists platz_angabe text;
alter table public.gaeste add column if not exists platz_hinweis text;
alter table public.gaeste add column if not exists zahlung_gemeldet timestamptz;

-- 2 · Öffentliche Angaben für die Gast-Seite: Preis, Hafenmeister und wie man bezahlen kann
create or replace function public.gast_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gast_nacht', coalesce((select (daten->>'gast_nacht')::numeric from public.gebuehren where jahr <= extract(year from now()) order by jahr desc limit 1), 15),
    'hafenmeister_name', e.daten->>'hafenmeister_name', 'hafenmeister_tel', e.daten->>'hafenmeister_tel', 'verein_name', e.daten->>'verein_name',
    'iban', e.daten->>'iban', 'bic', e.daten->>'bic', 'paypal_me', e.daten->>'paypal_me', 'gast_bar_hinweis', e.daten->>'gast_bar_hinweis')
  from public.hafen_einstellungen e where e.id = 1;
$$;

-- 3 · Gast meldet sich an und nennt den Platz vom Schild.
--     Passt der Platz laut Datenbank, liegt der Gast sofort „im Hafen“. Passt er nicht (Eigner nicht als unterwegs
--     gemeldet, Boot zu groß, Platz schon an einen anderen Gast vergeben), wird der Gast trotzdem angenommen –
--     ohne Platz, mit Grund; der Hafenmeister klärt das später. Der Gast muss nie warten.
create or replace function public.gast_anmelden(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int := greatest(1, least(30, coalesce((p->>'naechte')::int, 1))); preis numeric; neu uuid;
        angabe text := left(btrim(coalesce(p->>'platz', '')), 20); such text; pid text; grund text;
        -- Maße kappen; least() würde ein leeres Feld (null) sonst zum Höchstwert machen
        l numeric := least(40, nullif(replace(p->>'laenge', ',', '.'), '')::numeric);
        b numeric := least(12, nullif(replace(p->>'breite', ',', '.'), '')::numeric);
        t numeric := least(6, nullif(replace(p->>'tiefgang', ',', '.'), '')::numeric);
begin
  if nullif(replace(p->>'laenge', ',', '.'), '') is null then l := null; end if;
  if nullif(replace(p->>'breite', ',', '.'), '') is null then b := null; end if;
  if nullif(replace(p->>'tiefgang', ',', '.'), '') is null then t := null; end if;
  if coalesce(btrim(p->>'bootsname'), '') = '' or coalesce(btrim(p->>'skipper'), '') = '' or (p->>'ankunft') is null then
    raise exception 'Bootsname, Skipper und Ankunft sind Pflicht';
  end if;
  if (p->>'ankunft')::date < current_date - 1 or (p->>'ankunft')::date > current_date + 60 then raise exception 'Ankunftsdatum unplausibel'; end if;
  if (select count(*) from public.gaeste where quelle = 'qr' and erstellt > now() - interval '1 hour') > 30 then raise exception 'Zu viele Anmeldungen – bitte beim Hafenmeister melden'; end if;
  preis := (public.gast_info()->>'gast_nacht')::numeric;
  -- „Platz 07“, „7“, „l 1“ → 7 bzw. L1
  such := regexp_replace(upper(regexp_replace(angabe, '(?i)platz|nr\.?|\s', '', 'g')), '^0+(?=\d)', '');
  if such <> '' then select id into pid from public.liegeplaetze where upper(nr) = such or upper(id) = such limit 1; end if;
  if angabe <> '' and pid is null then grund := 'Platz „' || angabe || '“ gibt es laut Hafenplan nicht'; end if;
  if pid is not null then
    begin
      insert into public.gaeste (bootsname, skipper, herkunft, tel, laenge, breite, tiefgang, ankunft, naechte, platz_id, platz_angabe, betrag, zahlung, status, quelle)
      values (left(btrim(p->>'bootsname'), 60), left(btrim(p->>'skipper'), 80), left(p->>'herkunft', 80), left(p->>'tel', 40),
              l, b, t, (p->>'ankunft')::date, n, pid, angabe, n * preis, 'offen', 'eingewiesen', 'qr')
      returning id into neu;
      return jsonb_build_object('ok', true, 'id', neu, 'betrag', n * preis, 'platz_ok', true, 'platz', (select nr from public.liegeplaetze where id = pid));
    exception when raise_exception then
      grund := sqlerrm;   -- Prüfung des Platzes (Trigger) hat abgelehnt → unten ohne Platz anlegen
    end;
  end if;
  insert into public.gaeste (bootsname, skipper, herkunft, tel, laenge, breite, tiefgang, ankunft, naechte, platz_angabe, platz_hinweis, betrag, zahlung, status, quelle)
  values (left(btrim(p->>'bootsname'), 60), left(btrim(p->>'skipper'), 80), left(p->>'herkunft', 80), left(p->>'tel', 40),
          l, b, t, (p->>'ankunft')::date, n, nullif(angabe, ''), left(grund, 300), n * preis, 'offen', 'angemeldet', 'qr')
  returning id into neu;
  return jsonb_build_object('ok', true, 'id', neu, 'betrag', n * preis, 'platz_ok', false);
end $$;

-- 4 · Gast meldet: „habe bezahlt“ (PayPal, Überweisung oder bar in den Briefkasten). Den Eingang bestätigt der Verein.
--     Nur für frische QR-Anmeldungen, die noch nicht als bezahlt verbucht sind (die ID kennt nur der Gast selbst).
create or replace function public.gast_zahlung_melden(p_id uuid, p_art text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_art not in ('paypal', 'ueberweisung', 'bar') then raise exception 'Zahlart unbekannt'; end if;
  update public.gaeste set zahlung = p_art, zahlung_gemeldet = now()
   where id = p_id and quelle = 'qr' and bezahlt_am is null and status <> 'storniert' and erstellt > now() - interval '35 days';
  if not found then raise exception 'Anmeldung nicht gefunden – bitte beim Hafenmeister melden'; end if;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.gast_zahlung_melden(uuid, text) from public;
grant execute on function public.gast_info(), public.gast_anmelden(jsonb), public.gast_zahlung_melden(uuid, text) to anon, authenticated;
