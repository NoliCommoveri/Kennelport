// The owner's build tools, in her admin view of the Site Manager
// (docs/Site_Builder_Plan.md, step 1: display and timing rules). Drawn from the
// site builder prototype (docs/reference/site-builder-prototype.html): Every site
// as tiles; per site, Display rules (a card per pup status, then registration and
// prices) and Timing (a row per rule with its default), each beside a phone
// preview of the breeder's Puppies page drawn with the site's saved rules, and
// the pinned action bar to save.
//
//   GET  /admin                     Every site
//   GET  /admin/<sub>/pages         Pages: the list (step 3)
//   GET  /admin/<sub>/pages/<page>  a page's blocks, top to bottom, and what each data block's cards show
//   GET  /admin/<sub>/rules         Pups: status, registration and price rules
//   GET  /admin/<sub>/dogs          Dogs: the Dogs page's wording, adults' prices
//   GET  /admin/<sub>/wording       Wording: the rest of the site's fixed lines
//   GET  /admin/<sub>/formats       Formats: dates, sex words, money
//   GET  /admin/<sub>/kennelos      From KennelOS: how its data lands
//   GET  /admin/<sub>/timing        Timing
//   GET  /admin/<sub>/site/<path>   The whole site, as it stands in the draft: the
//                                   demo's only view (kennelos/demo.js), and any site's
//                                   without a preview link
// Each POSTs to itself: save, or one part back to default.
//
// Only for admin (admin.js); a breeder never reaches these.
import { escapeHtml as esc } from '../lib/html.js';
import {
  PUP_STATUSES, STATUS_NOTES, PILLS, DEFAULT_RULES, DEFAULT_TIMING, RuleError, rulesFor, rulesFromForm, timingFromForm,
  withPart, changedCount, loadBuild, saveBuild, partsFromForm, wordsOn, DATE_STYLES, DAY_STYLES, SEX_STYLES, COUNT_STYLES,
  DOG_PLACES, DOG_PLACE_WORDS, KOS_DOG_STATUSES,
} from '../content/rules.js';
import { buildSnapshot } from '../publish.js';
import {
  olderPuppies, depositsAhead, puppyStatus, puppyPriceText, regText, statusRule, sortPuppies, fullRegHref, rulesOf,
  useFormats, word, litterRows, dogGroups, sitePrice, pricesOff, fmtDate, sexWord, dogsFor, label, placedFaqs, addedOn, addedWords, customPage,
} from '../render/parts.js';
import { makePreviewToken, servePhoto, SITE_CSP } from '../site.js';
import { renderPage } from '../render/index.js';
import { DEMO_STEPS } from '../kennelos/demo.js';
import {
  BLOCK_TYPES, DOG_STATUS, ANY3, DOG_FLAGS, DOG_ORDER, DOG_STYLE, STAGES, REVIEW_STYLE, SEXES, DOG_ITEMS, LITTER_ITEMS, LITTER_PAIR,
  LITTER_ROWS, REVIEW_ITEMS, REVIEW_WHO, BlockError, blocksFromForm, moved, newBlock,
  pageBlocks, pageChanged, pagesChanged, withPage, addable, fits, hersOn, blockName, blockHint, isBuilt, BUILT_PAGES, PAGE_PARTS, headFor, isCustom, customPages, addPage, withPageInfo, withoutPage, pathFor, STARTS,
} from '../content/blocks.js';
import { PAGES, MENU_GROUPS } from '../content/model.js';
import { siteLink } from '../ops/sites.js';
import { SCREENS as WORD_SCREENS, CATALOG, itemsOn, everyWording, saveEveryWording, siteWording, withWording, WordingError } from './wording.js';

const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });
const ic = (n) => `<span class="ic" aria-hidden="true"><svg class="i"><use href="#i-${n}"/></svg></span>`;
const svg = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Today's two starting templates (plan, decision 12), as the site's build stands
// until templates are built (step 5): with the portal or without.
const startingTemplate = (site) => (site.portal_on ? 'Website and family portal' : 'Website');
const isDemo = (site) => site.demo_step != null;
// Where a site is, in words: its address, or Demo (it has none).
const whereIs = (site, path = '') => (isDemo(site) ? `Demo${path ? ` · ${path}` : ''}` : `${site.subdomain}.kennelport.com${path}`);

// A site's screens: [path, title, icon, short name for the phone's tabs].
const SCREENS = [
  ['pages', 'Pages', 'pages', 'Pages'], ['rules', 'Pups', 'paw', 'Pups'], ['dogs', 'Dogs', 'star', 'Dogs'], ['wording', 'Wording', 'pages', 'Words'],
  ['formats', 'Formats', 'cal', 'Formats'], ['kennelos', 'From KennelOS', 'link', 'KennelOS'], ['timing', 'Timing', 'clock', 'Timing'],
  ['instructions', 'Her instructions', 'book', 'Help'],
];

// The admin nav: Every site, then this site's screens (bottom on a phone, down the
// side on a computer, as the breeder's tabs are).
export function adminNav(site, cur) {
  const items = site ? SCREENS.map(([k, l, i, short]) => [k, l, i, short]) : [];
  const link = (href, label, icon, on, short = label) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${svg(icon)}<span class="lg">${esc(label)}</span><span class="sm">${esc(short)}</span></a>`;
  return `<nav class="apptabs adm" aria-label="Site builder">${link('/admin', 'Every site', 'globe', !site && cur !== 'wording', 'Sites')}${site ? '' : link('/admin/wording', 'Site Manager wording', 'book', cur === 'wording', 'Wording')}
    ${site ? `<span class="lbl">Building</span><span class="site">${esc(site.kennel_name || site.subdomain)}<small>${isDemo(site) ? '<span class="spill brass">Demo</span> ' : ''}${esc(startingTemplate(site))}</small></span>` : ''}
    ${items.map(([k, l, i, short]) => link(`/admin/${esc(site.subdomain)}/${k}`, l, i, cur === k, short)).join('')}</nav>`;
}

// ---------- Every site ----------

async function everySite(env) {
  const { results: sites } = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, s.portal_on, s.demo_step, b.build FROM sites s
    LEFT JOIN site_builds b ON b.site_id = s.id WHERE s.status != 'closed' ORDER BY s.demo_step IS NOT NULL, s.kennel_name, s.subdomain`).all();
  const tile = (s) => {
    let build = {};
    try { build = s.build ? JSON.parse(s.build) : {}; } catch { /* the defaults */ }
    const n = changedCount(build);
    const changed = n.rules + n.timing + pagesChanged(build);
    return `<a class="tile s2${s.portal_on ? ' green' : ''}" href="/admin/${esc(s.subdomain)}/pages">
      <span class="eyebrow">${esc(startingTemplate(s))}</span>${isDemo(s) ? '<span class="spill brass">Demo</span>' : ''}<h2>${esc(s.kennel_name || s.subdomain)}</h2><span class="meta">${isDemo(s) ? `Made from the linked sample · step ${esc(s.demo_step)} of ${DEMO_STEPS} · only in your admin view` : `${esc(s.subdomain)}.kennelport.com · ${esc({ draft: 'Not published yet', live: 'Live', suspended: 'Switched off' }[s.status] ?? s.status)}`}</span>
      <span class="meta">${changed ? `${changed} setting${changed === 1 ? '' : 's'} changed from today's behaviour` : 'Today\'s behaviour, unchanged'}</span></a>`;
  };
  return `<span class="eyebrow">Admin</span><h1>Every site</h1><p class="muted">Signed in as admin: every breeder's site is here, with no invites or codes.</p>
    <div class="bento builder">${sites.map(tile).join('')}
      <div class="tile band s2"><span class="ico">${svg('layers')}</span><h2>Templates</h2><span class="meta">Coming with the next steps: pages and the menu, then templates.</span></div></div>`;
}

// ---------- the preview: their Puppies page, with the saved rules ----------

const SPILL = { avail: 'green', res: 'brass' };
const sexMark = (sex) => `<span class="sex ${sex === 'female' ? 'girl' : 'boy'}" aria-label="${sex === 'female' ? 'Girl' : 'Boy'}">${sex === 'female' ? '♀' : '♂'}</span>`;

const phone = (site, snap, path, cap, blocks) => `<span class="cap">${esc(cap)}</span>
    <div class="phone"><div class="pv-url">${esc(whereIs(site, path))}</div><div class="scr">
      <div class="pv-top"><div class="nm">${esc(snap.site.kennel_name)}</div></div>
      ${blocks.join('') || '<div class="pvb ghost">Nothing to show yet</div>'}
      <div class="pv-foot"><b>${esc(snap.site.kennel_name)}</b><span>${esc(word(snap, 'copyright', { year: new Date().getUTCFullYear(), kennel: snap.site.kennel_name }))}</span><span>Made with KennelPort</span></div></div></div>`;
// The demo has no preview link (it can't be shared): its whole site opens here, in the admin view.
const previewLink = async (env, site) => (isDemo(site)
  ? `<a class="small" href="/admin/${esc(site.subdomain)}/site/">The whole demo site, in your admin view ›</a>`
  : `<a class="small" href="${esc(siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(await makePreviewToken(env, site.id, 1))}`))}" target="_blank" rel="noopener">Their whole site, as a preview ›</a>`);

// ---------- the whole site, in the admin view ----------

// The draft rendered as the site renders it, on this host, under /admin/<sub>/site:
// its own links, forms and photos are moved under that address (the template's
// files under /_kp/ stay where they are, the same on every host). Never cached,
// never indexed, framed by nobody, and only for admin. Forms don't send from here.
async function siteView(env, site, rest, url) {
  const prefix = `/admin/${site.subdomain}/site`;
  const snap = await buildSnapshot(env, site.id);
  const path = rest || '/';
  if (path.startsWith('/_kp/p/')) return servePhoto(env, site, snap, new URL(`${path}${url.search}`, url.origin), { preview: true });
  const ctx = {
    path, origin: `${url.origin}${prefix}`, today: new Date().toISOString().slice(0, 10), preview: true, portal: Boolean(site.portal_on),
    adminBar: {
      text: isDemo(site) ? `Demo: made from the linked sample, step ${site.demo_step} of ${DEMO_STEPS}. Only you see it, in your admin view.`
        : 'Admin view: the draft, not what visitors see. Only you see it here.',
      back: `/admin/${site.subdomain}/rules`,
    },
  };
  const { status, html } = renderPage(snap, ctx);
  const moved = html
    .replace(/\b(href|action|src)="\/(?!\/)(?!admin\/)(?!_kp\/(?!p\/))/g, `$1="${prefix}/`)
    .replace(/\bsrcset="([^"]*)"/g, (m, v) => `srcset="${v.replace(/(^|,\s*)\/_kp\/p\//g, `$1${prefix}/_kp/p/`)}"`);
  return new Response(moved, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': SITE_CSP, 'x-robots-tag': 'noindex',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY',
    },
  });
}

// Their Dogs page: its sections in its words, a small card per dog.
async function dogsPreview(env, site) {
  const snap = await buildSnapshot(env, site.id);
  useFormats(snap);
  const g = dogGroups(snap);
  const card = (d, sale = false) => {
    const rule = rulesOf(snap).dogs?.sale_price ?? 'site';
    const price = !sale ? '' : rule === 'never' ? '' : rule === 'always' || snap.site.show_other_prices ? (d.price != null ? sitePrice(snap, d.price, d.price) : '') : pricesOff(snap);
    return `<div class="pvc"><span class="ph"></span><div class="t"><b>${esc(d.call_name)} ${sexMark(d.sex)}</b>${d.titles ? `<span class="muted">${esc(d.titles)}</span>` : ''}${price ? `<span class="price">${esc(price)}</span>` : ''}${sale ? `<span class="lnk">${esc(word(snap, 'ask_dog', { name: d.call_name }))} ›</span>` : ''}</div></div>`;
  };
  const block = (eyebrow, heading, lede, cards, cls = '') => (cards.length ? `<div class="pvb${cls}">${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}<h3>${esc(heading)}</h3>${lede ? `<p class="small muted">${esc(lede)}</p>` : ''}<div class="pvg">${cards.join('')}</div></div>` : '');
  const both = g.breeding.some((d) => d.sex === 'female') && g.breeding.some((d) => d.sex === 'male');
  const p = snap.pages.dogs;
  const blocks = [
    g.breeding.length ? `<div class="pvb">${both ? `<div class="pv-chips"><span class="on">${esc(word(snap, 'dogs_all'))}</span><span>${esc(word(snap, 'girls'))}</span><span>${esc(word(snap, 'boys'))}</span></div>` : ''}<div class="pvg">${g.breeding.map((d) => card(d)).join('')}</div><p class="small muted">${esc(word(snap, 'flip_hint'))}</p></div>` : '',
    block(word(snap, 'upcoming_eyebrow'), word(snap, 'upcoming_heading'), word(snap, 'upcoming_lede'), g.upcoming.map((d) => card(d)), ' sand'),
    block(word(snap, 'for_sale_eyebrow'), word(snap, 'for_sale_heading'), word(snap, 'for_sale_lede'), g.for_sale.map((d) => card(d, true)), ' sand'),
    block(word(snap, 'co_owned_eyebrow'), p.co_owned_heading || word(snap, 'co_owned_heading'), p.co_owned_lede || word(snap, 'co_owned_lede'), g.away.map((d) => card(d))),
  ].filter(Boolean);
  return `<div class="pvwrap" id="preview">${phone(site, snap, '/dogs', 'Their Dogs page, with these rules', blocks)}${await previewLink(env, site)}</div>`;
}

// Their litter cards, as the Home and Puppies pages draw them: eyebrows, dates,
// counts, prices and links, in the site's wording and formats.
async function littersPreview(env, site, cap) {
  const snap = await buildSnapshot(env, site.id);
  useFormats(snap);
  const ctx = { today: new Date().toISOString().slice(0, 10), path: '/litters', preview: true };
  const card = (l) => {
    const ahead = depositsAhead(snap, l, ctx.today);
    const older = olderPuppies(snap, ctx.today).some((o) => o.litter.id === l.id);
    const eyebrow = l.stage === 'planned' ? (l.plan_label || word(snap, 'litter_planned')) : l.stage === 'past' ? word(snap, 'litter_past')
      : ahead ? word(snap, 'litter_coming') : older ? word(snap, 'litter_older') : word(snap, 'litter_current');
    const rows = litterRows(snap, l, ctx).filter(([, v]) => v);
    return `<div class="pv-litter"><span class="eyebrow">${esc(eyebrow)}</span><b>${esc(l.name)}</b><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <span class="lnk">${esc(l.stage === 'planned' ? word(snap, 'see_waitlist') : word(snap, 'meet_puppies'))} ›</span></div>`;
  };
  const current = snap.litters.filter((l) => l.stage !== 'planned');
  const planned = snap.litters.filter((l) => l.stage === 'planned');
  const blocks = [
    current.length ? `<div class="pvb"><div class="stack">${current.map(card).join('')}</div></div>` : '',
    planned.length ? `<div class="pvb sand"><span class="eyebrow">${esc(word(snap, 'upcoming_band_eyebrow'))}</span><h3>${esc(word(snap, 'upcoming_band_heading'))}</h3><p class="small muted">${esc(word(snap, 'upcoming_band_lede'))}</p><div class="stack">${planned.map(card).join('')}</div></div>` : '',
  ].filter(Boolean);
  if (!blocks.length) blocks.push(`<div class="pvb"><p class="small muted">${esc(word(snap, 'no_litters'))}</p></div>`);
  return `<div class="pvwrap" id="preview">${phone(site, snap, '/litters', cap, blocks)}${await previewLink(env, site)}</div>`;
}

async function preview(env, site) {
  const snap = await buildSnapshot(env, site.id);
  useFormats(snap);
  const ctx = { today: new Date().toISOString().slice(0, 10), path: '/litters', preview: true };
  const older = olderPuppies(snap, ctx.today);
  const olderIds = new Set(older.map((o) => o.litter.id));
  const card = (l, p) => {
    const r = statusRule(snap, p);
    const words = puppyStatus(snap, l, p, ctx.today);
    const reg = regText(snap, p);
    const price = puppyPriceText(snap, l, p);
    const full = fullRegHref(snap, l, p, ctx);
    return `<div class="pvc"><span class="ph"></span><div class="t"><b>${esc(p.name)} ${sexMark(p.sex)}</b>${words ? `<span class="spill ${SPILL[r.pill] ?? 'plain'}">${esc(words)}</span>` : ''}${reg ? `<span class="muted">${esc(reg)}</span>` : ''}${price ? `<span class="price">${esc(price)}</span>` : ''}${r.ask ? `<span class="lnk">${esc(word(snap, 'ask_puppy'))} ›</span>` : ''}${full ? `<span class="lnk">${esc(rulesOf(snap).reg.ask)} ›</span>` : ''}</div></div>`;
  };
  const block = (eyebrow, heading, cards, cls = '') => `<div class="pvb${cls}"><span class="eyebrow">${esc(eyebrow)}</span><h3>${esc(heading)}</h3>${cards.length ? `<div class="pvg">${cards.join('')}</div>` : '<p class="small muted">No puppies to show.</p>'}</div>`;
  const blocks = [];
  for (const l of snap.litters.filter((x) => x.stage === 'current' && !depositsAhead(snap, x, ctx.today) && !olderIds.has(x.id) && x.puppies.length)) {
    blocks.push(block('Current litter', l.name, sortPuppies(snap, l.puppies).map((p) => card(l, p))));
  }
  if (older.length) blocks.push(block('Ready now', 'Older puppies', older.map(({ litter, puppy }) => card(litter, puppy)), ' sand'));
  for (const l of snap.litters.filter((x) => depositsAhead(snap, x, ctx.today) && x.puppies.length)) {
    blocks.push(block('Coming up', l.name, sortPuppies(snap, l.puppies).map((p) => card(l, p))));
  }
  const planned = snap.litters.filter((x) => x.stage === 'planned').length;
  if (planned) blocks.push(`<div class="pvb ghost">And ${planned} upcoming litter${planned === 1 ? '' : 's'} with no puppies yet</div>`);
  const hidden = await env.DB.prepare("SELECT COUNT(*) AS n FROM puppies WHERE site_id = ? AND hidden_by_kennelos = 0 AND status = 'hidden'").bind(site.id).first('n');
  if (hidden && !rulesOf(snap).status.hidden.show) blocks.push(`<div class="pvb ghost">${hidden} pup${hidden === 1 ? '' : 's'} on a health hold, not shown</div>`);
  return `<div class="pvwrap" id="preview"><span class="cap">Their Puppies page, with these rules</span>
    <div class="phone"><div class="pv-url">${esc(whereIs(site, '/litters'))}</div><div class="scr">
      <div class="pv-top"><div class="nm">${esc(snap.site.kennel_name)}</div></div>
      ${blocks.join('') || '<div class="pvb ghost">No litters with puppies yet</div>'}
      <div class="pv-foot"><b>${esc(snap.site.kennel_name)}</b><span>Made with KennelPort</span></div></div></div>
    ${await previewLink(env, site)}</div>`;
}

// ---------- Display rules ----------

const field = (name, value, { label, hint = '', cls = 'half', ph = '' } = {}) => `<label class="${cls}">${esc(label)}<input type="text" name="${name}" value="${esc(value)}"${ph ? ` placeholder="${esc(ph)}"` : ''}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label>`;
const select = (name, value, opts, label, cls = 'half') => `<label class="${cls}">${esc(label)}<select name="${name}">${Object.entries(opts).map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
const toggle = (name, on, label) => `<label class="check"><input type="checkbox" name="${name}"${on ? ' checked' : ''}>${esc(label)}</label>`;
const seg = (name, cur, opts) => `<div class="seg sm" role="radiogroup">${Object.entries(opts).map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${cur === v ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
const back = (key) => `<button class="link small" name="default" value="${esc(key)}">Back to default</button>`;

function rulesScreen(site, rules, error) {
  const D = DEFAULT_RULES;
  const card = (k) => {
    const r = rules.status[k];
    const name = (f) => `status.${k}.${f}`;
    return `<section class="card status-card"><div class="between"><span class="stcode"><span class="code">${k}</span>${r.show && r.words ? `<span class="spill ${SPILL[r.pill]}">${esc(r.words)}</span>` : '<span class="small muted">Not shown</span>'}</span>${same(r, D.status[k]) ? '' : back(`status.${k}`)}</div>
      <p class="small muted">${esc(STATUS_NOTES[k])}</p>
      <div class="fgrid">${field(name('words'), r.words, { label: 'Shows as', ph: 'Words on the card' })}${select(name('pill'), r.pill, PILLS, 'Pill')}</div>
      <div class="switches">${toggle(name('show'), r.show, 'Show the pup on the site')}${toggle(name('price'), r.price, 'Show its price')}${toggle(name('ask'), r.ask, '“Ask about this puppy”')}
        ${toggle(name('fullreg'), r.fullreg, `“${rules.reg.ask}” (no registration set)`)}${toggle(name('older'), r.older, 'Can be an older puppy')}${toggle(name('ribbon'), r.ribbon, 'Ribbon across its photo')}</div>
      <label>Order on the litter page<span class="hint">Lower comes first; equal keeps the breeder's order.</span><select name="${name('order')}">${Object.entries({ 1: 'First', 2: 'Second', 3: 'Third', 4: 'Last' }).map(([v, l]) => `<option value="${v}"${String(v) === String(r.order) ? ' selected' : ''}>${l}</option>`).join('')}</select></label></section>`;
  };
  const changed = (part) => (same(rules[part], D[part]) ? '' : back(part));
  return `<div class="stack">
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
      <div class="fgroup"><h2>Pup statuses from KennelOS</h2></div>
      <div class="twocol">${PUP_STATUSES.map(card).join('')}</div>
      <section class="card"><div class="fgroup"><div class="between"><h2>Registration</h2>${changed('reg')}</div><div class="fgrid">
        ${field('reg.unset', rules.reg.unset, { label: 'No registration set reads', ph: 'Leave empty to say nothing' })}
        ${field('reg.limited', rules.reg.limited, { label: 'Limited reads' })}
        ${field('reg.full', rules.reg.full, { label: 'Full reads' })}
        ${field('reg.ask', rules.reg.ask, { label: 'The full-registration link' })}</div></div>
      <div class="fgroup"><div class="between"><h2>Prices</h2>${changed('price')}</div><div class="fgrid">
        ${field('price.off', rules.price.off, { label: 'When prices are off', cls: '' })}
        <div class="fld"><span class="fldt">A price range reads</span>${seg('price.style', rules.price.style, { range: '$2,800–$3,200', from: 'From $2,800' })}</div>
        ${field('price.price_label', rules.price.price_label, { label: 'Price label' })}
        ${field('price.deposit_label', rules.price.deposit_label, { label: 'Deposit label' })}
        ${field('price.before', rules.price.before, { label: 'Before deposits open', hint: '{date} is the day deposits open.', cls: '' })}</div></div></section>
    </div>`;
}

// ---------- Timing ----------

const TIMING_ROWS = [
  ['litter_days', 'A litter off the site is deleted after', 'Unless the breeder taps Keep', 'days'],
  ['older_after', 'An available pup becomes an older puppy', 'Counted from its going-home date', 'days after'],
  ['deposits_after', '“Available on {date}” becomes “Available”', 'Counted from the litter’s deposits date', 'days after'],
];

function timingScreen(site, timing, error) {
  const row = ([k, lab, sub, unit]) => `<div class="inl"><label class="lab" for="t-${k}">${esc(lab)}<small>${esc(sub)}</small></label><input type="number" inputmode="numeric" min="0" name="timing.${k}" id="t-${k}" value="${esc(timing[k])}">
    <span class="dfl">${esc(unit)} · default ${esc(DEFAULT_TIMING[k])}${timing[k] !== DEFAULT_TIMING[k] ? ` <span class="chg">changed</span> ${back(`timing.${k}`)}` : ''}</span></div>`;
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <div class="twocol"><section class="card"><div class="fgroup"><h2>Website</h2>${TIMING_ROWS.map(row).join('')}</div></section>
    ${site.portal_on ? '<section class="card band"><div class="fgroup"><h2>Family portal</h2><p class="small">Its timing (the vet reminders, stays, invites and the rest) comes with the portal\'s build, step 4.</p></div></section>' : ''}</div></div>`;
}

// ---------- Dogs, Wording: the site's fixed lines ----------

const area = (name, value, label) => `<label>${esc(label)}<textarea name="${name}" rows="3">${esc(value)}</textarea></label>`;

// One card per group of lines, each line a field, with Back to default for the group.
function wordCards(screen, rules) {
  return wordsOn(screen).map(([, title, rows]) => {
    const changed = rows.filter(([k]) => rules.words[k] !== DEFAULT_RULES.words[k]).map(([k]) => `words.${k}`);
    return `<section class="card"><div class="fgroup"><div class="between"><h2>${esc(title)}</h2>${changed.length ? back(changed.join(',')) : ''}</div><div class="fgrid">
      ${rows.map(([k, , what]) => (k === 'safe_notice' ? area(`words.${k}`, rules.words[k], what) : field(`words.${k}`, rules.words[k], { label: what, cls: rules.words[k].length > 34 ? '' : 'half' }))).join('')}</div></div></section>`;
  }).join('');
}

function dogsScreen(site, rules, error) {
  const sale = rules.dogs.sale_price;
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <section class="card"><div class="fgroup"><div class="between"><h2>An adult looking for a home</h2>${sale === DEFAULT_RULES.dogs.sale_price ? '' : back('dogs.sale_price')}</div>
      <div class="fld"><span class="fldt">Its price</span>${seg('dogs.sale_price', sale, { site: 'As the breeder sets', always: 'Always', never: 'Never' })}
      <span class="hint">“As the breeder sets” follows her “Show prices of extras and adults”. Never shows no price line at all.</span></div></div></section>
    ${wordCards('dogs', rules)}
    <section class="card band"><p class="small">Which health results a new dog shows, and where each KennelOS status puts a dog, are under From KennelOS.</p></section></div>`;
}

function wordingScreen(site, rules, error) {
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}${wordCards('wording', rules)}</div>`;
}

// ---------- Formats ----------

function formatsScreen(site, rules, error) {
  const f = rules.format;
  const changed = Object.keys(f).some((k) => f[k] !== DEFAULT_RULES.format[k]);
  const sample = `${f.currency_after ? '' : f.currency}2,800${f.cents ? '.00' : ''}${f.currency_after ? ` ${f.currency}` : ''}`;
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <section class="card"><div class="fgroup"><div class="between"><h2>Dates</h2>${changed ? back('format') : ''}</div>
      <div class="fld"><span class="fldt">A full date</span>${seg('format.date', f.date, DATE_STYLES)}<span class="hint">Born, going home, deposits from.</span></div>
      <div class="fld"><span class="fldt">A day this year</span>${seg('format.day', f.day, DAY_STYLES)}<span class="hint">“Available on December 12”.</span></div></div>
    <div class="fgroup"><h2>Girls and boys</h2>
      <div class="fld"><span class="fldt">A dog's or pup's sex</span>${seg('format.sex', f.sex, SEX_STYLES)}</div>
      <div class="fld"><span class="fldt">A litter's count</span>${seg('format.counts', f.counts, COUNT_STYLES)}</div></div>
    <div class="fgroup"><h2>Money</h2><div class="fgrid">
      ${field('format.currency', f.currency, { label: 'Currency sign' })}<div class="half fld"><span class="fldt">Reads</span><span class="code big">${esc(sample)}</span></div></div>
      <div class="switches">${toggle('format.currency_after', f.currency_after, 'The sign goes after the number')}${toggle('format.cents', f.cents, 'Show cents')}</div></div></section></div>`;
}

// ---------- From KennelOS: how its data lands ----------

function kennelosScreen(site, rules, error) {
  const L = rules.landing;
  const D = DEFAULT_RULES.landing;
  const backFor = (keys) => (keys.some((k) => L[k] !== D[k]) ? back(keys.map((k) => `landing.${k}`).join(',')) : '');
  const nameKeys = ['name_pair', 'name_dam', 'name_heat', 'name_none', 'name_upcoming'];
  const dogKeys = KOS_DOG_STATUSES.map((k) => `dog_${k}`);
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <p class="small muted">For each new record an Update website brings. Once it's on the site, its switches are the breeder's.</p>
    <div class="twocol">
    <section class="card"><div class="fgroup"><div class="between"><h2>Each new dog</h2>${backFor(['health_display'])}</div>
      ${select('landing.health_display', L.health_display, { normal_only: 'Normal results only', all: 'All results', none: 'None' }, 'Health results shown', '')}</div></section>
    <section class="card"><div class="fgroup"><div class="between"><h2>Each new litter</h2>${backFor(['show_placed', 'show_prices'])}</div>
      <div class="switches">${toggle('landing.show_placed', L.show_placed, 'Show placed puppies')}</div>
      ${select('landing.show_prices', L.show_prices, { kos_prices: 'On, with Use my KennelOS prices', off: 'Off: the breeder switches them on' }, 'Show prices', '')}</div></section>
    </div>
    <section class="card"><div class="fgroup"><div class="between"><h2>Where each KennelOS dog status goes</h2>${backFor(dogKeys)}</div>
      <ul class="list">${KOS_DOG_STATUSES.map((k) => `<li><span class="grow"><span class="code">${k}</span></span><select name="landing.dog_${k}" aria-label="${esc(k)}" class="place">${Object.keys(DOG_PLACES).map((v) => `<option value="${v}"${L[`dog_${k}`] === v ? ' selected' : ''}>${esc(DOG_PLACE_WORDS[v])}</option>`).join('')}</select></li>`).join('')}</ul></div></section>
    <section class="card"><div class="fgroup"><div class="between"><h2>A litter's name, when KennelOS sends none</h2>${backFor(nameKeys)}</div><div class="fgrid">
      ${field('landing.name_pair', L.name_pair, { label: 'Dam and sire known', hint: '{dam} and {sire} are their names.' })}${field('landing.name_dam', L.name_dam, { label: 'Only the dam' })}
      ${field('landing.name_heat', L.name_heat, { label: 'A heat' })}${field('landing.name_none', L.name_none, { label: 'A heat with no dam named' })}
      ${field('landing.name_upcoming', L.name_upcoming, { label: 'No parents named' })}</div></div>
    <div class="fgroup"><div class="between"><h2>Planned-litter labels</h2>${backFor(['label_heat', 'label_pairing'])}</div><div class="fgrid">
      ${field('landing.label_heat', L.label_heat, { label: 'From a heat' })}${field('landing.label_pairing', L.label_pairing, { label: 'From a pairing' })}</div></div>
    <div class="fgroup"><div class="between"><h2>New dogs and litters go</h2>${backFor(['new_at'])}</div>${seg('landing.new_at', L.new_at, { end: 'At the end of her order', start: 'First' })}</div></section></div>`;
}

// What each new record would get, with these settings: the panel beside From KennelOS.
function landingPreview(rules) {
  const L = rules.landing;
  const fill = (t, dam, sire) => t.replace('{dam}', dam).replace('{sire}', sire);
  const rows = [
    ['A pairing of Juniper* and Atlas*', fill(L.name_pair, 'Juniper*', 'Atlas*'), L.label_pairing],
    ['A heat of Maple*', fill(L.name_heat, 'Maple*', ''), L.label_heat],
    ['A heat, no dam named', L.name_none, L.label_heat],
    ['A litter, only the dam named', fill(L.name_dam, 'Wren*', ''), null],
  ];
  return `<div class="pvwrap" id="preview"><span class="cap">The next Update website, with these settings</span>
    <section class="card landing"><ul class="hl">${rows.map(([what, name, lbl]) => `<li><div><span class="badge">${svg('heart')}</span><span><span class="small muted">${esc(what)}</span><b>${esc(name)}</b>${lbl ? `<span class="spill brass">${esc(lbl)}</span>` : ''}</span></div></li>`).join('')}</ul>
    <ul class="hl">${KOS_DOG_STATUSES.map((k) => `<li><div><span class="badge">${svg('star')}</span><span><span class="small muted">A <span class="code">${k}</span> dog</span><b>${esc(DOG_PLACE_WORDS[L[`dog_${k}`]])}</b></span></div></li>`).join('')}</ul></section></div>`;
}

// ---------- Pages: the list, and each page's blocks (step 2) ----------

const isData = (b) => BLOCK_TYPES[b.type].kind === 'data';
const ownWords = (key, b) => isData(b) && !hersOn(key, b);
const mvBtns = (act, i, n) => `<div class="mv"><button name="act" value="${esc(act)}:up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>${svg('up1')}</button><button name="act" value="${esc(act)}:down" aria-label="Move down"${i === n - 1 ? ' disabled' : ''}>${svg('down1')}</button></div>`;
const chips = (name, cur, opts) => `<div class="chips">${Object.entries(opts).map(([v, l]) => `<label><input type="checkbox" name="${name}" value="${esc(v)}"${cur.includes(v) ? ' checked' : ''}>${esc(l)}</label>`).join('')}</div>`;
const fld = (title, inner, hint = '') => `<div class="fld"><span class="fldt">${esc(title)}</span>${inner}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
const LIMITS = { all: 'All of them', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), String(i + 1)])) };
const resultLine = (names, what) => (names.length
  ? `<p class="result">Shows <b>${names.length} ${what}${names.length === 1 ? '' : 's'}</b>: ${names.map(esc).join(', ')}</p>`
  : '<p class="result none"><b>Nothing matches</b>, so this block hides itself on the site.</p>');

// A page's name and address as the breeder's site has them (Home is not in PAGES).
const pageLabel = (snap, key) => (key === 'home' ? 'Home' : label(snap, key));
const pagePath = (snap, key) => (key === 'home' ? '/' : PAGES[key]?.path ?? customPage(snap, key)?.path ?? '');
const headOf = (snap, key) => headFor(key, customPage(snap, key));
// Where she words a page: her Site Manager, Pages and wording.
const hersAt = (snap, key) => `her Site Manager, under Pages and wording, ${pageLabel(snap, key)}`;
// Her products with a badge on this page (Home's are her Home badges).
const badgesOn = (snap, key) => (snap.products ?? []).filter((x) => (key === 'home' ? x.home_badge : (x.badge_places ?? []).includes(key))).slice(0, 2);

// The records a data block shows now, from the draft.
function blockRecords(snap, b) {
  const lim = (rows) => (b.limit ? rows.slice(0, b.limit) : rows);
  if (b.type === 'dogs') return lim(dogsFor(snap, b)).map((d) => d.call_name);
  if (b.type === 'litters') return lim(snap.litters.filter((l) => b.f.stage.includes(l.stage))).map((l) => l.name);
  if (b.type === 'reviews') return lim(snap.reviews).map((r) => [r.first_name, r.town].filter(Boolean).join(', ') || 'A family');
  return [];
}
const WHAT = { dogs: 'dog', litters: 'litter', reviews: 'review' };

function blockSummary(snap, key, b) {
  if (b.type === 'dogs') {
    const bits = [SEXES[b.f.sex] === 'Any' ? 'Girls and boys' : SEXES[b.f.sex], b.f.status.map((x) => DOG_STATUS[x]).join(', ')];
    for (const [k, l] of DOG_FLAGS) if (b.f[k] === 'only') bits.push(`only ${l.toLowerCase()}`); else if (b.f[k] === 'any') bits.push(`with ${l.toLowerCase()}`);
    return `${bits.join(' · ')} · ${DOG_STYLE[b.style].toLowerCase()}${b.limit ? ` · ${b.limit} at most` : ''} · ${blockRecords(snap, b).length} now`;
  }
  if (b.type === 'litters') return `${b.f.stage.map((x) => STAGES[x]).join(', ')}${b.limit ? ` · ${b.limit} at most` : ''} · ${blockRecords(snap, b).length} now`;
  if (b.type === 'reviews') return `${REVIEW_STYLE[b.style]}${b.limit ? ` · ${b.limit} at most` : ''} · ${blockRecords(snap, b).length} now`;
  if (b.type === 'builtin') return blockHint(key, b) ?? '';
  const faqs = placedFaqs(snap, key).map((e) => e.heading).join(' · ');
  const badges = badgesOn(snap, key).map((x) => x.name).join(' · ');
  if (b.type === 'faq') return faqs || 'No questions placed here yet';
  if (b.type === 'badges') return badges || 'No badges placed here yet';
  if (b.type === 'embeds') return `Her videos and posts on ${pageLabel(snap, key)}`;
  if (b.type === 'head') {
    const p = snap.pages[key] ?? {};
    return [p.eyebrow ?? headOf(snap, key).eyebrow, p.heading || headOf(snap, key).heading].filter(Boolean).join(' · ');
  }
  const h = snap.home;
  const said = { hero: h.hero.headline || snap.site.kennel_name, facts: (h.facts.items ?? []).map(([v, l]) => `${v} ${l}`).join(' · '), text: h.story.heading,
    band: h.waitlist.heading || 'Hoping for a puppy of your own?' }[b.type];
  return said || { facts: 'No facts yet', text: 'No story yet' }[b.type] || '';
}

// One ordered list of a card's items: on ones in their order, then the rest; each
// with its switch, and up and down within the list.
function showList(b, face, items, title, hint = '') {
  const on = b.show[face];
  const order = [...on, ...Object.keys(items).filter((k) => !on.includes(k))];
  const n = `b.${b.id}.show.${face}`;
  return `<div class="fld"><span class="fldt">${esc(title)}</span>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<input type="hidden" name="${n}" value="${esc(order.join(','))}">
    <ul class="mvl">${order.map((k, i) => `<li class="mvr item${on.includes(k) ? '' : ' off'}">${mvBtns(`smv:${b.id}:${face}:${k}`, i, order.length)}<span class="ttl">${esc(items[k])}</span>
      <span class="end switches"><label class="check"><input type="checkbox" name="${n}.${k}"${on.includes(k) ? ' checked' : ''} aria-label="${esc(items[k])}"></label></span></li>`).join('')}</ul></div>`;
}
// On or off only (their order is fixed).
function showSwitches(b, face, items, title) {
  const on = b.show[face];
  const n = `b.${b.id}.show.${face}`;
  return `<div class="fld"><span class="fldt">${esc(title)}</span><input type="hidden" name="${n}" value="${esc(Object.keys(items).join(','))}"><div class="switches boxed">${Object.entries(items).map(([k, l]) => `<label class="check"><input type="checkbox" name="${n}.${k}"${on.includes(k) ? ' checked' : ''}>${esc(l)}</label>`).join('')}</div></div>`;
}

// Where the breeder's side of a content block is, in her words.
function hersLine(snap, key, b) {
  if (b.type === 'faq') return 'She picks the questions in her Site Manager: each FAQ question says where it shows.';
  if (b.type === 'badges') return key === 'home' ? 'She picks them in her Site Manager: a product can be a Home badge, two at most.' : 'She picks them in her Site Manager: each product says which pages show its badge, two at most.';
  if (b.type === 'builtin') return `What it shows is hers: her records, and her words in ${hersAt(snap, key)}.`;
  return `Its words and photos are hers: she sets them in ${hersAt(snap, key)}.`;
}

function blockSettings(snap, key, b) {
  const k = (f) => `b.${b.id}.${f}`;
  if (!isData(b)) {
    return `<div class="set"><p class="small">${esc(blockHint(key, b) ?? '')}</p>
      <p class="small muted">${esc(hersLine(snap, key, b))}</p>
      <div class="row"><button class="link small danger" name="act" value="remove:${esc(b.id)}">${svg('trash')} Remove this block</button></div></div>`;
  }
  let data = '';
  let show = '';
  if (b.type === 'dogs') {
    data = `${fld('Sex', seg(k('f.sex'), b.f.sex, SEXES))}${fld('Status', chips(k('f.status'), b.f.status, DOG_STATUS))}
      <div class="fgrid">${DOG_FLAGS.map(([f, l]) => select(k(`f.${f}`), b.f[f], ANY3, l)).join('')}${select(k('order'), b.order, DOG_ORDER, 'Order')}</div>
      ${fld('Style', seg(k('style'), b.style, DOG_STYLE))}`;
    show = `<div class="twocol">${showList(b, 'front', DOG_ITEMS, 'Front of the card', 'The photo always fills the front when it is on.')}${showList(b, 'back', DOG_ITEMS, 'Back of the card')}</div>`;
  } else if (b.type === 'litters') {
    data = fld('Stage', chips(k('f.stage'), b.f.stage, STAGES));
    show = `${showList(b, 'items', LITTER_ITEMS, 'Top to bottom')}<div class="twocol">${showSwitches(b, 'pair', LITTER_PAIR, 'The pair')}${showSwitches(b, 'rows', LITTER_ROWS, 'Facts')}</div>
      <div class="fgrid">${select(k('show.names'), b.show.names, Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), i ? `Up to ${i}, then count them` : 'Count them only'])), 'Puppies: names', '')}</div>`;
  } else if (b.type === 'reviews') {
    data = fld('Style', seg(k('style'), b.style, REVIEW_STYLE));
    show = `${showList(b, 'items', REVIEW_ITEMS, 'Top to bottom')}${showSwitches(b, 'who', REVIEW_WHO, 'Who it is from')}`;
  }
  const words = ownWords(key, b)
    ? `<div class="fgroup"><h2>Starting wording</h2><p class="small muted">The breeder can reword it, and switch the block off, in ${esc(hersAt(snap, key))}.</p><div class="fgrid">
      ${field(k('w.eyebrow'), b.w.eyebrow ?? '', { label: 'Eyebrow' })}${field(k('w.heading'), b.w.heading ?? '', { label: 'Heading' })}${field(k('w.lede'), b.w.lede ?? '', { label: 'Line under it', cls: '' })}</div></div>`
    : '<p class="small muted">Its words are hers: she words this block in her Site Manager, under Pages and wording, Home.</p>';
  return `<div class="set"><input type="hidden" name="${k('present')}" value="1">
    <div class="fgroup"><h2>Which ${WHAT[b.type]}s <span class="kos-tag">${svg('link')}${b.type === 'reviews' ? 'Her records' : 'KennelOS'}</span></h2>${data}
      <div class="fgrid">${select(k('limit'), b.limit ?? 'all', LIMITS, 'How many')}</div>${resultLine(blockRecords(snap, b), WHAT[b.type])}</div>
    <div class="fgroup"><h2>What its cards show</h2>${show}</div>
    ${words}
    <div class="row"><button class="link small danger" name="act" value="remove:${esc(b.id)}">${svg('trash')} Remove this block</button></div></div>`;
}

function blockRow(snap, key, b, i, n, open) {
  const T = BLOCK_TYPES[b.type];
  const off = hersOn(key, b) ? !snap.home[b.id]?.enabled : !addedOn(snap, key, b);
  const isOpen = open === b.id;
  return `<li class="mvr${isData(b) ? ' data' : ''}${b.type === 'builtin' ? ' fixed' : ''}${off ? ' off' : ''}" id="b-${esc(b.id)}">${mvBtns(`mv:${b.id}`, i, n)}<span class="ico">${svg(T.ic)}</span>
    <span class="ttl">${esc(blockName(key, b))}${isData(b) ? ` <span class="kos-tag">${b.type === 'reviews' ? 'Records' : 'KennelOS'}</span>` : ''}${b.type === 'builtin' ? ' <span class="kos-tag">Built-in</span>' : ''}${off ? ' <span class="chg">off by the breeder</span>' : ''}<small>${esc(blockSummary(snap, key, b))}</small></span>
    <span class="end"><button class="button small" name="act" value="${isOpen ? 'close' : `open:${esc(b.id)}`}" aria-expanded="${isOpen}">${isOpen ? 'Done' : 'Settings'}</button></span>
    ${isOpen ? blockSettings(snap, key, b) : ''}</li>`;
}

// The phone beside it: the page's blocks as the prototype sketches them, with her words.
function pagePreview(snap, key, blocks, site) {
  const h = snap.home;
  const ghost = (b, why) => `<div class="pvb ghost">${esc(blockName(key, b))}: ${why}</div>`;
  const headOf = (w, eb, hd) => `${(w.eyebrow ?? eb) ? `<span class="eyebrow">${esc(w.eyebrow ?? eb)}</span>` : ''}${(w.heading ?? hd) ? `<h3>${esc(w.heading || hd)}</h3>` : ''}`;
  const wordsOf = (b) => (hersOn(key, b) ? { ...h[b.id], heading: h[b.id]?.heading || undefined } : addedWords(snap, key, b));
  const out = [];
  for (const b of blocks) {
    if (hersOn(key, b) ? !h[b.id]?.enabled : !addedOn(snap, key, b)) { out.push(ghost(b, 'switched off by the breeder')); continue; }
    const names = blockRecords(snap, b);
    if (isData(b) && !names.length) { out.push(ghost(b, 'nothing matches, so it hides')); continue; }
    if (b.type === 'hero') out.push(`<div class="pv-hero"><span class="ph"></span><div>${h.hero.eyebrow ? `<span class="eyebrow">${esc(h.hero.eyebrow)}</span>` : ''}<h3>${esc(h.hero.headline || snap.site.kennel_name)}</h3>${h.hero.script ? `<span class="script">${esc(h.hero.script)}</span>` : ''}</div></div>`);
    else if (b.type === 'head') {
      const p = snap.pages[key] ?? {};
      const eb = p.eyebrow ?? headOf(snap, key).eyebrow;
      const lede = p.lede ?? headOf(snap, key).lede;
      out.push(`<div class="pvb sand">${eb ? `<span class="eyebrow">${esc(eb)}</span>` : ''}<h3>${esc(p.heading || headOf(snap, key).heading)}</h3>${lede ? `<p class="small muted">${esc(lede)}</p>` : ''}</div>`);
    }
    else if (b.type === 'builtin') out.push(`<div class="pvb"><div class="pv-row pv-built">${svg('lock')}<b>${esc(blockName(key, b))}</b></div></div>`);
    else if (b.type === 'facts') out.push(h.facts.items?.length ? `<div class="pvb"><div class="pv-facts">${h.facts.items.slice(0, 3).map(([v, l]) => `<div><b>${esc(v)}</b>${esc(l)}</div>`).join('')}</div></div>` : ghost(b, 'no facts yet, so it hides'));
    else if (b.type === 'badges') { const x = badgesOn(snap, key); out.push(x.length ? `<div class="pvb"><div class="pv-row">${x.map((y) => `<span class="pv-pill">${esc(y.name)}</span>`).join(' ')}</div></div>` : ghost(b, 'no badges placed here, so it hides')); }
    else if (b.type === 'faq') { const q = placedFaqs(snap, key); out.push(q.length ? `<div class="pvb">${q.map((e) => `<div class="pv-q">${esc(e.heading)}</div>`).join('')}</div>` : ghost(b, 'no questions placed here, so it hides')); }
    else if (b.type === 'text') out.push(h.story.heading || h.story.text ? `<div class="pvb sand">${headOf(h.story, null, h.story.heading)}<div class="pvg"><span class="ph"></span><div class="lines"><i></i><i></i><i></i></div></div></div>` : ghost(b, 'no story yet, so it hides'));
    else if (b.type === 'embeds') out.push(ghost(b, `shows the videos and posts she puts on ${pageLabel(snap, key)}`));
    else if (b.type === 'band') out.push(`<div class="pvb deep"><h3>${esc(h.waitlist.heading || 'Hoping for a puppy of your own?')}</h3><span class="pv-pill">${esc(h.waitlist.button_label || 'Join the waitlist')}</span></div>`);
    else if (b.type === 'dogs') out.push(`<div class="pvb">${headOf(wordsOf(b), 'Our dogs', 'Meet our dogs')}<div class="pvg${b.style === 'flip' ? '' : ' slide'}">${names.map((nm) => `<div class="pvc${b.style === 'light' ? ' light' : ' flip'}"><span class="ph"></span><div class="t"><b>${esc(nm)}</b></div></div>`).join('')}</div></div>`);
    else if (b.type === 'litters') out.push(`<div class="pvb sand">${headOf(wordsOf(b), 'Litters', 'Current and upcoming')}${names.map((nm) => `<div class="pv-row"><b>${esc(nm)}</b></div>`).join('')}</div>`);
    else if (b.type === 'reviews') out.push(`<div class="pvb">${headOf(wordsOf(b), 'Families', 'What our families say')}${snap.reviews.slice(0, 1).map((r) => `<div class="pv-row" style="display:block"><span class="stars">★★★★★</span><br>“${esc(r.quote.slice(0, 90))}${r.quote.length > 90 ? '…' : ''}”</div>`).join('')}</div>`);
  }
  return phone(site, snap, pagePath(snap, key), `Their ${key === 'home' ? 'Home' : pageLabel(snap, key)} page, as you build it`, out);
}

// The Pages list: every page the builder has, in today's menu order, then the pages
// she added, and Privacy, which stays fixed. ?new=1 opens New page.
// Waitlist is the menu's button, one link, so a page can't go under it (yet: the menu editor).
const GROUPS = { '': 'Not in the menu', ...Object.fromEntries(MENU_GROUPS.filter((g) => g.key !== 'waitlist').map((g) => [g.key, g.label])) };
function newPageCard(input = {}, error = null) {
  return `<section class="card" id="new-page"><div class="fgroup"><h2>New page</h2>${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
      <ol class="numsteps"><li><span class="num">1</span><div><div class="fgrid">
        ${field('page.name', input.name ?? '', { label: 'Name', ph: 'Our dams', hint: 'In the menu and as its heading. The breeder can rename both.' })}
        ${field('page.path', input.path ?? '', { label: 'Address', ph: '/our-dams', hint: 'Leave empty to make it from the name.' })}</div></div></li>
      <li><span class="num">2</span><div><div class="fgrid">${select('page.start', input.start ?? 'blank', STARTS, 'Start with')}${select('page.group', input.group ?? '', GROUPS, 'Put it in the menu under')}</div></div></li></ol>
      <div class="row"><button class="primary small" name="act" value="newpage">Make the page</button><a class="link small" href="?">Cancel</a></div></div></section>`;
}

async function pagesScreen(env, site, build, { adding = false, input = {}, error = null } = {}) {
  const snap = await buildSnapshot(env, site.id);
  useFormats(snap);
  const sub = esc(site.subdomain);
  const row = (path, name, href, note) => `<li>${href ? `<a class="rowlink grow" href="${href}">` : '<span class="grow">'}<b>${esc(name)}</b><br><span class="small muted"><span class="code">${esc(path)}</span> · ${note}</span>${href ? '</a><span class="go" aria-hidden="true">›</span>' : '</span>'}</li>`;
  const offNote = (k) => (k !== 'home' && snap.pages[k]?.enabled === false ? ' · <span class="chg">off by the breeder</span>' : '');
  const count = (k) => { const n = pageBlocks(build, k).length; return `${n} block${n === 1 ? '' : 's'}`; };
  const rows = BUILT_PAGES.map((k) => row(pagePath(snap, k), pageLabel(snap, k), `/admin/${sub}/pages/${k}`, `${count(k)}${pageChanged(build, k) ? ' · <span class="chg">changed</span>' : ' · as today'}${offNote(k)}`));
  const mine = customPages(build).map((c) => row(c.path, pageLabel(snap, c.id), `/admin/${sub}/pages/${c.id}`, `${count(c.id)} · <span class="spill brass">Added</span> · ${c.group ? `in ${esc(GROUPS[c.group])}` : 'not in the menu'}${offNote(c.id)}`));
  const fixed = row(PAGES.privacy.path, PAGES.privacy.label, null, 'written for her by KennelPort, fixed');
  return `<div class="build"><div class="stack">
    ${adding ? `<form method="post" class="stack">${newPageCard(input, error)}</form>` : ''}
    <section class="card"><div class="between"><h2>${rows.length + mine.length + 1} pages</h2>${adding ? '' : '<a class="button small primary" href="?new=1#new-page">' + svg('plus') + ' New page</a>'}</div><ul class="list pages">${rows.join('')}</ul>
      ${mine.length ? `<h2 class="mt">Pages you added</h2><ul class="list pages">${mine.join('')}</ul>` : ''}<ul class="list pages">${fixed}</ul></section>
    <section class="card band"><p class="small">A page you add is the breeder's to switch on or off, name in her menu and word, like any page. The menu editor, page addresses for the breeder, and FAQ and badge spots on your pages come next.</p></section>
  </div><div class="pvwrap" id="preview">${pagePreview(snap, 'home', pageBlocks(build, 'home'), site)}${await previewLink(env, site)}</div></div>`;
}

// What "The page" says about switching it off and its address. A page of hers
// has its name, address and menu group here, and can be removed.
const FIXED_PATHS = ['waitlist', 'waitlist_help'];
function pageCard(snap, key) {
  const c = customPage(snap, key);
  if (c) {
    return `<section class="card"><div class="fgroup"><h2>The page <span class="spill brass">Added</span></h2><input type="hidden" name="page.present" value="1"><div class="fgrid">
      ${field('page.name', c.name, { label: 'Starting name', hint: 'The breeder can rename it in her menu.' })}
      ${field('page.path', c.path, { label: 'Address', hint: 'Letters, numbers and hyphens. Renaming it for the breeder comes with the menu.' })}
      ${select('page.group', c.group ?? '', GROUPS, 'In the menu under')}</div>
      <div class="switches boxed"><label class="check"><input type="checkbox" disabled checked aria-describedby="page-on">The breeder can switch this page off</label></div>
      <p class="small muted" id="page-on">${esc(`She switches it off in ${hersAt(snap, key)}. It hides by itself while nothing on it has anything to show.`)}</p>
      <div class="row"><button class="link small danger" name="act" value="delpage">${svg('trash')} Remove this page</button></div></div></section>`;
  }
  const canHide = key !== 'home' && PAGES[key].canHide;
  const hideNote = key === 'home' ? 'Home is always on: she can switch its blocks off, not the page.'
    : canHide ? `She switches it off in ${hersAt(snap, key)}.` : `${pageLabel(snap, key)} is always on.`;
  const pathNote = key === 'home' ? "Fixed: it is the site's own address." : FIXED_PATHS.includes(key) ? 'Fixed: other systems link to it.' : 'Its address today. Renaming comes with the menu.';
  return `<section class="card"><div class="fgroup"><h2>The page</h2><div class="fgrid">
      <label class="half">Starting name<span class="hint">The breeder can rename it in her menu.</span><input type="text" value="${esc(key === 'home' ? 'Home' : PAGES[key].label)}" disabled></label>
      <label class="half">Address<span class="hint">${esc(pathNote)}</span><input type="text" value="${esc(pagePath(snap, key))}" disabled></label></div>
      <div class="switches boxed"><label class="check"><input type="checkbox" disabled${canHide ? ' checked' : ''} aria-describedby="page-on">The breeder can switch this page off</label></div>
      <p class="small muted" id="page-on">${esc(hideNote)}</p></div></section>`;
}

async function pageScreen(env, site, build, key, { open = null, error = null } = {}) {
  const snap = await buildSnapshot(env, site.id);
  useFormats(snap);
  const blocks = pageBlocks(build, key);
  const adds = addable(key, blocks);
  const changed = pageChanged(build, key);
  const group = (data, title) => {
    const rows = adds.filter((x) => (BLOCK_TYPES[x.type].kind === 'data') === data);
    return rows.length ? `<div class="fgroup"><h2>${title}</h2><ul class="list">${rows.map((x) => {
      const b = { type: x.type, id: x.id };
      const T = BLOCK_TYPES[x.type];
      return `<li><span class="ico">${svg(T.ic)}</span><span class="grow"><b>${esc(blockName(key, b))}</b>${blockHint(key, b) ? `<br><span class="small muted">${esc(blockHint(key, b))}</span>` : ''}</span><button class="button small" name="act" value="add:${x.type}${x.id ? `:${esc(x.id)}` : ''}">Add</button></li>`;
    }).join('')}</ul></div>` : '';
  };
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    ${pageCard(snap, key)}
    <section class="card"><div class="between"><h2>Blocks, top to bottom</h2>${adds.length ? `<button class="button small primary" name="act" value="${open === 'add' ? 'close' : 'adding'}" aria-expanded="${open === 'add'}">${svg('plus')} Add a block</button>` : ''}</div>
      ${open === 'add' ? `<div class="addblock"><p class="small muted">It goes at the bottom; move it up from there.</p>${group(true, 'From KennelOS and her records')}${group(false, key === 'home' ? 'Her words and photos' : 'This page\'s own')}</div>` : ''}
      <p class="small muted">You place and order them. The breeder can switch each one off and reword it, never move it.${changed || isCustom(key) ? '' : ` This is today's ${key === 'home' ? 'Home' : 'page'}.`}</p>
      <ul class="mvl">${blocks.map((b, i) => blockRow(snap, key, b, i, blocks.length, open)).join('')}</ul>
      ${changed ? `<div class="row"><button class="link small" name="act" value="default">Back to today's ${key === 'home' ? 'Home' : 'page'}</button></div>` : ''}
    </section></div>
    <div class="pvwrap" id="preview">${pagePreview(snap, key, blocks, site)}${await previewLink(env, site)}</div>`;
}

// A page's form: the open block's settings, then what was pressed.
function pageFromForm(build, key, form) {
  const get = (k) => form.get(k);
  let blocks = blocksFromForm(pageBlocks(build, key), get, (k) => form.getAll(k).map(String), key);
  const act = String(form.get('act') ?? '');
  const [verb, id, face, item, dir] = act.split(':');
  const present = blocks.find((b) => form.get(`b.${b.id}.present`) != null)?.id ?? null;
  let open = ['close', 'default'].includes(verb) || (verb === 'remove' && id === present) ? null : present;
  const at = blocks.findIndex((b) => b.id === id);
  if (verb === 'adding') open = 'add';
  if (verb === 'default') blocks = pageBlocks(null, key);
  else if (verb === 'mv' && at >= 0) blocks = moved(blocks, at, face);
  else if (verb === 'open' && at >= 0) open = id;
  else if (verb === 'remove' && at >= 0) blocks = blocks.filter((b) => b.id !== id);
  else if (verb === 'add' && id === 'builtin') {
    // A built-in she removed, back at the bottom.
    if (Object.hasOwn(PAGE_PARTS[key] ?? {}, face) && !blocks.some((b) => b.id === face)) blocks = [...blocks, { id: face, type: 'builtin' }];
  } else if (verb === 'add' && Object.hasOwn(BLOCK_TYPES, id)) {
    const taken = new Set(blocks.map((b) => b.id));
    const base = id === 'text' ? 'story' : id === 'band' ? 'waitlist' : id;
    let nid = BLOCK_TYPES[id].once && !taken.has(base) ? base : null;
    for (let n = 2; !nid; n++) if (!taken.has(`${id}-${n}`)) nid = `${id}-${n}`;
    const b = newBlock(id, nid);
    if (fits(key, b) && !(BLOCK_TYPES[id].once && blocks.some((x) => x.type === id))) {
      blocks = [...blocks, b];
      if (BLOCK_TYPES[id].kind === 'data') open = nid;
    }
  } else if (verb === 'smv' && at >= 0) {
    // Up or down within a card's list: the list as shown (on, then off).
    const b = structuredClone(blocks[at]);
    const shown = String(form.get(`b.${id}.show.${face}`) ?? '').split(',').filter(Boolean);
    const next = moved(shown, shown.indexOf(item), dir);
    b.show[face] = next.filter((x) => b.show[face].includes(x));
    blocks[at] = b;
    open = id;
  }
  return { build: withPage(build, key, blocks), open };
}

// ---------- routes ----------

export async function handleBuilder({ env, request, url, user, page }) {
  if (!user?.admin) return null;
  const path = url.pathname;
  if (path === '/admin' || path === '/admin/') return page('Every site', await everySite(env), { admin: { nav: adminNav(null, 'sites') } });
  const wm = path.match(/^\/admin\/wording(?:\/([a-z]+))?$/);
  if (wm) return wordingRoute({ env, request, url, page, site: null, screen: wm[1] ?? null });
  const sv = path.match(/^\/admin\/([a-z0-9-]+)\/site(\/.*)?$/);
  const m = sv ? [null, sv[1], 'site'] : path.match(/^\/admin\/([a-z0-9-]+)\/(pages|pages\/[a-z0-9_-]+|rules|dogs|wording|formats|kennelos|timing|instructions|instructions\/[a-z]+)$/);
  if (!m) return null;
  const site = await env.DB.prepare("SELECT id, subdomain, kennel_name, status, portal_on, demo_step FROM sites WHERE subdomain = ? AND status != 'closed'").bind(m[1]).first();
  if (!site) return null;
  if (sv) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Forms don\'t send from the admin view.', { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
    return siteView(env, site, sv[2] ?? '', url);
  }
  const screen = m[2];
  const build = await loadBuild(env, site.id);
  if (screen === 'instructions' || screen.startsWith('instructions/')) return wordingRoute({ env, request, url, page, site, build, screen: screen.split('/')[1] ?? null });
  if (screen === 'pages' || screen.startsWith('pages/')) return pagesRoute({ env, request, url, site, build, page, screen });
  let { rules, timing } = rulesFor(build);
  let error = null;
  if (request.method === 'POST') {
    const form = await request.formData();
    const get = (k) => form.get(k);
    // Back to default: "part" or "part.key", several comma-separated.
    const resets = String(form.get('default') ?? '').split(',').filter(Boolean);
    const toDefault = (next) => {
      for (const r of resets) {
        const [part, key] = r.split('.');
        if (!(part in DEFAULT_RULES)) continue;
        if (!key) next[part] = structuredClone(DEFAULT_RULES[part]);
        else if (key in DEFAULT_RULES[part]) next[part][key] = structuredClone(DEFAULT_RULES[part][key]);
      }
      return next;
    };
    try {
      if (screen === 'rules') {
        await saveBuild(env, site.id, withPart(build, 'rules', toDefault(rulesFromForm(get, rules))));
      } else if (screen !== 'timing') {
        await saveBuild(env, site.id, withPart(build, 'rules', toDefault(partsFromForm(screen, rules, get))));
      } else {
        const next = timingFromForm(get);
        for (const r of resets) {
          const key = r.replace(/^timing\./, '');
          if (key in DEFAULT_TIMING) next[key] = DEFAULT_TIMING[key];
        }
        await saveBuild(env, site.id, withPart(build, 'timing', next));
      }
      return redirect(`/admin/${site.subdomain}/${screen}?saved=1`);
    } catch (err) {
      if (!(err instanceof RuleError)) throw err;
      error = err.message;
    }
  }
  const saved = url.searchParams.get('saved') && !error;
  const title = SCREENS.find(([k]) => k === screen)[1];
  const lede = {
    rules: 'KennelOS\'s values arrive unchanged. These decide how this site shows its pups. Today\'s behaviour is the default.',
    dogs: 'How the Dogs page reads, and what an adult for sale shows. Today\'s behaviour is the default.',
    wording: 'The lines written into the site. The breeder words her own records and pages; these are the rest.',
    formats: 'How dates, girls and boys, and money read across the site.',
    kennelos: 'How what KennelOS sends lands on this site.',
    timing: null,
  }[screen];
  const editor = { rules: rulesScreen, dogs: dogsScreen, wording: wordingScreen, formats: formatsScreen, kennelos: kennelosScreen }[screen]?.(site, rules, error) ?? timingScreen(site, timing, error);
  const side = screen === 'dogs' ? await dogsPreview(env, site)
    : screen === 'wording' || screen === 'formats' ? await littersPreview(env, site, 'Their litter cards, with these rules')
      : screen === 'kennelos' ? landingPreview(rules) : screen === 'timing' ? '' : await preview(env, site);
  const body = `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>${isDemo(site) ? ' <span class="spill brass">Demo</span>' : ''}<h1>${title}</h1>
    ${lede ? `<p class="muted">${lede}</p>` : ''}
    ${saved ? '<p class="notice" role="status">Saved. The site shows it once the breeder (or you) publishes.</p>' : ''}
    <form method="post" id="build" class="build${side ? '' : ' solo'}"><button class="sr" tabindex="-1" aria-hidden="true">Save</button>${editor}${side}
      <div class="actionbar"><div class="in"><span class="ico">${ic('eye')}</span><p><b>Their website</b>Save, then the preview shows it. Publishing puts it live.</p>${side ? '<a class="button small seeit" href="#preview">See it</a>' : ''}<button class="primary small">Save</button></div></div></form>`;
  return page(`${title} · ${site.kennel_name || site.subdomain}`, body, { admin: { nav: adminNav(site, screen), site } });
}

async function pagesRoute({ env, request, url, site, build, page, screen }) {
  const sub = esc(site.subdomain);
  const name = esc(site.kennel_name || site.subdomain);
  const demo = isDemo(site) ? ' <span class="spill brass">Demo</span>' : '';
  const str = (form, k) => String(form.get(k) ?? '');
  if (screen === 'pages') {
    let error = null;
    let input = {};
    if (request.method === 'POST') {
      // New page: made, then opened.
      const form = await request.formData();
      input = { name: str(form, 'page.name'), path: str(form, 'page.path'), start: str(form, 'page.start'), group: str(form, 'page.group') };
      try {
        const out = addPage(build, input);
        await saveBuild(env, site.id, out.build);
        return redirect(`/admin/${site.subdomain}/pages/${out.id}?saved=made`);
      } catch (err) {
        if (!(err instanceof BlockError)) throw err;
        error = err.message;
      }
    }
    const adding = url.searchParams.has('new') || Boolean(error);
    const body = `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${name}</span>${demo}<h1>Pages</h1>
      <p class="muted">Each page is a list of blocks you place. With nothing changed, each is today's page.</p>${await pagesScreen(env, site, build, { adding, input, error })}`;
    return page(`Pages · ${site.kennel_name || site.subdomain}`, body, { admin: { nav: adminNav(site, 'pages'), site } });
  }
  const key = screen.slice('pages/'.length);
  if (!isBuilt(key, build)) return null;
  let error = null;
  let open = url.searchParams.get('open');
  if (request.method === 'POST') {
    const form = await request.formData();
    try {
      if (isCustom(key) && form.get('act') === 'delpage') {
        await saveBuild(env, site.id, withoutPage(build, key));
        // Her switch and words for it go too, so a new page of the same name starts fresh.
        await env.DB.batch([
          env.DB.prepare('DELETE FROM site_pages WHERE site_id = ? AND page = ?').bind(site.id, key),
          env.DB.prepare('DELETE FROM block_switches WHERE site_id = ? AND page = ?').bind(site.id, key),
        ]);
        return redirect(`/admin/${site.subdomain}/pages?removed=1`);
      }
      // Her page's name, address and menu group, saved with whatever was pressed.
      const info = isCustom(key) && form.get('page.present') != null
        ? withPageInfo(build, key, { name: str(form, 'page.name'), path: str(form, 'page.path'), group: str(form, 'page.group') }) : build;
      const out = pageFromForm(info, key, form);
      await saveBuild(env, site.id, out.build);
      return redirect(`/admin/${site.subdomain}/pages/${key}?saved=1${out.open ? `&open=${encodeURIComponent(out.open)}#b-${encodeURIComponent(out.open)}` : ''}`);
    } catch (err) {
      if (!(err instanceof BlockError)) throw err;
      error = err.message;
    }
  }
  const snap = key === 'home' ? null : await buildSnapshot(env, site.id);
  const title = key === 'home' ? 'Home' : pageLabel(snap, key);
  const saved = url.searchParams.get('saved') && !error;
  const made = url.searchParams.get('saved') === 'made';
  const body = `<p class="crumb"><a href="/admin/${sub}/pages">‹ Pages</a></p><span class="eyebrow">${name}</span>${demo}<h1>${esc(title)}</h1>
    ${saved ? `<p class="notice" role="status">${made ? 'Page made. It goes live, and into the menu, once the breeder (or you) publishes.' : 'Saved. The site shows it once the breeder (or you) publishes.'}</p>` : ''}
    <form method="post" id="build" class="build"><button class="sr" tabindex="-1" aria-hidden="true">Save</button>${await pageScreen(env, site, build, key, { open, error })}
      <div class="actionbar"><div class="in"><span class="ico">${ic('eye')}</span><p><b>Their ${esc(title)} page</b>Save, then the preview shows it. Publishing puts it live.</p><a class="button small seeit" href="#preview">See it</a><button class="primary small">Save</button></div></div></form>`;
  return page(`${title} · ${site.kennel_name || site.subdomain}`, body, { admin: { nav: adminNav(site, 'pages'), site } });
}

// ---------- the breeder's instructions (step 2, decision 19) ----------

// Her Site Manager's wording: for every site (/admin/wording), or one site's own
// (/admin/<sub>/instructions). Grouped by screen, each line with where it shows,
// today's wording and the names it can use. No prototype screen for it: built from
// the prototype's lists, cards, pills and the pinned action bar.
async function wordingRoute({ env, request, url, page, site, build = null, screen }) {
  const every = await everyWording(env);
  const own = site ? siteWording(build) : {};
  const base = site ? `/admin/${esc(site.subdomain)}/instructions` : '/admin/wording';
  const nav = { admin: { nav: site ? adminNav(site, 'instructions') : adminNav(null, 'wording'), ...(site ? { site } : {}) } };
  const q = String(url.searchParams.get('q') ?? '').trim();
  const changed = (it) => (site ? own[it.key] != null : every[it.key] != null);
  const head = site
    ? `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>${isDemo(site) ? ' <span class="spill brass">Demo</span>' : ''}<h1>Her instructions</h1>
      <p class="muted">The wording she reads in her Site Manager, for this site only. Empty lines follow <a href="/admin/wording">the wording for every site</a>.</p>`
    : `<p class="crumb"><a href="/admin">‹ Every site</a></p><h1>Site Manager wording</h1>
      <p class="muted">Every line the breeder reads in her Site Manager, for every site. A site can have its own, on its Her instructions tab. Empty lines are today's wording.</p>`;
  const search = `<form method="get" action="${base}/all" class="card"><div class="fgrid"><label class="half">Find a line<input type="search" name="q" value="${esc(q)}" placeholder="like &quot;Publish&quot; or &quot;litter&quot;"></label></div></form>`;

  if (!screen) {
    if (request.method !== 'GET') return null;
    const rows = Object.entries(WORD_SCREENS).map(([k, name]) => {
      const list = itemsOn(k);
      const n = list.filter(changed).length;
      return `<li><a class="rowlink grow" href="${base}/${k}"><b>${esc(name)}</b><br><span class="small muted">${list.length} line${list.length === 1 ? '' : 's'}${n ? ` · <span class="chg">${n} changed</span>` : ''}</span></a><span class="go" aria-hidden="true">›</span></li>`;
    });
    const body = `${head}${search}<section class="card"><div class="between"><h2>${CATALOG.size} lines, by screen</h2></div><ul class="list pages">${rows.join('')}</ul></section>
      <section class="card band"><p class="small">So far the list holds every field's label and help, the choices in lists, the notes after a change, the lists' names and her home screen. Each screen's own instructions and the family portal's screens join it next.</p></section>`;
    return page(site ? 'Her instructions' : 'Site Manager wording', body, nav);
  }
  if (screen !== 'all' && !Object.hasOwn(WORD_SCREENS, screen)) return null;
  const list = screen === 'all'
    ? [...CATALOG.values()].filter((it) => q && [it.key, it.where, it.text, every[it.key], own[it.key]].some((x) => String(x ?? '').toLowerCase().includes(q.toLowerCase()))).slice(0, 200)
    : itemsOn(screen);
  let error = null;
  if (request.method === 'POST') {
    const form = await request.formData();
    const changes = {};
    for (const it of list) if (form.has(`w.${it.key}`)) changes[it.key] = String(form.get(`w.${it.key}`));
    try {
      if (site) await saveBuild(env, site.id, withWording(build, changes, every));
      else await saveEveryWording(env, changes);
      return redirect(`${base}/${screen}${q ? `?q=${encodeURIComponent(q)}&saved=1` : '?saved=1'}`);
    } catch (err) {
      if (!(err instanceof WordingError)) throw err;
      error = err.message;
    }
  }
  const fresh = site ? siteWording(await loadBuild(env, site.id)) : await everyWording(env);
  const rows = list.map((it) => {
    const mine = fresh[it.key] ?? '';
    const follows = site ? every[it.key] ?? it.text : it.text;
    const long = follows.length > 70 || mine.length > 70;
    const input = long ? `<textarea name="w.${esc(it.key)}" rows="3" placeholder="${esc(follows)}">${esc(mine)}</textarea>` : `<input type="text" name="w.${esc(it.key)}" value="${esc(mine)}" placeholder="${esc(follows)}">`;
    return `<li class="wline${mine ? ' on' : ''}"><label><span class="where"><b>${esc(it.where)}</b>${mine ? ' <span class="chg">changed</span>' : ''}</span>${input}
      <span class="hint">${follows ? `${site && every[it.key] != null ? 'Every site' : 'Today'}: “${esc(follows)}”` : 'Empty today.'}${` Can use ${['kennel', ...it.vars.filter((v) => v !== 'kennel')].map((v) => `{${v}}`).join(', ')}.`}</span></label></li>`;
  }).join('');
  const title = screen === 'all' ? (q ? `Lines with “${q}”` : 'Find a line') : WORD_SCREENS[screen];
  const saved = url.searchParams.get('saved') && !error;
  const body = `<p class="crumb"><a href="${base}">‹ ${site ? 'Her instructions' : 'Site Manager wording'}</a></p>${site ? `<span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>` : ''}<h1>${esc(title)}</h1>
    ${screen === 'all' ? search : ''}
    ${saved ? `<p class="notice" role="status">Saved. ${site ? 'Her Site Manager shows it now.' : 'Every site\'s Site Manager shows it now, except where a site has its own.'}</p>` : ''}
    ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <form method="post" class="build solo"><button class="sr" tabindex="-1" aria-hidden="true">Save</button><div class="stack">
      <section class="card"><p class="small muted">${site ? 'Leave a line empty to follow the wording for every site.' : 'Leave a line empty for today\'s wording.'} Names in braces are filled in, like {kennel} with her kennel's name.</p>
      ${rows ? `<ul class="list wlines">${rows}</ul>` : `<p class="muted">${q ? 'No line has that.' : 'Type a word to find the lines that have it.'}</p>`}</section></div>
      <div class="actionbar"><div class="in"><span class="ico">${ic('book')}</span><p><b>${site ? 'Her instructions' : 'Every site'}</b>Saved lines show in the Site Manager straight away, no publish needed.</p><button class="primary small">Save</button></div></div></form>`;
  return page(`${title} · ${site ? 'Her instructions' : 'Site Manager wording'}`, body, nav);
}
