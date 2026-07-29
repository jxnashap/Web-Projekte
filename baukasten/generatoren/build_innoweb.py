# -*- coding: utf-8 -*-
"""Generiert die mehrseitige InnoWeb-Website (Quiet Luxury)."""
import os
ROOT = "/home/user/Web-Projekte/innoweb"

NAV = [("index.html","Start"),("leistungen.html","Leistungen"),("arbeitsweise.html","Arbeitsweise"),
       ("sicherheit.html","Sicherheit"),("referenzen.html","Referenzen"),("ueber-uns.html","Über uns")]

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
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
{body}
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
'''

# --- I/W-Monogramm: goldenes I durch die geoeffnete W-Spitze gefaedelt ---
MONOGRAM = '''<svg class="mono-svg" viewBox="0 0 128 128" fill="none" aria-hidden="true" focusable="false">
          <path class="m-ink" d="M18 30 L40 100 L60.5 35"/>
          <path class="m-ink" d="M67.5 35 L88 100 L110 30"/>
          <path class="m-gold" d="M64 12 V116"/>
          <path class="m-gold" d="M52 12 H76"/>
          <path class="m-gold" d="M52 116 H76"/>
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
      <a class="brand" href="index.html" aria-label="InnoWeb – Startseite">
        {MONOGRAM}
        <span class="brand-word">InnoWeb</span>
        <span class="brand-sub">Digitale Baukunst</span>
      </a>
      <a class="header-cta" href="kontakt.html">
        <span>Projekt anfragen</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </header>

  <div class="nav-overlay" id="nav-overlay" aria-hidden="true">
    <div class="nav-overlay-inner">
      <nav class="main-nav" aria-label="Hauptnavigation">
        <ul>
{items}        <li class="nav-contact-li"><a href="kontakt.html"><span class="nl-num">·</span><span class="nl-label">Projekt anfragen</span></a></li>
        </ul>
        <div class="nav-overlay-foot">
          <span>[PLATZHALTER: hallo@innoweb.de]</span>
          <span><a href="impressum.html">Impressum</a> &nbsp;·&nbsp; <a href="datenschutz.html">Datenschutz</a></span>
        </div>
      </nav>
      <div class="nav-visual" aria-hidden="true">
        <img src="assets/img/norden.jpg" alt="" loading="lazy">
      </div>
    </div>
  </div>

  <main id="main">
'''

FOOTER_HEAD = '''
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <span class="footer-lockup">__MONO__<span class="bmark">InnoWeb</span></span>
          <p>Digitale Baukunst aus Norddeutschland. Wir entwerfen und bauen Websites, über die man spricht – ruhig, präzise, sicher.</p>
        </div>'''

FOOTER = FOOTER_HEAD + '''
        <div>
          <h4>Studio</h4>
          <ul>
            <li><a href="leistungen.html">Leistungen</a></li>
            <li><a href="arbeitsweise.html">Arbeitsweise</a></li>
            <li><a href="sicherheit.html">Sicherheit</a></li>
            <li><a href="referenzen.html">Referenzen</a></li>
          </ul>
        </div>
        <div>
          <h4>Kontakt</h4>
          <ul>
            <li><a href="kontakt.html">Projekt anfragen</a></li>
            <li><a href="mailto:hallo@innoweb.de">[PLATZHALTER: hallo@innoweb.de]</a></li>
            <li>[PLATZHALTER: Telefon]</li>
            <li>[PLATZHALTER: Adresse, Norddeutschland]</li>
          </ul>
        </div>
        <div>
          <h4>Region</h4>
          <ul>
            <li>Hamburg</li>
            <li>Lübeck &amp; Lübecker Bucht</li>
            <li>Kiel</li>
            <li>Schleswig-Holstein</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> InnoWeb · Digitale Baukunst</span>
        <span><a href="impressum.html">Impressum</a> &nbsp;·&nbsp; <a href="datenschutz.html">Datenschutz</a></span>
      </div>
    </div>
  </footer>

  <script src="js/script.js"></script>
</body>
</html>
'''

def page_hero(crumb, h1, lead):
    return f'''
    <section class="page-hero">
      <div class="container">
        <p class="breadcrumbs"><a href="index.html">Start</a> &nbsp;/&nbsp; {crumb}</p>
        <h1>{h1}</h1>
        <p class="lead">{lead}</p>
      </div>
    </section>
'''

def page_hero_cine(slug, crumb, h1, lead, fade="paper", video=True):
    """Unterseiten-Hero mit eigenem Hintergrund-Video (Thema Web/Creative/Design).
    video=False: nur Ken-Burns-Drift auf dem Themen-Bild (Video spaeter nachruestbar)."""
    extra = " fade-night" if fade == "night" else ""
    vid = f'''
        <video class="hero-video" muted loop playsinline preload="none"
               poster="assets/hero/{slug}-poster.jpg"
               data-src-4k="assets/hero/{slug}-2k.mp4"
               data-src-hd="assets/hero/{slug}-hd.mp4"></video>''' if video else ""
    return f'''
    <section class="page-hero page-hero-cine{extra}">
      <div class="hero-bg" aria-hidden="true">
        <img src="assets/hero/{slug}-poster.jpg" alt="">{vid}
        <div class="hero-veil"></div>
      </div>
      <div class="container">
        <p class="breadcrumbs"><a href="index.html">Start</a> &nbsp;/&nbsp; {crumb}</p>
        <h1>{h1}</h1>
        <p class="lead">{lead}</p>
      </div>
    </section>
'''

# --- Wireframe-SVG (Hero): Linien zeichnen sich, dann Flächen ---
WIREFRAME = '''<svg class="wire-svg" viewBox="0 0 400 340" xmlns="http://www.w3.org/2000/svg" aria-label="Website-Entwurf, der sich selbst zeichnet" role="img">
              <!-- Flächen (füllen nach dem Zeichnen ein) -->
              <g class="wfill">
                <rect class="wfill-night" x="18" y="18" width="364" height="34" rx="2" opacity="0.06"/>
                <rect class="wfill-paper" x="18" y="70" width="212" height="120" rx="2"/>
                <rect class="wfill-gold" x="40" y="150" width="92" height="18" rx="2" opacity="0.85"/>
                <rect class="wfill-paper" x="248" y="70" width="134" height="56" rx="2"/>
                <rect class="wfill-paper" x="248" y="134" width="134" height="56" rx="2"/>
                <rect class="wfill-paper" x="18" y="208" width="116" height="88" rx="2"/>
                <rect class="wfill-paper" x="142" y="208" width="116" height="88" rx="2"/>
                <rect class="wfill-paper" x="266" y="208" width="116" height="88" rx="2"/>
                <rect class="wfill-night" x="18" y="312" width="364" height="10" rx="2" opacity="0.08"/>
              </g>
              <!-- Linien (zeichnen sich) -->
              <g>
                <rect class="wl draw-line" x="18" y="18" width="364" height="34" rx="2"/>
                <line class="wl-soft wl draw-line" x1="34" y1="35" x2="86" y2="35"/>
                <line class="wl-soft wl draw-line" x1="290" y1="35" x2="366" y2="35"/>
                <rect class="wl draw-line" x="18" y="70" width="212" height="120" rx="2"/>
                <line class="wl-soft wl draw-line" x1="40" y1="102" x2="188" y2="102"/>
                <line class="wl-soft wl draw-line" x1="40" y1="122" x2="160" y2="122"/>
                <rect class="wl-gold wl draw-line" x="40" y="150" width="92" height="18" rx="2"/>
                <rect class="wl draw-line" x="248" y="70" width="134" height="56" rx="2"/>
                <rect class="wl draw-line" x="248" y="134" width="134" height="56" rx="2"/>
                <rect class="wl draw-line" x="18" y="208" width="116" height="88" rx="2"/>
                <rect class="wl draw-line" x="142" y="208" width="116" height="88" rx="2"/>
                <rect class="wl draw-line" x="266" y="208" width="116" height="88" rx="2"/>
                <line class="wl draw-line" x1="18" y1="317" x2="382" y2="317"/>
              </g>
            </svg>'''

# --- Blueprint-Icons (Leistungen): zeichnen sich beim Scrollen ---
def fl_ico(inner):
    return ('<div class="fl-ico icon-draw" data-draw aria-hidden="true">'
            '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg></div>')

ICO_WEBSITE = fl_ico(
    '<rect class="dl" x="6" y="10" width="52" height="44" rx="2"/>'
    '<path class="dl" d="M6 20h52"/>'
    '<path class="dl" d="M12 30h18M12 37h13"/>'
    '<rect class="dl dl-gold" x="12" y="43" width="12" height="5" rx="1"/>'
    '<rect class="dl" x="36" y="28" width="16" height="20" rx="1"/>')

ICO_RELAUNCH = fl_ico(
    '<path class="dl" d="M50 24a20 20 0 0 0-35-5"/>'
    '<path class="dl" d="M15 12v8h8"/>'
    '<path class="dl" d="M14 40a20 20 0 0 0 35 5"/>'
    '<path class="dl" d="M49 52v-8h-8"/>'
    '<path class="dl dl-gold" d="M25 34l7-7 7 7M32 27v13"/>')

ICO_SHOP = fl_ico(
    '<path class="dl" d="M14 22h36l-3 30H17z"/>'
    '<path class="dl" d="M24 28v-8a8 8 0 0 1 16 0v8"/>'
    '<path class="dl dl-gold" d="M26 40c2 4 10 4 12 0"/>')

ICO_CARE = fl_ico(
    '<path class="dl" d="M32 8 12 16v12c0 14 8 22 20 28 12-6 20-14 20-28V16z"/>'
    '<path class="dl dl-gold" d="M20 34h6l3-6 4 12 3-6h8"/>')

# --- Wellenlinie (Über uns) ---
WAVE = '''<svg class="wave-svg icon-draw" data-draw viewBox="0 0 240 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path class="dl" d="M4 26 C 24 10, 44 10, 64 22 S 104 36 124 24 S 164 10 184 20 S 224 30 236 16"/>
          <path class="dl dl-gold" d="M4 34 C 24 18, 44 18, 64 30 S 104 44 124 32 S 164 18 184 28 S 224 38 236 24" opacity="0.75"/>
        </svg>'''

# --- Briefumschlag (Kontakt): zeichnet sich, Gold-Linie fliegt davon ---
MAIL = '''<div class="mail-sig icon-draw" data-draw aria-hidden="true">
          <svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg">
            <rect class="dl" x="16" y="38" width="180" height="92" rx="3"/>
            <path class="dl" d="M16 42l90 56 90-56"/>
            <path class="dl dl-gold" d="M208 84 C 244 74, 266 52, 296 22"/>
            <path class="dl dl-gold" d="M282 22h14v14"/>
          </svg>
        </div>'''

# --- §-Siegel (Impressum/Datenschutz) ---
SEAL = '''<div class="seal icon-draw" data-draw aria-hidden="true">
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <circle class="dl dl-gold" cx="40" cy="40" r="36"/>
            <circle class="dl" cx="40" cy="40" r="28" opacity="0.45"/>
            <text class="seal-p" x="40" y="52" text-anchor="middle">§</text>
          </svg>
        </div>'''

# --- Schild-SVG (Sicherheit) ---
SHIELD = '''<svg class="shield-svg" viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schutzschild">
            <path class="s-glow" d="M100 12 24 44v62c0 58 34 92 76 112 42-20 76-54 76-112V44z"/>
            <path class="s-draw" d="M100 12 24 44v62c0 58 34 92 76 112 42-20 76-54 76-112V44z"/>
            <path class="s-draw" d="M100 34 44 58v46c0 44 26 72 56 88 30-16 56-44 56-88V58z" opacity="0.4"/>
            <path class="s-check" d="M70 112l22 24 40-46"/>
          </svg>'''

PAGES = {}

# ==================================================================== INDEX
PAGES["index.html"] = {
  "title": "InnoWeb – Websites, über die man spricht · Webdesign Norddeutschland",
  "desc": "InnoWeb entwirft und baut außergewöhnliche Websites für Unternehmen in Norddeutschland – individuell statt Baukasten, gehostet in Deutschland, DSGVO-konform.",
  "active": "index.html",
  "body": '''
    <!-- ============ 1 · HERO (4K-Cinematic) ============ -->
    <section class="hero hero-cine">
      <div class="hero-bg" aria-hidden="true">
        <img src="assets/hero/hero-poster.jpg" alt="">
        <video class="hero-video" muted loop playsinline preload="none"
               poster="assets/hero/hero-poster.jpg"
               data-src-4k="assets/hero/innoweb-hero-4k.mp4"
               data-src-hd="assets/hero/innoweb-hero-hd.mp4"></video>
        <div class="hero-veil"></div>
      </div>
      <div class="container hero-grid">
        <div>
          <p class="eyebrow reveal">Digitale Baukunst · Norddeutschland</p>
          <h1 class="reveal d1">Websites, über die man <em>spricht.</em></h1>
          <p class="hero-sub reveal d2">Wir entwerfen und bauen digitale Häuser für Marken mit Anspruch – ruhig im Ton, präzise im Detail.</p>
          <div class="hero-actions reveal d3">
            <a class="btn btn-solid" href="kontakt.html">Projekt anfragen</a>
            <a class="btn btn-line" href="arbeitsweise.html">So bauen wir</a>
          </div>
          <div class="trust-row reveal d4">
            <span>Individuell statt Baukasten</span>
            <span>Gehostet in Deutschland</span>
            <span>DSGVO-konform</span>
          </div>
        </div>
        <div class="wire-wrap reveal d2">
          <div class="wire-frame">
            ''' + WIREFRAME + '''
            <span class="wire-caption">Ihre Seite · im Entstehen</span>
          </div>
        </div>
      </div>
      <div class="scroll-cue" aria-hidden="true"><span></span></div>
    </section>

    <!-- ============ 2 · MANIFEST ============ -->
    <section class="section manifest">
      <div class="narrow reveal">
        <div class="rule"></div>
        <p>Eine Website ist kein Produkt von der Stange.<br>Sie ist das digitale Haus einer Marke –<br>und wir bauen es <em>Schicht für Schicht.</em></p>
      </div>
    </section>

    <!-- ============ 3 · VIER SCHICHTEN ============ -->
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow reveal">Wie wir bauen</p>
        <h2 class="reveal d1" style="max-width:14ch">Vier Schichten. Ein Haus.</h2>
        <div class="layers" style="margin-top:56px">
          <div class="layer reveal">
            <span class="layer-num">01</span>
            <div class="layer-body"><h3>Fundament</h3><p>Struktur &amp; Code. Sauberes, semantisches HTML, schlanke Technik – gebaut, um Jahre zu tragen.</p></div>
            <span class="layer-tag">Struktur &amp; Code</span>
          </div>
          <div class="layer reveal d1">
            <span class="layer-num">02</span>
            <div class="layer-body"><h3>Gestalt</h3><p>Design &amp; Marke. Typografie, Raum und Bild – zurückhaltend gesetzt, damit Ihre Marke spricht.</p></div>
            <span class="layer-tag">Design &amp; Marke</span>
          </div>
          <div class="layer reveal d2">
            <span class="layer-num">03</span>
            <div class="layer-body"><h3>Bewegung</h3><p>Interaktion. Sanfte Übergänge und Momente, die man sich merkt – nie laut, nie zufällig.</p></div>
            <span class="layer-tag">Interaktion</span>
          </div>
          <div class="layer reveal d3">
            <span class="layer-num">04</span>
            <div class="layer-body"><h3>Schutz</h3><p>Sicherheit. Verschlüsselung, Backups, Updates – unsichtbar für Besucher, unverzichtbar für Sie.</p></div>
            <span class="layer-tag">Sicherheit</span>
          </div>
        </div>
        <p class="reveal" style="margin-top:44px"><a class="link-gold" href="arbeitsweise.html">Die Arbeitsweise im Detail</a></p>
      </div>
    </section>

    <!-- ============ 4 · SICHERHEIT (dunkel) ============ -->
    <section class="section dark">
      <div class="container">
        <div class="sec-grid">
          <div class="shield-wrap reveal">
            ''' + SHIELD + '''
            <p class="encrypt" data-encrypt="VERSCHLÜSSELT" aria-label="Verschlüsselt">&nbsp;</p>
          </div>
          <div>
            <p class="eyebrow reveal">Sicherheit, eingebaut</p>
            <h2 class="reveal d1">Schön ist nur, was auch <em>sicher</em> ist.</h2>
            <p class="reveal d2" style="max-width:46ch">Jede InnoWeb-Seite trägt ihren Schutz von Anfang an in sich – nicht als Zubehör, sondern als Teil der Konstruktion.</p>
            <ul class="sec-list" style="margin-top:40px">
              <li class="sec-item reveal"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div><h4>SSL / HTTPS</h4><p>Jede Verbindung verschlüsselt – und von Google mit besserem Ranking belohnt.</p></li>
              <li class="sec-item reveal d1"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3 4 6v5c0 5 3.2 8.6 8 10 4.8-1.4 8-5 8-10V6z"/></svg></div><h4>DSGVO &amp; Hosting in DE</h4><p>Server in Deutschland, saubere Einwilligungen, datensparsam gedacht.</p></li>
              <li class="sec-item reveal d2"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg></div><h4>Tägliche Backups</h4><p>Im Ernstfall ist Ihre Seite in Minuten wiederhergestellt.</p></li>
              <li class="sec-item reveal d3"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5"/><path d="M18 3v4h-4M6 21v-4h4"/></svg></div><h4>Updates &amp; Monitoring</h4><p>Laufend aktualisiert – bevor Lücken zum Problem werden.</p></li>
              <li class="sec-item reveal d2"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M8 15h.01M12 15h.01"/></svg></div><h4>Firewall &amp; Angriffsschutz</h4><p>Schutz vor Bots, Brute-Force und DDoS – Tag und Nacht.</p></li>
              <li class="sec-item reveal d3"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="m3 8 9 6 9-6"/></svg></div><h4>Sichere Formulare</h4><p>Verschlüsselte Übertragung, intelligenter Spam-Filter.</p></li>
            </ul>
            <p class="reveal" style="margin-top:38px"><a class="link-gold" href="sicherheit.html">Sicherheit im Detail</a></p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 5 · INNOVATION ============ -->
    <section class="section">
      <div class="container">
        <p class="eyebrow reveal">Was den Unterschied macht</p>
        <h2 class="reveal d1" style="max-width:16ch">Leise Innovation, spürbare Wirkung.</h2>
        <div class="tiles reveal d2" style="margin-top:56px">
          <div class="tile"><span class="t-num">I</span><h3>Bewegtes Storytelling</h3><p>Inhalte, die sich beim Scrollen entfalten – Ihre Geschichte in ruhigen, präzisen Momenten.</p></div>
          <div class="tile"><span class="t-num">II</span><h3>Kompromisslose Ladezeit</h3><p>Schlanker Code, optimierte Bilder. Eleganz, die in Millisekunden lädt.</p></div>
          <div class="tile"><span class="t-num">III</span><h3>SEO &amp; Auffindbarkeit</h3><p>Saubere Struktur, sprechende Inhalte – gefunden werden, ohne zu schreien.</p></div>
          <div class="tile"><span class="t-num">IV</span><h3>Barrierefrei gedacht</h3><p>Kontraste, Fokus, Semantik. Gute Gestaltung schließt niemanden aus.</p></div>
        </div>
      </div>
    </section>

    <!-- ============ 6 · PROZESS ============ -->
    <section class="section section-tight" style="background:var(--paper-2)">
      <div class="container">
        <p class="eyebrow reveal">Der Weg</p>
        <h2 class="reveal d1">Fünf Schritte zur Seite, über die man spricht.</h2>
        <div class="process" style="margin-top:60px">
          <div class="step reveal"><div class="st-num">01</div><h3>Gespräch</h3><p>Wir hören zu: Marke, Ziele, Publikum.</p></div>
          <div class="step reveal d1"><div class="st-num">02</div><h3>Konzept</h3><p>Struktur, Inhalte, roter Faden.</p></div>
          <div class="step reveal d2"><div class="st-num">03</div><h3>Design</h3><p>Gestalt und Ton – bis ins Detail.</p></div>
          <div class="step reveal d3"><div class="st-num">04</div><h3>Bau</h3><p>Sauberer Code, sanfte Bewegung.</p></div>
          <div class="step reveal d4"><div class="st-num">05</div><h3>Launch &amp; Pflege</h3><p>Sicher live – und gut betreut.</p></div>
        </div>
        <p class="reveal" style="margin-top:44px"><a class="link-gold" href="arbeitsweise.html">Mehr zur Arbeitsweise</a></p>
      </div>
    </section>

    <!-- ============ 7 · NORDDEUTSCHLAND ============ -->
    <section class="section">
      <div class="container split">
        <div>
          <p class="eyebrow reveal">Zuhause im Norden</p>
          <h2 class="reveal d1">Digitale Handwerkskunst mit hanseatischem Handschlag.</h2>
          <p class="reveal d2" style="color:var(--muted);max-width:44ch">Wir arbeiten dort, wo unsere Kunden zuhause sind: zwischen Elbe und Ostsee. Kurze Wege, klare Worte, Ergebnisse, die bleiben.</p>
          <div class="chips reveal d3">
            <span class="chip">Hamburg</span>
            <span class="chip">Lübeck</span>
            <span class="chip">Kiel</span>
            <span class="chip">Lübecker Bucht</span>
            <span class="chip">Schleswig-Holstein</span>
          </div>
        </div>
        <div class="split-media figure-tall reveal d2">
          <!-- [ECHTES FOTO EINSETZEN: Studio / Team / norddeutsches Motiv] -->
          <img src="assets/img/norden.jpg" alt="Ruhige Ostseeküste in Norddeutschland" loading="lazy">
        </div>
      </div>
    </section>

    <!-- ============ 8 · KONTAKT (dunkel) ============ -->
    <section class="section dark cta-final">
      <div class="narrow">
        <p class="eyebrow reveal">Der nächste Schritt</p>
        <h2 class="reveal d1">Bauen wir etwas, über das man <em>spricht.</em></h2>
        <p class="lead reveal d2">Erzählen Sie uns von Ihrer Marke – wir antworten persönlich und unverbindlich.</p>
        <p class="reveal d3"><a class="btn btn-solid" href="kontakt.html">Projekt anfragen</a></p>
        <p class="reveal d4" style="margin-top:26px;font-size:0.9rem;color:rgba(246,243,238,0.5)">[PLATZHALTER: hallo@innoweb.de]</p>
      </div>
    </section>
'''}

# ==================================================================== LEISTUNGEN
PAGES["leistungen.html"] = {
  "title": "Leistungen – Websites, Relaunch, Shops, Pflege | InnoWeb",
  "desc": "Was InnoWeb baut: individuelle Websites, behutsame Relaunches, ruhige Shops und verlässliche Pflege &amp; Hosting – für Unternehmen in Norddeutschland.",
  "active": "leistungen.html",
  "body": page_hero_cine("leistungen", "Leistungen", "Was wir <em>bauen.</em>",
    "Vier Leistungen, ein Anspruch: digitale Häuser, die ihren Bewohnern gerecht werden – heute und in fünf Jahren.") + '''
    <section class="section-tight">
      <div class="container">
        <ul class="flist">
          <li class="reveal">
            <span class="fl-idx">01</span>
            ''' + ICO_WEBSITE + '''
            <div><h3>Websites</h3><p>Individuell entworfen und von Hand gebaut – keine Templates, kein Baukasten. Eine Seite, die aussieht wie Ihre Marke und lädt wie ein Gedanke: Konzept, Text-Feinschliff, Design, Umsetzung, Launch.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">02</span>
            ''' + ICO_RELAUNCH + '''
            <div><h3>Relaunch</h3><p>Wenn die bestehende Seite in die Jahre gekommen ist: Wir bewahren, was funktioniert, und erneuern, was bremst – Inhalte, Technik, Gestaltung. Behutsam, damit Rankings und Vertrautes erhalten bleiben.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">03</span>
            ''' + ICO_SHOP + '''
            <div><h3>Shops</h3><p>Verkaufen mit Stil: übersichtliche Sortimente, ruhige Produktseiten, reibungsloser Checkout. Sicher angebunden, DSGVO-konform, gebaut für Vertrauen.</p></div>
          </li>
          <li class="reveal">
            <span class="fl-idx">04</span>
            ''' + ICO_CARE + '''
            <div><h3>Pflege &amp; Hosting</h3><p>Nach dem Launch beginnt die Verantwortung: Hosting in Deutschland, tägliche Backups, Updates, Monitoring und kleine Änderungen – damit Ihre Seite gepflegt bleibt wie am ersten Tag.</p></div>
          </li>
        </ul>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Welche Seite dürfen wir für Sie <em>bauen?</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="kontakt.html">Projekt anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== SICHERHEIT
PAGES["sicherheit.html"] = {
  "title": "Sicherheit &amp; Datenschutz – gebaut wie ein Tresor | InnoWeb",
  "desc": "Sicherheit bei InnoWeb: SSL/HTTPS, DSGVO &amp; Hosting in Deutschland, tägliche Backups, Updates &amp; Monitoring, Firewall, sichere Formulare.",
  "active": "sicherheit.html",
  "body": page_hero_cine("sicherheit", "Sicherheit", "Schön ist nur, was auch <em>sicher</em> ist.",
    "Sicherheit ist bei uns kein Zubehör, sondern Teil der Konstruktion – von der ersten Zeile Code bis zum laufenden Betrieb.", fade="night") + '''
    <section class="section-tight dark">
      <div class="container sec-grid">
        <div class="shield-wrap reveal">
          ''' + SHIELD + '''
          <p class="encrypt" data-encrypt="VERSCHLÜSSELT" aria-label="Verschlüsselt">&nbsp;</p>
        </div>
        <div>
          <p class="eyebrow reveal">Sechs Schutzschichten</p>
          <h2 class="reveal d1">Was jede InnoWeb-Seite in sich trägt</h2>
          <ul class="sec-list" style="margin-top:40px">
            <li class="sec-item reveal"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div><h4>SSL / HTTPS-Verschlüsselung</h4><p>Jede Verbindung zwischen Besucher und Seite ist verschlüsselt. Das schützt Daten – und verbessert nebenbei Ihr Google-Ranking.</p></li>
            <li class="sec-item reveal d1"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3 4 6v5c0 5 3.2 8.6 8 10 4.8-1.4 8-5 8-10V6z"/></svg></div><h4>DSGVO &amp; Hosting in Deutschland</h4><p>Ihre Seite liegt auf Servern in Deutschland. Einwilligungen sind sauber gelöst, Daten werden sparsam erhoben – nicht mehr als nötig.</p></li>
            <li class="sec-item reveal d2"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg></div><h4>Tägliche Backups</h4><p>Jede Nacht wird Ihre Seite gesichert. Im Ernstfall ist sie in Minuten wiederhergestellt – als wäre nichts gewesen.</p></li>
            <li class="sec-item reveal d3"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5"/><path d="M18 3v4h-4M6 21v-4h4"/></svg></div><h4>Updates &amp; Monitoring</h4><p>Wir halten Technik und Erweiterungen laufend aktuell und beobachten den Betrieb – bevor Lücken zum Problem werden.</p></li>
            <li class="sec-item reveal d2"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M8 15h.01M12 15h.01"/></svg></div><h4>Firewall &amp; Angriffsschutz</h4><p>Automatisierte Angriffe, Bots, Brute-Force, DDoS: Eine mehrstufige Firewall wehrt ab, was Ihrer Seite schaden will.</p></li>
            <li class="sec-item reveal d3"><div class="sec-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="m3 8 9 6 9-6"/></svg></div><h4>Sichere Formulare &amp; Spam-Schutz</h4><p>Anfragen erreichen Sie verschlüsselt; ein intelligenter Filter hält Spam fern, ohne echte Kunden zu blockieren.</p></li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section manifest">
      <div class="narrow reveal">
        <div class="rule"></div>
        <p>Vertrauen ist die stillste Form von <em>Schönheit.</em></p>
      </div>
    </section>

    <section class="section-tight" style="padding-bottom:clamp(90px,13vw,168px)">
      <div class="narrow center">
        <p class="reveal"><a class="btn btn-solid" href="kontakt.html">Projekt anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== ARBEITSWEISE
PAGES["arbeitsweise.html"] = {
  "title": "Arbeitsweise – In Schichten gebaut, in Schritten geführt | InnoWeb",
  "desc": "So arbeitet InnoWeb: vier Schichten (Fundament, Gestalt, Bewegung, Schutz) und fünf klare Schritte vom ersten Gespräch bis zu Launch &amp; Pflege.",
  "active": "arbeitsweise.html",
  "body": page_hero_cine("arbeitsweise", "Arbeitsweise", "In Schichten gebaut.<br>In Schritten <em>geführt.</em>",
    "Gute Websites entstehen nicht auf einmal – sie werden aufgebaut wie ein Haus: Schicht für Schicht, mit einem klaren Plan.") + '''
    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Die vier Schichten</p>
        <h2 class="reveal d1">Was jede Seite trägt</h2>
        <div class="tl" data-timeline style="margin-top:52px">
          <span class="tl-line" aria-hidden="true"></span>
          <div class="layers">
          <div class="layer reveal"><span class="layer-num">01</span><div class="layer-body"><h3>Fundament — Struktur &amp; Code</h3><p>Semantisches HTML, schlanke Stylesheets, saubere Architektur. Unsichtbar für Besucher, entscheidend für Ladezeit, SEO und Wartbarkeit.</p></div><span class="layer-tag">Basis</span></div>
          <div class="layer reveal d1"><span class="layer-num">02</span><div class="layer-body"><h3>Gestalt — Design &amp; Marke</h3><p>Typografie, Raum, Farbe und Bildsprache. Wir übersetzen Ihre Marke in ein digitales Erscheinungsbild – zurückhaltend, präzise, wiedererkennbar.</p></div><span class="layer-tag">Ausdruck</span></div>
          <div class="layer reveal d2"><span class="layer-num">03</span><div class="layer-body"><h3>Bewegung — Interaktion</h3><p>Sanfte Übergänge, dezente Reaktionen, Momente zum Merken. Bewegung dient dem Inhalt – nie umgekehrt.</p></div><span class="layer-tag">Erlebnis</span></div>
          <div class="layer reveal d3"><span class="layer-num">04</span><div class="layer-body"><h3>Schutz — Sicherheit</h3><p>Verschlüsselung, Backups, Updates, Firewall. Der Teil, den niemand sieht – und niemand vermissen möchte.</p></div><span class="layer-tag">Verlass</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="background:var(--paper-2)">
      <div class="container">
        <p class="eyebrow reveal">Die fünf Schritte</p>
        <h2 class="reveal d1">Vom ersten Gespräch bis zur Pflege</h2>
        <div class="tl" data-timeline style="margin-top:52px">
          <span class="tl-line" aria-hidden="true"></span>
          <div class="layers">
          <div class="layer reveal"><span class="layer-num">1</span><div class="layer-body"><h3>Gespräch</h3><p>Wir beginnen mit Zuhören: Wer sind Sie, wen möchten Sie erreichen, was soll die Seite leisten? Persönlich, unverbindlich, auf Augenhöhe.</p></div><span class="layer-tag">Kennenlernen</span></div>
          <div class="layer reveal d1"><span class="layer-num">2</span><div class="layer-body"><h3>Konzept</h3><p>Seitenstruktur, Inhalte, roter Faden. Sie sehen früh, wie Ihre Seite denkt – bevor die erste Fläche gestaltet ist.</p></div><span class="layer-tag">Plan</span></div>
          <div class="layer reveal d2"><span class="layer-num">3</span><div class="layer-body"><h3>Design</h3><p>Gestalt und Ton: Entwürfe, Abstimmungen, Feinschliff. Wir gestalten so lange, bis es sich richtig anfühlt – und richtig aussieht.</p></div><span class="layer-tag">Entwurf</span></div>
          <div class="layer reveal d3"><span class="layer-num">4</span><div class="layer-body"><h3>Bau</h3><p>Handgeschriebener, schneller Code. Sanfte Bewegung, geprüfte Zugänglichkeit, saubere Details – auf jedem Gerät.</p></div><span class="layer-tag">Umsetzung</span></div>
          <div class="layer reveal d4"><span class="layer-num">5</span><div class="layer-body"><h3>Launch &amp; Pflege</h3><p>Sicher live gehen – und gut betreut bleiben: Hosting in Deutschland, Backups, Updates, kleine Änderungen. Wir bleiben an Ihrer Seite.</p></div><span class="layer-tag">Betrieb</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Bereit für den ersten <em>Schritt?</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="kontakt.html">Gespräch beginnen</a></p>
      </div>
    </section>
'''}

# ==================================================================== ÜBER UNS
PAGES["ueber-uns.html"] = {
  "title": "Über uns – InnoWeb, digitale Baukunst aus Norddeutschland",
  "desc": "InnoWeb ist eine Web-Agentur aus Norddeutschland: hanseatisch im Ton, präzise im Handwerk. Websites für Hamburg, Lübeck, Kiel und Schleswig-Holstein.",
  "active": "ueber-uns.html",
  "body": page_hero_cine("ueber-uns", "Über uns", "Hanseatisch.<br><em>Handwerklich.</em>",
    "InnoWeb ist ein Studio für digitale Baukunst – zuhause zwischen Elbe und Ostsee, zu Gast auf Bildschirmen überall.", video=False) + '''
    <section class="section-tight">
      <div class="container split">
        <div class="split-media figure-tall parallax reveal">
          <!-- [ECHTES FOTO EINSETZEN: Team / Studio InnoWeb] -->
          <img src="assets/img/studio.jpg" alt="Ruhige Arbeitsatmosphäre am Schreibtisch" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Wer wir sind</p>
          <h2 class="reveal d1">Weniger Agentur.<br>Mehr Werkstatt.</h2>
          <p class="reveal d2" style="color:var(--muted)">Wir glauben, dass gute Websites wie gute Häuser entstehen: mit einem soliden Fundament, einem klaren Entwurf und Handwerkern, die ihr Material beherrschen. Deshalb bauen wir wenig – aber das richtig.</p>
          <p class="reveal d3" style="color:var(--muted)">Unsere Kunden sind Unternehmen aus Norddeutschland, die Wert auf Substanz legen: vom Familienbetrieb an der Lübecker Bucht bis zur Kanzlei in Hamburg. Man erreicht uns persönlich, man versteht unsere Angebote, und was wir zusagen, halten wir.</p>
          <p class="reveal d4">[PLATZHALTER: Team-Vorstellung mit Namen &amp; Fotos ergänzen]</p>
        </div>
      </div>
    </section>

    <section class="section manifest" style="background:var(--paper-2)">
      <div class="narrow reveal">
        ''' + WAVE + '''
        <p>Wir sprechen Klartext, bauen leise –<br>und lassen die Ergebnisse <em>reden.</em></p>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Unsere Region</p>
        <h2 class="reveal d1">Zwischen Elbe und Ostsee</h2>
        <p class="reveal d2" style="color:var(--muted);max-width:46ch">Kurze Wege sind uns wichtig: Wir treffen unsere Kunden dort, wo sie arbeiten – in Hamburg, Lübeck, Kiel und überall in Schleswig-Holstein.</p>
        <div class="chips reveal d3">
          <span class="chip">Hamburg</span><span class="chip">Lübeck</span><span class="chip">Kiel</span>
          <span class="chip">Lübecker Bucht</span><span class="chip">Schleswig-Holstein</span>
        </div>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Lernen wir uns <em>kennen.</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="kontakt.html">Projekt anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== REFERENZEN
PAGES["referenzen.html"] = {
  "title": "Referenzen – Ausgewählte Projekte | InnoWeb",
  "desc": "Ausgewählte Projekte von InnoWeb – Websites für Unternehmen in Norddeutschland. Galerie im Aufbau.",
  "active": "referenzen.html",
  "body": page_hero_cine("referenzen", "Referenzen", "Arbeiten, die für uns <em>sprechen.</em>",
    "Eine Auswahl unserer jüngsten Projekte – jedes von Hand gebaut, jedes mit eigenem Charakter.", video=False) + '''
    <section class="section-tight">
      <div class="container">
        <div class="gallery gallery-ref">
          <article class="gcard ref-card reveal">
            <a class="ref-link" href="https://spiess-theta.vercel.app/" target="_blank" rel="noopener">
              <div class="gimg"><img src="assets/img/ref-1.jpg" alt="Startseite der Website von Spiess – Holz, Glas &amp; Metallbau" loading="lazy"></div>
              <div class="gbody">
                <span class="gcat">Handwerk · Holz · Glas · Metall</span>
                <h3>Spiess <span class="ref-go" aria-hidden="true">→</span></h3>
                <p>Handwerksgruppe aus Timmendorfer Strand: Zimmerei, Glaserei und Metallbau unter einem Dach. Mehrseitige Website mit Cinematic-Hero, Projekt-Schau und ruhiger, hochwertiger Bildsprache.</p>
                <span class="ref-url">spiess-theta.vercel.app</span>
              </div>
            </a>
          </article>
          <article class="gcard ref-card reveal d1">
            <a class="ref-link" href="https://www.instagram.com/room23.tattoo.art/" target="_blank" rel="noopener">
              <div class="gimg"><img src="assets/img/ref-2.jpg" alt="Startseite der Website von Room 23 – Tattoo Art Studio" loading="lazy"></div>
              <div class="gbody">
                <span class="gcat">Tattoo · Art Studio</span>
                <h3>Room 23 <span class="ref-go" aria-hidden="true">→</span></h3>
                <p>Privates Fineline-Studio in Lübeck: mehrseitig, mit eigenem Logo-Monogramm, Studio-Galerie und moderner „Ink"-Animation auf jeder Seite – in einer warmen, edlen Quiet-Luxury-Ästhetik.</p>
                <span class="ref-url">@room23.tattoo.art</span>
              </div>
            </a>
          </article>
        </div>
        <p class="reveal" style="margin-top:40px;color:var(--muted);font-size:0.95rem">Diskretion gehört zu unserem Handwerk: Weitere Projekte zeigen wir gern im persönlichen Gespräch.</p>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Ihr Projekt könnte das <em>nächste</em> sein.</h2>
        <p class="reveal d1"><a class="btn btn-solid" href="kontakt.html">Projekt anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== KONTAKT
PAGES["kontakt.html"] = {
  "title": "Kontakt – Projekt anfragen | InnoWeb",
  "desc": "Projekt anfragen bei InnoWeb: Erzählen Sie uns von Ihrer Marke – wir antworten persönlich. Webdesign für Norddeutschland.",
  "active": "kontakt.html",
  "body": page_hero_cine("kontakt", "Kontakt", "Erzählen Sie uns von Ihrer <em>Marke.</em>",
    "Ein kurzes Formular genügt – wir melden uns persönlich, meist innerhalb eines Werktages.", video=False) + '''
    <section class="section-tight">
      <div class="container split" style="align-items:start">
        <div>
          <form data-validate novalidate>
            <div class="form-grid">
              <div class="field"><label for="f-name">Name *</label><input id="f-name" name="name" type="text" autocomplete="name" required><span class="field-error">Bitte nennen Sie uns Ihren Namen.</span></div>
              <div class="field"><label for="f-firma">Unternehmen</label><input id="f-firma" name="firma" type="text" autocomplete="organization"></div>
              <div class="field"><label for="f-email">E-Mail *</label><input id="f-email" name="email" type="email" autocomplete="email" required><span class="field-error">Bitte geben Sie eine gültige E-Mail-Adresse an.</span></div>
              <div class="field"><label for="f-thema">Anliegen *</label><select id="f-thema" name="thema" required><option value="">Bitte wählen …</option><option>Neue Website</option><option>Relaunch</option><option>Shop</option><option>Pflege &amp; Hosting</option><option>Etwas anderes</option></select><span class="field-error">Bitte wählen Sie ein Anliegen.</span></div>
              <div class="field full"><label for="f-msg">Ihre Nachricht *</label><textarea id="f-msg" name="nachricht" placeholder="Ein paar Zeilen genügen: Wer sind Sie, was schwebt Ihnen vor?" required></textarea><span class="field-error">Bitte schreiben Sie uns ein paar Zeilen.</span></div>
              <div class="field full consent-wrap"><label class="consent"><input type="checkbox" name="consent" required><span>Ich habe die <a href="datenschutz.html">Datenschutzerklärung</a> gelesen und bin mit der Verarbeitung meiner Angaben zur Beantwortung der Anfrage einverstanden. *</span></label><span class="field-error">Bitte bestätigen Sie die Datenschutzerklärung.</span></div>
            </div>
            <p style="margin-top:30px"><button class="btn btn-solid" type="submit">Anfrage senden</button></p>
            <div class="form-note" role="status">Vielen Dank. Ihre Nachricht ist angekommen – wir antworten persönlich, meist innerhalb eines Werktages.</div>
          </form>
        </div>
        <div>
          ''' + MAIL + '''
          <ul class="contact-list">
            <li><div class="cl-label">E-Mail</div><div class="cl-val">[PLATZHALTER: hallo@innoweb.de]</div></li>
            <li><div class="cl-label">Telefon</div><div class="cl-val">[PLATZHALTER: Rufnummer]</div></li>
            <li><div class="cl-label">Studio</div><div class="cl-val">[PLATZHALTER: Adresse]<br>Norddeutschland</div></li>
            <li><div class="cl-label">Antwortzeit</div><div class="cl-val">Meist innerhalb<br>eines Werktages</div></li>
          </ul>
        </div>
      </div>
    </section>
'''}

# ==================================================================== IMPRESSUM / DATENSCHUTZ
PAGES["impressum.html"] = {
  "title": "Impressum | InnoWeb",
  "desc": "Impressum der InnoWeb-Website.",
  "active": "",
  "body": page_hero("Impressum", "Impressum", "Angaben gemäß § 5 TMG / § 18 MStV.") + '''
    <section class="section-tight">
      <div class="narrow">
        ''' + SEAL + '''
        <h3>Anbieter</h3>
        <p>[PLATZHALTER: InnoWeb – Rechtsform, Inhaber/Geschäftsführung]<br>[PLATZHALTER: Straße, PLZ Ort]<br>[PLATZHALTER: E-Mail, Telefon]</p>
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
  "title": "Datenschutz | InnoWeb",
  "desc": "Datenschutzerklärung der InnoWeb-Website.",
  "active": "",
  "body": page_hero("Datenschutz", "Datenschutz", "Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 DSGVO.") + '''
    <section class="section-tight">
      <div class="narrow">
        ''' + SEAL + '''
        <p style="color:var(--muted)"><em>Hinweis: Dieses Gerüst ist vor Veröffentlichung durch eine juristisch geprüfte Fassung zu ersetzen.</em></p>
        <h3>1. Verantwortlicher</h3>
        <p>[PLATZHALTER: InnoWeb, Anschrift, E-Mail]</p>
        <h3>2. Hosting &amp; Server-Logs</h3>
        <p>Diese Website wird in Deutschland gehostet. [PLATZHALTER: Hosting-Anbieter, Logdaten, Speicherdauer, Art. 6 Abs. 1 lit. f DSGVO]</p>
        <h3>3. Kontaktformular</h3>
        <p>Bei Nutzung des Formulars verarbeiten wir Ihre Angaben zur Beantwortung der Anfrage (Art. 6 Abs. 1 lit. b DSGVO). [PLATZHALTER: Empfänger, Speicherdauer]</p>
        <h3>4. Eingebundene Dienste</h3>
        <p>Diese Website bindet Google Fonts ein; dabei wird Ihre IP-Adresse an Google übertragen. [PLATZHALTER: ggf. lokale Einbindung; weitere Dienste dokumentieren]</p>
        <h3>5. Ihre Rechte</h3>
        <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei der zuständigen Aufsichtsbehörde.</p>
      </div>
    </section>
'''}

for fname, cfg in PAGES.items():
    CINE = {"index.html","leistungen.html","sicherheit.html","arbeitsweise.html","ueber-uns.html","referenzen.html","kontakt.html"}
    body_class = "cine" if fname in CINE else ""
    html = head(cfg["title"], cfg["desc"], body_class) + header(cfg["active"]) + cfg["body"] + FOOTER.replace("__MONO__", MONOGRAM)
    open(os.path.join(ROOT, fname), "w", encoding="utf-8").write(html)
    print("wrote", fname, len(html))
print("done")
