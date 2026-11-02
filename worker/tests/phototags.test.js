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

// The part of a picker before "Other photos", and the part after.
const split = (html) => {
  const i = html.indexOf('class="ph-more"');
  return i < 0 ? [html, ''] : [html.slice(0, i), html.slice(i)];
};

test("a dog's picker shows that dog's photos first, the rest folded away, and an Add photos button tagged with the dog", async () => {
  const b = await breeder();
  const willow = b.id('dogs', "slug = 'willow'");
  const mine = await b.upload(`dog:${willow}`, 'Willow');
  const other = await b.upload();
  const html = await (await b.get(`/dogs/${willow}`)).text();
  assert.match(html, /Photos of Willow/);
  const [first, rest] = split(html);
  assert.ok(first.includes(mine) && !first.includes(other));
  assert.ok(rest.includes(other) && !rest.includes(mine));
  assert.match(rest, /Other photos \(1\)/);
  assert.match(html, new RegExp(`data-tags="dog:${willow}"`));
  assert.match(html, /data-add-photos/);
  assert.match(html, /\/_kp\/m\/photos\.js\?v=/);
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

test("a puppy's picker offers its own photos, then its litter's; saving tags both", async () => {
  const b = await breeder();
  const gem = b.id('litters', "slug = 'gem-2026'");
  const opal = b.id('puppies', "slug = 'opal'");
  const litterPhoto = await b.upload(`litter:${gem}`);
  const page = await (await b.get(`/litters/${gem}`)).text();
  assert.match(page, /Photos of this litter/);
  assert.ok(page.includes(litterPhoto));
  assert.match(page, new RegExp(`data-tags="litter:${gem}"`));

  const html = await (await b.get(`/litters/${gem}/puppies/${opal}`)).text();
  assert.match(html, /Photos of Opal/);
  assert.match(html, /Photos of The Gem litter|Photos of Gem/);
  assert.match(html, new RegExp(`data-tags="puppy:${opal},litter:${gem}"`));
  assert.ok(split(html)[0].includes(litterPhoto));

  const row = b.env.DB.raw.prepare('SELECT * FROM puppies WHERE id = ?').get(opal);
  const body = Object.fromEntries(['slug', 'name', 'collar', 'sex', 'color', 'status', 'bio'].map((k) => [k, row[k] ?? '']));
  assert.equal((await b.post(`/litters/${gem}/puppies/${opal}`, { ...body, photo_id: litterPhoto })).status, 303);
  assert.deepEqual(b.tagsOf(litterPhoto), [`litter:${gem}`, `puppy:${opal}`].sort());
});

test('Home and Our story pickers offer their own photos and tag on save', async () => {
  const b = await breeder();
  const hero = await b.upload('page:home');
  const html = await (await b.get('/home/hero')).text();
  assert.match(html, /Photos for the Home page/);
  assert.ok(split(html)[0].includes(hero));
  const about = await b.upload();
  const page = await (await b.get('/pages/about')).text();
  assert.match(page, /data-tags="page:about"/);
  const current = await (await b.get('/pages/about')).text();
  assert.ok(current.includes('Photos for Our story'));
  await b.post('/pages/about', { enabled: '1', text: 'Our story.', photo_id: about });
  assert.deepEqual(b.tagsOf(about), ['page:about']);
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
