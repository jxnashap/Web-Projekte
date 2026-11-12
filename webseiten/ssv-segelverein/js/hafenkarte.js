/* Hafenkarte auf der Website: bettet die öffentliche Karte des Hafen-Managers ein (../ssv-hafen/hafenplan.html?einbetten=1).
 *
 * Die Karte zeigt nur „frei“ oder „belegt“ je Platz – keine Namen. Der Gast wählt einen Platz mit grüner Boje,
 * „Hier anmelden“ öffnet die Gast-Anmeldung, die Platznummer ist dort schon eingetragen.
 *
 * Die eingebettete Seite meldet ihre Höhe und ob die Karte verfügbar ist (postMessage, gleiche Herkunft).
 * Ist sie nicht verfügbar (Vorstand hat sie nicht eingeschaltet, Seite fehlt), verschwindet der ganze Abschnitt –
 * die Anmeldung über den Knopf oben bleibt.
 */
(function () {
  'use strict';
  var sek = document.querySelector('[data-hafenkarte]'); if (!sek) return;
  var rahmen = sek.querySelector('iframe'); if (!rahmen) return;
  var gemeldet = false;
  function weg() { if (sek.parentNode) sek.parentNode.removeChild(sek); }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== rahmen.contentWindow) return;   // nur die eigene Karte
    var d = e.data && e.data.ssvKarte; if (!d) return;
    gemeldet = true;
    if (d.zustand === 'aus' || d.zustand === 'fehler') return weg();
    if (d.hoehe > 100) rahmen.style.height = Math.ceil(d.hoehe) + 'px';
    sek.classList.add('bereit');
  });
  // Seite geladen, aber keine Meldung (z. B. Website ohne Hafen-Manager ausgeliefert): Abschnitt entfernen
  rahmen.addEventListener('load', function () { setTimeout(function () { if (!gemeldet) weg(); }, 4000); });
  rahmen.addEventListener('error', weg);
})();
