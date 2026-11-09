/* SSV – schlanker Supabase-Client (REST + Login), ohne Fremdbibliothek.
 * Eine gemeinsame Sitzung für Hafen-Manager, Mein SSV und Getränkekasse (localStorage „ssv-session“). */
(function () {
  'use strict';
  const K = window.SSV_HAFEN_KONFIG || {};
  if (K.modus !== 'supabase' || !K.supabaseUrl) { window.SSV_SB = null; return; }
  const URL = K.supabaseUrl.replace(/\/$/, ''); const KEY = K.supabaseAnonKey; const S = 'ssv-session';

  const lies = () => { try { return JSON.parse(localStorage.getItem(S)); } catch (e) { return null; } };
  const schreib = (s) => { try { if (s) localStorage.setItem(S, JSON.stringify(s)); else localStorage.removeItem(S); } catch (e) { /* egal */ } };

  async function jwt() {
    const s = lies(); if (!s) return null;
    if (s.expires_at * 1000 - Date.now() < 60e3) {
      const r = await fetch(URL + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) { schreib(null); return null; }
      const n = await r.json(); schreib(n); return n.access_token;
    }
    return s.access_token;
  }
  async function req(pfad, { method = 'GET', body, prefer, anon = false } = {}) {
    const t = anon ? null : await jwt();
    const h = { apikey: KEY, Authorization: 'Bearer ' + (t || KEY), 'Content-Type': 'application/json' };
    if (prefer) h.Prefer = prefer;
    let r;
    try { r = await fetch(URL + pfad, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch (e) { throw new Error('Keine Verbindung zum Server – bitte Internet prüfen und erneut versuchen.'); }
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = txt; }
    if (!r.ok) {
      const msg = (j && (j.message || j.msg || j.error_description)) || ('Fehler ' + r.status);
      throw Object.assign(new Error(r.status === 401 || r.status === 403 ? 'Keine Berechtigung – bitte neu anmelden. (' + msg + ')' : msg), { status: r.status });
    }
    return j;
  }
  async function auth(pfad, body) {
    const r = await fetch(URL + '/auth/v1/' + pfad, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = j.error_description || j.msg || j.message || '';
      if (/already|registered|exists/i.test(m)) throw new Error('Für diese E-Mail gibt es schon ein Konto – melde dich an oder nutze „Passwort vergessen?“.');
      if (/password/i.test(m) && /least|short|weak/i.test(m)) throw new Error('Das Passwort ist zu kurz oder zu einfach – bitte mindestens 8 Zeichen.');
      if (/rate|too many|seconds/i.test(m)) throw new Error('Zu viele Versuche – bitte in ein paar Minuten noch einmal.');
      if (/not confirmed/i.test(m)) throw new Error('Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail).');
      throw new Error(m || 'Anmeldung fehlgeschlagen');
    }
    return j;
  }

  window.SSV_SB = {
    url: URL,
    req, jwt,
    rpc: (fn, args = {}, anon = false) => req('/rest/v1/rpc/' + fn, { method: 'POST', body: args, anon }),
    async anmelden(email, passwort) {
      try { const s = await auth('token?grant_type=password', { email: email.trim(), password: passwort }); schreib(s); return s.user; }
      catch (e) { throw new Error(/invalid|credentials/i.test(e.message) ? 'E-Mail oder Passwort stimmt nicht – oder die E-Mail ist noch nicht bestätigt.' : e.message); }
    },
    /* Konto anlegen: Supabase schickt eine Bestätigungs-Mail; erst danach ist die Anmeldung möglich */
    async registrieren(email, passwort, zurueck) {
      const j = await auth('signup', { email: email.trim(), password: passwort, options: { emailRedirectTo: zurueck }, redirect_to: zurueck });
      if (j.access_token) schreib(j);
      return { sofort: !!j.access_token };
    },
    async passwortVergessen(email, zurueck) { await auth('recover', { email: email.trim(), redirect_to: zurueck }); },
    async abmelden() {
      const t = await jwt().catch(() => null);
      if (t) fetch(URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + t } }).catch(() => {});
      schreib(null);
    },
    angemeldet: async () => !!(await jwt()),
    nutzer: () => { const s = lies(); return s && s.user; },
    // ID des angemeldeten Kontos (aus dem Token – funktioniert auch nach Rücksprung aus einer E-Mail)
    uid() { const s = lies(); if (!s) return null; if (s.user && s.user.id) return s.user.id; try { return JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub; } catch (e) { return null; } },
    /* Rücksprung aus Bestätigungs-/Passwort-Mail: Tokens stehen im Adress-Fragment (#access_token=…) */
    ausAdresse() {
      const h = new URLSearchParams(location.hash.slice(1));
      if (!h.get('access_token')) return null;
      const s = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: Number(h.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(h.get('expires_in') || 3600), user: null };
      schreib(s); history.replaceState(null, '', location.pathname + location.search);
      return h.get('type') || 'login';
    },
    async passwortSetzen(neu) {
      const t = await jwt(); if (!t) throw new Error('Bitte erneut über den Link aus der E-Mail öffnen.');
      const r = await fetch(URL + '/auth/v1/user', { method: 'PUT', headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: neu }) });
      if (!r.ok) throw new Error('Passwort konnte nicht gespeichert werden.');
    }
  };
})();
