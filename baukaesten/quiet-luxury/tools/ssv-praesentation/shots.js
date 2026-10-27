// Frische Screenshots für die Vorstands-PDF
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const OUT = '/tmp/claude-0/pdf/';
const MIME = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/json'};
function server(root, port) { return new Promise((ok) => { const s = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  fs.readFile(path.join(root, u), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, {'Content-Type': MIME[path.extname(u)] || 'application/octet-stream'}); r.end(d); }); }); s.listen(port, () => ok(s)); }); }
async function fertig(p) { await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}.reveal{opacity:1!important;transform:none!important;transition:none!important}.icon-draw .dl{animation:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}.hero-bg img{animation:none!important}'+'.scroll-cue{display:none}.site-header.solid{display:none}' }); }
(async () => {
  const s1 = await server('/home/user/Web-Projekte/webseiten/ssv-segelverein', 8671);
  const s2 = await server('/home/user/Web-Projekte/apps/ssv-getraenke', 8672);
  const b = await chromium.launch();
  // Website Desktop
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage(); await p.goto('http://127.0.0.1:8671/index.html'); await p.waitForTimeout(1500); await fertig(p);
  await p.screenshot({ path: OUT + 'w-hero.jpg', quality: 82 });
  for (const [sel, name] of [['.aktuelles-sec', 'w-aktuelles'], ['.zahlen-sec', 'w-zahlen']]) { await p.locator(sel).scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.locator(sel).screenshot({ path: OUT + name + '.jpg', quality: 82 }); }
  await p.goto('http://127.0.0.1:8671/verein.html'); await p.waitForTimeout(1200); await fertig(p);
  await p.locator('#vorstand').scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  const top = await p.evaluate(() => document.querySelector('#vorstand').getBoundingClientRect().top + window.scrollY); await p.screenshot({ path: OUT + 'w-vorstand.jpg', quality: 82, fullPage: true, clip: { x: 0, y: top + 60, width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:8671/termine.html'); await p.waitForTimeout(1200); await fertig(p);
  await p.evaluate(() => window.scrollTo(0, 620)); await p.waitForTimeout(600); await p.screenshot({ path: OUT + 'w-termine.jpg', quality: 82 });
  // Website Handy
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const mp = await m.newPage(); await mp.goto('http://127.0.0.1:8671/index.html'); await mp.waitForTimeout(1500); await fertig(mp);
  await mp.screenshot({ path: OUT + 'w-handy.jpg', quality: 82 });
  // Redaktion
  const r = await ctx.newPage(); r.on('dialog', (d) => d.accept());
  await r.goto('http://127.0.0.1:8671/verwaltung/'); await r.waitForTimeout(400); await r.click('#login-form button[type=submit]'); await r.waitForTimeout(800);
  await r.screenshot({ path: OUT + 'r-start.jpg', quality: 82 });
  await r.click('#nav [data-tab="termine"]'); await r.waitForTimeout(300); await r.click('#neu');
  await r.fill('#tf [name=titel]', 'Neujahrsempfang'); await r.fill('#tf [name=datum]', '2027-01-03'); await r.fill('#tf [name=zeit]', '11:00'); await r.fill('#tf [name=ort]', 'Vereinsheim');
  await r.waitForTimeout(300); await r.screenshot({ path: OUT + 'r-termin.jpg', quality: 82 });
  await r.click('#ok'); await r.waitForTimeout(800);
  await r.click('#nav [data-tab="hinweis"]'); await r.waitForTimeout(400);
  await r.fill('#f [name=text]', 'Arbeitsdienst am Samstag ab 9 Uhr – bitte Handschuhe mitbringen.'); await r.click('#f button[type=submit]'); await r.waitForTimeout(2200);
  await r.screenshot({ path: OUT + 'r-hinweis.jpg', quality: 82 });
  // Kasse (iPad quer)
  const k = await b.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1.5, hasTouch: true });
  const kp = await k.newPage(); await kp.goto('http://127.0.0.1:8672/index.html'); await kp.waitForTimeout(700);
  await kp.screenshot({ path: OUT + 'k1.jpg', quality: 82 });
  await kp.fill('#suche', 'jess'); await kp.click('.k-name'); await kp.waitForTimeout(300);
  for (const z of '12') await kp.click('#keypad [data-k="' + z + '"]'); await kp.waitForTimeout(200);
  await kp.screenshot({ path: OUT + 'k2.jpg', quality: 82 });
  for (const z of '34') await kp.click('#keypad [data-k="' + z + '"]'); await kp.waitForTimeout(800);
  await kp.click('.k-kachel >> nth=0'); await kp.waitForTimeout(500); await kp.screenshot({ path: OUT + 'k3.jpg', quality: 82 });
  await kp.click('#mengen-stk [data-n="2"]'); await kp.waitForTimeout(400);
  await kp.click('.k-kachel >> nth=5'); await kp.waitForTimeout(400); await kp.click('#mengen-kasten [data-n="1"]'); await kp.waitForTimeout(400);
  await kp.screenshot({ path: OUT + 'k4.jpg', quality: 82 });
  await kp.click('#btn-buchen'); await kp.waitForTimeout(1300); await kp.screenshot({ path: OUT + 'k5.jpg', quality: 82 });
  // Kassenwart
  const a = await ctx.newPage(); a.on('dialog', (d) => d.accept());
  await a.goto('http://127.0.0.1:8672/kassenwart.html'); await a.waitForTimeout(300); await a.click('#login-form button[type=submit]'); await a.waitForTimeout(800);
  await a.screenshot({ path: OUT + 'a-uebersicht.jpg', quality: 82 });
  await a.click('#nav [data-tab="abrechnung"]'); await a.waitForTimeout(700); await a.screenshot({ path: OUT + 'a-abrechnung.jpg', quality: 82 });
  const [rt] = await Promise.all([ctx.waitForEvent('page'), a.click('#a-los')]); await rt.waitForLoadState(); await rt.waitForTimeout(800);
  await rt.addStyleTag({content:'.r-leiste{display:none}'}); await rt.locator('.r-blatt >> nth=0').screenshot({ path: OUT + 'a-rechnung.jpg', quality: 85 });
  await b.close(); s1.close(); s2.close(); console.log('ok');
})();
