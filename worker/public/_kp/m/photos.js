// Photo upload, for the manage app and /ops (the form's action says where):
// resize in the browser to about 1600px plus a 400px thumbnail, as WebP where the
// browser can make it and JPEG where it can't (iPhone Safari may hand back PNG
// when asked for WebP), then upload. Re-encoding drops the camera's location
// data; the server checks again (src/photos.js, plan 4.2).
//
// Two ways in:
// - the Photos screen's #photo-form (and /ops's), which reloads when done;
// - an Add photos button inside a photo picker ([data-picker] with data-upload):
//   each photo is uploaded tagged with what's being edited (data-tags), appears
//   in the picker's first group already chosen, and a hidden _new_photos input
//   tells the form's Save to tag it too (for a record not saved yet). Nothing
//   else in the form is touched, so what's been typed stays.
(() => {
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

  async function encode(bitmap, side) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    const blob = (type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));
    let b = await blob('image/webp', 0.82);
    if (!b || b.type !== 'image/webp') {
      // JPEG has no transparency: a logo's clear background would turn black, so
      // white goes behind it first (WebP keeps it clear).
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      b = await stripJpegMeta(await blob('image/jpeg', 0.85));
    }
    return b;
  }

  // Upload files one by one; say() reports progress. Returns the uploaded
  // photos ({ id, thumb }) and stops at the first problem.
  async function uploadAll(files, { action, alt, tags, say, onEach }) {
    const done = [];
    for (const file of files) {
      say(`Preparing ${file.name} (${done.length + 1} of ${files.length})…`);
      let bitmap;
      try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch { say(`${file.name} couldn't be read. Try a screenshot of it or a different photo.`); return done; }
      const full = await encode(bitmap, 1600);
      const thumb = await encode(bitmap, 400);
      const body = new FormData();
      body.append('full', full, 'full');
      body.append('thumb', thumb, 'thumb');
      body.append('alt', files.length === 1 ? alt : (alt ? `${alt} (${done.length + 1})` : ''));
      if (tags) body.append('tags', tags);
      say(`Uploading ${file.name}…`);
      let res;
      try { res = await fetch(action, { method: 'POST', body, credentials: 'same-origin' }); }
      catch { say(navigator.onLine ? "Couldn't reach KennelPort. Try again." : "You're offline. Try again when you're back online."); return done; }
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { say(`${file.name}: ${out.message || 'upload failed'}`); return done; }
      done.push(out);
      onEach?.(out);
    }
    return done;
  }

  const form = document.getElementById('photo-form');
  if (form) {
    const out = document.getElementById('photo-status');
    const say = (msg) => { out.textContent = msg; };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const files = [...form.querySelector('input[type=file]').files];
      if (!files.length) return say('Choose one or more photos first.');
      const done = await uploadAll(files, { action: form.action, alt: form.querySelector('input[name=alt]').value, tags: form.querySelector('select[name=tags]')?.value, say });
      if (done.length === files.length) {
        say(`Uploaded ${done.length} photo${done.length === 1 ? '' : 's'}. Reloading…`);
        location.reload();
      }
    });
  }

  // ---------- photo spots and the photo library window (decision 20) ----------
  // A spot (forms.js photoSlot) shows only its photo; Replace opens the one library
  // window, the same on every screen (screens.js libraryHtml, fetched each time so it's
  // current). Tap a photo, then Replace; picking several, tick them, then Use these
  // photos. Upload is in the window: a new photo joins Just added, chosen, and is
  // tagged as what's being edited (data-tags, and _new_photos for the form's Save).
  let dlg = null;
  const fill = (t, n) => t.replace('{n}', n);
  function spotIds(slot) { return [...slot.querySelectorAll(`input[type=hidden][name="${CSS.escape(slot.dataset.name)}"]`)].map((i) => i.value).filter(Boolean); }
  function setSpot(slot, chosen) {
    const { name, mode } = slot.dataset;
    for (const i of slot.querySelectorAll(`input[type=hidden][name="${CSS.escape(name)}"]`)) i.remove();
    const cur = slot.querySelector('.ph-cur');
    cur.textContent = '';
    const ids = mode === 'one' ? chosen.slice(0, 1) : chosen;
    const add = (id) => { const h = document.createElement('input'); h.type = 'hidden'; h.name = name; h.value = id; cur.after(h); return h; };
    if (mode === 'one') add(ids[0]?.id ?? '');
    else for (const x of [...ids].reverse()) add(x.id);
    for (const x of ids.slice(0, 24)) { const img = document.createElement('img'); img.src = x.thumb; img.alt = ''; cur.append(img); }
    if (ids.length > 24) { const more = document.createElement('span'); more.className = 'ph-more-n'; more.textContent = `+${ids.length - 24}`; cur.append(more); }
    if (!ids.length) { const none = document.createElement('span'); none.className = 'ph-none'; none.textContent = slot.dataset.none; cur.append(none); }
    if (mode === 'one') {
      slot.querySelector('[data-replace]').textContent = ids.length ? slot.dataset.replace : slot.dataset.choose;
      slot.querySelector('[data-remove]').hidden = !ids.length;
    } else {
      let n = slot.querySelector('[data-count]');
      if (!n && ids.length) { n = document.createElement('p'); n.className = 'small muted'; n.dataset.count = ''; slot.querySelector('.row').before(n); }
      if (n) { n.textContent = fill(slot.dataset.count, ids.length); n.hidden = !ids.length; }
    }
    slot.querySelector('input[type=hidden]')?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function openLibrary(slot) {
    if (!dlg) { dlg = document.createElement('dialog'); dlg.className = 'lib-dlg'; document.body.append(dlg); }
    const { mode } = slot.dataset;
    const max = Number(slot.dataset.max) || (mode === 'one' ? 1 : Infinity);
    dlg.innerHTML = '<div class="lib"><p class="muted small">…</p></div>';
    if (!dlg.open) dlg.showModal();
    let html = null;
    try { const r = await fetch(slot.dataset.library, { credentials: 'same-origin' }); if (r.ok) html = await r.text(); } catch { /* below */ }
    if (html == null) {
      dlg.innerHTML = '<div class="lib"><p role="alert"></p><div class="lib-bar"><button type="button" class="link" data-lib-cancel></button></div></div>';
      dlg.querySelector('[role=alert]').textContent = slot.dataset.failed;
      dlg.querySelector('[data-lib-cancel]').textContent = slot.dataset.cancel;
      dlg.querySelector('[data-lib-cancel]').onclick = () => dlg.close();
      return;
    }
    dlg.innerHTML = html;
    const lib = dlg.querySelector('[data-lib]');
    dlg.setAttribute('aria-label', lib.querySelector('h2')?.textContent ?? '');
    lib.dataset.mode = mode;
    // What's chosen, in order: what the spot has, then what she ticks.
    const thumbOf = new Map([...lib.querySelectorAll('.lib-ph')].map((b) => [b.dataset.id, b.dataset.thumb]));
    const curThumbs = [...slot.querySelectorAll('.ph-cur img')].map((i) => i.src);
    let chosen = spotIds(slot).map((id, i) => ({ id, thumb: thumbOf.get(id) ?? curThumbs[i] }));
    const count = lib.querySelector('[data-lib-count]');
    const pick = lib.querySelector('[data-lib-pick]');
    pick.textContent = mode === 'one' ? pick.dataset.one : pick.dataset.many;
    const load = (row) => { for (const img of row.querySelectorAll('img[data-src]')) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
    const sync = () => {
      const on = new Set(chosen.map((x) => x.id));
      for (const b of lib.querySelectorAll('.lib-ph')) b.setAttribute('aria-pressed', String(on.has(b.dataset.id)));
      const over = chosen.length > max;
      count.textContent = over ? fill(lib.dataset.tooMany, max) : mode === 'many' ? fill(lib.dataset.chosen, chosen.length) : '';
      pick.disabled = over || (mode === 'one' && !chosen.length);
    };
    for (const row of lib.querySelectorAll('.lib-row')) {
      row.addEventListener('toggle', () => { if (row.open) load(row); });
      // The rows holding what the spot has start open.
      if (chosen.some((x) => row.querySelector(`.lib-ph[data-id="${CSS.escape(x.id)}"]`))) { row.open = true; load(row); }
    }
    for (const r of lib.querySelectorAll('input[name=lib-tab]')) r.addEventListener('change', () => { for (const t of lib.querySelectorAll('[data-tab]')) t.hidden = t.dataset.tab !== r.value; });
    lib.addEventListener('click', (e) => {
      const b = e.target.closest('.lib-ph');
      if (!b) return;
      const x = { id: b.dataset.id, thumb: b.dataset.thumb };
      if (mode === 'one') chosen = [x];
      else chosen = chosen.some((c) => c.id === x.id) ? chosen.filter((c) => c.id !== x.id) : [...chosen, x];
      sync();
    });
    lib.querySelector('[data-lib-cancel]').onclick = () => dlg.close();
    pick.onclick = () => { setSpot(slot, chosen); dlg.close(); };
    // Upload, here and nowhere else.
    const file = lib.querySelector('[data-lib-upload]');
    const status = lib.querySelector('[data-lib-status]');
    file.addEventListener('change', async () => {
      const files = [...file.files];
      if (!files.length) return;
      file.disabled = true;
      const page = lib.querySelector('[data-tab=page]');
      let row = lib.querySelector('.lib-row[data-just]');
      if (!row) {
        row = document.createElement('details');
        row.className = 'lib-row'; row.dataset.just = ''; row.open = true;
        row.innerHTML = '<summary><b></b><span class="n"></span></summary><div class="lib-grid"></div>';
        row.querySelector('b').textContent = lib.dataset.justAdded;
        page.querySelector(':scope > p')?.remove();
        page.prepend(row);
      }
      for (const r of lib.querySelectorAll('input[name=lib-tab]')) if (r.value === 'page' && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change')); }
      const done = await uploadAll(files, {
        action: slot.dataset.upload, alt: slot.dataset.alt || '', tags: slot.dataset.tags, say: (m) => { status.textContent = m; },
        onEach: (photo) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'lib-ph'; b.dataset.id = photo.id; b.dataset.thumb = photo.thumb;
          const img = document.createElement('img'); img.src = photo.thumb; img.alt = slot.dataset.alt || '';
          b.append(img);
          row.querySelector('.lib-grid').prepend(b);
          row.querySelector('.n').textContent = row.querySelectorAll('.lib-ph').length;
          const x = { id: photo.id, thumb: photo.thumb };
          if (mode === 'one') chosen = [x]; else if (chosen.length < max) chosen = [...chosen, x];
          const form = slot.closest('form');
          if (form) { const h = document.createElement('input'); h.type = 'hidden'; h.name = '_new_photos'; h.value = photo.id; form.append(h); }
          sync();
        },
      });
      if (done.length === files.length) status.textContent = '';
      file.value = ''; file.disabled = false;
    });
    sync();
  }

  document.addEventListener('click', (e) => {
    const slot = e.target.closest('[data-slot]');
    if (!slot) return;
    if (e.target.closest('[data-replace]')) openLibrary(slot);
    else if (e.target.closest('[data-remove]')) setSpot(slot, []);
  });

  for (const picker of document.querySelectorAll('[data-picker][data-upload]')) {
    const input = picker.querySelector('input[data-add-photos]');
    if (!input) continue;
    const out = picker.querySelector('.ph-add [role=status]');
    const say = (msg) => { out.textContent = msg; };
    const grid = picker.querySelector('[data-first]');
    const { name, type, max } = picker.dataset;
    const owner = picker.closest('form');

    const add = (photo) => {
      if (type === 'none') {
        const img = document.createElement('img');
        img.src = photo.thumb; img.alt = picker.dataset.alt || 'Photo';
        grid.prepend(img);
        return;
      }
      const label = document.createElement('label');
      label.className = 'ph-opt';
      const box = document.createElement('input');
      box.type = type; box.name = name; box.value = photo.id;
      const img = document.createElement('img');
      img.src = photo.thumb; img.alt = picker.dataset.alt || 'Photo';
      label.append(box, img);
      const none = grid.querySelector('.ph-opt.none');
      if (none) none.after(label); else grid.prepend(label);
      // A single photo: the newest upload is the one chosen. Several: choose it
      // while there's room.
      if (type === 'radio') box.checked = true;
      else if (!max || picker.querySelectorAll(`input[name="${CSS.escape(name)}"]:checked`).length < Number(max)) box.checked = true;
      if (owner) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden'; hidden.name = '_new_photos'; hidden.value = photo.id;
        owner.append(hidden);
      }
      picker.querySelector('.ph-head .muted')?.remove();
    };

    input.addEventListener('change', async () => {
      const files = [...input.files];
      if (!files.length) return;
      input.disabled = true;
      const done = await uploadAll(files, { action: picker.dataset.upload, alt: picker.dataset.alt || '', tags: picker.dataset.tags, say, onEach: add });
      if (done.length === files.length) say(`Added ${done.length} photo${done.length === 1 ? '' : 's'}.${type === 'none' ? '' : ' Press Save to use your choice.'}`);
      input.value = '';
      input.disabled = false;
    });
  }
})();
