/* QA-Vorlage Premium-Estate — Playwright-Screenshots + Reveal-Zählung.
   Aufruf:  node shot.js <site-dir> <out-dir> [seite1.html seite2.html …]
   Vorher:  python3 -m http.server im Site-Ordner ODER dieses Skript
   startet selbst einen statischen Server (siehe unten).
   Wichtigste Lehren:
   - fullPage-Screenshot startet CSS-Animationen neu → End-State-CSS injizieren
   - fonts.googleapis.com ist offline → Interception auf lokale TTFs
   - Preloader/Vorhang vor dem Schuss entfernen, sessionStorage 'pe-seen' setzen */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SITE = process.argv[2];
const OUT = process.argv[3];
const PAGES = process.argv.slice(4);
const FONTS = path.resolve(SITE, '..', '..', '.preview-cache', 'fonts');

const MIME = { html: 'text/html', css: 'text/css', js: 'text/javascript', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', ttf: 'font/ttf' };

const FONT_CSS = `
@font-face{font-family:'Fraunces';src:url('/__f/Fraunces.ttf');font-weight:100 900;font-style:normal}
@font-face{font-family:'Fraunces';src:url('/__f/Fraunces-Italic.ttf');font-weight:100 900;font-style:italic}
@font-face{font-family:'Pinyon Script';src:url('/__f/PinyonScript.ttf');font-weight:400}
@font-face{font-family:'Outfit';src:url('/__f/Outfit.ttf');font-weight:100 900}`;

/* End-State: alles enthüllt, nichts animiert mehr */
const END_CSS = `
html{scroll-behavior:auto!important}
*,*::before,*::after{animation-play-state:paused!important}
.preloader,.curtain{display:none!important}
.rv,.split .w>span,.line-h,.line-v{opacity:1!important;transform:none!important;transition:none!important}
.rv-img{clip-path:none!important;transition:none!important}
.rv-img img{transform:none!important;transition:none!important}
.hero-media img,.hero-media video{opacity:1!important;transform:scale(1.02)!important;transition:none!important}
.mq-track{animation:none!important;transform:none!important}
.scroll-hint i{animation:none!important}`;

(async () => {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    let file = u.startsWith('/__f/') ? path.join(FONTS, u.slice(5)) : path.join(SITE, u === '/' ? 'index.html' : u);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).slice(1)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const port = server.address().port;

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.route(/fonts\.googleapis\.com/, r => r.fulfill({ contentType: 'text/css', body: FONT_CSS }));
  await ctx.route(/fonts\.gstatic\.com/, r => r.abort());
  fs.mkdirSync(OUT, { recursive: true });

  for (const pg of PAGES) {
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { sessionStorage.setItem('pe-seen', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${pg}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    /* Alle Reveals durchscrollen */
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      const h = document.body.scrollHeight;
      for (let y = 0; y <= h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);
    const counts = await page.evaluate(() => {
      const q = s => document.querySelectorAll(s).length;
      return {
        rv: [q('.rv.in,.rv-img.in,.line-h.in,.line-v.in,.split.in'), q('.rv,.rv-img,.line-h,.line-v,.split')],
        err: window.__jsErrors || []
      };
    });
    await page.addStyleTag({ content: END_CSS });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, pg.replace('.html', '') + '-full.png'), fullPage: true });
    console.log(`${pg}  reveals ${counts.rv[0]}/${counts.rv[1]}`);
    await page.close();
  }
  await browser.close(); server.close();
})();
