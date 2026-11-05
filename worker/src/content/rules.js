// Display and timing rules (docs/Site_Builder_Plan.md, step 1): how a site shows
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

// What each one stands for in KennelOS (docs/Linked_Sample_Plan.md, raw or summary).
export const STATUS_NOTES = {
  available: 'Available, with no open pick',
  reserved: 'Worked out by KennelOS: a pick waiting on its deposit, or sold before delivery',
  placed: 'Placed with a family',
  staying: 'Kept: joining the breeder\'s program',
  undecided: 'Undecided, or no plan set',
  hidden: 'Health hold in KennelOS',
};

// The template's two status colours (site.css .status.avail, .status.res).
export const PILLS = { avail: 'Green', res: 'Held' };

const st = (words, pill, ribbon, show, price, ask, fullreg, older, order) => ({ words, pill, ribbon, show, price, ask, fullreg, older, order });

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
      if (f.needs && !s.includes(f.needs)) throw new RuleError(`${name}: needs ${f.needs} where the date goes.`);
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

// The editor's form, as names like status.reserved.words or timing.litter_days,
// to the full rules; a switch missing from the form is off.
export function rulesFromForm(get) {
  const rules = { status: {}, reg: {}, price: {} };
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
