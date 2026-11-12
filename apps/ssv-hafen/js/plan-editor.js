/* SSV Hafen-Manager – Lageplan-Editor
 *
 * Vollbild-Zeichenfenster über dem amtlichen Luftbild: Stege (mit Platznummern), Flächen, Linien, Punkte,
 * Lagerfelder und Längsseits-Plätze einzeichnen, verschieben, umbenennen. Bedienung mit Maus oder Finger
 * (ziehen = verschieben, zwei Finger / Mausrad = zoomen). Das Ergebnis ist der Datensatz, aus dem js/plan.js
 * den Hafenplan zeichnet (einstellungen.lageplan).
 */
(function () {
  'use strict';
  const PLAN = window.HAFEN_PLAN;
  const kopie = (x) => JSON.parse(JSON.stringify(x));
  const r1 = (v) => Math.round(v * 10) / 10;
  const neuId = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 36).toString(36);
  // „25, 26, 27, 30“ → „25–27, 30“
  function bereiche(liste) {
    const z = liste.filter((n) => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b), rest = liste.filter((n) => !/^\d+$/.test(n)); const out = [];
    for (let i = 0; i < z.length; i++) { let j = i; while (j + 1 < z.length && z[j + 1] === z[j] + 1) j++; out.push(j > i ? z[i] + '–' + z[j] : String(z[i])); i = j; }
    return out.concat(rest).join(', ');
  }

  function oeffnen(o) {
    const esc = window.HAFEN.H.esc, dez = window.HAFEN.H.dez;
    let plan = normal(kopie(o.plan));
    function normal(p) { ['stege', 'formen', 'punkte', 'lager', 'laengs'].forEach((k) => { if (!Array.isArray(p[k])) p[k] = []; }); p.laengs.forEach((l, i) => { if (!l.id) l.id = 'q' + i; });
      p.breite = p.breite || 1000; p.hoehe = p.hoehe || 750; p.m = p.m || 0.4; p.bild = p.bild || PLAN.STANDARD.bild; p.v = 1; return p; }
    const M = plan.m;
    const rueck = []; let geaendert = false;
    let wz = 'wahl', sel = null, entwurf = null, zeiger = null;
    let vb = [0, 0, plan.breite, plan.hoehe], deck = 0.85, zeichnung = true;

    const el = document.createElement('div'); el.className = 'pe'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Lageplan bearbeiten');
    const WZ = [['wahl', 'Auswählen', 'Antippen wählt aus, Ziehen verschiebt'], ['steg', 'Steg', 'Anfang und Ende antippen'], ['flaeche', 'Fläche', 'Ecken antippen (Gebäude, Hof, Wasser …)'], ['linie', 'Linie', 'Punkte antippen (Weg, Zaun, Bahn)'],
      ['punkt', 'Punkt', 'Kran, Slip, WC, Strom … setzen'], ['lager', 'Lagerfeld', 'Mehrere Landplätze als Raster setzen'], ['lagerplatz', 'Lagerplatz', 'Einen einzelnen Landplatz setzen'], ['laengs', 'Einzelbox', 'Einzelnen Wasserplatz ohne Steg-Raster setzen (z. B. längsseits)']];
    el.innerHTML = '<div class="pe-leiste"><strong>' + esc(o.titel || 'Lageplan') + '</strong><div class="pe-wz" role="toolbar" aria-label="Werkzeuge">' + WZ.map(([k, n, t]) => '<button type="button" data-wz="' + k + '" title="' + t + '">' + n + '</button>').join('') + '</div>' +
      '<div class="pe-rechts"><button type="button" id="pe-undo" title="Letzten Schritt zurücknehmen">↶ Zurück</button><button type="button" id="pe-zm" aria-label="Verkleinern">−</button><button type="button" id="pe-zp" aria-label="Vergrößern">+</button><button type="button" id="pe-ganz">Ganz</button>' +
      (o.onPlanung ? '<button type="button" id="pe-planung" title="Als Entwurf sichern – der gültige Plan bleibt, wie er ist">Als Planung sichern</button>' : '') + '<button type="button" class="pe-prim" id="pe-ok">' + (o.entwurf ? 'Planung speichern' : 'Speichern') + '</button><button type="button" id="pe-zu">Schließen</button></div></div>' +
      '<div class="pe-mitte"><div class="pe-flaeche"><svg id="pe-svg" preserveAspectRatio="xMidYMid meet"></svg><div class="pe-hinweis" id="pe-hinweis" hidden></div><div class="pe-mass" aria-hidden="true"><i id="pe-mass"></i><span>50 m</span></div><div class="pe-quelle">' + esc(PLAN.QUELLE) + '</div></div>' +
      '<aside class="pe-panel" id="pe-panel"></aside></div>';
    document.body.appendChild(el); document.body.classList.add('modal-offen');
    const svg = el.querySelector('#pe-svg'), panel = el.querySelector('#pe-panel'), hinweis = el.querySelector('#pe-hinweis');
    const toast = (t) => { hinweis.textContent = t; hinweis.hidden = false; clearTimeout(toast.t); if (!entwurf) toast.t = setTimeout(() => { hinweis.hidden = true; }, 2600); };

    /* ---------- Hilfen ---------- */
    const merken = () => { rueck.push(JSON.stringify(plan)); if (rueck.length > 60) rueck.shift(); geaendert = true; };
    const zurueck = () => { if (!rueck.length) return toast('Nichts zum Zurücknehmen.'); plan = JSON.parse(rueck.pop()); sel = null; entwurf = null; alles(); };
    const liste = (typ) => ({ steg: plan.stege, form: plan.formen, punkt: plan.punkte, lager: plan.lager, laengs: plan.laengs }[typ]);
    const teil = (id) => { const k = String(id).lastIndexOf('|'); return [String(id).slice(0, k), String(id).slice(k + 1)]; };
    const boxGeo = (s, nr) => PLAN.plaetzeVon({ m: M, stege: [s] }).plaetze.find((p) => p.nr === String(nr));
    const zelleGeo = (Lg, i) => PLAN.lagerVon({ lager: [Lg] }).find((z) => z.nr === Number(i));
    const gewaehlt = () => {
      if (!sel) return null;
      if (sel.typ === 'box') { const [sid, nr] = teil(sel.id); const s = plan.stege.find((x) => x.id === sid); return s && boxGeo(s, nr) ? { steg: s, nr } : null; }
      if (sel.typ === 'zelle') { const [lid, k] = teil(sel.id); const Lg = plan.lager.find((x) => x.id === lid); return Lg && zelleGeo(Lg, k) ? { lager: Lg, i: Number(k) } : null; }
      return liste(sel.typ).find((x) => x.id === sel.id);
    };
    // Abweichung einer einzelnen Box / eines einzelnen Lagerplatzes (wird bei Bedarf angelegt; leere Einträge fliegen beim Speichern raus)
    const ausBox = (s, nr) => { s.aus = s.aus || {}; return (s.aus[nr] = s.aus[nr] || {}); };
    const ausZelle = (Lg, i) => { Lg.aus = Lg.aus || {}; return (Lg.aus[i] = Lg.aus[i] || {}); };
    const m1 = (v) => (Math.round(v * M * 10) / 10).toFixed(1).replace('.', ',');   // Plan-Einheiten → „3,4“ m
    const einheit = () => { const r = svg.getBoundingClientRect(); return Math.max(vb[2] / (r.width || 1), vb[3] / (r.height || 1)); };   // Plan-Einheiten je Bildschirmpixel
    function ort(e) { const m = svg.getScreenCTM(); if (!m) return [0, 0]; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return [r1(p.x), r1(p.y)]; }
    const punkteVon = (x, typ) => typ === 'steg' ? [x.a, x.b] : typ === 'form' ? x.p : null;
    function verschieben(x, typ, dx, dy) {
      if (typ === 'steg') { x.a = [r1(x.a[0] + dx), r1(x.a[1] + dy)]; x.b = [r1(x.b[0] + dx), r1(x.b[1] + dy)]; }
      else if (typ === 'form') { x.p = x.p.map(([a, b]) => [r1(a + dx), r1(b + dy)]); if (x.t) x.t = [r1(x.t[0] + dx), r1(x.t[1] + dy), x.t[2]]; }
      else if (typ === 'box') { const g = PLAN.stegGeo(x.steg, M), p = boxGeo(x.steg, x.nr), a = ausBox(x.steg, x.nr); const roh = verschieben.roh && verschieben.roh.id === sel.id ? verschieben.roh : (verschieben.roh = { id: sel.id, l: p.l, q: p.q });
        roh.l += dx * g.ux + dy * g.uy; roh.q += dx * g.nx + dy * g.ny; a.l = r1(roh.l); a.q = Math.abs(roh.q) < 5 * einheit() ? 0 : r1(roh.q); }   // nahe am Steg rastet die Box wieder an
      else if (typ === 'zelle') { const z = zelleGeo(x.lager, x.i), a = ausZelle(x.lager, x.i); const [lx, ly] = PLAN.drehen(dx, dy, -(Number(x.lager.rot) || 0)); const roh = verschieben.roh && verschieben.roh.id === sel.id ? verschieben.roh : (verschieben.roh = { id: sel.id, mx: z.mx, my: z.my });
        roh.mx += lx; roh.my += ly; a.mx = r1(roh.mx); a.my = r1(roh.my); }
      else { x.x = r1(x.x + dx); x.y = r1(x.y + dy); }
    }
    // Steg-Enden rasten an anderen Steg-Enden ein (z. B. Knick in der Westbrücke)
    function einrasten(pt, ohne) {
      const grenze = 9 * einheit(); let best = null, bd = grenze;
      plan.stege.forEach((s) => { if (s === ohne) return; [s.a, s.b].forEach((q) => { const dd = Math.hypot(q[0] - pt[0], q[1] - pt[1]); if (dd < bd) { bd = dd; best = q; } }); });
      return best ? [best[0], best[1]] : pt;
    }

    /* ---------- Zeichnen ---------- */
    function zeichne() {
      const u = einheit(), g = Math.max(2.2, 7 * u);   // Griffgröße bleibt am Bildschirm gleich
      const mitText = u < 1.7;   // weit herausgezoomt (Handy): Beschriftungen ausblenden, sonst überlappen sie
      const ms = el.querySelector('#pe-mass'); if (ms) ms.style.width = Math.round(50 / M / u) + 'px';
      svg.setAttribute('viewBox', vb.map((v) => r1(v)).join(' '));
      const formen = plan.formen.map((f, i) => ({ f, i })).filter((x) => PLAN.ART[x.f.art] && x.f.p.length > 1).sort((a, b) => PLAN.ART[a.f.art].z - PLAN.ART[b.f.art].z || a.i - b.i);
      const pf = (p, zu) => p.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ') + (zu ? ' Z' : '');
      const fHtml = !zeichnung ? '' : formen.map(({ f }) => { const zu = PLAN.ART[f.art].zu; const an = sel && sel.typ === 'form' && sel.id === f.id;
        const kl = f.art === 'bahn' ? 'pf-bahn' : f.art === 'weg' ? 'pf-weg' : 'pf-' + f.art;
        return '<path d="' + pf(f.p, zu) + '" class="pf ' + kl + ' pe-form' + (zu ? '' : ' pe-linie') + (an ? ' pe-an' : '') + '" data-el="form:' + f.id + '"/>' +
          (f.name && mitText ? (() => { const [x, y] = zu ? PLAN.mitte(f.p) : f.p[Math.floor(f.p.length / 2)]; return '<text x="' + r1(x) + '" y="' + r1(y) + '" class="pe-text" text-anchor="middle" font-size="' + r1(Math.max(5, 11 * u)) + '">' + esc(f.name) + '</text>'; })() : ''); }).join('');
      const geo = PLAN.plaetzeVon(plan);
      const boxen = geo.plaetze.map((p) => { const selbst = sel && sel.typ === 'box' && sel.id === p.steg + '|' + p.nr; const an = selbst || (sel && sel.typ === 'steg' && sel.id === p.steg);
        return '<g transform="translate(' + r1(p.x) + ' ' + r1(p.y) + ') rotate(' + r1(p.dreh) + ')" class="pe-box' + (an ? ' pe-an' : '') + (selbst ? ' pe-selbst' : '') + (p.eigen ? ' pe-eigen' : '') + '" data-el="box:' + p.steg + '|' + p.nr + '"><rect x="' + r1(-p.tiefe / 2) + '" y="' + r1(-p.breite / 2) + '" width="' + r1(p.tiefe) + '" height="' + r1(p.breite) + '" rx="1"/>' +
          '<text y="' + r1(Math.min(2.2, p.breite * 0.25)) + '" text-anchor="middle" font-size="' + r1(Math.min(6, p.breite * 0.72)) + '" transform="rotate(' + r1(-p.dreh) + ')">' + esc(p.nr) + '</text></g>'; }).join('');
      const stege = plan.stege.map((s) => { const an = sel && sel.typ === 'steg' && sel.id === s.id;
        return '<line x1="' + s.a[0] + '" y1="' + s.a[1] + '" x2="' + s.b[0] + '" y2="' + s.b[1] + '" class="pe-steg' + (s.schwimm ? ' pe-schwimm' : '') + (an ? ' pe-an' : '') + '"/><line x1="' + s.a[0] + '" y1="' + s.a[1] + '" x2="' + s.b[0] + '" y2="' + s.b[1] + '" class="pe-treffer" stroke-width="' + r1(Math.max(8, 22 * u)) + '" data-el="steg:' + s.id + '"/>' +
          '<circle cx="' + s.a[0] + '" cy="' + s.a[1] + '" r="' + r1(g * 0.45) + '" class="pe-start"/>'; }).join('');
      const laengs = plan.laengs.map((l) => { const an = sel && sel.typ === 'laengs' && sel.id === l.id;
        return '<g transform="translate(' + l.x + ' ' + l.y + ') rotate(' + (Number(l.rot) || 0) + ')" class="pe-box pe-laengs' + (an ? ' pe-an pe-selbst' : '') + '" data-el="laengs:' + l.id + '"><rect x="' + (-l.w / 2) + '" y="' + (-(Number(l.h) || 10) / 2) + '" width="' + l.w + '" height="' + (Number(l.h) || 10) + '" rx="2"/><text y="2.2" text-anchor="middle" font-size="6">' + esc(l.nr) + '</text></g>'; }).join('');
      const lager = plan.lager.map((L) => { const an = sel && sel.typ === 'lager' && sel.id === L.id; const zellen = PLAN.lagerVon({ lager: [L] }); const zl = Math.ceil((Number(L.anzahl) || 0) / Math.max(1, Number(L.spalten) || 1)) * (Number(L.bh) || 20);
        return '<g transform="translate(' + L.x + ' ' + L.y + ') rotate(' + (Number(L.rot) || 0) + ')" class="pe-lager' + (an ? ' pe-an' : '') + '" data-el="lager:' + L.id + '">' + zellen.map((z) => { const selbst = sel && sel.typ === 'zelle' && sel.id === L.id + '|' + z.nr;
          return '<g class="pe-zelle' + (selbst ? ' pe-selbst' : '') + (z.eigen ? ' pe-eigen' : '') + '" data-el="zelle:' + L.id + '|' + z.nr + '"><rect x="' + r1(z.x) + '" y="' + r1(z.y) + '" width="' + z.w + '" height="' + z.h + '" rx="1"' + (z.neig ? ' transform="rotate(' + z.neig + ' ' + r1(z.mx) + ' ' + r1(z.my) + ')"' : '') + '/><text x="' + r1(z.mx) + '" y="' + r1(z.my + 1.6) + '" text-anchor="middle" font-size="' + r1(Math.min(4.6, Math.min(z.w, z.h) * 0.6)) + '">' + esc(z.id) + '</text></g>'; }).join('') +
          (mitText && (Number(L.anzahl) || 0) > 1 ? '<text class="pe-tab" x="0" y="' + r1(-zl / 2 - 3 - 7 * u) + '" text-anchor="middle" font-size="' + r1(Math.max(4, 10 * u)) + '">' + esc(L.name || 'Lagerfeld') + ' ▸ ganzes Feld</text>' : '') + '</g>'; }).join('');
      const punkte = plan.punkte.map((p) => { const an = sel && sel.typ === 'punkt' && sel.id === p.id; const [z, n] = PLAN.PUNKT[p.art] || ['?', ''];
        return '<g transform="translate(' + p.x + ' ' + p.y + ')" class="pkt pkt-' + p.art + ' pe-punkt' + (an ? ' pe-an' : '') + '" data-el="punkt:' + p.id + '"><circle r="' + r1(Math.max(7, g)) + '"/><text y="2.6" text-anchor="middle" class="pkt-z">' + z + '</text><text y="' + r1(Math.max(7, g) + 8) + '" text-anchor="middle" class="pe-text" font-size="' + r1(Math.max(5, 10 * u)) + '">' + (mitText ? esc(p.name || n) : '') + '</text></g>'; }).join('');
      // Griffe der Auswahl
      let griffe = ''; const x = gewaehlt();
      if (x && sel.typ === 'box') { const p = boxGeo(x.steg, x.nr); const [dx, dy] = PLAN.drehen(1, 0, p.dreh), [sx, sy] = PLAN.drehen(0, 1, p.dreh);
        griffe += '<circle cx="' + r1(p.x + dx * p.tiefe / 2) + '" cy="' + r1(p.y + dy * p.tiefe / 2) + '" r="' + r1(g * 0.8) + '" class="pe-griff pe-mass-griff" data-griff="t"><title>Tiefe ziehen</title></circle>' +
          '<circle cx="' + r1(p.x + sx * p.voll / 2) + '" cy="' + r1(p.y + sy * p.voll / 2) + '" r="' + r1(g * 0.8) + '" class="pe-griff pe-mass-griff" data-griff="b"><title>Breite ziehen</title></circle>' +
          '<text x="' + r1(p.x) + '" y="' + r1(p.y - Math.max(p.tiefe, p.voll) / 2 - 3 * u - 2) + '" class="pe-text pe-mass-text" text-anchor="middle" font-size="' + r1(Math.max(4.5, 11 * u)) + '">' + m1(p.voll) + ' × ' + m1(p.tiefe) + ' m</text>'; }
      if (x && sel.typ === 'zelle') { const z = zelleGeo(x.lager, x.i); const rot = Number(x.lager.rot) || 0; const ort2 = (lx, ly) => { const [a, b] = PLAN.drehen(lx, ly, z.neig); const [c, e2] = PLAN.drehen(z.mx + a, z.my + b, rot); return [x.lager.x + c, x.lager.y + e2]; };
        const [wx, wy] = ort2(z.w / 2, 0), [hx, hy] = ort2(0, z.h / 2), [cx, cy] = ort2(0, 0);
        griffe += '<circle cx="' + r1(wx) + '" cy="' + r1(wy) + '" r="' + r1(g * 0.8) + '" class="pe-griff pe-mass-griff" data-griff="w"><title>Breite ziehen</title></circle><circle cx="' + r1(hx) + '" cy="' + r1(hy) + '" r="' + r1(g * 0.8) + '" class="pe-griff pe-mass-griff" data-griff="h"><title>Länge ziehen</title></circle>' +
          '<text x="' + r1(cx) + '" y="' + r1(cy - Math.max(z.w, z.h) / 2 - 3 * u - 2) + '" class="pe-text pe-mass-text" text-anchor="middle" font-size="' + r1(Math.max(4.5, 11 * u)) + '">' + m1(z.w) + ' × ' + m1(z.h) + ' m</text>'; }
      if (x && (sel.typ === 'steg' || sel.typ === 'form')) {
        const pk = punkteVon(x, sel.typ);
        if (sel.typ === 'form') { const zu = PLAN.ART[x.art].zu; const nn = zu ? pk.length : pk.length - 1;
          for (let i = 0; i < nn; i++) { const a = pk[i], b = pk[(i + 1) % pk.length]; griffe += '<circle cx="' + r1((a[0] + b[0]) / 2) + '" cy="' + r1((a[1] + b[1]) / 2) + '" r="' + r1(g * 0.6) + '" class="pe-mitte-griff" data-mitte="' + i + '"/>'; } }
        griffe += pk.map(([px, py], i) => '<circle cx="' + px + '" cy="' + py + '" r="' + r1(g) + '" class="pe-griff' + (sel.punkt === i ? ' pe-an' : '') + '" data-griff="' + i + '"/>').join('');
        if (sel.typ === 'steg') griffe += '<text x="' + x.a[0] + '" y="' + r1(x.a[1] - g * 1.5) + '" class="pe-text" text-anchor="middle" font-size="' + r1(Math.max(5, 11 * u)) + '">Anfang</text>';
      }
      let ent = '';
      if (entwurf && entwurf.p.length) {
        const pk = entwurf.p.concat(zeiger ? [zeiger] : []);
        ent = '<path d="' + pf(pk, false) + '" class="pe-entwurf"/>' + entwurf.p.map(([px, py], i) => '<circle cx="' + px + '" cy="' + py + '" r="' + r1(g * (i === 0 && entwurf.zu ? 1.1 : 0.7)) + '" class="pe-entwurf-p' + (i === 0 && entwurf.zu ? ' pe-erster' : '') + '"/>').join('');
      }
      svg.innerHTML = PLAN.svgDefs() + '<rect x="-600" y="-600" width="' + (plan.breite + 1200) + '" height="' + (plan.hoehe + 1200) + '" fill="#2a2f3a"/><rect width="' + plan.breite + '" height="' + plan.hoehe + '" fill="#ece6d6"/>' +
        '<image href="' + esc(plan.bild) + '" width="' + plan.breite + '" height="' + plan.hoehe + '" preserveAspectRatio="none" opacity="' + deck + '"/>' +
        '<g class="pe-formen" style="--pe-deck:' + (deck > 0.05 ? 0.42 : 1) + '">' + fHtml + '</g>' + boxen + stege + laengs + lager + punkte + griffe + ent;
      infoZeile();
    }
    function infoZeile() {
      const i = panel.querySelector('#pe-info'), x = gewaehlt();
      if (i && x && sel.typ === 'steg') { const gg = PLAN.stegGeo(x, M); const n = PLAN.hatPlaetze(x) ? Math.abs(Number(x.bis) - Number(x.von)) + 1 : 0; const nutz = (gg.len - gg.f0 - gg.f1) * M;
        i.innerHTML = 'Länge <strong>' + (gg.len * M).toFixed(1).replace('.', ',') + ' m</strong>' + (n ? ' · ' + n + ' Plätze · je <strong>' + (nutz / n).toFixed(2).replace('.', ',') + ' m</strong> breit' : ' · ohne Plätze'); }
      if (i && x && sel.typ === 'form') { const zu = PLAN.ART[x.art].zu; let l = 0; for (let k = 0; k < x.p.length - (zu ? 0 : 1); k++) { const a = x.p[k], b = x.p[(k + 1) % x.p.length]; l += Math.hypot(b[0] - a[0], b[1] - a[1]); }
        let fl = 0; if (zu) { for (let k = 0; k < x.p.length; k++) { const a = x.p[k], b = x.p[(k + 1) % x.p.length]; fl += a[0] * b[1] - b[0] * a[1]; } fl = Math.abs(fl) / 2 * M * M; }
        i.innerHTML = x.p.length + ' Punkte · ' + (zu ? 'Umfang ' : 'Länge ') + Math.round(l * M) + ' m' + (zu ? ' · Fläche ca. ' + Math.round(fl) + ' m²' : ''); }
      const pr = panel.querySelector('#pe-pruef'); if (pr) pr.innerHTML = pruefText();
    }
    function pruefText() {
      const p = PLAN.pruefen(plan, o.daten); const t = [];
      if (!p.fehlen.length && !p.doppelt.length) t.push('<span class="pe-gut">✓ Alle ' + p.anzahl + ' Wasserplätze sind im Plan.</span>');
      if (p.fehlen.length) t.push('<span class="pe-warn">Fehlen im Plan: ' + esc(bereiche(p.fehlen)) + '</span>');
      if (p.doppelt.length) t.push('<span class="pe-warn">Doppelt: ' + esc(bereiche(p.doppelt)) + '</span>');
      const neu = p.unbekannt.concat(p.landUnbekannt || []); if (neu.length) t.push('<span class="pe-leise">Neu im Plan – ' + (o.entwurf ? 'werden angelegt, sobald die Planung gültig wird' : 'beim Speichern kannst du sie anlegen') + ': ' + esc(bereiche(neu)) + '</span>');
      if (p.landFehlen.length) t.push('<span class="pe-warn">Landplätze ohne Lagerfeld: ' + esc(bereiche(p.landFehlen)) + '</span>');
      return t.join('<br>');
    }

    /* ---------- Seitenleiste ---------- */
    const feld = (l, f, wert, typ, extra) => '<label class="pe-feld"><span>' + l + '</span><input data-f="' + f + '" data-t="' + (typ || 'text') + '" value="' + esc(wert == null ? '' : String(wert).replace('.', typ === 'text' ? '.' : ',')) + '"' + (typ && typ !== 'text' ? ' inputmode="decimal"' : '') + (extra || '') + '></label>';
    const wahl = (l, f, wert, opt) => '<label class="pe-feld"><span>' + l + '</span><select data-f="' + f + '" data-t="text">' + opt.map(([k, n]) => '<option value="' + k + '"' + (String(wert || '') === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>';
    // Liste der einzeln geänderten / entfernten Plätze eines Stegs oder Lagerfelds
    function einzelListe(aus, name) {
      const k = Object.keys(aus || {}); if (!k.length) return '';
      const weg = k.filter((x) => aus[x].weg), anders = k.filter((x) => !aus[x].weg && Object.keys(aus[x]).length);
      return (weg.length ? '<p class="pe-leise" style="margin-bottom:4px">Entfernt:</p><div class="pe-knoepfe">' + weg.map((x) => '<button type="button" data-akt="wieder" data-k="' + esc(x) + '">' + esc(name(x)) + ' wieder einsetzen</button>').join('') + '</div>' : '') +
        (anders.length ? '<p class="pe-leise">Einzeln geändert: ' + anders.map((x) => esc(name(x))).join(', ') + '</p>' : '') +
        '<div class="pe-knoepfe"><button type="button" data-akt="alle-gleich" class="pe-gefahr">Alle wieder gleich</button></div>';
    }
    function seite() {
      const x = gewaehlt(); let h = '';
      if (!x) {
        h = '<h3>So geht’s</h3><ol class="pe-hilfe"><li><strong>Steg</strong> wählen, Anfang und Ende auf dem Luftbild antippen. Rechts die Platznummern „von–bis“ eintragen – die Boxen verteilen sich von selbst.</li>' +
          '<li><strong>Fläche</strong> für Gebäude, Hof, Parkplatz: Ecken antippen, dann „Fertig“.</li><li><strong>Auswählen</strong>: antippen, dann an den Punkten ziehen. Zwei Finger oder Mausrad zoomen.</li><li><strong>Einzelne Box oder einzelner Lagerplatz</strong>: antippen, dann ziehen, Größe ändern oder löschen. „Lagerplatz“ und „Einzelbox“ setzen einen neuen Platz.</li><li><strong>Speichern</strong> – der Plan gilt dann überall im Programm.</li></ol>' +
          '<label class="pe-feld"><span>Luftbild-Deckkraft</span><input type="range" id="pe-deck" min="0" max="1" step="0.05" value="' + deck + '"></label>' +
          '<label class="pe-check"><input type="checkbox" id="pe-zeichnung"' + (zeichnung ? ' checked' : '') + '> Flächen und Linien anzeigen</label>' +
          '<h3>Alles im Plan</h3><div class="pe-liste">' +
          plan.stege.map((s) => '<button type="button" data-geh="steg:' + s.id + '">' + esc(s.name || 'Steg') + ' <small>' + (PLAN.hatPlaetze(s) ? s.von + '–' + s.bis : 'ohne Plätze') + '</small></button>').join('') +
          plan.laengs.map((l) => '<button type="button" data-geh="laengs:' + l.id + '">Längsseits ' + esc(l.nr) + '</button>').join('') +
          plan.lager.map((L) => '<button type="button" data-geh="lager:' + L.id + '">' + esc(L.name || 'Lagerfeld') + ' <small>' + esc(L.praefix || '') + L.ab + '–' + (Number(L.ab) + Number(L.anzahl) - 1) + '</small></button>').join('') +
          plan.punkte.map((p) => '<button type="button" data-geh="punkt:' + p.id + '">' + esc(p.name || (PLAN.PUNKT[p.art] || [])[1] || 'Punkt') + '</button>').join('') +
          plan.formen.map((f) => '<button type="button" data-geh="form:' + f.id + '">' + esc(f.name || PLAN.ART[f.art].name) + ' <small>' + esc(f.name ? PLAN.ART[f.art].name : '') + '</small></button>').join('') + '</div>' +
          '<h3>Sichern & teilen</h3><div class="pe-knoepfe"><button type="button" id="pe-datei">Als Datei sichern</button><button type="button" id="pe-kopie">Plan kopieren</button><label class="pe-laden">Datei laden<input type="file" id="pe-laden" accept=".json,application/json" hidden></label>' +
          (o.eigen ? '<button type="button" id="pe-vorlage" class="pe-gefahr">Zur Vorlage zurück</button>' : '') + '</div><p class="pe-leise">„Plan kopieren“ legt den Plan als Text in die Zwischenablage – so kannst du ihn verschicken.</p>';
      } else if (sel.typ === 'steg') {
        h = '<h3>Steg</h3>' + feld('Name', 'name', x.name) + wahl('Gehört zu (Zoom-Knopf)', 'bruecke', x.bruecke, [['', '– keiner –'], ['ost', 'Ost'], ['west', 'West'], ['schwimm', 'Schwimm']]) +
          '<div class="pe-zwei">' + feld('Plätze von', 'von', x.von, 'ganz') + feld('bis', 'bis', x.bis, 'ganz') + '</div><p class="pe-leise" style="margin-top:-4px">Leer lassen = Steg ohne Plätze. Platz „von“ liegt am markierten Anfang.</p>' +
          '<div class="pe-zwei">' + feld('Boxtiefe am Anfang (m)', 'tiefe', x.tiefe, 'zahl') + feld('am Ende (m)', 'tiefe2', x.tiefe2 || '', 'zahl', ' placeholder="wie am Anfang"') + '</div><p class="pe-leise" style="margin-top:-4px">Zwei verschiedene Werte = die Boxen werden vom Anfang zum Ende gleichmäßig kleiner (oder größer).</p>' +
          '<label class="pe-check" style="margin-bottom:14px"><input type="checkbox" data-f="schwimm" data-t="ja"' + (x.schwimm ? ' checked' : '') + '> Schwimmsteg (blau)</label>' +
          '<div class="pe-zwei">' + feld('Ohne Boxen am Anfang (m)', 'frei0', (x.frei || [0, 0])[0], 'zahl') + feld('am Ende (m)', 'frei1', (x.frei || [0, 0])[1], 'zahl') + '</div>' +
          '<div class="pe-knoepfe"><button type="button" data-akt="box-dazu">+ Box anhängen</button><button type="button" data-akt="seite">Boxen auf die andere Seite</button><button type="button" data-akt="richtung">Zählrichtung umdrehen</button></div><p id="pe-info" class="pe-info"></p>' +
          '<p class="pe-leise"><strong>Einzelne Box ändern:</strong> die Box im Plan antippen.</p>' + einzelListe(x.aus, (k) => 'Box ' + k);
      } else if (sel.typ === 'form') {
        const zu = PLAN.ART[x.art].zu;
        h = '<h3>' + (zu ? 'Fläche' : 'Linie') + '</h3>' + wahl('Art', 'art', x.art, Object.entries(PLAN.ART).filter(([, a]) => a.zu === zu).map(([k, a]) => [k, a.name])) + feld('Beschriftung', 'name', x.name) +
          '<p class="pe-leise">Volle Punkte ziehen = Ecke verschieben. Kleine Punkte auf den Kanten ziehen = neue Ecke.</p><div class="pe-knoepfe"><button type="button" data-akt="punktweg"' + (sel.punkt == null ? ' disabled' : '') + '>Gewählte Ecke entfernen</button></div><p id="pe-info" class="pe-info"></p>';
      } else if (sel.typ === 'punkt') {
        h = '<h3>Punkt</h3>' + wahl('Art', 'art', x.art, Object.entries(PLAN.PUNKT).map(([k, a]) => [k, a[1]])) + feld('Beschriftung', 'name', x.name);
      } else if (sel.typ === 'lager') {
        h = '<h3>Lagerfeld</h3>' + feld('Name', 'name', x.name) + '<div class="pe-zwei">' + feld('Kürzel', 'praefix', x.praefix) + feld('erste Nummer', 'ab', x.ab, 'ganz') + '</div><div class="pe-zwei">' + feld('Anzahl Plätze', 'anzahl', x.anzahl, 'ganz') + feld('je Reihe', 'spalten', x.spalten, 'ganz') + '</div>' +
          '<div class="pe-zwei">' + feld('Feldbreite (m)', 'bw', r1(x.bw * M), 'me') + feld('Feldlänge (m)', 'bh', r1(x.bh * M), 'me') + '</div>' + feld('Drehung (°)', 'rot', x.rot, 'zahl') + feld('Ziffern (2 = P01)', 'stellen', x.stellen, 'ganz') +
          '<div class="pe-zwei">' + feld('Boote schräg (°)', 'neig', x.neig || 0, 'zahl') + feld('Bug (1 = zum Weg, −1 = weg)', 'bug', x.bug || 1, 'ganz') + '</div>' +
          '<div class="pe-knoepfe"><button type="button" data-akt="platz-dazu">+ Platz anhängen</button></div><p class="pe-leise"><strong>Einzelnen Platz ändern:</strong> den Platz im Plan antippen. Ist das Feld gewählt, verschiebt Ziehen das ganze Feld.</p>' + einzelListe(x.aus, (k) => (PLAN.lagerVon({ lager: [{ ...x, aus: {} }] }).find((z) => z.nr === Number(k)) || {}).id || k) +
          '<p class="pe-leise">Die Nummern müssen zu den Landplätzen im Programm passen (P01–P36 Nordlager, P41–P48 West, A1–A6 Außenlager). „Boote schräg“ dreht jedes Boot im Feld, z. B. 40° für die schrägen Reihen vorn links.</p>';
      } else if (sel.typ === 'box') {
        const p = boxGeo(x.steg, x.nr), a = (x.steg.aus && x.steg.aus[x.nr]) || {};
        h = '<h3>Box ' + esc(x.nr) + '</h3><p class="pe-leise" style="margin-top:-6px">' + esc(x.steg.name || 'Steg') + ' · jetzt ' + m1(p.voll) + ' × ' + m1(p.tiefe) + ' m' + (p.frei ? ' · frei verschoben' : '') + '</p>' +
          '<div class="pe-zwei">' + feld('Breite (m)', 'b', a.b == null ? '' : a.b, 'zahl', ' placeholder="wie die anderen"') + feld('Tiefe (m)', 't', a.t == null ? '' : a.t, 'zahl', ' placeholder="wie der Steg"') + '</div>' + feld('Drehung (°)', 'w', a.w || 0, 'zahl') +
          '<p class="pe-leise">Box <strong>ziehen</strong> = verschieben (nahe am Steg rastet sie an). An den beiden Punkten ziehen = Breite und Tiefe. Leere Felder = wie die übrigen Boxen.</p>' +
          '<div class="pe-knoepfe">' + (p.frei || a.w ? '<button type="button" data-akt="raster">Zurück in die Reihe</button>' : '') + (a.b || a.t ? '<button type="button" data-akt="masse-weg">Maße wie die anderen</button>' : '') + '<button type="button" data-akt="zum-steg">Ganzen Steg wählen</button></div>';
      } else if (sel.typ === 'zelle') {
        const z = zelleGeo(x.lager, x.i), a = (x.lager.aus && x.lager.aus[x.i]) || {};
        h = '<h3>Lagerplatz ' + esc(z.id) + '</h3><p class="pe-leise" style="margin-top:-6px">' + esc(x.lager.name || 'Lagerfeld') + ' · jetzt ' + m1(z.w) + ' × ' + m1(z.h) + ' m</p>' +
          '<div class="pe-zwei">' + feld('Breite (m)', 'w', a.w == null ? '' : r1(a.w * M), 'me', ' placeholder="wie das Feld"') + feld('Länge (m)', 'h', a.h == null ? '' : r1(a.h * M), 'me', ' placeholder="wie das Feld"') + '</div>' + feld('Schräg (°)', 'neig', a.neig == null ? '' : a.neig, 'zahl', ' placeholder="wie das Feld"') +
          '<p class="pe-leise">Platz <strong>ziehen</strong> = verschieben. An den beiden Punkten ziehen = Breite und Länge. Leere Felder = wie das übrige Feld.</p>' +
          '<div class="pe-knoepfe">' + (a.mx != null || a.my != null ? '<button type="button" data-akt="raster">Zurück ins Raster</button>' : '') + (a.w || a.h || a.neig != null ? '<button type="button" data-akt="masse-weg">Maße wie das Feld</button>' : '') + '<button type="button" data-akt="zum-feld">Ganzes Feld wählen</button></div>';
      } else if (sel.typ === 'laengs') {
        h = '<h3>Einzelbox (Wasser)</h3>' + feld('Nummer', 'nr', x.nr) + '<div class="pe-zwei">' + feld('Länge (m)', 'w', r1(x.w * M), 'me') + feld('Breite (m)', 'h', r1((Number(x.h) || 10) * M), 'me') + '</div>' + feld('Drehung (°)', 'rot', x.rot, 'zahl') + '<p class="pe-leise">Für Plätze ohne Steg-Raster, z. B. längsseits. Ziehen = verschieben.</p>';
      }
      if (x) h += '<div class="pe-knoepfe"><button type="button" data-akt="weg" class="pe-gefahr">Löschen</button><button type="button" data-akt="fertig">Auswahl aufheben</button></div>';
      panel.innerHTML = h + '<div class="pe-pruef" id="pe-pruef"></div>';
      infoZeile();
    }
    const werkzeugKnoepfe = () => el.querySelectorAll('[data-wz]').forEach((b) => b.classList.toggle('aktiv', b.dataset.wz === wz));
    function alles() { werkzeugKnoepfe(); zeichne(); seite(); }
    function waehle(typ, id, punkt) { sel = typ ? { typ, id, punkt: punkt == null ? null : punkt } : null; alles(); }
    function werkzeug(k) {
      wz = k; entwurf = null; zeiger = null; hinweis.hidden = true;
      if (k === 'steg') { entwurf = { typ: 'steg', zu: 0, p: [] }; toast('Steg: Anfang antippen, dann das Ende.'); }
      if (k === 'flaeche') { entwurf = { typ: 'form', zu: 1, p: [] }; fertigLeiste(); }
      if (k === 'linie') { entwurf = { typ: 'form', zu: 0, p: [] }; fertigLeiste(); }
      if (k === 'punkt' || k === 'lager' || k === 'laengs' || k === 'lagerplatz') toast('Stelle im Plan antippen.');
      if (k !== 'wahl') sel = null;
      alles();
    }
    function fertigLeiste() {
      const n = entwurf.p.length, min = entwurf.zu ? 3 : 2;
      hinweis.hidden = false; hinweis.innerHTML = (entwurf.zu ? 'Fläche' : 'Linie') + ': Ecken nacheinander antippen (' + n + ') <button type="button" id="pe-fertig"' + (n < min ? ' disabled' : '') + '>Fertig</button><button type="button" id="pe-letzter"' + (n ? '' : ' disabled') + '>Punkt zurück</button><button type="button" id="pe-abbr">Abbrechen</button>';
    }
    function formFertig() {
      const min = entwurf.zu ? 3 : 2; if (entwurf.p.length < min) return;
      merken(); const f = { id: neuId('f'), art: entwurf.zu ? 'gebaeude' : 'weg', name: '', p: entwurf.p }; plan.formen.push(f);
      wz = 'wahl'; entwurf = null; zeiger = null; hinweis.hidden = true; waehle('form', f.id); toast('Jetzt rechts Art und Beschriftung wählen.');
    }
    // Antippen mit einem Zeichenwerkzeug
    function tipp(pt) {
      if (wz === 'steg') {
        entwurf.p.push(einrasten(pt)); if (entwurf.p.length < 2) return zeichne();
        merken(); const s = { id: neuId('s'), name: 'Neuer Steg', bruecke: '', a: entwurf.p[0], b: entwurf.p[1], von: null, bis: null, seite: 1, frei: [0, 0], tiefe: 10 }; plan.stege.push(s);
        wz = 'wahl'; entwurf = null; zeiger = null; waehle('steg', s.id); return toast('Jetzt rechts die Platznummern eintragen.');
      }
      if (wz === 'flaeche' || wz === 'linie') {
        const erster = entwurf.p[0];
        if (entwurf.zu && entwurf.p.length >= 3 && Math.hypot(erster[0] - pt[0], erster[1] - pt[1]) < 10 * einheit()) return formFertig();   // auf den ersten Punkt getippt = schließen
        entwurf.p.push(pt); fertigLeiste(); return zeichne();
      }
      merken(); let n;
      if (wz === 'punkt') { n = { id: neuId('p'), art: 'kran', name: '', x: pt[0], y: pt[1] }; plan.punkte.push(n); waehle('punkt', n.id); }
      if (wz === 'lager') { n = { id: neuId('g'), name: 'Lagerfeld', praefix: 'P', ab: 1, anzahl: 10, spalten: 5, stellen: 2, x: pt[0], y: pt[1], rot: 0, bw: 10, bh: 22 }; plan.lager.push(n); waehle('lager', n.id); }
      if (wz === 'lagerplatz') { const frei = (() => { const da = new Set(PLAN.lagerVon(plan).map((z) => z.id).concat((o.daten.landplaetze || []).map((p) => p.id))); let k = 1; while (da.has('P' + String(k).padStart(2, '0'))) k++; return k; })();
        n = { id: neuId('g'), name: '', praefix: 'P', ab: frei, anzahl: 1, spalten: 1, stellen: 2, x: pt[0], y: pt[1], rot: 0, bw: 9, bh: 20 }; plan.lager.push(n); waehle('lager', n.id); toast('Einzelner Lagerplatz P' + String(frei).padStart(2, '0') + ' – rechts Größe und Drehung einstellen.'); }
      if (wz === 'laengs') { const da = new Set(PLAN.plaetzeVon(plan).plaetze.map((p) => p.nr).concat(plan.laengs.map((l) => String(l.nr)), (o.daten.liegeplaetze || []).map((p) => String(p.nr)))); let k = 1; while (da.has('L' + k)) k++;
        n = { id: neuId('q'), nr: 'L' + k, x: pt[0], y: pt[1], rot: 0, w: 25, h: 9 }; plan.laengs.push(n); waehle('laengs', n.id); }
      wz = 'wahl'; werkzeugKnoepfe();
    }

    /* ---------- Zeiger: ziehen, verschieben, zoomen ---------- */
    const finger = new Map(); let zug = null, kneif = null;
    function zoom(f, mx, my) {
      const w = Math.min(plan.breite * 2.2, Math.max(30, vb[2] * f)); const k = w / vb[2];
      if (mx == null) { mx = vb[0] + vb[2] / 2; my = vb[1] + vb[3] / 2; }
      vb = [mx - (mx - vb[0]) * k, my - (my - vb[1]) * k, w, vb[3] * k]; zeichne();
    }
    function passend() { const r = svg.getBoundingClientRect(); const v = (r.width || 4) / (r.height || 3); let w = plan.breite, h = plan.hoehe; if (w / h < v) w = h * v; else h = w / v; vb = [(plan.breite - w) / 2, (plan.hoehe - h) / 2, w, h]; zeichne(); }
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId); finger.set(e.pointerId, [e.clientX, e.clientY]);
      if (finger.size === 2) { const [a, b] = [...finger.values()]; kneif = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, vb: vb.slice(), m: ort({ clientX: (a[0] + b[0]) / 2, clientY: (a[1] + b[1]) / 2 }) }; zug = null; return; }
      const t = e.target; const pt = ort(e);
      zug = { art: 'schieben', sx: e.clientX, sy: e.clientY, vb: vb.slice(), start: pt, bewegt: false };
      if (wz !== 'wahl') return;
      const gr = t.closest('[data-griff]'), mi = t.closest('[data-mitte]'), elx = t.closest('[data-el]');
      if (gr && sel) { zug.art = 'griff'; const gi = gr.dataset.griff; zug.i = /^\d+$/.test(gi) ? Number(gi) : gi; if (typeof zug.i === 'number') sel.punkt = zug.i; }
      else if (mi && sel && sel.typ === 'form') { merken(); zug.gemerkt = true; const x = gewaehlt(); const i = Number(mi.dataset.mitte); x.p.splice(i + 1, 0, pt); zug.art = 'griff'; zug.i = i + 1; sel.punkt = i + 1; seite(); }
      else if (elx) { const k = elx.dataset.el.indexOf(':'); const typ = elx.dataset.el.slice(0, k), id = elx.dataset.el.slice(k + 1); verschieben.roh = null;
        if (typ === 'zelle' && sel && sel.typ === 'lager' && teil(id)[0] === sel.id) { zug.art = 'element'; zug.letzter = pt; zug.waehle = [typ, id]; }   // Feld ist gewählt: Ziehen verschiebt das ganze Feld, Antippen wählt den einzelnen Platz
        else if (sel && sel.typ === typ && sel.id === id) { zug.art = 'element'; zug.letzter = pt; } else zug.waehle = [typ, id]; }
      else zug.abwahl = true;
    });
    svg.addEventListener('pointermove', (e) => {
      if (finger.has(e.pointerId)) finger.set(e.pointerId, [e.clientX, e.clientY]);
      if (kneif && finger.size === 2) { const [a, b] = [...finger.values()]; const f = kneif.d / (Math.hypot(a[0] - b[0], a[1] - b[1]) || 1); const w = Math.min(plan.breite * 2.2, Math.max(30, kneif.vb[2] * f)); const k = w / kneif.vb[2];
        vb = [kneif.m[0] - (kneif.m[0] - kneif.vb[0]) * k, kneif.m[1] - (kneif.m[1] - kneif.vb[1]) * k, w, kneif.vb[3] * k]; return zeichne(); }
      if (!zug) { if (entwurf && entwurf.p.length && e.pointerType === 'mouse') { zeiger = ort(e); zeichne(); } return; }
      if (!zug.bewegt && Math.hypot(e.clientX - zug.sx, e.clientY - zug.sy) < 5) return;
      zug.bewegt = true; const x = gewaehlt();
      if (zug.art === 'griff' && x) {
        if (!zug.gemerkt) { merken(); zug.gemerkt = true; }
        let pt = ort(e);
        if (sel.typ === 'box') { const p = boxGeo(x.steg, x.nr), a = ausBox(x.steg, x.nr); const [dx, dy] = PLAN.drehen(1, 0, p.dreh); const fx = p.x - dx * p.tiefe / 2, fy = p.y - dy * p.tiefe / 2; const [lx, ly] = PLAN.drehen(pt[0] - fx, pt[1] - fy, -p.dreh);
          if (zug.i === 't') a.t = Math.round(Math.max(2, lx * M) * 10) / 10; else a.b = Math.round(Math.max(1, Math.abs(ly) * 2 * M) * 10) / 10; return zeichne(); }
        if (sel.typ === 'zelle') { const z = zelleGeo(x.lager, x.i), a = ausZelle(x.lager, x.i); let [lx, ly] = PLAN.drehen(pt[0] - x.lager.x, pt[1] - x.lager.y, -(Number(x.lager.rot) || 0)); [lx, ly] = PLAN.drehen(lx - z.mx, ly - z.my, -z.neig);
          if (zug.i === 'w') a.w = r1(Math.max(2, Math.abs(lx) * 2)); else a.h = r1(Math.max(2, Math.abs(ly) * 2)); return zeichne(); }
        if (sel.typ === 'steg') { pt = einrasten(pt, x); if (zug.i === 0) x.a = pt; else x.b = pt; } else x.p[zug.i] = pt; return zeichne();
      }
      if (zug.art === 'element' && x) { if (!zug.gemerkt) { merken(); zug.gemerkt = true; } const pt = ort(e); verschieben(x, sel.typ, pt[0] - zug.letzter[0], pt[1] - zug.letzter[1]); zug.letzter = pt; return zeichne(); }
      const u = Math.max(zug.vb[2] / svg.getBoundingClientRect().width, zug.vb[3] / svg.getBoundingClientRect().height);
      vb = [zug.vb[0] - (e.clientX - zug.sx) * u, zug.vb[1] - (e.clientY - zug.sy) * u, zug.vb[2], zug.vb[3]]; zeichne();
    });
    const los = (e) => {
      finger.delete(e.pointerId); if (kneif) { if (finger.size < 2) kneif = null; zug = null; return; }
      const z = zug; zug = null; if (!z) return;
      if (!z.bewegt) {
        if (wz !== 'wahl') return tipp(z.start);
        if (z.waehle) return waehle(z.waehle[0], z.waehle[1]);
        if (z.art === 'griff') return alles();
        if (z.abwahl && sel) return waehle(null);
      } else if (z.art === 'griff' || z.art === 'element') seite();
    };
    svg.addEventListener('pointerup', los); svg.addEventListener('pointercancel', los);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const pt = ort(e); zoom(e.deltaY > 0 ? 1.18 : 1 / 1.18, pt[0], pt[1]); }, { passive: false });
    svg.addEventListener('dblclick', () => { if (entwurf && entwurf.typ === 'form') { entwurf.p.pop(); formFertig(); } });

    /* ---------- Knöpfe, Felder, Tasten ---------- */
    function loeschen() { const x = gewaehlt(); if (!x) return; merken();
      if (sel.typ === 'box') { const s = x.steg; ausBox(s, x.nr).weg = true; toast('Box ' + x.nr + ' entfernt – die übrigen verteilen sich neu.'); return waehle('steg', s.id); }
      if (sel.typ === 'zelle') { const Lg = x.lager, id = zelleGeo(Lg, x.i).id; ausZelle(Lg, x.i).weg = true; toast('Lagerplatz ' + id + ' entfernt.'); return waehle('lager', Lg.id); }
      const l = liste(sel.typ); l.splice(l.indexOf(x), 1); waehle(null); }
    function exportPlan() { const p = kopie(plan);
      p.stege.forEach((s) => { if (!s.aus) return; const gibt = new Set(); if (PLAN.hatPlaetze(s)) { const a = Number(s.von), b = Number(s.bis); for (let k = Math.min(a, b); k <= Math.max(a, b); k++) gibt.add(String(k)); }
        Object.keys(s.aus).forEach((nr) => { const a = s.aus[nr]; Object.keys(a).forEach((k) => { if (a[k] === '' || a[k] == null || a[k] === false || (k === 'w' && !a[k])) delete a[k]; }); if (!gibt.has(nr) || !Object.keys(a).length) delete s.aus[nr]; }); if (!Object.keys(s.aus).length) delete s.aus; });
      p.lager.forEach((Lg) => { if (!Lg.aus) return; Object.keys(Lg.aus).forEach((k) => { const a = Lg.aus[k]; Object.keys(a).forEach((q) => { if (a[q] === '' || a[q] == null || a[q] === false) delete a[q]; }); if (Number(k) >= (Number(Lg.anzahl) || 0) || !Object.keys(a).length) delete Lg.aus[k]; }); if (!Object.keys(Lg.aus).length) delete Lg.aus; });
      return p; }
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button, label.pe-laden'); if (!t) return;
      if (t.dataset.wz) return werkzeug(t.dataset.wz);
      if (t.dataset.geh) { const [typ, id] = t.dataset.geh.split(':'); wz = 'wahl'; return waehle(typ, id); }
      if (t.id === 'pe-undo') return zurueck();
      if (t.id === 'pe-zp') return zoom(1 / 1.35); if (t.id === 'pe-zm') return zoom(1.35); if (t.id === 'pe-ganz') return passend();
      if (t.id === 'pe-fertig') return formFertig();
      if (t.id === 'pe-letzter') { entwurf.p.pop(); fertigLeiste(); return zeichne(); }
      if (t.id === 'pe-abbr') return werkzeug('wahl');
      if (t.id === 'pe-ok') { const p = PLAN.pruefen(plan, o.daten); if ((p.fehlen.length || p.doppelt.length) && !confirm((p.fehlen.length ? 'Diese Plätze fehlen im Plan und wären dann nicht zu sehen: ' + bereiche(p.fehlen) + '.\n' : '') + (p.doppelt.length ? 'Doppelt vergeben: ' + bereiche(p.doppelt) + '.\n' : '') + 'Trotzdem speichern?')) return;
        geaendert = false; schliessen(true); return o.onSpeichern(exportPlan(), { wasser: p.unbekannt, land: p.landUnbekannt || [] }); }
      if (t.id === 'pe-planung') { const pp = exportPlan(); if (o.onPlanung(pp) !== false) { geaendert = false; schliessen(true); } return; }
      if (t.id === 'pe-zu') { if (geaendert && !confirm('Änderungen am Lageplan verwerfen?')) return; return schliessen(); }
      if (t.id === 'pe-datei') { const b = new Blob([JSON.stringify(exportPlan(), null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ssv-lageplan.json'; document.body.appendChild(a); a.click(); a.remove(); return; }
      if (t.id === 'pe-kopie') { const txt = JSON.stringify(exportPlan()); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Plan kopiert – jetzt z. B. in eine Nachricht einfügen.')).catch(() => { window.prompt('Plan zum Kopieren:', txt); }); return; }
      if (t.id === 'pe-vorlage') { if (!confirm('Eigenen Lageplan verwerfen und die Vorlage wiederherstellen?')) return; schliessen(true); return o.onVorlage && o.onVorlage(); }
      const akt = t.dataset.akt, x = gewaehlt(); if (!akt) return;
      if (akt === 'fertig') return waehle(null);
      if (akt === 'zum-steg' && x) return waehle('steg', x.steg.id);
      if (akt === 'zum-feld' && x) return waehle('lager', x.lager.id);
      if (akt === 'wieder' && x) { merken(); const k = t.dataset.k; const ziel = sel.typ === 'steg' ? x.aus : x.aus; if (ziel && ziel[k]) delete ziel[k].weg; alles(); return; }
      if (akt === 'raster' && x) { merken(); if (sel.typ === 'box') { const a = ausBox(x.steg, x.nr); delete a.l; delete a.q; delete a.w; } else if (sel.typ === 'zelle') { const a = ausZelle(x.lager, x.i); delete a.mx; delete a.my; } verschieben.roh = null; alles(); return; }
      if (akt === 'masse-weg' && x) { merken(); if (sel.typ === 'box') { const a = ausBox(x.steg, x.nr); delete a.b; delete a.t; } else if (sel.typ === 'zelle') { const a = ausZelle(x.lager, x.i); delete a.w; delete a.h; delete a.neig; } alles(); return; }
      if (akt === 'alle-gleich' && x) { if (!confirm('Alle einzelnen Änderungen an diesem ' + (sel.typ === 'steg' ? 'Steg' : 'Lagerfeld') + ' verwerfen? Entfernte Plätze kommen zurück, alle sind wieder gleich groß.')) return; merken(); delete x.aus; alles(); return; }
      if (akt === 'box-dazu' && x) { merken(); if (!PLAN.hatPlaetze(x)) { x.von = 1; x.bis = 1; } else x.bis = Number(x.bis) + (Number(x.bis) >= Number(x.von) ? 1 : -1); alles(); return; }
      if (akt === 'platz-dazu' && x) { merken(); x.anzahl = (Number(x.anzahl) || 0) + 1; alles(); return; }
      if (akt === 'weg') return loeschen();
      if (!x) return; merken();
      if (akt === 'seite') x.seite = x.seite === -1 ? 1 : -1;
      if (akt === 'richtung') { const a = x.a; x.a = x.b; x.b = a; x.seite = x.seite === -1 ? 1 : -1; x.frei = [(x.frei || [0, 0])[1], (x.frei || [0, 0])[0]]; if (Number(x.tiefe2) > 0) { const tt = x.tiefe; x.tiefe = x.tiefe2; x.tiefe2 = tt; } seite(); }   // Boxen bleiben auf ihrer Seite
      if (akt === 'punktweg') { const zu = PLAN.ART[x.art].zu; if (x.p.length <= (zu ? 3 : 2)) { rueck.pop(); return toast('Mindestens ' + (zu ? 'drei' : 'zwei') + ' Punkte müssen bleiben.'); } x.p.splice(sel.punkt, 1); sel.punkt = null; seite(); }
      zeichne();
    });
    let feldGemerkt = null;
    panel.addEventListener('focusin', () => { feldGemerkt = false; });
    panel.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'pe-deck') { deck = Number(t.value); return zeichne(); }
      if (t.id === 'pe-zeichnung') { zeichnung = t.checked; return zeichne(); }
      const x = gewaehlt(); if (!x || !t.dataset.f) return;
      if (!feldGemerkt) { merken(); feldGemerkt = true; }
      const f = t.dataset.f, typ = t.dataset.t; let v = t.value;
      if (typ === 'ja') v = t.checked;
      if (typ === 'ganz') { v = v.trim() === '' ? null : parseInt(v, 10); if (v !== null && isNaN(v)) return; }
      if (typ === 'zahl' || typ === 'me') { v = dez(v); if (isNaN(v)) { if (t.value.trim() !== '') return; v = 0; } if (typ === 'me') v = r1(v / M); }
      if (f === 'frei0' || f === 'frei1') { x.frei = x.frei || [0, 0]; x.frei[f === 'frei0' ? 0 : 1] = Math.max(0, v); }
      else if (sel.typ === 'box') { const a = ausBox(x.steg, x.nr); if (t.value.trim() === '') delete a[f]; else a[f] = f === 'w' ? v : Math.max(0.5, Math.round(v * 10) / 10); }
      else if (sel.typ === 'zelle') { const a = ausZelle(x.lager, x.i); if (t.value.trim() === '') delete a[f]; else a[f] = f === 'neig' ? v : Math.max(2, v); }
      else if (f === 'art' && sel.typ === 'form') x.art = v;
      else x[f] = v;
      zeichne();
    });
    panel.addEventListener('change', (e) => {
      if (e.target.id === 'pe-laden' && e.target.files[0]) { const fr = new FileReader(); fr.onload = () => { try { const p = JSON.parse(fr.result); if (!PLAN.gueltig(p)) throw new Error('kein Lageplan'); merken(); plan = normal(p); sel = null; passend(); alles(); toast('Plan geladen – mit „Speichern“ übernehmen.'); } catch (err) { toast('Die Datei ist kein gültiger Lageplan.'); } }; fr.readAsText(e.target.files[0]); }
      if (e.target.dataset && e.target.dataset.f === 'art') seite();
    });
    const taste = (e) => {
      if (e.target.closest('input, select, textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
      if (e.key === 'Escape') { e.stopPropagation(); if (entwurf) return werkzeug('wahl'); if (sel) return waehle(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); if (sel.typ === 'form' && sel.punkt != null) { const b = panel.querySelector('[data-akt=punktweg]'); if (b) b.click(); } else loeschen(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); zurueck(); }
      const pfeil = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (pfeil && sel && gewaehlt()) { e.preventDefault(); merken(); const s = e.shiftKey ? 2.5 : 0.5; verschieben.roh = null; verschieben(gewaehlt(), sel.typ, pfeil[0] * s, pfeil[1] * s); zeichne(); seite(); }
      if (e.key === 'Enter' && entwurf && entwurf.typ === 'form') formFertig();
    };
    document.addEventListener('keydown', taste, true);
    const groesse = () => zeichne(); window.addEventListener('resize', groesse);
    function schliessen() { document.removeEventListener('keydown', taste, true); window.removeEventListener('resize', groesse); el.remove(); document.body.classList.remove('modal-offen'); if (o.onZu) o.onZu(); }

    werkzeugKnoepfe(); seite(); requestAnimationFrame(() => { passend(); });
    return { get plan() { return plan; }, schliessen };
  }

  window.HAFEN_PLAN_EDITOR = { oeffnen, bereiche };
})();
