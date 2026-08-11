#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator: Golfresort Strandgrün — Premium-Estate-Baukasten.
Fakten ausschließlich aus .preview-cache/sg/* (golfresort-strandgruen.de).
Unbelegtes bleibt [PLATZHALTER: …]."""
import os

SITE = "/home/user/Web-Projekte/webseiten/strandgruen"
SCRATCH = os.path.dirname(os.path.abspath(__file__))

GOOGLE_FONTS = ("https://fonts.googleapis.com/css2?"
                "family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500"
                "&family=Pinyon+Script&family=Inter:wght@300;400;500;600&display=swap")

TEETIME = "https://www.pccaddie.net/clubs/0492317/app.php?cat=tt_timetable_course"
PDF_PREISE = "https://www.golfresort-strandgruen.de/home/preisliste/Preislisten_Golfanlage_Strandgruen_2026.pdf"
PDF_KALENDER = "https://www.golfresort-strandgruen.de/turniere/Wettspielkalender_2026_Strandgruen.pdf"
PDF_ANTRAG = "https://www.golfresort-strandgruen.de/Aufnahmeantrag-GC-Tdf.-2026.pdf"
PDF_ANTRAG_J = "https://www.golfresort-strandgruen.de/Aufnahmeantrag-Jugend-2026.pdf"
PDF_BROSCHUERE = "https://www.golfresort-strandgruen.de/gc-timmendorf-wAssets/docs/pdf/Imagebroschuere_Strandgruen_2025.pdf"
MEETING = "https://hotelstrandgrun.meetingpackage.com/de/venue/hotel-strandgrun-0"

NAV = [
    ("index.html", "Start"),
    ("golfanlage.html", "Golfanlage"),
    ("greenfee.html", "Greenfees & Zeiten"),
    ("academy.html", "Golf-Academy"),
    ("club.html", "Club & Turniere"),
    ("mitgliedschaft.html", "Mitgliedschaft"),
    ("restaurant.html", "Restaurant & Feiern"),
    ("kontakt.html", "Kontakt & Anfahrt"),
]

ARROW = '<svg viewBox="0 0 26 10" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4"/></svg>'


def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" type="image/png" href="assets/img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{GOOGLE_FONTS}">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="vframe" aria-hidden="true"></div>
<div class="preloader" aria-hidden="true">
  <div class="pl-script">Strandgrün</div>
  <div class="pl-mark">Golfresort · Timmendorfer Strand</div>
  <div class="pl-line"><i></i></div>
</div>
<div class="curtain" aria-hidden="true"></div>
"""


def header(active):
    links = ""
    for href, label in [("golfanlage.html", "Golfanlage"), ("greenfee.html", "Greenfees"),
                        ("academy.html", "Academy"), ("restaurant.html", "Restaurant")]:
        links += f'<a class="head-link" href="{href}">{label}</a>\n    '
    nav_links = ""
    for i, (href, label) in enumerate(NAV, 1):
        aria = ' aria-current="page"' if href == active else ""
        nav_links += f'    <a href="{href}"{aria}><i>{i:02d}</i>{label.replace("&", "&amp;")}</a>\n'
    return f"""<header class="site-header">
  <a class="brand" href="index.html" aria-label="Golfresort Strandgrün — Startseite">
    <img src="assets/img/logo-ivory.png" alt="Golfresort Strandgrün · Timmendorfer Strand" width="500" height="215">
  </a>
  <div class="head-cta">
    {links}<a class="head-link" href="{TEETIME}" target="_blank" rel="noopener">Startzeit buchen</a>
    <button class="menu-btn" aria-expanded="false" aria-label="Menü öffnen">
      <span>Menü</span><span class="mb-ico"><i></i><i></i></span>
    </button>
  </div>
</header>
<div class="nav-overlay">
  <nav class="nav-list" aria-label="Hauptnavigation">
{nav_links}  </nav>
  <aside class="nav-side">
    <div class="ns-img"><img src="assets/img/hero-2.jpg" alt=""></div>
    <div class="ns-block">
      <p class="lbl">Golfresort Strandgrün</p>
      <p>Am Golfplatz 3<br>23669 Timmendorfer Strand<br>
      <a href="tel:+4945037044 00">+49 (0) 4503 70 44 00</a></p>
    </div>
    <div class="nav-foot">
      <a href="{TEETIME}" target="_blank" rel="noopener">Startzeit</a>
      <a href="https://www.instagram.com/strandgruen_golf/" target="_blank" rel="noopener">Instagram</a>
      <a href="impressum.html">Impressum</a>
      <a href="datenschutz.html">Datenschutz</a>
    </div>
  </aside>
</div>
<main>
"""


def hero(img, label, title_html, lead="", meta=None, page=False):
    cls = "hero hero--page" if page else "hero"
    meta_html = ""
    if meta:
        cells = "".join(f"<div><b>{b}</b>{t}</div>" for b, t in meta)
        meta_html = f'\n    <div class="hero-meta rv" data-d="2">{cells}</div>'
    lead_html = f'\n    <p class="lead rv" data-d="1">{lead}</p>' if lead else ""
    return f"""<section class="{cls}">
  <div class="hero-media"><img src="assets/img/{img}" alt="" fetchpriority="high"></div>
  <div class="hero-top">
    <p class="lbl rv">{label}</p>
    <p class="lbl lbl--dim rv" data-d="1">Ostsee · Schleswig-Holstein</p>
  </div>
  <div class="hero-inner">
    <h1 class="d1 split">{title_html}</h1>{lead_html}{meta_html}
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>
"""


def btn_line(href, label, d=None, ext=False):
    dd = f' data-d="{d}"' if d else ""
    tg = ' target="_blank" rel="noopener"' if ext else ""
    return f'<a class="btn-line rv"{dd} href="{href}"{tg}>{label} {ARROW}</a>'


FOOTER = f"""</main>
<footer class="footer">
  <p class="ghost" aria-hidden="true">Strandgrün</p>
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <img src="assets/img/logo-ivory.png" alt="Golfresort Strandgrün">
        <p>36 Löcher zwischen Ostsee, Oeverdieker See und altem
        Baumbestand — die einzige 36-Loch-Anlage Schleswig-Holsteins,
        eröffnet 1973 in Timmendorfer Strand.</p>
      </div>
      <div class="foot-col">
        <b>Resort</b>
        <a href="golfanlage.html">Golfanlage</a>
        <a href="greenfee.html">Greenfees &amp; Zeiten</a>
        <a href="academy.html">Golf-Academy</a>
        <a href="club.html">Club &amp; Turniere</a>
      </div>
      <div class="foot-col">
        <b>Service</b>
        <a href="mitgliedschaft.html">Mitgliedschaft</a>
        <a href="restaurant.html">Restaurant &amp; Feiern</a>
        <a href="kontakt.html">Kontakt &amp; Anfahrt</a>
        <a href="{TEETIME}" target="_blank" rel="noopener">Startzeit buchen</a>
        <a href="{PDF_BROSCHUERE}" target="_blank" rel="noopener">Imagebroschüre (PDF)</a>
      </div>
      <div class="foot-col">
        <b>Kontakt</b>
        <span>Am Golfplatz 3<br>23669 Timmendorfer Strand</span>
        <a href="tel:+49450370 44 00">+49 (0) 4503 70 44 00</a>
        <a href="https://www.instagram.com/strandgruen_golf/" target="_blank" rel="noopener">Instagram</a>
        <a href="https://coastcollection.de/" target="_blank" rel="noopener">Member of Coast Collection</a>
      </div>
    </div>
    <div class="foot-base">
      <span>© 2026 Golfresort Strandgrün · Timmendorfer Strand</span>
      <span><a href="impressum.html">Impressum</a> &nbsp;·&nbsp; <a href="datenschutz.html">Datenschutz</a></span>
    </div>
  </div>
</footer>
<script src="js/script.js"></script>
</body>
</html>
"""

PAGES = {}

# ==================================================================
# STARTSEITE
# ==================================================================
PAGES["index.html"] = head(
    "Golfresort Strandgrün · Timmendorfer Strand — Golf an der Ostsee",
    "Die einzige 36-Loch-Golfanlage Schleswig-Holsteins: Nord- und Südplatz, "
    "Coast Golf Academy, Players Lodge und Restaurants — direkt an der Ostsee."
) + header("index.html") + hero(
    "hero-1.jpg",
    "Golfresort · Seit 1973",
    "Zwischen Ostsee <em>und</em> Oeverdieker See",
    "Die einzige 36-Loch-Anlage Schleswig-Holsteins — zwei Plätze von "
    "Dr.&nbsp;Bernhard von Limburger, eröffnet 1973 in Timmendorfer Strand.",
    meta=[("Löcher", "36 — Nord- &amp; Südplatz"),
          ("Par", "72 &amp; 61"),
          ("Bewertung", "4-Sterne-Superior"),
          ("Lage", "Am Golfplatz 3, Timmendorfer Strand")]
) + f"""
<section class="sec intro">
  <p class="ghost" aria-hidden="true">Strandgrün</p>
  <div class="wrap intro-grid">
    <div class="intro-aside">
      <p class="lbl rv">01 — Willkommen</p>
      <div class="line-h"></div>
      <p class="rv" data-d="1">Golfanlage Timmendorfer Strand —<br>die größte im echten Norden.</p>
    </div>
    <div>
      <h2 class="d2 split">Sie spielen Golf. Ein paar hundert Meter weiter <em>rauscht die Ostsee.</em></h2>
      <p class="lead rv" data-d="1">Mit insgesamt 36 Loch auf Nord- und Südplatz stehen Ihnen zwei
      mit 4-Sterne-Superior bewertete Golfplätze zur Verfügung — eingebettet in
      altgewachsenen Baumbestand mit weiten Fairways, rund um den Oeverdieker See.</p>
      {btn_line("golfanlage.html", "Die Anlage entdecken", 2)}
    </div>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap">
    <div class="stats">
      <div class="stat rv"><div class="stat-num"><span data-count="36"></span></div><div class="stat-lbl">Löcher</div></div>
      <div class="stat rv" data-d="1"><div class="stat-num"><span data-count="131"></span><sup>ha</sup></div><div class="stat-lbl">Fläche</div></div>
      <div class="stat rv" data-d="2"><div class="stat-num"><span data-count="11"></span></div><div class="stat-lbl">Wasserhindernisse</div></div>
      <div class="stat rv" data-d="3"><div class="stat-num"><span data-count="32444"></span></div><div class="stat-lbl">Rangebälle</div></div>
    </div>
  </div>
</section>

<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/nordplatz-bahn9.jpg" alt="Nordplatz — Bahn 9 des Golfresort Strandgrün"></div></div>
  <div class="ch-body">
    <p class="lbl rv">02 — Nordplatz</p>
    <h2 class="d2 split">Die hohe <em>Spielkunst</em></h2>
    <p class="rv" data-d="1">Leicht hügelig und 6.311 Meter lang: Der Nordplatz fordert
    Könnern Strategie, Spielkunst und Länge ab — und bleibt Einsteigern
    dennoch ein faires Golfvergnügen.</p>
    <div class="flist rv" data-d="2">
      <div><b>Länge</b><span>6.311 Meter</span></div>
      <div><b>Spieldaten</b><span>18 Löcher · Par 72</span></div>
      <div><b>Größe</b><span>85 Hektar</span></div>
      <div><b>Architekt</b><span>Dr. B. von Limburger</span></div>
    </div>
    {btn_line("golfanlage.html", "Zum Nordplatz", 3)}
  </div>
</section>

<section class="chapter flip">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/sued-1.jpg" alt="Südplatz am Oeverdieker See"></div></div>
  <div class="ch-body">
    <p class="lbl rv">03 — Südplatz</p>
    <h2 class="d2 split">Eine kleine <em>Persönlichkeit</em></h2>
    <p class="rv" data-d="1">Klein, aber fein und nicht zu unterschätzen: Rund um den malerischen
    Oeverdieker See gebaut, ist der Südplatz ideal für die schnelle Runde —
    kürzere Bahnen für Einsteiger, Präzisionsspiel für Könner. Am Abschlag
    von Bahn 3 wacht „Manni", der Mammutbaum.</p>
    <div class="flist rv" data-d="2">
      <div><b>Länge</b><span>3.605 Meter</span></div>
      <div><b>Spieldaten</b><span>18 Löcher · Par 61</span></div>
      <div><b>Größe</b><span>50 Hektar</span></div>
      <div><b>Architekt</b><span>Dr. B. von Limburger</span></div>
    </div>
    {btn_line("golfanlage.html", "Zum Südplatz", 3)}
  </div>
</section>

<div class="marquee" aria-hidden="true">
  <div class="mq-track"><span>Nordplatz</span><span>Südplatz</span><span>Players Lodge</span><span>Coast Golf Academy</span><span>Windfang</span><span>Trattoria del Campo</span><span>Hollywood Bar</span><span>Oeverdieker See</span></div>
</div>

<section class="sec">
  <div class="wrap">
    <div class="ecards">
      <article class="ecard">
        <div class="ec-media rv-img"><img src="assets/img/academy-kopf.jpg" alt="Training mit TrackMan 4 in der Coast Golf Academy"></div>
        <div class="ec-body">
          <p class="lbl rv">04 — Academy</p>
          <h2 class="d3 split">Coast Golf Academy — Präzision trifft Leidenschaft</h2>
          <p class="rv" data-d="1">High-Tech-Training mit dem TrackMan 4, maßgeschneiderte Kurse
          für jedes Spielniveau und ein Team um Head Pro Danny De Richter —
          vom ersten Schnupperkurs bis zum Feinschliff.</p>
          {btn_line("academy.html", "Zur Academy", 2)}
        </div>
      </article>
    </div>
  </div>
</section>

<section class="sec sec-panel">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">05 — Resort</p>
      <p class="lbl lbl--dim rv" data-d="1">Mehr als Golf</p>
    </div>
    <div class="tcards">
      <div class="tcard rv"><div class="rv-img"><img src="assets/img/players-lodge.jpg" alt="Players Lodge — zweistöckige Driving Range"></div>
        <h3>Players Lodge</h3><p>Die zweistöckige Driving Range mit Eventbereich —
        inklusive TrackMan-4-Simulatorraum für Spiel und Training.</p></div>
      <div class="tcard rv" data-d="1"><div class="rv-img"><img src="assets/img/windfang.jpg" alt="Restaurant Windfang im Clubhaus"></div>
        <h3>Restaurants &amp; Bar</h3><p>Windfang im Clubhaus, Trattoria del Campo und
        Hollywood Bar im Friesenhaus — drei Lokalitäten, drei Charaktere.</p></div>
      <div class="tcard rv" data-d="2"><div class="rv-img"><img src="assets/img/event-raum.jpg" alt="Veranstaltungsraum im Hotel Strandgrün"></div>
        <h3>Veranstaltungen</h3><p>Drei Tagungsräume für bis zu 200 Personen,
        Feierlichkeiten und Events — persönlich betreut, direkt am Platz.</p></div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">06 — Gästestimmen</p>
    </div>
    <div class="quotes">
      <div class="quote rv"><q>Tolle Golfplätze</q><p class="lbl lbl--dim">Martin Sasser</p></div>
      <div class="quote rv" data-d="1"><q>Sehr schöne Golfanlage</q><p class="lbl lbl--dim">Suzan Wesche</p></div>
      <div class="quote rv" data-d="2"><q>Herrliche Natur</q><p class="lbl lbl--dim">Uwe Haase</p></div>
    </div>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/hero-2.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Startzeiten online oder per App</p>
    <h2 class="d2 split">Ihre Startzeit <em>am Meer.</em></h2>
    <div class="rv" data-d="1" style="display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center">
      <a class="btn-solid magnet" href="{TEETIME}" target="_blank" rel="noopener">Jetzt Startzeit buchen</a>
      <a class="btn-ghost" href="kontakt.html">Kontakt aufnehmen</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# GOLFANLAGE
# ==================================================================
PAGES["golfanlage.html"] = head(
    "Golfanlage — Nordplatz, Südplatz, Greenkeeping | Golfresort Strandgrün",
    "Die größte Golfanlage im echten Norden: Nordplatz (Par 72), Südplatz (Par 61), "
    "Greenkeeping, Golfpaket Ostsee und Partnerhotels."
) + header("golfanlage.html") + hero(
    "anlage-panorama.jpg",
    "Die Anlage",
    "Die größte Golfanlage <em>im echten Norden</em>",
    "Golf und Meer: zwei 18-Loch-Plätze in charmanter Landschaft — "
    "ein paar hundert Meter von der Ostsee entfernt.",
    meta=[("Fläche", "131 Hektar"), ("Löcher", "2 × 18"),
          ("Wasserhindernisse", "11"), ("Bewertung", "4-Sterne-Superior")],
    page=True
) + f"""
<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/bahn15.jpg" alt="Bahn 15 des Golfresort Strandgrün"></div></div>
  <div class="ch-body">
    <p class="lbl rv">01 — Nordplatz</p>
    <h2 class="d2 split">Die hohe <em>Spielkunst</em></h2>
    <p class="rv" data-d="1">Leicht hügelig, mit einer Gesamtlänge von 6.311 Metern:
    Der Nordplatz verlangt Könnern Strategie, Spielkunst und Länge ab —
    und bietet Einsteigern zugleich ein faires Golfvergnügen.</p>
    <div class="flist rv" data-d="2">
      <div><b>Größe</b><span>85 ha</span></div>
      <div><b>Länge</b><span>6.311 Meter</span></div>
      <div><b>Spieldaten</b><span>18 Löcher · Par 72</span></div>
      <div><b>Slope/CR</b><span>135/71,8 (gelb) · 132/74,1 (rot)</span></div>
      <div><b>Architekt</b><span>Dr. B. von Limburger</span></div>
      <div><b>Spielstärken</b><span>Stv. 0–45,0</span></div>
      <div><b>Hunde</b><span>15:00–08:00 Uhr erlaubt</span></div>
    </div>
  </div>
</section>

<section class="chapter flip">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/sued-2.jpg" alt="Südplatz rund um den Oeverdieker See"></div></div>
  <div class="ch-body">
    <p class="lbl rv">02 — Südplatz</p>
    <h2 class="d2 split">Eine kleine <em>Persönlichkeit</em></h2>
    <p class="rv" data-d="1">Rund um den malerischen Oeverdieker See: ideal für die schnelle
    Runde, mit kürzeren Bahnen für Einsteiger und Präzisionsaufgaben
    für Könner — klein, aber fein und nicht zu unterschätzen.</p>
    <div class="flist rv" data-d="2">
      <div><b>Größe</b><span>50 ha</span></div>
      <div><b>Länge</b><span>3.605 Meter</span></div>
      <div><b>Spieldaten</b><span>18 Löcher · Par 61</span></div>
      <div><b>Slope/CR</b><span>108/61,1 (gelb) · 103/61,2 (rot)</span></div>
      <div><b>Architekt</b><span>Dr. B. von Limburger</span></div>
      <div><b>Spielstärken</b><span>Stv. 0–PR</span></div>
      <div><b>Hunde</b><span>erlaubt</span></div>
    </div>
    <p class="note rv" data-d="3">Am Abschlag von Bahn 3 steht „Manni" — der am
    24.&nbsp;Oktober 2016 gepflanzte, rund 20 Jahre alte Mammutbaum.
    Der perfekte Selfie-Point.</p>
  </div>
</section>

<section class="sec intro">
  <p class="ghost" aria-hidden="true">Greenkeeping</p>
  <div class="wrap intro-grid">
    <div class="intro-aside">
      <p class="lbl rv">03 — Greenkeeping</p>
      <div class="line-h"></div>
      <p class="rv" data-d="1">Koordiniert von<br>Head Greenkeeper Gunnar Freese.</p>
    </div>
    <div>
      <h2 class="d2 split">Mehr als nur <em>Rasenmähen</em></h2>
      <p class="lead rv" data-d="1">Sieben Greenkeeper pflegen die Anlage ganzjährig —
      Landschaftsgärtner, Landwirte, Landmaschinen-Mechaniker und ausgebildete
      Greenkeeper. Von Mai bis Oktober wird monatlich vertikutiert,
      zwei Mal im Jahr aerifiziert.</p>
      <div class="flist rv" data-d="2">
        <div><b>Vor der Runde</b><span>5 Minuten vor Startzeit am Abschlag</span></div>
        <div><b>Auf dem Fairway</b><span>Divots zurücklegen</span></div>
        <div><b>Im Bunker</b><span>Harken in Spielrichtung außerhalb ablegen</span></div>
        <div><b>Auf dem Grün</b><span>Pitchmarken ausbessern</span></div>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-paper" id="golfpaket">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">04 — Golfpaket Ostsee</p>
      <p class="lbl lbl--dim rv" data-d="1">Das Original — seit 2000</p>
    </div>
    <div class="intro-grid">
      <div class="intro-aside">
        <h2 class="d3 split">180 Löcher im Umkreis von 50 Kilometern</h2>
      </div>
      <div>
        <p class="rv">Pures Golfvergnügen an Schleswig-Holsteins Ostseeküste:
        Spielen Sie auf 4 von 8 teilnehmenden Golfplätzen — Montag bis Sonntag,
        an 365 Tagen im Jahr. Karten sind personengebunden, ab Kauf 12 Monate
        gültig und nach dem Abspielen mit 4 neuen Runden aufladbar.</p>
        <table class="ftable rv" data-d="1">
          <tr><th>Karte</th><th>Bedingungen</th><th>Preis</th></tr>
          <tr><td>Card „Classic"</td><td><small>uneingeschränkt — nur 39,75 € pro Runde</small></td><td>169,00 €</td></tr>
          <tr><td>Card „Afterwork"</td><td><small>Spiel ab 15:00 Uhr — nur 24,75 € pro Runde</small></td><td>99,00 €</td></tr>
        </table>
      </div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">05 — Partnerhotels</p>
      <p class="lbl lbl--dim rv" data-d="1">25 % Greenfee-Ermäßigung</p>
    </div>
    <div class="ecards">
      <article class="ecard">
        <div class="ec-media rv-img"><img src="assets/img/hotel-strandgruen.jpg" alt="Strandgrün Golf- &amp; Spa Resort"></div>
        <div class="ec-body">
          <h3 class="d3 split">Strandgrün Golf- &amp; Spa Resort</h3>
          <p class="rv" data-d="1">Direkt gegenüber der Golfanlage: 83 Zimmer vom Standard-
          bis zum Superior-Zimmer, teils mit eigener Küche. Das Frühstück wird
          im Clubhaus serviert — mit Blick über die Fairways und den
          Oeverdieker See.</p>
        </div>
      </article>
    </div>
    <div class="flist rv" style="margin-top:3rem">
      <div><b>Grand Hotel Seeschlösschen Sea Retreat &amp; SPA</b><span>direkt am Sandstrand, 2.300-m²-Spa mit Thalasso &amp; Meerwasser-Außenpool</span></div>
      <div><b>Appartement-Hotel Seeschlösschen</b><span>Appartements am 4.000-m²-Park, Schwimmbad &amp; Sauna</span></div>
      <div><b>SeeHuus Hotel, Niendorf</b><span>74 Zimmer &amp; Suiten mit Balkon, direkt am Sandstrand</span></div>
      <div><b>Strandhotel Miramar, Niendorf</b><span>36 Zimmer &amp; Suiten an der Strandpromenade</span></div>
      <div><b>Hotel Fuchsbau</b><span>Vier-Sterne-Haus im Landhausstil, Familie Fuhrmann</span></div>
      <div><b>Hotel Strandschlösschen, Travemünde</b><span>3 Sterne Superior, 31 Zimmer, Blick auf die Passat</span></div>
      <div><b>Hotel Yachtclub, Niendorf</b><span>4 Sterne, 60 Zimmer &amp; Suiten — „101 Schritte vom Strand"</span></div>
      <div><b>Hotel Royal, Timmendorfer Strand</b><span>4 Sterne am Kurpark, 41 Zimmer &amp; Suiten</span></div>
    </div>
  </div>
</section>

<section class="sec sec-panel">
  <div class="wrap">
    <div class="sec-head"><p class="lbl rv">06 — Impressionen</p></div>
    <div class="mosaic">
      <div class="rv-img w8"><img src="assets/img/anlage-2.jpg" alt="Fairway des Golfresort Strandgrün"></div>
      <div class="rv-img"><img src="assets/img/anlage-3.jpg" alt="Grün mit Bunker"></div>
      <div class="rv-img"><img src="assets/img/anlage-4.jpg" alt="Golfbahn mit Baumbestand"></div>
      <div class="rv-img w8"><img src="assets/img/anlage-5.jpg" alt="Wasserhindernis am Platz"></div>
      <div class="rv-img w12"><img src="assets/img/clubhaus.jpg" alt="Clubhaus der Golfanlage"></div>
    </div>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/action.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Bereit für die Runde?</p>
    <h2 class="d2 split">Greenfees, Zeiten <em>&amp; Startzeit.</em></h2>
    <div class="rv" data-d="1" style="display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center">
      <a class="btn-solid magnet" href="greenfee.html">Greenfees ansehen</a>
      <a class="btn-ghost" href="{TEETIME}" target="_blank" rel="noopener">Startzeit buchen</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# GREENFEE / ZEITEN
# ==================================================================
PAGES["greenfee.html"] = head(
    "Greenfees & Öffnungszeiten | Golfresort Strandgrün",
    "Greenfee-Preisliste 2026 des Golfresort Strandgrün, Öffnungszeiten der "
    "Rezeption und Online-Startzeitenbuchung über PC Caddie."
) + header("greenfee.html") + hero(
    "greenfee-kopf.jpg",
    "Greenfees",
    "Greenfees <em>&amp; Zeiten</em>",
    "Die Preisliste 2026 — gültig ab dem 1. Januar 2026.",
    meta=[("Preisliste", "2026 als PDF"), ("Buchung", "PC Caddie — online &amp; App"),
          ("Rezeption", "täglich erreichbar")],
    page=True
) + f"""
<section class="sec intro">
  <p class="ghost" aria-hidden="true">Greenfee</p>
  <div class="wrap intro-grid">
    <div class="intro-aside">
      <p class="lbl rv">01 — Preisliste</p>
      <div class="line-h"></div>
    </div>
    <div>
      <h2 class="d2 split">Alle Greenfees <em>auf einen Blick</em></h2>
      <p class="lead rv" data-d="1">Die vollständige Greenfee-Preisliste 2026 für Nord- und
      Südplatz steht als PDF bereit. Sie gilt ab dem 01.01.2026 — alle
      vorherigen Preislisten verlieren ihre Gültigkeit, Änderungen vorbehalten.</p>
      <div class="rv" data-d="2" style="display:flex;gap:1.2rem;flex-wrap:wrap">
        <a class="btn-solid magnet" href="{PDF_PREISE}" target="_blank" rel="noopener">Preisliste 2026 (PDF)</a>
        <a class="btn-ghost" href="{TEETIME}" target="_blank" rel="noopener">Startzeit buchen</a>
      </div>
      <p class="note rv" data-d="3">Gutscheinbücher und Ermäßigungen gelten ausschließlich auf
      das 18-Loch-Basisgreenfee (Sommer); grundsätzlich ist nur eine Form der
      Ermäßigung möglich. Akzeptiert wird u.&nbsp;a. das
      <a href="golfanlage.html#golfpaket"><strong>Golfpaket Ostsee</strong></a>
      (Afterwork- und Classic-Karte).</p>
    </div>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl rv">02 — Öffnungszeiten</p>
      <p class="lbl lbl--dim rv" data-d="1">Rezeption im Clubhaus</p>
    </div>
    <div class="flist rv">
      <div><b>Januar</b><span>täglich 10:00 – 16:00 Uhr</span></div>
      <div><b>Februar bis Dezember</b><span>täglich 08:00 – 22:00 Uhr</span></div>
      <div><b>Telefon</b><span><a href="tel:+49450370 44 00">+49 (0) 4503 70 44 00</a></span></div>
      <div><b>Nachtportier</b><span><a href="tel:+491729260812">0172 926 08 12</a></span></div>
    </div>
    <p class="note rv" data-d="1">Startzeiten buchen Sie bequem online oder per App über
    PC Caddie — für Mitglieder mit Infinity-Mitgliedschaft bis zu
    14 Tage im Voraus.</p>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/galerie-haupt.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Golfpaket Ostsee — das Original seit 2000</p>
    <h2 class="d2 split">180 Löcher. <em>Eine Karte.</em></h2>
    <div class="rv" data-d="1">
      <a class="btn-solid magnet" href="golfanlage.html#golfpaket">Zum Golfpaket Ostsee</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# ACADEMY
# ==================================================================
PAGES["academy.html"] = head(
    "Coast Golf Academy — Golfschule & TrackMan 4 | Golfresort Strandgrün",
    "Die Coast Golf Academy im Golfresort Strandgrün: TrackMan-4-Training, "
    "Platzreifekurse, Kursprogramm und Golf-Simulatorraum in der Players Lodge."
) + header("academy.html") + hero(
    "academy-kopf.jpg",
    "Coast Golf Academy",
    "Präzision trifft <em>Leidenschaft</em>",
    "Ihre Golfschule in Timmendorfer Strand — maßgeschneiderte Kurse "
    "für jedes Spielniveau, vom Einsteiger bis zum Fortgeschrittenen.",
    meta=[("Technik", "TrackMan 4"), ("Head Pro", "Danny De Richter"),
          ("Kontakt", "golf@coastcollection.de · 04503 3568946")],
    page=True
) + f"""
<section class="sec intro">
  <p class="ghost" aria-hidden="true">Academy</p>
  <div class="wrap intro-grid">
    <div class="intro-aside">
      <p class="lbl rv">01 — High-Tech</p>
      <div class="line-h"></div>
    </div>
    <div>
      <h2 class="d2 split">Training mit dem <em>TrackMan 4</em></h2>
      <p class="lead rv" data-d="1">Patentiertes Kamera- und Radar-Hybrid-Tracking mit neuronalem
      Netzwerk: Der TrackMan 4 erfasst Schlägerkopf- und Balldaten präzise —
      drinnen wie draußen. Dieselbe Technik, mit der Tour-Profis, Trainer
      und Custom-Fitter weltweit arbeiten.</p>
    </div>
  </div>
</section>

<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/pro-dan-briant.jpg" alt="PGA Professional Dan Briant beim Training"></div></div>
  <div class="ch-body">
    <p class="lbl rv">02 — Einzeltraining</p>
    <h2 class="d2 split">Ihre <em>Professionals</em></h2>
    <p class="rv" data-d="1">Einzelunterricht nach Maß — vom Head Pro oder den
    PGA Professionals der Academy. Für die 2. bis 4. Person werden
    jeweils 10,00 € berechnet; Stammkunden erhalten ab der fünften
    Stunde 10,00 € Rabatt.</p>
    <table class="ftable rv" data-d="2">
      <tr><th>Trainer</th><th></th><th>60 Min.</th></tr>
      <tr><td>Danny De Richter</td><td><small>Head Pro — Mitglieder 80,00 €</small></td><td>100,00 €</td></tr>
      <tr><td>Frederic Dechavanne</td><td><small>PGA Professional — Mitglieder 70,00 €</small></td><td>80,00 €</td></tr>
      <tr><td>Dan Briant</td><td><small>PGA Professional — Mitglieder 70,00 €</small></td><td>80,00 €</td></tr>
    </table>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">03 — Kursprogramm</p>
      <p class="lbl lbl--dim rv" data-d="1">Leihausrüstung inklusive</p>
    </div>
    <table class="ftable rv">
      <tr><th>Kurs</th><th></th><th>Preis</th></tr>
      <tr><td>Schnupperkurs</td><td><small>Mai–September, sonntags 11:00–12:50 Uhr · ohne Platzreife ·
        Ausrüstung + 4 Ballkörbe inklusive · mind. 3 Teilnehmer</small></td><td>29,00 €</td></tr>
      <tr><td>Platzreife „Privat"</td><td><small>DGV-Platzreife in 6 Einzelstunden, frei planbar, Prüfung inklusive ·
        + 100,00 € je weitere Person · + 29,00 € p. P. Prüfungsgebühr · max. 4 Teilnehmer</small></td><td>499,00 €</td></tr>
      <tr><td>Themenkurs „Kompakt"</td><td><small>1 Unterrichtseinheit zu ausgewählten Themen · mind. 5 Teilnehmer ·
        eigene Ausrüstung</small></td><td>35,00 €</td></tr>
      <tr><td>Mit dem Trainer auf den Platz</td><td><small>Vorbereitung auf die praktische Prüfung, Etikette- und Regeltipps ·
        max. 3 Personen · nur mit Voranmeldung</small></td><td>95,00 €</td></tr>
    </table>
    <p class="note rv" data-d="1">Anmeldung unter <a href="tel:+49450370 44 00"><strong>04503 70 44 00</strong></a>.</p>
  </div>
</section>

<section class="chapter flip">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/academy-aktion.jpg" alt="Platzreifekurs der Coast Golf Academy"></div></div>
  <div class="ch-body">
    <p class="lbl rv">04 — Platzreife for free</p>
    <h2 class="d2 split">Der kostenlose <em>Platzreifekurs</em></h2>
    <p class="rv" data-d="1">96 % der deutschen Bevölkerung hatten noch nie einen Golfschläger
    in der Hand — das möchte das Resort ändern: Wer seinen ersten Wohnsitz
    nachweislich im Kreis Ostholstein oder in Lübeck hat, absolviert den
    Platzreifekurs 2026 kostenlos. Während der Teilnahme nutzen Sie auch
    die Übungseinrichtungen kostenfrei.</p>
    <p class="rv" data-d="2">Anmeldung und Informationen:<br>
    <a href="mailto:verwaltung@golfresort-strandgruen.de"><strong>verwaltung@golfresort-strandgruen.de</strong></a></p>
  </div>
</section>

<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/simulator.jpg" alt="Golf-Simulatorraum mit TrackMan 4 in der Players Lodge"></div></div>
  <div class="ch-body">
    <p class="lbl rv">05 — Simulatorraum</p>
    <h2 class="d2 split">Spiel, Training &amp; Hightech <em>unter einem Dach</em></h2>
    <p class="rv" data-d="1">Der neu gestaltete Golf-Simulatorraum in der Players Lodge ist
    separat mietbar — Herzstück ist der TrackMan 4 mit realistischen
    Plätzen und präzisen Analysen. Für bis zu 4 Personen.</p>
    <table class="ftable rv" data-d="2">
      <tr><th>Dauer</th><th></th><th>pro Raum</th></tr>
      <tr><td>50 Minuten</td><td><small>Mitglieder 25,00 € · Infinity 20,00 €</small></td><td>29,00 €</td></tr>
      <tr><td>110 Minuten</td><td><small>Mitglieder 50,00 € · Infinity 40,00 €</small></td><td>58,00 €</td></tr>
    </table>
    <p class="note rv" data-d="3">Buchung über PC Caddie — Kategorie „Simulatorraum".</p>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/academy-2.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Coast Golf Academy</p>
    <h2 class="d2 split">Golfen mit <em>Leidenschaft.</em></h2>
    <div class="rv" data-d="1" style="display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center">
      <a class="btn-solid magnet" href="mailto:golf@coastcollection.de">Academy kontaktieren</a>
      <a class="btn-ghost" href="tel:+4945033568946">04503 356 89 46</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# CLUB & TURNIERE
# ==================================================================
PAGES["club.html"] = head(
    "Golfclub Timmendorfer Strand e. V. — Club & Turniere | Golfresort Strandgrün",
    "Der Golfclub Timmendorfer Strand e. V.: Historie seit 1973, Vorstand, "
    "Spielgruppen, Newcomer und die Offene Golfwoche 2026."
) + header("club.html") + hero(
    "resort-aussen.jpg",
    "Der Club",
    "Golfclub Timmendorfer <em>Strand e.&nbsp;V.</em>",
    "Am 7. November 1973 unter der Nr. 133 ins Vereinsregister eingetragen — "
    "seit über fünf Jahrzehnten zu Hause zwischen Ostsee und Oeverdieker See.",
    meta=[("Gegründet", "7. November 1973"), ("Platzeröffnung", "Juli 1974"),
          ("Präsident", "Andreas Graap")],
    page=True
) + f"""
<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/club-historie.jpg" alt="Historische Ansicht der Golfanlage Timmendorfer Strand"></div></div>
  <div class="ch-body">
    <p class="lbl rv">01 — Historie</p>
    <h2 class="d2 split">Pionierarbeit <em>im Norden</em></h2>
    <p class="rv" data-d="1">Anfang der Siebzigerjahre gab es in ganz Deutschland erst rund
    110 Golfplätze — fünf davon in Schleswig-Holstein. Initiator
    Karl-Heinz Tillipaul gewann Investoren für ein ehrgeiziges Projekt:
    zwei 18-Loch-Plätze, geplant vom Golfarchitekten Dr. Bernhard
    von Limburger und gebaut von Platzbauer Kurt Peters.</p>
    <p class="rv" data-d="2">Im Juli 1974 wurde die Anlage mit dreitägigen Eröffnungsspielen
    eingeweiht — mit 200 Spielern aus 33 Clubs.</p>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl rv">02 — Vorstand</p>
      <p class="lbl lbl--dim rv" data-d="1">Golfclub Timmendorfer Strand e. V.</p>
    </div>
    <div class="flist rv">
      <div><b>Präsident</b><span>Andreas Graap</span></div>
      <div><b>Ehrenpräsident</b><span>Klaus Gebert</span></div>
      <div><b>Vizepräsidentin</b><span>Birgit Faßbender</span></div>
      <div><b>Spielführerin</b><span>Susanne Graap</span></div>
      <div><b>Schatzmeister</b><span>Thomas Schuhr</span></div>
      <div><b>Jugendwart</b><span>Heiko Boness</span></div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">03 — Spielgruppen</p>
      <p class="lbl lbl--dim rv" data-d="1">Gemeinsam auf die Runde</p>
    </div>
    <div class="tcards">
      <div class="tcard rv"><h3>Sea Eagles</h3><p>Der Herrennachmittag — mittwochs um 13:00 Uhr,
        unter der Leitung von Guido Möller.</p></div>
      <div class="tcard rv" data-d="1"><h3>Seepferdchen</h3><p>Der Damennachmittag — mittwochs um 13:00 Uhr,
        geleitet von Susanne Graap.</p></div>
      <div class="tcard rv" data-d="2"><h3>Newcomer</h3><p>Nach der Platzreife locker auf dem Südplatz mitspielen:
        Mitte März bis Mitte Oktober, jeden Mittwoch 15:30–17:30 Uhr —
        organisiert von Britta Kirsch und Michael Jeggle. Vermittelt werden
        Etikette, Regeln und Turniererfahrung.</p></div>
    </div>
  </div>
</section>

<section class="sec sec-panel">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">04 — Turniere</p>
      <p class="lbl lbl--dim rv" data-d="1">Für Mitglieder und Gäste</p>
    </div>
    <div class="ecards">
      <article class="ecard">
        <div class="ec-media rv-img"><img src="assets/img/bunker.jpg" alt="Turnierspiel auf dem Golfresort Strandgrün"></div>
        <div class="ec-body">
          <h3 class="d3 split">Offene Golfwoche 2026</h3>
          <div class="flist rv" data-d="1">
            <div><b>Mo, 29. Juni</b><span>„Strandgrün Vierer" — Nordplatz</span></div>
            <div><b>Dienstag</b><span>„Café Fitz Trophy" — Südplatz</span></div>
            <div><b>Donnerstag</b><span>„Tillipaul Gedächtnispreis" — Nordplatz</span></div>
            <div><b>Fr, 3. Juli</b><span>„Golf Club-Vierer" — Nordplatz</span></div>
          </div>
          <p class="rv" data-d="2">Zum Abschluss: Siegerehrung des Gesamtsiegers beim
          Abendessen und Get-Together. Anmeldung ab dem 1. Juni 2026 per
          E-Mail oder über PC Caddie.</p>
          {btn_line(PDF_KALENDER, "Wettspielkalender 2026 (PDF)", 3, ext=True)}
        </div>
      </article>
    </div>
    <p class="note rv" style="margin-top:2.6rem">Firmenveranstaltungen — alles aus einer Hand:
    Einladung, Begrüßung, Betreuung, Bewirtung und Siegerehrung.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl rv">05 — Mitglieder-Vorteile</p>
    </div>
    <div class="flist rv">
      <div><b>Stammtisch</b><span>Mitglieder-Stammtisch im Clubhausrestaurant Windfang</span></div>
      <div><b>Coast Collection</b><span>10 % Ermäßigung auf den Zimmerpreis bei Direktbuchung</span></div>
      <div><b>Golfanlage Hohwacht</b><span>kostenfreie Nutzung der Driving Range</span></div>
    </div>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/bahn15.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Werden Sie Teil des Clubs</p>
    <h2 class="d2 split">Ihre <em>Mitgliedschaft.</em></h2>
    <div class="rv" data-d="1">
      <a class="btn-solid magnet" href="mitgliedschaft.html">Mitgliedschaften ansehen</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# MITGLIEDSCHAFT
# ==================================================================
PAGES["mitgliedschaft.html"] = head(
    "Mitgliedschaften — von Players Lodge bis Infinity | Golfresort Strandgrün",
    "Alle Mitgliedschaften des Golfclub Timmendorfer Strand: Players Lodge ab "
    "299 €, Südplatz-, Wochentags- und Infinity-Modelle sowie Jugendtarife."
) + header("mitgliedschaft.html") + hero(
    "galerie-haupt.jpg",
    "Mitgliedschaft",
    "Ihr Spiel. <em>Ihr Modell.</em>",
    "Acht Mitgliedschaften — vom flexiblen Einstieg bis Infinity. Immer "
    "inklusive: DGV-Ausweis, Handicap-Führung und die Übungseinrichtungen "
    "in Timmendorfer Strand und Hohwacht.",
    meta=[("Einstieg", "ab 299,00 € im Jahr"), ("Modelle", "8"),
          ("Partneranlage", "Golfanlage Hohwacht")],
    page=True
) + f"""
<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">01 — Übersicht</p>
      <p class="lbl lbl--dim rv" data-d="1">Jahresgebühren 2026</p>
    </div>
    <table class="ftable rv">
      <tr><th>Mitgliedschaft</th><th>Spielrecht</th><th>Jahresgebühr</th></tr>
      <tr><td>Players Lodge</td><td><small>Nord- &amp; Südplatz sowie Hohwacht gegen Greenfee −20 % ·
        1 Greenfee pro Jahr kostenfrei</small></td><td>299,00 €</td></tr>
      <tr><td>Südplatz Wochentags</td><td><small>Südplatz Mo–Do · Nordplatz + Hohwacht −20 % ·
        monatlich 75,00 €</small></td><td>779,00 €</td></tr>
      <tr><td>Südplatz</td><td><small>Südplatz Mo–So · Nordplatz + Hohwacht −20 % ·
        monatlich 89,00 €</small></td><td>939,00 €</td></tr>
      <tr><td>Wochentags</td><td><small>Nord- &amp; Südplatz Mo–Do (außer Feiertage) ·
        monatlich 95,00 €</small></td><td>1.039,00 €</td></tr>
      <tr><td>Südplatz Plus</td><td><small>Südplatz Mo–So · Nordplatz täglich ab 15:00 Uhr ·
        monatlich 115,00 €</small></td><td>1.249,00 €</td></tr>
      <tr><td>Infinity Golf</td><td><small>Süd-, Nordplatz und Hohwacht Mo–So ·
        monatlich 149,00 €</small></td><td>1.699,00 €</td></tr>
      <tr><td>80+</td><td><small>Leistungen wie Infinity, ab 80 Jahren ·
        monatlich 74,50 €</small></td><td>849,50 €</td></tr>
    </table>
    <p class="note rv" data-d="1">Alle Beträge zzgl. ca. 35,00 € Verbandsgebühren (DGV/LGV);
    einmalige Bearbeitungsgebühr 99,00 € (entfällt bei Players Lodge).
    Bei Players Lodge gilt der DGV-Ausweis mit Regionalitätskennzeichnung „R"
    für Wohnsitze im 70-km-Radius.</p>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl rv">02 — Kinder &amp; Jugendliche</p>
      <p class="lbl lbl--dim rv" data-d="1">Stichtag 1. Januar</p>
    </div>
    <div class="flist rv">
      <div><b>0–12 Jahre</b><span>kostenfrei · Zweitmitglied 100,00 €</span></div>
      <div><b>13–18 Jahre</b><span>99,00 € · Zweitmitglied 299,00 €</span></div>
      <div><b>18–27 Jahre</b><span>449,00 € · Zweitmitglied 749,00 €</span></div>
    </div>
    <p class="note rv" data-d="1">Uneingeschränktes Spielrecht auf beiden Plätzen inklusive
    Übungseinrichtungen und Driving Range, Montag bis Sonntag. Ab 19 Jahren
    ist eine Ausbildungs- oder Studienbescheinigung erforderlich.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap intro-grid">
    <div class="intro-aside">
      <p class="lbl rv">03 — Infinity-Vorteile</p>
      <div class="line-h"></div>
      <p class="rv" data-d="1">Das Rundum-Modell<br>für Vielspieler.</p>
    </div>
    <div>
      <div class="flist rv">
        <div><b>Golfshops</b><span>10 % Rabatt in Timmendorfer Strand und Hohwacht</span></div>
        <div><b>Startzeiten</b><span>online bis 14 Tage im Voraus</span></div>
        <div><b>RPR-Runden</b><span>kostenfrei</span></div>
        <div><b>Turniere</b><span>Members Cup und Mittsommernachts-Vierer kostenfrei · teils vergünstigtes Nenngeld</span></div>
        <div><b>Service</b><span>10 % Rabatt beim Griffwechsel</span></div>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-panel">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl rv">04 — Mietsachen</p>
      <p class="lbl lbl--dim rv" data-d="1">Für Mitglieder</p>
    </div>
    <div class="flist rv">
      <div><b>Caddie-Stellplatz</b><span>145,00 €</span></div>
      <div><b>Caddie-Box groß</b><span>209,00 €</span></div>
      <div><b>Caddie-Box klein</b><span>159,00 €</span></div>
      <div><b>Batteriebox</b><span>65,00 €</span></div>
      <div><b>Umkleideschrank groß</b><span>99,00 €</span></div>
      <div><b>Umkleideschrank klein</b><span>69,00 €</span></div>
      <div><b>Wertfach</b><span>45,00 €</span></div>
    </div>
    <p class="note rv" data-d="1">Weitere Vergünstigungen: 20 % Greenfee-Ermäßigung auf der
    Golfanlage Hof Hausen vor der Sonne sowie auf dem Golfplatz Eichenheim,
    Kitzbühel (Österreich).</p>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/anlage-2.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Aufnahmeantrag 2026</p>
    <h2 class="d2 split">Willkommen <em>im Club.</em></h2>
    <div class="rv" data-d="1" style="display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center">
      <a class="btn-solid magnet" href="{PDF_ANTRAG}" target="_blank" rel="noopener">Aufnahmeantrag (PDF)</a>
      <a class="btn-ghost" href="{PDF_ANTRAG_J}" target="_blank" rel="noopener">Jugend-Antrag (PDF)</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# RESTAURANT & FEIERN
# ==================================================================
PAGES["restaurant.html"] = head(
    "Restaurants, Bar & Veranstaltungen | Golfresort Strandgrün",
    "Restaurant Windfang, Trattoria del Campo und Hollywood Bar — dazu drei "
    "Tagungsräume für bis zu 200 Personen im Strandgrün Golf- & Spa Resort."
) + header("restaurant.html") + hero(
    "windfang-innen.jpg",
    "Genuss",
    "Genuss <em>am Grün</em>",
    "Zwei Restaurants und eine Bar — jede Lokalität mit eigenem Stil, "
    "mitten im Strandgrün Golf- &amp; Spa Resort.",
    meta=[("Restaurants", "Windfang · Trattoria del Campo"),
          ("Bar", "Hollywood Bar"), ("Tagungsräume", "3 — bis 200 Personen")],
    page=True
) + f"""
<section class="sec">
  <div class="wrap">
    <div class="ecards">
      <article class="ecard">
        <div class="ec-media rv-img"><img src="assets/img/windfang.jpg" alt="Restaurant Windfang im Clubhaus"></div>
        <div class="ec-body">
          <p class="lbl rv">01 — Im Clubhaus</p>
          <h3 class="d3 split">Restaurant Windfang</h3>
          <p class="rv" data-d="1">Ländlich modern, mit dem bekannten Blick über die Golfanlage
          und den Oeverdieker See: Im Windfang gibt es klassische Snacks wie
          Sandwiches und Salate — hier werden auch Frühstück und Abendessen
          der Hotelgäste serviert.</p>
        </div>
      </article>
      <article class="ecard">
        <div class="ec-media rv-img"><img src="assets/img/hollywood-bar.jpg" alt="Hollywood Bar im Friesenhaus"></div>
        <div class="ec-body">
          <p class="lbl rv">02 — Im Friesenhaus</p>
          <h3 class="d3 split">Trattoria del Campo &amp; Hollywood Bar</h3>
          <p class="rv" data-d="1">Die Trattoria del Campo lädt rustikal-mediterran zur
          kulinarischen Reise in den Mittelmeerraum mit italienischen
          Spezialitäten. Nebenan mixt die von Leinwandhelden inspirierte
          Hollywood Bar am Abend Cocktails.</p>
        </div>
      </article>
    </div>
  </div>
</section>

<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.08" src="assets/img/event-raum.jpg" alt="Veranstaltungsraum Walter Hagen im Hotel Strandgrün"></div></div>
  <div class="ch-body">
    <p class="lbl rv">03 — Veranstaltungen</p>
    <h2 class="d2 split">Feiern &amp; Tagen <em>an der Ostsee</em></h2>
    <p class="rv" data-d="1">Ob Familienfeier, Jubiläum oder Meeting: In den drei Tagungsräumen
    des Hotels Strandgrün finden kleinere Runden bis hin zu großen Tagungen
    für bis zu 200 Personen Platz — mit Tageslicht und Beamer, persönlich
    betreut.</p>
    <p class="rv" data-d="2">Für Feierlichkeiten stehen separierte Bereiche in den Restaurants
    und Veranstaltungsräumen bereit; übers Jahr verteilt lädt das Hotel zu
    kleinen Events.</p>
    <div class="rv" data-d="3" style="display:flex;gap:1.2rem;flex-wrap:wrap">
      <a class="btn-solid magnet" href="{MEETING}" target="_blank" rel="noopener">Verfügbarkeit prüfen</a>
      <a class="btn-ghost" href="tel:+49450370 44 00">04503 70 44 00</a>
    </div>
  </div>
</section>

<section class="sec sec-panel">
  <div class="wrap">
    <div class="sec-head"><p class="lbl rv">04 — Einblicke</p></div>
    <div class="mosaic">
      <div class="rv-img w12"><img src="assets/img/event-2.jpg" alt="Festlich eingedeckter Veranstaltungsraum"></div>
    </div>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/clubhaus.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Wir planen mit Ihnen</p>
    <h2 class="d2 split">Ihr Fest. <em>Unser Haus.</em></h2>
    <div class="rv" data-d="1">
      <a class="btn-solid magnet" href="kontakt.html">Kontakt aufnehmen</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# KONTAKT & ANFAHRT
# ==================================================================
PAGES["kontakt.html"] = head(
    "Kontakt, Team & Anfahrt | Golfresort Strandgrün",
    "Kontakt zum Golfresort Strandgrün: Am Golfplatz 3, 23669 Timmendorfer "
    "Strand — Telefon, Team, Öffnungszeiten der Rezeption und Anfahrt."
) + header("kontakt.html") + hero(
    "kontakt-kopf.jpg",
    "Kontakt",
    "Kontakt <em>&amp; Anfahrt</em>",
    "Die Rezeption im Clubhaus ist täglich für Sie erreichbar.",
    meta=[("Adresse", "Am Golfplatz 3 · 23669 Timmendorfer Strand"),
          ("Telefon", "+49 (0) 4503 70 44 00"),
          ("E-Mail", "info@gc-timmendorf.de")],
    page=True
) + f"""
<section class="sec sec-paper">
  <div class="wrap">
    <div class="intro-grid">
      <div class="intro-aside">
        <p class="lbl rv">01 — Kontaktdaten</p>
        <div class="line-h"></div>
      </div>
      <div>
        <div class="flist rv">
          <div><b>Anschrift</b><span>Golfanlage Timmendorfer Strand<br>Am Golfplatz 3 · 23669 Timmendorfer Strand</span></div>
          <div><b>Telefon</b><span><a href="tel:+49450370 44 00">+49 (0) 4503 70 44 00</a></span></div>
          <div><b>E-Mail</b><span><a href="mailto:info@gc-timmendorf.de">info@gc-timmendorf.de</a></span></div>
          <div><b>Rezeption Januar</b><span>täglich 10:00 – 16:00 Uhr</span></div>
          <div><b>Rezeption Februar–Dezember</b><span>täglich 08:00 – 22:00 Uhr</span></div>
          <div><b>Nachtportier</b><span><a href="tel:+491729260812">0172 926 08 12</a></span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">02 — Das Team</p>
      <p class="lbl lbl--dim rv" data-d="1">der Golfanlage Timmendorfer Strand</p>
    </div>
    <div class="flist rv">
      <div><b>Geschäftsführer</b><span>Christian von Oven</span></div>
      <div><b>Golf- &amp; Resortleitung</b><span>Birgit Krause</span></div>
      <div><b>Headgreenkeeper</b><span>Gunnar Freese</span></div>
      <div><b>Headranger</b><span>Hans-Peter Schartl</span></div>
      <div><b>Restaurantleiter</b><span>Jörg Bromund</span></div>
      <div><b>Küche Trattoria</b><span>Onofrio Comes</span></div>
      <div><b>Service Trattoria</b><span>Marcelin Bryan Cruz</span></div>
      <div><b>Hausdame</b><span>Patricia Alvarez</span></div>
      <div><b>Veranstaltung</b><span>Juliane Mixa</span></div>
    </div>
    <p class="note rv" data-d="1">Die Golflehrer der Coast Golf Academy — Head Pro
    Danny De Richter, Frederic Dechavanne und Dan Briant — finden Sie auf der
    <a href="academy.html"><strong>Academy-Seite</strong></a>.</p>
  </div>
</section>

<section class="sec sec-panel">
  <div class="wrap intro-grid">
    <div class="intro-aside">
      <p class="lbl rv">03 — Anfahrt</p>
      <div class="line-h"></div>
      <p class="rv" data-d="1">Das Resort liegt am<br>Oeverdieker Weg 15–19;<br>Stichstraße „Am Golfplatz".</p>
    </div>
    <div>
      <h2 class="d3 split">So finden Sie <em>zu uns</em></h2>
      <div class="flist rv" data-d="1">
        <div><b>Von der A1 (Hamburg/Puttgarden)</b><span>Ausfahrt 18-Ratekau → Hemmelsdorfer Straße →
        Seestraße → Lübecker Straße → Bergstraße → Bahnhofstraße → Schwedenweg →
        Oeverdieker Weg → Am Golfplatz</span></div>
        <div><b>Von Scharbeutz</b><span>Abfahrt Pansdorf/Scharbeutz Süd → B76 Richtung
        Timmendorfer Strand → an der Fußgängerbrücke rechts in die Lindenallee →
        Kattenhöhler Weg → Oeverdieker Weg</span></div>
        <div><b>In Timmendorfer Strand</b><span>300 m hinter Ortsschild/Tankstelle links
        Richtung Golfplatz — der Ausschilderung folgen</span></div>
        <div><b>E-Autos</b><span>Lademöglichkeiten im Torhaus und im Landhaus</span></div>
      </div>
    </div>
  </div>
</section>

<section class="cta-panel">
  <div class="cp-bg"><img class="plx" data-plx="0.06" src="assets/img/anlage-3.jpg" alt=""></div>
  <div class="cp-inner">
    <p class="lbl rv">Wir freuen uns auf Sie</p>
    <h2 class="d2 split">Bis bald <em>am ersten Abschlag.</em></h2>
    <div class="rv" data-d="1">
      <a class="btn-solid magnet" href="{TEETIME}" target="_blank" rel="noopener">Startzeit buchen</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# IMPRESSUM / DATENSCHUTZ (Fragmente vom Subagenten)
# ==================================================================
def frag(name):
    p = os.path.join(SCRATCH, f"frag-{name}.html")
    with open(p, encoding="utf-8") as f:
        return f.read()

PAGES["impressum.html"] = head(
    "Impressum | Golfresort Strandgrün",
    "Impressum der Golfanlage Seeschlösschen Timmendorfer Strand GmbH & Co. KG."
) + header("impressum.html") + hero(
    "anlage-4.jpg", "Rechtliches", "Impressum", page=True
) + frag("impressum") + FOOTER

PAGES["datenschutz.html"] = head(
    "Datenschutzerklärung | Golfresort Strandgrün",
    "Datenschutzerklärung des Golfresort Strandgrün Timmendorfer Strand."
) + header("datenschutz.html") + hero(
    "anlage-5.jpg", "Rechtliches", "Datenschutz", page=True
) + frag("datenschutz") + FOOTER


if __name__ == "__main__":
    os.makedirs(SITE, exist_ok=True)
    for fname, html in PAGES.items():
        with open(os.path.join(SITE, fname), "w", encoding="utf-8") as f:
            f.write(html)
        print("wrote", fname, len(html), "bytes")
