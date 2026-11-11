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

  /* ------------------------------------------------- Ohne Netz weiterbuchen
   * Fällt das WLAN aus, bleibt die Kasse benutzbar: Namen und Getränke kommen aus dem Zwischenspeicher,
   * Buchungen landen in einer Warteschlange auf dem iPad und werden automatisch nachgetragen.
   * Der Code wird dabei von der Datenbank geprüft; jede Buchung hat eine Kennung und zählt nur einmal. */
  const ONLINE_ONLY = S.modus === 'demo';
  const LS = { cache: 'ssvg-kasse-cache', alter: 'ssvg-kasse-alter', schlange: 'ssvg-kasse-schlange', problem: 'ssvg-kasse-problem' };
  const lesen = (k, std) => { try { return JSON.parse(localStorage.getItem(k)) || std; } catch (e) { return std; } };
  const schreiben = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* voll */ } };
  const neueRef = () => (crypto.randomUUID ? crypto.randomUUID() : 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  let offline = false;
  function offlineAnzeigen() {
    const q = lesen(LS.schlange, []), pr = lesen(LS.problem, []);
    const b = $('#offline-badge'); b.hidden = !offline && !q.length; b.textContent = offline ? 'Offline' + (q.length ? ' · ' + q.length + ' wartend' : '') : q.length + ' werden nachgetragen';
    const p = $('#problem-badge'); p.hidden = !pr.length; p.textContent = '⚠ ' + pr.length + ' nicht verbucht';
  }
  let synchronisiert = false;
  async function nachtragen() {
    if (ONLINE_ONLY || synchronisiert) return; synchronisiert = true;
    try {
      let q = lesen(LS.schlange, []);
      while (q.length) {
        const x = q[0]; let r;
        try { r = await S.kasseBuchenNach(x.mid, x.pin, x.posten, x.zeit, x.ref); }
        catch (e) { if (e.offline) { offline = true; break; } r = { ok: false, fehler: 'fehler', text: e.message }; }
        offline = false;
        if (!r.ok) { const pr = lesen(LS.problem, []); pr.push({ ref: x.ref, name: x.name, zeit: x.zeit, text: x.text, grund: r.text || ({ pin: 'Code war falsch', gesperrt: 'Konto gesperrt', mitglied: 'Mitglied nicht aktiv', kein_pin: 'kein Code festgelegt', geraet: 'Kasse nicht eingerichtet' })[r.fehler] || r.fehler }); schreiben(LS.problem, pr); }
        q = lesen(LS.schlange, []).filter((y) => y.ref !== x.ref); schreiben(LS.schlange, q);
      }
    } finally { synchronisiert = false; offlineAnzeigen(); }
  }
  window.addEventListener('online', () => { offline = false; nachtragen(); });
  setInterval(nachtragen, 20e3);

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
    $('#k-veranst').hidden = true; $('#k-einladung').hidden = true; veranst = [];
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
    zustand.bon = []; zustand.alter = r.alter == null ? null : Number(r.alter);
    $('#hallo-name').textContent = r.vorname;
    setzeSummen(r);
    renderKacheln(); renderBon(); zeige('s-auswahl');
    veranstaltungenLaden();
  }

  /* ---------- Veranstaltungen: Einladungen nach der Anmeldung, zu- oder absagen mit großen Knöpfen ---------- */
  let veranst = [];
  const MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const vDatum = (s) => { const d = new Date(s + 'T12:00:00'); return WT[d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()]; };
  const vOffen = (v) => !v.abgesagt && heuteStr() <= (v.anmeldung_bis || v.datum);
  function heuteStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  async function veranstaltungenLaden() {
    const box = $('#k-einladung'), knopf = $('#btn-veranst'); box.hidden = true; knopf.hidden = true; veranst = [];
    if (!S.kasseVeranstaltungen || zustand.ohneNetz || !zustand.aktiv) return;
    const fuer = zustand.aktiv.id;
    try {
      const r = await S.kasseVeranstaltungen(fuer, zustand.pin);
      if (!r || !r.ok || !zustand.aktiv || zustand.aktiv.id !== fuer) return;
      veranst = (r.liste || []).filter((v) => !v.abgesagt || v.meine);
    } catch (e) { return; }
    einladungZeigen();
  }
  function einladungZeigen() {
    const box = $('#k-einladung'), knopf = $('#btn-veranst');
    const offen = veranst.filter((v) => !v.meine && vOffen(v));
    knopf.hidden = !veranst.length; knopf.textContent = 'Veranstaltungen' + (offen.length ? ' (' + offen.length + ')' : '');
    if (!offen.length) { box.hidden = true; return; }
    const v = offen[0];
    box.innerHTML = '<div><strong>' + (offen.length > 1 ? offen.length + ' Einladungen' : 'Einladung') + ':</strong> ' + H.esc(v.titel) + ' · ' + vDatum(v.datum) + (v.beginn ? ', ' + H.esc(v.beginn) + ' Uhr' : '') +
      (v.anmeldung_bis ? '<br><small>Bitte bis ' + vDatum(v.anmeldung_bis) + ' zu- oder absagen</small>' : '') + '</div><button class="k-btn k-btn-primary" id="k-einladung-los">Zu- oder absagen</button>';
    box.hidden = false;
    $('#k-einladung-los').addEventListener('click', veranstOeffnen);
  }
  function veranstOeffnen() { $('#k-veranst').hidden = false; veranstListe(); }
  function veranstZu() { $('#k-veranst').hidden = true; einladungZeigen(); }
  function veranstListe(wahlId) {
    const l = $('#k-veranst-liste');
    l.innerHTML = veranst.map((v) => {
      const me = v.meine, offen = vOffen(v); const frei = v.max_personen ? Math.max(0, v.max_personen - (Number(v.belegt) || 0) + (me && me.antwort === 'ja' ? me.personen : 0)) : 99;
      const stand = v.abgesagt ? '<span class="k-v-stand rot">abgesagt</span>' : me ? (me.antwort === 'ja' ? '<span class="k-v-stand ok">✓ Du hast zugesagt' + (me.personen > 1 ? ' · ' + me.personen + ' Personen' : '') + '</span>' : '<span class="k-v-stand">Du hast abgesagt</span>') : offen ? '<span class="k-v-stand warn">Noch keine Antwort</span>' : '<span class="k-v-stand">Anmeldung geschlossen</span>';
      const maxP = Math.min(1 + (Number(v.begleitung) || 0), frei);
      const knoepfe = !offen ? '' : wahlId === v.id
        ? '<p class="k-v-frage">Wie viele kommen?</p><div class="k-v-knoepfe">' + Array.from({ length: Math.max(1, maxP) }, (_, i) => i + 1).map((n) => '<button class="k-btn k-btn-primary k-btn-xl" data-v-ja="' + v.id + '" data-p="' + n + '">' + (n === 1 ? 'Nur ich' : 'Ich + ' + (n - 1)) + '</button>').join('') + '<button class="k-btn k-btn-ghost" data-v-abbruch>Abbrechen</button></div>'
        : '<div class="k-v-knoepfe">' + (frei > 0 ? '<button class="k-btn k-btn-primary k-btn-xl" data-v-komme="' + v.id + '">' + (me && me.antwort === 'ja' ? 'Ändern' : 'Ich komme') + '</button>' : '<span class="k-v-stand">ausgebucht</span>') +
          (!me || me.antwort === 'ja' ? '<button class="k-btn k-btn-xl k-v-nein" data-v-nein="' + v.id + '">Ich komme nicht</button>' : '') + '</div>';
      return '<article class="k-v-karte' + (v.abgesagt ? ' abgesagt' : '') + '"><h3>' + H.esc(v.titel) + '</h3><p class="k-v-zeit">' + vDatum(v.datum) + (v.beginn ? ', ' + H.esc(v.beginn) + ' Uhr' : '') + (v.ort ? ' · ' + H.esc(v.ort) : '') + '</p>' + stand +
        (v.text ? '<p class="k-v-text">' + H.esc(v.text) + '</p>' : '') +
        '<p class="k-v-info">' + [v.kosten ? 'Kosten: ' + H.geld(v.kosten) + (v.kosten_hinweis ? ' ' + H.esc(v.kosten_hinweis) : ' je Person') : '', v.max_personen && !v.abgesagt ? (frei > 0 ? 'noch ' + frei + (frei === 1 ? ' Platz' : ' Plätze') + ' frei' : 'ausgebucht') : '', v.anmeldung_bis && offen ? 'Anmeldung bis ' + vDatum(v.anmeldung_bis) : ''].filter(Boolean).join(' · ') + '</p>' + knoepfe + '</article>';
    }).join('') || '<p class="k-sub">Gerade keine Veranstaltungen.</p>';
  }
  async function veranstAntworten(id, antwort, personen) {
    const v = veranst.find((x) => x.id === id); if (!v || !zustand.aktiv) return;
    $('#k-veranst-liste').classList.add('warten');
    try {
      const r = await S.kasseZusage(zustand.aktiv.id, zustand.pin, { veranstaltung_id: id, antwort, personen });
      if (r && r.ok === false) { toast(r.fehler === 'pin' || r.fehler === 'gesperrt' ? 'Bitte neu anmelden.' : 'Speichern nicht möglich – bitte beim Kassenwart melden.', 'fehler'); return; }
      toast(antwort === 'ja' ? 'Schön, dass du kommst! Bis zum ' + vDatum(v.datum) + '.' : 'Schade – deine Absage ist gespeichert.');
      await veranstaltungenLaden(); veranstListe();
    } catch (e) { toast(e.message, 'fehler'); }
    finally { $('#k-veranst-liste').classList.remove('warten'); }
  }
  $('#btn-veranst').addEventListener('click', veranstOeffnen);
  $('#k-veranst-zu').addEventListener('click', veranstZu);
  $('#k-veranst-liste').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || $('#k-veranst-liste').classList.contains('warten')) return;
    if (b.dataset.vKomme) { const v = veranst.find((x) => x.id === b.dataset.vKomme); if (!v.begleitung) return veranstAntworten(v.id, 'ja', 1); return veranstListe(v.id); }
    if (b.dataset.vJa) return veranstAntworten(b.dataset.vJa, 'ja', Number(b.dataset.p));
    if (b.dataset.vNein) return veranstAntworten(b.dataset.vNein, 'nein', 0);
    if (b.hasAttribute('data-v-abbruch')) return veranstListe();
  });
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
      const alter = lesen(LS.alter, {}); alter[zustand.aktiv.id] = r.alter == null ? null : Number(r.alter); schreiben(LS.alter, alter);
      offline = false; zustand.ohneNetz = false; angemeldet(r);
    } catch (e) {
      if (e.offline && !ONLINE_ONLY) {   // ohne Netz: Buchung wird gemerkt, der Code beim Nachtragen geprüft
        offline = true; offlineAnzeigen(); zustand.ohneNetz = true;
        const alter = lesen(LS.alter, {}); const a = alter[zustand.aktiv.id];
        angemeldet({ vorname: zustand.aktiv.vorname, alter: a === undefined ? -1 : a });
        $('#monat-summe').textContent = '–'; $('#offen-summe').textContent = '–';
        toast('Gerade kein Internet – du kannst trotzdem buchen. Dein Code wird geprüft, sobald das WLAN wieder da ist.');
      } else pinFehler(e.message);
    }
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
    // Jugendschutz: Getränke mit Altersgrenze gar nicht erst anzeigen
    $('#kacheln').innerHTML = zustand.produkte.filter((p) => !(p.ab_alter && zustand.alter != null && zustand.alter < p.ab_alter)).map((p) =>
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
      const eintrag = { ref: neueRef(), mid: zustand.aktiv.id, name: zustand.aktiv.vorname + ' ' + zustand.aktiv.nachname, pin: zustand.pin, posten, zeit: new Date().toISOString(), text: zustand.bon.map(zeilenText).join(', ') };
      let r;
      if (zustand.ohneNetz) r = null;
      else { try { r = await S.kasseBuchenNach(eintrag.mid, eintrag.pin, posten, eintrag.zeit, eintrag.ref); } catch (e) { if (!e.offline || ONLINE_ONLY) throw e; r = null; offline = true; } }
      if (!r) {   // ohne Netz: merken und später nachtragen
        schreiben(LS.schlange, lesen(LS.schlange, []).concat([eintrag])); offlineAnzeigen();
        r = { ok: true, offline: true, summe: zustand.bon.reduce((s, z) => s + zeilenPreis(z), 0) };
      }
      if (!r.ok) { toast(r.fehler === 'gesperrt' ? 'Konto gesperrt – bitte später erneut.' : 'Buchung nicht möglich – bitte neu anmelden.', 'fehler'); return abmelden(); }
      $('#fertig-titel').textContent = 'Prost, ' + zustand.aktiv.vorname + '!';
      $('#fertig-liste').innerHTML = zustand.bon.map((z) => '<li><span>' + H.esc(z.produkt.emoji || '') + ' ' + H.esc(zeilenText(z)) + '</span><strong>' + H.geld(zeilenPreis(z)) + '</strong></li>').join('');
      $('#fertig-summen').innerHTML = r.offline ? 'Gemerkt: <strong>' + H.geld(r.summe) + '</strong> · wird automatisch gebucht, sobald das WLAN wieder da ist.' : 'Gebucht: <strong>' + H.geld(r.summe) + '</strong> · Diesen Monat insgesamt: <strong>' + H.geld(r.monat_summe) + '</strong>';
      if (!r.offline) setzeSummen(r); zustand.bon = []; renderBon();
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
  $('#btn-verlauf').addEventListener('click', async () => {
    if (zustand.ohneNetz) return toast('Ohne Internet ist der Verlauf nicht verfügbar.', 'fehler');
    try { await renderVerlauf(); sheet('#sheet-verlauf', true); } catch (e) { toast(e.message, 'fehler'); }
  });
  // Nicht verbuchbare Buchungen (z. B. Code beim Nachtragen falsch) – für den Kassenwart
  $('#problem-badge').addEventListener('click', () => {
    const pr = lesen(LS.problem, []);
    $('#problem-liste').innerHTML = pr.map((x, i) => '<li><span class="k-v-zeit">' + H.zeit(x.zeit) + '</span><span class="k-v-text"><strong>' + H.esc(x.name) + '</strong> · ' + H.esc(x.text) + '<br><small>' + H.esc(x.grund) + '</small></span><button class="k-btn k-btn-mini" data-erledigt="' + i + '">Erledigt</button></li>').join('') || '<li class="k-leer">Nichts offen.</li>';
    sheet('#sheet-problem', true);
  });
  $('#problem-liste').addEventListener('click', (e) => {
    const b = e.target.closest('[data-erledigt]'); if (!b) return;
    const pr = lesen(LS.problem, []); pr.splice(Number(b.dataset.erledigt), 1); schreiben(LS.problem, pr); offlineAnzeigen(); $('#problem-badge').click();
  });
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
    let m, p, o, n = [];
    try { [m, p, o, n] = await Promise.all([S.kasseMitglieder(), S.kasseProdukte(), S.kasseOptionen(), S.kasseMitteilungen ? S.kasseMitteilungen() : []]); if (!ONLINE_ONLY) { schreiben(LS.cache, { m, p, o, n, zeit: Date.now() }); offline = false; } }
    catch (e) {
      const c = lesen(LS.cache, null); if (!e.offline || !c) throw e;
      ({ m, p, o } = c); n = c.n || []; offline = true; o = { ...o, pin_selbst_festlegen: false };   // neuer Code braucht Netz
    }
    // Mitteilungen des Vereins (z. B. Sturmwarnung) über der Namensliste
    const mb = $('#k-mitteilung'); const heuteK = new Date().toISOString().slice(0, 10); n = (n || []).filter((x) => !x.gueltig_bis || x.gueltig_bis >= heuteK);
    mb.hidden = !n.length; mb.className = 'k-mitteilung' + (n.some((x) => x.wichtig) ? ' wichtig' : '');
    mb.innerHTML = n.map((x) => '<div><strong>' + (x.wichtig ? '⚠ ' : '') + H.esc(x.titel) + '</strong>' + (x.text ? ' – ' + H.esc(x.text) : '') + '</div>').join('');
    offlineAnzeigen();
    zustand.mitglieder = m; zustand.produkte = p; zustand.optionen = o;
    zustand.einstellungen = { ...zustand.einstellungen, abmelden_sekunden: o.abmelden_sekunden, storno_minuten: o.storno_minuten };
  }
  async function start() {
    uhr(); setInterval(uhr, 10e3);
    // Am Kassen-iPad bleibt nie jemand aus der Verwaltung angemeldet
    if (S.modus !== 'demo') { try { localStorage.removeItem('ssv-session'); } catch (e) { /* egal */ } }
    if (S.modus === 'demo') {
      $('#modus-badge').hidden = false; $('#demo-pin').hidden = false;
      $('#demo-pin').textContent = 'Demo: Beispiel-Mitglieder mit Code haben die 1234 · Mitglieder mit „Code festlegen“ probieren den ersten Besuch aus (die Mitgliedsnummer steht in „Mein SSV“ bzw. in der Verwaltung).';
    }
    const st = await S.kasseStatus();
    if (!st.eingerichtet) return zeige('s-setup');
    try { await datenLaden(); }
    catch (e) { if (/eingerichtet/.test(e.message)) return zeige('s-setup'); toast(e.message, 'fehler'); }
    renderNamen(); zeige('s-wer'); nachtragen();
    // Liste regelmäßig auffrischen, solange niemand angemeldet ist
    setInterval(async () => {
      if (document.body.dataset.screen !== 's-wer') return;
      try { await datenLaden(); renderNamen(); } catch (e) { /* nächster Versuch folgt */ }
    }, 5 * 60e3);
  }
  start();
})();
