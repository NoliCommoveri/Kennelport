// Getting your pup home (/pickup, plan 3.5): her words on pickup, transport and
// travel day; her transport services as badges there (never on Recommended
// products); and a product's badge (logo, web address under it) on the other
// pages she ticks, at most two per page. Plus the KennelOS bundle's 'transport'
// section: a product's website and transport flag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { jpeg } from './helpers/images.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { cleanBundle, SECTIONS } = await import('../src/kennelos/bundle.js');
const { badgeAddress } = await import('../src/content/model.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';
const png = () => new Uint8Array(0);
const LOGO = 'https://tlcpetpro.com/api/Files/file-by-guid?guid=29e343b1-6389-40a2-bb1b-1bdba5c30981&size=2';

async function breeder() {
  forgetSnapshots();
  const fetched = [];
  const env = await makeEnv({
    EMBED_FETCH: async (url) => {
      fetched.push(url);
      if (url.startsWith('https://other.example/')) return new Response(jpeg(400, 300));
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

const productId = (b, name) => b.env.DB.raw.prepare('SELECT id FROM products WHERE name = ?').get(name).id;

test('the page shows once she has words; transport services are badges there, not on Recommended products', async () => {
  const b = await breeder();
  assert.equal((await b.page('/pickup')).status, 404, 'no words yet: no page');
  await b.post('/lists/products/new', { name: 'Sky Nanny', link_url: 'https://skynanny.example/r/ak', website_url: 'https://www.skynanny.example/', code: 'AK5', transport: '1', image_url: LOGO });
  await b.post('/lists/products/new', { name: 'Pup Van', website_url: 'https://pupvan.example/', transport: '1' });
  await b.post('/publish');
  assert.equal((await b.page('/pickup')).status, 404, 'transport services alone don\'t make the page');
  const r = await b.post('/pages/pickup', { enabled: '1', pickup_text: 'Pickup is at our home on a Saturday.\n\nAllow an hour.', transport_text: 'We work with a flight nanny.', badges_heading: 'Who we fly with' });
  assert.equal(r.status, 303);
  await b.post('/publish');
  const html = await (await b.page('/pickup')).text();
  assert.match(html, /<h1>Getting your pup home<\/h1>/);
  assert.match(html, /Picking up your puppy<\/h2>[\s\S]*Pickup is at our home on a Saturday\.<\/p><p>Allow an hour\.<\/p>/);
  assert.match(html, /id="transport"[\s\S]*We work with a flight nanny[\s\S]*Who we fly with/, 'the services sit under her transport words');
  assert.ok(!/id="travel"/.test(html), 'a section with no words is left out');
  assert.match(html, /<span class="badge-label">Sky Nanny<\/span><a class="badge-addr" href="https:\/\/skynanny\.example\/r\/ak"[^>]*>skynanny\.example<\/a>/, 'its name, then the address from its website, under the logo');
  assert.match(html, /Use code <b>AK5<\/b>/);
  assert.match(html, /<span class="badge-name">Pup Van<\/span><span class="badge-addr">pupvan\.example<\/span>/, 'no picture: its name in the logo\'s place, not twice');
  const rec = await b.page('/recommended');
  if (rec.status === 200) assert.ok(!/Sky Nanny|Pup Van/.test(await rec.text()), 'never on Recommended products');
  const menu = await (await b.page('/')).text();
  assert.match(menu, /href="\/pickup"/, 'in the menu');
});

test('badges on other pages: the pages she ticks, a picture needed, two per page', async () => {
  const b = await breeder();
  const r1 = await b.post('/lists/products/new', [['name', 'Kong'], ['link_url', 'https://kong.example/r'], ['image_url', LOGO], ['badge_places', 'litters'], ['badge_places', 'extras']]);
  assert.equal(r1.status, 303);
  const noPic = await (await b.post('/lists/products/new', [['name', 'Bare'], ['badge_places', 'litters']])).text();
  assert.match(noPic, /a badge needs a picture/);
  await b.post('/lists/products/new', [['name', 'Two'], ['image_url', LOGO], ['badge_places', 'litters']]);
  const three = await (await b.post('/lists/products/new', [['name', 'Three'], ['image_url', LOGO], ['badge_places', 'litters']])).text();
  assert.match(three, /Puppies page shows at most 2 badges/);
  await b.post('/publish');
  const extras = await (await b.page('/extras')).text();
  assert.match(extras, /class="badges badges-row"[^>]*><span class="eyebrow">We recommend<\/span><ul class="badges-1"><li><a class="badge-pic" href="https:\/\/kong\.example\/r"/);
  assert.match(extras, /<span class="badge-label">Kong<\/span><a class="badge-addr" href="https:\/\/kong\.example\/r"[^>]*>kong\.example<\/a>/);
  const home = await (await b.page('/')).text();
  assert.ok(!home.includes('kong.example'), 'Home only with its own switch');
  assert.ok(productId(b, 'Kong'));
});

test('a badge\'s address: its website, else its link, as a bare host', () => {
  assert.equal(badgeAddress({ website_url: 'https://www.skynanny.com/about', link_url: 'https://bit.ly/x' }), 'skynanny.com');
  assert.equal(badgeAddress({ link_url: 'https://kong.example/r?a=1' }), 'kong.example');
  assert.equal(badgeAddress({}), null);
});

test('the KennelOS bundle: a product\'s website and transport flag, in the transport section', () => {
  assert.ok(SECTIONS.includes('transport'));
  const b = cleanBundle({ format: 1, bundle_id: 'bundle-0001', kennel_id: 'k', products: [
    { id: 't1', name: 'Sky Nanny', link_url: 'https://skynanny.example/', website: 'https://skynanny.example/', transport: true },
    { id: 'a1', name: 'TLC', link_url: 'https://tlc.example/', code: 'AK10' },
  ] });
  assert.equal(b.products[0].transport, 1);
  assert.equal(b.products[0].website, 'https://skynanny.example/');
  assert.equal(b.products[1].transport, null);
  assert.throws(() => cleanBundle({ format: 1, bundle_id: 'bundle-0001', kennel_id: 'k', products: [{ id: 'x', name: 'X', password: 'p' }] }), /bad_bundle/);
});
