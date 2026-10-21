/* ============================================================
   DREHBUCH-BAUKASTEN — Script (Vanilla, ohne Abhängigkeiten)
   Engine aus premium-estate v2 (Lerp-Loop, Masken, Reveals,
   Scrub) plus Drehbuch-Module:
   · Klappe als Preloader, Seitenvorhang
   · HUD: Timecode läuft mit dem Scrollen, Szene folgt Sektion
   · Wort-Aufhellung [data-say], Skript-Kapitel [data-scrub]
   · Lazy-Videos (AV1/H.264) mit Live-Timecode im Handy-Rahmen
   · Ton-Schalter, Referenz-Filter, Mobil-Leiste
   · Anfrage-Quiz mit Fortschritt, Vorauswahl per URL, Versand
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

  /* ---------- Klappe (Preloader) & Ankunft ---------- */
  var pre = document.querySelector('.klappe');
  var seen = false;
  try { seen = sessionStorage.getItem('db-seen') === '1'; } catch (e) {}
  function arrive() {
    if (document.body.classList.contains('loaded')) return;
    document.body.classList.add('loaded');
    window.dispatchEvent(new Event('db:arrived'));
  }
  if (pre && !prm && !seen) {
    requestAnimationFrame(function () { pre.classList.add('go'); });
    setTimeout(function () {
      pre.classList.add('lift'); arrive();
      try { sessionStorage.setItem('db-seen', '1'); } catch (e) {}
      setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 950);
    }, 1150);
  } else {
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    (document.readyState !== 'loading') ? arrive() : document.addEventListener('DOMContentLoaded', arrive);
    setTimeout(arrive, 300);
  }

  /* ---------- Seitenvorhang ---------- */
  var curtain = document.querySelector('.curtain');
  if (curtain && !prm) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || e.defaultPrevented) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || href.charAt(0) === '#' || a.hasAttribute('download') ||
          /^(https?:|mailto:|tel:|whatsapp:)/.test(href) ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (href.split('#')[0] === location.pathname) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(function () { window.location.href = href; }, 480);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) document.body.classList.remove('leaving');
    });
  }

  /* ---------- Overlay-Menü ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var overlay = document.querySelector('.nav-overlay');
  if (menuBtn && overlay) {
    var navLinks = overlay.querySelectorAll('.nav-list a');
    navLinks.forEach(function (a, i) { a.style.transitionDelay = (0.08 + i * 0.04) + 's'; });
    menuBtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.querySelector('.mb-txt').textContent = open ? 'Schließen' : 'Menü';
      if (open) setTimeout(function () { if (navLinks[0]) navLinks[0].focus(); }, 350);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { menuBtn.click(); menuBtn.focus(); }
    });
  }

  /* ---------- Splitting: Wörter & Zeichen ---------- */
  function splitEl(el, mode) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (n) {
      var isEl = n.nodeType === 1;
      if (isEl && n.tagName === 'BR') { el.appendChild(n); return; }
      var txt = n.textContent, keep = isEl ? n : null;
      txt.split(/(\s+)/).forEach(function (word) {
        if (!word) return;
        if (/^\s+$/.test(word)) { el.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'w';
        if (mode === 'chars') {
          word.split('').forEach(function (ch) {
            var c = document.createElement('span'); c.className = 'c';
            if (keep) { var k = keep.cloneNode(false); k.textContent = ch; c.appendChild(k); } else c.textContent = ch;
            w.appendChild(c);
          });
        } else {
          var inner = document.createElement('span');
          if (keep) { var k2 = keep.cloneNode(false); k2.textContent = word; inner.appendChild(k2); } else inner.textContent = word;
          w.appendChild(inner);
        }
        el.appendChild(w);
      });
    });
    var units = el.querySelectorAll(mode === 'chars' ? '.c' : '.w>span');
    var step = mode === 'chars' ? 0.018 : 0.05;
    units.forEach(function (s, i) { s.style.transitionDelay = (i * step).toFixed(3) + 's'; });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  }
  if (!prm) document.querySelectorAll('.split').forEach(function (el) {
    splitEl(el, el.getAttribute('data-split') === 'chars' ? 'chars' : 'words');
  });

  /* ---------- Wort-Aufhellung [data-say] vorbereiten ---------- */
  var sayEls = [];
  document.querySelectorAll('[data-say]').forEach(function (el) {
    if (prm) return;
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
    document.querySelectorAll('.hero .split,.hero .rv,.hero .rv-focus,.page-head .split,.page-head .rv')
      .forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) { el.classList.add('in'); io.unobserve(el); }
      });
  });

  function countUp(el) {
    var raw = el.getAttribute('data-count'), target = parseFloat(raw);
    var suf = el.getAttribute('data-suffix') || '', dur = 1300, t0 = null;
    if (prm) { el.textContent = Math.round(target).toLocaleString('de-DE') + suf; return; }
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e).toLocaleString('de-DE') + suf;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============================================================
     LERP-ENGINE — ein rAF-Loop für alles Geglättete
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

  /* Header-Zustand */
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
    var base = el.style.transform || '';
    lerpItem(function () {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) return null;
      return (r.top + r.height / 2 - vh / 2) / vh;
    }, function (v) {
      el.style.transform = base + ' translate3d(0,' + (-v * f * 100).toFixed(2) + 'px,0)';
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

  /* 3D-Tilt (nur Maus) */
  if (!prm && finePointer) document.querySelectorAll('.tilt3d').forEach(function (el) {
    var raf = null, tx = 0, ty = 0;
    function apply() { raf = null; el.style.transform = 'perspective(900px) rotateX(' + ty.toFixed(2) + 'deg) rotateY(' + tx.toFixed(2) + 'deg)'; }
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 6; ty = (0.5 - (e.clientY - r.top) / r.height) * 6;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', function () {
      el.style.transition = 'transform .7s cubic-bezier(.19,1,.22,1)'; el.style.transform = '';
      setTimeout(function () { el.style.transition = ''; }, 700);
    });
  });

  /* Marquee */
  document.querySelectorAll('.mq-track').forEach(function (t) { t.innerHTML += t.innerHTML; t.lastElementChild && t.querySelectorAll('span').forEach(function (s, i, all) { if (i >= all.length / 2) s.setAttribute('aria-hidden', 'true'); }); });

  /* ============================================================
     VIDEOS: lazy laden, im Bild abspielen, Timecode im Rahmen
     ============================================================ */
  var canAv1 = (function () {
    var v = document.createElement('video');
    var r = v.canPlayType && v.canPlayType('video/webm; codecs="av01.0.05M.08"');
    return r === 'probably' || r === 'maybe';
  })();
  function loadVideo(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    var s = document.createElement('source');
    if (canAv1 && v.dataset.webm) { s.src = v.dataset.webm; s.type = 'video/webm'; }
    else { s.src = v.dataset.mp4; s.type = 'video/mp4'; }
    v.appendChild(s); v.load();
  }
  function play(v) { if (prm && !v.hasAttribute('data-force')) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) { loadVideo(v); if (v.hasAttribute('data-auto')) play(v); }
      else if (!v.paused && v.hasAttribute('data-auto')) v.pause();
    });
  }, { rootMargin: '250px 0px', threshold: 0.01 });
  document.querySelectorAll('video[data-mp4]').forEach(function (v) {
    v.muted = true; v.playsInline = true;
    if (v.hasAttribute('data-eager')) { loadVideo(v); if (v.hasAttribute('data-auto')) play(v); }
    vio.observe(v);
    var box = v.closest('.phone'), tcEl = box && box.querySelector('.pu-tc');
    if (tcEl) v.addEventListener('timeupdate', function () { tcEl.textContent = tc(v.currentTime); });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) document.querySelectorAll('video[data-auto]').forEach(function (v) { v.pause(); });
  });

  /* Ton-Schalter (Referenzseiten) */
  document.querySelectorAll('.sound').forEach(function (btn) {
    var v = btn.closest('.phone').querySelector('video');
    btn.addEventListener('click', function () {
      loadVideo(v);
      var on = btn.getAttribute('aria-pressed') !== 'true';
      v.muted = !on;
      if (on) { try { v.currentTime = 0; } catch (e) {} v.setAttribute('data-force', ''); play(v); }
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Ton aus' : 'Ton an');
    });
  });

  /* Referenz-Filter */
  var filter = document.querySelector('.filter');
  if (filter) {
    var items = document.querySelectorAll('[data-branche]');
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var f = b.getAttribute('data-f');
      filter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      items.forEach(function (it) { it.hidden = !(f === 'alle' || it.getAttribute('data-branche') === f); });
    });
  }

  /* Mobil-Leiste */
  var mbar = document.querySelector('.mbar');
  if (mbar) {
    var hideZones = document.querySelectorAll('.quiz,.credits');
    lerpItem(function () { return window.scrollY; }, function () {
      var show = window.scrollY > window.innerHeight * 0.6;
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
    var stepsQ = Array.prototype.slice.call(form.querySelectorAll('.q-step'));
    var cur = 0, t0 = Date.now();
    var bar = form.querySelector('.q-bar'), cnt = form.querySelector('.q-count');
    var back = form.querySelector('[data-q="back"]'), next = form.querySelector('[data-q="next"]'), send = form.querySelector('[data-q="send"]');
    var msg = form.querySelector('.q-msg');
    var tField = form.querySelector('input[name="t"]');
    function show(i) {
      cur = Math.max(0, Math.min(stepsQ.length - 1, i));
      stepsQ.forEach(function (s, k) { s.classList.toggle('on', k === cur); });
      if (bar) bar.style.setProperty('--qp', ((cur + 1) / stepsQ.length).toFixed(3));
      if (cnt) cnt.textContent = 'Schritt ' + (cur + 1) + ' von ' + stepsQ.length;
      back.hidden = cur === 0;
      next.hidden = cur === stepsQ.length - 1;
      send.hidden = cur !== stepsQ.length - 1;
    }
    function valid(i) {
      var s = stepsQ[i], ok = true;
      var req = s.getAttribute('data-req');
      if (req && !s.querySelector('input[name="' + req + '"]:checked')) {
        ok = false; s.querySelector('.opts').animate && s.querySelector('.opts').animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 });
      }
      s.querySelectorAll('.field[data-check]').forEach(function (f) {
        var inp = f.querySelector('input,textarea'), kind = f.getAttribute('data-check'), v = (inp.value || '').trim(), bad = false;
        if (kind === 'req') bad = v.length < 2;
        if (kind === 'contact') {
          var mail = form.querySelector('[name="email"]').value.trim(), tel = form.querySelector('[name="telefon"]').value.trim();
          bad = !(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) || tel.replace(/\D/g, '').length >= 6);
        }
        f.classList.toggle('bad', bad); if (bad) ok = false;
      });
      return ok;
    }
    form.addEventListener('change', function (e) {
      var st = e.target.closest('.q-step');
      if (e.target.type === 'radio' && st && st.hasAttribute('data-auto') && stepsQ.indexOf(st) === cur) {
        setTimeout(function () { show(cur + 1); }, 260);
      }
    });
    next.addEventListener('click', function () { if (valid(cur)) show(cur + 1); });
    back.addEventListener('click', function () { show(cur - 1); });
    /* Vorauswahl aus der URL: ?branche=gastronomie&paket=8 */
    try {
      var q = new URLSearchParams(location.search);
      ['branche', 'paket'].forEach(function (k) {
        var v = q.get(k); if (!v) return;
        var inp = form.querySelector('input[name="' + k + '"][value="' + v.replace(/"/g, '') + '"]');
        if (inp) inp.checked = true;
      });
      var startAt = 0;
      if (q.get('branche') && form.querySelector('input[name="branche"]:checked')) startAt = 1;
      show(startAt);
    } catch (e) { show(0); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      for (var i = 0; i < stepsQ.length; i++) if (!valid(i)) { show(i); return; }
      if (tField) tField.value = String(Date.now() - t0);
      var data = {};
      new FormData(form).forEach(function (v, k) {
        if (data[k]) data[k] = [].concat(data[k], v); else data[k] = v;
      });
      send.disabled = true; send.querySelector('span').textContent = 'Wird gesendet …';
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.ok) { location.href = '/danke' + (data.branche ? '?b=' + encodeURIComponent(data.branche) : ''); }
          else throw new Error('fail');
        })
        .catch(function () {
          send.disabled = false; send.querySelector('span').textContent = '3 Testvideos anfragen';
          if (msg) { msg.classList.add('on'); msg.scrollIntoView({ behavior: prm ? 'auto' : 'smooth', block: 'center' }); }
        });
    });
  }

  wake();
})();
