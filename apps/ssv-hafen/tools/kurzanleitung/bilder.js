// Bildschirmfotos für die Kurzanleitung (Demo)
const { chromium, devices } = require('playwright');
const B = 'http://localhost:8695/'; const OUT = __dirname;
(async () => {
  const b = await chromium.launch();
  const h = await b.newContext({ ...devices['iPhone 13'] }); const m = await h.newPage();
  await m.goto(B + 'ssv-hafen/mein-ssv.html'); await m.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await m.reload(); await m.waitForTimeout(900);
  await m.screenshot({ path: OUT + '/mein.png' });
  const d = await b.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 }); const v = await d.newPage();
  await v.goto(B + 'ssv-hafen/index.html'); await v.click('[data-rolle=vorstand]'); await v.waitForTimeout(500);
  await v.screenshot({ path: OUT + '/uebersicht.png' });
  const k = await d.newPage(); await k.setViewportSize({ width: 1180, height: 820 });
  await k.goto(B + 'ssv-getraenke/index.html'); await k.waitForTimeout(900);
  await k.screenshot({ path: OUT + '/kasse.png' });
  await b.close();
})();
