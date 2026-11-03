// The content model: every field a breeder (or, in phase 1, the operator) can
// set, with its type and limits. One list, used by:
// - the content import and export in /ops (phase 1, content/io.js);
// - the snapshot builder (publish.js), which copies only these fields;
// - later, the manage app's forms (phase 2).
// A field not named here is never stored or published.

const S = (max, extra = {}) => ({ type: 'text', max, ...extra });
const ML = (max) => ({ type: 'text', max, multiline: true });
const DATE = { type: 'date' };
const URL_ = { type: 'url' };
const INT = (min, max) => ({ type: 'int', min, max });
const BOOL = { type: 'bool' };
const ENUM = (...values) => ({ type: 'enum', values });
// The colour schemes' ids (render/schemes.js holds the schemes themselves).
export const SCHEME_IDS = ['lawn', 'harbor', 'heather', 'clay', 'slate', 'midnight', 'tuxedo'];

export const SITE_FIELDS = {
  kennel_name: S(80, { required: true }),
  tagline: S(80),
  blurb: ML(300),
  breed: S(60),
  monogram: S(3),
  logo_photo_id: { type: 'photo' },
  town: S(60),
  region: S(60),
  contact_email: { type: 'email' },
  contact_phone: S(30),
  facebook_url: URL_,
  facebook_label: S(80),
  instagram_url: URL_,
  scheme: { ...ENUM(...SCHEME_IDS), ui: 'scheme' },
  dark_mode: ENUM('auto', 'light_only'),
  show_other_prices: BOOL,
};

export const DOG_FIELDS = {
  slug: { type: 'slug', required: true },
  call_name: S(40, { required: true }),
  registered_name: S(120),
  registry: S(30),
  sex: { ...ENUM('female', 'male'), required: true },
  role: S(30),
  color: S(40),
  date_of_birth: DATE,
  titles: S(120),
  bio: ML(600),
  photo_id: { type: 'photo' },
  status: ENUM('active', 'retired', 'remembered'),
  upcoming: BOOL,
  for_sale: BOOL,
  price: INT(0, 100000),
  died_on: DATE,
  health_display: ENUM('normal_only', 'all', 'none'),
  show_on_site: BOOL,
};

export const HEALTH_FIELDS = {
  test: S(60, { required: true }),
  result: S(60, { required: true }),
  normal: BOOL,
  date: DATE,
  verify_url: URL_,
  show: BOOL,
};

export const LITTER_FIELDS = {
  slug: { type: 'slug', required: true },
  name: S(80, { required: true }),
  stage: { ...ENUM('planned', 'current', 'past'), required: true },
  plan_label: S(40),
  dam: { type: 'dogref' },
  sire: { type: 'dogref' },
  dam_name: S(60),
  sire_name: S(60),
  born_on: DATE,
  ready_on: DATE,
  expected_label: S(60),
  ready_label: S(60),
  deposits_on: DATE,
  summary: ML(400),
  price_female: INT(0, 100000),
  price_male: INT(0, 100000),
  full_reg_female: INT(0, 100000),
  full_reg_male: INT(0, 100000),
  deposit_female: INT(0, 100000),
  deposit_male: INT(0, 100000),
  price_note: S(200),
  show_prices: BOOL,
  show_placed: BOOL,
  ask_full_reg: BOOL,
  show_puppy_photos: BOOL,
  show_on_site: BOOL,
};
// The litter's figures (plan 3.2): KennelOS's while Use my KennelOS prices is on.
export const LITTER_PRICE_FIELDS = ['price_female', 'price_male', 'full_reg_female', 'full_reg_male', 'deposit_female', 'deposit_male'];

export const PUPPY_STATUSES = ['available', 'reserved', 'placed', 'staying', 'coming_soon', 'hidden'];

export const PUPPY_FIELDS = {
  slug: { type: 'slug', required: true },
  name: S(40, { required: true }),
  collar: S(30),
  sex: { ...ENUM('female', 'male'), required: true },
  color: S(40),
  status: ENUM(...PUPPY_STATUSES),
  registration: ENUM('limited', 'full'),
  registry: S(30),
  price: INT(0, 100000),
  bio: ML(400),
  photo_id: { type: 'photo' },
  more_photos_url: URL_,
};

export const REVIEW_FIELDS = {
  quote: { ...ML(1500), required: true },
  rating: INT(1, 5),
  first_name: S(60, { required: true }),
  town: S(60),
  puppy_name: S(40),
  home_month: { type: 'month' },
  topic: S(30),
  photo_id: { type: 'photo' },
  status: ENUM('approved', 'hidden'),
};

export const STEP_FIELDS = {
  heading: S(80, { required: true }),
  body: ML(400),
  detail: ML(800),
  pay_link: BOOL,
};

export const EXPANDER_PAGES = ['policies', 'faq', 'waitlist_help'];
export const EXPANDER_FIELDS = {
  heading: S(120, { required: true }),
  body: { ...ML(2000), required: true },
  start_open: BOOL,
};

export const EXTRA_FIELDS = {
  kind: { ...ENUM('item', 'homegoing'), required: true },
  grp: S(40),
  name: S(80, { required: true }),
  description: ML(600),
  photo_id: { type: 'photo' },
  price_from: INT(0, 100000),
  price_to: INT(0, 100000),
  weeks: INT(1, 52),
  lead_in: S(120),
  checklist: { type: 'list', max: 30, itemMax: 120 },
  closing: ML(400),
  featured: BOOL,
};

// Recommended products (the /recommended page): food, gear and the like she
// suggests, each with an optional referral link and code. Up to HOME_BADGES_MAX
// with home_badge on also show as a logo right under the banner on Home, linked
// the same way.
//
// image_url: the brand's own picture, shown straight from the brand (hotlinked,
// as its referral program intends), only from these addresses; every page lets
// browsers load pictures from them and nowhere else (site.js SITE_CSP). A
// picture from anywhere else is copied onto the site as photo_id (badgeCode.js).
// Adding a brand means adding its address here.
export const HOME_BADGES_MAX = 2;
export const BRAND_IMAGE_ORIGINS = ['https://tlcpetpro.com'];
export const brandImageOk = (url) => {
  try { return BRAND_IMAGE_ORIGINS.includes(new URL(url).origin); } catch { return false; }
};
export const PRODUCT_FIELDS = {
  name: S(80, { required: true }),
  grp: S(40),
  description: ML(600),
  photo_id: { type: 'photo' },
  image_url: URL_,
  link_url: URL_,
  link_label: S(40),
  code: S(40),
  code_note: S(120),
  home_badge: BOOL,
};

// The Home collage (top of the page): pre-drawn layouts, each a list of box
// shapes in box order. The breeder picks a layout, then a photo for each box, so
// a wide photo goes in a wide box and isn't cut off at both sides. With fewer
// photos than boxes, the site uses the layout for that many (collageLayout).
export const BOX_SHAPES = { wide: 'wide', tall: 'tall', square: 'square' };
export const COLLAGE_LAYOUTS = {
  one_wide: { label: 'One wide photo', boxes: ['wide'] },
  one_tall: { label: 'One tall photo', boxes: ['tall'] },
  two_tall: { label: 'Two tall, side by side', boxes: ['tall', 'tall'] },
  two_wide: { label: 'Two wide, one above the other', boxes: ['wide', 'wide'] },
  tall_two_wide: { label: 'One tall, two wide beside it', boxes: ['tall', 'wide', 'wide'] },
  wide_two_square: { label: 'One wide, two square below', boxes: ['wide', 'square', 'square'] },
  four_square: { label: 'Four square', boxes: ['square', 'square', 'square', 'square'] },
};
export const FOCUS = ['top', 'middle', 'bottom'];
// How the collage's boxes are framed, in the scheme's own colours: a soft mat, the
// mat with a brass inner rule, a leafy vine round each photo ('sprig'), or
// bare photos.
export const FRAMES = ['mat', 'double', 'sprig', 'none'];

// The layout the site draws for `count` photos: the chosen one when it has that
// many boxes, else one for that many (keeping the chosen first box's shape where
// it can), else none.
export function collageLayout(layout, count) {
  const chosen = COLLAGE_LAYOUTS[layout];
  if (chosen && chosen.boxes.length === count) return layout;
  const first = chosen?.boxes[0];
  switch (count) {
    case 0: return null;
    case 1: return first === 'tall' ? 'one_tall' : 'one_wide';
    case 2: return chosen && chosen.boxes.slice(0, 2).every((b) => b === 'wide') ? 'two_wide' : 'two_tall';
    case 3: return first === 'wide' ? 'wide_two_square' : 'tall_two_wide';
    default: return 'four_square';
  }
}

// Home blocks (plan 3.12): fixed order; each has an On switch and these keys.
export const HOME_BLOCKS = {
  hero: {
    banner_photo_id: { type: 'photo' }, banner_focus: { ...ENUM(...FOCUS), default: 'middle' },
    eyebrow: S(60), headline: S(80), script: S(60), intro: ML(400),
    layout: { type: 'layout', values: Object.keys(COLLAGE_LAYOUTS) },
    frame: { ...ENUM(...FRAMES), default: 'mat' },
    photos: { type: 'list', max: 4, item: 'photo', boxes: true },
    focus: { type: 'list', max: 4, item: 'focus' },
    primary_label: S(30), secondary_label: S(30),
  },
  facts: { items: { type: 'pairs', max: 3, keyMax: 12, valueMax: 30 } },
  story: {
    photo_id: { type: 'photo' }, eyebrow: S(60), heading: S(80), script: S(40), text: ML(800),
    features: { type: 'features', max: 3 }, link_label: S(40),
  },
  dogs: { eyebrow: S(60), heading: S(80), lede: S(200), link_label: S(40) },
  litters: { eyebrow: S(60), heading: S(80), link_label: S(40) },
  reviews: { eyebrow: S(60), heading: S(80), link_label: S(40) },
  waitlist: { heading: S(80), line: ML(240), button_label: S(30) },
};
export const HOME_BLOCK_ORDER = Object.keys(HOME_BLOCKS);

// How to pay (plan 3.9): the application fee and the deposit, each its own card on
// the waitlist page, off until the breeder turns it on. Methods are [method,
// details] pairs ("Venmo", "@ak-bostons"). Amounts aren't fields: they follow the
// prices rule (3.2) and appear only if typed into the wording.
export const PAYMENT_KINDS = ['application_fee', 'deposit'];
export const PAYMENT_FIELDS = {
  show_on_site: BOOL,
  title: S(60),
  due_note: ML(240),
  methods: { type: 'pairs', max: 6, keyMax: 24, valueMax: 160, placeholders: ['Venmo', '@your-handle'], names: ['way', 'details'] },
  note: S(200),
  pay_url: URL_,
  pay_label: S(40),
};
// The safe-payment notice: on by default (plan 3.12), in the breeder's words or
// the default (render/parts.js SAFE_NOTICE_TEXT).
export const SAFE_NOTICE_FIELDS = { enabled: BOOL, text: ML(400) };

// Albums (plan 3.1, phase 5): a gallery with its own address, optionally of one
// litter (named by slug here, by id in the manage app), its photos in order.
export const ALBUM_PHOTOS_MAX = 300;
export const ALBUM_FIELDS = {
  slug: { type: 'slug', required: true },
  title: S(80, { required: true }),
  description: ML(600),
  litter: { type: 'litterref' },
  cover_photo_id: { type: 'photo' },
  photos: { type: 'list', item: 'photo', max: ALBUM_PHOTOS_MAX },
  more_photos_url: URL_,
  show_on_site: BOOL,
};

// The application form (plan 3.8, 3.10; decision 26), for breeders who run their
// list by hand: name and email are always asked; then these questions, in order.
// Each type has a fixed shape on the site and a fixed check on the server
// (siteforms.js): a choice is one of its options; a litter is one of the site's
// planned or current litters, or "Any litter"; yes/no is Yes or No.
export const QUESTION_TYPES = ['text', 'paragraph', 'choice', 'yes_no', 'litter', 'phone', 'town'];
export const QUESTION_FIELDS = {
  type: { ...ENUM(...QUESTION_TYPES), required: true },
  label: S(120, { required: true }),
  hint: S(200),
  required: BOOL,
  options: { type: 'list', max: 12, itemMax: 60 },
};
// What cleanRecord can't check alone: a choice needs something to choose from,
// and only a choice has options.
export function checkQuestion(q, path) {
  if (q.type === 'choice' && (q.options?.length ?? 0) < 2) throw new ContentError(`${path}.options`, 'a choice needs at least two options, one per line');
  if (q.type !== 'choice') q.options = null;
  return q;
}

// Icons a story feature may use: the template's own set.
export const FEATURE_ICONS = ['shield', 'home', 'heart', 'star', 'paw', 'leaf'];

// Every page: its address, its menu group, whether it can be switched off, and
// the wording keys it has (plan 3.1, 3.12). Order within a group is this order.
const HEAD = { eyebrow: S(60), heading: S(80), lede: ML(300) };
export const PAGES = {
  about:          { path: '/about', group: 'about', label: 'Our story', canHide: true, fields: { ...HEAD, photo_id: { type: 'photo' }, text: ML(4000), facts: { type: 'pairs', max: 6, keyMax: 40, valueMax: 60 } } },
  reviews:        { path: '/reviews', group: 'about', label: 'Reviews', canHide: true, fields: { ...HEAD } },
  contact:        { path: '/contact', group: 'about', label: 'Contact', canHide: false, fields: { ...HEAD, location_note: S(160) } },
  dogs:           { path: '/dogs', group: 'residents', label: 'All our dogs', canHide: true, fields: { ...HEAD } },
  litters:        { path: '/litters', group: 'puppies', label: 'Puppies', canHide: true, fields: { ...HEAD } },
  older:          { path: '/litters/older', group: 'puppies', label: 'Older puppies', canHide: true, fields: { ...HEAD } },
  how_it_works:   { path: '/how-it-works', group: 'how', label: 'The steps', canHide: true, fields: { ...HEAD } },
  extras:         { path: '/extras', group: 'how', label: 'Extras', canHide: true, fields: { ...HEAD, note: ML(300) } },
  products:       { path: '/recommended', group: 'how', label: 'Recommended products', canHide: true, fields: { ...HEAD, note: ML(300) } },
  policies:       { path: '/policies', group: 'how', label: 'Policies', canHide: true, fields: { ...HEAD } },
  faq:            { path: '/faq', group: 'how', label: 'FAQ', canHide: true, fields: { ...HEAD } },
  waitlist:       { path: '/waitlist', group: 'waitlist', label: 'Waitlist', canHide: true, fields: { ...HEAD, closed: BOOL, closed_message: ML(400), form_heading: S(80), form_intro: ML(300), offer_message: ML(600) } },
  albums:         { path: '/albums', group: 'puppies', label: 'Photo albums', canHide: true, fields: { ...HEAD } },
  waitlist_help:  { path: '/waitlist/help', group: 'waitlist', label: 'Using your status page', canHide: true, fields: { ...HEAD } },
  privacy:        { path: '/privacy', group: null, label: 'Privacy', canHide: false, fields: {} },
};

// The menu's five groups (plan 3.12), fixed.
export const MENU_GROUPS = [
  { key: 'about', label: 'About us' },
  { key: 'residents', label: 'Kennel residents' },
  { key: 'puppies', label: 'Puppies' },
  { key: 'how', label: 'How it works' },
  { key: 'waitlist', label: 'Waitlist' },
];

// ---------- checking one value against its field ----------

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

export class ContentError extends Error {
  constructor(path, message) {
    super(`${path}: ${message}`);
    this.path = path;
  }
}

export function slugify(text) {
  return String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
}

function checkUrl(v, path) {
  let u;
  try { u = new URL(v); } catch { throw new ContentError(path, 'not a web address'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ContentError(path, 'must start with https://');
  return u.toString();
}

function cleanText(v, f, path) {
  if (typeof v !== 'string') throw new ContentError(path, 'must be text');
  let s = v.replace(/\r\n?/g, '\n');
  if (!f.multiline) s = s.replace(/\s+/g, ' ');
  s = s.trim();
  if (f.max && s.length > f.max) throw new ContentError(path, `longer than ${f.max} characters`);
  return s;
}

// Returns the cleaned value, or null for "not set". Throws ContentError.
export function cleanValue(f, v, path) {
  if (v === undefined || v === null || v === '') {
    if (f.required) throw new ContentError(path, 'required');
    return null;
  }
  switch (f.type) {
    case 'text': {
      const s = cleanText(v, f, path);
      if (!s && f.required) throw new ContentError(path, 'required');
      return s || null;
    }
    case 'slug':
      if (typeof v !== 'string' || !SLUG.test(v)) throw new ContentError(path, 'a slug is lower-case letters, digits and hyphens');
      return v;
    case 'date':
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) throw new ContentError(path, 'a date is YYYY-MM-DD');
      return v;
    case 'month':
      if (typeof v !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw new ContentError(path, 'a month is YYYY-MM');
      return v;
    case 'url':
      return checkUrl(v, path);
    case 'email':
      if (typeof v !== 'string' || !/^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,}$/i.test(v.trim())) throw new ContentError(path, 'not an email address');
      return v.trim();
    case 'int': {
      const n = Number(v);
      if (!Number.isInteger(n) || n < f.min || n > f.max) throw new ContentError(path, `a whole number from ${f.min} to ${f.max}`);
      return n;
    }
    case 'bool':
      if (typeof v !== 'boolean' && v !== 0 && v !== 1) throw new ContentError(path, 'true or false');
      return v ? 1 : 0;
    case 'enum':
    case 'layout':
      if (!f.values.includes(v)) throw new ContentError(path, `one of ${f.values.join(', ')}`);
      return v;
    case 'photo':
    case 'dogref':
    case 'litterref':
      if (typeof v !== 'string' || v.length > 80) throw new ContentError(path, 'a photo id or dog slug');
      return v;
    case 'list': {
      if (!Array.isArray(v)) throw new ContentError(path, 'a list');
      if (v.length > f.max) throw new ContentError(path, `at most ${f.max} items`);
      if (f.item === 'photo') return v.map((x, i) => cleanValue({ type: 'photo', required: true }, x, `${path}[${i}]`));
      if (f.item === 'focus') return v.map((x, i) => cleanValue({ type: 'enum', values: FOCUS, required: true }, x, `${path}[${i}]`));
      return v.map((x, i) => cleanText(x, { max: f.itemMax }, `${path}[${i}]`)).filter(Boolean);
    }
    case 'pairs': {
      if (!Array.isArray(v)) throw new ContentError(path, 'a list of [value, label] pairs');
      if (v.length > f.max) throw new ContentError(path, `at most ${f.max} items`);
      return v.map((p, i) => {
        if (!Array.isArray(p) || p.length !== 2) throw new ContentError(`${path}[${i}]`, 'a [value, label] pair');
        return [cleanText(p[0], { max: f.keyMax }, `${path}[${i}][0]`), cleanText(p[1], { max: f.valueMax }, `${path}[${i}][1]`)];
      });
    }
    case 'features': {
      if (!Array.isArray(v)) throw new ContentError(path, 'a list');
      if (v.length > f.max) throw new ContentError(path, `at most ${f.max} items`);
      return v.map((x, i) => {
        const p = `${path}[${i}]`;
        if (!x || typeof x !== 'object') throw new ContentError(p, 'an object');
        const icon = x.icon ?? 'heart';
        if (!FEATURE_ICONS.includes(icon)) throw new ContentError(`${p}.icon`, `one of ${FEATURE_ICONS.join(', ')}`);
        return { icon, title: cleanText(x.title ?? '', { max: 40 }, `${p}.title`), text: cleanText(x.text ?? '', { max: 160 }, `${p}.text`) };
      });
    }
    default:
      throw new ContentError(path, `unknown field type ${f.type}`);
  }
}

// Clean an object against a field list. Unknown keys are refused, so a typo
// can't silently drop content.
export function cleanRecord(fields, obj, path, { partial = false } = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new ContentError(path, 'must be an object');
  for (const k of Object.keys(obj)) if (!(k in fields)) throw new ContentError(`${path}.${k}`, 'not a known field');
  const out = {};
  for (const [k, f] of Object.entries(fields)) {
    if (partial && !(k in obj)) continue;
    out[k] = cleanValue(f, obj[k], `${path}.${k}`);
  }
  return out;
}
