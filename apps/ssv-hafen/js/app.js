/* SSV Hafen-Manager – Verwaltungsoberfläche */
(function () {
  'use strict';

  const HF = window.HAFEN, G = window.HAFEN_GEBUEHREN, SEPA = window.HAFEN_SEPA, PLAN = window.HAFEN_PLAN;
  const { H, Q } = HF;
  const esc = H.esc;
  const $ = (s, r = document) => r.querySelector(s);
  let d = HF.laden();
  const heute = H.tag(new Date());

  /* ------------------------------------------------------------ Rollen */
  const ROLLEN = {
    vorstand: { name: 'Vorstand', tabs: '*', bank: true },
    brueckenwart: { name: 'Brückenwartin', tabs: ['uebersicht', 'plan', 'plaetze', 'boote', 'eigner', 'belegung', 'abwesenheiten', 'gaeste', 'warteliste', 'lagern'], bank: false },
    hafenmeister: { name: 'Hafenmeister', tabs: ['uebersicht', 'plan', 'plaetze', 'gaeste', 'abwesenheiten', 'lagern'], bank: false },
    kassenwart: { name: 'Kassenwart', tabs: ['uebersicht', 'plan', 'eigner', 'abrechnung', 'gebuehren', 'arbeitsdienst', 'einstellungen'], bank: true }
  };
  const TABS = [
    ['Hafen', [['uebersicht', 'Übersicht'], ['plan', 'Hafenplan'], ['plaetze', 'Liegeplätze'], ['boote', 'Boote'], ['eigner', 'Eigner & Mitglieder']]],
    ['Betrieb', [['belegung', 'Belegung'], ['abwesenheiten', 'Abwesenheiten'], ['gaeste', 'Gastlieger'], ['warteliste', 'Warteliste'], ['lagern', 'Ein-/Auslagern & Kran'], ['arbeitsdienst', 'Arbeitsdienst']]],
    ['Finanzen', [['abrechnung', 'Abrechnung & Lastschrift'], ['gebuehren', 'Gebührenordnung'], ['einstellungen', 'Einstellungen']]]
  ];
  let rolle = null, tab = 'uebersicht';
  const darf = (t) => rolle && (ROLLEN[rolle].tabs === '*' || ROLLEN[rolle].tabs.includes(t));
  const bankSichtbar = () => rolle && ROLLEN[rolle].bank;

  /* ------------------------------------------------------------ Saison */
  const SAISON = 2026;
  const sd = G.saisonDaten(d, SAISON);
  const imSommer = heute >= sd.auslagern && heute < sd.einlagern;
  let planStand = { modus: 'sommer', datum: imSommer ? heute : '2026-08-15', ansicht: 'gesamt', markiere: null };

  /* ------------------------------------------------------------ Helfer */
  function speichern(meldung) { HF.sichern(); if (meldung) toast(meldung); }
  function toast(t, art) { const el = $('#toast'); el.textContent = t; el.className = 'toast zeigen' + (art ? ' ' + art : ''); clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = 'toast'; }, 3200); }
  function modal(html, breit) {
    const m = $('#modal'); m.innerHTML = '<div class="modal"><div class="modal-karte' + (breit ? ' breit' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    const el = m.firstChild; el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-zu]')) zu(); });
    const f = el.querySelector('input:not([type=hidden]),select,textarea'); if (f) setTimeout(() => f.focus(), 30);
    return el;
  }
  function zu() { $('#modal').innerHTML = ''; }
  function kopf(titel, unter, aktionen) { return '<div class="kopf"><div><h1>' + titel + '</h1>' + (unter ? '<p>' + unter + '</p>' : '') + '</div><div class="aktionen">' + (aktionen || '') + '</div></div>'; }
  const DEMO = '<div class="demo-band"><strong>Demo:</strong> Alle Personen, Boote und Bankdaten sind erfunden. Die Zuordnung der Brücken und die Box-Maße sind Annahmen, bis der Verein sie bestätigt.</div>';
  const iban = (s) => bankSichtbar() ? esc(String(s || '').replace(/(.{4})/g, '$1 ').trim()) : (s ? '•••• ' + esc(String(s).slice(-4)) : '');
  const bootTxt = (b) => b ? '„' + esc(b.name) + '“ · ' + esc(b.typ) : '–';
  const masse = (b) => H.zahl(b.laenge) + ' × ' + H.zahl(b.breite) + ' m';
  const mOpt = (sel, filter = () => true) => d.mitglieder.filter(filter).sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')).map((m) => '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + esc(m.nachname + ', ' + m.vorname) + ' (' + H.ART[m.art] + ')</option>').join('');
  const bOpt = (sel) => d.boote.slice().sort((a, b) => a.name.localeCompare(b.name, 'de')).map((b) => '<option value="' + b.id + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.name) + ' – ' + esc(Q.name(Q.mitglied(b.eigner_id))) + '</option>').join('');
  const versTag = (b) => { const s = Q.versicherungsStatus(b, heute); return s === 'ok' ? '<span class="tag ok">bis ' + H.datum(b.vers_bis) + '</span>' : s === 'bald' ? '<span class="tag warn">läuft ' + H.datum(b.vers_bis) + ' ab</span>' : s === 'fehlt' ? '<span class="tag rot">fehlt</span>' : '<span class="tag rot">abgelaufen ' + H.datum(b.vers_bis) + '</span>'; };
  const platzName = (id) => { const p = Q.platz(id); if (!p) return '–'; return p.bez || ((p.box === 'L' ? 'Längsseits ' : 'Platz ') + p.nr); };
  function download(name, text, typ) {
    const blob = new Blob([text], { type: typ }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const csv = (zeilen) => '﻿' + zeilen.map((z) => z.map((v) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  function oeffnen(url) { if (!window.open(url, '_blank')) location.href = url; }

  /* Freie bzw. verfügbare Wasserplätze für einen Zeitraum (frei oder Eigner unterwegs) */
  function verfuegbarePlaetze(von, naechte, laenge, breite) {
    const tage = []; for (let i = 0; i < naechte; i++) tage.push(H.tag(new Date(new Date(von + 'T12:00:00').getTime() + i * 864e5)));
    return d.liegeplaetze.filter((p) => !p.gesperrt && (!laenge || laenge <= p.max_laenge) && (!breite || breite <= p.max_breite))
      .map((p) => {
        const st = tage.map((t) => Q.statusWasser(p, SAISON, t));
        if (st.every((s) => s === 'frei')) return { p, art: 'frei' };
        if (st.every((s) => s === 'unterwegs' || s === 'frei')) return { p, art: 'unterwegs' };
        return null;
      }).filter(Boolean).sort((a, b) => (a.art === 'frei' ? 0 : 1) - (b.art === 'frei' ? 0 : 1) || a.p.max_laenge - b.p.max_laenge);
  }

  /* ============================================================ Übersicht */
  const V = {};
  V.uebersicht = (main) => {
    const tagX = planStand.datum;
    const st = {}; d.liegeplaetze.forEach((p) => { const s = Q.statusWasser(p, SAISON, tagX); st[s] = (st[s] || 0) + 1; });
    const versProbleme = d.boote.filter((b) => ['abgelaufen', 'bald', 'fehlt'].includes(Q.versicherungsStatus(b, heute)));
    const zuSchwer = d.boote.filter((b) => b.gewicht_t > 10);
    const anfragen = d.gaeste.filter((g) => g.status === 'angemeldet');
    const winterOffen = G.vorschau(d, SAISON, 'winter', heute).filter((x) => !x.schon_abgerechnet && x.summe > 0);
    const offeneRe = d.rechnungen.filter((r) => !r.bezahlt_am && !r.storniert_am);
    const sepaOffen = offeneRe.filter((r) => r.sepa && !r.sepa_lauf);
    const todo = [];
    if (anfragen.length) todo.push(['gaeste', anfragen.length + ' Gast-Anmeldung' + (anfragen.length > 1 ? 'en' : '') + ' per QR-Code warten auf einen Platz', 'gast']);
    if (winterOffen.length && darf('abrechnung')) todo.push(['abrechnung', 'Winterlager ' + SAISON + '/' + String(SAISON + 1).slice(2) + ' ist noch nicht abgerechnet (' + winterOffen.length + ' Mitglieder, ' + H.geld(winterOffen.reduce((s, x) => s + x.summe, 0)) + ')', 'warn']);
    if (sepaOffen.length && darf('abrechnung')) todo.push(['abrechnung', sepaOffen.length + ' Rechnungen warten auf die Lastschrift-Datei für die Bank', 'warn']);
    if (versProbleme.length) todo.push(['boote', versProbleme.length + ' Boote: Versicherungsnachweis abgelaufen, fehlt oder läuft in 30 Tagen ab', 'rot']);
    if (zuSchwer.length) todo.push(['boote', zuSchwer.length + ' Boot über 10 t – laut Hafenbetriebsordnung nicht zulässig', 'rot']);
    const warte = d.warteliste.filter((w) => w.status === 'wartend').length;
    main.innerHTML = kopf('Moin, ' + ROLLEN[rolle].name + '!', 'Saison ' + SAISON + ' · Stand ' + H.datum(heute), darf('plan') ? '<button class="btn dunkel" data-gehe="plan">Hafenplan öffnen</button>' : '') + DEMO +
      (!imSommer ? '<p class="hinweis">Gerade ist Winterpause (Einlagern war am ' + H.datum(sd.einlagern) + '). Die Sommerzahlen zeigen den Beispieltag ' + H.datum(tagX) + '.</p>' : '') +
      '<div class="karten">' +
      '<div class="kz"><small>Liegeplätze belegt</small><strong>' + ((st.belegt || 0) + (st.unterwegs || 0) + (st.saisongast || 0)) + ' / ' + d.liegeplaetze.length + '</strong><span>' + (st.frei || 0) + ' frei · ' + (st.gesperrt || 0) + ' gesperrt</span></div>' +
      '<div class="kz"><small>Eigner unterwegs</small><strong style="color:var(--gruen)">' + (st.unterwegs || 0) + '</strong><span>grünes Schild am ' + H.kurz(tagX) + '</span></div>' +
      '<div class="kz"><small>Gastlieger</small><strong style="color:var(--gast)">' + (st.gast || 0) + '</strong><span>am ' + H.kurz(tagX) + ' · ' + anfragen.length + ' Anfragen</span></div>' +
      '<div class="kz"><small>Winterlager</small><strong>' + Q.belegungen(SAISON, 'winter').length + '</strong><span>Boote an Land</span></div>' +
      '<div class="kz"><small>Warteliste</small><strong>' + warte + '</strong><span>Mitglieder warten</span></div>' +
      (darf('abrechnung') ? '<div class="kz"><small>Offene Rechnungen</small><strong>' + H.geld(offeneRe.reduce((s, r) => s + r.summe, 0)) + '</strong><span>' + offeneRe.length + ' Rechnungen</span></div>' : '') +
      '</div><div class="panel"><h2>Zu tun</h2>' + (todo.length ? '<table class="tab"><tbody>' + todo.map(([t, txt, art]) =>
        '<tr class="klickbar" data-gehe="' + t + '"><td><span class="tag ' + art + '">' + (art === 'rot' ? 'wichtig' : art === 'gast' ? 'Gäste' : 'offen') + '</span></td><td>' + txt + '</td><td class="r">' + (darf(t) ? '→' : '') + '</td></tr>').join('') + '</tbody></table>' : '<p class="leer">Alles erledigt.</p>') + '</div>';
  };

  /* ============================================================ Hafenplan */
  V.plan = (main) => {
    const legende = planStand.modus === 'sommer'
      ? '<span><i style="background:#24396f"></i>belegt</span><span><i style="background:var(--gruen)"></i>Eigner unterwegs (grünes Schild)</span><span><i style="background:var(--gast)"></i>Gastlieger</span><span><i style="background:var(--lila)"></i>Saison-Gast</span><span><i style="background:#fff"></i>frei</span><span><i style="background:repeating-linear-gradient(45deg,#fff 0 2px,#8890a8 2px 4px)"></i>gesperrt</span><span><i style="background:#4a5a86"></i>an Land belegt</span>'
      : '<span><i style="background:#4a5a86"></i>Palette/Halle/Außen belegt</span><span><i style="background:#fff"></i>frei</span><span><i style="background:rgba(255,255,255,.55)"></i>Wasserplatz (Winterpause)</span>';
    main.innerHTML = kopf('Hafenplan', planStand.modus === 'sommer' ? 'Sommer ' + SAISON + ' · Stand am ' + H.datum(planStand.datum) : 'Winterlager ' + SAISON + '/' + String(SAISON + 1).slice(2),
      '<a class="btn" href="https://www.google.com/maps/search/?api=1&query=53.91139%2C10.70111" target="_blank" rel="noopener">Google Maps</a><a class="btn" href="https://maps.apple.com/?ll=53.91139,10.70111&q=Schwartauer%20Segler-Verein&z=17" target="_blank" rel="noopener">Apple Karten</a>') +
      '<div class="plan-layout"><div class="plan-box"><div class="plan-leiste">' +
      '<button class="btn klein' + (planStand.modus === 'sommer' ? ' aktiv' : '') + '" data-modus="sommer">Sommer (Wasser)</button><button class="btn klein' + (planStand.modus === 'winter' ? ' aktiv' : '') + '" data-modus="winter">Winter (Land)</button>' +
      (planStand.modus === 'sommer' ? '<input type="date" id="plan-datum" value="' + planStand.datum + '" min="' + sd.auslagern + '" max="' + sd.einlagern + '" aria-label="Stichtag">' : '') +
      '<span class="trenn"></span>' + [['gesamt', 'Gesamt'], ['ost', 'Ost'], ['west', 'West'], ['schwimm', 'Schwimm'], ['land', 'Land']].map(([k, n]) =>
        '<button class="btn klein' + (planStand.ansicht === k ? ' aktiv' : '') + '" data-ansicht="' + k + '">' + n + '</button>').join('') +
      '</div><div class="plan-flaeche" id="plan"></div><div class="legende">' + legende + '</div></div><aside class="detail" id="detail"></aside></div>' +
      '<p class="hinweis" style="margin-top:12px">Schematischer Plan nach Luftbild. Zuordnung und Nummerierung der Brücken sind eine <strong>Annahme</strong>, bis der Verein den echten Liegeplatzplan liefert. Tippe auf einen Platz für Details; mit „Ost / West / Schwimm“ zoomst du heran und siehst die Platznummern.</p>';
    const svg = PLAN.zeichnen($('#plan'), { modus: planStand.modus, saison: SAISON, datum: planStand.datum, ansicht: planStand.ansicht, markiere: planStand.markiere, onKlick: (id) => { planStand.markiere = id; detail(id); markieren(id); } });
    function markieren(id) { svg.querySelectorAll('.markiert').forEach((x) => x.classList.remove('markiert')); const g = svg.querySelector('[data-platz="' + id + '"]'); if (g) g.classList.add('markiert'); }
    main.querySelectorAll('[data-ansicht]').forEach((b) => b.addEventListener('click', () => {
      planStand.ansicht = b.dataset.ansicht; PLAN.zoomen(svg, planStand.ansicht);
      main.querySelectorAll('[data-ansicht]').forEach((x) => x.classList.toggle('aktiv', x === b));
    }));
    main.querySelectorAll('[data-modus]').forEach((b) => b.addEventListener('click', () => { planStand.modus = b.dataset.modus; planStand.markiere = null; if (planStand.modus === 'winter' && planStand.ansicht === 'gesamt') planStand.ansicht = 'land'; zeige('plan'); }));
    const dat = $('#plan-datum'); if (dat) dat.addEventListener('change', () => { planStand.datum = dat.value || planStand.datum; zeige('plan'); });
    if (planStand.markiere) detail(planStand.markiere); else detailLeer();
  };

  function detailLeer() {
    const el = $('#detail'); if (!el) return;
    if (planStand.modus === 'winter') {
      const bel = Q.belegungen(SAISON, 'winter');
      const zaehl = (art) => d.landplaetze.filter((p) => p.art === art).map((p) => (bel.some((x) => x.platz_id === p.id) ? 1 : 0)).reduce((s, x) => s + x, 0);
      const anz = (art) => d.landplaetze.filter((p) => p.art === art).length;
      el.innerHTML = '<h2>Winterlager</h2><p class="unter">' + SAISON + '/' + String(SAISON + 1).slice(2) + ' · Einlagern war am ' + H.datum(sd.einlagern) + '</p><dl>' +
        '<dt>Paletten</dt><dd>' + zaehl('palette') + ' von ' + anz('palette') + ' belegt</dd><dt>Halle</dt><dd>' + zaehl('halle') + ' von ' + anz('halle') + ' belegt</dd><dt>Außenlager</dt><dd>' + zaehl('aussen') + ' von ' + anz('aussen') + ' belegt</dd>' +
        '<dt>Gesamt</dt><dd><strong>' + bel.length + ' Boote an Land</strong></dd></dl>' + (darf('lagern') ? '<div class="aktionen"><button class="btn" data-gehe="lagern">Belegungsplan</button></div>' : '');
      return;
    }
    const tagX = planStand.datum;
    const gruen = d.liegeplaetze.filter((p) => Q.statusWasser(p, SAISON, tagX) === 'unterwegs');
    const frei = d.liegeplaetze.filter((p) => Q.statusWasser(p, SAISON, tagX) === 'frei');
    el.innerHTML = '<h2>Für Gäste frei</h2><p class="unter">am ' + H.datum(tagX) + ' – freie Plätze und Plätze mit grünem Schild</p>' +
      '<dl>' + frei.map((p) => '<dt><span class="tag">frei</span></dt><dd><a href="#" data-platz-link="' + p.id + '">' + platzName(p.id) + '</a> · Box ' + p.box + ' · bis ' + H.zahl(p.max_laenge, 1) + ' m</dd>').join('') +
      gruen.map((p) => { const a = Q.abwesendAm(p.id, tagX); return '<dt><span class="tag gruen">grün</span></dt><dd><a href="#" data-platz-link="' + p.id + '">' + platzName(p.id) + '</a> · bis ' + H.kurz(a.bis) + '</dd>'; }).join('') + '</dl>' +
      (darf('gaeste') && planStand.modus === 'sommer' ? '<div class="aktionen"><button class="btn primaer" data-neuer-gast>+ Gastlieger einweisen</button></div>' : '');
    el.querySelectorAll('[data-platz-link]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); planStand.markiere = a.dataset.platzLink; zeige('plan'); }));
    const ng = el.querySelector('[data-neuer-gast]'); if (ng) ng.addEventListener('click', () => gastForm({}));
  }

  function detail(id) {
    const el = $('#detail'); const p = Q.platz(id); if (!p || !el) return;
    const tagX = planStand.datum;
    if (p.bez) {
      // Landplatz
      const per = planStand.modus === 'winter' ? 'winter' : 'sommer';
      const bel = Q.belegungPlatz(SAISON, per, id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
      el.innerHTML = '<h2>' + esc(p.bez) + '</h2><p class="unter">' + ({ palette: 'Schiffspalette', halle: 'Hallenplatz', aussen: 'Außenlager' })[p.art] + ' · ' + (per === 'winter' ? 'Winter ' + SAISON + '/' + String(SAISON + 1).slice(2) : 'Sommer ' + SAISON) + '</p>' +
        (b ? '<dl><dt>Boot</dt><dd>' + bootTxt(b) + '</dd><dt>Maße</dt><dd>' + masse(b) + ' · ' + H.zahl(b.gewicht_t, 1) + ' t</dd><dt>Eigner</dt><dd>' + esc(Q.name(m)) + '</dd>' +
          (p.art !== 'palette' ? '<dt>Fläche</dt><dd>' + G.flaeche(d, bel, b) + ' m²</dd>' : '') + (bel.nicht_kranen ? '<dt>Hinweis</dt><dd><span class="tag warn">nicht kranen</span></dd>' : '') + '</dl>' : '<p class="leer">Frei.</p>') +
        (darf('belegung') ? '<div class="aktionen"><button class="btn" data-gehe-bel>Belegung bearbeiten</button></div>' : '');
      const gb = el.querySelector('[data-gehe-bel]'); if (gb) gb.addEventListener('click', () => { belegungStand.periode = per; zeige('belegung'); });
      return;
    }
    const status = planStand.modus === 'winter' ? 'Winterpause' : PLAN.STATUS_TEXT[Q.statusWasser(p, SAISON, tagX)];
    const bel = Q.belegungPlatz(SAISON, 'sommer', id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
    const aw = Q.abwesendAm(id, tagX); const gast = Q.gastAm(id, tagX);
    const kommende = d.abwesenheiten.filter((a) => a.platz_id === id && a.bis >= tagX).sort((a, x) => a.von.localeCompare(x.von));
    const probleme = b ? Q.passt(b, p) : [];
    el.innerHTML = '<h2>' + (p.box === 'L' ? 'Längsseits ' : 'Platz ') + esc(p.nr) + '</h2><p class="unter">' + H.BRUECKE[p.bruecke] + ' · ' + (p.box === 'L' ? 'Sondertarif' : 'Box ' + p.box) + ' · max. ' + H.zahl(p.max_laenge, 1) + ' × ' + H.zahl(p.max_breite, 1) + ' m' + (p.strom ? ' · Strom' : '') + '</p>' +
      '<p><span class="tag ' + ({ belegt: '', unterwegs: 'gruen', gast: 'gast', saisongast: 'lila', frei: 'ok', gesperrt: 'rot' })[Q.statusWasser(p, SAISON, tagX)] + '">' + esc(status) + '</span></p>' +
      (p.gesperrt ? '<p class="hinweis warn">' + esc(p.notiz || 'Gesperrt') + '</p>' : '') +
      (b ? '<dl><dt>Boot</dt><dd>' + bootTxt(b) + '</dd><dt>Maße</dt><dd>' + masse(b) + ' · Tiefgang ' + H.zahl(b.tiefgang) + ' m</dd><dt>Gewicht</dt><dd>' + H.zahl(b.gewicht_t, 1) + ' t' + (b.gewicht_t > 10 ? ' <span class="tag rot">über 10 t</span>' : '') + '</dd>' +
        '<dt>Versicherung</dt><dd>' + versTag(b) + '</dd><dt>Eigner</dt><dd>' + esc(Q.name(m)) + ' <span class="tag">' + H.ART[m.art] + '</span></dd><dt>Telefon</dt><dd><a href="tel:' + esc(m.tel.replace(/\s/g, '')) + '">' + esc(m.tel) + '</a></dd></dl>' +
        (probleme.length ? '<p class="hinweis warn" style="margin-top:10px">Passt nicht: ' + probleme.map(esc).join(', ') + '</p>' : '') : '<p class="leer">Kein Dauerlieger in dieser Saison.</p>') +
      (gast ? '<div class="abschnitt"><h3>Gastlieger</h3><dl><dt>Boot</dt><dd>„' + esc(gast.bootsname) + '“ · ' + H.zahl(gast.laenge, 1) + ' m</dd><dt>Skipper</dt><dd>' + esc(gast.skipper) + (gast.herkunft ? ' · ' + esc(gast.herkunft) : '') + '</dd><dt>Zeitraum</dt><dd>' + H.kurz(gast.ankunft) + ', ' + gast.naechte + ' Nacht' + (gast.naechte > 1 ? 'e' : '') + '</dd><dt>Bezahlt</dt><dd>' + (gast.zahlung === 'offen' ? '<span class="tag warn">offen</span>' : esc(gast.zahlung)) + '</dd></dl></div>' : '') +
      (kommende.length ? '<div class="abschnitt"><h3>Abwesenheiten (grünes Schild)</h3><dl>' + kommende.map((a) => '<dt>' + H.kurz(a.von) + '–' + H.kurz(a.bis) + '</dt><dd>' + esc(a.notiz || '') + (a === aw ? ' <span class="tag gruen">jetzt</span>' : '') + '</dd>').join('') + '</dl></div>' : '') +
      '<div class="aktionen">' +
      (b && darf('abwesenheiten') ? '<button class="btn gruen" data-aw>Abwesenheit eintragen</button>' : '') +
      (darf('gaeste') && planStand.modus === 'sommer' && !gast && !p.gesperrt && (!bel || aw) ? '<button class="btn primaer" data-gast>Gast einweisen</button>' : '') +
      (darf('belegung') ? '<button class="btn" data-sperre>' + (p.gesperrt ? 'Sperre aufheben' : 'Sperren') + '</button>' : '') +
      (b && darf('boote') ? '<button class="btn" data-boot>Boot</button>' : '') + '</div>';
    const on = (s, f) => { const x = el.querySelector(s); if (x) x.addEventListener('click', f); };
    on('[data-aw]', () => abwesenheitForm({ boot_id: b.id }));
    on('[data-gast]', () => gastForm({ platz_id: id, ankunft: tagX }));
    on('[data-boot]', () => bootForm(b));
    on('[data-sperre]', () => {
      if (!p.gesperrt) { const grund = prompt('Grund der Sperre (z. B. Dalben defekt):', ''); if (grund === null) return; p.notiz = grund; }
      p.gesperrt = !p.gesperrt; speichern(p.gesperrt ? 'Platz gesperrt.' : 'Sperre aufgehoben.'); zeige('plan');
    });
  }

  /* ============================================================ Liegeplätze */
  V.plaetze = (main) => {
    const tagX = planStand.datum;
    main.innerHTML = kopf('Liegeplätze', d.liegeplaetze.length + ' Wasserplätze · ' + d.landplaetze.length + ' Landplätze', '<button class="btn" id="csv">CSV</button>') +
      '<div class="filter"><input class="suche" id="such" placeholder="Platz, Boot oder Eigner …"><select class="suche" id="br" style="min-width:0"><option value="">Alle Brücken</option>' + Object.entries(H.BRUECKE).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
      '<div class="panel"><table class="tab"><thead><tr><th>Platz</th><th>Brücke</th><th>Box</th><th class="r">max. L × B</th><th>Boot</th><th>Eigner</th><th>Status ' + H.kurz(tagX) + '</th></tr></thead><tbody id="tb"></tbody></table></div>';
    const render = () => {
      const f = $('#such').value.toLowerCase(), br = $('#br').value;
      $('#tb').innerHTML = d.liegeplaetze.filter((p) => !br || p.bruecke === br).map((p) => {
        const bel = Q.belegungPlatz(SAISON, 'sommer', p.id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
        const s = Q.statusWasser(p, SAISON, tagX);
        const txt = (p.nr + ' ' + (b ? b.name : '') + ' ' + (m ? Q.name(m) : '')).toLowerCase();
        if (f && !txt.includes(f)) return '';
        return '<tr class="klickbar" data-p="' + p.id + '"><td><strong>' + esc(p.nr) + '</strong></td><td>' + H.BRUECKE[p.bruecke] + '</td><td>' + (p.box === 'L' ? 'Sonder' : p.box) + '</td><td class="r">' + H.zahl(p.max_laenge, 1) + ' × ' + H.zahl(p.max_breite, 1) + '</td>' +
          '<td>' + (b ? esc(b.name) + (Q.passt(b, p).length ? ' <span class="tag warn">passt nicht</span>' : '') : '') + '</td><td>' + (m ? esc(Q.name(m)) : '') + '</td><td><span class="tag ' + ({ unterwegs: 'gruen', gast: 'gast', saisongast: 'lila', frei: 'ok', gesperrt: 'rot' })[s] + '">' + PLAN.STATUS_TEXT[s].replace(' – grünes Schild', '') + '</span></td></tr>';
      }).join('');
    };
    render(); $('#such').addEventListener('input', render); $('#br').addEventListener('change', render);
    $('#tb').addEventListener('click', (e) => { const r = e.target.closest('[data-p]'); if (r) { planStand.markiere = r.dataset.p; zeige('plan'); } });
    $('#csv').addEventListener('click', () => download('liegeplaetze.csv', csv([['Platz', 'Brücke', 'Box', 'max. Länge', 'max. Breite', 'Strom', 'Boot', 'Eigner', 'Mitgliedsart']].concat(d.liegeplaetze.map((p) => {
      const bel = Q.belegungPlatz(SAISON, 'sommer', p.id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
      return [p.nr, H.BRUECKE[p.bruecke], p.box, H.zahl(p.max_laenge, 1), H.zahl(p.max_breite, 1), p.strom ? 'ja' : 'nein', b ? b.name : '', m ? Q.name(m) : '', m ? H.ART[m.art] : ''];
    }))), 'text/csv'));
  };

  /* ============================================================ Boote */
  V.boote = (main) => {
    main.innerHTML = kopf('Boote', d.boote.length + ' Boote im Verein', '<button class="btn primaer" id="neu">+ Boot anmelden</button>') +
      '<div class="filter"><input class="suche" id="such" placeholder="Name, Typ, Segelnummer, Eigner …"><label class="feld check"><input type="checkbox" id="probl"> nur mit Handlungsbedarf</label></div>' +
      '<div class="panel"><table class="tab"><thead><tr><th>Boot</th><th>Typ</th><th class="r">L × B</th><th class="r">Gewicht</th><th>Eigner</th><th>Platz Sommer</th><th>Versicherung</th></tr></thead><tbody id="tb"></tbody></table></div>';
    const render = () => {
      const f = $('#such').value.toLowerCase(), nurP = $('#probl').checked;
      $('#tb').innerHTML = d.boote.slice().sort((a, b) => a.name.localeCompare(b.name, 'de')).map((b) => {
        const m = Q.mitglied(b.eigner_id); const bel = Q.belegungBoot(SAISON, 'sommer', b.id);
        const vs = Q.versicherungsStatus(b, heute); const probl = vs !== 'ok' || b.gewicht_t > 10 || (bel && bel.platz_typ === 'wasser' && Q.passt(b, Q.platz(bel.platz_id)).length);
        if (nurP && !probl) return '';
        if (f && !(b.name + ' ' + b.typ + ' ' + b.segelnr + ' ' + Q.name(m)).toLowerCase().includes(f)) return '';
        return '<tr class="klickbar" data-b="' + b.id + '"><td><strong>' + esc(b.name) + '</strong><br><small style="color:var(--muted)">' + esc(b.segelnr) + '</small></td><td>' + esc(b.typ) + '</td><td class="r">' + masse(b) + '</td>' +
          '<td class="r">' + H.zahl(b.gewicht_t, 1) + ' t' + (b.gewicht_t > 10 ? ' <span class="tag rot">!</span>' : '') + '</td><td>' + esc(Q.name(m)) + '</td><td>' + (bel ? platzName(bel.platz_id) : '–') + '</td><td>' + versTag(b) + '</td></tr>';
      }).join('');
    };
    render(); $('#such').addEventListener('input', render); $('#probl').addEventListener('change', render);
    $('#tb').addEventListener('click', (e) => { const r = e.target.closest('[data-b]'); if (r) bootForm(Q.boot(r.dataset.b)); });
    $('#neu').addEventListener('click', () => bootForm({}));
  };
  function bootForm(b) {
    const neu = !b.id;
    const el = modal('<h2>' + (neu ? 'Boot anmelden' : '„' + esc(b.name) + '“') + '</h2><p class="hinweis">Laut Hafenbetriebsordnung muss jedes Boot vor dem Einbringen angemeldet werden und versichert sein (Personen-, Sach- und Umweltschäden, Bergung). Grenze für Steg und Kran: 10 t.</p><form id="f" class="form">' +
      '<label class="feld">Bootsname<input name="name" required value="' + esc(b.name || '') + '"></label>' +
      '<label class="feld">Typ<input name="typ" value="' + esc(b.typ || '') + '" placeholder="z. B. Dehler 34"></label>' +
      '<label class="feld voll">Eigner<select name="eigner_id" required><option value="">bitte wählen</option>' + mOpt(b.eigner_id) + '</select></label>' +
      '<label class="feld">Länge (m)<input name="laenge" type="number" step="0.01" min="1" required value="' + (b.laenge || '') + '"></label>' +
      '<label class="feld">Breite (m)<input name="breite" type="number" step="0.01" min="0.5" required value="' + (b.breite || '') + '"></label>' +
      '<label class="feld">Tiefgang (m)<input name="tiefgang" type="number" step="0.01" value="' + (b.tiefgang || '') + '"></label>' +
      '<label class="feld">Gewicht (t)<input name="gewicht_t" type="number" step="0.1" required value="' + (b.gewicht_t || '') + '"><small>inkl. Ausrüstung – max. 10 t</small></label>' +
      '<label class="feld">Segelnummer / Kennzeichen<input name="segelnr" value="' + esc(b.segelnr || '') + '"></label>' +
      '<label class="feld">Versicherung<input name="versicherung" value="' + esc(b.versicherung || '') + '"></label>' +
      '<label class="feld">Versichert bis<input name="vers_bis" type="date" value="' + esc(b.vers_bis || '') + '"></label>' +
      '<label class="feld voll">Notiz<input name="notiz" value="' + esc(b.notiz || '') + '"></label></form>' +
      '<div class="modal-fuss">' + (neu ? '' : '<button class="btn gefahr links" id="weg">Abmelden</button>') + '<button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    $('#ok', el).addEventListener('click', () => {
      const f = $('#f', el); if (!f.reportValidity()) return;
      const x = Object.fromEntries(new FormData(f)); ['laenge', 'breite', 'tiefgang', 'gewicht_t'].forEach((k) => { x[k] = Number(x[k]) || 0; });
      if (x.gewicht_t > 10 && !confirm('Das Boot wiegt mehr als 10 t. Laut Hafenbetriebsordnung ist das für Steg und Kran nicht zulässig. Trotzdem speichern?')) return;
      if (neu) d.boote.push({ id: H.uid('B'), ...x }); else Object.assign(b, x);
      speichern('Boot gespeichert.'); zu(); zeige(tab);
    });
    if (!neu) $('#weg', el).addEventListener('click', () => {
      if (d.belegungen.some((x) => x.boot_id === b.id)) return toast('Das Boot ist noch einem Platz zugeordnet – erst die Belegung lösen.', 'fehler');
      if (!confirm('„' + b.name + '“ abmelden (z. B. nach Verkauf)?')) return;
      d.boote = d.boote.filter((x) => x.id !== b.id); speichern('Boot abgemeldet.'); zu(); zeige(tab);
    });
  }

  /* ============================================================ Eigner & Mitglieder */
  V.eigner = (main) => {
    main.innerHTML = kopf('Eigner & Mitglieder', d.mitglieder.length + ' Personen mit Boot oder Platzwunsch', '<button class="btn" id="import">CSV-Import</button><button class="btn primaer" id="neu">+ Person</button>') +
      (bankSichtbar() ? '' : '<p class="hinweis">Bankdaten sind für deine Rolle ausgeblendet.</p>') +
      '<div class="filter"><input class="suche" id="such" placeholder="Name, Nr., Ort …"></div>' +
      '<div class="panel"><table class="tab"><thead><tr><th>Nr.</th><th>Name</th><th>Art</th><th>Boot(e)</th><th>Telefon</th><th>Kfz</th><th>Lastschrift</th></tr></thead><tbody id="tb"></tbody></table></div>';
    const render = () => {
      const f = $('#such').value.toLowerCase();
      $('#tb').innerHTML = d.mitglieder.slice().sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')).filter((m) => !f || (m.nr + ' ' + Q.name(m) + ' ' + m.ort).toLowerCase().includes(f)).map((m) =>
        '<tr class="klickbar" data-m="' + m.id + '"><td>' + esc(m.nr) + '</td><td><strong>' + esc(m.nachname) + '</strong>, ' + esc(m.vorname) + '</td><td><span class="tag">' + H.ART[m.art] + '</span></td>' +
        '<td>' + Q.booteVon(m.id).map((b) => esc(b.name)).join(', ') + '</td><td>' + esc(m.tel) + '</td><td>' + esc(m.kfz || '') + '</td>' +
        '<td>' + (m.iban && m.mandat_ref ? '<span class="tag ok">Mandat ' + esc(m.mandat_ref) + '</span>' : '<span class="tag warn">kein Mandat</span>') + '</td></tr>').join('');
    };
    render(); $('#such').addEventListener('input', render);
    $('#tb').addEventListener('click', (e) => { const r = e.target.closest('[data-m]'); if (r) mitgliedForm(Q.mitglied(r.dataset.m)); });
    $('#neu').addEventListener('click', () => mitgliedForm({ art: 'ausuebend' }));
    $('#import').addEventListener('click', () => toast('CSV-Import (z. B. Mitgliederliste aus Excel) ist vorbereitet – Spalten wie in der Getränkekasse, plus IBAN und Mandat.'));
  };
  function mitgliedForm(m) {
    const neu = !m.id; const bank = bankSichtbar();
    const el = modal('<h2>' + (neu ? 'Neue Person' : esc(Q.name(m))) + '</h2><form id="f" class="form">' +
      '<label class="feld">Vorname<input name="vorname" required value="' + esc(m.vorname || '') + '"></label><label class="feld">Nachname<input name="nachname" required value="' + esc(m.nachname || '') + '"></label>' +
      '<label class="feld">Mitglieds-/Kundennr.<input name="nr" value="' + esc(m.nr || '') + '"></label>' +
      '<label class="feld">Art<select name="art">' + Object.entries(H.ART).map(([k, v]) => '<option value="' + k + '"' + (m.art === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><small>bestimmt die Liegeplatzgebühr</small></label>' +
      '<label class="feld">E-Mail<input name="email" type="email" value="' + esc(m.email || '') + '"></label><label class="feld">Telefon<input name="tel" value="' + esc(m.tel || '') + '"></label>' +
      '<label class="feld voll">Straße<input name="strasse" value="' + esc(m.strasse || '') + '"></label><label class="feld">PLZ<input name="plz" value="' + esc(m.plz || '') + '"></label><label class="feld">Ort<input name="ort" value="' + esc(m.ort || '') + '"></label>' +
      '<label class="feld">Kfz-Kennzeichen<input name="kfz" value="' + esc(m.kfz || '') + '"><small>laut Hafenbetriebsordnung empfohlen</small></label><span></span>' +
      (bank ? '<label class="feld voll">IBAN<input name="iban" value="' + esc(m.iban || '') + '" placeholder="DE…"></label><label class="feld">BIC (optional)<input name="bic" value="' + esc(m.bic || '') + '"></label><label class="feld">Kontoinhaber<input name="kontoinhaber" value="' + esc(m.kontoinhaber || '') + '"></label>' +
        '<label class="feld">Mandatsreferenz<input name="mandat_ref" value="' + esc(m.mandat_ref || '') + '"></label><label class="feld">Mandat unterschrieben am<input name="mandat_datum" type="date" value="' + esc(m.mandat_datum || '') + '"></label>' : '<p class="hinweis voll">Bankdaten: ' + (m.iban ? iban(m.iban) : 'keine') + ' – nur Kassenwart und Vorstand können sie ändern.</p>') +
      '</form><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    $('#ok', el).addEventListener('click', () => {
      const f = $('#f', el); if (!f.reportValidity()) return;
      const x = Object.fromEntries(new FormData(f));
      if (bank && x.iban && !SEPA.ibanGueltig(x.iban)) return toast('Die IBAN ist ungültig (Prüfziffer stimmt nicht).', 'fehler');
      if (bank && x.iban) x.iban = x.iban.replace(/\s/g, '').toUpperCase();
      if (neu) d.mitglieder.push({ id: H.uid('M'), notiz: '', ...x }); else Object.assign(m, x);
      speichern('Gespeichert.'); zu(); zeige(tab);
    });
  }

  /* ============================================================ Belegung */
  const belegungStand = { periode: imSommer ? 'sommer' : 'winter' };
  V.belegung = (main) => {
    const per = belegungStand.periode;
    const plaetze = per === 'sommer' ? d.liegeplaetze.concat(d.landplaetze) : d.landplaetze;
    const ohne = d.boote.filter((b) => !Q.belegungBoot(SAISON, per, b.id));
    main.innerHTML = kopf('Belegung', (per === 'sommer' ? 'Sommer ' + SAISON + ': Wasserliegeplätze (und Boote, die an Land bleiben)' : 'Winter ' + SAISON + '/' + String(SAISON + 1).slice(2) + ': Paletten, Halle, Außenlager'),
      '<button class="btn' + (per === 'sommer' ? ' aktiv' : '') + '" data-per="sommer">Sommer</button><button class="btn' + (per === 'winter' ? ' aktiv' : '') + '" data-per="winter">Winter</button>') +
      (ohne.length ? '<p class="hinweis warn">' + ohne.length + ' Boote haben in dieser Periode noch keinen Platz: ' + ohne.slice(0, 8).map((b) => esc(b.name)).join(', ') + (ohne.length > 8 ? ' …' : '') + '</p>' : '') +
      '<div class="panel"><table class="tab"><thead><tr><th>Platz</th><th>Art</th><th>Boot</th><th>Eigner</th><th class="r">' + (per === 'winter' ? 'Fläche' : 'Box') + '</th><th>Hinweis</th><th></th></tr></thead><tbody>' +
      plaetze.map((p) => {
        const bel = Q.belegungPlatz(SAISON, per, p.id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
        if (p.bez && per === 'sommer' && !bel) return '';
        const prob = b && !p.bez ? Q.passt(b, p) : (b && b.gewicht_t > 10 ? ['über 10 t'] : []);
        return '<tr' + (p.gesperrt ? ' class="blass"' : '') + '><td><strong>' + esc(platzName(p.id)) + '</strong></td><td>' + (p.bez ? ({ palette: 'Palette', halle: 'Halle', aussen: 'Außen' })[p.art] : H.BRUECKE[p.bruecke]) + '</td>' +
          '<td>' + (b ? esc(b.name) + ' <small style="color:var(--muted)">' + masse(b) + '</small>' : (p.gesperrt ? '<span class="tag rot">gesperrt</span>' : '<span class="leer">frei</span>')) + '</td><td>' + (m ? esc(Q.name(m)) + ' <span class="tag">' + H.ART[m.art] + '</span>' : '') + '</td>' +
          '<td class="r">' + (p.bez ? (b && p.art !== 'palette' ? G.flaeche(d, bel, b) + ' m²' : '') : p.box) + '</td><td>' + (prob.length ? '<span class="tag warn">' + prob.map(esc).join(', ') + '</span>' : '') + (bel && bel.art === 'saisongast' ? ' <span class="tag lila">Saison-Gast</span>' : '') + (bel && bel.nicht_kranen ? ' <span class="tag warn">nicht kranen</span>' : '') + '</td>' +
          '<td class="r">' + (p.gesperrt ? '' : '<button class="btn klein" data-zuweisen="' + p.id + '">' + (b ? 'Ändern' : 'Zuweisen') + '</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (per === 'sommer' ? '<div class="panel"><h2>Nächste Saison vorbereiten</h2><p class="hinweis">Übernimmt alle Sommer-Belegungen von ' + SAISON + ' nach ' + (SAISON + 1) + ' – danach nur noch Änderungen eintragen.</p><button class="btn" id="uebernehmen">Belegung nach ' + (SAISON + 1) + ' übernehmen</button></div>' : '');
    main.querySelectorAll('[data-per]').forEach((b) => b.addEventListener('click', () => { belegungStand.periode = b.dataset.per; zeige('belegung'); }));
    main.querySelectorAll('[data-zuweisen]').forEach((b) => b.addEventListener('click', () => zuweisenForm(b.dataset.zuweisen, per)));
    const u = $('#uebernehmen'); if (u) u.addEventListener('click', () => {
      const schon = d.belegungen.some((x) => x.saison === SAISON + 1 && x.periode === 'sommer');
      if (schon) return toast('Für ' + (SAISON + 1) + ' gibt es schon Belegungen.', 'fehler');
      d.belegungen.filter((x) => x.saison === SAISON && x.periode === 'sommer').forEach((x) => d.belegungen.push({ ...x, id: H.uid('BL'), saison: SAISON + 1, sommer_an_land_jahr: x.platz_typ === 'land' ? (x.sommer_an_land_jahr || 1) + 1 : undefined }));
      speichern('Belegung für ' + (SAISON + 1) + ' angelegt.');
    });
  };
  function zuweisenForm(platzId, per) {
    const p = Q.platz(platzId); const bel = Q.belegungPlatz(SAISON, per, platzId);
    const el = modal('<h2>' + esc(platzName(platzId)) + ' – ' + (per === 'sommer' ? 'Sommer ' + SAISON : 'Winter ' + SAISON + '/' + String(SAISON + 1).slice(2)) + '</h2>' +
      (p.bez ? '' : '<p class="hinweis">Box ' + p.box + ' · max. ' + H.zahl(p.max_laenge, 1) + ' × ' + H.zahl(p.max_breite, 1) + ' m</p>') +
      '<form id="f" class="form"><label class="feld voll">Boot<select name="boot_id"><option value="">– Platz frei –</option>' + bOpt(bel && bel.boot_id) + '</select></label>' +
      (p.bez ? (p.art !== 'palette' ? '<label class="feld">Fläche (m²)<input name="flaeche_m2" type="number" min="1" value="' + (bel && bel.flaeche_m2 || '') + '" placeholder="automatisch L × B"></label>' : '') +
        '<label class="feld check"><input type="checkbox" name="nicht_kranen"' + (bel && bel.nicht_kranen ? ' checked' : '') + '> beim Auslagern nicht kranen</label>' +
        (per === 'sommer' ? '<label class="feld">Wievielter Sommer an Land?<input name="sommer_an_land_jahr" type="number" min="1" value="' + (bel && bel.sommer_an_land_jahr || 1) + '"><small>ab dem 2. verdoppelt sich die Gebühr</small></label>' : '')
        : '<label class="feld">Art<select name="art"><option value="dauer"' + (bel && bel.art === 'dauer' ? ' selected' : '') + '>Dauerlieger</option><option value="saisongast"' + (bel && bel.art === 'saisongast' ? ' selected' : '') + '>Saison-Gastlieger</option></select></label>') +
      '</form><p id="pruef"></p><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    const pruef = () => { const b = Q.boot($('[name=boot_id]', el).value); const pr = b ? (p.bez ? (b.gewicht_t > 10 ? ['über 10 t'] : []) : Q.passt(b, p)) : [];
      const woanders = b && Q.belegungBoot(SAISON, per, b.id); $('#pruef', el).innerHTML = (pr.length ? '<span class="hinweis warn" style="display:block">Achtung: ' + pr.map(esc).join(', ') + '</span>' : '') + (woanders && woanders.platz_id !== platzId ? '<span class="hinweis" style="display:block">„' + esc(b.name) + '“ liegt bisher auf ' + esc(platzName(woanders.platz_id)) + ' – wird umgelegt.</span>' : ''); };
    $('[name=boot_id]', el).addEventListener('change', pruef); pruef();
    $('#ok', el).addEventListener('click', () => {
      const x = Object.fromEntries(new FormData($('#f', el)));
      d.belegungen = d.belegungen.filter((y) => !(y.saison === SAISON && y.periode === per && (y.platz_id === platzId || (x.boot_id && y.boot_id === x.boot_id))));
      if (x.boot_id) d.belegungen.push({ id: H.uid('BL'), saison: SAISON, periode: per, boot_id: x.boot_id, platz_typ: p.bez ? 'land' : 'wasser', platz_id: platzId, art: x.art || 'dauer',
        flaeche_m2: x.flaeche_m2 ? Number(x.flaeche_m2) : null, nicht_kranen: !!x.nicht_kranen, sommer_an_land_jahr: x.sommer_an_land_jahr ? Number(x.sommer_an_land_jahr) : undefined, notiz: '' });
      speichern('Belegung gespeichert.'); zu(); zeige(tab);
    });
  }

  /* ============================================================ Abwesenheiten */
  V.abwesenheiten = (main) => {
    const liste = d.abwesenheiten.slice().sort((a, b) => b.von.localeCompare(a.von));
    main.innerHTML = kopf('Abwesenheiten', 'Das digitale „grüne Schild“ (Hafenbetriebsordnung 2.2.3): Solange der Eigner unterwegs ist, kann der Platz an Gäste gehen.', '<button class="btn gruen" id="neu">+ Abwesenheit</button>') +
      '<div class="panel"><table class="tab"><thead><tr><th>Zeitraum</th><th>Platz</th><th>Boot</th><th>Eigner</th><th>Ziel / Notiz</th><th>Status</th><th></th></tr></thead><tbody>' +
      liste.map((a) => { const b = Q.boot(a.boot_id); const m = b && Q.mitglied(b.eigner_id); const jetzt = a.von <= planStand.datum && a.bis >= planStand.datum;
        return '<tr' + (a.bis < heute && !jetzt ? ' class="blass"' : '') + '><td>' + H.kurz(a.von) + ' – ' + H.datum(a.bis) + '</td><td>' + esc(platzName(a.platz_id)) + '</td><td>' + (b ? esc(b.name) : '') + '</td><td>' + esc(Q.name(m)) + '</td><td>' + esc(a.notiz || '') + '</td>' +
          '<td>' + (jetzt ? '<span class="tag gruen">unterwegs (' + H.kurz(planStand.datum) + ')</span>' : a.von > heute ? '<span class="tag">geplant</span>' : '') + ' <small style="color:var(--muted)">' + esc(a.gemeldet || '') + '</small></td>' +
          '<td class="r"><button class="btn klein gefahr" data-weg="' + a.id + '">Löschen</button></td></tr>'; }).join('') + '</tbody></table></div>';
    $('#neu').addEventListener('click', () => abwesenheitForm({}));
    main.querySelectorAll('[data-weg]').forEach((b) => b.addEventListener('click', () => { d.abwesenheiten = d.abwesenheiten.filter((a) => a.id !== b.dataset.weg); speichern('Gelöscht.'); zeige(tab); }));
  };
  function abwesenheitForm(a) {
    const el = modal('<h2>Abwesenheit eintragen</h2><p class="hinweis ok">Der Platz wird für diesen Zeitraum im Hafenplan grün und kann an Gäste vergeben werden.</p><form id="f" class="form">' +
      '<label class="feld voll">Boot<select name="boot_id" required><option value="">bitte wählen</option>' + d.boote.filter((b) => { const bl = Q.belegungBoot(SAISON, 'sommer', b.id); return bl && bl.platz_typ === 'wasser'; }).map((b) => '<option value="' + b.id + '"' + (b.id === a.boot_id ? ' selected' : '') + '>' + esc(b.name) + ' – ' + esc(platzName(Q.belegungBoot(SAISON, 'sommer', b.id).platz_id)) + '</option>').join('') + '</select></label>' +
      '<label class="feld">von<input name="von" type="date" required value="' + (a.von || planStand.datum) + '"></label><label class="feld">bis (Rückkehr)<input name="bis" type="date" required value="' + (a.bis || '') + '"></label>' +
      '<label class="feld voll">Ziel / Notiz<input name="notiz" placeholder="z. B. Dänische Südsee"></label></form><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn gruen" id="ok">Grünes Schild setzen</button></div>');
    $('#ok', el).addEventListener('click', () => {
      const f = $('#f', el); if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f));
      if (x.bis < x.von) return toast('Rückkehr liegt vor der Abfahrt.', 'fehler');
      d.abwesenheiten.push({ id: H.uid('AW'), boot_id: x.boot_id, platz_id: Q.belegungBoot(SAISON, 'sommer', x.boot_id).platz_id, von: x.von, bis: x.bis, notiz: x.notiz, gemeldet: ROLLEN[rolle].name });
      speichern('Grünes Schild gesetzt.'); zu(); zeige(tab);
    });
  }

  /* ============================================================ Gastlieger */
  V.gaeste = (main) => {
    const anfragen = d.gaeste.filter((x) => x.status === 'angemeldet');
    const gb = G.gebuehrenFuer(d, SAISON);
    main.innerHTML = kopf('Gastlieger', 'Tageslieger: ' + H.geld(gb.gast_nacht) + ' pro Nacht · Hafenmeister ' + esc(d.einstellungen.hafenmeister_name), '<button class="btn" id="plakat">QR-Plakat für den Steg</button><a class="btn" href="gast.html" target="_blank">Gast-Anmeldung ansehen</a><button class="btn primaer" id="neu">+ Gast einweisen</button>') +
      (anfragen.length ? '<div class="panel" style="border:2px solid var(--gast)"><h2>Neue Anmeldungen per QR-Code</h2><table class="tab"><tbody>' + anfragen.map((x) =>
        '<tr><td><strong>„' + esc(x.bootsname) + '“</strong> · ' + H.zahl(x.laenge, 1) + ' × ' + H.zahl(x.breite || 0, 1) + ' m</td><td>' + esc(x.skipper) + (x.herkunft ? ' · ' + esc(x.herkunft) : '') + '</td><td>' + H.datum(x.ankunft) + ', ' + x.naechte + ' N.</td><td class="r"><button class="btn klein primaer" data-zuw="' + x.id + '">Platz zuweisen</button></td></tr>').join('') + '</tbody></table></div>' : '') +
      '<div class="panel"><table class="tab"><thead><tr><th>Ankunft</th><th>Boot</th><th>Skipper</th><th>Platz</th><th class="r">Nächte</th><th class="r">Betrag</th><th>Zahlung</th><th>Status</th><th></th></tr></thead><tbody>' +
      d.gaeste.slice().sort((a, b) => b.ankunft.localeCompare(a.ankunft)).map((x) =>
        '<tr' + (x.status === 'abgereist' ? ' class="blass"' : '') + '><td>' + H.datum(x.ankunft) + '</td><td><strong>' + esc(x.bootsname) + '</strong> <small style="color:var(--muted)">' + H.zahl(x.laenge, 1) + ' m</small></td><td>' + esc(x.skipper) + '</td><td>' + (x.platz_id ? esc(platzName(x.platz_id)) : '<span class="tag gast">offen</span>') + '</td>' +
        '<td class="r">' + x.naechte + '</td><td class="r">' + H.geld(x.betrag) + '</td><td>' + (x.zahlung === 'offen' ? '<span class="tag warn">offen</span>' : x.zahlung === 'bar' ? 'bar' : 'Überweisung') + '</td>' +
        '<td>' + ({ angemeldet: '<span class="tag gast">angemeldet</span>', eingewiesen: '<span class="tag ok">im Hafen</span>', abgereist: 'abgereist' })[x.status] + (x.quelle === 'qr' ? ' <small style="color:var(--muted)">QR</small>' : '') + '</td>' +
        '<td class="r" style="white-space:nowrap">' + (x.status !== 'angemeldet' ? '<button class="btn klein" data-bearb="' + x.id + '">Bearbeiten</button> ' : '') + (x.quittung_nr ? '<button class="btn klein" data-quit="' + x.id + '">Quittung</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
    $('#neu').addEventListener('click', () => gastForm({}));
    $('#plakat').addEventListener('click', () => oeffnen('drucken.html?art=plakat'));
    main.querySelectorAll('[data-zuw]').forEach((b) => b.addEventListener('click', () => gastForm(d.gaeste.find((x) => x.id === b.dataset.zuw))));
    main.querySelectorAll('[data-bearb]').forEach((b) => b.addEventListener('click', () => gastForm(d.gaeste.find((x) => x.id === b.dataset.bearb))));
    main.querySelectorAll('[data-quit]').forEach((b) => b.addEventListener('click', () => oeffnen('drucken.html?art=quittung&id=' + b.dataset.quit)));
  };
  function gastForm(g) {
    const neu = !g.id; const gb = G.gebuehrenFuer(d, SAISON);
    const x0 = { ankunft: planStand.datum, naechte: 1, laenge: '', breite: '', zahlung: 'bar', ...g };
    const el = modal('<h2>' + (neu ? 'Gast einweisen' : '„' + esc(g.bootsname) + '“') + '</h2><form id="f" class="form">' +
      '<label class="feld">Bootsname<input name="bootsname" required value="' + esc(x0.bootsname || '') + '"></label><label class="feld">Skipper<input name="skipper" required value="' + esc(x0.skipper || '') + '"></label>' +
      '<label class="feld">Heimathafen<input name="herkunft" value="' + esc(x0.herkunft || '') + '"></label><label class="feld">Telefon<input name="tel" value="' + esc(x0.tel || '') + '"></label>' +
      '<label class="feld">Länge (m)<input name="laenge" type="number" step="0.1" required value="' + x0.laenge + '"></label><label class="feld">Breite (m)<input name="breite" type="number" step="0.1" value="' + (x0.breite || '') + '"></label>' +
      '<label class="feld">Ankunft<input name="ankunft" type="date" required value="' + x0.ankunft + '"></label><label class="feld">Nächte<input name="naechte" type="number" min="1" max="60" required value="' + x0.naechte + '"></label>' +
      '<label class="feld voll">Platz<select name="platz_id" id="platzwahl"></select><small id="platzinfo"></small></label>' +
      '<label class="feld">Zahlung<select name="zahlung"><option value="bar"' + (x0.zahlung === 'bar' ? ' selected' : '') + '>bar beim Hafenmeister</option><option value="ueberweisung"' + (x0.zahlung === 'ueberweisung' ? ' selected' : '') + '>Überweisung</option><option value="offen"' + (x0.zahlung === 'offen' ? ' selected' : '') + '>noch offen</option></select></label>' +
      '<label class="feld">Betrag<input name="betrag" id="betrag" readonly></label>' +
      (!neu ? '<label class="feld">Status<select name="status"><option value="eingewiesen"' + (x0.status === 'eingewiesen' ? ' selected' : '') + '>im Hafen</option><option value="abgereist"' + (x0.status === 'abgereist' ? ' selected' : '') + '>abgereist</option></select></label>' : '') +
      '</form><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">' + (g.status === 'angemeldet' || neu ? 'Einweisen' : 'Speichern') + '</button></div>', true);
    const f = $('#f', el);
    const aktualisieren = () => {
      const n = Math.max(1, Number(f.naechte.value) || 1); $('#betrag', el).value = H.geld(n * gb.gast_nacht);
      const vf = verfuegbarePlaetze(f.ankunft.value || x0.ankunft, n, Number(f.laenge.value) || 0, Number(f.breite.value) || 0);
      const akt = x0.platz_id && !vf.some((v) => v.p.id === x0.platz_id) ? '<option value="' + x0.platz_id + '" selected>' + esc(platzName(x0.platz_id)) + ' (aktuell)</option>' : '';
      $('#platzwahl', el).innerHTML = '<option value="">– noch keinen –</option>' + akt + vf.map((v) => '<option value="' + v.p.id + '"' + (v.p.id === x0.platz_id ? ' selected' : '') + '>' + esc(platzName(v.p.id)) + ' · ' + H.BRUECKE[v.p.bruecke] + ' · bis ' + H.zahl(v.p.max_laenge, 1) + ' m · ' + (v.art === 'frei' ? 'frei' : 'grünes Schild') + '</option>').join('');
      $('#platzinfo', el).textContent = vf.length + ' passende Plätze für den ganzen Zeitraum (frei oder Eigner unterwegs)';
    };
    ['naechte', 'ankunft', 'laenge', 'breite'].forEach((k) => f[k].addEventListener('input', aktualisieren)); aktualisieren();
    $('#ok', el).addEventListener('click', () => {
      if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f));
      const daten = { bootsname: x.bootsname, skipper: x.skipper, herkunft: x.herkunft, tel: x.tel, laenge: Number(x.laenge), breite: Number(x.breite) || 0, ankunft: x.ankunft, naechte: Number(x.naechte), platz_id: x.platz_id,
        betrag: Number(x.naechte) * gb.gast_nacht, zahlung: x.zahlung, status: x.status || (x.platz_id ? 'eingewiesen' : 'angemeldet') };
      if (daten.zahlung !== 'offen' && !(g.quittung_nr)) daten.quittung_nr = 'Q-' + daten.ankunft.slice(0, 4) + '-' + String(++d.zaehler.quittung).padStart(3, '0');
      if (neu) d.gaeste.push({ id: H.uid('G'), quelle: 'hafenmeister', erstellt: new Date().toISOString(), email: '', ...daten }); else Object.assign(g, daten);
      speichern(daten.platz_id ? 'Gast auf ' + platzName(daten.platz_id) + ' eingewiesen.' : 'Gespeichert.'); zu(); zeige(tab);
    });
  }

  /* ============================================================ Warteliste */
  V.warteliste = (main) => {
    const w = d.warteliste.slice().sort((a, b) => (a.status === 'wartend' ? 0 : 1) - (b.status === 'wartend' ? 0 : 1) || a.datum.localeCompare(b.datum));
    main.innerHTML = kopf('Warteliste', 'Jedes ausübende Mitglied hat im Rahmen der Möglichkeiten Anspruch auf einen Liegeplatz (Satzung § 10 I). Reihenfolge nach Eingang.', '<button class="btn primaer" id="neu">+ Eintrag</button>') +
      '<div class="panel"><table class="tab"><thead><tr><th>#</th><th>seit</th><th>Mitglied</th><th>Boot (L × B)</th><th>Wunsch</th><th>Passende freie Plätze ' + SAISON + '</th><th></th></tr></thead><tbody>' +
      w.map((x, i) => { const m = Q.mitglied(x.mitglied_id);
        const passend = d.liegeplaetze.filter((p) => !p.gesperrt && !Q.belegungPlatz(SAISON, 'sommer', p.id) && x.boot_laenge <= p.max_laenge && x.boot_breite <= p.max_breite);
        return '<tr' + (x.status !== 'wartend' ? ' class="blass"' : '') + '><td>' + (x.status === 'wartend' ? i + 1 : '') + '</td><td>' + H.datum(x.datum) + '</td><td><strong>' + esc(Q.name(m)) + '</strong> <span class="tag">' + H.ART[m.art] + '</span>' + (m.art === 'foerdernd' ? ' <small style="color:var(--muted)">(kein Anspruch)</small>' : '') + '</td>' +
          '<td>' + H.zahl(x.boot_laenge) + ' × ' + H.zahl(x.boot_breite) + ' m</td><td>Box ' + esc(x.wunsch_box) + '</td><td>' + (x.status === 'wartend' ? (passend.length ? passend.slice(0, 4).map((p) => '<button class="btn klein" data-vergeben="' + x.id + '|' + p.id + '">' + esc(platzName(p.id)) + '</button>').join(' ') : '<span class="leer">keiner frei</span>') : esc(x.status)) + '</td>' +
          '<td class="r"><button class="btn klein gefahr" data-weg="' + x.id + '">Entfernen</button></td></tr>'; }).join('') + '</tbody></table></div>';
    $('#neu').addEventListener('click', () => {
      const el = modal('<h2>Warteliste</h2><form id="f" class="form"><label class="feld voll">Mitglied<select name="mitglied_id" required>' + mOpt() + '</select></label><label class="feld">Bootslänge (m)<input name="boot_laenge" type="number" step="0.1" required></label><label class="feld">Bootsbreite (m)<input name="boot_breite" type="number" step="0.1" required></label><label class="feld">Wunsch-Box<select name="wunsch_box"><option>I</option><option selected>II</option><option>III</option></select></label><label class="feld">eingegangen am<input name="datum" type="date" value="' + heute + '"></label></form><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Eintragen</button></div>');
      $('#ok', el).addEventListener('click', () => { const f = $('#f', el); if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f)); d.warteliste.push({ id: H.uid('W'), ...x, boot_laenge: Number(x.boot_laenge), boot_breite: Number(x.boot_breite), notiz: '', status: 'wartend' }); speichern('Eingetragen.'); zu(); zeige(tab); });
    });
    main.querySelectorAll('[data-weg]').forEach((b) => b.addEventListener('click', () => { if (confirm('Eintrag entfernen?')) { d.warteliste = d.warteliste.filter((x) => x.id !== b.dataset.weg); speichern('Entfernt.'); zeige(tab); } }));
    main.querySelectorAll('[data-vergeben]').forEach((b) => b.addEventListener('click', () => {
      const [wid, pid] = b.dataset.vergeben.split('|'); const x = d.warteliste.find((y) => y.id === wid); const m = Q.mitglied(x.mitglied_id);
      if (!confirm(platzName(pid) + ' an ' + Q.name(m) + ' vergeben? Das Boot wird angelegt bzw. zugeordnet.')) return;
      let b2 = Q.booteVon(m.id)[0];
      if (!b2) { b2 = { id: H.uid('B'), name: '[Bootsname eintragen]', typ: '', eigner_id: m.id, laenge: x.boot_laenge, breite: x.boot_breite, tiefgang: 0, gewicht_t: 0, segelnr: '', versicherung: '', vers_bis: '', notiz: 'aus Warteliste' }; d.boote.push(b2); }
      d.belegungen.push({ id: H.uid('BL'), saison: SAISON, periode: 'sommer', boot_id: b2.id, platz_typ: 'wasser', platz_id: pid, art: 'dauer', flaeche_m2: null, nicht_kranen: false, notiz: 'aus Warteliste' });
      x.status = 'vergeben: ' + platzName(pid); speichern(platzName(pid) + ' vergeben.'); zeige(tab);
    }));
  };

  /* ============================================================ Ein-/Auslagern & Kran */
  V.lagern = (main) => {
    const winter = Q.belegungen(SAISON, 'winter');
    const gb = G.gebuehrenFuer(d, SAISON);
    main.innerHTML = kopf('Ein-/Auslagern & Kran', 'Gemeinschaftsarbeit nach Belegungsplan · Auslagern ' + H.datum(sd.auslagern) + ' · Einlagern ' + H.datum(sd.einlagern), '<button class="btn" id="druck">Belegungsplan drucken</button><button class="btn primaer" id="kran">+ Kran-Einsatz</button>') +
      '<div class="zwei"><div class="panel"><h2>Belegungsplan Winterlager ' + SAISON + '/' + String(SAISON + 1).slice(2) + '</h2><p class="hinweis">Boote über 10 t werden nicht gekrant. „Nicht kranen“ muss spätestens eine Woche vor dem Auslagern gemeldet sein.</p><table class="tab"><thead><tr><th>Landplatz</th><th>Boot</th><th class="r">Gewicht</th><th>Eigner</th><th></th></tr></thead><tbody>' +
      winter.slice().sort((a, b) => a.platz_id.localeCompare(b.platz_id)).map((bl) => { const b = Q.boot(bl.boot_id); const m = Q.mitglied(b.eigner_id);
        return '<tr><td>' + esc(platzName(bl.platz_id)) + '</td><td>' + esc(b.name) + '</td><td class="r">' + H.zahl(b.gewicht_t, 1) + ' t' + (b.gewicht_t > 10 ? ' <span class="tag rot">!</span>' : '') + '</td><td>' + esc(Q.name(m)) + '</td><td>' + (bl.nicht_kranen ? '<span class="tag warn">nicht kranen</span>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div><div class="panel"><h2>Kran-Einsätze außerhalb der Termine</h2><p class="hinweis">Schiffskran ' + H.geld(gb.schiffskran_std) + ', Mastenkran ' + H.geld(gb.mastenkran_std) + ' je angefangene Stunde – laufen automatisch in die nächste Abrechnung.</p><table class="tab"><thead><tr><th>Datum</th><th>Boot</th><th>Kran</th><th class="r">Dauer</th><th>Abrechnung</th></tr></thead><tbody>' +
      d.kran.slice().sort((a, b) => b.datum.localeCompare(a.datum)).map((k) => { const b = Q.boot(k.boot_id);
        return '<tr><td>' + H.datum(k.datum) + '</td><td>' + esc(b ? b.name : '?') + '<br><small style="color:var(--muted)">' + esc(k.notiz || '') + '</small></td><td>' + (k.art === 'mast' ? 'Mast' : 'Schiff') + '</td><td class="r">' + k.minuten + ' Min.</td><td>' + (k.abgerechnet ? '<span class="tag ok">' + esc(k.abgerechnet) + '</span>' : '<span class="tag warn">offen</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    $('#druck').addEventListener('click', () => oeffnen('drucken.html?art=belegungsplan'));
    $('#kran').addEventListener('click', () => {
      const el = modal('<h2>Kran-Einsatz</h2><form id="f" class="form"><label class="feld voll">Boot<select name="boot_id" required>' + bOpt() + '</select></label><label class="feld">Datum<input name="datum" type="date" value="' + heute + '" required></label><label class="feld">Kran<select name="art"><option value="schiff">Schiffskran</option><option value="mast">Mastenkran</option></select></label><label class="feld">Dauer (Minuten)<input name="minuten" type="number" min="1" value="60" required></label><label class="feld">Anlass<input name="notiz"></label></form><p class="hinweis">Kran nur durch eingewiesene Personen (Hafenbetriebsordnung 3.1.4).</p><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Erfassen</button></div>');
      $('#ok', el).addEventListener('click', () => { const f = $('#f', el); if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f)); const b = Q.boot(x.boot_id);
        if (b.gewicht_t > 10 && x.art === 'schiff' && !confirm('Boot über 10 t – laut Hafenbetriebsordnung wird nicht gekrant. Trotzdem erfassen?')) return;
        d.kran.push({ id: H.uid('K'), ...x, minuten: Number(x.minuten), abgerechnet: '' }); speichern('Kran-Einsatz erfasst.'); zu(); zeige(tab); });
    });
  };

  /* ============================================================ Arbeitsdienst */
  V.arbeitsdienst = (main) => {
    const soll = Number(d.einstellungen.arbeitsdienst_soll || 0);
    const pflicht = d.mitglieder.filter((m) => m.art === 'ausuebend' || m.art === 'probe');
    const ist = (mid) => d.arbeitsdienst.filter((a) => a.mitglied_id === mid && a.datum.startsWith(String(SAISON))).reduce((s, a) => s + a.stunden, 0);
    main.innerHTML = kopf('Arbeitsdienst ' + SAISON, 'Pflicht für ausübende Mitglieder (Satzung § 10 II). Soll: ' + soll + ' Std. [PLATZHALTER] · Ab 25 Fehlstunden folgt eine schriftliche Aufforderung.', '<button class="btn primaer" id="neu">+ Stunden erfassen</button>') +
      '<div class="panel"><table class="tab"><thead><tr><th>Mitglied</th><th class="r">geleistet</th><th class="r">Soll</th><th class="r">Fehlstunden</th><th></th></tr></thead><tbody>' +
      pflicht.sort((a, b) => ist(a.id) - ist(b.id)).map((m) => { const i = ist(m.id), f = Math.max(0, soll - i);
        return '<tr><td>' + esc(Q.name(m)) + '</td><td class="r">' + i + ' Std.</td><td class="r">' + soll + '</td><td class="r">' + f + '</td><td>' + (f >= 25 ? '<span class="tag rot">Aufforderung</span>' : f > 0 ? '<span class="tag warn">offen</span>' : '<span class="tag ok">erfüllt</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    $('#neu').addEventListener('click', () => {
      const el = modal('<h2>Arbeitsstunden</h2><form id="f" class="form"><label class="feld voll">Mitglied<select name="mitglied_id">' + mOpt(null, (m) => m.art === 'ausuebend' || m.art === 'probe') + '</select></label><label class="feld">Datum<input name="datum" type="date" value="' + heute + '"></label><label class="feld">Stunden<input name="stunden" type="number" step="0.5" min="0.5" value="4"></label><label class="feld voll">Tätigkeit<input name="taetigkeit" placeholder="z. B. Einlagern, Steg-Wartung"></label></form><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Erfassen</button></div>');
      $('#ok', el).addEventListener('click', () => { const x = Object.fromEntries(new FormData($('#f', el))); d.arbeitsdienst.push({ id: H.uid('AD'), ...x, stunden: Number(x.stunden) }); speichern('Erfasst.'); zu(); zeige(tab); });
    });
  };

  /* ============================================================ Abrechnung */
  const abrStand = { periode: imSommer ? 'sommer' : 'winter', datum: heute };
  V.abrechnung = (main) => {
    const per = abrStand.periode, e = d.einstellungen;
    const vs = G.vorschau(d, SAISON, per, abrStand.datum).filter((x) => x.summe > 0);
    const offen = vs.filter((x) => !x.schon_abgerechnet);
    const ohneMandat = offen.filter((x) => !(x.m.iban && x.m.mandat_ref && x.m.mandat_datum));
    const res = d.rechnungen.slice().sort((a, b) => b.nr.localeCompare(a.nr));
    const sepaBereit = res.filter((r) => r.sepa && !r.sepa_lauf && !r.storniert_am && !r.bezahlt_am);
    const sepaOk = SEPA.ibanGueltig(e.iban) && SEPA.glaeubigerGueltig(e.glaeubiger_id);
    const label = per === 'sommer' ? 'Sommer ' + SAISON : 'Winter ' + SAISON + '/' + String(SAISON + 1).slice(2);
    main.innerHTML = kopf('Abrechnung & Lastschrift', 'Laut Gebührenordnung: Sommer nach dem Auslagern, Winter nach dem Einlagern einziehen.',
      '<button class="btn' + (per === 'sommer' ? ' aktiv' : '') + '" data-per="sommer">Sommer ' + SAISON + '</button><button class="btn' + (per === 'winter' ? ' aktiv' : '') + '" data-per="winter">Winter ' + SAISON + '/' + String(SAISON + 1).slice(2) + '</button>') +
      '<div class="panel"><h2>1 · Vorschau ' + label + '</h2>' +
      (offen.length ? '<p>' + offen.length + ' Mitglieder · <strong>' + H.geld(offen.reduce((s, x) => s + x.summe, 0)) + '</strong>' + (vs.length > offen.length ? ' · ' + (vs.length - offen.length) + ' bereits abgerechnet' : '') + '</p>' : '<p class="hinweis ok">' + label + ' ist vollständig abgerechnet.</p>') +
      (ohneMandat.length ? '<p class="hinweis warn">' + ohneMandat.length + ' ohne SEPA-Mandat – ihre Rechnung nennt die Bankverbindung zur Überweisung.</p>' : '') +
      (offen.length ? '<table class="tab"><thead><tr><th>Mitglied</th><th>Art</th><th>Positionen</th><th class="r">Betrag</th></tr></thead><tbody>' + offen.map((x) =>
        '<tr><td>' + esc(Q.name(x.m)) + '</td><td><span class="tag">' + H.ART[x.m.art] + '</span></td><td style="font-size:12.5px;color:var(--muted)">' + x.positionen.map((p) => esc(p.text.split(' · ')[0])).join('<br>') + '</td><td class="r">' + H.geld(x.summe) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="3">Summe</td><td class="r">' + H.geld(offen.reduce((s, x) => s + x.summe, 0)) + '</td></tr></tfoot></table>' +
        '<div class="filter" style="margin-top:14px"><label class="feld">Rechnungsdatum<input type="date" id="rdat" value="' + abrStand.datum + '"></label><button class="btn primaer" id="los">2 · ' + offen.length + ' Rechnungen erstellen</button></div>' : '') + '</div>' +
      '<div class="panel"><div class="kopf" style="margin-bottom:8px"><h2 style="margin:0">3 · Lastschrift an die Bank</h2><div class="aktionen"><button class="btn dunkel" id="sepa"' + (sepaBereit.length && sepaOk ? '' : ' disabled') + '>SEPA-Datei erzeugen (' + sepaBereit.length + ')</button><button class="btn" id="csvr">Rechnungsliste CSV</button></div></div>' +
      (!sepaOk ? '<p class="hinweis warn">Für die Lastschrift-Datei fehlen gültige Vereinsdaten (IBAN und Gläubiger-ID) unter Einstellungen.</p>' : '<p class="hinweis">Erzeugt eine Sammellastschrift im aktuellen Bankformat <strong>pain.008.001.08</strong> (Pflicht ab November 2026). Die Datei im Online-Banking des Vereins hochladen; Einzug am Fälligkeitstag der Rechnungen.</p>') +
      (d.sepa_laeufe.length ? '<p style="font-size:13px;color:var(--muted)">Bisherige Dateien: ' + d.sepa_laeufe.map((l) => esc(l.id) + ' (' + l.anzahl + ' Posten, ' + H.geld(l.summe) + ')').join(' · ') + '</p>' : '') +
      '<table class="tab"><thead><tr><th>Nr.</th><th>Datum</th><th>Mitglied</th><th>Periode</th><th class="r">Betrag</th><th>Zahlung</th><th>Status</th><th></th></tr></thead><tbody>' +
      res.map((r) => '<tr' + (r.storniert_am ? ' class="blass"' : '') + '><td><strong style="white-space:nowrap">' + esc(r.nr) + '</strong></td><td>' + H.datum(r.datum) + '</td><td>' + esc(r.empfaenger.vorname + ' ' + r.empfaenger.nachname) + '</td><td>' + (r.periode === 'sommer' ? 'Sommer' : 'Winter') + ' ' + r.saison + '</td>' +
        '<td class="r">' + H.geld(r.summe) + '</td><td>' + (r.sepa ? 'Lastschrift' + (r.sepa_lauf ? ' <small style="color:var(--muted)">' + esc(r.sepa_lauf) + '</small>' : '') : 'Überweisung') + '</td>' +
        '<td>' + (r.storniert_am ? '<span class="tag rot">storniert</span>' : r.bezahlt_am ? '<span class="tag ok">bezahlt</span>' : r.faellig < heute ? '<span class="tag rot">überfällig</span>' : '<span class="tag warn">offen</span>') + '</td>' +
        '<td class="r" style="white-space:nowrap"><button class="btn klein" data-zeige="' + r.id + '">Ansehen</button> ' + (!r.storniert_am && !r.bezahlt_am ? '<button class="btn klein" data-bez="' + r.id + '">Bezahlt</button> <button class="btn klein gefahr" data-storno="' + r.id + '">Storno</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
    main.querySelectorAll('[data-per]').forEach((b) => b.addEventListener('click', () => { abrStand.periode = b.dataset.per; zeige('abrechnung'); }));
    const rdat = $('#rdat'); if (rdat) rdat.addEventListener('change', () => { abrStand.datum = rdat.value; });
    const los = $('#los'); if (los) los.addEventListener('click', () => {
      if (!confirm(offen.length + ' Rechnungen für ' + label + ' erstellen?')) return;
      const neu = G.saisonAbrechnen(d, SAISON, per, abrStand.datum); speichern(neu.length + ' Rechnungen erstellt.'); zeige('abrechnung');
      if (neu.length && confirm('Rechnungen jetzt ansehen / als PDF sichern?')) oeffnen('drucken.html?art=rechnungen&ids=' + neu.map((r) => r.id).join(','));
    });
    $('#sepa').addEventListener('click', () => {
      const ungueltig = [];
      const posten = sepaBereit.map((r) => { const m = Q.mitglied(r.mitglied_id);
        if (!SEPA.ibanGueltig(m.iban)) { ungueltig.push(r.nr); return null; }
        return { betrag: r.summe, mandat_ref: r.mandat_ref, mandat_datum: r.mandat_datum, name: m.kontoinhaber || Q.name(m), iban: m.iban, bic: m.bic, zweck: 'Hafengeld ' + r.nr + ' ' + (r.periode === 'sommer' ? 'Sommer ' : 'Winter ') + r.saison, e2e: r.nr, re: r }; }).filter(Boolean);
      if (!posten.length) return toast('Keine gültigen Posten.', 'fehler');
      // je Fälligkeitstag eine Datei, damit der Einzugstermin stimmt
      const nachTag = new Map(); posten.forEach((p) => { const t = p.re.faellig; if (!nachTag.has(t)) nachTag.set(t, []); nachTag.get(t).push(p); });
      nachTag.forEach((liste, faellig) => {
        const id = 'SEPA-' + heute + '-' + (d.sepa_laeufe.length + 1);
        const xml = SEPA.erzeugen({ name: e.verein_name, iban: e.iban, bic: e.bic, glaeubiger_id: e.glaeubiger_id }, liste, faellig < heute ? heute : faellig, 'SSV-' + id);
        download(id + '.xml', xml, 'application/xml');
        const summe = liste.reduce((s, p) => s + Math.round(p.betrag * 100), 0) / 100;
        d.sepa_laeufe.push({ id, datum: heute, faellig, anzahl: liste.length, summe });
        liste.forEach((p) => { p.re.sepa_lauf = id; });
      });
      speichern(posten.length + ' Lastschriften in ' + nachTag.size + ' Datei(en) erzeugt.' + (ungueltig.length ? ' Übersprungen (IBAN ungültig): ' + ungueltig.join(', ') : '')); zeige('abrechnung');
    });
    $('#csvr').addEventListener('click', () => download('hafen-rechnungen.csv', csv([['Nr', 'Datum', 'Fällig', 'Mitgliedsnr', 'Name', 'Periode', 'Betrag', 'Zahlart', 'SEPA-Datei', 'Bezahlt am', 'Storniert']].concat(res.map((r) => [r.nr, H.datum(r.datum), H.datum(r.faellig), r.empfaenger.nr, r.empfaenger.vorname + ' ' + r.empfaenger.nachname, r.periode + ' ' + r.saison, H.zahl(r.summe), r.sepa ? 'Lastschrift' : 'Überweisung', r.sepa_lauf || '', H.datum(r.bezahlt_am), r.storniert_am ? 'ja' : '']))), 'text/csv'));
    main.querySelectorAll('[data-zeige]').forEach((b) => b.addEventListener('click', () => oeffnen('drucken.html?art=rechnungen&ids=' + b.dataset.zeige)));
    main.querySelectorAll('[data-bez]').forEach((b) => b.addEventListener('click', () => { d.rechnungen.find((r) => r.id === b.dataset.bez).bezahlt_am = heute; speichern('Als bezahlt markiert.'); zeige('abrechnung'); }));
    main.querySelectorAll('[data-storno]').forEach((b) => b.addEventListener('click', () => { if (!confirm('Rechnung stornieren? Das Mitglied erscheint danach wieder in der Vorschau.')) return; G.stornieren(d, b.dataset.storno); speichern('Storniert.'); zeige('abrechnung'); }));
  };

  /* ============================================================ Gebühren */
  V.gebuehren = (main) => {
    const jahr = Math.max(...Object.keys(d.gebuehren).map(Number)); const gb = d.gebuehren[jahr];
    const zeile = (titel, key) => '<tr><td>' + titel + '</td>' + ['I', 'II', 'III'].map((b) => '<td class="r"><input class="suche" style="min-width:0;width:90px;text-align:right" data-k="' + key + '.' + b + '" value="' + gb[key][b] + '"></td>').join('') + '</tr>';
    const einzel = (titel, key, einheit) => '<tr><td>' + titel + '</td><td class="r" colspan="3"><input class="suche" style="min-width:0;width:90px;text-align:right" data-k="' + key + '" value="' + gb[key] + '"> ' + einheit + '</td></tr>';
    main.innerHTML = kopf('Gebührenordnung ab ' + jahr, esc(gb.stand) + ' · alle Preise inkl. MwSt.', '<button class="btn primaer" id="ok">Speichern</button>') +
      '<div class="panel"><table class="tab"><thead><tr><th>Wasserliegeplatz (Saison)</th><th class="r">Box I</th><th class="r">Box II</th><th class="r">Box III</th></tr></thead><tbody>' +
      zeile('Ausübende/Probe: Sommerliegegebühr', 'sommerliegegebuehr') + zeile('Ausübende/Probe: Umlage Wasserpacht', 'wasserpacht') + zeile('Fördernde: Sommerlieger', 'foerdernd_sommer') + zeile('Gäste: Sommerlieger (Saison)', 'gast_saison') +
      '</tbody></table></div><div class="panel"><table class="tab"><tbody>' + einzel('Gast, einzelne Übernachtung', 'gast_nacht', '€') + einzel('Stromumlage (ausübend/Probe)', 'stromumlage', '€') +
      einzel('Landstellplatz außen', 'land_aussen_m2', '€ / m²') + einzel('Landstellplatz Halle (nur Winter)', 'land_halle_m2', '€ / m²') + einzel('Palette', 'palette_halbjahr', '€ / Halbjahr') +
      einzel('Schiffskran', 'schiffskran_std', '€ / angef. Std.') + einzel('Mastenkran', 'mastenkran_std', '€ / angef. Std.') + einzel('Schlüsselpfand', 'schluesselpfand', '€') + '</tbody></table></div>' +
      '<p class="hinweis">Neue Gebühren nach der Jahreshauptversammlung hier eintragen. Bereits erstellte Rechnungen ändern sich dadurch nicht.</p>';
    $('#ok').addEventListener('click', () => {
      main.querySelectorAll('[data-k]').forEach((i) => { const [k, b] = i.dataset.k.split('.'); const v = Number(String(i.value).replace(',', '.')); if (isNaN(v)) return; if (b) gb[k][b] = v; else gb[k] = v; });
      speichern('Gebührenordnung gespeichert.');
    });
  };

  /* ============================================================ Einstellungen */
  V.einstellungen = (main) => {
    const e = d.einstellungen;
    const f = (k, l, t = 'text', extra = '') => '<label class="feld">' + l + '<input name="' + k + '" type="' + t + '" value="' + esc(e[k] == null ? '' : e[k]) + '"' + extra + '></label>';
    main.innerHTML = kopf('Einstellungen', 'Vereins- und Bankdaten für Rechnungen und Lastschrift.', '<button class="btn primaer" id="ok">Speichern</button>') +
      '<div class="panel"><form id="f" class="form">' + f('verein_name', 'Vereinsname') + f('verein_email', 'E-Mail') + f('verein_strasse', 'Straße') + f('verein_ort', 'PLZ und Ort') +
      f('glaeubiger_id', 'Gläubiger-ID') + f('iban', 'IBAN des Vereins') + f('bic', 'BIC') + f('bank', 'Bank') + f('kassenwart_name', 'Kassenwart (Gruß auf Rechnungen)') + f('hafenmeister_name', 'Hafenmeister') + f('hafenmeister_tel', 'Telefon Hafenmeister') +
      f('rechnung_praefix', 'Rechnungsnummer-Präfix') + f('zahlungsziel_tage', 'Einzug nach Rechnungsdatum (Tage)', 'number') + f('arbeitsdienst_soll', 'Arbeitsdienst-Soll (Std./Jahr)', 'number') +
      '<label class="feld check voll"><input type="checkbox" name="stromumlage_ueber_hafen"' + (e.stromumlage_ueber_hafen ? ' checked' : '') + '> Stromumlage mit der Hafenrechnung einziehen (sonst über den Mitgliedsbeitrag)</label></form></div>' +
      '<div class="panel"><h2>Demo</h2><p class="hinweis">Setzt alle Daten auf die erfundenen Beispieldaten zurück.</p><button class="btn gefahr" id="reset">Demo zurücksetzen</button></div>';
    $('#ok').addEventListener('click', () => {
      const x = Object.fromEntries(new FormData($('#f'))); x.stromumlage_ueber_hafen = !!x.stromumlage_ueber_hafen; ['zahlungsziel_tage', 'arbeitsdienst_soll'].forEach((k) => { x[k] = Number(x[k]) || 0; });
      if (x.iban && !SEPA.ibanGueltig(x.iban)) return toast('IBAN des Vereins ist ungültig.', 'fehler');
      if (x.glaeubiger_id && !SEPA.glaeubigerGueltig(x.glaeubiger_id)) return toast('Gläubiger-ID hat ein ungültiges Format.', 'fehler');
      Object.assign(e, x); speichern('Gespeichert.');
    });
    $('#reset').addEventListener('click', () => { if (confirm('Alle Demo-Daten zurücksetzen?')) { d = HF.zuruecksetzen(); toast('Zurückgesetzt.'); zeige('uebersicht'); } });
  };

  /* ============================================================ Navigation */
  function nav() {
    const anfragen = d.gaeste.filter((g) => g.status === 'angemeldet').length;
    $('#nav').innerHTML = '<div class="marke"><svg class="stander"><use href="#stander"/></svg><div><strong>Hafen-Manager</strong><span>SSV · Teerhofinsel</span></div></div>' +
      '<div class="rolle-chip">Angemeldet als <strong>' + ROLLEN[rolle].name + '</strong></div>' +
      TABS.map(([gruppe, ts]) => { const sichtbar = ts.filter(([t]) => darf(t)); return sichtbar.length ? '<div class="nav-gruppe">' + gruppe + '</div>' + sichtbar.map(([t, n]) =>
        '<button data-tab="' + t + '" class="' + (t === tab ? 'aktiv' : '') + '">' + n + (t === 'gaeste' && anfragen ? '<span class="zahl">' + anfragen + '</span>' : '') + '</button>').join('') : ''; }).join('') +
      '<div class="nav-unten"><a href="mein-ssv.html" target="_blank">Mein SSV (Mitglieder) ↗</a><button id="abmelden">Rolle wechseln</button></div>';
  }
  function zeige(t) {
    if (!darf(t)) t = 'uebersicht';
    tab = t; nav(); V[t]($('#main')); window.scrollTo(0, 0);
    try { history.replaceState(null, '', '#' + t); } catch (e) { /* egal */ }
  }
  document.addEventListener('click', (e) => {
    const n = e.target.closest('#nav [data-tab]'); if (n) return zeige(n.dataset.tab);
    const g = e.target.closest('[data-gehe]'); if (g && darf(g.dataset.gehe)) return zeige(g.dataset.gehe);
    if (e.target.closest('#abmelden')) { rolle = null; try { sessionStorage.removeItem('ssv-hafen-rolle'); } catch (x) { /* egal */ } start(); }
  });
  $('#rollen').addEventListener('click', (e) => { const b = e.target.closest('[data-rolle]'); if (!b) return; rolle = b.dataset.rolle; try { sessionStorage.setItem('ssv-hafen-rolle', rolle); } catch (x) { /* egal */ } start(); });

  // Demo: Änderungen aus anderen Fenstern (QR-Gastanmeldung, Mein SSV) sofort übernehmen,
  // damit beim nächsten Speichern nichts überschrieben wird
  window.addEventListener('storage', (e) => { if (e.key === 'ssv-hafen-demo-v1') { d = HF.laden(); if (rolle) zeige(tab); } });

  function start() {
    try { rolle = rolle || sessionStorage.getItem('ssv-hafen-rolle'); } catch (e) { /* egal */ }
    $('#login').hidden = !!rolle; $('#app').hidden = !rolle;
    if (!rolle) return;
    const t = location.hash.slice(1); zeige(V[t] ? t : 'uebersicht');
  }
  start();
})();
