// The KennelOS website feed (plan 3.8, 5.5): a kennel's public waitlist, and her
// application form while she takes applications online, read from KennelOS's
// GET /f/site/<public_id> for the site's waitlist page.
//
// - KENNELOS_ORIGIN (wrangler.toml) is KennelOS's family host, the only place a
//   feed is read from. The breeder pastes the feed address from KennelOS's Online
//   list card; only its kennel id (sites.kennelos_public_id) is kept.
// - A copy is kept five minutes (feed_cache). When KennelOS can't be reached the
//   last copy is shown with its date, and KennelOS is asked again at most once a
//   minute.
// - Nothing is ever sent to KennelOS but the kennel id in the address.
import { isDemoSite } from './lib/demo.js';
export const FEED_FRESH_MS = 5 * 60 * 1000;
export const FEED_RETRY_MS = 60 * 1000;
export const FEED_TIMEOUT_MS = 4000;
const FEED_MAX_BYTES = 512 * 1024;
export const PUBLIC_ID = /^kos1_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class FeedError extends Error {}

export const kennelosOrigin = (env) => (env.KENNELOS_ORIGIN ? String(env.KENNELOS_ORIGIN).replace(/\/+$/, '') : null);

// What the breeder pastes: the feed address (…/f/site/<id>), or her list or
// application page's address, or the bare id. → the kennel id.
export function parseFeedAddress(env, text) {
  const v = String(text ?? '').trim();
  if (PUBLIC_ID.test(v)) return v;
  let u;
  try { u = new URL(v); } catch { throw new FeedError("Paste the website feed address from KennelOS's Online list card."); }
  const origin = kennelosOrigin(env);
  if (!origin || u.origin !== origin) throw new FeedError(`That isn't a KennelOS address. It starts ${origin ?? 'with the KennelOS address'}.`);
  const m = u.pathname.match(/^\/(?:f\/site|list|apply)\/([^/]+)$/);
  const id = m && decodeURIComponent(m[1]);
  if (!id || !PUBLIC_ID.test(id)) throw new FeedError("That KennelOS address doesn't name a kennel. Copy the website feed address from the Online list card.");
  return id;
}

async function save(env, siteId, row) {
  await env.DB.prepare(`INSERT INTO feed_cache (site_id, state, body, fetched_at, checked_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (site_id) DO UPDATE SET state = excluded.state, body = excluded.body, fetched_at = excluded.fetched_at, checked_at = excluded.checked_at`)
    .bind(siteId, row.state, row.body ?? null, row.fetched_at ?? null, row.checked_at).run();
}

const decode = (row, extra = {}) => {
  if (row.state !== 'ok') return { state: row.state, ...extra };
  try { return { state: 'ok', feed: JSON.parse(row.body), fetched_at: row.fetched_at, ...extra }; } catch { return { state: 'unreachable' }; }
};

// → { state: 'ok', feed, fetched_at, stale? } | { state: 'not_shared' | 'not_found' | 'unreachable' },
// with origin and publicId; or null when the site has no feed.
export async function readFeed(env, siteId, publicId, { now = Date.now() } = {}) {
  const origin = kennelosOrigin(env);
  if (!origin || !publicId || !PUBLIC_ID.test(publicId)) return null;
  // The demo's waitlist id is the sample's, made up: KennelOS is never asked for it.
  if (await isDemoSite(env, siteId)) return null;
  const where = { origin, publicId };
  const row = await env.DB.prepare('SELECT state, body, fetched_at, checked_at FROM feed_cache WHERE site_id = ?').bind(siteId).first();
  if (row) {
    // A copy kept after a failed read is retried after a minute, a good one after five.
    const age = now - Date.parse(row.checked_at);
    const kept = row.state === 'ok' && row.fetched_at !== row.checked_at;
    if (age < (kept ? FEED_RETRY_MS : FEED_FRESH_MS)) return { ...decode(row, { stale: kept }), ...where };
  }

  const checked = new Date(now).toISOString();
  let res = null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), FEED_TIMEOUT_MS);
    try {
      res = await (env.KENNELOS_FETCH ?? fetch)(`${origin}/f/site/${encodeURIComponent(publicId)}`, { headers: { accept: 'application/json' }, signal: ctl.signal });
    } finally { clearTimeout(timer); }
  } catch { res = null; }

  if (res?.ok) {
    const text = await res.text();
    let feed = null;
    try { feed = text.length <= FEED_MAX_BYTES ? JSON.parse(text) : null; } catch { feed = null; }
    if (feed && typeof feed === 'object' && !Array.isArray(feed)) {
      await save(env, siteId, { state: 'ok', body: text, fetched_at: checked, checked_at: checked });
      return { state: 'ok', feed, fetched_at: checked, ...where };
    }
  } else if (res?.status === 404) {
    const error = (await res.json().catch(() => ({})))?.error;
    const state = error === 'not_shared' ? 'not_shared' : 'not_found';
    await save(env, siteId, { state, checked_at: checked });
    return { state, ...where };
  }
  // Unreachable, busy or broken: the last copy, if there is one, marked stale.
  if (row?.state === 'ok' && row.body) {
    await save(env, siteId, { ...row, checked_at: checked });
    return { ...decode(row, { stale: true }), ...where };
  }
  return { state: 'unreachable', ...where };
}

export async function setFeed(env, siteId, publicId) {
  await env.DB.batch([
    // The Family login link comes with the next publish.
    env.DB.prepare('UPDATE sites SET kennelos_public_id = ?, draft_changed_at = ? WHERE id = ?').bind(publicId, new Date().toISOString(), siteId),
    env.DB.prepare('DELETE FROM feed_cache WHERE site_id = ?').bind(siteId),
  ]);
}

// What the manage app needs to know to steer the breeder (plan 3.8): linked to a
// KennelOS waitlist at all (then the simple waitlist isn't used), and whether
// KennelOS takes applications online (then the site's own questions aren't used).
export async function kennelosState(env, siteId) {
  const row = await env.DB.prepare('SELECT kennelos_public_id FROM sites WHERE id = ?').bind(siteId).first();
  if (!row?.kennelos_public_id || !kennelosOrigin(env)) return { linked: false, online: false, offered: Boolean(kennelosOrigin(env)) };
  const f = await readFeed(env, siteId, row.kennelos_public_id);
  return { linked: true, online: Boolean(f?.feed?.form), state: f?.state ?? 'unreachable', offered: true };
}
