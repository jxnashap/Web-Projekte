/* QA Drehbuch-Baukasten — findet Wörter, die in animierten Überschriften (.split) mitten im Wort umbrechen.
   Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node umbruch.js <site-dir> [breite …]
   Standardbreiten: 1440 1280 1024 820 390 360. Ausgabe: Seite, Breite, gebrochene Wörter. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.resolve(process.argv[2]);
const WIDTHS = process.argv.slice(3).map(Number).filter(Boolean);
if (!WIDTHS.length) WIDTHS.push(1440, 1280, 1024, 820, 390, 360);
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', woff2: 'font/woff2', svg: 'image/svg+xml', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };
function walk(dir, base = '') {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (!['media', 'img', 'fonts', 'css', 'js'].includes(f)) out = out.concat(walk(p, base + '/' + f)); }
    else if (f.endsWith('.html')) out.push((base + '/' + f.replace(/\.html$/, '').replace(/^index$/, '')).replace(/\/$/, '') || '/');
  }
  return out.sort();
}
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = u === '/' ? path.join(SITE, 'index.html') : path.extname(u) ? path.join(SITE, u) : path.join(SITE, u + '.html');
  if (!fs.existsSync(f) || /\.(mp4|webm)$/.test(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
(async () => {
  const B = `http://127.0.0.1:${server.address().port}`;
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let total = 0;
  for (const w of WIDTHS) {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('db-seen', '1'); } catch (e) {} });
    const p = await ctx.newPage();
    for (const pg of walk(SITE)) {
      await p.goto(B + pg, { waitUntil: 'load' });
      await p.addStyleTag({ content: '.split .w>span,.split .c{transform:none!important;transition:none!important;filter:none!important;opacity:1!important}' });
      await p.waitForTimeout(100);
      const bad = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('.split .w').forEach(w => {
          // Zeichen (.c) bzw. Wort-Innenteil einzeln vermessen: unterschiedliche Zeilen = Bruch im Wort
          const parts = w.querySelectorAll('.c').length ? [...w.querySelectorAll('.c')] : [...w.children];
          const tops = new Set();
          parts.forEach(el => { const r = document.createRange(); r.selectNodeContents(el);
            [...r.getClientRects()].filter(x => x.width > 1).forEach(x => tops.add(Math.round(x.top / 8))); });
          if (tops.size > 1) out.push(w.textContent);
        });
        return out;
      });
      if (bad.length) { total += bad.length; console.log(`${String(w).padStart(5)}  ${pg.padEnd(36)} ${bad.join(' | ')}`); }
    }
    await ctx.close();
  }
  console.log(total ? `${total} gebrochene Wörter` : 'keine gebrochenen Wörter');
  await br.close(); server.close();
})();
