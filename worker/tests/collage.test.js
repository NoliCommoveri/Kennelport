// The Home collage and banner: the breeder picks a layout, a photo for each box
// and the part of it to keep; the site draws each box in its own shape and never
// an empty one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { publish, forgetSnapshots } = await import('../src/publish.js');
const { collageLayout, COLLAGE_LAYOUTS } = await import('../src/content/model.js');

const M = 'manage.kennelport.com';
const S = 'akbostons.kennelport.com';

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
  const upload = async () => {
    const form = new FormData();
    form.append('full', new Blob([webp(1600, 1200)]), 'full');
    form.append('thumb', new Blob([webp(400, 300)]), 'thumb');
    form.append('tags', 'page:home');
    return (await (await post('/photos/upload', form)).json()).id;
  };
  const hero = async () => (await exportContent(env, site.id)).home.hero;
  const live = async () => { await publish(env, site.id, 'test'); return (await call(env, S, '/')).text(); };
  return { env, site, get, post, upload, hero, live };
}

test('a layout with fewer photos than boxes falls back to one for that many, keeping the first shape', () => {
  assert.equal(collageLayout('tall_two_wide', 3), 'tall_two_wide');
  assert.equal(collageLayout('tall_two_wide', 2), 'two_tall');
  assert.equal(collageLayout('two_wide', 1), 'one_wide');
  assert.equal(collageLayout('one_tall', 1), 'one_tall');
  assert.equal(collageLayout('four_square', 3), 'tall_two_wide');
  assert.equal(collageLayout('wide_two_square', 2), 'two_tall');
  assert.equal(collageLayout('two_wide', 2), 'two_wide');
  assert.equal(collageLayout(null, 0), null);
  assert.equal(collageLayout(null, 4), 'four_square');
  assert.equal(Object.keys(COLLAGE_LAYOUTS).length, 7);
});

test('the manage form offers the layouts and a box per photo, each with its shape and size', async () => {
  const b = await breeder();
  const html = await (await b.get('/home/hero')).text();
  assert.equal((html.match(/class="layout-opt"/g) ?? []).length, 7);
  assert.match(html, /Banner photo<span class="hint">[^<]*1600 × 640 px/);
  assert.match(html, /Tall box \(4:5\): best at 1280 × 1600 px\./);
  assert.match(html, /Wide box \(4:3\): best at 1600 × 1200 px\./);
  // The default for three photos is one tall and two wide: box 4 is hidden.
  assert.match(html, /value="tall_two_wide" data-boxes="tall,wide,wide" checked/);
  assert.match(html, /<div class="box" data-box="2">/);
  assert.match(html, /<div class="box" data-box="3" hidden>/);
});

test('each box gets the photo she chose and the part to keep; the site draws it, with the banner', async () => {
  const b = await breeder();
  const [p1, p2, p3, banner] = [await b.upload(), await b.upload(), await b.upload(), await b.upload()];
  const r = await b.post('/home/hero', {
    enabled: '1', headline: 'Bostons', layout: 'tall_two_wide',
    'photos.0': p1, 'focus.0': 'top', 'photos.1': p2, 'focus.1': 'middle', 'photos.2': p3, 'focus.2': 'bottom',
    'photos.3': banner, 'focus.3': 'top', // a hidden box beyond the layout: ignored
    banner_photo_id: banner, banner_focus: 'bottom',
  });
  assert.equal(r.status, 303);
  const h = await b.hero();
  assert.deepEqual([h.layout, h.photos, h.focus, h.banner_photo_id, h.banner_focus], ['tall_two_wide', [p1, p2, p3], ['top', 'middle', 'bottom'], banner, 'bottom']);
  const page = await b.live();
  assert.match(page, new RegExp(`<div class="banner f-bottom"><img src="/_kp/p/${banner}"`));
  assert.match(page, /<div class="hero-photos tall_two_wide frame-mat"><div class="box tall f-top">/);
  assert.match(page, /<div class="box wide f-middle">.*<div class="box wide f-bottom">/s);
  assert.ok(page.indexOf('class="banner') < page.indexOf('class="wrap hero'), 'the banner sits above the top section');

  // An empty box: the photos after it move up, and the site uses a layout for two.
  await b.post('/home/hero', { enabled: '1', headline: 'Bostons', layout: 'tall_two_wide', 'photos.0': p1, 'focus.0': 'top', 'photos.1': '', 'photos.2': p3, 'focus.2': 'bottom' });
  const two = await b.hero();
  assert.deepEqual([two.photos, two.focus, two.banner_photo_id], [[p1, p3], ['top', 'bottom'], undefined]);
  const page2 = await b.live();
  assert.match(page2, /<div class="hero-photos two_tall frame-mat"><div class="box tall f-top">/);
  assert.doesNotMatch(page2, /class="banner|hero-ph"/);
});

test('the frame she picks: a mat by default, a brass inner rule, or a leafy vine all round', async () => {
  const b = await breeder();
  const p1 = await b.upload();
  const html = await (await b.get('/home/hero')).text();
  assert.match(html, /<select id="f-frame" name="frame"><option value="mat" selected>A soft mat around each photo/);
  await b.post('/home/hero', { enabled: '1', layout: 'one_wide', 'photos.0': p1, frame: 'sprig' });
  const page = await b.live();
  assert.match(page, /<div class="hero-photos one_wide frame-sprig">.*<div class="vine" aria-hidden="true"><i class="t"><\/i><i class="b"><\/i><i class="l"><\/i><i class="r"><\/i><i class="c tl"><\/i>/s);
  for (const f of ['vine-h.svg', 'vine-v.svg', 'vine-c.svg']) {
    const r = await call(b.env, S, `/_kp/t/ak/${f}`);
    assert.equal(r.headers.get('content-type'), 'image/svg+xml', f);
  }
  await b.post('/home/hero', { enabled: '1', layout: 'one_wide', 'photos.0': p1, frame: 'double' });
  const page2 = await b.live();
  assert.match(page2, /frame-double/);
  assert.doesNotMatch(page2, /class="vine/);
  await assert.rejects(importContent(b.env, b.site.id, { home: { hero: { frame: 'gold' } } }), /home\.hero\.frame/);
});

test('no photos: no collage and no empty boxes, the words take the width', async () => {
  const b = await breeder();
  await b.post('/home/hero', { enabled: '1', headline: 'Bostons', layout: 'four_square' });
  const page = await b.live();
  assert.match(page, /class="wrap hero no-photos"/);
  assert.doesNotMatch(page, /hero-photos|hero-ph/);
});

test('the content document checks the layout and each box\'s part to keep', async () => {
  const b = await breeder();
  await assert.rejects(importContent(b.env, b.site.id, { home: { hero: { layout: 'collage' } } }), /home\.hero\.layout/);
  await assert.rejects(importContent(b.env, b.site.id, { home: { hero: { focus: ['left'] } } }), /home\.hero\.focus\[0\]/);
  await assert.rejects(importContent(b.env, b.site.id, { home: { hero: { banner_photo_id: 'nope' } } }), /no photo with id nope/);
});
