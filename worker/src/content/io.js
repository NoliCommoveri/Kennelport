// Content in and out as one JSON document: the operator's editor in phase 1
// (/ops, "Content"), until the manage app's forms exist (phase 2). The document is
// the content model (model.js) shaped by section; ids never appear in it.
//
//   { site: {...}, pages: { about: { enabled, menu_label, ...wording } },
//     home: { hero: { enabled, ... } }, dogs: [{ ..., health: [...] }],
//     litters: [{ ..., dam: '<dog slug>', puppies: [...] }], reviews: [...],
//     steps: [...], expanders: { policies: [...], faq: [...], waitlist_help: [...] },
//     extras: [...], payment: { application_fee: {...}, deposit: {...}, safe_notice: {...} } }
//
// Every section is optional. A section that is present replaces that section of
// the draft: dogs, litters and puppies are matched by slug, so their ids (and the
// addresses and KennelOS links that hang on them) survive; lists without slugs are
// replaced whole. Everything is checked before anything is written, and the
// writes go in one batch, so an import lands whole or not at all.
import {
  SITE_FIELDS, DOG_FIELDS, HEALTH_FIELDS, LITTER_FIELDS, PUPPY_FIELDS, REVIEW_FIELDS,
  STEP_FIELDS, EXPANDER_FIELDS, EXPANDER_PAGES, EXTRA_FIELDS, HOME_BLOCKS, PAGES, PAYMENT_KINDS, PAYMENT_FIELDS, SAFE_NOTICE_FIELDS,
  ContentError, cleanRecord, cleanValue,
} from './model.js';

const SECTIONS = ['site', 'pages', 'home', 'dogs', 'litters', 'reviews', 'steps', 'expanders', 'extras', 'payment'];
const MAX_ITEMS = 200;

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function list(v, path) {
  if (!Array.isArray(v)) throw new ContentError(path, 'must be a list');
  if (v.length > MAX_ITEMS) throw new ContentError(path, `at most ${MAX_ITEMS} items`);
  return v;
}

function uniqueSlugs(rows, path) {
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    if (seen.has(r.slug)) throw new ContentError(`${path}[${i}].slug`, `"${r.slug}" is used twice`);
    seen.add(r.slug);
  }
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

// Check a whole document. Returns the cleaned sections; throws ContentError.
export function cleanDocument(doc, { photoIds = new Set(), existingDogSlugs = new Set() } = {}) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new ContentError('content', 'must be a JSON object');
  for (const k of Object.keys(doc)) if (!SECTIONS.includes(k)) throw new ContentError(k, `not a section (sections: ${SECTIONS.join(', ')})`);
  const out = {};
  const photo = (id, path) => {
    if (id && !photoIds.has(id)) throw new ContentError(path, `no photo with id ${id} on this site`);
  };

  if ('site' in doc) out.site = cleanRecord(SITE_FIELDS, doc.site, 'site', { partial: true });

  if ('pages' in doc) {
    if (!doc.pages || typeof doc.pages !== 'object') throw new ContentError('pages', 'must be an object');
    out.pages = {};
    for (const [key, v] of Object.entries(doc.pages)) {
      const page = PAGES[key];
      if (!page) throw new ContentError(`pages.${key}`, `not a page (pages: ${Object.keys(PAGES).join(', ')})`);
      const path = `pages.${key}`;
      const enabled = 'enabled' in v ? cleanValue({ type: 'bool' }, v.enabled, `${path}.enabled`) : 1;
      if (!enabled && !page.canHide) throw new ContentError(`${path}.enabled`, 'this page is always on');
      const menu_label = cleanValue({ type: 'text', max: 40 }, v.menu_label, `${path}.menu_label`);
      const content = cleanRecord(page.fields, omit(v, ['enabled', 'menu_label']), path, { partial: true });
      if (content.photo_id) photo(content.photo_id, `${path}.photo_id`);
      out.pages[key] = { enabled, menu_label, content };
    }
  }

  if ('home' in doc) {
    if (!doc.home || typeof doc.home !== 'object') throw new ContentError('home', 'must be an object');
    out.home = {};
    for (const [key, v] of Object.entries(doc.home)) {
      const fields = HOME_BLOCKS[key];
      if (!fields) throw new ContentError(`home.${key}`, `not a block (blocks: ${Object.keys(HOME_BLOCKS).join(', ')})`);
      const path = `home.${key}`;
      const enabled = 'enabled' in v ? cleanValue({ type: 'bool' }, v.enabled, `${path}.enabled`) : 1;
      const content = cleanRecord(fields, omit(v, ['enabled']), path, { partial: true });
      for (const id of content.photos ?? []) photo(id, `${path}.photos`);
      if (content.photo_id) photo(content.photo_id, `${path}.photo_id`);
      out.home[key] = { enabled, content };
    }
  }

  if ('dogs' in doc) {
    out.dogs = list(doc.dogs, 'dogs').map((d, i) => {
      const path = `dogs[${i}]`;
      const dog = cleanRecord(DOG_FIELDS, omit(d, ['health']), path);
      photo(dog.photo_id, `${path}.photo_id`);
      const health = list(d.health ?? [], `${path}.health`).map((h, j) => cleanRecord(HEALTH_FIELDS, h, `${path}.health[${j}]`));
      return { ...dog, health };
    });
    uniqueSlugs(out.dogs, 'dogs');
  }
  const dogSlugs = out.dogs ? new Set(out.dogs.map((d) => d.slug)) : existingDogSlugs;

  if ('litters' in doc) {
    out.litters = list(doc.litters, 'litters').map((l, i) => {
      const path = `litters[${i}]`;
      const litter = cleanRecord(LITTER_FIELDS, omit(l, ['puppies']), path);
      for (const role of ['dam', 'sire']) {
        if (litter[role] && !dogSlugs.has(litter[role])) throw new ContentError(`${path}.${role}`, `no dog with slug "${litter[role]}"`);
      }
      const puppies = list(l.puppies ?? [], `${path}.puppies`).map((p, j) => {
        const pup = cleanRecord(PUPPY_FIELDS, p, `${path}.puppies[${j}]`);
        photo(pup.photo_id, `${path}.puppies[${j}].photo_id`);
        return pup;
      });
      uniqueSlugs(puppies, `${path}.puppies`);
      return { ...litter, puppies };
    });
    uniqueSlugs(out.litters, 'litters');
  }

  if ('reviews' in doc) {
    out.reviews = list(doc.reviews, 'reviews').map((r, i) => {
      const rev = cleanRecord(REVIEW_FIELDS, r, `reviews[${i}]`);
      photo(rev.photo_id, `reviews[${i}].photo_id`);
      return rev;
    });
  }
  if ('steps' in doc) out.steps = list(doc.steps, 'steps').map((s, i) => cleanRecord(STEP_FIELDS, s, `steps[${i}]`));
  if ('expanders' in doc) {
    if (!doc.expanders || typeof doc.expanders !== 'object') throw new ContentError('expanders', 'must be an object');
    out.expanders = {};
    for (const [page, rows] of Object.entries(doc.expanders)) {
      if (!EXPANDER_PAGES.includes(page)) throw new ContentError(`expanders.${page}`, `not one of ${EXPANDER_PAGES.join(', ')}`);
      out.expanders[page] = list(rows, `expanders.${page}`).map((e, i) => cleanRecord(EXPANDER_FIELDS, e, `expanders.${page}[${i}]`));
    }
  }
  if ('extras' in doc) {
    out.extras = list(doc.extras, 'extras').map((x, i) => {
      const extra = cleanRecord(EXTRA_FIELDS, x, `extras[${i}]`);
      photo(extra.photo_id, `extras[${i}].photo_id`);
      if (extra.price_to !== null && extra.price_from !== null && extra.price_to < extra.price_from) throw new ContentError(`extras[${i}].price_to`, 'lower than price_from');
      return extra;
    });
  }
  if ('payment' in doc) {
    if (!doc.payment || typeof doc.payment !== 'object' || Array.isArray(doc.payment)) throw new ContentError('payment', 'must be an object');
    out.payment = {};
    for (const [kind, v] of Object.entries(doc.payment)) {
      if (kind !== 'safe_notice' && !PAYMENT_KINDS.includes(kind)) throw new ContentError(`payment.${kind}`, `not a kind (${[...PAYMENT_KINDS, 'safe_notice'].join(', ')})`);
      out.payment[kind] = cleanRecord(kind === 'safe_notice' ? SAFE_NOTICE_FIELDS : PAYMENT_FIELDS, v, `payment.${kind}`);
    }
  }
  return out;
}

// ---------- writing ----------

function upsert(db, table, conflict, row, keepOnUpdate = ['id', 'created_at']) {
  const cols = Object.keys(row);
  const updates = cols.filter((c) => !keepOnUpdate.includes(c) && !conflict.includes(c));
  return db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
    ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${updates.map((c) => `${c} = excluded.${c}`).join(', ')}`).bind(...cols.map((c) => row[c]));
}

function insert(db, table, row) {
  const cols = Object.keys(row);
  return db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map((c) => row[c]));
}

const notIn = (col, values) => (values.length ? ` AND ${col} NOT IN (${values.map(() => '?').join(', ')})` : '');

export async function importContent(env, siteId, doc) {
  const db = env.DB;
  const { results: photos } = await db.prepare('SELECT id FROM photos WHERE site_id = ? AND removed_at IS NULL').bind(siteId).all();
  const { results: existing } = await db.prepare('SELECT slug FROM dogs WHERE site_id = ?').bind(siteId).all();
  const clean = cleanDocument(doc, { photoIds: new Set(photos.map((p) => p.id)), existingDogSlugs: new Set(existing.map((d) => d.slug)) });
  const t = now();
  const s = [];
  const dogId = (slug) => (slug ? db.prepare('SELECT id FROM dogs WHERE site_id = ? AND slug = ?').bind(siteId, slug) : null);

  if (clean.site) {
    for (const k of ['dark_mode', 'show_other_prices']) if (clean.site[k] === null) delete clean.site[k];
    const cols = Object.keys(clean.site);
    if (cols.length) s.push(db.prepare(`UPDATE sites SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).bind(...cols.map((c) => clean.site[c]), siteId));
  }
  for (const [page, v] of Object.entries(clean.pages ?? {})) {
    s.push(upsert(db, 'site_pages', ['site_id', 'page'], { site_id: siteId, page, enabled: v.enabled, menu_label: v.menu_label, content: JSON.stringify(v.content) }));
  }
  for (const [block, v] of Object.entries(clean.home ?? {})) {
    s.push(upsert(db, 'home_blocks', ['site_id', 'block'], { site_id: siteId, block, enabled: v.enabled, content: JSON.stringify(v.content) }));
  }

  if (clean.dogs) {
    clean.dogs.forEach((d, i) => {
      const { health, ...dog } = d;
      s.push(upsert(db, 'dogs', ['site_id', 'slug'], {
        id: uuid(), site_id: siteId, ...dog, status: dog.status ?? 'active', health_display: dog.health_display ?? 'normal_only',
        show_on_site: dog.show_on_site ?? 1, sort: i, created_at: t, updated_at: t,
      }));
    });
    const slugs = clean.dogs.map((d) => d.slug);
    // Health results: replaced whole for every dog in the import.
    s.push(db.prepare(`DELETE FROM health_results WHERE site_id = ?`).bind(siteId));
    clean.dogs.forEach((d) => d.health.forEach((h, j) => {
      const row = { ...h, normal: h.normal ?? 1, show: h.show ?? 0 };
      const cols = Object.keys(row);
      s.push(db.prepare(`INSERT INTO health_results (id, site_id, dog_id, ${cols.join(', ')}, sort)
          VALUES (?, ?, (SELECT id FROM dogs WHERE site_id = ? AND slug = ?), ${cols.map(() => '?').join(', ')}, ?)`)
        .bind(uuid(), siteId, siteId, d.slug, ...cols.map((c) => row[c]), j));
    }));
    // Dogs no longer in the list: unhook them from litters, then delete.
    const gone = `SELECT id FROM dogs WHERE site_id = ?${notIn('slug', slugs)}`;
    s.push(db.prepare(`UPDATE litters SET dam_id = NULL WHERE site_id = ? AND dam_id IN (${gone})`).bind(siteId, siteId, ...slugs));
    s.push(db.prepare(`UPDATE litters SET sire_id = NULL WHERE site_id = ? AND sire_id IN (${gone})`).bind(siteId, siteId, ...slugs));
    s.push(db.prepare(`DELETE FROM dogs WHERE site_id = ?${notIn('slug', slugs)}`).bind(siteId, ...slugs));
  }

  if (clean.litters) {
    clean.litters.forEach((l, i) => {
      const { puppies, dam, sire, ...litter } = l;
      const row = { id: uuid(), site_id: siteId, ...litter, show_on_site: litter.show_on_site ?? 1, sort: i, created_at: t, updated_at: t };
      const cols = Object.keys(row);
      const updates = cols.filter((c) => !['id', 'created_at', 'site_id', 'slug'].includes(c));
      s.push(db.prepare(`INSERT INTO litters (${cols.join(', ')}, dam_id, sire_id) VALUES (${cols.map(() => '?').join(', ')},
          (SELECT id FROM dogs WHERE site_id = ? AND slug = ?), (SELECT id FROM dogs WHERE site_id = ? AND slug = ?))
        ON CONFLICT (site_id, slug) DO UPDATE SET ${updates.map((c) => `${c} = excluded.${c}`).join(', ')}, dam_id = excluded.dam_id, sire_id = excluded.sire_id`)
        .bind(...cols.map((c) => row[c]), siteId, dam, siteId, sire));
      const litterId = '(SELECT id FROM litters WHERE site_id = ? AND slug = ?)';
      puppies.forEach((p, j) => {
        const prow = { id: uuid(), site_id: siteId, ...p, status: p.status ?? 'coming_soon', sort: j, created_at: t, updated_at: t };
        const pcols = Object.keys(prow);
        const pupd = pcols.filter((c) => !['id', 'created_at', 'site_id', 'slug'].includes(c));
        s.push(db.prepare(`INSERT INTO puppies (${pcols.join(', ')}, litter_id) VALUES (${pcols.map(() => '?').join(', ')}, ${litterId})
          ON CONFLICT (litter_id, slug) DO UPDATE SET ${pupd.map((c) => `${c} = excluded.${c}`).join(', ')}`).bind(...pcols.map((c) => prow[c]), siteId, l.slug));
      });
      const pslugs = puppies.map((p) => p.slug);
      s.push(db.prepare(`DELETE FROM puppies WHERE litter_id = ${litterId}${notIn('slug', pslugs)}`).bind(siteId, l.slug, ...pslugs));
    });
    const slugs = clean.litters.map((l) => l.slug);
    const gone = `SELECT id FROM litters WHERE site_id = ?${notIn('slug', slugs)}`;
    s.push(db.prepare(`DELETE FROM puppies WHERE litter_id IN (${gone})`).bind(siteId, ...slugs));
    s.push(db.prepare(`DELETE FROM litters WHERE site_id = ?${notIn('slug', slugs)}`).bind(siteId, ...slugs));
  }

  if (clean.reviews) {
    s.push(db.prepare("DELETE FROM stories WHERE site_id = ? AND kind = 'review'").bind(siteId));
    clean.reviews.forEach((r, i) => s.push(insert(db, 'stories', {
      id: uuid(), site_id: siteId, kind: 'review', ...r, status: r.status ?? 'approved', submitted_by: 'breeder',
      permission_confirmed_at: t, sort: i, submitted_at: t,
    })));
  }
  if (clean.steps) {
    s.push(db.prepare("DELETE FROM steps WHERE site_id = ? AND page = 'how_it_works'").bind(siteId));
    clean.steps.forEach((st, i) => s.push(insert(db, 'steps', { id: uuid(), site_id: siteId, page: 'how_it_works', ...st, pay_link: st.pay_link ?? 0, sort: i })));
  }
  for (const [page, rows] of Object.entries(clean.expanders ?? {})) {
    s.push(db.prepare('DELETE FROM expanders WHERE site_id = ? AND page = ?').bind(siteId, page));
    rows.forEach((e, i) => s.push(insert(db, 'expanders', { id: uuid(), site_id: siteId, page, ...e, start_open: e.start_open ?? 0, sort: i })));
  }
  for (const [kind, v] of Object.entries(clean.payment ?? {})) {
    const notice = kind === 'safe_notice';
    const content = Object.fromEntries(Object.entries(v).filter(([k, x]) => k !== 'enabled' && k !== 'show_on_site' && x !== null && !(Array.isArray(x) && !x.length)));
    s.push(upsert(db, 'payment_info', ['site_id', 'kind'], { site_id: siteId, kind, show_on_site: (notice ? v.enabled ?? 1 : v.show_on_site) ? 1 : 0, content: JSON.stringify(content) }));
  }
  if (clean.extras) {
    s.push(db.prepare('DELETE FROM extras WHERE site_id = ?').bind(siteId));
    clean.extras.forEach((x, i) => s.push(insert(db, 'extras', {
      id: uuid(), site_id: siteId, ...x, checklist: x.checklist ? JSON.stringify(x.checklist) : null, featured: x.featured ?? 0, sort: i,
    })));
  }

  s.push(db.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, siteId));
  await db.batch(s);
  return { sections: Object.keys(clean) };
}

// ---------- reading back out ----------

const strip = (row, drop) => Object.fromEntries(Object.entries(row).filter(([k, v]) => !drop.includes(k) && v !== null));
const bools = (row, keys) => { for (const k of keys) if (k in row) row[k] = Boolean(row[k]); return row; };
const SYSTEM = ['id', 'site_id', 'sort', 'source', 'kennelos_id', 'hidden_by_kennelos', 'created_at', 'updated_at'];

export async function exportContent(env, siteId) {
  const db = env.DB;
  const site = await db.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
  if (!site) return null;
  const all = async (sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;

  const doc = { site: pick(strip(site, []), Object.keys(SITE_FIELDS)) };
  doc.pages = Object.fromEntries((await all('SELECT * FROM site_pages WHERE site_id = ? ORDER BY page', siteId))
    .map((p) => [p.page, { enabled: Boolean(p.enabled), ...(p.menu_label ? { menu_label: p.menu_label } : {}), ...JSON.parse(p.content) }]));
  doc.home = Object.fromEntries((await all('SELECT * FROM home_blocks WHERE site_id = ?', siteId))
    .map((b) => [b.block, { enabled: Boolean(b.enabled), ...JSON.parse(b.content) }]));

  const dogs = await all('SELECT * FROM dogs WHERE site_id = ? ORDER BY sort, call_name', siteId);
  const health = await all('SELECT * FROM health_results WHERE site_id = ? ORDER BY sort', siteId);
  const slugOf = Object.fromEntries(dogs.map((d) => [d.id, d.slug]));
  doc.dogs = dogs.map((d) => ({
    ...bools(strip(d, [...SYSTEM]), ['show_on_site']),
    health: health.filter((h) => h.dog_id === d.id).map((h) => bools(strip(h, [...SYSTEM, 'dog_id']), ['normal', 'show'])),
  }));

  const litters = await all('SELECT * FROM litters WHERE site_id = ? ORDER BY sort, name', siteId);
  const puppies = await all('SELECT * FROM puppies WHERE site_id = ? ORDER BY sort, name', siteId);
  doc.litters = litters.map((l) => {
    const out = bools(strip(l, [...SYSTEM, 'dam_id', 'sire_id']), ['show_on_site']);
    if (l.dam_id) out.dam = slugOf[l.dam_id];
    if (l.sire_id) out.sire = slugOf[l.sire_id];
    out.puppies = puppies.filter((p) => p.litter_id === l.id).map((p) => strip(p, [...SYSTEM, 'litter_id']));
    return out;
  });

  doc.reviews = (await all("SELECT * FROM stories WHERE site_id = ? AND kind = 'review' ORDER BY sort", siteId))
    .map((r) => pick(strip(r, SYSTEM), Object.keys(REVIEW_FIELDS)));
  doc.steps = (await all("SELECT * FROM steps WHERE site_id = ? AND page = 'how_it_works' ORDER BY sort", siteId))
    .map((st) => bools(pick(strip(st, SYSTEM), Object.keys(STEP_FIELDS)), ['pay_link']));
  const exp = await all('SELECT * FROM expanders WHERE site_id = ? ORDER BY sort', siteId);
  doc.expanders = Object.fromEntries(EXPANDER_PAGES.map((p) => [p, exp.filter((e) => e.page === p)
    .map((e) => bools(pick(strip(e, SYSTEM), Object.keys(EXPANDER_FIELDS)), ['start_open']))]));
  doc.extras = (await all('SELECT * FROM extras WHERE site_id = ? ORDER BY sort', siteId)).map((x) => {
    const out = bools(pick(strip(x, SYSTEM), Object.keys(EXTRA_FIELDS)), ['featured']);
    if (out.checklist) out.checklist = JSON.parse(out.checklist);
    return out;
  });
  const pay = await all('SELECT * FROM payment_info WHERE site_id = ?', siteId);
  if (pay.length) {
    doc.payment = Object.fromEntries(pay.map((p) => [p.kind, p.kind === 'safe_notice'
      ? { enabled: Boolean(p.show_on_site), ...JSON.parse(p.content) }
      : { show_on_site: Boolean(p.show_on_site), ...JSON.parse(p.content) }]));
  }
  return doc;
}
