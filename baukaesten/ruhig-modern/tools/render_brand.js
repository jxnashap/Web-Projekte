/* Rendert aus den Logo-SVGs (trace_logo.py) die Raster-Marken der Website:
   Favicon-PNG, Apple-Touch-Icon, Manifest-Icons, Logo-PNG (strukturierte Daten)
   und das Social-Vorschaubild (og-image.jpg, Hero + Logo).
   Aufruf:  node render_brand.js <site-dir>
   Erwartet: <site>/assets/img/logo.svg, logo-dark.svg, hero-1600.webp, <site>/favicon.svg */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(process.argv[2]);
const IMG = path.join(SITE, 'assets', 'img');
const DARK = '#151414';
const uri = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
const icon = uri(path.join(SITE, 'favicon.svg'), 'image/svg+xml');
const logo = uri(path.join(IMG, 'logo.svg'), 'image/svg+xml');
const logoDark = uri(path.join(IMG, 'logo-dark.svg'), 'image/svg+xml');
const hero = uri(path.join(IMG, 'hero-1600.webp'), 'image/webp');

(async () => {
  const browser = await chromium.launch();
  const shot = async (w, h, body, out, opts = {}) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden">${body}</body></html>`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: out, omitBackground: !!opts.transparent, type: opts.type || 'png', quality: opts.quality });
    await page.close();
    console.log('✓', path.relative(SITE, out));
  };

  /* Favicon mit runden Ecken (transparent außen) */
  await shot(32, 32, `<img src="${icon}" width="32" height="32">`, path.join(SITE, 'favicon-32.png'), { transparent: true });
  /* Touch-/Manifest-Icons vollflächig (iOS/Android runden selbst ab): Icon-
     Fläche = Hintergrundton, also verschwinden ihre runden Ecken. Das „L" landet
     bei ≈ 70 % Kantenlänge → innerhalb der Maskable-Schutzzone (Kreis 80 %). */
  const full = s => `<div style="width:${s}px;height:${s}px;background:${DARK};display:grid;place-items:center">
    <img src="${icon}" style="width:${s * 0.86}px;height:${s * 0.86}px"></div>`;
  await shot(180, 180, full(180), path.join(SITE, 'apple-touch-icon.png'));
  await shot(192, 192, full(192), path.join(IMG, 'icon-192.png'));
  await shot(512, 512, full(512), path.join(IMG, 'icon-512.png'));
  /* Logo-PNG für JSON-LD (Google verlangt Raster, ≥ 112 px) */
  await shot(800, 420, `<img src="${logo}" width="800" height="420">`, path.join(IMG, 'logo.png'), { transparent: true });

  /* Social-Vorschau 1200×630: Hero rechts, dunkler Verlauf links, Original-Logo */
  await shot(1200, 630, `
    <div style="position:relative;width:1200px;height:630px;background:${DARK};font-family:sans-serif">
      <img src="${hero}" style="position:absolute;right:-120px;top:0;height:630px;width:1120px;object-fit:cover;object-position:70% 50%">
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,${DARK} 0%,${DARK} 34%,rgba(21,20,20,.78) 52%,rgba(21,20,20,0) 78%)"></div>
      <img src="${logoDark}" style="position:absolute;left:80px;top:50%;transform:translateY(-50%);width:520px;height:auto">
    </div>`, path.join(IMG, 'og-image.jpg'), { type: 'jpeg', quality: 84 });

  await browser.close();
})();
