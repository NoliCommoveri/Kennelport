// The daily cleanup (wrangler.toml crons): what KennelPort promises not to keep.
// - messages from the contact form after 90 days (decision 12);
// - families marked fulfilled on the simple waitlist, 90 days after (plan 3.8);
// - notification records after 8 days (push.js);
// - rate-limit counters, expired codes and sessions, the staging outbox after a week;
// - removed photos' files in R2, a day after removal, once no kept version of the
//   site (the live one, or one Undo publish could go back to) uses them.
import { loadSnapshot } from './publish.js';

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
  const photos = await purgeRemovedPhotos(env, before(1));
  return { inquiries: results[0].meta.changes, photos };
}

// Delete the R2 files of photos removed before `cutoff`, skipping any that a kept
// snapshot still lists (the live site serves photos from its snapshot, and Undo
// publish can go back to an older one). Those wait until the snapshots naming
// them are replaced or pruned. Returns how many photos' files were deleted.
export async function purgeRemovedPhotos(env, cutoff, limit = PURGE_PER_RUN) {
  const { results: removed } = await env.DB.prepare(
    'SELECT id, site_id, r2_key, thumb_key FROM photos WHERE removed_at IS NOT NULL AND removed_at < ? AND purged_at IS NULL ORDER BY removed_at LIMIT ?',
  ).bind(cutoff, limit).all();
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
