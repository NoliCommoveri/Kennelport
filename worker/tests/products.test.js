// Recommended products: a page of referral links and codes, and up to two of them
// as badges right under the Home banner. A brand's embed code is read for its link
// and picture only; the HTML is never kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { jpeg } from './helpers/images.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { readBadgeCode } = await import('../src/badgeCode.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

// A tiny PNG: signature, IHDR (width, height), IEND.
function png(width, height) {
  const chunk = (type, data) => {
    const b = new Uint8Array(12 + data.length);
    new DataView(b.buffer).setUint32(0, data.length);
    b.set([...type].map((c) => c.charCodeAt(0)), 4);
    b.set(data, 8);
    return b;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, width);
  new DataView(ihdr.buffer).setUint32(4, height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

const TLC = `<a
href="https://tlcpetfood.com/nutrition/akbostonterriers" target="_blank" rel="noopener">
  <img
src="https://tlcpetpro.com/api/Files/file-by-guid?guid=29e343b1-6389-40a2-bb1b-1bdba5c30981&amp;size=2" alt="TLC Pet Food Heritage Green Logo" width="200" style="max-width:100%;height:auto;border:0;">
</a>`;

test('embed code: the link, the picture and its alt are read; nothing else', () => {
  assert.deepEqual(readBadgeCode(TLC), {
    link: 'https://tlcpetfood.com/nutrition/akbostonterriers',
    image: 'https://tlcpetpro.com/api/Files/file-by-guid?guid=29e343b1-6389-40a2-bb1b-1bdba5c30981&size=2',
    alt: 'TLC Pet Food Heritage Green Logo',
  });
  assert.deepEqual(readBadgeCode("<a href='https://x.example/r'>Shop</a>"), { link: 'https://x.example/r', image: null, alt: null });
  assert.equal(readBadgeCode('<a href="javascript:alert(1)"><img src="https://x.example/a.png"></a>').link, null);
  assert.equal(readBadgeCode('<a href="https://x.example/"><img src="http://x.example/a.png"></a>').image, null, 'only https pictures are fetched');
  assert.throws(() => readBadgeCode('hello'), /No link or picture/);
});

async function breeder() {
  forgetSnapshots();
  const fetched = [];
  const env = await makeEnv({
    EMBED_FETCH: async (url) => {
      fetched.push(url);
      if (url.startsWith('https://tlcpetpro.com/')) return new Response(jpeg(400, 300));
      if (url.startsWith('https://png.example/')) return new Response(png(400, 300));
      return new Response('no', { status: 404 });
    },
  });
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
  return { env, site, get, post, fetched, page: async (p) => call(env, SITE, p) };
}

test('pasting the embed code fills in the product; it shows on its page and as a Home badge', async () => {
  const b = await breeder();
  assert.match(await (await b.get('/lists/products/new')).text(), /Or paste the embed code they gave you/);
  const res = await b.post('/lists/products/new', { name: '', grp: 'Food', code: 'AKBOSTON', code_note: 'for 10% off', home_badge: '1', _badge_code: TLC });
  assert.equal(res.status, 303, await res.clone().text());
  const p = b.env.DB.raw.prepare('SELECT * FROM products').get();
  assert.equal(p.name, 'TLC Pet Food Heritage Green Logo', 'named from the alt text when left empty');
  assert.equal(p.link_url, 'https://tlcpetfood.com/nutrition/akbostonterriers');
  assert.equal(b.env.DB.raw.prepare('SELECT alt FROM photos WHERE id = ?').get(p.photo_id).alt, 'TLC Pet Food Heritage Green Logo');
  assert.equal(p.home_badge, 1);
  assert.equal((await b.page('/recommended')).status, 404, 'not before publishing');

  await b.post('/publish');
  const home = await (await b.page('/')).text();
  assert.match(home, new RegExp(`<section class="wrap badges" aria-label="Recommended"><ul class="badges-1"><li><a href="https://tlcpetfood.com/nutrition/akbostonterriers" target="_blank" rel="noopener sponsored"><img src="/_kp/p/${p.photo_id}"`));
  assert.ok(home.indexOf('class="banner') < 0 || home.indexOf('class="banner') < home.indexOf('class="wrap badges"'), 'under the banner');
  assert.ok(home.indexOf('class="wrap badges"') < home.indexOf('class="wrap hero'), 'above the rest of the top block');
  const page = await b.page('/recommended');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Use code <b>AKBOSTON<\/b> <span class="small muted">for 10% off<\/span>/);
  assert.match(html, /<a class="btn line" href="https:\/\/tlcpetfood\.com\/nutrition\/akbostonterriers" target="_blank" rel="noopener sponsored">Shop now<\/a>/);
  assert.match(html, /href="\/recommended"/, 'in the menu');
  assert.doesNotMatch(html, /tlcpetpro\.com/, 'the picture is the site\'s own copy');
  assert.equal((await b.page(`/_kp/p/${p.photo_id}`)).headers.get('content-type'), 'image/jpeg');
});

test('at most two badges, each needing a picture; a picture that can\'t be fetched says so', async () => {
  const b = await breeder();
  const pic = '<a href="https://other.example/r"><img src="https://tlcpetpro.com/other.jpg" alt="Other"></a>';
  assert.equal((await b.post('/lists/products/new', { name: 'One', home_badge: '1', _badge_code: pic })).status, 303);
  assert.equal((await b.post('/lists/products/new', { name: 'Two', home_badge: '1', _badge_code: TLC })).status, 303);
  const third = await (await b.post('/lists/products/new', { name: 'Three', home_badge: '1', _badge_code: pic })).text();
  assert.match(third, /at most 2 badges/);
  const noPic = await (await b.post('/lists/products/new', { name: 'Four', home_badge: '1' })).text();
  assert.match(noPic, /needs a picture/);
  const broken = await (await b.post('/lists/products/new', { name: 'Five', _badge_code: '<a href="https://x.example/"><img src="https://missing.example/a.png"></a>' })).text();
  assert.match(broken, /couldn(&#39;|')t be fetched/);
  // A PNG logo can't be copied: the link stays filled in, for her to add the picture herself.
  const asPng = await (await b.post('/lists/products/new', { name: '', _badge_code: '<a href="https://six.example/r"><img src="https://png.example/logo.png" alt="Six"></a>' })).text();
  assert.match(asPng, /Your link is filled in, but the picture in that code can(&#39;|')t be copied \(Only WebP or JPEG photos can be uploaded\)/);
  assert.match(asPng, /value="https:\/\/six\.example\/r"/);
  assert.match(asPng, /value="Six"/);
  assert.equal(b.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM products WHERE name IN ('Five', 'Six')").get().n, 0);
  await b.post('/publish');
  assert.match(await (await b.page('/')).text(), /<ul class="badges-2"><li>.*<\/li><li>.*<\/li><\/ul>/);
  assert.match(await (await b.get('/lists/products')).text(), /home page badge/);
});

test('products go out in the content document and come back in', async () => {
  const b = await breeder();
  await b.post('/lists/products/new', { name: 'Kong', link_url: 'https://kong.example/', code: 'AK5' });
  const doc = await exportContent(b.env, b.site.id);
  assert.deepEqual(doc.products, [{ name: 'Kong', link_url: 'https://kong.example/', code: 'AK5', home_badge: false }]);
  await importContent(b.env, b.site.id, { products: [...doc.products, { name: 'Bed' }] });
  assert.deepEqual(b.env.DB.raw.prepare('SELECT name FROM products ORDER BY sort').all().map((x) => x.name), ['Kong', 'Bed']);
  await assert.rejects(importContent(b.env, b.site.id, { products: [{ name: 'X', home_badge: true }] }), /needs a photo_id/);
});
