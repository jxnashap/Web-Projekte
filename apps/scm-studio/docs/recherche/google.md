# Google Kalender

Recherche für SCM Studio, Stand 26.10.2026 (Websuche + npm-Registry, je Thema ein Rechercheur). Aussagen mit Sicherheit "mittel" vor dem Livegang an der Quelle prüfen.

## Zusammenfassung

Wie SCM Studio an Google Kalender angebunden wird (Stand 26.10.2026). Empfohlen sind drei Stufen.

Stufe 0, lokale Vorschau: Die App liefert einen eigenen, per Token geschützten iCal-Abo-Feed (.ics) aus. Das braucht kein OAuth und keine Prüfung durch Google, funktioniert aber nur in eine Richtung (App -> Kalender).

Stufe 1: Ein OAuth-2.0-Web-Client, der mit dem Paket @googleapis/calendar 20.1.0 und google-auth-library 11.3.1 arbeitet (beide Node >= 22). Er nutzt access_type=offline und prompt=consent. Die Scopes sind minimal gehalten:
- calendar.app.created: Die App legt einen eigenen Sekundärkalender "SCM Drehs" an und hat nur darauf Schreibrechte.
- calendar.freebusy (optional): Damit prüft die App Terminkonflikte in den privaten Kalendern, ohne Termininhalte zu lesen.
Den vollen Scope calendar.events braucht es nur für eine Zwei-Wege-Synchronisation der Hauptkalender.

Stufe 2, auf Vercel: Die Synchronisation läuft inkrementell über syncToken. Ein 410-Fehler löst einen kompletten Neuabgleich aus. Dazu kommen Push-Kanäle über events.watch (Standard-TTL 7 Tage, keine automatische Verlängerung). Ein täglicher Cron erneuert sie, und der Webhook prüft den Header X-Goog-Channel-Token.

Größtes Hindernis ist der Zustimmungsbildschirm. Bei einer externen App im Status "Testing" laufen die Refresh Tokens nach 7 Tagen ab, das ist für den Dauerbetrieb untauglich. Bei nur 2 Nutzern gibt es zwei Auswege:
- Die App auf "In production" stellen, ohne Verifizierung. Dann erscheint ein Warnhinweis und es gilt eine Grenze von 100 Nutzern, die Tokens sind aber dauerhaft.
- Bei Google Workspace die Zielgruppe "Internal" wählen. Dann entfallen Verifizierung und Token-Ablauf.

Die Kontingente (600 Anfragen pro Minute und Nutzer, 10.000 pro Minute und Projekt) sind für SCM unkritisch. Für den Datenschutz gelten die Google API Services User Data Policy und Limited Use: so wenig Scopes wie möglich, eine Datenschutzerklärung, verschlüsselt gespeicherte Tokens, ein Widerruf beim Trennen und keine Weitergabe der Kalenderdaten zu fremden Zwecken.

## Einzelergebnisse

### 1. OAuth 2.0 Web-Server-Flow: Ein Refresh Token gibt es nur mit access_type=offline. prompt=consent erzwingt den Zustimmungsdialog erneut, und nur dann liefert Google den Refresh Token zuverlässig noch einmal. include_granted_scopes=true aktiviert die schrittweise Autorisierung.

Sicherheit: hoch

Ablauf in Next.js 16 mit Route Handlern:
(1) GET /api/google/connect: einen zufälligen state erzeugen, als httpOnly-Cookie setzen (in Next 16 ist cookies() async), dann redirect(client.generateAuthUrl({access_type:'offline', prompt:'consent', include_granted_scopes:true, scope:SCOPES, state})).
(2) GET /api/google/callback: state mit dem Cookie vergleichen, dann const {tokens} = await client.getToken(code). tokens.refresh_token mit AES-256-GCM verschlüsselt speichern. Der Schlüssel liegt in der Umgebungsvariable TOKEN_ENC_KEY.
(3) Bei jedem Aufruf: client.setCredentials({refresh_token}). Die Bibliothek erneuert den Access Token selbst, client.on('tokens', ...) fängt neue Tokens ab.
Der Client wird so angelegt: import {auth, calendar} from '@googleapis/calendar'; const client = new auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI); const cal = calendar({version:'v3', auth: client}).
In der Cloud Console als autorisierte Redirect-URIs eintragen: http://localhost:3000/api/google/callback (lokal) und https://<domain>/api/google/callback.
Beim Trennen den Token über https://oauth2.googleapis.com/revoke widerrufen und ihn danach löschen.
OAuth-Clients, die nach 2019 angelegt wurden, haben granulare Berechtigungen immer aktiv. Die Nutzer können dann einzelne Scopes abwählen, deshalb im Callback tokens.scope prüfen.

Quellen:

- https://developers.google.com/identity/protocols/oauth2/web-server („access_type · Recommended. Indicates whether your application can refresh access tokens when the user is not present at the browser. Valid parameter values are online, which is the default value, and offline. … refresh_token: This field is only present if the access_type parameter was set to offline in the authentication request.“)
- https://developers.google.com/identity/protocols/oauth2/resources/granular-permissions („include_granted_scopes: true, // Set to true to enable more granular permissions for Google OAuth 2.0 client IDs created before 2019. No effect for newer Google OAuth 2.0 client IDs, since more granular permissions is always enabled for them.“)

### 2. Minimale Scopes: events.insert, patch und delete akzeptieren calendar, calendar.events, calendar.events.owned und calendar.app.created. calendars.insert (Sekundärkalender anlegen) akzeptiert calendar.app.created. Für freebusy.query genügt calendar.freebusy oder calendar.events.freebusy.

Sicherheit: hoch

Geprüft an den Typdefinitionen von @googleapis/calendar 20.1.0 (build/v3.d.ts, Scope-Angaben je Methode) und an der Events-Referenz.

Empfohlene Scope-Sets:
(A) Minimal, empfohlen: https://www.googleapis.com/auth/calendar.app.created plus optional https://www.googleapis.com/auth/calendar.freebusy plus openid und email. Die App legt den Kalender "SCM Drehs" an, schreibt Drehs, Abgaben und Calls nur dort hinein und liest die Hauptkalender nur als frei/belegt.
(B) Zwei-Wege-Sync der persönlichen Hauptkalender: https://www.googleapis.com/auth/calendar.events plus calendar.calendarlist.readonly für die Kalenderauswahl.
(C) Der volle Scope https://www.googleapis.com/auth/calendar ist nicht nötig. Der Leitfaden "Create events" empfiehlt ihn zwar, die Methodenreferenz verlangt ihn aber nicht.

Im Code sieht Variante A so aus: const SCOPES = ['openid','email','https://www.googleapis.com/auth/calendar.app.created','https://www.googleapis.com/auth/calendar.freebusy'];

Quellen:

- https://developers.google.com/workspace/calendar/api/auth („calendar.events: See and edit events on all your calendars … calendar.events.owned: See, create, change, and delete events on Google calendars you own … calendar.app.created: Make secondary Google calendars, and see, create, change, and delete events on them“)
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert („Authorization: This request requires authorization with at least one of the following scopes: calendar, calendar.events, calendar.app.created, calendar.events.owned“)
- https://registry.npmjs.org/@googleapis/calendar („@googleapis/calendar@20.1.0 build/v3.d.ts: freebusy.query scopes = calendar, calendar.events.freebusy, calendar.freebusy, calendar.readonly, calendar.settings(.readonly); calendars.insert scopes = calendar, calendar.app.created, calendar.calendars“)

### 3. Sensible Scopes müssen von Google verifiziert werden, eingeschränkte (restricted) Scopes zusätzlich durch eine jährliche Sicherheitsprüfung. Die Kalender-Scopes calendar und calendar.events gelten nach bisherigem Stand als sensibel, aber nicht als eingeschränkt. Die genaue Einstufung je Scope zeigt die Cloud Console im Scope-Picker unter Datenzugriff.

Sicherheit: mittel

Ein Leitfaden des Drittanbieters Nylas behauptet, der volle calendar-Scope sei eingeschränkt. Das widerspricht der Google-Systematik, nach der vor allem Gmail und Drive eingeschränkt sind. Vor dem Livegang die Einstufung im Scope-Picker unter Google Auth Platform > Datenzugriff prüfen.
Eine Sicherheitsprüfung durch einen Gutachter (CASA) ist nur bei eingeschränkten Scopes Pflicht.
Ob calendar.app.created als nicht sensibel eingestuft ist, ließ sich nicht belegen.

Quellen:

- https://developers.google.com/workspace/guides/configure-oauth-consent („Non-sensitive scopes: Grant access only to limited data that's immediately relevant to a specific action. Sensitive scopes: Grant access to personal user data, resources, or actions. Restricted scopes: Grant access to highly-sensitive or extensive user data or actions.“)
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification („Apps accessing restricted data from or through a third-party server must undergo an annual security assessment by a Google-approved third party.“)
- https://developer.nylas.com/docs/v3/calendar/scopes/ („(Drittquelle, widersprüchlich) bezeichnet den vollen calendar-Scope als restricted“)

### 4. Bei einer externen App im Status "Testing" gilt eine Obergrenze von 100 Testnutzern, und Refresh Tokens laufen nach 7 Tagen ab. Ausgenommen sind nur reine Profil-Scopes (openid, email, profile). Im Status "In production" laufen Tokens nur ab, wenn sie widerrufen oder rund 6 Monate nicht genutzt werden.

Sicherheit: hoch

Folge für SCM: Bleibt die App im Testmodus, müssen Oskar und Yannick ihr Google-Konto jede Woche neu verbinden. Das ist für Dauerbetrieb und Webhook-Sync untauglich.
Die Einstellungen liegen inzwischen in der Cloud Console unter Google Auth Platform: Branding, Zielgruppe (Audience), Datenzugriff, Clients.
Die App sollte den Fehler invalid_grant beim Token-Refresh erkennen und dann im UI einen Hinweis "Google neu verbinden" anzeigen.

Quellen:

- https://developers.google.com/identity/protocols/oauth2 („A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of 'Testing' is issued a refresh token expiring in 7 days, unless the only OAuth scopes requested are a subset of name, email address, and user profile.“)
- https://support.google.com/cloud/answer/15549945?hl=en („Manage App Audience: Testing status is limited to 100 test users listed on the consent screen.“)

### 5. Für nur zwei Nutzer gibt es zwei praktikable Wege ohne Verifizierung durch Google. (1) Die Zielgruppe "Internal", sofern SCM Google Workspace oder Cloud Identity nutzt: Dann gibt es keine Testnutzer-Grenze und keinen Token-Ablauf nach 7 Tagen. (2) Eine externe App auf "In production" stellen, ohne Verifizierung: Dann sehen die Nutzer den Hinweis "Google hat diese App nicht überprüft", es gilt eine Grenze von 100 Nutzern, aber die Refresh Tokens sind dauerhaft.

Sicherheit: mittel

Zusätzlich kann ein Workspace-Administrator die App als vertrauenswürdig (Trusted) markieren. Sie wird dann für die Organisation wie eine interne App behandelt.
Eine Verifizierung mit Datenschutzerklärung, Domain-Nachweis, Demo-Video und mehreren Wochen Prüfzeit lohnt sich erst, wenn später ein Kundenportal Kalender-Scopes für externe Nutzer anfragt.
Der Weg über ein privates Gmail-Konto mit einer unverifizierten Produktions-App ist für den internen Einsatz akzeptabel. Er ist aber eine Ausnahme und kein Freibrief, die Policies gelten trotzdem.

Quellen:

- https://support.google.com/cloud/answer/7454865?hl=en („Unverified apps: for apps requesting sensitive or restricted scopes an unverified app screen is shown and a 100-user cap applies until the app is verified (Ausnahmen u. a. für persönliche Nutzung und Nutzung nur innerhalb der eigenen Workspace-Organisation).“)
- https://support.google.com/cloud/answer/15549945?hl=en („If a Google Workspace administrator marks an app as Trusted, it is treated as internal for that organization (überschreibt 100-Testnutzer-Grenze und 7-Tage-Ablauf).“)
- https://developers.google.com/workspace/guides/configure-oauth-consent („If you plan for your app to only target users of a Google Workspace or Cloud Identity organization and always use domain-wide installation, then your app won't require brand verification. However, if your app utilizes restricted or sensitive scopes, app verification is required.“)

### 6. Termine verwalten (REST-Endpunkte unter https://www.googleapis.com/calendar/v3):
- Anlegen: POST /calendars/{calendarId}/events
- Ändern: PATCH /calendars/{calendarId}/events/{eventId}
- Löschen: DELETE /calendars/{calendarId}/events/{eventId}
- Sekundärkalender anlegen: POST /calendars
Die Termin-ID kann der Client selbst vergeben (base32hex a-v und 0-9, 5 bis 1024 Zeichen). Das macht das Anlegen idempotent. Unter extendedProperties.private lassen sich App-Verweise am Termin speichern.

Sicherheit: hoch

Mapping: Die Termin-ID aus der App-UUID ableiten, z. B. 'scm' + uuid ohne Bindestriche, in Kleinbuchstaben. Eine UUID in Hex enthält nur 0-9 und a-f und ist damit gültiges base32hex. So erzeugt ein wiederholter Insert nach einem Timeout keinen doppelten Termin, sondern einen 409-Konflikt.
Dazu extendedProperties: {private: {scmType: 'dreh', scmId: '<uuid>', kundeId: '<uuid>'}}.
Felder: summary, description (Drehplan-Link), location, start/end {dateTime, timeZone:'Europe/Berlin'} oder {date} für ganztägige Termine, colorId, reminders, attendees.
sendUpdates ('all' | 'externalOnly' | 'none') steuert Einladungsmails an Kunden. Standardmäßig 'none' verwenden, um keine ungewollten Mails auszulösen.
Für Meet-Links conferenceData.createRequest setzen und conferenceDataVersion=1 übergeben. Google rät, für jeden Termin eine eigene Konferenz zu erzeugen.
Nur Termine vom Typ default lassen sich verschieben (move). Termine der Typen birthday, focusTime, outOfOffice und workingLocation beim Import filtern (Parameter eventTypes).

Quellen:

- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert („Provided IDs must follow these rules: characters allowed in the ID are those used in base32hex encoding, i.e. lowercase letters a-v and digits 0-9 … the length of the ID must be between 5 and 1024 characters … If you do not specify an ID, it will be automatically generated by the server.“)
- https://registry.npmjs.org/@googleapis/calendar („v3.d.ts (20.1.0): extendedProperties?: { private?: {[key: string]: string}; shared?: {[key: string]: string} } … To persist your changes, remember to set the conferenceDataVersion request parameter to 1 for all event modification requests.“)
- https://developers.google.com/workspace/calendar/api/guides/create-events („Create events guide (Calendar API v3)“)

### 7. Inkrementelle Synchronisation: Die erste vollständige Abfrage über events.list liefert auf der letzten Seite einen nextSyncToken. Spätere Abfragen mit diesem syncToken liefern nur noch Änderungen, gelöschte Termine immer mit (status 'cancelled'). Ist der Token ungültig, antwortet die API mit 410 Gone, dann den lokalen Bestand verwerfen und neu synchronisieren. Mit syncToken nicht kombinierbar sind iCalUID, orderBy, privateExtendedProperty, q, sharedExtendedProperty, timeMin, timeMax und updatedMin.

Sicherheit: hoch

Code-Muster:
async function sync(calId, token?) {
  let pageToken, next;
  try {
    do {
      const r = await cal.events.list({calendarId: calId, syncToken: token, pageToken, singleEvents: true, maxResults: 250, ...(token ? {} : {timeMin: isoMinus90Tage})});
      for (const ev of r.data.items ?? []) ev.status === 'cancelled' ? removeLocal(ev.id) : upsertLocal(ev);
      pageToken = r.data.nextPageToken ?? undefined;
      next = r.data.nextSyncToken;
    } while (pageToken);
    await saveSyncToken(calId, next);
  } catch (e) {
    if (e.code === 410) { await wipeLocal(calId); return sync(calId); }
    throw e;
  }
}

Wichtig: singleEvents und alle übrigen Parameter müssen beim inkrementellen Sync dieselben sein wie beim Voll-Sync.
DB-Felder je Kalender: calendar_id, sync_token, last_synced_at.
Lokal ohne Cloud: Sync beim Öffnen der Kalenderansicht und über einen Button "Jetzt abgleichen".

Quellen:

- https://developers.google.com/workspace/calendar/api/guides/sync („Sometimes sync tokens are invalidated by the server, for various reasons including token expiration or changes in related ACLs. In such cases, the server will respond to an incremental request with a response code 410. This should trigger a full wipe of the client's store and a new full sync.“)
- https://developers.google.com/workspace/calendar/api/v3/reference/events/list („syncToken: … There are several query parameters that cannot be specified together with nextSyncToken to ensure consistency of the client state. These are: iCalUID, orderBy, privateExtendedProperty, q, sharedExtendedProperty, timeMin, timeMax, updatedMin. All other query parameters should be the same as for the initial synchronization to avoid undefined behavior. … Deletions since the previous list request will always be in the result set and it is not allowed to set showDeleted to False.“)
- https://developers.google.com/workspace/calendar/api/guides/errors („410: Gone … fullSyncRequired / updatedMinTooLongAgo … Suggested action: Wipe the store and re-sync.“)

### 8. Push-Benachrichtigungen: Ein Kanal wird mit POST /calendars/{calendarId}/events/watch angelegt, Body {id: UUID, type: 'web_hook', address: HTTPS-URL, token, params: {ttl}}. Die Standard-TTL beträgt 604800 s (7 Tage). Google verlängert Kanäle nicht automatisch, sie müssen vor Ablauf durch einen neuen Kanal mit neuer id ersetzt werden. Gestoppt wird ein Kanal mit POST /calendar/v3/channels/stop {id, resourceId}.

Sicherheit: hoch

Die Benachrichtigungen enthalten keinen Termininhalt, nur Header:
- X-Goog-Channel-ID
- X-Goog-Channel-Token (der eigene token, zur Prüfung der Herkunft)
- X-Goog-Resource-State: sync, exists oder not_exists
- X-Goog-Resource-ID
- X-Goog-Message-Number
- X-Goog-Channel-Expiration

Webhook als Route Handler app/api/google/calendar/webhook/route.ts:
1. Kanal anhand der Kanal-ID in der DB laden.
2. Den Token mit crypto.timingSafeEqual vergleichen. Stimmt er nicht, mit 404 antworten.
3. Bei Status 'sync' sofort 200 zurückgeben.
4. Sonst mit after(() => sync(calId)) aus next/server sofort 200 zurückgeben und erst danach den inkrementellen Sync ausführen.

Als Token pro Kanal 32 zufällige Bytes erzeugen. DB-Felder: channel_id, resource_id, channel_token, expiration.

Verlängerung: ein Vercel-Cron einmal täglich. Er legt für Kanäle, die in weniger als 48 h ablaufen, einen neuen Kanal an und stoppt den alten erst danach, damit sich alter und neuer Kanal kurz überlappen.

Die Adresse muss öffentlich per HTTPS mit gültigem Zertifikat erreichbar sein. Lokal geht das nicht ohne Tunnel, deshalb in der lokalen Phase nur Polling verwenden.

Quellen:

- https://developers.google.com/workspace/calendar/api/guides/push („Currently, there's no automatic way to renew a notification channel. When a channel is close to its expiration, you must replace it with a new one by calling the watch method. … X-Goog-Channel-Token: Notification channel token that was set by your application, and that you can use to verify the notification source. Only present if defined. … X-Goog-Resource-State: Possible values: sync, exists, or not_exists.“)
- https://developers.google.com/workspace/calendar/api/v3/reference/events/watch („params.ttl: The time-to-live in seconds for the notification channel. Default is 604800 seconds.“)

### 9. Kontingente: Standardmäßig sind 10.000 Anfragen pro Minute und Projekt sowie 600 pro Minute, Nutzer und Projekt erlaubt, gemessen im gleitenden Fenster. Bei Überschreitung antwortet die API mit 403 (userRateLimitExceeded oder rateLimitExceeded) oder mit 429. Dann mit exponentiellem Backoff und Zufallsanteil erneut versuchen, höchstens 32 bis 64 s warten.

Sicherheit: hoch

Für 2 Nutzer unkritisch. Trotzdem gilt:
- Den Voll-Sync auf ein Zeitfenster begrenzen (z. B. die letzten 90 Tage).
- Wiederholte Webhooks entprellen, etwa nur einen Sync pro Kalender alle 10 s.
- Backoff: wait = min(2^n * 1000 + random(0..1000) ms, 32000).
Der Fehler 403 quotaExceeded ist ein Missbrauchsschutz und kein einfaches Ratenlimit.

Quellen:

- https://developers.google.com/workspace/calendar/api/guides/quota („Per minute per project: 10,000 requests; Per minute per user per project: 600 requests. … Quotas are calculated per minute using a sliding window.“)
- https://developers.google.com/workspace/calendar/api/guides/errors („rateLimitExceeded errors can return either 403 or 429 error codes—currently they are functionally similar and should be responded to in the same way, by using exponential backoff.“)

### 10. Paketwahl laut npm-Registry am 26.10.2026:
- @googleapis/calendar 20.1.0: einzelnes API-Paket, entpackt ca. 0,84 MB, Node >= 22, exportiert calendar(), auth (AuthPlus mit auth.OAuth2) und calendar_v3-Typen.
- googleapis 188.0.0: alle Google-APIs, entpackt ca. 246 MB.
Beide hängen über googleapis-common ^9 an google-auth-library ^11 (aktuell 11.3.1). Empfehlung: @googleapis/calendar.

Sicherheit: hoch

Installieren mit: npm i @googleapis/calendar@20.1.0 google-auth-library@11.3.1

Begründung: Das Paket ist etwa 300-mal kleiner als googleapis. Das hält das Bundle der Vercel-Function klein und den Kaltstart schnell. Die Typen sind vollständig, und die Bibliothek erneuert Tokens selbst.

Die Bibliothek nur in Server-Code verwenden: Route Handler, Server Actions oder Dateien mit import 'server-only'. Laufzeit Node.js, nicht Edge.

Alternative: reines fetch gegen die REST-Endpunkte. Das ist möglich, dann müssen Token-Refresh, Backoff und Typen aber selbst gebaut werden. Lohnt sich nicht.

Veraltet: Die Suchergebnisse zeigten noch die Versionen 9.8.0 (npmjs-Seite) und 14.2.0 (jsDelivr). Die Registry nennt 20.1.0 mit Änderung am 03.10.2026.

Quellen:

- https://registry.npmjs.org/@googleapis/calendar („npm view: version = '20.1.0', time.modified = '2026-10-03', dependencies = { 'googleapis-common': '^9.0.0' }, engines = { node: '>=22.0.0' }, dist.unpackedSize = 843799; index.d.ts: export declare function calendar(version: 'v3'): calendar_v3.Calendar; declare const auth: AuthPlus;“)
- https://registry.npmjs.org/googleapis („npm view: version = '188.0.0', time.modified = '2026-10-22', dependencies = { 'googleapis-common': '^9.0.0', 'google-auth-library': '^11.0.0' }, dist.unpackedSize = 246491624“)
- https://registry.npmjs.org/google-auth-library („npm view: version = '11.3.1', engines = { node: '>=22' }“)
- https://googleapis.dev/nodejs/googleapis/latest/Calendar.html („const {google} = require('googleapis'); const calendar = google.calendar('v3');“)

### 11. Alternative ohne OAuth: SCM Studio liefert einen iCal-Abo-Feed (text/calendar) unter einer geheimen URL aus, die in Google Kalender über "Per URL hinzufügen" abonniert wird. Er funktioniert nur in eine Richtung (App -> Kalender), braucht weder Scopes noch eine Prüfung durch Google. Aktuelles Paket: ical-generator 11.1.2.

Sicherheit: mittel

Route Handler app/api/kalender/[token]/route.ts:
1. Den Token mit dem Hash in der DB vergleichen.
2. const cal = ical({name: 'SCM Drehs', timezone: 'Europe/Berlin'}); und je Termin cal.createEvent({id, start, end, summary, location, description}).
3. return new Response(cal.toString(), {headers: {'Content-Type': 'text/calendar; charset=utf-8'}}).

Vorteile: Der Feed funktioniert sofort, lokal sogar ohne Google-Konto (Datei-Export). Pro Gründer kann es einen eigenen, jederzeit widerrufbaren Token geben.

Nachteile: Google ruft per URL abonnierte Kalender nach eigenem, nicht dokumentiertem Takt ab (erfahrungsgemäß mehrere Stunden, unbelegt). Belegte Zeiten aus den Google-Kalendern kommen nicht in die App zurück.

Geeignet als Stufe 0 oder als Rückfallebene.

Quellen:

- https://registry.npmjs.org/ical-generator („npm view: version = '11.1.2', time.modified = '2026-10-21', engines = { node: '22 || >=24.0.0' }“)

### 12. Datenschutz nach der Google API Services User Data Policy und den Limited-Use-Regeln: Es dürfen nur die Scopes angefragt werden, die eine Funktion wirklich braucht. Die Daten dürfen nur für sichtbare Funktionen der App genutzt werden, nicht verkauft und nicht für Werbung verwendet werden. Weitergabe ist nur in engen Ausnahmen erlaubt. Eine Datenschutzerklärung muss Zugriff, Nutzung, Speicherung und Weitergabe beschreiben.

Sicherheit: hoch

Umsetzung in SCM Studio:
- Refresh Tokens verschlüsselt speichern (AES-GCM, Schlüssel nur im Server-Env), nie an den Client senden und nicht loggen.
- Kalendertermine lokal nur so weit spiegeln, wie die App sie anzeigt. Bei Nutzung von calendar.freebusy werden nur Zeitblöcke gespeichert, keine Inhalte.
- Ein Button "Google trennen" widerruft den Token, löscht die gespiegelten Termine und stoppt die Push-Kanäle.
- Kalenderdaten nicht an OpenAI weitergeben, etwa für die Skript-Erstellung. Die Policy verbietet die Nutzung von Workspace-API-Daten zum Training allgemeiner KI-Modelle. Das genaue Wortlaut im aktuellen Policy-Text prüfen.
- Supabase in der EU (Frankfurt) und Vercel in die DSGVO-Dokumentation aufnehmen (Auftragsverarbeitung).
- Kunden als Teilnehmer (attendees) eintragen nur mit Rechtsgrundlage, Einladungsmails nur bewusst über sendUpdates auslösen.

Quellen:

- https://developers.google.com/terms/api-services-user-data-policy („Limit your use of data to providing or improving user-facing features that are prominent in the requesting application's user interface … All other transfers, uses, or sales of user data are prohibited, including: Transferring or selling user data to third parties like advertising platforms, data brokers, or any information resellers.“)
- https://developers.google.com/identity/protocols/oauth2/policies („You must request scopes that require the least amount of access to user data necessary to provide that functionality.“)
- https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance („The privacy policy must comply with the Google API Services User Data Policy and the Limited Use requirements … describe how the app accesses, uses, stores, or shares user data.“)
