// KennelPort template "ak": what the pages do, ported from the AK sample. Every
// page works without it (links, expanders and lists are plain HTML); this adds
// the flips, sliding sets, menu, filters and the packages opening on wide screens.
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // Flip cards: tap to turn, again to turn back; Enter or Space from the keyboard.
  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button, summary')) return;
    const f = e.target.closest('.flip');
    if (f) f.classList.toggle('flipped');
  });
  document.addEventListener('keydown', (e) => {
    const f = e.target.closest?.('.flip');
    if (f && e.target === f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); f.classList.toggle('flipped'); }
  });

  // Sliding sets: snap track, arrows and "2 / 5".
  for (const s of $$('[data-slider]')) {
    const track = $('.track', s); const prev = $('.prev', s); const next = $('.next', s); const count = $('.count', s); const arrows = $('.arrows', s);
    if (!track || !prev || !next) continue;
    const step = () => { const c = track.children[0]; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20) : 300; };
    const update = () => {
      const n = track.children.length; if (!n) return;
      const w = step(); const visible = Math.max(1, Math.round(track.clientWidth / w));
      const first = Math.round(track.scrollLeft / w) + 1;
      const max = track.scrollWidth - track.clientWidth - 2;
      if (count) count.textContent = n > visible ? `${Math.min(first, n)} / ${n}` : '';
      prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max;
      arrows.style.visibility = n > visible ? 'visible' : 'hidden';
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Menu: the phone toggle, and groups that open on tap.
  const nav = $('#main-nav'); const toggle = $('#menu-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => { const on = nav.classList.toggle('show'); toggle.setAttribute('aria-expanded', on); });
    for (const b of $$('.navtop', nav)) b.addEventListener('click', (e) => {
      const li = b.parentElement; const was = li.classList.contains('open');
      for (const o of $$('li.open', nav)) { o.classList.remove('open'); $('.navtop', o)?.setAttribute('aria-expanded', 'false'); }
      if (!was) { li.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
      e.stopPropagation();
    });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) for (const o of $$('li.open', nav)) o.classList.remove('open'); });
  }

  // Dogs: Girls / Boys, from the select or from #girls / #boys in the address.
  const dogFilter = $('#dog-filter');
  if (dogFilter) {
    const apply = () => { for (const c of $$('#all-dogs > [data-sex]')) c.hidden = dogFilter.value !== 'all' && c.dataset.sex !== dogFilter.value; };
    const fromHash = () => { if (location.hash === '#girls') dogFilter.value = 'female'; else if (location.hash === '#boys') dogFilter.value = 'male'; apply(); };
    dogFilter.addEventListener('change', apply);
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  // Reviews: by topic.
  const topic = $('#review-topic');
  if (topic) {
    const apply = () => { for (const r of $$('#all-reviews > [data-topic]')) r.hidden = topic.value !== 'all' && r.dataset.topic !== topic.value; };
    topic.addEventListener('change', apply);
    apply();
  }

  // Homegoing packages: "What's included" starts open on wide screens.
  if (window.matchMedia('(min-width: 901px)').matches) for (const d of $$('.pkg details')) d.open = true;
})();
