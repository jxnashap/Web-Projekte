/* Druckansicht – im Datenbank-Modus erst die Daten der angemeldeten Person laden (Mitglied: nur eigene Rechnungen) */
(function () {
  'use strict';
  const HF = window.HAFEN, SB = window.SSV_SB;
  const los = () => { const s = document.createElement('script'); s.src = 'js/drucken.js'; document.body.appendChild(s); };
  if (!SB) return los();
  const ziel = document.getElementById('blaetter');
  const meldung = (t) => { ziel.innerHTML = '<p style="padding:40px;text-align:center">' + HF.H.esc(t) + '</p>'; };
  SB.angemeldet().then(async (ok) => {
    if (!ok) return meldung('Bitte zuerst anmelden (Hafen-Manager oder Mein SSV).');
    try { await HF.verbinden(new URLSearchParams(location.search).get('mein') ? { bereich: 'mitglied' } : {}); los(); }
    catch (e) { meldung('Laden fehlgeschlagen: ' + e.message); }
  });
})();
