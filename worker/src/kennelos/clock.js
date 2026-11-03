// A litter isn't an archive (plan 5.3, decision 28). A litter off the site —
// switched off, unticked or gone from a KennelOS bundle, or marked Past without
// Keep — is kept LITTER_DAYS in case it was a mistake, listed in the manage app
// with the day it goes and a Keep button. Then the daily cleanup deletes it with
// its puppies, its albums, and the photos nothing else uses.
//
// A dog is never deleted by a clock: archiving a dog in KennelOS is housekeeping,
// most reasons to hide one are temporary, and its photos exist only here.
//
// left_site_at is kept true by litterClockStatements(), run after anything that
// can take a litter off or put it back (a save, a bundle, Unlink), and by the
// daily cleanup, which also starts the clock for litters already off the site on
// the day this ships.
export const LITTER_DAYS = 30;
const DAY = 86400000;

const OFF = "kept_at IS NULL AND (show_on_site = 0 OR hidden_by_kennelos = 1 OR stage = 'past')";

export function litterClockStatements(env, siteId, t = new Date().toISOString()) {
  const where = siteId ? 'site_id = ? AND ' : '';
  const args = siteId ? [siteId] : [];
  return [
    env.DB.prepare(`UPDATE litters SET left_site_at = ? WHERE ${where}left_site_at IS NULL AND ${OFF}`).bind(t, ...args),
    env.DB.prepare(`UPDATE litters SET left_site_at = NULL WHERE ${where}left_site_at IS NOT NULL AND NOT (${OFF})`).bind(...args),
  ];
}

export async function syncLitterClocks(env, siteId) {
  await env.DB.batch(litterClockStatements(env, siteId));
}

export const deletesOn = (leftAt) => new Date(Date.parse(leftAt) + LITTER_DAYS * DAY).toISOString().slice(0, 10);

// What the manage app lists: litters about to go, soonest first.
export async function leavingLitters(env, siteId) {
  const { results } = await env.DB.prepare('SELECT id, name, stage, left_site_at, source FROM litters WHERE site_id = ? AND left_site_at IS NOT NULL ORDER BY left_site_at').bind(siteId).all();
  return results.map((l) => ({ ...l, deletes_on: deletesOn(l.left_site_at) }));
}

// Keep (plan 5.3): the litter stays, as Past (off Home and the Puppies page, its
// own page still answering), until she removes it. On a linked site it becomes
// ordinary KennelPort content she can edit: KennelOS no longer sends a Sold or
// Closed litter.
export async function keepLitter(env, siteId, litterId) {
  const t = new Date().toISOString();
  const res = await env.DB.batch([
    env.DB.prepare(`UPDATE litters SET kept_at = ?, stage = 'past', show_on_site = 1, hidden_by_kennelos = 0, left_site_at = NULL,
      source = 'kennelport', kennelos_id = NULL, kennelos_kind = NULL, updated_at = ? WHERE id = ? AND site_id = ?`).bind(t, t, litterId, siteId),
    env.DB.prepare(`UPDATE puppies SET status = CASE WHEN hidden_by_kennelos = 1 THEN 'hidden' ELSE status END, hidden_by_kennelos = 0,
      source = 'kennelport', kennelos_id = NULL WHERE litter_id = ? AND site_id = ?`).bind(litterId, siteId),
    env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, siteId),
  ]);
  return res[0].meta.changes === 1;
}

// Photos a deleted litter takes with it: its puppies' and albums' photos and the
// ones tagged as of it or its puppies, unless something that stays uses them (a
// dog made from a kept puppy, another album, a Home block…).
async function photosToRemove(env, siteId, litterId) {
  const db = env.DB;
  const all = async (sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
  const pups = await all('SELECT id, photo_id FROM puppies WHERE site_id = ? AND litter_id = ?', siteId, litterId);
  const albums = await all('SELECT id, photos, cover_photo_id FROM albums WHERE site_id = ? AND litter_id = ?', siteId, litterId);
  const subjectsGoing = new Set([`litter:${litterId}`, ...pups.map((p) => `puppy:${p.id}`)]);
  const tagged = await all('SELECT photo_id, subject FROM photo_tags WHERE site_id = ?', siteId);
  const candidates = new Set([
    ...pups.map((p) => p.photo_id),
    ...albums.flatMap((a) => [a.cover_photo_id, ...JSON.parse(a.photos || '[]')]),
    ...tagged.filter((t) => subjectsGoing.has(t.subject)).map((t) => t.photo_id),
  ].filter(Boolean));
  if (!candidates.size) return [];

  const used = new Set(tagged.filter((t) => !subjectsGoing.has(t.subject)).map((t) => t.photo_id));
  const add = (rows, ...cols) => rows.forEach((r) => cols.forEach((c) => r[c] && used.add(r[c])));
  add(await all('SELECT photo_id FROM dogs WHERE site_id = ?', siteId), 'photo_id');
  add(await all('SELECT photo_id FROM puppies WHERE site_id = ? AND litter_id != ?', siteId, litterId), 'photo_id');
  add(await all('SELECT photo_id FROM extras WHERE site_id = ?', siteId), 'photo_id');
  add(await all('SELECT photo_id FROM stories WHERE site_id = ?', siteId), 'photo_id');
  add(await all('SELECT preview_photo_id FROM embeds WHERE site_id = ?', siteId), 'preview_photo_id');
  add(await all('SELECT logo_photo_id FROM sites WHERE id = ?', siteId), 'logo_photo_id');
  for (const a of await all('SELECT photos, cover_photo_id FROM albums WHERE site_id = ? AND (litter_id IS NULL OR litter_id != ?)', siteId, litterId)) {
    if (a.cover_photo_id) used.add(a.cover_photo_id);
    for (const id of JSON.parse(a.photos || '[]')) used.add(id);
  }
  // Home blocks and pages name photos inside their JSON.
  const text = [...await all('SELECT content FROM home_blocks WHERE site_id = ?', siteId), ...await all('SELECT content FROM site_pages WHERE site_id = ?', siteId)].map((r) => r.content).join(' ');
  return [...candidates].filter((id) => !used.has(id) && !text.includes(id));
}

// Delete one litter for good: its puppies, albums, videos and the photos only it used.
export async function deleteLitter(env, siteId, litterId) {
  const db = env.DB;
  const photos = await photosToRemove(env, siteId, litterId);
  const t = new Date().toISOString();
  const albums = (await db.prepare('SELECT id FROM albums WHERE site_id = ? AND litter_id = ?').bind(siteId, litterId).all()).results;
  await db.batch([
    db.prepare("DELETE FROM photo_tags WHERE site_id = ? AND subject IN (SELECT 'puppy:' || id FROM puppies WHERE site_id = ? AND litter_id = ?)").bind(siteId, siteId, litterId),
    db.prepare('DELETE FROM photo_tags WHERE site_id = ? AND subject = ?').bind(siteId, `litter:${litterId}`),
    db.prepare('DELETE FROM embeds WHERE site_id = ? AND place = ?').bind(siteId, `litter:${litterId}`),
    ...albums.map((a) => db.prepare('DELETE FROM embeds WHERE site_id = ? AND place = ?').bind(siteId, `album:${a.id}`)),
    db.prepare('DELETE FROM albums WHERE site_id = ? AND litter_id = ?').bind(siteId, litterId),
    db.prepare('DELETE FROM puppies WHERE site_id = ? AND litter_id = ?').bind(siteId, litterId),
    db.prepare("DELETE FROM link_pending WHERE site_id = ? AND kind = 'litters' AND kennelport_id = ?").bind(siteId, litterId),
    db.prepare('DELETE FROM litters WHERE id = ? AND site_id = ?').bind(litterId, siteId),
    ...photos.map((id) => db.prepare('UPDATE photos SET removed_at = ? WHERE id = ? AND site_id = ? AND removed_at IS NULL').bind(t, id, siteId)),
  ]);
  return photos;
}

// The daily cleanup's part: start clocks, then delete litters past their 30 days.
// Returns the ids of the photos removed with them, so their files go tonight.
export async function expireLitters(env, now = new Date(), limit = 50) {
  await env.DB.batch(litterClockStatements(env, null, now.toISOString()));
  const cutoff = new Date(now.getTime() - LITTER_DAYS * DAY).toISOString();
  const { results } = await env.DB.prepare(`SELECT l.id, l.site_id FROM litters l JOIN sites s ON s.id = l.site_id
    WHERE l.left_site_at IS NOT NULL AND l.left_site_at < ? AND l.kept_at IS NULL AND s.status != 'closed' ORDER BY l.left_site_at LIMIT ?`).bind(cutoff, limit).all();
  const photos = [];
  for (const l of results) photos.push(...await deleteLitter(env, l.site_id, l.id));
  return { litters: results.length, photos };
}
