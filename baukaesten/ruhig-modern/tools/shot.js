/* QA-Werkzeug Baukasten „Ruhig-Modern" — Playwright-Screenshots, Reveal-Zählung, DSGVO-Check.

   Aufruf:  node shot.js <site-dir> <out-dir> [seite1.html seite2.html …]
            ohne Seitenliste: alle *.html im Site-Ordner außer _*.html

   Pro Seite × Viewport (Desktop 1440×900, Mobil 390×844):
     1. eigener statischer Server (127.0.0.1, freier Port) — kein python-Server nötig
     2. durchscrollen → Reveals auslösen, zählen: .rv,.rv-img,[data-line],[data-draw] mit .is-in → „n/n"
     3. Console-Errors, JS-Exceptions, fehlgeschlagene Requests (4xx/5xx, abgebrochen), kaputte <img>
     4. DSGVO: JEDER Request an einen fremden Host = Fehler (wird zusätzlich blockiert)
     5. horizontaler Overflow (scrollWidth > clientWidth), Verursacher werden benannt
     6. End-State-CSS (alles enthüllt, keine Transition/Animation) → Screenshots:
          <seite>-desktop.png / <seite>-mobile.png (fullPage), <seite>-desktop-top.png (Viewport)
   Am Ende: Tabelle, Gesamtgröße Site-Ordner (MB), Exit-Code 1 bei jedem Fehler.

   Lehren aus premium-estate: fullPage-Screenshot startet CSS-Animationen neu → End-State
   injizieren; Header-Zustand (kompakt beim Scrollen) → vor dem Top-Schuss nach oben scrollen. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  const g = require('child_process').execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(g, 'playwright')));
}

const [SITE_ARG, OUT_ARG, ...PAGE_ARGS] = process.argv.slice(2);
if (!SITE_ARG || !OUT_ARG) {
  console.error('Aufruf: node shot.js <site-dir> <out-dir> [seite.html …]');
  process.exit(2);
}
const SITE = path.resolve(SITE_ARG);
const OUT = path.resolve(OUT_ARG);
const PAGES = PAGE_ARGS.length ? PAGE_ARGS
  : fs.readdirSync(SITE).filter(f => f.endsWith('.html') && !f.startsWith('_')).sort();
if (!PAGES.length) { console.error('Keine *.html in ' + SITE); process.exit(2); }

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];
const REVEAL = '.rv,.rv-img,[data-line],[data-draw]';

const MIME = {
  html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  json: 'application/json', webmanifest: 'application/manifest+json', xml: 'application/xml', txt: 'text/plain; charset=utf-8',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  svg: 'image/svg+xml', ico: 'image/x-icon', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf',
  mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
};

/* End-State: alle Reveals sichtbar, nichts animiert mehr (Klassen werden zusätzlich per JS gesetzt) */
const END_CSS = `
html{scroll-behavior:auto!important}
*,*::before,*::after{transition:none!important;animation:none!important}
.rv{opacity:1!important;transform:none!important}
[data-line]{transform:none!important}
[data-draw]{stroke-dashoffset:0!important}`;

function serve(root) {
  return http.createServer((req, res) => {
    let u;
    try { u = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    let file = path.normalize(path.join(root, u));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 ' + u); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).slice(1).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

function dirSize(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((s, f) => s + dirSize(path.join(p, f)), 0);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const short = (s, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

(async () => {
  const server = serve(SITE).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const rows = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
      isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'de-DE',
      serviceWorkers: 'block',
    });
    let foreign = [];
    /* DSGVO-Check: alles außerhalb des lokalen Servers wird gemeldet und blockiert */
    await ctx.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(ORIGIN + '/')) return route.continue();
      foreign.push(url);
      return route.abort('blockedbyclient');
    });

    for (const pg of PAGES) {
      const errors = [];
      foreign = [];
      let bytes = 0;
      const page = await ctx.newPage();
      page.on('console', m => {
        if (m.type() !== 'error') return;
        // „Failed to load resource" kommt doppelt: wird schon als HTTP 4xx/5xx bzw. FREMDER HOST gemeldet
        if (/Failed to load resource|ERR_BLOCKED_BY_CLIENT/.test(m.text())) return;
        errors.push('console: ' + short(m.text()));
      });
      page.on('pageerror', e => errors.push('js: ' + short(String(e.message || e))));
      page.on('response', r => {
        if (r.status() >= 400 && r.url().startsWith(ORIGIN)) errors.push(`HTTP ${r.status()}: ${r.url().slice(ORIGIN.length)}`);
      });
      page.on('requestfailed', r => {
        if (!r.url().startsWith(ORIGIN)) return; // fremde Hosts separat
        errors.push(`failed: ${r.url().slice(ORIGIN.length)} (${(r.failure() || {}).errorText || '?'})`);
      });
      page.on('requestfinished', async r => {
        try { const s = await r.sizes(); bytes += s.responseBodySize; } catch (e) { /* Seite schon zu */ }
      });

      let resp;
      try {
        resp = await page.goto(`${ORIGIN}/${pg}`, { waitUntil: 'load', timeout: 30000 });
      } catch (e) { errors.push('goto: ' + short(e.message)); }
      if (resp && resp.status() >= 400) errors.push(`Seite selbst: HTTP ${resp.status()}`);
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await sleep(400);

      /* 1 · durchscrollen (Reveals per IntersectionObserver auslösen) */
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        const step = Math.max(200, Math.round(innerHeight * 0.55));
        for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
          scrollTo(0, y); await new Promise(r => setTimeout(r, 110));
        }
        scrollTo(0, document.documentElement.scrollHeight);
        await new Promise(r => setTimeout(r, 300));
      });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await sleep(900); // längste Reveal-Transition (≤ 900 ms) abwarten

      /* 2 · Messen */
      const m = await page.evaluate(sel => {
        const all = [...document.querySelectorAll(sel)];
        const notIn = all.filter(e => !e.classList.contains('is-in')).slice(0, 5).map(e => {
          const id = e.id ? '#' + e.id : '';
          const cls = e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '';
          return e.tagName.toLowerCase() + id + cls;
        });
        const de = document.documentElement;
        const vw = de.clientWidth;
        const overflow = Math.max(de.scrollWidth, document.body ? document.body.scrollWidth : 0) - vw;
        let culprits = [];
        if (overflow > 0) {
          culprits = [...document.querySelectorAll('body *')].filter(e => {
            const r = e.getBoundingClientRect();
            return r.width && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed';
          }).slice(0, 4).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : '')
            + ` (right ${Math.round(e.getBoundingClientRect().right)}px)`);
        }
        const broken = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src'))
          .map(i => i.getAttribute('src'));
        return { total: all.length, inn: all.length - all.filter(e => !e.classList.contains('is-in')).length, notIn, overflow, culprits, broken };
      }, REVEAL).catch(e => ({ total: 0, inn: 0, notIn: [], overflow: 0, culprits: [], broken: [], err: e.message }));
      if (m.err) errors.push('measure: ' + short(m.err));
      if (m.inn !== m.total) errors.push(`Reveals ${m.inn}/${m.total} — nicht enthüllt: ${m.notIn.join(', ')}`);
      if (m.overflow > 0) errors.push(`horizontaler Overflow ${m.overflow}px: ${m.culprits.join(', ') || '?'}`);
      m.broken.forEach(s => errors.push('Bild kaputt: ' + s));
      [...new Set(foreign)].forEach(u => errors.push('FREMDER HOST (DSGVO): ' + short(u)));

      /* 3 · End-State + Screenshots */
      const base = pg.replace(/\.html$/, '');
      try {
        await page.addStyleTag({ content: END_CSS });
        await page.evaluate(sel => document.querySelectorAll(sel).forEach(e => e.classList.add('is-in')), REVEAL);
        await page.evaluate(() => scrollTo(0, 0));
        await sleep(350);
        if (vp.name === 'desktop') await page.screenshot({ path: path.join(OUT, `${base}-desktop-top.png`) });
        await page.screenshot({ path: path.join(OUT, `${base}-${vp.name}.png`), fullPage: true });
      } catch (e) { errors.push('screenshot: ' + short(e.message)); }

      rows.push({ page: pg, vp: vp.name, reveals: `${m.inn}/${m.total}`, overflow: m.overflow > 0 ? `${m.overflow}px` : '–',
        foreign: new Set(foreign).size, kb: Math.round(bytes / 1024), errors });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  server.close();

  /* 4 · Bericht */
  const head = ['Seite', 'Viewport', 'Reveals', 'Overflow', 'Fremd', 'KB', 'Fehler', 'Status'];
  const data = rows.map(r => [r.page, r.vp, r.reveals, r.overflow, String(r.foreign), String(r.kb), String(r.errors.length), r.errors.length ? 'FEHLER' : 'ok']);
  const w = head.map((h, i) => Math.max(h.length, ...data.map(d => d[i].length)));
  const line = cells => cells.map((c, i) => (i >= 2 && i <= 6 ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  ');
  console.log('\n' + line(head) + '\n' + w.map(n => '─'.repeat(n)).join('  '));
  data.forEach(d => console.log(line(d)));

  const bad = rows.filter(r => r.errors.length);
  if (bad.length) {
    console.log('\nFehler im Detail:');
    bad.forEach(r => { console.log(`  ${r.page} [${r.vp}]`); r.errors.forEach(e => console.log('    – ' + e)); });
  }
  const mb = dirSize(SITE) / 1048576;
  console.log(`\nSite-Ordner gesamt: ${mb.toFixed(2)} MB${mb >= 10 ? '  ✗ über 10 MB-Budget' : ''}`);
  console.log(`Screenshots: ${OUT}`);
  console.log(bad.length || mb >= 10 ? `\nERGEBNIS: ${bad.length} Seite/Viewport-Kombination(en) mit Fehlern` : '\nERGEBNIS: alles grün');
  process.exit(bad.length || mb >= 10 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
