#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator: MyImmo (myimmoapp.de) — Premium-Estate-Baukasten v2.
Fakten ausschließlich aus .preview-cache/mia/* — nichts erfunden."""
import os

SITE = "/home/user/Web-Projekte/webseiten/myimmoapp"
SCRATCH = os.path.dirname(os.path.abspath(__file__))

FONTS = ("https://fonts.googleapis.com/css2?"
         "family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700"
         "&family=Outfit:wght@300..600&family=Pinyon+Script&display=swap")
APP = "https://www.myimmoapp.de/anmelden"

NAV = [
    ("index.html", "Start"),
    ("funktionen.html", "Funktionen"),
    ("preise.html", "Preise"),
    ("vorlagen.html", "Vorlagen"),
    ("ratgeber.html", "Ratgeber"),
    ("vision.html", "Vision"),
]

ARROW = '<svg viewBox="0 0 26 10" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4"/></svg>'
WORDMARK = '<span class="wordmark">My<em>Immo</em></span>'


def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" type="image/svg+xml" href="assets/img/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="vframe" aria-hidden="true"></div>
<div class="preloader" aria-hidden="true">
  <div class="pl-script">Von überall.</div>
  <div class="pl-mark">MyImmo · Vermieten ohne Papierkram</div>
  <div class="pl-line"><i></i></div>
</div>
<div class="curtain" aria-hidden="true"></div>
"""


def header(active):
    links = ""
    for href, label in [("funktionen.html", "Funktionen"), ("preise.html", "Preise"),
                        ("vorlagen.html", "Vorlagen"), ("vision.html", "Vision")]:
        links += f'<a class="head-link" href="{href}">{label}</a>\n    '
    nav_links = ""
    for i, (href, label) in enumerate(NAV, 1):
        aria = ' aria-current="page"' if href == active else ""
        nav_links += f'    <a href="{href}"{aria}><i>{i:02d}</i>{label}</a>\n'
    return f"""<header class="site-header">
  <a class="brand" href="index.html" aria-label="MyImmo — Startseite">{WORDMARK}</a>
  <div class="head-cta">
    {links}<a class="head-link" href="{APP}" target="_blank" rel="noopener">Anmelden</a>
    <button class="menu-btn" aria-expanded="false" aria-label="Menü öffnen">
      <span>Menü</span><span class="mb-ico"><i></i><i></i></span>
    </button>
  </div>
</header>
<div class="nav-overlay">
  <nav class="nav-list" aria-label="Hauptnavigation">
{nav_links}  </nav>
  <aside class="nav-side">
    <div class="ns-img"><img src="assets/img/hero-still.jpg" alt=""></div>
    <div class="ns-block">
      <p class="lbl">MyImmo</p>
      <p>Immobilienverwaltung für private Vermieter.<br>
      Early Access — aktuell alles kostenlos.<br>
      <a href="mailto:info@myimmoapp.de">info@myimmoapp.de</a></p>
    </div>
    <div class="nav-foot">
      <a href="{APP}" target="_blank" rel="noopener">Kostenlos starten</a>
      <a href="impressum.html">Impressum</a>
      <a href="datenschutz.html">Datenschutz</a>
      <a href="agb.html">AGB</a>
    </div>
  </aside>
</div>
<main>
"""


FOOTER = f"""</main>
<footer class="footer">
  <p class="ghost" aria-hidden="true">Von überall.</p>
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        {WORDMARK}
        <p style="margin-top:1.2rem">Mieten, Kosten, Kredite, Nebenkostenabrechnung und
        Anlage V in einer App — gemacht für private Vermieter mit 1–24 Einheiten.
        Aktuell im Early Access kostenlos.</p>
      </div>
      <div class="foot-col">
        <b>Produkt</b>
        <a href="funktionen.html">Funktionen</a>
        <a href="preise.html">Preise</a>
        <a href="vorlagen.html">Vorlagen</a>
        <a href="vision.html">Vision</a>
      </div>
      <div class="foot-col">
        <b>Wissen</b>
        <a href="ratgeber.html">Ratgeber</a>
        <a href="{APP}" target="_blank" rel="noopener">Kostenlos starten</a>
        <a href="{APP}" target="_blank" rel="noopener">Anmelden</a>
      </div>
      <div class="foot-col">
        <b>Rechtliches</b>
        <a href="agb.html">AGB</a>
        <a href="datenschutz.html">Datenschutz</a>
        <a href="impressum.html">Impressum</a>
        <a href="mailto:info@myimmoapp.de">info@myimmoapp.de</a>
      </div>
    </div>
    <div class="foot-base">
      <span>© 2026 MyImmo · Jonas Scharp, Bad Schwartau</span>
      <span>Daten in der EU · kein Tracking · keine Werbung</span>
    </div>
  </div>
</footer>
<script src="js/script.js"></script>
</body>
</html>
"""


def btn_line(href, label, d=None, ext=False):
    dd = f' data-d="{d}"' if d else ""
    tg = ' target="_blank" rel="noopener"' if ext else ""
    return f'<a class="btn-line rv"{dd} href="{href}"{tg}>{label} {ARROW}</a>'


def cta_panel(img_or_video, label, title, video=False):
    media = (f'<video muted loop autoplay playsinline data-webm="assets/video/{img_or_video}.webm" '
             f'data-mp4="assets/video/{img_or_video}.mp4" poster="assets/img/strand-still.jpg" class="plx" data-plx="0.05"></video>'
             if video else f'<img class="plx" data-plx="0.06" src="assets/img/{img_or_video}" alt="">')
    return f"""<section class="cta-panel">
  <div class="cp-bg">{media}</div>
  <div class="cp-inner">
    <p class="lbl rv">{label}</p>
    <h2 class="d2 split">{title}</h2>
    <div class="rv" data-d="1" style="display:flex;gap:1.2rem;flex-wrap:wrap;justify-content:center">
      <a class="btn-solid magnet" href="{APP}" target="_blank" rel="noopener">Kostenlos starten</a>
      <a class="btn-ghost" href="funktionen.html">Alle Funktionen</a>
    </div>
    <p class="rv" data-d="2" style="font-size:.82rem">Keine Kreditkarte nötig · Daten in der EU · jederzeit kündbar</p>
  </div>
</section>
"""

PAGES = {}

# ==================================================================
# STARTSEITE
# ==================================================================
PAGES["index.html"] = head(
    "MyImmo — Immobilienverwaltung für private Vermieter",
    "Mieten, Kosten, Kredite, Nebenkostenabrechnung und Anlage V in einer "
    "App. Gemacht für private Vermieter — aktuell im Early Access kostenlos."
) + header("index.html") + f"""<section class="hero">
  <div class="hero-media">
    <video muted loop autoplay playsinline data-webm="assets/video/hero.webm"
      data-mp4="assets/video/hero.mp4" poster="assets/img/hero-still.jpg"></video>
  </div>
  <div class="hero-top">
    <p class="rv"><span class="pill"><i></i>Early Access — aktuell alles kostenlos</span></p>
    <p class="lbl lbl--dim rv" data-d="1">Für private Vermieter · 1–24 Einheiten</p>
  </div>
  <div class="hero-inner">
    <h1 class="d1 split" data-split="chars">Vermieten ohne Papierkram. <em>Von überall.</em></h1>
    <p class="lead rv" data-d="1">Nebenkostenabrechnung, Anlage V, Mieten und dein ganzes Team —
    Mieter, Hausmeister, Handwerker — in einer aufgeräumten App. Für alle, denen
    Excel zu fehleranfällig und Profi-Software zu teuer ist.</p>
    <div class="rv" data-d="2" style="display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:1.6rem">
      <a class="btn-solid magnet" href="{APP}" target="_blank" rel="noopener">Kostenlos starten</a>
      <a class="btn-ghost" href="funktionen.html">Alle Funktionen</a>
    </div>
    <div class="hero-meta rv" data-d="3">
      <div><b>Funktionen</b>14+ — vom Mietvertrag bis ELSTER</div>
      <div><b>Rollen</b>Vermieter · Mieter · Hausmeister · Verwaltung</div>
      <div><b>Daten</b>100 % in der EU · AES-256</div>
      <div><b>Early Access</b>0 € — voller Funktionsumfang</div>
    </div>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec intro spot">
  <p class="ghost" aria-hidden="true">Von überall.</p>
  <div class="wrap intro-grid">
    <div class="intro-aside">
      <p class="lbl rv">01 — Das Cockpit</p>
      <div class="line-h"></div>
      <p class="rv" data-d="1">Die App im Dark Mode —<br>dein Bestand auf einen Blick.</p>
      {btn_line("funktionen.html", "Alle 14 Funktionen", 2)}
    </div>
    <div style="position:relative">
      <div class="device rv-img"><img src="assets/img/app-dashboard.webp"
        alt="MyImmo-Dashboard mit Portfolio-Wert, Cashflow und Verlaufs-Chart"></div>
      <div class="float-chip" style="top:14%;left:-3%"><b>NK-Abrechnung</b> → fertiges PDF</div>
      <div class="float-chip" style="bottom:10%;right:-2%"><b>Anlage V</b> → ELSTER-Zeilen zugeordnet</div>
    </div>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap">
    <div class="stats">
      <div class="stat rv"><div class="stat-num"><span data-count="14"></span><sup>+</sup></div><div class="stat-lbl">Funktionen — Mietvertrag bis ELSTER</div></div>
      <div class="stat rv" data-d="1"><div class="stat-num"><span data-count="4"></span></div><div class="stat-lbl">Rollen: Vermieter · Mieter · Hausmeister · Verwaltung</div></div>
      <div class="stat rv" data-d="2"><div class="stat-num"><span data-count="100"></span><sup>%</sup></div><div class="stat-lbl">Daten in der EU · Bankdaten AES-256</div></div>
      <div class="stat rv" data-d="3"><div class="stat-num"><span data-count="0"></span><sup>€</sup></div><div class="stat-lbl">im Early Access — voller Funktionsumfang</div></div>
    </div>
  </div>
</section>

<section class="scrub" data-scrub>
  <div class="scrub-stage">
    <div class="scrub-media">
      <video muted loop autoplay playsinline data-webm="assets/video/strand.webm"
        data-mp4="assets/video/strand.mp4" poster="assets/img/strand-still.jpg"></video>
    </div>
    <div class="scrub-step" data-at="0" data-until="0.22">
      <p class="lbl">So arbeitet dein Team · 1/4</p>
      <h2 class="d2">Der Mieter meldet den Schaden.</h2>
      <p>Mit Foto — in 20 Sekunden. Kein Anrufbeantworter, kein Zettel.</p>
    </div>
    <div class="scrub-step" data-at="0.22" data-until="0.46">
      <p class="lbl">So arbeitet dein Team · 2/4</p>
      <h2 class="d2">Der Hausmeister erstellt den Auftrag.</h2>
      <p>Und wählt die Firma direkt aus dem Verzeichnis.</p>
    </div>
    <div class="scrub-step" data-at="0.46" data-until="0.72">
      <p class="lbl">So arbeitet dein Team · 3/4</p>
      <h2 class="d2">Du gibst frei — <em>auch vom Strand.</em></h2>
      <p>Ein Klick. Mehr verlangt der Vorgang nicht von dir.</p>
    </div>
    <div class="scrub-step" data-at="0.72">
      <p class="lbl">So arbeitet dein Team · 4/4</p>
      <h2 class="d2">Die Handwerksfirma bekommt den Termin-Link.</h2>
      <p>Mit dem Kontakt des Mieters. Vier Beteiligte, ein Vorgang,
      keine einzige Telefonkette.</p>
    </div>
  </div>
</section>

<section class="sec sec-paper cmp">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl rv">Vorher / Nachher</p>
      <p class="lbl lbl--dim rv" data-d="1">Aufgabe für Aufgabe</p>
    </div>
    <h2 class="d2 split">Excel war <em>gestern</em></h2>
    <table class="ftable rv" data-d="1" style="margin-top:2.4rem">
      <tr><th>Aufgabe</th><th>Mit Excel &amp; Ordnern</th><th>Mit MyImmo</th></tr>
      <tr><td>Nebenkostenabrechnung</td><td class="bad">Ein Wochenende rechnen, Formel-Fehler inklusive</td><td class="good">Positionen erfasst → fertiges PDF, Anteil automatisch gerechnet</td></tr>
      <tr><td>Anlage V</td><td class="bad">Belege suchen, Zeilen raten</td><td class="good">Buchungen sind den ELSTER-Zeilen schon zugeordnet</td></tr>
      <tr><td>Mieteingang prüfen</td><td class="bad">Kontoauszüge durchgehen</td><td class="good">Mietkonto zeigt offene Monate — Banking-Abgleich kommt</td></tr>
      <tr><td>Schadensmeldung</td><td class="bad">Anruf, Rückruf, Zettel, nochmal Anruf</td><td class="good">Mieter meldet mit Foto, Hausmeister übernimmt, du gibst frei</td></tr>
      <tr><td>Fristen</td><td class="bad">Im Hinterkopf oder im Papierkalender</td><td class="good">Werden automatisch aus deinen Daten abgeleitet</td></tr>
      <tr><td>Unterlagen fürs Bankgespräch</td><td class="bad">Aktenordner zusammensuchen</td><td class="good">Beleihungsordner mit Deckblatt auf Knopfdruck</td></tr>
    </table>
  </div>
</section>

<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.07" src="assets/img/papier-still.jpg" alt="Aufgeräumter Schreibtisch mit Mietunterlagen"></div></div>
  <div class="ch-body">
    <p class="lbl rv">So startest du</p>
    <h2 class="d2 split">In vier Schritten zur <em>entspannten Verwaltung</em></h2>
    <div class="flist rv" data-d="1">
      <div><b>1 · Objekt anlegen</b><span>Adresse, Kaufpreis, Wohnfläche — oder Exposé einfügen
      und die KI liest die Eckdaten aus.</span></div>
      <div><b>2 · Mieter erfassen</b><span>Mietverhältnis, Kaltmiete, Kaution. Auf Wunsch bekommt
      der Mieter direkt seinen Portal-Zugang.</span></div>
      <div><b>3 · Buchungen laufen lassen</b><span>Wiederkehrende Mieten und Kosten einmal anlegen —
      MyImmo bucht im Zyklus, rückwirkend bis 10 Jahre.</span></div>
      <div><b>4 · Abrechnen &amp; exportieren</b><span>NK-Abrechnung, Anlage V und Jahresbericht als
      fertige PDFs — für Mieter, ELSTER und Steuerberater.</span></div>
    </div>
    <p class="note rv" data-d="2">Kein Handbuch nötig — die App führt dich durch.</p>
  </div>
</section>

<div class="marquee" aria-hidden="true">
  <div class="mq-track"><span>Nebenkostenabrechnung</span><span>Anlage V &amp; ELSTER</span><span>Mieterportal</span><span>Service &amp; Aufträge</span><span>Kredite &amp; Zinsbindung</span><span>Dokument-Generator</span><span>Termine &amp; Fristen</span></div>
</div>

<section class="sec spot">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">Funktionen — ein Auszug</p>
      <p class="lbl lbl--dim rv" data-d="1">Alles, was Vermieten verlangt</p>
    </div>
    <div class="tcards" style="grid-template-columns:repeat(3,1fr)">
      <div class="tcard tilt3d rv"><h3>Portfolio-Dashboard</h3><p>Wert, Cashflow, Rendite und Leerstand
        deines Bestands auf einen Blick — mit Verlaufs-Chart.</p></div>
      <div class="tcard tilt3d rv" data-d="1"><h3>Nebenkostenabrechnung</h3><p>Im klassischen Layout — die App
        rechnet den Mieteranteil selbst und erzeugt das fertige PDF.</p></div>
      <div class="tcard tilt3d rv" data-d="2"><h3>Steuer, Anlage V &amp; ELSTER</h3><p>Einkünfte aus V+V je Objekt
        mit AfA und Schuldzinsen — als ELSTER-Ausfüllhilfe Zeile für Zeile.</p></div>
      <div class="tcard tilt3d rv"><h3>Mieterportal</h3><p>Mieter melden Schäden, Zählerstände und
        Anliegen direkt in der App — inklusive Bewerber-Verwaltung.</p></div>
      <div class="tcard tilt3d rv" data-d="1"><h3>Service &amp; Aufträge</h3><p>Hausmeister erstellt den Auftrag,
        du gibst per Klick frei — mit Firmenverzeichnis und Termin-Link.</p></div>
      <div class="tcard tilt3d rv" data-d="2"><h3>Ein- &amp; Ausgaben</h3><p>Mieten und Kosten je Objekt erfassen,
        Belege anhängen, Netto-Cashflow automatisch berechnet.</p></div>
    </div>
    <div style="margin-top:3rem">{btn_line("funktionen.html", "Alle 14 Funktionen ansehen", 1)}</div>
  </div>
</section>

<section class="chapter flip">
  <div class="ch-media"><div><img class="plx" data-plx="0.07" src="assets/img/modern-still.jpg" alt="Modernes Mehrfamilienhaus in der Abenddämmerung"></div></div>
  <div class="ch-body">
    <p class="lbl rv">Die Vision</p>
    <h2 class="d2 split">Leben, <em>wo du willst.</em></h2>
    <p class="rv" data-d="1">MyImmo entsteht aus einem konkreten Ziel: im Ausland leben und den
    Bestand in Deutschland vollständig aus der App steuern. Was vor Ort
    passieren muss, erledigt dein Team — was Entscheidung ist, entscheidest
    du. Von überall.</p>
    {btn_line("vision.html", "Die ganze Vision & Roadmap", 2)}
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">Preise</p>
      <p class="lbl lbl--dim rv" data-d="1">Fair kalkuliert — und aktuell kostenlos</p>
    </div>
    <div class="plans">
      <div class="plan rv"><h3>Kostenlos</h3><p class="p-unit">1 Einheit</p><div class="p-price">0 €<small> / Monat</small></div></div>
      <div class="plan hot rv" data-d="1"><span class="plan-badge">Beliebt</span><h3>MyImmo Privat</h3><p class="p-unit">bis 5 Einheiten</p><div class="p-price">7,99 €<small> / Monat</small></div></div>
      <div class="plan rv" data-d="2"><h3>MyImmo Plus</h3><p class="p-unit">bis 24 Einheiten</p><div class="p-price">12,99 €<small> / Monat</small></div></div>
      <div class="plan rv" data-d="3"><h3>MyImmo Business</h3><p class="p-unit">ab 25 Einheiten · Hausverwaltungen</p><div class="p-price" style="font-size:1.6rem">auf Anfrage</div></div>
    </div>
    <div style="margin-top:2.6rem">{btn_line("preise.html", "Tarife im Detail vergleichen", 1)}</div>
  </div>
</section>

""" + cta_panel("strand", "In 2 Minuten startklar", "Konto anlegen — den Rest <em>übernimmt MyImmo.</em>", video=True) + FOOTER

# ==================================================================
# FUNKTIONEN
# ==================================================================
FEATURES = [
    ("Portfolio-Dashboard", "Wert, Cashflow, Rendite und Leerstand deines Bestands auf einen Blick — mit Verlaufs-Chart.", ""),
    ("Ein- & Ausgaben", "Mieten und Kosten je Objekt erfassen, Belege anhängen, Netto-Cashflow automatisch berechnet.", ""),
    ("Nebenkostenabrechnung", "Im klassischen Layout mit Gesamtkosten, Basis und Wohnungsanteil — die App rechnet den Mieteranteil selbst und erzeugt das fertige PDF.", ""),
    ("Steuer, Anlage V & ELSTER", "Einkünfte aus V+V je Objekt mit AfA und Schuldzinsen — als ELSTER-Ausfüllhilfe Zeile für Zeile, PDF-Aufstellung und CSV.", ""),
    ("Mieterportal", "Mieter melden Schäden, Zählerstände und Anliegen direkt in der App — inklusive Bewerber-Verwaltung für freie Wohnungen.", ""),
    ("Service & Aufträge", "Hausmeister erstellt den Auftrag, du gibst per Klick frei — mit Firmenverzeichnis und Termin-Link für Handwerker.", ""),
    ("Rollen & Team", "Vermieter, Mieter, Hausmeister und Hausverwaltung — jeder sieht genau das, was er braucht. Zugang per Einladungscode.", ""),
    ("Banking-Anbindung", "Konten per PSD2 verbinden (nur Lesezugriff): Mieteingänge automatisch abgleichen, Ausgaben als Kostenvorschläge.", "BALD"),
    ("Kredite & Zinsbindung", "Restschuld, Raten und Zinsbindungen im Blick — mit Warnung, bevor die Anschlussfinanzierung ansteht.", ""),
    ("Termine & Fristen", "Automatische Fristen aus Mietern, Krediten und Steuer plus Wartungen — als Kalender und iCal-Export.", ""),
    ("Dokument-Generator", "Mahnung, Mietbescheinigung, Übergabeprotokoll & Co. als fertige Brief-PDFs im eigenen Briefkopf — auf Wunsch e-signiert.", ""),
    ("Archiv & Bankpaket", "Verträge, Bescheide und Belege zentral abgelegt — plus Beleihungsordner mit Deckblatt fürs Bankgespräch.", ""),
    ("KI-Import & Kalkulatoren", "Exposé einfügen, Eckdaten werden ausgelesen. Kauf-Check mit Cashflow-, Rendite- und Vermögensrechnung.", ""),
    ("Sicherheit & Datenschutz", "Daten in der EU, Bankdaten zusätzlich anwendungsseitig verschlüsselt (AES-256-GCM), voller Datenexport jederzeit.", ""),
]

def feature_cards():
    out = ""
    for i, (t, d, badge) in enumerate(FEATURES):
        dd = f' data-d="{i % 3}"' if i % 3 else ""
        b = f' <span class="tag tag--soon">Bald</span>' if badge else ""
        out += f'<div class="tcard tilt3d rv"{dd}><h3>{t}{b}</h3><p>{d}</p></div>\n'
    return out

def deep(idx, title, text, img, points, flip=False, badge=""):
    cls = "chapter flip" if flip else "chapter"
    pts = "".join(f"<div><b>·</b><span>{p}</span></div>" for p in points)
    b = ' <span class="tag tag--soon">Bald</span>' if badge else ""
    return f"""<section class="{cls}">
  <div class="ch-media"><div style="display:grid;place-items:center;background:var(--bg-2);padding:clamp(1rem,3vw,3rem)">
    <div class="device rv-img" style="width:100%"><img src="assets/img/{img}" alt="{title} — Screenshot aus MyImmo"></div>
  </div></div>
  <div class="ch-body">
    <p class="lbl rv">{idx} — Deep Dive</p>
    <h2 class="d3 split">{title}{b}</h2>
    <p class="rv" data-d="1">{text}</p>
    <div class="flist rv" data-d="2">{pts}</div>
  </div>
</section>
"""

PAGES["funktionen.html"] = head(
    "Funktionen — MyImmo",
    "Alle MyImmo-Funktionen: Nebenkostenabrechnung, Anlage V & ELSTER, "
    "Mieterportal, Service-Aufträge, Banking-Anbindung, Kredite, Dokumente und mehr."
) + header("funktionen.html") + f"""<section class="hero hero--page">
  <div class="hero-media"><img src="assets/img/papier-still.jpg" alt="" fetchpriority="high"></div>
  <div class="hero-top">
    <p class="lbl rv">Funktionen</p>
    <p class="lbl lbl--dim rv" data-d="1">14+ Werkzeuge · 4 Rollen</p>
  </div>
  <div class="hero-inner">
    <h1 class="d1 split">Alles, was Vermieten <em>verlangt</em></h1>
    <p class="lead rv" data-d="1">Vom ersten Mietvertrag bis zur Anlage V — inklusive Mieterportal,
    Team-Rollen und Banking-Anbindung.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec spot">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">01 — Überblick</p>
      <p class="lbl lbl--dim rv" data-d="1">14 Funktionen</p>
    </div>
    <div class="tcards" style="grid-template-columns:repeat(3,1fr)">
      {feature_cards()}
    </div>
  </div>
</section>

{deep("02", "Mieterportal: dein Posteingang statt Anrufe",
  "Mieter bekommen einen eigenen Zugang und melden alles digital — du behältst den Überblick, dein Hausmeister übernimmt vor Ort.",
  "app-mieterportal.webp",
  ["Schadensmeldungen mit Foto, Anliegen &amp; Dokument-Anfragen",
   "Zählerstände direkt vom Mieter — landen im Verbrauchs-Tab",
   "Bewerbungen auf freie Wohnungen an einem Ort"])}

{deep("03", "Steuer ohne Suchen",
  "Deine Buchungen werden automatisch den Zeilen der Anlage V zugeordnet — je Objekt, mit AfA und Schuldzinsen.",
  "app-steuer.webp",
  ["ELSTER-Ausfüllhilfe: Zeile für Zeile zum Abtippen",
   "PDF-Aufstellung &amp; Jahresbericht im Briefkopf-Design",
   "AfA automatisch nach Baujahr oder eigener Satz je Objekt"], flip=True)}

{deep("04", "Banking: Kontoauszüge waren gestern",
  "Verbinde deine Konten mit reinem Lesezugriff (PSD2) — MyImmo gleicht Mieteingänge mit den erwarteten Mieten ab und schlägt Kosten automatisch vor. Du bestätigst per Klick.",
  "app-banking.webp",
  ["Nur Lesezugriff über lizenzierten Anbieter — kein Zahlungsverkehr",
   "Umsätze verschlüsselt gespeichert, Freigabe jederzeit widerrufbar",
   "Mehrere Bankverbindungen je Konto möglich"], badge="BALD")}

{deep("05", "Fristen, die sich selbst eintragen",
  "Aus Mietern, Krediten und Steuerterminen entstehen automatisch Fristen — eigene Wartungstermine legst du mit einem Klick an.",
  "app-termine.webp",
  ["NK-Abrechnungsfrist, Zinsbindung, Grundsteuer &amp; Co.",
   "Wiederkehrende Wartungen (Heizung, Rauchmelder …)",
   "Kalender-Export (.ics) für Apple/Google-Kalender"], flip=True)}

{deep("06", "Dein Bestand als Cockpit",
  "Jedes Objekt mit Wert, Miete, Rendite und Restschuld — und der Cashflow deines Portfolios als Verlauf.",
  "app-immobilien.webp",
  ["Brutto-Rendite und Leerstandsquote automatisch",
   "Einnahmen vs. Ausgaben je Monat",
   "Kauf-Kalkulatoren für das nächste Objekt"])}

<section class="sec sec-paper">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">07 — Rollen</p>
      <p class="lbl lbl--dim rv" data-d="1">Eine Plattform. Vier Perspektiven.</p>
    </div>
    <p class="lead rv">Vermieten ist Teamarbeit. MyImmo gibt jedem Beteiligten einen eigenen
    Zugang — per Einladungscode, sauber getrennt, jeder sieht nur seins.</p>
    <div class="flow" style="margin-top:2.6rem">
      <div class="flow-card rv"><i>Rolle 1</i><b>Vermieter</b><p>Die volle App: Objekte, Mieter, Buchungen,
        Abrechnungen, Steuer, Kredite — dein Bestand, dein Cockpit.</p></div>
      <div class="flow-card rv" data-d="1"><i>Rolle 2</i><b>Mieter</b><p>Eigener Zugang: Schäden melden, Zählerstände
        durchgeben, Dokumente empfangen — statt Zettel im Hausflur.</p></div>
      <div class="flow-card rv" data-d="2"><i>Rolle 3</i><b>Hausmeister &amp; Service</b><p>Anliegen sehen, Aufträge anlegen,
        Firmen kontaktieren — du gibst nur noch frei.</p></div>
      <div class="flow-card rv" data-d="3"><i>Rolle 4</i><b>Hausverwaltung</b><p>Verwaltet fremde Bestände mit denselben
        Werkzeugen wie ein Vermieter — je Mandat sauber getrennt.</p></div>
    </div>
    <p class="note rv" data-d="2" style="margin-top:2.4rem">So läuft eine Reparatur: Mieter meldet den Schaden
    mit Foto → Hausmeister erstellt den Auftrag und wählt die Firma aus dem Verzeichnis →
    du gibst von unterwegs frei → die Firma bekommt einen Termin-Link mit dem Kontakt
    des Mieters. <strong>Du warst nie am Telefon.</strong></p>
  </div>
</section>

""" + cta_panel("hero-still.jpg", "Bereit?", "In 2 Minuten <em>startklar.</em>") + FOOTER

# ==================================================================
# PREISE
# ==================================================================
def plan(name, unit, price, per, feats, hot=False, cta="Kostenlos starten", cta_href=APP, d=None):
    dd = f' data-d="{d}"' if d else ""
    badge = '<span class="plan-badge">Beliebt</span>' if hot else ""
    lis = "".join(f"<li>{f}</li>" for f in feats)
    per_html = f"<small> {per}</small>" if per else ""
    return f"""<div class="plan{' hot' if hot else ''} rv"{dd}>{badge}
  <h3>{name}</h3><p class="p-unit">{unit}</p>
  <div class="p-price"{' style="font-size:1.6rem"' if price == 'auf Anfrage' else ''}>{price}{per_html}</div>
  <ul>{lis}</ul>
  <a class="btn-ghost" href="{cta_href}"{' target="_blank" rel="noopener"' if cta_href.startswith('http') else ''} style="text-align:center">{cta}</a>
</div>"""

FAQ = [
    ("Ist MyImmo wirklich kostenlos?",
     "Ja — während des Early Access ist der komplette Funktionsumfang kostenlos. Die Preistabelle zeigt, was die Tarife später kosten sollen. Bestehende Nutzer werden rechtzeitig informiert, bevor Bezahltarife eingeführt werden, und behalten Zugriff auf ihre Daten."),
    ("Kann ich meine Immobilien auch aus dem Ausland verwalten?",
     "Ja — genau dafür ist MyImmo gebaut. Die App läuft im Browser auf jedem Gerät, dein Hausmeister kümmert sich vor Ort über den Service-Bereich, Mieter melden Anliegen digital, und du gibst Aufträge von überall frei. Mit der Banking-Anbindung entfällt auch der Kontoauszugs-Abgleich."),
    ("Wo liegen meine Daten?",
     "In der EU (Frankfurt, eu-central-1) bei Supabase; gehostet wird die App bei Vercel. Bankdaten wie IBANs werden zusätzlich anwendungsseitig verschlüsselt (AES-256-GCM). Details stehen in der Datenschutzerklärung und im AVV."),
    ("Wie funktioniert die Banking-Anbindung?",
     "Über einen lizenzierten Kontoinformationsdienst (PSD2) mit reinem Lesezugriff — MyImmo sieht nie dein Bank-Passwort und kann keine Überweisungen auslösen. Die Freigabe läuft nach 90 Tagen automatisch ab und ist jederzeit widerrufbar. Der Start ist in Vorbereitung."),
    ("Ersetzt MyImmo meinen Steuerberater?",
     "Nein. Nebenkostenabrechnung, Anlage V und Kalkulatoren sind Rechen- und Organisationshilfen ohne Gewähr — sie bereiten deine Zahlen sauber auf, ersetzen aber keine Steuer- oder Rechtsberatung."),
    ("Für wen ist MyImmo gedacht?",
     "Für private Vermieter mit etwa 1–24 Einheiten, denen Profi-Hausverwaltungssoftware zu teuer und zu komplex ist — und Excel zu fehleranfällig. Für größere Bestände und Hausverwaltungen gibt es den Business-Tarif."),
    ("Kann ich meine Daten wieder mitnehmen?",
     "Ja. Auswertungen lassen sich als CSV bzw. PDF exportieren, in den Einstellungen gibt es einen Komplett-Export aller Daten als ZIP, und du kannst dein Konto jederzeit selbst löschen."),
    ("Gibt es eine Mieter-Begrenzung oder Werbung?",
     "Nein — keine Werbung, keine Weitergabe deiner Daten für Werbezwecke. Das Geschäftsmodell ist ein faires Software-Abo, kein Datenhandel."),
]

PAGES["preise.html"] = head(
    "Preise — MyImmo",
    "MyImmo-Tarife: Kostenlos, Privat, Plus und Business — fair kalkuliert, "
    "während des Early Access komplett kostenlos."
) + header("preise.html") + f"""<section class="hero hero--page">
  <div class="hero-media"><img src="assets/img/modern-still.jpg" alt="" fetchpriority="high"></div>
  <div class="hero-top">
    <p class="lbl rv">Preise</p>
    <p class="lbl lbl--dim rv" data-d="1">Jahreszahlung spart rund zwei Monatsbeiträge</p>
  </div>
  <div class="hero-inner">
    <h1 class="d1 split">Fair kalkuliert — und <em>aktuell kostenlos</em></h1>
    <p class="lead rv" data-d="1">So sollen die Tarife später aussehen. Während des Early Access
    ist der volle Funktionsumfang kostenlos.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec">
  <div class="wrap">
    <p class="rv" style="margin-bottom:2.4rem"><span class="pill"><i></i>Early Access:
    Während der Startphase ist der volle Funktionsumfang kostenlos — Bezahltarife
    werden rechtzeitig angekündigt.</span></p>
    <div class="plans">
      {plan("Kostenlos", "1 Einheit", "0 €", "/ Monat",
        ["Objekt, Mieter &amp; Buchungen", "Dashboard &amp; Cashflow", "Termine &amp; Fristen", "Verbrauch &amp; Zähler"])}
      {plan("MyImmo Privat", "bis 5 Einheiten", "7,99 €", "/ Monat · oder 79 € im Jahr",
        ["Alles aus Kostenlos", "Nebenkostenabrechnung als PDF (inkl. Durchrechnung)", "Steuer: Anlage V, ELSTER-Hilfe &amp; PDF-Berichte", "Dokument-Generator &amp; Archiv", "Mieterportal mit Mieter-Zugängen"], hot=True, d=1)}
      {plan("MyImmo Plus", "bis 24 Einheiten", "12,99 €", "/ Monat · oder 129 € im Jahr",
        ["Alles aus Privat", "Team-Rollen: Hausmeister &amp; Service-Aufträge", "Firmenverzeichnis &amp; Auftrags-Freigabe", "KI-Import &amp; alle Kalkulatoren", "Beleihungsordner &amp; Bankgespräch-Paket"], d=2)}
      {plan("MyImmo Business", "ab 25 Einheiten · Hausverwaltungen", "auf Anfrage", "",
        ["Alles aus Plus", "Hausverwaltungs-Zugang (Mandate getrennt)", "Team-Zugänge (geplant)", "Sammel-Funktionen (geplant)"], cta="Kontakt aufnehmen", cta_href="impressum.html", d=3)}
    </div>
    <p class="note rv" style="margin-top:2.6rem"><strong>Add-on Banking:</strong> Die Konto-Anbindung
    verursacht laufende Kosten je Bankverbindung und wird deshalb als optionales Add-on zu
    Privat/Plus/Business angeboten — Preis wird mit dem Start bekannt gegeben. Ohne Add-on
    funktioniert alles andere uneingeschränkt.</p>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap wrap--narrow faq">
    <div class="sec-head">
      <p class="lbl rv">Häufige Fragen</p>
      <p class="lbl lbl--dim rv" data-d="1">Kurz beantwortet</p>
    </div>
    {"".join(f'<details class="rv"><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ)}
    <p class="note rv" style="margin-top:2rem">Details stehen in den
    <a href="agb.html"><strong>AGB</strong></a> und der
    <a href="datenschutz.html"><strong>Datenschutzerklärung</strong></a>.</p>
  </div>
</section>

""" + cta_panel("strand", "In 2 Minuten startklar", "Alles testen — <em>0 € im Early Access.</em>", video=True) + FOOTER

# ==================================================================
# VORLAGEN
# ==================================================================
TEMPLATES = [
    ("Mieterhöhung (§ 558 BGB)", "Mieterhöhungsverlangen bis zur ortsüblichen Vergleichsmiete — mit korrekter Begründung und Frist."),
    ("Zahlungserinnerung", "Freundliche Erinnerung bei ausstehender Miete, mit Betrag und Kontodaten vorausgefüllt."),
    ("Mahnung", "Förmliche Mahnung mit Zahlungsfrist — der nächste Schritt nach der Erinnerung."),
    ("Kündigung des Mietverhältnisses", "Ordentliche oder außerordentliche Kündigung mit den passenden Fristen."),
    ("Reparatur-Ankündigung", "Ankündigung von Instandhaltungs- oder Modernisierungsarbeiten mit Termin."),
    ("NK-Abrechnung — Anschreiben", "Begleitschreiben zur Nebenkostenabrechnung mit Saldo (Nachzahlung oder Guthaben)."),
    ("Wohnungsgeberbestätigung (§ 19 BMG)", "Pflichtbescheinigung für die Anmeldung des Mieters beim Einwohnermeldeamt."),
    ("Mietbescheinigung", "Bestätigung des Mietverhältnisses, z. B. für Behörden oder Banken."),
    ("Mietquittung (§ 368 BGB)", "Quittung über gezahlte Miete — auf Verlangen des Mieters auszustellen."),
    ("Übergabeprotokoll", "Wohnungsübergabe bei Ein- oder Auszug: Zählerstände, Zustand, Schlüssel — beweissicher."),
]

PAGES["vorlagen.html"] = head(
    "Kostenlose Vorlagen für Vermieter — MyImmo",
    "Mieterhöhung, Kündigung, Mahnung, Wohnungsgeberbestätigung, Übergabeprotokoll "
    "und mehr — rechtssichere Vorlagen, in MyImmo mit einem Klick personalisiert als PDF."
) + header("vorlagen.html") + f"""<section class="hero hero--page">
  <div class="hero-media"><img src="assets/img/papier-still.jpg" alt="" fetchpriority="high"></div>
  <div class="hero-top">
    <p class="lbl rv">Vorlagen</p>
    <p class="lbl lbl--dim rv" data-d="1">Kostenlos im Early Access</p>
  </div>
  <div class="hero-inner">
    <h1 class="d1 split">Rechtssichere Vorlagen — <em>in Sekunden fertig</em></h1>
    <p class="lead rv" data-d="1">Statt Word-Dokumente mühsam auszufüllen: Vorlage wählen, der Rest
    wird aus Ihren Objekt- und Mieterdaten automatisch ergänzt — als sauberes PDF
    im Geschäftsbriefstil.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec spot">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">10 Vorlagen</p>
      <p class="lbl lbl--dim rv" data-d="1">Aus Ihren Daten personalisiert</p>
    </div>
    <div class="tcards" style="grid-template-columns:repeat(3,1fr)">
      {"".join(f'<div class="tcard tilt3d rv"{f" data-d=~{i % 3}~" if i % 3 else ""}><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(TEMPLATES)).replace("~", chr(34))}
    </div>
    <p class="note rv" style="margin-top:2.6rem">Alle Vorlagen werden mit Ihren Daten personalisiert
    und lassen sich vor dem Export bearbeiten. Anhaltspunkte ohne Gewähr, keine Rechtsberatung.</p>
  </div>
</section>

""" + cta_panel("papier-still.jpg", "Dokumente ohne Abtippen", "Vorlagen <em>kostenlos nutzen.</em>") + FOOTER

# ==================================================================
# VISION
# ==================================================================
PAGES["vision.html"] = head(
    "Vision — MyImmo",
    "Die MyImmo-Vision: im Ausland leben und den Immobilienbestand in Deutschland "
    "vollständig aus der App steuern — mit Team-Rollen, Banking-Abgleich und Steuerberater-Freigabe."
) + header("vision.html") + f"""<section class="hero">
  <div class="hero-media">
    <video muted loop autoplay playsinline data-webm="assets/video/strand.webm"
      data-mp4="assets/video/strand.mp4" poster="assets/img/strand-still.jpg"></video>
  </div>
  <div class="hero-top">
    <p class="lbl rv">Die Vision</p>
    <p class="lbl lbl--dim rv" data-d="1">Warum es MyImmo gibt</p>
  </div>
  <div class="hero-inner">
    <h1 class="d1 split" data-split="chars">Leben, wo du willst. <em>Verwalten, als wärst du da.</em></h1>
    <p class="lead rv" data-d="1">MyImmo entsteht aus einem konkreten Ziel: im Ausland leben und den
    Immobilienbestand in Deutschland vollständig aus der App steuern. Kein Papierkram,
    der auf dem Küchentisch wartet. Kein Anruf, der dich um 7 Uhr Ortszeit weckt.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec intro spot">
  <p class="ghost" aria-hidden="true">Von überall.</p>
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl rv">01 — Heute schon</p>
      <p class="lbl lbl--dim rv" data-d="1">Kein Zukunftsversprechen</p>
    </div>
    <div class="tcards">
      <div class="tcard tilt3d rv"><h3>Das Team arbeitet vor Ort</h3><p>Mieter melden Anliegen digital,
        der Hausmeister legt Aufträge an, Firmen bekommen Termin-Links — du gibst nur noch frei.
        Alles läuft über Rollen, nichts über deinen Anrufbeantworter.</p></div>
      <div class="tcard tilt3d rv" data-d="1"><h3>Papierkram wird zu PDFs</h3><p>Nebenkostenabrechnung, Mahnung,
        Anlage V, Jahresbericht: fertige Dokumente im eigenen Briefkopf — erzeugt in Sekunden,
        abgelegt im Archiv, verschickt von überall.</p></div>
      <div class="tcard tilt3d rv" data-d="2"><h3>Zahlen ohne Zettel</h3><p>Cashflow, Rendite, Restschuld und
        Fristen leben in der App statt in Excel — mit automatischen Warnungen, bevor etwas anbrennt.</p></div>
    </div>
  </div>
</section>

<section class="sec sec-paper">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl rv">02 — Die Roadmap</p>
      <p class="lbl lbl--dim rv" data-d="1">Ehrlich unterteilt</p>
    </div>
    <div class="flist rv">
      <div><b><span class="tag tag--now">In Arbeit</span> &nbsp;Banking-Abgleich</b><span>Mieteingänge landen
      automatisch am richtigen Mietkonto — du bestätigst nur noch per Klick.</span></div>
      <div><b><span class="tag tag--plan">Geplant</span> &nbsp;Steuerberater-Freigabe</b><span>Fertige Unterlagen
      auf Knopfdruck prüfen lassen — Ergebnis in 1–3 Tagen, ohne Termin.</span></div>
      <div><b><span class="tag tag--plan">Geplant</span> &nbsp;News für Vermieter</b><span>Mietrecht, Steuer,
      Förderungen: kuratierte Meldungen aus seriösen Quellen, direkt in der App.</span></div>
      <div><b><span class="tag tag--plan">Geplant</span> &nbsp;Geführtes Onboarding</b><span>Durchklickbarer Guide
      nach der Registrierung: Objekt anlegen → Mieter erfassen → erste Buchung.</span></div>
    </div>
    <p class="note rv" data-d="1" style="margin-top:2.4rem">Der Maßstab für jede neue Funktion ist derselbe:
    Lässt sich damit eine Sache mehr aus der Ferne erledigen, die heute noch Präsenz, Papier
    oder ein Telefonat verlangt? <strong>Wenn ja, wird sie gebaut.</strong></p>
  </div>
</section>

""" + cta_panel("hero-still.jpg", "Von überall", "Dein Bestand. <em>Dein Cockpit.</em>") + FOOTER

# ==================================================================
# RATGEBER
# ==================================================================
ARTICLES = [
    ("Nebenkostenabrechnung: Fristen und die häufigsten Fehler", "Nebenkosten · 6 Min · 15. Juli 2026",
     "Die Abrechnung muss dem Mieter spätestens zum Ablauf des zwölften Monats nach Ende des "
     "Abrechnungszeitraums zugehen (§ 556 Abs. 3 BGB) — sonst ist der Nachzahlungsanspruch verloren. "
     "Umlagefähig sind nur BetrKV-Kosten mit wirksamer Umlagevereinbarung; ohne abweichende Vereinbarung "
     "gilt der Wohnflächenschlüssel, Heizung und Warmwasser 50–70 % verbrauchsabhängig.",
     "https://www.myimmoapp.de/ratgeber/nebenkostenabrechnung-fristen-fehler"),
    ("Grundsteuer 2025 richtig auf die Mieter umlegen", "Nebenkosten · 4 Min · 15. Juli 2026",
     "Seit dem 1.1.2025 gilt die reformierte Grundsteuer; für die Abrechnung 2025 ist der neue "
     "Grundsteuerbescheid maßgeblich. Die Grundsteuer B bleibt voll umlagefähig (§ 2 Nr. 1 BetrKV) — "
     "bei deutlich verändertem Betrag sollte die monatliche Vorauszahlung nach § 560 BGB angepasst werden.",
     "https://www.myimmoapp.de/ratgeber/grundsteuer-2025-auf-mieter-umlegen"),
    ("§ 35a EStG: So sparen Ihre Mieter Steuern — und Sie sich Rückfragen", "Steuer · 5 Min · 15. Juli 2026",
     "Mieter können 20 % der in den Nebenkosten enthaltenen Arbeits- und Lohnkosten absetzen "
     "(haushaltsnahe Dienstleistungen bis 4.000 €, Handwerkerleistungen bis 1.200 € pro Jahr). "
     "Laut BFH genügt eine aufgeschlüsselte Abrechnung oder Bescheinigung — für Vermieter ein "
     "Service-Argument, das Rückfragen erspart.",
     "https://www.myimmoapp.de/ratgeber/paragraf-35a-mieter-steuern-sparen"),
    ("Die 15-%-Falle: anschaffungsnahe Herstellungskosten vermeiden", "Steuer · 5 Min · 15. Juli 2026",
     "Übersteigen Renovierungskosten in den ersten drei Jahren nach Kauf netto 15 % der "
     "Gebäude-Anschaffungskosten, gibt es statt Sofortabzug nur noch 2–3 % AfA jährlich "
     "(§ 6 Abs. 1 Nr. 1a EStG). Beispiel: Bei 240.000 € Gebäudeanteil liegt die Grenze bei 36.000 € — "
     "MyImmo zeigt dafür einen „15-%-Wächter“ je Objekt.",
     "https://www.myimmoapp.de/ratgeber/anschaffungsnahe-herstellungskosten-15-prozent"),
    ("Geerbte Immobilie vermieten: die ersten Schritte", "Einstieg · 6 Min · 15. Juli 2026",
     "Erben treten unverändert in laufende Mietverträge ein und sollten Grundbuchberichtigung "
     "(binnen zwei Jahren gebührenfrei) sowie die Mieterinformation zum Eigentümerwechsel veranlassen. "
     "Steuerlich läuft die AfA des Erblassers fort; Mieteinnahmen gehören in die Anlage V.",
     "https://www.myimmoapp.de/ratgeber/geerbte-immobilie-vermieten-erste-schritte"),
]

PAGES["ratgeber.html"] = head(
    "Ratgeber für Vermieter — MyImmo",
    "Nebenkosten, Steuer, Fristen und der Einstieg in die Vermietung — "
    "verständlich erklärt, mit Bezug auf die passenden MyImmo-Funktionen."
) + header("ratgeber.html") + f"""<section class="hero hero--page">
  <div class="hero-media"><img src="assets/img/hero-still.jpg" alt="" fetchpriority="high"></div>
  <div class="hero-top">
    <p class="lbl rv">Ratgeber</p>
    <p class="lbl lbl--dim rv" data-d="1">Rechtsstand Juli 2026</p>
  </div>
  <div class="hero-inner">
    <h1 class="d1 split">Praxiswissen für <em>Vermieter</em></h1>
    <p class="lead rv" data-d="1">Nebenkosten, Steuer, Fristen und der Einstieg in die Vermietung —
    verständlich erklärt, mit Bezug auf die passenden MyImmo-Funktionen.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec spot">
  <div class="wrap wrap--narrow">
    <div class="ecards">
      {"".join(f'''<article class="ecard" style="grid-template-columns:1fr">
        <div class="ec-body" style="border:1px solid var(--line);padding:clamp(1.6rem,3vw,2.6rem)">
          <p class="lbl rv">{meta}</p>
          <h2 class="d3 split">{t}</h2>
          <p class="rv" data-d="1">{teaser}</p>
          <a class="btn-line rv" data-d="2" href="{url}" target="_blank" rel="noopener">Artikel lesen {ARROW}</a>
        </div>
      </article>''' for t, meta, teaser, url in ARTICLES)}
    </div>
    <p class="note rv" style="margin-top:2.6rem">Alle Angaben sind Anhaltspunkte ohne Gewähr und
    ersetzen keine Steuer- oder Rechtsberatung.</p>
  </div>
</section>

""" + cta_panel("papier-still.jpg", "Wissen, das mitarbeitet", "Fristen &amp; Steuer — <em>automatisch im Blick.</em>") + FOOTER

# ==================================================================
# RECHTSSEITEN (Fragmente vom Subagenten)
# ==================================================================
def frag(name):
    with open(os.path.join(SCRATCH, f"mia-frag-{name}.html"), encoding="utf-8") as f:
        return f.read()

def legal(fname, title, h1):
    return head(title + " — MyImmo", title + " der MyImmo-Web-Anwendung.") + header("") + f"""<section class="hero hero--page" style="min-height:46svh">
  <div class="hero-media"><img src="assets/img/modern-still.jpg" alt=""></div>
  <div class="hero-inner"><h1 class="d1 split">{h1}</h1></div>
</section>
""" + frag(fname) + FOOTER

PAGES["impressum.html"] = legal("impressum", "Impressum", "Impressum")
PAGES["agb.html"] = legal("agb", "AGB", "AGB")
PAGES["datenschutz.html"] = legal("datenschutz", "Datenschutzerklärung", "Datenschutz")


if __name__ == "__main__":
    os.makedirs(SITE, exist_ok=True)
    for fname, html in PAGES.items():
        with open(os.path.join(SITE, fname), "w", encoding="utf-8") as f:
            f.write(html)
        print("wrote", fname, len(html), "bytes")
