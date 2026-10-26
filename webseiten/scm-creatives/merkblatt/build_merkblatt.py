#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kunden-Merkblatt „Werbekosten absetzen“ für SCM Creatives (A4, PDF).

Alle Zahlen der Modellrechnung rechnet steuer2026.py aus, nichts ist von Hand
eingetragen. Annahmen stehen unten in BEISPIEL und erscheinen im Merkblatt.
Recherche und Belege: .preview-cache/scm/steuern/ (Gesetzestexte, Quellen) und
merkblatt/RECHERCHE.md. Schreibregeln: keine Gedankenstriche, Ansprache „ihr“,
nur belegte Aussagen, keine Aussagen zum Einzelfall (§ 2 Abs. 2 StBerG).

Aufruf:  python3 build_merkblatt.py   → merkblatt-werbekosten.html + PDF
"""
import datetime
import os
import shutil
import subprocess

import steuer2026 as st

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
OUT_HTML = os.path.join(HERE, "merkblatt-werbekosten.html")
OUT_PDF = os.path.join(HERE, "SCM-Creatives-Merkblatt-Werbekosten.pdf")
AUSLIEFERUNG = os.path.join(ROOT, "auslieferung", "SCM-Creatives-Merkblatt-Werbekosten.pdf")
STAND = "Oktober 2026"
JAHR = 2026

# ------------------------------------------------------------------
# Annahmen der Modellrechnung (stehen so im Merkblatt)
# ------------------------------------------------------------------
BEISPIEL = dict(
    umsatz=100_000,          # Jahresumsatz netto
    gewinn=40_000,           # Gewinn vor den Videokosten
    paket_monat=1_000,       # angenommener Paketpreis netto pro Monat (Rechenwert, kein Angebot)
    vorsorge=7_000,          # abziehbare Vorsorgeaufwendungen (Kranken-, Pflegeversicherung u. a.)
    ust=0.19,
)
GEMEINDE = "Kiel"
# Gewerbesteuer-Hebesatz Kiel 2026: 450 % (DIHK, Realsteuer-Hebesätze, Stand 01.07.2026,
# unverändert gegenüber 31.12.2025; IHK Schleswig-Holstein, Hebesatzumfrage 2025). Lübeck ebenfalls 450 %.
HEBESATZ = 450
VERGLEICH_GEWINNE = [25_000, 40_000, 60_000, 80_000, 110_000]

KONTAKT = dict(tel="0172 5361079", mail="scm.creatives@gmx.de", web="scm-creatives.de")

QUELLEN = [
    "§ 4 Abs. 4 und 5, § 5 Abs. 2 und 5, § 11, § 12, § 32a, § 35 EStG; § 8 Abs. 3 KStG; § 23 KStG; §§ 3, 4 SolZG; § 11 GewStG "
    "(Fassungen für 2026, gesetze-im-internet.de, Stand 25.10.2026)",
    "§ 3a Abs. 2, § 13b Abs. 1 und 5, § 14, § 15, § 18 Abs. 4a, § 19, § 27 Abs. 38 UStG; § 141, § 147 AO",
    "BMF-Schreiben zur E-Rechnung vom 15.10.2024, 15.10.2025 und 15.10.2026; BMF-FAQ E-Rechnung",
    "BMF-Schreiben zur Kleinunternehmerregelung vom 18.03.2025",
    "BFH, Urteil vom 16.02.2022, X R 2/21 (10-Tage-Regel: Zahlung und Fälligkeit im Zeitraum)",
    "FG Rheinland-Pfalz, Urteil vom 29.03.2012, 5 K 1815/10 (Imagefilm, unechte Auftragsproduktion, Sofortabzug)",
    "DIHK, Realsteuer-Hebesätze, Stand 01.07.2026 (Kiel und Lübeck: Gewerbesteuer 450 %)",
    "Meta Business-Hilfebereich: Umsatzsteuer auf Werbeanzeigen, USt-IdNr im Werbekonto; TikTok Ads Hilfe „EU & UK: VAT“",
    "Haufe, Anlage EÜR: Zeile „Werbekosten (z. B. Inserate, Werbespots, Plakate)“; DATEV-Standardkontenrahmen SKR03/SKR04",
]


# ------------------------------------------------------------------
# Hilfen
# ------------------------------------------------------------------
def eur(x, nachkomma=False):
    """Deutsches Zahlenformat: 1.234 € bzw. 1.234,56 €; Minus als echtes Minuszeichen."""
    neg = x < 0
    x = abs(x)
    if nachkomma:
        s = f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    else:
        s = f"{round(x):,}".replace(",", ".")
    return ("−" if neg and round(x) else "") + s + " €"


def pct(x, stellen=1):
    return f"{x * 100:.{stellen}f}".replace(".", ",") + " %"


GESAMT = 8


def run_head(nr):
    return (f'<div class="run"><img src="../public/img/logo-dark.svg" alt="SCM Creatives">'
            f'<span>Merkblatt Werbekosten · Stand {STAND}</span><span>Seite {nr} von {GESAMT}</span></div>')


def foot():
    return ('<div class="foot"><span><b>Allgemeine Information, keine Steuerberatung.</b> '
            'Ob und wie sich Ausgaben bei euch auswirken, klärt bitte mit eurer Steuerberatung.</span>'
            f'<span>SCM Creatives · {KONTAKT["web"]}</span></div>')


def page(nr, inhalt, cls=""):
    return f'<section class="page {cls}">{run_head(nr)}{inhalt}{foot()}</section>'


# ------------------------------------------------------------------
# Rechnungen
# ------------------------------------------------------------------
def rechnen():
    b = BEISPIEL
    jahr = b["paket_monat"] * 12
    ohne = st.einzelunternehmen(b["gewinn"], b["vorsorge"], HEBESATZ)
    mit = st.einzelunternehmen(b["gewinn"] - jahr, b["vorsorge"], HEBESATZ)
    ersparnis = ohne["summe"] - mit["summe"]
    g_ohne = st.gmbh(b["gewinn"], HEBESATZ)
    g_mit = st.gmbh(b["gewinn"] - jahr, HEBESATZ)
    vergleich = []
    for g in VERGLEICH_GEWINNE:
        o = st.einzelunternehmen(g, b["vorsorge"], HEBESATZ)
        m = st.einzelunternehmen(g - jahr, b["vorsorge"], HEBESATZ)
        e = o["summe"] - m["summe"]
        vergleich.append(dict(gewinn=g, ersparnis=e, quote=e / jahr, monat=(jahr - e) / 12))
    g_e = g_ohne["summe"] - g_mit["summe"]
    return dict(jahr=jahr, ohne=ohne, mit=mit, ersparnis=ersparnis, quote=ersparnis / jahr,
                belastung_monat=(jahr - ersparnis) / 12,
                g_ersparnis=g_e, g_quote=g_e / jahr, vergleich=vergleich)


# ------------------------------------------------------------------
# Seiten
# ------------------------------------------------------------------
def p_cover():
    return f'''<section class="page cover">
  <i class="vf tl"></i><i class="vf tr"></i><i class="vf bl"></i><i class="vf br"></i>
  <div class="rec">REC · MERKBLATT FÜR KUNDEN</div>
  <div class="top"><img src="../public/img/logo.svg" alt="SCM Creatives">
    <div class="stamp">Stand {STAND}<br>Steuerjahr {JAHR}</div></div>
  <div class="slate">Szene 00 · Werbekosten</div>
  <h1>Werbung,<br>die sich <em>rechnet.</em></h1>
  <p class="sub">Wie Betriebe die Kosten für Videos, Posts und Anzeigen steuerlich absetzen.
  Mit Modellrechnung für einen Betrieb mit {eur(BEISPIEL["umsatz"])} Jahresumsatz.</p>
  <div class="chips"><span>Betriebsausgaben</span><span>Vorsteuer</span><span>Werbeanzeigen</span><span>Modellrechnung</span><span>Checkliste</span></div>
  <div class="note"><span><b>Allgemeine Information, keine Steuerberatung.</b> SCM Creatives ist eine Social-Media-Agentur, kein
  Steuerberater, und darf keine Hilfe in Steuersachen leisten. Dieses Merkblatt erklärt die allgemeine Rechtslage. Was in eurem Betrieb gilt,
  klärt bitte mit eurer Steuerberatung.</span>
  <span style="white-space:nowrap">SCM Creatives<br>Kiel und Lübecker Bucht</span></div>
</section>'''


def p_kurz(r):
    b = BEISPIEL
    inhalt = f'''
<div class="lbl">Szene 01 · Kurz gesagt</div>
<h2>Das Wichtigste<br><em>auf einer Seite.</em></h2>
<p class="lead">Videos, Posts und Anzeigen sind Werbung für den Betrieb. Werbung zählt steuerlich zu den
Betriebsausgaben: Sie senkt den Gewinn und damit die Steuern. Geschenkt ist sie deshalb aber nicht.</p>
<ol class="points">
  <li><div><strong>Betriebsausgabe in voller Höhe</strong>Kosten für Skript, Dreh, Schnitt, Posting und Anzeigen sind in der Regel
  Betriebsausgaben (§&nbsp;4 Abs.&nbsp;4 EStG). Anders als bei Bewirtung oder Geschenken gibt es dafür keine Kürzung und keine Obergrenze.
  Ob die Videos Erfolg haben, spielt für den Abzug keine Rolle.</div></li>
  <li><div><strong>Laufende Werbung: sofort, nicht über Jahre</strong>Monatliche Videos und Social-Media-Betreuung werden in dem Jahr
  abgesetzt, in dem sie bezahlt (Einnahmen-Überschuss-Rechnung) bzw. erbracht werden (Bilanz). Nur bei einem einmaligen Film, der über Jahre
  genutzt wird, kann eine Abschreibung nötig sein (Seite 5).</div></li>
  <li><div><strong>Umsatzsteuer zurück</strong>Wer umsatzsteuerpflichtig ist, holt sich die Umsatzsteuer auf einer ordnungsgemäßen Rechnung
  als Vorsteuer zurück (§&nbsp;15 UStG). Ein Betrieb mit {eur(b["umsatz"])} Jahresumsatz ist in aller Regel kein Kleinunternehmer mehr,
  sobald schon das Vorjahr über 25.000&nbsp;€ lag. Wer auch steuerfreie Umsätze hat, etwa aus Wohnungsvermietung, zieht nur anteilig ab.</div></li>
  <li><div><strong>Werbebudget: auf die Umsatzsteuer achten</strong>Anzeigen bei Meta (Instagram, Facebook) oder TikTok rechnen meist
  Gesellschaften im EU-Ausland ab. Dann gilt das Reverse-Charge-Verfahren (§&nbsp;13b UStG). Für Kleinunternehmer wird das teurer (Seite 6).</div></li>
  <li><div><strong>Absetzen heißt: Das Finanzamt trägt einen Teil</strong>In unserer Modellrechnung sinken die Steuern um
  {pct(r["quote"], 0)} des Paketpreises. Eure tatsächliche Entlastung kann höher oder niedriger sein oder ganz entfallen, etwa wenn kein Gewinn
  übrig bleibt.</div></li>
</ol>
<div class="sec levers">
  <div class="lever"><div class="n">Hebel 1</div><h3>Gewinn senken</h3><p>Weniger Gewinn heißt weniger Einkommensteuer
  und Gewerbesteuer, bei einer GmbH weniger Körperschaftsteuer.</p></div>
  <div class="lever"><div class="n">Hebel 2</div><h3>Vorsteuer ziehen</h3><p>Die Umsatzsteuer auf der Rechnung kommt über die
  Umsatzsteuer-Voranmeldung zurück. Das ist Liquidität, keine Ersparnis.</p></div>
  <div class="lever"><div class="n">Hebel 3</div><h3>Zeitpunkt kennen</h3><p>Bei Einnahmen-Überschuss-Rechnung zählt das Jahr der
  Zahlung, bei einer Bilanz der Leistungszeitraum (Seite 7).</p></div>
</div>'''
    return page(2, inhalt)


def p_beispiel(r):
    b = BEISPIEL
    o, m = r["ohne"], r["mit"]
    brutto = b["paket_monat"] * (1 + b["ust"])
    vst = b["paket_monat"] * b["ust"]
    erspar_m = r["ersparnis"] / 12

    def row(label, a, c, cls=""):
        cl = f' class="{cls}"' if cls else ""
        return (f'<tr{cl}><td>{label}</td><td class="num">{eur(a)}</td><td class="num">{eur(c)}</td>'
                f'<td class="num">{eur(c - a)}</td></tr>')

    tabelle = "".join([
        row("Gewinn", o["gewinn"], m["gewinn"]),
        row("Zu versteuerndes Einkommen", o["zve"], m["zve"]),
        row(f"Einkommensteuer laut Tarif {JAHR}", o["est_tarif"], m["est_tarif"]),
        row("Anrechnung der Gewerbesteuer (§&nbsp;35 EStG)", -o["erm35"], -m["erm35"]),
        row("Einkommensteuer nach Anrechnung", o["est"], m["est"]),
        row("Solidaritätszuschlag", o["soli"], m["soli"]),
        row(f"Gewerbesteuer ({GEMEINDE}, Hebesatz {HEBESATZ}&nbsp;%)", o["gewst"], m["gewst"]),
        row("Steuern zusammen", o["summe"], m["summe"], cls="sum"),
    ])
    inhalt = f'''
<div class="lbl">Szene 02 · Modellrechnung</div>
<h2>{eur(b["umsatz"])} Umsatz.<br><em>Was das Paket nach Steuern kostet.</em></h2>
<div class="sheet"><div class="head">Annahmen dieser Modellrechnung</div><ul>
  <li>Einzelunternehmen mit Gewerbe (z.&nbsp;B. Handwerk, Gastronomie, Makler) in {GEMEINDE}, Steuerjahr {JAHR}, Einnahmen-Überschuss-Rechnung</li>
  <li>Jahresumsatz {eur(b["umsatz"])} netto, Gewinn vor den Videokosten {eur(b["gewinn"])}, regelbesteuert bei der Umsatzsteuer</li>
  <li>Videopaket {eur(b["paket_monat"])} netto im Monat, also {eur(r["jahr"])} im Jahr. Das ist ein <strong>Rechenwert,
  kein Angebot</strong>: Euren Preis nennen wir euch im Kennenlerngespräch.</li>
  <li>Ledig, keine Kirchensteuer, keine weiteren Einkünfte, {eur(b["vorsorge"])} abziehbare Vorsorgeaufwendungen</li>
</ul></div>
<table class="sec">
  <thead><tr><th>Steuern im Jahr</th><th class="num">ohne Paket</th><th class="num">mit Paket</th><th class="num">Unterschied</th></tr></thead>
  <tbody>{tabelle}</tbody>
</table>
<p class="tbl-note">Gerechnet nach §&nbsp;32a EStG (Tarif {JAHR}), §&nbsp;11 GewStG (Freibetrag 24.500&nbsp;€, Messzahl 3,5&nbsp;%),
§&nbsp;35 EStG und §§&nbsp;3,&nbsp;4 SolZG (Freigrenze 20.350&nbsp;€). Gewerbesteuer ist keine Betriebsausgabe (§&nbsp;4 Abs.&nbsp;5b EStG). Beträge auf volle Euro gerundet.</p>
<div class="sec"><div class="lbl">Pro Monat betrachtet</div>
<div class="flow">
  <div><div class="k">Ihr überweist</div><div class="v">{eur(brutto)}</div><div class="m">{eur(b["paket_monat"])} netto plus 19&nbsp;% Umsatzsteuer</div></div>
  <div><div class="k">Vorsteuer zurück</div><div class="v">{eur(-vst)}</div><div class="m">über die Umsatzsteuer-Voranmeldung</div></div>
  <div><div class="k">Weniger Steuern</div><div class="v">{eur(-erspar_m)}</div><div class="m">{eur(r["ersparnis"])} im Jahr, also {pct(r["quote"])} des Nettopreises</div></div>
  <div><div class="k">Belastung nach Steuern</div><div class="v">{eur(r["belastung_monat"])}</div><div class="m">pro Monat, nur in dieser Modellrechnung</div></div>
</div></div>'''
    return page(3, inhalt)


def p_varianten(r):
    b = BEISPIEL
    zeilen = ""
    for v in r["vergleich"]:
        hl = ' class="hl"' if v["gewinn"] == b["gewinn"] else ""
        zeilen += (f'<tr{hl}><td>{eur(v["gewinn"])}</td><td class="num">{eur(v["ersparnis"])}</td>'
                   f'<td class="num">{pct(v["quote"], 0)}</td><td class="num">{eur(v["monat"])}</td></tr>')
    reihen = [(f"Einzelunternehmen, Gewinn {eur(v['gewinn'])}", v["quote"]) for v in r["vergleich"]]
    reihen.append((f"GmbH, {GEMEINDE}", r["g_quote"]))
    balken = "".join(
        f'<div class="bar"><span class="t">{t}</span><span class="track"><i style="width:{q * 100 / 0.5:.1f}%"></i></span>'
        f'<span class="v">{eur(q * 1000)}</span></div>' for t, q in reihen)
    inhalt = f'''
<div class="lbl">Szene 03 · Je nach Betrieb</div>
<h2>Mehr Gewinn,<br><em>mehr Entlastung.</em></h2>
<p class="lead">Wie viel das Finanzamt mitträgt, hängt vor allem von Gewinn und Rechtsform ab. Je höher der Gewinn, desto höher
der Steuersatz auf den letzten Euro, und genau dort wirkt eine Betriebsausgabe.</p>
<table>
  <thead><tr><th>Gewinn vor dem Paket</th><th class="num">weniger Steuern im Jahr</th><th class="num">Anteil am Paket</th><th class="num">Belastung pro Monat</th></tr></thead>
  <tbody>{zeilen}</tbody>
</table>
<p class="tbl-note">Modellrechnung: Einzelunternehmen in {GEMEINDE}, sonst gleiche Annahmen wie auf Seite 3, Paket {eur(r["jahr"])} netto im Jahr.
Bei kleinem Gewinn rutscht das Einkommen mit dem Paket unter den Grundfreibetrag von 12.348&nbsp;€, dann wirkt nur ein Teil der Ausgabe.</p>
<div class="grid2 sec">
  <div class="box"><h3>Und als GmbH?</h3>
  <p>Eine GmbH zahlt 15&nbsp;% Körperschaftsteuer plus Solidaritätszuschlag und Gewerbesteuer ohne Freibetrag. In {GEMEINDE} sind das
  zusammen rund <strong>{pct(r["g_quote"], 0)}</strong> des Gewinns. Eine Werbeausgabe von {eur(r["jahr"])} senkt die Steuern der GmbH
  also um etwa {eur(r["g_ersparnis"])} im Jahr.</p>
  <p class="small">Die Körperschaftsteuer sinkt per Gesetz ab 2028 jedes Jahr um einen Punkt bis auf 10&nbsp;% ab 2032 (§&nbsp;23 KStG).
  Steuern auf spätere Ausschüttungen sind hier nicht berücksichtigt.</p></div>
  <div class="box"><h3>Und als Kleinunternehmer?</h3>
  <p>Kleinunternehmer ist, wer im Vorjahr höchstens 25.000&nbsp;€ und im laufenden Jahr höchstens 100.000&nbsp;€ Umsatz hat
  (§&nbsp;19 UStG). Dann gibt es <strong>keine Vorsteuer</strong> zurück: Der Bruttobetrag ist die Betriebsausgabe.</p>
  <p class="small">Wer freiwillig zur Regelbesteuerung wechselt, kann Vorsteuer ziehen, ist daran aber fünf Jahre gebunden
  (§&nbsp;19 Abs.&nbsp;3 UStG). Das ist eine Frage für die Steuerberatung.</p></div>
</div>
<div class="sec"><div class="lbl">Von 1.000&nbsp;€ Werbekosten trägt das Finanzamt in der Modellrechnung</div>
<div class="bars">{balken}</div></div>'''
    return page(4, inhalt)


LEISTUNGEN = [
    ("Monatspaket: Skript, Dreh, Schnitt", "Betriebsausgabe, sofort",
     "Konto Werbekosten (SKR03 4600, SKR04 6600), in der Anlage EÜR Zeile „Werbekosten“"),
    ("Posting und Community-Management", "Betriebsausgabe, sofort", "wie das Monatspaket"),
    ("Werbebudget bei Meta oder TikTok", "Betriebsausgabe, sofort",
     "Umsatzsteuer meist per Reverse Charge, siehe Seite 6"),
    ("Recruiting-Videos und Anzeigen für Personal", "Betriebsausgabe, sofort",
     "Personalgewinnung ist betrieblich veranlasst, eine Sonderregel gibt es nicht"),
    ("Einmaliger Imagefilm oder Recruitingfilm", "Sofortabzug oder Abschreibung",
     "hängt vom Vertrag ab, siehe Kasten unten"),
    ("3 kostenlose Testvideos", "Nichts abzusetzen", "Es wird nichts bezahlt, also gibt es keine Ausgabe und keine Vorsteuer"),
]


def p_leistungen(r):
    zeilen = "".join(f'<tr><td><strong>{a}</strong></td><td>{b_}</td><td class="small">{c}</td></tr>' for a, b_, c in LEISTUNGEN)
    inhalt = f'''
<div class="lbl">Szene 04 · Was wohin gehört</div>
<h2>Jede Leistung<br><em>an ihren Platz.</em></h2>
<p class="lead">Fast alles, was eine Social-Media-Agentur laufend macht, ist Werbung, die sich sofort verbraucht. Nur bei einem
einmaligen Film, der über Jahre genutzt wird, lohnt ein genauer Blick.</p>
<table>
  <thead><tr><th style="width:36%">Leistung</th><th style="width:24%">In der Regel</th><th>Hinweis</th></tr></thead>
  <tbody>{zeilen}</tbody>
</table>
<div class="box"><h3>Sonderfall Imagefilm: sofort absetzen oder abschreiben?</h3>
<p>Ein Film, der mehrere Jahre im Einsatz ist, kann ein immaterielles Wirtschaftsgut sein. Wird er als fertiges Werk eingekauft (die
Agentur steuert alles und trägt das Risiko), ist er zu aktivieren und über die Nutzungsdauer abzuschreiben (§&nbsp;5 Abs.&nbsp;2, §&nbsp;7 EStG).
Steuert der Auftraggeber die Produktion selbst, gibt Skript und Schnitt frei und trägt das Risiko, gilt der Film als selbst hergestellt und
ist sofort abziehbar. So hat es das Finanzgericht Rheinland-Pfalz für einen Imagefilm entschieden (Urteil vom 29.03.2012, 5&nbsp;K&nbsp;1815/10).</p>
<p class="small">Das ist ein erstinstanzliches Urteil, der Bundesfinanzhof hat die Frage nicht entschieden. Die Sofortabschreibung für geringwertige
Wirtschaftsgüter bis 800&nbsp;€ gilt für Filme nicht. Am Ende verschiebt sich nur der Zeitpunkt: Abgesetzt wird der volle Betrag so oder so.
Vor einem großen Einzelprojekt deshalb mit der Steuerberatung sprechen.</p></div>
<div class="grid2 sec">
  <div><h3>Inhaber vor der Kamera</h3>
  <p class="small">Werbung für den Betrieb bleibt Werbung, auch mit eigenem Gesicht. Der Kanal sollte aber betrieblich bleiben: Private
  Inhalte auf demselben Account machen die Abgrenzung schwer (§&nbsp;12 EStG). Bei einer GmbH droht sonst eine verdeckte Gewinnausschüttung.</p></div>
  <div><h3>Was nicht dazugehört</h3>
  <p class="small">Eigene Kleidung, Friseur und Styling für den Dreh sind private Lebensführung, auch wenn sie nur fürs Video getragen
  werden. Typische Berufskleidung wie Logo-Shirt oder Kochjacke ist absetzbar. Essen fürs Drehteam gilt als Bewirtung: 70&nbsp;% abziehbar.</p></div>
</div>'''
    return page(5, inhalt)


def p_anzeigen(r):
    inhalt = '''
<div class="lbl">Szene 05 · Werbeanzeigen</div>
<h2>Das Werbebudget<br><em>und die Umsatzsteuer.</em></h2>
<p class="lead">Anzeigen bei Meta (Instagram, Facebook) rechnet in der Regel Meta Platforms Ireland ab, also eine Gesellschaft im
EU-Ausland. Dann schuldet nicht Meta die Umsatzsteuer, sondern der Betrieb selbst.</p>
<div class="grid2">
  <div class="box"><h3>So läuft Reverse Charge</h3>
  <ul class="dots">
    <li>USt-IdNr im Werbekonto hinterlegen, sonst kann Umsatzsteuer aufgeschlagen werden.</li>
    <li>Auf dem Beleg „Verkauft von“ prüfen: Gesellschaft im EU-Ausland heißt Reverse Charge.</li>
    <li>In der Voranmeldung 19&nbsp;% Umsatzsteuer nach §&nbsp;13b UStG eintragen und zugleich als Vorsteuer abziehen.
    Saldo 0&nbsp;€, eintragen muss man es trotzdem.</li>
    <li>Es zählt der Zeitraum, in dem die Anzeigen liefen, nicht das Rechnungsdatum.</li>
  </ul></div>
  <div class="box dark"><h3>Achtung, Kleinunternehmer</h3>
  <p>Auch Kleinunternehmer schulden die Umsatzsteuer nach §&nbsp;13b UStG, dürfen sie aber nicht als Vorsteuer abziehen, weil ihre eigenen
  Umsätze steuerfrei sind (§&nbsp;15 Abs.&nbsp;2, §&nbsp;19 Abs.&nbsp;1 UStG). Die 19&nbsp;% kommen
  also obendrauf: <strong>1.000&nbsp;€ Werbebudget kosten 1.190&nbsp;€.</strong></p>
  <p class="small">Dazu kommt eine Umsatzsteuer-Voranmeldung für jeden Zeitraum mit Anzeigen und eine Jahreserklärung
  (§&nbsp;18 Abs.&nbsp;4a UStG).</p></div>
</div>
<h3 class="sec">Zwei Wege, das Budget zu bezahlen</h3>
<table>
  <thead><tr><th style="width:30%"></th><th>Eigenes Werbekonto</th><th>Über eine Agentur weiterberechnet</th></tr></thead>
  <tbody>
    <tr><td><strong>Wer zahlt Meta?</strong></td><td>Der Betrieb direkt, mit eigener USt-IdNr</td><td>Die Agentur aus ihrem Konto, sie stellt das Budget in Rechnung</td></tr>
    <tr><td><strong>Umsatzsteuer</strong></td><td>Reverse Charge beim Betrieb, Saldo 0&nbsp;€</td><td>19&nbsp;% auf der Agenturrechnung, als Vorsteuer abziehbar (kein durchlaufender Posten)</td></tr>
    <tr><td><strong>Gut für</strong></td><td>regelbesteuerte Betriebe: volle Transparenz, keine Vorfinanzierung</td><td>Kleinunternehmer: gleiche Kosten, aber keine eigene Reverse-Charge-Meldung für das Budget</td></tr>
  </tbody>
</table>
<p class="tbl-note">Werbebudgets sind voll als Betriebsausgabe abziehbar. Das Tagesbudget im Werbekonto ist ein Nettobetrag. Bei TikTok gilt nach dessen
Hilfeseite das Gleiche: mit gültiger USt-IdNr keine Umsatzsteuer auf der Rechnung.</p>'''
    return page(6, inhalt)


def p_checkliste(r):
    inhalt = '''
<div class="lbl">Szene 06 · So geht ihr vor</div>
<h2>Die Checkliste<br><em>für die Buchhaltung.</em></h2>
<ul class="check">
  <li><div><strong>Rechnung prüfen</strong>Name und Anschrift beider Seiten, Steuernummer oder USt-IdNr. der Agentur, Rechnungsnummer und
  Datum, Leistung und Leistungsmonat, Nettobetrag, Steuersatz und Steuerbetrag (§&nbsp;14 Abs.&nbsp;4 UStG). Fehlt etwas: berichtigte Rechnung anfordern.</div></li>
  <li><div><strong>E-Rechnungen empfangen können</strong>Seit dem 1.1.2025 muss jeder Betrieb E-Rechnungen (XRechnung, ZUGFeRD) annehmen können,
  ein E-Mail-Postfach reicht. PDF-Rechnungen sind nur noch übergangsweise erlaubt: für Leistungen aus 2026 bei Übermittlung bis 31.12.2026,
  für Leistungen aus 2027 nur von kleineren Rechnungsstellern. Ab 2028 ist die E-Rechnung zwischen Betrieben Pflicht.</div></li>
  <li><div><strong>Vorsteuer in die Voranmeldung</strong>Die Umsatzsteuer aus der Rechnung kommt in die Umsatzsteuer-Voranmeldung für den
  Zeitraum, in dem Leistung und Rechnung vorliegen. Bei Vorauszahlung: sobald Rechnung und Zahlung vorliegen.</div></li>
  <li><div><strong>Als Werbekosten buchen</strong>Laufende Pakete auf das Konto Werbekosten (SKR03 4600, SKR04 6600). In der
  Einnahmen-Überschuss-Rechnung gehören sie in die Zeile „Werbekosten (z.&nbsp;B. Inserate, Werbespots, Plakate)“.</div></li>
  <li><div><strong>Jahreswechsel beachten</strong>Bei Einnahmen-Überschuss-Rechnung zählt das Jahr der Zahlung (§&nbsp;11 EStG). Monatsraten gehören
  zum Jahr, für das sie gelten, wenn sie zwischen dem 22.12. und dem 10.01. fällig sind und auch in diesem Zeitraum bezahlt werden
  (BFH X&nbsp;R&nbsp;2/21). Der 10.01.2027 ist ein Sonntag: Die Frist verschiebt sich trotzdem nicht.</div></li>
  <li><div><strong>Vorauszahlungen nur mit gutem Grund</strong>Wer im Dezember ein ganzes Jahr im Voraus zahlt, kann bei
  Einnahmen-Überschuss-Rechnung grundsätzlich sofort absetzen, aber nur mit einem wirtschaftlichen Grund, nicht allein der Steuer wegen
  (§&nbsp;42 AO). Bei einer Bilanz, also bei jeder GmbH, bringt das nichts: Der Aufwand wird auf den Leistungszeitraum verteilt.</div></li>
  <li><div><strong>Belege aufbewahren</strong>Rechnungen und Zahlungsbelege 8 Jahre ab Ende des Belegjahres (§&nbsp;147 AO), E-Rechnungen im
  Originalformat (XML), nicht nur als Ausdruck. Belege aus dem Werbekonto monatlich herunterladen.</div></li>
  <li><div><strong>Vor großen Einzelprojekten fragen</strong>Imagefilm, große Kampagne, Wechsel der Rechtsform: vorher mit der Steuerberatung
  sprechen. Ein Investitionsabzugsbetrag (§&nbsp;7g EStG) ist für Agenturleistungen nicht möglich.</div></li>
</ul>'''
    return page(7, inhalt)


def p_abspann():
    quellen = "".join(f"<li>{q}</li>" for q in QUELLEN)
    inhalt = f'''
<div class="lbl">Abspann · Rechtliches und Quellen</div>
<h2>Gut zu wissen,<br><em>bevor ihr loslegt.</em></h2>
<div class="box dark"><h3>Wichtiger Hinweis</h3>
<p>Dieses Merkblatt enthält allgemeine Informationen zur Rechtslage, Stand {STAND}, Steuerjahr {JAHR}. Es ersetzt keine steuerliche
Beratung im Einzelfall. SCM Creatives ist kein Steuerberater und darf keine Hilfe in Steuersachen leisten (§§&nbsp;2,&nbsp;5 StBerG).
Ob und in welcher Höhe sich Ausgaben bei euch auswirken, hängt unter anderem von Rechtsform, Gewinn, persönlichem Steuersatz,
Gewerbesteuer-Hebesatz und Umsatzsteuerstatus ab. Bitte lasst euren Fall von eurer Steuerberatung prüfen.</p>
<p class="small">Fragen zu euren Steuern beantworten wir deshalb nicht. Fragen zu unseren Leistungen, Rechnungen und Paketen gerne.</p></div>
<div class="sec"><div class="lbl">Grundlagen dieses Merkblatts</div><ul class="src">{quellen}</ul></div>
<div class="sec grid2">
  <div><h3>Die Modellrechnung</h3><p class="small">Alle Zahlen sind mit den Formeln aus §&nbsp;32a EStG, §&nbsp;11 GewStG, §&nbsp;35 EStG,
  §§&nbsp;3,&nbsp;4 SolZG und §&nbsp;23 KStG für {JAHR} gerechnet. Steuerbeträge ändern sich jedes Jahr. Achtet deshalb auf den Stand
  oben auf jeder Seite.</p></div>
  <div><h3>Kontakt</h3><p class="small">SCM Creatives · Kiel und Lübecker Bucht<br>Telefon und WhatsApp {KONTAKT["tel"]}<br>
  {KONTAKT["mail"]} · {KONTAKT["web"]}</p></div>
</div>'''
    return page(8, inhalt)


# ------------------------------------------------------------------
# Bauen
# ------------------------------------------------------------------
def build():
    r = rechnen()
    seiten = [p_cover(), p_kurz(r), p_beispiel(r), p_varianten(r), p_leistungen(r), p_anzeigen(r), p_checkliste(r), p_abspann()]
    assert len(seiten) == GESAMT
    doc = f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>SCM Creatives · Merkblatt Werbekosten absetzen ({STAND})</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="merkblatt.css">
</head><body>
{"".join(seiten)}
</body></html>'''
    for z in ("–", "—"):  # Schreibregel: keine Gedankenstriche
        assert z not in doc, f"Gedankenstrich im Merkblatt: {doc[doc.index(z) - 60:doc.index(z) + 20]!r}"
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(doc)
    return r


def render(png_dir=None):
    env = dict(os.environ, NODE_PATH="/opt/node22/lib/node_modules")
    cmd = ["node", os.path.join(HERE, "render.js"), OUT_HTML, OUT_PDF] + ([png_dir] if png_dir else [])
    subprocess.run(cmd, check=True, env=env)
    os.makedirs(os.path.dirname(AUSLIEFERUNG), exist_ok=True)
    shutil.copyfile(OUT_PDF, AUSLIEFERUNG)


if __name__ == "__main__":
    import sys
    r = build()
    print(f"Modell: {eur(r['jahr'])} Paket, Ersparnis {eur(r['ersparnis'])} ({pct(r['quote'])}), "
          f"Belastung {eur(r['belastung_monat'])}/Monat, GmbH {eur(r['g_ersparnis'])} ({pct(r['g_quote'])})")
    render(sys.argv[1] if len(sys.argv) > 1 else None)
    print("geschrieben:", OUT_HTML, OUT_PDF, AUSLIEFERUNG, f"({datetime.date.today().isoformat()})")
