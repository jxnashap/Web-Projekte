/* SSV · „Als PDF sichern“ – macht aus den Druckblättern eine echte PDF-Datei.
 * Am iPad/Handy öffnet sich danach „Teilen“ (dort „In Dateien sichern“), am PC wird die Datei heruntergeladen.
 * Jedes Blatt (.blatt / .r-blatt / eigene Elemente) wird als Bild gerendert (html2canvas) und in eine PDF
 * im passenden Format gelegt (jsPDF): A4 hoch, A4 quer („quer“) oder A6 quer („klein“). Längere Blätter
 * werden auf mehrere Seiten verteilt – geschnitten wird nur zwischen Zeilen, Absätzen und Überschriften.
 * Bibliotheken: js/vendor/ (MIT, siehe LIZENZEN.txt), werden erst beim ersten Klick geladen. */
(function () {
  'use strict';
  const BASIS = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/pdf\.js(\?.*)?$/, '') : 'js/'; })();
  const laden = (src) => new Promise((ok, nein) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => nein(new Error('PDF-Baustein fehlt (' + src + ')')); document.head.appendChild(s); });
  let bereit = null;
  const bausteine = () => bereit || (bereit = Promise.all([window.html2canvas ? 0 : laden(BASIS + 'vendor/html2canvas.min.js'), window.jspdf ? 0 : laden(BASIS + 'vendor/jspdf.umd.min.js')])
    .catch((e) => { bereit = null; throw e; }));

  const format = (el, opt) => {
    const quer = opt.quer != null ? opt.quer : el.classList.contains('quer');
    if (el.classList.contains('klein')) return { w: 148, h: 105, o: 'landscape', f: 'a6' };
    if (opt.papier === 'A3') return quer ? { w: 420, h: 297, o: 'landscape', f: 'a3' } : { w: 297, h: 420, o: 'portrait', f: 'a3' };
    return quer ? { w: 297, h: 210, o: 'landscape', f: 'a4' } : { w: 210, h: 297, o: 'portrait', f: 'a4' };
  };

  // Stellen, an denen eine neue Seite beginnen darf (Unterkanten von Zeilen, Absätzen, Überschriften …)
  function schnittstellen(el) {
    const oben = el.getBoundingClientRect().top; const s = new Set();
    el.querySelectorAll('tr, li, p, h1, h2, h3, h4, dl, table, figure, img, svg, .b-gruppe, .r-fuss, .pd-zwei > *, section > *, div.zeile, .karte, .kachel').forEach((x) => {
      const r = x.getBoundingClientRect(); if (r.height) s.add(Math.round(r.bottom - oben));
    });
    [...el.children].forEach((x) => { const r = x.getBoundingClientRect(); if (r.height) s.add(Math.round(r.bottom - oben)); });
    return [...s].sort((a, b) => a - b);
  }

  // Im geklonten Dokument: <use href="#symbol"> durch den Inhalt ersetzen (html2canvas löst Verweise in SVGs nicht auf)
  function svgEinsetzen(doc) {
    doc.querySelectorAll('svg use').forEach((u) => {
      const ref = (u.getAttribute('href') || u.getAttribute('xlink:href') || ''); if (!ref.startsWith('#')) return;
      const sym = doc.getElementById(ref.slice(1)); const svg = u.closest('svg'); if (!sym || !svg) return;
      if (!svg.getAttribute('viewBox') && sym.getAttribute('viewBox')) svg.setAttribute('viewBox', sym.getAttribute('viewBox'));
      const ns = 'http://www.w3.org/2000/svg'; const g = doc.createElementNS(ns, 'g');
      [...sym.childNodes].forEach((c) => g.appendChild(c.cloneNode(true)));
      // benutzte Ausschnitte (clip-path) mitnehmen
      const defs = doc.createElementNS(ns, 'defs');
      g.querySelectorAll('[clip-path]').forEach((c) => { const id = (c.getAttribute('clip-path').match(/#([^)]+)/) || [])[1]; const cp = id && doc.getElementById(id); if (cp && !svg.querySelector('#' + id)) defs.appendChild(cp.cloneNode(true)); });
      if (defs.childNodes.length) svg.insertBefore(defs, svg.firstChild);
      u.replaceWith(g);
    });
  }

  let anzeige = null;
  function zeigen(text) {
    if (!anzeige) { anzeige = document.createElement('div'); anzeige.className = 'pdf-warten'; anzeige.setAttribute('role', 'status');
      anzeige.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(14,27,69,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:16px/1.4 system-ui,sans-serif';
      document.body.appendChild(anzeige); }
    anzeige.innerHTML = '<div style="background:#fff;color:#0e1b45;border-radius:16px;padding:20px 22px;max-width:360px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25);text-align:center">' + text + '</div>';
    return anzeige;
  }
  function schliessen() { if (anzeige) { anzeige.remove(); anzeige = null; } }

  async function rendern(blaetter, opt) {
    await bausteine();
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* egal */ } }
    const { jsPDF } = window.jspdf; let pdf = null; let seiten = 0;
    document.body.classList.add('pdf-erzeugen');
    try {
      for (let i = 0; i < blaetter.length; i++) {
        const el = blaetter[i]; const f = format(el, opt);
        zeigen('PDF wird erstellt …<br><small>Blatt ' + (i + 1) + ' von ' + blaetter.length + '</small>');
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
        const breite = el.offsetWidth; const hoehe = el.scrollHeight; const pxMm = breite / f.w;
        // Auflösung: scharf genug zum Drucken, aber innerhalb der Grenzen von Safari (Fläche ≤ ~16 Mio. Pixel)
        const scale = Math.max(1, Math.min(2, Math.sqrt(15e6 / (breite * hoehe))));
        const cv = await window.html2canvas(el, { scale, backgroundColor: '#ffffff', logging: false, useCORS: true,
          windowWidth: Math.max(document.documentElement.clientWidth, breite + 40), onclone: (doc) => svgEinsetzen(doc) });
        const seiteH = breite * f.h / f.w; const rand = pxMm * 12;
        // Kleine Blätter (Quittung) und „passend“: immer genau eine Seite – notfalls etwas verkleinert
        if (el.classList.contains('klein') || el.classList.contains('pdf-eine-seite') || opt.passend) {
          if (!pdf) pdf = new jsPDF({ orientation: f.o, unit: 'mm', format: f.f, compress: true }); else pdf.addPage(f.f, f.o);
          const k = Math.min(1, seiteH / hoehe); const w = f.w * k, h = hoehe / pxMm * k;
          pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', (f.w - w) / 2, 0, w, h, undefined, 'FAST'); seiten++; continue;
        }
        const stellen = hoehe > seiteH * 1.01 ? schnittstellen(el) : [];
        let y = 0; let erste = true;
        while (y < hoehe - 2) {
          const platz = erste ? seiteH : seiteH - 2 * rand;
          let bis = Math.min(hoehe, y + platz);
          if (bis < hoehe) { const s = stellen.filter((z) => z > y + platz * 0.5 && z <= y + platz); if (s.length) bis = s[s.length - 1]; }
          const teil = document.createElement('canvas'); teil.width = cv.width; teil.height = Math.max(1, Math.round((bis - y) * scale));
          const c = teil.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, teil.width, teil.height);
          c.drawImage(cv, 0, Math.round(y * scale), cv.width, teil.height, 0, 0, teil.width, teil.height);
          if (!pdf) pdf = new jsPDF({ orientation: f.o, unit: 'mm', format: f.f, compress: true }); else pdf.addPage(f.f, f.o);
          const oben = erste ? 0 : 12;
          pdf.addImage(teil.toDataURL('image/jpeg', 0.9), 'JPEG', 0, oben, f.w, (bis - y) / pxMm, undefined, 'FAST');
          seiten++; y = bis; erste = false;
        }
      }
    } finally { document.body.classList.remove('pdf-erzeugen'); }
    if (opt.titel) pdf.setProperties({ title: opt.titel, author: 'Schwartauer Segler-Verein e.V.', creator: 'SSV Hafen-Manager' });
    return { blob: pdf.output('blob'), seiten };
  }

  async function ausgeben(blob, name) {
    const datei = typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null;
    const mobil = matchMedia('(pointer: coarse)').matches;
    const teilen = async () => { await navigator.share({ files: [datei], title: name }); };
    const laden = () => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 120000); };
    if (mobil && datei && navigator.canShare && navigator.canShare({ files: [datei] })) {
      try { await teilen(); schliessen(); return; } catch (e) { if (e && e.name === 'AbortError') { schliessen(); return; } }
      // Teilen braucht einen frischen Fingertipp (iPad): kurz nachfragen
      const box = zeigen('<strong style="font-size:18px">PDF ist fertig</strong><p style="margin:8px 0 14px">' + name.replace(/[<>&]/g, '') + '</p>' +
        '<button type="button" data-pdf="teilen" style="width:100%;min-height:46px;border:0;border-radius:12px;background:#b8202b;color:#fff;font:inherit;font-weight:700;margin-bottom:8px">In Dateien sichern / Teilen</button>' +
        '<button type="button" data-pdf="laden" style="width:100%;min-height:44px;border:1px solid #c9cddb;border-radius:12px;background:#fff;color:#0e1b45;font:inherit;font-weight:600;margin-bottom:8px">Herunterladen</button>' +
        '<button type="button" data-pdf="zu" style="width:100%;min-height:40px;border:0;background:none;color:#5a6178;font:inherit">Schließen</button>');
      box.onclick = async (e) => { const k = e.target.closest('[data-pdf]'); if (!k) return;
        if (k.dataset.pdf === 'teilen') { try { await teilen(); } catch (x) { if (!x || x.name !== 'AbortError') laden(); } schliessen(); }
        else if (k.dataset.pdf === 'laden') { laden(); schliessen(); } else schliessen(); };
      return;
    }
    laden(); schliessen();
  }

  const dateiname = (t) => (String(t || 'SSV-Dokument').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/[„“"]/g, '').replace(/\s*·\s*/g, ' ').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'SSV-Dokument') + '.pdf';

  /* Öffentlich:
     SSV_PDF.sichern(blaetter, { titel, quer, papier })  – Blätter (Elemente) als PDF sichern
     SSV_PDF.knopf(text?)                                  – Knopf-HTML für Leisten
     SSV_PDF.ausAnsicht(inhaltEl, { titel, kopfHtml, quer }) – eine Bildschirm-Ansicht als druckfertiges Blatt (ohne Knöpfe) sichern */
  async function sichern(blaetter, opt = {}) {
    blaetter = [...(blaetter || [])].filter((x) => x && x.offsetWidth);
    if (!blaetter.length) { alert('Es gibt hier nichts zum Sichern.'); return; }
    zeigen('PDF wird erstellt …');
    try { const r = await rendern(blaetter, opt); await ausgeben(r.blob, dateiname(opt.titel || document.title)); }
    catch (e) { schliessen(); alert('Das PDF konnte nicht erstellt werden: ' + (e && e.message ? e.message : e) + '\nBitte „Drucken“ nehmen und dort als PDF sichern.'); }
  }
  async function ausAnsicht(inhalt, opt = {}) {
    const blatt = document.createElement('div'); blatt.className = 'pdf-ansicht-blatt' + (opt.quer ? ' quer' : '');
    blatt.style.cssText = 'position:absolute;left:-10000px;top:0;width:' + (opt.quer ? 297 : 210) + 'mm;background:#fff;color:#111;padding:14mm 14mm 16mm 18mm;box-sizing:border-box;font-size:10pt;line-height:1.45';
    blatt.innerHTML = (opt.kopfHtml || '') + ((opt.ueberschrift || opt.titel) ? '<h1 style="font-size:16pt;margin:4mm 0 5mm;color:#0e1b45">' + String(opt.ueberschrift || opt.titel).replace(/[<>&]/g, '') + '</h1>' : '');
    const kopie = inhalt.cloneNode(true);
    kopie.querySelectorAll('.kopf, .demo-band, .druck-kopf, button, .btn, select, input, textarea, .kein-druck, .reiter-liste, .fin-leiste, .zm, .zm-liste, .filter, nav, .seiten-kopf .aktionen, details > summary::marker').forEach((x) => x.remove());
    kopie.querySelectorAll('details.erklaer, .hinweis').forEach((x) => x.remove());   // Erklärtexte gehören nicht aufs Blatt
    kopie.querySelectorAll('details').forEach((x) => { x.open = true; });
    kopie.querySelectorAll('[hidden]').forEach((x) => x.remove());
    blatt.appendChild(kopie); document.body.appendChild(blatt);
    try { await sichern([blatt], opt); } finally { blatt.remove(); }
  }
  const knopf = (text) => '<button type="button" class="btn pdf-sichern" data-pdf-sichern>' + (text || 'Als PDF sichern') + '</button>';

  // CSS: beim Rendern keine Verkleinerung/Schatten (Handy-Ansicht der Druckseiten)
  const st = document.createElement('style');
  st.textContent = '.pdf-erzeugen .blatt, .pdf-erzeugen .r-blatt { zoom: 1 !important; transform: none !important; box-shadow: none !important; }' +
    '.pdf-ansicht-blatt table { width: 100% !important; border-collapse: collapse; font-size: 9pt; table-layout: auto; } .pdf-ansicht-blatt th, .pdf-ansicht-blatt td { border-bottom: 1px solid #ddd; padding: 1.6mm 1.2mm; text-align: left; white-space: normal !important; } .pdf-ansicht-blatt .r { text-align: right; }' +
    '.pdf-ansicht-blatt .panel, .pdf-ansicht-blatt .kz, .pdf-ansicht-blatt .karte { box-shadow: none !important; border: 0 !important; padding: 0 !important; margin: 0 0 6mm !important; background: none !important; max-width: none !important; }' +
    '.pdf-ansicht-blatt .panel h2 { font-size: 12pt; margin: 0 0 2mm; } .pdf-ansicht-blatt * { overflow: visible !important; } .pdf-ansicht-blatt .tab-rahmen, .pdf-ansicht-blatt .tab-wrap { overflow: visible !important; }' +
    '.pdf-ansicht-blatt .druck-kopf, .plan-druckseite.pdf-modus .druck-kopf { display: flex !important; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0e1b45; padding-bottom: 4mm; margin-bottom: 6mm; }' +
    '.pdf-ansicht-blatt .druck-kopf .stander, .plan-druckseite.pdf-modus .druck-kopf .stander { width: 26mm; height: 13mm; } .pdf-ansicht-blatt .druck-kopf div, .plan-druckseite.pdf-modus .druck-kopf div { text-align: right; font-size: 9pt; color: #444; }' +
    '.pdf-ansicht-blatt .druck-kopf strong, .plan-druckseite.pdf-modus .druck-kopf strong { display: block; font-size: 13pt; color: #0e1b45; }';
  document.head.appendChild(st);

  window.SSV_PDF = { sichern, ausAnsicht, knopf, dateiname };
})();
