// KennelPort template "ak": what the pages do, ported from the AK sample. Every
// page works without it (links, expanders and lists are plain HTML); this adds
// the flips, sliding sets, menu, filters, the packages opening on wide screens,
// and KennelOS's application form on the waitlist page.
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

  // Her logo: a tap shows it full size in a dialog; a tap anywhere, Escape or ×
  // closes it. Without this script the link opens the picture itself.
  const zoom = $('#logo-zoom');
  if (zoom && zoom.showModal) {
    for (const a of $$('[data-logo-zoom]')) a.addEventListener('click', (e) => { e.preventDefault(); zoom.showModal(); });
    zoom.addEventListener('click', () => zoom.close());
  }

  // Homegoing packages: "What's included" starts open on wide screens.
  if (window.matchMedia('(min-width: 901px)').matches) for (const d of $$('.pkg details')) d.open = true;

  // The KennelOS list on the waitlist page (plan 3.8): find yourself by name or
  // number (as KennelOS's own list does: a number is a position, exactly; anything
  // else is looked for in the name, ignoring case and accents), and a tap on an ⓘ
  // shows its date (touch screens have no hover).
  const search = $('[data-wl-search]');
  if (search) {
    search.hidden = false;
    const input = $('input', search);
    const none = $('[data-wl-none]');
    const fold = (x) => String(x ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
    input.addEventListener('input', () => {
      const q = fold(input.value);
      let shown = 0;
      for (const tr of $$('tr[data-wl-row]')) {
        const hit = !q || (/^#?\d+$/.test(q) ? tr.dataset.pos === q.replace(/^#/, '') : fold(tr.dataset.name).includes(q));
        tr.hidden = !hit;
        if (hit) shown++;
      }
      if (none) { none.hidden = shown > 0; none.textContent = shown ? '' : `No one on the list matches "${input.value.trim()}".`; }
    });
  }
  document.addEventListener('click', (e) => {
    const tip = e.target instanceof Element ? e.target.closest('.added-tip') : null;
    for (const t of $$('.added-tip.open')) if (t !== tip) t.classList.remove('open');
    if (tip) tip.classList.toggle('open');
  });

  // kennelos-seal:start (the same as KennelOS's cloud/public/family/seal.js, which
  // shared/data/waitlistCrypto.js opens; tests/kennelosform.test.js opens what this
  // seals). The answers are sealed to her form key here, in the visitor's browser:
  // ECDH P-256 with a fresh key pair, HKDF-SHA-256, AES-GCM-256 with the key id as
  // additional data. Neither this website nor KennelOS's server can read them.
  async function sealToKennelos(publicKey, keyId, value) {
    const enc = new TextEncoder();
    const toB64 = (bytes) => {
      const u8 = new Uint8Array(bytes);
      let out = '';
      for (let i = 0; i < u8.length; i += 0x8000) out += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return btoa(out);
    };
    const subtle = crypto.subtle;
    const theirs = await subtle.importKey('raw', Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0)), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const mine = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const epk = new Uint8Array(await subtle.exportKey('raw', mine.publicKey));
    const shared = await subtle.deriveBits({ name: 'ECDH', public: theirs }, mine.privateKey, 256);
    const hkdf = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    const key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: epk, info: enc.encode('kennelos-waitlist/seal/v1') }, hkdf,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(`kennelos-waitlist/v1/${keyId}`) }, key, enc.encode(JSON.stringify(value)));
    return btoa(JSON.stringify({ v: 1, kid: keyId, epk: toB64(epk), iv: toB64(iv), ct: toB64(ct) }));
  }
  // kennelos-seal:end

  // KennelOS's application form, drawn by the waitlist page (plan 3.8). What the
  // visitor types is read as KennelOS's own form page reads it, sealed above, and
  // sent from this browser straight to KennelOS; then the emailed code, sent there
  // too. KennelOS never hands this page the family's status link. Without this script (or WebCrypto) the page shows the link to KennelOS's
  // own application page instead.
  const kos = $('[data-kos-form]');
  if (kos && window.crypto?.subtle && window.fetch) {
    const d = kos.dataset;
    const step = (name) => {
      for (const el of $$('[data-kos-step]', kos)) el.hidden = el.dataset.kosStep !== name;
      const faq = $('.kos-faq', kos);
      if (faq) faq.hidden = name !== 'form';
    };
    const form = $('[data-kos-step="form"]', kos);
    const problems = $('[data-kos-problems]', kos);
    const send = async (path, body) => {
      try {
        const res = await fetch(`${d.origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
      } catch { return { ok: false, status: 0, body: {} }; }
    };
    const fallback = ` You can also apply on our KennelOS page: ${d.applyUrl}`;
    const trouble = (r) => (r.status === 0 ? "Couldn't reach our waitlist. Check your connection and try again."
      : r.status === 429 ? 'Too many tries just now. Please wait a little and try again.'
        : `Something went wrong. Please try again.${fallback}`);
    $('[data-kos-fallback]', kos).hidden = true;
    step('form');

    const checked = (q) => [...q.querySelectorAll('input:checked')].map((el) => el.value);
    function read() {
      const answers = {};
      const missing = [];
      let privateRequest = false;
      for (const q of $$('[data-q]', form)) {
        const type = q.dataset.type;
        if (type === 'notice') {
          if (!$('[data-notice]', q).checked) missing.push(q.dataset.label);
          privateRequest = Boolean($('[data-private]', q)?.checked);
          continue;
        }
        let value;
        if (type === 'yes_no' || type === 'single_choice') value = checked(q)[0] ?? '';
        else if (type === 'checkboxes') value = checked(q);
        else { const el = $('input, textarea', q); value = type === 'long_text' ? el.value : el.value.trim(); }
        answers[q.dataset.q] = value;
        const blank = Array.isArray(value) ? !value.length : !String(value).trim();
        if ('required' in q.dataset && blank) missing.push(q.dataset.label);
      }
      const pref = (key) => $(`[data-pref="${key}"]`, form);
      const prefs = {
        pref_sex: (pref('pref_sex') && checked(pref('pref_sex'))[0]) || 'any',
        pref_breed: pref('pref_breed')?.value || '',
        pref_purposes: pref('pref_purposes') ? checked(pref('pref_purposes')) : [],
        pref_colors: (pref('pref_colors')?.value || '').split(',').map((x) => x.trim()).filter(Boolean),
        ready_timing: (pref('ready_timing') && checked(pref('ready_timing'))[0]) || null,
      };
      if (pref('ready_timing') && !prefs.ready_timing) missing.push($('legend > span', pref('ready_timing')).firstChild.textContent.trim());
      const byKey = (key) => $(`[data-key="${key}"]`, form)?.dataset.q ?? key;
      const name = String(answers[byKey('name')] ?? '').trim();
      const email = String(answers[byKey('email')] ?? '').trim();
      return { answers, prefs, privateRequest, missing, name, email };
    }

    let email = '';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = read();
      const turnstile = $('input[name="cf-turnstile-response"]', form)?.value || null;
      const list = [];
      if (a.missing.length) list.push(`Please answer: ${a.missing.map((x) => x.replace(/[?.!:]+$/, '')).join('; ')}.`);
      if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) list.push("Your email address doesn't look right.");
      if ($('.cf-turnstile', form) && !turnstile) list.push('Please wait for the check above the button to finish.');
      problems.textContent = list.join(' ');
      problems.hidden = !list.length;
      if (list.length) return;
      const button = $('button[type=submit]', form);
      button.disabled = true; button.textContent = 'Sending…';
      try {
        const sealed = await sealToKennelos(d.publicKey, d.keyId, { answers: a.answers, prefs: a.prefs, ...(a.privateRequest ? { private_request: true } : {}), sent_at: new Date().toISOString() });
        const r = await send(`/f/apply/${encodeURIComponent(d.publicId)}`, { key_id: d.keyId, sealed, name: a.name, email: a.email, turnstile });
        if (r.ok) {
          email = a.email;
          $('[data-kos-email]', kos).textContent = email;
          step('confirm');
          $('#k-code', kos).focus();
          kos.scrollIntoView({ block: 'start' });
          return;
        }
        const code = r.body.error;
        problems.textContent = code === 'form_changed' ? `${d.kennel} just updated this form. Please reload the page and send it again (copy any long answers first).`
          : code === 'form_closed' || code === 'not_found' ? `${d.kennel} has stopped taking applications online.`
            : code === 'not_verified' ? 'The spam check failed. Please try it again.'
              : code === 'bad_email' ? "Your email address doesn't look right."
                : trouble(r);
        problems.hidden = false;
        if (window.turnstile && $('.cf-turnstile', form)) window.turnstile.reset($('.cf-turnstile', form));
      } catch {
        problems.textContent = `Your application couldn't be prepared in this browser.${fallback}`;
        problems.hidden = false;
      } finally {
        button.disabled = false; button.textContent = 'Send application';
      }
    });

    const confirm = $('[data-kos-step="confirm"]', kos);
    const result = $('[data-kos-result]', kos);
    confirm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = $('button[type=submit]', confirm);
      button.disabled = true;
      const r = await send('/f/verify', { public_id: d.publicId, code: $('#k-code', kos).value });
      button.disabled = false;
      if (r.ok && r.body.confirmed) {
        // KennelOS gives this page no status link and no session: the family signs
        // in on KennelOS's own page to see their private status page.
        step('done');
        kos.scrollIntoView({ block: 'start' });
        return;
      }
      const code = r.body.error;
      result.textContent = code === 'invalid_code' || code === 'bad_code' ? "That code didn't work. Check it, or send a new one below." : trouble(r);
    });
    $('[data-kos-resend]', kos).addEventListener('click', async () => {
      const r = await send('/f/code', { public_id: d.publicId, email });
      result.textContent = r.ok ? `A new code is on its way to ${email}.` : trouble(r);
    });
  }
})();
