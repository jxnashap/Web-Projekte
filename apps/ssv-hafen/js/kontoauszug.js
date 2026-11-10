/* SSV Hafen-Manager – Kontoauszug einlesen und Zahlungen zuordnen
 * Liest den Umsatz-Export aus dem Online-Banking (CAMT.053/.052 als XML oder CSV, z. B. Sparkasse „CSV-CAMT“,
 * Volksbank, Commerzbank, DKB) und ordnet jeden Umsatz zu:
 *   · Rechnungsnummer im Verwendungszweck (Hafen, Beitrag, Veranstaltung, Getränke)  → sicher
 *   · Sammellastschrift des Vereins (Referenz oder genauer Betrag eines Lastschrift-Laufs) → sicher bzw. Vorschlag
 *   · Gastlieger (Bootsname + Betrag)                                                  → sicher
 *   · Rücklastschrift (End-to-End-Referenz = Rechnungsnummer)                           → sicher
 *   · Mitglied an IBAN oder Name erkannt und Betrag passt zu genau einer offenen Rechnung → Vorschlag
 *   · alles andere: Klärliste; Ausgaben des Vereins werden nur gezählt.
 * Reine Funktionen ohne Speichern – gebucht wird im Hafen-Manager (app.js, Ansicht „Kontoauszug“). */
(function () {
  'use strict';
  const kompakt = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const ct = (v) => Math.round(Number(v) * 100);
  const geld = (v) => Math.round(Number(v) * 100) / 100;

  /* ------------------------------------------------------------------ Zahlen und Daten */
  function betragLesen(s) {
    let t = String(s == null ? '' : s).trim().replace(/\s|€|EUR/gi, '');
    if (!t) return NaN;
    const neg = /^-|-$/.test(t) || /^\(.*\)$/.test(t); t = t.replace(/[-+()]/g, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');        // 1.234,56
    else if (/\.\d{1,2}$/.test(t)) t = t.replace(/,/g, '');                      // 1,234.56
    else t = t.replace(/[.,]/g, '');
    const v = Number(t); return isNaN(v) ? NaN : (neg ? -v : v);
  }
  function datumLesen(s) {
    const t = String(s || '').trim();
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) { const j = m[3].length === 2 ? '20' + m[3] : m[3]; return j + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
    return '';
  }

  /* ------------------------------------------------------------------ CAMT (XML) */
  function camtLesen(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Die XML-Datei ist beschädigt.');
    const alle = (el, name) => Array.from(el.getElementsByTagNameNS('*', name));
    const kind = (el, pfad) => { let x = el; for (const n of pfad.split('/')) { if (!x) return null; x = Array.from(x.children).find((c) => c.localName === n) || null; } return x; };
    const txt = (el, pfad) => { const x = el && kind(el, pfad); return x ? x.textContent.trim() : ''; };
    const eintraege = alle(doc, 'Ntry');
    if (!eintraege.length) throw new Error('In der Datei stehen keine Umsätze (CAMT ohne Einträge).');
    const out = [];
    eintraege.forEach((n) => {
      const haben = txt(n, 'CdtDbtInd') === 'CRDT'; const storno = txt(n, 'RvslInd') === 'true';
      const datum = datumLesen(txt(n, 'BookgDt/Dt') || txt(n, 'BookgDt/DtTm') || txt(n, 'ValDt/Dt'));
      const bk = [txt(n, 'BkTxCd/Domn/Fmly/SubFmlyCd'), txt(n, 'BkTxCd/Prtry/Cd')].join(' ');
      const zusatz = txt(n, 'AddtlNtryInf');
      const sammler = txt(n, 'NtryDtls/Btch/PmtInfId');
      const tx = alle(n, 'TxDtls');
      const gesamt = Number(txt(n, 'Amt')) * (haben ? 1 : -1);
      const teile = tx.length ? tx : [null];
      teile.forEach((t) => {
        const partei = (rolle) => t ? (txt(t, 'RltdPties/' + rolle + '/Nm') || txt(t, 'RltdPties/' + rolle + '/Pty/Nm')) : '';
        const iban = (rolle) => t ? txt(t, 'RltdPties/' + rolle + 'Acct/Id/IBAN') : '';
        const tb = t && (txt(t, 'AmtDtls/TxAmt/Amt') || txt(t, 'Amt'));
        const betrag = tx.length > 1 && tb ? Number(tb) * (haben ? 1 : -1) : gesamt;
        const zweck = t ? alle(t, 'Ustrd').map((u) => u.textContent.trim()).join(' ') : '';
        const rueckGrund = t ? txt(t, 'RtrInf/Rsn/Cd') : '';
        out.push({
          datum, betrag: geld(betrag), name: haben ? partei('Dbtr') || partei('UltmtDbtr') : partei('Cdtr') || partei('UltmtCdtr'), iban: haben ? iban('Dbtr') : iban('Cdtr'),
          zweck: zweck || zusatz, buchungstext: zusatz, e2e: t ? txt(t, 'Refs/EndToEndId').replace(/^NOTPROVIDED$/i, '') : '', mandat: t ? txt(t, 'Refs/MndtId') : '',
          sammler: sammler || (t ? txt(t, 'Refs/PmtInfId') : ''), anzahl: tx.length,
          rueck: !haben && (storno || /RRTN|\b109\b|\b159\b/.test(bk) || !!rueckGrund || /r(ue|ü|u)ck(last|bel)|retoure/i.test(zusatz + ' ' + zweck)), rueckGrund
        });
      });
    });
    return out;
  }

  /* ------------------------------------------------------------------ CSV */
  function csvZeilen(text) {
    const kopf = text.split(/\r?\n/).slice(0, 30).join('\n');
    const trenner = [';', '\t', ','].map((t) => [t, (kopf.match(new RegExp(t === '\t' ? '\t' : '\\' + t, 'g')) || []).length]).sort((a, b) => b[1] - a[1])[0][0];
    const zeilen = []; let feld = '', zeile = [], q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else q = false; } else feld += c; continue; }
      if (c === '"') q = true; else if (c === trenner) { zeile.push(feld); feld = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; zeile.push(feld); zeilen.push(zeile); zeile = []; feld = ''; }
      else feld += c;
    }
    if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
    return zeilen.filter((z) => z.some((x) => x.trim()));
  }
  const norm = (s) => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
  // Spaltennamen der verbreiteten Bank-Exporte (normalisiert, ohne Umlaute/Leerzeichen); erster Treffer gewinnt
  const SPALTEN = {
    datum: ['buchungstag', 'buchungsdatum', 'buchung', 'datum', 'valutadatum', 'valuta', 'wertstellung'],
    betrag: ['betrag', 'betrageur', 'umsatz', 'umsatzineur', 'betragineur'],
    soll: ['soll'], haben: ['haben'], sh: ['sollhaben', 'sh'],
    zweck: ['verwendungszweck', 'vorgangverwendungszweck', 'buchungsdetails', 'umsatzdetails', 'zweck', 'beschreibung'],
    name: ['beguenstigterzahlungspflichtiger', 'namezahlungsbeteiligter', 'auftraggeberzahlungsempfaenger', 'zahlungspflichtigerzahlungsempfaenger', 'auftraggeberbeguenstigter', 'empfaengerzahlungspflichtiger', 'zahlungspflichtiger', 'auftraggeber', 'name', 'empfaenger', 'gegenpartei'],
    iban: ['kontonummeriban', 'ibanzahlungsbeteiligter', 'iban', 'gegenkontoiban', 'kontonummer'],
    e2e: ['kundenreferenzendtoend', 'endtoendreferenz', 'endtoendid', 'kundenreferenz', 'e2ereferenz'],
    sammler: ['sammlerreferenz'], mandat: ['mandatsreferenz'],
    text: ['buchungstext', 'umsatzart', 'vorgang', 'umsatztyp', 'art']
  };
  function csvLesen(text) {
    const z = csvZeilen(text);
    // Kopfzeile: erste Zeile mit einer Datums- und einer Betragsspalte (manche Banken setzen Kontoinfos davor)
    let ki = -1, idx = null;
    for (let i = 0; i < Math.min(z.length, 30) && ki < 0; i++) {
      const h = z[i].map(norm); const f = (k) => { for (const n of SPALTEN[k]) { const j = h.indexOf(n); if (j >= 0) return j; } for (const n of SPALTEN[k]) { const j = h.findIndex((x) => x.startsWith(n) && !x.includes('auftragskonto')); if (j >= 0) return j; } return -1; };
      const d = f('datum'), b = f('betrag'), s = f('soll'), hb = f('haben');
      if (d >= 0 && (b >= 0 || (s >= 0 && hb >= 0))) { ki = i; idx = {}; Object.keys(SPALTEN).forEach((k) => { idx[k] = f(k); }); }
    }
    if (ki < 0) throw new Error('In der CSV-Datei wurden keine Spalten für Datum und Betrag gefunden. Bitte im Online-Banking „Umsätze exportieren“ als CSV (bei der Sparkasse „CSV-CAMT“) oder als CAMT/XML wählen.');
    const g = (r, k) => idx[k] >= 0 ? String(r[idx[k]] || '').trim() : '';
    const out = [];
    z.slice(ki + 1).forEach((r) => {
      const datum = datumLesen(g(r, 'datum')); if (!datum) return;
      let betrag = idx.betrag >= 0 ? betragLesen(g(r, 'betrag')) : (betragLesen(g(r, 'haben')) || 0) - (betragLesen(g(r, 'soll')) || 0);
      if (idx.sh >= 0 && /^s/i.test(g(r, 'sh'))) betrag = -Math.abs(betrag);
      if (isNaN(betrag) || !betrag) return;
      const zweck = g(r, 'zweck'); const bt = g(r, 'text');
      out.push({ datum, betrag: geld(betrag), name: g(r, 'name'), iban: g(r, 'iban').replace(/\s/g, ''), zweck, buchungstext: bt, e2e: g(r, 'e2e').replace(/^NOTPROVIDED$/i, ''), mandat: g(r, 'mandat'), sammler: g(r, 'sammler'),
        rueck: betrag < 0 && /r(ue|ü|u)ck(last|bel|ueberw|überw)|retoure|lastschrift\s*r(ue|ü|u)ck/i.test(bt + ' ' + zweck), rueckGrund: '' });
    });
    if (!out.length) throw new Error('In der CSV-Datei stehen keine Umsätze.');
    return out;
  }

  // Eindeutiger Schlüssel je Umsatz – so wird nichts doppelt gebucht, wenn derselbe Auszug zweimal kommt
  const schluessel = (u) => [u.datum, u.betrag.toFixed(2), kompakt(u.e2e).slice(0, 35), kompakt(u.zweck).slice(0, 60), kompakt(u.iban)].join('|');

  function lesen(text, dateiname) {
    const t = String(text || '').replace(/^﻿/, '');
    const xml = /^\s*</.test(t) || /\.xml$/i.test(dateiname || '');
    const l = xml ? camtLesen(t) : csvLesen(t);
    return l.map((u) => ({ ...u, key: schluessel(u) })).sort((a, b) => a.datum.localeCompare(b.datum));
  }

  /* ------------------------------------------------------------------ Zuordnen
   * ctx: { rechnungen, getraenke, gaeste, laeufe, mitglieder, rest(r), rstatus(r), heute }
   * Ergebnis je Umsatz: { art, sicher, text, ziele: [{ typ, id, betrag }], hinweis } */
  function zuordnen(umsaetze, ctx) {
    const hafenOffen = ctx.rechnungen.filter((r) => !r.storniert_am);
    const refs = new Set(); ctx.rechnungen.forEach((r) => (r.zahlungen || []).forEach((z) => { if (z.ref) refs.add(z.ref); }));
    const nrKomp = (nr) => kompakt(nr);
    const rechnungFinden = (u) => {
      const k = kompakt(u.zweck + ' ' + u.e2e);
      const h = hafenOffen.filter((r) => k.includes(nrKomp(r.nr))).map((r) => ({ typ: 'hafen', r, rest: ctx.rest(r), nr: r.nr }));
      const g = (ctx.getraenke || []).filter((r) => !r.storniert_am && k.includes(nrKomp(r.nr))).map((r) => ({ typ: 'getraenke', r, rest: r.bezahlt_am ? 0 : Number(r.summe), nr: r.nr }));
      return h.concat(g);
    };
    const mitgliedVon = (u) => {
      const ib = kompakt(u.iban); const nm = kompakt(u.name);
      return ctx.mitglieder.filter((m) => (ib && m.iban && kompakt(m.iban) === ib) || (nm && nm.length > 5 && (nm.includes(kompakt(m.vorname + m.nachname)) || nm.includes(kompakt(m.nachname + m.vorname)) || (m.kontoinhaber && nm === kompakt(m.kontoinhaber)))));
    };
    return umsaetze.map((u) => {
      const e = { art: 'unklar', sicher: false, text: '', ziele: [], hinweis: '' };
      if (refs.has(u.key)) return { ...e, art: 'doppelt', text: 'schon gebucht (gleicher Umsatz)' };
      // --- Ausgänge: Rücklastschrift oder Ausgabe des Vereins
      if (u.betrag < 0) {
        if (!u.rueck) return { ...e, art: 'ausgabe', text: 'Ausgabe des Vereins' };
        const k = kompakt(u.e2e + ' ' + u.zweck + ' ' + u.mandat);
        // Rechnungsnummer (End-to-End-Referenz), sonst Mandat + bezahlte Lastschrift-Rechnung mit passendem Betrag (jüngster Lauf)
        const r = hafenOffen.find((x) => k.includes(nrKomp(x.nr))) || hafenOffen.filter((x) => x.sepa && x.sepa_lauf && x.mandat_ref && u.mandat && kompakt(x.mandat_ref) === kompakt(u.mandat) && ctx.rest(x) === 0 && ct(x.summe) <= ct(-u.betrag))
          .sort((x, y) => String(y.sepa_lauf).localeCompare(String(x.sepa_lauf)))[0];
        if (!r) return { ...e, art: 'unklar', text: 'Rücklastschrift – Rechnung nicht erkannt' };
        if (ctx.rstatus(r) === 'ruecklastschrift') return { ...e, art: 'doppelt', text: 'Rücklastschrift ' + r.nr + ' ist schon vermerkt' };
        const gebuehr = geld(-u.betrag - (r.summe - ctx.rest(r) > 0 ? r.summe - ctx.rest(r) : r.summe));
        return { ...e, art: 'rueck', sicher: true, text: 'Rücklastschrift ' + r.nr, ziele: [{ typ: 'hafen', id: r.id, betrag: geld(-u.betrag) }], hinweis: gebuehr > 0 ? 'davon ' + gebuehr.toFixed(2).replace('.', ',') + ' € Bankgebühr' : '' };
      }
      // --- Eingänge
      // 1. Sammellastschrift des Vereins: Referenz (SSV-SEPA-…) oder genau der Betrag eines offenen Laufs
      const kz = kompakt(u.zweck + ' ' + u.sammler + ' ' + u.e2e + ' ' + u.buchungstext);
      const laufOffen = (l) => ctx.rechnungen.filter((r) => r.sepa_lauf === l.id && !r.storniert_am && ctx.rest(r) > 0 && ctx.rstatus(r) !== 'ruecklastschrift');
      const lRef = (ctx.laeufe || []).find((l) => kz.includes(kompakt(l.id)));
      if (lRef) {
        const rs = laufOffen(lRef); if (!rs.length) return { ...e, art: 'doppelt', text: 'Lastschrift-Lauf ' + lRef.id + ' ist schon gebucht' };
        const summe = geld(rs.reduce((s, r) => s + ctx.rest(r), 0));
        return { ...e, art: 'lauf', sicher: ct(summe) === ct(u.betrag), text: 'Sammellastschrift ' + lRef.id + ' (' + rs.length + ' Rechnungen)', ziele: rs.map((r) => ({ typ: 'hafen', id: r.id, betrag: ctx.rest(r) })),
          hinweis: ct(summe) === ct(u.betrag) ? '' : 'Betrag weicht ab: offen ' + summe.toFixed(2).replace('.', ',') + ' € – Rücklastschriften einzeln prüfen' };
      }
      // 2. Rechnungsnummer im Verwendungszweck (eine oder mehrere Rechnungen in einer Überweisung)
      const treffer = rechnungFinden(u);
      if (treffer.length) {
        const offen = treffer.filter((t) => t.rest > 0);
        if (!offen.length) {   // am selben Tag als bezahlt vermerkt → derselbe Umsatz (z. B. früher von Hand gebucht), sonst doppelt überwiesen?
          if (treffer.every((t) => t.r.bezahlt_am === u.datum)) return { ...e, art: 'doppelt', text: treffer.map((t) => t.nr).join(', ') + ' ist schon gebucht' };
          return { ...e, art: 'unklar', text: treffer.map((t) => t.nr).join(', ') + ' ist schon bezahlt', hinweis: 'doppelt überwiesen? Bitte klären' };
        }
        const summe = geld(offen.reduce((s, t) => s + t.rest, 0));
        if (offen.length === 1 || ct(summe) === ct(u.betrag)) {
          let restBetrag = u.betrag; const ziele = offen.map((t, i) => { const b = i === offen.length - 1 ? geld(restBetrag) : Math.min(t.rest, restBetrag); restBetrag = geld(restBetrag - b); return { typ: t.typ, id: t.r.id, betrag: geld(b) }; });
          const t0 = offen[0]; const teil = offen.length === 1 && ct(u.betrag) < ct(t0.rest); const zuviel = ct(u.betrag) > ct(summe);
          return { ...e, art: t0.typ === 'getraenke' ? 'getraenke' : 'rechnung', sicher: !zuviel && !(t0.typ === 'getraenke' && teil), text: (t0.typ === 'getraenke' ? 'Getränke ' : '') + offen.map((t) => t.nr).join(', ') + (teil ? ' (Teilzahlung, offen bleiben ' + geld(t0.rest - u.betrag).toFixed(2).replace('.', ',') + ' €)' : ''), ziele,
            hinweis: zuviel ? 'mehr überwiesen als offen (' + summe.toFixed(2).replace('.', ',') + ' €)' : t0.typ === 'getraenke' && teil ? 'Getränkerechnungen kennen keine Teilzahlung' : '' };
        }
        return { ...e, art: 'unklar', text: 'mehrere Rechnungen genannt: ' + offen.map((t) => t.nr).join(', '), hinweis: 'Betrag passt nicht zur Summe' };
      }
      // 3. Gastlieger: Bootsname im Verwendungszweck und Betrag passt
      const gast = (ctx.gaeste || []).filter((g) => !g.bezahlt_am && g.status !== 'storniert' && ct(g.betrag) === ct(u.betrag) && g.bootsname && kz.includes(kompakt(g.bootsname)));
      if (gast.length === 1) return { ...e, art: 'gast', sicher: true, text: 'Gast „' + gast[0].bootsname + '“', ziele: [{ typ: 'gast', id: gast[0].id, betrag: u.betrag }] };
      const gastBez = (ctx.gaeste || []).find((g) => g.bezahlt_am === u.datum && ct(g.betrag) === ct(u.betrag) && g.bootsname && kz.includes(kompakt(g.bootsname)));
      if (gastBez) return { ...e, art: 'doppelt', text: 'Gast „' + gastBez.bootsname + '“ ist schon gebucht' };
      // 4. Mitglied an IBAN/Name erkannt und Betrag passt zu genau einer offenen Rechnung → Vorschlag
      const ms = mitgliedVon(u);
      if (ms.length) {
        const ids = new Set(ms.map((m) => m.id));
        const passend = hafenOffen.filter((r) => ids.has(r.mitglied_id) && ctx.rest(r) > 0 && ct(ctx.rest(r)) === ct(u.betrag)).map((r) => ({ typ: 'hafen', r }))
          .concat((ctx.getraenke || []).filter((r) => ids.has(r.mitglied_id) && !r.bezahlt_am && !r.storniert_am && ct(r.summe) === ct(u.betrag)).map((r) => ({ typ: 'getraenke', r })));
        if (passend.length === 1) return { ...e, art: passend[0].typ === 'getraenke' ? 'getraenke' : 'rechnung', sicher: false, text: 'Vorschlag: ' + (passend[0].typ === 'getraenke' ? 'Getränke ' : '') + passend[0].r.nr, ziele: [{ typ: passend[0].typ, id: passend[0].r.id, betrag: u.betrag }], hinweis: 'Mitglied erkannt, Rechnungsnummer fehlt' };
        return { ...e, text: 'Mitglied erkannt: ' + ms.map((m) => m.vorname + ' ' + m.nachname).join(', '), hinweis: passend.length ? 'mehrere Rechnungen mit diesem Betrag' : 'keine offene Rechnung mit diesem Betrag', mitglieder: [...ids] };
      }
      // 5. Sammellastschrift ohne Referenz: genauer Betrag eines offenen Laufs → Vorschlag
      const lBetrag = (ctx.laeufe || []).filter((l) => { const rs = laufOffen(l); return rs.length && ct(rs.reduce((s, r) => s + ctx.rest(r), 0)) === ct(u.betrag); });
      if (lBetrag.length === 1) { const rs = laufOffen(lBetrag[0]); return { ...e, art: 'lauf', sicher: false, text: 'Vorschlag: Sammellastschrift ' + lBetrag[0].id + ' (' + rs.length + ' Rechnungen)', ziele: rs.map((r) => ({ typ: 'hafen', id: r.id, betrag: ctx.rest(r) })), hinweis: 'Betrag passt genau' }; }
      return { ...e, text: 'nicht zugeordnet' };
    });
  }

  window.HAFEN_KONTO = { lesen, zuordnen, betragLesen, datumLesen, schluessel };
})();
