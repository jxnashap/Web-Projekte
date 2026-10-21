/* QA Drehbuch-Baukasten — Playwright-Screenshots + Prüfungen.
   Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node shot.js <site-dir> <out-dir> [--mobile] [--flat] [/pfad /pfad2 …]
   Ohne Pfade: alle *.html der Site (saubere URLs wie auf Vercel).
   Prüft pro Seite: Reveals n/n, JS-Fehler, 404-Anfragen, horizontales Überlaufen.
   --flat: Skript-Kapitel ohne Sticky (für lesbare Ganzseiten-Shots). */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const SITE = path.resolve(args[0]);
const OUT = path.resolve(args[1]);
const MOBILE = args.includes('--mobile');
const FLAT = args.includes('--flat');
let PAGES = args.slice(2).filter(a => !a.startsWith('--'));

const MIME = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', png: 'image/png', jpg: 'image/jpeg',
  webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', woff2: 'font/woff2', xml: 'application/xml', txt: 'text/plain' };

function walk(dir, base = '') {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (!['media', 'img', 'fonts', 'css', 'js', 'api', 'node_modules'].includes(f)) out = out.concat(walk(p, base + '/' + f)); }
    else if (f.endsWith('.html')) out.push(base + '/' + f.replace(/\.html$/, '').replace(/^index$/, ''));
  }
  return out.map(p => p.replace(/\/$/, '') || '/');
}
if (!PAGES.length) PAGES = walk(SITE).sort();

const END_CSS = `
html{scroll-behavior:auto!important}
*,*::before,*::after{animation-play-state:paused!important}
.klappe,.curtain{display:none!important}
.rv,.split .w>span,.split .c,.line-h,.rv-focus{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
.rv-img{clip-path:none!important;transition:none!important}
.say .sw{opacity:1!important}
.mq-track{animation:none!important;transform:none!important}
` + (FLAT ? `.skript{height:auto!important}.skript-stage{position:relative!important;height:auto!important;padding-block:6rem}
.explain{min-height:0!important;display:flex;flex-direction:column;gap:2rem}.explain .scrub-step{position:relative!important;opacity:1!important;transform:none!important}
.beat{opacity:1!important}.mbar{transform:none!important}` : '');

(async () => {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u.startsWith('/api/')) {
      let body = ''; req.on('data', c => body += c);
      return req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true,"mock":true}'); });
    }
    let file = path.join(SITE, u);
    if (u === '/') file = path.join(SITE, 'index.html');
    else if (!path.extname(u)) file = path.join(SITE, u + '.html');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/html' }); return fs.createReadStream(path.join(SITE, '404.html')).pipe(res);
    }
    const ext = path.extname(file).slice(1);
    const stat = fs.statSync(file);
    const range = req.headers.range;
    if (range && (ext === 'mp4' || ext === 'webm')) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = parseInt(s, 10), end = e ? parseInt(e, 10) : stat.size - 1;
      res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': MIME[ext] });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': stat.size });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const port = server.address().port;

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext(MOBILE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  fs.mkdirSync(OUT, { recursive: true });
  const report = [];

  for (const pg of PAGES) {
    const page = await ctx.newPage();
    const errors = [], missing = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/api/')) missing.push(r.status() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '')); });
    await page.addInitScript(() => { try { sessionStorage.setItem('db-seen', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}${pg}`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      const h = document.body.scrollHeight;
      for (let y = 0; y <= h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const q = s => document.querySelectorAll(s).length;
      const sw = document.documentElement.scrollWidth, vw = window.innerWidth;
      const wide = [];
      if (sw > vw + 1) document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && !el.closest('.reels,.marquee,.nav-overlay,.mq-track') && wide.length < 6) wide.push(el.tagName + '.' + (el.className || '').toString().slice(0, 40) + ' r=' + Math.round(r.right));
      });
      return { rv: [q('.rv.in,.rv-img.in,.rv-focus.in,.line-h.in,.split.in'), q('.rv,.rv-img,.rv-focus,.line-h,.split')],
               h1: q('h1'), title: document.title, overflow: sw - vw, wide,
               ph: q('.ph'), dashes: (document.body.innerText.match(/[–—]/g) || []).length };
    });
    await page.addStyleTag({ content: END_CSS });
    await page.waitForTimeout(250);
    const name = (pg === '/' ? 'index' : pg.slice(1).replace(/\//g, '__')) + (MOBILE ? '-m' : '') + '.png';
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    const line = `${pg.padEnd(36)} rv ${info.rv[0]}/${info.rv[1]}  h1 ${info.h1}  ph ${info.ph}  striche ${info.dashes}  overflow ${info.overflow}${info.wide.length ? ' ' + info.wide.join(' | ') : ''}${errors.length ? '  JS-FEHLER: ' + errors.join(' / ') : ''}${missing.length ? '  FEHLT: ' + [...new Set(missing)].join(', ') : ''}`;
    console.log(line); report.push(line);
    await page.close();
  }
  fs.writeFileSync(path.join(OUT, MOBILE ? 'report-mobile.txt' : 'report.txt'), report.join('\n'));
  await browser.close(); server.close();
})();
