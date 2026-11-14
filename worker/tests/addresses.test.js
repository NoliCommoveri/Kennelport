// Page addresses (docs/plans/site-builder.md, "Page addresses", step 3.5;
// content/addresses.js): the breeder renames a page's address beside its menu name,
// every link follows, and the old address redirects (301) once published.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { publish, buildSnapshot, forgetSnapshots, draftChanges } = await import('../src/publish.js');
const { checkAddress, typedAddress, settleAddresses } = await import('../src/content/addresses.js');
const { pagePath, pageAt } = await import('../src/render/parts.js');

const M = 'manage.kennelport.com';
const S = 'akbostons.kennelport.com';
const SO = { origin: `https://${S}` };
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');

async function breeder() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await publish(env, site.id, 'test');
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = async (p) => (await call(env, M, `/s/akbostons${p}`, { headers: { cookie } })).text();
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  const visit = (p, init) => call(env, S, p, init);
  // Her page's top card as the screen draws it: its switch, menu name and address.
  const rename = (key, path, extra = {}) => post(`/pages/${key}`, { _part: key === 'contact' ? 'menu_label,path' : 'enabled,menu_label,path', enabled: '1', menu_label: '', path, ...extra });
  const go = async () => { forgetSnapshots(); await publish(env, site.id, 'test'); };
  return { env, site, get, post, visit, rename, go };
}

test('the rules: what an address may be', () => {
  const others = new Set(['/about', '/reviews', '/contact', '/our-story']);
  assert.equal(typedAddress('Our Story'), '/our-story');
  assert.equal(typedAddress(' /Meet-Us/ '), '/meet-us');
  assert.equal(typedAddress(''), null);
  assert.equal(checkAddress('/meet-us', { start: '/about', others }), '/meet-us');
  assert.equal(checkAddress('/about', { start: '/about', others }), null, 'its starting address is stored as none');
  assert.equal(checkAddress('', { start: '/about', others }), null);
  assert.throws(() => checkAddress('/litters/new', { start: '/about', others }), /one word or a few joined by hyphens/);
  for (const at of ['/waitlist', '/privacy', '/family', '/family-login', '/dogs', '/litters', '/albums', '/api']) {
    assert.throws(() => checkAddress(at, { start: '/about', others }), /is kept for a page of the site's own/, at);
  }
  assert.throws(() => checkAddress('our-story', { start: '/reviews', others }), /another page has \/our-story/);
  // Two pages with one address (an import, say): the first keeps it.
  const pages = settleAddresses({ about: {}, reviews: {}, waitlist: {} }, [], { about: '/meet-us', reviews: '/meet-us', waitlist: '/apply-now' });
  assert.equal(pages.about.path, '/meet-us');
  assert.equal(pages.reviews.path, undefined);
  assert.equal(pages.waitlist.path, undefined, 'the waitlist stays at /waitlist');
});

test('she renames a page: the address field, every link and the menu follow, and the old address redirects', async () => {
  const b = await breeder();
  let screen = await b.get('/pages/about');
  assert.match(text(screen), /Name in the menu .* Address Where this page is on your website\. Leave empty for \/about\./);
  assert.match(screen, /name="path" value="" maxlength="61" placeholder="\/about"/);
  // A menu name suggests an address made from it.
  await b.post('/pages/about', { _part: 'enabled,menu_label,path', enabled: '1', menu_label: 'Meet us', path: '' });
  assert.match(text(await b.get('/pages/about')), /From its menu name: \/meet-us/);

  assert.equal((await b.rename('about', 'Our Story', { menu_label: 'Meet us' })).status, 303);
  assert.equal(b.env.DB.raw.prepare("SELECT path FROM site_pages WHERE page = 'about'").get().path, '/our-story');
  assert.match(text(await b.get('/pages')), /Meet us \/our-story/);
  screen = await b.get('/pages/about');
  assert.match(screen, /name="path" value="\/our-story"/);
  assert.doesNotMatch(text(screen), /From its menu name/, 'no suggestion once it has its own');

  // Not live until Publish, which lists it.
  assert.equal((await b.visit('/about')).status, 200);
  const list = draftChanges ? await draftChanges(b.env, b.site.id) : null;
  if (list) assert.ok(list.some((l) => /now at \/our-story; the old address takes visitors there/.test(l.text) && l.path === '/our-story'), JSON.stringify(list));
  await b.go();

  const page = await b.visit('/our-story');
  assert.equal(page.status, 200);
  assert.match(text(await page.text()), /Our story|Meet us/);
  const old = await b.visit('/about');
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), '/our-story');
  const home = await (await b.visit('/')).text();
  assert.match(home, /<a href="\/our-story">Meet us<\/a>/);
  assert.match(home, /class="more" href="\/our-story">Read our full story/);
  assert.doesNotMatch(home, /href="\/about"/);
  const map = await (await b.visit('/sitemap.xml')).text();
  assert.match(map, /\/our-story</);
  assert.doesNotMatch(map, /\/about</);

  // Again: the oldest address goes straight to the newest.
  await b.rename('about', '/meet-us', { menu_label: 'Meet us' });
  await b.go();
  assert.equal((await b.visit('/about')).headers.get('location'), '/meet-us');
  assert.equal((await b.visit('/our-story')).headers.get('location'), '/meet-us');
  // And back: emptied, it's at /about again, and the others take visitors there.
  await b.rename('about', '', { menu_label: 'Meet us' });
  assert.equal(b.env.DB.raw.prepare("SELECT path FROM site_pages WHERE page = 'about'").get().path, null);
  await b.go();
  assert.equal((await b.visit('/about')).status, 200);
  assert.equal((await b.visit('/meet-us')).headers.get('location'), '/about');
  assert.equal(b.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM redirects WHERE old_path = '/about'").get().n, 0);
});

test('what she may not take is refused in her words, with what she typed kept', async () => {
  const b = await breeder();
  for (const [typed, said] of [
    ['/waitlist', /\/waitlist is kept for a page of your website's own\. Choose another address\./],
    ['dogs', /\/dogs is kept for a page of your website's own/],
    ['/litters/new', /An address is one word or a few joined by hyphens, like \/our-story/],
  ]) {
    const res = await b.rename('reviews', typed);
    assert.equal(res.status, 200, typed);
    const html = await res.text();
    assert.match(text(html), said, typed);
    assert.match(html, new RegExp(`name="path" value="${typed.replace(/\//g, '\\/')}"`), typed);
  }
  await b.rename('about', '/our-story');
  assert.match(text(await (await b.rename('reviews', '/our-story')).text()), /Another of your pages is at \/our-story\. Choose another address\./);
  assert.equal(b.env.DB.raw.prepare("SELECT path FROM site_pages WHERE page = 'reviews'").get()?.path ?? null, null);

  // The waitlist pages and Privacy keep theirs: no address to change, and she's told why.
  const wl = await b.get('/pages/waitlist');
  assert.doesNotMatch(wl, /name="path"/);
  assert.match(text(wl), /This page stays at \/waitlist: other places, like KennelOS, link to it\./);
  await b.post('/pages/waitlist', { _part: 'enabled,menu_label,path', enabled: '1', menu_label: 'Apply', path: '/apply-now' });
  assert.equal(b.env.DB.raw.prepare("SELECT path FROM site_pages WHERE page = 'waitlist'").get().path, null);
  assert.doesNotMatch(await b.get('/pages/waitlist_help'), /name="path"/);
});

test('the contact page renamed: its form posts there, an open old page still sends, and full registration links follow', async () => {
  const b = await breeder();
  await b.rename('contact', '/get-in-touch');
  await b.go();
  const html = await (await b.visit('/get-in-touch')).text();
  assert.match(html, /<form class="apply-form" method="post" action="\/get-in-touch#message"/);
  const send = (p) => b.visit(p, { method: 'POST', headers: { ...SO, 'cf-connecting-ip': '198.51.100.7' }, body: new URLSearchParams({ name: 'Megan Ross', email: 'megan@example.com', message: 'Hello' }) });
  let res = await send('/get-in-touch');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Thanks, Megan\./);
  // A page left open from before the rename posts to /contact: it still arrives.
  res = await send('/contact');
  assert.equal(res.status, 200);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 2);
  // Any other page takes no post.
  assert.equal((await send('/our-dogs')).status, 405);
  assert.equal((await send('/dogs')).status, 405);
  assert.equal((await b.visit('/contact')).headers.get('location'), '/get-in-touch');
  assert.doesNotMatch(await (await b.visit('/privacy')).text(), /href="\/contact"/);
  // The full registration link, and the contact form it opens filled in.
  const snap = await buildSnapshot(b.env, b.site.id);
  assert.equal(pagePath(snap, 'contact'), '/get-in-touch');
  assert.equal(pageAt(snap, '/get-in-touch'), 'contact');
  assert.equal(pageAt(snap, '/contact'), null);
  const reg = await b.visit('/get-in-touch?full-reg=gem-2026');
  assert.equal(reg.status, 200);
});

test('each address is its own: the puppies page renamed leaves older puppies, litters and pups where they are', async () => {
  const b = await breeder();
  await b.rename('litters', '/puppies');
  await b.rename('dogs', '/our-dogs');
  await b.go();
  assert.equal((await b.visit('/puppies')).status, 200);
  assert.equal((await b.visit('/litters')).headers.get('location'), '/puppies');
  for (const p of ['/litters/older', '/litters/gem-2026', '/litters/gem-2026/opal', '/dogs/willow', '/our-dogs']) assert.equal((await b.visit(p)).status, 200, p);
  assert.equal((await b.visit('/dogs')).headers.get('location'), '/our-dogs');
  const litter = await (await b.visit('/litters/gem-2026')).text();
  assert.match(litter, /class="breadcrumb center"><a href="\/puppies">/);
  const dog = await (await b.visit('/dogs/willow')).text();
  assert.match(dog, /class="breadcrumb"><a href="\/our-dogs">/);
});

test('content.json carries her addresses, and a snapshot from before them still renders at the starting ones', async () => {
  const b = await breeder();
  await b.rename('faq', '/questions');
  const doc = await exportContent(b.env, b.site.id);
  assert.equal(doc.pages.faq.path, '/questions');
  await importContent(b.env, b.site.id, { pages: { faq: { ...doc.pages.faq, path: '/common-questions' } } });
  assert.equal(b.env.DB.raw.prepare("SELECT path FROM site_pages WHERE page = 'faq'").get().path, '/common-questions');
  await assert.rejects(importContent(b.env, b.site.id, { pages: { waitlist: { path: '/apply' } } }), /fixed/);
  await assert.rejects(importContent(b.env, b.site.id, { pages: { faq: { path: '/a/b' } } }), /one word/);

  const old = await buildSnapshot(b.env, b.site.id);
  for (const k of Object.keys(old.pages)) delete old.pages[k].path;
  assert.equal(pagePath(old, 'faq'), '/faq');
  assert.equal(pageAt(old, '/faq'), 'faq');
});
