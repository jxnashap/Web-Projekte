# -*- coding: utf-8 -*-
"""Generiert die Website des Schwartauer Segler-Vereins e.V. (Teerhofinsel, Lübeck).
Quelle: ssv-net.de (Texte, Termine, Vorstand, Gebühren, Fotos) – über die Asset-Bridge
abgeholt. Texte eigenständig neu formuliert, Fakten unverändert. Unbelegtes ist als
[PLATZHALTER] markiert.

Besonderheit: Alles, was sich im Vereinsjahr ändert (Hinweis-Banner, Hero-Foto,
Aktuelles, Termine, Zeiten & Preise, Zahlen, Galerie, Vorstand), steckt NICHT im HTML,
sondern in Redaktionsinhalten (data-cms-Bereiche, js/cms.js). Die Standardinhalte
schreibt dieses Skript nach js/inhalte-standard.js; die Redaktion pflegt sie
danach selbst unter /verwaltung/."""
import json, os

ROOT = "/home/user/Web-Projekte/webseiten/ssv-segelverein"
EASYVEREIN = "https://easyverein.com/public/SSVLuebeck"
ANTRAG = "https://easyverein.com/public/SSVLuebeck/applicationform/"
OSM = "https://www.openstreetmap.org/?mlat=53.91139&amp;mlon=10.70111#map=16/53.91139/10.70111"

NAV = [("index.html", "Start"), ("verein.html", "Verein"), ("jugend.html", "Jugend"),
       ("hafen.html", "Hafen &amp; Gäste"), ("termine.html", "Termine"), ("galerie.html", "Galerie")]

# ------------------------------------------------------------------ Standardinhalte
INHALTE = {
  "version": 1,
  "hinweis": {
    "aktiv": True,
    "text": "[BEISPIEL] Kurzfristige Hinweise blendet die Redaktion hier ein – etwa „Kran am Samstag wegen Wartung gesperrt“.",
    "link": "termine.html", "link_text": "Zu den Terminen"
  },
  "hero": {
    "bild": "bilder/hafen-morgen.jpg",
    "eyebrow": "Schwartauer Segler-Verein e.V. · Teerhofinsel Lübeck",
    "titel": "Gemeinsam segeln an der",
    "betont": "Trave.",
    "text": "Rund 80 Liegeplätze am nördlichen Travearm, gegenüber ein Naturschutzgebiet – und ein Verein, der vom Mitmachen lebt."
  },
  "aktuelles": [
    {"id": "n1", "datum": "2026-01-02", "titel": "Die Vereinstermine 2026",
     "text": "Vom Neujahrsempfang über Ansegeln, Pfingstfahrt und Nachtfahrt bis zum Einlagern im Oktober: Alle Termine des Jahres stehen im Kalender.",
     "bild": "bilder/steg.jpg", "link": "termine.html", "link_text": "Zum Terminkalender", "angeheftet": False},
    {"id": "n2", "datum": "2026-03-01", "titel": "Schnuppertraining für Kinder",
     "text": "Kinder ab etwa sechs Jahren können bis zu drei Mal beim Training auf dem Wasser mitmachen. Einzige Voraussetzung ist das Freischwimmerzeugnis.",
     "bild": "bilder/optimisten.jpg", "link": "jugend.html", "link_text": "Zur Jugendabteilung", "angeheftet": False},
    {"id": "n3", "datum": "2026-10-27", "titel": "[BEISPIEL] So sieht eine Meldung aus",
     "text": "Neuigkeiten mit Foto, Datum und Link pflegt die Redaktion selbst unter „Verwaltung“. Wichtige Meldungen lassen sich oben anheften.",
     "bild": "", "link": "", "link_text": "", "angeheftet": False}
  ],
  "termine": [
    {"id": "t01", "datum": "2026-01-04", "zeit": "11:00", "titel": "Neujahrsempfang"},
    {"id": "t02", "datum": "2026-01-24", "zeit": "10:00", "titel": "Reisebericht Portugal"},
    {"id": "t03", "datum": "2026-01-24", "zeit": "18:30", "titel": "Grünkohlessen"},
    {"id": "t04", "datum": "2026-03-07", "zeit": "10:00", "titel": "Lehrgang Brandbekämpfung"},
    {"id": "t05", "datum": "2026-04-11", "bis": "2026-04-12", "zeit": "08:00", "titel": "Auslagern"},
    {"id": "t06", "datum": "2026-05-08", "zeit": "20:00", "titel": "Jahreshauptversammlung"},
    {"id": "t07", "datum": "2026-05-09", "titel": "Ansegeln"},
    {"id": "t08", "datum": "2026-05-23", "titel": "Pfingstfahrt"},
    {"id": "t09", "datum": "2026-06-19", "bis": "2026-06-20", "zeit": "19:00", "titel": "Nachtfahrt"},
    {"id": "t10", "datum": "2026-08-22", "bis": "2026-08-23", "titel": "Familientour"},
    {"id": "t11", "datum": "2026-09-26", "titel": "Absegeln"},
    {"id": "t12", "datum": "2026-10-17", "titel": "Abmotoren"},
    {"id": "t13", "datum": "2026-10-24", "bis": "2026-10-25", "zeit": "08:00", "titel": "Einlagern"}
  ],
  "zeiten": [
    {"id": "jugend", "titel": "Jugendtraining", "zeilen": [
      {"label": "Opti-Training", "wert": "donnerstags 16:00 Uhr · 01.04.–30.09."},
      {"label": "Piraten-Training", "wert": "freitags 17:00 Uhr · 01.04.–30.09."}]},
    {"id": "hafen", "titel": "Hafen &amp; Gastlieger".replace("&amp;", "&"), "zeilen": [
      {"label": "Gastliegeplatz", "wert": "15 € pro Nacht"},
      {"label": "Hafenmeister (Gastlieger)", "wert": "Dieter Voß · 0179 5916979"},
      {"label": "Brückenwartin (Dauerlieger)", "wert": "Susanne Kühl"}]},
    {"id": "messe", "titel": "Messe &amp; Vereinsheim".replace("&amp;", "&"), "zeilen": [
      {"label": "Öffnungszeiten", "wert": "[PLATZHALTER – trägt die Redaktion ein]"},
      {"label": "Freies WLAN", "wert": "nahe der Messe"}]},
    {"id": "kran", "titel": "Kran &amp; Slip".replace("&amp;", "&"), "zeilen": [
      {"label": "Mastenkran", "wert": "25 € je angefangene Stunde"},
      {"label": "Schiffskran (max. 9 t)", "wert": "75 € je angefangene Stunde"},
      {"label": "Hinweis", "wert": "Nutzung nur durch eingewiesene Personen (Gebühren Stand 2024)"}]}
  ],
  "zahlen": [
    {"id": "z1", "wert": 185, "label": "Mitglieder"},
    {"id": "z2", "wert": 97, "label": "Boote"},
    {"id": "z3", "wert": 80, "suffix": "", "label": "Liegeplätze (etwa)"},
    {"id": "z4", "wert": 21231, "label": "Seemeilen pro Jahr"}
  ],
  "galerie": [
    {"id": "g1", "bild": "bilder/hafen-morgen.jpg", "titel": "Morgenstimmung am Steg"},
    {"id": "g2", "bild": "bilder/clubhaus.jpg", "titel": "Vereinsheim an der Teerhofinsel"},
    {"id": "g3", "bild": "bilder/optimisten.jpg", "titel": "Opti-Training auf der Trave"},
    {"id": "g4", "bild": "bilder/steg.jpg", "titel": "Steg mit Wasser und Strom"},
    {"id": "g5", "bild": "bilder/piraten.jpg", "titel": "Piraten-Jollen der Jugend"},
    {"id": "g6", "bild": "bilder/jugend-ausbildung.jpg", "titel": "Ausbildung in der Jugendgruppe"}
  ],
  "vorstand": [
    {"id": "v1", "gruppe": "Geschäftsführender Vorstand", "rolle": "1. Vorsitzender", "name": "Carsten Ehlers", "bild": "bilder/vorstand/ehlers_carsten.jpg"},
    {"id": "v2", "gruppe": "Geschäftsführender Vorstand", "rolle": "2. Vorsitzender", "name": "Dirk Preißinger", "bild": "bilder/vorstand/preissinger_dirk.jpg"},
    {"id": "v3", "gruppe": "Geschäftsführender Vorstand", "rolle": "Schriftwart", "name": "Bernhard Löbermann", "bild": "bilder/vorstand/loebermann_bernhard.jpg"},
    {"id": "v4", "gruppe": "Geschäftsführender Vorstand", "rolle": "Kassenwart", "name": "Carsten Schneider", "bild": "bilder/vorstand/schneider_carsten.jpg"},
    {"id": "v5", "gruppe": "Erweiterter Vorstand", "rolle": "Takelmeister", "name": "Marco Scharp", "bild": "bilder/vorstand/scharp_marco.jpg"},
    {"id": "v6", "gruppe": "Erweiterter Vorstand", "rolle": "Jugendwartin", "name": "Desiree Kriewitz", "bild": "bilder/vorstand/kriewitz_desiree.jpg"},
    {"id": "v7", "gruppe": "Erweiterter Vorstand", "rolle": "Segelwart", "name": "Marco Kossakowski", "bild": "bilder/vorstand/kossakowski_marco.jpg"},
    {"id": "v8", "gruppe": "Erweiterter Vorstand", "rolle": "Brückenwartin", "name": "Susanne Kühl", "bild": "bilder/vorstand/kuehl_susanne.jpg"},
    {"id": "v9", "gruppe": "Hafen", "rolle": "Hafenmeister", "name": "Dieter Voß", "bild": "bilder/vorstand/voss_dieter.jpg", "zusatz": "0179 5916979 · Gastlieger"},
    {"id": "v10", "gruppe": "Aufnahmeausschuss", "rolle": "Aufnahmeausschuss", "name": "Rainer Nowak", "bild": ""},
    {"id": "v11", "gruppe": "Aufnahmeausschuss", "rolle": "Aufnahmeausschuss", "name": "Christian Damitz", "bild": ""},
    {"id": "v12", "gruppe": "Aufnahmeausschuss", "rolle": "Aufnahmeausschuss", "name": "Bernd Schillbach", "bild": ""}
  ]
}

# ------------------------------------------------------------------ Bausteine
STANDER = '''<svg class="stander-svg" viewBox="0 0 124 100" aria-hidden="true">
          <defs><clipPath id="st-clip{n}"><path d="M14 8H118L94 33L118 58H14Z"/></clipPath></defs>
          <rect class="st-mast" x="6" y="2" width="5" height="96" rx="2.5"/>
          <path d="M14 8H118L94 33L118 58H14Z" fill="#132a6b"/>
          <g clip-path="url(#st-clip{n})"><path d="M14 8L104 58M14 58L104 8" stroke="#fff" stroke-width="15"/><path d="M14 8L104 58M14 58L104 8" stroke="#d3252c" stroke-width="9"/></g>
          <path class="st-kante" d="M14 8H118L94 33L118 58H14Z" fill="none" stroke-width="2"/>
        </svg>'''

def stander(n):
    return STANDER.replace("{n}", str(n))

def head(title, desc, body_class=""):
    body = f'<body class="{body_class}">' if body_class else "<body>"
    return f'''<!DOCTYPE html>
<html lang="de">
<head>
  <script>document.documentElement.classList.add("js");</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="bilder/hafen-morgen.jpg">
  <meta name="theme-color" content="#0E1B45">
  <link rel="icon" href="bilder/stander.svg" type="image/svg+xml">
  <link rel="preload" href="fonts/PlayfairDisplay.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="css/style.css">
</head>
{body}
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
'''

def header(active):
    items = ""
    for i, (href, label) in enumerate(NAV, 1):
        cls = ' class="active" aria-current="page"' if href == active else ""
        items += (f'        <li><a href="{href}"{cls}><span class="nl-num">0{i}</span>'
                  f'<span class="nl-label">{label}</span></a></li>\n')
    return f'''
  <header class="site-header">
    <div class="header-bar">
      <button class="menu-btn" aria-label="Menü öffnen" aria-expanded="false" aria-controls="nav-overlay">
        <span class="mb-circle" aria-hidden="true"><span></span><span></span></span>
        <span class="mb-label">Menü</span>
      </button>
      <a class="brand" href="index.html" aria-label="Schwartauer Segler-Verein – Startseite">
        {stander(1)}
        <span class="brand-word">SSV</span>
        <span class="brand-sub">Schwartauer Segler-Verein</span>
      </a>
      <a class="header-cta" href="verein.html#mitglied">
        <span>Mitglied werden</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </header>

  <div class="nav-overlay" id="nav-overlay" aria-hidden="true">
    <div class="nav-overlay-inner">
      <nav class="main-nav" aria-label="Hauptnavigation">
        <ul>
{items}        <li class="nav-contact-li"><a href="verein.html#mitglied"><span class="nl-num">·</span><span class="nl-label">Mitglied werden</span></a></li>
        </ul>
        <div class="nav-overlay-foot">
          <span><a href="mailto:info@ssv-net.de">info@ssv-net.de</a> &nbsp;·&nbsp; Zur Teerhofsinsel 5B, 23554 Lübeck</span>
          <span><a href="impressum.html">Impressum</a> &nbsp;·&nbsp; <a href="datenschutz.html">Datenschutz</a></span>
        </div>
      </nav>
      <div class="nav-visual" aria-hidden="true">
        <img src="bilder/steg.jpg" alt="" loading="lazy">
      </div>
    </div>
  </div>

  <main id="main">
'''

FOOTER = f'''
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <span class="footer-lockup">{stander(2)}<span class="brand-word">SSV</span></span>
          <p>Schwartauer Segler-Verein e.V. – Segeln, Hafen und Jugendarbeit am nördlichen Travearm bei der Teerhofinsel in Lübeck.</p>
        </div>
        <div>
          <h4>Verein</h4>
          <ul>
            <li><a href="verein.html">Über uns &amp; Vorstand</a></li>
            <li><a href="jugend.html">Jugend &amp; Ausbildung</a></li>
            <li><a href="hafen.html">Hafen &amp; Gastlieger</a></li>
            <li><a href="termine.html">Termine</a></li>
            <li><a href="galerie.html">Galerie</a></li>
          </ul>
        </div>
        <div>
          <h4>Kontakt</h4>
          <ul>
            <li><a href="mailto:info@ssv-net.de">info@ssv-net.de</a></li>
            <li>Hafenmeister: <a href="tel:+491795916979">0179 5916979</a></li>
            <li>Zur Teerhofsinsel 5B</li>
            <li>23554 Lübeck</li>
          </ul>
        </div>
        <div>
          <h4>Mitglieder</h4>
          <ul>
            <li><a href="{EASYVEREIN}" rel="noopener">Vereinsverwaltung (easyVerein)</a></li>
            <li><a href="verein.html#dokumente">Dokumente</a></li>
            <li><a href="verwaltung/index.html">Redaktion</a></li>
            <li><a href="impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutz</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> Schwartauer Segler-Verein e.V. · Lübeck</span>
        <span>DSV-Register-Nr. SH 043</span>
      </div>
    </div>
  </footer>

  <script src="js/konfig.js"></script>
  <script src="js/inhalte-standard.js"></script>
  <script src="js/cms.js"></script>
  <script src="js/script.js"></script>
</body>
</html>
'''

def page_hero_cine(img, crumb, h1, lead, fade="paper"):
    extra = " fade-night" if fade == "night" else ""
    return f'''
    <section class="page-hero page-hero-cine{extra}">
      <div class="hero-bg" aria-hidden="true">
        <img src="bilder/{img}" alt="">
        <div class="hero-veil"></div>
      </div>
      <div class="container">
        <p class="breadcrumbs reveal"><a href="index.html">Start</a> &nbsp;/&nbsp; {crumb}</p>
        <h1 class="reveal d1">{h1}</h1>
        <p class="lead reveal d2">{lead}</p>
      </div>
    </section>
'''

def ico(inner):
    return ('<div class="fl-ico icon-draw" data-draw aria-hidden="true">'
            '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg></div>')

# Selbstzeichnende Kompassrose für den Start-Hero
KOMPASS = '''<svg class="kompass-svg icon-draw" data-draw viewBox="0 0 300 300" fill="none" aria-hidden="true">
          <circle class="dl" cx="150" cy="150" r="132"/>
          <circle class="dl" cx="150" cy="150" r="108" opacity=".45"/>
          <path class="dl dl-gold" d="M150 26 L168 150 L150 274 L132 150 Z"/>
          <path class="dl" d="M26 150 L150 132 L274 150 L150 168 Z"/>
          <path class="dl" d="M62 62 L156 144 M238 62 L156 156 M62 238 L144 156 M238 238 L144 144" opacity=".5"/>
          <circle class="dl dl-gold" cx="150" cy="150" r="6"/>
        </svg>
        <p class="kompass-koord">53°54'41" N · 10°42'04" O</p>'''

WELLE = '''<svg class="wave-svg icon-draw" data-draw viewBox="0 0 240 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path class="dl" d="M6 28 C 46 10, 86 12, 120 24 S 196 38 234 18"/>
          <path class="dl dl-gold" d="M28 34 C 68 20, 120 22, 152 30 S 214 36 236 28" opacity="0.75"/>
        </svg>'''

ICO_HAND   = ico('<path class="dl" d="M14 34 L26 22 L36 28 L50 16"/><path class="dl dl-gold" d="M10 46 H54"/><path class="dl" d="M18 46 V56 M46 46 V56"/>')
ICO_PINSEL = ico('<path class="dl" d="M40 10 L54 24 L30 48 L16 34 Z"/><path class="dl dl-gold" d="M16 34 C 10 40, 10 50, 8 56 C 14 54, 24 54, 30 48"/>')
ICO_FEST   = ico('<path class="dl" d="M12 52 L24 12 L36 52"/><path class="dl dl-gold" d="M16 38 H32"/><path class="dl" d="M44 20 C 44 14, 54 14, 54 20 C 54 28, 44 28, 44 36 V40 M44 48 V50"/>')
ICO_JUGEND = ico('<path class="dl" d="M32 8 V48"/><path class="dl dl-gold" d="M32 10 C 46 20, 50 34, 50 44 H32"/><path class="dl" d="M10 52 C 20 58, 44 58, 54 52 L50 48 H14 Z"/>')

PAGES = {}

# ======================================================================== START
PAGES["index.html"] = {
  "title": "Schwartauer Segler-Verein e.V. · Segeln an der Trave in Lübeck",
  "desc": "Der Schwartauer Segler-Verein e.V. am nördlichen Travearm bei der Teerhofinsel in Lübeck: rund 80 Liegeplätze, Jugendausbildung ab ca. 6 Jahren, Gastliegeplätze und ein Vereinsleben zum Mitmachen.",
  "active": "index.html", "cine": True,
  "body": '''
    <!-- 1 · HERO (Foto, Titel und Text pflegt die Redaktion) -->
    <section class="hero hero-cine">
      <div class="hero-bg" aria-hidden="true">
        <div data-cms="hero-bild"><img src="bilder/hafen-morgen.jpg" alt=""></div>
        <div class="hero-veil"></div>
      </div>
      <div class="container hero-grid">
        <div>
          <div class="reveal" data-cms="hero-text">
            <p class="eyebrow">Schwartauer Segler-Verein e.V. · Teerhofinsel Lübeck</p>
            <h1>Gemeinsam segeln an der <em>Trave.</em></h1>
          </div>
          <div class="hero-actions reveal d2">
            <a class="btn btn-solid" href="verein.html#mitglied">Mitglied werden</a>
            <a class="btn btn-line" href="hafen.html">Gastliegeplatz</a>
          </div>
          <div class="trust-row reveal d3">
            <span>Jugendausbildung ab ca. 6 Jahren</span>
            <span>Gastliegeplätze 15 € / Nacht</span>
            <span>Vereinsleben zum Mitmachen</span>
          </div>
        </div>
        <div class="kompass-wrap">
          ''' + KOMPASS + '''
        </div>
      </div>
      <div class="scroll-cue" aria-hidden="true"><span></span></div>
    </section>

    <div class="container hinweis-slot" data-cms="hinweis"></div>

    <!-- 2 · MANIFEST -->
    <section class="section manifest">
      <div class="narrow reveal">
        <div class="rule"></div>
        <p>Segeln ist bei uns kein Schaulaufen –<br>sondern <em>Gemeinschaft.</em></p>
      </div>
    </section>

    <!-- 3 · AKTUELLES (Redaktion) -->
    <section class="section-tight aktuelles-sec">
      <div class="container">
        <div class="sec-kopf">
          <div>
            <p class="eyebrow reveal">Aktuelles</p>
            <h2 class="reveal d1">Neues aus dem <em>Verein.</em></h2>
          </div>
        </div>
        <div class="reveal d2" data-cms="aktuelles" data-limit="3"><noscript><p>Aktuelle Meldungen benötigen JavaScript.</p></noscript></div>
      </div>
    </section>

    <!-- 4 · ZAHLEN (Redaktion) -->
    <section class="section-tight dark zahlen-sec">
      <div class="container">
        <div class="reveal" data-cms="zahlen"></div>
      </div>
    </section>

    <!-- 5 · VEREIN -->
    <section class="section">
      <div class="container split" style="align-items:center">
        <div class="split-media figure-wide parallax reveal">
          <img src="bilder/clubhaus.jpg" alt="Vereinsheim des SSV mit Steganlage an der Trave" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Unser Verein</p>
          <h2 class="reveal d1">Geringe Kosten,<br>viele <em>Hände.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Wir halten die Kosten für alle bewusst niedrig – unser Hobby soll kein Schaulaufen der Zahlungskräftigsten werden. Das funktioniert, weil wir möglichst viele Aufgaben selbst übernehmen: Arbeitsdienste, Gartenarbeit, kleine Malerarbeiten, Wartung der Anlagen, Veranstaltungen und die Jugendgruppe.</p>
          <p class="reveal d3" style="color:var(--muted)">Leistet jeder seinen kleinen Teil, sind das oft nur zwei Wochenenden und ein paar Stunden im Jahr. Dann bleibt für alle genug Zeit zum Segeln.</p>
          <p class="reveal d3"><a class="link-gold" href="verein.html">Mehr über den SSV</a></p>
        </div>
      </div>
    </section>

    <!-- 6 · TERMINE + ZEITEN (Redaktion) -->
    <section class="section-tight" style="background:var(--paper-2)">
      <div class="container zwei-spalten">
        <div>
          <p class="eyebrow reveal">Nächste Termine</p>
          <h2 class="reveal d1">Im <em>Kalender.</em></h2>
          <div class="reveal d2" data-cms="termine-naechste" data-limit="4"></div>
          <p class="reveal d3" style="margin-top:28px"><a class="link-gold" href="termine.html">Alle Termine</a></p>
        </div>
        <div>
          <p class="eyebrow reveal">Gut zu wissen</p>
          <h2 class="reveal d1">Zeiten &amp; <em>Preise.</em></h2>
          <div class="reveal d2" data-cms="zeiten" data-limit="2"></div>
          <p class="reveal d3" style="margin-top:28px"><a class="link-gold" href="hafen.html">Hafen &amp; Gastlieger</a></p>
        </div>
      </div>
    </section>

    <!-- 7 · JUGEND -->
    <section class="section">
      <div class="container split reverse" style="align-items:center">
        <div class="split-media figure-wide parallax reveal">
          <img src="bilder/optimisten.jpg" alt="Optimisten-Jollen der SSV-Jugend beim Training auf der Trave" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Jugend</p>
          <h2 class="reveal d1">Segeln lernen –<br>der <em>Spaß</em> zuerst.</h2>
          <p class="reveal d2" style="color:var(--muted)">Ab etwa sechs Jahren lernen Kinder bei uns auf vereinseigenen Booten segeln: erst im Optimisten, später im Team auf der Piratenjolle. Erfahrene Trainer und Sicherungsboote sind immer dabei.</p>
          <p class="reveal d3"><a class="link-gold" href="jugend.html">Jugend &amp; Schnuppertraining</a></p>
        </div>
      </div>
    </section>

    <!-- 8 · GALERIE (Redaktion) -->
    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Galerie</p>
        <h2 class="reveal d1">Bilder vom <em>Wasser.</em></h2>
        <div class="reveal d2" data-cms="galerie" data-limit="6"></div>
        <p class="reveal d3" style="margin-top:36px"><a class="link-gold" href="galerie.html">Alle Fotos</a></p>
      </div>
    </section>

    <!-- 9 · CTA -->
    <section class="section dark cta-final">
      <div class="narrow">
        <p class="eyebrow reveal">Bis bald</p>
        <h2 class="reveal d1">Wir freuen uns auf euren <em>Besuch.</em></h2>
        <p class="lead reveal d2">Fragen zu Mitgliedschaft oder Liegeplatz? Am schnellsten per E-Mail – oder einfach vorbeikommen.</p>
        <p class="reveal d3"><a class="btn btn-solid" href="mailto:info@ssv-net.de">info@ssv-net.de</a></p>
      </div>
    </section>
'''}

# ======================================================================== VEREIN
PAGES["verein.html"] = {
  "title": "Verein & Vorstand · Schwartauer Segler-Verein e.V.",
  "desc": "Philosophie, Mitarbeit und Vorstand des Schwartauer Segler-Vereins e.V. in Lübeck – plus Mitgliedschaftsantrag, Beiträge und Satzung.",
  "active": "verein.html", "cine": True,
  "body": page_hero_cine("clubhaus.jpg", "Verein", "Ein Verein,<br>der vom <em>Mitmachen</em> lebt.",
    "Am nördlichen Travearm bei der Teerhofinsel in Lübeck – mit etwa 80 Liegeplätzen und einem Naturschutzgebiet am anderen Ufer.") + '''
    <section class="section-tight">
      <div class="narrow">
        ''' + WELLE + '''
        <p class="lead reveal">Der SSV zeichnet sich durch die Gemeinschaft im Vereinsleben aus. Wir halten die Kosten für den Einzelnen gering – und übernehmen dafür so viele Aufgaben wie möglich selbst.</p>
        <p class="reveal d1" style="color:var(--muted)">Viele von uns stehen voll im Berufsleben und sind nicht unbegrenzt verfügbar. Umso wichtiger sind auch kleine Hilfen, wenn es gerade passt. Und: Wir freuen uns, wenn Lebenspartnerinnen und Lebenspartner das Hobby teilen und mitmachen.</p>
      </div>
    </section>

    <section class="section-tight" style="padding-top:0">
      <div class="container">
        <p class="eyebrow reveal">Mitarbeit</p>
        <h2 class="reveal d1">Wobei wir <em>Hilfe</em> brauchen.</h2>
        <ul class="flist" style="margin-top:40px">
          <li class="reveal"><span class="fl-idx">01</span>''' + ICO_HAND + '''<div><h3>Arbeitsdienste</h3><p>Die jährlichen Arbeitsdienste – plus Einsätze, wenn außerplanmäßig etwas anliegt.</p></div></li>
          <li class="reveal"><span class="fl-idx">02</span>''' + ICO_PINSEL + '''<div><h3>Anlage &amp; Gelände</h3><p>Gartenarbeiten, kleine Malerarbeiten und die Wartung der Anlagen.</p></div></li>
          <li class="reveal"><span class="fl-idx">03</span>''' + ICO_FEST + '''<div><h3>Veranstaltungen</h3><p>Unterstützung bei Organisation und Durchführung – vom Neujahrsempfang bis zum Absegeln.</p></div></li>
          <li class="reveal"><span class="fl-idx">04</span>''' + ICO_JUGEND + '''<div><h3>Jugendgruppe</h3><p>Helfende Hände für Training, Zeltlager und Vereinswettbewerbe.</p></div></li>
        </ul>
      </div>
    </section>

    <section class="section dark" id="vorstand">
      <div class="container">
        <p class="eyebrow reveal">Ansprechpartner</p>
        <h2 class="reveal d1">Vorstand &amp; <em>Ämter.</em></h2>
        <div class="reveal d2" data-cms="vorstand"></div>
      </div>
    </section>

    <section class="section-tight" id="mitglied">
      <div class="container split" style="align-items:start">
        <div>
          <p class="eyebrow reveal">Mitglied werden</p>
          <h2 class="reveal d1">Willkommen an <em>Bord.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Uns erreichen regelmäßig Anfragen nach Liegeplätzen oder einer Mitgliedschaft. Der schnellste Weg ist eine E-Mail an <a href="mailto:info@ssv-net.de">info@ssv-net.de</a> oder ein Gespräch mit unserer Brückenwartin. Für alle Fragen rund um Aufnahme oder Änderung einer Mitgliedschaft: einfach melden oder persönlich vorbeischauen.</p>
          <div class="hero-actions reveal d3" style="margin-top:30px">
            <a class="btn btn-solid" href="''' + ANTRAG + '''" rel="noopener">Mitgliedschaftsantrag</a>
            <a class="btn btn-line" href="mailto:info@ssv-net.de">E-Mail schreiben</a>
          </div>
        </div>
        <div id="dokumente">
          <p class="eyebrow reveal">Dokumente</p>
          <ul class="doku-liste reveal d1">
            <li><a href="dokumente/beitraege-2024.pdf"><span>Mitgliedsbeiträge &amp; Liegeplatzgebühren</span><small>PDF · Stand Februar 2024</small></a></li>
            <li><a href="dokumente/satzung.pdf"><span>Satzung</span><small>PDF · vom 14.02.2014</small></a></li>
            <li><a href="dokumente/hafenbetriebsordnung.pdf"><span>Hafenbetriebsordnung</span><small>PDF</small></a></li>
            <li><a href="''' + ANTRAG + '''" rel="noopener"><span>Mitgliedschaftsantrag</span><small>online über easyVerein</small></a></li>
            <li><a href="''' + EASYVEREIN + '''" rel="noopener"><span>Vereinsverwaltung</span><small>Login für Mitglieder · easyVerein</small></a></li>
          </ul>
        </div>
      </div>
    </section>
'''}

# ======================================================================== JUGEND
PAGES["jugend.html"] = {
  "title": "Jugend & Ausbildung · Schwartauer Segler-Verein e.V.",
  "desc": "Segeln lernen ab ca. 6 Jahren beim SSV in Lübeck: Optimisten, Piratenjollen, Jüngstenschein, Schnuppertraining und Trainingszeiten.",
  "active": "jugend.html", "cine": True,
  "body": page_hero_cine("optimisten.jpg", "Jugend", "Segeln lernen –<br>der <em>Spaß</em> zuerst.",
    "Ab etwa sechs Jahren auf vereinseigenen Booten. Einzige Voraussetzung: das Freischwimmerzeugnis.") + '''
    <section class="section-tight">
      <div class="container split" style="align-items:center">
        <div>
          <p class="eyebrow reveal">Schnuppertraining</p>
          <h2 class="reveal d1">Drei Mal <em>ausprobieren.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Alle Interessierten können bis zu drei Mal an unserem Training auf dem Wasser teilnehmen. Wer das Segeln für sich entdeckt hat und dabei bleiben möchte, bekommt alle Infos zur Mitgliedschaft bei unserer Jugendwartin.</p>
          <p class="reveal d2" style="color:var(--muted)">Es erwarten euch eine umfassende Ausbildung in Theorie und Praxis, ein mehrtägiges Trainingszeltlager, Vereinswettbewerbe – und eine ganze Menge Spaß.</p>
          <div class="hero-actions reveal d3" style="margin-top:28px">
            <a class="btn btn-solid" href="mailto:info@ssv-net.de?subject=Schnuppertraining%20Jugend">Schnuppertraining anfragen</a>
            <a class="btn btn-line" href="verein.html#dokumente">Beiträge</a>
          </div>
        </div>
        <div class="reveal d1" data-cms="zeiten" data-id="jugend"></div>
      </div>
    </section>

    <section class="section dark">
      <div class="container">
        <p class="eyebrow reveal">Ausbildung</p>
        <h2 class="reveal d1">Schritt für Schritt<br>aufs <em>Wasser.</em></h2>
        <div class="process vier" style="margin-top:56px">
          <div class="step reveal"><span class="st-num">01</span><h3>Optimist</h3><p>Ab ca. 6 Jahren in der Einmannjolle – Anfänger und Fortgeschrittene trainieren gemeinsam, begleitet von Trainern und Sicherungsbooten.</p></div>
          <div class="step reveal d1"><span class="st-num">02</span><h3>Winter-Theorie</h3><p>Umgang mit dem Boot, Seemannsknoten, Segeltheorie und Regeln für das Verhalten auf dem Wasser.</p></div>
          <div class="step reveal d2"><span class="st-num">03</span><h3>Jüngstenschein</h3><p>Mit einer kleinen Prüfung bescheinigt er gute Kenntnisse im Umgang mit dem Boot.</p></div>
          <div class="step reveal d3"><span class="st-num">04</span><h3>Piraten &amp; Scheine</h3><p>Ab ca. 15 Jahren im Team auf der Piratenjolle, ab 16 weitere Segelscheine und der Sportbootführerschein See.</p></div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container split reverse" style="align-items:center">
        <div class="split-media figure-wide parallax reveal">
          <img src="bilder/piraten.jpg" alt="Piratenjollen der SSV-Jugend" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Kontakt</p>
          <h2 class="reveal d1">Fragen an die <em>Jugendwartin.</em></h2>
          <ul class="contact-list reveal d2" style="margin-top:26px">
            <li><div class="cl-label">Jugendwartin</div><div class="cl-val">Desiree Kriewitz</div></li>
            <li><div class="cl-label">E-Mail</div><div class="cl-val"><a href="mailto:info@ssv-net.de">info@ssv-net.de</a></div></li>
          </ul>
        </div>
      </div>
    </section>
'''}

# ======================================================================== HAFEN
PAGES["hafen.html"] = {
  "title": "Hafen & Gastliegeplätze · Schwartauer Segler-Verein e.V.",
  "desc": "Gastliegeplätze beim SSV an der Trave in Lübeck: 15 € pro Nacht, Wasser und Strom am Steg, WC und Duschen, Kran bis 9 t, Slipanlage. Anfahrt und Ansprechpartner.",
  "active": "hafen.html", "cine": True,
  "body": page_hero_cine("steg.jpg", "Hafen &amp; Gäste", "Festmachen an<br>der <em>Trave.</em>",
    "Freie Gastliegeplätze mit Rot/Grün-Schildern sind (fast) immer verfügbar – mit allen Einrichtungen eines modernen Vereinshafens.") + '''
    <section class="section-tight">
      <div class="container split" style="align-items:start">
        <div>
          <p class="eyebrow reveal">Gastlieger</p>
          <h2 class="reveal d1">Herzlich <em>willkommen.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Im Umkreis von 500 m gibt es Yachtausrüster und mehrere Bootswerften mit Motorenservice. Einkaufsmöglichkeiten, Restaurants, Banken und Ärzte findet ihr im nahen Bad Schwartau (rund 1 km). Busse fahren etwa alle 10 Minuten in die Hansestadt Lübeck, die Fahrt dauert rund 20 Minuten.</p>
          <ul class="chips reveal d3" style="margin-top:26px;padding:0;list-style:none">
            <li class="chip">Wasser &amp; Strom am Steg</li><li class="chip">WC &amp; Duschen</li><li class="chip">Kinderspielplatz</li>
            <li class="chip">Grillplatz</li><li class="chip">Freies WLAN nahe der Messe</li><li class="chip">Mastenkran</li>
            <li class="chip">Kran bis 9 t</li><li class="chip">Wasserliegeplatz bis 10 t</li><li class="chip">Jollen-Slipanlage</li>
          </ul>
          <p class="hinweis-box reveal d3"><strong>Bitte beachten:</strong> Chemietoiletten können auf unserem Gelände nicht entleert werden – uns fehlen geeignete Behälter und eine Absauganlage zur sachgerechten Entsorgung.</p>
        </div>
        <div class="reveal d1" data-cms="zeiten" data-id="hafen,kran"></div>
      </div>
    </section>

    <section class="section dark" id="anfahrt">
      <div class="container split" style="align-items:center">
        <div>
          <p class="eyebrow reveal">Anfahrt</p>
          <h2 class="reveal d1">53°54'41" N<br><em>10°42'04" O</em></h2>
          <p class="reveal d2">Zur Teerhofsinsel 5B · 23554 Lübeck – am nördlichen Travearm, gegenüber dem Naturschutzgebiet.</p>
          <div class="hero-actions reveal d3" style="margin-top:28px">
            <a class="btn btn-solid" href="''' + OSM + '''" rel="noopener">Karte öffnen (OpenStreetMap)</a>
            <a class="btn btn-line" href="tel:+491795916979">Hafenmeister anrufen</a>
          </div>
          <p class="reveal d3" style="font-size:.85rem;opacity:.7">Die Karte öffnet sich auf openstreetmap.org – auf dieser Seite wird nichts nachgeladen.</p>
        </div>
        <div class="split-media figure-wide reveal d1">
          <img src="bilder/hafen-morgen.jpg" alt="Steganlage des SSV im Morgenlicht" loading="lazy">
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Ansprechpartner</p>
        <h2 class="reveal d1">Wer euch <em>weiterhilft.</em></h2>
        <ul class="contact-list kontakt-raster reveal d2" style="margin-top:34px">
          <li><div class="cl-label">Hafenmeister · Gastlieger</div><div class="cl-val">Dieter Voß</div><a href="tel:+491795916979">0179 5916979</a></li>
          <li><div class="cl-label">Brückenwartin · Dauerlieger</div><div class="cl-val">Susanne Kühl</div><a href="mailto:info@ssv-net.de">info@ssv-net.de</a></li>
          <li><div class="cl-label">Liegeplatz &amp; Mitgliedschaft</div><div class="cl-val">Per E-Mail</div><a href="mailto:info@ssv-net.de">info@ssv-net.de</a></li>
        </ul>
      </div>
    </section>
'''}

# ======================================================================== TERMINE
PAGES["termine.html"] = {
  "title": "Termine · Schwartauer Segler-Verein e.V.",
  "desc": "Alle Vereinstermine des SSV: Neujahrsempfang, Auslagern, Jahreshauptversammlung, Ansegeln, Pfingstfahrt, Nachtfahrt, Familientour, Absegeln, Einlagern.",
  "active": "termine.html", "cine": True,
  "body": page_hero_cine("hafen-morgen.jpg", "Termine", "Das Vereinsjahr<br>im <em>Kalender.</em>",
    "Vom Neujahrsempfang bis zum Einlagern. Vergangene Termine sind ausgegraut.") + '''
    <section class="section-tight">
      <div class="narrow">
        <div class="reveal" data-cms="termine"><noscript><p>Der Terminkalender benötigt JavaScript.</p></noscript></div>
        <p class="reveal" style="color:var(--muted);font-size:.92rem;margin-top:40px">Änderungen vorbehalten. Fragen zu einzelnen Terminen gern an <a href="mailto:info@ssv-net.de">info@ssv-net.de</a>.</p>
      </div>
    </section>
'''}

# ======================================================================== GALERIE
PAGES["galerie.html"] = {
  "title": "Galerie · Schwartauer Segler-Verein e.V.",
  "desc": "Fotos aus dem Vereinsleben des SSV: Hafen, Steg, Vereinsheim und Jugendtraining auf der Trave.",
  "active": "galerie.html", "cine": True,
  "body": page_hero_cine("steg.jpg", "Galerie", "Bilder vom <em>Wasser.</em>",
    "Eindrücke aus Hafen, Vereinsheim und Jugendtraining. Zum Vergrößern antippen.") + '''
    <section class="section-tight">
      <div class="container">
        <div class="reveal" data-cms="galerie"></div>
      </div>
    </section>
'''}

# ======================================================================== RECHTLICHES
PAGES["impressum.html"] = {
  "title": "Impressum · Schwartauer Segler-Verein e.V.",
  "desc": "Impressum des Schwartauer Segler-Vereins e.V., Lübeck.",
  "active": "", "cine": False,
  "body": '''
    <section class="page-hero">
      <div class="container">
        <p class="breadcrumbs"><a href="index.html">Start</a> &nbsp;/&nbsp; Impressum</p>
        <h1>Impressum</h1>
        <p class="lead">Angaben gemäß § 5 DDG.</p>
      </div>
    </section>
    <section class="section-tight" style="padding-top:0">
      <div class="narrow recht">
        <h3>Anbieter</h3>
        <p>Schwartauer Segler-Verein e.V.<br>Zur Teerhofsinsel 5B<br>23554 Lübeck<br><a href="mailto:info@ssv-net.de">info@ssv-net.de</a></p>
        <h3>Vertreten durch</h3>
        <p>[PLATZHALTER: vertretungsberechtigter Vorstand nach § 26 BGB laut Satzung, z. B. 1. Vorsitzender Carsten Ehlers]</p>
        <h3>Registereintrag</h3>
        <p>[PLATZHALTER: Registergericht und Vereinsregisternummer]</p>
        <h3>Steuer und Verbände</h3>
        <p>Steuer-Nr.: 22 290 72188<br>DSV-Register-Nr.: SH 043<br>LSV- und SVSH-Vereins-Nr.: 70571</p>
        <h3>Verantwortlich für den Inhalt</h3>
        <p>[PLATZHALTER: Name und Anschrift nach § 18 Abs. 2 MStV]</p>
        <p style="color:var(--muted);font-size:.92rem"><em>Hinweis: Vor Veröffentlichung vervollständigen und prüfen lassen.</em></p>
      </div>
    </section>
'''}

PAGES["datenschutz.html"] = {
  "title": "Datenschutz · Schwartauer Segler-Verein e.V.",
  "desc": "Datenschutzerklärung der Website des Schwartauer Segler-Vereins e.V.",
  "active": "", "cine": False,
  "body": '''
    <section class="page-hero">
      <div class="container">
        <p class="breadcrumbs"><a href="index.html">Start</a> &nbsp;/&nbsp; Datenschutz</p>
        <h1>Datenschutz</h1>
        <p class="lead">Informationen nach Art. 13 DSGVO.</p>
      </div>
    </section>
    <section class="section-tight" style="padding-top:0">
      <div class="narrow recht">
        <p style="color:var(--muted)"><em>Hinweis: Gerüst – vor Veröffentlichung durch eine geprüfte Fassung ersetzen.</em></p>
        <h3>1. Verantwortlicher</h3>
        <p>Schwartauer Segler-Verein e.V., Zur Teerhofsinsel 5B, 23554 Lübeck · <a href="mailto:info@ssv-net.de">info@ssv-net.de</a></p>
        <h3>2. Hosting und Server-Logs</h3>
        <p>[PLATZHALTER: Hosting-Anbieter, Serverstandort, Art der Logdaten, Speicherdauer; Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO]</p>
        <h3>3. Schriften, Cookies, Tracking</h3>
        <p>Die Schriften liegen auf unserem eigenen Server; beim Aufruf werden keine Daten an Google oder andere Schriftanbieter übertragen. Die Website setzt keine Cookies und verwendet kein Tracking.</p>
        <h3>4. Redaktionsinhalte</h3>
        <p>[PLATZHALTER: Wird das Redaktionssystem mit einer Datenbank betrieben, hier Anbieter, Serverstandort und Auftragsverarbeitungsvertrag nennen.]</p>
        <h3>5. Externe Links</h3>
        <p>Mitgliedschaftsantrag und Vereinsverwaltung laufen über easyVerein, die Karte über OpenStreetMap. Diese Seiten öffnen sich erst nach eurem Klick; dort gelten die Datenschutzhinweise der jeweiligen Anbieter.</p>
        <h3>6. Fotos von Personen</h3>
        <p>[PLATZHALTER: Hinweis zur Veröffentlichung von Vereinsfotos und Vorstandsbildern, Einwilligungen]</p>
        <h3>7. Eure Rechte</h3>
        <p>Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie Beschwerde bei der Aufsichtsbehörde (ULD Schleswig-Holstein).</p>
      </div>
    </section>
'''}

# ------------------------------------------------------------------ schreiben
for fname, cfg in PAGES.items():
    html = head(cfg["title"], cfg["desc"], "cine" if cfg["cine"] else "") + header(cfg["active"]) + cfg["body"] + FOOTER
    open(os.path.join(ROOT, fname), "w", encoding="utf-8").write(html)
    print("wrote", fname, len(html))

with open(os.path.join(ROOT, "js/inhalte-standard.js"), "w", encoding="utf-8") as f:
    f.write("/* Standardinhalte der Website – erzeugt von build_ssv.py.\n"
            "   Im Betrieb überschreibt die Redaktion (/verwaltung/) diese Werte. */\n")
    f.write("window.SSV_INHALTE_STANDARD = " + json.dumps(INHALTE, ensure_ascii=False, indent=1) + ";\n")
with open(os.path.join(ROOT, "bilder/stander.svg"), "w", encoding="utf-8") as f:
    f.write(stander(9).replace('class="stander-svg" ', 'xmlns="http://www.w3.org/2000/svg" ')
            .replace('class="st-mast" ', 'fill="#0E1B45" ').replace('class="st-kante" ', 'stroke="#fff" '))
print("done")
