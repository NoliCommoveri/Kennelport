// One list of fields (docs/plans/kennelos-contract.md B1, B2): for each kind of record
// a data block shows (dog, puppy, litter), every field a block may choose by, group by
// or order by, with its name for the owner, its kind, and how to read it from a
// published record. Built from content/model.js: every field there is in this list or
// in NOT_FOR_BLOCKS (tests/fields.test.js), so a new field can't be forgotten.
//
// A block's conditions (`where`) are a list of { field, op, value }, all of which must
// hold. A value is a string, or a list of them for the ops that take ticks (is one of,
// any is one of, every one is one of). Text compares with case and spacing evened out.
//
// Reading needs a few things only the renderer knows (a litter's stage on the day, a
// pup's status row, a partner kennel's name): `rc`, the record context, made by
// render/parts.js recordCtx. This file stays free of the renderer.
import { DOG_FIELDS, PUPPY_FIELDS, LITTER_FIELDS } from './model.js';
import { DOG_PLACE_WORDS, PUP_DISPOSITION_WORDS } from './rules.js';

// What a condition can ask of each kind of field, in the owner's words.
export const OPS = Object.freeze({
  enum: { is: 'is', is_not: 'is not', one_of: 'is one of' },
  text: { is: 'is', is_not: 'is not', one_of: 'is one of', includes: 'includes', has_any: 'is filled in', has_none: 'is empty' },
  list: { includes: 'includes', any_of: 'any is one of', all_of: 'every one is one of', has_any: 'has any', has_none: 'has none' },
  date: { before: 'is before', after: 'is after', has_any: 'is filled in', has_none: 'is empty' },
  number: { at_least: 'is at least', below: 'is under' },
  bool: { yes: 'yes', no: 'no' },
});
// The ops that take ticks (a list of values) rather than one typed value; and those
// that take no value at all.
export const TICK_OPS = Object.freeze(['one_of', 'any_of', 'all_of']);
export const NO_VALUE_OPS = Object.freeze(['has_any', 'has_none', 'yes', 'no']);

export const WHERE_MAX = 8;
export const VALUE_MAX = 60;
export const TICKS_MAX = 40;
export const GROUP_WORDS_MAX = 60;

// A parent that isn't a dog on the site (an outside sire by name only): its fields are
// unknown, and no condition on them holds (B1).
export const UNKNOWN = Symbol('unknown');

export const norm = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const flag = (v) => Boolean(v);
const titlesOf = (d) => String(d.titles ?? '').split(/[\s,;/]+/).map((t) => t.trim()).filter(Boolean);
function yearsSince(ymd, today) {
  if (!ymd || !today) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

const SEX = { female: 'Girl', male: 'Boy' };
// A group's heading, where it differs from the value's name ("Sex is Girl", but Girls over the group).
const SEX_GROUPS = { female: 'Girls', male: 'Boys' };
// A dog's life stage (KennelOS's five, in the site's words: content/rules.js DOG_PLACES),
// read from what's stored: `status`, then for an active dog `for_sale` before `upcoming`
// (the Dogs page's own order, render/parts.js dogGroups).
export const LIFE_STAGE = DOG_PLACE_WORDS;
export function lifeStage(d) {
  if (d.status === 'retired' || d.status === 'remembered') return d.status;
  return d.for_sale ? 'for_sale' : d.upcoming ? 'upcoming' : 'breeding';
}
// Where a dog lives: with her (her own, or co-owned and living with her), with a
// co-owner, or not hers at all (an outside dog: a stud, a featured offspring she sold).
export const RESIDENCE = { home: 'With me', co_owner: 'With a co-owner', not_mine: 'Not my dog' };
export const residence = (d) => (d.outside ? 'not_mine' : d.lives_away ? 'co_owner' : 'home');
// How far back a dog's line is followed on the site (descends_from, offspring on a page).
export const GENERATIONS = 4;
// A pup's status as the site reads it: its status row (content/rules.js STATUS_ROWS).
export const PUP_STATUS = { available: 'Available', not_open: 'Available, deposits not open yet', placed: 'Placed (shows as Reserved)', staying: 'Joining the program', undecided: 'Still deciding', hidden: 'Health hold' };
// A litter's stage as the site shows it, on the day.
export const LITTER_STAGE = { available_now: 'Available now', available_soon: 'Available soon (born, deposits not open)', older: 'Older puppies (past going home)', planned: 'Planned', past: 'Past' };

// KennelOS's raw values (docs/plans/kennelos-contract.md Part C, step 4), as sent: a
// litter's status there, a pup's disposition, a health result's test type. Null until
// a KennelOS that sends them presses Update website, so a condition on one holds for
// no record until then.
export const KOS_LITTER_STATUS = { expected: 'Expected', whelped: 'Whelped', weaning: 'Weaning', ready: 'Ready' };
export const TEST_KIND = { genetic_test: 'Genetic', ofa_pennhip: 'OFA / PennHIP', breed_specific_test: 'Breed-specific' };
const testKinds = (d) => [...new Set((d.health ?? []).map((h) => TEST_KIND[h.test_type] ?? null).filter(Boolean))];

const f = (label, kind, read, extra = {}) => ({ label, kind, read, ...extra });
const parentName = (d, role, rc) => rc.dogById(d[`${role}_id`])?.call_name ?? d[`${role}_name`] ?? null;
// The dogs on the site a dog descends from, nearest first, GENERATIONS back. A line
// that loops (a mistake in the records) stops where it would repeat.
export function ancestorsOf(d, rc) {
  const out = [];
  const seen = new Set([d.id]);
  let gen = [d];
  for (let g = 0; g < GENERATIONS && gen.length; g++) {
    const next = [];
    for (const x of gen) for (const role of ['sire', 'dam']) {
      const p = rc.dogById(x[`${role}_id`]);
      if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); next.push(p); }
    }
    gen = next;
  }
  return out;
}
const own = (k) => (r) => r[k] ?? null;

const DOG = {
  call_name: f('Call name', 'text', own('call_name')),
  registered_name: f('Registered name', 'text', own('registered_name')),
  registry: f('Registry', 'text', own('registry')),
  sex: f('Sex', 'enum', own('sex'), { values: SEX, groups: SEX_GROUPS }),
  role: f('Role', 'text', own('role')),
  color: f('Colour', 'text', own('color'), { colour: true }),
  weight: f('Weight', 'text', own('weight')),
  date_of_birth: f('Date of birth', 'date', own('date_of_birth')),
  titles: f('Titles (as written)', 'text', own('titles')),
  life_stage: f('Life stage', 'enum', lifeStage, { values: LIFE_STAGE }),
  residence: f('Lives', 'enum', residence, { values: RESIDENCE }),
  price: f('Price', 'number', own('price')),
  co_owned: f('Co-owned', 'bool', (d) => flag(d.co_owned), { no: 'Not co-owned' }),
  lives_with: f('The kennel it lives with', 'text', (d, rc) => rc.partnerName(d.lives_with_kennel_id)),
  co_owned_with: f('Co-owned with (kennels)', 'list', (d, rc) => (d.co_owned_with_ids ?? []).map((id) => rc.partnerName(id)).filter(Boolean)),
  owner_name: f("Owner (not my dog)", 'text', own('owner_name')),
  // Its parents: a dog on the site, or a name typed for one that isn't.
  'sire.call_name': f("Sire's name", 'text', (d, rc) => parentName(d, 'sire', rc)),
  'dam.call_name': f("Dam's name", 'text', (d, rc) => parentName(d, 'dam', rc)),
  parent: f('A parent (sire or dam)', 'list', (d, rc) => ['sire', 'dam'].map((r) => parentName(d, r, rc)).filter(Boolean)),
  descends_from: f(`Descends from (up to ${GENERATIONS} generations back)`, 'list', (d, rc) => ancestorsOf(d, rc).map((a) => a.call_name)),
  // Worked out.
  has_titles: f('Has titles', 'bool', (d) => titlesOf(d).length > 0, { no: 'No titles' }),
  title: f('A title', 'list', titlesOf),
  // Its titles' organizations, from KennelOS's titles as rows (titles_detail).
  title_organization: f("A title's organization", 'list', (d) => [...new Set((d.title_rows ?? []).map((t) => t.organization).filter(Boolean))]),
  age: f('Age in years', 'number', (d, rc) => yearsSince(d.date_of_birth, rc.today)),
  has_health: f('Has health results shown', 'bool', (d) => (d.health ?? []).length > 0, { no: 'No health results shown' }),
  test_kind: f('Kinds of health test shown (from KennelOS)', 'list', testKinds),
};

const PUPPY = {
  name: f('Name', 'text', own('name')),
  collar: f('Collar', 'text', own('collar')),
  sex: f('Sex', 'enum', own('sex'), { values: SEX, groups: SEX_GROUPS }),
  color: f('Colour', 'text', own('color'), { colour: true }),
  status: f('Status (as the site reads it)', 'enum', (p, rc) => rc.pupKey(p), { values: PUP_STATUS }),
  registration: f('Registration', 'enum', own('registration'), { values: { limited: 'Limited', full: 'Full' } }),
  registry: f('Registry', 'text', own('registry')),
  price: f('Price', 'number', own('price')),
  disposition: f('Disposition in KennelOS', 'enum', own('disposition'), { values: PUP_DISPOSITION_WORDS }),
  // Its litter's.
  'litter.name': f("Litter's name", 'text', (p, rc) => rc.litterOf(p)?.name ?? null),
  'litter.stage': f("Litter's stage", 'enum', (p, rc) => { const l = rc.litterOf(p); return l ? rc.litterStage(l) : null; }, { values: LITTER_STAGE }),
  'litter.born_on': f("Litter's birth date", 'date', (p, rc) => rc.litterOf(p)?.born_on ?? null),
  'litter.kennelos_status': f("Litter's status in KennelOS", 'enum', (p, rc) => rc.litterOf(p)?.kennelos_status ?? null, { values: KOS_LITTER_STATUS }),
};

// A litter's parent as a dog on the site, or UNKNOWN (an outside parent by name only).
const parent = (l, role, rc) => rc.dogById(l[`${role}_id`]) ?? UNKNOWN;
const LITTER = {
  name: f('Name', 'text', own('name')),
  stage: f('Stage', 'enum', (l, rc) => rc.litterStage(l), { values: LITTER_STAGE }),
  plan_label: f('Plan label', 'text', own('plan_label')),
  born_on: f('Born', 'date', own('born_on')),
  ready_on: f('Going home', 'date', own('ready_on')),
  deposits_on: f('Deposits from', 'date', own('deposits_on')),
  kennelos_status: f('Status in KennelOS', 'enum', own('kennelos_status'), { values: KOS_LITTER_STATUS }),
  show_prices: f('Shows its prices', 'bool', (l) => flag(l.show_prices), { no: 'Prices off' }),
  'pups.color': f("Its pups' colours", 'list', (l) => [...new Set((l.puppies ?? []).map((p) => norm(p.color)).filter(Boolean))], { colour: true }),
  'pups.count': f('How many pups show', 'number', (l) => (l.puppies ?? []).length),
};
// Each parent's dog fields (B1): dam.x, sire.x, and a_parent.x for either one.
const lower = (t) => `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
for (const [k, d] of Object.entries(DOG).filter(([k]) => !['sire.call_name', 'dam.call_name'].includes(k))) {
  const of = (role) => (l, rc) => { const p = parent(l, role, rc); return p === UNKNOWN ? UNKNOWN : d.read(p, rc); };
  const named = (who) => ({ label: `${who}: ${lower(d.label)}`, ...(d.no ? { no: `${who}: ${lower(d.no)}` } : {}) });
  LITTER[`dam.${k}`] = { ...d, ...named('Dam'), read: of('dam') };
  LITTER[`sire.${k}`] = { ...d, ...named('Sire'), read: of('sire') };
  LITTER[`a_parent.${k}`] = { ...d, ...named('Either parent'), read: null, either: k };
}
// The dam's or sire's call name, or the name typed for an outside one.
LITTER['dam.call_name'].read = (l, rc) => rc.dogById(l.dam_id)?.call_name ?? l.dam_name ?? null;
LITTER['sire.call_name'].read = (l, rc) => rc.dogById(l.sire_id)?.call_name ?? l.sire_name ?? null;

export const FIELDS = Object.freeze({ dog: Object.freeze(DOG), puppy: Object.freeze(PUPPY), litter: Object.freeze(LITTER) });

// The model's fields no block reads: photos, addresses, words, system settings, and
// what the list above reads another way (a litter's dam and sire through dam.x).
export const NOT_FOR_BLOCKS = Object.freeze({
  // status, upcoming and for_sale are read as life_stage; lives_away and outside as
  // residence; a dog's sire and dam through sire.call_name, dam.call_name and parent.
  dog: ['slug', 'bio', 'photo_id', 'died_on', 'health_display', 'show_on_site', 'owner_url', 'status', 'upcoming', 'for_sale', 'lives_away', 'outside',
    'sire', 'dam', 'sire_name', 'dam_name'],
  puppy: ['slug', 'bio', 'photo_id', 'more_photos_url'],
  litter: ['slug', 'dam', 'sire', 'dam_name', 'sire_name', 'expected_label', 'ready_label', 'summary', 'price_female', 'price_male',
    'full_reg_female', 'full_reg_male', 'deposit_female', 'deposit_male', 'price_note', 'show_placed', 'ask_full_reg', 'show_puppy_photos', 'show_on_site'],
});
export const MODEL_FIELDS = Object.freeze({ dog: DOG_FIELDS, puppy: PUPPY_FIELDS, litter: LITTER_FIELDS });

// Which kind of record each data block shows.
export const BLOCK_KIND = Object.freeze({ dogs: 'dog', pups: 'puppy', litters: 'litter', featured_dog: 'dog', featured_pup: 'puppy' });

// ---------- a condition, cleaned ----------

// A condition whose value isn't set yet (just added, or its field just changed) is
// kept, so the owner can finish it, and holds for every record until it has one.
export function cleanCond(kind, c) {
  const spec = FIELDS[kind]?.[c?.field];
  if (!spec) return null;
  const op = Object.hasOwn(OPS[spec.kind], c.op) ? c.op : Object.keys(OPS[spec.kind])[0];
  const out = { field: c.field, op };
  if (NO_VALUE_OPS.includes(op)) return out;
  if (TICK_OPS.includes(op)) {
    const raw = (Array.isArray(c.value) ? c.value : c.value == null || c.value === '' ? [] : [c.value]).map((v) => String(v ?? '').slice(0, VALUE_MAX));
    const vals = spec.kind === 'enum' ? raw.filter((v) => Object.hasOwn(spec.values, v)) : raw.map(norm).filter(Boolean);
    out.value = [...new Set(vals)].slice(0, TICKS_MAX);
    return out;
  }
  let v = String(Array.isArray(c.value) ? c.value[0] ?? '' : c.value ?? '').trim().slice(0, VALUE_MAX);
  if (spec.kind === 'enum' && !Object.hasOwn(spec.values, v)) v = '';
  if (spec.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) v = '';
  if (spec.kind === 'number') v = /^-?\d+(\.\d+)?$/.test(v) ? String(Number(v)) : '';
  if (spec.kind === 'text' || spec.kind === 'list') v = norm(v);
  out.value = v;
  return out;
}

// Set: it has what its op needs.
export const condSet = (c) => NO_VALUE_OPS.includes(c.op) || (Array.isArray(c.value) ? c.value.length > 0 : c.value !== '' && c.value != null);

export const cleanWhere = (kind, where) => (Array.isArray(where) ? where : [])
  .map((c) => cleanCond(kind, c)).filter(Boolean).slice(0, WHERE_MAX);

// ---------- reading and testing ----------

function test(spec, op, value, v) {
  if (v === UNKNOWN) return false;
  switch (spec.kind) {
    case 'bool': return op === 'yes' ? Boolean(v) : !v;
    case 'enum':
      if (op === 'is') return v === value;
      if (op === 'is_not') return v !== value;
      return value.includes(v);
    case 'text': {
      const t = norm(v);
      if (op === 'is') return t === value;
      if (op === 'is_not') return t !== value;
      if (op === 'one_of') return value.includes(t);
      if (op === 'includes') return t.includes(value);
      return op === 'has_any' ? t !== '' : t === '';
    }
    case 'list': {
      const xs = (v ?? []).map(norm);
      if (op === 'includes') return xs.includes(value);
      if (op === 'any_of') return xs.some((x) => value.includes(x));
      if (op === 'all_of') return xs.length > 0 && xs.every((x) => value.includes(x));
      return op === 'has_any' ? xs.length > 0 : xs.length === 0;
    }
    case 'date':
      if (op === 'has_any') return Boolean(v);
      if (op === 'has_none') return !v;
      return Boolean(v) && (op === 'before' ? v < value : v > value);
    case 'number':
      if (v == null || v === '') return false;
      return op === 'at_least' ? Number(v) >= Number(value) : Number(v) < Number(value);
    default: return false;
  }
}

export function holds(kind, rec, c, rc) {
  const spec = FIELDS[kind][c.field];
  if (!spec) return false;
  if (!condSet(c)) return true;
  if (spec.either) return ['dam', 'sire'].some((role) => holds(kind, rec, { ...c, field: `${role}.${spec.either}` }, rc));
  return test(spec, c.op, c.value, spec.read(rec, rc));
}

export const matches = (kind, rec, where, rc) => where.every((c) => holds(kind, rec, c, rc));

// ---------- order and grouping ----------

// A block's order: 'own' (hers), or '<field>:up' / '<field>:down'. Records with no
// value go last either way; equal ones keep her order.
export function cleanOrder(kind, v) {
  const [field, dir] = String(v ?? '').split(':');
  return FIELDS[kind]?.[field] && !FIELDS[kind][field].either && ['up', 'down'].includes(dir) ? `${field}:${dir}` : 'own';
}

function sortKey(spec, v) {
  if (v === UNKNOWN || v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
  if (spec.kind === 'enum') return Object.keys(spec.values).indexOf(v);
  if (spec.kind === 'bool') return v ? 1 : 0;
  if (spec.kind === 'number') return Number(v);
  if (spec.kind === 'list') return String(v[0]);
  return String(v);
}

export function ordered(kind, rows, order, rc) {
  if (!order || order === 'own') return rows;
  const [field, dir] = order.split(':');
  const spec = FIELDS[kind][field];
  const keyed = rows.map((r) => [r, sortKey(spec, spec.read(r, rc))]);
  const cmp = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));
  keyed.sort(([, a], [, b]) => {
    if (a == null || b == null) return (a == null) - (b == null);
    return dir === 'down' ? cmp(b, a) : cmp(a, b);
  });
  return keyed.map(([r]) => r);
}

// The fields a block can group by: enum, bool, text and list (B2), not the
// either-parent ones (a litter would sit under two headings for one condition).
export const groupable = (kind) => Object.entries(FIELDS[kind]).filter(([, s]) => ['enum', 'bool', 'text', 'list'].includes(s.kind) && !s.either);
export const cleanGroup = (kind, v) => (groupable(kind).some(([k]) => k === v) ? v : '');

// Headings per value: the owner's words for each, else the value's own name.
export function cleanGroupWords(gw) {
  if (!gw || typeof gw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(gw).slice(0, TICKS_MAX)) {
    const w = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, GROUP_WORDS_MAX);
    if (w) out[String(k).slice(0, VALUE_MAX)] = w;
  }
  return out;
}

// A record's group keys: one for an enum, bool or text (its value, '' for none), one
// per value for a list (a dog with two titles is under both).
function groupKeys(spec, v) {
  if (spec.kind === 'bool') return [v ? 'yes' : 'no'];
  if (spec.kind === 'list') return (v ?? []).length ? [...new Set(v.map(norm))] : [''];
  if (spec.kind === 'enum') return [v ?? ''];
  return [norm(v)];
}

// The value's own name, before any words of the owner's.
export function valueName(spec, key, raw = null) {
  if (key === '') return 'Other';
  if (spec.kind === 'bool') return key === 'yes' ? spec.label : spec.no ?? `Not: ${spec.label.charAt(0).toLowerCase()}${spec.label.slice(1)}`;
  if (spec.kind === 'enum') return spec.values[key] ?? key;
  return raw ?? key;
}
// A group's heading, before the owner's words: the field's group name for it, else the value's.
const groupName = (spec, key, raw) => spec.groups?.[key] ?? valueName(spec, key, raw);

// The rows in groups: [{ key, heading, rows }], groups in the field's own order (an
// enum's list, yes before no) or as they first come, Other last.
export function grouped(kind, rows, group, gw, rc) {
  const spec = FIELDS[kind][group];
  const groups = new Map();
  const raw = new Map();
  for (const r of rows) {
    const v = spec.read(r, rc);
    if (spec.kind === 'text' && v) raw.set(norm(v), raw.get(norm(v)) ?? String(v).trim());
    if (spec.kind === 'list') for (const x of v ?? []) raw.set(norm(x), raw.get(norm(x)) ?? String(x).trim());
    for (const k of groupKeys(spec, v)) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
  }
  const rank = (k) => (k === '' ? 1e9 : spec.kind === 'enum' ? Object.keys(spec.values).indexOf(k) : spec.kind === 'bool' ? (k === 'yes' ? 0 : 1) : 0);
  return [...groups.keys()].sort((a, b) => rank(a) - rank(b))
    .map((k) => ({ key: k, heading: gw?.[k] || groupName(spec, k, raw.get(k)), rows: groups.get(k) }));
}

// ---------- what the editor offers ----------

// The values a field holds on this site now, for ticks and group headings: an enum's
// own list; for text and lists, what the records have (the colours the site holds,
// for the colour picker), case and spacing evened out.
export function siteValues(kind, field, rows, rc) {
  const spec = FIELDS[kind][field];
  if (!spec) return {};
  if (spec.kind === 'enum') return { ...spec.values };
  if (spec.kind === 'bool') return { yes: valueName(spec, 'yes'), no: valueName(spec, 'no') };
  const out = new Map();
  const add = (v) => { const k = norm(v); if (k && !out.has(k)) out.set(k, String(v).trim()); };
  for (const r of rows) {
    const v = spec.either ? ['dam', 'sire'].map((role) => FIELDS[kind][`${role}.${spec.either}`].read(r, rc)) : [spec.read(r, rc)];
    for (const x of v) if (x !== UNKNOWN) (Array.isArray(x) ? x : [x]).forEach((y) => y != null && add(y));
  }
  return Object.fromEntries([...out.entries()].sort((a, b) => a[1].localeCompare(b[1])));
}

// The colours the site holds, from its dogs and pups (the colour picker, B2).
export function siteColours(snap) {
  const out = new Map();
  const add = (v) => { const k = norm(v); if (k && !out.has(k)) out.set(k, String(v).trim()); };
  for (const d of snap.dogs ?? []) add(d.color);
  for (const l of snap.litters ?? []) for (const p of l.puppies ?? []) add(p.color);
  return Object.fromEntries([...out.entries()].sort((a, b) => a[1].localeCompare(b[1])));
}

// A condition in words, for a block's summary line.
export function condWords(kind, c) {
  const spec = FIELDS[kind][c.field];
  if (!spec) return '';
  const val = (v) => (spec.kind === 'enum' ? spec.values[v] ?? v : v);
  const value = c.value == null ? '' : Array.isArray(c.value) ? c.value.map(val).join(', ') : val(c.value);
  if (spec.kind === 'bool') return valueName(spec, c.op === 'yes' ? 'yes' : 'no');
  return [spec.label, OPS[spec.kind][c.op], value].filter(Boolean).join(' ');
}
