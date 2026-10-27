/* SSV Redaktion – Inhalte der Website pflegen, ohne neu hochzuladen.
 * Jede Änderung wird sofort gespeichert. Im Modus 'supabase' ist sie damit
 * sofort für alle Besucher sichtbar; im Demo-Modus nur in diesem Browser. */
(function () {
  'use strict';

  const K = window.SSV_WEB_KONFIG || { modus: 'demo' };
  const CMS = window.SSV_CMS;
  CMS.setzeBasis('../');
  const STD = window.SSV_INHALTE_STANDARD;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const kopie = (o) => JSON.parse(JSON.stringify(o));
  const bild = (b) => !b ? '' : /^(https?:|data:|blob:)/.test(b) ? b : '../' + b;
  const heuteIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const datumKurz = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const SEITEN = [['', '– kein Link –'], ['termine.html', 'Termine'], ['jugend.html', 'Jugend'], ['hafen.html', 'Hafen & Gäste'], ['verein.html', 'Verein'],
    ['verein.html#mitglied', 'Mitglied werden'], ['galerie.html', 'Galerie'], ['verein.html#dokumente', 'Dokumente'], ['eigen', 'Eigene Adresse …']];

  /* ============================================================ Speicher */
  const Demo = {
    modus: 'demo',
    async anmelden(e, p) { if (e.trim().toLowerCase() === 'redaktion@demo' && p === 'demo') { sessionStorage.setItem('ssv-red', '1'); return; } throw new Error('E-Mail oder Passwort falsch.'); },
    async angemeldet() { return sessionStorage.getItem('ssv-red') === '1'; },
    async abmelden() { sessionStorage.removeItem('ssv-red'); },
    async laden() { try { const l = JSON.parse(localStorage.getItem(CMS.DEMO_KEY)); if (l && l.version) return { ...kopie(STD), ...l }; } catch (e) { /* Standard */ } return kopie(STD); },
    async speichern(schluessel, daten, alles) {
      try { localStorage.setItem(CMS.DEMO_KEY, JSON.stringify(alles)); }
      catch (e) { throw new Error('Der Demo-Speicher dieses Browsers ist voll – bitte ein paar Fotos löschen. Im Echtbetrieb gibt es diese Grenze nicht.'); }
    },
    async bildHochladen(blob) { return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); }); },
    async zuruecksetzen() { localStorage.removeItem(CMS.DEMO_KEY); }
  };

  const Supa = {
    modus: 'supabase', url: (K.supabaseUrl || '').replace(/\/$/, ''), key: K.supabaseAnonKey, S: 'ssv-red-session',
    _s() { try { return JSON.parse(localStorage.getItem(this.S)); } catch (e) { return null; } },
    async _jwt() {
      const s = this._s(); if (!s) return null;
      if (s.expires_at * 1000 - Date.now() > 60e3) return s.access_token;
      const r = await fetch(this.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) { localStorage.removeItem(this.S); return null; }
      const n = await r.json(); localStorage.setItem(this.S, JSON.stringify(n)); return n.access_token;
    },
    async _h(json = true) { const j = await this._jwt(); const h = { apikey: this.key, Authorization: 'Bearer ' + (j || this.key) }; if (json) h['Content-Type'] = 'application/json'; return h; },
    async anmelden(email, password) {
      const r = await fetch(this.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!r.ok) throw new Error('E-Mail oder Passwort falsch.');
      localStorage.setItem(this.S, JSON.stringify(await r.json()));
      const ok = await fetch(this.url + '/rest/v1/rpc/ist_redakteur', { method: 'POST', headers: await this._h(), body: '{}' }).then((x) => x.json()).catch(() => false);
      if (ok !== true) { localStorage.removeItem(this.S); throw new Error('Dieses Konto ist nicht für die Redaktion freigeschaltet.'); }
    },
    async angemeldet() { return !!(await this._jwt()); },
    async abmelden() { localStorage.removeItem(this.S); },
    async laden() {
      const r = await fetch(this.url + '/rest/v1/website_inhalte?select=schluessel,daten', { headers: await this._h() });
      if (!r.ok) throw new Error('Inhalte konnten nicht geladen werden.');
      const I = kopie(STD); (await r.json()).forEach((z) => { I[z.schluessel] = z.daten; }); return I;
    },
    async speichern(schluessel, daten) {
      const r = await fetch(this.url + '/rest/v1/website_inhalte?on_conflict=schluessel', {
        method: 'POST', headers: { ...(await this._h()), Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ schluessel, daten })
      });
      if (!r.ok) throw new Error('Speichern fehlgeschlagen (' + r.status + ') – bitte erneut anmelden.');
    },
    async bildHochladen(blob) {
      const pfad = new Date().toISOString().slice(0, 7) + '/' + uid() + '.jpg';
      const r = await fetch(this.url + '/storage/v1/object/website/' + pfad, { method: 'POST', headers: { ...(await this._h(false)), 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }, body: blob });
      if (!r.ok) throw new Error('Foto-Upload fehlgeschlagen (' + r.status + ').');
      return this.url + '/storage/v1/object/public/website/' + pfad;
    }
  };

  const SP = K.modus === 'supabase' && K.supabaseUrl ? Supa : Demo;
  let I = null;
  let tab = 'start';

  /* ============================================================== Helfer */
  function toast(t, art) { const el = $('#toast'); el.textContent = t; el.className = 'toast zeigen' + (art ? ' ' + art : ''); clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = 'toast'; }, 3000); }
  function modal(html) {
    const m = $('#modal'); m.innerHTML = '<div class="modal"><div class="modal-karte" role="dialog" aria-modal="true">' + html + '</div></div>';
    const el = m.firstChild; el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-zu]')) zu(); });
    return el;
  }
  function zu() { $('#modal').innerHTML = ''; }

  async function speichern(schluessel, meldung) {
    try {
      await SP.speichern(schluessel, I[schluessel], I);
      toast((meldung || 'Gespeichert') + (SP.modus === 'demo' ? ' – Vorschau in diesem Browser' : ' – jetzt online'));
      vorschauNeu();
      return true;
    } catch (e) { toast(e.message, 'fehler'); return false; }
  }

  /* Fotos werden vor dem Hochladen verkleinert (Handyfotos haben oft 5–10 MB) */
  async function fotoVerkleinern(datei, max = SP.modus === 'demo' ? 1280 : 2000) {
    const bmp = await createImageBitmap(datei, { imageOrientation: 'from-image' }).catch(() => null);
    if (!bmp) throw new Error('Dieses Bildformat wird nicht unterstützt (bitte JPG oder PNG).');
    const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', SP.modus === 'demo' ? 0.78 : 0.85));
  }
  async function fotoAuswaehlen(mehrere) {
    return await new Promise((ok) => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = !!mehrere;
      inp.onchange = () => ok([...inp.files]); inp.click();
    });
  }
  async function hochladen(dateien) {
    const urls = [];
    for (const d of dateien) { toast('Foto wird vorbereitet …'); urls.push(await SP.bildHochladen(await fotoVerkleinern(d))); }
    return urls;
  }

  function linkFeld(name, wert) {
    const bekannt = SEITEN.some(([v]) => v === (wert || ''));
    return '<label class="feld">Link<select name="' + name + '_wahl">' + SEITEN.map(([v, l]) =>
      '<option value="' + v + '"' + ((bekannt ? v === (wert || '') : v === 'eigen') ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
      '<label class="feld" data-eigen="' + name + '"' + (bekannt ? ' hidden' : '') + '>Eigene Adresse<input name="' + name + '_eigen" value="' + esc(bekannt ? '' : wert) + '" placeholder="https://…"></label>';
  }
  function linkLesen(form, name) {
    const w = form[name + '_wahl'].value; return w === 'eigen' ? form[name + '_eigen'].value.trim() : w;
  }
  function linkFeldVerdrahten(el, name) {
    const sel = el.querySelector('[name="' + name + '_wahl"]');
    sel.addEventListener('change', () => { el.querySelector('[data-eigen="' + name + '"]').hidden = sel.value !== 'eigen'; });
  }
  function bildFeld(wert) {
    return '<div class="feld">Foto<div class="bildwahl" data-bildwahl>' + (wert ? '<img src="' + esc(bild(wert)) + '" alt="">' : '<span class="platz">kein Foto</span>') +
      '<div class="aktionen"><button type="button" class="btn klein" data-foto-neu>Foto hochladen</button><button type="button" class="btn klein" data-foto-galerie>Aus Galerie</button>' +
      (wert ? '<button type="button" class="btn klein gefahr" data-foto-weg>Entfernen</button>' : '') + '</div></div></div>';
  }
  function bildFeldVerdrahten(el, wert, setzen) {
    const neu = (w) => { setzen(w); const box = el.querySelector('[data-bildwahl]'); box.parentElement.outerHTML = bildFeld(w); bildFeldVerdrahten(el, w, setzen); };
    el.querySelector('[data-foto-neu]').addEventListener('click', async () => {
      const d = await fotoAuswaehlen(false); if (!d.length) return;
      try { neu((await hochladen(d))[0]); toast('Foto bereit – noch speichern.'); } catch (e) { toast(e.message, 'fehler'); }
    });
    el.querySelector('[data-foto-galerie]').addEventListener('click', () => {
      const m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = '<div class="modal-karte"><h2>Foto aus der Galerie</h2><div class="galerie-raster" style="margin-top:14px">' + (I.galerie || []).map((g, i) =>
        '<figure><button type="button" class="btn" style="padding:0;display:block;width:100%" data-i="' + i + '"><img src="' + esc(bild(g.bild)) + '" alt=""></button><figcaption>' + esc(g.titel) + '</figcaption></figure>').join('') +
        '</div><div class="modal-fuss"><button class="btn" data-x>Abbrechen</button></div></div>';
      m.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { neu(I.galerie[b.dataset.i].bild); m.remove(); } else if (e.target === m || e.target.closest('[data-x]')) m.remove(); });
      document.body.appendChild(m);
    });
    const weg = el.querySelector('[data-foto-weg]'); if (weg) weg.addEventListener('click', () => neu(''));
  }
  function verschieben(liste, i, richtung) { const j = i + richtung; if (j < 0 || j >= liste.length) return false; [liste[i], liste[j]] = [liste[j], liste[i]]; return true; }

  /* ============================================================ Vorschau */
  const VORSCHAU = { start: 'index.html', hinweis: 'index.html', aktuelles: 'index.html', termine: 'termine.html', zeiten: 'hafen.html', galerie: 'galerie.html', hero: 'index.html', vorstand: 'verein.html#vorstand', zahlen: 'index.html' };
  function vorschauHtml() {
    return '<aside class="vorschau" aria-label="Vorschau"><div class="vorschau-kopf"><span>Live-Vorschau · ' + esc(VORSCHAU[tab].replace(/\.html.*/, '')) + '</span><a href="../' + VORSCHAU[tab] + '" target="_blank" rel="noopener">öffnen ↗</a></div>' +
      '<iframe id="vorschau" src="../' + VORSCHAU[tab] + '" title="Vorschau der Website" loading="lazy"></iframe></aside>';
  }
  function vorschauNeu() { const f = $('#vorschau'); if (f) f.contentWindow.location.reload(); }

  function seite(titel, unter, aktionen, inhalt, mitVorschau = true) {
    const m = $('#main'); m.classList.toggle('ohne-vorschau', !mitVorschau);
    m.innerHTML = '<div class="spalte"><div class="kopf"><div><h1>' + titel + '</h1>' + (unter ? '<p>' + unter + '</p>' : '') + '</div><div class="aktionen">' + (aktionen || '') + '</div></div>' + inhalt + '</div>' + (mitVorschau ? vorschauHtml() : '');
    return m;
  }

  /* ============================================================== Bereiche */
  const T = {};

  T.start = () => {
    const kommend = (I.termine || []).filter((t) => (t.bis || t.datum) >= heuteIso()).length;
    const kachel = (t, titel, text, zahl) => '<button class="kachel" data-gehe="' + t + '">' + (zahl != null ? '<span class="zahl">' + zahl + '</span>' : '') + '<strong>' + titel + '</strong><span>' + text + '</span></button>';
    const m = seite('Moin!', 'Was möchtest du heute auf der Website ändern?', '<a class="btn" href="../index.html" target="_blank" rel="noopener">Website ansehen ↗</a>',
      (SP.modus === 'demo' ? '<p class="hinweis warn"><strong>Demo:</strong> Änderungen siehst nur du in diesem Browser (unten links auf der Website steht dann „Vorschau“). Im Echtbetrieb sind sie sofort für alle sichtbar – ohne Hochladen.</p>' : '') +
      '<div class="raster">' +
      kachel('hinweis', 'Hinweis-Banner', I.hinweis && I.hinweis.aktiv ? 'Wird gerade angezeigt' : 'Aus', null) +
      kachel('aktuelles', 'Aktuelles', 'Meldungen auf der Startseite', (I.aktuelles || []).length) +
      kachel('termine', 'Termine', kommend + ' kommende', (I.termine || []).length) +
      kachel('zeiten', 'Zeiten &amp; Preise', 'Training, Hafen, Messe, Kran', (I.zeiten || []).length) +
      kachel('galerie', 'Fotos', 'Galerie hochladen &amp; sortieren', (I.galerie || []).length) +
      kachel('hero', 'Startbild', 'Großes Foto und Titel', null) +
      kachel('vorstand', 'Vorstand', 'Ämter, Namen, Fotos', (I.vorstand || []).length) +
      kachel('zahlen', 'Zahlen', 'Mitglieder, Boote …', null) + '</div>' +
      (SP.modus === 'demo' ? '<div class="karte" style="margin-top:20px"><h2>Demo zurücksetzen</h2><p class="hinweis">Verwirft alle Änderungen in diesem Browser und stellt die Ausgangsinhalte wieder her.</p><button class="btn gefahr" id="reset">Zurücksetzen</button></div>' : ''), false);
    m.addEventListener('click', (e) => { const g = e.target.closest('[data-gehe]'); if (g) zeige(g.dataset.gehe); });
    const r = $('#reset'); if (r) r.addEventListener('click', async () => { if (!confirm('Alle Demo-Änderungen verwerfen?')) return; await SP.zuruecksetzen(); I = await SP.laden(); toast('Zurückgesetzt.'); zeige('start'); });
  };

  T.hinweis = () => {
    const h = I.hinweis || {};
    seite('Hinweis-Banner', 'Ein auffälliger Hinweis direkt unter dem Startbild – z. B. Kran gesperrt, Treffen verschoben, Arbeitsdienst.', '',
      '<form class="karte" id="f"><label class="feld check"><input type="checkbox" name="aktiv"' + (h.aktiv ? ' checked' : '') + '> Banner anzeigen</label>' +
      '<label class="feld">Text<textarea name="text" rows="3" maxlength="240">' + esc(h.text) + '</textarea><small>Kurz und knapp, höchstens 240 Zeichen.</small></label>' +
      linkFeld('link', h.link) + '<label class="feld">Linktext<input name="link_text" value="' + esc(h.link_text || '') + '" placeholder="Mehr erfahren"></label>' +
      '<div class="modal-fuss"><button class="btn primaer" type="submit">Speichern</button></div></form>');
    const f = $('#f'); linkFeldVerdrahten(f, 'link');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      I.hinweis = { aktiv: f.aktiv.checked, text: f.text.value.trim(), link: linkLesen(f, 'link'), link_text: f.link_text.value.trim() };
      speichern('hinweis', I.hinweis.aktiv ? 'Banner ist an' : 'Banner ist aus');
    });
  };

  T.aktuelles = () => {
    const liste = (I.aktuelles || []).slice().sort((a, b) => (b.angeheftet ? 1 : 0) - (a.angeheftet ? 1 : 0) || b.datum.localeCompare(a.datum));
    const m = seite('Aktuelles', 'Die neuesten drei Meldungen erscheinen auf der Startseite. Angeheftete stehen immer vorn.', '<button class="btn primaer" id="neu">+ Neue Meldung</button>',
      '<div class="karte"><ul class="liste">' + (liste.length ? liste.map((n) =>
        '<li>' + (n.bild ? '<img class="daumen" src="' + esc(bild(n.bild)) + '" alt="">' : '<span class="daumen"></span>') +
        '<div class="text"><strong>' + esc(n.titel) + (n.angeheftet ? '<span class="tag">angeheftet</span>' : '') + '</strong><small>' + datumKurz(n.datum) + '</small></div>' +
        '<div class="knoepfe"><button class="btn klein" data-edit="' + n.id + '">Bearbeiten</button></div></li>').join('') : '<li class="leer">Noch keine Meldungen.</li>') + '</ul></div>');
    $('#neu').addEventListener('click', () => meldungForm({ id: uid(), datum: heuteIso(), titel: '', text: '', bild: '', link: '', link_text: '', angeheftet: false }, true));
    m.addEventListener('click', (e) => { const b = e.target.closest('[data-edit]'); if (b) meldungForm(kopie(I.aktuelles.find((x) => x.id === b.dataset.edit)), false); });
  };
  function meldungForm(n, neu) {
    const el = modal('<h2>' + (neu ? 'Neue Meldung' : 'Meldung bearbeiten') + '</h2><form id="mf">' +
      '<div class="form-2"><label class="feld">Datum<input type="date" name="datum" value="' + esc(n.datum) + '" required></label>' +
      '<label class="feld check" style="margin-top:34px"><input type="checkbox" name="angeheftet"' + (n.angeheftet ? ' checked' : '') + '> Oben anheften</label></div>' +
      '<label class="feld">Überschrift<input name="titel" value="' + esc(n.titel) + '" required maxlength="90"></label>' +
      '<label class="feld">Text<textarea name="text" rows="5" required>' + esc(n.text) + '</textarea><small>Leerzeile = neuer Absatz.</small></label>' +
      bildFeld(n.bild) + linkFeld('link', n.link) + '<label class="feld">Linktext<input name="link_text" value="' + esc(n.link_text || '') + '" placeholder="Mehr erfahren"></label>' +
      '</form><div class="modal-fuss">' + (neu ? '' : '<button class="btn gefahr links" id="weg">Löschen</button>') + '<button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">' + (neu ? 'Veröffentlichen' : 'Speichern') + '</button></div>');
    const f = $('#mf', el); linkFeldVerdrahten(f, 'link'); bildFeldVerdrahten(f, n.bild, (w) => { n.bild = w; });
    $('#ok', el).addEventListener('click', async () => {
      if (!f.reportValidity()) return;
      Object.assign(n, { datum: f.datum.value, titel: f.titel.value.trim(), text: f.text.value.trim(), angeheftet: f.angeheftet.checked, link: linkLesen(f, 'link'), link_text: f.link_text.value.trim() });
      I.aktuelles = (I.aktuelles || []).filter((x) => x.id !== n.id).concat(n);
      if (await speichern('aktuelles', neu ? 'Meldung veröffentlicht' : 'Gespeichert')) { zu(); zeige('aktuelles'); }
    });
    if (!neu) $('#weg', el).addEventListener('click', async () => {
      if (!confirm('Meldung „' + n.titel + '“ löschen?')) return;
      I.aktuelles = I.aktuelles.filter((x) => x.id !== n.id); if (await speichern('aktuelles', 'Gelöscht')) { zu(); zeige('aktuelles'); }
    });
  }

  let alteTermine = false;
  T.termine = () => {
    const alle = (I.termine || []).slice().sort((a, b) => a.datum.localeCompare(b.datum) || String(a.zeit || '').localeCompare(String(b.zeit || '')));
    const heute = heuteIso();
    const sichtbar = alteTermine ? alle : alle.filter((t) => (t.bis || t.datum) >= heute);
    const vorbei = alle.length - alle.filter((t) => (t.bis || t.datum) >= heute).length;
    const m = seite('Termine', 'Erscheinen im Kalender und – die nächsten vier – auf der Startseite.', '<button class="btn primaer" id="neu">+ Neuer Termin</button>',
      '<div class="karte"><label class="feld check" style="margin:0 0 6px"><input type="checkbox" id="alte"' + (alteTermine ? ' checked' : '') + '> Vergangene Termine anzeigen (' + vorbei + ')</label><ul class="liste">' +
      (sichtbar.length ? sichtbar.map((t) => { const d = new Date(t.datum + 'T12:00:00');
        return '<li class="' + ((t.bis || t.datum) < heute ? 'vorbei' : '') + '"><span class="datum-chip"><b>' + d.getDate() + '</b><i>' + MON[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) + '</i></span>' +
          '<div class="text"><strong>' + esc(t.titel) + '</strong><small>' + datumKurz(t.datum) + (t.bis && t.bis !== t.datum ? ' – ' + datumKurz(t.bis) : '') + (t.zeit ? ' · ' + esc(t.zeit) + ' Uhr' : '') + (t.ort ? ' · ' + esc(t.ort) : '') + '</small></div>' +
          '<div class="knoepfe"><button class="btn klein" data-kopie="' + t.id + '" title="Als Vorlage für einen neuen Termin">Kopieren</button><button class="btn klein" data-edit="' + t.id + '">Bearbeiten</button></div></li>'; }).join('')
        : '<li class="leer">Keine kommenden Termine. Lege die Termine fürs nächste Jahr mit „+ Neuer Termin“ an – oder kopiere einen alten als Vorlage.</li>') + '</ul></div>');
    $('#alte').addEventListener('change', (e) => { alteTermine = e.target.checked; zeige('termine'); });
    $('#neu').addEventListener('click', () => terminForm({ id: uid(), datum: heute, bis: '', zeit: '', titel: '', ort: '', text: '' }, true));
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-edit]'); if (b) return terminForm(kopie(I.termine.find((x) => x.id === b.dataset.edit)), false);
      const k = e.target.closest('[data-kopie]');
      if (k) { const t = kopie(I.termine.find((x) => x.id === k.dataset.kopie)); t.id = uid();
        const plusJahr = (iso) => iso ? (Number(iso.slice(0, 4)) + 1) + iso.slice(4) : '';
        t.datum = plusJahr(t.datum); t.bis = plusJahr(t.bis); terminForm(t, true); }
    });
  };
  function terminForm(t, neu) {
    const el = modal('<h2>' + (neu ? 'Neuer Termin' : 'Termin bearbeiten') + '</h2><form id="tf">' +
      '<label class="feld">Was?<input name="titel" value="' + esc(t.titel) + '" required placeholder="z. B. Ansegeln" maxlength="80"></label>' +
      '<div class="form-2"><label class="feld">Datum<input type="date" name="datum" value="' + esc(t.datum) + '" required></label>' +
      '<label class="feld">bis (bei mehreren Tagen)<input type="date" name="bis" value="' + esc(t.bis || '') + '"></label>' +
      '<label class="feld">Uhrzeit<input type="time" name="zeit" value="' + esc(t.zeit || '') + '"></label>' +
      '<label class="feld">Ort (optional)<input name="ort" value="' + esc(t.ort || '') + '" placeholder="z. B. Vereinsheim"></label></div>' +
      '<label class="feld">Notiz (optional)<input name="text" value="' + esc(t.text || '') + '" placeholder="z. B. Anmeldung bis 01.05. beim Segelwart"></label>' +
      '</form><div class="modal-fuss">' + (neu ? '' : '<button class="btn gefahr links" id="weg">Löschen</button>') + '<button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    const f = $('#tf', el);
    $('#ok', el).addEventListener('click', async () => {
      if (!f.reportValidity()) return;
      if (f.bis.value && f.bis.value < f.datum.value) return toast('„bis“ liegt vor dem Startdatum.', 'fehler');
      Object.assign(t, { titel: f.titel.value.trim(), datum: f.datum.value, bis: f.bis.value || '', zeit: f.zeit.value || '', ort: f.ort.value.trim(), text: f.text.value.trim() });
      ['bis', 'zeit', 'ort', 'text'].forEach((k) => { if (!t[k]) delete t[k]; });
      I.termine = (I.termine || []).filter((x) => x.id !== t.id).concat(t);
      if (await speichern('termine', 'Termin gespeichert')) { zu(); zeige('termine'); }
    });
    if (!neu) $('#weg', el).addEventListener('click', async () => {
      if (!confirm('Termin „' + t.titel + '“ löschen?')) return;
      I.termine = I.termine.filter((x) => x.id !== t.id); if (await speichern('termine', 'Gelöscht')) { zu(); zeige('termine'); }
    });
  }

  T.zeiten = () => {
    const m = seite('Zeiten &amp; Preise', 'Öffnungszeiten, Trainingszeiten, Gebühren und Ansprechpartner – als kleine Karten auf Startseite, Jugend- und Hafenseite.', '<button class="btn primaer" id="neu">+ Neue Karte</button>',
      (I.zeiten || []).map((z, i) =>
        '<form class="karte" data-z="' + i + '"><div style="display:flex;gap:8px;align-items:end"><label class="feld" style="flex:1;margin-top:0">Überschrift<input name="titel" value="' + esc(z.titel) + '" required></label>' +
        '<button type="button" class="btn icon" data-hoch title="nach oben">↑</button><button type="button" class="btn icon" data-runter title="nach unten">↓</button></div>' +
        '<div data-zeilen>' + (z.zeilen || []).map((r) => zeile(r)).join('') + '</div>' +
        '<div class="modal-fuss"><button type="button" class="btn klein links" data-zeile-neu>+ Zeile</button><button type="button" class="btn klein gefahr" data-karte-weg>Karte löschen</button><button class="btn primaer" type="submit">Speichern</button></div></form>').join(''));
    function zeile(r) { return '<div class="zeilen-edit"><input name="label" value="' + esc(r.label) + '" placeholder="z. B. Mittwoch" aria-label="Bezeichnung"><input name="wert" value="' + esc(r.wert) + '" placeholder="z. B. 18–22 Uhr" aria-label="Wert"><button type="button" class="btn icon gefahr" data-zeile-weg title="Zeile entfernen">×</button></div>'; }
    $('#neu').addEventListener('click', async () => { (I.zeiten = I.zeiten || []).push({ id: uid(), titel: 'Neue Karte', zeilen: [{ label: 'Bezeichnung', wert: 'Wert' }] }); await speichern('zeiten', 'Karte angelegt'); zeige('zeiten'); });
    m.addEventListener('click', async (e) => {
      const f = e.target.closest('form[data-z]'); if (!f) return; const i = Number(f.dataset.z);
      if (e.target.closest('[data-zeile-neu]')) f.querySelector('[data-zeilen]').insertAdjacentHTML('beforeend', zeile({ label: '', wert: '' }));
      if (e.target.closest('[data-zeile-weg]')) e.target.closest('.zeilen-edit').remove();
      if (e.target.closest('[data-karte-weg]')) { if (!confirm('Karte „' + I.zeiten[i].titel + '“ löschen?')) return; I.zeiten.splice(i, 1); await speichern('zeiten', 'Gelöscht'); zeige('zeiten'); }
      const hoch = e.target.closest('[data-hoch]'), runter = e.target.closest('[data-runter]');
      if ((hoch || runter) && verschieben(I.zeiten, i, hoch ? -1 : 1)) { await speichern('zeiten', 'Reihenfolge gespeichert'); zeige('zeiten'); }
    });
    m.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, i = Number(f.dataset.z);
      I.zeiten[i].titel = f.titel.value.trim();
      I.zeiten[i].zeilen = [...f.querySelectorAll('.zeilen-edit')].map((z) => ({ label: z.children[0].value.trim(), wert: z.children[1].value.trim() })).filter((r) => r.label || r.wert);
      speichern('zeiten');
    });
  };

  T.galerie = () => {
    const g = I.galerie || [];
    const m = seite('Fotos', 'Die ersten sechs erscheinen auf der Startseite, alle in der Galerie. Fotos werden beim Hochladen automatisch verkleinert.', '',
      '<label class="drop" id="drop"><strong>Fotos hochladen</strong><br>antippen oder hierher ziehen – auch mehrere auf einmal</label>' +
      '<div class="galerie-raster" style="margin-top:16px">' + g.map((f, i) =>
        '<figure><img src="' + esc(bild(f.bild)) + '" alt=""><figcaption>' + esc(f.titel || '–') + '</figcaption><div class="knoepfe">' +
        '<button class="btn icon" data-links="' + i + '" title="nach vorn">←</button><button class="btn icon" data-rechts="' + i + '" title="nach hinten">→</button>' +
        '<button class="btn klein" data-edit="' + i + '" style="margin-left:auto">Bearbeiten</button></div></figure>').join('') + '</div>');
    const drop = $('#drop');
    const verarbeiten = async (dateien) => {
      dateien = dateien.filter((d) => d.type.startsWith('image/')); if (!dateien.length) return;
      try { const urls = await hochladen(dateien); I.galerie = urls.map((u) => ({ id: uid(), bild: u, titel: '' })).concat(I.galerie || []);
        await speichern('galerie', urls.length + (urls.length === 1 ? ' Foto' : ' Fotos') + ' hinzugefügt'); zeige('galerie'); }
      catch (e) { toast(e.message, 'fehler'); }
    };
    drop.addEventListener('click', async (e) => { e.preventDefault(); verarbeiten(await fotoAuswaehlen(true)); });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('ueber'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('ueber'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('ueber'); verarbeiten([...e.dataTransfer.files]); });
    m.addEventListener('click', async (e) => {
      const l = e.target.closest('[data-links]'), r = e.target.closest('[data-rechts]');
      if ((l || r) && verschieben(I.galerie, Number((l || r).dataset[l ? 'links' : 'rechts']), l ? -1 : 1)) { await speichern('galerie', 'Reihenfolge gespeichert'); zeige('galerie'); }
      const b = e.target.closest('[data-edit]'); if (!b) return;
      const i = Number(b.dataset.edit), f = I.galerie[i];
      const el = modal('<h2>Foto</h2><img src="' + esc(bild(f.bild)) + '" alt="" style="width:100%;border-radius:12px;margin-top:12px;max-height:50vh;object-fit:contain;background:#f2f2f2">' +
        '<label class="feld">Bildunterschrift<input id="cap" value="' + esc(f.titel) + '" maxlength="90" placeholder="z. B. Absegeln 2026"></label>' +
        '<div class="modal-fuss"><button class="btn gefahr links" id="weg">Löschen</button><button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
      $('#ok', el).addEventListener('click', async () => { f.titel = $('#cap', el).value.trim(); if (await speichern('galerie')) { zu(); zeige('galerie'); } });
      $('#weg', el).addEventListener('click', async () => { if (!confirm('Foto löschen?')) return; I.galerie.splice(i, 1); if (await speichern('galerie', 'Foto gelöscht')) { zu(); zeige('galerie'); } });
    });
  };

  T.hero = () => {
    const h = I.hero || {};
    seite('Startbild', 'Das große Foto ganz oben auf der Startseite – ideal im Querformat, ruhige linke Bildhälfte.', '',
      '<form class="karte" id="f">' + bildFeld(h.bild) +
      '<label class="feld">Kleine Zeile darüber<input name="eyebrow" value="' + esc(h.eyebrow) + '"></label>' +
      '<div class="form-2"><label class="feld">Überschrift<input name="titel" value="' + esc(h.titel) + '" required></label>' +
      '<label class="feld">Letztes Wort (kursiv, rot)<input name="betont" value="' + esc(h.betont) + '"></label></div>' +
      '<label class="feld">Text<textarea name="text" rows="3" maxlength="220">' + esc(h.text) + '</textarea></label>' +
      '<div class="modal-fuss"><button class="btn primaer" type="submit">Speichern</button></div></form>');
    const f = $('#f'); let b = h.bild;
    bildFeldVerdrahten(f, h.bild, (w) => { b = w; });
    f.addEventListener('submit', (e) => {
      e.preventDefault(); if (!b) return toast('Bitte ein Foto wählen.', 'fehler');
      I.hero = { bild: b, eyebrow: f.eyebrow.value.trim(), titel: f.titel.value.trim(), betont: f.betont.value.trim(), text: f.text.value.trim() };
      speichern('hero');
    });
  };

  T.vorstand = () => {
    const v = I.vorstand || [];
    const m = seite('Vorstand', 'Personen erscheinen in der Reihenfolge dieser Liste, gruppiert nach „Gruppe“. Nach der Jahreshauptversammlung einfach anpassen.', '<button class="btn primaer" id="neu">+ Person</button>',
      '<div class="karte"><ul class="liste">' + v.map((p, i) =>
        '<li>' + (p.bild ? '<img class="daumen" src="' + esc(bild(p.bild)) + '" alt="" style="width:44px;height:58px">' : '<span class="daumen" style="width:44px;height:58px"></span>') +
        '<div class="text"><strong>' + esc(p.name) + '</strong><small>' + esc(p.rolle) + ' · ' + esc(p.gruppe) + '</small></div>' +
        '<div class="knoepfe"><button class="btn icon" data-hoch="' + i + '">↑</button><button class="btn icon" data-runter="' + i + '">↓</button><button class="btn klein" data-edit="' + i + '">Bearbeiten</button></div></li>').join('') + '</ul></div>');
    $('#neu').addEventListener('click', () => personForm({ id: uid(), gruppe: v.length ? v[0].gruppe : '', rolle: '', name: '', bild: '', zusatz: '' }, -1));
    m.addEventListener('click', async (e) => {
      const h = e.target.closest('[data-hoch]'), r = e.target.closest('[data-runter]');
      if ((h || r) && verschieben(I.vorstand, Number((h || r).dataset[h ? 'hoch' : 'runter']), h ? -1 : 1)) { await speichern('vorstand', 'Reihenfolge gespeichert'); zeige('vorstand'); }
      const b = e.target.closest('[data-edit]'); if (b) personForm(kopie(I.vorstand[b.dataset.edit]), Number(b.dataset.edit));
    });
  };
  function personForm(p, i) {
    const gruppen = [...new Set((I.vorstand || []).map((x) => x.gruppe))];
    const el = modal('<h2>' + (i < 0 ? 'Neue Person' : esc(p.name)) + '</h2><form id="pf">' +
      '<div class="form-2"><label class="feld">Name<input name="name" value="' + esc(p.name) + '" required></label>' +
      '<label class="feld">Amt / Rolle<input name="rolle" value="' + esc(p.rolle) + '" required placeholder="z. B. Kassenwart"></label></div>' +
      '<label class="feld">Gruppe<input name="gruppe" value="' + esc(p.gruppe) + '" list="gruppen" required><datalist id="gruppen">' + gruppen.map((g) => '<option value="' + esc(g) + '">').join('') + '</datalist></label>' +
      '<label class="feld">Zusatz (optional)<input name="zusatz" value="' + esc(p.zusatz || '') + '" placeholder="z. B. Telefonnummer"></label>' + bildFeld(p.bild) +
      '</form><div class="modal-fuss">' + (i < 0 ? '' : '<button class="btn gefahr links" id="weg">Entfernen</button>') + '<button class="btn" data-zu>Abbrechen</button><button class="btn primaer" id="ok">Speichern</button></div>');
    const f = $('#pf', el); bildFeldVerdrahten(f, p.bild, (w) => { p.bild = w; });
    $('#ok', el).addEventListener('click', async () => {
      if (!f.reportValidity()) return;
      Object.assign(p, { name: f.name.value.trim(), rolle: f.rolle.value.trim(), gruppe: f.gruppe.value.trim(), zusatz: f.zusatz.value.trim() });
      if (i < 0) I.vorstand.push(p); else I.vorstand[i] = p;
      if (await speichern('vorstand')) { zu(); zeige('vorstand'); }
    });
    if (i >= 0) $('#weg', el).addEventListener('click', async () => { if (!confirm(p.name + ' entfernen?')) return; I.vorstand.splice(i, 1); if (await speichern('vorstand', 'Entfernt')) { zu(); zeige('vorstand'); } });
  }

  T.zahlen = () => {
    seite('Zahlen', 'Das dunkle Band mit den großen Zahlen auf der Startseite.', '',
      '<form class="karte" id="f">' + (I.zahlen || []).map((z, i) =>
        '<div class="form-2"><label class="feld">Zahl<input type="number" min="0" name="wert' + i + '" value="' + esc(z.wert) + '" required></label>' +
        '<label class="feld">Beschriftung<input name="label' + i + '" value="' + esc(z.label) + '" required></label></div>').join('') +
      '<div class="modal-fuss"><button class="btn primaer" type="submit">Speichern</button></div></form>');
    $('#f').addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      I.zahlen = I.zahlen.map((z, i) => ({ ...z, wert: Number(f['wert' + i].value), label: f['label' + i].value.trim() }));
      speichern('zahlen');
    });
  };

  /* ============================================================ Navigation */
  function zeige(t) {
    tab = t;
    document.querySelectorAll('#nav [data-tab]').forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === t));
    T[t](); window.scrollTo(0, 0); history.replaceState(null, '', '#' + t);
  }
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) zeige(b.dataset.tab); });
  $('#abmelden').addEventListener('click', async () => { await SP.abmelden(); start(); });
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#login-fehler').textContent = '';
    try { await SP.anmelden($('#login-email').value, $('#login-pw').value); start(); } catch (err) { $('#login-fehler').textContent = err.message; }
  });

  async function start() {
    const ok = await SP.angemeldet();
    $('#login').hidden = ok; $('#app').hidden = !ok;
    if (!ok) { if (SP.modus === 'demo') { $('#login-demo').hidden = false; $('#login-email').value = 'redaktion@demo'; $('#login-pw').value = 'demo'; } return; }
    try { I = await SP.laden(); } catch (e) { toast(e.message, 'fehler'); I = kopie(STD); }
    const t = location.hash.slice(1); zeige(T[t] ? t : 'start');
  }
  start();
})();
