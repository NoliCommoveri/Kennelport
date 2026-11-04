// The daily cleanup (wrangler.toml crons): what KennelPort promises not to keep.
// - messages from the contact form after 90 days (decision 12);
// - families marked fulfilled on the simple waitlist, 90 days after (plan 3.8);
// - notification records after 8 days (push.js);
// - rate-limit counters, expired codes and sessions, the staging outbox after a week;
// - removed photos' files in R2, a day after removal, once no kept version of the
//   site (the live one, or one Undo publish could go back to) uses them;
// - litters 30 days after they left the site, unless kept (plan 5.3), with their
//   puppies, albums and the photos nothing else uses, whose files go the same night;
// - the puppy portal's deleted families, 30 days after (undoable until then), used
//   one-tap links after a day, expired family codes and sessions (portal/account.js).
import { loadSnapshot } from './publish.js';
import { expireLitters } from './kennelos/clock.js';
import { chunks, placeholders } from './lib/sql.js';
import { runPortalDaily } from './portal/account.js';

export const INQUIRY_DAYS = 90;
const DAY = 86400000;
// Per run, so one cleanup stays well inside a Worker's subrequest limit; the
// rest go the next day.
export const PURGE_PER_RUN = 500;

export async function runCleanup(env, now = new Date()) {
  const before = (days) => new Date(now.getTime() - days * DAY).toISOString();
  const results = await env.DB.batch([
    env.DB.prepare('DELETE FROM inquiries WHERE received_at < ?').bind(before(INQUIRY_DAYS)),
    env.DB.prepare('DELETE FROM notify_items WHERE at < ?').bind(before(8)),
    env.DB.prepare("DELETE FROM waitlist_entries WHERE status = 'fulfilled' AND done_at < ?").bind(before(INQUIRY_DAYS)),
    env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(before(2)),
    env.DB.prepare('DELETE FROM login_codes WHERE expires_at < ?').bind(now.toISOString()),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ? OR revoked_at < ?').bind(now.toISOString(), before(30)),
    env.DB.prepare('DELETE FROM dev_outbox WHERE created_at < ?').bind(before(7)),
  ]);
  const litters = await expireLitters(env, now);
  const portal = await runPortalDaily(env, now);
  const photos = await purgeRemovedPhotos(env, before(1)) + (litters.photos.length ? await purgeRemovedPhotos(env, null, PURGE_PER_RUN, litters.photos) : 0);
  return { inquiries: results[0].meta.changes, photos, litters: litters.litters, portal_deleted: portal.deleted };
}

// Delete the R2 files of photos removed before `cutoff`, skipping any that a kept
// snapshot still lists (the live site serves photos from its snapshot, and Undo
// publish can go back to an older one). Those wait until the snapshots naming
// them are replaced or pruned. Returns how many photos' files were deleted.
// With `ids`, just those photos, whenever they were removed.
export async function purgeRemovedPhotos(env, cutoff, limit = PURGE_PER_RUN, ids = null) {
  const removed = [];
  if (ids) {
    // In slices: D1 takes at most 100 parameters a statement.
    for (const part of chunks(ids)) {
      if (removed.length >= limit) break;
      removed.push(...(await env.DB.prepare(`SELECT id, site_id, r2_key, thumb_key FROM photos WHERE removed_at IS NOT NULL AND purged_at IS NULL AND id IN (${placeholders(part)}) LIMIT ?`).bind(...part, limit - removed.length).all()).results);
    }
  } else {
    removed.push(...(await env.DB.prepare(
      'SELECT id, site_id, r2_key, thumb_key FROM photos WHERE removed_at IS NOT NULL AND removed_at < ? AND purged_at IS NULL ORDER BY removed_at LIMIT ?',
    ).bind(cutoff, limit).all()).results);
  }
  if (!removed.length) return 0;

  const inUse = new Set();
  for (const siteId of new Set(removed.map((p) => p.site_id))) {
    const { results: snaps } = await env.DB.prepare('SELECT id FROM snapshots WHERE site_id = ?').bind(siteId).all();
    for (const s of snaps) {
      const snap = await loadSnapshot(env, siteId, s.id);
      for (const id of Object.keys(snap?.photos ?? {})) inUse.add(id);
    }
  }

  const gone = removed.filter((p) => !inUse.has(p.id));
  if (!gone.length) return 0;
  const keys = gone.flatMap((p) => (p.thumb_key ? [p.r2_key, p.thumb_key] : [p.r2_key]));
  for (let i = 0; i < keys.length; i += 1000) await env.FILES.delete(keys.slice(i, i + 1000));
  const t = new Date().toISOString();
  await env.DB.batch(gone.map((p) => env.DB.prepare('UPDATE photos SET purged_at = ? WHERE id = ?').bind(t, p.id)));
  return gone.length;
}
