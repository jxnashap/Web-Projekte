/* SSV Hafen-Manager – Mitgliederbereich „Mein SSV“
 * Im Echtbetrieb meldet sich jedes Mitglied mit eigenem Konto an und sieht nur seine Daten.
 * In der Demo wählt man oben rechts, als welches Mitglied man die Seite ansieht. */
(function () {
  'use strict';
  const HF = window.HAFEN, G = window.HAFEN_GEBUEHREN, PLAN = window.HAFEN_PLAN;
  const { H, Q } = HF; const esc = H.esc;
  const $ = (s, r = document) => r.querySelector(s);
  let d = HF.laden(); const heute = H.tag(new Date()); const SAISON = 2026;
  const sd = G.saisonDaten(d, SAISON);

  function toast(t) { const el = $('#toast'); el.textContent = t; el.className = 'toast zeigen'; clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = 'toast'; }, 3000); }
  function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="modal"><div class="modal-karte" role="dialog" aria-modal="true">' + html + '</div></div>'; const el = m.firstChild; el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-zu]')) m.innerHTML = ''; }); return el; }

  const sel = $('#wer');
  const mitBoot = d.mitglieder.filter((m) => Q.booteVon(m.id).length || d.warteliste.some((w) => w.mitglied_id === m.id)).sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));
  sel.innerHTML = mitBoot.map((m) => '<option value="' + m.id + '">' + esc(m.nachname + ', ' + m.vorname) + '</option>').join('');
  let mid; try { mid = sessionStorage.getItem('ssv-mein') || mitBoot[0].id; } catch (e) { mid = mitBoot[0].id; }
  sel.value = mid;
  sel.addEventListener('change', () => { mid = sel.value; try { sessionStorage.setItem('ssv-mein', mid); } catch (e) { /* egal */ } zeigen(); });

  function zeigen() {
    const m = Q.mitglied(mid); const boote = Q.booteVon(mid);
    const b = boote[0]; const sommer = b && Q.belegungBoot(SAISON, 'sommer', b.id); const winter = b && Q.belegungBoot(SAISON, 'winter', b.id);
    const platzS = sommer && Q.platz(sommer.platz_id); const platzW = winter && Q.platz(winter.platz_id);
    const aw = d.abwesenheiten.filter((a) => b && a.boot_id === b.id).sort((x, y) => y.von.localeCompare(x.von));
    const res = d.rechnungen.filter((r) => r.mitglied_id === mid && !r.storniert_am).sort((x, y) => y.nr.localeCompare(x.nr));
    const warte = d.warteliste.filter((w) => w.status === 'wartend').sort((x, y) => x.datum.localeCompare(y.datum));
    const meinW = warte.findIndex((w) => w.mitglied_id === mid);
    const vs = b ? Q.versicherungsStatus(b, heute) : 'ok';
    $('#main').innerHTML = '<div class="demo-band"><strong>Demo:</strong> Im Echtbetrieb meldest du dich mit deinem eigenen Zugang an und siehst nur deine Daten. Alle Daten hier sind erfunden.</div>' +
      '<div class="kopf"><div><h1>Moin ' + esc(m.vorname) + '!</h1><p>' + H.ART[m.art] + ' · Mitgliedsnr. ' + esc(m.nr) + '</p></div></div>' +
      (vs !== 'ok' && b ? '<p class="hinweis warn">Dein Versicherungsnachweis ' + (vs === 'bald' ? 'läuft am ' + H.datum(b.vers_bis) + ' ab' : vs === 'fehlt' ? 'fehlt noch' : 'ist am ' + H.datum(b.vers_bis) + ' abgelaufen') + '. Bitte aktualisieren – die Hafenbetriebsordnung schreibt ihn vor.</p>' : '') +
      '<div class="mein-raster"><div>' +
      (b ? '<div class="panel"><h2>Mein Boot „' + esc(b.name) + '“</h2><div class="detail" style="box-shadow:none;padding:0;position:static"><dl>' +
        '<dt>Typ</dt><dd>' + esc(b.typ) + '</dd><dt>Maße</dt><dd>' + H.zahl(b.laenge) + ' × ' + H.zahl(b.breite) + ' m · Tiefgang ' + H.zahl(b.tiefgang) + ' m · ' + H.zahl(b.gewicht_t, 1) + ' t</dd>' +
        '<dt>Sommer ' + SAISON + '</dt><dd>' + (platzS ? (platzS.bez ? esc(platzS.bez) + ' (an Land)' : (platzS.box === 'L' ? 'Längsseits ' : 'Platz ') + esc(platzS.nr) + ', ' + H.BRUECKE[platzS.bruecke]) : '–') + '</dd>' +
        '<dt>Winter ' + SAISON + '/' + String(SAISON + 1).slice(2) + '</dt><dd>' + (platzW ? esc(platzW.bez) : '–') + '</dd>' +
        '<dt>Versicherung</dt><dd>' + esc(b.versicherung || '–') + ', bis ' + H.datum(b.vers_bis) + '</dd><dt>Kfz</dt><dd>' + esc(m.kfz || '–') + '</dd></dl></div>' +
        '<div class="aktionen" style="margin-top:12px"><button class="btn" id="daten">Daten aktualisieren</button></div></div>' +
        (platzS && !platzS.bez ? '<div class="panel" style="padding:0;overflow:hidden"><div id="miniplan" class="plan-flaeche"></div></div>' : '') : '') +
      (meinW >= 0 ? '<div class="panel"><h2>Warteliste</h2><p>Du stehst auf <strong>Platz ' + (meinW + 1) + '</strong> der Warteliste (seit ' + H.datum(warte[meinW].datum) + ').</p></div>' : '') +
      '</div><div>' +
      (sommer && sommer.platz_typ === 'wasser' ? '<div class="panel gruen-box"><h2>Grünes Schild</h2><p style="margin-top:0;color:var(--muted)">Unterwegs? Trag es hier ein – dein Platz wird im Hafenplan grün und der Hafenmeister kann ihn solange an Gäste vergeben. Bitte trotzdem das Schild am Steg drehen.</p>' +
        '<form id="awf" class="form"><label class="feld">ab<input type="date" name="von" required value="' + heute + '"></label><label class="feld">zurück am<input type="date" name="bis" required></label><label class="feld voll">Ziel (optional)<input name="notiz" placeholder="z. B. Dänische Südsee"></label></form>' +
        '<div class="aktionen" style="margin-top:10px"><button class="btn gruen" id="awok">Abwesenheit melden</button></div>' +
        (aw.length ? '<table class="tab" style="margin-top:12px"><tbody>' + aw.map((a) => '<tr' + (a.bis < heute ? ' class="blass"' : '') + '><td>' + H.kurz(a.von) + ' – ' + H.datum(a.bis) + '</td><td>' + esc(a.notiz || '') + '</td><td class="r">' + (a.von > heute ? '<button class="btn klein gefahr" data-weg="' + a.id + '">Löschen</button>' : '') + '</td></tr>').join('') + '</tbody></table>' : '') + '</div>' : '') +
      '<div class="panel"><h2>Meine Rechnungen</h2>' + (res.length ? '<table class="tab"><tbody>' + res.map((r) => '<tr><td><strong>' + esc(r.nr) + '</strong><br><small style="color:var(--muted)">' + (r.periode === 'sommer' ? 'Sommer ' : 'Winter ') + r.saison + '</small></td><td class="r">' + H.geld(r.summe) + '</td><td>' + (r.bezahlt_am ? '<span class="tag ok">bezahlt</span>' : r.sepa ? '<span class="tag">Lastschrift ' + H.kurz(r.faellig) + '</span>' : '<span class="tag warn">offen</span>') + '</td><td class="r"><a class="btn klein" href="drucken.html?art=rechnungen&ids=' + r.id + '" target="_blank">PDF</a></td></tr>').join('') + '</tbody></table>' : '<p class="leer">Noch keine Rechnungen.</p>') +
      '<p class="hinweis" style="margin-top:12px">Später erscheinen hier auch deine Getränke-Abrechnungen aus der Vereinskasse.</p></div></div></div>';

    if (platzS && !platzS.bez && $('#miniplan')) {
      const svg = PLAN.zeichnen($('#miniplan'), { modus: 'sommer', saison: SAISON, datum: heute >= sd.auslagern && heute < sd.einlagern ? heute : '2026-08-15', ansicht: platzS.bruecke === 'laengs' ? 'gesamt' : platzS.bruecke, markiere: platzS.id });
      svg.style.pointerEvents = 'none';
    }
    const awok = $('#awok'); if (awok) awok.addEventListener('click', () => {
      const f = $('#awf'); if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f));
      if (x.bis < x.von) return toast('Das Rückkehrdatum liegt vor der Abfahrt.');
      d.abwesenheiten.push({ id: H.uid('AW'), boot_id: b.id, platz_id: sommer.platz_id, von: x.von, bis: x.bis, notiz: x.notiz, gemeldet: 'Mitglied (Mein SSV)' });
      HF.sichern(); toast('Gemeldet – gute Fahrt!'); zeigen();
    });
    document.querySelectorAll('[data-weg]').forEach((btn) => btn.addEventListener('click', () => { d.abwesenheiten = d.abwesenheiten.filter((a) => a.id !== btn.dataset.weg); HF.sichern(); zeigen(); }));
    const dat = $('#daten'); if (dat) dat.addEventListener('click', () => {
      const el = modal('<h2>Daten aktualisieren</h2><form id="df" class="form"><label class="feld">Versicherung<input name="versicherung" value="' + esc(b.versicherung || '') + '"></label><label class="feld">versichert bis<input name="vers_bis" type="date" value="' + esc(b.vers_bis || '') + '"></label>' +
        '<label class="feld">Gewicht (t)<input name="gewicht_t" type="number" step="0.1" value="' + b.gewicht_t + '"></label><label class="feld">Kfz-Kennzeichen<input name="kfz" value="' + esc(m.kfz || '') + '"></label>' +
        '<label class="feld">Telefon<input name="tel" value="' + esc(m.tel || '') + '"></label><label class="feld">E-Mail<input name="email" type="email" value="' + esc(m.email || '') + '"></label></form>' +
        '<p class="hinweis">Bankverbindung ändern? Bitte formlos an den Kassenwart – dafür braucht es ein neues SEPA-Mandat.</p><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="dok">Speichern</button></div>');
      $('#dok', el).addEventListener('click', () => { const x = Object.fromEntries(new FormData($('#df', el))); b.versicherung = x.versicherung; b.vers_bis = x.vers_bis; b.gewicht_t = Number(x.gewicht_t) || b.gewicht_t; m.kfz = x.kfz; m.tel = x.tel; m.email = x.email; HF.sichern(); $('#modal').innerHTML = ''; toast('Gespeichert.'); zeigen(); });
    });
  }
  // Änderungen aus anderen Fenstern (Verwaltung, Gast-Anmeldung) übernehmen
  window.addEventListener('storage', (e) => { if (e.key === 'ssv-hafen-demo-v1') { d = HF.laden(); zeigen(); } });
  zeigen();
})();
