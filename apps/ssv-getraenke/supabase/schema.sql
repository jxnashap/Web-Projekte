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
revoke execute on all functions in schema public from anon, public;
grant execute on function public.kasse_mitglieder(text), public.kasse_produkte(text),
  public.kasse_login(text, uuid, text), public.kasse_buchen(text, uuid, text, jsonb),
  public.kasse_verlauf(text, uuid, text), public.kasse_storno(text, uuid, text, uuid),
  public.kasse_optionen(text), public.kasse_pin_festlegen(text, uuid, text, text) to anon, authenticated;
grant execute on function public.mitglied_uebersicht(), public.mitglied_pin_aendern(text) to authenticated;
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
