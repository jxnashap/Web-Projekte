/* ============================================================
   PREMIUM-ESTATE BAUKASTEN v2 — Script
   Hyperreal-Arsenal, komplett Vanilla:
   · Lerp-Engine: EIN rAF-Loop glättet Parallax, Scrub & Tilt
     mit Nachlauf (der „GSAP-Feel", ohne Scroll-Hijack)
   · Wort- UND Zeichen-Masken (data-split="chars" mit Blur)
   · Scroll-Scrub-Kapitel ([data-scrub] setzt --p 0…1)
   · Video-Scrub (Apple-Stil, currentTime folgt geglättet)
   · 3D-Tilt-Karten mit Glanzlicht, Cursor-Spotlight
   · Video-Hero mit AV1-WebM/H.264-Codec-Wahl
   Preloader, Seitenvorhang, Overlay-Menü, Count-up wie v1.
   Natives Scrollen bleibt IMMER nativ.
   ============================================================ */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var prm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- Preloader & Ankunft ---------- */
  var pre = document.querySelector('.preloader');
  var seen = false;
  try { seen = sessionStorage.getItem('pe-seen') === '1'; } catch (e) {}
  function arrive() {
    if (document.body.classList.contains('loaded')) return;
    document.body.classList.add('loaded');
    window.dispatchEvent(new Event('pe:arrived'));
  }
  if (pre && !prm && !seen) {
    requestAnimationFrame(function () { pre.classList.add('go'); });
    window.addEventListener('load', function () {
      setTimeout(function () {
        pre.classList.add('lift'); arrive();
        try { sessionStorage.setItem('pe-seen', '1'); } catch (e) {}
        setTimeout(function () { pre.remove(); }, 1100);
      }, 1350);
    });
    setTimeout(function () {
      if (!document.body.classList.contains('loaded')) { pre.classList.add('go', 'lift'); arrive(); }
    }, 4000);
  } else {
    if (pre) { pre.classList.add('go', 'lift'); setTimeout(function () { pre.remove(); }, 900); }
    (document.readyState === 'complete') ? arrive() : window.addEventListener('load', arrive);
    setTimeout(arrive, 600);
  }

  /* ---------- Seitenübergang ---------- */
  var curtain = document.querySelector('.curtain');
  if (curtain && !prm) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || href.charAt(0) === '#' ||
          /^(https?:|mailto:|tel:)/.test(href) ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(function () { window.location.href = href; }, 520);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) document.body.classList.remove('leaving');
    });
  }

  /* ---------- Video-Hero: Codec-Wahl (AV1-WebM bevorzugt) ---------- */
  document.querySelectorAll('video[data-webm]').forEach(function (v) {
    var av1 = v.canPlayType('video/webm; codecs="av01.0.08M.08"');
    var src = document.createElement('source');
    if (av1 === 'probably' || av1 === 'maybe') {
      src.src = v.getAttribute('data-webm'); src.type = 'video/webm';
    } else {
      src.src = v.getAttribute('data-mp4'); src.type = 'video/mp4';
    }
    v.appendChild(src); v.load();
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  });

  /* ---------- Overlay-Menü ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    var navLinks = document.querySelectorAll('.nav-list a');
    function stagger(on) {
      navLinks.forEach(function (a, i) {
        a.style.transitionDelay = on ? (0.08 + i * 0.045) + 's' : '0s';
      });
    }
    stagger(true);
    menuBtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      stagger(open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) menuBtn.click();
    });
  }

  /* ---------- Splitting: Wörter & Zeichen ---------- */
  function wrapUnit(el, txt, cls, node) {
    var w = document.createElement('span'); w.className = 'w';
    var inner = document.createElement('span');
    if (node) { var c = node.cloneNode(false); c.textContent = txt; inner.appendChild(c); }
    else inner.textContent = txt;
    if (cls) inner.className = cls;
    w.appendChild(inner); el.appendChild(w);
  }
  function splitEl(el, mode) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (n) {
      var isEl = n.nodeType === 1;
      if (isEl && n.tagName === 'BR') { el.appendChild(n); return; }
      var txt = n.textContent, keep = isEl ? n : null;
      if (mode === 'chars') {
        txt.split(/(\s+)/).forEach(function (word) {
          if (!word) return;
          if (/^\s+$/.test(word)) { el.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          word.split('').forEach(function (ch) {
            var inner = document.createElement('span'); inner.className = 'c';
            if (keep) { var c = keep.cloneNode(false); c.textContent = ch; inner.appendChild(c); }
            else inner.textContent = ch;
            w.appendChild(inner);
          });
          el.appendChild(w);
        });
      } else {
        txt.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
          wrapUnit(el, part, null, keep);
        });
      }
    });
    var units = el.querySelectorAll(mode === 'chars' ? '.c' : '.w>span');
    var step = mode === 'chars' ? 0.022 : 0.05;
    units.forEach(function (s, i) { s.style.transitionDelay = (i * step).toFixed(3) + 's'; });
  }
  if (!prm) document.querySelectorAll('.split').forEach(function (el) {
    splitEl(el, el.getAttribute('data-split') === 'chars' ? 'chars' : 'words');
  });

  /* ---------- Reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      if (en.target.hasAttribute('data-count')) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -4% 0px' });
  document.querySelectorAll('.rv,.rv-img,.line-h,.line-v,.split,[data-count]')
    .forEach(function (el) { io.observe(el); });
  window.addEventListener('pe:arrived', function () {
    document.querySelectorAll('.hero .split,.hero .rv,.hero .line-h')
      .forEach(function (el) { el.classList.add('in'); io.unobserve(el); });
  });

  /* ---------- Count-up (deutsches Zahlenformat) ---------- */
  function countUp(el) {
    var raw = el.getAttribute('data-count');
    var target = parseFloat(raw);
    var dec = (raw.split('.')[1] || '').length;
    var suf = el.getAttribute('data-suffix') || '';
    var dur = 1400, t0 = null;
    function fmt(v) {
      return dec > 0 ? v.toFixed(dec).replace('.', ',')
                     : Math.round(v).toLocaleString('de-DE');
    }
    if (prm) { el.textContent = fmt(target) + suf; return; }
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e) + suf;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============================================================
     LERP-ENGINE — ein rAF-Loop für alles Geglättete.
     Werte laufen ihrem Ziel mit Faktor s hinterher (Nachlauf).
     Loop schläft, sobald alle Werte eingerastet sind.
     ============================================================ */
  var L = { items: [], running: false };
  function lerpItem(get, apply, s) {
    var it = { get: get, apply: apply, s: s || 0.12, v: null };
    L.items.push(it); return it;
  }
  function wake() {
    if (!L.running) { L.running = true; requestAnimationFrame(loop); }
  }
  function loop() {
    var busy = false;
    for (var i = 0; i < L.items.length; i++) {
      var it = L.items[i];
      var target = it.get();
      if (target === null) continue;
      if (it.v === null) it.v = target;
      var d = target - it.v;
      if (Math.abs(d) > 0.0006) { it.v += d * it.s; busy = true; }
      else it.v = target;
      it.apply(it.v);
    }
    if (busy) requestAnimationFrame(loop);
    else L.running = false;
  }
  ['scroll', 'resize'].forEach(function (ev) {
    window.addEventListener(ev, wake, { passive: true });
  });

  /* ---------- Header-Zustand (im Loop mitgeführt) ---------- */
  var header = document.querySelector('.site-header');
  var lastScrolled = null;
  lerpItem(function () { return window.scrollY > 40 ? 1 : 0; }, function (v) {
    var s = v > 0.5;
    if (s !== lastScrolled && header) { header.classList.toggle('scrolled', s); lastScrolled = s; }
  }, 1);

  /* ---------- Parallax mit Nachlauf ---------- */
  if (!prm) document.querySelectorAll('[data-plx]').forEach(function (el) {
    var f = parseFloat(el.getAttribute('data-plx')) || 0.12;
    el.classList.add('plx');
    lerpItem(function () {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < -160 || r.top > vh + 160) return null;
      return (r.top + r.height / 2 - vh / 2) / vh;
    }, function (v) {
      el.style.transform = 'translate3d(0,' + (-v * f * 100).toFixed(2) + 'px,0)';
    }, 0.14);
  });

  /* ---------- Scroll-Scrub-Kapitel: --p = Fortschritt 0…1 ---------- */
  document.querySelectorAll('[data-scrub]').forEach(function (sec) {
    var steps = sec.querySelectorAll('.scrub-step');
    function progress() {
      var r = sec.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      if (span <= 0) return 1;
      return Math.min(1, Math.max(0, -r.top / span));
    }
    if (prm) { sec.style.setProperty('--p', 1); steps.forEach(function (s) { s.classList.add('on'); }); return; }
    lerpItem(progress, function (v) {
      sec.style.setProperty('--p', v.toFixed(4));
      steps.forEach(function (s) {
        var at = parseFloat(s.getAttribute('data-at') || 0);
        var to = parseFloat(s.getAttribute('data-until') || 1.01);
        s.classList.toggle('on', v >= at && v < to);
      });
    }, 0.16);
  });

  /* ---------- Video-Scrub (Apple-Stil) ---------- */
  document.querySelectorAll('[data-video-scrub]').forEach(function (sec) {
    var vid = sec.querySelector('video');
    if (!vid || prm) return;
    vid.muted = true; vid.playsInline = true; vid.preload = 'auto';
    var dur = 0;
    vid.addEventListener('loadedmetadata', function () { dur = vid.duration || 0; wake(); });
    lerpItem(function () {
      if (!dur) return null;
      var r = sec.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      if (span <= 0) return null;
      return Math.min(1, Math.max(0, -r.top / span));
    }, function (v) {
      if (dur && vid.readyState >= 2) {
        var t = v * dur;
        if (Math.abs(vid.currentTime - t) > 0.01) vid.currentTime = t;
      }
    }, 0.22);
  });

  /* ---------- 3D-Tilt mit Glanzlicht ---------- */
  if (!prm && finePointer) document.querySelectorAll('.tilt3d').forEach(function (el) {
    var tx = 0, ty = 0, gx = 50, gy = 50;
    var raf = null;
    function apply() {
      raf = null;
      el.style.transform = 'perspective(900px) rotateX(' + ty.toFixed(2) + 'deg) rotateY(' + tx.toFixed(2) + 'deg)';
      el.style.setProperty('--gx', gx.toFixed(1) + '%');
      el.style.setProperty('--gy', gy.toFixed(1) + '%');
    }
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tx = (px - 0.5) * 7; ty = (0.5 - py) * 7; gx = px * 100; gy = py * 100;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', function () {
      el.style.transition = 'transform .7s cubic-bezier(.19,1,.22,1)';
      el.style.transform = 'perspective(900px)';
      setTimeout(function () { el.style.transition = ''; }, 700);
    });
  });

  /* ---------- Cursor-Spotlight ---------- */
  if (!prm && finePointer) document.querySelectorAll('.spot').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--sy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });

  /* ---------- Magnet ---------- */
  if (!prm && finePointer) document.querySelectorAll('.magnet').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      var dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      el.style.transform = 'translate(' + (dx * 7).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px) scale(1.02)';
    });
    el.addEventListener('pointerleave', function () {
      el.style.transition = 'transform .6s cubic-bezier(.19,1,.22,1)';
      el.style.transform = '';
      setTimeout(function () { el.style.transition = ''; }, 600);
    });
  });

  /* ---------- Marquee ---------- */
  document.querySelectorAll('.mq-track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  wake();
})();
