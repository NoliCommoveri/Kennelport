// Photo boxes that are given a shape: the Home Story block's photo, and the dog
// and puppy pages'. The shape only holds while the stylesheet sets `height: auto`
// beside the ratio: the <img> carries the photo's own width and height, and that
// height would otherwise win, leaving the photo as tall as its own pixels and
// zoomed right in to fill the column (worst on a phone, where the column is the
// whole screen). And where there is no photo, nothing is drawn in its place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { publish, forgetSnapshots } = await import('../src/publish.js');
const { savePhoto } = await import('../src/photos.js');

const S = 'akbostons.kennelport.com';

async function site({ storyPhoto = true } = {}) {
  forgetSnapshots();
  const env = await makeEnv();
  const row = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const photo = (await savePhoto(env, row.id, { full: webp(1200, 1600), thumb: webp(300, 400), alt: 'Ziva' })).id;
  const doc = structuredClone(AK_SAMPLE);
  if (storyPhoto) doc.home.story = { ...doc.home.story, photo_id: photo };
  for (const d of doc.dogs ?? []) d.photo_id = photo;
  await importContent(env, row.id, doc);
  await publish(env, row.id, 'test');
  return { env, photo, dog: doc.dogs[0] };
}

const rule = (css, selector) => css.split('\n').find((l) => l.trimStart().startsWith(`${selector} {`)) ?? '';

test('the story photo is a 4:5 photo in the block, at its own size, not the photo\'s pixel height', async () => {
  const { env, photo } = await site();
  const page = await (await call(env, S, '/')).text();
  // The photo sits in .story, carrying its own width and height, so the rule below
  // is what decides its shape.
  assert.match(page, new RegExp(`<div class="wrap story"><img src="/_kp/p/${photo}"[^>]*width="1200" height="1600"`));

  const css = await (await call(env, S, '/_kp/t/ak/site.css')).text();
  const img = rule(css, '.story img');
  assert.match(img, /aspect-ratio: 4\/5;/);
  assert.match(img, /height: auto;/, 'without height: auto the photo keeps its own pixel height and is zoomed in to fill the column');
  assert.match(img, /object-fit: cover;/);
});

test('on a phone the story photo is shrunk and centred, not run across the screen', async () => {
  const { env } = await site();
  const css = await (await call(env, S, '/_kp/t/ak/site.css')).text();
  const phone = css.split('\n').find((l) => l.startsWith('@media (max-width: 860px) { .story ')) ?? '';
  assert.match(phone, /\.story \{ grid-template-columns: 1fr; \}/); // the words go under it
  assert.match(phone, /\.story img \{ max-width: 300px; justify-self: center; \}/);
  // No phone-only ratio: one shape at every width, so there is one shape to pick a
  // photo for.
  assert.doesNotMatch(phone, /aspect-ratio/);
});

test('no story photo folds the block: the words take the width, and no empty box is drawn', async () => {
  const { env } = await site({ storyPhoto: false });
  const page = await (await call(env, S, '/')).text();
  assert.match(page, /<div class="wrap story no-photo"><div class="story-copy">/);
  assert.doesNotMatch(page, /story-ph/);

  const css = await (await call(env, S, '/_kp/t/ak/site.css')).text();
  assert.match(rule(css, '.story.no-photo'), /grid-template-columns: 1fr;/);
  assert.doesNotMatch(css, /story-ph/, 'the flat grey filler is gone from the template');
});

test('the dog and puppy page photos keep their 4:5 too, not the photo\'s pixel height', async () => {
  const { env, dog, photo } = await site();
  const page = await (await call(env, S, `/dogs/${dog.slug}`)).text();
  assert.match(page, new RegExp(`<div class="dogpage"><img src="/_kp/p/${photo}"[^>]*width="1200" height="1600"[^>]*class="photo"`));

  const css = await (await call(env, S, '/_kp/t/ak/site.css')).text();
  const box = rule(css, '.dogpage .photo');
  assert.match(box, /aspect-ratio: 4 \/ 5;/);
  assert.match(box, /height: auto;/, 'without height: auto the photo keeps its own pixel height and is zoomed in');
});
