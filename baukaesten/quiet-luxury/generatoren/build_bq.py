# -*- coding: utf-8 -*-
"""Generiert die mehrseitige Buchtquartier-Website (Ferienvermietung, Luebecker Bucht).
Quelle: buchtquartier.de (Fakten, Farben, Logo). Texte eigenstaendig formuliert.
Unbelegtes ist als [PLATZHALTER] markiert. Bauweise wie InnoWeb/Room23."""
import os
ROOT = "/home/user/Web-Projekte/buchtquartier"

NAV = [("index.html","Start"),("apartments.html","Apartments"),("eigentuemer.html","Eigentümer"),
       ("region.html","Region"),("ueber-uns.html","Über uns")]

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
  <link rel="icon" type="image/png" href="assets/img/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
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
      <a class="brand" href="index.html" aria-label="Buchtquartier – Startseite">
        <img class="logo-plate" src="assets/img/logo.png" alt="Buchtquartier – zwischen Bucht und Ruhe" width="1232" height="409">
      </a>
      <a class="header-cta" href="buchen.html">
        <span>Jetzt buchen</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </header>

  <div class="nav-overlay" id="nav-overlay" aria-hidden="true">
    <div class="nav-overlay-inner">
      <nav class="main-nav" aria-label="Hauptnavigation">
        <ul>
{items}        <li class="nav-contact-li"><a href="buchen.html"><span class="nl-num">·</span><span class="nl-label">Jetzt buchen</span></a></li>
        </ul>
        <div class="nav-overlay-foot">
          <span><a href="mailto:info@buchtquartier.de">info@buchtquartier.de</a></span>
          <span><a href="impressum.html">Impressum</a> &nbsp;·&nbsp; <a href="datenschutz.html">Datenschutz</a></span>
        </div>
      </nav>
      <div class="nav-visual" aria-hidden="true">
        <img src="assets/hero/index-poster.jpg" alt="" loading="lazy">
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
          <span class="footer-lockup"><img class="logo-plate logo-plate-sm" src="assets/img/logo.png" alt="Buchtquartier"></span>
          <p>Ferienvermietung an der Lübecker Bucht – Fachkompetenz trifft Gastfreundschaft. Zwischen Bucht und Ruhe.</p>
        </div>
        <div>
          <h4>Seiten</h4>
          <ul>
            <li><a href="apartments.html">Apartments</a></li>
            <li><a href="eigentuemer.html">Für Eigentümer</a></li>
            <li><a href="region.html">Die Region</a></li>
            <li><a href="ueber-uns.html">Über uns</a></li>
          </ul>
        </div>
        <div>
          <h4>Kontakt</h4>
          <ul>
            <li><a href="buchen.html">Jetzt buchen</a></li>
            <li><a href="mailto:info@buchtquartier.de">info@buchtquartier.de</a></li>
            <li>Zeiss-Straße 28 · Ratekau</li>
            <li>23626 Schleswig-Holstein</li>
          </ul>
        </div>
        <div>
          <h4>Rechtliches</h4>
          <ul>
            <li><a href="impressum.html">Impressum</a></li>
            <li><a href="datenschutz.html">Datenschutz</a></li>
            <li>[PLATZHALTER: AGB]</li>
            <li>[PLATZHALTER: Stornierungsbedingungen]</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> Buchtquartier · Philip Ferry Martin · Ratekau an der Lübecker Bucht</span>
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

# --- Grosse selbstzeichnende Bucht-Welle (Logo-Motiv) fuer den Index-Hero ---
WAVE_HERO = '''<svg class="wavehero-svg icon-draw" data-draw viewBox="0 0 520 220" fill="none" aria-hidden="true">
          <path class="dl" d="M10 150 C 110 70, 190 74, 260 118 C 320 156, 420 152, 510 96"/>
          <path class="dl dl-gold" d="M40 176 C 150 120, 240 122, 310 150 C 380 178, 460 168, 505 140"/>
          <path class="dl" d="M120 106 C 160 84, 200 82, 236 98" opacity="0.6"/>
          <circle class="dl dl-gold" cx="500" cy="98" r="3.5"/>
        </svg>'''

# --- Wellen-Trenner ---
WAVE = '''<svg class="wave-svg icon-draw" data-draw viewBox="0 0 240 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path class="dl" d="M6 28 C 46 10, 86 12, 120 24 S 196 38 234 18"/>
          <path class="dl dl-gold" d="M28 34 C 68 20, 120 22, 152 30 S 214 36 236 28" opacity="0.75"/>
        </svg>'''

# --- Werte-Icons (zeichnen sich beim Scrollen) ---
def ico(inner):
    return ('<div class="fl-ico icon-draw" data-draw aria-hidden="true">'
            '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg></div>')

ICO_CLEAN  = ico('<path class="dl" d="M20 8 C 20 20, 14 24, 14 34 a18 18 0 0 0 36 0 C 50 24, 44 20, 44 8"/><path class="dl dl-gold" d="M24 36 C 28 42, 36 42, 40 36"/><path class="dl" d="M32 52 V58"/>')
ICO_HOME   = ico('<path class="dl" d="M10 30 L32 12 L54 30"/><path class="dl" d="M16 26 V52 H48 V26"/><rect class="dl dl-gold" x="27" y="38" width="10" height="14"/>')
ICO_CHAT   = ico('<rect class="dl" x="8" y="12" width="34" height="26" rx="4"/><path class="dl" d="M16 44 L16 38"/><path class="dl dl-gold" d="M16 22 H34 M16 29 H28"/><path class="dl" d="M46 24 h6 a4 4 0 0 1 4 4 v16 a4 4 0 0 1 -4 4 h-2 v6 l-8 -6 h-8"/>')
ICO_PRICE  = ico('<circle class="dl" cx="26" cy="26" r="16"/><path class="dl dl-gold" d="M26 18 V34 M20 22 C 20 19, 32 19, 32 24 C 32 29, 20 29, 20 33 C 20 37, 32 37, 32 34"/><path class="dl" d="M40 40 L54 54 M47 47 L42 52"/>')
ICO_FLOW   = ico('<path class="dl" d="M10 16 H38 A8 8 0 0 1 38 32 H22 A8 8 0 0 0 22 48 H54"/><path class="dl dl-gold" d="M46 40 L54 48 L46 56"/>')

MAIL = '''<div class="mail-sig icon-draw" data-draw aria-hidden="true">
          <svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg">
            <rect class="dl" x="16" y="38" width="180" height="92" rx="3"/>
            <path class="dl" d="M16 42l90 56 90-56"/>
            <path class="dl dl-gold" d="M208 84 C 244 74, 266 52, 296 22"/>
            <path class="dl dl-gold" d="M280 30 C 288 26, 294 20, 298 12 M286 40 C 294 38, 302 34, 308 28"/>
          </svg>
        </div>'''

SEAL = '''<div class="seal icon-draw" data-draw aria-hidden="true">
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <circle class="dl dl-gold" cx="40" cy="40" r="36"/>
            <circle class="dl" cx="40" cy="40" r="28" opacity="0.45"/>
            <text class="seal-p" x="40" y="52" text-anchor="middle">§</text>
          </svg>
        </div>'''

DOTS = '<div class="dotline" data-draw aria-hidden="true">' + '<span></span>'*13 + '</div>'

PAGES = {}

# ==================================================================== INDEX
PAGES["index.html"] = {
  "title": "Buchtquartier – Ferienvermietung an der Lübecker Bucht · zwischen Bucht und Ruhe",
  "desc": "Buchtquartier ist Ihre Ferienvermietung an der Lübecker Bucht: hochwertige Apartments, professionelle Betreuung und echte Gastfreundschaft – zwischen Bucht und Ruhe.",
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
          <p class="eyebrow reveal">Ferienvermietung · Lübecker Bucht</p>
          <h1 class="reveal d1">Zwischen Bucht und <em>Ruhe.</em></h1>
          <p class="hero-sub reveal d2">Hochwertige Ferien-Apartments an der Ostsee – professionell betreut, liebevoll eingerichtet, verlässlich organisiert.</p>
          <div class="hero-actions reveal d3">
            <a class="btn btn-solid" href="buchen.html">Jetzt buchen</a>
            <a class="btn btn-line" href="apartments.html">Apartments ansehen</a>
          </div>
          <div class="trust-row reveal d4">
            <span>Fachkräfte im Tourismus</span>
            <span>Persönliche Betreuung</span>
            <span>Qualität statt Masse</span>
          </div>
        </div>
        <div class="wire-wrap reveal d2" style="display:flex;justify-content:center">
          ''' + WAVE_HERO + '''
        </div>
      </div>
      <div class="scroll-cue" aria-hidden="true"><span></span></div>
    </section>

    <!-- ============ 2 · MANIFEST ============ -->
    <section class="section manifest">
      <div class="narrow reveal">
        <div class="rule"></div>
        <p>Wir vermieten keine Schlüssel –<br>wir schenken <em>Urlaubsgefühl.</em></p>
      </div>
    </section>

    <!-- ============ 3 · WILLKOMMEN ============ -->
    <section class="section-tight">
      <div class="container split reverse" style="align-items:center">
        <div class="split-media figure-wide parallax reveal">
          <img src="assets/hero/apartments-poster.jpg" alt="Helles Küsten-Apartment mit Creme- und Navy-Tönen" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Willkommen bei Buchtquartier</p>
          <h2 class="reveal d1">Fachkompetenz trifft<br><em>Gastfreundschaft.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Wir sind qualifizierte Fachkräfte im Tourismus- und Freizeitbereich – mit Branchenwissen und hohem Anspruch an Qualität. Unsere Gäste bekommen nicht nur eine schöne Unterkunft, sondern ein rundum gelungenes Aufenthaltserlebnis: Komfort, Verlässlichkeit und individuelle Betreuung.</p>
          <p class="reveal d3"><a class="link-gold" href="ueber-uns.html">Mehr über uns</a></p>
        </div>
      </div>
    </section>

    <!-- ============ 4 · WERTE (dunkel) ============ -->
    <section class="section dark">
      <div class="container">
        <p class="eyebrow reveal">Worauf Sie sich verlassen können</p>
        <h2 class="reveal d1">Fünf Versprechen.<br>Jeden Aufenthalt.</h2>
        <div class="chips reveal d2" style="margin-top:40px">
          <span class="chip">Professionelle Reinigung</span><span class="chip">Hochwertige Ausstattung</span>
          <span class="chip">Klare Kommunikation</span><span class="chip">Faire Preise</span>
          <span class="chip">Reibungsloser Ablauf</span>
        </div>
        <p class="reveal d3" style="margin-top:40px"><a class="link-gold" href="ueber-uns.html">Unsere Standards im Detail</a></p>
      </div>
    </section>

    <!-- ============ 5 · APARTMENTS (Teaser) ============ -->
    <section class="section section-tight">
      <div class="container">
        <p class="eyebrow reveal">Unsere Unterkünfte</p>
        <h2 class="reveal d1">Ankommen und <em>aufatmen.</em></h2>
        <div class="gallery" style="margin-top:52px">
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/hero/apartments-poster.jpg" alt="Wohnbereich eines Buchtquartier-Apartments" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Apartment</span><h3>[PLATZHALTER: Apartment-Name]</h3><p>[PLATZHALTER: Lage, Größe, Personenzahl]</p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/hero/ueber-uns-poster.jpg" alt="Liebevoll vorbereitete Gästedetails" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Apartment</span><h3>[PLATZHALTER: Apartment-Name]</h3><p>[PLATZHALTER: Lage, Größe, Personenzahl]</p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/hero/region-poster.jpg" alt="Seebrücke an der Lübecker Bucht" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Lage</span><h3>Direkt an der Bucht</h3><p>Strand, Seebrücken und Ostseeluft – wenige Minuten entfernt.</p></div>
          </article>
        </div>
        <p class="reveal" style="margin-top:40px"><a class="link-gold" href="apartments.html">Alle Apartments</a></p>
      </div>
    </section>

    <!-- ============ 6 · EIGENTÜMER (Teaser) ============ -->
    <section class="section" style="background:var(--paper-2)">
      <div class="container split" style="align-items:center">
        <div class="split-media figure-wide parallax reveal">
          <img src="assets/hero/eigentuemer-poster.jpg" alt="Schlüsselübergabe" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Sie sind Eigentümer?</p>
          <h2 class="reveal d1">Wir kümmern uns<br>um <em>alles.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Von der Vermarktung über die Gästekommunikation bis zu Reinigung und Instandhaltung: Buchtquartier betreut Ihre Ferienimmobilie an der Lübecker Bucht professionell – für optimale Auslastung und einen stressfreien Vermietungsprozess.</p>
          <p class="reveal d3"><a class="link-gold" href="eigentuemer.html">Eigentümer-Service entdecken</a></p>
        </div>
      </div>
    </section>

    <!-- ============ 7 · CTA ============ -->
    <section class="section dark cta-final">
      <div class="narrow">
        <p class="eyebrow reveal">Der nächste Urlaub</p>
        <h2 class="reveal d1">Die Bucht wartet <em>schon.</em></h2>
        <p class="reveal d2"><a class="btn btn-solid" href="buchen.html">Jetzt buchen</a></p>
      </div>
    </section>
'''}

# ==================================================================== APARTMENTS
PAGES["apartments.html"] = {
  "title": "Apartments – Ferienwohnungen an der Lübecker Bucht | Buchtquartier",
  "desc": "Die Ferien-Apartments von Buchtquartier an der Lübecker Bucht: hochwertig ausgestattet, professionell gereinigt, liebevoll vorbereitet.",
  "active": "apartments.html",
  "body": page_hero_cine("apartments", "Apartments", "Ankommen und <em>aufatmen.</em>",
    "Jedes Buchtquartier-Apartment ist hochwertig ausgestattet, professionell gereinigt und mit Liebe zum Detail vorbereitet – damit der Urlaub mit dem Aufschließen beginnt.") + '''
    <section class="section-tight">
      <div class="container">
        ''' + DOTS + '''
        <div class="gallery tilt">
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/hero/apartments-poster.jpg" alt="Wohnbereich mit Creme-Sofa und Navy-Kissen" loading="lazy"></div>
            <div class="gbody"><span class="gcat">[PLATZHALTER: Ort]</span><h3>[PLATZHALTER: Apartment-Name]</h3><p>[PLATZHALTER: Größe · Schlafzimmer · Personen · Ausstattung]</p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/hero/ueber-uns-poster.jpg" alt="Gäste-Details mit frischen Handtüchern" loading="lazy"></div>
            <div class="gbody"><span class="gcat">[PLATZHALTER: Ort]</span><h3>[PLATZHALTER: Apartment-Name]</h3><p>[PLATZHALTER: Größe · Schlafzimmer · Personen · Ausstattung]</p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/hero/buchen-poster.jpg" alt="Arbeitsplatz am Fenster mit Meerblick" loading="lazy"></div>
            <div class="gbody"><span class="gcat">[PLATZHALTER: Ort]</span><h3>[PLATZHALTER: Apartment-Name]</h3><p>[PLATZHALTER: Größe · Schlafzimmer · Personen · Ausstattung]</p></div>
          </article>
        </div>
        <p class="reveal" style="margin-top:40px;color:var(--muted);font-size:0.95rem">[PLATZHALTER: Diese Übersicht mit den echten Apartments samt Fotos, Ausstattung und Belegungskalender befüllen – Buchung läuft über Smoobu.]</p>
      </div>
    </section>

    <section class="section manifest" style="background:var(--paper-2)">
      <div class="narrow reveal">
        ''' + WAVE + '''
        <p>Jedes Detail geprüft,<br>jeder Aufenthalt <em>vorbereitet.</em></p>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Ihr Lieblingsplatz an der <em>Bucht.</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="buchen.html">Verfügbarkeit prüfen</a></p>
      </div>
    </section>
'''}

# ==================================================================== EIGENTUEMER
PAGES["eigentuemer.html"] = {
  "title": "Für Eigentümer – Professionelle Ferienvermietung | Buchtquartier",
  "desc": "Buchtquartier betreut Ihre Ferienimmobilie an der Lübecker Bucht: Vermarktung, Gästekommunikation, Reinigung und Instandhaltung – aus einer Hand.",
  "active": "eigentuemer.html",
  "body": page_hero_cine("eigentuemer", "Eigentümer", "Ihre Immobilie.<br>Unsere <em>Verantwortung.</em>",
    "Sie besitzen eine Ferienimmobilie an der Lübecker Bucht oder im Umland? Wir sorgen für professionelle Betreuung, optimale Auslastung – und Gäste, die wiederkommen.") + '''
    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Alles aus einer Hand</p>
        <h2 class="reveal d1">So betreuen wir Ihr Objekt</h2>
        <div class="tl" data-timeline style="margin-top:52px">
          <span class="tl-line" aria-hidden="true"></span>
          <div class="layers">
          <div class="layer reveal"><span class="layer-num">1</span><div class="layer-body"><h3>Kennenlernen &amp; Konzept</h3><p>Wir besichtigen Ihre Immobilie, beraten zu Ausstattung und Preisgestaltung und entwickeln ein Vermietungskonzept, das zu Objekt und Zielgruppe passt.</p></div><span class="layer-tag">Start</span></div>
          <div class="layer reveal d1"><span class="layer-num">2</span><div class="layer-body"><h3>Vermarktung</h3><p>Professionelle Präsentation und Sichtbarkeit auf den relevanten Buchungskanälen – für eine optimale Auslastung Ihrer Ferienimmobilie.</p></div><span class="layer-tag">Sichtbarkeit</span></div>
          <div class="layer reveal d2"><span class="layer-num">3</span><div class="layer-body"><h3>Gästekommunikation</h3><p>Von der Anfrage bis zum Check-out: Wir übernehmen die komplette Kommunikation – schnell, freundlich und verlässlich.</p></div><span class="layer-tag">Service</span></div>
          <div class="layer reveal d3"><span class="layer-num">4</span><div class="layer-body"><h3>Reinigung &amp; Instandhaltung</h3><p>Professionelle Reinigung nach jedem Aufenthalt und ein wachsames Auge auf den Zustand Ihrer Immobilie – damit jedes Detail stimmt.</p></div><span class="layer-tag">Qualität</span></div>
          <div class="layer reveal d4"><span class="layer-num">5</span><div class="layer-body"><h3>Transparente Abrechnung</h3><p>Klare Prozesse und nachvollziehbare Abrechnungen – Sie behalten jederzeit den Überblick über Auslastung und Erträge.</p></div><span class="layer-tag">Vertrauen</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section manifest" style="background:var(--paper-2)">
      <div class="narrow reveal">
        <div class="rule"></div>
        <p>Qualität statt Masse – denn ein gelungener Aufenthalt<br>beginnt mit <em>Vertrauen.</em></p>
      </div>
    </section>

    <section class="section-tight">
      <div class="container split" style="align-items:center">
        <div class="split-media figure-wide parallax reveal">
          <img src="assets/hero/eigentuemer-poster.jpg" alt="Schlüsselübergabe an Buchtquartier" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Warum Buchtquartier</p>
          <h2 class="reveal d1">Vermietung mit<br><em>Verantwortung.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Unsere Agentur ist aus einer klaren Erkenntnis entstanden: In vielen Vermietungen werden entscheidende Qualitätsfaktoren nicht konsequent priorisiert. Genau hier setzen wir an – mit strukturierten Abläufen, klarer Kommunikation und einem kompromisslosen Qualitätsanspruch.</p>
          <p class="reveal d3" style="color:var(--muted)">Profitieren Sie von Erfahrung, Transparenz und regionaler Expertise, während Ihre Gäste einen unvergesslichen Aufenthalt genießen.</p>
          <p class="reveal d4"><a class="link-gold" href="buchen.html">Unverbindlich anfragen</a></p>
        </div>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Lassen Sie Ihre Immobilie <em>arbeiten.</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="buchen.html">Eigentümer-Gespräch anfragen</a></p>
      </div>
    </section>
'''}

# ==================================================================== REGION
PAGES["region.html"] = {
  "title": "Die Region – Lübecker Bucht & Ostsee | Buchtquartier",
  "desc": "Die Lübecker Bucht: Strände, Seebrücken, Natur und Hansestadt-Flair – die Region rund um Ihre Buchtquartier-Unterkunft.",
  "active": "region.html",
  "body": page_hero_cine("region", "Region", "Die Bucht vor der <em>Tür.</em>",
    "Feine Strände, Seebrücken und Ostseeluft – dazu Lübecks Altstadt in Reichweite: Die Lübecker Bucht ist zu jeder Jahreszeit eine Reise wert.") + '''
    <section class="section-tight">
      <div class="container">
        <p class="eyebrow reveal">Zwischen Ostsee und Hansestadt</p>
        <h2 class="reveal d1">Was die Region besonders macht</h2>
        <div class="gallery" style="margin-top:52px">
          <article class="gcard reveal">
            <div class="gimg"><img src="assets/hero/region-poster.jpg" alt="Seebrücke an der Ostsee" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Küste</span><h3>Strände &amp; Seebrücken</h3><p>Von Timmendorfer Strand bis Grömitz: kilometerlange Strände und Seebrücken direkt an der Bucht.</p></div>
          </article>
          <article class="gcard reveal d1">
            <div class="gimg"><img src="assets/hero/index-poster.jpg" alt="Strandkörbe am Ostseestrand" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Erholung</span><h3>Ostseeluft &amp; Ruhe</h3><p>Dünengras, Strandkörbe und Wellenrauschen – Erholung, die schon am ersten Tag wirkt.</p></div>
          </article>
          <article class="gcard reveal d2">
            <div class="gimg"><img src="assets/hero/buchen-poster.jpg" alt="Gemütlicher Platz am Fenster" loading="lazy"></div>
            <div class="gbody"><span class="gcat">Kultur</span><h3>Lübeck &amp; Umland</h3><p>Die Altstadt der Hansestadt, Marzipan und Backsteingotik – nur eine kurze Fahrt entfernt.</p></div>
          </article>
        </div>
        <div class="chips reveal" style="margin-top:44px">
          <span class="chip">Timmendorfer Strand</span><span class="chip">Scharbeutz</span><span class="chip">Ratekau</span>
          <span class="chip">Lübeck</span><span class="chip">Grömitz</span><span class="chip">Lübecker Bucht</span>
        </div>
      </div>
    </section>

    <section class="section manifest" style="background:var(--paper-2)">
      <div class="narrow reveal">
        ''' + WAVE + '''
        <p>Meerblick ist schön.<br>Meergefühl ist <em>schöner.</em></p>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Bereit für <em>Buchtluft?</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="buchen.html">Jetzt buchen</a></p>
      </div>
    </section>
'''}

# ==================================================================== UEBER UNS
PAGES["ueber-uns.html"] = {
  "title": "Über uns – Das Gastgeberkonzept von Buchtquartier",
  "desc": "Buchtquartier steht für moderne Gastfreundschaft mit persönlichem Anspruch: qualifizierte Tourismus-Fachkräfte, klare Standards, echte Verlässlichkeit.",
  "active": "ueber-uns.html",
  "body": page_hero_cine("ueber-uns", "Über uns", "Gastgeber aus <em>Überzeugung.</em>",
    "Hinter Buchtquartier steht mehr als die Vermietung einer Unterkunft: ein durchdachtes Gastgeberkonzept mit fachlicher Kompetenz und regionaler Verbundenheit.") + '''
    <section class="section-tight">
      <div class="container split" style="align-items:start">
        <div class="split-media figure-tall parallax reveal">
          <img src="assets/hero/ueber-uns-poster.jpg" alt="Liebevoll vorbereitete Details für Gäste" loading="lazy">
        </div>
        <div>
          <p class="eyebrow reveal">Unser Konzept</p>
          <h2 class="reveal d1">Moderne Gastfreundschaft<br>mit <em>Anspruch.</em></h2>
          <p class="reveal d2" style="color:var(--muted)">Als ausgebildete Fachkräfte im Bereich Tourismus und Freizeit verbinden wir fundiertes Fachwissen mit ausgeprägter Serviceorientierung. Unser Ziel: eine Unterkunft, in der sich Gäste vom ersten Moment an wohlfühlen – und Aufenthalte, die in positiver Erinnerung bleiben und gern weiterempfohlen werden.</p>
          <p class="reveal d3" style="color:var(--muted)">Inhaber: Philip Ferry Martin · Ratekau an der Lübecker Bucht. [PLATZHALTER: Team-Vorstellung mit Fotos ergänzen]</p>
        </div>
      </div>
    </section>

    <section class="section" style="background:var(--paper-2)">
      <div class="container">
        <p class="eyebrow reveal">Unsere Standards</p>
        <h2 class="reveal d1">Worauf wir besonderen Wert legen</h2>
        <ul class="flist" style="margin-top:52px">
          <li class="reveal"><span class="fl-idx">01</span>''' + ICO_CLEAN + '''<div><h3>Professionelle Reinigung</h3><p>Gründlich, dokumentiert und nach klaren Hygienestandards – nach jedem einzelnen Aufenthalt.</p></div></li>
          <li class="reveal"><span class="fl-idx">02</span>''' + ICO_HOME + '''<div><h3>Hochwertige Ausstattung</h3><p>Gepflegte, komplett ausgestattete Unterkünfte, in denen vom ersten Moment an alles funktioniert.</p></div></li>
          <li class="reveal"><span class="fl-idx">03</span>''' + ICO_CHAT + '''<div><h3>Klare Kommunikation</h3><p>Verlässliche Erreichbarkeit und schnelle Antworten – vor, während und nach dem Aufenthalt.</p></div></li>
          <li class="reveal"><span class="fl-idx">04</span>''' + ICO_PRICE + '''<div><h3>Faire Preisgestaltung</h3><p>Transparente Preise ohne Überraschungen – Qualität, die ihr Geld wert ist.</p></div></li>
          <li class="reveal"><span class="fl-idx">05</span>''' + ICO_FLOW + '''<div><h3>Reibungsloser Ablauf</h3><p>Vom Check-in bis zur Abreise: strukturierte Abläufe, die Urlaub einfach machen.</p></div></li>
        </ul>
      </div>
    </section>

    <section class="section manifest">
      <div class="narrow reveal">
        <div class="rule"></div>
        <p>Ferienvermietung ist für uns keine Schlüsselübergabe –<br>sondern eine Dienstleistung mit <em>Verantwortung.</em></p>
      </div>
    </section>

    <section class="section dark cta-final">
      <div class="narrow">
        <h2 class="reveal">Lernen wir uns <em>kennen.</em></h2>
        <p class="reveal d1"><a class="btn btn-solid" href="buchen.html">Kontakt aufnehmen</a></p>
      </div>
    </section>
'''}

# ==================================================================== BUCHEN
PAGES["buchen.html"] = {
  "title": "Buchen & Kontakt | Buchtquartier – Lübecker Bucht",
  "desc": "Jetzt bei Buchtquartier anfragen oder buchen: Ferien-Apartments an der Lübecker Bucht. Wir antworten persönlich und schnell.",
  "active": "",
  "body": page_hero_cine("buchen", "Buchen", "Der Urlaub beginnt <em>hier.</em>",
    "Fragen Sie Ihren Wunschtermin an oder schreiben Sie uns – wir melden uns persönlich. Auch Eigentümer sind herzlich willkommen.") + '''
    <section class="section-tight">
      <div class="container split" style="align-items:start">
        <div>
          <div class="needle-line" data-draw aria-hidden="true"><span></span></div>
          <form data-validate novalidate>
            <div class="form-grid">
              <div class="field"><label for="f-name">Name *</label><input id="f-name" name="name" type="text" autocomplete="name" required><span class="field-error">Bitte nennen Sie uns Ihren Namen.</span></div>
              <div class="field"><label for="f-email">E-Mail *</label><input id="f-email" name="email" type="email" autocomplete="email" required><span class="field-error">Bitte geben Sie eine gültige E-Mail-Adresse an.</span></div>
              <div class="field"><label for="f-thema">Anliegen *</label><select id="f-thema" name="thema" required><option value="">Bitte wählen …</option><option>Buchungsanfrage</option><option>Frage zur Buchung</option><option>Ich bin Eigentümer</option><option>Etwas anderes</option></select><span class="field-error">Bitte wählen Sie ein Anliegen.</span></div>
              <div class="field"><label for="f-zeitraum">Wunschzeitraum</label><input id="f-zeitraum" name="zeitraum" type="text" placeholder="z. B. 10.–17. August, 2 Personen"></div>
              <div class="field full"><label for="f-msg">Ihre Nachricht *</label><textarea id="f-msg" name="nachricht" placeholder="Ein paar Zeilen genügen – wir kümmern uns um den Rest." required></textarea><span class="field-error">Bitte schreiben Sie uns ein paar Zeilen.</span></div>
              <div class="field full consent-wrap"><label class="consent"><input type="checkbox" name="consent" required><span>Ich habe die <a href="datenschutz.html">Datenschutzerklärung</a> gelesen und bin mit der Verarbeitung meiner Angaben zur Beantwortung der Anfrage einverstanden. *</span></label><span class="field-error">Bitte bestätigen Sie die Datenschutzerklärung.</span></div>
            </div>
            <p style="margin-top:30px"><button class="btn btn-solid" type="submit">Anfrage senden</button></p>
            <div class="form-note" role="status">Vielen Dank! Ihre Anfrage ist angekommen – wir melden uns persönlich.</div>
          </form>
        </div>
        <div>
          ''' + MAIL + '''
          <ul class="contact-list">
            <li><div class="cl-label">E-Mail</div><div class="cl-val"><a href="mailto:info@buchtquartier.de" style="color:inherit">info@buchtquartier.de</a></div></li>
            <li><div class="cl-label">Online buchen</div><div class="cl-val">[PLATZHALTER: Smoobu-Buchungslink einbinden]</div></li>
            <li><div class="cl-label">Adresse</div><div class="cl-val">Zeiss-Straße 28<br>23626 Ratekau</div></li>
            <li><div class="cl-label">Antwortzeit</div><div class="cl-val">Persönlich &amp;<br>schnellstmöglich</div></li>
          </ul>
        </div>
      </div>
    </section>
'''}

# ==================================================================== IMPRESSUM / DATENSCHUTZ
PAGES["impressum.html"] = {
  "title": "Impressum | Buchtquartier",
  "desc": "Impressum der Buchtquartier-Website.",
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
        <p>Buchtquartier – Ferienvermietung<br>Philip Ferry Martin<br>Zeiss-Straße 28<br>23626 Ratekau, Schleswig-Holstein<br><a href="mailto:info@buchtquartier.de">info@buchtquartier.de</a><br>[PLATZHALTER: Telefon, Rechtsform]</p>
        <h3>Umsatzsteuer</h3>
        <p>[PLATZHALTER: USt-IdNr. bzw. Hinweis Kleinunternehmerregelung]</p>
        <h3>Streitbeilegung</h3>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        <p style="color:var(--muted);font-size:0.92rem"><em>Hinweis: Vor Veröffentlichung vollständig befüllen und rechtlich prüfen.</em></p>
      </div>
    </section>
'''}

PAGES["datenschutz.html"] = {
  "title": "Datenschutz | Buchtquartier",
  "desc": "Datenschutzerklärung der Buchtquartier-Website.",
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
        <p>Buchtquartier, Philip Ferry Martin, Zeiss-Straße 28, 23626 Ratekau · <a href="mailto:info@buchtquartier.de">info@buchtquartier.de</a></p>
        <h3>2. Hosting &amp; Server-Logs</h3>
        <p>[PLATZHALTER: Hosting-Anbieter, Logdaten, Speicherdauer, Art. 6 Abs. 1 lit. f DSGVO]</p>
        <h3>3. Anfrage- &amp; Buchungsformular</h3>
        <p>Bei Nutzung des Formulars verarbeiten wir Ihre Angaben zur Beantwortung der Anfrage bzw. Abwicklung der Buchung (Art. 6 Abs. 1 lit. b DSGVO). [PLATZHALTER: Buchungssystem Smoobu dokumentieren]</p>
        <h3>4. Eingebundene Dienste</h3>
        <p>Diese Website bindet Google Fonts ein; dabei wird Ihre IP-Adresse an Google übertragen. [PLATZHALTER: Smoobu, ggf. Karten-Dienst dokumentieren]</p>
        <h3>5. Ihre Rechte</h3>
        <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Beschwerde bei der zuständigen Aufsichtsbehörde.</p>
      </div>
    </section>
'''}

CINE = {"index.html","apartments.html","eigentuemer.html","region.html","ueber-uns.html","buchen.html"}
for fname, cfg in PAGES.items():
    body_class = "cine" if fname in CINE else ""
    html = head(cfg["title"], cfg["desc"], body_class) + header(cfg["active"]) + cfg["body"] + FOOTER
    open(os.path.join(ROOT, fname), "w", encoding="utf-8").write(html)
    print("wrote", fname, len(html))
print("done")
