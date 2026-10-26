# Instagram- und TikTok-Zahlen

Recherche für SCM Studio, Stand 26.10.2026 (Websuche + npm-Registry, je Thema ein Rechercheur). Aussagen mit Sicherheit "mittel" vor dem Livegang an der Quelle prüfen.

## Zusammenfassung

Realistisch für SCM Studio (Stand 26.10.2026) ist ein Ausbau in drei Stufen.

Stufe 1, ab sofort: Zahlen manuell erfassen. Die Felder heißen schon so wie in den APIs (views, reach, likes, comments, saved, shares, total_interactions, avg_watch_time_ms).

Stufe 2, Instagram: über die "Instagram API with Instagram Login" (Host graph.instagram.com). Dafür braucht es keine Facebook-Seite, nur ein Profikonto (Business oder Creator). Die Berechtigungen sind instagram_business_basic und instagram_business_manage_insights. Laufen nur Kundenkonten, die als Rolle (Instagram Tester) in der App eingetragen sind, reicht Standard Access. Dann entfallen App Review und Business Verification. Für fremde Konten ohne Rolle, etwa ein späteres Kundenportal, braucht es Advanced Access mit App Review und Business Verification.

Bei den Kennzahlen hat Meta im April 2025 plays, impressions, clips_replays_count und ig_reels_aggregated_all_plays_count für Media Insights abgeschafft. Seitdem ist "views" die Leitkennzahl. Für Reels verfügbar sind views, reach, likes, comments, saved, shares, total_interactions, ig_reels_avg_watch_time und ig_reels_video_view_total_time. views und ig_reels_video_view_total_time sind teils noch als "in development" markiert. Langlebige Tokens gelten 60 Tage und müssen per Cron erneuert werden (ig_refresh_token, frühestens nach 24 h). Das Limit liegt bei 4800 × Impressionen pro 24 h und App-Nutzer-Paar, für eine kleine Agentur also unkritisch.

Stufe 3, TikTok: Die Display API (Login Kit plus Scopes user.info.basic, user.info.stats, video.list) liefert pro öffentlichem Video nur view_count, like_count, comment_count und share_count. Reichweite und Wiedergabezeit fehlen. Jeder Scope über user.info.basic hinaus braucht ein App Review mit Demo-Video, laut FAQ mehrere Tage bis zwei Wochen, ohne Garantie. Tiefere organische Insights (reach, average watch time, completion) gibt es nur über die TikTok API for Business (/business/video/list/, v1.3) mit 24 bis 48 h Verzögerung. Das ist eher etwas für später.

Datenschutz: Jeder Kunde autorisiert selbst per OAuth. Tokens werden verschlüsselt in Supabase EU gespeichert. Mit Kunden, Supabase und Vercel wird ein AVV geschlossen, und Datenschutzerklärung, Nutzungsbedingungen und Löschpfad sind als URLs für Meta und TikTok hinterlegt.

Hinweis: WebFetch war nicht verfügbar. Die Zitate sind Auszüge aus Suchergebnissen der offiziellen Dokumentation und sollten vor der Umsetzung auf den verlinkten Seiten gegengeprüft werden. Verbraucht wurden 12 Suchen.

## Einzelergebnisse

### 1. Für SCM ist die Variante "Instagram API with Instagram Login" die richtige. Sie braucht keine Facebook-Seite, nutzt Instagram-User-Tokens und den Host graph.instagram.com. Media Insights sind enthalten, Ads, Tagging und Hashtag-Suche nicht.

Sicherheit: hoch

Die Variante "Instagram API with Facebook Login" braucht ein mit einer Facebook-Seite verknüpftes Instagram-Konto, Facebook-User-Tokens und graph.facebook.com. Sie bietet zusätzlich Hashtag-Suche, Business Discovery und Ads- bzw. Boost-Felder. Für reine Video-Zahlen kleiner Betriebe, die oft keine gepflegte FB-Seite haben, ist die Instagram-Login-Variante einfacher.

Quellen:

- https://developers.facebook.com/docs/instagram-platform/overview/ („Instagram login uses Instagram User access tokens and Business Login for Instagram; Facebook login uses Facebook User access tokens and Facebook Login for Business. (Vergleichstabelle: Facebook Page required nur beim Facebook-Login-Pfad)“)
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/ („Comment moderation, content publishing, media insights, mentions, and messaging; this API setup cannot access ads or tagging.“)
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login („Getting and publishing media, managing comments, identifying @mentions, finding hashtagged media, and getting basic metadata about other Instagram Businesses and Creators.“)

### 2. Beide Instagram-APIs funktionieren nur mit Profikonten (Business oder Creator). Private Konten werden nicht unterstützt. Die alte Basic Display API wurde Ende 2024 eingestellt.

Sicherheit: mittel

Kunden müssen ihr Instagram-Konto in den Einstellungen kostenlos auf "Professionell" umstellen. Insights gibt es nur für Medien, die nach der Umstellung veröffentlicht wurden. Das Ende der Basic Display API (04.12.2024) stammt aus Vorwissen und wurde in diesem Lauf nicht neu per Suche belegt.

Quellen:

- https://developers.facebook.com/docs/instagram-platform/overview/ („Die Doku behandelt ausschließlich professional (business or creator) accounts.“)
- https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api/ („(Vorwissen, nicht per Suche verifiziert) Ankündigung des End-of-Life der Instagram Basic Display API zum 4. Dezember 2024.“)

### 3. Für Insights mit Instagram Login braucht es die Berechtigungen instagram_business_basic und instagram_business_manage_insights. Die alten Scope-Namen (business_basic usw.) sind ersetzt.

Sicherheit: hoch

Mehr ist nicht nötig, solange nichts veröffentlicht und nicht auf Kommentare oder Nachrichten zugegriffen wird. Weniger Scopes vereinfachen ein späteres App Review. Die Authorize-URL lautet https://www.instagram.com/oauth/authorize?client_id=…&redirect_uri=…&response_type=code&scope=instagram_business_basic,instagram_business_manage_insights&state=…

Quellen:

- https://developers.facebook.com/documentation/instagram-platform/insights („instagram_business_basic instagram_business_manage_insights (benötigte Permissions für Insights mit Instagram Login)“)
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login („These will replace the existing business_basic, business_content_publish, business_manage_comments and business_manage_messages scope values.“)

### 4. Der Token-Lebenszyklus bei Instagram Login: Der Code gilt 1 h und nur einmal. Daraus wird ein kurzlebiger Token, der serverseitig per ig_exchange_token gegen einen langlebigen Token (60 Tage) getauscht wird. Der Refresh läuft per GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token, frühestens nach 24 h und nur vor Ablauf.

Sicherheit: hoch

Wird ein Token 60 Tage nicht erneuert, verfällt er endgültig und der Kunde muss sich neu einloggen. Der Tausch braucht das App-Secret, gehört also in einen Next.js Route Handler oder eine Server Action, nie in den Client. Empfohlen ist ein täglicher Cron (Vercel Cron), der alle Tokens erneuert, die älter als 24 h sind und in weniger als 30 Tagen ablaufen. Endpunkte: POST https://api.instagram.com/oauth/access_token (code → short-lived), GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=…&access_token=… (→ long-lived, expires_in ca. 5184000 s).

Quellen:

- https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/ („grant_type=ig_refresh_token … token must be at least 24 hours old … not expired … Tokens that have not been refreshed in 60 days will expire and can no longer be refreshed.“)
- https://developers.facebook.com/docs/instagram-platform/reference/access_token/ („ig_exchange_token … The long-lived token is valid for 60 days. (Austausch serverseitig, benötigt App-Secret)“)
- https://developers.facebook.com/documentation/instagram-platform/reference/oauth-authorize („This code is valid for 1 hour and can only be used once.“)

### 5. Standard Access (Default) reicht für Konten, die man selbst besitzt oder verwaltet und die im App Dashboard eingetragen sind (App-Rollen). Advanced Access, also Zugriff auf fremde Konten ohne Rolle, verlangt App Review und Business Verification.

Sicherheit: hoch

Das ist der Schlüssel für eine kleine Agentur. Die Instagram-Konten der Kunden werden im App Dashboard als Instagram Tester eingeladen, der Kunde bestätigt die Einladung in der Instagram-App unter Einstellungen, Website-Berechtigungen, Tester-Einladungen. Dann läuft die App im Standard Access ohne Review. Nachteil: Jeder neue Kunde braucht diesen manuellen Schritt. Ob es eine Obergrenze für Rollen oder Tester gibt, wurde nicht geprüft. Für ein späteres Self-Service-Kundenportal ist Advanced Access nötig. Die Business Verification läuft dann über den rechtlichen Anbieter (Blacksnapper Consulting) mit Firmendokumenten.

Quellen:

- https://developers.facebook.com/documentation/instagram-platform/insights („Advanced Access if your app serves accounts you don't own or manage; Standard Access if it serves accounts you own or manage and have added in the App Dashboard.“)
- https://developers.facebook.com/documentation/development/permissions („Business Verification is mandatory for Advanced Access apps used by people who lack a role on the app or in a business that claimed it.“)

### 6. Seit 21.04.2025 sind in Media Insights für alle API-Versionen abgeschafft: plays, impressions, clips_replays_count und ig_reels_aggregated_all_plays_count. Neue Leitkennzahl ist views, eingeführt mit Graph API v22.0 im Januar 2025.

Sicherheit: hoch

impressions entfällt laut Meta für Medien, die ab 02.07.2024 erstellt wurden. In der App diese Kennzahlen nicht mehr verwenden, auch nicht als Spaltennamen. Im Datenmodell ist views die primäre KPI.

Quellen:

- https://developers.facebook.com/docs/graph-api/changelog/version22.0/ („views … new media and user insights metric … deprecates clips_replays_count, ig_reels_aggregated_all_plays_count, impressions, and plays on media insights … applying to all versions April 21, 2025.“)
- https://developers.facebook.com/blog/post/2025/01/21/making-it-easier-to-build-integrations-across-the-instagram-api-and-marketing-api/ („In August 2024, Instagram introduced Views as the primary consumption metric … impressions metric will only be deprecated for media created on or after July 2, 2024.“)

### 7. Aktuelle Reels-Metriken für GET /{media-id}/insights sind views, reach, likes, comments, saved, shares, total_interactions, ig_reels_avg_watch_time (nur REELS) und ig_reels_video_view_total_time.

Sicherheit: hoch

views und ig_reels_video_view_total_time tragen in der Referenz den Hinweis "in development", die Definition kann sich also noch ändern. reach ist geschätzt. Die Watch-Time-Werte kommen nach bisherigem Stand in Millisekunden (vor Umsetzung prüfen). Beispiel: GET https://graph.instagram.com/v25.0/{media-id}/insights?metric=views,reach,likes,comments,saved,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time&access_token=… Die Antwort kommt als data[] mit name, period (lifetime) und values[0].value.

Quellen:

- https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights („views: total number of times IG Media has been played (metric in development) … reach: number of unique Instagram users that have seen the reel at least once (estimated) … ig_reels_avg_watch_time: average time spent playing the reel (REELS) … ig_reels_video_view_total_time (metric in development) … saved, shares (FEED, REELS)“)

### 8. Meta hat mit Graph API v25.0 (Februar 2026) angekündigt, die alten Konzepte "impression" und "reach" zugunsten von "Media Views" und "Media Viewers" auszumustern. Die Ankündigung bezieht sich auf Page-Metriken, eine Übertragung auf Instagram reach ist möglich.

Sicherheit: mittel

Das Datenmodell sollte flexibel bleiben: Metriken als Schlüssel-Wert-Paare (metric_key, value) speichern statt als feste Spalten oder zusätzlich als JSONB. Die API-Version als Konstante führen (z. B. IG_API_VERSION=v25.0) und bei Umsetzung prüfen, ob es bereits v26 oder neuer gibt.

Quellen:

- https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25/ („retire the legacy impression and reach concepts … developers should migrate to the new Media Views and Media Viewers metrics.“)

### 9. Medien eines Kunden holt man per GET graph.instagram.com/{version}/me/media (oder /{ig-user-id}/media) mit fields, die Zahlen pro Medium per /{media-id}/insights.

Sicherheit: mittel

Empfohlene Felder: id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url,like_count,comments_count. Über media_product_type=REELS werden die Reels gefiltert. Paginierung läuft über paging.cursors.after. like_count und comments_count kommen direkt am Medium, alles andere über insights. Die Feldliste stammt aus Vorwissen und ist in der IG-Media-Referenz zu prüfen.

Quellen:

- https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/ („IG Media Referenz (Felder wie media_type, media_product_type, permalink, timestamp, like_count, comments_count; Edge /insights)“)

### 10. Rate Limit bei Instagram (außer Messaging): Pro App-und-Nutzer-Paar sind 4800 × Impressionen des Kontos in einem rollierenden 24-h-Fenster erlaubt. Die Auslastung steht im Header X-Business-Use-Case.

Sicherheit: hoch

Business Discovery und Hashtag Search laufen unter dem Platform Rate Limit. Für 10 bis 50 Kundenkonten mit täglichem Sync (Medienliste plus Insights für Posts der letzten 30 Tage) ist das unkritisch. call_count im Header loggen und bei über 80 % drosseln.

Quellen:

- https://developers.facebook.com/docs/graph-api/overview/rate-limiting/ („Calls within 24 hours = 4800 * Number of Impressions … Number of Impressions is the number of times any content from the app user's Instagram professional account has entered a person's screen within the last 24 hours.“)
- https://developers.facebook.com/docs/instagram-platform/overview/ („All endpoints are subject to Instagram Business Use Case rate limiting except for Business Discovery and Hashtag Search endpoints, which are subject to Platform Rate limiting.“)

### 11. TikTok Display API (v2): Mit GET https://open.tiktokapis.com/v2/user/info/ und POST https://open.tiktokapis.com/v2/video/list/ (Scope video.list) gibt es pro öffentlichem Video view_count, like_count, comment_count und share_count.

Sicherheit: hoch

Bei video.list ist max_count standardmäßig 10, höchstens 20. Paginiert wird über cursor (ms-Timestamp) und has_more, sortiert nach create_time absteigend. Für bekannte IDs gibt es POST /v2/video/query/ mit filters.video_ids. Felder werden als Query-Parameter angegeben, z. B. fields=id,title,create_time,cover_image_url,share_url,duration,view_count,like_count,comment_count,share_count. Über user/info mit user.info.stats kommen follower_count, likes_count und video_count. Saves, Reichweite und Wiedergabezeit liefert die Display API nicht. Die v1-Endpunkte sind veraltet.

Quellen:

- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-list („POST https://open.tiktokapis.com/v2/video/list/ … video.list … max_count default 10, maximum 20 … sorted by create_time in descending order … cursor“)
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object („like_count int32 … view_count int64 … comment_count … share_count“)
- https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info („GET https://open.tiktokapis.com/v2/user/info/ … follower_count … likes_count … video_count (user.info.stats)“)
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-query („/v2/video/query/ … verifies that the videos belong to the user … like_count, comment_count, share_count, view_count“)

### 12. Für TikTok-Tokens gilt: Access Token 24 h (expires_in 86400), Refresh Token 365 Tage (refresh_expires_in 31536000). Der Refresh läuft per POST https://open.tiktokapis.com/v2/oauth/token/ mit grant_type=refresh_token. Der Refresh Token kann dabei rotieren.

Sicherheit: hoch

TikTok empfiehlt, 10 bis 30 Minuten vor Ablauf zu erneuern. Gibt die Antwort einen neuen refresh_token zurück, muss der alte ersetzt werden. Neuer Login ist nur bei ungültigem Refresh Token nötig. Authorize-URL: https://www.tiktok.com/v2/auth/authorize/?client_key=…&scope=user.info.basic,user.info.stats,video.list&response_type=code&redirect_uri=…&state=…

Quellen:

- https://developers.tiktok.com/docs/en/oauth-user-access-token-management („expires_in: 86400 … refresh_expires_in: 31536000 … grant_type=refresh_token“)

### 13. TikTok Rate Limits: 600 Anfragen pro Endpunkt in einem gleitenden 1-Minuten-Fenster. Bei Überschreitung kommen HTTP 429 und rate_limit_exceeded zurück.

Sicherheit: hoch

Für /v2/user/info/ ist das ausdrücklich belegt, für /v2/video/list/ ist 600 als Default genannt. Für eine Agentur unkritisch.

Quellen:

- https://developers.tiktok.com/docs/en/tiktok-api-v2-rate-limit („Request rate calculation is based on a one minute sliding window … HTTP status 429 and error code rate_limit_exceeded … /v2/user/info/ 600 … /v2/video/list/ 600“)

### 14. Bei TikTok braucht jeder Scope über user.info.basic hinaus (user.info.stats, video.list) eine Freigabe im App Review. Nicht freigegebene Apps zeigen die Integration in der Sandbox. Ein Review dauert laut FAQ mehrere Tage bis zwei Wochen, ohne Garantie. Die Business Verification dauert 1 bis 3 Werktage.

Sicherheit: hoch

Im Review-Video muss jeder gewählte Scope sichtbar sein. Unnötige Scopes vorher entfernen, sonst verzögert sich das Review. Bis zur Freigabe gibt es keinen produktiven API-Zugriff. Eine Ablehnung wird mit Begründung auf der Login-Kit-Seite angezeigt, danach kann man erneut einreichen. Ob in der Sandbox echte Kundenkonten als Testnutzer laufen können, und wie viele, wurde nicht verifiziert.

Quellen:

- https://developers.tiktok.com/docs/en/app-review-guidelines („must demonstrate the integration in a sandbox environment … every selected scope must be clearly shown in the review video … remove unneeded scopes“)
- https://developers.tiktok.com/docs/en/getting-started-faq („app review may take several days to two weeks after submission“)
- https://developers.tiktok.com/docs/en/our-guidelines-developer-guidelines („does not provide an official review timeline or any guarantees for approval … review is a manual process and response times may vary“)
- https://developers.tiktok.com/docs/en/verify-your-business („TikTok will review your verification request within 1-3 business days“)
- https://developers.tiktok.com/bulletin/user-info-scope-migration („user.info.stats … follower count, following count, likes, video count … apps need to add the new scope and re-authorize users“)

### 15. Tiefe organische TikTok-Insights (Reichweite, durchschnittliche Wiedergabezeit u. a.) gibt es nur über die TikTok API for Business: GET /business/video/list/ in v1.3 für die öffentlichen Posts eines autorisierten TikTok-Kontos.

Sicherheit: mittel

Die Daten haben 24 bis 48 h Verzögerung (UTC). Bei Videos, die länger als 7 Tage inaktiv waren, können reach und watch time leer sein. Profil-Metriken reichen 60 Tage zurück. Profilaufrufe gibt es nur mit Advanced Access oder als Verified Business Account. Erteilte Scopes lassen sich per /tt_user/token_info/get/ prüfen, fehlende muss der Kontoinhaber neu autorisieren. Video Views enthalten organisch und bezahlt zusammen. Eine eigene Developer-App auf business-api.tiktok.com ist nötig, Freigabeaufwand und Dauer sind nicht belegt.

Quellen:

- https://business-api.tiktok.com/portal/docs/get-post-data-of-a-tiktok-account/v1.3 („Use this endpoint to get reach and engagement data for all the public video, photo, or text posts of a TikTok account … average watch time … reach“)
- https://business-api.tiktok.com/portal/docs/accounts-insights-data-latency/v1.3 („metrics update on a 24–48 hour delay (UTC) … if a video has been inactive for more than 7 days … retry after 24 ~ 48h“)

### 16. Ob und wie Agenturen Kundenkonten auswerten dürfen, steht weder bei Meta noch bei TikTok ausdrücklich. Das technisch und rechtlich saubere Muster ist: Jeder Kunde autorisiert die App selbst per OAuth, die App nutzt den Token nur für Auswertungen im Auftrag dieses Kunden.

Sicherheit: niedrig

Für Meta deckt Standard Access die verwalteten Konten mit Rolle ab, für fremde Konten gilt Advanced Access mit Review. Bei TikTok muss jeder Kunde per Login Kit selbst zustimmen. Logins und Passwörter von Kunden nie speichern, nur OAuth-Tokens. Dieser Punkt ist eine Ableitung und keine wörtliche Policy-Aussage.

Quellen:

- https://developers.facebook.com/documentation/instagram-platform/insights („Advanced Access if your app serves accounts you don't own or manage“)
- https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info („requires the relevant scopes to be authorized by the TikTok user through the authorization flow“)

### 17. Datenschutz: Verarbeitet SCM Kontodaten im Auftrag der Kunden, ist ein AVV nach Art. 28 DSGVO angebracht. Auch Supabase und Vercel brauchen einen DPA.

Sicherheit: mittel

Insights-Zahlen sind meist aggregiert. Kontoname, Profil und Tokens von Einzelunternehmern sind aber personenbezogen bzw. Zugangsdaten. Maßnahmen: AVV-Klausel in den Dienstleistungsvertrag. Supabase in der EU (Frankfurt), Vercel-Funktionen in der Region fra1. Tokens verschlüsselt speichern (Supabase Vault oder AES-256-GCM mit Schlüssel in einer Env-Variablen), RLS nur für das Team. Nur minimale Scopes. Bei Vertragsende oder Widerruf Tokens und Rohdaten löschen. Meta (App-Einstellungen) und TikTok verlangen für den Livebetrieb URLs für Datenschutzerklärung und Nutzungsbedingungen, Meta zusätzlich eine Data-Deletion-URL bzw. einen Callback (aus Vorwissen, im Dashboard prüfen).

Quellen:

- https://eur-lex.europa.eu/eli/reg/2016/679/oj („Art. 28 DSGVO, Auftragsverarbeiter (Vertrag zwischen Verantwortlichem und Auftragsverarbeiter)“)
