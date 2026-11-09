/* SSV Hafen-Manager – Mitgliederbereich „Mein SSV“
 * Im Echtbetrieb meldet sich jedes Mitglied mit eigenem Konto an und sieht nur seine Daten.
 * In der Demo wählt man oben rechts, als welches Mitglied man die Seite ansieht. */
(function () {
  'use strict';
  const HF = window.HAFEN, G = window.HAFEN_GEBUEHREN, PLAN = window.HAFEN_PLAN;
  const KASSE = window.SSV && window.SSV.speicher; // Getränkekasse (fehlt, wenn die Kasse nicht mit ausgeliefert ist)
  const KASSE_PFAD = '../ssv-getraenke/';
  const { H, Q } = HF; const esc = H.esc;
  const $ = (s, r = document) => r.querySelector(s);
  let d = HF.laden(); const heute = H.tag(new Date()); const SAISON = HF.aktuelleSaison();
  const sd = G.saisonDaten(d, SAISON);

  function toast(t) { const el = $('#toast'); el.textContent = t; el.className = 'toast zeigen'; clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = 'toast'; }, 3000); }
  function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="modal"><div class="modal-karte" role="dialog" aria-modal="true" aria-labelledby="modal-titel"><button class="modal-x" data-zu aria-label="Schließen">×</button>' + html + '</div></div>'; const el = m.firstChild; const t = el.querySelector('h2'); if (t) t.id = 'modal-titel'; el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-zu]')) m.innerHTML = ''; }); return el; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#modal').innerHTML = ''; });

  const DBM = HF.modus === 'supabase';
  // Fußzeile mit Impressum und Datenschutz
  if (!document.querySelector('.mein-fuss')) { const f = document.createElement('footer'); f.className = 'mein-fuss'; f.innerHTML = '<a href="../website/index.html">Zur Website</a> · <a href="../website/impressum.html">Impressum</a> · <a href="../website/datenschutz.html#mein-ssv">Datenschutz</a>'; document.body.insertBefore(f, document.getElementById('modal')); }   // Vereinsdatenbank: angemeldetes Mitglied, keine Auswahl
  const sel = $('#wer');
  // Jedes Mitglied hat einen Zugang – mit oder ohne Boot
  const alle = d.mitglieder.filter((m) => m.art !== 'gast').sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
  const mitBoot = alle.filter((m) => Q.booteVon(m.id).length);
  sel.innerHTML = alle.map((m) => '<option value="' + m.id + '">' + esc(m.nachname + ', ' + m.vorname) + (Q.booteVon(m.id).length ? ' ⛵' : '') + '</option>').join('');
  const erster = (mitBoot[0] || alle[0] || {}).id;
  let mid; try { mid = sessionStorage.getItem('ssv-mein') || erster; } catch (e) { mid = erster; }
  if (!alle.some((m) => m.id === mid)) mid = erster;
  if (DBM) { mid = HF.db.mitgliedId; sel.hidden = true; }
  sel.value = mid;
  sel.addEventListener('change', () => { mid = sel.value; try { sessionStorage.setItem('ssv-mein', mid); } catch (e) { /* egal */ } zeigen(); });

  /* Aufklappbare Bereiche: am Handy zu (außer Rechnungen), am Rechner offen; Wahl wird gemerkt */
  const AUF = {};
  const istHandy = () => window.matchMedia('(max-width: 860px)').matches;
  function sektion(key, titel, info, inhalt, klasse, offenAmHandy) {
    const offen = key in AUF ? AUF[key] : (istHandy() ? !!offenAmHandy : true);
    return '<details class="panel sek' + (klasse ? ' ' + klasse : '') + '" data-sek="' + key + '"' + (offen ? ' open' : '') + '><summary><h2>' + titel + '</h2>' +
      '<span class="sek-info" id="info-' + key + '">' + info + '</span></summary><div class="sek-inhalt">' + inhalt + '</div></details>';
  }
  const kachel = (ziel, titel, wert, unter, id) => '<button type="button" data-ziel="' + ziel + '"' + (id ? ' id="' + id + '"' : '') + '><small>' + titel + '</small><strong>' + wert + '</strong><span>' + unter + '</span></button>';

  function zeigen() {
    const m = Q.mitglied(mid); const boote = Q.booteVon(mid);
    const b = boote[0]; const sommer = b && Q.belegungBoot(SAISON, 'sommer', b.id); const winter = b && Q.belegungBoot(SAISON, 'winter', b.id);
    const platzS = sommer && Q.platz(sommer.platz_id); const platzW = winter && Q.platz(winter.platz_id);
    const aw = d.abwesenheiten.filter((a) => b && a.boot_id === b.id).sort((x, y) => y.von.localeCompare(x.von));
    const awAktuell = aw.find((a) => a.bis >= heute);
    const res = d.rechnungen.filter((r) => r.mitglied_id === mid && !r.storniert_am);
    const warte = d.warteliste.filter((w) => w.status === 'wartend').sort((x, y) => x.datum.localeCompare(y.datum));
    let meinW = warte.findIndex((w) => w.mitglied_id === mid);
    if (DBM) { const wp = HF.db.warteplatz; meinW = wp ? wp.platz - 1 : -1; if (wp) warte[meinW] = { datum: wp.seit }; }
    const vs = b ? Q.versicherungsStatus(b, heute) : 'ok';
    const platzText = platzS ? (platzS.bez ? esc(platzS.bez) : (platzS.box === 'L' ? 'Längsseits ' : 'Platz ') + esc(platzS.nr)) : '';
    const wasser = sommer && sommer.platz_typ === 'wasser';
    const inSaison = heute >= sd.auslagern && heute < sd.einlagern;   // grünes Schild nur, solange die Boote im Wasser sind

    const bootInhalt = b ? '<div class="detail" style="box-shadow:none;padding:0;position:static"><dl>' +
        '<dt>Typ</dt><dd>' + esc(b.typ) + '</dd><dt>Maße</dt><dd>' + H.zahl(b.laenge) + ' × ' + H.zahl(b.breite) + ' m · Tiefgang ' + H.zahl(b.tiefgang) + ' m · ' + H.zahl(b.gewicht_t, 1) + ' t</dd>' +
        '<dt>Sommer ' + SAISON + '</dt><dd>' + (platzS ? (platzS.bez ? esc(platzS.bez) + ' (an Land)' : platzText + ', ' + H.BRUECKE[platzS.bruecke]) : '–') + '</dd>' +
        '<dt>Winter ' + SAISON + '/' + String(SAISON + 1).slice(2) + '</dt><dd>' + (platzW ? esc(platzW.bez) : '–') + '</dd>' +
        '<dt>Versicherung</dt><dd>' + esc(b.versicherung || '–') + ', bis ' + H.datum(b.vers_bis) + '</dd><dt>Kfz</dt><dd>' + esc(m.kfz || '–') + '</dd></dl></div>' +
        (platzS && !platzS.bez ? '<div id="miniplan" class="plan-flaeche mini-plan"></div>' : '') +
        '<div class="aktionen" style="margin-top:12px"><button class="btn" id="daten">Daten aktualisieren</button></div>' : '';
    const schildInhalt = wasser && !inSaison ? '<p style="margin:0">Dein Boot ist im Winterlager – das grüne Schild gibt’s wieder ab dem Auslagern' + (sd.auslagern > heute ? ' (' + H.datum(sd.auslagern) + ')' : '') + '.</p>' : wasser ? '<p style="margin-top:0;color:var(--muted)">Unterwegs? Dann wird dein Platz grün und der Hafenmeister kann ihn an Gäste geben. Bitte trotzdem das Schild am Steg drehen.</p>' +
        '<form id="awf" class="form"><label class="feld">ab<input type="date" name="von" required value="' + heute + '"></label><label class="feld">zurück am<input type="date" name="bis" required></label><label class="feld voll">Ziel (optional)<input name="notiz" placeholder="z. B. Dänische Südsee"></label></form>' +
        '<div class="aktionen" style="margin-top:10px"><button class="btn gruen" id="awok">Abwesenheit melden</button></div>' +
        (aw.length ? '<table class="tab" style="margin-top:12px"><tbody>' + aw.map((a) => '<tr' + (a.bis < heute ? ' class="blass"' : '') + '><td>' + H.kurz(a.von) + ' – ' + H.datum(a.bis) + '</td><td>' + esc(a.notiz || '') + '</td><td class="r">' + (a.von > heute ? '<button class="btn klein gefahr" data-weg="' + a.id + '">Löschen</button>' : '') + '</td></tr>').join('') + '</tbody></table>' : '') : '';

    $('#main').innerHTML = (DBM ? '' : '<div class="demo-band"><strong>Demo</strong> – erfundene Daten. Im Echtbetrieb meldest du dich mit deinem eigenen Zugang an.</div>') +
      '<div class="kopf"><div><h1>Moin ' + esc(m.vorname) + '!</h1><p>' + H.ART[m.art] + ' · Mitgliedsnr. ' + esc(m.nr) + '</p></div></div>' +
      (vs !== 'ok' && b ? '<p class="hinweis warn">Dein Versicherungsnachweis ' + (vs === 'bald' ? 'läuft am ' + H.datum(b.vers_bis) + ' ab' : vs === 'fehlt' ? 'fehlt noch' : 'ist am ' + H.datum(b.vers_bis) + ' abgelaufen') + '. Bitte unter „Mein Boot“ aktualisieren.</p>' : '') +
      '<div class="blick">' + kachel('rechnungen', 'Offen', '…', 'Rechnungen', 'k-offen') +
        (platzS ? kachel(wasser ? 'schild' : 'boot', 'Liegeplatz', platzText, awAktuell ? 'grün bis ' + H.kurz(awAktuell.bis) : (platzS.bez ? 'an Land' : H.BRUECKE[platzS.bruecke])) : meinW >= 0 ? kachel('warteliste', 'Warteliste', 'Platz ' + (meinW + 1), 'seit ' + H.datum(warte[meinW].datum)) : kachel('rechnungen', 'Mitglied seit', m.eintritt ? m.eintritt.slice(0, 4) : '–', H.ART[m.art])) +
        (KASSE ? kachel('kasse', 'Getränke', '…', new Date().toLocaleDateString('de-DE', { month: 'long' }), 'k-getraenke') : '') + '</div>' +
      '<div class="mein-raster"><div>' +
      (b ? sektion('boot', 'Mein Boot', '„' + esc(b.name) + '“' + (platzText ? ' · ' + platzText : ''), bootInhalt) : '') +
      (meinW >= 0 ? sektion('warteliste', 'Warteliste', 'Platz ' + (meinW + 1), '<p style="margin:0">Du stehst auf <strong>Platz ' + (meinW + 1) + '</strong> der Warteliste (seit ' + H.datum(warte[meinW].datum) + ').</p>') : '') +
      (KASSE ? sektion('kasse', 'Getränkekasse', 'wird geladen …', '<div id="kasse"><p class="leer">Wird geladen …</p></div>') : '') +
      sektion('daten', 'Meine Daten', esc(m.ort || ''), '<div class="detail" style="box-shadow:none;padding:0;position:static"><dl>' +
        '<dt>Anschrift</dt><dd>' + esc(m.strasse || '–') + '<br>' + esc(((m.plz || '') + ' ' + (m.ort || '')).trim()) + '</dd><dt>Telefon</dt><dd>' + esc(m.tel || '–') + '</dd><dt>E-Mail</dt><dd>' + esc(m.email || '–') + '</dd>' +
        '<dt>Lastschrift</dt><dd>' + (m.iban ? 'Konto •••• ' + esc(String(m.iban).slice(-4)) : 'kein Mandat hinterlegt') + '</dd></dl></div>' +
        '<div class="aktionen" style="margin-top:12px"><button class="btn" id="meine-daten">Daten ändern</button></div>' +
        '<p class="hinweis" style="margin-top:12px">Neue Bankverbindung oder Fragen zu Rechnungen? Schreib an <a href="mailto:' + esc(d.einstellungen.verein_email) + '">' + esc(d.einstellungen.verein_email) + '</a> – für ein neues Konto braucht es ein neues Lastschriftmandat.</p>') +
      '</div><div>' +
      (wasser ? sektion('schild', 'Grünes Schild', awAktuell ? 'unterwegs ' + H.kurz(awAktuell.von) + '–' + H.kurz(awAktuell.bis) : 'Platz frei melden', schildInhalt, 'gruen-box') : '') +
      sektion('rechnungen', 'Meine Rechnungen', '', '<div id="rechnungen"></div><p class="hinweis" style="margin-top:12px">Alles wird per Lastschrift eingezogen – du musst nichts tun. Fragen? Einfach den Kassenwart ansprechen.</p>', '', true) +
      '</div></div>';

    // Aufklappen merken; Kacheln springen zum Bereich
    document.querySelectorAll('details.sek').forEach((el) => el.addEventListener('toggle', () => { AUF[el.dataset.sek] = el.open; }));
    document.querySelectorAll('.blick [data-ziel]').forEach((k) => k.addEventListener('click', () => {
      const el = document.querySelector('details.sek[data-sek="' + k.dataset.ziel + '"]'); if (!el) return;
      el.open = true; AUF[el.dataset.sek] = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    // Rechnungen: Hafen und Beitrag sofort, Getränke sobald die Kasse geantwortet hat
    const hafenPosten = res.map((r) => ({ art: r.periode === 'beitrag' ? 'Beitrag' : 'Hafen', nr: r.nr, datum: r.datum || '', text: r.periode === 'beitrag' ? String(r.saison) : H.periodeText(r),
      summe: r.summe, bezahlt_am: r.bezahlt_am, sepa: r.sepa, faellig: r.faellig, href: 'drucken.html?art=rechnungen&ids=' + r.id + (DBM ? '&mein=1' : '') }));
    let alleZeigen = false;
    const rechnungenZeigen = (getraenke) => {
      const alle = hafenPosten.concat(getraenke || []).sort((x, y) => (y.datum || '').localeCompare(x.datum || '') || y.nr.localeCompare(x.nr));
      const offen = alle.filter((r) => !r.bezahlt_am);
      const summeOffen = offen.reduce((s2, r) => s2 + Math.round(r.summe * 100), 0) / 100;
      const ko = $('#k-offen'); if (ko) { ko.querySelector('strong').textContent = summeOffen ? H.geld(summeOffen) : 'nichts'; ko.querySelector('span').textContent = offen.length ? offen.length + (offen.length === 1 ? ' Rechnung' : ' Rechnungen') : 'alles bezahlt'; }
      $('#info-rechnungen').textContent = offen.length ? H.geld(summeOffen) + ' offen' : alle.length + ' bezahlt';
      const GRENZE = 4; const liste = alleZeigen ? alle : alle.slice(0, GRENZE);
      $('#rechnungen').innerHTML = alle.length ? '<table class="tab rechn"><tbody>' + liste.map((r) => '<tr><td><span class="tag' + (r.art === 'Hafen' ? '' : r.art === 'Beitrag' ? ' gruen' : ' gold') + '">' + r.art + '</span> ' + esc(r.text) +
        '<br><small style="color:var(--muted)">' + esc(r.nr) + '</small></td><td class="r"><strong>' + H.geld(r.summe) + '</strong><br>' +
        (r.bezahlt_am ? '<span class="tag ok">bezahlt</span>' : r.sepa ? '<span class="tag">Einzug ' + H.kurz(r.faellig) + '</span>' : '<span class="tag warn">offen</span>') +
        '</td><td class="r"><a class="btn klein" href="' + r.href + '" target="_blank">PDF</a></td></tr>').join('') + '</tbody></table>' +
        (alle.length > GRENZE ? '<button class="btn klein" id="rmehr" style="margin-top:10px">' + (alleZeigen ? 'Weniger anzeigen' : 'Alle ' + alle.length + ' Rechnungen anzeigen') + '</button>' : '')
        : '<p class="leer">Noch keine Rechnungen.</p>';
      const mehr = $('#rmehr'); if (mehr) mehr.addEventListener('click', () => { alleZeigen = !alleZeigen; rechnungenZeigen(getraenke); });
    };
    rechnungenZeigen();
    if (KASSE) kasseZeigen(m, rechnungenZeigen);

    if (platzS && !platzS.bez && $('#miniplan')) {
      const svg = PLAN.zeichnen($('#miniplan'), { modus: 'sommer', saison: SAISON, datum: heute >= sd.auslagern && heute < sd.einlagern ? heute : '2026-08-15', ansicht: platzS.bruecke === 'laengs' ? 'gesamt' : platzS.bruecke, markiere: platzS.id });
      svg.style.pointerEvents = 'none';
    }
    const awok = $('#awok'); if (awok) awok.addEventListener('click', () => {
      const f = $('#awf'); if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f));
      if (x.bis < x.von) return toast('Das Rückkehrdatum liegt vor der Abfahrt.');
      d.abwesenheiten.push({ id: H.uid('AW'), boot_id: b.id, platz_id: sommer.platz_id, von: x.von, bis: x.bis, notiz: x.notiz, gemeldet: 'Mitglied (Mein SSV)' });
      HF.sichern().then(() => toast('Gemeldet – gute Fahrt!'), (e) => toast('Nicht gespeichert: ' + e.message)); zeigen();
    });
    document.querySelectorAll('[data-weg]').forEach((btn) => btn.addEventListener('click', () => { d.abwesenheiten = d.abwesenheiten.filter((a) => a.id !== btn.dataset.weg); HF.sichern().catch((e) => toast('Nicht gelöscht: ' + e.message)); zeigen(); }));
    $('#meine-daten').addEventListener('click', () => {
      const el = modal('<h2>Meine Daten ändern</h2><form id="mf" class="form">' +
        '<label class="feld voll">Straße und Hausnummer<input name="strasse" autocomplete="street-address" value="' + esc(m.strasse || '') + '"></label>' +
        '<label class="feld">PLZ<input name="plz" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="' + esc(m.plz || '') + '"></label><label class="feld">Ort<input name="ort" autocomplete="address-level2" value="' + esc(m.ort || '') + '"></label>' +
        '<label class="feld">Telefon<input name="tel" type="tel" autocomplete="tel" value="' + esc(m.tel || '') + '"></label><label class="feld">E-Mail<input name="email" type="email" autocomplete="email" value="' + esc(m.email || '') + '"></label></form>' +
        '<div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="mok">Speichern</button></div>');
      $('#mok', el).addEventListener('click', async () => {
        const x = Object.fromEntries(new FormData($('#mf', el)));
        if (DBM) { try { await HF.meinDatenAendern(x); } catch (e) { return toast('Nicht gespeichert: ' + e.message); } }
        Object.assign(m, x); if (!DBM) HF.sichern();
        $('#modal').innerHTML = ''; toast('Gespeichert – danke!'); zeigen();
      });
    });
    const dat = $('#daten'); if (dat) dat.addEventListener('click', () => {
      const el = modal('<h2>Daten aktualisieren</h2><form id="df" class="form"><label class="feld">Versicherung<input name="versicherung" value="' + esc(b.versicherung || '') + '"></label><label class="feld">versichert bis<input name="vers_bis" type="date" value="' + esc(b.vers_bis || '') + '"></label>' +
        '<label class="feld">Gewicht (t)<input name="gewicht_t" inputmode="decimal" value="' + b.gewicht_t + '"></label><label class="feld">Kfz-Kennzeichen<input name="kfz" value="' + esc(m.kfz || '') + '"></label>' +
        '<label class="feld">Telefon<input name="tel" type="tel" value="' + esc(m.tel || '') + '"></label><label class="feld">E-Mail<input name="email" type="email" value="' + esc(m.email || '') + '"></label></form>' +
        '<p class="hinweis">Bankverbindung ändern? Bitte formlos an den Kassenwart – dafür braucht es ein neues SEPA-Mandat.</p><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="dok">Speichern</button></div>');
      $('#dok', el).addEventListener('click', async () => {
        const x = Object.fromEntries(new FormData($('#df', el)));
        if (DBM) {   // Mitglieder ändern nur über die Datenbank-Funktion (nur eigene Kontakt- und Bootsdaten)
          try { await HF.meinDatenAendern({ tel: x.tel, email: x.email, kfz: x.kfz, boot_id: b.id, versicherung: x.versicherung, vers_bis: x.vers_bis, gewicht_t: x.gewicht_t }); }
          catch (e) { return toast('Nicht gespeichert: ' + e.message); }
        }
        b.versicherung = x.versicherung; b.vers_bis = x.vers_bis; b.gewicht_t = Number(String(x.gewicht_t).replace(',', '.')) || b.gewicht_t; m.kfz = x.kfz; m.tel = x.tel; m.email = x.email;
        if (!DBM) HF.sichern();
        $('#modal').innerHTML = ''; toast('Gespeichert.'); zeigen();
      });
    });
  }
  /* ---------------------------------------------------------- Getränkekasse */
  const monatText = (von) => new Date(von + 'T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  async function kasseZeigen(m, rechnungenZeigen) {
    let u;
    try { u = await KASSE.mitgliedUebersicht(m.id); } catch (e) { const box = $('#kasse'); if (box) box.innerHTML = '<p class="hinweis warn">' + esc(e.message) + '</p>'; return; }
    const box = $('#kasse');
    if (!u || mid !== m.id || !box) return; // inzwischen anderes Mitglied gewählt
    rechnungenZeigen(u.rechnungen.map((r) => ({ art: 'Getränke', nr: r.nr, datum: r.datum, text: monatText(r.von), summe: r.summe, bezahlt_am: r.bezahlt_am, sepa: r.sepa, faellig: r.faellig,
      href: KASSE_PFAD + 'drucken.html?art=rechnung&ids=' + r.id + '&mein=' + encodeURIComponent(m.id) })));
    const kg = $('#k-getraenke'); if (kg) kg.querySelector('strong').textContent = H.geld(u.monat_summe);
    $('#info-kasse').textContent = (u.hat_pin ? '' : 'Code fehlt · ') + H.geld(u.monat_summe) + ' diesen Monat';
    const bs = u.buchungen.slice(0, 5);
    box.innerHTML = '<div class="kasse-zahlen"><div><small>Diesen Monat</small><strong>' + H.geld(u.monat_summe) + '</strong></div><div><small>noch nicht abgerechnet</small><strong>' + H.geld(u.offen_summe) + '</strong></div></div>' +
      (u.gesperrt_bis ? '<p class="hinweis warn">Dein Code wurde nach 5 Fehlversuchen kurz gesperrt. Mit einem neuen Code bist du sofort wieder frei.</p>' : '') +
      '<p style="margin:0 0 10px">' + (u.hat_pin
        ? 'Dein Code fürs iPad ist festgelegt. Vergessen? Leg einfach einen neuen fest.'
        : 'Du hast noch keinen Code fürs iPad. Leg ihn hier fest – oder beim ersten Mal an der Kasse mit deiner Mitgliedsnummer <strong>' + esc(m.nr) + '</strong>.') + '</p>' +
      '<div class="aktionen"><button class="btn' + (u.hat_pin ? '' : ' primaer') + '" id="code">' + (u.hat_pin ? 'Code ändern' : 'Code festlegen') + '</button></div>' +
      (bs.length ? '<table class="tab" style="margin-top:12px"><thead><tr><th>Letzte Buchungen</th><th class="r">Betrag</th></tr></thead><tbody>' + bs.map((x) =>
        '<tr' + (x.storniert_am ? ' class="blass"' : '') + '><td>' + x.anzahl + ' ' + (x.einheit === 'kasten' ? (x.anzahl === 1 ? 'Kasten' : 'Kästen') : '×') + ' ' + esc(x.produkt_name) + (x.storniert_am ? ' (storniert)' : '') +
        '<br><small style="color:var(--muted)">' + new Date(x.zeit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr</small></td><td class="r">' + H.geld(x.betrag) + '</td></tr>').join('') + '</tbody></table>' : '<p class="leer" style="margin-top:12px">Noch keine Buchungen.</p>');
    $('#code').addEventListener('click', () => codeAendern(m, u.hat_pin));
  }
  function codeAendern(m, hatPin) {
    const feld = (n, l) => '<label class="feld">' + l + '<input class="code-feld" name="' + n + '" type="password" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" required></label>';
    const el = modal('<h2>' + (hatPin ? 'Getränke-Code ändern' : 'Getränke-Code festlegen') + '</h2><p>Mit diesem 4-stelligen Code meldest du dich am iPad der Getränkekasse an. Bitte nicht weitergeben.</p>' +
      '<form id="cf" class="form">' + feld('a', 'Neuer Code') + feld('b', 'Code wiederholen') + '</form><p class="hinweis" id="cf-fehler" hidden></p>' +
      '<div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="cok">Speichern</button></div>');
    const fehler = (t) => { const f = $('#cf-fehler', el); f.textContent = t; f.className = 'hinweis warn'; f.hidden = false; };
    $('input', el).focus();
    const speichern = async () => {
      const x = Object.fromEntries(new FormData($('#cf', el)));
      if (!/^\d{4}$/.test(x.a)) return fehler('Der Code muss aus genau 4 Ziffern bestehen.');
      if (x.a !== x.b) return fehler('Die beiden Eingaben sind unterschiedlich.');
      try { await KASSE.mitgliedPinAendern(m.id, x.a); } catch (e) { return fehler(e.message); }
      $('#modal').innerHTML = ''; toast('Neuer Code gespeichert – gilt ab sofort an der Kasse.'); zeigen();
    };
    $('#cok', el).addEventListener('click', speichern);
    $('#cf', el).addEventListener('submit', (e) => { e.preventDefault(); speichern(); });
  }

  // Änderungen aus anderen Fenstern (Verwaltung, Kasse, Gast-Anmeldung) übernehmen
  window.addEventListener('storage', (e) => {
    if (e.key === 'ssv-hafen-demo-v1') { d = HF.laden(); zeigen(); }
    else if (e.key === 'ssvg-demo-v1') zeigen();
  });
  zeigen();
})();
