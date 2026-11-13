/* Redaktion (PHP-Variante) · Kern für die Website
   Lädt daten/inhalte.json und übergibt die Inhalte an window.CMS_RENDER (projektspezifisch, js/inhalte.js).
   Fehlt die Datei oder ist sie fehlerhaft, bleibt die vorgerenderte Seite unverändert.
   Mit ?vorschau=1 kommen die Inhalte per postMessage aus der Redaktion (nur gleiche Herkunft), gespeichert wird dabei nichts.
   Danach wird das Ereignis "cms:geladen" auf document ausgelöst, damit andere Skripte (z. B. Bürozeiten) neu rechnen. */
(function () {
  'use strict';
  var skript = document.currentScript;
  var datenUrl = new URL((skript && skript.getAttribute('data-daten')) || '../daten/inhalte.json', skript ? skript.src : location.href).href;

  function anwenden(d, quelle) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return;
    try {
      if (typeof window.CMS_RENDER === 'function') window.CMS_RENDER(d, quelle);
    } catch (e) {
      if (window.console) console.warn('Redaktion:', e);
    }
    var ev;
    try { ev = new CustomEvent('cms:geladen', { detail: { inhalte: d, quelle: quelle } }); }
    catch (x) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('cms:geladen', false, false, { inhalte: d, quelle: quelle }); }
    document.dispatchEvent(ev);
  }

  if (/[?&]vorschau=1(&|#|$)/.test(location.search)) {
    var eltern = window.parent !== window ? window.parent : window.opener;
    if (eltern) {
      document.documentElement.classList.add('ist-vorschau');
      window.addEventListener('message', function (e) {
        if (e.origin !== location.origin || e.source !== eltern || !e.data || e.data.typ !== 'redaktion-inhalte') return;
        anwenden(e.data.inhalte, 'vorschau');
      });
      try { eltern.postMessage({ typ: 'redaktion-bereit' }, location.origin); } catch (x) { /* fremdes Fenster */ }
      return;
    }
  }

  if (!window.fetch) return;
  fetch(datenUrl, { cache: 'no-cache', credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) anwenden(d, 'live'); })
    .catch(function () { /* keine Inhalte: statische Fassung bleibt */ });
})();
