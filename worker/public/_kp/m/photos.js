// Photo upload, for the manage app and /ops (the form's action says where):
// resize in the browser to about 1600px plus a 400px thumbnail, as WebP where the
// browser can make it and JPEG where it can't (iPhone Safari may hand back PNG
// when asked for WebP), then upload. Re-encoding drops the camera's location
// data; the server checks again (src/photos.js, plan 4.2).
(() => {
  const form = document.getElementById('photo-form');
  if (!form) return;
  const out = document.getElementById('photo-status');
  const say = (msg) => { out.textContent = msg; };

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = [...form.querySelector('input[type=file]').files];
    if (!files.length) return say('Choose one or more photos first.');
    const alt = form.querySelector('input[name=alt]').value;
    let done = 0;
    for (const file of files) {
      say(`Preparing ${file.name} (${done + 1} of ${files.length})…`);
      let bitmap;
      try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch { say(`${file.name} couldn't be read. Try a screenshot of it or a different photo.`); return; }
      const full = await encode(bitmap, 1600);
      const thumb = await encode(bitmap, 400);
      const body = new FormData();
      body.append('full', full, 'full');
      body.append('thumb', thumb, 'thumb');
      body.append('alt', files.length === 1 ? alt : (alt ? `${alt} (${done + 1})` : ''));
      say(`Uploading ${file.name}…`);
      const res = await fetch(form.action, { method: 'POST', body, credentials: 'same-origin' });
      if (!res.ok) { say(`${file.name}: ${(await res.json().catch(() => ({}))).message || 'upload failed'}`); return; }
      done++;
    }
    say(`Uploaded ${done} photo${done === 1 ? '' : 's'}. Reloading…`);
    location.reload();
  });
})();
