// Vercel Function: nimmt Anfragen aus dem Quiz entgegen und schickt sie per SMTP an SCM.
// Umgebungsvariablen (im Vercel-Projekt setzen): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, optional MAIL_FROM.
// MAIL_TEST=1 schreibt die Mail nur ins Log (lokaler Test ohne Postfach). In Produktion NICHT setzen.
const nodemailer = require('nodemailer');

const LABELS = {
  branche: { gastronomie: 'Gastronomie', immobilien: 'Immobilien', handwerk: 'Handwerk', unternehmen: 'Unternehmen', andere: 'Andere Branche' },
  ziel: { gaeste: 'Mehr Gäste oder Kunden', anfragen: 'Mehr Anfragen', mitarbeiter: 'Mitarbeitende finden', bekanntheit: 'Bekannter werden in der Region', mehreres: 'Mehreres davon' },
  paket: { '4': '4 Videos im Monat (Starter)', '8': '8 Videos im Monat (Wachstum)', '12': '12 Videos im Monat (Pro)', offen: 'Weiß ich noch nicht' },
  extras: { posting: 'Posting und Community', ads: 'Werbeanzeigen', recruiting: 'Recruiting-Videos', fotos: 'Fotos oder Imagefilm' },
  start: { sofort: 'So bald wie möglich', '1-3': 'In 1 bis 3 Monaten', spaeter: 'Später, erst mal informieren' },
  region: { kiel: 'Kiel und Umgebung', luebeck: 'Lübeck und Lübecker Bucht', woanders: 'Woanders' },
  kontaktweg: { anruf: 'Anruf', whatsapp: 'WhatsApp', email: 'E-Mail' },
};
const SHORT = {
  paket: { '4': '4 Videos', '8': '8 Videos', '12': '12 Videos', offen: 'Paket offen' },
  start: { sofort: 'sofort', '1-3': '1 bis 3 Monate', spaeter: 'später' },
};
const MAX_ITEMS = 8;
const MAIL_RE = /^[^\s@,;<>"()]+@[^\s@,;<>"()]+\.[a-z]{2,}$/i;

const list = (v) => [].concat(v == null ? [] : v).slice(0, MAX_ITEMS);
const clean = (v, max = 1500) => String(Array.isArray(v) ? list(v).join(', ') : (v == null ? '' : v)).replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const label = (k, v) => list(v).map((x) => (LABELS[k] && LABELS[k][x]) || clean(x, 80)).filter(Boolean).join(', ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const one = (v) => clean(Array.isArray(v) ? v[0] : v, 40);

// Einfache Drossel pro Instanz: höchstens 5 Anfragen je IP in 10 Minuten.
// Für echten Schutz zusätzlich eine Rate-Limit-Regel in der Vercel Firewall anlegen (siehe PLATZHALTER.md).
const HITS = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (HITS.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length > 5;
}

// Deutsche Nummer für tel: und wa.me aufbereiten (0431 … → +49431 …).
function phone(tel) {
  let d = tel.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  else if (d.startsWith('0')) d = '+49' + d.slice(1);
  else if (!d.startsWith('+')) d = '+49' + d;
  return d;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  const type = req.headers['content-type'] || '';
  const wantsJson = type.includes('application/json') || (req.headers.accept || '').includes('application/json');
  let d = req.body || {};
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch (e) {
      const o = {};
      for (const [k, v] of new URLSearchParams(d)) o[k] = k in o ? [].concat(o[k], v) : v;
      d = o;
    }
  }
  if (!d || typeof d !== 'object') d = {};
  const reply = (status, ok, msg) => (wantsJson
    ? res.status(status).json({ ok, msg })
    : res.redirect(303, ok ? '/danke' + (LABELS.branche[one(d.branche)] ? '?b=' + one(d.branche) : '') : '/kontakt?fehler=1#fehler'));

  // Nur Anfragen von der eigenen Seite annehmen.
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin) {
    let ok = false;
    try { ok = new URL(origin).host === host; } catch (e) { ok = false; }
    if (!ok) return reply(403, false, 'Unzulässige Herkunft.');
  }

  // Spam-Schutz: Honeypot-Feld und Mindestzeit (Bots füllen in Sekundenbruchteilen aus).
  if (clean(d.website)) return reply(200, true);
  const elapsed = parseInt(d.t || '0', 10) || 0;
  if (wantsJson && elapsed < 4000) return reply(200, true);

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unbekannt';
  if (limited(ip)) return reply(429, false, 'Zu viele Anfragen. Bitte versucht es später noch einmal.');

  const name = clean(d.name, 120);
  const email = clean(d.email, 160);
  const tel = clean(d.telefon, 40);
  const weg = one(d.kontaktweg);
  const mailOk = MAIL_RE.test(email);
  const telOk = tel.replace(/\D/g, '').length >= 6;
  const contactOk = (weg === 'anruf' || weg === 'whatsapp') ? telOk : weg === 'email' ? mailOk : (mailOk || telOk);
  if (name.length < 2 || !contactOk) {
    return reply(422, false, 'Bitte Name und je nach Kontaktweg Telefon oder E-Mail angeben.');
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, MAIL_FROM, MAIL_TEST } = process.env;
  const testMode = MAIL_TEST === '1';
  if (!testMode && (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_TO)) {
    return reply(503, false, 'Der Versand ist noch nicht eingerichtet.');
  }

  // Einstufung: A = großes Paket und schneller Start, B = konkreter Start oder großes Paket, C = erst informieren.
  const paket = one(d.paket), start = one(d.start);
  const big = paket === '8' || paket === '12';
  const tier = big && start === 'sofort' ? 'A' : (start === 'sofort' || start === '1-3' || big) ? 'B' : 'C';
  const tierText = { A: 'A-Anfrage: großes Paket und schneller Start. Am besten heute zurückrufen.', B: 'B-Anfrage: konkretes Interesse. Innerhalb der zugesagten Antwortzeit melden.', C: 'C-Anfrage: möchte sich erst informieren.' }[tier];

  const betrieb = clean(d.betrieb, 160);
  const ort = clean(d.ort, 120);
  const eingang = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const rows = [
    ['Name', name], ['Betrieb', betrieb], ['Gewünschter Kontakt', label('kontaktweg', weg)],
    ['Telefon / WhatsApp', tel], ['E-Mail', email],
    ['Branche', label('branche', d.branche)], ['Andere Branche', clean(d.andere, 160)],
    ['Ziel', label('ziel', d.ziel)], ['Paket', label('paket', d.paket)],
    ['Zusätzlich', label('extras', d.extras)], ['Start', label('start', d.start)],
    ['Region', label('region', d.region)], ['Ort', ort],
    ['Nachricht', clean(d.nachricht)],
    ['Kam von Seite', clean(d.quelle, 200)], ['Kampagne (utm_source)', clean(d.utm, 80)],
    ['Eingang', eingang],
  ].filter(([, v]) => v);

  const brancheTxt = clean(d.andere, 60) || label('branche', d.branche);
  const meta = [brancheTxt, SHORT.paket[paket], SHORT.start[start], ort || label('region', d.region)].filter(Boolean).join(' · ');
  const subject = `[${tier}] 3 Testvideos: ${name}${betrieb ? ', ' + betrieb : ''}${meta ? ' (' + meta + ')' : ''}`.slice(0, 200);
  const text = `${tierText}\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nGesendet über scm-creatives.de/anfrage';

  const intl = telOk ? phone(tel) : '';
  const actions = [
    telOk ? `<a href="tel:${esc(intl)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Anrufen</a>` : '',
    telOk ? `<a href="https://wa.me/${esc(intl.replace('+', ''))}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#1f7a44;color:#fff;text-decoration:none;border-radius:6px">WhatsApp öffnen</a>` : '',
    mailOk ? `<a href="mailto:${esc(email)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#E1251B;color:#fff;text-decoration:none;border-radius:6px">Antworten</a>` : '',
  ].join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#111">
<h2 style="margin:0 0 6px">Neue Anfrage über die Website</h2>
<p style="margin:0 0 16px;color:${tier === 'A' ? '#C8231A' : '#444'}"><b>${esc(tierText)}</b></p>
${actions ? `<p style="margin:0 0 16px">${actions}</p>` : ''}
<table style="border-collapse:collapse">${rows.map(([k, v]) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`).join('')}</table>
</div>`;

  const transport = testMode
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 465,
      secure: (Number(SMTP_PORT) || 465) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  try {
    const info = await transport.sendMail({
      from: MAIL_FROM || SMTP_USER || 'test@scm-creatives.de',
      to: MAIL_TO || 'test@scm-creatives.de',
      replyTo: mailOk ? { name, address: email } : undefined,
      subject, text, html,
    });
    if (testMode) console.log(info.message);
    return reply(200, true);
  } catch (e) {
    console.error('Versand fehlgeschlagen:', e.message);
    return reply(502, false, 'Der Versand ist fehlgeschlagen.');
  }
};
