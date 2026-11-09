/* SSV Getränkekasse – Kassen-Oberfläche (iPad neben dem Getränkekasten) */
(function () {
  'use strict';

  const S = window.SSV.speicher;
  const H = window.SSV.hilfe;
  const $ = (s) => document.querySelector(s);

  const zustand = {
    mitglieder: [], produkte: [], einstellungen: { abmelden_sekunden: 60, storno_minuten: 15 },
    filter: '', buchstabe: '', aktiv: null, pin: '', bon: [], buchtGerade: false,
    optionen: { pin_selbst_festlegen: true, pin_erst_nr_pruefen: true },
    // PIN-Bildschirm: 'login' | 'nr' (Mitgliedsnummer) | 'neu1' (Code ausdenken) | 'neu2' (Code wiederholen)
    modus: 'login', nr: '', neuPin: ''
  };
  let inaktivTimer = null, fertigTimer = null;

  /* ------------------------------------------------------------ Bildschirme */
  function zeige(id) {
    document.querySelectorAll('.k-screen').forEach((s) => { s.hidden = s.id !== id; });
    document.body.dataset.screen = id;
    window.scrollTo(0, 0);
    planeAbmeldung();
  }
  function toast(text, art) {
    const t = $('#toast'); t.textContent = text; t.className = 'k-toast zeigen' + (art ? ' ' + art : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'k-toast'; }, 3200);
  }
  function sheet(id, auf) {
    const el = $(id); el.hidden = !auf;
    if (auf) requestAnimationFrame(() => el.classList.add('offen')); else el.classList.remove('offen');
  }
  document.querySelectorAll('.k-sheet').forEach((el) => {
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-schliessen]')) sheet('#' + el.id, false); });
  });

  /* Nach Inaktivität automatisch zurück zum Start – kein Mitglied bleibt angemeldet */
  function planeAbmeldung() {
    clearTimeout(inaktivTimer);
    const scr = document.body.dataset.screen;
    if (scr === 's-pin' || scr === 's-auswahl') {
      inaktivTimer = setTimeout(() => { if (zustand.bon.length) toast('Automatisch abgemeldet – der Bon wurde verworfen.'); abmelden(); },
        (zustand.einstellungen.abmelden_sekunden || 60) * 1000);
    }
  }
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, planeAbmeldung, { passive: true }));

  function abmelden() {
    zustand.aktiv = null; zustand.pin = ''; zustand.bon = []; zustand.modus = 'login'; zustand.nr = ''; zustand.neuPin = '';
    clearTimeout(fertigTimer);
    sheet('#sheet-menge', false); sheet('#sheet-verlauf', false);
    $('#suche').value = ''; zustand.filter = ''; zustand.buchstabe = '';
    renderNamen(); zeige('s-wer');
  }

  /* ------------------------------------------------------------- 1 · Wer? */
  const norm = (s) => s.toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const initial = (m) => norm(m.nachname).charAt(0).toUpperCase();

  function renderAbc() {
    const da = new Set(zustand.mitglieder.map(initial));
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    $('#abc').innerHTML = '<button data-b="" class="' + (zustand.buchstabe ? '' : 'aktiv') + '">Alle</button>' +
      abc.map((b) => '<button data-b="' + b + '"' + (da.has(b) ? '' : ' disabled') + ' class="' + (zustand.buchstabe === b ? 'aktiv' : '') + '">' + b + '</button>').join('');
  }
  function renderNamen() {
    renderAbc();
    const f = norm(zustand.filter.trim());
    const liste = zustand.mitglieder.filter((m) =>
      (!zustand.buchstabe || initial(m) === zustand.buchstabe) &&
      (!f || norm(m.vorname + ' ' + m.nachname).includes(f) || norm(m.nachname + ' ' + m.vorname).includes(f)));
    $('#namen').innerHTML = liste.map((m) =>
      '<button role="listitem" class="k-name" data-id="' + m.id + '"><span class="k-ini">' + H.esc(m.vorname.charAt(0) + m.nachname.charAt(0)) + '</span>' +
      '<span><strong>' + H.esc(m.nachname) + '</strong>' + H.esc(m.vorname) +
      (m.hat_pin === false && zustand.optionen.pin_selbst_festlegen ? '<br><span class="k-neu">Neu – Code festlegen</span>' : '') + '</span></button>').join('');
    $('#namen-leer').hidden = liste.length > 0;
  }
  $('#suche').addEventListener('input', (e) => { zustand.filter = e.target.value; zustand.buchstabe = ''; renderNamen(); });
  $('#abc').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    zustand.buchstabe = b.dataset.b; zustand.filter = ''; $('#suche').value = ''; renderNamen();
  });
  $('#namen').addEventListener('click', (e) => {
    const b = e.target.closest('.k-name'); if (!b) return;
    const m = zustand.mitglieder.find((x) => x.id === b.dataset.id);
    if (m.hat_pin === false && !zustand.optionen.pin_selbst_festlegen) {
      toast('Für dich ist noch kein Code hinterlegt – bitte kurz beim Kassenwart melden.', 'fehler'); return;
    }
    zustand.aktiv = m; zustand.pin = ''; zustand.nr = ''; zustand.neuPin = '';
    $('#pin-avatar').textContent = m.vorname.charAt(0) + m.nachname.charAt(0);
    $('#pin-name').textContent = m.vorname + ' ' + m.nachname;
    setzeModus(m.hat_pin === false ? (zustand.optionen.pin_erst_nr_pruefen ? 'nr' : 'neu1') : 'login');
    $('#suche').blur(); zeige('s-pin');
  });

  /* Erstes Mal: Mitgliedsnummer → Code ausdenken → Code wiederholen */
  const TEXTE = {
    login: 'Bitte deinen 4-stelligen Code eingeben',
    nr: 'Willkommen! Du buchst zum ersten Mal. Gib zuerst deine Mitgliedsnummer ein – sie steht z. B. auf deiner Beitragsrechnung.',
    neu1: 'Denk dir jetzt deinen persönlichen 4-stelligen Code aus.',
    neu2: 'Bitte gib den Code zur Sicherheit noch einmal ein.'
  };
  function setzeModus(modus, fehler) {
    zustand.modus = modus; zustand.pin = '';
    const erst = zustand.optionen.pin_erst_nr_pruefen;
    const schritt = { nr: 1, neu1: erst ? 2 : 1, neu2: erst ? 3 : 2 }[modus];
    $('#pin-schritt').hidden = !schritt;
    if (schritt) $('#pin-schritt').textContent = 'Code festlegen · Schritt ' + schritt + ' von ' + (erst ? 3 : 2);
    const h = $('#pin-hinweis'); h.textContent = fehler || TEXTE[modus]; h.classList.toggle('fehler', !!fehler);
    $('#pin-dots').hidden = modus === 'nr'; $('#pin-nr').hidden = modus !== 'nr'; $('#pin-weiter').hidden = modus !== 'nr';
    renderDots();
  }

  /* ------------------------------------------------------------- 2 · PIN */
  function renderDots() {
    [...$('#pin-dots').children].forEach((d, i) => d.classList.toggle('voll', i < zustand.pin.length));
    $('#pin-nr-wert').textContent = zustand.nr;
    $('#pin-weiter').disabled = !zustand.nr;
  }
  function pinFehler(text) {
    const h = $('#pin-hinweis'); h.textContent = text; h.classList.add('fehler');
    const d = zustand.modus === 'nr' ? $('#pin-nr') : $('#pin-dots'); d.classList.remove('wackeln'); void d.offsetWidth; d.classList.add('wackeln');
    zustand.pin = ''; renderDots();
  }
  function angemeldet(r) {
    zustand.bon = [];
    $('#hallo-name').textContent = r.vorname;
    setzeSummen(r);
    renderKacheln(); renderBon(); zeige('s-auswahl');
  }
  /* Neuer Code: lokal vorprüfen, zweimal eingeben, dann speichern und direkt anmelden */
  async function neuPinWeiter() {
    if (zustand.modus === 'neu1') {
      if (H.pinZuEinfach(zustand.pin)) return pinFehler('Dieser Code ist zu leicht zu erraten (z. B. 1234 oder 1111) – bitte einen anderen.');
      zustand.neuPin = zustand.pin; return setzeModus('neu2');
    }
    if (zustand.pin !== zustand.neuPin) { zustand.neuPin = ''; setzeModus('neu1'); return pinFehler('Die beiden Eingaben waren unterschiedlich – bitte nochmal von vorn.'); }
    const keypad = $('#keypad'); keypad.classList.add('warten');
    try {
      const r = await S.kassePinFestlegen(zustand.aktiv.id, zustand.pin, zustand.nr);
      if (!r.ok) {
        if (r.fehler === 'nr') { zustand.nr = ''; setzeModus('nr'); return pinFehler(r.rest > 0 ? 'Die Mitgliedsnummer passt nicht – noch ' + r.rest + (r.rest === 1 ? ' Versuch' : ' Versuche') + '. Im Zweifel beim Kassenwart nachfragen.' : '5× falsch – 5 Minuten gesperrt.'); }
        if (r.fehler === 'gesperrt') { zustand.nr = ''; setzeModus(zustand.optionen.pin_erst_nr_pruefen ? 'nr' : 'neu1'); return pinFehler('Gesperrt bis ' + new Date(r.gesperrt_bis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'); }
        if (r.fehler === 'einfach') { setzeModus('neu1'); return pinFehler('Dieser Code ist zu leicht zu erraten – bitte einen anderen.'); }
        if (r.fehler === 'schon_gesetzt') { zustand.aktiv.hat_pin = true; return setzeModus('login', 'Für dich gibt es schon einen Code – bitte eingeben.'); }
        if (r.fehler === 'geraet') return zeige('s-setup');
        return pinFehler('Code festlegen ist gerade nicht möglich – bitte beim Kassenwart melden.');
      }
      zustand.aktiv.hat_pin = true; zustand.modus = 'login';
      toast('Dein Code ist gespeichert – gut merken! Ändern kannst du ihn jederzeit in „Mein SSV“.');
      angemeldet(r);
    } catch (e) { pinFehler(e.message); }
    finally { keypad.classList.remove('warten'); }
  }
  async function pinPruefen() {
    const keypad = $('#keypad'); keypad.classList.add('warten');
    try {
      const r = await S.kasseLogin(zustand.aktiv.id, zustand.pin);
      if (!r.ok) {
        if (r.fehler === 'pin') pinFehler(r.rest > 0 ? 'Code falsch – noch ' + r.rest + (r.rest === 1 ? ' Versuch' : ' Versuche') + '. Vergessen? In „Mein SSV“ neu festlegen.' : 'Code 5× falsch – 5 Minuten gesperrt');
        else if (r.fehler === 'kein_pin') { zustand.aktiv.hat_pin = false; setzeModus(zustand.optionen.pin_erst_nr_pruefen ? 'nr' : 'neu1'); }
        else if (r.fehler === 'gesperrt') pinFehler('Gesperrt bis ' + new Date(r.gesperrt_bis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr');
        else if (r.fehler === 'geraet') { zeige('s-setup'); }
        else pinFehler('Anmeldung nicht möglich – bitte beim Kassenwart melden');
        return;
      }
      angemeldet(r);
    } catch (e) { pinFehler(e.message); }
    finally { keypad.classList.remove('warten'); }
  }
  $('#keypad').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || $('#keypad').classList.contains('warten')) return;
    const k = b.dataset.k;
    if (k === 'zurueck') return abmelden();
    if (zustand.modus === 'nr') {
      if (k === 'loeschen') zustand.nr = zustand.nr.slice(0, -1); else if (zustand.nr.length < 8) zustand.nr += k;
      $('#pin-hinweis').classList.remove('fehler'); return renderDots();
    }
    if (k === 'loeschen') zustand.pin = zustand.pin.slice(0, -1);
    else if (zustand.pin.length < 4) zustand.pin += k;
    $('#pin-hinweis').classList.remove('fehler');
    renderDots();
    if (zustand.pin.length === 4) setTimeout(zustand.modus === 'login' ? pinPruefen : neuPinWeiter, 120);
  });
  $('#pin-weiter').addEventListener('click', () => { if (zustand.nr) setzeModus('neu1'); });
  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.screen !== 's-pin') return;
    if (/^\d$/.test(e.key)) $('#keypad [data-k="' + e.key + '"]').click();
    else if (e.key === 'Backspace') $('#keypad [data-k="loeschen"]').click();
    else if (e.key === 'Escape') abmelden();
    else if (e.key === 'Enter' && zustand.modus === 'nr') $('#pin-weiter').click();
  });

  /* ------------------------------------------------------- 3 · Auswahl */
  function setzeSummen(r) {
    if (r.monat_summe != null) $('#monat-summe').textContent = H.geld(r.monat_summe);
    if (r.offen_summe != null) $('#offen-summe').textContent = H.geld(r.offen_summe);
  }
  function renderKacheln() {
    $('#kacheln').innerHTML = zustand.produkte.map((p) =>
      '<button class="k-kachel" data-id="' + p.id + '" style="--farbe:' + H.esc(p.farbe || '#132a6b') + '">' +
      '<span class="k-emoji">' + H.esc(p.emoji || '🥤') + '</span>' +
      '<span class="k-pname">' + H.esc(p.name) + '</span>' +
      '<span class="k-ppreis">' + H.geld(p.preis) + '</span>' +
      (p.kasten_groesse ? '<span class="k-pkasten">Kasten ' + p.kasten_groesse + ' · ' + H.geld(p.kasten_preis) + '</span>' : '') +
      '</button>').join('');
  }
  let mengeProdukt = null;
  $('#kacheln').addEventListener('click', (e) => {
    const b = e.target.closest('.k-kachel'); if (!b) return;
    const p = zustand.produkte.find((x) => x.id === b.dataset.id); mengeProdukt = p;
    $('#menge-emoji').textContent = p.emoji || '🥤';
    $('#menge-titel').textContent = p.name;
    $('#menge-preis').textContent = H.geld(p.preis) + ' pro Stück' + (p.kasten_groesse ? ' · Kasten (' + p.kasten_groesse + ' Stück) ' + H.geld(p.kasten_preis) : '');
    $('#mengen-stk').innerHTML = [1, 2, 3, 4, 5, 6].map((n) =>
      '<button data-n="' + n + '" data-e="stk"><strong>' + n + '</strong><small>' + H.geld(H.eur(H.ct(p.preis) * n)) + '</small></button>').join('');
    $('#mengen-kasten-wrap').hidden = !p.kasten_groesse;
    if (p.kasten_groesse) {
      $('#mengen-kasten').innerHTML = [1, 2].map((n) =>
        '<button data-n="' + n + '" data-e="kasten"><strong>' + n + ' ' + (n === 1 ? 'Kasten' : 'Kästen') + '</strong><small>' + (n * p.kasten_groesse) + ' Stück · ' + H.geld(H.eur(H.ct(p.kasten_preis) * n)) + '</small></button>').join('');
    }
    sheet('#sheet-menge', true);
  });
  $('#sheet-menge').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-n]'); if (!b) return;
    const p = mengeProdukt, einheit = b.dataset.e, n = parseInt(b.dataset.n, 10);
    const vorh = zustand.bon.find((x) => x.produkt.id === p.id && x.einheit === einheit);
    if (vorh) vorh.anzahl = Math.min(99, vorh.anzahl + n); else zustand.bon.push({ produkt: p, einheit, anzahl: n });
    sheet('#sheet-menge', false); renderBon();
    const k = document.querySelector('.k-kachel[data-id="' + p.id + '"]');
    if (k) { k.classList.remove('plopp'); void k.offsetWidth; k.classList.add('plopp'); }
  });

  const zeilenPreis = (z) => H.eur(H.ct(z.einheit === 'kasten' ? z.produkt.kasten_preis : z.produkt.preis) * z.anzahl);
  const zeilenText = (z) => z.anzahl + ' × ' + (z.einheit === 'kasten' ? (z.anzahl === 1 ? 'Kasten ' : 'Kästen ') : '') + z.produkt.name;
  function renderBon() {
    const summe = zustand.bon.reduce((s, z) => s + H.ct(zeilenPreis(z)), 0);
    $('#bon-liste').innerHTML = zustand.bon.map((z, i) =>
      '<li><span class="k-bon-emoji">' + H.esc(z.produkt.emoji || '') + '</span><span class="k-bon-text">' + H.esc(zeilenText(z)) + '</span>' +
      '<span class="k-bon-preis">' + H.geld(zeilenPreis(z)) + '</span>' +
      '<button class="k-bon-x" data-i="' + i + '" aria-label="Entfernen">×</button></li>').join('');
    $('#bon-leer').hidden = zustand.bon.length > 0;
    $('#bon-summe').textContent = H.geld(H.eur(summe));
    const btn = $('#btn-buchen'); btn.disabled = !zustand.bon.length;
    btn.textContent = zustand.bon.length ? 'Jetzt buchen · ' + H.geld(H.eur(summe)) : 'Buchen';
  }
  $('#bon-liste').addEventListener('click', (e) => {
    const b = e.target.closest('.k-bon-x'); if (!b) return;
    zustand.bon.splice(Number(b.dataset.i), 1); renderBon();
  });

  $('#btn-buchen').addEventListener('click', async () => {
    if (!zustand.bon.length || zustand.buchtGerade) return;
    zustand.buchtGerade = true; const btn = $('#btn-buchen'); btn.disabled = true; btn.textContent = 'Wird gebucht …';
    try {
      const posten = zustand.bon.map((z) => ({ produkt_id: z.produkt.id, einheit: z.einheit, anzahl: z.anzahl }));
      const r = await S.kasseBuchen(zustand.aktiv.id, zustand.pin, posten);
      if (!r.ok) { toast(r.fehler === 'gesperrt' ? 'Konto gesperrt – bitte später erneut.' : 'Buchung nicht möglich – bitte neu anmelden.', 'fehler'); return abmelden(); }
      $('#fertig-titel').textContent = 'Prost, ' + zustand.aktiv.vorname + '!';
      $('#fertig-liste').innerHTML = zustand.bon.map((z) => '<li><span>' + H.esc(z.produkt.emoji || '') + ' ' + H.esc(zeilenText(z)) + '</span><strong>' + H.geld(zeilenPreis(z)) + '</strong></li>').join('');
      $('#fertig-summen').innerHTML = 'Gebucht: <strong>' + H.geld(r.summe) + '</strong> · Diesen Monat insgesamt: <strong>' + H.geld(r.monat_summe) + '</strong>';
      setzeSummen(r); zustand.bon = []; renderBon();
      zeige('s-fertig'); starteFertigCountdown();
    } catch (e) {
      toast(e.message, 'fehler');
    } finally { zustand.buchtGerade = false; renderBon(); }
  });

  function starteFertigCountdown() {
    let n = 6; const c = $('#fertig-countdown');
    const tick = () => { c.textContent = '(' + n + ')'; if (n-- <= 0) return abmelden(); fertigTimer = setTimeout(tick, 1000); };
    clearTimeout(fertigTimer); tick();
  }
  $('#btn-fertig').addEventListener('click', abmelden);
  $('#btn-weiter').addEventListener('click', () => { clearTimeout(fertigTimer); zeige('s-auswahl'); });
  $('#btn-abmelden').addEventListener('click', abmelden);

  /* Verlauf + Rückgängig */
  async function renderVerlauf() {
    const r = await S.kasseVerlauf(zustand.aktiv.id, zustand.pin);
    if (!r.ok) { toast('Verlauf nicht verfügbar.', 'fehler'); return; }
    $('#verlauf-hinweis').textContent = 'Fehlbuchung? Innerhalb von ' + zustand.einstellungen.storno_minuten + ' Minuten kannst du sie hier rückgängig machen. Danach bitte kurz beim Kassenwart melden.';
    $('#verlauf-liste').innerHTML = r.buchungen.length ? r.buchungen.map((b) =>
      '<li class="' + (b.storniert ? 'storniert' : '') + '"><span class="k-v-zeit">' + H.zeit(b.zeit) + '</span>' +
      '<span class="k-v-text">' + b.anzahl + ' ' + H.einheitText(b) + ' ' + H.esc(b.produkt_name) + '</span>' +
      '<span class="k-v-preis">' + H.geld(b.betrag) + '</span>' +
      (b.storniert ? '<span class="k-v-tag">storniert</span>' : b.stornierbar ? '<button class="k-btn k-btn-mini" data-storno="' + b.id + '">Rückgängig</button>' : '<span class="k-v-tag">' + (b.abgerechnet || b.rechnung_id ? 'abgerechnet' : '') + '</span>') +
      '</li>').join('') : '<li class="k-leer">Noch keine Buchungen.</li>';
  }
  $('#btn-verlauf').addEventListener('click', async () => { await renderVerlauf(); sheet('#sheet-verlauf', true); });
  $('#verlauf-liste').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-storno]'); if (!b) return;
    b.disabled = true;
    const r = await S.kasseStorno(zustand.aktiv.id, zustand.pin, b.dataset.storno);
    if (r.ok) { setzeSummen(r); toast('Buchung rückgängig gemacht.'); } else toast('Rückgängig nicht mehr möglich.', 'fehler');
    renderVerlauf();
  });

  /* ------------------------------------------------------------- Start */
  function uhr() { $('#uhr').textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); }
  async function datenLaden() {
    const [m, p, o] = await Promise.all([S.kasseMitglieder(), S.kasseProdukte(), S.kasseOptionen()]);
    zustand.mitglieder = m; zustand.produkte = p; zustand.optionen = o;
    zustand.einstellungen = { ...zustand.einstellungen, abmelden_sekunden: o.abmelden_sekunden, storno_minuten: o.storno_minuten };
  }
  async function start() {
    uhr(); setInterval(uhr, 10e3);
    if (S.modus === 'demo') {
      $('#modus-badge').hidden = false; $('#demo-pin').hidden = false;
      $('#demo-pin').textContent = 'Demo: Beispiel-Mitglieder mit Code haben die 1234 · Mitglieder mit „Code festlegen“ probieren den ersten Besuch aus (die Mitgliedsnummer steht in „Mein SSV“ bzw. in der Verwaltung).';
    }
    const st = await S.kasseStatus();
    if (!st.eingerichtet) return zeige('s-setup');
    try { await datenLaden(); }
    catch (e) { if (/eingerichtet/.test(e.message)) return zeige('s-setup'); toast(e.message, 'fehler'); }
    renderNamen(); zeige('s-wer');
    // Liste regelmäßig auffrischen, solange niemand angemeldet ist
    setInterval(async () => {
      if (document.body.dataset.screen !== 's-wer') return;
      try { await datenLaden(); renderNamen(); } catch (e) { /* nächster Versuch folgt */ }
    }, 5 * 60e3);
  }
  start();
})();
