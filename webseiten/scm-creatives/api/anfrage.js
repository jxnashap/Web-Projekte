// Vercel Function: nimmt Anfragen aus dem Quiz entgegen und schickt sie per SMTP an SCM.
// Umgebungsvariablen (im Vercel-Projekt setzen): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, optional MAIL_FROM.
// MAIL_TEST=1 schreibt die Mail nur ins Log (lokaler Test ohne Postfach).
const nodemailer = require('nodemailer');

const LABELS = {
  branche: { gastronomie: 'Gastronomie', immobilien: 'Immobilien', handwerk: 'Handwerk', unternehmen: 'Unternehmen', andere: 'Andere Branche' },
  ziel: { gaeste: 'Mehr Gäste oder Kunden', anfragen: 'Mehr Anfragen', mitarbeiter: 'Mitarbeitende finden', bekanntheit: 'Bekannter werden in der Region' },
  paket: { '4': '4 Videos im Monat (Starter)', '8': '8 Videos im Monat (Wachstum)', '12': '12 Videos im Monat (Pro)', offen: 'Weiß ich noch nicht' },
  extras: { posting: 'Posting und Community', ads: 'Werbeanzeigen', recruiting: 'Recruiting-Videos', fotos: 'Fotos oder Imagefilm' },
  start: { sofort: 'So bald wie möglich', '1-3': 'In 1 bis 3 Monaten', spaeter: 'Später, erst mal informieren' },
};

const clean = (v) => String(Array.isArray(v) ? v.join(', ') : (v == null ? '' : v)).replace(/[\r\n]+/g, ' ').trim().slice(0, 1500);
const label = (k, v) => [].concat(v || []).map((x) => (LABELS[k] && LABELS[k][x]) || clean(x)).filter(Boolean).join(', ');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  const reply = (status, ok, msg) => (wantsJson
    ? res.status(status).json({ ok, msg })
    : res.redirect(303, ok ? '/danke' : '/kontakt?fehler=1'));

  // Spam-Schutz: Honeypot-Feld und Mindestzeit (Bots füllen in Sekundenbruchteilen aus).
  if (clean(d.website)) return reply(200, true);
  const elapsed = parseInt(d.t || '0', 10);
  if (wantsJson && elapsed > 0 && elapsed < 4000) return reply(200, true);

  const name = clean(d.name);
  const email = clean(d.email);
  const tel = clean(d.telefon);
  const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (name.length < 2 || !(mailOk || tel.replace(/\D/g, '').length >= 6)) {
    return reply(422, false, 'Bitte Name und Telefon oder E-Mail angeben.');
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, MAIL_FROM, MAIL_TEST } = process.env;
  const testMode = MAIL_TEST === '1';
  if (!testMode && (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_TO)) {
    return reply(503, false, 'Der Versand ist noch nicht eingerichtet.');
  }

  // A-Anfrage: großes Paket und schneller Start → zuerst zurückrufen.
  const hot = ['8', '12'].includes(String(d.paket)) && d.start === 'sofort';
  const rows = [
    ['Name', name], ['Betrieb', clean(d.betrieb)], ['Telefon / WhatsApp', tel], ['E-Mail', email],
    ['Branche', label('branche', d.branche)], ['Ziel', label('ziel', d.ziel)], ['Paket', label('paket', d.paket)],
    ['Zusätzlich', label('extras', d.extras)], ['Start', label('start', d.start)], ['Ort', clean(d.ort)],
    ['Nachricht', clean(d.nachricht)],
  ].filter(([, v]) => v);
  const subject = `${hot ? '[A-Anfrage] ' : ''}3 Testvideos: ${name}${d.betrieb ? ' · ' + clean(d.betrieb) : ''}`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nGesendet über scm-creatives.de/anfrage';
  const html = `<h2 style="font-family:Arial,sans-serif">Neue Anfrage über die Website</h2>
<table style="font-family:Arial,sans-serif;border-collapse:collapse">${rows.map(([k, v]) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`).join('')}</table>
${hot ? '<p style="font-family:Arial,sans-serif;color:#C8231A"><b>A-Anfrage: großes Paket und schneller Start. Am besten heute zurückrufen.</b></p>' : ''}`;

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
      replyTo: mailOk ? email : undefined,
      subject, text, html,
    });
    if (testMode) console.log(info.message);
    return reply(200, true);
  } catch (e) {
    console.error('Versand fehlgeschlagen:', e.message);
    return reply(502, false, 'Der Versand ist fehlgeschlagen.');
  }
};
