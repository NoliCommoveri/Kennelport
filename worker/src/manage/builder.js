// The owner's build tools, in her admin view of the Site Manager
// (docs/plans/site-builder.md, step 1: display and timing rules). Drawn from the
// site builder prototype (docs/reference/site-builder-prototype.html): Every site
// as tiles; per site, Display rules (a card per pup status, then registration and
// prices) and Timing (a row per rule with its default), each beside a phone
// preview of the breeder's Puppies page drawn with the site's saved rules, and
// the pinned action bar to save.
//
//   GET  /admin                     Every site
//   GET  /admin/<sub>/pages         Pages: the list (step 3)
//   GET  /admin/<sub>/pages/<page>  a page's blocks, top to bottom, and what each data block's cards show
//   GET  /admin/<sub>/pages/dog      what every dog's page shows (likewise litter, puppy: step 3.7)
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
  STATUS_ROWS, NOT_OPEN_FIXED, STATUS_NOTES, PILLS, DEFAULT_RULES, DEFAULT_TIMING, RuleError, rulesFor, rulesFromForm, timingFromForm,
  withPart, changedCount, loadBuild, saveBuild, partsFromForm, wordsOn, DATE_STYLES, DAY_STYLES, SEX_STYLES, COUNT_STYLES,
  DOG_PLACES, DOG_PLACE_WORDS, KOS_DOG_STATUSES, PUP_DISPOSITIONS, PUP_DISPOSITION_WORDS,
} from '../content/rules.js';
import { buildSnapshot } from '../publish.js';
import {
  olderPuppies, depositsAhead, puppyStatus, puppyPriceText, regText, statusRule, sortPuppies, fullRegHref, rulesOf,
  useFormats, word, litterRows, dogGroups, sitePrice, pricesOff, fmtDate, sexWord, dogsFor, label, placedFaqs, addedOn, addedWords, customPage, menuGroups,
} from '../render/parts.js';
import { makePreviewToken, servePhoto, SITE_CSP } from '../site.js';
import { renderPage } from '../render/index.js';
import { DEMO_STEPS } from '../kennelos/demo.js';
import {
  BLOCK_TYPES, DOG_STATUS, ANY3, DOG_FLAGS, DOG_ORDER, DOG_STYLE, STAGES, REVIEW_STYLE, SEXES, DOG_ITEMS, LIGHT_ITEMS, DOG_STACKED, LITTER_ITEMS, LITTER_PAIR,
  LITTER_ROWS, REVIEW_ITEMS, REVIEW_WHO, BlockError, blocksFromForm, moved, newBlock,
  pageBlocks, pageChanged, pagesChanged, withPage, addable, fits, hersOn, blockName, blockHint, isBuilt, BUILT_PAGES, PAGE_PARTS, headFor, isCustom, customPages, addPage, withPageInfo, withoutPage, pathFor, STARTS,
  menuOf, menuChanged, withMenu, groupOf, MenuError, MENU_PLACES, MENU_LIMITS,
  PROFILES, PROFILE_PATHS, PROFILE_PARTS, PROFILE_ITEMS, PROFILE_FIXED, PROFILE_ONLY, PROFILE_FACTS, profileOf, profileChanged, withProfile, profileFromForm, homePart,
  LINK_TO, BUTTON_SIZE, BUTTON_LOOK, ALIGN, DIVIDER_STYLE, DIVIDER_WIDTH, SPACER_HEIGHT, PHOTO_SHAPE, PHOTO_FRAME, PHOTO_FOCUS, PHOTO_SIDE, GALLERY_SOURCE, GALLERY_COUNT, GALLERY_MAX, STRIP_FRAME, OVER_V, OVER_SHADE, BG_COLOURS, PAD, TEXT_SIZE, FACTS_MAX, FACT_SIZES, COLS_MAX, COL_SIZES, COLS_ACROSS,
  COLLAGE_LAYOUT, COLLAGE_FRAME, COLLAGE_MAX,
} from '../content/blocks.js';
import { PAGES, COLLAGE_LAYOUTS, collageLayout, HOME_WORDS } from '../content/model.js';
import { layoutChoice, boxHint, photoSlot } from './forms.js';
import { siteLink } from '../ops/sites.js';
import { SCREENS as WORD_SCREENS, CATALOG, itemsOn, everyWording, saveEveryWording, siteWording, withWording, WordingError, defaultSay } from './wording.js';

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
  ['pages', 'Pages', 'pages', 'Pages'], ['menu', 'Menu', 'list', 'Menu'], ['rules', 'Pups', 'paw', 'Pups'], ['dogs', 'Dogs', 'star', 'Dogs'], ['wording', 'Wording', 'pages', 'Words'],
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
    const r = statusRule(snap, p, l, ctx.today);
    const words = puppyStatus(snap, l, p, ctx.today);
    const reg = regText(snap, p, l, ctx.today);
    const price = puppyPriceText(snap, l, p, ctx.today);
    const full = fullRegHref(snap, l, p, ctx);
    return `<div class="pvc"><span class="ph"></span><div class="t"><b>${esc(p.name)} ${sexMark(p.sex)}</b>${words ? `<span class="spill ${SPILL[r.pill] ?? 'plain'}">${esc(words)}</span>` : ''}${reg ? `<span class="muted">${esc(reg)}</span>` : ''}${price ? `<span class="price">${esc(price)}</span>` : ''}${r.ask ? `<span class="lnk">${esc(word(snap, 'ask_puppy'))} ›</span>` : ''}${full ? `<span class="lnk">${esc(rulesOf(snap).reg.ask)} ›</span>` : ''}</div></div>`;
  };
  const block = (eyebrow, heading, cards, cls = '') => `<div class="pvb${cls}"><span class="eyebrow">${esc(eyebrow)}</span><h3>${esc(heading)}</h3>${cards.length ? `<div class="pvg">${cards.join('')}</div>` : '<p class="small muted">No puppies to show.</p>'}</div>`;
  const blocks = [];
  for (const l of snap.litters.filter((x) => x.stage === 'current' && !depositsAhead(snap, x, ctx.today) && !olderIds.has(x.id) && x.puppies.length)) {
    blocks.push(block('Current litter', l.name, sortPuppies(snap, l.puppies, l, ctx.today).map((p) => card(l, p))));
  }
  if (older.length) blocks.push(block('Ready now', 'Older puppies', older.map(({ litter, puppy }) => card(litter, puppy)), ' sand'));
  for (const l of snap.litters.filter((x) => depositsAhead(snap, x, ctx.today) && x.puppies.length)) {
    blocks.push(block('Coming up', l.name, sortPuppies(snap, l.puppies, l, ctx.today).map((p) => card(l, p))));
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
    const fixed = (f) => k === 'not_open' && NOT_OPEN_FIXED.includes(f);
    return `<section class="card status-card"><div class="between"><span class="stcode"><span class="code">${k}</span>${r.show && r.words ? `<span class="spill ${SPILL[r.pill]}">${esc(r.words)}</span>` : '<span class="small muted">Not shown</span>'}</span>${same(r, D.status[k]) ? '' : back(`status.${k}`)}</div>
      <p class="small muted">${esc(STATUS_NOTES[k])}</p>
      <div class="fgrid">${field(name('words'), r.words, { label: 'Shows as', ph: 'Words on the card' })}${select(name('pill'), r.pill, PILLS, 'Pill')}</div>
      <div class="switches">${fixed('show') ? '' : toggle(name('show'), r.show, 'Show the pup on the site')}${toggle(name('price'), r.price, 'Show its price')}${toggle(name('ask'), r.ask, '“Ask about this puppy”')}
        ${toggle(name('fullreg'), r.fullreg, `“${rules.reg.ask}” (no registration set)`)}${fixed('older') ? '' : toggle(name('older'), r.older, 'Can be an older puppy')}${toggle(name('ribbon'), r.ribbon, 'Ribbon across its photo')}</div>
      ${k === 'not_open' ? '<p class="small muted">Always shown, like an available pup; on the day deposits open it reads as available.</p>' : ''}
      <label>Order on the litter page<span class="hint">Lower comes first; equal keeps the breeder's order.</span><select name="${name('order')}">${Object.entries({ 1: 'First', 2: 'Second', 3: 'Third', 4: 'Last' }).map(([v, l]) => `<option value="${v}"${String(v) === String(r.order) ? ' selected' : ''}>${l}</option>`).join('')}</select></label></section>`;
  };
  const changed = (part) => (same(rules[part], D[part]) ? '' : back(part));
  return `<div class="stack">
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
      <div class="fgroup"><h2>Pup statuses from KennelOS</h2></div>
      <div class="twocol">${STATUS_ROWS.map(card).join('')}</div>
      <section class="card"><div class="fgroup"><div class="between"><h2>Registration</h2>${changed('reg')}</div><div class="fgrid">
        ${field('reg.unset', rules.reg.unset, { label: 'No registration set reads', ph: 'Leave empty to say nothing' })}
        ${field('reg.limited', rules.reg.limited, { label: 'Limited reads' })}
        ${field('reg.full', rules.reg.full, { label: 'Full reads' })}
        ${field('reg.ask', rules.reg.ask, { label: 'The full-registration link' })}</div></div>
      <div class="fgroup"><div class="between"><h2>Prices</h2>${changed('price')}</div><div class="fgrid">
        ${field('price.off', rules.price.off, { label: 'When prices are off', cls: '' })}
        <div class="fld"><span class="fldt">A price range reads</span>${seg('price.style', rules.price.style, { range: '$2,800–$3,200', from: 'From $2,800' })}</div>
        ${field('price.price_label', rules.price.price_label, { label: 'Price label' })}
        ${field('price.deposit_label', rules.price.deposit_label, { label: 'Deposit label' })}</div></div></section>
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
  const pupKeys = PUP_DISPOSITIONS.map((k) => `pup_${k}`);
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <p class="small muted">For each new record an Update website brings. Once it's on the site, its switches are the breeder's.</p>
    <div class="twocol">
    <section class="card"><div class="fgroup"><div class="between"><h2>Each new dog</h2>${backFor(['health_display'])}</div>
      ${select('landing.health_display', L.health_display, { normal_only: 'Normal results only', all: 'All results', none: 'None' }, 'Health results shown', '')}</div>
      <div class="fgroup"><div class="between"><h2>Health results' order</h2>${backFor(['health_order'])}</div>
      ${seg('landing.health_order', L.health_order, { hers: 'Hers', kennelos: 'KennelOS’s' })}
      <span class="hint">Every dog, at each update. Hers: each result stays where she put it, a new one goes last. KennelOS’s: its order every time.</span></div></section>
    <section class="card"><div class="fgroup"><div class="between"><h2>Each new litter</h2>${backFor(['show_placed', 'show_prices'])}</div>
      <div class="switches">${toggle('landing.show_placed', L.show_placed, 'Show placed puppies')}</div>
      ${select('landing.show_prices', L.show_prices, { kos_prices: 'On, with Use my KennelOS prices', off: 'Off: the breeder switches them on' }, 'Show prices', '')}</div></section>
    </div>
    <section class="card"><div class="fgroup"><div class="between"><h2>Where each KennelOS dog status goes</h2>${backFor(dogKeys)}</div>
      <ul class="list">${KOS_DOG_STATUSES.map((k) => `<li><span class="grow"><span class="code">${k}</span></span><select name="landing.dog_${k}" aria-label="${esc(k)}" class="place">${Object.keys(DOG_PLACES).map((v) => `<option value="${v}"${L[`dog_${k}`] === v ? ' selected' : ''}>${esc(DOG_PLACE_WORDS[v])}</option>`).join('')}</select></li>`).join('')}</ul></div>
      <div class="fgroup"><div class="between"><h2>Which <span class="code">puppy</span> dogs go on the site</h2>${backFor(pupKeys)}</div>
      <p class="small muted">A KennelOS puppy dog marked Show on website, by her disposition for it in KennelOS. One switched on goes where <span class="code">puppy</span> goes above (Up and coming, to start); one left out is off the site, and waits in her draft under Not on your site. Until her KennelOS sends dispositions (an update of KennelOS, then Update website), every one shows.</p>
      <div class="switches boxed">${PUP_DISPOSITIONS.map((k) => toggle(`landing.pup_${k}`, L[`pup_${k}`], PUP_DISPOSITION_WORDS[k])).join('')}</div></div></section>
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
const isOwn = (b) => BLOCK_TYPES[b.type].kind === 'own';
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
  if (isOwn(b)) return ownSummary(snap, b);
  const faqs = placedFaqs(snap, key).map((e) => e.heading).join(' · ');
  const badges = badgesOn(snap, key).map((x) => x.name).join(' · ');
  if (b.type === 'faq') return faqs || 'No questions placed here yet';
  if (b.type === 'badges') return badges || 'No badges placed here yet';
  if (b.type === 'embeds') return `Her videos and posts on ${pageLabel(snap, key)}`;
  if (b.type === 'head') {
    const p = snap.pages[key] ?? {};
    return [p.eyebrow ?? headOf(snap, key).eyebrow, p.heading ?? headOf(snap, key).heading].filter(Boolean).join(' · ');
  }
  const h = snap.home;
  const said = { hero: h.hero.headline ?? snap.site.kennel_name, facts: (h.facts.items ?? []).map(([v, l]) => `${v} ${l}`).join(' · '), text: h.story.heading,
    band: h.waitlist.heading ?? HOME_WORDS.waitlist.heading }[b.type];
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

function blockSettings(snap, key, b, pics) {
  const k = (f) => `b.${b.id}.${f}`;
  if (isOwn(b)) {
    return `<div class="set"><input type="hidden" name="${k('present')}" value="1">${ownSettings(snap, key, b, pics)}${lookSettings(b)}
      <div class="row"><button class="link small danger" name="act" value="remove:${esc(b.id)}">${svg('trash')} Remove this block</button></div></div>`;
  }
  if (!isData(b)) {
    return `<div class="set"><input type="hidden" name="${k('present')}" value="1"><p class="small">${esc(blockHint(key, b) ?? '')}</p>
      <p class="small muted">${esc(hersLine(snap, key, b))}</p>${lookSettings(b)}
      <div class="row"><button class="link small danger" name="act" value="remove:${esc(b.id)}">${svg('trash')} Remove this block</button></div></div>`;
  }
  let data = '';
  let show = '';
  if (b.type === 'dogs') {
    data = `${fld('Sex', seg(k('f.sex'), b.f.sex, SEXES))}${fld('Status', chips(k('f.status'), b.f.status, DOG_STATUS))}
      <div class="fgrid">${DOG_FLAGS.map(([f, l]) => select(k(`f.${f}`), b.f[f], ANY3, l)).join('')}${select(k('order'), b.order, DOG_ORDER, 'Order')}</div>
      ${fld('Style', seg(k('style'), b.style, DOG_STYLE))}`;
    // The lists for the style it has now (save after changing the style to see its own).
    const lines = DOG_STACKED.includes(b.style) ? `<label class="check"><input type="checkbox" name="${k('lines')}"${b.lines ? ' checked' : ''}> <span>A line between cards where they stack<span class="hint">A 4px bar in the scheme's accent colour between one card and the next, where they sit one under another${b.style === 'flip' ? ' (on a phone)' : ' (on a phone or a tablet)'}.</span></span></label>` : '';
    show = b.style === 'light' ? showList(b, 'light', LIGHT_ITEMS, 'Top to bottom', 'Where it lives shows only for a co-owned dog living with a co-owner, or an outside dog with its owner filled in.')
      : b.style === 'beside' ? showList(b, 'beside', DOG_ITEMS, 'Beside the photo, then under it', 'The bio and everything after it go under the photo and details, across the card.')
        : `<div class="twocol">${showList(b, 'front', DOG_ITEMS, 'Front of the card', 'The photo always fills the front when it is on.')}${showList(b, 'back', DOG_ITEMS, 'Back of the card')}</div>`;
    show += lines;
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
    ${words}${lookSettings(b)}
    <div class="row"><button class="link small danger" name="act" value="remove:${esc(b.id)}">${svg('trash')} Remove this block</button></div></div>`;
}

// Every block's look (decision 17): a scheme colour, space around it, and on her own
// blocks a text size. Text on a colour takes the scheme's matching ink by itself.
function lookSettings(b) {
  const k = (f) => `b.${b.id}.s.${f}`;
  const st = b.s ?? {};
  return `<div class="fgroup"><h2>Its look</h2><input type="hidden" name="${k('present')}" value="1"><div class="fgrid">
    ${select(k('bg'), st.bg ?? '', BG_COLOURS, 'Background')}${isOwn(b) ? select(k('text'), st.text ?? 'm', TEXT_SIZE, 'Text size') : ''}
    ${select(k('py'), st.py ?? '', PAD, 'Space above and below')}${select(k('px'), st.px ?? '', PAD, 'Space at the sides')}</div>
    <p class="small muted">Colours are this site's scheme, so they follow its light and dark looks. Words on a colour take the scheme's matching ink.</p></div>`;
}

// The pages a button can go to: Home, every page (Privacy aside), and hers.
function pageChoices(snap, build) {
  return { home: 'Home', ...Object.fromEntries(Object.keys(PAGES).filter((x) => x !== 'privacy').map((x) => [x, pageLabel(snap, x)])), ...Object.fromEntries(customPages(build ?? {}).map((c) => [c.id, c.name])) };
}

function linkSettings(snap, b, pics, optional) {
  const k = (f) => `b.${b.id}.${f}`;
  const l = b.link ?? { to: '' };
  const to = optional ? { '': 'No button', ...LINK_TO } : LINK_TO;
  return `<div class="fgrid">${select(k('link.to'), l.to ?? '', to, 'The button goes to')}${select(k('link.page'), l.page ?? 'waitlist', pageChoices(snap, pics.build), 'The page (for a page)')}
    ${field(k('link.value'), l.value ?? '', { label: 'Address, number or email', cls: '', hint: 'An outside site needs its address. For a call, a text or an email, leave it empty to use the phone and email in Kennel details, and follow them when they change.' })}</div>
    <p class="small muted">The breeder can reword the button, switch it off, and change an outside link, phone number or email address. A link to a page is yours. A button whose page is off hides by itself.</p>`;
}

// A photo spot: the photo that's there, with Replace, which opens her photo library
// window (forms.js photoSlot, photos.js), the same one she uses, upload and all.
const FROM_HERS = "From the breeder's photos: Replace opens them all, and can upload more.";
function photoChoice(b, pics, { name = `b.${b.id}.photo`, chosen = b.photo, label = 'Photo', hint = FROM_HERS, shape = null } = {}) {
  return photoSlot(name, label, hint, chosen ? [chosen] : [], { say: defaultSay, photoUrl: pics.url, library: pics.library, photos: pics.photos }, { shape });
}

// A collage block's photos: one box per box of the layout, each with which part
// to keep; the boxes it doesn't have are hidden (app.js shows them when the layout changes).
function collageBoxes(b, pics) {
  const k = (f) => `b.${b.id}.${f}`;
  const boxes = COLLAGE_LAYOUTS[b.layout].boxes;
  return Array.from({ length: COLLAGE_MAX }, (_, i) => `<div class="box" data-box="${i}"${i < boxes.length ? '' : ' hidden'}>${photoChoice(b, pics, { name: k(`photos.${i}`), chosen: b.photos[i] ?? null, label: `Box ${i + 1}`, hint: boxHint(boxes[i] ?? 'square'), shape: boxes[i] ?? 'square' })}
    ${fld(`Box ${i + 1}: which part to keep`, seg(k(`focus.${i}`), b.focus[i] ?? 'middle', PHOTO_FOCUS), 'If the photo is a different shape from the box: the part that shows.')}</div>`).join('');
}

function ownSettings(snap, key, b, pics) {
  const k = (f) => `b.${b.id}.${f}`;
  const w = (f, label, cls = 'half', hint = '') => field(k(`w.${f}`), b.w?.[f] ?? '', { label, cls, hint });
  const her = `The breeder can switch it off${b.type === 'divider' ? '' : ' and reword it'} in ${hersAt(snap, key)}.`;
  if (b.type === 'banner') return `<div class="fgroup"><h2>Starting wording</h2><p class="small muted">${esc(her)}</p><div class="fgrid">${w('heading', 'Heading')}${w('label', 'Button words')}${w('line', 'A line', '')}</div></div>
    <div class="fgroup"><h2>The button</h2>${linkSettings(snap, b, pics, true)}</div>`;
  if (b.type === 'button') return `<div class="fgroup"><h2>The button</h2><p class="small muted">${esc(her)}</p><div class="fgrid">${w('label', 'Its words')}</div>
    ${fld('Size', seg(k('size'), b.size, BUTTON_SIZE))}${fld('Look', seg(k('look'), b.look, BUTTON_LOOK))}${fld('Where it sits', seg(k('align'), b.align, ALIGN))}${linkSettings(snap, b, pics, false)}</div>`;
  if (b.type === 'divider') return `<div class="fgroup"><h2>The divider</h2><p class="small muted">${esc(her)}</p>${fld('Style', seg(k('style'), b.style, DIVIDER_STYLE))}${fld('Width', seg(k('width'), b.width, DIVIDER_WIDTH))}</div>`;
  if (b.type === 'factrow') {
    const rows = Array.from({ length: FACTS_MAX }, (_, i) => b.items?.[i] ?? ['', '']);
    return `<div class="fgroup"><h2>The facts</h2><p class="small muted">${esc(her)}</p><p class="small muted">Up to ${FACTS_MAX}, side by side: a big value (${FACT_SIZES[0]} letters at most) over a small label. Leave a row empty to skip it.</p>
      <div class="fgrid">${rows.map(([v, l], i) => `${field(k(`items.${i}.0`), v, { label: `Fact ${i + 1}: value`, ph: i ? '' : '12' })}${field(k(`items.${i}.1`), l, { label: `Fact ${i + 1}: label`, ph: i ? '' : 'Years breeding' })}`).join('')}</div></div>`;
  }
  if (b.type === 'words') return `<div class="fgroup"><h2>Starting wording</h2><p class="small muted">${esc(her)}</p><div class="fgrid">${w('heading', 'Heading')}${w('line', 'Line under the heading', 'half', 'Optional.')}
      <label>Words<textarea name="${k('w.body')}" rows="6">${esc(b.w?.body ?? '')}</textarea><span class="hint">Optional. A blank line starts a new paragraph.</span></label></div>
      ${fld('Where it sits', seg(k('align'), b.align, ALIGN))}</div>`;
  if (b.type === 'columns') {
    const rows = Array.from({ length: COLS_MAX }, (_, i) => b.cols?.[i] ?? ['', '']);
    return `<div class="fgroup"><h2>Starting wording</h2><p class="small muted">${esc(her)}</p><div class="fgrid">${w('heading', 'Heading')}${w('line', 'Line under the heading', 'half', 'Optional.')}</div>
      ${fld('Across on a computer', seg(k('across'), b.across, COLS_ACROSS), 'One under another on a phone.')}${fld('Where the heading sits', seg(k('align'), b.align, ALIGN))}</div>
      <div class="fgroup"><h2>The sections</h2><p class="small muted">Up to ${COLS_MAX}, filling the columns left to right: a subheading (${COL_SIZES[0]} letters at most) over its words. A blank line in the words starts a new paragraph. Leave a section empty to skip it.</p>
      <div class="fgrid">${rows.map(([h, t], i) => `${field(k(`cols.${i}.0`), h, { label: `Section ${i + 1}: subheading`, cls: '', ph: i ? '' : 'Early days' })}<label>Section ${i + 1}: words<textarea name="${k(`cols.${i}.1`)}" rows="4" maxlength="${COL_SIZES[1]}">${esc(t)}</textarea></label>`).join('')}</div></div>`;
  }
  if (b.type === 'spacer') return `<div class="fgroup"><h2>The space</h2>${fld('Height', seg(k('height'), b.height, SPACER_HEIGHT))}</div>`;
  const change = `<div class="switches boxed">${toggle(k('mayChange'), b.mayChange, b.type === 'photo' ? 'The breeder can change the photo and its caption' : b.type === 'collage' || b.type === 'gallery' ? 'The breeder can change the photos' : 'The breeder can change the photo')}</div>`;
  if (b.type === 'gallery') {
    const albums = Object.fromEntries((pics.albums ?? []).map((a) => [a.id, `${a.title}${a.show_on_site ? '' : ' (not on her site)'}`]));
    return `<div class="fgroup"><h2>The photos</h2><p class="small muted">${esc(her)} A tap on a photo opens it full size, as on an album's page.</p>
      ${fld('Where they come from', seg(k('source'), b.source, GALLERY_SOURCE))}
      <div class="fgrid">${select(k('album'), b.album ?? '', { '': Object.keys(albums).length ? 'Choose an album' : 'She has no albums yet', ...albums }, 'The album (from an album)', '')}</div>
      ${photoSlot(k('photos'), 'The photos (photos you pick)', `Up to ${GALLERY_MAX}, in this order. From the breeder's photos: the button opens them all, and can upload more.`, b.photos, { say: defaultSay, photoUrl: pics.url, library: pics.library, photos: pics.photos }, { multiple: true, max: GALLERY_MAX })}
      ${fld('How many show', seg(k('count'), b.count, GALLERY_COUNT), 'In one row on a computer (twelve scroll sideways, six at a time); sideways on a phone.')}
      ${fld('Border round the strip', seg(k('frame'), b.frame, STRIP_FRAME), 'Round the whole row, in the site\'s colours.')}
      <div class="switches boxed">${toggle(k('more'), b.more, 'A link under it to the whole album (from an album, while the Photo albums page is on)')}</div>${change}</div>
      <div class="fgroup"><h2>Starting wording</h2><div class="fgrid">${w('heading', 'Heading', 'half', 'Optional.')}${w('label', 'Link words')}${w('line', 'Line under the heading', '', 'Optional.')}</div></div>`;
  }
  if (b.type === 'collage') return `<div class="fgroup"><h2>The collage</h2><p class="small muted">${esc(her.replace(' and reword it', ''))} Home's collage, as a block: pick the boxes, then a photo for each box. With fewer photos than boxes, the site uses a layout for that many.</p>
    ${layoutChoice(k('layout'), b.layout, 'Photo layout')}${fld('Frame', seg(k('frame'), b.frame, COLLAGE_FRAME), 'The Home banner\'s frames, in the site\'s colours.')}</div>
    <div class="fgroup"><h2>The photos</h2><p class="small muted">${esc(FROM_HERS)}</p>${collageBoxes(b, pics)}${change}</div>`;
  if (b.type === 'photo') return `<div class="fgroup"><h2>The photo</h2><p class="small muted">${esc(her.replace(' and reword it', ''))}</p>${photoChoice(b, pics)}
    ${fld('Shape', seg(k('shape'), b.shape, PHOTO_SHAPE))}${fld('Frame', seg(k('frame'), b.frame, PHOTO_FRAME), 'The Home banner\'s frames, in the site\'s colours. A full-width photo stays unframed.')}${fld('Which part to keep', seg(k('focus'), b.focus, PHOTO_FOCUS))}<div class="fgrid">${w('caption', 'Caption', '', 'Optional.')}</div>${change}</div>`;
  if (b.type === 'beside') return `<div class="fgroup"><h2>The photo</h2>${photoChoice(b, pics)}${fld('Where it sits', seg(k('side'), b.side, PHOTO_SIDE), 'On a computer. On a phone the photo goes above the words.')}${fld('Frame', seg(k('frame'), b.frame, PHOTO_FRAME), 'The Home banner\'s frames, in the site\'s colours.')}${fld('Which part to keep', seg(k('focus'), b.focus, PHOTO_FOCUS))}${change}</div>
    <div class="fgroup"><h2>The words beside it</h2><p class="small muted">${esc(her)}</p><div class="fgrid">${w('heading', 'Heading')}${w('label', 'Button words')}
      <label>Words<textarea name="${k('w.body')}" rows="6">${esc(b.w?.body ?? '')}</textarea><span class="hint">Optional. A blank line starts a new paragraph.</span></label></div>
      ${fld('Words line up', seg(k('align'), b.align, ALIGN), 'The heading, words and button, on a computer and a phone.')}</div>
    <div class="fgroup"><h2>The button</h2>${linkSettings(snap, b, pics, true)}</div>`;
  if (b.type === 'overlay') return `<div class="fgroup"><h2>The photo</h2>${photoChoice(b, pics)}${fld('Which part to keep', seg(k('focus'), b.focus, PHOTO_FOCUS))}${change}</div>
    <div class="fgroup"><h2>The words over it</h2><p class="small muted">${esc(her)}</p><div class="fgrid">${w('heading', 'Heading')}${w('label', 'Button words')}${w('line', 'A line', '')}</div>
      ${fld('Up and down', seg(k('v'), b.v, OVER_V))}${fld('Across', seg(k('h'), b.h, ALIGN))}${fld('Shade behind the words', seg(k('shade'), b.shade, OVER_SHADE), 'Even the lightest keeps white words readable.')}</div>
    <div class="fgroup"><h2>The button</h2>${linkSettings(snap, b, pics, true)}</div>`;
  return '';
}

// One line under her own block's name.
function ownSummary(snap, b) {
  const to = (l) => (!l ? 'no button' : l.to === 'page' ? `to ${l.page === 'home' ? 'Home' : pageLabel(snap, l.page)}` : l.to === 'url' ? `to ${l.value || '(no address yet)'}` : `${LINK_TO[l.to].toLowerCase()}${l.value ? ` to ${l.value}` : ', from Kennel details'}`);
  if (b.type === 'banner') return [b.w.heading, b.w.label && `“${b.w.label}” ${to(b.link)}`].filter(Boolean).join(' · ') || 'No words yet';
  if (b.type === 'button') return `“${b.w.label || '(no words)'}” ${to(b.link)} · ${BUTTON_SIZE[b.size].toLowerCase()}`;
  if (b.type === 'divider') return `${DIVIDER_STYLE[b.style]} · ${DIVIDER_WIDTH[b.width].toLowerCase()}`;
  if (b.type === 'spacer') return SPACER_HEIGHT[b.height];
  if (b.type === 'factrow') return b.items.length ? b.items.map(([v, l]) => [v, l].filter(Boolean).join(' ')).join(' · ') : 'No facts yet, so it hides';
  if (b.type === 'words') return [b.w.heading, b.w.line, b.w.body && `${b.w.body.split(/\n{2,}/).filter((x) => x.trim()).length} paragraph(s)`].filter(Boolean).join(' · ') || 'No words yet, so it hides';
  if (b.type === 'columns') return [b.w.heading, b.cols.length ? `${b.cols.length} section(s), ${COLS_ACROSS[b.across].toLowerCase()} across` : 'No sections yet, so it hides'].filter(Boolean).join(' · ');
  if (b.type === 'collage') {
    if (!b.photos.length) return b.mayChange ? 'No photos chosen yet, so it hides until the breeder picks some' : 'No photos chosen yet, so it hides';
    const n = b.photos.length;
    return [COLLAGE_LAYOUT[collageLayout(b.layout, n)], `${n} photo${n === 1 ? '' : 's'}`, b.frame !== 'none' && COLLAGE_FRAME[b.frame].toLowerCase()].filter(Boolean).join(' · ');
  }
  if (b.type === 'gallery') {
    const album = b.source === 'album' ? snap.albums?.find((a) => a.id === b.album) : null;
    const border = b.frame === 'none' ? null : STRIP_FRAME[b.frame].toLowerCase();
    if (b.source === 'album') return b.album ? [album ? `Album: ${album.title}` : 'An album not on her site, so it hides', `${b.count} photos`, border].filter(Boolean).join(' · ') : 'No album chosen yet, so it hides';
    return b.photos.length ? `${b.photos.length} photo${b.photos.length === 1 ? '' : 's'} picked · ${b.count} show` : b.mayChange ? 'No photos picked yet, so it hides until the breeder picks some' : 'No photos picked yet, so it hides';
  }
  if (b.type === 'beside') return [b.photo ? `Photo ${PHOTO_SIDE[b.side].toLowerCase()}` : 'No photo yet, words only', b.w.heading, b.frame !== 'none' && b.photo && PHOTO_FRAME[b.frame].toLowerCase()].filter(Boolean).join(' · ');
  if (!b.photo) return 'No photo chosen yet, so it hides';
  return b.type === 'photo' ? `${PHOTO_SHAPE[b.shape]}${b.frame !== 'none' && b.shape !== 'full' ? ` · ${PHOTO_FRAME[b.frame].toLowerCase()}` : ''}${b.w.caption ? ` · ${b.w.caption}` : ''}` : [b.w.heading, `words ${OVER_V[b.v].toLowerCase()} ${ALIGN[b.h].toLowerCase()}`].filter(Boolean).join(' · ');
}

function blockRow(snap, key, b, i, n, open, pics) {
  const T = BLOCK_TYPES[b.type];
  const off = hersOn(key, b) ? !snap.home[b.id]?.enabled : !addedOn(snap, key, b);
  const isOpen = open === b.id;
  return `<li class="mvr${isData(b) ? ' data' : ''}${b.type === 'builtin' ? ' fixed' : ''}${off ? ' off' : ''}" id="b-${esc(b.id)}">${mvBtns(`mv:${b.id}`, i, n)}<span class="ico">${svg(T.ic)}</span>
    <span class="ttl">${esc(blockName(key, b))}${isData(b) ? ` <span class="kos-tag">${b.type === 'reviews' ? 'Records' : 'KennelOS'}</span>` : ''}${b.type === 'builtin' ? ' <span class="kos-tag">Built-in</span>' : ''}${off ? ' <span class="chg">off by the breeder</span>' : ''}<small>${esc(blockSummary(snap, key, b))}</small></span>
    <span class="end"><button class="button small" name="act" value="${isOpen ? 'close' : `open:${esc(b.id)}`}" aria-expanded="${isOpen}">${isOpen ? 'Done' : 'Settings'}</button></span>
    ${isOpen ? blockSettings(snap, key, b, pics) : ''}</li>`;
}

// The phone beside it: the page's blocks as the prototype sketches them, with her words.
function pagePreview(snap, key, blocks, site) {
  const h = snap.home;
  const ghost = (b, why) => `<div class="pvb ghost">${esc(blockName(key, b))}: ${why}</div>`;
  const headOf = (w, eb, hd) => `${(w.eyebrow ?? eb) ? `<span class="eyebrow">${esc(w.eyebrow ?? eb)}</span>` : ''}${(w.heading ?? hd) ? `<h3>${esc(w.heading ?? hd)}</h3>` : ''}`;
  const wordsOf = (b) => (hersOn(key, b) ? h[b.id] ?? {} : addedWords(snap, key, b));
  const out = [];
  for (const b of blocks) {
    if (hersOn(key, b) ? !h[b.id]?.enabled : !addedOn(snap, key, b)) { out.push(ghost(b, 'switched off by the breeder')); continue; }
    const names = blockRecords(snap, b);
    if (isData(b) && !names.length) { out.push(ghost(b, 'nothing matches, so it hides')); continue; }
    if (b.type === 'hero') out.push(`<div class="pv-hero"><span class="ph"></span><div>${h.hero.eyebrow ? `<span class="eyebrow">${esc(h.hero.eyebrow)}</span>` : ''}${(h.hero.headline ?? snap.site.kennel_name) ? `<h3>${esc(h.hero.headline ?? snap.site.kennel_name)}</h3>` : ''}${h.hero.script ? `<span class="script">${esc(h.hero.script)}</span>` : ''}</div></div>`);
    else if (b.type === 'head') {
      const p = snap.pages[key] ?? {};
      const eb = p.eyebrow ?? headOf(snap, key).eyebrow;
      const lede = p.lede ?? headOf(snap, key).lede;
      out.push(`<div class="pvb sand">${eb ? `<span class="eyebrow">${esc(eb)}</span>` : ''}${(p.heading ?? headOf(snap, key).heading) ? `<h3>${esc(p.heading ?? headOf(snap, key).heading)}</h3>` : ''}${lede ? `<p class="small muted">${esc(lede)}</p>` : ''}</div>`);
    }
    else if (b.type === 'builtin') out.push(`<div class="pvb"><div class="pv-row pv-built">${svg('lock')}<b>${esc(blockName(key, b))}</b></div></div>`);
    else if (b.type === 'facts') out.push(h.facts.items?.length ? `<div class="pvb"><div class="pv-facts">${h.facts.items.slice(0, 3).map(([v, l]) => `<div><b>${esc(v)}</b>${esc(l)}</div>`).join('')}</div></div>` : ghost(b, 'no facts yet, so it hides'));
    else if (b.type === 'badges') { const x = badgesOn(snap, key); out.push(x.length ? `<div class="pvb"><div class="pv-row">${x.map((y) => `<span class="pv-pill">${esc(y.name)}</span>`).join(' ')}</div></div>` : ghost(b, 'no badges placed here, so it hides')); }
    else if (b.type === 'faq') { const q = placedFaqs(snap, key); out.push(q.length ? `<div class="pvb">${q.map((e) => `<div class="pv-q">${esc(e.heading)}</div>`).join('')}</div>` : ghost(b, 'no questions placed here, so it hides')); }
    else if (b.type === 'text') out.push(h.story.heading || h.story.text ? `<div class="pvb sand">${headOf(h.story, null, h.story.heading)}<div class="pvg"><span class="ph"></span><div class="lines"><i></i><i></i><i></i></div></div></div>` : ghost(b, 'no story yet, so it hides'));
    else if (b.type === 'embeds') out.push(ghost(b, `shows the videos and posts she puts on ${pageLabel(snap, key)}`));
    else if (b.type === 'band') out.push(`<div class="pvb deep">${(h.waitlist.heading ?? HOME_WORDS.waitlist.heading) ? `<h3>${esc(h.waitlist.heading ?? HOME_WORDS.waitlist.heading)}</h3>` : ''}<span class="pv-pill">${esc(h.waitlist.button_label || 'Join the waitlist')}</span></div>`);
    else if (b.type === 'dogs') out.push(`<div class="pvb">${headOf(wordsOf(b), 'Our dogs', 'Meet our dogs')}<div class="pvg${b.style === 'flip' || b.style === 'beside' ? '' : ' slide'}">${names.map((nm) => `<div class="pvc${b.style === 'light' ? ' light' : b.style === 'beside' ? ' beside' : ' flip'}"><span class="ph"></span><div class="t"><b>${esc(nm)}</b></div></div>`).join('')}</div></div>`);
    else if (b.type === 'litters') out.push(`<div class="pvb sand">${headOf(wordsOf(b), 'Litters', 'Current and upcoming')}${names.map((nm) => `<div class="pv-row"><b>${esc(nm)}</b></div>`).join('')}</div>`);
    else if (b.type === 'banner') out.push(`<div class="pvb deep">${b.w.heading ? `<h3>${esc(addedWords(snap, key, b).heading)}</h3>` : ''}${b.w.label && b.link ? `<span class="pv-pill">${esc(addedWords(snap, key, b).label)}</span>` : ''}</div>`);
    else if (b.type === 'button') out.push(`<div class="pvb"><div class="pv-row"><span class="pv-pill">${esc(addedWords(snap, key, b).label || 'Button')}</span></div></div>`);
    else if (b.type === 'divider') out.push(`<div class="pvb"><div class="pv-row small muted">${esc(DIVIDER_STYLE[b.style])}</div></div>`);
    else if (b.type === 'factrow') { const x = snap.added?.[key]?.[b.id]?.facts?.length ? snap.added[key][b.id].facts : b.items; out.push(x.length ? `<div class="pvb"><div class="pv-facts">${x.map(([v, l]) => `<div><b>${esc(v)}</b>${esc(l)}</div>`).join('')}</div></div>` : ghost(b, 'no facts yet, so it hides')); }
    else if (b.type === 'words') { const x = addedWords(snap, key, b); out.push(x.heading || x.line || x.body ? `<div class="pvb">${x.heading ? `<h3>${esc(x.heading)}</h3>` : ''}${x.line ? `<p class="small muted">${esc(x.line)}</p>` : ''}${x.body ? '<div class="lines"><i></i><i></i><i></i></div>' : ''}</div>` : ghost(b, 'no words yet, so it hides')); }
    else if (b.type === 'columns') { const x = addedWords(snap, key, b); const c = snap.added?.[key]?.[b.id]?.cols?.length ? snap.added[key][b.id].cols : b.cols; out.push(c.length ? `<div class="pvb">${x.heading ? `<h3>${esc(x.heading)}</h3>` : ''}${c.map(([h]) => `<b class="small">${esc(h)}</b><div class="lines"><i></i><i></i></div>`).join('')}</div>` : ghost(b, 'no sections yet, so it hides')); }
    else if (b.type === 'spacer') out.push(`<div class="pvb ghost">Space: ${esc(SPACER_HEIGHT[b.height].toLowerCase())}</div>`);
    else if (b.type === 'collage') { const x = b.mayChange && snap.added?.[key]?.[b.id]?.photos?.length ? snap.added[key][b.id].photos : b.photos; out.push(x.length ? `<div class="pvb"><div class="pvg">${x.map(() => '<div class="pvc"><span class="ph"></span></div>').join('')}</div></div>` : ghost(b, 'no photos chosen yet, so it hides')); }
    else if (b.type === 'gallery') { const x = addedWords(snap, key, b); const album = b.source === 'album' ? snap.albums?.find((a) => a.id === b.album) : null; const n = Math.min(Number(b.count), album ? album.photos.length : b.photos.length, 4); out.push(n ? `<div class="pvb">${x.heading ? `<h3>${esc(x.heading)}</h3>` : ''}<div class="pvg">${'<div class="pvc"><span class="ph"></span></div>'.repeat(n)}</div></div>` : ghost(b, 'no photos yet, so it hides')); }
    else if (b.type === 'beside') { const x = addedWords(snap, key, b); const pic = b.photo ? '<span class="ph"></span>' : ''; out.push(pic || x.heading || x.body ? `<div class="pvb"><div class="pvg">${b.side === 'right' ? '' : `<div class="pvc">${pic}</div>`}<div>${x.heading ? `<h3>${esc(x.heading)}</h3>` : ''}${x.body ? '<div class="lines"><i></i><i></i><i></i></div>' : ''}</div>${b.side === 'right' ? `<div class="pvc">${pic}</div>` : ''}</div></div>` : ghost(b, 'no photo or words yet, so it hides')); }
    else if (b.type === 'photo' || b.type === 'overlay') out.push(b.photo ? `<div class="pv-hero"><span class="ph"></span>${b.type === 'overlay' && b.w.heading ? `<div><h3>${esc(addedWords(snap, key, b).heading)}</h3></div>` : ''}</div>` : ghost(b, 'no photo chosen yet, so it hides'));
    else if (b.type === 'reviews') out.push(`<div class="pvb">${headOf(wordsOf(b), 'Families', 'What our families say')}${snap.reviews.slice(0, 1).map((r) => `<div class="pv-row" style="display:block"><span class="stars">★★★★★</span><br>“${esc(r.quote.slice(0, 90))}${r.quote.length > 90 ? '…' : ''}”</div>`).join('')}</div>`);
  }
  return phone(site, snap, pagePath(snap, key), `Their ${key === 'home' ? 'Home' : pageLabel(snap, key)} page, as you build it`, out);
}

// The Pages list: every page the builder has, in today's menu order, then the pages
// she added, and Privacy, which stays fixed. ?new=1 opens New page.
// Waitlist is the menu's button, one link, so a page can't go under it (yet: the menu editor).
// The groups a page of hers can go in: the menu's, but not a button (one button, one link).
const groupsOf = (build) => ({ '': 'Not in the menu', ...Object.fromEntries(menuOf(build).filter((g) => !g.button).map((g) => [g.id, g.label || 'A group with no name'])) });
function newPageCard(GROUPS, input = {}, error = null) {
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
  const menu = menuOf(build);
  const inGroup = (k) => { const id = groupOf(menu, k); return id ? menu.find((g) => g.id === id).label : null; };
  const mine = customPages(build).map((c) => row(c.path, pageLabel(snap, c.id), `/admin/${sub}/pages/${c.id}`, `${count(c.id)} · <span class="spill brass">Added</span> · ${inGroup(c.id) ? `in ${esc(inGroup(c.id))}` : 'not in the menu'}${offNote(c.id)}`));
  const fixed = row(PAGES.privacy.path, PAGES.privacy.label, null, 'written for her by KennelPort, fixed');
  const profiles = Object.entries(PROFILES).map(([k, n]) => row(PROFILE_PATHS[k], n, `/admin/${sub}/pages/${k}`, `what it shows${profileChanged(build, k) ? ' · <span class="chg">changed</span>' : ' · as today'}`));
  return `<div class="build"><div class="stack">
    ${adding ? `<form method="post" class="stack">${newPageCard(groupsOf(build), input, error)}</form>` : ''}
    <section class="card"><div class="between"><h2>${rows.length + mine.length + 1} pages</h2>${adding ? '' : '<a class="button small primary" href="?new=1#new-page">' + svg('plus') + ' New page</a>'}</div><ul class="list pages">${rows.join('')}</ul>
      ${mine.length ? `<h2 class="mt">Pages you added</h2><ul class="list pages">${mine.join('')}</ul>` : ''}<ul class="list pages">${fixed}</ul>
      <h2 class="mt">Every dog, litter and puppy</h2><p class="small muted">Each record's own page. One setting for the whole site.</p><ul class="list pages">${profiles.join('')}</ul></section>
    <section class="card band"><p class="small">A page you add is the breeder's to switch on or off, name in her menu and word, like any page. Where each page sits in the menu is in <a href="/admin/${sub}/menu">Menu</a>. A FAQ spot or a badge row can go on any page, yours too, from its Add a block: the breeder then sees that page in the tick boxes on her questions and products. Page addresses for the breeder come next.</p></section>
  </div><div class="pvwrap" id="preview">${pagePreview(snap, 'home', pageBlocks(build, 'home'), site)}${await previewLink(env, site)}</div></div>`;
}

// What "The page" says about switching it off and its address. A page of hers
// has its name, address and menu group here, and can be removed.
const FIXED_PATHS = ['waitlist', 'waitlist_help'];
function pageCard(snap, key, build) {
  const c = customPage(snap, key);
  if (c) {
    return `<section class="card"><div class="fgroup"><h2>The page <span class="spill brass">Added</span></h2><input type="hidden" name="page.present" value="1"><div class="fgrid">
      ${field('page.name', c.name, { label: 'Starting name', hint: 'The breeder can rename it in her menu.' })}
      ${field('page.path', c.path, { label: 'Address', hint: 'Letters, numbers and hyphens. Renaming it for the breeder comes with the menu.' })}
      ${select('page.group', groupOf(menuOf(build), key) ?? '', groupsOf(build), 'In the menu under')}</div>
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
  // A photo block's spot: its photo (served through the admin view of her site), and
  // her photo library window, from her Site Manager.
  const pics = { build, photos: open && blocks.some((b) => b.id === open && ['photo', 'overlay', 'collage', 'beside', 'gallery'].includes(b.type))
    ? (await env.DB.prepare('SELECT id FROM photos WHERE site_id = ? AND removed_at IS NULL').bind(site.id).all()).results : null,
  albums: open && blocks.some((b) => b.id === open && b.type === 'gallery')
    ? (await env.DB.prepare('SELECT id, title, show_on_site FROM albums WHERE site_id = ? ORDER BY sort, title').bind(site.id).all()).results : [],
  url: (id) => `/admin/${site.subdomain}/site/_kp/p/${encodeURIComponent(id)}?s=t`,
    library: { list: `/s/${site.subdomain}/photos/library`, upload: `/s/${site.subdomain}/photos/upload`, tags: '', alt: '' } };
  const changed = pageChanged(build, key);
  const group = (data, title) => {
    const rows = adds.filter((x) => (data === 'own' ? BLOCK_TYPES[x.type].kind === 'own' : BLOCK_TYPES[x.type].kind !== 'own' && (BLOCK_TYPES[x.type].kind === 'data') === data));
    return rows.length ? `<div class="fgroup"><h2>${title}</h2><ul class="list">${rows.map((x) => {
      const b = { type: x.type, id: x.id };
      const T = BLOCK_TYPES[x.type];
      return `<li><span class="ico">${svg(T.ic)}</span><span class="grow"><b>${esc(blockName(key, b))}</b>${blockHint(key, b) ? `<br><span class="small muted">${esc(blockHint(key, b))}</span>` : ''}</span><button class="button small" name="act" value="add:${x.type}${x.id ? `:${esc(x.id)}` : ''}">Add</button></li>`;
    }).join('')}</ul></div>` : '';
  };
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    ${pageCard(snap, key, build)}
    <section class="card"><div class="between"><h2>Blocks, top to bottom</h2>${adds.length ? `<button class="button small primary" name="act" value="${open === 'add' ? 'close' : 'adding'}" aria-expanded="${open === 'add'}">${svg('plus')} Add a block</button>` : ''}</div>
      ${open === 'add' ? `<div class="addblock"><p class="small muted">It goes at the bottom; move it up from there.</p>${group(true, 'From KennelOS and her records')}${group('own', 'Your own blocks')}${group(false, key === 'home' ? 'Her words and photos' : 'This page\'s own')}</div>` : ''}
      <p class="small muted">You place and order them. The breeder can switch each one off and reword it, never move it.${changed || isCustom(key) ? '' : ` This is today's ${key === 'home' ? 'Home' : 'page'}.`}</p>
      <ul class="mvl">${blocks.map((b, i) => blockRow(snap, key, b, i, blocks.length, open, pics)).join('')}</ul>
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

// ---------- the menu (step 3.4) ----------

// One item's title and the line under it.
function itemLine(snap, it) {
  if (it.type === 'link') return [it.text || 'An outside link', `Outside link · ${it.url}`];
  if (it.type === 'place') {
    const P = MENU_PLACES[it.place];
    return [it.text || P.name, `A place on ${pageLabel(snap, P.page)} · #${it.place.split('#')[1]} · shows ${P.when}`];
  }
  const off = snap.pages[it.page]?.enabled === false ? ' · off by the breeder' : '';
  return [pageLabel(snap, it.page), `Page · ${pagePath(snap, it.page)}${it.fallback ? ' · only while no other link to it here shows' : ''}${off}`];
}

// What can be added to a group: every page (Privacy aside), the places, an outside link.
function addOptions(snap, build) {
  const pages = [...Object.keys(PAGES).filter((k) => k !== 'privacy'), ...customPages(build).map((c) => c.id)];
  return {
    '': 'Choose…',
    ...Object.fromEntries(pages.map((k) => [`page:${k}`, `Page: ${pageLabel(snap, k)}`])),
    ...Object.fromEntries(Object.entries(MENU_PLACES).map(([k, P]) => [`place:${k}`, `Place: ${P.name} (${pageLabel(snap, P.page)})`])),
    link: 'An outside link (words and address below)',
  };
}

// The phone beside it: each group as the site shows it today, with what hides.
function menuPreview(snap, site, menu) {
  const today = new Date().toISOString().slice(0, 10);
  const shown = menuGroups({ ...snap, layout: { ...snap.layout, menu } }, { today, origin: '', path: '/', preview: true, portal: Boolean(site.portal_on) });
  const out = menu.map((g) => {
    const s = shown.find((x) => x.key === g.id);
    if (!s) return `<div class="pvb ghost">${esc(g.label || 'A group with no name')}: nothing in it shows right now, so it hides</div>`;
    if (g.button) return `<div class="pvb"><div class="pv-row"><span class="pv-pill">${esc(s.links[0].text)}</span><span class="small muted">a button${g.footer ? '' : ' · not in the footer'}</span></div></div>`;
    return `<div class="pvb"><span class="eyebrow">${esc(g.label)}${g.footer ? '' : ' · not in the footer'}</span>${s.links.map((l) => `<div class="pv-row">${esc(l.text)}</div>`).join('')}</div>`;
  });
  return phone(site, snap, '/', 'Their menu, as it shows today', out);
}

function menuScreen(snap, build, site, menu, { open = null, error = null } = {}) {
  const groupOpts = Object.fromEntries(menu.map((g, gi) => [String(gi), g.label || 'A group with no name']));
  const adds = addOptions(snap, build);
  const listed = new Set(menu.flatMap((g) => g.items.filter((it) => it.type === 'page').map((it) => it.page)));
  const out = [...Object.keys(PAGES).filter((k) => k !== 'privacy'), ...customPages(build).map((c) => c.id)].filter((k) => !listed.has(k));
  const item = (g, gi, it, ii) => {
    const [title, line] = itemLine(snap, it);
    const id = `${gi}.${ii}`;
    const isOpen = open === id;
    const pre = `i.${gi}.${ii}`;
    const twin = it.type === 'page' && g.items.some((x, xi) => xi !== ii && (x.page === it.page || MENU_PLACES[x.place]?.page === it.page));
    const set = !isOpen ? '' : `<div class="set"><input type="hidden" name="${pre}.present" value="1"><div class="fgrid">
        ${select(`${pre}.to`, String(gi), groupOpts, 'In the group')}
        ${it.type === 'link' ? `${field(`${pre}.text`, it.text, { label: 'Its words' })}${field(`${pre}.url`, it.url, { label: 'Its address', ph: 'https://', hint: 'Opens in a new tab.' })}` : ''}
        ${it.type === 'place' ? field(`${pre}.text`, it.text ?? '', { label: 'Its words', ph: MENU_PLACES[it.place].name, hint: 'Leave empty for the site\'s own.' }) : ''}</div>
        ${it.type === 'page' ? `<div class="switches boxed">${toggle(`${pre}.fallback`, it.fallback, 'Show only while no other link to this page in the group shows')}</div>${twin ? '' : '<p class="small muted">Only matters with another link to the same page in this group, like today\'s Puppies after Available and Upcoming litters.</p>'}` : ''}
        ${it.type === 'page' ? '<p class="small muted">The breeder names it in her menu.</p>' : ''}</div>`;
    return `<li class="mvr item" id="i-${gi}-${ii}">${mvBtns(`imv:${gi}:${ii}`, ii, g.items.length)}<span class="ttl">${esc(title)}<small>${esc(line)}</small></span>
      <span class="end"><button class="button small" name="act" value="${isOpen ? 'close' : `iopen:${id}`}" aria-expanded="${isOpen}">${isOpen ? 'Done' : 'Settings'}</button><button class="ib" name="act" value="idel:${gi}:${ii}" aria-label="Take ${esc(title)} out of the menu">${svg('trash')}</button></span>${set}</li>`;
  };
  const group = (g, gi) => `<section class="card" id="g-${gi}"><input type="hidden" name="g.${gi}.present" value="1">
      <div class="mvr item">${mvBtns(`gmv:${gi}`, gi, menu.length)}<label><span class="sr">Group name</span><input type="text" name="g.${gi}.label" value="${esc(g.label)}" maxlength="${MENU_LIMITS.label}" placeholder="Group name"></label>
        <span class="end"><button class="ib" name="act" value="gdel:${gi}" aria-label="Remove the ${esc(g.label)} group">${svg('trash')}</button></span></div>
      <ul class="mvl mt">${g.items.map((it, ii) => item(g, gi, it, ii)).join('') || '<li class="small muted">Nothing in it yet, so the site leaves it out.</li>'}</ul>
      <div class="switches boxed">${toggle(`g.${gi}.button`, g.button, 'Show it as a button, like Waitlist: its first link that shows')}${toggle(`g.${gi}.footer`, g.footer, 'Show it in the footer')}</div>
      <details class="fgroup fold"><summary>Add to ${esc(g.label || 'this group')}</summary><div class="fgrid">${select(`add.${gi}`, '', adds, 'A page, a place on a page, or an outside link', '')}
        ${field(`addtext.${gi}`, '', { label: 'An outside link\'s words' })}${field(`addurl.${gi}`, '', { label: 'Its address', ph: 'https://' })}</div>
      <div class="row"><button class="button small" name="act" value="add:${gi}">${svg('plus')} Add</button></div></details></section>`;
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
      <p class="small muted">Groups and their links in your order. The breeder names her pages and switches them off; she never moves them. A link hides by itself while what it points to has nothing to show, and a group with nothing showing hides.</p>
      ${menu.map(group).join('')}
      <div class="row"><button class="button small primary" name="act" value="newgroup"${menu.length >= MENU_LIMITS.groups ? ' disabled' : ''}>${svg('plus')} New group</button>${menuChanged(build) ? '<button class="link small" name="act" value="default">Back to today\'s menu</button>' : ''}</div>
      ${out.length ? `<section class="card band"><h2>Not in the menu</h2><p class="small">${out.map((k) => esc(pageLabel(snap, k))).join(' · ')}</p><p class="small muted">These pages keep their addresses; links to them work.</p></section>` : ''}
      <section class="card band"><p class="small">${menuChanged(build) ? 'The footer follows this menu: a column per group shown in the footer, its pages and outside links.' : 'Today\'s menu. The footer keeps today\'s three columns until you change the menu; then it follows it, a column per group.'}</p></section>
    </div>`;
}

// The menu as the form has it, then what was pressed.
function menuFromForm(menu, form, snap) {
  const get = (k) => form.get(k);
  let groups = menu.map((g, gi) => {
    if (get(`g.${gi}.present`) == null) return structuredClone(g);
    return { ...structuredClone(g), label: String(get(`g.${gi}.label`) ?? ''), button: get(`g.${gi}.button`) != null, footer: get(`g.${gi}.footer`) != null };
  });
  // The open item's settings, and a move to another group.
  const moves = [];
  groups.forEach((g, gi) => g.items.forEach((it, ii) => {
    const pre = `i.${gi}.${ii}`;
    if (get(`${pre}.present`) == null) return;
    if (it.type === 'link') { it.text = String(get(`${pre}.text`) ?? ''); it.url = String(get(`${pre}.url`) ?? ''); }
    if (it.type === 'place') { const t = String(get(`${pre}.text`) ?? '').trim(); if (t) it.text = t; else delete it.text; }
    if (it.type === 'page') { if (get(`${pre}.fallback`) != null) it.fallback = true; else delete it.fallback; }
    const to = Number(get(`${pre}.to`));
    if (Number.isInteger(to) && to !== gi && groups[to]) moves.push([gi, ii, to]);
  }));
  for (const [gi, ii, to] of moves) groups[to].items.push(groups[gi].items[ii]);
  for (const [gi, ii] of moves.sort((a, b) => b[1] - a[1])) groups[gi].items.splice(ii, 1);
  const act = String(get('act') ?? '');
  const [verb, a, b, dir] = act.split(':');
  let open = null;
  const gi = Number(a);
  if (verb === 'gmv' && groups[gi]) groups = moved(groups, gi, b);
  else if (verb === 'gdel' && groups[gi]) groups = groups.filter((_, i) => i !== gi);
  else if (verb === 'imv' && groups[gi]?.items[Number(b)]) groups[gi].items = moved(groups[gi].items, Number(b), dir);
  else if (verb === 'idel' && groups[gi]) groups[gi].items = groups[gi].items.filter((_, i) => i !== Number(b));
  else if (verb === 'iopen') open = a;
  else if (verb === 'newgroup' && groups.length < MENU_LIMITS.groups) {
    const ids = new Set(groups.map((g) => g.id));
    let n = 2;
    while (ids.has(`group-${n}`)) n++;
    groups.push({ id: `group-${n}`, label: 'New group', button: false, footer: true, items: [] });
  } else if (verb === 'add' && groups[gi]) {
    const what = String(get(`add.${gi}`) ?? '');
    const [kind, ref] = what.split(/:(.+)/);
    const items = groups[gi].items;
    if (kind === 'page' && ref) items.push({ type: 'page', page: ref });
    else if (kind === 'place' && Object.hasOwn(MENU_PLACES, ref)) items.push({ type: 'place', place: ref });
    else if (kind === 'link') items.push({ type: 'link', text: String(get(`addtext.${gi}`) ?? ''), url: String(get(`addurl.${gi}`) ?? '') });
    else throw new MenuError('Choose what to add first.');
    if (items.length > MENU_LIMITS.items) throw new MenuError(`A group holds ${MENU_LIMITS.items} links at most.`);
  }
  return { menu: groups, open, reset: verb === 'default', where: Number.isInteger(gi) && groups[gi] ? `#g-${gi}` : '' };
}

async function menuRoute({ env, request, url, site, build, page }) {
  const snap = await buildSnapshot(env, site.id);
  useFormats(snap);
  let menu = menuOf(build);
  let error = null;
  let open = url.searchParams.get('open');
  if (request.method === 'POST') {
    const form = await request.formData();
    try {
      const out = menuFromForm(menu, form, snap);
      menu = out.menu;
      open = out.open;
      const next = out.reset ? (({ menu: _, ...rest }) => rest)(build) : withMenu(build, menu);
      await saveBuild(env, site.id, next);
      return redirect(`/admin/${site.subdomain}/menu?saved=1${open ? `&open=${encodeURIComponent(open)}#i-${open.replace('.', '-')}` : out.where}`);
    } catch (err) {
      if (!(err instanceof MenuError)) throw err;
      error = err.message;
    }
  }
  const saved = url.searchParams.get('saved') && !error;
  const body = `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>${isDemo(site) ? ' <span class="spill brass">Demo</span>' : ''}<h1>Menu</h1>
    ${saved ? '<p class="notice" role="status">Saved. The site shows it once the breeder (or you) publishes.</p>' : ''}
    <form method="post" id="build" class="build"><button class="sr" tabindex="-1" aria-hidden="true">Save</button>${menuScreen(snap, build, site, menu, { open, error })}
      <div class="pvwrap" id="preview">${menuPreview(snap, site, menu)}${await previewLink(env, site)}</div>
      <div class="actionbar"><div class="in"><span class="ico">${ic('eye')}</span><p><b>Their menu</b>Save, then the preview shows it. Publishing puts it live.</p><a class="button small seeit" href="#preview">See it</a><button class="primary small">Save</button></div></div></form>`;
  return page(`Menu · ${site.kennel_name || site.subdomain}`, body, { admin: { nav: adminNav(site, 'menu'), site } });
}

// ---------- routes ----------

export async function handleBuilder({ env, request, url, user, page }) {
  if (!user?.admin) return null;
  const path = url.pathname;
  if (path === '/admin' || path === '/admin/') return page('Every site', await everySite(env), { admin: { nav: adminNav(null, 'sites') } });
  const wm = path.match(/^\/admin\/wording(?:\/([a-z]+))?$/);
  if (wm) return wordingRoute({ env, request, url, page, site: null, screen: wm[1] ?? null });
  const sv = path.match(/^\/admin\/([a-z0-9-]+)\/site(\/.*)?$/);
  const m = sv ? [null, sv[1], 'site'] : path.match(/^\/admin\/([a-z0-9-]+)\/(pages|pages\/[a-z0-9_-]+|menu|rules|dogs|wording|formats|kennelos|timing|instructions|instructions\/[a-z]+)$/);
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
  if (screen === 'menu') return menuRoute({ env, request, url, site, build, page });
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
  if (Object.hasOwn(PROFILES, key)) return profileRoute({ env, request, url, site, build, page, kind: key });
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

// ---------- what each profile page shows (step 3.7) ----------
//
// Every dog's, litter's or puppy's own page: each part's items in order, each with
// its switch and, where it can move, the part it sits in; then a dog's or a puppy's
// facts. No prototype screen for it: built from the card editor's ordered lists
// (showList), its switches and the pinned action bar.

// One part's rows: its items that are on, in order, then those off that sit here when on.
function profilePart(kind, pr, part) {
  const on = pr.parts[part];
  const placed = new Set(Object.values(pr.parts).flat());
  const off = Object.keys(PROFILE_ITEMS[kind]).filter((x) => !placed.has(x) && homePart(kind, x) === part);
  const order = [...on, ...off];
  const parts = PROFILE_PARTS[kind];
  const row = (x, i) => {
    const fixed = PROFILE_FIXED[kind].includes(x);
    const movable = !PROFILE_ONLY[kind][x] && Object.keys(parts).length > 1;
    const sel = movable ? `<select name="p.at.${x}" aria-label="${esc(PROFILE_ITEMS[kind][x])}: where it sits">${Object.entries(parts).map(([v, l]) => `<option value="${v}"${v === part ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>` : '';
    const box = fixed ? `<label class="check"><input type="checkbox" checked disabled aria-label="${esc(PROFILE_ITEMS[kind][x])}: always on"></label>`
      : `<label class="check"><input type="checkbox" name="p.on.${x}"${on.includes(x) ? ' checked' : ''} aria-label="${esc(PROFILE_ITEMS[kind][x])}"></label>`;
    return `<li class="mvr item${on.includes(x) ? '' : ' off'}">${mvBtns(`pmv:${x}`, i, order.length)}<span class="ttl">${esc(PROFILE_ITEMS[kind][x])}${fixed ? '<small>Always on</small>' : ''}${sel}</span>
      <span class="end switches">${box}</span></li>`;
  };
  return `<div class="fld"><span class="fldt">${esc(parts[part])}</span><input type="hidden" name="p.part.${part}" value="${esc(order.join(','))}">
    <ul class="mvl">${order.length ? order.map(row).join('') : '<li class="mvr item off"><span class="ttl"><small>Nothing here</small></span></li>'}</ul></div>`;
}

function profileFacts(kind, pr) {
  const F = PROFILE_FACTS[kind];
  const order = [...pr.facts, ...Object.keys(F).filter((x) => !pr.facts.includes(x))];
  return `<input type="hidden" name="p.facts" value="${esc(order.join(','))}"><ul class="mvl">${order.map((x, i) => `<li class="mvr item${pr.facts.includes(x) ? '' : ' off'}">${mvBtns(`fmv:${x}`, i, order.length)}<span class="ttl">${esc(F[x])}</span>
    <span class="end switches"><label class="check"><input type="checkbox" name="p.fact.${x}"${pr.facts.includes(x) ? ' checked' : ''} aria-label="${esc(F[x])}"></label></span></li>`).join('')}</ul>`;
}

// The phone beside it: one of her records' pages, sketched part by part.
function profilePreview(snap, site, kind, pr) {
  const l = snap.litters.find((x) => x.puppies.length) ?? snap.litters[0];
  const rec = kind === 'dog' ? snap.dogs[0] : kind === 'litter' ? l : l?.puppies[0];
  const name = rec ? (kind === 'dog' ? rec.call_name : rec.name) : PROFILES[kind];
  const path = !rec ? PROFILE_PATHS[kind] : kind === 'dog' ? `/dogs/${rec.slug}` : kind === 'litter' ? `/litters/${rec.slug}` : `/litters/${l.slug}/${rec.slug}`;
  const item = (x) => {
    if (x === 'name') return `<h3>${esc(name)}</h3>`;
    if (x === 'faq') { const q = placedFaqs(snap, kind); return q.length ? q.map((e) => `<div class="pv-q">${esc(e.heading)}</div>`).join('') : '<div class="pv-row small muted">FAQ spot: no questions ticked for it, so it hides</div>'; }
    if (x === 'badges') { const b = badgesOn(snap, kind); return `<div class="pv-row">${b.length ? b.map((y) => `<span class="pv-pill">${esc(y.name)}</span>`).join(' ') : '<span class="small muted">Badge row: no badges ticked for it, so it hides</span>'}</div>`; }
    return `<div class="pv-row small">${esc(PROFILE_ITEMS[kind][x].replace(/:.*$/, ''))}</div>`;
  };
  const out = [];
  if (kind === 'litter') {
    out.push(`<div class="pvb sand"><h3>${esc(name)}</h3>${pr.parts.head.map((x) => `<p class="small muted">${esc(PROFILE_ITEMS.litter[x])}</p>`).join('')}</div>`);
    for (const x of pr.parts.body) out.push(`<div class="pvb">${item(x)}</div>`);
  } else {
    for (const x of pr.parts.above) out.push(`<div class="pvb">${item(x)}</div>`);
    out.push(`<div class="pv-hero"><span class="ph"></span></div><div class="pvb">${pr.parts.side.map(item).join('')}</div>`);
    for (const x of pr.parts.below) out.push(`<div class="pvb">${item(x)}</div>`);
  }
  return phone(site, snap, path, `${PROFILES[kind]}, as you set it`, out);
}

async function profileRoute({ env, request, url, site, build, page, kind }) {
  const sub = esc(site.subdomain);
  if (request.method === 'POST') {
    const form = await request.formData();
    await saveBuild(env, site.id, withProfile(build, kind, profileFromForm(kind, (k) => form.get(k))));
    return redirect(`/admin/${site.subdomain}/pages/${kind}?saved=1`);
  }
  const snap = await buildSnapshot(env, site.id);
  useFormats(snap);
  const pr = profileOf(build, kind);
  const changed = profileChanged(build, kind);
  const title = PROFILES[kind];
  const facts = PROFILE_FACTS[kind] ? `<section class="card"><div class="fgroup"><h2>Facts</h2><p class="small muted">The facts list beside the photo, top to bottom. A fact she hasn't filled in leaves itself out.</p>${profileFacts(kind, pr)}</div></section>` : '';
  const spots = `A FAQ spot or a badge row that is on here shows in the breeder's tick boxes, on her questions and her products, as ${esc(kind === 'litter' ? '"Every litter\'s page"' : kind === 'dog' ? '"Every dog\'s profile"' : '"Every puppy\'s profile"')}.`;
  const body = `<p class="crumb"><a href="/admin/${sub}/pages">‹ Pages</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>${isDemo(site) ? ' <span class="spill brass">Demo</span>' : ''}<h1>${esc(title)}</h1>
    <p class="muted">What every ${kind}'s own page shows, and where. The breeder words her records; you decide what the page carries.${changed ? '' : ' This is today\'s page.'}</p>
    ${url.searchParams.get('saved') ? '<p class="notice" role="status">Saved. The site shows it once the breeder (or you) publishes.</p>' : ''}
    <form method="post" id="build" class="build"><button class="sr" tabindex="-1" aria-hidden="true">Save</button><div class="stack">
      <section class="card"><div class="fgroup"><h2>What it shows, top to bottom</h2><p class="small muted">${kind === 'litter' ? 'Switch each one on or off, and order what sits under the heading.' : 'Switch each one on or off, order it within its part, or move it to another part.'} ${spots}</p>
        ${Object.keys(PROFILE_PARTS[kind]).map((p) => profilePart(kind, pr, p)).join('')}</div>
        ${changed ? '<div class="row"><button class="link small" name="act" value="default">Back to today\'s page</button></div>' : ''}</section>
      ${facts}</div>
      <div class="pvwrap" id="preview">${profilePreview(snap, site, kind, pr)}${await previewLink(env, site)}</div>
      <div class="actionbar"><div class="in"><span class="ico">${ic('eye')}</span><p><b>${esc(title)}</b>Save, then the preview shows it. Publishing puts it live.</p><a class="button small seeit" href="#preview">See it</a><button class="primary small">Save</button></div></div></form>`;
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
      <section class="card band"><p class="small">The list holds every field's label and help, the choices in lists, the notes after a change, each screen's own headings, instructions, buttons and empty messages, signing in, and the errors from her forms' checks. Still to join it: the errors from the waitlist, photos, videos, KennelOS linking and sign-in, and the family portal's screens.</p></section>`;
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
      <span class="hint">${follows ? `${site && every[it.key] != null ? 'Every site' : 'Today'}: “${esc(follows)}”${/[.!?…:]$/.test(follows) ? '' : '.'}` : 'Empty today.'}${it.vars.length ? ` Can use ${it.vars.map((v) => `{${v}}`).join(', ')}.` : ' No names to fill in here.'}</span></label></li>`;
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
