// Pages as blocks (docs/Site_Builder_Plan.md, step 2; content/blocks.js): with no
// build, Home and every other page are today's; the owner's admin view places, orders, adds
// and removes its blocks, sets each data block's records and what its cards show;
// the breeder's switches keep working. Checked on the demo site (linked sample).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { homeBlocks, HOME_DEFAULT, withHome, withPage, pageBlocks, cleanBlock, newBlock, PAGE_DEFAULTS, PAGE_PARTS, addable } = await import('../src/content/blocks.js');
const { PAGES } = await import('../src/content/model.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { loadBuild } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';
const form = (o) => new URLSearchParams(o);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

async function demo(t) {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2027-03-10T15:00:00Z') });
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
  const admin = cookies.find((c) => c.startsWith('kp_admin='));
  const made = await call(env, M, '/ops/sites/demo', { method: 'POST', headers: { cookie: cookies.find((c) => c.startsWith('ops_session=')) } });
  const id = made.headers.get('location').match(/sites\/([0-9a-f-]{36})/)[1];
  const sub = env.DB.raw.prepare('SELECT subdomain FROM sites WHERE id = ?').get(id).subdomain;
  const at = (page) => `/admin/${sub}/pages/${page}`;
  const path = at('home');
  const get = async (p = path) => (await call(env, M, p, { headers: { cookie: admin } })).text();
  // The form as the page draws it (the open block's fields too), with changes, and a press.
  const post = async (changes = {}, { open = null, act = null, page = 'home' } = {}) => {
    const path = at(page);
    const html = await get(open ? `${path}?open=${open}` : path);
    const body = new URLSearchParams();
    const inputs = [...html.matchAll(/<input([^>]*)>/g)].map((m) => m[1]);
    for (const a of inputs) {
      const name = a.match(/name="([^"]+)"/)?.[1];
      if (!name || / disabled/.test(a)) continue;
      const type = a.match(/type="([^"]+)"/)?.[1];
      const value = a.match(/value="([^"]*)"/)?.[1] ?? 'on';
      if ((type === 'checkbox' || type === 'radio') && !/ checked/.test(a)) continue;
      body.append(name, value.replace(/&amp;/g, '&'));
    }
    for (const m of html.matchAll(/<select name="([^"]+)">([\s\S]*?)<\/select>/g)) body.append(m[1], m[2].match(/<option value="([^"]*)" selected/)?.[1] ?? m[2].match(/<option value="([^"]*)"/)[1]);
    for (const [k, v] of Object.entries(changes)) {
      body.delete(k);
      for (const x of [].concat(v)) if (x !== null) body.append(k, x);
    }
    if (act) body.set('act', act);
    const r = await call(env, M, path, { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body });
    assert.equal(r.status, 303, await r.clone().text());
    return r.headers.get('location');
  };
  const render = async (p) => renderPage(await buildSnapshot(env, id), { path: p, origin: 'https://x', today: '2027-03-10', preview: true, portal: true }).html;
  const home = () => render('/');
  return { env, id, sub, admin, get, post, home, render, at, build: () => loadBuild(env, id) };
}

const order = (html, names) => names.map((n) => html.indexOf(n)).every((x, i, a) => x >= 0 && (i === 0 || x > a[i - 1]));

test('with no build, Home is today\'s Home; saving today\'s blocks stores nothing', () => {
  assert.deepEqual(homeBlocks(null).map((b) => b.id), ['hero', 'facts', 'badges', 'faq', 'story', 'dogs', 'litters', 'reviews', 'embeds', 'waitlist']);
  assert.deepEqual(homeBlocks({}), HOME_DEFAULT.map(cleanBlock));
  assert.equal(homeBlocks(null).find((b) => b.id === 'litters').limit, 2);
  assert.deepEqual(withHome({ rules: { x: 1 } }, homeBlocks(null)), { rules: { x: 1 } });
  // A saved block that isn't valid is dropped; a second story is too (she has one).
  assert.deepEqual(homeBlocks({ pages: { home: { blocks: [{ id: 'story', type: 'text' }, { id: 'x', type: 'nope' }, { id: 'story-2', type: 'text' }, newBlock('dogs', 'dogs-2')] } } }).map((b) => b.id), ['story', 'dogs-2']);
});

test('the Home editor: moves, opens a block, and back to today\'s Home', async (t) => {
  const { sub, get, post, home, build } = await demo(t);
  const path = `/admin/${sub}/pages/home`;
  const page = await get();
  assert.match(text(page), /Blocks, top to bottom/);
  for (const n of ['Banner and collage', 'Facts row', 'Badge row', 'FAQ spot', 'Photo and words', 'Dog cards', 'Litter cards', 'Reviews', 'Videos and posts', 'Call-to-action band']) assert.match(page, new RegExp(n));
  assert.match(text(page), /This is today's Home/);
  const before = await home();
  assert.ok(order(before, ['Meet our dogs', 'Current and upcoming']));

  // Litters up above the dogs.
  assert.match(await post({}, { act: 'mv:litters:up' }), /saved=1/);
  assert.deepEqual((await build()).pages.home.blocks.map((b) => b.id).slice(5, 7), ['litters', 'dogs']);
  assert.ok(order(await home(), ['Current and upcoming', 'Meet our dogs']));

  // Settings opens one block, keeping the page as it was.
  assert.match(await post({}, { act: 'open:dogs' }), /open=dogs#b-dogs/);
  const open = await get(`${path}?open=dogs`);
  assert.match(text(open), /Which dogs .*Shows 5 dogs : Clover\*, Maple\*, Juniper\*, Wren\*, Atlas\*/);
  assert.match(open, /<option value="all" selected>All of them<\/option>/);

  // Back to today's: nothing stored, Home as before.
  await post({}, { act: 'default' });
  assert.equal((await build()).pages, undefined);
  assert.equal(await home(), before);
});

test('a Dog cards block: its filters, style, how many and what its cards show', async (t) => {
  const { post, home } = await demo(t);
  await post({ 'b.dogs.f.sex': 'female', 'b.dogs.limit': '2', 'b.dogs.style': 'flip' }, { open: 'dogs' });
  let h = await home();
  const section = h.slice(h.indexOf('Meet our dogs'), h.indexOf('Current and upcoming'));
  assert.match(section, /class="grid"/);
  assert.deepEqual([...section.matchAll(/class="call">([^<]+)</g)].map((m) => m[1]).filter((x, i, a) => a.indexOf(x) === i), ['Clover*', 'Maple*']);

  // Titles off the front; bio first on the back.
  await post({ 'b.dogs.show.front.titles': null, 'b.dogs.show.back': 'bio,call,reg,tests,ask,profile,photo,role,titles' }, { open: 'dogs' });
  h = await home();
  const card = h.slice(h.indexOf('class="flip"'), h.indexOf('class="flip"', h.indexOf('class="flip"') + 10));
  assert.doesNotMatch(card.slice(0, card.indexOf('face back')), /<span class="line1"><span>[^<]*<\/span><span>/);
  assert.ok(card.indexOf('class="bio"') < card.lastIndexOf('class="call"') || !/class="bio"/.test(card));

  // Up and coming only: Pippa*.
  await post({ 'b.dogs.f.sex': 'any', 'b.dogs.f.upcoming': 'only', 'b.dogs.limit': 'all' }, { open: 'dogs' });
  assert.match(text(await home()), /Meet our dogs .*Pippa\*/);
  // No status: refused, nothing saved.
  const r = await post({ 'b.dogs.f.status': null }, { open: 'dogs' }).catch((e) => e);
  assert.ok(r instanceof Error && /needs at least one status/.test(r.message));
});

test('Litter cards: stage, how many, and its rows; an added block, removed again', async (t) => {
  const { post, home, build } = await demo(t);
  await post({ 'b.litters.limit': 'all', 'b.litters.show.rows.price': null, 'b.litters.show.rows.deposit': null, 'b.litters.show.names': '0' }, { open: 'litters' });
  let h = await home();
  const band = h.slice(h.indexOf('Current and upcoming'));
  assert.ok((band.match(/<article class="litter">/g) ?? []).length > 2);
  assert.doesNotMatch(band.slice(0, band.indexOf('View all puppies')), /<dt>(Price|Deposit)<\/dt>/);

  // Add a Dog cards block for the girls, at the bottom.
  await post({}, { act: 'add:dogs' });
  let blocks = (await build()).pages.home.blocks;
  assert.equal(blocks.at(-1).id, 'dogs-2');
  await post({ 'b.dogs-2.f.sex': 'female', 'b.dogs-2.w.heading': 'Our girls', 'b.dogs-2.w.eyebrow': 'Dams' }, { open: 'dogs-2' });
  h = await home();
  assert.match(text(h), /Dams Our girls .*Clover\*/);
  assert.ok(order(h, ['Hoping for a puppy', 'Our girls']));
  await post({}, { open: 'dogs-2', act: 'remove:dogs-2' });
  blocks = (await build()).pages.home.blocks;
  assert.ok(!blocks.some((b) => b.id === 'dogs-2'));
  assert.doesNotMatch(await home(), /Our girls/);
});

test('her switches still work on a moved block; the editor is admin only', async (t) => {
  const { env, id, sub, post, home } = await demo(t);
  await post({}, { act: 'mv:dogs:up' });
  env.DB.raw.prepare("INSERT INTO home_blocks (site_id, block, enabled) VALUES (?, 'dogs', 0) ON CONFLICT (site_id, block) DO UPDATE SET enabled = 0").run(id);
  assert.doesNotMatch(await home(), /Meet our dogs/);
  for (const p of [`/admin/${sub}/pages`, `/admin/${sub}/pages/home`]) assert.notEqual((await call(env, M, p)).status, 200);
});

// ---------- the other pages ----------

test('every page but Privacy has its blocks; with no build each is today\'s, and saving today\'s stores nothing', () => {
  assert.deepEqual(Object.keys(PAGE_DEFAULTS).sort(), Object.keys(PAGES).filter((k) => k !== 'privacy').sort());
  for (const [key, blocks] of Object.entries(PAGE_DEFAULTS)) {
    assert.equal(blocks[0].type, 'head', key);
    // Each page has each of its built-ins once, in its default.
    assert.deepEqual(blocks.filter((b) => b.type === 'builtin').map((b) => b.id), Object.keys(PAGE_PARTS[key]), key);
    assert.deepEqual(pageBlocks(null, key), blocks.map(cleanBlock));
    assert.deepEqual(withPage({ rules: { x: 1 } }, key, pageBlocks(null, key)), { rules: { x: 1 } });
  }
  assert.deepEqual(pageBlocks(null, 'dogs').map((b) => b.id), ['head', 'faq', 'all', 'upcoming', 'for_sale', 'co_owned']);
  // Only what fits a page stays: no story or banner off Home, no other page's
  // built-in, no badge row where the page has no place for one, no heading on Home.
  const saved = { pages: { about: { blocks: [{ id: 'head', type: 'head' }, { id: 'story', type: 'text' }, { id: 'all', type: 'builtin' }, { id: 'story', type: 'builtin' }, newBlock('dogs', 'dogs-2')] },
    reviews: { blocks: [{ id: 'badges', type: 'badges' }, { id: 'list', type: 'builtin' }] }, home: { blocks: [{ id: 'head', type: 'head' }, { id: 'hero', type: 'hero' }] } } };
  assert.deepEqual(pageBlocks(saved, 'about').map((b) => b.id), ['head', 'story', 'dogs-2']);
  assert.equal(pageBlocks(saved, 'about')[1].type, 'builtin');
  assert.deepEqual(pageBlocks(saved, 'reviews').map((b) => b.id), ['list']);
  assert.deepEqual(pageBlocks(saved, 'home').map((b) => b.id), ['hero']);
  // Add a block: data blocks anywhere; a removed built-in or spot, back.
  const less = pageBlocks(null, 'contact').filter((b) => !['main', 'faq'].includes(b.id));
  assert.deepEqual(addable('contact', less).map((x) => `${x.type}${x.id ? `:${x.id}` : ''}`), ['builtin:main', 'faq', 'dogs', 'litters', 'reviews']);
});

test('the Pages list has every page; a page\'s editor moves, removes, puts back and adds', async (t) => {
  const { env, sub, admin, get, post, render, at, build } = await demo(t);
  const list = text(await get(`/admin/${sub}/pages`));
  assert.match(list, /17 pages/);
  for (const n of ['Home', 'All our dogs', 'Puppies', 'Older puppies', 'Using your status page', 'Privacy']) assert.match(list, new RegExp(n));
  assert.match(list, /\/privacy · written for her by KennelPort, fixed/);
  assert.notEqual((await call(env, M, at('privacy'))).status, 200);
  for (const p of ['privacy', 'nope']) assert.equal((await call(env, M, at(p), { headers: { cookie: admin } })).status, 404);

  const page = text(await get(at('dogs')));
  assert.match(page, /The page Starting name .* All our dogs .*\/dogs/);
  assert.match(page, /This is today's page/);
  for (const n of ['Page heading', 'FAQ spot', 'Girls and boys Built-in', 'Up and coming Built-in', 'Looking for a home Built-in', 'Shared with friends Built-in']) assert.match(page, new RegExp(n));
  const before = await render('/dogs');

  // Shared with friends to the top, under the heading: four moves up.
  for (let i = 0; i < 4; i++) await post({}, { page: 'dogs', act: 'mv:co_owned:up' });
  assert.deepEqual((await build()).pages.dogs.blocks.map((b) => b.id), ['head', 'co_owned', 'faq', 'all', 'upcoming', 'for_sale']);
  let h = await render('/dogs');
  assert.ok(order(h, ['class="wrap pagehead"', 'id="co-owned"', 'id="all-dogs"']));
  // The Home editor's own build is untouched.
  assert.equal((await build()).pages.home, undefined);

  // Remove Girls and boys; add a Dog cards block for the girls in its place.
  await post({}, { page: 'dogs', open: 'all', act: 'remove:all' });
  assert.doesNotMatch(await render('/dogs'), /id="all-dogs"/);
  await post({}, { page: 'dogs', act: 'add:dogs' });
  await post({ 'b.dogs-2.f.sex': 'female', 'b.dogs-2.w.eyebrow': 'Dams', 'b.dogs-2.w.heading': 'Our girls' }, { page: 'dogs', open: 'dogs-2' });
  h = await render('/dogs');
  assert.match(text(h), /Dams Our girls .*Clover\*/);
  // Girls and boys is offered back, and comes back at the bottom.
  assert.match(text(await get(`${at('dogs')}?open=add`)), /This page's own Girls and boys .* Add/);
  await post({}, { page: 'dogs', act: 'add:builtin:all' });
  assert.equal((await build()).pages.dogs.blocks.at(-1).id, 'all');
  assert.ok(order(await render('/dogs'), ['Our girls', 'id="all-dogs"']));

  // Back to today's: nothing stored for the page, and it is as before.
  await post({}, { page: 'dogs', act: 'default' });
  assert.equal((await build()).pages, undefined);
  assert.equal(await render('/dogs'), before);
});

test('a badge row right after its page\'s built-in sits inside it, as today; anywhere else it is its own row', async () => {
  const env = await makeEnv();
  const site = await addSite(env, 'akbadges');
  const doc = structuredClone(AK_SAMPLE);
  doc.products = [{ name: 'TLC', image_url: 'https://tlcpetpro.com/logo.png', link_url: 'https://tlcpetpro.com/x', badge_places: ['contact', 'litters'] }];
  await importContent(env, site.id, doc);
  const snap = await buildSnapshot(env, site.id);
  const draw = (layout, p) => renderPage({ ...snap, layout: { ...snap.layout, ...layout } }, { path: p, origin: 'https://x', today: '2027-03-10', preview: true }).html;
  const today = draw({}, '/contact');
  // Today: inside the contact section, before the form.
  assert.match(today, /<div class="mt-26"><div class="badges badges-row"[\s\S]*?<\/div><\/div><form/);
  const up = pageBlocks(null, 'contact');
  const moved = [up[0], up[3], up[1], up[2]];
  const h = draw({ contact: moved }, '/contact');
  assert.doesNotMatch(h, /<div class="mt-26"><div class="badges badges-row"/);
  assert.ok(order(h, ['class="wrap pagehead"', '<section class="section tight"><div class="wrap"><div class="badges badges-row"', 'class="contact"']));
  // Removed: gone, and the contact section draws without it.
  assert.doesNotMatch(draw({ contact: up.filter((b) => b.id !== 'badges') }, '/contact'), /badges-row/);
  // Puppies: its badge row between the litters and older puppies, or none when removed.
  assert.match(draw({}, '/litters'), /badges-row/);
  assert.doesNotMatch(draw({ litters: pageBlocks(null, 'litters').filter((b) => b.id !== 'badges') }, '/litters'), /badges-row/);
});
