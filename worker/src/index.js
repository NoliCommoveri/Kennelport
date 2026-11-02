// The KennelPort Worker (plan section 2): one Worker for every site, the manage
// app, the ops console and the KennelOS link API. It picks what a request is for
// from its hostname (hosts.js).
//
// Phase 0: the routing, the bindings and /ops are real; every page is a plain
// placeholder until the template (phase 1) and the manage app (phase 2) exist.
//
// Never logged: an email address, a code, a token or a request body.
import { handleOps } from './ops.js';
import { schemaReady } from './gate.js';
import { classifyHost, effectiveHost, HOST_COOKIE } from './hosts.js';
import { json, readCookie } from './lib/http.js';
import { escapeHtml as esc, htmlPage } from './lib/html.js';
import { serveSite } from './site.js';

const notFound = (what = 'There is no page at this address.') =>
  htmlPage('Not found', `<h1>Not found</h1><p>${esc(what)}</p>`, { status: 404 });


// Staging only: choose which hostname to act as (hosts.js).
function hostOverride(url, env) {
  const h = (url.searchParams.get('h') ?? '').toLowerCase();
  const clear = url.searchParams.has('clear') || !h;
  const cookie = clear
    ? `${HOST_COOKIE}=; Path=/; Secure; SameSite=Lax; Max-Age=0`
    : `${HOST_COOKIE}=${encodeURIComponent(h)}; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
  if (!clear && !/^[a-z0-9.-]{1,253}$/.test(h)) return htmlPage('Host', '<p>Not a hostname.</p>', { status: 400 });
  const body = clear
    ? `<h1>Staging host</h1><p>Cleared: this staging Worker acts as <code>manage.${esc(env.ROOT_DOMAIN)}</code>.</p>`
    : `<h1>Staging host</h1><p>This browser now sees staging as <code>${esc(h)}</code>. <a href="/">Open it</a>.</p>`;
  return htmlPage('Staging host', `${body}<p class="muted">Use <code>/__host?h=thornfield.${esc(env.ROOT_DOMAIN)}</code> to act as a site, <code>/__host?clear</code> to go back.</p>`, { headers: { 'set-cookie': cookie } });
}

// The template's own files (CSS, JS, fonts) under /_kp/, the same on every host.
// Photos (/_kp/p/) are a site's own and go through serveSite.
async function serveAsset(request, env) {
  if (!env.ASSETS) return notFound();
  const res = await env.ASSETS.fetch(request);
  if (!res.ok) return res;
  const out = new Response(res.body, res);
  const fonts = new URL(request.url).pathname.startsWith('/_kp/fonts/');
  out.headers.set('cache-control', fonts ? 'public, max-age=31536000, immutable' : 'public, max-age=86400');
  out.headers.set('x-content-type-options', 'nosniff');
  if (fonts) out.headers.set('access-control-allow-origin', '*');
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/_kp/') && !url.pathname.startsWith('/_kp/p/')) return serveAsset(request, env);

    if (env.ALLOW_HOST_OVERRIDE === '1' && url.pathname === '/__host') return hostOverride(url, env);

    const target = classifyHost(effectiveHost(request, env, readCookie), env.ROOT_DOMAIN);

    switch (target.kind) {
      case 'home':
        return htmlPage('KennelPort', '<h1>KennelPort</h1><p>Websites for dog breeders.</p>', { noindex: false });

      case 'manage':
        if (url.pathname === '/ops' || url.pathname.startsWith('/ops/')) return handleOps(request, env);
        if (url.pathname === '/health') {
          const ready = env.DB ? await schemaReady(env.DB) : false;
          return json({ ok: ready, maintenance: !ready });
        }
        if (url.pathname === '/') return htmlPage('KennelPort Site Manager', '<h1>KennelPort Site Manager</h1><p>Coming soon.</p>');
        return notFound();

      case 'api':
        if (url.pathname === '/health') {
          const ready = env.DB ? await schemaReady(env.DB) : false;
          return json({ ok: ready, maintenance: !ready });
        }
        return json({ error: 'not_found' }, 404);

      case 'site':
        return serveSite(request, env, ctx, target.subdomain);

      // Custom domains and their fallback host arrive in phase 1 (by hand, plan 2.4).
      case 'fallback':
      case 'custom':
      case 'reserved':
      case 'unknown':
      default:
        return notFound();
    }
  },
};
