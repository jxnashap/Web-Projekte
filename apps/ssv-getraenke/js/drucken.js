/* SSV Getränkekasse – Druckansicht: Rechnungen (A4) und PIN-Zettel */
(function () {
  'use strict';

  const S = window.SSV.speicher;
  const H = window.SSV.hilfe;
  const esc = H.esc;
  const ziel = document.getElementById('blaetter');
  const q = new URLSearchParams(location.search);
  const STANDER = '<svg class="k-stander"><use href="#stander"/></svg>';

  function rechnungsBlatt(r, e, buchungen) {
    const em = r.empfaenger;
    const pos = r.positionen.map((p) =>
      '<tr><td>' + esc(p.name) + (p.einheit === 'kasten' ? ' – Kasten (' + p.stueck + ' Stk.)' : '') + '</td>' +
      '<td class="r">' + p.anzahl + ' ' + (p.einheit === 'kasten' ? (p.anzahl === 1 ? 'Kasten' : 'Kästen') : 'Stk.') + '</td>' +
      '<td class="r">' + H.geld(p.einzelpreis) + '</td><td class="r">' + H.geld(p.betrag) + '</td></tr>').join('');
    // Persönlicher Ton – die SEPA-Pflichtangaben (Gläubiger-ID, Mandatsreferenz) stehen klein in der Fußzeile
    const betrag = '<strong>' + H.geld(r.summe) + '</strong>';
    const zahlung = r.sepa
      ? '<p>Du musst nichts weiter tun: Die ' + betrag + ' buchen wir am <strong>' + H.datum(r.faellig) + '</strong> ganz bequem per Lastschrift von deinem Konto ab.' +
        (e.sepa_text ? ' ' + esc(e.sepa_text) : '') + '</p>'
      : '<p>Bitte überweise die ' + betrag + ' bis zum <strong>' + H.datum(r.faellig) + '</strong> auf unser Vereinskonto' +
        (e.iban ? ' (IBAN ' + esc(e.iban) + (e.bank ? ', ' + esc(e.bank) : '') + ')' : ' [PLATZHALTER IBAN]') +
        ' – als Verwendungszweck reicht die Rechnungsnummer <strong>' + esc(r.nr) + '</strong>.</p>';
    const sepaKlein = r.sepa ? 'Gläubiger-ID ' + esc(e.glaeubiger_id || '[PLATZHALTER]') + ' · Mandatsreferenz ' + esc(em.mandatsreferenz || em.nr || '[PLATZHALTER]') + ' · ' : '';
    const fuss = '<div class="r-fuss"><span>' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + ' · ' + esc(e.verein_email) + '</span>' +
      '<span>' + sepaKlein + 'Steuer-Nr. ' + esc(e.steuernummer) + '</span></div>';
    // „im September 2026“ für ganze Monate, sonst „vom … bis …“
    const v = new Date(r.von + 'T12:00:00'), bis = new Date(r.bis + 'T12:00:00');
    const ganzerMonat = v.getDate() === 1 && v.getMonth() === bis.getMonth() && v.getFullYear() === bis.getFullYear() &&
      new Date(bis.getFullYear(), bis.getMonth() + 1, 0).getDate() === bis.getDate();
    const zeitraum = ganzerMonat ? 'im ' + v.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : 'vom ' + H.datum(r.von) + ' bis ' + H.datum(r.bis);

    let html = '<section class="r-blatt">' + (r.storniert_am ? '<div class="r-storno">STORNIERT</div>' : '') +
      '<div class="r-kopf">' + STANDER + '<div class="r-verein"><strong>' + esc(e.verein_name) + '</strong>' + esc(e.verein_strasse) + '<br>' + esc(e.verein_ort) + '<br>' + esc(e.verein_email) + '</div></div>' +
      '<div class="r-absender">' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + '</div>' +
      '<div class="r-adresse">' + esc(em.vorname + ' ' + em.nachname) + '<br>' + esc(em.strasse || '') + '<br>' + esc(((em.plz || '') + ' ' + (em.ort || '')).trim()) + '</div>' +
      '<div class="r-meta"><span>Rechnungsnummer</span><strong>' + esc(r.nr) + '</strong><span>Rechnungsdatum</span><span>' + H.datum(r.datum) + '</span>' +
      (em.nr ? '<span>Mitgliedsnummer</span><span>' + esc(em.nr) + '</span>' : '') +
      '<span>Leistungszeitraum</span><span>' + H.datum(r.von) + ' – ' + H.datum(r.bis) + '</span></div>' +
      '<h1>Deine Getränkeabrechnung</h1><p>Moin ' + esc(em.vorname) + ',</p><p>schön, dass du ' + zeitraum + ' bei uns an der Trave warst! Hier ist deine Übersicht über alles, was du dir an unserer Getränkekasse gegönnt hast:</p>' +
      '<table class="r-tab"><thead><tr><th>Artikel</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Betrag</th></tr></thead><tbody>' + pos +
      '</tbody><tfoot><tr><td colspan="3">Zusammen</td><td class="r">' + H.geld(r.summe) + '</td></tr></tfoot></table>' +
      '<div class="r-zahlung">' + zahlung + '<p>Kommt dir etwas komisch vor? Dann sprich ' + (e.kassenwart_name ? esc(e.kassenwart_name) : 'den Kassenwart') +
      ' einfach am Steg oder in der Messe an – oder schreib kurz an ' + esc(e.verein_email) + '.</p></div>' +
      '<p class="r-gruss">' + esc(e.fusstext) + '<br><br>' + (e.kassenwart_name ? 'Dein Kassenwart ' + esc(e.kassenwart_name) + '<br>' : '') +
      '<span>für den ' + esc(e.verein_name) + '</span></p>' +
      '<p class="r-steuer">' + esc(e.steuerhinweis) + '</p>' + fuss + '</section>';

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
