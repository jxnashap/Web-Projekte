// SSV · Rechnung per E-Mail – Inhalt: Rechnungsdaten aufbereiten, Mailtext (Text + HTML) und PDF im Vereinsbriefkopf.
// Reines JavaScript ohne Server-Zugriffe, damit es in der Edge Function (Deno) und in lokalen Tests (Node) gleich läuft.
// Gestaltung wie die Druckfassungen (apps/ssv-hafen/js/drucken.js, apps/ssv-getraenke/js/drucken.js):
// Stander oben links, Vereinsadresse rechts, persönlicher Ton, SEPA-Pflichtangaben klein in der Fußzeile.

export const STANDARD = {
  verein_name: 'Schwartauer Segler-Verein e.V.', verein_strasse: 'Zur Teerhofsinsel 5B', verein_ort: '23554 Lübeck', verein_email: 'info@ssv-net.de',
  kassenwart_name: '', fusstext: 'Mit seglerischen Grüßen', iban: '', bic: '', bank: '', glaeubiger_id: '', steuernummer: ''
};

// Genau EINE Adresse, ohne Komma/Semikolon/Leerzeichen/Klammern – keine Listen, keine Namen, keine Header-Tricks
export function emailGueltig(s) {
  const e = String(s == null ? '' : s).trim();
  return e.length >= 6 && e.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(e) && !/\.\./.test(e);
}

const geld = (v) => Number(v || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const datum = (s) => { if (!s) return ''; const [j, m, t] = String(s).slice(0, 10).split('-'); return t + '.' + m + '.' + j; };
const zahl = (v) => Number(v || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 });
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function periodeText(r) {
  if (r.periode === 'veranstaltung') return (r.positionen && r.positionen[0] && r.positionen[0].text) || 'Veranstaltung';
  if (r.periode === 'beitrag') return 'Beitrag ' + r.saison;
  if (r.periode === 'sommer') return 'Sommer ' + r.saison;
  return 'Winter ' + r.saison + '/' + String(Number(r.saison) + 1).slice(2);
}
function steuerText(e, betrag) {
  if (e.steuer_hinweis === 'kleinunternehmer') return 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.';
  if (e.steuer_hinweis === 'ust19') return 'Im Betrag von ' + geld(betrag) + ' sind 19 % Umsatzsteuer (' + geld(Math.round((betrag - betrag / 1.19) * 100) / 100) + ') enthalten.';
  if (e.steuer_hinweis === 'frei') return e.steuer_text || '';
  return '';
}

/* Einheitliche Sicht auf eine Rechnung – egal ob Hafen/Beitrag/Veranstaltung oder Getränke */
export function rechnungDaten(art, r, e) {
  e = { ...STANDARD, ...(e || {}) };
  const em = r.empfaenger || {};
  const summe = Number(r.summe);
  const d = { art, nr: r.nr, datum: r.datum, faellig: r.faellig, summe, sepa: !!r.sepa, em, vorname: em.vorname || '', e };
  if (art === 'getraenke') {
    const v = new Date(r.von + 'T12:00:00'), b = new Date(r.bis + 'T12:00:00');
    const ganz = v.getDate() === 1 && v.getMonth() === b.getMonth() && v.getFullYear() === b.getFullYear() && new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate() === b.getDate();
    const zeitraum = ganz ? 'im ' + MONATE[v.getMonth()] + ' ' + v.getFullYear() : 'vom ' + datum(r.von) + ' bis ' + datum(r.bis);
    Object.assign(d, {
      titel: 'Deine Getränkeabrechnung', betreff: 'Deine Getränkeabrechnung ' + r.nr, metaLabel: 'Leistungszeitraum', metaWert: datum(r.von) + ' – ' + datum(r.bis),
      intro: 'schön, dass du ' + zeitraum + ' bei uns an der Trave warst! Hier ist deine Übersicht über alles, was du dir an unserer Getränkekasse gegönnt hast:',
      spalte: 'Artikel',
      positionen: (r.positionen || []).map((p) => ({ text: p.name + (p.einheit === 'kasten' ? ' – Kasten (' + p.stueck + ' Stk.)' : ''), menge: p.anzahl + ' ' + (p.einheit === 'kasten' ? (p.anzahl === 1 ? 'Kasten' : 'Kästen') : 'Stk.'), einzel: Number(p.einzelpreis), betrag: Number(p.betrag) })),
      fussnote: e.steuerhinweis && !/PLATZHALTER/.test(e.steuerhinweis) ? e.steuerhinweis : '',
      mandat: em.mandatsreferenz || em.nr || ''
    });
  } else {
    const beitrag = r.periode === 'beitrag', winter = r.periode === 'winter', ver = r.periode === 'veranstaltung';
    const label = periodeText(r);
    Object.assign(d, {
      titel: beitrag ? 'Dein Mitgliedsbeitrag ' + r.saison : ver ? 'Deine Rechnung' : 'Deine Hafenabrechnung',
      betreff: (beitrag ? 'Dein Mitgliedsbeitrag ' + r.saison : ver ? 'Rechnung ' + label : 'Deine Hafenabrechnung ' + label) + ' · ' + r.nr,
      metaLabel: beitrag ? 'Beitragsjahr' : ver ? 'Veranstaltung' : 'Leistungszeitraum', metaWert: beitrag ? String(r.saison) : label,
      intro: beitrag ? 'danke, dass du auch ' + r.saison + ' Teil unseres Vereins bist! Mit deinem Beitrag halten wir Hafen, Stege, Jugendarbeit und Vereinsheim in Schuss. Hier ist deine Beitragsrechnung:'
        : ver ? 'schön, dass du dabei bist! Hier ist die Rechnung für ' + label + ':'
          : winter ? 'das Winterlager hat begonnen – hier ist deine Abrechnung für den ' + label + ':' : 'die Saison läuft – schön, dass du wieder auf dem Wasser bist! Hier ist deine Abrechnung für den ' + label + ':',
      spalte: 'Leistung',
      positionen: (r.positionen || []).map((p) => ({ text: p.text, menge: zahl(p.menge) + ' ' + (p.einheit || ''), einzel: Number(p.einzelpreis), betrag: Number(p.betrag) })),
      fussnote: beitrag ? 'Beiträge laut Beitragsordnung des Vereins.' : (ver ? 'Kostenbeitrag laut Einladung des Vereins. ' : 'Gebühren laut Gebührenordnung des Vereins. ') + steuerText(e, summe),
      mandat: r.mandat_ref || ''
    });
  }
  d.zahlung = d.sepa
    ? 'Du musst nichts weiter tun: Die ' + geld(summe) + ' buchen wir am ' + datum(r.faellig) + ' ganz bequem per Lastschrift von deinem Konto ab.' + (art === 'getraenke' && e.sepa_text ? ' ' + e.sepa_text : '')
    : 'Bitte überweise die ' + geld(summe) + ' bis zum ' + datum(r.faellig) + ' auf unser Vereinskonto' + (e.iban ? ' (IBAN ' + String(e.iban).replace(/(.{4})/g, '$1 ').trim() + (e.bank && !/PLATZHALTER/.test(e.bank) ? ', ' + e.bank : '') + ')' : '') + ' – als Verwendungszweck reicht die Rechnungsnummer ' + r.nr + '.';
  d.fusszeile = [e.verein_name + ' · ' + e.verein_strasse + ' · ' + e.verein_ort, [d.sepa && e.glaeubiger_id ? 'Gläubiger-ID ' + e.glaeubiger_id : '', d.sepa && d.mandat ? 'Mandatsreferenz ' + d.mandat : '', e.steuernummer ? 'Steuer-Nr. ' + e.steuernummer : ''].filter(Boolean).join(' · ')];
  return d;
}

/* ------------------------------------------------------------------ E-Mail */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function mailText(d, meinSsvUrl) {
  const e = d.e;
  return 'Moin ' + d.vorname + ',\n\n' + 'anbei bekommst du deine Rechnung ' + d.nr + ' über ' + geld(d.summe) + ' als PDF.\n\n' + d.zahlung + '\n\n' +
    (meinSsvUrl ? 'Alle deine Rechnungen findest du auch in „Mein SSV“: ' + meinSsvUrl + '\n\n' : '') +
    'Kommt dir etwas komisch vor? Dann antworte einfach auf diese E-Mail oder sprich ' + (e.kassenwart_name || 'den Kassenwart') + ' am Steg an.\n\n' +
    e.fusstext + '\n' + (e.kassenwart_name ? 'Dein Kassenwart ' + e.kassenwart_name + '\n' : '') + e.verein_name + '\n' + e.verein_strasse + ', ' + e.verein_ort;
}
export function mailHtml(d, meinSsvUrl) {
  const e = d.e;
  return '<!doctype html><html lang="de"><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1c2440">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px">' +
    '<tr><td style="background:#0e1b45;color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold">' + esc(e.verein_name) + '</td></tr>' +
    '<tr><td style="padding:24px;font-size:16px;line-height:1.55">' +
    '<p style="margin:0 0 14px">Moin ' + esc(d.vorname) + ',</p>' +
    '<p style="margin:0 0 14px">anbei bekommst du deine Rechnung <strong>' + esc(d.nr) + '</strong> über <strong>' + esc(geld(d.summe)) + '</strong> als PDF.</p>' +
    '<p style="margin:0 0 14px;background:#eef3f8;border-radius:8px;padding:12px 14px">' + esc(d.zahlung) + '</p>' +
    (meinSsvUrl ? '<p style="margin:0 0 14px">Alle deine Rechnungen findest du auch in <a href="' + esc(meinSsvUrl) + '" style="color:#1c3987">„Mein SSV“</a>.</p>' : '') +
    '<p style="margin:0 0 14px">Kommt dir etwas komisch vor? Dann antworte einfach auf diese E-Mail oder sprich ' + esc(e.kassenwart_name || 'den Kassenwart') + ' am Steg an.</p>' +
    '<p style="margin:18px 0 0">' + esc(e.fusstext) + '<br>' + (e.kassenwart_name ? 'Dein Kassenwart ' + esc(e.kassenwart_name) + '<br>' : '') + '<span style="color:#5e6478">' + esc(e.verein_name) + '</span></p>' +
    '</td></tr><tr><td style="padding:14px 24px;border-top:1px solid #e4e1d8;font-size:12px;color:#5e6478">' + esc(e.verein_name) + ' · ' + esc(e.verein_strasse) + ' · ' + esc(e.verein_ort) +
    '<br>Diese E-Mail ging nur an dich – an die Adresse, die du beim Verein hinterlegt hast.</td></tr></table></td></tr></table></body></html>';
}

/* ------------------------------------------------------------------ PDF (A4, Standardschrift Helvetica = WinAnsi) */
// Zeichen, die die Standardschrift nicht kennt, werden ersetzt – sonst bricht pdf-lib ab
const WIN = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
const sicher = (s) => String(s == null ? '' : s).replace(/[\u2009\u202f\u00a0]/g, ' ').replace(/[^\x20-\x7e\xa0-\xff]/g, (c) => WIN.has(c) ? c : c === '−' ? '-' : '?');

export async function pdfErzeugen(PDFLib, d) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const e = d.e;
  const doc = await PDFDocument.create();
  doc.setTitle('Rechnung ' + d.nr); doc.setAuthor(e.verein_name); doc.setCreator('SSV Hafen-Manager');
  const seite = doc.addPage([595.28, 841.89]);
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const NAVY = rgb(0.075, 0.165, 0.42), ROT = rgb(0.83, 0.15, 0.17), GRAU = rgb(0.33, 0.33, 0.36), TINTE = rgb(0.07, 0.07, 0.09);
  const mm = (x) => x * 2.8346; const H = 841.89;
  const text = (t, x, y, o = {}) => seite.drawText(sicher(t), { x, y: H - y, size: o.size || 10, font: o.bold ? fb : f, color: o.color || TINTE });
  const breite = (t, size, bold) => (bold ? fb : f).widthOfTextAtSize(sicher(t), size);
  const rechts = (t, xr, y, o = {}) => text(t, xr - breite(t, o.size || 10, o.bold), y, o);
  const umbrechen = (t, max, size, bold) => { const w = sicher(t).split(' '); const z = []; let l = ''; w.forEach((x) => { const v = l ? l + ' ' + x : x; if (breite(v, size, bold) > max && l) { z.push(l); l = x; } else l = v; }); if (l) z.push(l); return z; };
  const absatz = (t, x, y, max, o = {}) => { const s = o.size || 10, lh = s * 1.45; umbrechen(t, max, s, o.bold).forEach((z, i) => text(z, x, y + i * lh, o)); return y + umbrechen(t, max, s, o.bold).length * lh; };

  // Kopf: Stander oben links (Dreieck mit Kreuz wie das Vereinssymbol), Vereinsadresse rechts
  const sx = mm(22), sy = mm(14), sk = mm(26) / 108;   // Stander-Ausschnitt 108 × 54 Einheiten (SVG viewBox 12 6 108 54)
  const P = (x, y) => [sx + (x - 12) * sk, H - (sy + (y - 6) * sk)];
  seite.drawSvgPath('M 2 2 L 106 27 L 2 52 Z', { x: sx, y: H - sy, scale: sk, color: NAVY });
  const linie = (x1, y1, x2, y2, w, c) => { const [p1, q1] = P(x1, y1), [p2, q2] = P(x2, y2); seite.drawLine({ start: { x: p1, y: q1 }, end: { x: p2, y: q2 }, thickness: w * sk, color: c }); };
  // Kreuz nur innerhalb des Dreiecks (Schnittpunkte mit den Dreieckskanten vorberechnet)
  linie(14.5, 8.6, 58.1, 47.4, 8, rgb(1, 1, 1)); linie(14.5, 57.4, 58.1, 18.6, 8, rgb(1, 1, 1));
  linie(14.5, 8.6, 58.1, 47.4, 4.5, ROT); linie(14.5, 57.4, 58.1, 18.6, 4.5, ROT);
  const xr = 595.28 - mm(18);
  rechts(e.verein_name, xr, mm(17), { bold: true, size: 12, color: NAVY });
  rechts(e.verein_strasse, xr, mm(17) + 15, { size: 9, color: GRAU }); rechts(e.verein_ort, xr, mm(17) + 27, { size: 9, color: GRAU }); rechts(e.verein_email, xr, mm(17) + 39, { size: 9, color: GRAU });
  seite.drawLine({ start: { x: mm(22), y: H - mm(36) }, end: { x: xr, y: H - mm(36) }, thickness: 1.2, color: NAVY });

  // Anschrift (Fenster) und Rechnungsangaben
  const xl = mm(22);
  text(e.verein_name + ' · ' + e.verein_strasse + ' · ' + e.verein_ort, xl, mm(48), { size: 7, color: GRAU });
  const em = d.em; let ya = mm(55);
  [em.vorname + ' ' + em.nachname, em.strasse || '', ((em.plz || '') + ' ' + (em.ort || '')).trim()].filter(Boolean).forEach((z) => { text(z, xl, ya, { size: 11 }); ya += 15; });
  const meta = [['Rechnungsnummer', d.nr, true], ['Rechnungsdatum', datum(d.datum)], em.nr ? ['Mitgliedsnummer', String(em.nr)] : null, [d.metaLabel, d.metaWert]].filter(Boolean);
  let ym = mm(52); meta.forEach(([k, v, b]) => { text(k, mm(120), ym, { size: 8.5, color: GRAU }); rechts(v, xr, ym, { size: 9.5, bold: !!b }); ym += 14; });

  // Titel, Anrede, Text
  let y = mm(98);
  text(d.titel, xl, y, { size: 17, bold: true, color: NAVY }); y += 26;
  text('Moin ' + d.vorname + ',', xl, y, { size: 10.5 }); y += 18;
  y = absatz(d.intro, xl, y, xr - xl, { size: 10.5 }) + 8;

  // Tabelle
  const sp = [xl, mm(118), mm(150), xr];
  const kopfzeile = () => { text(d.spalte, sp[0], y, { size: 8.5, bold: true, color: GRAU }); rechts('Menge', sp[1] + 30, y, { size: 8.5, bold: true, color: GRAU }); rechts('Einzelpreis', sp[2] + 40, y, { size: 8.5, bold: true, color: GRAU }); rechts('Betrag', sp[3], y, { size: 8.5, bold: true, color: GRAU });
    y += 6; seite.drawLine({ start: { x: xl, y: H - y }, end: { x: xr, y: H - y }, thickness: 0.6, color: GRAU }); y += 14; };
  kopfzeile();
  for (const p of d.positionen) {
    if (y > H - mm(75)) { text('… weitere Positionen siehe „Mein SSV“', sp[0], y, { size: 9.5, color: GRAU }); y += 18; break; }   // sehr lange Listen
    const zeilen = umbrechen(p.text, sp[1] - sp[0] - 20, 9.5);
    zeilen.forEach((z, i) => text(z, sp[0], y + i * 13, { size: 9.5 }));
    rechts(p.menge, sp[1] + 30, y, { size: 9.5 }); rechts(geld(p.einzel), sp[2] + 40, y, { size: 9.5 }); rechts(geld(p.betrag), sp[3], y, { size: 9.5 });
    y += zeilen.length * 13 + 5;
  }
  seite.drawLine({ start: { x: xl, y: H - y + 6 }, end: { x: xr, y: H - y + 6 }, thickness: 1.2, color: TINTE }); y += 8;
  text('Zusammen', xl, y, { size: 10.5, bold: true }); rechts(geld(d.summe), xr, y, { size: 10.5, bold: true }); y += 24;

  // Zahlung, Ansprechpartner, Gruß
  y = absatz(d.zahlung, xl, y, xr - xl, { size: 10.5 }) + 6;
  y = absatz('Kommt dir etwas komisch vor? Dann sprich ' + (e.kassenwart_name || 'den Kassenwart') + ' einfach am Steg oder in der Messe an – oder schreib kurz an ' + e.verein_email + '.', xl, y, xr - xl, { size: 10.5 }) + 14;
  text(e.fusstext, xl, y, { size: 10.5 }); y += 28;
  if (e.kassenwart_name) { text('Dein Kassenwart ' + e.kassenwart_name, xl, y, { size: 10.5 }); y += 14; }
  text('für den ' + e.verein_name, xl, y, { size: 9.5, color: GRAU }); y += 18;
  if (d.fussnote) absatz(d.fussnote, xl, y, xr - xl, { size: 7.5, color: GRAU });

  // Fußzeile
  seite.drawLine({ start: { x: xl, y: mm(20) }, end: { x: xr, y: mm(20) }, thickness: 0.5, color: GRAU });
  text(d.fusszeile[0], xl, H - mm(15), { size: 7, color: GRAU });
  if (d.fusszeile[1]) text(d.fusszeile[1], xl, H - mm(11), { size: 7, color: GRAU });
  return await doc.save();
}
