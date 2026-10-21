/* ============================================================
   DREHBUCH-BAUKASTEN · Script (Vanilla, ohne Abhängigkeiten)
   Engine aus premium-estate v2 (Lerp-Loop, Masken, Reveals,
   Scrub) plus Drehbuch-Module:
   · Klappe als Preloader (nur Startseite), Seitenvorhang
   · HUD: Timecode läuft mit dem Scrollen, Szene folgt Sektion
   · Wort-Aufhellung [data-say], Skript-Kapitel [data-scrub]
   · Videos: erst nach dem Laden, Datensparmodus, AV1/H.264,
     Live-Timecode im Handy-Rahmen, Ton-Schalter mit Untertiteln
   · Bewegung anhalten (.motion-btn), Referenz-Filter, Mobil-Leiste
   · Anfrage-Quiz: Fokusführung, Fehlertexte, Vorauswahl per URL
   Natives Scrollen bleibt immer nativ.
   ============================================================ */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var prm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var FPS = 25;

  function tc(sec) {
    sec = Math.max(0, sec);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60),
        f = Math.floor((sec % 1) * FPS);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(h) + ':' + p(m) + ':' + p(s) + ':' + p(f);
  }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Bewegung anhalten (WCAG 2.2.2) ---------- */
  var still = store('db-still') === '1';
  if (still) doc.classList.add('still');
  function setStill(on) {
    still = on; doc.classList.toggle('still', on);
    document.querySelectorAll('video[data-auto]').forEach(function (v) {
      if (on) v.pause();
      else { var r = v.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) play(v); }
    });
    document.querySelectorAll('.motion-btn').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    store('db-still', on ? '1' : '0');
  }
  document.querySelectorAll('.motion-btn').forEach(function (b) {
    b.setAttribute('aria-pressed', still ? 'true' : 'false');
    b.addEventListener('click', function () { setStill(!still); });
  });

  /* ---------- Klappe (Preloader) & Ankunft ---------- */
  var pre = document.querySelector('.klappe');
  function arrive() {
    if (document.body.classList.contains('loaded')) return;
    document.body.classList.add('loaded');
    window.dispatchEvent(new Event('db:arrived'));
  }
  if (pre && !prm && !still && store('db-seen') !== '1') {
    requestAnimationFrame(function () { pre.classList.add('go'); });
    setTimeout(function () {
      pre.classList.add('lift'); arrive(); store('db-seen', '1');
      setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 950);
    }, 700);
  } else {
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    (document.readyState !== 'loading') ? arrive() : document.addEventListener('DOMContentLoaded', arrive);
    setTimeout(arrive, 300);
  }

  /* ---------- Seitenvorhang (nicht auf dem Weg zur Anfrage) ---------- */
  var curtain = document.querySelector('.curtain');
  if (curtain && !prm) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || e.defaultPrevented || still) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || href.charAt(0) === '#' || a.hasAttribute('download') ||
          /^(https?:|mailto:|tel:|whatsapp:)/.test(href) || href.indexOf('/anfrage') === 0 ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (href.split('#')[0] === location.pathname) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(function () { window.location.href = href; }, 250);
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) document.body.classList.remove('leaving'); });
  }

  /* ---------- Overlay-Menü mit inert ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var overlay = document.querySelector('.nav-overlay');
  if (menuBtn && overlay) {
    var navLinks = overlay.querySelectorAll('.nav-list a');
    navLinks.forEach(function (a, i) { a.style.transitionDelay = (0.08 + i * 0.04) + 's'; });
    menuBtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.querySelector('.mb-txt').textContent = open ? 'Schließen' : 'Menü';
      document.querySelectorAll('.skip,main,footer,.mbar,.mainnav,.hud').forEach(function (n) { n.inert = open; });
      if (open) setTimeout(function () { if (navLinks[0]) navLinks[0].focus(); }, 350);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { menuBtn.click(); menuBtn.focus(); }
    });
  }

  /* ---------- Splitting: Wörter & Zeichen, lesbar für Screenreader ---------- */
  /* Wörter an Bindestrich und weicher Trennstelle (&shy;) teilen, damit lange Wörter dort umbrechen
     statt mitten im Wort. Der Trennstrich einer weichen Stelle erscheint nur, wenn dort wirklich umbrochen wird. */
  var shys = [];
  function segs(word) {
    var out = [], cur = '';
    Array.from(word).forEach(function (ch, i, all) {
      if (ch === '\u00AD') { if (cur) out.push({ t: cur, shy: true }); cur = ''; }
      else if (ch === '-' && cur && i < all.length - 1) { out.push({ t: cur + '-' }); cur = ''; }
      else cur += ch;
    });
    if (cur) out.push({ t: cur });
    return out;
  }
  function fixHy() {
    shys.forEach(function (h) { h.classList.remove('on'); });
    shys.forEach(function (h) {
      var w = h.closest('.w'), nx = w && w.nextElementSibling;
      if (nx && nx.classList.contains('w') && nx.offsetTop > w.offsetTop + 2) h.classList.add('on');
    });
  }
  function splitEl(el, mode) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    var label = nodes.map(function (n) { return n.nodeName === 'BR' ? ' ' : n.textContent; }).join('').replace(/\s+/g, ' ').trim();
    var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    nodes.forEach(function (n) {
      var isEl = n.nodeType === 1;
      if (isEl && n.tagName === 'BR') { vis.appendChild(n); return; }
      var keep = isEl ? n : null;
      n.textContent.split(/(\s+)/).forEach(function (word) {
        if (!word) return;
        if (/^\s+$/.test(word)) { vis.appendChild(document.createTextNode(' ')); return; }
        segs(word).forEach(function (seg) {
          var w = document.createElement('span'); w.className = 'w';
          var hy = null;
          if (seg.shy) { hy = document.createElement('span'); hy.setAttribute('data-c', '-'); shys.push(hy); }
          if (mode === 'chars') {
            Array.from(seg.t).forEach(function (ch) {
              var c = document.createElement('span'); c.className = 'c';
              if (keep) { var k = keep.cloneNode(false); k.setAttribute('data-c', ch); c.appendChild(k); } else c.setAttribute('data-c', ch);
              w.appendChild(c);
            });
            if (hy) { hy.className = 'c hy'; w.appendChild(hy); }
          } else {
            var inner = document.createElement('span');
            if (keep) { var k2 = keep.cloneNode(false); k2.setAttribute('data-c', seg.t); inner.appendChild(k2); } else inner.setAttribute('data-c', seg.t);
            if (hy) { hy.className = 'hy'; inner.appendChild(hy); }
            w.appendChild(inner);
          }
          vis.appendChild(w);
        });
      });
    });
    el.textContent = '';
    var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = label;
    el.appendChild(sr); el.appendChild(vis);
    var units = vis.querySelectorAll(mode === 'chars' ? '.c' : '.w>span');
    var step = mode === 'chars' ? 0.018 : 0.05;
    units.forEach(function (s, i) { s.style.transitionDelay = (i * step).toFixed(3) + 's'; });
  }
  if (!prm) document.querySelectorAll('.split').forEach(function (el) {
    splitEl(el, el.getAttribute('data-split') === 'chars' ? 'chars' : 'words');
  });
  if (shys.length) {
    fixHy();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fixHy);
    var hyT; window.addEventListener('resize', function () { clearTimeout(hyT); hyT = setTimeout(fixHy, 150); });
  }

  /* ---------- Wort-Aufhellung [data-say] vorbereiten ---------- */
  var sayEls = [];
  if (!prm) document.querySelectorAll('[data-say]').forEach(function (el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (n) {
      var isEl = n.nodeType === 1;
      if (isEl && n.tagName === 'BR') { el.appendChild(n); return; }
      n.textContent.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(' ')); return; }
        var s = document.createElement('span'); s.className = 'sw';
        if (isEl) { var k = n.cloneNode(false); k.textContent = w; s.appendChild(k); } else s.textContent = w;
        el.appendChild(s);
      });
    });
    sayEls.push({ el: el, words: el.querySelectorAll('.sw') });
  });

  /* ---------- Reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      if (en.target.hasAttribute('data-count')) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -4% 0px' });
  document.querySelectorAll('.rv,.rv-img,.rv-focus,.line-h,.split,.dp-row,[data-count]')
    .forEach(function (el) { io.observe(el); });
  window.addEventListener('db:arrived', function () {
    document.querySelectorAll('.hero .split,.hero .rv,.hero .rv-focus,.page-head .split,.page-head .rv,.page-head .rv-focus')
      .forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('in'); io.unobserve(el); }
      });
  });

  function countUp(el) {
    var raw = el.getAttribute('data-count'), target = parseFloat(raw);
    var suf = el.getAttribute('data-suffix') || '', dur = 1300, t0 = null;
    if (prm || still) { el.textContent = Math.round(target).toLocaleString('de-DE') + suf; return; }
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e).toLocaleString('de-DE') + suf;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============================================================
     LERP-ENGINE · ein rAF-Loop für alles Geglättete
     ============================================================ */
  var L = { items: [], running: false };
  function lerpItem(get, apply, s) { var it = { get: get, apply: apply, s: s || 0.12, v: null }; L.items.push(it); return it; }
  function wake() { if (!L.running) { L.running = true; requestAnimationFrame(loop); } }
  function loop() {
    var busy = false;
    for (var i = 0; i < L.items.length; i++) {
      var it = L.items[i], target = it.get();
      if (target === null) continue;
      if (it.v === null) it.v = target;
      var d = target - it.v;
      if (Math.abs(d) > 0.0006) { it.v += d * it.s; busy = true; } else it.v = target;
      it.apply(it.v);
    }
    if (busy) requestAnimationFrame(loop); else L.running = false;
  }
  ['scroll', 'resize'].forEach(function (ev) { window.addEventListener(ev, wake, { passive: true }); });

  /* Header-Zustand, „nach dem Hero" */
  var header = document.querySelector('.site-header'), lastScrolled = null;
  var heroEl = document.querySelector('.hero,.page-head'), lastPast = null;
  lerpItem(function () { return window.scrollY > 30 ? 1 : 0; }, function (v) {
    var s = v > 0.5;
    if (s !== lastScrolled && header) { header.classList.toggle('scrolled', s); lastScrolled = s; }
    var past = !heroEl || heroEl.getBoundingClientRect().bottom < window.innerHeight * 0.5;
    if (past !== lastPast) { document.body.classList.toggle('past-hero', past); lastPast = past; }
  }, 1);

  /* Parallax */
  if (!prm) document.querySelectorAll('[data-plx]').forEach(function (el) {
    var f = parseFloat(el.getAttribute('data-plx')) || 0.12;
    el.classList.add('plx');
    lerpItem(function () {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) return null;
      return (r.top + r.height / 2 - vh / 2) / vh;
    }, function (v) {
      el.style.transform = still ? '' : 'translate3d(0,' + (-v * f * 100).toFixed(2) + 'px,0)';
    }, 0.14);
  });

  /* Skript-Kapitel & Scrub: --p 0…1, Stationen und Beats */
  document.querySelectorAll('[data-scrub]').forEach(function (sec) {
    var steps = sec.querySelectorAll('.scrub-step');
    var beats = sec.querySelectorAll('.beat');
    function progress() {
      var r = sec.getBoundingClientRect(), span = r.height - window.innerHeight;
      if (span <= 0) return null;
      return Math.min(1, Math.max(0, -r.top / span));
    }
    if (prm) { sec.style.setProperty('--p', 1); steps.forEach(function (s) { s.classList.add('on'); }); return; }
    lerpItem(progress, function (v) {
      sec.style.setProperty('--p', v.toFixed(4));
      var n = Math.max(steps.length, 1), idx = Math.min(n - 1, Math.floor(v * n * 0.999));
      steps.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
      beats.forEach(function (b, i) { b.classList.toggle('on', i === idx); });
    }, 0.16);
  });

  /* Wort-Aufhellung */
  sayEls.forEach(function (o) {
    lerpItem(function () {
      var r = o.el.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -50 || r.top > vh + 50) return null;
      return Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    }, function (v) {
      var n = o.words.length, k = Math.round(v * n * 1.08);
      for (var i = 0; i < n; i++) o.words[i].classList.toggle('on', i < k);
    }, 0.2);
  });

  /* HUD: Timecode + Szene */
  var hud = document.querySelector('.hud');
  if (hud) {
    var hudTc = hud.querySelector('.tc'), hudScene = hud.querySelector('.scene');
    var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
    var RUNTIME = parseFloat(hud.getAttribute('data-runtime') || '90');
    lerpItem(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? window.scrollY / max : 0;
    }, function (v) {
      if (hudTc) hudTc.textContent = tc(v * RUNTIME);
      if (hudScene && scenes.length) {
        var cur = scenes[0], mid = window.innerHeight * 0.45;
        for (var i = 0; i < scenes.length; i++) if (scenes[i].getBoundingClientRect().top < mid) cur = scenes[i];
        var lbl = cur.getAttribute('data-scene');
        if (hudScene.textContent !== lbl) hudScene.textContent = lbl;
      }
    }, 0.18);
  }

  /* Marquee: Inhalt doppeln, Kopie nicht vorlesen */
  document.querySelectorAll('.mq-track').forEach(function (t) {
    var n = t.children.length;
    t.innerHTML += t.innerHTML;
    Array.prototype.slice.call(t.children, n).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
  });

  /* ============================================================
     VIDEOS · nach dem Laden der Seite, im Bild, mit Timecode
     ============================================================ */
  var conn = navigator.connection || {};
  var lowData = !!conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  var canAv1 = (function () {
    var v = document.createElement('video');
    var r = v.canPlayType && v.canPlayType('video/webm; codecs="av01.0.05M.08"');
    return r === 'probably' || r === 'maybe';
  })();
  var vReady = document.readyState === 'complete', vQueue = [];
  function play(v) {
    if ((prm || still || lowData) && !v.hasAttribute('data-force')) return;
    if (!vReady && !v.hasAttribute('data-force')) return; // der load-Handler startet sichtbare Videos nach
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  function loadVideo(v) {
    if (lowData && !v.hasAttribute('data-force')) return;
    if (!vReady) { if (vQueue.indexOf(v) < 0) vQueue.push(v); return; }
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    // Statische Quellen (Referenzvideos): nicht neu laden, sonst holt der Browser die Datei doppelt. play() lädt nach.
    if (v.querySelector('source')) { if (v.preload === 'none') v.preload = 'metadata'; return; }
    var s = document.createElement('source');
    if (canAv1 && v.dataset.webm) { s.src = v.dataset.webm; s.type = 'video/webm'; }
    else { s.src = v.dataset.mp4; s.type = 'video/mp4'; }
    v.appendChild(s); v.load();
  }
  if (!vReady) window.addEventListener('load', function () {
    vReady = true;
    vQueue.forEach(function (v) { loadVideo(v); if (v.hasAttribute('data-auto') && v.dataset.vis === '1') play(v); });
    vQueue = [];
  });
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      v.dataset.vis = en.isIntersecting ? '1' : '';
      if (en.isIntersecting) { loadVideo(v); if (v.hasAttribute('data-auto')) play(v); }
      else if (!v.paused && v.hasAttribute('data-auto')) v.pause();
    });
  }, { rootMargin: '250px 0px', threshold: 0.01 });
  document.querySelectorAll('video[data-mp4],video[data-auto]').forEach(function (v) {
    v.muted = true; v.playsInline = true; v.controls = false;
    vio.observe(v);
    var box = v.closest('.phone'), tcEl = box && box.querySelector('.pu-tc');
    if (tcEl) v.addEventListener('timeupdate', function () { tcEl.textContent = tc(v.currentTime); });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) document.querySelectorAll('video[data-auto]').forEach(function (v) { v.pause(); });
  });

  /* Ton-Schalter mit Untertiteln */
  document.querySelectorAll('.sound').forEach(function (btn) {
    var v = btn.closest('.phone').querySelector('video');
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      if (on) v.setAttribute('data-force', '');
      vReady = true; loadVideo(v);
      v.muted = !on;
      if (v.textTracks && v.textTracks[0]) v.textTracks[0].mode = on ? 'showing' : 'hidden';
      if (on) { try { v.currentTime = 0; } catch (e) {} play(v); }
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  });

  /* Referenz-Filter mit Ansage */
  var filter = document.querySelector('.filter');
  if (filter) {
    var items = document.querySelectorAll('.reel-grid [data-branche]');
    var status = document.getElementById('filter-status');
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var f = b.getAttribute('data-f'), n = 0;
      filter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      items.forEach(function (it) { it.hidden = !(f === 'alle' || it.getAttribute('data-branche') === f); if (!it.hidden) n++; });
      if (status) status.textContent = n + (n === 1 ? ' Referenz' : ' Referenzen') + ' sichtbar';
    });
  }

  /* Danke-Seite: Branchenblock nach ?b= */
  try {
    var bq = new URLSearchParams(location.search).get('b');
    document.querySelectorAll('[data-b]').forEach(function (el) { el.hidden = !(bq && el.getAttribute('data-b') === bq); });
  } catch (e) {}

  /* Mobil-Leiste */
  var mbar = document.querySelector('.mbar');
  if (mbar) {
    var hideZones = document.querySelectorAll('.credits');
    lerpItem(function () { return window.scrollY; }, function () {
      var show = window.scrollY > window.innerHeight * 0.6 || document.body.classList.contains('page-anfrage');
      hideZones.forEach(function (z) {
        var r = z.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.85 && r.bottom > 0) show = false;
      });
      mbar.classList.toggle('on', show);
    }, 1);
  }

  /* ============================================================
     ANFRAGE-QUIZ
     ============================================================ */
  var form = document.querySelector('form.quiz');
  if (form) {
    form.noValidate = true; // eigene Prüfung je Schritt; ohne JS greift die Browser-Prüfung
    var stepsQ = Array.prototype.slice.call(form.querySelectorAll('.q-step'));
    var cur = 0, t0 = Date.now(), byPointer = false;
    var bar = form.querySelector('.q-bar'), cnt = form.querySelector('.q-count');
    var back = form.querySelector('[data-q="back"]'), next = form.querySelector('[data-q="next"]'), send = form.querySelector('[data-q="send"]');
    var msg = form.querySelector('.q-msg');
    var tField = form.querySelector('input[name="t"]');
    var other = form.querySelector('.field-andere');
    var MAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    function val(n) { var c = form.querySelector('[name="' + n + '"]:checked'); return c ? c.value : ''; }
    function syncOther() { if (other) other.hidden = val('branche') !== 'andere'; }
    function show(i, focus) {
      cur = Math.max(0, Math.min(stepsQ.length - 1, i));
      stepsQ.forEach(function (s, k) { s.classList.toggle('on', k === cur); });
      if (bar) bar.style.setProperty('--qp', ((cur + 1) / stepsQ.length).toFixed(3));
      if (cnt) cnt.textContent = 'Schritt ' + (cur + 1) + ' von ' + stepsQ.length;
      back.hidden = cur === 0;
      next.hidden = cur === stepsQ.length - 1;
      send.hidden = cur !== stepsQ.length - 1;
      syncOther();
      if (focus) {
        var st = stepsQ[cur]; st.setAttribute('tabindex', '-1');
        st.focus({ preventScroll: true });
        var y = form.getBoundingClientRect().top + window.scrollY - 96;
        if (Math.abs(window.scrollY - y) > 40) window.scrollTo({ top: y, behavior: prm ? 'auto' : 'smooth' });
      }
    }
    function mark(inputs, bad, errEl) {
      inputs.forEach(function (x) {
        if (!x) return;
        x.setAttribute('aria-invalid', bad ? 'true' : 'false');
        var ids = (x.getAttribute('aria-describedby') || '').split(' ').filter(function (d) { return d && d !== errEl.id; });
        if (bad) ids.push(errEl.id);
        if (ids.length) x.setAttribute('aria-describedby', ids.join(' ')); else x.removeAttribute('aria-describedby');
      });
    }
    function valid(i, focusErr) {
      var s = stepsQ[i], ok = true, first = null;
      var req = s.getAttribute('data-req'), qe = s.querySelector('.q-err');
      var miss = !!req && !s.querySelector('input[name="' + req + '"]:checked');
      if (qe) qe.hidden = !miss;
      if (miss) {
        ok = false; first = s.querySelector('input[name="' + req + '"]');
        var opts = s.querySelector('.opts');
        if (!prm && opts.animate) opts.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 });
      }
      s.querySelectorAll('.field[data-check]').forEach(function (f) {
        var inp = f.querySelector('input,textarea'), kind = f.getAttribute('data-check'), v = (inp.value || '').trim(), bad = false;
        var err = f.querySelector('.err');
        if (kind === 'req') { bad = v.length < 2; mark([inp], bad, err); }
        if (kind === 'contact') {
          var mail = form.querySelector('[name="email"]'), tel = form.querySelector('[name="telefon"]');
          var weg = val('kontaktweg'), telOk = tel.value.replace(/\D/g, '').length >= 6, mailOk = MAIL_RE.test(mail.value.trim());
          if (weg === 'anruf' || weg === 'whatsapp') { bad = !telOk; err.textContent = 'Für Anruf oder WhatsApp brauchen wir eure Telefonnummer.'; }
          else if (weg === 'email') { bad = !mailOk; err.textContent = 'Bitte gebt eine gültige E-Mail-Adresse an.'; }
          else { bad = !(telOk || mailOk); err.textContent = 'Bitte gebt eine Telefonnummer oder eine E-Mail-Adresse an, damit wir euch erreichen.'; }
          mark([tel, mail], bad, err);
          inp = (weg === 'email') ? mail : tel;
        }
        f.classList.toggle('bad', bad);
        if (bad) { ok = false; first = first || inp; }
      });
      if (!ok && focusErr && first) { first.focus(); if (first.scrollIntoView) first.scrollIntoView({ block: 'center', behavior: prm ? 'auto' : 'smooth' }); }
      return ok;
    }
    form.addEventListener('pointerdown', function () { byPointer = true; });
    form.addEventListener('keydown', function (e) {
      byPointer = false;
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && cur < stepsQ.length - 1) {
        e.preventDefault();
        if (valid(cur, true)) show(cur + 1, true);
      }
    });
    form.addEventListener('change', function (e) {
      var st = e.target.closest('.q-step');
      var qe = st && st.querySelector('.q-err');
      if (qe && e.target.type === 'radio') qe.hidden = true;
      syncOther();
      if (byPointer && e.target.type === 'radio' && st && st.hasAttribute('data-auto') && stepsQ.indexOf(st) === cur) {
        setTimeout(function () { show(cur + 1, true); }, 260);
      }
    });
    next.addEventListener('click', function () { if (valid(cur, true)) show(cur + 1, true); });
    back.addEventListener('click', function () { show(cur - 1, true); });
    /* Vorauswahl aus der URL: ?branche=gastronomie&paket=8&extras=recruiting */
    var startAt = 0;
    try {
      var q = new URLSearchParams(location.search);
      ['branche', 'paket', 'extras'].forEach(function (k) {
        q.getAll(k).forEach(function (v) {
          var inp = form.querySelector('input[name="' + k + '"][value="' + v.replace(/["\\]/g, '') + '"]');
          if (inp) inp.checked = true;
        });
      });
      if (q.get('branche') && val('branche')) startAt = 1;
    } catch (e) {}
    show(startAt, false);
    function summary(d) {
      var parts = [];
      form.querySelectorAll('.q-step').forEach(function (s) {
        s.querySelectorAll('input:checked').forEach(function (i) { parts.push(i.closest('label').querySelector('span').firstChild.textContent.trim()); });
      });
      if (d.ort) parts.push('Ort: ' + d.ort);
      return 'Hallo SCM Creatives, unsere Anfrage für 3 Testvideos: ' + parts.join(', ') + '. Name: ' + (d.name || '') + (d.betrieb ? ', ' + d.betrieb : '') + '.';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      for (var i = 0; i < stepsQ.length; i++) if (!valid(i)) { show(i, true); valid(i, true); return; }
      if (tField) tField.value = String(Date.now() - t0);
      var data = {};
      new FormData(form).forEach(function (v, k) { if (data[k]) data[k] = [].concat(data[k], v); else data[k] = v; });
      try {
        var ref = document.referrer && new URL(document.referrer), same = !!ref && ref.host === location.host;
        if (same) data.quelle = ref.pathname + ref.search;
        var utm = new URLSearchParams(location.search).get('utm_source') || (same ? new URLSearchParams(ref.search).get('utm_source') : null);
        if (utm) data.utm = utm;
      } catch (x) {}
      send.disabled = true; send.querySelector('span').textContent = 'Wird gesendet …';
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.ok) location.href = '/danke' + (data.branche ? '?b=' + encodeURIComponent(data.branche) : '');
          else throw new Error('fail');
        })
        .catch(function () {
          send.disabled = false; send.querySelector('span').textContent = '3 Testvideos anfragen';
          if (msg) {
            var wa = msg.querySelector('[data-wa]');
            if (wa && wa.getAttribute('data-wa')) wa.href = wa.getAttribute('data-wa') + '?text=' + encodeURIComponent(summary(data));
            var ml = msg.querySelector('[data-mail]');
            if (ml && ml.getAttribute('data-mail')) ml.href = 'mailto:' + ml.getAttribute('data-mail') + '?subject=' + encodeURIComponent('Anfrage 3 Testvideos') + '&body=' + encodeURIComponent(summary(data));
            msg.classList.add('on'); msg.setAttribute('tabindex', '-1'); msg.focus({ preventScroll: true });
            msg.scrollIntoView({ behavior: prm ? 'auto' : 'smooth', block: 'center' });
          }
        });
    });
  }

  wake();
})();
