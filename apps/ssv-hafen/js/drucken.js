/* SSV Hafen-Manager – Druckansichten im SSV-Briefkopf (Flagge oben links): Rechnungen, Quittung, Belegungsplan, QR-Plakate, Arbeitsbereiche */
(function () {
  'use strict';
  const HF = window.HAFEN; const { H, Q } = HF; const esc = H.esc;
  const d = HF.laden(); const e = d.einstellungen;
  const q = new URLSearchParams(location.search);
  const ziel = document.getElementById('blaetter');
  const titel = (t) => { document.getElementById('titel').textContent = t; document.title = t; };
  const STANDER = '<svg class="stander"><use href="#stander"/></svg>';
  // Steuerhinweis laut Einstellungen (Hafen-Rechnungen und Quittungen; Mitgliedsbeiträge ohne)
  const steuer = (betrag) => e.steuer_hinweis === 'kleinunternehmer' ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
    : e.steuer_hinweis === 'ust19' ? 'Im Betrag von ' + H.geld(betrag) + ' sind 19 % Umsatzsteuer (' + H.geld(Math.round((betrag - betrag / 1.19) * 100) / 100) + ') enthalten.'
    : e.steuer_hinweis === 'frei' ? (e.steuer_text || '') : '';
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
      '<p style="margin-top:4mm;font-size:7.5pt;color:#777">' + (beitrag ? 'Beiträge laut Beitragsordnung des Vereins.' : 'Gebühren laut Gebührenordnung des Vereins. ' + esc(steuer(r.summe))) + '</p>' +
      '<div class="r-fuss"><span>' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + '</span><span>' +
      (r.sepa ? 'Gläubiger-ID ' + esc(e.glaeubiger_id) + ' · Mandatsreferenz ' + esc(r.mandat_ref) + ' · ' : '') + (e.steuernummer ? 'Steuer-Nr. ' + esc(e.steuernummer) : '') + '</span></div></section>';
  }

  function quittung(g) {
    const gb = window.HAFEN_GEBUEHREN.gebuehrenFuer(d, Number(g.ankunft.slice(0, 4)));
    return '<section class="blatt klein">' + kopf + '<h1 style="margin-top:5mm">Quittung ' + esc(g.quittung_nr) + '</h1>' +
      '<table class="r-tab"><tbody><tr><td>Boot</td><td>„' + esc(g.bootsname) + '“ · ' + H.zahl(g.laenge, 1) + ' m</td></tr><tr><td>Skipper</td><td>' + esc(g.skipper) + (g.herkunft ? ', ' + esc(g.herkunft) : '') + '</td></tr>' +
      '<tr><td>Liegeplatz</td><td>' + esc(g.platz_id ? (Q.platz(g.platz_id).box === 'L' ? 'Längsseits ' : 'Platz ') + Q.platz(g.platz_id).nr : '') + '</td></tr><tr><td>Zeitraum</td><td>ab ' + H.datum(g.ankunft) + ', ' + g.naechte + ' × ' + H.geld(gb.gast_nacht) + '</td></tr></tbody>' +
      '<tfoot><tr><td>Betrag</td><td class="r">' + H.geld(g.betrag) + '</td></tr></tfoot></table>' +
      '<p>' + (g.bezahlt_am ? (g.zahlung === 'bar' ? 'Betrag bar dankend erhalten am ' : g.zahlung === 'karte' ? 'Betrag per Karte erhalten am ' : g.zahlung === 'paypal' ? 'Betrag per PayPal erhalten am ' : 'Zahlung eingegangen am ') + H.datum(g.bezahlt_am) + '.' : '<strong>Noch nicht bezahlt.</strong>') + ' ' + esc(steuer(g.betrag)) + ' Gute Fahrt und willkommen zurück!</p>' +
      '<p style="margin-top:10mm;border-top:1px solid #999;width:60mm;padding-top:1mm;font-size:8pt;color:#555">' + esc(e.hafenmeister_name) + ', Hafenmeister · ' + H.datum(g.ankunft) + '</p></section>';
  }

  function belegungsplan() {
    const saison = HF.aktuelleSaison();
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
    const gb = window.HAFEN_GEBUEHREN.gebuehrenFuer(d, HF.aktuelleSaison());
    return '<section class="blatt plakat">' + kopf +
      '<h1>Moin und willkommen!</h1><p class="unter">Grünes Schild? Einfach festmachen – dann hier anmelden und gleich bezahlen:</p>' +
      '<div class="qr">' + qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) + '</div>' +
      '<p class="preis">' + H.geld(gb.gast_nacht) + ' pro Nacht</p><p>Platznummer steht am Schild · bezahlen per GiroCode (Banking-App)' + (e.paypal_me ? ', PayPal' : '') + ' oder bar · niemand muss kommen<br>Fragen: Hafenmeister ' + esc(e.hafenmeister_name) + ' · ' + esc(e.hafenmeister_tel) + '</p>' +
      '<div class="sprachen"><p><strong>English:</strong> Welcome! Green sign = free berth. Moor up, scan the code, register with the berth number and pay right away. ' + H.geld(gb.gast_nacht) + ' per night.</p>' +
      '<p><strong>Dansk:</strong> Velkommen! Grønt skilt = ledig plads. Fortøj, scan koden, tilmeld dig med pladsnummeret og betal med det samme. ' + H.geld(gb.gast_nacht) + ' pr. nat.</p></div></section>';
  }

  function einsatzPlakat(x) {
    const code = ((d.arbeitseinsatz_codes || []).find((c) => c.einsatz_id === x.id) || {}).code || '';
    const url = new URL('mein-ssv.html?einsatz=' + encodeURIComponent(code), location.href).href;
    const qr = qrcode(0, 'M'); qr.addData(url, 'Byte'); qr.make();
    return '<section class="blatt plakat">' + kopf +
      '<h1>Arbeitseinsatz</h1><p class="unter"><strong>' + esc(x.titel) + '</strong><br>' + H.datum(x.datum) + (x.beginn ? ' · ' + esc(x.beginn) + (x.ende ? '–' + esc(x.ende) : '') + ' Uhr' : '') + '</p>' +
      '<div class="qr">' + qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) + '</div>' +
      '<p class="preis">Scannen · in „Mein SSV“ anmelden · Stunden eintragen</p><p>Kein Handy dabei? Einfach beim Vorstand melden. Code für die Eingabe von Hand: <strong>' + esc(code) + '</strong></p>' +
      (x.notiz ? '<p>' + esc(x.notiz) + '</p>' : '') + '<p style="font-size:10pt;color:#555">Danke fürs Mitmachen! Der Verein bestätigt die Stunden, danach erscheinen sie in „Mein SSV“.</p></section>';
  }


  // Arbeitsbereich-Blatt: Leitung, Aufgaben zum Abhaken, Team mit Stundenstand, nächste Einsätze
  function bereichBlatt(b, kontakt) {
    const saison = HF.aktuelleSaison(); const G = window.HAFEN_GEBUEHREN; const heute = H.tag(new Date());
    const team = (d.arbeitsbereich_mitglieder || []).filter((z) => z.bereich_id === b.id).map((z) => ({ z, m: Q.mitglied(z.mitglied_id) })).filter((x) => x.m)
      .sort((x, y) => (x.z.rolle === 'leitung' ? 0 : 1) - (y.z.rolle === 'leitung' ? 0 : 1) || Q.name(x.m).localeCompare(Q.name(y.m), 'de'));
    const leitung = team.filter((x) => x.z.rolle === 'leitung');
    const std = (mid, nurBereich) => (d.arbeitsdienst || []).filter((a) => a.mitglied_id === mid && a.status !== 'abgelehnt' && a.status !== 'eingereicht' && String(a.datum).startsWith(String(saison)) && (!nurBereich || a.bereich_id === b.id)).reduce((s, a) => s + Number(a.stunden || 0), 0);
    const z1 = (v) => H.zahl(v, v % 1 ? 1 : 0);
    const einsaetze = (d.arbeitseinsaetze || []).filter((x) => x.datum >= heute && (x.bereich_id === b.id || !x.bereich_id)).sort((x, y) => x.datum.localeCompare(y.datum)).slice(0, 5);
    const aufgaben = (b.aufgaben || []).filter((a) => a.art !== 'besorgen'); const kauf = (b.aufgaben || []).filter((a) => a.art === 'besorgen' && !a.erledigt);
    const summe = aufgaben.reduce((s, a) => s + (Number(a.stunden) || 0), 0);
    return '<section class="blatt bereich mehrseitig">' + kopf +
      '<p class="b-ober">Arbeitsdienst ' + saison + '</p><h1>' + esc(b.name) + '</h1>' +
      (b.beschreibung ? '<p class="b-lead">' + esc(b.beschreibung) + '</p>' : '') +
      '<div class="b-info"><div><span>Leitung</span>' + (leitung.length ? leitung.map((x) => '<strong>' + esc(Q.name(x.m)) + '</strong>' + (kontakt && x.m.tel ? ' · ' + esc(x.m.tel) : '')).join('<br>') : '<em>noch nicht festgelegt</em>') + '</div>' +
        (b.treffpunkt ? '<div><span>Treffpunkt / Hinweise</span>' + esc(b.treffpunkt) + '</div>' : '') +
        '<div><span>Team</span>' + team.length + ' Mitglieder</div></div>' +
      '<h2>Aufgaben</h2>' + (aufgaben.length ? '<table class="r-tab b-tab"><thead><tr><th style="width:6mm">Nr.</th><th>Aufgabe</th><th style="width:28mm">Wann</th><th class="r" style="width:10mm">Std.*</th><th style="width:25mm">erledigt am</th><th style="width:14mm">von</th></tr></thead><tbody>' +
        aufgaben.map((a, i) => '<tr' + (a.erledigt ? ' class="b-erl"' : '') + '><td>' + (i + 1) + '</td><td><strong>' + esc(a.titel) + '</strong>' + (a.hinweis ? '<br><small>' + esc(a.hinweis) + '</small>' : '') + '</td><td>' + esc(a.zeitraum || '') + '</td><td class="r">' + (a.stunden ? z1(Number(a.stunden)) : '') + '</td><td class="b-feld">' + (a.erledigt ? '✓ ' + H.datum(a.erledigt) : '') + '</td><td class="b-feld"></td></tr>').join('') +
        '</tbody>' + (summe ? '<tfoot><tr><td></td><td colspan="2">Richtwert gesamt</td><td class="r">' + z1(summe) + '</td><td colspan="2"></td></tr></tfoot>' : '') + '</table><p class="b-klein">* Richtwert für die Planung. Geleistete Stunden bitte wie gewohnt melden (QR-Code beim Einsatz oder „Mein SSV“).</p>'
        : '<p class="b-klein">Noch keine Aufgaben eingetragen.</p>') +
      (kauf.length ? '<h2>Besorgen</h2><ul class="b-kauf">' + kauf.map((a) => '<li><span class="b-box"></span>' + esc(a.titel) + (a.hinweis && !/^Besorgen/.test(a.hinweis) ? ' <small>' + esc(a.hinweis) + '</small>' : '') + '</li>').join('') + '</ul>' : '') +
      '<h2>Team</h2>' + (team.length ? '<table class="r-tab b-tab"><thead><tr><th>Name</th><th>Rolle</th>' + (kontakt ? '<th>Telefon</th><th>E-Mail</th>' : '') + '<th class="r">Std. hier</th><th class="r">Std. gesamt</th></tr></thead><tbody>' +
        team.map(({ z, m }) => { const a = G && G.arbeitsdienst && (m.art === 'ausuebend' || m.art === 'probe') ? G.arbeitsdienst(d, saison, m) : null;
          return '<tr><td>' + esc(Q.name(m)) + '</td><td>' + (z.rolle === 'leitung' ? '<strong>Leitung</strong>' : 'Mitglied') + '</td>' + (kontakt ? '<td>' + esc(m.tel || '') + '</td><td>' + esc(m.email || '') + '</td>' : '') +
            '<td class="r">' + z1(std(m.id, true)) + '</td><td class="r">' + z1(std(m.id, false)) + (a && !a.befreit && a.soll ? ' / ' + a.soll : a && a.befreit ? ' (befreit)' : '') + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<p class="b-klein">Noch niemand zugeordnet.</p>') +
      (einsaetze.length ? '<h2>Nächste Arbeitseinsätze</h2><table class="r-tab b-tab"><tbody>' + einsaetze.map((x) => '<tr><td style="width:28mm"><strong>' + H.datum(x.datum) + '</strong></td><td>' + esc(x.titel) + (x.bereich_id ? '' : ' <small>(für alle)</small>') + (x.notiz ? '<br><small>' + esc(x.notiz) + '</small>' : '') + '</td><td class="r">' + esc([x.beginn, x.ende].filter(Boolean).join('–')) + (x.beginn ? ' Uhr' : '') + '</td></tr>').join('') + '</tbody></table>' : '') +
      '<div class="r-fuss"><span>' + (kontakt ? 'Enthält Kontaktdaten – nur für den Vereinsgebrauch, bitte nicht öffentlich aushängen.' : esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort)) + '</span><span>Stand ' + H.datum(heute) + '</span></div></section>';
  }
  function bereicheDrucken() {
    const id = q.get('id'); const kontakt = q.get('kontakt') !== '0';
    const liste = (d.arbeitsbereiche || []).filter((b) => id ? b.id === id : b.aktiv !== false).sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name, 'de'));
    titel(liste.length === 1 ? 'Arbeitsgruppe ' + liste[0].name : 'Arbeitsgruppen (' + liste.length + ')');
    ziel.innerHTML = liste.map((b) => bereichBlatt(b, kontakt)).join('') || '<p style="padding:40px;text-align:center">Keine Arbeitsgruppe gefunden.</p>';
    // Schalter in der Leiste: mit/ohne Telefon und E-Mail (ohne = zum Aushängen am Schwarzen Brett)
    const l = document.querySelector('.leiste'); if (l && !l.querySelector('#kontakt')) {
      l.insertAdjacentHTML('beforeend', '<label style="display:flex;gap:6px;align-items:center;font-size:14px"><input type="checkbox" id="kontakt"' + (kontakt ? ' checked' : '') + '> Telefon/E-Mail mitdrucken</label>');
      l.querySelector('#kontakt').addEventListener('change', (ev) => { const u = new URL(location.href); u.searchParams.set('kontakt', ev.target.checked ? '1' : '0'); location.replace(u.href); });
    }
  }

  // Gesamt-Aufgabenliste aller Gruppen (wie die Excel-Aktionsliste) und Einkaufsliste
  const gruppenSortiert = () => (d.arbeitsbereiche || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name, 'de'));
  function aufgabenliste() {
    const id = q.get('id'), status = q.get('status') || 'offen', heute = H.tag(new Date()); let n = 0;
    const gruppen = gruppenSortiert().filter((b) => id ? b.id === id : true).map((b) => ({ b, a: (b.aufgaben || []).filter((x) => x.art !== 'besorgen' && (status === 'alle' || (status === 'offen' ? !x.erledigt : !!x.erledigt))) })).filter((x) => x.a.length);
    titel('Aufgabenliste' + (id && gruppen[0] ? ' ' + gruppen[0].b.name : ''));
    ziel.innerHTML = '<section class="blatt bereich mehrseitig">' + kopf + '<p class="b-ober">Arbeitsdienst ' + HF.aktuelleSaison() + '</p><h1>Aufgabenliste' + (status === 'offen' ? ' – offen' : status === 'erledigt' ? ' – erledigt' : '') + '</h1>' +
      (gruppen.length ? gruppen.map(({ b, a }) => '<h2>' + esc(b.name) + ' <small class="b-anz">' + a.length + '</small></h2><table class="r-tab b-tab"><thead><tr><th style="width:8mm">Nr.</th><th>Aufgabe</th><th style="width:28mm">Wann</th><th style="width:24mm">erledigt am</th><th style="width:18mm">von</th></tr></thead><tbody>' +
        a.map((x) => '<tr' + (x.erledigt ? ' class="b-erl"' : '') + '><td>' + (++n) + '</td><td><strong>' + esc(x.titel) + '</strong>' + (x.hinweis ? '<br><small>' + esc(x.hinweis) + '</small>' : '') + '</td><td>' + esc(x.zeitraum || '') + '</td><td class="b-feld">' + (x.erledigt ? '✓ ' + H.datum(x.erledigt) : '') + '</td><td class="b-feld"></td></tr>').join('') + '</tbody></table>').join('')
        : '<p>Keine Aufgaben für diese Auswahl.</p>') +
      '<div class="r-fuss"><span>' + esc(e.verein_name) + ' · Aufgabenliste Arbeitsdienst</span><span>Stand ' + H.datum(heute) + '</span></div></section>';
  }
  function einkaufsliste() {
    const heute = H.tag(new Date());
    const gruppen = gruppenSortiert().map((b) => ({ b, k: (b.aufgaben || []).filter((x) => x.art === 'besorgen' && !x.erledigt) })).filter((x) => x.k.length);
    titel('Einkaufsliste Arbeitsdienst');
    ziel.innerHTML = '<section class="blatt bereich mehrseitig">' + kopf + '<p class="b-ober">Arbeitsdienst ' + HF.aktuelleSaison() + '</p><h1>Einkaufsliste</h1>' +
      (gruppen.length ? gruppen.map(({ b, k }) => '<h2>' + esc(b.name) + '</h2><ul class="b-kauf">' + k.map((a) => '<li><span class="b-box"></span>' + esc(a.titel) + (a.hinweis && !/^Besorgen/.test(a.hinweis) ? ' <small>' + esc(a.hinweis) + '</small>' : '') + '</li>').join('') + '</ul>').join('') : '<p>Die Einkaufsliste ist leer.</p>') +
      '<div class="r-fuss"><span>' + esc(e.verein_name) + ' · Einkaufsliste Arbeitsdienst</span><span>Stand ' + H.datum(heute) + '</span></div></section>';
  }

  const art = q.get('art');
  if (art === 'rechnungen') {
    const ids = (q.get('ids') || '').split(','); const liste = d.rechnungen.filter((r) => ids.includes(r.id)).sort((a, b) => a.nr.localeCompare(b.nr));
    titel(liste.length === 1 ? 'Rechnung ' + liste[0].nr : liste.length + ' Rechnungen'); ziel.innerHTML = liste.map(rechnung).join('');
  } else if (art === 'quittung') {
    const g = d.gaeste.find((x) => x.id === q.get('id')); titel('Quittung ' + (g ? g.quittung_nr : '')); ziel.innerHTML = g ? quittung(g) : '';
  } else if (art === 'belegungsplan') { titel('Belegungsplan Winterlager'); ziel.innerHTML = belegungsplan(); }
  else if (art === 'plakat') { titel('QR-Plakat Gastlieger'); ziel.innerHTML = plakat(); }
  else if (art === 'bereiche') bereicheDrucken();
  else if (art === 'aufgabenliste') aufgabenliste();
  else if (art === 'einkauf') einkaufsliste();
  else if (art === 'einsatz') { const x = (d.arbeitseinsaetze || []).find((y) => y.id === q.get('id')); titel('QR-Plakat Arbeitseinsatz'); ziel.innerHTML = x ? einsatzPlakat(x) : ''; }
})();
