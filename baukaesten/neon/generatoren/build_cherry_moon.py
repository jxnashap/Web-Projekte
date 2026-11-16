#!/usr/bin/env python3
"""Cherry Moon · Website-Vorlage im Neon-Design (Neon-Baukasten v1).

Statische Seiten, alle Links relativ: läuft auf jedem Webspace und in jedem Unterordner.
Der Ticketverkauf bleibt im bestehenden Shop; „Ticket kaufen“ führt dorthin (SHOP).
Quellen der Fakten: cherry-moon.de (Events, Impressum, AGB, Datenschutz), TikTok
@cherrymoonhamburg (Saison 2026). Gespiegelt über die Asset-Bridge in .preview-cache/cherry-moon.

Aufruf: python3 baukaesten/neon/generatoren/build_cherry_moon.py
Medien vorher einmal: python3 baukaesten/neon/generatoren/media_cherry_moon.py
"""
import hashlib
import html
import json
import os
import posixpath
import shutil
from datetime import datetime
from urllib.parse import quote
from zoneinfo import ZoneInfo

ROOT = "/home/user/Web-Projekte"
KIT = f"{ROOT}/baukaesten/neon"
SITE = f"{ROOT}/webseiten/cherry-moon/public"
BASE = "https://cherry-moon.de"
SHOP = "https://cherry-moon.de"          # bestehender Ticketshop (Kasse, Konto, Bestellungen)
NOINDEX = True                            # Vorlage: nicht in Suchmaschinen; für den Livegang auf False
TZ = ZoneInfo("Europe/Berlin")

MAIL = "info@cherry-moon.de"
WA = "491733554196"
IG = "https://www.instagram.com/cherrymoonhamburg/"
TT = "https://www.tiktok.com/@cherrymoonhamburg"
FIRMA = dict(name="Bywater GmbH", strasse="Elsässer Straße 49", ort="22049 Hamburg", land="Deutschland",
             gf="Johann Julius Meier, Deniz Dan Tuna", hrb="HRB 192717, Amtsgericht Hamburg", ust="DE456556129",
             v18="Johann Julius Meier", marke="30 2025 232 290", inhaber="Johann Julius Meier")

# ------------------------------------------------------------------
# Daten
# ------------------------------------------------------------------
EVENTS = [
    dict(slug="cherry-moon-x-coda", t1="Cherry Moon", t2="x Coda", name="Cherry Moon x Coda",
         start="2026-11-21T23:00", end="2026-11-22T05:00", venue="Coda Club", addr="Congressplatz 2, 20355 Hamburg",
         badge="Phase 1", img="mood-coda", welt="Stadt",
         lead="Clubnacht im Coda am Congressplatz. House und Afro House, immersiver Sound und Licht, Einlass von 23 bis 5 Uhr.",
         facts=[("Einlass", "23:00 bis 05:00 Uhr"), ("Einlassalter", "18+"), ("Indoor / Outdoor", "Indoor"),
                ("Musik", "House und Afro House"), ("Hinweis", "Immersive Sound und Lighting")],
         tiers=[("Phase 1", "Club Ticket", "10,99 €", "inkl. 0,99 € Servicegebühr")],
         tables=[("VIP B 1", 5), ("VIP B 2", 5), ("VIP B 3", 5), ("VIP B 4", 5), ("VIP C 1", 5), ("VIP C 2", 5),
                 ("VIP C 3", 5), ("VIP C 4", 5), ("VIP D 1", 5), ("VIP D 2", 5)], plan="plan-coda"),
    dict(slug="silvester", t1="Silvester x", t2="Cherry Moon", name="Silvester x Cherry Moon",
         start="2026-12-31T21:00", end="2027-01-01T05:00", venue="Sands", addr="Dammtordamm 2, 20354 Hamburg",
         badge="Early Bird", img="ev-silvester", welt="Stadt",
         lead="NYE 2026 mit Cherry Moon im Sands. Zwei Floors. Sechs DJs. Ein Countdown.",
         facts=[("Einlass", "21:00 bis 05:00 Uhr"), ("Einlassalter", "18+"), ("Indoor / Outdoor", "Indoor und Outdoor"),
                ("Floors", "2 Floors, 6 DJs"), ("VIP Fast Lane", "Schneller rein, ohne Schlange"),
                ("Tickets", "Per Mail und in der Apple Wallet")],
         tiers=[("Early Bird", "Eintritt", "21,99 €", "inkl. 1,99 € Servicegebühr"),
                ("VIP Fast Lane", "Eintritt ohne Schlange", "54,99 €", "inkl. 1,99 € Servicegebühr")],
         tables=[], tables_note="Schreib uns, wie viele ihr seid. Wir finden einen Platz für euch.", plan="plan-sands-lageplan"),
    dict(slug="tanz-in-den-mai-2027", t1="Tanz in den Mai", t2="x Cherry Moon", name="Tanz in den Mai x Cherry Moon",
         start="2027-04-30T23:00", end="2027-05-01T04:00", venue="Alsterinsel", addr="Alsterufer 1, Hamburg",
         badge="Early Bird", img="rb-alsterinsel", welt="Stadt",
         lead="Tanz in den Mai Special auf der Alsterinsel: Cherry Moon holt den Mai mitten auf der Alster ab. Ab 23 Uhr House, Drinks und eine Nacht bis in den ersten Maimorgen.",
         facts=[("Einlass", "23:00 bis 04:00 Uhr"), ("Einlassalter", "18+"), ("Location", "Alsterinsel, mitten auf der Alster")],
         tiers=[("Early Bird", "Eintritt", "10,99 €", "inkl. 0,99 € Servicegebühr")],
         tables=[("VIP 1", 6), ("VIP 2/3", 4), ("VIP 5", 4), ("VIP 6/7", 5), ("VIP 8/9", 5), ("VIP 10/11", 5),
                 ("VIP 12/13", 5), ("VIP 14/15", 5), ("VIP 16/17 · 18/19", 12), ("VIP 20 · 21/22", 8), ("VIP 30", 4),
                 ("VIP 31 bis 33", 12), ("VIP 34", 6), ("VIP 100 · 101", 10)], plan="plan-alsterinsel-2026"),
]

RUECKBLICK = [  # cherry-moon.de/events, Abschnitt „Gewesen“
    ("März 2026", "Alsterinsel", "Hamburg", "Alsterinsel · Hamburg", "rb-alsterinsel"),
    ("Februar 2026", "GAGA", "Opening", "GAGA · Hamburg", "rb-gaga"),
    ("Januar 2026", "Bayside", "Rooftop", "Bayside · Scharbeutz", "rb-bayside"),
    ("Dezember 2025", "Golden Cut", "Club Night", "Golden Cut · Hamburg", "rb-golden-cut"),
    ("Dezember 2025", "Seehaus", "Winter", "Seehaus · Hamburg", "rb-seehaus"),
    ("Oktober 2025", "Edelfettwerk", "Hamburg", "Edelfettwerk · Hamburg", "rb-edelfettwerk"),
    ("Sommer 2025", "Radisson", "Rooftop", "Radisson Blu · Hamburg", "rb-radisson"),
    ("Mai 2025", "TV Turm", "Hamburg", "Fernsehturm · Hamburg", "rb-tv-turm"),
    ("Februar 2025", "Coda", "Club Opening", "Coda · Hamburg", "rb-coda"),
    ("Januar 2025", "CIU", "Alster", "CIU · Hamburg", "rb-ciu"),
    ("März 2024", "Leos Cafe", "Gewölbe", "Leos Cafe · Hamburg", "rb-leos-cafe"),
]

SAISON = [  # Saison 2026 laut TikTok @cherrymoonhamburg (Datum, Name, Ort, Welt)
    ("10.01.", "Rooftop Event, Indoor und beheizte Glasterrasse", "Bayside Hotel, Scharbeutz", "Strand"),
    ("17.01.", "Bayside Rooftop Party", "Bayside Hotel, Scharbeutz", "Strand"),
    ("24.01.", "Rooftop Event", "Bayside Hotel, Scharbeutz", "Strand"),
    ("20.02.", "GAGA Club Opening", "GAGA, Reeperbahn", "Stadt"),
    ("28.02.", "Clubnight Opening", "Coda im Radisson Blu", "Stadt"),
    ("06.03.", "Sands Open Air, Daydrinking", "Sands Bar, Dammtor", "Stadt"),
    ("21.03.", "Nautic Club Opening", "Nautic Club, Timmendorfer Strand", "Strand"),
    ("02.04.", "Easter Special", "Alsterinsel, Dammtor", "Stadt"),
    ("03.04.", "Circle Club Opening", "Circle Club, Winterhude", "Stadt"),
    ("10.04.", "GAGA Clubnight", "GAGA, Reeperbahn", "Stadt"),
    ("30.04.", "Tanz in den Mai", "Alsterinsel, Dammtor", "Stadt"),
    ("15.05.", "GAGA Indoor und Terrace", "GAGA, Reeperbahn", "Stadt"),
    ("23.05.", "Cherry Moon x Circle", "Circle Club, Winterhude", "Stadt"),
    ("30.05.", "Radisson Blu Open Air", "Radisson Blu, Hamburg", "Stadt"),
    ("19.06.", "Rooftop Open Air", "GAGA Dachterrasse, Reeperbahn", "Stadt"),
    ("20.06.", "Open Air mit WM Public Viewing", "Radisson Blu, Hamburg", "Stadt"),
    ("03.07.", "Seaside Open Air", "Seaside, Grömitz", "Strand"),
    ("04.07.", "Hamptons Beach Open Air", "Hamptons, Scharbeutz", "Strand"),
    ("11.07.", "Beach Open Air", "Strand Scharbeutz", "Strand"),
    ("18.07.", "Hermannshöhe Open Air", "Hermannshöhe, Ostsee", "Strand"),
    ("25.07.", "GAGA Terrace Open Air", "GAGA, Reeperbahn", "Stadt"),
    ("31.07.", "Sands Open Air", "Sands Bar, Dammtor", "Stadt"),
    ("01.08.", "Boat Party", "MS Koi, Hamburg", "Stadt"),
    ("15.08.", "Beach Club Open Air", "Ostseelounge, Grömitz", "Strand"),
    ("29.08.", "Summer Closing Open Air", "Radisson Blu, Hamburg", "Stadt"),
    ("04.09.", "Straßenfest Pre Party", "Circle Club, Winterhude", "Stadt"),
    ("26.09.", "Summer Closing", "Sands Bar, Dammtor", "Stadt"),
    ("09.10.", "Season Opening", "GAGA, Reeperbahn", "Stadt"),
    ("30.10.", "Halloween", "Circle Club, Winterhude", "Stadt"),
    ("31.10.", "Halloween", "Alsterinsel, Dammtor", "Stadt"),
]

VENUES = ["Sands", "Alsterinsel", "GAGA", "Coda", "Circle Club", "Radisson Blu", "Edelfettwerk", "Fernsehturm",
          "Golden Cut", "Seehaus", "CIU", "MS Koi", "Bayside Scharbeutz", "Hamptons Scharbeutz", "Seaside Grömitz",
          "Ostseelounge Grömitz", "Hermannshöhe", "Nautic Club Timmendorf"]

GALERIE = [  # (Bild, Ort, Zeile, über zwei Zeilen)
    ("mood-leos-cafe", "Leos Cafe", "Gewölbe", True), ("club-08", "Club Night", "Hamburg", False),
    ("club-04", "Club Night", "Hamburg", False), ("club-02", "Club Night", "Hamburg", False),
    ("club-golden-cut", "Cherry Moon", "Neon", False), ("mood-coda", "Coda", "Hamburg", False),
    ("club-05", "Club Night", "Hamburg", True), ("club-06", "Club Night", "Hamburg", False),
    ("mood-edelfettwerk", "Edelfettwerk", "Hamburg", False), ("club-09", "Club Night", "Hamburg", True),
    ("club-01", "Club Night", "Hamburg", False), ("club-07", "Club Night", "Hamburg", False),
]
TAGE_K = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


def gal_html(items):
    out = []
    for i, (g, o, z, tall) in enumerate(items):
        alt = f"{o} bei Cherry Moon"
        out.append(f'<a class="gal-i rv{" tall" if tall else ""}" data-d="{i % 3 + 1}" href="{rel("/media/" + g + ".webp")}" data-lb '
                   f'data-alt="{E(alt)}" data-cap="{E(o)} · {E(z)}"><figure style="margin:0">{img(g, alt, "(max-width:700px) 50vw, 33vw")}'
                   f'<figcaption><i>{E(o)}</i>{E(z)}</figcaption></figure></a>')
    return f'<div class="bento">{"".join(out)}</div>'

NAV = [("/events/", "Events"), ("/rueckblick/", "Rückblick"), ("/tische/", "Tische"), ("/ueber-uns/", "Über uns"), ("/faq/", "FAQ")]

# ------------------------------------------------------------------
# Helfer
# ------------------------------------------------------------------
E = html.escape
CUR = "/"            # Pfad der Seite, die gerade gebaut wird (für relative Links)
VER = ""             # Cache-Version für CSS und JS


def rel(target):
    """Absoluten Website-Pfad in einen relativen Link von der aktuellen Seite umrechnen."""
    if target.startswith(("http", "mailto:", "tel:", "#")) or CUR == "/404.html":
        return target
    frag = ""
    if "#" in target:
        target, frag = target.split("#", 1)
        frag = "#" + frag
    base = CUR if CUR.endswith("/") else posixpath.dirname(CUR) + "/"
    r = posixpath.relpath(target, base)
    if target.endswith("/") and not r.endswith("/"):
        r = "./" if r == "." else r + "/"
    return r + frag


def ext(url):
    return ' target="_blank" rel="noopener"'


NEWTAB = '<span class="sr-only"> (öffnet neues Fenster)</span>'


def dt(s):
    return datetime.fromisoformat(s).replace(tzinfo=TZ)


TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]


def datum(d, jahr=False):
    return f"{d.day}. {MONATE[d.month - 1]}" + (f" {d.year}" if jahr else "")


def wa_link(text):
    return f"https://wa.me/{WA}?text={quote(text)}"


def shop_event(e):
    return f"{SHOP}/events/{e['slug']}"


ICO = {
    "clock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    "age": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>',
    "cal": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    "ig": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r=".6" fill="currentColor"/></svg>',
    "tt": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.4 2.3 1.9 3.8 4.2 4v3.1a7.6 7.6 0 0 1-4.1-1.3v6.4c0 3.6-2.9 5.8-5.9 5.8a5.8 5.8 0 0 1-1.2-11.5v3.3a2.6 2.6 0 1 0 1.9 2.5V3h3.1z"/></svg>',
    "wa": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.2-.5-2.4-1.7-2.9-2.9l1-1-1-2z" fill="currentColor" stroke="none"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7"/></svg>',
    "ticket": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2.2"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "map": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/></svg>',
    "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
}

CHERRY_PATHS = '<path d="M33 12C27 21 23 32 21 41"/><path d="M33 12C38 21 42 33 44 43"/><path d="M33 12C36 6 43 3 49 5C47 11 40 14 33 12Z"/><circle cx="20" cy="46" r="10"/><circle cx="45" cy="48" r="9"/>'


def cherry(cls="cherry-ico", flicker=True):
    return (f'<svg class="{cls}{" neon-flicker" if flicker else ""}" viewBox="0 0 64 64" aria-hidden="true">'
            f'<g style="filter:drop-shadow(0 0 3px rgba(255,45,85,.9))">{CHERRY_PATHS}</g></svg>')


def wordmark():
    return '<span class="wm"><span class="n">Cherry</span> Moon</span>'


def img(name, alt, sizes="100vw", cls="", lazy=True, w=None, h=None, fetch=None):
    """<img> mit srcset aus der großen und der kleinen WebP-Variante."""
    big, small = f"/media/{name}.webp", f"/media/{name}-s.webp"
    from PIL import Image
    iw, ih = Image.open(SITE + big).size
    sw, _ = Image.open(SITE + small).size
    attrs = f' class="{cls}"' if cls else ""
    load = ' loading="lazy" decoding="async"' if lazy else ""
    fp = f' fetchpriority="{fetch}"' if fetch else ""
    return (f'<img src="{rel(big)}" srcset="{rel(small)} {sw}w, {rel(big)} {iw}w" sizes="{sizes}" '
            f'width="{iw}" height="{ih}" alt="{E(alt)}"{attrs}{load}{fp}>')


def video(name, poster_alt, cls="vid", eager=False):
    """Stummes Loop-Video; lädt erst, wenn es sichtbar wird (neon.js). Ohne JS bleibt das Standbild."""
    p = rel(f"/media/{name}-poster.webp")
    lazy = "" if eager else ' loading="lazy"'
    return (f'<div class="{cls}"><img src="{p}" alt="{E(poster_alt)}"{lazy} decoding="async">'
            f'<video muted loop playsinline preload="none" aria-hidden="true" data-src="{rel(f"/media/{name}.mp4")}"></video></div>')


def lbl(text, plain=False):
    return f'<span class="eyebrow{" plain" if plain else ""}">{text}</span>'


def sec_head(title, more=None, h="h2", cls="h-lg"):
    m = f'<a class="link more" href="{rel(more[0])}">{more[1]}</a>' if more else ""
    return f'<div class="sec-head rv"><{h} class="{cls}">{title}</{h}><span class="line" aria-hidden="true"></span>{m}</div>'


def crumbs_html(items):
    lis = "".join(f'<li><a href="{rel(u)}">{E(n)}</a></li>' if i < len(items) - 1 else f'<li aria-current="page">{E(n)}</li>'
                  for i, (u, n) in enumerate(items))
    return f'<nav aria-label="Brotkrumen"><ol class="crumbs">{lis}</ol></nav>'


def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (u, n) in enumerate(items)]}


ORG = {"@context": "https://schema.org", "@type": "Organization", "@id": BASE + "/#org", "name": "Cherry Moon",
       "url": BASE + "/", "logo": BASE + "/apple-touch-icon.png", "email": MAIL, "sameAs": [IG, TT],
       "description": "Club Nights in Hamburg und Beach Open Airs an der Ostsee.",
       "parentOrganization": {"@type": "Organization", "name": FIRMA["name"],
                              "address": {"@type": "PostalAddress", "streetAddress": FIRMA["strasse"], "postalCode": "22049",
                                          "addressLocality": "Hamburg", "addressCountry": "DE"}}}


def event_ld(e):
    s, en = dt(e["start"]), dt(e["end"])
    street, _, city = e["addr"].partition(", ")
    plz = city.split(" ")[0] if city[:1].isdigit() else ""
    return {"@context": "https://schema.org", "@type": "Event", "name": e["name"],
            "startDate": s.isoformat(), "endDate": en.isoformat(),
            "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
            "location": {"@type": "Place", "name": e["venue"], "address": {"@type": "PostalAddress", "streetAddress": street,
                         "postalCode": plz, "addressLocality": "Hamburg", "addressCountry": "DE"}},
            "image": [BASE + f"/media/{e['img']}.webp"], "description": e["lead"], "typicalAgeRange": "18-",
            "organizer": {"@id": BASE + "/#org", "@type": "Organization", "name": "Cherry Moon", "url": BASE + "/"},
            "offers": [{"@type": "Offer", "name": t[0], "price": t[2].replace(" €", "").replace(",", "."), "priceCurrency": "EUR",
                        "url": shop_event(e)} for t in e["tiers"]]}


# ------------------------------------------------------------------
# Seitengerüst
# ------------------------------------------------------------------
def head(title, desc, path, og="og-home", ld=None):
    canon = BASE + (path if path != "/404.html" else "/")
    lds = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ([ORG] + (ld or [])))
    robots = '<meta name="robots" content="noindex,follow">' if NOINDEX or path == "/404.html" else ""
    return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
{robots}<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#060606">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Cherry Moon">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{canon}">
<meta property="og:image" content="{BASE}/media/{og}.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{rel('/favicon.svg')}" type="image/svg+xml">
<link rel="icon" href="{rel('/favicon.ico')}" sizes="32x32">
<link rel="apple-touch-icon" href="{rel('/apple-touch-icon.png')}">
<link rel="preload" href="{rel('/fonts/archivo-var.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{rel('/fonts/archivo-black.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{rel('/css/neon.css')}?v={VER}">
{lds}
</head>"""


def header():
    def cur(u):
        on = CUR == u if u == "/" else CUR.startswith(u)
        return ' aria-current="page"' if on else ""
    nav = "".join(f'<a href="{rel(u)}"{cur(u)}>{n}</a>' for u, n in NAV)
    mnav = "".join(f'<a href="{rel(u)}"{cur(u)}>{n}</a>' for u, n in [("/", "Start")] + NAV + [("/kontakt/", "Kontakt")])
    return f"""<a class="skip" href="#inhalt">Zum Inhalt springen</a>
<header class="hd"><div class="wrap hd-in">
  <a class="brand" href="{rel('/')}" aria-label="Cherry Moon, zur Startseite">{cherry()}{wordmark()}</a>
  <nav class="nav" aria-label="Hauptnavigation">{nav}</nav>
  <div class="hd-act">
    <a class="btn btn-solid btn-sm hd-tix mag" href="{rel('/events/')}">Tickets</a>
    <a class="icon-btn" href="{IG}"{ext(IG)} aria-label="Cherry Moon auf Instagram (öffnet neues Fenster)">{ICO['ig']}</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Menü"><span></span><span></span><span></span></button>
  </div>
</div></header>
<div class="menu" id="menu" hidden><nav aria-label="Menü">{mnav}</nav>
  <div class="menu-foot"><a class="btn btn-solid" href="{rel('/events/')}">Tickets</a><a class="btn btn-ghost" href="{IG}"{ext(IG)}>Instagram{NEWTAB}</a></div>
</div>"""


def footer():
    return f"""<footer class="ft">
  <hr class="neon-rule">
  <div class="wrap">
    <div class="ft-grid">
      <div>
        <a class="brand" href="{rel('/')}" aria-label="Cherry Moon, zur Startseite">{cherry()}{wordmark()}</a>
        <p class="claim">Zwischen Stadt und Strand. Club Nights in Hamburg, Beach Open Airs an der Ostsee.</p>
        <div class="soc">
          <a class="icon-btn" href="{IG}"{ext(IG)} aria-label="Instagram @cherrymoonhamburg (öffnet neues Fenster)">{ICO['ig']}</a>
          <a class="icon-btn" href="{TT}"{ext(TT)} aria-label="TikTok @cherrymoonhamburg (öffnet neues Fenster)">{ICO['tt']}</a>
          <a class="icon-btn" href="mailto:{MAIL}" aria-label="E-Mail an {MAIL}">{ICO['mail']}</a>
        </div>
      </div>
      <div><h4>Nächte</h4><ul>
        <li><a href="{rel('/events/')}">Events</a></li><li><a href="{rel('/rueckblick/')}">Rückblick</a></li>
        <li><a href="{rel('/tische/')}">Tische</a></li><li><a href="{rel('/ueber-uns/')}">Über uns</a></li><li><a href="{rel('/faq/')}">FAQ</a></li></ul></div>
      <div><h4>Tickets</h4><ul>
        <li><a href="{SHOP}/order/lookup"{ext(SHOP)}>Bestellungen{NEWTAB}</a></li><li><a href="{SHOP}/account"{ext(SHOP)}>Cherry Account{NEWTAB}</a></li>
        <li><a href="{SHOP}/newsletter"{ext(SHOP)}>Newsletter{NEWTAB}</a></li><li><a href="{SHOP}/legal/agb"{ext(SHOP)}>AGB{NEWTAB}</a></li>
        <li><a href="{SHOP}/legal/widerruf"{ext(SHOP)}>Widerruf{NEWTAB}</a></li></ul></div>
      <div><h4>Kontakt</h4><ul>
        <li><a href="{rel('/kontakt/')}">Kontakt</a></li><li><a href="{rel('/impressum/')}">Impressum</a></li><li><a href="{rel('/datenschutz/')}">Datenschutz</a></li></ul>
        <button class="pause-btn" type="button" aria-pressed="false"><span class="off">Bewegung anhalten</span><span class="on">Bewegung fortsetzen</span></button></div>
    </div>
    <div class="ft-bot"><span>Cherry Moon®<i>|</i>{FIRMA['name']}<i>|</i>Hamburg</span><span>© <span data-year>2026</span> Cherry Moon</span></div>
  </div>
</footer>
<div class="grain" aria-hidden="true"></div>
<script src="{rel('/js/neon.js')}?v={VER}" defer></script>"""


def boot():
    return f'<div class="boot" aria-hidden="true"><div class="boot-in">{cherry("", flicker=False)}{wordmark()}</div></div>'


PAGES = []


def page(path, title, desc, body, og="og-home", ld=None, intro=False):
    global CUR
    CUR = path
    out = (head(title, desc, path, og, ld) + "\n<body>\n" + (boot() if intro else "") + header()
           + f'\n<main id="inhalt">\n{body}\n</main>\n' + footer() + "\n</body>\n</html>\n")
    f = SITE + (path + "index.html" if path.endswith("/") else path)
    os.makedirs(os.path.dirname(f), exist_ok=True)
    open(f, "w", encoding="utf-8").write(out)
    PAGES.append(path)


def set_cur(path):
    global CUR
    CUR = path


# ------------------------------------------------------------------
# Bausteine
# ------------------------------------------------------------------
def ev_card(e, d=None):
    s, en = dt(e["start"]), dt(e["end"])
    tag = TAGE_K[s.weekday()]
    t = e["tiers"][0]
    dd = f' data-d="{d}"' if d else ""
    return f"""<article class="ev rv"{dd} data-start="{s.isoformat()}" data-end="{en.isoformat()}" data-name="{E(e['name'])}"
  data-venue="{E(e['venue'])}" data-date="{datum(s)}" data-time="{s:%H:%M} Uhr" data-shop="{shop_event(e)}" data-href="{rel('/events/' + e['slug'] + '/')}">
  <div class="ev-media">{img(e['img'], '', '(max-width:700px) 100vw, 400px')}
    <span class="ev-date">{tag}<i>|</i>{datum(s)}</span><span class="badge">{e['badge']}</span></div>
  <div class="ev-body">
    <h3 class="ev-title"><a href="{rel('/events/' + e['slug'] + '/')}"><span class="w">{E(e['t1'])}</span><br><span class="n">{E(e['t2'])}</span></a></h3>
    <span class="neon-rule-s" aria-hidden="true"></span>
    <ul class="meta"><li>{ICO['clock']}{s:%H:%M} Uhr</li><li>{ICO['pin']}{E(e['venue'])}</li><li>{ICO['age']}18+</li></ul>
    <div class="ev-foot"><p class="price">ab {t[2]}<small>{t[3]}</small></p>
      <a class="btn btn-solid btn-sm" href="{shop_event(e)}"{ext(SHOP)}>Ticket kaufen<span class="sr-only"> für {E(e['name'])} (öffnet den Ticketshop)</span></a></div>
  </div>
</article>"""


def ev_list(archive_id=None, empty_id="ev-empty"):
    cards = "".join(ev_card(e, i % 3 + 1) for i, e in enumerate(EVENTS))
    arch = f' data-archive="#{archive_id}"' if archive_id else ""
    return f"""<div class="ev-grid" data-events data-pool data-empty="#{empty_id}"{arch}>{cards}</div>
<p class="ev-empty" id="{empty_id}" hidden>Gerade stehen keine neuen Termine fest. Neue Nächte kündigen wir zuerst im
<a class="ilink" href="{SHOP}/newsletter"{ext(SHOP)}>Newsletter{NEWTAB}</a> und auf <a class="ilink" href="{IG}"{ext(IG)}>Instagram{NEWTAB}</a> an.</p>"""


def marquee():
    items = "".join(f'<span class="mq-item">{E(v)}</span>{cherry("mq-sep", flicker=False)}' for v in VENUES)
    return f'<section class="mq" aria-label="Locations von Cherry Moon"><div class="mq-track">{items}</div></section>'


def newsletter_block():
    return f"""<section class="sec glow-bg"><div class="wrap"><div class="card nl rv">
  <h2 class="h-lg">Nichts <span class="n">verpassen</span></h2>
  <p class="lead" style="margin:1.4rem auto 2rem">Neue Nächte und Vorverkaufsstart per Mail, bevor es auf Instagram steht. Kein Spam, jederzeit abbestellbar.</p>
  <div class="btn-row" style="justify-content:center"><a class="btn btn-solid mag" href="{SHOP}/newsletter"{ext(SHOP)}>Zum Newsletter{NEWTAB}</a>
  <a class="btn btn-ghost" href="{IG}"{ext(IG)}>{ICO['ig']}@cherrymoonhamburg{NEWTAB}</a></div>
  <p class="small" style="margin-top:1.4rem">Doppelte Bestätigung per Mail. Abmelden geht mit einem Klick in jeder Ausgabe.</p>
</div></div></section>"""


def ph_head(eyebrow, title, lead, crumbs, bg=None, h1cls="h-xl"):
    b = f'<div class="bg">{img(bg, "", lazy=False)}</div>' if bg else ""
    return f"""<section class="ph-head">{b}<div class="wrap">
  {crumbs_html(crumbs)}
  {lbl(eyebrow)}
  <h1 class="{h1cls} neon-split" style="margin-top:1.2rem">{title}</h1>
  {f'<p class="lead rv" data-d="2">{lead}</p>' if lead else ''}
</div></section>"""


# ------------------------------------------------------------------
# Seiten
# ------------------------------------------------------------------
def build_home():
    set_cur("/")
    e0 = EVENTS[0]
    s0 = dt(e0["start"])
    hero = f"""<section class="hero" aria-label="Cherry Moon">
  <div class="hero-media">
    <picture><source media="(max-width:700px)" srcset="{rel('/media/hero-mob-poster.webp')}"><img src="{rel('/media/hero-desk-poster.webp')}" alt="" fetchpriority="high" decoding="async"></picture>
    <div class="vid hero-vid-desk"><video muted loop playsinline autoplay preload="none" aria-hidden="true" data-src="{rel('/media/hero-desk.mp4')}" data-media="(min-width:701px)"></video></div>
    <div class="vid hero-vid-mob"><video muted loop playsinline autoplay preload="none" aria-hidden="true" data-src="{rel('/media/hero-mob.mp4')}" data-media="(max-width:700px)"></video></div>
  </div>
  <div class="hero-shade"></div>
  <div class="wrap hero-in">
    <h1 class="wordmark neon-split"><span class="cherry">Cherry</span><span class="gap"> </span><span class="moon">Moon</span></h1>
    <hr class="neon-rule short">
    <p class="hero-tag rv" data-d="2"><strong>Zwischen Stadt und Strand.</strong> Club Nights in Hamburg, Beach Open Airs an der Ostsee.</p>
    <div class="next rv" data-d="3" data-next>
      <p class="next-l">Als Nächstes</p>
      <p class="next-t"><span data-fill="name">{E(e0['name'])}</span></p>
      <p class="next-m"><span data-fill="venue">{E(e0['venue'])}</span><i>|</i><span data-fill="date">{datum(s0)}</span><i>|</i><span data-fill="time">{s0:%H:%M} Uhr</span></p>
      <div class="cd" data-countdown="{s0.isoformat()}" aria-label="Countdown bis zum nächsten Event" hidden>
        <span><b data-u="d">0</b><small>Tage</small></span><span><b data-u="h">00</b><small>Std</small></span>
        <span><b data-u="m">00</b><small>Min</small></span><span><b data-u="s">00</b><small>Sek</small></span></div>
    </div>
    <p class="next-l rv" data-next-empty hidden style="margin-top:2rem">Neue Nächte kommen bald. Folg uns auf Instagram.</p>
    <div class="btn-row rv" data-d="4">
      <a class="btn btn-solid mag" data-fill-href="shop" data-fallback="{rel('/events/')}" href="{shop_event(e0)}"{ext(SHOP)}>{ICO['ticket']}Tickets sichern{NEWTAB}</a>
      <a class="btn btn-ghost" href="{rel('/events/')}">Alle Events</a>
    </div>
  </div>
  <span class="cue" aria-hidden="true">Scroll</span>
</section>"""
    duo = f"""<section class="sec"><div class="wrap">
  {sec_head('Zwischen <span class="n">Stadt</span> und Strand')}
  <div class="duo">
    <article class="duo-side rv" data-d="1">{video('stadt', 'Das GAGA an der Reeperbahn bei Nacht, von oben gefilmt')}
      <div class="duo-in"><span class="duo-k">Stadt</span><h3>Club Nights<br>in Hamburg</h3>
        <p>Von der Reeperbahn bis an die Alster: Clubnächte mit House und Afro House, im Sommer auf Dachterrassen und Rooftops.</p>
        <ul class="chips"><li>GAGA</li><li>Coda</li><li>Alsterinsel</li><li>Sands</li><li>Circle Club</li><li>Radisson Blu</li></ul></div></article>
    <article class="duo-side rv" data-d="2">{video('strand', 'Beach Open Air von Cherry Moon am Strand von Scharbeutz, von oben gefilmt')}
      <div class="duo-in"><span class="duo-k">Strand</span><h3>Beach Open Airs<br>an der Ostsee</h3>
        <p>Sand unter den Füßen, Meer im Rücken: Open Airs und Rooftop-Partys in Scharbeutz, Grömitz und Timmendorfer Strand.</p>
        <ul class="chips"><li>Bayside Scharbeutz</li><li>Hamptons</li><li>Seaside Grömitz</li><li>Ostseelounge</li><li>Hermannshöhe</li></ul></div></article>
  </div>
</div></section>"""
    nights = len(SAISON)
    stats = f"""<section class="sec-sm"><div class="wrap"><div class="stats rv">
  <div class="stat"><b>2024</b><span>Der Rückblick beginnt im Gewölbe des Leos Cafe</span></div>
  <div class="stat"><b>{nights}</b><span>Nächte in der Saison 2026, von Januar bis Halloween</span></div>
  <div class="stat"><b>{len(VENUES)}</b><span>Locations zwischen Reeperbahn und Ostseestrand</span></div>
  <div class="stat"><b>1,2 Mio.</b><span>Aufrufe für ein einziges Rooftop-Video aus Scharbeutz</span></div>
</div></div></section>"""
    gal = gal_html(GALERIE[:5])
    look = f"""<section class="sec alt glow-bg"><div class="wrap">
  {sec_head('Wie es bei uns <span class="n">aussieht</span>', ('/rueckblick/', 'Alle Nächte'))}
  {gal}
</div></section>"""
    tische = f"""<section class="sec"><div class="wrap grid-2">
  <div class="stack">
    {lbl('VIP-Tische')}
    <h2 class="h-lg rv">Dein Tisch.<br><span class="n">Deine Crew.</span></h2>
    <p class="lead rv" data-d="1">Such dir auf dem Tischplan einen Tisch aus und schreib uns per WhatsApp. Wir bestätigen dir den Tisch.</p>
    <div class="btn-row rv" data-d="2"><a class="btn btn-solid mag" href="{wa_link('Hi Cherry Moon, ich möchte einen Tisch reservieren.')}"{ext('wa')}>{ICO['wa']}Per WhatsApp anfragen{NEWTAB}</a>
      <a class="link" href="{rel('/tische/')}">So funktioniert es</a></div>
  </div>
  <div class="frame tall rv-img">{img('plan-sands-lageplan', 'Tischplan Tables x Sands mit VIP-Tischen rund um den Dancefloor', '(max-width:860px) 90vw, 420px')}</div>
</div></section>"""
    body = hero + marquee() + f"""
<section class="sec"><div class="wrap">
  {sec_head('Next <span class="n">Dates</span>', ('/events/', 'Alle Events'))}
  {ev_list()}
</div></section>""" + duo + stats + look + tische + newsletter_block()
    page("/", "Cherry Moon | Club Nights in Hamburg & Beach Open Airs an der Ostsee",
         "Cherry Moon: Club Nights in Hamburg, Beach Open Airs an der Ostsee. House und Afro House, Rooftops und Strand. Alle Termine und Tickets.",
         body, intro=True,
         ld=[{"@context": "https://schema.org", "@type": "WebSite", "name": "Cherry Moon", "url": BASE + "/", "inLanguage": "de-DE"}]
         + [event_ld(e) for e in EVENTS])


def build_events():
    set_cur("/events/")
    crumbs = [("/", "Start"), ("/events/", "Events")]
    rb = "".join(f"""<article class="rb rv" data-d="{i % 4 + 1}">{img(im, f'{t1} {t2}, Rückblick Cherry Moon', '(max-width:700px) 100vw, 300px')}
  <div class="rb-in"><small>{E(z)}</small><h3>{E(t1)}<br><span class="n">{E(t2)}</span></h3><p>{E(o)}</p></div></article>""" for i, (z, t1, t2, o, im) in enumerate(RUECKBLICK))
    body = ph_head("Tickets und Termine", 'Next <span class="n">Dates</span>',
                   "Alle kommenden Nächte von Cherry Moon. Tickets kaufst du direkt bei uns im Shop, per Mail und mit QR-Code.", crumbs, bg="club-03") + f"""
<section class="sec-sm"><div class="wrap">{ev_list(archive_id='archiv-ev')}</div></section>
<section class="sec-sm" data-archive-box hidden><div class="wrap">
  {sec_head('Gerade <span class="n">gewesen</span>', h='h2', cls='h-md')}
  <div class="ev-grid" id="archiv-ev"></div>
</div></section>
<section class="sec alt"><div class="wrap">
  {sec_head('Gewe<span class="n">sen</span>', ('/rueckblick/', 'Saison 2026'))}
  <div class="rb-grid">{rb}</div>
</div></section>""" + newsletter_block()
    items = [{"@type": "ListItem", "position": i + 1, "url": BASE + f"/events/{e['slug']}/"} for i, e in enumerate(EVENTS)]
    page("/events/", "Events und Tickets | Cherry Moon Hamburg",
         "Alle kommenden Events von Cherry Moon: Club Nights in Hamburg, Silvester im Sands, Tanz in den Mai auf der Alsterinsel. Tickets direkt im Shop.",
         body, og="og-events", ld=[crumbs_ld(crumbs), {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": items}])


def ics(e):
    s, en = dt(e["start"]).astimezone(ZoneInfo("UTC")), dt(e["end"]).astimezone(ZoneInfo("UTC"))
    uid = hashlib.sha1(e["slug"].encode()).hexdigest()[:16]
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cherry Moon//Events//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             "BEGIN:VEVENT", f"UID:{uid}@cherry-moon.de", f"DTSTAMP:{datetime.now(ZoneInfo('UTC')):%Y%m%dT%H%M%SZ}",
             f"DTSTART:{s:%Y%m%dT%H%M%SZ}", f"DTEND:{en:%Y%m%dT%H%M%SZ}", f"SUMMARY:{e['name']}",
             f"LOCATION:{e['venue']}\\, {e['addr'].replace(',', chr(92) + ',')}", f"URL:{shop_event(e)}",
             f"DESCRIPTION:Tickets: {shop_event(e)}", "END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(lines) + "\r\n"


def build_event(e):
    path = f"/events/{e['slug']}/"
    set_cur(path)
    s, en = dt(e["start"]), dt(e["end"])
    crumbs = [("/", "Start"), ("/events/", "Events"), (path, e["name"])]
    tiers = "".join(f'<div class="tier"><div><b>{E(a)}</b><span>{E(b)}</span></div><p class="p">{c}<small>{E(d)}</small></p></div>' for a, b, c, d in e["tiers"])
    facts = "".join(f"<div><dt>{E(a)}</dt><dd>{E(b)}</dd></div>" for a, b in e["facts"])
    q = quote(f"{e['venue']}, {e['addr']}")
    maps = f"https://www.google.com/maps/search/?api=1&query={q}"
    apple = f"https://maps.apple.com/?q={q}"
    transit = f"https://www.google.com/maps/dir/?api=1&destination={q}&travelmode=transit"
    wa_txt = f"Hi Cherry Moon, ich möchte einen Tisch reservieren.\nEvent: {e['name']} ({datum(s, True)})\nPersonen: \nName: "
    if e["tables"]:
        tl = "".join(f"<li><b>{E(n)}</b>{p} Plätze</li>" for n, p in e["tables"])
        tisch_txt = f'<p class="dim">{len(e["tables"])} Tische für diese Nacht. Such dir einen aus und schreib uns, wir bestätigen dir den Tisch.</p><ul class="tables">{tl}</ul>'
    else:
        tisch_txt = f'<p class="dim">{E(e["tables_note"])} Wir melden uns per Mail oder Telefon mit Verfügbarkeit und Konditionen.</p>'
    plan_alt = f"Tischplan für {e['name']}"
    plan = f'<div class="frame tall rv-img" style="margin-top:28px">{img(e["plan"], plan_alt, "(max-width:900px) 90vw, 420px")}</div>' if e.get("plan") else ""
    others = [x for x in EVENTS if x is not e]
    body = f"""<section class="evh"><div class="bg">{img(e['img'], '', lazy=False, fetch='high')}</div><div class="wrap">
  {crumbs_html(crumbs)}
  <span class="ev-date" style="position:static;display:inline-flex">{TAGE[s.weekday()]}<i>|</i>{datum(s, True)}</span>
  <h1 class="h-xl neon-split"><span class="w">{E(e['t1'])}</span><br><span class="n">{E(e['t2'])}</span></h1>
  <ul class="meta rv"><li>{ICO['clock']}{s:%H:%M} Uhr</li><li>{ICO['pin']}{E(e['venue'])}</li><li>{ICO['age']}18+</li><li><span class="badge" style="animation:none">{e['badge']}</span></li></ul>
  <div class="btn-row rv" data-d="2"><a class="btn btn-solid mag" href="{shop_event(e)}"{ext(SHOP)}>{ICO['ticket']}Ticket kaufen{NEWTAB}</a>
    <a class="btn btn-ghost" href="cherry-moon-{e['slug']}.ics" download>{ICO['cal']}In den Kalender</a></div>
</div></section>
<section class="sec-sm"><div class="wrap ev-layout">
  <div class="stack">
    <p class="lead rv">{E(e['lead'])}</p>
    <h2 class="h-md rv" style="margin-top:2.6rem">Gut zu <span class="n">wissen</span></h2>
    <dl class="facts rv">{facts}</dl>
    <p class="small rv">Tickets sind vom Umtausch ausgeschlossen. <a class="ilink" href="{rel('/faq/')}#tickets">Warum das so ist</a> · Fragen an <a class="ilink" href="mailto:{MAIL}?subject={quote(e['name'])}">{MAIL}</a></p>
    <h2 class="h-md rv" id="anfahrt" style="margin-top:2.6rem">Anfahrt</h2>
    <address class="addr rv"><b>{E(e['venue'])}</b>{E(e['addr'])}</address>
    <div class="btn-row rv"><a class="btn btn-ghost btn-sm" href="{maps}"{ext(maps)}>{ICO['map']}Google Maps{NEWTAB}</a>
      <a class="btn btn-ghost btn-sm" href="{apple}"{ext(apple)}>Apple Karten{NEWTAB}</a>
      <a class="btn btn-ghost btn-sm" href="{transit}"{ext(transit)}>Mit Bus und Bahn{NEWTAB}</a></div>
    <h2 class="h-md rv" id="tisch" style="margin-top:2.6rem">Tisch <span class="n">reservieren</span></h2>
    <div class="rv">{tisch_txt}</div>
    <div class="btn-row rv"><a class="btn btn-solid" href="{wa_link(wa_txt)}"{ext('wa')}>{ICO['wa']}Per WhatsApp anfragen{NEWTAB}</a>
      <a class="btn btn-ghost" href="mailto:{MAIL}?subject={quote('Tischanfrage ' + e['name'])}">{ICO['mail']}Per Mail anfragen</a></div>
    <p class="small rv">WhatsApp öffnet sich mit einer vorbereiteten Nachricht. Du musst nur noch Personen und Namen ergänzen und abschicken.</p>
    {plan}
  </div>
  <aside class="side">
    <div class="card glow-card rv">
      <h2 class="h-sm" style="margin-bottom:1.2rem">Tickets</h2>
      <div class="tiers">{tiers}</div>
      <a class="btn btn-solid mag" style="width:100%;margin-top:18px" href="{shop_event(e)}"{ext(SHOP)}>Zum Ticketshop{NEWTAB}</a>
      <p class="small" style="margin-top:14px">Mit einem <a class="ilink" href="{SHOP}/account"{ext(SHOP)}>Cherry Account{NEWTAB}</a> sparst du 2,00 € aufs erste Ticket.</p>
    </div>
  </aside>
</div></section>
<section class="sec alt"><div class="wrap">
  {sec_head('Weitere <span class="n">Nächte</span>', ('/events/', 'Alle Events'))}
  <div class="ev-grid">{''.join(ev_card(x, i + 1) for i, x in enumerate(others))}</div>
</div></section>"""
    page(path, f"{e['name']} · {datum(s, True)} · {e['venue']} | Cherry Moon",
         f"{e['name']} am {datum(s, True)}, {s:%H:%M} Uhr, {e['venue']} Hamburg. {e['lead'][:80]}",
         body, og=f"og-{e['slug']}", ld=[crumbs_ld(crumbs), event_ld(e)])
    open(f"{SITE}{path}cherry-moon-{e['slug']}.ics", "w", encoding="utf-8", newline="").write(ics(e))


def build_rueckblick():
    set_cur("/rueckblick/")
    crumbs = [("/", "Start"), ("/rueckblick/", "Rückblick")]
    rows = "".join(f'<li class="rv"><time>{d} 2026</time><div><b>{E(n)}</b><br><span>{E(o)}</span></div><span class="tag{" strand" if w == "Strand" else ""}">{w}</span></li>' for d, n, o, w in SAISON)
    gal = gal_html(GALERIE)
    strand = sum(1 for x in SAISON if x[3] == "Strand")
    body = ph_head("Rückblick", 'Alle <span class="n">Nächte</span>',
                   f"{len(SAISON)} Nächte in der Saison 2026: {len(SAISON) - strand} in der Stadt, {strand} am Strand. Und dazu die Bilder, die bleiben.", crumbs, bg="club-07") + f"""
<section class="sec-sm"><div class="wrap">
  {sec_head('Bilder der <span class="n">Nacht</span>', h='h2', cls='h-md')}
  {gal}
  <p class="small rv" style="margin-top:1.4rem">Auf unseren Events entstehen Fotos und Videos. Wenn du nicht abgebildet werden möchtest, sag es dem Personal vor Ort oder schreib uns.</p>
</div></section>
<section class="sec alt"><div class="wrap wrap--narrow">
  {sec_head('Saison <span class="n">2026</span>', h='h2', cls='h-md')}
  <ol class="season">{rows}</ol>
  <div class="btn-row rv" style="margin-top:2rem"><a class="btn btn-ghost" href="{TT}"{ext(TT)}>{ICO['tt']}Alle Videos auf TikTok{NEWTAB}</a>
    <a class="btn btn-ghost" href="{IG}"{ext(IG)}>{ICO['ig']}Instagram{NEWTAB}</a></div>
</div></section>""" + newsletter_block()
    page("/rueckblick/", "Rückblick und Saison 2026 | Cherry Moon",
         f"Rückblick auf {len(SAISON)} Nächte der Saison 2026: GAGA, Alsterinsel, Radisson Blu, Sands, Scharbeutz, Grömitz. Bilder von Cherry Moon.",
         body, og="og-home", ld=[crumbs_ld(crumbs)])


def build_tische():
    set_cur("/tische/")
    crumbs = [("/", "Start"), ("/tische/", "Tische")]
    steps = [("Event wählen", "Such dir die Nacht aus. Auf jeder Eventseite steht, welche Tische es gibt und wie viele Plätze sie haben."),
             ("Tisch aussuchen", "Schau auf den Tischplan der Location und merk dir die Nummer deines Wunschtischs."),
             ("Anfrage schicken", "Per WhatsApp mit vorbereiteter Nachricht oder per Mail. Personenzahl und Name ergänzen, fertig."),
             ("Bestätigung", "Wir melden uns mit Verfügbarkeit und Konditionen und bestätigen dir den Tisch.")]
    st = "".join(f'<div class="card glow-card rv" data-d="{i + 1}"><span class="num">0{i + 1}</span><h3>{a}</h3><p>{b}</p></div>' for i, (a, b) in enumerate(steps))
    plans = "".join(f"""<div class="stack rv" data-d="{i + 1}"><div class="frame">{img(e['plan'], f"Tischplan {e['venue']} für {e['name']}", '(max-width:860px) 90vw, 33vw')}</div>
      <p><b>{E(e['venue'])}</b><br><a class="link" href="{rel('/events/' + e['slug'] + '/')}#tisch">{E(e['name'])}</a></p></div>""" for i, e in enumerate(EVENTS) if e.get("plan"))
    body = ph_head("VIP-Tische", 'Dein <span class="n">Tisch</span>',
                   "Für deine Crew: VIP-Tische mit festen Plätzen rund um den Dancefloor. Anfrage per WhatsApp, Bestätigung von uns.", crumbs, bg="club-05") + f"""
<section class="sec-sm"><div class="wrap">
  <div class="cards">{st}</div>
  <div class="btn-row rv" style="margin-top:2rem"><a class="btn btn-solid mag" href="{wa_link('Hi Cherry Moon, ich möchte einen Tisch reservieren.')}"{ext('wa')}>{ICO['wa']}Per WhatsApp anfragen{NEWTAB}</a>
    <a class="btn btn-ghost" href="mailto:{MAIL}?subject={quote('Tischanfrage')}">{ICO['mail']}Per Mail</a></div>
</div></section>
<section class="sec alt"><div class="wrap">
  {sec_head('Tisch<span class="n">pläne</span>', h='h2', cls='h-md')}
  <div class="cards">{plans}</div>
</div></section>"""
    page("/tische/", "VIP-Tische reservieren | Cherry Moon Hamburg",
         "VIP-Tisch bei Cherry Moon reservieren: Tischplan ansehen, per WhatsApp anfragen, Bestätigung von uns. Sands, Coda, Alsterinsel.",
         body, ld=[crumbs_ld(crumbs)])


def build_about():
    set_cur("/ueber-uns/")
    crumbs = [("/", "Start"), ("/ueber-uns/", "Über uns")]
    formate = [("Club Nights", "Indoor in Hamburgs Clubs: GAGA an der Reeperbahn, Coda, Circle Club in Winterhude, Alsterinsel."),
               ("Open Airs", "Rooftops, Terrassen und Bars unter freiem Himmel, vom Radisson Blu bis zum Sands am Dammtor."),
               ("Beach", "Strand und Meer: Scharbeutz, Grömitz, Timmendorfer Strand und die Hermannshöhe an der Ostsee."),
               ("Specials", "Silvester im Sands, Tanz in den Mai auf der Alsterinsel, Halloween, Boat Party und Public Viewing.")]
    fm = "".join(f'<div class="card glow-card rv" data-d="{i + 1}"><span class="num">0{i + 1}</span><h3>{a}</h3><p>{b}</p></div>' for i, (a, b) in enumerate(formate))
    body = ph_head("Über uns", 'Zwischen Stadt<br>und <span class="n">Strand</span>',
                   "Cherry Moon ist eine Veranstaltungsreihe aus Hamburg. Club Nights in der Stadt, Beach Open Airs an der Ostsee, dazu House und Afro House.", crumbs, bg="club-golden-cut") + f"""
<section class="sec-sm"><div class="wrap grid-2">
  <div class="stack">
    <h2 class="h-lg rv">Eine Kirsche.<br><span class="n">Viele Nächte.</span></h2>
    <p class="lead rv" data-d="1">Der Rückblick beginnt im März 2024 im Gewölbe des Leos Cafe. Seitdem zieht Cherry Moon durch die Stadt und an die Küste: vom Fernsehturm bis aufs Wasser, vom Club an der Reeperbahn bis auf den Rooftop in Scharbeutz.</p>
    <p class="dim rv" data-d="2">Der Sound ist House und Afro House. Die Kirsche aus Neon ist auf vielen Nächten dabei, im Club wie auf dem Rooftop.</p>
  </div>
  <div class="frame rv-img">{img('club-golden-cut', 'Die Neon-Kirsche von Cherry Moon über dem Dancefloor', '(max-width:860px) 90vw, 50vw')}</div>
</div></section>
<section class="sec alt"><div class="wrap">
  {sec_head('Formate', h='h2', cls='h-md')}
  <div class="cards">{fm}</div>
</div></section>
{marquee()}
<section class="sec"><div class="wrap grid-2">
  <div class="stack">
    {lbl('Kooperationen')}
    <h2 class="h-lg rv">Location?<br><span class="n">Idee?</span></h2>
    <p class="lead rv" data-d="1">Du hast eine Location, eine Marke oder eine Idee für eine Kooperation? Schreib uns. Für Presseanfragen gilt dasselbe.</p>
    <div class="btn-row rv" data-d="2"><a class="btn btn-solid mag" href="mailto:{MAIL}?subject={quote('Booking und Kooperation')}">{ICO['mail']}Kooperation anfragen</a>
      <a class="link" href="{rel('/kontakt/')}">Alle Kontaktwege</a></div>
  </div>
  <div class="card rv">
    <h3 class="h-sm" style="margin-bottom:1rem">Hinter Cherry Moon</h3>
    <p class="dim">Cherry Moon ist eine Veranstaltungsreihe der {FIRMA['name']}, Hamburg. Cherry Moon® ist eine beim Deutschen Patent- und Markenamt eingetragene Wortmarke.</p>
  </div>
</div></section>"""
    page("/ueber-uns/", "Über Cherry Moon | Partyreihe aus Hamburg",
         "Cherry Moon ist eine Veranstaltungsreihe aus Hamburg: Club Nights in der Stadt, Beach Open Airs an der Ostsee, House und Afro House. Seit 2024.",
         body, ld=[crumbs_ld(crumbs)])


FAQ = [
    ("tickets", "Kann ich mein Ticket zurückgeben?",
     "Nein. Für Eintrittskarten zu Veranstaltungen mit festem Termin gibt es kein gesetzliches Widerrufsrecht (§ 312g Abs. 2 Nr. 9 BGB). Gekaufte Tickets werden deshalb nicht zurückgenommen. Du kannst dein Ticket aber privat weitergeben, wenn du verhindert bist."),
    ("absage", "Was passiert, wenn ein Event ausfällt oder verlegt wird?",
     f"Fällt eine Veranstaltung aus, bekommst du den vollen Ticketpreis zurück. Bei einer Verlegung gilt dein Ticket für den Ersatztermin. Kannst du da nicht, erstatten wir ebenfalls den vollen Preis. Melde dich dafür unter <a href=\"mailto:{MAIL}\">{MAIL}</a>."),
    ("alter", "Ab wie viel Jahren darf ich rein?", "Unsere Events sind ab 18. Der Einlass setzt ein gültiges Ticket und das jeweilige Mindestalter voraus."),
    ("format", "Wie bekomme ich mein Ticket?",
     "Digital per Mail, bei Silvester auch für die Apple Wallet. Jedes Ticket hat einen QR-Code, der einmal gilt: Beim Einlass wird er gescannt und entwertet. Bewahr ihn auf wie Bargeld."),
    ("weitergabe", "Darf ich mein Ticket weitergeben?",
     "Privat ja. Der gewerbliche Weiterverkauf über dem Originalpreis ist nicht erlaubt, solche Tickets können wir sperren. Wer den Code zuerst vorzeigt, kommt rein."),
    ("bestellung", "Wo finde ich meine Bestellung?",
     f"Im <a href=\"{SHOP}/order/lookup\" target=\"_blank\" rel=\"noopener\">Ticketshop unter Bestellungen</a> oder in deinem Cherry Account. Dort siehst du alle Bestellungen zu deiner Mail-Adresse."),
    ("account", "Was ist der Cherry Account?",
     "Dein Konto im Ticketshop. Die Anmeldung läuft ohne Passwort über einen Link per Mail oder über Google und Apple. Im Account siehst du deine Bestellungen, und aufs erste Ticket sparst du 2,00 €."),
    ("tisch", "Wie reserviere ich einen VIP-Tisch?",
     f"Such dir auf der Eventseite einen Tisch aus und schreib uns per WhatsApp oder Mail. Wir bestätigen dir den Tisch. <a href=\"../tische/\">So funktioniert es</a>"),
    ("einlass", "Kann mir der Einlass verweigert werden?",
     "Ja. Wir und die Location haben das Hausrecht, etwa bei starker Alkoholisierung, Gewaltbereitschaft, diskriminierendem Verhalten oder Verstößen gegen die Hausordnung. Der Ticketpreis wird dann nicht erstattet."),
    ("fotos", "Werden auf den Events Fotos gemacht?",
     "Ja, für Dokumentation und Werbung. Wenn du nicht abgebildet werden möchtest, sag es dem Personal vor Ort oder schreib uns. Wir entfernen entsprechende Aufnahmen."),
]


def build_faq():
    set_cur("/faq/")
    crumbs = [("/", "Start"), ("/faq/", "FAQ")]
    items = "".join(f'<details id="{k}"{" open" if i == 0 else ""}><summary>{E(q)}</summary><div class="a"><p>{a}</p></div></details>' for i, (k, q, a) in enumerate(FAQ))
    body = ph_head("FAQ", 'Gut zu <span class="n">wissen</span>',
                   "Tickets, Einlass, Tische: die Antworten auf die Fragen, die uns am häufigsten erreichen.", crumbs) + f"""
<section class="sec-sm"><div class="wrap wrap--narrow"><div class="faq rv">{items}</div>
  <p class="dim rv" style="margin-top:2rem">Deine Frage ist nicht dabei? Schreib an <a class="ilink" href="mailto:{MAIL}">{MAIL}</a></p>
</div></section>"""
    ld = {"@context": "https://schema.org", "@type": "FAQPage",
          "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for _, q, a in FAQ]}
    page("/faq/", "FAQ: Tickets, Einlass, Tische | Cherry Moon",
         "Fragen zu Tickets, Rückgabe, Einlass ab 18, Cherry Account und VIP-Tischen bei Cherry Moon in Hamburg.",
         body, ld=[crumbs_ld(crumbs), ld])


def build_kontakt():
    set_cur("/kontakt/")
    crumbs = [("/", "Start"), ("/kontakt/", "Kontakt")]
    ways = [(f"mailto:{MAIL}?subject={quote('Tickets und Bestellung')}", "mail", "Tickets und Bestellung", "Fragen zu deiner Bestellung oder zum Einlass."),
            (f"mailto:{MAIL}?subject={quote('Booking und Kooperation')}", "mail", "Booking und Kooperation", "Locations, Marken, Ideen für gemeinsame Nächte."),
            (f"mailto:{MAIL}?subject={quote('Presse')}", "mail", "Presse", "Anfragen, Bilder und Infos für Redaktionen."),
            (wa_link("Hi Cherry Moon, ich möchte einen Tisch reservieren."), "wa", "Tische", "VIP-Tische per WhatsApp anfragen."),
            (IG, "ig", "Instagram", "Für Schnelles: @cherrymoonhamburg"),
            (TT, "tt", "TikTok", "Alle Videos: @cherrymoonhamburg")]
    w = "".join(f'<a class="way rv" data-d="{i % 3 + 1}" href="{u}"{ext(u) if u.startswith("http") else ""}>{ICO[ic]}<b>{E(t)}</b><span>{E(s)}</span>{NEWTAB if u.startswith("http") else ""}</a>' for i, (u, ic, t, s) in enumerate(ways))
    body = ph_head("Kontakt", 'Schreib <span class="n">uns</span>',
                   f"Fragen zu deiner Bestellung, Ideen für eine Kooperation oder eine Presseanfrage? Wir antworten per Mail an {MAIL}.", crumbs) + f"""
<section class="sec-sm"><div class="wrap"><div class="ways">{w}</div>
  <p class="dim rv" style="margin-top:2rem">Oder direkt: <a class="ilink" href="mailto:{MAIL}">{MAIL}</a></p></div></section>"""
    page("/kontakt/", "Kontakt | Cherry Moon Hamburg",
         f"Kontakt zu Cherry Moon: Mail an {MAIL}, Tische per WhatsApp, Instagram und TikTok @cherrymoonhamburg.", body, ld=[crumbs_ld(crumbs)])


def build_legal():
    F = FIRMA
    set_cur("/impressum/")
    crumbs = [("/", "Start"), ("/impressum/", "Impressum")]
    imp = f"""<section class="sec-sm"><div class="wrap"><div class="prose">
<h2>Angaben gemäß § 5 DDG</h2>
<p>{F['name']}<br>{F['strasse']}<br>{F['ort']}<br>{F['land']}</p>
<p>„Cherry Moon“ ist eine Veranstaltungsreihe der {F['name']}.</p>
<h2>Marke</h2>
<p>Cherry Moon® ist eine beim Deutschen Patent- und Markenamt eingetragene Wortmarke (Registernummer {F['marke']}). Inhaber ist {F['inhaber']}, die {F['name']} nutzt sie mit seiner Erlaubnis. Name und Logo dürfen ohne unsere Zustimmung nicht für eigene Veranstaltungen, Produkte oder Werbung verwendet werden.</p>
<h2>Vertretungsberechtigte Geschäftsführer</h2><p>{F['gf']}</p>
<h2>Kontakt</h2><p>E-Mail: <a href="mailto:{MAIL}">{MAIL}</a></p>
<h2>Registereintrag</h2><p>{F['hrb']}</p>
<h2>Steuerangaben</h2><p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {F['ust']}</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2><p>{F['v18']}<br>{F['strasse']}<br>{F['ort']}</p>
<h2>Streitbeilegung</h2><p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Bildnachweise</h2><p>Fotos und Videos: Cherry Moon, aus eigenen Veranstaltungen und von den Kanälen @cherrymoonhamburg.</p>
</div></div></section>"""
    page("/impressum/", "Impressum | Cherry Moon", f"Impressum von Cherry Moon, einer Veranstaltungsreihe der {F['name']}, Hamburg.",
         ph_head("Rechtliches", "Impressum", None, crumbs, h1cls="h-lg") + imp, ld=[crumbs_ld(crumbs)])

    set_cur("/datenschutz/")
    crumbs = [("/", "Start"), ("/datenschutz/", "Datenschutz")]
    ds = f"""<section class="sec-sm"><div class="wrap"><div class="prose">
<h2>Verantwortlicher</h2>
<p>{F['name']}<br>{F['strasse']}, {F['ort']}<br>{F['hrb']}<br><a href="mailto:{MAIL}">{MAIL}</a></p>
<h2>Hosting</h2>
<p>Beim Aufruf dieser Website verarbeitet unser Hoster technisch notwendige Daten wie IP-Adresse, Datum und Uhrzeit, aufgerufene Seite und Browser in Server-Logfiles, um die Website auszuliefern und vor Angriffen zu schützen (Art. 6 Abs. 1 lit. f DSGVO). <span class="ph">[PLATZHALTER: Name und Anschrift des Hosters dieser Seite, Speicherdauer der Logfiles, Vertrag zur Auftragsverarbeitung]</span></p>
<h2>Keine Cookies, kein Tracking</h2>
<p>Diese Seiten setzen keine Cookies und binden keine Tracking- oder Werbedienste ein. Schriften und Videos liegen auf unserem eigenen Server. Im Browser wird nur für die Dauer der Sitzung gespeichert, ob die Eröffnungsanimation schon lief und ob du Bewegung angehalten hast (Session Storage, § 25 Abs. 2 TDDDG). Diese Angaben verlassen dein Gerät nicht.</p>
<h2>Ticketshop, Cherry Account und Newsletter</h2>
<p>Tickets, Cherry Account, Bestellungen und Newsletter laufen in unserem Ticketshop unter <a href="{SHOP}" target="_blank" rel="noopener">cherry-moon.de</a>. Was dort verarbeitet wird, etwa beim Kauf über Stripe oder beim Versand der Mails, steht in der <a href="{SHOP}/legal/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung des Ticketshops</a>.</p>
<h2>Kontakt per Mail und WhatsApp</h2>
<p>Wenn du uns schreibst, nutzen wir deine Angaben nur zur Bearbeitung deiner Anfrage (Art. 6 Abs. 1 lit. b und f DSGVO). Ein Klick auf einen WhatsApp-Link öffnet WhatsApp, Anbieter ist die WhatsApp Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland. Ab dann gelten die Datenschutzhinweise von WhatsApp.</p>
<h2>Links zu Instagram, TikTok und Karten</h2>
<p>Wir verlinken auf Instagram, TikTok, Google Maps und Apple Karten. Es sind einfache Links: Daten werden erst übertragen, wenn du einen davon anklickst.</p>
<h2>Bild- und Tonaufnahmen auf Veranstaltungen</h2>
<p>Auf unseren Veranstaltungen entstehen Foto- und Videoaufnahmen, die wir zu Dokumentations- und Werbezwecken veröffentlichen (Art. 6 Abs. 1 lit. f DSGVO, §§ 22, 23 KunstUrhG). Wenn du nicht abgebildet werden möchtest, wende dich vor Ort an das Personal oder schreib uns. Wir entfernen entsprechende Aufnahmen.</p>
<h2>Deine Rechte</h2>
<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO) sowie auf Beschwerde bei einer Aufsichtsbehörde, zum Beispiel beim Hamburgischen Beauftragten für Datenschutz und Informationsfreiheit.</p>
</div></div></section>"""
    page("/datenschutz/", "Datenschutz | Cherry Moon", "Datenschutzerklärung dieser Website von Cherry Moon: keine Cookies, kein Tracking.",
         ph_head("Rechtliches", "Datenschutz", None, crumbs, h1cls="h-lg") + ds, ld=[crumbs_ld(crumbs)])


def build_404():
    set_cur("/404.html")
    body = f"""<section class="hero" style="min-height:80svh"><div class="hero-media">{img('club-03', '', lazy=False)}</div><div class="hero-shade"></div>
<div class="wrap hero-in"><p class="eyebrow">Fehler 404</p>
<h1 class="h-xl neon-split" style="margin:1.4rem 0">Licht <span class="n">aus</span></h1>
<p class="hero-tag">Diese Seite gibt es nicht. Die Party läuft woanders weiter.</p>
<div class="btn-row" style="margin-top:2rem;justify-content:center"><a class="btn btn-solid" href="{BASE}/">Zur Startseite</a><a class="btn btn-ghost" href="{BASE}/events/">Events</a></div>
</div></section>"""
    page("/404.html", "Seite nicht gefunden | Cherry Moon", "Diese Seite gibt es nicht.", body)


def build_meta():
    smap = "".join(f"<url><loc>{BASE}{p}</loc></url>" for p in PAGES if p != "/404.html")
    open(f"{SITE}/sitemap.xml", "w").write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{smap}</urlset>\n')
    robots = "User-agent: *\nDisallow: /\n" if NOINDEX else f"User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n"
    open(f"{SITE}/robots.txt", "w").write(robots)
    fav = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#060606"/><g fill="none" stroke="#ff2d55" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)">{CHERRY_PATHS}</g></svg>'
    open(f"{SITE}/favicon.svg", "w").write(fav)


def copy_kit():
    global VER
    for sub, f in [("css", "neon.css"), ("js", "neon.js")]:
        os.makedirs(f"{SITE}/{sub}", exist_ok=True)
        shutil.copy(f"{KIT}/{sub}/{f}", f"{SITE}/{sub}/{f}")
    h = hashlib.sha1()
    for f in ["css/neon.css", "js/neon.js"]:
        h.update(open(f"{SITE}/{f}", "rb").read())
    VER = h.hexdigest()[:8]


if __name__ == "__main__":
    copy_kit()
    build_home()
    build_events()
    for ev in EVENTS:
        build_event(ev)
    build_rueckblick()
    build_tische()
    build_about()
    build_faq()
    build_kontakt()
    build_legal()
    build_404()
    build_meta()
    print(f"{len(PAGES)} Seiten geschrieben, Version {VER}")
