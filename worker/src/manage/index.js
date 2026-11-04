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
import { createScreens, matchesWaiting } from './screens.js';
import { kennelosState } from '../feed.js';
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

const SPRITE = `<svg class="sprite" width="0" height="0" aria-hidden="true">${Object.entries({
  paw: '<circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5 0 1.5 1.5 2 3 1.6 1.2-.3 2-.6 3-.6s1.8.3 3 .6c1.5.4 3-.1 3-1.6C18 16 15 12 12 12z"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.6 12 20 12 20z"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.5"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.8 5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  pages: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8c-1.5-3-5-4-5-1.5S10 8 12 8zM12 8c1.5-3 5-4 5-1.5S14 8 12 8z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
}).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${d}</symbol>`).join('')}</svg>`;
const ic = (n) => `<span class="ic" aria-hidden="true"><svg class="i"><use href="#i-${n}"/></svg></span>`;

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
${SPRITE}
<header class="top">${back ? `<a class="back" href="${esc(back)}" aria-label="Back">‹</a>` : '<img class="mark" src="/_kp/m/icon-64.png" alt="" width="32" height="32">'}<span class="title"><small>Site Manager</small><b>${esc(title)}</b></span></header>
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
  const TILE_ICONS = { '/puppies': 'paw', '/litters': 'heart', '/photos': 'camera', '/waitlist': 'list', '/inbox': 'mail', '/dogs': 'star' };
  const tile = (href, label, note, count, off = false) => `<li><a class="tile${off ? ' off' : ''}" href="/s/${esc(site.subdomain)}${href}"><b>${esc(label)}</b><span>${esc(note)}</span>${count ? `<span class="count">${count}</span>` : ''}${ic(TILE_ICONS[href] ?? 'star')}</a></li>`;
  // Linked to a KennelOS waitlist (plan 3.8): the simple waitlist isn't used, and
  // while KennelOS takes applications online, neither are the site's questions.
  const kos = await kennelosState(env, site.id);
  const previewLink = siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(await makePreviewToken(env, site.id, 1))}`);
  // The KennelOS link (plan 5): what the last Update website brought, until read.
  const linkRow = await env.DB.prepare('SELECT MAX(last_bundle_at) AS at, COUNT(*) AS n FROM links WHERE site_id = ? AND revoked_at IS NULL').bind(site.id).first();
  const matches = await env.DB.prepare('SELECT COUNT(*) AS n FROM link_pending WHERE site_id = ?').bind(site.id).first('n');
  const leaving = await env.DB.prepare('SELECT COUNT(*) AS n FROM litters WHERE site_id = ? AND left_site_at IS NOT NULL').bind(site.id).first('n');
  const { results: notices } = await env.DB.prepare('SELECT id, message, created_at FROM notices WHERE site_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 3').bind(site.id).all();
  const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const ITEM_ICONS = { '/inbox': 'mail', '/reviews-queue': 'star', '/litters#leaving': 'heart', '/pages': 'pages', '/pages/waitlist': 'list', '/payment': 'card', '/lists/extras': 'gift', '/lists/products': 'tag', '/lists/reviews': 'star', '/details': 'home', '/kennelos': 'link' };
  const item = (href, label, note) => `<li class="item"><a href="/s/${esc(site.subdomain)}${href}">${ic(ITEM_ICONS[href] ?? 'pages')}<b>${esc(label)}</b><span>${esc(note)}</span></a></li>`;
  // Needs you: what came in and is waiting, shown only while something is.
  const waiting = [
    unread ? item('/inbox', `${unread} new message${unread === 1 ? '' : 's'}`, 'In your inbox') : '',
    pending ? item('/reviews-queue', `${pending} review${pending === 1 ? '' : 's'} to approve`, 'From families') : '',
    leaving ? item('/litters#leaving', `${leaving} litter${leaving === 1 ? '' : 's'} leaving your site`, 'Keep or remove') : '',
  ].filter(Boolean);
  return page(site.kennel_name || site.subdomain, `
  ${matches ? matchesWaiting(site.subdomain, matches) : ''}
  ${notices.map((n) => `<section class="card notice-card" role="status"><p>${esc(n.message)}</p><p class="row"><a class="button" href="/s/${esc(site.subdomain)}/publish">Review and publish</a><form method="post" action="/s/${esc(site.subdomain)}/notices/${esc(n.id)}/read"><button class="link">Done</button></form></p></section>`).join('')}
  <section class="card status">
    <p><span class="dot ${site.status}"></span>${esc(STATUS_WORDS[site.status] ?? site.status)}${changed ? ' · <strong>changes not published yet</strong>' : ''}</p>
    <p class="row"><a class="button" href="${esc(siteLink(env, site.subdomain))}">View my site</a><a class="button" href="${esc(previewLink)}">Preview changes</a><a class="button" href="/s/${esc(site.subdomain)}/share">Share</a></p>
    <p><a class="button primary" href="/s/${esc(site.subdomain)}/publish">${changed ? 'Review and publish' : 'Publish'}</a></p>
  </section>
  ${waiting.length ? `<section class="card" id="needs-you"><h2>Needs you</h2><ul class="items">${waiting.join('')}</ul></section>` : ''}
  <ul class="tiles">
    ${tile('/puppies', 'Puppies', 'Statuses at a glance')}
    ${tile('/litters', 'Litters', leaving ? `${leaving} leaving your site` : 'Planned, current, past', leaving)}
    ${tile('/photos', 'Photos and albums', 'Camera roll, galleries')}
    ${kos.linked ? '' : tile('/waitlist', 'Your waitlist', listed ? `${listed} famil${listed === 1 ? 'y' : 'ies'} waiting` : 'Families in order, offer pups', listed)}
    ${tile('/inbox', 'Inbox', 'Messages from your site', unread)}
    ${tile('/dogs', 'Dogs', 'Cards, health results')}
  </ul>
  <section class="card" id="set-up"><h2>Set up your site</h2><p class="muted small">Set once, change now and then.</p><ul class="items">
    ${item('/pages', 'Pages and wording', 'Home, about, policies, FAQ…')}
    ${item('/pages/waitlist', 'Waitlist and application', kos.linked ? (kos.online ? 'Linked to KennelOS, which takes your applications' : 'Linked to KennelOS · your questions') : kos.offered ? 'Your questions, or link KennelOS' : 'Open or closed, your questions')}
    ${item('/payment', 'How to pay', 'Fee, deposit, scam warning')}
    ${item('/lists/extras', 'Extras', 'Packages and prices')}
    ${item('/lists/products', 'Recommended products', 'Referral links, codes, home badges')}
    ${item('/lists/reviews', 'Reviews', 'Add or hide')}
    ${item('/details', 'Kennel details', 'Name, contact, town')}
    ${item('/kennelos', 'KennelOS', linkRow?.n ? (linkRow.at ? `Linked · last update ${day(linkRow.at)}` : 'Linked · no update yet') : 'Link your dogs and litters')}
  </ul></section>
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
    background_color: '#F5F2EA', theme_color: '#034655', description: 'Manage your KennelPort website.',
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
  // KennelOS's "get a link code" link: straight to Link KennelOS with one site,
  // else the list of sites to pick from.
  if (pathname === '/link-kennelos') return user.sites.length === 1 ? redirect(`/s/${user.sites[0].subdomain}/kennelos`) : sitesPage(user);

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
