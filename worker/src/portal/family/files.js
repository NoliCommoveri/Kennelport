// Files and photos on the family portal: a photo of their puppy, a file the breeder
// shared, and a program's link (counted, then sent on). Routed by portal/family.js;
// each checks the family may see it.
import { puppyPhotos, active } from './parts.js';
import { getFile, fileResponse, placementFor } from '../store.js';
import { noteClick } from '../steps.js';

export async function servePhoto(env, site, fam, id, thumb) {
  const { results: ps } = await env.DB.prepare('SELECT puppy_id FROM portal_placements WHERE site_id = ? AND family_id = ?').bind(site.id, fam.familyId).all();
  let mine = false;
  for (const p of ps) if (!mine) mine = (await puppyPhotos(env, site.id, p.puppy_id)).some((ph) => ph.id === id);
  const row = mine ? await env.DB.prepare('SELECT r2_key, thumb_key, type FROM photos WHERE id = ? AND site_id = ?').bind(id, site.id).first() : null;
  const obj = row && await env.FILES.get(thumb && row.thumb_key ? row.thumb_key : row.r2_key);
  if (!obj) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(obj.body, { headers: { 'content-type': row.type || 'image/webp', 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
}

export async function serveFile(env, site, fam, id) {
  const file = await getFile(env, site.id, id);
  const p = file && await env.DB.prepare('SELECT family_id FROM portal_placements WHERE id = ? AND site_id = ?').bind(file.placement_id, site.id).first();
  if (!p || p.family_id !== fam.familyId || file.kind === 'record') return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return fileResponse(env, file);
}

// Where a click came from, for her report of which placements work (plan 12.1).
export const PLACES = new Set(['home', 'records', 'vet', 'timeline', 'checklist', 'food']);

export async function goToProgram(env, site, fam, id, from) {
  const x = await env.DB.prepare('SELECT id, link_url FROM products WHERE id = ? AND site_id = ? AND portal_show = 1').bind(id, site.id).first();
  if (!x?.link_url || !/^https:\/\//i.test(x.link_url)) return new Response('Not found', { status: 404 });
  // Her taps while seeing their portal (plan family-view.md) aren't theirs: not counted.
  if (!fam.viewing) {
    await env.DB.prepare('INSERT INTO portal_clicks (site_id, family_id, product_id, place, at) VALUES (?, ?, ?, ?, ?)')
      .bind(site.id, fam.familyId, x.id, PLACES.has(from) ? from : 'other', new Date().toISOString()).run();
    const p = await placementFor(env, site.id, fam.familyId);
    if (p && active(p)) await noteClick(env, site.id, p, x.id);
  }
  return new Response(null, { status: 302, headers: { location: x.link_url, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}
