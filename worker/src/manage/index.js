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
import { handlePortalAdmin, portalNeedsYou, todayLists } from '../portal/admin.js';
import { nav, goingHome, dogsTab, lastFromKennelos } from './hub.js';
import { getSettings } from '../portal/store.js';
import { localParts } from '../portal/vet.js';
import { vapidConfig, subscribe, unsubscribe, testPush, pendingPush, subscriptionFor } from '../push.js';
import { isAdmin, asAdmin, clearAdminCookie } from '../admin.js';
import { handleBuilder } from './builder.js';
import { NOT_FOR_DEMO } from '../lib/demo.js';

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
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  vet: '<path d="M6 3v6a5 5 0 0 0 10 0V3"/><path d="M11 14v2a5 5 0 0 0 10 0v-2"/><circle cx="21" cy="12" r="1.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  draft: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2.5h6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  up1: '<path d="m6 15 6-6 6 6"/>',
  down1: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  book: '<path d="M3 5h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
}).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${d}</symbol>`).join('')}</svg>`;
const ic = (n) => `<span class="ic" aria-hidden="true"><svg class="i"><use href="#i-${n}"/></svg></span>`;

// nav: { sub, tab } puts her tabs on the page (sites with the puppy portal, plan 7.3).
// admin: { nav, site } is the owner's build view (builder.js): the site builder's
// header with the Admin pill, and its own nav.
function page(title, body, { status = 200, back = null, headers = {}, nav: tabs = null, brand = null, backLabel = 'Back', admin = null } = {}) {
  const header = admin
    ? `<header class="top adminhead"><a class="brand" href="/admin"><span class="logo" aria-hidden="true"><span class="kp">KP</span></span><span class="title"><b>KennelPort</b><small><svg class="i" aria-hidden="true"><use href="#i-sliders"/></svg>Site builder</small></span></a>
<span class="adminpill">Admin</span>${admin.site ? `<a class="button small onfill" href="/s/${esc(admin.site.subdomain)}"><svg class="i" aria-hidden="true"><use href="#i-eye"/></svg>As ${esc((admin.site.kennel_name || admin.site.subdomain).split(' ')[0])}</a>` : ''}</header>`
    : brand
    ? `<header class="top brandhead"><a class="brand" href="/s/${esc(brand.sub)}"><span class="logo">${brand.logo ? `<img src="/s/${esc(brand.sub)}/photos/${esc(brand.logo)}/thumb" alt="">` : ''}<span class="mono">${esc(brand.monogram || (brand.name || '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2))}</span></span><span class="title"><b>${esc(brand.name)}</b><small><svg class="i" aria-hidden="true"><use href="#i-globe"/></svg>Site Manager</small></span></a>
<a class="hb" href="/s/${esc(brand.sub)}/account" aria-label="Your account and site"><svg class="i" aria-hidden="true"><use href="#i-user"/></svg></a></header>`
    : `<header class="top">${back ? `<a class="back" href="${esc(back)}" aria-label="Back">‹</a>` : '<img class="mark" src="/_kp/m/icon-64.png" alt="" width="32" height="32">'}<span class="title"><small>Site Manager</small><b>${esc(title)}</b></span></header>`;
  // With her header, the title opens the page (unless the screen has its own), and
  // a sub-screen's way back is a crumb above it.
  const head = brand && !/<h1[\s>]/.test(body) ? `<div class="pagehead">${back ? '' : `<span class="eyebrow">${esc(brand.name)}</span>`}<h1>${esc(title)}</h1></div>` : '';
  const crumb = brand && back ? `<p class="crumb"><a href="${esc(back)}">‹ ${esc(backLabel)}</a></p>` : '';
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
</head><body${admin ? ' class="tabbed admin"' : tabs ? ' class="tabbed"' : ''}>
${SPRITE}
${admin ? admin.nav : tabs ? nav(tabs.sub, tabs.tab) : ''}
${header}
<main>${crumb}${head}${body}</main>
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
  </form>
  <p class="muted small">By signing in you agree to KennelPort's <a href="https://kennelport.com/terms">terms of use</a>.</p></section>`, { status: error ? 400 : 200 });
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

const plainPage = page;

function sitesPage(user) {
  if (!user.sites.length) {
    return page('No sites', `<section class="card"><h1>No website here yet</h1><p class="muted">This email isn't on any KennelPort site right now. If you think it should be, ask whoever set up your site.</p>
      <form method="post" action="/signout"><button class="link">Sign out</button></form></section>`);
  }
  return page('Your sites', `<ul class="tiles">${user.sites.map((s) => `<li><a class="tile" href="/s/${esc(s.subdomain)}"><b>${esc(s.kennel_name || s.subdomain)}</b><span>${esc(s.subdomain)}</span></a></li>`).join('')}</ul>
    <form method="post" action="/signout"><button class="link">Sign out</button></form>`);
}

const STATUS_WORDS = { draft: 'Not published yet', live: 'Live', suspended: 'Switched off by KennelPort' };

async function siteHome(env, user, site, view = 'today', page = plainPage) {
  const snaps = await listSnapshots(env, site.id);
  const full = await env.DB.prepare('SELECT draft_changed_at, published_snapshot_id FROM sites WHERE id = ?').bind(site.id).first();
  const live = snaps.find((x) => x.id === full.published_snapshot_id);
  const changed = full.draft_changed_at && (!live || full.draft_changed_at > live.published_at) && site.demo_step == null;
  const unread = await env.DB.prepare('SELECT COUNT(*) AS n FROM inquiries WHERE site_id = ? AND read_at IS NULL').bind(site.id).first('n');
  const pending = await env.DB.prepare("SELECT COUNT(*) AS n FROM stories WHERE site_id = ? AND status = 'pending'").bind(site.id).first('n');
  const listed = await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist_entries WHERE site_id = ? AND status = 'waiting'").bind(site.id).first('n');
  const TILE_ICONS = { '/portal': 'people', '/puppies': 'paw', '/litters': 'heart', '/photos': 'camera', '/waitlist': 'list', '/inbox': 'mail', '/dogs': 'star' };
  const tile = (href, label, note, count, off = false) => `<li><a class="tile${off ? ' off' : ''}" href="/s/${esc(site.subdomain)}${href}"><b>${esc(label)}</b><span>${esc(note)}</span>${count ? `<span class="count">${count}</span>` : ''}${ic(TILE_ICONS[href] ?? 'star')}</a></li>`;
  // Linked to a KennelOS waitlist (plan 3.8): the simple waitlist isn't used, and
  // while KennelOS takes applications online, neither are the site's questions.
  const kos = await kennelosState(env, site.id);
  // The demo (kennelos/demo.js): no preview link, nothing to publish; it opens in the admin view.
  const demo = site.demo_step != null;
  const previewLink = demo ? null : siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(await makePreviewToken(env, site.id, 1))}`);
  // The KennelOS link (plan 5): what the last Update website brought, until read.
  const linkRow = await env.DB.prepare('SELECT MAX(last_bundle_at) AS at, COUNT(*) AS n FROM links WHERE site_id = ? AND revoked_at IS NULL').bind(site.id).first();
  const matches = await env.DB.prepare('SELECT COUNT(*) AS n FROM link_pending WHERE site_id = ?').bind(site.id).first('n');
  const leaving = await env.DB.prepare('SELECT COUNT(*) AS n FROM litters WHERE site_id = ? AND left_site_at IS NOT NULL').bind(site.id).first('n');
  const { results: notices } = await env.DB.prepare('SELECT id, message, created_at FROM notices WHERE site_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 3').bind(site.id).all();
  const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const ITEM_ICONS = { '/inbox': 'mail', '/reviews-queue': 'star', '/litters#leaving': 'heart', '/pages': 'pages', '/pages/waitlist': 'list', '/payment': 'card', '/lists/extras': 'gift', '/lists/products': 'tag', '/lists/reviews': 'star', '/details': 'home', '/kennelos': 'link' };
  const item = (href, label, note) => `<li class="item"><a href="/s/${esc(site.subdomain)}${href}">${ic(ITEM_ICONS[href] ?? (href.startsWith('/portal') ? 'paw' : 'pages'))}<b>${esc(label)}</b><span>${esc(note)}</span></a></li>`;
  // The puppy portal, on sites that have it: what its families need from her.
  const portalOn = await env.DB.prepare('SELECT portal_on FROM sites WHERE id = ?').bind(site.id).first('portal_on');
  const portal = portalOn ? await portalNeedsYou(env, site.id) : [];
  // Needs you: what came in and is waiting, shown only while something is.
  const waiting = [
    ...portal.map((x) => item(x.href, x.label, x.note)),
    unread ? item('/inbox', `${unread} new message${unread === 1 ? '' : 's'}`, 'In your inbox') : '',
    pending ? item('/reviews-queue', `${pending} review${pending === 1 ? '' : 's'} to approve`, 'From families') : '',
    leaving ? item('/litters#leaving', `${leaving} litter${leaving === 1 ? '' : 's'} leaving your site`, 'Keep or remove') : '',
  ].filter(Boolean);
  const sub = esc(site.subdomain);
  const notesHtml = `${matches ? matchesWaiting(site.subdomain, matches) : ''}
  ${notices.map((n) => `<section class="card notice-card" role="status"><p>${esc(n.message)}</p><p class="row">${demo ? `<a class="button" href="/admin/${sub}/site/">Open it in your admin view</a>` : `<a class="button" href="/s/${sub}/publish">Review and publish</a>`}<form method="post" action="/s/${sub}/notices/${esc(n.id)}/read"><button class="link">Done</button></form></p></section>`).join('')}`;
  // With the puppy portal, the app is one app for the website and the families
  // (plan 7.3): Today holds what needs her from both; the website's screens are
  // under Website.
  if (portalOn && view === 'today') {
    const home = await goingHome(env, site);
    const tz = (await getSettings(env, site.id)).time_zone;
    const now = new Date();
    const todayYmd = localParts(now, tz).ymd;
    const inDays = home.count ? Math.round((Date.parse(`${home.first}T12:00:00Z`) - Date.parse(`${todayYmd}T12:00:00Z`)) / 86400000) : null;
    // Needs you, as the prototype's small tiles: an icon in a tinted square (red for
    // what's gone wrong, amber for what's running late), what it is, and a line more.
    const needs = [
      ...portal.map((x) => need(sub, x)),
      unread ? need(sub, { href: '/inbox', label: `${unread} new message${unread === 1 ? '' : 's'} from your website`, note: 'In your inbox' }) : '',
      pending ? need(sub, { href: '/reviews-queue', label: `${pending} review${pending === 1 ? '' : 's'} to approve`, note: 'From families' }) : '',
      leaving ? need(sub, { href: '/litters#leaving', label: `${leaving} litter${leaving === 1 ? '' : 's'} leaving your site`, note: 'Keep or remove' }) : '',
    ].filter(Boolean);
    const kennel = site.kennel_name || site.subdomain;
    return page('Today', `<section class="sec deep bleed todayband"><span class="eyebrow">${esc(kennel)}</span><h1>Today</h1>
        <p class="small">${esc(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }))}${home.count ? ` · ${home.today ? `${home.today} going home today${home.count > home.today ? `, ${home.count - home.today} more this week` : ''}` : `${home.count} going home ${inDays === 1 ? 'tomorrow' : `in ${inDays} days`}`}` : ''}</p>
        ${await lastFromKennelos(env, site)}</section>
      ${demo ? `<section class="card status band"><p><span class="st warn">Demo</span> Step ${esc(site.demo_step)} of the linked sample · never published</p><p class="row"><a class="button" href="/admin/${esc(site.subdomain)}/site/">Open it in your admin view</a><a class="button" href="/ops/sites/${esc(site.id)}">Its steps, in ops</a></p></section>` : ''}
      ${notesHtml}
      ${home.html}
      ${changed ? `<section class="card status"><div class="between"><p><span class="st warn">Website</span> Changes not published yet</p><a class="button small" href="/s/${sub}/publish">Review and publish</a></div></section>` : ''}
      ${needs.length ? `<section id="needs-you" class="stack"><h2>Needs you</h2><div class="needs">${needs.join('')}</div></section>`
        : !changed && !home.count && !notices.length ? '<section class="card band"><p><span class="st ok">All caught up</span> Nothing needs you right now.</p><p class="muted small">Pickups this week, vet records, messages and anything else waiting will show here.</p></section>' : ''}
      ${await todayLists(env, site)}
      <p class="muted small">Your role: ${esc(site.role)}.${user.sites.length > 1 ? ' <a href="/">Your other sites</a>.' : ''}${user.admin ? ` <a href="/admin/${esc(site.subdomain)}/rules">This site's build</a>.` : ''}</p>`, { nav: { sub: site.subdomain, tab: 'today' } });
  }
  return page(portalOn ? 'Website' : site.kennel_name || site.subdomain, `
  ${portalOn ? '' : notesHtml}
  ${notices.map((n) => `<section class="card notice-card" role="status"><p>${esc(n.message)}</p><p class="row">${demo ? `<a class="button" href="/admin/${esc(site.subdomain)}/site/">Open it in your admin view</a>` : `<a class="button" href="/s/${esc(site.subdomain)}/publish">Review and publish</a>`}<form method="post" action="/s/${esc(site.subdomain)}/notices/${esc(n.id)}/read"><button class="link">Done</button></form></p></section>`).join('')}
  ${demo ? `<section class="card status band">
    <p><span class="st warn">Demo</span> Step ${esc(site.demo_step)} of the linked sample · never published</p>
    <p class="muted small">${esc(NOT_FOR_DEMO)}</p>
    <p class="row"><a class="button" href="/admin/${esc(site.subdomain)}/site/">Open it in your admin view</a><a class="button" href="/ops/sites/${esc(site.id)}">Its steps, in ops</a></p>
  </section>` : `<section class="card status">
    <p><span class="dot ${site.status}"></span>${esc(STATUS_WORDS[site.status] ?? site.status)}${changed ? ' · <strong>changes not published yet</strong>' : ''}</p>
    <p class="row"><a class="button" href="${esc(siteLink(env, site.subdomain))}">View my site</a><a class="button" href="${esc(previewLink)}">Preview changes</a><a class="button" href="/s/${esc(site.subdomain)}/share">Share</a></p>
    <p><a class="button primary" href="/s/${esc(site.subdomain)}/publish">${changed ? 'Review and publish' : 'Publish'}</a></p>
  </section>`}
  ${waiting.length && !portalOn ? `<section class="card" id="needs-you"><h2>Needs you</h2><ul class="items">${waiting.join('')}</ul></section>` : ''}
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
  <p class="muted small">Your role: ${esc(site.role)}.${user.sites.length > 1 ? ' <a href="/">Your other sites</a>.' : ''}${user.admin ? ` <a href="/admin/${esc(site.subdomain)}/rules">This site's build</a>.` : ''}</p>
  <form method="post" action="/signout"><button class="link">Sign out</button></form>`, portalOn ? { nav: { sub: site.subdomain, tab: 'website' } } : {});
}

// A Needs you tile: its icon and tone from what it is (portal/admin.js portalNeedsYou).
function need(sub, x) {
  const t = `${x.href} ${x.label}`;
  const [icon, tone] = /#loss/.test(t) ? ['heart', 'bad']
    : /not delivered/.test(t) ? ['mail', 'bad']
    : /vet visit missed/i.test(t) ? ['vet', 'bad']
    : /vet visit/i.test(t) ? ['vet', 'warn']
    : /Vet record/.test(t) ? ['vet', '']
    : /#messages|inbox|message|Invite|invited/i.test(t) ? ['mail', '']
    : /#stay/.test(t) ? ['star', 'warn']
    : /#extras/.test(t) ? ['gift', '']
    : /review/i.test(t) ? ['star', '']
    : /leaving|backed out|closed/.test(t) ? ['heart', 'warn']
    : /KennelOS/.test(t) ? ['draft', '']
    : /go home at/.test(t) ? ['cal', 'warn'] : ['paw', ''];
  return `<a class="need${tone ? ` ${tone}` : ''}" href="/s/${esc(sub)}${esc(x.href)}">${ic(icon)}<b>${esc(x.label)}</b><span>${esc(x.note)}</span></a>`;
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

  // Admin (admin.js): signed in to /ops on this device, so every site is hers.
  const breeder = await currentUser(env, request);
  const user = await isAdmin(env, request) ? await asAdmin(env, breeder) : breeder;
  if (pathname === '/signout' && post) {
    if (breeder) await signOut(env, breeder);
    const headers = new Headers({ location: '/', 'cache-control': 'no-store' });
    headers.append('set-cookie', clearSessionCookie());
    if (user?.admin) headers.append('set-cookie', clearAdminCookie());
    return new Response(null, { status: 303, headers });
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
  if (user.admin && (pathname === '/' || pathname.startsWith('/admin'))) {
    const res = await handleBuilder({ env, request, url: pathname === '/' ? new URL('/admin', url) : url, user, page });
    if (res) return res;
  }
  if (pathname === '/') return user.sites.length === 1 ? redirect(`/s/${user.sites[0].subdomain}`) : sitesPage(user);
  // KennelOS's "get a link code" link: straight to Link KennelOS with one site,
  // else the list of sites to pick from.
  if (pathname === '/link-kennelos') return user.sites.length === 1 ? redirect(`/s/${user.sites[0].subdomain}/kennelos`) : sitesPage(user);

  const m = pathname.match(/^\/s\/([a-z0-9-]+)(\/.*)?$/);
  if (m) {
    const site = user.sites.find((s) => s.subdomain === m[1]);
    if (!site) return page('Not found', '<section class="card"><p>You don\'t manage a site at this address.</p><p><a href="/">Your sites</a></p></section>', { status: 404 });
    // Her tabs and her own header, with the puppy portal on (plan 7.3).
    const row = await env.DB.prepare('SELECT portal_on, kennel_name, logo_photo_id, monogram FROM sites WHERE id = ?').bind(site.id).first();
    const portalOn = row?.portal_on;
    const brand = portalOn ? { sub: site.subdomain, name: row.kennel_name || site.subdomain, logo: row.logo_photo_id, monogram: row.monogram } : null;
    const sitePage = brand ? (t, b, o = {}) => page(t, b, { ...o, brand }) : page;
    if (!m[2] && !post) return siteHome(env, user, site, 'today', sitePage);
    if (portalOn && !post && m[2] === '/website') return siteHome(env, user, site, 'website', sitePage);
    if (portalOn && !post && m[2] === '/kennel') return sitePage('Dogs', await dogsTab(env, site), { nav: { sub: site.subdomain, tab: 'dogs' } });
    if (m[2]?.startsWith('/portal')) {
      const res = await handlePortalAdmin({ env, request, url, site, page: sitePage });
      if (res) return res;
    } else if (m[2]) {
      const res = await createScreens({ env, request, url, site, user, page: sitePage })();
      if (res) return res;
    }
  }
  return page('Not found', '<section class="card"><p>There\'s nothing here.</p><p><a href="/">Home</a></p></section>', { status: 404 });
}
