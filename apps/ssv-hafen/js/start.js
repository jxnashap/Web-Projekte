/* SSV Hafen-Manager – Start
 * Demo: sofort die Oberfläche (Rolle wählen). Vereinsdatenbank: Anmeldung mit E-Mail + Passwort,
 * Rolle aus dem Konto (Tabelle funktionen), Daten laden, dann die Oberfläche starten. */
(function () {
  'use strict';
  const HF = window.HAFEN, SB = window.SSV_SB, esc = HF.H.esc;
  const oberflaeche = () => { const s = document.createElement('script'); s.src = 'js/app.js'; document.body.appendChild(s); };
  if (!SB) return oberflaeche();

  const ROLLEN = { vorstand: ['Vorstand', 'alles sehen und bearbeiten'], kassenwart: ['Kassenwart', 'Abrechnung, Lastschrift, Gebühren, Bankdaten'],
    brueckenwart: ['Brückenwartin', 'Belegung, Boote, Warteliste, Ein-/Auslagern'], hafenmeister: ['Hafenmeister', 'Hafenplan, Gastlieger, Abwesenheiten, Kran'] };
  const login = document.getElementById('login'); const box = login.querySelector('.karte-login');
  const kopf = '<svg class="stander" style="color:#0E1B45"><use href="#stander"/></svg><h1>Hafen-Manager</h1><p style="color:var(--muted);margin:0">Schwartauer Segler-Verein e.V.</p>';
  const fuss = '<p style="margin:16px 0 0;font-size:13px"><a href="mein-ssv.html">Mitglied? Zu „Mein SSV“ →</a></p>';
  login.hidden = false;

  function formular(fehler) {
    box.innerHTML = kopf + '<form id="lf" class="form" style="grid-template-columns:1fr;margin-top:16px">' +
      '<label class="feld">E-Mail<input name="email" type="email" autocomplete="username" required></label>' +
      '<label class="feld">Passwort<input name="pw" type="password" autocomplete="current-password" required></label>' +
      '<button class="btn primaer" type="submit">Anmelden</button></form>' +
      '<p class="hinweis' + (fehler ? ' warn' : '') + '" id="lf-info" style="margin-top:12px">' + esc(fehler || 'Zugang für Vorstand, Kassenwart, Brückenwartin und Hafenmeister. Konten vergibt der Vorstand.') + '</p>' + fuss;
    box.querySelector('#lf').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target; const knopf = f.querySelector('button'); knopf.disabled = true; knopf.textContent = 'Anmelden …';
      try { await SB.anmelden(f.email.value, f.pw.value); await weiter(); } catch (err) { formular(err.message); }
    });
    box.querySelector('input').focus();
  }
  async function weiter() {
    box.innerHTML = kopf + '<p style="margin-top:18px">Daten werden geladen …</p>';
    try { await HF.verbinden(); } catch (e) {
      if (e.status === 401 || e.status === 403) { await SB.abmelden(); return formular('Bitte erneut anmelden.'); }
      return formular('Laden fehlgeschlagen: ' + e.message);
    }
    const rollen = HF.db.rollen.filter((r) => ROLLEN[r]);
    if (!rollen.length) {
      box.innerHTML = kopf + '<p class="hinweis warn" style="margin-top:16px">Dieses Konto hat keinen Zugang zum Hafen-Manager. Mitglieder finden ihre Daten in „Mein SSV“.</p>' +
        '<div class="aktionen" style="margin-top:12px"><a class="btn primaer" href="mein-ssv.html">Zu Mein SSV</a><button class="btn" id="aus">Abmelden</button></div>';
      box.querySelector('#aus').addEventListener('click', () => SB.abmelden().then(() => location.reload()));
      return;
    }
    let rolle = null; try { rolle = sessionStorage.getItem('ssv-hafen-rolle'); } catch (e) { /* egal */ }
    if (!rollen.includes(rolle)) rolle = rollen.length === 1 ? rollen[0] : null;
    if (!rolle) {
      box.innerHTML = kopf + '<p class="hinweis" style="margin-top:14px">Du hast mehrere Aufgaben im Verein. Womit möchtest du arbeiten?</p><div class="rollen" id="rollen-db">' +
        rollen.map((r) => '<button data-r="' + r + '"><strong>' + ROLLEN[r][0] + '</strong><span>' + ROLLEN[r][1] + '</span></button>').join('') + '</div>';
      box.querySelector('#rollen-db').addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; try { sessionStorage.setItem('ssv-hafen-rolle', b.dataset.r); } catch (x) { /* egal */ } oberflaeche(); });
      return;
    }
    try { sessionStorage.setItem('ssv-hafen-rolle', rolle); } catch (e) { /* egal */ }
    oberflaeche();
  }
  SB.angemeldet().then((ok) => (ok ? weiter() : formular()));
})();
