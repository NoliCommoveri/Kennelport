// A product's embed code (Recommended products): the HTML snippet a brand's
// referral page hands out, like
//   <a href="https://brand.example/r/kennel" target="_blank"><img src="https://brand.example/logo.png" alt="Brand"></a>
// The HTML is never kept or shown. Only three things are read from it: the link,
// the picture's address and its alt text. The picture is copied onto the site
// (pages may only show their own pictures, site.js SITE_CSP) when it's a WebP or
// JPEG; anything else (most logos are PNG) she downloads and chooses as the
// picture, and the manage app converts it as it uploads.
import { savePhoto, PhotoError } from './photos.js';

export class BadgeCodeError extends Error {}

const MAX_CODE = 4000;
const MAX_IMAGE = 2 * 1024 * 1024;

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// The value of one attribute in the first tag of this name, quoted or not.
function attrOf(html, tagName, name) {
  const tagM = html.match(new RegExp(`<${tagName}\\b([^>]*)>`, 'i'));
  if (!tagM) return null;
  const m = tagM[1].match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
  return m ? decode((m[1] ?? m[2] ?? m[3]).trim()) : null;
}

const webAddress = (v) => {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch { return null; }
};

// Pasted code → { link, image, alt }. Throws BadgeCodeError with words for the breeder.
export function readBadgeCode(text) {
  const html = String(text ?? '').trim();
  if (html.length > MAX_CODE) throw new BadgeCodeError('That embed code is too long. Paste just the code they gave you.');
  const link = webAddress(attrOf(html, 'a', 'href'));
  const image = webAddress(attrOf(html, 'img', 'src'));
  if (!link && !image) throw new BadgeCodeError('No link or picture found in that code. Paste the whole code, from <a to </a>.');
  const alt = (attrOf(html, 'img', 'alt') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || null;
  return { link, image: image && image.startsWith('https://') ? image : null, alt };
}

// Copy the picture onto the site; returns its photo id. Throws BadgeCodeError.
export async function storeBadgeImage(env, siteId, url, alt) {
  let res;
  try { res = await (env.EMBED_FETCH ?? fetch)(url, { headers: { accept: 'image/webp,image/jpeg' } }); } catch { res = null; }
  if (!res?.ok) throw new BadgeCodeError("The picture in that code couldn't be fetched. Download the logo from their page, choose it as the picture above, and save.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE) throw new BadgeCodeError('The picture in that code is too large. Download the logo from their page, choose it as the picture above, and save.');
  try {
    return (await savePhoto(env, siteId, { full: bytes, alt })).id;
  } catch (err) {
    if (err instanceof PhotoError) throw new BadgeCodeError(`Your link is filled in, but the picture in that code can't be copied (${err.message.replace(/\.$/, '')}). Download the logo from their page, choose it as the picture above, and save.`);
    throw err;
  }
}
