// node pdf.js → auslieferung/SSV-Strato-Anforderungen.pdf
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'anforderungen.html')); await p.waitForTimeout(600);
  await p.pdf({ path: path.join(__dirname, '../../../../auslieferung/SSV-Strato-Anforderungen.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close(); })();
