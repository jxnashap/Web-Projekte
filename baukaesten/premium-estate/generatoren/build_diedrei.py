#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator: DIE DREI · Weinbar · Kiel — Design-System „Quiet Rosé".
Ableitung des Premium-Estate-Baukastens (ruhige, helle Variante).

Quellen (nur belegte Fakten):
  .preview-cache/dd/home.md (Original-Website diedreibar.de), impressum.html,
  falstaff.md, weinkarte.pdf (Stand 07.05.2025) → $S/weinkarte.json, $S/fakten.md,
  $S/datenschutz-entwurf.html (Agent „Inhalte"), webseiten/diedrei/assets/img/index.json
  (Alt-Texte, Maße; Agent „Assets"). Unbelegtes bleibt [PLATZHALTER: …].

Aufruf:  python3 build_diedrei.py            (schreibt nach webseiten/diedrei/)
Daten: generatoren/diedrei-daten/ (weinkarte.json, datenschutz-entwurf.html, fakten.md); überschreibbar per DD_SCRATCH
"""
import html
import json
import os
import re

ROOT = "/home/user/Web-Projekte"
SITE = os.path.join(ROOT, "webseiten", "diedrei")
SCRATCH = os.environ.get(
    "DD_SCRATCH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "diedrei-daten"))
DEV_ASSETS = os.environ.get("DD_DEV_ASSETS", "")  # nur für frühe QA, solange assets/ fehlt
BASE = "https://diedreibar.de/"

# ------------------------------------------------------------------
# Belegte Stammdaten (home.md, impressum.html, falstaff.md)
# ------------------------------------------------------------------
NAME = "DIE DREI"
NAME_LONG = "DIE DREI Weinbar Kiel"
STREET = "Knooper Weg 189"
ZIP_CITY = "24118 Kiel"
TEL = "+4943171978976"
TEL_TXT = "0431 / 71978976"
MAIL = "info@diedreibar.de"
IG = "https://www.instagram.com/die_drei_weinbar/"   # so auf diedreibar.de verlinkt
IG_HANDLE = "@die_drei_weinbar"
TIKTOK = "https://www.tiktok.com/@diedreiweinbar"     # Profil geprüft (Bio: Knooper Weg 189 | Kiel)
TT_HANDLE = "@diedreiweinbar"
YELP = "https://yelp.de/biz/WB2g2Ljv48X9yp3cV70TaQ"
GOOGLE = "https://g.co/kgs/jAAEs6p"
OSM = "https://www.openstreetmap.org/search?query=Knooper%20Weg%20189%2C%2024118%20Kiel"
GMAPS = "https://www.google.com/maps/search/?api=1&query=DIE%20DREI%20Weinbar%2C%20Knooper%20Weg%20189%2C%2024118%20Kiel"
PDF = "assets/weinkarte.pdf"
STAND = "07.05.2025"

# Öffnungszeiten laut Website (maßgeblich; abweichende Verzeichnis-Angaben ignoriert)
HOURS = [  # (ISO-Tag, Name, Zeit oder None)
    (1, "Montag", None), (2, "Dienstag", None),
    (3, "Mittwoch", ("17:00", "23:00")), (4, "Donnerstag", ("17:00", "23:00")),
    (5, "Freitag", ("17:00", "23:00")), (6, "Samstag", ("17:00", "23:00")),
    (7, "Sonntag", ("17:00", "23:00")),
]
HOURS_ATTR = ",".join(f"{h[0]}-{h[1]}" if h else "-" for _, _, h in HOURS)

# Google-Rezensionen wörtlich aus home.md. Das Zitat mit dem Tippfehler
# „Reihngau" (Jonathan L.) wird bewusst NICHT verwendet.
REVIEWS = [
    ("Erich L.", "Was für eine absolut gelungene Location! Sowas habe ich bisher in Kiel nicht "
                 "erleben dürfen. Sehr geschmackvoll eingerichtetes Ambiente, was einen schon beim "
                 "Betreten der Bar zum längeren Verweilen animiert."),
    ("Lea S.", "Sehr schönes Ambiente, freundliches Personal, leckere Kleinigkeiten und eine "
               "wirklich nette Chefin. Wir kommen gerne wieder!"),
    ("Christian S.", "Sehr schöner Abend mit Freunden in der neuen Weinbar, tolles Weinangebot "
                     "zu fairen Preisen."),
    ("Nadine S.", "Wir hatten einen schönen Abend mit Freunden. Endlich ein neuer Laden in "
                  "Kiel … mal anders!"),
    ("Dietmar D.", "Wir sind noch am Antesten als Ex-SOTO Stammgast, gute und große Weinauswahl, "
                   "angenehme und modernes Ambiente, sehr freundlich, kleine Snackauswahl, wir "
                   "kommen wieder."),
]

NAV = [("index.html", "Start"), ("bar.html", "Die Bar"),
       ("weinkarte.html", "Weinkarte"), ("besuch.html", "Besuch")]

# ------------------------------------------------------------------
# Icons
# ------------------------------------------------------------------
ARROW = '<svg viewBox="0 0 24 10" aria-hidden="true"><path d="M0 5h22M18 1l4 4-4 4"/></svg>'
PHONE = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h3.2l1.6 4.2-2.1 1.3a11 11 0 0 0 '
         '5.8 5.8l1.3-2.1L19 13.8V17a2 2 0 0 1-2.2 2A15.8 15.8 0 0 1 3 5.2 2 2 0 0 1 5 3z"/></svg>')
DOWN = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>')
IG_ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/>'
           '<circle cx="12" cy="12" r="4"/><circle class="dot" cx="17.2" cy="6.8" r=".6"/></svg>')
TT_ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 3.5v11.25a3.25 3.25 0 1 1-3.25-3.25"/>'
           '<path d="M13.5 3.5c.35 2.55 2.15 4.3 4.75 4.55"/></svg>')
EXT = ' target="_blank" rel="noopener"'


def esc(s):
    return html.escape(s, quote=True)


# ------------------------------------------------------------------
# Bilder (Asset-Vertrag: assets/img/<slug>-s.webp / -l.webp + index.json)
# ------------------------------------------------------------------
def _load_index():
    """Bild-Index (Maße, Alt-Texte, Fokus) — liegt bei den Generator-Daten, nicht im Webordner."""
    cands = [os.path.join(SCRATCH, "img-index.json")]
    cands += [os.path.join(b, "assets", "img", "index.json") for b in (SITE, DEV_ASSETS) if b]
    for p in cands:
        base = SITE
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            items = data if isinstance(data, list) else data.get("images", [])
            return {d["slug"]: d for d in items}, base
    raise SystemExit("img-index.json fehlt")


IMG, IMG_BASE = _load_index()


def asset_exists(rel):
    return any(os.path.exists(os.path.join(b, rel)) for b in (SITE, DEV_ASSETS) if b)


def brand(name):
    """logo-white / logo-berry … → svg bevorzugt, sonst png."""
    for ext in ("svg", "png"):
        rel = f"assets/brand/{name}.{ext}"
        if asset_exists(rel):
            return rel
    return f"assets/brand/{name}.png"


def img(slug, sizes, alt=None, eager=False, pos=None, cls="", plx=None, decorative=False):
    d = IMG[slug]
    s, l = d["s"], d["l"]
    a = "" if decorative else esc(alt if alt is not None else d.get("alt", ""))
    load = ' loading="eager" fetchpriority="high"' if eager else ' loading="lazy"'
    pos = pos or d.get("fokus")
    style = f' style="object-position:{pos}"' if pos else ""
    c = f' class="{cls}"' if cls else ""
    tag = (f'<img{c} src="assets/img/{slug}-l.webp" '
           f'srcset="assets/img/{slug}-s.webp {s["w"]}w, assets/img/{slug}-l.webp {l["w"]}w" '
           f'sizes="{sizes}" width="{l["w"]}" height="{l["h"]}" alt="{a}"{load} decoding="async"{style}>')
    if plx:
        return f'<div class="plx-in" data-plx="{plx}">{tag}</div>'
    return tag


def srcset(slug):
    d = IMG[slug]
    return f'assets/img/{slug}-s.webp {d["s"]["w"]}w, assets/img/{slug}-l.webp {d["l"]["w"]}w'


# Art-Direction: Hochformat-Motiv für schmale Hochkant-Screens (Telefone), sonst Querformat.
# Dieselbe Media-Query steuert <source> und das Preload (siehe head()).
MOBILE_MQ = "(max-width: 599px)"
DESKTOP_MQ = "(min-width: 600px)"


def picture(slug, mobile_slug, sizes="100vw", pos=None, mpos=None, alt=None):
    """alt muss auf BEIDE Motive passen (eine <img> für beide Quellen)."""
    d, m = IMG[slug], IMG[mobile_slug]
    pos = pos or d.get("fokus")
    mpos = mpos or m.get("fokus")
    return (f'<picture>'
            f'<source media="{MOBILE_MQ}" srcset="{srcset(mobile_slug)}" sizes="100vw" '
            f'width="{m["l"]["w"]}" height="{m["l"]["h"]}">'
            f'<img src="assets/img/{slug}-l.webp" srcset="{srcset(slug)}" sizes="{sizes}" '
            f'width="{d["l"]["w"]}" height="{d["l"]["h"]}" alt="{esc(alt or d.get("alt", ""))}" '
            f'loading="eager" fetchpriority="high" decoding="async"'
            f' style="--pos:{pos};--mpos:{mpos}"></picture>')


def figure(slug, sizes, cls="", pos=None, plx=None, d=None, alt=None):
    dd = f' data-d="{d}"' if d else ""
    return f'<figure class="rv-img {cls}"{dd}>{img(slug, sizes, alt=alt, pos=pos, plx=plx)}</figure>'


# ------------------------------------------------------------------
# Kopf / Header / Footer
# ------------------------------------------------------------------
def jsonld():
    data = {
        "@context": "https://schema.org",
        "@type": "BarOrPub",
        "@id": BASE + "#bar",
        "name": NAME_LONG,
        "alternateName": NAME,
        "description": "Weinbar in Kiel – Weine von Klassikern bis zu verborgenen Schätzen kleiner "
                       "Winzer, dazu Brotzeit und Flammkuchen.",
        "url": BASE,
        "image": BASE + "assets/brand/og.jpg",
        "logo": BASE + brand("logo-berry"),
        "telephone": "+49 431 71978976",
        "email": MAIL,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": STREET,
            "postalCode": "24118",
            "addressLocality": "Kiel",
            "addressCountry": "DE",
        },
        "openingHoursSpecification": [{
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "17:00",
            "closes": "23:00",
        }],
        "hasMenu": BASE + "weinkarte.html",
        "acceptsReservations": True,
        "paymentAccepted": "Bargeld, EC-Karte, Kreditkarte, NFC",
        "currenciesAccepted": "EUR",
        "foundingDate": "2024",
        "sameAs": [IG, TIKTOK, YELP],
    }
    data.update(EXTRA_LD)
    return ('<script type="application/ld+json">'
            + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>")


EXTRA_LD = {}  # wird nach Lesen von fakten.md ggf. ergänzt (z. B. priceRange, geo)


def head(path, title, desc, light=False, ld=False, preload=(), robots="index, follow"):
    """preload: [(slug, sizes, media|None), …] — je Hero-Quelle ein Preload mit passender Media-Query."""
    assert len(title) <= 60, f"title zu lang ({len(title)}): {title}"
    assert len(desc) <= 155, f"description zu lang ({len(desc)}): {desc}"
    url = BASE + ("" if path == "index.html" else path)
    og = BASE + "assets/brand/og.jpg"
    body_cls = ' class="page-light"' if light else ""
    pre = ""
    for slug, sizes, media in preload:
        mq = f' media="{media}"' if media else ""
        pre += (f'\n<link rel="preload" as="image"{mq} imagesrcset="{srcset(slug)}" '
                f'imagesizes="{sizes}" fetchpriority="high">')
    fav_svg = ('\n<link rel="icon" href="assets/brand/favicon.svg" type="image/svg+xml">'
               if asset_exists("assets/brand/favicon.svg") else "")
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#5B0041">
<meta name="robots" content="{robots}">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="DIE DREI · Weinbar · Kiel">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="DIE DREI · Weinbar · Kiel">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{og}">{fav_svg}
<link rel="icon" href="assets/brand/favicon.ico" sizes="any">
<link rel="icon" href="assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">
<link rel="preload" href="{FONT_PRELOAD}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>{pre}
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="css/style.css">
{jsonld() if ld else ""}
</head>
<body{body_cls} data-hours="{HOURS_ATTR}">
<a class="skip" href="#main">Zum Inhalt springen</a>
"""


FONT_PRELOAD = "assets/fonts/fraunces.woff2"


def header(active):
    links = "".join(
        f'\n      <a class="nav-link" href="{h}"{" aria-current=\"page\"" if h == active else ""}>{t}</a>'
        for h, t in NAV[1:])
    mob = "".join(
        f'\n    <a href="{h}"{" aria-current=\"page\"" if h == active else ""}><i aria-hidden="true">{i:02d}</i>{t}</a>'
        for i, (h, t) in enumerate(NAV, 1))
    return f"""<header class="site-header">
  <a class="brand" href="index.html" aria-label="DIE DREI – zur Startseite">
    <img class="logo-w" src="{brand('logo-white')}" alt="DIE DREI" width="500" height="348">
    <img class="logo-b" src="{brand('logo-berry')}" alt="" width="500" height="348" aria-hidden="true">
  </a>
  <div class="head-right">
    <nav class="main-nav" aria-label="Hauptnavigation">{links}
    </nav>
    <a class="pill" href="tel:{TEL}" aria-label="Tisch reservieren – {TEL_TXT} anrufen">{PHONE}<span class="long">Tisch reservieren</span><span class="short">Reservieren</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav-overlay" aria-label="Menü öffnen"><span class="mb-ico" aria-hidden="true"><i></i><i></i></span></button>
  </div>
</header>
<div class="nav-overlay" id="nav-overlay" role="dialog" aria-modal="true" aria-label="Menü">
  <nav class="nav-list" aria-label="Seiten">{mob}
  </nav>
  <div class="nav-meta">
    <p><span class="today" data-today></span></p>
    <p>{NAME_LONG}<br>{STREET} · {ZIP_CITY}<br><a href="tel:{TEL}">{TEL_TXT}</a></p>
    <div class="row"><a href="{IG}"{EXT}>Instagram</a><a href="{TIKTOK}"{EXT}>TikTok</a><a href="{YELP}"{EXT}>Yelp</a><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></div>
  </div>
</div>
<main id="main">
"""


def hours_list(cls="hours", attrs=True):
    rows = ""
    for d, name, h in HOURS:
        t = f'{h[0]} – {h[1]} Uhr' if h else "Ruhetag"
        da = f' data-day="{d}"' if attrs else ""
        c = ' class="is-closed"' if not h else ""
        rows += (f'\n      <li{da}{c}><span class="h-day">{name} <span class="h-badge">Heute</span></span> '
                 f'<span class="h-time num">{t}</span></li>')
    return f'<ul class="{cls}" aria-label="Öffnungszeiten">{rows}\n    </ul>'


def footer():
    return f"""</main>
<footer class="footer">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-claim">
        <img src="{brand('logo-white')}" alt="DIE DREI" width="500" height="348" loading="lazy">
        <p class="d3">Jeder Schluck erzählt <em>eine Geschichte.</em></p>
      </div>
      <div class="foot-cols">
        <nav class="foot-col" aria-label="Seiten im Fußbereich">
          <p class="lbl">Seiten</p>
          <ul>
            <li><a href="index.html">Start</a></li>
            <li><a href="bar.html">Die Bar</a></li>
            <li><a href="weinkarte.html">Weinkarte</a></li>
            <li><a href="besuch.html">Besuch</a></li>
          </ul>
        </nav>
        <div class="foot-col">
          <p class="lbl">Adresse</p>
          <p>{NAME_LONG}<br>{STREET}<br>{ZIP_CITY}</p>
          <p><a href="tel:{TEL}">{TEL_TXT}</a><br><a href="mailto:{MAIL}">{MAIL}</a></p>
        </div>
        <div class="foot-col">
          <p class="lbl">Öffnungszeiten</p>
          <p>Mittwoch – Sonntag<br><span class="num">17:00 – 23:00 Uhr</span></p>
          <p>Montag &amp; Dienstag<br>Ruhetag</p>
        </div>
        <div class="foot-col">
          <p class="lbl">Folge uns</p>
          <ul>
            <li><a href="{IG}"{EXT}>Instagram</a></li>
            <li><a href="{TIKTOK}"{EXT}>TikTok</a></li>
            <li><a href="{YELP}"{EXT}>Yelp</a></li>
            <li><a href="{GOOGLE}"{EXT}>Google</a></li>
          </ul>
        </div>
      </div>
    </div>
    <div class="foot-base">
      <span>© 2026 DIE DREI · Weinbar · Kiel</span>
      <nav aria-label="Rechtliches"><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></nav>
    </div>
  </div>
</footer>
<script src="js/script.js" defer></script>
</body>
</html>
"""


def hero(slug, label, title, lead="", page=False, pos=None, foot="", split=False, mobile=None, mpos=None,
         alt=None):
    """Vollbild-Hero (Querformat) oder Split-Hero (Hochformat: Beeren-Textfeld + Foto),
    damit Hochformat-Fotos nie hochskaliert werden."""
    if split:
        lead_html = f'\n      <p class="lead rv" data-d="2">{lead}</p>' if lead else ""
        foot_html = f'\n      <div class="hero-foot rv" data-d="3">{foot}\n      </div>' if foot else ""
        return f"""<section class="hero hero--split">
  <div class="hero-media">{img(slug, SPLIT_SIZES, eager=True, pos=pos)}</div>
  <div class="hero-inner">
      <p class="lbl rv" data-d="1">{label}</p>
      <h1 class="d1 rise">{title}</h1>{lead_html}{foot_html}
  </div>
</section>
"""
    cls = "hero hero--page" if page else "hero"
    lead_html = f'\n      <p class="lead rv" data-d="2">{lead}</p>' if lead else ""
    foot_html = f'\n      <div class="hero-foot rv" data-d="3">{foot}\n      </div>' if foot else ""
    return f"""<section class="{cls}">
  <div class="hero-media" data-plx="0.05">{picture(slug, mobile, pos=pos, mpos=mpos, alt=alt) if mobile else img(slug, "100vw", eager=True, pos=pos)}</div>
  <div class="hero-inner wrap">
      <p class="lbl rv" data-d="1">{label}</p>
      <h1 class="d1 rise">{title}</h1>{lead_html}{foot_html}
  </div>
</section>
"""


SPLIT_SIZES = "(max-width: 599px) 100vw, 50vw"


def page_head(label, title, lead=""):
    lead_html = f'\n    <p class="lead rv" data-d="2" style="margin-top:1.4rem">{lead}</p>' if lead else ""
    return f"""<section class="page-head">
  <div class="wrap">
    <p class="lbl rv" data-d="1">{label}</p>
    <h1 class="d2 split">{title}</h1>{lead_html}
  </div>
</section>
"""


def btn_line(href, label, d=None, ext=False):
    dd = f' data-d="{d}"' if d else ""
    return f'<a class="btn-line rv"{dd} href="{href}"{EXT if ext else ""}>{label} {ARROW}</a>'


def tel_btn(cls="btn", label="Tisch reservieren"):
    return f'<a class="{cls}" href="tel:{TEL}">{PHONE}{label}</a>'


# ------------------------------------------------------------------
# Weinkarte (aus $S/weinkarte.json)
# ------------------------------------------------------------------
def load_weinkarte():
    p = os.path.join(SCRATCH, "weinkarte.json")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def slugify(s):
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("é", "e"), ("&", "und")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def fmt_price(p):
    """Akzeptiert Zahl (6.5) oder String ('6,50 €'); None/''/'--' → None."""
    if p is None:
        return None
    if isinstance(p, (int, float)):
        return f"{p:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"
    s = str(p).strip()
    if s in ("", "-", "--", "–", "—"):
        return None
    s = s.replace(" €", " €")
    if "€" not in s:
        s += " €"
    return s


WK = load_weinkarte()
CATS = {c["id"]: c for c in WK["kategorien"]}
BROTZEIT_ID = "brotzeit" if "brotzeit" in CATS else slugify("Brotzeit")
NBSP = "\u00a0"
NNBSP = "\u202f"


def fmt_menge(m):
    """'0,1l' → '0,1 l', '4cl' → '4 cl' (schmales geschütztes Leerzeichen)."""
    if not m:
        return ""
    return re.sub(r"^([\d,]+)\s*(l|cl|ml)$", lambda x: x.group(1) + NNBSP + x.group(2), m.strip())


def col_label(sp, short=False):
    lab = (sp.get("label") or "").strip()
    if short and lab.lower().startswith("flasche ") and len(lab) > 10:
        lab = lab.split(" ", 1)[1]          # „Flasche Magnum" → „Magnum"
    men = fmt_menge(sp.get("menge"))
    return lab, men


def wk_rows(cat):
    """Zeilen einer Kategorie. Zusammengehörige Zeilen (gruppe / Elternzeile) werden zu
    einem Block (.wk-set) gebündelt, damit sie im Zwei-Spalten-Satz nie getrennt werden."""
    sp = cat["spalten"]
    prices = [e.get("preise") or [] for e in cat["eintraege"]]
    single = all(sum(1 for p in pr if fmt_price(p)) <= 1 for pr in prices)
    ncols = 1 if single else len(sp)
    title = cat["titel"]
    blocks = []
    prev_name, last_group = None, None
    for e in cat["eintraege"]:
        g = e.get("gruppe")
        if g == title:          # z. B. Flammkuchen: Gruppe = Kategorie → keine Zwischenzeile, kein Block
            g = None
            lead_dots = True
        else:
            lead_dots = False
        sub = bool(g)
        cont = bool(g) and (g == last_group or g == prev_name)
        if not cont:
            blocks.append([])
        if g and g != last_group and g != title and g != prev_name:
            blocks[-1].append(f'<li class="wk-row wk-grp"><p class="wk-name">{esc(g)}</p></li>')
        last_group = g
        yr = f'<span class="yr">{e["jahrgang"]}</span> ' if e.get("jahrgang") else ""
        name = esc(e["name"]).replace(" (NEU)", ' <span class="wk-tag">neu</span>')
        if sub or lead_dots:
            name = '<span class="dots" aria-hidden="true">…</span> ' + name
        hint = f' <span class="wk-hint">{esc(e["hinweis"])}</span>' if e.get("hinweis") else ""
        meta = [x for x in (e.get("zusatz"), e.get("erzeuger")) if x]
        pr = e.get("preise") or []
        idx = next((i for i, p in enumerate(pr) if fmt_price(p)), None)
        if single:
            lab = (sp[idx].get("label") or "") if (idx is not None and len(sp) > 1) else ""
            unit = " ".join(x for x in (lab, fmt_menge(e.get("menge"))) if x)
            if unit:
                meta.append(unit)
        elif e.get("menge"):
            meta.append(fmt_menge(e["menge"]))
        if e.get("beschreibung"):
            meta.append(e["beschreibung"])
        meta_html = f' <span class="wk-meta">{esc(" · ".join(meta))}</span>' if meta else ""
        cells = []
        if single:
            val = fmt_price(pr[idx]) if idx is not None else None
            cells.append(f'<span class="wk-p num">{val}</span>' if val
                         else '<span class="wk-p na"></span>')
        else:
            for i, s_ in enumerate(sp):
                val = fmt_price(pr[i]) if i < len(pr) else None
                lab, men = col_label(s_, short=True)
                labtxt = " ".join(x for x in (lab, men) if x)
                if val:
                    cells.append(f' <span class="wk-p num"><span class="lab">{esc(labtxt)}'
                                 f'<span class="sr-only">: </span></span>{val}</span>')
                else:
                    cells.append('<span class="wk-p na"></span>')
        cls = "wk-row wk-sub" if sub else "wk-row"
        blocks[-1].append(f'<li class="{cls}"><p class="wk-name">{yr}{name}{hint}{meta_html}</p>'
                          f'<div class="wk-prices">{"".join(cells)}</div></li>')
        prev_name = e["name"]
    out = ""
    total = sum(len(b) for b in blocks)
    twocol = single and total >= 2 and max(len(b) for b in blocks) <= (total + 1) // 2
    for bl in blocks:
        if len(bl) == 1:
            out += "\n        " + bl[0]
        else:
            out += ('\n        <li class="wk-set"><ul>' + "".join("\n          " + r for r in bl)
                    + "\n        </ul></li>")
    return ncols, single, twocol, out


UNIT_SUB = {"Glas": "pro Glas", "Tasse": "pro Tasse", "Flasche": "pro Flasche"}


def wk_cat(cat, h="h3"):
    ncols, single, twocol, rows = wk_rows(cat)
    sp = cat["spalten"]
    heads, sub = "", ""
    if single:
        lab = sp[0].get("label") if len(sp) == 1 else None
        if lab:
            sub = f'<small>{UNIT_SUB.get(lab, lab)}</small>'
    else:
        for s_ in sp:
            lab, men = col_label(s_, short=True)
            heads += f'<span class="wk-col">{esc(lab)}<span>{men}</span></span>'
    title = esc(cat["titel"]).replace(" (NEU)", ' <span class="wk-tag">neu</span>')
    cls = "wk-cat wk-compact" + (" wk-2col" if twocol else "") if single else "wk-cat"
    cols = f'<span class="wk-cols" aria-hidden="true">{heads}</span>' if heads else ""
    return f"""
    <section class="{cls} rv" id="{cat['id']}" style="--cols:{ncols}" aria-labelledby="t-{cat['id']}">
      <div class="wk-cat-head"><{h} id="t-{cat['id']}">{title}{sub}</{h}>{cols}</div>
      <ul class="wk-list">{rows}
      </ul>
    </section>"""


# Gruppierung für die Seite: Weine einzeln, Speisen + weitere Getränke als Blöcke
WINE_IDS = [c["id"] for c in WK["kategorien"] if (c.get("fusszeile") or "").endswith("Weine")]
FOOD_IDS = [c["id"] for c in WK["kategorien"] if c.get("seite") == max(x.get("seite", 0) for x in WK["kategorien"])]
DRINK_IDS = [c["id"] for c in WK["kategorien"] if c["id"] not in WINE_IDS + FOOD_IDS]
CHIP_SHORT = {"schaumweine": "Schaumwein", "weissweine": "Weißwein", "roseweine": "Rosé",
              "rotweine": "Rotwein", "suessweine": "Süßwein"}


# ------------------------------------------------------------------
# Seiten
# ------------------------------------------------------------------
def page_index():
    foot = f"""
        <div class="hero-meta"><span class="today" data-today></span> <span>{STREET} · Kiel</span></div>
        <div class="btns"><a class="btn btn--light" href="weinkarte.html">Zur Weinkarte</a></div>"""
    out = head("index.html",
               "DIE DREI – Deine Weinbar in Kiel",
               "Deine Weinbar in Kiel am Knooper Weg 189: Weine von Klassikern bis zu verborgenen "
               "Schätzen, dazu Brotzeit und Flammkuchen. Mi–So ab 17 Uhr.",
               ld=True, preload=[("gaeste-sekt", "100vw", MOBILE_MQ), ("teller-glas", "100vw", DESKTOP_MQ)])
    out += header("index.html")
    out += hero("teller-glas", "Weinbar · Kiel · seit 2024",
                "Jeder Schluck erzählt <em>eine Geschichte.</em>", pos="50% 34%", foot=foot,
                mobile="gaeste-sekt", mpos="22% 40%",
                alt="Käseplatte und Weingläser an einem Tisch der Weinbar DIE DREI")
    out += f"""
<section class="sec">
  <div class="wrap intro">
    <div class="intro-aside">
      <p class="lbl rv">Willkommen</p>
      <div class="line-h"></div>
      <p class="award rv" data-d="1"><span>Falstaff</span> Weinangebot 44/50 Punkte</p>
    </div>
    <div class="intro-body">
      <h2 class="d2 split">Wo sich Lebensfreude und die Faszination für Wein <em>vereinen.</em></h2>
      <p class="lead rv" data-d="1">Herzlich willkommen bei DIE DREI, Deiner Weinbar in Kiel. Tauche ein in ein
      Ambiente, das zum Verweilen einlädt, und entdecke unsere sorgfältig zusammengestellte Weinkarte.</p>
      <p class="rv" data-d="2">Bei uns erlebst Du die Vielfalt des Weins – von klassischen Rebsorten bis zu
      verborgenen Schätzen kleiner Winzer. Jeder Schluck spiegelt sein Terroir und die Leidenschaft der Winzer
      wider. Lass Dich auf eine Reise durch die Welt der Weine mitnehmen.</p>
      <p class="sig rv" data-d="3">Dein Team von DIE DREI <span>Wo Wein und Kultur zusammenfließen.</span></p>
    </div>
  </div>
</section>

<section class="sec sec-blush">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="lbl rv">Bei uns</p>
        <h2 class="d2 split">Wein, Raum <em>und kleine Genüsse.</em></h2>
      </div>
      <p class="rv" data-d="1">Ein langer Tag, der ausklingen darf, oder ein besonderer Abend mit Freunden –
      bei uns steht der Genuss im Vordergrund.</p>
    </div>
    <div class="tiles">
      <article class="tile">
        {figure("raum-sofa", TILE_SIZES, pos="62% 50%")}
        <p class="t-num rv" aria-hidden="true">01</p>
        <h3 class="rv">Die Bar</h3>
        <p class="rv" data-d="1">Einladend, gemütlich und unvergesslich: gemütliche Räume, stimmungsvolle
        Musik und eine liebevolle Einrichtung.</p>
        {btn_line("bar.html", "Die Bar entdecken", 2)}
      </article>
      <article class="tile">
        {figure("weinkuehlschrank", TILE_SIZES, pos="50% 40%")}
        <p class="t-num rv" aria-hidden="true">02</p>
        <h3 class="rv">Die Weinkarte</h3>
        <p class="rv" data-d="1">Von Klassikern bis zu verborgenen Schätzen – sorgfältig ausgewählt von
        unserem erfahrenen Sommelier, im Glas oder als Flasche.</p>
        {btn_line("weinkarte.html", "Zur Weinkarte", 2)}
      </article>
      <article class="tile">
        {figure("kaeseplatte", TILE_SIZES, pos="50% 62%")}
        <p class="t-num rv" aria-hidden="true">03</p>
        <h3 class="rv">Brotzeit</h3>
        <p class="rv" data-d="1">Für den kleinen Hunger: Käse allerlei mit Brot und Dip, Flammkuchen
        und mehr – genau das Richtige zum Wein.</p>
        {btn_line("weinkarte.html#" + BROTZEIT_ID, "Zur Brotzeit", 2)}
      </article>
    </div>
  </div>
</section>

<section class="sec-berry">
  <div class="marquee" aria-hidden="true">
    <div class="mq-track">{MQ}{MQ}</div>
  </div>
  <p class="sr-only">Weißwein, Rotwein, Roséwein, Champagner, Prosecco</p>
  <div class="sec wrap">
    <div class="statement">
      <h2 class="d2 split">Ein guter Wein ist wie ein <em>Gedicht in einem Glas.</em></h2>
      <p class="lead rv" data-d="2">Er erzählt Geschichten, weckt Erinnerungen und lädt zum Träumen ein.</p>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="lbl rv">Stimmen</p>
        <h2 class="d2 split">Was unsere Gäste <em>sagen.</em></h2>
      </div>
      <p class="rv lbl--dim" data-d="1">Auszüge aus Google-Rezensionen.</p>
    </div>
    <div class="voices">{voices()}
    </div>
  </div>
</section>

<section class="sec sec-blush" id="besuch">
  <div class="wrap visit">
    <div>
      <p class="lbl rv">Öffnungszeiten</p>
      <h2 class="d2 split" style="margin-top:1.1rem">Mittwoch bis Sonntag <em>ab 17 Uhr.</em></h2>
      <div class="rv" data-d="1">{hours_list()}</div>
    </div>
    <div class="card-berry rv" data-d="1">
      <p class="lbl">Telefonische Reservierung</p>
      <p class="d3">Ein gemütlicher Abend mit Deinen Liebsten – <em>oder eine größere Feier?</em></p>
      <p>Dann freuen wir uns auf Deine telefonische Reservierung.</p>
      <a class="phone num" href="tel:{TEL}">{TEL_TXT}</a>
      <div class="line-h"></div>
      <p>{NAME_LONG}<br>{STREET} · {ZIP_CITY}</p>
      {btn_line("besuch.html", "Anfahrt &amp; Infos")}
    </div>
  </div>
</section>
{social()}"""
    out += footer()
    return out


def social():
    """„Folge uns“: Instagram + TikTok als einfache Links (keine Einbettung → keine Drittanbieter-Requests)."""
    cards = ""
    for i, (href, name, handle, icon) in enumerate(
            [(IG, "Instagram", IG_HANDLE, IG_ICON), (TIKTOK, "TikTok", TT_HANDLE, TT_ICON)], 1):
        cards += f"""
      <a class="social-card rv" data-d="{i}" href="{href}"{EXT} aria-label="{name}: {handle} (öffnet in neuem Tab)">
        <span class="sc-ico">{icon}</span>
        <span class="sc-txt"><span class="sc-name">{name}</span><span class="sc-handle">{handle}</span></span>
        <span class="sc-arrow">{ARROW}</span>
      </a>"""
    return f"""
<section class="sec">
  <div class="wrap social">
    <div class="social-head">
      <p class="lbl rv">Folge uns</p>
      <h2 class="d2 split">Wein, Freunde, gute Abende – <em>auch auf Instagram &amp; TikTok.</em></h2>
    </div>
    <div class="social-links">{cards}
    </div>
  </div>
</section>
"""


TILE_SIZES = "(max-width: 639px) 100vw, (max-width: 1320px) 29vw, 370px"
GAL_P = "(max-width: 760px) 46vw, (max-width: 1320px) 21vw, 285px"
GAL_W = "(max-width: 760px) 92vw, (max-width: 1320px) 42vw, 590px"
# hohes Querformat-Motiv im 2-Zeilen-Slot: sichtbare Breite × (1920/1280) = gerenderte Bildbreite
GAL_T = "(max-width: 760px) 170vw, (max-width: 1320px) 82vw, 1100px"
SR_SIZES = "(max-width: 639px) 100vw, (max-width: 1320px) 46vw, 640px"
MQ = "".join(f"<span>{w}</span>" for w in ("Weißwein", "Rotwein", "Roséwein", "Champagner", "Prosecco"))


def voices():
    lead = REVIEWS[0]
    out = f"""
      <figure class="voice voice--lead rv">
        <blockquote><p>{lead[1]}</p></blockquote>
        <figcaption><b>{lead[0]}</b> <span>via Google Rezensionen</span></figcaption>
      </figure>"""
    for i, (n, q) in enumerate(REVIEWS[1:], 1):
        out += f"""
      <figure class="voice rv" data-d="{i}">
        <blockquote><p>{q}</p></blockquote>
        <figcaption><b>{n}</b> <span>via Google Rezensionen</span></figcaption>
      </figure>"""
    return out


def page_bar():
    out = head("bar.html",
               "Die Bar – DIE DREI Weinbar Kiel",
               "Gemütliche Räume, stimmungsvolle Musik, liebevolle Einrichtung: die Weinbar DIE DREI am "
               "Knooper Weg 189 in Kiel – seit 2024. Dazu Brotzeit und Flammkuchen.",
               preload=[("raum-lampen", "100vw", MOBILE_MQ), ("raum-panorama", "100vw", DESKTOP_MQ)])
    out += header("bar.html")
    out += hero("raum-panorama", "Die Bar",
                "Einladend, gemütlich <em>und unvergesslich.</em>",
                lead="Bei uns steht der Genuss im Vordergrund – ob Du einen langen Tag ausklingen lässt "
                     "oder einen besonderen Abend suchst.",
                page=True, pos="50% 55%", mobile="raum-lampen", mpos="40% 50%",
                alt="Gastraum der Weinbar DIE DREI mit orangefarbenen Wänden, Hängeleuchten und Weinregalen")
    out += f"""
<section class="sec">
  <div class="wrap intro">
    <div class="intro-aside">
      <p class="lbl rv">Unsere Bar</p>
      <div class="line-h"></div>
      <p class="rv" data-d="1">Seit 2024 am Knooper Weg in Kiel.</p>
    </div>
    <div class="intro-body">
      <h2 class="d3 split">Gemütliche Räume, stimmungsvolle Musik und eine liebevolle Einrichtung –
      eine Atmosphäre, in der Du Dich <em>sofort wohlfühlst.</em></h2>
      <p class="rv" data-d="1">Unsere Räume laden zum Verweilen ein und bieten den perfekten Rahmen für
      gesellige Abende. Erlebe unvergessliche Momente in bester Gesellschaft und genieße die besondere
      Stimmung.</p>
      <p class="rv" data-d="2">Seit unserer Eröffnung im Jahr 2024 haben wir es uns zur Aufgabe gemacht,
      Dir unvergessliche Genussmomente zu bereiten – mit sorgfältig ausgewählten Weinen und herzlicher
      Gastfreundschaft.</p>
    </div>
  </div>
</section>

<section class="sec-tight" style="padding-top:0">
  <div class="wrap">
    <div class="gallery">
      {figure("rose-flaschen", GAL_T, cls="g-tall", pos="38% 50%")}
      {figure("nische-blau", GAL_P, d=1)}
      {figure("bar-detail", GAL_P, d=2)}
      {figure("tresen", GAL_P, d=3)}
      {figure("zitronen-korken", GAL_P, d=1)}
      {figure("spiegel-raum", GAL_P, d=2)}
      {figure("dip-cracker", GAL_P, d=3)}
    </div>
  </div>
</section>

<section class="sec sec-blush">
  <div class="wrap split-row">
    {figure("raum-weinschrank", SR_SIZES, cls="sr-media tall", plx="0.04")}
    <div class="sr-body">
      <p class="lbl rv">Unsere Weine</p>
      <h2 class="d2 split">Von Kennern <em>für Genießer.</em></h2>
      <p class="rv" data-d="1">Jeder einzelne Wein wurde sorgfältig von unserem erfahrenen Sommelier
      ausgewählt – aus den besten Anbaugebieten der Welt. Ob Rotwein, Weißwein oder Rosé: Bei uns findest
      Du den passenden Tropfen für jeden Geschmack.</p>
      <p class="rv" data-d="2">Lass Dich von unserem Team beraten und entdecke neue Lieblingsweine.</p>
      {btn_line("weinkarte.html", "Zur Weinkarte", 3)}
    </div>
  </div>
</section>

<section class="sec sec-berry">
  <div class="wrap statement">
    <p class="lbl rv">Feiern bei uns</p>
    <h2 class="d2 split" style="margin-top:1.2rem">Du planst eine <em>größere Feier?</em></h2>
    <p class="lead rv" data-d="1">Dann freuen wir uns auf Deinen Anruf.</p>
    <div class="btns btns--center rv" data-d="2">{tel_btn("btn btn--light", TEL_TXT)}<a class="btn btn--ghost" href="besuch.html">Besuch planen</a></div>
  </div>
</section>

<section class="sec" id="brotzeit">
  <div class="wrap split-row flip">
    {figure("flammkuchen", SR_SIZES, cls="sr-media square", pos="50% 70%", plx="0.04")}
    <div class="sr-body">
      <p class="lbl rv">Brotzeit &amp; Kleinigkeiten</p>
      <h2 class="d2 split">Für den <em>kleinen Hunger.</em></h2>
      <p class="rv" data-d="1">Zum Wein gibt es Brotzeit mit Käse und Schinken, Flammkuchen und weitere
      Kleinigkeiten.</p>
      <div class="rv" data-d="2" style="width:100%">{brotzeit_teaser()}</div>
      <p class="note rv" data-d="3">Auszug aus unserer Karte, Stand {STAND}. Preise laut aktueller Karte vor Ort.</p>
      {btn_line("weinkarte.html#" + BROTZEIT_ID, "Ganze Karte ansehen", 3)}
    </div>
  </div>
</section>
"""
    out += footer()
    return out


def page_besuch():
    foot = f"""
        <div class="hero-meta"><span class="today" data-today></span> <span>{STREET} · {ZIP_CITY}</span></div>"""
    out = head("besuch.html",
               "Öffnungszeiten & Anfahrt – DIE DREI Weinbar Kiel",
               "Öffnungszeiten, Adresse und telefonische Reservierung: DIE DREI, Knooper Weg 189, 24118 Kiel. "
               "Mi–So 17–23 Uhr, Mo und Di Ruhetag.",
               ld=True, preload=[("eingang-terrasse", SPLIT_SIZES, None)])
    out += header("besuch.html")
    out += hero("eingang-terrasse", "Besuch",
                "Schön, dass Du <em>vorbeikommst.</em>", split=True, foot=foot)
    out += f"""
<section class="sec">
  <div class="wrap visit">
    <div>
      <p class="lbl rv">Öffnungszeiten</p>
      <h2 class="d2 split" style="margin-top:1.1rem">Mittwoch bis Sonntag, <em>17 bis 23 Uhr.</em></h2>
      <div class="rv" data-d="1">{hours_list()}</div>
    </div>
    <div>
      <p class="lbl rv">Auf einen Blick</p>
      <dl class="flist rv" data-d="1" style="margin-top:2rem">
        <div><dt>Adresse</dt><dd>{NAME_LONG}<br>{STREET}<br>{ZIP_CITY}</dd></div>
        <div><dt>Telefon</dt><dd><a class="ul num" href="tel:{TEL}">{TEL_TXT}</a></dd></div>
        <div><dt>E-Mail</dt><dd><a class="ul" href="mailto:{MAIL}">{MAIL}</a></dd></div>
        <div><dt>Bezahlen</dt><dd>Bargeld, EC-Karte, Kreditkarte und kontaktlos (NFC)</dd></div>
        <div><dt>Online</dt><dd><a class="ul" href="{IG}"{EXT}>Instagram</a> · <a class="ul" href="{TIKTOK}"{EXT}>TikTok</a> · <a class="ul" href="{YELP}"{EXT}>Yelp</a> · <a class="ul" href="{GOOGLE}"{EXT}>Google</a></dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="sec sec-berry">
  <div class="wrap visit">
    <div>
      <p class="lbl rv">Telefonische Reservierung</p>
      <h2 class="d2 split" style="margin-top:1.1rem">Dein Tisch <em>bei uns.</em></h2>
      <p class="lead rv" data-d="1" style="margin-top:1.6rem">Möchtest Du einen gemütlichen Abend mit Deinen
      Liebsten verbringen? Oder planst Du eine größere Feier? Dann freuen wir uns auf Deinen Anruf.</p>
    </div>
    <div class="rv" data-d="2" style="display:flex;flex-direction:column;gap:1.4rem;align-items:flex-start;padding-top:.4rem">
      <a class="phone-xl num" href="tel:{TEL}">{TEL_TXT}</a>
      <p>Reservierungen und Anfragen für Feiern nehmen wir telefonisch entgegen.</p>
      {tel_btn("btn btn--light", "Jetzt anrufen")}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap split-row">
    {figure("tresen-fenster", SR_SIZES, cls="sr-media", plx="0.04")}
    <div class="sr-body">
      <p class="lbl rv">Anfahrt</p>
      <h2 class="d2 split">So findest Du <em>zu uns.</em></h2>
      <p class="rv" data-d="1">Du findest DIE DREI am Knooper Weg 189 in Kiel.</p>
      <div class="btns rv" data-d="2">
        <a class="btn" href="{OSM}"{EXT}>In OpenStreetMap öffnen</a>
        <a class="btn btn--ghost" href="{GMAPS}"{EXT}>Google Maps</a>
      </div>
      <p class="note rv" data-d="3">Wir binden bewusst keine Karte ein: Erst wenn Du einen der Links öffnest,
      werden Daten an den jeweiligen Kartendienst übertragen.</p>
    </div>
  </div>
</section>
"""
    out += footer()
    return out


def legal_page(path, title, desc, label, h1, body):
    out = head(path, title, desc, light=True)
    out += header(path)
    out += page_head(label, h1)
    out += f"""
<section class="sec" style="padding-top:clamp(3rem,6vw,5rem)">
  <div class="wrap">
    <div class="legal">
{body}
    </div>
  </div>
</section>
"""
    out += footer()
    return out




# ------------------------------------------------------------------
# Brotzeit-Teaser (bar.html) — Preise exakt aus der Karte
# ------------------------------------------------------------------
def _find(cat_id, name, gruppe=None):
    for e in CATS.get(cat_id, {}).get("eintraege", []):
        if e["name"] == name and (gruppe is None or e.get("gruppe") == gruppe):
            return e
    return None


def brotzeit_teaser():
    picks = [
        ("brotzeit", "Käse allerlei mit Brot und Dip (2 Personen)", None,
         "Käse allerlei", "mit Brot und Dip, für 2\u00a0Personen"),
        ("brotzeit", "mit Rinderschinken", "Käse allerlei mit Brot und Dip (2 Personen)",
         "Käse allerlei mit Rinderschinken", "mit Brot und Dip, für 2\u00a0Personen"),
        ("flammkuchen", "nach Nordischer Art", "Flammkuchen", "Flammkuchen nach Nordischer Art", None),
        ("flammkuchen", "der Vegane", "Flammkuchen", "Flammkuchen – der Vegane", None),
        ("brotzeit", "verschiedene Brote mit Dip", "Brotkorb", "Brotkorb", "verschiedene Brote mit Dip"),
    ]
    rows = ""
    for cid, nm, grp, label, sub in picks:
        e = _find(cid, nm, grp)
        if not e:
            continue
        price = fmt_price((e.get("preise") or [None])[0])
        sub = sub or e.get("beschreibung") or ""
        sub_html = f' <span class="m-sub">{esc(sub)}</span>' if sub else ""
        rows += (f'\n        <li><span class="m-name">{esc(label or e["name"])}</span> '
                 f'<span class="m-price">{price}</span>{sub_html}</li>')
    return f'<ul class="menu-list">{rows}\n      </ul>'


# ------------------------------------------------------------------
# Weinkarte
# ------------------------------------------------------------------
def _ausser_haus_note():
    for c in WK["kategorien"]:
        for n in c.get("notizen") or []:
            if "außer Haus" in n and "60" in n:
                return True
    return False


def page_weinkarte():
    out = head("weinkarte.html",
               "Weinkarte – DIE DREI Weinbar Kiel",
               "Die Karte der Weinbar DIE DREI in Kiel: Schaum-, Weiß-, Rosé-, Rot- und Süßweine im Glas "
               f"und als Flasche, dazu Brotzeit und Flammkuchen. Stand {WK['stand']}.",
               preload=[("sauternes-kiste", SPLIT_SIZES, None)])
    out += header("weinkarte.html")
    out += hero("sauternes-kiste", "Unsere Weinkarte",
                "Von Klassikern bis zu <em>verborgenen Schätzen.</em>",
                lead="Eine Reise durch die Welt des Weins – im Glas oder als Flasche, "
                     "ausgewählt von unserem Sommelier.",
                split=True)
    ah = ""
    if _ausser_haus_note():
        ah = (f'\n        <p class="note">Alle Weinflaschen kannst Du auch für zu Hause mitnehmen – '
              f'auf Flaschen unter 60&nbsp;€ gewähren wir 20&nbsp;% Rabatt (laut Karte, Stand {WK["stand"]}).</p>')
    chips = "".join(f'<a href="#{i}">{CHIP_SHORT.get(i, CATS[i]["titel"])}</a>' for i in WINE_IDS)
    chips += ('<span class="sep" aria-hidden="true"></span><a href="#getraenke">Bar &amp; Getränke</a>'
              '<a href="#speisen">Zum Essen</a>')
    wines = "".join(wk_cat(CATS[i]) for i in WINE_IDS)
    food = "".join(wk_cat(CATS[i]) for i in FOOD_IDS)
    drinks = "".join(wk_cat(CATS[i]) for i in DRINK_IDS)
    out += f"""
<section class="sec">
  <div class="wrap wk-intro wk-measure">
    <div>
      <p class="lbl rv">Die Karte</p>
      <h2 class="d2 split" style="margin-top:1.1rem">Finde Deinen <em>persönlichen Favoriten.</em></h2>
      <p class="lead rv" data-d="1" style="margin-top:1.6rem">Ob Rotwein, Weißwein oder Rosé – bei uns findest
      Du den passenden Tropfen für jeden Geschmack. Lass Dich von unserem Team beraten und entdecke neue
      Lieblingsweine.</p>
    </div>
    <div class="wk-stand rv" data-d="2">
      <p class="award"><span>Falstaff</span> Weinangebot 44/50 Punkte</p>
      <p>Stand {WK['stand']} – Preise laut aktueller Karte vor Ort.</p>
      <a class="btn" href="{PDF}" target="_blank" rel="noopener" type="application/pdf">{DOWN}Karte als PDF</a>{ah}
    </div>
  </div>
</section>

<nav class="wk-nav" aria-label="Kategorien der Karte">
  <div class="wk-chips">{chips}</div>
</nav>

<div class="wrap wk-body wk-measure">
  <div class="wk-group" id="weine">
    <p class="lbl rv">Weine &amp; Schaumweine</p>
    <h2 class="d2 split">Im Glas <em>oder als Flasche.</em></h2>{wines}
  </div>
  <div class="wk-group" id="getraenke">
    <p class="lbl rv">Bar &amp; Getränke</p>
    <h2 class="d2 split">Vom Aperitif <em>bis zum Espresso.</em></h2>{drinks}
  </div>
  <div class="wk-group" id="speisen">
    <p class="lbl rv">Zum Essen</p>
    <h2 class="d2 split">Für den <em>kleinen Hunger.</em></h2>{food}
  </div>
  <div class="wk-foot sec-tight" style="padding-bottom:var(--sec)">
    <div class="line-h"></div>
    <div class="wk-end">
      <p class="rv">Stand {WK['stand']} – Preise laut aktueller Karte vor Ort. Alle Preise in Euro.
      [PLATZHALTER: Hinweis zu Allergenen/Zusatzstoffen – liegt der Karte nicht bei]</p>
      <div class="btns rv" data-d="1"><a class="btn" href="{PDF}" target="_blank" rel="noopener" type="application/pdf">{DOWN}Karte als PDF</a>{tel_btn("btn btn--ghost")}</div>
    </div>
  </div>
</div>
"""
    out += footer()
    return out


# ------------------------------------------------------------------
# Impressum / Datenschutz
# ------------------------------------------------------------------
def read_scratch(name):
    p = os.path.join(SCRATCH, name)
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return f.read()
    return None


def ph(text):
    """[PLATZHALTER: …] sichtbar markieren."""
    return re.sub(r"\[PLATZHALTER:[^\]]*\]", lambda m: f'<mark class="ph">{m.group(0)}</mark>', text)


IMPRESSUM = f"""      <h2>Angaben gemäß § 5 DDG</h2>
      <address>
        <strong>DIE DREI GmbH &amp; Co. KG</strong><br>
        {STREET}<br>
        {ZIP_CITY}<br>
        Deutschland
      </address>

      <h3>Kontakt</h3>
      <p>Telefon: <a href="tel:{TEL}">0431 71978976</a><br>
      E-Mail: <a href="mailto:{MAIL}">{MAIL}</a></p>

      <h3>Vertreten durch</h3>
      <p>DIE DREI Verwaltungs-GmbH (persönlich haftende Gesellschafterin),<br>
      diese vertreten durch den Geschäftsführer Cecil Pfeifer.</p>

      <h3>Registereintrag</h3>
      <p>Eintragung im Handelsregister<br>
      Registergericht: Amtsgericht Kiel<br>
      Handelsregisternummer: HRA 12185 KI</p>
      <p>[PLATZHALTER: Registerangaben der Komplementärin DIE DREI Verwaltungs-GmbH (Registergericht, HRB-Nummer) – im Original-Impressum nicht angegeben]</p>

      <h3>Umsatzsteuer-ID</h3>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27&nbsp;a Umsatzsteuergesetz:<br>DE 364785520</p>

      <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
      <p>Cecil Pfeifer<br>{STREET}<br>{ZIP_CITY}</p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>[PLATZHALTER: Angabe zur Teilnahme an Streitbeilegungsverfahren nach § 36 VSBG – vom Betreiber zu bestätigen]</p>

      <h2>Bildnachweis</h2>
      <p>Fotos: [PLATZHALTER: Urheber/in bzw. Fotograf/in der Originalfotos]</p>
"""


def page_impressum():
    body = IMPRESSUM_OVERRIDE or IMPRESSUM
    return legal_page("impressum.html", "Impressum – DIE DREI Weinbar Kiel",
                      "Impressum der DIE DREI GmbH & Co. KG, Knooper Weg 189, 24118 Kiel.",
                      "Rechtliches", "Impressum", body)


IMPRESSUM_OVERRIDE = None


def page_datenschutz():
    frag = read_scratch("datenschutz-entwurf.html")
    if frag is None:
        frag = "<p>[PLATZHALTER: Datenschutzerklärung – Entwurf folgt]</p>"
    frag = re.sub(r"(?is)<!--.*?-->", "", frag).strip()
    # Darstellung: Sektionen ohne eigene .legal-Klasse (Wrapper liefert sie),
    # Dokumenttitel entfällt (steht bereits als H1 im Seitenkopf)
    frag = frag.replace('<section class="legal">', "<section>")
    frag = re.sub(r"(?s)^<section>\s*<h2>Datenschutzerklärung</h2>\s*", '<section class="legal-intro">\n  ', frag)
    return legal_page("datenschutz.html", "Datenschutz – DIE DREI Weinbar Kiel",
                      "Datenschutzerklärung der Website der Weinbar DIE DREI in Kiel – statische Seite "
                      "ohne Cookies, ohne Tracking, ohne Drittanbieter-Inhalte.",
                      "Rechtliches", "Datenschutz", frag)


# ------------------------------------------------------------------
# Relaunch: 404, robots.txt, sitemap.xml, .htaccess (Apache)
# ------------------------------------------------------------------
def absolutize(doc):
    """404.html wird unter beliebigen Pfaden ausgeliefert → alle internen Pfade root-relativ."""
    doc = re.sub(r'(?<=["\s,])(assets/|css/|js/)', r"/\1", doc)
    doc = re.sub(r'href="(index|bar|weinkarte|besuch|impressum|datenschutz)\.html', r'href="/\1.html', doc)
    return doc.replace('href="/index.html"', 'href="/"')


def page_404():
    out = head("404.html", "Seite nicht gefunden – DIE DREI Weinbar Kiel",
               "Diese Seite gibt es nicht (mehr). Zur Startseite, Weinkarte oder zu den Öffnungszeiten "
               "der Weinbar DIE DREI in Kiel.", light=True, robots="noindex, follow")
    out = out.replace(f'<link rel="canonical" href="{BASE}404.html">\n', "")
    out += header("")
    out += page_head("Fehler 404", "Diese Seite gibt es <em>nicht (mehr).</em>",
                     "Vielleicht hat sie sich beim Umzug der Website verirrt. Hier geht es weiter:")
    out += """
<section class="sec" style="padding-top:clamp(3rem,6vw,5rem)">
  <div class="wrap">
    <div class="btns rv">
      <a class="btn" href="index.html">Zur Startseite</a>
      <a class="btn btn--ghost" href="weinkarte.html">Weinkarte</a>
      <a class="btn btn--ghost" href="besuch.html">Öffnungszeiten &amp; Anfahrt</a>
    </div>
  </div>
</section>
"""
    out += footer()
    return absolutize(out)


SITEMAP_PAGES = ["index.html", "bar.html", "weinkarte.html", "besuch.html", "impressum.html", "datenschutz.html"]


def extra_files():
    import datetime
    today = datetime.date.today().isoformat()
    urls = "".join(
        f"  <url><loc>{BASE}{'' if p == 'index.html' else p}</loc><lastmod>{today}</lastmod></url>\n"
        for p in SITEMAP_PAGES)
    return {
        "robots.txt": f"User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n",
        "sitemap.xml": ('<?xml version="1.0" encoding="UTF-8"?>\n'
                        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n"),
        ".htaccess": """# DIE DREI – Relaunch (Apache). Bei anderem Hoster sinngemäß übertragen.
AddDefaultCharset UTF-8
ErrorDocument 404 /404.html

# Alte WordPress-Adressen → neue Seiten (dauerhaft)
RedirectMatch 301 ^/impressum/?$ /impressum.html
RedirectMatch 301 ^/datenschutz/?$ /datenschutz.html
RedirectMatch 301 ^/wp-content/uploads/2025/05/Karte-Webseite-07\\.05\\.2025\\.pdf$ /assets/weinkarte.pdf

<IfModule mod_mime.c>
  AddType image/webp .webp
  AddType font/woff2 .woff2
</IfModule>
""",
    }


# ------------------------------------------------------------------
# Build
# ------------------------------------------------------------------
PAGES = {
    "index.html": page_index,
    "bar.html": page_bar,
    "weinkarte.html": page_weinkarte,
    "besuch.html": page_besuch,
    "impressum.html": page_impressum,
    "datenschutz.html": page_datenschutz,
    "404.html": page_404,
}

if __name__ == "__main__":
    os.makedirs(SITE, exist_ok=True)
    for fname, fn in PAGES.items():
        html_out = ph(fn())
        with open(os.path.join(SITE, fname), "w", encoding="utf-8") as f:
            f.write(html_out)
        print(f"wrote {fname:18s} {len(html_out):7d} bytes")
    for fname, content in extra_files().items():
        with open(os.path.join(SITE, fname), "w", encoding="utf-8") as f:
            f.write(content)
        print(f"wrote {fname:18s} {len(content):7d} bytes")
