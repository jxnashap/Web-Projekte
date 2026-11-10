/* SSV Hafen-Manager – Arbeitsgruppen des Arbeitsdienstes mit Aufgaben (Vorlage)
 *
 * Quelle: Excel „SSV Mitgliederliste 2…“, Blätter „Arbeitsdienst 2025“ (Hauptaufgaben je Gruppe, Spalte „Besorgen“)
 * und „Aktionsliste2024“ (Pos. 1–98 + Trecker & Hubwagen). Gruppen laut Vorstand (10.11.2026).
 * Aufgaben: { titel, zeitraum, stunden, hinweis, pos, art: 'aufgabe' | 'besorgen', erledigt: '' | 'JJJJ-MM-TT' }
 * Pos. 46–49 und 99–102 der Aktionsliste waren auf den Fotos verdeckt und fehlen hier.
 */
(function () {
  'use strict';
  const AD = 'Arbeitsdienst 2025';
  // a(titel, pos, hinweis) = Aufgabe; k(titel, hinweis) = besorgen
  const a = (titel, pos, hinweis) => ({ titel, zeitraum: '', stunden: null, hinweis: hinweis || (pos ? 'Aktionsliste Pos. ' + pos : AD), pos: pos || null, art: 'aufgabe', erledigt: '' });
  const k = (titel, hinweis) => ({ titel, zeitraum: '', stunden: null, hinweis: hinweis || 'Besorgen (' + AD + ')', pos: null, art: 'besorgen', erledigt: '' });

  const GRUPPEN = [
    { name: 'Krancrew', beschreibung: 'Kranen, Kranpflege und Reinigung (Boote, Waschplatz, Kran).', treffpunkt: 'Kran · Kran bedienen nur eingewiesene Mitglieder',
      aufgaben: [a('Boote kranen'), a('Kranbuch pflegen'), a('Kranpflege (z. B. Streichen, Reinigen usw.)'), a('Boote reinigen'), a('Waschplatz reinigen'),
        a('Hilfhub: neue Mitglieder einweisen', 59), a('Haupthub: neue Mitglieder einweisen', 60), a('Wartung, Prüffristen kontrollieren', 61), a('Kranwartung Hublift', 62),
        a('Kran Haupthub: Lüfter erneuern', 63), a('Sockel instand setzen, Sockel streichen', 64), a('Krangestell und Traverse streichen', 65), a('Fenderschutz montieren/demontieren', 66),
        a('HD-Strahler: Verfügbarkeit sicherstellen', 67), a('Akku-Rinne und Schacht reinigen', 68),
        k('Regenzeug'), k('Warnwesten'), k('Erste-Hilfe-Kasten prüfen (aktuell?)'), k('Sprühfett'), k('Farbe: 4 × 2,5 l Holzschutzfarbe Teak'), k('Farbe: 2 × 10 l Betonfarbe grau')] },
    { name: 'Trecker & Bootstransporte', beschreibung: 'Boote mit Trecker und Hubwagen ein- und auslagern, Trecker und Hubwagen pflegen.', treffpunkt: 'Treckerschuppen',
      aufgaben: [a('Transporte Ein-/Auslagern'), a('Wartung Trecker, Hubwagen'), a('Diesel besorgen'), a('Reparaturen dem Vorstand melden'),
        a('Pflege Trecker, ggf. Roststellen entfernen und Korrosionsschutz aufbringen'), a('Trecker u. Hubwagen: Hydraulik-Ersatzteile/-material beschaffen', null, 'Aktionsliste (Trecker & Hubwagen)'),
        k('Pinsel'), k('Akkuschrauber'), k('Teerstreifen')] },
    { name: 'Schiffstransport-Begleitung & Palettenholz', beschreibung: 'Schiffstransporte organisieren und begleiten, Palettenholz einsammeln und einlagern.', treffpunkt: '',
      aufgaben: [a('Schiffstransporte organisieren'), a('Palettenliste überarbeiten'), a('Treckerbegleitung / Einweisen'), a('Palettenholz einsammeln und einlagern', null, 'Vorstand')] },
    { name: 'Radlader', beschreibung: 'Radlader bestellen, Lagergestell- und Materialtransporte, betanken.', treffpunkt: '',
      aufgaben: [a('Radlader bestellen', 80), a('Lagergestell-/Materialtransporte'), a('Anlieferung/Abholung organisieren'), a('Betanken')] },
    { name: 'Lagergestelle & Spindeln', beschreibung: 'Lagergestelle vorbereiten, Spindeln fetten, einsetzen/entfernen und lagern.', treffpunkt: '',
      aufgaben: [a('Lagergestelle vorbereiten'), a('Spindeln fetten, einsetzen/entfernen'), a('Lagerboxen für Spindeln reinigen/lagern')] },
    { name: 'Metallbau & Paletten', beschreibung: 'Metallarbeiten, Paletten und Europaletten, Böcke, Wagen und Gestelle.', treffpunkt: '',
      aufgaben: [a('Paletten und Europaletten bauen/instand setzen', null, 'Vorstand'), a('Metallschrott zerlegen'), a('Altes Gerüst zerlegen'), a('Transportpalette für Spindeln konstruieren'),
        a('SSV-Böcke herstellen', 92), a('Kaikante: Sanierung der Riffelblechkante', 51), a('Kaikante: Bauunterlage (Skizze & Stückliste) erstellen, Prototyp Rahmenvariante anfertigen', 53),
        a('Jollen/Opti-Slipwagen: allg. Durchsicht und Instandsetzung, Neubau in VA', 45), a('Bierpilz mit Bugrädern ausstatten', 91)] },
    { name: 'Reparaturen', beschreibung: 'Bootshalle, Türen, Duschhaus, Zäune und Gebäude instand halten.', treffpunkt: '',
      aufgaben: [a('Reparaturprojekte Gebäude'), a('Fugenreparatur'), a('Mobiliar reparieren'), a('Reparaturen Jugendboote'),
        a('Duschhaus: Vorreiber einstellen', 20), a('Duschhaus: Dach reinigen, Farbe innen und außen', 21), a('Duschhaus: neues Dach aufbringen', 23),
        a('Zaun: Kontrolle auf Löcher, ggf. reparieren (Alarmanlage am Zaun – Draht macht der E-Trupp)', 28), a('Zaun zum Naturschutzgebiet herstellen', 29), a('Galloway-Koppel: Zaun', 31),
        a('Messe: Blendmauerwerk – defekte Fugen auskratzen und instand setzen', 77), a('Messe: Holzgiebel streichen', 78), a('Messe-Flur streichen (bei Bedarf)', 79), a('Küche: Fußboden neu fliesen?', 69),
        a('Mastenlager: Dachplatten befestigen', 72), a('Schuppen: Dach-Abschlusskanten/Bretter erneuern', 83), a('Schuppen: Dachfolie reparieren', 84), a('Schuppen: Anstrich schwarz ausbessern', 86),
        a('Dachrinne Optiregal erneuern', 95), a('Mädi-Garage: Dacherhöhung', 40), a('DIXI: Unterwasseranstrich', 42), a('Piraten und Optis durchsehen, instand setzen', 44),
        a('Spielplatz: Reparaturen (z. B. Zustand Schaukel prüfen)', 98)] },
    { name: 'Schuppenorganisation', beschreibung: 'Schuppen und Bootshalle organisieren, Material- und Werkzeugausgabe, Geräte warten.', treffpunkt: 'Materialschuppen',
      aufgaben: [a('Material- und Werkzeugausgabe, Organisation Optihalle'), a('„Partyhalle“ herrichten/zurückbauen'), a('Anstrich innen'), a('Markisenabdeckung abbauen'),
        a('Markisenabdeckung installieren', 85), a('Tanzboden und Lichtsäulen auf-/abbauen und instand setzen', 88), a('Türen, Fenster reinigen', 87), a('Innenwände reinigen, ggf. nachstreichen', 90),
        a('Lager Holz und Leitern aufräumen', 89), a('Regal aus Holz bauen', 93), a('Materialschuppen organisieren, Materialausgabe, allgemeine Verbrauchsmaterialien besorgen', 94),
        a('Gerüst besorgen', 81), a('Baumlager sanieren', 82), a('Mastenlager: Auflager-Hölzer ergänzen', 71), a('Mastenlager: aufräumen, nutzloses Material wegräumen, entsorgen', 73),
        a('Außenborder-Reparatur/-Wartung, sonstige Gerätereparaturen'), a('Kärcher warten, einwintern'), a('Druckluft-Kompressor warten/instand setzen', 33)] },
    { name: 'Wasser, Sanitär, Heizung & Entwässerung', beschreibung: 'Wasserleitungen, Duschen, Kläranlage, Regenrinnen und Abläufe.', treffpunkt: '',
      aufgaben: [a('Reparaturen Wasserleitungen/Sanitärbereich'), a('Spülen Ablauf Kleinkläranlage'), a('Einarbeitung Lutz'),
        a('Brücken, Frischwasseranlagen: auf Dichtigkeit prüfen, abstellen/anstellen', 5), a('Abstandstücke Trinkwasserleitung', 9),
        a('Duschen: Abläufe, Grundleitungen, Überlauf Außendusche reinigen', 17), a('Duschen: verschimmelte Silikonfugen erneuern', 18), a('Duschen: Grundreinigung', 19),
        a('Durchlauferhitzer (de-)montieren, Leitungen entleeren, ab-/anstellen', 22), a('Öl- und Bilgenwasser-Entsorgungsbehälter: Kontrolle und Instandsetzung', 24),
        a('Kläranlage: Einfassung Kleinkläranlage – Ideenfindung', 54), a('Kläranlage: Überlauf reinigen, Ablaufrohr freispülen', 55), a('Kläranlage: Spülschacht Uferböschung', 56),
        a('Kläranlage: Wartung und Dokumentation', 57), a('Messe: Dachabläufe reinigen', 74), a('Messe: Regenrinnen und Gullys reinigen', 75)] },
    { name: 'Elektriker', beschreibung: 'Elektroarbeiten an Gebäuden, Stegen und Anlagen – nur durch Fachkundige.', treffpunkt: '',
      aufgaben: [a('West-Montage Elektro und Wasserversorgung', 8), a('Kläranlage: Kabel erneuern', 58), a('Alarmanlage am Zaun: Draht', null, 'zu Aktionsliste Pos. 28')] },
    { name: 'Brücken & Stege', beschreibung: 'Brücken, Schwimmstege, Belag, Leitern, Schilder und Montagearbeiten.', treffpunkt: '',
      aufgaben: [a('Belag Eichenbohlen durch KS-Platten ersetzen (Westbrücke)'), a('Defekte Bohlen ersetzen'), a('Belag kärchern'), a('Leitern, Schilder usw. abbauen, reinigen und streichen'),
        a('Brücken + Schwimmbrücke: Rettungsleitern montieren/demontieren', 6), a('Schwimmbrücke: Schwimmfloß-Reparaturen', 7), a('Ost-Kopf: Anfahrschutz anpassen und anbauen', 10),
        a('Rettungsring-Kästen streichen', 11), a('Belag vor dem Liegeplatz reinigen', 12), a('Bohle Stegbelag-Anfahrschutz', 13), a('Weitere Kunststoffplatten verlegen', 14),
        a('Anbindepfähle landseitig prüfen und ggf. erneuern', 15), a('Floßbelag erneuern/reparieren', 16), a('Holzkante (Slipbahn) an der Kaikante fertigstellen', 52),
        a('Jollenslip mit Hochdruckreiniger reinigen', 50)] },
    { name: 'Gartenpflege & Wege', beschreibung: 'Rückschnitt, Hecken, Wege, Galloway-Koppel und Außengelände.', treffpunkt: '',
      aufgaben: [a('Galloway-Koppel herrichten'), a('Material zerkleinern und in Fraktionen sortieren'), a('Pfähle rechts entfernen, links und hinten neues Geländer'),
        a('Rückschnitt Bäume (Kettensäge)'), a('Pflege Hecken, Sträucher, Bäume'),
        a('Elisabethstraße Parkplatz: Rückschnitt', 1), a('Weg: Schlaglöcher mit Asphalt-Recycling auffüllen', 2), a('Weg: Unkraut entfernen, Rückschnitt, insbesondere Brombeere zur Bahn und Strauchwerk', 3),
        a('Außen-Parkplatz: Unkraut entfernen/freischneiden', 4), a('Pflasterfläche vor der Messe: entmoosen, Pflasterlunken ausbessern', 26), a('Bäume, Hecke und Rosen schneiden', 27),
        a('Weg zum Duschhäuschen', 30), a('Galloway-Koppel entmüllen', 32), a('Container für Grünschnitt beschaffen', 25), a('Gartengeräte warten/instand setzen', 34),
        a('Spielplatz + Grillplatz herrichten', 96), a('Außengelände, Spielplatz: Rückschnitt der Bäume', 97)] },
    { name: 'Weitere Aufgaben (noch zuordnen)', aktiv: false, beschreibung: 'Aufgaben aus den Listen, die zu keiner Gruppe passen – einer Gruppe zuordnen oder eine neue Gruppe anlegen.', treffpunkt: '',
      aufgaben: [a('Brötchen-/Suppenausgabe, Messeküche'), a('Messe- und Captain’s-Inn-Scheiben reinigen'), a('Küche Grundreinigung'), a('Fensterbänke und Deko reinigen'),
        a('Küche: Brötchen, Kaffee usw.', 70), a('Ersthelferkasten kontrollieren, ggf. auffüllen', 76), a('Feuerlöscher-TÜV', 35), a('Aushänge kontrollieren und ggf. erneuern', 36),
        a('Sommer-/Winterprogramm', 37), a('Internet: Info-SSV an alle VS-Mitglieder, E-Mail-Verteiler anpassen', 38), a('Wartungsanleitungen erstellen', 39),
        a('Dixi-Garage: Plane ab-/aufbauen', 41), a('Bootstransport im Wasser zum Kran (Jugend)', 43)] }
  ];

  window.SSV_BEREICHE_VORLAGE = { version: 2, gruppen: GRUPPEN };
})();
