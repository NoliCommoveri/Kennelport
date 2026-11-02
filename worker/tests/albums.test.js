// Albums (phase 5): galleries with their own addresses, made in the manage app,
// linked from their litter's page, part of the content document.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { savePhoto } = await import('../src/photos.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

async function breeder() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = (p) => call(env, M, `/s/akbostons${p}`, { headers: { cookie } });
  const post = (p, body) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body });
  const photo = async (alt) => (await savePhoto(env, site.id, { full: webp(1200, 900), thumb: webp(400, 300), alt })).id;
  const litter = env.DB.raw.prepare("SELECT id FROM litters WHERE slug = 'gem-2026'").get().id;
  await post('/publish', new URLSearchParams());
  return { env, site, get, post, photo, litter, page: async (p) => (await call(env, SITE, p)).text() };
}

const form = (fields, photos = []) => {
  const f = new URLSearchParams({ show_on_site: '1', ...fields });
  for (const id of photos) f.append('photos', id);
  return f;
};

test('an album made in the manage app gets its own page, a card on /albums, and a link from its litter', async () => {
  const b = await breeder();
  const [p1, p2, p3] = [await b.photo('Opal asleep'), await b.photo('Onyx'), await b.photo('All three')];
  assert.match(await (await b.get('')).text(), /Albums<\/b><span>Photo galleries with their own link/);
  const created = await b.post('/lists/albums/new', form({ title: 'The Gem litter, week 1', description: 'Their first week.', litter_id: b.litter, cover_photo_id: p3 }, [p1, p2, p3]));
  assert.equal(created.status, 303);
  assert.match(await (await b.get('/lists/albums')).text(), /The Gem litter, week 1<\/b><span>3 photos/);
  assert.match(await (await b.get('/publish')).text(), /Albums: The Gem litter, week 1 added/);
  await b.post('/publish', new URLSearchParams());

  const list = await b.page('/albums');
  assert.match(list, /<a class="album-card" href="\/albums\/the-gem-litter-week-1"><img src="\/_kp\/p\/[^"]+\?s=t"[^>]*><span class="album-meta"><b>The Gem litter, week 1<\/b><span class="small muted">3 photos<\/span>/);
  const page = await b.page('/albums/the-gem-litter-week-1');
  assert.match(page, /<h1>The Gem litter, week 1<\/h1><p class="lede">Their first week\.<\/p>/);
  assert.equal((page.match(/data-gallery/g) ?? []).length, 3);
  assert.match(page, new RegExp(`<a class="gal-item" href="/_kp/p/${p1}" data-gallery data-w="1200" data-h="900"><img src="/_kp/p/${p1}\\?s=t" alt="Opal asleep"`));
  assert.match(page, /<dialog class="viewer" id="viewer"/);
  assert.match(page, /<a href="\/litters\/gem-2026">The Gem litter<\/a>/, 'back to its litter');
  assert.match(await b.page('/litters/gem-2026'), /<a class="album-card" href="\/albums\/the-gem-litter-week-1">/);
  assert.match(await b.page('/'), /<a href="\/albums">Photo albums<\/a>/, 'in the Puppies menu');
  assert.match((await call(b.env, SITE, '/sitemap.xml').then((r) => r.text())), /\/albums\/the-gem-litter-week-1/);
  assert.equal((await call(b.env, SITE, `/_kp/p/${p2}`)).status, 200, 'its photos are served');
});

test('a removed photo drops out; an empty or hidden album isn\'t shown; a new title keeps the old address working', async () => {
  const b = await breeder();
  const [p1, p2] = [await b.photo('one'), await b.photo('two')];
  await b.post('/lists/albums/new', form({ title: 'Week 2' }, [p1, p2]));
  await b.post('/publish', new URLSearchParams());
  const id = b.env.DB.raw.prepare('SELECT id FROM albums').get().id;

  await b.post(`/photos/${p2}/remove`, new URLSearchParams());
  await b.post('/publish', new URLSearchParams());
  assert.equal(((await b.page('/albums/week-2')).match(/data-gallery/g) ?? []).length, 1);

  await b.post(`/lists/albums/${id}`, form({ title: 'Week two', slug: 'week-two' }, [p1]));
  await b.post('/publish', new URLSearchParams());
  const moved = await call(b.env, SITE, '/albums/week-2');
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('location'), '/albums/week-two');

  const hidden = form({ title: 'Week two', slug: 'week-two' }, [p1]);
  hidden.delete('show_on_site');
  await b.post(`/lists/albums/${id}`, hidden);
  await b.post('/publish', new URLSearchParams());
  assert.equal((await call(b.env, SITE, '/albums')).status, 404, 'no albums shown: no page');
  assert.doesNotMatch(await b.page('/'), /Photo albums/);
});

test('only the site\'s own photos and litters; the album limit; removing a litter keeps its albums', async () => {
  const b = await breeder();
  const bad = await b.post('/lists/albums/new', form({ title: 'X' }, ['not-a-photo']));
  assert.equal(bad.status, 200);
  assert.match(await bad.text(), /a chosen photo is no longer on this site/);
  const p = await b.photo('one');
  b.env.DB.raw.prepare('UPDATE sites SET album_limit = 1').run();
  assert.equal((await b.post('/lists/albums/new', form({ title: 'A', litter_id: b.litter }, [p]))).status, 303);
  const over = await b.post('/lists/albums/new', form({ title: 'B' }, [p]));
  assert.match(await over.text(), /reached its limit of 1 albums/);
  await b.post(`/litters/${b.litter}/remove`, new URLSearchParams());
  assert.equal(b.env.DB.raw.prepare('SELECT litter_id FROM albums').get().litter_id, null);
});

test('albums go out in the content document and come back in', async () => {
  const b = await breeder();
  const [p1, p2] = [await b.photo('one'), await b.photo('two')];
  await b.post('/lists/albums/new', form({ title: 'Gem week 3', litter_id: b.litter, cover_photo_id: p2 }, [p1, p2]));
  const doc = await exportContent(b.env, b.site.id);
  assert.deepEqual(doc.albums, [{ slug: 'gem-week-3', title: 'Gem week 3', litter: 'gem-2026', cover_photo_id: p2, photos: [p1, p2], show_on_site: true }]);
  const before = b.env.DB.raw.prepare('SELECT id FROM albums').get().id;
  await importContent(b.env, b.site.id, { albums: doc.albums });
  assert.equal(b.env.DB.raw.prepare('SELECT id FROM albums').get().id, before, 'matched by slug, id kept');
  await assert.rejects(importContent(b.env, b.site.id, { albums: [{ ...doc.albums[0], litter: 'nope' }] }), /no litter with slug "nope"/);
  await assert.rejects(importContent(b.env, b.site.id, { albums: [{ ...doc.albums[0], photos: ['nope'] }] }), /no photo with id nope/);
  const { closeSite } = await import('../src/sites.js');
  await closeSite(b.env, b.site.id, 'akbostons');
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM albums').get().n, 0);
});
