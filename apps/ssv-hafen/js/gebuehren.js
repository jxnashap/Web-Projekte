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
        // Fehlstunden Arbeitsdienst des Vorjahres – nur, wenn der Vorstand einen Satz beschlossen hat
        const satz = Number(e.arbeitsdienst_satz || 0);
        if (satz > 0 && e.arbeitsdienst_bestaetigt) { const a = arbeitsdienst(d, saison - 1, m); if (a.pflicht && a.erfasst && a.fehl > 0) pos(m.id, P('Arbeitsdienst ' + (saison - 1) + ': nicht geleistete Stunden', a.fehl, 'Std.', satz)); }
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
        if (!lp) return;   // Platz gibt es nicht mehr (z. B. nach Umbenennung) – erscheint unter „Belegung“ als Hinweis, nicht als Absturz
        const faktor = periode === 'sommer' ? Math.pow(2, Math.max(0, (bel.sommer_an_land_jahr || 1) - 1)) : 1;
        const zusatz = faktor > 1 ? ' (' + bel.sommer_an_land_jahr + '. Sommer an Land, ×' + faktor + ')' : '';
        const was = periode === 'sommer' ? 'Sommerstellplatz an Land' : 'Winterlager';
        // Platzname wie im Hafenplan mit Lage: „Lagerplatz P13 (Nordlager)“ – zentral in daten.js (Q.platzName), nicht mehr „Palette 13“
        const platzTxt = window.HAFEN.Q.platzName(lp, 'text');
        if (lp.art === 'palette') pos(m.id, P(was + ', ' + platzTxt + zusatz + bootTxt, 1, 'Halbjahr', gb.palette_halbjahr * faktor));
        else {
          const m2 = flaeche(d, bel, boot);
          const satz = lp.art === 'halle' ? gb.land_halle_m2 : gb.land_aussen_m2;
          pos(m.id, P(was + ', ' + platzTxt + zusatz + bootTxt, m2, 'm²', satz * faktor));
        }
      }
    });

    // Alle noch offenen Kran-Einsätze bis zum Stichtag – sie laufen mit der nächsten Abrechnung mit
    const bis = stichtag || window.HAFEN.H.tag(new Date());
    if (periode !== 'beitrag') d.kran.filter((k) => !k.abgerechnet && k.datum <= bis).forEach((k) => {
      const boot = d.boote.find((x) => x.id === k.boot_id); if (!boot) return;
      const std = Math.max(1, Math.ceil(k.minuten / 60));
      const preis = k.art === 'mast' ? gb.mastenkran_std : gb.schiffskran_std;
      const p = P((k.art === 'mast' ? 'Mastenkran' : 'Schiffskran') + ' am ' + window.HAFEN.H.datum(k.datum) + ' (' + k.minuten + ' Min.)' + ' · „' + boot.name + '“', std, 'angef. Std.', preis);
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
        bezahlt_am: null, storniert_am: null, sepa_lauf: null, zahlungen: []
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

  /* Arbeitsdienst eines Mitglieds in einem Jahr – Regeln aus den Einstellungen:
   * Soll je Jahr für ausübende und Probemitglieder, Befreiung je Mitglied oder ab einem Alter,
   * auf Wunsch zählen die Fehlstunden des Vorjahres mit. */
  function arbeitsdienst(d, jahr, m) {
    const e = d.einstellungen, H = window.HAFEN.H, Q = window.HAFEN.Q;
    const soll = Number(e.arbeitsdienst_soll || 0), abAlter = Number(e.arbeitsdienst_befreit_ab || 0);
    const pflichtIm = (j) => (m.art === 'ausuebend' || m.art === 'probe') && (!m.eintritt || m.eintritt <= j + '-12-31') && (!m.austritt || m.austritt > j + '-01-01');
    const befreitIm = (j) => m.arbeitsdienst_befreit ? m.arbeitsdienst_befreit : (abAlter && Q.alterAm(m, j + '-01-01') >= abAlter ? 'ab ' + abAlter + ' Jahren' : '');
    const zaehlt = (a) => !a.status || a.status === 'bestaetigt';
    const istIm = (j) => (d.arbeitsdienst || []).filter((a) => a.mitglied_id === m.id && zaehlt(a) && String(a.datum).startsWith(String(j))).reduce((s, a) => s + Number(a.stunden || 0), 0);
    const gemeldet = (d.arbeitsdienst || []).filter((a) => a.mitglied_id === m.id && a.status === 'eingereicht' && String(a.datum).startsWith(String(jahr))).reduce((s, a) => s + Number(a.stunden || 0), 0);
    const erfasstIm = (j) => (d.arbeitsdienst || []).some((a) => String(a.datum).startsWith(String(j)));
    const fehlIm = (j) => (pflichtIm(j) && !befreitIm(j) && erfasstIm(j)) ? Math.max(0, soll - istIm(j)) : 0;
    const vorjahr = e.arbeitsdienst_vorjahr ? fehlIm(jahr - 1) : 0;
    const befreit = befreitIm(jahr), pflicht = pflichtIm(jahr), ist = istIm(jahr);
    const sollJ = pflicht && !befreit ? soll : 0;
    return { pflicht, befreit, soll: sollJ, ist, gemeldet, vorjahr, fehl: Math.max(0, sollJ - ist) + vorjahr, erfasst: erfasstIm(jahr) };
  }

  /* ---------------------------------------------------------- Finanzen (Hafen-Manager „Finanzen“ und Druckseiten)
   * Zwei Sichten, klar getrennt:
   *   Eingänge  – nach Zahlungsdatum (Kontoauszug, Quittung, „bezahlt am“): „Was kam im Monat/Geschäftsjahr rein?“
   *   Abgerechnet – nach Abrechnungsjahr (r.saison; Gäste nach Ankunftsjahr, Getränke nach Rechnungsdatum): Soll, Ist, Offen
   * kasse = Monatsrechnungen der Getränkekasse ([] wenn die Kasse nicht verbunden ist). Ausgaben und Bankbestand gibt es hier nicht. */
  const FIN_BEREICHE = [['beitrag', 'Beiträge'], ['sommer', 'Sommerliegeplatz'], ['winter', 'Winterlager'], ['gast', 'Gastlieger-Hafengeld'], ['veranstaltung', 'Veranstaltungen'], ['getraenke', 'Getränke']];
  const FIN_ZAHLART = { bar: 'bar', ueberweisung: 'Überweisung', paypal: 'PayPal', karte: 'Karte', offen: 'Zahlart offen' };
  const t10 = (x) => String(x || '').slice(0, 10);
  const wer = (em) => em ? ((em.vorname || '') + ' ' + (em.nachname || '')).trim() + (em.nr ? ' (' + em.nr + ')' : '') : '';
  function finEingaenge(d, kasse) {
    const l = [];
    d.rechnungen.filter((r) => !r.storniert_am).forEach((r) => {
      const z = r.zahlungen || [];
      if (z.length) z.forEach((x) => { const rueck = x.art === 'ruecklastschrift'; const n = String(x.notiz || '');
        const art = rueck ? 'Rücklastschrift' : /^Lastschrift/.test(n) ? 'Lastschrift' : /Überweisung/.test(n) ? 'Überweisung' : 'von Hand gebucht';
        l.push({ datum: t10(x.datum), betrag: (rueck ? -1 : 1) * Number(x.betrag || 0), bereich: r.periode, nr: r.nr, wer: wer(r.empfaenger), zahlart: art, beleg: [n, x.ref ? 'Umsatz ' + x.ref : ''].filter(Boolean).join(' · ') }); });
      else if (r.bezahlt_am) l.push({ datum: t10(r.bezahlt_am), betrag: Number(r.summe), bereich: r.periode, nr: r.nr, wer: wer(r.empfaenger), zahlart: r.sepa && r.sepa_lauf ? 'Lastschrift' : 'Überweisung', beleg: r.sepa && r.sepa_lauf ? 'Lastschrift ' + r.sepa_lauf : '' });
    });
    d.gaeste.filter((g) => g.bezahlt_am && g.status !== 'storniert').forEach((g) => l.push({ datum: t10(g.bezahlt_am), betrag: Number(g.betrag || 0), bereich: 'gast', nr: g.quittung_nr || '', wer: '„' + g.bootsname + '“ (Gast)',
      zahlart: FIN_ZAHLART[g.zahlung] || g.zahlung || '', bar: g.zahlung === 'bar', beleg: g.quittung_nr ? 'Quittung ' + g.quittung_nr : '' }));
    (kasse || []).filter((r) => r.bezahlt_am && !r.storniert_am).forEach((r) => l.push({ datum: t10(r.bezahlt_am), betrag: Number(r.summe), bereich: 'getraenke', nr: r.nr, wer: wer(r.empfaenger), zahlart: r.sepa ? 'Lastschrift' : 'Überweisung', beleg: '' }));
    return l.sort((a, b) => a.datum.localeCompare(b.datum) || String(a.nr).localeCompare(String(b.nr)));
  }
  // Summe je Bereich in einem Zeitraum (von/bis einschließlich, JJJJ-MM-TT)
  function finSumme(eing, von, bis) {
    const s = { summe: 0, n: 0, bar: 0 }; FIN_BEREICHE.forEach(([k]) => { s[k] = 0; });
    eing.forEach((x) => { if (x.datum < von || x.datum > bis) return; s[x.bereich] = (s[x.bereich] || 0) + x.betrag; s.summe += x.betrag; s.n++; if (x.bar) s.bar += x.betrag; });
    Object.keys(s).forEach((k) => { if (k !== 'n') s[k] = eur(ct(s[k])); }); return s;
  }
  // Was war am Stichtag noch offen? Rechnungen mit Datum bis zum Stichtag, Gäste mit Ankunft bis zum Stichtag, Getränke-Monatsrechnungen
  function finOffenAm(d, kasse, tag) {
    const o = { hafen: 0, nHafen: 0, gast: 0, nGast: 0, getraenke: 0, nGetraenke: 0 };
    d.rechnungen.forEach((r) => { if (!r.datum || r.datum > tag || (r.storniert_am && t10(r.storniert_am) <= tag)) return;
      let bez = (r.zahlungen || []).filter((x) => t10(x.datum) <= tag).reduce((s, x) => s + (x.art === 'ruecklastschrift' ? -1 : 1) * Number(x.betrag || 0), 0);
      if (r.bezahlt_am && t10(r.bezahlt_am) <= tag) bez = Number(r.summe);
      const rest = Math.max(0, eur(ct(r.summe) - ct(bez))); if (rest > 0) { o.hafen += rest; o.nHafen++; } });
    d.gaeste.forEach((g) => { if (g.status === 'storniert' || g.ankunft > tag || (g.bezahlt_am && t10(g.bezahlt_am) <= tag)) return; o.gast += Number(g.betrag || 0); o.nGast++; });
    (kasse || []).forEach((r) => { if (!r.datum || t10(r.datum) > tag || (r.storniert_am && t10(r.storniert_am) <= tag) || (r.bezahlt_am && t10(r.bezahlt_am) <= tag)) return; o.getraenke += Number(r.summe); o.nGetraenke++; });
    o.hafen = eur(ct(o.hafen)); o.gast = eur(ct(o.gast)); o.getraenke = eur(ct(o.getraenke)); o.summe = eur(ct(o.hafen) + ct(o.gast) + ct(o.getraenke)); return o;
  }
  // „Abgerechnet für [Jahr]“: Soll, Ist, Offen je Bereich (Stand heute)
  function finAbgerechnet(d, kasse, jahr, heute) {
    const Q = window.HAFEN.Q; const J = String(jahr);
    const zeile = (k, n, soll, offen, kl, klText) => ({ k, n, soll: eur(ct(soll)), ist: eur(ct(soll) - ct(offen)), offen: eur(ct(offen)), kl, klText });
    const z = ['beitrag', 'sommer', 'winter', 'veranstaltung'].map((k) => { const rs = d.rechnungen.filter((r) => !r.storniert_am && r.periode === k && String(r.saison) === J);
      return zeile(k, rs.length, rs.reduce((s, r) => s + Number(r.summe), 0), rs.reduce((s, r) => s + Q.rest(r), 0), rs.filter((r) => ['ueberfaellig', 'ruecklastschrift'].includes(Q.rstatus(r, heute))).length, 'überfällig/Rücklastschrift'); });
    const gs = d.gaeste.filter((g) => g.status !== 'storniert' && String(g.ankunft).startsWith(J)); const go = gs.filter((g) => !g.bezahlt_am);
    z.splice(3, 0, zeile('gast', gs.length, gs.reduce((s, g) => s + Number(g.betrag || 0), 0), go.reduce((s, g) => s + Number(g.betrag || 0), 0), go.filter((g) => g.zahlung_gemeldet).length, 'gemeldet, ungeprüft'));
    const kr = (kasse || []).filter((r) => !r.storniert_am && String(r.datum).startsWith(J)); const ko = kr.filter((r) => !r.bezahlt_am);
    z.push(zeile('getraenke', kr.length, kr.reduce((s, r) => s + Number(r.summe), 0), ko.reduce((s, r) => s + Number(r.summe), 0), ko.filter((r) => r.faellig && r.faellig < heute).length, 'überfällig'));
    return z;
  }
  const monatsEnde = (m) => { const [j, mo] = m.split('-').map(Number); const t = new Date(Date.UTC(j, mo, 0)); return m + '-' + String(t.getUTCDate()).padStart(2, '0'); };
  const monatPlus = (m, n) => { const [j, mo] = m.split('-').map(Number); const t = new Date(Date.UTC(j, mo - 1 + n, 1)); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0'); };
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const monatText = (m) => MONATE[Number(m.slice(5, 7)) - 1] + ' ' + m.slice(0, 4);
  const finanz = { BEREICHE: FIN_BEREICHE, ZAHLART: FIN_ZAHLART, MONATE, eingaenge: finEingaenge, summe: finSumme, offenAm: finOffenAm, abgerechnet: finAbgerechnet, monatsEnde, monatPlus, monatText };

  window.HAFEN_GEBUEHREN = { arbeitsdienst, vorschau, saisonAbrechnen, stornieren, gebuehrenFuer, saisonDaten, flaeche, finanz };
})();
