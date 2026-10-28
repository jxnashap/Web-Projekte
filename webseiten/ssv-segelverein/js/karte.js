/* SSV · Karte mit 2-Klick-Lösung
 * Die Google-Maps-Karte wird erst nach Klick auf „Karte laden“ eingebunden –
 * vorher fließen keine Daten an Google. Optional merkt sich der Browser die Zustimmung. */
(function () {
  'use strict';
  var KEY = 'ssv-karten-ok';
  function laden(wrap) {
    var f = document.createElement('iframe');
    f.src = wrap.getAttribute('data-karte');
    f.title = 'Karte: Schwartauer Segler-Verein, Zur Teerhofsinsel 5B, Lübeck';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.allowFullscreen = true;
    wrap.innerHTML = '';
    wrap.appendChild(f);
    wrap.classList.add('geladen');
  }
  var gemerkt = false;
  try { gemerkt = localStorage.getItem(KEY) === '1'; } catch (e) { /* kein Speicher – dann eben jedes Mal fragen */ }
  document.querySelectorAll('[data-karte]').forEach(function (wrap) {
    if (gemerkt) return laden(wrap);
    var btn = wrap.querySelector('[data-karte-laden]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var merken = wrap.querySelector('[data-karte-merken]');
      if (merken && merken.checked) { try { localStorage.setItem(KEY, '1'); } catch (e) { /* egal */ } }
      laden(wrap);
    });
  });
})();
