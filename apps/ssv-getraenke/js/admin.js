/* SSV Getränkekasse – Kassenwart-Bereich */
(function () {
  'use strict';

  const S = window.SSV.speicher;
  const H = window.SSV.hilfe;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = H.esc;
  const heute = () => H.tag(new Date());
  let tab = 'uebersicht';
  let cache = { mitglieder: [], produkte: [] };

  /* ---------------------------------------------------------------- Helfer */
  function toast(text, art) {
    const t = $('#toast'); t.textContent = text; t.className = 'k-toast zeigen' + (art ? ' ' + art : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'k-toast'; }, 3400);
  }
  function modal(html) {
    const root = $('#modal-root');
    root.innerHTML = '<div class="a-modal"><div class="a-modal-card" role="dialog" aria-modal="true">' + html + '</div></div>';
    const el = root.firstChild;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-zu]')) zu(); });
    const erstes = el.querySelector('input,select,textarea'); if (erstes) setTimeout(() => erstes.focus(), 30);
    return el;
  }
  function zu() { $('#modal-root').innerHTML = ''; }
  const name = (m) => m ? m.vorname + ' ' + m.nachname : '–';
  const mitglied = (id) => cache.mitglieder.find((m) => m.id === id);
  function csvDownload(dateiname, zeilen) {
    const text = zeilen.map((z) => z.map((v) => {
      const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = dateiname; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const zahl = (v) => Number(v).toFixed(2).replace('.', ',');
  const monatsAnfang = (d = new Date()) => H.tag(new Date(d.getFullYear(), d.getMonth(), 1));
  const monatsEnde = (d = new Date()) => H.tag(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  function kopf(titel, unter, aktionen) {
    return '<div class="a-kopf"><div><h1>' + titel + '</h1>' + (unter ? '<p>' + unter + '</p>' : '') + '</div><div class="a-aktionen">' + (aktionen || '') + '</div></div>';
  }
  function drucken(art, ids) {
    const url = art === 'pins' ? 'drucken.html?art=pins' : 'drucken.html?art=rechnung&ids=' + ids.join(',');
    // Falls Pop-ups blockiert sind (z. B. iPad im Vollbildmodus): im selben Fenster öffnen
    if (!window.open(url, '_blank')) location.href = url;
  }

  /* -------------------------------------------------------------- Übersicht */
  async function uebersicht(main) {
    const von = monatsAnfang(), bis = monatsEnde();
    const [monat, alle, rechnungen] = await Promise.all([S.buchungen({ von, bis }), S.buchungen({}), S.rechnungen()]);
    const gueltig = (b) => !b.storniert_am;
    const umsatz = monat.filter(gueltig).reduce((s, b) => s + H.ct(b.betrag), 0);
    const offen = alle.filter((b) => gueltig(b) && !b.rechnung_id);
    const offenSumme = offen.reduce((s, b) => s + H.ct(b.betrag), 0);
    const unbezahlt = rechnungen.filter((r) => !r.bezahlt_am && !r.storniert_am);
    const unbezahltSumme = unbezahlt.reduce((s, r) => s + H.ct(r.summe), 0);

    const proProdukt = new Map();
    monat.filter(gueltig).forEach((b) => proProdukt.set(b.produkt_name, (proProdukt.get(b.produkt_name) || 0) + b.stueck));
    const top = [...proProdukt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = top.length ? top[0][1] : 1;

    const proMitglied = new Map();
    offen.forEach((b) => proMitglied.set(b.mitglied_id, (proMitglied.get(b.mitglied_id) || 0) + H.ct(b.betrag)));
    const topOffen = [...proMitglied.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const monatName = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    main.innerHTML = kopf('Übersicht', 'Stand ' + new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }),
      '<button class="a-btn primaer" data-gehe="abrechnung">Abrechnung erstellen</button>') +
      '<div class="a-karten">' +
      '<div class="a-karte"><small>Umsatz ' + esc(monatName) + '</small><strong>' + H.geld(H.eur(umsatz)) + '</strong><span>' + monat.filter(gueltig).length + ' Buchungen</span></div>' +
      '<div class="a-karte"><small>Noch nicht abgerechnet</small><strong>' + H.geld(H.eur(offenSumme)) + '</strong><span>' + proMitglied.size + ' Mitglieder</span></div>' +
      '<div class="a-karte"><small>Offene Rechnungen</small><strong>' + H.geld(H.eur(unbezahltSumme)) + '</strong><span>' + unbezahlt.length + ' unbezahlt</span></div>' +
      '<div class="a-karte"><small>Aktive Mitglieder mit PIN</small><strong>' + cache.mitglieder.filter((m) => m.aktiv && m.hat_pin).length + '</strong><span>von ' + cache.mitglieder.filter((m) => m.aktiv).length + ' aktiven</span></div>' +
      '</div><div class="a-zwei">' +
      '<div class="a-panel"><h2>Meistgebucht im ' + esc(new Date().toLocaleDateString('de-DE', { month: 'long' })) + ' (Stück)</h2>' +
      (top.length ? top.map(([n, v]) => '<div class="a-balken"><span>' + esc(n) + '</span><i style="width:' + Math.round(v / max * 60) + '%"></i><b>' + v + '</b></div>').join('') : '<p class="k-sub">Noch keine Buchungen in diesem Monat.</p>') +
      '</div><div class="a-panel"><h2>Höchste offene Beträge</h2><table class="a-tab"><tbody>' +
      (topOffen.length ? topOffen.map(([id, c]) => '<tr><td>' + esc(name(mitglied(id))) + '</td><td class="r">' + H.geld(H.eur(c)) + '</td></tr>').join('') : '<tr><td>Alles abgerechnet.</td></tr>') +
      '</tbody></table></div></div>' +
      '<div class="a-panel"><h2>Letzte Buchungen</h2>' + buchungsTabelle(alle.slice(0, 12), rechnungen, false) + '</div>';
  }

  function buchungsTabelle(liste, rechnungen, mitAktion) {
    const rnr = new Map(rechnungen.map((r) => [r.id, r.nr]));
    if (!liste.length) return '<p class="k-sub">Keine Buchungen im gewählten Zeitraum.</p>';
    return '<table class="a-tab"><thead><tr><th>Zeit</th><th>Mitglied</th><th>Artikel</th><th class="r">Menge</th><th class="r">Betrag</th><th>Status</th>' + (mitAktion ? '<th></th>' : '') + '</tr></thead><tbody>' +
      liste.map((b) => '<tr class="' + (b.storniert_am ? 'storniert' : '') + '"><td>' + H.zeit(b.zeit) + '</td><td>' + esc(name(mitglied(b.mitglied_id))) + '</td>' +
        '<td>' + esc(b.produkt_name) + (b.quelle === 'nachtrag' ? ' <span class="a-tag">Nachtrag</span>' : '') + '</td><td class="r">' + b.anzahl + ' ' + H.einheitText(b) + (b.einheit === 'kasten' ? ' (' + b.stueck + ')' : '') + '</td>' +
        '<td class="r">' + H.geld(b.betrag) + '</td><td>' +
        (b.storniert_am ? '<span class="a-tag rot">storniert</span>' : b.rechnung_id ? '<span class="a-tag ok">' + esc(rnr.get(b.rechnung_id) || 'abgerechnet') + '</span>' : '<span class="a-tag warn">offen</span>') + '</td>' +
        (mitAktion ? '<td class="r">' + (!b.storniert_am && !b.rechnung_id ? '<button class="a-btn klein gefahr" data-storno="' + b.id + '">Stornieren</button>' : '') + '</td>' : '') +
        '</tr>').join('') + '</tbody></table>';
  }

  /* ------------------------------------------------------------- Mitglieder */
  async function mitgliederTab(main, suche = '') {
    cache.mitglieder = await S.mitglieder();
    const offen = await S.buchungen({});
    const offenProM = new Map();
    offen.forEach((b) => { if (!b.storniert_am && !b.rechnung_id) offenProM.set(b.mitglied_id, (offenProM.get(b.mitglied_id) || 0) + H.ct(b.betrag)); });
    const ohnePin = cache.mitglieder.filter((m) => m.aktiv && !m.hat_pin).length;
    main.innerHTML = kopf('Mitglieder', cache.mitglieder.filter((m) => m.aktiv).length + ' aktiv · ' + ohnePin + ' ohne PIN',
      '<button class="a-btn" id="m-import">CSV importieren</button>' +
      (ohnePin ? '<button class="a-btn dunkel" id="m-pins">PINs für ' + ohnePin + ' vergeben</button>' : '') +
      '<button class="a-btn primaer" id="m-neu">+ Neues Mitglied</button>') +
      '<div class="a-filter"><input class="a-suche" id="m-suche" type="search" placeholder="Suchen …" value="' + esc(suche) + '"></div>' +
      '<div class="a-panel"><table class="a-tab"><thead><tr><th>Nr.</th><th>Name</th><th>Ort</th><th>Lastschrift</th><th>PIN</th><th class="r">Offen</th><th></th></tr></thead><tbody id="m-liste"></tbody></table></div>';
    const render = () => {
      const f = $('#m-suche').value.trim().toLowerCase();
      $('#m-liste').innerHTML = cache.mitglieder.filter((m) => !f || (m.vorname + ' ' + m.nachname + ' ' + (m.nr || '') + ' ' + (m.ort || '')).toLowerCase().includes(f))
        .map((m) => {
          const gesperrt = m.gesperrt_bis && new Date(m.gesperrt_bis) > new Date();
          return '<tr class="' + (m.aktiv ? '' : 'inaktiv') + '"><td>' + esc(m.nr || '') + '</td><td><strong>' + esc(m.nachname) + '</strong>, ' + esc(m.vorname) + (m.aktiv ? '' : ' <span class="a-tag">inaktiv</span>') + '</td>' +
            '<td>' + esc(m.ort || '') + '</td><td>' + (m.sepa ? '<span class="a-tag ok">Lastschrift</span>' : '<span class="a-tag warn">kein Mandat</span>') + '</td>' +
            '<td>' + (gesperrt ? '<span class="a-tag rot">gesperrt</span>' : m.hat_pin ? '<span class="a-tag ok">✓</span>' : '<span class="a-tag warn">fehlt</span>') + '</td>' +
            '<td class="r">' + H.geld(H.eur(offenProM.get(m.id) || 0)) + '</td>' +
            '<td class="r"><button class="a-btn klein" data-pin="' + m.id + '">Neue PIN</button> <button class="a-btn klein" data-edit="' + m.id + '">Bearbeiten</button></td></tr>';
        }).join('');
    };
    render();
    $('#m-suche').addEventListener('input', render);
    $('#m-neu').addEventListener('click', () => mitgliedForm({}));
    $('#m-import').addEventListener('click', csvImport);
    if ($('#m-pins')) $('#m-pins').addEventListener('click', alleOhnePin);
    $('#m-liste').addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]'); if (ed) return mitgliedForm(mitglied(ed.dataset.edit));
      const p = e.target.closest('[data-pin]'); if (p) return neuePin(mitglied(p.dataset.pin));
    });
  }

  function mitgliedForm(m) {
    const neu = !m.id;
    const el = modal('<h2>' + (neu ? 'Neues Mitglied' : 'Mitglied bearbeiten') + '</h2><form id="mf" class="a-form">' +
      '<label class="a-feld">Vorname<input name="vorname" required value="' + esc(m.vorname || '') + '"></label>' +
      '<label class="a-feld">Nachname<input name="nachname" required value="' + esc(m.nachname || '') + '"></label>' +
      '<label class="a-feld">Mitgliedsnummer<input name="nr" value="' + esc(m.nr || '') + '"></label>' +
      '<label class="a-feld">E-Mail<input name="email" type="email" value="' + esc(m.email || '') + '"></label>' +
      '<label class="a-feld voll">Straße und Hausnummer<input name="strasse" value="' + esc(m.strasse || '') + '"></label>' +
      '<label class="a-feld">PLZ<input name="plz" inputmode="numeric" value="' + esc(m.plz || '') + '"></label>' +
      '<label class="a-feld">Ort<input name="ort" value="' + esc(m.ort || '') + '"></label>' +
      '<label class="a-feld">Mandatsreferenz<input name="mandatsreferenz" value="' + esc(m.mandatsreferenz || '') + '" placeholder="wie im SEPA-Mandat"></label>' +
      '<label class="a-feld check" style="align-self:end"><input type="checkbox" name="sepa"' + (m.sepa !== false ? ' checked' : '') + '> SEPA-Lastschriftmandat liegt vor</label>' +
      '<label class="a-feld check voll"><input type="checkbox" name="aktiv"' + (m.aktiv !== false ? ' checked' : '') + '> Aktiv (erscheint an der Kasse)</label>' +
      '<label class="a-feld voll">Notiz<textarea name="notiz" rows="2">' + esc(m.notiz || '') + '</textarea></label>' +
      '</form><div class="a-modal-fuss">' + (neu ? '' : '<button class="a-btn gefahr" id="mf-del" style="margin-right:auto">Entfernen</button>') +
      '<button class="a-btn" data-zu>Abbrechen</button><button class="a-btn primaer" id="mf-ok">' + (neu ? 'Anlegen &amp; PIN vergeben' : 'Speichern') + '</button></div>');
    $('#mf-ok', el).addEventListener('click', async () => {
      const f = $('#mf', el); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f)); d.sepa = f.sepa.checked; d.aktiv = f.aktiv.checked;
      if (m.id) d.id = m.id;
      const gespeichert = await S.mitgliedSpeichern(d);
      cache.mitglieder = await S.mitglieder();
      if (neu) { await neuePin(gespeichert); } else { zu(); toast('Gespeichert.'); }
      zeigeTab('mitglieder');
    });
    if (!neu) $('#mf-del', el).addEventListener('click', async () => {
      if (!confirm(name(m) + ' wirklich entfernen? Mitglieder mit Buchungen werden nur deaktiviert.')) return;
      const r = await S.mitgliedLoeschen(m.id); zu(); toast(r === 'deaktiviert' ? 'Mitglied deaktiviert (Buchungen bleiben erhalten).' : 'Mitglied entfernt.');
      zeigeTab('mitglieder');
    });
  }

  async function neuePin(m) {
    const pin = H.zufallsPin();
    await S.pinSetzen(m.id, pin);
    sessionStorage.setItem('ssvg-pinzettel', JSON.stringify([{ vorname: m.vorname, nachname: m.nachname, nr: m.nr, pin }]));
    const el = modal('<h2>PIN für ' + esc(name(m)) + '</h2><div class="a-pin-gross">' + pin + '</div>' +
      '<p class="a-hinweis" style="margin-top:16px">Diese PIN wird nur jetzt angezeigt und ist danach nur noch verschlüsselt gespeichert. Bitte dem Mitglied mitteilen oder den PIN-Zettel drucken. Vergessene PINs einfach neu vergeben.</p>' +
      '<div class="a-modal-fuss"><button class="a-btn" id="pz">PIN-Zettel drucken</button><button class="a-btn primaer" data-zu>Fertig</button></div>');
    $('#pz', el).addEventListener('click', () => drucken('pins'));
    cache.mitglieder = await S.mitglieder();
    if (tab === 'mitglieder') { const s = $('#m-suche') ? $('#m-suche').value : ''; await mitgliederTab($('#main'), s); }
  }

  async function pinsVergeben(liste) {
    const zettel = [];
    for (const m of liste) { const pin = H.zufallsPin(); await S.pinSetzen(m.id, pin); zettel.push({ vorname: m.vorname, nachname: m.nachname, nr: m.nr, pin }); }
    sessionStorage.setItem('ssvg-pinzettel', JSON.stringify(zettel));
    return zettel;
  }
  async function alleOhnePin() {
    const liste = cache.mitglieder.filter((m) => m.aktiv && !m.hat_pin);
    if (!confirm('Für ' + liste.length + ' Mitglieder jetzt zufällige PINs erzeugen?')) return;
    const z = await pinsVergeben(liste);
    const el = modal('<h2>' + z.length + ' PINs vergeben</h2><p class="a-hinweis">Die PINs werden nur jetzt angezeigt. Am einfachsten: PIN-Zettel drucken, ausschneiden und verteilen.</p>' +
      '<table class="a-tab"><tbody>' + z.map((x) => '<tr><td>' + esc(x.nachname + ', ' + x.vorname) + '</td><td class="r"><strong>' + x.pin + '</strong></td></tr>').join('') + '</tbody></table>' +
      '<div class="a-modal-fuss"><button class="a-btn primaer" id="pz">PIN-Zettel drucken</button><button class="a-btn" data-zu>Schließen</button></div>');
    $('#pz', el).addEventListener('click', () => drucken('pins'));
    zeigeTab('mitglieder');
  }

  /* CSV-Import, z. B. Mitgliederexport aus easyVerein oder Excel */
  function csvImport() {
    const el = modal('<h2>Mitglieder importieren</h2>' +
      '<p class="a-hinweis">CSV-Datei mit Kopfzeile, z. B. ein Export aus easyVerein oder Excel. Erkannt werden die Spalten <strong>Vorname, Nachname</strong> (Pflicht) sowie Mitgliedsnummer, Mandatsreferenz, E-Mail, Straße, PLZ, Ort. Auf dem iPad öffnet „Datei“ die Dateien-App (iCloud Drive, E-Mail-Anhänge, USB-Stick). Trennzeichen Semikolon oder Komma.</p>' +
      '<label class="a-feld">Datei<input type="file" id="csv-datei" accept=".csv,text/csv,text/comma-separated-values,text/plain,application/vnd.ms-excel"></label>' +
      '<label class="a-feld" style="margin-top:12px">… oder hier einfügen<textarea id="csv-text" rows="6" placeholder="Vorname;Nachname;Mitgliedsnummer;E-Mail&#10;Anna;Albers;1001;anna@beispiel.de"></textarea></label>' +
      '<p class="k-sub" id="csv-vorschau"></p>' +
      '<label class="a-feld check"><input type="checkbox" id="csv-pins" checked> Allen neuen Mitgliedern direkt eine PIN vergeben</label>' +
      '<div class="a-modal-fuss"><button class="a-btn" data-zu>Abbrechen</button><button class="a-btn primaer" id="csv-ok" disabled>Importieren</button></div>');
    let zeilen = [];
    const parse = (text) => {
      const ls = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
      if (ls.length < 2) { zeilen = []; return; }
      const sep = (ls[0].match(/;/g) || []).length >= (ls[0].match(/,/g) || []).length ? ';' : ',';
      const split = (l) => { const out = []; let cur = '', q = false;
        for (let i = 0; i < l.length; i++) { const c = l[i];
          if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
          else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c; }
        out.push(cur); return out.map((s) => s.trim()); };
      const kopfz = split(ls[0]).map((h) => h.toLowerCase().replace(/[^a-zäöüß]/g, ''));
      // erst exakte Spaltennamen, dann Teiltreffer („Vorname" darf nie als „Name" gelten)
      const idx = (...namen) => {
        const exakt = kopfz.findIndex((h) => namen.includes(h));
        return exakt >= 0 ? exakt : kopfz.findIndex((h) => h !== 'vorname' && namen.some((n) => h.includes(n)));
      };
      const ix = { vorname: idx('vorname'), nachname: idx('nachname', 'familienname', 'name'), nr: idx('mitgliedsnummer', 'mitgliedsnr', 'nummer', 'nr'),
        email: idx('email', 'mail'), mandatsreferenz: idx('mandatsreferenz', 'mandat'), strasse: idx('strasse', 'straße', 'anschrift'), plz: idx('plz', 'postleitzahl'), ort: idx('ort', 'stadt', 'wohnort') };
      if (ix.vorname < 0 || ix.nachname < 0) { zeilen = []; $('#csv-vorschau', el).textContent = 'Spalten „Vorname" und „Nachname" nicht gefunden.'; return; }
      zeilen = ls.slice(1).map(split).map((c) => { const o = {}; Object.entries(ix).forEach(([k, i]) => { if (i >= 0) o[k] = c[i] || ''; }); return o; })
        .filter((o) => o.vorname && o.nachname);
    };
    const update = () => {
      parse($('#csv-text', el).value);
      if (zeilen.length) $('#csv-vorschau', el).textContent = zeilen.length + ' Mitglieder erkannt, z. B. ' + zeilen.slice(0, 3).map((z) => z.vorname + ' ' + z.nachname).join(', ') + ' …';
      $('#csv-ok', el).disabled = !zeilen.length;
    };
    $('#csv-text', el).addEventListener('input', update);
    $('#csv-datei', el).addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const buf = await f.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buf);
      if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf); // Excel-Export
      $('#csv-text', el).value = text; update();
    });
    $('#csv-ok', el).addEventListener('click', async () => {
      const vorhanden = new Set(cache.mitglieder.map((m) => (m.vorname + '|' + m.nachname).toLowerCase()));
      const neu = []; let doppelt = 0;
      for (const z of zeilen) {
        if (vorhanden.has((z.vorname + '|' + z.nachname).toLowerCase())) { doppelt++; continue; }
        neu.push(await S.mitgliedSpeichern({ ...z, aktiv: true, sepa: true }));
      }
      cache.mitglieder = await S.mitglieder();
      if ($('#csv-pins', el).checked && neu.length) {
        await pinsVergeben(neu);
        zu(); toast(neu.length + ' importiert' + (doppelt ? ', ' + doppelt + ' schon vorhanden' : '') + '. PIN-Zettel öffnen sich.');
        drucken('pins');
      } else { zu(); toast(neu.length + ' importiert' + (doppelt ? ', ' + doppelt + ' schon vorhanden' : '') + '.'); }
      zeigeTab('mitglieder');
    });
  }

  /* --------------------------------------------------------------- Produkte */
  const EMOJIS = ['🍺', '🍻', '🍋', '🌾', '🥤', '🍏', '🍊', '💧', '☕', '🍵', '🥂', '🍷', '🍾', '🧃', '🥃', '🍦', '🥨', '🌭'];
  async function produkteTab(main) {
    cache.produkte = await S.produkte();
    main.innerHTML = kopf('Getränke &amp; Preise', 'Diese Kacheln erscheinen an der Kasse. Preisänderungen gelten ab sofort für neue Buchungen.',
      '<button class="a-btn primaer" id="p-neu">+ Neues Getränk</button>') +
      '<div class="a-panel"><table class="a-tab"><thead><tr><th></th><th>Getränk</th><th class="r">Preis/Stück</th><th class="r">Kasten</th><th class="r">Kastenpreis</th><th>Status</th><th class="r">Reihenfolge</th><th></th></tr></thead><tbody>' +
      cache.produkte.map((p) => '<tr class="' + (p.aktiv ? '' : 'inaktiv') + '"><td style="font-size:26px">' + esc(p.emoji || '') + '</td><td><strong>' + esc(p.name) + '</strong></td>' +
        '<td class="r">' + H.geld(p.preis) + '</td><td class="r">' + (p.kasten_groesse ? p.kasten_groesse + ' Stk.' : '–') + '</td><td class="r">' + (p.kasten_preis != null && p.kasten_groesse ? H.geld(p.kasten_preis) : '–') + '</td>' +
        '<td>' + (p.aktiv ? '<span class="a-tag ok">an der Kasse</span>' : '<span class="a-tag">ausgeblendet</span>') + '</td><td class="r">' + p.sort + '</td>' +
        '<td class="r"><button class="a-btn klein" data-edit="' + p.id + '">Bearbeiten</button></td></tr>').join('') +
      '</tbody></table></div><p class="a-hinweis warn">Die Preise der Demo sind Beispielwerte <strong>[PLATZHALTER]</strong> – bitte die echten Vereinspreise eintragen.</p>';
    $('#p-neu').addEventListener('click', () => produktForm({ aktiv: true, sort: cache.produkte.length + 1, farbe: '#132a6b', emoji: '🥤' }));
    main.querySelector('tbody').addEventListener('click', (e) => {
      const b = e.target.closest('[data-edit]'); if (b) produktForm(cache.produkte.find((p) => p.id === b.dataset.edit));
    });
  }
  function produktForm(p) {
    const neu = !p.id;
    const el = modal('<h2>' + (neu ? 'Neues Getränk' : esc(p.name)) + '</h2><form id="pf" class="a-form">' +
      '<label class="a-feld voll">Name (mit Größe)<input name="name" required value="' + esc(p.name || '') + '" placeholder="z. B. Pils 0,33 l"></label>' +
      '<label class="a-feld">Preis pro Stück (€)<input name="preis" required inputmode="decimal" value="' + (p.preis != null ? zahl(p.preis) : '') + '"></label>' +
      '<label class="a-feld">Reihenfolge<input name="sort" type="number" value="' + (p.sort || 0) + '"></label>' +
      '<label class="a-feld">Flaschen pro Kasten<input name="kasten_groesse" type="number" min="2" value="' + (p.kasten_groesse || '') + '" placeholder="leer = kein Kasten"></label>' +
      '<label class="a-feld">Kastenpreis (€)<input name="kasten_preis" inputmode="decimal" value="' + (p.kasten_preis != null ? zahl(p.kasten_preis) : '') + '"></label>' +
      '<div class="a-feld voll">Symbol<div style="display:flex;flex-wrap:wrap;gap:6px" id="pf-emoji">' + EMOJIS.map((e) =>
        '<button type="button" data-e="' + e + '" class="a-btn klein" style="font-size:22px;' + (e === p.emoji ? 'outline:2px solid var(--rot)' : '') + '">' + e + '</button>').join('') + '</div></div>' +
      '<label class="a-feld">Akzentfarbe<input name="farbe" type="color" value="' + esc(p.farbe || '#132a6b') + '" style="height:44px;padding:4px"></label>' +
      '<label class="a-feld check" style="align-self:end"><input type="checkbox" name="aktiv"' + (p.aktiv !== false ? ' checked' : '') + '> an der Kasse anzeigen</label>' +
      '</form><div class="a-modal-fuss">' + (neu ? '' : '<button class="a-btn gefahr" id="pf-del" style="margin-right:auto">Löschen</button>') +
      '<button class="a-btn" data-zu>Abbrechen</button><button class="a-btn primaer" id="pf-ok">Speichern</button></div>');
    let emoji = p.emoji || '🥤';
    $('#pf-emoji', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-e]'); if (!b) return; emoji = b.dataset.e;
      el.querySelectorAll('#pf-emoji button').forEach((x) => { x.style.outline = x === b ? '2px solid var(--rot)' : ''; });
    });
    const geld = (v) => v === '' || v == null ? null : Number(String(v).replace(/\./g, '').replace(',', '.'));
    $('#pf-ok', el).addEventListener('click', async () => {
      const f = $('#pf', el); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      const daten = { name: d.name.trim(), preis: geld(d.preis), sort: parseInt(d.sort, 10) || 0, emoji, farbe: d.farbe, aktiv: f.aktiv.checked,
        kasten_groesse: d.kasten_groesse ? parseInt(d.kasten_groesse, 10) : null, kasten_preis: d.kasten_groesse ? geld(d.kasten_preis) : null };
      if (isNaN(daten.preis) || daten.preis < 0) return toast('Bitte einen gültigen Preis eingeben.', 'fehler');
      if (daten.kasten_groesse && (daten.kasten_preis == null || isNaN(daten.kasten_preis))) return toast('Bitte auch den Kastenpreis eintragen.', 'fehler');
      if (p.id) daten.id = p.id;
      await S.produktSpeichern(daten); zu(); toast('Gespeichert.'); zeigeTab('produkte');
    });
    if (!neu) $('#pf-del', el).addEventListener('click', async () => {
      if (!confirm(p.name + ' löschen? Bereits gebuchte Getränke werden nur ausgeblendet.')) return;
      const r = await S.produktLoeschen(p.id); zu(); toast(r === 'deaktiviert' ? 'Ausgeblendet (Buchungen bleiben erhalten).' : 'Gelöscht.'); zeigeTab('produkte');
    });
  }

  /* -------------------------------------------------------------- Buchungen */
  let bFilter = { von: monatsAnfang(), bis: heute(), mitglied_id: '' };
  async function buchungenTab(main) {
    const [liste, rechnungen] = await Promise.all([S.buchungen({ ...bFilter, mitglied_id: bFilter.mitglied_id || undefined }), S.rechnungen()]);
    const summe = liste.filter((b) => !b.storniert_am).reduce((s, b) => s + H.ct(b.betrag), 0);
    main.innerHTML = kopf('Buchungen', liste.length + ' Buchungen · ' + H.geld(H.eur(summe)) + ' (ohne Stornos)',
      '<button class="a-btn" id="b-csv">CSV exportieren</button><button class="a-btn primaer" id="b-neu">+ Nachtragen</button>') +
      '<div class="a-filter"><label class="a-feld">Von<input type="date" id="b-von" value="' + bFilter.von + '"></label>' +
      '<label class="a-feld">Bis<input type="date" id="b-bis" value="' + bFilter.bis + '"></label>' +
      '<label class="a-feld">Mitglied<select id="b-m"><option value="">Alle</option>' + cache.mitglieder.map((m) => '<option value="' + m.id + '"' + (m.id === bFilter.mitglied_id ? ' selected' : '') + '>' + esc(m.nachname + ', ' + m.vorname) + '</option>').join('') + '</select></label></div>' +
      '<div class="a-panel">' + buchungsTabelle(liste, rechnungen, true) + '</div>';
    ['#b-von', '#b-bis', '#b-m'].forEach((s) => $(s).addEventListener('change', () => {
      bFilter = { von: $('#b-von').value, bis: $('#b-bis').value, mitglied_id: $('#b-m').value }; buchungenTab(main);
    }));
    main.querySelector('.a-panel').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-storno]'); if (!b) return;
      if (!confirm('Diese Buchung stornieren?')) return;
      try { await S.buchungStornieren(b.dataset.storno); toast('Storniert.'); buchungenTab(main); } catch (err) { toast(err.message, 'fehler'); }
    });
    $('#b-csv').addEventListener('click', () => {
      const rnr = new Map(rechnungen.map((r) => [r.id, r.nr]));
      csvDownload('buchungen_' + bFilter.von + '_' + bFilter.bis + '.csv', [['Datum', 'Uhrzeit', 'Mitgliedsnr', 'Mitglied', 'Artikel', 'Einheit', 'Anzahl', 'Stück', 'Einzelpreis', 'Betrag', 'Status', 'Rechnung']]
        .concat(liste.map((b) => { const m = mitglied(b.mitglied_id) || {}; const d = new Date(b.zeit);
          return [H.datum(b.zeit), d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }), m.nr, name(m), b.produkt_name, b.einheit === 'kasten' ? 'Kasten' : 'Stück',
            b.anzahl, b.stueck, zahl(b.einzelpreis), zahl(b.betrag), b.storniert_am ? 'storniert' : b.rechnung_id ? 'abgerechnet' : 'offen', rnr.get(b.rechnung_id) || '']; })));
    });
    $('#b-neu').addEventListener('click', nachtragen);
  }
  async function nachtragen() {
    if (!cache.produkte.length) cache.produkte = await S.produkte();
    const el = modal('<h2>Buchung nachtragen</h2><p class="a-hinweis">Für vergessene Striche oder Buchungen auf Zuruf. Nachträge sind in der Liste gekennzeichnet.</p><form id="nf" class="a-form">' +
      '<label class="a-feld voll">Mitglied<select name="mitglied" required><option value="">Bitte wählen</option>' + cache.mitglieder.filter((m) => m.aktiv).map((m) => '<option value="' + m.id + '">' + esc(m.nachname + ', ' + m.vorname) + '</option>').join('') + '</select></label>' +
      '<label class="a-feld voll">Getränk<select name="produkt" required>' + cache.produkte.filter((p) => p.aktiv).map((p) => '<option value="' + p.id + '">' + esc(p.emoji + ' ' + p.name) + ' – ' + H.geld(p.preis) + '</option>').join('') + '</select></label>' +
      '<label class="a-feld">Einheit<select name="einheit"><option value="stk">Stück</option><option value="kasten">Kasten</option></select></label>' +
      '<label class="a-feld">Anzahl<input name="anzahl" type="number" min="1" max="99" value="1" required></label>' +
      '<label class="a-feld voll">Datum<input name="datum" type="date" value="' + heute() + '" required></label>' +
      '</form><div class="a-modal-fuss"><button class="a-btn" data-zu>Abbrechen</button><button class="a-btn primaer" id="nf-ok">Buchen</button></div>');
    $('#nf-ok', el).addEventListener('click', async () => {
      const f = $('#nf', el); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      try {
        const zeit = d.datum === heute() ? null : new Date(d.datum + 'T12:00:00').toISOString();
        await S.buchungNachtragen(d.mitglied, [{ produkt_id: d.produkt, einheit: d.einheit, anzahl: parseInt(d.anzahl, 10) }], zeit);
        zu(); toast('Nachgetragen.'); zeigeTab('buchungen');
      } catch (e) { toast(e.message, 'fehler'); }
    });
  }

  /* ------------------------------------------------------------- Abrechnung */
  function vorlagen() {
    const d = new Date(), j = d.getFullYear();
    const vm = new Date(j, d.getMonth() - 1, 1);
    return [
      ['Letzter Monat', monatsAnfang(vm), monatsEnde(vm)],
      ['Dieser Monat', monatsAnfang(d), heute()],
      ['Letztes Quartal', H.tag(new Date(j, Math.floor(d.getMonth() / 3) * 3 - 3, 1)), H.tag(new Date(j, Math.floor(d.getMonth() / 3) * 3, 0))],
      ['Saison ' + j + ' (Apr–Okt)', j + '-04-01', j + '-10-31'],
      ['Gesamtes Jahr ' + j, j + '-01-01', j + '-12-31'],
      ['Alles bis heute', '2000-01-01', heute()]
    ];
  }
  let aZeitraum = null;
  async function abrechnungTab(main) {
    if (!aZeitraum) { const v = vorlagen()[0]; aZeitraum = { von: v[1], bis: v[2], datum: heute() }; }
    const [offen, rechnungen, e] = await Promise.all([S.buchungen({ von: aZeitraum.von, bis: aZeitraum.bis }), S.rechnungen(), S.einstellungen()]);
    const proM = new Map();
    offen.filter((b) => !b.storniert_am && !b.rechnung_id).forEach((b) => {
      const x = proM.get(b.mitglied_id) || { n: 0, c: 0 }; x.n++; x.c += H.ct(b.betrag); proM.set(b.mitglied_id, x);
    });
    const vorschau = [...proM.entries()].map(([id, x]) => ({ m: mitglied(id), ...x })).sort((a, b) => name(a.m).localeCompare(name(b.m), 'de'));
    const gesamt = vorschau.reduce((s, x) => s + x.c, 0);
    const ohneAdresse = vorschau.filter((x) => x.m && (!x.m.strasse || !x.m.ort)).length;
    const ohneMandat = vorschau.filter((x) => x.m && !x.m.sepa).length;
    const status = (r) => r.storniert_am ? '<span class="a-tag rot">storniert</span>' : r.bezahlt_am ? '<span class="a-tag ok">bezahlt ' + H.datum(r.bezahlt_am) + '</span>'
      : (r.faellig && r.faellig < heute()) ? '<span class="a-tag rot">überfällig</span>' : '<span class="a-tag warn">offen</span>';
    const offeneRe = rechnungen.filter((r) => !r.storniert_am && !r.bezahlt_am);

    main.innerHTML = kopf('Abrechnung', 'Aus offenen Buchungen werden Rechnungen pro Mitglied – fortlaufend nummeriert, jede Buchung genau einmal.') +
      '<div class="a-panel"><h2>1 · Zeitraum wählen</h2><div class="a-filter">' +
      '<label class="a-feld">Vorlage<select id="a-vorlage"><option value="">– eigener Zeitraum –</option>' + vorlagen().map((v, i) => '<option value="' + i + '"' + (v[1] === aZeitraum.von && v[2] === aZeitraum.bis ? ' selected' : '') + '>' + v[0] + '</option>').join('') + '</select></label>' +
      '<label class="a-feld">Von<input type="date" id="a-von" value="' + aZeitraum.von + '"></label>' +
      '<label class="a-feld">Bis<input type="date" id="a-bis" value="' + aZeitraum.bis + '"></label>' +
      '<label class="a-feld">Rechnungsdatum<input type="date" id="a-datum" value="' + aZeitraum.datum + '"></label></div>' +
      '<h2 style="margin-top:8px">2 · Vorschau: ' + vorschau.length + ' Rechnungen über ' + H.geld(H.eur(gesamt)) + '</h2>' +
      (ohneMandat ? '<p class="a-hinweis warn">' + ohneMandat + ' Mitglieder ohne SEPA-Mandat – ihre Rechnung nennt statt des Einzugs die Bankverbindung zur Überweisung.</p>' : '') +
      (!e.glaeubiger_id ? '<p class="a-hinweis warn">Bitte unter Einstellungen die Gläubiger-ID eintragen – sie gehört auf jede Lastschrift-Ankündigung.</p>' : '') +
      (ohneAdresse ? '<p class="a-hinweis warn">' + ohneAdresse + ' Mitglieder ohne vollständige Anschrift – die Rechnung entsteht trotzdem, ggf. vorher unter „Mitglieder" ergänzen.</p>' : '') +
      (vorschau.length ? '<table class="a-tab"><thead><tr><th>Mitglied</th><th>Zahlart</th><th class="r">Buchungen</th><th class="r">Betrag</th></tr></thead><tbody>' +
        vorschau.map((x) => '<tr><td>' + esc(name(x.m)) + '</td><td>' + (x.m && x.m.sepa ? 'Lastschrift' : '<span class="a-tag warn">kein Mandat</span>') + '</td><td class="r">' + x.n + '</td><td class="r">' + H.geld(H.eur(x.c)) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="3">Summe</td><td class="r">' + H.geld(H.eur(gesamt)) + '</td></tr></tfoot></table>'
        : '<p class="k-sub">Keine offenen Buchungen in diesem Zeitraum.</p>') +
      '<div class="a-modal-fuss"><button class="a-btn primaer" id="a-los"' + (vorschau.length ? '' : ' disabled') + '>3 · ' + vorschau.length + ' Rechnungen erstellen</button></div></div>' +
      '<div class="a-panel"><div class="a-kopf" style="margin-bottom:8px"><h2 style="margin:0">Rechnungen</h2><div class="a-aktionen">' +
      '<button class="a-btn" id="r-druck-offen"' + (offeneRe.length ? '' : ' disabled') + '>Alle offenen drucken (' + offeneRe.length + ')</button>' +
      '<button class="a-btn" id="r-sepa">SEPA-Liste (CSV)</button><button class="a-btn" id="r-csv">Rechnungsliste (CSV)</button></div></div>' +
      (rechnungen.length ? '<table class="a-tab"><thead><tr><th>Nr.</th><th>Datum</th><th>Mitglied</th><th>Zeitraum</th><th class="r">Betrag</th><th>Zahlart</th><th>Status</th><th></th></tr></thead><tbody>' +
        rechnungen.map((r) => '<tr class="' + (r.storniert_am ? 'storniert' : '') + '"><td><strong>' + esc(r.nr) + '</strong></td><td>' + H.datum(r.datum) + '</td><td>' + esc(r.empfaenger.vorname + ' ' + r.empfaenger.nachname) + '</td>' +
          '<td>' + H.datum(r.von) + ' – ' + H.datum(r.bis) + '</td><td class="r">' + H.geld(r.summe) + '</td><td>' + (r.sepa ? 'Lastschrift' : 'Überweisung') + '</td><td>' + status(r) + '</td>' +
          '<td class="r" style="white-space:nowrap"><button class="a-btn klein" data-druck="' + r.id + '">Ansehen</button> ' +
          (r.empfaenger.email && !r.storniert_am ? '<button class="a-btn klein" data-mail="' + r.id + '">E-Mail</button> ' : '') +
          (!r.storniert_am ? (r.bezahlt_am ? '<button class="a-btn klein" data-unbezahlt="' + r.id + '">Offen</button> ' : '<button class="a-btn klein" data-bezahlt="' + r.id + '">Bezahlt</button> ') +
            '<button class="a-btn klein gefahr" data-rstorno="' + r.id + '">Storno</button>' : '') + '</td></tr>').join('') + '</tbody></table>'
        : '<p class="k-sub">Noch keine Rechnungen erstellt.</p>') + '</div>';

    const neuLaden = () => { aZeitraum = { von: $('#a-von').value, bis: $('#a-bis').value, datum: $('#a-datum').value }; abrechnungTab(main); };
    $('#a-vorlage').addEventListener('change', (ev) => {
      const v = vorlagen()[ev.target.value]; if (!v) return; $('#a-von').value = v[1]; $('#a-bis').value = v[2]; neuLaden();
    });
    ['#a-von', '#a-bis', '#a-datum'].forEach((s) => $(s).addEventListener('change', neuLaden));
    $('#a-los').addEventListener('click', async () => {
      if (!confirm(vorschau.length + ' Rechnungen über ' + H.geld(H.eur(gesamt)) + ' erstellen?\nDie enthaltenen Buchungen gelten danach als abgerechnet.')) return;
      try {
        const n = await S.rechnungenErstellen(aZeitraum.von, aZeitraum.bis, aZeitraum.datum);
        toast(n + ' Rechnungen erstellt.'); await abrechnungTab(main);
        const neu = (await S.rechnungen()).filter((r) => r.datum === aZeitraum.datum && !r.storniert_am && !r.bezahlt_am).slice(0, n);
        if (neu.length && confirm('Rechnungen jetzt zum Drucken / als PDF öffnen?')) drucken('rechnung', neu.map((r) => r.id));
      } catch (err) { toast(err.message, 'fehler'); }
    });
    const tbody = main.querySelectorAll('.a-panel')[1];
    tbody.addEventListener('click', async (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.druck) return drucken('rechnung', [t.dataset.druck]);
      if (t.dataset.bezahlt) { await S.rechnungBezahlt(t.dataset.bezahlt, heute()); toast('Als bezahlt markiert.'); return abrechnungTab(main); }
      if (t.dataset.unbezahlt) { await S.rechnungBezahlt(t.dataset.unbezahlt, null); return abrechnungTab(main); }
      if (t.dataset.rstorno) {
        if (!confirm('Rechnung stornieren? Die Nummer bleibt belegt, die Buchungen werden wieder „offen" und können neu abgerechnet werden.')) return;
        await S.rechnungStornieren(t.dataset.rstorno); toast('Rechnung storniert.'); return abrechnungTab(main);
      }
      if (t.dataset.mail) {
        const r = rechnungen.find((x) => x.id === t.dataset.mail);
        const text = 'Moin ' + r.empfaenger.vorname + ',\n\nanbei deine Getränkeabrechnung vom ' + H.datum(r.von) + ' bis ' + H.datum(r.bis) + ' über ' + H.geld(r.summe) + '.\n\n' +
          (r.sepa ? 'Du musst nichts weiter tun – wir buchen den Betrag am ' + H.datum(r.faellig) + ' per Lastschrift ab.' : 'Bitte überweise den Betrag bis zum ' + H.datum(r.faellig) + ' auf ' + (e.iban || '[IBAN]') + ', Verwendungszweck: ' + r.nr + '.') +
          '\n\nBei Fragen sprich mich einfach an.\n\n' + e.fusstext + '\n' + (e.kassenwart_name || e.verein_name);
        location.href = 'mailto:' + encodeURIComponent(r.empfaenger.email) + '?subject=' + encodeURIComponent('Getränkeabrechnung ' + r.nr) + '&body=' + encodeURIComponent(text);
        toast('Tipp: Die Rechnung vorher über „Ansehen" als PDF speichern und anhängen.');
      }
    });
    $('#r-druck-offen').addEventListener('click', () => drucken('rechnung', offeneRe.map((r) => r.id)));
    $('#r-csv').addEventListener('click', () => csvDownload('rechnungen.csv', [['Rechnungsnr', 'Datum', 'Fällig', 'Mitgliedsnr', 'Name', 'Von', 'Bis', 'Betrag', 'Zahlart', 'Bezahlt am', 'Storniert']]
      .concat(rechnungen.map((r) => [r.nr, H.datum(r.datum), H.datum(r.faellig), r.empfaenger.nr, r.empfaenger.vorname + ' ' + r.empfaenger.nachname, H.datum(r.von), H.datum(r.bis),
        zahl(r.summe), r.sepa ? 'Lastschrift' : 'Überweisung', H.datum(r.bezahlt_am), r.storniert_am ? 'ja' : '']))));
    $('#r-sepa').addEventListener('click', () => {
      const s = rechnungen.filter((r) => r.sepa && !r.storniert_am && !r.bezahlt_am);
      if (!s.length) return toast('Keine offenen SEPA-Rechnungen.');
      csvDownload('sepa-einzug.csv', [['Mitgliedsnr', 'Name', 'Mandatsreferenz', 'Betrag', 'Verwendungszweck', 'Einzug am']]
        .concat(s.map((r) => [r.empfaenger.nr, r.empfaenger.vorname + ' ' + r.empfaenger.nachname, r.empfaenger.mandatsreferenz || r.empfaenger.nr, zahl(r.summe), 'Getraenke ' + r.nr, H.datum(r.faellig)])));
    });
  }

  /* ---------------------------------------------------------- Einstellungen */
  async function einstellungenTab(main) {
    const e = await S.einstellungen();
    const f = (k, l, extra = '') => '<label class="a-feld' + (extra.includes('voll') ? ' voll' : '') + '">' + l + '<input name="' + k + '" value="' + esc(e[k] == null ? '' : e[k]) + '"' + extra.replace('voll', '') + '></label>';
    main.innerHTML = kopf('Einstellungen', 'Angaben für die Rechnungen und das Verhalten der Kasse.') +
      '<div class="a-panel"><h2>Verein &amp; Rechnung</h2><form id="ef" class="a-form">' +
      f('verein_name', 'Vereinsname', 'voll') + f('verein_strasse', 'Straße') + f('verein_ort', 'PLZ und Ort') + f('verein_email', 'E-Mail') + f('steuernummer', 'Steuernummer') +
      f('glaeubiger_id', 'Gläubiger-ID (SEPA)') + f('bank', 'Bank') + f('iban', 'IBAN (nur für Überweisungen ohne Mandat)') + f('bic', 'BIC') + f('rechnung_praefix', 'Rechnungsnummer-Präfix') + f('kassenwart_name', 'Name des Kassenwarts (Gruß auf der Rechnung)') +
      f('zahlungsziel_tage', 'Einzug nach Rechnungsdatum (Tage, mind. 14 für die Vorabankündigung)', ' type="number" min="0"') + f('storno_minuten', 'Selbst-Storno an der Kasse (Minuten)', ' type="number" min="0"') +
      f('abmelden_sekunden', 'Automatisch abmelden nach (Sekunden)', ' type="number" min="15"') +
      '<label class="a-feld voll">Steuerhinweis auf der Rechnung<textarea name="steuerhinweis" rows="2">' + esc(e.steuerhinweis) + '</textarea></label>' +
      '<label class="a-feld voll">Zusatz bei SEPA-Lastschrift<textarea name="sepa_text" rows="2">' + esc(e.sepa_text) + '</textarea></label>' +
      f('fusstext', 'Grußzeile', 'voll') +
      '</form><div class="a-modal-fuss"><button class="a-btn primaer" id="ef-ok">Speichern</button></div></div>' +
      '<div class="a-panel"><h2>Kasse (iPad)</h2>' +
      (S.modus === 'demo'
        ? '<p class="a-hinweis warn"><strong>Demo-Modus:</strong> Alle Daten liegen nur im Browser dieses Geräts. Für den Echtbetrieb wird eine zentrale Datenbank angebunden (siehe README) – dann wird das iPad hier einmalig als Kasse freigeschaltet.</p>'
        : '<p class="a-hinweis">Auf dem iPad einmal hier anmelden und das Gerät freischalten. Danach zeigt es die Kasse – ohne dass dort jemand angemeldet bleibt.</p><div class="a-filter"><label class="a-feld">Gerätename<input id="k-name" value="iPad Messe"></label><button class="a-btn dunkel" id="k-ok">Dieses Gerät als Kasse einrichten</button></div>') +
      '</div>' +
      (S.modus === 'demo' ? '<div class="a-panel"><h2>Datensicherung (Demo)</h2><div class="a-aktionen"><button class="a-btn" id="d-export">Sicherung herunterladen</button>' +
        '<label class="a-btn">Sicherung einspielen<input type="file" id="d-import" accept=".json" hidden></label><button class="a-btn gefahr" id="d-reset">Demo zurücksetzen</button></div></div>' : '');
    $('#ef-ok').addEventListener('click', async () => {
      const d = Object.fromEntries(new FormData($('#ef')));
      ['zahlungsziel_tage', 'storno_minuten', 'abmelden_sekunden'].forEach((k) => { d[k] = parseInt(d[k], 10) || 0; });
      await S.einstellungenSpeichern(d); toast('Gespeichert.');
    });
    if ($('#k-ok')) $('#k-ok').addEventListener('click', async () => {
      try { await S.kasseEinrichten($('#k-name').value); toast('Gerät eingerichtet – die Kasse ist bereit.'); } catch (err) { toast(err.message, 'fehler'); }
    });
    if ($('#d-export')) {
      $('#d-export').addEventListener('click', async () => {
        const blob = new Blob([await S.sicherungExport()], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ssv-kasse-sicherung-' + heute() + '.json'; a.click();
      });
      $('#d-import').addEventListener('change', async (ev) => {
        try { await S.sicherungImport(await ev.target.files[0].text()); toast('Sicherung eingespielt.'); start(); } catch (err) { toast(err.message, 'fehler'); }
      });
      $('#d-reset').addEventListener('click', () => { if (confirm('Alle Demo-Daten verwerfen und Beispieldaten neu laden?')) { S.zuruecksetzen(); toast('Demo zurückgesetzt.'); start(); } });
    }
  }

  /* ----------------------------------------------------------- Navigation */
  const TABS = { uebersicht, mitglieder: mitgliederTab, produkte: produkteTab, buchungen: buchungenTab, abrechnung: abrechnungTab, einstellungen: einstellungenTab };
  async function zeigeTab(t) {
    tab = t;
    document.querySelectorAll('#nav [data-tab]').forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === t));
    try { await TABS[t]($('#main')); } catch (e) { toast(e.message, 'fehler'); if (/JWT|Berechtigung|401/.test(e.message)) start(); }
    history.replaceState(null, '', '#' + t);
  }
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { zeigeTab(b.dataset.tab); window.scrollTo(0, 0); } });
  $('#main').addEventListener('click', (e) => { const g = e.target.closest('[data-gehe]'); if (g) zeigeTab(g.dataset.gehe); });
  $('#abmelden').addEventListener('click', async () => { await S.abmelden(); start(); });

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#login-fehler').textContent = '';
    try { await S.anmelden($('#login-email').value, $('#login-pw').value); start(); }
    catch (err) { $('#login-fehler').textContent = err.message; }
  });

  async function start() {
    const ok = await S.angemeldet().catch(() => false);
    $('#login').hidden = ok; $('#app').hidden = !ok;
    if (!ok) {
      if (S.modus === 'demo') { $('#login-demo').hidden = false; $('#login-email').value = 'kassenwart@demo'; $('#login-pw').value = 'demo'; }
      return;
    }
    cache.mitglieder = await S.mitglieder();
    cache.produkte = await S.produkte();
    const t = location.hash.slice(1);
    zeigeTab(TABS[t] ? t : 'uebersicht');
  }
  start();
})();
