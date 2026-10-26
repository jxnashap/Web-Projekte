#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kunden-Merkblatt „Werbekosten absetzen“ für SCM Creatives (A4, PDF).

Alle Zahlen im Rechenbeispiel rechnet steuer2026.py aus, nichts ist von Hand
eingetragen. Annahmen stehen unten in BEISPIEL und erscheinen im Merkblatt.
Quellen der Recherche: .preview-cache/scm/steuern/ (Gesetzestexte und Berichte).
Schreibregeln: keine Gedankenstriche, Ansprache „ihr“, nur belegte Aussagen.

Aufruf:  python3 build_merkblatt.py   → merkblatt-werbekosten.html + .pdf
"""
import html
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

# ------------------------------------------------------------------
# Annahmen des Rechenbeispiels (stehen so im Merkblatt)
# ------------------------------------------------------------------
BEISPIEL = dict(
    umsatz=100_000,          # Jahresumsatz netto
    gewinn=40_000,           # Gewinn vor den SCM-Kosten
    paket_monat=1_000,       # angenommener Paketpreis netto pro Monat (Rechenwert, kein Angebot)
    vorsorge=7_000,          # abziehbare Vorsorgeaufwendungen (Kranken-, Pflegeversicherung u. a.)
    ust=0.19,
)
GEMEINDE = "Kiel"
HEBESATZ = 450  # Gewerbesteuer-Hebesatz der Landeshauptstadt Kiel 2026 (Quelle siehe QUELLEN)
VERGLEICH_GEWINNE = [25_000, 40_000, 60_000, 80_000, 110_000]

KONTAKT = dict(tel="0172 5361079", mail="scm.creatives@gmx.de", web="scm-creatives.de")


# ------------------------------------------------------------------
# Hilfen
# ------------------------------------------------------------------
def eur(x, nachkomma=False):
    """Deutsches Zahlenformat: 1.234 € bzw. 1.234,56 €."""
    if nachkomma:
        s = f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    else:
        s = f"{round(x):,}".replace(",", ".")
    return s + " €"


def pct(x, stellen=1):
    return f"{x * 100:.{stellen}f}".replace(".", ",") + " %"


def esc(s):
    return html.escape(s, quote=False)


def run_head(nr, gesamt):
    return (f'<div class="run"><img src="../public/img/logo-dark.svg" alt="SCM Creatives">'
            f'<span>Merkblatt Werbekosten · Stand {STAND}</span><span>Seite {nr} von {gesamt}</span></div>')


def foot():
    return ('<div class="foot"><span><b>Allgemeine Information, keine Steuerberatung.</b> '
            'Für euren Einzelfall sprecht bitte mit eurer Steuerberatung.</span>'
            f'<span>SCM Creatives · {KONTAKT["web"]} · {KONTAKT["tel"]}</span></div>')


def page(nr, gesamt, inhalt, cls=""):
    return f'<section class="page {cls}">{run_head(nr, gesamt)}{inhalt}{foot()}</section>'


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
    return dict(jahr=jahr, ohne=ohne, mit=mit, ersparnis=ersparnis, quote=ersparnis / jahr,
                g_ersparnis=g_ohne["summe"] - g_mit["summe"], g_quote=(g_ohne["summe"] - g_mit["summe"]) / jahr,
                vergleich=vergleich)


# ------------------------------------------------------------------
# Seiten
# ------------------------------------------------------------------
def p_cover():
    return f'''<section class="page cover">
  <i class="vf tl"></i><i class="vf tr"></i><i class="vf bl"></i><i class="vf br"></i>
  <div class="rec">REC · MERKBLATT FÜR KUNDEN</div>
  <div class="top"><img src="../public/img/logo.svg" alt="SCM Creatives">
    <div class="stamp">Stand {STAND}<br>Steuerjahr 2026</div></div>
  <div class="slate">Szene 00 · Werbekosten</div>
  <h1>Werbung,<br>die sich <em>rechnet.</em></h1>
  <p class="sub">So setzt ihr die Kosten für eure Videos, Posts und Anzeigen von der Steuer ab.
  Mit Rechenbeispiel für einen Betrieb mit {eur(BEISPIEL["umsatz"])} Jahresumsatz.</p>
  <div class="chips"><span>Betriebsausgaben</span><span>Vorsteuer</span><span>Werbeanzeigen</span><span>Rechenbeispiel</span><span>Checkliste</span></div>
  <div class="note"><span><b>Allgemeine Information, keine Steuerberatung.</b> Wir sind eine Social-Media-Agentur und keine
  Steuerberater. Dieses Merkblatt erklärt die allgemeine Rechtslage. Was in eurem Betrieb gilt, klärt bitte mit eurer Steuerberatung.</span>
  <span style="white-space:nowrap">SCM Creatives<br>Kiel und Lübecker Bucht</span></div>
</section>'''


def p_kurz(r, nr, gesamt):
    b = BEISPIEL
    belastung = (r["jahr"] - r["ersparnis"]) / 12
    inhalt = f'''
<div class="lbl">Szene 01 · Kurz gesagt</div>
<h2>Das Wichtigste<br><em>auf einer Seite.</em></h2>
<p class="lead">Videos, Posts und Anzeigen sind Werbung für euren Betrieb. Werbung zählt steuerlich zu den
Betriebsausgaben. Das heißt: Sie senkt euren Gewinn und damit eure Steuern.</p>
<ol class="points">
  <li><div><strong>Voll absetzbar</strong>Was ihr für Skript, Dreh, Schnitt, Posting und Anzeigen bezahlt, ist eine Betriebsausgabe
  (§&nbsp;4 Abs.&nbsp;4 EStG). Es gibt dafür keine Obergrenze und keine Kürzung wie etwa bei Bewirtung oder Geschenken.</div></li>
  <li><div><strong>Sofort, nicht über Jahre verteilt</strong>Laufende Videos und Social-Media-Betreuung setzt ihr in dem Jahr ab,
  in dem ihr zahlt (Einnahmen-Überschuss-Rechnung) bzw. in dem die Leistung erbracht wird (Bilanz).
  Eine Abschreibung über mehrere Jahre braucht es dafür nicht.</div></li>
  <li><div><strong>Umsatzsteuer zurück</strong>Seid ihr umsatzsteuerpflichtig, holt ihr euch die Umsatzsteuer auf der Rechnung
  als Vorsteuer vom Finanzamt zurück (§&nbsp;15 UStG). Bei {eur(b["umsatz"])} Jahresumsatz seid ihr kein Kleinunternehmer mehr,
  der Vorsteuerabzug steht euch also offen.</div></li>
  <li><div><strong>Werbebudget über euer eigenes Konto</strong>Anzeigen bei Meta (Instagram, Facebook) oder TikTok bucht ihr am
  besten im eigenen Werbekonto mit eurer USt-IdNr. Dann gilt das Reverse-Charge-Verfahren und die Umsatzsteuer gleicht sich aus.</div></li>
  <li><div><strong>Absetzen heißt nicht geschenkt</strong>Das Finanzamt trägt nur einen Teil. Im Rechenbeispiel auf der nächsten
  Seite bleiben von {eur(b["paket_monat"])} Paketpreis im Monat nach Steuern rund {eur(round(belastung, -1))} als echte Belastung.</div></li>
</ol>
<div class="sec levers">
  <div class="lever"><div class="n">Hebel 1</div><h3>Gewinn senken</h3><p>Weniger Gewinn heißt weniger Einkommensteuer
  und Gewerbesteuer, bei einer GmbH weniger Körperschaftsteuer.</p></div>
  <div class="lever"><div class="n">Hebel 2</div><h3>Vorsteuer ziehen</h3><p>Die Umsatzsteuer auf unserer Rechnung kommt
  über die Umsatzsteuer-Voranmeldung zurück, meist schon im Folgemonat.</p></div>
  <div class="lever"><div class="n">Hebel 3</div><h3>Zeitpunkt wählen</h3><p>Wer mit Einnahmen-Überschuss-Rechnung arbeitet,
  setzt im Jahr der Zahlung ab. Das lässt sich planen.</p></div>
</div>'''
    return page(nr, gesamt, inhalt)


def p_beispiel(r, nr, gesamt):
    b = BEISPIEL
    o, m = r["ohne"], r["mit"]
    brutto = b["paket_monat"] * (1 + b["ust"])
    vst = b["paket_monat"] * b["ust"]
    erspar_m = r["ersparnis"] / 12
    belastung = b["paket_monat"] - erspar_m

    def row(label, a, c, cls="", minus=False):
        cl = f' class="{cls}"' if cls else ""
        return f'<tr{cl}><td>{label}</td><td class="num">{eur(a)}</td><td class="num">{eur(c)}</td><td class="num">{eur(c - a) if not minus else eur(a - c)}</td></tr>'

    tabelle = "".join([
        row("Gewinn", o["gewinn"], m["gewinn"]),
        row("Zu versteuerndes Einkommen", o["zve"], m["zve"]),
        row("Einkommensteuer laut Tarif 2026", o["est_tarif"], m["est_tarif"]),
        row("minus Anrechnung Gewerbesteuer (§&nbsp;35 EStG)", -o["erm35"], -m["erm35"]),
        row("Einkommensteuer", o["est"], m["est"]),
        row("Solidaritätszuschlag", o["soli"], m["soli"]),
        row(f"Gewerbesteuer ({GEMEINDE}, Hebesatz {HEBESATZ}&nbsp;%)", o["gewst"], m["gewst"]),
        row("Steuern zusammen", o["summe"], m["summe"], cls="sum"),
    ])
    inhalt = f'''
<div class="lbl">Szene 02 · Rechenbeispiel</div>
<h2>{eur(b["umsatz"])} Umsatz.<br><em>Was kostet das Paket wirklich?</em></h2>
<div class="sheet"><div class="head">Annahmen</div><ul>
  <li>Einzelunternehmen mit Gewerbe (z.&nbsp;B. Handwerk, Gastronomie, Makler) in {GEMEINDE}, Steuerjahr 2026</li>
  <li>Jahresumsatz {eur(b["umsatz"])} netto, Gewinn vor den Videokosten {eur(b["gewinn"])}</li>
  <li>Videopaket {eur(b["paket_monat"])} netto im Monat, also {eur(r["jahr"])} im Jahr. Das ist ein <strong>Rechenwert</strong>,
  kein Angebot: Euren Preis nennen wir euch im Kennenlerngespräch.</li>
  <li>Ledig, keine Kirchensteuer, keine weiteren Einkünfte, {eur(b["vorsorge"])} abziehbare Vorsorgeaufwendungen</li>
</ul></div>
<table class="sec">
  <thead><tr><th>Steuern im Jahr</th><th class="num">ohne Paket</th><th class="num">mit Paket</th><th class="num">Unterschied</th></tr></thead>
  <tbody>{tabelle}</tbody>
</table>
<p class="tbl-note">Gerechnet nach §&nbsp;32a EStG (Tarif 2026), §&nbsp;11 GewStG (Freibetrag 24.500&nbsp;€, Messzahl 3,5&nbsp;%),
§&nbsp;35 EStG und §&nbsp;3 SolZG (Freigrenze 20.350&nbsp;€). Cent-Beträge gerundet.</p>
<div class="sec"><div class="lbl">Pro Monat betrachtet</div>
<div class="flow">
  <div><div class="k">Ihr überweist</div><div class="v">{eur(brutto)}</div><div class="m">{eur(b["paket_monat"])} netto plus 19&nbsp;% Umsatzsteuer</div></div>
  <div><div class="k">Vorsteuer zurück</div><div class="v">−{eur(vst)}</div><div class="m">über die Umsatzsteuer-Voranmeldung</div></div>
  <div><div class="k">Weniger Steuern</div><div class="v">−{eur(erspar_m)}</div><div class="m">{eur(r["ersparnis"])} im Jahr, also {pct(r["quote"])} des Paketpreises</div></div>
  <div><div class="k">Echte Belastung</div><div class="v">{eur(belastung)}</div><div class="m">pro Monat nach Steuern, in diesem Beispiel</div></div>
</div></div>'''
    return page(nr, gesamt, inhalt)


def p_varianten(r, nr, gesamt):
    b = BEISPIEL
    zeilen = ""
    for v in r["vergleich"]:
        hl = ' class="hl"' if v["gewinn"] == b["gewinn"] else ""
        zeilen += (f'<tr{hl}><td>{eur(v["gewinn"])}</td><td class="num">{eur(v["ersparnis"])}</td>'
                   f'<td class="num">{pct(v["quote"], 0)}</td><td class="num">{eur(v["monat"])}</td></tr>')
    inhalt = f'''
<div class="lbl">Szene 03 · Je nach Betrieb</div>
<h2>Wer mehr verdient,<br><em>spart mehr.</em></h2>
<p class="lead">Wie viel das Finanzamt mitträgt, hängt von eurem Gewinn und eurer Rechtsform ab. Je höher der Gewinn,
desto höher der Steuersatz auf den letzten Euro, und genau dort wirkt die Betriebsausgabe.</p>
<table>
  <thead><tr><th>Gewinn vor dem Paket</th><th class="num">weniger Steuern im Jahr</th><th class="num">Anteil am Paket</th><th class="num">Belastung pro Monat</th></tr></thead>
  <tbody>{zeilen}</tbody>
</table>
<p class="tbl-note">Einzelunternehmen in {GEMEINDE}, gleiche Annahmen wie auf Seite 3, Paket {eur(r["jahr"])} netto im Jahr.
Bei kleinem Gewinn fällt der Gewinn mit dem Paket unter den Grundfreibetrag, dann wirkt nur ein Teil der Ausgabe.</p>
<div class="grid2 sec">
  <div class="box"><h3>Ihr seid eine GmbH?</h3>
  <p>Die GmbH zahlt 15&nbsp;% Körperschaftsteuer plus Solidaritätszuschlag und Gewerbesteuer ohne Freibetrag. In {GEMEINDE} trägt das Finanzamt
  damit rund <strong>{pct(r["g_quote"], 0)}</strong> jeder Werbeausgabe, bei {eur(r["jahr"])} also etwa {eur(r["g_ersparnis"])} im Jahr.</p>
  <p class="small">Die Körperschaftsteuer sinkt per Gesetz ab 2028 jedes Jahr um einen Punkt bis auf 10&nbsp;% ab 2032 (§&nbsp;23 KStG).
  Dann trägt das Finanzamt etwas weniger mit.</p></div>
  <div class="box"><h3>Ihr seid Kleinunternehmer?</h3>
  <p>Wer im Vorjahr höchstens 25.000&nbsp;€ und im laufenden Jahr höchstens 100.000&nbsp;€ Umsatz hat, kann die Kleinunternehmerregelung nutzen
  (§&nbsp;19 UStG). Dann gibt es <strong>keine Vorsteuer</strong> zurück: Der Bruttobetrag ist die Betriebsausgabe.</p>
  <p class="small">Ein Betrieb mit {eur(b["umsatz"])} Jahresumsatz ist kein Kleinunternehmer, sobald schon das Vorjahr über 25.000&nbsp;€ lag.</p></div>
</div>'''
    return page(nr, gesamt, inhalt)


LEISTUNGEN = [
    ("Monatspaket: Skript, Dreh, Schnitt", "Betriebsausgabe, sofort",
     "Konto Werbekosten (SKR03 4600 / SKR04 6600), Anlage EÜR Zeile „Werbekosten“"),
    ("Posting und Community-Management", "Betriebsausgabe, sofort", "wie das Monatspaket"),
    ("Werbebudget bei Meta oder TikTok", "Betriebsausgabe, sofort",
     "Umsatzsteuer meist im Reverse-Charge-Verfahren, siehe Seite 6"),
    ("Recruiting-Videos und Anzeigen für Personal", "Betriebsausgabe, sofort",
     "Personalgewinnung ist betrieblich veranlasst, es gibt keine Sonderregel"),
    ("Einmaliger Imagefilm oder Recruitingfilm", "Sofortabzug oder Abschreibung",
     "Hängt vom Vertrag ab, siehe Kasten unten. Vorher mit der Steuerberatung klären"),
    ("3 kostenlose Testvideos", "Nichts abzusetzen", "Ihr zahlt nichts, also gibt es auch keine Ausgabe und keine Vorsteuer"),
]


def p_leistungen(r, nr, gesamt):
    zeilen = "".join(f"<tr><td><strong>{a}</strong></td><td>{b_}</td><td class=\"small\">{c}</td></tr>" for a, b_, c in LEISTUNGEN)
    inhalt = f'''
<div class="lbl">Szene 04 · Was wohin gehört</div>
<h2>Jede Leistung<br><em>an ihren Platz.</em></h2>
<p class="lead">Fast alles, was wir für euch machen, ist laufende Werbung und damit sofort absetzbar. Nur bei einem einmaligen Film,
den ihr über Jahre nutzt, lohnt ein genauer Blick.</p>
<table>
  <thead><tr><th style="width:36%">Leistung</th><th style="width:24%">Steuerlich</th><th>Hinweis</th></tr></thead>
  <tbody>{zeilen}</tbody>
</table>
<div class="box"><h3>Sonderfall Imagefilm: sofort absetzen oder abschreiben?</h3>
<p>Ein Film, den ihr mehrere Jahre nutzt, kann ein immaterielles Wirtschaftsgut sein. Kauft ihr ihn als fertiges Werk ein, wird er
aktiviert und über die Nutzungsdauer abgeschrieben (§&nbsp;5 Abs.&nbsp;2, §&nbsp;7 EStG). Steuert ihr die Produktion selbst, gebt
Skript und Schnitt frei und tragt das Risiko, gilt er als selbst hergestellt und ist sofort abziehbar. So hat das Finanzgericht
Rheinland-Pfalz für einen Imagefilm entschieden (Urteil vom 29.03.2012, 5&nbsp;K&nbsp;1815/10).</p>
<p class="small">Eine Entscheidung des Bundesfinanzhofs dazu gibt es nicht. Die Sofortabschreibung für geringwertige Wirtschaftsgüter bis
800&nbsp;€ gilt für Filme nicht, weil sie nur bewegliche Sachen erfasst. Am Ende verschiebt sich nur der Zeitpunkt: Abgesetzt wird der volle
Betrag in jedem Fall.</p></div>
<div class="grid2 sec">
  <div><h3>Ihr steht selbst vor der Kamera?</h3>
  <p class="small">Kein Problem für den Abzug: Werbung für den Betrieb bleibt Werbung, auch mit eurem Gesicht. Haltet aber den Account
  betrieblich. Private Posts auf demselben Kanal machen die Abgrenzung schwer (§&nbsp;12 EStG), bei der GmbH droht eine verdeckte
  Gewinnausschüttung.</p></div>
  <div><h3>Was nicht dazu gehört</h3>
  <p class="small">Eigene Kleidung, Friseur und Styling für den Dreh sind private Lebensführung, auch wenn ihr sie nur fürs Video tragt.
  Absetzbar ist nur typische Berufskleidung wie Logo-Shirt oder Kochjacke. Verpflegt ihr das Drehteam, gilt das als Bewirtung:
  70&nbsp;% abziehbar.</p></div>
</div>'''
    return page(nr, gesamt, inhalt)


def p_checkliste(r, nr, gesamt):
    inhalt = f'''
<div class="lbl">Szene 06 · So geht ihr vor</div>
<h2>Die Checkliste<br><em>für eure Buchhaltung.</em></h2>
<ul class="check">
  <li><div><strong>Rechnung prüfen</strong>Name und Anschrift von euch und uns, Steuernummer oder USt-IdNr., Rechnungsnummer und Datum,
  Leistung und Leistungsmonat, Nettobetrag, Steuersatz und Steuerbetrag (§&nbsp;14 Abs.&nbsp;4 UStG). Fehlt etwas, sagt uns Bescheid:
  Eine berichtigte Rechnung wirkt zurück.</div></li>
  <li><div><strong>E-Rechnungen empfangen können</strong>Seit dem 1.1.2025 muss jeder Betrieb E-Rechnungen (XRechnung oder ZUGFeRD)
  annehmen können, ein E-Mail-Postfach reicht. Ein PDF ist für Leistungen bis Ende 2026 noch erlaubt, wenn ihr zustimmt. Ab 2028 ist die
  E-Rechnung zwischen Betrieben Pflicht.</div></li>
  <li><div><strong>Vorsteuer in die Voranmeldung</strong>Die Umsatzsteuer aus unserer Rechnung tragt ihr (oder eure Steuerberatung)
  in der Umsatzsteuer-Voranmeldung für den Monat oder das Quartal ein, in dem Leistung und Rechnung vorliegen.</div></li>
  <li><div><strong>Als Werbekosten buchen</strong>Laufende Pakete auf das Konto Werbekosten (SKR03 4600, SKR04 6600). In der
  Einnahmen-Überschuss-Rechnung gehören sie in die Zeile „Werbekosten (z.&nbsp;B. Inserate, Werbespots, Plakate)“.</div></li>
  <li><div><strong>Werbekonto mit USt-IdNr.</strong>Hinterlegt eure Umsatzsteuer-Identifikationsnummer im Werbekonto bei Meta oder TikTok
  und ladet die monatlichen Rechnungen dort herunter.</div></li>
  <li><div><strong>Zeitpunkt im Blick</strong>Mit Einnahmen-Überschuss-Rechnung zählt das Jahr der Zahlung (§&nbsp;11 EStG). Monatsbeiträge,
  die zwischen dem 22.12. und dem 10.1. fällig und gezahlt werden, gehören zum Jahr, für das sie gelten. Bilanzierende Betriebe (jede GmbH)
  buchen nach dem Leistungszeitraum.</div></li>
  <li><div><strong>Belege aufbewahren</strong>Rechnungen sind Buchungsbelege: 8 Jahre aufbewahren (§&nbsp;147 Abs.&nbsp;3 AO),
  E-Rechnungen im Originalformat (XML), nicht nur als Ausdruck.</div></li>
  <li><div><strong>Vor einem großen Einzelprojekt fragen</strong>Plant ihr einen Imagefilm oder eine größere Kampagne, sprecht vorher mit eurer
  Steuerberatung über Zeitpunkt und Art des Abzugs.</div></li>
</ul>'''
    return page(nr, gesamt, inhalt)
