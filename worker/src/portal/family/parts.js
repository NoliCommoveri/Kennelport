// Small pieces the family portal shares (portal/family.js and the parts split out
// beside it): whether a placement is active, and a puppy's photos.


// The puppy's photos: her main photo for it, then any she tagged with it.
export async function puppyPhotos(env, siteId, puppyId) {
  if (!puppyId) return [];
  const { results } = await env.DB.prepare(`SELECT ph.id, ph.alt FROM photos ph WHERE ph.site_id = ? AND ph.removed_at IS NULL AND (
      ph.id = (SELECT photo_id FROM puppies WHERE id = ?) OR ph.id IN (SELECT photo_id FROM photo_tags WHERE site_id = ? AND subject = ?))
    ORDER BY ph.id = (SELECT photo_id FROM puppies WHERE id = ?) DESC, ph.created_at DESC LIMIT 60`).bind(siteId, puppyId, siteId, `puppy:${puppyId}`, puppyId).all();
  return results;
}

// Whether the checklist, timeline and programs show: not for a placement closed or
// for a puppy no longer with the family (the loss page comes with chunk 4).
export const active = (p) => p.status === 'open' && p.life_status === 'with_family';
