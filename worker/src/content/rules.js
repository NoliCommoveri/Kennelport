// Display and timing rules (docs/plans/site-builder.md, step 1): how a site shows
// what it holds, set by the owner per site in her admin view of the Site Manager.
// The site stores what KennelOS sends unchanged; these decide how it reads. Every
// default is today's behaviour, so a site is unchanged until the owner changes a
// rule, and a rule added later starts as today's behaviour too (decision 14).
//
// A site keeps only what the owner changed (site_builds.build); rulesFor() lays
// that over the defaults. The published snapshot carries the whole result, so
// rendering stays pure. An older snapshot without it renders with the defaults.

// The pup statuses the KennelOS package carries, in its words. A site stores
// `undecided` as 'coming_soon' (kennelos/bundle.js PUPPY_STATUS).
export const PUP_STATUSES = ['available', 'reserved', 'placed', 'staying', 'undecided', 'hidden'];
export const ruleKey = (status) => (status === 'coming_soon' ? 'undecided' : status);

// What each one stands for in KennelOS (docs/plans/done/linked-sample.md, raw or summary).
export const STATUS_NOTES = {
  available: 'Available, with no open pick',
  reserved: 'Worked out by KennelOS: a pick waiting on its deposit, or sold before delivery',
  placed: 'Placed with a family',
  staying: 'Kept: joining the breeder\'s program',
  undecided: 'Undecided, or no plan set',
  hidden: 'Health hold in KennelOS',
};

// The template's two status colours (site.css .status.avail, .status.res).
export const PILLS = { avail: 'Green', res: 'Brass outline' };

const st = (words, pill, ribbon, show, price, ask, fullreg, older, order) => ({ words, pill, ribbon, show, price, ask, fullreg, older, order });

// Fixed wording on the site (plan decision 15), by screen and group: [key, today's
// words, what it is]. Where the breeder rewords one today (the co-owned heading,
// the safe-payment notice), hers still wins; this is the default under hers.
export const WORDS = [
  ['dogs', 'The Dogs page', [
    ['dogs_all', 'All dogs', 'The filter: everyone'], ['girls', 'Girls', 'The filter and menu: girls'], ['boys', 'Boys', 'The filter and menu: boys'],
    ['flip_hint', 'Tap a card to turn it over; tap again to turn it back.', 'Under the cards'],
  ]],
  ['dogs', 'Up and coming', [
    ['upcoming_eyebrow', 'Our next generation', 'Eyebrow'], ['upcoming_heading', 'Up and coming', 'Heading'],
    ['upcoming_lede', 'Young dogs we have kept, growing up with us.', 'Line under it'],
  ]],
  ['dogs', 'Looking for a home', [
    ['for_sale_eyebrow', 'Ready for a family', 'Eyebrow'], ['for_sale_heading', 'Looking for a home', 'Heading'],
    ['for_sale_lede', 'Grown dogs we are placing in a loving pet home.', 'Line under it'],
    ['for_sale_status', 'Looking for a home', 'On the dog\'s own page'], ['ask_dog', 'Ask about {name}', 'Its button ({name} is the dog\'s)'],
  ]],
  ['dogs', 'Co-owned', [
    ['co_owned_eyebrow', 'Co-owned', 'Eyebrow'], ['co_owned_heading', 'Shared with friends', 'Heading (the breeder can reword)'],
    ['co_owned_lede', 'Dogs we co-own, living with partner kennels.', 'Line under it (the breeder can reword)'],
    ['co_with', 'with {kennel}', 'On a card: the kennel a co-owned dog lives with ({kennel})'],
    ['co_unnamed', 'Lives with a partner kennel', 'On a card: a co-owned dog living with a kennel not named'],
  ]],
  ['dogs', 'Outside dogs', [
    ['outside_owner', 'Owned by {kennel}', 'On a card: an outside dog\'s owner ({kennel})'],
    ['outside_fact', 'Owned by', 'On an outside dog\'s page, in its facts'],
  ]],
  ['wording', 'Litter cards', [
    ['litter_current', 'Current litter', 'A current litter'], ['litter_coming', 'Coming up', 'Born, deposits not open yet'],
    ['litter_older', 'Older puppies', 'Past its going-home date'], ['litter_planned', 'Planned litter', 'Planned, with no label'],
    ['litter_past', 'Past litter', 'A past litter'], ['meet_puppies', 'Meet the puppies', 'Its link'], ['see_waitlist', 'See the waitlist', 'A planned litter\'s link'],
    ['ready_now', 'Ready now', 'Going home, once it has passed'],
  ]],
  ['wording', 'The Puppies page', [
    ['older_eyebrow', 'Ready now', 'Over the older puppies'], ['upcoming_band_eyebrow', 'Coming up', 'Over upcoming litters'],
    ['upcoming_band_heading', 'Upcoming litters', 'Their heading'], ['upcoming_band_lede', 'Plans can change. Heat dates are estimates.', 'Their line'],
    ['no_litters', 'No litters to show right now.', 'With nothing to show'], ['ask_puppy', 'Ask about this puppy', 'On a pup card'],
    ['ask_pup', 'Ask about {name}', 'On a puppy\'s own page ({name} is the pup\'s)'],
  ]],
  ['wording', 'Elsewhere', [
    ['swipe', 'Swipe or use the arrows.', 'Under How it works'], ['more_detail', 'More detail', 'A step\'s fold'],
    ['whats_included', 'What\'s included', 'An extras package\'s fold'], ['most_complete', 'most complete', 'The featured package'],
    ['ask_package', 'Ask about this package', 'A package\'s link'], ['ask_item', 'Ask about this', 'An extra\'s link'],
    ['pay_fee', 'Application fee', 'Payment card, unless the breeder titles it'], ['pay_deposit', 'Puppy deposit', 'Payment card, unless the breeder titles it'],
    ['family_login', 'Family login', 'The menu link'], ['copyright', '© {year} {kennel}', 'The footer ({year}, {kennel})'],
    ['safe_notice', "We'll never ask you to pay by gift card, wire transfer or into anyone else's account, and we only contact you from the details on this website. If someone asks you to, please tell us.", 'The safe-payment notice (the breeder can reword)'],
  ]],
];
const WORD_LIST = WORDS.flatMap(([, , rows]) => rows);

// How KennelOS's dog statuses sit on the site: [site status, up and coming, for sale].
export const DOG_PLACES = {
  breeding: ['active', 0, 0], upcoming: ['active', 1, 0], for_sale: ['active', 0, 1], retired: ['retired', 0, 0], remembered: ['remembered', 0, 0],
};
export const DOG_PLACE_WORDS = { breeding: 'Breeding dog', upcoming: 'Up and coming', for_sale: 'Looking for a home', retired: 'Retired', remembered: 'In memory' };
export const KOS_DOG_STATUSES = ['puppy', 'active_breeding', 'for_sale', 'retired_breeding', 'deceased'];
// A KennelOS puppy's disposition: which ones go on the site (rules.landing pup_*), the
// rest left off. Today's default is every one, as before KennelOS sent it.
export const PUP_DISPOSITIONS = ['keeping', 'available', 'placed', 'health_hold', 'undecided'];
export const PUP_DISPOSITION_WORDS = { keeping: 'Keeping', available: 'Available', placed: 'Placed', health_hold: 'Health hold', undecided: 'Undecided (or none set)' };

export const DEFAULT_RULES = {
  status: {
    available: st('Available', 'avail', false, true, true, true, true, true, 1),
    reserved: st('Reserved', 'res', true, true, false, false, true, false, 2),
    placed: st('Reserved', 'res', true, true, false, false, true, false, 2),
    staying: st('Joining our program', 'res', false, true, false, false, false, false, 1),
    undecided: st('Still deciding', 'res', false, true, false, false, true, false, 1),
    hidden: st('', 'res', false, false, false, false, true, false, 1),
  },
  reg: { unset: 'Limited', limited: 'Limited', full: 'Full', ask: 'Ask about full registration' },
  price: { off: 'Contact us for pricing', style: 'range', price_label: 'Price', deposit_label: 'Deposit', before: 'Available on {date}' },
  // An adult for sale's price: 'site' follows the breeder's "Show prices of extras
  // and adults"; 'always' or 'never' whatever that says.
  dogs: { sale_price: 'site' },
  words: Object.fromEntries(WORD_LIST.map(([k, d]) => [k, d])),
  format: { date: 'mdy', day: 'md', sex: 'female_male', counts: 'girls_boys', currency: '$', currency_after: false, cents: false },
  // How KennelOS data lands (kennelos/bundle.js), for each new record.
  landing: {
    health_display: 'normal_only', show_placed: true, show_prices: 'kos_prices',
    name_pair: '{dam} × {sire}', name_dam: "{dam}'s litter", name_heat: "{dam}'s next litter", name_none: 'Our next litter', name_upcoming: 'Upcoming litter',
    label_heat: 'Upcoming heat', label_pairing: 'Planned pairing',
    dog_puppy: 'upcoming', dog_active_breeding: 'breeding', dog_for_sale: 'for_sale', dog_retired_breeding: 'retired', dog_deceased: 'remembered',
    pup_keeping: true, pup_available: true, pup_placed: true, pup_health_hold: true, pup_undecided: true,
    new_at: 'end',
  },
};

export const DEFAULT_TIMING = {
  // Days a litter off the site is kept before it is deleted (kennelos/clock.js).
  litter_days: 30,
  // An available pup becomes an older puppy this many days after its litter's
  // going-home date (1: the day after).
  older_after: 1,
  // "Available on {date}" becomes "Available" this many days after the litter's
  // deposits date (0: on the day).
  deposits_after: 0,
};

// What a value may be, for checking the editor's form and stored builds.
const TEXT = (max, req = false) => ({ t: 'text', max, req });
const STATUS_FIELDS = {
  words: TEXT(40), pill: { t: 'enum', values: Object.keys(PILLS) }, ribbon: { t: 'bool' }, show: { t: 'bool' }, price: { t: 'bool' },
  ask: { t: 'bool' }, fullreg: { t: 'bool' }, older: { t: 'bool' }, order: { t: 'int', min: 1, max: 4 },
};
const REG_FIELDS = { unset: TEXT(30), limited: TEXT(30, true), full: TEXT(30, true), ask: TEXT(60, true) };
const PRICE_FIELDS = {
  off: TEXT(60, true), style: { t: 'enum', values: ['range', 'from'] }, price_label: TEXT(30, true), deposit_label: TEXT(30, true),
  before: { t: 'text', max: 60, req: true, needs: '{date}' },
};
const DOG_FIELDS = { sale_price: { t: 'enum', values: ['site', 'always', 'never'] } };
const WORD_FIELDS = Object.fromEntries(WORD_LIST.map(([k, d]) => [k, { t: 'text', max: k === 'safe_notice' ? 400 : 120, req: true,
  needs: d.includes('{name}') ? '{name}' : null }]));
export const DATE_STYLES = { mdy: 'December 12, 2026', dmy: '12 December 2026', short: 'Dec 12, 2026' };
export const DAY_STYLES = { md: 'December 12', dm: '12 December', short: 'Dec 12' };
export const SEX_STYLES = { female_male: 'Female and Male', girl_boy: 'Girl and Boy' };
export const COUNT_STYLES = { girls_boys: '2 girls, 1 boy', females_males: '2 females, 1 male' };
const FORMAT_FIELDS = {
  date: { t: 'enum', values: Object.keys(DATE_STYLES) }, day: { t: 'enum', values: Object.keys(DAY_STYLES) },
  sex: { t: 'enum', values: Object.keys(SEX_STYLES) }, counts: { t: 'enum', values: Object.keys(COUNT_STYLES) }, currency: TEXT(4, true), currency_after: { t: 'bool' }, cents: { t: 'bool' },
};
const PLACE = { t: 'enum', values: Object.keys(DOG_PLACES) };
const LANDING_FIELDS = {
  health_display: { t: 'enum', values: ['normal_only', 'all', 'none'] }, show_placed: { t: 'bool' }, show_prices: { t: 'enum', values: ['kos_prices', 'off'] },
  name_pair: { t: 'text', max: 60, req: true, needs: '{dam}' }, name_dam: { t: 'text', max: 60, req: true, needs: '{dam}' },
  name_heat: { t: 'text', max: 60, req: true, needs: '{dam}' }, name_none: TEXT(60, true), name_upcoming: TEXT(60, true),
  label_heat: TEXT(40, true), label_pairing: TEXT(40, true),
  ...Object.fromEntries(KOS_DOG_STATUSES.map((k) => [`dog_${k}`, PLACE])),
  ...Object.fromEntries(PUP_DISPOSITIONS.map((k) => [`pup_${k}`, { t: 'bool' }])),
  new_at: { t: 'enum', values: ['end', 'start'] },
};
const PARTS = { dogs: DOG_FIELDS, words: WORD_FIELDS, format: FORMAT_FIELDS, landing: LANDING_FIELDS };

const TIMING_FIELDS = {
  litter_days: { t: 'int', min: 1, max: 365 }, older_after: { t: 'int', min: 0, max: 365 }, deposits_after: { t: 'int', min: 0, max: 90 },
};

export class RuleError extends Error {}

function clean(f, v, name) {
  switch (f.t) {
    case 'bool': return v === true || v === 'on' || v === '1' || v === 1;
    case 'int': {
      const n = Number(String(v ?? '').trim());
      if (!Number.isInteger(n) || n < f.min || n > f.max) throw new RuleError(`${name}: a whole number from ${f.min} to ${f.max}.`);
      return n;
    }
    case 'enum':
      if (!f.values.includes(v)) throw new RuleError(`${name}: not one of the choices.`);
      return v;
    default: {
      const s = String(v ?? '').replace(/\s+/g, ' ').trim();
      if (s.length > f.max) throw new RuleError(`${name}: at most ${f.max} characters.`);
      if (f.req && !s) throw new RuleError(`${name}: can't be empty.`);
      if (f.needs && !s.includes(f.needs)) throw new RuleError(`${name}: needs ${f.needs} in it.`);
      return s;
    }
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Only what differs from the defaults, so a later default for a new setting still
// reaches the site.
function diff(full, base) {
  const out = {};
  for (const [k, v] of Object.entries(full)) {
    if (v && typeof v === 'object') {
      const d = diff(v, base[k]);
      if (Object.keys(d).length) out[k] = d;
    } else if (!same(v, base[k])) out[k] = v;
  }
  return out;
}

function over(base, changes) {
  const out = {};
  for (const [k, v] of Object.entries(base)) {
    const c = changes?.[k];
    out[k] = v && typeof v === 'object' ? over(v, c) : (c === undefined ? v : c);
  }
  return out;
}

// The site's rules: its changes over the defaults. Unknown keys are dropped.
export function rulesFor(build) {
  const b = build ?? {};
  return { rules: over(DEFAULT_RULES, b.rules), timing: over(DEFAULT_TIMING, b.timing) };
}

// One screen's parts from its form (names like words.girls), laid over the site's
// rules as they stand; a switch missing from the form is off. The Pups screen is
// rulesFromForm, below.
export const SCREEN_PARTS = { dogs: ['dogs', 'words'], wording: ['words'], formats: ['format'], kennelos: ['landing'] };
export function partsFromForm(screen, current, get) {
  const out = structuredClone(current);
  const wordsHere = new Set(WORDS.filter(([sc]) => sc === screen).flatMap(([, , rows]) => rows.map(([k]) => k)));
  for (const part of SCREEN_PARTS[screen]) {
    for (const [f, spec] of Object.entries(PARTS[part])) {
      if (part === 'words' && !wordsHere.has(f)) continue;
      out[part][f] = clean(spec, get(`${part}.${f}`), WORD_LIST.find(([k]) => k === f)?.[2] ?? f);
    }
  }
  return out;
}
export const wordsOn = (screen) => WORDS.filter(([sc]) => sc === screen);

// The editor's form, as names like status.reserved.words or timing.litter_days,
// to the full rules; a switch missing from the form is off.
export function rulesFromForm(get, current = DEFAULT_RULES) {
  const rules = { ...structuredClone(current), status: {}, reg: {}, price: {} };
  for (const k of PUP_STATUSES) {
    rules.status[k] = {};
    for (const [f, spec] of Object.entries(STATUS_FIELDS)) rules.status[k][f] = clean(spec, get(`status.${k}.${f}`), `${k}: ${f}`);
    if (rules.status[k].show && !rules.status[k].words) throw new RuleError(`${k}: a pup that shows needs words.`);
  }
  for (const [f, spec] of Object.entries(REG_FIELDS)) rules.reg[f] = clean(spec, get(`reg.${f}`), `Registration: ${f}`);
  for (const [f, spec] of Object.entries(PRICE_FIELDS)) rules.price[f] = clean(spec, get(`price.${f}`), `Prices: ${f}`);
  return rules;
}

export function timingFromForm(get) {
  return Object.fromEntries(Object.entries(TIMING_FIELDS).map(([f, spec]) => [f, clean(spec, get(`timing.${f}`), f)]));
}

// The stored build after a change to one part ('rules' or 'timing').
export function withPart(build, part, full) {
  const base = part === 'rules' ? DEFAULT_RULES : DEFAULT_TIMING;
  const out = { ...(build ?? {}) };
  const d = diff(full, base);
  if (Object.keys(d).length) out[part] = d; else delete out[part];
  return out;
}

// How many settings differ from today's behaviour, for the admin's lists.
export function changedCount(build) {
  const count = (o) => Object.values(o ?? {}).reduce((n, v) => n + (v && typeof v === 'object' ? count(v) : 1), 0);
  return { rules: count(build?.rules), timing: count(build?.timing) };
}

// ---------- reading them, for the renderer and the litter clock ----------

const DAY = 86400000;
export const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export async function loadBuild(env, siteId) {
  const row = await env.DB.prepare('SELECT build FROM site_builds WHERE site_id = ?').bind(siteId).first();
  if (!row?.build) return {};
  try { return JSON.parse(row.build); } catch { return {}; }
}

export async function saveBuild(env, siteId, build) {
  const t = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO site_builds (site_id, build, updated_at) VALUES (?, ?, ?)
      ON CONFLICT (site_id) DO UPDATE SET build = excluded.build, updated_at = excluded.updated_at`).bind(siteId, JSON.stringify(build), t),
    // A rule changes what the site shows: Publish carries it.
    env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, siteId),
  ]);
}

export async function litterDaysFor(env, siteId) {
  return rulesFor(await loadBuild(env, siteId)).timing.litter_days;
}
