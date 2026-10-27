/* SSV · Boote
 * Der Opti auf der Jugendseite segelt beim Scrollen die Ausbildungsstationen entlang.
 * Die Boote in der Fußzeile laufen rein per CSS (siehe .segelband in style.css). */
(function () {
  'use strict';
  var kurse = document.querySelectorAll('[data-kurs]');
  if (!kurse.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    kurse.forEach(function (k) { k.style.setProperty('--p', 1); });
    return;
  }
  var tick = false;
  function aktualisieren() {
    tick = false;
    var vh = window.innerHeight;
    kurse.forEach(function (k) {
      var r = k.getBoundingClientRect();
      // 0 sobald der Kurs unten ins Bild kommt, 1 wenn er im oberen Drittel ist
      var p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.6)));
      var boot = k.querySelector('.kurs-opti');
      var weg = k.clientWidth - boot.clientWidth;
      boot.style.transform = 'translate3d(' + (p * weg).toFixed(1) + 'px,0,0)';
      k.style.setProperty('--p', p.toFixed(3));
    });
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(aktualisieren); } }, { passive: true });
  window.addEventListener('resize', aktualisieren);
  aktualisieren();
})();
