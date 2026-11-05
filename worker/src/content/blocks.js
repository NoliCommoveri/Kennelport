// Pages as blocks (docs/Site_Builder_Plan.md, step 2), starting with Home: which
// blocks it has, in what order, each data block's records (filters, order, how
// many, style) and what its cards show. The owner sets these per site in her admin
// view (manage/builder.js); the breeder still switches Home's blocks on or off and
// words them (home_blocks), as before.
//
// A site keeps only what the owner changed (site_builds.build.pages.home); with
// nothing there, Home is today's Home exactly (HOME_DEFAULT), so no site looks
// different the day this ships (decision 14). The published snapshot carries the
// result (snap.layout), so rendering stays pure.
//
// Today's Home has blocks the prototype's Home doesn't (the badge row, a question
// she placed there, videos and posts) and draws a few differently (the facts sit in
// the top block, two litters at most). Those stay as today on every existing site;
// the prototype's Home goes into the Website template for new sites (step 3).
export class BlockError extends Error {}

// The block types, as the prototype names them. `once`: it draws the breeder's one
// piece of content (her story, her facts), so a page has it at most once.
// `switch`: the breeder's switch for it (home_blocks), on Home.
export const BLOCK_TYPES = Object.freeze({
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

// ---------- reading a saved build ----------

const pick = (v, opts, dflt) => (Object.hasOwn(opts, v) ? v : dflt);
const list = (v, opts) => (Array.isArray(v) ? [...new Set(v.filter((x) => Object.hasOwn(opts, x)))] : null);
const limitOf = (v) => (v == null || v === '' ? null : Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= LIMIT_MAX ? Number(v) : null);
const words = (w) => Object.fromEntries(Object.entries(w && typeof w === 'object' ? w : {}).filter(([k, v]) => ['eyebrow', 'heading', 'lede'].includes(k) && typeof v === 'string').map(([k, v]) => [k, v.slice(0, 200)]));

// One block, every field present and in range: what the renderer and the editor use.
export function cleanBlock(b) {
  if (!b || typeof b !== 'object' || !Object.hasOwn(BLOCK_TYPES, b.type)) return null;
  const id = String(b.id ?? '').slice(0, 40);
  if (!/^[a-z][a-z0-9-]*$/.test(id)) return null;
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

// Home's blocks for a build: hers, cleaned, or today's.
export function homeBlocks(build) {
  const saved = build?.pages?.home?.blocks;
  if (!Array.isArray(saved)) return HOME_DEFAULT.map((b) => cleanBlock(b));
  const seen = new Set();
  const once = new Set();
  return saved.map(cleanBlock).filter((b) => {
    if (!b || seen.has(b.id)) return false;
    seen.add(b.id);
    if (BLOCK_TYPES[b.type].once) { if (once.has(b.type)) return false; once.add(b.type); }
    return true;
  });
}

export const layoutFor = (build) => ({ home: homeBlocks(build) });

// Is Home as today's? (For Every site's count and Back to today's Home.)
export const homeChanged = (build) => Array.isArray(build?.pages?.home?.blocks)
  && JSON.stringify(homeBlocks(build)) !== JSON.stringify(homeBlocks(null));

// ---------- the editor's form ----------

// The block settings form (manage/builder.js): fields named b.<id>.<field>, and the
// show lists as b.<id>.show.<face>.<item> checkboxes plus b.<id>.show.<face> holding
// the order ("photo,call,…").
export function blocksFromForm(blocks, get, getAll) {
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
    if (BLOCK_TYPES[b.type].kind === 'data' && !BREEDER_SWITCH.includes(b.id)) {
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

// The build with Home's blocks set; back to today's when they are today's.
export function withHome(build, blocks) {
  const next = structuredClone(build ?? {});
  const same = JSON.stringify(blocks.map(cleanBlock)) === JSON.stringify(homeBlocks(null));
  if (same) {
    if (next.pages) delete next.pages.home;
    if (next.pages && !Object.keys(next.pages).length) delete next.pages;
  } else {
    next.pages = { ...(next.pages ?? {}), home: { blocks: blocks.map(cleanBlock) } };
  }
  return next;
}
