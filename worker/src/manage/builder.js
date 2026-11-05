// The owner's build tools, in her admin view of the Site Manager
// (docs/Site_Builder_Plan.md, step 1: display and timing rules). Drawn from the
// site builder prototype (docs/reference/site-builder-prototype.html): Every site
// as tiles; per site, Display rules (a card per pup status, then registration and
// prices) and Timing (a row per rule with its default), each beside a phone
// preview of the breeder's Puppies page drawn with the site's saved rules, and
// the pinned action bar to save.
//
//   GET  /admin                     Every site
//   GET  /admin/<sub>/rules         Display rules       POST: save (or one back to default)
//   GET  /admin/<sub>/timing        Timing              POST: save (or one back to default)
//
// Only for admin (admin.js); a breeder never reaches these.
import { escapeHtml as esc } from '../lib/html.js';
import {
  PUP_STATUSES, STATUS_NOTES, PILLS, DEFAULT_RULES, DEFAULT_TIMING, RuleError, rulesFor, rulesFromForm, timingFromForm,
  withPart, changedCount, loadBuild, saveBuild,
} from '../content/rules.js';
import { buildSnapshot } from '../publish.js';
import {
  olderPuppies, depositsAhead, puppyStatus, puppyPriceText, regText, statusRule, sortPuppies, fullRegHref, rulesOf,
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

// The admin nav: Every site, then this site's screens (bottom on a phone, down the
// side on a computer, as the breeder's tabs are).
export function adminNav(site, cur) {
  const items = site ? [['rules', 'Display rules', 'sliders'], ['timing', 'Timing', 'clock']] : [];
  const link = (href, label, icon, on, short = label) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${svg(icon)}<span class="lg">${esc(label)}</span><span class="sm">${esc(short)}</span></a>`;
  return `<nav class="apptabs adm" aria-label="Site builder">${link('/admin', 'Every site', 'globe', !site, 'Sites')}
    ${site ? `<span class="lbl">Building</span><span class="site">${esc(site.kennel_name || site.subdomain)}<small>${esc(startingTemplate(site))}</small></span>` : ''}
    ${items.map(([k, l, i]) => link(`/admin/${esc(site.subdomain)}/${k}`, l, i, cur === k, l.split(' ').pop().replace(/^./, (c) => c.toUpperCase()))).join('')}</nav>`;
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

async function preview(env, site) {
  const snap = await buildSnapshot(env, site.id);
  const ctx = { today: new Date().toISOString().slice(0, 10), path: '/litters', preview: true };
  const older = olderPuppies(snap, ctx.today);
  const olderIds = new Set(older.map((o) => o.litter.id));
  const card = (l, p) => {
    const r = statusRule(snap, p);
    const words = puppyStatus(snap, l, p, ctx.today);
    const reg = regText(snap, p);
    const price = puppyPriceText(snap, l, p);
    const full = fullRegHref(snap, l, p, ctx);
    return `<div class="pvc"><span class="ph"></span><div class="t"><b>${esc(p.name)} ${sexMark(p.sex)}</b>${words ? `<span class="spill ${SPILL[r.pill] ?? 'plain'}">${esc(words)}</span>` : ''}${reg ? `<span class="muted">${esc(reg)}</span>` : ''}${price ? `<span class="price">${esc(price)}</span>` : ''}${r.ask ? '<span class="lnk">Ask about this puppy ›</span>' : ''}${full ? `<span class="lnk">${esc(rulesOf(snap).reg.ask)} ›</span>` : ''}</div></div>`;
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
const back = (key) => `<button class="link small" name="default" value="${esc(key)}">Back to default</button>`;

function rulesScreen(site, rules, error) {
  const D = DEFAULT_RULES;
  const card = (k) => {
    const r = rules.status[k];
    const name = (f) => `status.${k}.${f}`;
    return `<section class="card status-card"><div class="between"><span class="stcode"><span class="code">${k}</span>${r.show && r.words ? `<span class="spill ${SPILL[r.pill]}">${esc(r.words)}</span>` : '<span class="small muted">Not shown</span>'}</span>${same(r, D.status[k]) ? '' : back(`status.${k}`)}</div>
      <p class="small muted">${esc(STATUS_NOTES[k])}</p>
      <div class="fgrid">${field(name('words'), r.words, { label: 'Shows as', ph: 'Words on the card' })}${select(name('pill'), r.pill, PILLS, 'Colour')}</div>
      <div class="switches">${toggle(name('show'), r.show, 'Show the pup on the site')}${toggle(name('price'), r.price, 'Show its price')}${toggle(name('ask'), r.ask, '“Ask about this puppy”')}
        ${toggle(name('fullreg'), r.fullreg, `“${rules.reg.ask}” (no registration set)`)}${toggle(name('older'), r.older, 'Can be an older puppy')}${toggle(name('ribbon'), r.ribbon, 'Ribbon across its photo')}</div>
      ${select(name('order'), r.order, { 1: 'First', 2: 'Second', 3: 'Third', 4: 'Last' }, 'Order on the litter page', '')}<span class="hint">Lower comes first; equal keeps the breeder's order.</span></section>`;
  };
  const changed = (part) => (same(rules[part], D[part]) ? '' : back(part));
  const seg = (name, cur, opts) => `<div class="seg sm" role="radiogroup">${Object.entries(opts).map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${cur === v ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
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
    <section class="card"><div class="fgroup"><h2>Website</h2>${TIMING_ROWS.map(row).join('')}</div></section>
    ${site.portal_on ? '<section class="card band"><h2>Family portal</h2><p class="small">Its timing (the vet reminders, stays, invites and the rest) comes with the portal\'s build, step 4.</p></section>' : ''}</div>`;
}

// ---------- routes ----------

export async function handleBuilder({ env, request, url, user, page }) {
  if (!user?.admin) return null;
  const path = url.pathname;
  if (path === '/admin' || path === '/admin/') return page('Every site', await everySite(env), { admin: { nav: adminNav(null, 'sites') } });
  const m = path.match(/^\/admin\/([a-z0-9-]+)\/(rules|timing)$/);
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
    const reset = String(form.get('default') ?? '');
    try {
      if (screen === 'rules') {
        const next = rulesFromForm(get);
        // Back to default: one status card, Registration or Prices.
        const [part, key] = reset.split('.');
        if (part === 'status' && DEFAULT_RULES.status[key]) next.status[key] = { ...DEFAULT_RULES.status[key] };
        else if (part === 'reg' || part === 'price') next[part] = { ...DEFAULT_RULES[part] };
        await saveBuild(env, site.id, withPart(build, 'rules', next));
      } else {
        const next = timingFromForm(get);
        const key = reset.replace(/^timing\./, '');
        if (key in DEFAULT_TIMING) next[key] = DEFAULT_TIMING[key];
        await saveBuild(env, site.id, withPart(build, 'timing', next));
      }
      return redirect(`/admin/${site.subdomain}/${screen}?saved=1`);
    } catch (err) {
      if (!(err instanceof RuleError)) throw err;
      error = err.message;
    }
  }
  const saved = url.searchParams.get('saved') && !error;
  const title = screen === 'rules' ? 'Display rules' : 'Timing';
  const lede = screen === 'rules'
    ? 'KennelOS\'s values arrive unchanged. These decide how this site shows them. Today\'s behaviour is the default.'
    : 'Every “how long” and “when” that changes what this site shows. Today\'s behaviour is the default.';
  const editor = screen === 'rules' ? rulesScreen(site, rules, error) : timingScreen(site, timing, error);
  const body = `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span><h1>${title}</h1>
    <p class="muted">${lede}</p>
    ${saved ? '<p class="notice" role="status">Saved. The site shows it once the breeder (or you) publishes.</p>' : ''}
    <form method="post" id="build" class="build"><button class="sr" tabindex="-1" aria-hidden="true">Save</button>${editor}${await preview(env, site)}
      <div class="actionbar"><div class="in"><span class="ico">${ic('eye')}</span><p><b>Their website</b>Save, then the preview shows it. Publishing puts it live.</p><a class="button small seeit" href="#preview">See it</a><button class="primary small">Save</button></div></div></form>`;
  return page(`${title} · ${site.kennel_name || site.subdomain}`, body, { admin: { nav: adminNav(site, screen), site } });
}
