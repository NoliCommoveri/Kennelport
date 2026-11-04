// The family's pages (docs/Puppy_Parent_Portal_Plan.md section 7): everything under
// /family on her site, signed in only, for a site with the portal on (/ops).
// Home changes with the puppy's stage (before go-home, the vet window, after);
// Vet visit holds "I've booked it" and the proof upload; Records holds the puppy's
// details, shots and deworming, the contract and her photos.
//
// Nothing here is cached, and nothing a family sees comes from another family:
// every photo and file is checked against the signed-in family's own placement.
import { schemaReady } from '../gate.js';
import { escapeHtml as esc, htmlPage } from '../lib/html.js';
import {
  startFamilySignIn, verifyFamilySignIn, acceptInvite, currentFamily, signOutFamily, familyCookie, AuthError,
} from './auth.js';
import {
  getSettings, placementFor, puppyFor, healthRecords, recordVetBooking, saveFile, getFile, fileResponse, familyEmails,
  PortalError, RECORD_TYPES, MAX_FILE_BYTES, DEFAULT_DISCLOSURE, dialable,
} from './store.js';
import { stage, vetDeadline, formatAt, formatDay, timeLeft, localParts, VET_RULES } from './vet.js';
import { PORTAL_VERSION } from './version.js';
import { CODE_TTL_MS } from '../auth.js';

export const PORTAL_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const HEADERS = {
  'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', 'content-security-policy': PORTAL_CSP,
  'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
};
const redirect = (location, headers = {}) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', ...headers } });

export const isPortalPath = (path) => path === '/family' || path.startsWith('/family/');

// ---------- icons (Lucide-style strokes, one set) ----------

const ICONS = {
  paw: '<circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5 0 1.5 1.5 2 3 1.6 1.2-.3 2-.6 3-.6s1.8.3 3 .6c1.5.4 3-.1 3-1.6C18 16 15 12 12 12z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  stethoscope: '<path d="M6 3v6a5 5 0 0 0 10 0V3"/><path d="M11 14v2a5 5 0 0 0 10 0v-1"/><circle cx="21" cy="13" r="2"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  arrow: '<path d="M7 17 17 7M9 7h8v8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
};
const TYPE_ICON = { food: 'bowl', insurance: 'shield', registration: 'award', product: 'tag', other: 'tag' };
const SPRITE = `<svg width="0" height="0" class="sprite" aria-hidden="true">${Object.entries(ICONS).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${d}</symbol>`).join('')}</svg>`;
const ic = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

// ---------- the page frame ----------

function frame(site, title, body, { status = 200, fam = null, tab = null, action = '', headers = {} } = {}) {
  const kennel = site.kennel_name || site.subdomain;
  const tabs = fam ? `<nav class="tabs" aria-label="Portal">${[['/family', 'home', 'Home'], ['/family/vet', 'stethoscope', 'Vet visit'], ['/family/records', 'file', 'Records']]
    .map(([href, icon, label]) => `<a href="${href}"${tab === href ? ' aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></a>`).join('')}</nav>` : '';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · ${esc(kennel)}</title>
<link rel="stylesheet" href="/_kp/f/portal.css?v=${PORTAL_VERSION}">
<script src="/_kp/f/portal.js?v=${PORTAL_VERSION}" defer></script>
</head><body class="${fam ? 'in' : 'out'}">
${SPRITE}
<header class="top"><a class="brand" href="/family">${ic('paw', 'i mark')}<span>${esc(kennel)}</span></a>
<span class="top-end"><button type="button" class="aa" id="aa" aria-label="Text size">Aa</button>${fam ? `<a class="acct" href="/family/account" aria-label="Account">${ic('user')}</a>` : ''}</span></header>
<main>${body}</main>
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
  </form></section>`, { status: error ? 400 : 200 });
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

async function programs(env, siteId) {
  return (await env.DB.prepare(`SELECT id, name, description, link_url, link_label, code, code_note, portal_type, family_action FROM products
    WHERE site_id = ? AND portal_show = 1 ORDER BY sort, name`).bind(siteId).all()).results;
}

function programList(list, place) {
  if (!list.length) return '';
  return `<ul class="programs">${list.map((x) => `<li>
    <span class="tint">${ic(TYPE_ICON[x.portal_type] ?? 'tag')}</span>
    <div><b>${esc(x.name)}</b>${x.family_action ? `<p>${esc(x.family_action)}</p>` : x.description ? `<p class="muted">${esc(x.description)}</p>` : ''}
    ${x.code ? `<p class="code">Code <strong>${esc(x.code)}</strong>${x.code_note ? ` <span class="muted">${esc(x.code_note)}</span>` : ''}</p>` : ''}
    ${x.link_url ? `<a class="go" href="/family/go/${esc(x.id)}?from=${place}">${esc(x.link_label || 'Open')} ${ic('arrow')}</a>` : ''}</div></li>`).join('')}</ul>`;
}

const disclosure = (s) => `<p class="disclosure">${esc(s.disclosure || DEFAULT_DISCLOSURE)}</p>`;

// The puppy's photos: her main photo for it, then any she tagged with it.
async function puppyPhotos(env, siteId, puppyId) {
  if (!puppyId) return [];
  const { results } = await env.DB.prepare(`SELECT ph.id, ph.alt FROM photos ph WHERE ph.site_id = ? AND ph.removed_at IS NULL AND (
      ph.id = (SELECT photo_id FROM puppies WHERE id = ?) OR ph.id IN (SELECT photo_id FROM photo_tags WHERE site_id = ? AND subject = ?))
    ORDER BY ph.id = (SELECT photo_id FROM puppies WHERE id = ?) DESC, ph.created_at DESC LIMIT 60`).bind(siteId, puppyId, siteId, `puppy:${puppyId}`, puppyId).all();
  return results;
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

async function homePage(env, site, fam, now = new Date()) {
  const { p, s, pup, main } = await loadContext(env, site, fam);
  if (!p) return noPlacement(site, fam);
  const name = pupName(p);
  const st = stage(p, now);
  const days = daysUntil(p, s, now);
  const kennel = site.kennel_name || site.subdomain;
  const list = await programs(env, site.id);
  const sex = SEX[pup?.sex];

  let greeting;
  let calendar;
  let band;
  let action;
  if (st === 'before') {
    greeting = days === null ? `Welcome, ${fam.name}` : days > 1 ? `${name} comes home in ${days} days` : days === 1 ? `${name} comes home tomorrow` : days === 0 ? `${name} comes home today` : `Welcome, ${fam.name}`;
    const expected = p.pickup_booked_at ? vetDeadline(p.pickup_booked_at, s.vet_rule, s.time_zone) : null;
    calendar = `<div class="cal">${ic('calendar')}<p class="eyebrow">Go-home</p>${goHomeWords(p, s) ? `<p class="big">${esc(goHomeWords(p, s))}</p>` : `<p>Not booked yet. ${esc(kennel)} will confirm the day and time with you.</p>`}</div>`;
    band = `<section class="band"><p class="eyebrow">Before ${esc(name)} comes home</p><h2>Book the vet visit now</h2>
      <p>Your contract asks for a vet visit ${s.vet_rule === 'days3' ? `by the end of the third day after the day you take ${esc(name)} home` : 'within 72 hours of pickup'}.${expected ? ` With pickup ${esc(formatAt(p.pickup_booked_at, s.time_zone))}, that's by ${deadlineLine(expected, s)}.` : ''} Vets are often booked days ahead.</p>
      ${p.vet_booked_at ? `<p class="status ok">${ic('check')} Booked${p.vet_booked_for ? ` for ${esc(p.vet_booked_for.replace('T', ' at '))}` : ''}${p.vet_clinic ? `, ${esc(p.vet_clinic)}` : ''}</p>` : '<p><a class="btn solid" href="/family/vet">I\'ve booked it</a></p>'}</section>`;
    action = p.vet_booked_at ? '' : `<a href="/family/vet">${ic('calendar')}<span>Book ${esc(name)}'s vet visit, then tell us</span><b>I've booked it</b></a>`;
  } else if (st === 'vet') {
    greeting = `Welcome home, ${name}`;
    calendar = `<div class="cal urgent">${ic('clock')}<p class="eyebrow">Vet visit due</p><p class="big">${esc(timeLeft(p.vet_deadline_at, now))} left</p><p>By ${deadlineLine(p.vet_deadline_at, s)}</p></div>`;
    band = `<section class="band"><p class="eyebrow">The 3-day vet visit</p><h2>${p.proof_uploaded_at ? 'Record uploaded: thank you' : `Due by ${esc(formatAt(p.vet_deadline_at, s.time_zone))}`}</h2>
      <ol class="steps"><li class="${p.vet_booked_at ? 'done' : ''}"><b>Book it</b><span>${p.vet_booked_at ? `Booked${p.vet_booked_for ? ` for ${esc(p.vet_booked_for.replace('T', ' at '))}` : ''}` : 'Not booked yet'}</span></li>
      <li><b>See the vet</b><span>Bring this portal's Records page</span></li>
      <li class="${p.proof_uploaded_at ? 'done' : ''}"><b>Upload the record</b><span>${p.proof_uploaded_at ? 'Uploaded' : 'A photo or PDF of the vet\'s record'}</span></li></ol>
      ${p.proof_uploaded_at ? '' : '<p><a class="btn solid" href="/family/vet#proof">Upload vet record</a></p>'}</section>`;
    action = p.proof_uploaded_at ? '' : `<a href="/family/vet#proof">${ic('clock')}<span>${esc(timeLeft(p.vet_deadline_at, now))} left for the vet visit</span><b>Upload</b></a>`;
  } else {
    greeting = `${name} is home`;
    const done = p.proof_accepted_at ? 'Vet visit done' : p.proof_uploaded_at ? 'Vet record uploaded' : 'Vet visit';
    calendar = `<div class="cal">${ic('check')}<p class="eyebrow">${esc(done)}</p><p>${p.proof_uploaded_at ? 'Thank you.' : `Upload the vet's record on the <a href="/family/vet">Vet visit</a> page.`}</p></div>`;
    band = '';
    action = '';
  }
  if (p.life_status !== 'with_family' || p.status !== 'open') action = '';

  const body = `
  <section class="hero">${main ? `<img src="${esc(main)}" alt="">` : '<span class="ph">' + ic('paw') + '</span>'}<div><p class="eyebrow">${esc(kennel)}</p><h1 class="script">${esc(greeting)}</h1></div></section>
  <section class="pair">
    <div class="pup card">${photoTag(main ? `${main}?s=t` : null, name, 'round')}
      <div><p class="script name">${esc(name)}</p>
      <p class="muted small">${sex ? `<span class="sex ${sex[1]}">${sex[0]}</span> ` : ''}${pup?.litter_name ? esc(pup.litter_name) : ''}${pup?.born_on ? ` · born ${esc(formatDay(pup.born_on))}` : ''}</p>
      ${goHomeWords(p, s) ? `<p class="small">${p.picked_up_at ? 'Went home' : 'Going home'} ${esc(goHomeWords(p, s))}</p>` : ''}</div></div>
    ${calendar}
  </section>
  ${band}
  ${contactsLead(p, s, now) ? contactsCard(site, s, name, { lead: true }) : ''}
  ${list.length ? `<section class="card"><h2>Included with ${esc(name)}</h2>${programList(list, 'home')}</section>` : ''}
  <section class="tiles">
    <a class="tile" href="/family/records">${ic('file')}<b>${esc(name)}'s records</b><span>Shots, deworming, contract</span></a>
    <a class="tile" href="/family/vet">${ic('stethoscope')}<b>Vet visit</b><span>Booking and record</span></a>
    <a class="tile" href="/family/records#photos">${ic('paw')}<b>Photos</b><span>From ${esc(kennel)}</span></a>
    <a class="tile" href="/family/account">${ic('user')}<b>Account</b><span>Emails, sign out</span></a>
  </section>
  ${list.length ? disclosure(s) : ''}`;
  return frame(site, 'Home', body, { fam, tab: '/family', action: action ? `<div class="actionbar">${action}</div>` : '' });
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

async function accountPage(env, site, fam) {
  const emails = await familyEmails(env, fam.familyId);
  const kennel = site.kennel_name || site.subdomain;
  return frame(site, 'Account', `<section class="card"><h1>${esc(fam.name)}</h1>
    <h2>Email addresses</h2><ul class="links">${emails.map((e) => `<li>${esc(e.email)}</li>`).join('')}</ul>
    <p class="muted small">Any of these can sign in. To add or change one, ask ${esc(kennel)}.</p>
    <p class="muted small">Vet visit reminders always go to every address: they're part of your contract.</p>
    <form method="post" action="/family/signout"><button class="btn line">Sign out</button></form></section>`, { fam });
}

// ---------- files and photos ----------

async function servePhoto(env, site, fam, id, thumb) {
  const p = await placementFor(env, site.id, fam.familyId);
  const mine = p ? (await puppyPhotos(env, site.id, p.puppy_id)).some((ph) => ph.id === id) : false;
  const row = mine ? await env.DB.prepare('SELECT r2_key, thumb_key, type FROM photos WHERE id = ? AND site_id = ?').bind(id, site.id).first() : null;
  const obj = row && await env.FILES.get(thumb && row.thumb_key ? row.thumb_key : row.r2_key);
  if (!obj) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(obj.body, { headers: { 'content-type': row.type || 'image/webp', 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
}

async function serveFile(env, site, fam, id) {
  const file = await getFile(env, site.id, id);
  const p = file && await env.DB.prepare('SELECT family_id FROM portal_placements WHERE id = ? AND site_id = ?').bind(file.placement_id, site.id).first();
  if (!p || p.family_id !== fam.familyId || file.kind === 'record') return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return fileResponse(env, file);
}

const PLACES = new Set(['home', 'records', 'vet']);

async function goToProgram(env, site, fam, id, from) {
  const x = await env.DB.prepare('SELECT id, link_url FROM products WHERE id = ? AND site_id = ? AND portal_show = 1').bind(id, site.id).first();
  if (!x?.link_url || !/^https:\/\//i.test(x.link_url)) return new Response('Not found', { status: 404 });
  await env.DB.prepare('INSERT INTO portal_clicks (site_id, family_id, product_id, place, at) VALUES (?, ?, ?, ?, ?)')
    .bind(site.id, fam.familyId, x.id, PLACES.has(from) ? from : 'other', new Date().toISOString()).run();
  return new Response(null, { status: 302, headers: { location: x.link_url, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
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
  const site = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, s.portal_on, s.contact_phone, s.contact_email, d.hostname AS domain
    FROM sites s LEFT JOIN custom_domains d ON d.site_id = s.id AND d.status = 'active' WHERE s.subdomain = ?`).bind(subdomain).first();
  if (!site || !site.portal_on || site.status === 'closed' || site.status === 'suspended') return htmlPage('Not found', '<h1>Not found</h1><p>There is no page at this address.</p>', { status: 404 });
  if (site.domain && !onDomain && env.ALLOW_HOST_OVERRIDE !== '1') {
    return new Response(null, { status: 301, headers: { location: `https://${site.domain}${url.pathname}${url.search}`, 'cache-control': 'no-store' } });
  }
  const path = url.pathname.replace(/\/+$/, '') || '/family';
  const post = request.method === 'POST';
  if (!post && request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD, POST' } });
  if (post && !sameOrigin(request, url)) return new Response('Forbidden', { status: 403 });

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
  if (path === '/family/welcome') {
    const cookie = await acceptInvite(env, site, url.searchParams.get('t'));
    if (cookie) return redirect('/family', { 'set-cookie': cookie });
    return signInPage(site, { note: 'That sign-in link has been used or has expired. Sign in with your email instead.' });
  }

  const fam = await currentFamily(env, request, site);
  if (path === '/family/signout' && post) {
    if (fam) await signOutFamily(env, fam);
    return redirect('/family', { 'set-cookie': familyCookie('', 0) });
  }
  if (!fam) return path === '/family' ? signInPage(site) : redirect('/family');

  if (!post) {
    if (path === '/family') return homePage(env, site, fam);
    if (path === '/family/vet') return vetPage(env, site, fam, { note: url.searchParams.get('note') === 'booked' ? 'Saved. Thank you!' : url.searchParams.get('note') === 'uploaded' ? 'Uploaded. Thank you!' : null });
    if (path === '/family/records') return recordsPage(env, site, fam);
    if (path === '/family/account') return accountPage(env, site, fam);
    let m = path.match(/^\/family\/photo\/([0-9a-f-]{36})$/);
    if (m) return servePhoto(env, site, fam, m[1], url.searchParams.get('s') === 't');
    m = path.match(/^\/family\/file\/([0-9a-f-]{36})$/);
    if (m) return serveFile(env, site, fam, m[1]);
    m = path.match(/^\/family\/go\/([\w-]{1,64})$/);
    if (m) return goToProgram(env, site, fam, m[1], url.searchParams.get('from'));
    return frame(site, 'Not found', '<section class="card"><p>There\'s nothing here.</p><p><a href="/family">Home</a></p></section>', { status: 404, fam });
  }

  const p = await placementFor(env, site.id, fam.familyId);
  if (!p) return redirect('/family');
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
