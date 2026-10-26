# Trend-Recherche und Material: Grundlagen

Stand 26.10.2026. Grundlage für die nächtliche Trend-Recherche unter „Ideen & Skripte“ und für die Material-Ablage in „Produktion“.

## Richtungsbeschreibung

Die Richtung steht in der App unter Ideen & Skripte → Richtung und Verlauf. Inhaber können sie dort ändern. Der Startwert liegt in `src/lib/skripte/richtung.ts`.

Die Richtung stützt sich nur auf belegte Angaben:

- das Briefing vom 21.10.2026,
- die Analyse der Reels von @scm.creatives (`.preview-cache/scm/recherche/briefing.md` und `instagram.md` am Repo-Root).

Kurz gefasst:

- **Wer:** eine Social-Media-Agentur aus Kiel und der Lübecker Bucht. Sie macht Kurzvideos für Betriebe aus der Region, ohne KI in den Videos.
- **Branchen:** Gastronomie, Immobilien, Handwerk und Unternehmen, offen für alle.
- **Was funktioniert:**
  - Alltags-Comedy und Sketche zum Wiedererkennen (POV, Kunden-Stereotype)
  - Entweder-oder
  - Ortsanalyse
  - Angebot mit Frist
  - Recruiting
  - Serien je Kunde
- **Gesucht:** Trends, Formate, Sounds und Hooks, die man mit einem Smartphone und 1 bis 3 Personen im Betrieb nachdrehen kann.
- **Ausgeschlossen:**
  - KI-Trends
  - riskante Challenges
  - Bloßstellen von Personen
  - Politik
  - Sounds ohne Freigabe für Unternehmenskonten
- **Suchbegriffe:** 16 Startbegriffe (allgemein, je Branche, regional). Die Recherche kombiniert sie frei.

## So läuft die Recherche

- **Zeitpunkt:** Vercel Cron ruft jede Nacht um 01:41 UTC `/api/cron/trends` auf. Inhaber können die Recherche auch von Hand starten. Beides nutzt `src/lib/skripte/trends.ts`.
- **Werkzeug:** Die Responses API von OpenAI mit dem Werkzeug `web_search`. Als Standort ist Kiel/DE eingestellt. Mit `include: web_search_call.action.sources` liefert die API alle Quellen mit, die die Suche gefunden hat.
- **Belegpflicht:** Ein Trend bleibt nur, wenn mindestens eine seiner Quellen-URLs in dieser Suche wirklich vorkam, also gefunden, geöffnet oder zitiert wurde. Ideen ohne belegten Trend werden verworfen.
- **Ergebnis:** höchstens 6 Trends und 8 Ideen je Lauf. Die Ideen landen als „Vorschlag“ unter Ideen. Vorschläge, die 14 Tage niemand ansieht, wandern unter „Verworfen“.
- **Datenschutz:** An OpenAI gehen nur Branchen und Orte der aktiven Kunden, keine Namen. Die Titel vorhandener Ideen gehen mit, damit keine Doppelungen entstehen. Die Anfrage läuft mit `store: false`.
- **Kosten:** Die Websuche wird je Aufruf abgerechnet, laut mehreren Preisübersichten mit 10 US-Dollar je 1.000 Aufrufe. Das ist vor dem Livegang auf https://developers.openai.com/api/docs/pricing zu prüfen. Dazu kommen die Tokens. Die App zählt die Suchen in `ai_runs.search_calls` und rechnet sie in „KI diesen Monat“ ein.

## Warum nicht direkt TikTok und Instagram durchsuchen

- **Instagram:** Die angebundene „Instagram API with Instagram Login“ hat keine Hashtag-Suche. Die gibt es nur über Facebook Login (`docs/recherche/social.md`, Punkt 1).
- **TikTok:** Das Creative Center zeigt Trends nach Region, Branche, Hashtag und Song. Laut Hilfeseite startet die Nutzung mit einer Anmeldung. Eine offene API dafür ist nicht belegt.
  - Quelle: https://ads.tiktok.com/help/article/how-to-use-trends
- **Scraping:** Beide Plattformen ohne Login zu scrapen, verstößt gegen die Nutzungsbedingungen und wäre unzuverlässig.

Die Websuche findet stattdessen, was öffentlich über Trends berichtet wird, zum Beispiel im TikTok Creative Center, auf Fachportalen und in Plattform-Blogs.

## Material je Kunde

- **Ablage:** Material liegt im privaten Supabase-Bucket `studio` unter `material/<Kunde>/…`. Die Ordner stehen in der Tabelle `materials`. Material ist bewusst nicht in `files`, denn `files` ist GoBD-geschützt und erlaubt nur Anfügen.
- **Hochladen:** Der Browser lädt direkt zu Supabase, über signierte Upload-Links vom Server. So greift die Grenze von Vercel nicht (4,5 MB je Anfrage). Gleichnamige Dateien im selben Ordner werden ersetzt.
- **Grenzen:**
  - Supabase Free erlaubt höchstens 50 MB je Datei und 1 GB Speicher insgesamt.
  - Pro erlaubt bis 500 GB je Datei.
  - Quelle: https://supabase.com/docs/guides/storage/uploads/file-limits
  - Für Rohmaterial hat jeder Kunde deshalb ein Feld für einen Link (Google Drive, Dropbox, WeTransfer).
- **ZIP:** Ein Ordner wird im Browser zu einem ZIP gepackt (fflate, ohne Kompression). Dafür lädt der Browser jede Datei über kurz gültige, signierte Links.
