const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + __dirname + '/anleitung.html'); await p.waitForTimeout(800);
  await p.pdf({ path: require('path').join(__dirname, '../../../../auslieferung/SSV-Kurzanleitung.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close(); })();
