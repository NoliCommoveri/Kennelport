import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { changes } = await import('../src/diff.js');

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
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: body instanceof FormData ? body : new URLSearchParams(body) });
  const id = (table, where) => env.DB.raw.prepare(`SELECT id FROM ${table} WHERE ${where}`).get().id;
  return { env, site, get, post, id };
}

test("a new record's form starts with Show on my website ticked", async () => {
  const b = await breeder();
  assert.match(await (await b.get('/litters/new')).text(), /name="show_on_site" value="1" checked/);
});

test('every editing screen opens', async () => {
  const b = await breeder();
  const dog = b.id('dogs', "slug = 'willow'");
  const litter = b.id('litters', "slug = 'gem-2026'");
  const pup = b.id('puppies', "slug = 'opal'");
  for (const p of ['', '/puppies', '/dogs', `/dogs/${dog}`, '/dogs/new', `/dogs/${dog}/health`, `/dogs/${dog}/health/new`, '/litters', `/litters/${litter}`, `/litters/${litter}/puppies/${pup}`,
    '/pages', '/pages/about', '/pages/faq', '/home', '/home/hero', '/home/story', '/home/facts', '/details', '/photos', '/publish',
    '/lists/extras', '/lists/reviews', '/lists/steps', '/lists/policies', '/lists/faq', '/lists/waitlist_help', '/lists/extras/new']) {
    const res = await b.get(p);
    assert.equal(res.status, 200, p);
    assert.doesNotMatch(await res.text(), /\sstyle="/, p);
  }
});

test('mark a puppy placed in one tap, see it in the change list, publish it', async () => {
  const b = await breeder();
  await b.post('/publish');
  const pup = b.id('puppies', "slug = 'opal'");
  const res = await b.post(`/puppies/${pup}/status`, { status: 'placed' });
  assert.equal(res.status, 303);
  const pub = await (await b.get('/publish')).text();
  assert.match(pub, /Opal: Reserved/);
  assert.match(pub, /Publish 1 change/);
  assert.doesNotMatch(await (await call(b.env, SITE, '/litters/gem-2026/opal')).text(), /<h1>Opal<\/h1>[\s\S]*Reserved/);
  assert.equal((await b.post('/publish')).status, 303);
  assert.match(await (await call(b.env, SITE, '/litters/gem-2026/opal')).text(), /status c-held">Reserved/);
  assert.match(await (await b.get('/publish')).text(), /Nothing to publish/);
});

test('edit a dog: the form keeps what was typed when something is wrong', async () => {
  const b = await breeder();
  await b.post('/publish');
  const dog = b.id('dogs', "slug = 'willow'");
  const bad = await (await b.post(`/dogs/${dog}`, { call_name: 'Willow', sex: 'female', slug: 'willow', registered_name: 'A new name', date_of_birth: '2026-13-45' })).text();
  assert.match(bad, /Not saved: dogs\.date_of_birth: a date is YYYY-MM-DD/);
  assert.match(bad, /value="A new name"/);
  const ok = await b.post(`/dogs/${dog}`, { call_name: 'Willow', sex: 'female', slug: 'willow', registered_name: 'A new name', show_on_site: '1' });
  assert.equal(ok.status, 303);
  assert.equal(b.env.DB.raw.prepare("SELECT registered_name FROM dogs WHERE slug = 'willow'").get().registered_name, 'A new name');
  assert.match(await (await b.get('/publish')).text(), /Willow: edited/);
});

test('add a dog (web address made from the name), a health result, and a litter with parents', async () => {
  const b = await breeder();
  assert.equal((await b.post('/dogs/new', { call_name: 'Nova Belle', sex: 'female', show_on_site: '1' })).status, 303);
  const nova = b.env.DB.raw.prepare("SELECT id, slug FROM dogs WHERE call_name = 'Nova Belle'").get();
  assert.equal(nova.slug, 'nova-belle');
  await b.post('/dogs/new', { call_name: 'Nova Belle', sex: 'female' });
  assert.ok(b.env.DB.raw.prepare("SELECT 1 FROM dogs WHERE slug = 'nova-belle-2'").get(), 'a second dog of the same name gets its own address');
  assert.equal((await b.post(`/dogs/${nova.id}/health/new`, { test: 'BAER', result: 'Normal', normal: '1', show: '1' })).status, 303);
  const boone = b.id('dogs', "slug = 'boone'");
  assert.equal((await b.post('/litters/new', { name: 'Nova × Boone', stage: 'planned', dam_id: nova.id, sire_id: boone, expected_label: 'Summer 2027', show_on_site: '1' })).status, 303);
  await b.post('/publish');
  const html = await (await call(b.env, SITE, '/dogs/nova-belle')).text();
  assert.match(html, /BAER<\/span><span>Normal/);
  assert.match(await (await call(b.env, SITE, '/litters')).text(), /Nova × Boone/);
});

test('switch a page off, reword a Home block, edit the kennel details', async () => {
  const b = await breeder();
  await b.post('/publish');
  await b.post('/pages/faq', { menu_label: '', heading: 'FAQ' });
  await b.post('/home/hero', { enabled: '1', headline: 'Bostons with heart', script: '', intro: '' });
  await b.post('/details', { kennel_name: 'AK Bostons', tagline: 'The American Gentleman', show_other_prices: '1', dark_mode: 'auto' });
  const list = await (await b.get('/publish')).text();
  assert.match(list, /FAQ page: switched off/);
  assert.match(list, /Home, top of the page: edited/);
  assert.match(list, /Kennel details: name/);
  await b.post('/publish');
  assert.equal((await call(b.env, SITE, '/faq')).status, 404);
  const home = await (await call(b.env, SITE, '/')).text();
  assert.match(home, /Bostons with heart/);
  assert.match(home, /<title>AK Bostons<\/title>/);
});

test('Kennel details: her Group health results by kind switch shows, saves, and says so before publishing', async () => {
  const b = await breeder();
  await b.post('/publish');
  const form = await (await b.get('/details')).text();
  assert.match(form, /name="group_health"/);
  assert.match(form, /Group health results by kind/);
  await b.post('/details', { kennel_name: 'AK Boston Terriers', group_health: '1', dark_mode: 'auto' });
  assert.equal(b.env.DB.raw.prepare('SELECT group_health FROM sites').get().group_health, 1);
  assert.match(await (await b.get('/publish')).text(), /health results by kind/);
  await b.post('/details', { kennel_name: 'AK Boston Terriers', dark_mode: 'auto' });
  assert.equal(b.env.DB.raw.prepare('SELECT group_health FROM sites').get().group_health, 0, 'unticked: off');
});

test('lists: add an extra with a checklist, reorder, remove', async () => {
  const b = await breeder();
  assert.equal((await b.post('/lists/extras/new', { kind: 'item', name: 'Puppy pack', price_from: '150', checklist: 'Blanket\nToy\n\nFood' })).status, 303);
  const x = b.env.DB.raw.prepare("SELECT id, checklist, sort FROM extras WHERE name = 'Puppy pack'").get();
  assert.equal(x.checklist, '["Blanket","Toy","Food"]');
  assert.equal(x.sort, 3);
  await b.post(`/lists/extras/${x.id}/up`);
  assert.equal(b.env.DB.raw.prepare('SELECT sort FROM extras WHERE id = ?').get(x.id).sort, 2);
  await b.post(`/lists/extras/${x.id}/remove`);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM extras').get().n, 3);
  assert.match(await (await b.post('/lists/extras/new', { kind: 'item', name: 'X', price_from: '100', price_to: '50' })).text(), /lower than the starting price/);
});

test('upload a photo and put it on a dog', async () => {
  const b = await breeder();
  await b.post('/publish');
  const { webp } = await import('./helpers/images.js');
  const form = new FormData();
  form.append('full', new Blob([webp(1600, 1200)]), 'full');
  form.append('thumb', new Blob([webp(400, 300)]), 'thumb');
  form.append('alt', 'Willow in the leaves');
  const up = await b.post('/photos/upload', form);
  assert.equal(up.status, 200);
  const { id: photo } = await up.json();
  assert.equal((await b.get(`/photos/${photo}/thumb`)).status, 200);
  const dog = b.id('dogs', "slug = 'willow'");
  const w = b.env.DB.raw.prepare('SELECT * FROM dogs WHERE id = ?').get(dog);
  const body = Object.fromEntries(['slug', 'call_name', 'registered_name', 'sex', 'role', 'color', 'bio', 'status', 'health_display'].map((k) => [k, w[k] ?? '']));
  await b.post(`/dogs/${dog}`, { ...body, show_on_site: '1', photo_id: photo });
  assert.match(await (await b.get('/publish')).text(), /Willow: photo added/);
  await b.post('/publish');
  assert.equal((await call(b.env, SITE, `/_kp/p/${photo}`)).status, 200);
});

test('records of another site, or of another parent, are out of reach', async () => {
  const b = await breeder();
  const other = await addSite(b.env, 'other');
  await importContent(b.env, other.id, { dogs: [{ slug: 'rex', call_name: 'Rex', sex: 'male' }] });
  const rex = b.id('dogs', "slug = 'rex'");
  assert.equal((await b.get(`/dogs/${rex}`)).status, 404);
  assert.equal((await b.post(`/dogs/${rex}/remove`)).status, 404);
  assert.ok(b.env.DB.raw.prepare('SELECT 1 FROM dogs WHERE id = ?').get(rex));
  const pupOtherLitter = b.id('puppies', "slug = 'contessa'");
  const gem = b.id('litters', "slug = 'gem-2026'");
  assert.equal((await b.get(`/litters/${gem}/puppies/${pupOtherLitter}`)).status, 404);
  const willow = b.id('dogs', "slug = 'willow'");
  assert.match(await (await b.post('/litters/new', { name: 'X', stage: 'planned', dam_id: rex })).text(), /no longer on this site/);
  assert.ok(willow);
});

test('the change list says what a first publish is, and what was added or removed', async () => {
  const b = await breeder();
  const { buildSnapshot } = await import('../src/publish.js');
  const draft = await buildSnapshot(b.env, b.site.id);
  assert.deepEqual(changes(null, draft).map((c) => c.text), ['The whole site: first publish']);
  const after = structuredClone(draft);
  after.dogs = after.dogs.filter((d) => d.slug !== 'pearl');
  after.reviews.push({ id: 'r-new', first_name: 'The Lee family', quote: 'Lovely' });
  const lines = changes(draft, after).map((c) => c.text);
  assert.ok(lines.includes('Pearl*: removed'));
  assert.ok(lines.includes('Reviews: The Lee family added'));
});
