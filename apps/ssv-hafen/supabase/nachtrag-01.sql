-- Nachtrag 1 (für die bereits eingerichtete Datenbank): im Supabase SQL Editor einmal ausführen.
alter function public._berlin_tag(timestamptz) set search_path = public;
alter function public._pin_ok(text) set search_path = public;
alter function public._iban_ok(text) set search_path = public;
alter function public._inhalt_gestempelt() set search_path = public;
drop policy if exists mitglieder_lesen on public.einstellungen;
create policy mitglieder_lesen on public.einstellungen for select to authenticated using (true);
drop policy if exists mitglieder_lesen on public.hafen_einstellungen;
create policy mitglieder_lesen on public.hafen_einstellungen for select to authenticated using (true);
drop policy if exists mitglieder_lesen on public.gebuehren;
create policy mitglieder_lesen on public.gebuehren for select to authenticated using (true);
-- Vorstand speichert Entscheidungen über Anträge (Speichern nutzt „einfügen oder aktualisieren“)
drop policy if exists entscheiden on public.antraege;
create policy entscheiden on public.antraege for all to authenticated using (public.hat_rolle('vorstand')) with check (public.hat_rolle('vorstand'));
