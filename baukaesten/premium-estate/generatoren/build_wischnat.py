#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator: „das auto" Gerd Wischnat — Ferrari-Style-Referenz.
Fakten: .preview-cache/wi/* (Website-Scan) + belegte Verzeichnis-/
mobile.de-Angaben. Unbelegtes bleibt [PLATZHALTER]."""
import os

SITE = "/home/user/Web-Projekte/webseiten/wischnat"

FONTS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap"
MOBILE = "https://home.mobile.de/DASAUTOGERDWISCHNAT"
BEWERT = "https://www.mobile.de/bewertungen/DASAUTOGERDWISCHNAT"

NAV = [
    ("index.html", "Start"),
    ("fahrzeuge.html", "Fahrzeuge"),
    ("ueber.html", "Über uns"),
    ("kontakt.html", "Kontakt"),
]


def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="preloader" aria-hidden="true">
  <div class="pl-script">Gepflegte Gebrauchtwagen aller Fabrikate</div>
  <div class="pl-mark">das auto · Gerd Wischnat</div>
  <div class="pl-line"><i></i></div>
</div>
<div class="curtain" aria-hidden="true"></div>
"""


def header(active):
    nav_links = ""
    for i, (href, label) in enumerate(NAV, 1):
        aria = ' aria-current="page"' if href == active else ""
        nav_links += f'    <a href="{href}"{aria}><i>{i:02d}</i>{label}</a>\n'
    head_links = "".join(
        f'<a class="head-link" href="{h}">{l}</a>\n    '
        for h, l in [("fahrzeuge.html", "Fahrzeuge"), ("ueber.html", "Über uns"), ("kontakt.html", "Kontakt")])
    return f"""<header class="site-header">
  <a class="brand" href="index.html" aria-label="das auto — Startseite">
    <b>„das auto"</b><span>Gerd Wischnat · Alt Mölln</span>
  </a>
  <div class="head-cta">
    {head_links}<a class="head-link" href="{MOBILE}" target="_blank" rel="noopener">Bestand</a>
    <button class="menu-btn" aria-expanded="false" aria-label="Menü öffnen">
      <span>Menü</span><span class="mb-ico"><i></i><i></i></span>
    </button>
  </div>
</header>
<div class="nav-overlay">
  <nav class="nav-list" aria-label="Hauptnavigation">
{nav_links}  </nav>
  <aside class="nav-side">
    <div class="ns-img"><img src="assets/img/studio-still.jpg" alt=""></div>
    <div class="ns-block">
      <p class="lbl lbl--lit">„das auto" · Gerd Wischnat</p>
      <p>Energiestraße 2 · 23881 Alt Mölln<br>
      Abfahrt Mölln Süd · Nähe Hamburg<br>
      <a href="tel:+494542843600">(04542) 84 36 00</a></p>
    </div>
    <div class="nav-foot">
      <a href="{MOBILE}" target="_blank" rel="noopener">Bestand auf mobile.de</a>
      <a href="impressum.html">Impressum</a>
      <a href="datenschutz.html">Datenschutz</a>
    </div>
  </aside>
</div>
<main>
"""


FOOTER = f"""</main>
<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <b>„das auto"</b><span>Gerd Wischnat</span>
        <p>Gepflegte Gebrauchtwagen aller Fabrikate — eine kleine Firma,
        die sich große Mühe gibt. Familienunternehmen mit handwerklicher
        Ausbildung im Kfz-Bereich.</p>
      </div>
      <div class="foot-col">
        <b>Navigation</b>
        <a href="fahrzeuge.html">Fahrzeuge</a>
        <a href="ueber.html">Über uns</a>
        <a href="kontakt.html">Kontakt</a>
        <a href="{MOBILE}" target="_blank" rel="noopener">Bestand · mobile.de</a>
      </div>
      <div class="foot-col">
        <b>Kontakt</b>
        <span>Energiestraße 2<br>23881 Alt Mölln</span>
        <a href="tel:+494542843600">(04542) 84 36 00</a>
        <a href="mailto:wischnat.altmoelln@t-online.de">wischnat.altmoelln@t-online.de</a>
      </div>
      <div class="foot-col">
        <b>Rechtliches</b>
        <a href="impressum.html">Impressum</a>
        <a href="datenschutz.html">Datenschutz</a>
      </div>
    </div>
    <div class="foot-base">
      <span>© 2026 „das auto" · Gerd Wischnat · Alt Mölln</span>
      <span>Abfahrt Mölln Süd · Nähe Hamburg</span>
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
    "das auto · Gerd Wischnat — Gepflegte Gebrauchtwagen aller Fabrikate",
    "das auto — gepflegte Gebrauchtwagen aller Fabrikate. Gerd Wischnat, "
    "Alt Mölln. Eine kleine Firma, die sich große Mühe gibt."
) + header("index.html") + f"""<section class="hero">
  <div class="hero-media">
    <video muted loop autoplay playsinline data-webm="assets/video/studio.webm"
      data-mp4="assets/video/studio.mp4" poster="assets/img/studio-still.jpg"></video>
  </div>
  <div class="hero-top">
    <p class="micro rv">Gebrauchtwagen · Alt Mölln</p>
    <p class="micro rv" data-d="1">Abfahrt Mölln Süd · Nähe Hamburg</p>
  </div>
  <div class="hero-inner">
    <p class="hero-kicker rv">„das auto" · Gerd Wischnat</p>
    <h1 class="d1 split" data-split="chars">Eine kleine Firma, die sich große Mühe gibt.</h1>
    <p class="lead rv" data-d="1">Seit 1975 in der Gebrauchtwagenbranche — gepflegte
    Gebrauchtwagen aller Fabrikate. Besuchen Sie uns, um Ihr ideales Auto zu finden.</p>
    <div class="rv" data-d="2" style="display:flex;gap:32px;justify-content:center;margin-top:24px">
      <a class="cta-arrow" href="{MOBILE}" target="_blank" rel="noopener">Aktueller Bestand</a>
      <a class="btn-line" href="kontakt.html">Kontakt</a>
    </div>
    <div class="hero-meta rv" data-d="3">
      <div><b>Seit</b>1975 im Gebrauchtwagenhandel</div>
      <div><b>Fabrikate</b>Alle Marken</div>
      <div><b>mobile.de</b>4,8 / 5 aus 71 Bewertungen</div>
    </div>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl lbl--lit rv">01 — Der Anspruch</p>
      <p class="micro rv" data-d="1">Kundenzufriedenheit durch Qualität</p>
    </div>
    <div class="stats">
      <div class="stat rv"><div class="stat-num">1975</div>
        <div class="stat-lbl">Seit — Gebrauchtwagenbranche</div></div>
      <div class="stat rv" data-d="1"><div class="stat-num"><span data-count="4.8"></span><sup>/5</sup></div>
        <div class="stat-lbl">mobile.de-Bewertung</div></div>
      <div class="stat rv" data-d="2"><div class="stat-num"><span data-count="71"></span></div>
        <div class="stat-lbl">Bewertungen auf mobile.de</div></div>
      <div class="stat rv" data-d="3"><div class="stat-num">Alle</div>
        <div class="stat-lbl">Fabrikate — frei &amp; unabhängig</div></div>
    </div>
  </div>
</section>

<section class="scrub" data-scrub>
  <div class="scrub-stage">
    <div class="scrub-media">
      <video muted loop autoplay playsinline data-webm="assets/video/hof.webm"
        data-mp4="assets/video/hof.mp4" poster="assets/img/hof-still.jpg"></video>
    </div>
    <div class="scrub-step" data-at="0" data-until="0.3">
      <p class="lbl">So kaufen Sie bei uns · 1/3</p>
      <h2 class="d2">Ansehen. In Ruhe.</h2>
      <p>Auf unserem Hof in Alt Mölln — ohne Termindruck, ohne Verkaufsshow.</p>
    </div>
    <div class="scrub-step" data-at="0.3" data-until="0.62">
      <p class="lbl">So kaufen Sie bei uns · 2/3</p>
      <h2 class="d2">Fragen. Ehrliche Antworten.</h2>
      <p>Wir verstehen etwas von Autos — mit handwerklicher Ausbildung im Kfz-Bereich.</p>
    </div>
    <div class="scrub-step" data-at="0.62">
      <p class="lbl">So kaufen Sie bei uns · 3/3</p>
      <h2 class="d2">Fahren.</h2>
      <p>Kundenzufriedenheit durch Qualität ist unser oberstes Gebot.</p>
    </div>
  </div>
</section>

<section class="sec sec-notte">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl lbl--lit rv">02 — Woran wir uns messen</p>
    </div>
    <div class="cards">
      <div class="card rv"><h3>Alle Fabrikate</h3>
        <p>Gepflegte Gebrauchtwagen aller Marken — als freier, unabhängiger
        Händler wählen wir die Fahrzeuge aus, nicht der Hersteller.</p>
        <span class="micro">Frei · unabhängig</span></div>
      <div class="card rv" data-d="1"><h3>Familienunternehmen</h3>
        <p>Langjährige Erfahrung im Gebrauchtwagenhandel — und als Kaufleute
        selbstverständlich mit handwerklicher Ausbildung im Kfz-Bereich.</p>
        <span class="micro">Wir verstehen etwas von Autos</span></div>
      <div class="card rv" data-d="2"><h3>Qualität als Gebot</h3>
        <p>Kundenzufriedenheit durch Qualität ist unser oberstes Gebot —
        deshalb gibt sich die kleine Firma große Mühe.</p>
        <span class="micro">Unser oberstes Gebot</span></div>
    </div>
  </div>
</section>

<div class="marquee" aria-hidden="true">
  <div class="mq-track"><span>Gepflegte Gebrauchtwagen</span><span>Alle Fabrikate</span><span>Alt Mölln</span><span>Abfahrt Mölln Süd</span><span>Nähe Hamburg</span></div>
</div>

<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <p class="lbl lbl--lit rv">03 — Stimmen</p>
      <p class="micro rv" data-d="1"><a href="{BEWERT}" target="_blank" rel="noopener">Sinngemäß aus mobile.de-Bewertungen →</a></p>
    </div>
    <div class="quote-row">
      <div class="quote rv"><q>Ein Autohändler mit Herz — er nimmt sich richtig Zeit.</q>
        <span class="micro">mobile.de-Bewertung · sinngemäß</span></div>
      <div class="quote rv" data-d="1"><q>Grundehrlich — ein Händler alter Schule.</q>
        <span class="micro">mobile.de-Bewertung · sinngemäß</span></div>
      <div class="quote rv" data-d="2"><q>Auch nach dem Kauf freundlich und erreichbar.</q>
        <span class="micro">mobile.de-Bewertung · sinngemäß</span></div>
    </div>
  </div>
</section>

<section class="panel">
  <div class="panel-media"><img class="plx" data-plx="0.06" src="assets/img/key-still.jpg" alt=""></div>
  <div class="panel-inner">
    <p class="lbl rv">Ihr nächstes Auto</p>
    <h2 class="d2 split">Der Schlüssel liegt bereit.</h2>
    <div class="rv" data-d="1" style="display:flex;gap:32px;justify-content:center;margin-top:20px">
      <a class="cta-arrow" href="{MOBILE}" target="_blank" rel="noopener">Bestand auf mobile.de</a>
      <a class="btn-line" href="kontakt.html">Anfahrt &amp; Kontakt</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# FAHRZEUGE
# ==================================================================
PAGES["fahrzeuge.html"] = head(
    "Fahrzeuge — das auto · Gerd Wischnat",
    "Gepflegte Gebrauchtwagen aller Fabrikate in Alt Mölln — der aktuelle "
    "Bestand von das auto Gerd Wischnat auf mobile.de."
) + header("fahrzeuge.html") + f"""<section class="hero hero--page">
  <div class="hero-media">
    <video muted loop autoplay playsinline data-webm="assets/video/hof.webm"
      data-mp4="assets/video/hof.mp4" poster="assets/img/hof-still.jpg"></video>
  </div>
  <div class="hero-inner">
    <p class="hero-kicker rv">Fahrzeuge</p>
    <h1 class="d1 split">Gepflegte Gebrauchtwagen aller Fabrikate</h1>
    <p class="lead rv" data-d="1">Eine breite Auswahl an Fahrzeugen — ausgesucht,
    geprüft und gepflegt.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec">
  <div class="wrap wrap--narrow" style="text-align:center">
    <p class="lbl lbl--lit rv">Aktueller Bestand</p>
    <h2 class="d2 split" style="margin:16px 0">Unser Bestand — tagesaktuell auf mobile.de</h2>
    <p class="rv" data-d="1" style="max-width:560px;margin-inline:auto">Jedes Fahrzeug mit Fotos,
    Ausstattung und Preis. Was Sie dort sehen, steht bei uns auf dem Hof in Alt Mölln —
    kommen Sie gern vorbei und sehen Sie es sich in Ruhe an.</p>
    <div class="rv" data-d="2" style="margin-top:28px">
      <a class="cta-arrow" href="{MOBILE}" target="_blank" rel="noopener">Zum Bestand auf mobile.de</a>
    </div>
    <!-- [PLATZHALTER: Alternativ mobile.de-Bestands-Widget/iFrame des Haendlers
         hier einbetten — Zugangsdaten bzw. Widget-Code vom Betreiber noetig] -->
    <hr class="hairline" style="margin:48px 0">
    <div class="flist rv" style="text-align:left">
      <div><b>Besichtigung</b><span>Energiestraße 2 · 23881 Alt Mölln · Abfahrt Mölln Süd</span></div>
      <div><b>Beratung</b><span>Telefon (04542) 84 36 00 · Mobil (0160) 8000520</span></div>
      <div><b>Bewertungen</b><span><a href="{BEWERT}" target="_blank" rel="noopener">4,8 / 5 aus 71 Bewertungen auf mobile.de →</a></span></div>
    </div>
  </div>
</section>

<section class="panel">
  <div class="panel-media"><img class="plx" data-plx="0.06" src="assets/img/studio-still.jpg" alt=""></div>
  <div class="panel-inner">
    <p class="lbl rv">Nicht das Richtige dabei?</p>
    <h2 class="d2 split">Sagen Sie uns, was Sie suchen.</h2>
    <div class="rv" data-d="1" style="margin-top:20px">
      <a class="cta-arrow" href="kontakt.html">Kontakt aufnehmen</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# ÜBER UNS
# ==================================================================
PAGES["ueber.html"] = head(
    "Über uns — das auto · Gerd Wischnat",
    "Familienunternehmen mit langjähriger Erfahrung im Gebrauchtwagenhandel — "
    "das auto Gerd Wischnat in Alt Mölln, seit 1956."
) + header("ueber.html") + f"""<section class="hero hero--page">
  <div class="hero-media"><img src="assets/img/echt-hof.jpg" alt="Betriebsgelände von das auto Gerd Wischnat in Alt Mölln" fetchpriority="high"></div>
  <div class="hero-inner">
    <p class="hero-kicker rv">Über uns</p>
    <h1 class="d1 split">Unser Unternehmen besteht seit 1956.</h1>
    <p class="lead rv" data-d="1">Ein Familienunternehmen — seit 1975 im Gebrauchtwagenhandel.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="chapter">
  <div class="ch-media"><div><img class="plx" data-plx="0.07" src="assets/img/hof-still.jpg" alt="Fahrzeugreihe bei Nacht"></div></div>
  <div class="ch-body">
    <p class="lbl lbl--lit rv">01 — Wer wir sind</p>
    <h2 class="d2 split">Familienunternehmen. Kfz-Handwerk. Erfahrung.</h2>
    <p class="rv" data-d="1">Wir sind ein Familienunternehmen mit einer langjährigen Erfahrung
    im Gebrauchtwagenhandel. Auch als Kaufleute haben wir selbstverständlich eine
    handwerkliche Ausbildung im Kfz-Bereich absolviert.</p>
    <p class="rv" data-d="2"><strong>Wir verstehen etwas von Autos.</strong></p>
    <p class="rv" data-d="3">Kundenzufriedenheit durch Qualität ist unser oberstes Gebot!</p>
  </div>
</section>

<section class="chapter flip">
  <div class="ch-media"><div><img class="plx" data-plx="0.07" src="assets/img/key-still.jpg" alt=""></div></div>
  <div class="ch-body">
    <p class="lbl lbl--lit rv">02 — Wie wir arbeiten</p>
    <h2 class="d2 split">Klein. Gründlich. Alte Schule.</h2>
    <div class="flist rv" data-d="1">
      <div><b>Auswahl</b><span>Gepflegte Gebrauchtwagen aller Fabrikate — frei und unabhängig ausgesucht</span></div>
      <div><b>Prüfung</b><span>Mit handwerklicher Kfz-Ausbildung — nicht nur mit Kaufmannsblick</span></div>
      <div><b>Beratung</b><span>Persönlich, ehrlich, ohne Verkaufsshow — auch nach dem Kauf erreichbar</span></div>
    </div>
    <p class="rv" data-d="2"><a class="cta-arrow" href="kontakt.html">Besuchen Sie uns in Alt Mölln</a></p>
  </div>
</section>

<section class="panel">
  <div class="panel-media">
    <video muted loop autoplay playsinline data-webm="assets/video/studio.webm"
      data-mp4="assets/video/studio.mp4" poster="assets/img/studio-still.jpg" class="plx" data-plx="0.05"></video>
  </div>
  <div class="panel-inner">
    <p class="lbl rv">Eine kleine Firma, die sich große Mühe gibt</p>
    <h2 class="d2 split">Finden Sie Ihr ideales Auto.</h2>
    <div class="rv" data-d="1" style="margin-top:20px">
      <a class="cta-arrow" href="{MOBILE}" target="_blank" rel="noopener">Aktueller Bestand</a>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# KONTAKT
# ==================================================================
PAGES["kontakt.html"] = head(
    "Kontakt & Anfahrt — das auto · Gerd Wischnat",
    "das auto Gerd Wischnat: Energiestraße 2, 23881 Alt Mölln — Abfahrt "
    "Mölln Süd, Nähe Hamburg. Telefon (04542) 84 36 00."
) + header("kontakt.html") + f"""<section class="hero hero--page">
  <div class="hero-media">
    <video muted loop autoplay playsinline data-webm="assets/video/hof.webm"
      data-mp4="assets/video/hof.mp4" poster="assets/img/hof-still.jpg"></video>
  </div>
  <div class="hero-inner">
    <p class="hero-kicker rv">Kontakt &amp; Anfahrt</p>
    <h1 class="d1 split">Besuchen Sie uns in Alt Mölln.</h1>
    <p class="lead rv" data-d="1">Abfahrt Mölln Süd — Nähe Hamburg.</p>
  </div>
  <div class="scroll-hint" aria-hidden="true"><i></i></div>
</section>

<section class="sec">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl lbl--lit rv">01 — Kontakt</p>
    </div>
    <div class="flist rv">
      <div><b>Anschrift</b><span>„das auto" · Gerd Wischnat<br>Energiestraße 2 · D-23881 Alt Mölln</span></div>
      <div><b>Anfahrt</b><span>Abfahrt Mölln Süd · Nähe Hamburg</span></div>
      <div><b>Telefon</b><span><a href="tel:+494542843600">(04542) 84 36 00</a></span></div>
      <div><b>Mobil</b><span><a href="tel:+491608000520">(0160) 8000520</a></span></div>
      <div><b>Fax</b><span>(04542) 84 36 02</span></div>
      <div><b>E-Mail</b><span><a href="mailto:wischnat.altmoelln@t-online.de">wischnat.altmoelln@t-online.de</a></span></div>
      <div><b>Bestand</b><span><a href="{MOBILE}" target="_blank" rel="noopener">home.mobile.de/DASAUTOGERDWISCHNAT →</a></span></div>
    </div>
  </div>
</section>

<section class="sec sec-notte">
  <div class="wrap wrap--narrow">
    <div class="sec-head">
      <p class="lbl lbl--lit rv">02 — Öffnungszeiten</p>
      <p class="micro rv" data-d="1">Termine außerhalb nach Absprache</p>
    </div>
    <!-- Quelle Oeffnungszeiten: Branchenverzeichnisse (oeffnungszeitenbuch.de / 11880.com)
         — vor Livegang vom Betreiber bestaetigen lassen -->
    <div class="flist rv">
      <div><b>Montag – Freitag</b><span>09:00 – 13:00 Uhr · 14:30 – 18:00 Uhr</span></div>
      <div><b>Samstag</b><span>10:00 – 13:00 Uhr</span></div>
    </div>
  </div>
</section>

<section class="panel">
  <div class="panel-media"><img class="plx" data-plx="0.05" src="assets/img/echt-hof.jpg" alt=""></div>
  <div class="panel-inner">
    <p class="lbl rv">Wir freuen uns auf Sie</p>
    <h2 class="d2 split">Bis bald auf dem Hof.</h2>
  </div>
</section>
""" + FOOTER

# ==================================================================
# IMPRESSUM (wörtlich aus dem Original übernommen)
# ==================================================================
PAGES["impressum.html"] = head(
    "Impressum — das auto · Gerd Wischnat",
    "Impressum von das auto, Gerd Wischnat, Alt Mölln."
) + header("") + """<section class="hero hero--page" style="min-height:44svh">
  <div class="hero-media"><img src="assets/img/studio-still.jpg" alt=""></div>
  <div class="hero-inner"><h1 class="d1 split">Impressum</h1></div>
</section>
<section class="sec">
  <div class="wrap wrap--narrow">
    <div class="flist rv">
      <div><b>Firma</b><span>„das auto"</span></div>
      <div><b>Geschäftsführer</b><span>Gerd Wischnat</span></div>
      <div><b>Anschrift</b><span>Energiestraße 2 · D-23881 Alt Mölln<br>Abfahrt Mölln Süd · Nähe Hamburg</span></div>
      <div><b>Telefon</b><span>(04542) 84 36 00</span></div>
      <div><b>Mobil</b><span>(0160) 8000520</span></div>
      <div><b>Fax</b><span>(04542) 84 36 02</span></div>
      <div><b>Domain</b><span>www.das-auto-wischnat.de</span></div>
      <div><b>E-Mail</b><span>wischnat.altmoelln@t-online.de</span></div>
      <div><b>Steuer-Nr.</b><span>27 187 10318 · Finanzamt Ratzeburg</span></div>
    </div>
  </div>
</section>
""" + FOOTER

# ==================================================================
# DATENSCHUTZ (statische Site — Standardtext, zur Pruefung markiert)
# ==================================================================
PAGES["datenschutz.html"] = head(
    "Datenschutzerklärung — das auto · Gerd Wischnat",
    "Datenschutzerklärung von das auto, Gerd Wischnat, Alt Mölln."
) + header("") + """<section class="hero hero--page" style="min-height:44svh">
  <div class="hero-media"><img src="assets/img/key-still.jpg" alt=""></div>
  <div class="hero-inner"><h1 class="d1 split">Datenschutz</h1></div>
</section>
<section class="sec">
  <div class="wrap wrap--narrow" style="text-transform:none">
    <div class="sec-head"><p class="lbl lbl--lit rv">Datenschutzerklärung</p></div>
    <p class="rv"><strong>Verantwortlicher:</strong> „das auto", Gerd Wischnat,
    Energiestraße 2, D-23881 Alt Mölln, Telefon (04542) 84 36 00,
    E-Mail wischnat.altmoelln@t-online.de.</p>
    <p class="rv" data-d="1" style="margin-top:16px"><strong>Hosting / Server-Logfiles:</strong> Beim Aufruf dieser
    Website verarbeitet der Hosting-Anbieter automatisch technische Zugriffsdaten
    (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browsertyp) in sogenannten
    Server-Logfiles. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f
    DSGVO zum Zweck des sicheren und stabilen Betriebs.</p>
    <p class="rv" data-d="2" style="margin-top:16px"><strong>Keine Cookies, kein Tracking:</strong> Diese Website
    verwendet keine Cookies, keine Analyse-Tools und keine Werbe-Dienste.</p>
    <p class="rv" style="margin-top:16px"><strong>Schriftarten:</strong> Diese Website bindet Schriftarten von
    Google Fonts (Google Ireland Ltd.) ein. Beim Seitenaufruf wird Ihre IP-Adresse an
    Google übermittelt, um die Schriftdateien auszuliefern (Art. 6 Abs. 1 lit. f DSGVO).
    Details: https://policies.google.com/privacy.</p>
    <p class="rv" style="margin-top:16px"><strong>Externe Links:</strong> Diese Website verlinkt auf das
    Fahrzeugangebot bei mobile.de. Beim Aufruf externer Seiten gelten die
    Datenschutzhinweise des jeweiligen Anbieters.</p>
    <p class="rv" style="margin-top:16px"><strong>Kontaktaufnahme:</strong> Bei Kontakt per Telefon oder E-Mail
    werden Ihre Angaben zur Bearbeitung der Anfrage verarbeitet (Art. 6 Abs. 1
    lit. b DSGVO) und gelöscht, sobald sie nicht mehr erforderlich sind.</p>
    <p class="rv" style="margin-top:16px"><strong>Ihre Rechte:</strong> Sie haben das Recht auf Auskunft,
    Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
    sowie Widerspruch (Art. 15–21 DSGVO) und das Recht auf Beschwerde bei einer
    Aufsichtsbehörde (Art. 77 DSGVO) — zuständig ist das Unabhängige Landeszentrum
    für Datenschutz Schleswig-Holstein (ULD).</p>
    <p class="micro rv" style="margin-top:24px">[PLATZHALTER: Rechtstext vor Livegang juristisch prüfen lassen —
    die Original-Site lädt ihre Erklärung dynamisch, der Wortlaut war nicht scanbar.]</p>
  </div>
</section>
""" + FOOTER


if __name__ == "__main__":
    os.makedirs(SITE, exist_ok=True)
    for fname, html in PAGES.items():
        with open(os.path.join(SITE, fname), "w", encoding="utf-8") as f:
            f.write(html)
        print("wrote", fname, len(html), "bytes")
