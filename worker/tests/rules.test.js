// Display and timing rules (docs/plans/site-builder.md, step 1), checked on the
// linked sample (tests/fixtures/linked-sample): the defaults are today's behaviour;
// a rule the owner changes in her admin view changes what the site shows; only
// admin (signed in to /ops on the device) reaches the screens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { load } from './fixtures/linked-sample/sample.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { leavingLitters, expireLitters } = await import('../src/kennelos/clock.js');
const { rulesFor, withPart, DEFAULT_RULES, DEFAULT_TIMING } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';
const API = 'api.kennelport.com';
const form = (o) => new URLSearchParams(o);
const TODAY = '2026-11-01';
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

// The sample's step 1 on a linked site, as of its own day; and admin's cookie.
async function sampleSite(t) {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${TODAY}T15:00:00Z`) });
  const env = await makeEnv();
  const site = await addSite(env, 'tuxedolane', { kennel_name: 'Tuxedo Lane Bostons*' });
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const admin = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  // Admin makes the link code: no invite, no code email.
  const html = await (await call(env, M, '/s/tuxedolane/kennelos/code', { method: 'POST', headers: { cookie: admin, origin: `https://${M}` } })).text();
  const code = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const { token } = await (await call(env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code, kennel_id: 'kennel-sample' }), headers: { 'content-type': 'application/json' } })).json();
  const r = await call(env, API, '/v1/bundle', { method: 'POST', body: JSON.stringify(load('bundle-1.json')), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } });
  assert.equal(r.status, 200);
  const page = async (path) => renderPage(await buildSnapshot(env, site.id), { path, origin: 'https://x', today: TODAY, preview: false, portal: false });
  const post = (path, fields) => call(env, M, path, { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body: form(fields) });
  return { env, site, admin, page, post };
}

// The rules screen's form as it stands, with some fields changed.
async function rulesForm(env, admin, changes = {}) {
  const html = await (await call(env, M, '/admin/tuxedolane/rules', { headers: { cookie: admin } })).text();
  const f = {};
  for (const m of html.matchAll(/<input type="text" name="([^"]+)" value="([^"]*)"/g)) f[m[1]] = m[2].replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  for (const m of html.matchAll(/<input type="checkbox" name="([^"]+)"( checked)?>/g)) if (m[2]) f[m[1]] = 'on';
  for (const m of html.matchAll(/<input type="radio" name="([^"]+)" value="([^"]+)" checked>/g)) f[m[1]] = m[2];
  for (const m of html.matchAll(/<select name="([^"]+)">([\s\S]*?)<\/select>/g)) f[m[1]] = m[2].match(/value="([^"]+)" selected/)[1];
  for (const [k, v] of Object.entries(changes)) if (v === null) delete f[k]; else f[k] = v;
  return f;
}

test('the defaults are today\'s behaviour, and a site keeps only what changed', () => {
  assert.deepEqual(rulesFor({}), { rules: DEFAULT_RULES, timing: DEFAULT_TIMING });
  assert.deepEqual(rulesFor(null).timing.litter_days, 30);
  const full = structuredClone(DEFAULT_RULES);
  full.status.hidden.show = true;
  full.status.hidden.words = 'On a health hold';
  assert.deepEqual(withPart({}, 'rules', full), { rules: { status: { hidden: { show: true, words: 'On a health hold' } } } });
  assert.deepEqual(withPart({ rules: { reg: { full: 'X' } } }, 'rules', DEFAULT_RULES), {});
  // A rule added later reaches a site that changed others.
  assert.equal(rulesFor({ rules: { status: { hidden: { show: true } } } }).rules.status.hidden.order, 1);
});

test('saving the rules screen unchanged changes nothing on the site', async (t) => {
  const { env, admin, page, post } = await sampleSite(t);
  const before = (await page('/litters/the-gem-litter')).html;
  const r = await post('/admin/tuxedolane/rules', await rulesForm(env, admin));
  assert.equal(r.status, 303);
  assert.equal(env.DB.raw.prepare('SELECT build FROM site_builds').get().build, '{}');
  assert.equal((await page('/litters/the-gem-litter')).html, before);
});

test('display rules change how the sample\'s pups read', async (t) => {
  const { env, admin, page, post } = await sampleSite(t);
  let gem = text((await page('/litters/the-gem-litter')).html);
  assert.doesNotMatch(gem, /Garnet\*/, 'hidden: a health hold, not shown');
  assert.match(gem, /Onyx\* .*Reserved/);
  const r = await post('/admin/tuxedolane/rules', await rulesForm(env, admin, {
    'status.hidden.show': 'on', 'status.hidden.words': 'Health hold',
    'status.reserved.words': 'Spoken for', 'status.placed.words': 'Home with family',
    'status.undecided.show': null,
    'reg.unset': 'To be decided',
    'price.off': 'Ask us', 'price.before': 'Deposits open {date}',
  }));
  assert.equal(r.status, 303);
  gem = text((await page('/litters/the-gem-litter')).html);
  assert.match(gem, /Garnet\* .*Health hold/);
  assert.match(gem, /Onyx\* .*Spoken for/);
  assert.match(text((await page('/litters/the-gem-litter/jade')).html), /Home with family/);
  assert.doesNotMatch(gem, /Topaz\*/, 'undecided switched off');
  assert.match(text((await page('/litters/the-gem-litter/ruby')).html), /Registration To be decided/);
  assert.match(gem, /Ask us/);
  assert.match(text((await page('/litters/the-spice-litter/sage')).html), /Deposits open November 22/);
  // Back to default, one card.
  await post('/admin/tuxedolane/rules', { ...(await rulesForm(env, admin)), default: 'status.hidden' });
  assert.doesNotMatch(text((await page('/litters/the-gem-litter')).html), /Garnet\*/);
  // A bad value is refused, with the reason, and nothing saved.
  const bad = await post('/admin/tuxedolane/rules', await rulesForm(env, admin, { 'price.before': 'Available soon' }));
  assert.match(await bad.text(), /needs \{date\}/);
  assert.match(text((await page('/litters/the-spice-litter/sage')).html), /Deposits open/);
});

test('timing rules move older puppies, deposits and the litter clock', async (t) => {
  const { env, site, page, post } = await sampleSite(t);
  const older = async () => text((await page('/litters/older')).html);
  assert.match(await older(), /Sunny\*/);
  // The Summer litter* went home August 26: 90 days after is still ahead.
  await post('/admin/tuxedolane/timing', { 'timing.litter_days': '30', 'timing.older_after': '90', 'timing.deposits_after': '0' });
  assert.equal((await page('/litters/older')).status, 404);
  // The Spice litter*'s deposits open November 22; 3 days later reads November 25.
  await post('/admin/tuxedolane/timing', { 'timing.litter_days': '10', 'timing.older_after': '1', 'timing.deposits_after': '3' });
  assert.match(text((await page('/litters/the-spice-litter/sage')).html), /Available on November 25/);
  // A litter off the site leaves after this site's 10 days, not 30.
  env.DB.raw.prepare("UPDATE litters SET show_on_site = 0 WHERE site_id = ? AND name = 'The Summer litter*'").run(site.id);
  await expireLitters(env, new Date());
  assert.deepEqual((await leavingLitters(env, site.id)).map((l) => l.deletes_on), ['2026-11-11']);
  assert.equal((await expireLitters(env, new Date(Date.parse('2026-11-12T16:00:00Z')))).litters, 1);
  // Back to default.
  await post('/admin/tuxedolane/timing', { 'timing.litter_days': '10', 'timing.older_after': '1', 'timing.deposits_after': '3', default: 'timing.deposits_after' });
  assert.match(text((await page('/litters/the-spice-litter/sage')).html), /Available on November 22/);
});

test('only admin reaches the build screens; signing in to /ops makes the device admin', async () => {
  const env = await makeEnv();
  await addSite(env, 'one', { kennel_name: 'One*' });
  await addSite(env, 'two', { kennel_name: 'Two*' });
  // A breeder of one site.
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
  assert.equal(cookies.length, 2);
  const ops = cookies.join('; ');
  const siteId = env.DB.raw.prepare("SELECT id FROM sites WHERE subdomain = 'one'").get().id;
  await call(env, M, `/ops/sites/${siteId}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'b@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'b@example.com' }), headers: { origin: `https://${M}` } });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'b@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  for (const path of ['/admin', '/admin/one/rules', '/admin/one/timing']) {
    assert.equal((await call(env, M, path, { headers: { cookie: breeder } })).status, 404, path);
  }
  assert.equal((await call(env, M, '/admin/one/rules', { method: 'POST', headers: { cookie: breeder, origin: `https://${M}` }, body: form({}) })).status, 404);
  assert.equal((await call(env, M, '/s/two', { headers: { cookie: breeder } })).status, 404);
  // A forged admin cookie is nothing.
  assert.equal((await call(env, M, '/admin', { headers: { cookie: 'kp_admin=9999999999.abc' } })).status, 303);
  // Admin: every site, with no invite.
  const admin = cookies.find((c) => c.startsWith('kp_admin='));
  const every = await (await call(env, M, '/', { headers: { cookie: admin } })).text();
  assert.match(every, /Every site/);
  assert.match(every, /One\*[\s\S]*Two\*|Two\*[\s\S]*One\*/);
  assert.equal((await call(env, M, '/s/two', { headers: { cookie: admin } })).status, 200);
  assert.equal((await call(env, M, '/admin/two/timing', { headers: { cookie: admin } })).status, 200);
  // Signing out of /ops ends admin here too.
  const out = await call(env, M, '/ops/logout', { method: 'POST', headers: { cookie: ops } });
  assert.ok(out.headers.getSetCookie().some((c) => c.startsWith('kp_admin=;')));
});

// ---------- the rest of step 1: dogs, wording, formats, how KennelOS data lands ----------

test('wording, formats and the adult-for-sale price change the sample site; each screen keeps the others', async (t) => {
  const { env, admin, page, post } = await sampleSite(t);
  const formOf = async (screen, changes = {}) => {
    const html = await (await call(env, M, `/admin/tuxedolane/${screen}`, { headers: { cookie: admin } })).text();
    const f = {};
    for (const m of html.matchAll(/<input type="text" name="([^"]+)" value="([^"]*)"/g)) f[m[1]] = m[2].replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    for (const m of html.matchAll(/<textarea name="([^"]+)"[^>]*>([^<]*)<\/textarea>/g)) f[m[1]] = m[2].replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    for (const m of html.matchAll(/<input type="checkbox" name="([^"]+)"( checked)?>/g)) if (m[2]) f[m[1]] = 'on';
    for (const m of html.matchAll(/<input type="radio" name="([^"]+)" value="([^"]+)" checked>/g)) f[m[1]] = m[2];
    for (const m of html.matchAll(/<select name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) f[m[1]] = m[2].match(/value="([^"]+)" selected/)[1];
    for (const [k, v] of Object.entries(changes)) if (v === null) delete f[k]; else f[k] = v;
    return f;
  };
  // Every screen saved as it stands changes nothing.
  for (const s of ['dogs', 'wording', 'formats', 'kennelos']) assert.equal((await post(`/admin/tuxedolane/${s}`, await formOf(s))).status, 303, s);
  assert.equal(env.DB.raw.prepare('SELECT build FROM site_builds').get().build, '{}');

  await post('/admin/tuxedolane/dogs', await formOf('dogs', { 'words.girls': 'Dams', 'words.for_sale_heading': 'Retiring to a pet home', 'dogs.sale_price': 'always', 'words.ask_dog': 'Meet {name}' }));
  await post('/admin/tuxedolane/wording', await formOf('wording', { 'words.litter_coming': 'Soon', 'words.copyright': '{kennel}, {year}' }));
  await post('/admin/tuxedolane/formats', await formOf('formats', { 'format.date': 'dmy', 'format.day': 'short', 'format.sex': 'girl_boy', 'format.counts': 'females_males', 'format.currency': '€', 'format.currency_after': 'on', 'format.cents': 'on' }));
  const dogs = text((await page('/dogs')).html);
  assert.match(dogs, /Dams/);
  assert.match(dogs, /Retiring to a pet home/);
  assert.match(dogs, /Meet Rocco\*/);
  assert.match(dogs, /Tuxedo Lane Bostons\*, 2026/);
  const litters = text((await page('/litters')).html);
  assert.match(litters, /Soon .*The Spice litter\*/);
  assert.match(litters, /Born 20 September 2026/);
  assert.match(text((await page('/litters/the-spice-litter/sage')).html), /Available on Nov 22/);
  assert.match(text((await page('/litters/the-gem-litter/ruby')).html), /Sex Girl/);
  assert.match(text((await page('/litters/the-gem-litter')).html), /4 females, 2 males|3 females, 3 males|females/);
  // The Pups screen saved after: the other screens' rules stay.
  await post('/admin/tuxedolane/rules', await rulesForm(env, admin));
  assert.match(text((await page('/dogs')).html), /Dams/);
  // Back to default, one group.
  await post('/admin/tuxedolane/formats', { ...(await formOf('formats')), default: 'format' });
  assert.match(text((await page('/litters')).html), /Born September 20, 2026/);
  // A line that needs its {name} is refused without it.
  const bad = await post('/admin/tuxedolane/dogs', await formOf('dogs', { 'words.ask_dog': 'Ask us' }));
  assert.match(await bad.text(), /needs \{name\}/);
});

test('how KennelOS data lands follows the site\'s settings, for new records', async () => {
  const env = await makeEnv();
  const site = await addSite(env, 'tuxedolane', { kennel_name: 'Tuxedo Lane Bostons*' });
  const admin = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const html = await (await call(env, M, '/admin/tuxedolane/kennelos', { headers: { cookie: admin } })).text();
  const f = {};
  for (const m of html.matchAll(/<input type="text" name="([^"]+)" value="([^"]*)"/g)) f[m[1]] = m[2].replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  for (const m of html.matchAll(/<input type="radio" name="([^"]+)" value="([^"]+)" checked>/g)) f[m[1]] = m[2];
  for (const m of html.matchAll(/<select name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) f[m[1]] = m[2].match(/value="([^"]+)" selected/)[1];
  Object.assign(f, {
    'landing.health_display': 'all', 'landing.show_prices': 'off', 'landing.dog_deceased': 'retired', 'landing.dog_puppy': 'breeding',
    'landing.name_heat': 'Coming from {dam}', 'landing.name_none': 'A friend\'s litter', 'landing.label_heat': 'Expected heat', 'landing.new_at': 'start',
    'landing.pup_keeping': 'on',
  }); // show_placed left out: off; of the puppies, only those she's keeping go on the site
  assert.equal((await call(env, M, '/admin/tuxedolane/kennelos', { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body: form(f) })).status, 303);
  // Admin links KennelOS with the KennelOS prices on.
  env.DB.raw.prepare('UPDATE sites SET use_kennelos_prices = 1 WHERE id = ?').run(site.id);
  const code = (await (await call(env, M, '/s/tuxedolane/kennelos/code', { method: 'POST', headers: { cookie: admin, origin: `https://${M}` } })).text()).match(/class="code">([A-Z0-9-]+)</)[1];
  const { token } = await (await call(env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code, kennel_id: 'kennel-sample' }), headers: { 'content-type': 'application/json' } })).json();
  assert.equal((await call(env, API, '/v1/bundle', { method: 'POST', body: JSON.stringify(load('bundle-1.json')), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } })).status, 200);
  const row = (sql) => env.DB.raw.prepare(sql).get(site.id);
  assert.equal(row("SELECT status FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-ginger'").status, 'retired');
  assert.equal(row("SELECT upcoming FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-pippa'").upcoming, 0);
  // Pippa, no longer kept in KennelOS: left off the site, kept in the draft.
  const again = load('bundle-1.json');
  again.bundle_id = `${again.bundle_id}-again`;
  again.dogs.find((d) => d.id === 'dog-pippa').disposition = 'available';
  assert.equal((await call(env, API, '/v1/bundle', { method: 'POST', body: JSON.stringify(again), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } })).status, 200);
  assert.equal(row("SELECT hidden_by_kennelos FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-pippa'").hidden_by_kennelos, 1);
  assert.equal(row("SELECT COUNT(*) AS n FROM dogs WHERE site_id = ? AND health_display = 'all'").n, 10);
  assert.equal(row("SELECT COUNT(*) AS n FROM health_results WHERE site_id = ? AND show = 0").n, 0, 'all results shown, not-normal ones too');
  const gem = row("SELECT * FROM litters WHERE site_id = ? AND kennelos_id = 'lit-a'");
  assert.deepEqual([gem.show_placed, gem.show_prices], [0, 0]);
  assert.ok(gem.price_female != null, 'prices still come; showing them is the breeder\'s switch');
  assert.equal(row("SELECT name, plan_label FROM litters WHERE site_id = ? AND kennelos_id = 'heat-h2'").name, "Coming from Lulu* (a friend's girl)");
  assert.equal(row("SELECT plan_label FROM litters WHERE site_id = ? AND kennelos_id = 'heat-h1'").plan_label, 'Expected heat');
  assert.equal(row("SELECT name FROM litters WHERE site_id = ? AND kennelos_id = 'heat-h1'").name, "A friend's litter");
  // First in her order: the last one sent has the lowest place.
  const sorts = env.DB.raw.prepare('SELECT sort FROM dogs WHERE site_id = ?').all(site.id).map((r) => r.sort);
  assert.ok(Math.max(...sorts) < 0);
});
