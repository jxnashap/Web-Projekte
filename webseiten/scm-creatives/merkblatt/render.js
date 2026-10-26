// Rendert das Merkblatt (HTML) als PDF und als PNG-Vorschau je Seite.
// Aufruf: NODE_PATH=/opt/node22/lib/node_modules node render.js <html> <pdf> [png-ordner]
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const [html, pdf, pngDir] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // file:// per goto, damit die lokalen Schriften laden (setContent kann das nicht)
  await page.goto('file://' + path.resolve(html), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });

  if (pngDir) {
    // Vorschau: jede .page einzeln abfotografieren
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.emulateMedia({ media: 'print' });
    const pages = await page.$$('.page');
    for (let i = 0; i < pages.length; i++) {
      await pages[i].screenshot({ path: path.join(pngDir, `seite-${String(i + 1).padStart(2, '0')}.png`) });
    }
    // Überlauf melden: Inhalt höher als die A4-Seite
    const over = await page.$$eval('.page', ps => ps.map((p, i) => [i + 1, p.scrollHeight - p.clientHeight]).filter(([, d]) => d > 1));
    console.log(over.length ? 'Überlauf auf Seite: ' + over.map(([i, d]) => `${i} (+${d}px)`).join(', ') : 'kein Überlauf');
  }
  await browser.close();
})();
