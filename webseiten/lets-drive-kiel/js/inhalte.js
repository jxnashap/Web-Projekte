/* Let's Drive Kiel · Inhalte aus der Redaktion auf die Seite bringen
   Aufgerufen von js/cms-kern.js mit dem gespeicherten Stand (daten/inhalte.json) oder der Vorschau.
   Tauscht nur Stellen mit data-cms="…", setzt Texte nur per textContent.
   Die Formatierung entspricht 1:1 build_letsdrive.py (statische Grundfassung).
   Erzeugt von build_letsdrive.py aus generatoren/inhalte_letsdrive.js. */
(function () {
  'use strict';
  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  var KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var ADV = ['sonntags', 'montags', 'dienstags', 'mittwochs', 'donnerstags', 'freitags', 'samstags'];
  var EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var ANZAHL = ['', 'Einmal pro Woche', 'Zweimal pro Woche', 'Dreimal pro Woche', 'Viermal pro Woche',
    'Fünfmal pro Woche', 'Sechsmal pro Woche', 'Jeden Tag'];
  var NB = ' ';
  var ZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;
  var LINK_OK = /^(tel:\+?[0-9]+|[a-z0-9-]+\.html(#[a-z0-9-]+)?)$/i;

  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function leere(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function neu(tag, text, cls) {
    var n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function setze(key, text) {
    $$('[data-cms="' + key + '"]').forEach(function (n) { if (n.textContent !== text) n.textContent = text; });
  }
  function setzeZeit(key, hhmm) {
    $$('[data-cms="' + key + '"]').forEach(function (n) {
      if (n.textContent !== hhmm) n.textContent = hhmm;
      if (n.tagName === 'TIME') n.setAttribute('datetime', hhmm);
    });
  }

  /* ---- Formatierung (gleich wie im Generator) ---- */
  function sortiere(tage) {
    var gesehen = {};
    return (tage || []).map(Number).filter(function (t) {
      if (!(t >= 0 && t <= 6) || gesehen[t]) return false;
      gesehen[t] = 1;
      return true;
    }).sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); });
  }
  function laeufe(tage) {
    var r = [];
    sortiere(tage).forEach(function (t) {
      var l = r[r.length - 1];
      if (l && ORDER.indexOf(t) === ORDER.indexOf(l[l.length - 1]) + 1) l.push(t); else r.push([t]);
    });
    return r;
  }
  function teile(tage, namen, bis) {
    var out = [];
    laeufe(tage).forEach(function (l) {
      if (l.length >= 3) out.push(namen[l[0]] + bis + namen[l[l.length - 1]]);
      else l.forEach(function (t) { out.push(namen[t]); });
    });
    return out;
  }
  function verbinde(liste, und) {
    return liste.length < 2 ? liste.join('') : liste.slice(0, -1).join(', ') + und + liste[liste.length - 1];
  }
  function tageLabel(tage) { return teile(tage, KURZ, '–').join(', '); }
  function tageLang(tage) { return verbinde(teile(tage, ADV, ' bis '), ' und '); }
  function tageKurz(tage) { return verbinde(teile(tage, KURZ, '–'), ' & '); }
  function gross(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function minuten(hhmm) { return +hhmm.slice(0, 2) * 60 + +hhmm.slice(3); }
  function zeitKurz(hhmm) { return hhmm.slice(3) === '00' ? String(+hhmm.slice(0, 2)) : hhmm; }
  function heute() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date()); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  }
  function datumLang(iso) {
    var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    return LANG[d.getDay()] + ', ' + iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
  }
  function gueltig(e) { return e && ZEIT.test(e.von || '') && ZEIT.test(e.bis || '') && e.bis > e.von; }

  /* ---- Hinweis oben auf jeder Seite ---- */
  function hinweis(h) {
    var an = !!(h.aktiv && h.text);
    $$('[data-cms="hinweis"]').forEach(function (box) {
      var p = box.querySelector('p') || box.appendChild(neu('p'));
      leere(p);
      box.hidden = !an;
      if (!an) return;
      p.appendChild(document.createTextNode(h.text + ' '));
      if (h.link && LINK_OK.test(h.link)) {
        var a = neu('a', h.link_text || 'Mehr erfahren');
        a.href = h.link;
        p.appendChild(a);
      }
    });
  }

  /* ---- Bürozeiten: Liste, Kurzfassung im Menü, strukturierte Daten ---- */
  function buero(liste) {
    var e = liste.filter(function (x) { return gueltig(x) && sortiere(x.tage).length; });
    if (!e.length) return;
    var offen = {};
    e.forEach(function (x) { sortiere(x.tage).forEach(function (t) { offen[t] = 1; }); });
    var zu = ORDER.filter(function (t) { return !offen[t]; });

    $$('dl.hours[data-cms="buerozeiten"]').forEach(function (dl) {
      leere(dl);
      e.forEach(function (x) {
        var row = neu('div');
        row.setAttribute('data-days', sortiere(x.tage).join(','));
        row.setAttribute('data-from', x.von);
        row.setAttribute('data-to', x.bis);
        row.appendChild(neu('dt', tageLabel(x.tage)));
        row.appendChild(neu('dd', x.von + NB + '– ' + x.bis + NB + 'Uhr'));
        dl.appendChild(row);
      });
      if (zu.length) {
        var r = neu('div');
        r.setAttribute('data-days', zu.join(','));
        r.appendChild(neu('dt', tageLabel(zu)));
        r.appendChild(neu('dd', 'geschlossen'));
        dl.appendChild(r);
      }
    });
    setze('buerozeiten-kurz', e.map(function (x) {
      return tageLabel(x.tage) + ' ' + zeitKurz(x.von) + '–' + zeitKurz(x.bis) + NB + 'Uhr';
    }).join(' · '));

    $$('script[type="application/ld+json"]').forEach(function (s) {
      try {
        var j = JSON.parse(s.textContent);
        if (!j.openingHoursSpecification) return;
        j.openingHoursSpecification = e.map(function (x) {
          return { '@type': 'OpeningHoursSpecification', dayOfWeek: sortiere(x.tage).map(function (t) { return EN[t]; }), opens: x.von, closes: x.bis };
        });
        s.textContent = JSON.stringify(j);
      } catch (x) { /* unverändert lassen */ }
    });
  }

  /* ---- Theorieunterricht ---- */
  function theorie(t) {
    var tage = sortiere(t.tage);
    if (tage.length && gueltig(t)) {
      setze('theorie-tage-lang', tageLang(tage));
      setze('theorie-tage-lang-gross', gross(tageLang(tage)));
      setze('theorie-tage-kurz', tageKurz(tage));
      setze('theorie-anzahl', ANZAHL[tage.length]);
      setze('theorie-dauer', (minuten(t.bis) - minuten(t.von)) + NB + 'Minuten');
      setzeZeit('theorie-von', t.von);
      setzeZeit('theorie-bis', t.bis);
      $$('[data-cms="theorie-chips"]').forEach(function (ul) {
        leere(ul);
        ORDER.forEach(function (d) {
          var an = tage.indexOf(d) > -1;
          if (d === 6 || d === 0) { if (!an) return; }
          ul.appendChild(neu('li', KURZ[d], 'day-chip' + (an ? ' is-active' : '')));
        });
      });
    }
    $$('[data-cms="theorie-hinweis"]').forEach(function (p) {
      p.textContent = t.hinweis || '';
      p.hidden = !t.hinweis;
    });
  }

  /* ---- Motorrad-Termine: nur kommende, sortiert ---- */
  function motorrad(liste) {
    var h = heute();
    var kommend = liste.filter(function (x) {
      return x && /^\d{4}-\d{2}-\d{2}$/.test(x.datum || '') && x.datum >= h && gueltig(x);
    }).sort(function (a, b) { return (a.datum + a.von).localeCompare(b.datum + b.von); });
    $$('[data-cms="motorrad"]').forEach(function (ul) {
      leere(ul);
      kommend.forEach(function (x) {
        var li = neu('li');
        var tm = neu('time', datumLang(x.datum));
        tm.setAttribute('datetime', x.datum);
        li.appendChild(tm);
        li.appendChild(neu('span', x.von + NB + '– ' + x.bis + NB + 'Uhr', 'termin-zeit'));
        if (x.titel) li.appendChild(neu('span', x.titel, 'termin-titel'));
        ul.appendChild(li);
      });
      ul.hidden = !kommend.length;
    });
    $$('[data-cms="motorrad-leer"]').forEach(function (p) { p.hidden = kommend.length > 0; });
  }

  /* ---- Stellenanzeige an/aus ---- */
  function stelle(s) {
    var an = !!s.aktiv;
    $$('[data-cms="stelle-an"]').forEach(function (n) { n.hidden = !an; });
    $$('[data-cms="stelle-aus"]').forEach(function (n) { n.hidden = an; });
    if (s.klassen) setze('stelle-klassen', s.klassen);
  }

  window.CMS_RENDER = function (d) {
    if (d.hinweis && typeof d.hinweis === 'object') hinweis(d.hinweis);
    if (Array.isArray(d.buerozeiten)) buero(d.buerozeiten);
    if (d.theorie && typeof d.theorie === 'object') theorie(d.theorie);
    if (Array.isArray(d.motorrad)) motorrad(d.motorrad);
    if (d.stelle && typeof d.stelle === 'object') stelle(d.stelle);
  };
})();
