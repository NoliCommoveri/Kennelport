// Linking a site to KennelOS (plan 5.2): the one-time code the manage app shows,
// the device token KennelOS gets for it, and unlinking.
//
// - A code is eight characters from an alphabet with no look-alikes (no 0/O,
//   1/I/L), good for a quarter of an hour, once. Owners and editors, and a site may ask
//   for LIMITS.codes an hour. Kept as a keyed hash, like a sign-in code.
// - Redeeming one (POST api.kennelport.com/v1/link) is limited per IP, makes a
//   `links` row for that device and answers its token, which is kept only as its
//   SHA-256. Each device links once (decision 11) and is stopped on its own.
// - One kennel to one site: every device on a site must be the same KennelOS
//   kennel; a code redeemed from another is refused.
// - Unlink stops every device and turns everything that came from KennelOS into
//   ordinary KennelPort content, exactly as it stands in the draft.
import { hmacHex, sha256Hex, randomHex } from '../lib/crypto.js';
import { SECTIONS } from './bundle.js';
import { ApiError } from '../lib/http.js';
import { isDemoSite, NOT_FOR_DEMO } from '../lib/demo.js';

export const CODE_TTL_MS = 15 * 60 * 1000;
export const CODE_LENGTH = 8;
export const LIMITS = { codes: 10, redeem_ip: 20 };
// 31 characters with no look-alikes.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export class LinkError extends Error {}

const hourWindow = (now) => `${now.toISOString().slice(0, 13)}:00:00Z`;
async function bump(env, bucket) {
  return env.DB.prepare(`INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1 RETURNING count`).bind(bucket, hourWindow(new Date())).first('count');
}

function key(env) {
  if (!env.EMAIL_HMAC_KEY) throw new LinkError('Linking isn\'t set up on KennelPort yet.');
  return env.EMAIL_HMAC_KEY;
}

// What a breeder types: case and the dash don't matter.
export const normalizeCode = (raw) => String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
export const showCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

function randomLinkCode() {
  const buf = new Uint8Array(CODE_LENGTH * 2);
  crypto.getRandomValues(buf);
  let out = '';
  // CODE_CHARS has 31 characters: bytes from 248 up are redrawn (skipped).
  for (const b of buf) {
    if (b >= 248) continue;
    out += CODE_CHARS[b % 31];
    if (out.length === CODE_LENGTH) return out;
  }
  return randomLinkCode();
}

const codeHash = (env, code) => hmacHex(key(env), `link:${code}`);

// A new code for this site. Earlier unused ones stop working: one at a time.
export async function makeLinkCode(env, siteId, createdBy) {
  key(env);
  // The demo is linked to the sample only (kennelos/demo.js).
  if (await isDemoSite(env, siteId)) throw new LinkError(NOT_FOR_DEMO);
  if (await bump(env, `linkcode:${siteId}`) > LIMITS.codes) throw new LinkError('Too many codes asked for. Try again in an hour.');
  const code = randomLinkCode();
  const t = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM link_codes WHERE site_id = ? AND used_at IS NULL').bind(siteId),
    env.DB.prepare('INSERT INTO link_codes (code_hash, site_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await codeHash(env, code), siteId, createdBy, new Date(t).toISOString(), new Date(t + CODE_TTL_MS).toISOString()),
  ]);
  return { code, expiresAt: new Date(t + CODE_TTL_MS).toISOString() };
}

export const siteAddress = (env, subdomain, path = '/') => `https://${subdomain}.${env.ROOT_DOMAIN}${path}`;

// The site's main address: her own domain once it's active (plan 2.4), else its
// kennelport.com one. What KennelOS is given, so its links don't go through a redirect.
export async function siteBase(env, site) {
  const domain = await env.DB.prepare("SELECT hostname FROM custom_domains WHERE site_id = ? AND status = 'active'").bind(site.id).first('hostname');
  return domain ? `https://${domain}` : `https://${site.subdomain}.${env.ROOT_DOMAIN}`;
}

// KennelOS's Connect website: the code, the kennel it's for, a name for the
// device. → the token, and what KennelOS needs to set up the rest (plan 5.2 step 2).
export async function redeemCode(env, request, body) {
  const ip = await hmacHex(key(env), `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`);
  if (await bump(env, `linkip:${ip}`) > LIMITS.redeem_ip) throw new ApiError(429, 'rate_limited', { message: 'Too many tries. Try again in an hour.' });
  const code = normalizeCode(body.code);
  const kennel = String(body.kennel_id ?? '').trim();
  const label = String(body.device_label ?? '').replace(/\s+/g, ' ').trim().slice(0, 60) || null;
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new ApiError(400, 'bad_code', { message: 'A link code is eight letters and numbers, like ABCD-2345.' });
  if (!/^[\w.:-]{1,80}$/.test(kennel)) throw new ApiError(400, 'bad_kennel', { message: 'The kennel id is missing.' });

  const hash = await codeHash(env, code);
  const row = await env.DB.prepare('SELECT site_id, expires_at, used_at FROM link_codes WHERE code_hash = ?').bind(hash).first();
  if (!row || row.used_at || row.expires_at <= new Date().toISOString()) {
    throw new ApiError(400, 'invalid_code', { message: 'That code isn\'t right or has expired. In KennelPort Site Manager, open Link KennelOS for a new one.' });
  }
  const site = await env.DB.prepare("SELECT id, subdomain, kennel_name, status, use_kennelos_prices, portal_on FROM sites WHERE id = ? AND status != 'closed'").bind(row.site_id).first();
  if (!site) throw new ApiError(400, 'invalid_code', { message: 'That website is no longer on KennelPort.' });
  const other = await env.DB.prepare('SELECT kennelos_kennel_id FROM links WHERE site_id = ? AND revoked_at IS NULL AND kennelos_kennel_id != ? LIMIT 1').bind(site.id, kennel).first();
  if (other) throw new ApiError(409, 'other_kennel', { message: 'This website is already linked to another of your kennels. Each kennel links to its own website.' });
  const burned = await env.DB.prepare('UPDATE link_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL').bind(new Date().toISOString(), hash).run();
  if (burned.meta.changes !== 1) throw new ApiError(400, 'invalid_code', { message: 'That code has already been used.' });

  const token = `kpl_${randomHex(32)}`;
  const t = new Date().toISOString();
  await env.DB.prepare('INSERT INTO links (id, site_id, kennelos_kennel_id, token_hash, device_label, linked_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), site.id, kennel, await sha256Hex(token), label, t, t).run();
  return { token, site: await siteFacts(env, site) };
}

// What KennelOS fills in from the link (plan 5.5): the kennel's website, and
// whether its waitlist page wants her public list, so Connect website sets the
// feed up too.
export async function siteFacts(env, site) {
  const waitlist = await env.DB.prepare("SELECT enabled FROM site_pages WHERE site_id = ? AND page = 'waitlist'").bind(site.id).first('enabled');
  const extras = await env.DB.prepare("SELECT enabled FROM site_pages WHERE site_id = ? AND page = 'extras'").bind(site.id).first('enabled');
  const base = await siteBase(env, site);
  return {
    name: site.kennel_name || site.subdomain,
    website: `${base}/`,
    extras_info_url: extras === 0 ? null : `${base}/extras`,
    waitlist_page: waitlist !== 0,
    // Use my KennelOS prices (decision 6): KennelOS sends its prices, which it keeps
    // private, only while this is on.
    kennelos_prices: Boolean(site.use_kennelos_prices),
    // The optional bundle sections this Worker takes (bundle.js SECTIONS).
    sections: SECTIONS,
    // What KennelOS may set here (POST /v1/settings), so it asks only a Worker that takes it.
    settings: ['kennelos_prices'],
    // The puppy portal is on: KennelOS sends the family feed (POST /v1/portal, format 1).
    portal_feed: site.portal_on ? 1 : null,
  };
}

// Use my KennelOS prices, from the manage app's switch or from KennelOS (POST
// /v1/settings). Switching it on also turns on Show prices for the litters KennelOS
// sends, so its prices show without a trip to each litter; off leaves them as
// they are.
export async function setKennelosPrices(env, siteId, on) {
  const before = await env.DB.prepare('SELECT use_kennelos_prices FROM sites WHERE id = ?').bind(siteId).first('use_kennelos_prices');
  const t = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE sites SET use_kennelos_prices = ?, draft_changed_at = ? WHERE id = ?').bind(on ? 1 : 0, t, siteId),
    ...(on && !before ? [env.DB.prepare("UPDATE litters SET show_prices = 1, updated_at = ? WHERE site_id = ? AND source = 'kennelos' AND kennelos_kind = 'litter' AND show_prices = 0").bind(t, siteId)] : []),
  ]);
}

// The device a request comes from, by its bearer token. A token that isn't
// known, or was stopped, is 401 not_linked: KennelOS then says the website is no
// longer linked and offers to connect again.
export async function deviceFor(env, request) {
  const m = /^Bearer\s+(kpl_[0-9a-f]{64})$/.exec(request.headers.get('authorization') ?? '');
  if (!m) throw new ApiError(401, 'not_linked', { message: 'This device isn\'t linked to a KennelPort website.' });
  const row = await env.DB.prepare(`SELECT l.*, s.subdomain, s.kennel_name, s.status AS site_status FROM links l JOIN sites s ON s.id = l.site_id
    WHERE l.token_hash = ?`).bind(await sha256Hex(m[1])).first();
  if (!row || row.revoked_at || row.site_status === 'closed') throw new ApiError(401, 'not_linked', { message: 'Your website is no longer linked. Connect it again with a new code from KennelPort Site Manager.' });
  await env.DB.prepare('UPDATE links SET last_seen_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
  return row;
}

// ---------- the manage app's side ----------

export async function devices(env, siteId) {
  return (await env.DB.prepare('SELECT id, kennelos_kennel_id, device_label, linked_at, last_seen_at, last_bundle_at, last_bundle_summary FROM links WHERE site_id = ? AND revoked_at IS NULL ORDER BY linked_at').bind(siteId).all()).results
    .map((d) => ({ ...d, summary: d.last_bundle_summary ? JSON.parse(d.last_bundle_summary) : null }));
}

export async function isLinked(env, siteId) {
  return Boolean(await env.DB.prepare('SELECT 1 FROM links WHERE site_id = ? AND revoked_at IS NULL LIMIT 1').bind(siteId).first());
}

// Stop one device. The last one stopping is an Unlink.
export async function stopDevice(env, siteId, linkId) {
  await env.DB.prepare('UPDATE links SET revoked_at = ? WHERE id = ? AND site_id = ? AND revoked_at IS NULL').bind(new Date().toISOString(), linkId, siteId).run();
  if (!(await isLinked(env, siteId))) await unlinkSite(env, siteId);
}

// Unlink (plan 5.2 step 6): every device stops, and every record that came from
// KennelOS becomes ordinary KennelPort content as it stands in the draft. A record
// KennelOS had taken off the site stays off, by her own switch now, so it can be
// switched back on; a litter keeps its 30-day clock (unlinked sites work the same
// way, 5.3).
export async function unlinkSite(env, siteId) {
  const t = new Date().toISOString();
  const db = env.DB;
  await db.batch([
    db.prepare('UPDATE links SET revoked_at = ? WHERE site_id = ? AND revoked_at IS NULL').bind(t, siteId),
    db.prepare('DELETE FROM link_codes WHERE site_id = ?').bind(siteId),
    db.prepare('DELETE FROM link_pending WHERE site_id = ?').bind(siteId),
    db.prepare('DELETE FROM link_declines WHERE site_id = ?').bind(siteId),
    // The portal keeps every record KennelOS sent (portal plan 3.1); only its waiting suggestions go.
    db.prepare('DELETE FROM portal_suggestions WHERE site_id = ?').bind(siteId),
    db.prepare("UPDATE dogs SET show_on_site = CASE WHEN hidden_by_kennelos = 1 THEN 0 ELSE show_on_site END, hidden_by_kennelos = 0, source = 'kennelport', kennelos_id = NULL WHERE site_id = ?").bind(siteId),
    db.prepare("UPDATE litters SET show_on_site = CASE WHEN hidden_by_kennelos = 1 THEN 0 ELSE show_on_site END, hidden_by_kennelos = 0, source = 'kennelport', kennelos_id = NULL, kennelos_kind = NULL, kennelos_name = NULL WHERE site_id = ?").bind(siteId),
    db.prepare("UPDATE puppies SET status = CASE WHEN hidden_by_kennelos = 1 THEN 'hidden' ELSE status END, hidden_by_kennelos = 0, source = 'kennelport', kennelos_id = NULL WHERE site_id = ?").bind(siteId),
    db.prepare("UPDATE health_results SET source = 'kennelport', kennelos_id = NULL WHERE site_id = ?").bind(siteId),
    db.prepare("UPDATE extras SET source = 'kennelport', kennelos_id = NULL WHERE site_id = ?").bind(siteId),
    db.prepare("UPDATE products SET source = 'kennelport', kennelos_id = NULL WHERE site_id = ?").bind(siteId),
    // A partner kennel KennelOS stopped sending stays hidden (she may have unticked
    // naming it): it waits under Not on your site, with Remove.
    db.prepare("UPDATE partner_kennels SET source = 'kennelport', kennelos_id = NULL WHERE site_id = ?").bind(siteId),
    db.prepare("UPDATE steps SET source = 'kennelport', kennelos_id = NULL WHERE site_id = ?").bind(siteId),
    db.prepare("UPDATE payment_info SET source = 'kennelport' WHERE site_id = ?").bind(siteId),
    db.prepare('UPDATE sites SET use_kennelos_prices = 0, draft_changed_at = ? WHERE id = ?').bind(t, siteId),
  ]);
}
