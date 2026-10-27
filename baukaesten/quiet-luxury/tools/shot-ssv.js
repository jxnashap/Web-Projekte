// QA-Screenshots für webseiten/ssv-segelverein (Schriften liegen lokal, kein Netz nötig)
// Aufruf: node shot-ssv.js index,verein [breite] [ausgabeordner]
const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const SITE = "/home/user/Web-Projekte/webseiten/ssv-segelverein";
const MIME = {".html":"text/html",".css":"text/css",".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".woff2":"font/woff2",".pdf":"application/pdf"};
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split("?")[0]); if (u.endsWith("/")) u += "index.html";
  const f = path.join(SITE, u);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); r.end(d); });
});
(async () => {
  const breite = Number(process.argv[3] || 1440), out = process.argv[4] || ".";
  await new Promise((r) => srv.listen(8660, r));
  const b = await chromium.launch();
  for (const pg of (process.argv[2] || "index").split(",")) {
    const p = await b.newPage({ viewport: { width: breite, height: 900 }, deviceScaleFactor: 1 });
    p.on("pageerror", (e) => console.log("PAGE-ERROR:", e.message));
    p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
    await p.goto("http://127.0.0.1:8660/" + pg + ".html", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);
    await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await p.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y <= h; y += 320) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(2000);
    const st = await p.evaluate(() => ({ in: document.querySelectorAll(".reveal.in").length, all: document.querySelectorAll(".reveal").length,
      leer: [...document.querySelectorAll("[data-cms]")].filter((e) => !e.innerHTML.trim()).map((e) => e.dataset.cms),
      hscroll: document.documentElement.scrollWidth > window.innerWidth }));
    console.log(pg, breite, "reveals:", st.in + "/" + st.all, "leere Slots:", JSON.stringify(st.leer), "h-scroll:", st.hscroll);
    await p.addStyleTag({ content: ".icon-draw .dl{animation:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}.scroll-cue span{animation:none!important}.hero-bg img{animation:none!important}" });
    await p.screenshot({ path: path.join(out, "ssv-" + pg + "-" + breite + ".png"), fullPage: true });
    await p.close();
  }
  await b.close(); srv.close();
})();
