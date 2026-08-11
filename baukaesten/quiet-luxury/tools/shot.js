const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const SITE = "/home/user/Web-Projekte/innoweb";
const CACHE = "/home/user/Web-Projekte/.preview-cache";
const MIME = {".html":"text/html",".css":"text/css",".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml"};
const FONT_CSS = `@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:100 900;src:url('http://127.0.0.1:8651/CormorantGaramond.ttf') format('truetype');}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:100 900;src:url('http://127.0.0.1:8651/CormorantGaramond.ttf') format('truetype');}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;src:url('http://127.0.0.1:8651/Inter.ttf') format('truetype');}`;
const srv=http.createServer((q,r)=>{let f=path.join(SITE,decodeURIComponent(q.url.split("?")[0])==="/"?"index.html":decodeURIComponent(q.url.split("?")[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{"Content-Type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});
const fsrv=http.createServer((q,r)=>{fs.readFile(path.join(CACHE,"fonts",path.basename(q.url)),(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{"Content-Type":"font/ttf","Access-Control-Allow-Origin":"*"});r.end(d);});});
(async()=>{
  await new Promise(r=>srv.listen(8650,r)); await new Promise(r=>fsrv.listen(8651,r));
  const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
  for(const pg of (process.argv[2]||"index").split(",")){
    const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1.3});
    await p.route("**/*",r=>{const u=r.request().url();if(u.startsWith("http://127.0.0.1"))return r.continue();if(u.includes("fonts.googleapis.com"))return r.fulfill({contentType:"text/css",body:FONT_CSS});return r.abort();});
    p.on("pageerror",e=>console.log("PAGE-ERROR:",e.message));
    await p.goto("http://127.0.0.1:8650/"+pg+".html",{waitUntil:"networkidle",timeout:30000}).catch(()=>{});
    await p.waitForTimeout(2300); // Wireframe zeichnen lassen
    await p.addStyleTag({content:"html{scroll-behavior:auto!important}"});
    await p.evaluate(async()=>{const h=document.body.scrollHeight;for(let y=0;y<=h;y+=320){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,70));}window.scrollTo(0,0);});
    await p.waitForTimeout(2200);
    const st = await p.evaluate(()=>({in:document.querySelectorAll(".reveal.in").length, all:document.querySelectorAll(".reveal").length, err:window.__err||null}));
    console.log(pg, "reveals:", JSON.stringify(st));
    // fullPage-Screenshot startet CSS-Animationen neu -> Endzustand erzwingen (nur QA)
    await p.addStyleTag({content:".draw-line,.s-draw,.s-check,.icon-draw .dl{animation:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}.wire-svg .wfill,.seal .seal-p{opacity:1!important}.scroll-cue span{animation:none!important}.hero-bg img{animation:none!important}"});
    await p.screenshot({path:"iw-"+pg+".png",fullPage:true});
    console.log("saved iw-"+pg+".png");
    await p.close();
  }
  await b.close();srv.close();fsrv.close();
})();
