// The manage app (plan 4): what a breeder sees on manage.kennelport.com, in a
// browser or installed on a phone as KennelPort Site Manager. Server-rendered
// pages, a small script (public/_kp/m/app.js) that keeps a form's contents when
// saving fails offline, and a service worker that lets the screens open offline.
//
// Every POST must come from this origin (Origin, or Sec-Fetch-Site), on top of
// the session cookie's SameSite=Lax: site subdomains are same-site with the
// manage host, so the cookie alone isn't enough.
import { APP_VERSION } from './version.js';
import { escapeHtml as esc } from '../lib/html.js';
import {
  startSignIn, verifySignIn, currentUser, signOut, clearSessionCookie, AuthError, CODE_TTL_MS,
} from '../auth.js';
import { makePreviewToken } from '../site.js';
import { listSnapshots } from '../publish.js';
import { siteLink } from '../ops/sites.js';
import { createScreens } from './screens.js';
import { vapidConfig, subscribe, unsubscribe, testPush, pendingPush, subscriptionFor } from '../push.js';

export const MANAGE_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const HEADERS = {
  'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': MANAGE_CSP,
  'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY',
};

const redirect = (location, headers = {}) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', ...headers } });

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin) return origin === new URL(request.url).origin;
  const site = request.headers.get('sec-fetch-site');
  return site === 'same-origin' || site === 'none';
}

function page(title, body, { status = 200, back = null, headers = {} } = {}) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${esc(title)} · KennelPort</title>
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#034655">
<link rel="icon" href="/_kp/m/icon-64.png" type="image/png">
<link rel="apple-touch-icon" href="/_kp/m/icon-180.png">
<meta name="apple-mobile-web-app-title" content="Site Manager">
<link rel="stylesheet" href="/_kp/m/app.css?v=${APP_VERSION}">
<script src="/_kp/m/app.js?v=${APP_VERSION}" defer></script>
<script src="/_kp/m/photos.js?v=${APP_VERSION}" defer></script>
</head><body>
<header class="top">${back ? `<a class="back" href="${esc(back)}" aria-label="Back">‹</a>` : '<img class="mark" src="/_kp/m/icon-64.png" alt="" width="32" height="32">'}<span class="title">${esc(title)}</span></header>
<main>${body}</main>
<p class="offline-note" id="offline-note" hidden role="status">You're offline. You can look around, but saving needs a connection.</p>
</body></html>`, { status, headers: { ...HEADERS, ...headers } });
}

// ---------- sign-in ----------

function signInPage({ error, email = '' } = {}) {
  return page('Sign in', `<section class="card">
  <h1>KennelPort Site Manager</h1>
  <p class="muted">Sign in with the email address your website was set up with. We'll send you a 6-digit code; there's no password.</p>
  ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
  <form method="post" action="/signin" data-save>
    <label>Email<input type="email" name="email" value="${esc(email)}" autocomplete="email" inputmode="email" required></label>
    <button class="primary">Send me a code</button>
  </form></section>`, { status: error ? 400 : 200 });
}

function codePage({ email, error } = {}) {
  return page('Your code', `<section class="card">
  <h1>Check your email</h1>
  <p class="muted">If <strong>${esc(email)}</strong> manages a KennelPort site, a 6-digit code is on its way. It works for ${CODE_TTL_MS / 60000} minutes.</p>
  ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
  <form method="post" action="/signin/verify" data-save>
    <input type="hidden" name="email" value="${esc(email)}">
    <label>Code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required autofocus></label>
    <input type="hidden" name="label" value="">
    <button class="primary">Sign in</button>
  </form>
  <form method="post" action="/signin" class="inline"><input type="hidden" name="email" value="${esc(email)}"><button class="link">Send a new code</button></form>
  <p><a href="/">Use a different email</a></p></section>`, { status: error ? 400 : 200 });
}

// ---------- signed in ----------

function sitesPage(user) {
  if (!user.sites.length) {
    return page('No sites', `<section class="card"><h1>No website here yet</h1><p class="muted">This email isn't on any KennelPort site right now. If you think it should be, ask whoever set up your site.</p>
      <form method="post" action="/signout"><button class="link">Sign out</button></form></section>`);
  }
  return page('Your sites', `<ul class="tiles">${user.sites.map((s) => `<li><a class="tile" href="/s/${esc(s.subdomain)}"><b>${esc(s.kennel_name || s.subdomain)}</b><span>${esc(s.subdomain)}</span></a></li>`).join('')}</ul>
    <form method="post" action="/signout"><button class="link">Sign out</button></form>`);
}

const STATUS_WORDS = { draft: 'Not published yet', live: 'Live', suspended: 'Switched off by KennelPort' };

async function siteHome(env, user, site) {
  const snaps = await listSnapshots(env, site.id);
  const full = await env.DB.prepare('SELECT draft_changed_at, published_snapshot_id FROM sites WHERE id = ?').bind(site.id).first();
  const live = snaps.find((x) => x.id === full.published_snapshot_id);
  const changed = full.draft_changed_at && (!live || full.draft_changed_at > live.published_at);
  const unread = await env.DB.prepare('SELECT COUNT(*) AS n FROM inquiries WHERE site_id = ? AND read_at IS NULL').bind(site.id).first('n');
  const pending = await env.DB.prepare("SELECT COUNT(*) AS n FROM stories WHERE site_id = ? AND status = 'pending'").bind(site.id).first('n');
  const listed = await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist_entries WHERE site_id = ? AND status = 'waiting'").bind(site.id).first('n');
  const tile = (href, label, note, count) => `<li><a class="tile" href="/s/${esc(site.subdomain)}${href}"><b>${esc(label)}</b><span>${esc(note)}</span>${count ? `<span class="count">${count}</span>` : ''}</a></li>`;
  const previewLink = siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(await makePreviewToken(env, site.id, 1))}`);
  return page(site.kennel_name || site.subdomain, `
  <section class="card status">
    <p><span class="dot ${site.status}"></span>${esc(STATUS_WORDS[site.status] ?? site.status)}${changed ? ' · <strong>changes not published yet</strong>' : ''}</p>
    <p class="row"><a class="button" href="${esc(siteLink(env, site.subdomain))}">View my site</a><a class="button" href="${esc(previewLink)}">Preview changes</a></p>
    <p><a class="button primary" href="/s/${esc(site.subdomain)}/publish">${changed ? 'Review and publish' : 'Publish'}</a></p>
  </section>
  <ul class="tiles">
    ${tile('/puppies', 'Puppies', 'Statuses at a glance')}
    ${tile('/photos', 'Photos', 'From your camera roll')}
    ${tile('/inbox', 'Inbox', 'Messages from your site', unread)}
    ${tile('/reviews-queue', 'Reviews to approve', 'From families', pending)}
    ${tile('/dogs', 'Dogs', 'Cards, health results')}
    ${tile('/litters', 'Litters', 'Planned, current, past')}
    ${tile('/pages', 'Pages and wording', 'Home, about, policies, FAQ…')}
    ${tile('/lists/extras', 'Extras', 'Packages and prices')}
    ${tile('/waitlist', 'Your waitlist', listed ? `${listed} famil${listed === 1 ? 'y' : 'ies'} waiting` : 'Families in order, offer pups')}
    ${tile('/pages/waitlist', 'Waitlist and application', 'Open or closed, your questions')}
    ${tile('/payment', 'How to pay', 'Fee, deposit, scam warning')}
    ${tile('/lists/reviews', 'Reviews', 'Add or hide')}
    ${tile('/details', 'Kennel details', 'Name, contact, town')}
  </ul>
  <p class="row"><a class="button" href="/notifications">Notifications on this device</a><a class="button" href="/s/${esc(site.subdomain)}/account">Your site: storage, copy, delete</a></p>
  <p class="muted small">Your role: ${esc(site.role)}.${user.sites.length > 1 ? ' <a href="/">Your other sites</a>.' : ''}</p>
  <form method="post" action="/signout"><button class="link">Sign out</button></form>`);
}

function notificationsPage(env, user) {
  const { ready, publicKey } = vapidConfig(env);
  const back = user.sites.length === 1 ? `/s/${user.sites[0].subdomain}` : '/';
  return page('Notifications', `<section class="card" id="push" data-key="${esc(publicKey ?? '')}">
    <h1>Notifications</h1>
    <p class="muted">Get a notification on this phone or computer when someone sends a message from your site, or a family sends a review to approve. It says who it's from, never what they wrote.</p>
    ${ready ? `<p id="push-state" class="muted small" role="status">Checking this device…</p>
    <p class="row"><button class="primary" id="push-on" hidden>Turn on for this device</button><button id="push-test" hidden>Send a test</button><button id="push-off" hidden>Turn off</button></p>
    <p class="muted small" id="push-ios" hidden>On an iPhone or iPad, notifications work only in the app on your home screen: in Safari, tap Share, then Add to Home Screen, open Site Manager from there and come back to this page.</p>`
    : '<p class="muted">Notifications aren\'t set up on KennelPort yet.</p>'}
    <p class="muted small">Each device is turned on separately. Signing out turns this device off.</p>
  </section>`, { back });
}

// ---------- the app's own files ----------

function manifest() {
  return new Response(JSON.stringify({
    name: 'KennelPort Site Manager', short_name: 'Site Manager', start_url: '/', scope: '/', display: 'standalone',
    background_color: '#FCF4E9', theme_color: '#034655', description: 'Manage your KennelPort website.',
    icons: [
      { src: '/_kp/m/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/_kp/m/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/_kp/m/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }), { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } });
}

async function serviceWorker(env, request) {
  const res = await env.ASSETS.fetch(new Request(new URL('/_kp/m/sw.js', request.url)));
  const body = res.ok ? (await res.text()).replaceAll('__APP_VERSION__', APP_VERSION) : res.body;
  return new Response(body, { status: res.status, headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', 'service-worker-allowed': '/' } });
}

// ---------- routes ----------

export async function handleManage(request, env, url) {
  const { pathname } = url;
  if (pathname === '/manifest.webmanifest') return manifest();
  if (pathname === '/sw.js' && env.ASSETS) return serviceWorker(env, request);
  if (pathname === '/deleted') return page('Site deleted', '<section class="card"><h1>Your site has been deleted</h1><p class="muted">Everything on it is gone, and its address now says you\'re no longer hosting with KennelPort.</p><p><a href="/">KennelPort Site Manager</a></p></section>');
  if (pathname === '/offline') return page('Offline', '<section class="card"><h1>You\'re offline</h1><p class="muted">This screen will load when you\'re back online.</p></section>');

  // The service worker asking what a push should say: no session needed, the
  // subscription's own secret proves it (push.js).
  if (pathname === '/push/pending' && request.method === 'POST') {
    let body = {};
    try { body = await request.json(); } catch { /* empty */ }
    const text = await pendingPush(env, body);
    return new Response(JSON.stringify(text ?? { title: 'KennelPort', body: 'Something new on your website.', path: '/', tag: 'kennelport' }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }

  const post = request.method === 'POST';
  if (post && !sameOrigin(request)) return page('Not allowed', '<section class="card"><p>That form didn\'t come from this app.</p></section>', { status: 403 });

  try {
    if (pathname === '/signin' && post) {
      const form = await request.formData();
      const { email } = await startSignIn(env, request, form.get('email'));
      return codePage({ email });
    }
    if (pathname === '/signin/verify' && post) {
      const form = await request.formData();
      try {
        const { cookie } = await verifySignIn(env, form.get('email'), form.get('code'), request.headers.get('user-agent')?.slice(0, 80));
        return redirect('/', { 'set-cookie': cookie });
      } catch (err) {
        if (err instanceof AuthError) return codePage({ email: String(form.get('email') ?? ''), error: err.message });
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof AuthError) return signInPage({ error: err.message });
    throw err;
  }

  const user = await currentUser(env, request);
  if (pathname === '/signout' && post) {
    if (user) await signOut(env, user);
    return redirect('/', { 'set-cookie': clearSessionCookie() });
  }
  if (!user) return pathname === '/' ? signInPage() : redirect('/');

  if (pathname.startsWith('/push/') && post) {
    let body = {};
    try { body = await request.json(); } catch { /* empty */ }
    const reply = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    if (pathname === '/push/subscribe') { const r = await subscribe(env, user, body); return reply(r, r.ok ? 200 : 400); }
    if (pathname === '/push/unsubscribe') { await unsubscribe(env, user, body.endpoint); return reply({ ok: true }); }
    if (pathname === '/push/test') return reply({ ok: await testPush(env, user, body.endpoint) });
    if (pathname === '/push/status') return reply({ on: Boolean(await subscriptionFor(env, user, body.endpoint)) });
  }
  if (pathname === '/notifications') return notificationsPage(env, user);
  if (pathname === '/') return user.sites.length === 1 ? redirect(`/s/${user.sites[0].subdomain}`) : sitesPage(user);

  const m = pathname.match(/^\/s\/([a-z0-9-]+)(\/.*)?$/);
  if (m) {
    const site = user.sites.find((s) => s.subdomain === m[1]);
    if (!site) return page('Not found', '<section class="card"><p>You don\'t manage a site at this address.</p><p><a href="/">Your sites</a></p></section>', { status: 404 });
    if (!m[2] && !post) return siteHome(env, user, site);
    if (m[2]) {
      const res = await createScreens({ env, request, url, site, user, page })();
      if (res) return res;
    }
  }
  return page('Not found', '<section class="card"><p>There\'s nothing here.</p><p><a href="/">Home</a></p></section>', { status: 404 });
}
