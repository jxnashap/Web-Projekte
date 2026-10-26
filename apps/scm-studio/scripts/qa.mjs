// QA: meldet sich in der Vorschau an, fotografiert Seiten (Desktop + Handy) und sammelt Fehler.
// Aufruf: node scripts/qa.mjs <basisUrl> <ausgabeOrdner> [pfad ...]
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Playwright liegt global (Cloud-Umgebung) oder lokal; ESM ignoriert NODE_PATH, deshalb require.
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require("playwright"); } catch { return require(path.join(process.env.PLAYWRIGHT_DIR ?? "/opt/node22/lib/node_modules", "playwright")); }
})();

const [base = "http://localhost:3100", out = "qa", ...paths] = process.argv.slice(2);
const routes = paths.length ? paths : ["/"];
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const report = [];
for (const [name, viewport, mobile] of [["desk", { width: 1440, height: 900 }, false], ["mob", { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, deviceScaleFactor: 1, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="password"]', process.env.STUDIO_PREVIEW_PASSWORD ?? "scm-studio");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }), page.click('button[type="submit"]')]);
  for (const r of routes) {
    errors.length = 0;
    const res = await page.goto(`${base}${r}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(400);
    const slug = r === "/" ? "heute" : r.replace(/^\//, "").replace(/[^\w-]+/g, "_");
    await page.screenshot({ path: path.join(out, `${name}-${slug}.png`), fullPage: true });
    const overflow = await page.evaluate((w) => document.documentElement.scrollWidth > w + 1, viewport.width);
    const nextError = await page.locator("nextjs-portal, [data-nextjs-dialog]").count();
    report.push({ view: name, route: r, status: res?.status(), errors: [...errors], overflow, nextOverlay: nextError });
  }
  await ctx.close();
}
await browser.close();
for (const r of report) {
  const flag = r.status !== 200 || r.errors.length || r.overflow ? "FEHLER" : "ok";
  console.log(`${flag.padEnd(6)} ${r.view} ${r.route} ${r.status}${r.overflow ? " overflow" : ""}${r.errors.length ? " | " + r.errors.slice(0, 3).join(" | ").slice(0, 400) : ""}`);
}
