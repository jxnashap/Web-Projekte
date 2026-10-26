// QA-Helfer: meldet sich in der Vorschau an und lädt eine Adresse (z. B. ein PDF) in eine Datei.
// Aufruf: node scripts/qa-fetch.mjs <basisUrl> <pfad> <ausgabeDatei>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require("playwright"); } catch { return require(path.join(process.env.PLAYWRIGHT_DIR ?? "/opt/node22/lib/node_modules", "playwright")); }
})();

const [base = "http://localhost:3100", route = "/", out = "out.bin"] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="password"]', process.env.STUDIO_PREVIEW_PASSWORD ?? "scm-studio");
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }), page.click('button[type="submit"]')]);
const res = await ctx.request.get(`${base}${route}`, { timeout: 120000 });
fs.writeFileSync(out, await res.body());
console.log(res.status(), res.headers()["content-type"], (await res.body()).length, "Bytes →", out);
await browser.close();
