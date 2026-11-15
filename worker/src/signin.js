// One sign-in, used by both: the breeder's (auth.js, the Site Manager) and a family's
// (portal/auth.js, the portal on her site). Email and a 6-digit code, then a session
// cookie. Written once here so a fix reaches both (review/senior-review-2026-11.md
// item 10); each side keeps only what is its own: who may be sent a code, its tables,
// its cookie, and what a session holds.
//
// Same approach and limits as KennelOS cloud (cloud/src/auth.js): addresses, codes and
// tokens are kept only as hashes. A code lasts 10 minutes, works once, and allows 5
// tries. Codes asked for are limited per address and per network address, an hour at a
// time. A session slides: a visit more than a day after the last pushes it out again.
//
// The two are kept apart: their own code tables, session tables and cookies, so one
// kind of session can never be taken for the other. A `CodeStore` names a side's code
// table and what keys a code in it.
import { hmacHex, sha256Hex, randomCode, randomHex, timingSafeEqual } from './lib/crypto.js';
import { readCookie } from './lib/http.js';
import { MailError } from './mail.js';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const LIMITS = { email: 5, ip: 30 };
export const SLIDE_AFTER_MS = 24 * 60 * 60 * 1000;

// The message texts are matched by manage/wording.js MESSAGES ('signin'): change
// them there too.
export const WRONG_CODE = 'That code isn\'t right. Check the latest email, or ask for a new code.';
const EXPIRED_CODE = 'That code has expired. Ask for a new one.';
const TOO_MANY_TRIES = 'Too many tries. Ask for a new code.';
const USED_CODE = 'That code has already been used.';
const BAD_EMAIL = 'That isn\'t an email address.';
const RATE_LIMITED = 'Too many codes asked for. Try again in an hour.';

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

// ---------- limits ----------

export const hourWindow = (now = new Date()) => `${now.toISOString().slice(0, 13)}:00:00Z`;

// Counts one more in this hour's bucket and returns the count.
export async function bump(env, bucket, now = new Date()) {
  return env.DB.prepare(`INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1 RETURNING count`).bind(bucket, hourWindow(now)).first('count');
}

// Step 1's checks, for either side: a real address, and not too many codes asked for
// this hour by it or from this network address. `buckets` keeps each side's counts
// apart. Both are counted every time. Returns the address and its hash.
export async function askForCode(env, request, rawEmail, buckets) {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new AuthError('bad_email', BAD_EMAIL);
  const eh = await emailHash(env, email);
  const ip = await hmacHex(env.EMAIL_HMAC_KEY, `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`);
  const byEmail = await bump(env, `${buckets.email}:${eh}`);
  const byIp = await bump(env, `${buckets.ip}:${ip}`);
  if (byEmail > LIMITS.email || byIp > LIMITS.ip) throw new AuthError('rate_limited', RATE_LIMITED);
  return { email, eh };
}

// ---------- codes ----------

// A side's code table: `keys` are the columns that pick one code (always ending in
// email_hash), `label(key)` what the code's hash is made over, so a code from one
// side or one site can't be used on another.
export function codeStore(table, keys, label) {
  return { table, keys, label };
}

const where = (store) => store.keys.map((k) => `${k} = ?`).join(' AND ');
const values = (store, key) => store.keys.map((k) => key[k]);
const hashCode = (env, store, key, code) => hmacHex(env.EMAIL_HMAC_KEY, `${store.label(key)}:${code}`);

// A new code for this key, replacing any earlier one (and its count of tries).
export async function issueCode(env, store, key) {
  const code = randomCode();
  const now = Date.now();
  const cols = store.keys.join(', ');
  await env.DB.prepare(`INSERT INTO ${store.table} (${cols}, code_hash, expires_at, attempts, created_at) VALUES (${store.keys.map(() => '?').join(', ')}, ?, ?, 0, ?)
    ON CONFLICT (${cols}) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`)
    .bind(...values(store, key), await hashCode(env, store, key, code), new Date(now + CODE_TTL_MS).toISOString(), new Date(now).toISOString()).run();
  return code;
}

// Sends the code's email; a mail failure becomes an AuthError the screen can show.
export async function mailCode(send) {
  try {
    return await send();
  } catch (err) {
    if (err instanceof MailError) throw new AuthError('mail', err.message);
    throw err;
  }
}

// Step 2's form: the address and code as typed. Throws the same answer for any bad
// shape, so the screen never says which part was wrong.
export function readCodeForm(rawEmail, rawCode) {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode ?? '').replace(/\s/g, '');
  if (!email || !/^\d{6}$/.test(code)) throw new AuthError('invalid_code', WRONG_CODE);
  return { email, code };
}

// Step 2: checks the code and burns it, so it works exactly once. A wrong one counts
// a try; after MAX_ATTEMPTS the code is dead. Returns nothing: on success the caller
// starts its session.
export async function redeemCode(env, store, key, code) {
  const row = await env.DB.prepare(`SELECT code_hash, expires_at, attempts FROM ${store.table} WHERE ${where(store)}`).bind(...values(store, key)).first();
  if (!row || row.expires_at <= new Date().toISOString()) throw new AuthError('invalid_code', EXPIRED_CODE);
  if (row.attempts >= MAX_ATTEMPTS) throw new AuthError('too_many_attempts', TOO_MANY_TRIES);
  if (!timingSafeEqual(row.code_hash, await hashCode(env, store, key, code))) {
    await env.DB.prepare(`UPDATE ${store.table} SET attempts = attempts + 1 WHERE ${where(store)}`).bind(...values(store, key)).run();
    // The try that kills the code says so, as KennelOS does, rather than one more "isn't right".
    if (row.attempts + 1 >= MAX_ATTEMPTS) throw new AuthError('too_many_attempts', TOO_MANY_TRIES);
    throw new AuthError('invalid_code', WRONG_CODE);
  }
  const burned = await env.DB.prepare(`DELETE FROM ${store.table} WHERE ${where(store)} AND code_hash = ?`).bind(...values(store, key), row.code_hash).run();
  if (burned.meta.changes !== 1) throw new AuthError('invalid_code', USED_CODE);
}

// ---------- sessions ----------

// A new session token (for the cookie) and its hash (for the table).
export async function newSession() {
  const token = randomHex(32);
  return { token, tokenHash: await sha256Hex(token) };
}

export const sessionCookie = (name, path, token, maxAge) =>
  `${name}=${token}; Path=${path}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// The hash of the session token in this cookie, or null if there is none worth looking up.
export async function sessionTokenHash(request, cookieName) {
  const token = readCookie(request, cookieName);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return sha256Hex(token);
}

// Whether a session row (revoked_at, expires_at) still lets its holder in.
export const sessionLive = (row) => Boolean(row && !row.revoked_at && Date.parse(row.expires_at) > Date.now());

// Sliding expiry: a visit more than a day after the last moves last_seen_at to now and
// the expiry `lifeMs` out again.
// → whether it moved. When it does, the caller sends the cookie again with a fresh
// Max-Age (withCookie): the browser keeps the cookie only as long as the Max-Age it
// was last sent with, so a session that slid only here still ended on day 90
// (review finding 02-5).
export async function slideSession(env, table, tokenHash, row, lifeMs) {
  if (Date.now() - Date.parse(row.last_seen_at) <= SLIDE_AFTER_MS) return false;
  await env.DB.prepare(`UPDATE ${table} SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?`)
    .bind(new Date().toISOString(), new Date(Date.now() + lifeMs).toISOString(), tokenHash).run();
  return true;
}

// The session cookie, sent again with a fresh Max-Age once the session slid; null
// when it didn't.
export const slidCookie = (slid, request, name, make) => {
  const token = slid ? readCookie(request, name) : null;
  return token ? make(token) : null;
};

// An answer carrying a slid session's cookie as well, unless it sets that cookie
// itself (signing out, signing in).
export function withCookie(res, cookie) {
  if (!cookie || !res) return res;
  const name = cookie.slice(0, cookie.indexOf('=') + 1);
  if ((res.headers.getSetCookie?.() ?? []).some((c) => c.startsWith(name))) return res;
  const out = new Response(res.body, res);
  out.headers.append('set-cookie', cookie);
  return out;
}

export async function revokeSession(env, table, tokenHash) {
  await env.DB.prepare(`UPDATE ${table} SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`).bind(new Date().toISOString(), tokenHash).run();
}
