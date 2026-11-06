/* Neon-Baukasten v1 · Engine
   Vanilla, ohne Abhängigkeiten. Animiert nur transform, opacity, filter und
   clip-path. Respektiert prefers-reduced-motion und Save-Data.
   Bausteine: Einschalt-Intro, Reveals, Zeichen-Neon, Event-Liste nach Datum,
   Countdown, Marquee, Spotlight, Magnet-Buttons, Lazy-Video, Menü, Header. */
(function () {
  'use strict';
  var d = document, de = d.documentElement, w = window;
  var RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CN = navigator.connection || {};
  var LOW = !!CN.saveData || /(^|-)2g$/.test(CN.effectiveType || '');
  var FINE = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  de.classList.add('js');
  if (RM) de.classList.add('rm');

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Einschalt-Intro: Leuchtschrift flackert an ---------- */
  function intro(done) {
    var el = $('.boot');
    if (!el || RM || store('nm-seen')) { if (el) el.remove(); de.classList.add('lit'); return done(); }
    store('nm-seen', '1');
    var fin = false;
    function end() {
      if (fin) return; fin = true;
      de.classList.add('lit'); el.classList.add('off');
      setTimeout(function () { el.remove(); }, 700);
      done();
    }
    requestAnimationFrame(function () { el.classList.add('on'); });
    setTimeout(end, 1500);
    el.addEventListener('click', end);
  }

  /* ---------- Zeichen aufteilen (Neon schaltet Buchstabe für Buchstabe) ---------- */
  function split(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
            var word = d.createElement('span'); word.className = 'w';
            Array.prototype.forEach.call(part, function (ch) {
              var c = d.createElement('span'); c.className = 'c'; c.textContent = ch;
              c.style.setProperty('--i', i++);
              word.appendChild(c);
            });
            frag.appendChild(word);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    $$('.c', el).forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
  }

  /* ---------- Reveals ---------- */
  function reveals() {
    $$('.neon-split').forEach(split);
    var els = $$('.rv,.neon-split,.rv-img');
    if (RM || !('IntersectionObserver' in w)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Events nach Datum sortieren: Kommendes oben, Vergangenes ins Archiv ---------- */
  function events() {
    var now = Date.now();
    $$('[data-events]').forEach(function (list) {
      var cards = $$('[data-end]', list);
      var archive = list.dataset.archive ? $(list.dataset.archive) : null;
      var upcoming = 0;
      cards.forEach(function (c) {
        var past = new Date(c.dataset.end).getTime() < now;
        c.classList.toggle('is-past', past);
        if (past && archive) archive.appendChild(c);
        if (!past) upcoming++;
      });
      var empty = list.dataset.empty ? $(list.dataset.empty) : null;
      if (empty) empty.hidden = upcoming > 0;
      if (archive) {
        var box = archive.closest('[data-archive-box]');
        if (box) box.hidden = !archive.children.length;
        // Archiv: neueste zuerst
        $$('[data-end]', archive).sort(function (a, b) { return new Date(b.dataset.end) - new Date(a.dataset.end); })
          .forEach(function (c) { archive.appendChild(c); });
      }
      list.classList.add('sorted');
    });
    // Nächstes Event in Teaser-Slots (z. B. Startseite) einsetzen
    $$('[data-next]').forEach(function (slot) {
      var src = $$('[data-pool] [data-end]').filter(function (c) { return new Date(c.dataset.end).getTime() >= now; })
        .sort(function (a, b) { return new Date(a.dataset.start) - new Date(b.dataset.start); });
      var empty = $('[data-next-empty]', slot.parentNode);
      if (!src.length) { slot.hidden = true; if (empty) empty.hidden = false; return; }
      slot.hidden = false; if (empty) empty.hidden = true;
      $$('[data-fill]', slot).forEach(function (f) {
        var v = src[0].dataset[f.dataset.fill];
        if (f.tagName === 'A') f.href = v; else f.textContent = v;
      });
      var cd = $('[data-countdown]', slot); if (cd) cd.dataset.countdown = src[0].dataset.start;
    });
  }

  /* ---------- Countdown ---------- */
  function countdowns() {
    var els = $$('[data-countdown]');
    if (!els.length) return;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var now = Date.now();
      els.forEach(function (el) {
        var t = new Date(el.dataset.countdown).getTime() - now;
        if (!(t > 0)) { el.hidden = true; return; }
        var s = Math.floor(t / 1000), dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
        var parts = { d: dd, h: pad(hh), m: pad(mm), s: pad(ss) };
        $$('[data-u]', el).forEach(function (u) { u.textContent = parts[u.dataset.u]; });
        el.hidden = false;
      });
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---------- Marquee: Inhalt doppeln, damit die Schleife nahtlos läuft ---------- */
  function marquees() {
    $$('.mq').forEach(function (m) {
      var t = $('.mq-track', m); if (!t || t.dataset.dup) return;
      t.dataset.dup = '1';
      var clone = t.innerHTML;
      t.insertAdjacentHTML('beforeend', clone);
      $$(':scope > *', t).slice(t.children.length / 2).forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
    });
  }

  /* ---------- Spotlight und Magnet-Buttons (nur Maus) ---------- */
  function pointer() {
    if (!FINE || RM) return;
    var raf = 0, x = 0, y = 0;
    d.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        de.style.setProperty('--mx', x + 'px'); de.style.setProperty('--my', y + 'px');
      });
    }, { passive: true });
    $$('.mag').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
    $$('.glow-card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--gx', (e.clientX - r.left) + 'px'); c.style.setProperty('--gy', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Videos: erst laden, wenn sichtbar; pausieren, wenn außer Sicht ---------- */
  function videos() {
    var vids = $$('video[data-src]');
    if (!vids.length) return;
    function load(v) {
      if (v.dataset.loaded) return; v.dataset.loaded = '1';
      $$('source[data-src]', v).forEach(function (s) { s.src = s.dataset.src; });
      if (v.dataset.src && !v.querySelector('source')) v.src = v.dataset.src;
      v.load();
    }
    if (LOW || RM) { vids.forEach(function (v) { v.removeAttribute('autoplay'); v.closest('.vid') && v.closest('.vid').classList.add('still'); }); return; }
    if (!('IntersectionObserver' in w)) { vids.forEach(function (v) { load(v); v.play().catch(function () {}); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { load(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) {
      v.muted = true; v.playsInline = true;
      v.addEventListener('playing', function () { v.closest('.vid') && v.closest('.vid').classList.add('playing'); });
      io.observe(v);
    });
  }

  /* ---------- Header, Menü, Fortschritt ---------- */
  function chrome() {
    var hd = $('.hd'), last = 0, menu = $('.menu'), btn = $('.menu-btn');
    function onScroll() {
      var y = w.scrollY;
      if (hd) { hd.classList.toggle('scrolled', y > 40); hd.classList.toggle('hide', y > last && y > 400 && !de.classList.contains('menu-open')); }
      last = y;
      var h = de.scrollHeight - w.innerHeight;
      de.style.setProperty('--prog', h > 0 ? (y / h).toFixed(4) : 0);
    }
    w.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (btn && menu) {
      function set(open) {
        de.classList.toggle('menu-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.hidden = !open;
        if (open) { var f = $('a', menu); f && f.focus(); } else btn.focus();
      }
      btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && de.classList.contains('menu-open')) set(false); });
      $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { de.classList.remove('menu-open'); }); });
    }
    // Jahr im Footer
    $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
  }

  /* ---------- FAQ: nur eine offen ---------- */
  function faq() {
    $$('.faq details').forEach(function (dt) {
      dt.addEventListener('toggle', function () {
        if (!dt.open) return;
        $$('details', dt.closest('.faq')).forEach(function (o) { if (o !== dt) o.open = false; });
      });
    });
  }

  /* ---------- Galerie: Lightbox mit Tastatur ---------- */
  function lightbox() {
    var items = $$('[data-lb]');
    if (!items.length) return;
    var box = d.createElement('div');
    box.className = 'lb'; box.hidden = true;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Bildansicht');
    box.innerHTML = '<button class="lb-x" aria-label="Schließen">×</button><button class="lb-p" aria-label="Vorheriges Bild">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-n" aria-label="Nächstes Bild">›</button>';
    d.body.appendChild(box);
    var img = $('img', box), cap = $('figcaption', box), cur = 0, opener = null;
    function show(i) {
      cur = (i + items.length) % items.length;
      var a = items[cur]; img.src = a.getAttribute('href'); img.alt = a.dataset.alt || ''; cap.textContent = a.dataset.cap || '';
    }
    function close() { box.hidden = true; de.classList.remove('lb-open'); opener && opener.focus(); }
    items.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); opener = a; show(i); box.hidden = false; de.classList.add('lb-open'); $('.lb-x', box).focus(); });
    });
    $('.lb-x', box).addEventListener('click', close);
    $('.lb-p', box).addEventListener('click', function () { show(cur - 1); });
    $('.lb-n', box).addEventListener('click', function () { show(cur + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    d.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1);
    });
  }

  /* ---------- Bewegung pausieren (WCAG 2.2.2) ---------- */
  function pauseCtl() {
    var b = $('.pause-btn'); if (!b) return;
    function set(p) {
      de.classList.toggle('paused', p); b.setAttribute('aria-pressed', p ? 'true' : 'false');
      $$('video').forEach(function (v) { if (p) v.pause(); else if (v.dataset.loaded && !LOW) { var r = v.getBoundingClientRect(); if (r.bottom > 0 && r.top < w.innerHeight) v.play().catch(function () {}); } });
      store('nm-paused', p ? '1' : '0');
    }
    b.addEventListener('click', function () { set(!de.classList.contains('paused')); });
    if (store('nm-paused') === '1') set(true);
  }

  function boot() {
    chrome(); events(); countdowns(); marquees(); faq(); lightbox(); pauseCtl();
    intro(function () { reveals(); pointer(); videos(); });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
