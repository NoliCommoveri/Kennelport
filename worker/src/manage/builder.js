// The owner's build tools, in her admin view of the Site Manager
// (docs/Site_Builder_Plan.md, step 1: display and timing rules). Drawn from the
// site builder prototype (docs/reference/site-builder-prototype.html): Every site
// as tiles; per site, Display rules (a card per pup status, then registration and
// prices) and Timing (a row per rule with its default), each beside a phone
// preview of the breeder's Puppies page drawn with the site's saved rules, and
// the pinned action bar to save.
//
//   GET  /admin                     Every site
//   GET  /admin/<sub>/rules         Pups: status, registration and price rules
//   GET  /admin/<sub>/dogs          Dogs: the Dogs page's wording, adults' prices
//   GET  /admin/<sub>/wording       Wording: the rest of the site's fixed lines
//   GET  /admin/<sub>/formats       Formats: dates, sex words, money
//   GET  /admin/<sub>/kennelos      From KennelOS: how its data lands
//   GET  /admin/<sub>/timing        Timing
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
  useFormats, word, litterRows, dogGroups, sitePrice, pricesOff, fmtDate, sexWord,
} from '../render/parts.js';
import { makePreviewToken } from '../site.js';
import { siteLink } from '../ops/sites.js';

const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });
const ic = (n) => `<span class="ic" aria-hidden="true"><svg class="i"><use href="#i-${n}"/></svg></span>`;
const svg = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Today's two starting templates (plan, decision 12), as the site's build stands
// until templates are built (step 3): with the portal or without.
const startingTemplate = (site) => (site.portal_on ? 'Website and family portal' : 'Website');

// A site's screens: [path, title, icon, short name for the phone's tabs].
const SCREENS = [
  ['rules', 'Pups', 'paw', 'Pups'], ['dogs', 'Dogs', 'star', 'Dogs'], ['wording', 'Wording', 'pages', 'Words'],
  ['formats', 'Formats', 'cal', 'Formats'], ['kennelos', 'From KennelOS', 'link', 'KennelOS'], ['timing', 'Timing', 'clock', 'Timing'],
];

// The admin nav: Every site, then this site's screens (bottom on a phone, down the
// side on a computer, as the breeder's tabs are).
export function adminNav(site, cur) {
  const items = site ? SCREENS.map(([k, l, i, short]) => [k, l, i, short]) : [];
  const link = (href, label, icon, on, short = label) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${svg(icon)}<span class="lg">${esc(label)}</span><span class="sm">${esc(short)}</span></a>`;
  return `<nav class="apptabs adm" aria-label="Site builder">${link('/admin', 'Every site', 'globe', !site, 'Sites')}
    ${site ? `<span class="lbl">Building</span><span class="site">${esc(site.kennel_name || site.subdomain)}<small>${esc(startingTemplate(site))}</small></span>` : ''}
    ${items.map(([k, l, i, short]) => link(`/admin/${esc(site.subdomain)}/${k}`, l, i, cur === k, short)).join('')}</nav>`;
}

// ---------- Every site ----------

async function everySite(env) {
  const { results: sites } = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, s.portal_on, b.build FROM sites s
    LEFT JOIN site_builds b ON b.site_id = s.id WHERE s.status != 'closed' ORDER BY s.kennel_name, s.subdomain`).all();
  const tile = (s) => {
    let build = {};
    try { build = s.build ? JSON.parse(s.build) : {}; } catch { /* the defaults */ }
    const n = changedCount(build);
    const changed = n.rules + n.timing;
    return `<a class="tile s2${s.portal_on ? ' green' : ''}" href="/admin/${esc(s.subdomain)}/rules">
      <span class="eyebrow">${esc(startingTemplate(s))}</span><h2>${esc(s.kennel_name || s.subdomain)}</h2><span class="meta">${esc(s.subdomain)}.kennelport.com · ${esc({ draft: 'Not published yet', live: 'Live', suspended: 'Switched off' }[s.status] ?? s.status)}</span>
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
    <div class="phone"><div class="pv-url">${esc(site.subdomain)}.kennelport.com${esc(path)}</div><div class="scr">
      <div class="pv-top"><div class="nm">${esc(snap.site.kennel_name)}</div></div>
      ${blocks.join('') || '<div class="pvb ghost">Nothing to show yet</div>'}
      <div class="pv-foot"><b>${esc(snap.site.kennel_name)}</b><span>${esc(word(snap, 'copyright', { year: new Date().getUTCFullYear(), kennel: snap.site.kennel_name }))}</span><span>Made with KennelPort</span></div></div></div>`;
const previewLink = async (env, site) => `<a class="small" href="${esc(siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(await makePreviewToken(env, site.id, 1))}`))}" target="_blank" rel="noopener">Their whole site, as a preview ›</a>`;

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
  const link = siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(await makePreviewToken(env, site.id, 1))}`);
  return `<div class="pvwrap" id="preview"><span class="cap">Their Puppies page, with these rules</span>
    <div class="phone"><div class="pv-url">${esc(site.subdomain)}.kennelport.com/litters</div><div class="scr">
      <div class="pv-top"><div class="nm">${esc(snap.site.kennel_name)}</div></div>
      ${blocks.join('') || '<div class="pvb ghost">No litters with puppies yet</div>'}
      <div class="pv-foot"><b>${esc(snap.site.kennel_name)}</b><span>Made with KennelPort</span></div></div></div>
    <a class="small" href="${esc(link)}" target="_blank" rel="noopener">Their whole site, as a preview ›</a></div>`;
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

// ---------- routes ----------

export async function handleBuilder({ env, request, url, user, page }) {
  if (!user?.admin) return null;
  const path = url.pathname;
  if (path === '/admin' || path === '/admin/') return page('Every site', await everySite(env), { admin: { nav: adminNav(null, 'sites') } });
  const m = path.match(/^\/admin\/([a-z0-9-]+)\/(rules|dogs|wording|formats|kennelos|timing)$/);
  if (!m) return null;
  const site = await env.DB.prepare("SELECT id, subdomain, kennel_name, status, portal_on FROM sites WHERE subdomain = ? AND status != 'closed'").bind(m[1]).first();
  if (!site) return null;
  const screen = m[2];
  const build = await loadBuild(env, site.id);
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
  const body = `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span><h1>${title}</h1>
    ${lede ? `<p class="muted">${lede}</p>` : ''}
    ${saved ? '<p class="notice" role="status">Saved. The site shows it once the breeder (or you) publishes.</p>' : ''}
    <form method="post" id="build" class="build${side ? '' : ' solo'}"><button class="sr" tabindex="-1" aria-hidden="true">Save</button>${editor}${side}
      <div class="actionbar"><div class="in"><span class="ico">${ic('eye')}</span><p><b>Their website</b>Save, then the preview shows it. Publishing puts it live.</p>${side ? '<a class="button small seeit" href="#preview">See it</a>' : ''}<button class="primary small">Save</button></div></div></form>`;
  return page(`${title} · ${site.kennel_name || site.subdomain}`, body, { admin: { nav: adminNav(site, screen), site } });
}
