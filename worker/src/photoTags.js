import { chunks, placeholders } from './lib/sql.js';
// What each photo is of (migration 0005), so pickers can offer a dog's own photos
// first. A subject is "dog:<id>", "litter:<id>", "puppy:<id>", "extra:<id>",
// "product:<id>", "page:home" or "page:about". Tags are for the breeder only: nothing here is
// published, and changing them doesn't mark the draft as changed.

const PAGE_SUBJECTS = { 'page:home': 'Home page', 'page:about': 'Our story', 'page:logo': 'Your logo' };

// Every subject on the site that a photo can be of, with the name the breeder
// sees, in the order the Photos screen lists them.
export async function subjects(env, siteId) {
  const all = (sql) => env.DB.prepare(sql).bind(siteId).all().then((r) => r.results);
  const [dogs, litters, puppies, extras, products] = await Promise.all([
    all('SELECT id, call_name FROM dogs WHERE site_id = ? ORDER BY sort, rowid'),
    all('SELECT id, name FROM litters WHERE site_id = ? ORDER BY sort, rowid'),
    all('SELECT p.id, p.name, l.name AS litter FROM puppies p JOIN litters l ON l.id = p.litter_id WHERE p.site_id = ? ORDER BY l.sort, l.rowid, p.sort, p.rowid'),
    all('SELECT id, name FROM extras WHERE site_id = ? ORDER BY sort, rowid'),
    all('SELECT id, name FROM products WHERE site_id = ? ORDER BY sort, rowid'),
  ]);
  return [
    ...Object.entries(PAGE_SUBJECTS).map(([subject, label]) => ({ subject, label, group: 'Pages' })),
    ...dogs.map((d) => ({ subject: `dog:${d.id}`, label: d.call_name, group: 'Dogs' })),
    ...litters.map((l) => ({ subject: `litter:${l.id}`, label: l.name, group: 'Litters' })),
    ...puppies.map((p) => ({ subject: `puppy:${p.id}`, label: `${p.name} (${p.litter})`, group: 'Puppies' })),
    ...extras.map((x) => ({ subject: `extra:${x.id}`, label: x.name, group: 'Extras' })),
    ...products.map((x) => ({ subject: `product:${x.id}`, label: x.name, group: 'Recommended products' })),
  ];
}

// Is this subject one of this site's? Anything else is ignored, never stored.
export async function isSubject(env, siteId, subject) {
  if (PAGE_SUBJECTS[subject]) return true;
  const m = /^(dog|litter|puppy|extra|product):([0-9a-f-]{36})$/.exec(String(subject ?? ''));
  if (!m) return false;
  const table = { dog: 'dogs', litter: 'litters', puppy: 'puppies', extra: 'extras', product: 'products' }[m[1]];
  return Boolean(await env.DB.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND site_id = ?`).bind(m[2], siteId).first());
}

// Tag these photos (this site's, not removed) with these subjects. Unknown
// subjects and photos are skipped; tagging twice is harmless.
export async function tagPhotos(env, siteId, photoIds, subjectList) {
  const ids = [...new Set(photoIds.map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x)))];
  const subs = [];
  for (const s of new Set(subjectList.map(String))) if (await isSubject(env, siteId, s)) subs.push(s);
  if (!ids.length || !subs.length) return;
  const results = [];
  for (const part of chunks(ids)) {
    results.push(...(await env.DB.prepare(`SELECT id FROM photos WHERE site_id = ? AND removed_at IS NULL AND id IN (${placeholders(part)})`).bind(siteId, ...part).all()).results);
  }
  const stmts = results.flatMap((p) => subs.map((s) => env.DB.prepare('INSERT OR IGNORE INTO photo_tags (site_id, photo_id, subject) VALUES (?, ?, ?)').bind(siteId, p.id, s)));
  if (stmts.length) await env.DB.batch(stmts);
}

export async function untagPhoto(env, siteId, photoId, subject) {
  await env.DB.prepare('DELETE FROM photo_tags WHERE site_id = ? AND photo_id = ? AND subject = ?').bind(siteId, photoId, subject).run();
}

// A record is gone: its tags go too (a litter takes its puppies' with it).
export function untagStatements(env, siteId, kind, id) {
  const one = { dogs: 'dog', litters: 'litter', puppies: 'puppy', extras: 'extra', products: 'product' }[kind];
  if (!one) return [];
  const s = [env.DB.prepare('DELETE FROM photo_tags WHERE site_id = ? AND subject = ?').bind(siteId, `${one}:${id}`)];
  if (kind === 'litters') {
    s.push(env.DB.prepare("DELETE FROM photo_tags WHERE site_id = ? AND subject IN (SELECT 'puppy:' || id FROM puppies WHERE site_id = ? AND litter_id = ?)").bind(siteId, siteId, id));
  }
  return s;
}

// photo id → [subject, …], for the site's photos that aren't removed.
export async function tagsByPhoto(env, siteId) {
  const { results } = await env.DB.prepare('SELECT t.photo_id, t.subject FROM photo_tags t JOIN photos p ON p.id = t.photo_id WHERE t.site_id = ? AND p.removed_at IS NULL').bind(siteId).all();
  const map = new Map();
  for (const r of results) map.set(r.photo_id, [...(map.get(r.photo_id) ?? []), r.subject]);
  return map;
}
