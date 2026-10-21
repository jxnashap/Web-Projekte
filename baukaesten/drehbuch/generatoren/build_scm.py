#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generator: SCM Creatives (scm-creatives.de) mit dem Drehbuch-Baukasten.

Fakten nur aus .preview-cache/scm/ (Instagram-Embeds, Reels, Transkripte) und
dem Briefing (.preview-cache/scm/recherche/briefing.md). Alles Unbelegte ist
als [PLATZHALTER] sichtbar markiert. Schreibregel: keine Gedankenstriche.
Aufruf: python3 build_scm.py  → schreibt webseiten/scm-creatives/
"""
import hashlib
import html
import json
import os
import shutil

ROOT = "/home/user/Web-Projekte"
SITE = f"{ROOT}/webseiten/scm-creatives"
KIT = f"{ROOT}/baukaesten/drehbuch"
BASE = "https://scm-creatives.de"
TODAY = "2026-10-21"

# ------------------------------------------------------------------
# Kontaktdaten: None = noch nicht geliefert → Platzhalter + Fallback-Link
# ------------------------------------------------------------------
TEL = None          # z. B. "+49 431 123456"
WHATSAPP = None     # z. B. "4917612345678" (nur Ziffern, mit Ländervorwahl)
MAIL = None         # z. B. "hallo@scm-creatives.de"
IG = "https://www.instagram.com/scm.creatives/"


def ph(text):
    return f'<span class="ph">[PLATZHALTER: {text}]</span>'


def tel_href():
    return f"tel:{TEL.replace(' ', '')}" if TEL else "/kontakt#telefon"


def wa_href(msg="Hallo SCM Creatives, wir interessieren uns für die 3 kostenlosen Testvideos."):
    if WHATSAPP:
        from urllib.parse import quote
        return f"https://wa.me/{WHATSAPP}?text={quote(msg)}"
    return "/kontakt#whatsapp"


def mail_href():
    return f"mailto:{MAIL}" if MAIL else "/kontakt#mail"


def ext(href):
    return ' target="_blank" rel="noopener"' if href.startswith("http") else ""


# ------------------------------------------------------------------
# Icons
# ------------------------------------------------------------------
ARROW = '<svg viewBox="0 0 22 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M0 6h20M15 1l5 5-5 5"/></svg>'
ARROW_UR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>'
I_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.6a8.2 8.2 0 0 1-12.1 7.2L4 20l1.3-3.8A8.2 8.2 0 1 1 20 11.6z"/><path d="M9 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1 1.4 1.8 2.5 2.3.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .9-.6 1.6-1.5 1.8-.7.1-1.6.1-3.4-.8-2.1-1.1-3.4-3.1-3.6-3.5-.2-.4-.9-1.3-.9-2.4 0-.6.2-1 .4-1.3z"/></svg>'
I_TEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h3.5l1.7 4.3-2.2 1.5a11 11 0 0 0 7.2 7.2l1.5-2.2L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>'
I_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
I_IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>'
I_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'

# ------------------------------------------------------------------
# Daten: Reels (alle belegt aus .preview-cache/scm/video-*.info.json und
# den Whisper-Transkripten; Zahlen = Instagram, Stand 21.10.2026)
# ------------------------------------------------------------------
REELS = {
    "maler-rohwer": dict(
        kunde="Jens Rohwer Malermeister", kurz="Maler Rohwer", client="maler-rohwer",
        branche="handwerk", format="Kunden-Sketch", dauer=30, upload="2026-10-20",
        ig="https://www.instagram.com/reel/DeuGwFgs_PK/",
        titel="„Also mein Nachbar hätte das anders gemacht“",
        hook="POV: Jeder Handwerker kennt diese Art von Kunden",
        beats=[("00:00", "Hook", "Text im Bild: „POV: jeder Handwerker kennt diese Art von Kunden“. Wer im Handwerk arbeitet, fühlt sich sofort angesprochen."),
               ("00:00", "Wiedererkennen", "Der Kunde steht daneben: „Mein Nachbar hat das früher aber immer anders gemacht.“"),
               ("00:09", "Steigerung", "Er hat noch Material im Schuppen gefunden. Ob man das nicht gegenrechnen könnte?"),
               ("00:20", "Pointe", "Am Ende will er es sich lieber selbst beibringen, damit es nächstes Mal günstiger wird."),
               ("Caption", "Aufruf", "„Was war der nervigste Spruch, den ihr euch auf der Baustelle anhören musstet?“ Die Kommentare erzählen die Geschichte weiter.")],
        stats=(209, 24)),
    "jan-hein-klaas-pit": dict(
        kunde="Jan & Hein & Klaas & Pit", kurz="Jan & Hein & Klaas & Pit", client="jan-hein-klaas-pit",
        branche="gastronomie", format="POV-Sketch", dauer=26, upload="2026-10-20",
        ig="https://www.instagram.com/reel/DetkcAvpH3H/",
        titel="„Manche Gespräche muss man für einen guten Mittagstisch opfern“",
        hook="POV: Du bist mit den Augen mal wieder ganz woanders",
        beats=[("00:00", "Hook", "Text im Bild: „POV: Du bist mit den Augen mal wieder ganz woanders“, dazu der volle Teller."),
               ("00:00", "Wiedererkennen", "Einer erzählt am Tisch von seinem letzten Date. Alle kennen diesen Freund."),
               ("00:11", "Steigerung", "Die anderen müssen plötzlich „kurz aufs Klo“."),
               ("00:17", "Pointe", "Ein Fremder fragt nach dem freien Platz und bekommt ihn sofort. Prioritäten sind Prioritäten."),
               ("Caption", "Aufruf", "„Wen würdest du für unseren Mittagstisch in Kiel sitzen lassen?“")],
        stats=(63, 20)),
    "das-kleine-steakhouse": dict(
        kunde="Das kleine Steakhouse", kurz="Das kleine Steakhouse", client="das-kleine-steakhouse",
        branche="gastronomie", format="POV-Sketch", dauer=18, upload="2026-10-20",
        ig="https://www.instagram.com/reel/Det_06XPmbX/",
        titel="„Freundschaft endet da, wo du an meine Pommes gehst“",
        hook="Ich glaub, da hat er was falsch verstanden …",
        beats=[("00:00", "Hook", "Text im Bild: „Ich glaub da hat er was falsch verstanden …“ Man will sofort wissen, was passiert ist."),
               ("00:06", "Wiedererkennen", "Die Idee am Tisch: mehrere Teller bestellen, jeder nimmt von jedem."),
               ("00:12", "Pointe", "Einer hat den Plan sehr wörtlich genommen. Komplett leer."),
               ("00:15", "Nachklapp", "„Ich hab gesagt nächstes Mal, ne?“"),
               ("Caption", "Aufruf", "„Markier den Kollegen, der immer nur mal probieren will.“ Jede Markierung bringt das Video zu neuen Leuten.")],
        stats=None),
    "kletterwald-travemuende": dict(
        kunde="Kletterwald Travemünde", kurz="Kletterwald Travemünde", client="kletterwald-travemuende",
        branche="unternehmen", format="Angebot mit Frist", dauer=13, upload="2026-10-19",
        ig="https://www.instagram.com/reel/DerbG9WBf2C/",
        titel="„Euer Klassenausflug im Kletterwald Travemünde“",
        hook="Liebe Lehrerinnen, liebe Lehrer …",
        beats=[("00:00", "Hook", "Direkte Ansprache der Zielgruppe: „Liebe Lehrerinnen, liebe Lehrer“, dazu der Titel im Bild."),
               ("00:01", "Bedarf", "Ihr sucht noch etwas für eure Klasse, egal ob Klettern oder Teambuilding."),
               ("00:06", "Angebot mit Frist", "Bis Anfang November läuft noch die Förderung für Schulklassen."),
               ("00:10", "Aufruf", "„Nutzt die Chance und kommt noch mal vorbei.“ Kurz, klar, in 13 Sekunden erzählt.")],
        stats=None),
    "bs-ortsanalyse": dict(
        kunde="BS Immobiliengruppe", kurz="BS Immobiliengruppe", client="bs-immobiliengruppe",
        branche="immobilien", format="Ortsanalyse", dauer=31, upload="2026-10-18",
        ig="https://www.instagram.com/reel/DepDiWkN88H/",
        titel="„Drei starke Standorte rund um Kiel“",
        hook="Du suchst eine Immobilie rund um Kiel?",
        beats=[("00:00", "Hook", "„Du suchst eine Immobilie rund um Kiel? Dann solltest du diese Orte auf dem Schirm haben.“"),
               ("00:04", "Struktur", "Drei Orte, eingeblendet mit Karten-Pins: Kronshagen, Schwentinental, Eckernförde."),
               ("00:06", "Nutzen", "Pro Ort zwei Argumente: Preise, Minuten bis in die Kieler Innenstadt, Kitas, Schulen, Einkauf, Ärzte."),
               ("00:25", "Aufruf", "„Schreibt uns in die Kommentare, welchen Ort ihr als nächstes analysiert haben wollt.“ Daraus wird eine Serie.")],
        stats=None),
    "bs-entweder-oder": dict(
        kunde="BS Immobiliengruppe", kurz="BS Immobiliengruppe", client="bs-immobiliengruppe",
        branche="immobilien", format="Entweder oder", dauer=46, upload="2026-10-20",
        ig="https://www.instagram.com/reel/DeuM70KtRNq/",
        titel="„Entweder oder: Immobilienmakler-Edition“",
        hook="Entweder oder · Immobilienmakler-Edition",
        beats=[("00:00", "Hook", "Titel-Chip „Entweder oder · Immobilienmakler-Edition“. Ein bekanntes Spiel, neu besetzt."),
               ("00:03", "Runde 1", "Preis oder Lage? Marc und Leon zeigen jeweils auf ihre Wahl."),
               ("00:08", "Runde 2", "Altbau oder Neubau? Spätestens jetzt merkt man: Auch Makler ticken unterschiedlich."),
               ("00:12", "Weitere Runden", "Balkon oder Garten und mehr. Keine Sprache nötig, nur Musik, Grafik und Persönlichkeit."),
               ("Caption", "Aufruf", "„Was darf bei eurer Traumimmobilie in Kiel auf keinen Fall fehlen?“")],
        stats=None),
}

CLIENTS = {
    "bs-immobiliengruppe": dict(name="BS Immobiliengruppe", branche="immobilien", ort="Kiel und Umgebung",
        reels=["bs-ortsanalyse", "bs-entweder-oder"], ig="https://www.instagram.com/bs.immobiliengruppe/",
        intro="Immobilienmakler aus Kiel. Marc und Leon stehen selbst vor der Kamera und zeigen, wer hinter den Objekten steckt: mit Ortsanalysen für Käufer und mit Formaten, die Persönlichkeit zeigen."),
    "maler-rohwer": dict(name="Jens Rohwer Malermeister", branche="handwerk", ort=None,
        reels=["maler-rohwer"], ig="https://www.instagram.com/maler.rohwer/",
        intro="Malerbetrieb mit Humor. Statt Vorher-Nachher-Bildern erzählen die Videos, was jeder Handwerker auf der Baustelle erlebt. Genau das teilen die Leute."),
    "jan-hein-klaas-pit": dict(name="Jan & Hein & Klaas & Pit", branche="gastronomie", ort="Kiel",
        reels=["jan-hein-klaas-pit"], ig="https://www.instagram.com/janheinklaaspit/",
        intro="Kneipe und Mittagstisch in Kiel. Die Videos machen aus der Mittagspause eine kleine Geschichte, mit wiederkehrenden Figuren und viel Wiedererkennung."),
    "das-kleine-steakhouse": dict(name="Das kleine Steakhouse", branche="gastronomie", ort="Kiel, Kirchhofallee",
        reels=["das-kleine-steakhouse"], ig="https://www.instagram.com/das_kleine_steakhouse/",
        intro="Steakhouse in Kiel. Die Sketche spielen genau dort, wo die Gäste sitzen: am Tisch, mit dem Essen im Bild."),
    "kletterwald-travemuende": dict(name="Kletterwald Travemünde", branche="unternehmen", ort="Travemünde",
        reels=["kletterwald-travemuende"], ig="https://www.instagram.com/kletterwaldtravemuende/",
        intro="Kletterwald an der Lübecker Bucht. Hier zählen klare Angebote zur richtigen Zeit, zum Beispiel für Schulklassen kurz vor Saisonende."),
    "die-drei": dict(name="Weinbar „Die Drei“", branche="gastronomie", ort="Kiel",
        reels=[], ig=None,
        intro="Weinbar in Kiel. Die Videos folgen in Kürze."),
}

BRANCHEN = {
    "gastronomie": dict(name="Gastronomie", short="Gastro", img="gastro-dreh",
        h1="Volle Tische.<br><em>Volle Kommentare.</em>",
        lead="Restaurants, Bars, Cafés und Mittagstische in Kiel und an der Lübecker Bucht. Wir drehen dort, wo eure Gäste sitzen, und erzählen Geschichten, die man am Tisch weitererzählt.",
        card="Sketche am Tisch, Mittagstisch, Aktionen, Küche von innen.",
        chips=["POV-Sketch", "Mittagstisch", "Aktion"],
        pains=["Ihr postet Essensfotos, aber niemand kommentiert.", "Neue Gäste finden euch nicht, Stammgäste wissen nichts von Aktionen.", "Im Alltag bleibt keine Zeit für Instagram."],
        formats=[("POV-Sketch am Tisch", "Eine Situation, die jeder vom Essengehen kennt. Das Essen ist immer im Bild.", "„POV: Du sagst, du nimmst nur einen Salat.“"),
                 ("Mittagstisch der Woche", "Die Wochenkarte als kurze Szene statt als Liste. Wiederkehrend, gut planbar.", "„Alle warten. Und dann kommt er endlich: der Mittagstisch.“"),
                 ("Aktion mit Termin", "Studententag, Event, Saisonstart. Ein Angebot, ein Datum, ein klarer Aufruf.", "„Wer studiert, sollte sich diesen Mittwoch merken.“"),
                 ("Küche von innen", "Wer kocht hier eigentlich? Menschen statt Hochglanz.", "„So sieht unser Freitagabend hinter der Tür aus.“")],
        refs=["das-kleine-steakhouse", "jan-hein-klaas-pit", "die-drei"],
        faq=[("Stören die Drehs den laufenden Betrieb?", "Wir stimmen den Drehtermin mit euch ab, zum Beispiel vor der Öffnung oder in einer ruhigen Stunde. Gäste filmen wir nur, wenn sie einverstanden sind."),
             ("Wer spielt in den Videos mit?", "Das entscheiden wir gemeinsam im Skript. Viele zeigen ihr Team, andere bleiben lieber hinter der Kamera."),
             ("Können wir Aktionen kurzfristig bewerben?", "Ja. Für Termine wie Aktionstage planen wir die Videos so, dass sie rechtzeitig vorher online sind.")]),
    "immobilien": dict(name="Immobilien", short="Immobilien", img="immobilien-dreh",
        h1="Makler, die man kennt,<br><em>bevor man anruft.</em>",
        lead="Für Immobilienmakler, Verwalter und Bauträger. Wir machen aus Objekten, Orten und euren Köpfen Videos, die Eigentümer und Käufer in der Region wirklich ansehen.",
        card="Entweder oder, Ortsanalysen, Objekte mit Hook, Persönlichkeit.",
        chips=["Ortsanalyse", "Entweder oder", "Objekt-Rundgang"],
        pains=["Objektfotos sehen bei allen Maklern gleich aus.", "Eigentümer entscheiden nach Vertrauen, nicht nach Exposé.", "Videos ohne Plan bekommen kaum Aufrufe."],
        formats=[("Ortsanalyse", "Drei Orte, zwei Argumente pro Ort, ein Serien-Aufruf. Zeigt Marktwissen ohne Verkaufsdruck.", "„Du suchst eine Immobilie rund um Kiel? Dann solltest du diese Orte kennen.“"),
                 ("Entweder oder", "Zwei Makler, schnelle Entscheidungen, viel Persönlichkeit. Funktioniert auch ohne Sprache.", "„Altbau oder Neubau? Balkon oder Garten?“"),
                 ("Objekt-Rundgang mit Hook", "Nicht Raum für Raum, sondern mit dem einen Detail, das neugierig macht.", "„Diese Wohnung hat ein Zimmer, das auf keinem Grundriss steht.“"),
                 ("Blick ins Büro", "Wer arbeitet hier, wie läuft ein Termin ab? Nähe schafft Vertrauen.", "„Bei uns zieht ein neuer Schreibtisch ein. Was darf nicht fehlen?“")],
        refs=["bs-immobiliengruppe"],
        faq=[("Dürfen wir Objekte von Eigentümern zeigen?", "Nur mit deren Einverständnis. Das klären wir vor jedem Objektdreh mit euch."),
             ("Müssen wir selbst vor die Kamera?", "Persönlichkeit wirkt bei Maklern am stärksten. Wir schreiben die Skripte so, dass ihr nichts auswendig lernen müsst."),
             ("Für welche Kanäle sind die Videos?", "Alle Videos sind im Hochformat und passen für Instagram Reels, TikTok und YouTube Shorts.")]),
    "handwerk": dict(name="Handwerk", short="Handwerk", img="handwerk-dreh",
        h1="Handwerk, das man<br><em>gern anschaut.</em>",
        lead="Für Malerbetriebe, Elektriker, Tischler, SHK und alle, die mit den Händen arbeiten. Videos, die Kunden zum Schmunzeln bringen und Bewerbern zeigen, wie es bei euch wirklich ist.",
        card="Kunden-Sketche, Azubi-Formate, Vorher und Nachher, Teamvideos.",
        chips=["Kunden-Sketch", "Recruiting", "Vorher und Nachher"],
        pains=["Ihr habt volle Auftragsbücher, aber keine Bewerber.", "Fotos von fertigen Wänden zeigen nicht, wer ihr seid.", "Auf der Baustelle ist keine Zeit zum Filmen."],
        formats=[("Kunden-Sketch", "Die Sprüche, die jeder Handwerker kennt, als kurze Szene. Hohe Wiedererkennung, viele Kommentare.", "„Also mein Nachbar hätte das anders gemacht …“"),
                 ("Ein Tag als Azubi", "Ein Azubi nimmt euch mit durch den Tag. Das beste Recruiting-Format, weil es ehrlich ist.", "„Von morgens bis Feierabend: So sieht mein Tag aus.“"),
                 ("Vorher und Nachher", "Der Unterschied in Sekunden. Mit Hook statt nur mit Musik.", "„Diese Wand hat drei Tapetenschichten versteckt.“"),
                 ("Fachfrage in 30 Sekunden", "Eine Frage, die Kunden immer stellen, kurz beantwortet. Zeigt Kompetenz.", "„Warum man nie über Raufaser streichen sollte.“")],
        refs=["maler-rohwer"],
        faq=[("Wie lange sind wir auf der Baustelle beschäftigt?", "Wir drehen dort, wo ihr ohnehin arbeitet, und stimmen den Termin mit euch ab. Das Skript sorgt dafür, dass keine Zeit verloren geht."),
             ("Helfen die Videos auch bei der Mitarbeitersuche?", "Ja. Recruiting-Videos gehören zu unseren Leistungen, zum Beispiel als Azubi-Format oder Teamvorstellung."),
             ("Was, wenn wir keine lustigen Typen sind?", "Nicht jedes Video muss ein Sketch sein. Fachfragen und Vorher-Nachher-Formate funktionieren auch ruhig erzählt.")]),
    "unternehmen": dict(name="Unternehmen", short="Unternehmen", img="unternehmen-dreh",
        h1="Euer Unternehmen,<br><em>in 30 Sekunden erzählt.</em>",
        lead="Für Freizeitbetriebe, Dienstleister, Händler und den Mittelstand an der Förde und an der Lübecker Bucht. Wir bringen Angebote, Events und Menschen so auf den Punkt, dass sie im Feed hängen bleiben.",
        card="Angebote mit Frist, Events, Mitarbeiter, Blick hinter die Kulissen.",
        chips=["Angebot mit Frist", "Event", "Recruiting"],
        pains=["Eure Angebote gehen im Feed unter.", "Ihr habt spannende Menschen, aber niemand sieht sie.", "Imagefilme sind zu lang für Social Media."],
        formats=[("Angebot mit Frist", "Zielgruppe direkt ansprechen, Angebot nennen, Termin setzen. In 15 Sekunden gesagt.", "„Liebe Lehrerinnen, liebe Lehrer, jetzt ist eure Chance.“"),
                 ("Event-Ankündigung", "Halloween, Saisonstart, Tag der offenen Tür. Spannung aufbauen statt Plakat abfilmen.", "„Wenn es dunkel wird, passiert hier etwas.“"),
                 ("Menschen im Unternehmen", "Mitarbeitende stellen ihren Job vor. Stark für Marke und Recruiting.", "„Ich erkläre euch in 20 Sekunden, was ich hier mache.“"),
                 ("Hinter den Kulissen", "Was Kunden nie sehen, aber spannend finden.", "„So sieht es hier aus, bevor die Tür aufgeht.“")],
        refs=["kletterwald-travemuende"],
        faq=[("Passt das auch für B2B-Unternehmen?", "Ja. Auch Geschäftskunden schauen Kurzvideos. Wir passen Formate und Ton an eure Zielgruppe an."),
             ("Macht ihr auch längere Filme?", "Ja, Imagefilme und Fotos gehören zu unseren Leistungen."),
             ("Können wir die Videos auch für Werbung nutzen?", "Ja. Auf Wunsch spielen wir sie als Werbeanzeigen in der Region aus.")]),
}

NAV_MAIN = [("/leistungen", "Leistungen"), ("/branchen", "Branchen"), ("/referenzen", "Referenzen"),
            ("/so-arbeiten-wir", "Ablauf"), ("/pakete", "Pakete")]
NAV_ALL = [("/", "Start"), ("/leistungen", "Leistungen"), ("/branchen", "Branchen"), ("/referenzen", "Referenzen"),
           ("/so-arbeiten-wir", "So arbeiten wir"), ("/pakete", "Pakete"), ("/testvideos", "3 Testvideos"),
           ("/vision", "Vision"), ("/ueber-uns", "Über uns"), ("/faq", "FAQ"), ("/kontakt", "Kontakt")]

FAQ_CORE = [
    ("Was kostet das?", "Wir arbeiten mit drei Paketen: 4, 8 oder 12 Videos im Monat. Der Preis hängt vom Umfang ab und steht nach dem Erstgespräch schwarz auf weiß im Angebot. Vorher bekommt ihr 3 Testvideos kostenlos."),
    ("Was sind die 3 kostenlosen Testvideos?", "Wir lernen euch kennen, schreiben Skripte, drehen bei euch vor Ort und schneiden drei Videos. So seht ihr, wie es werden kann, bevor ihr euch entscheidet."),
    ("Müssen wir selbst vor die Kamera?", "Ihr könnt, müsst aber nicht. Wer mitspielt, klären wir im Skript. Auswendig lernen muss niemand."),
    ("Wie viel Zeit kostet uns das?", "Ein Gespräch, ein Blick aufs Skript und ein Drehtermin bei euch. Schreiben, Schnitt und auf Wunsch das Posten übernehmen wir."),
    ("Wo seid ihr unterwegs?", "In Kiel und an der Lübecker Bucht. Wir kommen zu euch in den Laden, ins Büro oder auf die Baustelle."),
    ("Für welche Branchen arbeitet ihr?", "Für jede Branche, in der Menschen arbeiten. Referenzen haben wir aus Gastronomie, Immobilien, Handwerk und Freizeit."),
]
FAQ_MORE = [
    ("Wer postet die Videos?", "Das könnt ihr selbst machen oder uns überlassen. Posting und Community-Management gehören zu unseren Zusatzleistungen."),
    ("Macht ihr auch Werbeanzeigen?", "Ja. Auf Wunsch spielen wir eure Videos als Werbeanzeigen aus, gezielt in eurer Region."),
    ("Wie läuft die Abstimmung?", "Ihr bekommt das Skript vor dem Dreh und die fertigen Videos vor der Veröffentlichung. Nichts geht online, was ihr nicht gesehen habt."),
    ("Für welche Kanäle sind die Videos?", "Alle Videos sind im Hochformat 9:16 und passen für Instagram Reels, TikTok und YouTube Shorts."),
    ("Wie schnell können wir starten?", f"Nach dem Erstgespräch planen wir die 3 Testvideos. Den genauen Zeitplan besprechen wir mit euch. {ph('Typische Dauer bis zu den Testvideos')}"),
    ("Wem gehören die Videos?", f"{ph('Regelung zu Nutzungsrechten aus dem SCM-Vertrag')}"),
]

# ------------------------------------------------------------------
# Bausteine
# ------------------------------------------------------------------
VER = ""


def url(path):
    return BASE + ("" if path == "/" else path)


def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>"


ORG = {"@type": "Organization", "@id": BASE + "/#org", "name": "SCM Creatives", "url": BASE + "/",
       "logo": BASE + "/img/logo-dark.png",
       "description": "Social Media Agentur für Kiel und die Lübecker Bucht: Kurzvideos nach Skript, gedreht vor Ort.",
       "sameAs": [IG],
       "areaServed": [{"@type": "City", "name": "Kiel"}, {"@type": "Place", "name": "Lübecker Bucht"}]}


def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": url(p)} for i, (p, n) in enumerate(items)]}


def head(path, title, desc, og=None, noindex=False, ld=None):
    og = og or "/img/og.jpg"
    robots = '<meta name="robots" content="noindex, follow">' if noindex else ""
    lds = "".join(jsonld(x) for x in (ld or []))
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{html.escape(desc, quote=True)}">
<link rel="canonical" href="{url(path)}">
{robots}
<meta name="theme-color" content="#0B0B0C">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="SCM Creatives">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:description" content="{html.escape(desc, quote=True)}">
<meta property="og:url" content="{url(path)}">
<meta property="og:image" content="{BASE}{og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preload" href="/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/courier-prime-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/drehbuch.css?v={VER}">
{lds}
</head>
<body>
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
<div class="klappe" aria-hidden="true">
  <div class="kl-board">
    <div class="kl-stick"></div>
    <div class="kl-body">
      <div class="kl-title">SCM <b>Creatives</b></div>
      <div><span>Szene</span>01</div><div><span>Take</span>1</div>
      <div><span>Ort</span>Kiel</div><div><span>Skript</span>Fertig</div>
    </div>
  </div>
</div>
<div class="curtain" aria-hidden="true"></div>
"""


def header(active):
    cur = ' aria-current="page"'
    nav = "".join(f'<a href="{h}"{cur if h == active else ""}>{l}</a>' for h, l in NAV_MAIN)
    allnav = "".join(f'<a href="{h}"{cur if h == active else ""}><i>SZ {i:02d}</i>{l}</a>'
                     for i, (h, l) in enumerate(NAV_ALL, 1))
    return f"""<header class="site-header">
  <a class="brand" href="/" aria-label="SCM Creatives, zur Startseite"><img src="/img/logo.svg" alt="SCM Creatives" width="113" height="40"></a>
  <nav class="mainnav" aria-label="Hauptnavigation">{nav}</nav>
  <div class="head-right">
    <a class="btn btn-sm" href="/anfrage">3 Testvideos anfragen</a>
    <button class="menu-btn" aria-expanded="false" aria-controls="menu"><span class="mb-txt">Menü</span><span class="mb-ico" aria-hidden="true"><i></i><i></i></span></button>
  </div>
</header>
<div class="nav-overlay" id="menu">
  <nav class="nav-list" aria-label="Alle Seiten">{allnav}</nav>
  <aside class="nav-side">
    <p class="lbl"><span class="dot blink"></span>Jetzt drehen</p>
    <p class="d3">3 Testvideos.<br><em>Kostenlos.</em></p>
    <p>Wir lernen euch kennen, schreiben die Skripte und drehen bei euch vor Ort. Danach entscheidet ihr.</p>
    <div class="btn-row"><a class="btn" href="/anfrage">Testvideos anfragen</a><a class="btn btn-ghost" href="{wa_href()}"{ext(wa_href())}>WhatsApp</a></div>
    <div class="nav-small"><a href="{IG}" target="_blank" rel="noopener">Instagram</a><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a></div>
  </aside>
</div>
<div class="hud" aria-hidden="true" data-runtime="120"><i></i><span>REC</span><span class="tc">00:00:00:00</span><span class="scene">SZENE 01</span></div>
<main id="inhalt">
"""


def footer():
    cols = f"""
      <div class="foot-col"><b>Seiten</b><a href="/leistungen">Leistungen</a><a href="/so-arbeiten-wir">So arbeiten wir</a><a href="/referenzen">Referenzen</a><a href="/pakete">Pakete</a><a href="/testvideos">3 Testvideos</a><a href="/faq">FAQ</a></div>
      <div class="foot-col"><b>Branchen</b><a href="/branchen/gastronomie">Gastronomie</a><a href="/branchen/immobilien">Immobilien</a><a href="/branchen/handwerk">Handwerk</a><a href="/branchen/unternehmen">Unternehmen</a><a href="/branchen">Alle Branchen</a></div>
      <div class="foot-col"><b>Kontakt</b><a href="/anfrage">Anfrage starten</a><a href="{wa_href()}"{ext(wa_href())}>WhatsApp</a><a href="{tel_href()}">Anrufen</a><a href="{IG}" target="_blank" rel="noopener">Instagram</a><a href="/ueber-uns">Über uns</a><a href="/vision">Vision</a></div>"""
    return f"""</main>
<footer class="credits" data-scene="ABSPANN">
  <div class="wrap">
    <div class="cr-roll">
      <p class="lbl"><span class="dot"></span>Abspann</p>
      <dl>
        <dt>Skript</dt><dd class="sep">·</dd><dd>SCM Creatives</dd>
        <dt>Kamera</dt><dd class="sep">·</dd><dd>SCM Creatives</dd>
        <dt>Schnitt</dt><dd class="sep">·</dd><dd>SCM Creatives</dd>
        <dt>Hauptrolle</dt><dd class="sep">·</dd><dd>Ihr</dd>
        <dt>Drehorte</dt><dd class="sep">·</dd><dd>Kiel und Lübecker Bucht</dd>
      </dl>
    </div>
    <div class="foot-grid">
      <div class="foot-brand"><img src="/img/logo.svg" alt="SCM Creatives" width="130" height="46" loading="lazy">
        <p>Social Media Agentur für Kiel und die Lübecker Bucht. Kurzvideos nach Skript, gedreht bei euch vor Ort.</p></div>{cols}
    </div>
    <div class="foot-base"><span>© 2026 SCM Creatives</span><span><a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a></span></div>
  </div>
</footer>
<nav class="mbar" aria-label="Schnellkontakt">
  <a class="btn" href="/anfrage">3 Testvideos anfragen</a>
  <a class="ic" href="{wa_href()}"{ext(wa_href())} aria-label="WhatsApp schreiben">{I_WA}</a>
  <a class="ic" href="{tel_href()}" aria-label="Anrufen">{I_TEL}</a>
</nav>
<script src="/js/drehbuch.js?v={VER}" defer></script>
</body>
</html>
"""


def lbl(text, blink=False):
    return f'<p class="lbl"><span class="dot{" blink" if blink else ""}"></span>{text}</p>'


def sec_head(num, label, title, lead=None, link=None):
    l = f'<a class="btn-link rv" href="{link[0]}">{link[1]} {ARROW}</a>' if link else ""
    ld = f'<p class="lead rv" data-d="1">{lead}</p>' if lead else ""
    return f"""<div class="sec-head"><div>{lbl(f"Szene {num} · {label}") if num else lbl(label)}
      <h2 class="d2 split">{title}</h2></div>{l}{ld}</div>"""


def phone(slug, kind="loop", cls="", eager=False, sound=False, ui=True, label=True, plx=None):
    r = REELS[slug]
    src = f"/media/{slug}-loop" if kind == "loop" else f"/media/{slug}"
    poster = f"/media/{slug}-sm.webp" if kind == "loop" else f"/media/{slug}.webp"
    b = BRANCHEN[r["branche"]]["name"]
    attrs = 'data-auto ' + ('data-eager ' if eager else '')
    loop = " loop" if kind == "loop" else " loop"
    snd = f'<button class="sound" type="button" aria-pressed="false" aria-label="Ton an">{I_SOUND}</button>' if sound else ""
    p = f' data-plx="{plx}"' if plx else ""
    uihtml = f"""<div class="phone-ui" aria-hidden="true"><div class="pu-top"><span class="pu-rec"><i></i>REC</span><span class="pu-tc">00:00:00:00</span></div>
      {f'<div class="pu-bot"><b>{r["kurz"]}</b><span>{b} · {r["format"]}</span></div>' if label else '<div></div>'}</div>""" if ui else ""
    return f"""<div class="phone vf {cls}"{p}>
      <video muted playsinline{loop} preload="none" poster="{poster}" {attrs}data-mp4="{src}.mp4" data-webm="{src}.webm" aria-label="Video: {html.escape(r['titel'])}, {r['kunde']}"></video>
      {uihtml}{snd}</div>"""


def reel_card(slug, d=None, rv=True):
    r = REELS[slug]
    dd = f' data-d="{d}"' if (d and rv) else ""
    return f"""<article class="reel{' rv' if rv else ''}"{dd} data-branche="{r['branche']}">
      <a href="/referenzen/{r['client']}" aria-label="{html.escape(r['kunde'])}: {html.escape(r['format'])} ansehen">
        {phone(slug, label=False)}
        <div class="reel-meta" style="margin-top:.9rem"><b>{r['kurz']}</b><span>{BRANCHEN[r['branche']]['name']} · {r['format']}</span></div>
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
      <p>Jede Branche, in der Menschen arbeiten, hat Geschichten. Einzelhandel, Hotels, Fitness, Friseure, Autohäuser, Vereine: Wir finden das Format, das zu euch passt.</p></a>"""


STEPS = [
    ("01", "Erstgespräch", "Wir lernen euch, euer Angebot und eure Zielgruppe kennen. Was soll das Video erreichen: mehr Gäste, mehr Anfragen, neue Mitarbeitende?", "Ein Gespräch"),
    ("02", "Skript", "Wir schreiben Hooks, Szenen und Aufrufe. Jedes Video folgt einem Plan, bevor die Kamera läuft. Ihr lest und gebt frei.", "Skript lesen und freigeben"),
    ("03", "Dreh vor Ort", "Wir kommen zu euch in den Laden, ins Büro oder auf die Baustelle. Mit Licht, Ton und einem klaren Ablauf.", "Ein Termin bei euch"),
    ("04", "Schnitt", "Tempo, Untertitel, Hook-Texte, Musik. Wir schneiden, bis es sitzt, und ihr seht alles vor der Veröffentlichung.", "Videos ansehen und freigeben"),
    ("05", "Veröffentlichen", "Ihr postet selbst oder wir übernehmen Posting und Community. Auf Wunsch auch als Werbeanzeige in der Region.", "Nichts, wenn wir posten"),
    ("06", "Auswerten und nachschärfen", "Was hat funktioniert? Daraus entstehen die nächsten Skripte. So wird jede Runde besser.", "Ein kurzer Austausch"),
]


def drehplan(steps=STEPS):
    rows = "".join(f"""<div class="dp-row"><span class="dp-no">{n}</span><h3>{t}</h3><p>{d}</p>
      <p class="dp-eff"><small>Euer Aufwand</small>{e}</p></div>""" for n, t, d, e in steps)
    return f"""<div class="drehplan"><div class="dp-row dp-head" aria-hidden="true"><span>Nr.</span><span>Schritt</span><span>Was passiert</span><span>Euer Aufwand</span></div>{rows}</div>"""


def packs(compact=False):
    data = [("4", "Starter", "Für den Einstieg und Betriebe, die regelmäßig sichtbar werden wollen.", False),
            ("8", "Wachstum", "Zwei Videos pro Woche. Genug, damit Serien entstehen und der Algorithmus euch kennt.", True),
            ("12", "Pro", "Für alle, die ihre Region mit Videos prägen wollen. Mehrere Formate parallel.", False)]
    inc = ["Konzept und Skripte", "Dreh bei euch vor Ort", "Schnitt mit Untertiteln und Hook-Texten",
           "Hochformat für Reels, TikTok und Shorts", "Freigabe vor jeder Veröffentlichung"]
    out = ""
    for i, (n, name, txt, hot) in enumerate(data):
        tag = '<span class="tag">Empfehlung</span>' if hot else ""
        ticks = "".join(f"<li>{x}</li>" for x in inc)
        out += f"""<article class="pack{' hot' if hot else ''} rv" data-d="{i+1}">{tag}
          <div class="pack-num"><strong>{n}</strong><span>Videos<br>pro Monat</span></div>
          <h3>{name}</h3><p>{txt}</p>{'' if compact else f'<ul class="ticks">{ticks}</ul>'}
          <a class="btn{'' if hot else ' btn-ghost'}" href="/anfrage?paket={n}">Paket {name} anfragen</a></article>"""
    return f'<div class="packs">{out}</div>'


def offer(cta=True, scene="07"):
    btn = f'<div class="btn-row rv"><a class="btn" href="/anfrage">3 Testvideos kostenlos anfragen</a><a class="btn btn-ghost" href="/testvideos">So funktioniert es</a></div>' if cta else ""
    return f"""<section class="sec" data-scene="SZENE {scene} · ANGEBOT"><div class="wrap">
  <div class="offer">
    <div class="offer-bg"><video muted playsinline loop preload="none" poster="/img/ki-platzhalter-kiel-foerde.webp" data-auto data-mp4="/media/ki-platzhalter-kiel-foerde.mp4" data-webm="/media/ki-platzhalter-kiel-foerde.webm" aria-hidden="true"></video></div>
    <span class="ki-tag">KI-Platzhalter</span>
    <div class="stack">{lbl(f"Szene {scene} · Das Angebot", True)}
      <h2 class="d1 split">3 Testvideos.<br><em>Kostenlos.</em></h2>
      <p class="lead rv">Bevor ihr euch für ein Paket entscheidet, zeigen wir euch, wie es werden kann. Mit euren Leuten, an eurem Ort, nach unserem Skript.</p></div>
    <div class="takes">
      <div class="take rv" data-d="1"><span class="lbl">Take 1</span><h3>Kennenlernen</h3><p>Ein Gespräch über euch, eure Gäste oder Kunden und das, was ihr erreichen wollt.</p></div>
      <div class="take rv" data-d="2"><span class="lbl">Take 2</span><h3>3 Testvideos</h3><p>Wir schreiben die Skripte, drehen bei euch und schneiden drei fertige Videos.</p></div>
      <div class="take rv" data-d="3"><span class="lbl">Take 3</span><h3>Ihr entscheidet</h3><p>Gefällt es euch, geht es mit einem Paket weiter. Wenn nicht, kostet es euch nichts.</p></div>
    </div>{btn}
  </div></div></section>"""


def cta_band(title="Euer nächstes Video<br><em>beginnt mit einem Gespräch.</em>", text="Erzählt uns in zwei Minuten, wer ihr seid. Wir melden uns mit einem Vorschlag für eure 3 Testvideos."):
    return f"""<section class="sec" data-scene="SZENE · AUFRUF"><div class="wrap cta-band">
  {lbl("Letzte Szene", True)}<h2 class="d2 split">{title}</h2><p class="lead rv">{text}</p>
  <div class="btn-row rv"><a class="btn" href="/anfrage">3 Testvideos anfragen</a><a class="btn btn-ghost" href="{wa_href()}"{ext(wa_href())}>{I_WA.replace('<svg', '<svg width=18 height=18 fill=none stroke=currentColor stroke-width=1.8')} WhatsApp</a></div>
</div></section>"""


def page_head(scene, h1, lead, crumbs=None, media=None, video=None, extra=""):
    cr = ""
    if crumbs:
        parts = []
        for p, n in crumbs[:-1]:
            parts.append(f'<a href="{p}">{n}</a><span aria-hidden="true">/</span>')
        parts.append(f'<span aria-current="page">{crumbs[-1][1]}</span>')
        cr = f'<nav class="crumbs" aria-label="Brotkrumen">{"".join(parts)}</nav>'
    m = ""
    if video:
        m = f"""<div class="ph-media"><video muted playsinline loop preload="none" poster="/img/{media}.webp" data-auto data-eager data-mp4="/media/{video}.mp4" data-webm="/media/{video}.webm" aria-hidden="true"></video></div><span class="ki-tag">KI-Platzhalter</span>"""
    elif media:
        m = f'<div class="ph-media"><img src="/img/{media}.webp" alt="" fetchpriority="high" width="1376" height="768"></div><span class="ki-tag">KI-Platzhalter</span>'
    cls = " has-media" if (media or video) else ""
    return f"""<section class="page-head{cls}" data-scene="SZENE 01 · {html.escape(scene.upper())}">{m}
  <div class="wrap">{cr}{lbl(f"Szene 01 · {scene}", True)}
    <h1 class="d1 split" data-split="chars">{h1}</h1>
    <p class="lead rv" data-d="1">{lead}</p>{extra}
  </div></section>"""


# ------------------------------------------------------------------
# Seiten
# ------------------------------------------------------------------
PAGES = {}


def page(path, title, desc, body, active="", ld=None, noindex=False, og=None):
    PAGES[path] = dict(html=head(path, title, desc, og=og, noindex=noindex, ld=ld) + header(active) + body + footer(),
                       noindex=noindex)


def skript_section():
    beats = [("00:00", "Hook", "Text im Bild: „POV: Du sagst, du nimmst nur einen Salat.“"),
             ("00:02", "Wiedererkennen", "Am Tisch bestellen alle Burger. Ein langer Blick auf die Karte."),
             ("00:06", "Steigerung", "Der erste Burger kommt. Der zweite. Der dritte. Der Salat wirkt plötzlich klein."),
             ("00:12", "Pointe", "„Einen Burger. Für mich. Und Pommes.“"),
             ("00:15", "Aufruf", "„Markiert den Freund, der immer nur einen Salat nimmt.“")]
    expl = [("01", "Hook", "Die ersten zwei Sekunden entscheiden, ob jemand weiterwischt. Darum steht der Hook als Text im Bild und als erster Satz im Skript."),
            ("02", "Wiedererkennen", "Eine Situation, die eure Zielgruppe sofort kennt. Wer sich wiederfindet, schaut weiter und denkt an jemanden."),
            ("03", "Steigerung", "Zwei, drei Schritte, die Spannung aufbauen. Kurz, klar, ohne Umweg. Jede Sekunde hat eine Aufgabe."),
            ("04", "Pointe", "Der Moment, für den man das Video teilt. Oder die eine Information, die hängen bleibt."),
            ("05", "Aufruf", "Am Ende eine kleine Aufgabe: kommentieren, markieren, vorbeikommen. So wird aus einem Video Reichweite.")]
    b = "".join(f'<div class="beat"><span class="tc">{t}</span><div><b>{l}</b>{x}</div></div>' for t, l, x in beats)
    e = "".join(f'<div class="scrub-step"><span class="num">{n}</span><h3 class="d3">{t}</h3><p>{x}</p></div>' for n, t, x in expl)
    return f"""<section class="skript" data-scrub data-scene="SZENE 03 · DAS SKRIPT" id="skript">
  <div class="skript-stage"><div class="wrap">
    <div style="margin-bottom:clamp(1.2rem,3vh,2.4rem)">{lbl("Szene 03 · Das Skript")}<h2 class="d2" style="margin-top:.8rem">So entsteht ein Video,<br><em>das man zu Ende schaut.</em></h2></div>
    <div class="skript-grid">
      <div class="sheet" role="group" aria-label="Beispiel-Skript">
        <div class="sheet-head"><span>Beispiel-Skript</span><span>Innen. Restaurant. Abend.</span></div>{b}
      </div>
      <div class="skript-phone">{phone('das-kleine-steakhouse', ui=True, label=False)}
        <div class="tl" aria-hidden="true"><i></i></div><div class="tl-lbl" aria-hidden="true"><span>00:00</span><span>00:15</span></div></div>
      <div class="explain">{e}</div>
    </div>
  </div></div>
</section>"""


def build_home():
    marquee_names = ["BS Immobiliengruppe", "Maler Rohwer", "Jan & Hein & Klaas & Pit", "Das kleine Steakhouse",
                     "Kletterwald Travemünde", "Weinbar Die Drei"]
    mq = "".join(f"<span>{n}</span>" for n in marquee_names)
    reels = "".join(reel_card(s, rv=False) for i, s in enumerate(
        ["maler-rohwer", "jan-hein-klaas-pit", "bs-entweder-oder", "das-kleine-steakhouse", "kletterwald-travemuende", "bs-ortsanalyse"]))
    body = f"""
<section class="hero" data-scene="SZENE 01 · HOOK">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      {lbl("Szene 01 · Innen. Kiel. Tag.", True)}
      <h1 class="d1 split" data-split="chars">Kein Zufall.<br><em>Ein Skript.</em></h1>
      <p class="lead rv" data-d="2">Social Media Videos für Betriebe in Kiel und an der Lübecker Bucht. Wir schreiben das Skript, drehen bei euch vor Ort und schneiden, bis es sitzt.</p>
      <div class="btn-row rv" data-d="3"><a class="btn" href="/anfrage">3 Testvideos kostenlos anfragen</a><a class="btn btn-ghost" href="/referenzen">Referenzen ansehen</a></div>
      <div class="trust rv" data-d="4"><span>Gastro · Immobilien · Handwerk · Unternehmen</span><span>Kiel und Lübecker Bucht</span><span>Wir kommen zu euch</span></div>
    </div>
    <div class="hero-phones rv-focus" aria-label="Aktuelle Videos von SCM Creatives">
      {phone('das-kleine-steakhouse', cls='p1', eager=True, plx='0.06')}
      {phone('maler-rohwer', cls='p2', eager=True, plx='0.12')}
      {phone('jan-hein-klaas-pit', cls='p3', eager=True, plx='0.04')}
    </div>
  </div>
</section>
<div class="marquee" aria-label="Kunden"><div class="mq-track">{mq}</div></div>

<section class="sec" data-scene="SZENE 02 · DAS PROBLEM"><div class="wrap">
  {lbl("Szene 02 · Das Problem")}
  <p class="say" data-say style="margin-top:1.6rem">Viele posten. Wenige werden gesehen. Der Unterschied ist selten die Kamera. <em>Es ist das Skript.</em></p>
  <div class="split2" style="margin-top:clamp(2.5rem,5vw,4rem);align-items:start">
    <p class="lead rv">Wer in zwei Sekunden nicht neugierig wird, wischt weiter. Deshalb beginnt bei uns jedes Video auf Papier: mit einem Hook, einer Situation, die eure Zielgruppe kennt, und einem klaren Ende.</p>
    <p class="rv" data-d="1">Das Ergebnis sind keine Hochglanz-Werbespots, sondern Videos mit echten Menschen aus euren Betrieben. Die Art Video, die man anschaut, weil sie sich nicht wie Werbung anfühlt.</p>
  </div>
</div></section>

{skript_section()}

<section class="sec" data-scene="SZENE 04 · BRANCHEN"><div class="wrap">
  {sec_head("04", "Branchen", "Für jeden Betrieb,<br><em>in dem Menschen arbeiten.</em>", "Gastronomie, Immobilien, Handwerk und Unternehmen sind unsere Referenzbranchen. Funktionieren tut es überall, wo es Menschen und Geschichten gibt.", ("/branchen", "Alle Branchen"))}
  <div class="bcards">{bcard('gastronomie', 1)}{bcard('immobilien', 2)}{bcard('handwerk', 3)}{bcard('unternehmen', 1, wide=True)}{bcard_any(2)}</div>
</div></section>

<section class="sec panel" data-scene="SZENE 05 · REFERENZEN">
  <div class="wrap">{sec_head("05", "Referenzen", "Gedreht in Kiel.<br><em>Geschaut im ganzen Feed.</em>", "Eine Auswahl aktueller Videos für unsere Kunden. Tippt auf ein Video, um zu sehen, wie es aufgebaut ist.", ("/referenzen", "Alle Referenzen"))}</div>
  <div class="reels rv" tabindex="0" aria-label="Referenzvideos, seitlich scrollbar">{reels}</div>
  <div class="wrap"><div class="facts" style="margin-top:3rem">
    <div class="fact rv"><strong data-count="209">209</strong><span>Likes für den Maler-Sketch, 1 Tag nach Veröffentlichung</span></div>
    <div class="fact rv" data-d="1"><strong data-count="24">24</strong><span>Kommentare unter demselben Video</span></div>
    <div class="fact rv" data-d="2"><strong>6</strong><span>Referenzkunden aus Gastro, Immobilien, Handwerk und Freizeit</span></div>
  </div><p class="q-note rv" style="margin-top:1rem">Zahlen: Instagram, Stand 21.10.2026.</p></div>
</section>

<section class="sec" data-scene="SZENE 06 · ABLAUF"><div class="wrap">
  {sec_head("06", "Der Drehplan", "Von der Idee<br><em>bis in den Feed.</em>", "Sechs Schritte, und bei den meisten habt ihr nichts zu tun.", ("/so-arbeiten-wir", "Ablauf im Detail"))}
  {drehplan()}
</div></section>

{offer()}

<section class="sec" data-scene="SZENE 08 · PAKETE"><div class="wrap">
  {sec_head("08", "Pakete", "Drei Pakete.<br><em>Ein Prinzip.</em>", "Alle Pakete enthalten Skript, Dreh und Schnitt. Der Unterschied ist die Anzahl der Videos im Monat. Und jedes Paket beginnt mit 3 kostenlosen Testvideos.", ("/pakete", "Pakete im Detail"))}
  {packs()}
</div></section>

<section class="sec panel" data-scene="SZENE 09 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head("09", "Fragen", "Was ihr<br><em>wissen wollt.</em>", None, ("/faq", "Alle Fragen"))}
  {faq_block(FAQ_CORE)}
</div></section>

{cta_band()}
"""
    ld = [{"@context": "https://schema.org", "@graph": [ORG, {"@type": "WebSite", "@id": BASE + "/#web", "url": BASE + "/", "name": "SCM Creatives", "inLanguage": "de-DE", "publisher": {"@id": BASE + "/#org"}}]}]
    page("/", "Social Media Videos nach Skript aus Kiel | SCM Creatives",
         "Kurzvideos für Gastronomie, Immobilien, Handwerk und Unternehmen in Kiel und an der Lübecker Bucht. Nach Skript, vor Ort gedreht. 3 Testvideos kostenlos.",
         body, "/", ld=ld)


def build_leistungen():
    items = [
        ("02", "Posting und Community", "Wir veröffentlichen eure Videos mit Caption und Hashtags und kümmern uns um Kommentare und Nachrichten. Ihr bleibt sichtbar, ohne selbst am Handy zu hängen.", ["Veröffentlichung nach Plan", "Captions und Hashtags", "Kommentare und Nachrichten"]),
        ("03", "Werbeanzeigen", "Gute Videos verdienen mehr Reichweite. Wir spielen sie als Werbeanzeigen auf Instagram und Facebook aus, gezielt in eurer Region.", ["Anzeigen aus euren Videos", "Zielgruppe in der Region", "Auswertung und Anpassung"]),
        ("04", "Recruiting-Videos", "Mitarbeitende und Azubis findet man dort, wo sie scrollen. Wir zeigen, wie es bei euch wirklich ist.", ["Ein Tag als Azubi", "Team stellt sich vor", "Stellenanzeigen als Video"]),
        ("05", "Fotos und Imagefilm", "Neben Kurzvideos entstehen Fotos für Website und Profile oder ein längerer Film über euer Unternehmen.", ["Fotos vom Drehtag", "Imagefilm", "Material für Website und Profile"]),
    ]
    svc = "".join(f"""<article class="svc-item rv" data-d="{i % 2 + 1}"><span class="lbl">Leistung {n}</span><h3>{t}</h3><p>{d}</p>
      <ul class="ticks">{''.join(f'<li>{x}</li>' for x in li)}</ul></article>""" for i, (n, t, d, li) in enumerate(items))
    body = page_head("Leistungen", "Alles, was ein Video<br><em>braucht.</em>",
                     "Im Mittelpunkt stehen Kurzvideos nach Skript. Drumherum bekommt ihr auf Wunsch alles, was aus Videos Reichweite, Anfragen und Bewerbungen macht.",
                     crumbs=[("/", "Start"), ("/leistungen", "Leistungen")], media="ki-platzhalter-schnitt") + f"""
<section class="sec" data-scene="SZENE 02 · KERNLEISTUNG"><div class="wrap">
  <div class="svc"><article class="svc-item lead-item rv">
    <div class="stack"><span class="lbl">Leistung 01 · Kernleistung</span><h3 style="font-size:clamp(2rem,4vw,3.4rem)">Kurzvideos nach Skript</h3>
      <p>Vom ersten Gedanken bis zum fertigen Video: Wir entwickeln Formate für euren Betrieb, schreiben die Skripte, drehen bei euch vor Ort und schneiden mit Untertiteln, Hook-Texten und Tempo.</p>
      <ul class="ticks"><li>Formate und Skripte für euren Betrieb</li><li>Dreh vor Ort in Kiel und an der Lübecker Bucht</li><li>Schnitt mit Untertiteln und Hook-Texten</li><li>Hochformat für Reels, TikTok und Shorts</li></ul>
      <a class="btn" href="/anfrage">3 Testvideos anfragen</a></div>
    <div class="duo">{phone('maler-rohwer', cls='rv-focus', label=True)}{phone('bs-entweder-oder', cls='rv-focus', label=True)}</div>
  </article>{svc}</div>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · KOMBINIEREN"><div class="wrap">
  {sec_head("03", "Kombinieren", "Ein Paket.<br><em>Beliebig erweitert.</em>", "Jedes Paket enthält Skript, Dreh und Schnitt. Posting, Werbeanzeigen, Recruiting und Fotos bucht ihr dazu, wenn ihr sie braucht.", ("/pakete", "Zu den Paketen"))}
  {packs(compact=True)}
</div></section>
{cta_band()}"""
    ld = [crumbs_ld([("/", "Start"), ("/leistungen", "Leistungen")]),
          {"@context": "https://schema.org", "@type": "Service", "name": "Social Media Kurzvideos nach Skript", "serviceType": "Social Media Videoproduktion",
           "provider": {"@type": "Organization", "name": "SCM Creatives", "url": BASE + "/"},
           "areaServed": [{"@type": "City", "name": "Kiel"}, {"@type": "Place", "name": "Lübecker Bucht"}],
           "description": "Konzept, Skript, Dreh vor Ort und Schnitt von Kurzvideos für Instagram Reels, TikTok und YouTube Shorts. Zusätzlich Posting, Community-Management, Werbeanzeigen, Recruiting-Videos, Fotos und Imagefilm."}]
    page("/leistungen", "Leistungen: Kurzvideos, Posting, Ads, Recruiting | SCM Creatives",
         "Kurzvideos nach Skript, dazu Posting und Community, Werbeanzeigen, Recruiting-Videos, Fotos und Imagefilm. Für Betriebe in Kiel und an der Lübecker Bucht.",
         body, "/leistungen", ld=ld)


def build_branchen():
    body = page_head("Branchen", "Jede Branche<br><em>hat Geschichten.</em>",
                     "Wo Menschen arbeiten, gibt es Situationen, die andere wiedererkennen. Genau daraus machen wir Videos. Vier Branchen zeigen wir euch mit echten Referenzen, für alle anderen finden wir das passende Format.",
                     crumbs=[("/", "Start"), ("/branchen", "Branchen")]) + f"""
<section class="sec-sm" data-scene="SZENE 02 · REFERENZBRANCHEN"><div class="wrap">
  <div class="bcards">{bcard('gastronomie', 1, wide=True)}{bcard('immobilien', 2, wide=True)}{bcard('handwerk', 1, wide=True)}{bcard('unternehmen', 2, wide=True)}</div>
</div></section>
<section class="sec" data-scene="SZENE 03 · AUCH FÜR EUCH"><div class="wrap">
  {sec_head("03", "Auch für euch", "Nicht dabei?<br><em>Kein Problem.</em>", "Unsere Arbeitsweise funktioniert in jeder Branche, weil sie bei Menschen ansetzt und nicht bei Produkten. Ein paar Beispiele:")}
  <div class="region rv">{''.join(f'<span>{x}</span>' for x in ["Einzelhandel", "Hotels und Ferienwohnungen", "Fitness", "Friseure und Kosmetik", "Autohäuser", "Events", "Vereine", "Dienstleister"])}</div>
  <div class="btn-row rv" style="margin-top:2.4rem"><a class="btn" href="/anfrage?branche=andere">Eure Branche anfragen</a></div>
</div></section>
{offer(scene="04")}
{cta_band()}"""
    page("/branchen", "Branchen: Gastro, Immobilien, Handwerk, Unternehmen | SCM Creatives",
         "Social Media Videos für Gastronomie, Immobilienmakler, Handwerk und Unternehmen in Kiel und an der Lübecker Bucht. Und für jede andere Branche mit Menschen und Geschichten.",
         body, "/branchen", ld=[crumbs_ld([("/", "Start"), ("/branchen", "Branchen")])])


def ref_tile(client_key, d=None):
    c = CLIENTS[client_key]
    dd = f' data-d="{d}"' if d else ""
    if c["reels"]:
        return reel_card(c["reels"][0], d)
    return f"""<article class="reel rv"{dd} data-branche="{c['branche']}"><a href="/referenzen/{client_key}">
      <div class="phone vf"><img src="/img/ki-platzhalter-weinbar-sm.webp" alt="" loading="lazy" width="608" height="760">
        <div class="phone-ui" aria-hidden="true"><div class="pu-top"><span>KI-Platzhalter</span><span>Video folgt</span></div><div class="pu-bot"><b>Die Drei</b><span>Gastronomie · Weinbar</span></div></div></div>
      <div class="reel-meta" style="margin-top:.9rem"><b>{c['name']}</b><span>Gastronomie · Video folgt</span></div></a></article>"""


def build_branche(key):
    b = BRANCHEN[key]
    pains = "".join(f'<li class="rv" data-d="{i+1}">{p}</li>' for i, p in enumerate(b["pains"]))
    fm = "".join(f"""<article class="format rv" data-d="{i % 4 + 1}"><span class="lbl">Format {i+1:02d}</span><h3>{t}</h3><p>{d}</p>
      <p class="hookline">Hook: {h}</p></article>""" for i, (t, d, h) in enumerate(b["formats"]))
    refs = "".join(ref_tile(c, i + 1) for i, c in enumerate(b["refs"]))
    body = page_head(b["name"], b["h1"], b["lead"], crumbs=[("/", "Start"), ("/branchen", "Branchen"), (f"/branchen/{key}", b["name"])],
                     media=f"ki-platzhalter-{b['img']}",
                     extra=f'<div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage?branche={key}">3 Testvideos für {b["short"]} anfragen</a><a class="btn btn-ghost" href="#formate">Formate ansehen</a></div>') + f"""
<section class="sec" data-scene="SZENE 02 · AUSGANGSLAGE"><div class="wrap"><div class="split2" style="align-items:start">
  <div class="stack">{lbl("Szene 02 · Kennt ihr das?")}<h2 class="d2 split">Das Problem ist<br><em>nicht euer Angebot.</em></h2></div>
  <ul class="pains">{pains}</ul>
</div></div></section>
<section class="sec panel" id="formate" data-scene="SZENE 03 · FORMATE"><div class="wrap">
  {sec_head("03", "Formate", f"Was bei {b['name']}<br><em>funktioniert.</em>", "Jedes Format hat einen festen Aufbau und lässt sich als Serie wiederholen. Die Hooks sind Beispiele, eure schreiben wir für euch.")}
  <div class="formats">{fm}</div>
</div></section>
<section class="sec" data-scene="SZENE 04 · REFERENZEN"><div class="wrap">
  {sec_head("04", "Referenzen", f"{b['name']} mit<br><em>SCM Creatives.</em>", None, ("/referenzen", "Alle Referenzen"))}
  <div class="reel-grid">{refs}</div>
</div></section>
<section class="sec panel" data-scene="SZENE 05 · ABLAUF"><div class="wrap">
  {sec_head("05", "Ablauf", "So läuft es<br><em>bei euch.</em>", None, ("/so-arbeiten-wir", "Ablauf im Detail"))}
  {drehplan(STEPS[:4])}
</div></section>
{offer(scene="06")}
<section class="sec" data-scene="SZENE 07 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head("07", "Fragen", f"Fragen aus<br><em>{b['name'].lower() if key != 'immobilien' else 'der Immobilienbranche'}.</em>")}
  {faq_block(b['faq'] + FAQ_CORE[:2])}
</div></section>
{cta_band(text=f"Erzählt uns kurz von eurem Betrieb. Die Branche {b['name']} ist schon ausgewählt.").replace('href="/anfrage"', f'href="/anfrage?branche={key}"')}"""
    ld = [crumbs_ld([("/", "Start"), ("/branchen", "Branchen"), (f"/branchen/{key}", b["name"])]),
          {"@context": "https://schema.org", "@type": "Service", "name": f"Social Media Videos für {b['name']}", "serviceType": "Social Media Videoproduktion",
           "provider": {"@type": "Organization", "name": "SCM Creatives", "url": BASE + "/"},
           "areaServed": [{"@type": "City", "name": "Kiel"}, {"@type": "Place", "name": "Lübecker Bucht"}],
           "audience": {"@type": "BusinessAudience", "name": b["name"]}, "description": b["lead"]}]
    titles = {"gastronomie": "Social Media Videos für Gastronomie in Kiel | SCM Creatives",
              "immobilien": "Social Media Videos für Immobilienmakler in Kiel | SCM Creatives",
              "handwerk": "Social Media und Recruiting Videos für Handwerker | SCM Creatives",
              "unternehmen": "Social Media Videos für Unternehmen in Kiel | SCM Creatives"}
    descs = {"gastronomie": "Reels für Restaurants, Bars und Mittagstische in Kiel und an der Lübecker Bucht: POV-Sketche, Aktionen, Küche von innen. Nach Skript, vor Ort gedreht.",
             "immobilien": "Videos für Immobilienmakler in Kiel: Ortsanalysen, Entweder-oder, Objekte mit Hook. Mehr Vertrauen bei Eigentümern und Käufern in der Region.",
             "handwerk": "Kurzvideos für Handwerksbetriebe: Kunden-Sketche, Azubi-Formate, Vorher und Nachher. Für mehr Aufträge und mehr Bewerbungen. Kiel und Lübecker Bucht.",
             "unternehmen": "Kurzvideos für Freizeitbetriebe, Dienstleister und Mittelstand: Angebote mit Frist, Events, Menschen im Unternehmen. Kiel und Lübecker Bucht."}
    page(f"/branchen/{key}", titles[key], descs[key], body, "/branchen", ld=ld)


def build_referenzen():
    order = ["maler-rohwer", "jan-hein-klaas-pit", "bs-entweder-oder", "das-kleine-steakhouse", "kletterwald-travemuende", "bs-ortsanalyse"]
    tiles = "".join(reel_card(s, (i % 4) + 1) for i, s in enumerate(order)) + ref_tile("die-drei", 3)
    filt = "".join(f'<button type="button" data-f="{k}" aria-pressed="{"true" if k == "alle" else "false"}">{n}</button>'
                   for k, n in [("alle", "Alle"), ("gastronomie", "Gastronomie"), ("immobilien", "Immobilien"), ("handwerk", "Handwerk"), ("unternehmen", "Unternehmen")])
    body = page_head("Referenzen", "Gedreht für echte<br><em>Betriebe.</em>",
                     "Aktuelle Videos für unsere Kunden in Kiel und an der Lübecker Bucht. Hinter jedem Video steht ein Skript. Tippt auf ein Video, um zu sehen, wie es aufgebaut ist.",
                     crumbs=[("/", "Start"), ("/referenzen", "Referenzen")]) + f"""
<section class="sec-sm" data-scene="SZENE 02 · VIDEOS"><div class="wrap">
  <div class="filter" role="group" aria-label="Nach Branche filtern">{filt}</div>
  <div class="reel-grid">{tiles}</div>
  <p class="q-note" style="margin-top:2rem">Ton aus, weil Videos ohne Ton starten. Auf den Referenzseiten könnt ihr den Ton einschalten.</p>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · KUNDEN"><div class="wrap">
  {sec_head("03", "Kunden", "Wer schon<br><em>mitspielt.</em>")}
  <div class="drehplan">{''.join(f'<a class="dp-row" href="/referenzen/{k}"><span class="dp-no">{i+1:02d}</span><h3>{c["name"]}</h3><p>{BRANCHEN[c["branche"]]["name"]}{" · " + c["ort"] if c["ort"] else ""}</p><p class="dp-eff"><small>Ansehen</small>{len(c["reels"]) or "Folgt"} {"Video" if len(c["reels"]) == 1 else "Videos" if c["reels"] else ""}</p></a>' for i, (k, c) in enumerate(CLIENTS.items()))}</div>
</div></section>
{offer(scene="04")}
{cta_band()}"""
    page("/referenzen", "Referenzen: Social Media Videos aus Kiel | SCM Creatives",
         "Videos für BS Immobiliengruppe, Maler Rohwer, Jan & Hein & Klaas & Pit, Das kleine Steakhouse und Kletterwald Travemünde. Mit Aufbau und Skript-Logik.",
         body, "/referenzen", ld=[crumbs_ld([("/", "Start"), ("/referenzen", "Referenzen")])])


def build_case(key):
    c = CLIENTS[key]
    crumbs = [("/", "Start"), ("/referenzen", "Referenzen"), (f"/referenzen/{key}", c["name"])]
    keys = list(CLIENTS.keys())
    i = keys.index(key)
    prev_k, next_k = keys[i - 1], keys[(i + 1) % len(keys)]
    nav = f"""<div class="case-nav"><a class="btn-link" href="/referenzen/{prev_k}">Vorherige: {CLIENTS[prev_k]['name']}</a><a class="btn-link" href="/referenzen/{next_k}">Nächste: {CLIENTS[next_k]['name']} {ARROW}</a></div>"""
    if not c["reels"]:
        body = page_head("Referenz", "Weinbar<br><em>Die Drei.</em>", c["intro"], crumbs=crumbs, media="ki-platzhalter-weinbar") + f"""
<section class="sec" data-scene="SZENE 02 · VIDEO FOLGT"><div class="wrap wrap--narrow"><div class="stack">
  {lbl("Szene 02 · In Produktion", True)}<h2 class="d2">Video folgt.</h2>
  <p class="lead">{ph("Videos, Format und Kundenstimme der Weinbar Die Drei, Instagram-Profil")}</p>
  <a class="btn" href="/referenzen">Alle Referenzen</a>{nav}
</div></div></section>{cta_band()}"""
        page(f"/referenzen/{key}", "Weinbar Die Drei, Kiel | Referenz | SCM Creatives",
             "Referenz von SCM Creatives: Weinbar Die Drei in Kiel. Videos folgen in Kürze.", body, "/referenzen",
             ld=[crumbs_ld(crumbs)], noindex=True)
        return
    main = REELS[c["reels"][0]]
    b = BRANCHEN[c["branche"]]
    sections = ""
    lds = [crumbs_ld(crumbs)]
    for n, slug in enumerate(c["reels"]):
        r = REELS[slug]
        beats = "".join(f'<li><span class="tc">{t}</span><b>{l}</b><p>{x}</p></li>' for t, l, x in r["beats"])
        facts = [("Kunde", r["kunde"]), ("Branche", b["name"]), ("Format", r["format"]), ("Länge", f"{r['dauer']} Sekunden"),
                 ("Veröffentlicht", ".".join(reversed(r["upload"].split("-")))), ("Ort", c["ort"] or ph("Ort"))]
        fx = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in facts)
        stat = ""
        if r["stats"]:
            stat = f"""<div class="facts" style="margin:2rem 0"><div class="fact"><strong>{r['stats'][0]}</strong><span>Likes</span></div>
              <div class="fact"><strong>{r['stats'][1]}</strong><span>Kommentare</span></div></div><p class="q-note">Instagram, Stand 21.10.2026.</p>"""
        sections += f"""
<section class="sec{' panel' if n % 2 else ''}" data-scene="SZENE {n+2:02d} · {r['format'].upper()}"><div class="wrap">
  <div class="case-grid">
    <div class="case-video">{phone(slug, kind='full', sound=True, label=False)}
      <p class="q-note" style="margin-top:1rem"><a href="{r['ig']}" target="_blank" rel="noopener">Original auf Instagram ansehen</a></p></div>
    <div>
      {lbl(f"Szene {n+2:02d} · {r['format']}")}
      <h2 class="d2 split" style="margin:.9rem 0 1.6rem">{r['titel']}</h2>
      <dl class="case-facts">{fx}</dl>
      <h3 style="margin-bottom:1rem">So ist das Video aufgebaut</h3>
      <ol class="beats">{beats}</ol>
      {stat}
      <div class="quote" style="margin-top:2.4rem"><p>{ph("Kundenstimme " + c['name'])}</p><cite>{c['name']}</cite></div>
    </div>
  </div></div></section>"""
        lds.append({"@context": "https://schema.org", "@type": "VideoObject", "name": f"{r['kunde']}: {r['format']}",
                    "description": f"{r['format']} für {r['kunde']} ({b['name']}), produziert von SCM Creatives. Hook: {r['hook']}",
                    "thumbnailUrl": [f"{BASE}/media/{slug}.jpg"], "uploadDate": r["upload"] + "T12:00:00+02:00",
                    "duration": f"PT{r['dauer']}S", "contentUrl": f"{BASE}/media/{slug}.mp4",
                    "publisher": {"@type": "Organization", "name": "SCM Creatives", "logo": {"@type": "ImageObject", "url": f"{BASE}/img/logo-dark.png"}}})
    ig = f'<a class="btn btn-ghost" href="{c["ig"]}" target="_blank" rel="noopener">{c["name"]} auf Instagram</a>' if c["ig"] else ""
    body = f"""<section class="page-head" data-scene="SZENE 01 · {c['name'].upper()}"><div class="wrap">
  <nav class="crumbs" aria-label="Brotkrumen"><a href="/">Start</a><span aria-hidden="true">/</span><a href="/referenzen">Referenzen</a><span aria-hidden="true">/</span><span aria-current="page">{c['name']}</span></nav>
  {lbl(f"Referenz · {b['name']}", True)}
  <h1 class="d1 split" data-split="chars">{c['name']}</h1>
  <p class="lead rv" data-d="1">{c['intro']}</p>
  <div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage?branche={c['branche']}">So ein Video für euch</a>{ig}</div>
</div></section>{sections}
<section class="sec-sm"><div class="wrap">{nav}</div></section>
{cta_band()}"""
    page(f"/referenzen/{key}", f"{c['name']}: {main['format']} | Referenz | SCM Creatives",
         f"So haben wir für {c['name']} Social Media Videos umgesetzt: {', '.join(REELS[s]['format'] for s in c['reels'])}. Mit Aufbau, Hook und Skript-Logik.",
         body, "/referenzen", ld=lds, og=f"/media/{c['reels'][0]}.jpg")


def build_ablauf():
    beats = [("Hook", "Die ersten zwei Sekunden. Eine Frage, ein Zitat oder ein POV als Text im Bild."),
             ("Wiedererkennen", "Eine Situation, die eure Zielgruppe sofort kennt."),
             ("Steigerung", "Zwei, drei Schritte, die Spannung aufbauen. Ohne Umweg."),
             ("Pointe", "Der Moment, für den man teilt. Oder die eine Info, die bleibt."),
             ("Aufruf", "Kommentieren, markieren, vorbeikommen. Eine klare Aufgabe zum Schluss.")]
    bp = "".join(f'<div class="dp-row"><span class="dp-no">{i+1:02d}</span><h3>{t}</h3><p>{x}</p><p class="dp-eff"><small>Ziel</small>{["Stoppen", "Bleiben", "Dranbleiben", "Teilen", "Handeln"][i]}</p></div>' for i, (t, x) in enumerate(beats))
    need = [("Ein Ansprechpartner", "Eine Person, die Skripte freigibt und den Drehtermin koordiniert."),
            ("Ein Drehort", "Euer Laden, euer Büro, eure Baustelle. Dort, wo eure Geschichte passiert."),
            ("Etwas Mut", "Ihr müsst nicht lustig sein. Aber offen dafür, euch zu zeigen.")]
    nd = "".join(f'<article class="svc-item rv" data-d="{i+1}"><span class="lbl">Brauchen wir {i+1:02d}</span><h3>{t}</h3><p>{x}</p></article>' for i, (t, x) in enumerate(need))
    body = page_head("Ablauf", "So arbeiten<br><em>wir.</em>",
                     "Erst das Skript, dann die Kamera. Unser Ablauf ist so gebaut, dass ihr wenig Zeit investiert und trotzdem bei jedem Schritt mitentscheidet.",
                     crumbs=[("/", "Start"), ("/so-arbeiten-wir", "So arbeiten wir")], media="ki-platzhalter-gastro-dreh", video="ki-platzhalter-gastro-dreh") + f"""
<section class="sec" data-scene="SZENE 02 · DREHPLAN"><div class="wrap">
  {sec_head("02", "Der Drehplan", "Sechs Schritte.<br><em>Ein klarer Plan.</em>")}
  {drehplan()}
</div></section>
{skript_section().replace('Szene 03 · Das Skript', 'Szene 03 · Der Skript-Aufbau')}
<section class="sec panel" data-scene="SZENE 04 · BAUPLAN"><div class="wrap">
  {sec_head("04", "Bauplan", "Fünf Bausteine<br><em>in jedem Video.</em>", "Egal ob Sketch, Ortsanalyse oder Angebot: Diese fünf Bausteine finden sich in unseren Videos wieder. Mal in 13 Sekunden, mal in 45.")}
  <div class="drehplan">{bp}</div>
</div></section>
<section class="sec" data-scene="SZENE 05 · WAS WIR BRAUCHEN"><div class="wrap">
  {sec_head("05", "Von euch", "Was wir<br><em>von euch brauchen.</em>")}
  <div class="svc" style="grid-template-columns:repeat(3,1fr)">{nd}</div>
</div></section>
{offer(scene="06")}
<section class="sec panel" data-scene="SZENE 07 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head("07", "Fragen", "Fragen zum<br><em>Ablauf.</em>")}
  {faq_block([FAQ_CORE[3], FAQ_CORE[2], FAQ_MORE[2], FAQ_MORE[4]])}
</div></section>
{cta_band()}"""
    page("/so-arbeiten-wir", "So arbeiten wir: Vom Skript zum Video | SCM Creatives",
         "Erstgespräch, Skript, Dreh vor Ort, Schnitt, Veröffentlichung, Auswertung. So entstehen Social Media Videos bei SCM Creatives, mit wenig Aufwand für euch.",
         body, "/so-arbeiten-wir", ld=[crumbs_ld([("/", "Start"), ("/so-arbeiten-wir", "So arbeiten wir")])])


def build_pakete():
    addons = [("Posting und Community", "Veröffentlichung, Captions, Hashtags, Kommentare."),
              ("Werbeanzeigen", "Eure Videos als Anzeigen in der Region."),
              ("Recruiting-Videos", "Formate für Mitarbeitende und Azubis."),
              ("Fotos und Imagefilm", "Fotos vom Drehtag oder ein längerer Film.")]
    ad = "".join(f'<div class="dp-row"><span class="dp-no">+</span><h3>{t}</h3><p>{x}</p><p class="dp-eff"><small>Buchbar</small>zu jedem Paket</p></div>' for t, x in addons)
    body = page_head("Pakete", "Drei Pakete.<br><em>Ein Prinzip.</em>",
                     "Alle Pakete enthalten Skript, Dreh und Schnitt. Der Unterschied ist die Anzahl der Videos im Monat. Den Preis rechnen wir nach eurem Umfang aus, nach dem Erstgespräch und den kostenlosen Testvideos.",
                     crumbs=[("/", "Start"), ("/pakete", "Pakete")]) + f"""
<section class="sec-sm" data-scene="SZENE 02 · PAKETE"><div class="wrap">{packs()}
  <p class="q-note rv" style="margin-top:1.4rem">Preise nennen wir im Angebot, nachdem wir euren Umfang kennen. {ph("Laufzeit und Konditionen")}</p></div></section>
<section class="sec panel" data-scene="SZENE 03 · EXTRAS"><div class="wrap">
  {sec_head("03", "Dazubuchen", "Mehr als<br><em>nur Videos.</em>", None, ("/leistungen", "Alle Leistungen"))}
  <div class="drehplan">{ad}</div>
</div></section>
{offer(scene="04")}
<section class="sec" data-scene="SZENE 05 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head("05", "Fragen", "Fragen zu<br><em>den Paketen.</em>")}
  {faq_block([FAQ_CORE[0], FAQ_CORE[1], FAQ_MORE[0], FAQ_MORE[1]])}
</div></section>
{cta_band()}"""
    page("/pakete", "Pakete: 4, 8 oder 12 Videos im Monat | SCM Creatives",
         "Drei Pakete mit Skript, Dreh vor Ort und Schnitt: 4, 8 oder 12 Social Media Videos im Monat. Start mit 3 kostenlosen Testvideos. Kiel und Lübecker Bucht.",
         body, "/pakete", ld=[crumbs_ld([("/", "Start"), ("/pakete", "Pakete")])])


def build_testvideos():
    steps = [("01", "Anfrage", "Ihr füllt die kurze Anfrage aus oder schreibt uns per WhatsApp.", "Zwei Minuten"),
             ("02", "Kennenlernen", "Wir sprechen über euren Betrieb, eure Zielgruppe und eure Ziele.", "Ein Gespräch"),
             ("03", "Skripte und Dreh", "Wir schreiben drei Skripte und drehen bei euch vor Ort.", "Ein Termin bei euch"),
             ("04", "3 fertige Videos", "Ihr bekommt drei geschnittene Videos und seht, wie es werden kann.", "Ansehen"),
             ("05", "Entscheidung", "Gefällt es euch, geht es mit einem Paket weiter. Wenn nicht, kostet es euch nichts.", "Ja oder Nein")]
    body = page_head("Das Angebot", "3 Testvideos.<br><em>Kostenlos.</em>",
                     "Bevor ihr euch für ein Paket entscheidet, zeigen wir euch, wie es werden kann. Drei echte Videos, mit euren Leuten, an eurem Ort, nach unserem Skript.",
                     crumbs=[("/", "Start"), ("/testvideos", "3 Testvideos")], media="ki-platzhalter-kiel-foerde", video="ki-platzhalter-kiel-foerde",
                     extra='<div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage">Jetzt Testvideos anfragen</a><a class="btn btn-ghost" href="/referenzen">Beispiele ansehen</a></div>') + f"""
<section class="sec" data-scene="SZENE 02 · SO GEHT ES"><div class="wrap">
  {sec_head("02", "So geht es", "In fünf Schritten<br><em>zu euren Testvideos.</em>")}
  {drehplan(steps)}
</div></section>
<section class="sec panel" data-scene="SZENE 03 · BEISPIELE">
  <div class="wrap">{sec_head("03", "Beispiele", "So könnten<br><em>eure aussehen.</em>", None, ("/referenzen", "Alle Referenzen"))}</div>
  <div class="reels rv" tabindex="0" aria-label="Beispielvideos, seitlich scrollbar">{''.join(reel_card(s, rv=False) for i, s in enumerate(["maler-rohwer", "das-kleine-steakhouse", "bs-entweder-oder", "kletterwald-travemuende", "jan-hein-klaas-pit"]))}</div>
</section>
<section class="sec" data-scene="SZENE 04 · DANACH"><div class="wrap">
  {sec_head("04", "Danach", "Weiter mit<br><em>einem Paket.</em>", "Wenn euch die Testvideos überzeugen, geht es mit 4, 8 oder 12 Videos im Monat weiter.", ("/pakete", "Pakete ansehen"))}
  {packs(compact=True)}
</div></section>
<section class="sec panel" data-scene="SZENE 05 · FRAGEN"><div class="wrap wrap--narrow">
  {sec_head("05", "Fragen", "Fragen zu<br><em>den Testvideos.</em>")}
  {faq_block([FAQ_CORE[1], ("Kostet das wirklich nichts?", "Ja. Die 3 Testvideos sind kostenlos. Erst wenn ihr weitermachen wollt, schließen wir einen Vertrag."), ("Dürfen wir die Testvideos nutzen?", ph("Regelung zur Nutzung der Testvideos")), FAQ_CORE[4]])}
</div></section>
{cta_band()}"""
    page("/testvideos", "3 kostenlose Testvideos | SCM Creatives Kiel",
         "Drei echte Social Media Videos kostenlos: Wir schreiben die Skripte, drehen bei euch in Kiel oder an der Lübecker Bucht und ihr entscheidet danach.",
         body, "/testvideos", ld=[crumbs_ld([("/", "Start"), ("/testvideos", "3 Testvideos")])])


def build_vision():
    vals = [("01", "Echte Menschen vor der Kamera.", "Eure Leute, euer Laden, eure Sprache. Niemand vertraut einem Stockfoto. Aber jeder erkennt seinen Lieblingskellner wieder."),
            ("02", "Ein Skript vor jedem Dreh.", "Gute Videos sind kein Glück. Sie haben einen Hook, eine Situation, eine Steigerung und ein Ende. Das schreiben wir, bevor die Kamera läuft."),
            ("03", "Unterhaltung, die verkauft.", "Erst schauen die Leute zu, dann kommen sie vorbei. Wir machen keine Werbespots, sondern Videos, die man freiwillig anschaut."),
            ("04", "Nah dran.", "Kiel und die Lübecker Bucht sind unser Drehort. Wir kennen die Region, ihre Betriebe und ihren Humor.")]
    v = "".join(f'<div class="dp-row"><span class="dp-no">{n}</span><h3>{t}</h3><p style="grid-column:span 2">{x}</p></div>' for n, t, x in vals)
    body = page_head("Vision", "Videos, die nach<br><em>euch klingen.</em>",
                     "Social Media muss sich nicht wie Werbung anfühlen. Wir glauben an Videos mit echten Menschen, einem klaren Plan und einer Prise Humor.",
                     crumbs=[("/", "Start"), ("/vision", "Vision")], media="ki-platzhalter-luebecker-bucht") + f"""
<section class="sec" data-scene="SZENE 02 · HALTUNG"><div class="wrap">
  {lbl("Szene 02 · Unsere Haltung")}
  <p class="say" data-say style="margin-top:1.6rem">Jeder Betrieb in der Region hat Geschichten, die erzählt werden wollen. <em>Wir sorgen dafür, dass man sie zu Ende schaut.</em></p>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · WOFÜR WIR STEHEN"><div class="wrap">
  {sec_head("03", "Wofür wir stehen", "Vier Sätze,<br><em>die für jeden Dreh gelten.</em>")}
  <div class="drehplan">{v}</div>
</div></section>
<section class="sec" data-scene="SZENE 04 · ZIEL"><div class="wrap"><div class="split2">
  <div class="stack">{lbl("Szene 04 · Unser Ziel")}<h2 class="d2 split">Mehr Betriebe,<br><em>die man kennt.</em></h2>
    <p class="lead rv">Unser Ziel ist eine Region, in der kleine und mittlere Betriebe online genauso sichtbar sind wie die großen Ketten. Mit Videos, auf die sie stolz sind.</p>
    <a class="btn rv" href="/ueber-uns">Wer wir sind</a></div>
  <div class="media-box tall rv-img"><img src="/img/ki-platzhalter-skript-sm.webp" alt="" loading="lazy" width="760" height="424"><span class="ki-tag">KI-Platzhalter</span></div>
</div></div></section>
{cta_band()}"""
    page("/vision", "Vision: Videos, die nach euch klingen | SCM Creatives",
         "Echte Menschen, ein Skript vor jedem Dreh, Unterhaltung statt Werbespot. Die Haltung hinter SCM Creatives, der Social Media Agentur für Kiel und die Lübecker Bucht.",
         body, "/vision", ld=[crumbs_ld([("/", "Start"), ("/vision", "Vision")])])


def build_ueber():
    team = "".join(f"""<article class="member rv" data-d="{i+1}"><div class="portrait">{ph(f"Foto Teammitglied {i+1}")}</div>
      <h3>{ph("Name")}</h3><p class="lbl">{ph("Rolle, z. B. Skript, Kamera, Schnitt")}</p></article>""" for i in range(3))
    body = page_head("Über uns", "Wer hinter<br><em>der Kamera steht.</em>",
                     "SCM Creatives ist eine Social Media Agentur für Kiel und die Lübecker Bucht. Wir schreiben, drehen und schneiden Kurzvideos für Betriebe aus der Region.",
                     crumbs=[("/", "Start"), ("/ueber-uns", "Über uns")], media="ki-platzhalter-kiel-foerde") + f"""
<section class="sec" data-scene="SZENE 02 · TEAM"><div class="wrap">
  {sec_head("02", "Das Team", "Skript, Kamera,<br><em>Schnitt.</em>", ph("Kurzvorstellung des Teams, Gründungsjahr, Bedeutung von SCM"))}
  <div class="team">{team}</div>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · REGION"><div class="wrap">
  {sec_head("03", "Unsere Region", "Wir kommen<br><em>zu euch.</em>", "Kein Studio, kein Kundenbüro: Wir drehen dort, wo eure Geschichte passiert. In Kiel und an der Lübecker Bucht.")}
  <div class="region rv"><span class="main">Kiel</span><span>Lübecker Bucht</span><span>Lübeck</span><span>Travemünde</span><span>Timmendorfer Strand</span><span>Scharbeutz</span><span>Neustadt in Holstein</span></div>
</div></section>
<section class="sec" data-scene="SZENE 04 · ARBEITSWEISE"><div class="wrap"><div class="split2">
  <div class="media-box rv-img"><img src="/img/ki-platzhalter-schnitt-sm.webp" alt="" loading="lazy" width="760" height="424"><span class="ki-tag">KI-Platzhalter</span></div>
  <div class="stack">{lbl("Szene 04 · Arbeitsweise")}<h2 class="d2 split">Erst das Skript,<br><em>dann die Kamera.</em></h2>
    <p class="lead rv">Jedes Video beginnt mit einem Plan. Das spart euch Zeit beim Dreh und sorgt dafür, dass die Videos zu Ende geschaut werden.</p>
    <a class="btn-link rv" href="/so-arbeiten-wir">So arbeiten wir {ARROW}</a></div>
</div></div></section>
{cta_band()}"""
    page("/ueber-uns", "Über uns: Social Media Agentur aus Kiel | SCM Creatives",
         "SCM Creatives schreibt, dreht und schneidet Kurzvideos für Betriebe in Kiel und an der Lübecker Bucht. Wir kommen zu euch, kein Studio, kein Kundenbüro.",
         body, "/ueber-uns", ld=[crumbs_ld([("/", "Start"), ("/ueber-uns", "Über uns")])])


def build_faq():
    groups = [("Allgemein", [FAQ_CORE[5], FAQ_CORE[4], FAQ_MORE[3]]),
              ("Ablauf", [FAQ_CORE[3], FAQ_CORE[2], FAQ_MORE[2], FAQ_MORE[4]]),
              ("Kosten und Pakete", [FAQ_CORE[0], FAQ_CORE[1], FAQ_MORE[5]]),
              ("Zusatzleistungen", [FAQ_MORE[0], FAQ_MORE[1]])]
    sec = "".join(f"""<section class="sec-sm{' panel' if i % 2 else ''}" data-scene="SZENE {i+2:02d} · {g.upper()}"><div class="wrap wrap--narrow">
      {lbl(f"Szene {i+2:02d} · {g}")}<h2 class="d2" style="margin:1rem 0 2rem">{g}</h2>{faq_block(items, open_first=False)}</div></section>""" for i, (g, items) in enumerate(groups))
    body = page_head("FAQ", "Fragen und<br><em>Antworten.</em>", "Alles, was ihr vor dem ersten Gespräch wissen wollt. Eure Frage ist nicht dabei? Schreibt uns einfach.",
                     crumbs=[("/", "Start"), ("/faq", "FAQ")]) + sec + cta_band()
    page("/faq", "FAQ: Fragen zu Social Media Videos | SCM Creatives",
         "Was kosten Social Media Videos? Müssen wir vor die Kamera? Wie läuft der Dreh? Antworten zu Ablauf, Paketen, Testvideos und Region.",
         body, "/faq", ld=[crumbs_ld([("/", "Start"), ("/faq", "FAQ")])])


def build_kontakt():
    tel_txt = TEL or ph("Telefonnummer")
    wa_txt = "Nachricht schreiben" if WHATSAPP else ph("WhatsApp-Nummer")
    mail_txt = MAIL or ph("E-Mail-Adresse")
    body = page_head("Kontakt", "Lasst uns<br><em>drehen.</em>",
                     "Der schnellste Weg zu euren 3 Testvideos ist die kurze Anfrage. Lieber direkt? Dann schreibt uns oder ruft an.",
                     crumbs=[("/", "Start"), ("/kontakt", "Kontakt")],
                     extra='<div class="btn-row rv" data-d="2"><a class="btn" href="/anfrage">Anfrage starten, 2 Minuten</a></div>') + f"""
<section class="sec-sm" data-scene="SZENE 02 · KONTAKTWEGE"><div class="wrap">
  <div class="ways">
    <a class="way rv" id="whatsapp" href="{wa_href()}"{ext(wa_href())}>{I_WA}<b>WhatsApp</b><p>{wa_txt}</p></a>
    <a class="way rv" data-d="1" id="telefon" href="{tel_href()}">{I_TEL}<b>Anrufen</b><p>{tel_txt}</p></a>
    <a class="way rv" data-d="2" id="mail" href="{mail_href()}">{I_MAIL}<b>E-Mail</b><p>{mail_txt}</p></a>
    <a class="way rv" data-d="3" href="{IG}" target="_blank" rel="noopener">{I_IG}<b>Instagram</b><p>@scm.creatives</p></a>
  </div>
</div></section>
<section class="sec panel" data-scene="SZENE 03 · EINSATZGEBIET"><div class="wrap">
  {sec_head("03", "Einsatzgebiet", "Kiel und<br><em>Lübecker Bucht.</em>", "Wir haben kein Kundenbüro, sondern kommen zu euch: in den Laden, ins Restaurant, ins Büro oder auf die Baustelle.")}
  <div class="region rv"><span class="main">Kiel</span><span>Lübecker Bucht</span><span>Lübeck</span><span>Travemünde</span><span>Timmendorfer Strand</span><span>Scharbeutz</span><span>Neustadt in Holstein</span></div>
</div></section>
{cta_band()}"""
    page("/kontakt", "Kontakt: Social Media Agentur Kiel | SCM Creatives",
         "Kontakt zu SCM Creatives: Anfrage in 2 Minuten, WhatsApp, Telefon oder E-Mail. Wir drehen in Kiel und an der Lübecker Bucht, direkt bei euch vor Ort.",
         body, "/kontakt", ld=[crumbs_ld([("/", "Start"), ("/kontakt", "Kontakt")])])


def opt(name, value, label, small="", kind="radio"):
    s = f"<small>{small}</small>" if small else ""
    return f'<label class="opt"><input type="{kind}" name="{name}" value="{value}"><span>{label}{s}</span></label>'


def build_anfrage():
    b_opts = "".join(opt("branche", k, BRANCHEN[k]["name"]) for k in BRANCHEN) + opt("branche", "andere", "Andere Branche", "Erzählt es uns im letzten Schritt")
    z_opts = (opt("ziel", "gaeste", "Mehr Gäste oder Kunden") + opt("ziel", "anfragen", "Mehr Anfragen") +
              opt("ziel", "mitarbeiter", "Mitarbeitende finden") + opt("ziel", "bekanntheit", "Bekannter werden in der Region"))
    p_opts = (opt("paket", "4", "4 Videos im Monat", "Starter") + opt("paket", "8", "8 Videos im Monat", "Wachstum") +
              opt("paket", "12", "12 Videos im Monat", "Pro") + opt("paket", "offen", "Weiß ich noch nicht", "Wir beraten euch"))
    x_opts = (opt("extras", "posting", "Posting und Community", kind="checkbox") + opt("extras", "ads", "Werbeanzeigen", kind="checkbox") +
              opt("extras", "recruiting", "Recruiting-Videos", kind="checkbox") + opt("extras", "fotos", "Fotos oder Imagefilm", kind="checkbox"))
    s_opts = (opt("start", "sofort", "So bald wie möglich") + opt("start", "1-3", "In 1 bis 3 Monaten") + opt("start", "spaeter", "Später, erst mal informieren"))
    body = f"""<section class="page-head" data-scene="SZENE 01 · ANFRAGE"><div class="wrap">
  <nav class="crumbs" aria-label="Brotkrumen"><a href="/">Start</a><span aria-hidden="true">/</span><span aria-current="page">Anfrage</span></nav>
  {lbl("Szene 01 · Eure Anfrage", True)}
  <h1 class="d1 split" data-split="chars">3 Testvideos<br><em>anfragen.</em></h1>
  <p class="lead rv" data-d="1">Fünf kurze Fragen, etwa zwei Minuten. Danach melden wir uns mit einem Vorschlag für eure Testvideos.</p>
</div></section>
<section class="sec-sm" data-scene="SZENE 02 · FRAGEN"><div class="wrap">
<form class="quiz" action="/api/anfrage" method="post" novalidate>
  <div class="q-progress" aria-hidden="true"><span class="q-count">Schritt 1 von 5</span><span class="q-bar"><i></i></span></div>
  <fieldset class="q-step" data-req="branche" data-auto><legend><small>Frage 1 von 5</small>In welcher Branche seid ihr?</legend><div class="opts">{b_opts}</div></fieldset>
  <fieldset class="q-step" data-req="ziel" data-auto><legend><small>Frage 2 von 5</small>Was sollen die Videos bringen?</legend><div class="opts">{z_opts}</div></fieldset>
  <fieldset class="q-step" data-req="paket"><legend><small>Frage 3 von 5</small>Wie viele Videos stellt ihr euch vor?</legend><div class="opts">{p_opts}</div>
    <p class="lbl" style="margin-top:.6rem">Zusätzlich interessant (optional)</p><div class="opts">{x_opts}</div></fieldset>
  <fieldset class="q-step" data-req="start"><legend><small>Frage 4 von 5</small>Wann soll es losgehen?</legend><div class="opts">{s_opts}</div>
    <div class="fields" style="margin-top:.6rem"><div class="field full"><label for="ort">Ort eures Betriebs (optional)</label><input id="ort" name="ort" type="text" autocomplete="address-level2" placeholder="z. B. Kiel, Lübeck, Scharbeutz"></div></div></fieldset>
  <fieldset class="q-step"><legend><small>Frage 5 von 5</small>Wie erreichen wir euch?</legend>
    <div class="fields">
      <div class="field" data-check="req"><label for="name">Name *</label><input id="name" name="name" type="text" autocomplete="name" required><span class="err">Bitte gebt euren Namen an.</span></div>
      <div class="field"><label for="betrieb">Betrieb</label><input id="betrieb" name="betrieb" type="text" autocomplete="organization"></div>
      <div class="field" data-check="contact"><label for="telefon">Telefon oder WhatsApp</label><input id="telefon" name="telefon" type="tel" autocomplete="tel" inputmode="tel"><span class="err">Bitte Telefon oder E-Mail angeben.</span></div>
      <div class="field"><label for="email">E-Mail</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email"></div>
      <div class="field full"><label for="nachricht">Was sollen wir noch wissen? (optional)</label><textarea id="nachricht" name="nachricht" rows="4"></textarea></div>
    </div>
    <div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <input type="hidden" name="t" value="0">
    <p class="q-note">Mit dem Absenden werden eure Angaben per E-Mail an SCM Creatives übermittelt, damit wir eure Anfrage beantworten können. Mehr dazu in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>
  </fieldset>
  <div class="q-nav">
    <button class="btn btn-ghost" type="button" data-q="back">Zurück</button>
    <button class="btn" type="button" data-q="next">Weiter</button>
    <button class="btn" type="submit" data-q="send"><span>3 Testvideos anfragen</span></button>
  </div>
  <div class="q-msg" role="alert"><p><strong>Das hat leider nicht geklappt.</strong> Schreibt uns direkt per <a href="{wa_href()}"{ext(wa_href())}>WhatsApp</a> oder <a href="{mail_href()}">E-Mail</a>, dann melden wir uns sofort.</p></div>
</form>
</div></section>"""
    page("/anfrage", "Anfrage: 3 kostenlose Testvideos | SCM Creatives",
         "In fünf kurzen Fragen zu euren 3 kostenlosen Testvideos. Für Betriebe in Kiel und an der Lübecker Bucht. Dauert etwa zwei Minuten.",
         body, "/anfrage")


def build_danke():
    body = f"""<section class="page-head" data-scene="SZENE 01 · DANKE"><div class="wrap">
  {lbl("Szene 01 · Gesendet", True)}
  <h1 class="d1 split" data-split="chars">Danke.<br><em>Klappe, die erste.</em></h1>
  <p class="lead rv" data-d="1">Eure Anfrage ist bei uns angekommen. Wir melden uns so schnell wie möglich mit einem Vorschlag für eure 3 Testvideos.</p>
  <div class="btn-row rv" data-d="2"><a class="btn" href="{wa_href()}"{ext(wa_href())}>Direkt per WhatsApp schreiben</a><a class="btn btn-ghost" href="/referenzen">Referenzen ansehen</a></div>
</div></section>
<section class="sec-sm"><div class="wrap">
  {sec_head(None, "Wie es weitergeht", "Die nächsten<br><em>Szenen.</em>")}
  {drehplan([("01", "Wir melden uns", "Per Telefon, WhatsApp oder E-Mail, so wie ihr es angegeben habt.", "Abnehmen"), ("02", "Kennenlernen", "Ein Gespräch über euren Betrieb und eure Ziele.", "Ein Gespräch"), ("03", "3 Testvideos", "Skripte, Dreh bei euch, Schnitt. Kostenlos.", "Ein Termin")])}
</div></section>"""
    page("/danke", "Danke für eure Anfrage | SCM Creatives", "Eure Anfrage ist angekommen. Wir melden uns mit einem Vorschlag für eure 3 Testvideos.",
         body, "", noindex=True)


def build_404():
    body = f"""<section class="page-head" style="min-height:80svh;display:grid;align-items:center" data-scene="SZENE 404"><div class="wrap">
  {lbl("Szene 404 · Rausgeschnitten", True)}
  <h1 class="d1">Diese Szene<br><em>wurde geschnitten.</em></h1>
  <p class="lead">Die Seite gibt es nicht oder nicht mehr. Kein Problem, der Film geht weiter.</p>
  <div class="btn-row"><a class="btn" href="/">Zur Startseite</a><a class="btn btn-ghost" href="/referenzen">Referenzen ansehen</a></div>
</div></section>"""
    page("/404", "Seite nicht gefunden | SCM Creatives", "Diese Seite gibt es nicht.", body, "", noindex=True)


def build_legal():
    imp = f"""<section class="sec-sm"><div class="wrap"><div class="prose">
<h2>Angaben gemäß § 5 DDG</h2>
<p>SCM Creatives<br>{ph("Rechtsform, z. B. GbR, Einzelunternehmen, UG")}<br>{ph("Vor- und Nachname der Inhaber oder Geschäftsführer")}<br>{ph("Straße und Hausnummer")}<br>{ph("PLZ und Ort")}</p>
<h2>Kontakt</h2>
<p>Telefon: {TEL or ph("Telefonnummer")}<br>E-Mail: {MAIL or ph("E-Mail-Adresse")}</p>
<h2>Umsatzsteuer</h2>
<p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: {ph("USt-IdNr. oder Hinweis auf Kleinunternehmerregelung")}</p>
<h2>Registereintrag</h2>
<p>{ph("Handelsregister und Registernummer, falls vorhanden")}</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>{ph("Name und Anschrift der verantwortlichen Person")}</p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung für Links</h2>
<p>Unsere Website enthält Links zu externen Websites Dritter, zum Beispiel zu Instagram. Auf deren Inhalte haben wir keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.</p>
<h2>Bildnachweise</h2>
<p>Videos und Standbilder der Referenzen: SCM Creatives für die jeweiligen Kunden, mit deren Freigabe. Einzelne Hintergrundbilder sind als „KI-Platzhalter“ gekennzeichnet und werden durch eigene Aufnahmen ersetzt.</p>
</div></div></section>"""
    page("/impressum", "Impressum | SCM Creatives", "Impressum von SCM Creatives, Social Media Agentur für Kiel und die Lübecker Bucht.",
         page_head("Rechtliches", "Impressum", "Angaben gemäß § 5 Digitale-Dienste-Gesetz.", crumbs=[("/", "Start"), ("/impressum", "Impressum")]) + imp, "",
         ld=[crumbs_ld([("/", "Start"), ("/impressum", "Impressum")])])

    ds = f"""<section class="sec-sm"><div class="wrap"><div class="prose">
<p>Wir freuen uns über euer Interesse. Der Schutz eurer Daten ist uns wichtig. Hier erklären wir, welche Daten beim Besuch dieser Website verarbeitet werden.</p>
<h2>1. Verantwortlicher</h2>
<p>SCM Creatives, {ph("Inhaber, Anschrift")}<br>E-Mail: {MAIL or ph("E-Mail-Adresse")}, Telefon: {TEL or ph("Telefonnummer")}</p>
<h2>2. Hosting</h2>
<p>Diese Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Beim Aufruf verarbeitet Vercel technisch notwendige Daten wie IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser und Betriebssystem in Server-Logfiles, um die Website auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in einer sicheren und stabilen Bereitstellung. Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung. Vercel ist unter dem EU-US Data Privacy Framework zertifiziert; zusätzlich gelten Standardvertragsklauseln.</p>
<h2>3. Keine Cookies, kein Tracking</h2>
<p>Diese Website setzt keine Cookies und verwendet keine Tracking- oder Werbedienste. Im Browser wird lediglich für die Dauer der Sitzung gespeichert, ob die Eröffnungsanimation bereits gezeigt wurde (Session Storage). Diese Information verlässt euer Gerät nicht. {ph("Falls Vercel Web Analytics aktiviert wird: Absatz zu cookieloser Reichweitenmessung ergänzen")}</p>
<h2>4. Schriften und Videos</h2>
<p>Schriftarten und Videos werden direkt von unserem Server geladen. Es werden keine Verbindungen zu Google Fonts, YouTube oder Instagram aufgebaut, solange ihr nicht selbst auf einen Link zu diesen Diensten klickt.</p>
<h2>5. Anfrageformular</h2>
<p>Wenn ihr uns über das Anfrageformular kontaktiert, verarbeiten wir die Angaben, die ihr macht (zum Beispiel Name, Betrieb, Telefon, E-Mail, Branche, Wünsche, Ort und Nachricht), um eure Anfrage zu beantworten und ein Angebot vorzubereiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen). Das Formular wird über eine Funktion unseres Hosters Vercel verarbeitet und per E-Mail an unser Postfach bei {ph("E-Mail-Anbieter, z. B. IONOS")} übermittelt. Wir speichern die Anfrage, solange es für die Bearbeitung nötig ist, und löschen sie, wenn kein Vertrag zustande kommt, spätestens nach {ph("Löschfrist, z. B. 6 Monaten")}, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
<h2>6. Kontakt per E-Mail, Telefon oder WhatsApp</h2>
<p>Wenn ihr uns per E-Mail, Telefon oder WhatsApp kontaktiert, verarbeiten wir eure Angaben zur Bearbeitung der Anfrage (Art. 6 Abs. 1 lit. b DSGVO). Beim Klick auf einen WhatsApp-Link öffnet sich die App bzw. Website von WhatsApp (Meta Platforms Ireland Ltd.). Dort gelten die Datenschutzbestimmungen von WhatsApp.</p>
<h2>7. Links zu Instagram</h2>
<p>Auf unserer Website verlinken wir auf Instagram (Meta Platforms Ireland Ltd.). Es handelt sich um einfache Links; Daten werden erst übertragen, wenn ihr einen Link anklickt.</p>
<h2>8. Eure Rechte</h2>
<p>Ihr habt das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Wendet euch dazu einfach an uns.</p>
<p>Ihr habt außerdem das Recht, euch bei einer Datenschutz-Aufsichtsbehörde zu beschweren, zum Beispiel beim Unabhängigen Landeszentrum für Datenschutz Schleswig-Holstein (ULD), Holstenstraße 98, 24103 Kiel.</p>
<h2>9. Aktualität</h2>
<p>Stand: Oktober 2026. {ph("Vor Livegang rechtlich prüfen lassen")}</p>
</div></div></section>"""
    page("/datenschutz", "Datenschutz | SCM Creatives", "Datenschutzerklärung von SCM Creatives: keine Cookies, kein Tracking, Anfrageformular per E-Mail.",
         page_head("Rechtliches", "Datenschutz", "Welche Daten beim Besuch dieser Website verarbeitet werden, und welche nicht.", crumbs=[("/", "Start"), ("/datenschutz", "Datenschutz")]) + ds, "",
         ld=[crumbs_ld([("/", "Start"), ("/datenschutz", "Datenschutz")])])


# ------------------------------------------------------------------
# Ausgabe: Dateien, Sitemap, robots
# ------------------------------------------------------------------
def out_path(path):
    if path == "/":
        return os.path.join(SITE, "index.html")
    return os.path.join(SITE, path.strip("/") + ".html")


def write_sitemap():
    items = []
    for path, p in PAGES.items():
        if p["noindex"] or path in ("/404",):
            continue
        vids = ""
        if path.startswith("/referenzen/"):
            key = path.split("/")[-1]
            for slug in CLIENTS[key]["reels"]:
                r = REELS[slug]
                vids += f"""
    <video:video><video:thumbnail_loc>{BASE}/media/{slug}.jpg</video:thumbnail_loc><video:title>{html.escape(r['kunde'] + ': ' + r['format'])}</video:title><video:description>{html.escape(r['format'] + ' für ' + r['kunde'] + ', produziert von SCM Creatives.')}</video:description><video:content_loc>{BASE}/media/{slug}.mp4</video:content_loc><video:duration>{r['dauer']}</video:duration><video:publication_date>{r['upload']}T12:00:00+02:00</video:publication_date></video:video>"""
        items.append(f"  <url><loc>{url(path)}</loc><lastmod>{TODAY}</lastmod>{vids}\n  </url>")
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
