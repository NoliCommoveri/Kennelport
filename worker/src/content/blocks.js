// Pages as blocks (docs/Site_Builder_Plan.md, step 3): Home and the other pages
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
// the prototype's Home goes into the Website template for new sites (step 5).
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
  badges: { name: 'Badge row', ic: 'gift', kind: 'content', once: true, hint: 'The badges of the products she ticks for this page, two at most (on Home, her Home badges). Right after the banner, or a part that held one today, it sits inside it.' },
  faq: { name: 'FAQ spot', ic: 'book', kind: 'content', once: true, hint: 'The questions from her FAQ she ticks for this page.' },
  text: { name: 'Photo and words', ic: 'draft', kind: 'content', once: true, hint: 'Her story: photo, heading, words and features.' },
  dogs: { name: 'Dog cards', ic: 'paw', kind: 'data' },
  litters: { name: 'Litter cards', ic: 'heart', kind: 'data' },
  reviews: { name: 'Reviews', ic: 'star', kind: 'data' },
  embeds: { name: 'Videos and posts', ic: 'camera', kind: 'content', once: true, hint: 'The videos and posts she puts on Home.' },
  band: { name: 'Call-to-action band', ic: 'heart', kind: 'content', once: true, hint: 'Her waitlist band. Shows only while the waitlist page is on.' },
  // The owner's own blocks (decision 17): on any page, as many as she likes.
  banner: { name: 'Banner', ic: 'layers', kind: 'own', hint: 'A full-width strip: a heading, a line and a button, in a scheme colour.' },
  button: { name: 'Button', ic: 'link', kind: 'own', hint: 'One button, to a page, an outside site, a phone number or an email address.' },
  divider: { name: 'Divider', ic: 'list', kind: 'own', hint: 'A line, a brass rule or the scheme\'s ornament between blocks.' },
  spacer: { name: 'Spacer', ic: 'sliders', kind: 'own', hint: 'Empty space between blocks.' },
  photo: { name: 'Photo', ic: 'camera', kind: 'own', hint: 'One photo, with an optional caption.' },
  overlay: { name: 'Text over a photo', ic: 'camera', kind: 'own', hint: 'A photo with a heading, a line and a button over it.' },
  factrow: { name: 'Facts row (any page)', ic: 'star', kind: 'own', hint: 'Up to four facts side by side, each a big value over a small label (as on Home).' },
  words: { name: 'Text block', ic: 'draft', kind: 'own', hint: 'A heading, a line under it, and words: as many paragraphs as you like.' },
});

// ---------- the owner's own blocks and every block's look (step 4) ----------

// Where a button goes. A page on the site, an outside site, or the kennel's phone
// (a call or a text) or email: those follow Kennel details unless a number or
// address is typed in for the button. The breeder can change an outside link, a
// phone number or an email address; a page link is the owner's (decision 18).
export const LINK_TO = Object.freeze({ page: 'A page', url: 'An outside site', tel: 'A phone call', sms: 'A text message', email: 'An email' });
export const BUTTON_SIZE = Object.freeze({ s: 'Small', m: 'Medium', l: 'Large' });
export const BUTTON_LOOK = Object.freeze({ solid: 'Filled', line: 'Outline' });
export const ALIGN = Object.freeze({ left: 'Left', center: 'Centre', right: 'Right' });
export const DIVIDER_STYLE = Object.freeze({ line: 'Thin line', brass: 'Brass rule', ornament: "The scheme's ornament" });
export const DIVIDER_WIDTH = Object.freeze({ narrow: 'Narrow', wide: 'Wide', full: 'Full width' });
export const SPACER_HEIGHT = Object.freeze({ xs: 'Very small', s: 'Small', m: 'Medium', l: 'Large' });
export const PHOTO_SHAPE = Object.freeze({ wide: 'Wide', tall: 'Tall', square: 'Square', full: 'Full width' });
// A photo's frame: the Home banner collage's frames (model.js FRAMES), none to start.
export const PHOTO_FRAME = Object.freeze({ none: 'No frame', mat: 'A soft mat', double: 'A mat with a fine inner line', sprig: 'A leafy vine' });
export const PHOTO_FOCUS = Object.freeze({ top: 'The top', middle: 'The middle', bottom: 'The bottom' });
export const OVER_V = Object.freeze({ top: 'Top', middle: 'Middle', bottom: 'Bottom' });
export const OVER_SHADE = Object.freeze({ light: 'Light', medium: 'Medium', dark: 'Dark' });
// Every block's look. Colours are the scheme's, by name, so they follow light and
// dark and the scheme; text on them takes the scheme's matching ink.
export const BG_COLOURS = Object.freeze({ '': 'None', surface: 'Surface', band: 'Band', accent: 'Accent', foot: 'Footer colour' });
export const PAD = Object.freeze({ '': 'None added', s: 'Small', m: 'Medium', l: 'Large' });
export const TEXT_SIZE = Object.freeze({ xs: 'Very small', s: 'Small', m: 'Medium', l: 'Large' });
export const OWN_WORDS = Object.freeze({
  banner: { heading: 'Hoping for a puppy of your own?', line: '', label: 'Join the waitlist' },
  button: { label: 'Join the waitlist' },
  overlay: { heading: '', line: '', label: '' },
  photo: { caption: '' },
  words: { heading: '', line: '', body: '' },
});
const PHONE = /^[+()\d][\d\s().-]{5,24}$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export const looksLikePhone = (v) => PHONE.test(String(v ?? '').trim());
export const looksLikeEmail = (v) => EMAIL.test(String(v ?? '').trim());

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
// A facts row of the owner's: up to four [value, label] pairs, Home's facts' look.
export const FACTS_MAX = 4;
export const FACT_SIZES = Object.freeze([40, 240]);

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

const linkDefault = () => ({ to: 'page', page: 'waitlist' });
const dogsF = (o = {}) => ({ sex: 'any', status: ['active'], upcoming: 'no', sale: 'no', away: 'no', ...o });

// A new block of a type, as Add a block makes it.
export function newBlock(type, id) {
  const b = { id, type };
  if (type === 'dogs') Object.assign(b, { f: dogsF(), order: 'own', style: 'slider', limit: null, show: structuredClone(SHOW_DEFAULT.dogs), w: { eyebrow: 'Our dogs', heading: 'Meet our dogs' } });
  if (type === 'litters') Object.assign(b, { f: { stage: ['current', 'planned'] }, limit: null, show: structuredClone(SHOW_DEFAULT.litters), w: { eyebrow: 'Litters', heading: 'Current and upcoming' } });
  if (type === 'reviews') Object.assign(b, { style: 'slider', limit: null, show: structuredClone(SHOW_DEFAULT.reviews), w: { eyebrow: 'Families', heading: 'What our families say' } });
  if (type === 'banner') Object.assign(b, { w: { ...OWN_WORDS.banner }, link: linkDefault(), s: { bg: 'accent' } });
  if (type === 'button') Object.assign(b, { w: { ...OWN_WORDS.button }, link: linkDefault(), size: 'm', look: 'solid', align: 'center' });
  if (type === 'divider') Object.assign(b, { style: 'line', width: 'wide' });
  if (type === 'spacer') Object.assign(b, { height: 'm' });
  if (type === 'photo') Object.assign(b, { photo: null, shape: 'wide', frame: 'none', focus: 'middle', w: { caption: '' }, mayChange: true });
  if (type === 'factrow') Object.assign(b, { items: [] });
  if (type === 'words') Object.assign(b, { w: { heading: 'A few words from us', line: '', body: '' }, align: 'center' });
  if (type === 'overlay') Object.assign(b, { photo: null, focus: 'middle', w: { heading: 'Raised with love', line: '', label: '' }, link: null, v: 'bottom', h: 'left', shade: 'medium', mayChange: true });
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
// badge row placed right after it sits inside it, as today. The FAQ spot and the
// badge row are that page's place (model.js PLACE_KEYS), so the questions and
// badges she has placed there carry over; since step 3.6 the owner can add either
// to any page (SPOTS, below). PAGE_SPOTS is where today's pages have them, and
// where videos and posts can go (embeds' 'about').
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
// A text block's words are paragraphs; every other word is one line.
const WORD_MAX = { label: 40, body: 4000 };
const words = (w, keys = ['eyebrow', 'heading', 'lede']) => Object.fromEntries(Object.entries(w && typeof w === 'object' ? w : {}).filter(([k, v]) => keys.includes(k) && typeof v === 'string').map(([k, v]) => [k, (k === 'body' ? v.replace(/\r\n?/g, '\n') : v).trim().slice(0, WORD_MAX[k] ?? 200)]));
const PHOTO_ID = /^[A-Za-z0-9_-]{1,64}$/;

// A button's link, as the build keeps it, or null (no button).
export function cleanLink(l) {
  if (!l || typeof l !== 'object' || !Object.hasOwn(LINK_TO, l.to)) return null;
  if (l.to === 'page') return /^[a-z][a-z0-9_-]{0,44}$/.test(String(l.page ?? '')) ? { to: 'page', page: l.page } : null;
  const value = String(l.value ?? '').trim().slice(0, 300);
  if (l.to === 'url') return { to: 'url', value };
  return value ? { to: l.to, value } : { to: l.to };
}

// Every block's look: only what's set, so a block nobody styled reads as before.
function cleanStyle(st) {
  if (!st || typeof st !== 'object') return null;
  const out = {};
  if (Object.hasOwn(BG_COLOURS, st.bg) && st.bg) out.bg = st.bg;
  if (Object.hasOwn(PAD, st.py) && st.py) out.py = st.py;
  if (Object.hasOwn(PAD, st.px) && st.px) out.px = st.px;
  if (Object.hasOwn(TEXT_SIZE, st.text) && st.text !== 'm') out.text = st.text;
  return Object.keys(out).length ? out : null;
}

// A facts row's facts: pairs of text, the empty ones dropped, four at most.
export const cleanFacts = (v) => (Array.isArray(v) ? v : [])
  .filter((p) => Array.isArray(p) && p.length === 2)
  .map(([a, l]) => [String(a ?? '').replace(/\s+/g, ' ').trim().slice(0, FACT_SIZES[0]), String(l ?? '').replace(/\s+/g, ' ').trim().slice(0, FACT_SIZES[1])])
  .filter(([a, l]) => a || l).slice(0, FACTS_MAX);

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
  if (b.type === 'banner') { out.w = words(b.w, ['heading', 'line', 'label']); out.link = cleanLink(b.link); }
  if (b.type === 'button') {
    out.w = words(b.w, ['label']);
    out.link = cleanLink(b.link);
    out.size = pick(b.size, BUTTON_SIZE, 'm');
    out.look = pick(b.look, BUTTON_LOOK, 'solid');
    out.align = pick(b.align, ALIGN, 'center');
  }
  if (b.type === 'factrow') out.items = cleanFacts(b.items);
  if (b.type === 'words') { out.w = words(b.w, ['heading', 'line', 'body']); out.align = pick(b.align, ALIGN, 'center'); }
  if (b.type === 'divider') { out.style = pick(b.style, DIVIDER_STYLE, 'line'); out.width = pick(b.width, DIVIDER_WIDTH, 'wide'); }
  if (b.type === 'spacer') out.height = pick(b.height, SPACER_HEIGHT, 'm');
  if (b.type === 'photo' || b.type === 'overlay') {
    out.photo = PHOTO_ID.test(String(b.photo ?? '')) ? b.photo : null;
    out.focus = pick(b.focus, PHOTO_FOCUS, 'middle');
    out.mayChange = b.mayChange !== false;
  }
  if (b.type === 'photo') { out.shape = pick(b.shape, PHOTO_SHAPE, 'wide'); out.frame = pick(b.frame, PHOTO_FRAME, 'none'); out.w = words(b.w, ['caption']); }
  if (b.type === 'overlay') {
    out.w = words(b.w, ['heading', 'line', 'label']);
    out.link = cleanLink(b.link);
    out.v = pick(b.v, OVER_V, 'bottom');
    out.h = pick(b.h, ALIGN, 'left');
    out.shade = pick(b.shade, OVER_SHADE, 'medium');
  }
  const st = cleanStyle(b.s);
  if (st) out.s = st;
  return out;
}

// Can this block sit on this page? Data blocks anywhere; Home's own content on
// Home; a page's spots and built-ins on that page.
export function fits(key, b) {
  if (BLOCK_TYPES[b.type].kind === 'data' || BLOCK_TYPES[b.type].kind === 'own') return true;
  if (key === 'home') return b.type !== 'builtin' && b.type !== 'head';
  // A FAQ spot and a badge row: on any page (step 3.6), one each.
  if (SPOTS.includes(b.type)) return b.id === b.type;
  if (isCustom(key)) return b.type === 'head';
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
  if (menuChanged(build)) out.menu = menuOf(build);
  const profiles = Object.fromEntries(Object.keys(PROFILES).filter((k) => profileChanged(build, k)).map((k) => [k, profileOf(build, k)]));
  if (Object.keys(profiles).length) out.profiles = profiles;
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
    if (T.kind !== 'data' && T.kind !== 'own' && (!fits(key, b) || have.has(t))) continue;
    out.push({ type: t, id: null });
  }
  return out;
}

// ---------- the editor's form ----------

// The block settings form (manage/builder.js): fields named b.<id>.<field>, and the
// show lists as b.<id>.show.<face>.<item> checkboxes plus b.<id>.show.<face> holding
// the order ("photo,call,…").
export function blocksFromForm(blocks, get, getAll, key = 'home') {
  const str2 = (n) => String(get(n) ?? '');
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
    if (BLOCK_TYPES[b.type].kind === 'own') {
      const str = (f) => String(get(k(f)) ?? '');
      if (b.w) next.w = Object.fromEntries(Object.keys(b.w).map((x) => [x, str(`w.${x}`)]));
      if ('link' in b) {
        const to = str('link.to');
        next.link = !to ? null : to === 'page' ? { to, page: str('link.page') } : { to, value: str('link.value') };
        if (next.link && next.link.to === 'url' && next.link.value && !/^https?:\/\//i.test(next.link.value)) throw new BlockError('A button\'s outside link needs an address starting https://');
        if (next.link && ['tel', 'sms'].includes(to) && next.link.value && !looksLikePhone(next.link.value)) throw new BlockError('That phone number doesn\'t look like one.');
        if (next.link && to === 'email' && next.link.value && !looksLikeEmail(next.link.value)) throw new BlockError('That email address doesn\'t look like one.');
        if (next.link && to === 'url' && !next.link.value) throw new BlockError('A button to an outside site needs its address.');
      }
      for (const f of ['size', 'look', 'align', 'style', 'width', 'height', 'shape', 'frame', 'focus', 'v', 'h', 'shade']) if (f in b) next[f] = str(f);
      if ('items' in b) next.items = Array.from({ length: FACTS_MAX }, (_, i) => [str(`items.${i}.0`), str(`items.${i}.1`)]);
      if ('photo' in b) { next.photo = str('photo') || null; next.mayChange = get(k('mayChange')) != null; }
    }
    if (get(k('s.present')) != null) next.s = { bg: str2(k('s.bg')), py: str2(k('s.py')), px: str2(k('s.px')), text: str2(k('s.text')) };
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
    const group = typeof c.group === 'string' && GROUP_ID.test(c.group) ? c.group : null;
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
  const g = group && menuOf(build).some((x) => x.id === group && !x.button) ? group : null;
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
  return { build: placePage(next, id, page.group), id };
}

// Her page's name, address or menu group changed.
export function withPageInfo(build, id, input) {
  const next = structuredClone(build ?? {});
  const page = checkPage(next, id, input);
  next.custom = customPages(next).map((c) => (c.id === id ? { id, ...page } : c));
  return placePage(next, id, page.group);
}

// Her page gone, with its blocks.
export function withoutPage(build, id) {
  const next = structuredClone(build ?? {});
  if (menuChanged(next)) next.menu = menuOf(next).map((g) => ({ ...g, items: g.items.filter((it) => !(it.type === 'page' && it.page === id)) }));
  next.custom = customPages(next).filter((c) => c.id !== id);
  if (!next.custom.length) delete next.custom;
  if (next.pages) delete next.pages[id];
  if (next.pages && !Object.keys(next.pages).length) delete next.pages;
  return next;
}

// The blocks on a page whose switch and words are the breeder's in block_switches:
// the data blocks the owner added (Home's own are home_blocks).
export const addedBlocks = (key, blocks) => blocks.filter((b) => (BLOCK_TYPES[b.type].kind === 'data' && !hersOn(key, b)) || (BLOCK_TYPES[b.type].kind === 'own' && b.type !== 'spacer'));

// ---------- the menu (step 3.4) ----------
//
// The owner's menu: groups in order, each with its name, its items in order, and two
// switches: show it as a button (today's Waitlist) and show it in the footer. An item
// is a page, a place on a page (today's Girls, Boys, Available and Upcoming litters),
// or an outside link. The breeder names her pages in the menu, and switches them off,
// as before; she can't move anything.
//
// A site keeps a menu only once the owner changes it (build.menu); until then it is
// today's menu (defaultMenu), built from where each page sits today, with the pages
// she added in the groups she picked for them. The footer stays today's three
// columns until the menu is changed; then it follows the menu, a column per group.

export class MenuError extends Error {}

// The places on a page an item can point to, each showing only while it has
// something to show, as today.
export const MENU_PLACES = Object.freeze({
  'dogs#girls': { page: 'dogs', name: 'Girls', when: 'while there are breeding dogs of both sexes' },
  'dogs#boys': { page: 'dogs', name: 'Boys', when: 'while there are breeding dogs of both sexes' },
  'litters#available': { page: 'litters', name: 'Available', when: 'while a litter has puppies to choose from' },
  'litters#upcoming': { page: 'litters', name: 'Upcoming litters', when: 'while a litter is planned, or its deposits haven\'t opened' },
});
// Pages that can't be in the menu: Privacy sits in the footer's fine print.
const MENU_PAGES = Object.keys(PAGES).filter((k) => k !== 'privacy');
export const MENU_LIMITS = Object.freeze({ groups: 8, items: 20, label: 30, text: 40 });
const GROUP_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

// Today's menu, with her pages (customPages) in the groups she put them in.
export function defaultMenu(custom = []) {
  return MENU_GROUPS.map((g) => {
    const items = [];
    for (const [key, p] of Object.entries(PAGES)) {
      if (p.group !== g.key) continue;
      if (key === 'litters') {
        items.push({ type: 'place', place: 'litters#available' }, { type: 'place', place: 'litters#upcoming' }, { type: 'page', page: 'litters', fallback: true });
        continue;
      }
      items.push({ type: 'page', page: key });
      if (key === 'dogs') items.push({ type: 'place', place: 'dogs#girls' }, { type: 'place', place: 'dogs#boys' });
    }
    for (const c of custom) if (c.group === g.key) items.push({ type: 'page', page: c.id });
    return { id: g.key, label: g.label, button: g.key === 'waitlist', footer: true, items };
  });
}

const cleanText = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// One item as the build keeps it, or null (a page that's gone, a place that isn't one).
function cleanItem(it, pages) {
  if (!it || typeof it !== 'object') return null;
  if (it.type === 'page') {
    if (!pages.has(it.page)) return null;
    return { type: 'page', page: it.page, ...(it.fallback ? { fallback: true } : {}) };
  }
  if (it.type === 'place') {
    if (!Object.hasOwn(MENU_PLACES, it.place)) return null;
    const text = cleanText(it.text, MENU_LIMITS.text);
    return { type: 'place', place: it.place, ...(text ? { text } : {}) };
  }
  if (it.type === 'link') return { type: 'link', text: cleanText(it.text, MENU_LIMITS.text), url: String(it.url ?? '').trim().slice(0, 500) };
  return null;
}

// The owner's menu as the build keeps it: what's usable, quietly (a page she removed
// drops out). Null when the build has none.
export function cleanMenu(menu, custom = []) {
  if (!Array.isArray(menu)) return null;
  const pages = new Set([...MENU_PAGES, ...custom.map((c) => c.id)]);
  const seen = new Set();
  return menu.slice(0, MENU_LIMITS.groups).flatMap((g) => {
    if (!g || !GROUP_ID.test(String(g.id ?? '')) || seen.has(g.id)) return [];
    seen.add(g.id);
    const items = (Array.isArray(g.items) ? g.items : []).map((it) => cleanItem(it, pages)).filter(Boolean).slice(0, MENU_LIMITS.items);
    return [{ id: g.id, label: cleanText(g.label, MENU_LIMITS.label), button: Boolean(g.button), footer: g.footer !== false, items }];
  });
}

// The menu a build has: the owner's, or today's.
export const menuOf = (build) => cleanMenu(build?.menu, customPages(build)) ?? defaultMenu(customPages(build));
export const menuChanged = (build) => Array.isArray(build?.menu);

// What would stop it working (decision 16): a group with no name, an outside link
// that goes nowhere. An unusual menu is allowed.
function checkMenu(menu) {
  for (const g of menu) {
    if (!g.label) throw new MenuError('Give every group a name.');
    for (const it of g.items) {
      if (it.type !== 'link') continue;
      if (!it.text) throw new MenuError(`An outside link in ${g.label} needs its words.`);
      let u = null;
      try { u = new URL(it.url); } catch { /* below */ }
      if (!u || (u.protocol !== 'https:' && u.protocol !== 'http:')) throw new MenuError(`The outside link "${it.text}" needs a web address starting https://`);
      it.url = u.toString();
    }
  }
}

// The build with the owner's menu: kept only while it differs from today's.
export function withMenu(build, menu) {
  const next = structuredClone(build ?? {});
  const custom = customPages(next);
  const m = cleanMenu(menu, custom) ?? [];
  checkMenu(m);
  if (JSON.stringify(m) === JSON.stringify(defaultMenu(custom))) delete next.menu;
  else next.menu = m;
  return next;
}

// Which group a page is in (the first that lists it), or null.
export const groupOf = (menu, key) => menu.find((g) => g.items.some((it) => it.type === 'page' && it.page === key))?.id ?? null;

// A page of hers put in a group of the owner's menu (or none), at the end; where it
// already is, it stays where it is.
function placePage(build, id, group) {
  if (!menuChanged(build)) return build;
  const menu = menuOf(build);
  if (groupOf(menu, id) === (group || null)) return build;
  const out = menu.map((g) => ({ ...g, items: g.items.filter((it) => !(it.type === 'page' && it.page === id)) }));
  const g = out.find((x) => x.id === group);
  if (g) g.items.push({ type: 'page', page: id });
  return { ...build, menu: out };
}

// ---------- FAQ and badge spots (step 3.6) ----------
//
// The owner puts a FAQ spot or a badge row on any page, hers included, and on each
// kind of profile page (an item in what it shows: PROFILE_ITEMS). The breeder ticks,
// on each FAQ question and each product, which of those places show it: her tick
// boxes list only the places the owner has made (decision: the owner decides
// which pages can show them, the breeder which do). A place is the page's key
// (model.js PLACE_KEYS), or a page of hers by its id. Home's badge row is her Home
// badges (a product's home_badge), as always.
export const SPOTS = Object.freeze(['faq', 'badges']);

// The places a site offers for questions (faq) or badges, in the order her tick
// boxes list them: Home, the code's pages, the owner's pages, then the profiles.
export function spotPlaces(build, type) {
  const out = [];
  for (const key of BUILT_PAGES) {
    if (type === 'badges' && key === 'home') continue;
    if (pageBlocks(build, key).some((b) => b.type === type)) out.push(key);
  }
  for (const c of customPages(build)) if (pageBlocks(build, c.id).some((b) => b.type === type)) out.push(c.id);
  for (const kind of Object.keys(PROFILES)) if (profileOn(build, kind, type)) out.push(kind);
  return out;
}
// Does Home have its badge row (her Home badges)?
export const homeBadgesPlaced = (build) => homeBlocks(build).some((b) => b.type === 'badges');

// ---------- what each profile page shows (step 3.7) ----------
//
// Every dog's, litter's and puppy's own page, one setting per site (decision 15):
// which items it shows, in which part of the page, in what order, and on a dog's or
// a puppy's page which facts. The defaults are today's pages exactly. A site keeps
// only what the owner changed (build.profiles.<kind>); the snapshot carries it
// (layout.profiles). The breeder still words her records.
export const PROFILES = Object.freeze({ dog: "Every dog's page", litter: "Every litter's page", puppy: "Every puppy's page" });
export const PROFILE_PATHS = Object.freeze({ dog: '/dogs/<dog>', litter: '/litters/<litter>', puppy: '/litters/<litter>/<puppy>' });

// Each kind's parts, top to bottom, and its items. `fixed`: always on (the page's
// name). `only`: it can sit in that part only. `natural`: the part it sits in today.
export const PROFILE_PARTS = Object.freeze({
  dog: { above: 'Under the breadcrumb', side: 'Beside the photo', below: 'Under the photo' },
  puppy: { above: 'Under the breadcrumb', side: 'Beside the photo', below: 'Under the photo' },
  litter: { head: 'In the heading', body: 'Under the heading' },
});
export const PROFILE_ITEMS = Object.freeze({
  dog: {
    faq: 'FAQ spot: the questions she ticks for every dog', role: 'Breed and role', name: 'Call name', reg: 'Registered name', facts: 'Facts',
    bio: 'Bio', sale: 'Looking for a home: price and “Ask about”', tests: 'Health testing (with verify links)', share: 'Share button',
    badges: 'Badge row: the badges she ticks for every dog', embeds: 'Videos and posts', litters: "The dog's litters",
  },
  puppy: {
    faq: 'FAQ spot: the questions she ticks for every puppy', status: 'Status', name: 'Name', facts: 'Facts', bio: 'Bio',
    ask: '“Ask about this puppy” and the full-registration link', surcharge: 'The full-registration surcharge', notice: 'The safe-payment notice', share: 'Share button',
    badges: 'Badge row: the badges she ticks for every puppy', photos: 'Its photos', albums: "The litter's albums",
  },
  litter: {
    pair: "The pair's names", summary: 'Summary',
    faq: 'FAQ spot: the questions she ticks for every litter', parents: 'Parent cards', facts: 'Facts', note: 'Price note', fullreg: 'The full-registration link and surcharge',
    share: 'Share button', pups: 'Pup cards', badges: 'Badge row: the badges she ticks for every litter', embeds: 'Videos and posts', albums: 'Albums',
  },
});
export const PROFILE_FIXED = Object.freeze({ dog: ['name'], puppy: ['name'], litter: [] });
export const PROFILE_ONLY = Object.freeze({ dog: {}, puppy: {}, litter: { pair: 'head', summary: 'head', faq: 'body', parents: 'body', facts: 'body', note: 'body', fullreg: 'body', share: 'body', pups: 'body', badges: 'body', embeds: 'body', albums: 'body' } });
// The facts on a dog's and a puppy's page, today's order.
export const PROFILE_FACTS = Object.freeze({
  dog: { sex: 'Sex', color: 'Color', born: 'Born', weight: 'Weight', registry: 'Registry', titles: 'Titles', co_owned: 'Co-owned with', lives_with: 'Lives with' },
  puppy: { sex: 'Sex', color: 'Color', collar: 'Collar', status: 'Status', price: 'Price', registration: 'Registration', registry: 'Registry', parents: 'Parents', born: 'Born' },
});
// Today's pages: each part's items in order. What isn't listed is off (a dog's
// badge row: today's dog pages have none).
export const PROFILE_DEFAULT = Object.freeze({
  dog: { parts: { above: ['faq'], side: ['role', 'name', 'reg', 'facts', 'bio', 'sale', 'tests', 'share'], below: ['embeds', 'litters'] }, facts: Object.keys(PROFILE_FACTS.dog) },
  puppy: { parts: { above: ['faq'], side: ['status', 'name', 'facts', 'bio', 'ask', 'surcharge', 'notice', 'share'], below: ['badges', 'photos', 'albums'] }, facts: Object.keys(PROFILE_FACTS.puppy) },
  litter: { parts: { head: ['pair', 'summary'], body: ['faq', 'parents', 'facts', 'note', 'fullreg', 'share', 'pups', 'badges', 'embeds', 'albums'] } },
});
// The part an item sits in when switched on: where today's page has it, else the
// last part (a dog's badge row goes under the photo).
export function homePart(kind, item) {
  const parts = PROFILE_DEFAULT[kind].parts;
  return Object.keys(parts).find((p) => parts[p].includes(item)) ?? PROFILE_ONLY[kind][item] ?? Object.keys(parts).at(-1);
}

// A kind's setting, every part present and every item where it may be: the
// owner's, cleaned, or today's.
export function cleanProfile(kind, v) {
  const D = PROFILE_DEFAULT[kind];
  const items = PROFILE_ITEMS[kind];
  const src = v && typeof v === 'object' && v.parts && typeof v.parts === 'object' ? v : D;
  const seen = new Set();
  const parts = {};
  for (const part of Object.keys(PROFILE_PARTS[kind])) {
    parts[part] = (Array.isArray(src.parts[part]) ? src.parts[part] : []).filter((x) => {
      if (!Object.hasOwn(items, x) || seen.has(x)) return false;
      const only = PROFILE_ONLY[kind][x];
      if (only && only !== part) return false;
      seen.add(x);
      return true;
    });
  }
  // The page's name is always on, in its own part where it isn't placed.
  for (const x of PROFILE_FIXED[kind]) if (!seen.has(x)) parts[homePart(kind, x)].unshift(x);
  const out = { parts };
  if (PROFILE_FACTS[kind]) out.facts = list(src.facts, PROFILE_FACTS[kind]) ?? [...D.facts];
  return out;
}
export const profileOf = (build, kind) => cleanProfile(kind, build?.profiles?.[kind]);
export const profileChanged = (build, kind) => build?.profiles?.[kind] != null && JSON.stringify(profileOf(build, kind)) !== JSON.stringify(cleanProfile(kind, null));
export const profileOn = (build, kind, item) => Object.values(profileOf(build, kind).parts).some((p) => p.includes(item));

// The build with a kind's setting; back to today's when it is today's.
export function withProfile(build, kind, v) {
  const next = structuredClone(build ?? {});
  const clean = cleanProfile(kind, v);
  if (JSON.stringify(clean) === JSON.stringify(cleanProfile(kind, null))) {
    if (next.profiles) delete next.profiles[kind];
    if (next.profiles && !Object.keys(next.profiles).length) delete next.profiles;
  } else {
    next.profiles = { ...(next.profiles ?? {}), [kind]: clean };
  }
  return next;
}

// The editor's form (manage/builder.js): each part's items as p.part.<part> (the
// order shown, on and off), each item's switch p.on.<item> and its part
// p.at.<item>; the facts as p.facts (the order shown) and p.fact.<key>. An item
// moved to another part goes at the end of it. `act`: pmv:<item>:<up|down> moves an
// item within its part, fmv:<key>:<up|down> a fact.
export function profileFromForm(kind, get) {
  const cur = cleanProfile(kind, null);
  const parts = Object.keys(PROFILE_PARTS[kind]);
  const items = PROFILE_ITEMS[kind];
  const listed = Object.fromEntries(parts.map((p) => [p, String(get(`p.part.${p}`) ?? '').split(',').filter((x) => Object.hasOwn(items, x))]));
  const act = String(get('act') ?? '').split(':');
  if (act[0] === 'pmv') {
    const p = parts.find((x) => listed[x].includes(act[1]));
    if (p) listed[p] = moved(listed[p], listed[p].indexOf(act[1]), act[2]);
  }
  const at = (x, p) => { const v = String(get(`p.at.${x}`) ?? p); return parts.includes(v) ? v : p; };
  const out = { parts: {} };
  for (const p of parts) out.parts[p] = [];
  for (const p of parts) for (const x of listed[p]) if (at(x, p) === p) out.parts[p].push(x);
  for (const p of parts) for (const x of listed[p]) if (at(x, p) !== p) out.parts[at(x, p)].push(x);
  for (const p of parts) out.parts[p] = out.parts[p].filter((x) => PROFILE_FIXED[kind].includes(x) || get(`p.on.${x}`) != null);
  if (PROFILE_FACTS[kind]) {
    let order = String(get('p.facts') ?? '').split(',').filter((x) => Object.hasOwn(PROFILE_FACTS[kind], x));
    for (const x of Object.keys(PROFILE_FACTS[kind])) if (!order.includes(x)) order.push(x);
    if (act[0] === 'fmv') order = moved(order, order.indexOf(act[1]), act[2]);
    out.facts = order.filter((x) => get(`p.fact.${x}`) != null);
  }
  return act[0] === 'default' ? cur : cleanProfile(kind, out);
}
