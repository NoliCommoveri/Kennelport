// Push notifications for the manage app (plan 3.10, decision 12), as in KennelOS
// cloud (cloud/src/notify.js):
// - one secret, VAPID_PRIVATE_JWK (a P-256 private JWK with x and y), so the
//   public half can't drift from it; /ops makes one;
// - a push carries NO text: a signed (VAPID) empty POST to the push service. The
//   app's service worker then asks POST /push/pending what to show, proving itself
//   with its subscription's secret, so nothing a visitor wrote passes through
//   Apple's, Google's or Mozilla's push services;
// - sent only to devices whose session is still live; a subscription the push
//   service says is gone (404/410) is deleted.
import { sha256Hex, timingSafeEqual } from './lib/crypto.js';
import { isDemoSite } from './lib/demo.js';

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), (c) => c.charCodeAt(0));
const enc = new TextEncoder();
export const ITEM_KEEP_DAYS = 8;

export function vapidConfig(env) {
  try {
    const jwk = JSON.parse(env.VAPID_PRIVATE_JWK || 'null');
    if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d || !jwk.x || !jwk.y) return { ready: false, publicKey: null, jwk: null };
    const raw = new Uint8Array(65);
    raw[0] = 4;
    raw.set(fromB64url(jwk.x), 1);
    raw.set(fromB64url(jwk.y), 33);
    return { ready: true, publicKey: b64url(raw), jwk };
  } catch {
    return { ready: false, publicKey: null, jwk: null };
  }
}

export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const { kty, crv, x, y, d } = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const privateJwk = JSON.stringify({ kty, crv, x, y, d });
  return { privateJwk, publicKey: vapidConfig({ VAPID_PRIVATE_JWK: privateJwk }).publicKey };
}

async function vapidHeader(env, endpoint, now) {
  const { jwk, publicKey } = vapidConfig(env);
  const key = await crypto.subtle.importKey('jwk', { ...jwk, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(now.getTime() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:support@kennelport.com',
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${publicKey}`;
}

// Only real push services are ever POSTed to.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
export function validEndpoint(raw) {
  try {
    const u = new URL(String(raw ?? ''));
    return u.protocol === 'https:' && String(raw).length <= 1024 && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch { return false; }
}
const AUTH_SECRET = /^[A-Za-z0-9_-]{16,64}$/;

export async function sendPush(env, endpoint, now = new Date()) {
  try {
    const res = await (env.PUSH_FETCH ?? fetch)(endpoint, {
      method: 'POST',
      headers: { authorization: await vapidHeader(env, endpoint, now), ttl: '86400', urgency: 'high', 'content-length': '0' },
      signal: AbortSignal.timeout(5000),
    });
    return res.status;
  } catch {
    return 0;
  }
}

// ---------- subscriptions ----------

export async function subscribe(env, user, { endpoint, auth }) {
  if (!vapidConfig(env).ready) return { ok: false, reason: 'Notifications aren\'t set up on KennelPort yet.' };
  if (!validEndpoint(endpoint) || typeof auth !== 'string' || !AUTH_SECRET.test(auth)) return { ok: false, reason: 'This browser sent a subscription KennelPort can\'t use.' };
  await env.DB.prepare(`INSERT INTO push_subscriptions (endpoint_hash, email_hash, session_hash, endpoint, auth_secret, created_at, last_shown_seq)
    VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(seq), 0) FROM notify_items))
    ON CONFLICT (endpoint_hash) DO UPDATE SET email_hash = excluded.email_hash, session_hash = excluded.session_hash, auth_secret = excluded.auth_secret`)
    .bind(await sha256Hex(endpoint), user.emailHash, user.tokenHash, endpoint, auth, new Date().toISOString()).run();
  return { ok: true };
}

export async function unsubscribe(env, user, endpoint) {
  await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint_hash = ? AND email_hash = ?').bind(await sha256Hex(String(endpoint ?? '')), user.emailHash).run();
}

export async function subscriptionFor(env, user, endpoint) {
  if (!endpoint) return null;
  return env.DB.prepare('SELECT endpoint_hash FROM push_subscriptions WHERE endpoint_hash = ? AND email_hash = ?').bind(await sha256Hex(String(endpoint)), user.emailHash).first();
}

// Everyone on the site whose device has notifications on and is still signed in.
async function liveSubscriptions(env, siteId, now = new Date()) {
  const { results } = await env.DB.prepare(`SELECT p.endpoint_hash, p.endpoint FROM push_subscriptions p
    JOIN site_users su ON su.email_hash = p.email_hash AND su.site_id = ?
    JOIN sessions s ON s.token_hash = p.session_hash AND s.revoked_at IS NULL AND s.expires_at > ?`).bind(siteId, now.toISOString()).all();
  return results;
}

async function pushAll(env, subs, now = new Date()) {
  let sent = 0;
  for (const sub of subs) {
    const status = await sendPush(env, sub.endpoint, now);
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint_hash = ?').bind(sub.endpoint_hash).run();
    } else if (status >= 200 && status < 300) {
      sent++;
      await env.DB.prepare('UPDATE push_subscriptions SET last_sent_at = ? WHERE endpoint_hash = ?').bind(now.toISOString(), sub.endpoint_hash).run();
    } else {
      console.error(`push: send failed ${status}`);
    }
  }
  return sent;
}

// Something happened on a site: record it, wake its people's devices. Never
// throws: the visitor's message is already saved, and a notification is a
// second way to find out, never the only one.
export async function notify(env, siteId, kind, name = null, ref = null) {
  try {
    // The demo never notifies anyone (kennelos/demo.js).
    if (await isDemoSite(env, siteId)) return 0;
    await env.DB.prepare('INSERT INTO notify_items (site_id, kind, name, ref, at) VALUES (?, ?, ?, ?, ?)').bind(siteId, kind, name ? String(name).trim().split(/\s+/)[0].slice(0, 40) : null, ref, new Date().toISOString()).run();
    if (!vapidConfig(env).ready) return 0;
    return pushAll(env, await liveSubscriptions(env, siteId));
  } catch (err) {
    console.error('push: notify failed');
    return 0;
  }
}

export async function testPush(env, user, endpoint) {
  const sub = await subscriptionFor(env, user, endpoint);
  if (!sub || !vapidConfig(env).ready) return false;
  const site = user.sites[0];
  if (!site) return false;
  await env.DB.prepare("INSERT INTO notify_items (site_id, kind, name, ref, at) VALUES (?, 'test', NULL, ?, ?)").bind(site.id, sub.endpoint_hash, new Date().toISOString()).run();
  const full = await env.DB.prepare('SELECT endpoint_hash, endpoint FROM push_subscriptions WHERE endpoint_hash = ?').bind(sub.endpoint_hash).first();
  return (await pushAll(env, [full])) === 1;
}

// POST /push/pending {endpoint, auth}, from the service worker: what to show.
export async function pendingPush(env, { endpoint, auth } = {}, now = new Date()) {
  if (!validEndpoint(endpoint) || typeof auth !== 'string') return null;
  const sub = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE endpoint_hash = ?').bind(await sha256Hex(endpoint)).first();
  if (!sub || !timingSafeEqual(sub.auth_secret, auth)) return null;
  const session = await env.DB.prepare('SELECT 1 FROM sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?').bind(sub.session_hash, now.toISOString()).first();
  if (!session) {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint_hash = ?').bind(sub.endpoint_hash).run();
    return null;
  }
  const { results: sites } = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name FROM site_users su JOIN sites s ON s.id = su.site_id
    WHERE su.email_hash = ? AND s.status != 'closed'`).bind(sub.email_hash).all();
  const ids = sites.map((s) => s.id);
  const { results } = ids.length ? await env.DB.prepare(`SELECT seq, site_id, kind, name, ref FROM notify_items WHERE seq > ?
    AND site_id IN (${ids.map(() => '?').join(', ')}) AND (kind != 'test' OR ref = ?) ORDER BY seq`).bind(sub.last_shown_seq, ...ids, sub.endpoint_hash).all() : { results: [] };
  if (results.length) await env.DB.prepare('UPDATE push_subscriptions SET last_shown_seq = ? WHERE endpoint_hash = ?').bind(results[results.length - 1].seq, sub.endpoint_hash).run();
  return pushText(results, sites);
}

// Pure: the notification for these items.
export function pushText(items, sites) {
  const tag = 'kennelport';
  const bySite = Object.fromEntries(sites.map((s) => [s.id, s]));
  const prefix = (i) => (sites.length > 1 ? `${bySite[i.site_id]?.kennel_name ?? 'Your site'}: ` : '');
  const home = (i) => `/s/${bySite[i.site_id]?.subdomain ?? ''}`;
  if (!items.length) return { title: 'KennelPort', body: 'Something new on your website.', path: '/', tag };
  if (items.length === 1) {
    const i = items[0];
    if (i.kind === 'test') return { title: 'KennelPort', body: 'Notifications are working on this device.', path: '/', tag };
    if (i.kind === 'message') return { title: 'New message', body: `${prefix(i)}New message${i.name ? ` from ${i.name}` : ''}`, path: `${home(i)}/inbox${i.ref ? `/${i.ref}` : ''}`, tag };
    // The puppy portal's notices (portal/account.js, portal/bounces.js): ref says which.
    const pm = /^portal-(message|bounce):([0-9a-f-]*)$/.exec(i.kind === 'notice' ? i.ref ?? '' : '');
    if (pm?.[1] === 'message') return { title: 'New message', body: `${prefix(i)}${i.name ?? 'A puppy family'} sent you a message`, path: `${home(i)}/portal/f/${pm[2]}#messages`, tag };
    if (pm?.[1] === 'bounce') return { title: 'Email bounced', body: `${prefix(i)}A portal email to ${i.name ?? 'a family'} bounced. Text them.`, path: `${home(i)}/portal/f/${pm[2]}`, tag };
    if (i.kind === 'review') return { title: 'New review', body: `${prefix(i)}${i.name ?? 'A family'} sent a review to approve`, path: `${home(i)}/reviews-queue`, tag };
    return { title: 'KennelPort', body: `${prefix(i)}Something needs a look on your website.`, path: home(i), tag };
  }
  const messages = items.filter((i) => i.kind === 'message' || (i.kind === 'notice' && String(i.ref ?? '').startsWith('portal-message:'))).length;
  const reviews = items.filter((i) => i.kind === 'review').length;
  const parts = [messages && `${messages} new message${messages === 1 ? '' : 's'}`, reviews && `${reviews} review${reviews === 1 ? '' : 's'} to approve`].filter(Boolean);
  const first = items.find((i) => i.kind !== 'test') ?? items[0];
  return { title: 'KennelPort', body: parts.join(' and ') || 'Something new on your website.', path: messages ? `${home(first)}/inbox` : home(first), tag };
}
