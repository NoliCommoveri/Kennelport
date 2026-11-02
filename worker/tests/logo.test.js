// The kennel's own logo (plan 3.12): chosen on Kennel details, shown in place of
// the monogram at the top and foot of every page once published, opening full size.
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
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  await post('/publish');
  return { env, site, get, post, page: async (p) => (await call(env, SITE, p)).text() };
}

// Kennel details as the form sends it, with a logo.
const details = (logo) => ({ kennel_name: 'AK Boston Terriers', tagline: 'The American Gentleman', monogram: 'AK', logo_photo_id: logo ?? '', dark_mode: 'auto' });

test('a logo replaces the monogram at the top and foot of every page, and opens full size', async () => {
  const b = await breeder();
  const { id } = await savePhoto(b.env, b.site.id, { full: webp(1000, 1000), thumb: webp(400, 400), alt: 'AK Boston Terriers logo' });
  const form = await (await b.get('/details')).text();
  assert.match(form, /Your logo/);
  assert.equal((await b.post('/details', details(id))).status, 303);
  assert.ok(b.env.DB.raw.prepare("SELECT 1 FROM photo_tags WHERE subject = 'page:logo' AND photo_id = ?").get(id), 'tagged as the logo');
  assert.doesNotMatch(await b.page('/'), /brand-logo/, 'not before publishing');
  assert.match(await (await b.get('/publish')).text(), /Kennel details: [^<]*\blogo\b[^<]* edited/);
  await b.post('/publish');

  const html = await b.page('/');
  assert.match(html, new RegExp(`<a class="brand-logo" href="/_kp/p/${id}" data-logo-zoom aria-label="Show the AK Boston Terriers logo full size"><img src="/_kp/p/${id}\\?s=t" alt="AK Boston Terriers logo" width="1000" height="1000"></a><a class="brand-name" href="/"`));
  assert.match(html, /<dialog class="logo-zoom" id="logo-zoom"/);
  assert.match(html, new RegExp(`<div class="foot-brand"><a class="brand" href="/"><span class="brand-logo"><img src="/_kp/p/${id}`));
  assert.doesNotMatch(html.slice(html.indexOf('<header'), html.indexOf('</header>')), /use href="#mono"/, 'no monogram in the header');
  assert.equal((await call(b.env, SITE, `/_kp/p/${id}`)).status, 200, 'the published site serves it');
  assert.equal((await call(b.env, SITE, `/_kp/p/${id}?s=t`)).status, 200);

  // Out in the content document, and back.
  const doc = await exportContent(b.env, b.site.id);
  assert.equal(doc.site.logo_photo_id, id);
  await assert.rejects(importContent(b.env, b.site.id, { site: { logo_photo_id: 'nope' } }), /no photo with id nope/);

  // Taken off: the monogram again.
  await b.post('/details', details(''));
  await b.post('/publish');
  const after = await b.page('/');
  assert.doesNotMatch(after, /brand-logo|logo-zoom/);
  assert.match(after, /use href="#mono"/);
});

test('only a photo on this site can be the logo', async () => {
  const b = await breeder();
  const res = await b.post('/details', details('not-a-photo'));
  assert.equal(res.status, 200);
  assert.match(await res.text(), /that photo is no longer on this site/);
});
