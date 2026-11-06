// Asset-Bridge: Seite im echten Browser laden, dann Screenshot (shot) oder
// gerendertes HTML plus Liste aller geladenen Dateien (render) speichern.
const fs = require('fs');
const { chromium, devices } = require('playwright');
const [url, out, kind, device, width] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const ctx = device
    ? await b.newContext({ ...devices[device], locale: 'de-DE' })
    : await b.newContext({ viewport: { width: +width || 1440, height: 900 }, locale: 'de-DE' });
  const p = await ctx.newPage();
  const res = new Set();
  p.on('response', (r) => res.add(r.status() + ' ' + r.request().resourceType() + ' ' + r.url()));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => console.log('goto', e.message));
  await p.waitForTimeout(2500);
  // einmal durchscrollen, damit Lazy-Load und Scroll-Animationen auslösen
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await p.waitForTimeout(1500);
  if (kind === 'render') {
    fs.writeFileSync(out, await p.content());
    fs.writeFileSync(out + '.resources.txt', [...res].join('\n'));
  } else {
    await p.screenshot({ path: out, fullPage: true });
  }
  await b.close();
})();
