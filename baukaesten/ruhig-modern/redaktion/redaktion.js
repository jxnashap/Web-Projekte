/* Redaktion: Rückfragen, Hinweis bei ungespeicherten Änderungen, Foto-Vorschau + Verkleinern vor dem Upload */
(function () {
  'use strict';
  var form = document.getElementById('inhalte');
  var dirty = false;
  if (form) {
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('change', function () { dirty = true; });
  }

  // Rückfrage für jeden Knopf mit data-confirm (Veröffentlichen, Foto ersetzen, Wiederherstellen …)
  document.addEventListener('submit', function (e) {
    var b = e.submitter;
    var q = b && b.getAttribute('data-confirm');
    if (q && !window.confirm(q)) { e.preventDefault(); return; }
    if (e.target === form && (!b || b.getAttribute('formtarget') !== '_blank')) dirty = false;
    if (e.target.classList.contains('photo-form')) {
      // nicht „disabled" setzen – sonst fehlt der Knopf (aktion=foto) in den gesendeten Daten
      if (e.target.getAttribute('data-sending')) { e.preventDefault(); return; }
      e.target.setAttribute('data-sending', '1');
      if (b) { b.classList.add('is-busy'); b.textContent = 'Wird hochgeladen …'; }
    }
  });
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // Fotos: Zuschnitt-Vorschau; große Handyfotos vorher im Browser verkleinern (max. 2600 px und
  // unter der Upload-Grenze des Servers), damit der Upload schnell geht und nicht abgelehnt wird.
  var POS = { mitte: '50% 50%', oben: '50% 0%', unten: '50% 100%', links: '0% 50%', rechts: '100% 50%' };
  Array.prototype.forEach.call(document.querySelectorAll('form.photo-form'), function (f) {
    var input = f.querySelector('input[type=file]');
    var box = f.querySelector('.crop-preview');
    var img = box && box.querySelector('img');
    var focus = f.querySelector('select[name=fokus]');
    var btn = f.querySelector('button[value=foto]');
    var max = Math.min(parseInt(f.getAttribute('data-max'), 10) || 2e6, 20e6) * 0.92;
    var place = function () { if (img && focus) img.style.objectPosition = POS[focus.value] || '50% 50%'; };
    var busy = function (on) { if (btn) { btn.disabled = on; btn.textContent = on ? 'Foto wird vorbereitet …' : 'Foto ersetzen'; } };
    if (focus) focus.addEventListener('change', place);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (img) { img.src = URL.createObjectURL(file); box.hidden = false; place(); }
      if (!window.createImageBitmap || !window.DataTransfer || !/^image\//.test(file.type)) return;
      busy(true);
      createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
        var s = Math.min(1, 2600 / Math.max(bmp.width, bmp.height));
        if (s === 1 && file.size <= max) { busy(false); return; }   // passt schon – Original hochladen
        var c = document.createElement('canvas');
        c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        var tryQ = function (q) {
          c.toBlob(function (blob) {
            if (blob && blob.size > max && q > 0.5) { tryQ(q - 0.12); return; }
            if (blob) {
              var dt = new DataTransfer();
              dt.items.add(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
              input.files = dt.files;
            }
            busy(false);
          }, 'image/jpeg', q);
        };
        tryQ(0.88);
      }).catch(function () { busy(false); /* Format im Browser nicht lesbar → Original hochladen, der Server prüft */ });
    });
  });
})();
