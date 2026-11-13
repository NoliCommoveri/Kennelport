// Seeing a family's portal as they see it (docs/plans/family-view.md): anyone with
// the site in the Site Manager opens a family's portal, read-only, on her site's
// own address. The Site Manager makes a view link (signed, once only, 2 minutes);
// the portal turns it into a view cookie (signed, not stored, 1 hour, not renewed).
// Every request checks again that her account still has the site and the family
// is still active. The once-only part reuses portal_handoffs (a hash and a site).
//
// The cookie is apart from the family's own (kp_family): a view never touches
// their session or their activity date (family-portal.md 10.2).
import { hmacHex, sha256Hex, randomHex, timingSafeEqual } from '../lib/crypto.js';
import { readCookie } from '../lib/http.js';
import { getFamily } from './store.js';

export const VIEW_COOKIE = 'kp_family_view';
export const VIEW_LINK_MS = 2 * 60000;
export const VIEW_MS = 60 * 60000;

const viewKey = (env, siteId) => hmacHex(env.EMAIL_HMAC_KEY, `family-view:${siteId}`);
const b64url = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function sign(env, siteId, kind, body) {
  const data = b64url(JSON.stringify(body));
  return `${data}.${await hmacHex(await viewKey(env, siteId), `${kind}:${data}`)}`;
}

async function open(env, siteId, kind, token) {
  const m = /^([A-Za-z0-9_-]{10,600})\.([0-9a-f]{64})$/.exec(String(token ?? ''));
  if (!m) return null;
  if (!timingSafeEqual(m[2], await hmacHex(await viewKey(env, siteId), `${kind}:${m[1]}`))) return null;
  try {
    const body = JSON.parse(unb64url(m[1]));
    return body && typeof body === 'object' ? body : null;
  } catch { return null; }
}

// Still allowed: her account still has the site, and the family is still active.
async function allowed(env, siteId, familyId, emailHash) {
  if (typeof familyId !== 'string' || typeof emailHash !== 'string') return null;
  const member = await env.DB.prepare('SELECT 1 FROM site_users WHERE site_id = ? AND email_hash = ?').bind(siteId, emailHash).first();
  if (!member) return null;
  return getFamily(env, siteId, familyId);
}

// The Site Manager's half: a link for this family, for this person, once.
export async function makeViewLink(env, siteId, familyId, emailHash) {
  return sign(env, siteId, 'link', { f: familyId, u: emailHash, x: Date.now() + VIEW_LINK_MS, n: randomHex(16) });
}

// The portal's half: the link, once, to the view cookie's value; null if it's
// been used, has expired, isn't this site's or isn't allowed any more.
export async function redeemViewLink(env, siteId, token) {
  const body = await open(env, siteId, 'link', token);
  if (!body || typeof body.n !== 'string' || typeof body.x !== 'number') return null;
  if (body.x < Date.now() || body.x > Date.now() + VIEW_LINK_MS + 60000) return null;
  if (!(await allowed(env, siteId, body.f, body.u))) return null;
  const used = await env.DB.prepare('INSERT INTO portal_handoffs (nonce_hash, site_id, used_at) VALUES (?, ?, ?) ON CONFLICT (nonce_hash) DO NOTHING')
    .bind(await sha256Hex(`view:${siteId}:${body.n}`), siteId, new Date().toISOString()).run();
  if (used.meta.changes !== 1) return null;
  return sign(env, siteId, 'view', { f: body.f, u: body.u, x: Date.now() + VIEW_MS });
}

export const viewCookie = (value, maxAge = VIEW_MS / 1000) =>
  `${VIEW_COOKIE}=${value}; Path=/family; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// The family being viewed, as the family's own session would give it, or null.
// stale: a view cookie was sent but no longer works (so it can be cleared).
export async function currentView(env, request, site) {
  const token = readCookie(request, VIEW_COOKIE);
  if (!token) return null;
  const body = await open(env, site.id, 'view', token);
  const f = body && typeof body.x === 'number' && body.x > Date.now() ? await allowed(env, site.id, body.f, body.u) : null;
  if (!f) return { stale: true };
  return { familyId: f.id, name: f.name, statusUrl: f.status_url, viewing: true };
}
