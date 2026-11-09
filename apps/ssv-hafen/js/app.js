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
    brueckenwart: { name: 'Brückenwartin', tabs: ['uebersicht', 'plan', 'plaetze', 'boote', 'eigner', 'belegung', 'abwesenheiten', 'gaeste', 'warteliste', 'lagern', 'aufgaben', 'arbeitsdienst', 'mitteilungen'], bank: false },
    hafenmeister: { name: 'Hafenmeister', tabs: ['uebersicht', 'plan', 'plaetze', 'gaeste', 'abwesenheiten', 'lagern', 'aufgaben', 'arbeitsdienst', 'mitteilungen'], bank: false },
    kassenwart: { name: 'Kassenwart', tabs: ['uebersicht', 'plan', 'eigner', 'antraege', 'verband', 'abrechnung', 'gebuehren', 'arbeitsdienst', 'mitteilungen', 'einstellungen', 'verlauf'], bank: true }
  };
  const TABS = [
    ['Hafen', [['uebersicht', 'Übersicht'], ['plan', 'Hafenplan'], ['plaetze', 'Liegeplätze'], ['boote', 'Boote']]],
    ['Mitglieder', [['eigner', 'Mitglieder & Eigner'], ['antraege', 'Aufnahmeanträge'], ['verband', 'Verbandsmeldung']]],
    ['Betrieb', [['belegung', 'Belegung'], ['abwesenheiten', 'Abwesenheiten'], ['gaeste', 'Gastlieger'], ['warteliste', 'Warteliste'], ['lagern', 'Ein-/Auslagern & Kran'], ['aufgaben', 'Schäden & Wartung'], ['arbeitsdienst', 'Arbeitsdienst'], ['mitteilungen', 'Mitteilungen']]],
    ['Finanzen', [['abrechnung', 'Abrechnung & Lastschrift'], ['gebuehren', 'Gebührenordnung'], ['einstellungen', 'Einstellungen'], ['verlauf', 'Änderungsverlauf']]]
  ];
  let rolle = null, tab = 'uebersicht';
  const darf = (t) => rolle && (ROLLEN[rolle].tabs === '*' || ROLLEN[rolle].tabs.includes(t));
  const bankSichtbar = () => rolle && ROLLEN[rolle].bank;

  /* ------------------------------------------------------------ Saison */
  const SAISON = HF.aktuelleSaison();
  const sd = G.saisonDaten(d, SAISON);
  const imSommer = heute >= sd.auslagern && heute < sd.einlagern;
  // Bezugszeitpunkt: im Sommer immer „heute“; in der Winterpause zeigt der Sommerplan einen deutlich gekennzeichneten Rückblick
  const tagVor = (t, n) => H.tag(new Date(new Date(t + 'T12:00:00').getTime() - n * 864e5));
  const rueckblick = HF.modus !== 'supabase' ? '2026-08-15' : heute < sd.auslagern ? sd.auslagern : tagVor(sd.einlagern, 1);
  let planStand = { modus: imSommer ? 'sommer' : 'winter', datum: imSommer ? heute : rueckblick, ansicht: imSommer ? 'gesamt' : 'land', markiere: null };
  const stichtagText = (t) => t === heute ? 'heute' : (t < heute ? 'Rückblick' : 'Vorschau');

  /* ------------------------------------------------------------ Helfer */
  const DB = HF.modus === 'supabase';
  // Speichern: Demo sofort im Browser, Vereinsdatenbank im Hintergrund – Fehler werden gemeldet
  HF.db.onFehler = (e) => { toast('Nicht gespeichert: ' + e.message, 'fehler', 7000); if (DB) neuLaden(true); };
  // Stand der Datenbank neu holen: nach abgelehntem Speichern, beim Zurückkehren in den Tab und alle 90 Sekunden
  async function neuLaden(still) {
    try { await HF.neuLaden(); d = HF.d; if (rolle && !$('#modal').firstChild) zeige(tab, true); }
    catch (x) { if (!still) toast('Neu laden fehlgeschlagen: ' + x.message, 'fehler'); }
  }
  if (DB) {
    const auffrischen = () => { const a = document.activeElement; if (!rolle || document.hidden || $('#modal').firstChild || (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) return; neuLaden(true); };
    setInterval(auffrischen, 90e3); document.addEventListener('visibilitychange', () => { if (!document.hidden) auffrischen(); });
  }
  function speichern(meldung) { const p = HF.sichern(); if (meldung) toast(meldung); return p; }
  function toast(t, art, ms) { const el = $('#toast'); el.textContent = t; el.className = 'toast zeigen' + (art ? ' ' + art : ''); clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = 'toast'; }, ms || 3200); }
  let vorModal = null;
  function modal(html, breit) {
    vorModal = document.activeElement;
    const m = $('#modal'); m.innerHTML = '<div class="modal"><div class="modal-karte' + (breit ? ' breit' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-titel"><button class="modal-x" data-zu aria-label="Schließen">×</button>' + html + '</div></div>';
    document.body.classList.add('modal-offen');
    const el = m.firstChild; el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-zu]')) zu(); });
    const t = el.querySelector('h2'); if (t) t.id = 'modal-titel';
    const f = el.querySelector('input:not([type=hidden]),select,textarea'); if (f) setTimeout(() => f.focus(), 30);
    return el;
  }
  function zu() { $('#modal').innerHTML = ''; document.body.classList.remove('modal-offen'); if (vorModal && vorModal.isConnected) vorModal.focus(); }
  // Tastatur: Escape schließt Dialoge; klickbare Tabellenzeilen per Tab erreichbar und mit Enter/Leertaste zu öffnen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#modal').firstChild) return zu();
    const z = e.target.closest && e.target.closest('tr.klickbar');
    if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); z.click(); }
  });
  new MutationObserver(() => {
    document.querySelectorAll('#main tr.klickbar:not([tabindex])').forEach((z) => { z.tabIndex = 0; z.setAttribute('role', 'button'); });
    document.querySelectorAll('#main input:not([aria-label]):not([id])').forEach((i) => {
      if (i.closest('label')) return;
      const zeile = i.closest('tr'); const sp = i.closest('td'); const kopf = sp && i.closest('table').querySelector('thead th:nth-child(' + (sp.cellIndex + 1) + ')');
      const name = i.placeholder || ((zeile && zeile.cells[0] ? zeile.cells[0].textContent : '') + (kopf ? ' ' + kopf.textContent : ''));
      if (name) i.setAttribute('aria-label', name.trim());
    });
  }).observe(document.getElementById('main'), { childList: true, subtree: true });
  function kopf(titel, unter, aktionen) { return '<div class="kopf"><div><h1>' + titel + '</h1>' + (unter ? '<p>' + unter + '</p>' : '') + '</div><div class="aktionen">' + (aktionen || '') + '</div></div>'; }
  const DEMO = DB ? '' : '<div class="demo-band"><strong>Demo:</strong> Alle Personen, Boote und Bankdaten sind erfunden. Gespeichert wird nur in diesem Browser – im Echtbetrieb arbeiten alle mit derselben Vereinsdatenbank. Die Zuordnung der Brücken und die Box-Maße sind Annahmen, bis der Verein sie bestätigt.</div>';
  const planAnnahme = () => !d.einstellungen.plan_bestaetigt;
  const iban = (s) => bankSichtbar() ? esc(String(s || '').replace(/(.{4})/g, '$1 ').trim()) : (s ? '•••• ' + esc(String(s).slice(-4)) : '');
  const bootTxt = (b) => b ? '„' + esc(b.name) + '“ · ' + esc(b.typ) : '–';
  const masse = (b) => H.zahl(b.laenge) + ' × ' + H.zahl(b.breite) + ' m';
  const mOpt = (sel, filter = () => true) => d.mitglieder.filter(filter).sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')).map((m) => '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + esc(m.nachname + ', ' + m.vorname) + ' (' + H.ART[m.art] + ')</option>').join('');
  const bOpt = (sel) => d.boote.slice().sort((a, b) => a.name.localeCompare(b.name, 'de')).map((b) => '<option value="' + b.id + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.name) + ' – ' + esc(Q.name(Q.mitglied(b.eigner_id))) + '</option>').join('');
  // Versicherung: Gültigkeit plus Nachweis-Stand (selbst angegeben → eingereicht → geprüft)
  const nachweisTag = (b) => b.vers_status === 'geprueft' ? '<span class="tag ok" title="geprüft' + (b.vers_geprueft_am ? ' am ' + H.datum(b.vers_geprueft_am) : '') + '">✓ geprüft</span>' : b.vers_status === 'eingereicht' ? '<span class="tag gast">Nachweis prüfen</span>' : '<span class="tag">ungeprüft</span>';
  const versTag = (b) => { const s = Q.versicherungsStatus(b, heute); return (s === 'ok' ? '<span class="tag ok">bis ' + H.datum(b.vers_bis) + '</span>' : s === 'bald' ? '<span class="tag warn">läuft ' + H.datum(b.vers_bis) + ' ab</span>' : s === 'fehlt' ? '<span class="tag rot">fehlt</span>' : '<span class="tag rot">abgelaufen ' + H.datum(b.vers_bis) + '</span>') + (s === 'fehlt' ? '' : ' ' + nachweisTag(b)); };
  const ZAHLART = { bar: 'bar', ueberweisung: 'Überweisung', karte: 'Karte', offen: 'Zahlart offen' };
  const zahlungText = (g) => esc(ZAHLART[g.zahlung] || g.zahlung || '') + ' · ' + (g.bezahlt_am ? '<span class="tag ok">bezahlt ' + H.kurz(g.bezahlt_am) + '</span>' : '<span class="tag warn">noch nicht bezahlt</span>');
  const platzName = (id) => { const p = Q.platz(id); if (!p) return '–'; return p.bez || ((p.box === 'L' ? 'Längsseits ' : 'Platz ') + p.nr); };
  function download(name, text, typ) {
    const blob = new Blob([text], { type: typ }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const csv = (zeilen) => '﻿' + zeilen.map((z) => z.map((v) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  function oeffnen(url) { if (!window.open(url, '_blank')) location.href = url; }

  /* Gastlieger: passt ein Platz für den ganzen Aufenthalt? Gleiche Regeln wie in der Datenbank:
   * nicht gesperrt, Boxmaße und Wassertiefe, kein anderer Gast, und an jedem Tag mit Dauerlieger ein grünes Schild. */
  const naechteVon = (von, n) => { const t = []; for (let i = 0; i < n; i++) t.push(H.tag(new Date(new Date(von + 'T12:00:00').getTime() + i * 864e5))); return t; };
  const abreise = (g) => H.tag(new Date(new Date(g.ankunft + 'T12:00:00').getTime() + g.naechte * 864e5));
  function platzPruefen(p, von, n, laenge, breite, tiefgang, ohneGast) {
    const gruende = []; let art = 'frei';
    if (p.gesperrt) gruende.push('Platz ist gesperrt');
    if (laenge && p.max_laenge && laenge > p.max_laenge) gruende.push('Boot überschreitet die Boxmaße (Länge ' + H.zahl(laenge, 1) + ' m, erlaubt ' + H.zahl(p.max_laenge, 1) + ' m)');
    if (breite && p.max_breite && breite > p.max_breite) gruende.push('Boot überschreitet die Boxmaße (Breite ' + H.zahl(breite, 1) + ' m, erlaubt ' + H.zahl(p.max_breite, 1) + ' m)');
    if (tiefgang && p.tiefe && tiefgang > p.tiefe) gruende.push('Tiefgang ' + H.zahl(tiefgang, 1) + ' m, Wassertiefe nur ' + H.zahl(p.tiefe, 1) + ' m');
    for (const t of naechteVon(von, n)) {
      const g = d.gaeste.find((x) => x.id !== ohneGast && x.platz_id === p.id && x.status !== 'storniert' && x.ankunft <= t && abreise(x) > t);
      if (g) { gruende.push('am ' + H.kurz(t) + ' schon an „' + g.bootsname + '“ vergeben'); break; }
      if (Q.belegungPlatz(Number(t.slice(0, 4)), 'sommer', p.id)) {
        if (Q.abwesendAm(p.id, t)) { art = 'unterwegs'; continue; }
        const aw = Q.abwesendAm(p.id, von); const zurueck = !aw && d.abwesenheiten.find((a) => a.platz_id === p.id && a.bis === tagVor(t, 1));
        gruende.push(aw ? 'Aufenthalt überschreitet die Freigabe (Eigner zurück am ' + H.datum(aw.bis) + ')' : zurueck ? 'der Eigner ist zurück (grünes Schild endete am ' + H.datum(zurueck.bis) + ')' : 'am ' + H.kurz(t) + ' liegt hier der Dauerlieger (kein grünes Schild)');
        break;
      }
    }
    return { ok: !gruende.length, art, gruende };
  }
  function verfuegbarePlaetze(von, naechte, laenge, breite, tiefgang, ohneGast) {
    return d.liegeplaetze.map((p) => ({ p, ...platzPruefen(p, von, naechte, laenge, breite, tiefgang, ohneGast) })).filter((x) => x.ok)
      .sort((a, b) => (a.art === 'frei' ? 0 : 1) - (b.art === 'frei' ? 0 : 1) || a.p.max_laenge - b.p.max_laenge);
  }

  /* ============================================================ Übersicht */
  const V = {};
  V.uebersicht = (main) => {
    const st = {}; if (imSommer) d.liegeplaetze.forEach((p) => { const s2 = Q.statusWasser(p, SAISON, heute); st[s2] = (st[s2] || 0) + 1; });
    const versProbleme = d.boote.filter((b) => ['abgelaufen', 'bald', 'fehlt'].includes(Q.versicherungsStatus(b, heute)));
    const nachweise = d.boote.filter((b) => b.vers_status === 'eingereicht');
    const zuSchwer = d.boote.filter((b) => b.gewicht_t > 10);
    const anfragen = d.gaeste.filter((g) => g.status === 'angemeldet');
    const gaesteHeute = d.gaeste.filter((g) => g.status !== 'storniert' && g.platz_id && g.ankunft <= heute && abreise(g) > heute);
    const winterOffen = G.vorschau(d, SAISON, 'winter', heute).filter((x) => !x.schon_abgerechnet && x.summe > 0);
    const offeneRe = d.rechnungen.filter((r) => Q.rest(r) > 0);
    const sepaOffen = offeneRe.filter((r) => r.sepa && !r.sepa_lauf);
    const rueck = d.rechnungen.filter((r) => Q.rstatus(r, heute) === 'ruecklastschrift');
    const schaeden = (d.aufgaben || []).filter((t) => t.status !== 'erledigt');
    const wasserVergeben = Q.belegungen(SAISON, 'sommer').filter((b) => b.platz_typ === 'wasser').length;
    const naechste = (d.saisons || []).find((x) => x.jahr === SAISON + 1);
    const e = d.einstellungen;
    // Drei Gruppen: Heute wichtig (Tagesgeschäft), Anstehend, Einrichtung abschließen
    const heuteL = [], anst = [], einr = [];
    const add = (liste, tab, txt, art, extra) => liste.push({ tab, txt, art, extra: extra || '' });
    // Konflikte: Gäste, deren Platz nicht mehr passt (z. B. Eigner früher zurück)
    const konflikte = d.gaeste.filter((g) => g.platz_id && !['storniert', 'abgereist'].includes(g.status) && abreise(g) > heute).map((g) => {
      const ab = g.ankunft > heute ? g.ankunft : heute; const rest = Math.round((new Date(abreise(g) + 'T12:00:00') - new Date(ab + 'T12:00:00')) / 864e5);
      const p = Q.platz(g.platz_id); const pr = p ? platzPruefen(p, ab, rest, g.laenge, g.breite, g.tiefgang, g.id) : { ok: false, gruende: ['Platz unbekannt'] };
      return pr.ok ? null : { g, grund: pr.gruende[0] };
    }).filter(Boolean);
    const ankuenfte = d.gaeste.filter((g) => g.ankunft === heute && g.status !== 'storniert');
    if (darf('gaeste')) konflikte.forEach(({ g, grund }) => add(heuteL, 'gaeste', 'Konflikt ' + platzName(g.platz_id) + ': Gast „' + esc(g.bootsname) + '“ – ' + esc(grund), 'rot', 'data-gast="' + g.id + '"'));
    if (anfragen.length) add(heuteL, 'gaeste', anfragen.length + ' Gast-Anmeldung' + (anfragen.length > 1 ? 'en' : '') + ' per QR-Code warten auf einen Platz', 'gast');
    if (ankuenfte.length && darf('gaeste')) add(heuteL, 'gaeste', ankuenfte.length + (ankuenfte.length === 1 ? ' Gast kommt' : ' Gäste kommen') + ' heute an: ' + ankuenfte.map((g) => '„' + esc(g.bootsname) + '“').join(', '), 'gast');
    const dringend = schaeden.filter((t) => t.prioritaet === 'hoch' || (t.faellig && t.faellig < heute));
    if (dringend.length && darf('aufgaben')) add(heuteL, 'aufgaben', dringend.length + (dringend.length === 1 ? ' dringender oder überfälliger Schaden' : ' dringende oder überfällige Schäden/Wartungen') + ': ' + dringend.slice(0, 2).map((t) => esc(t.titel)).join(', '), 'rot');
    if (rueck.length && darf('abrechnung')) add(heuteL, 'abrechnung', rueck.length + ' Rücklastschrift' + (rueck.length > 1 ? 'en' : '') + ' – Mitglied ansprechen oder erneut einziehen', 'rot');
    (d.arbeitseinsaetze || []).filter((x) => x.datum === heute).forEach((x) => { if (darf('arbeitsdienst')) add(heuteL, 'arbeitsdienst', 'Heute Arbeitseinsatz „' + esc(x.titel) + '“ – QR-Plakat aushängen', 'gast'); });
    const gemeldetAD = d.arbeitsdienst.filter((a) => a.status === 'eingereicht');
    if (gemeldetAD.length && darf('arbeitsdienst')) add(anst, 'arbeitsdienst', gemeldetAD.length + ' gemeldete Arbeitsstunden bestätigen', 'gast');
    const neueAntraege = (d.antraege || []).filter((a) => a.status === 'neu');
    if (neueAntraege.length && darf('antraege')) add(anst, 'antraege', neueAntraege.length + ' Aufnahmeantr' + (neueAntraege.length > 1 ? 'äge warten' : 'ag wartet') + ' auf den Vorstand', 'warn');
    if (winterOffen.length && darf('abrechnung')) add(anst, 'abrechnung', 'Winterlager ' + SAISON + '/' + String(SAISON + 1).slice(2) + ' abrechnen (' + winterOffen.length + ' Mitglieder, ' + H.geld(winterOffen.reduce((s, x) => s + x.summe, 0)) + ')', 'warn');
    if (sepaOffen.length && darf('abrechnung')) add(anst, 'abrechnung', sepaOffen.length + ' Rechnungen warten auf die Lastschrift-Datei für die Bank', 'warn');
    if (nachweise.length && darf('boote')) add(anst, 'boote', nachweise.length + ' Versicherungsnachweis' + (nachweise.length > 1 ? 'e' : '') + ' prüfen', 'gast');
    if (versProbleme.length && darf('boote')) add(anst, 'boote', versProbleme.length + ' Boote: Versicherung abgelaufen, fehlt oder läuft in 30 Tagen ab', 'warn');
    if (zuSchwer.length && darf('boote')) add(anst, 'boote', zuSchwer.length + ' Boot über 10 t – laut Hafenbetriebsordnung nicht zulässig', 'warn');
    const normal = schaeden.filter((t) => !dringend.includes(t));
    if (normal.length && darf('aufgaben')) add(anst, 'aufgaben', normal.length + ' offene Schäden/Wartungen', 'warn');
    if (!e.steuer_hinweis && darf('einstellungen')) add(einr, 'einstellungen', 'Steuerhinweis für Rechnungen festlegen (mit dem Steuerberater klären)', 'warn');
    if (darf('einstellungen') && !(SEPA.ibanGueltig(e.iban) && SEPA.glaeubigerGueltig(e.glaeubiger_id))) add(einr, 'einstellungen', 'Vereinskonto und Gläubiger-ID für die Lastschrift eintragen', 'warn');
    if (!e.arbeitsdienst_bestaetigt && rolle === 'vorstand') add(einr, 'einstellungen', 'Regeln für den Arbeitsdienst beschließen (Soll, Befreiungen, Übertrag, Ersatz)', 'warn');
    if (planAnnahme() && darf('belegung')) add(einr, 'plaetze', 'Boxmaße, Brücken und Wassertiefen eintragen und bestätigen', 'warn');
    if (!naechste && darf('einstellungen')) add(einr, 'einstellungen', 'Saisontermine ' + (SAISON + 1) + ' (Auslagern/Einlagern) eintragen', 'warn');
    const warte = d.warteliste.filter((w) => w.status === 'wartend').length;
    const yy = String(SAISON + 1).slice(2);
    const karten = imSommer
      ? '<div class="kz"><small>Liegeplätze belegt</small><strong>' + ((st.belegt || 0) + (st.unterwegs || 0) + (st.saisongast || 0)) + ' / ' + d.liegeplaetze.length + '</strong><span>' + (st.frei || 0) + ' frei · ' + (st.gesperrt || 0) + ' gesperrt</span></div>' +
        '<div class="kz"><small>Eigner unterwegs</small><strong style="color:var(--gruen)">' + (st.unterwegs || 0) + '</strong><span>grünes Schild heute</span></div>' +
        '<div class="kz"><small>Gastlieger</small><strong style="color:#8a5e05">' + gaesteHeute.length + '</strong><span>heute im Hafen · ' + anfragen.length + (anfragen.length === 1 ? ' Anfrage' : ' Anfragen') + '</span></div>' +
        '<div class="kz"><small>Winterlager</small><strong>' + Q.belegungen(SAISON, 'winter').length + '</strong><span>Boote an Land</span></div>'
      : '<div class="kz"><small>Winterlager ' + SAISON + '/' + yy + '</small><strong>' + Q.belegungen(SAISON, 'winter').length + '</strong><span>Boote an Land</span></div>' +
        '<div class="kz"><small>Wasserplätze Sommer ' + SAISON + '</small><strong>' + wasserVergeben + ' / ' + d.liegeplaetze.length + '</strong><span>vergeben (Saison beendet)</span></div>' +
        '<div class="kz"><small>Nächstes Auslagern</small><strong style="font-size:20px">' + (naechste ? H.datum(naechste.auslagern) : 'Termin offen') + '</strong><span>' + (naechste ? 'Saison ' + (SAISON + 1) : 'noch nicht eingetragen') + '</span></div>';
    const handy = window.matchMedia('(max-width: 860px)').matches;
    const zeilen = (l) => '<table class="tab todo"><tbody>' + l.map((x) => '<tr class="klickbar" data-gehe="' + x.tab + '" ' + x.extra + '><td><span class="tag ' + x.art + '">' + (x.art === 'rot' ? 'wichtig' : x.art === 'gast' ? (x.tab === 'boote' ? 'prüfen' : 'Gäste') : 'offen') + '</span></td><td>' + x.txt + '</td><td class="r">' + (darf(x.tab) ? '→' : '') + '</td></tr>').join('') + '</tbody></table>';
    const gruppe = (titel, l, offen, leer) => !l.length && !leer ? '' : '<details class="panel todo-gruppe"' + (offen ? ' open' : '') + '><summary><h2>' + titel + '</h2><span class="tag' + (l.length ? '' : ' ok') + '">' + l.length + '</span></summary>' + (l.length ? zeilen(l) : '<p class="leer">' + leer + '</p>') + '</details>';
    main.innerHTML = kopf('Moin, ' + ROLLEN[rolle].name + '!', 'Stand heute, ' + H.datum(heute) + ' · ' + (imSommer ? 'Sommer ' + SAISON + ' – die Boote sind im Wasser' : 'Winterpause seit ' + H.datum(sd.einlagern) + ' (Winterlager ' + SAISON + '/' + yy + ')'),
      darf('plan') ? '<button class="btn dunkel" data-gehe="plan">Hafenplan öffnen</button>' : '') + DEMO +
      gruppe('Heute wichtig', heuteL, true, 'Heute ist nichts Dringendes.') +
      gruppe('Anstehend', anst, !handy) +
      gruppe('Einrichtung abschließen', einr, !handy && heuteL.length + anst.length < 6) +
      '<div class="karten">' + karten +
      '<div class="kz"><small>Warteliste</small><strong>' + warte + '</strong><span>Mitglieder warten</span></div>' +
      (darf('abrechnung') ? '<div class="kz"><small>Offene Rechnungen</small><strong>' + H.geld(offeneRe.reduce((s, r) => s + Q.rest(r), 0)) + '</strong><span>' + offeneRe.length + ' Rechnungen</span></div>' : '') + '</div>';
    main.querySelectorAll('[data-gast]').forEach((z) => z.addEventListener('click', (ev) => { ev.stopPropagation(); gastForm(d.gaeste.find((g) => g.id === z.dataset.gast)); }, true));
  };

  /* ============================================================ Hafenplan */
  V.plan = (main) => {
    const legende = planStand.modus === 'sommer'
      ? '<span><i style="background:#24396f"></i>belegt</span><span><i style="background:var(--gruen)"></i>Eigner unterwegs (grünes Schild)</span><span><i style="background:var(--gast)"></i>Gastlieger</span><span><i style="background:var(--lila)"></i>Saison-Gast</span><span><i style="background:#fff"></i>frei</span><span><i style="background:repeating-linear-gradient(45deg,#fff 0 2px,#8890a8 2px 4px)"></i>gesperrt</span><span><i style="background:#4a5a86"></i>an Land belegt</span>'
      : '<span><i style="background:#4a5a86"></i>Palette/Halle/Außen belegt</span><span><i style="background:#fff"></i>frei</span><span><i style="background:rgba(255,255,255,.55)"></i>Wasserplatz (Winterpause)</span>';
    const anders = planStand.modus === 'sommer' && planStand.datum !== heute;
    main.innerHTML = kopf('Hafenplan', planStand.modus === 'sommer' ? 'Sommer ' + SAISON + ' · Stand am ' + H.datum(planStand.datum) + ' (' + stichtagText(planStand.datum) + ')' : 'Winterlager ' + SAISON + '/' + String(SAISON + 1).slice(2) + (imSommer ? '' : ' · Stand heute'),
      '<a class="btn" href="https://www.google.com/maps/search/?api=1&query=53.91139%2C10.70111" target="_blank" rel="noopener">Google Maps</a><a class="btn" href="https://maps.apple.com/?ll=53.91139,10.70111&q=Schwartauer%20Segler-Verein&z=17" target="_blank" rel="noopener">Apple Karten</a>') +
      (anders ? '<div class="hinweis warn stichtag"><span><strong>' + stichtagText(planStand.datum) + ':</strong> Du siehst den Stand am ' + H.datum(planStand.datum) + ' – nicht den heutigen' + (imSommer ? '' : ' (heute ist Winterpause)') + '.</span><button class="btn klein" id="zu-heute">Zum heutigen Stand</button></div>' : '') +
      '<div class="plan-layout"><div class="plan-box"><div class="plan-leiste">' +
      '<button class="btn klein' + (planStand.modus === 'sommer' ? ' aktiv' : '') + '" data-modus="sommer">Sommer (Wasser)</button><button class="btn klein' + (planStand.modus === 'winter' ? ' aktiv' : '') + '" data-modus="winter">Winter (Land)</button>' +
      (planStand.modus === 'sommer' ? '<input type="date" id="plan-datum" value="' + planStand.datum + '" min="' + sd.auslagern + '" max="' + sd.einlagern + '" aria-label="Stichtag">' : '') +
      '<span class="trenn"></span>' + [['gesamt', 'Gesamt'], ['ost', 'Ost'], ['west', 'West'], ['schwimm', 'Schwimm'], ['land', 'Land']].map(([k, n]) =>
        '<button class="btn klein' + (planStand.ansicht === k ? ' aktiv' : '') + '" data-ansicht="' + k + '">' + n + '</button>').join('') +
      '</div><div class="plan-flaeche" id="plan"></div><div class="legende">' + legende + '</div></div><aside class="detail" id="detail"></aside></div>' +
      '<p class="hinweis" style="margin-top:12px">Schematischer Plan nach Luftbild. ' + (planAnnahme() ? 'Zuordnung, Nummerierung und Boxmaße sind eine <strong>Annahme</strong>, bis der Verein sie unter „Liegeplätze“ bestätigt – die Platzempfehlung für Gäste ist bis dahin nur eine Orientierung. ' : '') + 'Tippe auf einen Platz für Details; mit „Ost / West / Schwimm“ zoomst du heran und siehst die Platznummern.</p>';
    const zh = $('#zu-heute'); if (zh) zh.addEventListener('click', () => { if (imSommer) planStand.datum = heute; else { planStand.modus = 'winter'; planStand.ansicht = 'land'; } planStand.markiere = null; zeige('plan'); });
    const svg = PLAN.zeichnen($('#plan'), { namen: true, modus: planStand.modus, saison: SAISON, datum: planStand.datum, ansicht: planStand.ansicht, markiere: planStand.markiere, onKlick: (id) => { planStand.markiere = id; detail(id); markieren(id); } });
    function markieren(id) { svg.querySelectorAll('.markiert').forEach((x) => x.classList.remove('markiert')); const g = svg.querySelector('[data-platz="' + id + '"]'); if (g) g.classList.add('markiert'); }
    main.querySelectorAll('[data-ansicht]').forEach((b) => b.addEventListener('click', () => {
      planStand.ansicht = b.dataset.ansicht; PLAN.zoomen(svg, planStand.ansicht);
      main.querySelectorAll('[data-ansicht]').forEach((x) => x.classList.toggle('aktiv', x === b));
    }));
    main.querySelectorAll('[data-modus]').forEach((b) => b.addEventListener('click', () => { planStand.modus = b.dataset.modus; planStand.markiere = null; if (planStand.modus === 'winter' && planStand.ansicht === 'gesamt') planStand.ansicht = 'land'; if (planStand.modus === 'sommer' && planStand.ansicht === 'land') planStand.ansicht = 'gesamt'; zeige('plan'); }));
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
    el.innerHTML = '<h2>Für Gäste frei</h2><p class="unter">am ' + H.datum(tagX) + ' (' + stichtagText(tagX) + ') – freie Plätze und Plätze mit grünem Schild</p>' +
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
    el.innerHTML = '<h2>' + (p.box === 'L' ? 'Längsseits ' : 'Platz ') + esc(p.nr) + '</h2><p class="unter">' + H.BRUECKE[p.bruecke] + ' · ' + (p.box === 'L' ? 'Sondertarif' : 'Box ' + p.box) + ' · max. ' + H.zahl(p.max_laenge, 1) + ' × ' + H.zahl(p.max_breite, 1) + ' m' + (p.tiefe ? ' · Wassertiefe ' + H.zahl(p.tiefe, 1) + ' m' : '') + (p.strom ? ' · Strom' : '') + '</p>' +
      (planStand.modus === 'sommer' && tagX !== heute ? '<p class="hinweis" style="margin:0 0 8px">Status am ' + H.datum(tagX) + ' (' + stichtagText(tagX) + ')</p>' : '') +
      (d.aufgaben || []).filter((t) => t.platz_id === id && t.status !== 'erledigt').map((t) => '<p class="hinweis warn">' + esc(t.titel) + ' <small>(' + ({ offen: 'offen', in_arbeit: 'in Arbeit' })[t.status] + ')</small></p>').join('') +
      '<p><span class="tag ' + ({ belegt: '', unterwegs: 'gruen', gast: 'gast', saisongast: 'lila', frei: 'ok', gesperrt: 'rot' })[Q.statusWasser(p, SAISON, tagX)] + '">' + esc(status) + '</span></p>' +
      (p.gesperrt ? '<p class="hinweis warn">' + esc(p.notiz || 'Gesperrt') + '</p>' : '') +
      (b ? '<dl><dt>Boot</dt><dd>' + bootTxt(b) + '</dd><dt>Maße</dt><dd>' + masse(b) + ' · Tiefgang ' + H.zahl(b.tiefgang) + ' m</dd><dt>Gewicht</dt><dd>' + H.zahl(b.gewicht_t, 1) + ' t' + (b.gewicht_t > 10 ? ' <span class="tag rot">über 10 t</span>' : '') + '</dd>' +
        '<dt>Versicherung</dt><dd>' + versTag(b) + '</dd><dt>Eigner</dt><dd>' + esc(Q.name(m)) + ' <span class="tag">' + H.ART[m.art] + '</span></dd><dt>Telefon</dt><dd><a href="tel:' + esc((m.tel || '').replace(/\s/g, '')) + '">' + esc(m.tel) + '</a></dd></dl>' +
        (probleme.length ? '<p class="hinweis warn" style="margin-top:10px">Passt nicht: ' + probleme.map(esc).join(', ') + '</p>' : '') + '<div class="bootsfoto" id="bootsfoto"></div>' : '<p class="leer">Kein Dauerlieger in dieser Saison.</p>') +
      (gast ? '<div class="abschnitt"><h3>Gastlieger</h3><dl><dt>Boot</dt><dd>„' + esc(gast.bootsname) + '“ · ' + H.zahl(gast.laenge, 1) + ' m</dd><dt>Skipper</dt><dd>' + esc(gast.skipper) + (gast.herkunft ? ' · ' + esc(gast.herkunft) : '') + '</dd><dt>Zeitraum</dt><dd>' + H.kurz(gast.ankunft) + ', ' + gast.naechte + ' Nacht' + (gast.naechte > 1 ? 'e' : '') + '</dd><dt>Zahlung</dt><dd>' + zahlungText(gast) + '</dd></dl></div>' : '') +
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
    if (b) HF.dok.liste({ boot_id: b.id }).then((l) => { const foto = l.find((x) => x.art === 'foto'); if (!foto) return; return HF.dok.inhalt(foto.id).then((x) => { const box = $('#bootsfoto'); if (box && x) box.innerHTML = '<img alt="Foto von „' + esc(b.name) + '“" src="data:' + x.typ + ';base64,' + x.inhalt + '">'; }); }).catch(() => {});
    if (window.matchMedia('(max-width: 1200px)').matches) { const dt = document.querySelector('.detail'); if (dt) dt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  /* ============================================================ Liegeplätze */
  V.plaetze = (main) => {
    const tagX = planStand.datum;
    main.innerHTML = kopf('Liegeplätze', d.liegeplaetze.length + ' Wasserplätze · ' + d.landplaetze.length + ' Landplätze', '<button class="btn" id="csv">CSV</button>') +
      (planAnnahme() ? '<p class="hinweis warn">Boxmaße und Brückenzuordnung sind noch <strong>Annahmen</strong>. ' + (darf('belegung') ? 'Bitte die echten Maße (und wenn bekannt die Wassertiefe) über „Maße“ eintragen und danach unter Einstellungen bestätigen.' : 'Der Vorstand bzw. die Brückenwartin tragen die echten Maße ein.') + '</p>' : '') +
      '<div class="filter"><input class="suche" id="such" placeholder="Platz, Boot oder Eigner …"><select class="suche" id="br" style="min-width:0"><option value="">Alle Brücken</option>' + Object.entries(H.BRUECKE).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
      '<div class="panel"><table class="tab"><thead><tr><th>Platz</th><th>Brücke</th><th>Box</th><th class="r">max. L × B</th><th class="r">Tiefe</th><th>Boot</th><th>Eigner</th><th>Status ' + (tagX === heute ? 'heute' : H.kurz(tagX) + ' (' + stichtagText(tagX) + ')') + '</th>' + (darf('belegung') ? '<th></th>' : '') + '</tr></thead><tbody id="tb"></tbody></table></div>';
    const render = () => {
      const f = $('#such').value.toLowerCase(), br = $('#br').value;
      $('#tb').innerHTML = d.liegeplaetze.filter((p) => !br || p.bruecke === br).map((p) => {
        const bel = Q.belegungPlatz(SAISON, 'sommer', p.id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
        const s = Q.statusWasser(p, SAISON, tagX);
        const txt = (p.nr + ' ' + (b ? b.name : '') + ' ' + (m ? Q.name(m) : '')).toLowerCase();
        if (f && !txt.includes(f)) return '';
        return '<tr class="klickbar" data-p="' + p.id + '"><td><strong>' + esc(p.nr) + '</strong></td><td>' + H.BRUECKE[p.bruecke] + '</td><td>' + (p.box === 'L' ? 'Sonder' : p.box) + '</td><td class="r">' + H.zahl(p.max_laenge, 1) + ' × ' + H.zahl(p.max_breite, 1) + '</td><td class="r">' + (p.tiefe ? H.zahl(p.tiefe, 1) + ' m' : '–') + '</td>' +
          '<td>' + (b ? esc(b.name) + (Q.passt(b, p).length ? ' <span class="tag warn">passt nicht</span>' : '') : '') + '</td><td>' + (m ? esc(Q.name(m)) : '') + '</td><td><span class="tag ' + ({ unterwegs: 'gruen', gast: 'gast', saisongast: 'lila', frei: 'ok', gesperrt: 'rot' })[s] + '">' + PLAN.STATUS_TEXT[s].replace(' – grünes Schild', '') + '</span></td>' + (darf('belegung') ? '<td class="r"><button class="btn klein" data-masse="' + p.id + '">Maße</button></td>' : '') + '</tr>';
      }).join('');
    };
    render(); $('#such').addEventListener('input', render); $('#br').addEventListener('change', render);
    $('#tb').addEventListener('click', (e) => { const m = e.target.closest('[data-masse]'); if (m) { e.stopPropagation(); return platzForm(Q.platz(m.dataset.masse)); } const r = e.target.closest('[data-p]'); if (r) { planStand.markiere = r.dataset.p; zeige('plan'); } });
    $('#csv').addEventListener('click', () => download('liegeplaetze.csv', csv([['Platz', 'Brücke', 'Box', 'max. Länge', 'max. Breite', 'Strom', 'Boot', 'Eigner', 'Mitgliedsart']].concat(d.liegeplaetze.map((p) => {
      const bel = Q.belegungPlatz(SAISON, 'sommer', p.id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
      return [p.nr, H.BRUECKE[p.bruecke], p.box, H.zahl(p.max_laenge, 1), H.zahl(p.max_breite, 1), p.strom ? 'ja' : 'nein', b ? b.name : '', m ? Q.name(m) : '', m ? H.ART[m.art] : ''];
    }))), 'text/csv'));
  };

  function platzForm(p) {
    const el = modal('<h2>' + esc(platzName(p.id)) + ' – Maße</h2><p class="hinweis">Diese Werte nutzt die Platzempfehlung für Gäste und die Warteliste. Wassertiefe leer lassen, wenn sie nicht bekannt ist.</p><form id="f" class="form">' +
      '<label class="feld">Box<select name="box">' + ['I', 'II', 'III', 'L'].map((b) => '<option value="' + b + '"' + (p.box === b ? ' selected' : '') + '>' + (b === 'L' ? 'Längsseits (Sondertarif)' : 'Box ' + b) + '</option>').join('') + '</select><small>bestimmt die Liegegebühr</small></label>' +
      '<label class="feld">Brücke<select name="bruecke">' + Object.entries(H.BRUECKE).map(([k, v]) => '<option value="' + k + '"' + (p.bruecke === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label>' +
      '<label class="feld">max. Länge (m)<input name="max_laenge" type="number" step="0.01" min="1" required value="' + (p.max_laenge || '') + '"></label>' +
      '<label class="feld">max. Breite (m)<input name="max_breite" type="number" step="0.01" min="0.5" required value="' + (p.max_breite || '') + '"></label>' +
      '<label class="feld">Wassertiefe (m)<input name="tiefe" type="number" step="0.1" min="0.3" value="' + (p.tiefe || '') + '"><small>bei mittlerem Wasser</small></label>' +
      '<label class="feld check"><input type="checkbox" name="strom"' + (p.strom ? ' checked' : '') + '> Strom am Platz</label>' +
      '<label class="feld voll">Notiz<input name="notiz" value="' + esc(p.notiz || '') + '"></label></form>' +
      '<div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    $('#ok', el).addEventListener('click', () => {
      const fm = $('#f', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm));
      Object.assign(p, { box: x.box, bruecke: x.bruecke, max_laenge: Number(x.max_laenge), max_breite: Number(x.max_breite), tiefe: x.tiefe ? Number(x.tiefe) : null, strom: !!x.strom, notiz: x.notiz });
      speichern('Maße gespeichert.'); zu(); zeige(tab);
    });
  }

  /* ============================================================ Boote */
  V.boote = (main) => {
    main.innerHTML = kopf('Boote', d.boote.length + ' Boote im Verein', '<button class="btn primaer" id="neu">+ Boot anmelden</button>') +
      '<div class="filter"><input class="suche" id="such" placeholder="Name, Typ, Segelnummer, Eigner …"><label class="feld check"><input type="checkbox" id="probl"> nur mit Handlungsbedarf</label></div>' +
      '<div class="panel"><table class="tab"><thead><tr><th>Boot</th><th>Typ</th><th class="r">L × B</th><th class="r">Gewicht</th><th>Eigner</th><th>Platz Sommer</th><th>Versicherung</th></tr></thead><tbody id="tb"></tbody></table></div>';
    const render = () => {
      const f = $('#such').value.toLowerCase(), nurP = $('#probl').checked;
      $('#tb').innerHTML = d.boote.slice().sort((a, b) => a.name.localeCompare(b.name, 'de')).map((b) => {
        const m = Q.mitglied(b.eigner_id); const bel = Q.belegungBoot(SAISON, 'sommer', b.id);
        const vs = Q.versicherungsStatus(b, heute); const probl = vs !== 'ok' || b.vers_status === 'eingereicht' || b.gewicht_t > 10 || (bel && bel.platz_typ === 'wasser' && Q.passt(b, Q.platz(bel.platz_id)).length);
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
      (neu ? '<p class="hinweis">Den Versicherungsnachweis kannst du nach dem Speichern hochladen.</p>' : '<div class="abschnitt nachweis"><h3>Versicherungsnachweis</h3><p id="nw-stand"></p><div id="nw-liste"><p class="leer">Wird geladen …</p></div>' +
        '<div class="aktionen"><label class="btn">Nachweis hochladen<input type="file" id="nw-datei" accept="application/pdf,image/*" hidden></label><label class="btn">Bootsfoto<input type="file" id="foto-datei" accept="image/*" hidden></label>' +
        '<button class="btn gruen" id="nw-ok"' + (b.vers_status === 'geprueft' ? ' hidden' : '') + '>Als geprüft markieren</button>' + (verlaufErlaubt() ? '<button class="btn" id="b-verlauf">Verlauf</button>' : '') + '</div></div>') +
      '<div class="modal-fuss">' + (neu ? '' : '<button class="btn gefahr links" id="weg">Abmelden</button>') + '<button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    $('#ok', el).addEventListener('click', () => {
      const f = $('#f', el); if (!f.reportValidity()) return;
      const x = Object.fromEntries(new FormData(f)); ['laenge', 'breite', 'tiefgang', 'gewicht_t'].forEach((k) => { x[k] = Number(x[k]) || 0; });
      if (x.gewicht_t > 10 && !confirm('Das Boot wiegt mehr als 10 t. Laut Hafenbetriebsordnung ist das für Steg und Kran nicht zulässig. Trotzdem speichern?')) return;
      if (!neu && (x.versicherung !== (b.versicherung || '') || x.vers_bis !== (b.vers_bis || '')) && b.vers_status === 'geprueft') x.vers_status = null;   // neue Angaben → neu prüfen
      if (neu) d.boote.push({ id: H.uid('B'), vers_status: null, ...x }); else Object.assign(b, x);
      speichern('Boot gespeichert.'); zu(); zeige(tab);
    });
    if (!neu) {
      const stand = () => { $('#nw-stand', el).innerHTML = nachweisTag(b) + ' ' + (b.vers_status === 'geprueft' ? 'am ' + H.datum(b.vers_geprueft_am) + (b.vers_geprueft_von ? ' von ' + esc(b.vers_geprueft_von) : '') : b.vers_status === 'eingereicht' ? 'Das Mitglied hat einen Nachweis hochgeladen – bitte ansehen und prüfen.' : 'Angaben ohne geprüften Nachweis.'); };
      const liste = () => HF.dok.liste({ boot_id: b.id }).then((l) => {
        $('#nw-liste', el).innerHTML = l.length ? '<table class="tab"><tbody>' + l.map((x) => '<tr><td>' + esc(x.name) + '<br><small style="color:var(--muted)">' + new Date(x.hochgeladen).toLocaleDateString('de-DE') + ' · ' + esc(x.von || '') + '</small></td><td class="r nw"><button class="btn klein" data-dok="' + x.id + '">Ansehen</button> <button class="btn klein gefahr" data-dok-weg="' + x.id + '">Löschen</button></td></tr>').join('') + '</tbody></table>' : '<p class="leer">Noch kein Nachweis hochgeladen.</p>';
      }).catch((e) => { $('#nw-liste', el).innerHTML = '<p class="hinweis warn">' + esc(e.message) + '</p>'; });
      stand(); liste();
      $('#nw-liste', el).addEventListener('click', (e) => {
        const a = e.target.closest('[data-dok]'); if (a) return HF.datei.oeffnen(a.dataset.dok).catch((x) => toast(x.message, 'fehler'));
        const w = e.target.closest('[data-dok-weg]'); if (w && confirm('Dokument löschen?')) HF.dok.loeschen(w.dataset.dokWeg).then(liste, (x) => toast(x.message, 'fehler'));
      });
      $('#nw-datei', el).addEventListener('change', async (e) => {
        try { const x = await HF.datei.lesen(e.target.files[0]); await HF.dok.hochladen({ ...x, boot_id: b.id, mitglied_id: b.eigner_id, art: 'versicherung' }, ROLLEN[rolle].name); toast('Nachweis gespeichert.'); liste(); }
        catch (x) { toast(x.message, 'fehler'); } e.target.value = '';
      });
      $('#foto-datei', el).addEventListener('change', async (e) => {
        try { const x = await HF.datei.lesen(e.target.files[0]); await HF.dok.hochladen({ ...x, boot_id: b.id, mitglied_id: b.eigner_id, art: 'foto', name: 'Foto ' + b.name + '.jpg' }, ROLLEN[rolle].name); toast('Foto gespeichert – erscheint im Hafenplan.'); liste(); }
        catch (x) { toast(x.message, 'fehler'); } e.target.value = '';
      });
      $('#nw-ok', el).addEventListener('click', () => { Object.assign(b, { vers_status: 'geprueft', vers_geprueft_am: heute, vers_geprueft_von: ROLLEN[rolle].name }); speichern('Nachweis als geprüft vermerkt.'); stand(); $('#nw-ok', el).hidden = true; });
      const bv = $('#b-verlauf', el); if (bv) bv.addEventListener('click', () => verlaufDialog('boote', b.id, b.name));
    }
    if (!neu) $('#weg', el).addEventListener('click', () => {
      if (d.belegungen.some((x) => x.boot_id === b.id)) return toast('Das Boot ist noch einem Platz zugeordnet – erst die Belegung lösen.', 'fehler');
      if (!confirm('„' + b.name + '“ abmelden (z. B. nach Verkauf)?')) return;
      d.boote = d.boote.filter((x) => x.id !== b.id); speichern('Boot abgemeldet.'); zu(); zeige(tab);
    });
  }

  /* ============================================================ Eigner & Mitglieder */
  V.eigner = (main) => {
    const mitgl = d.mitglieder.filter((m) => Q.istMitglied(m, heute)).length;
    main.innerHTML = kopf('Mitglieder & Eigner', mitgl + ' Mitglieder · ' + (d.mitglieder.length - mitgl) + ' weitere (Saison-Gäste, Ausgetretene)',
      (bankSichtbar() ? '<button class="btn" id="import">Mitglieder importieren (CSV)</button>' : '') + '<button class="btn primaer" id="neu">+ Person</button>') +
      (bankSichtbar() ? '' : '<p class="hinweis">Bankdaten sind für deine Rolle ausgeblendet.</p>') +
      '<div class="filter"><input class="suche" id="such" placeholder="Name, Nr., Ort …"><select class="suche" id="artf" style="min-width:0"><option value="">Alle Arten</option>' +
      Object.entries(H.ART).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div>' +
      '<div class="panel"><table class="tab"><thead><tr><th>Nr.</th><th>Name</th><th>Art</th><th>Boot(e)</th><th>Telefon</th><th>Kfz</th><th>Lastschrift</th></tr></thead><tbody id="tb"></tbody></table></div>';
    const render = () => {
      const f = $('#such').value.toLowerCase(), af = $('#artf').value;
      $('#tb').innerHTML = d.mitglieder.slice().sort((a, b) => a.nachname.localeCompare(b.nachname, 'de')).filter((m) => (!f || (m.nr + ' ' + Q.name(m) + ' ' + m.ort).toLowerCase().includes(f)) && (!af || m.art === af)).map((m) =>
        '<tr class="klickbar' + (m.austritt && m.austritt <= heute ? ' blass' : '') + '" data-m="' + m.id + '"><td>' + esc(m.nr) + '</td><td><strong>' + esc(m.nachname) + '</strong>, ' + esc(m.vorname) + (m.austritt && m.austritt <= heute ? ' <span class="tag">ausgetreten</span>' : '') + '</td><td><span class="tag">' + (H.ART[m.art] || esc(m.art)) + '</span></td>' +
        '<td>' + Q.booteVon(m.id).map((b) => esc(b.name)).join(', ') + '</td><td class="nw">' + esc(m.tel || '') + '</td><td class="nw">' + esc(m.kfz || '') + '</td>' +
        '<td>' + (m.iban && m.mandat_ref ? '<span class="tag ok">Mandat ' + esc(m.mandat_ref) + '</span>' : '<span class="tag warn">kein Mandat</span>') + '</td></tr>').join('');
    };
    render(); $('#such').addEventListener('input', render); $('#artf').addEventListener('change', render);
    $('#tb').addEventListener('click', (e) => { const r = e.target.closest('[data-m]'); if (r) mitgliedForm(Q.mitglied(r.dataset.m)); });
    $('#neu').addEventListener('click', () => mitgliedForm({ art: 'ausuebend' }));
    if ($('#import')) $('#import').addEventListener('click', importDialog);
  };
  function mitgliedForm(m) {
    const neu = !m.id; const bank = bankSichtbar();
    const el = modal('<h2>' + (neu ? 'Neue Person' : esc(Q.name(m))) + '</h2><form id="f" class="form">' +
      '<label class="feld">Vorname<input name="vorname" required value="' + esc(m.vorname || '') + '"></label><label class="feld">Nachname<input name="nachname" required value="' + esc(m.nachname || '') + '"></label>' +
      '<label class="feld">Mitglieds-/Kundennr.<input name="nr" value="' + esc(m.nr || '') + '"></label>' +
      '<label class="feld">Art<select name="art">' + Object.entries(H.ART).map(([k, v]) => '<option value="' + k + '"' + (m.art === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><small>bestimmt Beitrag und Liegeplatzgebühr</small></label>' +
      '<label class="feld">Geburtsdatum<input name="geburtsdatum" type="date" value="' + esc(m.geburtsdatum || '') + '"></label><label class="feld">Geschlecht<select name="geschlecht"><option value="">–</option>' +
      Object.entries(H.GESCHLECHT).map(([k, v]) => '<option value="' + k + '"' + (m.geschlecht === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><small>für die Verbandsmeldung</small></label>' +
      '<label class="feld">Eintritt<input name="eintritt" type="date" value="' + esc(m.eintritt || '') + '"></label><label class="feld">Austritt zum<input name="austritt" type="date" value="' + esc(m.austritt || '') + '"><small>leer = Mitglied</small></label>' +
      '<label class="feld">E-Mail<input name="email" type="email" value="' + esc(m.email || '') + '"></label><label class="feld">Telefon<input name="tel" value="' + esc(m.tel || '') + '"></label>' +
      '<label class="feld voll">Straße<input name="strasse" value="' + esc(m.strasse || '') + '"></label><label class="feld">PLZ<input name="plz" value="' + esc(m.plz || '') + '"></label><label class="feld">Ort<input name="ort" value="' + esc(m.ort || '') + '"></label>' +
      '<label class="feld">Kfz-Kennzeichen<input name="kfz" value="' + esc(m.kfz || '') + '"><small>laut Hafenbetriebsordnung empfohlen</small></label>' +
      '<label class="feld">Arbeitsdienst befreit<input name="arbeitsdienst_befreit" value="' + esc(m.arbeitsdienst_befreit || '') + '" placeholder="Grund, z. B. Vorstandsamt"><small>leer = nicht befreit</small></label>' +
      (bank ? '<label class="feld voll">IBAN<input name="iban" value="' + esc(m.iban || '') + '" placeholder="DE…"></label><label class="feld">BIC (optional)<input name="bic" value="' + esc(m.bic || '') + '"></label><label class="feld">Kontoinhaber<input name="kontoinhaber" value="' + esc(m.kontoinhaber || '') + '"></label>' +
        '<label class="feld">Mandatsreferenz<input name="mandat_ref" value="' + esc(m.mandat_ref || '') + '"></label><label class="feld">Mandat unterschrieben am<input name="mandat_datum" type="date" value="' + esc(m.mandat_datum || '') + '"></label>' : '<p class="hinweis voll">Bankdaten: ' + (m.iban ? iban(m.iban) : 'keine') + ' – nur Kassenwart und Vorstand können sie ändern.</p>') +
      '</form>' + (neu ? '' : '<div class="abschnitt"><h3>Dokumente und Verträge</h3><div id="m-dok"></div></div>') + '<div class="modal-fuss">' + (!neu && verlaufErlaubt() ? '<button class="btn links" id="m-verlauf">Verlauf</button>' : '') + '<button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    const mv = $('#m-verlauf', el); if (mv) mv.addEventListener('click', () => verlaufDialog('mitglieder', m.id, Q.name(m)));
    if (!neu) dokumenteBereich($('#m-dok', el), { mitglied_id: m.id });
    $('#ok', el).addEventListener('click', () => {
      const f = $('#f', el); if (!f.reportValidity()) return;
      const x = Object.fromEntries(new FormData(f));
      if (bank && x.iban && !SEPA.ibanGueltig(x.iban)) return toast('Die IBAN ist ungültig (Prüfziffer stimmt nicht).', 'fehler');
      if (bank && x.iban) x.iban = x.iban.replace(/\s/g, '').toUpperCase();
      if (neu) d.mitglieder.push({ id: H.uid('M'), notiz: '', ...x, nr: x.nr || Q.naechsteNr() }); else Object.assign(m, x);
      speichern('Gespeichert.'); zu(); zeige(tab);
    });
  }

  // Dokumente beim Mitglied (Liegeplatzvertrag, Mandat, Schriftverkehr …) – sieht auch das Mitglied in „Mein SSV“
  function dokumenteBereich(box, bezug) {
    const ART = { vertrag: 'Vertrag', versicherung: 'Versicherung', foto: 'Foto', sonstiges: 'Sonstiges' };
    const liste = () => HF.dok.liste(bezug).then((l) => {
      box.innerHTML = (l.length ? '<table class="tab"><tbody>' + l.map((x) => '<tr><td><span class="tag">' + (ART[x.art] || x.art) + '</span> ' + esc(x.name) + '<br><small style="color:var(--muted)">' + new Date(x.hochgeladen).toLocaleDateString('de-DE') + ' · ' + esc(x.von || '') + '</small></td><td class="r nw"><button class="btn klein" type="button" data-dok="' + x.id + '">Ansehen</button> <button class="btn klein gefahr" type="button" data-dok-weg="' + x.id + '">Löschen</button></td></tr>').join('') + '</tbody></table>' : '<p class="leer">Noch keine Dokumente.</p>') +
        '<div class="aktionen" style="margin-top:8px"><select class="suche" id="dok-art" style="min-width:0"><option value="vertrag">Vertrag</option><option value="sonstiges">Sonstiges</option></select><label class="btn">Dokument hochladen<input type="file" id="dok-datei" accept="application/pdf,image/*" hidden></label></div>';
      box.querySelector('#dok-datei').addEventListener('change', async (e) => {
        try { const x = await HF.datei.lesen(e.target.files[0]); await HF.dok.hochladen({ ...x, ...bezug, art: box.querySelector('#dok-art').value }, ROLLEN[rolle].name); toast('Dokument gespeichert.'); liste(); }
        catch (er) { toast(er.message, 'fehler'); }
      });
    }).catch((e) => { box.innerHTML = '<p class="hinweis warn">' + esc(e.message) + '</p>'; });
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-dok]'); if (a) return HF.datei.oeffnen(a.dataset.dok).catch((x) => toast(x.message, 'fehler'));
      const w = e.target.closest('[data-dok-weg]'); if (w && confirm('Dokument löschen?')) HF.dok.loeschen(w.dataset.dokWeg).then(liste, (x) => toast(x.message, 'fehler'));
    });
    liste();
  }

  /* ============================================================ Mitglieder-Import (CSV) */
  // Spaltennamen, wie sie in Exporten (easyVerein, Excel-Listen) typischerweise heißen
  const IMPORT_SPALTEN = {
    nr: ['mitgliedsnummer', 'mitgliedsnr', 'mitgliedsnr.', 'mitglieds-nr', 'mitglieds-nr.', 'mitglieds nr', 'mitgliedernummer', 'mitglied nr', 'nr', 'nr.', 'nummer'],
    vorname: ['vorname', 'first name', 'firstname'],
    nachname: ['nachname', 'familienname', 'last name', 'lastname', 'name'],
    email: ['e-mail', 'email', 'e-mail-adresse', 'emailadresse', 'e-mail privat', 'mail'],
    tel: ['telefon', 'telefonnummer', 'mobil', 'mobilnummer', 'handy', 'telefon privat', 'tel', 'tel.'],
    strasse: ['straße', 'strasse', 'straße und hausnummer', 'strasse und hausnummer', 'anschrift', 'adresse', 'str.'],
    plz: ['plz', 'postleitzahl'],
    ort: ['ort', 'wohnort', 'stadt'],
    geburtsdatum: ['geburtsdatum', 'geburtstag', 'geboren', 'geboren am', 'geb.-datum', 'geb.datum', 'geb.'],
    geschlecht: ['geschlecht', 'anrede'],
    art: ['mitgliedsart', 'beitragsgruppe', 'beitragsart', 'mitgliedschaft', 'mitgliedsstatus', 'art', 'status'],
    eintritt: ['eintritt', 'eintrittsdatum', 'beitritt', 'beitrittsdatum', 'mitglied seit'],
    austritt: ['austritt', 'austrittsdatum'],
    iban: ['iban'],
    bic: ['bic', 'swift', 'bic/swift'],
    kontoinhaber: ['kontoinhaber', 'kontoinhaber/in', 'inhaber', 'name des kontoinhabers'],
    mandat_ref: ['mandatsreferenz', 'sepa-mandatsreferenz', 'mandatsref', 'mandatsref.', 'mandat'],
    mandat_datum: ['mandatsdatum', 'datum der mandatserteilung', 'mandatserteilung', 'mandat vom', 'datum mandat', 'unterschrift mandat', 'mandat erteilt am'],
    kfz: ['kfz', 'kfz-kennzeichen', 'kennzeichen']
  };
  const IMPORT_LABEL = { nr: 'Mitgliedsnr.', vorname: 'Vorname', nachname: 'Nachname', email: 'E-Mail', tel: 'Telefon', strasse: 'Straße', plz: 'PLZ', ort: 'Ort', geburtsdatum: 'Geburtsdatum',
    geschlecht: 'Geschlecht', art: 'Mitgliedsart', eintritt: 'Eintritt', austritt: 'Austritt', iban: 'IBAN', bic: 'BIC', kontoinhaber: 'Kontoinhaber', mandat_ref: 'Mandatsreferenz', mandat_datum: 'Mandatsdatum', kfz: 'Kfz' };

  function csvLesen(text) {
    text = text.replace(/^﻿/, '');
    const erste = text.split(/\r?\n/)[0] || '';
    const trenner = [';', '\t', ','].map((t) => [t, erste.split(t).length]).sort((a, b) => b[1] - a[1])[0][0];
    const zeilen = []; let zeile = [], feld = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inQ = false; } else feld += c; continue; }
      if (c === '"') inQ = true;
      else if (c === trenner) { zeile.push(feld); feld = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; zeile.push(feld); feld = ''; if (zeile.some((x) => x.trim())) zeilen.push(zeile); zeile = []; }
      else feld += c;
    }
    zeile.push(feld); if (zeile.some((x) => x.trim())) zeilen.push(zeile);
    return zeilen;
  }
  function spaltenZuordnen(kopfzeile) {
    const norm = kopfzeile.map((k) => k.trim().toLowerCase().replace(/\s+/g, ' '));
    const zu = {}; const belegt = new Set();
    Object.entries(IMPORT_SPALTEN).forEach(([feld, aliase]) => {           // 1. exakte Treffer
      for (const a of aliase) { const i = norm.findIndex((k, j) => k === a && !belegt.has(j)); if (i >= 0) { zu[feld] = i; belegt.add(i); break; } }
    });
    Object.entries(IMPORT_SPALTEN).forEach(([feld, aliase]) => {           // 2. „beginnt mit“ für längere Namen
      if (feld in zu) return;
      for (const a of aliase.filter((x) => x.length >= 5)) { const i = norm.findIndex((k, j) => k.startsWith(a) && !belegt.has(j)); if (i >= 0) { zu[feld] = i; belegt.add(i); break; } }
    });
    return { zu, unbekannt: kopfzeile.filter((k, i) => !belegt.has(i) && k.trim()) };
  }
  const datumIso = (v) => {
    v = String(v || '').trim(); let m;
    if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3];
    if ((m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/))) { let j = Number(m[3]); if (j < 100) j += j > 30 ? 1900 : 2000; return j + '-' + H.pad(m[2]) + '-' + H.pad(m[1]); }
    return '';
  };
  const geschlechtWert = (v) => { v = String(v || '').trim().toLowerCase(); if (/^(w|weiblich|frau|f|female)/.test(v)) return 'w'; if (/^(m|männlich|maennlich|herr|male)/.test(v)) return 'm'; if (/^d/.test(v)) return 'd'; return ''; };
  const artWert = (v) => {
    v = String(v || '').toLowerCase(); if (!v.trim()) return '';
    if (/förder|foerder|passiv/.test(v)) return 'foerdernd'; if (/probe/.test(v)) return 'probe'; if (/geschwister/.test(v)) return 'jugend_geschwister';
    if (/ausbild|azubi|student|schüler über|studier/.test(v)) return 'ausbildung'; if (/jugend|kind|junior/.test(v)) return 'jugend';
    if (/partner|ehe/.test(v)) return 'partner'; if (/gast/.test(v)) return 'gast'; return 'ausuebend';
  };

  function importAuswerten(text) {
    const zeilen = csvLesen(text); if (zeilen.length < 2) return { fehler: 'Keine Daten gefunden – erste Zeile muss die Spaltennamen enthalten.' };
    const { zu, unbekannt } = spaltenZuordnen(zeilen[0]);
    if (!('vorname' in zu) || !('nachname' in zu)) return { fehler: 'Spalten „Vorname“ und „Nachname“ nicht gefunden. Erkannt: ' + (Object.keys(zu).map((k) => IMPORT_LABEL[k]).join(', ') || 'nichts') };
    const zeilenNeu = zeilen.slice(1).map((z, i) => {
      const x = {}; Object.entries(zu).forEach(([f, j]) => { x[f] = String(z[j] == null ? '' : z[j]).trim(); });
      ['geburtsdatum', 'eintritt', 'austritt', 'mandat_datum'].forEach((f) => { if (f in x) x[f] = datumIso(x[f]); });
      if ('geschlecht' in x) x.geschlecht = geschlechtWert(x.geschlecht);
      if ('art' in x) x.art = artWert(x.art);
      if (x.iban) x.iban = x.iban.replace(/\s/g, '').toUpperCase();
      const hinweise = [];
      if (x.iban && !SEPA.ibanGueltig(x.iban)) { hinweise.push('IBAN ungültig – wird nicht übernommen'); delete x.iban; }
      if (x.mandat_ref && !x.mandat_datum) hinweise.push('Mandatsdatum fehlt – bis dahin kein Lastschrifteinzug');
      const gleich = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
      const vorh = (x.nr && d.mitglieder.find((m) => m.nr === x.nr)) ||
        (x.vorname && x.nachname && d.mitglieder.find((m) => gleich(m.vorname, x.vorname) && gleich(m.nachname, x.nachname) && (!x.geburtsdatum || !m.geburtsdatum || m.geburtsdatum === x.geburtsdatum)));
      if (!vorh && (!x.vorname || !x.nachname)) return { zeile: i + 2, x, status: 'fehler', hinweise: ['Vor- oder Nachname fehlt'] };
      if (vorh) { x.vorname = x.vorname || vorh.vorname; x.nachname = x.nachname || vorh.nachname; }
      return { zeile: i + 2, x, status: vorh ? 'aktualisieren' : 'neu', m: vorh, hinweise };
    });
    return { zu, unbekannt, zeilen: zeilenNeu };
  }

  function importDialog() {
    const el = modal('<h2>Mitglieder importieren</h2><p>CSV-Datei mit Spaltennamen in der ersten Zeile – z. B. der Mitglieder-Export aus easyVerein oder eine Excel-Liste (in Excel: <em>Speichern unter → CSV UTF-8</em>). ' +
      'Erkannt werden u. a. Mitgliedsnummer, Vorname, Nachname, Anschrift, Geburtsdatum, Geschlecht, Mitgliedsart, Eintritt, IBAN, BIC, Kontoinhaber, Mandatsreferenz und Mandatsdatum.</p>' +
      '<div class="aktionen"><label class="btn primaer">Datei wählen<input type="file" id="idatei" accept=".csv,.txt,text/csv" hidden></label><button class="btn" id="ivorlage">Vorlage herunterladen</button></div>' +
      '<details style="margin-top:10px"><summary style="cursor:pointer;color:var(--muted)">… oder Text einfügen</summary><textarea id="itext" rows="6" style="width:100%;margin-top:8px;font:12px monospace" placeholder="Mitgliedsnummer;Vorname;Nachname;…"></textarea><button class="btn klein" id="ipruefen" style="margin-top:6px">Prüfen</button></details>' +
      '<div id="ierg"></div><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="iok" disabled>Übernehmen</button></div>', true);
    let ergebnis = null;
    const zeigeErgebnis = (text) => {
      ergebnis = importAuswerten(text);
      const box = $('#ierg', el);
      if (ergebnis.fehler) { box.innerHTML = '<p class="hinweis warn">' + esc(ergebnis.fehler) + '</p>'; $('#iok', el).disabled = true; return; }
      const z = ergebnis.zeilen; const n = (st) => z.filter((r) => r.status === st).length;
      box.innerHTML = '<p style="margin-top:14px"><span class="tag ok">' + n('neu') + ' neu</span> <span class="tag">' + n('aktualisieren') + ' aktualisieren</span> ' + (n('fehler') ? '<span class="tag rot">' + n('fehler') + ' fehlerhaft (werden übersprungen)</span>' : '') + '</p>' +
        '<p style="font-size:12.5px;color:var(--muted)">Erkannte Spalten: ' + Object.keys(ergebnis.zu).map((k) => IMPORT_LABEL[k]).join(', ') + (ergebnis.unbekannt.length ? ' · ignoriert: ' + ergebnis.unbekannt.map(esc).join(', ') : '') + '</p>' +
        '<div style="max-height:320px;overflow:auto"><table class="tab"><thead><tr><th>Zeile</th><th>Nr.</th><th>Name</th><th>Art</th><th>Status</th><th>Hinweis</th></tr></thead><tbody>' +
        z.slice(0, 300).map((r) => '<tr' + (r.status === 'fehler' ? ' class="blass"' : '') + '><td>' + r.zeile + '</td><td>' + esc(r.x.nr || (r.m ? r.m.nr : '')) + '</td><td>' + esc((r.x.nachname || '') + ', ' + (r.x.vorname || '')) + '</td><td>' + (r.x.art ? H.ART[r.x.art] : (r.m ? H.ART[r.m.art] : 'ausübend')) + '</td>' +
          '<td>' + (r.status === 'neu' ? '<span class="tag ok">neu</span>' : r.status === 'aktualisieren' ? '<span class="tag">aktualisieren</span>' : '<span class="tag rot">Fehler</span>') + '</td><td style="font-size:12px">' + r.hinweise.map(esc).join('<br>') + '</td></tr>').join('') +
        '</tbody></table></div><p class="hinweis" style="margin-top:10px">Bestehende Mitglieder werden über die Mitgliedsnummer (sonst Name + Geburtsdatum) erkannt. Leere Zellen überschreiben nichts. Die Getränkekasse übernimmt neue Mitglieder automatisch.</p>';
      $('#iok', el).disabled = !(n('neu') + n('aktualisieren'));
    };
    $('#idatei', el).addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const lesen = (enc) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsText(f, enc); });
      lesen('utf-8').then((t) => (t.includes('�') ? lesen('windows-1252') : t)).then(zeigeErgebnis);   // ältere Excel-Exporte sind Windows-kodiert
    });
    $('#ipruefen', el).addEventListener('click', () => zeigeErgebnis($('#itext', el).value));
    $('#ivorlage', el).addEventListener('click', () => download('ssv-mitglieder-vorlage.csv', csv([['Mitgliedsnummer', 'Vorname', 'Nachname', 'Geburtsdatum', 'Geschlecht', 'Mitgliedsart', 'Eintritt', 'Straße', 'PLZ', 'Ort', 'E-Mail', 'Telefon', 'IBAN', 'BIC', 'Kontoinhaber', 'Mandatsreferenz', 'Mandatsdatum'],
      ['2101', 'Erika', 'Musterfrau', '14.03.1975', 'weiblich', 'ausübend', '01.04.2010', 'Hafenstraße 1', '23554', 'Lübeck', 'erika@beispiel.de', '0451 123456', 'DE02120300000000202051', '', 'Erika Musterfrau', 'SSV-2101', '01.04.2010']]), 'text/csv'));
    $('#iok', el).addEventListener('click', () => {
      if (!ergebnis || ergebnis.fehler) return;
      let neu = 0, akt = 0;
      ergebnis.zeilen.forEach((r) => {
        if (r.status === 'fehler') return;
        const werte = {}; Object.entries(r.x).forEach(([k, v]) => { if (v !== '' && v != null) werte[k] = v; });
        if (r.status === 'aktualisieren') { Object.assign(r.m, werte); akt++; return; }
        d.mitglieder.push({ id: H.uid('M'), art: 'ausuebend', email: '', tel: '', strasse: '', plz: '', ort: '', iban: '', bic: '', kontoinhaber: '', mandat_ref: '', mandat_datum: '', kfz: '', notiz: 'Import ' + H.datum(heute), austritt: '',
          ...werte, nr: werte.nr || Q.naechsteNr(), kontoinhaber: werte.kontoinhaber || (werte.iban ? werte.vorname + ' ' + werte.nachname : '') });
        neu++;
      });
      speichern(neu + ' Mitglieder angelegt, ' + akt + ' aktualisiert.'); zu(); zeige('eigner');
    });
  }

  /* ============================================================ Aufnahmeanträge */
  const beitragFuer = (art, jahr) => { const gb = G.gebuehrenFuer(d, jahr); const b = (gb.beitraege || HF.GEBUEHREN_2024.beitraege)[art]; if (!b) return 0; return Math.round((b.verein + b.verband + (art === 'probe' ? (gb.eintrittsgeld_probe || 0) : 0)) * 100) / 100; };
  V.antraege = (main) => {
    const alle = (d.antraege || []).slice().sort((a, b) => b.eingang.localeCompare(a.eingang));
    const neu = alle.filter((a) => a.status === 'neu'), erledigt = alle.filter((a) => a.status !== 'neu');
    const jahr = Number(heute.slice(0, 4));
    main.innerHTML = kopf('Aufnahmeanträge', 'Online gestellte Anträge – der Vorstand entscheidet auf Empfehlung des Aufnahmeausschusses (Satzung § 6). Danach ist das Mitglied mit Nummer und Lastschriftmandat angelegt.', '<a class="btn" href="aufnahme.html" target="_blank">Antragsformular öffnen ↗</a>') +
      (neu.length ? neu.map((a) => '<div class="panel"><div class="kopf" style="margin-bottom:6px"><div><h2 style="margin:0">' + esc(a.vorname + ' ' + a.nachname) + '</h2><p>' + esc(H.ART[a.art] || a.art) + ' · ' +
        (a.geburtsdatum ? Q.alterAm(a, heute) + ' Jahre · ' : '') + esc(a.plz + ' ' + a.ort) + ' · eingegangen ' + H.datum(a.eingang) + '</p></div><div class="aktionen"><button class="btn" data-ansehen="' + a.id + '">Ansehen</button>' +
        (darf('antraege') && rolle === 'vorstand' ? '<button class="btn gefahr" data-ab="' + a.id + '">Ablehnen</button><button class="btn primaer" data-auf="' + a.id + '">Aufnehmen</button>' : '') + '</div></div>' +
        '<p style="margin:0;color:var(--muted);font-size:13.5px">Beitrag ' + jahr + ': <strong>' + H.geld(beitragFuer(a.art, jahr)) + '</strong> pro Jahr · ' + (a.mandat ? 'SEPA-Mandat erteilt' : 'kein Mandat (Überweisung)') +
        (a.boot ? ' · Boot „' + esc(a.boot.name) + '“ (' + esc(a.boot.typ || '') + ', ' + H.zahl(a.boot.laenge) + ' m)' + (a.warteliste ? ' – möchte auf die Warteliste' : '') : '') +
        (a.erziehungsberechtigt ? ' · erziehungsberechtigt: ' + esc(a.erziehungsberechtigt) : '') + '</p>' + (a.nachricht ? '<p style="margin:8px 0 0">„' + esc(a.nachricht) + '“</p>' : '') + '</div>').join('')
        : '<div class="panel"><p class="leer">Keine offenen Anträge.</p></div>') +
      (rolle !== 'vorstand' && neu.length ? '<p class="hinweis">Über Aufnahmen entscheidet der Vorstand.</p>' : '') +
      (erledigt.length ? '<div class="panel"><h2>Erledigt</h2><table class="tab"><thead><tr><th>Eingang</th><th>Name</th><th>Art</th><th>Entscheidung</th></tr></thead><tbody>' + erledigt.map((a) =>
        '<tr><td>' + H.datum(a.eingang) + '</td><td>' + esc(a.vorname + ' ' + a.nachname) + '</td><td>' + esc(H.ART[a.art] || a.art) + '</td><td>' + (a.status === 'angenommen' ? '<span class="tag ok">aufgenommen</span> Nr. ' + esc((Q.mitglied(a.mitglied_id) || {}).nr || '') : '<span class="tag rot">abgelehnt</span> ' + esc(a.grund || '')) +
        ' <small style="color:var(--muted)">' + H.datum(a.entschieden) + '</small></td></tr>').join('') + '</tbody></table></div>' : '');
    main.querySelectorAll('[data-ansehen]').forEach((b) => b.addEventListener('click', () => antragZeigen(d.antraege.find((a) => a.id === b.dataset.ansehen))));
    main.querySelectorAll('[data-auf]').forEach((b) => b.addEventListener('click', () => antragAufnehmen(d.antraege.find((a) => a.id === b.dataset.auf))));
    main.querySelectorAll('[data-ab]').forEach((b) => b.addEventListener('click', () => {
      const a = d.antraege.find((x) => x.id === b.dataset.ab); const grund = prompt('Antrag von ' + a.vorname + ' ' + a.nachname + ' ablehnen – Grund (für die Akte):', ''); if (grund === null) return;
      Object.assign(a, { status: 'abgelehnt', grund, entschieden: heute, entschieden_von: ROLLEN[rolle].name }); speichern('Antrag abgelehnt.'); zeige('antraege');
    }));
  };
  function antragZeigen(a) {
    const z = (l, v) => v ? '<dt>' + l + '</dt><dd>' + v + '</dd>' : '';
    modal('<h2>Antrag ' + esc(a.vorname + ' ' + a.nachname) + '</h2><div class="detail" style="box-shadow:none;padding:0;position:static"><dl>' +
      z('Mitgliedsart', esc(H.ART[a.art] || a.art)) + z('Geburtsdatum', H.datum(a.geburtsdatum)) + z('Geschlecht', H.GESCHLECHT[a.geschlecht] || '') + z('Anschrift', esc(a.strasse) + ', ' + esc(a.plz + ' ' + a.ort)) +
      z('E-Mail', esc(a.email)) + z('Telefon', esc(a.tel)) + z('Erziehungsberechtigt', esc(a.erziehungsberechtigt)) +
      z('Boot', a.boot ? '„' + esc(a.boot.name) + '“ · ' + esc(a.boot.typ || '') + ' · ' + H.zahl(a.boot.laenge) + ' × ' + H.zahl(a.boot.breite || 0) + ' m' + (a.warteliste ? ' · Warteliste gewünscht' : '') : '') +
      z('Kontoinhaber', esc(a.kontoinhaber)) + z('IBAN', iban(a.iban)) + z('SEPA-Mandat', a.mandat ? 'erteilt am ' + H.datum(a.eingang) : 'nein') +
      z('Satzung / Datenschutz', (a.satzung ? 'Satzung anerkannt' : '–') + ' · ' + (a.datenschutz ? 'Datenschutz bestätigt' : '–')) + z('Nachricht', esc(a.nachricht)) +
      '</dl></div><div class="modal-fuss"><button class="btn" data-zu>Schließen</button></div>');
  }
  function antragAufnehmen(a) {
    const nr = Q.naechsteNr();
    if (!confirm(a.vorname + ' ' + a.nachname + ' als ' + H.ART[a.art] + ' aufnehmen? Mitgliedsnummer ' + nr + (a.mandat ? ', Mandatsreferenz SSV-' + nr : '') + (a.boot && a.warteliste ? ', Eintrag auf der Warteliste' : '') + '.')) return;
    const m = { id: H.uid('M'), nr, vorname: a.vorname, nachname: a.nachname, art: a.art, email: a.email, tel: a.tel, strasse: a.strasse, plz: a.plz, ort: a.ort,
      geburtsdatum: a.geburtsdatum, geschlecht: a.geschlecht, eintritt: heute, austritt: '', iban: a.iban || '', bic: a.bic || '', kontoinhaber: a.kontoinhaber || '',
      mandat_ref: a.mandat ? 'SSV-' + nr : '', mandat_datum: a.mandat ? a.eingang.slice(0, 10) : '', kfz: '',
      notiz: [a.erziehungsberechtigt ? 'Erziehungsberechtigt: ' + a.erziehungsberechtigt : '', 'Online-Antrag vom ' + H.datum(a.eingang)].filter(Boolean).join(' · ') };
    d.mitglieder.push(m);
    if (a.boot && a.warteliste) {
      const l = Number(a.boot.laenge) || 0;
      d.warteliste.push({ id: H.uid('W'), mitglied_id: m.id, datum: a.eingang.slice(0, 10), boot_laenge: l, boot_breite: Number(a.boot.breite) || 0, wunsch_box: l > 9 ? 'I' : l > 7 ? 'II' : 'III',
        notiz: 'Boot „' + a.boot.name + '“' + (a.boot.typ ? ' (' + a.boot.typ + ')' : '') + ' · aus Online-Antrag', status: 'wartend' });
    }
    Object.assign(a, { status: 'angenommen', mitglied_id: m.id, entschieden: heute, entschieden_von: ROLLEN[rolle].name });
    speichern(m.vorname + ' ist jetzt Mitglied Nr. ' + nr + '.'); zeige('antraege');
    const el = modal('<h2>Willkommen an Bord, ' + esc(m.vorname) + '!</h2><p>Mitglied Nr. <strong>' + nr + '</strong> ist angelegt' + (m.mandat_ref ? ' (Mandatsreferenz ' + esc(m.mandat_ref) + ')' : '') + '. Die erste Beitragsrechnung entsteht mit der nächsten Beitragsabrechnung.</p>' +
      '<p class="hinweis">Tipp: Begrüßungs-E-Mail mit Mitgliedsnummer und dem Hinweis auf „Mein SSV“ und den Getränke-Code verschicken.</p>' +
      '<div class="modal-fuss"><button class="btn" data-zu>Schließen</button><a class="btn primaer" id="mail" href="mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Willkommen im Schwartauer Segler-Verein') + '&body=' +
      encodeURIComponent('Moin ' + m.vorname + ',\n\nschön, dass du dabei bist! Deine Mitgliedsnummer ist ' + nr + '.\n\nDein Zugang „Mein SSV“: ' + new URL('mein-ssv.html', location.href).href + ' – leg dort dein Konto mit genau dieser E-Mail-Adresse an (' + m.email + ').\n\nIn „Mein SSV“ findest du deine Rechnungen und kannst dort deinen Code für die Getränkekasse festlegen – oder du legst ihn beim ersten Mal direkt am iPad im Vereinsheim fest (mit deiner Mitgliedsnummer).\n\nAllzeit gute Fahrt!\nDein Vorstand') + '">Begrüßungs-E-Mail schreiben</a></div>');
    $('#mail', el).addEventListener('click', () => setTimeout(zu, 300));
  }

  /* ============================================================ Verbandsmeldung */
  // Bestandserhebung: Mitglieder zum Stichtag 1.1. nach Altersgruppen und Geschlecht
  const ALTERSGRUPPEN = [['bis 6', 0, 6], ['7–14', 7, 14], ['15–18', 15, 18], ['19–26', 19, 26], ['27–40', 27, 40], ['41–60', 41, 60], ['über 60', 61, 999]];
  const verbandStand = { jahr: SAISON + 1 };
  V.verband = (main) => {
    const jahr = verbandStand.jahr, stichtag = jahr + '-01-01';
    const liste = d.mitglieder.filter((m) => Q.istMitglied(m, stichtag));
    const alterJ = (m) => m.geburtsdatum ? jahr - Number(m.geburtsdatum.slice(0, 4)) : null;   // Jahrgangsprinzip
    const G4 = ['m', 'w', 'd', ''];
    const tabelle = ALTERSGRUPPEN.map(([n, von, bis]) => { const inG = liste.filter((m) => { const a = alterJ(m); return a != null && a >= von && a <= bis; }); return [n, ...G4.map((g) => inG.filter((m) => (m.geschlecht || '') === g).length), inG.length]; });
    const ohneAlter = liste.filter((m) => alterJ(m) == null);
    if (ohneAlter.length) tabelle.push(['ohne Geburtsdatum', ...G4.map((g) => ohneAlter.filter((m) => (m.geschlecht || '') === g).length), ohneAlter.length]);
    const summe = ['Gesamt', ...G4.map((g, i) => tabelle.reduce((s, z) => s + z[i + 1], 0)), liste.length];
    const gb = G.gebuehrenFuer(d, jahr); const B = gb.beitraege || HF.GEBUEHREN_2024.beitraege;
    const nachArt = Object.keys(H.ART).filter((k) => k !== 'gast').map((k) => { const n = liste.filter((m) => m.art === k).length; return [H.ART[k], n, B[k] ? B[k].verband : 0, n * (B[k] ? B[k].verband : 0)]; }).filter((z) => z[1]);
    const luecken = liste.filter((m) => !m.geburtsdatum || !m.geschlecht);
    main.innerHTML = kopf('Verbandsmeldung ' + jahr, 'Bestandserhebung zum Stichtag ' + H.datum(stichtag) + ' · ' + liste.length + ' Mitglieder (ohne Saison-Gäste)',
      [SAISON, SAISON + 1].map((j) => '<button class="btn' + (j === jahr ? ' aktiv' : '') + '" data-vj="' + j + '">' + j + '</button>').join('') + '<button class="btn" id="vcsv">CSV</button><button class="btn" id="vdruck">Drucken</button>') +
      '<div class="panel"><h2>Nach Alter und Geschlecht</h2><table class="tab"><thead><tr><th>Altersgruppe</th><th class="r">männlich</th><th class="r">weiblich</th><th class="r">divers</th><th class="r">ohne Angabe</th><th class="r">gesamt</th></tr></thead><tbody>' +
      tabelle.map((z) => '<tr><td>' + z[0] + '</td>' + z.slice(1).map((v, i) => '<td class="r">' + (i === 4 ? '<strong>' + v + '</strong>' : v || '–') + '</td>').join('') + '</tr>').join('') +
      '</tbody><tfoot><tr>' + summe.map((v, i) => '<td' + (i ? ' class="r"' : '') + '>' + v + '</td>').join('') + '</tr></tfoot></table>' +
      '<p class="hinweis" style="margin-top:12px">Alter nach Jahrgang (' + jahr + ' minus Geburtsjahr). Altersgruppen wie in der üblichen Bestandserhebung der Landessportverbände. [PLATZHALTER: Gruppen und Meldeweg mit dem Landessportverband Schleswig-Holstein / Segler-Verband abgleichen]</p></div>' +
      '<div class="panel"><h2>Nach Mitgliedsart</h2><table class="tab"><thead><tr><th>Art</th><th class="r">Anzahl</th><th class="r">Verbandsbeitrag je Person</th><th class="r">Verbandsbeitrag gesamt</th></tr></thead><tbody>' +
      nachArt.map((z) => '<tr><td>' + z[0] + '</td><td class="r">' + z[1] + '</td><td class="r">' + H.geld(z[2]) + '</td><td class="r">' + H.geld(z[3]) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Summe</td><td class="r">' + liste.length + '</td><td></td><td class="r">' + H.geld(nachArt.reduce((s, z) => s + z[3], 0)) + '</td></tr></tfoot></table>' +
      '<p class="hinweis" style="margin-top:12px">Der Verbandsbeitrag wird mit dem Mitgliedsbeitrag eingezogen und an den Verband weitergegeben (Gebührenordnung 2024).</p></div>' +
      (luecken.length ? '<div class="panel"><h2>Fehlende Angaben (' + luecken.length + ')</h2><p class="hinweis warn">Für eine vollständige Meldung bitte Geburtsdatum und Geschlecht ergänzen.</p><table class="tab"><tbody>' +
        luecken.map((m) => '<tr class="klickbar" data-m="' + m.id + '"><td>' + esc(m.nr) + '</td><td>' + esc(Q.name(m)) + '</td><td>' + (!m.geburtsdatum ? '<span class="tag warn">Geburtsdatum</span> ' : '') + (!m.geschlecht ? '<span class="tag warn">Geschlecht</span>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '');
    main.querySelectorAll('[data-vj]').forEach((b) => b.addEventListener('click', () => { verbandStand.jahr = Number(b.dataset.vj); zeige('verband'); }));
    main.querySelectorAll('[data-m]').forEach((r) => r.addEventListener('click', () => mitgliedForm(Q.mitglied(r.dataset.m))));
    $('#vdruck').addEventListener('click', () => window.print());
    $('#vcsv').addEventListener('click', () => download('ssv-bestandserhebung-' + jahr + '.csv', csv([['Bestandserhebung ' + jahr + ', Stichtag ' + H.datum(stichtag)], ['Altersgruppe', 'männlich', 'weiblich', 'divers', 'ohne Angabe', 'gesamt']]
      .concat(tabelle, [summe], [[]], [['Mitgliedsart', 'Anzahl', 'Verbandsbeitrag je Person', 'Verbandsbeitrag gesamt']], nachArt.map((z) => [z[0], z[1], H.zahl(z[2]), H.zahl(z[3])]))), 'text/csv'));
  };

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
      liste.map((a) => { const b = Q.boot(a.boot_id); const m = b && Q.mitglied(b.eigner_id); const jetzt = a.von <= heute && a.bis >= heute;
        return '<tr' + (a.bis < heute && !jetzt ? ' class="blass"' : '') + '><td>' + H.kurz(a.von) + ' – ' + H.datum(a.bis) + '</td><td>' + esc(platzName(a.platz_id)) + '</td><td>' + (b ? esc(b.name) : '') + '</td><td>' + esc(Q.name(m)) + '</td><td>' + esc(a.notiz || '') + '</td>' +
          '<td>' + (jetzt ? '<span class="tag gruen">unterwegs (heute)</span>' : a.von > heute ? '<span class="tag">geplant</span>' : a.bis < heute ? '<span class="tag">vorbei</span>' : '') + ' <small style="color:var(--muted)">' + esc(a.gemeldet || '') + '</small></td>' +
          '<td class="r nw">' + (jetzt && a.von < heute ? '<button class="btn klein" data-zurueck="' + a.id + '">Früher zurück</button> ' : '') + '<button class="btn klein gefahr" data-weg="' + a.id + '">Löschen</button></td></tr>'; }).join('') + '</tbody></table></div>';
    $('#neu').addEventListener('click', () => abwesenheitForm({}));
    main.querySelectorAll('[data-weg]').forEach((b) => b.addEventListener('click', () => { if (!confirm('Abwesenheit löschen? Der Platz ist dann nicht mehr grün.')) return; d.abwesenheiten = d.abwesenheiten.filter((a) => a.id !== b.dataset.weg); speichern('Gelöscht.'); zeige(tab); }));
    main.querySelectorAll('[data-zurueck]').forEach((b) => b.addEventListener('click', () => {
      const a = d.abwesenheiten.find((x) => x.id === b.dataset.zurueck); if (!confirm('Eigner ist heute zurück? Das grüne Schild endet gestern.')) return;
      a.bis = tagVor(heute, 1); a.notiz = ((a.notiz || '') + ' (früher zurück)').trim(); speichern('Eingetragen – Konflikte mit Gästen stehen in der Übersicht.'); zeige(tab);
    }));
  };
  function abwesenheitForm(a) {
    const el = modal('<h2>Abwesenheit eintragen</h2><p class="hinweis ok">Der Platz wird für diesen Zeitraum im Hafenplan grün und kann an Gäste vergeben werden.</p><form id="f" class="form">' +
      '<label class="feld voll">Boot<select name="boot_id" required><option value="">bitte wählen</option>' + d.boote.filter((b) => { const bl = Q.belegungBoot(SAISON, 'sommer', b.id); return bl && bl.platz_typ === 'wasser'; }).map((b) => '<option value="' + b.id + '"' + (b.id === a.boot_id ? ' selected' : '') + '>' + esc(b.name) + ' – ' + esc(platzName(Q.belegungBoot(SAISON, 'sommer', b.id).platz_id)) + '</option>').join('') + '</select></label>' +
      '<label class="feld">von<input name="von" type="date" required value="' + (a.von || (imSommer ? heute : planStand.datum)) + '"></label><label class="feld">bis (Rückkehr)<input name="bis" type="date" required value="' + (a.bis || '') + '"></label>' +
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
        '<tr><td><strong>„' + esc(x.bootsname) + '“</strong> · ' + H.zahl(x.laenge, 1) + ' × ' + H.zahl(x.breite || 0, 1) + ' m' + (x.tiefgang ? ' · Tg. ' + H.zahl(x.tiefgang, 1) + ' m' : '') + '</td><td>' + esc(x.skipper) + (x.herkunft ? ' · ' + esc(x.herkunft) : '') + '</td><td>' + H.datum(x.ankunft) + ', ' + x.naechte + ' N.</td><td class="r"><button class="btn klein primaer" data-zuw="' + x.id + '">Platz zuweisen</button></td></tr>').join('') + '</tbody></table></div>' : '') +
      '<div class="panel"><table class="tab"><thead><tr><th>Ankunft</th><th>Boot</th><th>Skipper</th><th>Platz</th><th class="r">Nächte</th><th class="r">Betrag</th><th>Zahlung</th><th>Status</th><th></th></tr></thead><tbody>' +
      d.gaeste.slice().sort((a, b) => b.ankunft.localeCompare(a.ankunft)).map((x) =>
        '<tr' + (x.status === 'abgereist' || x.status === 'storniert' ? ' class="blass"' : '') + '><td>' + H.datum(x.ankunft) + '</td><td><strong>' + esc(x.bootsname) + '</strong> <small style="color:var(--muted)">' + H.zahl(x.laenge, 1) + ' m</small></td><td>' + esc(x.skipper) + '</td><td>' + (x.platz_id ? esc(platzName(x.platz_id)) : '<span class="tag gast">offen</span>') + '</td>' +
        '<td class="r">' + x.naechte + '</td><td class="r">' + H.geld(x.betrag) + '</td><td>' + (x.status === 'storniert' ? '–' : zahlungText(x)) + '</td>' +
        '<td>' + ({ angemeldet: '<span class="tag gast">angemeldet</span>', eingewiesen: '<span class="tag ok">im Hafen</span>', abgereist: 'abgereist', storniert: '<span class="tag">storniert</span>' })[x.status] + (x.quelle === 'qr' ? ' <small style="color:var(--muted)">QR</small>' : '') + '</td>' +
        '<td class="r" style="white-space:nowrap">' + (x.status !== 'angemeldet' ? '<button class="btn klein" data-bearb="' + x.id + '">Bearbeiten</button> ' : '') + (x.quittung_nr && x.bezahlt_am ? '<button class="btn klein" data-quit="' + x.id + '">Quittung</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
    $('#neu').addEventListener('click', () => gastForm({}));
    $('#plakat').addEventListener('click', () => oeffnen('drucken.html?art=plakat'));
    main.querySelectorAll('[data-zuw]').forEach((b) => b.addEventListener('click', () => gastForm(d.gaeste.find((x) => x.id === b.dataset.zuw))));
    main.querySelectorAll('[data-bearb]').forEach((b) => b.addEventListener('click', () => gastForm(d.gaeste.find((x) => x.id === b.dataset.bearb))));
    main.querySelectorAll('[data-quit]').forEach((b) => b.addEventListener('click', () => oeffnen('drucken.html?art=quittung&id=' + b.dataset.quit)));
  };
  function gastForm(g) {
    const neu = !g.id; const gb = G.gebuehrenFuer(d, SAISON);
    const x0 = { ankunft: imSommer ? heute : planStand.datum, naechte: 1, laenge: '', breite: '', tiefgang: '', zahlung: 'bar', bezahlt_am: '', ...g };
    const zahlOpt = Object.entries(ZAHLART).map(([k, v]) => '<option value="' + k + '"' + (x0.zahlung === k ? ' selected' : '') + '>' + (k === 'offen' ? 'noch nicht festgelegt' : v) + '</option>').join('');
    const el = modal('<h2>' + (neu ? 'Gast einweisen' : '„' + esc(g.bootsname) + '“') + '</h2><form id="f" class="form">' +
      '<label class="feld">Bootsname<input name="bootsname" required value="' + esc(x0.bootsname || '') + '"></label><label class="feld">Skipper<input name="skipper" required value="' + esc(x0.skipper || '') + '"></label>' +
      '<label class="feld">Heimathafen<input name="herkunft" value="' + esc(x0.herkunft || '') + '"></label><label class="feld">Telefon<input name="tel" type="tel" value="' + esc(x0.tel || '') + '"></label>' +
      '<label class="feld">Länge (m)<input name="laenge" type="number" step="0.1" min="2" max="40" required inputmode="decimal" value="' + x0.laenge + '"></label><label class="feld">Breite (m)<input name="breite" type="number" step="0.1" min="1" max="12" inputmode="decimal" value="' + (x0.breite || '') + '"></label>' +
      '<label class="feld">Tiefgang (m)<input name="tiefgang" type="number" step="0.1" min="0.2" max="6" inputmode="decimal" value="' + (x0.tiefgang || '') + '"></label><label class="feld">Ankunft<input name="ankunft" type="date" required value="' + x0.ankunft + '"></label>' +
      '<label class="feld">Nächte<input name="naechte" type="number" min="1" max="60" required value="' + x0.naechte + '"></label><label class="feld">Betrag<input name="betrag" id="betrag" readonly></label>' +
      '<label class="feld voll">Platz<select name="platz_id" id="platzwahl"></select><small id="platzinfo"></small></label><div class="voll" id="platzwarn" role="alert"></div>' +
      '<label class="feld">Zahlart<select name="zahlung">' + zahlOpt + '</select></label>' +
      '<label class="feld">Zahlung eingegangen am<input name="bezahlt_am" type="date" value="' + esc(x0.bezahlt_am || '') + '"><small>leer = noch nicht bezahlt · <a href="#" id="bez-heute">heute</a></small></label>' +
      (!neu ? '<label class="feld">Status<select name="status">' + [['angemeldet', 'angemeldet (noch ohne Platz)'], ['eingewiesen', 'im Hafen'], ['abgereist', 'abgereist'], ['storniert', 'storniert / nicht gekommen']].map(([k, v]) => '<option value="' + k + '"' + (x0.status === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label>' : '') +
      '</form>' + (planAnnahme() ? '<p class="hinweis" style="margin-top:10px">Die Boxmaße sind noch Annahmen – die Empfehlung ist eine Orientierung, vor Ort bitte prüfen.</p>' : '') +
      '<div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok"></button></div>', true);
    const f = $('#f', el);
    let wahl = x0.status === 'storniert' ? '' : (x0.platz_id || '');
    const werte = () => ({ von: f.ankunft.value || x0.ankunft, n: Math.max(1, Number(f.naechte.value) || 1), l: Number(f.laenge.value) || 0, b: Number(f.breite.value) || 0, t: Number(f.tiefgang.value) || 0 });
    const knopf = () => { const st = f.status ? f.status.value : 'angemeldet'; $('#ok', el).textContent = st === 'storniert' ? 'Stornieren' : wahl ? ((neu || g.status === 'angemeldet') ? 'Einweisen' : 'Speichern') : (neu ? 'Ohne Platz speichern' : 'Speichern (ohne Platz)'); };
    const aktualisieren = () => {
      const w = werte(); $('#betrag', el).value = H.geld(w.n * gb.gast_nacht);
      const vf = verfuegbarePlaetze(w.von, w.n, w.l, w.b, w.t, g.id);
      let warn = '';
      if (wahl && !vf.some((v) => v.p.id === wahl)) {   // gewählter Platz passt nicht mehr → Auswahl aufheben und Grund nennen
        const p = Q.platz(wahl); const pr = p ? platzPruefen(p, w.von, w.n, w.l, w.b, w.t, g.id) : { gruende: ['unbekannter Platz'] };
        warn = '<p class="hinweis warn" style="margin:0"><strong>' + esc(platzName(wahl)) + ' passt nicht mehr:</strong> ' + pr.gruende.map(esc).join('; ') + '. Bitte einen anderen Platz wählen.</p>';
        wahl = '';
      }
      $('#platzwahl', el).innerHTML = '<option value="">– noch keinen –</option>' + vf.map((v) => '<option value="' + v.p.id + '"' + (v.p.id === wahl ? ' selected' : '') + '>' + esc(platzName(v.p.id)) + ' · ' + H.BRUECKE[v.p.bruecke] + ' · bis ' + H.zahl(v.p.max_laenge, 1) + ' m · ' + (v.art === 'frei' ? 'frei' : 'grünes Schild') + '</option>').join('');
      $('#platzinfo', el).textContent = vf.length ? vf.length + ' passende Plätze für den ganzen Zeitraum (frei oder Eigner unterwegs)' : 'Kein Platz passt für diesen Zeitraum und diese Maße – Gast kann ohne Platz gespeichert werden.';
      if (warn) $('#platzwarn', el).innerHTML = warn;
      knopf();
    };
    $('#platzwahl', el).addEventListener('change', (e) => { wahl = e.target.value; $('#platzwarn', el).innerHTML = ''; knopf(); });
    ['naechte', 'ankunft', 'laenge', 'breite', 'tiefgang'].forEach((k) => f[k].addEventListener('input', aktualisieren));
    if (f.status) f.status.addEventListener('change', knopf);
    $('#bez-heute', el).addEventListener('click', (e) => { e.preventDefault(); f.bezahlt_am.value = heute; });
    aktualisieren();
    $('#ok', el).addEventListener('click', () => {
      if (!f.reportValidity()) return; const x = Object.fromEntries(new FormData(f)); const w = werte();
      const status = x.status === 'storniert' ? 'storniert' : x.platz_id ? (x.status === 'abgereist' ? 'abgereist' : 'eingewiesen') : (x.status === 'abgereist' ? 'abgereist' : 'angemeldet');
      if (x.platz_id && status !== 'storniert') { const pr = platzPruefen(Q.platz(x.platz_id), w.von, w.n, w.l, w.b, w.t, g.id); if (!pr.ok) { toast(platzName(x.platz_id) + ' passt nicht: ' + pr.gruende.join('; '), 'fehler', 6000); return aktualisieren(); } }
      const daten = { bootsname: x.bootsname, skipper: x.skipper, herkunft: x.herkunft, tel: x.tel, laenge: w.l, breite: w.b, tiefgang: w.t || null, ankunft: x.ankunft, naechte: w.n, platz_id: status === 'storniert' ? '' : x.platz_id,
        betrag: w.n * gb.gast_nacht, zahlung: x.zahlung, bezahlt_am: x.bezahlt_am || '', status };
      if (daten.bezahlt_am && !g.quittung_nr) daten.quittung_nr = 'Q-' + daten.ankunft.slice(0, 4) + '-' + String(++d.zaehler.quittung).padStart(3, '0');
      if (neu) d.gaeste.push({ id: H.uid('G'), quelle: 'hafenmeister', erstellt: new Date().toISOString(), email: '', quittung_nr: '', ...daten }); else Object.assign(g, daten);
      speichern(status === 'storniert' ? 'Storniert.' : daten.platz_id ? 'Gast auf ' + platzName(daten.platz_id) + ' eingewiesen.' : 'Gespeichert – noch ohne Platz.'); zu(); zeige(tab);
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
      // Nach dem Einlagern gilt die Vergabe für den nächsten Sommer
      const ziel = heute > sd.einlagern ? SAISON + 1 : SAISON;
      d.belegungen.push({ id: H.uid('BL'), saison: ziel, periode: 'sommer', boot_id: b2.id, platz_typ: 'wasser', platz_id: pid, art: 'dauer', flaeche_m2: null, nicht_kranen: false, notiz: 'aus Warteliste' });
      if (ziel !== SAISON) toast('Platz für den Sommer ' + ziel + ' vergeben.');
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
    const e = d.einstellungen; const soll = Number(e.arbeitsdienst_soll || 0), mahn = Number(e.arbeitsdienst_mahnung_ab || 0), satz = Number(e.arbeitsdienst_satz || 0), abAlter = Number(e.arbeitsdienst_befreit_ab || 0);
    const liste = d.mitglieder.filter((m) => (m.art === 'ausuebend' || m.art === 'probe') && Q.istMitglied(m, heute)).map((m) => ({ m, a: G.arbeitsdienst(d, SAISON, m) }));
    const befreite = liste.filter((x) => x.a.befreit);
    const regeln = '<div class="panel"><h2>Regeln ' + SAISON + '</h2><ul class="regeln">' +
      '<li><strong>Soll:</strong> ' + soll + ' Stunden je Jahr für ausübende und Probemitglieder (Satzung § 10 II).</li>' +
      '<li><strong>Befreit:</strong> ' + (abAlter ? 'ab ' + abAlter + ' Jahren (Stichtag 1.1.) sowie ' : '') + 'einzeln vermerkte Mitglieder – derzeit ' + befreite.length + '.</li>' +
      '<li><strong>Rückstand:</strong> ' + (e.arbeitsdienst_vorjahr ? 'Fehlstunden des Vorjahres zählen mit (nur ein Jahr zurück).' : 'Fehlstunden verfallen am Jahresende – kein Übertrag ins nächste Jahr.') + '</li>' +
      '<li><strong>Aufforderung:</strong> ' + (mahn ? 'ab ' + mahn + ' Fehlstunden schriftlich.' : 'keine automatische Aufforderung.') + '</li>' +
      '<li><strong>Ersatzzahlung:</strong> ' + (satz ? H.geld(satz) + ' je Fehlstunde – wird mit der Beitragsrechnung des Folgejahres berechnet.' : 'keine.') + '</li></ul>' +
      (!e.arbeitsdienst_bestaetigt ? '<p class="hinweis warn">Diese Regeln sind noch <strong>Beispielwerte</strong> und nicht vom Vorstand beschlossen – deshalb wird auch nichts berechnet. ' + (darf('einstellungen') ? '<a href="#" data-gehe="einstellungen">Unter Einstellungen festlegen →</a>' : '') + '</p>' : '') + '</div>';
    const offen = d.arbeitsdienst.filter((a) => a.status === 'eingereicht').sort((x, y) => x.datum.localeCompare(y.datum));
    const einsaetze = (d.arbeitseinsaetze || []).slice().sort((x, y) => y.datum.localeCompare(x.datum));
    const codeVon = (id) => ((d.arbeitseinsatz_codes || []).find((c) => c.einsatz_id === id) || {}).code || '';
    main.innerHTML = kopf('Arbeitsdienst ' + SAISON, liste.length + ' Mitglieder arbeitspflichtig · Mitglieder melden Stunden per QR-Code am Einsatztag oder in „Mein SSV“, der Verein bestätigt.', '<button class="btn" id="einsatz-neu">+ Arbeitseinsatz</button><button class="btn primaer" id="neu">+ Stunden erfassen</button>') +
      (offen.length ? '<div class="panel" style="border:2px solid var(--gast)"><h2>Gemeldete Stunden bestätigen (' + offen.length + ')</h2><table class="tab"><tbody>' + offen.map((a) => { const m = Q.mitglied(a.mitglied_id); const ein = a.einsatz_id && einsaetze.find((x) => x.id === a.einsatz_id);
        return '<tr><td><strong>' + esc(Q.name(m)) + '</strong><br><small style="color:var(--muted)">' + H.datum(a.datum) + ' · ' + esc(a.taetigkeit || '') + (ein ? ' · per QR beim Einsatz' : ' · selbst gemeldet') + '</small></td>' +
          '<td class="r nw"><input class="suche std" type="number" step="0.5" min="0.5" max="12" value="' + a.stunden + '" aria-label="Stunden" style="width:76px;min-width:0"> Std.</td>' +
          '<td class="r nw"><button class="btn klein gruen" data-ok="' + a.id + '">Bestätigen</button> <button class="btn klein gefahr" data-ab="' + a.id + '">Ablehnen</button></td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      regeln +
      '<div class="panel"><h2>Arbeitseinsätze</h2>' + (einsaetze.length ? '<table class="tab"><tbody>' + einsaetze.map((x) => { const n = d.arbeitsdienst.filter((a) => a.einsatz_id === x.id && a.status !== 'abgelehnt').length;
        return '<tr' + (x.datum < heute ? ' class="blass"' : '') + '><td class="nw"><strong>' + H.datum(x.datum) + '</strong>' + (x.datum === heute ? ' <span class="tag gruen">heute</span>' : '') + '<br><small style="color:var(--muted)">' + esc([x.beginn, x.ende].filter(Boolean).join('–')) + '</small></td><td>' + esc(x.titel) + '<br><small style="color:var(--muted)">' + H.zahl(x.stunden, x.stunden % 1 ? 1 : 0) + ' Std. · Code ' + esc(codeVon(x.id)) + ' · ' + n + ' Check-in' + (n === 1 ? '' : 's') + '</small></td>' +
          '<td class="r nw"><button class="btn klein" data-plakat="' + x.id + '">QR-Plakat</button> <button class="btn klein gefahr" data-einsatz-weg="' + x.id + '">Löschen</button></td></tr>'; }).join('') + '</tbody></table>' : '<p class="leer">Noch keine Arbeitseinsätze geplant.</p>') +
      '<p class="hinweis" style="margin-top:10px">Am Einsatztag das QR-Plakat aushängen: Mitglieder scannen, melden sich in „Mein SSV“ an und tragen ihre Stunden ein. Der Code gilt nur am Einsatztag; bestätigt wird hier oben.</p></div>' +
      '<div class="panel"><h2>Stundenstand</h2><table class="tab"><thead><tr><th>Mitglied</th><th class="r">bestätigt</th><th class="r">Soll</th>' + (e.arbeitsdienst_vorjahr ? '<th class="r">Rest Vorjahr</th>' : '') + '<th class="r">Fehlstunden</th>' + (satz ? '<th class="r">Ersatz</th>' : '') + '<th>Stand</th></tr></thead><tbody>' +
      liste.sort((x, y) => y.a.fehl - x.a.fehl || x.m.nachname.localeCompare(y.m.nachname, 'de')).map(({ m, a }) =>
        '<tr class="klickbar" data-m="' + m.id + '"><td>' + esc(Q.name(m)) + '</td><td class="r">' + H.zahl(a.ist, a.ist % 1 ? 1 : 0) + ' Std.' + (a.gemeldet ? '<br><small style="color:var(--muted)">+' + H.zahl(a.gemeldet, a.gemeldet % 1 ? 1 : 0) + ' gemeldet</small>' : '') + '</td><td class="r">' + (a.befreit ? '–' : a.soll) + '</td>' + (e.arbeitsdienst_vorjahr ? '<td class="r">' + (a.vorjahr || '–') + '</td>' : '') +
        '<td class="r">' + (a.befreit ? '–' : H.zahl(a.fehl, a.fehl % 1 ? 1 : 0)) + '</td>' + (satz ? '<td class="r">' + (a.fehl && !a.befreit ? H.geld(a.fehl * satz) : '') + '</td>' : '') +
        '<td>' + (a.befreit ? '<span class="tag">befreit: ' + esc(a.befreit) + '</span>' : mahn && a.fehl >= mahn ? '<span class="tag rot">Aufforderung</span>' : a.fehl > 0 ? '<span class="tag warn">offen</span>' : '<span class="tag ok">erfüllt</span>') + '</td></tr>').join('') + '</tbody></table>' +
      '<p class="hinweis" style="margin-top:10px">Befreiung je Mitglied: in der Zeile tippen und unter „Arbeitsdienst befreit“ den Grund eintragen.</p></div>';
    main.querySelectorAll('[data-ok],[data-ab]').forEach((bt) => bt.addEventListener('click', () => {
      const a = d.arbeitsdienst.find((x) => x.id === (bt.dataset.ok || bt.dataset.ab)); const std = Number(bt.closest('tr').querySelector('input.std').value);
      if (bt.dataset.ok && !(std > 0 && std <= 12)) return toast('Bitte 0,5 bis 12 Stunden.', 'fehler');
      Object.assign(a, { status: bt.dataset.ok ? 'bestaetigt' : 'abgelehnt', stunden: bt.dataset.ok ? std : a.stunden, geprueft_von: ROLLEN[rolle].name });
      speichern(bt.dataset.ok ? 'Bestätigt.' : 'Abgelehnt.'); zeige(tab);
    }));
    main.querySelectorAll('[data-plakat]').forEach((bt) => bt.addEventListener('click', () => oeffnen('drucken.html?art=einsatz&id=' + bt.dataset.plakat)));
    main.querySelectorAll('[data-einsatz-weg]').forEach((bt) => bt.addEventListener('click', () => {
      if (!confirm('Arbeitseinsatz löschen? Bereits gemeldete Stunden bleiben erhalten.')) return;
      d.arbeitsdienst.forEach((a) => { if (a.einsatz_id === bt.dataset.einsatzWeg) a.einsatz_id = null; });
      d.arbeitseinsatz_codes = d.arbeitseinsatz_codes.filter((c) => c.einsatz_id !== bt.dataset.einsatzWeg); d.arbeitseinsaetze = d.arbeitseinsaetze.filter((x) => x.id !== bt.dataset.einsatzWeg);
      speichern('Gelöscht.'); zeige(tab);
    }));
    $('#einsatz-neu').addEventListener('click', () => {
      const el = modal('<h2>Arbeitseinsatz planen</h2><form id="f" class="form"><label class="feld voll">Was?<input name="titel" required maxlength="100" placeholder="z. B. Winterarbeitsdienst: Steg und Gelände"></label>' +
        '<label class="feld">Datum<input name="datum" type="date" required value="' + heute + '"></label><label class="feld">Stunden (Vorschlag)<input name="stunden" type="number" step="0.5" min="0.5" max="12" required value="4"></label>' +
        '<label class="feld">Beginn<input name="beginn" type="time" value="09:00"></label><label class="feld">Ende<input name="ende" type="time" value="13:00"></label><label class="feld voll">Hinweis<input name="notiz" placeholder="z. B. Treffpunkt Messe, Arbeitshandschuhe mitbringen"></label></form>' +
        '<p class="hinweis">Mitglieder sehen den Termin in „Mein SSV“. Zum Check-in gibt es ein QR-Plakat mit Code, der nur am Einsatztag gilt.</p><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Anlegen</button></div>');
      $('#ok', el).addEventListener('click', () => {
        const fm = $('#f', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm));
        const id = H.uid('E'); const zeichen = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; const zz = crypto.getRandomValues(new Uint32Array(6)); zz.forEach((n) => { code += zeichen[n % zeichen.length]; });
        d.arbeitseinsaetze.push({ id, datum: x.datum, titel: x.titel, beginn: x.beginn, ende: x.ende, stunden: Number(x.stunden), notiz: x.notiz, erstellt_von: ROLLEN[rolle].name });
        d.arbeitseinsatz_codes.push({ einsatz_id: id, code });
        speichern('Arbeitseinsatz angelegt – QR-Plakat drucken und am Einsatztag aushängen.'); zu(); zeige(tab);
      });
    });
    main.querySelectorAll('[data-m]').forEach((r) => r.addEventListener('click', () => mitgliedForm(Q.mitglied(r.dataset.m))));
    $('#neu').addEventListener('click', () => {
      const el = modal('<h2>Arbeitsstunden</h2><form id="f" class="form"><label class="feld voll">Mitglied<select name="mitglied_id" required>' + mOpt(null, (m) => m.art === 'ausuebend' || m.art === 'probe') + '</select></label><label class="feld">Datum<input name="datum" type="date" required value="' + heute + '"></label><label class="feld">Stunden<input name="stunden" type="number" step="0.5" min="0.5" required value="4"></label><label class="feld voll">Tätigkeit<input name="taetigkeit" placeholder="z. B. Einlagern, Steg-Wartung"></label></form><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Erfassen</button></div>');
      $('#ok', el).addEventListener('click', () => { const fm = $('#f', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm)); d.arbeitsdienst.push({ id: H.uid('AD'), ...x, stunden: Number(x.stunden), status: 'bestaetigt', einsatz_id: null, gemeldet: null, geprueft_von: ROLLEN[rolle].name }); speichern('Erfasst.'); zu(); zeige(tab); });
    });
  };

  /* ============================================================ Abrechnung */
  const abrStand = { periode: imSommer ? 'sommer' : 'winter', datum: heute, beitragJahr: SAISON + 1, such: '', art: '', jahr: '', status: '', mehr: false };
  const RSTATUS = { offen: ['offen', 'warn'], ueberfaellig: ['überfällig', 'rot'], teilbezahlt: ['teilweise bezahlt', 'warn'], ruecklastschrift: ['Rücklastschrift', 'rot'], bezahlt: ['bezahlt', 'ok'], storniert: ['storniert', 'rot'] };
  V.abrechnung = (main) => {
    const per = abrStand.periode, e = d.einstellungen;
    const jahr = per === 'beitrag' ? abrStand.beitragJahr : SAISON;
    const vs = G.vorschau(d, jahr, per, abrStand.datum).filter((x) => x.summe > 0);
    const offen = vs.filter((x) => !x.schon_abgerechnet);
    const ohneMandat = offen.filter((x) => !(x.m.iban && x.m.mandat_ref && x.m.mandat_datum));
    const res = d.rechnungen.slice().sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || b.nr.localeCompare(a.nr));   // neueste zuerst
    const sepaBereit = res.filter((r) => r.sepa && !r.sepa_lauf && Q.rest(r) > 0);
    const jahre = [...new Set(res.map((r) => String(r.saison)))].sort().reverse();
    const sepaOk = SEPA.ibanGueltig(e.iban) && SEPA.glaeubigerGueltig(e.glaeubiger_id);
    const label = H.periodeText({ periode: per, saison: jahr });
    main.innerHTML = kopf('Abrechnung & Lastschrift', 'Mitgliedsbeitrag einmal im Jahr · laut Gebührenordnung Sommer nach dem Auslagern, Winter nach dem Einlagern.',
      [SAISON, SAISON + 1].map((j) => '<button class="btn' + (per === 'beitrag' && jahr === j ? ' aktiv' : '') + '" data-per="beitrag" data-jahr="' + j + '">Beitrag ' + j + '</button>').join('') +
      '<button class="btn' + (per === 'sommer' ? ' aktiv' : '') + '" data-per="sommer">Sommer ' + SAISON + '</button><button class="btn' + (per === 'winter' ? ' aktiv' : '') + '" data-per="winter">Winter ' + SAISON + '/' + String(SAISON + 1).slice(2) + '</button>') +
      (!e.steuer_hinweis ? '<p class="hinweis warn">Der <strong>Steuerhinweis</strong> für Rechnungen ist noch nicht festgelegt (mit dem Steuerberater klären). ' + (darf('einstellungen') ? '<a href="#" data-gehe="einstellungen">Unter Einstellungen festlegen →</a>' : '') + '</p>' : '') +
      '<div class="panel"><h2>1 · Vorschau ' + label + '</h2>' +
      (offen.length ? '<p>' + offen.length + ' Mitglieder · <strong>' + H.geld(offen.reduce((s, x) => s + x.summe, 0)) + '</strong>' + (vs.length > offen.length ? ' · ' + (vs.length - offen.length) + ' bereits abgerechnet' : '') + '</p>' : '<p class="hinweis ok">' + label + ' ist vollständig abgerechnet.</p>') +
      (ohneMandat.length ? '<p class="hinweis warn">' + ohneMandat.length + ' ohne SEPA-Mandat – ihre Rechnung nennt die Bankverbindung zur Überweisung.</p>' : '') +
      (offen.length ? '<details class="vorschau"' + (offen.length <= 12 ? ' open' : '') + '><summary>Vorschau je Mitglied anzeigen (' + offen.length + ')</summary><table class="tab"><thead><tr><th>Mitglied</th><th>Art</th><th>Positionen</th><th class="r">Betrag</th></tr></thead><tbody>' + offen.map((x) =>
        '<tr><td>' + esc(Q.name(x.m)) + '</td><td><span class="tag">' + H.ART[x.m.art] + '</span></td><td style="font-size:12.5px;color:var(--muted)">' + x.positionen.map((p) => esc(p.text.split(' · ')[0].replace(/ \(wird an den Segler-Verband weitergegeben\)/, '')) + (per === 'beitrag' ? ' · ' + H.geld(p.betrag) : '')).join('<br>') + '</td><td class="r">' + H.geld(x.summe) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="3">Summe</td><td class="r">' + H.geld(offen.reduce((s, x) => s + x.summe, 0)) + '</td></tr></tfoot></table></details>' +
        '<div class="filter" style="margin-top:14px"><label class="feld">Rechnungsdatum<input type="date" id="rdat" value="' + abrStand.datum + '"></label><button class="btn primaer" id="los">2 · ' + offen.length + ' Rechnungen erstellen</button></div>' : '') + '</div>' +
      '<div class="panel"><div class="kopf" style="margin-bottom:8px"><h2 style="margin:0">3 · Lastschrift an die Bank</h2><div class="aktionen"><button class="btn dunkel" id="sepa"' + (sepaBereit.length && sepaOk ? '' : ' disabled') + '>SEPA-Datei erzeugen (' + sepaBereit.length + ')</button><button class="btn" id="csvr">Rechnungsliste CSV</button></div></div>' +
      (!sepaOk ? '<p class="hinweis warn">Für die Lastschrift-Datei fehlen gültige Vereinsdaten (IBAN und Gläubiger-ID) unter Einstellungen.</p>' : '<p class="hinweis">Erzeugt eine Sammellastschrift im aktuellen Bankformat <strong>pain.008.001.08</strong> (Pflicht ab November 2026). Die Datei im Online-Banking des Vereins hochladen; Einzug am Fälligkeitstag der Rechnungen.</p>') +
      (d.sepa_laeufe.length ? '<p style="font-size:13px;color:var(--muted)">Bisherige Dateien: ' + d.sepa_laeufe.map((l) => esc(l.id) + ' (' + l.anzahl + ' Posten, ' + H.geld(l.summe) + ')').join(' · ') + '</p>' : '') +
      '<h3 style="margin:18px 0 8px">Rechnungen (' + res.length + ')</h3><div class="filter"><input class="suche" id="r-such" placeholder="Name, Mitgliedsnr. oder Rechnungsnr. …" value="' + esc(abrStand.such) + '">' +
      '<select class="suche" id="r-art" style="min-width:0"><option value="">alle Arten</option><option value="beitrag">Beitrag</option><option value="sommer">Sommer</option><option value="winter">Winter</option></select>' +
      '<select class="suche" id="r-jahr" style="min-width:0"><option value="">alle Jahre</option>' + jahre.map((j) => '<option>' + j + '</option>').join('') + '</select>' +
      '<select class="suche" id="r-status" style="min-width:0"><option value="">jeder Stand</option><option value="nicht_bezahlt">noch nicht bezahlt</option>' + Object.entries(RSTATUS).map(([k, [t]]) => '<option value="' + k + '">' + t + '</option>').join('') + '</select></div>' +
      '<p id="r-summe" style="font-size:13px;color:var(--muted);margin:0 0 6px"></p>' +
      '<table class="tab"><thead><tr><th>Nr.</th><th>Datum</th><th>Mitglied</th><th>Periode</th><th class="r">Betrag</th><th>Zahlung</th><th>Stand</th><th></th></tr></thead><tbody id="r-liste"></tbody></table><div id="r-mehr"></div></div>';
    ['art', 'jahr', 'status'].forEach((k) => { $('#r-' + k).value = abrStand[k]; });
    const rListe = () => {
      const q = abrStand.such.trim().toLowerCase();
      const l = res.filter((r) => { const st = Q.rstatus(r, heute);
        return (!q || (r.nr + ' ' + r.empfaenger.nr + ' ' + r.empfaenger.vorname + ' ' + r.empfaenger.nachname).toLowerCase().includes(q)) && (!abrStand.art || r.periode === abrStand.art) &&
          (!abrStand.jahr || String(r.saison) === abrStand.jahr) && (!abrStand.status || (abrStand.status === 'nicht_bezahlt' ? Q.rest(r) > 0 : st === abrStand.status)); });
      const zeig = abrStand.mehr ? l : l.slice(0, 40);
      $('#r-summe').textContent = l.length + ' Rechnungen · ' + H.geld(l.reduce((s, r) => s + (r.storniert_am ? 0 : r.summe), 0)) + ' · davon offen ' + H.geld(l.reduce((s, r) => s + Q.rest(r), 0));
      $('#r-liste').innerHTML = zeig.map((r) => { const st = Q.rstatus(r, heute); const rest = Q.rest(r); const z = r.zahlungen || [];
        return '<tr' + (r.storniert_am ? ' class="blass"' : '') + '><td><strong style="white-space:nowrap">' + esc(r.nr) + '</strong></td><td>' + H.datum(r.datum) + '</td><td>' + esc(r.empfaenger.vorname + ' ' + r.empfaenger.nachname) + ' <small style="color:var(--muted)">' + esc(r.empfaenger.nr || '') + '</small></td><td>' + H.periodeText(r) + '</td>' +
          '<td class="r">' + H.geld(r.summe) + (rest > 0 && rest < r.summe ? '<br><small>offen ' + H.geld(rest) + '</small>' : '') + '</td><td>' + (r.sepa ? 'Lastschrift' + (r.sepa_lauf ? ' <small style="color:var(--muted)">' + esc(r.sepa_lauf) + '</small>' : '') : 'Überweisung') + '</td>' +
          '<td><span class="tag ' + RSTATUS[st][1] + '">' + RSTATUS[st][0] + '</span>' + (r.bezahlt_am ? ' <small style="color:var(--muted)">' + H.kurz(r.bezahlt_am) + '</small>' : '') + (z.length ? ' <small style="color:var(--muted)" title="' + esc(z.map((x) => H.datum(x.datum) + ' ' + (x.art === 'ruecklastschrift' ? 'Rücklastschrift' : 'Eingang') + ' ' + H.geld(x.betrag) + (x.notiz ? ' – ' + x.notiz : '')).join('\n')) + '">(' + z.length + ' Buchung' + (z.length > 1 ? 'en' : '') + ')</small>' : '') + '</td>' +
          '<td class="r" style="white-space:nowrap"><button class="btn klein" data-zeige="' + r.id + '">Ansehen</button> ' + (!r.storniert_am ? '<button class="btn klein" data-zahl="' + r.id + '">Zahlung</button> ' : '') + (!r.storniert_am && !r.bezahlt_am && !Q.gezahlt(r) ? '<button class="btn klein gefahr" data-storno="' + r.id + '">Storno</button>' : '') + '</td></tr>'; }).join('') || '<tr><td colspan="8" class="leer">Keine Rechnung passt zu den Filtern.</td></tr>';
      $('#r-mehr').innerHTML = l.length > zeig.length ? '<button class="btn klein" style="margin-top:10px">Alle ' + l.length + ' anzeigen</button>' : '';
      const mb = $('#r-mehr button'); if (mb) mb.addEventListener('click', () => { abrStand.mehr = true; rListe(); });
    };
    $('#r-such').addEventListener('input', (e) => { abrStand.such = e.target.value; abrStand.mehr = false; rListe(); });
    ['art', 'jahr', 'status'].forEach((k) => $('#r-' + k).addEventListener('change', (e) => { abrStand[k] = e.target.value; abrStand.mehr = false; rListe(); }));
    rListe();
    $('#r-liste').addEventListener('click', (e) => {
      const z = e.target.closest('[data-zeige]'); if (z) return oeffnen('drucken.html?art=rechnungen&ids=' + z.dataset.zeige);
      const zb = e.target.closest('[data-zahl]'); if (zb) return zahlungDialog(d.rechnungen.find((r) => r.id === zb.dataset.zahl));
      const sb = e.target.closest('[data-storno]'); if (sb) { if (!confirm('Rechnung stornieren? Das Mitglied erscheint danach wieder in der Vorschau – so lässt sich eine falsche Rechnung korrigieren.')) return; G.stornieren(d, sb.dataset.storno); speichern('Storniert.'); zeige('abrechnung'); }
    });
    main.querySelectorAll('[data-per]').forEach((b) => b.addEventListener('click', () => { abrStand.periode = b.dataset.per; if (b.dataset.jahr) abrStand.beitragJahr = Number(b.dataset.jahr); zeige('abrechnung'); }));
    const rdat = $('#rdat'); if (rdat) rdat.addEventListener('change', () => { abrStand.datum = rdat.value; });
    const los = $('#los'); if (los) los.addEventListener('click', () => {
      if (!confirm(offen.length + ' Rechnungen für ' + label + ' erstellen?')) return;
      const neu = G.saisonAbrechnen(d, jahr, per, abrStand.datum); speichern(neu.length + ' Rechnungen erstellt.'); zeige('abrechnung');
      if (neu.length && confirm('Rechnungen jetzt ansehen / als PDF sichern?')) oeffnen('drucken.html?art=rechnungen&ids=' + neu.map((r) => r.id).join(','));
    });
    $('#sepa').addEventListener('click', () => {
      const ersterEinzug = sepaBereit.map((r) => r.faellig).sort()[0];
      if (!confirm('Lastschrift-Datei für ' + sepaBereit.length + ' Rechnungen erzeugen?\n\nDie Rechnung ist zugleich die Ankündigung des Einzugs (frühester Einzug ' + H.datum(ersterEinzug) + '). Haben alle Mitglieder ihre Rechnung bekommen – in „Mein SSV“, per E-Mail oder als Brief?')) return;
      const ungueltig = [];
      const posten = sepaBereit.map((r) => { const m = Q.mitglied(r.mitglied_id);
        if (!SEPA.ibanGueltig(m.iban)) { ungueltig.push(r.nr); return null; }
        return { betrag: Q.rest(r), mandat_ref: r.mandat_ref, mandat_datum: r.mandat_datum, name: m.kontoinhaber || Q.name(m), iban: m.iban, bic: m.bic, zweck: (r.periode === 'beitrag' ? 'Mitgliedsbeitrag ' + r.saison + ' ' + r.nr : 'Hafengeld ' + r.nr + ' ' + H.periodeText(r)), e2e: r.nr, re: r }; }).filter(Boolean);
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
    $('#csvr').addEventListener('click', () => download('hafen-rechnungen.csv', csv([['Nr', 'Datum', 'Fällig', 'Mitgliedsnr', 'Name', 'Periode', 'Betrag', 'Offen', 'Stand', 'Zahlart', 'SEPA-Datei', 'Bezahlt am', 'Storniert']].concat(res.map((r) => [r.nr, H.datum(r.datum), H.datum(r.faellig), r.empfaenger.nr, r.empfaenger.vorname + ' ' + r.empfaenger.nachname, H.periodeText(r), H.zahl(r.summe), H.zahl(Q.rest(r)), RSTATUS[Q.rstatus(r, heute)][0], r.sepa ? 'Lastschrift' : 'Überweisung', r.sepa_lauf || '', H.datum(r.bezahlt_am), r.storniert_am ? 'ja' : '']))), 'text/csv'));
  };
  // Zahlungseingang (auch Teilzahlung) und Rücklastschrift je Rechnung
  function zahlungDialog(r) {
    if (!r.zahlungen) r.zahlungen = [];
    const rest = Q.rest(r); const st = Q.rstatus(r, heute);
    const el = modal('<h2>Zahlung · ' + esc(r.nr) + '</h2><p>' + esc(r.empfaenger.vorname + ' ' + r.empfaenger.nachname) + ' · ' + H.periodeText(r) + ' · Betrag <strong>' + H.geld(r.summe) + '</strong> · offen <strong>' + H.geld(rest) + '</strong></p>' +
      (r.zahlungen.length || r.bezahlt_am ? '<table class="tab"><tbody>' + r.zahlungen.map((z) => '<tr><td>' + H.datum(z.datum) + '</td><td>' + (z.art === 'ruecklastschrift' ? '<span class="tag rot">Rücklastschrift</span>' : 'Eingang') + '</td><td class="r">' + H.geld(z.betrag) + '</td><td>' + esc(z.notiz || '') + '</td></tr>').join('') +
        (r.bezahlt_am && !r.zahlungen.length ? '<tr><td>' + H.datum(r.bezahlt_am) + '</td><td>Eingang</td><td class="r">' + H.geld(r.summe) + '</td><td>vollständig</td></tr>' : '') + '</tbody></table>' : '<p class="leer">Noch keine Zahlung gebucht.</p>') +
      (rest > 0 ? '<form id="f" class="form" style="margin-top:12px"><label class="feld">Eingang am<input name="datum" type="date" required value="' + heute + '"></label><label class="feld">Betrag (€)<input name="betrag" type="number" step="0.01" min="0.01" required value="' + rest.toFixed(2) + '"><small>weniger als offen = Teilzahlung</small></label><label class="feld voll">Notiz<input name="notiz" placeholder="z. B. Kontoauszug 12/2026"></label></form>' : '') +
      (st === 'ruecklastschrift' && r.sepa ? '<p class="hinweis warn" style="margin-top:12px">Die Lastschrift ist zurückgekommen. Erst mit dem Mitglied sprechen (Konto gedeckt? neue Bankverbindung?) – dann erneut einziehen oder Überweisung abwarten.</p>' : '') +
      '<div class="modal-fuss">' + (r.sepa && r.sepa_lauf && st !== 'ruecklastschrift' ? '<button class="btn gefahr links" id="rueck">Rücklastschrift</button>' : '') + (st === 'ruecklastschrift' && r.sepa ? '<button class="btn links" id="erneut">Erneut einziehen</button>' : '') +
      '<button class="btn" data-zu>Schließen</button>' + (rest > 0 ? '<button class="btn primaer" id="ok">Zahlung buchen</button>' : '') + '</div>');
    const ok = $('#ok', el); if (ok) ok.addEventListener('click', () => {
      const fm = $('#f', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm)); const betrag = Math.round(Number(x.betrag) * 100) / 100;
      if (betrag > rest + 0.001 && !confirm('Der Betrag ist höher als der offene Rest (' + H.geld(rest) + '). Trotzdem buchen?')) return;
      r.zahlungen = r.zahlungen.concat([{ datum: x.datum, betrag, art: 'eingang', notiz: x.notiz || '' }]);
      if (Q.gezahlt(r) >= r.summe - 0.001) r.bezahlt_am = x.datum;
      speichern(r.bezahlt_am ? 'Vollständig bezahlt.' : 'Teilzahlung gebucht – offen ' + H.geld(Q.rest(r)) + '.'); zu(); zeige('abrechnung');
    });
    const rb = $('#rueck', el); if (rb) rb.addEventListener('click', () => {
      const grund = prompt('Rücklastschrift für ' + r.nr + ' – Grund laut Bank (z. B. Konto erloschen, Widerspruch, mangelnde Deckung):', ''); if (grund === null) return;
      const war = r.bezahlt_am ? r.summe : Q.gezahlt(r);   // wurde der Einzug schon als Eingang gebucht, wird er zurückgenommen
      const z = r.zahlungen.slice(); if (r.bezahlt_am && !z.length) z.push({ datum: r.bezahlt_am, betrag: r.summe, art: 'eingang', notiz: 'Lastschrift ' + (r.sepa_lauf || '') });
      z.push({ datum: heute, betrag: war, art: 'ruecklastschrift', notiz: grund });
      r.zahlungen = z; r.bezahlt_am = null; speichern('Rücklastschrift vermerkt.'); zu(); zeige('abrechnung');
    });
    const eb = $('#erneut', el); if (eb) eb.addEventListener('click', () => { if (!confirm('Beim nächsten Lastschrift-Lauf erneut einziehen? (Rest ' + H.geld(rest) + ')')) return; r.sepa_lauf = null; speichern('Wird beim nächsten Lauf erneut eingezogen.'); zu(); zeige('abrechnung'); });
  }

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
      '<div class="panel"><table class="tab"><thead><tr><th>Mitgliedsbeitrag (Jahr)</th><th class="r">Vereinsbeitrag</th><th class="r">Verbandsbeitrag</th><th class="r">zusammen</th></tr></thead><tbody>' +
      Object.entries(gb.beitraege || {}).map(([art, w]) => '<tr><td>' + H.ART[art] + '</td>' + ['verein', 'verband'].map((t) => '<td class="r"><input class="suche" style="min-width:0;width:90px;text-align:right" data-k="beitraege.' + art + '.' + t + '" value="' + w[t] + '"></td>').join('') +
        '<td class="r">' + H.geld(w.verein + w.verband) + '</td></tr>').join('') + '</tbody></table><table class="tab"><tbody>' + einzel('Eintrittsgeld Probemitglied (je Probejahr, bis zu 3 Jahre)', 'eintrittsgeld_probe', '€') + '</tbody></table></div>' +
      '<p class="hinweis">Neue Gebühren nach der Jahreshauptversammlung hier eintragen. Bereits erstellte Rechnungen ändern sich dadurch nicht.</p>';
    $('#ok').addEventListener('click', () => {
      main.querySelectorAll('[data-k]').forEach((i) => { const [k, b, c] = i.dataset.k.split('.'); const v = Number(String(i.value).replace(',', '.')); if (isNaN(v)) return; if (c) gb[k][b][c] = v; else if (b) gb[k][b] = v; else gb[k] = v; });
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
      f('rechnung_praefix', 'Rechnungsnummer-Präfix') + f('zahlungsziel_tage', 'Einzug nach Rechnungsdatum (Tage)', 'number') + f('steuernummer', 'Steuernummer (Rechnungsfuß)') +
      '<label class="feld check voll"><input type="checkbox" name="stromumlage_ueber_hafen"' + (e.stromumlage_ueber_hafen ? ' checked' : '') + '> Stromumlage mit der Hafenrechnung einziehen (sonst über den Mitgliedsbeitrag)</label>' +
      '<h3 class="voll" style="margin:14px 0 0">Steuerhinweis auf Hafen-Rechnungen und Quittungen</h3>' +
      '<label class="feld voll">Hinweis<select name="steuer_hinweis"><option value="">noch nicht festgelegt (es wird nichts gedruckt)</option>' +
        [['kleinunternehmer', 'Kleinunternehmer: „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“'], ['ust19', 'Umsatzsteuer 19 % ausweisen (Betrag wird aus dem Bruttopreis errechnet)'], ['frei', 'eigener Text (unten)']].map(([k, t]) => '<option value="' + k + '"' + (e.steuer_hinweis === k ? ' selected' : '') + '>' + t + '</option>').join('') +
        '</select><small>Bitte mit dem Steuerberater klären – Mitgliedsbeiträge erhalten keinen Steuerhinweis.</small></label>' +
      '<label class="feld voll">Eigener Text<input name="steuer_text" value="' + esc(e.steuer_text || '') + '" placeholder="nur bei „eigener Text“"></label>' +
      '<h3 class="voll" style="margin:14px 0 0">Arbeitsdienst</h3>' + f('arbeitsdienst_soll', 'Soll (Std./Jahr)', 'number') + f('arbeitsdienst_mahnung_ab', 'Schriftliche Aufforderung ab … Fehlstunden', 'number') +
      f('arbeitsdienst_befreit_ab', 'Befreit ab Alter (0 = keine Grenze)', 'number') + f('arbeitsdienst_satz', 'Ersatzzahlung je Fehlstunde in € (0 = keine)', 'number', ' step="0.5"') +
      '<label class="feld check voll"><input type="checkbox" name="arbeitsdienst_vorjahr"' + (e.arbeitsdienst_vorjahr ? ' checked' : '') + '> Fehlstunden des Vorjahres zählen mit</label>' +
      '<label class="feld check voll"><input type="checkbox" name="arbeitsdienst_bestaetigt"' + (e.arbeitsdienst_bestaetigt ? ' checked' : '') + '> Diese Regeln hat der Vorstand beschlossen (erst dann wird eine Ersatzzahlung berechnet)</label>' +
      '<h3 class="voll" style="margin:14px 0 0">Saisontermine</h3>' + [SAISON, SAISON + 1].map((j) => { const s = (d.saisons || []).find((x) => x.jahr === j) || {};
        return '<label class="feld">Auslagern ' + j + '<input type="date" name="aus_' + j + '" value="' + esc(s.auslagern || '') + '"></label><label class="feld">Einlagern ' + j + '<input type="date" name="ein_' + j + '" value="' + esc(s.einlagern || '') + '"></label>'; }).join('') +
      (DB ? '<h3 class="voll" style="margin:14px 0 0">Push-Benachrichtigungen</h3><label class="feld check voll"><input type="checkbox" name="push_aktiv"' + (e.push_aktiv ? ' checked' : '') + '> In „Mein SSV“ anbieten, Mitteilungen auch als Push aufs Handy zu bekommen (iPhone: nur wenn „Mein SSV“ zum Home-Bildschirm hinzugefügt ist)</label>' : '') +
      '<h3 class="voll" style="margin:14px 0 0">Hafenplan</h3>' +
      '<label class="feld check voll"><input type="checkbox" name="plan_bestaetigt"' + (e.plan_bestaetigt ? ' checked' : '') + '> Brückenzuordnung und Boxmaße unter „Liegeplätze“ sind geprüft und stimmen</label></form></div>' +
      (darf('verlauf') ? '<div class="panel"><h2>Datensicherung</h2><p class="hinweis">' + (DB ? 'Die Vereinsdatenbank wird beim Anbieter gesichert (Tarif prüfen: tägliche Sicherung). Zusätzlich kannst du hier jederzeit eine Kopie aller Hafen- und Mitgliederdaten herunterladen – z. B. einmal im Monat, sicher aufbewahren (enthält Bankdaten).' : 'In der Demo liegen die Daten nur in diesem Browser.') + '</p><button class="btn" id="sicherung">Datensicherung herunterladen</button></div>' : '') +
      (DB ? '' : '<div class="panel"><h2>Demo</h2><p class="hinweis">Setzt alle Daten auf die erfundenen Beispieldaten zurück.</p><button class="btn gefahr" id="reset">Demo zurücksetzen</button></div>');
    $('#ok').addEventListener('click', () => {
      const x = Object.fromEntries(new FormData($('#f'))); ['stromumlage_ueber_hafen', 'arbeitsdienst_vorjahr', 'arbeitsdienst_bestaetigt', 'plan_bestaetigt'].concat(DB ? ['push_aktiv'] : []).forEach((k) => { x[k] = !!x[k]; });
      ['zahlungsziel_tage', 'arbeitsdienst_soll', 'arbeitsdienst_mahnung_ab', 'arbeitsdienst_befreit_ab', 'arbeitsdienst_satz'].forEach((k) => { x[k] = Number(String(x[k]).replace(',', '.')) || 0; });
      if (x.steuer_hinweis === 'frei' && !x.steuer_text.trim()) return toast('Bitte den eigenen Steuerhinweis eintragen.', 'fehler');
      for (const j of [SAISON, SAISON + 1]) {
        const aus = x['aus_' + j], ein = x['ein_' + j]; delete x['aus_' + j]; delete x['ein_' + j];
        if (!aus && !ein) continue; if (!aus || !ein || ein <= aus) return toast('Saison ' + j + ': bitte Auslagern und Einlagern eintragen (Einlagern nach dem Auslagern).', 'fehler');
        const s = d.saisons.find((y) => y.jahr === j); if (s) Object.assign(s, { auslagern: aus, einlagern: ein }); else d.saisons.push({ jahr: j, auslagern: aus, einlagern: ein });
      }
      if (x.iban && !SEPA.ibanGueltig(x.iban)) return toast('IBAN des Vereins ist ungültig.', 'fehler');
      if (x.glaeubiger_id && !SEPA.glaeubigerGueltig(x.glaeubiger_id)) return toast('Gläubiger-ID hat ein ungültiges Format.', 'fehler');
      Object.assign(e, x); speichern('Gespeichert.');
    });
    const sich = $('#sicherung'); if (sich) sich.addEventListener('click', () => {
      const { dokumente, ...rest } = d; const stand = new Date().toISOString().slice(0, 16).replace(':', '-');
      download('ssv-datensicherung-' + stand + '.json', JSON.stringify({ erstellt: new Date().toISOString(), von: ROLLEN[rolle].name, hinweis: 'Enthält personenbezogene Daten und Bankdaten – sicher aufbewahren.', daten: rest }, null, 1), 'application/json');
      toast('Datensicherung heruntergeladen.');
    });
    if ($('#reset')) $('#reset').addEventListener('click', () => { if (confirm('Alle Demo-Daten zurücksetzen?')) { d = HF.zuruecksetzen(); toast('Zurückgesetzt.'); zeige('uebersicht'); } });
  };

  /* ============================================================ Schäden & Wartung */
  const aufStand = { filter: 'offen' };
  const PRIO = { hoch: ['dringend', 'rot'], normal: ['normal', ''], niedrig: ['später', 'blass-tag'] };
  const AST = { offen: ['offen', 'warn'], in_arbeit: ['in Arbeit', 'gast'], erledigt: ['erledigt', 'ok'] };
  V.aufgaben = (main) => {
    const alle = (d.aufgaben || []).slice().sort((a, b) => (a.status === 'erledigt') - (b.status === 'erledigt') || ['hoch', 'normal', 'niedrig'].indexOf(a.prioritaet) - ['hoch', 'normal', 'niedrig'].indexOf(b.prioritaet) || (a.faellig || '9').localeCompare(b.faellig || '9'));
    const l = alle.filter((t) => aufStand.filter === 'alle' || (aufStand.filter === 'offen' ? t.status !== 'erledigt' : t.status === aufStand.filter));
    main.innerHTML = kopf('Schäden & Wartung', 'Was kaputt ist oder regelmäßig geprüft werden muss – mit Verantwortlichem und Stand. Mitglieder melden Schäden über „Mein SSV“.', '<button class="btn primaer" id="neu">+ Schaden / Wartung</button>') +
      '<div class="filter">' + [['offen', 'offen & in Arbeit'], ['erledigt', 'erledigt'], ['alle', 'alle']].map(([k, t]) => '<button class="btn klein' + (aufStand.filter === k ? ' aktiv' : '') + '" data-af="' + k + '">' + t + '</button>').join('') + '</div>' +
      '<div class="panel"><table class="tab"><thead><tr><th>Priorität</th><th>Was</th><th>Wo</th><th>Wer kümmert sich</th><th>fällig</th><th>Stand</th></tr></thead><tbody>' +
      (l.map((t) => '<tr class="klickbar' + (t.status === 'erledigt' ? ' blass' : '') + '" data-t="' + t.id + '"><td><span class="tag ' + PRIO[t.prioritaet][1] + '">' + PRIO[t.prioritaet][0] + '</span></td><td><strong>' + esc(t.titel) + '</strong><br><small style="color:var(--muted)">' + (t.art === 'wartung' ? 'Wartung' : 'Schaden') + ' · gemeldet ' + new Date(t.erstellt).toLocaleDateString('de-DE') + ' von ' + esc(t.erstellt_von || '–') + '</small></td>' +
        '<td>' + esc(t.platz_id ? platzName(t.platz_id) : (t.ort || '')) + '</td><td>' + esc(t.verantwortlich || '–') + '</td><td class="nw">' + (t.faellig ? '<span' + (t.faellig < heute && t.status !== 'erledigt' ? ' class="tag rot"' : '') + '>' + H.datum(t.faellig) + '</span>' : '') + '</td><td><span class="tag ' + AST[t.status][1] + '">' + AST[t.status][0] + '</span></td></tr>').join('') ||
        '<tr><td colspan="6" class="leer">Nichts in dieser Ansicht.</td></tr>') + '</tbody></table></div>';
    main.querySelectorAll('[data-af]').forEach((b) => b.addEventListener('click', () => { aufStand.filter = b.dataset.af; zeige('aufgaben'); }));
    main.querySelectorAll('[data-t]').forEach((r) => r.addEventListener('click', () => aufgabeForm(d.aufgaben.find((t) => t.id === r.dataset.t))));
    $('#neu').addEventListener('click', () => aufgabeForm({}));
  };
  function aufgabeForm(t) {
    const neu = !t.id;
    const sel = (name, opts, v) => '<select name="' + name + '">' + opts.map(([k, txt]) => '<option value="' + k + '"' + (v === k ? ' selected' : '') + '>' + txt + '</option>').join('') + '</select>';
    const el = modal('<h2>' + (neu ? 'Schaden oder Wartung erfassen' : esc(t.titel)) + '</h2><form id="f" class="form">' +
      '<label class="feld voll">Was ist zu tun?<input name="titel" required maxlength="120" value="' + esc(t.titel || '') + '" placeholder="z. B. Stromsäule Ostbrücke ohne Funktion"></label>' +
      '<label class="feld">Art' + sel('art', [['schaden', 'Schaden'], ['wartung', 'Wartung / Prüfung']], t.art || 'schaden') + '</label>' +
      '<label class="feld">Priorität' + sel('prioritaet', [['hoch', 'dringend'], ['normal', 'normal'], ['niedrig', 'kann warten']], t.prioritaet || 'normal') + '</label>' +
      '<label class="feld">Ort<input name="ort" value="' + esc(t.ort || '') + '" placeholder="z. B. Westbrücke, Kran, Messe"></label>' +
      '<label class="feld">Liegeplatz (optional)<select name="platz_id"><option value="">–</option>' + d.liegeplaetze.map((p) => '<option value="' + p.id + '"' + (t.platz_id === p.id ? ' selected' : '') + '>' + esc(platzName(p.id)) + '</option>').join('') + '</select></label>' +
      '<label class="feld voll">Beschreibung<textarea name="beschreibung" rows="3">' + esc(t.beschreibung || '') + '</textarea></label>' +
      '<label class="feld">Wer kümmert sich?<input name="verantwortlich" value="' + esc(t.verantwortlich || '') + '" placeholder="Name oder Amt"></label>' +
      '<label class="feld">fällig bis<input name="faellig" type="date" value="' + esc(t.faellig || '') + '"></label>' +
      '<label class="feld">Stand' + sel('status', Object.entries(AST).map(([k, [txt]]) => [k, txt]), t.status || 'offen') + '</label>' +
      '<label class="feld">Foto / Dokument<input type="file" name="datei" accept="image/*,application/pdf"></label>' +
      '<label class="feld voll">Notiz<input name="notiz" value="' + esc(t.notiz || '') + '"></label></form>' +
      (neu ? '' : '<div class="abschnitt"><h3>Fotos und Dokumente</h3><div id="t-dok"><p class="leer">Wird geladen …</p></div></div>') +
      '<div class="modal-fuss">' + (!neu && rolle === 'vorstand' ? '<button class="btn gefahr links" id="weg">Löschen</button>' : '') + '<button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>', true);
    const dokListe = () => HF.dok.liste({ aufgabe_id: t.id }).then((l) => { $('#t-dok', el).innerHTML = l.length ? l.map((x) => '<button class="btn klein" data-dok="' + x.id + '">' + esc(x.name) + '</button>').join(' ') : '<p class="leer">Keine.</p>'; }).catch(() => {});
    if (!neu) { dokListe(); $('#t-dok', el).addEventListener('click', (e) => { const b = e.target.closest('[data-dok]'); if (b) HF.datei.oeffnen(b.dataset.dok).catch((x) => toast(x.message, 'fehler')); }); }
    $('#ok', el).addEventListener('click', async () => {
      const fm = $('#f', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm)); const file = fm.datei.files[0]; delete x.datei;
      let lese = null; if (file) { try { lese = await HF.datei.lesen(file); } catch (er) { return toast(er.message, 'fehler'); } }
      x.erledigt_am = x.status === 'erledigt' ? (t.erledigt_am || heute) : '';
      let ziel = t;
      if (neu) { ziel = { id: H.uid('T'), erstellt: new Date().toISOString(), erstellt_von: ROLLEN[rolle].name, boot_id: null, ...x }; d.aufgaben.push(ziel); } else Object.assign(t, x);
      zu(); const ok = await speichern(neu ? 'Erfasst.' : 'Gespeichert.');
      if (lese && ok !== false) { try { await HF.dok.hochladen({ ...lese, aufgabe_id: ziel.id, art: lese.typ === 'application/pdf' ? 'sonstiges' : 'foto' }, ROLLEN[rolle].name); toast('Gespeichert, Datei angehängt.'); } catch (er) { toast('Datei nicht gespeichert: ' + er.message, 'fehler'); } }
      zeige('aufgaben');
    });
    const w = $('#weg', el); if (w) w.addEventListener('click', () => { if (!confirm('Eintrag endgültig löschen?')) return; d.aufgaben = d.aufgaben.filter((y) => y.id !== t.id); speichern('Gelöscht.'); zu(); zeige('aufgaben'); });
  }

  /* ============================================================ Mitteilungen */
  const ZIEL = { alle: 'alle Mitglieder', bootseigner: 'Bootseigner', liegeplatz: 'Wasserlieger (Steg)' };
  V.mitteilungen = (main) => {
    const l = (d.mitteilungen || []).slice().sort((a, b) => String(b.erstellt).localeCompare(String(a.erstellt)));
    const aktuell = (x) => !x.gueltig_bis || x.gueltig_bis >= heute;
    const push = DB && d.einstellungen.push_aktiv;
    main.innerHTML = kopf('Mitteilungen', 'Kurze Nachrichten an die Mitglieder – erscheinen in „Mein SSV“ ganz oben' + (push ? ', auf Wunsch als Push aufs Handy' : '') + '. Wichtige Mitteilungen an alle zeigt auch die Getränkekasse.', '<button class="btn primaer" id="neu">+ Mitteilung</button>') +
      '<div class="panel"><table class="tab"><tbody>' + (l.map((x) => '<tr' + (aktuell(x) ? '' : ' class="blass"') + '><td>' + (x.wichtig ? '<span class="tag rot">wichtig</span> ' : '') + '<strong>' + esc(x.titel) + '</strong><br><small style="color:var(--muted)">' + esc(x.text || '') + '</small></td>' +
        '<td><small>' + esc(ZIEL[x.zielgruppe] || x.zielgruppe) + '<br>' + (x.gueltig_bis ? 'bis ' + H.datum(x.gueltig_bis) : 'ohne Ende') + (x.push_gesendet ? '<br>Push gesendet' : '') + '</small></td><td class="r nw"><small style="color:var(--muted)">' + new Date(x.erstellt).toLocaleDateString('de-DE') + ' · ' + esc(x.erstellt_von || '') + '</small><br><button class="btn klein gefahr" data-weg="' + x.id + '">Löschen</button></td></tr>').join('') || '<tr><td class="leer">Noch keine Mitteilungen.</td></tr>') + '</tbody></table></div>' +
      (DB ? '' : '<p class="hinweis">In der Demo erscheinen Mitteilungen in „Mein SSV“ und an der Kasse dieses Browsers. Push-Nachrichten aufs Handy gibt es nur mit der Vereinsdatenbank.</p>');
    main.querySelectorAll('[data-weg]').forEach((b) => b.addEventListener('click', () => { if (!confirm('Mitteilung löschen?')) return; d.mitteilungen = d.mitteilungen.filter((x) => x.id !== b.dataset.weg); speichern('Gelöscht.'); zeige(tab); }));
    $('#neu').addEventListener('click', () => {
      const bis = H.tag(new Date(Date.now() + 3 * 864e5));
      const el = modal('<h2>Mitteilung an die Mitglieder</h2><form id="f" class="form"><label class="feld voll">Titel<input name="titel" required maxlength="90" placeholder="z. B. Sturmwarnung: Boote zusätzlich sichern!"></label>' +
        '<label class="feld voll">Text<textarea name="text" rows="3" maxlength="600" placeholder="Was ist zu tun? Bis wann?"></textarea></label>' +
        '<label class="feld">An<select name="zielgruppe">' + Object.entries(ZIEL).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label><label class="feld">Anzeigen bis<input name="gueltig_bis" type="date" value="' + bis + '"></label>' +
        '<label class="feld check voll"><input type="checkbox" name="wichtig"> wichtig (rot hervorgehoben, z. B. Sturmwarnung)</label>' +
        (push ? '<label class="feld check voll"><input type="checkbox" name="push" checked> zusätzlich als Push-Nachricht aufs Handy senden (an alle, die das in „Mein SSV“ eingeschaltet haben)</label>' : '') +
        '</form><div class="modal-fuss"><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Veröffentlichen</button></div>');
      $('#ok', el).addEventListener('click', async () => {
        const fm = $('#f', el); if (!fm.reportValidity()) return; const x = Object.fromEntries(new FormData(fm));
        const m = { id: H.uid('N'), titel: x.titel, text: x.text, wichtig: !!x.wichtig, zielgruppe: x.zielgruppe, gueltig_bis: x.gueltig_bis || null, erstellt: new Date().toISOString(), erstellt_von: ROLLEN[rolle].name, push_gesendet: null };
        d.mitteilungen.push(m); zu(); const ok = await speichern('Mitteilung veröffentlicht.');
        if (x.push && ok !== false) {
          try { const r = await window.SSV_SB.req('/functions/v1/push', { method: 'POST', body: { aktion: 'senden', mitteilung_id: m.id } }); toast('Push gesendet an ' + (r.gesendet || 0) + ' Gerät' + (r.gesendet === 1 ? '' : 'e') + '.'); m.push_gesendet = new Date().toISOString(); }
          catch (er) { toast('Push nicht gesendet: ' + er.message, 'fehler', 6000); }
        }
        zeige('mitteilungen');
      });
    });
  };

  /* ============================================================ Änderungsverlauf */
  const verlaufErlaubt = () => darf('verlauf');
  const BEREICH = { mitglieder: 'Mitglied', mitglieder_bank: 'Bankdaten', boote: 'Boot', belegungen: 'Belegung', abwesenheiten: 'Abwesenheit', gaeste: 'Gastlieger', warteliste: 'Warteliste', kran: 'Kran', arbeitsdienst: 'Arbeitsdienst',
    hafen_rechnungen: 'Rechnung', sepa_laeufe: 'Lastschrift-Lauf', arbeitseinsaetze: 'Arbeitseinsatz', mitteilungen: 'Mitteilung', antraege: 'Aufnahmeantrag', liegeplaetze: 'Liegeplatz', gebuehren: 'Gebühren', hafen_einstellungen: 'Einstellungen', funktionen: 'Zugang/Rolle', aufgaben: 'Schaden/Wartung', dokumente: 'Dokument' };
  const AKTION = { neu: ['neu', 'ok'], geaendert: ['geändert', ''], geloescht: ['gelöscht', 'rot'] };
  const wertText = (v) => v == null || v === '' ? '–' : typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v);
  const aenderungText = (x) => {
    const a = x.aenderung || {};
    if (x.aktion === 'geaendert') return Object.entries(a).map(([k, v]) => '<span class="feldname">' + esc(k) + '</span> ' + (Array.isArray(v) ? esc(wertText(v[0])) + ' → ' + esc(wertText(v[1])) : esc(JSON.stringify(v).slice(0, 120))) ).join('<br>');
    return esc(Object.entries(a).filter(([k, v]) => v != null && v !== '' && !['id', 'positionen', 'empfaenger', 'daten'].includes(k)).slice(0, 6).map(([k, v]) => k + ': ' + wertText(v)).join(' · '));
  };
  const verlaufTabelle = (l) => '<table class="tab verlauf"><thead><tr><th>Wann</th><th>Wer</th><th>Was</th><th>Änderung</th></tr></thead><tbody>' + (l.map((x) =>
    '<tr><td class="nw">' + new Date(x.zeit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</td><td>' + esc(x.wer || '–') + '</td>' +
    '<td><span class="tag ' + AKTION[x.aktion][1] + '">' + AKTION[x.aktion][0] + '</span> ' + esc(BEREICH[x.tabelle] || x.tabelle) + (x.bezeichnung ? ' <strong>' + esc(x.bezeichnung) + '</strong>' : '') + '</td><td style="font-size:12.5px">' + aenderungText(x) + '</td></tr>').join('') ||
    '<tr><td colspan="4" class="leer">Noch keine Änderungen.</td></tr>') + '</tbody></table>';
  const verlaufStand = { tabelle: '', such: '' };
  V.verlauf = (main) => {
    main.innerHTML = kopf('Änderungsverlauf', 'Wer hat wann einen Platz, Betrag oder Mitgliedsdatensatz geändert – wird automatisch mitgeschrieben und nach 3 Jahren gelöscht. Bankdaten erscheinen nur gekürzt.') +
      '<div class="filter"><select class="suche" id="vt" style="min-width:0"><option value="">alle Bereiche</option>' + Object.entries(BEREICH).map(([k, v]) => '<option value="' + k + '"' + (verlaufStand.tabelle === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>' +
      '<input class="suche" id="vs" placeholder="Name, Boot, Platz, Person …" value="' + esc(verlaufStand.such) + '"></div><div class="panel" id="vl"><p class="leer">Wird geladen …</p></div>';
    let daten = [];
    const zeig = () => { const q = verlaufStand.such.toLowerCase(); $('#vl').innerHTML = verlaufTabelle(daten.filter((x) => !q || ((x.bezeichnung || '') + ' ' + (x.wer || '') + ' ' + JSON.stringify(x.aenderung || {})).toLowerCase().includes(q))); };
    const laden = () => HF.verlauf({ tabelle: verlaufStand.tabelle, limit: 400 }).then((l) => { daten = l; zeig(); }).catch((e) => { $('#vl').innerHTML = '<p class="hinweis warn">' + esc(e.message) + '</p>'; });
    $('#vt').addEventListener('change', (e) => { verlaufStand.tabelle = e.target.value; laden(); });
    $('#vs').addEventListener('input', (e) => { verlaufStand.such = e.target.value; zeig(); });
    laden();
  };
  function verlaufDialog(tabelle, id, name) {
    const el = modal('<h2>Verlauf: ' + esc(name || '') + '</h2><div id="vd"><p class="leer">Wird geladen …</p></div><div class="modal-fuss"><button class="btn" data-zu>Schließen</button></div>', true);
    Promise.all([HF.verlauf({ tabelle, datensatz: id, limit: 100 }), tabelle === 'mitglieder' ? HF.verlauf({ tabelle: 'mitglieder_bank', datensatz: id, limit: 50 }) : Promise.resolve([])])
      .then(([a, b]) => { $('#vd', el).innerHTML = verlaufTabelle(a.concat(b).sort((x, y) => String(y.zeit).localeCompare(String(x.zeit)))); })
      .catch((e) => { $('#vd', el).innerHTML = '<p class="hinweis warn">' + esc(e.message) + '</p>'; });
  }

  /* ============================================================ Navigation */
  function nav() {
    const anfragen = d.gaeste.filter((g) => g.status === 'angemeldet').length;
    const neueAntraege = (d.antraege || []).filter((a) => a.status === 'neu').length;
    const aktName = (TABS.flatMap(([, ts]) => ts).find(([t]) => t === tab) || [, ''])[1];
    const zahlen = (darf('gaeste') ? anfragen : 0) + (darf('antraege') ? neueAntraege : 0);   // nur, was diese Rolle bearbeiten kann
    $('#nav').classList.remove('offen');
    $('#nav').innerHTML = '<div class="nav-leiste"><svg class="stander"><use href="#stander"/></svg><strong>' + aktName + '</strong>' +
      '<button id="navauf" aria-expanded="false" aria-controls="nav-inhalt">Menü' + (zahlen ? '<span class="zahl">' + zahlen + '</span>' : '') + '</button></div><div class="nav-inhalt" id="nav-inhalt">' +
      '<div class="marke"><svg class="stander"><use href="#stander"/></svg><div><strong>Hafen-Manager</strong><span>SSV · Teerhofinsel</span></div></div>' +
      '<div class="rolle-chip">Angemeldet als <strong>' + ROLLEN[rolle].name + '</strong><label class="saison-wahl">Saison <select id="saison-wahl">' +
        [SAISON - 1, SAISON, SAISON + 1].map((j) => '<option' + (j === SAISON ? ' selected' : '') + '>' + j + '</option>').join('') + '</select></label></div>' +
      TABS.map(([gruppe, ts]) => { const sichtbar = ts.filter(([t]) => darf(t)); return sichtbar.length ? '<div class="nav-gruppe">' + gruppe + '</div>' + sichtbar.map(([t, n]) =>
        '<button data-tab="' + t + '" class="' + (t === tab ? 'aktiv' : '') + '"' + (t === tab ? ' aria-current="page"' : '') + '>' + n + (t === 'gaeste' && anfragen ? '<span class="zahl">' + anfragen + '</span>' : '') + (t === 'antraege' && neueAntraege ? '<span class="zahl">' + neueAntraege + '</span>' : '') + '</button>').join('') : ''; }).join('') +
      '<div class="nav-unten"><a href="mein-ssv.html" target="_blank">Mein SSV (Mitglieder) ↗</a><button id="abmelden">' + (DB ? 'Abmelden' : 'Rolle wechseln') + '</button></div></div>';
  }
  function zeige(t, ruhig) {
    if (!darf(t)) t = 'uebersicht';
    const y = window.scrollY; tab = t; nav(); V[t]($('#main')); window.scrollTo(0, ruhig ? y : 0);
    try { history.replaceState(null, '', '#' + t); } catch (e) { /* egal */ }
  }
  document.addEventListener('click', (e) => {
    const auf = e.target.closest('#navauf');
    if (auf) { const nv = $('#nav'); const o = nv.classList.toggle('offen'); auf.setAttribute('aria-expanded', o); return; }
    const n = e.target.closest('#nav [data-tab]'); if (n) return zeige(n.dataset.tab);
    const g = e.target.closest('[data-gehe]'); if (g && darf(g.dataset.gehe)) return zeige(g.dataset.gehe);
    if (e.target.closest('#abmelden') && DB) { try { sessionStorage.removeItem('ssv-hafen-rolle'); } catch (x) { /* egal */ } window.SSV_SB.abmelden().then(() => location.reload()); return; }
    if (e.target.closest('#abmelden')) { rolle = null; try { sessionStorage.removeItem('ssv-hafen-rolle'); } catch (x) { /* egal */ } start(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'saison-wahl') return;
    const u = new URL(location.href); u.searchParams.set('saison', e.target.value); location.href = u.toString();
  });
  // Vereinsdatenbank: nach 30 Minuten ohne Eingabe abmelden (Bankdaten nicht offen am Rechner lassen)
  if (DB) { let ruhe; const neu = () => { clearTimeout(ruhe); ruhe = setTimeout(() => { window.SSV_SB.abmelden().then(() => location.reload()); }, 30 * 60e3); };
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, neu, { passive: true })); neu(); }
  if ($('#rollen')) $('#rollen').addEventListener('click', (e) => { const b = e.target.closest('[data-rolle]'); if (!b) return; rolle = b.dataset.rolle; try { sessionStorage.setItem('ssv-hafen-rolle', rolle); } catch (x) { /* egal */ } start(); });

  // Demo: Änderungen aus anderen Fenstern (QR-Gastanmeldung, Mein SSV) sofort übernehmen,
  // damit beim nächsten Speichern nichts überschrieben wird
  window.addEventListener('storage', (e) => { if (e.key === 'ssv-hafen-demo-v1') { d = HF.laden(); if (rolle) zeige(tab); } });

  function start() {
    try { rolle = rolle || sessionStorage.getItem('ssv-hafen-rolle'); } catch (e) { /* egal */ }
    $('#login').hidden = !!rolle; $('#app').hidden = !rolle;
    if (!rolle) return;
    HF.wer = ROLLEN[rolle].name + (DB ? '' : ' (Demo)');
    const t = location.hash.slice(1); zeige(V[t] ? t : 'uebersicht');
  }
  start();
})();
