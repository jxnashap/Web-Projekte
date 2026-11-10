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

  const inSaisonF = () => heute >= sd.auslagern && heute < sd.einlagern;
  // Mitteilungen des Vereins (z. B. Sturmwarnung) – ausblendbar, wichtige bleiben bis zum Ablauf rot
  const WEG = 'ssv-mitteilung-weg'; const ausgeblendet = () => { try { return JSON.parse(localStorage.getItem(WEG)) || []; } catch (e) { return []; } };
  function mitteilungenHtml(eigner, lieger) {
    const l = (d.mitteilungen || []).filter((x) => (!x.gueltig_bis || x.gueltig_bis >= heute) && (x.zielgruppe === 'alle' || (x.zielgruppe === 'bootseigner' && eigner) || (x.zielgruppe === 'liegeplatz' && lieger)) && !ausgeblendet().includes(x.id))
      .sort((x, y) => (y.wichtig ? 1 : 0) - (x.wichtig ? 1 : 0) || String(y.erstellt).localeCompare(String(x.erstellt)));
    return l.map((x) => '<div class="mitteilung' + (x.wichtig ? ' wichtig' : '') + '" role="' + (x.wichtig ? 'alert' : 'status') + '"><div><strong>' + (x.wichtig ? '⚠ ' : '') + esc(x.titel) + '</strong>' + (x.text ? '<p>' + esc(x.text) + '</p>' : '') +
      '<small>' + new Date(x.erstellt).toLocaleDateString('de-DE') + (x.erstellt_von ? ' · ' + esc(x.erstellt_von) : '') + '</small></div><button class="btn klein" data-mweg="' + x.id + '" aria-label="Mitteilung ausblenden">Gelesen</button></div>').join('');
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-mweg]'); if (!b) return; try { localStorage.setItem(WEG, JSON.stringify(ausgeblendet().concat([b.dataset.mweg]).slice(-50))); } catch (x) { /* egal */ } b.closest('.mitteilung').remove(); });
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
    const naechste = (d.saisons || []).find((x) => x.jahr === SAISON + 1);
    const auslagernNeu = heute < sd.auslagern ? sd.auslagern : naechste && naechste.auslagern;
    const yy = String(SAISON + 1).slice(2);
    // Wo ist das Boot gerade? Saison und tatsächlicher Ort getrennt
    const ortJetzt = !b ? '' : inSaisonF() ? (platzS ? (platzS.bez ? esc(platzS.bez) + ' (Sommer an Land)' : 'im Wasser, ' + (platzS.box === 'L' ? 'Längsseits ' : 'Platz ') + esc(platzS.nr)) : 'kein Sommerplatz bei uns')
      : (platzW ? 'im Winterlager, ' + esc(platzW.bez) : 'im Winter ' + SAISON + '/' + yy + ' kein Landplatz bei uns gebucht');
    const NW = { geprueft: ['Nachweis geprüft' + (b && b.vers_geprueft_am ? ' am ' + H.datum(b.vers_geprueft_am) : ''), 'ok'], eingereicht: ['Nachweis eingereicht – wird geprüft', 'gast'], selbst: ['selbst angegeben – bitte Nachweis hochladen', 'warn'] };
    const nw = b ? (NW[b.vers_status] || ['noch kein Nachweis – bitte hochladen', 'warn']) : null;
    const platzText = platzS ? (platzS.bez ? esc(platzS.bez) : (platzS.box === 'L' ? 'Längsseits ' : 'Platz ') + esc(platzS.nr)) : '';
    const wasser = sommer && sommer.platz_typ === 'wasser';
    const inSaison = inSaisonF();   // grünes Schild nur, solange die Boote im Wasser sind

    // Persönliche Termine (nur, was kommt)
    const termine = [];
    d.rechnungen.filter((r) => r.mitglied_id === mid && Q.rest(r) > 0 && r.faellig >= heute).forEach((r) => termine.push([r.faellig, r.sepa ? 'Lastschrift-Einzug ' + H.geld(Q.rest(r)) : 'Überweisung fällig ' + H.geld(Q.rest(r)), (r.periode === 'beitrag' ? 'Beitrag ' + r.saison : H.periodeText(r)) + ' · ' + r.nr]));
    if (awAktuell) termine.push([awAktuell.bis, 'Rückkehr gemeldet', 'grünes Schild endet']);
    if (b && sd.einlagern >= heute) termine.push([sd.einlagern, 'Einlagern', 'Gemeinschaftsarbeit nach Belegungsplan']);
    (d.arbeitseinsaetze || []).filter((x) => x.datum >= heute).forEach((x) => termine.push([x.datum, 'Arbeitseinsatz: ' + x.titel, [x.beginn && x.beginn + (x.ende ? '–' + x.ende : '') + ' Uhr', x.notiz].filter(Boolean).join(' · ')]));
    if (b && auslagernNeu && auslagernNeu >= heute) termine.push([auslagernNeu, 'Auslagern', 'Gemeinschaftsarbeit nach Belegungsplan']);
    if (b && b.vers_bis && b.vers_bis >= heute) termine.push([b.vers_bis, 'Versicherung läuft ab', 'vorher neuen Nachweis hochladen']);
    termine.sort((x, y) => x[0].localeCompare(y[0])); termine.splice(5);
    // Arbeitsdienst: eigener Stundenstand nach den Regeln des Vereins
    const ad = G.arbeitsdienst && (m.art === 'ausuebend' || m.art === 'probe') ? G.arbeitsdienst(d, SAISON, m) : null;
    const meineStunden = (d.arbeitsdienst || []).filter((a) => a.mitglied_id === mid && String(a.datum).startsWith(String(SAISON))).sort((x, y) => y.datum.localeCompare(x.datum));
    const kommend = (d.arbeitseinsaetze || []).filter((x) => x.datum >= heute).sort((x, y) => x.datum.localeCompare(y.datum));
    const STAND = { eingereicht: ['wird geprüft', 'gast'], abgelehnt: ['nicht anerkannt', 'rot'] };
    // Eigene Arbeitsbereiche (Kran, Steg …) mit Aufgaben und Ansprechpartner – Datenbank liefert sie fertig, die Demo rechnet selbst
    const meineBereiche = d.meine_bereiche || (d.arbeitsbereich_mitglieder || []).filter((z) => z.mitglied_id === mid).map((z) => {
      const b = (d.arbeitsbereiche || []).find((x) => x.id === z.bereich_id); if (!b || b.aktiv === false) return null;
      const leitung = d.arbeitsbereich_mitglieder.filter((y) => y.bereich_id === b.id && y.rolle === 'leitung').map((y) => Q.mitglied(y.mitglied_id)).filter(Boolean).map((x) => ({ name: x.vorname + ' ' + x.nachname, tel: x.tel }));
      return { ...b, rolle: z.rolle, leitung };
    }).filter(Boolean);
    const telLink = (t) => { t = String(t || '').replace(/[^\d+]/g, ''); return t.startsWith('0') ? '+49' + t.slice(1) : t; };
    const bereicheHtml = meineBereiche.length ? '<h3 style="margin:14px 0 6px;font-size:15px">Deine Arbeitsbereiche</h3>' + meineBereiche.map((b) =>
      '<div class="mein-bereich"><div class="mein-bereich-kopf"><strong>' + esc(b.name) + '</strong>' + (b.rolle === 'leitung' ? ' <span class="tag ok">du leitest</span>' : '') + '</div>' +
      ((b.leitung || []).length && b.rolle !== 'leitung' ? '<p>Ansprechpartner: ' + b.leitung.map((l) => esc(l.name) + (l.tel ? ' · <a href="tel:' + esc(telLink(l.tel)) + '">' + esc(l.tel) + '</a>' : '')).join(', ') + '</p>' : '') +
      (b.treffpunkt ? '<p><small>' + esc(b.treffpunkt) + '</small></p>' : '') +
      ((b.aufgaben || []).length ? '<ul>' + b.aufgaben.map((a) => '<li>' + esc(a.titel) + (a.zeitraum ? ' <small>· ' + esc(a.zeitraum) + '</small>' : '') + '</li>').join('') + '</ul>' : '') + '</div>').join('') : '';
    const adInhalt = ad ? (ad.befreit ? '<p style="margin:0">Du bist vom Arbeitsdienst befreit (' + esc(ad.befreit) + ').</p>'
      : '<div class="kasse-zahlen"><div><small>bestätigt</small><strong>' + H.zahl(ad.ist, ad.ist % 1 ? 1 : 0) + ' Std.</strong></div><div><small>noch offen</small><strong>' + H.zahl(ad.fehl, ad.fehl % 1 ? 1 : 0) + ' Std.</strong></div></div>' +
        (ad.gemeldet ? '<p style="margin:0 0 8px;font-size:13px;color:var(--muted)">Dazu ' + H.zahl(ad.gemeldet, ad.gemeldet % 1 ? 1 : 0) + ' Std. gemeldet – der Verein bestätigt sie noch.</p>' : '') +
        (meineStunden.length ? '<table class="tab"><tbody>' + meineStunden.map((a) => '<tr><td class="nw">' + H.datum(a.datum) + '</td><td>' + esc(a.taetigkeit || 'Arbeitseinsatz') + (STAND[a.status] ? ' <span class="tag ' + STAND[a.status][1] + '">' + STAND[a.status][0] + '</span>' : '') + '</td><td class="r">' + H.zahl(a.stunden, a.stunden % 1 ? 1 : 0) + ' Std.</td></tr>').join('') + '</tbody></table>' : '<p class="leer">Noch keine Stunden erfasst.</p>') +
        '<div class="aktionen" style="margin-top:10px"><button class="btn" id="ad-melden">Stunden melden</button></div>' +
        bereicheHtml +
        (kommend.length ? '<h3 style="margin:14px 0 6px;font-size:15px">Nächste Arbeitseinsätze</h3><table class="tab"><tbody>' + kommend.slice(0, 3).map((x) => '<tr><td class="nw">' + H.datum(x.datum) + '</td><td>' + esc(x.titel) + (x.beginn ? '<br><small style="color:var(--muted)">' + esc(x.beginn) + (x.ende ? '–' + esc(x.ende) : '') + ' Uhr' + (x.notiz ? ' · ' + esc(x.notiz) : '') + '</small>' : '') + '</td></tr>').join('') + '</tbody></table>' : '') +
        '<p class="hinweis" style="margin-top:10px">Soll: ' + ad.soll + ' Stunden im Jahr' + (ad.vorjahr ? ' (dazu ' + ad.vorjahr + ' aus dem Vorjahr)' : '') + '. Beim Arbeitseinsatz einfach den QR-Code am Vereinsheim scannen – oder hier Stunden melden; der Verein bestätigt sie.' + (d.einstellungen.arbeitsdienst_bestaetigt ? '' : ' Die genauen Regeln legt der Vorstand noch fest.') + '</p>') : '';

    const bootInhalt = b ? '<div class="detail" style="box-shadow:none;padding:0;position:static"><dl>' +
        '<dt>Typ</dt><dd>' + esc(b.typ) + '</dd><dt>Maße</dt><dd>' + H.zahl(b.laenge) + ' × ' + H.zahl(b.breite) + ' m · Tiefgang ' + H.zahl(b.tiefgang) + ' m · ' + H.zahl(b.gewicht_t, 1) + ' t</dd>' +
        '<dt>Jetzt</dt><dd><strong>' + ortJetzt + '</strong></dd>' +
        '<dt>Sommer ' + SAISON + '</dt><dd>' + (platzS ? (platzS.bez ? esc(platzS.bez) + ' (an Land)' : platzText + ', ' + H.BRUECKE[platzS.bruecke]) : 'kein Platz') + '</dd>' +
        '<dt>Winter ' + SAISON + '/' + yy + '</dt><dd>' + (platzW ? esc(platzW.bez) : 'kein Landplatz bei uns') + '</dd>' +
        '<dt>Versicherung</dt><dd>' + esc(b.versicherung || '–') + (b.vers_bis ? ', bis ' + H.datum(b.vers_bis) : '') + '<br><span class="tag ' + nw[1] + '">' + nw[0] + '</span></dd><dt>Kfz</dt><dd>' + esc(m.kfz || '–') + '</dd></dl></div>' +
        (platzS && !platzS.bez ? '<div id="miniplan" class="plan-flaeche mini-plan"></div><p style="font-size:12px;color:var(--muted);margin:4px 0 0">' + (inSaisonF() ? 'Hafenplan heute' : 'Dein Sommerplatz ' + SAISON + ' (Saison beendet)') + '</p>' : '') +
        '<div class="aktionen" style="margin-top:12px"><button class="btn primaer" id="nachweis">Versicherungsnachweis hochladen</button><button class="btn" id="daten">Daten aktualisieren</button></div>' : '';
    const awTabelle = aw.length ? '<table class="tab" style="margin-top:12px"><tbody>' + aw.map((a) => '<tr' + (a.bis < heute ? ' class="blass"' : '') + '><td>' + H.kurz(a.von) + ' – ' + H.datum(a.bis) + '</td><td>' + esc(a.notiz || '') + '</td><td class="r">' + (a.von > heute ? '<button class="btn klein gefahr" data-weg="' + a.id + '">Löschen</button>' : a.bis >= heute ? '<button class="btn klein" data-weg="' + a.id + '">Früher zurück</button>' : '') + '</td></tr>').join('') + '</tbody></table>' : '';
    const schildInhalt = wasser && !inSaison ? '<p style="margin:0">Das grüne Schild gibt es, solange die Boote im Wasser sind – wieder ab dem Auslagern' + (auslagernNeu ? ' am ' + H.datum(auslagernNeu) : '') + '. ' + (platzW ? 'Dein Boot steht gerade im Winterlager (' + esc(platzW.bez) + ').' : 'Im Winter ' + SAISON + '/' + yy + ' hast du bei uns keinen Landplatz gebucht.') + '</p>' + (aw.some((a) => a.bis >= heute) ? awTabelle.replace(/<tr class="blass">.*?<\/tr>/g, '') : '') : wasser ? '<p style="margin-top:0;color:var(--muted)">Unterwegs? Dann wird dein Platz grün und der Hafenmeister kann ihn an Gäste geben. Bitte trotzdem das Schild am Steg drehen.</p>' +
        '<form id="awf" class="form"><label class="feld">ab<input type="date" name="von" required value="' + heute + '"></label><label class="feld">zurück am<input type="date" name="bis" required></label><label class="feld voll">Ziel (optional)<input name="notiz" placeholder="z. B. Dänische Südsee"></label></form>' +
        '<div class="aktionen" style="margin-top:10px"><button class="btn gruen" id="awok">Abwesenheit melden</button></div>' +
        awTabelle : '';

    $('#main').innerHTML = (DBM ? '' : '<div class="demo-band"><strong>Demo</strong> – erfundene Daten. Im Echtbetrieb meldest du dich mit deinem eigenen Zugang an.</div>') +
      '<div class="kopf"><div><h1>Moin ' + esc(m.vorname) + '!</h1><p>' + H.ART[m.art] + ' · Mitgliedsnr. ' + esc(m.nr) + '</p></div></div>' +
      mitteilungenHtml(!!b, !!wasser) +
      (vs !== 'ok' && b ? '<p class="hinweis warn">Deine Bootsversicherung ' + (vs === 'bald' ? 'läuft am ' + H.datum(b.vers_bis) + ' ab' : vs === 'fehlt' ? 'ist noch nicht hinterlegt' : 'ist am ' + H.datum(b.vers_bis) + ' abgelaufen') + '. Bitte unter „Mein Boot“ einen neuen Nachweis hochladen.</p>' : '') +
      '<div class="blick">' + kachel('rechnungen', 'Rechnungen', '…', 'wird geladen …', 'k-offen') +
        (b && !inSaison && platzW ? kachel('boot', 'Winterlager', esc(platzW.bez), SAISON + '/' + yy) : platzS ? kachel(wasser ? 'schild' : 'boot', 'Liegeplatz', platzText, !inSaison ? 'Sommer ' + SAISON + ' (beendet)' : awAktuell ? 'grün bis ' + H.kurz(awAktuell.bis) : (platzS.bez ? 'an Land' : H.BRUECKE[platzS.bruecke])) : meinW >= 0 ? kachel('warteliste', 'Warteliste', 'Platz ' + (meinW + 1), 'seit ' + H.datum(warte[meinW].datum)) : kachel('rechnungen', 'Mitglied seit', m.eintritt ? m.eintritt.slice(0, 4) : '–', H.ART[m.art])) +
        (KASSE ? kachel('kasse', 'Verbrauch ' + new Date().toLocaleDateString('de-DE', { month: 'long' }), '…', 'Getränke · noch nicht abgerechnet', 'k-getraenke') : '') + '</div>' +
      '<div class="mein-raster"><div>' +
      (b ? sektion('boot', 'Mein Boot', '„' + esc(b.name) + '“' + (platzText ? ' · ' + platzText : ''), bootInhalt) : '') +
      (meinW >= 0 ? sektion('warteliste', 'Warteliste', 'Platz ' + (meinW + 1), '<p style="margin:0">Du stehst auf <strong>Platz ' + (meinW + 1) + '</strong> der Warteliste (seit ' + H.datum(warte[meinW].datum) + ').</p>') : '') +
      (KASSE ? sektion('kasse', 'Getränkekasse', 'wird geladen …', '<div id="kasse"><p class="leer">Wird geladen …</p></div>') : '') +
      sektion('daten', 'Meine Daten', esc(m.ort || ''), '<div class="detail" style="box-shadow:none;padding:0;position:static"><dl>' +
        '<dt>Anschrift</dt><dd>' + esc(m.strasse || '–') + '<br>' + esc(((m.plz || '') + ' ' + (m.ort || '')).trim()) + '</dd><dt>Telefon</dt><dd>' + esc(m.tel || '–') + '</dd><dt>E-Mail</dt><dd>' + esc(m.email || '–') + '</dd>' +
        '<dt>Lastschrift</dt><dd>' + (m.iban ? 'Konto •••• ' + esc(String(m.iban).slice(-4)) : 'kein Mandat hinterlegt') + '</dd></dl></div>' +
        '<div class="aktionen" style="margin-top:12px"><button class="btn" id="meine-daten">Daten ändern</button></div><div id="meine-dok"></div>' +
        (DBM && d.einstellungen.push_aktiv ? '<h3 style="margin:16px 0 6px;font-size:15px">Benachrichtigungen</h3><div id="push-box"><p class="leer">…</p></div>' : '') +
        '<p class="hinweis" style="margin-top:12px">Neue Bankverbindung oder Fragen zu Rechnungen? Schreib an <a href="mailto:' + esc(d.einstellungen.verein_email) + '">' + esc(d.einstellungen.verein_email) + '</a> – für ein neues Konto braucht es ein neues Lastschriftmandat.</p>') +
      '</div><div>' +
      (wasser ? sektion('schild', 'Grünes Schild', awAktuell ? 'unterwegs ' + H.kurz(awAktuell.von) + '–' + H.kurz(awAktuell.bis) : 'Platz frei melden', schildInhalt, 'gruen-box') : '') +
      sektion('rechnungen', 'Meine Rechnungen', '', '<div id="rechnungen"></div><p class="hinweis" style="margin-top:12px">Mit Lastschriftmandat wird alles eingezogen – du musst nichts tun. Fragen? Einfach den Kassenwart ansprechen.</p>', '', true) +
      (termine.length ? sektion('termine', 'Meine Termine', esc(termine[0][1]) + ' ' + H.kurz(termine[0][0]), '<table class="tab"><tbody>' + termine.map(([t, txt, zus]) => '<tr><td class="nw">' + H.datum(t) + '</td><td>' + esc(txt) + (zus ? '<br><small style="color:var(--muted)">' + esc(zus) + '</small>' : '') + '</td></tr>').join('') + '</tbody></table>') : '') +
      (ad ? sektion('arbeitsdienst', 'Arbeitsdienst ' + SAISON, ad.befreit ? 'befreit' : H.zahl(ad.ist, ad.ist % 1 ? 1 : 0) + ' von ' + ad.soll + ' Std.', adInhalt) : '') +
      (!ad && meineBereiche.length ? sektion('arbeitsbereiche', 'Meine Arbeitsbereiche', meineBereiche.map((b) => b.name).join(', '), bereicheHtml.replace('<h3 style="margin:14px 0 6px;font-size:15px">Deine Arbeitsbereiche</h3>', '')) : '') +
      sektion('schaden', 'Schaden melden', 'Steg, Strom, Kran …', '<p style="margin-top:0">Etwas kaputt im Hafen? Kurz melden – die Funktionsträger sehen es sofort und kümmern sich.</p><div class="aktionen"><button class="btn" id="schaden">Schaden melden</button></div>') +
      '</div></div>';

    // Aufklappen merken; Kacheln springen zum Bereich
    document.querySelectorAll('details.sek').forEach((el) => el.addEventListener('toggle', () => { AUF[el.dataset.sek] = el.open; }));
    document.querySelectorAll('.blick [data-ziel]').forEach((k) => k.addEventListener('click', () => {
      const el = document.querySelector('details.sek[data-sek="' + k.dataset.ziel + '"]'); if (!el) return;
      el.open = true; AUF[el.dataset.sek] = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    // Rechnungen: Hafen und Beitrag sofort, Getränke sobald die Kasse geantwortet hat
    const hafenPosten = res.map((r) => ({ art: r.periode === 'beitrag' ? 'Beitrag' : 'Hafen', nr: r.nr, datum: r.datum || '', text: r.periode === 'beitrag' ? String(r.saison) : H.periodeText(r),
      summe: Q.rest(r) || r.summe, rest: Q.rest(r), stand: Q.rstatus(r, heute), bezahlt_am: Q.rest(r) === 0 ? (r.bezahlt_am || heute) : null, sepa: r.sepa, faellig: r.faellig, href: 'drucken.html?art=rechnungen&ids=' + r.id + (DBM ? '&mein=1' : '') }));
    let bezahlteZeigen = false;
    const erklaerung = (r) => r.stand === 'ruecklastschrift' ? ['Lastschrift zurückgekommen – bitte überweisen', 'rot'] : r.stand === 'teilbezahlt' ? ['teilweise bezahlt – Rest ' + (r.sepa ? 'wird eingezogen' : 'bitte überweisen'), 'warn']
      : r.sepa ? [(r.faellig >= heute ? 'Einzug am ' + H.kurz(r.faellig) : 'wird eingezogen') + ' – du musst nichts tun', ''] : ['bitte überweisen bis ' + H.kurz(r.faellig), 'warn'];
    const rechnungenZeigen = (getraenke) => {
      const alle = hafenPosten.concat(getraenke || []).sort((x, y) => (y.datum || '').localeCompare(x.datum || '') || y.nr.localeCompare(x.nr));
      const offen = alle.filter((r) => !r.bezahlt_am); const bezahlt = alle.filter((r) => r.bezahlt_am);
      const summeOffen = offen.reduce((s2, r) => s2 + Math.round(r.summe * 100), 0) / 100;
      const ko = $('#k-offen');
      if (ko) {
        const naechste = offen.slice().sort((x, y) => (x.faellig || '').localeCompare(y.faellig || ''))[0];
        ko.querySelector('small').textContent = offen.length > 1 ? offen.length + ' offene Rechnungen' : offen.length ? 'Rechnung' : 'Rechnungen';
        ko.querySelector('strong').textContent = offen.length ? H.geld(summeOffen) : 'alles bezahlt';
        ko.querySelector('span').textContent = naechste ? erklaerung(naechste)[0] : 'nichts offen – danke!';
      }
      $('#info-rechnungen').textContent = offen.length ? H.geld(summeOffen) + ' offen' : 'alles bezahlt';
      const zeile = (r) => '<tr><td><span class="tag' + (r.art === 'Hafen' ? '' : r.art === 'Beitrag' ? ' gruen' : ' gold') + '">' + r.art + '</span> ' + esc(r.text) +
        '<br><small style="color:var(--muted)">' + esc(r.nr) + '</small>' + (!r.bezahlt_am ? '<br><span class="erkl ' + erklaerung(r)[1] + '">' + erklaerung(r)[0] + '</span>' : '') + '</td><td class="r"><strong>' + H.geld(r.summe) + '</strong>' +
        (r.bezahlt_am ? '<br><span class="tag ok">bezahlt</span>' : '') + '</td><td class="r"><a class="btn klein" href="' + r.href + '" target="_blank">PDF</a></td></tr>';
      $('#rechnungen').innerHTML = (offen.length ? '<table class="tab rechn"><tbody>' + offen.map(zeile).join('') + '</tbody></table>' : '<p class="leer" style="margin:0">Keine offenen Rechnungen – alles bezahlt.</p>') +
        (bezahlt.length ? '<button class="btn klein" id="rmehr" style="margin-top:12px">' + (bezahlteZeigen ? 'Bezahlte Rechnungen ausblenden' : 'Bezahlte Rechnungen ansehen (' + bezahlt.length + ')') + '</button>' +
          (bezahlteZeigen ? '<table class="tab rechn" style="margin-top:8px"><tbody>' + bezahlt.map(zeile).join('') + '</tbody></table>' : '') : '');
      const mehr = $('#rmehr'); if (mehr) mehr.addEventListener('click', () => { bezahlteZeigen = !bezahlteZeigen; rechnungenZeigen(getraenke); });
    };
    rechnungenZeigen();
    if (KASSE) kasseZeigen(m, rechnungenZeigen);
    pushStand().catch(() => {});
    // Schnellknopf am Handy: in der Saison „Platz frei melden“, sonst „Stunden melden“ (nur wenn passend)
    let sk = $('#schnell'); const aktion = wasser && inSaison && !awAktuell ? ['Platz frei melden', 'schild'] : ad && !ad.befreit ? ['Stunden melden', 'stunden'] : null;
    if (!aktion) { if (sk) sk.remove(); } else {
      if (!sk) { sk = document.createElement('button'); sk.id = 'schnell'; sk.className = 'schnell'; sk.type = 'button'; document.body.appendChild(sk); }
      sk.textContent = aktion[0]; sk.onclick = () => { if (aktion[1] === 'stunden') return stundenDialog('');
        const el = document.querySelector('details.sek[data-sek=schild]'); if (el) { el.open = true; AUF.schild = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); const v = $('#awf [name=bis]'); if (v) setTimeout(() => v.focus(), 400); } };
    }
    // Unterlagen, die der Verein für mich hinterlegt hat (Verträge, Nachweise)
    HF.dok.liste({ mitglied_id: mid }).then((l) => { const box = $('#meine-dok'); if (!box || !l.length) return;
      box.innerHTML = '<h3 style="margin:16px 0 6px;font-size:15px">Meine Unterlagen</h3><table class="tab"><tbody>' + l.map((x) => '<tr><td>' + esc(x.name) + '<br><small style="color:var(--muted)">' + new Date(x.hochgeladen).toLocaleDateString('de-DE') + '</small></td><td class="r"><button class="btn klein" data-dok="' + x.id + '">Ansehen</button></td></tr>').join('') + '</tbody></table>';
      box.addEventListener('click', (e) => { const a = e.target.closest('[data-dok]'); if (a) HF.datei.oeffnen(a.dataset.dok).catch((x) => toast(x.message)); });
    }).catch(() => {});

    if (platzS && !platzS.bez && $('#miniplan')) {
      const svg = PLAN.zeichnen($('#miniplan'), { modus: 'sommer', saison: SAISON, datum: heute >= sd.auslagern && heute < sd.einlagern ? heute : (DBM ? H.tag(new Date(new Date(sd.einlagern + 'T12:00:00').getTime() - 864e5)) : '2026-08-15'), ansicht: platzS.bruecke === 'laengs' ? 'gesamt' : platzS.bruecke, markiere: platzS.id });
      svg.style.pointerEvents = 'none';
    }
    const awok = $('#awok'); if (awok) awok.addEventListener('click', () => {
      const f = $('#awf'); if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f));
      if (x.bis < x.von) return toast('Das Rückkehrdatum liegt vor der Abfahrt.');
      d.abwesenheiten.push({ id: H.uid('AW'), boot_id: b.id, platz_id: sommer.platz_id, von: x.von, bis: x.bis, notiz: x.notiz, gemeldet: 'Mitglied (Mein SSV)' });
      HF.sichern().then(() => toast('Gemeldet – gute Fahrt!'), (e) => toast('Nicht gespeichert: ' + e.message)); zeigen();
    });
    document.querySelectorAll('[data-weg]').forEach((btn) => btn.addEventListener('click', () => abwesenheitBeenden(aw.find((a) => a.id === btn.dataset.weg))));
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
      const el = modal('<h2>Daten aktualisieren</h2><form id="df" class="form">' +
        '<label class="feld">Gewicht (t)<input name="gewicht_t" inputmode="decimal" value="' + b.gewicht_t + '"></label><label class="feld">Kfz-Kennzeichen<input name="kfz" value="' + esc(m.kfz || '') + '"></label>' +
        '<label class="feld">Telefon<input name="tel" type="tel" value="' + esc(m.tel || '') + '"></label><label class="feld">E-Mail<input name="email" type="email" value="' + esc(m.email || '') + '"></label></form>' +
        '<p class="hinweis">Bankverbindung ändern? Bitte formlos an den Kassenwart – dafür braucht es ein neues SEPA-Mandat.</p><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="dok">Speichern</button></div>');
      $('#dok', el).addEventListener('click', async () => {
        const x = Object.fromEntries(new FormData($('#df', el)));
        if (DBM) {   // Mitglieder ändern nur über die Datenbank-Funktion (nur eigene Kontakt- und Bootsdaten)
          try { await HF.meinDatenAendern({ tel: x.tel, email: x.email, kfz: x.kfz, boot_id: b.id, gewicht_t: x.gewicht_t }); }
          catch (e) { return toast('Nicht gespeichert: ' + e.message); }
        }
        b.gewicht_t = Number(String(x.gewicht_t).replace(',', '.')) || b.gewicht_t; m.kfz = x.kfz; m.tel = x.tel; m.email = x.email;
        if (!DBM) HF.sichern();
        $('#modal').innerHTML = ''; toast('Gespeichert.'); zeigen();
      });
    });
  }
  /* Früher zurück (oder geplante Abwesenheit löschen): ab heute ist der Platz wieder belegt.
   * Liegt dort noch ein Gast, wird der Hafenmeister gebraucht – das sagen wir deutlich. */
  async function abwesenheitBeenden(a) {
    if (!a) return;
    const laufend = a.von <= heute;
    if (!confirm(laufend ? 'Bist du wieder da? Ab heute ist dein Platz wieder belegt und wird nicht mehr an Gäste vergeben.' : 'Geplante Abwesenheit löschen?')) return;
    let gaeste = [];
    try {
      if (DBM) {
        const r = await window.SSV_SB.rpc('meine_abwesenheit_beenden', { p_id: a.id });
        gaeste = (r && r.gaeste) || [];
        if (laufend && a.von < heute) a.bis = H.tag(new Date(Date.now() - 864e5)); else d.abwesenheiten = d.abwesenheiten.filter((x) => x !== a);
      } else {
        const abr = (g) => H.tag(new Date(new Date(g.ankunft + 'T12:00:00').getTime() + g.naechte * 864e5));
        gaeste = d.gaeste.filter((g) => g.platz_id === a.platz_id && g.status !== 'storniert' && g.status !== 'abgereist' && abr(g) > heute && g.ankunft <= a.bis).map((g) => ({ bootsname: g.bootsname, bis: abr(g) }));
        if (laufend && a.von < heute) a.bis = H.tag(new Date(Date.now() - 864e5)); else d.abwesenheiten = d.abwesenheiten.filter((x) => x !== a);
        await HF.sichern();
      }
    } catch (e) { return toast('Nicht gespeichert: ' + e.message); }
    zeigen();
    if (gaeste.length) {
      const e = d.einstellungen;
      modal('<h2>Willkommen zurück!</h2><p class="hinweis warn">Auf deinem Platz ist noch ein Gast eingeplant: ' + gaeste.map((g) => '„' + esc(g.bootsname) + '“ bis ' + H.datum(g.bis)).join(', ') +
        '. Bitte kurz beim Hafenmeister melden, damit er den Gast umlegt.</p><div class="modal-fuss"><button class="btn" data-zu>Schließen</button>' +
        (e.hafenmeister_tel ? '<a class="btn primaer" href="tel:' + esc(String(e.hafenmeister_tel).replace(/\s/g, '')) + '">Hafenmeister anrufen</a>' : '') + '</div>');
    } else toast(laufend ? 'Willkommen zurück – dein Platz ist wieder belegt.' : 'Gelöscht.');
  }

  /* ---------------------------------------------------------- Versicherungsnachweis und Schadensmeldung */
  document.addEventListener('click', (e) => {
    if (e.target.closest('#nachweis')) nachweisDialog();
    if (e.target.closest('#schaden')) schadenDialog();
    if (e.target.closest('#ad-melden')) stundenDialog('');
    if (e.target.closest('#push-an')) pushAn();
    if (e.target.closest('#push-aus')) pushAus();
  });

  /* Arbeitsstunden melden – per QR-Code am Einsatztag (?einsatz=CODE) oder frei; der Verein bestätigt */
  function stundenDialog(code) {
    const m = Q.mitglied(mid); const heuteE = (d.arbeitseinsaetze || []).filter((x) => x.datum === heute || x.datum === H.tag(new Date(Date.now() - 864e5)));
    const e1 = heuteE[0];
    const el = modal('<h2>' + (code ? 'Check-in Arbeitseinsatz' : 'Arbeitsstunden melden') + '</h2>' + (code ? '<p>' + (e1 ? '<strong>' + esc(e1.titel) + '</strong> · ' + H.datum(e1.datum) : 'Arbeitseinsatz heute') + ' – danke fürs Mitmachen, ' + esc(m.vorname) + '!</p>' : '<p>Für Arbeit außerhalb eines Einsatztermins, z. B. Rasen mähen oder Steg reparieren.</p>') +
      '<form id="adf" class="form">' + (code ? '' : '<label class="feld">Datum<input name="datum" type="date" required value="' + heute + '" max="' + heute + '"></label>') +
      '<label class="feld">Stunden<input name="stunden" type="number" step="0.5" min="0.5" max="12" required inputmode="decimal" value="' + (e1 && code ? e1.stunden : 2) + '"></label>' +
      '<label class="feld voll">Was hast du gemacht?<input name="taetigkeit" maxlength="120" placeholder="z. B. Steg gestrichen"' + (code ? '' : ' required') + '></label></form><p class="hinweis" id="adf-info" hidden></p>' +
      '<div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="adok">Melden</button></div>');
    $('#adok', el).addEventListener('click', async () => {
      const fm = $('#adf', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm)); const info = $('#adf-info', el);
      try {
        if (DBM) await window.SSV_SB.rpc('mein_arbeitsdienst_melden', { p: { code, stunden: String(x.stunden).replace(',', '.'), taetigkeit: x.taetigkeit, datum: x.datum } });
        else {
          let einsatz = null;
          if (code) {
            const c = (d.arbeitseinsatz_codes || []).find((y) => y.code === code.toUpperCase()); einsatz = c && d.arbeitseinsaetze.find((y) => y.id === c.einsatz_id);
            if (!einsatz) throw new Error('Der Code passt zu keinem Arbeitseinsatz.');
            if (einsatz.datum !== heute && einsatz.datum !== H.tag(new Date(Date.now() - 864e5))) throw new Error('Der Check-in geht nur am Tag des Einsatzes.');
            if (d.arbeitsdienst.some((a) => a.mitglied_id === m.id && a.einsatz_id === einsatz.id && a.status !== 'abgelehnt')) throw new Error('Für diesen Einsatz bist du schon eingetragen.');
          }
          const st = Number(String(x.stunden).replace(',', '.')); if (!(st > 0 && st <= 12)) throw new Error('Bitte zwischen 0,5 und 12 Stunden angeben.');
          d.arbeitsdienst.push({ id: H.uid('AD'), mitglied_id: m.id, datum: einsatz ? einsatz.datum : x.datum, stunden: st, taetigkeit: x.taetigkeit || (einsatz && einsatz.titel) || 'Arbeitseinsatz', status: 'eingereicht', einsatz_id: einsatz ? einsatz.id : null, gemeldet: new Date().toISOString(), geprueft_von: '' });
          await HF.sichern();
        }
        if (DBM) { await HF.neuLaden(); d = HF.d; }
        $('#modal').innerHTML = ''; toast('Danke! Deine Stunden sind gemeldet – der Verein bestätigt sie.'); AUF.arbeitsdienst = true; zeigen();
      } catch (er) { info.textContent = er.message; info.className = 'hinweis warn'; info.hidden = false; }
    });
  }
  const einsatzCode = new URLSearchParams(location.search).get('einsatz');
  if (einsatzCode) { try { history.replaceState(null, '', location.pathname); } catch (e) { /* egal */ } setTimeout(() => stundenDialog(einsatzCode), 300); }

  /* Push-Benachrichtigungen (nur Vereinsdatenbank, wenn der Vorstand sie freigeschaltet hat) */
  const istIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const istApp = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const b64 = (s) => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
  async function pushStand() {
    const box = $('#push-box'); if (!box) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      box.innerHTML = istIOS && !istApp ? '<p style="margin:0">Auf dem iPhone geht das so: unten auf <strong>Teilen</strong> → <strong>Zum Home-Bildschirm</strong>, dann „Mein SSV“ vom Home-Bildschirm öffnen und hier einschalten.</p>' : '<p style="margin:0">Dieser Browser kann leider keine Benachrichtigungen empfangen.</p>';
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration('./'); const sub = reg && await reg.pushManager.getSubscription();
    box.innerHTML = sub && Notification.permission === 'granted' ? '<p style="margin:0 0 8px">Auf diesem Gerät eingeschaltet – wichtige Mitteilungen (z. B. Sturmwarnung) kommen direkt aufs Handy.</p><button class="btn klein" id="push-aus">Ausschalten</button>'
      : Notification.permission === 'denied' ? '<p style="margin:0">Benachrichtigungen sind in den Einstellungen deines Handys für diese Seite gesperrt.</p>'
        : '<p style="margin:0 0 8px">Wichtige Mitteilungen (z. B. Sturmwarnung) direkt aufs Handy bekommen.</p><button class="btn primaer" id="push-an">Benachrichtigungen einschalten</button>';
  }
  async function pushAn() {
    try {
      const reg = await navigator.serviceWorker.register('sw-mein.js', { scope: './' }); await navigator.serviceWorker.ready;
      if (await Notification.requestPermission() !== 'granted') return pushStand();
      const k = await window.SSV_SB.req('/functions/v1/push', { method: 'POST', body: { aktion: 'schluessel' } });
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.public_key) }); const j = sub.toJSON();
      await window.SSV_SB.req('/rest/v1/push_abos?on_conflict=endpoint', { method: 'POST', body: [{ mitglied_id: mid, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, geraet: (istIOS ? 'iOS' : navigator.platform || '').slice(0, 40) }], prefer: 'resolution=merge-duplicates,return=minimal' });
      toast('Benachrichtigungen sind eingeschaltet.');
    } catch (e) { toast('Hat nicht geklappt: ' + e.message); }
    pushStand();
  }
  async function pushAus() {
    try { const reg = await navigator.serviceWorker.getRegistration('./'); const sub = reg && await reg.pushManager.getSubscription();
      if (sub) { await window.SSV_SB.req('/rest/v1/push_abos?endpoint=eq.' + encodeURIComponent(sub.endpoint), { method: 'DELETE' }).catch(() => {}); await sub.unsubscribe(); }
      toast('Benachrichtigungen ausgeschaltet.'); } catch (e) { toast(e.message); }
    pushStand();
  }
  function nachweisDialog() {
    const m = Q.mitglied(mid); const b = Q.booteVon(mid)[0]; if (!b) return;
    const el = modal('<h2>Versicherungsnachweis</h2><p>Lade die aktuelle Police oder Bestätigung deiner Versicherung hoch (PDF oder Foto). Der Verein prüft sie und hakt sie ab.</p><form id="nf" class="form">' +
      '<label class="feld">Versicherung<input name="versicherung" required value="' + esc(b.versicherung || '') + '"></label><label class="feld">versichert bis<input name="vers_bis" type="date" required value="' + esc(b.vers_bis || '') + '"></label>' +
      '<label class="feld voll">Nachweis (PDF oder Foto)<input name="datei" type="file" accept="application/pdf,image/*" required></label></form><p class="hinweis" id="nf-info" hidden></p>' +
      '<div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="nok">Hochladen</button></div>');
    $('#nok', el).addEventListener('click', async () => {
      const fm = $('#nf', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm)); const info = $('#nf-info', el);
      const knopf = $('#nok', el); knopf.disabled = true; knopf.textContent = 'Wird hochgeladen …';
      try {
        const datei = await HF.datei.lesen(fm.datei.files[0]);
        if (DBM) await window.SSV_SB.rpc('mein_nachweis_hochladen', { p: { boot_id: b.id, versicherung: x.versicherung, vers_bis: x.vers_bis, ...datei } });
        else { d.dokumente.push({ id: H.uid('D'), mitglied_id: m.id, boot_id: b.id, art: 'versicherung', hochgeladen: new Date().toISOString(), von: 'Mitglied (Mein SSV)', ...datei }); }
        Object.assign(b, { versicherung: x.versicherung, vers_bis: x.vers_bis, vers_status: 'eingereicht', vers_geprueft_am: null, vers_geprueft_von: null });
        if (!DBM) await HF.sichern();
        $('#modal').innerHTML = ''; toast('Danke – der Nachweis ist eingereicht.'); zeigen();
      } catch (er) { knopf.disabled = false; knopf.textContent = 'Hochladen'; info.textContent = er.message; info.className = 'hinweis warn'; info.hidden = false; }
    });
  }
  function schadenDialog() {
    const m = Q.mitglied(mid);
    const el = modal('<h2>Schaden melden</h2><form id="sf" class="form"><label class="feld voll">Was ist kaputt?<input name="titel" required maxlength="120" placeholder="z. B. Stromsäule Ostbrücke ohne Funktion"></label>' +
      '<label class="feld voll">Wo?<input name="ort" placeholder="z. B. Westbrücke bei Platz 40"></label><label class="feld voll">Beschreibung (optional)<textarea name="beschreibung" rows="3"></textarea></label>' +
      '<label class="feld voll">Foto (optional)<input name="datei" type="file" accept="image/*"></label></form><p class="hinweis" id="sf-info" hidden></p>' +
      '<div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="sok">Melden</button></div>');
    $('#sok', el).addEventListener('click', async () => {
      const fm = $('#sf', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm)); const knopf = $('#sok', el); knopf.disabled = true;
      try {
        const foto = fm.datei.files[0] ? await HF.datei.lesen(fm.datei.files[0]) : null;
        if (DBM) await window.SSV_SB.rpc('schaden_melden', { p: { titel: x.titel, ort: x.ort, beschreibung: x.beschreibung, ...(foto || {}) } });
        else {
          const t = { id: H.uid('T'), titel: x.titel, beschreibung: x.beschreibung, ort: x.ort, platz_id: '', boot_id: null, art: 'schaden', prioritaet: 'normal', status: 'offen', verantwortlich: '', faellig: '', erstellt: new Date().toISOString(), erstellt_von: Q.name(m) + ' (Mein SSV)', erledigt_am: '', notiz: '' };
          d.aufgaben.push(t); if (foto) d.dokumente.push({ id: H.uid('D'), mitglied_id: m.id, aufgabe_id: t.id, art: 'foto', hochgeladen: new Date().toISOString(), von: 'Mitglied (Mein SSV)', ...foto });
          await HF.sichern();
        }
        $('#modal').innerHTML = ''; toast('Danke für die Meldung!');
      } catch (er) { knopf.disabled = false; const i = $('#sf-info', el); i.textContent = er.message; i.className = 'hinweis warn'; i.hidden = false; }
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
    const kg = $('#k-getraenke'); if (kg) { kg.querySelector('strong').textContent = H.geld(u.monat_summe); kg.querySelector('span').textContent = 'Getränke · noch nicht abgerechnet'; }
    $('#info-kasse').textContent = (u.hat_pin ? '' : 'Code fehlt · ') + H.geld(u.monat_summe) + ' im ' + new Date().toLocaleDateString('de-DE', { month: 'long' });
    const bs = u.buchungen.slice(0, 5);
    box.innerHTML = '<div class="kasse-zahlen"><div><small>Verbrauch ' + new Date().toLocaleDateString('de-DE', { month: 'long' }) + '</small><strong>' + H.geld(u.monat_summe) + '</strong></div><div><small>insgesamt noch nicht abgerechnet</small><strong>' + H.geld(u.offen_summe) + '</strong></div></div>' +
      '<p style="margin:0 0 10px;font-size:13px;color:var(--muted)">Der Verbrauch wird am Monatsende abgerechnet und erscheint dann unter „Meine Rechnungen“.</p>' +
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
