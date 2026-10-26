# Website-Anfragen ins SCM Studio

Das Anfrage-Quiz der Website (`webseiten/scm-creatives/api/anfrage.js`) schickt jede gültige Anfrage weiterhin per E-Mail
und **zusätzlich** an das Studio (`POST /api/anfragen/eingang`). Die Weiterleitung ist schon eingebaut und bleibt
ohne die beiden Umgebungsvariablen unten wirkungslos. Fehler beim Studio blockieren den Mailversand nie (3 Sekunden Zeitlimit).

## Einrichten

| Wo | Variable | Wert |
|---|---|---|
| Vercel-Projekt der Website | `STUDIO_LEADS_URL` | `https://<studio-domain>/api/anfragen/eingang` **[PLATZHALTER bis Domain feststeht]** |
| Vercel-Projekt der Website | `STUDIO_LEADS_SECRET` | langer Zufallswert (`openssl rand -hex 32`) |
| Vercel-Projekt des Studios | `LEADS_WEBHOOK_SECRET` | derselbe Wert |

Lokal gilt im Studio ohne Variable der Ersatzwert `scm-studio-lokal`, in Produktion ist sie Pflicht.

## Was das Studio prüft

- Header `x-studio-secret` (zeitkonstant verglichen), JSON bis 20 KB, Felder per zod.
- Gleiche Anfrage innerhalb von 10 Minuten wird zusammengefasst (Doppelklick, erneutes Absenden).
- Einstufung A/B/C genau wie in der Website-Mail (großes Paket + sofort = A).
- Drossel pro Instanz; für echten Schutz zusätzlich eine Rate-Limit-Regel in der Vercel-Firewall des Studios.

## Getestet (26.10.2026, lokal)

Website-Function mit `MAIL_TEST=1` aufgerufen → Antwort 200, die Anfrage erscheint im Studio unter Anfragen.
Webhook direkt: 201 neu, 200 doppelt, 401 falsches Geheimnis, 422 ungültig, 400 kaputtes JSON, 413 zu groß, 405 falsche Methode.
