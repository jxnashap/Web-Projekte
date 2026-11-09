/* Mein SSV – Start
 * Demo: sofort die Seite (Mitglied oben rechts wählen).
 * Vereinsdatenbank: Anmelden / Konto anlegen / Passwort vergessen, dann nur die eigenen Daten laden. */
(function () {
  'use strict';
  const HF = window.HAFEN, SB = window.SSV_SB, esc = HF.H.esc;
  const seite = () => { const s = document.createElement('script'); s.src = 'js/mein.js'; document.body.appendChild(s); };
  if (!SB) return seite();

  const main = document.getElementById('main');
  document.getElementById('wer').hidden = true;
  const unter = document.querySelector('.mein-kopf p'); if (unter) unter.textContent = 'Mitgliederbereich';
  const zurueck = location.origin + location.pathname;
  const rahmen = (inhalt) => '<div class="panel login-karte">' + inhalt + '</div>';

  let letzteMail = '';
  function ansicht(art, meldung, warn) {
    const titel = { login: 'Anmelden', neu: 'Konto anlegen', vergessen: 'Passwort vergessen', setzen: 'Neues Passwort' }[art];
    const info = {
      login: 'Melde dich mit der E-Mail-Adresse an, die beim Verein hinterlegt ist.',
      neu: 'Nimm die E-Mail-Adresse, die der Verein von dir hat. Du bekommst eine E-Mail zur Bestätigung – danach kannst du dich anmelden.',
      vergessen: 'Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst.',
      setzen: 'Leg jetzt dein neues Passwort fest (mindestens 8 Zeichen).'
    }[art];
    main.innerHTML = rahmen('<h1 style="font-size:26px;margin:0 0 6px">' + titel + '</h1><p style="color:var(--muted);margin:0 0 14px">' + info + '</p>' +
      '<form id="af" class="form" style="grid-template-columns:1fr">' +
      (art !== 'setzen' ? '<label class="feld">E-Mail<input name="email" type="email" autocomplete="username" required value="' + esc(letzteMail) + '"></label>' : '') +
      (art !== 'vergessen' ? '<label class="feld">Passwort<input name="pw" type="password" minlength="' + (art === 'login' ? 1 : 8) + '" autocomplete="' + (art === 'login' ? 'current-password' : 'new-password') + '" required></label>' : '') +
      '<button class="btn primaer" type="submit">' + { login: 'Anmelden', neu: 'Konto anlegen', vergessen: 'Link schicken', setzen: 'Passwort speichern' }[art] + '</button></form>' +
      (meldung ? '<p class="hinweis' + (warn ? ' fehler' : ' ok') + '" role="alert" style="margin-top:12px">' + esc(meldung) + '</p>' : '') +
      '<p class="login-links">' + (art === 'login' ? '<a href="#" data-a="neu">Noch kein Konto? Konto anlegen</a> · <a href="#" data-a="vergessen">Passwort vergessen?</a>' : '<a href="#" data-a="login">Zur Anmeldung</a>') + '</p>');
    main.querySelectorAll('[data-a]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); ansicht(a.dataset.a); }));
    const f = main.querySelector('#af');
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const b = f.querySelector('button'); b.disabled = true; if (f.email) letzteMail = f.email.value;
      try {
        if (art === 'login') { await SB.anmelden(f.email.value, f.pw.value); return laden(); }
        if (art === 'neu') { const r = await SB.registrieren(f.email.value, f.pw.value, zurueck); return r.sofort ? laden() : ansicht('login', 'Fast geschafft: Bitte bestätige die E-Mail, die wir dir gerade geschickt haben. Danach kannst du dich hier anmelden.'); }
        if (art === 'vergessen') { await SB.passwortVergessen(f.email.value, zurueck); return ansicht('login', 'Wenn die Adresse bei uns hinterlegt ist, kommt gleich eine E-Mail mit einem Link.'); }
        if (art === 'setzen') { await SB.passwortSetzen(f.pw.value); return laden(); }
      } catch (err) { ansicht(art, err.message, true); }
    });
    const erstes = f.querySelector(letzteMail && f.pw ? '[name=pw]' : 'input'); if (erstes) erstes.focus();
  }

  async function laden() {
    main.innerHTML = rahmen('<p>Deine Daten werden geladen …</p>');
    try { await HF.verbinden({ bereich: 'mitglied' }); } catch (e) {
      if (e.code === 'kein_mitglied') {
        main.innerHTML = rahmen('<h1 style="font-size:24px;margin:0 0 8px">Fast da</h1><p>Zu deiner E-Mail-Adresse <strong>' + esc((SB.nutzer() || {}).email || '') + '</strong> ist im Verein noch kein Mitglied hinterlegt. ' +
          'Bitte schreib kurz an <a href="mailto:' + esc(HF.STANDARD_EINSTELLUNGEN.verein_email) + '">' + esc(HF.STANDARD_EINSTELLUNGEN.verein_email) + '</a>, mit welcher Adresse du dich angemeldet hast – dann tragen wir sie bei dir ein.</p><div class="aktionen"><button class="btn" id="aus">Abmelden</button></div>');
        main.querySelector('#aus').addEventListener('click', () => SB.abmelden().then(() => ansicht('login')));
        return;
      }
      if (e.status === 401 || e.status === 403) { await SB.abmelden(); return ansicht('login', 'Bitte erneut anmelden.', true); }
      return ansicht('login', 'Laden fehlgeschlagen: ' + e.message, true);
    }
    // Mini-Hafenplan: Belegung anderer nur als Status, ohne Namen
    try {
      const status = await SB.rpc('hafen_platzstatus', { p_saison: HF.aktuelleSaison(), p_datum: HF.H.tag(new Date()) });
      const karte = new Map(status.map((x) => [x.platz_id, x.status]));
      HF.Q.statusWasser = (p) => karte.get(p.id) || 'frei';
    } catch (e) { /* Plan zeigt dann nur den eigenen Platz */ }
    const kopf = document.querySelector('.mein-kopf');
    if (kopf && !kopf.querySelector('#abmelden')) {
      const b = document.createElement('button'); b.id = 'abmelden'; b.className = 'btn'; b.textContent = 'Abmelden'; b.style.marginLeft = 'auto';
      b.addEventListener('click', () => SB.abmelden().then(() => location.reload())); kopf.appendChild(b);
    }
    seite();
  }

  const ruecksprung = SB.ausAdresse();   // aus Bestätigungs- oder Passwort-Mail
  if (ruecksprung === 'recovery') return ansicht('setzen');
  SB.angemeldet().then((ok) => (ok ? laden() : ansicht('login')));
})();
