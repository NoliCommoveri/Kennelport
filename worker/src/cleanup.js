// The daily cleanup (wrangler.toml crons): what KennelPort promises not to keep.
// - messages from the contact form after 90 days (decision 12);
// - families marked fulfilled on the simple waitlist, 90 days after (plan 3.8);
// - notification records after 8 days (push.js);
// - rate-limit counters, expired codes and sessions, the staging outbox after a week.
export const INQUIRY_DAYS = 90;
const DAY = 86400000;

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
  return { inquiries: results[0].meta.changes };
}
