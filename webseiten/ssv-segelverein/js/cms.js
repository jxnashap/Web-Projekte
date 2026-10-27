/* Schwartauer Segler-Verein · Redaktionsinhalte
 *
 * Alle Bereiche mit data-cms="…" werden aus den Vereinsinhalten befüllt:
 * Hinweis-Banner, Hero, Aktuelles, Termine, Zeiten & Preise, Zahlen,
 * Galerie, Vorstand. Die Redaktion pflegt sie unter /verwaltung/.
 * Die Renderer sind reine Funktionen (Daten → HTML) und werden auch von
 * der Verwaltung für die Vorschau genutzt.
 */
(function () {
  'use strict';

  const K = window.SSV_WEB_KONFIG || { modus: 'demo' };
  const DEMO_KEY = 'ssv-web-demo-v1';
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const MON_K = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const absaetze = (t) => esc(t).split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
  const d = (iso) => new Date(iso + 'T12:00:00');
  const heute = () => { const x = new Date(); x.setHours(0, 0, 0, 0); return x; };
  const datumLang = (iso) => d(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const zahlDe = (n) => Number(n).toLocaleString('de-DE');
  let BASIS = '';
  const bild = (b) => !b ? '' : /^(https?:|data:|blob:)/.test(b) ? b : BASIS + b;
  const sicherLink = (l) => /^(https?:\/\/|mailto:|tel:|[a-z0-9-]+\.html|#|dokumente\/)/i.test(l || '') ? l : '';

  function termineSortiert(t) { return (t || []).slice().sort((a, b) => a.datum.localeCompare(b.datum) || String(a.zeit || '').localeCompare(String(b.zeit || ''))); }
  function terminVorbei(t) { return d(t.bis || t.datum) < heute(); }
  function datumsSpanne(t) {
    if (!t.bis || t.bis === t.datum) return d(t.datum).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return d(t.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '–' + d(t.bis).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  /* ------------------------------------------------------------ Renderer */
  const R = {
    hinweis(I) {
      const h = I.hinweis || {};
      if (!h.aktiv || !h.text) return '';
      const l = sicherLink(h.link);
      return '<div class="cms-hinweis" role="status"><span class="cms-hinweis-punkt" aria-hidden="true"></span><p>' + esc(h.text) +
        (l ? ' <a href="' + esc(l) + '">' + esc(h.link_text || 'Mehr erfahren') + ' →</a>' : '') + '</p></div>';
    },

    'hero-bild'(I) { return I.hero && I.hero.bild ? '<img src="' + esc(bild(I.hero.bild)) + '" alt="">' : ''; },
    'hero-text'(I) {
      const h = I.hero || {};
      return '<p class="eyebrow">' + esc(h.eyebrow) + '</p><h1>' + esc(h.titel) + (h.betont ? ' <em>' + esc(h.betont) + '</em>' : '') + '</h1>' +
        (h.text ? '<p class="hero-sub">' + esc(h.text) + '</p>' : '');
    },

    aktuelles(I, opt = {}) {
      let liste = (I.aktuelles || []).slice().sort((a, b) => (b.angeheftet ? 1 : 0) - (a.angeheftet ? 1 : 0) || b.datum.localeCompare(a.datum));
      if (opt.limit) liste = liste.slice(0, Number(opt.limit));
      if (!liste.length) return '<p class="cms-leer">Gerade gibt es keine neuen Meldungen.</p>';
      return '<div class="cms-news">' + liste.map((n) => {
        const l = sicherLink(n.link);
        return '<article class="cms-news-karte' + (n.bild ? '' : ' ohne-bild') + '">' +
          (n.bild ? '<div class="cms-news-bild"><img src="' + esc(bild(n.bild)) + '" alt="" loading="lazy"></div>' : '') +
          '<div class="cms-news-text"><p class="cms-news-meta">' + (n.angeheftet ? '<span class="cms-pin">Wichtig</span>' : '') + '<time datetime="' + esc(n.datum) + '">' + esc(datumLang(n.datum)) + '</time></p>' +
          '<h3>' + esc(n.titel) + '</h3>' + absaetze(n.text) +
          (l ? '<p><a class="link-gold" href="' + esc(l) + '">' + esc(n.link_text || 'Mehr erfahren') + '</a></p>' : '') +
          '</div></article>';
      }).join('') + '</div>';
    },

    'termine-naechste'(I, opt = {}) {
      const n = termineSortiert(I.termine).filter((t) => !terminVorbei(t)).slice(0, Number(opt.limit || 4));
      if (!n.length) {
        const zuletzt = termineSortiert(I.termine).filter(terminVorbei).slice(-2).reverse();
        return '<p class="cms-leer">Die nächsten Termine trägt der Vorstand nach der Jahresplanung hier ein.</p>' +
          (zuletzt.length ? '<p class="cms-zuletzt">Zuletzt</p><ol class="cms-termine kompakt">' + zuletzt.map(terminZeile).join('') + '</ol>' : '');
      }
      return '<ol class="cms-termine kompakt">' + n.map(terminZeile).join('') + '</ol>';
    },

    termine(I) {
      const alle = termineSortiert(I.termine);
      if (!alle.length) return '<p class="cms-leer">Noch keine Termine eingetragen.</p>';
      const jahre = new Map();
      alle.forEach((t) => { const j = t.datum.slice(0, 4); if (!jahre.has(j)) jahre.set(j, []); jahre.get(j).push(t); });
      return [...jahre.entries()].map(([j, ts]) => {
        const monate = new Map();
        ts.forEach((t) => { const m = Number(t.datum.slice(5, 7)) - 1; if (!monate.has(m)) monate.set(m, []); monate.get(m).push(t); });
        return '<section class="cms-jahr"><h2 class="cms-jahr-titel">' + j + '</h2>' + [...monate.entries()].map(([m, mt]) =>
          '<div class="cms-monat"><h3>' + MONATE[m] + '</h3><ol class="cms-termine">' + mt.map(terminZeile).join('') + '</ol></div>').join('') + '</section>';
      }).join('');
    },

    zeiten(I, opt = {}) {
      let liste = I.zeiten || [];
      if (opt.id) { const ids = opt.id.split(','); liste = ids.map((id) => liste.find((z) => z.id === id)).filter(Boolean); }
      if (opt.limit) liste = liste.slice(0, Number(opt.limit));
      return '<div class="cms-zeiten">' + liste.map((z) =>
        '<div class="cms-zeit-karte"><h3>' + esc(z.titel) + '</h3><dl>' + (z.zeilen || []).map((r) =>
          '<div><dt>' + esc(r.label) + '</dt><dd>' + esc(r.wert) + '</dd></div>').join('') + '</dl></div>').join('') + '</div>';
    },

    zahlen(I) {
      return '<div class="cms-zahlen">' + (I.zahlen || []).map((z) =>
        '<div class="cms-zahl"><strong data-zaehlen="' + Number(z.wert) + '">' + zahlDe(z.wert) + '</strong>' + (z.suffix ? '<span class="cms-suffix">' + esc(z.suffix) + '</span>' : '') +
        '<span>' + esc(z.label) + '</span></div>').join('') + '</div>';
    },

    galerie(I, opt = {}) {
      let g = I.galerie || [];
      if (opt.limit) g = g.slice(0, Number(opt.limit));
      if (!g.length) return '<p class="cms-leer">Noch keine Fotos.</p>';
      return '<div class="cms-galerie' + (opt.limit ? ' teaser' : '') + '">' + g.map((f, i) =>
        '<figure><button type="button" class="cms-foto" data-lightbox="' + i + '" aria-label="Foto vergrößern: ' + esc(f.titel) + '">' +
        '<img src="' + esc(bild(f.bild)) + '" alt="' + esc(f.titel) + '" loading="lazy"></button>' +
        (f.titel ? '<figcaption>' + esc(f.titel) + '</figcaption>' : '') + '</figure>').join('') + '</div>';
    },

    vorstand(I) {
      const gruppen = new Map();
      (I.vorstand || []).forEach((v) => { if (!gruppen.has(v.gruppe)) gruppen.set(v.gruppe, []); gruppen.get(v.gruppe).push(v); });
      return [...gruppen.entries()].map(([g, ps]) =>
        '<div class="cms-vorstand-gruppe"><h3 class="eyebrow">' + esc(g) + '</h3><div class="cms-vorstand">' + ps.map((p) =>
          '<div class="cms-person' + (p.bild ? '' : ' ohne-bild') + '">' + (p.bild ? '<div class="cms-person-bild"><img src="' + esc(bild(p.bild)) + '" alt="' + esc(p.name) + '" loading="lazy"></div>' : '') +
          '<p class="cms-rolle">' + esc(p.rolle) + '</p><p class="cms-name">' + esc(p.name) + '</p>' + (p.zusatz ? '<p class="cms-zusatz">' + esc(p.zusatz) + '</p>' : '') + '</div>').join('') +
        '</div></div>').join('');
    }
  };

  function terminZeile(t) {
    const tag = d(t.datum);
    return '<li class="cms-termin' + (terminVorbei(t) ? ' vorbei' : '') + '"><div class="cms-datum"><strong>' + tag.getDate() + '</strong><span>' + MON_K[tag.getMonth()] + '</span></div>' +
      '<div class="cms-termin-text"><h4>' + esc(t.titel) + '</h4><p>' + esc(datumsSpanne(t)) + (t.zeit ? ' · ' + esc(t.zeit) + ' Uhr' : '') + (t.ort ? ' · ' + esc(t.ort) : '') + '</p>' +
      (t.text ? '<p class="cms-termin-notiz">' + esc(t.text) + '</p>' : '') + '</div></li>';
  }

  /* ---------------------------------------------------------------- Laden */
  async function laden() {
    const std = window.SSV_INHALTE_STANDARD;
    if (K.modus === 'supabase' && K.supabaseUrl) {
      const r = await fetch(K.supabaseUrl.replace(/\/$/, '') + '/rest/v1/website_inhalte?select=schluessel,daten', {
        headers: { apikey: K.supabaseAnonKey, Authorization: 'Bearer ' + K.supabaseAnonKey }
      });
      if (!r.ok) throw new Error('Inhalte nicht erreichbar');
      const live = {}; (await r.json()).forEach((z) => { live[z.schluessel] = z.daten; });
      return { ...std, ...live };
    }
    try { const lokal = JSON.parse(localStorage.getItem(DEMO_KEY)); if (lokal && lokal.version) return { ...std, ...lokal, _lokal: true }; } catch (e) { /* Standard */ }
    return std;
  }

  function anwenden(I, wurzel = document) {
    wurzel.querySelectorAll('[data-cms]').forEach((el) => {
      const f = R[el.dataset.cms]; if (!f) return;
      el.innerHTML = f(I, el.dataset);
      el.classList.toggle('cms-leer-slot', !el.innerHTML.trim());
    });
    zaehlen(wurzel);
  }

  /* Zahlen zählen hoch, sobald sie sichtbar werden */
  function zaehlen(wurzel) {
    const els = wurzel.querySelectorAll('[data-zaehlen]');
    if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, ziel = Number(el.dataset.zaehlen), t0 = performance.now(), dauer = 1600;
      const schritt = (t) => { const p = Math.min(1, (t - t0) / dauer), w = 1 - Math.pow(1 - p, 3);
        el.textContent = zahlDe(Math.round(ziel * w)); if (p < 1) requestAnimationFrame(schritt); };
      requestAnimationFrame(schritt);
    }), { threshold: 0.4 });
    els.forEach((el) => { el.textContent = '0'; io.observe(el); });
  }

  /* Lightbox für die Galerie */
  let aktuelleInhalte = null;
  function lightbox(index) {
    const g = (aktuelleInhalte.galerie || []); let i = index;
    const box = document.createElement('div'); box.className = 'cms-lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    const zeigen = () => { const f = g[i]; box.innerHTML = '<figure><img src="' + esc(bild(f.bild)) + '" alt="' + esc(f.titel) + '"><figcaption>' + esc(f.titel || '') + ' <span>' + (i + 1) + ' / ' + g.length + '</span></figcaption></figure>' +
      '<button class="lb-zu" aria-label="Schließen">×</button><button class="lb-vor" aria-label="Vorheriges Foto">‹</button><button class="lb-nach" aria-label="Nächstes Foto">›</button>'; };
    const zu = () => { box.remove(); document.removeEventListener('keydown', taste); };
    const taste = (e) => { if (e.key === 'Escape') zu(); if (e.key === 'ArrowRight') { i = (i + 1) % g.length; zeigen(); } if (e.key === 'ArrowLeft') { i = (i - 1 + g.length) % g.length; zeigen(); } };
    box.addEventListener('click', (e) => {
      if (e.target.closest('.lb-vor')) { i = (i - 1 + g.length) % g.length; zeigen(); }
      else if (e.target.closest('.lb-nach')) { i = (i + 1) % g.length; zeigen(); }
      else if (e.target.closest('.lb-zu') || e.target === box) zu();
    });
    document.addEventListener('keydown', taste);
    zeigen(); document.body.appendChild(box); box.querySelector('.lb-zu').focus();
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-lightbox]'); if (b && aktuelleInhalte) lightbox(Number(b.dataset.lightbox)); });

  window.SSV_CMS = {
    R, laden, anwenden, DEMO_KEY,
    setzeBasis(b) { BASIS = b; },
    async start() {
      aktuelleInhalte = window.SSV_INHALTE_STANDARD; anwenden(aktuelleInhalte);
      try {
        const I = await laden();
        if (I !== aktuelleInhalte) { aktuelleInhalte = I; anwenden(I); }
        if (I._lokal) document.documentElement.classList.add('cms-vorschau');
      } catch (e) { /* Standardinhalte bleiben stehen */ }
    }
  };
  if (!window.SSV_CMS_KEIN_AUTOSTART) window.SSV_CMS.start();
})();
