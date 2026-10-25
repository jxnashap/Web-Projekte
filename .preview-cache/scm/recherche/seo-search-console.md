# SCM Creatives – SEO & Google Search Console für eine statische Multi-Page-Site auf Vercel

Stand: 21.10.2026 · Zielsystem: handgeschriebenes HTML/CSS/Vanilla-JS, mehrere Seiten, kein Framework/CMS, Hosting auf Vercel.

> **Platzhalter-Konvention (wie im Repo üblich):** Alles, was nicht belegt ist, steht als `[PLATZHALTER]`.
> Die Domain `scm-creatives.de` ist in allen Vorlagen ein **Platzhalter** – vor dem Einsatz durch die echte Domain ersetzen.
> **Standort:** Die Instagram-Referenzen (Cache unter `.preview-cache/scm/`) zeigen Kunden aus Kiel, Schwentinental, Kronshagen, Eckernförde und Travemünde – der Agentursitz liegt also **vermutlich** im Raum Kiel/Schleswig-Holstein. `[PLATZHALTER: Standort/Adresse bestätigen]`.
>
> **Methodik-Hinweis:** In dieser Recherche-Umgebung waren `developers.google.com`, `support.google.com`, `vercel.com`, `web.dev` und `schema.org` nicht direkt abrufbar (Proxy-Sperre). Die Belege stammen aus der Websuche über diese offiziellen Seiten (Suchindex-Auszüge) und aus der offiziellen Vercel-Dokumentationssuche (Vercel-MCP). Alle Quell-URLs stehen am Ende und an den jeweiligen Abschnitten. Wo ich etwas **ableite** statt zitiere, steht „(abgeleitet)“ oder „Einschätzung“ dabei.

---

## 0. Kurzfazit (TL;DR)

1. **Eine kanonische Host-Variante** (Empfehlung: Apex `https://scm-creatives.de`), `www` und `*.vercel.app` per **308** darauf umleiten, `cleanUrls: true` + `trailingSlash: false` → genau **eine** URL pro Seite.
2. **Selbstreferenzierender, absoluter `rel="canonical"`** auf jeder Seite, nur kanonische 200er-URLs in der `sitemap.xml`.
3. **Search Console als Domain-Property per DNS-TXT** verifizieren – **schon vor dem Livegang**. HTML-Datei-Methode mit `cleanUrls` vermeiden (308-Redirect auf die Datei).
4. **Video-SEO = Seitenstruktur:** Google zeigt Video-Ergebnisse nur für **Watch-Pages** (Video ist Hauptinhalt). → **Jeder Case bekommt eine eigene Seite mit genau einem prominenten Hauptvideo oben** + `VideoObject`; Übersichts-/Branchenseiten mit Video-Grids bekommen **kein** `VideoObject`.
5. **Videos selbst hosten** (MP4/H.264 + WebM/AV1, `faststart`), **keine Instagram-Embeds**; YouTube höchstens per Zwei-Klick-Fassade. Musikrechte der Reels prüfen.
6. **CWV mit Video-Hero:** Poster-Bild als LCP-Kandidat mit `fetchpriority="high"` vorladen, Video nie die LCP verzögern lassen, feste Seitenverhältnisse (9:16) via `width`/`height`/`aspect-ratio`, Grid-Videos nur als Poster-Bilder (lazy).
7. **Strukturierte Daten:** `WebSite` + `Organization`/`LocalBusiness` (Startseite), `Service` (Leistungs-/Branchenseiten, kein Rich Result), `BreadcrumbList` (nur Desktop-Anzeige), `VideoObject` (nur Watch-Pages). **FAQ-Rich-Results gibt es seit 7. Mai 2026 gar nicht mehr**; eigene Bewertungen (self-serving) bringen keine Sterne.
8. **Content:** 4 echte Branchen-Landingpages (Gastronomie, Immobilienmakler, Handwerk/Recruiting, Unternehmen) + Leistungsseite + Case-Watch-Pages. **Stadtseiten nur mit echter lokaler Substanz** (sonst Doorway-Risiko); lokales Ranking primär über das **Google-Unternehmensprofil**.
9. **Vercel-Plan:** Eine Agentur-Website ist kommerziell → **Pro-Plan nötig** (Hobby ist laut Vercel ausschließlich nicht-kommerziell).

---

## 1. Technisches SEO für die statische Multi-Page-Site auf Vercel

### 1.1 Vercel-Grundlagen, die SEO direkt betreffen

| Thema | Fakt (belegt) | Konsequenz für SCM |
|---|---|---|
| `cleanUrls` | `true` entfernt `.html`-Endungen und leitet Pfade mit Endung per **308** auf die endungslose URL um. | `/kontakt.html` → `/kontakt`. Interne Links **immer ohne** `.html` schreiben, sonst erzeugt jeder Klick einen Redirect. |
| `trailingSlash` | `false` leitet `/about/` per **308** auf `/about` um; `true` umgekehrt. Pfade mit Dateiendung werden ignoriert. | `false` wählen (passt zu `cleanUrls`), Canonicals/Sitemap/Links ohne Schrägstrich am Ende (außer Startseite `/`). |
| `redirects` | `permanent: true` = 308, `permanent: false` = 307, optional `statusCode` (z. B. 301). `has` mit `type: "host"` erlaubt Host-bezogene Regeln. | Für alte URLs und `vercel.app`-Host nutzen. |
| `headers` | Array aus `source` + `headers`; anders als `routes` werden **alle** passenden Header-Regeln angewendet. | Security- und Cache-Header zentral. |
| Eigene 404 | Eine `404.html` im Ausgabeverzeichnis wird als 404-Seite verwendet. | `404.html` im Root anlegen; nach Deploy mit `curl -I https://…/gibt-es-nicht` prüfen, dass **Status 404** kommt (Vercel-Doku sagt nicht explizit, mit welchem Status – also testen). |
| Preview-Deployments | Vercel setzt auf Preview-Deployments automatisch `X-Robots-Tag: noindex`; **nicht** aber, wenn einer Nicht-Produktions-Branch eine eigene Custom-Domain zugewiesen ist. Alte Produktions-Deployments bekommen nach Promotion ebenfalls `noindex`. | Keine Staging-Subdomain wie `staging.scm-creatives.de` ohne eigenes `noindex` betreiben. |
| `*.vercel.app` | Vercel empfiehlt, die Custom-Domain als bevorzugte URL zu wählen und den Produktions-`vercel.app`-Host per **hostbezogenem permanentem Redirect** umzuleiten (Pfad + Query bleiben erhalten). | Regel in `vercel.json` (siehe Vorlage). |
| Apex ↔ www | Vercel: Wenn `example.com` **und** `www.example.com` hinzugefügt werden, eine Weiterleitung von einer auf die andere in den Projekt-Einstellungen einrichten (Duplicate Content vermeiden). Redirect-Statuscodes: 301/302/307/308. | Im Dashboard: *Project → Settings → Domains* → `www.scm-creatives.de` → „Redirect to `scm-creatives.de`“ (308). |
| HSTS | Custom-Domains bekommen standardmäßig `Strict-Transport-Security: max-age=63072000` (ohne `includeSubDomains`/`preload`). | Kein eigener HSTS-Header nötig; `includeSubDomains`/`preload` nur, wenn **alle** Subdomains dauerhaft HTTPS können. |
| Caching statischer Dateien | Default-Header `cache-control: public, max-age=0, must-revalidate` (Browser revalidiert). Der Vercel-CDN cached statische Dateien pro Deployment; ein neues Deployment hat einen neuen Cache-Key. | HTML so lassen. Für CSS/JS/Fonts **versionierte Dateinamen** + `immutable`. |
| Plan | „Hobby teams are restricted to non-commercial personal use only“; kommerzielle Nutzung (u. a. Bewerben eines Produkts/einer Dienstleistung) erfordert Pro/Enterprise. | **Pro-Plan** buchen. Video-Traffic zählt in das Datentransfer-Kontingent → Inklusivvolumen/Preise in der aktuellen Preisliste prüfen. |

Quellen: Vercel vercel.json-Referenz, Redirects, Custom Domain, Encryption, Cache-Control, Preview-Indexing-KB, Duplicate-Content-KB, Fair-Use-Guidelines (Links in Abschnitt 8).

**Apex oder www?** Für Google gleichwertig – entscheidend ist **eine** Variante konsequent (Redirect + Canonical + Sitemap + interne Links + Search Console). Empfehlung: **Apex** (`scm-creatives.de`), weil kürzer und auf Visitenkarten/Instagram-Bio üblich. Bei externem DNS-Anbieter zeigt Vercel im Dashboard die exakten Records (Apex: A-Record; historisch `76.76.21.21`; `www`: CNAME) – **die im Dashboard angezeigten Werte verwenden**, da Vercel projektspezifische Werte ausgeben kann.

### 1.2 URL-Schema (Vorschlag)

Google empfiehlt sprechende Wörter in der Sprache der Zielgruppe, Bindestriche statt Unterstriche, einheitliche Kleinschreibung; Umlaute entweder prozentkodiert oder transliteriert ([URL-Struktur](https://developers.google.com/search/docs/crawling-indexing/url-structure)). → **transliterieren** (`ae/oe/ue/ss`), alles klein.

```
/                                   Startseite (Positionierung + Region)
/leistungen                         Leistungsübersicht (Skript → Dreh → Schnitt → Posting)
/branchen/gastronomie               Branchen-Landingpage
/branchen/immobilienmakler          Branchen-Landingpage
/branchen/handwerk                  Branchen-Landingpage (inkl. Recruiting-Videos)
/branchen/unternehmen               Branchen-Landingpage (Employer Branding, B2B)
/cases                              Case-Übersicht (Grid, Filter per JS auf EINER URL)
/cases/<kunde-thema>                Case = Watch-Page (1 Hauptvideo + Story)
/ueber-uns                          Team, Gesichter, Werdegang (E-E-A-T)
/ablauf                             Prozess, Dauer, Preisrahmen (optional /preise)
/kontakt
/danke                              nach Formular – noindex, nicht in Sitemap
/impressum  /datenschutz
/404.html
```

Filter auf `/cases` **nicht** als eigene URLs (`/cases?branche=…`) indexieren lassen – Filter rein clientseitig oder mit Sprungmarken.

### 1.3 Canonicals

- Google behandelt Canonicals als **Hinweis**, nicht als Befehl. Stärkste Signale: **Redirects** > `rel="canonical"` > Aufnahme in die Sitemap (schwach). Mehrere kombinieren erhöht die Trefferquote ([Canonical angeben](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)).
- **Absolute URLs** verwenden (Schema + Domain), nicht relativ.
- **Kein** `robots.txt` und **kein** `noindex` zur Kanonisierung einsetzen.
- Umsetzung bei SCM: Jede Seite trägt einen **selbstreferenzierenden** Canonical, z. B. auf `/branchen/gastronomie`:
  `<link rel="canonical" href="https://scm-creatives.de/branchen/gastronomie">`
  Startseite: `https://scm-creatives.de/` (mit Slash – die Root-URL hat immer einen).
- UTM-Links (z. B. aus dem Google-Unternehmensprofil) werden durch den Canonical sauber konsolidiert.
- Vercel warnt explizit: **nicht** alle Seiten auf die Startseite kanonisieren.

### 1.4 Title & Meta-Description

- Google: **keine feste Längengrenze** für `<title>` und Meta-Description; beides wird bei Bedarf **nach Gerätebreite gekürzt**. `<title>` wird in > 80 % der Fälle als Titellink verwendet ([Title-Links](https://developers.google.com/search/docs/appearance/title-link), [Snippets](https://developers.google.com/search/docs/appearance/snippet)).
- **Praxiswerte (Einschätzung, keine Google-Vorgabe):** Title ≈ 50–60 Zeichen, wichtigste Begriffe vorn, Marke hinten; Description ≈ 120–155 Zeichen mit Nutzen + Call-to-Action.
- Jede Seite: **einzigartiger** Title + Description. Beispiele:

| Seite | Title | Meta-Description |
|---|---|---|
| Start | `Social-Media-Videos & Reels aus Kiel \| SCM Creatives` `[Stadt PLATZHALTER]` | `Skriptbasierte Kurzvideos für Gastronomie, Makler, Handwerk & Unternehmen – echte Menschen, echte Geschichten. Jetzt Erstgespräch anfragen.` |
| Gastronomie | `Reels & Kurzvideos für Restaurants \| SCM Creatives` | `Mehr Gäste über Instagram & TikTok: Wir schreiben, drehen und schneiden Reels für Restaurants, Cafés und Bars. Beispiele ansehen.` |
| Makler | `Social-Media-Videos für Immobilienmakler \| SCM Creatives` | `Objektvideos, Makler-Reels und Personal Branding – skriptbasiert produziert für Instagram, TikTok & YouTube Shorts.` |
| Handwerk | `Social Recruiting & Reels für Handwerksbetriebe \| SCM Creatives` | `Azubis und Fachkräfte über Social Media gewinnen: authentische Kurzvideos aus Ihrem Betrieb. Cases & Ablauf ansehen.` |
| Case | `[Kunde]: Reel-Kampagne für [Ziel] \| SCM Creatives` | `So haben wir für [Kunde] … – Video, Skript-Idee und Ergebnis.` |

### 1.5 Open Graph, Twitter/X-Cards, Favicon, Manifest

- **OG/Twitter** beeinflussen nicht das Google-Ranking, aber das Aussehen beim Teilen (WhatsApp, LinkedIn, Facebook, iMessage) – für eine Social-Agentur Pflicht. OG-Bild 1200×630 px (Meta-Empfehlung, Praxiswert), pro Branche/Case eigenes Bild.
- **Favicon für Google:** quadratisch (1:1), mind. 8×8 px, Google empfiehlt **> 48×48 px**; `rel="icon"` im `<head>` der **Startseite**; Datei und Startseite müssen crawlbar sein; ein Favicon pro Hostname. Unterstützte Formate laut Google-Doku: BMP, GIF, ICO, PNG, JPEG, PPM, TIFF ([Favicon](https://developers.google.com/search/docs/appearance/favicon-in-search)). → **PNG/ICO für Google** angeben, SVG zusätzlich für Browser.
- **Manifest** ist für eine Website optional (Icons/Theme-Farbe), schadet nicht.

**`<head>`-Vorlage (Branchenseite):**

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reels &amp; Kurzvideos für Restaurants | SCM Creatives</title>
  <meta name="description" content="Mehr Gäste über Instagram &amp; TikTok: Wir schreiben, drehen und schneiden Reels für Restaurants, Cafés und Bars. Beispiele ansehen.">
  <link rel="canonical" href="https://scm-creatives.de/branchen/gastronomie">

  <!-- Open Graph / Social -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="SCM Creatives">
  <meta property="og:title" content="Reels &amp; Kurzvideos für Restaurants">
  <meta property="og:description" content="Skriptbasierte Kurzvideos für Gastronomie – echte Menschen, echte Geschichten.">
  <meta property="og:url" content="https://scm-creatives.de/branchen/gastronomie">
  <meta property="og:image" content="https://scm-creatives.de/assets/og/gastronomie-1200x630.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Koch vor der Kamera beim Reel-Dreh in einem Restaurant">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Icons -->
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png"><!-- 180×180 -->
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#[PLATZHALTER]">

  <!-- Performance: nur die 1–2 wirklich kritischen Ressourcen vorladen -->
  <link rel="preload" href="/assets/fonts/[schrift]-latin-var.v1.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/main.v1.css">
  <script src="/assets/js/main.v1.js" defer></script>

  <!-- Strukturierte Daten: siehe Abschnitt 3 -->
  <script type="application/ld+json">{ … }</script>
</head>
```

`site.webmanifest`:

```json
{
  "name": "SCM Creatives",
  "short_name": "SCM",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#000000",
  "background_color": "#000000",
  "display": "browser"
}
```

### 1.6 `vercel.json` – fertige Vorlage

Annahmen: Apex ist kanonisch; Vercel-Projektname `scm-creatives` (→ `scm-creatives.vercel.app`); CSS/JS/Fonts liegen unter `/assets/` **mit Versionsnummer im Dateinamen** (`main.v3.css`); Videos/Poster unter `/media/`. `www → Apex` zusätzlich im Dashboard als Domain-Redirect einrichten (die Regel unten ist ein Sicherheitsnetz). JSON erlaubt keine Kommentare – Erläuterungen stehen darunter.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "trailingSlash": false,
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "scm-creatives\\.vercel\\.app" }],
      "destination": "https://scm-creatives.de/:path*",
      "permanent": true
    },
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "www\\.scm-creatives\\.de" }],
      "destination": "https://scm-creatives.de/:path*",
      "permanent": true
    },
    { "source": "/referenzen", "destination": "/cases", "permanent": true },
    { "source": "/portfolio/:slug", "destination": "/cases/:slug", "permanent": true }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/media/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000, stale-while-revalidate=86400" }]
    },
    {
      "source": "/(favicon.ico|favicon-96.png|favicon.svg|apple-touch-icon.png|site.webmanifest)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400" }]
    },
    {
      "source": "/danke",
      "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }]
    }
  ]
}
```

Erläuterungen:
- **Redirect-Regeln 1+2:** Hostbezogene 308-Redirects (Muster aus der Vercel-Doku „Redirects“). Regel 2 greift nur, falls `www` dem Projekt **ohne** Dashboard-Redirect zugeordnet ist. **Nicht** auf den Preview-Host matchen (die Regex trifft nur genau `scm-creatives.vercel.app`).
- **Regeln 3+4:** Beispiele für Alt-URLs einer Vorgängerseite `[PLATZHALTER: gab es eine alte Website? Dann vollständige Redirect-Map erstellen]`.
- **CSP:** strikt, setzt voraus: kein Inline-JavaScript, keine Fremd-Hosts. `<script type="application/ld+json">` wird nicht ausgeführt und ist davon nicht betroffen. Wenn Videos auf einem externen CDN liegen → Host bei `media-src` **und** `img-src` (Poster) ergänzen; bei Formular-Dienst → `form-action`/`connect-src` ergänzen; bei YouTube-Fassade → `frame-src https://www.youtube-nocookie.com`. Vercel Web Analytics/Speed Insights laufen über denselben Origin (`/_vercel/...`) – das Inline-Snippet aus der Vercel-Doku in eine eigene `.js`-Datei auslagern. **Erst auf einem Preview-Deployment testen** (Konsole auf CSP-Fehler prüfen).
- **`/assets/` immutable:** nur korrekt, wenn Dateinamen bei jeder Änderung neu versioniert werden (`main.v4.css`). Sonst `max-age=604800` verwenden.
- **`/media/` 30 Tage:** Poster/Videos ändern sich selten; bei Änderung neuen Dateinamen vergeben.
- **HTML** bekommt keinen eigenen Cache-Header → Vercel-Default (`max-age=0, must-revalidate`) ist für HTML richtig.
- **`/danke`:** zusätzlich `<meta name="robots" content="noindex">` im HTML; **nicht** per robots.txt sperren (sonst sieht Google das `noindex` nicht).

### 1.7 `robots.txt` – Vorlage

Fakten: robots.txt steuert **Crawling**, nicht Indexierung – sie ist „kein Mechanismus, um eine Seite aus Google herauszuhalten“; `noindex` in robots.txt wird nicht unterstützt; CSS/JS/Bilder nicht sperren, wenn Google die Seite sonst schlechter versteht ([robots.txt-Einführung](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)).

```text
# robots.txt – https://scm-creatives.de
# Alles crawlbar lassen – auch /assets/ und /media/ (Google braucht CSS/JS,
# Poster-Bilder und Videodateien für Rendering und Video-Indexierung).
User-agent: *
Allow: /

# Optional – bewusste Geschäftsentscheidung, KEIN Einfluss auf das Google-Ranking:
# Google-Extended steuert die Nutzung für Gemini-Training/Grounding außerhalb der Suche.
# Für maximale Sichtbarkeit in KI-Antworten NICHT sperren.
# User-agent: Google-Extended
# Disallow: /

Sitemap: https://scm-creatives.de/sitemap.xml
```

**Achtung Staging:** Niemals ein `Disallow: /` aus der Entwicklungsphase mit live nehmen (Klassiker). Preview-Deployments sind durch Vercels `X-Robots-Tag: noindex` bereits geschützt.

### 1.8 `sitemap.xml` (inkl. lastmod-Praxis und optionaler Video-Erweiterung)

Fakten:
- Google **ignoriert** `<priority>` und `<changefreq>`; `<lastmod>` wird genutzt, **wenn es konsistent und überprüfbar korrekt** ist ([Sitemap erstellen](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)).
- `lastmod` = letzte **wesentliche** Änderung (Haupttext, strukturierte Daten, Links) – nicht Footer-Kleinkram ([Blog 06/2023](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)). Der Sitemap-Ping-Endpunkt wurde abgeschaltet → Sitemap in Search Console einreichen + in robots.txt referenzieren.
- Eine Sitemap garantiert keine Indexierung; nur **bevorzugte (kanonische) URLs** aufnehmen.
- Video-Sitemap: `video:thumbnail_loc`, `video:title`, `video:description` (≤ 2048 Zeichen) sind Pflicht; zusätzlich **entweder** `video:content_loc` (bevorzugt) **oder** `video:player_loc`; die Video-URL darf nicht gleich der Seiten-`<loc>` sein ([Video-Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps)).

Praxis für eine handgeschriebene Site:
- `lastmod` **manuell** pflegen (Datum `YYYY-MM-DD` reicht) oder per kleinem Node-Skript aus dem Git-Commit-Datum der jeweiligen HTML-Datei erzeugen. **Nicht** bei jedem Deploy alle Daten auf „heute“ setzen – dann ist `lastmod` nicht mehr glaubwürdig.
- Nicht aufnehmen: `/danke`, `404`, Redirect-Quellen, Seiten mit `noindex`. Impressum/Datenschutz dürfen indexierbar bleiben; Aufnahme in die Sitemap ist optional.
- Video-Infos **entweder** in der Sitemap **oder** per `VideoObject` (oder beides, dann identisch, gleiche Thumbnail-URL). Empfehlung: `VideoObject` auf der Watch-Page (Pflicht) + Video-Erweiterung in der Sitemap (Bonus, hilft bei der Entdeckung).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://scm-creatives.de/</loc>
    <lastmod>2026-11-03</lastmod>
  </url>
  <url>
    <loc>https://scm-creatives.de/branchen/gastronomie</loc>
    <lastmod>2026-11-03</lastmod>
  </url>
  <url>
    <loc>https://scm-creatives.de/cases/[kunde-thema]</loc>
    <lastmod>2026-11-03</lastmod>
    <video:video>
      <video:thumbnail_loc>https://scm-creatives.de/media/cases/[kunde-thema]/poster-720x1280.webp</video:thumbnail_loc>
      <video:title>[Kunde]: Mittagstisch-Reel – skriptbasiert produziert</video:title>
      <video:description>Kurzvideo für [Kunde] in [Ort]: Idee, Skript, Dreh und Schnitt von SCM Creatives. [1–2 Sätze, inhaltlich passend zur Seite]</video:description>
      <video:content_loc>https://scm-creatives.de/media/cases/[kunde-thema]/video-1080x1920.mp4</video:content_loc>
      <video:duration>38</video:duration>
      <video:publication_date>2026-09-15T10:00:00+02:00</video:publication_date>
    </video:video>
  </url>
</urlset>
```

### 1.9 Interne Verlinkung, Breadcrumbs, Überschriften

- **Crawlbare Links:** echte `<a href="/branchen/gastronomie">` – keine `onclick`-Navigation, keine `#`-Fragmente als Seitenwechsel ([Link-Best-Practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)). **Beschreibende Ankertexte** („Reels für Restaurants ansehen“ statt „hier“).
- **Verlinkungs-Netz (Hub & Spoke):**
  - Hauptnavigation: Leistungen · Branchen (Dropdown mit 4 Links, **ohne JS crawlbar** im HTML) · Cases · Über uns · Kontakt.
  - Branchenseite → 2–4 passende Case-Watch-Pages + Leistungsseite + Kontakt.
  - Case-Seite → zugehörige Branchenseite + 2–3 ähnliche Cases („Weitere Gastro-Cases“) + Kontakt.
  - Startseite → alle Branchen + 3–6 Top-Cases.
  - Footer: Branchen, Impressum, Datenschutz, Standort/Region, Social-Profile.
  - **Keine verwaisten Seiten** – jede Sitemap-URL muss intern verlinkt sein.
- **Breadcrumbs:** sichtbar im HTML (`<nav aria-label="Brotkrümelnavigation">`) **und** als `BreadcrumbList`. Google zeigt Breadcrumbs seit Januar 2025 **nur noch auf dem Desktop**; mobil wird nur die Domain angezeigt. Markup wird weiter unterstützt ([Blog 01/2025](https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs)).
- **Überschriften:** genau **eine `<h1>`** pro Seite mit dem Hauptthema („Social-Media-Videos für Restaurants“), darunter logisch `<h2>`/`<h3>` ohne Ebenen zu überspringen (Barrierefreiheit). Keine Überschriften nur fürs Styling. Die H1 sollte dem Title inhaltlich entsprechen.
- `<html lang="de">`, semantische Landmarks (`header`, `nav`, `main`, `footer`), Alt-Texte für alle Inhaltsbilder.

---

## 2. Google Search Console

### 2.1 Domain-Property vs. URL-Präfix-Property – Empfehlung

| | Domain-Property (`scm-creatives.de`) | URL-Präfix-Property (`https://scm-creatives.de/`) |
|---|---|---|
| Umfang | **alle** Subdomains (`www`, …) und Protokolle (`http`, `https`) | nur URLs mit genau diesem Präfix |
| Verifizierung | **nur DNS** (TXT oder CNAME) | HTML-Datei, Meta-Tag, DNS, Google Analytics, Tag Manager |
| Google-Empfehlung | „We recommend using domain properties where possible“ | wenn kein DNS-Zugriff |

([Property hinzufügen](https://support.google.com/webmasters/answer/34592), [Domain-Property](https://support.google.com/webmasters/answer/10431861))

**Empfehlung für SCM:** **Domain-Property per DNS-TXT** (sieht auch `www`-, `http`- und Fehlvarianten – wichtig, um Kanonisierungsprobleme zu entdecken). Optional zusätzlich eine URL-Präfix-Property `https://scm-creatives.de/` anlegen – sie gilt durch die DNS-Verifizierung der Root-Domain als mitverifiziert (Google: Verifizierung der Root-Domain deckt Subdomains ab).
Zweiten **Inhaber** (z. B. Mitgründer, Firmen-Google-Konto) hinzufügen, damit kein Lock-out entsteht.

### 2.2 Verifizierung bei Vercel-Hosting – Schritt für Schritt

**Allgemein (Search Console):**
1. `https://search.google.com/search-console` → *Property hinzufügen* → **Domain** → `scm-creatives.de` (ohne `https://`, ohne `www`).
2. Google zeigt einen TXT-Wert `google-site-verification=XXXXXXXX` → kopieren.
3. TXT-Record beim **autoritativen DNS** anlegen (siehe A oder B).
4. Prüfen: `dig TXT scm-creatives.de +short` (oder Google Admin Toolbox *Dig*) – der Wert muss erscheinen.
5. In Search Console *Bestätigen* klicken. Bei manuell angelegten Records kann es **bis zu 48 h** dauern; bei Fehlschlag ein bis zwei Tage warten und erneut versuchen.
6. **TXT-Record dauerhaft stehen lassen** – Google prüft periodisch; wird das Token entfernt, verfällt die Verifizierung ([Inhaberschaft bestätigen](https://support.google.com/webmasters/answer/9008080)).

**A) Domain nutzt Vercel-Nameserver (Vercel DNS):**
- Dashboard: *Team → Domains → `scm-creatives.de` → DNS Records → Add* → Name: `@` (bzw. leer), Typ: `TXT`, Wert: `google-site-verification=XXXXXXXX`.
- Oder per CLI: `vercel dns add scm-creatives.de '@' TXT 'google-site-verification=XXXXXXXX'` (Syntax laut [Vercel CLI dns](https://vercel.com/docs/cli/dns)).
- Mehrere TXT-Records am Apex (z. B. SPF für E-Mail) sind erlaubt – den bestehenden SPF-Record **nicht** überschreiben.

**B) Domain bei externem Registrar/DNS (z. B. IONOS, Strato, INWX, Cloudflare), Website zeigt per A/CNAME auf Vercel:**
- TXT-Record **beim Registrar/DNS-Anbieter** anlegen (Host `@` bzw. leer = Root-Domain). Vercel ist hier nicht beteiligt.
- Bei manchen Registraren bietet Search Console eine automatische Verifizierung an (Google arbeitet mit Registraren zusammen); sonst manuell.

**C) Alternative für URL-Präfix: HTML-Meta-Tag** (falls kein DNS-Zugriff):
- `<meta name="google-site-verification" content="XXXXXXXX">` in den `<head>` der **öffentlichen Startseite** (`index.html`), deployen, *Bestätigen*. Tag dauerhaft drinlassen.

**D) HTML-Datei – bei dieser Konfiguration NICHT empfohlen (abgeleitet):**
- Google erwartet die Datei `googleXXXX.html` im Root und **folgt für diese Datei keinen Redirects**. Mit `cleanUrls: true` leitet Vercel jede `*.html`-Anfrage per 308 auf die endungslose URL um → die Verifizierung schlägt sehr wahrscheinlich fehl. → DNS oder Meta-Tag nutzen.

**Tipp:** Die Domain-Property **vor** dem Livegang verifizieren (DNS-TXT kann schon gesetzt werden, bevor die Website umgeschaltet wird) – dann sammelt Search Console ab Tag 1 Daten.

### 2.3 Sitemap einreichen, URL-Prüfung, Indexierung anfordern

- **Sitemap:** *Indexierung → Sitemaps* → `https://scm-creatives.de/sitemap.xml` einreichen. Status sollte „Erfolgreich“ sein; Anzahl „Gefundene Seiten“ mit der eigenen URL-Liste abgleichen.
- **URL-Prüfung:** URL oben eingeben → *Live-URL testen* → gerendertes HTML ansehen (bei Watch-Pages: **steht die Video-`src` im gerenderten HTML?**) → *Indexierung beantragen*. Es gibt ein **Tageslimit** für Indexierungsanträge (Zahl nicht veröffentlicht); bei vielen Seiten Sitemap nutzen; mehrfaches Beantragen derselben URL beschleunigt nichts ([URL-Prüfung](https://support.google.com/webmasters/answer/9012289), [Recrawl anfordern](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)).
- Beim Launch: Startseite + 4 Branchenseiten + 2–3 wichtigste Cases manuell beantragen; den Rest über die Sitemap.
- In der URL-Prüfung immer **„Von Google ausgewählte kanonische URL“** mit der eigenen vergleichen.

### 2.4 Typische Indexierungsprobleme – Ursachen auf Vercel und Gegenmaßnahmen

Bericht *Indexierung → Seiten* ([Page-Indexing-Report](https://support.google.com/webmasters/answer/7440203)):

| Status | Bedeutung (Google) | Typische Ursache bei SCM | Vermeidung |
|---|---|---|---|
| **Gecrawlt – zurzeit nicht indexiert** | Google hat die Seite abgerufen, aber (noch) nicht indexiert; ggf. später; **nicht erneut einreichen nötig**. | Dünne/ähnliche Seiten (z. B. Stadtseiten mit Textbausteinen, Case-Seiten mit nur Video + 1 Satz). | Jede Seite mit eigenständigem Mehrwert: Case-Story, Skript-Ansatz, Ergebnis, Transkript; starke interne Verlinkung; keine Massen-Seiten. |
| **Gefunden – zurzeit nicht indexiert** | URL bekannt, Crawl verschoben (Google erwartete Überlastung o. Ä.). | Neue Domain mit wenig Signalen; viele URLs auf einmal. | Geduld, Sitemap, interne Links, erste Backlinks/Citations; nur wertvolle URLs veröffentlichen. |
| **Duplikat – vom Nutzer nicht als kanonisch festgelegt** | Google hält die Seite für ein Duplikat ohne Canonical-Angabe. | `www` vs. Apex, `vercel.app`, `/seite/` vs. `/seite`, `/seite.html`, UTM-Parameter. | 308-Redirects (www, vercel.app, cleanUrls, trailingSlash) + **selbstreferenzierender Canonical auf jeder Seite**. |
| **Duplikat – Google hat eine andere Seite als der Nutzer als kanonisch festgelegt** | Google ignoriert den Canonical-Hinweis. | Zwei Branchen-/Stadtseiten mit fast gleichem Text. | Inhalte wirklich unterscheiden oder zusammenlegen + 308. |
| **Seite mit Weiterleitung** | Redirect-Quelle | `http://`, `www.`, `.html`-Varianten | **Normal und gewollt** – kein Handlungsbedarf. |
| **Nicht gefunden (404)** | | Alte URLs, Tippfehler in Links | Redirect-Map; Link-Checker vor Launch. |
| **Durch „noindex“-Tag ausgeschlossen** | | `/danke`, ggf. versehentlich übernommene Staging-Tags | Vor Launch alle Seiten auf `noindex` prüfen. |

### 2.5 Core-Web-Vitals-Bericht

- Schwellen „Gut“: **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1** (75. Perzentil, 28 Tage, Feld-Daten aus CrUX); URLs werden zu Gruppen ähnlicher Seiten zusammengefasst; Status einer Gruppe = schlechtester Wert ([CWV-Bericht](https://support.google.com/webmasters/answer/9205520)).
- **Realität für eine neue, kleine Site:** Der Bericht zeigt oft „Nicht genügend Daten“, weil CrUX Mindest-Traffic braucht; nur indexierte URLs erscheinen. → Bis dahin **PageSpeed Insights (Labor)** + **Vercel Speed Insights** (echte Nutzerdaten) nutzen.

### 2.6 Seiten mit Video – Bericht „Videoseiten“

- *Indexierung → Videoseiten* zeigt „Video indexiert“ / „Kein Video indexiert“ mit Gründen. Seit Dezember 2023 gilt: Ist das Video **nicht der Hauptinhalt**, erscheint „Kein Video indexiert“ (u. a. „Video isn't on a watch page“/„Video ist nicht der Hauptinhalt der Seite“). Frühere Detailgründe (aus 06/2023): *außerhalb des Viewports*, *zu klein* (Höhe/Breite > 140 px), *zu hoch* (Höhe < 1080 px) ([Blog 06/2023](https://developers.google.com/search/blog/2023/06/video-indexing-specific-issues), [Blog 12/2023](https://developers.google.com/search/blog/2023/12/video-is-the-main-content)).
- Für SCM bedeutet „Kein Video indexiert“ auf `/cases`, `/branchen/*` und der Startseite **keinen Fehler** – das ist bei Übersichtsseiten erwartbar. Relevant ist nur, dass die **Case-Watch-Pages** „Video indexiert“ zeigen.

### 2.7 Neue Berichte 2025/2026 (zum Beobachten)

- **Generative-AI-Performance-Berichte** (seit 06/2026; seit 31.08.2026 für alle Websites): Impressionen aus AI Overviews/AI Mode ([Blog 06/2026](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)).
- **Multimodale Suche** (09/2026): Lens/Circle-to-Search-Daten als Suchtyp-Filter ([Blog 09/2026](https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc)) – für eine visuelle Agentur interessant.
- Google: Für KI-Funktionen sind **keine zusätzlichen technischen Anforderungen**, keine Spezial-Markups und keine `llms.txt` nötig – Indexierbarkeit + Snippet-Fähigkeit genügen ([AI Features](https://developers.google.com/search/docs/appearance/ai-features)).

---

## 3. Strukturierte Daten (JSON-LD)

### 3.1 Entscheidungstabelle

| Typ | Wo | Rich Result realistisch? | Nutzen |
|---|---|---|---|
| `WebSite` (`name`, `alternateName`, `url`) | **nur Startseite** | Ja: **Site-Name** im Suchergebnis | Markenname statt Domain im Snippet ([Site-Names](https://developers.google.com/search/docs/appearance/site-names)). |
| `Organization` bzw. `LocalBusiness` | Startseite (ggf. Über-uns) | Kein „Rich Result“ i. e. S., aber Logo/Knowledge-Panel-Signale | Entität eindeutig machen (Name, Logo, Adresse, `sameAs`). Organization hat **keine Pflichtfelder**; alle passenden Felder empfohlen ([Organization](https://developers.google.com/search/docs/appearance/structured-data/organization)). |
| `Service` | Leistungs-/Branchenseiten | **Nein** (kein Google-Feature) | Semantik, Konsistenz; schadet nicht. |
| `BreadcrumbList` | alle Unterseiten | Ja, **nur Desktop** | Pfad im Snippet (Desktop). |
| `VideoObject` | **nur Case-Watch-Pages** | Ja, wenn Video Hauptinhalt | Video-Thumbnail/Video-Modus. |
| `FAQPage` | – | **Nein** (seit 07.05.2026 abgeschafft) | Siehe 3.6. |
| `Review`/`AggregateRating` über SCM selbst | – | **Nein** (self-serving) | Siehe 3.7. |
| `Person` (Gründer/Team) | Über-uns | Kein Feature | E-E-A-T-Signal, Verknüpfung mit LinkedIn/Instagram per `sameAs`. |

**Organization vs. LocalBusiness vs. ProfessionalService:**
- `LocalBusiness` (Unterart von Organization) ist sinnvoll, wenn es einen **realen Standort mit Kundenkontakt** gibt (Büro/Studio, dasselbe wie im Google-Unternehmensprofil). Google: `address` ist erforderlich; empfohlen u. a. `geo` (≥ 5 Nachkommastellen), `telephone` (mit Länder-/Ortsvorwahl), `openingHoursSpecification`, `priceRange` (< 100 Zeichen); bei mehreren Typen ein Array verwenden – `additionalType` wird nicht unterstützt ([LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business)).
- `ProfessionalService` ist zwar formal eine LocalBusiness-Unterart, wird aber von **schema.org als veraltet geführt** („leicht mit `Service` zu verwechseln“, siehe attic.schema.org/ProfessionalService). → **Kein Vorteil, nicht verwenden.**
- **Reine Service-Area ohne Kundenbüro** (Dreh beim Kunden, Arbeit aus Homeoffice): `Organization` mit `areaServed` + `address` (die Impressumsadresse ist ohnehin öffentlich). Im Google-Unternehmensprofil dann Adresse ausblenden (siehe 5.4).
- Konsistenz: `name`/`alternateName` in `Organization` und `WebSite` identisch halten (Google-Empfehlung).

### 3.2 Startseite: `WebSite` + `LocalBusiness`/`Organization` + Gründer (ein `@graph`)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://scm-creatives.de/#website",
      "url": "https://scm-creatives.de/",
      "name": "SCM Creatives",
      "alternateName": ["SCM", "scm-creatives.de"],
      "inLanguage": "de-DE",
      "publisher": { "@id": "https://scm-creatives.de/#organization" }
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://scm-creatives.de/#organization",
      "name": "SCM Creatives",
      "alternateName": "SCM",
      "legalName": "[PLATZHALTER: Rechtsform/Firmenname laut Impressum]",
      "url": "https://scm-creatives.de/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://scm-creatives.de/assets/img/logo-512.png",
        "width": 512,
        "height": 512
      },
      "image": "https://scm-creatives.de/assets/og/startseite-1200x630.jpg",
      "description": "Social-Media-Agentur für skriptbasierte Kurzvideos (Reels, TikToks, Shorts) für Gastronomie, Immobilienmakler, Handwerk und Unternehmen.",
      "email": "[PLATZHALTER]@scm-creatives.de",
      "telephone": "+49-[PLATZHALTER]",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "[PLATZHALTER]",
        "postalCode": "[PLATZHALTER]",
        "addressLocality": "[PLATZHALTER: z. B. Kiel]",
        "addressRegion": "Schleswig-Holstein",
        "addressCountry": "DE"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 54.00000,
        "longitude": 10.00000
      },
      "areaServed": [
        { "@type": "City", "name": "[PLATZHALTER: Kiel]" },
        { "@type": "State", "name": "Schleswig-Holstein" },
        { "@type": "Country", "name": "Deutschland" }
      ],
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "18:00"
        }
      ],
      "knowsAbout": [
        "Social-Media-Marketing",
        "Kurzvideo-Produktion",
        "Instagram Reels",
        "TikTok",
        "YouTube Shorts",
        "Social Recruiting",
        "Employer Branding"
      ],
      "founder": [{ "@id": "https://scm-creatives.de/ueber-uns#[vorname-nachname]" }],
      "foundingDate": "[PLATZHALTER: JJJJ]",
      "vatID": "[PLATZHALTER: DE…]",
      "sameAs": [
        "https://www.instagram.com/scm.creatives/",
        "[PLATZHALTER: TikTok-URL]",
        "[PLATZHALTER: LinkedIn-Unternehmensseite]",
        "[PLATZHALTER: YouTube-Kanal]"
      ]
    },
    {
      "@type": "Person",
      "@id": "https://scm-creatives.de/ueber-uns#[vorname-nachname]",
      "name": "[PLATZHALTER: Vorname Nachname]",
      "jobTitle": "Gründer & Creative Director",
      "worksFor": { "@id": "https://scm-creatives.de/#organization" },
      "image": "https://scm-creatives.de/assets/img/team/[name]-800.jpg",
      "sameAs": ["[PLATZHALTER: LinkedIn-Profil]"]
    }
  ]
}
</script>
```

Hinweise: Für die **Service-Area-Variante** `"@type": "LocalBusiness"` → `"Organization"` ändern und `geo` + `openingHoursSpecification` entfernen. Logo: quadratisch, crawlbar, ausreichend groß (Google nennt für Logos eine Mindestgröße von 112×112 px). `geo`-Werte sind Platzhalter. **Alle Angaben müssen mit Impressum, Footer und Unternehmensprofil übereinstimmen (NAP-Konsistenz).**

### 3.3 Branchen-/Leistungsseite: `Service` (+ Breadcrumb)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://scm-creatives.de/branchen/gastronomie#service",
      "name": "Social-Media-Kurzvideos für Restaurants, Cafés und Bars",
      "serviceType": "Social-Media-Videoproduktion",
      "description": "Konzept, Skript, Dreh, Schnitt und Posting-Plan für Instagram Reels, TikTok und YouTube Shorts – speziell für die Gastronomie.",
      "url": "https://scm-creatives.de/branchen/gastronomie",
      "provider": { "@id": "https://scm-creatives.de/#organization" },
      "areaServed": [
        { "@type": "State", "name": "Schleswig-Holstein" },
        { "@type": "Country", "name": "Deutschland" }
      ],
      "audience": {
        "@type": "BusinessAudience",
        "audienceType": "Gastronomiebetriebe: Restaurants, Cafés, Bars, Imbisse"
      },
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": "https://scm-creatives.de/kontakt"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Start", "item": "https://scm-creatives.de/" },
        { "@type": "ListItem", "position": 2, "name": "Branchen", "item": "https://scm-creatives.de/leistungen" },
        { "@type": "ListItem", "position": 3, "name": "Gastronomie" }
      ]
    }
  ]
}
</script>
```

(Optional `offers` mit `priceSpecification`, **nur** wenn Preise auch sichtbar auf der Seite stehen – Markup muss sichtbaren Inhalt widerspiegeln, [Allgemeine Richtlinien](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).) Wenn es keine Seite `/branchen` gibt, Position 2 auf eine existierende Übersichtsseite zeigen lassen oder weglassen.

### 3.4 Case-Watch-Page: `VideoObject` + `BreadcrumbList`

Google-Felder für `VideoObject` ([Video-Markup](https://developers.google.com/search/docs/appearance/structured-data/video)):
- **Pflicht:** `name`, `thumbnailUrl`, `uploadDate`.
- **Empfohlen:** `description` (eindeutig pro Video), `duration` (ISO 8601, z. B. `PT38S`), `contentUrl` (bevorzugt – effektivster Weg, die Datei zu holen) **oder** `embedUrl` (Fallback), außerdem `expires`, `interactionStatistic`, `regionsAllowed`/`ineligibleRegion`, `hasPart` (Key Moments – für 15–60-s-Reels irrelevant).
- `uploadDate` mit **Zeitzone** angeben.
- Thumbnail: mind. 60×30 px, crawlbar, stabile URL; Formate u. a. JPEG, PNG, **WebP, AVIF**; **dieselbe Thumbnail-URL** in `poster`, `thumbnailUrl` und Sitemap verwenden ([Video-SEO](https://developers.google.com/search/docs/appearance/video)).
- Videodatei: unterstützte Formate u. a. **MP4, WebM, MOV, M3U8**; stabile URL, nicht per robots.txt/noindex gesperrt.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "VideoObject",
      "@id": "https://scm-creatives.de/cases/[kunde-thema]#video",
      "name": "[Kunde]: Mittagstisch-Reel – skriptbasiert produziert",
      "description": "Kurzvideo für [Kunde] in [Ort]. Ziel: [Ziel]. Idee, Skript, Dreh und Schnitt: SCM Creatives.",
      "thumbnailUrl": [
        "https://scm-creatives.de/media/cases/[kunde-thema]/poster-720x1280.webp"
      ],
      "uploadDate": "2026-09-15T10:00:00+02:00",
      "duration": "PT38S",
      "contentUrl": "https://scm-creatives.de/media/cases/[kunde-thema]/video-1080x1920.mp4",
      "inLanguage": "de",
      "transcript": "[Kurzfassung des gesprochenen Textes / Untertitel]",
      "creator": { "@id": "https://scm-creatives.de/#organization" },
      "publisher": { "@id": "https://scm-creatives.de/#organization" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Start", "item": "https://scm-creatives.de/" },
        { "@type": "ListItem", "position": 2, "name": "Cases", "item": "https://scm-creatives.de/cases" },
        { "@type": "ListItem", "position": 3, "name": "[Kunde]: Mittagstisch-Reel" }
      ]
    }
  ]
}
</script>
```

### 3.5 Die Watch-Page-Regel und ihre Konsequenz für die Agentur-Seite

**Fakten (Google):**
- Video-Features (Video-Modus, Key Moments, Video-Thumbnail) gibt es nur, wenn das Video auf einer **Watch-Page** eingebettet ist: einer Seite, deren Hauptzweck es ist, **ein einzelnes Video** anzusehen. Beispiele: Video-Landingpage, Episoden-Player, News-Videoseite. **Keine** Watch-Pages: Blogpost mit eingebettetem Video, Produktseite mit 360°-Video, **Video-Kategorieseite mit mehreren gleich prominenten Videos**, Rezension mit Trailer. Google empfiehlt, **pro Video eine eigene Watch-Page** zu erstellen, „wenn es für das Geschäft sinnvoll ist“. Videos auf Nicht-Watch-Pages können weiter als Text- und Bilderergebnis erscheinen ([Video-SEO](https://developers.google.com/search/docs/appearance/video)).
- Seit **Dezember 2023** gilt die Hauptinhalt-Regel auch für den **Video-Modus** ([Blog 12/2023](https://developers.google.com/search/blog/2023/12/video-is-the-main-content)).
- Video nicht hinter Nutzeraktionen (Klick, Swipe) laden; per JS eingefügte Videos müssen im **gerenderten HTML** (URL-Prüfung) erscheinen; Google interagiert nicht mit der Seite ([Video-SEO](https://developers.google.com/search/docs/appearance/video), [Lazy-Loading](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading)).

**Konsequenz – empfohlene Struktur:**

1. **„Case = Watch-Page“:** Jeder Kunden-Case bekommt `/cases/<kunde-thema>` mit **genau einem Hauptvideo ganz oben** (mobil im ersten Viewport, Desktop links groß, Text rechts), darunter H1-nahe Beschreibung, Transkript/Untertitel, Skript-Idee, Ziel, Ergebnis, Kundenstimme, weitere Videos desselben Cases erst weiter unten. `VideoObject` **nur für das Hauptvideo**.
   - Größen-Heuristik aus Googles 06/2023-Gründen: Video **> 140 px** hoch/breit, **< 1080 px** hoch, im Viewport beim Laden. Für 9:16 auf dem Desktop z. B. `width: clamp(320px, 34vw, 540px); max-height: min(85vh, 1000px)` → ca. 960 px hoch bei 540 px Breite.
2. **Keine Dutzenden dünnen Einzelvideo-Seiten:** Nur Videos mit Geschichte bekommen eine Watch-Page (Start: die 6–12 stärksten Cases). Eine Seite mit nur Video + einem Satz landet eher in „Gecrawlt – zurzeit nicht indexiert“.
3. **Übersichtsseiten** (`/cases`, `/branchen/*`, Startseite): Video-Grids als **Poster-Bilder mit Link** zur Watch-Page (optional kurze stumme Vorschau beim Hover/Tap), **kein `VideoObject`** – „Kein Video indexiert“ ist dort erwartet.
4. **Hero-Video** der Startseite ist dekorativ → kein `VideoObject`.
5. **Erwartung realistisch halten (Einschätzung):** Video-Rich-Results für vertikale Agentur-Reels sind ein Bonus. Googles Kurzvideo-Module bedienen sich in der Praxis stark bei YouTube/TikTok/Instagram. Der Haupt-SEO-Wert der Case-Seiten liegt im **Text** (Branche, Ort, Problem, Lösung) und in der **Conversion**.

### 3.6 FAQPage – trotzdem sinnvoll?

- 08/2023: FAQ-Rich-Results nur noch für bekannte, autoritative Behörden- und Gesundheitsseiten ([Blog 08/2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes)).
- **Mai 2026:** Google hat das FAQ-Rich-Result **komplett eingestellt** („will no longer appear in Google Search starting May 7, 2026“), im Juni 2026 wurde die Doku entfernt ([Documentation Updates](https://developers.google.com/search/updates)).
- **Empfehlung:** **Sichtbare FAQ-Abschnitte behalten** (Einwände beantworten: Kosten, Dauer, Drehtag, Rechte, „Muss ich selbst vor die Kamera?“) – das hilft Nutzern, Long-Tail-Suchen und KI-Antworten (Google: keine Spezial-Markups für KI-Funktionen nötig). **`FAQPage`-Markup weglassen** – es bringt in Google nichts mehr (schadet aber auch nicht).

### 3.7 Bewertungen / AggregateRating

- Wenn eine Organisation ihre eigenen Bewertungen kontrolliert (auch über eingebettete Google-/Facebook-Widgets), sind deren `LocalBusiness`/`Organization`-Seiten **nicht** für Sterne berechtigt – gilt für `Review` und `AggregateRating` ([Review-Snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet), [Blog 2019](https://developers.google.com/search/blog/2019/09/making-review-rich-results-more-helpful)). `Service` gehört ohnehin nicht zu den review-fähigen Typen. Laut Update-Log kam 07/2026 zusätzlich eine Richtlinie zu **nicht offengelegten, incentivierten Bewertungen** hinzu (Wortlaut prüfen).
- **Erlaubt und sinnvoll:**
  - Kundenstimmen als **sichtbarer Text** (Name, Firma, Ort, Foto – mit Einwilligung) auf Case- und Branchenseiten – ohne Rating-Markup.
  - **Google-Bewertungen im Unternehmensprofil** sammeln (zählen für die lokale „Bekanntheit“, siehe 5.4) und von der Website darauf verlinken („Bewertungen auf Google ansehen“).
  - Ergebniszahlen nur belegt und wahr (UWG – irreführende Werbung vermeiden).

### 3.8 Testen

- **Rich-Results-Test** (Google-Features) + **Schema Markup Validator** (validator.schema.org, Syntax/Vokabular) vor dem Launch; nach dem Launch die Berichte unter *Verbesserungen* (Breadcrumbs, Videos) beobachten.

---

## 4. Video-SEO und Performance

### 4.1 Hosting-Entscheidung

| Kriterium | Selbst gehostet (MP4/WebM auf Vercel oder EU-Video-CDN) | YouTube-Embed (Shorts) | Instagram-Embed |
|---|---|---|---|
| Video-Ergebnis für **eigene** Domain | **Ja** (Watch-Page + `contentUrl`) | Möglich, aber Google zeigt oft die YouTube-URL; Hosting-Art an sich ist laut Google neutral | Praktisch nein |
| Performance | Sehr gut (nur `<video>`, Poster) | Schwer (iframe + viel JS) → nur mit Fassade („lite“-Embed) vertretbar | Schwer (Meta-Skript, iframe), **Layout-Shift** durch nachträgliche Größenänderung |
| Datenschutz (DE) | Unkritisch (eigener Server/Auftragsverarbeiter; Vercel-AVV/DPA abschließen) | Einwilligung nach **§ 25 TDDDG** + DSGVO; `youtube-nocookie.com` reicht laut gängiger Praxis allein nicht; **Zwei-Klick-Lösung** üblich | Meta-Tracking/Cookies → Einwilligung nötig |
| Kontrolle/Design | Voll (9:16, eigene Controls, Untertitel) | Eingeschränkt | Sehr eingeschränkt, IG-Optik |
| Kosten/Aufwand | Encoding + Datentransfer | Kostenlos | Kostenlos |

**Empfehlung:** **Selbst hosten** – kleine Reels (10–40 MB) direkt aus dem Vercel-Deployment unter `/media/`; bei vielen/größeren Videos ein EU-Video-CDN (z. B. Bunny.net, Firmensitz EU) oder Vercel Blob – dann den CDN-Host in CSP (`media-src`, `img-src`) eintragen und sicherstellen, dass dessen robots.txt Googlebot nicht sperrt. **Keine Instagram-Embeds.** YouTube nur, falls gewünscht, als Zwei-Klick-Fassade (Poster + Button, iframe erst nach Klick) – diese YouTube-Videos zählen dann **nicht** als Watch-Page-Videos der eigenen Domain (Google sieht ohne Klick kein Video).

**Rechte-Check (wichtig, Einschätzung):** Reels mit **Musik aus der Instagram/TikTok-Bibliothek** sind i. d. R. nur für die Nutzung auf der jeweiligen Plattform lizenziert. Für die Website eigene Exporte mit lizenzfreier/lizenzierter Musik verwenden. Außerdem **Einwilligung der Kunden** (und gezeigter Personen) zur Nutzung als Referenz einholen. KI-generierte Teile weiterhin kennzeichnen (die IG-Posts tun das bereits) – passt zur Glaubwürdigkeit „reale Videos“ und zu den Transparenzpflichten des EU AI Act (rechtlich prüfen).

**Encoding (Praxis):**

```bash
# H.264-MP4 (universell), 720×1280, Moov-Atom nach vorn für schnellen Start
ffmpeg -i master.mov -vf "scale=720:-2" -c:v libx264 -preset slow -crf 23 \
  -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k video-720x1280.mp4

# AV1-WebM (deutlich kleiner, moderne Browser)
ffmpeg -i master.mov -vf "scale=720:-2" -c:v libsvtav1 -preset 6 -crf 35 \
  -c:a libopus -b:a 96k video-720x1280.webm

# Hero-Loop: ohne Ton, kurz (6–10 s), stark komprimiert
ffmpeg -i hero.mov -t 8 -vf "scale=720:-2" -an -c:v libx264 -crf 26 -preset slow \
  -pix_fmt yuv420p -movflags +faststart hero-720.mp4
```

Für `contentUrl` eine 1080×1920-MP4 bereitstellen (bessere Qualität für Google), im Player per `<source>` die kleinere Fassung zuerst.

### 4.2 Core Web Vitals mit Video-Hero

**LCP:**
- Bei `<video>` zählt das **Poster-Bild** (bzw. – seit Chrome 116 – der erste gerenderte Frame, je nachdem was früher kommt) als LCP-Kandidat. Ein Poster wird vom Preload-Scanner früh entdeckt.
- `fetchpriority="high"` für das LCP-Bild ist der wichtigste Hebel; nicht auf viele Bilder anwenden. **Nie** `loading="lazy"` auf Bilder im ersten Viewport. Preload vor allem für spät entdeckte Ressourcen (CSS-Hintergründe, Poster) ([Fetch Priority](https://web.dev/articles/fetch-priority), [Lazy-Loading](https://web.dev/articles/browser-level-image-lazy-loading), [Top CWV](https://web.dev/articles/top-cwv)).
- **Muster:** Poster-Bild (WebP, ~720 px breit, ≤ 60–80 KB) mit `fetchpriority="high"` vorladen; Video lädt danach. Bei `prefers-reduced-motion` oder `Save-Data` nur das Poster zeigen.

```html
<!-- im <head> -->
<link rel="preload" as="image" href="/media/hero/poster-720x1280.webp" type="image/webp" fetchpriority="high">

<!-- im <body> -->
<section class="hero">
  <div class="hero__media">
    <video class="hero__video" autoplay muted loop playsinline
           width="720" height="1280"
           poster="/media/hero/poster-720x1280.webp"
           aria-hidden="true">
      <source src="/media/hero/hero-720.webm" type="video/webm">
      <source src="/media/hero/hero-720.mp4" type="video/mp4">
    </video>
  </div>
  <div class="hero__text">
    <h1>Kurzvideos, die nach Ihnen klingen.</h1>
    …
  </div>
</section>
```

```js
// main.v1.js – Hero bei reduzierter Bewegung / Datensparmodus anhalten
const v = document.querySelector('.hero__video');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
if (v && (reduce || saveData)) { v.removeAttribute('autoplay'); v.pause(); }
```

(Strengere Variante, wenn LCP knapp ist: Hero als `<img fetchpriority="high">` rendern und das Video erst nach `load` per JS einsetzen. Für den **dekorativen** Hero ist JS-Injection unkritisch – für Watch-Page-Videos **nicht** verwenden.)

**CLS (9:16 fest reservieren):**

```css
.hero__media, .case-video, .card__media { aspect-ratio: 9 / 16; }
.hero__video, .case-video video, .card__media img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
/* Watch-Page: 9:16 groß, aber < 1080 px hoch und im ersten Viewport */
.case-video { width: clamp(280px, 34vw, 540px); max-height: min(85vh, 1000px); }
```

Zusätzlich `width`/`height`-Attribute an `<video>`/`<img>`; Schriften mit passenden Fallback-Metriken (siehe 4.4); keine nachträglich eingefügten Banner über dem Inhalt (Cookie-Banner als Overlay, nicht als Verschiebung).

**Grid unterhalb des Folds (Cases/Branchen):** Poster als Bild, lazy, Link zur Watch-Page:

```html
<a class="card" href="/cases/[kunde-thema]">
  <div class="card__media">
    <picture>
      <source type="image/avif" srcset="/media/cases/[kunde-thema]/poster-360.avif 360w, /media/cases/[kunde-thema]/poster-720.avif 720w" sizes="(min-width: 900px) 25vw, 50vw">
      <img src="/media/cases/[kunde-thema]/poster-720x1280.webp"
           srcset="/media/cases/[kunde-thema]/poster-360.webp 360w, /media/cases/[kunde-thema]/poster-720x1280.webp 720w"
           sizes="(min-width: 900px) 25vw, 50vw"
           width="720" height="1280" loading="lazy" decoding="async"
           alt="Reel für [Kunde]: Koch präsentiert den Mittagstisch">
    </picture>
  </div>
  <h3>[Kunde] – Mittagstisch-Reel</h3>
</a>
```

Falls Inline-Vorschauvideos gewünscht: `<video muted playsinline loop preload="none" poster=…>` und per `IntersectionObserver` nur **sichtbare** Videos abspielen, sonst pausieren (max. 1–2 gleichzeitig) – schont CPU/Akku und INP.

**Watch-Page-Player (für Google sichtbar, ohne Interaktion im HTML):**

```html
<figure class="case-video">
  <video controls playsinline preload="metadata" width="1080" height="1920"
         poster="/media/cases/[kunde-thema]/poster-720x1280.webp">
    <source src="/media/cases/[kunde-thema]/video-720x1280.webm" type="video/webm">
    <source src="/media/cases/[kunde-thema]/video-1080x1920.mp4" type="video/mp4">
    <track kind="captions" src="/media/cases/[kunde-thema]/untertitel.de.vtt" srclang="de" label="Deutsch" default>
  </video>
  <figcaption>[Kunde] – Mittagstisch-Reel (0:38)</figcaption>
</figure>
```

**INP:** Vanilla-JS schlank halten, kein Scroll-Jacking/schwere Animations-Libraries, Event-Handler kurz, `passive: true` für Scroll/Touch, nur `transform`/`opacity` animieren, lange Aufgaben aufteilen, `content-visibility: auto` für lange Abschnitte unterhalb des Folds, nicht mehrere Videos gleichzeitig dekodieren.

### 4.3 Bildformate

- **AVIF** zuerst, **WebP** als Fallback per `<picture>`; responsive `srcset`/`sizes`; `width`/`height` immer setzen; `loading="lazy"` + `decoding="async"` nur unterhalb des Folds.
- **Poster** (Attribut `poster` erlaubt nur **eine** URL): WebP (universell unterstützt) – und dieselbe URL als `thumbnailUrl`/`thumbnail_loc`.
- OG-Bilder: JPEG 1200×630 (maximale Kompatibilität mit Messengern).

### 4.4 Schriften lokal einbinden

- **Rechtlich:** LG München I, Urt. v. 20.01.2022 – 3 O 17493/20: dynamisch von Google-Servern geladene Google Fonts ohne Einwilligung → Unterlassung + 100 € Schadensersatz; danach Abmahnwelle. → Schriften **selbst hosten** (keine Verbindung zu Dritten beim Seitenaufruf).
- **Technisch:** WOFF2, auf `latin` + `latin-ext` (Umlaute/ß sind in `latin` enthalten) subsetten, möglichst **eine Variable-Font-Datei** pro Familie; nur 1–2 kritische Dateien per `<link rel="preload" … crossorigin>`; `font-display: swap` (oder `optional` für Fließtext); Fallback mit `size-adjust`/`ascent-override` angleichen, um CLS beim Font-Swap zu vermeiden.

```css
@font-face {
  font-family: "Brand";
  src: url("/assets/fonts/brand-latin-var.v1.woff2") format("woff2");
  font-weight: 300 800;
  font-display: swap;
}
@font-face { /* metrisch angeglichener Fallback gegen CLS */
  font-family: "Brand Fallback";
  src: local("Arial");
  size-adjust: 104%;           /* [Werte mit Tool ermitteln] */
  ascent-override: 92%;
  descent-override: 24%;
}
body { font-family: "Brand", "Brand Fallback", system-ui, sans-serif; }
```

---

## 5. Content- & Keyword-Strategie

### 5.1 Suchanfragen mit Kaufabsicht – Cluster und Einschätzung

**Transparenz:** Öffentlich zugängliche, belastbare Suchvolumen-Zahlen für diese deutschen Keywords waren in der Recherche **nicht** auffindbar (die Websuche lieferte nur Agentur-Ratgeber ohne Keyword-Daten). Die Spalten „Volumen“/„Wettbewerb“ sind daher **qualitative Einschätzungen** aus SERP-Struktur und Nischengröße – **vor der Seitenplanung mit dem Google Ads Keyword-Planer (kostenlos mit Ads-Konto, Standort Deutschland/Schleswig-Holstein), Google Trends und nach dem Launch mit Search-Console-Daten validieren.**

| Cluster | Beispiel-Suchanfragen | Intent | Volumen (Einschätzung) | Wettbewerb (Einschätzung) | Zielseite |
|---|---|---|---|---|---|
| **Gastronomie** | social media agentur gastronomie · social media agentur für restaurants · reels für restaurants · instagram marketing restaurant · restaurant marketing agentur | Kauf | niedrig–mittel | mittel (wenige spezialisierte Agenturen, viele Ratgeber) | `/branchen/gastronomie` |
| **Immobilienmakler** | social media für immobilienmakler · reels für makler · immobilienvideo erstellen lassen · social media agentur immobilien · makler marketing video | Kauf | niedrig | mittel (Makler-Marketing-Anbieter, Tools, US-Inhalte) | `/branchen/immobilienmakler` |
| **Handwerk/Recruiting** | social recruiting handwerk · mitarbeiter finden handwerk · azubis finden social media · recruiting video handwerk · social media für handwerker | Kauf | mittel | **hoch** (spezialisierte Recruiting-Agenturen mit großen Ads-/Content-Budgets) | `/branchen/handwerk` |
| **Unternehmen/Employer Branding** | employer branding video · recruiting video erstellen lassen · unternehmensvideo social media · corporate reels | Kauf | mittel | hoch (Filmproduktionen, Employer-Branding-Agenturen) | `/branchen/unternehmen` |
| **Leistung × Region** | social media agentur kiel · videoproduktion kiel · reels produktion schleswig-holstein · social media videos [stadt] | Kauf, lokal | niedrig–mittel (Mittelstadt) | mittel (lokale Agenturen + Verzeichnisse wie Agenturfinder/Sortlist/Semrush-Agencies + Maps-Pack) | Startseite + Unternehmensprofil (siehe 5.3) |
| **Leistung generisch** | kurzvideos erstellen lassen · reels produzieren lassen · social media videoproduktion · ugc videos agentur | Kauf | mittel | hoch (bundesweit) | `/leistungen` |
| **Preis/Ablauf** | was kostet eine social media agentur · reels produktion kosten · social media betreuung preise | kaufnah, informativ | mittel | hoch (viele Ratgeberartikel) | `/ablauf` bzw. `/preise` (echte Preisrahmen) |
| **Ratgeber (später)** | reels ideen restaurant · tiktok für handwerker · instagram reels immobilien ideen | informativ | mittel | mittel; Klicks sinken durch AI Overviews | optional `/ratgeber/…` |
| **Marke** | scm creatives · scm creatives kiel | navigational | klein, wachsend | niedrig | Startseite |

**Priorität (Einschätzung):** 1) Marke + Region (Unternehmensprofil + Startseite), 2) Gastronomie und Makler (Nischen mit Kaufabsicht und vorhandenen Cases), 3) Handwerk (starke Konkurrenz → über konkrete Cases/Recruiting-Ergebnisse differenzieren), 4) Ratgeber erst, wenn die Kernseiten ranken.

### 5.2 Branchen-Landingpages vs. eine Leistungsseite

**Empfehlung: beides** – eine **Leistungsseite** (Prozess: Strategie → Skript → Dreh → Schnitt → Posting/Reporting, Pakete, Ablauf) **plus vier Branchenseiten**, weil sich Suchintention und Einwände je Branche klar unterscheiden:

- **Gastronomie:** Gäste/Reservierungen, Mittagstisch, Events, saisonale Aktionen, Drehen im laufenden Betrieb.
- **Makler:** Objektvideos, Personal Branding des Maklers, Akquise von Eigentümern, Datenschutz bei bewohnten Objekten.
- **Handwerk:** Azubi-/Fachkräfte-Recruiting, Baustellen-Alltag, Humor, „Mitarbeiter als Gesicht“.
- **Unternehmen:** Employer Branding, B2B-Vertrauen, Freigabeprozesse.

**Anforderungen an jede Branchenseite (gegen „Gecrawlt – nicht indexiert“/Doorway):**
- Eigener Text (mind. die Hälfte branchenspezifisch, nicht nur Begriffe getauscht), **2–4 echte Cases dieser Branche** mit Link auf die Watch-Pages, branchenspezifische FAQ, Ablauf-Besonderheiten, Ergebnis-Beispiele, CTA.
- Branchen ohne eigene Cases zunächst **nicht** als eigene Seite (lieber Abschnitt auf `/leistungen`).

### 5.3 Lokale Landingpages (Stadt) – wann sinnvoll, wann Doorway-Risiko

**Google-Spam-Richtlinie „Doorway Abuse“:** Seiten, die erstellt werden, um für ähnliche Suchanfragen zu ranken, u. a. „mehrere Domains oder Seiten, die auf bestimmte Regionen oder Städte ausgerichtet sind und Nutzer auf eine Seite leiten“. Auch Textblöcke, die Städte aufzählen, für die man ranken will, gelten als Keyword-Stuffing ([Spam-Richtlinien](https://developers.google.com/search/docs/essentials/spam-policies)).

**Sinnvoll** nur, wenn **alle** zutreffen:
1. Echte Präsenz/Tätigkeit dort (Kunden, Drehs, ggf. Büro),
2. **Lokale Cases** aus dieser Stadt auf der Seite,
3. Inhalte, die nur dort zutreffen (Drehorte, Kunden, Ansprechpartner, Anfahrt/Region),
4. Die Seite wäre auch ohne SEO für Besucher nützlich.

**Für SCM konkret (Einschätzung):**
- **Heimatstadt** (`[PLATZHALTER: vermutlich Kiel]`): **keine separate Stadtseite** nötig – Startseite + Title/H1/Text mit Region („Social-Media-Videos aus Kiel für ganz Schleswig-Holstein“) + Unternehmensprofil verlinkt auf die Startseite.
- **Weitere Städte** (z. B. Lübeck/Eckernförde/Hamburg): nur, wenn dort mehrere echte Cases existieren; sonst Region im Fließtext/Footer nennen („Wir drehen in Kiel, Eckernförde, Schwentinental, Kronshagen …“ – als natürlicher Satz, nicht als Keyword-Liste).
- **Keine** Kombinationsseiten „[Branche] × [Stadt]“ aus Vorlagen.

### 5.4 Google-Unternehmensprofil (GBP) + Website

- Lokales Ranking basiert laut Google hauptsächlich auf **Relevanz, Entfernung und Bekanntheit (Prominence)**; Bekanntheit u. a. aus Links/Erwähnungen im Web und **Anzahl/Bewertungen**. Für bessere Platzierungen kann man nicht bezahlen ([Lokales Ranking](https://support.google.com/business/answer/7091)).
- **Berechtigung:** Ein Profil braucht **persönlichen Kundenkontakt während der angegebenen Öffnungszeiten**; virtuelle Büros/Postadressen sind unzulässig; Coworking nur mit Beschilderung, eigener Besetzung und Kundenempfang ([Berechtigung](https://support.google.com/business/answer/13763036), [Richtlinien](https://support.google.com/business/answer/3038177)).
- **Service-Area-Business** (Dreh beim Kunden, kein Kundenempfang): **Adresse ausblenden**, Einzugsgebiet nach Städten/PLZ angeben (kein Radius; Gesamtgebiet ≤ ca. 2 Std. Fahrzeit) ([Einzugsgebiete](https://support.google.com/business/answer/9157481)).
- **Zusammenspiel:**
  - Website-Feld → Startseite (optional mit UTM-Parametern; Canonical konsolidiert).
  - **NAP identisch** in GBP, Impressum, Footer, JSON-LD.
  - Primärkategorie passend wählen (z. B. Marketing-/Social-Media-Agentur bzw. Videoproduktion – verfügbare Kategorien im GBP-Editor prüfen), Leistungen im Profil pflegen.
  - **Fotos/Videos vom Team und von Drehs** hochladen (authentisch, keine Stock-Bilder), regelmäßig Beiträge.
  - Nach jedem Projekt um eine **Google-Bewertung** bitten (ohne Anreize, siehe 3.7); auf Bewertungen antworten.
  - Von der Website aus auf das Profil verlinken (Kontaktseite: Karte als **Bild + Link** statt eingebettetem Google-Maps-iframe – spart Consent und Performance).
  - Lokale Citations: Gelbe Seiten, Das Örtliche, IHK-/Branchenverzeichnisse, Wirtschaftsförderung, lokale Presse.

### 5.5 E-E-A-T für eine junge Agentur

Google: E-E-A-T ist kein einzelner Rankingfaktor, aber **Vertrauen** ist der wichtigste Aspekt; hilfreich ist, wenn klar ist, **wer** Inhalte erstellt hat (Autoren-/Über-uns-Seite), **wie** und **warum** ([Hilfreiche Inhalte](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)).

- **Team-/Über-uns-Seite:** echte Namen, Fotos, Rollen, Werdegang, Motivation, Arbeitsweise; `Person`-Markup mit `sameAs` (LinkedIn/Instagram). Gesichter sind bei einer Video-Agentur das stärkste Vertrauenssignal → kurzes **Team-Video**.
- **Echte Cases statt Behauptungen:** Kunde (mit Freigabe), Ausgangslage, Idee/Skript-Ansatz, Dreh-Einblick (Behind the Scenes), Ergebnis mit **belegten** Zahlen (Reichweite, Anfragen, Bewerbungen) und Zeitraum, Kundenzitat mit Name/Funktion.
- **Transparenz:** Ablauf, Dauer, Preisrahmen („ab …“), Nutzungsrechte, Umgang mit KI (Kennzeichnung), Ansprechpartner.
- **Pflichtangaben:** Impressum nach **§ 5 DDG** (seit 14.05.2024 statt TMG; Verweise auf „§ 5 TMG“ ersetzen), Datenschutzerklärung (Hosting Vercel inkl. Drittlandtransfer/DPA, ggf. Video-CDN, Kontaktformular, Analytics).
- **Externe Signale:** Credits/Links von Kundenwebsites („Video: SCM Creatives“ – mit Zustimmung), Erwähnungen in lokaler Presse, IHK/Handwerkskammer-Kontakte, Gastbeiträge, Vorträge.
- **Konsistenz:** gleicher Markenname, Logo und Kontaktdaten überall (Website, GBP, Instagram-Bio, LinkedIn).

---

## 6. Launch-Checkliste

### 6.1 Vor dem Livegang (Vercel-Preview/Staging)

**Vercel & Domain**
- [ ] **Pro-Plan** aktiv (kommerzielle Nutzung).
- [ ] Apex + `www` im Projekt; **`www` → Apex (308)** im Dashboard; SSL-Zertifikate ausgestellt.
- [ ] `vercel.json` aus 1.6 eingebaut; Domain-/Projektnamen ersetzt; JSON valide (Schema `https://openapi.vercel.sh/vercel.json`).
- [ ] Redirect-Map für alte URLs (falls Vorgängerseite) `[PLATZHALTER]`.
- [ ] Keine Custom-Domain auf Nicht-Produktions-Branches ohne `noindex`.
- [ ] DPA/AVV mit Vercel (und ggf. Video-CDN) abgeschlossen.

**Search Console vorbereiten**
- [ ] Domain-Property angelegt, **DNS-TXT gesetzt und verifiziert** (vor Launch möglich); zweiter Inhaber hinzugefügt.

**Seiten-Basics (jede Seite)**
- [ ] Einzigartiger `<title>` + Meta-Description; genau **eine H1**; logische H2/H3.
- [ ] **Absoluter, selbstreferenzierender Canonical** (Apex, ohne Slash am Ende, ohne `.html`).
- [ ] Interne Links ohne `.html` und ohne Trailing Slash; **Link-Checker**: 0 kaputte Links, keine internen Redirect-Ketten.
- [ ] OG-Tags + OG-Bild je Seite; Favicon (PNG/ICO ≥ 48 px) + Apple-Touch-Icon + Manifest.
- [ ] Kein versehentliches `noindex` (außer `/danke`).
- [ ] `404.html` vorhanden, liefert **Status 404** (`curl -I`), enthält Links zu Start/Branchen/Kontakt.

**Crawling**
- [ ] `robots.txt` ohne `Disallow: /`; Sitemap-Zeile mit Apex-URL.
- [ ] `sitemap.xml`: nur kanonische 200er-URLs, korrekte `lastmod`, Video-Einträge für Watch-Pages; mit XML-Validator geprüft.

**Strukturierte Daten**
- [ ] Startseite: `WebSite` + `LocalBusiness`/`Organization` (+ `Person`); Unterseiten: `BreadcrumbList`; Branchen: `Service`; Cases: `VideoObject`.
- [ ] Rich-Results-Test + Schema-Validator ohne Fehler; Daten = sichtbarer Inhalt; NAP = Impressum = GBP.

**Video & Performance**
- [ ] Watch-Pages: Video im **initialen HTML** (`<video>` + `<source src>`), im ersten Viewport, 9:16, < 1080 px hoch, Poster = `thumbnailUrl`.
- [ ] Videodateien liefern `200`, korrekten MIME-Typ (`video/mp4`/`video/webm`), `faststart`; Untertitel (`.vtt`).
- [ ] Musik-/Nutzungsrechte und Kunden-Freigaben für alle Website-Videos dokumentiert.
- [ ] PageSpeed Insights (mobil) für Start, eine Branchen- und eine Case-Seite: LCP < 2,5 s (Labor), CLS < 0,1, geringe Total Blocking Time; Poster mit `fetchpriority="high"`, kein Lazy-Loading im ersten Viewport.
- [ ] CSP auf Preview getestet (keine Konsolenfehler).

**Datenschutz/Recht**
- [ ] DevTools → Netzwerk: **keine Drittanbieter-Requests vor Einwilligung** (Fonts lokal, keine IG-/YouTube-/Maps-Embeds ohne Klick).
- [ ] Impressum (§ 5 DDG), Datenschutzerklärung aktuell; Analytics cookielos (z. B. Vercel Web Analytics) oder mit Consent.

### 6.2 Launch-Tag

- [ ] Produktion promoten/DNS umstellen; prüfen per `curl -I`:
  `http://scm-creatives.de` → 308 → `https://…`, `https://www.…` → 308 → Apex, `https://scm-creatives.vercel.app/kontakt` → 308 → `https://scm-creatives.de/kontakt`, `/kontakt.html` → 308 → `/kontakt`, `/kontakt/` → 308 → `/kontakt`.
- [ ] Response-Header der Live-Seite prüfen (`x-robots-tag` darf **nicht** `noindex` sein; Security-/Cache-Header da).
- [ ] Search Console: **Sitemap einreichen**; URL-Prüfung → Live-Test → **Indexierung beantragen** für Startseite, 4 Branchen, 2–3 Top-Cases.
- [ ] Google-Unternehmensprofil: Website-URL gesetzt, NAP abgeglichen.
- [ ] Optional: Bing Webmaster Tools (Import aus Search Console möglich).

### 6.3 Woche 1

- [ ] *Sitemaps*: Status „Erfolgreich“, Anzahl gefundener URLs stimmt.
- [ ] *Seiten*-Bericht: erste Einträge sichten; „Seite mit Weiterleitung“ (http/www/.html) ist normal.
- [ ] URL-Prüfung für Kernseiten: **von Google gewählte Canonical = eigene Canonical**; gerendertes HTML enthält Video-`src` auf Watch-Pages.
- [ ] Manuelle Maßnahmen / Sicherheitsprobleme: leer.
- [ ] Vercel Speed Insights / Web Analytics: erste Felddaten, Fehlerseiten (404-Hits) prüfen → fehlende Redirects ergänzen.

### 6.4 Woche 2

- [ ] *Videoseiten*-Bericht: Watch-Pages „Video indexiert“? Falls „nicht Hauptinhalt“: Video größer/höher platzieren, Konkurrenz-Elemente darüber entfernen.
- [ ] *Verbesserungen*: Breadcrumbs/Videos ohne Fehler.
- [ ] Erste Leistungsdaten (Impressionen, Suchanfragen): Titles/Descriptions für Seiten mit Impressionen, aber ohne Klicks, schärfen.
- [ ] Unternehmensprofil: erste Bewertungen anfragen, Fotos/Videos posten.

### 6.5 Woche 3–4

- [ ] *Seiten*-Bericht: „Gecrawlt/Gefunden – zurzeit nicht indexiert“ analysieren → Inhalte ausbauen, interne Links stärken, dünne Seiten zusammenlegen (308).
- [ ] *Leistung*: Suchanfragen mit Position ~8–20 identifizieren → Abschnitte/FAQ ergänzen, interne Links mit passendem Ankertext.
- [ ] Generative-AI-Bericht beobachten (AI Overviews/AI Mode-Impressionen).
- [ ] CWV-Bericht: vermutlich noch „Nicht genügend Daten“ → PSI + Speed Insights weiter nutzen.
- [ ] Neue Cases veröffentlichen (Watch-Page + Sitemap-`lastmod` + Indexierung beantragen); Backlinks/Credits von Kunden einsammeln, Citations eintragen.
- [ ] Monatlich: Search-Console-Daten exportieren (Historie ist begrenzt), Redirect-Map und Sitemap pflegen.

---

## 7. Offene Punkte / Platzhalter

- `[PLATZHALTER]` Echte Domain, Firmenname/Rechtsform, Adresse, Telefon, USt-ID, Gründer-Namen, Social-Profile-URLs.
- `[PLATZHALTER]` Standort bestätigen (Indizien: Kunden in Kiel/Umgebung) und ob es einen Kundenempfang gibt (→ `LocalBusiness` + GBP mit Adresse) oder Service-Area (→ `Organization` + GBP ohne Adresse).
- `[PLATZHALTER]` Gab es eine Vorgänger-Website? → Redirect-Map.
- `[PLATZHALTER]` Keyword-Volumen mit Keyword-Planer validieren (Abschnitt 5.1 ist Einschätzung).
- `[PLATZHALTER]` Video-Hosting-Volumen (Anzahl/Größe) → Vercel-Static vs. EU-Video-CDN; aktuelle Vercel-Pro-Inklusivvolumen prüfen.
- Rechtliches (TDDDG-Consent, Musikrechte, AI-Act-Kennzeichnung) ist hier nur als Hinweis aufgeführt – keine Rechtsberatung.

---

## 8. Quellen

**Vercel**
- vercel.json (cleanUrls, trailingSlash, redirects, headers): https://vercel.com/docs/project-configuration/vercel-json
- Redirects (hostbezogener vercel.app-Redirect): https://vercel.com/docs/redirects · https://vercel.com/docs/routing/redirects/configuration-redirects
- Custom Domain einrichten (Apex/www-Redirect): https://vercel.com/docs/domains/set-up-custom-domain
- DNS-CLI (`vercel dns add`): https://vercel.com/docs/cli/dns
- Custom 404 / Fehlerseiten: https://vercel.com/kb/guide/custom-404-page · https://vercel.com/docs/custom-error-pages
- Preview-Deployments & Indexierung (X-Robots-Tag): https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines · https://vercel.com/docs/deployments/preview-deployments
- Duplicate Content mit vercel.app-URLs: https://vercel.com/kb/guide/avoiding-duplicate-content-with-vercel-app-urls
- Encryption/HSTS: https://vercel.com/docs/encryption
- Cache-Control / CDN-Cache: https://vercel.com/docs/caching/cache-control-headers · https://vercel.com/docs/caching/cdn-cache · https://vercel.com/docs/platforms/multi-tenant-platforms/serving-static-files
- Fair Use / Hobby nicht-kommerziell: https://vercel.com/docs/limits/fair-use-guidelines · https://vercel.com/docs/plans/hobby

**Google Search Central / Search Console**
- Property hinzufügen: https://support.google.com/webmasters/answer/34592
- Domain-Property: https://support.google.com/webmasters/answer/10431861 · URL-Präfix: https://support.google.com/webmasters/answer/10432366
- Inhaberschaft bestätigen: https://support.google.com/webmasters/answer/9008080
- Bericht „Seiten“ (Indexierung): https://support.google.com/webmasters/answer/7440203
- URL-Prüftool: https://support.google.com/webmasters/answer/9012289 · Recrawl: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Core-Web-Vitals-Bericht: https://support.google.com/webmasters/answer/9205520 · CWV & Suche: https://developers.google.com/search/docs/appearance/core-web-vitals
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap · Blog lastmod/Ping (06/2023): https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
- Video-Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps
- robots.txt: https://developers.google.com/search/docs/crawling-indexing/robots/intro · noindex: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Canonical: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls · https://developers.google.com/search/docs/crawling-indexing/canonicalization
- Title-Links: https://developers.google.com/search/docs/appearance/title-link · Snippets/Meta-Description: https://developers.google.com/search/docs/appearance/snippet
- Favicon: https://developers.google.com/search/docs/appearance/favicon-in-search
- URL-Struktur: https://developers.google.com/search/docs/crawling-indexing/url-structure · Links: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Site-Names (WebSite): https://developers.google.com/search/docs/appearance/site-names
- Organization: https://developers.google.com/search/docs/appearance/structured-data/organization · Blog 11/2023: https://developers.google.com/search/blog/2023/11/introducing-organization-markup
- LocalBusiness: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Breadcrumb: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb · Blog 01/2025 (mobil entfernt): https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs
- Video-SEO (Watch-Page, Thumbnails, Formate): https://developers.google.com/search/docs/appearance/video
- VideoObject: https://developers.google.com/search/docs/appearance/structured-data/video
- Video ist Hauptinhalt (12/2023): https://developers.google.com/search/blog/2023/12/video-is-the-main-content · Videoindexierungs-Gründe (06/2023): https://developers.google.com/search/blog/2023/06/video-indexing-specific-issues
- Lazy-Loading & Google: https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading
- FAQ/HowTo 2023: https://developers.google.com/search/blog/2023/08/howto-faq-changes · FAQ-Einstellung 05/2026 (Changelog): https://developers.google.com/search/updates
- Vereinfachung der Suchergebnisse (2025): https://developers.google.com/search/blog/2025/06/simplifying-search-results
- Review-Snippets / self-serving: https://developers.google.com/search/docs/appearance/structured-data/review-snippet · https://developers.google.com/search/blog/2019/09/making-review-rich-results-more-helpful
- Allgemeine Structured-Data-Richtlinien: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Spam-Richtlinien (Doorway): https://developers.google.com/search/docs/essentials/spam-policies · Blog 2015: https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages
- Hilfreiche Inhalte / E-E-A-T: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- KI-Funktionen & Website: https://developers.google.com/search/docs/appearance/ai-features · https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Search Console Gen-AI-Berichte (06/2026): https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports · Multimodal (09/2026): https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc

**Google-Unternehmensprofil**
- Lokales Ranking: https://support.google.com/business/answer/7091
- Richtlinien: https://support.google.com/business/answer/3038177 · Berechtigung: https://support.google.com/business/answer/13763036
- Adresse verwalten: https://support.google.com/business/answer/2853879 · Einzugsgebiete: https://support.google.com/business/answer/9157481

**web.dev (Performance)**
- Fetch Priority: https://web.dev/articles/fetch-priority
- Lazy-Loading Bilder: https://web.dev/articles/browser-level-image-lazy-loading · Video: https://web.dev/articles/lazy-loading-video · https://web.dev/learn/performance/video-performance
- Wirksamste CWV-Maßnahmen: https://web.dev/articles/top-cwv · Web Vitals: https://web.dev/articles/vitals · CLS: https://web.dev/articles/cls
- LCP bei Video (Sekundärquelle): https://www.debugbear.com/blog/optimize-video-lcp

**schema.org**
- ProfessionalService (veraltet): https://attic.schema.org/ProfessionalService · Service: https://schema.org/Service · VideoObject: https://schema.org/VideoObject

**Recht (Sekundärquellen, keine Rechtsberatung)**
- Impressum § 5 DDG: https://www.ihk-nuernberg.de/ihr-unternehmen/rechtsinformationen-fuer-unternehmen/internetrecht-recht-des-e-commerce/impressumspflicht
- YouTube-Einbindung / TDDDG / Zwei-Klick: https://www.haendlerbund.de/de/news/aktuelles/wissenssnack/kurz-erklaert-datenschutz-youtube-videos · https://www.e-recht24.de/tracking-cookies/13149-cookies-beim-einbinden-von-bildern-und-videos.html
- LG München I, 20.01.2022 – 3 O 17493/20 (Google Fonts): https://www.ihk.de/bergische/recht-und-steuern/wettbewerbsrecht/google-fonts-5646176
