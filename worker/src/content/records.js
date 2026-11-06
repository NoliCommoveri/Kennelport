// One record at a time: what the manage app's forms save (phase 2). Built on the
// content model (model.js), like the whole-document import (io.js), so the two
// can't disagree about what a field may hold. Every write marks the draft as
// changed; nothing is live until Publish.
import {
  DOG_FIELDS, HEALTH_FIELDS, LITTER_FIELDS, PUPPY_FIELDS, REVIEW_FIELDS, STEP_FIELDS, EXPANDER_FIELDS, FAQ_FIELDS, EXTRA_FIELDS, PRODUCT_FIELDS, PARTNER_FIELDS, PARTNERS_PER_DOG, PARTNERS_MAX, HOME_BADGES_MAX, BADGE_PLACES, FAQ_PLACES, brandImageOk,
  EXPANDER_PAGES, SITE_FIELDS, PAGES, HOME_BLOCKS, PAYMENT_KINDS, PAYMENT_FIELDS, SAFE_NOTICE_FIELDS, QUESTION_FIELDS, checkQuestion, ALBUM_FIELDS, ContentError, cleanRecord, cleanValue, slugify,
  CUSTOM_KEY, CUSTOM_PAGE, ADDED_BLOCK_FIELDS,
} from './model.js';
import { untagStatements } from '../photoTags.js';
import { chunks, placeholders } from '../lib/sql.js';
import { litterClockStatements } from '../kennelos/clock.js';

const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

// Litters name their parents by dog id here (the import uses slugs).
const LITTER_RECORD_FIELDS = { ...omit(LITTER_FIELDS, ['dam', 'sire']), dam_id: { type: 'dogid' }, sire_id: { type: 'dogid' } };
// Co-owned dogs name their partner kennels by id here (the import uses names).
const DOG_RECORD_FIELDS = {
  ...omit(DOG_FIELDS, ['lives_with', 'co_owned_with']),
  lives_with_kennel_id: { type: 'kennelid' },
  co_owned_with_ids: { type: 'list', item: 'kennel', max: PARTNERS_PER_DOG },
};
// Albums name their litter by id here (the import uses its slug).
const ALBUM_RECORD_FIELDS = { ...omit(ALBUM_FIELDS, ['litter']), litter_id: { type: 'litterid' } };

// kind → where it lives and what it holds. `scope` is the parent column, if any.
export const KINDS = {
  dogs: { table: 'dogs', fields: DOG_RECORD_FIELDS, slug: 'call_name', label: 'call_name', defaults: { status: 'active', health_display: 'normal_only', show_on_site: 1, upcoming: 0, for_sale: 0, co_owned: 0, lives_away: 0 }, json: ['co_owned_with_ids'], stamps: true },
  health: { table: 'health_results', fields: HEALTH_FIELDS, scope: 'dog_id', label: 'test', defaults: { normal: 1, show: 0 } },
  litters: { table: 'litters', fields: LITTER_RECORD_FIELDS, slug: 'name', label: 'name', defaults: { show_on_site: 1, show_prices: 0, show_placed: 1, ask_full_reg: 0 }, stamps: true },
  puppies: { table: 'puppies', fields: PUPPY_FIELDS, scope: 'litter_id', slug: 'name', label: 'name', defaults: { status: 'coming_soon' }, stamps: true },
  reviews: { table: 'stories', fields: omit(REVIEW_FIELDS, []), label: 'first_name', where: "kind = 'review'", fixed: { kind: 'review', submitted_by: 'breeder' }, defaults: { status: 'approved' } },
  steps: { table: 'steps', fields: STEP_FIELDS, label: 'heading', where: "page = 'how_it_works'", fixed: { page: 'how_it_works' }, defaults: { pay_link: 0 } },
  extras: { table: 'extras', fields: EXTRA_FIELDS, label: 'name', defaults: { featured: 0 }, json: ['checklist'] },
  products: { table: 'products', fields: PRODUCT_FIELDS, label: 'name', defaults: { home_badge: 0, transport: 0 }, json: ['badge_places'] },
  partners: { table: 'partner_kennels', fields: PARTNER_FIELDS, label: 'name', created: true },
  albums: { table: 'albums', fields: ALBUM_RECORD_FIELDS, slug: 'title', label: 'title', defaults: { show_on_site: 1 }, json: ['photos'], stamps: true },
  questions: { table: 'form_fields', fields: QUESTION_FIELDS, label: 'label', where: "form = 'application'", fixed: { form: 'application' }, defaults: { required: 0 }, json: ['options'] },
};
for (const page of EXPANDER_PAGES) {
  // Only the FAQ carries places: a question can be shown again elsewhere on the
  // site (model.js FAQ_PLACES), which Policies and the status-page help don't do.
  KINDS[page] = { table: 'expanders', fields: page === 'faq' ? FAQ_FIELDS : EXPANDER_FIELDS, label: 'heading', where: `page = '${page}'`, fixed: { page }, defaults: { start_open: 0 }, ...(page === 'faq' ? { json: ['places'] } : {}) };
}

const now = () => new Date().toISOString();
// Every write marks the draft changed; one that touches a litter keeps its
// 30-day clock true too (kennelos/clock.js).
const touch = (env, siteId) => env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(now(), siteId);
const touchAll = (env, siteId, kind) => [touch(env, siteId), ...(kind === 'litters' ? litterClockStatements(env, siteId) : [])];

function kindOf(kind) {
  const k = KINDS[kind];
  if (!k) throw new Error(`unknown kind ${kind}`);
  return k;
}

function whereClause(k, scopeId) {
  const parts = ['site_id = ?'];
  const args = [];
  if (k.where) parts.push(k.where);
  if (k.scope) { parts.push(`${k.scope} = ?`); args.push(scopeId); }
  return { sql: parts.join(' AND '), args };
}

function decode(k, row) {
  if (!row) return null;
  const out = { ...row };
  for (const c of k.json ?? []) out[c] = out[c] ? JSON.parse(out[c]) : [];
  return out;
}

export async function listRecords(env, siteId, kind, scopeId = null) {
  const k = kindOf(kind);
  const w = whereClause(k, scopeId);
  const { results } = await env.DB.prepare(`SELECT * FROM ${k.table} WHERE ${w.sql} ORDER BY sort, rowid`).bind(siteId, ...w.args).all();
  return results.map((r) => decode(k, r));
}

export async function getRecord(env, siteId, kind, id) {
  const k = kindOf(kind);
  const row = await env.DB.prepare(`SELECT * FROM ${k.table} WHERE id = ? AND site_id = ?${k.where ? ` AND ${k.where}` : ''}`).bind(id, siteId).first();
  return decode(k, row);
}

async function uniqueSlug(env, k, siteId, scopeId, wanted, exceptId) {
  const base = slugify(wanted) || 'item';
  const scopeSql = k.scope ? ` AND ${k.scope} = ?` : '';
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base.slice(0, 56)}-${n}`;
    const clash = await env.DB.prepare(`SELECT id FROM ${k.table} WHERE site_id = ? AND slug = ?${scopeSql}`).bind(siteId, slug, ...(k.scope ? [scopeId] : [])).first();
    if (!clash || clash.id === exceptId) return slug;
  }
  throw new ContentError('slug', 'could not find a free web address');
}

// Check references a record makes: photos on this site, parents that are this
// site's dogs.
async function checkRefs(env, siteId, k, clean) {
  for (const [name, f] of Object.entries(k.fields)) {
    const v = clean[name];
    if (!v) continue;
    if (f.type === 'photo') {
      const ok = await env.DB.prepare('SELECT 1 FROM photos WHERE id = ? AND site_id = ? AND removed_at IS NULL').bind(v, siteId).first();
      if (!ok) throw new ContentError(name, 'that photo is no longer on this site');
    }
    if (f.type === 'list' && f.item === 'photo' && v.length) {
      const unique = [...new Set(v)];
      let found = 0;
      for (const part of chunks(unique)) {
        found += (await env.DB.prepare(`SELECT id FROM photos WHERE site_id = ? AND removed_at IS NULL AND id IN (${placeholders(part)})`).bind(siteId, ...part).all()).results.length;
      }
      if (found !== unique.length) throw new ContentError(name, 'a chosen photo is no longer on this site');
    }
    if (f.type === 'litterid') {
      const ok = await env.DB.prepare('SELECT 1 FROM litters WHERE id = ? AND site_id = ?').bind(v, siteId).first();
      if (!ok) throw new ContentError(name, 'that litter is no longer on this site');
    }
    if (f.type === 'dogid') {
      const ok = await env.DB.prepare('SELECT 1 FROM dogs WHERE id = ? AND site_id = ?').bind(v, siteId).first();
      if (!ok) throw new ContentError(name, 'that dog is no longer on this site');
    }
    if (f.type === 'kennelid' || (f.type === 'list' && f.item === 'kennel' && v.length)) {
      const ids = [...new Set(f.type === 'kennelid' ? [v] : v)];
      const found = (await env.DB.prepare(`SELECT id FROM partner_kennels WHERE site_id = ? AND id IN (${placeholders(ids)})`).bind(siteId, ...ids).all()).results.length;
      if (found !== ids.length) throw new ContentError(name, 'that kennel is no longer on your list');
    }
  }
}

// Fields the record model knows that cleanValue doesn't: a parent dog by id.
function cleanFields(fields, input, path) {
  const plain = Object.fromEntries(Object.entries(fields).map(([n, f]) => [n, ['dogid', 'litterid', 'kennelid'].includes(f.type) ? { type: 'photo' }
    : f.type === 'list' && f.item === 'kennel' ? { type: 'list', max: f.max, itemMax: 80 } : f]));
  const out = cleanRecord(plain, input, path);
  return out;
}

// Create (id null) or update. `input` holds every field of the kind (a form
// sends them all). Returns the saved record.
export async function saveRecord(env, siteId, kind, id, input, scopeId = null) {
  const k = kindOf(kind);
  const existing = id ? await getRecord(env, siteId, kind, id) : null;
  if (id && !existing) throw new ContentError(kind, 'no longer exists');
  if (k.slug && !input.slug) input = { ...input, slug: await uniqueSlug(env, k, siteId, scopeId, input[k.slug] ?? '', id) };
  else if (k.slug) {
    const clash = await env.DB.prepare(`SELECT id FROM ${k.table} WHERE site_id = ? AND slug = ?${k.scope ? ` AND ${k.scope} = ?` : ''}`).bind(siteId, input.slug, ...(k.scope ? [scopeId] : [])).first();
    if (clash && clash.id !== id) throw new ContentError('slug', `"${input.slug}" is already used`);
  }
  const clean = cleanFields(k.fields, input, kind);
  if (kind === 'extras' && clean.price_to !== null && clean.price_from !== null && clean.price_to < clean.price_from) throw new ContentError('price_to', 'lower than the starting price');
  if (kind === 'questions') checkQuestion(clean, 'question');
  if (kind === 'products' && clean.image_url && !brandImageOk(clean.image_url)) throw new ContentError('image_url', "that picture's address isn't one your site can show from; choose a photo instead");
  if (kind === 'products' && clean.home_badge) {
    if (!clean.photo_id && !clean.image_url) throw new ContentError('home_badge', 'a home page badge needs a picture: choose one, or paste the embed code');
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE site_id = ? AND home_badge = 1 AND id != ?').bind(siteId, id ?? '').first('n');
    if (n >= HOME_BADGES_MAX) throw new ContentError('home_badge', `the home page shows at most ${HOME_BADGES_MAX} badges: turn one off first`);
  }
  if (kind === 'products' && clean.badge_places?.length) {
    // Badges on other pages (model.js BADGE_PLACES): a picture, and at most
    // HOME_BADGES_MAX per page, as on Home.
    if (!clean.photo_id && !clean.image_url) throw new ContentError('badge_places', 'a badge needs a picture: choose one, or paste the embed code');
    const others = (await env.DB.prepare('SELECT badge_places FROM products WHERE site_id = ? AND id != ? AND badge_places IS NOT NULL').bind(siteId, id ?? '').all()).results;
    for (const place of clean.badge_places) {
      const n = others.filter((r) => { try { return JSON.parse(r.badge_places).includes(place); } catch { return false; } }).length;
      if (n >= HOME_BADGES_MAX) {
        // The page by today's words, or its name (a page the owner added).
        const custom = CUSTOM_KEY.test(place) ? (await env.DB.prepare('SELECT build FROM site_builds WHERE site_id = ?').bind(siteId).first('build')) : null;
        let name = null;
        try { name = custom ? JSON.parse(custom).custom?.find((c) => c.id === place)?.name : null; } catch { /* below */ }
        const words = BADGE_PLACES[place] ?? FAQ_PLACES[place] ?? (PAGES[place] ? `${PAGES[place].label} page` : `${name ?? 'new'} page`);
        throw new ContentError('badge_places', `the ${words} shows at most ${HOME_BADGES_MAX} badges: take one off it first`);
      }
    }
  }
  if (kind === 'albums' && clean.photos) clean.photos = [...new Set(clean.photos)];
  if (kind === 'dogs') coOwnedRules(clean);
  if (kind === 'partners') {
    const twin = await env.DB.prepare('SELECT id FROM partner_kennels WHERE site_id = ? AND lower(name) = lower(?) AND id != ?').bind(siteId, clean.name, id ?? '').first();
    if (twin) throw new ContentError('name', 'that kennel is already on your list');
    if (!existing && await env.DB.prepare('SELECT COUNT(*) AS n FROM partner_kennels WHERE site_id = ?').bind(siteId).first('n') >= PARTNERS_MAX) throw new ContentError('partners', `at most ${PARTNERS_MAX} partner kennels`);
  }
  if (kind === 'albums' && !existing) {
    const lim = await env.DB.prepare('SELECT album_limit FROM sites WHERE id = ?').bind(siteId).first('album_limit');
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM albums WHERE site_id = ?').bind(siteId).first('n');
    if (lim && n >= lim) throw new ContentError('albums', `this site has reached its limit of ${lim} albums`);
  }
  await checkRefs(env, siteId, k, clean);
  for (const [c, v] of Object.entries(k.defaults ?? {})) if (clean[c] === null) clean[c] = v;
  for (const c of k.json ?? []) clean[c] = clean[c]?.length ? JSON.stringify(clean[c]) : null;

  const t = now();
  if (existing) {
    const cols = Object.keys(clean);
    if (k.stamps) { cols.push('updated_at'); clean.updated_at = t; }
    await env.DB.batch([
      env.DB.prepare(`UPDATE ${k.table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND site_id = ?`).bind(...cols.map((c) => clean[c]), id, siteId),
      ...touchAll(env, siteId, kind),
    ]);
    return getRecord(env, siteId, kind, id);
  }
  const w = whereClause(k, scopeId);
  // Albums read newest first (0019), so a new one goes above the rest; everything
  // else is added at the end. Her up/down arrows renumber the list either way.
  const newestFirst = k.table === 'albums';
  const edge = await env.DB.prepare(`SELECT COALESCE(${newestFirst ? 'MIN' : 'MAX'}(sort), ${newestFirst ? 1 : -1}) AS s FROM ${k.table} WHERE ${w.sql}`).bind(siteId, ...w.args).first('s');
  const row = { id: crypto.randomUUID(), site_id: siteId, ...(k.fixed ?? {}), ...clean, sort: newestFirst ? edge - 1 : edge + 1 };
  if (k.scope) row[k.scope] = scopeId;
  if (k.stamps) { row.created_at = t; row.updated_at = t; }
  if (k.created) row.created_at = t;
  if (k.table === 'stories') { row.submitted_at = t; row.permission_confirmed_at = t; }
  const cols = Object.keys(row);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO ${k.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map((c) => row[c])),
    ...touchAll(env, siteId, kind),
  ]);
  return getRecord(env, siteId, kind, row.id);
}

// A co-owned dog's fields agree with each other: only a co-owned dog lives away
// or has partner kennels, only one living away lives with a kennel, and the
// kennel it lives with is one of its co-owners'. KennelOS's bundle keeps the same
// rules on its side (siteExport.js).
export function coOwnedRules(d) {
  if (!d.co_owned) { d.lives_away = 0; d.lives_with_kennel_id = null; d.co_owned_with_ids = []; return d; }
  if (!d.lives_away) d.lives_with_kennel_id = null;
  d.co_owned_with_ids = [...new Set(d.co_owned_with_ids ?? [])];
  if (d.lives_with_kennel_id && !d.co_owned_with_ids.includes(d.lives_with_kennel_id)) d.co_owned_with_ids.unshift(d.lives_with_kennel_id);
  d.co_owned_with_ids = d.co_owned_with_ids.slice(0, PARTNERS_PER_DOG);
  return d;
}

// Quick changes that aren't a whole form: a puppy's status from the list.
export async function setField(env, siteId, kind, id, field, value) {
  const k = kindOf(kind);
  const f = k.fields[field];
  if (!f) throw new ContentError(field, 'not a known field');
  const v = cleanValue(f, value, field);
  const res = await env.DB.prepare(`UPDATE ${k.table} SET ${field} = ?${k.stamps ? ', updated_at = ?' : ''} WHERE id = ? AND site_id = ?`)
    .bind(v, ...(k.stamps ? [now()] : []), id, siteId).run();
  if (!res.meta.changes) throw new ContentError(kind, 'no longer exists');
  await env.DB.batch(touchAll(env, siteId, kind));
}

export async function removeRecord(env, siteId, kind, id) {
  const k = kindOf(kind);
  const s = untagStatements(env, siteId, kind, id);
  if (kind === 'dogs') {
    s.push(env.DB.prepare('UPDATE litters SET dam_id = NULL WHERE site_id = ? AND dam_id = ?').bind(siteId, id));
    s.push(env.DB.prepare('UPDATE litters SET sire_id = NULL WHERE site_id = ? AND sire_id = ?').bind(siteId, id));
    s.push(env.DB.prepare('DELETE FROM health_results WHERE site_id = ? AND dog_id = ?').bind(siteId, id));
  }
  if (kind === 'partners') s.push(...await unlinkPartnerStatements(env, siteId, id));
  if (kind === 'litters') s.push(env.DB.prepare('DELETE FROM puppies WHERE site_id = ? AND litter_id = ?').bind(siteId, id));
  if (kind === 'litters') s.push(env.DB.prepare('UPDATE albums SET litter_id = NULL WHERE site_id = ? AND litter_id = ?').bind(siteId, id));
  // Videos and posts on a removed dog, litter or album go with it.
  const place = { dogs: 'dog', litters: 'litter', albums: 'album' }[kind];
  if (place) s.push(env.DB.prepare('DELETE FROM embeds WHERE site_id = ? AND place = ?').bind(siteId, `${place}:${id}`));
  s.push(env.DB.prepare(`DELETE FROM ${k.table} WHERE id = ? AND site_id = ?${k.where ? ` AND ${k.where}` : ''}`).bind(id, siteId));
  s.push(touch(env, siteId));
  await env.DB.batch(s);
}

// A partner kennel's dogs, as it goes: it leaves their co-owners' kennels, and the
// one living there still lives away, with no kennel named.
export async function unlinkPartnerStatements(env, siteId, partnerId) {
  const { results } = await env.DB.prepare("SELECT id, lives_with_kennel_id, co_owned_with_ids FROM dogs WHERE site_id = ? AND (lives_with_kennel_id = ? OR co_owned_with_ids LIKE ?)")
    .bind(siteId, partnerId, `%${partnerId}%`).all();
  return results.map((d) => {
    const ids = (d.co_owned_with_ids ? JSON.parse(d.co_owned_with_ids) : []).filter((x) => x !== partnerId);
    return env.DB.prepare('UPDATE dogs SET lives_with_kennel_id = ?, co_owned_with_ids = ?, updated_at = ? WHERE id = ? AND site_id = ?')
      .bind(d.lives_with_kennel_id === partnerId ? null : d.lives_with_kennel_id, ids.length ? JSON.stringify(ids) : null, now(), d.id, siteId);
  });
}

// Move one place up (-1) or down (+1) in its list.
export async function moveRecord(env, siteId, kind, id, dir, scopeId = null) {
  const list = await listRecords(env, siteId, kind, scopeId);
  const i = list.findIndex((r) => r.id === id);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const k = kindOf(kind);
  await env.DB.batch([...list.map((r, n) => env.DB.prepare(`UPDATE ${k.table} SET sort = ? WHERE id = ?`).bind(n, r.id)), touch(env, siteId)]);
}

// ---------- the kennel's details, a page's wording, a Home block ----------

export async function saveSite(env, siteId, input) {
  const clean = cleanRecord(SITE_FIELDS, input, 'site');
  await checkRefs(env, siteId, { fields: SITE_FIELDS }, clean);
  for (const c of ['dark_mode']) if (clean[c] === null) clean[c] = 'auto';
  if (clean.show_other_prices === null) clean.show_other_prices = 0;
  // A form without the scheme picker leaves the scheme as it is.
  if (clean.scheme === null) delete clean.scheme;
  const cols = Object.keys(clean);
  await env.DB.batch([
    env.DB.prepare(`UPDATE sites SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).bind(...cols.map((c) => clean[c]), siteId),
    touch(env, siteId),
  ]);
}

export async function getPage(env, siteId, key) {
  const row = await env.DB.prepare('SELECT * FROM site_pages WHERE site_id = ? AND page = ?').bind(siteId, key).first();
  return { enabled: row ? Boolean(row.enabled) : true, menu_label: row?.menu_label ?? null, ...(row ? JSON.parse(row.content) : {}) };
}

export async function savePage(env, siteId, key, input) {
  // A page the owner added (x-…): its switch, menu name and heading.
  const page = PAGES[key] ?? (CUSTOM_KEY.test(key) ? CUSTOM_PAGE : null);
  if (!page) throw new ContentError(key, 'not a page');
  const enabled = page.canHide ? (input.enabled ? 1 : 0) : 1;
  const menu_label = cleanValue({ type: 'text', max: 40 }, input.menu_label, 'menu_label');
  const content = cleanRecord(page.fields, omit(input, ['enabled', 'menu_label']), key);
  await checkRefs(env, siteId, { fields: page.fields }, content);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO site_pages (site_id, page, enabled, menu_label, content) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (site_id, page) DO UPDATE SET enabled = excluded.enabled, menu_label = excluded.menu_label, content = excluded.content`)
      .bind(siteId, key, enabled, menu_label, JSON.stringify(stripNulls(content))),
    touch(env, siteId),
  ]);
}

// A block the owner added to a page: the breeder's switch and words for it.
export async function getAddedBlock(env, siteId, page, block) {
  const row = await env.DB.prepare('SELECT * FROM block_switches WHERE site_id = ? AND page = ? AND block = ?').bind(siteId, page, block).first();
  return { enabled: row ? Boolean(row.enabled) : true, ...(row ? JSON.parse(row.content) : {}) };
}

export async function saveAddedBlock(env, siteId, page, block, input) {
  const content = cleanRecord(ADDED_BLOCK_FIELDS, omit(input, ['enabled']), `${page}.${block}`);
  // A phone number for a button has to look like one (decision 16).
  if (content.phone && !/^[+()\d][\d\s().-]{5,24}$/.test(content.phone)) throw new ContentError(`${page}.${block}.phone`, 'not a phone number');
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO block_switches (site_id, page, block, enabled, content) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (site_id, page, block) DO UPDATE SET enabled = excluded.enabled, content = excluded.content`)
      .bind(siteId, page, block, input.enabled ? 1 : 0, JSON.stringify(stripNulls(content))),
    touch(env, siteId),
  ]);
}

export async function getBlock(env, siteId, key) {
  const row = await env.DB.prepare('SELECT * FROM home_blocks WHERE site_id = ? AND block = ?').bind(siteId, key).first();
  return { enabled: row ? Boolean(row.enabled) : true, ...(row ? JSON.parse(row.content) : {}) };
}

export async function saveBlock(env, siteId, key, input) {
  const fields = HOME_BLOCKS[key];
  if (!fields) throw new ContentError(key, 'not a Home block');
  const content = cleanRecord(fields, omit(input, ['enabled']), key);
  for (const id of content.photos ?? []) {
    const ok = await env.DB.prepare('SELECT 1 FROM photos WHERE id = ? AND site_id = ? AND removed_at IS NULL').bind(id, siteId).first();
    if (!ok) throw new ContentError('photos', 'a chosen photo is no longer on this site');
  }
  await checkRefs(env, siteId, { fields }, content);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO home_blocks (site_id, block, enabled, content) VALUES (?, ?, ?, ?)
      ON CONFLICT (site_id, block) DO UPDATE SET enabled = excluded.enabled, content = excluded.content`)
      .bind(siteId, key, input.enabled ? 1 : 0, JSON.stringify(stripNulls(content))),
    touch(env, siteId),
  ]);
}

const stripNulls = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && !(Array.isArray(v) && !v.length)));

// ---------- how to pay, and the safe-payment notice (plan 3.9) ----------

export async function getPayment(env, siteId, kind) {
  const row = await env.DB.prepare('SELECT * FROM payment_info WHERE site_id = ? AND kind = ?').bind(siteId, kind).first();
  const content = row ? JSON.parse(row.content) : {};
  if (kind === 'safe_notice') return { enabled: row ? Boolean(row.show_on_site) : true, ...content };
  return { show_on_site: Boolean(row?.show_on_site), ...content, source: row?.source ?? 'kennelport' };
}

export async function savePayment(env, siteId, kind, input) {
  const notice = kind === 'safe_notice';
  if (!notice && !PAYMENT_KINDS.includes(kind)) throw new ContentError(kind, 'not a kind of payment');
  const fields = notice ? SAFE_NOTICE_FIELDS : PAYMENT_FIELDS;
  const clean = cleanRecord(fields, omit(input, ['source']), kind);
  const on = notice ? clean.enabled : clean.show_on_site;
  const content = stripNulls(omit(clean, ['enabled', 'show_on_site']));
  if (!notice && on && !content.methods?.length && !content.pay_url) throw new ContentError('methods', 'add at least one way to pay, or a payment page link, before showing it');
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO payment_info (site_id, kind, show_on_site, content) VALUES (?, ?, ?, ?)
      ON CONFLICT (site_id, kind) DO UPDATE SET show_on_site = excluded.show_on_site, content = excluded.content`)
      .bind(siteId, kind, on ? 1 : 0, JSON.stringify(content)),
    touch(env, siteId),
  ]);
}
