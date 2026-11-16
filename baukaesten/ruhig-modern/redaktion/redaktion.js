/* Redaktion: Rückfrage vor Veröffentlichen/Verwerfen, Hinweis bei ungespeicherten Änderungen */
(function () {
  'use strict';
  var form = document.getElementById('inhalte');
  var dirty = false;
  if (form) {
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('change', function () { dirty = true; });
    form.addEventListener('submit', function (e) {
      var b = e.submitter;
      var q = b && b.getAttribute('data-confirm');
      if (q && !window.confirm(q)) { e.preventDefault(); return; }
      if (!b || b.getAttribute('formtarget') !== '_blank') dirty = false;
    });
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });
})();
