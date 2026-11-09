-- ============================================================================
-- Nachtrag 3 · Verlässlicher Datenstand (Feedback-Runde)
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 und nachtrag-02). In ssv-komplett.sql bereits enthalten.
-- Darf mehrfach ausgeführt werden.
--
--  1 · Keine Doppelvergabe: ein Boot je Platz und Periode, ein Platz je Boot und Periode
--  2 · Gastlieger: Prüfung in der Datenbank (Überschneidung, Freigabe des Eigners, Maße, Tiefgang)
--  3 · Zahlungseingang getrennt von der Zahlart; Tiefgang/Wassertiefe
--  4 · Änderungsverlauf: wer hat wann was geändert
--  5 · Dokumente und Versicherungsnachweis (selbst angegeben → eingereicht → geprüft)
--  6 · Zahlungen auf Rechnungen (Teilzahlung, Rücklastschrift)
--  7 · Arbeitsdienst-Befreiung je Mitglied
--  8 · Schäden und Wartung
--  9 · Löschfristen ergänzt
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
