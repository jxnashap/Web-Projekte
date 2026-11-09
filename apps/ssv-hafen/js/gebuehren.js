/* SSV Hafen-Manager – Gebühren-Rechner
 *
 * Setzt die Gebührenordnung (Stand 2024) um:
 *   Sommer, Wasserliegeplatz
 *     ausübend/Probe: Sommerliegegebühr[Box] + Umlage Wasserpacht[Box] (+ Stromumlage)
 *     fördernd:       Sommerlieger[Box]
 *     Saison-Gast:    Gast-Sommerlieger[Box]
 *     Längsseits:     Sonderpreis je Platz
 *   Sommer an Land:   Palette 100 €/Halbjahr bzw. m² × 4 € – ab dem 2. Sommer in Folge jeweils +100 %
 *   Winter an Land:   Palette 100 €, außen m² × 4 €, Halle m² × 6 €
 *   Kran:             je angefangene Stunde (Schiffskran 75 €, Mastenkran 25 €)
 */
(function () {
  'use strict';

  const ct = (v) => Math.round(Number(v) * 100);
  const eur = (c) => Math.round(c) / 100;

  function gebuehrenFuer(d, saison) {
    const jahre = Object.keys(d.gebuehren).map(Number).sort((a, b) => a - b);
    const passend = jahre.filter((j) => j <= saison).pop() || jahre[0];
    return d.gebuehren[passend];
  }
  function saisonDaten(d, saison) {
    return d.saisons.find((s) => s.jahr === saison) || { jahr: saison, auslagern: saison + '-04-15', einlagern: saison + '-10-20' };
  }
  function flaeche(d, bel, boot) {
    if (bel.flaeche_m2) return bel.flaeche_m2;
    const z = Number(d.einstellungen.flaeche_aufschlag_m || 0);
    return Math.ceil((boot.laenge + z) * (boot.breite + z));
  }

  /* Positionen je Mitglied für eine Periode berechnen */
  function vorschau(d, saison, periode, stichtag) {
    const gb = gebuehrenFuer(d, saison);
    const e = d.einstellungen;
    const proM = new Map();
    const pos = (mid, p) => { if (!proM.has(mid)) proM.set(mid, []); proM.get(mid).push(p); };
    const P = (text, menge, einheit, einzelpreis) => ({ text, menge, einheit, einzelpreis, betrag: eur(ct(einzelpreis) * menge) });
    const label = periode === 'sommer' ? 'Sommer ' + saison : 'Winter ' + saison + '/' + String(saison + 1).slice(2);

    // Mitgliedsbeitrag: jedes Mitglied, das am 1.1. des Jahres Mitglied ist (bzw. im Jahr eintritt)
    if (periode === 'beitrag') {
      const B = gb.beitraege || window.HAFEN.GEBUEHREN_2024.beitraege;
      const A = window.HAFEN.H.ART;
      d.mitglieder.filter((m) => m.art !== 'gast' && (!m.eintritt || m.eintritt <= saison + '-12-31') && (!m.austritt || m.austritt > saison + '-01-01')).forEach((m) => {
        const b = B[m.art]; if (!b) return;
        pos(m.id, P('Vereinsbeitrag ' + saison + ' (' + A[m.art] + ')', 1, 'Jahr', b.verein));
        if (b.verband) pos(m.id, P('Verbandsbeitrag ' + saison + ' (wird an den Segler-Verband weitergegeben)', 1, 'Jahr', b.verband));
        if (m.art === 'probe') pos(m.id, P('Eintrittsgeld Probemitglied (je Probejahr)', 1, 'Jahr', gb.eintrittsgeld_probe != null ? gb.eintrittsgeld_probe : 130));
      });
    }

    if (periode !== 'beitrag') d.belegungen.filter((b) => b.saison === saison && b.periode === periode).forEach((bel) => {
      const boot = d.boote.find((x) => x.id === bel.boot_id); if (!boot) return;
      const m = d.mitglieder.find((x) => x.id === boot.eigner_id); if (!m) return;
      const bootTxt = ' · „' + boot.name + '“';
      if (bel.platz_typ === 'wasser') {
        const p = d.liegeplaetze.find((x) => x.id === bel.platz_id);
        if (p.box === 'L') { pos(m.id, P('Längsseits-Liegeplatz ' + p.nr + ' – ' + label + bootTxt, 1, 'Saison', p.sonderpreis || 0)); return; }
        if (m.art === 'ausuebend' || m.art === 'probe') {
          pos(m.id, P('Sommerliegegebühr Box ' + p.box + ', Platz ' + p.nr + bootTxt, 1, 'Saison', gb.sommerliegegebuehr[p.box]));
          pos(m.id, P('Umlage Wasserpacht Box ' + p.box, 1, 'Saison', gb.wasserpacht[p.box]));
          if (e.stromumlage_ueber_hafen && p.strom && !proM.get(m.id).some((x) => x.text === 'Stromumlage')) pos(m.id, P('Stromumlage', 1, 'Saison', gb.stromumlage));
        } else if (m.art === 'foerdernd') {
          pos(m.id, P('Sommerliegeplatz Box ' + p.box + ', Platz ' + p.nr + ' (förderndes Mitglied)' + bootTxt, 1, 'Saison', gb.foerdernd_sommer[p.box]));
        } else {
          pos(m.id, P('Saison-Gastliegeplatz Box ' + p.box + ', Platz ' + p.nr + bootTxt, 1, 'Saison', gb.gast_saison[p.box]));
        }
      } else {
        const lp = d.landplaetze.find((x) => x.id === bel.platz_id);
        const faktor = periode === 'sommer' ? Math.pow(2, Math.max(0, (bel.sommer_an_land_jahr || 1) - 1)) : 1;
        const zusatz = faktor > 1 ? ' (' + bel.sommer_an_land_jahr + '. Sommer an Land, ×' + faktor + ')' : '';
        const was = periode === 'sommer' ? 'Sommerstellplatz an Land' : 'Winterlager';
        if (lp.art === 'palette') pos(m.id, P(was + ', ' + lp.bez + zusatz + bootTxt, 1, 'Halbjahr', gb.palette_halbjahr * faktor));
        else {
          const m2 = flaeche(d, bel, boot);
          const satz = lp.art === 'halle' ? gb.land_halle_m2 : gb.land_aussen_m2;
          pos(m.id, P(was + ', ' + lp.bez + zusatz + bootTxt, m2, 'm²', satz * faktor));
        }
      }
    });

    // Alle noch offenen Kran-Einsätze bis zum Stichtag – sie laufen mit der nächsten Abrechnung mit
    const bis = stichtag || window.HAFEN.H.tag(new Date());
    if (periode !== 'beitrag') d.kran.filter((k) => !k.abgerechnet && k.datum <= bis).forEach((k) => {
      const boot = d.boote.find((x) => x.id === k.boot_id); if (!boot) return;
      const std = Math.max(1, Math.ceil(k.minuten / 60));
      const preis = k.art === 'mast' ? gb.mastenkran_std : gb.schiffskran_std;
      const p = P((k.art === 'mast' ? 'Mastenkran' : 'Schiffskran') + ' am ' + new Date(k.datum + 'T12:00:00').toLocaleDateString('de-DE') + ' (' + k.minuten + ' Min.)' + ' · „' + boot.name + '“', std, 'angef. Std.', preis);
      p.kran_id = k.id;
      pos(boot.eigner_id, p);
    });

    const schon = new Set(d.rechnungen.filter((r) => r.saison === saison && r.periode === periode && !r.storniert_am).map((r) => r.mitglied_id));
    return [...proM.entries()].map(([mid, positionen]) => {
      const m = d.mitglieder.find((x) => x.id === mid);
      return { m, positionen, summe: eur(positionen.reduce((s, p) => s + ct(p.betrag), 0)), schon_abgerechnet: schon.has(mid) };
    }).sort((a, b) => a.m.nachname.localeCompare(b.m.nachname, 'de') || a.m.vorname.localeCompare(b.m.vorname, 'de'));
  }

  /* Rechnungen für alle noch nicht abgerechneten Mitglieder erzeugen */
  function saisonAbrechnen(d, saison, periode, datum) {
    const e = d.einstellungen;
    const jahr = datum.slice(0, 4);
    const praefix = (periode === 'beitrag' ? (e.beitrag_praefix || 'SSV-B') : (e.rechnung_praefix || 'SSV-H')) + '-' + jahr + '-';
    let lfd = d.rechnungen.filter((r) => r.nr.startsWith(praefix)).reduce((mx, r) => Math.max(mx, parseInt(r.nr.slice(praefix.length), 10)), 0);
    const faellig = new Date(datum + 'T12:00:00'); faellig.setDate(faellig.getDate() + Number(e.zahlungsziel_tage || 14));
    const neu = [];
    vorschau(d, saison, periode, datum).filter((x) => !x.schon_abgerechnet && x.summe > 0).forEach((x) => {
      const m = x.m; lfd += 1;
      const re = {
        id: window.HAFEN.H.uid('R'), nr: praefix + String(lfd).padStart(4, '0'), mitglied_id: m.id, datum, saison, periode,
        faellig: window.HAFEN.H.tag(faellig), positionen: x.positionen.map(({ kran_id, ...p }) => p), summe: x.summe,
        empfaenger: { nr: m.nr, vorname: m.vorname, nachname: m.nachname, strasse: m.strasse, plz: m.plz, ort: m.ort, email: m.email, art: m.art },
        sepa: !!(m.iban && m.mandat_ref && m.mandat_datum), mandat_ref: m.mandat_ref || '', mandat_datum: m.mandat_datum || '',
        bezahlt_am: null, storniert_am: null, sepa_lauf: null
      };
      x.positionen.forEach((p) => { if (p.kran_id) { const k = d.kran.find((kk) => kk.id === p.kran_id); if (k) k.abgerechnet = re.nr; } });
      d.rechnungen.push(re); neu.push(re);
    });
    return neu;
  }

  function stornieren(d, id) {
    const re = d.rechnungen.find((r) => r.id === id); if (!re || re.storniert_am) return;
    re.storniert_am = new Date().toISOString();
    d.kran.forEach((k) => { if (k.abgerechnet === re.nr) k.abgerechnet = ''; });
  }

  window.HAFEN_GEBUEHREN = { vorschau, saisonAbrechnen, stornieren, gebuehrenFuer, saisonDaten, flaeche };
})();
