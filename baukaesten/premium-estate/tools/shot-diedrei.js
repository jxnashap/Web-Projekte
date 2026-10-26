/* QA DIE DREI („Quiet Rosé") — abgeleitet von tools/shot.js.
   Aufruf:  node shot-diedrei.js <site-dir> <out-dir> [seite1.html …]
   Env:     DEV_ASSETS=<dir>   nur während der Entwicklung: fehlende Dateien von dort
                               ausliefern (wird als „dev-fallback" geloggt; Final-QA ohne!)
            ONLY=desktop|mobile  nur einen Viewport
   Unterschiede zu shot.js:
   - keine Font-Interception (Fonts self-hosted unter assets/fonts/)
   - chromium.launch() ohne Optionen
   - Desktop 1440×900 UND Mobile 390×844 (isMobile, hasTouch)
   - loggt jede Anfrage: 404 / externe Hosts / dev-fallback; JS-Fehler (pageerror + console.error)
   - prüft horizontales Scrollen, Reveal-Zählung n/n, grobe Kontrastprüfung (WCAG AA)
   - End-State-CSS vor dem fullPage-Screenshot (Screenshot startet CSS-Animationen neu)
   - zusätzlich Viewport-Shot (oben) und Ausschnitte (seg-N) für die Sichtprüfung */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const PAGES = process.argv.slice(4).length ? process.argv.slice(4)
  : ['index.html', 'bar.html', 'weinkarte.html', 'besuch.html', 'impressum.html', 'datenschutz.html', '404.html'];
const DEV = process.env.DEV_ASSETS ? path.resolve(process.env.DEV_ASSETS) : null;
const ONLY = process.env.ONLY || '';
const SEG = process.env.SEG !== '0';

const MIME = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', json: 'application/json',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif',
  svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', pdf: 'application/pdf',
  ico: 'image/x-icon', webmanifest: 'application/manifest+json' };

/* End-State: alles enthüllt, nichts animiert mehr — Klassen von „Quiet Rosé" */
const END_CSS = `
html{scroll-behavior:auto!important}
*,*::before,*::after{animation-play-state:paused!important}
.rv,.split .w>span,.line-h,.rise{opacity:1!important;transform:none!important;transition:none!important}
.rv-img{clip-path:none!important;transition:none!important}
.rv-img img{transform:none!important;transition:none!important}
.hero-media img{opacity:1!important;transform:none!important;transition:none!important}
.plx{transform:none!important}
.mq-track{animation:none!important;transform:none!important}
.site-header{transition:none!important}`;

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'tablet', viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
].filter(v => !ONLY || v.name === ONLY);

const devHits = new Set();

(async () => {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    let file = path.join(SITE, u === '/' ? 'index.html' : u);
    if ((!fs.existsSync(file) || fs.statSync(file).isDirectory()) && DEV) {
      const alt = path.join(DEV, u);
      if (fs.existsSync(alt) && !fs.statSync(alt).isDirectory()) { file = alt; devHits.add(u); }
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).slice(1).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  const summary = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext(vp);
    for (const pg of PAGES) {
      const page = await ctx.newPage();
      const errors = [], bad = [], ext = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      page.on('requestfailed', r => bad.push('FAILED ' + r.url()));
      page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
      page.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) ext.push(r.url()); });

      await page.goto(`${origin}/${pg}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      /* Alle Reveals durchscrollen */
      await page.evaluate(async (step) => {
        document.documentElement.style.scrollBehavior = 'auto';
        for (let y = 0; y <= document.body.scrollHeight; y += step) {
          window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
        }
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 300));
        window.scrollTo(0, 0);
      }, vp.name === 'mobile' ? 420 : 600);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1600);

      const info = await page.evaluate(() => {
        const q = s => document.querySelectorAll(s).length;
        /* grobe Kontrastprüfung: Textfarbe gegen ersten deckenden Hintergrund */
        function rgb(s) {
          const m = s.match(/[\d.]+/g); if (!m) return [0, 0, 0, 1];
          const v = m.map(Number);
          if (/^color\(srgb/.test(s)) return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1];
          return v;
        }
        function lum([r, g, b]) { return [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); })
          .reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); }
        function bgOf(el) {
          let stack = [];
          for (let e = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e); const c = rgb(cs.backgroundColor);
            const a = c.length > 3 ? c[3] : 1;
            if (cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)) return null;
            if (e.classList && (e.classList.contains('hero') || e.classList.contains('cta-band'))) return 'image';
            if (e.classList && e.classList.contains('site-header') && !e.classList.contains('scrolled') &&
                !document.body.classList.contains('page-light')) return 'image';
            if (a > 0) { stack.push([c, a]); if (a >= .99) break; }
          }
          let base = [251, 247, 245];
          for (let i = stack.length - 1; i >= 0; i--) { const [c, a] = stack[i]; base = base.map((v, k) => c[k] * a + v * (1 - a)); }
          return base;
        }
        const issues = [];
        const seen = new Set();
        document.querySelectorAll('body *').forEach(el => {
          if (!el.childNodes.length) return;
          const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          if (!hasText) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
          const bg = bgOf(el); if (!bg || bg === 'image') return;
          let fc = rgb(cs.color); const fa = fc.length > 3 ? fc[3] : 1;
          let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
          const a = fa * (op < .99 ? 1 : 1);
          const f = fc.slice(0, 3).map((v, k) => v * a + bg[k] * (1 - a));
          const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
          const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
          const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
          if (ratio < need) {
            const key = el.className + '|' + cs.color;
            if (!seen.has(key)) { seen.add(key); issues.push(`${ratio.toFixed(2)} <${need} ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${el.textContent.trim().slice(0, 40)}"`); }
          }
        });
        return {
          rv: [q('.rv.in,.rv-img.in,.line-h.in,.split.in,.rise.in'), q('.rv,.rv-img,.line-h,.split,.rise')],
          hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.marquee,.wk-chips,.hero-media,.plx-in,.nav-overlay'); })
            .slice(0, 5).map(e => e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 40) + ' r=' + Math.round(e.getBoundingClientRect().right)),
          contrast: issues.slice(0, 12),
          h: document.body.scrollHeight,
          today: (document.querySelector('[data-today]') || {}).textContent || '',
          isToday: document.querySelectorAll('.is-today').length,
          fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style).filter((v, i, a) => a.indexOf(v) === i),
        };
      });

      /* Hochskalierung: benötigte Gerätepixel (object-fit: cover) / echte Pixel der geladenen Datei.
         naturalWidth ist bei srcset dichte-korrigiert → Datei separat dekodieren. */
      info.upscale = await page.evaluate(async () => {
        const out = [];
        for (const im of document.images) {
          const r = im.getBoundingClientRect();
          if (!im.complete || !im.currentSrc || r.width < 3) continue;
          const t = new Image(); t.src = im.currentSrc;
          try { await t.decode(); } catch (e) { continue; }
          const dpr = window.devicePixelRatio;
          const f = Math.max(r.width * dpr / t.naturalWidth, r.height * dpr / t.naturalHeight);
          out.push({ f: +f.toFixed(2), src: im.currentSrc.split('/').pop(), hero: !!im.closest('.hero') });
        }
        return out.sort((a, b) => b.f - a.f);
      });
      await page.addStyleTag({ content: END_CSS });
      await page.waitForTimeout(300);
      const base = `${pg.replace('.html', '')}-${vp.name}`;
      await page.screenshot({ path: path.join(OUT, `${base}-top.png`) });
      await page.screenshot({ path: path.join(OUT, `${base}-full.png`), fullPage: true });
      if (SEG) {
        const segH = vp.name === 'mobile' ? 1400 : 1500;
        const W = vp.viewport.width;
        for (let y = 0, i = 0; y < info.h; y += segH, i++) {
          await page.screenshot({ path: path.join(OUT, `${base}-seg${i}.png`), fullPage: true,
            clip: { x: 0, y, width: W, height: Math.min(segH, info.h - y) } });
        }
      }
      /* Mobil: Overlay-Menü öffnen, Screenshot, wieder schließen */
      if (vp.name === 'mobile' && pg === PAGES[0]) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.click('.menu-btn'); await page.waitForTimeout(1500);
        const trap = [];
        for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); trap.push(await page.evaluate(() => (document.activeElement.textContent || document.activeElement.getAttribute('aria-label') || '').trim().slice(0, 14))); }
        const inert = await page.evaluate(() => ['main', 'footer', '.skip'].map(s => document.querySelector(s).hasAttribute('inert')));
        console.log('   menu focus cycle:', trap.join(' → '), '| inert main/footer/skip:', inert.join('/'));
        await page.screenshot({ path: path.join(OUT, `menu-mobile-open.png`) });
        const menuState = await page.evaluate(() => ({ expanded: document.querySelector('.menu-btn').getAttribute('aria-expanded'),
          vis: getComputedStyle(document.querySelector('.nav-overlay')).visibility }));
        await page.keyboard.press('Escape'); await page.waitForTimeout(900);
        const closed = await page.evaluate(() => getComputedStyle(document.querySelector('.nav-overlay')).visibility
          + ', focus=' + (document.activeElement.className || document.activeElement.tagName)
          + ', inert=' + document.querySelector('main').hasAttribute('inert'));
        console.log(`   menu: open aria-expanded=${menuState.expanded} visibility=${menuState.vis} → nach Esc ${closed}`);
      }
      const hero = info.upscale.find(u => u.hero);
      const worst = info.upscale.filter(u => !u.hero && u.f > 1.3).slice(0, 3);
      const line = `${vp.name.padEnd(7)} ${pg.padEnd(17)} reveals ${info.rv[0]}/${info.rv[1]}  hero ${hero ? hero.f + '× ' + hero.src : '–'}  js-err ${errors.length}  bad ${bad.length}  ext ${ext.length}  hscroll ${info.hscroll}  h ${info.h}  today "${info.today}" (${info.isToday})`;
      console.log(line);
      if (errors.length) console.log('   errors:', errors);
      if (bad.length) console.log('   bad:', bad);
      if (ext.length) console.log('   external:', ext);
      if (info.wide.length) console.log('   wider than viewport:', info.wide);
      if (info.contrast.length) console.log('   contrast:', info.contrast);
      if (worst.length) console.log('   upscale > 1,3×:', worst);
      if (vp.name === 'desktop' && pg === PAGES[0]) console.log('   fonts loaded:', info.fonts);
      summary.push({ vp: vp.name, pg, rv: info.rv, errors: errors.length, bad: bad.length, ext: ext.length, hscroll: info.hscroll });
      await page.close();
    }
    await ctx.close();
  }
  /* Öffnungszeiten-Status zu festen Zeitpunkten (Europe/Berlin) prüfen */
  if (PAGES.includes('besuch.html')) {
    const cases = [
      ['2026-10-28T16:00:00Z', 'Mi 17:00 Berlin (MEZ, UTC+1) → offen'],
      ['2026-10-28T10:00:00Z', 'Mi 11:00 → später geöffnet'],
      ['2026-11-01T22:30:00Z', 'So 23:30 → bereits geschlossen'],
      ['2026-10-27T12:00:00Z', 'Di → Ruhetag, morgen'],
      ['2026-10-26T12:00:00Z', 'Mo → Ruhetag, ab Mittwoch'],
      ['2026-07-04T21:30:00Z', 'Sa 23:30 MESZ (UTC+2) → geschlossen'],
    ];
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    for (const [iso, label] of cases) {
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date(iso));
      await page.goto(`${origin}/besuch.html`, { waitUntil: 'domcontentloaded' });
      const r = await page.evaluate(() => [document.querySelector('[data-today]').textContent,
        (document.querySelector('.is-today .h-day') || {}).textContent]);
      console.log(`   hours ${label.padEnd(36)} → "${r[0]}" [${r[1]}]`);
      await page.close();
    }
    await ctx.close();
  }
  if (devHits.size) console.log(`dev-fallback served ${devHits.size} files (assets/ noch nicht vollständig)`);
  const ok = summary.every(s => s.rv[0] === s.rv[1] && !s.errors && !s.bad && !s.ext && s.hscroll <= 0);
  console.log(ok ? 'QA OK' : 'QA: Auffälligkeiten (siehe oben)');
  await browser.close(); server.close();
})();
