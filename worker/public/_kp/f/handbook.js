// The handbook's flipbook (src/portal/family.js handbookPage; the owner's buyer-guide
// book, 2026-11-21). The server writes every page as an <article class="page">; this
// takes them out of the page and shows them as a book: two pages side by side on a
// computer, one on a phone, turned with the arrows, a swipe or the keyboard, with a
// Contents list. Only the pages in view are in the document: two slots (one on a phone)
// and one turning face. A turn is two flat half-turns (out to the spine, then in from
// it), so nothing relies on backface hiding or 3D stacking.
//
// It runs before the page is read (no defer) only to mark <html> with .hb-js, so the
// stacked pages never flash; the rest waits for the page. Without it, or in a browser
// without the Web Animations API, the cover and pages simply stack and scroll.
(() => {
  if (!('animate' in Element.prototype)) return;
  const root = document.documentElement;
  root.classList.add('hb-js');

  document.addEventListener('DOMContentLoaded', () => {
    const book = document.getElementById('hb-book');
    const stage = document.getElementById('hb-stage');
    const cover = document.getElementById('hb-cover');
    const reader = document.getElementById('hb-reader');
    const boop = document.getElementById('boop');
    const tocDlg = document.getElementById('hb-tocdlg');
    if (!book || !stage || !cover || !reader) { root.classList.remove('hb-js'); return; }

    const PAGES = [...book.querySelectorAll('article.page')].map((a) => {
      const id = a.id;
      a.removeAttribute('id');
      return { id, html: a.outerHTML };
    });
    const N = PAGES.length;
    book.textContent = '';

    let mode = null; let k = 0; let curPage = 0; let busy = false; let pending = null;
    let slotL; let slotR; let flipR; let flipL;
    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const L = () => (mode === 'spread' ? Math.ceil(N / 2) : N - 1);
    const leftOf = (kk) => (mode === 'spread' ? 2 * kk - 1 : -1);
    const rightOf = (kk) => (mode === 'spread' ? 2 * kk : kk);

    function layout() {
      const r = stage.getBoundingClientRect();
      const wide = r.width >= 860; const ratio = 0.74;
      let ph = Math.min(r.height - 4, 900); let pw = ph * ratio;
      const maxW = wide ? (r.width - 8) / 2 : r.width;
      if (wide) { if (pw > maxW) { pw = maxW; ph = pw / ratio; } } else { pw = Math.min(maxW, ph * 0.82); ph = Math.min(ph, pw / 0.52); }
      pw = Math.floor(pw); ph = Math.floor(ph);
      book.style.width = `${wide ? pw * 2 : pw}px`;
      book.style.height = `${ph}px`;
      book.style.setProperty('--fs', `${Math.max(12.5, Math.min(16, pw / 27))}px`);
      const m = wide ? 'spread' : 'single';
      if (m !== mode) { mode = m; build(); }
    }
    function mk(cls) { const d = document.createElement('div'); d.className = cls; book.appendChild(d); return d; }
    function build() {
      book.className = `book ${mode}`;
      book.textContent = '';
      if (mode === 'spread') { slotL = mk('slot l'); slotR = mk('slot r'); flipL = mk('flip l'); flipR = mk('flip r'); } else { slotL = null; slotR = mk('slot'); flipR = mk('flip'); flipL = flipR; }
      flipR.hidden = true; flipL.hidden = true;
      k = mode === 'spread' ? Math.ceil(curPage / 2) : curPage;
      render();
    }
    function fill(el, i) {
      if (!el) return;
      if (i < 0 || i >= N) { el.hidden = true; el.dataset.i = ''; el.textContent = ''; return; }
      el.hidden = false;
      if (el.dataset.i !== String(i)) {
        el.dataset.i = String(i);
        el.innerHTML = `${PAGES[i].html}<div class="shade"></div>`;
      }
    }
    function shift() {
      book.style.transform = mode === 'spread' ? `translateX(${k === 0 ? '-25%' : (k === L() && rightOf(k) >= N ? '25%' : '0')})` : 'none';
    }
    function render() {
      fill(slotL, leftOf(k)); fill(slotR, rightOf(k));
      flipR.hidden = true; flipL.hidden = true;
      shift(); updateUI();
    }
    function half(el, from, to, shadeFrom, shadeTo, ms, easing) {
      el.hidden = false;
      const sh = el.querySelector('.shade');
      const a = el.animate([{ transform: `perspective(1600px) rotateY(${from}deg)` }, { transform: `perspective(1600px) rotateY(${to}deg)` }], { duration: ms, easing, fill: 'forwards' });
      if (sh) sh.animate([{ opacity: shadeFrom }, { opacity: shadeTo }], { duration: ms, easing, fill: 'forwards' });
      return a.finished;
    }
    async function turnTo(target) {
      const t = Math.max(0, Math.min(L(), target));
      if (busy) { pending = t; return; }
      if (t === k) return;
      const fwd = t > k; const ok = k;
      k = t; curPage = Math.max(0, mode === 'spread' ? 2 * k - 1 : k);
      updateUI();
      if (reduce()) { render(); return; }
      busy = true;
      const ms = pending !== null ? 170 : 300;
      try {
        if (mode === 'single') {
          if (fwd) { fill(flipR, ok); fill(slotR, k); await half(flipR, 0, -92, 0, 0.35, ms * 1.4, 'cubic-bezier(.5,0,.75,.4)'); } else { fill(flipR, k); await half(flipR, -92, 0, 0.35, 0, ms * 1.4, 'cubic-bezier(.25,.6,.5,1)'); fill(slotR, k); }
        } else if (fwd) {
          fill(slotR, rightOf(k)); fill(flipR, rightOf(ok)); shift();
          await half(flipR, 0, -90, 0, 0.3, ms, 'cubic-bezier(.45,0,.9,.6)');
          flipR.hidden = true; fill(flipL, leftOf(k));
          await half(flipL, 90, 0, 0.3, 0, ms, 'cubic-bezier(.1,.4,.55,1)');
          fill(slotL, leftOf(k));
        } else {
          fill(slotL, leftOf(k)); fill(flipL, leftOf(ok)); shift();
          await half(flipL, 0, 90, 0, 0.3, ms, 'cubic-bezier(.45,0,.9,.6)');
          flipL.hidden = true; fill(flipR, rightOf(k));
          await half(flipR, -90, 0, 0.3, 0, ms, 'cubic-bezier(.1,.4,.55,1)');
          fill(slotR, rightOf(k));
        }
      } finally {
        for (const f of [flipR, flipL]) for (const a of f.getAnimations({ subtree: true })) a.cancel();
        busy = false; render();
        if (pending !== null) { const p = pending; pending = null; turnTo(p); }
      }
    }
    function updateUI() {
      const c = document.getElementById('hb-count');
      if (mode === 'spread') {
        const l = leftOf(k); const r = rightOf(k); const has = (i) => i >= 0 && i < N;
        c.textContent = has(l) && has(r) ? `${l + 1}–${r + 1} of ${N}` : `${(has(l) ? l : r) + 1} of ${N}`;
      } else c.textContent = `${k + 1} of ${N}`;
      document.getElementById('hb-prev').disabled = k === 0;
      document.getElementById('hb-next').disabled = k >= L();
    }
    const next = () => turnTo((busy && pending !== null ? pending : k) + 1);
    const prev = () => turnTo((busy && pending !== null ? pending : k) - 1);
    function indexOf(id) { return PAGES.findIndex((p) => p.id === id); }
    function goToId(id) {
      const i = indexOf(id);
      if (i < 0) return;
      turnTo(mode === 'spread' ? Math.ceil(i / 2) : i);
    }

    // Opening and closing the book.
    function showReader(at = null) {
      cover.hidden = true; reader.hidden = false;
      if (at !== null) curPage = at;
      layout();
      if (at !== null) { k = mode === 'spread' ? Math.ceil(at / 2) : at; render(); }
      book.animate([{ opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1 }], { duration: reduce() ? 1 : 420, easing: 'ease-out' });
      document.getElementById('hb-next').focus({ preventScroll: true });
    }
    function showCover() { reader.hidden = true; cover.hidden = false; boop?.focus(); }
    function openBook(e) {
      e.preventDefault();
      boop.classList.remove('booped'); void boop.offsetWidth; boop.classList.add('booped');
      for (let i = 0; i < 6; i++) {
        const h = document.createElement('span');
        h.className = 'heart'; h.textContent = '♥';
        h.style.left = `${45 + Math.random() * 10}%`; h.style.top = '30%';
        h.style.setProperty('--dx', `${Math.random() * 140 - 70}px`);
        h.style.animationDelay = `${i * 70}ms`;
        boop.appendChild(h); setTimeout(() => h.remove(), 1500);
      }
      setTimeout(() => showReader(), reduce() ? 0 : 650);
    }

    boop?.addEventListener('click', openBook);
    document.getElementById('hb-home').addEventListener('click', (e) => { e.preventDefault(); showCover(); });
    document.getElementById('hb-next').addEventListener('click', next);
    document.getElementById('hb-prev').addEventListener('click', prev);
    document.getElementById('hb-toc').addEventListener('click', () => tocDlg?.showModal());
    addEventListener('keydown', (e) => {
      if (reader.hidden || document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); }
    });
    let sx = null; let sy = null; let swiped = false;
    book.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    book.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; const dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) { swiped = true; setTimeout(() => { swiped = false; }, 350); if (dx < 0) next(); else prev(); }
    });
    book.addEventListener('click', (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) { e.preventDefault(); if (tocDlg?.open) tocDlg.close(); if (reader.hidden) showReader(indexOf(g.dataset.go)); else goToId(g.dataset.go); return; }
      if (e.target.closest('[data-close]')) e.target.closest('dialog')?.close();
    });
    tocDlg?.addEventListener('click', (e) => { if (e.target === tocDlg) tocDlg.close(); });

    // Search, in the Contents dialog, as they type: every word in a page's chapter title
    // or its words (data-title, data-text), each hit with a few words around the first
    // found. The Contents page's own box (on a page of the book) opens the dialog.
    const box = document.getElementById('hq2');
    const all = tocDlg?.querySelector('.toc-all');
    const hits = tocDlg ? [...tocDlg.querySelectorAll('.hits li')] : [];
    const none = tocDlg?.querySelector('.nohits');
    const snippet = (text, words) => {
      const low = text.toLowerCase();
      const at = words.map((w) => low.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
      let from = Math.max(0, at - 60); let to = Math.min(text.length, at + 96);
      if (from) { const sp = text.indexOf(' ', from); from = sp >= 0 && sp < at ? sp + 1 : from; }
      if (to < text.length) { const sp = text.lastIndexOf(' ', to); to = sp > at ? sp : to; }
      return `${from ? '… ' : ''}${text.slice(from, to).trim()}${to < text.length ? ' …' : ''}`;
    };
    function search(q) {
      const words = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
      if (all) all.hidden = words.length > 0;
      tocDlg?.querySelector('.hits')?.toggleAttribute('hidden', !words.length);
      let n = 0;
      for (const li of hits) {
        const text = li.dataset.text ?? '';
        const ok = words.length > 0 && words.every((w) => `${li.dataset.title} ${text}`.toLowerCase().includes(w));
        li.hidden = !ok;
        if (ok) { n++; li.querySelector('.snip').textContent = snippet(text, words); }
      }
      if (none) none.hidden = !words.length || n > 0;
    }
    function openSearch(q = null) {
      if (!tocDlg || !box) return;
      if (q !== null) { box.value = q; search(q); }
      if (!tocDlg.open) tocDlg.showModal();
      box.focus();
    }
    box?.addEventListener('input', () => search(box.value));
    document.addEventListener('submit', (e) => {
      const f = e.target.closest('.hsearch');
      if (!f) return;
      e.preventDefault();
      const q = f.querySelector('input')?.value ?? '';
      if (f.closest('dialog')) search(q); else openSearch(q);
    });
    book.addEventListener('focusin', (e) => { if (e.target.matches('.hsearch input')) { const q = e.target.value; e.target.blur(); openSearch(q); } });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-clear]')) return;
      e.preventDefault();
      if (box) { box.value = ''; search(''); }
      goToId('contents');
    }, true);
    let rz;
    addEventListener('resize', () => {
      if (reader.hidden) return;
      clearTimeout(rz);
      rz = setTimeout(() => { const m = mode; layout(); if (m === mode && !busy) render(); }, 120);
    });

    // Read next on Home links to a chapter (#ch-…): open the book there; else the cover.
    // A search sent without the script (?q=): the book at its Contents, with the hits.
    const at = location.hash ? indexOf(decodeURIComponent(location.hash.slice(1))) : -1;
    if (new URLSearchParams(location.search).get('q')) showReader(indexOf('contents'));
    else if (at >= 0) showReader(at); else { reader.hidden = true; cover.hidden = false; }
  });
})();
