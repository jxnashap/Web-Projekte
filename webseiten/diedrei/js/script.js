/* ============================================================
   DIE DREI · Weinbar · Kiel — Script („Quiet Rosé")
   Aus dem Premium-Estate-Baukasten übernommen, was zur Ruhe passt:
   · Reveals über EINEN IntersectionObserver (.rv, .rv-img, .line-h, .split)
   · Wort-Masken für Headlines (<em>/<br> bleiben erhalten)
   · Lerp-Engine (ein rAF-Loop) für Header-Zustand + sehr dezentes Parallax
   · Laufband, Overlay-Menü (mobil)
   Neu: Öffnungszeiten — heutige Zeile markieren + „Heute geöffnet bis …"
   (Zeitzone Europe/Berlin, Daten aus data-hours am <body>).
   Weinkarte: aktiver Chip folgt der sichtbaren Kategorie.
   Kein Preloader, kein Vorhang, kein Tilt/Magnet/Spotlight.
   Natives Scrollen bleibt immer nativ.
   ============================================================ */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var prm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Ankunft: Hero-Bild + Hero-Texte ---------- */
  function arrive() {
    if (document.body.classList.contains('loaded')) return;
    document.body.classList.add('loaded');
    document.querySelectorAll('.hero .split,.hero .rv,.hero .rise,.hero .line-h,.page-head .split,.page-head .rv')
      .forEach(function (el) { el.classList.add('in'); if (io) io.unobserve(el); });
  }

  /* ---------- Overlay-Menü (mobil) als modaler Dialog ----------
     role="dialog" aria-modal="true" steht im HTML. Beim Öffnen werden main,
     footer und Skip-Link per inert gesperrt, Tab zirkuliert zwischen
     Menü-Button und Overlay-Links; beim Schließen Fokus zurück zum Button. */
  var menuBtn = document.querySelector('.menu-btn');
  var overlay = document.getElementById('nav-overlay');
  if (menuBtn && overlay) {
    var navLinks = overlay.querySelectorAll('.nav-list a');
    var outside = document.querySelectorAll('main, footer, .skip');
    var stagger = function (on) {
      navLinks.forEach(function (a, i) {
        a.style.transitionDelay = on ? (0.12 + i * 0.06) + 's' : '0s';
      });
    };
    var trapItems = function () {
      return [menuBtn].concat(Array.prototype.slice.call(overlay.querySelectorAll('a[href],button')));
    };
    var isOpen = function () { return document.body.classList.contains('nav-open'); };
    var setOpen = function (open, restoreFocus) {
      document.body.classList.toggle('nav-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      outside.forEach(function (el) {
        if (open) { el.setAttribute('inert', ''); } else { el.removeAttribute('inert'); }
      });
      stagger(open);
      if (open && navLinks[0]) setTimeout(function () { navLinks[0].focus(); }, 60);
      if (!open && restoreFocus) menuBtn.focus();
    };
    menuBtn.addEventListener('click', function () { setOpen(!isOpen(), true); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); return; }
      if (e.key === 'Tab') {
        var items = trapItems(), i = items.indexOf(document.activeElement);
        if (i === -1) { e.preventDefault(); items[0].focus(); return; }
        var next = e.shiftKey ? (i - 1 + items.length) % items.length : (i + 1) % items.length;
        e.preventDefault(); items[next].focus();
      }
    });
    navLinks.forEach(function (a) { a.addEventListener('click', function () { setOpen(false, false); }); });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880 && isOpen()) setOpen(false, false);
    }, { passive: true });
  }

  /* ---------- Wort-Masken ---------- */
  function splitWords(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (n) {
      var isEl = n.nodeType === 1;
      if (isEl && n.tagName === 'BR') { el.appendChild(n); return; }
      var keep = isEl ? n : null;
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'w';
        var inner = document.createElement('span');
        if (keep) { var c = keep.cloneNode(false); c.textContent = part; inner.appendChild(c); }
        else inner.textContent = part;
        w.appendChild(inner); el.appendChild(w);
      });
    });
    el.querySelectorAll('.w>span').forEach(function (s, i) {
      s.style.transitionDelay = (0.05 + i * 0.055).toFixed(3) + 's';
    });
  }

  var RV = '.rv,.rv-img,.line-h,.split,.rise';
  var io = null;
  if (prm || !('IntersectionObserver' in window)) {
    document.querySelectorAll(RV).forEach(function (el) { el.classList.add('in'); });
  } else {
    document.querySelectorAll('.split').forEach(function (el) {
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      splitWords(el);
      el.querySelectorAll('.w').forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
    });
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll(RV).forEach(function (el) { io.observe(el); });
  }

  /* Ankunft sofort (Skript ist defer → DOM steht): Hero-Bild ist von Beginn an sichtbar
     (LCP), nur die leichte Skalierung und die Text-Reveals laufen an. */
  requestAnimationFrame(arrive);

  /* ============================================================
     LERP-ENGINE — ein rAF-Loop; Werte laufen mit Nachlauf nach.
     Schläft, sobald alles eingerastet ist.
     ============================================================ */
  var L = { items: [], running: false };
  function lerpItem(get, apply, s) { var it = { get: get, apply: apply, s: s || 0.1, v: null }; L.items.push(it); return it; }
  function wake() { if (!L.running) { L.running = true; requestAnimationFrame(loop); } }
  function loop() {
    var busy = false;
    for (var i = 0; i < L.items.length; i++) {
      var it = L.items[i], target = it.get();
      if (target === null) continue;
      if (it.v === null) it.v = target;
      var d = target - it.v;
      if (Math.abs(d) > 0.0005) { it.v += d * it.s; busy = true; } else it.v = target;
      it.apply(it.v);
    }
    if (busy) requestAnimationFrame(loop); else L.running = false;
  }
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake, { passive: true });

  /* Header-Zustand */
  var header = document.querySelector('.site-header');
  var lastScrolled = null;
  lerpItem(function () { return window.scrollY > 40 ? 1 : 0; }, function (v) {
    var s = v > 0.5;
    if (header && s !== lastScrolled) { header.classList.toggle('scrolled', s); lastScrolled = s; }
  }, 1);

  /* Parallax — sehr dezent: Faktor = Anteil der Viewport-Höhe (≤ 0.06) */
  var heroPlx = window.matchMedia('(min-width: 1101px) and (pointer: fine)').matches; // nur dort hat .hero-media Spielraum
  if (!prm) document.querySelectorAll('[data-plx]').forEach(function (el) {
    if (el.classList.contains('hero-media') && !heroPlx) return;
    var f = Math.min(parseFloat(el.getAttribute('data-plx')) || 0.04, 0.06);
    el.classList.add('plx');
    lerpItem(function () {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) return null;
      return Math.max(-1.2, Math.min(1.2, (r.top + r.height / 2 - vh / 2) / vh));
    }, function (v) {
      el.style.transform = 'translate3d(0,' + (-v * f * window.innerHeight).toFixed(1) + 'px,0)';
    }, 0.1);
  });

  /* Laufband: Inhalt ist im HTML bereits doppelt (läuft so auch ohne JS nahtlos) */

  /* ============================================================
     ÖFFNUNGSZEITEN — heute markieren + Status-Hinweis
     <body data-hours="-,-,17:00-23:00,…">  (Mo…So, „-" = Ruhetag)
     Zeilen: <li data-day="1…7">   Hinweis: <span data-today></span>
     ============================================================ */
  var DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  function parseHours(str) {
    return (str || '').split(',').map(function (s) {
      s = s.trim();
      var m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(s);
      if (!m) return null;
      return { o: +m[1] * 60 + +m[2], c: +m[3] * 60 + +m[4], os: m[1] + ':' + m[2], cs: m[3] + ':' + m[4] };
    });
  }
  function berlinNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
      return { day: map[o.weekday], min: (+o.hour % 24) * 60 + +o.minute };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay() === 0 ? 7 : d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function nextOpen(hours, day) {
    for (var k = 1; k <= 7; k++) {
      var dd = ((day - 1 + k) % 7) + 1;
      if (hours[dd - 1]) return { day: dd, k: k, h: hours[dd - 1] };
    }
    return null;
  }
  function uhr(s) { return s.replace(/^0/, '') + ' Uhr'; }
  function updateHours() {
    var hours = parseHours(document.body.getAttribute('data-hours'));
    if (hours.length !== 7) return;
    var now = berlinNow();
    document.querySelectorAll('[data-day]').forEach(function (row) {
      var on = +row.getAttribute('data-day') === now.day;
      row.classList.toggle('is-today', on);
      if (on) row.setAttribute('aria-current', 'date'); else row.removeAttribute('aria-current');
    });
    var h = hours[now.day - 1], txt, state;
    function again() {
      var n = nextOpen(hours, now.day);
      if (!n) return '';
      return n.k === 1 ? 'morgen ab ' + uhr(n.h.os) : 'wieder ab ' + DAYS[n.day - 1] + ', ' + uhr(n.h.os);
    }
    if (!h) { txt = 'Heute Ruhetag · ' + again(); state = 'closed'; }
    else if (now.min < h.o) { txt = 'Heute geöffnet · ' + h.os + '–' + uhr(h.cs); state = 'later'; }
    else if (now.min < h.c) { txt = 'Heute geöffnet bis ' + uhr(h.cs); state = 'open'; }
    else { txt = 'Heute bereits geschlossen · ' + again(); state = 'closed'; }
    document.querySelectorAll('[data-today]').forEach(function (el) {
      el.textContent = txt; el.setAttribute('data-state', state);
    });
  }
  if (document.body.hasAttribute('data-hours')) {
    updateHours();
    setInterval(updateHours, 60000);
  }

  /* ---------- Weinkarte: aktiver Chip folgt der Leseposition ---------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.wk-chips a[href^="#"]'));
  if (chips.length) {
    var bar = chips[0].parentElement;
    var targets = chips.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var current = -1, ticking = false;
    var spy = function () {
      ticking = false;
      var line = window.innerHeight * 0.38, idx = -1;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].getBoundingClientRect().top <= line) idx = i;
      }
      var last = targets[targets.length - 1];
      if (idx > -1 && last && last.getBoundingClientRect().bottom < line * 0.5) idx = -1; // unterhalb der Karte
      if (idx === current) return;
      current = idx;
      chips.forEach(function (a, i) {
        a.classList.toggle('is-active', i === idx);
        if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      if (idx === -1 && bar.scrollLeft > 0) {
        try { bar.scrollTo({ left: 0, behavior: prm ? 'auto' : 'smooth' }); } catch (e) { bar.scrollLeft = 0; }
      }
      if (idx > -1 && bar.scrollWidth > bar.clientWidth) {
        var a = chips[idx];
        var left = a.offsetLeft - bar.clientWidth / 2 + a.clientWidth / 2;
        try { bar.scrollTo({ left: Math.max(0, left), behavior: prm ? 'auto' : 'smooth' }); }
        catch (e) { bar.scrollLeft = Math.max(0, left); }
      }
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
  }

  /* ---------- Karte: Google Maps erst nach Klick (2-Klick-Lösung, nichts gespeichert) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-map-load]');
    var box = btn && btn.closest('.map-consent');
    if (!box) return;
    var f = document.createElement('iframe');
    f.className = 'map-frame';
    f.src = box.getAttribute('data-map-src');
    f.title = box.getAttribute('data-map-title') || 'Google Maps';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.setAttribute('allowfullscreen', '');
    box.replaceWith(f);
    f.focus();
  });

  wake();
})();
