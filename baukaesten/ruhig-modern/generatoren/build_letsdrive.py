#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator: Fahrschule Let’s Drive Kiel — Baukasten „Ruhig-Modern“.

Erzeugt alle HTML-Seiten + sitemap.xml + robots.txt nach
webseiten/lets-drive-kiel/. Fasst css/, js/ und assets/ NICHT an.

Inhalte ausschließlich aus PLAN §3 bzw. .preview-cache/ldk/* (Original-Website)
– nichts erfunden; Unbelegtes ist als [PLATZHALTER: …] markiert.

Aufruf (vom Repo-Root):
    python3 baukaesten/ruhig-modern/generatoren/build_letsdrive.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # …/Web-Projekte
SITE = ROOT / "webseiten" / "lets-drive-kiel"
BASE = "https://www.lets-drive-kiel.de/"
TODAY = "2026-10-26"

# ------------------------------------------------------------------
# Stammdaten (PLAN §3)
# ------------------------------------------------------------------
BRAND = "Let’s Drive Kiel"
FULL = "Fahrschule Let’s Drive Kiel"
OWNER = "Andreas Glander"
TEL_HREF = "tel:+4943186923"
TEL = "0431&nbsp;86923"
FAX = "0431&nbsp;8065298"
MAIL = "info@lets-drive-kiel.de"
STREET = "Knooper Weg&nbsp;193"
CITY = "24118&nbsp;Kiel"
FB = "https://www.facebook.com/people/Fahrschule-Lets-Drive-Kiel/100004820191887"
ROUTE = "https://www.google.com/maps/dir/?api=1&amp;destination=Knooper+Weg+193,+24118+Kiel"
MAP_EMBED = "https://www.google.com/maps?q=Knooper+Weg+193,+24118+Kiel&amp;output=embed"
APPLY = f"mailto:{MAIL}?subject=Bewerbung%20Fahrlehrer"

# (Label, JS-Wochentage nach Date.getDay(): 0 = So … 6 = Sa, von, bis)
HOURS = [
    ("Mo, Mi, Fr", "1,3,5", "12:00", "16:00"),
    ("Di, Do", "2,4", "15:00", "19:00"),
    ("Sa, So", "6,0", None, None),
]

NAV = [
    ("index.html", "Start"),
    ("fahrerlaubnisklassen.html", "Führerscheinklassen"),
    ("theorieunterricht.html", "Theorie"),
    ("jobs.html", "Jobs"),
    ("kontakt.html", "Kontakt"),
]
LEGAL_NAV = [
    ("impressum.html", "Impressum"),
    ("datenschutz.html", "Datenschutz"),
    ("agb.html", "AGB"),
]

# ------------------------------------------------------------------
# SVG-Bausteine
# ------------------------------------------------------------------
# Original-Logo, vektorisiert mit trace_logo.py (Seitenverhältnis 2000:1050):
# logo.svg = Originalfarben (helle Flächen), logo-dark.svg = für dunkle Flächen
LOGO_W, LOGO_H = 200, 105

# Manrope enthält kein ★ → Sterne als SVG (Vorgabe Integrator)
STAR = ('<svg class="star" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.3 5.9.9-4.25 '
        '4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z" fill="currentColor"/></svg>')

ARROW = (
    '<svg class="btn-arrow" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" '
    'focusable="false"><path d="M4 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" '
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
)

# Linien-Icons 24×24, stroke 1.6, currentColor
ICONS = {
    "gauge": '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4.2-5.2"/>'
             '<path d="M6.2 12.2l1.1.7M12 6.8V8M17.8 12.2l-1.1.7"/><circle cx="12" cy="17" r="1.2"/>',
    "pin": '<path d="M12 21s-7-6.1-7-11.4A7 7 0 0 1 19 9.6C19 14.9 12 21 12 21z"/>'
           '<circle cx="12" cy="9.6" r="2.6"/>',
    "chat": '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.2 7.5L3.5 20.5l1.5-4.6a8.4 8.4 0 1 1 15.5-4.3z"/>'
            '<path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
    "heart": '<path d="M12 20s-7.4-4.5-9.1-9.3C1.7 7.3 3.9 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4'
             'c3.4 0 5.6 3.3 4.4 6.7C19.4 15.5 12 20 12 20z"/>',
    "tag": '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l9.2 9.2-8.8 8.8-9.2-9.2z"/>'
           '<circle cx="8.2" cy="8.2" r="1.6"/>',
    "users": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/>'
             '<path d="M15.5 4.7a3.5 3.5 0 0 1 0 6.6M17.8 14a6.5 6.5 0 0 1 3.7 6"/>',
    "phone": '<path d="M5.2 3.5h3.3l1.6 4.6-2.3 1.5a12 12 0 0 0 6.6 6.6l1.5-2.3 4.6 1.6v3.3a1.8 1.8 0 0 1-2 1.8'
             'A16.6 16.6 0 0 1 3.4 5.5a1.8 1.8 0 0 1 1.8-2z"/>',
    "fax": '<path d="M7 8V3.5h10V8"/><rect x="3.5" y="8" width="17" height="8.5" rx="2"/>'
           '<path d="M7 13.5h10v7H7z"/><path d="M17 11h.01"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.6 6.6 12 12.6l8.4-6"/>',
    "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "facebook": '<path d="M14 21v-7.5h2.8l.5-3.4H14V8.1c0-1 .4-1.7 1.8-1.7h1.7V3.4a20 20 0 0 0-2.5-.2'
                'c-2.6 0-4.1 1.5-4.1 4.3v2.6H8v3.4h2.9V21"/>',
    "book": '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h13v14h-13a2 2 0 0 0-2 2z"/><path d="M4.5 19.5a2 2 0 0 0 2 2h13v-4"/>'
            '<path d="M9 8h6"/>',
    "plus": '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2v7.6M8.2 12h7.6"/>',
    "moto": '<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/>'
            '<path d="M5.5 16l3.4-6h5.3l4.3 6"/><path d="M13.2 10l-1.4-3H9.5M8.9 10l3.3 6h2.3"/>',
    "trailer": '<rect x="2.5" y="6.5" width="12.5" height="8.5" rx="1.2"/><circle cx="8.7" cy="17.3" r="2"/>'
               '<path d="M15 13h5.5"/><circle cx="21" cy="13" r=".6"/>',
    "check": '<path d="M5 12.5l4.2 4.2L19 7"/>',
}


def icon(name, size=22):
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="currentColor" '
            f'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
            f'focusable="false">{ICONS[name]}</svg>')


# ------------------------------------------------------------------
# Bilder (PLAN §5) — (verfügbare Breiten, width, height des größten)
# ------------------------------------------------------------------
IMG = {
    "hero": ([960, 1600, 2400], 2400, 1350),
    "fahrstunde": ([700, 1100], 1100, 1375),
    "theorie": ([800, 1400], 1400, 933),
    "motorrad": ([800, 1400], 1400, 933),
    "anhaenger": ([800, 1400], 1400, 933),
    "schluessel": ([800, 1400], 1400, 933),
}
SIZES_SPLIT = "(min-width: 1240px) 552px, (min-width: 900px) 44vw, 92vw"
SIZES_WIDE = "(min-width: 1240px) 1200px, 92vw"


def img(name, alt, sizes, lazy=True, extra=""):
    widths, w, h = IMG[name]
    srcset = ", ".join(f"assets/img/{name}-{x}.webp {x}w" for x in widths)
    src = f"assets/img/{name}-{widths[-1]}.webp"
    load = ' loading="lazy" decoding="async"' if lazy else ' decoding="async"'
    return (f'<img src="{src}" srcset="{srcset}" sizes="{sizes}" alt="{alt}" '
            f'width="{w}" height="{h}"{load}{extra}>')


HERO_SRCSET = ", ".join(f"assets/img/hero-{x}.webp {x}w" for x in IMG["hero"][0])

# ------------------------------------------------------------------
# Kleine Helfer
# ------------------------------------------------------------------
def btn(href, label, kind="primary", arrow=True, extra=""):
    return f'<a class="btn btn-{kind}" href="{href}"{extra}>{label}{ARROW if arrow else ""}</a>'


def d(i):
    """Staffel-Klasse rv-d1..rv-d3 für Rasterelemente."""
    return f"rv-d{(i % 3) + 1}"


def section_head(eyebrow, h2, lead=None, center=False):
    cls = "section-head center" if center else "section-head"
    lead_html = f'\n      <p class="lead rv rv-d2">{lead}</p>' if lead else ""
    return f"""<div class="{cls}">
      <p class="eyebrow rv">{eyebrow}</p>
      <h2 class="rv rv-d1">{h2}</h2>{lead_html}
    </div>"""


def facts(rows, cls="facts rv rv-d2"):
    items = "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in rows)
    return f'<dl class="{cls}">{items}</dl>'


def hours_dl():
    rows = []
    for label, days, a, b in HOURS:
        if a:
            rows.append(f'<div data-days="{days}" data-from="{a}" data-to="{b}"><dt>{label}</dt>'
                        f'<dd>{a}&nbsp;– {b}&nbsp;Uhr</dd></div>')
        else:
            rows.append(f'<div data-days="{days}"><dt>{label}</dt><dd>geschlossen</dd></div>')
    return '<dl class="hours">' + "".join(rows) + "</dl>"


def contact_list(fax=True, address=True, facebook=False):
    items = [
        ("phone", "Telefon", f'<a href="{TEL_HREF}">{TEL}</a>'),
    ]
    if fax:
        items.append(("fax", "Telefax", f"<span>{FAX}</span>"))
    items.append(("mail", "E-Mail", f'<a href="mailto:{MAIL}">{MAIL}</a>'))
    if address:
        items.append(("pin", "Adresse", f"<span>{STREET}, {CITY}</span>"))
    if facebook:
        items.append(("facebook", "Facebook",
                      f'<a href="{FB}" target="_blank" rel="noopener">Fahrschule Let’s Drive Kiel</a>'))
    lis = "\n".join(
        f'        <li><span class="card-icon">{icon(ic)}</span><div><small>{lbl}</small>{val}</div></li>'
        for ic, lbl, val in items)
    return f'<ul class="contact-list">\n{lis}\n      </ul>'


def cta(eyebrow, h2, actions=None):
    if actions is None:
        actions = (btn(TEL_HREF, f"{TEL} anrufen", "light")
                   + btn("kontakt.html", "Nachricht schreiben", "ghost", arrow=False))
    return f"""<section class="cta-band section-dark">
  <svg class="cta-road" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path data-draw d="M-40 372C220 372 330 150 610 158s430 214 640 118c120-55 170-170 230-226" fill="none"/></svg>
  <div class="wrap cta-in">
    <div>
      <p class="eyebrow rv">{eyebrow}</p>
      <h2 class="rv rv-d1">{h2}</h2>
    </div>
    <div class="cta-actions rv rv-d2">{actions}</div>
  </div>
</section>
"""


def hero_page(crumb, eyebrow, h1, lead=None, media=None, actions=None):
    crumbs = (f'<nav class="crumbs rv" aria-label="Brotkrumen"><a href="index.html">Start</a>'
              f'<span aria-hidden="true">/</span><span>{crumb}</span></nav>\n    '
              if crumb else "")
    eb = f'<p class="eyebrow rv rv-d1">{eyebrow}</p>\n    ' if eyebrow else ""
    ld = f'\n    <p class="lead rv rv-d3">{lead}</p>' if lead else ""
    ac = f'\n    <div class="hero-actions rv rv-d4">{actions}</div>' if actions else ""
    md = f'\n  <figure class="hero-page-media rv-img">{media}</figure>' if media else ""
    return f"""<section class="hero hero-page">
  <div class="wrap hero-page-in">
    {crumbs}{eb}<h1 class="rv rv-d2">{h1}</h1>{ld}{ac}
  </div>{md}
</section>
"""


# ------------------------------------------------------------------
# <head>, Header, Footer
# ------------------------------------------------------------------
def head(fname, title, desc, noindex=False, extra=""):
    url = BASE if fname == "index.html" else BASE + fname
    is404 = fname == "404.html"
    canon = "" if is404 else f'<link rel="canonical" href="{url}">\n'
    ogurl = "" if is404 else f'<meta property="og:url" content="{url}">\n'
    robots = '<meta name="robots" content="noindex, follow">\n' if noindex else ""
    full_title = f"{title} · {FULL}"
    return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{full_title}</title>
<meta name="description" content="{desc}">
{robots}{canon}<meta name="theme-color" content="#151414">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{FULL}">
<meta property="og:title" content="{full_title}">
<meta property="og:description" content="{desc}">
{ogurl}<meta property="og:image" content="{BASE}assets/img/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="de_DE">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
{extra}<link rel="stylesheet" href="css/style.css">
<script>document.documentElement.classList.add('js')</script>
</head>
"""


def brand_link(on_dark=False):
    """Logo-Link. Header: beide Varianten, CSS zeigt je nach Untergrund eine;
    Footer (immer dunkel): nur die dunkle Variante."""
    # Dunkle Variante lazy: auf Unterseiten bleibt sie im Header unsichtbar
    # (display:none) und wird dann erst für den Footer geladen.
    img = (f'<img class="brand-logo{{cls}}" src="assets/img/{{src}}" alt="" '
           f'width="{LOGO_W}" height="{LOGO_H}"{{lazy}} decoding="async">')
    if on_dark:
        logos = img.format(cls="", src="logo-dark.svg", lazy=' loading="lazy"')
    else:
        logos = (img.format(cls=" brand-logo-light", src="logo.svg", lazy="")
                 + img.format(cls=" brand-logo-dark", src="logo-dark.svg", lazy=' loading="lazy"'))
    return f'<a class="brand" href="index.html" aria-label="{BRAND} – Startseite">{logos}</a>'


def nav_items(active, indent):
    out = []
    for href, label in NAV:
        cur = ' aria-current="page"' if href == active else ""
        out.append(f'{indent}<li><a href="{href}"{cur}>{label}</a></li>')
    return "\n".join(out)


def header(active, body_cls):
    return f"""<body class="{body_cls}">
<a class="skip" href="#main">Zum Inhalt springen</a>
<header class="site-header" data-header>
  <div class="wrap header-in">
    {brand_link()}
    <nav class="nav" aria-label="Hauptnavigation">
      <ul>
{nav_items(active, "        ")}
      </ul>
    </nav>
    <a class="btn btn-primary btn-sm header-cta" href="{TEL_HREF}">{TEL}</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menü öffnen"><span></span><span></span></button>
  </div>
  <div class="mobile-nav" id="mobile-nav" hidden>
    <div class="wrap mobile-nav-in">
      <nav aria-label="Mobile Navigation">
        <ul>
{nav_items(active, "          ")}
        </ul>
      </nav>
      <div class="mobile-nav-meta">
        <a class="btn btn-primary" href="{TEL_HREF}">{TEL} anrufen</a>
        <p><strong>Bürozeiten</strong><br>Mo, Mi, Fr 12–16&nbsp;Uhr · Di, Do 15–19&nbsp;Uhr</p>
      </div>
    </div>
  </div>
</header>
<main id="main">
"""


def footer():
    pages = "\n".join(f'          <li><a href="{h}">{l}</a></li>' for h, l in NAV + LEGAL_NAV)
    return f"""</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      {brand_link(on_dark=True)}
      <p>Mehr als nur fahren – wir bringen dich sicher ans Ziel. Deine Fahrschule am Ravensberg in Kiel.</p>
      <a class="footer-social" href="{FB}" target="_blank" rel="noopener" aria-label="{FULL} auf Facebook (öffnet in neuem Tab)">{icon("facebook", 20)}<span>Facebook</span></a>
    </div>
    <div class="footer-col">
      <h2 class="footer-title">Kontakt</h2>
      <address>{FULL}<br>{STREET}<br>{CITY}</address>
      <p><a href="{TEL_HREF}">Telefon {TEL}</a><br><a href="mailto:{MAIL}">{MAIL}</a></p>
    </div>
    <div class="footer-col">
      <h2 class="footer-title">Bürozeiten</h2>
      {hours_dl()}
    </div>
    <div class="footer-col">
      <h2 class="footer-title">Seiten</h2>
      <nav aria-label="Fußnavigation">
        <ul class="footer-links">
{pages}
        </ul>
      </nav>
    </div>
  </div>
  <div class="wrap footer-base">
    <p>© 2026 {FULL} · Inh. {OWNER}</p>
    <a class="to-top" href="#main">Nach oben</a>
  </div>
</footer>
<script src="js/script.js" defer></script>
</body>
</html>
"""


def page(fname, slug, title, desc, body, active="", dark_hero=False, noindex=False, extra_head=""):
    body_cls = f"page-{slug}" + (" has-dark-hero" if dark_hero else "")
    return (head(fname, title, desc, noindex=noindex, extra=extra_head)
            + header(active, body_cls) + body + footer())


PAGES = {}

# ==================================================================
# STARTSEITE
# ==================================================================
LD = {
    "@context": "https://schema.org",
    "@type": "DrivingSchool",
    "name": FULL,
    "url": BASE,
    "image": BASE + "assets/img/og-image.jpg",
    "logo": BASE + "assets/img/logo.png",
    "telephone": "+49 431 86923",
    "faxNumber": "+49 431 8065298",
    "email": MAIL,
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "Knooper Weg 193",
        "postalCode": "24118",
        "addressLocality": "Kiel",
        "addressRegion": "Schleswig-Holstein",
        "addressCountry": "DE",
    },
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Wednesday", "Friday"],
         "opens": "12:00", "closes": "16:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Tuesday", "Thursday"],
         "opens": "15:00", "closes": "19:00"},
    ],
    "sameAs": [FB],
}

INDEX_HEAD = (
    f'<link rel="preload" as="image" href="assets/img/hero-1600.webp" imagesrcset="{HERO_SRCSET}" '
    f'imagesizes="100vw" fetchpriority="high">\n'
    f'<script type="application/ld+json">{json.dumps(LD, ensure_ascii=False)}</script>\n'
)

USPS = [
    ("gauge", "Intensivkurs auf Anfrage",
     "Du möchtest schneller ans Ziel? Auf Anfrage planen wir deinen Intensivkurs – individuell und flexibel."),
    ("pin", "Langjährige Erfahrung in Kiel",
     "Wir bilden seit vielen Jahren in Kiel aus. Diese Erfahrung geben wir in jeder Fahrstunde an dich weiter."),
    ("chat", "Persönliche Beratung",
     "Persönliche Beratung statt Systemausbildung: Wir schauen auf dich und deine Situation – nicht auf ein starres Schema."),
    ("heart", "Ruhige, empathische Fahrlehrer",
     "Geduld und ein ruhiger Ton gehören bei uns dazu. So lernst du entspannt – ohne Stress und ohne Druck."),
    ("tag", "Transparente Preise",
     "Transparente Preise und ehrliche Beratung: Unsere aktuellen Preise bekommst du offen – persönlich, telefonisch oder per Mail."),
    ("users", "Echte Begleitung",
     "Echte Menschen, echte Begleitung, echter Lernerfolg – wir sind von der Anmeldung bis zur Prüfung an deiner Seite."),
]

CLASS_CARDS = [
    ("klasse-b", "B", "Auto", "B · BF17 · B197 · B196"),
    ("klasse-be", "BE", "Anhänger", "BE · B96"),
    ("klasse-a1", "A", "Motorrad", "A1 · A2 · A"),
]

STEPS = [
    ("Beratung &amp; Anmeldung",
     "Komm zu unseren Bürozeiten in die Fahrschule am Knooper Weg. Wir beraten dich persönlich und finden gemeinsam die passende Klasse."),
    ("Theorieunterricht",
     "Dienstags und donnerstags von 19:00 bis 20:30&nbsp;Uhr in unserem Schulungsraum. Der Einstieg ist jederzeit möglich."),
    ("Praktische Ausbildung",
     "Übungsstunden und Sonderfahrten – Überland, Autobahn und Beleuchtung – auf modernen Schalt- oder Automatikfahrzeugen, in deinem Tempo."),
    ("Prüfung",
     "Nach bestandener Theorie- und Praxisprüfung erhältst du deinen Führerschein. Wir bereiten dich ruhig und gründlich darauf vor."),
]

QUOTES = [
    ("Top Fahrschule! Super geduldiger Fahrlehrer, faire Preise, kein Druck.", "Luisa N."),
    ("Andreas und sein Team nehmen sich Zeit für jeden Schüler und erklären alles verständlich und "
     "mit viel Ruhe. Man fühlt sich hier wirklich gut aufgehoben.", "Ilke M."),
    ("Super Organisation und eine fundierte, zugleich aber auch humorvolle Ausbildung.", "Maria R."),
]

usp_html = "\n".join(
    f"""      <article class="card usp rv {d(i)}">
        <span class="card-icon">{icon(ic)}</span>
        <h3>{t}</h3>
        <p>{p}</p>
      </article>""" for i, (ic, t, p) in enumerate(USPS))

class_cards_html = "\n".join(
    f"""      <a class="class-card rv {d(i)}" href="fahrerlaubnisklassen.html#{cid}">
        <span class="class-badge">{badge}</span>
        <h3>{t}</h3><p>{sub}</p>
        <span class="link-arrow">Mehr erfahren</span>
      </a>""" for i, (cid, badge, t, sub) in enumerate(CLASS_CARDS))

steps_html = "\n".join(
    f"""      <li class="step rv rv-d{i + 1}"><span class="step-line" data-line aria-hidden="true"></span><span class="step-no">{i + 1:02d}</span>
        <h3>{t}</h3>
        <p>{p}</p>
      </li>""" for i, (t, p) in enumerate(STEPS))

quotes_html = "\n".join(
    f"""      <figure class="quote rv {d(i)}">
        <div class="stars" role="img" aria-label="5 von 5 Sternen">{STAR * 5}</div>
        <blockquote><p>{q}</p></blockquote>
        <figcaption><strong>{who}</strong><span>Google-Bewertung · 08/2025</span></figcaption>
      </figure>""" for i, (q, who) in enumerate(QUOTES))

INDEX_BODY = f"""<section class="hero hero-home">
  <div class="hero-media"><img src="assets/img/hero-1600.webp" srcset="{HERO_SRCSET}" sizes="100vw" alt="Weißes Auto auf einer Uferstraße an der Förde, im Hintergrund Hafenkräne und Segelmasten" width="2400" height="1350" fetchpriority="high" decoding="async"></div>
  <div class="wrap hero-in">
    <p class="eyebrow rv">Fahrschule in Kiel-Ravensberg</p>
    <h1 class="hero-title rv rv-d1">Mehr als nur fahren.<br><em>Wir bringen dich sicher ans Ziel.</em></h1>
    <p class="lead rv rv-d2">Willkommen bei der Fahrschule {BRAND} am Ravensberg – deiner Fahrschule für Auto, Anhänger und Motorrad.</p>
    <div class="hero-actions rv rv-d3">{btn("kontakt.html", "Beratung anfragen")}{btn("fahrerlaubnisklassen.html", "Führerscheinklassen", "ghost", arrow=False)}</div>
    <ul class="hero-facts rv rv-d4">
      <li><strong><span data-count="14">14</span>&nbsp;Tage</strong><span>bis zur Fahrstunde buchbar</span></li>
      <li><strong>Schalt &amp; Automatik</strong><span>moderne Fahrzeuge</span></li>
      <li><strong>Di &amp; Do</strong><span>Theorie 19:00&nbsp;Uhr</span></li>
    </ul>
  </div>
  <a class="scroll-cue" href="#start" aria-label="Weiter nach unten"><span></span></a>
</section>

<section class="section" id="start">
  <div class="wrap split">
    <figure class="media rv-img">{img("fahrstunde", "Junger Fahrer am Lenkrad, daneben der Beifahrer – Blick durch die Frontscheibe in eine Wohnstraße", SIZES_SPLIT)}</figure>
    <div>
      <p class="eyebrow rv">Über uns</p>
      <h2 class="rv rv-d1">Bei {BRAND} steht nicht die Prüfung im Mittelpunkt, <em>sondern du!</em></h2>
      <p class="lead rv rv-d2">Wir nehmen uns Zeit, hören zu und passen die Ausbildung deinem Lerntempo an.</p>
      <p class="rv rv-d3">Kein Stress, kein Druck – dafür ein Team, das mit Herz und Erfahrung arbeitet. Mehr als nur fahren: Wir bringen dich sicher ans Ziel.</p>
      <p class="rv rv-d4"><a class="link-arrow" href="kontakt.html">Lerne uns kennen</a></p>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    {section_head("Warum Let’s Drive", "Ruhig lernen, <em>sicher ankommen.</em>",
                  "Das erwartet dich bei uns – von der ersten Beratung bis zur Prüfung.", center=True)}
    <div class="grid-3">
{usp_html}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    {section_head("Führerscheinklassen", "Welcher Führerschein <em>passt zu dir?</em>",
                  "Du hast dich bereits für eine Klasse entschieden oder brauchst eine Beratung? "
                  "Wir freuen uns über deinen Besuch zu unseren Bürozeiten.")}
    <div class="grid-3">
{class_cards_html}
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    {section_head("Dein Weg", "In vier Schritten <em>zum Führerschein</em>")}
    <ol class="steps">
{steps_html}
    </ol>
  </div>
</section>

<section class="section section-dark">
  <div class="wrap split-6-4">
    <figure class="media rv-img"><img src="assets/img/fahrschulauto-851.webp" alt="Weißes Fahrschulauto von {BRAND} bei Nacht an einem beleuchteten Hafenbecken" width="851" height="315" loading="lazy" decoding="async"></figure>
    <div>
      <p class="eyebrow rv">Unsere Fahrzeuge</p>
      <h2 class="rv rv-d1">Ausbildung auf <em>modernen Fahrzeugen.</em></h2>
      <p class="rv rv-d2">Du lernst bei uns auf modernen Schalt- oder Automatikfahrzeugen – so, wie es zu dir und deinem Ziel passt. Mit B197 kombinierst du beides.</p>
      <div class="news rv rv-d3">
        <p class="eyebrow">Neuigkeit</p>
        <p><strong>Verstärkung im Team!</strong> Fahrstunden sind bei uns innerhalb von 14&nbsp;Tagen buchbar – wir freuen uns auf deinen Besuch.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    {section_head("Stimmen", "Was Fahrschüler <em>über uns sagen</em>",
                  "Auszüge aus öffentlichen Google-Bewertungen.", center=True)}
    <div class="grid-3">
{quotes_html}
    </div>
  </div>
</section>

<section class="section section-mint">
  <div class="wrap split">
    <div>
      <p class="eyebrow rv">Preise &amp; Beratung</p>
      <h2 class="rv rv-d1">Transparente Preise, <em>ehrliche Beratung.</em></h2>
    </div>
    <div>
      <p class="rv rv-d2">Unsere aktuellen Preise erfragst du ganz einfach in der Fahrschule zu den Bürozeiten – gerne auch telefonisch oder per Mail. Was dein Führerschein am Ende kostet, hängt von deinem individuellen Lernerfolg ab. Genau darüber sprechen wir offen mit dir.</p>
      <div class="actions rv rv-d3">{btn("kontakt.html", "Preise erfragen")}{btn(TEL_HREF, TEL, "ghost", arrow=False)}</div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div>
      <p class="eyebrow rv">Bürozeiten</p>
      <h2 class="rv rv-d1">Komm vorbei – <em>wir beraten dich gern.</em></h2>
      <p class="rv rv-d2">Beratung und Anmeldung finden zu unseren Bürozeiten in der Fahrschule am Knooper Weg statt.</p>
      <p class="rv rv-d2" data-open-badge aria-live="polite"></p>
      <div class="rv rv-d3">{hours_dl()}</div>
    </div>
    <div class="card rv rv-d2">
      <h3>So erreichst du uns</h3>
      {contact_list(fax=False)}
      <p><a class="link-arrow" href="kontakt.html">Zum Kontaktformular</a></p>
    </div>
  </div>
</section>

""" + cta("Bereit für den Start?", "Lass uns gemeinsam <em>losfahren.</em>")

PAGES["index.html"] = page(
    "index.html", "start", "Führerschein in Kiel-Ravensberg",
    "Fahrschule Let’s Drive Kiel am Ravensberg: Führerschein B, BE, A1, A2 und A – ruhige Fahrlehrer, "
    "Theorie Di &amp; Do, Fahrstunden innerhalb von 14 Tagen buchbar.",
    INDEX_BODY, active="index.html", dark_hero=True, extra_head=INDEX_HEAD)

# ==================================================================
# FÜHRERSCHEINKLASSEN
# ==================================================================
SF12 = "12 (5 Überland, 4 Autobahn, 3 Beleuchtung)"


def class_detail(cid, group, badge, eyebrow, h2, paras, rows, band=None):
    band_html = ""
    if band:
        name, alt = band
        band_html = f'\n  <figure class="media media-wide rv-img">{img(name, alt, SIZES_WIDE)}</figure>'
    ps = "".join(f"<p>{p}</p>" for p in paras)
    long_badge = " is-long" if len(badge) > 2 else ""
    return f"""<article class="class-detail" id="{cid}" data-group="{group}">{band_html}
  <header class="cd-head rv"><span class="class-badge{long_badge}">{badge}</span><div><p class="eyebrow">{eyebrow}</p><h2>{h2}</h2></div></header>
  <div class="cd-body">
    <div class="cd-text rv rv-d1">{ps}</div>
    {facts(rows)}
  </div>
</article>
"""


CLASSES = [
    class_detail(
        "klasse-b", "auto", "B", "Auto", "Klasse B · BF17",
        ["Du bist 18 Jahre alt oder möchtest schon mit 17 Jahren (BF17) einsteigen? Kein Problem. "
         "Mit Klasse B fährst du Kraftfahrzeuge bis 3,5&nbsp;t zulässiger Gesamtmasse und beförderst "
         "bis zu 8 Personen zuzüglich Fahrer.",
         "Die Theorie umfasst 12 Lektionen plus 2 klassenspezifische Lektionen. Die Praxis absolvierst du "
         "auf unseren modernen Schalt- oder Automatikfahrzeugen – mit 12 Sonderfahrten und zusätzlichen "
         "Übungsstunden. Nach bestandener Theorie- und Praxisprüfung erhältst du deinen Führerschein."],
        [("Mindestalter", "18 Jahre (BF17: 17 Jahre)"),
         ("Fahrzeuge", "bis 3,5&nbsp;t zGM, max. 8 Personen + Fahrer"),
         ("Theorie", "12 Lektionen + 2 klassenspezifische (B1, B2)"),
         ("Sonderfahrten", SF12),
         ("Praxis", "Schalt- oder Automatikfahrzeug"),
         ("Prüfung", "Theorie + Praxis")]),
    class_detail(
        "klasse-b196", "auto", "B196", "Auto · Erweiterung", "B196 – die 125er mit dem Autoführerschein",
        ["Wenn du mindestens 25 Jahre alt bist und seit mindestens 5 Jahren ununterbrochen die Klasse B "
         "besitzt, darfst du nach einer Fahrerschulung in die 125er-Zweiradklasse einsteigen.",
         "Die Schulung umfasst 9 Unterrichtseinheiten aus 4 motorradspezifischen Theorielektionen und "
         "mindestens 5 Praxisstunden à 90&nbsp;Minuten. Mit der Bescheinigung lässt du deinen Führerschein "
         "bei der Führerscheinstelle um die Schlüsselnummer 196 erweitern – eine Prüfung ist nicht erforderlich."],
        [("Voraussetzung", "ab 25 Jahre + mind. 5 Jahre Klasse B"),
         ("Fahrzeuge", "125er-Zweiräder"),
         ("Theorie", "9 Unterrichtseinheiten (4 motorradspezifische Lektionen)"),
         ("Praxis", "mind. 5 Stunden à 90&nbsp;Min."),
         ("Prüfung", "keine – Eintrag Schlüsselnummer 196")]),
    class_detail(
        "klasse-b197", "auto", "B197", "Auto · Schalt &amp; Automatik", "B197 · BF17 – Schalt und Automatik",
        ["Du möchtest mit 18 – oder mit BF17 schon mit 17 – eine kombinierte Ausbildung auf Schalt- und "
         "Automatikfahrzeug absolvieren? Dann ist B197 dein Weg. Du fährst mindestens 10 Fahrstunden im "
         "Schaltwagen, absolvierst mit deinem Fahrlehrer eine 15-minütige Schaltkompetenz und beendest "
         "Ausbildung und Prüfung auf einem Automatikfahrzeug.",
         "Dazu kommen die 12 Sonderfahrten – sie können auch innerhalb der Schaltausbildung stattfinden – "
         "sowie zusätzliche Übungsstunden. Nach bestandener Prüfung steht dir die Schalt- und "
         "Automatikwelt offen."],
        [("Mindestalter", "18 Jahre (BF17: 17 Jahre)"),
         ("Schaltausbildung", "mind. 10 Fahrstunden + 15-minütige Schaltkompetenz"),
         ("Sonderfahrten", SF12 + ", auch in der Schaltausbildung möglich"),
         ("Prüfung", "auf dem Automatikfahrzeug"),
         ("Danach erlaubt", "Schalt- und Automatikfahrzeuge")]),
    class_detail(
        "klasse-be", "anhaenger", "BE", "Anhänger", "Klasse BE – Zugfahrzeug mit Anhänger",
        ["Du bist 18 Jahre alt (bzw. 17) und möchtest ein Gespann bewegen? Lass uns kurz rechnen: Schon mit "
         "der „normalen“ Klasse B darfst du einen ungebremsten Anhänger bis 750&nbsp;kg Gesamtmasse mitführen "
         "und Gespanne bis 3.500&nbsp;kg Gesamtmasse fahren.",
         "Reicht dir das nicht, brauchst du die Klasse BE: Damit ist ein Zugfahrzeug bis 3.500&nbsp;kg mit "
         "einem Anhänger bis 3.500&nbsp;kg Gesamtmasse möglich. Du benötigst 5 Sonderfahrten und "
         "Übungsstunden zum Erlernen einer Grundfahraufgabe. Abgeschlossen wird mit einer Praxisprüfung – "
         "Theorieunterricht ist für BE nicht vorgeschrieben."],
        [("Mindestalter", "18 Jahre (bzw. 17 Jahre)"),
         ("Schon mit B", "ungebremster Anhänger bis 750&nbsp;kg, Gespann bis 3.500&nbsp;kg"),
         ("Mit BE", "Zugfahrzeug bis 3.500&nbsp;kg + Anhänger bis 3.500&nbsp;kg"),
         ("Sonderfahrten", "5 (3 Überland, 1 Autobahn, 1 Beleuchtung)"),
         ("Theorie", "nicht vorgeschrieben"),
         ("Prüfung", "Praxisprüfung")],
        band=("anhaenger", "Weißes SUV mit Kastenanhänger auf einer Landstraße zwischen grünen Wiesen")),
    class_detail(
        "klasse-b96", "anhaenger", "B96", "Anhänger · Erweiterung", "B96 – Gespanne bis 4.250&nbsp;kg",
        ["Alternativ bieten wir dir die Erweiterung B96 an: Damit ist eine Kombination aus Zugfahrzeug und "
         "Anhänger bis 4.250&nbsp;kg Gesamtmasse möglich. Eine Prüfung gibt es nicht – die Ausbildung findet "
         "als Fahrerschulung mit Theorie- und Praxiseinheiten statt."],
        [("Erlaubt", "Gespann bis 4.250&nbsp;kg Gesamtmasse"),
         ("Ausbildung", "Fahrerschulung (Theorie + Praxis)"),
         ("Prüfung", "keine")]),
    class_detail(
        "klasse-a1", "motorrad", "A1", "Motorrad", "Klasse A1 – die 125er-Klasse",
        ["Du bist 16 Jahre alt und möchtest in die 125er-Klasse einsteigen? Prima! Nach bestandener Theorie- "
         "und Praxisprüfung fährst du Krafträder mit nicht mehr als 11&nbsp;kW.",
         "Die Theorie umfasst 12 Doppelstunden und 4 Doppelstunden klassenspezifischen Zusatzstoff. In der "
         "Praxis lernst du in 12 Sonderfahrten und Übungsstunden das Handwerkszeug eines jungen Motorradfahrers."],
        [("Mindestalter", "16 Jahre"),
         ("Fahrzeuge", "Krafträder bis 11&nbsp;kW (125er)"),
         ("Theorie", "12 + 4 klassenspezifische Doppelstunden"),
         ("Sonderfahrten", SF12),
         ("Prüfung", "Theorie + Praxis")],
        band=("motorrad", "Motorradfahrer mit Helm neben seinem Motorrad an einem Dünenweg an der Ostsee")),
    class_detail(
        "klasse-a2", "motorrad", "A2", "Motorrad", "Klasse A2 – bis 35&nbsp;kW",
        ["Du bist 18 Jahre alt und möchtest in die Welt der „großen“ Motorräder einsteigen? Hier bist du "
         "richtig! Nach bestandener Theorie- und Praxisprüfung fährst du Krafträder mit nicht mehr als "
         "35&nbsp;kW. Theorie und Sonderfahrten entsprechen der Klasse A1.",
         "Besitzt du die Klasse A1 seit mindestens 2 Jahren (Stufenaufstieg), entfällt die Ausbildungspflicht."],
        [("Mindestalter", "18 Jahre"),
         ("Fahrzeuge", "Krafträder bis 35&nbsp;kW"),
         ("Theorie", "12 + 4 klassenspezifische Doppelstunden"),
         ("Sonderfahrten", SF12),
         ("Stufenaufstieg", "A1 seit mind. 2 Jahren: keine Ausbildungspflicht"),
         ("Prüfung", "Theorie + Praxis")]),
    class_detail(
        "klasse-a", "motorrad", "A", "Motorrad", "Klasse A – unbeschränkt Motorrad fahren",
        ["Du möchtest das Motorradfahren ohne Einschränkung genießen und bist beim Direkteinstieg 24 Jahre "
         "alt? Klasse! Nach bestandener Theorie- und Praxisprüfung fährst du Krafträder mit mehr als "
         "50&nbsp;cm³ und mehr als 45&nbsp;km/h. Theorie und Sonderfahrten entsprechen der Klasse A1.",
         "Besitzt du die Klasse A2 seit mindestens 2 Jahren (Stufenaufstieg), kannst du schon mit 20 Jahren "
         "einsteigen."],
        [("Mindestalter", "24 Jahre (Direkteinstieg) · 20 Jahre (Stufenaufstieg)"),
         ("Fahrzeuge", "Krafträder über 50&nbsp;cm³ bzw. 45&nbsp;km/h – unbeschränkt"),
         ("Theorie", "12 + 4 klassenspezifische Doppelstunden"),
         ("Sonderfahrten", SF12),
         ("Stufenaufstieg", "A2 seit mind. 2 Jahren: Einstieg ab 20"),
         ("Prüfung", "Theorie + Praxis")]),
]

PRICE_BLOCK = f"""<section class="section section-mint" id="preise">
  <div class="wrap split">
    <div>
      <p class="eyebrow rv">Preise &amp; Beratung</p>
      <h2 class="rv rv-d1">Was kostet <em>dein Führerschein?</em></h2>
    </div>
    <div>
      <p class="rv rv-d2">Unsere aktuellen Preise erfragst du ganz einfach in der Fahrschule zu den Bürozeiten – gerne auch telefonisch oder per Mail.</p>
      <p class="rv rv-d2">Wie teuer dein Führerschein insgesamt wird, können wir pauschal nicht beantworten: Der Lernerfolg ist immer individuell, denn jeder Fahrschüler und jede Fahrschülerin ist unterschiedlich. Lass es auf dich zukommen – bei Fragen sprich uns gerne an. Es gelten unsere <a href="agb.html">AGB</a>.</p>
      <div class="actions rv rv-d3">{btn(TEL_HREF, f"{TEL} anrufen")}{btn(f"mailto:{MAIL}", "E-Mail schreiben", "ghost", arrow=False)}</div>
    </div>
  </div>
</section>

"""

KLASSEN_BODY = hero_page(
    "Führerscheinklassen", "Führerscheinklassen", "Unsere Führerscheinklassen <em>für dich</em>",
    "Du hast dich bereits für eine Fahrerlaubnisklasse entschieden oder brauchst eine Beratung? "
    "Wir freuen uns über deinen Besuch zu unseren Bürozeiten.") + f"""
<section class="section section-classes">
  <div class="wrap">
    <div class="tabs" role="tablist" aria-label="Klassen filtern">
      <button type="button" role="tab" aria-selected="true" data-filter="alle">Alle</button>
      <button type="button" role="tab" aria-selected="false" data-filter="auto">Auto</button>
      <button type="button" role="tab" aria-selected="false" data-filter="anhaenger">Anhänger</button>
      <button type="button" role="tab" aria-selected="false" data-filter="motorrad">Motorrad</button>
    </div>
{"".join(CLASSES)}  </div>
</section>

""" + PRICE_BLOCK + cta("Noch unsicher?", "Wir finden <em>die passende Klasse.</em>")

PAGES["fahrerlaubnisklassen.html"] = page(
    "fahrerlaubnisklassen.html", "fahrerlaubnisklassen", "Führerscheinklassen",
    "Alle Führerscheinklassen bei Let’s Drive Kiel: B, BF17, B196, B197, BE, B96, A1, A2 und A – "
    "Mindestalter, Theorie, Sonderfahrten und Prüfung im Überblick.",
    KLASSEN_BODY, active="fahrerlaubnisklassen.html")

# ==================================================================
# THEORIEUNTERRICHT
# ==================================================================
LESSONS = [
    "Persönliche Voraussetzungen/Risikofaktor Mensch",
    "Rechtliche Rahmenbedingungen",
    "Verkehrszeichen und Verkehrseinrichtungen",
    "Straßenverkehrssystem und seine Nutzung",
    "Vorfahrt",
    "Verkehrsregelungen/Bahnübergänge",
    "Geschwindigkeit, Abstand und umweltschonende Fahrweise",
    "Andere Teilnehmer im Straßenverkehr: Besonderheiten und Verhalten",
    "Verkehrsverhalten bei Fahrmanövern, Verkehrsbeobachtung",
    "Ruhender Verkehr",
    "Verhalten in besonderen Situationen",
    "Lebenslanges Lernen/Folgen von Verstößen gegen Verkehrsvorschriften",
    ("Technische Bedingungen/umweltbewusster Umgang mit Kraftfahrzeugen", "B1"),
    ("Fahren mit Solokraftfahrzeugen und Zügen/Personen- und Güterbeförderung", "B2"),
]


def lesson_li(i, item):
    title, tag = (item if isinstance(item, tuple) else (item, None))
    tag_html = f' <span class="tag">{tag}</span>' if tag else ""
    return (f'      <li class="rv rv-d{(i % 2) + 1}"><span class="lesson-no">{i + 1:02d}</span>'
            f'<span class="lesson-title">{title}{tag_html}</span></li>')


lessons_html = "\n".join(lesson_li(i, it) for i, it in enumerate(LESSONS))

RULES = [
    ("book", "Ersterwerb",
     "Bei deinem ersten Führerschein besuchst du alle 12 Lektionen zuzüglich der klassenspezifischen "
     "Lektionen – für die Klasse B sind das die Lektionen B1 und B2."),
    ("plus", "Erweiterung",
     "Erweiterst du deinen Führerschein, besuchst du 6 verschiedene Lektionen zuzüglich der "
     "klassenspezifischen Lektionen."),
    ("moto", "Motorrad",
     "Für die A-Klassen kommen 4 klassenspezifische Lektionen dazu. Für die motorradspezifischen "
     "Lektionen geben wir gesonderte Termine bekannt."),
    ("trailer", "Anhänger (BE)",
     "Für den Erwerb der Klasse BE ist kein Theorieunterricht vorgeschrieben."),
]
rules_html = "\n".join(
    f"""      <article class="card rv rv-d{(i % 2) + 1}">
        <span class="card-icon">{icon(ic)}</span>
        <h3>{t}</h3>
        <p>{p}</p>
      </article>""" for i, (ic, t, p) in enumerate(RULES))

DAYS = [("Mo", False), ("Di", True), ("Mi", False), ("Do", True), ("Fr", False)]
days_html = "".join(
    f'<li class="day-chip{" is-active" if on else ""}">{dname}</li>' for dname, on in DAYS)

THEORIE_BODY = hero_page(
    "Theorie", "Theorieunterricht", "Theorie, die <em>hängen bleibt.</em>",
    "Unser Theorieunterricht findet immer dienstags und donnerstags von 19:00 bis 20:30&nbsp;Uhr "
    "in unserem Schulungsraum in der Fahrschule statt.",
    media=img("theorie", "Heller Schulungsraum mit Holztischen, schwarzen Stühlen und einem Bildschirm, "
              "auf dem eine Kreuzung zu sehen ist", SIZES_WIDE, lazy=False)) + f"""
<section class="section">
  <div class="wrap split">
    <div>
      <p class="eyebrow rv">So läuft’s</p>
      <h2 class="rv rv-d1">Zweimal pro Woche – <em>Einstieg jederzeit.</em></h2>
      <p class="lead rv rv-d2">Ein Einstieg in den Theorieunterricht ist jederzeit möglich. Die aktuellen Termine liegen in der Fahrschule aus.</p>
      <p class="rv rv-d3">Du kommst einfach zu einem der nächsten Termine in unseren Schulungsraum am Knooper Weg – ganz gleich, mit welcher Lektion es gerade weitergeht.</p>
    </div>
    <div class="schedule card rv rv-d2">
      <p class="eyebrow">Theorieunterricht</p>
      <p class="schedule-time"><time datetime="19:00">19:00</time> – <time datetime="20:30">20:30</time></p>
      <ul class="day-chips" aria-hidden="true">{days_html}</ul>
      <p>Dienstags und donnerstags, 19:00 bis 20:30&nbsp;Uhr · Schulungsraum in der Fahrschule, {STREET}, {CITY}</p>
      {facts([("Lektionen Grundstoff", '<span data-count="12">12</span>'),
              ("Klassenspezifisch B", "B1 + B2"),
              ("Dauer je Termin", "90&nbsp;Minuten")], cls="facts")}
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    {section_head("Welche Lektionen brauchst du?", "Deine Theorie <em>auf einen Blick</em>",
                  "Wie viele Lektionen du besuchst, hängt davon ab, ob du deinen ersten Führerschein machst "
                  "oder einen vorhandenen erweiterst.")}
    <div class="grid-2">
{rules_html}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    {section_head("Die Lektionen", "Alle Lektionen <em>im Überblick</em>",
                  "Lektion 1 bis 12 bilden den Grundstoff, Lektion 13 und 14 sind die klassenspezifischen "
                  "Lektionen B1 und B2 für den Autoführerschein.")}
    <ol class="lessons">
{lessons_html}
    </ol>
  </div>
</section>

""" + cta("Einstieg jederzeit", "Komm einfach zum <em>nächsten Termin.</em>")

PAGES["theorieunterricht.html"] = page(
    "theorieunterricht.html", "theorieunterricht", "Theorieunterricht",
    "Theorieunterricht bei Let’s Drive Kiel: dienstags und donnerstags 19:00–20:30 Uhr im Schulungsraum "
    "am Knooper Weg. Einstieg jederzeit, alle 14 Lektionen im Überblick.",
    THEORIE_BODY, active="theorieunterricht.html")

# ==================================================================
# JOBS
# ==================================================================
OFFER = ["Ein familiäres Umfeld", "Ein freundliches und humorvolles Team",
         "Ausbildung auf modernen Fahrzeugen", "Eine faire Bezahlung"]
NEED = ["Fahrlehrerlaubnis der Klassen A, B und BE", "Engagement und Interesse für den Job",
        "Einfühlungsvermögen im Umgang mit jungen Menschen", "Eine zuverlässige und selbstständige Arbeitsweise"]


def checklist(items):
    return '<ul class="checklist">' + "".join(f"<li>{icon('check', 18)}<span>{x}</span></li>" for x in items) + "</ul>"


JOBS_BODY = hero_page(
    "Jobs", "Karriere", "Komm in <em>unser Team.</em>",
    "Wir suchen Verstärkung: Du bist Fahrlehrer der Klassen A, B und BE und suchst eine neue "
    "Herausforderung an der Ostseeküste? Prima!",
    media=img("schluessel", "Hand hält einen Autoschlüssel mit grünem Lederanhänger im Innenraum eines Autos",
              SIZES_WIDE, lazy=False)) + f"""
<section class="section">
  <div class="wrap">
    <article class="job">
      <div class="section-head">
        <p class="eyebrow rv">Offene Stelle</p>
        <h2 class="rv rv-d1">Fahrlehrer (w/m/d) – <em>Klassen A, B und BE</em></h2>
        <p class="lead rv rv-d2">Wir suchen für unser Team Verstärkung. Bei uns schulst du auf modernen Fahrzeugen – in einem Team, das mit Herz und Erfahrung arbeitet.</p>
      </div>
      <div class="grid-2">
        <div class="card rv rv-d1">
          <h3>Das erwartet dich</h3>
          {checklist(OFFER)}
        </div>
        <div class="card rv rv-d2">
          <h3>Das bringst du mit</h3>
          {checklist(NEED)}
        </div>
      </div>
      {facts([("Position", "Fahrlehrer (w/m/d)"), ("Klassen", "A, B und BE"),
              ("Standort", f"{STREET}, {CITY}"), ("Bewerbung", "gerne per E-Mail")])}
    </article>
  </div>
</section>

<section class="section section-mint" id="bewerbung">
  <div class="wrap split">
    <div>
      <p class="eyebrow rv">Bewerbung</p>
      <h2 class="rv rv-d1">Haben wir dich <em>neugierig gemacht?</em></h2>
    </div>
    <div>
      <p class="rv rv-d2">Dann freuen wir uns über deine Bewerbung – gerne per Mail an <a href="mailto:{MAIL}">{MAIL}</a>.</p>
      <div class="actions rv rv-d3">{btn(APPLY, "Jetzt per Mail bewerben")}{btn(TEL_HREF, TEL, "ghost", arrow=False)}</div>
    </div>
  </div>
</section>

""" + cta("Fragen vorab?", "Ruf uns einfach <em>an.</em>")

PAGES["jobs.html"] = page(
    "jobs.html", "jobs", "Jobs: Fahrlehrer (w/m/d)",
    "Fahrlehrer (w/m/d) für die Klassen A, B und BE gesucht: familiäres Umfeld, humorvolles Team, moderne "
    "Fahrzeuge, faire Bezahlung. Jetzt per Mail bewerben.",
    JOBS_BODY, active="jobs.html")

# ==================================================================
# KONTAKT
# ==================================================================
CLASS_OPTIONS = ["B / BF17", "B197", "B196", "BE", "B96", "A1", "A2", "A", "Sonstiges"]
options_html = "".join(f"<option>{o}</option>" for o in CLASS_OPTIONS)
REQ = '<span class="req" aria-hidden="true">*</span>'

KONTAKT_BODY = hero_page(
    "Kontakt", "Kontakt", "Wir freuen uns <em>auf dich.</em>",
    "Ruf uns an, schreib uns oder komm zu unseren Bürozeiten in der Fahrschule am Knooper Weg vorbei.") + f"""
<section class="section">
  <div class="wrap split">
    <div>
      <h2 class="rv">So erreichst du uns</h2>
      <div class="rv rv-d1">
      {contact_list(facebook=True)}
      </div>
      <h3 class="rv rv-d2">Bürozeiten</h3>
      <p class="rv rv-d2" data-open-badge aria-live="polite"></p>
      <div class="rv rv-d3">{hours_dl()}</div>
    </div>
    <div class="rv rv-d2">
      <!-- [PLATZHALTER: Formular-Backend] – bis dahin öffnet das JS eine vorbereitete E-Mail (mailto) -->
      <form class="form card" data-mailto="{MAIL}" action="mailto:{MAIL}" method="post" enctype="text/plain">
        <h2>Schreib uns eine Nachricht</h2>
        <div class="field">
          <label for="f-name">Name {REQ}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required>
        </div>
        <div class="field">
          <label for="f-mail">E-Mail {REQ}</label>
          <input id="f-mail" name="email" type="email" autocomplete="email" required>
        </div>
        <div class="field">
          <label for="f-tel">Telefon</label>
          <input id="f-tel" name="telefon" type="tel" autocomplete="tel">
        </div>
        <div class="field">
          <label for="f-klasse">Klasse</label>
          <select id="f-klasse" name="klasse"><option value="">Bitte wählen</option>{options_html}</select>
        </div>
        <div class="field">
          <label for="f-msg">Nachricht {REQ}</label>
          <textarea id="f-msg" name="nachricht" rows="5" required></textarea>
        </div>
        <div class="field-check">
          <input id="f-consent" name="einwilligung" type="checkbox" value="ja" required>
          <label for="f-consent">Ich bin damit einverstanden, dass meine Angaben zur Kontaktaufnahme gespeichert und verarbeitet werden. Ich kann meine Einwilligung jederzeit widerrufen. Mehr dazu in der <a href="datenschutz.html">Datenschutzerklärung</a>. {REQ}</label>
        </div>
        <button class="btn btn-primary" type="submit">Nachricht senden{ARROW}</button>
        <p class="form-note"><span aria-hidden="true">*</span> Pflichtfeld. Beim Absenden öffnet sich dein E-Mail-Programm mit deiner vorbereiteten Nachricht – du kannst sie vor dem Versand noch prüfen.</p>
        <div class="form-success" role="status" aria-live="polite" hidden>
          <p><strong>Danke für deine Nachricht!</strong> Dein E-Mail-Programm sollte sich jetzt geöffnet haben. Falls nicht, schreib uns direkt an <a href="mailto:{MAIL}">{MAIL}</a> oder ruf an: <a href="{TEL_HREF}">{TEL}</a>.</p>
        </div>
      </form>
    </div>
  </div>
</section>

<section class="section section-alt" id="anfahrt">
  <div class="wrap">
    {section_head("Anfahrt", "So findest du <em>zu uns</em>",
                  f"{STREET}, {CITY} – im Stadtteil Ravensberg.")}
    <div class="map-consent rv" data-map-src="{MAP_EMBED}">
      <span class="card-icon">{icon("pin")}</span>
      <p><strong>{FULL}</strong><br>{STREET} · {CITY}</p>
      <p><small>Zum Schutz deiner Daten laden wir die Karte erst nach deinem Klick. Dabei werden Daten an Google übertragen – mehr dazu in der <a href="datenschutz.html#google-maps">Datenschutzerklärung</a>.</small></p>
      <button class="btn btn-primary" type="button" data-map-load>Karte laden (Google Maps)</button>
    </div>
    <p class="rv rv-d1"><a class="link-arrow" href="{ROUTE}" target="_blank" rel="noopener" aria-label="Route planen – öffnet Google Maps in einem neuen Tab">Route planen</a></p>
  </div>
</section>
"""

PAGES["kontakt.html"] = page(
    "kontakt.html", "kontakt", "Kontakt &amp; Anfahrt",
    "Kontakt zur Fahrschule Let’s Drive Kiel: Knooper Weg 193, 24118 Kiel · Telefon 0431 86923 · "
    "Bürozeiten Mo, Mi, Fr 12–16 Uhr, Di, Do 15–19 Uhr.",
    KONTAKT_BODY, active="kontakt.html")

# ==================================================================
# RECHTSSEITEN
# ==================================================================
def legal_page(fname, slug, title, h1, desc, content):
    body = hero_page(title, "Rechtliches", h1) + f"""
<section class="section">
  <div class="wrap wrap-narrow legal">
{content}
  </div>
</section>
"""
    return page(fname, slug, title, desc, body, noindex=True)


IMPRESSUM = f"""    <h2>Angaben gemäß §&nbsp;5 DDG</h2>
    <p>{FULL}<br>Inhaber und Geschäftsführer: {OWNER}<br>{STREET}<br>{CITY}</p>

    <h2>Kontakt</h2>
    <p>Telefon: <a href="{TEL_HREF}">{TEL}</a><br>Telefax: {FAX}<br>E-Mail: <a href="mailto:{MAIL}">{MAIL}</a></p>

    <h2>Umsatzsteuer-ID</h2>
    <p>20/031/64345<br><mark>[PLATZHALTER: prüfen, ob USt-IdNr. oder Steuernummer]</mark></p>

    <h2>Berufsrechtliche Angaben</h2>
    <h3>Aufsichtsbehörde</h3>
    <p>Ordnungsamt Kiel – Führerscheinstelle<br>Saarbrückenstraße&nbsp;143<br>24114&nbsp;Kiel</p>

    <h2>Verantwortlich für den Inhalt nach §&nbsp;18 Abs.&nbsp;2 MStV</h2>
    <p>{OWNER}<br>{STREET}<br>{CITY}</p>

    <h2>Verbraucherstreitbeilegung</h2>
    <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

    <h2>Bildnachweis</h2>
    <p>Logo und Foto Fahrschulauto: {FULL}. Alle weiteren Fotos sind KI-generierte Symbolbilder.</p>"""

PAGES["impressum.html"] = legal_page(
    "impressum.html", "impressum", "Impressum", "Impressum",
    "Impressum der Fahrschule Let’s Drive Kiel, Inhaber Andreas Glander, Knooper Weg 193, 24118 Kiel.",
    IMPRESSUM)

DATENSCHUTZ = f"""    <aside class="card notice" role="note">
      <p><mark>[PLATZHALTER: Datenschutzerklärung vor Livegang rechtlich prüfen lassen]</mark></p>
    </aside>

    <h2>Auf einen Blick</h2>
    <p>Diese Website kommt ohne Cookies, ohne Analyse- oder Tracking-Werkzeuge und ohne Werbung aus. Beim Aufruf werden keine Inhalte von Drittanbietern geladen – auch die Schrift liegt auf unserem eigenen Server. Google Maps wird erst geladen, wenn du ausdrücklich darauf klickst.</p>

    <h2>Verantwortlicher</h2>
    <p>{FULL}<br>Inhaber: {OWNER}<br>{STREET}<br>{CITY}<br>Telefon: <a href="{TEL_HREF}">{TEL}</a><br>E-Mail: <a href="mailto:{MAIL}">{MAIL}</a></p>

    <h2>Hosting und Server-Logfiles</h2>
    <p>Diese Website wird bei <mark>[PLATZHALTER: Hoster mit Anschrift]</mark> gehostet. Beim Aufruf der Seiten verarbeitet der Server technisch notwendige Daten (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Referrer, Browser und Betriebssystem), um die Website auszuliefern und ihre Sicherheit zu gewährleisten. Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO; unser berechtigtes Interesse liegt im sicheren und stabilen Betrieb der Website. Die Logfiles werden nach <mark>[PLATZHALTER: Speicherdauer]</mark> gelöscht. Mit dem Hoster besteht ein Vertrag zur Auftragsverarbeitung nach Art.&nbsp;28 DSGVO.</p>

    <h2>Kontakt per Telefon, E-Mail und Kontaktformular</h2>
    <p>Wenn du uns anrufst, eine E-Mail schreibst oder das Kontaktformular nutzt, verarbeiten wir deine Angaben (z.&nbsp;B. Name, E-Mail-Adresse, Telefonnummer, gewünschte Klasse und Nachricht), um deine Anfrage zu beantworten. Das Kontaktformular übermittelt keine Daten an einen Server: Beim Absenden öffnet sich dein eigenes E-Mail-Programm mit der vorbereiteten Nachricht, die du selbst abschickst.</p>
    <p>Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO, soweit deine Anfrage auf eine Ausbildung bei uns abzielt, im Übrigen Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO (deine Einwilligung) bzw. lit.&nbsp;f DSGVO. Wir löschen deine Daten, sobald sie nicht mehr benötigt werden, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>

    <h2 id="google-maps">Google Maps (nur nach Klick)</h2>
    <p>Auf der Kontaktseite kannst du eine Karte von Google Maps einblenden. Die Karte wird erst geladen, wenn du auf „Karte laden (Google Maps)“ klickst – ohne diesen Klick werden keine Daten an Google übertragen. Nach dem Klick werden Daten wie deine IP-Adresse an die Google Ireland Limited, Gordon House, Barrow Street, Dublin&nbsp;4, Irland, übermittelt; dabei kann Google Cookies setzen und Daten auch in die USA übertragen. Google ist nach dem EU-US Data Privacy Framework zertifiziert.</p>
    <p>Rechtsgrundlage ist deine Einwilligung nach Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO. Du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen, indem du die Seite neu lädst – die Karte wird dann nicht erneut automatisch geladen. Der Link „Route planen“ öffnet Google Maps in einem neuen Tab; dort gilt die Datenschutzerklärung von Google.</p>

    <h2>Links zu Facebook</h2>
    <p>Wir verlinken auf unsere Facebook-Seite. Es handelt sich um einen einfachen Link, kein eingebundenes Plugin: Daten werden erst übertragen, wenn du den Link anklickst und Facebook (Meta Platforms Ireland Ltd.) aufrufst.</p>

    <h2>Deine Rechte</h2>
    <p>Du hast das Recht auf Auskunft (Art.&nbsp;15 DSGVO), Berichtigung (Art.&nbsp;16), Löschung (Art.&nbsp;17), Einschränkung der Verarbeitung (Art.&nbsp;18), Datenübertragbarkeit (Art.&nbsp;20) und Widerspruch (Art.&nbsp;21 DSGVO). Eine erteilte Einwilligung kannst du jederzeit widerrufen (Art.&nbsp;7 Abs.&nbsp;3 DSGVO). Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art.&nbsp;77 DSGVO), zum Beispiel beim Unabhängigen Landeszentrum für Datenschutz Schleswig-Holstein (ULD).</p>

    <p><small>Stand: Oktober 2026</small></p>"""

PAGES["datenschutz.html"] = legal_page(
    "datenschutz.html", "datenschutz", "Datenschutzerklärung", "Datenschutz&shy;erklärung",
    "Datenschutzerklärung der Fahrschule Let’s Drive Kiel: keine Cookies, kein Tracking, selbst gehostete "
    "Schrift, Google Maps nur nach deinem Klick.",
    DATENSCHUTZ)

AGB = f"""    <aside class="card notice" role="note">
      <p class="eyebrow">In Vorbereitung</p>
      <p><mark>[PLATZHALTER: AGB vom Kunden einfügen]</mark></p>
      <p>Bei Fragen zu unseren Geschäftsbedingungen sprich uns gerne an – in der Fahrschule zu den Bürozeiten, telefonisch unter <a href="{TEL_HREF}">{TEL}</a> oder per Mail an <a href="mailto:{MAIL}">{MAIL}</a>.</p>
    </aside>"""

PAGES["agb.html"] = legal_page(
    "agb.html", "agb", "AGB", "Allgemeine Geschäfts&shy;bedingungen",
    "Allgemeine Geschäftsbedingungen der Fahrschule Let’s Drive Kiel.",
    AGB)

# ==================================================================
# 404
# ==================================================================
NF_BODY = hero_page(
    None, "Fehler 404", "Hier geht’s <em>nicht weiter.</em>",
    "Die Seite, die du suchst, gibt es nicht (mehr). Kein Stress – wir bringen dich zurück auf die richtige Spur.",
    actions=btn("index.html", "Zur Startseite") + btn("kontakt.html", "Kontakt", "ghost", arrow=False)) + f"""
<section class="section section-alt">
  <div class="wrap">
    {section_head("Vielleicht suchst du", "Beliebte <em>Seiten</em>")}
    <div class="grid-3">
      <a class="card rv rv-d1" href="fahrerlaubnisklassen.html"><h3>Führerscheinklassen</h3><p>Auto, Anhänger und Motorrad im Überblick.</p><span class="link-arrow">Ansehen</span></a>
      <a class="card rv rv-d2" href="theorieunterricht.html"><h3>Theorieunterricht</h3><p>Dienstags und donnerstags, 19:00&nbsp;Uhr.</p><span class="link-arrow">Ansehen</span></a>
      <a class="card rv rv-d3" href="kontakt.html"><h3>Kontakt</h3><p>Telefon, E-Mail, Bürozeiten und Anfahrt.</p><span class="link-arrow">Ansehen</span></a>
    </div>
  </div>
</section>
"""

PAGES["404.html"] = page(
    "404.html", "404", "Seite nicht gefunden",
    "Diese Seite wurde nicht gefunden. Zurück zur Startseite der Fahrschule Let’s Drive Kiel.",
    NF_BODY, noindex=True)

# ==================================================================
# sitemap.xml + robots.txt
# ==================================================================
INDEXABLE = ["index.html", "fahrerlaubnisklassen.html", "theorieunterricht.html", "jobs.html", "kontakt.html"]


def sitemap():
    urls = "\n".join(
        f"  <url><loc>{BASE if f == 'index.html' else BASE + f}</loc><lastmod>{TODAY}</lastmod></url>"
        for f in INDEXABLE)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{urls}\n</urlset>\n")


ROBOTS = f"User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n"


if __name__ == "__main__":
    SITE.mkdir(parents=True, exist_ok=True)
    for fname, html in PAGES.items():
        (SITE / fname).write_text(html, encoding="utf-8")
        print(f"wrote {fname:28s} {len(html):>7d} bytes")
    (SITE / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    (SITE / "robots.txt").write_text(ROBOTS, encoding="utf-8")
    print("wrote sitemap.xml, robots.txt →", SITE)
