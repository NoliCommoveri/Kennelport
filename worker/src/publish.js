// Draft → snapshot → live (plan 4.1).
//
// buildSnapshot() reads the draft tables and returns the whole visible site as one
// object: only what visitors may see (plan 3.7: health results ticked Show on
// site, as the dog's setting allows; no hidden puppies or records; approved
// reviews only), and only the content model's fields. Preview renders it as is;
// publish() also writes it to R2 and points the site at it.
//
// publish(): JSON to R2 first, then one D1 batch that adds the snapshot row,
// points the site at it, and records redirects for any address that changed. If
// the R2 write fails nothing in D1 changes, so the old snapshot stays live.
// The last KEEP snapshots are kept; older ones are deleted from D1 and R2.
import { HOME_BLOCK_ORDER, PAGES, PAYMENT_KINDS } from './content/model.js';

export const SNAPSHOT_VERSION = 1;
export const KEEP = 10;
const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;

const json = (text, fallback) => { try { return JSON.parse(text); } catch { return fallback; } };
const keep = (row, drop) => Object.fromEntries(Object.entries(row).filter(([k, v]) => !drop.includes(k) && v !== null));
const SYSTEM = ['site_id', 'sort', 'source', 'kennelos_id', 'hidden_by_kennelos', 'created_at', 'updated_at', 'show_on_site'];

export const snapshotKey = (siteId, snapshotId) => `sites/${siteId}/snapshots/${snapshotId}.json`;

// The address of every record that has one, keyed by record id (for redirects).
export function recordPaths(snap) {
  const paths = {};
  for (const d of snap.dogs) paths[d.id] = `/dogs/${d.slug}`;
  for (const l of snap.litters) {
    paths[l.id] = `/litters/${l.slug}`;
    for (const p of l.puppies) paths[p.id] = `/litters/${l.slug}/${p.slug}`;
  }
  return paths;
}

export async function buildSnapshot(env, siteId) {
  const db = env.DB;
  const all = async (sql) => (await db.prepare(sql).bind(siteId).all()).results;
  const site = await db.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
  if (!site) throw new Error('no such site');

  const pageRows = Object.fromEntries((await all('SELECT * FROM site_pages WHERE site_id = ?')).map((p) => [p.page, p]));
  const pages = {};
  for (const key of Object.keys(PAGES)) {
    const row = pageRows[key];
    pages[key] = { enabled: row ? Boolean(row.enabled) || !PAGES[key].canHide : true, menu_label: row?.menu_label ?? null, ...json(row?.content, {}) };
  }

  const blockRows = Object.fromEntries((await all('SELECT * FROM home_blocks WHERE site_id = ?')).map((b) => [b.block, b]));
  const home = {};
  for (const key of HOME_BLOCK_ORDER) {
    const row = blockRows[key];
    home[key] = { enabled: row ? Boolean(row.enabled) : true, ...json(row?.content, {}) };
  }

  const dogsRaw = await all('SELECT * FROM dogs WHERE site_id = ? AND show_on_site = 1 AND hidden_by_kennelos = 0 ORDER BY sort, call_name');
  const health = await all('SELECT * FROM health_results WHERE site_id = ? AND show = 1 ORDER BY sort');
  const dogs = dogsRaw.map((d) => ({
    ...keep(d, [...SYSTEM, 'health_display']),
    health: d.health_display === 'none' ? []
      : health.filter((h) => h.dog_id === d.id && (d.health_display === 'all' || h.normal))
        .map((h) => keep(h, ['id', 'site_id', 'dog_id', 'show', 'sort', 'source'])),
  }));
  const dogById = Object.fromEntries(dogs.map((d) => [d.id, d]));

  const littersRaw = await all('SELECT * FROM litters WHERE site_id = ? AND show_on_site = 1 AND hidden_by_kennelos = 0 ORDER BY sort, name');
  const puppies = await all("SELECT * FROM puppies WHERE site_id = ? AND status != 'hidden' AND hidden_by_kennelos = 0 ORDER BY sort, name");
  const litters = littersRaw.map((l) => {
    const out = keep(l, SYSTEM);
    // A parent that isn't shown on the site is named, never linked.
    for (const role of ['dam', 'sire']) {
      const id = l[`${role}_id`];
      if (id && !dogById[id]) {
        out[`${role}_name`] = out[`${role}_name`] ?? null;
        delete out[`${role}_id`];
      }
    }
    out.puppies = puppies.filter((p) => p.litter_id === l.id).map((p) => keep(p, [...SYSTEM, 'litter_id']));
    return out;
  });

  const reviews = (await all("SELECT * FROM stories WHERE site_id = ? AND kind = 'review' AND status = 'approved' ORDER BY sort, submitted_at"))
    .map((r) => keep(r, ['site_id', 'kind', 'status', 'submitted_by', 'permission_confirmed_at', 'submitted_at', 'sort']));
  const steps = (await all("SELECT * FROM steps WHERE site_id = ? AND page = 'how_it_works' ORDER BY sort"))
    .map((s) => ({ ...keep(s, ['site_id', 'page', 'sort', 'source']), pay_link: Boolean(s.pay_link) }));
  const expRows = await all('SELECT * FROM expanders WHERE site_id = ? ORDER BY sort');
  const expanders = {};
  for (const e of expRows) (expanders[e.page] ??= []).push({ heading: e.heading, body: e.body, start_open: Boolean(e.start_open) });
  const extras = (await all('SELECT * FROM extras WHERE site_id = ? ORDER BY sort')).map((x) => ({
    ...keep(x, ['site_id', 'sort', 'source']), featured: Boolean(x.featured), checklist: json(x.checklist, []),
  }));

  // How to pay: only cards switched on; the notice is on unless switched off.
  const payRows = Object.fromEntries((await all('SELECT * FROM payment_info WHERE site_id = ?')).map((p) => [p.kind, p]));
  const payment = {};
  for (const kind of PAYMENT_KINDS) {
    const row = payRows[kind];
    const c = row && row.show_on_site ? json(row.content, {}) : null;
    if (c && (c.methods?.length || c.pay_url)) payment[kind] = c;
  }
  const notice = payRows.safe_notice;
  payment.safe_notice = { enabled: notice ? Boolean(notice.show_on_site) : true, text: json(notice?.content, {}).text ?? null };

  // Every photo the visible site uses, and nothing else (plan 4.2).
  const used = new Set();
  const use = (id) => { if (id) used.add(id); };
  dogs.forEach((d) => use(d.photo_id));
  litters.forEach((l) => l.puppies.forEach((p) => use(p.photo_id)));
  reviews.forEach((r) => use(r.photo_id));
  extras.forEach((x) => use(x.photo_id));
  (home.hero.photos ?? []).forEach(use);
  use(home.story.photo_id);
  use(pages.about.photo_id);
  const photoRows = used.size
    ? (await db.prepare(`SELECT * FROM photos WHERE site_id = ? AND removed_at IS NULL AND id IN (${[...used].map(() => '?').join(', ')})`).bind(siteId, ...used).all()).results
    : [];
  const photos = Object.fromEntries(photoRows.map((p) => [p.id, { key: p.r2_key, thumb: p.thumb_key, type: p.type, width: p.width, height: p.height, alt: p.alt ?? '' }]));

  return {
    v: SNAPSHOT_VERSION,
    built_at: new Date().toISOString(),
    site: {
      id: site.id, subdomain: site.subdomain, kennel_name: site.kennel_name ?? site.subdomain, tagline: site.tagline, blurb: site.blurb,
      breed: site.breed, monogram: site.monogram, town: site.town, region: site.region, contact_email: site.contact_email,
      contact_phone: site.contact_phone, facebook_url: site.facebook_url, facebook_label: site.facebook_label,
      instagram_url: site.instagram_url, template: site.template, scheme: site.scheme, dark_mode: site.dark_mode,
      show_other_prices: Boolean(site.show_other_prices),
    },
    pages, home, dogs, litters, reviews, steps, expanders, extras, payment, photos,
  };
}

// Read the snapshot a site points at. Kept in memory per isolate by id, since a
// snapshot never changes once written.
const memory = new Map();
const MEMORY_MAX = 20;

export async function loadSnapshot(env, siteId, snapshotId) {
  if (!snapshotId) return null;
  if (memory.has(snapshotId)) return memory.get(snapshotId);
  const obj = await env.FILES.get(snapshotKey(siteId, snapshotId));
  if (!obj) return null;
  const snap = JSON.parse(new TextDecoder().decode(await obj.arrayBuffer()));
  snap.id = snapshotId;
  if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value);
  memory.set(snapshotId, snap);
  return snap;
}

export function forgetSnapshots() { memory.clear(); }

export async function publish(env, siteId, publishedBy) {
  const db = env.DB;
  const site = await db.prepare('SELECT id, status, published_snapshot_id FROM sites WHERE id = ?').bind(siteId).first();
  if (!site) throw new Error('no such site');
  if (site.status === 'closed') throw new Error('this site is closed');

  const snap = await buildSnapshot(env, siteId);
  const body = JSON.stringify(snap);
  const bytes = new TextEncoder().encode(body).length;
  if (bytes > MAX_SNAPSHOT_BYTES) throw new Error(`the site is too large to publish (${bytes} bytes)`);

  const id = crypto.randomUUID();
  const key = snapshotKey(siteId, id);
  await env.FILES.put(key, body, { httpMetadata: { contentType: 'application/json' } });

  // Redirects: any record whose address changed since the live snapshot.
  const statements = [];
  const t = new Date().toISOString();
  const previous = await loadSnapshot(env, siteId, site.published_snapshot_id);
  const now = recordPaths(snap);
  const livePaths = new Set(Object.values(now));
  if (previous) {
    for (const [recordId, oldPath] of Object.entries(recordPaths(previous))) {
      const newPath = now[recordId];
      if (newPath && newPath !== oldPath) {
        statements.push(db.prepare(`INSERT INTO redirects (site_id, old_path, new_path, created_at) VALUES (?, ?, ?, ?)
          ON CONFLICT (site_id, old_path) DO UPDATE SET new_path = excluded.new_path, created_at = excluded.created_at`).bind(siteId, oldPath, newPath, t));
        // Older redirects to the old address now go straight to the new one.
        statements.push(db.prepare('UPDATE redirects SET new_path = ? WHERE site_id = ? AND new_path = ?').bind(newPath, siteId, oldPath));
      }
    }
  }
  // An address in use again is no longer redirected.
  for (const p of livePaths) statements.push(db.prepare('DELETE FROM redirects WHERE site_id = ? AND old_path = ?').bind(siteId, p));

  statements.push(db.prepare('INSERT INTO snapshots (id, site_id, published_at, published_by, r2_key, bytes) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, siteId, t, publishedBy, key, bytes));
  statements.push(db.prepare("UPDATE sites SET published_snapshot_id = ?, status = CASE WHEN status = 'draft' THEN 'live' ELSE status END WHERE id = ?").bind(id, siteId));
  await db.batch(statements);

  await prune(env, siteId);
  return { id, bytes };
}

async function prune(env, siteId) {
  const { results } = await env.DB.prepare('SELECT id, r2_key FROM snapshots WHERE site_id = ? ORDER BY published_at DESC, rowid DESC').bind(siteId).all();
  const old = results.slice(KEEP);
  if (!old.length) return;
  await env.DB.batch(old.map((s) => env.DB.prepare('DELETE FROM snapshots WHERE id = ?').bind(s.id)));
  await env.FILES.delete(old.map((s) => s.r2_key));
}

// Undo publish: point the site back at the snapshot before the live one, and
// drop the live one, so pressing it again steps back further.
export async function undoPublish(env, siteId) {
  const db = env.DB;
  const site = await db.prepare('SELECT published_snapshot_id FROM sites WHERE id = ?').bind(siteId).first();
  const { results } = await db.prepare('SELECT id, r2_key FROM snapshots WHERE site_id = ? ORDER BY published_at DESC, rowid DESC').bind(siteId).all();
  const liveIndex = results.findIndex((s) => s.id === site?.published_snapshot_id);
  const target = results[liveIndex + 1];
  if (liveIndex < 0 || !target) throw new Error('there is no earlier version to go back to');
  const live = results[liveIndex];
  await db.batch([
    db.prepare('UPDATE sites SET published_snapshot_id = ? WHERE id = ?').bind(target.id, siteId),
    db.prepare('DELETE FROM snapshots WHERE id = ?').bind(live.id),
  ]);
  await env.FILES.delete(live.r2_key);
  memory.delete(live.id);
  return { id: target.id };
}

export async function listSnapshots(env, siteId) {
  return (await env.DB.prepare('SELECT id, published_at, published_by, bytes FROM snapshots WHERE site_id = ? ORDER BY published_at DESC, rowid DESC').bind(siteId).all()).results;
}
