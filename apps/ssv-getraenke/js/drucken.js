/* SSV Getränkekasse – Druckansicht: Rechnungen (A4) und PIN-Zettel */
(function () {
  'use strict';

  const S = window.SSV.speicher;
  const H = window.SSV.hilfe;
  const esc = H.esc;
  const ziel = document.getElementById('blaetter');
  const q = new URLSearchParams(location.search);
  const STANDER = '<svg class="k-stander"><use href="#stander"/></svg>';

  /* GiroCode (EPC-QR): Banking-Apps übernehmen Empfänger, IBAN, Betrag und Verwendungszweck */
  function girocode(e, r) {
    const iban = (e.iban || '').replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return '';
    const daten = ['BCD', '002', '1', 'SCT', (e.bic || '').replace(/\s/g, ''), e.verein_name.slice(0, 70), iban,
      'EUR' + Number(r.summe).toFixed(2), '', '', ('Getraenke ' + r.nr).slice(0, 140)].join('\n');
    const qr = qrcode(0, 'M'); qr.addData(daten, 'Byte'); qr.make();
    return '<div class="r-qr">' + qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) + 'GiroCode – mit der<br>Banking-App scannen</div>';
  }

  function rechnungsBlatt(r, e, buchungen) {
    const em = r.empfaenger;
    const pos = r.positionen.map((p) =>
      '<tr><td>' + esc(p.name) + (p.einheit === 'kasten' ? ' – Kasten (' + p.stueck + ' Stk.)' : '') + '</td>' +
      '<td class="r">' + p.anzahl + ' ' + (p.einheit === 'kasten' ? (p.anzahl === 1 ? 'Kasten' : 'Kästen') : 'Stk.') + '</td>' +
      '<td class="r">' + H.geld(p.einzelpreis) + '</td><td class="r">' + H.geld(p.betrag) + '</td></tr>').join('');
    const zahlung = r.sepa
      ? '<div><strong>Zahlung per SEPA-Lastschrift</strong><br>' + esc(e.sepa_text) + '<br>Fälligkeit: ' + H.datum(r.faellig) + '</div>'
      : girocode(e, r) + '<div><strong>Bitte überweisen bis ' + H.datum(r.faellig) + '</strong><br>' +
        'Empfänger: ' + esc(e.verein_name) + '<br>IBAN: ' + esc(e.iban || '[PLATZHALTER IBAN]') + (e.bic ? ' · BIC: ' + esc(e.bic) : '') + '<br>' +
        'Bank: ' + esc(e.bank) + '<br>Verwendungszweck: <strong>' + esc(r.nr) + '</strong></div>';
    const fuss = '<div class="r-fuss"><span>' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + '</span>' +
      '<span>Steuer-Nr. ' + esc(e.steuernummer) + '</span><span>' + esc(e.bank) + (e.iban ? ' · ' + esc(e.iban) : '') + '</span></div>';

    let html = '<section class="r-blatt">' + (r.storniert_am ? '<div class="r-storno">STORNIERT</div>' : '') +
      '<div class="r-kopf">' + STANDER + '<div class="r-verein"><strong>' + esc(e.verein_name) + '</strong>' + esc(e.verein_strasse) + '<br>' + esc(e.verein_ort) + '<br>' + esc(e.verein_email) + '</div></div>' +
      '<div class="r-absender">' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + '</div>' +
      '<div class="r-adresse">' + esc(em.vorname + ' ' + em.nachname) + '<br>' + esc(em.strasse || '') + '<br>' + esc(((em.plz || '') + ' ' + (em.ort || '')).trim()) + '</div>' +
      '<div class="r-meta"><span>Rechnungsnummer</span><strong>' + esc(r.nr) + '</strong><span>Rechnungsdatum</span><span>' + H.datum(r.datum) + '</span>' +
      (em.nr ? '<span>Mitgliedsnummer</span><span>' + esc(em.nr) + '</span>' : '') +
      '<span>Leistungszeitraum</span><span>' + H.datum(r.von) + ' – ' + H.datum(r.bis) + '</span></div>' +
      '<h1>Getränkeabrechnung</h1><p>Moin ' + esc(em.vorname) + ',<br>für die im Leistungszeitraum an der Vereinskasse gebuchten Getränke berechnen wir:</p>' +
      '<table class="r-tab"><thead><tr><th>Artikel</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Betrag</th></tr></thead><tbody>' + pos +
      '</tbody><tfoot><tr><td colspan="3">Rechnungsbetrag</td><td class="r">' + H.geld(r.summe) + '</td></tr></tfoot></table>' +
      '<p style="font-size:9pt;color:#444">' + esc(e.steuerhinweis) + '</p>' +
      '<div class="r-zahlung">' + zahlung + '</div>' +
      '<p style="margin-top:6mm">' + esc(e.fusstext) + '<br>' + esc(e.verein_name) + '</p>' + fuss + '</section>';

    if (buchungen && buchungen.length) {
      const zeilen = buchungen.slice().sort((a, b) => a.zeit.localeCompare(b.zeit)).map((b) =>
        '<tr><td>' + H.datum(b.zeit) + '</td><td>' + new Date(b.zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '</td>' +
        '<td>' + esc(b.produkt_name) + (b.quelle === 'nachtrag' ? ' (Nachtrag)' : '') + '</td><td class="r">' + b.anzahl + ' ' + H.einheitText(b) + '</td><td class="r">' + H.geld(b.betrag) + '</td></tr>').join('');
      html += '<section class="r-blatt r-anhang"><div class="r-kopf">' + STANDER + '<div class="r-verein"><strong>Anlage zu ' + esc(r.nr) + '</strong>' + esc(em.vorname + ' ' + em.nachname) + '</div></div>' +
        '<h2>Einzelbuchungen an der Getränkekasse</h2><table class="r-tab"><thead><tr><th>Datum</th><th>Uhrzeit</th><th>Artikel</th><th class="r">Menge</th><th class="r">Betrag</th></tr></thead><tbody>' + zeilen +
        '</tbody><tfoot><tr><td colspan="4">Summe</td><td class="r">' + H.geld(r.summe) + '</td></tr></tfoot></table>' + fuss + '</section>';
    }
    return html;
  }

  async function rechnungen() {
    const ids = (q.get('ids') || '').split(',').filter(Boolean);
    if (!(await S.angemeldet())) { ziel.innerHTML = '<p style="padding:40px;text-align:center">Bitte zuerst im Kassenwart-Bereich anmelden.</p>'; return; }
    const [liste, e, buchungen] = await Promise.all([S.rechnungenLaden(ids), S.einstellungen(), S.buchungen({ rechnung_ids: ids })]);
    liste.sort((a, b) => a.nr.localeCompare(b.nr));
    document.getElementById('titel').textContent = liste.length === 1 ? 'Rechnung ' + liste[0].nr : liste.length + ' Rechnungen';
    document.title = liste.length === 1 ? 'Rechnung ' + liste[0].nr : 'Rechnungen';
    const render = () => {
      const mit = document.getElementById('anhang').checked;
      ziel.innerHTML = liste.map((r) => rechnungsBlatt(r, e, mit ? buchungen.filter((b) => b.rechnung_id === r.id && !b.storniert_am) : null)).join('');
    };
    document.getElementById('anhang').addEventListener('change', render);
    render();
  }

  function pinZettel() {
    document.getElementById('anhang-wahl').hidden = true;
    let liste = [];
    try { liste = JSON.parse(sessionStorage.getItem('ssvg-pinzettel')) || []; } catch (e) { /* leer */ }
    document.getElementById('titel').textContent = 'PIN-Zettel (' + liste.length + ')';
    const seiten = [];
    for (let i = 0; i < liste.length; i += 10) seiten.push(liste.slice(i, i + 10));
    ziel.innerHTML = seiten.map((s) => '<section class="r-blatt" style="padding:12mm"><div class="r-pinzettel">' + s.map((z) =>
      '<div><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><small>SSV Getränkekasse</small><br><strong>' + esc(z.vorname + ' ' + z.nachname) + '</strong>' +
      (z.nr ? '<br><small>Mitgliedsnr. ' + esc(z.nr) + '</small>' : '') + '</div>' + STANDER + '</div>' +
      '<div><small>Deine persönliche PIN</small><div class="pin">' + esc(z.pin) + '</div><small>Bitte nicht weitergeben. Vergessen? Kurz beim Kassenwart melden.</small></div></div>').join('') +
      '</div></section>').join('') || '<p style="padding:40px;text-align:center">Keine PINs zum Drucken vorhanden.</p>';
    // Die Klartext-PINs nicht länger als nötig aufbewahren
    window.addEventListener('afterprint', () => sessionStorage.removeItem('ssvg-pinzettel'));
  }

  if (q.get('art') === 'pins') pinZettel(); else rechnungen().catch((e) => { ziel.innerHTML = '<p style="padding:40px">' + esc(e.message) + '</p>'; });
})();
