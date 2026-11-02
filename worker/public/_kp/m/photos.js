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
  async function encode(bitmap, side) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    const blob = (type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));
    let b = await blob('image/webp', 0.82);
    if (!b || b.type !== 'image/webp') b = await blob('image/jpeg', 0.85);
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
