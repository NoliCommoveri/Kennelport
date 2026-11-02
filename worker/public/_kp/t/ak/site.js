// KennelPort template "ak": what the pages do, ported from the AK sample. Every
// page works without it (links, expanders and lists are plain HTML); this adds
// the flips, sliding sets, menu, filters and the packages opening on wide screens.
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  // strip-jpeg-meta:start (the same in public/_kp/m/photos.js and public/_kp/t/ak/site.js;
  // tests/jpegmeta.test.js checks both). iPhone browsers can't make WebP, and Apple's
  // JPEG encoder adds an EXIF block (APP1: size and colour, never location, since the
  // canvas holds only pixels). The server refuses any APP1, so drop it here.
  async function stripJpegMeta(b) {
    if (!b || b.type !== 'image/jpeg') return b;
    const u = new Uint8Array(await b.arrayBuffer());
    if (u[0] !== 0xff || u[1] !== 0xd8) return b;
    const parts = [u.subarray(0, 2)];
    let i = 2;
    while (i + 4 <= u.length && u[i] === 0xff && u[i + 1] !== 0xda) {
      const end = i + 2 + ((u[i + 2] << 8) | u[i + 3]);
      if (u[i + 1] !== 0xe1) parts.push(u.subarray(i, end));
      i = end;
    }
    parts.push(u.subarray(i));
    return new Blob(parts, { type: 'image/jpeg' });
  }
  // strip-jpeg-meta:end

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

  // How to pay: Copy buttons (hidden until this script runs). Where the clipboard
  // isn't allowed, the details are selected instead, ready to copy by hand.
  for (const b of $$('.copy[hidden]')) b.hidden = false;
  document.addEventListener('click', async (e) => {
    const c = e.target.closest('.copy');
    if (!c) return;
    try { await navigator.clipboard.writeText(c.dataset.copy); c.textContent = 'Copied'; }
    catch { const r = document.createRange(); r.selectNodeContents(c.previousElementSibling); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); c.textContent = 'Selected'; }
    setTimeout(() => { c.textContent = 'Copy'; }, 1600);
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

  // Share your review: the photo is made smaller here before it's sent (WebP, or
  // JPEG where the browser can't make WebP), which also drops the camera's
  // location data. The server checks again. Without this script the form still
  // posts, and an oversized photo is refused with a reason.
  for (const form of $$('form[data-photo-form]')) {
    form.addEventListener('submit', async (e) => {
      const input = $('input[type=file]', form);
      const file = input?.files?.[0];
      if (!file || !window.createImageBitmap || form.dataset.sending) return;
      e.preventDefault();
      form.dataset.sending = '1';
      const button = $('button[type=submit]', form);
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      const body = new FormData(form);
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = (type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));
        let out = await blob('image/webp', 0.82);
        if (!out || out.type !== 'image/webp') out = await stripJpegMeta(await blob('image/jpeg', 0.85));
        body.set('photo', out, 'photo');
      } catch { body.delete('photo'); }
      try {
        const res = await fetch(form.action, { method: 'POST', body });
        const html = await res.text();
        document.open(); document.write(html); document.close();
      } catch {
        delete form.dataset.sending;
        if (button) { button.disabled = false; button.textContent = 'Send review'; }
        alert("Your review couldn't be sent. Check your connection and try again; what you wrote is still here.");
      }
    });
  }

  // Homegoing packages: "What's included" starts open on wide screens.
  if (window.matchMedia('(min-width: 901px)').matches) for (const d of $$('.pkg details')) d.open = true;
})();
