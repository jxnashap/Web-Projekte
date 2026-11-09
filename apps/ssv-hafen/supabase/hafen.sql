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
create policy entscheiden on public.antraege for update to authenticated using (public.hat_rolle('vorstand')) with check (public.hat_rolle('vorstand'));

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
