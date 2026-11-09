/* SSV Hafen-Manager – interaktiver Hafenplan (SVG)
 *
 * Schematische Karte nach Luftbild-Vorlage (Koordinatenraum 1000 × 720).
 * Brücken als Linien A→B; die Liegeplätze liegen wasserseitig senkrecht dazu.
 * [ANNAHME] Zuordnung und Nummerierung der Brücken bis zur Bestätigung durch den Verein.
 */
(function () {
  'use strict';

  const BRUECKEN = {
    ost: { a: [550, 295], b: [825, 182], von: 1, bis: 24, name: 'Ostbrücke' },
    west: { a: [528, 326], b: [142, 598], von: 25, bis: 70, name: 'Westbrücke' },
    schwimm: { a: [152, 596], b: [73, 665], von: 71, bis: 79, name: 'Schwimmbrücke' }
  };
  const LAENGS = [{ nr: 'L1', x: 66, y: 678, w: 30, rot: -41 }, { nr: 'L2', x: 832, y: 166, w: 30, rot: -22.3 }];
  const TIEFE = 28;

  const ANSICHTEN = {
    gesamt: [0, 40, 1000, 640],
    ost: [520, 120, 360, 230],
    west: [100, 290, 480, 307],
    schwimm: [20, 540, 230, 147],
    land: [270, 50, 470, 300]
  };

  const STATUS_TEXT = {
    belegt: 'belegt', unterwegs: 'Eigner unterwegs – grünes Schild', gast: 'Gastlieger', saisongast: 'Saison-Gast',
    frei: 'frei', gesperrt: 'gesperrt'
  };

  function geometrie() {
    const plaetze = [];
    Object.entries(BRUECKEN).forEach(([key, br]) => {
      const [ax, ay] = br.a, [bx, by] = br.b;
      const n = br.bis - br.von + 1;
      const len = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / len, uy = (by - ay) / len;
      // Normale zur Wasserseite (nach Süden, y wächst)
      let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
      const schritt = len / n;
      const winkel = Math.atan2(uy, ux) * 180 / Math.PI;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * schritt;
        const cx = ax + ux * t, cy = ay + uy * t;
        plaetze.push({ nr: String(br.von + i), bruecke: key, x: cx + nx * TIEFE / 2, y: cy + ny * TIEFE / 2, breite: schritt * 0.88, tiefe: TIEFE, winkel });
      }
    });
    return plaetze;
  }
  const GEO = geometrie();

  // Palettenraster, Halle, Außenlager auf den Landflächen
  function landGeometrie() {
    const g = [];
    for (let i = 0; i < 20; i++) g.push({ id: 'P' + String(i + 1).padStart(2, '0'), x: 602 + (i % 5) * 23, y: 82 + Math.floor(i / 5) * 16, w: 20, h: 13 });
    for (let i = 0; i < 20; i++) g.push({ id: 'P' + String(i + 21).padStart(2, '0'), x: 298 + (i % 5) * 22, y: 276 + Math.floor(i / 5) * 15, w: 19, h: 12 });
    for (let i = 0; i < 4; i++) g.push({ id: 'H' + (i + 1), x: 556 + (i % 2) * 22, y: 202 + Math.floor(i / 2) * 24, w: 20, h: 22 });
    for (let i = 0; i < 6; i++) g.push({ id: 'A' + (i + 1), x: 425 + (i % 3) * 30, y: 316 + Math.floor(i / 3) * 18, w: 27, h: 15 });
    return g;
  }
  const LAND = landGeometrie();

  function svgGrund() {
    return `
    <defs>
      <pattern id="schraffur" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(14,27,69,.35)" stroke-width="2"/></pattern>
      <pattern id="schilf" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M3 12 L5 5 M8 13 L9 6 M11 12 L13 7" stroke="rgba(70,110,60,.35)" stroke-width="1" fill="none"/></pattern>
      <linearGradient id="wasser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0ee"/><stop offset="1" stop-color="#b9d0e4"/></linearGradient>
    </defs>
    <rect x="-200" y="-200" width="1400" height="1200" fill="#ece6d6"/>
    <path class="wasser" d="M0 640 L120 560 L300 452 L540 292 L560 286 L835 168 L1000 112 L1000 340 L860 335 L700 432 L560 520 L420 600 L330 690 L300 760 L0 760 Z" fill="url(#wasser)"/>
    <path d="M1000 340 L860 335 L700 432 L560 520 L420 600 L330 690 L300 760 L1000 760 Z" fill="#cfd8bd"/>
    <path d="M1000 340 L860 335 L700 432 L560 520 L420 600 L330 690 L300 760 L1000 760 Z" fill="url(#schilf)"/>
    <text x="760" y="560" class="pl-label gross" fill="rgba(60,90,50,.75)">Naturschutzgebiet</text>
    <text x="560" y="430" class="pl-label gross wasser-text" transform="rotate(-27 560 430)">Trave · nördlicher Arm</text>
    <path d="M-20 520 L800 -20" stroke="#b8b2a3" stroke-width="7" fill="none"/>
    <path d="M-20 520 L800 -20" stroke="#ece6d6" stroke-width="3" stroke-dasharray="10 8" fill="none"/>
    <text x="150" y="400" class="pl-label" transform="rotate(-33 150 400)" fill="#8a8473">Bahn</text>
    <path d="M300 268 L415 215 L540 205 L600 175 L730 70 L740 160 L560 286 L540 292 L420 360 L300 400 Z" fill="#ddd5c0"/>
    <rect x="417" y="220" width="96" height="78" rx="3" fill="#41485c"/>
    <text x="465" y="263" class="pl-label hell" text-anchor="middle">Vereinsheim</text>
    <rect x="552" y="198" width="50" height="54" rx="2" fill="#7b8092"/>
    <text x="577" y="194" class="pl-label klein" text-anchor="middle">Halle</text>
    <text x="660" y="76" class="pl-label klein" text-anchor="middle">Winterlager Nord</text>
    <text x="352" y="270" class="pl-label klein" text-anchor="middle">Winterlager West</text>
    <text x="470" y="312" class="pl-label klein" text-anchor="middle">Außenlager</text>
    <g class="kran" transform="translate(538 312)"><circle r="9" fill="#e0a526"/><text y="3.5" text-anchor="middle" class="pl-label klein" fill="#0E1B45">K</text></g>
    ${Object.values(BRUECKEN).map((b) => `<line x1="${b.a[0]}" y1="${b.a[1]}" x2="${b.b[0]}" y2="${b.b[1]}" stroke="#8c7a5b" stroke-width="5" stroke-linecap="round"/>`).join('')}
    ${Object.entries(BRUECKEN).map(([k, b]) => { const mx = (b.a[0] + b.b[0]) / 2, my = (b.a[1] + b.b[1]) / 2; const w = Math.atan2(b.b[1] - b.a[1], b.b[0] - b.a[0]) * 180 / Math.PI; const ww = Math.abs(w) > 90 ? w + 180 : w;
      return `<text x="${mx}" y="${my}" class="pl-label bruecke" text-anchor="middle" transform="rotate(${ww} ${mx} ${my}) translate(0 -9)">${b.name}</text>`; }).join('')}
    <g transform="translate(950 640)"><circle r="22" fill="rgba(255,255,255,.7)"/><path d="M0 -18 L5 0 L0 18 L-5 0 Z" fill="#0E1B45"/><path d="M0 -18 L5 0 L-5 0 Z" fill="#B8232B"/><text y="-24" text-anchor="middle" class="pl-label klein">N</text></g>`;
  }

  /**
   * Zeichnet den Plan in ein Element.
   * opts: { modus: 'sommer'|'winter', saison, datum, markiere: platzId, onKlick(platzId), ansicht }
   */
  function zeichnen(el, opts) {
    const { Q } = window.HAFEN;
    const d = window.HAFEN.d;
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

    const wasserPlaetze = GEO.map((g) => {
      const p = lpById.get(g.nr);
      const status = winter ? (p.gesperrt ? 'gesperrt' : 'leer') : Q.statusWasser(p, opts.saison, opts.datum);
      const mark = opts.markiere === p.id ? ' markiert' : '';
      return `<g class="lp st-${status}${mark}" data-platz="${p.id}" transform="translate(${g.x.toFixed(1)} ${g.y.toFixed(1)}) rotate(${(g.winkel + 90).toFixed(1)})" tabindex="0" role="button" aria-label="Platz ${p.nr}: ${STATUS_TEXT[status] || status}">${winter ? '' : info(p, status)}
        <rect x="${(-g.tiefe / 2).toFixed(1)}" y="${(-g.breite / 2).toFixed(1)}" width="${g.tiefe}" height="${g.breite.toFixed(1)}" rx="1.5"/>
        ${['belegt', 'unterwegs', 'gast', 'saisongast'].includes(status) && status !== 'unterwegs' ? `<path class="rumpf" d="M${-g.tiefe / 2 + 3} 0 Q ${-g.tiefe / 2 + 6} ${-g.breite / 2 + 1.2}, ${g.tiefe / 2 - 7} ${-g.breite / 2 + 1.4} L ${g.tiefe / 2 - 3} 0 L ${g.tiefe / 2 - 7} ${g.breite / 2 - 1.4} Q ${-g.tiefe / 2 + 6} ${g.breite / 2 - 1.2}, ${-g.tiefe / 2 + 3} 0 Z"/>` : ''}
        <text class="lp-nr" x="${(-g.tiefe / 2 - 4.5).toFixed(1)}" y="1.6" transform="rotate(-90 ${(-g.tiefe / 2 - 4.5).toFixed(1)} 0)" text-anchor="middle">${p.nr}</text>
      </g>`;
    }).join('');

    const laengs = LAENGS.map((l) => {
      const p = lpById.get(l.nr);
      const status = winter ? 'leer' : Q.statusWasser(p, opts.saison, opts.datum);
      const mark = opts.markiere === p.id ? ' markiert' : '';
      return `<g class="lp laengs st-${status}${mark}" data-platz="${p.id}" transform="translate(${l.x} ${l.y}) rotate(${l.rot})" tabindex="0" role="button" aria-label="Längsseits ${p.nr}: ${STATUS_TEXT[status] || status}">${winter ? '' : info(p, status)}
        <rect x="${-l.w / 2}" y="-5" width="${l.w}" height="10" rx="2"/>
        ${['belegt', 'gast', 'saisongast'].includes(status) ? `<path class="rumpf" d="M${-l.w / 2 + 2} 0 Q ${-l.w / 2 + 5} -4, ${l.w / 2 - 6} -3.6 L ${l.w / 2 - 2} 0 L ${l.w / 2 - 6} 3.6 Q ${-l.w / 2 + 5} 4, ${-l.w / 2 + 2} 0 Z"/>` : ''}
        <text class="lp-nr" x="0" y="-7.5" text-anchor="middle">${p.nr}</text></g>`;
    }).join('');

    const per = winter ? 'winter' : 'sommer';
    const land = LAND.map((g) => {
      const status = Q.statusLand(Q.platz(g.id), opts.saison, per);
      const mark = opts.markiere === g.id ? ' markiert' : '';
      return `<g class="land st-${status}${mark}" data-platz="${g.id}" tabindex="0" role="button" aria-label="${g.id}: ${status}">
        <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="1.5"/><text class="lp-nr" x="${g.x + g.w / 2}" y="${g.y + g.h / 2 + 2}" text-anchor="middle">${g.id}</text></g>`;
    }).join('');

    const vb = ANSICHTEN[opts.ansicht || 'gesamt'];
    el.innerHTML = `<svg class="hafenplan${(vb[2] < 600) ? ' nah' : ''}" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hafenplan des SSV">${svgGrund()}${land}${wasserPlaetze}${laengs}</svg>`;
    const svg = el.firstChild;
    const klick = (e) => { const g = e.target.closest('[data-platz]'); if (g && opts.onKlick) opts.onKlick(g.dataset.platz); };
    svg.addEventListener('click', klick);
    svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klick(e); } });
    return svg;
  }

  // Sanft zu einer Ansicht zoomen
  function zoomen(svg, ziel, dauer = 450) {
    const start = svg.getAttribute('viewBox').split(' ').map(Number);
    const ende = ANSICHTEN[ziel] || ziel;
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

  window.HAFEN_PLAN = { zeichnen, zoomen, ANSICHTEN, STATUS_TEXT, BRUECKEN };
})();
