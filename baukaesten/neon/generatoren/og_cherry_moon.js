/* Cherry Moon: Vorschaubilder für Social Media (1200 x 630) im Neon-Look rendern.
   Aufruf: NODE_PATH=/opt/node22/lib/node_modules node baukaesten/neon/generatoren/og_cherry_moon.js
   Ausgabe: webseiten/cherry-moon/public/media/og-*.jpg (über PNG, danach mit Pillow nach JPG) */
const { chromium } = require('playwright');
const fs = require('fs');
const T = require('os').tmpdir();
const { execFileSync } = require('child_process');
const S = '/home/user/Web-Projekte/webseiten/cherry-moon/public';
const CHERRY = '<path d="M33 12C27 21 23 32 21 41"/><path d="M33 12C38 21 42 33 44 43"/><path d="M33 12C36 6 43 3 49 5C47 11 40 14 33 12Z"/><circle cx="20" cy="46" r="10"/><circle cx="45" cy="48" r="9"/>';
const CARDS = [
  ['og-home', 'hero-desk-poster', 'Cherry Moon', 'Zwischen Stadt und Strand', 'Club Nights Hamburg · Beach Open Airs Ostsee', true],
  ['og-events', 'club-06', 'Next Dates', 'Tickets und Termine', 'Coda · Sands · Alsterinsel', false],
  ['og-cherry-moon-x-coda', 'mood-coda', 'Cherry Moon x Coda', 'Samstag, 21. November 2026', 'Coda Club · 23:00 Uhr · 18+', false],
  ['og-silvester', 'ev-silvester', 'Silvester x Cherry Moon', 'Donnerstag, 31. Dezember 2026', 'Sands · 21:00 Uhr · 18+', false],
  ['og-tanz-in-den-mai-2027', 'rb-alsterinsel', 'Tanz in den Mai', 'Freitag, 30. April 2027', 'Alsterinsel · 23:00 Uhr · 18+', false],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [out, bg, title, sub, meta, big] of CARDS) {
    const html = `<html><head><style>
@font-face{font-family:A;src:url('file://${S}/fonts/archivo-var.woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:AB;src:url('file://${S}/fonts/archivo-black.woff2')}
body{margin:0;width:1200px;height:630px;background:#060606;color:#fff;font-family:A;overflow:hidden;position:relative}
.bg{position:absolute;inset:0;background:url('file://${S}/media/${bg}.webp') center/cover}
.sh{position:absolute;inset:0;background:radial-gradient(70% 90% at 70% 50%,rgba(6,6,6,.25),rgba(6,6,6,.88) 80%),linear-gradient(90deg,rgba(6,6,6,.92) 0%,rgba(6,6,6,.4) 65%,rgba(6,6,6,.2))}
.in{position:absolute;left:72px;top:64px;right:72px;bottom:64px;display:flex;flex-direction:column;justify-content:space-between}
.logo{display:flex;align-items:center;gap:16px;font:700 22px/1 A;letter-spacing:.34em;text-transform:uppercase}
.logo svg{width:36px;height:36px}.logo b{color:#ff4c6e;text-shadow:0 0 4px #ff2d55,0 0 14px #e4103f}
h1{margin:0;font:400 ${big ? 104 : 84}px/.92 AB;text-transform:uppercase;max-width:900px;text-shadow:0 0 30px rgba(255,255,255,.15)}
h1 span{color:#ff4c6e;text-shadow:0 0 6px #ff2d55,0 0 22px #e4103f,0 0 60px rgba(228,16,63,.6)}
.rule{width:240px;height:3px;background:#ff2d55;box-shadow:0 0 10px #ff2d55,0 0 26px #e4103f;margin:26px 0}
.sub{font:600 26px/1.2 A;letter-spacing:.06em}
.meta{font:700 17px/1 A;letter-spacing:.26em;text-transform:uppercase;color:rgba(255,255,255,.72);margin-top:14px}
</style></head><body><div class="bg"></div><div class="sh"></div><div class="in">
<div class="logo"><svg viewBox="0 0 64 64" fill="none" stroke="#ff2d55" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px #ff2d55)">${CHERRY}</svg><span><b>Cherry</b> Moon</span></div>
<div><h1>${title.replace(/(Moon|Dates|Mai|Coda)$/, '<span>$1</span>')}</h1><div class="rule"></div><div class="sub">${sub}</div><div class="meta">${meta}</div></div>
</div></body></html>`;
    const f = `${T}/og-${out}.html`;
    fs.writeFileSync(f, html);
    await p.goto('file://' + f); await p.waitForTimeout(400);
    await p.screenshot({ path: `${T}/${out}.png` });
    execFileSync('python3', ['-c', `from PIL import Image; Image.open('${T}/${out}.png').convert('RGB').save('${S}/media/${out}.jpg', quality=82, optimize=True, progressive=True)`]);
    console.log(out);
  }
  await b.close();
})();
