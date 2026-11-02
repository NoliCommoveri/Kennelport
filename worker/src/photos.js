// Photo uploads, checked on the server (plan 4.2). The browser resizes and
// re-encodes first (public/_kp/ops/photos.js now; the manage app in phase 2), but
// anyone can call the upload directly, so nothing here trusts it:
// - only WebP or JPEG, by their bytes, not their name or declared type;
// - within a size and pixel limit;
// - no location data: a WebP with an EXIF or XMP chunk, or a JPEG with an APP1
//   (EXIF/XMP) segment, is refused.
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_THUMB_BYTES = 400 * 1024;
export const MAX_SIDE = 2400;

export class PhotoError extends Error {}

const u32le = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const u24le = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u16be = (b, i) => (b[i] << 8) | b[i + 1];
const tag = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);

function webpInfo(b) {
  let width = 0; let height = 0;
  for (let i = 12; i + 8 <= b.length;) {
    const id = tag(b, i);
    const size = u32le(b, i + 4);
    const data = i + 8;
    if (id === 'EXIF' || id === 'XMP ') throw new PhotoError('This photo still carries its camera data (EXIF/XMP), which can include where it was taken. Re-save it first.');
    if (id === 'VP8X') { width = 1 + u24le(b, data + 4); height = 1 + u24le(b, data + 7); }
    else if (id === 'VP8 ' && !width) { width = (b[data + 6] | (b[data + 7] << 8)) & 0x3fff; height = (b[data + 8] | (b[data + 9] << 8)) & 0x3fff; }
    else if (id === 'VP8L' && !width) {
      const bits = u32le(b, data + 1);
      width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
    }
    i = data + size + (size & 1);
  }
  return { type: 'image/webp', width, height };
}

function jpegInfo(b) {
  let width = 0; let height = 0;
  for (let i = 2; i + 4 <= b.length;) {
    if (b[i] !== 0xff) throw new PhotoError('This JPEG is damaged.');
    const marker = b[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) break; // end, or start of the image data
    const len = u16be(b, i + 2);
    if (marker === 0xe1) throw new PhotoError('This photo still carries its camera data (EXIF/XMP), which can include where it was taken. Re-save it first.');
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      height = u16be(b, i + 5); width = u16be(b, i + 7);
    }
    i += 2 + len;
  }
  return { type: 'image/jpeg', width, height };
}

export function checkPhoto(bytes, { maxBytes = MAX_PHOTO_BYTES } = {}) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!b.length) throw new PhotoError('The file is empty.');
  if (b.length > maxBytes) throw new PhotoError(`The photo is too large (${Math.round(b.length / 1024)} KB; at most ${Math.round(maxBytes / 1024)} KB).`);
  let info;
  if (b.length > 12 && tag(b, 0) === 'RIFF' && tag(b, 8) === 'WEBP') info = webpInfo(b);
  else if (b[0] === 0xff && b[1] === 0xd8) info = jpegInfo(b);
  else throw new PhotoError('Only WebP or JPEG photos can be uploaded.');
  if (!info.width || !info.height) throw new PhotoError("The photo's size couldn't be read.");
  if (info.width > MAX_SIDE || info.height > MAX_SIDE) throw new PhotoError(`The photo is ${info.width}×${info.height}; at most ${MAX_SIDE} pixels a side.`);
  return { ...info, bytes: b.length };
}

const ext = (type) => (type === 'image/webp' ? 'webp' : 'jpg');

// Store a checked photo (and its thumbnail) for a site. Counts against the
// site's storage limit when one is set.
export async function savePhoto(env, siteId, { full, thumb, alt }) {
  const f = checkPhoto(full);
  const t = thumb && thumb.byteLength ? checkPhoto(thumb, { maxBytes: MAX_THUMB_BYTES }) : null;
  const site = await env.DB.prepare('SELECT storage_limit, photo_limit FROM sites WHERE id = ?').bind(siteId).first();
  if (!site) throw new PhotoError('No such site.');
  const used = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS bytes FROM photos WHERE site_id = ? AND removed_at IS NULL').bind(siteId).first();
  if (site.photo_limit && used.n >= site.photo_limit) throw new PhotoError(`This site has reached its limit of ${site.photo_limit} photos.`);
  const total = f.bytes + (t?.bytes ?? 0);
  if (site.storage_limit && used.bytes + total > site.storage_limit) throw new PhotoError('This site has reached its storage limit.');

  const id = crypto.randomUUID();
  const key = `sites/${siteId}/photos/${id}.${ext(f.type)}`;
  const thumbKey = t ? `sites/${siteId}/photos/${id}.t.${ext(t.type)}` : null;
  await env.FILES.put(key, full, { httpMetadata: { contentType: f.type } });
  if (t) await env.FILES.put(thumbKey, thumb, { httpMetadata: { contentType: t.type } });
  const cleanAlt = String(alt ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
  await env.DB.prepare('INSERT INTO photos (id, site_id, r2_key, thumb_key, type, width, height, bytes, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, siteId, key, thumbKey, f.type, f.width, f.height, total, cleanAlt, new Date().toISOString()).run();
  return { id, ...f };
}
