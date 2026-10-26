# SCM Studio

Das interne Programm von SCM Creatives: Anfragen, Kunden, Produktion, KI-Skripte, Kalender, Video-Zahlen,
Finanzen (E-Rechnung, Belege, DATEV-Export) und Dokumente (Vertrag, Einwilligung, Drehplan, Monatsbericht).

- Plan, Architektur, UX: [`PLAN.md`](PLAN.md)
- Recherche mit Quellen: [`docs/recherche/`](docs/recherche)
- Supabase + Vercel einrichten (eigene Projekte, nicht MyImmo): [`EINRICHTUNG.md`](EINRICHTUNG.md)

## Lokal starten (Vorschau mit Demo-Daten)

```bash
npm ci
npm run seed          # legt die lokale Datenbank in .data/ an und füllt Demo-Daten
npm run dev -- -p 3100
```

Anmelden unter http://localhost:3100 mit dem Vorschau-Passwort `scm-studio` (änderbar über `STUDIO_PREVIEW_PASSWORD`).

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver (Turbopack) |
| `npm run build` / `npm start` | Produktions-Build |
| `npm run typecheck` / `npm run lint` | Prüfungen |
| `npm run seed` | Demo-Daten (nur lokal!) |
| `npm run db:generate` | Migration aus `src/db/schema.ts` erzeugen |
| `npm run db:migrate` | Migrationen auf Supabase anwenden (`MIGRATION_DATABASE_URL`) |
| `npm run bootstrap -- "Name|mail|admin"` | echte Grunddaten ohne Demo |
| `npm run qa -- http://localhost:3100 <ordner> /route …` | Screenshots Desktop + Handy, Fehler- und Überlaufprüfung |

## Technik

Next.js 16.4 (App Router, Cache Components, Server Actions, `proxy.ts`), React 19.3, Tailwind 4, Drizzle ORM
(PGlite lokal, Supabase Postgres live), Supabase Auth mit TOTP, @react-pdf/renderer + @e-invoice-eu/core (ZUGFeRD),
OpenAI Responses API, Google Calendar API, Instagram API with Instagram Login.
