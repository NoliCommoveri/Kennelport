// Display and timing rules (docs/Site_Builder_Plan.md, step 1), checked on the
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
