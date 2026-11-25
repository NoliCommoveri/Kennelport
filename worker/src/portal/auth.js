// Family sign-in (docs/plans/family-portal.md section 2): an email code, or
// the invite's tap-to-sign-in link, then a session for that family only. The
// machinery (codes, limits, sessions) is signin.js, shared with breeder sign-in
// (auth.js). Kept apart from hers: its own codes, sessions and cookie (Path=/family
// on her site's host), so a family session can never reach the manage app and the
// other way round. A family's code is made for one site and works only there.
import { sha256Hex, randomHex } from '../lib/crypto.js';
import { sendMail, MailError } from '../mail.js';
import {
  AuthError, emailHash, CODE_TTL_MS, WRONG_CODE, askForCode, codeStore, issueCode, mailCode, readCodeForm, redeemCode,
  newSession, sessionCookie, sessionTokenHash, sessionLive, slideSession, slidCookie, revokeSession,
} from '../signin.js';
import { codeMessage, inviteMessage } from './messages.js';
import { familyEmails, placementFor, getFamily, getSettings } from './store.js';

export const FAMILY_COOKIE = 'kp_family';
export const FAMILY_SESSION_MS = 365 * 24 * 60 * 60 * 1000;
export const INVITE_DAYS = 30;
const DAY = 86400000;

export { AuthError };

// Where the family's pages live, for links in emails.
export function portalBase(env, site) {
  return site.domain ? `https://${site.domain}` : `https://${site.subdomain}.${env.ROOT_DOMAIN}`;
}

const CODES = codeStore('portal_codes', ['site_id', 'email_hash'], (k) => `family-code:${k.site_id}:${k.email_hash}`);

// The active family on this site an address belongs to, or null.
const familyOf = (env, siteId, eh) => env.DB.prepare(`SELECT f.id FROM portal_emails e JOIN portal_families f ON f.id = e.family_id
    WHERE e.site_id = ? AND e.email_hash = ? AND f.status = 'active' AND f.deleted_at IS NULL`).bind(siteId, eh).first();

// Step 1: a code, sent only if the address belongs to a family on this site. The
// answer is the same either way.
export async function startFamilySignIn(env, request, site, rawEmail) {
  const { email, eh } = await askForCode(env, request, rawEmail, { email: 'pemail', ip: 'pip' });
  if (!await familyOf(env, site.id, eh)) return { email };
  const code = await issueCode(env, CODES, { site_id: site.id, email_hash: eh });
  const kennel = site.kennel_name || site.subdomain;
  await mailCode(() => sendMail(env, { to: email, emailHash: eh, kind: 'family_code', fromName: kennel, ...codeMessage({ kennel, code, minutes: CODE_TTL_MS / 60000 }) }));
  return { email };
}

// A family session (an email code, the invite, or the status page's one tap).
export async function startSession(env, siteId, familyId) {
  const { token, tokenHash } = await newSession();
  const t = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO portal_sessions (token_hash, site_id, family_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(tokenHash, siteId, familyId, t, t, new Date(Date.now() + FAMILY_SESSION_MS).toISOString()),
    env.DB.prepare('UPDATE portal_families SET first_signed_in_at = COALESCE(first_signed_in_at, ?), last_activity_at = ? WHERE id = ?').bind(t, t, familyId),
  ]);
  return familyCookie(token);
}

export const familyCookie = (token, maxAge = FAMILY_SESSION_MS / 1000) => sessionCookie(FAMILY_COOKIE, '/family', token, maxAge);

// Step 2: the code. Works once.
export async function verifyFamilySignIn(env, site, rawEmail, rawCode) {
  const { email, code } = readCodeForm(rawEmail, rawCode);
  const eh = await emailHash(env, email);
  await redeemCode(env, CODES, { site_id: site.id, email_hash: eh }, code);
  const fam = await familyOf(env, site.id, eh);
  if (!fam) throw new AuthError('invalid_code', WRONG_CODE);
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
  const { vet_rule: vetRule } = await getSettings(env, site.id);
  const t = new Date();
  let sent = 0;
  let failed = 0;
  for (const e of await familyEmails(env, familyId)) {
    const token = randomHex(32);
    await env.DB.prepare('UPDATE portal_emails SET invite_hash = ?, invite_expires_at = ?, invited_at = ? WHERE id = ?')
      .bind(await sha256Hex(token), new Date(t.getTime() + INVITE_DAYS * DAY).toISOString(), t.toISOString(), e.id).run();
    const msg = inviteMessage({ kennel, family: fam.name, pup: p?.call_name || p?.puppy_name, link: `${base}/family/welcome?t=${token}`, base, days: INVITE_DAYS, vetRule });
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

// The signed-in family on this site, or null. Sliding expiry (with `cookie` to
// send again when it slides, as for her), and the activity date (plan 10.2) moves
// at most once an hour.
export async function currentFamily(env, request, site) {
  const tokenHash = await sessionTokenHash(request, FAMILY_COOKIE);
  if (!tokenHash) return null;
  const row = await env.DB.prepare(`SELECT s.family_id, s.last_seen_at, s.expires_at, s.revoked_at, f.name, f.last_activity_at, f.status_url
    FROM portal_sessions s JOIN portal_families f ON f.id = s.family_id WHERE s.token_hash = ? AND s.site_id = ? AND f.status = 'active' AND f.deleted_at IS NULL`).bind(tokenHash, site.id).first();
  if (!sessionLive(row)) return null;
  const cookie = slidCookie(await slideSession(env, 'portal_sessions', tokenHash, row, FAMILY_SESSION_MS), request, FAMILY_COOKIE, familyCookie);
  if (!row.last_activity_at || Date.now() - Date.parse(row.last_activity_at) > 3600000) {
    await env.DB.prepare('UPDATE portal_families SET last_activity_at = ? WHERE id = ?').bind(new Date().toISOString(), row.family_id).run();
  }
  return { tokenHash, familyId: row.family_id, name: row.name, statusUrl: row.status_url, cookie };
}

export async function signOutFamily(env, fam) {
  await revokeSession(env, 'portal_sessions', fam.tokenHash);
}
