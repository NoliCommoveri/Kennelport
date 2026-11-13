// The family's pages (docs/plans/family-portal.md section 7): everything under
// /family on her site, signed in only, for a site with the portal on (/ops).
// Home changes with the puppy's stage (before go-home, the vet window, after);
// Timeline holds the first-weeks tasks, each with its day and program link; Vet
// visit holds "I've booked it" and the proof upload; Records holds the puppy's
// details, shots and deworming, the contract and her photos. Home carries the
// go-home checklist (from two weeks before go-home), the food band and what's next.
//
// Nothing here is cached, and nothing a family sees comes from another family:
// every photo and file is checked against the signed-in family's own placement.
//
// Split out into family/ (docs/review/senior-review-2026-11.md, item 7): icons.js,
// stay.js, files.js, and parts.js, the pieces they share.
import { schemaReady } from '../gate.js';
import { escapeHtml as esc, htmlPage } from '../lib/html.js';
import {
  startFamilySignIn, verifyFamilySignIn, acceptInvite, currentFamily, signOutFamily, familyCookie, startSession, AuthError,
} from './auth.js';
import {
  getSettings, placementFor, puppyFor, healthRecords, recordVetBooking, saveFile, getFile, familyEmails, PortalError, RECORD_TYPES, MAX_FILE_BYTES,
  DEFAULT_DISCLOSURE, dialable,
} from './store.js';
import { stage, vetDeadline, formatAt, formatDay, timeLeft, localParts, addDays, VET_RULES } from './vet.js';
import { stepsFor, openTasks, programsFor, setDone, setProgramStatus } from './steps.js';
import { PORTAL_VERSION } from './version.js';
import { CODE_TTL_MS } from '../auth.js';
import { redeemHandoff } from './feed.js';
import { stayFor, mediaFor, mediaResponse } from './stays.js';
import { messagesOpen, thread, unreadFrom, markRead, familyWrites, isLoss, eraseFamily, MAX_MESSAGE } from './account.js';
import { TYPE_ICON, SPRITE, ic } from './family/icons.js';
import { skillsList, updateCard, stayContext } from './family/stay.js';
import { active, puppyPhotos } from './family/parts.js';
import { servePhoto, serveFile, goToProgram } from './family/files.js';
import { redeemViewLink, currentView, viewCookie } from './view.js';
import { sayer, everyWording, siteWording } from '../manage/wording.js';
import { loadBuild } from '../content/rules.js';

export const PORTAL_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const HEADERS = {
  'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'content-security-policy': PORTAL_CSP,
  'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
};
const redirect = (location, headers = {}) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', ...headers } });

export const isPortalPath = (path) => path === '/family' || path.startsWith('/family/');

// ---------- the page frame ----------

// Her logo in a white circle, as at the top of her website (a published photo,
// its monogram showing if the photo can't load), else her monogram, else a paw.
function brandMark(site) {
  const mono = site.monogram ? `<span class="mono">${esc(site.monogram)}</span>` : ic('paw');
  return `<span class="logo">${site.logo_photo_id ? `<img src="/_kp/p/${encodeURIComponent(site.logo_photo_id)}?s=t" alt="">` : ''}${mono}</span>`;
}

// After a loss before pickup the tabs shrink to Home and Photos (plan 7.4).
const TABS = [['/family', 'home', 'Home'], ['/family/timeline', 'calendar', 'Timeline'], ['/family/vet', 'stethoscope', 'Vet visit'], ['/family/records', 'file', 'Records']];
const LOSS_TABS = [['/family', 'home', 'Home'], ['/family/photos', 'paw', 'Photos']];
// During an extended stay, Stay takes Timeline's place (plan 8.5).
const STAY_TABS = [['/family', 'home', 'Home'], ['/family/stay', 'award', 'Stay'], ['/family/vet', 'stethoscope', 'Vet visit'], ['/family/records', 'file', 'Records']];

function frame(site, title, body, { status = 200, fam = null, tab = null, action = '', headers = {} } = {}) {
  const kennel = site.kennel_name || site.subdomain;
  const tabs = fam ? `<nav class="tabs" aria-label="Portal">${(fam.loss ? LOSS_TABS : fam.stay ? STAY_TABS : TABS)
    .map(([href, icon, label]) => `<a href="${href}"${tab === href ? ' aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></a>`).join('')}</nav>` : '';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}${fam?.viewing ? ' (viewing)' : ''} · ${esc(kennel)}</title>
<link rel="stylesheet" href="/_kp/f/portal.css?v=${PORTAL_VERSION}">
<script src="/_kp/f/portal.js?v=${PORTAL_VERSION}" defer></script>
</head><body class="${fam ? 'in' : 'out'}">
${SPRITE}
<header class="top"><a class="brand" href="/family">${brandMark(site)}<span class="bt"><b>${esc(kennel)}</b><span class="sub">${ic('paw')}Puppy Parent Portal</span></span></a>
<span class="top-end"><button type="button" class="aa" id="aa" aria-label="Text size">Aa</button>${fam && !fam.loss ? `<a class="acct" href="/family/messages" aria-label="${fam.unread ? `Messages, ${fam.unread} new` : 'Messages'}">${ic('message')}${fam.unread ? `<b class="small">${fam.unread}</b>` : ''}</a>` : ''}${fam ? `<a class="acct" href="/family/account" aria-label="Account">${ic('user')}</a>` : ''}</span></header>
<main>${fam?.viewing ? fam.band : ''}${body}</main>
${action}${tabs}
</body></html>`, { status, headers: { ...HEADERS, ...headers } });
}

const errorBox = (msg) => (msg ? `<p class="error" role="alert">${esc(msg)}</p>` : '');
const noteBox = (msg) => (msg ? `<p class="note" role="status">${esc(msg)}</p>` : '');

// ---------- signed out ----------

function signInPage(site, { error, note, email = '' } = {}) {
  const kennel = site.kennel_name || site.subdomain;
  return frame(site, 'Sign in', `<section class="card narrow">
  <p class="eyebrow">Puppy parent portal</p>
  <h1>Welcome to ${esc(kennel)}'s puppy portal</h1>
  <p class="muted">Sign in with the email address you gave ${esc(kennel)}. We'll send you a 6-digit code; there's no password.</p>
  ${noteBox(note)}${errorBox(error)}
  <form method="post" action="/family/signin" class="stack">
    <label>Email<input type="email" name="email" value="${esc(email)}" autocomplete="email" inputmode="email" required></label>
    <button class="btn solid">Send me a code</button>
  </form>
  <p class="muted small">By signing in you agree to KennelPort's <a href="https://kennelport.com/terms">terms of use</a>.</p></section>`, { status: error ? 400 : 200 });
}

function codePage(site, { email, error } = {}) {
  return frame(site, 'Your code', `<section class="card narrow">
  <h1>Check your email</h1>
  <p class="muted">If <strong>${esc(email)}</strong> is on a puppy family's account here, a 6-digit code is on its way. It works for ${CODE_TTL_MS / 60000} minutes.</p>
  ${errorBox(error)}
  <form method="post" action="/family/signin/verify" class="stack">
    <input type="hidden" name="email" value="${esc(email)}">
    <label>Code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required autofocus></label>
    <button class="btn solid">Sign in</button>
  </form>
  <form method="post" action="/family/signin"><input type="hidden" name="email" value="${esc(email)}"><button class="btn text">Send a new code</button></form>
  <p><a href="/family">Use a different email</a></p></section>`, { status: error ? 400 : 200 });
}

// ---------- shared pieces ----------

const pupName = (p) => p.call_name || p.puppy_name;
const SEX = { female: ['♀', 'girl'], male: ['♂', 'boy'] };

function photoTag(src, alt, cls) {
  return src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : `<span class="${cls} ph" aria-hidden="true">${ic('paw')}</span>`;
}

// When the puppy goes home, as words: the booked pickup, else the planned day.
function goHomeWords(p, s) {
  if (p.picked_up_at) return formatAt(p.picked_up_at, s.time_zone);
  if (p.pickup_booked_at) return formatAt(p.pickup_booked_at, s.time_zone);
  if (p.go_home_on) return formatDay(p.go_home_on);
  return null;
}

function daysUntil(p, s, now) {
  const ymd = p.pickup_booked_at ? localParts(p.pickup_booked_at, s.time_zone).ymd : p.go_home_on;
  if (!ymd) return null;
  const today = localParts(now, s.time_zone).ymd;
  return Math.round((Date.parse(`${ymd}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

const deadlineLine = (at, s) => `<time datetime="${esc(at)}" data-local="${esc(at)}" data-tz="${esc(s.time_zone)}">${esc(formatAt(at, s.time_zone, { zone: true }))}</time>`;

// The shown programs, each with this family's status and, for a program that
// gives each family its own code or certificate, theirs (typed in by her).
function programList(list, place, kennel) {
  if (!list.length) return '';
  return `<ul class="programs hl">${list.map((x) => {
    const code = x.portal_per_family ? x.family_code : x.code;
    const codeLine = code ? `<p class="code">${x.portal_per_family ? 'Your code' : 'Code'} <strong>${esc(code)}</strong>${x.code_note ? ` <span class="muted">${esc(x.code_note)}</span>` : ''}</p>`
      : x.portal_per_family ? `<p class="muted small">Your own code will be here once ${esc(kennel)} adds it.</p>` : '';
    const done = x.status === 'done';
    return `<li${done ? ' class="done"' : ''}>
    <span class="badge">${ic(done ? 'check' : TYPE_ICON[x.portal_type] ?? 'tag')}</span>
    <div><b>${esc(x.name)}</b>${done ? ` <span class="st ok">Done</span>` : ''}${x.family_action ? `<p>${esc(x.family_action)}</p>` : x.description ? `<p class="muted">${esc(x.description)}</p>` : ''}
    ${codeLine}
    <div class="acts">${x.link_url ? `<a class="btn line small" href="/family/go/${esc(x.id)}?from=${place}">${esc(x.link_label || 'Open')} ${ic('arrow')}</a>` : ''}
    ${x.family_action && !done ? `<form method="post" action="/family/program"><input type="hidden" name="product" value="${esc(x.id)}"><input type="hidden" name="back" value="${place === 'home' ? 'home' : 'timeline'}"><button class="btn text">I've done this</button></form>` : ''}</div></div></li>`;
  }).join('')}</ul>`;
}

const disclosure = (s) => `<p class="disclose">${esc(s.disclosure || DEFAULT_DISCLOSURE)}</p>`;

// ---------- the checklist, the timeline and the food ----------

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayBlock = (ymd) => (ymd ? `<span class="d">${MON[Number(ymd.slice(5, 7)) - 1]}<b>${Number(ymd.slice(8, 10))}</b></span>` : `<span class="d">${ic('calendar')}</span>`);
const goLink = (link, place, label) => `<a class="btn line small" href="/family/go/${esc(link.id)}?from=${place}">${esc(label || link.label || 'Open')} ${ic('arrow')}</a>`;

// One tick: a form, so it works without the script. back: where to land after.
function tickForm(kind, x, back, done) {
  return `<form method="post" action="/family/step" class="tickf"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="id" value="${esc(x.id)}"><input type="hidden" name="done" value="${done ? 0 : 1}"><input type="hidden" name="back" value="${back}">
    <button class="tick" aria-pressed="${done ? 'true' : 'false'}" aria-label="${esc(`${done ? 'Untick' : 'Tick'}: ${x.title}`)}">${ic('check')}</button></form>`;
}

// The go-home checklist, with how many are ready, its program links, and the
// vet booking ticked from "I've booked it".
function checklistCard(list) {
  if (!list.length) return '';
  const done = list.filter((x) => x.done).length;
  return `<section class="tile full" id="checklist"><div class="between"><h2>Go-home checklist</h2><span class="small muted">${done} of ${list.length} ready</span></div>
    <div class="progress" aria-hidden="true"><i style="width:${Math.round((done / list.length) * 100)}%"></i></div>
    <ul class="checks">${list.map((x) => `<li${x.done ? ' class="done"' : ''}>${x.auto
      ? `<a class="tick${x.done ? ' on' : ''}" href="/family/vet#booked" aria-label="${esc(x.done ? 'Done' : 'Tap I\'ve booked it on the Vet visit page')}">${ic('check')}</a>`
      : tickForm('checklist', x, 'home', x.done)}<span>${esc(x.title)}</span>${x.link ? `<a class="go" href="/family/go/${esc(x.link.id)}?from=checklist">${esc(x.raw.auto ? 'Open' : 'See')} ${ic('arrow')}</a>` : ''}</li>`).join('')}</ul></section>`;
}

// The dark green band: the exact food, the bag, how much and how often, and a
// round button to the food program, if she shows one.
function foodBand(s, name, food) {
  if (!s.food_name) return '';
  const points = [s.food_bag, s.food_how, 'The same food for the first two weeks'].filter(Boolean);
  return `<section class="sec deep bleed food"><p class="eyebrow">What ${esc(name)}'s eating now</p><h2 class="big-h">Keep ${esc(name)} on the same food</h2>
    <div class="prodrow"><span class="box">${ic('bowl')}</span><div><b>${esc(s.food_name)}</b>${s.food_note ? `<p class="small">${esc(s.food_note)}</p>` : ''}</div></div>
    <ul class="trio">${points.map((x) => `<li>${ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>
    ${food?.link_url ? `<a class="pill light" href="/family/go/${esc(food.id)}?from=food">Order ${esc(name)}'s food ${ic('arrow')}</a>` : ''}</section>`;
}

// A task's status: a word with a small mark (plan 7.1). Red only when overdue.
function taskWord(t, kennel) {
  if (t.done) return `<span class="st ok">${t.by === 'breeder' && t.hers ? `Done by ${esc(kennel)}` : 'Done'}</span>`;
  if (t.hers) return `<span class="st">${esc(kennel)} does this</span>`;
  if (t.overdue) return '<span class="st bad">Overdue</span>';
  if (t.past) return '<span class="st">Past</span>';
  if (t.next) return '<span class="st next">Next</span>';
  return '<span class="st">Later</span>';
}

function taskRow(t, kennel, back) {
  const vetLink = t.auto === 'vet_booking' ? '/family/vet#booked' : t.auto === 'vet_visit' ? '/family/vet#proof' : null;
  const acts = [];
  if (!t.done && !t.hers) {
    if (t.link) acts.push(goLink(t.link, 'timeline', t.button));
    if (vetLink && !(t.auto === 'vet_booking' && t.past)) acts.push(`<a class="btn line small" href="${vetLink}">${t.auto === 'vet_booking' ? 'I\'ve booked it' : 'Upload the record'}</a>`);
  }
  if (!t.auto && !t.hers) acts.push(tickForm('task', t, back, t.done).replace('class="tick"', 'class="btn text small"').replace(`>${ic('check')}</button>`, `>${t.done ? 'Undo' : 'Mark done'}</button>`));
  return `<li class="task${t.done ? ' done' : ''}" id="t-${esc(t.id)}">${dayBlock(t.due)}<div><div class="between"><h3>${esc(t.title)}</h3>${taskWord(t, kennel)}</div>
    ${t.body ? `<p class="small">${esc(t.body)}</p>` : ''}${acts.length ? `<div class="acts">${acts.join('')}</div>` : ''}</div></li>`;
}

// "What's next": the family's next open tasks as big numbered steps.
function nextBand(tasks, name, kennel) {
  const next = openTasks(tasks, 3);
  if (!next.length) return '';
  return `<section class="sec mint bleed"><p class="eyebrow">${esc(name)}'s first months</p><h2 class="big-h">What's next</h2>
    ${numSteps(next.map((t) => ({ h: esc(t.title), p: `${t.due ? `By ${esc(formatDay(t.due))}. ` : ''}${esc(t.body ?? '')}`, act: t.link ? `<span class="acts">${goLink(t.link, 'home', t.button)}</span>` : '' })))}
    <p><a class="go" href="/family/timeline">The whole timeline ${ic('arrow')}</a></p></section>`;
}

// ---------- signed in ----------

async function loadContext(env, site, fam) {
  const p = await placementFor(env, site.id, fam.familyId);
  const s = await getSettings(env, site.id);
  const pup = p ? await puppyFor(env, site.id, p.puppy_id) : null;
  const photos = p ? await puppyPhotos(env, site.id, p.puppy_id) : [];
  return { p, s, pup, photos, main: photos[0] ? `/family/photo/${photos[0].id}` : null };
}

function noPlacement(site, fam) {
  return frame(site, 'Welcome', `<section class="card narrow"><h1>Welcome, ${esc(fam.name)}</h1>
    <p class="muted">${esc(site.kennel_name || site.subdomain)} hasn't added your puppy here yet. Check back soon.</p></section>`, { fam, tab: '/family' });
}

// Her and her vet's contacts for the family (her portal settings), as one-tap
// buttons: call or text her, email her, call the vet who knows the puppy.
function contactsCard(site, s, name, { lead = false } = {}) {
  const kennel = site.kennel_name || site.subdomain;
  const phone = s.her_phone || site.contact_phone;
  const email = s.her_email || site.contact_email;
  const vet = s.vet_clinic || s.vet_doctor || s.vet_phone;
  if (!phone && !email && !vet) return '';
  const her = phone || email ? `<div class="contact"><p class="eyebrow">${esc(kennel)}</p><div class="row">
      ${phone ? `<a class="btn line" href="tel:${esc(dialable(phone))}">${ic('phone')} Call</a><a class="btn line" href="sms:${esc(dialable(phone))}">${ic('message')} Text</a>` : ''}
      ${email ? `<a class="btn line" href="mailto:${esc(email)}?subject=${encodeURIComponent(`Question about ${name}`)}">${ic('mail')} Email</a>` : ''}</div>
      ${phone ? `<p class="small muted">${esc(phone)}</p>` : ''}</div>` : '';
  const vetBlock = vet ? `<div class="contact"><p class="eyebrow">${esc(name)}'s vet since birth</p>
      <p><b>${esc([s.vet_clinic, s.vet_doctor].filter(Boolean).join(' · '))}</b></p>
      ${s.vet_note ? `<p class="small">${esc(s.vet_note)}</p>` : ''}
      <div class="row">${s.vet_phone ? `<a class="btn line" href="tel:${esc(dialable(s.vet_phone))}">${ic('phone')} Call the vet</a>` : ''}
      ${s.vet_address ? `<a class="go" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(s.vet_address)}">${ic('pin')} ${esc(s.vet_address)} ${ic('arrow')}</a>` : ''}</div>
      ${s.vet_phone ? `<p class="small muted">${esc(s.vet_phone)}</p>` : ''}</div>` : '';
  return `<section class="card contacts" id="contacts">${lead ? `<p class="eyebrow">The first weeks at home</p><h2>Questions about ${esc(name)}? One tap</h2>` : '<h2>Contacts</h2>'}${her}${vetBlock}</section>`;
}

// From pickup, for her chosen number of weeks, the contacts lead Home.
const contactsLead = (p, s, now) => Boolean(p.picked_up_at && p.status === 'open' && p.life_status === 'with_family'
  && new Date(now).getTime() - Date.parse(p.picked_up_at) < (s.help_weeks ?? 8) * 7 * 86400000);

// Lost before pickup (plan 7.4): one quiet page. Her note in her words, the way
// back through the status page, and nothing that sells anything.
function lossPage(site, fam, p, main) {
  const kennel = site.kennel_name || site.subdomain;
  const name = pupName(p);
  const statusUrl = /^https:\/\//i.test(fam.statusUrl ?? '') ? fam.statusUrl : null;
  const body = `<section class="card narrow loss">${photoTag(main ? `${main}?s=t` : null, name, 'round')}
    <h1>${p.closed_reason === 'died' ? `We're so sorry about ${esc(name)}` : `About ${esc(name)}`}</h1>
    ${p.loss_note ? p.loss_note.split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('') : `<p class="muted">${esc(kennel)} will write to you here soon.</p>`}
    ${statusUrl ? `<p>You're back on ${esc(kennel)}'s list at your original place. When you're ready, your status page is where you choose your next puppy.</p>
    <p><a class="btn solid" href="${esc(statusUrl)}">Go to your status page</a></p>
    <p><a class="go" href="${esc(statusUrl)}">Message ${esc(kennel)} ${ic('arrow')}</a></p>` : ''}
    <p class="small"><a href="/family/photos">${esc(name)}'s photos</a> stay here for you.</p></section>`;
  return frame(site, 'Home', body, { fam, tab: '/family' });
}

// ---------- home's pieces (the prototype's tiles and bands, plan 7.2) ----------

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// A calendar page: the month on red, the day, the weekday.
const calPage = (ymd) => `<span class="calpage" aria-hidden="true"><b>${MON[Number(ymd.slice(5, 7)) - 1]}</b><span>${Number(ymd.slice(8, 10))}</span><i>${DOW[new Date(`${ymd}T12:00:00Z`).getUTCDay()]}</i></span>`;
// "2:30 pm" from a local "14:30".
function clock(hm) {
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
const inDays = (n) => (n > 1 ? `${n} days` : n === 1 ? 'Tomorrow' : n === 0 ? 'Today' : null);
// Numbered steps on soft blobs (the vet visit, what's next).
const numSteps = (items) => `<ol class="numsteps">${items.map((it, i) => `<li${it.done ? ' class="done"' : ''}><span class="num" aria-hidden="true">${it.done ? ic('check') : i + 1}</span><div><h3>${it.h}</h3>${it.p ? `<p>${it.p}</p>` : ''}${it.act ?? ''}</div></li>`).join('')}</ol>`;
// The bar pinned above the tabs: one thing to do now.
const actionBar = (x) => `<div class="actionbar" role="region" aria-label="Do this now"><div class="in"><span class="ico">${ic(x.icon)}</span><p><b>${x.title}</b>${x.sub ?? ''}</p><a class="btn solid small" href="${x.href}">${x.label}</a></div></div>`;
// Before pickup the status page keeps pickup, extras and messages (plan 3.4).
function statusBand(p, s, name, kennel, statusUrl) {
  const when = goHomeWords(p, s);
  const row = (icon, title, sub) => `<li><div><span class="badge">${ic(icon)}</span><span><b>${title}</b><span class="small muted">${sub}</span></span></div></li>`;
  return `<section class="sec paper bleed"><p class="eyebrow">On your status page, until pickup</p><h2>Pickup, extras and messages</h2>
    <ul class="hl">${row('calendar', when ? `Pickup ${esc(when)}` : 'Book your pickup', when ? 'Change the time or place there' : 'Choose the day and time there')}
    ${row('gift', 'Ask for an extra', 'A photo package, a longer stay')}
    ${row('message', `Message ${esc(kennel)}`, `Messages move here once ${esc(name)} is home`)}</ul>
    <p><a class="btn solid" href="${esc(statusUrl)}">Open your status page</a></p></section>`;
}

async function homePage(env, site, fam, now = new Date()) {
  const { p, s, pup, main } = await loadContext(env, site, fam);
  if (!p) return noPlacement(site, fam);
  if (isLoss(p)) return lossPage(site, fam, p, main);
  const name = pupName(p);
  const st = stage(p, now);
  const days = daysUntil(p, s, now);
  const kennel = site.kennel_name || site.subdomain;
  const live = active(p);
  const list = live ? await programsFor(env, site.id, p) : [];
  const steps = live ? await stepsFor(env, site.id, p, pup, s, { now }) : { checklist: [], tasks: [] };
  const sex = SEX[pup?.sex];
  const statusUrl = /^https:\/\//i.test(fam.statusUrl ?? '') ? fam.statusUrl : null;
  const when = goHomeWords(p, s);
  const goYmd = p.picked_up_at ? localParts(p.picked_up_at, s.time_zone).ymd : p.pickup_booked_at ? localParts(p.pickup_booked_at, s.time_zone).ymd : p.go_home_on;

  let hello;
  let greeting;
  let calendar;
  let band;
  let action = null;
  if (st === 'before') {
    hello = 'Welcome!';
    greeting = days === null ? `Welcome, ${fam.name}` : days > 1 ? `${name} comes home in ${days} days` : days === 1 ? `${name} comes home tomorrow` : days === 0 ? `${name} comes home today` : `Welcome, ${fam.name}`;
    const expected = p.pickup_booked_at ? vetDeadline(p.pickup_booked_at, s.vet_rule, s.time_zone) : null;
    calendar = `<div class="tile green"><p class="eyebrow">Comes home</p>${goYmd
      ? `<div class="calrow">${calPage(goYmd)}<div><p class="bigline">${esc(inDays(days) ?? formatDay(goYmd))}</p><p class="small">${p.pickup_booked_at ? `Pickup ${esc(clock(localParts(p.pickup_booked_at, s.time_zone).hm))}` : 'Pickup time to come'}</p></div></div>`
      : `<p>${statusUrl ? `<a href="${esc(statusUrl)}">Book your pickup on your status page ${ic('arrow')}</a>` : `Not booked yet. ${esc(kennel)} will confirm the day and time with you.`}</p>`}
      <a class="btn onfill small" href="/family/timeline">What to do first</a></div>`;
    band = `<section class="tile warm"><div class="calrow"><span class="ico big">${ic('stethoscope')}</span><div><p class="eyebrow">Before ${esc(name)} comes home</p><h2>Book the vet visit now</h2></div></div>
      <p class="small">Your contract asks for a vet visit ${s.vet_rule === 'days3' ? `by the end of the third day after the day you take ${esc(name)} home` : 'within 72 hours of pickup'}.${expected ? ` With pickup ${esc(formatAt(p.pickup_booked_at, s.time_zone))}, that's by <b>${deadlineLine(expected, s)}</b>.` : ''} Vets are often booked days ahead.</p>
      ${p.vet_booked_at ? `<p class="status ok">${ic('check')} Booked${p.vet_booked_for ? ` for ${esc(p.vet_booked_for.replace('T', ' at '))}` : ''}${p.vet_clinic ? `, ${esc(p.vet_clinic)}` : ''}</p>` : `<p><a class="btn line small" href="/family/vet">${ic('check')}I've booked it</a></p>`}</section>`;
    if (!p.vet_booked_at) action = { icon: 'calendar', title: 'Book the vet visit', sub: expected ? `Needed by ${esc(formatAt(expected, s.time_zone))}` : `Book ${esc(name)}'s visit, then tell us`, href: '/family/vet', label: 'I\'ve booked it' };
  } else if (st === 'vet') {
    hello = 'Welcome home';
    greeting = `${name} is home`;
    const dl = localParts(p.vet_deadline_at, s.time_zone);
    const hoursLeft = Math.max(0, Math.round((Date.parse(p.vet_deadline_at) - new Date(now).getTime()) / 3600000));
    const dueTime = new Date(p.vet_deadline_at).toLocaleTimeString('en-US', { timeZone: s.time_zone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    calendar = `<div class="tile green${p.proof_uploaded_at ? '' : ' urgent'}"><p class="eyebrow">3-day vet visit</p><div class="calrow">${calPage(dl.ymd)}<div><p class="bigline">${p.proof_uploaded_at ? (p.proof_accepted_at ? 'Done' : 'Uploaded') : `${hoursLeft} h left`}</p><p class="small">Due by ${esc(dueTime)}</p></div></div>
      ${p.proof_uploaded_at ? `<p class="small"><b>${p.proof_accepted_at ? `${ic('check')} Accepted by ${esc(kennel)}` : `${esc(kennel)} will check it`}</b></p>` : `<a class="btn onfill small" href="/family/vet#proof">${ic('upload')}Upload record</a>`}</div>`;
    band = `<section class="sec mint bleed"><p class="eyebrow">Your contract's 3-day visit</p><h2 class="big-h">${p.proof_uploaded_at ? 'Record uploaded: thank you' : `${esc(name)}'s vet visit`}</h2>
      ${numSteps([
        { done: Boolean(p.vet_booked_at), h: p.vet_booked_at ? `Booked${p.vet_booked_for ? ` for ${esc(p.vet_booked_for.replace('T', ' at '))}` : ''}` : 'Book the visit', act: p.vet_booked_at ? '' : '<a class="btn text small" href="/family/vet">Add the booking</a>' },
        { done: Boolean(p.proof_uploaded_at), h: `See the vet by ${esc(formatAt(p.vet_deadline_at, s.time_zone))}`, p: 'Bring this portal\'s Records page.' },
        { done: Boolean(p.proof_uploaded_at), h: p.proof_uploaded_at ? 'Record uploaded' : 'Upload the record', p: p.proof_uploaded_at ? (p.proof_accepted_at ? `Accepted by ${esc(kennel)}.` : `${esc(kennel)} will check it.`) : 'A photo or PDF of the vet\'s record is fine.', act: p.proof_uploaded_at ? '' : '<a class="btn solid small" href="/family/vet#proof">Upload vet record</a>' },
      ])}<p class="small muted">This is a reminder. Your contract sets the requirement and the deadline.</p></section>`;
    if (!p.proof_uploaded_at) action = { icon: 'clock', title: `${esc(timeLeft(p.vet_deadline_at, now))} left`, sub: `Vet visit due ${esc(formatAt(p.vet_deadline_at, s.time_zone))}`, href: '/family/vet#proof', label: 'Upload' };
    const soon = openTasks(steps.tasks.filter((t) => t.auto !== 'vet_visit' && t.auto !== 'vet_booking'), 2);
    if (soon.length) band += `<section class="card"><div class="between"><h2>Coming up</h2><a class="go" href="/family/timeline">All ${ic('arrow')}</a></div><ul class="tasks">${soon.map((t) => taskRow(t, kennel, 'home')).join('')}</ul></section>`;
  } else {
    hello = 'Hello again';
    const weeks = p.picked_up_at ? Math.floor((new Date(now).getTime() - Date.parse(p.picked_up_at)) / (7 * 86400000)) : 0;
    greeting = weeks >= 1 ? `${weeks} week${weeks === 1 ? '' : 's'} home` : `${name} is home`;
    const done = p.proof_accepted_at ? 'Vet visit done' : p.proof_uploaded_at ? 'Vet record uploaded' : 'Vet visit';
    const next = openTasks(steps.tasks, 1)[0];
    calendar = next
      ? `<div class="tile green"><p class="eyebrow">Next up</p><div class="calrow">${next.due ? calPage(next.due) : `<span class="ico big">${ic('list')}</span>`}<div><p class="bigline small-line">${esc(next.title)}</p></div></div><p class="small">${esc(done)}${p.proof_uploaded_at ? '' : `: upload the record on the <a href="/family/vet">Vet visit</a> page`}.</p></div>`
      : `<div class="tile green"><p class="eyebrow">${esc(done)}</p><p class="bigline">All caught up</p><p class="small">${p.proof_uploaded_at ? 'Thank you.' : `Upload the vet's record on the <a href="/family/vet">Vet visit</a> page.`}</p></div>`;
    band = nextBand(steps.tasks, name, kennel);
    if (next) action = { icon: 'list', title: esc(next.title), sub: next.due ? `By ${esc(formatDay(next.due))}` : '', href: `/family/timeline#t-${esc(next.id)}`, label: 'See it' };
  }
  // During an extended stay (plan 8.2): the week of the stay, the latest update, the skills.
  const stay = st === 'before' && live ? await stayContext(env, site, p, s, now) : null;
  if (stay) {
    const latest = stay.updates[0];
    hello = stay.state === 'staying' ? `Week ${stay.week} of ${stay.total}` : 'Extended stay';
    calendar = `<a class="tile dark" href="/family/stay"><p class="eyebrow">${esc(stay.pe.name)}</p>${stay.state === 'staying' ? `<p class="bigline">Week ${stay.week}</p><p class="small">of ${stay.total}${when ? ` · home ${esc(when)}` : ''}</p>
      <span class="weeks" aria-hidden="true">${Array.from({ length: stay.total }, (_, i) => `<span class="${i + 1 < stay.week ? 'on' : i + 1 === stay.week ? 'now' : ''}"></span>`).join('')}</span>`
      : stay.state === 'booked' ? `<p class="bigline">Starts ${esc(formatDay(stay.pe.starts_on))}</p><p class="small">${when ? `Home ${esc(when)}` : ''}</p>` : `<p class="bigline">Last days of the stay</p><p class="small">${when ? `Home ${esc(when)}` : ''}</p>`}</a>`;
    band = `<section class="sec mint bleed"><p class="eyebrow">${latest ? `As of week ${latest.week}` : 'The stay plan'}</p><h2 class="big-h">How ${esc(name)} is doing</h2>
      ${skillsList(stay.progress, { compact: true })}
      ${latest ? `<p class="small">${esc((latest.note ?? '').slice(0, 220))}${(latest.note ?? '').length > 220 ? '…' : ''}</p>` : `<p class="small">${esc(kennel)} writes an update every ${stay.pe.every_days === 7 ? 'week' : `${stay.pe.every_days} days`}: photos, and how each skill is coming along.</p>`}
      <p><a class="go" href="/family/stay">${latest ? `All ${stay.updates.length} update${stay.updates.length === 1 ? '' : 's'}` : 'The stay'} ${ic('arrow')}</a></p></section>` + band;
  }
  // The checklist from two weeks before go-home (or while there's no date yet).
  const checklist = st === 'before' && (days === null || days <= 14) ? checklistCard(steps.checklist) : '';
  const food = list.find((x) => x.portal_type === 'food' && x.link_url);
  if (p.life_status !== 'with_family' || p.status !== 'open') action = null;

  const born = pup?.born_on ? new Date(`${pup.born_on}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
  const facts = [born ? `<li>${ic('calendar')}Born ${esc(born)}</li>` : '', goYmd ? `<li>${ic('home')}${p.picked_up_at ? 'Went home' : 'Home'} ${esc(formatDay(goYmd).replace(/^\w+, /, ''))}</li>` : ''].join('');
  const quick = [[stay ? '/family/stay' : '/family/timeline', stay ? 'award' : 'calendar', stay ? 'Stay updates' : 'Timeline'], ['/family/vet', 'stethoscope', 'Vet visit'], ['/family/records', 'file', 'Records'],
    ['/family/records#photos', 'paw', 'Photos'], ['/family/messages', 'message', 'Messages'], ['/family/account', 'user', 'Account']];
  const body = `
  <section class="hero bleed">${main ? `<img src="${esc(main)}" alt="">` : `<span class="ph" aria-hidden="true">${ic('paw')}</span>`}<div class="cap"><span class="script">${esc(hello)}</span><h1>${esc(greeting)}</h1></div></section>
  <section class="bento">
    <a class="tile pup" href="/family/records">${photoTag(main ? `${main}?s=t` : null, name, 'round')}
      <span class="pname">${esc(name)}${sex ? `<span class="sex ${sex[1]}" aria-label="${sex[1]}">${sex[0]}</span>` : ''}</span>
      ${site.breed || pup?.litter_name ? `<span class="small muted">${esc(site.breed || pup.litter_name)}</span>` : ''}
      ${facts ? `<ul class="pfacts">${facts}</ul>` : ''}</a>
    ${calendar}
  </section>
  ${band}
  ${contactsLead(p, s, now) ? contactsCard(site, s, name, { lead: true }) : ''}
  ${checklist}
  ${st === 'before' && statusUrl && live ? statusBand(p, s, name, kennel, statusUrl) : ''}
  ${live ? foodBand(s, name, food) : ''}
  ${list.length ? `<section class="sec paper bleed"><h2>Included with ${esc(name)}</h2>${programList(list, 'home', kennel)}</section>` : ''}
  <section class="tile quick"><h2>Quick links</h2><div class="qgrid">${quick.map(([href, icon, label]) => `<a class="qtile" href="${href}"><span class="ico">${ic(icon)}</span>${label}</a>`).join('')}</div></section>
  ${list.length ? disclosure(s) : ''}`;
  return frame(site, 'Home', body, { fam, tab: '/family', action: action ? actionBar(action) : '' });
}

// The first months, grouped by when: what she does before go-home, the first
// week, the first two months, and later. Each task with its day, status, program
// link and Mark done; reminders and her screens see the ticks.
async function timelinePage(env, site, fam, { error } = {}, now = new Date()) {
  const { p, s, pup } = await loadContext(env, site, fam);
  if (!p) return noPlacement(site, fam);
  const name = pupName(p);
  const kennel = site.kennel_name || site.subdomain;
  if (!active(p)) return frame(site, 'Timeline', `<section class="card"><h1>Timeline</h1><p class="muted">Nothing here now.</p></section>`, { fam, tab: '/family/timeline' });
  const { tasks, checklist, bases } = await stepsFor(env, site.id, p, pup, s, { now });
  const home = bases.pickup;
  const group = (t) => {
    if (!t.due) return 'Once there\'s a go-home date';
    if (t.hers || (home && t.due < home)) return 'Before go-home';
    if (!home || t.due <= addDays(home, 7)) return 'The first week';
    if (t.due <= addDays(home, 60)) return 'The first two months';
    return 'Later';
  };
  const order = ['Before go-home', 'The first week', 'The first two months', 'Later', 'Once there\'s a go-home date'];
  const groups = order.map((g) => [g, tasks.filter((t) => group(t) === g)]).filter(([, l]) => l.length);
  const list = await programsFor(env, site.id, p);
  const born = pup?.born_on ? `${esc(name)}'s birthday (${esc(formatDay(pup.born_on))})` : null;
  const pickup = home ? `${p.picked_up_at ? 'pickup' : 'go-home'} (${esc(formatDay(home))})` : null;
  const body = `${errorBox(error)}<section class="band"><p class="eyebrow">${esc(name)}'s first months</p><h1>Timeline</h1>
    <p class="small muted">${[born, pickup].filter(Boolean).length ? `Dated from ${[born, pickup].filter(Boolean).join(' and ')}. ` : ''}Mark a step done and its reminders stop.</p></section>
    ${groups.length ? groups.map(([g, l]) => `<section class="card"><h2>${esc(g)}</h2><ul class="tasks">${l.map((t) => taskRow(t, kennel, 'timeline')).join('')}</ul></section>`).join('')
      : `<section class="card"><p class="muted">${esc(kennel)} hasn't added the timeline yet.</p></section>`}
    ${stage(p, now) === 'before' && checklist.length ? `<p class="small"><a class="go" href="/family#checklist">The go-home checklist ${ic('arrow')}</a></p>` : ''}
    ${list.length ? `<section class="card"><h2>Included with ${esc(name)}</h2>${programList(list, 'timeline', kennel)}</section>${disclosure(s)}` : ''}`;
  return frame(site, 'Timeline', body, { fam, tab: '/family/timeline', status: error ? 400 : 200 });
}

async function vetPage(env, site, fam, { error, note } = {}, now = new Date()) {
  const { p, s } = await loadContext(env, site, fam);
  if (!p) return noPlacement(site, fam);
  const name = pupName(p);
  const [bookedDay, bookedTime] = (p.vet_booked_for ?? '').split('T');
  const proof = p.proof_file_id ? await getFile(env, site.id, p.proof_file_id) : null;
  const running = stage(p, now) !== 'before';
  const body = `${noteBox(note)}${errorBox(error)}
  <section class="card"><p class="eyebrow">The vet visit</p>
    <h1>${running && p.vet_deadline_at ? `Due by ${esc(formatAt(p.vet_deadline_at, s.time_zone))}` : `Book ${esc(name)}'s first vet visit`}</h1>
    <p>${esc(VET_RULES[s.vet_rule])}${running && p.vet_deadline_at ? `: by ${deadlineLine(p.vet_deadline_at, s)}${Date.parse(p.vet_deadline_at) > now.getTime() ? `, ${esc(timeLeft(p.vet_deadline_at, now))} from now` : ''}.` : `. The clock starts when you take ${esc(name)} home.`}</p>
    ${s.proof_note ? `<p class="muted">What counts as proof: ${esc(s.proof_note)}</p>` : ''}
    <p class="muted small">This page is a reminder. Your contract states the vet visit requirement.</p>
  </section>
  <section class="card" id="booked"><h2>${p.vet_booked_at ? 'Your appointment' : 'I\'ve booked it'}</h2>
    <form method="post" action="/family/vet/booked" class="stack">
      <div class="two"><label>Day<input type="date" name="day" value="${esc(bookedDay ?? '')}" required></label><label>Time<input type="time" name="time" value="${esc(bookedTime ?? '')}"></label></div>
      <label>Clinic <span class="muted">(if you like)</span><input name="clinic" value="${esc(p.vet_clinic ?? '')}" maxlength="120"></label>
      <button class="btn ${p.vet_booked_at ? 'line' : 'solid'}">${p.vet_booked_at ? 'Save changes' : 'I\'ve booked it'}</button>
    </form></section>
  <section class="card" id="proof"><h2>Upload the vet's record</h2>
    ${proof ? `<p class="status ok">${ic('check')} Uploaded ${esc(formatAt(p.proof_uploaded_at, s.time_zone))}${p.proof_accepted_at ? `, accepted by ${esc(site.kennel_name || site.subdomain)}` : ''}. <a href="/family/file/${esc(proof.id)}">View it</a></p>` : ''}
    <form method="post" action="/family/vet/proof" enctype="multipart/form-data" class="stack">
      <label>A photo or PDF, up to 10 MB<input type="file" name="file" accept="image/*,application/pdf" required></label>
      <button class="btn ${proof ? 'line' : 'solid'}">${ic('upload')} ${proof ? 'Upload a new one' : 'Upload'}</button>
    </form></section>`;
  return frame(site, 'Vet visit', body, { fam, tab: '/family/vet', status: error ? 400 : 200 });
}

async function recordsPage(env, site, fam) {
  const { p, s, pup, photos } = await loadContext(env, site, fam);
  if (!p) return noPlacement(site, fam);
  const name = pupName(p);
  const records = await healthRecords(env, site.id, p.id);
  const contract = p.contract_file_id ? await getFile(env, site.id, p.contract_file_id) : null;
  const row = (k, v) => (v ? `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '');
  const reg = pup?.registration ? `${pup.registration === 'full' ? 'Full' : 'Limited'}${pup.registry ? ` (${pup.registry})` : ''}` : null;
  const body = `<section class="card"><p class="eyebrow">My puppy</p><h1 class="script">${esc(name)}</h1>
    <dl class="facts">
      ${row('Name', p.call_name && p.call_name !== p.puppy_name ? `${p.call_name} (${p.puppy_name} here)` : p.puppy_name)}
      ${row('Litter', pup?.litter_name)}${row('Born', pup?.born_on ? formatDay(pup.born_on) : null)}
      ${row('Sex', pup ? (pup.sex === 'female' ? 'Female' : 'Male') : null)}${row('Colour', pup?.color)}
      ${row('Parents', [pup?.dam_call || pup?.dam_name, pup?.sire_call || pup?.sire_name].filter(Boolean).join(' × ') || null)}
      ${row('Microchip', p.microchip)}${row('Registration', reg)}${row('Registration number', p.registration_no)}
      ${row(p.picked_up_at ? 'Went home' : 'Going home', goHomeWords(p, s))}
    </dl></section>
  <section class="card"><h2>Shots, deworming and vet visits</h2>
    ${records.length ? `<table class="records"><thead><tr><th>Date</th><th>What</th><th>Kind</th></tr></thead><tbody>${records.map((r) => `<tr><td>${esc(formatDay(r.given_on))}</td><td>${esc(r.name)}${r.notes ? `<br><span class="muted small">${esc(r.notes)}</span>` : ''}</td><td>${esc(RECORD_TYPES[r.type])}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">None recorded yet.</p>'}</section>
  <section class="card"><h2>Papers</h2><ul class="links">
    ${contract ? `<li><a href="/family/file/${esc(contract.id)}">${ic('file')} Your contract</a></li>` : '<li class="muted">Your contract will be here once it\'s added.</li>'}
    ${p.proof_file_id ? `<li><a href="/family/file/${esc(p.proof_file_id)}">${ic('stethoscope')} Vet visit record</a></li>` : ''}
  </ul></section>
  ${contactsCard(site, s, name)}
  <section class="card" id="photos"><h2>Photos of ${esc(name)}</h2>
    ${photos.length ? `<ul class="gallery">${photos.map((ph) => `<li><a href="/family/photo/${esc(ph.id)}"><img src="/family/photo/${esc(ph.id)}?s=t" alt="${esc(ph.alt ?? '')}" loading="lazy"></a></li>`).join('')}</ul>` : '<p class="muted">Photos will appear here.</p>'}</section>`;
  return frame(site, 'Records', body, { fam, tab: '/family/records' });
}

// The stay (plan 8.5): the countdown, every skill's progress, the updates newest first.
async function stayPage(env, site, fam, now = new Date()) {
  const { p, s } = await loadContext(env, site, fam);
  const stay = p && active(p) ? await stayContext(env, site, p, s, now) : null;
  if (!stay) return redirect('/family');
  const name = pupName(p);
  const kennel = site.kennel_name || site.subdomain;
  const days = daysUntil(p, s, now);
  const body = `<section class="band"><p class="eyebrow">${esc(stay.pe.name)}</p><h1>${esc(name)}'s stay</h1>
    <p>${stay.state === 'staying' ? `Week ${stay.week} of ${stay.total}. ` : stay.state === 'booked' ? `Starts ${esc(formatDay(stay.pe.starts_on))}. ` : ''}${days !== null && days > 0 ? `${esc(name)} comes home in ${days} day${days === 1 ? '' : 's'}${goHomeWords(p, s) ? `, ${esc(goHomeWords(p, s))}` : ''}.` : ''}</p></section>
    ${stay.progress.length ? `<section class="card"><h2>Skills</h2>${skillsList(stay.progress)}</section>` : ''}
    ${stay.updates.length ? stay.updates.map((u) => updateCard(u, stay.skills, name)).join('') : `<section class="card"><p class="muted">${esc(kennel)}'s first update will be here${stay.pe.starts_on ? ` in the stay's first week` : ''}.</p></section>`}
    <p class="small"><a class="go" href="/family/timeline">${esc(name)}'s timeline ${ic('arrow')}</a></p>`;
  return frame(site, 'Stay', body, { fam, tab: '/family/stay' });
}

// Every puppy of theirs, with her photos (a lost puppy's stay, under its name).
async function photosPage(env, site, fam) {
  const { results: ps } = await env.DB.prepare('SELECT puppy_id, puppy_name, call_name FROM portal_placements WHERE site_id = ? AND family_id = ? ORDER BY created_at DESC').bind(site.id, fam.familyId).all();
  const parts = [];
  for (const p of ps) {
    const photos = await puppyPhotos(env, site.id, p.puppy_id);
    parts.push(`<section class="card"><h2>Photos of ${esc(pupName(p))}</h2>${photos.length ? `<ul class="gallery">${photos.map((ph) => `<li><a href="/family/photo/${esc(ph.id)}"><img src="/family/photo/${esc(ph.id)}?s=t" alt="${esc(ph.alt ?? '')}" loading="lazy"></a></li>`).join('')}</ul>` : '<p class="muted">No photos yet.</p>'}</section>`);
  }
  return frame(site, 'Photos', parts.join('') || '<section class="card"><p class="muted">Photos will appear here.</p></section>', { fam, tab: '/family/photos' });
}

// Messages with her, from pickup on (plan 2); before that, the status page.
async function messagesPage(env, site, fam, { error, draft = '' } = {}) {
  const kennel = site.kennel_name || site.subdomain;
  const s = await getSettings(env, site.id);
  if (!(await messagesOpen(env, site.id, fam.familyId))) {
    const statusUrl = /^https:\/\//i.test(fam.statusUrl ?? '') ? fam.statusUrl : null;
    const email = s.her_email || site.contact_email;
    return frame(site, 'Messages', `<section class="card"><h1>Messages</h1>
      <p>Until your puppy comes home, ${statusUrl ? `message ${esc(kennel)} from your status page.` : `contact ${esc(kennel)} directly.`} Messages here open on pickup day.</p>
      ${statusUrl ? `<p><a class="btn solid" href="${esc(statusUrl)}">Message ${esc(kennel)} ${ic('arrow')}</a></p>` : email ? `<p><a class="btn line" href="mailto:${esc(email)}">${ic('mail')} Email ${esc(kennel)}</a></p>` : ''}</section>`, { fam, status: error ? 400 : 200 });
  }
  const list = await thread(env, site.id, fam.familyId);
  if (!fam.viewing) await markRead(env, site.id, fam.familyId, 'breeder');
  const body = `${errorBox(error)}<section class="card" id="messages"><h1>Messages with ${esc(kennel)}</h1>
    ${list.length ? `<ol class="thread">${list.map((m) => `<li class="${m.sender === 'family' ? 'mine' : 'theirs'}"><p class="small muted">${m.sender === 'family' ? 'You' : esc(kennel)} · ${esc(formatAt(m.sent_at, s.time_zone, { weekday: false }))}</p>${m.body.split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('')}</li>`).join('')}</ol>` : `<p class="muted">Questions about your puppy go to ${esc(kennel)} here. You'll get an email when they answer.</p>`}
    <form method="post" action="/family/messages" class="stack"><label>Your message<textarea name="body" rows="4" maxlength="${MAX_MESSAGE}" required>${esc(draft)}</textarea></label><button class="btn solid">Send</button></form>
    <p class="small muted">For an emergency, call your vet.</p></section>`;
  return frame(site, 'Messages', body, { fam, status: error ? 400 : 200 });
}

async function accountPage(env, site, fam, { error } = {}) {
  const emails = await familyEmails(env, fam.familyId);
  const kennel = site.kennel_name || site.subdomain;
  return frame(site, 'Account', `<section class="card"><h1>${esc(fam.name)}</h1>
    <h2>Email addresses</h2><ul class="links">${emails.map((e) => `<li>${esc(e.email)}</li>`).join('')}</ul>
    <p class="muted small">Any of these can sign in. To add or change one, ask ${esc(kennel)}.</p>
    <p class="muted small">Vet visit reminders always go to every address: they're part of your contract.</p>
    <form method="post" action="/family/signout"><button class="btn line">Sign out</button></form></section>
    ${errorBox(error)}<details class="card"><summary><b>Delete our account</b></summary>
    <p>This deletes your sign-in, email addresses and messages here, now and for good. ${esc(kennel)} keeps the record of your puppy's sale, vet visit and contract, as your contract needs.</p>
    <form method="post" action="/family/account/delete" class="stack"><label>Type <strong>delete</strong> to confirm<input name="confirm" autocomplete="off" required></label><button class="btn line">Delete our account</button></form></details>`, { fam, status: error ? 400 : 200 });
}

// ---------- seeing their portal (plan family-view.md) ----------

// The band at the top of every page while she's viewing: whose portal, read-only,
// Refresh and Stop viewing. Her wording (manage/wording.js, familyview.*).
function viewBand(fam, path, refused) {
  const say = fam.say;
  return `<div class="note" role="status"><p><b>${esc(say('familyview.band', { family: fam.name }))}</b></p>${refused ? `<p>${esc(say('familyview.nochange'))}</p>` : ''}
  <form method="post" action="/family/view/exit" class="two"><a class="btn line" href="${esc(path)}">${esc(say('familyview.refresh'))}</a><button class="btn line">${esc(say('familyview.stop'))}</button></form></div>`;
}

// Where a refused tap goes back to: the portal page it was sent from.
function viewBack(request, url) {
  try {
    const from = new URL(request.headers.get('referer') ?? '');
    if (from.origin === url.origin && isPortalPath(from.pathname) && !from.pathname.startsWith('/family/view')) return from.pathname;
  } catch { /* no referer */ }
  return '/family';
}

// When viewing stops, or a link no longer works: a page saying so, the cookie
// cleared, and the way back to her Site Manager.
async function viewEnded(env, site, why, familyId = null) {
  const say = sayer({ every: await everyWording(env), site: siteWording(await loadBuild(env, site.id)) }, { kennel: site.kennel_name || site.subdomain });
  const back = `https://manage.${env.ROOT_DOMAIN}/s/${encodeURIComponent(site.subdomain)}/portal${familyId ? `/f/${encodeURIComponent(familyId)}` : ''}`;
  const res = frame(site, say('familyview.ended_title'), `<section class="card narrow"><h1>${esc(say('familyview.ended_title'))}</h1>
  <p>${esc(say(`familyview.${why}`))}</p>
  <p><a class="btn line" href="${esc(back)}">${esc(say('familyview.back'))}</a></p></section>`, { status: why === 'stopped' ? 200 : 403 });
  res.headers.append('set-cookie', viewCookie('', 0));
  return res;
}

// ---------- routes ----------

function sameOrigin(request, url) {
  const origin = request.headers.get('origin');
  if (origin) return origin === url.origin;
  const s = request.headers.get('sec-fetch-site');
  return s === 'same-origin' || s === 'none';
}

export async function servePortal(request, env, ctx, subdomain, { onDomain = false } = {}) {
  const url = new URL(request.url);
  if (!(await schemaReady(env.DB))) return htmlPage('Back soon', '<h1>Back soon</h1><p>Please try again in a few minutes.</p>', { status: 503, headers: { 'retry-after': '300' } });
  const site = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, s.portal_on, s.contact_phone, s.contact_email, s.logo_photo_id, s.monogram, s.breed, d.hostname AS domain
    FROM sites s LEFT JOIN custom_domains d ON d.site_id = s.id AND d.status = 'active' WHERE s.subdomain = ?`).bind(subdomain).first();
  if (!site || !site.portal_on || site.status === 'closed' || site.status === 'suspended') return htmlPage('Not found', '<h1>Not found</h1><p>There is no page at this address.</p>', { status: 404 });
  if (site.domain && !onDomain && env.ALLOW_HOST_OVERRIDE !== '1') {
    return new Response(null, { status: 301, headers: { location: `https://${site.domain}${url.pathname}${url.search}`, 'cache-control': 'no-store' } });
  }
  const path = url.pathname.replace(/\/+$/, '') || '/family';
  const post = request.method === 'POST';
  if (!post && request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD, POST' } });
  if (post && !sameOrigin(request, url)) return new Response('Forbidden', { status: 403 });

  // Seeing their portal (plan family-view.md): her view link, once, to a view cookie
  // that wins over a family session in the same browser while it lasts.
  if (path === '/family/view' && !post) {
    const value = await redeemViewLink(env, site.id, url.searchParams.get('t'));
    if (value) return redirect('/family', { 'set-cookie': viewCookie(value) });
    return viewEnded(env, site, 'used');
  }
  const view = await currentView(env, request, site);
  if (path === '/family/view/exit' && post) return viewEnded(env, site, 'stopped', view?.familyId);
  if (view?.stale) return viewEnded(env, site, 'expired');
  // Read-only: no write of any kind (sign-in too), back to the page she was on, with a note.
  if (view && post) return redirect(`${viewBack(request, url)}?viewing=nochange`);

  try {
    if (path === '/family/signin' && post) {
      const form = await request.formData();
      const { email } = await startFamilySignIn(env, request, site, form.get('email'));
      return codePage(site, { email });
    }
    if (path === '/family/signin/verify' && post) {
      const form = await request.formData();
      try {
        return redirect('/family', { 'set-cookie': await verifyFamilySignIn(env, site, form.get('email'), form.get('code')) });
      } catch (err) {
        if (err instanceof AuthError) return codePage(site, { email: String(form.get('email') ?? ''), error: err.message });
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof AuthError) return signInPage(site, { error: err.message });
    throw err;
  }
  // The status page's one tap (plan 3.4): a link KennelOS signed, once, for 10 minutes.
  if (path === '/family/handoff') {
    const familyId = await redeemHandoff(env, site, url.searchParams.get('t'));
    if (familyId) return redirect('/family', { 'set-cookie': await startSession(env, site.id, familyId) });
    return signInPage(site, { note: 'That link has been used or has expired. Sign in with your email instead, or open the portal again from your status page.' });
  }
  if (path === '/family/welcome') {
    const cookie = await acceptInvite(env, site, url.searchParams.get('t'));
    if (cookie) return redirect('/family', { 'set-cookie': cookie });
    return signInPage(site, { note: 'That sign-in link has been used or has expired. Sign in with your email instead.' });
  }

  if (view) view.say = sayer({ every: await everyWording(env), site: siteWording(await loadBuild(env, site.id)) }, { kennel: site.kennel_name || site.subdomain });
  const fam = view ?? await currentFamily(env, request, site);
  if (path === '/family/signout' && post) {
    if (fam) await signOutFamily(env, fam);
    return redirect('/family', { 'set-cookie': familyCookie('', 0) });
  }
  if (!fam) return path === '/family' ? signInPage(site) : redirect('/family');
  const current = await placementFor(env, site.id, fam.familyId);
  fam.loss = isLoss(current);
  fam.stay = Boolean(!fam.loss && current && active(current) && !current.picked_up_at && await stayFor(env, site.id, current.id));
  // On Messages itself they're read as the page shows them.
  fam.unread = fam.loss || path === '/family/messages' ? 0 : await unreadFrom(env, site.id, fam.familyId, 'breeder');
  if (fam.viewing) fam.band = viewBand(fam, path, url.searchParams.get('viewing') === 'nochange');

  if (!post) {
    if (path === '/family') return homePage(env, site, fam);
    if (path === '/family/vet') return vetPage(env, site, fam, { note: url.searchParams.get('note') === 'booked' ? 'Saved. Thank you!' : url.searchParams.get('note') === 'uploaded' ? 'Uploaded. Thank you!' : null });
    if (path === '/family/records') return recordsPage(env, site, fam);
    if (fam.loss && ['/family/timeline', '/family/vet', '/family/records', '/family/messages'].includes(path)) return redirect('/family');
    if (path === '/family/timeline') return timelinePage(env, site, fam);
    if (path === '/family/photos') return photosPage(env, site, fam);
    if (path === '/family/stay') return stayPage(env, site, fam);
    const mm = path.match(/^\/family\/media\/([0-9a-f-]{36})$/);
    if (mm) return mediaResponse(env, await mediaFor(env, site.id, fam.familyId, mm[1]));
    if (path === '/family/messages') return messagesPage(env, site, fam);
    if (path === '/family/account') return accountPage(env, site, fam);
    let m = path.match(/^\/family\/photo\/([0-9a-f-]{36})$/);
    if (m) return servePhoto(env, site, fam, m[1], url.searchParams.get('s') === 't');
    m = path.match(/^\/family\/file\/([0-9a-f-]{36})$/);
    if (m) return serveFile(env, site, fam, m[1]);
    m = path.match(/^\/family\/go\/([\w-]{1,64})$/);
    if (m) return goToProgram(env, site, fam, m[1], url.searchParams.get('from'));
    return frame(site, 'Not found', '<section class="card"><p>There\'s nothing here.</p><p><a href="/family">Home</a></p></section>', { status: 404, fam });
  }

  if (path === '/family/messages') {
    const form = await request.formData();
    try {
      await familyWrites(env, site, fam, form.get('body'));
    } catch (err) {
      if (err instanceof PortalError) return messagesPage(env, site, fam, { error: err.message, draft: String(form.get('body') ?? '') });
      throw err;
    }
    return redirect('/family/messages#messages');
  }
  if (path === '/family/account/delete') {
    const form = await request.formData();
    if (String(form.get('confirm') ?? '').trim().toLowerCase() !== 'delete') return accountPage(env, site, fam, { error: 'Type delete to confirm.' });
    await eraseFamily(env, site.id, fam.familyId, 'family');
    return new Response(frame(site, 'Account deleted', `<section class="card narrow"><h1>Your account is deleted</h1><p>Your sign-in, addresses and messages are gone. Thank you for being a ${esc(site.kennel_name || site.subdomain)} family.</p></section>`).body, { status: 200, headers: { ...HEADERS, 'set-cookie': familyCookie('', 0) } });
  }
  const p = current;
  if (!p) return redirect('/family');
  // Ticks and "I've done this": back to the page they came from.
  if (path === '/family/step' || path === '/family/program') {
    const form = await request.formData();
    const back = { home: '/family', timeline: '/family/timeline' }[String(form.get('back'))] ?? '/family';
    try {
      if (!active(p)) throw new PortalError('Nothing to tick now.');
      if (path === '/family/step') {
        const kind = String(form.get('kind'));
        if (kind !== 'checklist' && kind !== 'task') throw new PortalError('Unknown list.');
        await setDone(env, site.id, p, kind, String(form.get('id') ?? ''), form.get('done') === '1', 'family');
        return redirect(`${back}${kind === 'checklist' ? '#checklist' : `#t-${encodeURIComponent(String(form.get('id') ?? ''))}`}`);
      }
      await setProgramStatus(env, site.id, p, String(form.get('product') ?? ''), 'done', 'family');
      return redirect(back);
    } catch (err) {
      if (err instanceof PortalError) return timelinePage(env, site, fam, { error: err.message });
      throw err;
    }
  }
  try {
    if (path === '/family/vet/booked') {
      const form = await request.formData();
      await recordVetBooking(env, site.id, p.id, { day: form.get('day'), time: form.get('time'), clinic: form.get('clinic') });
      return redirect('/family/vet?note=booked');
    }
    if (path === '/family/vet/proof') {
      if (Number(request.headers.get('content-length') ?? 0) > MAX_FILE_BYTES + 64 * 1024) throw new PortalError('That file is over 10 MB. Try a photo of the page instead.');
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') throw new PortalError('Choose a file.');
      await saveFile(env, site.id, p.id, { kind: 'proof', bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, by: 'family' });
      return redirect('/family/vet?note=uploaded');
    }
  } catch (err) {
    if (err instanceof PortalError) return vetPage(env, site, fam, { error: err.message });
    throw err;
  }
  return new Response('Not found', { status: 404 });
}
