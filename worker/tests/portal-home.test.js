// The family Home's sections per site (portal/home.js; site-builder step 6): their order
// and each card's show and until, set by the owner on her Family Home screen
// (manage/builder/portalhome.js), read live by Home in every look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { HOME_SECTIONS, portalHomeFor, withPortalHome, portalHomeFromForm, moveSection, cardShows, recolour } = await import('../src/portal/home.js');
const { loadBuild, saveBuild } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const DAY = 86400000;
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

test('portalHomeFor and withPortalHome: today\'s by default, only what differs is kept', () => {
  const today = portalHomeFor({});
  assert.deepEqual(today.order, [...HOME_SECTIONS]);
  assert.equal(today.custom, false);
  assert.deepEqual(today.cards.food, { show: 'always', until: null });
  // Back at today's: nothing stored, and other parts of the build kept.
  assert.deepEqual(withPortalHome({ timing: { litter_days: 9 }, portal_home: { order: ['food'] } }, { order: [...HOME_SECTIONS], cards: {} }), { timing: { litter_days: 9 } });
  const order = moveSection([...HOME_SECTIONS], 'readnext', 'up');
  const b = withPortalHome({}, { order, cards: { food: { show: 'home', until: 14 }, extra: { show: 'off', until: null } } });
  assert.deepEqual(b.portal_home, { order, cards: { food: { show: 'home', until: 14 }, extra: { show: 'off' } } });
  const back = portalHomeFor(b);
  assert.deepEqual(back.order, order);
  assert.equal(back.custom, true);
  assert.deepEqual(back.cards.food, { show: 'home', until: 14 });
  assert.deepEqual(back.cards.extra, { show: 'off', until: null });
  assert.deepEqual(withPortalHome({}, back), b);
  // A stored order missing a section gets it after the one today's has before it; bad values fall back.
  const odd = portalHomeFor({ portal_home: { order: ['contacts', 'stage', 'bogus', 'contacts'], cards: { food: { show: 'x', until: 0 } } } });
  assert.deepEqual(odd.order, ['contacts', 'checklist', 'status', 'recommended', 'readnext', 'stage', 'food']);
  assert.deepEqual(odd.cards.food, { show: 'always', until: null });
  // The form: a bad until is refused.
  assert.throws(() => portalHomeFromForm((k) => ({ 'card.food.until': '2.5' })[k]), /whole number/);
  // Moving off either end does nothing.
  assert.deepEqual(moveSection([...HOME_SECTIONS], 'stage', 'up'), [...HOME_SECTIONS]);
});

test('cardShows: always, only once home, never, and until N days after pickup', () => {
  const home = portalHomeFor({ portal_home: { cards: { food: { show: 'home', until: 14 }, insurance: { show: 'always', until: 3 }, extra: { show: 'off' } } } });
  // Before pickup: "home" hides, until doesn't hide yet.
  assert.equal(cardShows(home, 'food', null), false);
  assert.equal(cardShows(home, 'insurance', null), true);
  assert.equal(cardShows(home, 'contacts', null), true);
  // Pickup day, the 13th day, the 14th.
  assert.equal(cardShows(home, 'food', 0), true);
  assert.equal(cardShows(home, 'food', 13), true);
  assert.equal(cardShows(home, 'food', 14), false);
  assert.equal(cardShows(home, 'insurance', 2), true);
  assert.equal(cardShows(home, 'insurance', 3), false);
  assert.equal(cardShows(home, 'extra', null), false);
  assert.equal(cardShows(home, 'extra', 1), false);
});

test('recolour leaves today\'s order alone and parts two cards of one colour', () => {
  const today = '<section class="sec sand bleed">a</section>\n  <section class="sec deep bleed food">b</section>\n  <section class="card c-paper contacts" id="contacts">c</section>\n  <section class="sec sand bleed">r</section>\n  <section class="readnext">n</section>';
  assert.equal(recolour(today), today);
  // Two sands meet: the lower one changes, to a colour neither neighbour has.
  const clash = '<section class="sec sand bleed">a</section><section class="sec sand bleed">r</section><section class="card c-paper contacts">c</section>';
  const out = recolour(clash);
  assert.notEqual(out, clash);
  assert.match(out, /<section class="sec sand bleed">a<\/section><section class="sec bleed mint">r<\/section>/);
  // The deep band keeps its colour: the card next to it changes instead.
  const deep = '<section class="sec deep bleed food">b</section><section class="card c-green">x</section>';
  assert.match(recolour(deep), /sec deep bleed food[\s\S]*class="card (c-paper|c-sand)"/);
});

// ---------- Home, rendered ----------

async function setup({ look = null, home = null, chapters = true } = {}) {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers', contact_phone: '423-555-0100' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, ymd(new Date(Date.now() - 50 * DAY)), t, t);
  for (const id of ['pup1', 'pup2', 'pup3', 'pup4', 'pup5']) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'male', ?, ?)").run(id, site.id, id, `Pup ${id}`, t, t);
  }
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('food', ?, 'Puppy chow program', 'https://food.example/akb', 0)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('ins', ?, 'Puppy insurance', 'https://insure.example/akb', 1)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('train', ?, 'Training course', 'https://train.example/akb', 2)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('vitamins', ?, 'Vitamins', 'https://vit.example/akb', 3)").run(site.id);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const saved = await her('/portal/settings', {
    vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8', food_name: 'TLC Dog Food',
    vet_clinic: 'Parkway Animal Clinic', vet_phone: '706-555-0180', 'type.ins': 'insurance', 'type.food': 'food', ...(look ? { look } : {}),
  });
  assert.equal(saved.status, 303, await saved.text());
  env.DB.raw.prepare('UPDATE products SET portal_show = 1 WHERE site_id = ?').run(site.id);
  await her('/portal/checklist/suggested', {});
  await her('/portal/timeline/suggested', {});
  if (chapters) await her('/portal/handbook/new', { title: 'The first night', body: 'A quiet room.', shown: '1' });
  if (home) await saveBuild(env, site.id, withPortalHome(await loadBuild(env, site.id), home), { draft: false });
  return { env, site, her, breeder, ops };
}

async function familyAt(env, her, email, values) {
  const res = await her('/portal/new', { name: email, emails: email, ...values });
  assert.equal(res.status, 303, await res.text());
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email }), headers: { origin: `https://${H}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const cookie = (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email, code }), headers: { origin: `https://${H}` } })).headers.get('set-cookie').split(';')[0];
  return { id: res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1], get: async (path) => (await call(env, H, path, { headers: { cookie } })).text() };
}

// A family before pickup, one picked up today, and ones picked up 13 and 14 days ago.
async function families(env, her) {
  const before = await familyAt(env, her, 'before@example.com', { puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  const day0 = await familyAt(env, her, 'day0@example.com', { puppy_id: 'pup2', go_home_on: ymd(new Date()) });
  const day13 = await familyAt(env, her, 'day13@example.com', { puppy_id: 'pup3', go_home_on: ymd(new Date(Date.now() - 13 * DAY)) });
  const day14 = await familyAt(env, her, 'day14@example.com', { puppy_id: 'pup4', go_home_on: ymd(new Date(Date.now() - 14 * DAY)) });
  for (const f of [day0, day13, day14]) assert.equal((await her(`/portal/f/${f.id}/picked-up`, {})).status, 303);
  for (const [f, n] of [[day13, 13], [day14, 14]]) {
    env.DB.raw.prepare('UPDATE portal_placements SET picked_up_at = ?, vet_deadline_at = ? WHERE family_id = ?')
      .run(new Date(Date.now() - n * DAY).toISOString(), new Date(Date.now() - (n - 3) * DAY).toISOString(), f.id);
  }
  return { before, day0, day13, day14 };
}

const recommendedPart = (html) => (html.match(/Recommended for[\s\S]*?<\/section>/) ?? [''])[0];

for (const look of [null, 'forest']) {
  test(`Home: the food card only once home and for 14 days (${look ?? 'classic'})`, async () => {
    const { env, her } = await setup({ look, home: { order: [...HOME_SECTIONS], cards: { food: { show: 'home', until: 14 } } } });
    const f = await families(env, her);
    const food = /on the same food/;
    const ins = /Activate Pup pup\d's pet insurance/;
    const before = await f.before.get('/family');
    assert.doesNotMatch(before, food);
    assert.match(before, ins);
    for (const who of ['day0', 'day13']) assert.match(await f[who].get('/family'), food, who);
    const gone = await f.day14.get('/family');
    assert.doesNotMatch(gone, food);
    assert.match(gone, ins);
    // The food program stays off "Recommended for": the hidden card doesn't send it there.
    for (const html of [before, gone]) {
      assert.match(recommendedPart(html), /Vitamins/);
      assert.doesNotMatch(recommendedPart(html), /Puppy chow program/);
    }
  });
}

test('Home: insurance, the slim card, contacts and Read next can each be switched off', async () => {
  const off = { show: 'off', until: null };
  const { env, her } = await setup({ home: { order: [...HOME_SECTIONS], cards: { insurance: off, extra: off, contacts: off, readnext: off, recommended: off } } });
  const f = await families(env, her);
  const html = await f.day0.get('/family');
  assert.match(html, /on the same food/);
  assert.doesNotMatch(html, /pet insurance/);
  assert.doesNotMatch(html, /Training course/);
  assert.doesNotMatch(html, /id="contacts"/);
  assert.doesNotMatch(html, /Read next/);
  assert.doesNotMatch(html, /Recommended for/);
});

const ORDER = ['recommended', 'contacts', 'readnext', 'food', 'stage', 'checklist', 'status'];
for (const look of [null, 'forest', 'cream']) {
  test(`Home: an order she chose renders in that order (${look ?? 'classic'})`, async () => {
    const { env, her } = await setup({ look, home: { order: ORDER, cards: {} } });
    const f = await families(env, her);
    const html = await f.day13.get('/family');
    const at = (re) => { const i = html.search(re); assert.ok(i > 0, String(re)); return i; };
    const rec = at(/Recommended for/);
    const con = at(/id="contacts"/);
    const read = at(/Read next/);
    const food = at(/on the same food/);
    const quick = at(/Quick links/);
    assert.ok(rec < con && con < read && read < food && food < quick, [rec, con, read, food, quick].join(' '));
  });
}

// portal-colours.test.js's reading of <main>: each top-level piece's colour.
const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source']);
function colours(html) {
  const main = html.slice(html.indexOf('<main>') + 6, html.lastIndexOf('</main>'));
  const out = [];
  let depth = 0;
  for (const m of main.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>/gi)) {
    const [, close, tag, attrs] = m;
    if (close) { depth--; continue; }
    if (VOID.has(tag.toLowerCase()) || attrs.endsWith('/')) continue;
    if (depth++ !== 0) continue;
    const cls = ` ${(attrs.match(/class="([^"]*)"/) ?? [, ''])[1]} `;
    const has = (c) => cls.includes(` ${c} `);
    let c = null;
    if (has('hero') || has('bento') || has('readnext')) c = '|';
    else if (has('c-green') || has('mint') || has('deep') || (has('tile') && has('green'))) c = 'green';
    else if (has('c-sand') || has('sand') || has('band') || has('warm')) c = 'sand';
    else if (has('c-paper') || has('paper') || has('card') || has('tile')) c = 'paper';
    if (c) out.push([c, cls.trim()]);
  }
  return out;
}

test('Classic: no two cards of one colour stack, in orders she chose, at every stage', async () => {
  const orders = [ORDER, [...HOME_SECTIONS].reverse(), ['stage', 'status', 'recommended', 'contacts', 'checklist', 'food', 'readnext'], ['food', 'recommended', 'stage', 'status', 'checklist', 'contacts', 'readnext']];
  for (const chapters of [true, false]) {
    for (const order of orders) {
      const { env, her } = await setup({ chapters, home: { order, cards: {} } });
      const f = await families(env, her);
      for (const [who, fam] of Object.entries(f)) {
        const list = colours(await fam.get('/family'));
        assert.ok(list.length > 2, who);
        for (let i = 1; i < list.length; i++) {
          const [a, b] = [list[i - 1], list[i]];
          assert.ok(a[0] === '|' || a[0] !== b[0], `${order.join(',')}, ${who}: "${a[1]}" and "${b[1]}" below it are both ${b[0]}`);
        }
      }
    }
  }
});

test('today\'s order renders as it did before: no recolouring', async () => {
  const a = await setup();
  const fa = await families(a.env, a.her);
  const b = await setup({ home: { order: [...HOME_SECTIONS], cards: {} } });
  const fb = await families(b.env, b.her);
  assert.equal(portalHomeFor(await loadBuild(b.env, b.site.id)).custom, false);
  for (const who of ['before', 'day0', 'day14']) {
    const strip = (h) => h.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, 'ID').replace(/nonce="[^"]*"/g, '');
    assert.equal(strip(await fb[who].get('/family')), strip(await fa[who].get('/family')), who);
  }
});

// ---------- the owner's Family Home screen ----------

test('the owner\'s Family Home screen: moves, sets cards, back to today\'s, nothing to publish', async () => {
  const { env, site, breeder, ops } = await setup();
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const admin = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const url = '/admin/akbostons/portalhome';
  const screen = async () => (await call(env, M, url, { headers: { cookie: admin } })).text();
  const post = (body) => call(env, M, url, { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body: form(body) });
  const cards = (o = {}) => Object.fromEntries(['food', 'insurance', 'extra', 'contacts', 'checklist', 'status', 'recommended', 'readnext'].flatMap((k) => [[`card.${k}.show`, o[k]?.show ?? 'always'], [`card.${k}.until`, o[k]?.until ?? '']]));

  const first = await screen();
  assert.match(first, /<h1>Family Home<\/h1>/);
  assert.match(first, /As today/);
  assert.match(first, /name="home.order" value="stage,food,contacts,checklist,status,recommended,readnext"/);
  assert.match(first, /href="\/admin\/akbostons\/portalhome"/);
  env.DB.raw.prepare('UPDATE sites SET draft_changed_at = NULL WHERE id = ?').run(site.id);

  // A move: saves what's on the screen too, and comes back to the section.
  const moved = await post({ 'home.order': HOME_SECTIONS.join(','), ...cards({ food: { show: 'home', until: '14' } }), act: 'mv:food:up' });
  assert.equal(moved.status, 303);
  assert.equal(moved.headers.get('location'), `${url}?saved=1#s-food`);
  let build = await loadBuild(env, site.id);
  assert.deepEqual(build.portal_home, { order: ['food', 'stage', 'contacts', 'checklist', 'status', 'recommended', 'readnext'], cards: { food: { show: 'home', until: 14 } } });
  const after = await screen();
  assert.match(after, /changed/);
  assert.match(after, /moved/);
  assert.match(after, /Back to today's Home/);
  assert.match(after, /name="card.food.until" value="14"/);

  // Save sets the cards.
  assert.equal((await post({ 'home.order': build.portal_home.order.join(','), ...cards({ extra: { show: 'off' }, readnext: { until: '30' } }) })).status, 303);
  build = await loadBuild(env, site.id);
  assert.deepEqual(build.portal_home.cards, { extra: { show: 'off' }, readnext: { show: 'always', until: 30 } });

  // A bad until is refused, and nothing changes.
  const bad = await post({ 'home.order': HOME_SECTIONS.join(','), ...cards({ food: { until: '0' } }) });
  assert.equal(bad.status, 200);
  assert.match(await bad.text(), /role="alert"[^>]*>Food card[^<]*whole number/);
  assert.deepEqual((await loadBuild(env, site.id)).portal_home, build.portal_home);

  // Back to today's: nothing stored.
  assert.equal((await post({ 'home.order': build.portal_home.order.join(','), ...cards(), act: 'today' })).status, 303);
  assert.equal((await loadBuild(env, site.id)).portal_home, undefined);
  // The portal reads the build live: nothing for the website to publish.
  assert.equal(env.DB.raw.prepare('SELECT draft_changed_at FROM sites WHERE id = ?').get(site.id).draft_changed_at, null);

  // A breeder doesn't get it; a site without the portal has no such screen.
  assert.equal((await call(env, M, url, { headers: { cookie: breeder } })).status, 404);
  assert.equal((await call(env, M, url, { method: 'POST', headers: { cookie: breeder, origin: `https://${M}` }, body: form({ act: 'today' }) })).status, 404);
  await call(env, M, `/ops/sites/${site.id}/portal/off`, { method: 'POST', headers: { cookie: ops } });
  assert.equal((await call(env, M, url, { headers: { cookie: admin } })).status, 404);
  assert.doesNotMatch(await (await call(env, M, '/admin/akbostons/timing', { headers: { cookie: admin } })).text(), /portalhome/);
});
