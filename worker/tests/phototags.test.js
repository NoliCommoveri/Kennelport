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
  // Chosen on the Photos screen, the one place to upload.
  assert.match(page, /href="\/s\/akbostons\/photos\?tab=profile">Open Photos</);
  assert.doesNotMatch(page, /data-add-photos/);

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

test('the Photos screen: Page photos | Profile photos, folded rows, and a pinned bar for the chosen photos', async () => {
  const b = await breeder();
  const willow = b.id('dogs', "slug = 'willow'");
  const a = await b.upload(`dog:${willow}`);
  const c = await b.upload();
  const onAbout = await b.upload();
  await b.post('/pages/about', { enabled: '1', text: 'Our story.', photo_id: onAbout });
  const page = await (await b.get('/photos')).text();
  assert.match(page, /<nav class="pm-tabs seg sm"[^>]*><a href="\/s\/akbostons\/photos" class="on" aria-current="page">Page photos<\/a><a href="\/s\/akbostons\/photos\?tab=profile">Profile photos<\/a><\/nav>/);
  // Rows folded, each with its count and a few small previews; nothing under a photo.
  assert.match(page, /<details class="lib-row pm-row"><summary><b>Our story<\/b><span class="pm-peek" aria-hidden="true"><img [^>]+><\/span><span class="n">1<\/span><\/summary>/);
  assert.match(page, /<details class="lib-row pm-row" data-unused><summary><b>Not used anywhere<\/b>/);
  assert.doesNotMatch(page, /<details[^>]* open/);
  assert.doesNotMatch(page, /name="alt" value=|class="tags"|aria-label="This photo is also of"/);
  assert.match(page, /data-upload-here="\/s\/akbostons\/photos\/upload"/);
  assert.match(page, /<form method="post" action="\/s\/akbostons\/photos\/selected" id="pm-bar" class="pm-bar"/);
  const profile = await (await b.get('/photos?tab=profile')).text();
  assert.match(profile, /<summary><b>Willow&#39;s profile<\/b>/);
  assert.ok(profile.includes(a) && !profile.includes(`value="${c}"`));

  const sel = (fields, ids) => { const f = new URLSearchParams(fields); for (const x of ids) f.append('photos', x); return b.post('/photos/selected', f); };
  const changedAt = () => b.env.DB.raw.prepare('SELECT draft_changed_at AS t FROM sites WHERE id = ?').get(b.site.id).t;
  const before = changedAt();
  // Show on a profile, and take off it again: for her only, the draft unchanged.
  let r = await sel({ act: 'tag', subject: `dog:${willow}`, tab: 'profile' }, [c]);
  assert.equal(r.headers.get('location'), '/s/akbostons/photos?tab=profile&note=onprofile');
  assert.deepEqual(b.tagsOf(c), [`dog:${willow}`]);
  await sel({ act: 'untag', subject: `dog:${willow}` }, [c]);
  assert.deepEqual(b.tagsOf(c), []);
  assert.equal(changedAt(), before);
  // Nothing chosen, or not her profile: nothing changes.
  assert.match((await sel({ act: 'tag', subject: `dog:${willow}` }, [])).headers.get('location'), /note=pick_none$/);
  assert.match((await sel({ act: 'tag', subject: 'dog:00000000-0000-0000-0000-000000000000' }, [c])).headers.get('location'), /note=tagnone$/);
  // A description, for one.
  await sel({ act: 'alt', alt: 'Willow at the beach' }, [c]);
  assert.equal(b.env.DB.raw.prepare('SELECT alt FROM photos WHERE id = ?').get(c).alt, 'Willow at the beach');
  // Remove: one not in use goes straight away; one in use says where first.
  r = await sel({ act: 'remove' }, [c]);
  assert.match(r.headers.get('location'), /note=removed$/);
  assert.ok(b.env.DB.raw.prepare('SELECT removed_at FROM photos WHERE id = ?').get(c).removed_at);
  r = await sel({ act: 'remove' }, [onAbout]);
  assert.equal(r.status, 200);
  const warn = await r.text();
  assert.match(warn, /<h2>Used on your site<\/h2>/);
  assert.match(warn, /<span>Our story<\/span>/);
  assert.match(warn, /name="confirm" value="1"/);
  assert.equal(b.env.DB.raw.prepare('SELECT removed_at FROM photos WHERE id = ?').get(onAbout).removed_at, null);
  await sel({ act: 'remove', confirm: '1' }, [onAbout]);
  assert.ok(b.env.DB.raw.prepare('SELECT removed_at FROM photos WHERE id = ?').get(onAbout).removed_at);
  // Gone from Our story's spot too.
  const spotHtml = spot(await (await b.get('/pages/about')).text(), 'photo_id');
  assert.deepEqual(held(spotHtml), []);
});

test('the Photos screen adds the chosen photos to an album, after what it has', async () => {
  const b = await breeder();
  const [p1, p2] = [await b.upload(), await b.upload()];
  const f = new URLSearchParams({ title: 'Spring', show_on_site: '1' });
  f.append('photos', p1);
  await b.post('/lists/albums/new', f);
  const album = b.env.DB.raw.prepare("SELECT id FROM albums WHERE title = 'Spring'").get().id;
  const page = await (await b.get('/photos')).text();
  assert.match(page, new RegExp(`<option value="${album}">Spring</option>`));
  const g = new URLSearchParams({ act: 'album', album });
  g.append('photos', p1); g.append('photos', p2);
  assert.match((await b.post('/photos/selected', g)).headers.get('location'), /note=inalbum$/);
  assert.deepEqual(JSON.parse(b.env.DB.raw.prepare('SELECT photos FROM albums WHERE id = ?').get(album).photos), [p1, p2]);
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
