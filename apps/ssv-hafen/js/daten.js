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
  const uid = (p) => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

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
    rechnung_praefix: 'SSV-H',
    zahlungsziel_tage: 14,
    stromumlage_ueber_hafen: true,
    arbeitsdienst_soll: 15,
    flaeche_aufschlag_m: 0,
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
    schluesselpfand: 50
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
    for (let nr = 1; nr <= 79; nr++) {
      const b = box(nr);
      lp.push({ id: 'LP' + pad(nr), nr: String(nr), bruecke: nr <= 24 ? 'ost' : nr <= 70 ? 'west' : 'schwimm', box: b,
        max_laenge: MASSE[b][0], max_breite: MASSE[b][1], strom: true, gesperrt: false, sonderpreis: null, notiz: '' });
    }
    lp.push({ id: 'LPL1', nr: 'L1', bruecke: 'laengs', box: 'L', max_laenge: 12, max_breite: 4, strom: true, gesperrt: false, sonderpreis: 450, notiz: 'Längsseits – Sondertarif [PLATZHALTER]' });
    lp.push({ id: 'LPL2', nr: 'L2', bruecke: 'laengs', box: 'L', max_laenge: 12, max_breite: 4, strom: false, gesperrt: false, sonderpreis: 450, notiz: 'Längsseits – Sondertarif [PLATZHALTER]' });
    return lp;
  }

  function landplaetze() {
    const lp = [];
    for (let i = 1; i <= 40; i++) lp.push({ id: 'P' + pad(i), bez: 'Palette ' + i, art: 'palette', bereich: i <= 20 ? 'nord' : 'west' });
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
      boote.push(bt); return bt;
    }

    // Sommer 2026: Dauerlieger + Saisongäste + freie Plätze
    const frei = new Set(['LP19', 'LP41', 'LP58', 'LP66', 'LP77', 'LPL2']);
    const gesperrt = 'LP52';
    const saisongast = new Set(['LP33', 'LP47', 'LPL1']);
    const foerdernd = new Set(['LP09', 'LP27', 'LP38', 'LP55', 'LP64', 'LP72', 'LP14', 'LP45']);
    const probe = new Set(['LP05', 'LP30', 'LP44', 'LP61', 'LP74', 'LP23']);
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
    boote[3].gewicht_t = 10.4; boote[3].notiz = 'Gewicht über 10 t – laut Hafenbetriebsordnung nicht zulässig [BEISPIEL]';
    // Zwei Boote bleiben im Sommer an Land (Sommerlagerung, Verdopplungsregel)
    const landSommer = [mitglied('ausuebend'), mitglied('ausuebend')];
    const bLand1 = boot(landSommer[0], 'II'), bLand2 = boot(landSommer[1], 'III');
    belegungen.push({ id: uid('BL'), saison: 2026, periode: 'sommer', boot_id: bLand1.id, platz_typ: 'land', platz_id: 'P38', art: 'dauer', flaeche_m2: null, sommer_an_land_jahr: 1, nicht_kranen: true, notiz: '' });
    belegungen.push({ id: uid('BL'), saison: 2026, periode: 'sommer', boot_id: bLand2.id, platz_typ: 'land', platz_id: 'A6', art: 'dauer', flaeche_m2: Math.ceil(bLand2.laenge * bLand2.breite), sommer_an_land_jahr: 2, nicht_kranen: true, notiz: 'Zweiter Sommer an Land – Gebühr verdoppelt' });

    // Winter 2026/27: Mitglieder-Boote an Land (Paletten, Halle, außen); Gäste & Fördernde nicht (Landplätze nur für ausübende/Probe)
    const landBerechtigt = boote.filter((b) => { const m = mitglieder.find((x) => x.id === b.eigner_id); return m.art === 'ausuebend' || m.art === 'probe'; });
    let p = 0, h = 0, a = 0;
    landBerechtigt.forEach((b, i) => {
      if (i % 9 === 4) return; // einige bleiben woanders im Winterlager
      let platz, typ, fl = null;
      if (b.laenge >= 9.5 && h < 4) { platz = 'H' + (++h); typ = 'halle'; fl = Math.ceil(b.laenge * b.breite); }
      else if (p < 40) { platz = 'P' + pad(++p); typ = 'palette'; }
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
      { id: uid('G'), bootsname: 'Hav', skipper: 'Mette Larsen', herkunft: 'Svendborg (DK)', tel: '', email: '', laenge: 8.4, breite: 2.9, ankunft: '2026-08-15', naechte: 1, platz_id: 'LP19', betrag: 15, zahlung: 'offen', quittung_nr: '', status: 'eingewiesen', quelle: 'hafenmeister', erstellt: '2026-08-15T16:05:00' },
      { id: uid('G'), bootsname: 'Elbe 3', skipper: 'Thomas Brandes', herkunft: 'Hamburg', tel: '0170 0000000', email: '', laenge: 11.2, breite: 3.6, ankunft: '2026-08-15', naechte: 2, platz_id: 'LPL2', betrag: 30, zahlung: 'ueberweisung', quittung_nr: 'Q-2026-042', status: 'eingewiesen', quelle: 'hafenmeister', erstellt: '2026-08-15T18:40:00' },
      { id: uid('G'), bootsname: 'Seute Deern II', skipper: 'Karl Behn', herkunft: 'Neustadt i. H.', tel: '', email: '', laenge: 7.6, breite: 2.7, ankunft: '2026-08-15', naechte: 1, platz_id: '', betrag: 15, zahlung: 'offen', quittung_nr: '', status: 'angemeldet', quelle: 'qr', erstellt: '2026-08-15T19:12:00' },
      { id: uid('G'), bootsname: 'Lykke', skipper: 'Jens Holm', herkunft: 'Aarhus (DK)', tel: '', email: '', laenge: 9.1, breite: 3.1, ankunft: '2026-07-02', naechte: 2, platz_id: 'LP41', betrag: 30, zahlung: 'bar', quittung_nr: 'Q-2026-027', status: 'abgereist', quelle: 'hafenmeister', erstellt: '2026-07-02T15:00:00' }
    ];

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

    return { version: 1, einstellungen: { ...STANDARD_EINSTELLUNGEN, glaeubiger_id: 'DE98ZZZ09999999999', iban: demoIban('23050101', 1234567), bic: 'NOLADE21SPL', bank: 'Demo-Sparkasse [PLATZHALTER]' },
      gebuehren: { 2026: { ...GEBUEHREN_2024 } }, saisons: [{ jahr: 2026, auslagern: '2026-04-11', einlagern: '2026-10-24' }],
      liegeplaetze: lp, landplaetze: landplaetze(), mitglieder, boote, belegungen, abwesenheiten, gaeste, warteliste, kran, arbeitsdienst, rechnungen: [], sepa_laeufe: [], zaehler: { quittung: 42 } };
  }

  /* ------------------------------------------------------------ Speicher */
  let d;
  function laden() {
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
    if (!d || d.version !== 1) {
      d = beispieldaten();
      if (window.HAFEN_GEBUEHREN && window.HAFEN_GEBUEHREN.saisonAbrechnen) {
        // Sommer 2026 wurde im April abgerechnet und bezahlt – als Historie anlegen
        window.HAFEN_GEBUEHREN.saisonAbrechnen(d, 2026, 'sommer', '2026-04-20').forEach((re) => { re.bezahlt_am = '2026-05-05'; re.sepa_lauf = 'SEPA-2026-04'; });
      }
      sichern();
    }
    return d;
  }
  function sichern() { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { console.warn('Demo-Daten nicht gespeichert', e); } }
  function zuruecksetzen() { try { localStorage.removeItem(KEY); } catch (e) { /* egal */ } return laden(); }

  /* ------------------------------------------------------------ Abfragen */
  const H = {
    pad, tag, uid,
    geld: (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }),
    datum: (s) => s ? new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    kurz: (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '',
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    zahl: (v, n = 2) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n }),
    ART: { ausuebend: 'ausübend', probe: 'Probemitglied', foerdernd: 'fördernd', gast: 'Saison-Gast' },
    BRUECKE: { ost: 'Ostbrücke', west: 'Westbrücke', schwimm: 'Schwimmbrücke', laengs: 'Längsseits' }
  };

  const Q = {
    mitglied: (id) => d.mitglieder.find((m) => m.id === id),
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
      if (boot.gewicht_t > 10) probleme.push('Gewicht ' + H.zahl(boot.gewicht_t, 1) + ' t > 10 t');
      return probleme;
    },
    versicherungsStatus(boot, heute) {
      if (!boot.vers_bis) return 'fehlt';
      if (boot.vers_bis < heute) return 'abgelaufen';
      const in30 = tag(new Date(new Date(heute + 'T12:00:00').getTime() + 30 * 864e5));
      return boot.vers_bis <= in30 ? 'bald' : 'ok';
    }
  };

  window.HAFEN = { laden, sichern, zuruecksetzen, get d() { return d; }, H, Q, STANDARD_EINSTELLUNGEN, GEBUEHREN_2024, demoIban };
})();
