const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const SITE = require('path').resolve(process.argv[2]), OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', woff2: 'font/woff2', jpg: 'image/jpeg', png: 'image/png' };
let posted = null;
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.startsWith('/api/')) { let b = ''; req.on('data', c => b += c); return req.on('end', () => { posted = b; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); }); }
  let f = u === '/' ? path.join(SITE, 'index.html') : path.extname(u) ? path.join(SITE, u) : path.join(SITE, u + '.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f).slice(1), st = fs.statSync(f), range = req.headers.range;
  if (range && (ext === 'mp4' || ext === 'webm')) { const [s, e] = range.replace('bytes=', '').split('-'); const a = +s, z = e ? +e : st.size - 1;
    res.writeHead(206, { 'Content-Range': `bytes ${a}-${z}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': z - a + 1, 'Content-Type': MIME[ext] }); return fs.createReadStream(f, { start: a, end: z }).pipe(res); }
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const P = server.address().port, B = `http://127.0.0.1:${P}`;
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // 1) Erster Besuch mit Klappe
  await p.goto(B + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(650); await p.screenshot({ path: OUT + '/01-klappe.png' });
  await p.waitForTimeout(2600); await p.screenshot({ path: OUT + '/02-hero.png' });
  // 2) Skript-Kapitel: drei Scrollpositionen
  const top = await p.evaluate(() => document.querySelector('.skript').getBoundingClientRect().top + scrollY);
  const h = await p.evaluate(() => document.querySelector('.skript').offsetHeight - innerHeight);
  for (const [i, f] of [[3, 0.05], [4, 0.5], [5, 0.95]]) {
    await p.evaluate(y => window.scrollTo(0, y), top + h * f); await p.waitForTimeout(1300);
    await p.screenshot({ path: OUT + `/0${i}-skript-${f}.png` });
  }
  // 3) Wort-Aufhellung halb
  const say = await p.evaluate(() => document.querySelector('.say').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => window.scrollTo(0, y - 500), say); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/06-say.png' });
  // 4) Menü offen
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  await p.click('.menu-btn'); await p.waitForTimeout(1300); await p.screenshot({ path: OUT + '/07-menu.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  // 5) Quiz durchspielen (mit Vorauswahl ?branche=handwerk)
  await p.goto(B + '/anfrage?branche=handwerk', { waitUntil: 'load' }); await p.waitForTimeout(900);
  const step = async () => p.evaluate(() => [...document.querySelectorAll('.q-step')].findIndex(s => s.classList.contains('on')));
  console.log('start step (erwartet 1):', await step());
  await p.screenshot({ path: OUT + '/08-quiz-step2.png' });
  await p.click('label.opt:has(input[value="mitarbeiter"])'); await p.waitForTimeout(600);
  console.log('nach Ziel (erwartet 2):', await step());
  await p.click('[data-q="next"]'); await p.waitForTimeout(400);
  console.log('weiter ohne Paket (erwartet 2):', await step());
  await p.click('label.opt:has(input[value="8"])'); await p.click('label.opt:has(input[value="recruiting"])');
  await p.click('[data-q="next"]'); await p.waitForTimeout(400);
  await p.click('label.opt:has(input[value="sofort"])'); await p.click('label.opt:has(input[value="luebeck"])'); await p.fill('#ort', 'Lübeck');
  await p.click('[data-q="next"]'); await p.waitForTimeout(400);
  console.log('Kontaktschritt (erwartet 4):', await step());
  await p.click('[data-q="send"]'); await p.waitForTimeout(400);
  console.log('Fehler sichtbar:', await p.evaluate(() => document.querySelectorAll('.field.bad').length));
  await p.screenshot({ path: OUT + '/09-quiz-fehler.png' });
  // Kontaktweg WhatsApp verlangt Telefonnummer, E-Mail allein reicht nicht
  await p.click('label.opt:has(input[value="whatsapp"])');
  await p.fill('#name', 'Testkunde'); await p.fill('#email', 'test@example.de');
  await p.click('[data-q="send"]'); await p.waitForTimeout(400);
  console.log('WhatsApp ohne Telefon, Fehler (erwartet 1):', await p.evaluate(() => document.querySelectorAll('.field.bad').length),
    'Fokus:', await p.evaluate(() => document.activeElement && document.activeElement.id));
  await p.fill('#telefon', '0451 123456');
  await p.waitForTimeout(4200);
  await Promise.all([p.waitForURL(/danke/, { timeout: 8000 }).catch(() => {}), p.click('[data-q="send"]')]);
  await p.waitForTimeout(1200);
  console.log('nach Senden URL:', p.url().replace(B, ''), 'POST:', posted);
  await p.screenshot({ path: OUT + '/10-danke.png' });
  console.log('Danke-Block Handwerk sichtbar:', await p.evaluate(() => { const e = document.querySelector('[data-b="handwerk"]'); return !!e && !e.hidden; }));
  // 6) Referenz mit Ton-Knopf
  await p.goto(B + '/referenzen', { waitUntil: 'load' }); await p.waitForTimeout(800);
  await p.click('.filter button[data-f="immobilien"]'); await p.waitForTimeout(300);
  console.log('Filter Immobilien sichtbar:', await p.evaluate(() => [...document.querySelectorAll('.reel-grid [data-branche]')].filter(e => !e.hidden).length));
  console.log('JS-Fehler:', errs);
  await br.close(); server.close();
})();
