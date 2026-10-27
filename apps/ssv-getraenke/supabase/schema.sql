-- ============================================================================
-- SSV Getränkekasse · Datenbankschema für Supabase (Region Frankfurt, eu-central-1)
--
-- Einspielen: Supabase-Dashboard → SQL Editor → diese Datei komplett ausführen.
-- Sicherheitsmodell:
--   · Die Kasse (iPad) arbeitet mit dem öffentlichen anon-Key und darf NUR die
--     kasse_*-Funktionen aufrufen. Jede davon verlangt den Geräte-Schlüssel der
--     eingerichteten Kasse; Buchen/Verlauf/Storno zusätzlich die Mitglieds-PIN.
--   · PINs liegen nur als bcrypt-Hash vor. 5 Fehlversuche → 5 Minuten Sperre.
--   · Preise rechnet ausschließlich die Datenbank – nie das Gerät.
--   · Kassenwart/Vorstand melden sich per E-Mail + Passwort an (Supabase Auth)
--     und stehen in der Tabelle admins. Nur sie sehen Tabellen direkt (RLS).
-- ============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- Tabellen --

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name    text
);

create table if not exists public.einstellungen (
  id    int primary key default 1 check (id = 1),
  daten jsonb not null default '{}'::jsonb
);
insert into public.einstellungen (id) values (1) on conflict do nothing;

create table if not exists public.mitglieder (
  id           uuid primary key default gen_random_uuid(),
  nr           text,
  vorname      text not null,
  nachname     text not null,
  email        text,
  strasse      text,
  plz          text,
  ort          text,
  sepa         boolean not null default false,
  notiz        text,
  aktiv        boolean not null default true,
  pin_hash     text,
  hat_pin      boolean generated always as (pin_hash is not null) stored,
  fehlversuche int not null default 0,
  gesperrt_bis timestamptz,
  erstellt     timestamptz not null default now()
);

create table if not exists public.produkte (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  emoji         text,
  farbe         text,
  preis         numeric(8,2) not null check (preis >= 0),
  kasten_groesse int check (kasten_groesse is null or kasten_groesse > 1),
  kasten_preis  numeric(8,2) check (kasten_preis is null or kasten_preis >= 0),
  sort          int not null default 0,
  aktiv         boolean not null default true
);

create table if not exists public.rechnungen (
  id           uuid primary key default gen_random_uuid(),
  nr           text not null unique,
  mitglied_id  uuid not null references public.mitglieder (id),
  datum        date not null,
  von          date not null,
  bis          date not null,
  faellig      date,
  summe        numeric(10,2) not null,
  empfaenger   jsonb not null,     -- Anschrift zum Rechnungszeitpunkt (Snapshot)
  positionen   jsonb not null,     -- verdichtete Positionen (Snapshot)
  sepa         boolean not null default false,
  bezahlt_am   date,
  storniert_am timestamptz,
  erstellt     timestamptz not null default now()
);

create table if not exists public.buchungen (
  id           uuid primary key default gen_random_uuid(),
  mitglied_id  uuid not null references public.mitglieder (id),
  produkt_id   uuid references public.produkte (id) on delete set null,
  produkt_name text not null,
  einheit      text not null check (einheit in ('stk', 'kasten')),
  anzahl       int  not null check (anzahl between 1 and 99),
  stueck       int  not null,
  einzelpreis  numeric(8,2)  not null,
  betrag       numeric(10,2) not null,
  zeit         timestamptz not null default now(),
  quelle       text not null default 'kasse',
  storniert_am timestamptz,
  rechnung_id  uuid references public.rechnungen (id)
);
create index if not exists buchungen_mitglied_zeit on public.buchungen (mitglied_id, zeit desc);
create index if not exists buchungen_offen on public.buchungen (zeit) where rechnung_id is null and storniert_am is null;

create table if not exists public.kassen_geraete (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  token_hash text not null unique,
  erstellt   timestamptz not null default now(),
  zuletzt    timestamptz
);

-- --------------------------------------------------------------- Helfer --

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public._berlin_tag(t timestamptz) returns date
language sql immutable as $$ select (t at time zone 'Europe/Berlin')::date $$;

-- Prüft Gerät + PIN. Liefert NULL bei Erfolg, sonst ein Fehler-JSON.
-- Wirft bewusst KEINE Exception: der Fehlversuchszähler muss gespeichert bleiben.
create or replace function public._kasse_pruefen(p_token text, p_mitglied uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare m public.mitglieder;
begin
  if p_token is null or not exists (
    select 1 from public.kassen_geraete where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  ) then
    return jsonb_build_object('ok', false, 'fehler', 'geraet');
  end if;

  select * into m from public.mitglieder where id = p_mitglied and aktiv for update;
  if not found or m.pin_hash is null then
    return jsonb_build_object('ok', false, 'fehler', 'mitglied');
  end if;
  if m.gesperrt_bis is not null and m.gesperrt_bis > now() then
    return jsonb_build_object('ok', false, 'fehler', 'gesperrt', 'gesperrt_bis', m.gesperrt_bis);
  end if;
  if m.pin_hash <> crypt(coalesce(p_pin, ''), m.pin_hash) then
    update public.mitglieder
       set fehlversuche = case when m.fehlversuche + 1 >= 5 then 0 else m.fehlversuche + 1 end,
           gesperrt_bis = case when m.fehlversuche + 1 >= 5 then now() + interval '5 minutes' else null end
     where id = m.id;
    return jsonb_build_object('ok', false, 'fehler', 'pin', 'rest', greatest(0, 4 - m.fehlversuche));
  end if;
  if m.fehlversuche > 0 or m.gesperrt_bis is not null then
    update public.mitglieder set fehlversuche = 0, gesperrt_bis = null where id = m.id;
  end if;
  return null;
end $$;

create or replace function public._summen(p_mitglied uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'monat_summe', coalesce(sum(betrag) filter (
        where date_trunc('month', zeit at time zone 'Europe/Berlin')
            = date_trunc('month', now() at time zone 'Europe/Berlin')), 0),
    'offen_summe', coalesce(sum(betrag) filter (where rechnung_id is null), 0))
  from public.buchungen where mitglied_id = p_mitglied and storniert_am is null;
$$;

-- Bucht eine Liste von Posten [{produkt_id, einheit:'stk'|'kasten', anzahl}].
create or replace function public._buchen(p_mitglied uuid, p_posten jsonb, p_quelle text, p_zeit timestamptz)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  po jsonb; pr public.produkte; v_anzahl int; v_einheit text; v_preis numeric; v_summe numeric := 0;
begin
  if jsonb_typeof(p_posten) <> 'array' or jsonb_array_length(p_posten) = 0 or jsonb_array_length(p_posten) > 30 then
    raise exception 'Ungültige Posten';
  end if;
  for po in select * from jsonb_array_elements(p_posten) loop
    select * into pr from public.produkte where id = (po->>'produkt_id')::uuid and aktiv;
    if not found then raise exception 'Produkt nicht verfügbar'; end if;
    v_anzahl  := (po->>'anzahl')::int;
    v_einheit := coalesce(po->>'einheit', 'stk');
    if v_anzahl is null or v_anzahl < 1 or v_anzahl > 99 then raise exception 'Ungültige Anzahl'; end if;
    if v_einheit = 'kasten' then
      if pr.kasten_groesse is null or pr.kasten_preis is null then raise exception 'Kein Kasten für %', pr.name; end if;
      v_preis := pr.kasten_preis;
    elsif v_einheit = 'stk' then
      v_preis := pr.preis;
    else
      raise exception 'Ungültige Einheit';
    end if;
    insert into public.buchungen (mitglied_id, produkt_id, produkt_name, einheit, anzahl, stueck, einzelpreis, betrag, zeit, quelle)
    values (p_mitglied, pr.id, pr.name, v_einheit, v_anzahl,
            v_anzahl * case when v_einheit = 'kasten' then pr.kasten_groesse else 1 end,
            v_preis, v_preis * v_anzahl, coalesce(p_zeit, now()), p_quelle);
    v_summe := v_summe + v_preis * v_anzahl;
  end loop;
  return v_summe;
end $$;

-- ------------------------------------------------- Kasse (anon, mit Gerät) --

create or replace function public.kasse_mitglieder(p_token text)
returns table (id uuid, vorname text, nachname text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')) then
    raise exception 'Kasse nicht eingerichtet' using errcode = '28000';
  end if;
  return query select m.id, m.vorname, m.nachname from public.mitglieder m
    where m.aktiv and m.pin_hash is not null order by m.nachname, m.vorname;
end $$;

create or replace function public.kasse_produkte(p_token text)
returns setof public.produkte
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')) then
    raise exception 'Kasse nicht eingerichtet' using errcode = '28000';
  end if;
  return query select * from public.produkte where aktiv order by sort, name;
end $$;

create or replace function public.kasse_login(p_token text, p_mitglied uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; m public.mitglieder;
begin
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  update public.kassen_geraete set zuletzt = now() where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  select * into m from public.mitglieder where id = p_mitglied;
  return jsonb_build_object('ok', true, 'vorname', m.vorname, 'nachname', m.nachname) || public._summen(p_mitglied);
end $$;

create or replace function public.kasse_buchen(p_token text, p_mitglied uuid, p_pin text, p_posten jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; s numeric;
begin
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  s := public._buchen(p_mitglied, p_posten, 'kasse', now());
  return jsonb_build_object('ok', true, 'summe', s) || public._summen(p_mitglied);
end $$;

create or replace function public.kasse_verlauf(p_token text, p_mitglied uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; v_min int;
begin
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  v_min := coalesce((select (daten->>'storno_minuten')::int from public.einstellungen where id = 1), 15);
  return jsonb_build_object('ok', true, 'buchungen', coalesce((
    select jsonb_agg(x order by x.zeit desc) from (
      select b.id, b.zeit, b.produkt_name, b.einheit, b.anzahl, b.stueck, b.betrag,
             b.storniert_am is not null as storniert, b.rechnung_id is not null as abgerechnet,
             (b.storniert_am is null and b.rechnung_id is null
              and b.zeit > now() - make_interval(mins => v_min)) as stornierbar
        from public.buchungen b where b.mitglied_id = p_mitglied
       order by b.zeit desc limit 15) x), '[]'::jsonb));
end $$;

create or replace function public.kasse_storno(p_token text, p_mitglied uuid, p_pin text, p_buchung uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; v_min int; n int;
begin
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  v_min := coalesce((select (daten->>'storno_minuten')::int from public.einstellungen where id = 1), 15);
  update public.buchungen set storniert_am = now()
   where id = p_buchung and mitglied_id = p_mitglied and storniert_am is null
     and rechnung_id is null and zeit > now() - make_interval(mins => v_min);
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'fehler', 'storno'); end if;
  return jsonb_build_object('ok', true) || public._summen(p_mitglied);
end $$;

-- ------------------------------------------------------ Verwaltung (Admin) --

create or replace function public._nur_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Keine Berechtigung' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_pin_setzen(p_mitglied uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._nur_admin();
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN muss vierstellig sein'; end if;
  update public.mitglieder set pin_hash = crypt(p_pin, gen_salt('bf', 8)), fehlversuche = 0, gesperrt_bis = null
   where id = p_mitglied;
end $$;

create or replace function public.admin_kasse_einrichten(p_name text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(24), 'hex');
begin
  perform public._nur_admin();
  insert into public.kassen_geraete (name, token_hash) values (coalesce(nullif(p_name, ''), 'Kasse'), encode(digest(t, 'sha256'), 'hex'));
  return t;
end $$;

create or replace function public.admin_buchen(p_mitglied uuid, p_posten jsonb, p_zeit timestamptz)
returns numeric language plpgsql security definer set search_path = public as $$
begin
  perform public._nur_admin();
  return public._buchen(p_mitglied, p_posten, 'nachtrag', p_zeit);
end $$;

-- Erstellt für jedes Mitglied mit offenen Buchungen im Zeitraum eine Rechnung.
create or replace function public.admin_rechnungen_erstellen(p_von date, p_bis date, p_datum date)
returns int language plpgsql security definer set search_path = public as $$
declare
  e jsonb; v_praefix text; v_ziel int; v_jahr int := extract(year from p_datum);
  v_lfd int; v_anzahl int := 0; m record; v_id uuid;
begin
  perform public._nur_admin();
  if p_von > p_bis then raise exception 'Zeitraum ungültig'; end if;
  select daten into e from public.einstellungen where id = 1;
  v_praefix := coalesce(nullif(e->>'rechnung_praefix', ''), 'SSV-G');
  v_ziel    := coalesce((e->>'zahlungsziel_tage')::int, 14);

  lock table public.rechnungen in exclusive mode;
  select coalesce(max(split_part(nr, '-', -1)::int), 0) into v_lfd
    from public.rechnungen where nr like v_praefix || '-' || v_jahr || '-%';

  for m in
    select mg.* from public.mitglieder mg
     where exists (select 1 from public.buchungen b
                    where b.mitglied_id = mg.id and b.rechnung_id is null and b.storniert_am is null
                      and public._berlin_tag(b.zeit) between p_von and p_bis)
     order by mg.nachname, mg.vorname
  loop
    v_lfd := v_lfd + 1;
    insert into public.rechnungen (nr, mitglied_id, datum, von, bis, faellig, summe, empfaenger, positionen, sepa)
    select v_praefix || '-' || v_jahr || '-' || lpad(v_lfd::text, 4, '0'), m.id, p_datum, p_von, p_bis,
           p_datum + v_ziel, sum(p.betrag),
           jsonb_build_object('nr', m.nr, 'vorname', m.vorname, 'nachname', m.nachname,
                              'strasse', m.strasse, 'plz', m.plz, 'ort', m.ort, 'email', m.email),
           jsonb_agg(jsonb_build_object('name', p.produkt_name, 'einheit', p.einheit, 'anzahl', p.anzahl,
                                        'stueck', p.stueck, 'einzelpreis', p.einzelpreis, 'betrag', p.betrag)
                     order by p.produkt_name, p.einheit),
           m.sepa
      from (select produkt_name, einheit, einzelpreis, sum(anzahl) anzahl, sum(stueck) stueck, sum(betrag) betrag
              from public.buchungen b
             where b.mitglied_id = m.id and b.rechnung_id is null and b.storniert_am is null
               and public._berlin_tag(b.zeit) between p_von and p_bis
             group by produkt_name, einheit, einzelpreis) p
    returning id into v_id;

    update public.buchungen b set rechnung_id = v_id
     where b.mitglied_id = m.id and b.rechnung_id is null and b.storniert_am is null
       and public._berlin_tag(b.zeit) between p_von and p_bis;
    v_anzahl := v_anzahl + 1;
  end loop;
  return v_anzahl;
end $$;

-- Storniert eine Rechnung; ihre Buchungen werden wieder offen (Nummer bleibt belegt).
create or replace function public.admin_rechnung_stornieren(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._nur_admin();
  update public.rechnungen set storniert_am = now() where id = p_id and storniert_am is null;
  update public.buchungen set rechnung_id = null where rechnung_id = p_id;
end $$;

-- ------------------------------------------------------------- Rechte/RLS --

alter table public.admins         enable row level security;
alter table public.einstellungen  enable row level security;
alter table public.mitglieder     enable row level security;
alter table public.produkte       enable row level security;
alter table public.rechnungen     enable row level security;
alter table public.buchungen      enable row level security;
alter table public.kassen_geraete enable row level security;

do $$
declare t text;
begin
  foreach t in array array['admins','einstellungen','mitglieder','produkte','rechnungen','buchungen','kassen_geraete'] loop
    execute format('drop policy if exists admin_alles on public.%I', t);
    execute format('create policy admin_alles on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Das Gerät (anon) darf ausschließlich die Kassen-Funktionen ausführen.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.kasse_mitglieder(text), public.kasse_produkte(text),
  public.kasse_login(text, uuid, text), public.kasse_buchen(text, uuid, text, jsonb),
  public.kasse_verlauf(text, uuid, text), public.kasse_storno(text, uuid, text, uuid) to anon, authenticated;
grant execute on function public.is_admin(), public.admin_pin_setzen(uuid, text),
  public.admin_kasse_einrichten(text), public.admin_buchen(uuid, jsonb, timestamptz),
  public.admin_rechnungen_erstellen(date, date, date), public.admin_rechnung_stornieren(uuid) to authenticated;
-- Den PIN-Hash bekommt auch der Kassenwart nie zu sehen (Spaltenrechte statt Tabellenrecht).
revoke select on public.mitglieder from authenticated;
grant select (id, nr, vorname, nachname, email, strasse, plz, ort, sepa, notiz, aktiv, hat_pin,
              fehlversuche, gesperrt_bis, erstellt) on public.mitglieder to authenticated;

-- ------------------------------------------------------------ Erster Admin --
-- Nach dem Anlegen des Kassenwart-Kontos (Authentication → Users → Add user):
--   insert into public.admins (user_id, name)
--   select id, 'Kassenwart' from auth.users where email = 'kassenwart@ssv-net.de';
