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
import { pageOn } from './render/parts.js';
import { readFeed } from './feed.js';

export const PREVIEW_COOKIE = 'kp_preview';
export const PREVIEW_DAYS = 7;

// The site's own pages may load only what the template serves from the site
// itself (plan 3.3). Phase 3 adds Turnstile on form pages.
export const SITE_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
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
const FORM_PATHS = ['/contact', '/reviews', '/waitlist'];
const withTurnstile = (csp) => csp.replace("script-src 'self'", `script-src 'self' ${TURNSTILE}`).replace("connect-src 'self'", `connect-src 'self' ${TURNSTILE}`).replace("default-src 'none';", `default-src 'none'; frame-src ${TURNSTILE};`);
// The waitlist page with KennelOS's application form (plan 3.8): the visitor's
// browser sends the sealed application straight to KennelOS, and runs KennelOS's
// Turnstile check, so that page alone may connect to the KennelOS family host.
const cspFor = (env, path, feed = null) => {
  if (path === '/waitlist' && feed?.feed?.form) {
    const csp = SITE_CSP.replace("connect-src 'self'", `connect-src 'self' ${feed.origin}`);
    return feed.feed.form.turnstile_site_key ? withTurnstile(csp) : csp;
  }
  return turnstileOn(env) && FORM_PATHS.includes(path) ? withTurnstile(SITE_CSP) : SITE_CSP;
};
const html = (body, status = 200, extra = {}, csp = SITE_CSP) => new Response(body, {
  status, headers: { 'content-type': 'text/html; charset=utf-8', ...SITE_HEADERS, 'content-security-policy': csp, ...extra },
});
const text = (body, type, extra = {}) => new Response(body, { headers: { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'public, max-age=300', ...extra } });

function closedNotice() {
  return htmlPage('No longer hosted', '<h1>This breeder is no longer hosting with KennelPort.</h1><p>The site that was here has closed.</p>', { status: 410 });
}

async function servePhoto(env, site, snap, url, { preview }) {
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

export async function serveSite(request, env, ctxWorker, subdomain) {
  const url = new URL(request.url);
  const formPost = request.method === 'POST' && FORM_PATHS.includes(url.pathname);
  if (request.method !== 'GET' && request.method !== 'HEAD' && !formPost) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  if (!(await schemaReady(env.DB))) {
    return htmlPage('Back soon', '<h1>Back soon</h1><p>This site is being updated. Please try again in a few minutes.</p>', { status: 503, headers: { 'retry-after': '300' } });
  }

  const site = await env.DB.prepare('SELECT id, subdomain, kennel_name, status, published_snapshot_id, kennelos_public_id FROM sites WHERE subdomain = ?').bind(subdomain).first();
  if (!site) return htmlPage('Not found', '<h1>Not found</h1><p>No KennelPort site has this address.</p>', { status: 404 });
  if (site.status === 'closed') return closedNotice();

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

  const origin = url.origin;
  if (url.pathname === '/robots.txt') return text(robots({ origin }, { allow: Boolean(snap) && !preview }), 'text/plain');

  if (!snap) {
    // Never published: nothing to show yet.
    return htmlPage(site.kennel_name || site.subdomain, `<h1>${esc(site.kennel_name || site.subdomain)}</h1><p>This website is being built.</p>`);
  }

  const ctx = { path: url.pathname, origin, today: today(), preview, turnstileKey: turnstileOn(env) ? env.TURNSTILE_SITE_KEY : null };
  // The waitlist page of a site linked to a KennelOS waitlist is drawn from the
  // snapshot and the feed's five-minute copy, so it isn't cached with the snapshot.
  const live = url.pathname === '/waitlist' && site.kennelos_public_id;
  if (live) ctx.feed = await readFeed(env, site.id, site.kennelos_public_id);

  // A visitor sending the contact form, a review or an application: never cached, answered with the
  // same page and a thank-you (or the problem, with what they typed).
  if (formPost) {
    const from = request.headers.get('origin');
    if (from && from !== origin) return new Response('Forbidden', { status: 403 });
    const page = url.pathname.slice(1);
    if (!pageOn(snap, page, ctx)) return new Response('Not found', { status: 404 });
    const result = page === 'contact' ? await receiveInquiry(env, request, site.id, ctxWorker)
      : page === 'waitlist' ? await receiveApplication(env, request, site.id, snap, ctxWorker, { kennelos: Boolean(ctx.feed?.feed?.form) })
        : await receiveReview(env, request, site.id, ctxWorker);
    const { status, html: body } = renderPage(snap, { ...ctx, form: { page, ...result } });
    return html(body, result.ok ? status : 400, { 'cache-control': 'no-store' }, cspFor(env, url.pathname, ctx.feed));
  }
  if (url.pathname === '/sitemap.xml') return text(sitemap(snap, ctx), 'application/xml');

  // /about/ → /about, so every page has one address.
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    return new Response(null, { status: 301, headers: { location: url.pathname.replace(/\/+$/, '') + url.search } });
  }

  if (preview) {
    const { status, html: body } = renderPage(snap, ctx);
    return html(body, status, { 'cache-control': 'private, no-store' }, cspFor(env, url.pathname, ctx.feed));
  }
  if (live) {
    const { status, html: body } = renderPage(snap, ctx);
    return html(body, status, { 'cache-control': 'public, max-age=60' }, cspFor(env, url.pathname, ctx.feed));
  }

  // The cache: one entry per snapshot, path and day.
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`${origin}${url.pathname}?__kp=${snap.id}.${ctx.today}`);
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
  const res = html(body, status, { 'cache-control': 'public, max-age=60' }, cspFor(env, url.pathname));
  if (cache && status === 200) {
    const stored = res.clone();
    const put = cache.put(cacheKey, new Response(stored.body, { status, headers: { ...Object.fromEntries(stored.headers), 'cache-control': 'public, max-age=86400' } }));
    if (ctxWorker?.waitUntil) ctxWorker.waitUntil(put); else await put;
  }
  return res;
}

