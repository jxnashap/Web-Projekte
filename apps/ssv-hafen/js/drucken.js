/* SSV Hafen-Manager – Druckansichten im SSV-Briefkopf (Flagge oben links): Rechnungen, Quittung, Belegungsplan, QR-Plakate, Arbeitsbereiche,
   Finanzberichte (Monatsbericht, Kassenprüfung, offene Posten, Gästeliste) */
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
  const nw = (t) => '<span style="white-space:nowrap">' + esc(t) + '</span>';   // Angabe + Nummer bleiben in einer Zeile
  // Lagerplatz einheitlich mit der Nummer aus dem Hafenplan und der Lage: „P13 · Nordlager“, „A1 · Außenlager“ (zentral in daten.js)
  const landplatzName = (p) => p ? Q.platzName(p) : '';
  const kopf = '<div class="r-kopf">' + STANDER + '<div class="r-verein"><strong>' + esc(e.verein_name) + '</strong>' + esc(e.verein_strasse) + '<br>' + esc(e.verein_ort) + '<br>' + esc(e.verein_email) + '</div></div>';

  function rechnung(r) {
    const em = r.empfaenger;
    const winter = r.periode === 'winter', beitrag = r.periode === 'beitrag', ver = r.periode === 'veranstaltung';
    const label = H.periodeText(r);
    const intro = ver ? 'schön, dass du dabei ' + (r.positionen[0] && /\d{2}\.\d{2}\.\d{4}$/.test(r.positionen[0].text) && r.positionen[0].text.slice(-10).split('.').reverse().join('-') < r.datum ? 'warst' : 'bist') + '! Hier ist die Rechnung für ' + esc(label) + ':'
      : beitrag
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
      '<div class="r-meta"><span>Rechnungsnummer</span><strong>' + esc(r.nr) + '</strong><span>Rechnungsdatum</span><span>' + H.datum(r.datum) + '</span><span>Mitgliedsnummer</span><span>' + esc(em.nr) + '</span><span>' + (beitrag ? 'Beitragsjahr' : ver ? 'Veranstaltung' : 'Leistungszeitraum') + '</span><span>' + (beitrag ? r.saison : esc(label)) + '</span></div>' +
      '<h1>' + (beitrag ? 'Dein Mitgliedsbeitrag ' + r.saison : ver ? 'Deine Rechnung' : 'Deine Hafenabrechnung') + '</h1><p>Moin ' + esc(em.vorname) + ',</p><p>' + intro + '</p>' +
      '<table class="r-tab"><thead><tr><th>Leistung</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Betrag</th></tr></thead><tbody>' +
      r.positionen.map((p) => '<tr><td>' + esc(p.text) + '</td><td class="r">' + H.zahl(p.menge, p.menge % 1 ? 2 : 0) + ' ' + esc(p.einheit) + '</td><td class="r">' + H.geld(p.einzelpreis) + '</td><td class="r">' + H.geld(p.betrag) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="3">Zusammen</td><td class="r">' + H.geld(r.summe) + '</td></tr></tfoot></table>' +
      '<div class="r-zahlung">' + zahlung + '<p>Kommt dir etwas komisch vor? Dann sprich ' + esc(e.kassenwart_name || 'den Kassenwart') + ' einfach am Steg oder in der Messe an – oder schreib kurz an ' + esc(e.verein_email) + '.</p></div>' +
      '<p style="margin-top:7mm">' + esc(e.fusstext) + '<br><br>Dein Kassenwart ' + esc(e.kassenwart_name) + '<br><span style="color:#555">für den ' + esc(e.verein_name) + '</span></p>' +
      '<p style="margin-top:4mm;font-size:7.5pt;color:#777">' + (beitrag ? 'Beiträge laut Beitragsordnung des Vereins.' : ver ? 'Kostenbeitrag laut Einladung des Vereins. ' + esc(steuer(r.summe)) : 'Gebühren laut Gebührenordnung des Vereins. ' + esc(steuer(r.summe))) + '</p>' +
      '<div class="r-fuss"><span>' + [nw(e.verein_name), nw(e.verein_strasse), nw(e.verein_ort)].join('&nbsp;· ') + '</span><span>' +
      [r.sepa ? nw('Gläubiger-ID ' + e.glaeubiger_id) : '', r.sepa ? nw('Mandatsreferenz ' + r.mandat_ref) : '', e.steuernummer ? nw('Steuer-Nr. ' + e.steuernummer) : ''].filter(Boolean).join('&nbsp;· ') + '</span></div></section>';
  }

  function quittung(g) {
    const gb = window.HAFEN_GEBUEHREN.gebuehrenFuer(d, Number(g.ankunft.slice(0, 4)));
    return '<section class="blatt klein">' + kopf + '<h1 style="margin-top:5mm">Quittung ' + esc(g.quittung_nr) + '</h1>' +
      '<table class="r-tab"><tbody><tr><td>Boot</td><td>„' + esc(g.bootsname) + '“ · ' + H.zahl(g.laenge, 1) + ' m</td></tr><tr><td>Skipper</td><td>' + esc(g.skipper) + (g.herkunft ? ', ' + esc(g.herkunft) : '') + '</td></tr>' +
      '<tr><td>Liegeplatz</td><td>' + esc(g.platz_id && Q.platz(g.platz_id) ? (Q.platz(g.platz_id).box === 'L' ? 'Längsseits ' : 'Platz ') + Q.platz(g.platz_id).nr : g.platz_angabe ? (/^\s*platz/i.test(g.platz_angabe) ? '' : 'Platz ') + String(g.platz_angabe).trim() + ' (laut Gast)' : '–') + '</td></tr>' +
      '<tr><td>Zeitraum</td><td>ab ' + H.datum(g.ankunft) + ', ' + g.naechte + (Number(g.naechte) === 1 ? ' Nacht' : ' Nächte') + ' × ' + H.geld(gb.gast_nacht) + '</td></tr></tbody>' +
      '<tfoot><tr><td>Betrag</td><td class="r">' + H.geld(g.betrag) + '</td></tr></tfoot></table>' +
      '<p>' + (g.bezahlt_am ? (g.zahlung === 'bar' ? 'Betrag bar dankend erhalten am ' : g.zahlung === 'karte' ? 'Betrag per Karte erhalten am ' : g.zahlung === 'paypal' ? 'Betrag per PayPal erhalten am ' : 'Zahlung eingegangen am ') + H.datum(g.bezahlt_am) + '.' : '<strong>Noch nicht bezahlt.</strong>') + ' ' + esc(steuer(g.betrag)) + ' Gute Fahrt und willkommen zurück!</p>' +
      '<p style="margin-top:10mm;border-top:1px solid #999;width:60mm;padding-top:1mm;font-size:8pt;color:#555">' + esc(e.hafenmeister_name) + ', Hafenmeister · ' + H.datum(g.bezahlt_am || H.tag(new Date())) + '</p></section>';
  }

  function belegungsplan() {
    const saison = HF.aktuelleSaison();
    const bel = Q.belegungen(saison, 'winter').slice().sort((a, b) => a.platz_id.localeCompare(b.platz_id));
    return '<section class="blatt quer mehrseitig">' + kopf + '<h1 style="margin-top:5mm">Belegungsplan Winterlager ' + saison + '/' + String(saison + 1).slice(2) + '</h1>' +
      '<p style="font-size:9pt;color:#555">Reihenfolge beim Ein- und Auslagern nach Belegungsplan und Rangiermöglichkeiten. Boote über ' + Q.maxTxt('kran') + ' werden nicht gekrant.</p>' +
      '<table class="r-tab"><thead><tr><th>Lagerplatz</th><th>Boot</th><th>Typ</th><th class="r">L × B</th><th class="r">Gewicht</th><th>Eigner</th><th>Telefon</th><th>Hinweis</th><th>gekrant ✓</th></tr></thead><tbody>' +
      bel.map((b) => { const bt = Q.boot(b.boot_id); const m = Q.mitglied(bt.eigner_id);
        return '<tr><td class="nw">' + esc(landplatzName(Q.platz(b.platz_id)) || b.platz_id) + '</td><td>' + esc(bt.name) + '</td><td>' + esc(bt.typ) + '</td><td class="r">' + H.zahl(bt.laenge) + ' × ' + H.zahl(bt.breite) + '</td><td class="r">' + H.zahl(bt.gewicht_t, 1) + ' t</td><td>' + esc(Q.name(m)) + '</td><td>' + esc(m.tel) + '</td><td>' + (b.nicht_kranen ? 'nicht kranen' : '') + (Q.zuSchwer(bt) ? ' über ' + Q.maxTxt() + ' – nicht kranen!' : '') + '</td><td>☐</td></tr>'; }).join('') +
      '</tbody></table><div class="r-fuss"><span>' + esc(e.verein_name) + ' · Belegungsplan Winterlager</span><span>Stand ' + H.datum(H.tag(new Date())) + '</span></div></section>';
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
        '<div><span>Team</span>' + team.length + (team.length === 1 ? ' Mitglied' : ' Mitglieder') + '</div></div>' +
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
      '<div class="b-ende">' + (einsaetze.length ? '<h2>Nächste Arbeitseinsätze</h2><table class="r-tab b-tab"><tbody>' + einsaetze.map((x) => '<tr><td style="width:28mm"><strong>' + H.datum(x.datum) + '</strong></td><td>' + esc(x.titel) + (x.bereich_id ? '' : ' <small>(für alle)</small>') + (x.notiz ? '<br><small>' + esc(x.notiz) + '</small>' : '') + '</td><td class="r">' + esc([x.beginn, x.ende].filter(Boolean).join('–')) + (x.beginn ? ' Uhr' : '') + '</td></tr>').join('') + '</tbody></table>' : '') +
      '<div class="r-fuss"><span>' + (kontakt ? 'Enthält Kontaktdaten – nur für den Vereinsgebrauch, bitte nicht öffentlich aushängen.' : esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort)) + '</span><span>Stand ' + H.datum(heute) + '</span></div></div></section>';
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
      (gruppen.length ? gruppen.map(({ b, a }) => '<h2>' + esc(b.name) + ' <small class="b-anz">' + a.length + '</small></h2><table class="r-tab b-tab"><thead><tr><th style="width:8mm">Nr.</th><th>Aufgabe</th><th style="width:28mm">Wann</th><th style="width:27mm">erledigt am</th><th style="width:18mm">von</th></tr></thead><tbody>' +
        a.map((x) => '<tr' + (x.erledigt ? ' class="b-erl"' : '') + '><td>' + (++n) + '</td><td><strong>' + esc(x.titel) + '</strong>' + (x.hinweis ? '<br><small>' + esc(x.hinweis) + '</small>' : '') + '</td><td>' + esc(x.zeitraum || '') + '</td><td class="b-feld nw">' + (x.erledigt ? '✓ ' + H.datum(x.erledigt) : '') + '</td><td class="b-feld"></td></tr>').join('') + '</tbody></table>').join('')
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

  /* ---------- Finanzberichte im Briefkopf: Monatsbericht, Unterlagen Kassenprüfung, offene Posten, Gästeliste.
   * Rechenwege aus HAFEN_GEBUEHREN.finanz – dieselben Zahlen wie in „Finanzen“. Getränke nur, wenn die Getränkekasse erreichbar ist. */
  const FZ = window.HAFEN_GEBUEHREN.finanz; const BER = Object.fromEntries(FZ.BEREICHE);
  const heute = H.tag(new Date());
  const RST = { offen: 'offen', ueberfaellig: 'überfällig', teilbezahlt: 'teilweise bezahlt', ruecklastschrift: 'Rücklastschrift', bezahlt: 'bezahlt', storniert: 'storniert' };
  const kasseLaden = () => { const k = window.SSV && window.SSV.speicher; return k ? k.rechnungen().catch(() => null) : Promise.resolve(null); };
  const fuss = (t) => '<div class="r-fuss"><span>' + esc(e.verein_name) + ' · ' + t + '</span><span>Stand ' + H.datum(heute) + '</span></div>';
  const g0 = (v) => v ? H.geld(v) : '–';
  const kz = (l) => '<div class="f-kz">' + l.map(([t, w, u]) => '<div><span>' + t + '</span><strong>' + w + '</strong>' + (u ? '<small>' + u + '</small>' : '') + '</div>').join('') + '</div>';
  const ohneGetr = (kr) => kr ? '' : '<p class="b-klein">Getränkekasse nicht erreichbar – Getränke sind in diesem Bericht nicht enthalten.</p>';
  const ohneAusgaben = '<p class="b-klein">Nicht enthalten: Ausgaben und Bankbestand – die stehen im Online-Banking bzw. im Kassenbuch.</p>';
  function einzelTab(l) {
    const sum = l.reduce((s, x) => s + x.betrag, 0);
    const KURZ = { beitrag: 'Beitrag', sommer: 'Sommer', winter: 'Winter', gast: 'Gast', veranstaltung: 'Veranstaltung', getraenke: 'Getränke' };
    return '<table class="r-tab b-tab f-einzel"><thead><tr><th style="width:18mm">Datum</th><th style="width:20mm">Bereich</th><th>Rechnung · Beleg</th><th>Von</th><th style="width:21mm">Zahlart</th><th class="r" style="width:19mm">Betrag</th></tr></thead><tbody>' +
      l.map((x) => '<tr><td class="nw">' + H.datum(x.datum) + '</td><td>' + KURZ[x.bereich] + '</td><td><span class="nw">' + esc(x.nr || '–') + '</span>' + (x.beleg ? '<br><small>' + esc(x.beleg) + '</small>' : '') + '</td><td>' + esc(x.wer) + '</td><td>' + esc(x.zahlart) + '</td><td class="r">' + H.geld(x.betrag) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="5">Summe (' + l.length + (l.length === 1 ? ' Eingang' : ' Eingänge') + ')</td><td class="r">' + H.geld(sum) + '</td></tr></tfoot></table>';
  }
  const offenTab = (o, stichtag, kr) => '<table class="r-tab b-tab"><thead><tr><th>Offen am ' + H.datum(stichtag) + '</th><th class="r">Posten</th><th class="r">Betrag</th></tr></thead><tbody>' +
    '<tr><td>Hafen, Beiträge, Veranstaltungen (Rechnungen)</td><td class="r">' + o.nHafen + '</td><td class="r">' + H.geld(o.hafen) + '</td></tr><tr><td>Gastlieger (angekommen, nicht bezahlt)</td><td class="r">' + o.nGast + '</td><td class="r">' + H.geld(o.gast) + '</td></tr>' +
    (kr ? '<tr><td>Getränke (Monatsrechnungen)</td><td class="r">' + o.nGetraenke + '</td><td class="r">' + H.geld(o.getraenke) + '</td></tr>' : '') +
    '</tbody><tfoot><tr><td>Zusammen</td><td class="r">' + (o.nHafen + o.nGast + (kr ? o.nGetraenke : 0)) + '</td><td class="r">' + H.geld(o.summe) + '</td></tr></tfoot></table>';
  function monatsbericht(m, kr) {
    const vm = FZ.monatPlus(m, -1), vj = FZ.monatPlus(m, -12); const eing = FZ.eingaenge(d, kr || []);
    const sum = (mm) => FZ.summe(eing, mm + '-01', FZ.monatsEnde(mm)); const S = sum(m), SV = sum(vm), SJ = sum(vj);
    const ende = FZ.monatsEnde(m); const stichtag = ende < heute ? ende : heute; const o = FZ.offenAm(d, kr || [], stichtag);
    const kl = d.rechnungen.filter((r) => ['ueberfaellig', 'ruecklastschrift'].includes(Q.rstatus(r, heute))).length;
    const gm = d.gaeste.filter((g) => g.zahlung_gemeldet && !g.bezahlt_am && g.status !== 'storniert').length;
    const l = eing.filter((x) => x.datum.startsWith(m));
    titel('Monatsbericht ' + FZ.monatText(m));
    return '<section class="blatt bereich bericht mehrseitig">' + kopf + '<p class="b-ober">Finanzen · Monatsbericht</p><h1>' + FZ.monatText(m) + '</h1>' +
      '<p class="b-lead">Eingänge nach Zahlungsdatum (Überweisung und Lastschrift am Tag der Buchung, Gäste am Tag der Zahlung, Getränke am „bezahlt am“). Rücklastschriften sind abgezogen.</p>' +
      kz([['Eingegangen', H.geld(S.summe), 'Vorjahresmonat ' + H.geld(SJ.summe)], ['davon bar (Gäste)', H.geld(S.bar), 'mit der Barkasse abgleichen'], ['Offen am ' + H.datum(stichtag), H.geld(o.summe), ''], ['Zu klären (Hafen)', String(kl + gm), kl + ' überfällig/Rücklastschrift · ' + gm + ' Gastzahlung gemeldet']]) +
      '<h2>Eingänge nach Bereich</h2><table class="r-tab b-tab"><thead><tr><th>Bereich</th><th class="r">' + FZ.monatText(m) + '</th><th class="r">Vormonat (' + FZ.monatText(vm) + ')</th><th class="r">Vorjahresmonat (' + FZ.monatText(vj) + ')</th></tr></thead><tbody>' +
      FZ.BEREICHE.map(([k, t]) => '<tr><td>' + t + '</td><td class="r">' + (k === 'getraenke' && !kr ? 'n. v.' : g0(S[k])) + '</td><td class="r">' + (k === 'getraenke' && !kr ? 'n. v.' : g0(SV[k])) + '</td><td class="r">' + (k === 'getraenke' && !kr ? 'n. v.' : g0(SJ[k])) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Summe</td><td class="r">' + H.geld(S.summe) + '</td><td class="r">' + H.geld(SV.summe) + '</td><td class="r">' + H.geld(SJ.summe) + '</td></tr></tfoot></table>' +
      '<h2>Offene Posten</h2>' + offenTab(o, stichtag, kr) +
      '<h2>Alle Eingänge im ' + FZ.monatText(m) + '</h2>' + (l.length ? einzelTab(l) : '<p class="b-klein">Keine Eingänge in diesem Monat.</p>') +
      '<div class="b-ende">' + ohneGetr(kr) + ohneAusgaben + fuss('Monatsbericht ' + FZ.monatText(m)) + '</div></section>';
  }
  function kassenpruefung(J, kr) {
    const eing = FZ.eingaenge(d, kr || []); const SJ = FZ.summe(eing, J + '-01-01', J + '-12-31'), SV = FZ.summe(eing, (J - 1) + '-01-01', (J - 1) + '-12-31');
    const ab = FZ.abgerechnet(d, kr || [], J, heute).filter((z) => z.k !== 'getraenke' || kr);
    const abS = ab.reduce((a, z) => ({ n: a.n + z.n, soll: a.soll + z.soll, ist: a.ist + z.ist, offen: a.offen + z.offen }), { n: 0, soll: 0, ist: 0, offen: 0 });
    const stichtag = J + '-12-31' < heute ? J + '-12-31' : heute; const o = FZ.offenAm(d, kr || [], stichtag);
    const KURZ = { beitrag: 'Beiträge', sommer: 'Sommer', winter: 'Winter', gast: 'Gäste', veranstaltung: 'Veranst.', getraenke: 'Getränke' };
    const TIT = { beitrag: 'Beiträge ' + J, sommer: 'Sommerliegeplatz ' + J, winter: 'Winterlager ' + J + '/' + String(J + 1).slice(2), gast: 'Gastlieger (Ankunft ' + J + ')', veranstaltung: 'Veranstaltungen ' + J, getraenke: 'Getränke (Rechnungen ' + J + ')' };
    const l = eing.filter((x) => x.datum.startsWith(String(J)));
    titel('Unterlagen Kassenprüfung ' + J);
    return '<section class="blatt bereich bericht mehrseitig">' + kopf + '<p class="b-ober">Finanzen · Unterlagen für die Kassenprüfung</p><h1>Geschäftsjahr ' + J + '</h1>' +
      '<p class="b-lead">Eingänge nach Zahlungsdatum vom 1.1. bis 31.12.' + J + ' – Grundlage für den Kassenbericht. „Abgerechnet“ zählt nach Abrechnungsjahr (Stand ' + H.datum(heute) + ').</p>' +
      kz([['Eingegangen ' + J, H.geld(SJ.summe), 'Vorjahr ' + H.geld(SV.summe)], ['Abgerechnet für ' + J, H.geld(abS.soll), abS.n + ' Posten'], ['davon noch offen', H.geld(abS.offen), ''], ['Offen am ' + H.datum(stichtag), H.geld(o.summe), 'alle Jahre']]) +
      '<h2>Eingänge je Monat und Bereich</h2><table class="r-tab b-tab f-monate"><thead><tr><th>Monat</th>' + FZ.BEREICHE.map(([k]) => '<th class="r">' + KURZ[k] + '</th>').join('') + '<th class="r">Summe</th></tr></thead><tbody>' +
      FZ.MONATE.map((n, i) => { const mm = J + '-' + String(i + 1).padStart(2, '0'); const s = FZ.summe(eing, mm + '-01', FZ.monatsEnde(mm));
        return '<tr><td>' + n + '</td>' + FZ.BEREICHE.map(([k]) => '<td class="r">' + (k === 'getraenke' && !kr ? 'n. v.' : g0(s[k])) + '</td>').join('') + '<td class="r"><strong>' + g0(s.summe) + '</strong></td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td>Summe ' + J + '</td>' + FZ.BEREICHE.map(([k]) => '<td class="r">' + H.geld(SJ[k]) + '</td>').join('') + '<td class="r">' + H.geld(SJ.summe) + '</td></tr>' +
      '<tr class="f-vorjahr"><td>Vorjahr ' + (J - 1) + '</td>' + FZ.BEREICHE.map(([k]) => '<td class="r">' + H.geld(SV[k]) + '</td>').join('') + '<td class="r">' + H.geld(SV.summe) + '</td></tr></tfoot></table>' +
      '<h2>Abgerechnet für ' + J + '</h2><table class="r-tab b-tab"><thead><tr><th>Bereich</th><th class="r">Anzahl</th><th class="r">Soll</th><th class="r">Ist</th><th class="r">Offen</th></tr></thead><tbody>' +
      ab.map((z) => '<tr><td>' + TIT[z.k] + '</td><td class="r">' + z.n + '</td><td class="r">' + H.geld(z.soll) + '</td><td class="r">' + H.geld(z.ist) + '</td><td class="r">' + H.geld(z.offen) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Summe</td><td class="r">' + abS.n + '</td><td class="r">' + H.geld(abS.soll) + '</td><td class="r">' + H.geld(abS.ist) + '</td><td class="r">' + H.geld(abS.offen) + '</td></tr></tfoot></table>' +
      '<h2>Offene Posten</h2>' + offenTab(o, stichtag, kr) +
      '<h2>Einzelaufstellung aller Eingänge ' + J + '</h2>' + (l.length ? einzelTab(l) : '<p class="b-klein">Keine Eingänge.</p>') +
      '<div class="b-ende">' + ohneGetr(kr) + ohneAusgaben +
        '<div class="f-unterschrift"><div><span></span>Ort, Datum · Kassenprüfer/in</div><div><span></span>Ort, Datum · Kassenprüfer/in</div><div><span></span>Ort, Datum · Kassenwart</div></div>' +
        fuss('Unterlagen Kassenprüfung ' + J) + '</div></section>';
  }
  function offenePosten(f, kr) {
    const getr = f.bereich === 'getraenke';
    const posten = [];
    if (!getr) {
      d.rechnungen.filter((r) => Q.rest(r) > 0 && (!f.bereich || r.periode === f.bereich) && (!f.jahr || String(r.saison) === f.jahr) && (!f.monat || String(r.datum).startsWith(f.monat)))
        .forEach((r) => posten.push({ b: r.periode, nr: r.nr, datum: r.datum, faellig: r.faellig, wer: r.empfaenger.vorname + ' ' + r.empfaenger.nachname + ' (' + r.empfaenger.nr + ')', betrag: r.summe, offen: Q.rest(r), st: RST[Q.rstatus(r, heute)], weg: r.sepa ? (r.sepa_lauf ? 'Lastschrift ' + r.sepa_lauf : 'Lastschrift vorgemerkt') : 'Überweisung' }));
      if (!f.bereich || f.bereich === 'gast') d.gaeste.filter((g) => g.status !== 'storniert' && !g.bezahlt_am && g.ankunft <= heute && (!f.jahr || g.ankunft.startsWith(f.jahr)) && (!f.monat || g.ankunft.startsWith(f.monat)))
        .forEach((g) => posten.push({ b: 'gast', nr: g.quittung_nr || '', datum: g.ankunft, faellig: g.ankunft, wer: '„' + g.bootsname + '“ (Gast)', betrag: Number(g.betrag || 0), offen: Number(g.betrag || 0), st: g.zahlung_gemeldet ? 'vom Gast gemeldet' : 'nicht bezahlt', weg: g.zahlung && g.zahlung !== 'offen' ? FZ.ZAHLART[g.zahlung] || g.zahlung : '' }));
    } else (kr || []).filter((r) => !r.storniert_am && !r.bezahlt_am && (!f.jahr || String(r.datum).startsWith(f.jahr)) && (!f.monat || String(r.datum).startsWith(f.monat)))
      .forEach((r) => posten.push({ b: 'getraenke', nr: r.nr, datum: String(r.datum).slice(0, 10), faellig: r.faellig, wer: r.empfaenger ? r.empfaenger.vorname + ' ' + r.empfaenger.nachname + ' (' + r.empfaenger.nr + ')' : '', betrag: Number(r.summe), offen: Number(r.summe), st: r.faellig && r.faellig < heute ? 'überfällig' : 'offen', weg: r.sepa ? 'Lastschrift' : 'Überweisung' }));
    const gruppen = FZ.BEREICHE.map(([k, t]) => ({ k, t, l: posten.filter((p) => p.b === k).sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.nr).localeCompare(String(b.nr))) })).filter((g) => g.l.length);
    const gesamt = posten.reduce((s, p) => s + p.offen, 0);
    const auswahl = [f.bereich ? 'Bereich ' + (f.bereich === 'gast' ? 'Gastlieger' : BER[f.bereich]) : 'alle Bereiche' + (getr ? '' : ' (ohne Getränke)'), f.jahr ? 'Abrechnungsjahr ' + f.jahr : '', f.monat ? 'Monat ' + FZ.monatText(f.monat) : ''].filter(Boolean).join(' · ');
    titel('Offene Posten');
    return '<section class="blatt bereich bericht mehrseitig">' + kopf + '<p class="b-ober">Finanzen · Offene Posten</p><h1>Offene Posten am ' + H.datum(heute) + '</h1>' +
      '<p class="b-lead">' + esc(auswahl) + ' · ' + posten.length + ' Posten · zusammen <strong>' + H.geld(gesamt) + '</strong>' + (getr && !kr ? ' · Getränkekasse nicht erreichbar' : '') + '</p>' +
      (gruppen.length ? gruppen.map((g) => '<h2>' + g.t + ' <small class="b-anz">' + g.l.length + ' · ' + H.geld(g.l.reduce((s, p) => s + p.offen, 0)) + '</small></h2><table class="r-tab b-tab"><thead><tr><th style="width:28mm">Nr.</th><th style="width:18mm">Datum</th><th style="width:18mm">Fällig</th><th>Mitglied / Boot</th><th class="r" style="width:19mm">Betrag</th><th class="r" style="width:19mm">offen</th><th style="width:36mm">Stand</th></tr></thead><tbody>' +
        g.l.map((p) => '<tr><td class="nw">' + esc(p.nr || '–') + '</td><td class="nw">' + H.datum(p.datum) + '</td><td class="nw">' + H.datum(p.faellig) + '</td><td>' + esc(p.wer) + '</td><td class="r">' + H.geld(p.betrag) + '</td><td class="r"><strong>' + H.geld(p.offen) + '</strong></td><td>' + esc(p.st) + (p.weg ? '<br><small class="nw">' + esc(p.weg) + '</small>' : '') + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="5">Summe ' + g.t + '</td><td class="r">' + H.geld(g.l.reduce((s, p) => s + p.offen, 0)) + '</td><td></td></tr></tfoot></table>').join('') : '<p>Nichts offen – alles bezahlt.</p>') +
      '<div class="b-ende">' + (getr ? '' : '<p class="b-klein">Getränke-Rechnungen stehen in der Getränkekasse (eigene Liste). Gastlieger: nur angekommene Gäste ohne Zahlung.</p>') + fuss('Offene Posten') + '</div></section>';
  }
  function gaesteliste(f) {
    const monat = !!f.monat; const wann = monat ? FZ.monatText(f.monat) : 'Saison ' + f.saison;
    const gs = d.gaeste.filter((g) => g.status !== 'storniert' && g.ankunft.startsWith(monat ? f.monat : String(f.saison))).sort((a, b) => a.ankunft.localeCompare(b.ankunft) || a.bootsname.localeCompare(b.bootsname, 'de'));
    const sum = (l) => l.reduce((s, g) => s + Number(g.betrag || 0), 0);
    const bez = gs.filter((g) => g.bezahlt_am); const je = (k) => sum(bez.filter((g) => g.zahlung === k));
    const ab = (g) => H.tag(new Date(new Date(g.ankunft + 'T12:00:00').getTime() + g.naechte * 864e5));
    const platz = (g) => g.platz_id && Q.platz(g.platz_id) ? Q.platzName(g.platz_id) : g.platz_angabe ? (/^\s*platz/i.test(g.platz_angabe) ? '' : 'Platz ') + String(g.platz_angabe).trim() + ' (laut Gast)' : '–';
    const stand = (g) => g.bezahlt_am ? 'bezahlt ' + H.kurz(String(g.bezahlt_am).slice(0, 10)) : g.zahlung_gemeldet ? 'gemeldet, ungeprüft' : g.ankunft > heute ? 'angekündigt' : 'offen';
    const naechte = gs.reduce((s, g) => s + Number(g.naechte || 0), 0);
    titel('Gästeliste ' + wann);
    return '<section class="blatt bereich bericht mehrseitig">' + kopf + '<p class="b-ober">Hafengeld · Gastlieger</p><h1>Gästeliste ' + wann + '</h1>' +
      '<p class="b-lead">Gäste und Nächte zählen nach dem Ankunftstag: ein Aufenthalt über den Monatswechsel steht ganz beim Ankunftsmonat.</p>' +
      kz([['Gäste · Nächte', gs.length + ' · ' + naechte, ''], ['Einnahmen (bezahlt)', H.geld(sum(bez)), ['ueberweisung', 'paypal', 'karte'].filter((k) => je(k)).map((k) => FZ.ZAHLART[k] + ' ' + H.geld(je(k))).join(' · ')], ['davon bar', H.geld(je('bar')), 'mit der Barkasse abgleichen'],
        ['offen', H.geld(sum(gs.filter((g) => !g.bezahlt_am && !g.zahlung_gemeldet))), ''], ['gemeldet, ungeprüft', H.geld(sum(gs.filter((g) => !g.bezahlt_am && g.zahlung_gemeldet))), '']]) +
      (gs.length ? '<table class="r-tab b-tab"><thead><tr><th style="width:24mm">Ankunft</th><th>Boot</th><th style="width:30mm">Platz</th><th class="r" style="width:13mm">Nächte</th><th class="r" style="width:18mm">Betrag</th><th style="width:21mm">Zahlart</th><th style="width:30mm">Stand · Quittung</th></tr></thead><tbody>' +
        gs.map((g) => '<tr><td class="nw">' + H.datum(g.ankunft) + '<br><small>bis ' + H.datum(ab(g)) + '</small></td><td><strong>„' + esc(g.bootsname) + '“</strong>' + (g.laenge ? '<br><small>' + H.zahl(g.laenge, 1) + ' m</small>' : '') + '</td><td>' + esc(platz(g)) + '</td><td class="r">' + g.naechte + '</td><td class="r">' + H.geld(g.betrag) + '</td><td>' + esc(g.zahlung && g.zahlung !== 'offen' ? FZ.ZAHLART[g.zahlung] || g.zahlung : '–') + '</td><td>' + stand(g) + (g.quittung_nr ? '<br><small class="nw">' + esc(g.quittung_nr) + '</small>' : '') + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="3">Summe</td><td class="r">' + naechte + '</td><td class="r">' + H.geld(sum(gs)) + '</td><td colspan="2"></td></tr></tfoot></table>' : '<p>Keine Gastlieger ' + (monat ? 'im ' + wann : 'in der ' + wann) + '.</p>') +
      '<div class="b-ende"><div class="f-bar">Barkasse: laut Liste <strong>' + H.geld(je('bar')) + '</strong> bar eingenommen · gezählt: ____________ € · Datum/Unterschrift: ______________________</div>' +
        '<p class="b-klein">Barbestand und Abgabe an den Kassenwart stehen nicht in den Daten – bitte oben eintragen.</p>' + fuss('Gästeliste ' + wann) + '</div></section>';
  }
  // Finanzberichte brauchen die Getränkekasse (asynchron)
  async function finanzDruck(art) {
    ziel.innerHTML = '<p style="padding:40px;text-align:center">Wird zusammengestellt …</p>';
    const kr = art === 'gaesteliste' || (art === 'offeneposten' && q.get('bereich') !== 'getraenke') ? [] : await kasseLaden();
    if (art === 'monatsbericht') ziel.innerHTML = monatsbericht(/^\d{4}-\d{2}$/.test(q.get('monat') || '') ? q.get('monat') : heute.slice(0, 7), kr);
    else if (art === 'kassenpruefung') ziel.innerHTML = kassenpruefung(Number(q.get('jahr')) || Number(heute.slice(0, 4)), kr);
    else if (art === 'offeneposten') ziel.innerHTML = offenePosten({ bereich: q.get('bereich') || '', jahr: q.get('jahr') || '', monat: q.get('monat') || '' }, kr);
    else if (art === 'gaesteliste') ziel.innerHTML = gaesteliste(q.get('monat') ? { monat: q.get('monat') } : { saison: Number(q.get('saison')) || HF.aktuelleSaison() });
  }

  const art = q.get('art');
  if (art === 'rechnungen') {
    const ids = (q.get('ids') || '').split(','); const liste = d.rechnungen.filter((r) => ids.includes(r.id)).sort((a, b) => a.nr.localeCompare(b.nr));
    titel(liste.length === 1 ? 'Rechnung ' + liste[0].nr : liste.length + ' Rechnungen'); ziel.innerHTML = liste.map(rechnung).join('');
    // Passt eine Rechnung nicht auf ein Blatt (sehr viele Positionen), läuft sie mit Seitenrand weiter – nichts wird abgeschnitten
    ziel.querySelectorAll('.blatt').forEach((b) => { const r = b.getBoundingClientRect(); if (r.height / r.width * 210 > 297.5) b.classList.add('mehrseitig', 'r-lang'); });
  } else if (art === 'quittung') {
    const g = d.gaeste.find((x) => x.id === q.get('id')); titel('Quittung ' + (g ? g.quittung_nr : '')); ziel.innerHTML = g ? quittung(g) : '';
  } else if (art === 'belegungsplan') { titel('Belegungsplan Winterlager'); ziel.innerHTML = belegungsplan(); }
  else if (art === 'plakat') { titel('QR-Plakat Gastlieger'); ziel.innerHTML = plakat(); }
  else if (art === 'bereiche') bereicheDrucken();
  else if (art === 'aufgabenliste') aufgabenliste();
  else if (art === 'einkauf') einkaufsliste();
  else if (['monatsbericht', 'kassenpruefung', 'offeneposten', 'gaesteliste'].includes(art)) finanzDruck(art);
  else if (art === 'einsatz') { const x = (d.arbeitseinsaetze || []).find((y) => y.id === q.get('id')); titel('QR-Plakat Arbeitseinsatz'); ziel.innerHTML = x ? einsatzPlakat(x) : ''; }
})();
