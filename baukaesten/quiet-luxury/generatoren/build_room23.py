# -*- coding: utf-8 -*-
"""Generiert die mehrseitige Room23-Tattoo-Website (Fineline / Quiet Luxury).
Quelle: Instagram-Recherche @room23.tattoo.art (+ @sophia_ivy.art, @jessi.art.tattoo).
Unbelegtes ist als [PLATZHALTER] markiert."""
import os
ROOT = "/home/user/Web-Projekte/room23-tattoo"

NAV = [("index.html","Start"),("stile.html","Stile"),("team.html","Team"),
       ("galerie.html","Galerie"),("studio.html","Studio")]

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
  <link rel="icon" type="image/jpeg" href="assets/img/logo.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
{body}
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
'''

# --- Fineline-Blumen-Monogramm: Stiel & Blaetter in Ink, Bluete in Bronze ---
MONOGRAM = '''<svg class="mono-svg" viewBox="0 0 128 128" fill="none" aria-hidden="true" focusable="false">
          <path class="m-ink" d="M64 118 C 63 96, 61 72, 64 42"/>
          <path class="m-ink" d="M63 94 C 50 90, 42 80, 40 66"/>
          <path class="m-ink" d="M63 76 C 75 73, 83 64, 85 50"/>
          <path class="m-gold" d="M64 40 C 57 32, 58 20, 64 12"/>
          <path class="m-gold" d="M64 40 C 71 32, 70 20, 64 12"/>
          <path class="m-gold" d="M64 38 C 55 37, 49 30, 47 22"/>
          <path class="m-gold" d="M64 38 C 73 37, 79 30, 81 22"/>
        </svg>'''

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
      <a class="brand" href="index.html" aria-label="Room23 – Startseite">
        <img class="logo-img" src="assets/img/logo.jpg" alt="" width="150" height="150">
        <span class="brand-word">Room 23</span>
        <span class="brand-sub">Tattoo · Art</span>
      </a>
      <a class="header-cta" href="termin.html">
        <span>Termin anfragen</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </header>

  <div class="nav-overlay" id="nav-overlay" aria-hidden="true">
    <div class="nav-overlay-inner">
      <nav class="main-nav" aria-label="Hauptnavigation">
        <ul>
{items}        <li class="nav-contact-li"><a href="termin.html"><span class="nl-num">·</span><span class="nl-label">Termin anfragen</span></a></li>
        </ul>
        <div class="nav-overlay-foot">
          <span><a href="https://www.instagram.com/room23.tattoo.art/" rel="noopener">@room23.tattoo.art</a></span>
          <span><a href="impressum.html">Impressum</a> &nbsp;·&nbsp; <a href="datenschutz.html">Datenschutz</a></span>
        </div>
      </nav>
      <div class="nav-visual" aria-hidden="true">
        <img src="assets/img/werk-floral-1.jpg" alt="" loading="lazy">
      </div>
    </div>
  </div>

  <main id="main">
'''

FOOTER = '''
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <span class="footer-lockup"><img class="logo-img" src="assets/img/logo.jpg" alt="" width="150" height="150"><span class="bmark">Room 23</span></span>
          <p>Privates Tattoo-Studio in der Lübecker Altstadt – Fineline, Florals und Motive mit Geschichte. Ruhig, persönlich, mit Liebe zum feinen Strich.</p>
        </div>
        <div>
          <h4>Studio</h4>
          <ul>
            <li><a href="stile.html">Stile</a></li>
            <li><a href="team.html">Team</a></li>
            <li><a href="galerie.html">Galerie</a></li>
            <li><a href="studio.html">Studio</a></li>
          </ul>
        </div>
        <div>
          <h4>Termine</h4>
          <ul>
            <li><a href="termin.html">Termin anfragen</a></li>
            <li><a href="mailto:jaquelinefrehley@gmail.com">jaquelinefrehley@gmail.com</a></li>
            <li>WhatsApp: +49 4521 8451521</li>
            <li>Buchung: <a href="https://jessiart.tatme.com/" rel="noopener">jessiart.tatme.com</a></li>
          </ul>
        </div>
        <div>
          <h4>Folgen</h4>
          <ul>
            <li><a href="https://www.instagram.com/room23.tattoo.art/" rel="noopener">@room23.tattoo.art</a></li>
            <li><a href="https://www.instagram.com/sophia_ivy.art/" rel="noopener">@sophia_ivy.art</a></li>
            <li><a href="https://www.instagram.com/jessi.art.tattoo/" rel="noopener">@jessi.art.tattoo</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> Room 23 · Tattoo Art · Mühlenstraße 83 · 23552 Lübeck</span>
        <span><a href="impressum.html">Impressum</a> &nbsp;·&nbsp; <a href="datenschutz.html">Datenschutz</a></span>
      </div>
    </div>
  </footer>

  <script src="js/script.js"></script>
</body>
</html>
'''

def page_hero_cine(slug, crumb, h1, lead, fade="paper"):
    extra = " fade-night" if fade == "night" else ""
    return f'''
    <section class="page-hero page-hero-cine{extra}">
      <div class="hero-bg" aria-hidden="true">
        <img src="assets/hero/{slug}-poster.jpg" alt="">
        <div class="hero-veil"></div>
      </div>
      <div class="container">
        <p class="breadcrumbs"><a href="index.html">Start</a> &nbsp;/&nbsp; {crumb}</p>
        <h1>{h1}</h1>
        <p class="lead">{lead}</p>
      </div>
    </section>
'''

# --- Grosse selbstzeichnende Fineline-Blume (Index-Hero) ---
FLOWER = '''<svg class="flower-svg icon-draw" data-draw viewBox="0 0 300 420" fill="none" aria-hidden="true">
          <path class="dl" d="M150 400 C 146 340, 142 280, 150 190"/>
          <path class="dl" d="M148 330 C 116 322, 96 300, 90 266"/>
          <path class="dl" d="M149 268 C 180 262, 200 244, 206 212"/>
          <path class="dl" d="M90 266 C 104 270, 118 280, 126 294"/>
          <path class="dl" d="M206 212 C 192 216, 178 226, 170 240"/>
          <path class="dl dl-gold" d="M150 186 C 128 168, 124 132, 150 106 C 176 132, 172 168, 150 186 Z"/>
          <path class="dl dl-gold" d="M150 182 C 120 180, 102 158, 100 126"/>
          <path class="dl dl-gold" d="M150 182 C 180 180, 198 158, 200 126"/>
          <path class="dl dl-gold" d="M150 104 C 146 90, 146 76, 150 62"/>
          <circle class="dl dl-gold" cx="150" cy="54" r="4"/>
          <circle class="dl" cx="118" cy="112" r="3"/>
          <circle class="dl" cx="182" cy="112" r="3"/>
        </svg>'''

# --- Stil-Icons (zeichnen sich beim Scrollen) ---
def ico(inner):
    return ('<div class="fl-ico icon-draw" data-draw aria-hidden="true">'
            '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg></div>')

ICO_FINELINE = ico('<path class="dl" d="M10 54 C 26 40, 30 24, 32 8"/><path class="dl" d="M32 8 C 36 22, 42 30, 54 34"/><path class="dl dl-gold" d="M20 44 C 28 42, 34 36, 36 28"/>')
ICO_FLORAL   = ico('<path class="dl" d="M32 56 C 30 44, 30 34, 32 22"/><path class="dl dl-gold" d="M32 22 C 24 16, 24 8, 32 4 C 40 8, 40 16, 32 22 Z"/><path class="dl" d="M31 42 C 22 40, 16 34, 15 24"/><path class="dl" d="M33 34 C 42 32, 48 26, 49 16"/>')
ICO_ORNAMENT = ico('<path class="dl" d="M32 6 V58"/><path class="dl dl-gold" d="M32 18 L40 26 L32 34 L24 26 Z"/><circle class="dl" cx="32" cy="10" r="2.5"/><circle class="dl" cx="32" cy="46" r="2.5"/><path class="dl" d="M24 40 H40"/>')
ICO_SCRIPT   = ico('<path class="dl" d="M8 40 C 16 26, 22 26, 24 34 C 26 42, 32 42, 36 32 C 39 25, 45 24, 48 30 C 51 36, 55 36, 58 32"/><path class="dl dl-gold" d="M14 50 H50"/>')
ICO_MICRO    = ico('<circle class="dl" cx="32" cy="30" r="17"/><path class="dl" d="M32 47 V58 M22 55 H42"/><path class="dl dl-gold" d="M26 28 C 28 24, 36 24, 38 28 M25 34 C 29 38, 35 38, 39 34"/>')
ICO_CONCEPT  = ico('<rect class="dl" x="10" y="12" width="34" height="40" rx="2"/><path class="dl" d="M18 24 H36 M18 32 H30"/><path class="dl dl-gold" d="M38 40 C 46 34, 52 36, 54 44 C 50 46, 42 46, 38 40 Z"/>')

# --- Ranken-Linie (Studio) ---
VINE = '''<svg class="wave-svg icon-draw" data-draw viewBox="0 0 240 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path class="dl" d="M6 30 C 40 12, 70 34, 104 22 S 168 10 234 24"/>
          <path class="dl dl-gold" d="M60 22 C 64 16, 70 14, 76 16 M150 20 C 154 14, 160 12, 166 14"/>
        </svg>'''

# --- Briefumschlag mit Bluetenlinie (Termin) ---
MAIL = '''<div class="mail-sig icon-draw" data-draw aria-hidden="true">
          <svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg">
            <rect class="dl" x="16" y="38" width="180" height="92" rx="3"/>
            <path class="dl" d="M16 42l90 56 90-56"/>
            <path class="dl dl-gold" d="M208 84 C 244 74, 266 52, 296 22"/>
            <path class="dl dl-gold" d="M284 34 C 290 28, 294 22, 296 14 M288 40 C 296 38, 302 34, 308 28"/>
          </svg>
        </div>'''

SEAL = '''<div class="seal icon-draw" data-draw aria-hidden="true">
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <circle class="dl dl-gold" cx="40" cy="40" r="36"/>
            <circle class="dl" cx="40" cy="40" r="28" opacity="0.45"/>
            <text class="seal-p" x="40" y="52" text-anchor="middle">§</text>
          </svg>
        </div>'''

PAGES = {}

# ==================================================================== INDEX
PAGES["index.html"] = {
  "title": "Room 23 – Tattoo Art Studio · Fineline & Florals in Ostholstein",
  "desc": "Room 23 ist ein privates Tattoo-Studio in Ostholstein: Fineline, Florals, Ornamente und Motive mit Geschichte – gestochen mit Ruhe, Präzision und Liebe zum Detail.",
  "active": "index.html",
  "body": '''
    <!-- ============ 1 · HERO ============ -->
    <section class="hero hero-cine">
      <div class="hero-bg" aria-hidden="true">
        <img src="assets/hero/index-poster.jpg" alt="">
        <div class="hero-veil"></div>
      </div>
      <div class="container hero-grid">
        <div>
          <p class="eyebrow reveal">Privates Tattoo-Studio · Lübeck</p>
          <h1 class="reveal d1">Kunst, die unter die Haut <em>geht.</em></h1>
          <p class="hero-sub reveal d2">Fineline, Florals und Motive mit Geschichte – gestochen mit Ruhe, Präzision und Liebe zum feinen Strich.</p>
          <div class="hero-actions reveal d3">
            <a class="btn btn-solid" href="termin.html">Termin anfragen</a>
            <a class="btn btn-line" href="galerie.html">Arbeiten ansehen</a>
          </div>
          <div class="trust-row reveal d4">
            <span>Fineline &amp; Floral</span>
            <span>Persönliche Beratung</span>
            <span>Termine nur nach Absprache</span>
          </div>
        </div>
        <div class="wire-wrap reveal d2" style="display:flex;justify-content:center">
          ''' + FLOWER + '''
        </div>
      </div>
      <div class="scroll-cue" aria-hidden="true"><span></span></div>
    </section>

    <!-- ============ 2 · MANIFEST ============ -->
    <section class="section manifest">
      <div class="narrow reveal">
        <div class="rule"></div>
        <p>Not just a space –<br>a feeling of home, a place to express,<br>a moment to <em>connect.</em></p>
        <p style="font-family:var(--sans);font-size:0.72rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted);margin-top:26px">Das Leitbild von Room 23</p>
      </div>
    </section>

    <!-- ============ 2b · STUDIO-BLICK (echte Fotos) ============ -->
    <section class="section-tight">
      <div class="container split reverse" style="align-items:center">
        <div class="split-media figure-wide parallax reveal">
          <img src="assets/img/studio-slogan.jpg" alt="Schaufenster von Room 23 mit dem Leitbild-Schriftzug" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Room 23 · Lübeck</p>
          <h2 class="reveal d1">Mitten in der<br><em>Hansestadt.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Unser Studio liegt in der Mühlenstraße 83 in Lübeck – ein heller, ruhiger Raum, in dem Kunst, Handwerk und ein gutes Gefühl zusammenkommen. Komm vorbei und lass uns über dein Motiv sprechen.</p>
          <p class="reveal d3"><a class="link-gold" href="studio.html">Unser Studio ansehen</a></p>
        </div>
      </div>
    </section>

    <!-- ============ 3 · STILE (Teaser) ============ -->
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow reveal">Unsere Handschrift</p>
        <h2 class="reveal d1" style="max-width:16ch">Fein gezeichnet. Für immer.</h2>
        <div class="chips reveal d2" style="margin-top:36px">
          <span class="chip">Fineline</span><span class="chip">Floral</span><span class="chip">Ornamental</span>
          <span class="chip">Schriftzüge</span><span class="chip">Micro-Realism</span><span class="chip">Realism</span><span class="chip">Concept</span>
        </div>
        <p class="reveal d3" style="margin-top:36px"><a class="link-gold" href="stile.html">Alle Stile im Detail</a></p>
      </div>
    </section>

    <!-- ============ 4 · TEAM (Teaser, dunkel) ============ -->
    <section class="section dark">
      <div class="container">
        <p class="eyebrow reveal">Das Team</p>
        <h2 class="reveal d1">Drei Künstlerinnen.<br>Eine Haltung.</h2>
        <div class="gallery" style="margin-top:52px">
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/img/werk-floral-3.jpg" alt="Florales Fineline-Tattoo von Sophia" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Fineline · Floral</span><h3>Sophia</h3><p>Blumen mit Geschichte – fein wie ein Bleistiftstrich. <span style="color:var(--muted-2)">@sophia_ivy.art</span></p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/img/werk-jessi.jpg" alt="Tattoo von Jessi" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Fineline · Realism</span><h3>Jessi</h3><p>Von der Portraitzeichnung zur Nadel – mit ganzem Herzen. <span style="color:var(--muted-2)">@jessi.art.tattoo</span></p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/img/werk-ornament.jpg" alt="Ornamentales Fineline-Tattoo" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Ornamental</span><h3>Jaqueline</h3><p>Feine Ornamente &amp; klare Linien. [PLATZHALTER: Profil bestätigen]</p></div>
          </article>
        </div>
        <p class="reveal" style="margin-top:40px"><a class="link-gold" href="team.html">Das Team kennenlernen</a></p>
      </div>
    </section>

    <!-- ============ 5 · GALERIE (Teaser) ============ -->
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow reveal">Aus dem Studio</p>
        <h2 class="reveal d1">Arbeiten, die bleiben.</h2>
        <div class="gallery" style="margin-top:52px">
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/img/werk-floral-1.jpg" alt="Florales Seitenstück mit Schriftzug „take a deep breath“" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Floral · Schriftzug</span><h3>take a deep breath</h3><p>Wildblumenranke mit feiner Schreibschrift.</p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/img/werk-schrift.jpg" alt="Kirschblüten mit japanischem Schriftzug" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Fineline · Schriftzug</span><h3>Kirschblüten</h3><p>„Die schönsten Jahre des Lebens“ – zart wie ein Blütenblatt.</p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/img/werk-micro.jpg" alt="Micro-Realism Leopard" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Micro-Realism</span><h3>Leopard</h3><p>Realismus im Kleinstformat.</p></div>
          </article>
        </div>
        <p class="reveal" style="margin-top:40px"><a class="link-gold" href="galerie.html">Zur Galerie</a></p>
      </div>
    </section>

    <!-- ============ 6 · CTA ============ -->
    <section class="section dark cta-final">
      <div class="narrow">
        <p class="eyebrow reveal">Der nächste Schritt</p>
        <h2 class="reveal d1">Erzähl uns von deinem <em>Motiv.</em></h2>
        <p class="reveal d2"><a class="btn btn-solid" href="termin.html">Termin anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== STILE
PAGES["stile.html"] = {
  "title": "Stile – Fineline, Floral, Ornamental, Realism | Room 23 Tattoo",
  "desc": "Die Stile von Room 23: Fineline, Florals, Ornamente, Schriftzüge, Micro-Realism, Realism und Concept-Tattoos – und wie dein Termin abläuft.",
  "active": "stile.html",
  "body": page_hero_cine("stile", "Stile", "Der feine <em>Strich.</em>",
    "Jedes Motiv beginnt mit einer Idee – und wird bei uns zu einer Linie, die bleibt. Das sind unsere Handschriften.") + '''
    <section class="section-tight">
      <div class="container">
        <div class="dotline" data-draw aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <ul class="flist">
          <li class="reveal">
            <span class="fl-idx">01</span>
            ''' + ICO_FINELINE + '''
            <div><h3>Fineline</h3><p>Hauchzarte Linien, gestochen mit feinster Nadel – Motive, die aussehen wie mit dem Bleistift gezeichnet. Unsere Kernkompetenz, vom Mini-Motiv bis zum großen Seitenstück.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">02</span>
            ''' + ICO_FLORAL + '''
            <div><h3>Floral</h3><p>Wildblumen, Kirschblüten, Bouquets: botanische Motive mit Bedeutung – oft für Menschen, die einem am Herzen liegen. Jede Blume erzählt eine Geschichte.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">03</span>
            ''' + ICO_ORNAMENT + '''
            <div><h3>Ornamental</h3><p>Feine Ornamente, Punkte und abstrakte Linien – Schmuck, der nicht abgelegt wird. Vom zarten Nackenornament bis zum Tattoo-Armband.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">04</span>
            ''' + ICO_SCRIPT + '''
            <div><h3>Schriftzüge</h3><p>Worte, die bleiben sollen – in feiner Schreibschrift gesetzt: Namen, Zitate, Lebensmottos. Typografie mit Gefühl.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">05</span>
            ''' + ICO_MICRO + '''
            <div><h3>Micro-Realism &amp; Realism</h3><p>Realistische Motive im kleinen Format – Tiere, Portraits, Erinnerungen. Detailarbeit, die man aus nächster Nähe betrachten möchte.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">06</span>
            ''' + ICO_CONCEPT + '''
            <div><h3>Concept</h3><p>Dein Gedanke, unsere Zeichnung: individuelle Konzepte, entworfen aus deinen Ideen, Bildern und Geschichten – es entsteht ein Unikat, das es nur einmal gibt.</p></div>
          </li>
        </ul>
      </div>
    </section>

    <section class="section" style="background:var(--paper-2)">
      <div class="container">
        <p class="eyebrow reveal">So läuft dein Termin</p>
        <h2 class="reveal d1">Vom ersten Gedanken zur letzten Linie</h2>
        <div class="tl" data-timeline style="margin-top:52px">
          <span class="tl-line" aria-hidden="true"></span>
          <div class="layers">
          <div class="layer reveal"><span class="layer-num">1</span><div class="layer-body"><h3>Anfrage</h3><p>Schreib uns dein Motiv, die Körperstelle und ungefähre Größe – per Formular, E-Mail oder WhatsApp. Gern mit Referenzbildern.</p></div><span class="layer-tag">Idee</span></div>
          <div class="layer reveal d1"><span class="layer-num">2</span><div class="layer-body"><h3>Beratung &amp; Design</h3><p>Wir besprechen dein Motiv persönlich und zeichnen einen individuellen Entwurf – so lange, bis er sich richtig anfühlt.</p></div><span class="layer-tag">Entwurf</span></div>
          <div class="layer reveal d2"><span class="layer-num">3</span><div class="layer-body"><h3>Der Termin</h3><p>In ruhiger Atmosphäre, mit Zeit und Sorgfalt: Wir arbeiten mit sterilem Einwegmaterial und feinsten Nadeln. [PLATZHALTER: Hinweise zu Anzahlung/Vorbereitung]</p></div><span class="layer-tag">Stechen</span></div>
          <div class="layer reveal d3"><span class="layer-num">4</span><div class="layer-body"><h3>Aftercare</h3><p>Du bekommst eine klare Pflegeanleitung mit – und kannst dich bei Fragen jederzeit melden. Ein Nachstech-Termin ist nach Absprache möglich. [PLATZHALTER: Aftercare-Details]</p></div><span class="layer-tag">Pflege</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Welcher Stil passt zu deiner <em>Geschichte?</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="termin.html">Termin anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== TEAM
PAGES["team.html"] = {
  "title": "Team – Sophia, Jessi & Jaqueline | Room 23 Tattoo",
  "desc": "Das Team von Room 23: Sophia (Fineline & Floral), Jessi (Fineline & Realism) und Jaqueline – drei Künstlerinnen, eine Haltung.",
  "active": "team.html",
  "body": page_hero_cine("team", "Team", "Drei Künstlerinnen.<br>Eine <em>Haltung.</em>",
    "Bei Room 23 sticht nicht irgendwer dein Motiv – sondern eine Künstlerin, die deine Geschichte versteht.") + '''
    <section class="section-tight">
      <div class="container split" style="align-items:start">
        <div class="split-media figure-tall parallax reveal">
          <img src="assets/img/werk-floral-3.jpg" alt="Florales Fineline-Tattoo von Sophia" loading="lazy">
        </div>
        <div>
          <img class="portrait reveal" src="assets/team/sophia.jpg" alt="Portrait von Sophia" loading="lazy">
          <p class="eyebrow reveal">Fineline · Floral · Resident Artist</p>
          <h2 class="reveal d1">Sophia</h2>
          <svg class="swash icon-draw" data-draw viewBox="0 0 220 30" fill="none" aria-hidden="true"><path class="dl dl-gold" d="M4 22 C 60 4, 122 5, 152 15 C 172 22, 194 21, 216 11 M152 15 C 141 19, 133 23, 129 27"/></svg>
          <p class="reveal d2" style="color:var(--muted)">Sophias Handschrift sind Blumen: Wildblumenranken, Kirschblüten, Bouquets – hauchzart gestochen, oft als Erinnerung an Menschen, die man liebt. „Für jedes Kind eine Blume, für jede Blume eine Geschichte“ – so beschreibt sie eine ihrer Arbeiten, und so arbeitet sie: Jedes Motiv trägt Bedeutung.</p>
          <p class="reveal d3" style="color:var(--muted)">Neben Florals gehören feine Ornamente, Schriftzüge und Micro-Realism zu ihrem Repertoire – von „Herr der Ringe“-Armbändern bis zum Leoparden im Kleinstformat.</p>
          <p class="reveal d4"><a class="link-gold" href="https://www.instagram.com/sophia_ivy.art/" rel="noopener">@sophia_ivy.art</a> &nbsp;·&nbsp; <a class="link-gold" href="https://tatme.com/sophiaivy.art" rel="noopener">Online buchen</a></p>
        </div>
      </div>
    </section>

    <section class="section" style="background:var(--paper-2)">
      <div class="container split reverse" style="align-items:start">
        <div class="split-media figure-tall parallax reveal">
          <img src="assets/img/werk-jessi.jpg" alt="Tattoo-Arbeit von Jessi" loading="lazy">
        </div>
        <div>
          <img class="portrait reveal" src="assets/team/jessi.jpg" alt="Portrait von Jessi" loading="lazy">
          <p class="eyebrow reveal">Gründerin · Fineline · Realism</p>
          <h2 class="reveal d1">Jessi</h2>
          <svg class="swash icon-draw" data-draw viewBox="0 0 220 30" fill="none" aria-hidden="true"><path class="dl dl-gold" d="M4 22 C 60 4, 122 5, 152 15 C 172 22, 194 21, 216 11 M152 15 C 141 19, 133 23, 129 27"/></svg>
          <p class="reveal d2" style="color:var(--muted)">Jessi hat Room 23 gegründet – ihr Weg zur Nadel war ein Umweg mit Anlauf: Ausbildung im Einzelhandel, viele Jahre im Modeladen – und daneben immer die Kunst. 2017 begann sie, Portraitzeichnungen anzubieten; im August 2022 stach sie ihr erstes Tattoo. „Es war, als hätte jemand einen Schalter umgelegt.“</p>
          <p class="reveal d3" style="color:var(--muted)">Heute überträgt sie ihre zeichnerische Präzision auf die Haut – von realistischen Motiven bis zu feinen Linien. Was Kund:innen ihr schicken, macht sie zu etwas Eigenem.</p>
          <p class="reveal d4"><a class="link-gold" href="https://www.instagram.com/jessi.art.tattoo/" rel="noopener">@jessi.art.tattoo</a> &nbsp;·&nbsp; <a class="link-gold" href="https://jessiart.tatme.com/" rel="noopener">Online buchen</a></p>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container split" style="align-items:start">
        <div class="split-media figure-tall parallax reveal">
          <img src="assets/img/werk-ornament.jpg" alt="Ornamentales Fineline-Tattoo am Hals" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Ornamental · Fineline</p>
          <h2 class="reveal d1">Jaqueline</h2>
          <svg class="swash icon-draw" data-draw viewBox="0 0 220 30" fill="none" aria-hidden="true"><path class="dl dl-gold" d="M4 22 C 60 4, 122 5, 152 15 C 172 22, 194 21, 216 11 M152 15 C 141 19, 133 23, 129 27"/></svg>
          <p class="reveal d2" style="color:var(--muted)">Feine Ornamente und abstrakte Linien – zart gesetzt, wie gezeichneter Schmuck. Termine bei Jaqueline lassen sich direkt per E-Mail oder WhatsApp anfragen.</p>
          <p class="reveal d3" style="color:var(--muted)">[PLATZHALTER: Vita &amp; Schwerpunkte von Jaqueline ergänzen und Instagram-Profil bestätigen]</p>
          <p class="reveal d4"><a class="link-gold" href="mailto:jaquelinefrehley@gmail.com">jaquelinefrehley@gmail.com</a></p>
          <p class="reveal d4" style="color:var(--muted-2);font-size:0.9rem;margin-top:14px">[ECHTES FOTO EINSETZEN: Portrait Jaqueline]</p>
        </div>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Finde die Künstlerin für dein <em>Motiv.</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="termin.html">Termin anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== GALERIE
PAGES["galerie.html"] = {
  "title": "Galerie – Arbeiten aus dem Studio | Room 23 Tattoo",
  "desc": "Ausgewählte Arbeiten von Room 23: Florals, Fineline, Ornamente, Schriftzüge und Micro-Realism – direkt aus dem Studio.",
  "active": "galerie.html",
  "body": page_hero_cine("galerie", "Galerie", "Arbeiten, die <em>bleiben.</em>",
    "Eine Auswahl aus dem Studio – jedes Stück ein Unikat. Mehr Arbeiten findest du auf Instagram.") + '''
    <section class="section-tight">
      <div class="container">
        <div class="gallery tilt">
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/img/werk-floral-1.jpg" alt="Florales Seitenstück mit Schriftzug „take a deep breath“" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Floral · Schriftzug</span><h3>take a deep breath</h3><p>Wildblumenranke mit feiner Schreibschrift.</p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/img/werk-floral-2.jpg" alt="Florales Fineline-Tattoo" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Floral</span><h3>Blumen mit Geschichte</h3><p>Für jedes Kind eine Blume – Erinnerung unter der Haut.</p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/img/werk-floral-3.jpg" alt="Florales Tattoo" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Floral</span><h3>In voller Blüte</h3><p>Botanische Linien, hauchzart gesetzt.</p></div>
          </article>
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/img/werk-micro.jpg" alt="Micro-Realism Leopard" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Micro-Realism</span><h3>Leopard</h3><p>Realismus im Kleinstformat.</p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/img/werk-ornament-band.jpg" alt="Tattoo-Armband im Stil von Herr der Ringe" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Ornamental</span><h3>Ringgefährten</h3><p>„Herr der Ringe“-Armband – Fantasie als Schmuck.</p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/img/werk-schrift.jpg" alt="Kirschblüten mit Schriftzug" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Fineline · Schriftzug</span><h3>Kirschblüten</h3><p>„Die schönsten Jahre des Lebens.“</p></div>
          </article>
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/img/werk-ornament.jpg" alt="Ornament und abstrakte Linien am Hals" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Ornamental</span><h3>Feines Ornament</h3><p>Abstrakte Linien, gestochen bei Room 23.</p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/img/werk-floral-4.jpg" alt="Blumenbouquet-Tattoo" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Floral</span><h3>Bouquet</h3><p>Ein Strauß, der nie verblüht.</p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/img/werk-jessi.jpg" alt="Tattoo von Jessi" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Fineline</span><h3>Aus Jessis Feder</h3><p>Zeichnerische Präzision auf der Haut.</p></div>
          </article>
        </div>
        <p class="reveal" style="margin-top:40px;color:var(--muted);font-size:0.95rem">Alle Arbeiten © Room 23 bzw. der jeweiligen Künstlerin – mehr auf <a class="link-gold" href="https://www.instagram.com/room23.tattoo.art/" rel="noopener">Instagram</a>. [PLATZHALTER: Bildfreigaben der Kund:innen prüfen]</p>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Dein Motiv könnte das <em>nächste</em> sein.</h2>
        <p class="reveal d1"><a class="btn btn-solid" href="termin.html">Termin anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== STUDIO
PAGES["studio.html"] = {
  "title": "Studio – Room 23 in Ostholstein | Tattoo Art",
  "desc": "Room 23 ist ein privates Tattoo-Studio in Ostholstein – ruhige Atmosphäre, persönliche Beratung, Termine nur nach Absprache. Eutin, Lübeck, Malente.",
  "active": "studio.html",
  "body": page_hero_cine("studio", "Studio", "Ein Raum für deine <em>Geschichte.</em>",
    "Room 23 ist kein Laufkundschaft-Studio: Wir arbeiten privat, mit Termin, Zeit und Ruhe – damit dein Tattoo so wird, wie du es dir erträumt hast.") + '''
    <section class="section-tight">
      <div class="container split">
        <div class="split-media figure-tall parallax reveal">
          <img src="assets/img/studio-raum-1.jpg" alt="Behandlungsplatz mit organischem Spiegelrahmen im Room 23" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Unser Anspruch</p>
          <h2 class="reveal d1">Ruhe statt<br>Fließband.</h2>
          <p class="reveal d2" style="color:var(--muted)">Ein Tattoo ist eine Entscheidung fürs Leben – deshalb nehmen wir uns Zeit: für deine Idee, für den Entwurf und für den Termin selbst. Bei uns gibt es keine Warteschlange und keine Massenabfertigung, sondern einen Raum, in dem du ankommen kannst.</p>
          <p class="reveal d3" style="color:var(--muted)">Hygiene ist dabei selbstverständlich: steriles Einwegmaterial, geprüfte Farben und ein sauberer Arbeitsplatz – bei jedem einzelnen Termin. [PLATZHALTER: Zertifikate/Hygieneschulung]</p>
          <p class="reveal d4">Mühlenstraße 83 · 23552 Lübeck<br>Termine nur nach Absprache. [PLATZHALTER: Öffnungszeiten]</p>
        </div>
      </div>
    </section>

    <section class="section manifest" style="background:var(--paper-2)">
      <div class="narrow reveal">
        ''' + VINE + '''
        <p>Wir stechen keine Motive von der Stange –<br>wir zeichnen <em>Erinnerungen.</em></p>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Ein Blick in unseren Raum</p>
        <h2 class="reveal d1">Wo deine Idee entsteht</h2>
        <div class="gallery tilt" style="margin-top:52px">
          <article class="gcard reveal"><div class="gimg"><img src="assets/img/studio-raum-2.jpg" alt="Behandlungsstuhl vor Marilyn-Zeichnung" loading="lazy"></div><div class="gbody"><span class="gcat">Behandlungsraum</span><h3>Platz zum Ankommen</h3></div></article>
          <article class="gcard reveal d1"><div class="gimg"><img src="assets/img/studio-raum-3.jpg" alt="Behandlungsstuhl vor Engels-Motiv im Spiegel" loading="lazy"></div><div class="gbody"><span class="gcat">Behandlungsraum</span><h3>Ruhe &amp; Licht</h3></div></article>
          <article class="gcard reveal d2"><div class="gimg"><img src="assets/img/studio-detail-1.jpg" alt="Handgeformtes Struktur-Objekt im Studio" loading="lazy"></div><div class="gbody"><span class="gcat">Detail</span><h3>Handgemacht</h3></div></article>
          <article class="gcard reveal"><div class="gimg"><img src="assets/img/studio-tuer.jpg" alt="Eingangstür mit Room-23-Monogramm" loading="lazy"></div><div class="gbody"><span class="gcat">Eingang</span><h3>Willkommen</h3></div></article>
          <article class="gcard reveal d1"><div class="gimg"><img src="assets/img/studio-affirmation.jpg" alt="Spiegel mit Schriftzug „I am creating the life of my dreams“" loading="lazy"></div><div class="gbody"><span class="gcat">Detail</span><h3>Für Träume</h3></div></article>
          <article class="gcard reveal d2"><div class="gimg"><img src="assets/img/studio-logo-schatten.jpg" alt="Room-23-Logo mit Schattenspiel an der Wand" loading="lazy"></div><div class="gbody"><span class="gcat">Atmosphäre</span><h3>Licht &amp; Schatten</h3></div></article>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Unsere Region</p>
        <h2 class="reveal d1">Zuhause in Ostholstein</h2>
        <p class="reveal d2" style="color:var(--muted);max-width:46ch">Unsere Kund:innen kommen aus der ganzen Region – von der Ostsee bis in die Hansestadt.</p>
        <div class="chips reveal d3">
          <span class="chip">Eutin</span><span class="chip">Lübeck</span><span class="chip">Malente</span>
          <span class="chip">Ostholstein</span><span class="chip">Ostsee</span>
        </div>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <svg class="mandala icon-draw" data-draw viewBox="0 0 160 160" fill="none" aria-hidden="true">
          <circle class="dl dl-gold" cx="80" cy="80" r="70"/>
          <circle class="dotring" cx="80" cy="80" r="55"/>
          <circle class="dl" cx="80" cy="80" r="38"/>
          <path class="dl dl-gold" d="M80 52 C 72 60, 72 70, 80 76 C 88 70, 88 60, 80 52 Z"/>
          <path class="dl dl-gold" d="M80 108 C 72 100, 72 90, 80 84 C 88 90, 88 100, 80 108 Z"/>
          <path class="dl dl-gold" d="M52 80 C 60 72, 70 72, 76 80 C 70 88, 60 88, 52 80 Z"/>
          <path class="dl dl-gold" d="M108 80 C 100 72, 90 72, 84 80 C 90 88, 100 88, 108 80 Z"/>
          <circle class="dl" cx="80" cy="80" r="4"/>
        </svg>
        <h2 class="reveal">Komm vorbei – mit <em>Termin.</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="termin.html">Termin anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== TERMIN
PAGES["termin.html"] = {
  "title": "Termin anfragen | Room 23 Tattoo",
  "desc": "Termin bei Room 23 anfragen: Erzähl uns von deinem Motiv – wir melden uns persönlich. Auch per E-Mail oder WhatsApp.",
  "active": "",
  "body": page_hero_cine("termin", "Termin", "Erzähl uns von deinem <em>Motiv.</em>",
    "Ein paar Zeilen genügen: Motiv, Körperstelle, ungefähre Größe – gern mit Referenzbildern. Wir melden uns persönlich.") + '''
    <section class="section-tight">
      <div class="container split" style="align-items:start">
        <div>
          <div class="needle-line" data-draw aria-hidden="true"><span></span></div>
          <form data-validate novalidate>
            <div class="form-grid">
              <div class="field"><label for="f-name">Name *</label><input id="f-name" name="name" type="text" autocomplete="name" required><span class="field-error">Bitte nenn uns deinen Namen.</span></div>
              <div class="field"><label for="f-email">E-Mail *</label><input id="f-email" name="email" type="email" autocomplete="email" required><span class="field-error">Bitte gib eine gültige E-Mail-Adresse an.</span></div>
              <div class="field"><label for="f-artist">Wunsch-Künstlerin</label><select id="f-artist" name="artist"><option value="">Egal / offen</option><option>Sophia</option><option>Jessi</option><option>Jaqueline</option></select></div>
              <div class="field"><label for="f-stelle">Körperstelle &amp; Größe</label><input id="f-stelle" name="stelle" type="text" placeholder="z. B. Unterarm, ca. 10 cm"></div>
              <div class="field full"><label for="f-msg">Dein Motiv *</label><textarea id="f-msg" name="motiv" placeholder="Beschreib dein Motiv, seine Geschichte und was es dir bedeutet …" required></textarea><span class="field-error">Bitte beschreib dein Wunschmotiv.</span></div>
              <div class="field full consent-wrap"><label class="consent"><input type="checkbox" name="consent" required><span>Ich habe die <a href="datenschutz.html">Datenschutzerklärung</a> gelesen und bin mit der Verarbeitung meiner Angaben zur Beantwortung der Anfrage einverstanden. *</span></label><span class="field-error">Bitte bestätige die Datenschutzerklärung.</span></div>
            </div>
            <p style="margin-top:30px"><button class="btn btn-solid" type="submit">Anfrage senden</button></p>
            <div class="form-note" role="status">Danke dir! Deine Anfrage ist angekommen – wir melden uns persönlich.</div>
          </form>
        </div>
        <div>
          ''' + MAIL + '''
          <ul class="contact-list">
            <li><div class="cl-label">E-Mail</div><div class="cl-val"><a href="mailto:jaquelinefrehley@gmail.com" style="color:inherit">jaquelinefrehley@gmail.com</a></div></li>
            <li><div class="cl-label">WhatsApp</div><div class="cl-val">+49 4521 8451521</div></li>
            <li><div class="cl-label">Online buchen</div><div class="cl-val"><a href="https://jessiart.tatme.com/" rel="noopener" style="color:inherit">Jessi · tatme</a><br><a href="https://tatme.com/sophiaivy.art" rel="noopener" style="color:inherit">Sophia · tatme</a></div></li>
            <li><div class="cl-label">Instagram</div><div class="cl-val"><a href="https://www.instagram.com/room23.tattoo.art/" rel="noopener" style="color:inherit">@room23.tattoo.art</a></div></li>
            <li><div class="cl-label">Studio</div><div class="cl-val">Mühlenstraße 83<br>23552 Lübeck</div></li>
          </ul>
        </div>
      </div>
    </section>
'''}

# ==================================================================== IMPRESSUM / DATENSCHUTZ
PAGES["impressum.html"] = {
  "title": "Impressum | Room 23 Tattoo",
  "desc": "Impressum der Room-23-Website.",
  "active": "",
  "body": '''
    <section class="page-hero">
      <div class="container">
        <p class="breadcrumbs"><a href="index.html">Start</a> &nbsp;/&nbsp; Impressum</p>
        <h1>Impressum</h1>
        <p class="lead">Angaben gemäß § 5 TMG / § 18 MStV.</p>
      </div>
    </section>
''' + '''
    <section class="section-tight">
      <div class="narrow">
        ''' + SEAL + '''
        <h3>Anbieter</h3>
        <p>[PLATZHALTER: Room 23 – Inhaber:in, Rechtsform]<br>[PLATZHALTER: Straße, PLZ Ort]<br>[PLATZHALTER: E-Mail, Telefon]</p>
        <h3>Umsatzsteuer</h3>
        <p>[PLATZHALTER: USt-IdNr. bzw. Hinweis Kleinunternehmerregelung]</p>
        <h3>Verantwortlich für den Inhalt</h3>
        <p>[PLATZHALTER: Verantwortliche Person nach § 18 Abs. 2 MStV]</p>
        <h3>Streitbeilegung</h3>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        <p style="color:var(--muted);font-size:0.92rem"><em>Hinweis: Platzhalter-Gerüst – vor Veröffentlichung vollständig befüllen und rechtlich prüfen.</em></p>
      </div>
    </section>
'''}

PAGES["datenschutz.html"] = {
  "title": "Datenschutz | Room 23 Tattoo",
  "desc": "Datenschutzerklärung der Room-23-Website.",
  "active": "",
  "body": '''
    <section class="page-hero">
      <div class="container">
        <p class="breadcrumbs"><a href="index.html">Start</a> &nbsp;/&nbsp; Datenschutz</p>
        <h1>Datenschutz</h1>
        <p class="lead">Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 DSGVO.</p>
      </div>
    </section>
''' + '''
    <section class="section-tight">
      <div class="narrow">
        ''' + SEAL + '''
        <p style="color:var(--muted)"><em>Hinweis: Dieses Gerüst ist vor Veröffentlichung durch eine juristisch geprüfte Fassung zu ersetzen.</em></p>
        <h3>1. Verantwortlicher</h3>
        <p>[PLATZHALTER: Room 23, Anschrift, E-Mail]</p>
        <h3>2. Hosting &amp; Server-Logs</h3>
        <p>[PLATZHALTER: Hosting-Anbieter, Logdaten, Speicherdauer, Art. 6 Abs. 1 lit. f DSGVO]</p>
        <h3>3. Anfrageformular</h3>
        <p>Bei Nutzung des Formulars verarbeiten wir deine Angaben zur Beantwortung der Anfrage (Art. 6 Abs. 1 lit. b DSGVO). [PLATZHALTER: Empfänger, Speicherdauer]</p>
        <h3>4. Eingebundene Dienste</h3>
        <p>Diese Website bindet Google Fonts ein; dabei wird deine IP-Adresse an Google übertragen. Links führen zu Instagram (Meta). [PLATZHALTER: ggf. lokale Font-Einbindung dokumentieren]</p>
        <h3>5. Deine Rechte</h3>
        <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei der zuständigen Aufsichtsbehörde.</p>
      </div>
    </section>
'''}

CINE = {"index.html","stile.html","team.html","galerie.html","studio.html","termin.html"}
for fname, cfg in PAGES.items():
    body_class = "cine" if fname in CINE else ""
    html = head(cfg["title"], cfg["desc"], body_class) + header(cfg["active"]) + cfg["body"] + FOOTER.replace("__MONO__", MONOGRAM)
    open(os.path.join(ROOT, fname), "w", encoding="utf-8").write(html)
    print("wrote", fname, len(html))
print("done")
