/* SSV Getränkekasse – Datenschicht
 *
 * Eine Schnittstelle, zwei Speicher:
 *   DemoSpeicher      – localStorage, mit Beispieldaten (zum Ausprobieren)
 *   SupabaseSpeicher  – zentrale Datenbank über REST/RPC (supabase/schema.sql)
 * Alle Methoden sind async und liefern dieselben Datenformen.
 */
(function () {
  'use strict';

  const K = window.SSV_KONFIG || { modus: 'demo' };
  const ct = (v) => Math.round(Number(v) * 100);
  const eur = (c) => Math.round(c) / 100;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const tag = (d) => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
      }));

  const STANDARD_EINSTELLUNGEN = {
    verein_name: 'Schwartauer Segler-Verein e.V.',
    verein_strasse: 'Zur Teerhofsinsel 5B',
    verein_ort: '23554 Lübeck',
    verein_email: 'info@ssv-net.de',
    steuernummer: '22 290 72188',
    bank: '[PLATZHALTER Bank]',
    iban: '',
    bic: '',
    zahlungsziel_tage: 14,
    rechnung_praefix: 'SSV-G',
    steuerhinweis: '[PLATZHALTER: Umsatzsteuer-Hinweis mit Kassenwart/Steuerberater abstimmen]',
    sepa_text: 'Der Rechnungsbetrag wird zum Fälligkeitsdatum per SEPA-Lastschrift von Ihrem Konto eingezogen.',
    fusstext: 'Vielen Dank – und allzeit gute Fahrt!',
    storno_minuten: 15,
    abmelden_sekunden: 60
  };

  /* Zufalls-PIN ohne allzu naheliegende Muster */
  function zufallsPin() {
    const schlecht = /^(\d)\1{3}$|^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210|1212|2580)$/;
    let p;
    do {
      const a = new Uint32Array(1); crypto.getRandomValues(a);
      p = pad(a[0] % 10000, 4);
    } while (schlecht.test(p));
    return p;
  }

  /* Verdichtet Buchungen zu Rechnungspositionen */
  function verdichten(buchungen) {
    const map = new Map();
    buchungen.forEach((b) => {
      const k = b.produkt_name + '|' + b.einheit + '|' + b.einzelpreis;
      const p = map.get(k) || { name: b.produkt_name, einheit: b.einheit, einzelpreis: b.einzelpreis, anzahl: 0, stueck: 0, betrag: 0 };
      p.anzahl += b.anzahl; p.stueck += b.stueck; p.betrag = eur(ct(p.betrag) + ct(b.betrag));
      map.set(k, p);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de') || a.einheit.localeCompare(b.einheit));
  }

  /* ======================================================== Demo-Speicher */
  class DemoSpeicher {
    constructor() { this.modus = 'demo'; this.KEY = 'ssvg-demo-v1'; this._laden(); }

    _laden() {
      try { this.d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { this.d = null; }
      if (!this.d || !this.d.version) this.d = this._beispieldaten();
    }
    _sichern() { localStorage.setItem(this.KEY, JSON.stringify(this.d)); }
    zuruecksetzen() { localStorage.removeItem(this.KEY); this._laden(); }

    _beispieldaten() {
      const namen = [
        ['Anna', 'Albers'], ['Bernd', 'Brandt'], ['Clara', 'Claußen'], ['Dirk', 'Dahl'], ['Elke', 'Evers'],
        ['Frank', 'Fiedler'], ['Greta', 'Grote'], ['Hannes', 'Hinz'], ['Ida', 'Iversen'], ['Jan', 'Jessen'],
        ['Karin', 'Krüger'], ['Lars', 'Lorenzen'], ['Maren', 'Möller'], ['Nils', 'Nissen'], ['Ole', 'Ohlsen'],
        ['Petra', 'Paulsen'], ['Rolf', 'Rasmussen'], ['Sina', 'Schröder'], ['Timo', 'Thiessen'], ['Ute', 'Urban'],
        ['Volker', 'Voigt'], ['Wiebke', 'Wulf'], ['Svenja', 'Sievers'], ['Henning', 'Hansen']
      ];
      const orte = ['Bad Schwartau', 'Lübeck', 'Stockelsdorf', 'Ratekau'];
      const mitglieder = namen.map(([v, n], i) => ({
        id: uuid(), nr: String(1001 + i), vorname: v, nachname: n,
        email: (v + '.' + n).toLowerCase().replace(/ß/g, 'ss').replace(/ü/g, 'ue').replace(/ö/g, 'oe') + '@beispiel.de',
        strasse: 'Beispielweg ' + (i + 3), plz: '2361' + (i % 10), ort: orte[i % orte.length],
        sepa: i % 3 !== 0, notiz: '', aktiv: true, pin: '1234', fehlversuche: 0, gesperrt_bis: null
      }));
      const P = (name, emoji, farbe, preis, kg, kp, sort) => ({ id: uuid(), name, emoji, farbe, preis, kasten_groesse: kg, kasten_preis: kp, sort, aktiv: true });
      const produkte = [
        P('Pils 0,33 l', '🍺', '#e0a526', 1.5, 24, 30, 1),
        P('Radler 0,33 l', '🍋', '#d9c23c', 1.5, 24, 30, 2),
        P('Alkoholfrei 0,33 l', '🌾', '#8fae3b', 1.5, 24, 30, 3),
        P('Cola 0,33 l', '🥤', '#b2272d', 1.2, 24, 24, 4),
        P('Apfelschorle 0,5 l', '🍏', '#4f9a3c', 1.2, 12, 12, 5),
        P('Wasser 0,7 l', '💧', '#2f7fc1', 1.0, 12, 10, 6),
        P('Kaffee', '☕', '#6b4a32', 1.0, null, null, 7),
        P('Sekt 0,2 l', '🥂', '#c79a5b', 3.0, null, null, 8)
      ];
      // Buchungsverlauf der letzten ~10 Wochen (deterministischer Zufall)
      let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const buchungen = []; const jetzt = Date.now();
      for (let i = 0; i < 260; i++) {
        const m = mitglieder[Math.floor(rnd() * mitglieder.length)];
        const p = produkte[Math.floor(rnd() * 6.6)];
        const kasten = p.kasten_groesse && rnd() < 0.06;
        const anzahl = kasten ? 1 : 1 + Math.floor(rnd() * rnd() * 4);
        const zeit = new Date(jetzt - rnd() * 70 * 864e5);
        zeit.setHours(11 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
        if (zeit.getTime() > jetzt) continue;
        const ep = kasten ? p.kasten_preis : p.preis;
        buchungen.push({
          id: uuid(), mitglied_id: m.id, produkt_id: p.id, produkt_name: p.name, einheit: kasten ? 'kasten' : 'stk',
          anzahl, stueck: anzahl * (kasten ? p.kasten_groesse : 1), einzelpreis: ep, betrag: eur(ct(ep) * anzahl),
          zeit: zeit.toISOString(), quelle: 'kasse', storniert_am: null, rechnung_id: null
        });
      }
      buchungen.sort((a, b) => a.zeit.localeCompare(b.zeit));
      return { version: 1, mitglieder, produkte, buchungen, rechnungen: [], einstellungen: { ...STANDARD_EINSTELLUNGEN, bank: 'Demo-Bank [PLATZHALTER]', iban: 'DE02 1203 0000 0000 2020 51' }, admin: { email: 'kassenwart@demo', passwort: 'demo' } };
    }

    _m(id) { return this.d.mitglieder.find((m) => m.id === id); }
    _summen(mid) {
      const jetzt = new Date(); let monat = 0, offen = 0;
      this.d.buchungen.forEach((b) => {
        if (b.mitglied_id !== mid || b.storniert_am) return;
        const z = new Date(b.zeit);
        if (z.getFullYear() === jetzt.getFullYear() && z.getMonth() === jetzt.getMonth()) monat += ct(b.betrag);
        if (!b.rechnung_id) offen += ct(b.betrag);
      });
      return { monat_summe: eur(monat), offen_summe: eur(offen) };
    }
    _pruefen(mid, pin) {
      const m = this._m(mid);
      if (!m || !m.aktiv || !m.pin) return { ok: false, fehler: 'mitglied' };
      if (m.gesperrt_bis && new Date(m.gesperrt_bis) > new Date()) return { ok: false, fehler: 'gesperrt', gesperrt_bis: m.gesperrt_bis };
      if (m.pin !== pin) {
        const n = m.fehlversuche + 1;
        m.fehlversuche = n >= 5 ? 0 : n;
        m.gesperrt_bis = n >= 5 ? new Date(Date.now() + 5 * 60e3).toISOString() : null;
        this._sichern();
        return { ok: false, fehler: 'pin', rest: Math.max(0, 5 - n) };
      }
      if (m.fehlversuche || m.gesperrt_bis) { m.fehlversuche = 0; m.gesperrt_bis = null; this._sichern(); }
      return null;
    }
    _buchen(mid, posten, quelle, zeit) {
      if (!Array.isArray(posten) || !posten.length) throw new Error('Keine Posten');
      let summe = 0; const neu = [];
      posten.forEach((po) => {
        const p = this.d.produkte.find((x) => x.id === po.produkt_id && x.aktiv);
        if (!p) throw new Error('Produkt nicht verfügbar');
        const kasten = po.einheit === 'kasten';
        if (kasten && !p.kasten_groesse) throw new Error('Kein Kasten für ' + p.name);
        const anzahl = Math.max(1, Math.min(99, parseInt(po.anzahl, 10) || 1));
        const ep = kasten ? p.kasten_preis : p.preis;
        neu.push({
          id: uuid(), mitglied_id: mid, produkt_id: p.id, produkt_name: p.name, einheit: kasten ? 'kasten' : 'stk',
          anzahl, stueck: anzahl * (kasten ? p.kasten_groesse : 1), einzelpreis: ep, betrag: eur(ct(ep) * anzahl),
          zeit: (zeit ? new Date(zeit) : new Date()).toISOString(), quelle, storniert_am: null, rechnung_id: null
        });
        summe += ct(ep) * anzahl;
      });
      this.d.buchungen.push(...neu); this._sichern();
      return eur(summe);
    }

    /* ---- Kasse ---- */
    async kasseStatus() { return { eingerichtet: true, name: 'Demo-Kasse' }; }
    async kasseMitglieder() {
      return this.d.mitglieder.filter((m) => m.aktiv && m.pin)
        .map(({ id, vorname, nachname }) => ({ id, vorname, nachname }))
        .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
    }
    async kasseProdukte() { return this.d.produkte.filter((p) => p.aktiv).sort((a, b) => a.sort - b.sort); }
    async kasseLogin(mid, pin) {
      const f = this._pruefen(mid, pin); if (f) return f;
      const m = this._m(mid);
      return { ok: true, vorname: m.vorname, nachname: m.nachname, ...this._summen(mid) };
    }
    async kasseBuchen(mid, pin, posten) {
      const f = this._pruefen(mid, pin); if (f) return f;
      const summe = this._buchen(mid, posten, 'kasse');
      return { ok: true, summe, ...this._summen(mid) };
    }
    async kasseVerlauf(mid, pin) {
      const f = this._pruefen(mid, pin); if (f) return f;
      const grenze = Date.now() - this.d.einstellungen.storno_minuten * 60e3;
      const liste = this.d.buchungen.filter((b) => b.mitglied_id === mid)
        .sort((a, b) => b.zeit.localeCompare(a.zeit)).slice(0, 15)
        .map((b) => ({ ...b, storniert: !!b.storniert_am, stornierbar: !b.storniert_am && !b.rechnung_id && new Date(b.zeit).getTime() > grenze }));
      return { ok: true, buchungen: liste };
    }
    async kasseStorno(mid, pin, bid) {
      const f = this._pruefen(mid, pin); if (f) return f;
      const b = this.d.buchungen.find((x) => x.id === bid && x.mitglied_id === mid);
      const grenze = Date.now() - this.d.einstellungen.storno_minuten * 60e3;
      if (!b || b.storniert_am || b.rechnung_id || new Date(b.zeit).getTime() <= grenze) return { ok: false, fehler: 'storno' };
      b.storniert_am = new Date().toISOString(); this._sichern();
      return { ok: true, ...this._summen(mid) };
    }

    /* ---- Verwaltung ---- */
    async anmelden(email, pw) {
      if (email.trim().toLowerCase() === this.d.admin.email && pw === this.d.admin.passwort) {
        sessionStorage.setItem('ssvg-demo-admin', '1'); return true;
      }
      throw new Error('E-Mail oder Passwort falsch.');
    }
    async abmelden() { sessionStorage.removeItem('ssvg-demo-admin'); }
    async angemeldet() { return sessionStorage.getItem('ssvg-demo-admin') === '1'; }

    async mitglieder() {
      return this.d.mitglieder.map(({ pin, ...m }) => ({ ...m, hat_pin: !!pin }))
        .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
    }
    async mitgliedSpeichern(m) {
      const felder = ['nr', 'vorname', 'nachname', 'email', 'strasse', 'plz', 'ort', 'sepa', 'notiz', 'aktiv'];
      let z = m.id && this._m(m.id);
      if (!z) { z = { id: uuid(), pin: null, fehlversuche: 0, gesperrt_bis: null, aktiv: true, sepa: false }; this.d.mitglieder.push(z); }
      felder.forEach((f) => { if (f in m) z[f] = m[f]; });
      this._sichern(); return { ...z, pin: undefined, hat_pin: !!z.pin };
    }
    async mitgliedLoeschen(id) {
      if (this.d.buchungen.some((b) => b.mitglied_id === id)) { this._m(id).aktiv = false; this._sichern(); return 'deaktiviert'; }
      this.d.mitglieder = this.d.mitglieder.filter((m) => m.id !== id); this._sichern(); return 'geloescht';
    }
    async pinSetzen(id, pin) {
      if (!/^\d{4}$/.test(pin)) throw new Error('PIN muss vierstellig sein');
      const m = this._m(id); m.pin = pin; m.fehlversuche = 0; m.gesperrt_bis = null; this._sichern();
    }

    async produkte() { return [...this.d.produkte].sort((a, b) => a.sort - b.sort); }
    async produktSpeichern(p) {
      let z = p.id && this.d.produkte.find((x) => x.id === p.id);
      if (!z) { z = { id: uuid(), aktiv: true, sort: this.d.produkte.length + 1 }; this.d.produkte.push(z); }
      Object.assign(z, p, { id: z.id }); this._sichern(); return z;
    }
    async produktLoeschen(id) {
      const p = this.d.produkte.find((x) => x.id === id);
      if (this.d.buchungen.some((b) => b.produkt_id === id)) { p.aktiv = false; this._sichern(); return 'deaktiviert'; }
      this.d.produkte = this.d.produkte.filter((x) => x.id !== id); this._sichern(); return 'geloescht';
    }

    async buchungen({ von, bis, mitglied_id, rechnung_ids } = {}) {
      return this.d.buchungen.filter((b) => {
        if (rechnung_ids) return rechnung_ids.includes(b.rechnung_id);
        const t = tag(b.zeit);
        return (!von || t >= von) && (!bis || t <= bis) && (!mitglied_id || b.mitglied_id === mitglied_id);
      }).sort((a, b) => b.zeit.localeCompare(a.zeit));
    }
    async buchungStornieren(id) {
      const b = this.d.buchungen.find((x) => x.id === id);
      if (!b || b.rechnung_id) throw new Error('Bereits abgerechnete Buchungen bitte über die Rechnung stornieren.');
      b.storniert_am = new Date().toISOString(); this._sichern();
    }
    async buchungNachtragen(mid, posten, zeit) { return this._buchen(mid, posten, 'nachtrag', zeit); }

    async rechnungen() { return [...this.d.rechnungen].sort((a, b) => b.nr.localeCompare(a.nr)); }
    async rechnungenLaden(ids) { return this.d.rechnungen.filter((r) => ids.includes(r.id)); }
    async rechnungenErstellen(von, bis, datum) {
      if (von > bis) throw new Error('Zeitraum ungültig');
      const e = this.d.einstellungen; const jahr = datum.slice(0, 4); const praefix = e.rechnung_praefix || 'SSV-G';
      let lfd = this.d.rechnungen.filter((r) => r.nr.startsWith(praefix + '-' + jahr + '-'))
        .reduce((mx, r) => Math.max(mx, parseInt(r.nr.split('-').pop(), 10)), 0);
      const offen = this.d.buchungen.filter((b) => !b.rechnung_id && !b.storniert_am && tag(b.zeit) >= von && tag(b.zeit) <= bis);
      const proMitglied = new Map();
      offen.forEach((b) => { if (!proMitglied.has(b.mitglied_id)) proMitglied.set(b.mitglied_id, []); proMitglied.get(b.mitglied_id).push(b); });
      const reihenfolge = [...proMitglied.keys()].map((id) => this._m(id))
        .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'));
      const faellig = new Date(datum); faellig.setDate(faellig.getDate() + Number(e.zahlungsziel_tage || 14));
      reihenfolge.forEach((m) => {
        const bs = proMitglied.get(m.id); lfd += 1;
        const r = {
          id: uuid(), nr: praefix + '-' + jahr + '-' + pad(lfd, 4), mitglied_id: m.id, datum, von, bis, faellig: tag(faellig),
          summe: eur(bs.reduce((s, b) => s + ct(b.betrag), 0)),
          empfaenger: { nr: m.nr, vorname: m.vorname, nachname: m.nachname, strasse: m.strasse, plz: m.plz, ort: m.ort, email: m.email },
          positionen: verdichten(bs), sepa: !!m.sepa, bezahlt_am: null, storniert_am: null, erstellt: new Date().toISOString()
        };
        this.d.rechnungen.push(r); bs.forEach((b) => { b.rechnung_id = r.id; });
      });
      this._sichern(); return reihenfolge.length;
    }
    async rechnungBezahlt(id, datum) { const r = this.d.rechnungen.find((x) => x.id === id); r.bezahlt_am = datum; this._sichern(); }
    async rechnungStornieren(id) {
      const r = this.d.rechnungen.find((x) => x.id === id); if (!r || r.storniert_am) return;
      r.storniert_am = new Date().toISOString();
      this.d.buchungen.forEach((b) => { if (b.rechnung_id === id) b.rechnung_id = null; });
      this._sichern();
    }

    async einstellungen() { return { ...STANDARD_EINSTELLUNGEN, ...this.d.einstellungen }; }
    async einstellungenSpeichern(e) { this.d.einstellungen = { ...this.d.einstellungen, ...e }; this._sichern(); }
    async kasseEinrichten() { return true; }

    /* Sicherung (nur Demo) */
    async sicherungExport() { return JSON.stringify(this.d, null, 1); }
    async sicherungImport(text) { const d = JSON.parse(text); if (!d.version) throw new Error('Keine gültige Sicherung'); this.d = d; this._sichern(); }
  }

  /* ==================================================== Supabase-Speicher */
  class SupabaseSpeicher {
    constructor(url, key) {
      this.modus = 'supabase'; this.url = url.replace(/\/$/, ''); this.key = key;
      this.TOKEN = 'ssvg-kasse-token'; this.SESSION = 'ssvg-session';
    }
    _session() { try { return JSON.parse(localStorage.getItem(this.SESSION)); } catch (e) { return null; } }
    async _jwt() {
      const s = this._session(); if (!s) return null;
      if (s.expires_at * 1000 - Date.now() < 60e3) {
        const r = await fetch(this.url + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: s.refresh_token })
        });
        if (!r.ok) { localStorage.removeItem(this.SESSION); return null; }
        const n = await r.json(); localStorage.setItem(this.SESSION, JSON.stringify(n)); return n.access_token;
      }
      return s.access_token;
    }
    async _req(pfad, { method = 'GET', body, prefer, admin = true } = {}) {
      const jwt = admin ? await this._jwt() : null;
      const h = { apikey: this.key, Authorization: 'Bearer ' + (jwt || this.key), 'Content-Type': 'application/json' };
      if (prefer) h.Prefer = prefer;
      let r;
      try { r = await fetch(this.url + pfad, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
      catch (e) { throw new Error('Keine Verbindung zum Server – bitte WLAN prüfen und erneut versuchen.'); }
      const t = await r.text(); const j = t ? JSON.parse(t) : null;
      if (!r.ok) throw new Error((j && (j.message || j.msg || j.error_description)) || ('Fehler ' + r.status));
      return j;
    }
    _rpc(fn, args, admin = true) { return this._req('/rest/v1/rpc/' + fn, { method: 'POST', body: args, admin }); }
    get _tok() { return localStorage.getItem(this.TOKEN); }

    /* ---- Kasse ---- */
    async kasseStatus() { return { eingerichtet: !!this._tok, name: localStorage.getItem(this.TOKEN + '-name') || '' }; }
    kasseMitglieder() { return this._rpc('kasse_mitglieder', { p_token: this._tok }, false); }
    async kasseProdukte() { return (await this._rpc('kasse_produkte', { p_token: this._tok }, false)).map(this._zahlen); }
    async kasseLogin(mid, pin) { return this._zahlenSumme(await this._rpc('kasse_login', { p_token: this._tok, p_mitglied: mid, p_pin: pin }, false)); }
    async kasseBuchen(mid, pin, posten) { return this._zahlenSumme(await this._rpc('kasse_buchen', { p_token: this._tok, p_mitglied: mid, p_pin: pin, p_posten: posten }, false)); }
    async kasseVerlauf(mid, pin) {
      const r = await this._rpc('kasse_verlauf', { p_token: this._tok, p_mitglied: mid, p_pin: pin }, false);
      if (r.buchungen) r.buchungen = r.buchungen.map(this._zahlen); return r;
    }
    async kasseStorno(mid, pin, bid) { return this._zahlenSumme(await this._rpc('kasse_storno', { p_token: this._tok, p_mitglied: mid, p_pin: pin, p_buchung: bid }, false)); }
    _zahlen(o) {
      ['preis', 'kasten_preis', 'betrag', 'einzelpreis', 'summe'].forEach((k) => { if (o[k] != null) o[k] = Number(o[k]); });
      return o;
    }
    _zahlenSumme(o) { ['summe', 'monat_summe', 'offen_summe'].forEach((k) => { if (o[k] != null) o[k] = Number(o[k]); }); return o; }

    /* ---- Verwaltung ---- */
    async anmelden(email, pw) {
      const r = await fetch(this.url + '/auth/v1/token?grant_type=password', {
        method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw })
      });
      const j = await r.json();
      if (!r.ok) throw new Error('E-Mail oder Passwort falsch.');
      localStorage.setItem(this.SESSION, JSON.stringify(j));
      if (!(await this._rpc('is_admin', {}))) { await this.abmelden(); throw new Error('Dieses Konto hat keine Kassenwart-Berechtigung.'); }
      return true;
    }
    async abmelden() {
      const jwt = await this._jwt();
      if (jwt) fetch(this.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: this.key, Authorization: 'Bearer ' + jwt } }).catch(() => {});
      localStorage.removeItem(this.SESSION);
    }
    async angemeldet() { return !!(await this._jwt()); }

    static get M_SPALTEN() { return 'id,nr,vorname,nachname,email,strasse,plz,ort,sepa,notiz,aktiv,hat_pin,fehlversuche,gesperrt_bis'; }
    mitglieder() { return this._req('/rest/v1/mitglieder?select=' + SupabaseSpeicher.M_SPALTEN + '&order=nachname,vorname'); }
    async mitgliedSpeichern(m) {
      const felder = ['nr', 'vorname', 'nachname', 'email', 'strasse', 'plz', 'ort', 'sepa', 'notiz', 'aktiv'];
      const body = {}; felder.forEach((f) => { if (f in m) body[f] = m[f]; });
      const sel = '?select=' + SupabaseSpeicher.M_SPALTEN;
      const r = m.id
        ? await this._req('/rest/v1/mitglieder' + sel + '&id=eq.' + m.id, { method: 'PATCH', body, prefer: 'return=representation' })
        : await this._req('/rest/v1/mitglieder' + sel, { method: 'POST', body, prefer: 'return=representation' });
      return r[0];
    }
    async mitgliedLoeschen(id) {
      const b = await this._req('/rest/v1/buchungen?select=id&limit=1&mitglied_id=eq.' + id);
      if (b.length) { await this._req('/rest/v1/mitglieder?id=eq.' + id, { method: 'PATCH', body: { aktiv: false } }); return 'deaktiviert'; }
      await this._req('/rest/v1/mitglieder?id=eq.' + id, { method: 'DELETE' }); return 'geloescht';
    }
    pinSetzen(id, pin) { return this._rpc('admin_pin_setzen', { p_mitglied: id, p_pin: pin }); }

    async produkte() { return (await this._req('/rest/v1/produkte?select=*&order=sort,name')).map(this._zahlen); }
    async produktSpeichern(p) {
      const { id, ...body } = p;
      const r = id
        ? await this._req('/rest/v1/produkte?id=eq.' + id, { method: 'PATCH', body, prefer: 'return=representation' })
        : await this._req('/rest/v1/produkte', { method: 'POST', body, prefer: 'return=representation' });
      return this._zahlen(r[0]);
    }
    async produktLoeschen(id) {
      const b = await this._req('/rest/v1/buchungen?select=id&limit=1&produkt_id=eq.' + id);
      if (b.length) { await this._req('/rest/v1/produkte?id=eq.' + id, { method: 'PATCH', body: { aktiv: false } }); return 'deaktiviert'; }
      await this._req('/rest/v1/produkte?id=eq.' + id, { method: 'DELETE' }); return 'geloescht';
    }

    async buchungen({ von, bis, mitglied_id, rechnung_ids } = {}) {
      let q = '/rest/v1/buchungen?select=*&order=zeit.desc&limit=5000';
      if (rechnung_ids) q += '&rechnung_id=in.(' + rechnung_ids.join(',') + ')';
      if (von) q += '&zeit=gte.' + encodeURIComponent(new Date(von + 'T00:00:00').toISOString());
      if (bis) q += '&zeit=lt.' + encodeURIComponent(new Date(new Date(bis + 'T00:00:00').getTime() + 864e5).toISOString());
      if (mitglied_id) q += '&mitglied_id=eq.' + mitglied_id;
      return (await this._req(q)).map(this._zahlen);
    }
    async buchungStornieren(id) {
      const r = await this._req('/rest/v1/buchungen?id=eq.' + id + '&rechnung_id=is.null', { method: 'PATCH', body: { storniert_am: new Date().toISOString() }, prefer: 'return=representation' });
      if (!r.length) throw new Error('Bereits abgerechnete Buchungen bitte über die Rechnung stornieren.');
    }
    async buchungNachtragen(mid, posten, zeit) { return Number(await this._rpc('admin_buchen', { p_mitglied: mid, p_posten: posten, p_zeit: zeit || null })); }

    async rechnungen() { return (await this._req('/rest/v1/rechnungen?select=*&order=nr.desc')).map(this._zahlen); }
    async rechnungenLaden(ids) { return (await this._req('/rest/v1/rechnungen?select=*&id=in.(' + ids.join(',') + ')')).map(this._zahlen); }
    rechnungenErstellen(von, bis, datum) { return this._rpc('admin_rechnungen_erstellen', { p_von: von, p_bis: bis, p_datum: datum }); }
    rechnungBezahlt(id, datum) { return this._req('/rest/v1/rechnungen?id=eq.' + id, { method: 'PATCH', body: { bezahlt_am: datum } }); }
    rechnungStornieren(id) { return this._rpc('admin_rechnung_stornieren', { p_id: id }); }

    async einstellungen() {
      const r = await this._req('/rest/v1/einstellungen?select=daten&id=eq.1');
      return { ...STANDARD_EINSTELLUNGEN, ...((r[0] && r[0].daten) || {}) };
    }
    async einstellungenSpeichern(e) {
      const alt = await this.einstellungen();
      await this._req('/rest/v1/einstellungen?id=eq.1', { method: 'PATCH', body: { daten: { ...alt, ...e } } });
    }
    async kasseEinrichten(name) {
      const t = await this._rpc('admin_kasse_einrichten', { p_name: name });
      localStorage.setItem(this.TOKEN, t); localStorage.setItem(this.TOKEN + '-name', name);
      return true;
    }
  }

  window.SSV = {
    speicher: K.modus === 'supabase' && K.supabaseUrl
      ? new SupabaseSpeicher(K.supabaseUrl, K.supabaseAnonKey)
      : new DemoSpeicher(),
    hilfe: { ct, eur, pad, tag, zufallsPin, verdichten,
      geld: (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }),
      datum: (d) => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      zeit: (d) => new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      einheitText: (b) => b.einheit === 'kasten' ? (b.anzahl === 1 ? 'Kasten' : 'Kästen') : 'Stk.'
    }
  };
})();
