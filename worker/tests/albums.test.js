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
  assert.match(await (await b.get('')).text(), /Photos and albums<\/b><span>Camera roll, galleries/);
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

test("every album with a photo tagged as a dog is listed at the foot of that dog's page", async () => {
  const b = await breeder();
  const dogs = b.env.DB.raw.prepare("SELECT id, slug, call_name FROM dogs WHERE show_on_site = 1 ORDER BY sort, call_name").all();
  const [willow, other] = dogs;
  const [p1, p2, p3] = [await b.photo('one'), await b.photo('two'), await b.photo('three')];
  await b.post('/lists/albums/new', form({ title: 'Beach day' }, [p1, p2]));
  await b.post('/lists/albums/new', form({ title: 'Snow day' }, [p3]));
  const tag = (photo, dog) => b.env.DB.raw.prepare('INSERT INTO photo_tags (site_id, photo_id, subject) VALUES (?, ?, ?)').run(b.site.id, photo, `dog:${dog.id}`);
  tag(p2, willow); tag(p3, willow); tag(p3, other);
  await b.post('/publish', new URLSearchParams());

  const page = await b.page(`/dogs/${willow.slug}`);
  assert.match(page, new RegExp(`<span class="eyebrow">Albums</span><h2>With ${willow.call_name}</h2>`));
  assert.match(page, /<a class="album-card" href="\/albums\/beach-day">/, 'one tagged photo is enough');
  assert.match(page, /<a class="album-card" href="\/albums\/snow-day">/);
  assert.ok(page.lastIndexOf('album-card') > page.indexOf('class="dogpage'), 'under the photo');
  const theirs = await b.page(`/dogs/${other.slug}`);
  assert.match(theirs, /href="\/albums\/snow-day"/);
  assert.doesNotMatch(theirs, /href="\/albums\/beach-day"/);

  // Untagged: gone from the page once published.
  b.env.DB.raw.prepare('DELETE FROM photo_tags WHERE photo_id = ?').run(p2);
  await b.post('/publish', new URLSearchParams());
  assert.doesNotMatch(await b.page(`/dogs/${willow.slug}`), /href="\/albums\/beach-day"/);
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

test("a puppy's tagged photos are its own album, only with the litter's switch on; its litter's albums sit under them", async () => {
  const b = await breeder();
  const opal = b.env.DB.raw.prepare("SELECT id FROM puppies WHERE slug = 'opal'").get().id;
  const [p1, p2] = [await b.photo('Opal asleep'), await b.photo('Opal at six weeks')];
  for (const id of [p1, p2]) await b.post(`/photos/${id}/tag`, new URLSearchParams({ subject: `puppy:${opal}` }));
  // An album of the litter, to show under the puppy's own photos.
  await b.post('/lists/albums/new', form({ title: 'The Gem litter, week 1', litter_id: b.litter }, [p1]));
  await b.post('/publish', new URLSearchParams());

  // Off by default: photo tags are private, so nothing of them is published.
  const off = await b.page('/litters/gem-2026/opal');
  assert.equal(off.includes('data-gallery'), false, 'no gallery without the tick');
  assert.equal(off.includes('<dialog class="viewer"'), false, 'and no viewer');
  assert.equal((await call(b.env, SITE, `/_kp/p/${p2}`)).status, 404, 'a photo only it would use is not served');
  assert.match(off, /<a class="album-card" href="\/albums\/the-gem-litter-week-1">/, "the litter's album shows either way");
  assert.match(off, /<h2>From The Gem litter<\/h2>/, "named for the litter, not a second \"Photos\"");

  // On: the tagged photos are that puppy's album, with the viewer the template drives.
  b.env.DB.raw.prepare("UPDATE litters SET show_puppy_photos = 1 WHERE slug = 'gem-2026'").run();
  forgetSnapshots();
  await b.post('/publish', new URLSearchParams());
  const on = await b.page('/litters/gem-2026/opal');
  assert.match(on, /Opal&#39;s photos/);
  assert.equal((on.match(/data-gallery/g) ?? []).length, 2);
  assert.match(on, new RegExp(`<a class="gal-item" href="/_kp/p/${p1}" data-gallery data-w="1200" data-h="900"><img src="/_kp/p/${p1}\\?s=t" alt="Opal asleep"`));
  assert.match(on, /<dialog class="viewer" id="viewer"/);
  assert.equal((await call(b.env, SITE, `/_kp/p/${p2}`)).status, 200, 'now served');
  // Only the puppy they are tagged for.
  const onyx = await b.page('/litters/gem-2026/onyx');
  assert.equal(onyx.includes('data-gallery'), false, 'an untagged puppy gets no gallery');
  assert.equal(onyx.includes('Onyx&#39;s photos'), false);
  // Its litter's album is still there, so p1 appears as that card's cover, never as
  // a photo of Onyx.
  assert.match(onyx, /<a class="album-card" href="\/albums\/the-gem-litter-week-1">/);
  assert.equal(onyx.includes('gal-item'), false);
});

// Photos get their created_at from the clock, so tests that care about order set it.
const dated = (env, id, when) => env.DB.raw.prepare('UPDATE photos SET created_at = ? WHERE id = ?').run(when, id);

test('albums read newest first, a new one goes on top, and her arrows still win', async () => {
  const b = await breeder();
  const p1 = await b.photo('one');
  const made = [];
  for (const title of ['Week 1', 'Week 2', 'Week 3']) {
    await b.post('/lists/albums/new', form({ title }, [p1]));
    made.push(b.env.DB.raw.prepare('SELECT id FROM albums WHERE title = ?').get(title).id);
  }
  await b.post('/publish', new URLSearchParams());
  const order = (html) => [...html.matchAll(/album-meta"><b>([^<]+)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(order(await b.page('/albums')), ['Week 3', 'Week 2', 'Week 1'], 'the newest album first');
  // The manage app reads the same way round, so what she sees is what the site does.
  assert.deepEqual([...(await (await b.get('/lists/albums')).text()).matchAll(/<b>(Week \d)<\/b>/g)].map((m) => m[1]), ['Week 3', 'Week 2', 'Week 1']);
  // Her up/down arrows still decide: Week 1 moved to the top stays there.
  await b.post(`/lists/albums/${made[0]}/up`, new URLSearchParams());
  await b.post(`/lists/albums/${made[0]}/up`, new URLSearchParams());
  await b.post('/publish', new URLSearchParams());
  assert.deepEqual(order(await b.page('/albums')), ['Week 1', 'Week 3', 'Week 2'], 'her order wins');
  // And a new album still lands above them all.
  await b.post('/lists/albums/new', form({ title: 'Week 4' }, [p1]));
  await b.post('/publish', new URLSearchParams());
  assert.deepEqual(order(await b.page('/albums')), ['Week 4', 'Week 1', 'Week 3', 'Week 2']);
});

test("an album's photos read newest first, and \"See more photos\" links wherever she keeps the rest", async () => {
  const b = await breeder();
  const [old_, mid, recent] = [await b.photo('oldest'), await b.photo('middle'), await b.photo('newest')];
  dated(b.env, old_, '2026-01-01T00:00:00.000Z');
  dated(b.env, mid, '2026-06-01T00:00:00.000Z');
  dated(b.env, recent, '2026-10-01T00:00:00.000Z');
  // Ticked oldest first; the site turns them round.
  await b.post('/lists/albums/new', form({ title: 'The Gem litter, week 1', more_photos_url: 'https://photos.app.goo.gl/abc123' }, [old_, mid, recent]));
  await b.post('/publish', new URLSearchParams());
  const page = await b.page('/albums/the-gem-litter-week-1');
  assert.deepEqual([...page.matchAll(/gal-item" href="\/_kp\/p\/([^"]+)"/g)].map((m) => m[1]), [recent, mid, old_]);
  // A third-party address, under the album, opening away from the site.
  assert.match(page, /<p class="center mt-20"><a class="more" href="https:\/\/photos\.app\.goo\.gl\/abc123" target="_blank" rel="noopener noreferrer">See more photos<\/a><\/p>/, 'the arrow comes from .more in the CSS, never doubled');
  assert.ok(page.indexOf('See more photos') > page.lastIndexOf('gal-item'), 'under the photos, not above them');
  // None set: no line at all.
  await b.post('/lists/albums/new', form({ title: 'Week 2' }, [mid]));
  await b.post('/publish', new URLSearchParams());
  assert.equal((await b.page('/albums/week-2')).includes('See more photos'), false);
});

test("a puppy's See more photos link is its own, and stands alone without tagged photos", async () => {
  const b = await breeder();
  b.env.DB.raw.prepare("UPDATE puppies SET more_photos_url = ? WHERE slug = 'opal'").run('https://photos.app.goo.gl/opal');
  await b.post('/publish', new URLSearchParams());
  // Its litter never ticked Show tagged photos, so there is no gallery: the link
  // still gets its own Photos block.
  const page = await b.page('/litters/gem-2026/opal');
  assert.match(page, /<h2>Opal&#39;s photos<\/h2>/);
  assert.match(page, /<a class="more" href="https:\/\/photos\.app\.goo\.gl\/opal" target="_blank" rel="noopener noreferrer">See more photos<\/a>/);
  assert.equal(page.includes('data-gallery'), false, 'no gallery, just the link');
  // A littermate with none set gets no block at all.
  const onyx = await b.page('/litters/gem-2026/onyx');
  assert.equal(onyx.includes('See more photos'), false);
  assert.equal(onyx.includes('Onyx&#39;s photos'), false);
  // With the litter's switch on, the link sits under that puppy's own photos.
  const shot = await b.photo('Opal asleep');
  const opal = b.env.DB.raw.prepare("SELECT id FROM puppies WHERE slug = 'opal'").get().id;
  await b.post(`/photos/${shot}/tag`, new URLSearchParams({ subject: `puppy:${opal}` }));
  b.env.DB.raw.prepare("UPDATE litters SET show_puppy_photos = 1 WHERE slug = 'gem-2026'").run();
  forgetSnapshots();
  await b.post('/publish', new URLSearchParams());
  const both = await b.page('/litters/gem-2026/opal');
  assert.ok(both.indexOf('See more photos') > both.lastIndexOf('gal-item'), 'under its photos');
  assert.equal(both.includes('photos.app.goo.gl/opal'), true);
});

// D1 takes at most 100 parameters a statement (tests/helpers/d1.js holds the test
// database to that too). A big album crashed the Worker (error 1101) when it was
// saved, previewed and published, from one `IN (…)` list of all its photos.
test('an album of 150 photos saves, publishes, previews and shows them all', async () => {
  const { makePreviewToken } = await import('../src/site.js');
  const b = await breeder();
  const ids = [];
  for (let i = 0; i < 150; i++) ids.push(await b.photo(`Photo ${i}`));
  assert.equal((await b.post('/lists/albums/new', form({ title: 'Gem week 4', litter_id: b.litter }, ids))).status, 303);
  assert.equal((await b.get('/publish')).status, 200);
  assert.equal((await b.post('/publish', new URLSearchParams())).status, 303);
  const page = await b.page('/albums/gem-week-4');
  assert.equal((page.match(/data-gallery/g) ?? []).length, 150);
  assert.match(await b.page('/litters/gem-2026'), /150 photos/);
  const opal = `puppy:${b.env.DB.raw.prepare("SELECT id FROM puppies WHERE slug = 'opal'").get().id}`;
  const f = new URLSearchParams({ subject: opal });
  for (const id of ids) f.append('photos', id);
  await b.post('/photos/tag-many', f);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM photo_tags WHERE subject = ?').get(opal).n, 150);
  const token = await makePreviewToken(b.env, b.site.id);
  const cookie = (await call(b.env, SITE, `/__preview?t=${encodeURIComponent(token)}`)).headers.get('set-cookie').split(';')[0];
  assert.equal((await call(b.env, SITE, '/albums/gem-week-4', { headers: { cookie } })).status, 200);
});

test("an album's screen tags several photos at once with who's in them, its litter's puppies first; so does the Photos screen", async () => {
  const b = await breeder();
  const [p1, p2, p3] = [await b.photo('a'), await b.photo('b'), await b.photo('c')];
  await b.post('/lists/albums/new', form({ title: 'Gem week 5', litter_id: b.litter }, [p1, p2, p3]));
  const id = b.env.DB.raw.prepare("SELECT id FROM albums WHERE title = 'Gem week 5'").get().id;
  const opal = b.env.DB.raw.prepare("SELECT id FROM puppies WHERE slug = 'opal'").get().id;
  const screen = await (await b.get(`/lists/albums/${id}`)).text();
  assert.match(screen, /<h2>Who&#39;s in these photos<\/h2>/);
  assert.match(screen, /<option value="">Who&#39;s in them…<\/option><optgroup label="Puppies of its litter"><option value="puppy:[^"]+">/);
  assert.equal((screen.match(/name="photos" value="[^"]+" form="tag-many"/g) ?? []).length, 3);
  assert.match(screen, new RegExp(`<option value="puppy:${opal}">Opal</option>`), 'its own litter\'s puppies by name alone');

  const tag = (fields, photos) => { const f = new URLSearchParams(fields); for (const x of photos) f.append('photos', x); return b.post('/photos/tag-many', f); };
  const res = await tag({ subject: `puppy:${opal}`, back: `/s/akbostons/lists/albums/${id}#whos-in` }, [p1, p2]);
  assert.equal(res.headers.get('location'), `/s/akbostons/lists/albums/${id}?note=tagmany#whos-in`);
  const tagged = b.env.DB.raw.prepare('SELECT photo_id FROM photo_tags WHERE subject = ? ORDER BY photo_id').all(`puppy:${opal}`).map((r) => r.photo_id);
  assert.deepEqual(tagged, [p1, p2].sort());
  assert.match(await (await b.get(`/lists/albums/${id}`)).text(), /<span class="tag">Opal<\/span>/);

  // Nothing ticked, a subject that isn't hers, or a way back off the app: nothing tagged, back to Photos.
  assert.match((await tag({ subject: `puppy:${opal}`, back: `/s/akbostons/lists/albums/${id}` }, [])).headers.get('location'), /note=tagnone$/);
  assert.match((await tag({ subject: 'puppy:00000000-0000-0000-0000-000000000000' }, [p3])).headers.get('location'), /^\/s\/akbostons\/photos\?note=tagnone$/);
  assert.equal((await tag({ subject: `puppy:${opal}`, back: '//evil.example/x' }, [p3])).headers.get('location'), '/s/akbostons/photos?note=tagmany');

  // The Photos screen: choose several, then Show on a profile (its pinned bar).
  const photosScreen = await (await b.get('/photos')).text();
  assert.match(photosScreen, new RegExp(`<input type="checkbox" name="photos" value="${p3}" form="pm-bar">`));
  const f = new URLSearchParams({ act: 'tag', subject: `puppy:${opal}` });
  f.append('photos', p3);
  assert.match((await b.post('/photos/selected', f)).headers.get('location'), /\/photos\?note=onprofile$/);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM photo_tags WHERE subject = ? AND photo_id = ?').get(`puppy:${opal}`, p3).n, 1);
});
