/* ============================================================
   LET'S DRIVE KIEL — Script (Vanilla, keine Libraries)
   Jedes Modul läuft gekapselt: ein Fehler stoppt nie die Reveals.
   ============================================================ */
(() => {
  'use strict';
  const d = document;
  d.documentElement.classList.add('js');
  const prm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, c) => Array.from((c || d).querySelectorAll(s));
  const run = fn => { try { fn(); } catch (e) { console.error(e); } };
  const header = d.querySelector('[data-header],.site-header');
  const raf = f => requestAnimationFrame(f), ga = (el, n) => el.getAttribute(n);

  /* ---- Reveals: ein Observer für alles ---- */
  const reveal = el => { el.classList.add('is-in'); if (el.hasAttribute('data-count')) countUp(el); };
  run(() => {
    const els = $$('.rv,.rv-img,[data-line],[data-draw],[data-count]');
    els.forEach(el => {
      if (el.hasAttribute('data-draw') && el.getTotalLength) el.style.setProperty('--len', Math.ceil(el.getTotalLength() + 2));
      if (el.hasAttribute('data-count') && !prm) setCount(el, 0);
    });
    if (!('IntersectionObserver' in window)) return els.forEach(reveal);
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      /* sehr hohe Elemente: schon beim Eintritt zeigen */
      if (en.intersectionRatio < 0.15 && en.boundingClientRect.height < innerHeight) return;
      reveal(en.target);
      io.unobserve(en.target);
    }), { threshold: [0, 0.15], rootMargin: '0px 0px -4% 0px' });
    els.forEach(el => io.observe(el));
  });

  /* ---- Zähler (nur echte Zahlen, deutsches Format) ---- */
  function setCount(el, v) {
    if (el.__tpl == null) el.__tpl = el.textContent;
    const dec = (ga(el, 'data-count').split('.')[1] || '').length;
    const txt = v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    el.textContent = /\d/.test(el.__tpl) ? el.__tpl.replace(/\d+([.,]\d+)?/, txt) : txt;
  }
  function countUp(el) {
    const raw = ga(el, 'data-count'), target = parseFloat(raw) || 0, dec = raw.includes('.');
    if (prm || !target) return setCount(el, target);
    let t0 = null;
    const tick = t => {
      if (t0 === null) t0 = t;
      const p = Math.min((t - t0) / 1400, 1), v = target * (1 - Math.pow(1 - p, 3));
      setCount(el, dec ? v : Math.round(v));
      if (p < 1) raf(tick);
    };
    raf(tick);
  }

  /* ---- Header: kompakt nach 24 px ---- */
  run(() => {
    if (!header) return;
    let ticking = false;
    const update = () => { ticking = false; header.classList.toggle('is-scrolled', scrollY > 24); };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
    update();
  });

  /* ---- Mobile-Navigation (Fokus-Falle, ESC, Scroll-Lock) ---- */
  run(() => {
    const toggle = d.querySelector('.menu-toggle');
    const panel = toggle && d.getElementById(ga(toggle, 'aria-controls') || 'mobile-nav');
    if (!toggle || !panel) return;
    let open = false, timer;
    $$('li', panel).forEach((li, i) => li.style.setProperty('--i', i));
    const focusables = () => $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', header)
      .filter(el => el.getClientRects().length && !el.closest('[hidden]'));
    const set = (on, restore) => {
      if (on === open) return;
      open = on;
      clearTimeout(timer);
      toggle.setAttribute('aria-expanded', on);
      toggle.setAttribute('aria-label', on ? 'Menü schließen' : 'Menü öffnen');
      d.body.classList.toggle('nav-open', on);
      if (on) {
        panel.hidden = false;
        panel.getBoundingClientRect(); /* Reflow → Übergang läuft */
        panel.classList.add('is-open');
        const first = panel.querySelector('a[href],button');
        if (first) first.focus({ preventScroll: true });
      } else {
        panel.classList.remove('is-open');
        timer = setTimeout(() => { if (!open) panel.hidden = true; }, prm ? 0 : 450);
        if (restore) toggle.focus();
      }
    };
    toggle.addEventListener('click', () => set(!open));
    panel.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    d.addEventListener('keydown', e => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); return set(false, true); }
      if (e.key !== 'Tab') return;
      const f = focusables(), a = d.activeElement, out = !header.contains(a);
      if (!f.length) return;
      if (e.shiftKey && (a === f[0] || out)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (a === f[f.length - 1] || out)) { e.preventDefault(); f[0].focus(); }
    });
    matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) set(false); });
  });

  /* ---- Hero-Bild: sanfter Zoom nach dem Laden ---- */
  run(() => $$('.hero-media img').forEach(img => {
    const done = () => raf(() => raf(() => img.classList.add('is-loaded')));
    img.complete ? done() : ['load', 'error'].forEach(ev => img.addEventListener(ev, done, { once: true }));
  }));

  /* ---- Klassen-Filter (Tabs) + Deep-Link #klasse-… ---- */
  run(() => {
    const tabs = d.querySelector('.tabs');
    const btns = tabs ? $$('[data-filter]', tabs) : [], items = $$('.class-detail[data-group]');
    if (!btns.length || !items.length) return;
    const groups = el => (ga(el, 'data-group') || '').split(/\s+/);
    const select = (f, focus) => {
      btns.forEach(b => {
        const on = ga(b, 'data-filter') === f;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      items.forEach(it => {
        const show = f === 'alle' || groups(it).includes(f);
        if (show && it.hidden) {
          it.hidden = false;
          if (!prm) { it.classList.remove('is-shown'); void it.offsetWidth; it.classList.add('is-shown'); }
        } else if (!show) it.hidden = true;
      });
    };
    btns.forEach(b => b.addEventListener('click', () => select(ga(b, 'data-filter'))));
    tabs.addEventListener('keydown', e => {
      const i = btns.indexOf(d.activeElement);
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: btns.length - 1 }[e.key];
      if (i < 0 || n === undefined) return;
      e.preventDefault();
      select(ga(btns[(n + btns.length) % btns.length], 'data-filter'), true);
    });
    select(ga(btns.find(b => ga(b, 'aria-selected') === 'true') || btns[0], 'data-filter'));
    const fromHash = instant => {
      const t = location.hash.length > 1 && d.getElementById(decodeURIComponent(location.hash.slice(1)));
      const cd = t && t.closest('.class-detail[data-group]');
      if (!cd) return;
      select(groups(cd)[0]);
      raf(() => t.scrollIntoView({ block: 'start', behavior: instant || prm ? 'instant' : 'smooth' }));
    };
    fromHash(true);
    addEventListener('load', () => { if (scrollY < 40 || location.hash) fromHash(true); }, { once: true });
    addEventListener('hashchange', () => fromHash(false));
  });

  /* ---- Bürozeiten: heute + „Jetzt geöffnet" (Europe/Berlin) ---- */
  run(() => {
    const lists = $$('dl.hours'), badges = $$('[data-open-badge]');
    if (!lists.length) return;
    const toMin = s => { const m = /(\d{1,2})[:.](\d{2})/.exec(s || ''); return m ? m[1] * 60 + +m[2] : null; };
    const pad = n => String(n).padStart(2, '0'), fmt = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60) + ' Uhr';
    const parseRow = row => {
      const ranges = [], dt = row.querySelector('dt'), dd = row.querySelector('dd'), attr = ga(row, 'data-days');
      /* data-days="1,3,5" (getDay); Fallback: Kürzel im dt („Mo, Mi, Fr") */
      const days = attr ? attr.split(/[\s,]+/).filter(Boolean).map(Number)
        : ((dt && dt.textContent.match(/\b(mo|di|mi|do|fr|sa|so)/gi)) || []).map(k => 'somodimidofrsa'.indexOf(k.toLowerCase()) / 2);
      const from = toMin(ga(row, 'data-from')), to = toMin(ga(row, 'data-to'));
      if (from !== null && to !== null) ranges.push([from, to]);
      else { /* Fallback: „12:00 – 16:00" im dd */
        const t = ((dd && dd.textContent.match(/\d{1,2}[:.]\d{2}/g)) || []).map(toMin);
        if (t.length > 1) ranges.push([t[0], t[1]]);
      }
      return { days, ranges };
    };
    const now = () => {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = t => (parts.find(p => p.type === t) || {}).value;
      return { day: 'SunMonTueWedThuFriSat'.indexOf(get('weekday')) / 3, min: (get('hour') % 24) * 60 + +get('minute') };
    };
    const update = () => {
      const n = now();
      let todays = [], state = 'closed', text = 'Heute geschlossen';
      lists.forEach((dl, li) => $$(':scope > div', dl).forEach(row => {
        const p = parseRow(row), today = p.days.includes(n.day);
        row.classList.toggle('is-today', today);
        today ? row.setAttribute('aria-current', 'date') : row.removeAttribute('aria-current');
        if (today && li === 0) todays = todays.concat(p.ranges);
      }));
      todays.sort((a, b) => a[0] - b[0]);
      for (const [o, c] of todays) {
        if (n.min >= o && n.min < c) { state = 'open'; text = 'Jetzt geöffnet · bis ' + fmt(c); break; }
        if (n.min < o) { state = 'later'; text = 'Heute geöffnet ab ' + fmt(o); break; }
      }
      badges.forEach(b => { if (b.textContent !== text) b.textContent = text; b.setAttribute('data-state', state); });
    };
    update();
    setInterval(update, 60000);
  });

  /* ---- Kontaktformular: Prüfung + vorbereitete E-Mail ---- */
  run(() => $$('form.form').forEach(form => {
    form.noValidate = true;
    let ok = form.querySelector('.form-success');
    if (!ok) { ok = d.createElement('div'); ok.className = 'form-success'; form.appendChild(ok); }
    const tpl = ok.innerHTML.trim() || '<p>Dein E-Mail-Programm öffnet sich mit deiner Nachricht.</p>';
    ok.innerHTML = ''; ok.hidden = false;
    ok.setAttribute('role', 'status'); ok.setAttribute('aria-live', 'polite');
    const fields = () => Array.from(form.elements).filter(el => el.name && !el.disabled && el.type !== 'submit');
    const labelOf = el => {
      const l = el.id && form.querySelector('label[for="' + el.id + '"]');
      return (l ? l.textContent : ga(el, 'aria-label') || el.name).replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    };
    const valid = el => {
      const v = (el.value || '').trim();
      if (el.type === 'checkbox') return !el.required || el.checked;
      if (el.required && !v) return false;
      return !(el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
    };
    const message = el => ga(el, 'data-error') ||
      (el.type === 'checkbox' ? 'Bitte bestätige deine Einwilligung.'
        : el.type === 'email' && el.value.trim() ? 'Bitte gib eine gültige E-Mail-Adresse an.' : 'Bitte fülle dieses Feld aus.');
    const mark = (el, good) => {
      const wrap = el.closest('.field,.field-check,.check') || el.parentNode;
      const id = (el.id || el.name) + '-err';
      const desc = (ga(el, 'aria-describedby') || '').split(/\s+/).filter(x => x && x !== id);
      let err = d.getElementById(id);
      wrap.classList.toggle('is-invalid', !good);
      if (good) { el.removeAttribute('aria-invalid'); if (err) err.remove(); }
      else {
        el.setAttribute('aria-invalid', 'true');
        if (!err) { err = d.createElement('span'); err.className = 'field-error'; err.id = id; wrap.appendChild(err); }
        err.textContent = message(el);
        desc.push(id);
      }
      desc.length ? el.setAttribute('aria-describedby', desc.join(' ')) : el.removeAttribute('aria-describedby');
      return good;
    };
    const recheck = e => { if (e.target.name && e.target.closest('.is-invalid')) mark(e.target, valid(e.target)); };
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const list = fields();
      let bad = null;
      list.forEach(el => { if (!mark(el, valid(el)) && !bad) bad = el; });
      if (bad) { ok.innerHTML = ''; return bad.focus(); }
      const lines = [];
      let name = '', subject = 'Anfrage über die Website';
      list.forEach(el => {
        if (el.type === 'checkbox') return;
        const v = el.tagName === 'SELECT' ? (el.value ? el.options[el.selectedIndex].text : '') : el.value.trim();
        if (!v) return;
        if (el.name === 'name') name = v;
        lines.push(el.tagName === 'TEXTAREA' ? '\n' + labelOf(el) + ':\n' + v + '\n' : labelOf(el) + ': ' + v);
      });
      if (name) subject += ' – ' + name;
      const to = ga(form, 'data-mailto') || 'info@lets-drive-kiel.de';
      ok.innerHTML = tpl;
      location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }));

  /* ---- Karte: erst nach Klick laden (2-Klick-Lösung, nichts gespeichert) ---- */
  run(() => d.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('[data-map-load]'), box = btn && btn.closest('.map-consent');
    if (!box) return;
    const f = d.createElement('iframe');
    f.className = 'map-frame';
    f.src = ga(box, 'data-map-src') || 'https://www.google.com/maps?q=Knooper+Weg+193,+24118+Kiel&output=embed';
    f.title = 'Google Maps: Fahrschule Let’s Drive Kiel, Knooper Weg 193, 24118 Kiel';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.setAttribute('allowfullscreen', '');
    box.replaceWith(f);
    f.focus();
  }));

  /* ---- Jahr im Footer ---- */
  run(() => $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); }));
})();
