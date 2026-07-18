/* ============================================================
   Autohaus Bad Schwartau – gemeinsames Frontend-Verhalten
   Sticky-Header, mobiles Menü, Scroll-Reveal, Zähler,
   FAQ-Akkordeon, Formular-Validierung
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Sticky Header ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobiles Menü ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll-Reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Zähler-Animation (Zahlen-Sektion) ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = parseInt(el.getAttribute("data-count"), 10);
          var suffix = el.getAttribute("data-suffix") || "";
          var start = null;
          function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / 1600, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          cio.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- FAQ-Akkordeon ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      // Nur ein offenes Element pro Gruppe
      var group = item.closest(".faq-group") || document;
      group.querySelectorAll(".faq-item.open").forEach(function (other) {
        other.classList.remove("open");
        var oa = other.querySelector(".faq-a");
        if (oa) oa.style.maxHeight = null;
        var ob = other.querySelector(".faq-q");
        if (ob) ob.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Formular-Validierung ---------- */
  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;

      form.querySelectorAll("[required]").forEach(function (field) {
        var wrap = field.closest(".form-field") || field.closest(".form-consent-wrap");
        var ok = true;

        if (field.type === "checkbox") {
          ok = field.checked;
        } else if (field.type === "email") {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value.trim());
        } else {
          ok = field.value.trim().length > 0;
        }

        if (wrap) wrap.classList.toggle("error", !ok);
        if (!ok) valid = false;
      });

      if (!valid) {
        var firstError = form.querySelector(".error");
        if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      /* [PLATZHALTER: Formular-Backend anbinden – z. B. Netlify Forms,
         Formspree oder eigenes PHP-Skript. Aktuell nur Erfolgsmeldung.] */
      var success = form.querySelector(".form-success");
      if (success) {
        success.classList.add("visible");
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.reset();
    });

    // Fehlerzustand beim Tippen zurücksetzen
    form.querySelectorAll("input, textarea, select").forEach(function (field) {
      field.addEventListener("input", function () {
        var wrap = field.closest(".form-field");
        if (wrap) wrap.classList.remove("error");
      });
    });
  });

  /* ---------- Jahr im Footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

/* ============================================================
   Standort-Showcase: 360°-Drehung per Scroll-Scrubbing
   (Frames in assets/animation/, Canvas folgt der Scrollposition)
   ============================================================ */
(function () {
  "use strict";
  var section = document.querySelector(".showcase");
  if (!section) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // Standbild bleibt

  var canvas = section.querySelector(".showcase-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var total = parseInt(section.getAttribute("data-frames"), 10) || 60;
  var path = section.getAttribute("data-frame-path") || "assets/animation/";
  // Mobil: nur jeder 2. Frame -> halbe Datenmenge, bleibt flüssig
  var step = window.matchMedia("(max-width: 760px)").matches ? 2 : 1;
  var indices = [];
  for (var i = 0; i < total; i += step) indices.push(i);
  var frames = new Array(indices.length).fill(null);
  var started = false, current = -1, target = 0, ticking = false;

  function pad(n) { return ("00" + n).slice(-3); }

  function load() {
    if (started) return;
    started = true;
    indices.forEach(function (idx, k) {
      var img = new Image();
      img.onload = function () {
        frames[k] = img;
        if (k === 0) { resize(); section.classList.add("ready"); }
      };
      img.src = path + "frame-" + pad(idx) + ".webp";
    });
  }

  function nearest(k) {
    for (var d = 0; d < frames.length; d++) {
      if (frames[k - d]) return k - d;
      if (frames[k + d]) return k + d;
    }
    return -1;
  }

  function render(force) {
    var k = nearest(Math.max(0, Math.min(frames.length - 1, target)));
    if (k < 0 || (k === current && !force)) return;
    current = k;
    var img = frames[k];
    var cw = canvas.width, ch = canvas.height;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    render(true);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var rect = section.getBoundingClientRect();
      var span = section.offsetHeight - window.innerHeight;
      if (span <= 0) return;
      var p = Math.min(1, Math.max(0, -rect.top / span));
      target = Math.round(p * (frames.length - 1));
      render();
    });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { load(); io.disconnect(); } });
    }, { rootMargin: "100% 0px" });
    io.observe(section);
  } else {
    load();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", resize);
})();
