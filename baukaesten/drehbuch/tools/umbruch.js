/* QA Drehbuch-Baukasten — findet Wörter, die in animierten Überschriften (.split) mitten im Wort umbrechen.
   Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node umbruch.js <site-dir> [breite …]
   Standardbreiten: 1440 1280 1024 820 390 360 320. Ausgabe: Seite, Breite, gebrochene Wörter. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.resolve(process.argv[2]);
const WIDTHS = process.argv.slice(3).map(Number).filter(Boolean);
if (!WIDTHS.length) WIDTHS.push(1440, 1280, 1024, 820, 390, 360, 320);
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
          // Zeichenmodus: Zeichen auf verschiedenen Zeilen. Wortmodus: Wort-Box höher als eine Zeile.
          // Der sichtbare Text steht in ::before (data-c), deshalb Element-Boxen statt Text-Ranges.
          const chars = [...w.querySelectorAll('.c')].filter(el => !el.classList.contains('hy'));
          const word = [...chars.map(el => el.getAttribute('data-c') || (el.firstElementChild && el.firstElementChild.getAttribute('data-c')) || '')].join('')
            || [...w.querySelectorAll('[data-c]')].map(el => el.getAttribute('data-c')).join('');
          let broken = false;
          if (chars.length) {
            const tops = new Set(chars.map(el => Math.round(el.getBoundingClientRect().top / 8)));
            broken = tops.size > 1;
          } else {
            const inner = w.firstElementChild, fs = parseFloat(getComputedStyle(w).fontSize);
            broken = !!inner && inner.getBoundingClientRect().height > fs * 1.6;
          }
          if (broken) out.push(word);
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
