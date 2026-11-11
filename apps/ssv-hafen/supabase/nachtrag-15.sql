-- ============================================================================
-- Nachtrag 15 · Rechnungen per E-Mail: Versandprotokoll
-- Für die bereits eingerichtete Datenbank: im Supabase SQL Editor einmal ausführen
-- (nach nachtrag-01 bis -14). In ssv-komplett.sql bereits enthalten. Darf mehrfach laufen.
--
-- Versendet wird ausschließlich über die Edge Function „rechnung-mail“: Sie liest die Empfängeradresse
-- selbst aus mitglieder.email des Mitglieds, dem die Rechnung gehört – aus dem Browser kommt nie eine Adresse.
-- Jeder Versand (auch Fehler) wird hier protokolliert; schreiben kann nur die Funktion (Service-Rolle).
-- ============================================================================

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
