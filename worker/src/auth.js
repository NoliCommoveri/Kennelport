// Breeder sign-in: email and a 6-digit code, then a session cookie for that
// browser or installed app (plan 4). Same approach and limits as KennelOS cloud
// (cloud/src/auth.js): addresses, codes and tokens are kept only as hashes.
//
// Differences from KennelOS: nobody signs up. A code is sent only to an address
// invited to a site, but the answer is the same either way, so the screen never
// says whether an address has a site. And the session is a cookie on the manage
// host (the manage app is pages on that host), not a bearer token.
import { hmacHex, sha256Hex, randomCode, randomHex, timingSafeEqual } from './lib/crypto.js';
import { readCookie } from './lib/http.js';
import { sendMail, codeMessage, inviteMessage, MailError } from './mail.js';
import { isDemoSite, NOT_FOR_DEMO } from './lib/demo.js';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const SESSION_MS = 90 * 24 * 60 * 60 * 1000;
const SLIDE_AFTER_MS = 24 * 60 * 60 * 1000;
export const LIMITS = { email: 5, ip: 30 };
export const SESSION_COOKIE = 'kp_session';

export class AuthError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function normalizeEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null;
  return email;
}

export async function emailHash(env, email) {
  if (!env.EMAIL_HMAC_KEY) throw new AuthError('not_configured', 'Sign-in isn\'t set up yet (EMAIL_HMAC_KEY).');
  return hmacHex(env.EMAIL_HMAC_KEY, `email:${email}`);
}

const codeHash = (env, eh, code) => hmacHex(env.EMAIL_HMAC_KEY, `code:${eh}:${code}`);
const hourWindow = (now) => `${now.toISOString().slice(0, 13)}:00:00Z`;

async function bump(env, bucket, now = new Date()) {
  return env.DB.prepare(`INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1 RETURNING count`).bind(bucket, hourWindow(now)).first('count');
}

async function limitSignIn(env, request, eh) {
  const ip = await hmacHex(env.EMAIL_HMAC_KEY, `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`);
  const byEmail = await bump(env, `email:${eh}`);
  const byIp = await bump(env, `ip:${ip}`);
  if (byEmail > LIMITS.email || byIp > LIMITS.ip) throw new AuthError('rate_limited', 'Too many codes asked for. Try again in an hour.');
}

// Step 1: ask for a code. Sends one only if this address is on a site.
export async function startSignIn(env, request, rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new AuthError('bad_email', 'That isn\'t an email address.');
  const eh = await emailHash(env, email);
  await limitSignIn(env, request, eh);
  const member = await env.DB.prepare(`SELECT 1 FROM site_users su JOIN sites s ON s.id = su.site_id
    WHERE su.email_hash = ? AND s.status != 'closed' LIMIT 1`).bind(eh).first();
  if (!member) return { email };

  const code = randomCode();
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO login_codes (email_hash, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)
    ON CONFLICT (email_hash) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`)
    .bind(eh, await codeHash(env, eh, code), new Date(now + CODE_TTL_MS).toISOString(), new Date(now).toISOString()).run();
  try {
    await sendMail(env, { to: email, emailHash: eh, kind: 'code', ...codeMessage(code, CODE_TTL_MS / 60000) });
  } catch (err) {
    if (err instanceof MailError) throw new AuthError('mail', err.message);
    throw err;
  }
  return { email };
}

// Step 2: the code. Burned on success, so it works exactly once.
export async function verifySignIn(env, rawEmail, rawCode, label) {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode ?? '').replace(/\s/g, '');
  if (!email || !/^\d{6}$/.test(code)) throw new AuthError('invalid_code', 'That code isn\'t right. Check the latest email, or ask for a new code.');
  const eh = await emailHash(env, email);
  const row = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM login_codes WHERE email_hash = ?').bind(eh).first();
  if (!row || row.expires_at <= new Date().toISOString()) throw new AuthError('invalid_code', 'That code has expired. Ask for a new one.');
  if (row.attempts >= MAX_ATTEMPTS) throw new AuthError('too_many_attempts', 'Too many tries. Ask for a new code.');
  if (!timingSafeEqual(row.code_hash, await codeHash(env, eh, code))) {
    await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email_hash = ?').bind(eh).run();
    throw new AuthError('invalid_code', 'That code isn\'t right. Check the latest email, or ask for a new code.');
  }
  const burned = await env.DB.prepare('DELETE FROM login_codes WHERE email_hash = ? AND code_hash = ?').bind(eh, row.code_hash).run();
  if (burned.meta.changes !== 1) throw new AuthError('invalid_code', 'That code has already been used.');

  const t = new Date().toISOString();
  const token = randomHex(32);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions (token_hash, email_hash, label, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256Hex(token), eh, String(label ?? '').slice(0, 80) || null, t, t, new Date(Date.now() + SESSION_MS).toISOString()),
    env.DB.prepare('UPDATE site_users SET joined_at = ? WHERE email_hash = ? AND joined_at IS NULL').bind(t, eh),
  ]);
  return { token, cookie: sessionCookie(token) };
}

export const sessionCookie = (token, maxAge = SESSION_MS / 1000) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export const clearSessionCookie = () => sessionCookie('', 0);

// The signed-in person, or null. Sliding expiry: a visit more than a day after
// the last pushes the expiry 90 days out again.
export async function currentUser(env, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare('SELECT email_hash, created_at, last_seen_at, expires_at, revoked_at FROM sessions WHERE token_hash = ?').bind(tokenHash).first();
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null;
  if (Date.now() - Date.parse(row.last_seen_at) > SLIDE_AFTER_MS) {
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(new Date().toISOString(), new Date(Date.now() + SESSION_MS).toISOString(), tokenHash).run();
  }
  const { results: sites } = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, su.role FROM site_users su
    JOIN sites s ON s.id = su.site_id WHERE su.email_hash = ? AND s.status != 'closed' ORDER BY s.kennel_name`).bind(row.email_hash).all();
  return { tokenHash, emailHash: row.email_hash, signedInAt: row.created_at, sites };
}

export async function signOut(env, user) {
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').bind(new Date().toISOString(), user.tokenHash).run();
}

// ---------- invites (from /ops) ----------

export async function inviteToSite(env, siteId, rawEmail, role, { manageUrl, siteUrl }) {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new AuthError('bad_email', 'That isn\'t an email address.');
  if (!['owner', 'editor'].includes(role)) throw new AuthError('bad_role', 'The role is owner or editor.');
  const site = await env.DB.prepare('SELECT kennel_name, subdomain, status FROM sites WHERE id = ?').bind(siteId).first();
  if (!site || site.status === 'closed') throw new AuthError('no_site', 'No such open site.');
  // Nobody is invited to the demo (docs/plans/done/linked-sample.md): it is the owner's only.
  if (await isDemoSite(env, siteId)) throw new AuthError('demo', NOT_FOR_DEMO);
  const eh = await emailHash(env, email);
  await env.DB.prepare(`INSERT INTO site_users (site_id, email_hash, role, invited_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (site_id, email_hash) DO UPDATE SET role = excluded.role, invited_at = excluded.invited_at`).bind(siteId, eh, role, new Date().toISOString()).run();
  try {
    await sendMail(env, { to: email, emailHash: eh, kind: 'invite', ...inviteMessage({ kennelName: site.kennel_name || site.subdomain, manageUrl, siteUrl }) });
  } catch (err) {
    if (err instanceof MailError) throw new AuthError('mail', `Added, but ${err.message.charAt(0).toLowerCase()}${err.message.slice(1)}`);
    throw err;
  }
}

export async function removeFromSite(env, siteId, emailHashValue) {
  await env.DB.prepare('DELETE FROM site_users WHERE site_id = ? AND email_hash = ?').bind(siteId, emailHashValue).run();
}
