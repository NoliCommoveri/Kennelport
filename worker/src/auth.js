// Breeder sign-in: email and a 6-digit code, then a session cookie for that
// browser or installed app (plan 4). The machinery (codes, limits, sessions) is
// signin.js, shared with family sign-in (portal/auth.js); this file is what is the
// breeder's own: who may be sent a code, her tables and cookie, and invites.
//
// Differences from KennelOS: nobody signs up. A code is sent only to an address
// invited to a site, but the answer is the same either way, so the screen never
// says whether an address has a site. And the session is a cookie on the manage
// host (the manage app is pages on that host), not a bearer token.
import { sendMail, codeMessage, inviteMessage, MailError } from './mail.js';
import { isDemoSite, NOT_FOR_DEMO } from './lib/demo.js';
import {
  AuthError, normalizeEmail, emailHash, CODE_TTL_MS, askForCode, codeStore, issueCode, mailCode, readCodeForm,
  redeemCode, newSession, sessionCookie as cookieFor, sessionTokenHash, sessionLive, slideSession, revokeSession,
} from './signin.js';

export { AuthError, normalizeEmail, emailHash, CODE_TTL_MS, MAX_ATTEMPTS, LIMITS } from './signin.js';
export const SESSION_MS = 90 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'kp_session';

const CODES = codeStore('login_codes', ['email_hash'], (k) => `code:${k.email_hash}`);

// Step 1: ask for a code. Sends one only if this address is on a site.
export async function startSignIn(env, request, rawEmail) {
  const { email, eh } = await askForCode(env, request, rawEmail, { email: 'email', ip: 'ip' });
  const member = await env.DB.prepare(`SELECT 1 FROM site_users su JOIN sites s ON s.id = su.site_id
    WHERE su.email_hash = ? AND s.status != 'closed' LIMIT 1`).bind(eh).first();
  if (!member) return { email };
  const code = await issueCode(env, CODES, { email_hash: eh });
  await mailCode(() => sendMail(env, { to: email, emailHash: eh, kind: 'code', ...codeMessage(code, CODE_TTL_MS / 60000) }));
  return { email };
}

// Step 2: the code. Burned on success, so it works exactly once.
export async function verifySignIn(env, rawEmail, rawCode, label) {
  const { email, code } = readCodeForm(rawEmail, rawCode);
  const eh = await emailHash(env, email);
  await redeemCode(env, CODES, { email_hash: eh }, code);

  const t = new Date().toISOString();
  const { token, tokenHash } = await newSession();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions (token_hash, email_hash, label, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(tokenHash, eh, String(label ?? '').slice(0, 80) || null, t, t, new Date(Date.now() + SESSION_MS).toISOString()),
    env.DB.prepare('UPDATE site_users SET joined_at = ? WHERE email_hash = ? AND joined_at IS NULL').bind(t, eh),
  ]);
  return { token, cookie: sessionCookie(token) };
}

export const sessionCookie = (token, maxAge = SESSION_MS / 1000) => cookieFor(SESSION_COOKIE, '/', token, maxAge);
export const clearSessionCookie = () => sessionCookie('', 0);

// The signed-in person, or null. Sliding expiry: a visit more than a day after
// the last pushes the expiry 90 days out again.
export async function currentUser(env, request) {
  const tokenHash = await sessionTokenHash(request, SESSION_COOKIE);
  if (!tokenHash) return null;
  const row = await env.DB.prepare('SELECT email_hash, created_at, last_seen_at, expires_at, revoked_at FROM sessions WHERE token_hash = ?').bind(tokenHash).first();
  if (!sessionLive(row)) return null;
  await slideSession(env, 'sessions', tokenHash, row, SESSION_MS);
  const { results: sites } = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, su.role FROM site_users su
    JOIN sites s ON s.id = su.site_id WHERE su.email_hash = ? AND s.status != 'closed' ORDER BY s.kennel_name`).bind(row.email_hash).all();
  return { tokenHash, emailHash: row.email_hash, signedInAt: row.created_at, sites };
}

export async function signOut(env, user) {
  await revokeSession(env, 'sessions', user.tokenHash);
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
