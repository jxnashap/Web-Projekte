/* SSV Hafen-Manager – interaktiver Hafenplan (SVG)
 *
 * Maßstäblicher Lageplan: Koordinatenraum 1000 × 750 Einheiten = 400 × 300 m (1 Einheit = 0,4 m), Gitternord oben.
 * Der Ausschnitt entspricht dem Luftbild img/luftbild-dop20.jpg (amtliches DOP20, ETRS89/UTM32N,
 * BBOX 611544.1,5974837.6 – 611944.1,5975137.6; © GeoBasis-DE/LVermGeo SH/CC BY 4.0).
 *
 * Der Plan kommt aus einem Datensatz („Lageplan“): Stege mit Platznummern, Flächen, Linien, Punkte, Lagerfelder.
 * STANDARD ist vom Luftbild abgelesen; der Verein kann ihn im Lageplan-Editor (js/plan-editor.js) selbst
 * nachzeichnen – gespeichert wird er in den Einstellungen (einstellungen.lageplan).
 * Vom Verein bestätigt: Kran an der Kaimauer am Parkplatz, Slip zwischen Vereinsheim und Opti-Schuppen am blauen Schwimmsteg,
 * Gebäude östlich davon = Mastenlager und Trecker.
 * [ANNAHME] Platznummern je Steg, Lagerfelder (auch „Halle“ H1–H4) und Längsseits-Plätze bis zur Bestätigung durch den Verein.
 */
(function () {
  'use strict';

  const QUELLE = 'Luftbild: © GeoBasis-DE/LVermGeo SH/CC BY 4.0';
  const STANDARD = {
    v: 1, breite: 1000, hoehe: 750, m: 0.4, bild: 'img/luftbild-dop20.jpg',
    stege: [
      { id: 'ost', name: 'Ostbrücke', bruecke: 'ost', a: [567, 328], b: [809, 219], von: 1, bis: 24, seite: 1, frei: [12, 0], tiefe: 10 },
      { id: 'west1', name: 'Westbrücke', bruecke: 'west', a: [551, 352], b: [437, 409], von: 25, bis: 38, seite: -1, frei: [0, 0], tiefe: 10 },
      { id: 'west2', name: 'Westbrücke', bruecke: 'west', a: [437, 409], b: [203, 600], von: 39, bis: 70, seite: -1, frei: [0, 0], tiefe: 10 },
      { id: 'schwimm', name: 'Schwimmbrücke', bruecke: 'schwimm', schwimm: true, a: [209, 606], b: [157, 663], von: 71, bis: 79, seite: -1, frei: [0, 0], tiefe: 8 },
      { id: 'quer', name: 'Schwimmsteg', bruecke: '', schwimm: true, a: [562, 325], b: [587, 366], von: null, bis: null, seite: 1, frei: [0, 0], tiefe: 10 }
    ],
    laengs: [{ nr: 'L1', x: 148, y: 673, rot: 132, w: 30 }, { nr: 'L2', x: 814, y: 243, rot: 61, w: 36 }],
    formen: [
      { id: 'f1', art: 'gruen', name: '', p: [[0, 0], [395, 0], [0, 325]] },
      { id: 'f2', art: 'gruen', name: '', p: [[0, 480], [600, 0], [1000, 0], [1000, 45], [750, 78], [600, 138], [400, 280], [134, 522], [0, 620]] },
      { id: 'f3', art: 'gruen', name: '', p: [[0, 655], [59, 612], [134, 552], [280, 425], [327, 381], [352, 345], [350, 372], [372, 398], [420, 400], [427, 407], [399, 431], [352, 472], [299, 510], [216, 570], [196, 585], [150, 630], [134, 662], [118, 700], [100, 750], [0, 750]] },
      { id: 'f4', art: 'gruen', name: '', p: [[610, 246], [640, 235], [690, 200], [748, 165], [760, 120], [1000, 100], [1000, 152], [930, 160], [870, 172], [830, 196], [800, 206], [760, 228], [700, 258], [650, 286], [600, 306], [588, 290], [614, 280]] },
      { id: 'f5', art: 'natur', name: 'Naturschutzgebiet', p: [[1000, 330], [940, 335], [900, 355], [860, 370], [800, 395], [740, 420], [700, 435], [650, 460], [600, 480], [560, 500], [500, 540], [440, 580], [400, 610], [370, 650], [355, 700], [360, 750], [1000, 750]] },
      { id: 'f6', art: 'wasser', name: 'Alter Travearm', t: [640, 395, -27], p: [[100, 750], [118, 700], [134, 662], [150, 630], [196, 585], [216, 570], [262, 540], [299, 510], [352, 472], [399, 431], [427, 407], [450, 384], [470, 376], [523, 350], [552, 333], [566, 322], [600, 306], [650, 286], [700, 258], [760, 228], [800, 206], [830, 196], [870, 172], [930, 160], [1000, 152],
        [1000, 330], [940, 335], [900, 355], [860, 370], [800, 395], [740, 420], [700, 435], [650, 460], [600, 480], [560, 500], [500, 540], [440, 580], [400, 610], [370, 650], [355, 700], [360, 750]] },
      { id: 'f7', art: 'strasse', name: 'Autobahn', t: [250, 215, -39], p: [[0, 325], [395, 0], [600, 0], [0, 480]] },
      { id: 'f8', art: 'hof', name: '', p: [[428, 262], [456.2, 255.2], [480.8, 215.2], [555.4, 186.3], [567.7, 193.5], [687, 147], [708.5, 147.5], [723.6, 182.5], [716.9, 198.8], [677.6, 213.5], [613.3, 241.6], [556.1, 259.7], [528, 265], [459, 282]] },
      // Lagerweg durch das Nordlager: vorne an der Messe vorbei, dann mittig bis zum Ende (Sackgasse)
      { id: 'f10', art: 'strasse', name: 'Lagerweg · Sackgasse', t: [644, 195, -20.4], p: [[471.3, 267.5], [533.2, 242.4], [581.8, 215.8], [618.7, 198.9], [703.1, 167.5], [705.8, 167.2], [708.3, 168.3], [709.8, 170.5], [710.1, 173.2], [709, 175.7], [706.8, 177.2], [622.5, 208.5], [586.5, 225.1], [537.6, 251.8], [475.2, 277.2]] },
      { id: 'f9', art: 'parken', name: 'Parkplatz', p: [[352, 345], [400, 300], [428, 262], [459, 282], [462, 310], [483, 318], [489, 337], [470, 376], [450, 384], [427, 407], [420, 400], [372, 398], [350, 372]] },
      { id: 'l1', art: 'bahn', name: 'Bahn', p: [[0, 625], [71, 583], [134, 527], [299, 371], [400, 285], [500, 207], [600, 144], [700, 100], [750, 83], [900, 60], [1000, 50]] },
      { id: 'l2', art: 'weg', name: '', p: [[0, 640], [59, 599], [134, 539], [280, 412], [327, 368], [450, 260], [550, 197], [650, 144], [724, 110], [780, 97], [1000, 76]] },
      { id: 'g1', art: 'gebaeude', name: 'Vereinsheim', p: [[459, 282], [528, 265], [542, 314], [516, 321], [518, 332], [489, 337], [483, 318], [462, 310]] },
      { id: 'g2', art: 'dach', name: 'Optis', p: [[553, 266], [562, 264], [572, 298], [563, 301]] },
      { id: 'g5', art: 'slipfl', name: '', p: [[543, 303], [552, 300], [561, 325], [552, 331]] },
      { id: 'g3', art: 'dach', name: 'Mastenlager · Trecker', p: [[576, 257], [604, 249], [614, 280], [587, 289]] },
      { id: 'g4', art: 'dach', name: '', p: [[433, 396], [447, 393], [450, 402], [438, 407]] }
    ],
    punkte: [{ id: 'p1', art: 'kran', name: 'Kran', x: 462, y: 377 }, { id: 'p2', art: 'slip', name: 'Slip', x: 551, y: 318 }],
    // Nordlager laut Verein: Lagerweg in der Mitte (Sackgasse), links eine Reihe, rechts zwei Reihen nebeneinander,
    // vorne links zwei Reihen schräg mit dem Bug zur Messe (Vereinsheim). neig = Schräge je Boot, bug = Bugrichtung (1 = zur Straße/nach vorn)
    lager: [
      { id: 'nv', name: 'Nord vorne · schräg', praefix: 'P', ab: 1, anzahl: 10, spalten: 5, stellen: 2, x: 520.7, y: 233.4, rot: -20.4, bw: 13, bh: 13, neig: 40, lw: 5.4, lh: 12.5, bug: 1 },
      { id: 'nl', name: 'Nord links', praefix: 'P', ab: 11, anzahl: 12, spalten: 12, stellen: 2, x: 623.3, y: 185.1, rot: -20.4, bw: 9, bh: 19, bug: 1 },
      { id: 'nr', name: 'Nord rechts · zwei Reihen', praefix: 'P', ab: 23, anzahl: 14, spalten: 7, stellen: 2, x: 645.4, y: 215.8, rot: -20.4, bw: 22, bh: 10, bug: 1 },
      { id: 'w', name: 'Winterlager West', praefix: 'P', ab: 41, anzahl: 20, spalten: 10, stellen: 2, x: 408, y: 345, rot: -40, bw: 9, bh: 20 },
      { id: 'h', name: 'Halle', praefix: 'H', ab: 1, anzahl: 4, spalten: 4, stellen: 0, x: 775, y: 175, rot: -8, bw: 8, bh: 20 },
      { id: 'a', name: 'Außenlager', praefix: 'A', ab: 1, anzahl: 6, spalten: 6, stellen: 0, x: 772, y: 146, rot: -8, bw: 10, bh: 22 }
    ]
  };

  // Flächen- und Linienarten (Reihenfolge z = Zeichenebene), Punktarten
  const ART = {
    gruen: { name: 'Grün / Bäume', zu: 1, z: 1 }, natur: { name: 'Schilf / Naturschutz', zu: 1, z: 1 }, wasser: { name: 'Wasser', zu: 1, z: 2 },
    strasse: { name: 'Straße', zu: 1, z: 3 }, hof: { name: 'Hof / Schotter', zu: 1, z: 3 }, parken: { name: 'Parkplatz', zu: 1, z: 3 }, lagerfl: { name: 'Lagerfläche', zu: 1, z: 3 },
    bahn: { name: 'Bahn', zu: 0, z: 4 }, weg: { name: 'Weg', zu: 0, z: 4 }, zaun: { name: 'Zaun / Grenze', zu: 0, z: 6 },
    gebaeude: { name: 'Gebäude', zu: 1, z: 5 }, dach: { name: 'Halle / Schuppen / Dach', zu: 1, z: 5 }, slipfl: { name: 'Slip / Rampe', zu: 1, z: 5 }
  };
  const PUNKT = {
    kran: ['K', 'Kran'], mastkran: ['M', 'Mastenkran'], slip: ['S', 'Slip'], wc: ['WC', 'WC / Duschen'], strom: ['⚡', 'Strom'], wasser: ['W', 'Wasser'],
    muell: ['Mü', 'Müll'], tor: ['T', 'Tor / Einfahrt'], rettung: ['R', 'Rettungsmittel'], feuer: ['F', 'Feuerlöscher'], info: ['i', 'Aushang / Info'], fahne: ['⚑', 'Flaggenmast']
  };

  const STATUS_TEXT = {
    belegt: 'belegt', unterwegs: 'Eigner unterwegs – grünes Schild', gast: 'Gastlieger', saisongast: 'Saison-Gast',
    frei: 'frei', gesperrt: 'gesperrt'
  };

  const gueltig = (p) => p && Array.isArray(p.stege) && Array.isArray(p.formen) && p.stege.every((s) => Array.isArray(s.a) && Array.isArray(s.b));
  // Aktiver Plan: vom Verein gezeichnet (Einstellungen) oder die Vorlage
  function aktiv() {
    const d = window.HAFEN && window.HAFEN.d; const eigen = d && d.einstellungen && d.einstellungen.lageplan;
    return gueltig(eigen) ? { ...STANDARD, laengs: [], punkte: [], lager: [], ...eigen } : STANDARD;
  }

  /* ---------- Geometrie ---------- */
  function stegGeo(s, m) {
    const [ax, ay] = s.a, [bx, by] = s.b; const len = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / len, uy = (by - ay) / len; const sg = s.seite === -1 ? -1 : 1;
    return { len, ux, uy, nx: -uy * sg, ny: ux * sg, winkel: Math.atan2(uy, ux) * 180 / Math.PI, tiefe: (Number(s.tiefe) || 10) / m,
      f0: ((s.frei && Number(s.frei[0])) || 0) / m, f1: ((s.frei && Number(s.frei[1])) || 0) / m };
  }
  const hatPlaetze = (s) => s.von != null && s.bis != null && s.von !== '' && s.bis !== '' && !isNaN(Number(s.von)) && !isNaN(Number(s.bis));
  function plaetzeVon(plan) {
    const plaetze = [], pfaehle = [];
    plan.stege.forEach((s) => {
      if (!hatPlaetze(s)) return;
      const g = stegGeo(s, plan.m); const von = Number(s.von), bis = Number(s.bis); const n = Math.abs(bis - von) + 1; const dir = bis >= von ? 1 : -1;
      const nutz = Math.max(1, g.len - g.f0 - g.f1); const schritt = nutz / n;
      for (let i = 0; i < n; i++) {
        const t = g.f0 + (i + 0.5) * schritt; const cx = s.a[0] + g.ux * t, cy = s.a[1] + g.uy * t;
        plaetze.push({ nr: String(von + dir * i), steg: s.id, bruecke: s.bruecke || '', x: cx + g.nx * g.tiefe / 2, y: cy + g.ny * g.tiefe / 2, breite: schritt * 0.9, tiefe: g.tiefe, winkel: g.winkel });
      }
      for (let i = 0; i <= n; i++) { const t = g.f0 + i * schritt; pfaehle.push([s.a[0] + g.ux * t + g.nx * (g.tiefe + 1.5), s.a[1] + g.uy * t + g.ny * (g.tiefe + 1.5)]); }
    });
    return { plaetze, pfaehle };
  }
  // Lagerfelder: Raster aus Reihen; je Platz Mittelpunkt (mx, my im Lager-Koordinatensystem), Bootsfläche fw × fh,
  // optional schräg (neig°) und mit Bugrichtung (bug: 1 = zur +y-/+x-Seite, -1 = Gegenseite)
  function lagerVon(plan) {
    const out = [];
    (plan.lager || []).forEach((L) => {
      const sp = Math.max(1, Number(L.spalten) || 1), n = Math.max(0, Number(L.anzahl) || 0), zeilen = Math.ceil(n / sp);
      const bw = Number(L.bw) || 10, bh = Number(L.bh) || 20; const w = sp * bw, h = zeilen * bh;
      const fw = Number(L.lw) || bw - 1, fh = Number(L.lh) || bh - 1;
      for (let i = 0; i < n; i++) {
        const mx = -w / 2 + (i % sp) * bw + bw / 2, my = -h / 2 + Math.floor(i / sp) * bh + bh / 2;
        out.push({ id: (L.praefix || '') + String((Number(L.ab) || 1) + i).padStart(Number(L.stellen) || 0, '0'), lager: L.id, nr: i,
          mx, my, x: mx - fw / 2, y: my - fh / 2, w: fw, h: fh, neig: Number(L.neig) || 0, bug: Number(L.bug) === -1 ? -1 : 1, cx: L.x, cy: L.y, rot: Number(L.rot) || 0 });
      }
    });
    return out;
  }
  // Ecken eines Lagerplatzes in Plan-Koordinaten (für Ansichten und den Editor)
  function lagerEcken(g) {
    return [[-g.w / 2, -g.h / 2], [g.w / 2, -g.h / 2], [g.w / 2, g.h / 2], [-g.w / 2, g.h / 2]].map(([x, y]) => {
      const [a, b] = drehen(x, y, g.neig); const [c, e] = drehen(g.mx + a, g.my + b, g.rot); return [g.cx + c, g.cy + e]; });
  }
  const drehen = (x, y, rot) => { const r = rot * Math.PI / 180; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; };
  // Bootsrumpf (Spiegelheck hinten, spitzer Bug) entlang der langen Seite eines Lagerplatzes, Bug in Richtung g.bug
  function rumpfPfad(L, B) {
    const h = -L / 2, v = L / 2, b = B / 2;
    return `M${h.toFixed(2)} ${(-b * .72).toFixed(2)} Q${h.toFixed(2)} ${(-b).toFixed(2)} ${(h + L * .22).toFixed(2)} ${(-b).toFixed(2)} L${(L * .08).toFixed(2)} ${(-b).toFixed(2)} Q${(v - L * .08).toFixed(2)} ${(-b * .78).toFixed(2)} ${v.toFixed(2)} 0 Q${(v - L * .08).toFixed(2)} ${(b * .78).toFixed(2)} ${(L * .08).toFixed(2)} ${b.toFixed(2)} L${(h + L * .22).toFixed(2)} ${b.toFixed(2)} Q${h.toFixed(2)} ${b.toFixed(2)} ${h.toFixed(2)} ${(b * .72).toFixed(2)} Z`;
  }
  function rumpfLand(g) {
    const lang = g.h >= g.w; const L = (lang ? g.h : g.w) - 1.6, B = (lang ? g.w : g.h) - 1.8;
    const w = lang ? (g.bug === -1 ? -90 : 90) : (g.bug === -1 ? 180 : 0);
    return `<path class="rumpf" d="${rumpfPfad(L, B)}"${w ? ` transform="rotate(${w})"` : ''}/>`;
  }

  /* ---------- Ansichten (Zoomstufen) aus der Geometrie ---------- */
  function rahmen(punkte, rand, minBreite) {
    if (!punkte.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    punkte.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    x0 -= rand; y0 -= rand; x1 += rand; y1 += rand;
    let w = Math.max(x1 - x0, minBreite || 0), h = y1 - y0; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const v = 1000 / 640;
    if (w / h < v) w = h * v; else h = w / v;
    return [cx - w / 2, cy - h / 2, w, h].map((z) => Math.round(z * 10) / 10);
  }
  const stegPunkte = (s, m) => { const g = stegGeo(s, m); const o = hatPlaetze(s) ? g.tiefe + 6 : 0; return [s.a, s.b, [s.a[0] + g.nx * o, s.a[1] + g.ny * o], [s.b[0] + g.nx * o, s.b[1] + g.ny * o]]; };
  function ansichten(plan) {
    const alle = [], je = {};
    plan.stege.forEach((s) => { const pk = stegPunkte(s, plan.m); alle.push(...pk); if (s.bruecke) (je[s.bruecke] = je[s.bruecke] || []).push(...pk); });
    const land = [];
    lagerVon(plan).forEach((g) => land.push(...lagerEcken(g)));
    plan.formen.filter((f) => ['gebaeude', 'dach', 'hof', 'parken', 'lagerfl', 'slipfl'].includes(f.art)).forEach((f) => alle.push(...f.p));
    (plan.laengs || []).forEach((l) => alle.push([l.x, l.y])); (plan.punkte || []).forEach((p) => alle.push([p.x, p.y])); alle.push(...land);
    const gesamt = rahmen(alle, 45, 300) || [0, 0, plan.breite, plan.hoehe];
    const a = { gesamt, land: rahmen(land, 30, 260) || gesamt };
    ['ost', 'west', 'schwimm'].forEach((k) => { a[k] = rahmen(je[k] || [], 24, 200) || gesamt; });
    return a;
  }

  /* ---------- Zeichnen ---------- */
  const pfad = (p, zu) => p.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ') + (zu ? ' Z' : '');
  function mitte(p) {   // Flächenschwerpunkt
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; const k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k; }
    if (Math.abs(a) < 1e-6) return p[0]; return [cx / (3 * a), cy / (3 * a)];
  }
  function svgDefs() {
    return `<defs>
      <pattern id="schraffur" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(14,27,69,.35)" stroke-width="2"/></pattern>
      <pattern id="schilf" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M3 12 L5 5 M8 13 L9 6 M11 12 L13 7" stroke="rgba(70,110,60,.35)" stroke-width="1" fill="none"/></pattern>
      <pattern id="baeume" width="22" height="20" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="4.2" fill="rgba(86,128,72,.22)"/><circle cx="17" cy="14" r="3.4" fill="rgba(86,128,72,.18)"/></pattern>
      <pattern id="schotter" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".6" fill="rgba(120,108,84,.35)"/><circle cx="6.5" cy="5.5" r=".5" fill="rgba(120,108,84,.3)"/></pattern>
      <linearGradient id="wasser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0ee"/><stop offset="1" stop-color="#b6cfe4"/></linearGradient>
      <pattern id="wellen" width="46" height="22" patternUnits="userSpaceOnUse"><path d="M2 8 q5 -3 10 0 t10 0" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".9" stroke-linecap="round"/><path d="M25 18 q4 -2.4 8 0 t8 0" fill="none" stroke="rgba(255,255,255,.4)" stroke-width=".8" stroke-linecap="round"/></pattern>
    </defs>`;
  }
  function formenSvg(plan) {
    const esc = window.HAFEN.H.esc;
    const liste = plan.formen.map((f, i) => ({ f, i })).filter((x) => ART[x.f.art] && x.f.p && x.f.p.length > 1).sort((a, b) => ART[a.f.art].z - ART[b.f.art].z || a.i - b.i);
    const flaechen = liste.map(({ f }) => {
      const zu = ART[f.art].zu; const dpf = pfad(f.p, zu);
      if (f.art === 'bahn') return `<path d="${dpf}" class="pf pf-bahn"/><path d="${dpf}" class="pf pf-bahn2"/>`;
      if (f.art === 'weg') return `<path d="${dpf}" class="pf pf-weg0"/><path d="${dpf}" class="pf pf-weg"/>`;
      const muster = { natur: 'schilf', gruen: 'baeume', hof: 'schotter', parken: 'schotter', lagerfl: 'schotter' }[f.art];
      return `<path d="${dpf}" class="pf pf-${f.art}"/>` + (muster ? `<path d="${dpf}" fill="url(#${muster})" class="pf-muster"/>` : '');
    }).join('');
    const texte = liste.filter(({ f }) => f.name).map(({ f }) => {
      const zu = ART[f.art].zu; let x, y, rot = 0;
      if (f.t) [x, y, rot] = f.t;
      else if (zu) [x, y] = mitte(f.p);
      else { const i = Math.max(0, Math.floor(f.p.length / 2) - 1); const [a, b] = [f.p[i], f.p[i + 1]]; x = (a[0] + b[0]) / 2; y = (a[1] + b[1]) / 2 - 6; rot = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (Math.abs(rot) > 90) rot += 180; }
      const kl = { wasser: 'gross wasser-text', natur: 'gross natur-text', gebaeude: 'hell', strasse: 'strasse-text' }[f.art] || 'klein';
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="pl-label ${kl}" text-anchor="middle"${rot ? ` transform="rotate(${Number(rot).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${esc(f.name)}</text>`;
    }).join('');
    return { flaechen, texte };
  }
  function stegeSvg(plan, geo) {
    const esc = window.HAFEN.H.esc;
    const linien = plan.stege.map((s) => `<line x1="${s.a[0]}" y1="${s.a[1]}" x2="${s.b[0]}" y2="${s.b[1]}" pathLength="1" class="steg${s.schwimm ? ' steg-schwimm' : ''}"/><line x1="${s.a[0]}" y1="${s.a[1]}" x2="${s.b[0]}" y2="${s.b[1]}" class="steg-planken"/>`).join('');
    const pf = geo.pfaehle.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1" class="pfahl"/>`).join('');
    const gesehen = new Set();
    const namen = plan.stege.filter((s) => s.name).map((s) => {
      // gleichnamige Abschnitte (z. B. Westbrücke in zwei Teilen): Name nur am längsten Abschnitt
      const gleich = plan.stege.filter((x) => x.name === s.name); const laengster = gleich.reduce((a, b) => stegGeo(b, plan.m).len > stegGeo(a, plan.m).len ? b : a);
      if (laengster !== s || gesehen.has(s.name)) return ''; gesehen.add(s.name);
      const g = stegGeo(s, plan.m); const mx = (s.a[0] + s.b[0]) / 2 - g.nx * 7, my = (s.a[1] + s.b[1]) / 2 - g.ny * 7; const w = Math.abs(g.winkel) > 90 ? g.winkel + 180 : g.winkel;
      return `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" class="pl-label bruecke" text-anchor="middle" dominant-baseline="middle" transform="rotate(${w.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})">${esc(s.name)}</text>`;
    }).join('');
    return { linien, pf, namen };
  }
  function punkteSvg(plan) {
    const esc = window.HAFEN.H.esc;
    return (plan.punkte || []).map((p) => { const [z, n] = PUNKT[p.art] || ['?', '']; const name = p.name || n;
      return `<g class="pkt pkt-${p.art}" transform="translate(${p.x} ${p.y})"><title>${esc(name)}</title><circle r="7"/><text y="2.6" text-anchor="middle" class="pkt-z">${z}</text><text y="15" text-anchor="middle" class="pl-label klein pkt-n">${esc(name)}</text></g>`; }).join('');
  }
  function massstab(plan) {
    const e50 = 50 / plan.m; const x = plan.breite - e50 - 60, y = plan.hoehe - 34;
    return `<g class="massstab" transform="translate(${x} ${y})"><rect x="-10" y="-16" width="${e50 + 20}" height="30" rx="4" class="ms-bg"/><rect width="${e50 / 2}" height="4" class="ms-a"/><rect x="${e50 / 2}" width="${e50 / 2}" height="4" class="ms-b"/>
      <text y="-4" class="pl-label klein">0</text><text x="${e50 / 2}" y="-4" text-anchor="middle" class="pl-label klein">25</text><text x="${e50}" y="-4" text-anchor="end" class="pl-label klein">50 m</text></g>
      <g transform="translate(${plan.breite - 34} ${plan.hoehe - 70})"><circle r="17" fill="rgba(255,255,255,.75)"/><path d="M0 -14 L4.5 0 L0 14 L-4.5 0 Z" fill="#0E1B45"/><path d="M0 -14 L4.5 0 L-4.5 0 Z" fill="#B8232B"/><text y="-19" text-anchor="middle" class="pl-label klein">N</text></g>`;
  }
  // Untergrund: Zeichnung oder Luftbild
  function svgGrund(plan, geo, luftbild) {
    const st = stegeSvg(plan, geo);
    if (luftbild) return svgDefs() + `<image href="${plan.bild}" x="0" y="0" width="${plan.breite}" height="${plan.hoehe}" preserveAspectRatio="none"/>` +
      `<g class="auf-bild">${st.linien}${st.pf}${st.namen}${punkteSvg(plan)}</g><text x="6" y="${plan.hoehe - 6}" class="pl-label klein quelle">${QUELLE}</text>`;
    const f = formenSvg(plan);
    // sanfte Wellen auf dem Wasser (nur Zeichnung; bewegt sich per CSS, aus bei „Bewegung reduzieren“)
    const wasser = plan.formen.filter((x) => x.art === 'wasser' && x.p && x.p.length > 2);
    const wellen = wasser.length ? `<clipPath id="wasser-clip">${wasser.map((x) => `<path d="${pfad(x.p, true)}"/>`).join('')}</clipPath>` +
      `<g clip-path="url(#wasser-clip)" class="wellen-clip"><rect class="wellen" x="-60" y="-60" width="${plan.breite + 120}" height="${plan.hoehe + 120}" fill="url(#wellen)"/></g>` : '';
    return svgDefs() + `<rect x="-400" y="-400" width="${plan.breite + 800}" height="${plan.hoehe + 800}" fill="#ece6d6"/>` + f.flaechen + wellen + f.texte + st.linien + st.pf + st.namen + punkteSvg(plan) + massstab(plan);
  }

  /**
   * Zeichnet den Plan in ein Element.
   * opts: { modus: 'sommer'|'winter', saison, datum, markiere: platzId, onKlick(platzId), ansicht, namen, luftbild, plan }
   */
  function zeichnen(el, opts) {
    const { Q } = window.HAFEN;
    const d = window.HAFEN.d;
    const plan = opts.plan || aktiv();
    const geo = plaetzeVon(plan);
    const winter = opts.modus === 'winter';
    const lpById = new Map(d.liegeplaetze.map((p) => [p.nr, p]));
    const esc = window.HAFEN.H.esc;
    // Tooltip mit Boot und Eigner – nur, wenn die Verwaltung den Plan zeichnet (opts.namen)
    const info = (p, status) => {
      if (!opts.namen) return '';
      const g = status === 'gast' && Q.gastAm(p.id, opts.datum); const bel = Q.belegungPlatz(opts.saison, 'sommer', p.id); const b = bel && Q.boot(bel.boot_id); const m = b && Q.mitglied(b.eigner_id);
      const txt = (p.box === 'L' ? 'Längsseits ' : 'Platz ') + p.nr + ' – ' + (g ? 'Gast „' + g.bootsname + '“' : b ? '„' + b.name + '“ · ' + Q.name(m) : (STATUS_TEXT[status] || status)) + (status === 'unterwegs' ? ' (grünes Schild)' : '');
      return '<title>' + esc(txt) + '</title>';
    };

    const gezeichnet = new Set();
    const wasserPlaetze = geo.plaetze.map((g) => {
      const p = lpById.get(g.nr); if (!p || gezeichnet.has(g.nr)) return ''; gezeichnet.add(g.nr);   // nur Plätze, die es im Verein gibt; doppelte Nummern nur einmal
      const status = winter ? (p.gesperrt ? 'gesperrt' : 'leer') : Q.statusWasser(p, opts.saison, opts.datum);
      const mark = opts.markiere === p.id ? ' markiert' : '';
      return `<g class="lp st-${status}${mark}" style="--i:${Math.round(g.x / 22)}" data-platz="${p.id}" transform="translate(${g.x.toFixed(1)} ${g.y.toFixed(1)}) rotate(${(g.winkel + 90).toFixed(1)})" tabindex="0" role="button" aria-label="Platz ${p.nr}: ${STATUS_TEXT[status] || status}">${winter ? '' : info(p, status)}
        <rect x="${(-g.tiefe / 2).toFixed(1)}" y="${(-g.breite / 2).toFixed(1)}" width="${g.tiefe.toFixed(1)}" height="${g.breite.toFixed(1)}" rx="1.5"/>
        ${['belegt', 'gast', 'saisongast'].includes(status) ? `<path class="rumpf" d="M${-g.tiefe / 2 + 3} 0 Q ${-g.tiefe / 2 + 6} ${-g.breite / 2 + 1.2}, ${g.tiefe / 2 - 7} ${-g.breite / 2 + 1.4} L ${g.tiefe / 2 - 3} 0 L ${g.tiefe / 2 - 7} ${g.breite / 2 - 1.4} Q ${-g.tiefe / 2 + 6} ${g.breite / 2 - 1.2}, ${-g.tiefe / 2 + 3} 0 Z"/>` : ''}
        <text class="lp-nr" x="${(-g.tiefe / 2 - 4.5).toFixed(1)}" y="1.6" transform="rotate(-90 ${(-g.tiefe / 2 - 4.5).toFixed(1)} 0)" text-anchor="middle">${p.nr}</text>
      </g>`;
    }).join('');

    const laengs = (plan.laengs || []).map((l) => {
      const p = lpById.get(l.nr); if (!p) return '';
      const status = winter ? 'leer' : Q.statusWasser(p, opts.saison, opts.datum);
      const mark = opts.markiere === p.id ? ' markiert' : '';
      return `<g class="lp laengs st-${status}${mark}" data-platz="${p.id}" transform="translate(${l.x} ${l.y}) rotate(${l.rot})" tabindex="0" role="button" aria-label="Längsseits ${p.nr}: ${STATUS_TEXT[status] || status}">${winter ? '' : info(p, status)}
        <rect x="${-l.w / 2}" y="-5" width="${l.w}" height="10" rx="2"/>
        ${['belegt', 'gast', 'saisongast'].includes(status) ? `<path class="rumpf" d="M${-l.w / 2 + 2} 0 Q ${-l.w / 2 + 5} -4, ${l.w / 2 - 6} -3.6 L ${l.w / 2 - 2} 0 L ${l.w / 2 - 6} 3.6 Q ${-l.w / 2 + 5} 4, ${-l.w / 2 + 2} 0 Z"/>` : ''}
        <text class="lp-nr" x="0" y="-7.5" text-anchor="middle">${p.nr}</text></g>`;
    }).join('');

    const per = winter ? 'winter' : 'sommer';
    const land = lagerVon(plan).map((g) => {
      const lp = Q.platz(g.id); if (!lp) return '';
      const status = Q.statusLand(lp, opts.saison, per);
      const mark = opts.markiere === g.id ? ' markiert' : '';
      const bel = Q.belegungPlatz(opts.saison, per, g.id); const b = bel && Q.boot(bel.boot_id);
      const titel = opts.namen ? '<title>' + esc(g.id + ' – ' + (b ? '„' + b.name + '“ · ' + Q.name(Q.mitglied(b.eigner_id)) + (bel.nicht_kranen ? ' (nicht kranen)' : '') : 'frei')) + '</title>' : '';
      const [px] = drehen(g.mx, g.my, g.rot);
      return `<g class="land st-${status}${mark}" style="--i:${Math.round((g.cx + px) / 22)}" data-platz="${g.id}" transform="translate(${g.cx} ${g.cy}) rotate(${g.rot})" tabindex="0" role="button" aria-label="${g.id}: ${status}">${titel}
        <g transform="translate(${g.mx.toFixed(1)} ${g.my.toFixed(1)})${g.neig ? ` rotate(${g.neig})` : ''}"><rect x="${(-g.w / 2).toFixed(1)}" y="${(-g.h / 2).toFixed(1)}" width="${g.w}" height="${g.h}" rx="1.5"/>${status === 'belegt' ? rumpfLand(g) : ''}</g>
        <text class="lp-nr" x="${g.mx.toFixed(1)}" y="${(g.my + 1.8).toFixed(1)}" text-anchor="middle">${g.id}</text>${opts.namen && b ? `<text class="lp-boot" x="${g.mx.toFixed(1)}" y="${(g.my + (g.h > g.w ? 6.5 : 4.6)).toFixed(1)}" text-anchor="middle">${esc(String(b.name).slice(0, 12))}</text>` : ''}</g>`;
    }).join('');
    // Lagernamen über (bzw. bei Lagern unterhalb des Wegs: unter) dem Feld
    const lagerNamen = (plan.lager || []).filter((L) => L.name).map((L) => { const zeilen = Math.ceil((Number(L.anzahl) || 0) / Math.max(1, Number(L.spalten) || 1));
      const unten = L.namenUnten || L.id === 'nr'; const dy = (zeilen * (Number(L.bh) || 20) / 2 + (unten ? 7 : 3)) * (unten ? 1 : -1);
      return `<text class="pl-label klein lager-name" text-anchor="middle" transform="translate(${L.x} ${L.y}) rotate(${Number(L.rot) || 0}) translate(0 ${dy.toFixed(1)})">${esc(L.name)}</text>`; }).join('');

    const A = ansichten(plan);
    const vb = Array.isArray(opts.ansicht) ? opts.ansicht : (A[opts.ansicht || 'gesamt'] || A.gesamt);
    const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML = `<svg class="hafenplan${(vb[2] < 600) ? ' nah' : ''}${vb[2] < 260 ? ' sehr-nah' : ''}${opts.luftbild ? ' mit-bild' : ''}${opts.intro === false || ruhig ? '' : ' intro'}" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hafenplan des SSV">${svgGrund(plan, geo, !!opts.luftbild)}${land}${lagerNamen}${wasserPlaetze}${laengs}</svg>`;
    const svg = el.firstChild; svg._ansichten = A; svg._plan = plan;
    if (svg.classList.contains('intro')) setTimeout(() => svg.classList.remove('intro'), 1800);
    const klick = (e) => { const g = e.target.closest('[data-platz]'); if (g && opts.onKlick) opts.onKlick(g.dataset.platz); };
    svg.addEventListener('click', klick);
    svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klick(e); } });
    return svg;
  }

  /* ---------- Kamera: Verschieben und Zoomen wie in einer Karten-App ----------
   * Maus: ziehen = verschieben, Mausrad = zoomen (um den Mauszeiger), Doppelklick = näher (mit Umschalt: weiter weg).
   * Trackpad: zwei Finger = verschieben, Kneifen = zoomen. Touch: ein Finger = verschieben, zwei Finger = zoomen,
   * Doppeltipp = näher. Tastatur: + / − / 0 und Pfeiltasten. Nach dem Loslassen gleitet der Plan kurz nach (Trägheit).
   * Alle Wechsel laufen weich (gedämpfte Feder); bei „Bewegung reduzieren“ springt der Plan ohne Animation. */
  function kamera(svg, opt = {}) {
    if (svg._kamera) return svg._kamera;
    const plan = svg._plan || aktiv(); const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minW = opt.minW || 60, maxW = opt.maxW || plan.breite * 1.25;
    let cur = svg.getAttribute('viewBox').split(/\s+/).map(Number), ziel = cur.slice(), vel = null, raf = 0, last = 0;
    const box = () => svg.getBoundingClientRect();
    const asp = () => { const r = box(); return r.width > 10 && r.height > 10 ? r.width / r.height : cur[2] / cur[3]; };
    // Ansicht an das Seitenverhältnis des Fensters anpassen (kein Rand) und im Plan halten
    function passend(v, fuellen) {
      let [x, y, w, h] = v; const a = asp(); const cx = x + w / 2, cy = y + h / 2;
      if (fuellen ? w / h > a : w / h < a) w = h * a; else h = w / a;
      if (w > maxW) { w = maxW; h = w / a; } if (w < minW) { w = minW; h = w / a; }
      const rx = Math.max(0, (plan.breite - w) / 2) + w * 0.35, ry = Math.max(0, (plan.hoehe - h) / 2) + h * 0.35;
      const mx = Math.min(plan.breite / 2 + rx, Math.max(plan.breite / 2 - rx, cx)), my = Math.min(plan.hoehe / 2 + ry, Math.max(plan.hoehe / 2 - ry, cy));
      return [mx - w / 2, my - h / 2, w, h];
    }
    const setzen = (v) => { svg.setAttribute('viewBox', v.map((z) => z.toFixed(2)).join(' ')); svg.classList.toggle('nah', v[2] < 600); svg.classList.toggle('sehr-nah', v[2] < 260); if (opt.onAnsicht) opt.onAnsicht(v); };
    function tick(t) {
      const dt = Math.min(48, t - (last || t)); last = t;
      if (vel) { ziel = passend([ziel[0] + vel[0] * dt, ziel[1] + vel[1] * dt, ziel[2], ziel[3]]); const r = Math.pow(0.93, dt / 16); vel = [vel[0] * r, vel[1] * r];
        if (Math.hypot(vel[0], vel[1]) * 16 < cur[2] * 0.0004) vel = null; }
      const k = 1 - Math.exp(-dt / 70); cur = cur.map((c, i) => c + (ziel[i] - c) * k); setzen(cur);
      const fertig = !vel && cur.every((c, i) => Math.abs(c - ziel[i]) < Math.max(0.02, ziel[2] * 0.0002));
      if (fertig) { cur = ziel.slice(); setzen(cur); raf = 0; last = 0; } else raf = requestAnimationFrame(tick);
    }
    const los = () => { if (ruhig) { cur = ziel.slice(); vel = null; setzen(cur); return; } if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
    const sofort = (v) => { ziel = passend(v); cur = ziel.slice(); setzen(cur); };
    // Punkt unter dem Finger/Mauszeiger in Plan-Koordinaten (bezogen auf eine Ansicht v)
    const punkt = (cx, cy, v) => { const r = box(); return [v[0] + (cx - r.left) / r.width * v[2], v[1] + (cy - r.top) / r.height * v[3]]; };
    function zoom(f, cx, cy) {
      const r = box(); const [px, py] = punkt(cx == null ? r.left + r.width / 2 : cx, cy == null ? r.top + r.height / 2 : cy, ziel);
      const w = Math.min(maxW, Math.max(minW, ziel[2] * f)); const g = w / ziel[2];
      ziel = passend([px - (px - ziel[0]) * g, py - (py - ziel[1]) * g, w, ziel[3] * g]); vel = null; los();
    }
    function zu(z) { const A = svg._ansichten || ansichten(plan); const v = Array.isArray(z) ? z : (A[z] || A.gesamt); ziel = passend(v); vel = null; los(); }
    function auf(v) { ziel = passend(v.slice(), true); vel = null; los(); }   // genau diesen Ausschnitt zeigen (Lageplan-Fokus)
    // Mausrad / Trackpad
    svg.addEventListener('wheel', (e) => {
      e.preventDefault(); const r = box(); const pix = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
      if (!e.ctrlKey && Math.abs(e.deltaX) > 0.5 && e.deltaMode === 0) {   // Trackpad: zwei Finger schieben
        const dx = e.deltaX / r.width * ziel[2], dy = e.deltaY / r.height * ziel[3]; ziel = passend([ziel[0] + dx, ziel[1] + dy, ziel[2], ziel[3]]); vel = null; los(); return;
      }
      const d = e.deltaY * pix; zoom(Math.exp(d * (e.ctrlKey ? 0.012 : 0.0018)), e.clientX, e.clientY);
    }, { passive: false });
    // Zeiger: Verschieben, Kneifen, Doppeltipp
    const zeiger = new Map(); let start = null, bewegt = false, verlauf = [], tipp = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return; zeiger.set(e.pointerId, [e.clientX, e.clientY]); vel = null;
      if (zeiger.size === 1) { start = { x: e.clientX, y: e.clientY, v: cur.slice(), id: e.pointerId }; bewegt = false; verlauf = [[performance.now(), e.clientX, e.clientY]]; }
      if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; start = { zwei: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v: cur.slice() }; bewegt = true; }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!zeiger.has(e.pointerId) || !start) return; zeiger.set(e.pointerId, [e.clientX, e.clientY]); const r = box();
      if (start.zwei && zeiger.size >= 2) {
        const [a, b] = [...zeiger.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const w = Math.min(maxW, Math.max(minW, start.v[2] * start.d / d)); const g = w / start.v[2];
        const [px, py] = punkt(start.m[0], start.m[1], start.v);
        sofort([px - (m[0] - r.left) / r.width * w, py - (m[1] - r.top) / r.height * start.v[3] * g, w, start.v[3] * g]); return;
      }
      if (start.zwei) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!bewegt && Math.hypot(dx, dy) < 6) return;
      if (!bewegt) { bewegt = true; svg.classList.add('zieht'); try { svg.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } }
      sofort([start.v[0] - dx / r.width * start.v[2], start.v[1] - dy / r.height * start.v[3], start.v[2], start.v[3]]);
      verlauf.push([performance.now(), e.clientX, e.clientY]); if (verlauf.length > 6) verlauf.shift();
    });
    const ende = (e) => {
      if (!zeiger.has(e.pointerId)) return; zeiger.delete(e.pointerId); svg.classList.remove('zieht');
      if (start && start.zwei) { if (zeiger.size === 1) { const [p] = [...zeiger.values()]; start = { x: p[0], y: p[1], v: cur.slice() }; bewegt = true; } else start = null; return; }
      if (bewegt && verlauf.length > 1 && e.type === 'pointerup') {   // nachgleiten
        const [t0, x0, y0] = verlauf[0], [t1, x1, y1] = verlauf[verlauf.length - 1]; const dt = Math.max(16, t1 - t0); const r = box();
        if (performance.now() - t1 < 80) { vel = [-(x1 - x0) / dt / r.width * cur[2], -(y1 - y0) / dt / r.height * cur[3]]; los(); }
      }
      if (!bewegt && e.pointerType !== 'mouse') {   // Doppeltipp = näher
        const jetzt = performance.now();
        if (tipp && jetzt - tipp.t < 320 && Math.hypot(e.clientX - tipp.x, e.clientY - tipp.y) < 30) { zoom(0.5, e.clientX, e.clientY); tipp = null; }
        else tipp = { t: jetzt, x: e.clientX, y: e.clientY };
      }
      start = null;
    };
    svg.addEventListener('pointerup', ende); svg.addEventListener('pointercancel', ende); svg.addEventListener('lostpointercapture', (e) => { if (zeiger.has(e.pointerId)) ende(e); });
    // Nach dem Ziehen keinen Klick auf einen Platz auslösen
    svg.addEventListener('click', (e) => { if (bewegt) { e.stopImmediatePropagation(); e.preventDefault(); bewegt = false; } }, true);
    svg.addEventListener('dblclick', (e) => { e.preventDefault(); zoom(e.shiftKey ? 2 : 0.5, e.clientX, e.clientY); });
    svg.addEventListener('keydown', (e) => {
      const r = box(); const schritt = 0.12;
      const k = { '+': () => zoom(0.7), '=': () => zoom(0.7), '-': () => zoom(1.43), '0': () => zu('gesamt'),
        ArrowLeft: () => { ziel = passend([ziel[0] - ziel[2] * schritt, ziel[1], ziel[2], ziel[3]]); los(); }, ArrowRight: () => { ziel = passend([ziel[0] + ziel[2] * schritt, ziel[1], ziel[2], ziel[3]]); los(); },
        ArrowUp: () => { ziel = passend([ziel[0], ziel[1] - ziel[3] * schritt, ziel[2], ziel[3]]); los(); }, ArrowDown: () => { ziel = passend([ziel[0], ziel[1] + ziel[3] * schritt, ziel[2], ziel[3]]); los(); } }[e.key];
      if (k && r.width) { e.preventDefault(); k(); }
    });
    // Größe des Fensters ändert sich (Drehen, Vollbild): Ausschnitt anpassen, Mitte behalten
    if (window.ResizeObserver) new ResizeObserver(() => { ziel = passend(ziel); cur = passend(cur); setzen(cur); }).observe(svg);
    ziel = passend(cur); cur = ziel.slice(); setzen(cur);
    // Bedienknöpfe und kurzer Hinweis
    const huelle = opt.knoepfe || svg.parentElement;
    if (huelle && opt.knoepfe !== false) {
      huelle.classList.add('mit-kamera');
      const ctl = document.createElement('div'); ctl.className = 'plan-ctl';
      ctl.innerHTML = '<button type="button" data-k="rein" aria-label="Näher heran">+</button><button type="button" data-k="raus" aria-label="Weiter weg">−</button><button type="button" data-k="alles" aria-label="Ganzen Hafen zeigen" title="Ganzer Hafen">⤢</button>' +
        (opt.vollbild ? '<button type="button" data-k="voll" aria-label="Vollbild" title="Vollbild">⛶</button>' : '');
      ctl.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k;
        if (k === 'rein') zoom(0.6); else if (k === 'raus') zoom(1.65); else if (k === 'alles') zu('gesamt'); else if (k === 'voll' && opt.vollbild) opt.vollbild(); });
      huelle.appendChild(ctl);
      let gesehen = false; try { gesehen = sessionStorage.getItem('ssv-plan-hinweis') === '1'; sessionStorage.setItem('ssv-plan-hinweis', '1'); } catch (x) { /* egal */ }
      if (!gesehen) { const h = document.createElement('div'); h.className = 'plan-tipp'; h.textContent = matchMedia('(pointer: coarse)').matches ? 'Mit einem Finger verschieben · mit zwei Fingern zoomen · Doppeltipp = näher' : 'Ziehen = verschieben · Mausrad = zoomen · Doppelklick = näher'; huelle.appendChild(h); setTimeout(() => h.remove(), 4200); }
    }
    svg._kamera = { zu, auf, zoom, get ansicht() { return ziel.slice(); } };
    return svg._kamera;
  }
  // Sanft zu einer Ansicht zoomen (mit Kamera weich gefedert, sonst einfache Animation)
  function zoomen(svg, ziel, dauer = 450) {
    if (svg._kamera) return svg._kamera.zu(ziel);
    const start = svg.getAttribute('viewBox').split(' ').map(Number);
    const A = svg._ansichten || ansichten(aktiv());
    const ende = Array.isArray(ziel) ? ziel : (A[ziel] || A.gesamt);
    const t0 = performance.now();
    const schritt = (t) => {
      const p = Math.min(1, (t - t0) / dauer), e = 1 - Math.pow(1 - p, 3);
      const vb = start.map((s, i) => s + (ende[i] - s) * e);
      svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));
      svg.classList.toggle('nah', vb[2] < 600);
      if (p < 1) requestAnimationFrame(schritt);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { svg.setAttribute('viewBox', ende.join(' ')); svg.classList.toggle('nah', ende[2] < 600); return; }
    requestAnimationFrame(schritt);
  }

  // Für den Editor: welche Platznummern aus dem Verein fehlen im Plan, welche sind doppelt?
  function pruefen(plan, d) {
    const nrn = plaetzeVon(plan).plaetze.map((p) => p.nr).concat((plan.laengs || []).map((l) => String(l.nr)));
    const zaehl = {}; nrn.forEach((n) => { zaehl[n] = (zaehl[n] || 0) + 1; });
    const soll = (d.liegeplaetze || []).map((p) => String(p.nr));
    const landSoll = (d.landplaetze || []).map((p) => p.id); const landIst = new Set(lagerVon(plan).map((g) => g.id));
    return { fehlen: soll.filter((n) => !zaehl[n]), doppelt: Object.keys(zaehl).filter((n) => zaehl[n] > 1), unbekannt: Object.keys(zaehl).filter((n) => !soll.includes(n)),
      landFehlen: landSoll.filter((id) => !landIst.has(id)), anzahl: soll.length };
  }

  window.HAFEN_PLAN = { zeichnen, zoomen, kamera, lagerEcken, STATUS_TEXT, STANDARD, ART, PUNKT, QUELLE, aktiv, gueltig, plaetzeVon, lagerVon, stegGeo, hatPlaetze, ansichten, pruefen, svgDefs, formenSvg, mitte, drehen,
    get ANSICHTEN() { return ansichten(aktiv()); } };
})();
