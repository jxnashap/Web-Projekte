/* SSV Hafen-Manager – Datenschicht (Demo: localStorage)
 *
 * Struktur der Liegeplätze aus der Gebührenordnung 2024:
 *   Ostbrücke  Nr 1–16 Box I, Nr 17 Box II, Nr 18–24 Box I
 *   Westbrücke Nr 25–62 Box II, Nr 63–70 Box I
 *   Schwimmbr. Nr 71, 73, 75, 76 Box III, Nr 72, 74, 77–79 Box II, Längsseits: Sondertarif
 * Alle Personen, Boote und Bankdaten der Demo sind frei erfunden.
 */
(function () {
  'use strict';

  const KEY = 'ssv-hafen-demo-v1';
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const tag = (d) => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // Vereinsdatenbank aktiv? (js/config.js + js/sb.js) – dann echte UUIDs statt Demo-Kennungen
  const SB = window.SSV_SB || null;
  const uid = (p) => SB && crypto.randomUUID ? crypto.randomUUID() : p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

  /* ------------------------------------------------------------ Grundwerte */
  const STANDARD_EINSTELLUNGEN = {
    verein_name: 'Schwartauer Segler-Verein e.V.',
    verein_strasse: 'Zur Teerhofsinsel 5B',
    verein_ort: '23554 Lübeck',
    verein_email: 'info@ssv-net.de',
    steuernummer: '22 290 72188',
    glaeubiger_id: '',
    iban: '',
    bic: '',
    bank: '',
    kassenwart_name: 'Carsten Schneider',
    hafenmeister_name: 'Dieter Voß',
    hafenmeister_tel: '0179 5916979',
    paypal_me: '',                      // PayPal.me-Name des Vereins (leer = Gäste sehen kein PayPal)
    gast_bar_hinweis: '',               // wohin Gäste Bargeld geben (Briefkasten, Kasse …)
    rechnung_praefix: 'SSV-H', veranstaltung_praefix: 'SSV-V',
    beitrag_praefix: 'SSV-B',
    zahlungsziel_tage: 14,
    stromumlage_ueber_hafen: true,
    arbeitsdienst_soll: 15,
    arbeitsdienst_mahnung_ab: 25,
    arbeitsdienst_vorjahr: false,       // Fehlstunden des Vorjahres zählen mit
    arbeitsdienst_befreit_ab: 0,        // Alter, ab dem niemand mehr Arbeitsdienst leisten muss (0 = keine Grenze)
    arbeitsdienst_satz: 0,              // € je Fehlstunde (0 = wird nicht berechnet)
    arbeitsdienst_bestaetigt: false,    // Regeln vom Vorstand bestätigt?
    steuer_hinweis: '',                 // '' = noch nicht festgelegt · 'kleinunternehmer' · 'ust19' · 'frei'
    steuer_text: '',
    plan_bestaetigt: false,             // Boxmaße und Brückenzuordnung vom Verein bestätigt?
    push_aktiv: false,                  // Push-Benachrichtigungen in „Mein SSV“ anbieten (nach dem ersten Test einschalten)
    flaeche_aufschlag_m: 0,
    kran_max_t: 9,                      // Kran: höchstens 9 t (Beschluss des Vereins, so auch auf der Website)
    max_gewicht_t: 10,                  // Steg/Wasserliegeplatz: höchstens 10 t (Hafenbetriebsordnung 3.1.4)
    fusstext: 'Danke, dass du dabei bist – und allzeit gute Fahrt!'
  };

  // Gebührenordnung je Saisonjahr (Stand Februar 2024, inkl. MwSt.)
  const GEBUEHREN_2024 = {
    stand: 'Gebührenordnung Stand Februar 2024',
    sommerliegegebuehr: { I: 92, II: 60, III: 40 },        // ausübend / Probe
    wasserpacht: { I: 45, II: 30, III: 18 },               // ausübend / Probe
    foerdernd_sommer: { I: 580, II: 500, III: 400 },
    gast_saison: { I: 745, II: 635, III: 515 },
    gast_nacht: 15,
    stromumlage: 75,
    land_aussen_m2: 4,
    land_halle_m2: 6,
    palette_halbjahr: 100,
    schiffskran_std: 75,
    mastenkran_std: 25,
    schluesselpfand: 50,
    // Mitgliedsbeiträge je Jahr: Vereinsbeitrag + Verbandsbeitrag (wird an den Verband weitergereicht)
    beitraege: {
      ausuebend: { verein: 180, verband: 18.43 },
      probe: { verein: 180, verband: 18.43 },
      foerdernd: { verein: 70, verband: 18.43 },
      partner: { verein: 30, verband: 0 },
      jugend: { verein: 55, verband: 9.44 },
      jugend_geschwister: { verein: 25, verband: 9.44 },
      ausbildung: { verein: 65, verband: 18.43 }
    },
    eintrittsgeld_probe: 130   // „je 130 € (3 Jahre)“ – in jedem der drei Probejahre
  };

  /* ------------------------------------------------------------ Liegeplätze */
  function liegeplaetze() {
    const lp = [];
    const box = (nr) => {
      if (nr <= 16) return 'I'; if (nr === 17) return 'II'; if (nr <= 24) return 'I';
      if (nr <= 62) return 'II'; if (nr <= 70) return 'I';
      return [71, 73, 75, 76].includes(nr) ? 'III' : 'II';
    };
    const MASSE = { I: [11, 3.7], II: [9, 3.1], III: [7, 2.6] };
    // Vorhanden laut Verein (Nov. 2026) und Luftbild: Ost 1–16, West 25–56, Schwimmbrücke 71–76
    const VORHANDEN = (nr) => (nr >= 1 && nr <= 16) || (nr >= 25 && nr <= 56) || (nr >= 71 && nr <= 76);
    for (let nr = 1; nr <= 79; nr++) {
      if (!VORHANDEN(nr)) continue;
      const b = box(nr);
      lp.push({ id: 'LP' + pad(nr), nr: String(nr), bruecke: nr <= 24 ? 'ost' : nr <= 70 ? 'west' : 'schwimm', box: b,
        max_laenge: MASSE[b][0], max_breite: MASSE[b][1], tiefe: null, strom: true, gesperrt: false, sonderpreis: null, notiz: '' });
    }
    lp.push({ id: 'LPL1', nr: 'L1', bruecke: 'laengs', box: 'L', max_laenge: 12, max_breite: 4, strom: true, gesperrt: false, sonderpreis: 450, notiz: 'Längsseits – Sondertarif [PLATZHALTER]' });
    lp.push({ id: 'LPL2', nr: 'L2', bruecke: 'laengs', box: 'L', max_laenge: 12, max_breite: 4, strom: false, gesperrt: false, sonderpreis: 450, notiz: 'Längsseits – Sondertarif [PLATZHALTER]' });
    return lp;
  }

  function landplaetze() {
    const lp = [];
    // Nordlager P01–P36 (vorne schräg P01–P10, links P11–P22, rechts zwei Reihen P23–P36), Winterlager West P41–P60
    for (let i = 1; i <= 36; i++) lp.push({ id: 'P' + pad(i), bez: 'Palette ' + i, art: 'palette', bereich: 'nord' });
    for (let i = 41; i <= 60; i++) lp.push({ id: 'P' + pad(i), bez: 'Palette ' + i, art: 'palette', bereich: 'west' });
    for (let i = 1; i <= 4; i++) lp.push({ id: 'H' + i, bez: 'Halle ' + i, art: 'halle', bereich: 'halle' });
    for (let i = 1; i <= 6; i++) lp.push({ id: 'A' + i, bez: 'Außenlager ' + i, art: 'aussen', bereich: 'aussen' });
    return lp;
  }

  /* ------------------------------------------------------------ Demo-Daten */
  // Deterministischer Zufall, damit die Demo bei jedem Start gleich aussieht
  function zufall(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

  // Gültige Demo-IBAN (Prüfziffer nach ISO 7064) auf eine fiktive Kontonummer
  function demoIban(blz, konto) {
    const bban = blz + String(konto).padStart(10, '0');
    const num = (bban + '131400').split('').reduce((r, c) => (r * 10 + Number(c)) % 97, 0);
    return 'DE' + pad(98 - num) + bban;
  }

  function beispieldaten() {
    const r = zufall(42);
    const wahl = (a) => a[Math.floor(r() * a.length)];
    const VORNAMEN = ['Anna', 'Bernd', 'Clara', 'Dirk', 'Elke', 'Frank', 'Greta', 'Hannes', 'Ida', 'Jan', 'Karin', 'Lars', 'Maren', 'Nils', 'Ole', 'Petra', 'Rolf',
      'Sina', 'Timo', 'Ute', 'Volker', 'Wiebke', 'Svenja', 'Henning', 'Jörn', 'Kirsten', 'Malte', 'Birte', 'Uwe', 'Heike', 'Sönke', 'Telse', 'Kai', 'Imke', 'Hauke', 'Frauke'];
    const NACHNAMEN = ['Albers', 'Brandt', 'Claußen', 'Dahl', 'Evers', 'Fiedler', 'Grote', 'Hinz', 'Iversen', 'Jessen', 'Krüger', 'Lorenzen', 'Möller', 'Nissen', 'Ohlsen',
      'Paulsen', 'Rasmussen', 'Schröder', 'Thiessen', 'Urban', 'Voigt', 'Wulf', 'Sievers', 'Hansen', 'Petersen', 'Carstens', 'Detlefsen', 'Feddersen', 'Gosch', 'Hamann',
      'Jürgensen', 'Kähler', 'Lüders', 'Martens', 'Nagel', 'Ohlrogge', 'Prahl', 'Reimers', 'Stamer', 'Tamm', 'Vollert', 'Wendt'];
    const BOOTSNAMEN = ['Möwe', 'Seeschwalbe', 'Kiek ut', 'Hein Mück', 'Albatros', 'Windspiel', 'Lütte Deern', 'Frieda', 'Nordlicht', 'Brise', 'Kormoran', 'Stella Maris',
      'Mövenpick', 'Seestern', 'Butt', 'Klabautermann', 'Wellenreiter', 'Dwarslöper', 'Luv', 'Lee', 'Smutje', 'Fortuna', 'Aurora', 'Nixe', 'Trave', 'Pricken', 'Sturmvogel',
      'Seeadler', 'Hanne', 'Tine', 'Swantje', 'Brummer', 'Ankerplatz', 'Fischkopp', 'Kiel up', 'Seemann', 'Wattwurm', 'Jolly Roger', 'Leuchtfeuer', 'Ebbe', 'Flut', 'Kompass',
      'Tümmler', 'Blaue Stunde', 'Abendrot', 'Kleine Freiheit', 'Rasmus', 'Odin', 'Freya', 'Sila', 'Anni', 'Merle', 'Lotte', 'Mira', 'Heimkehr', 'Hafenkind', 'Nebelhorn',
      'Silbermöwe', 'Störtebeker', 'Sanddorn', 'Pusteblume', 'Wind & Welle', 'Dat Glück', 'Seelenruh', 'Kaptein', 'Fördewind', 'Ostseewelle', 'Achterwind', 'Wolkenlos',
      'Zugvogel', 'Möwenschiet', 'Holstein', 'Hallig', 'Lummerland'];
    const TYPEN = {
      I: ['Hallberg-Rassy 31', 'Dehler 34', 'Bavaria 32', 'Hanse 325', 'Dufour 32', 'Sunbeam 32', 'Linssen 29 (Motor)', 'Comfortina 32'],
      II: ['Varianta 65', 'Neptun 26', 'Etap 26', 'Dehler 25', 'Bavaria 27', 'Sunbeam 24', 'Folkeboot', 'Hurley 24', 'X-79'],
      III: ['Kielzugvogel', 'Jollenkreuzer 20', 'Hai', 'Mini-Tonner', 'Neptun 20']
    };
    const MASS = { I: [8.6, 10.6, 2.9, 3.5, 3.5, 7.5], II: [6.8, 8.6, 2.3, 2.9, 1.2, 3.5], III: [5.2, 6.6, 1.9, 2.4, 0.6, 1.4] };

    const mitglieder = [], boote = [], belegungen = [];
    const lp = liegeplaetze();
    const genutzt = new Set();
    const neuerName = () => { let v, n; do { v = wahl(VORNAMEN); n = wahl(NACHNAMEN); } while (genutzt.has(v + n)); genutzt.add(v + n); return [v, n]; };
    const orte = [['Bad Schwartau', '23611'], ['Lübeck', '23554'], ['Lübeck', '23566'], ['Stockelsdorf', '23617'], ['Ratekau', '23626'], ['Lübeck', '23562']];
    let nr = 2001, booteIdx = 0;

    function mitglied(art) {
      const [v, n] = neuerName(); const o = wahl(orte); const id = uid('M');
      const m = { id, nr: String(nr++), vorname: v, nachname: n, art, email: (v + '.' + n).toLowerCase().replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ß/g, 'ss') + '@beispiel.de',
        tel: '0451 ' + (100000 + Math.floor(r() * 899999)), strasse: wahl(['Hafenstraße', 'Am Steg', 'Möwenweg', 'Travestraße', 'Lindenallee', 'Kiefernweg']) + ' ' + (1 + Math.floor(r() * 60)),
        plz: o[1], ort: o[0], iban: demoIban('12030000', 1000000 + Math.floor(r() * 8999999)), bic: 'BYLADEM1001', kontoinhaber: v + ' ' + n,
        mandat_ref: 'SSV-' + (nr - 1), mandat_datum: (2008 + Math.floor(r() * 17)) + '-0' + (1 + Math.floor(r() * 9)) + '-1' + Math.floor(r() * 9),
        kfz: 'HL-' + String.fromCharCode(65 + Math.floor(r() * 26)) + String.fromCharCode(65 + Math.floor(r() * 26)) + ' ' + (10 + Math.floor(r() * 989)), notiz: '' };
      if (art === 'gast') { m.nr = 'G' + (nr - 1); m.mandat_ref = ''; m.mandat_datum = ''; }
      mitglieder.push(m); return m;
    }
    function boot(eigner, box, extra = {}) {
      const ms = MASS[box];
      const l = +(ms[0] + r() * (ms[1] - ms[0])).toFixed(2), b = +(ms[2] + r() * (ms[3] - ms[2])).toFixed(2);
      const heute = new Date('2026-11-09');
      const bis = new Date(heute.getFullYear() + (r() < 0.85 ? 1 : 0), Math.floor(r() * 12), 1 + Math.floor(r() * 27));
      const bt = { id: uid('B'), name: BOOTSNAMEN[booteIdx++ % BOOTSNAMEN.length], typ: wahl(TYPEN[box]), eigner_id: eigner.id, laenge: l, breite: b,
        tiefgang: +(0.8 + r() * 1.1).toFixed(2), gewicht_t: +(ms[4] + r() * (ms[5] - ms[4])).toFixed(1), segelnr: 'GER ' + (1000 + Math.floor(r() * 8999)),
        versicherung: wahl(['Pantaenius', 'Wehring & Wolfes', 'Yacht-Pool', 'Nordwest Assekuranz', 'Allianz']), vers_bis: tag(bis), notiz: '', ...extra };
      bt.vers_status = boote.length % 7 === 3 ? 'eingereicht' : boote.length % 3 === 0 ? 'selbst' : 'geprueft';
      if (bt.vers_status === 'geprueft') { bt.vers_geprueft_am = '2026-04-0' + (1 + boote.length % 8); bt.vers_geprueft_von = 'Brückenwartin'; }
      boote.push(bt); return bt;
    }

    // Sommer 2026: Dauerlieger + Saisongäste + freie Plätze
    const frei = new Set(['LP12', 'LP41', 'LP53', 'LP75', 'LPL2']);
    const gesperrt = 'LP52';
    const saisongast = new Set(['LP33', 'LP47', 'LPL1']);
    const foerdernd = new Set(['LP09', 'LP27', 'LP38', 'LP55', 'LP72', 'LP14', 'LP45']);
    const probe = new Set(['LP05', 'LP30', 'LP44', 'LP74', 'LP26']);
    lp.forEach((p) => {
      if (p.id === gesperrt) { p.gesperrt = true; p.notiz = 'Dalben defekt – Reparatur geplant [BEISPIEL]'; return; }
      if (frei.has(p.id)) return;
      const art = saisongast.has(p.id) ? 'gast' : foerdernd.has(p.id) ? 'foerdernd' : probe.has(p.id) ? 'probe' : 'ausuebend';
      const m = mitglied(art);
      const bx = p.box === 'L' ? 'I' : p.box;
      const bt = boot(m, bx);
      belegungen.push({ id: uid('BL'), saison: 2026, periode: 'sommer', boot_id: bt.id, platz_typ: 'wasser', platz_id: p.id, art: art === 'gast' ? 'saisongast' : 'dauer', flaeche_m2: null, nicht_kranen: false, notiz: '' });
    });
    // Ein Boot über 10 t – zur Demonstration der Warnung
    boote[3].gewicht_t = 10.4; boote[3].notiz = 'Gewicht über der Grenze für Steg und Kran [BEISPIEL]';
    // Zwei Boote bleiben im Sommer an Land (Sommerlagerung, Verdopplungsregel)
    const landSommer = [mitglied('ausuebend'), mitglied('ausuebend')];
    const bLand1 = boot(landSommer[0], 'II'), bLand2 = boot(landSommer[1], 'III');
    belegungen.push({ id: uid('BL'), saison: 2026, periode: 'sommer', boot_id: bLand1.id, platz_typ: 'land', platz_id: 'P58', art: 'dauer', flaeche_m2: null, sommer_an_land_jahr: 1, nicht_kranen: true, notiz: '' });
    belegungen.push({ id: uid('BL'), saison: 2026, periode: 'sommer', boot_id: bLand2.id, platz_typ: 'land', platz_id: 'A6', art: 'dauer', flaeche_m2: Math.ceil(bLand2.laenge * bLand2.breite), sommer_an_land_jahr: 2, nicht_kranen: true, notiz: 'Zweiter Sommer an Land – Gebühr verdoppelt' });

    // Winter 2026/27: Mitglieder-Boote an Land (Paletten, Halle, außen); Gäste & Fördernde nicht (Landplätze nur für ausübende/Probe)
    const landBerechtigt = boote.filter((b) => { const m = mitglieder.find((x) => x.id === b.eigner_id); return m.art === 'ausuebend' || m.art === 'probe'; });
    let p = 0, h = 0, a = 0; const paletten = landplaetze().filter((x) => x.art === 'palette').map((x) => x.id);
    landBerechtigt.forEach((b, i) => {
      if (i % 9 === 4) return; // einige bleiben woanders im Winterlager
      let platz, typ, fl = null;
      if (b.laenge >= 9.5 && h < 4) { platz = 'H' + (++h); typ = 'halle'; fl = Math.ceil(b.laenge * b.breite); }
      else if (p < paletten.length) { platz = paletten[p++]; typ = 'palette'; }
      else if (a < 5) { platz = 'A' + (++a); typ = 'aussen'; fl = Math.ceil(b.laenge * b.breite); }
      else return;
      belegungen.push({ id: uid('BL'), saison: 2026, periode: 'winter', boot_id: b.id, platz_typ: 'land', platz_id: platz, art: 'dauer', flaeche_m2: fl, nicht_kranen: false, notiz: '' });
    });

    // Abwesenheiten (grünes Schild) im Sommer 2026
    const abwesenheiten = [];
    const wasserBel = belegungen.filter((x) => x.periode === 'sommer' && x.platz_typ === 'wasser');
    [[2, '2026-07-25', '2026-08-23', 'Dänische Südsee'], [11, '2026-08-08', '2026-08-30', 'Schweden-Törn'], [17, '2026-08-01', '2026-08-16', 'Rund Fünen'],
     [29, '2026-08-12', '2026-08-19', 'Fehmarn'], [40, '2026-08-14', '2026-09-06', 'Bornholm'], [52, '2026-06-20', '2026-07-05', 'Kieler Woche'], [8, '2026-11-20', '2026-11-22', 'Überführung [BEISPIEL]']]
      .forEach(([i, von, bis, notiz]) => { const bl = wasserBel[i]; if (bl) abwesenheiten.push({ id: uid('AW'), boot_id: bl.boot_id, platz_id: bl.platz_id, von, bis, notiz, gemeldet: 'Mitglied' }); });

    // Gastlieger (Tageslieger) – Beispieltag 15.08.2026 und Historie
    const gaeste = [
      { id: uid('G'), bootsname: 'Sea Breeze', skipper: 'Familie de Vries', herkunft: 'Enkhuizen (NL)', tel: '', email: '', laenge: 9.8, breite: 3.3, ankunft: '2026-08-14', naechte: 3, platz_id: wasserBel[11].platz_id, betrag: 45, zahlung: 'bar', quittung_nr: 'Q-2026-041', status: 'eingewiesen', quelle: 'qr', erstellt: '2026-08-14T17:20:00' },
      { id: uid('G'), bootsname: 'Hav', skipper: 'Mette Larsen', herkunft: 'Svendborg (DK)', tel: '', email: '', laenge: 8.4, breite: 2.9, ankunft: '2026-08-15', naechte: 1, platz_id: 'LP12', betrag: 15, zahlung: 'offen', quittung_nr: '', status: 'eingewiesen', quelle: 'hafenmeister', erstellt: '2026-08-15T16:05:00' },
      { id: uid('G'), bootsname: 'Elbe 3', skipper: 'Thomas Brandes', herkunft: 'Hamburg', tel: '0170 0000000', email: '', laenge: 11.2, breite: 3.6, ankunft: '2026-08-15', naechte: 2, platz_id: 'LPL2', betrag: 30, zahlung: 'ueberweisung', quittung_nr: 'Q-2026-042', status: 'eingewiesen', quelle: 'hafenmeister', erstellt: '2026-08-15T18:40:00' },
      { id: uid('G'), bootsname: 'Seute Deern II', skipper: 'Karl Behn', herkunft: 'Neustadt i. H.', tel: '', email: '', laenge: 7.6, breite: 2.7, ankunft: '2026-08-15', naechte: 1, platz_id: '', betrag: 15, zahlung: 'offen', quittung_nr: '', status: 'angemeldet', quelle: 'qr', erstellt: '2026-08-15T19:12:00' },
      { id: uid('G'), bootsname: 'Lykke', skipper: 'Jens Holm', herkunft: 'Aarhus (DK)', tel: '', email: '', laenge: 9.1, breite: 3.1, ankunft: '2026-07-02', naechte: 2, platz_id: 'LP41', betrag: 30, zahlung: 'bar', quittung_nr: 'Q-2026-027', status: 'abgereist', quelle: 'hafenmeister', erstellt: '2026-07-02T15:00:00' }
    ];

    gaeste.forEach((g) => { g.tiefgang = null; g.bezahlt_am = g.zahlung === 'bar' || g.quittung_nr ? g.ankunft : ''; });
    gaeste[2].quittung_nr = ''; gaeste[2].bezahlt_am = '';   // Überweisung vereinbart, aber noch nicht eingegangen
    // Gast hat selbst Platz 33 angegeben (Schild grün), der Eigner hat aber keine Abwesenheit eingetragen → Hafenmeister klärt
    gaeste[3].platz_angabe = '33'; gaeste[3].platz_hinweis = 'Platz 33: Eigner hat für den 15.08.2026 keine Abwesenheit (grünes Schild) gemeldet.'; gaeste[3].zahlung = 'paypal'; gaeste[3].zahlung_gemeldet = '2026-08-15T19:14:00';

    // Schäden und Wartung
    const aufgaben = [
      { id: uid('T'), titel: 'Dalben an Platz 52 locker', beschreibung: 'Dalben wackelt bei Wind deutlich, Platz ist gesperrt.', ort: 'Westbrücke', platz_id: 'LP52', boot_id: null, art: 'schaden', prioritaet: 'hoch', status: 'in_arbeit', verantwortlich: 'Hafenmeister', faellig: '2026-11-30', erstellt: '2026-10-02T10:00:00', erstellt_von: 'Hafenmeister', erledigt_am: '', notiz: 'Taucher angefragt [BEISPIEL]' },
      { id: uid('T'), titel: 'Stromsäule Ostbrücke ohne Funktion', beschreibung: 'Säule zwischen Platz 6 und 7, FI fliegt raus.', ort: 'Ostbrücke', platz_id: '', boot_id: null, art: 'schaden', prioritaet: 'normal', status: 'offen', verantwortlich: '', faellig: '', erstellt: '2026-11-05T17:30:00', erstellt_von: 'Mitglied (Mein SSV)', erledigt_am: '', notiz: '' },
      { id: uid('T'), titel: 'Kran: jährliche Prüfung (UVV)', beschreibung: 'Prüfung durch Sachkundigen vor dem Auslagern.', ort: 'Kran', platz_id: '', boot_id: null, art: 'wartung', prioritaet: 'normal', status: 'offen', verantwortlich: 'Vorstand', faellig: '2027-03-15', erstellt: '2026-10-25T09:00:00', erstellt_von: 'Vorstand', erledigt_am: '', notiz: '' }
    ];

    // Arbeitseinsätze (heute einer zum Ausprobieren des QR-Check-ins) und eine Mitteilung
    const heuteD = tag(new Date());
    const arbeitseinsaetze = [
      { id: uid('E'), datum: heuteD, titel: 'Winterarbeitsdienst: Steg und Gelände', beginn: '09:00', ende: '13:00', stunden: 4, notiz: 'Treffpunkt Messe', erstellt_von: 'Vorstand' },
      { id: uid('E'), datum: '2027-03-20', titel: 'Frühjahrsputz vor dem Auslagern', beginn: '09:00', ende: '14:00', stunden: 5, notiz: '', erstellt_von: 'Vorstand' }
    ];
    // Arbeitsbereiche: Einsatz „Steg und Gelände“ gehört zum Steg, bestätigte Stunden zum Bereich des Mitglieds
    const bereicheDemo = demoBereiche(mitglieder);
    const steg = bereicheDemo.arbeitsbereiche.find((x) => /Brücken/.test(x.name)); if (steg) arbeitseinsaetze[0].bereich_id = steg.id;   // Einsatz „Steg und Gelände“
    const arbeitseinsatz_codes = [{ einsatz_id: arbeitseinsaetze[0].id, code: 'STEG26' }, { einsatz_id: arbeitseinsaetze[1].id, code: 'PUTZ27' }];
    const mitteilungen = [{ id: uid('N'), titel: 'Wintertreffen am 28.11. in der Messe', text: 'Ab 18 Uhr – Rückblick auf die Saison, Grünkohl und Planung für 2027. Bitte bis 25.11. unten bei „Veranstaltungen“ zu- oder absagen.', wichtig: false, zielgruppe: 'alle', gueltig_bis: '2026-11-28', erstellt: '2026-11-05T10:00:00', erstellt_von: 'Vorstand', push_gesendet: null }];

    // Warteliste (Anspruch laut Satzung § 10 I)
    const warteliste = [];
    [['probe', 7.9, 2.8, 'II', '2025-03-14'], ['ausuebend', 9.6, 3.3, 'I', '2025-06-02'], ['probe', 6.4, 2.4, 'III', '2025-09-21'], ['ausuebend', 8.2, 2.9, 'II', '2026-02-11'], ['foerdernd', 7.0, 2.5, 'II', '2026-05-30']]
      .forEach(([art, l, b, box, datum]) => { const m = mitglied(art); warteliste.push({ id: uid('W'), mitglied_id: m.id, datum, boot_laenge: l, boot_breite: b, wunsch_box: box, notiz: '', status: 'wartend' }); });

    // Kran-Einsätze außerhalb der Gemeinschaftstermine (abrechenbar)
    const kran = [
      { id: uid('K'), boot_id: boote[6].id, datum: '2026-06-12', art: 'schiff', minuten: 50, notiz: 'Ruderschaden, kurz an Land', abgerechnet: '' },
      { id: uid('K'), boot_id: boote[21].id, datum: '2026-07-03', art: 'mast', minuten: 70, notiz: 'Mast gelegt für Überführung', abgerechnet: '' },
      { id: uid('K'), boot_id: boote[35].id, datum: '2026-10-30', art: 'schiff', minuten: 95, notiz: 'Nachzügler nach dem Einlagern', abgerechnet: '' }
    ];

    // Arbeitsdienst-Stunden 2026
    const arbeitsdienst = [];
    mitglieder.filter((m) => m.art === 'ausuebend' || m.art === 'probe').forEach((m) => {
      const n = Math.floor(r() * 4);
      for (let i = 0; i < n; i++) arbeitsdienst.push({ id: uid('AD'), mitglied_id: m.id, datum: wahl(['2026-04-11', '2026-04-12', '2026-05-16', '2026-09-12', '2026-10-24', '2026-10-25']),
        stunden: wahl([3, 4, 5, 6, 8]), taetigkeit: wahl(['Auslagern', 'Einlagern', 'Steg-Wartung', 'Gartenarbeit', 'Malerarbeiten', 'Jugendtraining']) });
    });

    // Zwei vom Mitglied gemeldete Einsätze warten auf Bestätigung
    arbeitsdienst.slice(0, 2).forEach((a, i) => { arbeitsdienst.push({ id: uid('AD'), mitglied_id: a.mitglied_id, datum: '2026-10-2' + (5 + i), stunden: 3, taetigkeit: i ? 'Hecke geschnitten' : 'Kranbahn gefegt', status: 'eingereicht', einsatz_id: null, gemeldet: '2026-10-2' + (5 + i) + 'T18:00:00', geprueft_von: '' }); });

    // Mitglieder ohne Boot: Ausübende, Partner, Jugend, Auszubildende, Fördernde
    [['ausuebend', 10], ['partner', 4], ['jugend', 8], ['jugend_geschwister', 2], ['ausbildung', 3], ['foerdernd', 5]].forEach(([art, n]) => {
      for (let i = 0; i < n; i++) { const m = mitglied(art); if (art.startsWith('jugend')) { m.kfz = ''; m.kontoinhaber = 'Familie ' + m.nachname; } }
    });

    // Persönliche Angaben (für Beitragsgruppe und Verbandsmeldung) – eigener Zufall, damit der Rest gleich bleibt
    const r2 = zufall(7);
    const WEIBLICH = new Set(['Anna', 'Clara', 'Elke', 'Greta', 'Ida', 'Karin', 'Maren', 'Petra', 'Sina', 'Ute', 'Wiebke', 'Svenja', 'Kirsten', 'Birte', 'Heike', 'Telse', 'Imke', 'Frauke']);
    const ALTER = { jugend: [8, 17], jugend_geschwister: [7, 14], ausbildung: [18, 25], probe: [24, 55], partner: [35, 75] };
    mitglieder.forEach((m) => {
      const [a, b] = ALTER[m.art] || [28, 82];
      const jahr = 2026 - (a + Math.floor(r2() * (b - a + 1)));
      m.geburtsdatum = jahr + '-' + pad(1 + Math.floor(r2() * 12)) + '-' + pad(1 + Math.floor(r2() * 28));
      m.geschlecht = WEIBLICH.has(m.vorname) ? 'w' : 'm';
      const ein = m.art === 'probe' ? 2024 + Math.floor(r2() * 3) : Math.max(jahr + 6, 1975 + Math.floor(r2() * 50));
      m.eintritt = Math.min(ein, 2026) + '-0' + (1 + Math.floor(r2() * 9)) + '-01';
      m.austritt = '';
    });
    mitglieder[mitglieder.length - 1].geschlecht = 'd';

    // Online-Aufnahmeanträge (warten auf den Vorstand)
    const antraege = [
      { id: uid('A'), eingang: '2026-11-03T19:42:00', status: 'neu', art: 'probe', vorname: 'Lena', nachname: 'Bruhn', geburtsdatum: '1991-05-17', geschlecht: 'w',
        strasse: 'Am Holstentor 4', plz: '23552', ort: 'Lübeck', email: 'lena.bruhn@beispiel.de', tel: '0151 2345678', erziehungsberechtigt: '',
        boot: { name: 'Seeperle', typ: 'Folkeboot', laenge: 7.64, breite: 2.2 }, warteliste: true, kontoinhaber: 'Lena Bruhn', iban: demoIban('21050170', 4455667), bic: '',
        mandat: true, satzung: true, datenschutz: true, nachricht: 'Ich segle seit Jahren und suche einen Liegeplatz an der Trave.' },
      { id: uid('A'), eingang: '2026-11-07T10:15:00', status: 'neu', art: 'jugend', vorname: 'Mats', nachname: 'Rehder', geburtsdatum: '2014-08-02', geschlecht: 'm',
        strasse: 'Lindenallee 12', plz: '23611', ort: 'Bad Schwartau', email: 'familie.rehder@beispiel.de', tel: '0451 223344', erziehungsberechtigt: 'Katrin Rehder',
        boot: null, warteliste: false, kontoinhaber: 'Katrin Rehder', iban: demoIban('23050101', 9988776), bic: '', mandat: true, satzung: true, datenschutz: true,
        nachricht: 'Mats möchte im Opti-Training mitmachen.' }
    ];

    arbeitsdienst.forEach((a) => { const z = bereicheDemo.arbeitsbereich_mitglieder.find((x) => x.mitglied_id === a.mitglied_id); a.bereich_id = z ? z.bereich_id : null; });
    return { version: 3, antraege, einstellungen: { ...STANDARD_EINSTELLUNGEN, glaeubiger_id: 'DE98ZZZ09999999999', iban: demoIban('23050101', 1234567), bic: 'NOLADE21SPL', bank: 'Demo-Sparkasse [PLATZHALTER]' },
      gebuehren: { 2026: { ...GEBUEHREN_2024 } }, saisons: [{ jahr: 2026, auslagern: '2026-04-11', einlagern: '2026-10-24' }],
      liegeplaetze: lp, landplaetze: landplaetze(), mitglieder, boote, belegungen, abwesenheiten, gaeste, warteliste, kran, arbeitsdienst, rechnungen: [], sepa_laeufe: [], zaehler: { quittung: 42 },
      aufgaben, dokumente: [], aenderungen: [], arbeitseinsaetze, arbeitseinsatz_codes, mitteilungen, ...bereicheDemo, ...demoVeranstaltungen(mitglieder, boote), toilette: { ...TOILETTE_DEMO } };
  }

  /* ------------------------------------------------------------ Speicher */
  let d;
  // Toilettencode für Gastlieger (Demo); in der Datenbank eigene Tabelle gast_toilette
  const TOILETTE_DEMO = { code: '2580', regel: 'gemeldet', hinweis: 'WC & Duschen im Vereinsheim – Tastenfeld neben der Tür [PLATZHALTER]' };
  // Arbeitsgruppen des Vereins (js/bereiche-vorlage.js) – Demo verteilt Beispiel-Mitglieder darauf
  function demoBereiche(mitglieder) {
    const V = window.SSV_BEREICHE_VORLAGE; if (!V) return { arbeitsbereiche: [], arbeitsbereich_mitglieder: [], bereiche_v: 0 };
    const b = V.gruppen.map((g, i) => ({ id: uid('AB'), sort: i, aktiv: g.aktiv !== false, name: g.name, beschreibung: g.beschreibung || '', treffpunkt: g.treffpunkt || '',
      aufgaben: g.aufgaben.map((x) => ({ ...x })) }));
    // Beispiel: ein paar Aufgaben sind schon erledigt, damit die Liste realistisch aussieht
    [[0, 1], [6, 4], [10, 2], [11, 5]].forEach(([gi, ai]) => { const x = b[gi] && b[gi].aufgaben[ai]; if (x) x.erledigt = '2026-05-09'; });
    const aktive = mitglieder.filter((m) => m.art === 'ausuebend' || m.art === 'probe');
    const zu = []; let n = 0;
    b.filter((x) => x.aktiv).forEach((x, i) => { const groesse = [7, 6, 4, 3, 4, 4, 6, 4, 4, 2, 6, 5][i] || 3;
      for (let k = 0; k < groesse && n < aktive.length; k++, n++) zu.push({ id: uid('AM'), bereich_id: x.id, mitglied_id: aktive[n].id, rolle: k === 0 ? 'leitung' : 'mitglied' }); });
    if (aktive[3] && b[10]) zu.push({ id: uid('AM'), bereich_id: b[10].id, mitglied_id: aktive[3].id, rolle: 'mitglied' });   // ein Mitglied in zwei Gruppen
    return { arbeitsbereiche: b, arbeitsbereich_mitglieder: zu, bereiche_v: V.version };
  }

  function laden() {
    if (SB) return d;   // Datenbank-Modus: Daten kommen aus verbinden()
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
    if (!d || d.version !== 3) {   // 3 = 54 Liegeplätze nach Luftbild/Verein
      d = beispieldaten();
      if (window.HAFEN_GEBUEHREN && window.HAFEN_GEBUEHREN.saisonAbrechnen) {
        // Historie: Beitrag 2026 im Januar, Sommer 2026 im April abgerechnet und eingezogen
        window.HAFEN_GEBUEHREN.saisonAbrechnen(d, 2026, 'beitrag', '2026-01-20').forEach((re) => { re.bezahlt_am = '2026-02-05'; re.sepa_lauf = 'SEPA-2026-01'; });
        window.HAFEN_GEBUEHREN.saisonAbrechnen(d, 2026, 'sommer', '2026-04-20').forEach((re) => { re.bezahlt_am = '2026-05-05'; re.sepa_lauf = 'SEPA-2026-04'; });
      }
      sichern();
    }
    if (!d.antraege) d.antraege = [];
    ['aufgaben', 'dokumente', 'aenderungen', 'arbeitseinsaetze', 'arbeitseinsatz_codes', 'mitteilungen'].forEach((k) => { if (!d[k]) d[k] = []; });
    // Demo: Arbeitsgruppen auf die aktuelle Vorlage des Vereins bringen (ersetzt ältere Beispiel-Bereiche)
    // Neue Lagerplätze (Nordlager nach Angabe des Vereins): West P21–P40 → P41–P60, Nord bis P36
    if (d.landplaetze && !d.landplaetze.some((x) => x.id === 'P36')) {
      const neu = (id) => { const n = Number(String(id).slice(1)); return /^P\d+$/.test(id) && n >= 21 && n <= 40 ? 'P' + pad(n + 20) : id; };
      const westAlt = new Set(d.landplaetze.filter((x) => x.bereich === 'west').map((x) => x.id));
      (d.belegungen || []).forEach((x) => { if (westAlt.has(x.platz_id)) x.platz_id = neu(x.platz_id); });
      d.landplaetze = landplaetze();
    }
    if (!d.arbeitsbereiche || (window.SSV_BEREICHE_VORLAGE && d.bereiche_v !== window.SSV_BEREICHE_VORLAGE.version)) {
      const alt = new Set((d.arbeitsbereiche || []).map((x) => x.id));
      Object.assign(d, demoBereiche(d.mitglieder));
      (d.arbeitsdienst || []).forEach((x) => { if (alt.has(x.bereich_id)) x.bereich_id = null; }); (d.arbeitseinsaetze || []).forEach((x) => { if (alt.has(x.bereich_id)) x.bereich_id = null; });
      sichern();
    }
    if (!d.toilette) { d.toilette = { ...TOILETTE_DEMO }; sichern(); }
    if (!d.veranstaltungen) { Object.assign(d, demoVeranstaltungen(d.mitglieder, d.boote)); sichern(); }   // ältere Demo-Daten um Beispiel-Bereiche ergänzen
    d.einstellungen = { ...STANDARD_EINSTELLUNGEN, ...d.einstellungen };
    d.rechnungen.forEach((r) => { if (!r.zahlungen) r.zahlungen = []; });
    if (!demoSchnapp) demoSchnapp = schnappschuss(zeilen(true));
    return d;
  }
  // Demo: Änderungsverlauf wie in der Datenbank mitschreiben (wer, wann, was)
  let demoSchnapp = null;
  const TAB_DEMO = ['mitglieder', 'mitglieder_bank', 'boote', 'belegungen', 'abwesenheiten', 'gaeste', 'warteliste', 'kran', 'arbeitsdienst', 'arbeitseinsaetze', 'arbeitsbereiche', 'arbeitsbereich_mitglieder', 'mitteilungen', 'veranstaltungen', 'zusagen', 'hafen_rechnungen', 'sepa_laeufe', 'antraege', 'liegeplaetze', 'gebuehren', 'hafen_einstellungen', 'aufgaben'];
  function demoVerlauf() {
    const neu = schnappschuss(zeilen(true));
    if (demoSchnapp) {
      const zeit = new Date().toISOString(); const wer = window.HAFEN.wer || 'Demo';
      TAB_DEMO.forEach((t) => {
        const a = demoSchnapp[t] || new Map(), b = neu[t] || new Map();
        b.forEach((r, k) => { const o = a.get(k); const bez = bezeichnung(r);
          if (!o) d.aenderungen.push({ id: zeit + k, zeit, wer, tabelle: t, datensatz: k, bezeichnung: bez, aktion: 'neu', aenderung: maske(t, r) });
          else { const df = feldDiff(o, r); if (Object.keys(df).length) d.aenderungen.push({ id: zeit + k, zeit, wer, tabelle: t, datensatz: k, bezeichnung: bez, aktion: 'geaendert', aenderung: maskeDiff(t, Object.fromEntries(Object.entries(df).map(([f]) => [f, [o[f], r[f]]]))) }); } });
        a.forEach((r, k) => { if (!b.has(k)) d.aenderungen.push({ id: zeit + k, zeit, wer, tabelle: t, datensatz: k, bezeichnung: bezeichnung(r), aktion: 'geloescht', aenderung: maske(t, r) }); });
      });
      if (d.aenderungen.length > 400) d.aenderungen = d.aenderungen.slice(-400);
    }
    demoSchnapp = neu;
  }
  const bezeichnung = (r) => [r.vorname, r.nachname].filter(Boolean).join(' ') || r.name || r.bootsname || r.nr || r.titel || r.platz_id || '';
  const kuerzen = (v) => (v ? '…' + String(v).slice(-4) : v);
  const maske = (t, r) => { const z = { ...r }; if ('iban' in z) z.iban = kuerzen(z.iban); return z; };
  const maskeDiff = (t, df) => { if (df.iban) df.iban = df.iban.map(kuerzen); return df; };
  function sichern() {
    if (SB) return dbSichern();
    try { demoVerlauf(); } catch (e) { /* Verlauf ist nur Komfort */ }
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { console.warn('Demo-Daten nicht gespeichert', e); return Promise.reject(new Error('Der Browser-Speicher ist voll – bitte große Dateien entfernen.')); }
    return Promise.resolve();
  }
  function zuruecksetzen() { if (SB) return d; try { localStorage.removeItem(KEY); } catch (e) { /* egal */ } return laden(); }

  /* ============================================================ Vereinsdatenbank
   * Lädt beim Start alles, was die angemeldete Person sehen darf (Zeilenschutz in der Datenbank),
   * in dieselbe Struktur wie die Demo – die Oberfläche bleibt unverändert. Beim Speichern werden
   * nur geänderte, neue und gelöschte Einträge übertragen. */
  const SP = {
    mitglieder: ['id', 'nr', 'vorname', 'nachname', 'art', 'email', 'tel', 'strasse', 'plz', 'ort', 'mandatsreferenz', 'kfz', 'notiz', 'geburtsdatum', 'geschlecht', 'eintritt', 'austritt', 'aktiv', 'arbeitsdienst_befreit'],
    mitglieder_bank: ['mitglied_id', 'iban', 'bic', 'kontoinhaber', 'mandat_datum'],
    boote: ['id', 'name', 'typ', 'eigner_id', 'laenge', 'breite', 'tiefgang', 'gewicht_t', 'segelnr', 'versicherung', 'vers_bis', 'notiz', 'vers_status', 'vers_geprueft_am', 'vers_geprueft_von'],
    belegungen: ['id', 'saison', 'periode', 'boot_id', 'platz_typ', 'platz_id', 'art', 'flaeche_m2', 'sommer_an_land_jahr', 'nicht_kranen', 'notiz'],
    abwesenheiten: ['id', 'boot_id', 'platz_id', 'von', 'bis', 'notiz', 'gemeldet'],
    gaeste: ['id', 'bootsname', 'skipper', 'herkunft', 'tel', 'email', 'laenge', 'breite', 'tiefgang', 'ankunft', 'naechte', 'platz_id', 'platz_angabe', 'platz_hinweis', 'betrag', 'zahlung', 'zahlung_gemeldet', 'bezahlt_am', 'quittung_nr', 'status', 'quelle', 'erstellt'],
    warteliste: ['id', 'mitglied_id', 'datum', 'boot_laenge', 'boot_breite', 'wunsch_box', 'notiz', 'status'],
    kran: ['id', 'boot_id', 'datum', 'art', 'minuten', 'notiz', 'abgerechnet'],
    arbeitsdienst: ['id', 'mitglied_id', 'datum', 'stunden', 'taetigkeit', 'status', 'einsatz_id', 'bereich_id', 'gemeldet', 'geprueft_von'],
    arbeitseinsaetze: ['id', 'datum', 'titel', 'beginn', 'ende', 'stunden', 'notiz', 'erstellt_von', 'bereich_id'],
    arbeitsbereiche: ['id', 'name', 'beschreibung', 'treffpunkt', 'aufgaben', 'sort', 'aktiv'],
    arbeitsbereich_mitglieder: ['id', 'bereich_id', 'mitglied_id', 'rolle'],
    arbeitseinsatz_codes: ['einsatz_id', 'code'],
    mitteilungen: ['id', 'titel', 'text', 'wichtig', 'zielgruppe', 'gueltig_bis', 'erstellt', 'erstellt_von', 'push_gesendet'],
    veranstaltungen: ['id', 'datum', 'beginn', 'ende', 'titel', 'ort', 'text', 'anmeldung_bis', 'max_personen', 'begleitung', 'kosten', 'kosten_hinweis', 'abgesagt', 'erstellt', 'erstellt_von'],
    zusagen: ['id', 'veranstaltung_id', 'mitglied_id', 'antwort', 'personen', 'bemerkung', 'quelle', 'geaendert'],
    hafen_rechnungen: ['id', 'nr', 'mitglied_id', 'datum', 'saison', 'periode', 'faellig', 'positionen', 'summe', 'empfaenger', 'sepa', 'mandat_ref', 'mandat_datum', 'bezahlt_am', 'storniert_am', 'sepa_lauf', 'zahlungen', 'veranstaltung_id'],
    sepa_laeufe: ['id', 'datum', 'faellig', 'anzahl', 'summe'],
    antraege: ['id', 'eingang', 'status', 'art', 'vorname', 'nachname', 'geburtsdatum', 'geschlecht', 'strasse', 'plz', 'ort', 'email', 'tel', 'erziehungsberechtigt', 'boot', 'warteliste',
      'kontoinhaber', 'iban', 'bic', 'mandat', 'satzung', 'datenschutz', 'nachricht', 'mitglied_id', 'entschieden', 'entschieden_von', 'grund'],
    liegeplaetze: ['id', 'nr', 'bruecke', 'box', 'max_laenge', 'max_breite', 'tiefe', 'strom', 'gesperrt', 'sonderpreis', 'notiz'],
    aufgaben: ['id', 'titel', 'beschreibung', 'ort', 'platz_id', 'boot_id', 'art', 'prioritaet', 'status', 'verantwortlich', 'faellig', 'erstellt', 'erstellt_von', 'erledigt_am', 'notiz'],
    landplaetze: ['id', 'bez', 'art', 'bereich'],
    saisons: ['jahr', 'auslagern', 'einlagern'],
    gebuehren: ['jahr', 'daten'],
    hafen_einstellungen: ['id', 'daten']
  };
  const PK = { mitglieder_bank: 'mitglied_id', saisons: 'jahr', gebuehren: 'jahr', arbeitseinsatz_codes: 'einsatz_id' };
  // Reihenfolge: erst Eltern, dann Kinder (beim Löschen umgekehrt)
  const REIHE = ['mitglieder', 'mitglieder_bank', 'boote', 'belegungen', 'abwesenheiten', 'gaeste', 'warteliste', 'kran', 'arbeitsbereiche', 'arbeitsbereich_mitglieder', 'arbeitseinsaetze', 'arbeitseinsatz_codes', 'arbeitsdienst',
    'hafen_rechnungen', 'sepa_laeufe', 'antraege', 'liegeplaetze', 'landplaetze', 'saisons', 'gebuehren', 'hafen_einstellungen', 'aufgaben', 'mitteilungen', 'veranstaltungen', 'zusagen'];
  const db = { rollen: [], bereich: null, finanz: false, schnapp: {}, schreibbar: new Set(), warteplatz: null, mitgliedId: null, onFehler: null };

  // Datenbankzeile ← → Oberflächen-Objekt
  const leerZuNull = (o) => { const z = {}; Object.keys(o).forEach((k) => { z[k] = o[k] === '' || o[k] === undefined ? null : o[k]; }); return z; };
  const pick = (o, sp) => { const z = {}; sp.forEach((k) => { z[k] = o[k] === undefined ? null : o[k]; }); return leerZuNull(z); };
  function zeilen(demo) {
    const heute = tag(new Date()); const finanz = demo || db.finanz;
    const z = {};
    z.mitglieder = d.mitglieder.map((m) => pick({ ...m, mandatsreferenz: m.mandat_ref, aktiv: !(m.austritt && m.austritt <= heute) }, SP.mitglieder));
    if (finanz) z.mitglieder.forEach((r, i) => { const m = d.mitglieder[i]; r.sepa = !!(m.iban && m.mandat_ref && m.mandat_datum); });
    z.mitglieder_bank = finanz ? d.mitglieder.filter((m) => m.iban || m.kontoinhaber || m.bic || m.mandat_datum).map((m) => pick({ ...m, mitglied_id: m.id }, SP.mitglieder_bank)) : [];
    ['boote', 'belegungen', 'abwesenheiten', 'gaeste', 'warteliste', 'kran', 'arbeitsdienst', 'arbeitseinsaetze', 'arbeitseinsatz_codes', 'arbeitsbereiche', 'arbeitsbereich_mitglieder', 'mitteilungen', 'veranstaltungen', 'zusagen', 'sepa_laeufe', 'antraege', 'liegeplaetze', 'landplaetze', 'saisons', 'aufgaben'].forEach((t) => { z[t] = (d[t] || []).map((o) => pick(o, SP[t])); });
    z.hafen_rechnungen = d.rechnungen.map((o) => pick(o, SP.hafen_rechnungen));
    z.gebuehren = Object.entries(d.gebuehren || {}).map(([jahr, daten]) => ({ jahr: Number(jahr), daten }));
    const { zaehler, ...einst } = d.einstellungen; // Zähler leben in den Daten selbst
    z.hafen_einstellungen = [{ id: 1, daten: einst }];
    return z;
  }
  const schluessel = (t, r) => String(r[PK[t] || 'id']);
  // Schnappschuss je Tabelle: Schlüssel → Zeile (Kopie), damit beim Speichern nur geänderte Felder übertragen werden
  function schnappschuss(z) { const s = {}; Object.entries(z).forEach(([t, liste]) => { s[t] = new Map(liste.map((r) => [schluessel(t, r), JSON.parse(JSON.stringify(r))])); }); return s; }
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function feldDiff(alt, neu) { const df = {}; Object.keys(neu).forEach((k) => { if (!gleich(alt[k], neu[k])) df[k] = neu[k]; }); return df; }

  async function verbinden(opt = {}) {
    if (!SB) return d;
    const rollen = await SB.rpc('meine_rollen');
    db.rollen = rollen || [];
    // „mitglied“: nur die eigenen Daten (Mein SSV) – auch für Funktionsträger, die ja selbst Mitglied sind
    const personal = opt.bereich !== 'mitglied' && db.rollen.some((r) => ['vorstand', 'kassenwart', 'brueckenwart', 'hafenmeister'].includes(r));
    db.finanz = db.rollen.includes('vorstand') || db.rollen.includes('kassenwart');
    db.bereich = personal ? 'personal' : 'mitglied';
    const hol = (t, sel = '*', zusatz = '') => SB.req('/rest/v1/' + t + '?select=' + sel + zusatz);
    let ich = null;
    if (!personal) {
      const u = await SB.rpc('mitglied_uebersicht');   // verknüpft das Konto beim ersten Login mit dem Mitglied
      if (!u) throw Object.assign(new Error('Zu deinem Konto ist noch kein Mitglied hinterlegt.'), { code: 'kein_mitglied' });
      const m = await SB.req('/rest/v1/mitglieder?select=id&user_id=eq.' + SB.uid());
      if (!m.length) throw Object.assign(new Error('Zu deinem Konto ist noch kein Mitglied hinterlegt.'), { code: 'kein_mitglied' });
      ich = m[0].id;
    }
    const leer = () => Promise.resolve([]);
    if (ich) {   // Mein SSV: gezielt nur die eigenen Zeilen holen
      const [mg, bank, boote, re, lp, landp, sais, geb, einst] = await Promise.all([
        hol('mitglieder', SP.mitglieder.concat(['sepa']).join(','), '&id=eq.' + ich), hol('mitglieder_bank', '*', '&mitglied_id=eq.' + ich),
        hol('boote', '*', '&eigner_id=eq.' + ich), hol('hafen_rechnungen', '*', '&mitglied_id=eq.' + ich + '&order=nr'),
        hol('liegeplaetze', '*', '&order=id'), hol('landplaetze', '*', '&order=id'), hol('saisons'),
        hol('gebuehren').catch(() => []), hol('hafen_einstellungen').catch(() => [])]);
      const ids = boote.map((b) => b.id).join(',');
      const [bel, aw] = ids ? await Promise.all([hol('belegungen', '*', '&boot_id=in.(' + ids + ')'), hol('abwesenheiten', '*', '&boot_id=in.(' + ids + ')')]) : [[], []];
      const gestern = tag(new Date(Date.now() - 864e5));
      const [eins, mitt] = await Promise.all([hol('arbeitseinsaetze', 'id,datum,titel,beginn,ende,stunden,notiz', '&datum=gte.' + gestern + '&order=datum').catch(() => []), hol('mitteilungen', '*', '&order=erstellt.desc').catch(() => [])]);
      return fertig(true, { mg, bank, boote, bel, aw, gaeste: [], warte: [], kran: [], ad: [], re, sl: [], an: [], lp, landp, sais, geb, einst, auf: [], eins, codes: [], mitt }, ich);
    }
    const daten = await Promise.all([
      hol('mitglieder', SP.mitglieder.concat(['sepa']).join(','), '&order=nachname,vorname'),
      db.finanz || !personal ? hol('mitglieder_bank') : leer(),
      hol('boote'), hol('belegungen'), hol('abwesenheiten'),
      personal ? hol('gaeste', '*', '&order=erstellt') : leer(),
      personal ? hol('warteliste', '*', '&order=datum') : leer(),
      personal ? hol('kran') : leer(), personal ? hol('arbeitsdienst') : leer(),
      db.finanz || !personal ? hol('hafen_rechnungen', '*', '&order=nr') : leer(),
      db.finanz ? hol('sepa_laeufe') : leer(), db.finanz ? hol('antraege', '*', '&order=eingang') : leer(),
      hol('liegeplaetze', '*', '&order=id'), hol('landplaetze', '*', '&order=id'), hol('saisons'),
      hol('gebuehren').catch(() => []), hol('hafen_einstellungen').catch(() => []),
      personal ? hol('aufgaben', '*', '&order=erstellt.desc').catch(() => []) : leer(),
      personal ? hol('arbeitseinsaetze', '*', '&order=datum.desc').catch(() => []) : leer(),
      personal ? hol('arbeitseinsatz_codes').catch(() => []) : leer(),
      personal ? hol('mitteilungen', '*', '&order=erstellt.desc').catch(() => []) : leer(),
      personal ? hol('arbeitsbereiche', '*', '&order=sort,name').catch(() => []) : leer(),
      personal ? hol('arbeitsbereich_mitglieder').catch(() => []) : leer(),
      personal ? hol('gast_toilette').catch(() => []) : leer(),
      personal ? hol('veranstaltungen', '*', '&order=datum.desc').catch(() => []) : leer(),
      personal ? hol('zusagen').catch(() => []) : leer()
    ]);
    const [mg, bank, boote, bel, aw, gaeste, warte, kran, ad, re, sl, an, lp, landp, sais, geb, einst, auf, eins, codes, mitt, abr, abm, wc, ver, zus] = daten;
    return fertig(false, { mg, bank, boote, bel, aw, gaeste, warte, kran, ad, re, sl, an, lp, landp, sais, geb, einst, auf, eins, codes, mitt, abr, abm, wc, ver, zus }, null);
  }
  async function fertig(mitgliedsbereich, x, ich) {
    const personal = !mitgliedsbereich;
    const { mg, bank, boote, bel, aw, gaeste, warte, kran, ad, re, sl, an, lp, landp, sais, geb, einst, auf, eins, codes, mitt, abr, abm, wc, ver, zus } = x;
    const bankVon = new Map(bank.map((b) => [b.mitglied_id, b]));
    const zahl = (o, felder) => { felder.forEach((f) => { if (o[f] != null) o[f] = Number(o[f]); }); return o; };
    d = {
      version: 2,
      einstellungen: { ...STANDARD_EINSTELLUNGEN, ...((einst[0] && einst[0].daten) || {}) },
      gebuehren: geb.length ? Object.fromEntries(geb.map((g) => [g.jahr, g.daten])) : { 2024: { ...GEBUEHREN_2024 } },
      saisons: sais,
      // nicht vorhandene Plätze (Nachtrag 12: vorhanden = false) gar nicht laden – so werden sie auch nie gespeichert oder gelöscht
      liegeplaetze: lp.filter((p) => p.vorhanden !== false).map((p) => { const z = zahl(p, ['max_laenge', 'max_breite', 'tiefe', 'sonderpreis']); delete z.vorhanden; return z; }), landplaetze: landp,
      mitglieder: mg.map((m) => { const b = bankVon.get(m.id) || {}; return { ...m, mandat_ref: m.mandatsreferenz || '', iban: b.iban || '', bic: b.bic || '', kontoinhaber: b.kontoinhaber || '', mandat_datum: b.mandat_datum || '' }; }),
      boote: boote.map((b) => zahl(b, ['laenge', 'breite', 'tiefgang', 'gewicht_t'])),
      belegungen: bel.map((b) => zahl(b, ['flaeche_m2'])), abwesenheiten: aw,
      gaeste: gaeste.map((g) => zahl(g, ['laenge', 'breite', 'tiefgang', 'betrag'])), warteliste: warte.map((w) => zahl(w, ['boot_laenge', 'boot_breite'])),
      kran, arbeitsdienst: ad.map((a) => zahl(a, ['stunden'])),
      rechnungen: re.map((r) => zahl({ ...r, zahlungen: r.zahlungen || [] }, ['summe'])), sepa_laeufe: sl.map((x) => zahl(x, ['summe'])), antraege: an,
      aufgaben: auf || [], dokumente: [], aenderungen: [],
      arbeitseinsaetze: (eins || []).map((e) => zahl(e, ['stunden'])), arbeitseinsatz_codes: codes || [], mitteilungen: mitt || [],
      toilette: (wc && wc[0]) || { code: '', regel: '', hinweis: '' },
      arbeitsbereiche: (abr || []).map((b) => ({ ...b, aufgaben: (b.aufgaben || []).map((a) => zahl({ ...a }, ['stunden'])) })), arbeitsbereich_mitglieder: abm || [],
      veranstaltungen: (ver || []).map((v) => zahl(v, ['kosten'])), zusagen: zus || [],
      zaehler: { quittung: 0 }
    };
    d.mitglieder.forEach((m) => { delete m.mandatsreferenz; delete m.sepa; delete m.aktiv; });
    // Quittungsnummern laufen über die vorhandenen Nummern weiter
    d.zaehler.quittung = d.gaeste.reduce((mx, g) => Math.max(mx, Number(String(g.quittung_nr || '').split('-').pop()) || 0), 0);
    db.bereich = personal ? 'personal' : 'mitglied';
    if (!personal) {
      db.mitgliedId = ich;
      db.warteplatz = await SB.rpc('mein_wartelistenplatz').catch(() => null);
      d.arbeitsdienst = ((await SB.rpc('mein_arbeitsdienst').catch(() => [])) || []).map((a) => ({ ...a, stunden: Number(a.stunden) }));
      d.meine_bereiche = (await SB.rpc('meine_arbeitsbereiche').catch(() => [])) || [];
      d.meine_veranstaltungen = (await SB.rpc('meine_veranstaltungen').catch(() => [])) || [];
    }
    // Was diese Person zurückschreiben darf (der Rest ist für sie nur lesbar)
    db.schreibbar = new Set(personal
      ? ['mitglieder', 'boote', 'belegungen', 'abwesenheiten', 'gaeste', 'warteliste', 'kran', 'arbeitsdienst', 'arbeitseinsaetze', 'arbeitseinsatz_codes', 'arbeitsbereiche', 'arbeitsbereich_mitglieder', 'mitteilungen', 'veranstaltungen', 'zusagen', 'liegeplaetze', 'landplaetze', 'saisons', 'aufgaben']
        .concat(db.finanz ? ['mitglieder_bank', 'hafen_rechnungen', 'sepa_laeufe', 'antraege', 'gebuehren', 'hafen_einstellungen'] : [])
      : ['abwesenheiten']);
    db.schnapp = schnappschuss(zeilen());
    return d;
  }

  let schlange = Promise.resolve();
  function dbSichern() {
    const job = async () => {
      const jetzt = zeilen(); const neuS = schnappschuss(jetzt);
      // 1. Gelöschtes zuerst (Kinder vor Eltern) – so kann ein Platz im selben Schritt neu vergeben werden
      for (const t of REIHE.slice().reverse()) {
        if (!db.schreibbar.has(t) || ['mitglieder', 'hafen_rechnungen', 'hafen_einstellungen', 'gebuehren'].includes(t)) continue;  // diese werden nie gelöscht
        const alt = db.schnapp[t] || new Map(); const weg = [...alt.keys()].filter((k) => !neuS[t].has(k));
        if (weg.length) { await SB.req('/rest/v1/' + t + '?' + (PK[t] || 'id') + '=in.(' + weg.join(',') + ')', { method: 'DELETE' }); weg.forEach((k) => alt.delete(k)); }
      }
      // 2. Neues komplett, Geändertes nur mit den geänderten Feldern (wer gleichzeitig andere Felder ändert, wird nicht überschrieben)
      for (const t of REIHE) {
        if (!db.schreibbar.has(t)) continue;
        const alt = db.schnapp[t] || (db.schnapp[t] = new Map()); const pk = PK[t] || 'id';
        const neu = jetzt[t].filter((r) => !alt.has(schluessel(t, r)));
        if (neu.length) {
          await SB.req('/rest/v1/' + t + '?on_conflict=' + pk, { method: 'POST', body: neu, prefer: 'resolution=merge-duplicates,return=minimal' });
          neu.forEach((r) => alt.set(schluessel(t, r), JSON.parse(JSON.stringify(r))));
        }
        const gruppen = new Map();   // gleiche Änderung an vielen Zeilen (z. B. SEPA-Lauf) in einem Aufruf
        jetzt[t].forEach((r) => { const k = schluessel(t, r); const o = alt.get(k); if (!o || neu.includes(r)) return;
          const df = feldDiff(o, r); if (!Object.keys(df).length) return;
          const g = JSON.stringify(df); if (!gruppen.has(g)) gruppen.set(g, { df, keys: [], rows: [] }); gruppen.get(g).keys.push(k); gruppen.get(g).rows.push(r); });
        for (const { df, keys, rows } of gruppen.values()) {
          for (let i = 0; i < keys.length; i += 100) {
            const teil = keys.slice(i, i + 100);
            await SB.req('/rest/v1/' + t + '?' + pk + '=in.(' + teil.join(',') + ')', { method: 'PATCH', body: df, prefer: 'return=minimal' });
          }
          rows.forEach((r) => alt.set(schluessel(t, r), JSON.parse(JSON.stringify(r))));
        }
      }
    };
    const lauf = schlange.then(job);
    schlange = lauf.catch(() => {});
    return lauf.catch((e) => { if (db.onFehler) { db.onFehler(e); return false; } throw e; });
  }
  // Nach einem abgelehnten Speichern (oder um Änderungen anderer zu sehen) den Stand neu aus der Datenbank holen
  async function neuLaden() { await schlange; return verbinden({ bereich: db.bereich === 'mitglied' ? 'mitglied' : undefined }); }

  /* ------------------------------------------------------------ Datensicherung zurückspielen
   * Die heruntergeladene Sicherung (JSON) wird mit dem aktuellen Stand verglichen und dann über den
   * normalen Speicherweg zurückgeschrieben: Fehlendes kommt zurück, Geändertes wird auf den Stand der
   * Sicherung gesetzt, später Hinzugekommenes wird entfernt. Mitglieder und Rechnungen werden nie
   * gelöscht (nur ergänzt/zurückgesetzt) – genau wie beim normalen Speichern. */
  const SICHER_TAB = ['mitglieder', 'boote', 'belegungen', 'abwesenheiten', 'gaeste', 'warteliste', 'kran', 'arbeitsdienst', 'arbeitseinsaetze', 'arbeitseinsatz_codes',
    'arbeitsbereiche', 'arbeitsbereich_mitglieder', 'mitteilungen', 'veranstaltungen', 'zusagen', 'rechnungen', 'sepa_laeufe', 'antraege', 'liegeplaetze', 'landplaetze', 'saisons', 'aufgaben'];
  function sicherungLesen(text) {
    let j; try { j = JSON.parse(text); } catch (e) { throw new Error('Die Datei ist keine Datensicherung (kein gültiges JSON).'); }
    const s = j && j.daten ? j.daten : j;
    if (!s || !Array.isArray(s.mitglieder) || !Array.isArray(s.liegeplaetze) || !s.einstellungen) throw new Error('Die Datei ist keine Datensicherung des Hafen-Managers.');
    const vergleich = SICHER_TAB.map((t) => ({ t, sicherung: (s[t] || []).length, jetzt: (d[t] || []).length }));
    return { erstellt: j.erstellt || '', von: j.von || '', daten: s, vergleich };
  }
  async function zurueckspielen(s) {
    if (SB) await neuLaden();   // frischer Stand der Datenbank als Vergleichsbasis
    const kopie = (x) => JSON.parse(JSON.stringify(x));
    SICHER_TAB.forEach((t) => { if (Array.isArray(s[t])) d[t] = kopie(s[t]); });
    if (s.gebuehren) d.gebuehren = kopie(s.gebuehren);
    if (s.einstellungen) d.einstellungen = { ...STANDARD_EINSTELLUNGEN, ...kopie(s.einstellungen) };
    if (!SB) { ['zaehler', 'toilette', 'bereiche_v'].forEach((k) => { if (s[k] !== undefined) d[k] = kopie(s[k]); }); }
    d.rechnungen.forEach((r) => { if (!r.zahlungen) r.zahlungen = []; });
    const ok = await sichern();
    if (ok === false) throw new Error('Zurückspielen abgebrochen – die Datenbank hat einen Teil abgelehnt (siehe Meldung).');
    if (SB) await neuLaden();
    return d;
  }

  /* ------------------------------------------------------------ Dokumente und Änderungsverlauf */
  const dok = {
    async liste(filter) {   // filter: { boot_id } | { mitglied_id } | { aufgabe_id }
      const [k, v] = Object.entries(filter)[0];
      if (!SB) return (d.dokumente || []).filter((x) => x[k] === v).map(({ inhalt, ...rest }) => rest);
      return SB.req('/rest/v1/dokumente?select=id,mitglied_id,boot_id,aufgabe_id,art,name,typ,groesse,hochgeladen,von&' + k + '=eq.' + v + '&order=hochgeladen.desc');
    },
    async inhalt(id) {
      if (!SB) return d.dokumente.find((y) => y.id === id);
      const r = await SB.req('/rest/v1/dokumente?select=*&id=eq.' + id); return r[0];
    },
    async hochladen(x, wer) {   // Funktionsträger
      const z = { id: uid('D'), hochgeladen: new Date().toISOString(), von: wer || '', ...x };
      if (!SB) { d.dokumente.push(z); await sichern(); return z.id; }
      await SB.req('/rest/v1/dokumente', { method: 'POST', body: [z], prefer: 'return=minimal' }); return z.id;
    },
    async loeschen(id) {
      if (!SB) { d.dokumente = d.dokumente.filter((x) => x.id !== id); return sichern(); }
      return SB.req('/rest/v1/dokumente?id=eq.' + id, { method: 'DELETE' });
    }
  };
  async function verlauf(opt = {}) {
    // opt.datensaetze: mehrere Datensätze auf einmal (Mitgliedsakte: Mitglied, Boote, Belegungen, Rechnungen …)
    const ids = opt.datensaetze ? opt.datensaetze.filter(Boolean).map(String) : null;
    if (!SB) { let l = (d.aenderungen || []).slice().reverse(); if (opt.tabelle) l = l.filter((x) => x.tabelle === opt.tabelle); if (opt.datensatz) l = l.filter((x) => x.datensatz === opt.datensatz); if (ids) l = l.filter((x) => ids.includes(String(x.datensatz))); return l.slice(0, opt.limit || 300); }
    if (ids && !ids.length) return [];
    return SB.req('/rest/v1/aenderungen?select=*&order=id.desc&limit=' + (opt.limit || 300) + (opt.tabelle ? '&tabelle=eq.' + opt.tabelle : '') + (opt.datensatz ? '&datensatz=eq.' + encodeURIComponent(opt.datensatz) : '') +
      (ids ? '&datensatz=in.(' + ids.filter((x) => /^[\w-]+$/.test(x)).join(',') + ')' : ''));   // IDs sind UUIDs/Wortzeichen – ohne Anführungszeichen
  }
  async function meinDatenAendern(p) { await SB.rpc('mein_daten_aendern', { p }); }

  /* ------------------------------------------------------------ Veranstaltungen */
  // Zugesagte Personen (Mitglieder plus Begleitung)
  const belegt = (vid, ohne) => (d.zusagen || []).filter((z) => z.veranstaltung_id === vid && z.antwort === 'ja' && z.mitglied_id !== ohne).reduce((s, z) => s + (Number(z.personen) || 0), 0);
  const fristEnde = (v) => v.anmeldung_bis || v.datum;
  // Kommende Veranstaltungen aus Sicht eines Mitglieds: Datenbank liefert sie fertig (ohne Namen anderer), die Demo rechnet selbst
  function meineVeranstaltungen(mid) {
    const heute = tag(new Date());
    if (d.meine_veranstaltungen) return d.meine_veranstaltungen.map((v) => ({ ...v, kosten: v.kosten == null ? null : Number(v.kosten) }));
    return (d.veranstaltungen || []).filter((v) => v.datum >= heute).sort((a, b) => a.datum.localeCompare(b.datum) || String(a.beginn || '').localeCompare(String(b.beginn || '')))
      .map((v) => ({ ...v, belegt: belegt(v.id), meine: (d.zusagen || []).find((z) => z.veranstaltung_id === v.id && z.mitglied_id === mid) || null }));
  }
  async function zusageSetzen(mid, p) {
    if (SB) { await SB.rpc('meine_zusage', { p }); return neuLaden(); }
    const heute = tag(new Date()); const v = (d.veranstaltungen || []).find((x) => x.id === p.veranstaltung_id);
    if (p.antwort !== 'ja' && p.antwort !== 'nein') throw new Error('Bitte zu- oder absagen.');
    if (!v) throw new Error('Diese Veranstaltung gibt es nicht mehr.');
    if (v.abgesagt) throw new Error('Die Veranstaltung wurde abgesagt.');
    if (v.datum < heute || heute > fristEnde(v)) throw new Error('Die Anmeldefrist ist vorbei – bitte direkt beim Vorstand melden.');
    const pers = p.antwort === 'ja' ? Number(p.personen || 1) : 0; const bg = Number(v.begleitung) || 0;
    if (p.antwort === 'ja' && (!(pers >= 1) || pers > 1 + bg)) throw new Error(bg === 0 ? 'Zu dieser Veranstaltung kannst du nur dich selbst anmelden.' : bg === 1 ? 'Du kannst eine Begleitperson mitbringen.' : 'Du kannst bis zu ' + bg + ' Begleitpersonen mitbringen.');
    if (p.antwort === 'ja' && v.max_personen) { const frei = v.max_personen - belegt(v.id, mid); if (pers > frei) throw new Error(frei <= 0 ? 'Leider ist die Veranstaltung schon ausgebucht.' : frei === 1 ? 'Es ist nur noch 1 Platz frei.' : 'Es sind nur noch ' + frei + ' Plätze frei.'); }
    if (!d.zusagen) d.zusagen = [];
    const alt = d.zusagen.find((z) => z.veranstaltung_id === v.id && z.mitglied_id === mid);
    const neu = { antwort: p.antwort, personen: pers, bemerkung: String(p.bemerkung || '').trim().slice(0, 200), quelle: 'mein-ssv', geaendert: new Date().toISOString() };
    if (alt) Object.assign(alt, neu); else d.zusagen.push({ id: uid('Z'), veranstaltung_id: v.id, mitglied_id: mid, ...neu });
    return sichern();
  }

  /* ------------------------------------------------------------ Dateien (Nachweise, Fotos) */
  const datei = {
    // Liest eine Datei als Base64; Fotos werden auf höchstens 1600 px verkleinert (spart Platz, iPhone-Fotos inklusive)
    lesen(file) {
      return new Promise((ok, fehl) => {
        if (!file) return fehl(new Error('Bitte eine Datei wählen.'));
        if (file.type === 'application/pdf') {
          if (file.size > 4e6) return fehl(new Error('Das PDF ist größer als 4 MB – bitte verkleinern oder ein Foto nehmen.'));
          const r = new FileReader(); r.onload = () => ok({ name: file.name, typ: 'application/pdf', groesse: file.size, inhalt: String(r.result).split(',')[1] });
          r.onerror = () => fehl(new Error('Die Datei konnte nicht gelesen werden.')); r.readAsDataURL(file); return;
        }
        if (!/^image\//.test(file.type)) return fehl(new Error('Bitte ein PDF oder ein Foto wählen.'));
        const url = URL.createObjectURL(file); const img = new Image();
        img.onload = () => {
          const f = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
          c.width = Math.round(img.width * f); c.height = Math.round(img.height * f); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
          const inhalt = c.toDataURL('image/jpeg', 0.82).split(',')[1];
          ok({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', typ: 'image/jpeg', groesse: Math.round(inhalt.length * 0.75), inhalt });
        };
        img.onerror = () => { URL.revokeObjectURL(url); fehl(new Error('Das Bild konnte nicht gelesen werden – bitte als JPG oder PDF.')); };
        img.src = url;
      });
    },
    // Öffnet ein gespeichertes Dokument in einem neuen Tab (Fenster sofort öffnen, sonst blockt der Browser)
    oeffnen(id) {
      const w = window.open('', '_blank');
      return dok.inhalt(id).then((x) => {
        if (!x) throw new Error('Dokument nicht gefunden.');
        const bin = atob(x.inhalt); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([a], { type: x.typ }));
        if (w) w.location.href = url; else location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 120000);
      }).catch((e) => { if (w) w.close(); throw e; });
    }
  };

  /* ------------------------------------------------------------ Abfragen */
  const H = {
    pad, tag, uid,
    geld: (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }),
    datum: (s) => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    kurz: (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '',
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    zahl: (v, n = 2) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n }),
    // GiroCode / EPC-QR-Code (EPC069-12, Version 002, UTF-8): Banking-Apps füllen damit IBAN, Betrag und Verwendungszweck aus
    epc: ({ name, iban, bic, betrag, zweck }) => ['BCD', '002', '1', 'SCT', String(bic || '').replace(/\s/g, '').toUpperCase(), String(name || '').trim().slice(0, 70),
      String(iban || '').replace(/\s/g, '').toUpperCase(), Number(betrag) > 0 ? 'EUR' + Number(betrag).toFixed(2) : '', '', '', String(zweck || '').trim().slice(0, 140)].join('\n'),
    // Dezimalzahl aus einem Eingabefeld: „8,5“ und „8.5“ gelten beide; leer/ungültig → NaN
    dez: (v) => { const t = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.'); return t === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(t) ? NaN : Number(t); },
    ART: { ausuebend: 'ausübend', probe: 'Probemitglied', foerdernd: 'fördernd', partner: 'Ehe-/Lebenspartner', jugend: 'Jugend',
      jugend_geschwister: 'Jugend (Geschwister)', ausbildung: 'in Ausbildung (ab 18)', gast: 'Saison-Gast (kein Mitglied)' },
    GESCHLECHT: { w: 'weiblich', m: 'männlich', d: 'divers' },
    periodeText: (r) => r.periode === 'veranstaltung' ? ((r.positionen && r.positionen[0] && r.positionen[0].text) || 'Veranstaltung') : r.periode === 'beitrag' ? 'Beitrag ' + r.saison : r.periode === 'sommer' ? 'Sommer ' + r.saison : 'Winter ' + r.saison + '/' + String(r.saison + 1).slice(2),
    BRUECKE: { ost: 'Ostbrücke', west: 'Westbrücke', schwimm: 'Schwimmbrücke', laengs: 'Längsseits' }
  };

  // Veranstaltungen mit Zu-/Absagen (Demo). Das Mitglied, das „Mein SSV“ zuerst zeigt, hat noch nicht geantwortet.
  function demoVeranstaltungen(mitglieder, boote) {
    const v = [
      { id: uid('V'), datum: '2026-11-28', beginn: '18:00', ende: '', titel: 'Wintertreffen mit Grünkohl', ort: 'Messe (Vereinsheim)', text: 'Rückblick auf die Saison, Grünkohl und Planung für 2027. Partnerinnen und Partner sind herzlich willkommen.',
        anmeldung_bis: '2026-11-25', max_personen: 60, begleitung: 1, kosten: 22, kosten_hinweis: 'je Person, bar vor Ort', abgesagt: false, erstellt: '2026-11-05T10:00:00', erstellt_von: 'Vorstand' },
      { id: uid('V'), datum: '2027-02-20', beginn: '15:00', ende: '', titel: 'Jahreshauptversammlung', ort: 'Messe (Vereinsheim)', text: 'Die Einladung mit Tagesordnung kommt satzungsgemäß per Post bzw. E-Mail. Die Zusage hilft uns bei der Planung von Stühlen und Kaffee.',
        anmeldung_bis: '', max_personen: null, begleitung: 0, kosten: null, kosten_hinweis: '', abgesagt: false, erstellt: '2026-11-05T10:05:00', erstellt_von: 'Vorstand' },
      { id: uid('V'), datum: '2027-05-01', beginn: '11:00', ende: '16:00', titel: 'Ansegeln 2027', ort: 'Hafen, danach Grillen an der Messe', text: 'Gemeinsam raus auf die Trave – Mitsegler finden sich vor Ort. Grillgut bitte selbst mitbringen.',
        anmeldung_bis: '2027-04-28', max_personen: null, begleitung: 3, kosten: null, kosten_hinweis: '', abgesagt: false, erstellt: '2026-11-05T10:10:00', erstellt_von: 'Vorstand' }
    ];
    const alle = mitglieder.filter((m) => m.art !== 'gast').sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
    const erster = alle.find((m) => boote.some((b) => b.eigner_id === m.id)) || alle[0];
    const andere = alle.filter((m) => m !== erster);
    const z = [];
    const BEM = ['', '', 'vegetarisch', '', '', 'ohne Fleisch, bitte', '', ''];
    andere.slice(0, 17).forEach((m, i) => z.push({ id: uid('Z'), veranstaltung_id: v[0].id, mitglied_id: m.id, antwort: i % 6 === 5 ? 'nein' : 'ja', personen: i % 6 === 5 ? 0 : (i % 3 === 0 ? 2 : 1),
      bemerkung: i % 6 === 5 ? '' : BEM[i % BEM.length], quelle: i === 4 ? 'verein' : 'mein-ssv', geaendert: '2026-11-0' + (6 + (i % 4)) + 'T19:' + String(10 + i).padStart(2, '0') + ':00' }));
    andere.slice(3, 9).forEach((m, i) => z.push({ id: uid('Z'), veranstaltung_id: v[1].id, mitglied_id: m.id, antwort: 'ja', personen: 1, bemerkung: '', quelle: 'mein-ssv', geaendert: '2026-11-08T08:3' + i + ':00' }));
    return { veranstaltungen: v, zusagen: z };
  }

  // Gewichtsgrenze für Steg und Kran – einzige Stelle, aus den Einstellungen
  // Zwei Grenzen: Kran (Standard 9 t) und Steg/Wasserliegeplatz (Standard 10 t) – nur hier, aus den Einstellungen
  const maxT = (art = 'kran') => { const e = (d && d.einstellungen) || {}; const v = Number(art === 'steg' ? e.max_gewicht_t : e.kran_max_t); return v > 0 ? v : (art === 'steg' ? 10 : 9); };
  const zuSchwer = (b, art = 'kran') => !!b && Number(b.gewicht_t) > maxT(art);
  const Q = {
    maxT, zuSchwer, maxTxt: (art = 'kran') => maxT(art).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' t',
    mitglied: (id) => d.mitglieder.find((m) => m.id === id),
    // Mitglied am Stichtag (kein Saison-Gast, eingetreten, nicht ausgetreten)
    istMitglied: (m, stichtag) => m.art !== 'gast' && (!m.eintritt || m.eintritt <= stichtag) && (!m.austritt || m.austritt > stichtag),
    alterAm: (m, stichtag) => { if (!m.geburtsdatum) return null; const [j, mo, t] = m.geburtsdatum.split('-').map(Number); const [sj, sm, st] = stichtag.split('-').map(Number); return sj - j - (sm < mo || (sm === mo && st < t) ? 1 : 0); },
    naechsteNr: () => String(d.mitglieder.reduce((mx, m) => Math.max(mx, /^\d+$/.test(m.nr) ? Number(m.nr) : 0), 2000) + 1),
    boot: (id) => d.boote.find((b) => b.id === id),
    platz: (id) => d.liegeplaetze.find((p) => p.id === id) || d.landplaetze.find((p) => p.id === id),
    name: (m) => m ? m.vorname + ' ' + m.nachname : '–',
    belegungen: (saison, periode) => d.belegungen.filter((b) => b.saison === saison && b.periode === periode),
    belegungPlatz: (saison, periode, platzId) => d.belegungen.find((b) => b.saison === saison && b.periode === periode && b.platz_id === platzId),
    belegungBoot: (saison, periode, bootId) => d.belegungen.find((b) => b.saison === saison && b.periode === periode && b.boot_id === bootId),
    booteVon: (mid) => d.boote.filter((b) => b.eigner_id === mid),
    abwesendAm: (platzId, datum) => d.abwesenheiten.find((a) => a.platz_id === platzId && a.von <= datum && a.bis >= datum),
    gastAm: (platzId, datum) => d.gaeste.find((g) => g.platz_id === platzId && g.status !== 'storniert' && g.ankunft <= datum && tag(new Date(new Date(g.ankunft + 'T12:00:00').getTime() + g.naechte * 864e5)) > datum),
    // Status eines Wasserplatzes an einem Tag der Sommersaison
    statusWasser(p, saison, datum) {
      if (p.gesperrt) return 'gesperrt';
      const gast = Q.gastAm(p.id, datum);
      const bel = Q.belegungPlatz(saison, 'sommer', p.id);
      if (gast) return 'gast';
      if (bel && Q.abwesendAm(p.id, datum)) return 'unterwegs';
      if (bel) return bel.art === 'saisongast' ? 'saisongast' : 'belegt';
      return 'frei';
    },
    statusLand(p, saison, periode) { return Q.belegungPlatz(saison, periode, p.id) ? 'belegt' : 'frei'; },
    passt(boot, platz) {
      const probleme = [];
      if (platz.max_laenge && boot.laenge > platz.max_laenge) probleme.push('Länge ' + H.zahl(boot.laenge) + ' m > ' + H.zahl(platz.max_laenge, 1) + ' m');
      if (platz.max_breite && boot.breite > platz.max_breite) probleme.push('Breite ' + H.zahl(boot.breite) + ' m > ' + H.zahl(platz.max_breite, 1) + ' m');
      if (zuSchwer(boot, 'steg')) probleme.push('Gewicht ' + H.zahl(boot.gewicht_t, 1) + ' t > ' + Q.maxTxt('steg'));
      return probleme;
    },
    // Rechnungen: gezahlt, Rest und Status (Teilzahlung, Rücklastschrift)
    gezahlt: (r) => Math.round((r.zahlungen || []).reduce((s, z) => s + (z.art === 'ruecklastschrift' ? -1 : 1) * Number(z.betrag || 0), 0) * 100) / 100,
    rest(r) { if (r.storniert_am || r.bezahlt_am) return 0; return Math.max(0, Math.round((Number(r.summe) - Q.gezahlt(r)) * 100) / 100); },
    rstatus(r, heute) {
      if (r.storniert_am) return 'storniert'; const z = r.zahlungen || []; const letzte = z[z.length - 1];
      if (r.bezahlt_am) return 'bezahlt';
      if (letzte && letzte.art === 'ruecklastschrift') return 'ruecklastschrift';
      if (Q.gezahlt(r) > 0) return 'teilbezahlt';
      return r.faellig < heute ? 'ueberfaellig' : 'offen';
    },
    versicherungsStatus(boot, heute) {
      if (!boot.vers_bis) return 'fehlt';
      if (boot.vers_bis < heute) return 'abgelaufen';
      const in30 = tag(new Date(new Date(heute + 'T12:00:00').getTime() + 30 * 864e5));
      return boot.vers_bis <= in30 ? 'bald' : 'ok';
    }
  };

  // Kommazahlen: <input type="number" step="0.1"> verschluckt im Browser das Komma („8,5“ → 85).
  // Solche Felder werden darum zu Textfeldern mit Zahlentastatur; Komma und Punkt gelten, min/max prüfen wir selbst.
  const DEZ_TXT = {
    de: (a, z) => 'Bitte eine Zahl ' + (z == null ? 'ab ' + a : a == null ? 'bis ' + z : 'zwischen ' + a + ' und ' + z) + ' eingeben (z. B. 8,5).',
    en: (a, z) => 'Please enter a number ' + (z == null ? 'from ' + a : a == null ? 'up to ' + z : 'between ' + a + ' and ' + z) + ' (e.g. 8.5).',
    da: (a, z) => 'Indtast et tal ' + (z == null ? 'fra ' + a : a == null ? 'op til ' + z : 'mellem ' + a + ' og ' + z) + ' (f.eks. 8,5).'
  };
  function dezPruefen(el) {
    const t = el.value.trim(); if (t === '') { el.setCustomValidity(''); return; }
    const v = H.dez(t); const a = el.dataset.dmin === undefined ? null : Number(el.dataset.dmin); const z = el.dataset.dmax === undefined ? null : Number(el.dataset.dmax);
    const lang = (document.documentElement.lang || 'de').slice(0, 2); const de = (a2, z2) => String(a2 == null ? '' : a2).replace('.', ',') ;
    const fmt = (x) => x == null ? null : (lang === 'en' ? String(x) : de(x));
    el.setCustomValidity(isNaN(v) || (a != null && v < a) || (z != null && v > z) ? (DEZ_TXT[lang] || DEZ_TXT.de)(fmt(a), fmt(z)) : '');
  }
  function dezUmbauen(wurzel) {
    if (!wurzel.querySelectorAll) return;
    const liste = wurzel.matches && wurzel.matches('input[type=number]') ? [wurzel] : wurzel.querySelectorAll('input[type=number]');
    liste.forEach((el) => {
      const st = el.getAttribute('step') || ''; if (!(st.includes('.') || st === 'any')) return;   // ganze Zahlen (Nächte, Minuten) bleiben
      const wert = el.value;
      if (el.hasAttribute('min')) el.dataset.dmin = el.getAttribute('min'); if (el.hasAttribute('max')) el.dataset.dmax = el.getAttribute('max');
      ['min', 'max', 'step'].forEach((k) => el.removeAttribute(k));
      el.type = 'text'; el.setAttribute('inputmode', 'decimal'); el.setAttribute('autocomplete', 'off'); el.dataset.dez = '1';
      // vorhandene Werte deutsch mit Komma zeigen (nicht auf der mehrsprachigen Gast-Seite in Englisch)
      if (wert !== '' && (document.documentElement.lang || 'de').startsWith('de')) el.value = wert.replace('.', ',');
    });
  }
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    const los = () => { dezUmbauen(document.body); new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) dezUmbauen(n); }))).observe(document.body, { childList: true, subtree: true }); };
    if (document.body) los(); else document.addEventListener('DOMContentLoaded', los);
    document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.dez) dezPruefen(e.target); }, true);
    document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.dez) dezPruefen(e.target); }, true);
  }

  // Toilettencode ändern: Demo im Browser, Datenbank direkt in gast_toilette (Hafenmeister darf das ohne Zugriff auf die Einstellungen)
  async function toiletteSetzen(neu) {
    const daten = { code: String(neu.code || '').trim(), regel: neu.regel || '', hinweis: String(neu.hinweis || '').trim() };
    if (SB && db.bereich === 'personal') await SB.req('/rest/v1/gast_toilette?id=eq.1', { method: 'PATCH', body: { ...daten, geaendert: new Date().toISOString(), geaendert_von: HF_wer() }, prefer: 'return=minimal' });
    d.toilette = { ...(d.toilette || {}), ...daten };
    if (!SB) sichern();
    return d.toilette;
  }
  const HF_wer = () => (window.HAFEN && window.HAFEN.wer) || '';

  window.HAFEN = { laden, sichern, zuruecksetzen, get d() { return d; }, H, Q, STANDARD_EINSTELLUNGEN, GEBUEHREN_2024, demoIban,
    modus: SB ? 'supabase' : 'demo', verbinden, neuLaden, db, sicherungLesen, zurueckspielen, toiletteSetzen, meinDatenAendern, meineVeranstaltungen, zusageSetzen, veranstaltungBelegt: (vid) => belegt(vid), dok, datei, verlauf, wer: '',
    // Laufende Saison: ab dem Auslagern gilt das neue Jahr, davor (Januar–April) noch das Winterlager des Vorjahres.
    // ?saison=2027 in der Adresse wählt eine andere.
    aktuelleSaison() {
      const wahl = Number(new URLSearchParams(location.search).get('saison')); if (wahl > 2000) return wahl;
      const heute = tag(new Date()); const j = Number(heute.slice(0, 4));
      const s = ((d && d.saisons) || []).find((x) => x.jahr === j); return heute < ((s && s.auslagern) || j + '-04-15') ? j - 1 : j;
    } };
})();
