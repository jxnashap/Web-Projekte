/* SSV Getränkekasse – Druckansicht: Rechnungen (A4) und Code-Zettel */
(function () {
  'use strict';

  const S = window.SSV.speicher;
  const H = window.SSV.hilfe;
  const esc = H.esc;
  const ziel = document.getElementById('blaetter');
  const q = new URLSearchParams(location.search);
  const STANDER = '<svg class="k-stander"><use href="#stander"/></svg>';
  // Zusammengehöriges nicht umbrechen („Steuer-Nr. 22 290 72188“, „23554 Lübeck“)
  const fest = (s) => '<span style="white-space:nowrap">' + esc(s) + '</span>';
  // SSV-Briefkopf (Vorgabe): Flagge oben links, Vereinsadresse rechts
  const vereinsKopf = (e, extra) => '<div class="r-kopf' + (extra ? ' ' + extra : '') + '">' + STANDER + '<div class="r-verein"><strong>' + esc(e.verein_name) + '</strong>' +
    fest(e.verein_strasse) + '<br>' + fest(e.verein_ort) + '<br>' + esc(e.verein_email) + '</div></div>';
  // Seitenaufbau (Vorgabe: jede Druckseite mit Briefkopf oben und Fußzeile unten, nie eine Seite nur mit Fußzeile/Steuerhinweis).
  // Jedes .r-blatt ist genau eine A4-Seite mit fest unten stehender Fußzeile. Passt ein Blatt nicht, wird es
  //   1. etwas enger gesetzt („knapp“) – bleibt eine Seite, sonst
  //   2. auf Folgeblätter aufgeteilt: Tabellenzeilen wandern (mit „Übertrag“) auf ein Folgeblatt mit Briefkopf, Seitenzahl
  //      und eigener Fußzeile; Zahlungstext, Gruß und Steuerhinweis stehen immer zusammen mit mindestens einer Zeile am Ende.
  // Gemessen wird ohne die Handy-Verkleinerung (zoom), damit Zeilenumbrüche wie im Druck ausfallen.
  function passtAufEineSeite(b) {
    const r = b.getBoundingClientRect(), mm = 210 / r.width, fuss = b.querySelector(':scope > .r-fuss');
    let unten = 0;
    [...b.children].forEach((k) => { if (k !== fuss && !k.classList.contains('r-storno')) unten = Math.max(unten, k.getBoundingClientRect().bottom - r.top); });
    const fussPlatz = fuss ? r.bottom - fuss.getBoundingClientRect().top : 0;   // Fußzeile samt Abstand zum unteren Blattrand
    return (unten + fussPlatz) * mm + 3 <= 297 &&                              // 3 mm Luft über der Fußzeile
      r.height * mm <= 297.05;                                                  // und das Blatt selbst (mit Innenabstand unten) bleibt eine Seite
  }
  function passend(b) {
    b.classList.remove('knapp', 'mehrseitig');
    if (passtAufEineSeite(b)) return true;
    b.classList.add('knapp');
    if (passtAufEineSeite(b)) return true;
    b.classList.remove('knapp');
    return false;
  }
  const zeilenVon = (b) => [...b.querySelectorAll(':scope > .r-tab > tbody.r-zeilen > tr')];
  // Neues Folgeblatt hinter b: Briefkopf, Fortsetzungszeile, Tabelle (Kopf, Übertrag, Zeilen, Summe), alles nach der Tabelle, Fußzeile
  function folgeBlatt(b) {
    const tab = b.querySelector(':scope > .r-tab'), spalten = tab.querySelectorAll('thead th').length;
    const f = document.createElement('section');
    f.className = 'r-blatt r-folge' + (b.classList.contains('r-anhang') ? ' r-anhang' : '');
    Object.assign(f.dataset, b.dataset);
    const storno = b.querySelector(':scope > .r-storno'); if (storno) f.appendChild(storno.cloneNode(true));
    f.appendChild(b.querySelector(':scope > .r-kopf').cloneNode(true));
    const fort = document.createElement('p'); fort.className = 'r-fortsetzung';
    fort.innerHTML = '<strong>' + esc(b.dataset.titel) + ' – Fortsetzung</strong> · ' + esc(b.dataset.name) + ' · <span class="r-seitenzahl">Seite 99 von 99</span>';
    f.appendChild(fort);
    const t2 = tab.cloneNode(false); t2.appendChild(tab.querySelector('thead').cloneNode(true));
    // Übertrag nur mit Beträgen (Rechnung); die Anlage nennt bloß die Fortsetzung
    t2.insertAdjacentHTML('beforeend', (f.dataset.betraege ? '<tbody class="r-uebertrag-von"><tr><td colspan="' + (spalten - 1) + '">Übertrag von Seite 99</td><td class="r">99.999,99 €</td></tr></tbody>' : '') +
      '<tbody class="r-zeilen"></tbody>');
    const summe = tab.querySelector(':scope > tfoot:not(.r-uebertrag)'); if (summe) t2.appendChild(summe);
    f.appendChild(t2);
    // alles hinter der Tabelle (Zahlungstext, Gruß, Steuerhinweis) gehört ans Ende
    let k = tab.nextElementSibling;
    while (k) { const n = k.nextElementSibling; if (!k.classList.contains('r-fuss')) f.appendChild(k); k = n; }
    f.appendChild(b.querySelector(':scope > .r-fuss').cloneNode(true));
    if (!tab.querySelector(':scope > tfoot.r-uebertrag')) {
      tab.insertAdjacentHTML('beforeend', '<tfoot class="r-uebertrag"><tr><td colspan="' + (f.dataset.betraege ? spalten - 1 : spalten) + '">' +
        (f.dataset.betraege ? 'Zwischensumme, Übertrag auf Seite 99' : 'Fortsetzung auf Seite 99') + '</td>' + (f.dataset.betraege ? '<td class="r">99.999,99 €</td>' : '') + '</tr></tfoot>');
    }
    b.after(f);
    return f;
  }
  // Teilt ein zu langes Blatt; liefert false, wenn selbst eine einzige Tabellenzeile nicht passt (dann Notlösung „mehrseitig“)
  function teilen(b) {
    b.classList.remove('knapp');
    const zeilen = zeilenVon(b);
    if (zeilen.length < 2) return false;
    const f = folgeBlatt(b), ziel2 = f.querySelector('tbody.r-zeilen');
    const r = b.getBoundingClientRect(), mm = 210 / r.width;
    // grob vorab: Zeilen, die sicher nicht mehr passen (unter 297 − 22 mm Rand − Übertragszeile), auf einmal verschieben
    let behalten = zeilen.filter((z) => (z.getBoundingClientRect().bottom - r.top) * mm <= 297 - 22 - 9).length;
    behalten = Math.max(1, Math.min(behalten, zeilen.length - Math.min(2, zeilen.length - 1)));   // mindestens 1 (besser 2) Zeilen wandern mit
    ziel2.prepend(...zeilen.slice(behalten));
    while (!passtAufEineSeite(b)) {
      const rest = zeilenVon(b);
      if (rest.length <= 1) return false;
      ziel2.prepend(rest[rest.length - 1]);
    }
    return true;
  }
  // Seitenzahlen, Übertrag und Zwischensummen eines aufgeteilten Dokuments eintragen
  function nummerieren(seiten) {
    const n = seiten.length; let summe = 0;
    seiten.forEach((s, i) => {
      const von = s.querySelector('.r-uebertrag-von td'); if (von) von.textContent = 'Übertrag von Seite ' + i;
      const vonB = s.querySelector('.r-uebertrag-von td.r'); if (vonB) vonB.textContent = H.geld(summe / 100);
      zeilenVon(s).forEach((z) => { summe += +z.dataset.ct || 0; });
      const sz = s.querySelector('.r-seitenzahl'); if (sz) sz.textContent = 'Seite ' + (i + 1) + ' von ' + n;
      const nach = s.querySelector('tfoot.r-uebertrag td');
      if (nach) nach.textContent = (s.dataset.betraege ? 'Zwischensumme, Übertrag auf Seite ' : 'Fortsetzung auf Seite ') + (i + 2);
      const nachB = s.querySelector('tfoot.r-uebertrag td.r'); if (nachB) nachB.textContent = H.geld(summe / 100);
    });
  }
  function seitenAufbauen() {
    document.body.classList.add('r-messen');
    try {
      ziel.querySelectorAll('.r-blatt:not(.r-folge)').forEach((b) => {
        const seiten = [b];
        for (let i = 0; i < seiten.length; i++) {
          if (passend(seiten[i])) continue;
          if (!seiten[i].querySelector(':scope > .r-tab > tbody.r-zeilen') || !teilen(seiten[i])) { seiten[i].classList.add('mehrseitig'); break; }
          seiten.splice(i + 1, 0, seiten[i].nextElementSibling);
        }
        if (seiten.length > 1) {
          nummerieren(seiten);
          seiten.forEach((s) => { if (!s.classList.contains('mehrseitig') && !passtAufEineSeite(s)) s.classList.add('knapp'); });   // Sicherheitsnetz nach dem Eintragen
        }
      });
    } finally { document.body.classList.remove('r-messen'); }
  }

  function rechnungsBlatt(r, e, buchungen) {
    const em = r.empfaenger;
    const ct = (x) => Math.round(Number(x) * 100) || 0;
    const pos = r.positionen.map((p) =>
      '<tr data-ct="' + ct(p.betrag) + '"><td>' + esc(p.name) + (p.einheit === 'kasten' ? ' – Kasten (' + p.stueck + ' Stk.)' : '') + '</td>' +
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
    const P = '&nbsp;· ';   // Trennpunkt bleibt am vorigen Teil, keine Zeile beginnt mit „·“
    const sepaKlein = r.sepa ? fest('Gläubiger-ID ' + (e.glaeubiger_id || '[PLATZHALTER]')) + P + fest('Mandatsreferenz ' + (em.mandatsreferenz || em.nr || '[PLATZHALTER]')) + P : '';
    const fuss = '<div class="r-fuss"><span>' + esc(e.verein_name) + P + fest(e.verein_strasse) + P + fest(e.verein_ort) + P + esc(e.verein_email) + '</span>' +
      '<span>' + sepaKlein + fest('Steuer-Nr. ' + e.steuernummer) + '</span></div>';
    // „im September 2026“ für ganze Monate, sonst „vom … bis …“
    const v = new Date(r.von + 'T12:00:00'), bis = new Date(r.bis + 'T12:00:00');
    const ganzerMonat = v.getDate() === 1 && v.getMonth() === bis.getMonth() && v.getFullYear() === bis.getFullYear() &&
      new Date(bis.getFullYear(), bis.getMonth() + 1, 0).getDate() === bis.getDate();
    const zeitraum = ganzerMonat ? 'im ' + v.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : 'vom ' + H.datum(r.von) + ' bis ' + H.datum(r.bis);

    const daten = (titel, betraege) => ' data-titel="' + esc(titel) + '" data-name="' + esc(em.vorname + ' ' + em.nachname) + '"' + (betraege ? ' data-betraege="1"' : '');
    let html = '<section class="r-blatt"' + daten('Rechnung ' + r.nr, true) + '>' + (r.storniert_am ? '<div class="r-storno">STORNIERT</div>' : '') +
      vereinsKopf(e) +
      '<div class="r-absender">' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) + '</div>' +
      '<div class="r-adresse">' + esc(em.vorname + ' ' + em.nachname) + '<br>' + esc(em.strasse || '') + '<br>' + esc(((em.plz || '') + ' ' + (em.ort || '')).trim()) + '</div>' +
      '<div class="r-meta"><span>Rechnungsnummer</span><strong>' + esc(r.nr) + '</strong><span>Rechnungsdatum</span><span>' + H.datum(r.datum) + '</span>' +
      (em.nr ? '<span>Mitgliedsnummer</span><span>' + esc(em.nr) + '</span>' : '') +
      '<span>Leistungszeitraum</span><span>' + H.datum(r.von) + ' – ' + H.datum(r.bis) + '</span></div>' +
      '<h1>Deine Getränkeabrechnung</h1><p>Moin ' + esc(em.vorname) + ',</p><p>schön, dass du ' + zeitraum + ' bei uns an der Trave warst! Hier ist deine Übersicht über alles, was du dir an unserer Getränkekasse gegönnt hast:</p>' +
      '<table class="r-tab"><thead><tr><th>Artikel</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Betrag</th></tr></thead><tbody class="r-zeilen">' + pos +
      '</tbody><tfoot><tr><td colspan="3">Zusammen</td><td class="r">' + H.geld(r.summe) + '</td></tr></tfoot></table>' +
      '<div class="r-zahlung">' + zahlung + '<p>Kommt dir etwas komisch vor? Dann sprich ' + (e.kassenwart_name ? esc(e.kassenwart_name) : 'den Kassenwart') +
      ' einfach am Steg oder in der Messe an – oder schreib kurz an ' + esc(e.verein_email) + '.</p></div>' +
      '<p class="r-gruss">' + esc(e.fusstext) + '<br><br>' + (e.kassenwart_name ? 'Dein Kassenwart ' + esc(e.kassenwart_name) + '<br>' : '') +
      '<span>für den ' + esc(e.verein_name) + '</span></p>' +
      '<p class="r-steuer">' + esc(e.steuerhinweis) + '</p>' + fuss + '</section>';

    if (buchungen && buchungen.length) {
      const zeilen = buchungen.slice().sort((a, b) => a.zeit.localeCompare(b.zeit)).map((b) =>
        '<tr data-ct="' + ct(b.betrag) + '"><td>' + H.datum(b.zeit) + '</td><td>' + new Date(b.zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '</td>' +
        '<td>' + esc(b.produkt_name) + (b.quelle === 'nachtrag' ? ' (Nachtrag)' : '') + '</td><td class="r">' + b.anzahl + ' ' + H.einheitText(b) + '</td><td class="r">' + H.geld(b.betrag) + '</td></tr>').join('');
      html += '<section class="r-blatt r-anhang"' + daten('Anlage zur Rechnung ' + r.nr + ', Einzelbuchungen', false) + '>' + vereinsKopf(e) +
        '<h2>Einzelbuchungen an der Getränkekasse</h2><p class="r-unterzeile">Anlage zur Rechnung ' + esc(r.nr) + ' · ' + esc(em.vorname + ' ' + em.nachname) + '</p><table class="r-tab"><thead><tr><th>Datum</th><th>Uhrzeit</th><th>Artikel</th><th class="r">Menge</th><th class="r">Betrag</th></tr></thead><tbody class="r-zeilen">' + zeilen +
        '</tbody><tfoot><tr><td colspan="4">Summe</td><td class="r">' + H.geld(r.summe) + '</td></tr></tfoot></table>' + fuss + '</section>';
    }
    return html;
  }

  async function rechnungen() {
    const ids = (q.get('ids') || '').split(',').filter(Boolean);
    // ?mein=<Mitglied>: eigene Rechnung aus „Mein SSV“ (Echtbetrieb: per Mitglieder-Login und Zeilenschutz in der Datenbank)
    const mein = q.get('mein');
    if (!mein && !(await S.angemeldet())) { ziel.innerHTML = '<p style="padding:40px;text-align:center">Bitte zuerst im Kassenwart-Bereich anmelden.</p>'; return; }
    const [liste, e, buchungen] = await Promise.all([mein ? S.meineRechnungen(mein, ids) : S.rechnungenLaden(ids), S.einstellungen(), S.buchungen({ rechnung_ids: ids })]);
    if (!liste.length) { ziel.innerHTML = '<p style="padding:40px;text-align:center">Rechnung nicht gefunden.</p>'; return; }
    liste.sort((a, b) => a.nr.localeCompare(b.nr));
    document.getElementById('titel').textContent = liste.length === 1 ? 'Rechnung ' + liste[0].nr : liste.length + ' Rechnungen';
    document.title = liste.length === 1 ? 'Rechnung ' + liste[0].nr : 'Rechnungen';
    const render = () => {
      const mit = document.getElementById('anhang').checked;
      ziel.innerHTML = liste.map((r) => rechnungsBlatt(r, e, mit ? buchungen.filter((b) => b.rechnung_id === r.id && !b.storniert_am) : null)).join('');
      seitenAufbauen();
    };
    document.getElementById('anhang').addEventListener('change', render);
    // Überschrift-Schrift erst laden, dann messen (sonst stimmen die Zeilenhöhen beim Aufteilen nicht)
    if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('500 17pt "Playfair Display"').catch(() => {}), new Promise((ok) => setTimeout(ok, 2500))]);
    render();
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(render);
  }

  async function pinZettel() {
    document.getElementById('anhang-wahl').hidden = true;
    let liste = [];
    try { liste = JSON.parse(sessionStorage.getItem('ssvg-pinzettel')) || []; } catch (e) { /* leer */ }
    document.getElementById('titel').textContent = 'Code-Zettel (' + liste.length + ')';
    document.title = 'Code-Zettel';
    const e = await S.einstellungen().catch(() => ({}));
    const seiten = [];
    for (let i = 0; i < liste.length; i += 10) seiten.push(liste.slice(i, i + 10));
    ziel.innerHTML = seiten.map((s) => '<section class="r-blatt r-zettelbogen">' + vereinsKopf(e, 'schmal') + '<div class="r-pinzettel">' + s.map((z) =>
      '<div><div class="r-zettel-kopf">' + STANDER + '<div><small>SSV Getränkekasse</small><br><strong>' + esc(z.vorname + ' ' + z.nachname) + '</strong>' +
      (z.nr ? '<br><small>Mitgliedsnr. ' + esc(z.nr) + '</small>' : '') + '</div></div>' +
      '<div><small>Dein persönlicher Code</small><div class="pin">' + esc(z.pin) + '</div><small>Bitte nicht weitergeben. Ändern oder vergessen? In „Mein SSV“ legst du jederzeit einen neuen fest.</small></div></div>').join('') +
      '</div></section>').join('') || '<p style="padding:40px;text-align:center">Keine Codes zum Drucken vorhanden.</p>';
    // Die Klartext-Codes nicht länger als nötig aufbewahren
    window.addEventListener('afterprint', () => sessionStorage.removeItem('ssvg-pinzettel'));
  }

  if (q.get('art') === 'pins') pinZettel(); else rechnungen().catch((e) => { ziel.innerHTML = '<p style="padding:40px">' + esc(e.message) + '</p>'; });
})();
