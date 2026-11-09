/* SSV Hafen-Manager – Druckansichten: Rechnungen, Quittung, Belegungsplan, QR-Plakat */
(function () {
  'use strict';
  const HF = window.HAFEN; const { H, Q } = HF; const esc = H.esc;
  const d = HF.laden(); const e = d.einstellungen;
  const q = new URLSearchParams(location.search);
  const ziel = document.getElementById('blaetter');
  const titel = (t) => { document.getElementById('titel').textContent = t; document.title = t; };
  const STANDER = '<svg class="stander"><use href="#stander"/></svg>';
  const kopf = '<div class="r-kopf">' + STANDER + '<div class="r-verein"><strong>' + esc(e.verein_name) + '</strong>' + esc(e.verein_strasse) + '<br>' + esc(e.verein_ort) + '<br>' + esc(e.verein_email) + '</div></div>';

  function rechnung(r) {
    const em = r.empfaenger;
    const winter = r.periode === 'winter', beitrag = r.periode === 'beitrag';
    const label = H.periodeText(r);
    const intro = beitrag
      ? 'danke, dass du auch ' + r.saison + ' Teil unseres Vereins bist! Mit deinem Beitrag halten wir Hafen, Stege, Jugendarbeit und Vereinsheim in Schuss. Hier ist deine Beitragsrechnung:'
      : winter
        ? 'das Winterlager hat begonnen – hier ist deine Abrechnung für den ' + label + ':'
        : 'die Saison läuft – schön, dass du wieder auf dem Wasser bist! Hier ist deine Abrechnung für den ' + label + ':';
    const betrag = '<strong>' + H.geld(r.summe) + '</strong>';
    const zahlung = r.sepa
      ? '<p>Du musst nichts weiter tun: Die ' + betrag + ' buchen wir am <strong>' + H.datum(r.faellig) + '</strong> ganz bequem per Lastschrift von deinem Konto ab.</p>'
      : '<p>Bitte überweise die ' + betrag + ' bis zum <strong>' + H.datum(r.faellig) + '</strong> auf unser Vereinskonto (IBAN ' + esc(e.iban) + ') – als Verwendungszweck reicht <strong>' + esc(r.nr) + '</strong>.</p>';
    return '<section class="blatt">' + (r.storniert_am ? '<div class="r-storno">STORNIERT</div>' : '') + kopf +
      '<div class="r-absender">' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + '</div>' +
      '<div class="r-adresse">' + esc(em.vorname + ' ' + em.nachname) + '<br>' + esc(em.strasse || '') + '<br>' + esc(((em.plz || '') + ' ' + (em.ort || '')).trim()) + '</div>' +
      '<div class="r-meta"><span>Rechnungsnummer</span><strong>' + esc(r.nr) + '</strong><span>Rechnungsdatum</span><span>' + H.datum(r.datum) + '</span><span>Mitgliedsnummer</span><span>' + esc(em.nr) + '</span><span>' + (beitrag ? 'Beitragsjahr' : 'Leistungszeitraum') + '</span><span>' + (beitrag ? r.saison : label) + '</span></div>' +
      '<h1>' + (beitrag ? 'Dein Mitgliedsbeitrag ' + r.saison : 'Deine Hafenabrechnung') + '</h1><p>Moin ' + esc(em.vorname) + ',</p><p>' + intro + '</p>' +
      '<table class="r-tab"><thead><tr><th>Leistung</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Betrag</th></tr></thead><tbody>' +
      r.positionen.map((p) => '<tr><td>' + esc(p.text) + '</td><td class="r">' + H.zahl(p.menge, p.menge % 1 ? 2 : 0) + ' ' + esc(p.einheit) + '</td><td class="r">' + H.geld(p.einzelpreis) + '</td><td class="r">' + H.geld(p.betrag) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="3">Zusammen</td><td class="r">' + H.geld(r.summe) + '</td></tr></tfoot></table>' +
      '<div class="r-zahlung">' + zahlung + '<p>Kommt dir etwas komisch vor? Dann sprich ' + esc(e.kassenwart_name || 'den Kassenwart') + ' einfach am Steg oder in der Messe an – oder schreib kurz an ' + esc(e.verein_email) + '.</p></div>' +
      '<p style="margin-top:7mm">' + esc(e.fusstext) + '<br><br>Dein Kassenwart ' + esc(e.kassenwart_name) + '<br><span style="color:#555">für den ' + esc(e.verein_name) + '</span></p>' +
      '<p style="margin-top:4mm;font-size:7.5pt;color:#777">Gebühren laut Gebührenordnung des Vereins, alle Preise inkl. der gültigen MwSt. [PLATZHALTER: Steuerausweis mit Steuerberater klären]</p>' +
      '<div class="r-fuss"><span>' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + '</span><span>' +
      (r.sepa ? 'Gläubiger-ID ' + esc(e.glaeubiger_id) + ' · Mandatsreferenz ' + esc(r.mandat_ref) + ' · ' : '') + 'Steuer-Nr. ' + esc(e.steuernummer) + '</span></div></section>';
  }

  function quittung(g) {
    const gb = window.HAFEN_GEBUEHREN.gebuehrenFuer(d, Number(g.ankunft.slice(0, 4)));
    return '<section class="blatt klein">' + kopf + '<h1 style="margin-top:5mm">Quittung ' + esc(g.quittung_nr) + '</h1>' +
      '<table class="r-tab"><tbody><tr><td>Boot</td><td>„' + esc(g.bootsname) + '“ · ' + H.zahl(g.laenge, 1) + ' m</td></tr><tr><td>Skipper</td><td>' + esc(g.skipper) + (g.herkunft ? ', ' + esc(g.herkunft) : '') + '</td></tr>' +
      '<tr><td>Liegeplatz</td><td>' + esc(g.platz_id ? (Q.platz(g.platz_id).box === 'L' ? 'Längsseits ' : 'Platz ') + Q.platz(g.platz_id).nr : '') + '</td></tr><tr><td>Zeitraum</td><td>ab ' + H.datum(g.ankunft) + ', ' + g.naechte + ' × ' + H.geld(gb.gast_nacht) + '</td></tr></tbody>' +
      '<tfoot><tr><td>Betrag</td><td class="r">' + H.geld(g.betrag) + '</td></tr></tfoot></table>' +
      '<p>' + (g.zahlung === 'bar' ? 'Betrag bar dankend erhalten.' : 'Zahlung per Überweisung.') + ' Inkl. der gültigen MwSt. Gute Fahrt und willkommen zurück!</p>' +
      '<p style="margin-top:10mm;border-top:1px solid #999;width:60mm;padding-top:1mm;font-size:8pt;color:#555">' + esc(e.hafenmeister_name) + ', Hafenmeister · ' + H.datum(g.ankunft) + '</p></section>';
  }

  function belegungsplan() {
    const saison = 2026;
    const bel = Q.belegungen(saison, 'winter').slice().sort((a, b) => a.platz_id.localeCompare(b.platz_id));
    return '<section class="blatt quer">' + kopf + '<h1 style="margin-top:5mm">Belegungsplan Winterlager ' + saison + '/' + String(saison + 1).slice(2) + '</h1>' +
      '<p style="font-size:9pt;color:#555">Reihenfolge beim Ein- und Auslagern nach Belegungsplan und Rangiermöglichkeiten. Boote über 10 t werden nicht gekrant (Hafenbetriebsordnung 3.1.4).</p>' +
      '<table class="r-tab"><thead><tr><th>Landplatz</th><th>Boot</th><th>Typ</th><th class="r">L × B</th><th class="r">Gewicht</th><th>Eigner</th><th>Telefon</th><th>Hinweis</th><th>gekrant ✓</th></tr></thead><tbody>' +
      bel.map((b) => { const bt = Q.boot(b.boot_id); const m = Q.mitglied(bt.eigner_id);
        return '<tr><td>' + esc(Q.platz(b.platz_id).bez) + '</td><td>' + esc(bt.name) + '</td><td>' + esc(bt.typ) + '</td><td class="r">' + H.zahl(bt.laenge) + ' × ' + H.zahl(bt.breite) + '</td><td class="r">' + H.zahl(bt.gewicht_t, 1) + ' t</td><td>' + esc(Q.name(m)) + '</td><td>' + esc(m.tel) + '</td><td>' + (b.nicht_kranen ? 'nicht kranen' : '') + (bt.gewicht_t > 10 ? ' über 10 t!' : '') + '</td><td>☐</td></tr>'; }).join('') +
      '</tbody></table></section>';
  }

  function plakat() {
    const url = new URL('gast.html', location.href).href;
    const qr = qrcode(0, 'M'); qr.addData(url, 'Byte'); qr.make();
    const gb = window.HAFEN_GEBUEHREN.gebuehrenFuer(d, 2026);
    return '<section class="blatt plakat">' + STANDER.replace('class="stander"', 'class="stander" style="width:40mm;height:32mm;color:#0E1B45"') +
      '<h1>Moin und willkommen!</h1><p class="unter">Gastlieger beim Schwartauer Segler-Verein – hier kurz anmelden:</p>' +
      '<div class="qr">' + qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) + '</div>' +
      '<p class="preis">' + H.geld(gb.gast_nacht) + ' pro Nacht</p><p>Grüne Schilder = freier Platz · Hafenmeister ' + esc(e.hafenmeister_name) + ' · ' + esc(e.hafenmeister_tel) + '</p>' +
      '<div class="sprachen"><p><strong>English:</strong> Welcome! Please scan the code to register. Green signs mark free berths. ' + H.geld(gb.gast_nacht) + ' per night.</p>' +
      '<p><strong>Dansk:</strong> Velkommen! Scan koden for at tilmelde dig. Grønne skilte = ledig plads. ' + H.geld(gb.gast_nacht) + ' pr. nat.</p></div></section>';
  }

  const art = q.get('art');
  if (art === 'rechnungen') {
    const ids = (q.get('ids') || '').split(','); const liste = d.rechnungen.filter((r) => ids.includes(r.id)).sort((a, b) => a.nr.localeCompare(b.nr));
    titel(liste.length === 1 ? 'Rechnung ' + liste[0].nr : liste.length + ' Rechnungen'); ziel.innerHTML = liste.map(rechnung).join('');
  } else if (art === 'quittung') {
    const g = d.gaeste.find((x) => x.id === q.get('id')); titel('Quittung ' + (g ? g.quittung_nr : '')); ziel.innerHTML = g ? quittung(g) : '';
  } else if (art === 'belegungsplan') { titel('Belegungsplan Winterlager'); ziel.innerHTML = belegungsplan(); }
  else if (art === 'plakat') { titel('QR-Plakat Gastlieger'); ziel.innerHTML = plakat(); }
})();
