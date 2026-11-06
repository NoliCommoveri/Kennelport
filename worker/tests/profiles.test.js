// What each profile page shows (docs/Site_Builder_Plan.md, step 3.7): every dog's,
// litter's and puppy's own page, one setting per site in the owner's admin view:
// which items, in which part, in what order, and a dog's or puppy's facts. With
// nothing set, each is today's page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { buildSnapshot, forgetSnapshots } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { loadBuild, saveBuild } = await import('../src/content/rules.js');
const { cleanProfile, profileOf, withProfile, PROFILE_DEFAULT, PROFILE_ITEMS, spotPlaces, layoutFor } = await import('../src/content/blocks.js');

const M = 'manage.kennelport.com';

async function owner(t) {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-06T15:00:00Z') });
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const admin = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const at = (kind) => `/admin/akbostons/pages/${kind}`;
  const get = async (p) => (await call(env, M, p, { headers: { cookie: admin } })).text();
  // The profile form as drawn, with changes (null removes a field), and a press.
  const post = async (kind, changes = {}, act = null) => {
    const html = await get(at(kind));
    const body = new URLSearchParams();
    for (const m of html.matchAll(/<input([^>]*)>/g)) {
      const a = m[1];
      const name = a.match(/name="([^"]+)"/)?.[1];
      if (!name || / disabled/.test(a)) continue;
      const type = a.match(/type="([^"]+)"/)?.[1];
      if (type === 'checkbox' && !/ checked/.test(a)) continue;
      body.append(name, (a.match(/value="([^"]*)"/)?.[1] ?? 'on').replace(/&amp;/g, '&'));
    }
    for (const m of html.matchAll(/<select name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) body.append(m[1], m[2].match(/<option value="([^"]*)" selected/)?.[1]);
    for (const [k, v] of Object.entries(changes)) { body.delete(k); if (v !== null) body.append(k, v); }
    if (act) body.set('act', act);
    const r = await call(env, M, at(kind), { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body });
    assert.equal(r.status, 303);
  };
  const render = async (p) => renderPage(await buildSnapshot(env, site.id), { path: p, origin: 'https://x', today: '2026-11-06', preview: true }).html;
  return { env, site, get, post, render, build: () => loadBuild(env, site.id) };
}

test('with nothing set each profile is today\'s, and saving today\'s stores nothing', () => {
  for (const kind of ['dog', 'litter', 'puppy']) {
    assert.deepEqual(profileOf(null, kind), cleanProfile(kind, PROFILE_DEFAULT[kind]));
    assert.deepEqual(withProfile({ rules: { x: 1 } }, kind, PROFILE_DEFAULT[kind]), { rules: { x: 1 } });
  }
  assert.equal(layoutFor({}).profiles, undefined);
  // The name is always on; an item sits only where it may; nothing twice.
  const dog = cleanProfile('dog', { parts: { above: ['bio', 'bio'], side: [], below: ['nope', 'tests'] }, facts: ['born', 'sex', 'zzz'] });
  assert.deepEqual(dog, { parts: { above: ['bio'], side: ['name'], below: ['tests'] }, facts: ['born', 'sex'] });
  assert.deepEqual(cleanProfile('litter', { parts: { head: ['pups', 'summary'], body: ['pair', 'pups'] } }).parts, { head: ['summary'], body: ['pups'] });
  assert.ok(!Object.values(PROFILE_DEFAULT.dog.parts).flat().includes('badges'), 'today\'s dog pages have no badge row');
  assert.ok(Object.hasOwn(PROFILE_ITEMS.dog, 'badges'), 'but the owner can switch one on');
});

test('a dog\'s page: items off, moved and reordered; facts trimmed; Back to today\'s', async (t) => {
  const o = await owner(t);
  const before = await o.render('/dogs/willow');
  assert.match(before, /<p class="bio">Our mud-puddle girl/);
  assert.match(await o.get('/admin/akbostons/pages'), /Every dog&#39;s page[\s\S]*?what it shows · as today/);
  const screen = await o.get('/admin/akbostons/pages/dog');
  assert.match(screen, /What it shows, top to bottom/);
  assert.match(screen, /Under the breadcrumb[\s\S]*Beside the photo[\s\S]*Under the photo/);

  // Bio off; health testing under the breadcrumb; Color left out of the facts.
  await o.post('dog', { 'p.on.bio': null, 'p.at.tests': 'above', 'p.fact.color': null });
  const build = await o.build();
  assert.deepEqual(build.profiles.dog.parts.above, ['faq', 'tests']);
  assert.ok(!build.profiles.dog.parts.side.includes('bio'));
  assert.ok(!build.profiles.dog.facts.includes('color'));
  let html = await o.render('/dogs/willow');
  assert.doesNotMatch(html, /<p class="bio">/);
  assert.doesNotMatch(html, /<dt>Color<\/dt>/);
  assert.match(html, /<dt>Sex<\/dt>/);
  assert.ok(html.indexOf('Health testing') < html.indexOf('<div class="dogpage'), 'above the photo');
  assert.match(html, /<div class="dogpage mt-26">/);
  assert.match(await o.get('/admin/akbostons/pages'), /Every dog&#39;s page[\s\S]*?changed/);

  // Up and down within a part: the registered name above the call name.
  await o.post('dog', {}, 'pmv:reg:up');
  html = await o.render('/dogs/willow');
  assert.ok(html.indexOf('class="reg"') < html.indexOf('<h1>Willow</h1>'));
  // A fact moved down.
  await o.post('dog', {}, 'fmv:sex:down');
  assert.deepEqual((await o.build()).profiles.dog.facts.slice(0, 2), ['born', 'sex']);

  // The name can't be switched off.
  await o.post('dog', { 'p.on.name': null });
  assert.match(await o.render('/dogs/willow'), /<h1>Willow<\/h1>/);

  await o.post('dog', {}, 'default');
  assert.equal((await o.build()).profiles, undefined);
  assert.equal((await o.render('/dogs/willow')).replace(/>\s+</g, '><'), before.replace(/>\s+</g, '><'));
});

test('a dog\'s badge row, switched on, joins the breeder\'s tick boxes and shows her badges', async (t) => {
  const o = await owner(t);
  assert.ok(!spotPlaces(await o.build(), 'badges').includes('dog'));
  await o.post('dog', { 'p.on.badges': 'on' });
  assert.ok(spotPlaces(await o.build(), 'badges').includes('dog'));
  await importContent(o.env, o.site.id, { products: [{ name: 'Sky Nanny', image_url: 'https://tlcpetpro.com/b.png', badge_places: ['dog'] }] });
  const html = await o.render('/dogs/willow');
  assert.match(html, /We recommend[\s\S]*Sky Nanny/);
  assert.ok(html.indexOf('We recommend') > html.indexOf('<div class="dogpage'), 'under the photo');
  // And its FAQ spot off: "Every dog's profile" leaves her question tick boxes.
  await o.post('dog', { 'p.on.faq': null });
  assert.ok(!spotPlaces(await o.build(), 'faq').includes('dog'));
});

test('a litter\'s page: the summary off, pup cards before the parents', async (t) => {
  const o = await owner(t);
  assert.match(await o.render('/litters/gem-2026'), /Three babies, one week old, growing fast\./);
  const screen = await o.get('/admin/akbostons/pages/litter');
  assert.match(screen, /In the heading[\s\S]*Under the heading/);
  assert.doesNotMatch(screen, /name="p\.at\./, 'a litter\'s items stay in their part');
  await o.post('litter', { 'p.on.summary': null });
  for (let i = 0; i < 5; i++) await o.post('litter', {}, 'pmv:pups:up');
  assert.deepEqual((await o.build()).profiles.litter.parts.body.slice(0, 3), ['faq', 'pups', 'parents']);
  const html = await o.render('/litters/gem-2026');
  assert.match(html, /<p class="lede">Willow × Boone\*<\/p>/, 'the pair, without the summary');
  assert.match(html, /<meta name="description" content="Willow × Boone\*\. Three babies/, 'a link card still has it');
  assert.ok(html.indexOf('mt-26 grid') > 0 && html.indexOf('mt-26 grid') < html.indexOf('class="parent-card'), 'the pups, then the parents');
});

test('a puppy\'s page: the safe-payment notice off, its facts reordered', async (t) => {
  const o = await owner(t);
  await importContent(o.env, o.site.id, { payment: { safe_notice: { enabled: true } } });
  assert.match(await o.render('/litters/gem-2026/opal'), /class="pay-safe"/);
  await o.post('puppy', { 'p.on.notice': null }, 'fmv:collar:up');
  const build = await o.build();
  assert.ok(!build.profiles.puppy.parts.side.includes('notice'));
  assert.deepEqual(build.profiles.puppy.facts.slice(0, 3), ['sex', 'collar', 'color']);
  const html = await o.render('/litters/gem-2026/opal');
  assert.ok(html.indexOf('<dt>Collar</dt>') < html.indexOf('<dt>Color</dt>'));
  assert.doesNotMatch(html, /class="pay-safe"/);
});
