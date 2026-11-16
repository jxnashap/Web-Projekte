/* QA Neon-Baukasten — Funktionstest im echten Browser: Intro, Videos, Menü, Lightbox, Countdown, Event-Sortierung.
   Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node interact.js <site-dir> */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.resolve(process.argv[2]);
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', woff2: 'font/woff2', svg: 'image/svg+xml',
  webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', ics: 'text/calendar' };
const loaded = [];
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = u.endsWith('/') ? path.join(SITE, u, 'index.html') : path.join(SITE, u);
  if (u.endsWith('.mp4')) loaded.push(path.basename(u));
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const stat = fs.statSync(f), ext = path.extname(f).slice(1), range = req.headers.range;
  if (range && ext === 'mp4') {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = +s, end = e ? +e : stat.size - 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': 'video/mp4' });
    return fs.createReadStream(f, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': stat.size });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const ok = (b, t) => console.log((b ? 'OK    ' : 'FEHLER') + '  ' + t);
(async () => {
  const B = `http://127.0.0.1:${server.address().port}`;
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  // Desktop
  let ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(B + '/');
  ok(await p.$('.boot') !== null, 'Intro erscheint beim ersten Besuch');
  await p.waitForTimeout(2600);
  ok(await p.$('.boot') === null, 'Intro ist nach dem Einschalten wieder weg');
  ok(await p.evaluate(() => document.querySelectorAll('.wordmark .c').length > 8 && document.querySelector('.wordmark').classList.contains('in')), 'Wortmarke zündet Buchstabe für Buchstabe');
  await p.waitForTimeout(1500);
  // Das Test-Chromium kann kein H.264 (lizenzfrei gebaut). Dann prüfen wir, dass Quelle gesetzt und Abspielen angestoßen wurde.
  const H264 = await p.evaluate(() => !!document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"'));
  const playing = (sel) => p.evaluate(([s, h]) => { const v = document.querySelector(s); return h ? v.currentTime > 0 && !v.paused : !!v.dataset.loaded && /\.mp4$/.test(v.currentSrc); }, [sel, H264]);
  if (!H264) console.log('INFO    Test-Browser ohne H.264: Videos werden auf Laden und Abspielbefehl geprüft');
  ok(await playing('.hero-vid-desk video'), 'Hero-Video startet auf dem Desktop');
  ok(!loaded.includes('hero-mob.mp4'), 'Mobil-Video wird auf dem Desktop nicht geladen');
  ok(!loaded.includes('stadt.mp4'), 'Stadt-Video lädt erst beim Scrollen');
  const cd = await p.evaluate(() => { const c = document.querySelector('[data-countdown]'); return !c.hidden && c.querySelector('[data-u=d]').textContent; });
  ok(cd && +cd >= 0, `Countdown läuft (${cd} Tage)`);
  const href = await p.getAttribute('[data-fill-href]', 'href');
  ok(/cherry-moon\.de\/events\//.test(href), `„Tickets sichern“ zeigt auf den Shop des nächsten Events (${href})`);
  await p.evaluate(() => document.querySelector('.duo').scrollIntoView()); await p.waitForTimeout(1800);
  ok(await playing('.duo video') && loaded.includes('stadt.mp4'), 'Stadt-Video startet, wenn es sichtbar wird');
  await p.evaluate(() => document.querySelector('.bento').scrollIntoView()); await p.waitForTimeout(900);
  await p.click('.bento .gal-i'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('.lb').hidden && document.activeElement.classList.contains('lb-x')), 'Lightbox öffnet, Fokus auf Schließen');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  const cap = await p.textContent('.lb figcaption');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelector('.lb').hidden), `Pfeiltaste blättert (${cap}), Escape schließt`);
  await p.click('.pause-btn');
  ok(await p.evaluate(() => document.documentElement.classList.contains('paused') && [...document.querySelectorAll('video')].every(v => v.paused)), 'Bewegung anhalten pausiert Videos und Animationen');
  await p.goto(B + '/');
  ok(await p.$('.boot') === null, 'Intro kommt in derselben Sitzung nicht noch einmal');
  // Event-Sortierung mit gefälschtem Datum: nach Coda und Silvester bleibt Tanz in den Mai
  await ctx.close();
  ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { const T = new Date('2027-02-01T12:00:00+01:00').getTime(); const D = Date; Date.now = () => T; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } }; });
  p = await ctx.newPage();
  await p.goto(B + '/events/'); await p.waitForTimeout(400);
  const ev = await p.evaluate(() => ({ up: [...document.querySelectorAll('[data-events] .ev')].map(e => e.dataset.name), arch: [...document.querySelectorAll('#archiv-ev .ev')].map(e => e.dataset.name), box: !document.querySelector('[data-archive-box]').hidden }));
  ok(ev.up.length === 1 && ev.arch.length === 2 && ev.box, `Vergangene Events wandern ins Archiv (kommend: ${ev.up.join(', ')})`);
  await p.goto(B + '/'); await p.waitForTimeout(2600);
  ok((await p.textContent('[data-next] [data-fill=name]')).includes('Tanz'), 'Startseite zeigt das nächste kommende Event');
  await ctx.close();
  // Mobil
  ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  loaded.length = 0;
  await p.goto(B + '/'); await p.waitForTimeout(3200);
  ok(loaded.includes('hero-mob.mp4') && !loaded.includes('hero-desk.mp4'), 'Mobil lädt nur das Hochformat-Video');
  await p.click('.menu-btn'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.getElementById('menu').hidden && document.querySelector('.menu-btn').getAttribute('aria-expanded') === 'true'), 'Menü öffnet mobil');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('menu').hidden), 'Escape schließt das Menü');
  await ctx.close();
  // Reduzierte Bewegung: kein Intro, keine Videos
  ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  p = await ctx.newPage(); loaded.length = 0;
  await p.goto(B + '/'); await p.waitForTimeout(1500);
  ok(await p.$('.boot') === null && !loaded.length, 'Reduzierte Bewegung: kein Intro, keine Videos, nur Standbilder');
  await ctx.close();
  ok(!errs.length, 'Keine JS-Fehler' + (errs.length ? ': ' + errs.join(' / ') : ''));
  await br.close(); server.close();
})();
