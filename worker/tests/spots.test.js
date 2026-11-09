// FAQ and badge spots as block settings (docs/plans/site-builder.md, step 3.6): the
// owner puts a FAQ spot or a badge row on any page, a page of hers included; the
// breeder's tick boxes, on each question and each product, list only the places
// the owner has made. Today's places are unchanged until the owner changes them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { loadBuild, saveBuild } = await import('../src/content/rules.js');
const { pageBlocks, withPage, addPage, spotPlaces, addable, fits } = await import('../src/content/blocks.js');
const { FAQ_PLACE_KEYS, BADGE_PLACE_KEYS } = await import('../src/content/model.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

async function breeder() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await importContent(env, site.id, { products: [
    { name: 'Puppy food', image_url: 'https://tlcpetpro.com/a.png', link_url: 'https://tlcpetpro.com/r', home_badge: true },
    { name: 'Sky Nanny', image_url: 'https://tlcpetpro.com/b.png', website_url: 'https://skynanny.com' },
  ] });
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = async (p) => (await call(env, M, `/s/akbostons${p}`, { headers: { cookie } })).text();
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: body instanceof URLSearchParams ? body : new URLSearchParams(body) });
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  const page = async (p) => (await call(env, SITE, p)).text();
  // The owner's build, changed as her admin view would.
  const build = async (fn) => saveBuild(env, site.id, fn(await loadBuild(env, site.id)));
  const faqId = row("SELECT id FROM expanders WHERE page = 'faq' AND heading LIKE 'What is the difference%'").id;
  const product = (name) => row('SELECT id FROM products WHERE site_id = ? AND name = ?', site.id, name).id;
  return { env, site, get, post, row, page, build, faqId, product };
}

test('with nothing changed, the places are today\'s exactly', () => {
  assert.deepEqual([...spotPlaces(null, 'faq')].sort(), [...FAQ_PLACE_KEYS].sort());
  assert.deepEqual([...spotPlaces(null, 'badges')].sort(), [...BADGE_PLACE_KEYS].sort());
});

test('a FAQ spot and a badge row fit any page, hers included, once each', () => {
  for (const key of ['reviews', 'products', 'faq', 'albums', 'x-our-dams']) {
    assert.ok(fits(key, { id: 'faq', type: 'faq' }), key);
    assert.ok(fits(key, { id: 'badges', type: 'badges' }), key);
    assert.ok(!fits(key, { id: 'faq-2', type: 'faq' }), `${key}: one spot, keyed by its type`);
  }
  // Videos and posts stay where today's pages have them.
  assert.ok(!fits('x-our-dams', { id: 'embeds', type: 'embeds' }));
  assert.ok(!fits('reviews', { id: 'embeds', type: 'embeds' }));
  const offered = (key) => addable(key, pageBlocks(null, key)).map((x) => x.type);
  assert.ok(offered('reviews').includes('faq') && offered('reviews').includes('badges'));
  assert.ok(!offered('contact').includes('faq'), 'Contact already has its spot');
});

test('a spot on her page: the breeder ticks it, and the page shows her question and badge', async () => {
  const b = await breeder();
  let id;
  await b.build((x) => {
    const out = addPage(x, { name: 'Our dams', start: 'dams' });
    id = out.id;
    return withPage(out.build, id, [...pageBlocks(out.build, id), { id: 'faq', type: 'faq' }, { id: 'badges', type: 'badges' }]);
  });
  const form = await b.get(`/lists/faq/${b.faqId}`);
  assert.match(form, new RegExp(`name="places" value="${id}"> <span>Our dams page</span>`));
  const prod = await b.get(`/lists/products/${b.product('Sky Nanny')}`);
  assert.match(prod, new RegExp(`name="badge_places" value="${id}"> <span>Our dams page</span>`));

  const body = new URLSearchParams({ heading: 'What is the difference?', body: 'Limited means pet only.' });
  body.append('places', 'litter');
  body.append('places', id);
  assert.equal((await b.post(`/lists/faq/${b.faqId}`, body)).status, 303);
  assert.deepEqual(JSON.parse(b.row('SELECT places FROM expanders WHERE id = ?', b.faqId).places), ['litter', id]);
  assert.match(await b.get('/lists/faq'), /also on every litter&#39;s page, our dams page/);
  const p = new URLSearchParams({ name: 'Sky Nanny', image_url: 'https://tlcpetpro.com/b.png', website_url: 'https://skynanny.com' });
  p.append('badge_places', id);
  assert.equal((await b.post(`/lists/products/${b.product('Sky Nanny')}`, p)).status, 303);

  await b.post('/publish');
  const html = await b.page('/our-dams');
  assert.match(html, /Limited means pet only\./);
  assert.match(html, /We recommend[\s\S]*Sky Nanny/);
  // The spot shows in the order the owner placed it: after the dog cards.
  assert.ok(html.indexOf('Limited means pet only.') > html.indexOf('Willow'), 'after the dams');
  assert.ok(html.indexOf('We recommend') > html.indexOf('Limited means pet only.'));
});

test('the tick boxes list only the places the owner made; one taken away keeps her tick', async () => {
  const b = await breeder();
  // Home has a FAQ spot today; the owner takes it off Home and adds one to Reviews.
  await b.build((x) => withPage(withPage(x, 'home', pageBlocks(x, 'home').filter((bl) => bl.type !== 'faq')), 'reviews', [...pageBlocks(x, 'reviews'), { id: 'faq', type: 'faq' }]));
  const body = new URLSearchParams({ heading: 'What is the difference?', body: 'Limited means pet only.' });
  body.append('places', 'home');
  // (home isn't offered now, but an old form or an import may still carry it)
  assert.equal((await b.post(`/lists/faq/${b.faqId}`, body)).status, 303);
  const form = await b.get(`/lists/faq/${b.faqId}`);
  assert.doesNotMatch(form, /<span>Home page<\/span>/);
  assert.match(form, /name="places" value="reviews"> <span>Reviews page<\/span>/);
  assert.match(form, /<input type="hidden" name="places" value="home">/, 'kept, unseen');
  // Saving the form as drawn keeps it.
  const again = new URLSearchParams({ heading: 'What is the difference?', body: 'Limited means pet only.' });
  for (const m of form.matchAll(/<input type="hidden" name="places" value="([^"]+)">/g)) again.append('places', m[1]);
  again.append('places', 'reviews');
  await b.post(`/lists/faq/${b.faqId}`, again);
  assert.deepEqual(JSON.parse(b.row('SELECT places FROM expanders WHERE id = ?', b.faqId).places), ['home', 'reviews']);
  await b.post('/publish');
  assert.doesNotMatch(await b.page('/'), /Limited means pet only\./, 'no spot on Home, so it hides');
  assert.match(await b.page('/reviews'), /Limited means pet only\./);
  // The spot back on Home: her tick is still there.
  await b.build((x) => withPage(x, 'home', pageBlocks(null, 'home')));
  await b.post('/publish');
  assert.match(await b.page('/'), /Limited means pet only\./);
});

test('no badge row on Home: her Home badge switch is kept but not offered', async () => {
  const b = await breeder();
  const id = b.product('Puppy food');
  assert.match(await b.get(`/lists/products/${id}`), /Show as a badge on my home page/);
  await b.build((x) => withPage(x, 'home', pageBlocks(x, 'home').filter((bl) => bl.type !== 'badges')));
  const form = await b.get(`/lists/products/${id}`);
  assert.doesNotMatch(form, /Show as a badge on my home page/);
  assert.match(form, /<input type="hidden" name="home_badge" value="1">/);
});

test('with no page holding a spot, the tick boxes say so', async () => {
  const b = await breeder();
  await b.build((x) => {
    let out = x;
    for (const key of ['home', 'contact', 'dogs', 'litters', 'how_it_works', 'extras', 'pickup', 'waitlist']) out = withPage(out, key, pageBlocks(out, key).filter((bl) => bl.type !== 'faq'));
    for (const kind of ['dog', 'litter', 'puppy']) {
      const D = { dog: { above: [], side: ['name'], below: [] }, litter: { head: [], body: [] }, puppy: { above: [], side: ['name'], below: [] } }[kind];
      out = { ...out, profiles: { ...(out.profiles ?? {}), [kind]: { parts: D } } };
    }
    return out;
  });
  const form = await b.get(`/lists/faq/${b.faqId}`);
  assert.match(form, /No page of your site has a place for these yet\./);
  assert.match(form, /<input type="hidden" name="places" value="litter">/);
});

test('a place that isn\'t a page is refused on import; a page of hers is kept', async () => {
  const b = await breeder();
  await assert.rejects(importContent(b.env, b.site.id, { expanders: { faq: [{ heading: 'Q', body: 'A', places: ['nowhere'] }] } }), /not a page of this site/);
  await importContent(b.env, b.site.id, { expanders: { faq: [{ heading: 'Q', body: 'A', places: ['x-our-dams', 'puppy', 'home'] }] } });
  assert.deepEqual(JSON.parse(b.row("SELECT places FROM expanders WHERE page = 'faq' AND heading = 'Q'").places), ['home', 'puppy', 'x-our-dams']);
});
