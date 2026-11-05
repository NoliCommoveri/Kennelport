// Pages as blocks (docs/Site_Builder_Plan.md, step 2): Home and the other pages
// (PAGE_DEFAULTS): which blocks each has, in what order, each data block's records (filters, order, how
// many, style) and what its cards show. The owner sets these per site in her admin
// view (manage/builder.js); the breeder still switches Home's blocks on or off and
// words them (home_blocks), as before.
//
// A site keeps only what the owner changed (site_builds.build.pages.<page>); with
// nothing there, a page is today's exactly (HOME_DEFAULT, PAGE_DEFAULTS), so no site looks
// different the day this ships (decision 14). The published snapshot carries the
// result (snap.layout), so rendering stays pure.
//
// Today's Home has blocks the prototype's Home doesn't (the badge row, a question
// she placed there, videos and posts) and draws a few differently (the facts sit in
// the top block, two litters at most). Those stay as today on every existing site;
// the prototype's Home goes into the Website template for new sites (step 3).
import { PAGES, MENU_GROUPS, CUSTOM_KEY, slugify } from './model.js';

export class BlockError extends Error {}

// The block types, as the prototype names them. `once`: it draws the breeder's one
// piece of content (her story, her facts), so a page has it at most once.
// `switch`: the breeder's switch for it (home_blocks), on Home.
export const BLOCK_TYPES = Object.freeze({
  head: { name: 'Page heading', ic: 'pages', kind: 'content', once: true, hint: "The page's eyebrow, heading and line under it, in her words for this page." },
  builtin: { name: 'Built-in', ic: 'lock', kind: 'fixed', hint: "What this page is for, drawn as today's site draws it." },
  hero: { name: 'Banner and collage', ic: 'camera', kind: 'content', once: true, hint: 'Her banner, collage, headline and buttons.' },
  facts: { name: 'Facts row', ic: 'star', kind: 'content', once: true, hint: 'Right after the banner it sits in it, as today; anywhere else, on its own.' },
  badges: { name: 'Badge row', ic: 'gift', kind: 'content', once: true, hint: 'The products she shows as a badge on Home, two at most. Right after the banner it sits under it.' },
  faq: { name: 'FAQ spot', ic: 'book', kind: 'content', once: true, hint: 'The questions she puts on Home.' },
  text: { name: 'Photo and words', ic: 'draft', kind: 'content', once: true, hint: 'Her story: photo, heading, words and features.' },
  dogs: { name: 'Dog cards', ic: 'paw', kind: 'data' },
  litters: { name: 'Litter cards', ic: 'heart', kind: 'data' },
  reviews: { name: 'Reviews', ic: 'star', kind: 'data' },
  embeds: { name: 'Videos and posts', ic: 'camera', kind: 'content', once: true, hint: 'The videos and posts she puts on Home.' },
  band: { name: 'Call-to-action band', ic: 'heart', kind: 'content', once: true, hint: 'Her waitlist band. Shows only while the waitlist page is on.' },
});

// Blocks that draw her Home content (home_blocks): on Home only.
export const HOME_ONLY = Object.freeze(['hero', 'facts', 'text', 'band']);

// Filters and choices, with the editor's words.
export const DOG_STATUS = Object.freeze({ active: 'Active', retired: 'Retired', remembered: 'In memory' });
export const ANY3 = Object.freeze({ no: 'Leave out', any: 'Include', only: 'Only these' });
export const DOG_FLAGS = Object.freeze([['upcoming', 'Up and coming'], ['sale', 'Looking for a home'], ['away', 'Lives with a co-owner']]);
export const DOG_ORDER = Object.freeze({ own: "The breeder's order", age: 'Oldest first', young: 'Youngest first', name: 'By name' });
export const DOG_STYLE = Object.freeze({ slider: 'Slider', flip: 'Flip cards', light: 'Light cards' });
export const STAGES = Object.freeze({ current: 'Current', planned: 'Planned', past: 'Past' });
export const REVIEW_STYLE = Object.freeze({ slider: 'Slider', grid: 'Cards' });
export const SEXES = Object.freeze({ any: 'Any', female: 'Girls', male: 'Boys' });
export const LIMIT_MAX = 24;

// What a card shows (decision 15): its items, by face for a flip card, in order.
// The defaults draw today's cards exactly.
export const DOG_ITEMS = Object.freeze({
  photo: 'Photo', call: 'Call name', reg: 'Registered name', role: 'Breed and role', titles: 'Titles',
  tests: 'Health tests (or details)', bio: 'Bio', ask: '“Ask about” and price (for sale)', profile: 'View profile',
});
export const LITTER_ITEMS = Object.freeze({ eyebrow: 'Eyebrow (Current litter, Coming up…)', pair: 'The pair', facts: 'Facts', summary: 'Summary (planned litters)', link: 'Meet the puppies or See the waitlist' });
export const LITTER_PAIR = Object.freeze({ photos: "The parents' photos", name: "The litter's name", parents: "The pair's names" });
export const LITTER_ROWS = Object.freeze({ born: 'Born', deposits: 'Deposits from', puppies: 'Puppies', going: 'Going home or Ready now', expected: 'Expected (planned)', price: 'Price', deposit: 'Deposit' });
export const REVIEW_ITEMS = Object.freeze({ stars: 'Stars', quote: 'The quote', who: 'Who it is from' });
export const REVIEW_WHO = Object.freeze({ photo: 'Photo', name: 'First name and town', family: '“{pup}’s family, home {month}”' });

export const SHOW_DEFAULT = Object.freeze({
  dogs: { front: ['photo', 'call', 'reg', 'role', 'titles'], back: ['call', 'reg', 'tests', 'bio', 'ask', 'profile'] },
  litters: { items: ['eyebrow', 'pair', 'facts', 'summary', 'link'], pair: ['photos', 'name', 'parents'], rows: Object.keys(LITTER_ROWS), names: 2 },
  reviews: { items: ['stars', 'quote', 'who'], who: ['photo', 'name', 'family'] },
});

const dogsF = (o = {}) => ({ sex: 'any', status: ['active'], upcoming: 'no', sale: 'no', away: 'no', ...o });

// A new block of a type, as Add a block makes it.
export function newBlock(type, id) {
  const b = { id, type };
  if (type === 'dogs') Object.assign(b, { f: dogsF(), order: 'own', style: 'slider', limit: null, show: structuredClone(SHOW_DEFAULT.dogs), w: { eyebrow: 'Our dogs', heading: 'Meet our dogs' } });
  if (type === 'litters') Object.assign(b, { f: { stage: ['current', 'planned'] }, limit: null, show: structuredClone(SHOW_DEFAULT.litters), w: { eyebrow: 'Litters', heading: 'Current and upcoming' } });
  if (type === 'reviews') Object.assign(b, { style: 'slider', limit: null, show: structuredClone(SHOW_DEFAULT.reviews), w: { eyebrow: 'Families', heading: 'What our families say' } });
  return b;
}

// Today's Home, top to bottom (render/pages.js home before this step). The ids of
// the blocks she has a switch for are her home_blocks names; a data block's words
// come from there too (w is for blocks the owner adds).
export const HOME_DEFAULT = Object.freeze([
  { id: 'hero', type: 'hero' },
  { id: 'facts', type: 'facts' },
  { id: 'badges', type: 'badges' },
  { id: 'faq', type: 'faq' },
  { id: 'story', type: 'text' },
  { ...newBlock('dogs', 'dogs'), w: {} },
  { ...newBlock('litters', 'litters'), limit: 2, w: {} },
  { ...newBlock('reviews', 'reviews'), w: {} },
  { id: 'embeds', type: 'embeds' },
  { id: 'waitlist', type: 'band' },
].map((b) => Object.freeze(b)));

// The breeder's switches on Home (home_blocks), by block id.
export const BREEDER_SWITCH = Object.freeze(['hero', 'facts', 'story', 'dogs', 'litters', 'reviews', 'waitlist']);

// The other pages (model.js PAGES; Privacy stays fixed, outside the builder), each
// as today's site draws it, top to bottom. What a page is for is its built-in
// blocks (PAGE_PARTS): today's sections, kept whole so they draw exactly as before;
// the owner moves or removes them, and can put a removed one back. `inside`: a
// badge row placed right after it sits inside it, as today. The FAQ spot, the badge
// row and videos and posts are that page's place (model.js FAQ_PLACES,
// BADGE_PLACES; embeds' 'about'), so the questions and badges she has placed there
// carry over: a page has them only where today's has a place for them.
export const PAGE_PARTS = Object.freeze({
  about: { story: { name: 'Her story', hint: 'Her photo, her words and her facts.' } },
  reviews: { list: { name: 'Every review and the review form', hint: 'With the topic filter when her reviews have more than one topic.' } },
  contact: { main: { name: 'Her contact details and the contact form', inside: true } },
  dogs: {
    all: { name: 'Girls and boys', hint: 'Her breeding dogs as flip cards, with the Show filter when there are both.' },
    upcoming: { name: 'Up and coming', hint: 'Young dogs she has kept.' },
    for_sale: { name: 'Looking for a home', hint: 'Adults for sale, with their price by the rules.' },
    co_owned: { name: 'Shared with friends', hint: 'Co-owned dogs living with a partner kennel, and the kennels.' },
  },
  litters: {
    current: { name: 'Litters taking deposits', hint: "Each born litter whose deposits are open, with its pups. With nothing on the page, it says there are no litters." },
    older: { name: 'Older puppies', hint: 'Shows while the Older puppies page is on.' },
    upcoming: { name: 'Coming up', hint: 'Planned litters, and born ones whose deposits open later.' },
  },
  older: { list: { name: 'Every older puppy' } },
  how_it_works: { steps: { name: 'Her steps', inside: true } },
  extras: { list: { name: 'Her go-home packages and extras', inside: true } },
  products: { list: { name: 'Her recommended products' } },
  pickup: { words: { name: 'Pickup, transport and travel day', hint: 'Her words for each, and her transport services.' } },
  policies: { list: { name: 'Her policies', hint: 'Then her KennelOS waitlist policies, when her waitlist is linked.' } },
  faq: { list: { name: 'Every question' } },
  waitlist: { main: { name: 'The waitlist and application form', hint: 'Or her closed message; the list, the help link and how to pay.', inside: true } },
  albums: { list: { name: 'Every album' } },
  waitlist_help: { list: { name: 'Her help, as expanders', hint: 'And the sign-in and back-to-the-waitlist buttons.' } },
});
// Each page's heading when she has written none (render/pages.js pagehead).
export const PAGE_HEADS = Object.freeze({
  products: Object.freeze({ eyebrow: 'What we use', heading: 'Recommended products' }),
  pickup: Object.freeze({ eyebrow: 'Going home', heading: 'Getting your pup home' }),
  about: Object.freeze({ eyebrow: 'About us', heading: 'Our story' }),
  reviews: Object.freeze({ eyebrow: 'Reviews', heading: 'From our families' }),
  contact: Object.freeze({ eyebrow: 'Contact', heading: 'Say hello' }),
  dogs: Object.freeze({ eyebrow: 'Kennel residents', heading: 'Our dogs' }),
  litters: Object.freeze({ eyebrow: 'Puppies', heading: 'Puppies' }),
  older: Object.freeze({ eyebrow: 'Puppies', heading: 'Older puppies', lede: 'Puppies still looking for a home after their going-home date.' }),
  albums: Object.freeze({ eyebrow: 'Puppies', heading: 'Photo albums' }),
  how_it_works: Object.freeze({ eyebrow: 'How it works', heading: 'From application to home' }),
  extras: Object.freeze({ eyebrow: 'Extras', heading: 'Extras' }),
  policies: Object.freeze({ eyebrow: 'Our promises', heading: 'Policies' }),
  faq: Object.freeze({ eyebrow: 'Questions', heading: 'FAQ' }),
  waitlist_help: Object.freeze({ eyebrow: 'Waitlist', heading: 'Using your status page' }),
  waitlist: Object.freeze({ eyebrow: 'Waitlist', heading: 'Our waitlist' }),
});
const spots = (...t) => Object.freeze(t);
export const PAGE_SPOTS = Object.freeze({
  about: spots('badges', 'embeds'), reviews: spots(), contact: spots('faq', 'badges'), dogs: spots('faq'),
  litters: spots('faq', 'badges'), older: spots(), how_it_works: spots('faq', 'badges'), extras: spots('faq', 'badges'),
  products: spots(), pickup: spots('faq', 'badges'), policies: spots(), faq: spots(), waitlist: spots('faq', 'badges'),
  albums: spots(), waitlist_help: spots(),
});
const H = { id: 'head', type: 'head' };
const F = { id: 'faq', type: 'faq' };
const BG = { id: 'badges', type: 'badges' };
const part = (id) => ({ id, type: 'builtin' });
export const PAGE_DEFAULTS = Object.freeze(Object.fromEntries(Object.entries({
  about: [H, part('story'), BG, { id: 'embeds', type: 'embeds' }],
  reviews: [H, part('list')],
  contact: [H, F, part('main'), BG],
  dogs: [H, F, part('all'), part('upcoming'), part('for_sale'), part('co_owned')],
  litters: [H, F, part('current'), BG, part('older'), part('upcoming')],
  older: [H, part('list')],
  how_it_works: [H, F, part('steps'), BG],
  extras: [H, F, part('list'), BG],
  products: [H, part('list')],
  pickup: [H, F, part('words'), BG],
  policies: [H, part('list')],
  faq: [H, part('list')],
  waitlist: [H, F, part('main'), BG],
  albums: [H, part('list')],
  waitlist_help: [H, part('list')],
}).map(([k, v]) => [k, Object.freeze(v.map((b) => Object.freeze({ ...b })))])));
export const BUILT_PAGES = Object.freeze(['home', ...Object.keys(PAGE_DEFAULTS)]);

// What a block is called in the editor: a built-in by its part's name.
export const blockName = (key, b) => (b.type === 'builtin' ? PAGE_PARTS[key]?.[b.id]?.name ?? 'Built-in' : BLOCK_TYPES[b.type].name);
export const blockHint = (key, b) => (b.type === 'builtin' ? PAGE_PARTS[key]?.[b.id]?.hint ?? BLOCK_TYPES.builtin.hint : BLOCK_TYPES[b.type].hint);

// A block whose words and switch are the breeder's own (home_blocks): Home's.
export const hersOn = (key, b) => key === 'home' && BREEDER_SWITCH.includes(b.id);

// ---------- reading a saved build ----------

const pick = (v, opts, dflt) => (Object.hasOwn(opts, v) ? v : dflt);
const list = (v, opts) => (Array.isArray(v) ? [...new Set(v.filter((x) => Object.hasOwn(opts, x)))] : null);
const limitOf = (v) => (v == null || v === '' ? null : Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= LIMIT_MAX ? Number(v) : null);
const words = (w) => Object.fromEntries(Object.entries(w && typeof w === 'object' ? w : {}).filter(([k, v]) => ['eyebrow', 'heading', 'lede'].includes(k) && typeof v === 'string').map(([k, v]) => [k, v.slice(0, 200)]));

// One block, every field present and in range: what the renderer and the editor use.
export function cleanBlock(b) {
  if (!b || typeof b !== 'object' || !Object.hasOwn(BLOCK_TYPES, b.type)) return null;
  const id = String(b.id ?? '').slice(0, 40);
  if (!/^[a-z][a-z0-9_-]*$/.test(id)) return null;
  const out = { id, type: b.type };
  if (b.type === 'dogs') {
    const D = SHOW_DEFAULT.dogs;
    const f = b.f ?? {};
    out.f = { sex: pick(f.sex, SEXES, 'any'), status: list(f.status, DOG_STATUS) ?? ['active'], upcoming: pick(f.upcoming, ANY3, 'no'), sale: pick(f.sale, ANY3, 'no'), away: pick(f.away, ANY3, 'no') };
    out.order = pick(b.order, DOG_ORDER, 'own');
    out.style = pick(b.style, DOG_STYLE, 'slider');
    out.limit = limitOf(b.limit);
    out.show = { front: list(b.show?.front, DOG_ITEMS) ?? [...D.front], back: list(b.show?.back, DOG_ITEMS) ?? [...D.back] };
  } else if (b.type === 'litters') {
    const D = SHOW_DEFAULT.litters;
    out.f = { stage: list(b.f?.stage, STAGES) ?? ['current', 'planned'] };
    out.limit = limitOf(b.limit);
    const names = Number(b.show?.names);
    out.show = { items: list(b.show?.items, LITTER_ITEMS) ?? [...D.items], pair: list(b.show?.pair, LITTER_PAIR) ?? [...D.pair], rows: list(b.show?.rows, LITTER_ROWS) ?? [...D.rows], names: Number.isInteger(names) && names >= 0 && names <= 12 ? names : D.names };
  } else if (b.type === 'reviews') {
    const D = SHOW_DEFAULT.reviews;
    out.style = pick(b.style, REVIEW_STYLE, 'slider');
    out.limit = limitOf(b.limit);
    out.show = { items: list(b.show?.items, REVIEW_ITEMS) ?? [...D.items], who: list(b.show?.who, REVIEW_WHO) ?? [...D.who] };
  }
  if (BLOCK_TYPES[b.type].kind === 'data') out.w = words(b.w);
  return out;
}

// Can this block sit on this page? Data blocks anywhere; Home's own content on
// Home; a page's spots and built-ins on that page.
export function fits(key, b) {
  if (BLOCK_TYPES[b.type].kind === 'data') return true;
  if (isCustom(key)) return b.type === 'head';
  if (key === 'home') return b.type !== 'builtin' && b.type !== 'head';
  if (HOME_ONLY.includes(b.type)) return false;
  if (b.type === 'head') return true;
  if (b.type === 'builtin') return Object.hasOwn(PAGE_PARTS[key] ?? {}, b.id);
  return (PAGE_SPOTS[key] ?? []).includes(b.type) && b.id === b.type;
}

const defaultsOf = (key) => (key === 'home' ? HOME_DEFAULT : isCustom(key) ? [{ id: 'head', type: 'head' }] : PAGE_DEFAULTS[key] ?? []);

// A page's blocks for a build: the owner's, cleaned, or today's.
export function pageBlocks(build, key) {
  const saved = build?.pages?.[key]?.blocks;
  if (!Array.isArray(saved)) return defaultsOf(key).map((b) => cleanBlock(b));
  const seen = new Set();
  const once = new Set();
  return saved.map(cleanBlock).filter((b) => {
    if (!b || seen.has(b.id) || !fits(key, b)) return false;
    seen.add(b.id);
    if (BLOCK_TYPES[b.type].once) { if (once.has(b.type)) return false; once.add(b.type); }
    return true;
  });
}
export const homeBlocks = (build) => pageBlocks(build, 'home');

// What the snapshot carries: Home always, and each other page the owner changed
// (the renderer draws the rest as today's).
export function layoutFor(build) {
  const out = { home: homeBlocks(build) };
  for (const key of Object.keys(PAGE_DEFAULTS)) if (Array.isArray(build?.pages?.[key]?.blocks)) out[key] = pageBlocks(build, key);
  const custom = customPages(build);
  if (custom.length) out.custom = custom;
  for (const c of custom) out[c.id] = pageBlocks(build, c.id);
  return out;
}

// Is the page as today's? (For Every site's count and Back to today's.)
export const pageChanged = (build, key) => !isCustom(key) && Array.isArray(build?.pages?.[key]?.blocks)
  && JSON.stringify(pageBlocks(build, key)) !== JSON.stringify(pageBlocks(null, key));
export const homeChanged = (build) => pageChanged(build, 'home');
export const pagesChanged = (build) => BUILT_PAGES.filter((k) => pageChanged(build, k)).length;

// What Add a block offers on this page: data blocks always; content the page
// can have and doesn't (her one story, a removed built-in, its spots).
export function addable(key, blocks) {
  const have = new Set(blocks.map((b) => (b.type === 'builtin' ? `builtin:${b.id}` : b.type)));
  const out = [];
  for (const [t, T] of Object.entries(BLOCK_TYPES)) {
    if (t === 'builtin') {
      for (const id of Object.keys(PAGE_PARTS[key] ?? {})) if (!have.has(`builtin:${id}`)) out.push({ type: t, id });
      continue;
    }
    const b = { id: t === 'text' ? 'story' : t === 'band' ? 'waitlist' : t, type: t };
    if (T.kind !== 'data' && (!fits(key, b) || have.has(t))) continue;
    out.push({ type: t, id: null });
  }
  return out;
}

// ---------- the editor's form ----------

// The block settings form (manage/builder.js): fields named b.<id>.<field>, and the
// show lists as b.<id>.show.<face>.<item> checkboxes plus b.<id>.show.<face> holding
// the order ("photo,call,…").
export function blocksFromForm(blocks, get, getAll, key = 'home') {
  return blocks.map((b) => {
    const k = (f) => `b.${b.id}.${f}`;
    if (get(k('present')) == null) return b;
    const next = structuredClone(b);
    const order = (face, items) => {
      const ord = String(get(k(`show.${face}`)) ?? '').split(',').filter((x) => Object.hasOwn(items, x));
      const all = [...ord, ...Object.keys(items).filter((x) => !ord.includes(x))];
      return all.filter((x) => get(k(`show.${face}.${x}`)) != null);
    };
    if (b.type === 'dogs') {
      next.f = { sex: get(k('f.sex')), status: getAll(k('f.status')), upcoming: get(k('f.upcoming')), sale: get(k('f.sale')), away: get(k('f.away')) };
      next.order = get(k('order'));
      next.style = get(k('style'));
      next.limit = get(k('limit'));
      next.show = { front: order('front', DOG_ITEMS), back: order('back', DOG_ITEMS) };
    } else if (b.type === 'litters') {
      next.f = { stage: getAll(k('f.stage')) };
      next.limit = get(k('limit'));
      next.show = { items: order('items', LITTER_ITEMS), pair: order('pair', LITTER_PAIR), rows: order('rows', LITTER_ROWS), names: get(k('show.names')) };
    } else if (b.type === 'reviews') {
      next.style = get(k('style'));
      next.limit = get(k('limit'));
      next.show = { items: order('items', REVIEW_ITEMS), who: order('who', REVIEW_WHO) };
    }
    if (BLOCK_TYPES[b.type].kind === 'data' && !hersOn(key, b)) {
      next.w = { eyebrow: String(get(k('w.eyebrow')) ?? ''), heading: String(get(k('w.heading')) ?? ''), lede: String(get(k('w.lede')) ?? '') };
    }
    if (b.type === 'dogs' && !next.f.status.length) throw new BlockError('A Dog cards block needs at least one status.');
    if (b.type === 'litters' && !next.f.stage.length) throw new BlockError('A Litter cards block needs at least one stage.');
    return cleanBlock(next);
  });
}

// Move an item of a block's list (or a block itself) up or down.
export function moved(arr, i, dir) {
  const j = i + (dir === 'up' ? -1 : 1);
  if (i < 0 || j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// The build with a page's blocks set; back to today's when they are today's.
export function withPage(build, key, blocks) {
  const next = structuredClone(build ?? {});
  const same = JSON.stringify(blocks.map(cleanBlock)) === JSON.stringify(pageBlocks(null, key));
  if (same) {
    if (next.pages) delete next.pages[key];
    if (next.pages && !Object.keys(next.pages).length) delete next.pages;
  } else {
    next.pages = { ...(next.pages ?? {}), [key]: { blocks: blocks.map(cleanBlock) } };
  }
  return next;
}
export const withHome = (build, blocks) => withPage(build, 'home', blocks);

// ---------- pages the owner adds ----------

export const isCustom = (key) => CUSTOM_KEY.test(String(key ?? ''));

// Addresses no page of hers can take (plan, Page addresses): every page of the
// code's, the portal's and the system's own, as a first part of the address.
const TAKEN = new Set(['family', 'family-login', 'privacy', 'ops', 'health', 'v1', 'admin', 'api', 'apply', 'list', 's', 'f',
  ...Object.values(PAGES).map((p) => p.path.split('/')[1])]);
const PATH = /^\/[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
export const pathFor = (name) => `/${slugify(name) || 'page'}`;

// Her pages, as the build keeps them (build.custom), every field present.
export function customPages(build) {
  const seen = new Set();
  const paths = new Set();
  return (Array.isArray(build?.custom) ? build.custom : []).flatMap((c) => {
    if (!c || !isCustom(c.id) || seen.has(c.id) || !PATH.test(c.path ?? '') || TAKEN.has(c.path.slice(1)) || paths.has(c.path)) return [];
    seen.add(c.id);
    paths.add(c.path);
    const group = c.group !== 'waitlist' && MENU_GROUPS.some((g) => g.key === c.group) ? c.group : null;
    return [{ id: c.id, name: String(c.name ?? '').trim().slice(0, 40) || 'New page', path: c.path, group }];
  });
}
export const customOf = (build, key) => customPages(build).find((c) => c.id === key) ?? null;
export const isBuilt = (key, build = null) => BUILT_PAGES.includes(key) || Boolean(customOf(build, key));

// A page's starting heading when the breeder has written none: the code's, or a
// page of the owner's, its name.
export const headFor = (key, custom) => PAGE_HEADS[key] ?? { eyebrow: null, heading: custom?.name ?? '' };

function checkPage(build, id, { name, path, group }) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) throw new BlockError('Give the page a name.');
  if (clean.length > 40) throw new BlockError('A page name is 40 characters at most.');
  const p = String(path ?? '').trim().toLowerCase() || pathFor(clean);
  const at = p.startsWith('/') ? p : `/${p}`;
  if (!PATH.test(at)) throw new BlockError('An address is one word or a few joined by hyphens, like /our-dams: letters, numbers and hyphens.');
  if (TAKEN.has(at.slice(1))) throw new BlockError(`${at} is taken by a page of the site's own. Choose another address.`);
  if (customPages(build).some((c) => c.path === at && c.id !== id)) throw new BlockError(`Another page already has ${at}.`);
  const g = group && group !== 'waitlist' && MENU_GROUPS.some((x) => x.key === group) ? group : null;
  return { name: clean, path: at, group: g };
}

// Start shapes for a new page (the prototype's "Start with").
export const STARTS = Object.freeze({ blank: 'A page heading only', dams: 'Dog cards: girls, active', sires: 'Dog cards: boys, active' });

// A new page of hers: in the build, with its blocks. Returns the build and its id.
export function addPage(build, input) {
  const next = structuredClone(build ?? {});
  const page = checkPage(next, null, input);
  const taken = new Set(customPages(next).map((c) => c.id));
  const base = `x-${slugify(page.name).slice(0, 38).replace(/-+$/, '') || 'page'}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  const blocks = [{ id: 'head', type: 'head' }];
  if (input.start === 'dams' || input.start === 'sires') {
    const b = newBlock('dogs', 'dogs-2');
    b.f.sex = input.start === 'dams' ? 'female' : 'male';
    b.style = 'flip';
    b.w = { eyebrow: '', heading: '' };
    blocks.push(b);
  }
  next.custom = [...customPages(next), { id, ...page }];
  next.pages = { ...(next.pages ?? {}), [id]: { blocks: blocks.map(cleanBlock) } };
  return { build: next, id };
}

// Her page's name, address or menu group changed.
export function withPageInfo(build, id, input) {
  const next = structuredClone(build ?? {});
  const page = checkPage(next, id, input);
  next.custom = customPages(next).map((c) => (c.id === id ? { id, ...page } : c));
  return next;
}

// Her page gone, with its blocks.
export function withoutPage(build, id) {
  const next = structuredClone(build ?? {});
  next.custom = customPages(next).filter((c) => c.id !== id);
  if (!next.custom.length) delete next.custom;
  if (next.pages) delete next.pages[id];
  if (next.pages && !Object.keys(next.pages).length) delete next.pages;
  return next;
}

// The blocks on a page whose switch and words are the breeder's in block_switches:
// the data blocks the owner added (Home's own are home_blocks).
export const addedBlocks = (key, blocks) => blocks.filter((b) => BLOCK_TYPES[b.type].kind === 'data' && !hersOn(key, b));
