// Videos and posts on a site (plan 3.3): where each sits, added from a pasted link
// (embeds.js reads it), with a copy of the provider's preview stored on the site.
// Part of the draft: nothing shows until Publish.
import { readEmbedLink, previewUrl, PROVIDERS, EmbedError } from './embeds.js';
import { savePhoto } from './photos.js';

export { EmbedError };
export const EMBEDS_PER_PLACE = 12;
const PAGE_PLACES = ['home', 'about'];
const RECORD_PLACES = { dog: 'dogs', litter: 'litters', album: 'albums' };

const touch = (env, siteId) => env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(new Date().toISOString(), siteId);

export async function checkPlace(env, siteId, place) {
  if (PAGE_PLACES.includes(place)) return place;
  const m = /^(dog|litter|album):([0-9a-f-]{36})$/.exec(String(place ?? ''));
  if (m && await env.DB.prepare(`SELECT 1 FROM ${RECORD_PLACES[m[1]]} WHERE id = ? AND site_id = ?`).bind(m[2], siteId).first()) return place;
  throw new EmbedError('That page is no longer on this site.');
}

export async function listEmbeds(env, siteId, place) {
  return (await env.DB.prepare('SELECT * FROM embeds WHERE site_id = ? AND place = ? ORDER BY sort, created_at').bind(siteId, place).all()).results;
}

// Copy the preview onto the site; any failure just means no preview.
async function storePreview(env, siteId, provider, item, title) {
  const url = await previewUrl(env, provider, item);
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await (env.EMBED_FETCH ?? fetch)(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) return null;
    return (await savePhoto(env, siteId, { full: bytes, alt: title ? `${title} (${PROVIDERS[provider].name})` : `${PROVIDERS[provider].name} video` })).id;
  } catch { return null; }
}

export async function addEmbed(env, siteId, place, { link, title }) {
  await checkPlace(env, siteId, place);
  const { provider, item } = readEmbedLink(link);
  const t = String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) || null;
  const n = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(sort), -1) AS s FROM embeds WHERE site_id = ? AND place = ?').bind(siteId, place).first();
  if (n.n >= EMBEDS_PER_PLACE) throw new EmbedError(`At most ${EMBEDS_PER_PLACE} videos and posts in one place.`);
  if (await env.DB.prepare('SELECT 1 FROM embeds WHERE site_id = ? AND place = ? AND provider = ? AND item = ?').bind(siteId, place, provider, item).first()) throw new EmbedError("That one's already here.");
  const preview = await storePreview(env, siteId, provider, item, t);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO embeds (id, site_id, place, provider, item, title, preview_photo_id, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, siteId, place, provider, item, t, preview, n.s + 1, new Date().toISOString()),
    touch(env, siteId),
  ]);
  return id;
}

export async function removeEmbed(env, siteId, id) {
  const e = await env.DB.prepare('SELECT preview_photo_id FROM embeds WHERE id = ? AND site_id = ?').bind(id, siteId).first();
  if (!e) return;
  const s = [env.DB.prepare('DELETE FROM embeds WHERE id = ? AND site_id = ?').bind(id, siteId), touch(env, siteId)];
  if (e.preview_photo_id) s.push(env.DB.prepare('UPDATE photos SET removed_at = ? WHERE id = ? AND site_id = ?').bind(new Date().toISOString(), e.preview_photo_id, siteId));
  await env.DB.batch(s);
}

export async function moveEmbed(env, siteId, id, dir) {
  const e = await env.DB.prepare('SELECT place FROM embeds WHERE id = ? AND site_id = ?').bind(id, siteId).first();
  if (!e) return;
  const list = await listEmbeds(env, siteId, e.place);
  const i = list.findIndex((x) => x.id === id);
  const j = i + (dir < 0 ? -1 : 1);
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await env.DB.batch([...list.map((x, k) => env.DB.prepare('UPDATE embeds SET sort = ? WHERE id = ?').bind(k, x.id)), touch(env, siteId)]);
}

// A dog, litter or album removed: its embeds go too.
export const embedsOfStatement = (env, siteId, place) => env.DB.prepare('DELETE FROM embeds WHERE site_id = ? AND place = ?').bind(siteId, place);
