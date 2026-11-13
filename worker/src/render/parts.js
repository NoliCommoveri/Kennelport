// Pieces of the "ak" template shared by its pages: formatting, photos, cards and
// the menu. Every value from a snapshot passes through esc() (or attr()) here.
import { SHOW_DEFAULT, isCustom, hersOn, BLOCK_TYPES, defaultMenu, MENU_PLACES, PAGE_DEFAULTS, recordsOf, pageBlocks, DOGS_ALL } from '../content/blocks.js';
import { BLOCK_KIND, matches, ordered, grouped, GENERATIONS, tagsOf } from '../content/fields.js';
import { applyPicks } from '../content/picks.js';
import { escapeHtml as esc } from '../lib/html.js';
import { PAGES, pupStatus, slugify, pillKey } from '../content/model.js';
import { puppyPrice, litterPriceRange, depositRange } from '../content/prices.js';
import { DEFAULT_RULES, DEFAULT_TIMING, ruleKey, addDays } from '../content/rules.js';

export { esc };
export const attr = esc;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// The site's formats (content/rules.js, rules.format): dates, sex words, money.
// Rendering is synchronous, so renderPage sets them once per page (useFormats)
// rather than passing the snapshot to every date; with none set, today's.
let F = DEFAULT_RULES.format;
export function useFormats(snap) { F = { ...DEFAULT_RULES.format, ...(snap?.rules?.format ?? {}) }; }

export function fmtDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  if (F.date === 'dmy') return `${d} ${MONTHS[m - 1]} ${y}`;
  return `${F.date === 'short' ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1]} ${d}, ${y}`;
}
// "December 12": a date this year or next, where the year goes without saying.
export function fmtDay(ymd) {
  if (!ymd) return '';
  const [, m, d] = ymd.split('-').map(Number);
  if (F.day === 'dm') return `${d} ${MONTHS[m - 1]}`;
  return `${F.day === 'short' ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1]} ${d}`;
}
export function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return `${F.date === 'short' ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1]} ${y}`;
}
// A dog's or pup's sex, and a count of them ("2 girls, 1 boy").
export const sexWord = (sex) => (F.sex === 'girl_boy' ? (sex === 'female' ? 'Girl' : 'Boy') : (sex === 'female' ? 'Female' : 'Male'));
const sexCount = (sex, n) => {
  const w = F.counts === 'females_males' ? (sex === 'female' ? 'female' : 'male') : (sex === 'female' ? 'girl' : 'boy');
  return `${n} ${w}${n === 1 ? '' : 's'}`;
};
const money = (n) => {
  const num = Number(n).toLocaleString('en-US', F.cents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {});
  return F.currency_after ? `${num} ${F.currency}` : `${F.currency}${num}`;
};
// A price, or a range: "$2,500–$3,000", or "From $2,500" with the site's rule.
export function priceText(from, to, style = 'range') {
  if (from == null) return '';
  if (to == null || to === from) return money(from);
  return style === 'from' ? `From ${money(from)}` : `${money(from)}–${money(to)}`;
}

// ---------- the site's display and timing rules (content/rules.js) ----------

// From the snapshot; one built before rules existed shows today's behaviour.
export const rulesOf = (snap) => snap.rules ?? DEFAULT_RULES;
// A line of the site's fixed wording (rules.words), with its {name} and the like
// filled in. Escape it like any other text.
export function word(snap, key, vars = {}) {
  const w = rulesOf(snap).words?.[key] ?? DEFAULT_RULES.words[key] ?? '';
  return w.replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m));
}
export const timingOf = (snap) => snap.timing ?? DEFAULT_TIMING;
// Which status row a puppy reads by: its status's, or `not_open` for an available
// pup in a born litter whose deposits don't open yet (content/rules.js STATUS_ROWS).
// Without its litter and the day, its status's.
export const pupRuleKey = (snap, p, l = null, today = null) => {
  const k = ruleKey(p.status);
  return k === 'available' && l && today && depositsAhead(snap, l, today) ? 'not_open' : k;
};
// The rule for a puppy's status. A snapshot from before the not_open row reads it
// as today did: available's, with the price rules' "Available on {date}".
export function statusRule(snap, p, l = null, today = null) {
  const R = rulesOf(snap);
  const k = pupRuleKey(snap, p, l, today);
  if (k === 'not_open' && !R.status.not_open) return { ...R.status.available, words: R.price?.before ?? DEFAULT_RULES.status.not_open.words };
  return R.status[k] ?? DEFAULT_RULES.status.hidden;
}
// What replaces a price where prices are off.
export const pricesOff = (snap) => rulesOf(snap).price.off;
export const sitePrice = (snap, from, to) => priceText(from, to, rulesOf(snap).price.style);

// Paragraphs from multi-line text.
export const paras = (text) => String(text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

// ---------- photos ----------

export const photoUrl = (id, { thumb = false } = {}) => `/_kp/p/${encodeURIComponent(id)}${thumb ? '?s=t' : ''}`;

export function img(snap, id, { alt, cls = '', thumb = false, lazy = true } = {}) {
  const p = id && snap.photos[id];
  if (!p) return null;
  const size = p.width && p.height ? ` width="${p.width}" height="${p.height}"` : '';
  return `<img src="${photoUrl(id, { thumb: thumb && p.thumb })}" alt="${attr(alt ?? p.alt ?? '')}"${size}${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy"' : ''}>`;
}

// ---------- the menu ----------

// Which pages show: switched on, and with something in them (plan 3.12).
export function pageOn(snap, key, ctx) {
  const page = snap.pages[key];
  if (!page || !page.enabled) return false;
  if (isCustom(key)) return customHas(snap, key);
  switch (key) {
    case 'dogs': return snap.dogs.some((d) => d.status === 'active');
    case 'reviews': return true; // the page carries the Share your review form even before the first review
    case 'litters': return snap.litters.length > 0;
    case 'older': return olderPuppies(snap, ctx.today).length > 0;
    case 'how_it_works': return snap.steps.length > 0;
    case 'extras': return snap.extras.length > 0;
    case 'products': return (snap.products ?? []).some((x) => !x.transport);
    // Getting your pup home: once one of her sections has words (transport
    // services alone don't make a page).
    case 'pickup': return ['pickup_text', 'transport_text', 'travel_text'].some((k) => page[k]);
    case 'policies': return (snap.expanders.policies ?? []).length > 0;
    case 'faq': return (snap.expanders.faq ?? []).length > 0;
    case 'waitlist_help': return (snap.expanders.waitlist_help ?? []).length > 0;
    case 'albums': return (snap.albums ?? []).length > 0;
    default: return true;
  }
}

export const label = (snap, key) => snap.pages[key]?.menu_label || PAGES[key]?.label || customPage(snap, key)?.name || '';

// ---------- pages and blocks the owner added (content/blocks.js) ----------

export const customPage = (snap, key) => (snap.layout?.custom ?? []).find((c) => c.id === key) ?? null;

// A block the owner added (not one of Home's own): the breeder's switch, and her
// words over the owner's starting ones.
export const addedRow = (snap, key, b) => ((BLOCK_TYPES[b.type].kind === 'data' && !hersOn(key, b)) || BLOCK_TYPES[b.type].kind === 'own' ? snap.added?.[key]?.[b.id] ?? null : null);
export const addedOn = (snap, key, b) => addedRow(snap, key, b)?.enabled !== false;
export function addedWords(snap, key, b) {
  const her = addedRow(snap, key, b) ?? {};
  const w = { ...b.w };
  // Hers as typed, an emptied one too (nothing shows); never set, the owner's.
  for (const k of ['eyebrow', 'heading', 'lede', 'line', 'label', 'caption', 'body']) if (her[k] != null) w[k] = her[k];
  return w;
}

// What reading a record's fields needs from the site (content/fields.js `rc`): the day,
// a litter's stage as the site shows it, a pup's status row, its litter, a dog by id,
// a partner kennel's name. Without a day, today's (UTC), as the editor's lists use.
// A pill's classes: .status and its colour, one of the scheme's (site.css .c-*). How
// it's drawn is the site's pill style (html data-pills, render/layout.js).
export const pillClass = (key) => `status c-${pillKey(key)}`;

// A record's tags as pills (content/tags.js), in the site's status pill styles; '' with
// none. `rc`: the record context, else one for the snapshot made once.
const ctxMemo = new WeakMap();
export function tagPills(snap, kind, rec, rc = null) {
  const c = rc ?? (ctxMemo.get(snap) ?? ctxMemo.set(snap, recordCtx(snap)).get(snap));
  const tags = tagsOf(kind, rec, c);
  return tags.length ? `<span class="line1 tags">${tags.map((t) => `<span class="${pillClass(t.pill)}">${esc(t.words)}</span>`).join('')}</span>` : '';
}

export function recordCtx(snap, today = null) {
  const day = today ?? new Date().toISOString().slice(0, 10);
  const dogs = new Map(snap.dogs.map((d) => [d.id, d]));
  const litterOfPup = new Map();
  for (const l of snap.litters) for (const p of l.puppies ?? []) litterOfPup.set(p, l);
  return {
    today: day,
    dogById: (id) => (id ? dogs.get(id) ?? null : null),
    litterOf: (p) => litterOfPup.get(p) ?? null,
    pupKey: (p) => pupRuleKey(snap, p, litterOfPup.get(p) ?? null, day),
    litterStage: (l) => litterStage(snap, l, day),
    partnerName: (id) => partnerOf(snap, id)?.name ?? null,
    // Tags (content/tags.js), for content/fields.js tagsOf.
    tags: snap.tags ?? null,
  };
}

// A litter's stage as the site shows it on the day (content/fields.js LITTER_STAGE): a
// born litter is available soon while its deposits don't open, older puppies once past
// going home, else available now.
export function litterStage(snap, l, today) {
  if (l.stage !== 'current') return l.stage;
  if (depositsAhead(snap, l, today)) return 'available_soon';
  return pastReady(snap, l, today) ? 'older' : 'available_now';
}

// Where a group of a block starts on its page (a menu link's #): g-<block>-<value>.
export const groupAnchor = (b, key) => `g-${b.id}-${slugify(key) || 'other'}`;
// A group's name: the owner's heading for it, else, grouped by sex, the site's Girls and
// Boys words, else its value.
export const groupLabel = (snap, b, g) => (recordsOf(b).group === 'sex' && !b.gw?.[g.key] && (g.key === 'female' || g.key === 'male') ? word(snap, g.key === 'female' ? 'girls' : 'boys') : g.heading);
// A block on a page as the site has it (an older snapshot's Girls and boys read as the block).
export const blockOn = (snap, key, id) => (snap.layout?.[key] ?? pageBlocks(null, key))
  .map((x) => (key === 'dogs' && x.type === 'builtin' && x.id === 'all' ? DOGS_ALL : x)).find((x) => x.id === id) ?? null;
// A group of a block, as a menu link shows it: while the block is on and the group has
// anything in it (after her ticks and the block's limit). Null when it doesn't show.
export function groupLink(snap, ctx, it) {
  const b = blockOn(snap, it.page, it.block);
  if (!b || !BLOCK_KIND[b.type] || !recordsOf(b).group || !addedOn(snap, it.page, b)) return null;
  const rows = blockRows(snap, b, ctx.today, it.page);
  const g = blockGroups(snap, b, b.limit ? rows.slice(0, b.limit) : rows, ctx.today).find((x) => x.key === it.key);
  return g?.rows.length ? { hash: groupAnchor(b, g.key), text: groupLabel(snap, b, g) } : null;
}

// The first grouped Dog cards block on a page shown as a Show filter (only one per page:
// the template's script filters one grid). An older snapshot's Dogs page holds Girls
// and boys as the built-in part 'all': read as the block it now is (blocks.js DOGS_ALL).
export function filterBlockOf(snap, key) {
  const b = (snap.layout?.[key] ?? pageBlocks(null, key))
    .map((x) => (key === 'dogs' && x.type === 'builtin' && x.id === 'all' ? DOGS_ALL : x))
    .find((x) => x.type === 'dogs' && recordsOf(x).group && x.gshow === 'filter');
  return b ?? null;
}

// A data block's records (content/fields.js): those its conditions hold for, in its
// order (before its limit), less the ones the breeder left out on this page's block;
// on a Featured block, the ones she picked, in her order, once she has picked
// (content/picks.js). Reviews have no conditions: all of them.
export function blockRows(snap, b, today = null, key = null) {
  const kind = BLOCK_KIND[b.type];
  if (!kind) return b.type === 'reviews' ? snap.reviews : [];
  const all = recordsOfKind(snap, kind);
  return applyPicks(b, matchingRows(snap, b, today), all, key ? snap.picks?.[key]?.[b.id] : null);
}
// Every record of a kind on the site; and those a block's conditions hold for, in its
// order, before her picks (her picking screen lists these).
export const recordsOfKind = (snap, kind) => (kind === 'dog' ? snap.dogs : kind === 'litter' ? snap.litters : snap.litters.flatMap((l) => l.puppies ?? []));
export function matchingRows(snap, b, today = null) {
  const kind = BLOCK_KIND[b.type];
  if (!kind) return [];
  const r = recordsOf(b);
  const rc = recordCtx(snap, today);
  return ordered(kind, recordsOfKind(snap, kind).filter((x) => matches(kind, x, r.where, rc)), r.order, rc);
}

// The rows in the block's groups ([{ heading, rows }]), or one group with no heading.
export function blockGroups(snap, b, rows, today = null) {
  const kind = BLOCK_KIND[b.type];
  const r = recordsOf(b);
  if (!kind || !r.group) return [{ key: '', heading: '', rows }];
  return grouped(kind, rows, r.group, r.gw, recordCtx(snap, today));
}

// A page of hers shows while something on it does: a data block with records
// (and switched on), or, with no data blocks, its heading alone.
function customHas(snap, key) {
  const data = (snap.layout?.[key] ?? []).filter((b) => BLOCK_TYPES[b.type].kind === 'data' && addedOn(snap, key, b));
  return !data.length ? (snap.layout?.[key] ?? []).length > 0 : data.some((b) => blockRows(snap, b, null, key).length > 0);
}

// The menu: the owner's (snap.layout.menu), or today's. Each item shows while what it
// points to does: a page while it's on; a place while it has something to show (Girls
// and Boys with breeding dogs of both sexes; Available and Upcoming litters with such
// litters); a page marked fallback only while no other link to it in its group shows
// (today's Puppies, shown when neither Available nor Upcoming is).
export function menuGroups(snap, ctx) {
  const menu = snap.layout?.menu ?? defaultMenu(snap.layout?.custom ?? []);
  const placeShows = {
    // Girls and Boys: while the Dogs page's Show filter, grouped by sex, has both.
    'dogs#girls': () => {
      const b = filterBlockOf(snap, 'dogs');
      if (!b || recordsOf(b).group !== 'sex' || !addedOn(snap, 'dogs', b)) return false;
      const rows = b.limit ? blockRows(snap, b, ctx.today, 'dogs').slice(0, b.limit) : blockRows(snap, b, ctx.today, 'dogs');
      return rows.some((d) => d.sex === 'female') && rows.some((d) => d.sex === 'male');
    },
    'litters#available': () => snap.litters.some((l) => l.stage === 'current' && !depositsAhead(snap, l, ctx.today)),
    'litters#upcoming': () => snap.litters.some((l) => l.stage === 'planned' || (!soonSection(snap) && depositsAhead(snap, l, ctx.today))),
    'litters#soon': () => soonSection(snap) && snap.litters.some((l) => depositsAhead(snap, l, ctx.today)),
  };
  placeShows['dogs#boys'] = placeShows['dogs#girls'];
  const placeText = { 'dogs#girls': () => word(snap, 'girls'), 'dogs#boys': () => word(snap, 'boys') };
  const pathOf = (key) => PAGES[key]?.path ?? customPage(snap, key)?.path ?? null;
  const groups = [];
  for (const g of menu) {
    const links = [];
    for (const it of g.items) {
      if (it.type === 'link') { links.push({ key: null, href: it.url, text: it.text, external: true }); continue; }
      const key = it.type === 'page' || it.type === 'group' ? it.page : MENU_PLACES[it.place].page;
      const path = pathOf(key);
      if (!path || !pageOn(snap, key, ctx)) continue;
      if (it.type === 'page') {
        if (it.fallback && links.some((l) => l.key === key)) continue;
        links.push({ key, href: path, text: label(snap, key) });
      } else if (it.type === 'group') {
        const g = groupLink(snap, ctx, it);
        if (g) links.push({ key, href: `${path}#${g.hash}`, text: it.text || g.text });
      } else if (placeShows[it.place]()) {
        links.push({ key, href: `${path}#${it.place.split('#')[1]}`, text: it.text || placeText[it.place]?.() || MENU_PLACES[it.place].name });
      }
    }
    if (links.length) groups.push({ key: g.id, label: g.label, button: g.button, footer: g.footer, links });
  }
  return groups;
}

// ---------- litters and puppies ----------

// 'coming_soon' is stored, and reads "Still deciding" (plan 3.6, decision 32): she
// may keep the puppy, place it privately or never offer it, so the site promises
// nothing. The Site Manager's own words for a status; the site reads its rules.
// A pup stored as reserved reads as placed: look it up with statusText.
export const STATUS_TEXT = { available: 'Available', placed: 'Reserved', staying: 'Joining our program', coming_soon: 'Still deciding' };
export const statusText = (status) => STATUS_TEXT[pupStatus(status)];

// The day deposits open: the litter's deposits date, moved by the site's timing rule.
const depositsOpen = (snap, l) => (l.deposits_on ? addDays(l.deposits_on, timingOf(snap).deposits_after) : null);

// A born litter whose deposits don't open yet (plan 5.3): it sits under Coming up,
// and its Available puppies read by the not_open row ("Available on <date>"). The
// site moves it on the day, from the published snapshot.
// Whether the Puppies page has the Available soon section (content/blocks.js PAGE_PARTS;
// on by default): then born litters whose deposits don't open yet go there, not under
// Coming up. A page the owner changed before it existed has it only once she adds it.
export const soonSection = (snap) => (snap.layout?.litters ?? PAGE_DEFAULTS.litters).some((b) => b.type === 'builtin' && b.id === 'soon');
export const depositsAhead = (snap, l, today) => l.stage === 'current' && Boolean(l.deposits_on) && depositsOpen(snap, l) > today;

// A current litter past its going-home date, by the site's timing rule (today: from
// the day after): its available puppies are older puppies, and it is "Ready now".
const pastReady = (snap, l, today) => l.stage === 'current' && Boolean(l.ready_on) && !depositsAhead(snap, l, today)
  && addDays(l.ready_on, timingOf(snap).older_after) <= today;

// What a puppy's status says, on its card and page.
export function puppyStatus(snap, l, p, today) {
  const words = statusRule(snap, p, l, today).words;
  return pupRuleKey(snap, p, l, today) === 'not_open' ? words.replaceAll('{date}', fmtDay(depositsOpen(snap, l))) : words;
}

// A puppy's price line: only for a status whose rule shows a price (today
// Available, before deposits open too), and only with the litter's Show prices on (plan 3.2).
export function puppyPriceText(snap, l, p, today = null) {
  if (!statusRule(snap, p, l, today).price) return '';
  if (!l.show_prices) return pricesOff(snap);
  const r = puppyPrice(l, p);
  return r ? sitePrice(snap, r.from, r.to) : '';
}

// The litter's own price rows: a range across its sexes, and the deposit.
export function litterPriceRows(snap, l) {
  const P = rulesOf(snap).price;
  if (l.stage === 'past') return [];
  if (!l.show_prices) return [[P.price_label, P.off]];
  const r = litterPriceRange(l);
  const d = depositRange(l);
  return [[P.price_label, r && sitePrice(snap, r.from, r.to)], [P.deposit_label, d && sitePrice(snap, d.from, d.to)]];
}

// The Dogs page's groups (plan 3.7), from each dog's status: the breeding dogs
// (girls and boys), young stock she has kept, and adults looking for a home.
// Retired and in-memory dogs wait for their pages (backlog). A co-owned dog
// living with one of its co-owners is in none of them, only in `away`, the Co-owned
// section (docs/plans/done/co-owned-dogs.md); one living with her is grouped like her own.
export function dogGroups(snap) {
  // An outside dog (another kennel's) is in none of her groups, only `outside`.
  const active = snap.dogs.filter((d) => d.status === 'active' && !d.outside);
  const home = active.filter((d) => !d.lives_away);
  return {
    breeding: home.filter((d) => !d.upcoming && !d.for_sale),
    upcoming: home.filter((d) => d.upcoming && !d.for_sale),
    for_sale: home.filter((d) => d.for_sale),
    away: active.filter((d) => d.lives_away),
    outside: snap.dogs.filter((d) => d.status === 'active' && d.outside),
  };
}

// A dog's descendants on the site, a generation at a time (content/fields.js
// GENERATIONS): its offspring (the dogs whose sire or dam it is), theirs, and on. A
// featured offspring she sold is an outside dog with her dog as sire or dam; its
// own offspring chain on from it. Each dog once, at its nearest generation.
export function descendantsOf(snap, d) {
  const gens = [];
  const seen = new Set([d.id]);
  let parents = new Set([d.id]);
  for (let g = 0; g < GENERATIONS && parents.size; g++) {
    const kids = snap.dogs.filter((x) => !seen.has(x.id) && (parents.has(x.sire_id) || parents.has(x.dam_id)));
    if (!kids.length) break;
    kids.forEach((x) => seen.add(x.id));
    gens.push(kids);
    parents = new Set(kids.map((x) => x.id));
  }
  return gens;
}

// A Dog cards block's dogs (content/blocks.js): its conditions, then its order. The
// default (active, at home, not up and coming, not for sale) is dogGroups' breeding.
export const dogsFor = (snap, b, today = null, key = null) => blockRows(snap, b, today, key);

// A dog's partner kennels, as the site may name them: the one it lives with, and
// the kennels of its co-owners. Older snapshots have none.
export const partnerOf = (snap, id) => (id ? (snap.partners ?? []).find((x) => x.id === id) ?? null : null);
export const coOwnedWith = (snap, d) => (d.co_owned_with_ids ?? []).map((id) => partnerOf(snap, id)).filter(Boolean);

// A partner kennel's logo, small, when it has one.
export function partnerLogo(snap, k, cls = 'plogo') {
  return k?.photo_id ? img(snap, k.photo_id, { alt: '', cls, thumb: true }) ?? '' : '';
}
// Its name, linked to its website when it has one.
export const partnerLink = (k) => (k.url ? `<a href="${attr(k.url)}" rel="noopener">${esc(k.name)}</a>` : esc(k.name));

// Available puppies past their litter's going-home date (plan 3.11): the statuses
// whose rule lets them be older puppies (today Available only).
export function olderPuppies(snap, today) {
  const out = [];
  for (const l of snap.litters) {
    if (!pastReady(snap, l, today)) continue;
    for (const p of l.puppies) if (statusRule(snap, p).older) out.push({ litter: l, puppy: p });
  }
  return out;
}

// A litter's puppies in the order its rules give their statuses (today placed
// last); equal keeps the breeder's order. With the litter and the day, an available
// pup whose deposits don't open yet is ordered by the not_open row.
export const sortPuppies = (snap, pups, l = null, today = null) => [...pups].sort((a, b) => statusRule(snap, a, l, today).order - statusRule(snap, b, l, today).order);

export function parentName(snap, l, role) {
  const id = l[`${role}_id`];
  const dog = id && snap.dogs.find((d) => d.id === id);
  return dog ? dog.call_name : (l[`${role}_name`] || null);
}

export function pairNames(snap, l) {
  const dam = parentName(snap, l, 'dam');
  const sire = parentName(snap, l, 'sire');
  if (dam && sire) return `${dam} × ${sire}`;
  if (dam) return `${dam} × sire to be chosen`;
  return sire ?? '';
}

function counts(pups) {
  const g = pups.filter((p) => p.sex === 'female').length;
  const b = pups.filter((p) => p.sex === 'male').length;
  return [g && sexCount('female', g), b && sexCount('male', b)].filter(Boolean).join(', ') || 'Expected';
}

// A parent's picture, or its initial in a circle.
function parentPhoto(snap, l, role) {
  const id = l[`${role}_id`];
  const dog = id && snap.dogs.find((d) => d.id === id);
  const name = parentName(snap, l, role);
  return (dog && img(snap, dog.photo_id, { alt: dog.call_name, thumb: true })) || `<span class="ph">${esc(name ? name.slice(0, 1) : '?')}</span>`;
}

// A litter's facts, as its card lists them: [label, value] rows, blanks included.
// Each row's third item is its key, for the card's "what it shows" (content/blocks.js
// LITTER_ROWS). namesMax: how many pups it names before counting them.
export function litterRows(snap, l, ctx, { namesMax = 2 } = {}) {
  const ahead = depositsAhead(snap, l, ctx.today);
  const older = pastReady(snap, l, ctx.today);
  return (l.stage === 'planned'
    ? [['Expected', l.expected_label, 'expected'], ['Going home', l.ready_label, 'going']]
    : [['Born', fmtDate(l.born_on), 'born'], ['Deposits from', ahead ? fmtDate(depositsOpen(snap, l)) : null, 'deposits'], ['Puppies', l.puppies.length ? l.puppies.length <= namesMax ? l.puppies.map((p) => p.name).join(', ') : counts(l.puppies) : null, 'puppies'],
      ['Going home', older ? word(snap, 'ready_now') : fmtDate(l.ready_on), 'going']]).concat(litterPriceRows(snap, l).map(([k, v], i) => [k, v, i ? 'deposit' : 'price']));
}

const kvList = (rows) => `<dl class="kv">${rows.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

// A litter's page doesn't repeat its card: the page's head already names the litter
// and its parents. Under it, a small card for each parent in one row (Dam over the
// mother, Sire over the father) says something about them: picture, registered
// name, titles, colour and registry, a few health results, and a link to the
// dog's page. A parent that isn't one of her dogs on the site (an outside stud)
// shows the name she typed. Then the litter's facts the head doesn't give.
export function parentCards(snap, l) {
  const card = (role) => {
    const id = l[`${role}_id`];
    const d = id && snap.dogs.find((x) => x.id === id);
    const name = parentName(snap, l, role);
    if (!name) return '';
    const line = d ? [d.color, d.registry].filter(Boolean).join(' · ') : '';
    const health = d?.health ?? [];
    const tests = health.length
      ? `<ul class="tests">${health.slice(0, 3).map((h) => `<li><span>${esc(h.test)}</span><span>${esc(h.result)}</span></li>`).join('')}</ul>${health.length > 3 ? `<span class="small muted">and ${health.length - 3} more health result${health.length - 3 === 1 ? '' : 's'}</span>` : ''}`
      : '';
    return `<div class="parent"><span class="eyebrow">${role === 'dam' ? 'Dam' : 'Sire'}</span>
      <article class="parent-card">${parentPhoto(snap, l, role)}<b class="call">${esc(name)}</b>${d?.registered_name ? `<span class="reg">${esc(d.registered_name)}</span>` : ''}${d?.titles ? `<span class="small">${esc(d.titles)}</span>` : ''}${line ? `<span class="small muted">${esc(line)}</span>` : ''}${tests}${d ? `<a class="more" href="/dogs/${attr(d.slug)}">View profile</a>` : ''}</article></div>`;
  };
  const cards = [card('dam'), card('sire')].filter(Boolean);
  return cards.length ? `<div class="parents${cards.length === 1 ? ' one' : ''}">${cards.join('')}</div>` : '';
}

// The litter's facts on its page: its card's (deposits, going home, prices), less
// the birth date, which heads the page. Its puppies, which have their own cards
// below, are counted by sex under Going home ("2 girls, 1 boy").
export function litterFacts(snap, l, ctx) {
  const P = rulesOf(snap).price;
  const rows = [];
  for (const [k, v] of litterRows(snap, l, ctx)) {
    if (!v || k === 'Born' || k === 'Puppies') continue;
    rows.push([k, v]);
    if (k === 'Going home' && l.puppies.length) rows.push(['Puppies', counts(l.puppies)]);
  }
  // No going-home date yet: the count goes before the prices.
  if (l.puppies.length && !rows.some(([k]) => k === 'Puppies')) {
    const at = rows.findIndex(([k]) => k === P.price_label || k === P.deposit_label);
    rows.splice(at < 0 ? rows.length : at, 0, ['Puppies', counts(l.puppies)]);
  }
  return rows.length ? `<div class="litter litter-facts">${kvList(rows)}</div>` : '';
}

// show: what the card shows (content/blocks.js SHOW_DEFAULT.litters is today's).
// `label: false` leaves out its small label over the name (the Available soon section's
// heading already says it).
export function litterCard(snap, l, ctx, { link = true, show = SHOW_DEFAULT.litters, label: withLabel = true } = {}) {
  const parent = (role) => parentPhoto(snap, l, role);
  const ahead = depositsAhead(snap, l, ctx.today);
  const older = pastReady(snap, l, ctx.today);
  // By its status in KennelOS where the owner gave that a line (contract C2), else as before.
  const kos = l.kennelos_status ? word(snap, `litter_kos_${l.kennelos_status}`) : '';
  const eyebrow = l.stage === 'planned' ? (l.plan_label || kos || word(snap, 'litter_planned')) : l.stage === 'past' ? word(snap, 'litter_past')
    : kos || (ahead ? word(snap, 'litter_coming') : older ? word(snap, 'litter_older') : word(snap, 'litter_current'));
  const rows = litterRows(snap, l, ctx, { namesMax: show.names }).filter(([, , key]) => show.rows.includes(key));
  const more = !link ? '' : l.stage === 'planned'
    ? (pageOn(snap, 'waitlist', ctx) ? `<a class="more" href="/waitlist">${esc(word(snap, 'see_waitlist'))}</a>` : '')
    : `<a class="more" href="/litters/${attr(l.slug)}">${esc(word(snap, 'meet_puppies'))}</a>`;
  const has = (k) => show.pair.includes(k);
  const names = [has('name') ? `<b>${esc(l.name)}</b>` : '', has('parents') ? `<span class="small muted">${esc(pairNames(snap, l))}</span>` : ''].join('');
  const pair = (has('photos') || names) ? `<div class="pair">${has('photos') ? `${parent('dam')}<span class="x">×</span>${parent('sire')}` : ''}${names ? `<div class="names">${names}</div>` : ''}</div>` : '';
  const item = {
    eyebrow: () => (withLabel ? `<span class="eyebrow">${esc(eyebrow)}</span>\n    ` : ''),
    pair: () => (pair ? `${pair}\n    ` : ''),
    facts: () => kvList(rows),
    summary: () => (l.summary && l.stage === 'planned' ? `<p class="small muted">${esc(l.summary)}</p>` : ''),
    link: () => more,
  };
  return `<article class="litter">${show.items.map((k) => item[k]()).join('')}</article>`;
}

// ---------- flip cards ----------

// A card's items for one dog, by key (content/blocks.js DOG_ITEMS). sale: { price,
// ask } for a dog looking for a home (plan 3.7). link: whether the owner's name may
// be a link (not inside a card that is itself one).
function dogItems(snap, d, { sale = null, link = true } = {}) {
  const registry = d.registry ? `<li><span>Registry</span><span>${esc(d.registry)}</span></li>` : '';
  const weight = d.weight ? `<li><span>Weight</span><span>${esc(d.weight)}</span></li>` : '';
  // Health results when it has some (its registry and weight above them, where
  // set), else its details.
  const tests = d.health.length
    ? `${registry || weight ? `<ul class="tests">${registry}${weight}</ul>` : ''}<span class="eyebrow">Health testing</span><ul class="tests">${d.health.map((h) => `<li><span>${esc(h.test)}</span><span>${esc(h.result)}</span></li>`).join('')}</ul>`
    : `<span class="eyebrow">Details</span><ul class="tests"><li><span>Sex</span><span>${sexWord(d.sex)}</span></li>${d.color ? `<li><span>Color</span><span>${esc(d.color)}</span></li>` : ''}${weight}${registry}</ul>`;
  const line = [snap.site.breed, d.role].filter(Boolean).join(' · ');
  return {
    call: () => `<span class="call">${esc(d.call_name)}</span>`,
    reg: () => (d.registered_name ? `<span class="reg">${esc(d.registered_name)}</span>` : ''),
    role: () => `<span>${esc(line)}</span>`,
    line: () => `<span class="small muted">${esc([sexWord(d.sex), d.role].filter(Boolean).join(' · '))}</span>`,
    titles: () => (d.titles ? `<span>${esc(d.titles)}</span>` : ''),
    tests: () => tests,
    bio: () => (d.bio ? `<p class="bio">${esc(d.bio)}</p>` : ''),
    ask: () => (sale ? `${sale.price ? `<p class="small">${esc(sale.price)}</p>` : ''}<a class="more" href="${attr(sale.ask)}">${esc(word(snap, 'ask_dog', { name: d.call_name }))}</a>` : ''),
    profile: () => `<a class="more" href="/dogs/${attr(d.slug)}">View profile</a>`,
    where: () => whereLine(snap, d, link),
    tags: () => tagPills(snap, 'dog', d),
    photo: () => '',
  };
}

// Where a dog lives or whose it is, only where that says something: a co-owned dog
// living with a co-owner ("with Oakridge", or unnamed), or an outside dog's owner.
// A dog living with her says nothing. The words are the site's (content/rules.js).
export function whereLine(snap, d, link = true) {
  if (d.lives_away) {
    const k = partnerOf(snap, d.lives_with_kennel_id);
    return `<span class="cowith">${k ? `${partnerLogo(snap, k)}<span>${esc(word(snap, 'co_with', { kennel: k.name }))}</span>` : `<span>${esc(word(snap, 'co_unnamed'))}</span>`}</span>`;
  }
  if (d.outside && d.owner_name) {
    const [before, after = ''] = word(snap, 'outside_owner', { kennel: '\u0000' }).split('\u0000');
    const name = link && d.owner_url ? `<a href="${attr(d.owner_url)}" rel="noopener">${esc(d.owner_name)}</a>` : esc(d.owner_name);
    return `<span class="cowith"><span>${esc(before)}${name}${esc(after)}</span></span>`;
  }
  return '';
}

// A face's items in order; breed and role, and titles, next to each other share a line.
function faceOf(item, items) {
  let out = '';
  for (let i = 0; i < items.length; i++) {
    if (items[i] === 'role' || items[i] === 'titles') {
      let run = '';
      while (items[i] === 'role' || items[i] === 'titles') run += item[items[i++]]();
      i--;
      out += `<span class="line1">${run}</span>`;
    } else out += item[items[i]]();
  }
  return out;
}

// A dog's items, in order, as its cards draw them (a Featured block's lines).
export const dogFace = (snap, d, items, { sale = null } = {}) => faceOf(dogItems(snap, d, { sale }), items);

// show: what each face shows, in order (content/blocks.js SHOW_DEFAULT.dogs is today's card).
export function dogCard(snap, d, { sale = null, show = SHOW_DEFAULT.dogs } = {}) {
  const photo = img(snap, d.photo_id, { alt: d.call_name }) ?? '<div class="ph-photo">Photos coming soon</div>';
  const bg = img(snap, d.photo_id, { alt: '', cls: 'bg', thumb: true }) ?? '';
  const item = dogItems(snap, d, { sale });
  const face = (items) => faceOf(item, items);
  const front = show.front.filter((k) => k !== 'photo');
  const back = show.back.filter((k) => k !== 'photo');
  // On the back, the name heads it; the rest starts on its own line.
  const head = back.findIndex((k) => k !== 'call' && k !== 'reg');
  const backHtml = head < 0 ? face(back) : `${face(back.slice(0, head))}\n        ${face(back.slice(head))}`;
  return `<div class="flip" tabindex="0" role="button" aria-label="${attr(d.call_name)}: turn the card over">
    <div class="flip-in">
      <div class="face front">${show.front.includes('photo') ? photo : ''}<span class="turn" aria-hidden="true">↻</span>
        <div class="cap">${face(front)}</div></div>
      <div class="face back">${show.back.includes('photo') || show.front.includes('photo') ? bg : ''}${backHtml}</div>
    </div></div>`;
}

// A light card, no flip (docs/plans/done/co-owned-dogs.md): a short photo and a few
// lines; it opens the dog's page. show.light: its items (SHOW_DEFAULT.dogs.light is
// the Co-owned section's card).
export function coCard(snap, d, { show = SHOW_DEFAULT.dogs } = {}) {
  const items = show.light ?? SHOW_DEFAULT.dogs.light;
  const photo = items.includes('photo') ? img(snap, d.photo_id, { alt: d.call_name, thumb: true }) ?? '<div class="ph-photo">Photo coming soon</div>' : '';
  const item = dogItems(snap, d, { link: false });
  const body = items.filter((k) => k !== 'photo').map((k) => item[k]()).join('');
  return `<a class="cocard" href="/dogs/${attr(d.slug)}">${photo}<span class="cobody">${body}</span></a>`;
}

// Photo beside details: the photo on the left, the items beside it, and the bio
// and whatever follows it under both, across the card. The card stacks (photo on
// top) when it is narrow, as on a phone (site.css .dogrow).
export function besideCard(snap, d, { sale = null, show = SHOW_DEFAULT.dogs } = {}) {
  const items = show.beside ?? SHOW_DEFAULT.dogs.beside;
  const item = dogItems(snap, d, { sale });
  const rest = items.filter((k) => k !== 'photo');
  const at = rest.indexOf('bio');
  const side = at < 0 ? rest : rest.slice(0, at);
  const under = at < 0 ? [] : rest.slice(at);
  const photo = items.includes('photo') ? img(snap, d.photo_id, { alt: d.call_name, cls: 'photo' }) ?? '<div class="photo ph-photo">Photos coming soon</div>' : '';
  const below = faceOf(item, under);
  return `<article class="dogrow${photo ? '' : ' no-photo'}"><div class="dr-top">${photo}<div class="dr-info">${faceOf(item, side)}</div></div>${below ? `<div class="dr-under">${below}</div>` : ''}</article>`;
}

// A litter with "Families can ask about full registration" on (its own setting):
// each of its undecided puppies (no registration set: she'd sell it either way)
// links to the contact form with it filled in, and so does the litter while it has
// one. Only for statuses whose rule allows it (today all but staying: a puppy
// staying here is for no one), and only while the contact page is on.
const undecided = (snap, p, l = null, today = null) => !p.registration && statusRule(snap, p, l, today).fullreg;

// What a puppy's Registration line says, in the site's words. A puppy she hasn't
// settled reads **Limited** by default, like the limited puppy it will almost
// certainly be, and is priced that way (content/prices.js): a blank line told a
// family nothing, and a range to full read as a higher price they might have to
// pay. She can still be asked about full registration, where the litter's tick
// allows it, and the surcharge shows under that link. A puppy of a status that
// can't be asked about it (staying, by default) says nothing.
export function regText(snap, p, l = null, today = null) {
  const R = rulesOf(snap).reg;
  if (p.registration) return R[p.registration] ?? null;
  return undecided(snap, p, l, today) ? R.unset || null : null;
}
export function fullRegHref(snap, l, p, ctx) {
  if (!l.ask_full_reg || !pageOn(snap, 'contact', ctx)) return null;
  if (p ? !undecided(snap, p, l, ctx?.today) : !l.puppies.some((x) => undecided(snap, x, l, ctx?.today))) return null;
  return `/contact?full-reg=${encodeURIComponent(l.slug)}${p ? `&puppy=${encodeURIComponent(p.slug)}` : ''}#message`;
}
// The litter's full-registration surcharge, shown under those links while its Show
// prices is on: "$500" when the sexes match (or one is blank, meaning the same as
// the other, as with the prices), else "males $500, females $700"; one puppy's by
// its sex. Null when none is set or prices are off.
export function fullRegSurcharge(l, p) {
  if (!l.show_prices) return null;
  const one = (sex) => l[`full_reg_${sex}`] ?? l[`full_reg_${sex === 'female' ? 'male' : 'female'}`] ?? null;
  if (p) return one(p.sex) == null ? null : money(one(p.sex));
  const m = one('male'); const f = one('female');
  if (m == null) return null;
  return m === f ? money(m) : `males ${money(m)}, females ${money(f)}`;
}
const SURCHARGE = 'Full Registration Surcharge';
// Its detail row, under the ask link: the card's list style, or the puppy page's.
export function fullRegSurchargeRow(snap, l, p, ctx, style = 'tests') {
  const v = fullRegHref(snap, l, p, ctx) && fullRegSurcharge(l, p);
  if (!v) return '';
  return style === 'kv' ? `<dl class="kv"><dt>${SURCHARGE}</dt><dd>${esc(v)}</dd></dl>`
    : `<ul class="tests"><li><span>${SURCHARGE}</span><span>${esc(v)}</span></li></ul>`;
}

export function fullRegLink(snap, l, p, ctx, cls) {
  const href = fullRegHref(snap, l, p, ctx);
  return href ? `<a class="${cls}" href="${attr(href)}">${esc(rulesOf(snap).reg.ask)}</a>` : '';
}

// The contact form's About line from a full-registration link, made from the
// snapshot (never from the address's own words): null when it names nothing shown.
export function fullRegTopic(snap, ctx, params) {
  const l = snap.litters.find((x) => x.slug === params.get('full-reg'));
  if (!l || !fullRegHref(snap, l, null, ctx)) return null;
  const p = params.get('puppy') ? l.puppies.find((x) => x.slug === params.get('puppy')) : null;
  if (p && !fullRegHref(snap, l, p, ctx)) return null;
  return `Full registration: ${p ? `${p.name}, ` : ''}${l.name}`.slice(0, 80);
}

export function puppyCard(snap, l, p, ctx) {
  const photo = img(snap, p.photo_id, { alt: p.name }) ?? '<div class="ph-photo">Photos coming soon</div>';
  const bg = img(snap, p.photo_id, { alt: '', cls: 'bg', thumb: true }) ?? '';
  const sex = sexWord(p.sex);
  const rule = statusRule(snap, p, l, ctx.today);
  const status = puppyStatus(snap, l, p, ctx.today);
  const price = puppyPriceText(snap, l, p, ctx.today);
  const priceLabel = rulesOf(snap).price.price_label;
  const reg = [l.name, p.collar].filter(Boolean).join(' · ');
  const regWord = regText(snap, p, l, ctx.today);
  const action = (rule.ask
    ? `<a class="more" href="${pageOn(snap, 'waitlist', ctx) ? '/waitlist' : '/contact'}">${esc(word(snap, 'ask_puppy'))}</a>`
    : '') + fullRegLink(snap, l, p, ctx, 'more') + fullRegSurchargeRow(snap, l, p, ctx);
  // Its own page, whatever its status, the way a dog card links to its profile. Only
  // with the Puppies page on, which the puppy route needs (render/index.js): the
  // Older puppies page can be on with Puppies off, and this must not go nowhere.
  const profile = snap.pages.litters.enabled
    ? `<a class="more" href="/litters/${attr(l.slug)}/${attr(p.slug)}">View profile</a>` : '';
  return `<div class="flip" tabindex="0" role="button" aria-label="${attr(p.name)}: turn the card over">
    <div class="flip-in">
      <div class="face front">${rule.ribbon && status ? `<span class="ribbon">${esc(status)}</span>` : ''}${photo}<span class="turn" aria-hidden="true">↻</span>
        <div class="cap"><span class="call">${esc(p.name)}</span><span class="reg">${esc(reg)}</span><span class="line1"><span>${esc([sex, p.color].filter(Boolean).join(' · '))}</span><span class="${pillClass(rule.pill)}">${esc(status)}</span></span></div></div>
      <div class="face back">${bg}<span class="call">${esc(p.name)}</span><span class="reg">${esc(reg)}</span>
        <span class="eyebrow">Details</span><ul class="tests"><li><span>Sex</span><span>${sex}</span></li>${p.color ? `<li><span>Color</span><span>${esc(p.color)}</span></li>` : ''}<li><span>Status</span><span>${esc(status)}</span></li>${regWord ? `<li><span>Registration</span><span>${esc(regWord)}</span></li>` : ''}${p.registry ? `<li><span>Registry</span><span>${esc(p.registry)}</span></li>` : ''}${price ? `<li><span>${esc(priceLabel)}</span><span>${esc(price)}</span></li>` : ''}</ul>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}${action}${profile}</div>
    </div></div>`;
}

// A gallery of photos with the lightbox the template's site.js drives (an album's
// photos, a puppy's tagged ones). `altBase` names the set for photos with no alt
// of their own. Empty when there are none, so the caller can leave the block out.
export function galleryHtml(snap, ids = [], altBase = '') {
  const items = ids.map((id, i) => {
    const p = snap.photos[id];
    if (!p) return '';
    return `<a class="gal-item" href="/_kp/p/${attr(encodeURIComponent(id))}" data-gallery${p.width ? ` data-w="${p.width}" data-h="${p.height}"` : ''}>${img(snap, id, { thumb: true, alt: p.alt || `${altBase}, photo ${i + 1}` })}</a>`;
  }).join('');
  return items ? `<div class="gallery">${items}</div>` : '';
}

// Where the rest of an album's photos live (her Google Photos or Shutterfly share,
// any third-party address): right under the album, opening in a new tab like any
// address off the site. The arrow comes from `.more` in the template's CSS, so the
// words don't carry one. Empty when she set none.
export function morePhotosHtml(a) {
  return a?.more_photos_url
    ? `<p class="center mt-20"><a class="more" href="${attr(a.more_photos_url)}" target="_blank" rel="noopener noreferrer">See more photos</a></p>` : '';
}

// The viewer the gallery opens into: one per page, whatever galleries it holds.
export const viewerHtml = () => '<dialog class="viewer" id="viewer" aria-label="Photo viewer"><img alt=""><button type="button" class="v-prev" aria-label="Previous photo">\u2039</button><button type="button" class="v-next" aria-label="Next photo">\u203a</button><button type="button" class="v-close" aria-label="Close">\u00d7</button><span class="v-count small"></span></dialog>';

// ---------- other blocks ----------

export function slider(items, { cls = '', ctl = '' } = {}) {
  return `<div class="slider" data-slider><div class="track${cls ? ` ${cls}` : ''}">${items.join('')}</div>
    <div class="slider-ctl">${ctl || '<span></span>'}<div class="arrows"><span class="count"></span><button class="arrow prev" type="button" aria-label="Previous">←</button><button class="arrow next" type="button" aria-label="Next">→</button></div></div></div>`;
}

// show: what the card shows (content/blocks.js SHOW_DEFAULT.reviews is today's).
export function reviewCard(snap, r, { show = SHOW_DEFAULT.reviews } = {}) {
  const stars = r.rating ? `<span class="stars" aria-label="${r.rating} stars">${'★'.repeat(r.rating)}</span>` : '';
  const who = [r.first_name, r.town].filter(Boolean).join(', ');
  const sub = r.puppy_name ? `${r.puppy_name}'s family${r.home_month ? `, home ${fmtMonth(r.home_month)}` : ''}` : `${snap.site.monogram || snap.site.kennel_name} family`;
  const photo = img(snap, r.photo_id, { alt: '', thumb: true }) ?? '';
  const w = (k) => show.who.includes(k);
  const words = `${w('name') ? `<b>${esc(who)}</b>` : ''}${w('family') ? `<div class="muted small">${esc(sub)}</div>` : ''}`;
  const item = {
    stars: () => stars,
    quote: () => `<blockquote>${esc(r.quote)}</blockquote>`,
    who: () => (w('photo') && photo) || words ? `<div class="who">${w('photo') ? photo : ''}${words ? `<div>${words}</div>` : ''}</div>` : '',
  };
  return `<article class="review"${r.topic ? ` data-topic="${attr(r.topic)}"` : ''}>${show.items.map((k) => item[k]()).join('')}</article>`;
}

export const expanders = (rows) => rows.map((e) => `<details class="x"${e.start_open ? ' open' : ''}><summary>${esc(e.heading)}</summary><div class="body">${paras(e.body)}</div></details>`).join('');

// A question from the FAQ she has also put on this kind of page (plan 3.9, 3.12):
// the same question, drawn the same way, at the top of the page. Her first use was
// the difference between limited and full registration, at the top of every
// litter's page, where a family meets a price. The FAQ page keeps showing all of
// them, and a placed question shows whether or not that page is on, since it is
// the question she wants read here, not a link to somewhere else.
export const placedFaqs = (snap, place) => (snap.expanders?.faq ?? []).filter((e) => (e.places ?? []).includes(place));
export function faqBlock(snap, place) {
  const rows = placedFaqs(snap, place);
  return rows.length ? `<div class="acc">${expanders(rows)}</div>` : '';
}

// Where Family login goes (plan 3.8). Everywhere: KennelOS's sign-in for her
// status page, in a new tab. On a site with the family portal on (ctx.portal,
// from the site row, so no publish is needed): her own /family-login page, which
// asks which of the two the family wants; or the portal itself when she has no
// KennelOS waitlist linked.
export function familyLogin(snap, ctx) {
  const kos = snap.site.family_login;
  if (ctx.portal) return { href: kos ? '/family-login' : '/family', external: false };
  return kos ? { href: kos, external: true } : null;
}

export function pagehead(page, fallback, { ornament = true } = {}) {
  // Hers as typed (emptied: none); never set, the page's own.
  const heading = page?.heading ?? fallback.heading;
  const eyebrow = page?.eyebrow ?? fallback.eyebrow;
  const lede = page?.lede ?? fallback.lede;
  if (!heading && !eyebrow && !lede) return '';
  return `<div class="wrap pagehead">${ornament ? '<svg class="sprig l" aria-hidden="true"><use href="#sprig"/></svg><svg class="sprig r" aria-hidden="true"><use href="#sprig"/></svg>' : ''}${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}${heading ? `<h1>${esc(heading)}</h1>` : ''}${lede ? `<p class="lede">${esc(lede)}</p>` : ''}</div>`;
}

export function head(eyebrow, heading, lede, { ornament = false } = {}) {
  if (!eyebrow && !heading && !lede) return '';
  return `<div class="head">${ornament ? '<svg class="sprig l" aria-hidden="true"><use href="#sprig"/></svg><svg class="sprig r" aria-hidden="true"><use href="#sprig"/></svg>' : ''}${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}${heading ? `<h2>${esc(heading)}</h2>` : ''}${lede ? `<p class="lede">${esc(lede)}</p>` : ''}</div>`;
}

export const ICONS = {
  shield: '<path d="M16 4l10 4v7c0 7-4.5 11-10 13C10.5 26 6 22 6 15V8z"/><path d="M11.5 16l3 3 6-6"/>',
  home: '<path d="M5 15l11-9 11 9"/><path d="M8 13v13h16V13"/><path d="M13 26v-7h6v7"/>',
  heart: '<path d="M16 27s-10-6.2-10-13a5.5 5.5 0 0110-3.2A5.5 5.5 0 0126 14c0 6.8-10 13-10 13z"/>',
  star: '<path d="M16 4l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L16 22.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z"/>',
  paw: '<circle cx="9" cy="13" r="2.5"/><circle cx="14" cy="8.5" r="2.5"/><circle cx="20" cy="8.5" r="2.5"/><circle cx="25" cy="13" r="2.5"/><path d="M10.5 23c0-4 2.5-7.5 5.5-7.5s5.5 3.5 5.5 7.5c0 2.5-2.5 3.5-5.5 3.5s-5.5-1-5.5-3.5z"/>',
  leaf: '<path d="M7 25C7 13 14 6 26 6c0 12-7 19-19 19z"/><path d="M7 25L19 13"/>',
};

// ---------- how to pay, and the safe-payment notice (plan 3.9) ----------

export const SAFE_NOTICE_TEXT = "We'll never ask you to pay by gift card, wire transfer or into anyone else's account, and we only contact you from the details on this website. If someone asks you to, please tell us.";
const PAY_WORDS = { application_fee: 'pay_fee', deposit: 'pay_deposit' };

// The cards switched on, in order: [kind, content].
export const payCards = (snap) => ['application_fee', 'deposit'].map((k) => [k, snap.payment?.[k]]).filter(([, v]) => v);
// How to pay lives on the waitlist page, so links to it need that page on.
export const payShown = (snap, ctx) => pageOn(snap, 'waitlist', ctx) && payCards(snap).length > 0;
const noticeOn = (snap) => snap.payment?.safe_notice?.enabled ?? true;
const noticeText = (snap) => snap.payment?.safe_notice?.text || word(snap, 'safe_notice');

// "Venmo, Zelle or PayPal": every method on the cards shown.
function methodList(snap) {
  const names = [...new Set(payCards(snap).flatMap(([, c]) => (c.methods ?? []).map(([m]) => m).filter(Boolean)))];
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0] ?? '';
}

// What a Copy button copies: an email address, an @handle or a phone number in
// the details, if there is one.
function copyable(detail) {
  const m = String(detail ?? '').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+|@[\w.-]+|\+?\d[\d ().-]{6,}\d/);
  return m ? m[0] : null;
}

function payCard(snap, [kind, c]) {
  const methods = (c.methods ?? []).map(([m, d]) => {
    const copy = copyable(d);
    return `<li><span class="m">${esc(m)}</span><span class="d">${esc(d)}</span>${copy ? `<button type="button" class="copy" data-copy="${attr(copy)}" hidden>Copy</button>` : '<span></span>'}</li>`;
  }).join('');
  return `<article class="pay-card">
    <h3>${esc(c.title || word(snap, PAY_WORDS[kind]))}</h3>
    ${c.due_note ? `<p class="pay-when"><b>When:</b> ${esc(c.due_note)}</p>` : ''}
    ${methods ? `<ul class="methods">${methods}</ul>` : ''}
    ${c.note ? `<p class="pay-note"><b>In the note:</b> ${esc(c.note)}</p>` : ''}
    ${c.pay_url ? `<p><a class="btn solid" href="${attr(c.pay_url)}" rel="noopener noreferrer" target="_blank">${esc(c.pay_label || 'Pay online')}</a></p>` : ''}
  </article>`;
}

// The How to pay section of the waitlist page, with the notice under it.
export function paySection(snap) {
  const cards = payCards(snap);
  const notice = noticeOn(snap) ? noticeText(snap) : '';
  if (!cards.length && !notice) return '';
  const heading = cards.length === 2 ? 'Paying your fee and deposit' : cards.length ? `Paying your ${(cards[0][1].title || word(snap, PAY_WORDS[cards[0][0]])).toLowerCase()}` : 'Paying safely';
  return `<section class="pay" id="how-to-pay" aria-labelledby="pay-h">
    <header class="center"><span class="eyebrow">How to pay</span><h2 id="pay-h">${esc(heading)}</h2>${cards.length ? '<p class="muted">Use any of the ways below. Put the note shown in your payment so we can match it to you.</p>' : ''}</header>
    ${cards.length ? `<div class="pay-grid${cards.length === 1 ? ' one' : ''}">${cards.map((c) => payCard(snap, c)).join('')}</div>` : ''}
    ${notice ? `<p class="pay-safe" role="note">${cards.length ? 'These are our only payment details. ' : ''}${esc(notice)}</p>` : ''}
  </section>`;
}

// The notice on its own (puppy pages): which ways the breeder takes payment, and
// where the details are.
export function safeNotice(snap, ctx) {
  if (!noticeOn(snap)) return '';
  const list = methodList(snap);
  const where = payShown(snap, ctx) ? ` <a href="/waitlist#how-to-pay">How to pay</a>` : '';
  return `<p class="pay-safe" role="note">${list ? `We take payment only by ${esc(list)}${where ? `, to the details under${where}` : ''}. ` : where ? `Our only payment details are under${where}. ` : ''}${esc(noticeText(snap))}</p>`;
}

// ---------- the application form (plan 3.8) ----------

// The litter question offers these: litters still to come or with puppies now,
// by name, then "Any litter". siteforms.js accepts only these.
export const ANY_LITTER = 'Any litter';
export const litterChoices = (snap) => [...snap.litters.filter((l) => l.stage === 'planned' || l.stage === 'current').map((l) => l.name), ANY_LITTER];
// With no questions set up, the form asks this instead.
export const ABOUT_LABEL = 'About your family and the puppy you hope for';
