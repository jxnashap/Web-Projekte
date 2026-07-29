/* ============================================================
   PREMIUM-ESTATE BAUKASTEN — Script
   Vanilla-Reimplementierung der GSAP/Lenis-Sprache:
   Preloader, Wort-Masken, Clip-Reveals, Count-up, Parallax,
   Overlay-Menü, Seitenübergänge. Ein rAF-Loop, passive Listener,
   IO wird nach Enthüllung wieder abgehängt. Kein Smooth-Scroll-
   Wrapper — natives Scrollen bleibt unangetastet (Flüssigkeit!).
   ============================================================ */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var prm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Preloader & Ankunft ---------- */
  var pre = document.querySelector('.preloader');
  var seen = false;
  try { seen = sessionStorage.getItem('pe-seen') === '1'; } catch (e) {}
  function arrive() {
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
    setTimeout(function () { /* Sicherheitsnetz falls load klemmt */
      if (!document.body.classList.contains('loaded')) {
        pre.classList.add('go', 'lift'); arrive();
      }
    }, 4000);
  } else {
    if (pre) { pre.classList.add('go', 'lift'); setTimeout(function () { pre.remove(); }, 900); }
    (document.readyState === 'complete')
      ? arrive()
      : window.addEventListener('load', arrive);
    setTimeout(arrive, 600);
  }

  /* ---------- Seitenübergang (Vorhang) ---------- */
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

  /* ---------- Header-Zustand ---------- */
  var header = document.querySelector('.site-header');
  var lastScrolled = false;
  function headerState(y) {
    var s = y > 40;
    if (s !== lastScrolled && header) {
      header.classList.toggle('scrolled', s); lastScrolled = s;
    }
  }

  /* ---------- Overlay-Menü ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    var navLinks = document.querySelectorAll('.nav-list a');
    navLinks.forEach(function (a, i) {
      a.style.transitionDelay = (0.08 + i * 0.045) + 's';
    });
    menuBtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) navLinks.forEach(function (a) { a.style.transitionDelay = '0s'; });
      else navLinks.forEach(function (a, i) { a.style.transitionDelay = (0.08 + i * 0.045) + 's'; });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) menuBtn.click();
    });
  }

  /* ---------- Wort-Masken ---------- */
  function splitWords(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          var inner = document.createElement('span'); inner.textContent = part;
          w.appendChild(inner); el.appendChild(w);
        });
      } else if (n.nodeType === 1 && n.tagName === 'BR') {
        el.appendChild(n);
      } else if (n.nodeType === 1) {
        var txt = n.textContent;
        txt.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          var clone = n.cloneNode(false); clone.textContent = part;
          var inner = document.createElement('span'); inner.appendChild(clone);
          w.appendChild(inner); el.appendChild(w);
        });
      }
    });
    var spans = el.querySelectorAll('.w>span');
    spans.forEach(function (s, i) { s.style.transitionDelay = (i * 0.05) + 's'; });
  }
  var splits = document.querySelectorAll('.split');
  if (!prm) splits.forEach(splitWords);

  /* ---------- Reveals (ein Observer für alles) ---------- */
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

  /* Hero-Split sofort nach Ankunft (nicht auf Scroll warten) */
  window.addEventListener('pe:arrived', function () {
    document.querySelectorAll('.hero .split,.hero .rv,.hero .line-h')
      .forEach(function (el) { el.classList.add('in'); io.unobserve(el); });
  });

  /* ---------- Count-up ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = (el.getAttribute('data-count').split('.')[1] || '').length;
    var suf = el.getAttribute('data-suffix') || '';
    var dur = 1400, t0 = null;
    if (prm) { el.textContent = el.getAttribute('data-count').replace('.', ',') + suf; return; }
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var val = (target * e).toFixed(dec).replace('.', ',');
      el.textContent = val + suf;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Ein rAF-Loop: Parallax + Header ---------- */
  var plx = [];
  document.querySelectorAll('[data-plx]').forEach(function (el) {
    plx.push({ el: el, f: parseFloat(el.getAttribute('data-plx')) || 0.12 });
    el.classList.add('plx');
  });
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY || 0;
    headerState(y);
    if (prm) return;
    var vh = window.innerHeight;
    for (var i = 0; i < plx.length; i++) {
      var r = plx[i].el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      plx[i].el.style.transform = 'translate3d(0,' + (-c * plx[i].f * 100).toFixed(2) + 'px,0)';
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();

  /* ---------- Marquee: Inhalt einmal duplizieren ---------- */
  document.querySelectorAll('.mq-track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- Magnet (nur feine Zeiger) ---------- */
  if (!prm && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnet').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        el.style.transform = 'translate(' + (dx * 6).toFixed(1) + 'px,' + (dy * 5).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .6s cubic-bezier(.19,1,.22,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 600);
      });
    });
  }
})();
