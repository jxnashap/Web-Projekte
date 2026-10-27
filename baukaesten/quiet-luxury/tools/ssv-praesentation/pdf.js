const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const D = '/tmp/claude-0/pdf'; const M = {'.html':'text/html','.jpg':'image/jpeg','.woff2':'font/woff2'};
const s = http.createServer((q, r) => fs.readFile(path.join(D, q.url.split('?')[0]), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, {'Content-Type': M[path.extname(q.url)] || 'application/octet-stream'}); r.end(d); }));
s.listen(8673, async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://127.0.0.1:8673/vorstand.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  await p.pdf({ path: process.argv[2], width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  await b.close(); s.close(); console.log('pdf ok'); });
