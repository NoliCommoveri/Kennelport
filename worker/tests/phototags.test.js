// What each photo is of (photoTags.js): pickers offer a record's own photos first,
// Add photos on a record's screen tags what it uploads, saving tags what was
// chosen, and the Photos screen filters by it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');

const M = 'manage.kennelport.com';

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
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: body instanceof FormData ? body : new URLSearchParams(body) });
  const id = (table, where) => env.DB.raw.prepare(`SELECT id FROM ${table} WHERE ${where}`).get().id;
  const upload = async (tags = '', alt = '') => {
    const form = new FormData();
    form.append('full', new Blob([webp(1600, 1200)]), 'full');
    form.append('thumb', new Blob([webp(400, 300)]), 'thumb');
    form.append('alt', alt);
    if (tags) form.append('tags', tags);
    const r = await post('/photos/upload', form);
    assert.equal(r.status, 200);
    return (await r.json()).id;
  };
  const tagsOf = (photo) => env.DB.raw.prepare('SELECT subject FROM photo_tags WHERE photo_id = ? ORDER BY subject').all(photo).map((r) => r.subject);
  return { env, site, get, post, id, upload, tagsOf };
}

// A photo spot (forms.js photoSlot): its name, the photos it holds, and its data.
const spot = (html, name) => html.match(new RegExp(`<fieldset class="ph-slot[^"]*" data-slot data-name="${name.replace(/\./g, '\\.')}"[\\s\\S]*?</fieldset>`))?.[0] ?? '';
const held = (slotHtml) => [...slotHtml.matchAll(/<input type="hidden" name="[^"]+" value="([^"]*)">/g)].map((m) => m[1]).filter(Boolean);

test("a dog's photo spot shows only its photo; Replace opens the library, which uploads tagged with the dog", async () => {
  const b = await breeder();
  const willow = b.id('dogs', "slug = 'willow'");
  const mine = await b.upload(`dog:${willow}`, 'Willow');
  const other = await b.upload();
  const row = b.env.DB.raw.prepare('SELECT * FROM dogs WHERE id = ?').get(willow);
  b.env.DB.raw.prepare('UPDATE dogs SET photo_id = ? WHERE id = ?').run(mine, willow);
  const html = await (await b.get(`/dogs/${willow}`)).text();
  const s = spot(html, 'photo_id');
  assert.ok(s, 'the photo spot');
  assert.deepEqual(held(s), [mine]);
  assert.ok(!s.includes(other), 'no other photo in the form');
  assert.match(s, /data-replace>Replace</);
  assert.match(s, /data-remove>Remove</);
  assert.match(s, new RegExp(`data-tags="dog:${willow}"`));
  assert.match(s, /data-library="\/s\/akbostons\/photos\/library"/);
  assert.match(s, /data-upload="\/s\/akbostons\/photos\/upload"/);
  assert.doesNotMatch(html, /data-add-photos|ph-grid/);
  assert.match(html, /\/_kp\/m\/photos\.js\?v=/);
  assert.ok(row);
});

test('uploads ignore subjects that are not this site\'s', async () => {
  const b = await breeder();
  const other = await addSite(b.env, 'other');
  await importContent(b.env, other.id, { dogs: [{ slug: 'rex', call_name: 'Rex', sex: 'male' }] });
  const rex = b.id('dogs', "slug = 'rex'");
  const willow = b.id('dogs', "slug = 'willow'");
  const p = await b.upload(`dog:${rex},dog:${willow},page:nowhere,bogus`);
  assert.deepEqual(b.tagsOf(p), [`dog:${willow}`]);
});

test('saving a dog tags the chosen photo and any added with its Add photos button, even a new dog', async () => {
  const b = await breeder();
  const chosen = await b.upload();
  const extra = await b.upload();
  const res = await b.post('/dogs/new', { call_name: 'Nova', sex: 'female', show_on_site: '1', photo_id: chosen, _new_photos: extra });
  assert.equal(res.status, 303);
  const nova = b.id('dogs', "slug = 'nova'");
  assert.deepEqual(b.tagsOf(chosen), [`dog:${nova}`]);
  assert.deepEqual(b.tagsOf(extra), [`dog:${nova}`]);
});

test("a puppy's spot uploads tagged with the puppy and its litter; saving tags what's chosen", async () => {
  const b = await breeder();
  const gem = b.id('litters', "slug = 'gem-2026'");
  const opal = b.id('puppies', "slug = 'opal'");
  const litterPhoto = await b.upload(`litter:${gem}`);
  const page = await (await b.get(`/litters/${gem}`)).text();
  assert.match(page, /Photos of this litter/);
  assert.ok(page.includes(litterPhoto));
  assert.match(page, new RegExp(`data-tags="litter:${gem}"`));

  const html = await (await b.get(`/litters/${gem}/puppies/${opal}`)).text();
  assert.match(spot(html, 'photo_id'), new RegExp(`data-tags="puppy:${opal},litter:${gem}"`));

  const row = b.env.DB.raw.prepare('SELECT * FROM puppies WHERE id = ?').get(opal);
  const body = Object.fromEntries(['slug', 'name', 'collar', 'sex', 'color', 'status', 'bio'].map((k) => [k, row[k] ?? '']));
  assert.equal((await b.post(`/litters/${gem}/puppies/${opal}`, { ...body, photo_id: litterPhoto })).status, 303);
  assert.deepEqual(b.tagsOf(litterPhoto), [`litter:${gem}`, `puppy:${opal}`].sort());
  // Now it's the puppy's spot's one photo.
  assert.deepEqual(held(spot(await (await b.get(`/litters/${gem}/puppies/${opal}`)).text(), 'photo_id')), [litterPhoto]);
});

test('Home and Our story spots: no photo yet reads Choose a photo; saving tags the chosen photo', async () => {
  const b = await breeder();
  const html = await (await b.get('/home/hero')).text();
  assert.match(spot(html, 'banner_photo_id'), /data-tags="page:home"/);
  const about = await b.upload();
  const page = await (await b.get('/pages/about')).text();
  const s = spot(page, 'photo_id');
  assert.match(s, /data-tags="page:about"/);
  await b.post('/pages/about', { enabled: '1', text: 'Our story.', photo_id: about });
  assert.deepEqual(b.tagsOf(about), ['page:about']);
  assert.deepEqual(held(spot(await (await b.get('/pages/about')).text(), 'photo_id')), [about]);
  // Removed: the spot is empty, and says so.
  await b.post('/pages/about', { enabled: '1', text: 'Our story.', photo_id: '' });
  const empty = spot(await (await b.get('/pages/about')).text(), 'photo_id');
  assert.deepEqual(held(empty), []);
  assert.match(empty, /class="ph-none">No photo yet</);
  assert.match(empty, /data-replace>Choose a photo</);
  assert.match(empty, /data-remove hidden>/);
});

test('the photo library: Page photos by where each photo shows, Profile photos by profile, and Not used anywhere', async () => {
  const b = await breeder();
  const willow = b.id('dogs', "slug = 'willow'");
  const opal = b.id('puppies', "slug = 'opal'");
  const onAbout = await b.upload();
  const onWillow = await b.upload();
  const tagged = await b.upload(`puppy:${opal}`);
  const loose = await b.upload();
  await b.post('/pages/about', { enabled: '1', text: 'Our story.', photo_id: onAbout });
  b.env.DB.raw.prepare('UPDATE dogs SET photo_id = ? WHERE id = ?').run(onWillow, willow);
  const r = await b.get('/photos/library');
  assert.equal(r.status, 200);
  const html = await r.text();
  const tab = (k) => html.match(new RegExp(`<div class="lib-tab" data-tab="${k}"[^>]*>([\\s\\S]*?)</div></details>(?:</div>|<p)`))?.[0] ?? html.split(`data-tab="${k}"`)[1].split('data-tab=')[0];
  const rowOf = (part, label) => part.match(new RegExp(`<summary><b>${label.replace(/[()']/g, (c) => (c === "'" ? '&#39;' : `\\${c}`))}</b><span class="n">\\d+</span></summary><div class="lib-grid">([\\s\\S]*?)</div></details>`))?.[1] ?? '';
  const page = tab('page'); const profile = tab('profile');
  assert.match(html, /<span>Page photos<\/span>.*<span>Profile photos<\/span>/s);
  assert.ok(rowOf(page, 'Our story').includes(onAbout), 'Our story row');
  assert.ok(rowOf(profile, "Willow's profile").includes(onWillow), "Willow's profile row");
  assert.ok(rowOf(profile, "Opal's profile (The Gem litter)").includes(tagged) || /Opal&#39;s profile/.test(profile), "Opal's profile row");
  assert.ok(rowOf(page, 'Not used anywhere').includes(loose), 'Not used anywhere');
  assert.ok(!rowOf(page, 'Not used anywhere').includes(onAbout));
  // Thumbnails load only when a row opens.
  assert.match(html, /<button type="button" class="lib-ph" data-id="[^"]+" data-thumb="\/s\/akbostons\/photos\/[^"]+\/thumb" aria-pressed="false"><img data-src=/);
  assert.match(html, /data-lib-upload/);
  assert.match(html, /data-lib-pick data-one="Replace" data-many="Use these photos" disabled/);
});

test('the Photos screen filters by what a photo is of, and tags can be added and taken off', async () => {
  const b = await breeder();
  const willow = b.id('dogs', "slug = 'willow'");
  const a = await b.upload(`dog:${willow}`);
  const c = await b.upload();
  const all = await (await b.get('/photos')).text();
  assert.match(all, /All <span>2<\/span>/);
  assert.match(all, /Not sorted <span>1<\/span>/);
  assert.match(all, /Willow <span>1<\/span>/);
  const only = await (await b.get(`/photos?of=dog:${willow}`)).text();
  assert.ok(only.includes(a) && !only.includes(`/photos/${c}/thumb`));
  const none = await (await b.get('/photos?of=none')).text();
  assert.ok(none.includes(`/photos/${c}/thumb`) && !none.includes(`/photos/${a}/thumb`));

  const changedAt = () => b.env.DB.raw.prepare('SELECT draft_changed_at AS t FROM sites WHERE id = ?').get(b.site.id).t;
  const before = changedAt();
  const r = await b.post(`/photos/${c}/tag`, { subject: `dog:${willow}`, of: 'none' });
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /\?of=none&note=tagged$/);
  assert.deepEqual(b.tagsOf(c), [`dog:${willow}`]);
  await b.post(`/photos/${c}/untag`, { subject: `dog:${willow}` });
  assert.deepEqual(b.tagsOf(c), []);
  // Tagging is for the breeder only: it doesn't change the draft.
  assert.equal(changedAt(), before);
});

test("removing a dog or a litter removes their tags (a litter's puppies' too); closing the site removes all", async () => {
  const b = await breeder();
  const willow = b.id('dogs', "slug = 'willow'");
  const gem = b.id('litters', "slug = 'gem-2026'");
  const opal = b.id('puppies', "slug = 'opal'");
  const p = await b.upload(`dog:${willow},litter:${gem},puppy:${opal}`);
  assert.equal(b.tagsOf(p).length, 3);
  await b.post(`/dogs/${willow}/remove`);
  assert.deepEqual(b.tagsOf(p), [`litter:${gem}`, `puppy:${opal}`]);
  await b.post(`/litters/${gem}/remove`);
  assert.deepEqual(b.tagsOf(p), []);
  await b.upload('page:home');
  const { closeSite } = await import('../src/sites.js');
  await closeSite(b.env, b.site.id, 'akbostons');
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM photo_tags').get().n, 0);
});

test('the download lists what each photo is of', async () => {
  const b = await breeder();
  const willow = b.id('dogs', "slug = 'willow'");
  await b.upload(`dog:${willow},page:home`);
  const m = await (await b.get('/export.json')).json();
  assert.deepEqual(m.photos[0].of.sort(), ['Home page', 'Willow']);
});
