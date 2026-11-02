// Sharing (plan 5.4): a Share button on dog, litter, puppy and album pages, and the
// manage app's Share screen with each published page's link and QR code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { savePhoto } = await import('../src/photos.js');
const { qrSvg } = await import('../src/qr.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

async function breeder() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  const p = (await savePhoto(env, site.id, { full: webp(800, 600), alt: 'one' })).id;
  await importContent(env, site.id, { albums: [{ slug: 'gem-week-1', title: 'Gem week 1', litter: 'gem-2026', photos: [p], show_on_site: true }] });
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = (path) => call(env, M, `/s/akbostons${path}`, { headers: { cookie } });
  const post = (path) => call(env, M, `/s/akbostons${path}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams() });
  return { env, get, post, page: async (path) => (await call(env, SITE, path)).text() };
}

test('a QR code is an SVG of black squares on white, the same for the same address', () => {
  const a = qrSvg('https://akbostons.kennelport.com/');
  assert.match(a, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) \1"/);
  assert.match(a, /<rect width="100%" height="100%" fill="#fff"\/><path d="M4 4h1v1h-1z/, 'the finder pattern starts at the quiet zone');
  assert.equal(a, qrSvg('https://akbostons.kennelport.com/'));
  assert.notEqual(a, qrSvg('https://akbostons.kennelport.com/albums/gem-week-1'));
});

test('the Share screen lists the published site, litters and albums, each with a link and a QR code', async () => {
  const b = await breeder();
  assert.match(await (await b.get('')).text(), /Share<\/b><span>Links and QR codes/);
  assert.match(await (await b.get('/share')).text(), /Publish your site first/);
  await b.post('/publish');
  const html = await (await b.get('/share')).text();
  assert.match(html, /<b>AK Boston Terriers<\/b><p class="muted small share-link">https:\/\/akbostons\.kennelport\.com\/<\/p>/);
  assert.match(html, /<b>The Gem litter<\/b>/);
  assert.match(html, /data-copy="https:\/\/akbostons\.kennelport\.com\/albums\/gem-week-1"/);
  assert.match(html, /<img class="qr" src="\/s\/akbostons\/share\/qr\/album-gem-week-1\.svg"/);
  const qr = await b.get('/share/qr/album-gem-week-1.svg');
  assert.equal(qr.headers.get('content-type'), 'image/svg+xml');
  assert.equal(await qr.text(), qrSvg('https://akbostons.kennelport.com/albums/gem-week-1'));
  const dl = await b.get('/share/qr/site.svg?download');
  assert.match(dl.headers.get('content-disposition'), /attachment; filename="akbostons-site-qr\.svg"/);
  assert.equal((await b.get('/share/qr/album-nope.svg')).status, 404);
});

test('dog, litter, puppy and album pages carry a Share button, shown by the script', async () => {
  const b = await breeder();
  await b.post('/publish');
  for (const path of ['/dogs/willow', '/litters/gem-2026', '/litters/gem-2026/opal', '/albums/gem-week-1']) {
    assert.match(await b.page(path), /<p class="share-row[^"]*" data-share-row hidden><button type="button" class="btn line" data-share>Share<\/button>/, path);
  }
  assert.doesNotMatch(await b.page('/'), /data-share-row/);
});
