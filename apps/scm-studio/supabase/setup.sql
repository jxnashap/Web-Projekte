-- SCM Studio · einmalige Einrichtung im NEUEN Supabase-Projekt (nicht MyImmo!).
-- Reihenfolge: 1) npm run db:migrate (legt Schema "studio", Tabellen, RLS und GoBD-Trigger an)
--              2) dieses Skript im SQL-Editor des Supabase-Dashboards ausführen.

-- 1) Das Schema "studio" ist für die öffentliche Data API (anon/authenticated) tabu.
--    Die App verbindet sich serverseitig als Datenbank-Eigentümer über DATABASE_URL.
revoke all on schema studio from anon, authenticated;
revoke all on all tables in schema studio from anon, authenticated;
revoke all on all sequences in schema studio from anon, authenticated;
revoke all on all functions in schema studio from anon, authenticated;
alter default privileges in schema studio revoke all on tables from anon, authenticated;
alter default privileges in schema studio revoke all on sequences from anon, authenticated;
alter default privileges in schema studio revoke all on functions from anon, authenticated;

-- 2) Privater Speicher für Belege, Rechnungen und Dokumente (Zugriff nur serverseitig mit dem Secret Key).
--    Keine Storage-Policies für anon/authenticated anlegen. 50 MB je Datei (Grenze von Supabase Free) für das Material;
--    Belege prüft die App selbst auf 10 MB. Uploads gehen nur über signierte Links, die der Server ausstellt.
insert into storage.buckets (id, name, public, file_size_limit)
values ('studio', 'studio', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- 3) Kontrolle: RLS ist auf allen Tabellen aktiv (Ergebnis sollte leer sein)
select tablename from pg_tables where schemaname = 'studio' and rowsecurity = false;
