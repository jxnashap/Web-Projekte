// SSV · Edge Function „rechnung-mail“: Rechnungen per E-Mail an die Mitglieder – sicher und nachvollziehbar
//
//   { aktion: 'pruefen', art, ids }                  → Liste: an welche Adresse ginge jede Rechnung (nur lesen)
//   { aktion: 'senden',  art, ids, erwartet, erneut } → versendet (höchstens 25 je Aufruf), protokolliert in rechnung_versand
//   { aktion: 'test',    art, ids }                  → schickt die erste Rechnung als TEST an die eigene Anmelde-Adresse
//   art: 'hafen' (Beitrag, Sommer, Winter, Veranstaltung – Tabelle hafen_rechnungen) | 'getraenke' (Tabelle rechnungen)
//
// Sicherheitsregeln:
//   · Nur Vorstand und Kassenwart (is_admin) dürfen prüfen und senden.
//   · Aus dem Browser kommen nur Rechnungs-IDs – NIE eine Empfängeradresse. Die Adresse liest diese Funktion selbst
//     aus mitglieder.email des Mitglieds, dem die Rechnung gehört (rechnung.mitglied_id).
//   · „erwartet“ = die Adressen, die der Kassenwart beim Prüfen gesehen hat. Hat sich eine Adresse seitdem geändert,
//     wird diese Rechnung NICHT gesendet („adresse_geaendert“) – erst neu prüfen.
//   · Jede Mail geht an genau eine Adresse (kein CC/BCC, keine Sammelmail), mit genau einer Rechnung als PDF.
//   · Schon gesendete Rechnungen werden nur mit „erneut“ noch einmal gesendet; jeder Versuch steht im Protokoll.
//
// Einrichtung (Supabase → Edge Functions → Secrets):
//   MAIL_API_KEY       Schlüssel des Mail-Dienstes (Brevo oder Resend)
//   MAIL_ANBIETER      'brevo' (Standard) oder 'resend'
//   MAIL_ABSENDER      z. B. rechnung@ssv-net.de (beim Mail-Dienst als Absender bestätigt)
//   MAIL_ABSENDER_NAME optional, Standard: Vereinsname
//   MEIN_SSV_URL       optional, Link auf „Mein SSV“ im Mailtext
import { rechnungDaten, mailText, mailHtml, pdfErzeugen, emailGueltig } from './inhalt.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const antwort = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const env = (k, d = '') => Deno.env.get(k) ?? d;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TABELLE = { hafen: 'hafen_rechnungen', getraenke: 'rechnungen' };
const EINSTELLUNGEN = { hafen: 'hafen_einstellungen', getraenke: 'einstellungen' };
let PDFLib = null;

// Datenbank mit Service-Rolle (nur in dieser Funktion; RLS wird umgangen, deshalb prüfen wir die Rolle des Aufrufers selbst)
async function db(pfad, opt = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(env('SUPABASE_URL') + pfad, { method: opt.method || 'GET', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...(opt.prefer ? { Prefer: opt.prefer } : {}) }, body: opt.body === undefined ? undefined : JSON.stringify(opt.body) });
  const t = await r.text(); const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error((j && (j.message || j.msg)) || 'Datenbankfehler ' + r.status);
  return j;
}
// Wer ruft auf? Nur Vorstand/Kassenwart – geprüft mit dem Token des Aufrufers
async function aufrufer(req) {
  const h = { apikey: env('SUPABASE_ANON_KEY'), Authorization: req.headers.get('Authorization') || '', 'Content-Type': 'application/json' };
  const u = await fetch(env('SUPABASE_URL') + '/auth/v1/user', { headers: h }); if (!u.ok) return null;
  const nutzer = await u.json();
  const a = await fetch(env('SUPABASE_URL') + '/rest/v1/rpc/is_admin', { method: 'POST', headers: h, body: '{}' }); if (!a.ok) return null;
  return (await a.json()) === true ? nutzer : null;
}

async function laden(art, ids) {
  const liste = ids.length ? ids.join(',') : '00000000-0000-0000-0000-000000000000';
  const rechnungen = await db('/rest/v1/' + TABELLE[art] + '?select=*&id=in.(' + liste + ')');
  const mids = [...new Set(rechnungen.map((r) => r.mitglied_id).filter((x) => UUID.test(String(x))))];
  const mitglieder = mids.length ? await db('/rest/v1/mitglieder?select=id,nr,vorname,nachname,email&id=in.(' + mids.join(',') + ')') : [];
  const versand = await db('/rest/v1/rechnung_versand?select=rechnung_id,email,gesendet&art=eq.' + art + '&status=eq.gesendet&rechnung_id=in.(' + liste + ')&order=gesendet.desc');
  const e = await db('/rest/v1/' + EINSTELLUNGEN[art] + '?select=daten&id=eq.1').catch(() => []);
  const eh = art === 'getraenke' ? await db('/rest/v1/hafen_einstellungen?select=daten&id=eq.1').catch(() => []) : [];
  // Getränke: Vereinsangaben aus den Hafen-Einstellungen ergänzen, Kassen-Einstellungen haben Vorrang
  const einst = { ...((eh[0] && eh[0].daten) || {}), ...((e[0] && e[0].daten) || {}) };
  return { rechnungen: new Map(rechnungen.map((r) => [r.id, r])), mitglieder: new Map(mitglieder.map((m) => [m.id, m])), versand, einst };
}
// Stand je Rechnung: an welche Adresse ginge sie, darf sie raus?
function stand(id, x) {
  const r = x.rechnungen.get(id);
  if (!r) return { id, status: 'nicht_gefunden' };
  const m = x.mitglieder.get(r.mitglied_id);
  const basis = { id, nr: r.nr, betrag: Number(r.summe), mitglied_id: r.mitglied_id, mitglied: m ? { nr: m.nr, name: m.vorname + ' ' + m.nachname } : null };
  if (r.storniert_am) return { ...basis, status: 'storniert' };
  if (!m) return { ...basis, status: 'kein_mitglied' };
  const email = String(m.email || '').trim();
  if (!email) return { ...basis, status: 'keine_email' };
  if (!emailGueltig(email)) return { ...basis, email, status: 'ungueltig' };
  const v = x.versand.find((y) => y.rechnung_id === id);
  return { ...basis, email, status: v ? 'schon_gesendet' : 'bereit', gesendet: v ? v.gesendet : null, gesendet_an: v ? v.email : null };
}
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

async function mailSenden(an, name, d, pdf, test) {
  const anbieter = env('MAIL_ANBIETER', 'brevo').toLowerCase(); const key = env('MAIL_API_KEY');
  const absender = env('MAIL_ABSENDER'), absName = env('MAIL_ABSENDER_NAME', d.e.verein_name);
  const meinSsv = env('MEIN_SSV_URL');
  const betreff = (test ? '[TEST] ' : '') + d.betreff;
  let html = mailHtml(d, meinSsv); const text = (test ? 'TESTVERSAND – diese Mail ging nur an dich.\n\n' : '') + mailText(d, meinSsv);
  if (test) html = html.replace('<body style="', '<body style="').replace('<tr><td style="padding:24px;', '<tr><td style="padding:10px 24px;background:#fff4d6;font-size:14px"><strong>Testversand</strong> – diese Mail ging nur an dich. So sieht sie für das Mitglied aus.</td></tr><tr><td style="padding:24px;');
  const datei = 'Rechnung-' + d.nr + '.pdf';
  const antwortAn = emailGueltig(d.e.verein_email) ? d.e.verein_email : absender;
  let r, j;
  if (anbieter === 'resend') {
    r = await fetch(env('MAIL_API_URL', 'https://api.resend.com/emails'), { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: absName + ' <' + absender + '>', to: [an], reply_to: antwortAn, subject: betreff, html, text, attachments: [{ filename: datei, content: b64(pdf) }] }) });
    j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'Mail-Dienst: Fehler ' + r.status); return j.id || '';
  }
  r = await fetch(env('MAIL_API_URL', 'https://api.brevo.com/v3/smtp/email'), { method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { name: absName, email: absender }, to: [{ email: an, name }], replyTo: { email: antwortAn }, subject: betreff, htmlContent: html, textContent: text, attachment: [{ name: datei, content: b64(pdf) }] }) });
  j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'Mail-Dienst: Fehler ' + r.status); return j.messageId || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const nutzer = await aufrufer(req);
    if (!nutzer) return antwort({ message: 'Nur Vorstand und Kassenwart dürfen Rechnungen versenden.' }, 403);
    const { aktion, art, ids, erwartet, erneut } = await req.json().catch(() => ({}));
    if (!TABELLE[art]) return antwort({ message: 'Unbekannte Rechnungsart' }, 400);
    if (!Array.isArray(ids) || !ids.length || ids.some((x) => !UUID.test(String(x)))) return antwort({ message: 'Ungültige Rechnungsliste' }, 400);
    const eingerichtet = !!(env('MAIL_API_KEY') && emailGueltig(env('MAIL_ABSENDER')));

    if (aktion === 'pruefen') {
      if (ids.length > 500) return antwort({ message: 'Höchstens 500 Rechnungen auf einmal prüfen' }, 400);
      const x = await laden(art, ids);
      return antwort({ eingerichtet, absender: env('MAIL_ABSENDER'), liste: ids.map((id) => stand(id, x)) });
    }
    if (!eingerichtet) return antwort({ message: 'Der E-Mail-Versand ist noch nicht eingerichtet (Mail-Dienst und Absender fehlen).' }, 409);
    PDFLib = PDFLib || await import('npm:pdf-lib@1.17.1');

    if (aktion === 'test') {
      if (!emailGueltig(nutzer.email)) return antwort({ message: 'Deine Anmelde-Adresse ist keine gültige E-Mail-Adresse.' }, 400);
      const x = await laden(art, ids.slice(0, 1)); const r = x.rechnungen.get(ids[0]); if (!r) return antwort({ message: 'Rechnung nicht gefunden' }, 404);
      const d = rechnungDaten(art, r, x.einst);
      await mailSenden(nutzer.email, nutzer.email, d, await pdfErzeugen(PDFLib, d), true);
      return antwort({ ok: true, an: nutzer.email });
    }
    if (aktion !== 'senden') return antwort({ message: 'Unbekannte Aktion' }, 400);
    if (ids.length > 25) return antwort({ message: 'Höchstens 25 Rechnungen je Aufruf' }, 400);
    if (!erwartet || typeof erwartet !== 'object') return antwort({ message: 'Bitte zuerst prüfen.' }, 400);
    const x = await laden(art, ids);
    const ergebnis = [];
    for (const id of ids) {
      const s = stand(id, x);
      if (s.status !== 'bereit' && !(s.status === 'schon_gesendet' && erneut === true)) { ergebnis.push({ id, nr: s.nr, status: s.status }); continue; }
      // Die Adresse muss genau die sein, die der Kassenwart beim Prüfen gesehen hat
      if (String(erwartet[id] || '').trim().toLowerCase() !== s.email.toLowerCase()) { ergebnis.push({ id, nr: s.nr, status: 'adresse_geaendert' }); continue; }
      const r = x.rechnungen.get(id); const m = x.mitglieder.get(r.mitglied_id);
      if (!m || m.id !== r.mitglied_id || String(m.email).trim() !== s.email) { ergebnis.push({ id, nr: s.nr, status: 'kein_mitglied' }); continue; }   // doppelte Absicherung
      const zeile = { art, rechnung_id: id, rechnung_nr: r.nr, mitglied_id: m.id, email: s.email, ausgeloest_von: nutzer.id, ausgeloest_name: nutzer.email };
      try {
        const d = rechnungDaten(art, r, x.einst);
        const mid = await mailSenden(s.email, m.vorname + ' ' + m.nachname, d, await pdfErzeugen(PDFLib, d), false);
        await db('/rest/v1/rechnung_versand', { method: 'POST', body: { ...zeile, status: 'gesendet', anbieter_id: String(mid || '').slice(0, 200) }, prefer: 'return=minimal' });
        ergebnis.push({ id, nr: r.nr, status: 'gesendet', email: s.email });
      } catch (er) {
        await db('/rest/v1/rechnung_versand', { method: 'POST', body: { ...zeile, status: 'fehler', fehler: String(er.message).slice(0, 500) }, prefer: 'return=minimal' }).catch(() => {});
        ergebnis.push({ id, nr: r.nr, status: 'fehler', fehler: er.message });
      }
    }
    return antwort({ ok: true, ergebnis });
  } catch (e) {
    return antwort({ message: e.message }, 500);
  }
});
