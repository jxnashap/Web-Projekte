/* ============================================================
   INNOWEB · Frontend
   Header · Menü · sanfte Reveals · Hero-Wireframe (zeichnet sich)
   · Schild-Zeichnung · Verschlüsselungs-Scramble · Formular
   Alles dezent, langsam, weich. prefers-reduced-motion beachtet.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: transparent -> solid ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("solid", window.scrollY > 24); }
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
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Sanfte Scroll-Reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.16 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Selbstzeichnende Linien vorbereiten ----------
     Für jede .draw-line die echte Pfadlänge als CSS-Var setzen. */
  document.querySelectorAll(".draw-line, .s-draw, .s-check").forEach(function (el) {
    try {
      var len = el.getTotalLength();
      el.style.setProperty("--len", len);
    } catch (e) { /* Nicht-Pfad-Elemente ignorieren */ }
  });

  /* ---------- Hero-Wireframe: beim Laden zeichnen ---------- */
  var wire = document.querySelector(".wire-svg");
  if (wire) {
    var wrap = wire.closest(".wire-frame") || wire;
    if (reduce) {
      wrap.classList.add("wire-animate", "wire-ready");
    } else {
      requestAnimationFrame(function () {
        setTimeout(function () {
          wrap.classList.add("wire-animate");
          setTimeout(function () { wrap.classList.add("wire-ready"); }, 1600);
        }, 350);
      });
    }
  }

  /* ---------- Schild: zeichnet sich, wenn sichtbar ---------- */
  var shield = document.querySelector(".shield-svg");
  if (shield && "IntersectionObserver" in window && !reduce) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { shield.classList.add("draw"); sio.disconnect(); }
      });
    }, { threshold: 0.4 });
    sio.observe(shield);
  } else if (shield) {
    shield.classList.add("draw");
  }

  /* ---------- Verschlüsselungs-Scramble ----------
     Buchstaben scrambeln kurz, lösen sich dann zum Zielwort auf. */
  var enc = document.querySelector("[data-encrypt]");
  if (enc) {
    var target = enc.getAttribute("data-encrypt");
    var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#§%&";
    function scramble() {
      if (reduce) { enc.textContent = target; return; }
      var frame = 0, total = 46;
      var timer = setInterval(function () {
        var out = "";
        for (var i = 0; i < target.length; i++) {
          var settled = frame / total * target.length * 1.4;
          if (i < settled) out += target[i];
          else if (target[i] === " ") out += " ";
          else out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        enc.textContent = out;
        frame++;
        if (frame > total) { enc.textContent = target; clearInterval(timer); }
      }, 40);
    }
    if ("IntersectionObserver" in window && !reduce) {
      var eio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { scramble(); eio.disconnect(); }
        });
      }, { threshold: 0.6 });
      eio.observe(enc);
    } else {
      enc.textContent = target;
    }
  }

  /* ---------- Formular-Validierung ---------- */
  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[required]").forEach(function (field) {
        var wrap = field.closest(".field") || field.closest(".consent-wrap");
        var ok;
        if (field.type === "checkbox") ok = field.checked;
        else if (field.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value.trim());
        else ok = field.value.trim().length > 0;
        if (wrap) wrap.classList.toggle("error", !ok);
        if (!ok) valid = false;
      });
      if (!valid) {
        var firstErr = form.querySelector(".error");
        if (firstErr) firstErr.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        return;
      }
      /* [PLATZHALTER: Formular an Backend/Mail-Dienst anbinden – z. B. Netlify Forms.
         Aktuell nur Bestätigung im Frontend.] */
      var note = form.querySelector(".form-note");
      if (note) { note.classList.add("show"); note.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }
      form.reset();
    });
    form.querySelectorAll("input, textarea, select").forEach(function (f) {
      f.addEventListener("input", function () { var w = f.closest(".field"); if (w) w.classList.remove("error"); });
    });
  });

  /* ---------- Jahr ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
