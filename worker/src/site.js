// Serving one site (plan 3.1, 4.1, 4.2): its published snapshot, or the draft
// for someone holding its preview link.
//
// - Visitors get the published snapshot only, never the draft tables. Rendered
//   pages are cached by snapshot id, path and day (Cloudflare's cache), so a page
//   renders about once per publish (plan 4.4); the day is in the key because
//   "older puppies" depends on the date.
// - A preview link (/__preview?t=<token>, made in /ops) sets a cookie on that
//   site's own host; with it, every page renders from a snapshot built from the
//   draft right then, never cached, with a bar saying it's a preview.
// - Photos are served only if the snapshot being shown lists them (plan 4.2).
import { schemaReady } from './gate.js';
import { buildSnapshot, loadSnapshot } from './publish.js';
import { renderPage, sitemap, robots } from './render/index.js';
import { hmacHex, timingSafeEqual } from './lib/crypto.js';
import { readCookie } from './lib/http.js';
import { htmlPage, escapeHtml as esc } from './lib/html.js';
import { receiveInquiry, receiveReview, receiveApplication, turnstileOn } from './siteforms.js';
import { pageOn, fullRegTopic, pageAt, pagePath } from './render/parts.js';
import { readFeed } from './feed.js';
import { publicRows } from './waitlist.js';
import { FRAME_ORIGINS } from './embeds.js';
import { BRAND_IMAGE_ORIGINS } from './content/model.js';
import { isPortalPath, servePortal } from './portal/family.js';
import { serveDocument } from './documents.js';

export const PREVIEW_COOKIE = 'kp_preview';
export const PREVIEW_DAYS = 7;

// The site's own pages may load only what the template serves from the site
// itself (plan 3.3). Phase 3 adds Turnstile on form pages.
// Videos and posts (plan 3.3) load in frames from their providers, and only when a
// visitor taps one; nothing else may be framed. Recommended products' brand
// pictures load from their brands (content/model.js BRAND_IMAGE_ORIGINS).
export const SITE_CSP = `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' ${BRAND_IMAGE_ORIGINS.join(' ')}; font-src 'self'; connect-src 'self'; frame-src ${FRAME_ORIGINS.join(' ')}; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`;
const SITE_HEADERS = {
  'content-security-policy': SITE_CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

const today = () => new Date().toISOString().slice(0, 10);

// ---------- preview tokens ----------

async function previewKey(env) {
  if (!env.OPS_TOKEN) return null;
  return hmacHex(env.OPS_TOKEN, 'kennelport-preview-key');
}

export async function makePreviewToken(env, siteId, days = PREVIEW_DAYS) {
  const key = await previewKey(env);
  if (!key) throw new Error('OPS_TOKEN is not set');
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  return `${siteId}.${exp}.${await hmacHex(key, `preview:${siteId}:${exp}`)}`;
}

export async function previewTokenValid(env, siteId, token) {
  if (!token) return false;
  const [id, expRaw, sig] = String(token).split('.');
  const exp = Number(expRaw);
  if (id !== siteId || !Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const key = await previewKey(env);
  return Boolean(key) && timingSafeEqual(sig ?? '', await hmacHex(key, `preview:${siteId}:${exp}`));
}

// ---------- responses ----------

// Pages with a form load Cloudflare Turnstile when it's set up (decision 17), and
// only those pages.
const TURNSTILE = 'https://challenges.cloudflare.com';
// By page, as the contact and reviews pages can be at the breeder's own address.
const FORM_PAGES = ['contact', 'reviews', 'waitlist'];
const withTurnstile = (csp) => csp.replace("script-src 'self'", `script-src 'self' ${TURNSTILE}`).replace("connect-src 'self'", `connect-src 'self' ${TURNSTILE}`).replace('frame-src ', `frame-src ${TURNSTILE} `);
// The waitlist page with KennelOS's application form (plan 3.8): the visitor's
// browser sends the sealed application straight to KennelOS, and runs KennelOS's
// Turnstile check, so that page alone may connect to the KennelOS family host.
const cspFor = (env, page, feed = null) => {
  if (page === 'waitlist' && feed?.feed?.form) {
    const csp = SITE_CSP.replace("connect-src 'self'", `connect-src 'self' ${feed.origin}`);
    return feed.feed.form.turnstile_site_key ? withTurnstile(csp) : csp;
  }
  return turnstileOn(env) && FORM_PAGES.includes(page) ? withTurnstile(SITE_CSP) : SITE_CSP;
};
const html = (body, status = 200, extra = {}, csp = SITE_CSP) => new Response(body, {
  status, headers: { 'content-type': 'text/html; charset=utf-8', ...SITE_HEADERS, 'content-security-policy': csp, ...extra },
});
const text = (body, type, extra = {}) => new Response(body, { headers: { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'public, max-age=300', ...extra } });

const noSite = () => htmlPage('Not found', '<h1>Not found</h1><p>No KennelPort site has this address.</p>', { status: 404, headers: { 'x-robots-tag': 'noindex' } });

function closedNotice() {
  return htmlPage('No longer hosted', '<h1>This breeder is no longer hosting with KennelPort.</h1><p>The site that was here has closed.</p>', { status: 410 });
}

export async function servePhoto(env, site, snap, url, { preview }) {
  const id = decodeURIComponent(url.pathname.slice('/_kp/p/'.length));
  let entry = snap?.photos?.[id];
  if (!entry && preview) {
    const row = await env.DB.prepare('SELECT r2_key AS key, thumb_key AS thumb, type FROM photos WHERE id = ? AND site_id = ? AND removed_at IS NULL').bind(id, site.id).first();
    entry = row ?? null;
  }
  if (!entry) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const key = url.searchParams.get('s') === 't' && entry.thumb ? entry.thumb : entry.key;
  const obj = await env.FILES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'content-type': entry.type || 'image/webp',
      'cache-control': preview ? 'private, no-store' : 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'",
    },
  });
}

export async function serveSite(request, env, ctxWorker, subdomain, { onDomain = false } = {}) {
  const url = new URL(request.url);
  // The family portal (portal/family.js), on sites that have it on: its own
  // sign-in and pages, never cached, never from the snapshot. Not on the demo.
  if (isPortalPath(url.pathname)) {
    const demo = await env.DB.prepare('SELECT demo_step FROM sites WHERE subdomain = ?').bind(subdomain).first('demo_step');
    if (demo != null) return noSite();
    return servePortal(request, env, ctxWorker, subdomain, { onDomain });
  }
  // A visitor's form posts to its page's address, which is known once the snapshot
  // is read (below); never to the system's own paths.
  const posting = request.method === 'POST' && !/^\/(?:_|sitemap\.xml$|robots\.txt$)/.test(url.pathname);
  if (request.method !== 'GET' && request.method !== 'HEAD' && !posting) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  if (!(await schemaReady(env.DB))) {
    return htmlPage('Back soon', '<h1>Back soon</h1><p>This site is being updated. Please try again in a few minutes.</p>', { status: 503, headers: { 'retry-after': '300' } });
  }

  const site = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, s.published_snapshot_id, s.kennelos_public_id, s.portal_on, s.demo_step, d.hostname AS domain
    FROM sites s LEFT JOIN custom_domains d ON d.site_id = s.id AND d.status = 'active' WHERE s.subdomain = ?`).bind(subdomain).first();
  // The demo (kennelos/demo.js) has no address: it answers as if there were no site,
  // to everyone, preview link or not. It opens only in the admin view.
  if (!site || site.demo_step != null) return noSite();
  if (site.status === 'closed') return closedNotice();

  // With its own domain connected (plan 2.4), the kennelport.com address sends
  // visitors there with the same path, so old links and printed QR codes keep
  // working. Not on staging, whose sites are reached through /__host. An hour's
  // cache, so a domain that's disconnected stops redirecting soon after.
  if (site.domain && !onDomain && !posting && env.ALLOW_HOST_OVERRIDE !== '1') {
    return new Response(null, { status: 301, headers: { location: `https://${site.domain}${url.pathname}${url.search}`, 'cache-control': 'public, max-age=3600' } });
  }

  // Opening a preview link: remember it on this host, then show the page.
  if (url.pathname === '/__preview') {
    const token = url.searchParams.get('t');
    if (!(await previewTokenValid(env, site.id, token))) {
      return htmlPage('Preview', '<h1>This preview link has expired</h1><p>Ask for a new one.</p>', { status: 403 });
    }
    const exp = Number(token.split('.')[1]);
    const maxAge = Math.max(0, exp - Math.floor(Date.now() / 1000));
    const next = url.searchParams.get('next') ?? '/';
    const location = /^\/(?!\/)/.test(next) ? next : '/';
    return new Response(null, { status: 303, headers: { location, 'set-cookie': `${PREVIEW_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`, 'cache-control': 'no-store' } });
  }
  if (url.pathname === '/__preview/exit') {
    return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `${PREVIEW_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`, 'cache-control': 'no-store' } });
  }

  const preview = await previewTokenValid(env, site.id, readCookie(request, PREVIEW_COOKIE));
  if (!preview && site.status === 'suspended') {
    return htmlPage('Unavailable', `<h1>${esc(site.kennel_name || site.subdomain)}</h1><p>This site isn't available right now.</p>`, { status: 503 });
  }

  const snap = preview ? await buildSnapshot(env, site.id) : await loadSnapshot(env, site.id, site.published_snapshot_id);

  if (url.pathname.startsWith('/_kp/p/')) return servePhoto(env, site, snap, url, { preview });
  if (url.pathname.startsWith('/_kp/d/')) return serveDocument(env, site, snap, url, { preview });

  const origin = url.origin;
  if (url.pathname === '/robots.txt') return text(robots({ origin }, { allow: Boolean(snap) && !preview }), 'text/plain');

  if (!snap && posting) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  if (!snap) {
    // Never published: nothing to show yet.
    return htmlPage(site.kennel_name || site.subdomain, `<h1>${esc(site.kennel_name || site.subdomain)}</h1><p>This website is being built.</p>`);
  }

  // The page at this address (render/parts.js pageAt): the breeder's own address for it,
  // or its starting one. A form sent from a page still open at an address she has
  // since renamed goes to the page it redirects to (a 301 would lose what was typed).
  let pageKey = pageAt(snap, url.pathname);
  if (posting && !FORM_PAGES.includes(pageKey)) {
    const r = await env.DB.prepare('SELECT new_path FROM redirects WHERE site_id = ? AND old_path = ?').bind(site.id, url.pathname).first();
    pageKey = r ? pageAt(snap, r.new_path) : null;
    if (!FORM_PAGES.includes(pageKey)) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  const ctx = { path: posting ? pagePath(snap, pageKey) : url.pathname, origin, today: today(), preview, portal: Boolean(site.portal_on), turnstileKey: turnstileOn(env) ? env.TURNSTILE_SITE_KEY : null };
  // The waitlist page is drawn from the snapshot and the list as it is now: the
  // KennelOS feed's five-minute copy, or the simple waitlist the breeder keeps (no
  // publish needed), so it isn't cached with the snapshot.
  // Policies too, with a KennelOS waitlist linked: its waitlist policies come from the feed.
  const live = pageKey === 'waitlist' || (pageKey === 'policies' && Boolean(site.kennelos_public_id));
  if (live && site.kennelos_public_id) ctx.feed = await readFeed(env, site.id, site.kennelos_public_id);
  else if (live) ctx.waitlist = await publicRows(env, site.id);

  // A visitor sending the contact form, a review or an application: never cached, answered with the
  // same page and a thank-you (or the problem, with what they typed).
  if (posting) {
    const from = request.headers.get('origin');
    if (from && from !== origin) return new Response('Forbidden', { status: 403 });
    const page = pageKey;
    if (!pageOn(snap, page, ctx)) return new Response('Not found', { status: 404 });
    const result = page === 'contact' ? await receiveInquiry(env, request, site.id, ctxWorker, snap)
      : page === 'waitlist' ? await receiveApplication(env, request, site.id, snap, ctxWorker, { kennelos: Boolean(ctx.feed?.feed?.form) })
        : await receiveReview(env, request, site.id, ctxWorker, snap);
    const { status, html: body } = renderPage(snap, { ...ctx, form: { page, ...result } });
    return html(body, result.ok ? status : 400, { 'cache-control': 'no-store' }, cspFor(env, page, ctx.feed));
  }
  if (url.pathname === '/sitemap.xml') return text(sitemap(snap, ctx), 'application/xml');

  // A full-registration link (a litter's "Ask about full registration"): the
  // contact form with its About line filled in from the snapshot. Not cached, as
  // the cache keys on the path alone.
  if (pageKey === 'contact' && url.searchParams.has('full-reg')) {
    const topic = fullRegTopic(snap, ctx, url.searchParams);
    const { status, html: body } = renderPage(snap, { ...ctx, prefill: topic ? { topic } : null });
    return html(body, status, { 'cache-control': preview ? 'private, no-store' : 'public, max-age=60' }, cspFor(env, pageKey));
  }

  // /about/ → /about, so every page has one address.
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    return new Response(null, { status: 301, headers: { location: url.pathname.replace(/\/+$/, '') + url.search } });
  }

  if (preview) {
    const { status, html: body } = renderPage(snap, ctx);
    return html(body, status, { 'cache-control': 'private, no-store' }, cspFor(env, pageKey, ctx.feed));
  }
  if (live) {
    const { status, html: body } = renderPage(snap, ctx);
    return html(body, status, { 'cache-control': 'public, max-age=60' }, cspFor(env, pageKey, ctx.feed));
  }

  // The cache: one entry per snapshot, path and day, and whether the portal is on
  // (it changes where Family login goes, without a publish).
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`${origin}${url.pathname}?__kp=${snap.id}.${ctx.today}${ctx.portal ? '.f' : ''}`);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set('cache-control', 'public, max-age=60');
      return res;
    }
  }

  let { status, html: body } = renderPage(snap, ctx);
  if (status === 404) {
    const r = await env.DB.prepare('SELECT new_path FROM redirects WHERE site_id = ? AND old_path = ?').bind(site.id, url.pathname).first();
    if (r) return new Response(null, { status: 301, headers: { location: r.new_path, 'cache-control': 'public, max-age=300' } });
  }
  const res = html(body, status, { 'cache-control': 'public, max-age=60' }, cspFor(env, pageKey));
  if (cache && status === 200) {
    const stored = res.clone();
    const put = cache.put(cacheKey, new Response(stored.body, { status, headers: { ...Object.fromEntries(stored.headers), 'cache-control': 'public, max-age=86400' } }));
    if (ctxWorker?.waitUntil) ctxWorker.waitUntil(put); else await put;
  }
  return res;
}

