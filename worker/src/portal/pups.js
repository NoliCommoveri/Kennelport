// A family's puppy, kept after its litter leaves the website
// (docs/plans/portal-kept-pups.md). The website's puppies and litters go 30 days
// after a litter closes (kennelos/clock.js), or at once with Remove now, or when
// she removes them; a family with a portal keeps what their pages show of their
// puppy: a copy of its details (portal_pups) and its photos (portal_pup_photos).
//
// keepStatements() refreshes both for every placement of a family with a portal
// whose website puppy is still there. Every way a puppy, a litter or a photo is
// deleted runs it first, in the same batch. The family's pages read the website's
// puppy while it's there and the copy once it's gone (pupOf, photosOf), so nothing
// they see changes. The copy is not a litter: none of her lists read it.
import { puppyFor } from './store.js';
import { puppyPhotos } from './family/parts.js';

// The placements kept: any of a family not deleted for good or erased. A family
// deleted within the undo days is kept too, so Undo brings everything back.
const KEPT = `SELECT pl.id FROM portal_placements pl JOIN portal_families f ON f.id = pl.family_id
  WHERE pl.site_id = ? AND f.site_id = pl.site_id AND f.status = 'active'`;

// The statements that copy every kept placement's puppy and pin its photos, for
// the front of a batch that deletes puppies, litters or photos.
export function keepStatements(env, siteId, at = new Date().toISOString()) {
  return [
    env.DB.prepare(`INSERT INTO portal_pups (placement_id, site_id, name, sex, color, registration, registry, photo_id, litter_name, born_on, ready_on, dam_name, sire_name, dam_call, sire_call, kept_at)
      SELECT pl.id, pl.site_id, p.name, p.sex, p.color, p.registration, p.registry, p.photo_id, l.name, l.born_on, l.ready_on, l.dam_name, l.sire_name, dam.call_name, sire.call_name, ?
      FROM portal_placements pl JOIN puppies p ON p.id = pl.puppy_id AND p.site_id = pl.site_id JOIN litters l ON l.id = p.litter_id
        LEFT JOIN dogs dam ON dam.id = l.dam_id LEFT JOIN dogs sire ON sire.id = l.sire_id
      WHERE pl.id IN (${KEPT})
      ON CONFLICT (placement_id) DO UPDATE SET name = excluded.name, sex = excluded.sex, color = excluded.color, registration = excluded.registration,
        registry = excluded.registry, photo_id = COALESCE(excluded.photo_id, portal_pups.photo_id), litter_name = excluded.litter_name, born_on = excluded.born_on,
        ready_on = excluded.ready_on, dam_name = excluded.dam_name, sire_name = excluded.sire_name, dam_call = excluded.dam_call, sire_call = excluded.sire_call,
        kept_at = excluded.kept_at`).bind(at, siteId),
    // Its photos as the family sees them now (puppyPhotos): its main photo and any tagged with it.
    env.DB.prepare(`INSERT OR IGNORE INTO portal_pup_photos (placement_id, site_id, photo_id, kept_at)
      SELECT pl.id, pl.site_id, ph.id, ? FROM portal_placements pl JOIN puppies p ON p.id = pl.puppy_id AND p.site_id = pl.site_id
        JOIN photos ph ON ph.site_id = pl.site_id AND ph.removed_at IS NULL
          AND (ph.id = p.photo_id OR ph.id IN (SELECT photo_id FROM photo_tags t WHERE t.site_id = pl.site_id AND t.subject = 'puppy:' || p.id))
      WHERE pl.id IN (${KEPT})`).bind(at, siteId),
  ];
}

// What a family's placement goes with when the placement or family is deleted for good.
export function forgetStatements(env, placementIdsSql, ...binds) {
  return [
    env.DB.prepare(`DELETE FROM portal_pup_photos WHERE placement_id IN (${placementIdsSql})`).bind(...binds),
    env.DB.prepare(`DELETE FROM portal_pups WHERE placement_id IN (${placementIdsSql})`).bind(...binds),
  ];
}

// The pinned photos: the nightly cleanup leaves their files. One she removed from a
// family's portal pins nothing for that family.
export async function keptPhotoIds(env, siteId) {
  return new Set((await env.DB.prepare('SELECT DISTINCT photo_id FROM portal_pup_photos WHERE site_id = ? AND removed_at IS NULL').bind(siteId).all()).results.map((r) => r.photo_id));
}

// A photo she removes from one family's portal (a photo of the wrong pup, say): kept
// as a row with removed_at, so the family stops seeing it whether the website still
// shows it on their puppy or not, and keepStatements' INSERT OR IGNORE never brings it
// back. Put back clears it.
export async function removePhoto(env, siteId, placementId, photoId, at = new Date().toISOString()) {
  await env.DB.prepare(`INSERT INTO portal_pup_photos (placement_id, site_id, photo_id, kept_at, removed_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (placement_id, photo_id) DO UPDATE SET removed_at = excluded.removed_at`).bind(placementId, siteId, photoId, at, at).run();
}
export async function putBackPhoto(env, siteId, placementId, photoId) {
  await env.DB.prepare('UPDATE portal_pup_photos SET removed_at = NULL WHERE placement_id = ? AND site_id = ? AND photo_id = ?').bind(placementId, siteId, photoId).run();
}

// The photos she removed from this placement's portal that can still be put back.
export async function removedPhotosOf(env, siteId, p) {
  if (!p) return [];
  return (await env.DB.prepare(`SELECT ph.id, ph.alt FROM portal_pup_photos k JOIN photos ph ON ph.id = k.photo_id AND ph.site_id = k.site_id
    WHERE k.placement_id = ? AND k.site_id = ? AND k.removed_at IS NOT NULL AND ph.purged_at IS NULL ORDER BY k.removed_at DESC LIMIT 60`).bind(p.id, siteId).all()).results;
}

// The placement's puppy, as puppyFor gives it: the website's while it's there,
// else the copy (no id or litter_id: there's nothing on the website to link to).
export async function pupOf(env, siteId, p) {
  if (!p) return null;
  const live = await puppyFor(env, siteId, p.puppy_id);
  if (live) return live;
  const k = await env.DB.prepare('SELECT * FROM portal_pups WHERE placement_id = ? AND site_id = ?').bind(p.id, siteId).first();
  if (!k) return null;
  return {
    id: null, litter_id: null, kept: true, name: k.name, sex: k.sex, color: k.color, registration: k.registration, registry: k.registry, photo_id: k.photo_id,
    litter_name: k.litter_name, born_on: k.born_on, ready_on: k.ready_on, dam_name: k.dam_name, sire_name: k.sire_name, dam_call: k.dam_call, sire_call: k.sire_call,
  };
}

// The placement's photos: the website's as they are now, then any kept that the
// website no longer shows (removed there, or gone with the litter), less any she
// removed from this family's portal. The main photo first.
export async function photosOf(env, siteId, p) {
  if (!p) return [];
  const live = await puppyPhotos(env, siteId, p.puppy_id);
  const { results: rows } = await env.DB.prepare(`SELECT ph.id, ph.alt, k.removed_at FROM portal_pup_photos k JOIN photos ph ON ph.id = k.photo_id AND ph.site_id = k.site_id
    WHERE k.placement_id = ? AND k.site_id = ? AND ph.purged_at IS NULL
    ORDER BY ph.id = (SELECT photo_id FROM portal_pups WHERE placement_id = k.placement_id) DESC, ph.created_at DESC LIMIT 120`).bind(p.id, siteId).all();
  // Any she removed from this family's portal (removePhoto) stays out, even while the website shows it.
  const seen = new Set(rows.filter((x) => x.removed_at).map((x) => x.id));
  const kept = rows.filter((x) => !x.removed_at).map(({ id, alt }) => ({ id, alt }));
  const out = live.filter((x) => !seen.has(x.id));
  for (const x of out) seen.add(x.id);
  for (const x of kept) if (!seen.has(x.id)) { seen.add(x.id); out.push(x); }
  return out.slice(0, 60);
}
