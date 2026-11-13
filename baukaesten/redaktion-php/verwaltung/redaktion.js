/* Redaktion (PHP-Variante) · Oberfläche
   Baut alle Formulare aus schema.json und spricht nur mit api.php im selben Ordner.
   Kein innerHTML mit Nutzerdaten, keine Fremd-Requests, läuft ohne Build-Schritt. */
(function () {
  'use strict';

  var API = 'api.php';
  var AUTH = { status: 1, anmelden: 1, einrichten: 1, abmelden: 1 };
  var TAGE = [[1, 'Mo'], [2, 'Di'], [3, 'Mi'], [4, 'Do'], [5, 'Fr'], [6, 'Sa'], [0, 'So']];
  var TAG_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var TAG_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var csrf = '';
  var S = { schema: null, inhalte: null, gespeichert: '', gespeichertVoll: '', live: false, aktiv: null };
  var ui = {};
  var popup = null;

  /* ---------- Hilfen ---------- */
  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) haenge(n, arguments[i]);
    return n;
  }
  function haenge(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { haenge(n, x); }); return; }
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function leere(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function setze() { leere(app); for (var i = 0; i < arguments.length; i++) haenge(app, arguments[i]); }
  function kopie(o) { return JSON.parse(JSON.stringify(o)); }
  function sauber(o) { var c = kopie(o || {}); delete c._stand; return JSON.stringify(c); }
  function zwei(n) { return (n < 10 ? '0' : '') + n; }
  function heute() { var d = new Date(); return d.getFullYear() + '-' + zwei(d.getMonth() + 1) + '-' + zwei(d.getDate()); }
  function datumLang(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return TAG_KURZ[d.getDay()] + ', ' + m[3] + '.' + m[2] + '.' + m[1];
  }
  function tageKurz(liste) {
    return TAGE.filter(function (t) { return liste.indexOf(t[0]) > -1; }).map(function (t) { return t[1]; }).join(', ');
  }
  function zeitpunkt(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return '';
    return 'am ' + zwei(d.getDate()) + '.' + zwei(d.getMonth() + 1) + '.' + d.getFullYear() + ' um ' + zwei(d.getHours()) + ':' + zwei(d.getMinutes()) + ' Uhr';
  }
  function archivName(datei) {
    var m = /inhalte-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})\d{2}\.json$/.exec(datei);
    return m ? 'Fassung bis ' + m[3] + '.' + m[2] + '.' + m[1] + ', ' + m[4] + ':' + m[5] + ' Uhr' : datei;
  }
  function finde(id) { return (S.schema.bereiche || []).filter(function (b) { return b.id === id; })[0]; }
  function feldDef(b, id) { return (b.felder || []).filter(function (f) { return f.id === id; })[0]; }
  function datumFeld(b) { return (b.felder || []).filter(function (f) { return f.typ === 'datum'; })[0]; }

  var tt;
  function toast(text, istFehler) {
    toastEl.textContent = text;
    toastEl.className = 'toast zeigen' + (istFehler ? ' fehler' : '');
    clearTimeout(tt);
    tt = setTimeout(function () { toastEl.className = 'toast'; }, istFehler ? 8000 : 4000);
  }
  function fehlerToast(e) { toast(e && e.message ? e.message : 'Unbekannter Fehler.', true); }
  function meldung(n, text) { n.textContent = text; n.hidden = !text; }

  /* ---------- Server ---------- */
  function api(aktion, daten, wiederholt) {
    var post = daten !== undefined;
    var opt = { method: post ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } };
    if (post) {
      opt.headers['Content-Type'] = 'application/json';
      opt.headers['X-CSRF'] = csrf;
      opt.body = JSON.stringify(daten);
    }
    return fetch(API + '?aktion=' + encodeURIComponent(aktion), opt).then(function (r) {
      return r.json().catch(function () {
        return { ok: false, fehler: 'Der Server antwortet nicht wie erwartet (' + r.status + '). Läuft PHP auf dem Webspace?' };
      }).then(function (j) {
        if (j.csrf) csrf = j.csrf;
        if (r.status === 401 && !wiederholt && (aktion === 'anmelden' || aktion === 'einrichten')) {
          /* Token veraltet (abgemeldet, Tab lange offen): frisches Token holen, einmal neu versuchen */
          return api('status').then(function () { return api(aktion, daten, true); });
        }
        if (r.status === 401 && !wiederholt && !AUTH[aktion] && S.schema) {
          return neuAnmelden().then(function () { return api(aktion, daten, true); });
        }
        if (!r.ok || !j.ok) {
          var e = new Error(j.fehler || 'Unbekannter Fehler.');
          e.status = r.status;
          throw e;
        }
        return j;
      });
    }, function () { throw new Error('Keine Verbindung zum Server. Bitte Internet prüfen.'); });
  }

  /* ---------- Bausteine für Formulare ---------- */
  function feld(label, input, hilfe) {
    var id = input.id;
    var h = hilfe ? el('small', { id: id + '-h', text: hilfe }) : null;
    if (h) input.setAttribute('aria-describedby', id + '-h');
    return el('div', { class: 'feld' }, el('label', { for: id, text: label }), input, h);
  }
  function passwortFeld(id, auto) {
    return el('input', { type: 'password', id: id, autocomplete: auto, required: true });
  }

  /* ---------- Einrichten und Anmelden ---------- */
  function zeigeEinrichten() {
    var meld = el('div', { class: 'meldung', role: 'alert', hidden: true });
    var code = el('input', { type: 'text', id: 'code', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', required: true, placeholder: 'XXXX-XXXX' });
    var pw = passwortFeld('pw', 'new-password');
    var pw2 = passwortFeld('pw2', 'new-password');
    var btn = el('button', { class: 'btn btn-haupt btn-voll', type: 'submit', text: 'Redaktion einrichten' });
    var form = el('form', { class: 'karte', novalidate: true },
      el('h1', { text: 'Redaktion einrichten' }),
      el('p', { text: 'Das passiert nur einmal. Den Einrichtungscode finden Sie auf Ihrem Webspace in der Datei daten/privat/einrichtungscode.php. Danach legen Sie Ihr eigenes Passwort fest.' }),
      meld,
      feld('Einrichtungscode', code),
      feld('Neues Passwort', pw, 'Mindestens 10 Zeichen. Gut merkbar ist ein kurzer Satz, den nur Sie kennen.'),
      feld('Passwort wiederholen', pw2),
      btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!code.value.trim()) return meldung(meld, 'Bitte den Einrichtungscode eingeben.');
      if (pw.value.length < 10) return meldung(meld, 'Das Passwort braucht mindestens 10 Zeichen.');
      if (pw.value !== pw2.value) return meldung(meld, 'Die beiden Passwörter sind nicht gleich.');
      btn.disabled = true;
      api('einrichten', { code: code.value, passwort: pw.value })
        .then(function () { toast('Fertig eingerichtet. Willkommen in Ihrer Redaktion.'); return laden(); })
        .catch(function (err) { meldung(meld, err.message); btn.disabled = false; });
    });
    setze(form);
    code.focus();
  }

  function anmeldeFormular(titel, text, fertig) {
    var meld = el('div', { class: 'meldung', role: 'alert', hidden: true });
    var pw = passwortFeld('pw', 'current-password');
    var btn = el('button', { class: 'btn btn-haupt btn-voll', type: 'submit', text: 'Anmelden' });
    var form = el('form', { class: 'karte', novalidate: true },
      el('h1', { text: titel }), el('p', { text: text }), meld, feld('Passwort', pw), btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!pw.value) return meldung(meld, 'Bitte das Passwort eingeben.');
      btn.disabled = true;
      btn.textContent = 'Prüft …';
      api('anmelden', { passwort: pw.value })
        .then(fertig)
        .catch(function (err) { meldung(meld, err.message); btn.disabled = false; btn.textContent = 'Anmelden'; pw.select(); });
    });
    return { form: form, fokus: function () { pw.focus(); } };
  }

  function zeigeAnmelden() {
    S.schema = null;
    var f = anmeldeFormular('Redaktion', 'Bitte melden Sie sich mit Ihrem Passwort an.', laden);
    setze(f.form);
    f.fokus();
  }

  var anmeldeWarten = null;
  function neuAnmelden() {
    if (anmeldeWarten) return anmeldeWarten;
    anmeldeWarten = api('status').then(function () {
      return new Promise(function (fertig) {
        var d;
        var f = anmeldeFormular('Bitte erneut anmelden', 'Ihre Sitzung ist abgelaufen. Ihre Änderungen bleiben erhalten und werden danach gespeichert.', function () {
          d.remove();
          anmeldeWarten = null;
          fertig();
        });
        d = el('div', { class: 'dialog' }, f.form);
        f.form.setAttribute('role', 'dialog');
        f.form.setAttribute('aria-modal', 'true');
        document.body.appendChild(d);
        f.fokus();
      });
    });
    return anmeldeWarten;
  }

  /* ---------- Laden ---------- */
  function laden() {
    return api('laden').then(function (j) {
      S.schema = j.schema;
      S.inhalte = j.inhalte && typeof j.inhalte === 'object' && !Array.isArray(j.inhalte) ? j.inhalte : {};
      S.live = !!j.live;
      merke();
      zeigeArbeit();
    });
  }
  function merke() {
    S.gespeichert = sauber(S.inhalte);
    S.gespeichertVoll = JSON.stringify(S.inhalte);
  }
  function offen() { return !!S.schema && sauber(S.inhalte) !== S.gespeichert; }

  /* ---------- Arbeitsfläche ---------- */
  function zeigeArbeit() {
    var sc = S.schema;
    var wurzel = document.documentElement.style;
    if (sc.akzent) wurzel.setProperty('--akzent', sc.akzent);
    if (sc.akzent_dunkel) wurzel.setProperty('--akzent-dunkel', sc.akzent_dunkel);
    document.title = (sc.titel || 'Redaktion');

    ui.menue = el('nav', { class: 'menue', 'aria-label': 'Bereiche' });
    sc.bereiche.forEach(function (b) {
      ui.menue.appendChild(el('button', { type: 'button', 'data-id': b.id, onclick: function () { waehle(b.id); } },
        b.titel, b.kurz ? el('small', { text: b.kurz }) : null));
    });
    ui.bereich = el('section', { class: 'bereich', 'aria-labelledby': 'bereich-titel' });
    ui.iframe = el('iframe', { title: 'Vorschau der Website mit Ihren Änderungen', loading: 'eager' });
    ui.vorschau = el('aside', { class: 'vorschau', 'aria-label': 'Vorschau' },
      el('p', { text: 'Vorschau mit Ihren ungespeicherten Änderungen' }), ui.iframe);
    ui.stand = el('span', { class: 'stand', role: 'status' });
    ui.speichern = el('button', { class: 'btn btn-haupt', type: 'button', onclick: speichern, text: 'Speichern' });
    ui.verwerfen = el('button', { class: 'btn', type: 'button', onclick: verwerfen, text: 'Verwerfen' });

    var kopf = el('header', { class: 'kopf' },
      el('h1', { text: sc.titel || 'Redaktion' }),
      el('button', { class: 'btn btn-klein nur-klein', type: 'button', onclick: oeffneVorschau, text: 'Vorschau' }),
      el('a', { class: 'btn btn-klein optional', href: '../', target: '_blank', rel: 'noopener', text: 'Website ansehen' }),
      el('button', { class: 'btn btn-klein', type: 'button', onclick: zeigeArchiv, text: 'Ältere Fassungen' }),
      el('button', { class: 'btn btn-klein optional', type: 'button', onclick: zeigePasswort, text: 'Passwort ändern' }),
      el('button', { class: 'btn btn-klein', type: 'button', onclick: abmelden, text: 'Abmelden' }));

    setze(kopf,
      el('main', { class: 'flaeche mit-vorschau' }, ui.menue, ui.bereich, ui.vorschau),
      el('div', { class: 'leiste' }, ui.stand, ui.verwerfen, ui.speichern));

    var start = decodeURIComponent(location.hash.slice(1));
    waehle(finde(start) ? start : sc.bereiche[0].id);
    aktualisiereStand();
  }

  function waehle(id) {
    var b = finde(id);
    if (!b) return;
    S.aktiv = b.id;
    Array.prototype.forEach.call(ui.menue.children, function (k) { k.setAttribute('aria-current', k.getAttribute('data-id') === b.id ? 'true' : 'false'); });
    zeichneBereich(b);
    ladeVorschau(b);
    if (history.replaceState) history.replaceState(null, '', '#' + b.id);
  }

  function zeichneBereich(b) {
    var k = [el('h2', { id: 'bereich-titel', text: b.titel }), b.hilfe ? el('p', { class: 'hilfe', text: b.hilfe }) : null];
    if (b.typ === 'liste') {
      var liste = S.inhalte[b.id];
      if (!Array.isArray(liste)) liste = S.inhalte[b.id] = [];
      var box = el('div', { class: 'eintraege' });
      liste.forEach(function (e, i) { box.appendChild(zeichneEintrag(b, liste, e, i)); });
      if (!liste.length) box.appendChild(el('p', { class: 'leer', text: b.leer || 'Noch keine Einträge.' }));
      k.push(box);
      var aktionen = el('div', { class: 'liste-aktionen' });
      if (!b.max || liste.length < b.max) {
        aktionen.appendChild(el('button', { type: 'button', class: 'btn', text: '+ ' + (b.eintrag || 'Eintrag') + ' hinzufügen', onclick: function () {
          liste.push(neuerEintrag(b));
          geaendert();
          zeichneBereich(b);
          var alle = ui.bereich.querySelectorAll('.eintrag');
          var letzter = alle[alle.length - 1];
          if (letzter) { letzter.scrollIntoView({ block: 'center' }); var x = letzter.querySelector('input,select,textarea'); if (x) x.focus(); }
        } }));
      }
      var df = datumFeld(b);
      if (df && liste.some(function (e) { return istVorbei(b, e); })) {
        aktionen.appendChild(el('button', { type: 'button', class: 'btn', text: 'Vergangene entfernen', onclick: function () {
          S.inhalte[b.id] = liste.filter(function (e) { return !istVorbei(b, e); });
          geaendert();
          zeichneBereich(b);
        } }));
      }
      k.push(aktionen);
    } else {
      var obj = S.inhalte[b.id];
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) obj = S.inhalte[b.id] = {};
      k.push(el('div', { class: 'felder' }, b.felder.map(function (f) { return zeichneFeld(f, obj, b.id); })));
    }
    leere(ui.bereich);
    haenge(ui.bereich, k);
  }

  function neuerEintrag(b) {
    var e = {};
    b.felder.forEach(function (f) {
      var vor = b.neu && b.neu[f.id] !== undefined ? b.neu[f.id] : f.standard;
      e[f.id] = vor !== undefined ? kopie(vor) : f.typ === 'schalter' ? false : f.typ === 'wochentage' ? [] : '';
    });
    return e;
  }
  function istVorbei(b, e) {
    var df = datumFeld(b);
    return !!(df && e[df.id] && e[df.id] < heute());
  }
  function eintragTitel(b, e, i) {
    var teile = [];
    (b.titelfelder || []).forEach(function (fid) {
      var f = feldDef(b, fid);
      var v = e[fid];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
      teile.push(f && f.typ === 'datum' ? datumLang(v) : f && f.typ === 'wochentage' ? tageKurz(v) : String(v));
    });
    var t = teile.length ? teile.join(' · ') : (b.eintrag || 'Eintrag') + ' ' + (i + 1);
    return istVorbei(b, e) ? t + ' (vorbei)' : t;
  }

  function zeichneEintrag(b, liste, e, i) {
    var titel = el('strong', { text: eintragTitel(b, e, i) });
    var box = el('div', { class: 'eintrag' + (istVorbei(b, e) ? ' vorbei' : '') });
    var knoepfe = [];
    if (!b.sortieren) {
      if (i > 0) knoepfe.push(el('button', { type: 'button', class: 'btn btn-klein', 'aria-label': 'Nach oben schieben', title: 'Nach oben', text: '↑', onclick: function () { tausche(b, liste, i, i - 1); } }));
      if (i < liste.length - 1) knoepfe.push(el('button', { type: 'button', class: 'btn btn-klein', 'aria-label': 'Nach unten schieben', title: 'Nach unten', text: '↓', onclick: function () { tausche(b, liste, i, i + 1); } }));
    }
    knoepfe.push(el('button', { type: 'button', class: 'btn btn-klein btn-gefahr', text: 'Entfernen', onclick: function () {
      liste.splice(i, 1);
      geaendert();
      zeichneBereich(b);
    } }));
    box.appendChild(el('div', { class: 'eintrag-kopf' }, titel, knoepfe));
    box.appendChild(el('div', { class: 'zeile' }, b.felder.map(function (f) { return zeichneFeld(f, e, b.id + '-' + i); })));
    var neuTitel = function () { titel.textContent = eintragTitel(b, e, i); box.classList.toggle('vorbei', istVorbei(b, e)); };
    box.addEventListener('input', neuTitel);
    box.addEventListener('change', neuTitel);
    return box;
  }
  function tausche(b, liste, a, z) {
    var x = liste[a]; liste[a] = liste[z]; liste[z] = x;
    geaendert();
    zeichneBereich(b);
  }

  function zeichneFeld(f, obj, praefix) {
    var id = 'f-' + praefix + '-' + f.id;
    var typ = f.typ || 'text';
    var wert = obj[f.id];
    var hilfeId = f.hilfe ? id + '-h' : null;
    var hilfe = f.hilfe ? el('small', { id: hilfeId, text: f.hilfe }) : null;
    function setzeWert(v) { obj[f.id] = v; geaendert(); }
    var input;
    var klasse = 'feld';

    if (typ === 'schalter') {
      input = el('input', { type: 'checkbox', id: id, role: 'switch', 'aria-describedby': hilfeId });
      input.checked = !!wert;
      input.addEventListener('change', function () { setzeWert(input.checked); });
      return el('div', { class: 'feld voll' }, el('label', { class: 'schalter', for: id }, input, f.label), hilfe);
    }
    if (typ === 'wochentage') {
      var gruppe = el('div', { class: 'tage', role: 'group', 'aria-labelledby': id + '-l', 'aria-describedby': hilfeId });
      var gewaehlt = Array.isArray(wert) ? wert : [];
      TAGE.forEach(function (t) {
        var cb = el('input', { type: 'checkbox', value: String(t[0]), 'aria-label': TAG_LANG[t[0]] });
        cb.checked = gewaehlt.indexOf(t[0]) > -1;
        cb.addEventListener('change', function () {
          var neu = [];
          Array.prototype.forEach.call(gruppe.querySelectorAll('input'), function (c) { if (c.checked) neu.push(+c.value); });
          setzeWert(neu.sort());
        });
        gruppe.appendChild(el('label', null, cb, el('span', { 'aria-hidden': 'true', text: t[1] })));
      });
      return el('div', { class: 'feld voll' }, el('span', { class: 'label', id: id + '-l', text: f.label }), gruppe, hilfe);
    }
    if (typ === 'textlang') {
      input = el('textarea', { id: id, rows: f.zeilen || 4, maxlength: String(f.max || 1000) });
      input.value = wert || '';
      input.addEventListener('input', function () { setzeWert(input.value); });
      klasse += ' voll';
    } else if (typ === 'uhrzeit') {
      input = el('input', { type: 'time', id: id, step: '300' });
      input.value = wert || '';
      input.addEventListener('input', function () { setzeWert(input.value); });
    } else if (typ === 'datum') {
      input = el('input', { type: 'date', id: id });
      input.value = wert || '';
      input.addEventListener('input', function () { setzeWert(input.value); });
    } else if (typ === 'zahl') {
      input = el('input', { type: 'number', id: id, inputmode: 'decimal', min: f.min, max: f.max, step: f.schritt || 'any' });
      input.value = wert === '' || wert == null ? '' : String(wert);
      input.addEventListener('input', function () { setzeWert(input.value === '' ? '' : Number(input.value)); });
    } else if (typ === 'auswahl') {
      input = el('select', { id: id });
      (f.optionen || []).forEach(function (o) {
        var v = Array.isArray(o) ? o[0] : o;
        input.appendChild(el('option', { value: String(v), text: String(Array.isArray(o) ? o[1] : o) }));
      });
      input.value = wert == null ? '' : String(wert);
      input.addEventListener('change', function () { setzeWert(input.value); });
    } else {
      var max = f.max || 120;
      input = el('input', { type: 'text', id: id, maxlength: String(max), autocomplete: 'off' });
      input.value = wert || '';
      input.addEventListener('input', function () { setzeWert(input.value); });
      if (max > 30) klasse += ' voll';
    }
    if (f.platzhalter) input.placeholder = f.platzhalter;
    if (f.pflicht) input.required = true;
    if (hilfeId) input.setAttribute('aria-describedby', hilfeId);
    return el('div', { class: klasse }, el('label', { for: id, text: f.label }), input, hilfe);
  }

  /* ---------- Stand, Speichern, Verwerfen ---------- */
  function geaendert() { aktualisiereStand(); sendeVorschau(); }

  function aktualisiereStand() {
    if (!ui.stand) return;
    var o = offen();
    ui.stand.className = 'stand' + (o ? ' offen' : '');
    ui.stand.textContent = o ? 'Ungespeicherte Änderungen'
      : S.live ? 'Alles gespeichert' + (S.inhalte._stand ? ', zuletzt ' + zeitpunkt(S.inhalte._stand) : '')
        : 'Noch nichts geändert. Die Website zeigt die Grundfassung.';
    ui.speichern.disabled = !o;
    ui.verwerfen.hidden = !o;
  }

  function sortiereListen() {
    S.schema.bereiche.forEach(function (b) {
      if (b.typ !== 'liste' || !b.sortieren || !Array.isArray(S.inhalte[b.id])) return;
      var k = b.sortieren;
      S.inhalte[b.id].sort(function (x, y) { return String(x[k] || '').localeCompare(String(y[k] || '')); });
    });
  }

  /* Konvention wie in api.php: „von“ und „bis“ müssen eine sinnvolle Spanne bilden */
  function pruefeZeiten() {
    var fehlerText = '';
    S.schema.bereiche.some(function (b) {
      if (!feldDef(b, 'von') || !feldDef(b, 'bis')) return false;
      var eintraege = b.typ === 'liste' ? (S.inhalte[b.id] || []) : [S.inhalte[b.id] || {}];
      return eintraege.some(function (e, i) {
        if (e.von && e.bis && e.bis <= e.von) {
          fehlerText = b.titel + (b.typ === 'liste' ? ', ' + eintragTitel(b, e, i) : '') + ': Das Ende (' + e.bis + ') muss nach dem Beginn (' + e.von + ') liegen.';
          return true;
        }
        return false;
      });
    });
    return fehlerText;
  }

  var speichertGerade = false;
  function speichern() {
    if (!offen() || speichertGerade) return;
    var problem = pruefeZeiten();
    if (problem) { toast(problem, true); return; }
    speichertGerade = true;
    sortiereListen();
    ui.speichern.disabled = true;
    ui.speichern.textContent = 'Speichert …';
    api('speichern', { inhalte: S.inhalte }).then(function (j) {
      S.inhalte._stand = j.stand;
      S.live = true;
      merke();
      zeichneBereich(finde(S.aktiv));
      toast('Gespeichert. Die Website zeigt die Änderung ab sofort.');
    }).catch(fehlerToast).then(function () {
      speichertGerade = false;
      ui.speichern.textContent = 'Speichern';
      aktualisiereStand();
      sendeVorschau();
    });
  }

  function verwerfen() {
    if (!offen()) return;
    if (!window.confirm('Alle ungespeicherten Änderungen verwerfen?')) return;
    S.inhalte = JSON.parse(S.gespeichertVoll);
    zeichneBereich(finde(S.aktiv));
    geaendert();
  }

  /* ---------- Vorschau ---------- */
  function seitenUrl(b, vorschau) {
    var u = new URL('../' + (b.seite || S.schema.seite || 'index.html'), location.href);
    if (vorschau) u.searchParams.set('vorschau', '1');
    return u.href;
  }
  function ladeVorschau(b) {
    if (!ui.iframe) return;
    var ziel = seitenUrl(b, true);
    if (ui.iframe.getAttribute('src') !== ziel) ui.iframe.setAttribute('src', ziel);
  }
  function oeffneVorschau() {
    var b = finde(S.aktiv);
    popup = window.open(seitenUrl(b, true), 'redaktion-vorschau');
  }
  function sendeAn(w) {
    if (!w) return;
    try { w.postMessage({ typ: 'redaktion-inhalte', inhalte: S.inhalte }, location.origin); } catch (x) { /* Fenster zu */ }
  }
  var vt;
  function sendeVorschau() {
    clearTimeout(vt);
    vt = setTimeout(function () {
      if (ui.iframe) sendeAn(ui.iframe.contentWindow);
      if (popup && !popup.closed) sendeAn(popup);
    }, 120);
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || e.data.typ !== 'redaktion-bereit' || !S.schema) return;
    sendeAn(e.source);
  });

  /* ---------- Dialoge ---------- */
  function dialog(titel, text, inhalt) {
    var vorher = document.activeElement;
    var zu = el('button', { type: 'button', class: 'btn btn-voll', text: 'Schließen' });
    var karte = el('div', { class: 'karte', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-titel' },
      el('h1', { id: 'dlg-titel', text: titel }), text ? el('p', { text: text }) : null, inhalt, zu);
    var d = el('div', { class: 'dialog' }, karte);
    function esc(e) { if (e.key === 'Escape') schliessen(); }
    function schliessen() {
      d.remove();
      document.removeEventListener('keydown', esc);
      if (vorher && vorher.focus) vorher.focus();
    }
    zu.addEventListener('click', schliessen);
    d.addEventListener('click', function (e) { if (e.target === d) schliessen(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(d);
    var erstes = karte.querySelector('input, button');
    if (erstes) erstes.focus();
    return schliessen;
  }

  function zeigeArchiv() {
    api('archiv').then(function (j) {
      var schliessen;
      var liste = el('ul', { class: 'archiv' });
      if (!j.fassungen.length) liste.appendChild(el('li', { text: 'Noch keine älteren Fassungen. Sie entstehen bei jedem Speichern.' }));
      j.fassungen.forEach(function (datei) {
        liste.appendChild(el('li', null, el('span', { text: archivName(datei) }),
          el('button', { type: 'button', class: 'btn btn-klein', text: 'Laden', onclick: function () {
            if (offen() && !window.confirm('Ihre ungespeicherten Änderungen gehen dabei verloren. Trotzdem laden?')) return;
            api('wiederherstellen', { datei: datei }).then(function (r) {
              var neu = r.inhalte && typeof r.inhalte === 'object' ? r.inhalte : {};
              neu._stand = S.inhalte._stand;
              S.inhalte = neu;
              schliessen();
              zeichneBereich(finde(S.aktiv));
              geaendert();
              toast(archivName(datei) + ' geladen. Bitte prüfen und dann speichern.');
            }).catch(fehlerToast);
          } })));
      });
      schliessen = dialog('Ältere Fassungen', 'Bei jedem Speichern wird die vorherige Fassung aufbewahrt, die letzten 30. Eine geladene Fassung geht erst mit „Speichern“ live.', liste);
    }).catch(fehlerToast);
  }

  function zeigePasswort() {
    var meld = el('div', { class: 'meldung', role: 'alert', hidden: true });
    var alt = passwortFeld('pw-alt', 'current-password');
    var neu = passwortFeld('pw-neu', 'new-password');
    var neu2 = passwortFeld('pw-neu2', 'new-password');
    var btn = el('button', { type: 'submit', class: 'btn btn-haupt btn-voll', text: 'Passwort ändern' });
    var schliessen;
    var form = el('form', { novalidate: true }, meld,
      feld('Bisheriges Passwort', alt),
      feld('Neues Passwort', neu, 'Mindestens 10 Zeichen.'),
      feld('Neues Passwort wiederholen', neu2),
      btn);
    form.style.marginBottom = '12px';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (neu.value.length < 10) return meldung(meld, 'Das neue Passwort braucht mindestens 10 Zeichen.');
      if (neu.value !== neu2.value) return meldung(meld, 'Die beiden neuen Passwörter sind nicht gleich.');
      btn.disabled = true;
      api('passwort', { alt: alt.value, neu: neu.value }).then(function () {
        schliessen();
        toast('Passwort geändert.');
      }).catch(function (err) { meldung(meld, err.message); btn.disabled = false; });
    });
    schliessen = dialog('Passwort ändern', null, form);
  }

  function abmelden() {
    if (offen() && !window.confirm('Es gibt ungespeicherte Änderungen. Trotzdem abmelden?')) return;
    api('abmelden', {}).catch(function () {}).then(function () {
      S.inhalte = null;
      ui = {};
      return api('status').catch(function () {});
    }).then(zeigeAnmelden);
  }

  /* ---------- Tastatur, Verlassen, Start ---------- */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && S.schema) { e.preventDefault(); speichern(); }
  });
  window.addEventListener('beforeunload', function (e) {
    if (offen()) { e.preventDefault(); e.returnValue = ''; }
  });

  api('status').then(function (j) {
    if (!j.eingerichtet) return zeigeEinrichten();
    if (!j.angemeldet) return zeigeAnmelden();
    return laden();
  }).catch(function (e) {
    setze(el('div', { class: 'karte' }, el('h1', { text: 'Redaktion nicht erreichbar' }), el('p', { text: e.message })));
  });
})();
