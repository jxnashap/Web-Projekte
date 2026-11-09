-- ============================================================================
-- Nachtrag 2 · Sicherheit und Datenschutz (Gesamt-Check)
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen.
-- (In ssv-komplett.sql bereits enthalten.)
-- ============================================================================

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
