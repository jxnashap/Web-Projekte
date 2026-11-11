-- ============================================================================
-- SSV · komplette Datenbank in einem Stück (Getränkekasse + Website + Hafen/Mitglieder)
-- Supabase → Projekt „SSV Manager“ → SQL Editor → New query → alles einfügen → Run.
-- Darf mehrfach ausgeführt werden (legt nur an, was fehlt).
-- Erzeugt aus: apps/ssv-getraenke/supabase/schema.sql, webseiten/ssv-segelverein/supabase/website.sql,
--             apps/ssv-hafen/supabase/hafen.sql
-- ============================================================================

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> apps/ssv-getraenke/supabase/schema.sql
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
  sepa         boolean not null default true,
  mandatsreferenz text,
  notiz        text,
  aktiv        boolean not null default true,
  pin_hash     text,
  hat_pin      boolean generated always as (pin_hash is not null) stored,
  fehlversuche int not null default 0,
  gesperrt_bis timestamptz,
  erstellt     timestamptz not null default now()
);
-- Login für „Mein SSV“: Supabase-Konto des Mitglieds (wird beim ersten Login über die bestätigte E-Mail verknüpft)
alter table public.mitglieder add column if not exists user_id uuid unique references auth.users(id) on delete set null;

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
  if not found then
    return jsonb_build_object('ok', false, 'fehler', 'mitglied');
  end if;
  if m.pin_hash is null then
    return jsonb_build_object('ok', false, 'fehler', 'kein_pin');
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

-- Alle aktiven Mitglieder; hat_pin = false → das Mitglied legt beim ersten Mal selbst einen Code fest
drop function if exists public.kasse_mitglieder(text);
create function public.kasse_mitglieder(p_token text)
returns table (id uuid, vorname text, nachname text, hat_pin boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')) then
    raise exception 'Kasse nicht eingerichtet' using errcode = '28000';
  end if;
  return query select m.id, m.vorname, m.nachname, m.hat_pin from public.mitglieder m
    where m.aktiv order by m.nachname, m.vorname;
end $$;

-- Zu naheliegende Codes (1111, 1234, 2580 …) werden abgelehnt
create or replace function public._pin_ok(p text) returns boolean
language sql immutable as $$
  select coalesce(p, '') ~ '^[0-9]{4}$' and p !~ '^(.)\1{3}$'
     and p not in ('0123','1234','2345','3456','4567','5678','6789','9876','8765','7654','6543','5432','4321','3210','1212','2580');
$$;

create or replace function public._einstellung_bool(k text, standard boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (daten->>k)::boolean from public.einstellungen where id = 1), standard);
$$;

-- Was die Kasse über ihr Verhalten wissen darf (keine Bank- oder Vereinsdaten)
create or replace function public.kasse_optionen(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare e jsonb;
begin
  if not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')) then
    raise exception 'Kasse nicht eingerichtet' using errcode = '28000';
  end if;
  select daten into e from public.einstellungen where id = 1;
  return jsonb_build_object(
    'pin_selbst_festlegen', public._einstellung_bool('pin_selbst_festlegen', true),
    'pin_erst_nr_pruefen',  public._einstellung_bool('pin_erst_nr_pruefen', true),
    'abmelden_sekunden',    coalesce((e->>'abmelden_sekunden')::int, 60),
    'storno_minuten',       coalesce((e->>'storno_minuten')::int, 15));
end $$;

-- Erstes Mal an der Kasse: Code selbst festlegen (nur solange noch keiner existiert).
-- Mit eingeschalteter Prüfung muss die Mitgliedsnummer stimmen; Fehlversuche zählen wie beim Login.
create or replace function public.kasse_pin_festlegen(p_token text, p_mitglied uuid, p_pin text, p_nr text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare m public.mitglieder;
begin
  if p_token is null or not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(p_token, 'sha256'), 'hex')) then
    return jsonb_build_object('ok', false, 'fehler', 'geraet');
  end if;
  if not public._einstellung_bool('pin_selbst_festlegen', true) then
    return jsonb_build_object('ok', false, 'fehler', 'aus');
  end if;
  select * into m from public.mitglieder where id = p_mitglied and aktiv for update;
  if not found then return jsonb_build_object('ok', false, 'fehler', 'mitglied'); end if;
  if m.pin_hash is not null then return jsonb_build_object('ok', false, 'fehler', 'schon_gesetzt'); end if;
  if m.gesperrt_bis is not null and m.gesperrt_bis > now() then
    return jsonb_build_object('ok', false, 'fehler', 'gesperrt', 'gesperrt_bis', m.gesperrt_bis);
  end if;
  if public._einstellung_bool('pin_erst_nr_pruefen', true)
     and (m.nr is null or btrim(coalesce(p_nr, '')) <> btrim(m.nr)) then
    update public.mitglieder
       set fehlversuche = case when m.fehlversuche + 1 >= 5 then 0 else m.fehlversuche + 1 end,
           gesperrt_bis = case when m.fehlversuche + 1 >= 5 then now() + interval '5 minutes' else null end
     where id = m.id;
    return jsonb_build_object('ok', false, 'fehler', 'nr', 'rest', greatest(0, 4 - m.fehlversuche));
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'fehler', 'format'); end if;
  if not public._pin_ok(p_pin) then return jsonb_build_object('ok', false, 'fehler', 'einfach'); end if;
  update public.mitglieder set pin_hash = crypt(p_pin, gen_salt('bf', 8)), fehlversuche = 0, gesperrt_bis = null where id = m.id;
  update public.kassen_geraete set zuletzt = now() where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  return jsonb_build_object('ok', true, 'vorname', m.vorname, 'nachname', m.nachname) || public._summen(m.id);
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
                              'strasse', m.strasse, 'plz', m.plz, 'ort', m.ort, 'email', m.email,
                              'mandatsreferenz', m.mandatsreferenz),
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

create or replace function public.admin_pin_zuruecksetzen(p_mitglied uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._nur_admin();
  update public.mitglieder set pin_hash = null, fehlversuche = 0, gesperrt_bis = null where id = p_mitglied;
end $$;

-- --------------------------------------------- Mein SSV (Mitglied, angemeldet) --

-- Mitglied des angemeldeten Kontos (für Zeilenschutz)
create or replace function public._mein_mitglied() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.mitglieder where user_id = auth.uid() and aktiv;
$$;

-- Beim ersten Login: Konto über die bestätigte E-Mail-Adresse mit dem Mitglied verknüpfen
create or replace function public._mitglied_verknuepfen() returns uuid
language plpgsql security definer set search_path = public as $$
declare mid uuid; mail text;
begin
  if auth.uid() is null then raise exception 'Bitte anmelden' using errcode = '28000'; end if;
  mid := public._mein_mitglied();
  if mid is not null then return mid; end if;
  select lower(email) into mail from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if mail is null then return null; end if;
  update public.mitglieder set user_id = auth.uid()
   where id = (select id from public.mitglieder where lower(email) = mail and user_id is null and aktiv order by erstellt limit 1)
   returning id into mid;
  return mid;
end $$;

create or replace function public.mitglied_uebersicht()
returns jsonb language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen(); m public.mitglieder;
begin
  if mid is null then return null; end if;
  select * into m from public.mitglieder where id = mid;
  return jsonb_build_object(
      'hat_pin', m.hat_pin,
      'gesperrt_bis', case when m.gesperrt_bis > now() then m.gesperrt_bis end,
      'buchungen', coalesce((select jsonb_agg(to_jsonb(b) order by b.zeit desc) from (
          select id, zeit, produkt_name, einheit, anzahl, stueck, einzelpreis, betrag, storniert_am, rechnung_id
            from public.buchungen where mitglied_id = mid order by zeit desc limit 20) b), '[]'::jsonb),
      'rechnungen', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nr', r.nr, 'datum', r.datum, 'von', r.von, 'bis', r.bis,
          'faellig', r.faellig, 'summe', r.summe, 'sepa', r.sepa, 'bezahlt_am', r.bezahlt_am) order by r.nr desc)
          from public.rechnungen r where r.mitglied_id = mid and r.storniert_am is null), '[]'::jsonb)
    ) || public._summen(mid);
end $$;

-- Code ändern oder vergessenen Code neu festlegen (das Konto-Login ersetzt den alten Code)
create or replace function public.mitglied_pin_aendern(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare mid uuid := public._mitglied_verknuepfen();
begin
  if mid is null then return jsonb_build_object('ok', false, 'fehler', 'mitglied'); end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'fehler', 'format'); end if;
  if not public._pin_ok(p_pin) then return jsonb_build_object('ok', false, 'fehler', 'einfach'); end if;
  update public.mitglieder set pin_hash = crypt(p_pin, gen_salt('bf', 8)), fehlversuche = 0, gesperrt_bis = null where id = mid;
  return jsonb_build_object('ok', true);
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

-- Mitglieder sehen ihre eigenen Rechnungen und Buchungen (für die PDF-Ansicht in „Mein SSV“)
drop policy if exists mitglied_eigene on public.rechnungen;
create policy mitglied_eigene on public.rechnungen for select to authenticated using (mitglied_id = public._mein_mitglied());
drop policy if exists mitglied_eigene on public.buchungen;
create policy mitglied_eigene on public.buchungen for select to authenticated using (mitglied_id = public._mein_mitglied());

-- Das Gerät (anon) darf ausschließlich die Kassen-Funktionen ausführen.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public, authenticated;
grant execute on function public.kasse_mitglieder(text), public.kasse_produkte(text),
  public.kasse_login(text, uuid, text), public.kasse_buchen(text, uuid, text, jsonb),
  public.kasse_verlauf(text, uuid, text), public.kasse_storno(text, uuid, text, uuid),
  public.kasse_optionen(text), public.kasse_pin_festlegen(text, uuid, text, text) to anon, authenticated;
grant execute on function public.mitglied_uebersicht(), public.mitglied_pin_aendern(text) to authenticated;
-- in den Zeilenschutz-Regeln verwendet (liefert nur die eigene Mitglieds-ID)
grant execute on function public._mein_mitglied() to authenticated;
grant execute on function public.is_admin(), public.admin_pin_setzen(uuid, text),
  public.admin_kasse_einrichten(text), public.admin_buchen(uuid, jsonb, timestamptz),
  public.admin_rechnungen_erstellen(date, date, date), public.admin_rechnung_stornieren(uuid),
  public.admin_pin_zuruecksetzen(uuid) to authenticated;
-- Den PIN-Hash bekommt auch der Kassenwart nie zu sehen (Spaltenrechte statt Tabellenrecht).
revoke select on public.mitglieder from authenticated;
grant select (id, nr, vorname, nachname, email, strasse, plz, ort, sepa, mandatsreferenz, notiz, aktiv, hat_pin,
              fehlversuche, gesperrt_bis, erstellt, user_id) on public.mitglieder to authenticated;

-- ------------------------------------------------------------ Erster Admin --
-- Nach dem Anlegen des Kassenwart-Kontos (Authentication → Users → Add user):
--   insert into public.admins (user_id, name)
--   select id, 'Kassenwart' from auth.users where email = 'kassenwart@ssv-net.de';

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> webseiten/ssv-segelverein/supabase/website.sql
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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> apps/ssv-hafen/supabase/hafen.sql
-- ============================================================================
-- SSV · Hafen-Manager und Mitgliederverwaltung (ersetzt easyVerein)
--
-- Reihenfolge in einer frischen Datenbank:
--   1. apps/ssv-getraenke/supabase/schema.sql      (Mitglieder, Kasse)
--   2. webseiten/ssv-segelverein/supabase/website.sql (Website-Inhalte)
--   3. diese Datei                                   (Rollen, Hafen, Beiträge, Anträge)
--
-- Rollen (Tabelle funktionen):
--   vorstand      alles, entscheidet über Aufnahmeanträge
--   kassenwart    Mitglieder inkl. Bankdaten, Abrechnung, Gebühren, Kasse
--   brueckenwart  Hafenbetrieb, Mitglieder ohne Bankdaten
--   hafenmeister  Hafenbetrieb (Gäste, Abwesenheiten, Kran), Mitglieder ohne Bankdaten
--   redaktion     Website-Inhalte
-- Mitglieder melden sich in „Mein SSV“ an und sehen nur ihre eigenen Daten
-- (Verknüpfung über mitglieder.user_id, siehe _mitglied_verknuepfen()).
-- Öffentlich (ohne Login): Gast-Anmeldung per QR-Code und Aufnahmeantrag – nur
-- über Funktionen, die genau einen Datensatz anlegen.
-- ============================================================================

-- ------------------------------------------------------------------ Rollen --
create table if not exists public.funktionen (
  user_id uuid not null references auth.users (id) on delete cascade,
  rolle   text not null check (rolle in ('vorstand', 'kassenwart', 'brueckenwart', 'hafenmeister', 'redaktion')),
  name    text,
  primary key (user_id, rolle)
);

create or replace function public.hat_rolle(variadic p_rollen text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.funktionen where user_id = auth.uid() and rolle = any (p_rollen));
$$;
create or replace function public.ist_personal() returns boolean
language sql stable security definer set search_path = public as $$
  select public.hat_rolle('vorstand', 'kassenwart', 'brueckenwart', 'hafenmeister');
$$;
create or replace function public.ist_finanz() returns boolean
language sql stable security definer set search_path = public as $$
  select public.hat_rolle('vorstand', 'kassenwart');
$$;
create or replace function public.meine_rollen() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(rolle order by rolle), '{}') from public.funktionen where user_id = auth.uid();
$$;

-- Kassenwart-Bereich der Getränkekasse und Redaktion der Website hängen an den Rollen
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid()) or public.hat_rolle('vorstand', 'kassenwart');
$$;
create or replace function public.ist_redakteur() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.redakteure where user_id = auth.uid()) or public.hat_rolle('vorstand', 'redaktion');
$$;

-- ------------------------------------------------------- Mitgliederstamm --
alter table public.mitglieder add column if not exists art          text not null default 'ausuebend'
  check (art in ('ausuebend', 'probe', 'foerdernd', 'partner', 'jugend', 'jugend_geschwister', 'ausbildung', 'gast'));
alter table public.mitglieder add column if not exists tel          text;
alter table public.mitglieder add column if not exists kfz          text;
alter table public.mitglieder add column if not exists geburtsdatum date;
alter table public.mitglieder add column if not exists geschlecht   text check (geschlecht in ('w', 'm', 'd'));
alter table public.mitglieder add column if not exists eintritt     date;
alter table public.mitglieder add column if not exists austritt     date;
create unique index if not exists mitglieder_nr_eindeutig on public.mitglieder (nr) where nr is not null and nr <> '';

-- Bankdaten getrennt: sehen nur Vorstand, Kassenwart und das Mitglied selbst
create table if not exists public.mitglieder_bank (
  mitglied_id  uuid primary key references public.mitglieder (id) on delete cascade,
  iban         text,
  bic          text,
  kontoinhaber text,
  mandat_datum date,
  geaendert    timestamptz not null default now()
);

-- ------------------------------------------------------------ Hafen-Stamm --
create table if not exists public.hafen_einstellungen (
  id    int primary key default 1 check (id = 1),
  daten jsonb not null default '{}'::jsonb
);
insert into public.hafen_einstellungen (id) values (1) on conflict do nothing;

create table if not exists public.gebuehren (
  jahr  int primary key,
  daten jsonb not null
);

create table if not exists public.saisons (
  jahr      int primary key,
  auslagern date,
  einlagern date
);

create table if not exists public.liegeplaetze (
  id          text primary key,
  nr          text not null,
  bruecke     text not null,
  box         text not null,
  max_laenge  numeric,
  max_breite  numeric,
  strom       boolean not null default true,
  gesperrt    boolean not null default false,
  sonderpreis numeric,
  notiz       text
);

create table if not exists public.landplaetze (
  id      text primary key,
  bez     text not null,
  art     text not null check (art in ('palette', 'halle', 'aussen')),
  bereich text
);

create table if not exists public.boote (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  typ          text,
  eigner_id    uuid references public.mitglieder (id) on delete set null,
  laenge       numeric,
  breite       numeric,
  tiefgang     numeric,
  gewicht_t    numeric,
  segelnr      text,
  versicherung text,
  vers_bis     date,
  notiz        text
);

create table if not exists public.belegungen (
  id                  uuid primary key default gen_random_uuid(),
  saison              int not null,
  periode             text not null check (periode in ('sommer', 'winter')),
  boot_id             uuid references public.boote (id) on delete cascade,
  platz_typ           text not null check (platz_typ in ('wasser', 'land')),
  platz_id            text not null,
  art                 text,
  flaeche_m2          numeric,
  sommer_an_land_jahr int,
  nicht_kranen        boolean not null default false,
  notiz               text
);
create index if not exists belegungen_boot on public.belegungen (boot_id);

create table if not exists public.abwesenheiten (
  id       uuid primary key default gen_random_uuid(),
  boot_id  uuid references public.boote (id) on delete cascade,
  platz_id text,
  von      date not null,
  bis      date not null check (bis >= von),
  notiz    text,
  gemeldet text
);

create table if not exists public.gaeste (
  id          uuid primary key default gen_random_uuid(),
  bootsname   text not null,
  skipper     text not null,
  herkunft    text,
  tel         text,
  email       text,
  laenge      numeric,
  breite      numeric,
  ankunft     date not null,
  naechte     int not null check (naechte between 1 and 60),
  platz_id    text,
  betrag      numeric,
  zahlung     text not null default 'offen',
  quittung_nr text,
  status      text not null default 'angemeldet',
  quelle      text,
  erstellt    timestamptz not null default now()
);

create table if not exists public.warteliste (
  id          uuid primary key default gen_random_uuid(),
  mitglied_id uuid references public.mitglieder (id) on delete cascade,
  datum       date not null default current_date,
  boot_laenge numeric,
  boot_breite numeric,
  wunsch_box  text,
  notiz       text,
  status      text not null default 'wartend'
);

create table if not exists public.kran (
  id          uuid primary key default gen_random_uuid(),
  boot_id     uuid references public.boote (id) on delete cascade,
  datum       date not null,
  art         text not null check (art in ('schiff', 'mast')),
  minuten     int not null check (minuten > 0),
  notiz       text,
  abgerechnet text
);

create table if not exists public.arbeitsdienst (
  id          uuid primary key default gen_random_uuid(),
  mitglied_id uuid references public.mitglieder (id) on delete cascade,
  datum       date not null,
  stunden     numeric not null,
  taetigkeit  text
);

-- ------------------------------------------------- Hafen- und Beitragsrechnungen --
create table if not exists public.hafen_rechnungen (
  id           uuid primary key default gen_random_uuid(),
  nr           text not null unique,
  mitglied_id  uuid references public.mitglieder (id) on delete restrict,
  datum        date not null,
  saison       int not null,
  periode      text not null check (periode in ('sommer', 'winter', 'beitrag')),
  faellig      date,
  positionen   jsonb not null,
  summe        numeric not null,
  empfaenger   jsonb not null,
  sepa         boolean not null default false,
  mandat_ref   text,
  mandat_datum date,
  bezahlt_am   date,
  storniert_am timestamptz,
  sepa_lauf    text,
  erstellt     timestamptz not null default now()
);
create index if not exists hafen_rechnungen_mitglied on public.hafen_rechnungen (mitglied_id);

create table if not exists public.sepa_laeufe (
  id      text primary key,
  datum   date not null,
  faellig date,
  anzahl  int,
  summe   numeric
);

-- --------------------------------------------------------- Aufnahmeanträge --
create table if not exists public.antraege (
  id                   uuid primary key default gen_random_uuid(),
  eingang              timestamptz not null default now(),
  status               text not null default 'neu' check (status in ('neu', 'angenommen', 'abgelehnt')),
  art                  text not null,
  vorname              text not null,
  nachname             text not null,
  geburtsdatum         date,
  geschlecht           text,
  strasse              text,
  plz                  text,
  ort                  text,
  email                text,
  tel                  text,
  erziehungsberechtigt text,
  boot                 jsonb,
  warteliste           boolean not null default false,
  kontoinhaber         text,
  iban                 text,
  bic                  text,
  mandat               boolean not null default false,
  satzung              boolean not null default false,
  datenschutz          boolean not null default false,
  nachricht            text,
  mitglied_id          uuid references public.mitglieder (id) on delete set null,
  entschieden          date,
  entschieden_von      text,
  grund                text
);

-- ================================================================ Rechte --
alter table public.funktionen          enable row level security;
alter table public.mitglieder_bank     enable row level security;
alter table public.hafen_einstellungen enable row level security;
alter table public.gebuehren           enable row level security;
alter table public.saisons             enable row level security;
alter table public.liegeplaetze        enable row level security;
alter table public.landplaetze         enable row level security;
alter table public.boote               enable row level security;
alter table public.belegungen          enable row level security;
alter table public.abwesenheiten       enable row level security;
alter table public.gaeste              enable row level security;
alter table public.warteliste          enable row level security;
alter table public.kran                enable row level security;
alter table public.arbeitsdienst       enable row level security;
alter table public.hafen_rechnungen    enable row level security;
alter table public.sepa_laeufe         enable row level security;
alter table public.antraege            enable row level security;

do $$
declare t text;
begin
  -- Hafenbetrieb: alle Funktionsträger lesen und schreiben
  foreach t in array array['liegeplaetze','landplaetze','boote','belegungen','abwesenheiten','gaeste','warteliste','kran','arbeitsdienst','saisons'] loop
    execute format('drop policy if exists personal on public.%I', t);
    execute format('create policy personal on public.%I for all to authenticated using (public.ist_personal()) with check (public.ist_personal())', t);
  end loop;
  -- Geld: nur Vorstand und Kassenwart
  foreach t in array array['mitglieder_bank','hafen_rechnungen','sepa_laeufe'] loop
    execute format('drop policy if exists finanz on public.%I', t);
    execute format('create policy finanz on public.%I for all to authenticated using (public.ist_finanz()) with check (public.ist_finanz())', t);
  end loop;
  -- Einstellungen und Gebühren: alle Funktionsträger lesen, Vorstand/Kassenwart ändern
  foreach t in array array['hafen_einstellungen','gebuehren'] loop
    execute format('drop policy if exists lesen on public.%I', t);
    execute format('create policy lesen on public.%I for select to authenticated using (public.ist_personal())', t);
    execute format('drop policy if exists aendern on public.%I', t);
    execute format('create policy aendern on public.%I for all to authenticated using (public.ist_finanz()) with check (public.ist_finanz())', t);
  end loop;
end $$;

-- Rollen: jeder sieht seine eigenen, der Vorstand verwaltet sie
drop policy if exists selbst on public.funktionen;
create policy selbst on public.funktionen for select to authenticated using (user_id = auth.uid() or public.hat_rolle('vorstand'));
drop policy if exists vorstand on public.funktionen;
create policy vorstand on public.funktionen for all to authenticated using (public.hat_rolle('vorstand')) with check (public.hat_rolle('vorstand'));

-- Anträge: Vorstand und Kassenwart lesen, nur der Vorstand entscheidet
drop policy if exists lesen on public.antraege;
create policy lesen on public.antraege for select to authenticated using (public.ist_finanz());
drop policy if exists entscheiden on public.antraege;
create policy entscheiden on public.antraege for all to authenticated using (public.hat_rolle('vorstand')) with check (public.hat_rolle('vorstand'));

-- Mitgliederstamm: Brückenwartin und Hafenmeister dürfen lesen und pflegen (Bankdaten liegen getrennt)
drop policy if exists personal on public.mitglieder;
create policy personal on public.mitglieder for all to authenticated using (public.ist_personal()) with check (public.ist_personal());

-- Mein SSV: das angemeldete Mitglied sieht seine eigenen Daten
drop policy if exists selbst on public.mitglieder;
create policy selbst on public.mitglieder for select to authenticated using (id = public._mein_mitglied());
drop policy if exists selbst on public.mitglieder_bank;
create policy selbst on public.mitglieder_bank for select to authenticated using (mitglied_id = public._mein_mitglied());
drop policy if exists selbst on public.boote;
create policy selbst on public.boote for select to authenticated using (eigner_id = public._mein_mitglied());
drop policy if exists selbst on public.belegungen;
create policy selbst on public.belegungen for select to authenticated
  using (boot_id in (select id from public.boote where eigner_id = public._mein_mitglied()));
drop policy if exists selbst on public.abwesenheiten;
create policy selbst on public.abwesenheiten for select to authenticated
  using (boot_id in (select id from public.boote where eigner_id = public._mein_mitglied()));
drop policy if exists selbst_melden on public.abwesenheiten;
create policy selbst_melden on public.abwesenheiten for insert to authenticated
  with check (boot_id in (select id from public.boote where eigner_id = public._mein_mitglied())
              and platz_id in (select b.platz_id from public.belegungen b where b.boot_id = abwesenheiten.boot_id and b.platz_typ = 'wasser'));
drop policy if exists selbst_loeschen on public.abwesenheiten;
create policy selbst_loeschen on public.abwesenheiten for delete to authenticated
  using (von > current_date and boot_id in (select id from public.boote where eigner_id = public._mein_mitglied()));
drop policy if exists selbst on public.hafen_rechnungen;
create policy selbst on public.hafen_rechnungen for select to authenticated using (mitglied_id = public._mein_mitglied());
drop policy if exists selbst on public.warteliste;
create policy selbst on public.warteliste for select to authenticated using (mitglied_id = public._mein_mitglied());
drop policy if exists selbst on public.liegeplaetze;
create policy selbst on public.liegeplaetze for select to authenticated using (true);   -- Plan ohne Personendaten
drop policy if exists selbst on public.landplaetze;
create policy selbst on public.landplaetze for select to authenticated using (true);
drop policy if exists selbst on public.saisons;
create policy selbst on public.saisons for select to authenticated using (true);

-- Tabellenrechte: anon nichts direkt (nur die Funktionen unten)
revoke all on public.funktionen, public.mitglieder_bank, public.hafen_einstellungen, public.gebuehren, public.saisons,
  public.liegeplaetze, public.landplaetze, public.boote, public.belegungen, public.abwesenheiten, public.gaeste,
  public.warteliste, public.kran, public.arbeitsdienst, public.hafen_rechnungen, public.sepa_laeufe, public.antraege from anon;
grant select, insert, update, delete on public.funktionen, public.mitglieder_bank, public.hafen_einstellungen, public.gebuehren,
  public.saisons, public.liegeplaetze, public.landplaetze, public.boote, public.belegungen, public.abwesenheiten, public.gaeste,
  public.warteliste, public.kran, public.arbeitsdienst, public.hafen_rechnungen, public.sepa_laeufe, public.antraege to authenticated;
-- Neue Mitglieder-Spalten freigeben (pin_hash bleibt unsichtbar)
grant select (id, nr, vorname, nachname, email, strasse, plz, ort, sepa, mandatsreferenz, notiz, aktiv, hat_pin,
              fehlversuche, gesperrt_bis, erstellt, user_id, art, tel, kfz, geburtsdatum, geschlecht, eintritt, austritt)
  on public.mitglieder to authenticated;

-- ============================================================ Funktionen --
-- IBAN-Prüfziffer (ISO 13616, mod 97)
create or replace function public._iban_ok(p text) returns boolean
language plpgsql immutable as $$
declare s text := upper(regexp_replace(coalesce(p, ''), '\s', '', 'g')); r text; z text := ''; c text; rest int := 0; i int;
begin
  if s !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then return false; end if;
  r := substr(s, 5) || substr(s, 1, 4);
  for i in 1 .. length(r) loop
    c := substr(r, i, 1);
    z := z || case when c ~ '[A-Z]' then (ascii(c) - 55)::text else c end;
  end loop;
  for i in 1 .. length(z) loop rest := (rest * 10 + substr(z, i, 1)::int) % 97; end loop;
  return rest = 1;
end $$;

-- Öffentlich: Angaben für die Gast-Anmeldung (QR-Code am Steg)
create or replace function public.gast_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gast_nacht', coalesce((select (daten->>'gast_nacht')::numeric from public.gebuehren where jahr <= extract(year from now()) order by jahr desc limit 1), 15),
    'hafenmeister_name', e.daten->>'hafenmeister_name', 'hafenmeister_tel', e.daten->>'hafenmeister_tel', 'verein_name', e.daten->>'verein_name')
  from public.hafen_einstellungen e where e.id = 1;
$$;

-- Öffentlich: Gast meldet sich an – Betrag rechnet die Datenbank
create or replace function public.gast_anmelden(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int := greatest(1, least(30, coalesce((p->>'naechte')::int, 1))); preis numeric; neu uuid;
begin
  if coalesce(btrim(p->>'bootsname'), '') = '' or coalesce(btrim(p->>'skipper'), '') = '' or (p->>'ankunft') is null then
    raise exception 'Bootsname, Skipper und Ankunft sind Pflicht';
  end if;
  if (p->>'ankunft')::date < current_date - 1 or (p->>'ankunft')::date > current_date + 60 then raise exception 'Ankunftsdatum unplausibel'; end if;
  if (select count(*) from public.gaeste where quelle = 'qr' and erstellt > now() - interval '1 hour') > 30 then raise exception 'Zu viele Anmeldungen – bitte beim Hafenmeister melden'; end if;
  preis := (public.gast_info()->>'gast_nacht')::numeric;
  insert into public.gaeste (bootsname, skipper, herkunft, tel, laenge, breite, ankunft, naechte, betrag, zahlung, status, quelle)
  values (left(btrim(p->>'bootsname'), 60), left(btrim(p->>'skipper'), 80), left(p->>'herkunft', 80), left(p->>'tel', 40),
          nullif(p->>'laenge', '')::numeric, nullif(p->>'breite', '')::numeric, (p->>'ankunft')::date, n, n * preis, 'offen', 'angemeldet', 'qr')
  returning id into neu;
  return jsonb_build_object('ok', true, 'id', neu, 'betrag', n * preis);
end $$;

-- Öffentlich: Angaben für den Aufnahmeantrag (Beiträge, Gläubiger-ID)
create or replace function public.aufnahme_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'beitraege', g.daten->'beitraege', 'eintrittsgeld_probe', g.daten->'eintrittsgeld_probe',
    'verein_name', e.daten->>'verein_name', 'verein_email', e.daten->>'verein_email', 'glaeubiger_id', e.daten->>'glaeubiger_id')
  from public.hafen_einstellungen e
  left join lateral (select daten from public.gebuehren where jahr <= extract(year from now()) order by jahr desc limit 1) g on true
  where e.id = 1;
$$;

-- Öffentlich: Aufnahmeantrag stellen
create or replace function public.antrag_stellen(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare neu uuid; ib text := upper(regexp_replace(coalesce(p->>'iban', ''), '\s', '', 'g'));
begin
  if coalesce(btrim(p->>'vorname'), '') = '' or coalesce(btrim(p->>'nachname'), '') = '' or coalesce(btrim(p->>'email'), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Vorname, Nachname und eine gültige E-Mail sind Pflicht';
  end if;
  if coalesce(p->>'art', '') not in ('ausuebend', 'probe', 'foerdernd', 'partner', 'jugend', 'jugend_geschwister', 'ausbildung') then raise exception 'Mitgliedsart unbekannt'; end if;
  if not coalesce((p->>'satzung')::boolean, false) or not coalesce((p->>'datenschutz')::boolean, false) then raise exception 'Satzung und Datenschutz bitte bestätigen'; end if;
  if ib <> '' and not public._iban_ok(ib) then raise exception 'IBAN ungültig'; end if;
  if (select count(*) from public.antraege where eingang > now() - interval '1 hour') > 20 then raise exception 'Gerade gehen sehr viele Anträge ein – bitte später erneut versuchen'; end if;
  insert into public.antraege (art, vorname, nachname, geburtsdatum, geschlecht, strasse, plz, ort, email, tel, erziehungsberechtigt, boot, warteliste,
    kontoinhaber, iban, mandat, satzung, datenschutz, nachricht)
  values (p->>'art', left(btrim(p->>'vorname'), 80), left(btrim(p->>'nachname'), 80), nullif(p->>'geburtsdatum', '')::date, nullif(p->>'geschlecht', ''),
    left(p->>'strasse', 120), left(p->>'plz', 10), left(p->>'ort', 80), left(btrim(p->>'email'), 120), left(p->>'tel', 40), left(p->>'erziehungsberechtigt', 120),
    case when jsonb_typeof(p->'boot') = 'object' then p->'boot' end, coalesce((p->>'warteliste')::boolean, false),
    left(p->>'kontoinhaber', 120), nullif(ib, ''), coalesce((p->>'mandat')::boolean, false) and ib <> '', true, true, left(p->>'nachricht', 2000))
  returning id into neu;
  return jsonb_build_object('ok', true, 'id', neu);
end $$;

-- Mein SSV: Platzstatus für den Mini-Hafenplan – ohne Namen anderer Mitglieder
create or replace function public.hafen_platzstatus(p_saison int, p_datum date)
returns table (platz_id text, status text)
language sql stable security definer set search_path = public as $$
  select l.id,
    case when l.gesperrt then 'gesperrt'
         when exists (select 1 from public.gaeste g where g.platz_id = l.id and g.status <> 'storniert' and g.ankunft <= p_datum and g.ankunft + g.naechte > p_datum) then 'gast'
         when b.id is not null and exists (select 1 from public.abwesenheiten a where a.platz_id = l.id and p_datum between a.von and a.bis) then 'unterwegs'
         when b.id is not null then case when b.art = 'saisongast' then 'saisongast' else 'belegt' end
         else 'frei' end
  from public.liegeplaetze l
  left join public.belegungen b on b.platz_id = l.id and b.saison = p_saison and b.periode = 'sommer'
  where auth.uid() is not null;
$$;

-- Mein SSV: eigene Kontaktdaten und Bootsdaten aktualisieren
create or replace function public.mein_daten_aendern(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen();
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  update public.mitglieder set
    tel = coalesce(left(p->>'tel', 40), tel), email = coalesce(nullif(left(btrim(p->>'email'), 120), ''), email), kfz = coalesce(left(p->>'kfz', 20), kfz)
  where id = mid;
  if p ? 'boot_id' then
    update public.boote set
      versicherung = coalesce(left(p->>'versicherung', 80), versicherung), vers_bis = coalesce(nullif(p->>'vers_bis', '')::date, vers_bis),
      gewicht_t = coalesce(nullif(p->>'gewicht_t', '')::numeric, gewicht_t)
    where id = (p->>'boot_id')::uuid and eigner_id = mid;
  end if;
end $$;

-- Mein SSV: Platz auf der Warteliste
create or replace function public.mein_wartelistenplatz() returns jsonb
language sql stable security definer set search_path = public as $$
  select (select jsonb_build_object('platz', rang, 'seit', datum) from (
    select mitglied_id, datum, row_number() over (order by datum, id) as rang from public.warteliste where status = 'wartend') w
    where w.mitglied_id = public._mein_mitglied());
$$;

-- Supabase gibt neuen Funktionen standardmäßig Ausführungsrechte für alle – hier wieder einsammeln
-- und nur gezielt freigeben: anon = Kasse (mit Geräteschlüssel), Gast-Anmeldung, Aufnahmeantrag.
-- Wichtig: auch „authenticated“ – sonst könnte ein Mitglied mit Mein-SSV-Login interne Funktionen wie _buchen direkt aufrufen.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.kasse_mitglieder(text), public.kasse_produkte(text), public.kasse_login(text, uuid, text),
  public.kasse_buchen(text, uuid, text, jsonb), public.kasse_verlauf(text, uuid, text), public.kasse_storno(text, uuid, text, uuid),
  public.kasse_optionen(text), public.kasse_pin_festlegen(text, uuid, text, text) to anon, authenticated;
-- Verwaltung (prüfen selbst die Rolle) und Mein SSV (nur eigene Daten)
grant execute on function public.admin_pin_setzen(uuid, text), public.admin_pin_zuruecksetzen(uuid), public.admin_kasse_einrichten(text),
  public.admin_buchen(uuid, jsonb, timestamptz), public.admin_rechnungen_erstellen(date, date, date), public.admin_rechnung_stornieren(uuid),
  public.mitglied_uebersicht(), public.mitglied_pin_aendern(text) to authenticated;
-- In Zeilenschutz-Regeln verwendet – müssen für eingeloggte Nutzer aufrufbar sein (liefern nur eigene Rechte/ID)
grant execute on function public.is_admin(), public.ist_redakteur() to authenticated;
grant execute on function public.gast_info(), public.gast_anmelden(jsonb), public.aufnahme_info(), public.antrag_stellen(jsonb) to anon, authenticated;
grant execute on function public.hafen_platzstatus(int, date), public.mein_daten_aendern(jsonb), public.mein_wartelistenplatz(),
  public.hat_rolle(text[]), public.ist_personal(), public.ist_finanz(), public.meine_rollen(), public._mein_mitglied() to authenticated;

-- ======================================================= Grunddaten (Liegeplätze) --
-- Struktur laut Gebührenordnung 2024; Box-Maße sind Annahmen bis zum echten Liegeplatzplan.
insert into public.liegeplaetze (id, nr, bruecke, box, max_laenge, max_breite, strom, sonderpreis, notiz)
select 'LP' || lpad(n::text, 2, '0'), n::text,
  case when n <= 24 then 'ost' when n <= 70 then 'west' else 'schwimm' end, b,
  case b when 'I' then 11 when 'II' then 9 else 7 end, case b when 'I' then 3.7 when 'II' then 3.1 else 2.6 end, true, null, ''
from (select n, case when n <= 16 then 'I' when n = 17 then 'II' when n <= 24 then 'I' when n <= 62 then 'II' when n <= 70 then 'I'
                     when n in (71, 73, 75, 76) then 'III' else 'II' end as b from generate_series(1, 79) n) x
on conflict (id) do nothing;
insert into public.liegeplaetze (id, nr, bruecke, box, max_laenge, max_breite, strom, sonderpreis, notiz) values
  ('LPL1', 'L1', 'laengs', 'L', 12, 4, true, 450, 'Längsseits – Sondertarif [PLATZHALTER]'),
  ('LPL2', 'L2', 'laengs', 'L', 12, 4, false, 450, 'Längsseits – Sondertarif [PLATZHALTER]')
on conflict (id) do nothing;
insert into public.landplaetze (id, bez, art, bereich)
select 'P' || lpad(i::text, 2, '0'), 'Palette ' || i, 'palette', case when i <= 20 then 'nord' else 'west' end from generate_series(1, 40) i
union all select 'H' || i, 'Halle ' || i, 'halle', 'halle' from generate_series(1, 4) i
union all select 'A' || i, 'Außenlager ' || i, 'aussen', 'aussen' from generate_series(1, 6) i
on conflict (id) do nothing;

-- Gebührenordnung 2024 (gilt bis zur nächsten Änderung)
insert into public.gebuehren (jahr, daten) values (2024, '{
  "stand": "Gebührenordnung Stand Februar 2024",
  "sommerliegegebuehr": {"I": 92, "II": 60, "III": 40}, "wasserpacht": {"I": 45, "II": 30, "III": 18},
  "foerdernd_sommer": {"I": 580, "II": 500, "III": 400}, "gast_saison": {"I": 745, "II": 635, "III": 515},
  "gast_nacht": 15, "stromumlage": 75, "land_aussen_m2": 4, "land_halle_m2": 6, "palette_halbjahr": 100,
  "schiffskran_std": 75, "mastenkran_std": 25, "schluesselpfand": 50,
  "beitraege": {"ausuebend": {"verein": 180, "verband": 18.43}, "probe": {"verein": 180, "verband": 18.43},
    "foerdernd": {"verein": 70, "verband": 18.43}, "partner": {"verein": 30, "verband": 0},
    "jugend": {"verein": 55, "verband": 9.44}, "jugend_geschwister": {"verein": 25, "verband": 9.44},
    "ausbildung": {"verein": 65, "verband": 18.43}},
  "eintrittsgeld_probe": 130}'::jsonb)
on conflict (jahr) do nothing;

update public.hafen_einstellungen set daten = '{
  "verein_name": "Schwartauer Segler-Verein e.V.", "verein_strasse": "Zur Teerhofsinsel 5B", "verein_ort": "23554 Lübeck",
  "verein_email": "info@ssv-net.de", "steuernummer": "22 290 72188", "glaeubiger_id": "", "iban": "", "bic": "", "bank": "",
  "kassenwart_name": "Carsten Schneider", "hafenmeister_name": "Dieter Voß", "hafenmeister_tel": "0179 5916979",
  "rechnung_praefix": "SSV-H", "beitrag_praefix": "SSV-B", "zahlungsziel_tage": 14, "stromumlage_ueber_hafen": true,
  "arbeitsdienst_soll": 15, "flaeche_aufschlag_m": 0, "fusstext": "Danke, dass du dabei bist – und allzeit gute Fahrt!",
  "zaehler": {"quittung": 0}}'::jsonb
where id = 1 and daten = '{}'::jsonb;

-- Erste Rollen vergeben (Konto vorher unter Authentication → Users anlegen):
--   insert into public.funktionen (user_id, rolle, name)
--   select id, 'vorstand', 'Vorstand' from auth.users where email = 'vorstand@ssv-net.de';

-- Supabase-Sicherheitshinweis „Function Search Path Mutable“: festen Suchpfad setzen
alter function public._berlin_tag(timestamptz) set search_path = public;
alter function public._pin_ok(text) set search_path = public;
alter function public._iban_ok(text) set search_path = public;
alter function public._inhalt_gestempelt() set search_path = public;

-- Nachtrag 1: Vereinsangaben (Name, Anschrift, Gläubiger-ID, Bank) und Gebühren darf jedes angemeldete
-- Mitglied lesen – sie stehen ohnehin auf jeder Rechnung und werden für „Mein SSV“ (PDF) gebraucht.
drop policy if exists mitglieder_lesen on public.einstellungen;
create policy mitglieder_lesen on public.einstellungen for select to authenticated using (true);
drop policy if exists mitglieder_lesen on public.hafen_einstellungen;
create policy mitglieder_lesen on public.hafen_einstellungen for select to authenticated using (true);
drop policy if exists mitglieder_lesen on public.gebuehren;
create policy mitglieder_lesen on public.gebuehren for select to authenticated using (true);

-- ======================================================================= Nachtrag 2

-- 1 · Mitgliederstamm: Funktionsträger ändern nur Stammdaten-Spalten.
--     Konto-Verknüpfung (user_id), Kassen-Code und Sperre ändern nur Datenbank-Funktionen.
revoke insert, update on public.mitglieder from authenticated;
grant insert (id, nr, vorname, nachname, email, strasse, plz, ort, sepa, mandatsreferenz, notiz, aktiv,
              art, tel, kfz, geburtsdatum, geschlecht, eintritt, austritt) on public.mitglieder to authenticated;
grant update (nr, vorname, nachname, email, strasse, plz, ort, sepa, mandatsreferenz, notiz, aktiv,
              art, tel, kfz, geburtsdatum, geschlecht, eintritt, austritt) on public.mitglieder to authenticated;
drop policy if exists personal on public.mitglieder;
drop policy if exists personal_lesen on public.mitglieder;
create policy personal_lesen on public.mitglieder for select to authenticated using (public.ist_personal());
drop policy if exists personal_anlegen on public.mitglieder;
create policy personal_anlegen on public.mitglieder for insert to authenticated with check (public.ist_personal());
drop policy if exists personal_aendern on public.mitglieder;
create policy personal_aendern on public.mitglieder for update to authenticated using (public.ist_personal()) with check (public.ist_personal());
-- Löschen bleibt Vorstand/Kassenwart vorbehalten (Regel admin_alles)

-- E-Mail-Adressen bestehender Mitglieder ändern nur Vorstand und Kassenwart (die E-Mail verknüpft das Mein-SSV-Konto)
create or replace function public._mitglied_schutz() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' and new.email is distinct from old.email and not public.ist_finanz() then
    raise exception 'E-Mail-Adressen von Mitgliedern ändern nur Vorstand oder Kassenwart.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists mitglied_schutz on public.mitglieder;
create trigger mitglied_schutz before update on public.mitglieder for each row execute function public._mitglied_schutz();

-- 2 · Verwaltungsrechte der Getränkekasse vergibt nur der Vorstand
drop policy if exists admin_alles on public.admins;
drop policy if exists vorstand on public.admins;
create policy vorstand on public.admins for all to authenticated using (public.hat_rolle('vorstand')) with check (public.hat_rolle('vorstand'));

-- 3 · Hafenstatus und Vereinsangaben nur für Mitglieder und Funktionsträger (nicht für beliebige neue Konten)
create or replace function public.hafen_platzstatus(p_saison int, p_datum date)
returns table (platz_id text, status text)
language sql stable security definer set search_path = public as $$
  select l.id,
    case when l.gesperrt then 'gesperrt'
         when exists (select 1 from public.gaeste g where g.platz_id = l.id and g.status <> 'storniert' and g.ankunft <= p_datum and g.ankunft + g.naechte > p_datum) then 'gast'
         when b.id is not null and exists (select 1 from public.abwesenheiten a where a.platz_id = l.id and p_datum between a.von and a.bis) then 'unterwegs'
         when b.id is not null then case when b.art = 'saisongast' then 'saisongast' else 'belegt' end
         else 'frei' end
  from public.liegeplaetze l
  left join public.belegungen b on b.platz_id = l.id and b.saison = p_saison and b.periode = 'sommer'
  where (public._mein_mitglied() is not null or public.ist_personal())
    and p_datum between current_date - 1 and current_date + 1;   -- nur „heute“: keine Vorhersage, wann Boote weg sind
$$;
drop policy if exists mitglieder_lesen on public.einstellungen;
create policy mitglieder_lesen on public.einstellungen for select to authenticated using (public._mein_mitglied() is not null or public.ist_personal());
drop policy if exists mitglieder_lesen on public.hafen_einstellungen;
create policy mitglieder_lesen on public.hafen_einstellungen for select to authenticated using (public._mein_mitglied() is not null or public.ist_personal());
drop policy if exists mitglieder_lesen on public.gebuehren;
create policy mitglieder_lesen on public.gebuehren for select to authenticated using (public._mein_mitglied() is not null or public.ist_personal());

-- 4 · Kassen-Code: Sperre wird mit jeder Fehlerserie länger (5 → 15 → 45 Minuten … höchstens 24 Stunden)
create or replace function public._fehlversuch(p_mitglied uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; bis timestamptz;
begin
  update public.mitglieder set fehlversuche = fehlversuche + 1 where id = p_mitglied returning fehlversuche into n;
  if n % 5 = 0 then
    bis := now() + make_interval(mins => least(1440, (5 * power(3, n / 5 - 1))::int));
    update public.mitglieder set gesperrt_bis = bis where id = p_mitglied;
    return jsonb_build_object('rest', 0, 'gesperrt_bis', bis);
  end if;
  return jsonb_build_object('rest', 5 - n % 5);
end $$;

create or replace function public._kasse_pruefen(p_token text, p_mitglied uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare m public.mitglieder; f jsonb;
begin
  if p_token is null or not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(p_token, 'sha256'), 'hex')) then
    return jsonb_build_object('ok', false, 'fehler', 'geraet');
  end if;
  select * into m from public.mitglieder where id = p_mitglied and aktiv for update;
  if not found then return jsonb_build_object('ok', false, 'fehler', 'mitglied'); end if;
  if m.pin_hash is null then return jsonb_build_object('ok', false, 'fehler', 'kein_pin'); end if;
  if m.gesperrt_bis is not null and m.gesperrt_bis > now() then
    return jsonb_build_object('ok', false, 'fehler', 'gesperrt', 'gesperrt_bis', m.gesperrt_bis);
  end if;
  if m.pin_hash <> crypt(coalesce(p_pin, ''), m.pin_hash) then
    f := public._fehlversuch(m.id);
    return jsonb_build_object('ok', false, 'fehler', 'pin') || f;
  end if;
  if m.fehlversuche > 0 or m.gesperrt_bis is not null then
    update public.mitglieder set fehlversuche = 0, gesperrt_bis = null where id = m.id;
  end if;
  return null;
end $$;

create or replace function public.kasse_pin_festlegen(p_token text, p_mitglied uuid, p_pin text, p_nr text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare m public.mitglieder;
begin
  if p_token is null or not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(p_token, 'sha256'), 'hex')) then
    return jsonb_build_object('ok', false, 'fehler', 'geraet');
  end if;
  if not public._einstellung_bool('pin_selbst_festlegen', true) then return jsonb_build_object('ok', false, 'fehler', 'aus'); end if;
  select * into m from public.mitglieder where id = p_mitglied and aktiv for update;
  if not found then return jsonb_build_object('ok', false, 'fehler', 'mitglied'); end if;
  if m.pin_hash is not null then return jsonb_build_object('ok', false, 'fehler', 'schon_gesetzt'); end if;
  if m.gesperrt_bis is not null and m.gesperrt_bis > now() then
    return jsonb_build_object('ok', false, 'fehler', 'gesperrt', 'gesperrt_bis', m.gesperrt_bis);
  end if;
  if public._einstellung_bool('pin_erst_nr_pruefen', true) and (m.nr is null or btrim(coalesce(p_nr, '')) <> btrim(m.nr)) then
    return jsonb_build_object('ok', false, 'fehler', 'nr') || public._fehlversuch(m.id);
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'fehler', 'format'); end if;
  if not public._pin_ok(p_pin) then return jsonb_build_object('ok', false, 'fehler', 'einfach'); end if;
  update public.mitglieder set pin_hash = crypt(p_pin, gen_salt('bf', 8)), fehlversuche = 0, gesperrt_bis = null where id = m.id;
  update public.kassen_geraete set zuletzt = now() where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  return jsonb_build_object('ok', true, 'vorname', m.vorname, 'nachname', m.nachname, 'alter', public._alter(m.geburtsdatum)) || public._summen(m.id);
end $$;

-- 5 · Getränke mit Altersgrenze (Jugendschutzgesetz § 9: Bier/Wein/Sekt ab 16, Spirituosen ab 18)
alter table public.produkte add column if not exists ab_alter int check (ab_alter is null or ab_alter between 1 and 21);
create or replace function public._alter(p_geb date) returns int
language sql stable set search_path = public as $$ select case when p_geb is null then null else extract(year from age(current_date, p_geb))::int end $$;

create or replace function public._buchen(p_mitglied uuid, p_posten jsonb, p_quelle text, p_zeit timestamptz)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  po jsonb; pr public.produkte; v_anzahl int; v_einheit text; v_preis numeric; v_summe numeric := 0;
  v_alter int := public._alter((select geburtsdatum from public.mitglieder where id = p_mitglied));
begin
  if jsonb_typeof(p_posten) <> 'array' or jsonb_array_length(p_posten) = 0 or jsonb_array_length(p_posten) > 30 then
    raise exception 'Ungültige Posten';
  end if;
  for po in select * from jsonb_array_elements(p_posten) loop
    select * into pr from public.produkte where id = (po->>'produkt_id')::uuid and aktiv;
    if not found then raise exception 'Produkt nicht verfügbar'; end if;
    if pr.ab_alter is not null and v_alter is not null and v_alter < pr.ab_alter then
      raise exception '% gibt es erst ab % Jahren.', pr.name, pr.ab_alter;
    end if;
    v_anzahl  := (po->>'anzahl')::int;
    v_einheit := coalesce(po->>'einheit', 'stk');
    if v_anzahl is null or v_anzahl < 1 or v_anzahl > 99 then raise exception 'Ungültige Anzahl'; end if;
    if v_einheit = 'kasten' then
      if pr.kasten_groesse is null or pr.kasten_preis is null then raise exception 'Kein Kasten für %', pr.name; end if;
      v_preis := pr.kasten_preis;
    elsif v_einheit = 'stk' then v_preis := pr.preis;
    else raise exception 'Ungültige Einheit'; end if;
    insert into public.buchungen (mitglied_id, produkt_id, produkt_name, einheit, anzahl, stueck, einzelpreis, betrag, zeit, quelle)
    values (p_mitglied, pr.id, pr.name, v_einheit, v_anzahl,
            v_anzahl * case when v_einheit = 'kasten' then pr.kasten_groesse else 1 end,
            v_preis, v_preis * v_anzahl, coalesce(p_zeit, now()), p_quelle);
    v_summe := v_summe + v_preis * v_anzahl;
  end loop;
  return v_summe;
end $$;

create or replace function public.kasse_login(p_token text, p_mitglied uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; m public.mitglieder;
begin
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  update public.kassen_geraete set zuletzt = now() where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  select * into m from public.mitglieder where id = p_mitglied;
  return jsonb_build_object('ok', true, 'vorname', m.vorname, 'nachname', m.nachname, 'alter', public._alter(m.geburtsdatum)) || public._summen(p_mitglied);
end $$;

-- 6 · Aufnahmeantrag: Minderjährige nur mit Erziehungsberechtigten, Boot-Angaben begrenzt
alter table public.antraege add column if not exists eltern_einverstanden boolean not null default false;
create or replace function public.antrag_stellen(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare neu uuid; ib text := upper(regexp_replace(coalesce(p->>'iban', ''), '\s', '', 'g'));
        geb date := nullif(p->>'geburtsdatum', '')::date; alt int; b jsonb := null;
begin
  if coalesce(btrim(p->>'vorname'), '') = '' or coalesce(btrim(p->>'nachname'), '') = '' or coalesce(btrim(p->>'email'), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Vorname, Nachname und eine gültige E-Mail sind Pflicht';
  end if;
  if coalesce(p->>'art', '') not in ('ausuebend', 'probe', 'foerdernd', 'partner', 'jugend', 'jugend_geschwister', 'ausbildung') then raise exception 'Mitgliedsart unbekannt'; end if;
  if not coalesce((p->>'satzung')::boolean, false) or not coalesce((p->>'datenschutz')::boolean, false) then raise exception 'Satzung und Datenschutz bitte bestätigen'; end if;
  if geb is null or geb > current_date or geb < current_date - interval '110 years' then raise exception 'Bitte ein gültiges Geburtsdatum angeben'; end if;
  alt := public._alter(geb);
  if alt < 18 and (p->>'art') not like 'jugend%' then raise exception 'Unter 18 Jahren bitte die Jugendmitgliedschaft wählen'; end if;
  if alt >= 18 and (p->>'art') like 'jugend%' then raise exception 'Die Jugendmitgliedschaft gilt bis 17 Jahre'; end if;
  if alt < 18 and (coalesce(btrim(p->>'erziehungsberechtigt'), '') = '' or not coalesce((p->>'eltern_einverstanden')::boolean, false)) then
    raise exception 'Bei Minderjährigen stellt eine erziehungsberechtigte Person den Antrag';
  end if;
  if ib <> '' and not public._iban_ok(ib) then raise exception 'IBAN ungültig'; end if;
  if (select count(*) from public.antraege where eingang > now() - interval '1 hour') > 20 then raise exception 'Gerade gehen sehr viele Anträge ein – bitte später erneut versuchen'; end if;
  if jsonb_typeof(p->'boot') = 'object' then
    b := jsonb_build_object('name', left(p->'boot'->>'name', 60), 'typ', left(p->'boot'->>'typ', 60),
      'laenge', least(30, greatest(0, coalesce((p->'boot'->>'laenge')::numeric, 0))), 'breite', least(8, greatest(0, coalesce((p->'boot'->>'breite')::numeric, 0))));
  end if;
  insert into public.antraege (art, vorname, nachname, geburtsdatum, geschlecht, strasse, plz, ort, email, tel, erziehungsberechtigt, eltern_einverstanden, boot, warteliste,
    kontoinhaber, iban, mandat, satzung, datenschutz, nachricht)
  values (p->>'art', left(btrim(p->>'vorname'), 80), left(btrim(p->>'nachname'), 80), geb, nullif(left(p->>'geschlecht', 1), ''),
    left(p->>'strasse', 120), left(p->>'plz', 10), left(p->>'ort', 80), left(btrim(p->>'email'), 120), left(p->>'tel', 40), left(p->>'erziehungsberechtigt', 120),
    coalesce((p->>'eltern_einverstanden')::boolean, false), b, coalesce((p->>'warteliste')::boolean, false) and b is not null,
    left(p->>'kontoinhaber', 120), nullif(ib, ''), coalesce((p->>'mandat')::boolean, false) and ib <> '', true, true, left(p->>'nachricht', 2000))
  returning id into neu;
  return jsonb_build_object('ok', true, 'id', neu);
end $$;

-- 7 · Löschfristen (Art. 5 Abs. 1 lit. e DSGVO). Rechnungen und Buchungen bleiben 10 Jahre (§ 147 AO).
--     Aufruf durch den Vorstand oder automatisch (siehe pg_cron unten).
create or replace function public.daten_aufraeumen() returns jsonb
language plpgsql security definer set search_path = public as $$
declare a int; b int; c int; d int; e int;
begin
  if auth.uid() is not null and not public.hat_rolle('vorstand') then raise exception 'Nur für den Vorstand' using errcode = '42501'; end if;
  -- abgelehnte Anträge nach 6 Monaten löschen
  delete from public.antraege where status = 'abgelehnt' and eingang < now() - interval '6 months'; get diagnostics a = row_count;
  -- angenommene Anträge: Bank- und Geburtsdaten liegen jetzt im Mitgliederstamm → nach 1 Monat aus dem Antrag entfernen
  update public.antraege set iban = null, kontoinhaber = null, geburtsdatum = null, tel = null
   where status = 'angenommen' and entschieden < current_date - 30 and (iban is not null or geburtsdatum is not null); get diagnostics b = row_count;
  -- Gastlieger: Kontaktdaten 12 Monate nach Abreise entfernen (Betrag und Quittung bleiben für die Buchhaltung)
  update public.gaeste set skipper = 'Gast', tel = null, email = null, herkunft = null
   where ankunft + naechte < current_date - 365 and skipper <> 'Gast'; get diagnostics c = row_count;
  -- Ausgetretene: ein Jahr nach Austritt Kontakt-, Geburts- und Bankdaten entfernen, Konto lösen (Name/Nr. bleiben für Rechnungen)
  update public.mitglieder set email = null, tel = null, kfz = null, geburtsdatum = null, strasse = null, user_id = null, pin_hash = null, aktiv = false
   where austritt is not null and austritt < current_date - 365 and (email is not null or tel is not null or geburtsdatum is not null); get diagnostics d = row_count;
  delete from public.mitglieder_bank mb using public.mitglieder m where m.id = mb.mitglied_id and m.austritt is not null and m.austritt < current_date - 365; get diagnostics e = row_count;
  return jsonb_build_object('antraege_geloescht', a, 'antraege_bereinigt', b, 'gaeste_anonymisiert', c, 'mitglieder_bereinigt', d, 'bankdaten_geloescht', e);
end $$;
-- Automatisch einmal pro Woche (Supabase: Database → Extensions → pg_cron aktivieren, dann einmal ausführen):
--   select cron.schedule('ssv-loeschfristen', '0 3 * * 1', $$select public.daten_aufraeumen()$$);

-- 8 · Rechte für neue/erneuerte Funktionen
revoke execute on function public._mitglied_schutz(), public._fehlversuch(uuid), public._alter(date), public.daten_aufraeumen(),
  public._buchen(uuid, jsonb, text, timestamptz), public._kasse_pruefen(text, uuid, text) from public, anon, authenticated;
grant execute on function public.daten_aufraeumen() to authenticated;
grant execute on function public.kasse_login(text, uuid, text), public.kasse_pin_festlegen(text, uuid, text, text), public.antrag_stellen(jsonb) to anon, authenticated;
grant execute on function public.hafen_platzstatus(int, date) to authenticated;

-- Mein SSV: auch Anschrift selbst ändern (Umzug) – für alle Mitglieder, nicht nur Bootseigner
create or replace function public.mein_daten_aendern(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen();
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  update public.mitglieder set
    tel = coalesce(left(p->>'tel', 40), tel), email = coalesce(nullif(left(btrim(p->>'email'), 120), ''), email), kfz = coalesce(left(p->>'kfz', 20), kfz),
    strasse = coalesce(nullif(left(btrim(p->>'strasse'), 120), ''), strasse), plz = coalesce(nullif(left(btrim(p->>'plz'), 10), ''), plz),
    ort = coalesce(nullif(left(btrim(p->>'ort'), 80), ''), ort)
  where id = mid;
  if p ? 'boot_id' then
    update public.boote set
      versicherung = coalesce(left(p->>'versicherung', 80), versicherung), vers_bis = coalesce(nullif(p->>'vers_bis', '')::date, vers_bis),
      gewicht_t = coalesce(nullif(replace(p->>'gewicht_t', ',', '.'), '')::numeric, gewicht_t)
    where id = (p->>'boot_id')::uuid and eigner_id = mid;
  end if;
end $$;
grant execute on function public.mein_daten_aendern(jsonb) to authenticated;

-- ============================================================================
-- Nachtrag 3 (Feedback-Runde) – identisch mit supabase/nachtrag-03.sql
-- ============================================================================
-- 1 · Belegung eindeutig (aufgeschoben geprüft, damit Umlegen/Tauschen in einem Schritt geht)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'belegung_platz_eindeutig') then
    alter table public.belegungen add constraint belegung_platz_eindeutig unique (saison, periode, platz_id) deferrable initially deferred;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'belegung_boot_eindeutig') then
    alter table public.belegungen add constraint belegung_boot_eindeutig unique (saison, periode, boot_id) deferrable initially deferred;
  end if;
end $$;

-- 3 · neue Spalten
alter table public.gaeste add column if not exists tiefgang numeric;
alter table public.gaeste add column if not exists bezahlt_am date;
update public.gaeste set bezahlt_am = ankunft where bezahlt_am is null and (zahlung = 'bar' or coalesce(quittung_nr, '') <> '');
alter table public.liegeplaetze add column if not exists tiefe numeric;           -- Wassertiefe in m (leer = unbekannt)
alter table public.boote add column if not exists vers_status text check (vers_status in ('selbst', 'eingereicht', 'geprueft'));
alter table public.boote add column if not exists vers_geprueft_am date;
alter table public.boote add column if not exists vers_geprueft_von text;
alter table public.hafen_rechnungen add column if not exists zahlungen jsonb not null default '[]'::jsonb;
alter table public.mitglieder add column if not exists arbeitsdienst_befreit text;  -- Grund; leer = nicht befreit
grant select (arbeitsdienst_befreit), insert (arbeitsdienst_befreit), update (arbeitsdienst_befreit) on public.mitglieder to authenticated;

-- 2 · Gastlieger prüfen – auch wenn zwei Personen gleichzeitig einweisen
create or replace function public._gast_pruefen() returns trigger
language plpgsql security definer set search_path = public as $$
declare alt public.gaeste; p public.liegeplaetze; konflikt public.gaeste; nacht date; bis date;
begin
  if new.platz_id is null or new.platz_id = '' or new.status = 'storniert' then return new; end if;
  -- unveränderte Zuweisung (z. B. nur Zahlung nachgetragen) nicht erneut prüfen
  select * into alt from public.gaeste where id = new.id;
  if found and alt.platz_id is not distinct from new.platz_id and alt.ankunft = new.ankunft and alt.naechte = new.naechte
     and alt.laenge is not distinct from new.laenge and alt.breite is not distinct from new.breite and alt.tiefgang is not distinct from new.tiefgang
     and alt.status <> 'storniert' then return new; end if;
  perform pg_advisory_xact_lock(hashtext('ssv-platz:' || new.platz_id));
  select * into p from public.liegeplaetze where id = new.platz_id;
  if not found then raise exception 'Platz % gibt es nicht.', new.platz_id; end if;
  if p.gesperrt then raise exception 'Platz % ist gesperrt.', p.nr; end if;
  if p.max_laenge is not null and new.laenge > p.max_laenge then
    raise exception 'Platz %: Boot überschreitet die Boxmaße (Länge % m, erlaubt % m).', p.nr, new.laenge, p.max_laenge; end if;
  if p.max_breite is not null and new.breite > p.max_breite then
    raise exception 'Platz %: Boot überschreitet die Boxmaße (Breite % m, erlaubt % m).', p.nr, new.breite, p.max_breite; end if;
  if p.tiefe is not null and new.tiefgang > p.tiefe then
    raise exception 'Platz %: Tiefgang % m, Wassertiefe nur % m.', p.nr, new.tiefgang, p.tiefe; end if;
  bis := new.ankunft + new.naechte;   -- Abreisetag
  select * into konflikt from public.gaeste g where g.platz_id = new.platz_id and g.id <> new.id and g.status <> 'storniert'
    and g.ankunft < bis and g.ankunft + g.naechte > new.ankunft limit 1;
  if found then raise exception 'Platz % ist in diesem Zeitraum schon an „%“ vergeben.', p.nr, konflikt.bootsname; end if;
  for nacht in select generate_series(new.ankunft, bis - 1, interval '1 day')::date loop
    if exists (select 1 from public.belegungen b where b.platz_id = new.platz_id and b.periode = 'sommer' and b.saison = extract(year from nacht)::int)
       and not exists (select 1 from public.abwesenheiten a where a.platz_id = new.platz_id and nacht between a.von and a.bis) then
      raise exception 'Platz %: Aufenthalt überschreitet die Freigabe des Eigners (am % ist der Platz belegt).', p.nr, to_char(nacht, 'DD.MM.YYYY');
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists gast_pruefen on public.gaeste;
create trigger gast_pruefen before insert or update on public.gaeste for each row execute function public._gast_pruefen();

-- Gast-Anmeldung per QR-Code: jetzt mit Tiefgang
create or replace function public.gast_anmelden(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int := greatest(1, least(30, coalesce((p->>'naechte')::int, 1))); preis numeric; neu uuid;
begin
  if coalesce(btrim(p->>'bootsname'), '') = '' or coalesce(btrim(p->>'skipper'), '') = '' or (p->>'ankunft') is null then
    raise exception 'Bootsname, Skipper und Ankunft sind Pflicht';
  end if;
  if (p->>'ankunft')::date < current_date - 1 or (p->>'ankunft')::date > current_date + 60 then raise exception 'Ankunftsdatum unplausibel'; end if;
  if (select count(*) from public.gaeste where quelle = 'qr' and erstellt > now() - interval '1 hour') > 30 then raise exception 'Zu viele Anmeldungen – bitte beim Hafenmeister melden'; end if;
  preis := (public.gast_info()->>'gast_nacht')::numeric;
  insert into public.gaeste (bootsname, skipper, herkunft, tel, laenge, breite, tiefgang, ankunft, naechte, betrag, zahlung, status, quelle)
  values (left(btrim(p->>'bootsname'), 60), left(btrim(p->>'skipper'), 80), left(p->>'herkunft', 80), left(p->>'tel', 40),
          least(40, nullif(replace(p->>'laenge', ',', '.'), '')::numeric), least(12, nullif(replace(p->>'breite', ',', '.'), '')::numeric),
          least(6, nullif(replace(p->>'tiefgang', ',', '.'), '')::numeric), (p->>'ankunft')::date, n, n * preis, 'offen', 'angemeldet', 'qr')
  returning id into neu;
  return jsonb_build_object('ok', true, 'id', neu, 'betrag', n * preis);
end $$;

-- 4 · Änderungsverlauf
create table if not exists public.aenderungen (
  id          bigint generated always as identity primary key,
  zeit        timestamptz not null default now(),
  user_id     uuid,
  wer         text,
  tabelle     text not null,
  datensatz   text,
  bezeichnung text,
  aktion      text not null check (aktion in ('neu', 'geaendert', 'geloescht')),
  aenderung   jsonb
);
create index if not exists aenderungen_zeit on public.aenderungen (zeit desc);
create index if not exists aenderungen_datensatz on public.aenderungen (tabelle, datensatz);
alter table public.aenderungen enable row level security;
revoke insert, update, delete on public.aenderungen from anon, authenticated;
drop policy if exists finanz_lesen on public.aenderungen;
create policy finanz_lesen on public.aenderungen for select to authenticated using (public.ist_finanz());

create or replace function public._protokoll() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  weg text[] := array['pin_hash', 'hat_pin', 'fehlversuche', 'gesperrt_bis', 'inhalt', 'geaendert'];
  diff jsonb; wer text;
begin
  -- Bankdaten nur gekürzt protokollieren
  if tg_table_name in ('mitglieder_bank', 'antraege') then
    if o ? 'iban' and o->>'iban' is not null then o := o || jsonb_build_object('iban', '…' || right(o->>'iban', 4)); end if;
    if n ? 'iban' and n->>'iban' is not null then n := n || jsonb_build_object('iban', '…' || right(n->>'iban', 4)); end if;
  end if;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, case when k = 'daten' and jsonb_typeof(o->k) = 'object' and jsonb_typeof(n->k) = 'object'
             then (select jsonb_object_agg(k2, jsonb_build_array(o->k->k2, n->k->k2)) from jsonb_object_keys(n->k) k2 where (o->k->k2) is distinct from (n->k->k2))
             else jsonb_build_array(o->k, n->k) end)
      into diff from jsonb_object_keys(n) k where (o->k) is distinct from (n->k) and not k = any(weg);
    if diff is null then return new; end if;
  elsif tg_op = 'INSERT' then diff := n - weg;
  else diff := o - weg; end if;
  wer := coalesce((select f.name from public.funktionen f where f.user_id = auth.uid() and coalesce(f.name, '') <> '' limit 1),
                  auth.jwt()->>'email', case when auth.uid() is null then 'öffentlich / System' end);
  insert into public.aenderungen (user_id, wer, tabelle, datensatz, bezeichnung, aktion, aenderung)
  values (auth.uid(), wer, tg_table_name, coalesce(r->>'id', r->>'mitglied_id', r->>'jahr'),
          left(coalesce(nullif(concat_ws(' ', r->>'vorname', r->>'nachname'), ''), r->>'name', r->>'bootsname', r->>'nr', r->>'titel', r->>'platz_id'), 120),
          case tg_op when 'INSERT' then 'neu' when 'UPDATE' then 'geaendert' else 'geloescht' end, diff);
  return coalesce(new, old);
end $$;
revoke execute on function public._protokoll(), public._gast_pruefen() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['mitglieder','mitglieder_bank','boote','belegungen','abwesenheiten','gaeste','warteliste','kran','arbeitsdienst',
                           'hafen_rechnungen','sepa_laeufe','antraege','liegeplaetze','gebuehren','hafen_einstellungen','funktionen'] loop
    execute format('drop trigger if exists protokoll on public.%I', t);
    execute format('create trigger protokoll after insert or update or delete on public.%I for each row execute function public._protokoll()', t);
  end loop;
end $$;

-- 8 · Schäden und Wartung
create table if not exists public.aufgaben (
  id             uuid primary key default gen_random_uuid(),
  titel          text not null,
  beschreibung   text,
  ort            text,
  platz_id       text,
  boot_id        uuid references public.boote (id) on delete set null,
  art            text not null default 'schaden' check (art in ('schaden', 'wartung')),
  prioritaet     text not null default 'normal' check (prioritaet in ('niedrig', 'normal', 'hoch')),
  status         text not null default 'offen' check (status in ('offen', 'in_arbeit', 'erledigt')),
  verantwortlich text,
  faellig        date,
  erstellt       timestamptz not null default now(),
  erstellt_von   text,
  erledigt_am    date,
  notiz          text
);
alter table public.aufgaben enable row level security;
drop policy if exists personal on public.aufgaben;
create policy personal on public.aufgaben for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop trigger if exists protokoll on public.aufgaben;
create trigger protokoll after insert or update or delete on public.aufgaben for each row execute function public._protokoll();

-- 5 · Dokumente (Versicherungsnachweise, Verträge, Fotos zu Schäden) – Inhalt als Base64, höchstens ca. 4 MB
create table if not exists public.dokumente (
  id          uuid primary key default gen_random_uuid(),
  mitglied_id uuid references public.mitglieder (id) on delete cascade,
  boot_id     uuid references public.boote (id) on delete set null,
  aufgabe_id  uuid references public.aufgaben (id) on delete cascade,
  art         text not null default 'sonstiges' check (art in ('versicherung', 'vertrag', 'foto', 'sonstiges')),
  name        text not null,
  typ         text not null check (typ in ('application/pdf', 'image/jpeg', 'image/png')),
  groesse     int,
  inhalt      text not null check (length(inhalt) <= 6000000),
  hochgeladen timestamptz not null default now(),
  von         text
);
create index if not exists dokumente_boot on public.dokumente (boot_id);
create index if not exists dokumente_mitglied on public.dokumente (mitglied_id);
alter table public.dokumente enable row level security;
drop policy if exists personal on public.dokumente;
create policy personal on public.dokumente for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists selbst on public.dokumente;
create policy selbst on public.dokumente for select to authenticated using (mitglied_id = public._mein_mitglied());
drop trigger if exists protokoll on public.dokumente;
create trigger protokoll after insert or delete on public.dokumente for each row execute function public._protokoll();

-- Mein SSV: Versicherungsnachweis hochladen (setzt den Status auf „eingereicht“)
create or replace function public.mein_nachweis_hochladen(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen(); bid uuid := (p->>'boot_id')::uuid; neu uuid;
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  if not exists (select 1 from public.boote where id = bid and eigner_id = mid) then raise exception 'Das Boot gehört nicht zu deinem Konto.'; end if;
  if coalesce(p->>'typ', '') not in ('application/pdf', 'image/jpeg', 'image/png') then raise exception 'Bitte ein PDF oder Foto (JPG/PNG) hochladen.'; end if;
  if length(coalesce(p->>'inhalt', '')) > 6000000 then raise exception 'Die Datei ist zu groß (höchstens 4 MB).'; end if;
  if (select count(*) from public.dokumente where boot_id = bid and hochgeladen > now() - interval '1 day') >= 10 then raise exception 'Heute wurden schon genug Dateien hochgeladen.'; end if;
  insert into public.dokumente (mitglied_id, boot_id, art, name, typ, groesse, inhalt, von)
  values (mid, bid, 'versicherung', left(coalesce(nullif(btrim(p->>'name'), ''), 'Versicherungsnachweis'), 120), p->>'typ', length(p->>'inhalt') * 3 / 4, p->>'inhalt', 'Mitglied (Mein SSV)')
  returning id into neu;
  update public.boote set versicherung = coalesce(nullif(left(btrim(p->>'versicherung'), 80), ''), versicherung),
    vers_bis = coalesce(nullif(p->>'vers_bis', '')::date, vers_bis), vers_status = 'eingereicht', vers_geprueft_am = null, vers_geprueft_von = null
  where id = bid;
  return neu;
end $$;

-- Mein SSV: Schaden melden (z. B. Steg, Dalben, Strom) – landet bei den Funktionsträgern
create or replace function public.schaden_melden(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen(); m public.mitglieder; neu uuid;
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  if coalesce(btrim(p->>'titel'), '') = '' then raise exception 'Bitte kurz beschreiben, was kaputt ist.'; end if;
  if (select count(*) from public.aufgaben where erstellt > now() - interval '1 day' and erstellt_von like '%(Mein SSV)') > 20 then raise exception 'Bitte später erneut versuchen.'; end if;
  select * into m from public.mitglieder where id = mid;
  insert into public.aufgaben (titel, beschreibung, ort, art, erstellt_von)
  values (left(btrim(p->>'titel'), 120), left(p->>'beschreibung', 2000), left(p->>'ort', 120), 'schaden', m.vorname || ' ' || m.nachname || ' (Mein SSV)')
  returning id into neu;
  if coalesce(p->>'inhalt', '') <> '' and p->>'typ' in ('image/jpeg', 'image/png') and length(p->>'inhalt') <= 6000000 then
    insert into public.dokumente (mitglied_id, aufgabe_id, art, name, typ, groesse, inhalt, von)
    values (mid, neu, 'foto', left(coalesce(p->>'name', 'Foto'), 120), p->>'typ', length(p->>'inhalt') * 3 / 4, p->>'inhalt', 'Mitglied (Mein SSV)');
  end if;
  return neu;
end $$;

-- Mein SSV: Selbst geänderte Versicherungsangaben gelten als „selbst angegeben“
create or replace function public.mein_daten_aendern(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen();
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  update public.mitglieder set
    tel = coalesce(left(p->>'tel', 40), tel), email = coalesce(nullif(left(btrim(p->>'email'), 120), ''), email), kfz = coalesce(left(p->>'kfz', 20), kfz),
    strasse = coalesce(nullif(left(btrim(p->>'strasse'), 120), ''), strasse), plz = coalesce(nullif(left(btrim(p->>'plz'), 10), ''), plz),
    ort = coalesce(nullif(left(btrim(p->>'ort'), 80), ''), ort)
  where id = mid;
  if p ? 'boot_id' then
    update public.boote set
      vers_status = case when coalesce(left(p->>'versicherung', 80), versicherung) is distinct from versicherung
                           or coalesce(nullif(p->>'vers_bis', '')::date, vers_bis) is distinct from vers_bis then 'selbst' else vers_status end,
      versicherung = coalesce(left(p->>'versicherung', 80), versicherung), vers_bis = coalesce(nullif(p->>'vers_bis', '')::date, vers_bis),
      gewicht_t = coalesce(nullif(replace(p->>'gewicht_t', ',', '.'), '')::numeric, gewicht_t)
    where id = (p->>'boot_id')::uuid and eigner_id = mid;
  end if;
end $$;

-- 9 · Löschfristen: zusätzlich Änderungsverlauf (3 Jahre), alte Nachweise und erledigte Aufgaben
create or replace function public.daten_aufraeumen() returns jsonb
language plpgsql security definer set search_path = public as $$
declare a int; b int; c int; d int; e int; f int; g int;
begin
  if auth.uid() is not null and not public.hat_rolle('vorstand') then raise exception 'Nur für den Vorstand' using errcode = '42501'; end if;
  delete from public.antraege where status = 'abgelehnt' and eingang < now() - interval '6 months'; get diagnostics a = row_count;
  update public.antraege set iban = null, kontoinhaber = null, geburtsdatum = null, tel = null
   where status = 'angenommen' and entschieden < current_date - 30 and (iban is not null or geburtsdatum is not null); get diagnostics b = row_count;
  update public.gaeste set skipper = 'Gast', tel = null, email = null, herkunft = null
   where ankunft + naechte < current_date - 365 and skipper <> 'Gast'; get diagnostics c = row_count;
  update public.mitglieder set email = null, tel = null, kfz = null, geburtsdatum = null, strasse = null, user_id = null, pin_hash = null, aktiv = false
   where austritt is not null and austritt < current_date - 365 and (email is not null or tel is not null or geburtsdatum is not null); get diagnostics d = row_count;
  delete from public.mitglieder_bank mb using public.mitglieder m where m.id = mb.mitglied_id and m.austritt is not null and m.austritt < current_date - 365; get diagnostics e = row_count;
  delete from public.dokumente dk where (dk.art = 'versicherung' and dk.hochgeladen < now() - interval '3 years')
     or exists (select 1 from public.mitglieder m where m.id = dk.mitglied_id and m.austritt is not null and m.austritt < current_date - 365); get diagnostics f = row_count;
  delete from public.aufgaben where status = 'erledigt' and erledigt_am < current_date - 365 * 3;
  delete from public.aenderungen where zeit < now() - interval '3 years'; get diagnostics g = row_count;
  return jsonb_build_object('antraege_geloescht', a, 'antraege_bereinigt', b, 'gaeste_anonymisiert', c, 'mitglieder_bereinigt', d,
    'bankdaten_geloescht', e, 'dokumente_geloescht', f, 'verlauf_geloescht', g);
end $$;

revoke execute on function public.daten_aufraeumen() from public, anon;
grant execute on function public.daten_aufraeumen() to authenticated;
grant execute on function public.mein_nachweis_hochladen(jsonb), public.schaden_melden(jsonb), public.mein_daten_aendern(jsonb) to authenticated;
revoke execute on function public.mein_nachweis_hochladen(jsonb), public.schaden_melden(jsonb) from public, anon;
grant execute on function public.gast_anmelden(jsonb) to anon, authenticated;

-- ============================================================================
-- Nachtrag 4 (Feedback-Runde 2) – identisch mit supabase/nachtrag-04.sql
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

-- ============================================================================
-- Nachtrag 5 (Kasse ohne Netz) – identisch mit supabase/nachtrag-05.sql
-- ============================================================================
-- Kennungen bereits verbuchter Buchungen (gegen doppeltes Nachtragen nach Verbindungsabbruch)
create table if not exists public.kasse_nachtraege (
  ref     text primary key,
  eingang timestamptz not null default now()
);
alter table public.kasse_nachtraege enable row level security;
revoke all on public.kasse_nachtraege from anon, authenticated;

-- Buchen mit eigener Kennung und Buchungszeit: das iPad merkt sich Buchungen ohne Netz und trägt sie später nach.
-- Der Code wird beim Nachtragen geprüft; dieselbe Kennung wird nur einmal verbucht.
create or replace function public.kasse_buchen_nach(p_token text, p_mitglied uuid, p_pin text, p_posten jsonb, p_zeit timestamptz, p_ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f jsonb; s numeric;
begin
  if p_ref is null or length(p_ref) < 8 or length(p_ref) > 64 then raise exception 'Buchungskennung fehlt'; end if;
  perform pg_advisory_xact_lock(hashtext('ssv-kasse:' || p_ref));
  if exists (select 1 from public.kasse_nachtraege where ref = p_ref) then
    return jsonb_build_object('ok', true, 'doppelt', true) || public._summen(p_mitglied);
  end if;
  if p_zeit is null or p_zeit > now() + interval '10 minutes' or p_zeit < now() - interval '14 days' then raise exception 'Buchungszeit unplausibel'; end if;
  f := public._kasse_pruefen(p_token, p_mitglied, p_pin);
  if f is not null then return f; end if;
  s := public._buchen(p_mitglied, p_posten, case when p_zeit < now() - interval '2 minutes' then 'kasse (nachgetragen)' else 'kasse' end, p_zeit);
  insert into public.kasse_nachtraege (ref) values (p_ref);
  delete from public.kasse_nachtraege where eingang < now() - interval '60 days';
  return jsonb_build_object('ok', true, 'summe', s) || public._summen(p_mitglied);
end $$;
revoke execute on function public.kasse_buchen_nach(text, uuid, text, jsonb, timestamptz, text) from public;
grant execute on function public.kasse_buchen_nach(text, uuid, text, jsonb, timestamptz, text) to anon, authenticated;

-- ============================================================================
-- Nachtrag 6 (Arbeitseinsätze, Mitteilungen, Push) – identisch mit supabase/nachtrag-06.sql
-- ============================================================================
-- 1 · Arbeitsstunden mit Stand: vom Verein erfasst (bestätigt) oder vom Mitglied gemeldet (eingereicht)
alter table public.arbeitsdienst add column if not exists status text not null default 'bestaetigt' check (status in ('eingereicht', 'bestaetigt', 'abgelehnt'));
alter table public.arbeitsdienst add column if not exists einsatz_id uuid;
alter table public.arbeitsdienst add column if not exists gemeldet timestamptz;
alter table public.arbeitsdienst add column if not exists geprueft_von text;

-- Arbeitseinsätze (Termine); der Check-in-Code liegt getrennt, damit Mitglieder ihn nicht lesen können
create table if not exists public.arbeitseinsaetze (
  id           uuid primary key default gen_random_uuid(),
  datum        date not null,
  titel        text not null,
  beginn       text,
  ende         text,
  stunden      numeric not null default 4 check (stunden > 0 and stunden <= 12),
  notiz        text,
  erstellt_von text
);
create table if not exists public.arbeitseinsatz_codes (
  einsatz_id uuid primary key references public.arbeitseinsaetze (id) on delete cascade,
  code       text not null unique
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'arbeitsdienst_einsatz_fk') then
    alter table public.arbeitsdienst add constraint arbeitsdienst_einsatz_fk foreign key (einsatz_id) references public.arbeitseinsaetze (id) on delete set null;
  end if;
end $$;
create unique index if not exists arbeitsdienst_einmal_je_einsatz on public.arbeitsdienst (mitglied_id, einsatz_id) where einsatz_id is not null and status <> 'abgelehnt';
alter table public.arbeitseinsaetze enable row level security;
alter table public.arbeitseinsatz_codes enable row level security;
drop policy if exists personal on public.arbeitseinsaetze;
create policy personal on public.arbeitseinsaetze for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists mitglieder_lesen on public.arbeitseinsaetze;
create policy mitglieder_lesen on public.arbeitseinsaetze for select to authenticated using (public._mein_mitglied() is not null);
drop policy if exists personal on public.arbeitseinsatz_codes;
create policy personal on public.arbeitseinsatz_codes for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop trigger if exists protokoll on public.arbeitseinsaetze;
create trigger protokoll after insert or update or delete on public.arbeitseinsaetze for each row execute function public._protokoll();

-- Mitglied meldet Stunden: per QR-Code am Einsatztag (Code muss stimmen) oder frei (z. B. Gartenarbeit) – beides zur Bestätigung
create or replace function public.mein_arbeitsdienst_melden(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mid uuid := public._mitglied_verknuepfen(); e public.arbeitseinsaetze; st numeric := nullif(replace(p->>'stunden', ',', '.'), '')::numeric; neu uuid; tag date := coalesce(nullif(p->>'datum', '')::date, current_date);
begin
  if mid is null then raise exception 'Kein Mitglied verknüpft'; end if;
  if st is null or st <= 0 or st > 12 then raise exception 'Bitte zwischen 0,5 und 12 Stunden angeben.'; end if;
  if coalesce(p->>'code', '') <> '' then
    select a.* into e from public.arbeitseinsaetze a join public.arbeitseinsatz_codes c on c.einsatz_id = a.id where c.code = upper(btrim(p->>'code'));
    if not found then raise exception 'Der Code passt zu keinem Arbeitseinsatz.'; end if;
    if e.datum not between current_date - 1 and current_date then raise exception 'Der Check-in geht nur am Tag des Einsatzes.'; end if;
    if exists (select 1 from public.arbeitsdienst where mitglied_id = mid and einsatz_id = e.id and status <> 'abgelehnt') then raise exception 'Für diesen Einsatz bist du schon eingetragen.'; end if;
    tag := e.datum;
  elsif tag > current_date or tag < current_date - 60 then raise exception 'Bitte ein Datum aus den letzten 60 Tagen angeben.';
  end if;
  if (select count(*) from public.arbeitsdienst where mitglied_id = mid and gemeldet > now() - interval '1 day') >= 5 then raise exception 'Heute wurden schon genug Stunden gemeldet.'; end if;
  insert into public.arbeitsdienst (mitglied_id, datum, stunden, taetigkeit, status, einsatz_id, gemeldet)
  values (mid, tag, st, left(coalesce(nullif(btrim(p->>'taetigkeit'), ''), e.titel, 'Arbeitseinsatz'), 120), 'eingereicht', e.id, now())
  returning id into neu;
  return jsonb_build_object('ok', true, 'id', neu, 'einsatz', e.titel, 'datum', tag);
end $$;

-- eigener Arbeitsdienst inklusive gemeldeter (noch nicht bestätigter) Stunden
create or replace function public.mein_arbeitsdienst() returns setof public.arbeitsdienst
language sql stable security definer set search_path = public as $$
  select * from public.arbeitsdienst where mitglied_id = public._mein_mitglied() and datum >= make_date(extract(year from current_date)::int - 2, 1, 1) order by datum desc
$$;

-- 2 · Mitteilungen des Vereins (z. B. „Sturmwarnung – Boote sichern!“)
create table if not exists public.mitteilungen (
  id           uuid primary key default gen_random_uuid(),
  titel        text not null,
  text         text,
  wichtig      boolean not null default false,
  zielgruppe   text not null default 'alle' check (zielgruppe in ('alle', 'bootseigner', 'liegeplatz')),
  gueltig_bis  date,
  erstellt     timestamptz not null default now(),
  erstellt_von text,
  push_gesendet timestamptz
);
alter table public.mitteilungen enable row level security;
drop policy if exists personal on public.mitteilungen;
create policy personal on public.mitteilungen for all to authenticated using (public.ist_personal()) with check (public.ist_personal());
drop policy if exists mitglieder_lesen on public.mitteilungen;
create policy mitglieder_lesen on public.mitteilungen for select to authenticated using (public._mein_mitglied() is not null and (gueltig_bis is null or gueltig_bis >= current_date));
drop trigger if exists protokoll on public.mitteilungen;
create trigger protokoll after insert or update or delete on public.mitteilungen for each row execute function public._protokoll();

-- Kasse (iPad, ohne Login): aktuelle wichtige Mitteilungen anzeigen
create or replace function public.kasse_mitteilungen(p_token text) returns setof public.mitteilungen
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.kassen_geraete where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')) then
    raise exception 'Kasse nicht eingerichtet' using errcode = '28000';
  end if;
  return query select * from public.mitteilungen where (gueltig_bis is null or gueltig_bis >= current_date) and zielgruppe = 'alle' order by wichtig desc, erstellt desc limit 3;
end $$;

-- 3 · Push-Benachrichtigungen (freiwillig, je Gerät). Versand über die Edge Function „push“.
create table if not exists public.push_abos (
  id          uuid primary key default gen_random_uuid(),
  mitglied_id uuid not null references public.mitglieder (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  geraet      text,
  erstellt    timestamptz not null default now()
);
alter table public.push_abos enable row level security;
drop policy if exists selbst on public.push_abos;
create policy selbst on public.push_abos for all to authenticated using (mitglied_id = public._mein_mitglied()) with check (mitglied_id = public._mein_mitglied());
-- Schlüsselpaar für Web-Push: legt die Edge Function beim ersten Aufruf selbst an; niemand außer ihr liest es
create table if not exists public.push_schluessel (
  id         int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  erstellt   timestamptz not null default now()
);
alter table public.push_schluessel enable row level security;
revoke all on public.push_schluessel from anon, authenticated;

revoke execute on function public.mein_arbeitsdienst_melden(jsonb) from public, anon;
grant execute on function public.mein_arbeitsdienst_melden(jsonb), public.mein_arbeitsdienst() to authenticated;
revoke execute on function public.kasse_mitteilungen(text) from public;
grant execute on function public.kasse_mitteilungen(text) to anon, authenticated;

-- ============================================================================
-- Nachtrag 7 (Gastlieger ohne Warten, sofort bezahlen) – identisch mit supabase/nachtrag-07.sql
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

-- ============================================================================
-- Nachtrag 8 (Arbeitsbereiche mit Aufgaben und Mitgliedern) – identisch mit supabase/nachtrag-08.sql
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

-- ============================================================================
-- Nachtrag 9 (Toilettencode für Gastlieger, Zahlstand) – identisch mit supabase/nachtrag-09.sql
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

-- ================================================================ Nachtrag 10 · keine doppelten Rechnungen --
-- Je Mitglied, Saison und Art (Beitrag / Sommer / Winter) darf es nur EINE gültige Rechnung geben.
-- Stornierte Rechnungen zählen nicht – nach einem Storno kann neu abgerechnet werden.
-- Klicken zwei Personen gleichzeitig auf „Rechnungen erstellen“, lehnt die Datenbank die zweite
-- Rechnung ab; der Hafen-Manager meldet das und lädt den aktuellen Stand neu.
-- (Gäbe es schon doppelte Rechnungen, bricht der Befehl mit einer Meldung ab – dann erst eine stornieren.)
create unique index if not exists hafen_rechnungen_einmal
  on public.hafen_rechnungen (mitglied_id, saison, periode)
  where storniert_am is null;

-- ================================================================ Nachtrag 11 · Lagerplätze Nordlager --
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

-- ================================================================ Nachtrag 12 · 54 Liegeplätze laut Verein --
-- Vorhanden sind (Angabe des Vereins, Nov. 2026, geprüft am amtlichen Luftbild vom 13.06.2025):
--   Ostbrücke 1–16 · Westbrücke 25–56 (bis zum T-Stück) · Schwimmbrücke 71–76 · längsseits L1, L2
-- Die übrigen Nummern aus der Gebührenordnung 2024 (17–24, 57–70, 77–79) werden NICHT gelöscht,
-- sondern als „nicht vorhanden“ markiert und gesperrt. Der Hafen-Manager blendet sie aus; wer sie
-- später wieder braucht, setzt vorhanden = true und gesperrt = false.
alter table public.liegeplaetze add column if not exists vorhanden boolean not null default true;

update public.liegeplaetze l
   set vorhanden = false,
       gesperrt = true,
       notiz = 'Nicht vorhanden (Luftbild 2025, Angabe Verein Nov. 2026)'
 where l.vorhanden
   and l.nr ~ '^[0-9]+$'
   and (l.nr::int between 17 and 24 or l.nr::int between 57 and 70 or l.nr::int between 77 and 79)
   and not exists (select 1 from public.belegungen b where b.platz_id = l.id)
   and not exists (select 1 from public.gaeste g where g.platz_id = l.id and g.status <> 'storniert');

-- ================================================================ Nachtrag 13 · Veranstaltungen mit Zu-/Absage --
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

-- ================================================================ Nachtrag 14 · Veranstaltungen abrechnen --
-- 1 · Neue Rechnungsart „veranstaltung“ (z. B. Wintertreffen: 2 Personen × 22 €)
alter table public.hafen_rechnungen drop constraint if exists hafen_rechnungen_periode_check;
alter table public.hafen_rechnungen add constraint hafen_rechnungen_periode_check
  check (periode in ('sommer', 'winter', 'beitrag', 'veranstaltung'));

-- 2 · Bezug zur Veranstaltung (bleibt als Text in den Positionen erhalten, auch wenn die Veranstaltung gelöscht wird)
alter table public.hafen_rechnungen add column if not exists veranstaltung_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'hafen_rechnungen_veranstaltung_fk') then
    alter table public.hafen_rechnungen add constraint hafen_rechnungen_veranstaltung_fk
      foreign key (veranstaltung_id) references public.veranstaltungen (id) on delete set null;
  end if;
end $$;

-- 3 · Schutz gegen doppelte Rechnungen:
--     Hafen/Beitrag wie bisher je Mitglied, Saison und Art; Veranstaltungen je Mitglied und Veranstaltung
drop index if exists public.hafen_rechnungen_einmal;
create unique index hafen_rechnungen_einmal
  on public.hafen_rechnungen (mitglied_id, saison, periode)
  where storniert_am is null and periode <> 'veranstaltung';
create unique index if not exists hafen_rechnungen_veranstaltung_einmal
  on public.hafen_rechnungen (mitglied_id, veranstaltung_id)
  where storniert_am is null and veranstaltung_id is not null;

-- ================================================================ Nachtrag 15 · Rechnungen per E-Mail (Versandprotokoll) --
create table if not exists public.rechnung_versand (
  id             uuid primary key default gen_random_uuid(),
  art            text not null check (art in ('hafen', 'getraenke')),   -- hafen = Hafen, Beitrag, Veranstaltung · getraenke = Getränkekasse
  rechnung_id    uuid not null,
  rechnung_nr    text not null,
  mitglied_id    uuid not null references public.mitglieder (id) on delete cascade,
  email          text not null,                                         -- die Adresse, an die tatsächlich gesendet wurde
  status         text not null check (status in ('gesendet', 'fehler')),
  fehler         text,
  anbieter_id    text,                                                  -- Nachrichten-ID des Mail-Dienstes
  gesendet       timestamptz not null default now(),
  ausgeloest_von uuid,
  ausgeloest_name text
);
create index if not exists rechnung_versand_rechnung on public.rechnung_versand (art, rechnung_id);
create index if not exists rechnung_versand_mitglied on public.rechnung_versand (mitglied_id);

alter table public.rechnung_versand enable row level security;
-- Lesen: Vorstand und Kassenwart. Schreiben: niemand außer der Edge Function (Service-Rolle umgeht RLS).
drop policy if exists finanz_lesen on public.rechnung_versand;
create policy finanz_lesen on public.rechnung_versand for select to authenticated using (public.is_admin());
revoke all on public.rechnung_versand from anon, authenticated;
grant select on public.rechnung_versand to authenticated;

-- ================================================================ Nachtrag 16 · Veranstaltungen am Getränke-iPad --
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
