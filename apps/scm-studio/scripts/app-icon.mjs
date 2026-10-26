// Erzeugt das App-Icon von SCM Studio ("SCM Kachel"): schwarze Kachel, SCM-Wortmarke weiß, STUDIO rot.
// Quellen: Wortmarke aus src/lib/pdf/logo.ts, STUDIO aus Archivo Condensed ExtraBold (assets/fonts).
// Klein (bis 24 px und Favicon) nur SCM, weil STUDIO dort nicht mehr lesbar ist.
// Aufruf: node scripts/app-icon.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const fontkit = require("fontkit");
const { chromium } = (() => {
  try { return require("playwright"); } catch { return require(path.join(process.env.PLAYWRIGHT_DIR ?? "/opt/node22/lib/node_modules", "playwright")); }
})();

const SIZE = 1024;
const BG = "#0E0E11";
const RED = "#FF3B21";

const scmPath = /LOGO_PATHS[^]*?d: "([^"]+)"/.exec(fs.readFileSync("src/lib/pdf/logo.ts", "utf8"))[1];

// Superellipse (n = 5) wie die Kachel von iOS
function squircle(n = 5, steps = 256) {
  const r = SIZE / 2;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push(`${(r + r * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(1)} ${(r + r * Math.sign(s) * Math.abs(s) ** (2 / n)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

const font = fontkit.openSync("assets/fonts/Archivo-CondensedExtraBold.ttf");
const run = font.layout("STUDIO");
const glyphs = run.glyphs.map((g, i) => ({ d: g.path.toSVG(), adv: run.positions[i].xAdvance }));

const browser = await chromium.launch();
const page = await browser.newPage();

// Maße im Browser messen (getBBox), damit keine eigene Pfad-Geometrie nötig ist
async function bbox(svgInner) {
  return page.evaluate((inner) => {
    document.body.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><g id="m">${inner}</g></svg>`;
    const b = document.getElementById("m").getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, svgInner);
}

/** STUDIO in Schrifteinheiten (y nach oben) mit Sperrung `track` zwischen den Buchstaben. */
function studioUnits(track) {
  let x = 0;
  return glyphs.map((g) => {
    const p = `<path transform="translate(${x.toFixed(1)} 0) scale(1 -1)" d="${g.d}"/>`;
    x += g.adv + track;
    return p;
  }).join("");
}

const scm = await bbox(`<path d="${scmPath}"/>`);
const studio0 = await bbox(studioUnits(0));
const studio1 = await bbox(studioUnits(100));

/** Inhalt (ohne Kachel) für die Breite `w`, mittig auf 512/512, optional mit STUDIO. */
async function content(w, withStudio) {
  const s = w / scm.w;
  const scmH = scm.h * s;
  if (!withStudio) {
    const y = (SIZE - scmH) / 2;
    return `<g transform="translate(${(SIZE - w) / 2} ${y}) scale(${s}) translate(${-scm.x} ${-scm.y})" fill="#fff"><path d="${scmPath}"/></g>`;
  }
  // STUDIO: Versalhöhe gut halb so hoch wie SCM, gesperrt auf dieselbe Breite
  const capH = scmH * 0.56;
  const k = capH / studio0.h;
  const track = ((w / k - studio0.w) / (studio1.w - studio0.w)) * 100;
  const st = await bbox(studioUnits(track));
  const gap = scmH * 0.2;
  const top = (SIZE - (scmH + gap + capH)) / 2;
  const x0 = (SIZE - w) / 2;
  return (
    `<g transform="translate(${x0} ${top}) scale(${s}) translate(${-scm.x} ${-scm.y})" fill="#fff"><path d="${scmPath}"/></g>` +
    `<g transform="translate(${x0} ${top + scmH + gap}) scale(${k}) translate(${-st.x} ${-st.y})" fill="${RED}">${studioUnits(track)}</g>`
  );
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="SCM Studio">${body}</svg>\n`;
const tile = `<path d="${squircle()}" fill="${BG}"/>`;
const square = `<rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>`;

const full = await content(700, true);
const small = await content(800, false);
// Maskierbar: Android schneidet bis auf einen Kreis mit 40 % Radius zu, Inhalt deshalb kleiner
const masked = await content(560, true);

const files = {
  "public/brand/scm-studio-icon.svg": svg(tile + full),
  "public/brand/scm-studio-icon-small.svg": svg(tile + small),
  "src/app/icon.svg": svg(tile + small),
};
for (const [file, data] of Object.entries(files)) fs.writeFileSync(file, data);

async function png(body, px, file, transparent) {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${svg(body)}`);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: px, height: px } });
}
await png(tile + full, 192, "public/brand/icon-192.png", true);
await png(tile + full, 512, "public/brand/icon-512.png", true);
await png(square + masked, 192, "public/brand/icon-maskable-192.png", false);
await png(square + masked, 512, "public/brand/icon-maskable-512.png", false);
// iOS rundet selbst ab und erwartet ein volles Quadrat
await png(square + full, 180, "src/app/apple-icon.png", false);

await browser.close();
console.log("App-Icon erzeugt:", Object.keys(files).join(", "), "+ PNGs");
