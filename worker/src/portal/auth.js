// Family sign-in (docs/plans/family-portal.md section 2): an email code, or
// the invite's tap-to-sign-in link, then a session for that family only. Kept
// apart from breeder sign-in: its own codes, sessions and cookie (Path=/family on
// her site's host), so a family session can never reach the manage app and the
// other way round. Same hashing and limits as auth.js.
import { emailHash, normalizeEmail, AuthError, CODE_TTL_MS, MAX_ATTEMPTS, LIMITS } from '../auth.js';
import { hmacHex, sha256Hex, randomCode, randomHex, timingSafeEqual } from '../lib/crypto.js';
import { readCookie } from '../lib/http.js';
import { sendMail, MailError } from '../mail.js';
import { codeMessage, inviteMessage } from './messages.js';
import { familyEmails, placementFor, getFamily } from './store.js';

export const FAMILY_COOKIE = 'kp_family';
export const FAMILY_SESSION_MS = 365 * 24 * 60 * 60 * 1000;
export const INVITE_DAYS = 30;
const DAY = 86400000;

export { AuthError };

// Where the family's pages live, for links in emails.
export function portalBase(env, site) {
  return site.domain ? `https://${site.domain}` : `https://${site.subdomain}.${env.ROOT_DOMAIN}`;
}

const hourWindow = (now) => `${now.toISOString().slice(0, 13)}:00:00Z`;
async function bump(env, bucket) {
  return env.DB.prepare(`INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1 RETURNING count`).bind(bucket, hourWindow(new Date())).first('count');
}

const codeHash = (env, siteId, eh, code) => hmacHex(env.EMAIL_HMAC_KEY, `family-code:${siteId}:${eh}:${code}`);

// Step 1: a code, sent only if the address belongs to a family on this site. The
// answer is the same either way.
export async function startFamilySignIn(env, request, site, rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new AuthError('bad_email', 'That isn\'t an email address.');
  const eh = await emailHash(env, email);
  const ip = await hmacHex(env.EMAIL_HMAC_KEY, `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`);
  if (await bump(env, `pemail:${eh}`) > LIMITS.email || await bump(env, `pip:${ip}`) > LIMITS.ip) {
    throw new AuthError('rate_limited', 'Too many codes asked for. Try again in an hour.');
  }
  const known = await env.DB.prepare(`SELECT 1 FROM portal_emails e JOIN portal_families f ON f.id = e.family_id
    WHERE e.site_id = ? AND e.email_hash = ? AND f.status = 'active' AND f.deleted_at IS NULL`).bind(site.id, eh).first();
  if (!known) return { email };
  const code = randomCode();
  const t = Date.now();
  await env.DB.prepare(`INSERT INTO portal_codes (site_id, email_hash, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, 0, ?)
    ON CONFLICT (site_id, email_hash) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`)
    .bind(site.id, eh, await codeHash(env, site.id, eh, code), new Date(t + CODE_TTL_MS).toISOString(), new Date(t).toISOString()).run();
  const kennel = site.kennel_name || site.subdomain;
  try {
    await sendMail(env, { to: email, emailHash: eh, kind: 'family_code', fromName: kennel, ...codeMessage({ kennel, code, minutes: CODE_TTL_MS / 60000 }) });
  } catch (err) {
    if (err instanceof MailError) throw new AuthError('mail', err.message);
    throw err;
  }
  return { email };
}

// A family session (an email code, the invite, or the status page's one tap).
export async function startSession(env, siteId, familyId) {
  const token = randomHex(32);
  const t = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO portal_sessions (token_hash, site_id, family_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256Hex(token), siteId, familyId, t, t, new Date(Date.now() + FAMILY_SESSION_MS).toISOString()),
    env.DB.prepare('UPDATE portal_families SET first_signed_in_at = COALESCE(first_signed_in_at, ?), last_activity_at = ? WHERE id = ?').bind(t, t, familyId),
  ]);
  return familyCookie(token);
}

export const familyCookie = (token, maxAge = FAMILY_SESSION_MS / 1000) =>
  `${FAMILY_COOKIE}=${token}; Path=/family; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// Step 2: the code. Works once.
export async function verifyFamilySignIn(env, site, rawEmail, rawCode) {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode ?? '').replace(/\s/g, '');
  const wrong = 'That code isn\'t right. Check the latest email, or ask for a new code.';
  if (!email || !/^\d{6}$/.test(code)) throw new AuthError('invalid_code', wrong);
  const eh = await emailHash(env, email);
  const row = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM portal_codes WHERE site_id = ? AND email_hash = ?').bind(site.id, eh).first();
  if (!row || row.expires_at <= new Date().toISOString()) throw new AuthError('invalid_code', 'That code has expired. Ask for a new one.');
  if (row.attempts >= MAX_ATTEMPTS) throw new AuthError('too_many_attempts', 'Too many tries. Ask for a new code.');
  if (!timingSafeEqual(row.code_hash, await codeHash(env, site.id, eh, code))) {
    await env.DB.prepare('UPDATE portal_codes SET attempts = attempts + 1 WHERE site_id = ? AND email_hash = ?').bind(site.id, eh).run();
    throw new AuthError('invalid_code', wrong);
  }
  const burned = await env.DB.prepare('DELETE FROM portal_codes WHERE site_id = ? AND email_hash = ? AND code_hash = ?').bind(site.id, eh, row.code_hash).run();
  if (burned.meta.changes !== 1) throw new AuthError('invalid_code', 'That code has already been used.');
  const fam = await env.DB.prepare(`SELECT f.id FROM portal_emails e JOIN portal_families f ON f.id = e.family_id
    WHERE e.site_id = ? AND e.email_hash = ? AND f.status = 'active' AND f.deleted_at IS NULL`).bind(site.id, eh).first();
  if (!fam) throw new AuthError('invalid_code', wrong);
  return startSession(env, site.id, fam.id);
}

// The invite's link: works once, until it expires. A used or old link sends the
// family to the code sign-in instead.
export async function acceptInvite(env, site, token) {
  if (!/^[0-9a-f]{64}$/.test(String(token ?? ''))) return null;
  const h = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT e.id, e.family_id, e.invite_expires_at FROM portal_emails e JOIN portal_families f ON f.id = e.family_id
    WHERE e.site_id = ? AND e.invite_hash = ? AND f.status = 'active' AND f.deleted_at IS NULL`).bind(site.id, h).first();
  if (!row || row.invite_expires_at <= new Date().toISOString()) return null;
  const used = await env.DB.prepare('UPDATE portal_emails SET invite_hash = NULL WHERE id = ? AND invite_hash = ?').bind(row.id, h).run();
  if (used.meta.changes !== 1) return null;
  return startSession(env, site.id, row.family_id);
}

// Send (or resend) the invite to each of the family's addresses: a new link for
// each, the old one stops working. Every send is in the email log.
export async function sendInvites(env, site, familyId) {
  const fam = await getFamily(env, site.id, familyId);
  if (!fam) throw new AuthError('no_family', 'No such family.');
  const p = await placementFor(env, site.id, familyId);
  const kennel = site.kennel_name || site.subdomain;
  const base = portalBase(env, site);
  const t = new Date();
  let sent = 0;
  let failed = 0;
  for (const e of await familyEmails(env, familyId)) {
    const token = randomHex(32);
    await env.DB.prepare('UPDATE portal_emails SET invite_hash = ?, invite_expires_at = ?, invited_at = ? WHERE id = ?')
      .bind(await sha256Hex(token), new Date(t.getTime() + INVITE_DAYS * DAY).toISOString(), t.toISOString(), e.id).run();
    const msg = inviteMessage({ kennel, family: fam.name, pup: p?.call_name || p?.puppy_name, link: `${base}/family/welcome?t=${token}`, base, days: INVITE_DAYS });
    let result = 'failed';
    let providerId = null;
    try {
      const r = await sendMail(env, { to: e.email, emailHash: e.email_hash, kind: 'family_invite', fromName: kennel, ...msg });
      result = r.outbox ? 'outbox' : 'sent';
      providerId = r.id;
      sent++;
    } catch (err) {
      if (!(err instanceof MailError)) throw err;
      failed++;
    }
    await env.DB.prepare('INSERT INTO portal_email_log (site_id, family_id, placement_id, kind, basis, address_hash, provider_id, result, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(site.id, familyId, p?.id ?? null, 'invite', null, e.email_hash, providerId, result, t.toISOString()).run();
  }
  await env.DB.prepare('UPDATE portal_families SET invited_at = ? WHERE id = ?').bind(t.toISOString(), familyId).run();
  return { sent, failed };
}

// The signed-in family on this site, or null. Sliding expiry, and the activity
// date (plan 10.2) moves at most once an hour.
export async function currentFamily(env, request, site) {
  const token = readCookie(request, FAMILY_COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT s.family_id, s.last_seen_at, s.expires_at, s.revoked_at, f.name, f.last_activity_at, f.status_url
    FROM portal_sessions s JOIN portal_families f ON f.id = s.family_id WHERE s.token_hash = ? AND s.site_id = ? AND f.status = 'active' AND f.deleted_at IS NULL`).bind(tokenHash, site.id).first();
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null;
  const t = new Date().toISOString();
  if (Date.now() - Date.parse(row.last_seen_at) > DAY) {
    await env.DB.prepare('UPDATE portal_sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?').bind(t, new Date(Date.now() + FAMILY_SESSION_MS).toISOString(), tokenHash).run();
  }
  if (!row.last_activity_at || Date.now() - Date.parse(row.last_activity_at) > 3600000) {
    await env.DB.prepare('UPDATE portal_families SET last_activity_at = ? WHERE id = ?').bind(t, row.family_id).run();
  }
  return { tokenHash, familyId: row.family_id, name: row.name, statusUrl: row.status_url };
}

export async function signOutFamily(env, fam) {
  await env.DB.prepare('UPDATE portal_sessions SET revoked_at = ? WHERE token_hash = ?').bind(new Date().toISOString(), fam.tokenHash).run();
}
