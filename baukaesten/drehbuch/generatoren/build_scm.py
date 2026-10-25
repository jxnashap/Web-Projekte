#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator: SCM Creatives (scm-creatives.de) mit dem Drehbuch-Baukasten. Version 1.1

Fakten nur aus .preview-cache/scm/ (Instagram-Embeds, Reels, Transkripte) und
dem Briefing (.preview-cache/scm/recherche/briefing.md). Alles Unbelegte ist
als [PLATZHALTER] sichtbar markiert. Schreibregel: keine Gedankenstriche.
v1.1 setzt die UX-Analyse um (ux-reports: Barrierefreiheit, Conversion, SEO, Texte),
v1.2 die zweite UX-Runde (Untertitel, Quiz, Platzhalter für Unbestätigtes, SEO-Feinschliff).
Aufruf: python3 build_scm.py  → schreibt webseiten/scm-creatives/public/
"""
import datetime
import hashlib
import html
import json
import os
import re
import shutil

ROOT = "/home/user/Web-Projekte"
PROJ = f"{ROOT}/webseiten/scm-creatives"
SITE = f"{PROJ}/public"
KIT = f"{ROOT}/baukaesten/drehbuch"
BASE = "https://scm-creatives.de"
RUHIG = True  # v1.3 Modus „ruhig“: größere Schrift, Schlagwörter, weniger Abschnitte
TODAY = datetime.date.today().isoformat()
LM_FILE = f"{KIT}/generatoren/scm-lastmod.json"

# ------------------------------------------------------------------
# Kontaktdaten und offene Entscheidungen: None = noch nicht geliefert
# ------------------------------------------------------------------
TEL = "0172 5361079"   # Anzeige; der tel:-Link wird international (+49) gebaut
WHATSAPP = "491725361079"   # nur Ziffern, mit Ländervorwahl (für wa.me)
MAIL = "scm.creatives@gmx.de"
IG = "https://www.instagram.com/scm.creatives/"
TEAM = ["Oskar von Esebeck", "Yannick Ruch"]
# Anbieter laut Impressum (von SCM geliefert)
ANBIETER = dict(firma="Blacksnapper Consulting", inhaber="Andreas Mattolat", strasse="Hüttenweg 4",
                ort="21516 Tramm", land="Deutschland", ust="DE265142237")


def ph(text):
    return f'<span class="ph">[PLATZHALTER: {text}]</span>'


ANTWORTZEIT = "innerhalb von 24 Stunden"
PREIS_SATZ = ("Den Preis für euer Paket nennen wir euch im Kennenlerngespräch. "
              "Ihr bekommt ihn schriftlich, bevor ihr etwas unterschreibt.")
NB = "3&nbsp;Testvideos"


def tel_href():
    if not TEL:
        return "/kontakt#telefon"
    d = TEL.replace(" ", "")
    return "tel:" + ("+49" + d[1:] if d.startswith("0") else d)


def tel_intl():
    """Telefonnummer international für Impressum und Datenschutz: 0172 … → +49 172 …"""
    return "+49 " + TEL[1:] if TEL and TEL.startswith("0") else (TEL or "")


def wa_href(msg="Hallo SCM Creatives, wir interessieren uns für die 3 kostenlosen Testvideos."):
    if WHATSAPP:
        from urllib.parse import quote
        return f"https://wa.me/{WHATSAPP}?text={quote(msg)}"
    return "/kontakt#whatsapp"


def mail_href():
    return f"mailto:{MAIL}" if MAIL else "/kontakt#mail"


NEWTAB = '<span class="sr-only"> (öffnet neues Fenster)</span>'


def ext(href):
    return ' target="_blank" rel="noopener"' if href.startswith("http") else ""


def ext_txt(href):
    return NEWTAB if href.startswith("http") else ""


# ------------------------------------------------------------------
# Icons
# ------------------------------------------------------------------
ARROW = '<svg viewBox="0 0 22 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M0 6h20M15 1l5 5-5 5"/></svg>'
ARROW_UR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>'
I_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.6a8.2 8.2 0 0 1-12.1 7.2L4 20l1.3-3.8A8.2 8.2 0 1 1 20 11.6z"/><path d="M9 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1 1.4 1.8 2.5 2.3.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .9-.6 1.6-1.5 1.8-.7.1-1.6.1-3.4-.8-2.1-1.1-3.4-3.1-3.6-3.5-.2-.4-.9-1.3-.9-2.4 0-.6.2-1 .4-1.3z"/></svg>'
I_WA_BTN = I_WA.replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"')
I_TEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h3.5l1.7 4.3-2.2 1.5a11 11 0 0 0 7.2 7.2l1.5-2.2L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>'
I_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
I_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>'
I_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
I_PAUSE = '<svg class="ic-pause" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
I_PLAY = '<svg class="ic-play" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>'

# ------------------------------------------------------------------
# Daten: Reels (belegt aus .preview-cache/scm/video-*.info.json und den
# Whisper-Transkripten; Zahlen = Instagram, Stand 21.10.2026)
# ------------------------------------------------------------------
REELS = {
    "maler-rohwer": dict(
        kunde="Jens Rohwer Malermeister", kurz="Maler Rohwer", client="maler-rohwer",
        branche="handwerk", format="Kunden-Sketch", dauer=30, upload="2026-10-20",
        ig="https://www.instagram.com/reel/DeuGwFgs_PK/",
        titel="„Also mein Nachbar hätte das anders gemacht …“",
        hook="POV: Jeder Handwerker kennt diese Art von Kunden",
        beats=[("00:00", "Einstieg", "Text im Bild: „POV: jeder Handwerker kennt diese Art von Kunden“. Wer im Handwerk arbeitet, fühlt sich sofort angesprochen."),
               ("00:01", "Wiedererkennen", "Der Kunde steht daneben: „Mein Nachbar hat das aber früher immer anders gemacht.“"),
               ("00:09", "Steigerung", "Er hat noch Material im Schuppen gefunden. Ob man das nicht preislich gegenrechnen könnte?"),
               ("00:17", "Pointe", "Am Ende will er es sich lieber selbst beibringen, damit es nächstes Mal günstiger wird."),
               ("Unterm Video", "Aufruf", "„Was war der nervigste Spruch, den ihr euch auf der Baustelle anhören musstet?“ Die Kommentare erzählen die Geschichte weiter.")],
        stats=(209, 24), ki=False),
    "jan-hein-klaas-pit": dict(
        kunde="Jan & Hein & Klaas & Pit", kurz="Jan & Hein & Klaas & Pit", client="jan-hein-klaas-pit",
        branche="gastronomie", format="POV-Sketch", dauer=26, upload="2026-10-20",
        ig="https://www.instagram.com/reel/DetkcAvpH3H/",
        titel="„Manche Gespräche muss man einfach für einen guten Mittagstisch opfern“",
        hook="POV: Du bist mit den Augen mal wieder ganz woanders",
        beats=[("00:00", "Einstieg", "Text im Bild: „POV: Du bist mit den Augen mal wieder ganz woanders“, dazu der volle Teller."),
               ("00:01", "Wiedererkennen", "Einer erzählt am Tisch von seinem letzten Date. Alle kennen diesen Freund."),
               ("00:11", "Steigerung", "Die anderen müssen plötzlich „kurz aufs Klo“."),
               ("00:17", "Pointe", "Ein Fremder fragt nach dem freien Platz und bekommt ihn sofort. Prioritäten sind Prioritäten."),
               ("Unterm Video", "Aufruf", "„Wen würdest du für unseren Mittagstisch in Kiel sitzen lassen?“")],
        stats=(63, 20), ki=False),
    "das-kleine-steakhouse": dict(
        kunde="Das kleine Steakhouse", kurz="Das kleine Steakhouse", client="das-kleine-steakhouse",
        branche="gastronomie", format="Tisch-Sketch", dauer=18, upload="2026-10-20",
        ig="https://www.instagram.com/reel/Det_06XPmbX/",
        titel="„Freundschaft endet da, wo du ungefragt an meine Pommes gehst“",
        hook="Ich glaub da hat er was falsch verstanden …",
        beats=[("00:00", "Einstieg", "Text im Bild: „Ich glaub da hat er was falsch verstanden …“ Man will sofort wissen, was passiert ist."),
               ("00:06", "Wiedererkennen", "Die Idee am Tisch: mehrere Teller bestellen, jeder nimmt von jedem."),
               ("00:12", "Pointe", "Einer hat den Plan sehr wörtlich genommen. Komplett leer."),
               ("00:15", "Nachklapp", "„Ich hab gesagt nächstes Mal, ne?“"),
               ("Unterm Video", "Aufruf", "„Markier den Kollegen, der immer ‚nur mal probieren‘ will.“ Jede Markierung bringt das Video zu neuen Leuten.")],
        stats=(43, 8), ki=False),
    "kletterwald-travemuende": dict(
        kunde="Kletterwald Travemünde", kurz="Kletterwald Travemünde", client="kletterwald-travemuende",
        branche="unternehmen", format="Angebot mit Frist", dauer=13, upload="2026-10-19",
        ig="https://www.instagram.com/reel/DerbG9WBf2C/",
        titel="„Euer Klassenausflug im Kletterwald Travemünde“",
        hook="Liebe Lehrerinnen, liebe Lehrer …",
        beats=[("00:00", "Einstieg", "Direkte Ansprache der Zielgruppe: „Liebe Lehrerinnen, liebe Lehrer“, dazu der Titel im Bild."),
               ("00:01", "Bedarf", "Lehrkräfte suchen noch etwas für ihre Klasse, egal ob Klettern oder Teambuilding."),
               ("00:06", "Angebot mit Frist", "Bis Anfang November läuft noch die Förderung für Schulklassen."),
               ("00:10", "Aufruf", "„Also nutzt die Chance und kommt noch mal vorbei.“ Kurz, klar, in 13 Sekunden erzählt.")],
        stats=(37, 11), ki=False),
    "bs-ortsanalyse": dict(
        kunde="BS Immobiliengruppe", kurz="BS Immobiliengruppe", client="bs-immobiliengruppe",
        branche="immobilien", format="Ortsanalyse", dauer=31, upload="2026-10-18",
        ig="https://www.instagram.com/reel/DepDiWkN88H/",
        titel="Drei Orte rund um Kiel im Check",
        hook="Du suchst eine Immobilie rund um Kiel?",
        beats=[("00:00", "Einstieg", "„Du suchst eine Immobilie rund um Kiel? Dann solltest du diese Orte auf dem Schirm haben.“"),
               ("00:04", "Struktur", "Drei Orte, eingeblendet mit Karten-Pins: Kronshagen, Schwentinental, Eckernförde."),
               ("00:07", "Nutzen", "Zwei Orte im Detail, die Argumente als Einblendung: Preise, Minuten bis in die Innenstadt, Kitas und Schulen, Einkauf, Ärzte."),
               ("00:26", "Aufruf", "„Schreibt uns jetzt in die Kommentare, welchen Ort ihr als nächstes analysiert haben wollt.“ So kann daraus eine Serie werden.")],
        stats=None, ki=True),
    "bs-entweder-oder": dict(
        kunde="BS Immobiliengruppe", kurz="BS Immobiliengruppe", client="bs-immobiliengruppe",
        branche="immobilien", format="Entweder oder", dauer=46, upload="2026-10-20",
        ig="https://www.instagram.com/reel/DeuM70KtRNq/",
        titel="Entweder oder: Immobilienmakler-Edition",
        hook="Entweder oder · Immobilienmakler-Edition",
        beats=[("00:00", "Einstieg", "Titel-Chip „Entweder oder · Immobilienmakler-Edition“. Ein bekanntes Spiel, neu besetzt."),
               ("00:03", "Runde 1", "Preis oder Lage? Marc und Leon zeigen jeweils auf ihre Wahl."),
               ("00:08", "Runde 2", "Altbau oder Neubau? Spätestens jetzt merkt man: Auch Makler ticken unterschiedlich."),
               ("00:12", "Weitere Runden", "Mieten oder Kaufen, Land oder Stadt, Penthouse oder Erdgeschoss. Keine Sprache nötig, nur Musik, Grafik und Persönlichkeit."),
               ("Unterm Video", "Aufruf", "„Was darf bei eurer Traumimmobilie in Kiel auf keinen Fall fehlen?“")],
        stats=None, ki=True),
}

CLIENTS = {
    "bs-immobiliengruppe": dict(name="BS Immobiliengruppe", h1="BS Immobilien&shy;gruppe", branche="immobilien", ort="Kiel und Umgebung",
        reels=["bs-ortsanalyse", "bs-entweder-oder"], ig="https://www.instagram.com/bs.immobiliengruppe/",
        intro="Immobilienmakler aus Kiel. Marc und Leon stehen selbst vor der Kamera und zeigen, wer hinter den Objekten steckt: mit Ortsanalysen für Käufer und mit Formaten, die Persönlichkeit zeigen."),
    "maler-rohwer": dict(name="Jens Rohwer Malermeister", h1="Jens Rohwer Malermeister", branche="handwerk", ort="Kiel",
        reels=["maler-rohwer"], ig="https://www.instagram.com/maler.rohwer/",
        intro="Malerbetrieb mit Humor. Kein Vorher-Nachher, sondern eine Szene, die jeder Handwerker kennt. Genau das kommentieren die Leute."),
    "jan-hein-klaas-pit": dict(name="Jan & Hein & Klaas & Pit", h1="Jan & Hein & Klaas & Pit", branche="gastronomie", ort="Kiel",
        reels=["jan-hein-klaas-pit"], ig="https://www.instagram.com/janheinklaaspit/",
        intro="Gastronomie mit Mittagstisch in Kiel. Das Video macht aus der Mittagspause eine kleine Geschichte, die jeder aus seiner eigenen Mittagspause kennt."),
    "das-kleine-steakhouse": dict(name="Das kleine Steakhouse", h1="Das kleine Steakhouse", branche="gastronomie", ort="Kiel, Kirchhofallee",
        reels=["das-kleine-steakhouse"], ig="https://www.instagram.com/das_kleine_steakhouse/",
        intro="Steakhouse in der Kieler Kirchhofallee. Der Sketch spielt genau dort, wo die Gäste sitzen: am Tisch, mit dem Essen im Bild."),
    "kletterwald-travemuende": dict(name="Kletterwald Travemünde", h1="Kletterwald Travemünde", branche="unternehmen", ort="Travemünde",
        reels=["kletterwald-travemuende"], ig="https://www.instagram.com/kletterwaldtravemuende/",
        intro="Kletterwald an der Lübecker Bucht. Hier zählen klare Angebote zur richtigen Zeit, zum Beispiel für Schulklassen kurz vor Saisonende."),
    "die-drei": dict(name="Weinbar „Die Drei“", h1="Weinbar<br><em>„Die Drei“</em>", branche="gastronomie", ort="Kiel",
        reels=[], ig=None,
        intro="Weinbar in Kiel. Die Videos zeigen wir hier, sobald sie online sind."),
}

BRANCHEN = {
    "gastronomie": dict(name="Gastronomie", short="Gastro", fuer="euren Gastrobetrieb", img="gastro-dreh", im="in der Gastronomie", aus="aus der Gastronomie",
        head_reel="jan-hein-klaas-pit",
        seo_h1="Social-Media-Videos und Reels für die Gastronomie in Kiel und an der Lübecker Bucht",
        h1="Volle Tische.<br><em>Volle Kommentare.</em>",
        lead="Restaurants, Bars, Cafés und Mittagstische in Kiel und an der Lübecker Bucht. Wir drehen dort, wo eure Gäste sitzen, und erzählen Geschichten, über die eure Gäste am Tisch noch reden.",
        card="Sketche am Tisch, Mittagstisch, Aktionen, Küche von innen.",
        chips=["POV-Sketch", "Mittagstisch", "Aktion"],
        pain_h2="Gutes Essen.<br><em>Stiller Feed.</em>",
        pains=["Ihr postet Essensfotos, aber niemand kommentiert.", "Neue Gäste finden euch nicht, Stammgäste wissen nichts von Aktionen.", "Im Alltag bleibt keine Zeit für Instagram."],
        formats=[("POV-Sketch am Tisch", "Eine Situation, die jeder vom Essengehen kennt. Das Essen ist immer im Bild.", "„POV: Du sagst, du nimmst nur einen Salat.“"),
                 ("Mittagstisch der Woche", "Die Wochenkarte als kurze Szene statt als Liste. Wiederkehrend, gut planbar.", "„Montag, 11:58 Uhr. Alle schauen zur Küchentür.“"),
                 ("Aktion mit Termin", "Studententag, Event, Saisonstart. Ein Angebot, ein Datum, ein klarer Aufruf.", "„Diesen Donnerstag passiert hier etwas, das ihr nicht verpassen solltet.“"),
                 ("Küche von innen", "Wer kocht hier eigentlich? Menschen statt Hochglanz.", "„So sieht unser Freitagabend hinter der Tür aus.“")],
        refs=["das-kleine-steakhouse", "jan-hein-klaas-pit", "die-drei"],
        proof=None,
        faq=[("Stören die Drehs den laufenden Betrieb?", "Wir stimmen den Drehtermin mit euch ab, zum Beispiel vor der Öffnung oder in einer ruhigen Stunde. Gäste filmen wir nur, wenn sie einverstanden sind."),
             ("Wer spielt in den Videos mit?", "Das entscheiden wir gemeinsam im Skript. Viele zeigen ihr Team, andere bleiben lieber hinter der Kamera."),
             ("Können wir Aktionen kurzfristig bewerben?", f"Ja, wenn wir den Termin früh genug kennen. Sagt uns Aktionen am besten {ph('nötiger Vorlauf, z. B. zwei Wochen')} vorher.")],
        title="Reels für Restaurants und Gastro in Kiel | SCM Creatives",
        desc="Reels für Restaurants, Bars und Mittagstische in Kiel und an der Lübecker Bucht: Sketche am Tisch, Aktionen, Küche von innen. Nach Skript, vor Ort gedreht."),
    "immobilien": dict(name="Immobilien", short="Immobilien", fuer="euer Maklerbüro", img="immobilien-dreh", im="bei Maklern", aus="aus der Immobilien&shy;branche",
        head_reel="bs-entweder-oder",
        seo_h1="Social-Media-Videos und Reels für Immobilienmakler in Kiel und Umgebung",
        h1="Makler, die man kennt,<br><em>bevor man anruft.</em>",
        lead="Für Immobilienmakler, Verwalter und Bauträger. Wir machen aus Objekten, Orten und euren Köpfen Videos, die zeigen, wer dahintersteckt.",
        card="Entweder oder, Ortsanalysen, Objekte, Blick ins Büro.",
        chips=["Ortsanalyse", "Entweder oder", "Objekt-Rundgang"],
        pain_h2="Gute Objekte.<br><em>Gleiche Fotos.</em>",
        pains=["Objektfotos sehen bei allen Maklern gleich aus.", "Eigentümer entscheiden nach Vertrauen, nicht nach Exposé.", "Videos ohne Plan bekommen kaum Aufrufe."],
        formats=[("Ortsanalyse", "Mehrere Orte, die wichtigsten Argumente als Einblendung, am Ende ein Aufruf für die nächste Folge. Zeigt Marktwissen ohne Verkaufsdruck.", "„Drei Orte, die ihr bei der Suche rund um Kiel kennen solltet.“"),
                 ("Entweder oder", "Zwei Makler, schnelle Entscheidungen, viel Persönlichkeit. Funktioniert auch ohne Sprache.", "„Altbau oder Neubau? Balkon oder Garten?“"),
                 ("Objekt-Rundgang mit Aufhänger", "Nicht Raum für Raum, sondern mit dem einen Detail, das neugierig macht.", "„In dieser Wohnung gibt es einen Raum, mit dem keiner rechnet.“"),
                 ("Blick ins Büro", "Wer arbeitet hier, wie läuft ein Termin ab? Nähe schafft Vertrauen.", "„Was liegt bei Maklern eigentlich auf dem Schreibtisch?“")],
        refs=["bs-immobiliengruppe"],
        proof=None,
        faq=[("Dürfen wir Objekte von Eigentümern zeigen?", "Nur mit deren Einverständnis. Das klären wir vor jedem Objektdreh mit euch."),
             ("Müssen wir selbst vor die Kamera?", "Nicht zwingend, aber es lohnt sich: Bei Maklern wirkt Persönlichkeit am stärksten. Wir schreiben die Skripte so, dass ihr nichts auswendig lernen müsst."),
             ("Für welche Kanäle sind die Videos?", "Alle Videos sind im Hochformat und eignen sich für Instagram Reels, TikTok und YouTube Shorts.")],
        title="Reels für Immobilienmakler in Kiel | SCM Creatives",
        desc="Videos für Immobilienmakler in Kiel: Ortsanalysen, Entweder oder, Objekte mit Aufhänger. Für mehr Vertrauen bei Eigentümern und Käufern in der Region."),
    "handwerk": dict(name="Handwerk", short="Handwerk", fuer="euren Handwerksbetrieb", img="handwerk-dreh", im="im Handwerk", aus="aus dem Handwerk",
        head_reel="maler-rohwer",
        seo_h1="Social-Media- und Recruiting-Videos für Handwerksbetriebe in Kiel und an der Lübecker Bucht",
        h1="Handwerk, das man<br><em>gern anschaut.</em>",
        lead="Für Malerbetriebe, Elektriker, Tischler, Sanitär und Heizung und alle, die mit den Händen arbeiten. Videos, die Kunden zum Schmunzeln bringen und Bewerbern zeigen, wie es bei euch wirklich ist.",
        card="Kunden-Sketche, Azubi-Formate, Vorher und Nachher, Teamvideos.",
        chips=["Kunden-Sketch", "Recruiting", "Vorher und Nachher"],
        pain_h2="Gute Arbeit.<br><em>Keiner sieht’s.</em>",
        pains=["Ihr habt volle Auftragsbücher, aber keine Bewerber.", "Fotos von fertigen Wänden zeigen nicht, wer ihr seid.", "Auf der Baustelle ist keine Zeit zum Filmen."],
        formats=[("Kunden-Sketch", "Die Sprüche, die jeder Handwerker kennt, als kurze Szene. Hohe Wiedererkennung, viele Kommentare. Schon umgesetzt für Maler Rohwer.", "„Also mein Nachbar hätte das anders gemacht …“"),
                 ("Ein Tag als Azubi", "Ein ehrliches Recruiting-Format: Bewerber sehen, wie euer Alltag wirklich aussieht.", "„6:45 Uhr, erster Kaffee. So startet mein Tag als Azubi.“"),
                 ("Vorher und Nachher", "Der Unterschied in Sekunden. Mit einem Aufhänger statt nur mit Musik.", "„Diese Wand hat drei Tapetenschichten versteckt.“"),
                 ("Fachfrage in 30 Sekunden", "Eine Frage, die Kunden immer stellen, kurz beantwortet. Zeigt Kompetenz.", "„Wie oft kann man Raufaser eigentlich überstreichen?“")],
        refs=["maler-rohwer"],
        proof=None,
        faq=[("Wie lange hält uns ein Dreh auf der Baustelle auf?", f"Wir drehen dort, wo ihr ohnehin arbeitet, und stimmen den Termin mit euch ab. Weil das Skript vorher steht, weiß jeder, was zu tun ist. {ph('typische Dauer eines Drehtermins')}"),
             ("Helfen die Videos auch bei der Mitarbeitersuche?", "Ja. Recruiting-Videos gehören zu unseren Leistungen, zum Beispiel als Azubi-Format oder Teamvorstellung."),
             ("Was, wenn wir keine lustigen Typen sind?", "Nicht jedes Video muss ein Sketch sein. Fachfragen und Vorher-Nachher-Formate funktionieren auch ruhig erzählt.")],
        title="Reels und Recruiting-Videos für Handwerker | SCM Creatives",
        desc="Kurzvideos für Handwerksbetriebe: Kunden-Sketche, Azubi-Formate, Vorher und Nachher. Für mehr Aufträge und mehr Bewerbungen. Kiel und Lübecker Bucht."),
    "unternehmen": dict(name="Unternehmen", short="Unternehmen", fuer="euer Unternehmen", img="unternehmen-dreh", im="bei Unternehmen", aus="von Unternehmen",
        head_reel="kletterwald-travemuende",
        seo_h1="Social-Media-Videos für Unternehmen und Freizeitbetriebe in Kiel und an der Lübecker Bucht",
        h1="Euer Unternehmen,<br><em>in 30 Sekunden erzählt.</em>",
        lead="Für Freizeitbetriebe, Dienstleister, Händler und den Mittelstand in Kiel und an der Lübecker Bucht. Wir bringen Angebote, Events und Menschen so auf den Punkt, dass sie im Feed hängen bleiben.",
        card="Angebote mit Frist, Events, Mitarbeitende, Blick hinter die Kulissen.",
        chips=["Angebot mit Frist", "Event", "Recruiting"],
        pain_h2="Gute Angebote.<br><em>Kein Echo.</em>",
        pains=["Eure Angebote gehen im Feed unter.", "Ihr habt spannende Menschen, aber niemand sieht sie.", "Euer Imagefilm ist gut, aber für den Feed zu lang."],
        formats=[("Angebot mit Frist", "Zielgruppe direkt ansprechen, Angebot nennen, Termin setzen. In 13 Sekunden gesagt. Schon umgesetzt für den Kletterwald Travemünde.", "„Liebe Lehrerinnen, liebe Lehrer …“"),
                 ("Event-Ankündigung", "Halloween, Saisonstart, Tag der offenen Tür. Spannung aufbauen statt Plakat abfilmen.", "„Am 31. Oktober sieht es hier anders aus.“"),
                 ("Menschen im Unternehmen", "Mitarbeitende stellen ihren Job vor. Stark für Marke und Recruiting.", "„Ich erkläre euch in 20 Sekunden, was ich hier mache.“"),
                 ("Hinter den Kulissen", "Was Kunden nie sehen, aber spannend finden.", "„So sieht es hier aus, bevor die Tür aufgeht.“")],
        refs=["kletterwald-travemuende"],
        proof=None,
        faq=[("Passt das auch, wenn eure Kunden andere Firmen sind?", "Ja. Auch Geschäftskunden schauen Kurzvideos. Wir passen Formate und Ton an eure Zielgruppe an."),
             ("Macht ihr auch längere Filme?", "Ja. Imagefilme gehören zu unseren Zusatzleistungen, Fotos vom Drehtag auch."),
             ("Können wir die Videos auch für Werbung nutzen?", "Ja. Auf Wunsch spielen wir sie als Werbeanzeigen in der Region aus.")],
        title="Social-Media-Videos für Unternehmen in Kiel | SCM Creatives",
        desc="Kurzvideos für Freizeitbetriebe, Dienstleister und Mittelstand: Angebote mit Frist, Events, Menschen im Unternehmen. Kiel und Lübecker Bucht."),
}

NAV_MAIN = [("/leistungen", "Leistungen"), ("/branchen", "Branchen"), ("/referenzen", "Referenzen"),
            ("/so-arbeiten-wir", "Ablauf"), ("/pakete", "Pakete"), ("/faq", "FAQ")]
NAV_ALL = [("/", "Start"), ("/leistungen", "Leistungen"), ("/branchen", "Branchen"), ("/referenzen", "Referenzen"),
           ("/so-arbeiten-wir", "Ablauf"), ("/pakete", "Pakete"), ("/testvideos", "3 Testvideos"),
           ("/vision", "Vision"), ("/ueber-uns", "Über uns"), ("/faq", "FAQ"), ("/kontakt", "Kontakt")]

# ------------------------------------------------------------------
# FAQ
# ------------------------------------------------------------------
FAQ_CORE = [
    ("Was kostet das?", f"Wir arbeiten mit drei Paketen: 4, 8 oder 12 Videos im Monat. Der Preis hängt vom Umfang ab. {PREIS_SATZ} Die {NB} sind kostenlos, ein Vertrag entsteht erst, wenn ihr danach weitermachen wollt. <a href=\"/pakete\">Zu den Paketen</a>"),
    ("Was sind die 3 kostenlosen Testvideos?", "Wir lernen euch kennen, schreiben drei Skripte, drehen bei euch vor Ort und schneiden drei fertige Videos. Danach entscheidet ihr, ob es weitergeht. <a href=\"/testvideos\">So laufen die Testvideos ab</a>"),
    ("Müssen wir selbst vor die Kamera?", f"Ihr könnt, müsst aber nicht. Wer mitspielt, klären wir im Skript. {ph('Wer spielt, wenn ihr nicht vor die Kamera wollt, z. B. Darsteller aus dem SCM-Team')} Auswendig lernen muss niemand."),
    ("Wie viel Zeit kostet uns das?", f"Zum Start ein Gespräch. Danach pro Runde ein Blick aufs Skript und ein Drehtermin bei euch. {ph('Wie viele Drehtermine pro Monat bei 4, 8 und 12 Videos')} Schreiben, Schnitt und auf Wunsch das Posten übernehmen wir."),
    ("Wo seid ihr unterwegs?", "In Kiel und an der Lübecker Bucht. Wir kommen zu euch in den Laden, ins Büro oder auf die Baustelle. <a href=\"/kontakt\">Einsatzgebiet ansehen</a>"),
    ("Für welche Branchen arbeitet ihr?", "Grundsätzlich für jede Branche. Referenzen haben wir aus Gastronomie, Immobilien, Handwerk und Freizeit. <a href=\"/branchen\">Alle Branchen</a>"),
]
FAQ_MORE = [
    ("Wer postet die Videos?", "Das könnt ihr selbst machen oder uns überlassen. Posting und Community-Management gehören zu unseren Zusatzleistungen."),
    ("Macht ihr auch Werbeanzeigen?", "Ja. Auf Wunsch spielen wir eure Videos als Werbeanzeigen aus, gezielt in eurer Region."),
    ("Wie läuft die Abstimmung?", "Ihr lest das Skript vor dem Dreh. Dreh, Schnitt und Feinschliff übernehmen wir."),
    ("Für welche Kanäle sind die Videos?", "Alle Videos sind im Hochformat 9:16 und eignen sich für Instagram Reels, TikTok und YouTube Shorts."),
    ("Wie schnell können wir starten?", f"Nach dem Erstgespräch planen wir die {NB}. {ph('Wie viele Wochen vom Erstgespräch bis zu den fertigen Testvideos')}"),
    ("Wem gehören die Videos?", ph("Wer welche Rechte an den Videos hat: wo ihr sie nutzen dürft, wie lange, ob ihr Rohmaterial bekommt")),
]
FAQ_OBJ = {
    "bindung": ("Wie lange binden wir uns?", "Laufzeit und Konditionen besprechen wir im Kennenlerngespräch. Vor den Testvideos unterschreibt ihr nichts."),
    "gefallen": ("Was, wenn uns die Testvideos nicht gefallen?", "Dann sagt ihr Nein, und es kostet euch nichts. Ein Vertrag entsteht erst, wenn ihr weitermachen wollt."),
    "garantie": ("Könnt ihr garantieren, dass die Videos mehr Gäste oder Bewerbungen bringen?", "Nein, das kann ehrlicherweise niemand. Was wir zusagen: Jedes Video folgt einem Skript mit starkem ersten Satz und klarem Aufruf."),
    "gefilmt": ("Was ist, wenn jemand nicht gefilmt werden möchte?", f"Dann filmen wir die Person nicht. Gäste filmen wir nur, wenn sie einverstanden sind. {ph('Einwilligung für euer Team: Vorlage von SCM, ja oder nein')}"),
    "selbst": ("Wir posten schon selbst. Lohnt sich das trotzdem?", "Ihr könnt weiter selbst posten. Wir liefern die Videos mit Skript, Dreh und Schnitt, und auf Wunsch übernehmen wir auch das Posten."),
    "dauer": ("Wie lange dauert ein Drehtermin?", f"{ph('typische Dauer, z. B. pro 4 Videos')} Den Termin stimmen wir mit euch ab, zum Beispiel vor der Öffnung."),
}

# ------------------------------------------------------------------
# Bausteine
# ------------------------------------------------------------------
VER = ""


def url(path):
    return BASE + path


def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>"


ORG_MIN = {"@type": "Organization", "@id": BASE + "/#org", "name": "SCM Creatives", "url": BASE + "/"}
ORG = {"@type": "Organization", "@id": BASE + "/#org", "name": "SCM Creatives", "url": BASE + "/",
       "logo": {"@type": "ImageObject", "url": BASE + "/img/logo-dark.png", "width": 600, "height": 213},
       "description": "Social-Media-Agentur für Kiel und die Lübecker Bucht: Kurzvideos nach Skript, gedreht vor Ort.",
       "sameAs": [IG],
       "areaServed": [{"@type": "City", "name": "Kiel"}, {"@type": "Place", "name": "Lübecker Bucht"}]}
AREA = [{"@type": "City", "name": "Kiel"}, {"@type": "Place", "name": "Lübecker Bucht"}]


def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": url(p)} for i, (p, n) in enumerate(items)]}


def head(path, title, desc, og=None, og_alt=None, noindex=False, ld=None, lcp=None, body_cls=""):
    og = og or "/img/og.jpg"
    og_alt = og_alt or "SCM Creatives: Kein Zufall. Ein Skript. Social-Media-Videos aus Kiel und von der Lübecker Bucht."
    robots = '<meta name="robots" content="noindex, follow">\n' if noindex else ""
    lds = "".join(jsonld(x) for x in (ld or []))
    lcp_tag = f'<link rel="preload" as="image" href="{lcp}" type="image/webp" fetchpriority="high">\n' if lcp else ""
    klappe = """<div class="klappe" aria-hidden="true">
  <div class="kl-board">
    <div class="kl-stick"></div>
    <div class="kl-body">
      <div class="kl-title">SCM <b>Creatives</b></div>
      <div><span>Szene</span>01</div><div><span>Take</span>1</div>
      <div><span>Ort</span>Kiel</div><div><span>Skript</span>Fertig</div>
    </div>
  </div>
</div>
""" if path == "/" else ""
    cls = " ".join(x for x in ("ruhig" if RUHIG else "", body_cls) if x)
    bc = f' class="{cls}"' if cls else ""
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{html.escape(desc, quote=True)}">
{'' if path == '/404' else f'<link rel="canonical" href="{url(path)}">'}
{robots}<meta name="theme-color" content="#0B0B0C">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="SCM Creatives">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{html.escape(desc, quote=True)}">
<meta property="og:url" content="{url(path)}">
<meta property="og:image" content="{BASE}{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(og_alt, quote=True)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/favicon-96.png" sizes="96x96" type="image/png">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preload" href="/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/courier-prime-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/drehbuch.css?v={VER}">
{lcp_tag}{lds}
</head>
<body{bc}>
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
{klappe}<div class="curtain" aria-hidden="true"></div>
"""


def section_of(path):
    for h, _ in NAV_ALL:
        if h != "/" and (path == h or path.startswith(h + "/")):
            return h
    return path


HUD = "" if RUHIG else '<div class="hud" aria-hidden="true" data-runtime="120"><i></i><span>REC</span><span class="tc">00:00:00:00</span><span class="scene">SZENE 01</span></div>\n'


def header(path):
    sec = section_of(path)

    def cur(h):
        if h == path:
            return ' aria-current="page"'
        if h == sec and h != "/":
            return ' aria-current="true"'
        return ""
    nav = "".join(f'<a href="{h}"{cur(h)}>{l}</a>' for h, l in NAV_MAIN)
    allnav = "".join(f'<a href="{h}"{cur(h)}><i aria-hidden="true">SZ {i:02d}</i>{l}</a>' for i, (h, l) in enumerate(NAV_ALL, 1))
    return f"""<header class="site-header">
  <a class="brand" href="/" aria-label="SCM Creatives, zur Startseite"><img src="/img/logo.svg" alt="SCM Creatives" width="113" height="40"></a>
  <nav class="mainnav" aria-label="Hauptnavigation">{nav}</nav>
  <div class="head-right">
    <a class="btn btn-sm" href="/anfrage">{NB} anfragen</a>
    <button class="motion-btn" type="button" aria-pressed="false" aria-label="Videos und Animationen anhalten">{I_PAUSE}{I_PLAY}</button>
    <button class="menu-btn" aria-expanded="false" aria-controls="menu"><span class="mb-txt">Menü</span><span class="mb-ico" aria-hidden="true"><i></i><i></i></span></button>
  </div>
</header>
<div class="nav-overlay" id="menu">
  <nav class="nav-list" aria-label="Alle Seiten">{allnav}</nav>
  <aside class="nav-side">
    <p class="lbl"><span class="dot blink"></span>Jetzt drehen</p>
    <p class="d3">{NB}.<br><em>Kostenlos.</em></p>
    <p>Wir lernen euch kennen, schreiben die Skripte und drehen bei euch vor Ort. Danach entscheidet ihr.</p>
    <div class="btn-row"><a class="btn" href="/anfrage">{NB} anfragen</a><a class="btn btn-ghost" href="{wa_href()}"{ext(wa_href())}>WhatsApp{ext_txt(wa_href())}</a></div>
    <div class="nav-small"><a href="{IG}" target="_blank" rel="noopener">Instagram{NEWTAB}</a><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a></div>
  </aside>
</div>
{HUD}<main id="inhalt">
"""


def footer():
    cols = f"""
      <div class="foot-col"><b>Seiten</b><a href="/leistungen">Leistungen</a><a href="/so-arbeiten-wir">Ablauf</a><a href="/referenzen">Referenzen</a><a href="/pakete">Pakete</a><a href="/testvideos">{NB}</a><a href="/faq">FAQ</a></div>
      <div class="foot-col"><b>Branchen</b><a href="/branchen/gastronomie">Gastronomie</a><a href="/branchen/immobilien">Immobilien</a><a href="/branchen/handwerk">Handwerk</a><a href="/branchen/unternehmen">Unternehmen</a><a href="/branchen">Alle Branchen</a></div>
      <div class="foot-col"><b>Kontakt</b><a href="/anfrage">Anfrage starten</a><a href="{wa_href()}"{ext(wa_href())}>WhatsApp{ext_txt(wa_href())}</a><a href="{tel_href()}">Anrufen</a><a href="{IG}" target="_blank" rel="noopener">Instagram{NEWTAB}</a><a href="/ueber-uns">Über uns</a><a href="/vision">Vision</a></div>"""
    return f"""</main>
<footer class="credits" data-scene="ABSPANN">
  <div class="wrap">
    <div class="cr-roll">
      <p class="lbl"><span class="dot"></span>Abspann</p>
      <dl>
        <dt>Skript</dt><dd class="sep" aria-hidden="true">·</dd><dd>SCM Creatives</dd>
        <dt>Kamera</dt><dd class="sep" aria-hidden="true">·</dd><dd>SCM Creatives</dd>
        <dt>Schnitt</dt><dd class="sep" aria-hidden="true">·</dd><dd>SCM Creatives</dd>
        <dt>Hauptrolle</dt><dd class="sep" aria-hidden="true">·</dd><dd>Ihr</dd>
        <dt>Drehorte</dt><dd class="sep" aria-hidden="true">·</dd><dd>Kiel und Lübecker Bucht</dd>
      </dl>
    </div>
    <div class="foot-grid">
      <div class="foot-brand"><img src="/img/logo.svg" alt="SCM Creatives" width="130" height="46" loading="lazy">
        <p>Social-Media-Agentur für Kiel und die Lübecker Bucht. Kurzvideos nach Skript, gedreht bei euch vor Ort.</p></div>{cols}
    </div>
    <div class="foot-base"><span>© 2026 SCM Creatives</span><span><a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a></span></div>
  </div>
</footer>
<nav class="mbar" aria-label="Schnellkontakt">
  <a class="btn" href="/anfrage">{NB} anfragen</a>
  <a class="ic" href="{wa_href()}"{ext(wa_href())} aria-label="WhatsApp schreiben">{I_WA}</a>
  <a class="ic" href="{tel_href()}" aria-label="Anrufen">{I_TEL}</a>
</nav>
<script src="/js/drehbuch.js?v={VER}" defer></script>
</body>
</html>
"""


def lbl(text, blink=False):
    if RUHIG:
        text = re.sub(r"^Szene \d+ · ", "", text)
    return f'<p class="lbl"><span class="dot{" blink" if blink else ""}"></span>{text}</p>'


def steps3(link=True):
    items = [("1", "Skript", "Wir schreiben. Ihr lest vorab."),
             ("2", "Dreh", "Bei euch vor Ort. Wir kommen zu euch."),
             ("3", "Schnitt", "Kurz, mit Untertiteln, fürs Handy.")]
    t = "".join(f'<article class="step3 rv" data-d="{i+1}"><span class="n" aria-hidden="true">{n}</span><h3>{h}</h3><p>{x}</p></article>'
                for i, (n, h, x) in enumerate(items))
    l = f'<a class="btn-link" href="/so-arbeiten-wir">Ablauf im Detail {ARROW}</a>' if link else ""
    return f'<div class="steps3">{t}</div><div class="done rv"><strong>Zack. <em>Fertig.</em></strong>{l}</div>'


def angebot(link=("/testvideos", "So läuft's")):
    l = f'<a class="btn btn-ghost" href="{link[0]}">{link[1]}</a>' if link else ""
    return f"""<section class="sec" data-scene="SZENE · ANGEBOT"><div class="wrap"><div class="offer2 rv">
  <div class="stack" style="gap:1.2rem">{lbl("Zum Start", True)}<h2 class="d2">{NB}.<br><em>Kostenlos.</em></h2>
    <div class="btn-row"><a class="btn" href="/anfrage">Jetzt anfragen</a>{l}</div></div>
  <ul class="ticks-big"><li>Kostenlos</li><li>Unverbindlich</li><li>Bei euch gedreht</li><li>Erst danach entscheiden</li></ul>
</div>
<p class="alt-line">Lieber direkt? <a href="{wa_href()}"{ext(wa_href())}>Per WhatsApp schreiben{ext_txt(wa_href())}</a> oder <a href="{tel_href()}">anrufen</a>.</p>
</div></section>"""


def packs3():
    data = [("4", "Einmal pro Woche", False), ("8", "Zweimal pro Woche", True), ("12", "Dreimal pro Woche", False)]
    out = ""
    for i, (n, rhythm, hot) in enumerate(data):
        tag = '<span class="tag">Der Mittelweg</span>' if hot else ""
        btn = "btn" if hot else "btn btn-ghost"
        out += f"""<article class="pk{' hot' if hot else ''} rv" data-d="{i+1}">{tag}<strong>{n}</strong><span>Videos im Monat.<br>{rhythm}.</span>
      <a class="{btn}" href="/anfrage?paket={n}">Mit {n} Videos starten</a></article>"""
    return f'<div class="packs3">{out}</div><p class="pack-note rv">Alle mit Skript, Dreh und Schnitt. Vorher: {NB}, kostenlos.</p>'


def branchen_row():
    btns = "".join(f'<a class="qs-btn" href="/branchen/{k}">{b["name"]}{ARROW}</a>' for k, b in BRANCHEN.items())
    btns += f'<a class="qs-btn" href="/branchen">Andere Branche{ARROW}</a>'
    return f'<div class="qs-row rv">{btns}</div>'


def sec_head(num, label, title, lead=None, link=None):
    l = f'<a class="btn-link rv" href="{link[0]}">{link[1]} {ARROW}</a>' if link else ""
    ld = f'<p class="lead rv" data-d="1">{lead}</p>' if lead else ""
    return f"""<div class="sec-head"><div>{lbl(f"Szene {num} · {label}") if num else lbl(label)}
      <h2 class="d2 split">{title}</h2></div>{l}{ld}</div>"""


def phone(slug, kind="loop", cls="", eager=False, sound=False, ui=True, label=True, plx=None, watch=False, named=True):
    r = REELS[slug]
    src = f"/media/{slug}-loop" if kind == "loop" else f"/media/{slug}"
    poster = f"/media/{slug}-sm.webp" if kind == "loop" else f"/media/{slug}.webp"
    b = BRANCHEN[r["branche"]]["name"]
    if sound and watch:
        snd = f'<button class="sound sound--txt" type="button" aria-pressed="false">{I_SOUND}<span>Ton + Untertitel</span></button>'
    else:
        snd = f'<button class="sound" type="button" aria-pressed="false" aria-label="Ton">{I_SOUND}</button>' if sound else ""
    p = f' data-plx="{plx}"' if plx else ""
    kit = " · mit KI-Elementen" if r.get("ki") else ""
    aria = f'aria-label="Video: {html.escape(r["titel"])}, {html.escape(r["kunde"])}{kit}"' if named else 'aria-hidden="true"'
    trk = f'<track kind="captions" srclang="de" label="Deutsch" src="/media/{slug}.de.vtt">' if (kind == "full" and os.path.exists(f"{SITE}/media/{slug}.de.vtt")) else ""
    if watch:
        video = (f'<video muted playsinline loop controls preload="none" width="720" height="1280" poster="{poster}" data-auto data-watch {aria}>'
                 f'<source src="{src}.webm" type=\'video/webm; codecs="av01.0.05M.08, opus"\'>'
                 f'<source src="{src}.mp4" type="video/mp4">{trk}</video>')
        img = ""
    else:
        pw, phh = (432, 768) if kind == "loop" else (720, 1280)
        lazy = "" if eager else ' loading="lazy"'
        img = f'<img class="ph-poster" src="{poster}" alt="" width="{pw}" height="{phh}" decoding="async"{lazy}>'
        video = f'<video muted playsinline loop preload="none" data-auto data-mp4="{src}.mp4" data-webm="{src}.webm" {aria}>{trk}</video>'
    uihtml = ""
    if ui:
        bot = f'<div class="pu-bot"><b>{r["kurz"]}</b><span>{b} · {r["format"]}{kit}</span></div>' if label else '<div></div>'
        uihtml = f"""<div class="phone-ui" aria-hidden="true"><div class="pu-top"><span class="pu-rec"><i></i>REC</span><span class="pu-tc">00:00:00:00</span></div>{bot}</div>"""
    return f"""<div class="phone vf {cls}"{p}>{img}{video}{uihtml}{snd}</div>"""


def reel_card(slug, d=None, rv=True):
    r = REELS[slug]
    dd = f' data-d="{d}"' if (d and rv) else ""
    b = BRANCHEN[r['branche']]['name']
    ki = ' <span class="ki">· mit KI-Elementen</span>' if r.get("ki") else ""
    return f"""<article class="reel{' rv' if rv else ''}"{dd} data-branche="{r['branche']}">
      <a href="/referenzen/{r['client']}" aria-label="{html.escape(r['kurz'])}, {b}, {html.escape(r['format'])}{' · mit KI-Elementen' if r.get('ki') else ''}: Aufbau ansehen">
        {phone(slug, label=False, named=False)}
        <div class="reel-meta" style="margin-top:.9rem"><b>{r['kurz']}</b> <span>{b} · {r['format']}{ki}</span></div>
      </a></article>"""


def faq_block(items, open_first=True):
    out = ""
    for i, (q, a) in enumerate(items):
        o = " open" if (i == 0 and open_first) else ""
        out += f'<details{o}><summary>{q}<i aria-hidden="true"></i></summary><div class="ans"><p>{a}</p></div></details>'
    return f'<div class="faq rv">{out}</div>'


def bcard(key, d=None, wide=False):
    b = BRANCHEN[key]
    dd = f' data-d="{d}"' if d else ""
    chips = "".join(f'<span class="chip">{c}</span>' for c in b["chips"])
    return f"""<a class="bcard{' wide' if wide else ''} rv"{dd} href="/branchen/{key}">
      <img src="/img/ki-platzhalter-{b['img']}-sm.webp" alt="" loading="lazy" width="760" height="424">
      <span class="go" aria-hidden="true">{ARROW_UR}</span>
      <p class="lbl">Branche</p><h3 class="d3">{b['name']}</h3><p>{b['card']}</p><div class="chips">{chips}</div></a>"""


def bcard_any(d=None):
    dd = f' data-d="{d}"' if d else ""
    return f"""<a class="bcard bcard--any wide rv"{dd} href="/branchen">
      <span class="go" aria-hidden="true">{ARROW_UR}</span>
      <p class="lbl">Und sonst?</p><h3 class="d3">Eure Branche</h3>
      <p>Einzelhandel, Hotels, Fitness, Friseure, Autohäuser, Vereine: Wir finden das Format, das zu euch passt.</p></a>"""


STEPS = [
    ("01", "Erstgespräch", "Wir lernen euch und eure Ziele kennen.", "Ein Gespräch"),
    ("02", "Skript", "Wir schreiben. Ihr lest vorab.", "Skript lesen"),
    ("03", "Dreh vor Ort", "Wir kommen zu euch. Kamera, Mikrofon, klarer Ablauf.", "Ein Termin bei euch"),
    ("04", "Schnitt", "Tempo, Untertitel, Texte im Bild.", "Nichts"),
    ("05", "Veröffentlichen", "Ihr postet selbst oder wir übernehmen das.", "Nichts, wenn wir posten"),
    ("06", "Auswerten und nachschärfen", "Was gut läuft, gibt die Richtung für die nächsten Videos vor.", "Nichts"),
]


def drehplan(steps=STEPS, head_lbl=("Nr.", "Schritt", "Was passiert", "Euer Aufwand"), eff="Euer Aufwand"):
    rows = "".join(f"""<div class="dp-row"><span class="dp-no">{n}</span><h3>{t}</h3><p>{d}</p>
      <p class="dp-eff"><small>{eff}</small>{e}</p></div>""" for n, t, d, e in steps)
    hd = "".join(f"<span>{x}</span>" for x in head_lbl)
    return f"""<div class="drehplan"><div class="dp-row dp-head" aria-hidden="true">{hd}</div>{rows}</div>"""


PACK_INC = ["Konzept und Skripte", "Dreh bei euch vor Ort", "Schnitt mit Untertiteln und Texten im Bild",
            "Hochformat für Reels, TikTok und Shorts"]


def packs(compact=False):
    data = [("4", "Einmal pro Woche", "Etwa ein Video pro Woche.", "Passt, wenn ihr mit einem festen Format regelmäßig sichtbar sein wollt, zum Beispiel dem Mittagstisch der Woche.", False),
            ("8", "Zweimal pro Woche", "Etwa zwei Videos pro Woche.", "Passt, wenn eine eigene Serie entstehen soll und daneben Platz für Aktionen bleibt.", True),
            ("12", "Dreimal pro Woche", "Etwa drei Videos pro Woche.", "Passt, wenn ihr mehrere Formate parallel zeigen wollt, zum Beispiel Objekte, Ortsanalysen und Persönlichkeit.", False)]
    out = ""
    for i, (n, name, rhythm, fit, hot) in enumerate(data):
        tag = '<span class="tag">Der Mittelweg</span>' if hot else ""
        why = '<p class="meta">Bei zwei Videos pro Woche entsteht eine Serie mit festem Rhythmus.</p>' if (hot and not compact) else ""
        extra = "" if compact else f'<p class="fit">{fit}</p><p class="meta">Drehtermine im Monat: {ph("Anzahl")}</p>{why}'
        out += f"""<article class="pack{' hot' if hot else ''} rv" data-d="{i+1}">{tag}
          <div class="pack-num"><strong>{n}</strong><span>Videos<br>pro Monat</span></div>
          <h3>{name}</h3>{extra}
          <a class="btn{'' if hot else ' btn-ghost'}" href="/anfrage?paket={n}">Mit {n} Videos starten</a></article>"""
    inc = "" if compact else '<div class="pack-inc rv"><b>In jedem Paket enthalten</b>' + "".join(f"<span>{x}</span>" for x in PACK_INC) + "</div>"
    return f'{inc}<div class="packs">{out}</div><p class="pack-note rv">Vor dem ersten Paket stehen {NB}, kostenlos. Ihr entscheidet erst danach.</p>'


def offer(scene="05"):
    return f"""<section class="sec" data-scene="SZENE {scene} · ANGEBOT"><div class="wrap">
  <div class="offer">
    <div class="offer-bg"><img class="ph-poster" src="/img/ki-platzhalter-kiel-foerde-sm.webp" alt="" loading="lazy" width="760" height="424" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><video muted playsinline loop preload="none" data-auto data-mp4="/media/ki-platzhalter-kiel-foerde.mp4" data-webm="/media/ki-platzhalter-kiel-foerde.webm" aria-hidden="true" style="position:relative"></video></div>
    <span class="ki-tag">KI-Platzhalter</span>
    <div class="stack">{lbl(f"Szene {scene} · Das Angebot", True)}
      <h2 class="d1 split">{NB}.<br><em>Kostenlos.</em></h2>
      <p class="lead rv">Bevor ihr euch für ein Paket entscheidet, zeigen wir euch, wie es werden kann. In eurem Betrieb, an eurem Ort, nach unserem Skript.</p></div>
    <div class="takes">
      <div class="take rv" data-d="1"><span class="lbl">Take 1</span><h3>Kennenlernen</h3><p>Ein Gespräch über euch, eure Gäste oder Kunden und das, was ihr erreichen wollt.</p></div>
      <div class="take rv" data-d="2"><span class="lbl">Take 2</span><h3>{NB}</h3><p>Wir schreiben die Skripte, drehen bei euch und schneiden drei fertige Videos.</p></div>
      <div class="take rv" data-d="3"><span class="lbl">Take 3</span><h3>Ihr entscheidet</h3><p>Gefällt es euch, geht es mit einem Paket weiter. Wenn nicht, kostet es euch nichts.</p></div>
    </div>
    <div class="btn-row rv"><a class="btn" href="/anfrage">{NB} kostenlos anfragen</a><a class="btn btn-ghost" href="/testvideos">So laufen die Testvideos ab</a></div>
  </div></div></section>"""


def offer_strip(scene, title=None, text=None):
    title = title or f"Bevor ihr euch entscheidet:<br><em>{NB}, kostenlos.</em>"
    text = text or "Gedreht bei euch vor Ort, nach unserem Skript. Ein Vertrag erst, wenn ihr weitermachen wollt."
    return f"""<section class="sec-sm" data-scene="SZENE {scene} · ANGEBOT"><div class="wrap"><div class="offer-strip rv">
  <div>{lbl(f"Szene {scene} · Das Angebot", True)}<h2 class="d3">{title}</h2><p>{text}</p></div>
  <div class="btn-row"><a class="btn" href="/anfrage">{NB} anfragen</a><a class="btn btn-ghost" href="/testvideos">So läuft es ab</a></div>
</div></div></section>"""


def cta_band(title="Euer nächstes Video<br><em>beginnt mit einem Gespräch.</em>", text=None, scene="AUFRUF"):
    text = text or f"Erzählt uns in zwei Minuten, wer ihr seid. Wir melden uns {ANTWORTZEIT} mit einem Vorschlag für eure {NB}."
    return f"""<section class="sec" data-scene="SZENE · {scene}"><div class="wrap cta-band">
  {lbl("Letzte Szene", True)}<h2 class="d2 split">{title}</h2><p class="lead rv">{text}</p>
  <div class="btn-row rv"><a class="btn" href="/anfrage">{NB} anfragen</a><a class="btn btn-ghost" href="{wa_href()}"{ext(wa_href())}>{I_WA_BTN} WhatsApp{ext_txt(wa_href())}</a></div>
</div></section>"""


def quickstart():
    btns = "".join(f'<a class="qs-btn" href="/anfrage?branche={k}">{b["name"]}{ARROW}</a>' for k, b in BRANCHEN.items())
    btns += f'<a class="qs-btn" href="/anfrage?branche=andere">Andere Branche{ARROW}</a>'
    return f"""<section class="sec quickstart" data-scene="SZENE · AUFRUF"><div class="wrap cta-band">
  {lbl("Letzte Szene", True)}<h2 class="d2 split">In welcher Branche<br><em>seid ihr?</em></h2>
  <p class="lead rv">Ein Tipp, und ihr seid schon bei Frage 2 von 5. Danach melden wir uns {ANTWORTZEIT} mit einem Vorschlag für eure {NB}.</p>
  <div class="opts rv">{btns}</div>
  <p class="alt-line rv">Lieber direkt? <a href="{wa_href()}"{ext(wa_href())}>Per WhatsApp schreiben{ext_txt(wa_href())}</a> oder <a href="{tel_href()}">anrufen</a>.</p>
</div></section>"""


def crumb_nav(crumbs):
    parts = []
    for p, n in crumbs[:-1]:
        parts.append(f'<a href="{p}">{n}</a><span aria-hidden="true">/</span>')
    parts.append(f'<span aria-current="page">{crumbs[-1][1]}</span>')
    return f'<nav class="crumbs" aria-label="Brotkrumen">{"".join(parts)}</nav>'


def page_head(scene, h1, lead, crumbs=None, media=None, video=None, extra="", seo_h1=None, head_reel=None, label=None):
    cr = crumb_nav(crumbs) if crumbs else ""
    m = ""
    if video:
        m = f"""<div class="ph-media"><img src="/img/{media}.webp" alt="" fetchpriority="high" width="1376" height="768" style="position:absolute;inset:0"><video muted playsinline loop preload="none" data-auto data-mp4="/media/{video}.mp4" data-webm="/media/{video}.webm" aria-hidden="true" style="position:relative"></video></div><span class="ki-tag">KI-Platzhalter</span>"""
    elif media:
        m = f'<div class="ph-media"><img src="/img/{media}.webp" alt="" fetchpriority="high" width="1376" height="768"></div><span class="ki-tag">KI-Platzhalter</span>'
    cls = " has-media" if (media or video) else ""
    label = label if label is not None else f"Szene 01 · {scene}"
    if seo_h1:
        heading = f'<h1 class="h1-kicker">{seo_h1}</h1>\n    <p class="d1 split" data-split="chars">{h1}</p>'
    else:
        heading = f'<h1 class="d1 split" data-split="chars">{h1}</h1>'
    body = f"""{cr}{lbl(label, True)}
    {heading}
    <p class="lead rv" data-d="1">{lead}</p>{extra}"""
    if head_reel:
        inner = f'<div class="head-grid"><div class="stack">{body}</div><div class="head-phone">{phone(head_reel, eager=True)}</div></div>'
    else:
        inner = body
    return f"""<section class="page-head{cls}" data-scene="SZENE 01 · {html.escape(scene.upper())}">{m}
  <div class="wrap">{inner}
  </div></section>"""


# ------------------------------------------------------------------
# Seiten
# ------------------------------------------------------------------
PAGES = {}


def page(path, title, desc, body, ld=None, noindex=False, og=None, og_alt=None, lcp=None, body_cls="", anfrage_qs=None):
    h = head(path, title, desc, og=og, og_alt=og_alt, noindex=noindex, ld=ld, lcp=lcp, body_cls=body_cls) + header(path) + body + footer()
    if anfrage_qs:
        h = h.replace('href="/anfrage"', f'href="/anfrage?{anfrage_qs}"')
    PAGES[path] = dict(html=h, noindex=noindex)


def skript_section(scene="04"):
    beats = [("00:00", "Einstieg", "Text im Bild: „POV: Du sagst, du nimmst nur einen Salat.“"),
             ("00:02", "Wiedererkennen", "Am Tisch bestellen alle Burger. Ein langer Blick auf die Karte."),
             ("00:06", "Steigerung", "Der erste Burger kommt. Der zweite. Der dritte. Der Salat wirkt plötzlich klein."),
             ("00:12", "Pointe", "„Einen Burger. Für mich. Und Pommes.“"),
             ("00:15", "Aufruf", "„Markiert den Freund, der immer ‚nur einen Salat‘ nimmt.“")]
    expl = [("01", "Einstieg", "Stoppt das Wischen. Die ersten zwei Sekunden zählen."),
            ("02", "Wiedererkennen", "Eine Situation, die eure Kunden kennen."),
            ("03", "Steigerung", "Zwei, drei Schritte. Jede Sekunde hat eine Aufgabe."),
            ("04", "Pointe", "Der Moment, für den man das Video teilt."),
            ("05", "Aufruf", "Kommentieren, markieren, vorbeikommen.")]
    b = "".join(f'<div class="beat"><span class="tc">{t}</span><div><b>{l}</b>{x}</div></div>' for t, l, x in beats)
    e = "".join(f'<div class="scrub-step"><span class="num">{n}</span><h3 class="d3">{t}</h3><p>{x}</p></div>' for n, t, x in expl)
    return f"""<section class="skript" data-scrub data-scene="SZENE {scene} · DAS SKRIPT" id="skript">
  <div class="skript-stage"><div class="wrap">
    <div style="margin-bottom:clamp(1.2rem,3vh,2.4rem)">{lbl(f"Szene {scene} · Das Skript")}<h2 class="d2" style="margin-top:.8rem">So entsteht ein Video,<br><em>das man zu Ende schaut.</em></h2></div>
    <div class="skript-grid">
      <div class="sheet" role="group" aria-label="Beispiel-Skript">
        <div class="sheet-head"><span>Beispiel-Skript</span><span>Innen. Restaurant. Abend.</span></div>{b}
        <p class="sheet-note">Frei erfundenes Beispiel. Daneben ein echtes Video mit demselben Aufbau.</p>
      </div>
      <div class="skript-phone">{phone('das-kleine-steakhouse', ui=True, label=False)}
        <div class="tl" aria-hidden="true"><i></i></div><div class="tl-lbl" aria-hidden="true"><span>00:00</span><span>00:15</span></div></div>
      <div class="explain">{e}</div>
    </div>
  </div></div>
</section>"""




def build_home():
    names = [("bs-immobiliengruppe", "BS Immobiliengruppe"), ("maler-rohwer", "Maler Rohwer"), ("jan-hein-klaas-pit", "Jan & Hein & Klaas & Pit"),
             ("das-kleine-steakhouse", "Das kleine Steakhouse"), ("kletterwald-travemuende", "Kletterwald Travemünde")]
    clients = ", ".join(f'<a href="/referenzen/{k}">{n}</a>' for k, n in names)
    reels = "".join(reel_card(s, rv=False) for s in ["maler-rohwer", "jan-hein-klaas-pit", "das-kleine-steakhouse", "bs-entweder-oder", "kletterwald-travemuende", "bs-ortsanalyse"])
    body = f"""
<section class="hero" data-scene="SZENE 01 · HOOK">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1 class="h1-kicker">Social-Media-Agentur für Kiel und die Lübecker Bucht</h1>
      <p class="d1 split" data-split="chars">Kein Zufall.<br><em>Ein Skript.</em></p>
      <p class="words rv" data-d="2"><span>Skript</span><span>Dreh vor Ort</span><span>Schnitt</span><span><em>Fertig.</em></span></p>
      <div class="btn-row rv" data-d="3"><a class="btn" href="/anfrage">{NB} kostenlos</a><a class="btn btn-ghost" href="/referenzen">Videos ansehen</a></div>
      <p class="clients rv" data-d="4"><b>Schon dabei:</b> {clients}</p>
    </div>
    <div class="hero-phones rv-focus" role="group" aria-label="Aktuelle Videos von SCM Creatives">
      {phone('das-kleine-steakhouse', cls='p1', eager=True, plx='0.06')}
      {phone('maler-rohwer', cls='p2', eager=True, plx='0.12')}
      {phone('jan-hein-klaas-pit', cls='p3', eager=True, plx='0.04')}
    </div>
  </div>
</section>

<section class="sec" data-scene="SZENE 02 · SO GEHT'S"><div class="wrap">
  {sec_head(None, "So läuft's", "Drei Schritte.<br><em>Euer Aufwand: wenig.</em>")}
  {steps3()}
</div></section>

<section class="sec panel" data-scene="SZENE 03 · VIDEOS">
  <div class="wrap">{sec_head(None, "Unsere Videos", "Gedreht in Kiel<br><em>und Travemünde.</em>", None, ("/referenzen", "Alle Videos"))}</div>
  <div class="reels rv" role="region" tabindex="0" aria-label="Referenzvideos, seitlich scrollbar">{reels}</div>
</section>

{angebot()}

<section class="sec" data-scene="SZENE 05 · PAKETE" style="padding-top:0"><div class="wrap">
  {sec_head(None, "Pakete", "4, 8 oder 12<br><em>Videos im Monat.</em>", None, ("/pakete", "Pakete im Detail"))}
  {packs3()}
</div></section>

<section class="sec panel" data-scene="SZENE 06 · BRANCHEN"><div class="wrap">
  {sec_head(None, "Branchen", "Eure Branche?<br><em>Passt.</em>", None, ("/faq", "Häufige Fragen"))}
  {branchen_row()}
</div></section>
"""
    ld = [{"@context": "https://schema.org", "@graph": [ORG, {"@type": "WebSite", "@id": BASE + "/#web", "url": BASE + "/", "name": "SCM Creatives", "inLanguage": "de-DE", "publisher": {"@id": BASE + "/#org"}}]}]
    page("/", "Social-Media-Agentur Kiel: Reels nach Skript | SCM Creatives",
         "Social-Media-Agentur für Kiel und die Lübecker Bucht: Reels und Kurzvideos nach Skript für Gastro, Immobilien, Handwerk und Firmen. 3 Testvideos gratis.",
         body, ld=ld)


def build_leistungen():
    items = [
        ("02", "Posting und Community", "Wir posten und antworten. Ihr müsst nicht ans Handy.", ["Veröffentlichung nach Plan", "Texte und Hashtags", "Kommentare und Nachrichten"], "posting", None),
        ("03", "Werbeanzeigen", "Mehr Reichweite in eurer Region. Auf Instagram, TikTok und Facebook.", ["Anzeigen aus euren Videos", "Instagram, TikTok, Facebook", "Zielgruppe in der Region"], "ads", None),
        ("04", "Recruiting-Videos", "Mitarbeitende findet man dort, wo sie scrollen.", ["Ein Tag als Azubi", "Team stellt sich vor", "Stellenanzeigen als Video"], "recruiting", ("/branchen/handwerk#formate", "Beispiele im Handwerk")),
        ("05", "Fotos und Imagefilm", "Fotos vom Drehtag oder ein längerer Film.", ["Fotos vom Drehtag", "Imagefilm", "Material für Website und Profile"], "fotos", None),
    ]
    svc = ""
    for i, (n, t, d, li, key, extra) in enumerate(items):
        x = f'<a class="btn-link" href="{extra[0]}">{extra[1]} {ARROW}</a>' if extra else ""
        svc += f"""<article class="svc-item rv" data-d="{i % 2 + 1}"><span class="lbl">Dazu buchbar</span><h3>{t}</h3><p>{d}</p>
      <ul class="ticks">{''.join(f'<li>{y}</li>' for y in li)}</ul>
      <div class="btn-row"><a class="btn-link" href="/anfrage?extras={key}">Mit anfragen {ARROW}</a>{x}</div></article>"""
    body = page_head("Leistungen", "Alles, was ein Video<br><em>braucht.</em>",
                     "Kurzvideos nach Skript. Dazu, wenn ihr wollt: Posting, Werbeanzeigen, Recruiting, Fotos.",
                     crumbs=[("/", "Start"), ("/leistungen", "Leistungen")], media="ki-platzhalter-schnitt",
                     seo_h1="Leistungen: Reels und Kurzvideos, Posting, Werbeanzeigen, Recruiting-Videos") + f"""
<section class="sec" data-scene="SZENE 02 · KERNLEISTUNG"><div class="wrap">
  <h2 class="sr-only">Unsere Leistungen</h2>
  <div class="svc"><article class="svc-item lead-item rv">
    <div class="stack"><span class="lbl">Kernleistung</span><h3 style="font-size:clamp(2rem,4vw,3.4rem)">Kurzvideos nach Skript</h3>
      <p>Skript, Dreh vor Ort, Schnitt. Alles aus einer Hand.</p>
      <ul class="ticks"><li>Formate und Skripte für euren Betrieb</li><li>Dreh in Kiel und an der Lübecker Bucht</li><li>Schnitt mit Untertiteln und Texten im Bild</li><li>Hochformat für Reels, TikTok und Shorts</li></ul>
      <div class="btn-row"><a class="btn" href="/anfrage">{NB} anfragen</a><a class="btn-link" href="/referenzen">Videos ansehen {ARROW}</a></div></div>
    <div class="duo">{phone('maler-rohwer', cls='rv-focus', label=True)}{phone('das-kleine-steakhouse', cls='rv-focus', label=True)}</div>
  </article>{svc}</div>
</div></section>
{angebot()}"""
    ld = [crumbs_ld([("/", "Start"), ("/leistungen", "Leistungen")]),
          {"@context": "https://schema.org", "@type": "Service", "name": "Social-Media-Kurzvideos nach Skript", "serviceType": "Social-Media-Videoproduktion",
           "provider": ORG_MIN, "areaServed": AREA,
           "description": "Konzept, Skript, Dreh vor Ort und Schnitt von Kurzvideos für Instagram Reels, TikTok und YouTube Shorts. Zusätzlich Posting, Community-Management, Werbeanzeigen, Recruiting-Videos, Fotos und Imagefilm."}]
    page("/leistungen", "Leistungen: Reels, Posting, Werbeanzeigen | SCM Creatives",
         "Kurzvideos nach Skript, dazu Posting und Community, Werbeanzeigen, Recruiting-Videos, Fotos und Imagefilm. Für Betriebe in Kiel und an der Lübecker Bucht.",
         body, ld=ld)


def build_branchen():
    body = page_head("Branchen", "Jede Branche<br><em>hat Geschichten.</em>",
                     "Vier Branchen mit echten Referenzen. Für alle anderen finden wir das passende Format.",
                     crumbs=[("/", "Start"), ("/branchen", "Branchen")],
                     seo_h1="Social-Media-Videos für Gastronomie, Immobilien, Handwerk und Unternehmen") + f"""
<section class="sec-sm" data-scene="SZENE 02 · REFERENZBRANCHEN"><div class="wrap">
  <div class="rv" style="margin-bottom:1.6rem">{lbl("Referenzbranchen")}</div><h2 class="sr-only">Unsere Referenzbranchen</h2>
  <div class="bcards">{bcard('gastronomie', 1, wide=True)}{bcard('immobilien', 2, wide=True)}{bcard('handwerk', 1, wide=True)}{bcard('unternehmen', 2, wide=True)}</div>
</div></section>
<section class="sec" data-scene="SZENE 03 · AUCH FÜR EUCH"><div class="wrap">
  {sec_head(None, "Auch für euch", "Nicht dabei?<br><em>Kein Problem.</em>")}
  <div class="region rv">{''.join(f'<span>{x}</span>' for x in ["Einzelhandel", "Hotels und Ferienwohnungen", "Fitness", "Friseure und Kosmetik", "Autohäuser", "Vereine", "Bildung und Kurse"])}</div>
  <div class="btn-row rv" style="margin-top:2.4rem"><a class="btn" href="/anfrage?branche=andere">Eure Branche anfragen</a></div>
</div></section>
{angebot()}"""
    page("/branchen", "Branchen: Gastro, Immobilien, Handwerk, Firmen | SCM Creatives",
         "Social-Media-Videos und Reels für Gastronomie, Immobilienmakler, Handwerk und Unternehmen in Kiel und an der Lübecker Bucht. Auch für eure Branche.",
         body, ld=[crumbs_ld([("/", "Start"), ("/branchen", "Branchen")])])


def ref_tile(client_key, d=None):
    c = CLIENTS[client_key]
    dd = f' data-d="{d}"' if d else ""
    if c["reels"]:
        return reel_card(c["reels"][0], d)
    return f"""<article class="reel rv"{dd} data-branche="{c['branche']}"><a href="/referenzen/{client_key}">
      <div class="phone phone--empty"><span>Video<br>folgt</span></div>
      <div class="reel-meta" style="margin-top:.9rem"><b>{c['name']}</b><span>Gastronomie · Video folgt</span></div></a></article>"""


def build_branche(key):
    b = BRANCHEN[key]
    pains = "".join(f'<li class="rv" data-d="{i+1}">{p}</li>' for i, p in enumerate(b["pains"]))
    fm = "".join(f"""<article class="format rv" data-d="{i % 4 + 1}"><span class="lbl">Format {i+1}</span><h3>{t}</h3><p>{d}</p></article>"""
                 for i, (t, d, h) in enumerate(b["formats"]))
    refs = "".join(ref_tile(c, i + 1) for i, c in enumerate(b["refs"]))
    proof = f'<p class="proof rv">{b["proof"]}</p>' if b.get("proof") else ""
    body = page_head(b["name"], b["h1"], b["lead"], crumbs=[("/", "Start"), ("/branchen", "Branchen"), (f"/branchen/{key}", b["name"])],
                     media=f"ki-platzhalter-{b['img']}", seo_h1=b["seo_h1"], head_reel=b["head_reel"],
                     extra=f'<div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage?branche={key}">{NB} anfragen</a><a class="btn btn-ghost" href="#formate">Formate ansehen</a></div>') + f"""
<section class="sec" data-scene="SZENE 02 · AUSGANGSLAGE"><div class="wrap"><div class="split2" style="align-items:start">
  <div class="stack">{lbl("Kennt ihr das?")}<h2 class="d2 split">{b['pain_h2']}</h2></div>
  <ul class="pains">{pains}</ul>
</div></div></section>
<section class="sec panel" id="formate" data-scene="SZENE 03 · FORMATE"><div class="wrap">
  {sec_head(None, "Formate", f"Was {b['im']}<br><em>funktioniert.</em>")}
  <div class="formats">{fm}</div>
</div></section>
<section class="sec" data-scene="SZENE 04 · REFERENZEN"><div class="wrap">
  {sec_head(None, "Referenzen", "Hier haben wir<br><em>schon gedreht.</em>", None, ("/referenzen", "Alle Videos"))}
  <div class="reel-grid">{refs}</div>{proof}
</div></section>
<section class="sec panel" data-scene="SZENE 05 · ABLAUF"><div class="wrap">
  {sec_head(None, "So läuft's", "Drei Schritte.<br><em>Euer Aufwand: wenig.</em>")}
  {steps3()}
</div></section>
<section class="sec" data-scene="SZENE 06 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head(None, "Fragen", f"Fragen<br><em>{b['aus']}.</em>")}
  {faq_block(b['faq'])}
</div></section>
{angebot()}"""
    ld = [crumbs_ld([("/", "Start"), ("/branchen", "Branchen"), (f"/branchen/{key}", b["name"])]),
          {"@context": "https://schema.org", "@type": "Service", "name": f"Social-Media-Videos für {b['name']}", "serviceType": "Social-Media-Videoproduktion",
           "provider": ORG_MIN, "areaServed": AREA,
           "audience": {"@type": "BusinessAudience", "name": b["name"]}, "description": b["lead"]}]
    page(f"/branchen/{key}", b["title"], b["desc"], body, ld=ld, anfrage_qs=f"branche={key}",
         lcp=f"/img/ki-platzhalter-{b['img']}.webp")


def build_referenzen():
    order = ["maler-rohwer", "jan-hein-klaas-pit", "bs-entweder-oder", "das-kleine-steakhouse", "kletterwald-travemuende", "bs-ortsanalyse"]
    tiles = "".join(reel_card(s, (i % 4) + 1) for i, s in enumerate(order)) + ref_tile("die-drei", 3)
    filt = "".join(f'<button type="button" data-f="{k}" aria-pressed="{"true" if k == "alle" else "false"}">{n}</button>'
                   for k, n in [("alle", "Alle"), ("gastronomie", "Gastronomie"), ("immobilien", "Immobilien"), ("handwerk", "Handwerk"), ("unternehmen", "Unternehmen")])
    body = page_head("Referenzen", "Gedreht für echte<br><em>Betriebe.</em>",
                     "Echte Videos für Betriebe aus Kiel und Travemünde. Tippt ein Video an und seht, wie es aufgebaut ist.",
                     crumbs=[("/", "Start"), ("/referenzen", "Referenzen")],
                     seo_h1="Referenzen: Social-Media-Videos aus Kiel und von der Lübecker Bucht") + f"""
<section class="sec-sm" data-scene="SZENE 02 · VIDEOS"><div class="wrap">
  <div class="rv" style="margin-bottom:1.6rem">{lbl("Alle Videos")}</div><h2 class="sr-only">Alle Videos</h2>
  <div class="filter" role="group" aria-label="Nach Branche filtern">{filt}</div>
  <p class="sr-only" role="status" id="filter-status"></p>
  <div class="reel-grid">{tiles}</div>
  <p class="q-note" style="margin-top:2rem">Hier ohne Ton. Mit Ton und Untertiteln auf den einzelnen Seiten.</p>
</div></section>
{angebot()}"""
    page("/referenzen", "Referenzen: Social-Media-Videos aus Kiel | SCM Creatives",
         "Videos für BS Immobiliengruppe, Maler Rohwer, Jan & Hein & Klaas & Pit, Das kleine Steakhouse und Kletterwald Travemünde. Mit Aufbau und Erklärung.",
         body, ld=[crumbs_ld([("/", "Start"), ("/referenzen", "Referenzen")])])


def vtt_text(slug):
    f = f"{SITE}/media/{slug}.de.vtt"
    if not os.path.exists(f):
        return None
    lines = [l.strip() for l in open(f, encoding="utf-8").read().split("\n")]
    txt = [l for l in lines if l and l != "WEBVTT" and not l.isdigit() and "-->" not in l]
    return "\n".join(txt)


def upload_ts(slug):
    """Veröffentlichungszeit aus den Instagram-Metadaten (yt-dlp info.json), sonst nur das Datum."""
    r = REELS[slug]
    code = r["ig"].rstrip("/").split("/")[-1]
    f = f"{ROOT}/.preview-cache/scm/video-{code}.info.json"
    if os.path.exists(f):
        ts = json.load(open(f, encoding="utf-8")).get("timestamp")
        if ts:
            return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    return r["upload"]


def video_desc(slug):
    r = REELS[slug]
    ki = " Teile des Videos wurden mithilfe von KI erstellt." if r.get("ki") else ""
    return f"{r['format']} für {r['kunde']} ({BRANCHEN[r['branche']]['name']}), produziert von SCM Creatives. Erster Satz: „{r['hook']}“.{ki}"


def case_details(slug, c, b, with_quote=False):  # Zitat erst, wenn freigegebene Kundenstimmen da sind
    r = REELS[slug]
    beats = "".join(f'<li><span class="tc">{t}</span><b>{l}</b><p>{x}</p></li>' for t, l, x in r["beats"])
    facts = [("Kunde", r["kunde"]), ("Branche", b["name"]), ("Format", r["format"]), ("Länge", f"{r['dauer']} Sekunden"),
             ("Veröffentlicht", ".".join(reversed(r["upload"].split("-")))), ("Ort", c["ort"] or ph("Ort des Malerbetriebs Rohwer"))]
    fx = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in facts)
    if r.get("ki"):
        fx += '<div class="ki"><dt>Hinweis</dt><dd>Teile dieses Videos wurden mithilfe von KI erstellt. So ist es auch im Original auf Instagram gekennzeichnet.</dd></div>'
    stat = ""  # Instagram-Zahlen veralten schnell, deshalb nicht mehr auf der Seite
    tr = vtt_text(slug)
    chk = f'<p class="q-note">{ph("Transkript von SCM gegenlesen lassen, einzelne Sätze sind unsicher")}</p>' if slug == "das-kleine-steakhouse" else ""
    trans = (f'<details class="faq transcript"><summary>Transkript lesen<i aria-hidden="true"></i></summary><div class="ans"><p>{html.escape(tr)}</p>{chk}</div></details>'
             if tr else '<p class="q-note" style="margin-top:1.4rem">Dieses Video kommt ohne Sprache aus: nur Musik und Texte im Bild.</p>')
    quote = f'<div class="quote" style="margin-top:2.4rem"><p>{ph("Zitat von " + c["name"] + ", 1 bis 2 Sätze, mit Name und Funktion, schriftlich freigegeben")}</p><cite>{c["name"]}</cite></div>' if with_quote else ""
    return f"""<dl class="case-facts">{fx}</dl>
      <h3 style="margin-bottom:1rem">So ist das Video aufgebaut</h3>
      <ol class="beats">{beats}</ol>{stat}{trans}{quote}"""


def build_case(key):
    c = CLIENTS[key]
    crumbs = [("/", "Start"), ("/referenzen", "Referenzen"), (f"/referenzen/{key}", c["name"])]
    keys = [k for k in CLIENTS if CLIENTS[k]["reels"]]
    if key in keys:
        i = keys.index(key)
        prev_k, next_k = keys[i - 1], keys[(i + 1) % len(keys)]
        nav = f"""<div class="case-nav"><a class="btn-link" href="/referenzen/{prev_k}">Vorherige: {CLIENTS[prev_k]['name']}</a><a class="btn-link" href="/referenzen/{next_k}">Nächste: {CLIENTS[next_k]['name']} {ARROW}</a></div>"""
    else:
        nav = f'<div class="case-nav"><a class="btn-link" href="/referenzen">Alle Referenzen {ARROW}</a></div>'
    b = BRANCHEN[c["branche"]]
    if not c["reels"]:
        body = page_head("Referenz", c["h1"], c["intro"], crumbs=crumbs) + f"""
<section class="sec" data-scene="SZENE 02 · VIDEO FOLGT"><div class="wrap wrap--narrow"><div class="stack">
  {lbl("Szene 02 · Video folgt", True)}<h2 class="d2">Video folgt.</h2>
  <p class="lead">{ph("Videos, Format und Kundenstimme der Weinbar „Die Drei“, Instagram-Profil")}</p>
  {nav}
</div></div></section>{angebot()}"""
        page(f"/referenzen/{key}", "Weinbar „Die Drei“, Kiel | Referenz | SCM Creatives",
             "Referenz von SCM Creatives: Weinbar „Die Drei“ in Kiel. Die Videos zeigen wir hier, sobald sie online sind.", body,
             ld=[crumbs_ld(crumbs)], noindex=True, anfrage_qs="branche=gastronomie")
        return
    main_slug = c["reels"][0]
    main = REELS[main_slug]
    fmt_all = " und ".join(REELS[s]["format"] for s in c["reels"])
    ig = f'<a class="btn btn-ghost" href="{c["ig"]}" target="_blank" rel="noopener">{c["name"]} auf Instagram{NEWTAB}</a>' if c["ig"] else ""
    head_video = phone(main_slug, kind="full", sound=True, label=False, watch=True)
    links = f"""<div class="links-row"><a class="btn-link" href="/branchen/{c['branche']}">Mehr für {b['name']}: Formate und Fragen {ARROW}</a><a class="btn-link" href="/testvideos">So laufen eure {NB} {ARROW}</a></div>"""
    body = f"""<section class="page-head case-head" data-scene="SZENE 01 · {c['name'].upper()}"><div class="wrap">
  {crumb_nav(crumbs)}
  <div class="case-grid case-grid--head" style="margin-top:1.4rem">
    <div class="case-video">{head_video}
      <p class="q-note" style="margin-top:1rem"><a href="{main['ig']}" target="_blank" rel="noopener">{main['format']} auf Instagram ansehen{NEWTAB}</a>{'<br>Teile dieses Videos wurden mithilfe von KI erstellt, so ist es auch im Original gekennzeichnet.' if main.get('ki') else ''}</p></div>
    <div class="stack">{lbl(f"Szene 01 · Referenz · {b['name']}", True)}
      <h1 class="d1 split" data-split="chars">{c['h1']}</h1>
      <p class="h1-kicker">{fmt_all} als Reel</p>
      <p class="lead rv" data-d="1">{c['intro']}</p>
      <div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage">So ein Video anfragen</a>{ig}</div></div>
  </div></div></section>
<section class="sec" data-scene="SZENE 02 · {main['format'].upper()}"><div class="wrap wrap--narrow">
  {lbl(f"Szene 02 · {main['format']}")}
  <h2 class="d2 split" style="margin:.9rem 0 1.6rem">{main['titel']}</h2>
  {case_details(main_slug, c, b)}
  {links}
</div></section>"""
    for n, slug in enumerate(c["reels"][1:], start=3):
        r = REELS[slug]
        body += f"""
<section class="sec panel" data-scene="SZENE {n:02d} · {r['format'].upper()}"><div class="wrap">
  <div class="case-grid">
    <div class="case-video">{phone(slug, kind='full', sound=True, label=False)}
      <p class="q-note" style="margin-top:1rem"><a href="{r['ig']}" target="_blank" rel="noopener">{r['format']} auf Instagram ansehen{NEWTAB}</a>{'<br>Teile dieses Videos wurden mithilfe von KI erstellt, so ist es auch im Original gekennzeichnet.' if r.get('ki') else ''}</p></div>
    <div>{lbl(f"Szene {n:02d} · {r['format']}")}
      <h2 class="d2 split" style="margin:.9rem 0 1.6rem">{r['titel']}</h2>
      {case_details(slug, c, b, with_quote=False)}</div>
  </div></div></section>"""
    body += f"""
<section class="sec-sm"><div class="wrap">{nav}</div></section>
{angebot()}"""
    lds = [crumbs_ld(crumbs),
           {"@context": "https://schema.org", "@type": "VideoObject", "@id": f"{BASE}/referenzen/{key}#video",
            "name": f"{main['kunde']}: {main['format']}", "description": video_desc(main_slug),
            "thumbnailUrl": [f"{BASE}/media/{main_slug}.webp"], "uploadDate": upload_ts(main_slug),
            "duration": f"PT{main['dauer']}S", "contentUrl": f"{BASE}/media/{main_slug}.mp4",
            "inLanguage": "de", "publisher": ORG_MIN}]
    short = "Maler Rohwer" if key == "maler-rohwer" else c["name"]
    title = f"{short}: {fmt_all} als Reel | SCM Creatives"
    if len(title) > 62:
        title = f"{short}: {fmt_all} | SCM Creatives"
    desc = f"{fmt_all} für {c['name']}: So ist das Video aufgebaut, vom ersten Satz bis zum Aufruf. Gedreht in {c['ort'] or 'der Region'}."
    page(f"/referenzen/{key}", title, desc, body, ld=lds, og=f"/img/og-{key}.jpg",
         og_alt=f"{c['name']}: {main['format']} von SCM Creatives", anfrage_qs=f"branche={c['branche']}",
         lcp=f"/media/{main_slug}.webp")


def build_ablauf():
    need = [("Eine Ansprechperson", "Für Skripte und Termine."),
            ("Einen Drehort", "Euer Laden, Büro oder Baustelle."),
            ("Etwas Offenheit", "Euren Betrieb zeigen, wie er ist.")]
    nd = "".join(f'<article class="svc-item rv" data-d="{i+1}"><span class="lbl">Von euch</span><h3>{t}</h3><p>{x}</p></article>' for i, (t, x) in enumerate(need))
    body = page_head("Ablauf", "So arbeiten<br><em>wir.</em>",
                     "Erst das Skript, dann die Kamera. Wenig Aufwand für euch.",
                     crumbs=[("/", "Start"), ("/so-arbeiten-wir", "Ablauf")], media="ki-platzhalter-gastro-dreh", video="ki-platzhalter-gastro-dreh",
                     seo_h1="Ablauf: So entstehen eure Social-Media-Videos") + f"""
<section class="sec" data-scene="SZENE 02 · DREHPLAN"><div class="wrap">
  {sec_head(None, "Der Drehplan", "Sechs Schritte.<br><em>Ein klarer Plan.</em>", None, ("/referenzen", "So sieht das fertig aus"))}
  {drehplan()}
</div></section>
{skript_section("03")}
<section class="sec panel" data-scene="SZENE 04 · VON EUCH"><div class="wrap">
  {sec_head(None, "Von euch", "Mehr braucht<br><em>es nicht.</em>")}
  <div class="svc svc--3">{nd}</div>
</div></section>
<section class="sec" data-scene="SZENE 05 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head(None, "Fragen", "Fragen zum<br><em>Ablauf.</em>", None, ("/faq", "Alle Fragen"))}
  {faq_block([FAQ_CORE[3], FAQ_CORE[2], FAQ_OBJ["dauer"]])}
</div></section>
{angebot()}"""
    page("/so-arbeiten-wir", "Ablauf: Vom Skript zum fertigen Reel | SCM Creatives",
         "Erstgespräch, Skript, Dreh vor Ort, Schnitt, Veröffentlichung, Auswertung. So entstehen Social-Media-Videos bei SCM Creatives, mit wenig Aufwand für euch.",
         body, ld=[crumbs_ld([("/", "Start"), ("/so-arbeiten-wir", "Ablauf")])], lcp="/img/ki-platzhalter-gastro-dreh.webp")


def build_pakete():
    addons = [("Posting und Community", "Wir posten und antworten.", "posting"),
              ("Werbeanzeigen", "Eure Videos als Anzeigen auf Instagram, TikTok und Facebook.", "ads"),
              ("Recruiting-Videos", "Für Mitarbeitende und Azubis.", "recruiting"),
              ("Fotos und Imagefilm", "Fotos vom Drehtag oder ein längerer Film.", "fotos")]
    ad = "".join(f'<article class="svc-item rv"><span class="lbl">Dazu buchbar</span><h3>{t}</h3><p>{x}</p><a class="btn-link" href="/anfrage?extras={k}">Mit anfragen {ARROW}</a></article>' for t, x, k in addons)
    price = [("Anzahl Videos", "4, 8 oder 12 im Monat."),
             ("Drehtermine", ph("von SCM bestätigen")),
             ("Extras", "Posting, Community oder Werbeanzeigen.")]
    pr = "".join(f'<div class="dp-row"><span class="dp-no">{i+1:02d}</span><h3>{t}</h3><p>{x}</p><p class="dp-eff"><small>Faktor</small>Preis</p></div>' for i, (t, x) in enumerate(price))
    body = page_head("Pakete", "Drei Pakete.<br><em>Ein Prinzip.</em>",
                     "Alle mit Skript, Dreh und Schnitt. Ihr wählt nur die Anzahl.",
                     crumbs=[("/", "Start"), ("/pakete", "Pakete")],
                     seo_h1="Pakete: 4, 8 oder 12 Social-Media-Videos im Monat") + f"""
<section class="sec-sm" data-scene="SZENE 02 · PAKETE"><div class="wrap">
  <div class="rv" style="margin-bottom:1.6rem">{lbl("Die Pakete")}</div><h2 class="sr-only">Die drei Pakete</h2>
  {packs()}
</div></section>
<section class="sec panel" data-scene="SZENE 03 · PREIS"><div class="wrap">
  {sec_head(None, "Preis", "Was den Preis<br><em>bestimmt.</em>", PREIS_SATZ)}
  <div class="drehplan">{pr}</div>
  <p class="q-note rv" style="margin-top:1.4rem">Laufzeit und Konditionen klären wir im Kennenlerngespräch.</p>
</div></section>
<section class="sec" data-scene="SZENE 04 · EXTRAS"><div class="wrap">
  {sec_head(None, "Dazubuchen", "Mehr als<br><em>nur Videos.</em>", None, ("/leistungen", "Alle Leistungen"))}
  <div class="svc">{ad}</div>
</div></section>
<section class="sec panel" data-scene="SZENE 05 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head(None, "Fragen", "Fragen zu<br><em>den Paketen.</em>", None, ("/faq", "Alle Fragen"))}
  {faq_block([FAQ_CORE[0], FAQ_OBJ["bindung"], FAQ_OBJ["gefallen"], FAQ_MORE[0]])}
</div></section>
{angebot()}"""
    page("/pakete", "Pakete: 4, 8 oder 12 Reels im Monat | SCM Creatives",
         "Drei Pakete mit Skript, Dreh vor Ort und Schnitt: 4, 8 oder 12 Social-Media-Videos im Monat. Start mit 3 kostenlosen Testvideos. Kiel und Lübecker Bucht.",
         body, ld=[crumbs_ld([("/", "Start"), ("/pakete", "Pakete")])])


def build_testvideos():
    steps = [("01", "Anfrage", "Kurzes Formular oder WhatsApp.", "Zwei Minuten"),
             ("02", "Kennenlernen", "Euer Betrieb, eure Ziele.", "Ein Gespräch"),
             ("03", "Skripte und Dreh", "Drei Skripte, Dreh bei euch.", "Ein Termin bei euch"),
             ("04", "3 fertige Videos", "Geschnitten und fertig.", "Ansehen"),
             ("05", "Entscheidung", "Gefällt es euch, geht es weiter. Sonst kostet es nichts.", "Ja oder Nein")]
    blocks = [("Was ihr bekommt", "3 fertige Videos im Hochformat, mit Skript, bei euch gedreht. " + ph("Nutzung: Dürft ihr die 3 Testvideos posten, auch wenn danach kein Vertrag folgt?")),
              ("Warum kostenlos?", "Erst sehen, dann entscheiden. Wir zeigen lieber, als zu versprechen."),
              ("Für wen", "Betriebe in Kiel und an der Lübecker Bucht. " + ph("weitere Bedingungen, z. B. einmal pro Betrieb, regelmäßige Videos danach geplant"))]
    bl = "".join(f'<article class="svc-item rv" data-d="{i+1}"><span class="lbl">Gut zu wissen</span><h3>{t}</h3><p>{x}</p></article>' for i, (t, x) in enumerate(blocks))
    body = page_head("Das Angebot", f"{NB}.<br><em>Kostenlos.</em>",
                     "Drei fertige Videos aus eurem Betrieb. Erst sehen, dann entscheiden.",
                     crumbs=[("/", "Start"), ("/testvideos", "3 Testvideos")], media="ki-platzhalter-kiel-foerde", video="ki-platzhalter-kiel-foerde",
                     seo_h1="3 kostenlose Testvideos für Betriebe in Kiel und an der Lübecker Bucht", head_reel="maler-rohwer",
                     extra=f'<div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage">{NB} anfragen</a><a class="btn btn-ghost" href="/referenzen">Beispiele ansehen</a></div>') + f"""
<section class="sec" data-scene="SZENE 02 · SO GEHT ES"><div class="wrap">
  {sec_head(None, "So geht es", "Fünf Schritte<br><em>zu euren Testvideos.</em>", f"Dauer: {ph('typische Dauer')}")}
  {drehplan(steps)}
</div></section>
<section class="sec panel" data-scene="SZENE 03 · GUT ZU WISSEN"><div class="wrap">
  {sec_head(None, "Gut zu wissen", "Kein Haken.<br><em>Nur ein Plan.</em>")}
  <div class="svc svc--3">{bl}</div>
</div></section>
<section class="sec" data-scene="SZENE 04 · BEISPIELE">
  <div class="wrap">{sec_head(None, "Beispiele", "So könnten<br><em>eure Videos aussehen.</em>", None, ("/referenzen", "Alle Videos"))}</div>
  <div class="reels rv" role="region" tabindex="0" aria-label="Beispielvideos, seitlich scrollbar">{''.join(reel_card(s, rv=False) for s in ["maler-rohwer", "das-kleine-steakhouse", "jan-hein-klaas-pit", "kletterwald-travemuende"])}</div>
</section>
<section class="sec panel" data-scene="SZENE 05 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head(None, "Fragen", "Fragen zu<br><em>den Testvideos.</em>")}
  {faq_block([("Kostet das wirklich nichts?", f"Wirklich nichts. Die {NB} sind kostenlos. Erst wenn ihr weitermachen wollt, schließen wir einen Vertrag."), FAQ_OBJ["gefallen"], ("Dürfen wir die Testvideos nutzen?", ph("Regelung: Dürft ihr die 3 Testvideos posten, auch wenn danach kein Vertrag folgt?"))])}
</div></section>
{angebot(link=("/pakete", "Pakete danach"))}"""
    page("/testvideos", "3 kostenlose Testvideos | SCM Creatives Kiel",
         "Drei fertige Social-Media-Videos kostenlos: Wir schreiben die Skripte, drehen bei euch in Kiel oder an der Lübecker Bucht und ihr entscheidet danach.",
         body, ld=[crumbs_ld([("/", "Start"), ("/testvideos", "3 Testvideos")])], lcp="/img/ki-platzhalter-kiel-foerde.webp")


def build_vision():
    vals = [("01", "Echte Menschen, echte Orte.", "Euer Laden, eure Sprache, eure Geschichten."),
            ("02", "Ein Skript vor jedem Dreh.", "Erst der Plan, dann die Kamera."),
            ("03", "Unterhaltung, die verkauft.", "Videos, die man freiwillig anschaut."),
            ("04", "Nah dran.", "Kiel und die Lübecker Bucht. Wir kommen zu euch.")]
    v = "".join(f'<div class="dp-row"><span class="dp-no">{n}</span><h3>{t}</h3><p style="grid-column:span 2">{x}</p></div>' for n, t, x in vals)
    body = page_head("Vision", "Videos, die nach<br><em>euch klingen.</em>",
                     "Echte Menschen, ein klarer Plan, eine Prise Humor.",
                     crumbs=[("/", "Start"), ("/vision", "Vision")], media="ki-platzhalter-luebecker-bucht",
                     seo_h1="Vision: Wofür SCM Creatives steht") + f"""
<section class="sec" data-scene="SZENE 02 · HALTUNG"><div class="wrap">
  {lbl("Unsere Haltung")}
  <p class="say" data-say style="margin-top:1.6rem">Jeder Betrieb in der Region hat Geschichten. <em>Wir erzählen sie so, dass man dranbleibt.</em></p>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · WOFÜR WIR STEHEN"><div class="wrap">
  {sec_head(None, "Wofür wir stehen", "Vier Sätze<br><em>für jeden Dreh.</em>")}
  <div class="drehplan">{v}</div>
</div></section>
<section class="sec" data-scene="SZENE 04 · ZIEL"><div class="wrap"><div class="split2">
  <div class="stack">{lbl("Unser Ziel")}<h2 class="d2 split">Mehr Betriebe,<br><em>die man kennt.</em></h2>
    <p class="lead rv">Kleine und mittlere Betriebe, online so sichtbar wie die großen Ketten.</p>
    <a class="btn rv" href="/ueber-uns">Wer wir sind</a></div>
  <div class="media-box tall rv-img"><img src="/img/ki-platzhalter-skript-sm.webp" alt="" loading="lazy" width="760" height="424"><span class="ki-tag">KI-Platzhalter</span></div>
</div></div></section>
{angebot()}"""
    page("/vision", "Vision: Videos, die nach euch klingen | SCM Creatives",
         "Echte Menschen, ein Skript vor jedem Dreh, Unterhaltung statt Werbespot: die Haltung hinter SCM Creatives, Social-Media-Agentur in Kiel.",
         body, ld=[crumbs_ld([("/", "Start"), ("/vision", "Vision")])], lcp="/img/ki-platzhalter-luebecker-bucht.webp")


def build_ueber():
    team = "".join(f"""<article class="member rv" data-d="{i+1}"><div class="portrait">{ph(f"Foto {n}")}</div>
      <h3>{n}</h3><p class="lbl">{ph("Rolle, z. B. Skript, Kamera, Schnitt")}</p></article>""" for i, n in enumerate(TEAM))
    body = page_head("Über uns", "Wer hinter<br><em>der Kamera steht.</em>",
                     "Social-Media-Agentur für Kiel und die Lübecker Bucht. Wir schreiben, drehen und schneiden.",
                     crumbs=[("/", "Start"), ("/ueber-uns", "Über uns")], media="ki-platzhalter-kiel-foerde",
                     seo_h1="Über uns: SCM Creatives, Social-Media-Agentur aus Kiel") + f"""
<section class="sec" data-scene="SZENE 02 · TEAM"><div class="wrap">
  {sec_head(None, "Das Team", "Skript, Kamera,<br><em>Schnitt.</em>", "Hinter SCM Creatives stehen Oskar von Esebeck und Yannick Ruch. Wir machen Social-Media-Videos für Betriebe aus Kiel und von der Lübecker Bucht: erst das Skript, dann kommen wir mit der Kamera zu euch und schneiden so, dass man bis zum Ende dranbleibt.")}
  <div class="team">{team}</div>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · REGION"><div class="wrap">
  {sec_head(None, "Unsere Region", "Wir kommen<br><em>zu euch.</em>", "Kein Kundenbüro. Wir drehen dort, wo eure Geschichte passiert.")}
  <div class="region rv"><span class="main">Kiel</span><span>Lübecker Bucht</span><span>Lübeck</span><span>Travemünde</span><span>Timmendorfer Strand</span><span>Scharbeutz</span><span>Neustadt in Holstein</span></div>
</div></section>
{angebot()}"""
    page("/ueber-uns", "Über uns | SCM Creatives, Kiel und Lübecker Bucht",
         "SCM Creatives schreibt, dreht und schneidet Kurzvideos für Betriebe in Kiel und an der Lübecker Bucht. Kein Kundenbüro, wir kommen zu euch.",
         body, ld=[crumbs_ld([("/", "Start"), ("/ueber-uns", "Über uns")])], lcp="/img/ki-platzhalter-kiel-foerde.webp")


def build_faq():
    groups = [("Kosten und Testvideos", [FAQ_CORE[0], FAQ_CORE[1], FAQ_OBJ["bindung"], FAQ_OBJ["gefallen"], FAQ_MORE[5]]),
              ("Aufwand und Ablauf", [FAQ_CORE[3], FAQ_CORE[2], FAQ_MORE[2], FAQ_OBJ["dauer"], FAQ_OBJ["gefilmt"], FAQ_MORE[4]]),
              ("Allgemein", [FAQ_CORE[5], FAQ_CORE[4], FAQ_MORE[3], FAQ_OBJ["garantie"]]),
              ("Zusatzleistungen", [FAQ_MORE[0], FAQ_MORE[1], FAQ_OBJ["selbst"]])]
    sec = "".join(f"""<section class="sec-sm{' panel' if i % 2 else ''}" data-scene="SZENE {i+2:02d} · {g.upper()}"><div class="wrap wrap--narrow">
      {lbl(f"Szene {i+2:02d} · {g}")}<h2 class="d2" style="margin:1rem 0 2rem">{g}</h2>{faq_block(items, open_first=False)}</div></section>""" for i, (g, items) in enumerate(groups))
    body = page_head("FAQ", "Fragen und<br><em>Antworten.</em>",
                     'Alles, was ihr vor dem ersten Gespräch wissen wollt. Eure Frage ist nicht dabei? <a class="btn-link" href="/kontakt">Schreibt uns einfach</a>',
                     crumbs=[("/", "Start"), ("/faq", "FAQ")], seo_h1="FAQ: Fragen zu Social-Media-Videos, Testvideos und Paketen") + sec + angebot()
    page("/faq", "FAQ: Fragen zu Social-Media-Videos | SCM Creatives",
         "Was kosten Social-Media-Videos? Müssen wir vor die Kamera? Wie lange binden wir uns? Antworten zu Ablauf, Paketen, Testvideos und Region.",
         body, ld=[crumbs_ld([("/", "Start"), ("/faq", "FAQ")])])


def build_kontakt():
    tel_txt = TEL or ph("Telefonnummer")
    wa_txt = f"Nachricht an {TEL}" if WHATSAPP and TEL else ("Nachricht schreiben" if WHATSAPP else ph("WhatsApp-Nummer"))
    mail_txt = MAIL or ph("E-Mail-Adresse")
    body = page_head("Kontakt", "Lasst uns<br><em>drehen.</em>",
                     f"Der schnellste Weg zu euren {NB} ist die kurze Anfrage. Lieber direkt? Dann schreibt uns oder ruft an.",
                     crumbs=[("/", "Start"), ("/kontakt", "Kontakt")], seo_h1="Kontakt zu SCM Creatives in Kiel",
                     extra=f'<div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage">Anfrage starten (2 Minuten)</a></div>') + f"""
<section class="sec-sm" data-scene="SZENE 02 · KONTAKTWEGE"><div class="wrap">
  <div class="q-msg" id="fehler" role="alert"><p><strong>Eure Anfrage konnte nicht gesendet werden.</strong> Bitte meldet euch direkt per WhatsApp, Telefon oder E-Mail.</p></div>
  <div class="rv" style="margin-bottom:1.6rem">{lbl("Szene 02 · Kontaktwege")}</div><h2 class="sr-only">Kontaktwege</h2>
  <div class="ways" style="margin-top:1rem">
    <a class="way rv" id="whatsapp" href="{wa_href()}"{ext(wa_href())}>{I_WA}<b>WhatsApp</b><p>{wa_txt}</p>{ext_txt(wa_href())}</a>
    <a class="way rv" data-d="1" id="telefon" href="{tel_href()}">{I_TEL}<b>Anrufen</b><p>{tel_txt}</p></a>
    <a class="way rv" data-d="2" id="mail" href="{mail_href()}">{I_MAIL}<b>E-Mail</b><p>{mail_txt}</p></a>
    <a class="way rv" data-d="3" href="{IG}" target="_blank" rel="noopener">{I_IG}<b>Instagram</b><p>@scm.creatives</p>{NEWTAB}</a>
  </div>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · EINSATZGEBIET"><div class="wrap">
  {sec_head("03", "Einsatzgebiet", "Kiel und<br><em>Lübecker Bucht.</em>", "Wir haben kein Kundenbüro, sondern kommen zu euch: in den Laden, ins Restaurant, ins Büro oder auf die Baustelle.")}
  <div class="region rv"><span class="main">Kiel</span><span>Lübecker Bucht</span><span>Lübeck</span><span>Travemünde</span><span>Timmendorfer Strand</span><span>Scharbeutz</span><span>Neustadt in Holstein</span></div>
</div></section>"""
    page("/kontakt", "Kontakt und Anfrage | SCM Creatives Kiel",
         "Kontakt zu SCM Creatives: Anfrage in 2 Minuten, WhatsApp, Telefon oder E-Mail. Wir drehen in Kiel und an der Lübecker Bucht, direkt bei euch vor Ort.",
         body, ld=[crumbs_ld([("/", "Start"), ("/kontakt", "Kontakt")])])


def opt(name, value, label, small="", kind="radio"):
    s = f"<small>{small}</small>" if small else ""
    return f'<label class="opt"><input type="{kind}" name="{name}" value="{value}"><span>{label}{s}</span></label>'


def q_err(name):
    return f'<p class="q-err" id="err-{name}" role="alert" hidden>Bitte wählt eine Antwort aus, dann geht es weiter.</p>'


def build_anfrage():
    b_opts = "".join(opt("branche", k, BRANCHEN[k]["name"]) for k in BRANCHEN) + opt("branche", "andere", "Andere Branche", "Erzählt es uns im letzten Schritt")
    z_opts = (opt("ziel", "gaeste", "Mehr Gäste oder Kunden") + opt("ziel", "anfragen", "Mehr Anfragen") +
              opt("ziel", "mitarbeiter", "Mitarbeitende finden") + opt("ziel", "bekanntheit", "Bekannter werden in der Region") +
              opt("ziel", "mehreres", "Mehreres davon", "Beraten wir gemeinsam"))
    p_opts = (opt("paket", "4", "4 Videos im Monat", "Etwa einmal pro Woche") + opt("paket", "8", "8 Videos im Monat", "Etwa zweimal pro Woche") +
              opt("paket", "12", "12 Videos im Monat", "Etwa dreimal pro Woche") + opt("paket", "offen", "Wissen wir noch nicht", "Wir beraten euch"))
    x_opts = (opt("extras", "posting", "Posting und Community", kind="checkbox") + opt("extras", "ads", "Werbeanzeigen", kind="checkbox") +
              opt("extras", "recruiting", "Recruiting-Videos", kind="checkbox") + opt("extras", "fotos", "Fotos oder Imagefilm", kind="checkbox"))
    s_opts = (opt("start", "sofort", "So bald wie möglich") + opt("start", "1-3", "In 1 bis 3 Monaten") + opt("start", "spaeter", "Später, erst mal informieren"))
    r_opts = (opt("region", "kiel", "Kiel und Umgebung") + opt("region", "luebeck", "Lübeck und Lübecker Bucht") + opt("region", "woanders", "Woanders"))
    k_opts = opt("kontaktweg", "anruf", "Anruf") + opt("kontaktweg", "whatsapp", "WhatsApp") + opt("kontaktweg", "email", "E-Mail") + opt("kontaktweg", "", "Egal")
    wa_base = f"https://wa.me/{WHATSAPP}" if WHATSAPP else ""
    msg_wa = f'<a class="btn" data-wa="{wa_base}" href="{wa_href()}"{ext(wa_href())}>Per WhatsApp senden{ext_txt(wa_href())}</a>'
    msg_ml = f'<a class="btn btn-ghost" data-mail="{MAIL or ""}" href="{mail_href()}">Per E-Mail senden</a>'
    body = f"""<section class="page-head" data-scene="SZENE 01 · ANFRAGE" style="padding-bottom:1.4rem"><div class="wrap">
  {lbl("Szene 01 · Eure Anfrage", True)}
  <h1 class="d2 split">{NB}<br><em>anfragen.</em></h1>
  <p class="lead rv" data-d="1">Fünf kurze Fragen, etwa zwei Minuten. Danach melden wir uns mit einem Vorschlag für eure Testvideos.</p>
</div></section>
<section class="sec-sm" data-scene="SZENE 02 · FRAGEN" style="padding-top:1rem"><div class="wrap">
<p class="assure"><span>Kostenlos und unverbindlich</span><span>Ein Vertrag erst, wenn ihr nach den Testvideos weitermachen wollt</span><span>Antwort {ANTWORTZEIT}</span></p>
<form class="quiz" action="/api/anfrage" method="post">
  <div class="q-progress" aria-hidden="true"><span class="q-count">Schritt 1 von 5</span><span class="q-bar"><i></i></span></div>
  <fieldset class="q-step" data-req="branche" data-auto><legend><small>Frage 1 von 5</small>In welcher Branche seid ihr?</legend>{q_err("branche")}<div class="opts">{b_opts}</div></fieldset>
  <fieldset class="q-step" data-req="ziel" data-auto><legend><small>Frage 2 von 5</small>Was sollen die Videos bringen?</legend>{q_err("ziel")}<div class="opts">{z_opts}</div></fieldset>
  <fieldset class="q-step" data-req="paket"><legend><small>Frage 3 von 5</small>Wie viele Videos stellt ihr euch vor?</legend>{q_err("paket")}<div class="opts">{p_opts}</div>
    <fieldset class="q-sub"><legend class="lbl">Zusätzlich interessant (optional)</legend><div class="opts">{x_opts}</div></fieldset></fieldset>
  <fieldset class="q-step" data-req="start"><legend><small>Frage 4 von 5</small>Wann soll es losgehen?</legend>{q_err("start")}<div class="opts">{s_opts}</div>
    <fieldset class="q-sub"><legend class="lbl">Wo ist euer Betrieb? (optional)</legend><div class="opts opts--chips">{r_opts}</div></fieldset>
    <div class="fields"><div class="field full"><label for="ort">Ort eures Betriebs (optional)</label><input id="ort" name="ort" type="text" autocomplete="address-level2" placeholder="z. B. Kiel, Lübeck, Scharbeutz"></div></div></fieldset>
  <fieldset class="q-step"><legend><small>Frage 5 von 5</small>Wie erreichen wir euch?</legend>
    <fieldset class="q-sub"><legend class="lbl">Wie sollen wir uns melden? (optional)</legend><div class="opts opts--chips opts--chips4">{k_opts}</div></fieldset>
    <p class="q-note" id="hint-kontakt">Felder mit * brauchen wir. Dazu Telefon oder E-Mail, eins von beiden reicht.</p>
    <div class="fields">
      <div class="field" data-check="req"><label for="name">Name *</label><input id="name" name="name" type="text" autocomplete="name" required><span class="err" id="err-name">Bitte gebt euren Namen an.</span></div>
      <div class="field"><label for="betrieb">Betrieb oder Instagram-Profil</label><input id="betrieb" name="betrieb" type="text" autocomplete="organization" aria-describedby="hint-betrieb"><span class="hint" id="hint-betrieb">Dann können wir uns vorab ansehen, wie ihr heute auftretet.</span></div>
      <div class="field" data-check="contact"><label for="telefon">Telefon oder WhatsApp</label><input id="telefon" name="telefon" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="hint-kontakt hint-tel"><span class="hint" id="hint-tel">Für eine kurze Rückfrage. Wir rufen nur wegen eurer Anfrage an.</span><span class="err" id="err-telefon">Bitte gebt eine Telefonnummer oder eine E-Mail-Adresse an, damit wir euch erreichen.</span></div>
      <div class="field"><label for="email">E-Mail</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" aria-describedby="hint-kontakt"><span class="err" id="err-email"></span></div>
      <div class="field full field-andere" hidden><label for="andere">Welche Branche?</label><input id="andere" name="andere" type="text" placeholder="z. B. Friseur, Hotel, Autohaus"></div>
      <div class="field full"><label for="nachricht">Was sollen wir noch wissen? (optional)</label><textarea id="nachricht" name="nachricht" rows="4"></textarea></div>
    </div>
    <div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <input type="hidden" name="t" value="0">
    <p class="q-note">Mit dem Absenden werden eure Angaben per E-Mail an SCM Creatives übermittelt, damit wir eure Anfrage beantworten können. Mehr dazu in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>
  </fieldset>
  <div class="q-nav">
    <button class="btn btn-ghost" type="button" data-q="back">Zurück</button>
    <button class="btn" type="button" data-q="next">Weiter</button>
    <button class="btn" type="submit" data-q="send"><span>{NB} anfragen</span></button>
  </div>
  <div class="q-msg" role="alert"><p><strong>Das hat leider nicht geklappt.</strong> Eure Angaben sind noch da. Versucht es bitte noch einmal oder schickt sie uns mit einem Tipp per WhatsApp oder E-Mail.</p>
    <div class="btn-row">{msg_wa}{msg_ml}</div></div>
  <p class="alt-line">Lieber direkt sprechen? <a href="{tel_href()}">Ruft an unter {TEL or ph("Telefonnummer")}</a> oder <a href="{wa_href()}"{ext(wa_href())}>schreibt uns per WhatsApp{ext_txt(wa_href())}</a>.</p>
</form>
</div></section>"""
    page("/anfrage", "Anfrage: 3 kostenlose Testvideos | SCM Creatives",
         "In fünf kurzen Fragen zu euren 3 kostenlosen Testvideos. Für Betriebe in Kiel und an der Lübecker Bucht. Dauert etwa zwei Minuten.",
         body, body_cls="page-anfrage")


def build_danke():
    blocks = {"gastronomie": ["das-kleine-steakhouse", "jan-hein-klaas-pit"], "immobilien": ["bs-entweder-oder"],
              "handwerk": ["maler-rohwer"], "unternehmen": ["kletterwald-travemuende"]}
    bb = "".join(f"""<div class="danke-b" data-b="{k}" hidden>{sec_head(None, "Solange ihr wartet", f"So sieht das<br><em>{BRANCHEN[k]['im']} aus.</em>")}
      <div class="reel-grid">{''.join(reel_card(s) for s in v)}</div></div>""" for k, v in blocks.items())
    body = f"""<section class="page-head" data-scene="SZENE 01 · DANKE"><div class="wrap">
  {lbl("Szene 01 · Gesendet", True)}
  <h1 class="d1 split" data-split="chars">Danke.<br><em>Klappe, die erste.</em></h1>
  <p class="lead rv" data-d="1">Eure Anfrage ist angekommen. Wir melden uns {ANTWORTZEIT} und machen ein kurzes Kennenlernen mit euch aus.</p>
  <div class="callout rv" data-d="2"><p>Damit ihr uns erkennt: Wir melden uns von {TEL or ph("Telefonnummer")}. Speichert die Nummer am besten gleich unter SCM Creatives.</p></div>
</div></section>
<section class="sec-sm"><div class="wrap">
  {sec_head(None, "Wie es weitergeht", "Die nächsten<br><em>Szenen.</em>")}
  {drehplan([("01", "Wir melden uns", "So, wie ihr es angegeben habt: per Anruf, WhatsApp oder E-Mail.", "Antworten"), ("02", "Kennenlernen", "Ein Gespräch über euren Betrieb und eure Ziele.", "Ein Gespräch"), ("03", NB, "Skripte, Dreh bei euch, Schnitt. Kostenlos.", "Ein Termin")])}
</div></section>
<section class="sec-sm panel"><div class="wrap">
  {sec_head(None, "Zum Vorbereiten", "Was ihr schon mal<br><em>überlegen könnt.</em>")}
  <ul class="pains"><li>Was sollen die Videos für euch erreichen?</li><li>Wer aus eurem Team könnte mitspielen? Muss aber niemand.</li><li>Wann passt ein Drehtermin bei euch, zum Beispiel vor der Öffnung?</li></ul>
  <p class="alt-line">Noch etwas vergessen? <a href="{wa_href()}"{ext(wa_href())}>Schreibt uns per WhatsApp{ext_txt(wa_href())}</a>.</p>
</div></section>
<section class="sec-sm"><div class="wrap">{bb}</div></section>"""
    page("/danke", "Danke für eure Anfrage | SCM Creatives", "Eure Anfrage ist angekommen. Wir melden uns mit einem Vorschlag für eure 3 Testvideos.",
         body, noindex=True, body_cls="page-done")


def build_404():
    body = f"""<section class="page-head" style="min-height:80svh;display:grid;align-items:center" data-scene="SZENE 404"><div class="wrap">
  {lbl("Szene 404 · Rausgeschnitten", True)}
  <h1 class="d1">Diese Szene<br><em>wurde geschnitten.</em></h1>
  <p class="lead">Die Seite gibt es nicht oder nicht mehr. Kein Problem, der Film geht weiter.</p>
  <div class="btn-row"><a class="btn" href="/">Zur Startseite</a><a class="btn btn-ghost" href="/referenzen">Referenzen ansehen</a></div>
</div></section>"""
    page("/404", "Seite nicht gefunden | SCM Creatives", "Diese Seite gibt es nicht.", body, noindex=True)


def build_legal():
    A = ANBIETER
    imp = f"""<section class="sec-sm"><div class="wrap"><div class="prose">
<h2>Angaben gemäß § 5 DDG</h2>
<p>{A["firma"]}<br>{A["inhaber"]}<br>{A["strasse"]}<br>{A["ort"]}<br>{A["land"]}</p>
<h2>Kontakt</h2>
<p>Telefon: <a href="{tel_href()}">{tel_intl()}</a><br>E-Mail: <a href="{mail_href()}">{MAIL}</a></p>
<h2>Umsatzsteuer-ID</h2>
<p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: {A["ust"]}</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>{A["inhaber"]}<br>{A["strasse"]}<br>{A["ort"]}</p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung für Links</h2>
<p>Unsere Website enthält Links zu externen Websites Dritter, zum Beispiel zu Instagram. Auf deren Inhalte haben wir keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.</p>
<h2>Bildnachweise</h2>
<p>Videos und Standbilder der Referenzen: SCM Creatives für die jeweiligen Kunden, mit deren Freigabe. Zwei Videos der BS Immobiliengruppe enthalten Elemente, die mithilfe von KI erstellt wurden; sie sind auf der Referenzseite gekennzeichnet. Einzelne Hintergrundbilder und Hintergrundvideos sind als „KI-Platzhalter“ gekennzeichnet und werden vor dem Livegang durch eigene Aufnahmen ersetzt.</p>
</div></div></section>"""
    page("/impressum", "Impressum | SCM Creatives", "Impressum von SCM Creatives, Social-Media-Agentur für Kiel und die Lübecker Bucht.",
         page_head("Rechtliches", "Impressum", "Wer hinter dieser Website steht.", crumbs=[("/", "Start"), ("/impressum", "Impressum")], label="Rechtliches") + imp,
         ld=[crumbs_ld([("/", "Start"), ("/impressum", "Impressum")])])

    ds = f"""<section class="sec-sm"><div class="wrap"><div class="prose">
<p>Hier erklären wir, welche Daten beim Besuch dieser Website verarbeitet werden und welche nicht.</p>
<h2>1. Verantwortlicher</h2>
<p>{A["firma"]}, {A["inhaber"]}, {A["strasse"]}, {A["ort"]}, {A["land"]}<br>E-Mail: {MAIL}, Telefon: {tel_intl()}</p>
<h2>2. Hosting</h2>
<p>Diese Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Beim Aufruf verarbeitet Vercel technisch notwendige Daten wie IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser und Betriebssystem in Server-Logfiles, um die Website auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in einer sicheren und stabilen Bereitstellung. Die Logfiles werden {ph("Speicherdauer der Server-Logs bei Vercel")} gespeichert. Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung {ph('mit dem eigenen Vercel-Konto abschließen')}. Vercel ist unter dem EU-US Data Privacy Framework zertifiziert; zusätzlich gelten Standardvertragsklauseln.</p>
<h2>3. Keine Cookies, kein Tracking</h2>
<p>Diese Website setzt keine Cookies und verwendet keine Tracking- oder Werbedienste. Im Browser wird lediglich für die Dauer der Sitzung gespeichert, ob die Eröffnungsanimation bereits gezeigt wurde und ob ihr Videos und Animationen angehalten habt (Session Storage). Diese Informationen verlassen euer Gerät nicht und werden beim Schließen des Browsers gelöscht. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG, da die Speicherung für die von euch gewünschte Darstellung der Seite erforderlich ist. {ph("Rechtlich prüfen lassen; falls Vercel Web Analytics aktiviert wird: Absatz zu cookieloser Reichweitenmessung ergänzen")}</p>
<h2>4. Schriften und Videos</h2>
<p>Schriftarten und Videos werden direkt von unserem Server geladen. Es werden keine Verbindungen zu Google Fonts, YouTube oder Instagram aufgebaut, solange ihr nicht selbst auf einen Link zu diesen Diensten klickt.</p>
<h2>5. Anfrageformular</h2>
<p>Wenn ihr uns über das Anfrageformular kontaktiert, verarbeiten wir die Angaben, die ihr macht (zum Beispiel Name, Betrieb oder Instagram-Profil, Telefon, E-Mail, Branche, Wünsche, Region, Ort, gewünschter Kontaktweg und Nachricht), um eure Anfrage zu beantworten und ein Angebot vorzubereiten. Zusätzlich übermitteln wir, von welcher Seite dieser Website ihr zur Anfrage gekommen seid und, falls der Link eine Kampagnenkennung enthielt (utm_source, zum Beispiel „instagram“), diese Kennung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen). Das Formular wird über eine Funktion unseres Hosters Vercel in einem Rechenzentrum in Frankfurt am Main verarbeitet und per E-Mail an unser Postfach bei GMX (1&amp;1 Mail &amp; Media GmbH) übermittelt. Zum Schutz vor Spam prüfen wir ein verstecktes Feld, die Ausfülldauer und die Herkunft der Anfrage und halten die IP-Adresse höchstens zehn Minuten im Arbeitsspeicher, um massenhafte Anfragen zu begrenzen; Rechtsgrundlage dafür ist Art. 6 Abs. 1 lit. f DSGVO. Wir speichern die Anfrage, solange es für die Bearbeitung nötig ist, und löschen sie, wenn kein Vertrag zustande kommt, spätestens nach 12 Monaten, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
<h2>6. Kontakt per E-Mail, Telefon oder WhatsApp</h2>
<p>Wenn ihr uns per E-Mail, Telefon oder WhatsApp kontaktiert, verarbeiten wir eure Angaben zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b DSGVO). Beim Klick auf einen WhatsApp-Link öffnet sich die App oder Website von WhatsApp. Anbieter ist die WhatsApp Ireland Limited, Dublin, Irland {ph("vollständige Anschrift bei der rechtlichen Prüfung ergänzen")}. Ab dann gelten die Datenschutzhinweise von WhatsApp. Dabei können Daten auch an Meta in den USA übermittelt werden.</p>
<h2>7. Links zu Instagram</h2>
<p>Auf unserer Website verlinken wir auf Instagram (Meta Platforms Ireland Ltd.). Es handelt sich um einfache Links; Daten werden erst übertragen, wenn ihr einen Link anklickt.</p>
<h2>8. Eure Rechte</h2>
<p>Ihr habt das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). Wendet euch dazu einfach an uns.</p>
<p>Ihr habt außerdem das Recht, euch bei einer Datenschutz-Aufsichtsbehörde zu beschweren, zum Beispiel beim Unabhängigen Landeszentrum für Datenschutz Schleswig-Holstein (ULD), Holstenstraße 98, 24103 Kiel.</p>
<h2>9. Widerspruchsrecht</h2>
<p><strong>Verarbeiten wir eure Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO, könnt ihr aus Gründen, die sich aus eurer besonderen Situation ergeben, jederzeit widersprechen (Art. 21 DSGVO). Ein formloser Hinweis an uns genügt.</strong></p>
<h2>10. Aktualität</h2>
<p>Stand: Oktober 2026. {ph("Vor Livegang rechtlich prüfen lassen")}</p>
</div></div></section>"""
    page("/datenschutz", "Datenschutz | SCM Creatives", "Datenschutzerklärung von SCM Creatives: keine Cookies, kein Tracking, Anfrageformular per E-Mail.",
         page_head("Rechtliches", "Datenschutz", "Welche Daten beim Besuch dieser Website verarbeitet werden, und welche nicht.", crumbs=[("/", "Start"), ("/datenschutz", "Datenschutz")], label="Rechtliches") + ds,
         ld=[crumbs_ld([("/", "Start"), ("/datenschutz", "Datenschutz")])])


# ------------------------------------------------------------------
# Ausgabe: Dateien, Sitemap, robots
# ------------------------------------------------------------------
def out_path(path):
    if path == "/":
        return os.path.join(SITE, "index.html")
    return os.path.join(SITE, path.strip("/") + ".html")


def lastmods():
    old = json.load(open(LM_FILE)) if os.path.exists(LM_FILE) else {}
    new = {}
    for path, p in PAGES.items():
        main = p["html"].split('<main id="inhalt">', 1)[1].split("</main>", 1)[0]
        main = re.sub(r"\?v=[0-9a-f]+", "", main)
        h = hashlib.sha1(main.encode()).hexdigest()[:12]
        new[path] = {"h": h, "d": old[path]["d"] if old.get(path, {}).get("h") == h else TODAY}
    json.dump(new, open(LM_FILE, "w"), indent=1, ensure_ascii=False)
    return {k: v["d"] for k, v in new.items()}


def write_sitemap():
    lm = lastmods()
    items = []
    for path, p in PAGES.items():
        if p["noindex"] or path in ("/404",):
            continue
        vids = ""
        if path.startswith("/referenzen/"):
            key = path.split("/")[-1]
            for slug in CLIENTS[key]["reels"][:1]:
                r = REELS[slug]
                vids += f"""
    <video:video><video:thumbnail_loc>{BASE}/media/{slug}.webp</video:thumbnail_loc><video:title>{html.escape(r['kunde'] + ': ' + r['format'])}</video:title><video:description>{html.escape(video_desc(slug))}</video:description><video:content_loc>{BASE}/media/{slug}.mp4</video:content_loc><video:duration>{r['dauer']}</video:duration><video:publication_date>{upload_ts(slug)}</video:publication_date></video:video>"""
        items.append(f"  <url><loc>{url(path)}</loc><lastmod>{lm[path]}</lastmod>{vids}\n  </url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n' + "\n".join(items) + "\n</urlset>\n")
    open(os.path.join(SITE, "sitemap.xml"), "w", encoding="utf-8").write(xml)
    open(os.path.join(SITE, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {BASE}/sitemap.xml\n")


def copy_kit():
    global VER
    os.makedirs(f"{SITE}/css", exist_ok=True)
    os.makedirs(f"{SITE}/js", exist_ok=True)
    shutil.copy(f"{KIT}/css/drehbuch.css", f"{SITE}/css/drehbuch.css")
    shutil.copy(f"{KIT}/js/drehbuch.js", f"{SITE}/js/drehbuch.js")
    h = hashlib.sha1()
    for f in (f"{SITE}/css/drehbuch.css", f"{SITE}/js/drehbuch.js"):
        h.update(open(f, "rb").read())
    VER = h.hexdigest()[:8]


def main():
    copy_kit()
    build_home(); build_leistungen(); build_branchen()
    for k in BRANCHEN:
        build_branche(k)
    build_referenzen()
    for k in CLIENTS:
        build_case(k)
    build_ablauf(); build_pakete(); build_testvideos(); build_vision(); build_ueber(); build_faq()
    build_kontakt(); build_anfrage(); build_danke(); build_404(); build_legal()
    for path, p in PAGES.items():
        fp = out_path(path)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, "w", encoding="utf-8") as f:
            f.write(p["html"])
    write_sitemap()
    print(f"{len(PAGES)} Seiten geschrieben, Version {VER}")


if __name__ == "__main__":
    main()
