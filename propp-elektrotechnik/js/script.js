/* ============================================================
   Propp Elektrotechnik – Frontend
   Sticky-Header · mobiles Menü · Scroll-Reveal · Zähler ·
   Kabel-Scroll-Animation (SVG-Pfad zeichnet sich, Funke wandert) ·
   gestaffelte Leistungspunkte · Formular-Validierung · aktive Anker-Nav
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Sticky Header ---------- */
  var header = document.querySelector(".site-header");
  function onHeaderScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 30); }
  window.addEventListener("scroll", onHeaderScroll, { passive: true });
  onHeaderScroll();

  /* ---------- Mobiles Menü ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll-Reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Leistungen: nacheinander einblenden ---------- */
  var cards = document.querySelectorAll(".leistung-card");
  if ("IntersectionObserver" in window && cards.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); cio.unobserve(e.target); } });
    }, { threshold: 0.25 });
    cards.forEach(function (c) { cio.observe(c); });
  } else {
    cards.forEach(function (c) { c.classList.add("in"); });
  }

  /* ---------- Zähler-Animation ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length && !reduce) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, target = parseInt(el.getAttribute("data-count"), 10);
        var prefix = el.getAttribute("data-prefix") || "", suffix = el.getAttribute("data-suffix") || "", start = null;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / 1500, 1), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        nio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { nio.observe(el); });
  }

  /* ---------- KABEL-SCROLL-ANIMATION ---------- */
  var track = document.querySelector(".cable-track");
  var line = document.querySelector(".cable-line");
  var glow = document.querySelector(".cable-glow");
  var spark = document.querySelector(".spark");
  var nodes = [].slice.call(document.querySelectorAll(".cable-node"));

  if (track && line && spark && !reduce) {
    var L = line.getTotalLength();
    [line, glow].forEach(function (el) {
      if (!el) return;
      el.style.strokeDasharray = L;
      el.style.strokeDashoffset = L;
    });

    var ticking = false;
    function updateCable() {
      ticking = false;
      var r = track.getBoundingClientRect();
      var vh = window.innerHeight;
      var startAt = vh * 0.82;   // Kabel beginnt zu zeichnen, wenn Sektion hier ankommt
      var endAt = vh * 0.30;
      var span = r.height + (startAt - endAt);
      var p = (startAt - r.top) / span;
      p = Math.max(0, Math.min(1, p));

      var drawn = L * p;
      line.style.strokeDashoffset = L - drawn;
      if (glow) glow.style.strokeDashoffset = L - drawn;

      var pt = line.getPointAtLength(drawn);
      spark.setAttribute("cx", pt.x);
      spark.setAttribute("cy", pt.y);
      spark.style.opacity = (p > 0.003 && p < 0.997) ? 1 : 0;

      nodes.forEach(function (n) {
        var ny = parseFloat(n.getAttribute("data-y"));
        n.classList.toggle("lit", pt.y >= ny - 4);
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateCable); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateCable();
  } else if (line) {
    // reduzierte Bewegung: Kabel voll gezeichnet zeigen
    line.style.strokeDashoffset = 0;
    if (glow) glow.style.strokeDashoffset = 0;
    nodes.forEach(function (n) { n.classList.add("lit"); });
  }

  /* ---------- Aktive Anker-Navigation ---------- */
  var sections = [].slice.call(document.querySelectorAll("section[id]"));
  var navLinks = [].slice.call(document.querySelectorAll('.main-nav a[href^="#"]'));
  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.getAttribute("id");
        navLinks.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { sio.observe(s); });
  }

  /* ---------- Formular-Validierung ---------- */
  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[required]").forEach(function (field) {
        var wrap = field.closest(".form-field") || field.closest(".form-consent-wrap");
        var ok;
        if (field.type === "checkbox") ok = field.checked;
        else if (field.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value.trim());
        else ok = field.value.trim().length > 0;
        if (wrap) wrap.classList.toggle("error", !ok);
        if (!ok) valid = false;
      });
      if (!valid) {
        var firstErr = form.querySelector(".error");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      /* [PLATZHALTER: Formular an Backend/Mail anbinden – z. B. Netlify Forms
         oder Formspree. Aktuell nur Erfolgsmeldung.] */
      var success = form.querySelector(".form-success");
      if (success) { success.classList.add("visible"); success.scrollIntoView({ behavior: "smooth", block: "center" }); }
      form.reset();
    });
    form.querySelectorAll("input, textarea, select").forEach(function (f) {
      f.addEventListener("input", function () { var w = f.closest(".form-field"); if (w) w.classList.remove("error"); });
    });
  });

  /* ---------- Job-Karte -> Stelle im Formular vorwählen ---------- */
  document.querySelectorAll("[data-job]").forEach(function (card) {
    card.addEventListener("click", function () {
      var sel = document.getElementById("bewerbung-stelle");
      if (sel) { sel.value = card.getAttribute("data-job"); }
      var form = document.getElementById("bewerbung");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Jahr im Footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
