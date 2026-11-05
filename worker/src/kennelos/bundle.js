// What a bundle does to the site (plan 5.3). KennelOS's Update website posts one
// to api.kennelport.com/v1/bundle; it lands in the draft, all of it or none, and
// the answer is a summary and the addresses of the pages already published.
//
// The bundle (format 1). Every key is named here; any other is refused, so nothing
// KennelOS adds reaches the site until this list knows it (5.1's allow-list, from
// this side). Ids are KennelOS's own. Lists are capped (MAX).
//
//   { format: 1, bundle_id, kennel_id, waitlist_public_id?,
//     dogs: [{ id, call_name, registered_name, registry, sex, date_of_birth, color,
//              status: puppy | active_breeding | for_sale | retired_breeding | deceased,
//              died_on, titles: [..], health: [{ id, test, result, normal, date, verify_url }],
//              co_owned?, lives_away?, lives_with_kennel_id?, co_owner_kennel_ids?: [..] }],
//     litters: [{ id, pairing_id, heat_id, name, dam_id, sire_id, dam_name, sire_name,
//                 expected_on, born_on, ready_on, deposits_on, prices: { price_female, … },
//                 puppies: [{ id, name, collar, sex, color, registration, registry,
//                             status: available | reserved | placed | staying | undecided | hidden }] }],
//     pairings: [{ id, heat_id, dam_id, sire_id, dam_name, sire_name, planned_on, expected_on }],
//     heats: [{ id, dam_id, dam_name, month }],
//     extras?: [{ id, name, group, description, price_from, price_to }],
//     products?: [{ id, name, link_url, code, code_note, website?, transport? }],
//     steps?: [{ id, heading, body }],
//     partner_kennels?: [{ id, name, website }],
//     payment?: { application_fee?: {…}, deposit?: {…} } }
//
// Only records she marked Show on website are in it (dogs, litters, pairings; a
// heat only for a dam with heats_online), with the statuses she set: KennelOS maps
// a puppy's disposition with isPupAvailable, and does the heat-to-pairing rules,
// so the site works nothing out (decision 30).
//
// Co-owned dogs (docs/Co_Owned_Dogs_Plan.md) come with partner_kennels: the
// kennels of a dog's co-owners that she ticked Name this kennel on my website in
// KennelOS, by public name and website only. A dog's four co-owned fields count
// only in a bundle that has the section; one without leaves them as they are.
//
// Records are matched by KennelOS id, only within one table: a puppy and a dog may
// share one, since a KennelOS puppy is a Dog. A litter's kind (litter, pairing,
// heat) is part of its match, and a litter that names its pairing (or a pairing or
// litter that names the heat it uses) takes over the website litter made from
// that one, with its photos and wording. Taking over, it becomes what a new one of
// its kind would be: the name, its web address and the planned-litter label follow
// the new kind, unless she has changed them on the website.
import { ApiError } from '../lib/http.js';
import { cleanValue, ContentError, slugify, PAYMENT_FIELDS, LITTER_PRICE_FIELDS } from '../content/model.js';
import { PUBLIC_ID } from '../feed.js';
import { loadSnapshot } from '../publish.js';
import { siteBase, siteFacts } from './link.js';
import { litterClockStatements } from './clock.js';
import { coOwnedRules } from '../content/records.js';
import { DEFAULT_RULES, DOG_PLACES, rulesFor, loadBuild } from '../content/rules.js';

export const BUNDLE_FORMAT = 1;
export const MAX_BUNDLE_BYTES = 1024 * 1024;
export const MAX = { dogs: 200, litters: 100, puppies: 30, pairings: 50, heats: 50, health: 60, extras: 100, products: 50, steps: 20, titles: 20, partner_kennels: 50, co_owner_kennels: 10 };

// The optional sections this Worker takes. Each answer lists them (siteFacts), so
// KennelOS sends a new section only to a Worker that knows it, instead of having
// the whole bundle refused.
// 'heat_id': a pairing's and a litter's heat_id, the heat it uses.
// 'partner_kennels': the list, and the co-owned fields on each dog.
// 'transport': a product's website and transport flag (her KennelOS transport
// accounts, for the Getting your pup home page).
export const SECTIONS = ['products', 'registry', 'heat_id', 'partner_kennels', 'transport'];

// ---------- checking ----------

const S = (max, req = false) => ({ type: 'text', max, required: req });
const ML = (max) => ({ type: 'text', max, multiline: true });
const ID = { type: 'text', max: 80, required: true };
const REF = { type: 'text', max: 80 };
const DATE = { type: 'date' };
const INT = { type: 'int', min: 0, max: 100000 };
const ENUM = (values, req = false) => ({ type: 'enum', values, required: req });
const SEX = ENUM(['female', 'male'], true);

const SHAPES = {
  dog: { id: ID, call_name: S(40, true), registered_name: S(120), registry: S(30), sex: SEX, date_of_birth: DATE, color: S(40),
    status: ENUM(['puppy', 'active_breeding', 'for_sale', 'retired_breeding', 'deceased'], true), died_on: DATE,
    titles: { type: 'list', max: MAX.titles, itemMax: 30 }, health: { list: 'health', max: MAX.health },
    co_owned: { type: 'bool' }, lives_away: { type: 'bool' }, lives_with_kennel_id: REF, co_owner_kennel_ids: { type: 'list', max: MAX.co_owner_kennels, itemMax: 80 } },
  // A partner kennel: its public name and website, never a person.
  partner_kennel: { id: ID, name: S(80, true), website: { type: 'url' } },
  health: { id: ID, test: S(60, true), result: S(60, true), normal: { type: 'bool' }, date: DATE, verify_url: { type: 'url' } },
  litter: { id: ID, pairing_id: REF, heat_id: REF, name: S(80), dam_id: REF, sire_id: REF, dam_name: S(60), sire_name: S(60),
    expected_on: DATE, born_on: DATE, ready_on: DATE, deposits_on: DATE, prices: { object: 'prices' }, puppies: { list: 'puppy', max: MAX.puppies } },
  prices: Object.fromEntries(LITTER_PRICE_FIELDS.map((k) => [k, INT])),
  puppy: { id: ID, name: S(40, true), collar: S(30), sex: SEX, color: S(40), registration: ENUM(['limited', 'full']), registry: S(30),
    status: ENUM(['available', 'reserved', 'placed', 'staying', 'undecided', 'hidden'], true) },
  pairing: { id: ID, heat_id: REF, dam_id: REF, sire_id: REF, dam_name: S(60), sire_name: S(60), planned_on: DATE, expected_on: DATE },
  heat: { id: ID, dam_id: REF, dam_name: S(60), month: { type: 'month', required: true } },
  extra: { id: ID, name: S(80, true), group: S(40), description: ML(600), price_from: INT, price_to: INT },
  step: { id: ID, heading: S(80, true), body: ML(400) },
  // A Recommended product from one of her KennelOS Accounts she marked Show on
  // website: its referral link and code (meant to be handed out), never a login.
  // A transport account (flight nanny, ground transport) comes as one too, flagged
  // `transport`, with its website for the address under its badge.
  product: { id: ID, name: S(80, true), link_url: { type: 'url' }, code: S(40), code_note: S(120), website: { type: 'url' }, transport: { type: 'bool' } },
  pay: Object.fromEntries(Object.entries(PAYMENT_FIELDS).filter(([k]) => k !== 'show_on_site')),
};

const bad = (path, message) => new ApiError(400, 'bad_bundle', { path, message: `${path}: ${message}` });

function cleanShape(shape, obj, path) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw bad(path, 'must be an object');
  const fields = SHAPES[shape];
  for (const k of Object.keys(obj)) if (!(k in fields)) throw bad(`${path}.${k}`, 'not a field KennelPort takes');
  const out = {};
  for (const [k, f] of Object.entries(fields)) {
    if (f.list) out[k] = cleanList(f.list, obj[k] ?? [], `${path}.${k}`, f.max);
    else if (f.object) out[k] = obj[k] == null ? null : cleanShape(f.object, obj[k], `${path}.${k}`);
    else {
      try { out[k] = cleanValue(f, obj[k], `${path}.${k}`) ?? (f.type === 'list' ? [] : null); } catch (err) {
        if (err instanceof ContentError) throw bad(`${path}.${k}`, err.message.replace(/^[^:]*: /, ''));
        throw err;
      }
    }
  }
  return out;
}

function cleanList(shape, v, path, max) {
  if (!Array.isArray(v)) throw bad(path, 'must be a list');
  if (v.length > max) throw bad(path, `at most ${max}`);
  const rows = v.map((x, i) => cleanShape(shape, x, `${path}[${i}]`));
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    if (seen.has(r.id)) throw bad(`${path}[${i}].id`, `"${r.id}" is sent twice`);
    seen.add(r.id);
  }
  return rows;
}

const TOP = ['format', 'bundle_id', 'kennel_id', 'sent_at', 'waitlist_public_id', 'dogs', 'litters', 'pairings', 'heats', 'extras', 'products', 'steps', 'payment', 'partner_kennels'];

// For the linked sample's coverage test (tests/fixtures/linked-sample).
export { SHAPES as BUNDLE_SHAPES, TOP as BUNDLE_TOP };

export function cleanBundle(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('bundle', 'must be an object');
  if (body.format !== BUNDLE_FORMAT) {
    throw new ApiError(400, 'unknown_format', { message: 'This website can\'t read what KennelOS sent. Let KennelOS update itself (close and reopen it), then press Update website again.' });
  }
  for (const k of Object.keys(body)) if (!TOP.includes(k)) throw bad(k, 'not a section KennelPort takes');
  const id = String(body.bundle_id ?? '');
  if (!/^[\w-]{8,80}$/.test(id)) throw bad('bundle_id', 'missing');
  const out = {
    bundle_id: id,
    kennel_id: String(body.kennel_id ?? ''),
    waitlist_public_id: body.waitlist_public_id == null ? null : String(body.waitlist_public_id),
    dogs: cleanList('dog', body.dogs ?? [], 'dogs', MAX.dogs),
    litters: cleanList('litter', body.litters ?? [], 'litters', MAX.litters),
    pairings: cleanList('pairing', body.pairings ?? [], 'pairings', MAX.pairings),
    heats: cleanList('heat', body.heats ?? [], 'heats', MAX.heats),
    extras: 'extras' in body ? cleanList('extra', body.extras, 'extras', MAX.extras) : null,
    products: 'products' in body ? cleanList('product', body.products, 'products', MAX.products) : null,
    steps: 'steps' in body ? cleanList('step', body.steps, 'steps', MAX.steps) : null,
    partner_kennels: 'partner_kennels' in body ? cleanList('partner_kennel', body.partner_kennels, 'partner_kennels', MAX.partner_kennels) : null,
    payment: null,
  };
  // A dog names only kennels this bundle sends.
  if (out.partner_kennels) {
    const sent = new Set(out.partner_kennels.map((x) => x.id));
    out.dogs.forEach((d, i) => {
      for (const id of [d.lives_with_kennel_id, ...d.co_owner_kennel_ids].filter(Boolean)) {
        if (!sent.has(id)) throw bad(`dogs[${i}]`, `names kennel "${id}", which partner_kennels doesn't send`);
      }
    });
  }
  if (out.waitlist_public_id !== null && !PUBLIC_ID.test(out.waitlist_public_id)) throw bad('waitlist_public_id', 'not a KennelOS kennel id');
  if ('payment' in body && body.payment != null) {
    if (typeof body.payment !== 'object' || Array.isArray(body.payment)) throw bad('payment', 'must be an object');
    out.payment = {};
    for (const [k, v] of Object.entries(body.payment)) {
      if (!['application_fee', 'deposit'].includes(k)) throw bad(`payment.${k}`, 'not a kind of payment');
      if (v != null) out.payment[k] = cleanShape('pay', v, `payment.${k}`);
    }
  }
  for (const x of out.extras ?? []) if (x.price_from != null && x.price_to != null && x.price_to < x.price_from) throw bad('extras', `${x.name}: highest price below the lowest`);
  return out;
}

// ---------- what KennelOS owns (plan 5.3, "Who owns which field") ----------
// Read-only in the manage app while linked, and replaced by each bundle. Stored
// fields are KennelOS's blanks included; derived ones (titles, health results,
// upcoming items) only overwrite when they have something.
export const OWNED = {
  dogs: ['call_name', 'registered_name', 'registry', 'sex', 'date_of_birth', 'color', 'status', 'upcoming', 'for_sale', 'died_on', 'titles', 'co_owned', 'lives_away', 'lives_with_kennel_id', 'co_owned_with_ids'],
  partners: ['name', 'url'],
  litters: ['stage', 'dam_id', 'sire_id', 'dam_name', 'sire_name', 'born_on', 'ready_on', 'deposits_on', 'expected_label'],
  puppies: ['name', 'collar', 'sex', 'color', 'status', 'registration', 'registry'],
  health: ['test', 'result', 'normal', 'date', 'verify_url'],
  extras: ['name', 'grp', 'description'],
  products: ['name', 'link_url', 'code', 'code_note', 'website_url', 'transport'],
  steps: ['heading', 'body'],
};
export const OWNED_PRICES = { litters: LITTER_PRICE_FIELDS, extras: ['price_from', 'price_to'] };

// How the site's rules land KennelOS data (content/rules.js, rules.landing; today's
// by default): where each dog status sits, a new record's switches, the names and
// labels a litter gets when KennelOS sends none, and where new records go.
export const landingFor = async (env, siteId) => rulesFor(await loadBuild(env, siteId)).rules.landing;
const dogPlace = (L, status) => {
  const [s, upcoming, forSale] = DOG_PLACES[L[`dog_${status}`]] ?? DOG_PLACES.breeding;
  return { status: s, upcoming, for_sale: forSale };
};
// A new website litter's label for a planned litter, by its KennelOS kind.
const planLabel = (L, kind) => (kind === 'heat' ? L.label_heat : kind === 'pairing' ? L.label_pairing : null);
const DEFAULT_LABELS = [DEFAULT_RULES.landing.label_heat, DEFAULT_RULES.landing.label_pairing];
const PUPPY_STATUS = { available: 'available', reserved: 'reserved', placed: 'placed', staying: 'staying', undecided: 'coming_soon', hidden: 'hidden' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOf = (ymd) => (ymd ? `${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}` : null);

// ---------- applying ----------

const lower = (s) => String(s ?? '').trim().toLowerCase();
const same = (a, b) => (a ?? null) === (b ?? null) || String(a ?? '') === String(b ?? '');

// Everything a bundle (or a confirmed match) writes, built as statements for one
// batch, against what the site holds now.
export class Writer {
  constructor(env, site, state, landing = DEFAULT_RULES.landing) {
    this.env = env;
    this.L = landing;
    this.db = env.DB;
    this.site = site;
    this.siteId = site.id;
    this.t = new Date().toISOString();
    this.s = [];
    this.st = state;
    this.prices = Boolean(site.use_kennelos_prices);
    this.counts = { updated: 0, created: 0, needs_photos: 0, off: 0, back: 0, waiting: 0 };
    this.dogSlugs = new Set(state.dogs.map((d) => d.slug));
    this.litterSlugs = new Set(state.litters.map((l) => l.slug));
    this.puppySlugs = new Map();
    for (const p of state.puppies) {
      if (!this.puppySlugs.has(p.litter_id)) this.puppySlugs.set(p.litter_id, new Set());
      this.puppySlugs.get(p.litter_id).add(p.slug);
    }
    // KennelOS dog id → website dog id, for parents.
    this.dogByKos = new Map(state.dogs.filter((d) => d.kennelos_id).map((d) => [d.kennelos_id, d.id]));
    this.sort = { dogs: Math.max(-1, ...state.dogs.map((d) => d.sort)), litters: Math.max(-1, ...state.litters.map((l) => l.sort)) };
    this.first = { dogs: Math.min(0, ...state.dogs.map((d) => d.sort)), litters: Math.min(0, ...state.litters.map((l) => l.sort)) };
  }

  // Where a new dog or litter goes in her order: at the end, or first.
  nextSort(kind) {
    if (this.L.new_at === 'start') { this.first[kind] -= 1; return this.first[kind]; }
    this.sort[kind] += 1;
    return this.sort[kind];
  }

  slug(taken, wanted) {
    const base = slugify(wanted) || 'item';
    for (let n = 1; n < 1000; n++) {
      const s = n === 1 ? base : `${base.slice(0, 56)}-${n}`;
      if (!taken.has(s)) { taken.add(s); return s; }
    }
    throw new ApiError(400, 'bad_bundle', { message: 'Could not find a free web address.' });
  }

  insert(table, row) {
    const cols = Object.keys(row);
    this.s.push(this.db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map((c) => row[c])));
  }

  // Write only what differs. Returns whether anything did.
  update(table, current, values) {
    const cols = Object.keys(values).filter((c) => !same(current[c], values[c]));
    if (!cols.length) return false;
    const stamp = ['dogs', 'litters', 'puppies'].includes(table) ? ', updated_at = ?' : '';
    this.s.push(this.db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')}${stamp} WHERE id = ? AND site_id = ?`)
      .bind(...cols.map((c) => values[c]), ...(stamp ? [this.t] : []), current.id, this.siteId));
    return true;
  }

  // ----- dogs -----
  dogValues(bd) {
    const v = {
      call_name: bd.call_name, registered_name: bd.registered_name, registry: bd.registry, sex: bd.sex, date_of_birth: bd.date_of_birth, color: bd.color,
      ...dogPlace(this.L, bd.status), died_on: bd.status === 'deceased' ? bd.died_on : null,
    };
    if (bd.titles.length) v.titles = bd.titles.join(' ').slice(0, 120);
    // Co-owned, only from a bundle with partner_kennels (this.partnerByKos).
    if (this.partnerByKos) {
      const kennel = (kos) => (kos ? this.partnerByKos.get(kos) ?? null : null);
      const c = coOwnedRules({
        co_owned: bd.co_owned ? 1 : 0, lives_away: bd.lives_away ? 1 : 0, lives_with_kennel_id: kennel(bd.lives_with_kennel_id),
        co_owned_with_ids: bd.co_owner_kennel_ids.map(kennel).filter(Boolean),
      });
      Object.assign(v, c, { co_owned_with_ids: c.co_owned_with_ids.length ? JSON.stringify(c.co_owned_with_ids) : null });
    }
    return v;
  }

  // ----- partner kennels -----
  // Matched by KennelOS id, else one she made by hand with the same name (taken
  // over, keeping its logo); the rest are new. One no longer sent is hidden, not
  // deleted: its logo lives only here. Name and website are KennelOS's.
  partners(list, existing) {
    this.partnerByKos = new Map();
    const byKos = new Map(existing.filter((x) => x.kennelos_id).map((x) => [x.kennelos_id, x]));
    const free = existing.filter((x) => !x.kennelos_id);
    let sort = Math.max(-1, ...existing.map((x) => x.sort));
    for (const x of list) {
      const values = { name: x.name, url: x.website, source: 'kennelos', kennelos_id: x.id, hidden_by_kennelos: 0 };
      let cur = byKos.get(x.id);
      if (!cur) {
        const j = free.findIndex((r) => lower(r.name) === lower(x.name));
        if (j >= 0) [cur] = free.splice(j, 1);
      }
      if (cur) {
        if (cur.hidden_by_kennelos) this.counts.back++;
        if (this.update('partner_kennels', cur, values)) this.counts.updated++;
        this.partnerByKos.set(x.id, cur.id);
        continue;
      }
      const id = crypto.randomUUID();
      this.insert('partner_kennels', { id, site_id: this.siteId, ...values, sort: ++sort, created_at: this.t });
      this.partnerByKos.set(x.id, id);
      this.counts.created++;
    }
    const sent = new Set(list.map((x) => x.id));
    for (const x of existing) {
      if (x.source === 'kennelos' && x.kennelos_id && !sent.has(x.kennelos_id) && !x.hidden_by_kennelos) {
        this.s.push(this.db.prepare('UPDATE partner_kennels SET hidden_by_kennelos = 1 WHERE id = ?').bind(x.id));
        this.counts.off++;
      }
    }
  }

  createDog(bd, extra = {}) {
    const id = crypto.randomUUID();
    const sort = this.nextSort('dogs');
    const display = this.L.health_display;
    this.insert('dogs', {
      id, site_id: this.siteId, slug: this.slug(this.dogSlugs, bd.call_name), ...this.dogValues(bd), health_display: display, show_on_site: 1,
      sort, source: 'kennelos', kennelos_id: bd.id, hidden_by_kennelos: 0, created_at: this.t, updated_at: this.t, ...extra,
    });
    this.dogByKos.set(bd.id, id);
    this.health(id, display, bd.health);
    return id;
  }

  // Health results as data (plan 3.7): her own (typed) results stay; KennelOS's
  // are replaced with what it sent, when it sent any. A new one's Show on site is
  // set once from the dog's Health results choice, and is hers from then on, save
  // one kept off as not normal, which follows the choice again once it is. A
  // result KennelOS leaves unmarked (normal: null) counts as normal.
  health(dogId, display, list, existing = []) {
    if (!list.length) return;
    const mine = existing.filter((h) => h.dog_id === dogId && h.source === 'kennelos');
    const byKos = new Map(mine.map((h) => [h.kennelos_id, h]));
    list.forEach((h, i) => {
      const values = { test: h.test, result: h.result, normal: h.normal ?? 1, date: h.date, verify_url: h.verify_url, sort: 100 + i };
      const cur = byKos.get(h.id);
      // A result Normal results only kept off for not being normal shows once it
      // is (KennelOS sends an unmarked result as normal now): the dog's rule, again.
      if (cur && display === 'normal_only' && !cur.normal && !cur.show && values.normal) values.show = 1;
      if (cur) { this.update('health_results', cur, values); return; }
      const show = display === 'all' ? 1 : display === 'normal_only' ? values.normal : 0;
      this.insert('health_results', { id: crypto.randomUUID(), site_id: this.siteId, dog_id: dogId, ...values, show, source: 'kennelos', kennelos_id: h.id });
    });
    const sent = new Set(list.map((h) => h.id));
    for (const h of mine) if (!sent.has(h.kennelos_id)) this.s.push(this.db.prepare('DELETE FROM health_results WHERE id = ?').bind(h.id));
  }

  updateDog(cur, bd, keep = []) {
    const values = this.dogValues(bd);
    for (const k of keep) delete values[k];
    values.hidden_by_kennelos = 0;
    if (cur.hidden_by_kennelos) this.counts.back++;
    if (this.update('dogs', cur, values)) this.counts.updated++;
    this.health(cur.id, cur.health_display, bd.health, this.st.health);
  }

  // ----- litters -----
  // A litter's Show prices starts on with Use my KennelOS prices, unless the site's
  // rule leaves it for the breeder to switch on.
  pricesOn(kind) { return this.prices && kind === 'litter' && this.L.show_prices === 'kos_prices'; }

  parent(kosId) { return kosId ? this.dogByKos.get(kosId) ?? null : null; }

  litterValues(e, kind) {
    const planned = kind !== 'litter' || !e.born_on;
    // A parent that is one of her website dogs is that dog; the typed name ("if not
    // one of your dogs") is only for one that isn't, like an outside stud.
    const damId = this.parent(e.dam_id);
    const sireId = this.parent(e.sire_id);
    const v = {
      dam_id: damId, sire_id: sireId, dam_name: damId ? null : e.dam_name ?? null, sire_name: sireId ? null : e.sire_name ?? null,
      stage: planned ? 'planned' : 'current',
      born_on: kind === 'litter' ? e.born_on : null, ready_on: kind === 'litter' ? e.ready_on : null, deposits_on: kind === 'litter' ? e.deposits_on : null,
      expected_label: kind === 'heat' ? monthOf(`${e.month}-01`) : planned ? monthOf(e.expected_on ?? e.planned_on ?? null) : null,
    };
    if (this.prices && kind === 'litter') for (const k of LITTER_PRICE_FIELDS) v[k] = e.prices?.[k] ?? null;
    return v;
  }

  litterName(e, kind, L = this.L) {
    if (e.name) return e.name;
    const dam = e.dam_name; const sire = e.sire_name;
    const fill = (t) => t.replace('{dam}', dam ?? '').replace('{sire}', sire ?? '');
    if (kind === 'heat') return dam ? fill(L.name_heat) : L.name_none;
    return dam && sire ? fill(L.name_pair) : dam ? fill(L.name_dam) : L.name_upcoming;
  }

  // A litter's name as KennelOS gave it, and whether the website one is still
  // that (not changed by her). One made before kennelos_name was kept counts as
  // KennelOS's while it reads like a name the site would have made for it.
  namedByKennelos(cur, e) {
    if (cur.kennelos_name != null) return cur.name === cur.kennelos_name;
    if (cur.source !== 'kennelos') return false;
    const plain = { ...e, name: null };
    return [this.L, DEFAULT_RULES.landing].some((L) => ['heat', 'pairing', 'litter'].some((k) => cur.name === this.litterName(plain, k, L)));
  }

  // Is this address the one slug() made from that name (with or without a -2)?
  slugFromName(slug, name) {
    const base = slugify(name) || 'item';
    return slug === base || (slug.startsWith(`${base.slice(0, 56)}-`) && /^\d+$/.test(slug.slice(base.slice(0, 56).length + 1)));
  }

  createLitter(e, kind) {
    const id = crypto.randomUUID();
    const name = this.litterName(e, kind);
    const sort = this.nextSort('litters');
    this.insert('litters', {
      id, site_id: this.siteId, slug: this.slug(this.litterSlugs, name), name, kennelos_name: name, ...this.litterValues(e, kind),
      plan_label: planLabel(this.L, kind),
      show_on_site: 1, show_prices: this.pricesOn(kind) ? 1 : 0, show_placed: this.L.show_placed ? 1 : 0, sort, source: 'kennelos', kennelos_id: e.id, kennelos_kind: kind,
      hidden_by_kennelos: 0, created_at: this.t, updated_at: this.t,
    });
    this.puppySlugs.set(id, new Set());
    if (kind === 'litter') this.puppies(id, e.puppies, []);
    return id;
  }

  updateLitter(cur, e, kind, keep = []) {
    const values = this.litterValues(e, kind);
    for (const k of keep) delete values[k];
    values.hidden_by_kennelos = 0;
    values.kennelos_kind = kind;
    values.kennelos_id = e.id;
    // Its name follows KennelOS's (a nickname set, or a heat becoming a pairing)
    // while it is still the one KennelOS gave; and its label for a planned litter
    // follows its kind while it is still one the site gave. Her own wording stays.
    // (A matched one already has KennelOS's name: matching goes by it.)
    const named = this.namedByKennelos(cur, e);
    const name = this.litterName(e, kind);
    if (named) values.name = name;
    values.kennelos_name = named ? name : cur.kennelos_name ?? name;
    // Its address follows a new name while it is still the one the site made from
    // the old (her own stays). Publish keeps the old address working (redirects).
    if (named && name !== cur.name && this.slugFromName(cur.slug, cur.name)) {
      this.litterSlugs.delete(cur.slug);
      values.slug = this.slug(this.litterSlugs, name);
    }
    if (cur.plan_label == null || [...DEFAULT_LABELS, this.L.label_heat, this.L.label_pairing].includes(cur.plan_label)) values.plan_label = planLabel(this.L, kind);
    // With Use my KennelOS prices, Show prices starts on the first time a litter's
    // prices arrive; from then on the switch is hers.
    if (this.pricesOn(kind) && !cur.show_prices && LITTER_PRICE_FIELDS.every((k) => cur[k] == null) && LITTER_PRICE_FIELDS.some((k) => values[k] != null)) values.show_prices = 1;
    if (cur.hidden_by_kennelos) this.counts.back++;
    if (this.update('litters', cur, values)) this.counts.updated++;
    if (kind === 'litter') this.puppies(cur.id, e.puppies, this.st.puppies.filter((p) => p.litter_id === cur.id));
  }

  // A litter's puppies come with it: matched by KennelOS id, else (one not yet
  // linked) by name within the litter; the rest are new. Ones KennelOS no longer
  // sends leave the site.
  puppies(litterId, list, existing) {
    const byKos = new Map(this.st.puppies.filter((p) => p.kennelos_id).map((p) => [p.kennelos_id, p]));
    const free = existing.filter((p) => !p.kennelos_id);
    const taken = this.puppySlugs.get(litterId) ?? new Set();
    this.puppySlugs.set(litterId, taken);
    list.forEach((bp, i) => {
      const values = { name: bp.name, collar: bp.collar, sex: bp.sex, color: bp.color, status: PUPPY_STATUS[bp.status], registration: bp.registration, registry: bp.registry };
      let cur = byKos.get(bp.id);
      if (cur && cur.litter_id !== litterId) cur = null;
      if (!cur) {
        const j = free.findIndex((p) => lower(p.name) === lower(bp.name));
        if (j >= 0) [cur] = free.splice(j, 1);
      }
      if (cur) {
        this.update('puppies', cur, { ...values, source: 'kennelos', kennelos_id: bp.id, hidden_by_kennelos: 0 });
        return;
      }
      this.insert('puppies', {
        id: crypto.randomUUID(), site_id: this.siteId, litter_id: litterId, slug: this.slug(taken, bp.name), ...values, sort: existing.length + i,
        source: 'kennelos', kennelos_id: bp.id, hidden_by_kennelos: 0, created_at: this.t, updated_at: this.t,
      });
    });
    const sent = new Set(list.map((p) => p.id));
    for (const p of existing) {
      if (p.source === 'kennelos' && p.kennelos_id && !sent.has(p.kennelos_id) && !p.hidden_by_kennelos) {
        this.s.push(this.db.prepare('UPDATE puppies SET hidden_by_kennelos = 1, updated_at = ? WHERE id = ?').bind(this.t, p.id));
      }
    }
  }
}

// The site's records, as a bundle needs them.
export async function siteState(env, siteId) {
  const all = async (sql) => (await env.DB.prepare(sql).bind(siteId).all()).results;
  return {
    dogs: await all('SELECT * FROM dogs WHERE site_id = ?'),
    litters: await all('SELECT * FROM litters WHERE site_id = ?'),
    puppies: await all('SELECT * FROM puppies WHERE site_id = ?'),
    health: await all('SELECT * FROM health_results WHERE site_id = ?'),
    extras: await all('SELECT * FROM extras WHERE site_id = ?'),
    steps: await all("SELECT * FROM steps WHERE site_id = ? AND page = 'how_it_works'"),
    declines: await all('SELECT * FROM link_declines WHERE site_id = ?'),
    partners: await all('SELECT * FROM partner_kennels WHERE site_id = ?'),
  };
}

export async function applyBundle(env, device, body) {
  const clean = cleanBundle(body);
  if (clean.kennel_id !== device.kennelos_kennel_id) {
    throw new ApiError(409, 'other_kennel', { message: 'This website is linked to another of your kennels. Each kennel links to its own website.' });
  }
  const site = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(device.site_id).first();
  // A retry over a bad connection: answered with its first summary, not applied twice.
  if (device.last_bundle_id === clean.bundle_id) {
    return { summary: JSON.parse(device.last_bundle_summary ?? '{}'), addresses: await publishedAddresses(env, site), site: await siteFacts(env, site), repeat: true };
  }

  const st = await siteState(env, site.id);
  const w = new Writer(env, site, st, await landingFor(env, site.id));
  const declined = (kind, kos, kp) => st.declines.some((d) => d.kind === kind && d.kennelos_id === kos && d.kennelport_id === kp);
  const pending = [];
  const claimed = new Set();
  // A KennelOS record with no match, whose name matches a website one not yet
  // linked: wait for her to confirm or decline the pair (plan 5.2 step 4).
  const candidate = (kind, rows, name, kos) => rows.find((r) => !r.kennelos_id && !claimed.has(r.id) && lower(r[kind === 'dogs' ? 'call_name' : 'name']) === lower(name) && !declined(kind, kos, r.id));

  // Partner kennels first: dogs name them.
  if (clean.partner_kennels) w.partners(clean.partner_kennels, st.partners);

  // Dogs.
  const sentDogs = new Set(clean.dogs.map((d) => d.id));
  for (const bd of clean.dogs) {
    const cur = st.dogs.find((d) => d.kennelos_id === bd.id);
    if (cur) { w.updateDog(cur, bd); continue; }
    // The hand-over (5.3): a kept puppy becomes a dog, taking its photos with it at
    // once, so the litter's deletion can't take the only pictures of her.
    const pup = st.puppies.find((p) => p.kennelos_id === bd.id);
    if (pup) {
      const id = w.createDog(bd, { photo_id: pup.photo_id ?? null, bio: pup.bio ?? null });
      w.s.push(env.DB.prepare("INSERT OR IGNORE INTO photo_tags (site_id, photo_id, subject) SELECT site_id, photo_id, ? FROM photo_tags WHERE site_id = ? AND subject = ?").bind(`dog:${id}`, site.id, `puppy:${pup.id}`));
      w.counts.created++;
      if (!pup.photo_id) w.counts.needs_photos++;
      continue;
    }
    const match = candidate('dogs', st.dogs, bd.call_name, bd.id);
    if (match) { claimed.add(match.id); pending.push({ kind: 'dogs', kennelos_id: bd.id, kennelport_id: match.id, data: bd }); continue; }
    w.createDog(bd);
    w.counts.created++;
    w.counts.needs_photos++;
  }
  for (const d of st.dogs) {
    if (d.source === 'kennelos' && d.kennelos_id && !sentDogs.has(d.kennelos_id) && !d.hidden_by_kennelos) {
      w.s.push(env.DB.prepare('UPDATE dogs SET hidden_by_kennelos = 1, updated_at = ? WHERE id = ?').bind(w.t, d.id));
      w.counts.off++;
    }
  }

  // Litters, pairings and heats: all website litters, each matched within its kind.
  const entries = [
    ...clean.litters.map((e) => ['litter', e]),
    ...clean.pairings.map((e) => ['pairing', e]),
    ...clean.heats.map((e) => ['heat', e]),
  ];
  const kept = new Set();
  for (const [kind, e] of entries) {
    let cur = st.litters.find((l) => l.kennelos_kind === kind && l.kennelos_id === e.id);
    // Pairing to litter: the website litter made from the pairing moves onto the
    // litter's id, keeping its photos, wording and address.
    if (!cur && kind === 'litter' && e.pairing_id) cur = st.litters.find((l) => l.kennelos_kind === 'pairing' && l.kennelos_id === e.pairing_id && !kept.has(l.id));
    // Heat to pairing (or to litter, when the pairing never showed): the one made
    // from the heat it uses, likewise.
    if (!cur && kind !== 'heat' && e.heat_id) cur = st.litters.find((l) => l.kennelos_kind === 'heat' && l.kennelos_id === e.heat_id && !kept.has(l.id));
    if (cur) { kept.add(cur.id); w.updateLitter(cur, e, kind); continue; }
    const name = w.litterName(e, kind);
    const match = candidate('litters', st.litters, name, `${kind}:${e.id}`);
    if (match) { claimed.add(match.id); pending.push({ kind: 'litters', kennelos_id: `${kind}:${e.id}`, kennelport_id: match.id, data: { ...e, kind } }); continue; }
    w.createLitter(e, kind);
    w.counts.created++;
    if (kind === 'litter') w.counts.needs_photos++;
  }
  for (const l of st.litters) {
    if (l.source === 'kennelos' && l.kennelos_id && !kept.has(l.id) && !l.hidden_by_kennelos) {
      w.s.push(env.DB.prepare('UPDATE litters SET hidden_by_kennelos = 1, updated_at = ? WHERE id = ?').bind(w.t, l.id));
      w.counts.off++;
    }
  }

  // Extras (3.4): names, groups and descriptions; prices with Use my KennelOS prices.
  if (clean.extras) {
    const byKos = new Map(st.extras.filter((x) => x.kennelos_id).map((x) => [x.kennelos_id, x]));
    let sort = Math.max(-1, ...st.extras.map((x) => x.sort));
    for (const x of clean.extras) {
      const values = { name: x.name, grp: x.group, description: x.description, ...(w.prices ? { price_from: x.price_from, price_to: x.price_to } : {}) };
      const cur = byKos.get(x.id);
      if (cur) { if (w.update('extras', cur, values)) w.counts.updated++; continue; }
      w.insert('extras', { id: crypto.randomUUID(), site_id: site.id, kind: 'item', ...values, featured: 0, sort: ++sort, source: 'kennelos', kennelos_id: x.id });
      w.counts.created++;
    }
    const sent = new Set(clean.extras.map((x) => x.id));
    for (const x of st.extras) if (x.source === 'kennelos' && !sent.has(x.kennelos_id)) w.s.push(env.DB.prepare('DELETE FROM extras WHERE id = ?').bind(x.id));
  }

  // Recommended products from her Accounts: name, link, code and its note, and
  // (transport section) its website and whether it's a transport service. The
  // picture, its badges, button wording, group, description and order stay hers. A
  // product she made by hand with the same name is taken over (extras and products
  // match by name, 5.2), keeping its picture. One KennelOS stops sending leaves;
  // its picture stays in her photos.
  if (clean.products) {
    const products = (await env.DB.prepare('SELECT * FROM products WHERE site_id = ?').bind(site.id).all()).results;
    const byKos = new Map(products.filter((x) => x.kennelos_id).map((x) => [x.kennelos_id, x]));
    const free = products.filter((x) => !x.kennelos_id);
    let sort = Math.max(-1, ...products.map((x) => x.sort));
    for (const x of clean.products) {
      // Its website and transport flag are KennelOS's too (OWNED); a KennelOS from
      // before the 'transport' section sends neither, and never a transport account.
      const values = { name: x.name, link_url: x.link_url, code: x.code, code_note: x.code_note, website_url: x.website, transport: x.transport ? 1 : 0 };
      let cur = byKos.get(x.id);
      if (!cur) {
        const j = free.findIndex((p) => lower(p.name) === lower(x.name));
        if (j >= 0) [cur] = free.splice(j, 1);
      }
      if (cur) {
        if (w.update('products', cur, { ...values, source: 'kennelos', kennelos_id: x.id })) w.counts.updated++;
        continue;
      }
      w.insert('products', { id: crypto.randomUUID(), site_id: site.id, ...values, home_badge: 0, sort: ++sort, source: 'kennelos', kennelos_id: x.id });
      w.counts.created++;
    }
    const sent = new Set(clean.products.map((x) => x.id));
    for (const x of products) if (x.source === 'kennelos' && !sent.has(x.kennelos_id)) w.s.push(env.DB.prepare('DELETE FROM products WHERE id = ?').bind(x.id));
  }

  // The waitlist steps behind How it works (3.11): only when KennelOS sends some.
  if (clean.steps?.length) {
    const byKos = new Map(st.steps.filter((x) => x.kennelos_id).map((x) => [x.kennelos_id, x]));
    clean.steps.forEach((x, i) => {
      const cur = byKos.get(x.id);
      const values = { heading: x.heading, body: x.body, sort: i };
      if (cur) { w.update('steps', cur, values); return; }
      w.insert('steps', { id: crypto.randomUUID(), site_id: site.id, page: 'how_it_works', ...values, pay_link: 0, source: 'kennelos', kennelos_id: x.id });
    });
    const sent = new Set(clean.steps.map((x) => x.id));
    for (const x of st.steps) if (x.source === 'kennelos' && !sent.has(x.kennelos_id)) w.s.push(env.DB.prepare('DELETE FROM steps WHERE id = ?').bind(x.id));
    // Her own steps follow KennelOS's.
    st.steps.filter((x) => x.source !== 'kennelos').forEach((x, i) => w.s.push(env.DB.prepare('UPDATE steps SET sort = ? WHERE id = ?').bind(clean.steps.length + i, x.id)));
  }

  // How to pay (3.9): filled from her waitlist settings; whether it shows is hers.
  for (const [kind, c] of Object.entries(clean.payment ?? {})) {
    const content = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== null && !(Array.isArray(v) && !v.length)));
    if (!Object.keys(content).length) continue;
    w.s.push(env.DB.prepare(`INSERT INTO payment_info (site_id, kind, show_on_site, content, source) VALUES (?, ?, 0, ?, 'kennelos')
      ON CONFLICT (site_id, kind) DO UPDATE SET content = excluded.content, source = 'kennelos'`).bind(site.id, kind, JSON.stringify(content)));
  }

  // Her public list (3.8): Connect website sets the feed up, so she never pastes it.
  if (clean.waitlist_public_id && clean.waitlist_public_id !== site.kennelos_public_id) {
    w.s.push(env.DB.prepare('UPDATE sites SET kennelos_public_id = ? WHERE id = ?').bind(clean.waitlist_public_id, site.id));
    w.s.push(env.DB.prepare('DELETE FROM feed_cache WHERE site_id = ?').bind(site.id));
  }

  // Waiting matches are rebuilt from each bundle.
  w.s.push(env.DB.prepare('DELETE FROM link_pending WHERE site_id = ?').bind(site.id));
  for (const p of pending) {
    w.s.push(env.DB.prepare('INSERT INTO link_pending (site_id, kind, kennelos_id, kennelport_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(site.id, p.kind, p.kennelos_id, p.kennelport_id, JSON.stringify(p.data), w.t));
  }
  w.counts.waiting = pending.length;

  const summary = { ...w.counts, text: summaryText(w.counts), at: w.t };
  w.s.push(...litterClockStatements(env, site.id, w.t));
  w.s.push(env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(w.t, site.id));
  w.s.push(env.DB.prepare('UPDATE links SET last_bundle_id = ?, last_bundle_at = ?, last_bundle_summary = ? WHERE id = ?').bind(clean.bundle_id, w.t, JSON.stringify(summary), device.id));
  w.s.push(env.DB.prepare('INSERT INTO notices (id, site_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), site.id, 'bundle', summary.text, w.t));
  await env.DB.batch(w.s);
  return { summary, addresses: await publishedAddresses(env, site), site: await siteFacts(env, site) };
}

export function summaryText(c) {
  const parts = [];
  if (c.updated) parts.push(`${c.updated} updated`);
  if (c.created) parts.push(`${c.created} new${c.needs_photos ? ` (${c.needs_photos === c.created ? '' : `${c.needs_photos} `}needs photos)` : ''}`);
  if (c.back) parts.push(`${c.back} back on the site`);
  if (c.off) parts.push(`${c.off} off the site`);
  if (c.waiting) parts.push(`${c.waiting} to match`);
  const head = parts.length ? `From KennelOS: ${parts.join(', ')}.` : 'From KennelOS: nothing new.';
  return `${head}${c.waiting ? ' Check the matches under KennelOS.' : ''} Preview, then Publish.`;
}

// The addresses of pages the published site carries (plan 5.4), so KennelOS
// fills dog.url and litter.photos_url only with pages that answer. A dog's own
// page wins over its puppy page. Any address KennelOS wrote that isn't here any
// more has left the site.
export async function publishedAddresses(env, site) {
  const out = { dogs: {}, litters: {} };
  const snap = await loadSnapshot(env, site.id, site.published_snapshot_id);
  if (!snap) return out;
  const kos = async (table, extra = '') => new Map((await env.DB.prepare(`SELECT id, kennelos_id FROM ${table} WHERE site_id = ? AND kennelos_id IS NOT NULL${extra}`).bind(site.id).all()).results.map((r) => [r.id, r.kennelos_id]));
  const dogs = await kos('dogs');
  const litters = await kos('litters', " AND kennelos_kind = 'litter'");
  const pups = await kos('puppies');
  const base = await siteBase(env, site);
  const siteAddress = (_env, _sub, path) => `${base}${path}`;
  for (const d of snap.dogs) if (dogs.has(d.id)) out.dogs[dogs.get(d.id)] = siteAddress(env, site.subdomain, `/dogs/${d.slug}`);
  if (snap.pages?.litters?.enabled) {
    for (const l of snap.litters) {
      if (litters.has(l.id)) out.litters[litters.get(l.id)] = siteAddress(env, site.subdomain, `/litters/${l.slug}`);
      for (const p of l.puppies) {
        const k = pups.get(p.id);
        if (k && !out.dogs[k]) out.dogs[k] = siteAddress(env, site.subdomain, `/litters/${l.slug}/${p.slug}`);
      }
    }
  }
  return out;
}
