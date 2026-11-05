// The demo site (docs/Linked_Sample_Plan.md, step 3; src/kennelos/demo.js): made in
// /ops from the linked sample, linked to the sample instead of a KennelOS device,
// stepped through the series and back to step 1, each step as of today. It is
// marked Demo everywhere, never served at its address, published or indexed, has
// no preview link, can't be invited to, and opens only in the admin view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { makePreviewToken } = await import('../src/site.js');
const { saveBuild, withPart, DEFAULT_TIMING } = await import('../src/content/rules.js');
const { publish } = await import('../src/publish.js');
const { inviteToSite } = await import('../src/auth.js');
const { setDomain } = await import('../src/domains.js');
const { makeLinkCode } = await import('../src/kennelos/link.js');
const { usageNumbers } = await import('../src/ops/usage.js');
const { NOT_FOR_DEMO } = await import('../src/lib/demo.js');

const M = 'manage.kennelport.com';
const API = 'api.kennelport.com';
const form = (o) => new URLSearchParams(o);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
// Any day will do: each step is sent as of the day it's pressed.
const TODAY = '2027-03-10';

async function demo(t) {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${TODAY}T15:00:00Z`) });
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
  const ops = cookies.find((c) => c.startsWith('ops_session='));
  const admin = cookies.find((c) => c.startsWith('kp_admin='));
  const made = await call(env, M, '/ops/sites/demo', { method: 'POST', headers: { cookie: ops } });
  assert.equal(made.status, 303);
  const id = made.headers.get('location').match(/\/ops\/sites\/([0-9a-f-]{36})/)[1];
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  const site = row('SELECT * FROM sites WHERE id = ?', id);
  const opsPost = (action) => call(env, M, `/ops/sites/${id}/${action}`, { method: 'POST', headers: { cookie: ops } });
  const adminGet = (path) => call(env, M, path, { headers: { cookie: admin } });
  const n = (sql, ...a) => row(`SELECT COUNT(*) AS n FROM ${sql}`, id, ...a).n;
  return { env, id, site, ops, admin, opsPost, adminGet, row, n };
}

test('Make a demo site from the sample: linked to the sample, step 1 in, as of today', async (t) => {
  const { env, id, site, ops, row, n } = await demo(t);
  assert.match(site.subdomain, /^demo-[0-9a-f]{6}$/);
  assert.equal(site.kennel_name, 'Tuxedo Lane Bostons*');
  assert.equal(site.demo_step, 1);
  assert.equal(site.portal_on, 1);
  assert.equal(site.status, 'draft');
  // Linked to the sample, not a device: no token can ever match its row.
  const link = row('SELECT * FROM links WHERE site_id = ?', id);
  assert.deepEqual([link.kennelos_kennel_id, link.token_hash, link.device_label], ['kennel-sample', `demo:${id}`, 'The linked sample']);
  // expect-1.md
  assert.equal(n("dogs WHERE site_id = ? AND source = 'kennelos'"), 10);
  assert.equal(n("puppies WHERE site_id = ? AND source = 'kennelos'"), 11);
  assert.equal(n("portal_placements WHERE site_id = ? AND status = 'open'"), 4);
  // As of today: the Spice litter*'s deposits are still three weeks ahead.
  assert.equal(row("SELECT deposits_on FROM litters WHERE site_id = ? AND kennelos_id = 'lit-b'", id).deposits_on, '2027-03-31');

  const list = text(await (await call(env, M, '/ops', { headers: { cookie: ops } })).text());
  assert.match(list, new RegExp(`${site.subdomain} Tuxedo Lane Bostons\\* Demo demo, step 1 of 5`));
  const page = await (await call(env, M, `/ops/sites/${id}`, { headers: { cookie: ops } })).text();
  assert.match(text(page), /Demo · no address of its own/);
  assert.match(page, /Send bundle and feed 2/);
  assert.match(page, /Back to step 1/);
  assert.match(page, new RegExp(`href="/admin/${site.subdomain}/site/"`));
  // None of a real site's ways out.
  for (const gone of ['Make a preview link', '>Publish<', 'Invite', 'Own domain', 'Load the AK sample', 'Switch the portal']) assert.ok(!page.includes(gone), gone);
});

test('the buttons step through the series and back to step 1; her rules for it stay', async (t) => {
  const { env, id, opsPost, row, n } = await demo(t);
  const pup = (kos) => row('SELECT * FROM puppies WHERE site_id = ? AND kennelos_id = ?', id, kos);
  const step = () => row('SELECT demo_step FROM sites WHERE id = ?', id).demo_step;

  assert.equal((await opsPost('demo/next')).headers.get('location'), `/ops/sites/${id}?note=demo_sent`);
  assert.equal(step(), 2);
  assert.equal(pup('dog-onyx').status, 'placed');
  assert.equal(pup('dog-pearl').status, 'reserved');
  await opsPost('demo/next');
  assert.equal(step(), 3);
  assert.equal(n("litters WHERE site_id = ? AND kennelos_kind = 'litter' AND kennelos_id = 'lit-d'"), 1);
  await opsPost('demo/next');
  assert.equal(step(), 4);
  assert.equal(row("SELECT left_site_at FROM litters WHERE site_id = ? AND kennelos_id = 'lit-a'", id).left_site_at.slice(0, 10), TODAY);
  await opsPost('demo/next');
  assert.equal(step(), 5);
  assert.equal(row("SELECT left_site_at FROM litters WHERE site_id = ? AND kennelos_id = 'lit-a'", id).left_site_at, null);
  // There is no step 6.
  assert.match(text(await (await opsPost('demo/next')).text()), /All 5 steps are in/);

  // Something of her own on it, and a rule of hers.
  env.DB.raw.prepare("INSERT INTO dogs (id, site_id, call_name, slug, sex, created_at, updated_at) VALUES ('mine', ?, 'Mine', 'mine', 'female', ?, ?)").run(id, TODAY, TODAY);
  await saveBuild(env, id, withPart({}, 'timing', { ...DEFAULT_TIMING, litter_days: 10 }));

  assert.equal((await opsPost('demo/reset')).headers.get('location'), `/ops/sites/${id}?note=demo_reset`);
  assert.equal(step(), 1);
  assert.equal(n("dogs WHERE site_id = ? AND id = 'mine'"), 0);
  assert.equal(n("dogs WHERE site_id = ? AND source = 'kennelos'"), 10);
  assert.equal(pup('dog-onyx').status !== 'placed', true);
  assert.equal(n('links WHERE site_id = ? AND revoked_at IS NULL'), 1);
  assert.match(row('SELECT build FROM site_builds WHERE site_id = ?', id).build, /"litter_days":10/);
});

test('the demo has no address: not served, not published, no preview, invite, domain or link code', async (t) => {
  const { env, id, site, opsPost } = await demo(t);
  const host = `${site.subdomain}.kennelport.com`;
  const token = await makePreviewToken(env, id);
  for (const path of ['/', '/litters', '/robots.txt', '/sitemap.xml', `/__preview?t=${encodeURIComponent(token)}`, '/family', '/family-login']) {
    const r = await call(env, host, path, { headers: { cookie: `kp_preview=${token}` } });
    assert.equal(r.status, 404, path);
    assert.match(await r.text(), /No KennelPort site has this address/);
  }
  await assert.rejects(publish(env, id, 'operator'), { message: NOT_FOR_DEMO });
  assert.match(text(await (await opsPost('publish')).text()), /This is a demo site/);
  assert.match(text(await (await opsPost('preview')).text()), /This is a demo site/);
  assert.match(text(await (await opsPost('portal/off')).text()), /This is a demo site/);
  await assert.rejects(inviteToSite(env, id, 'someone@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' }), { message: NOT_FOR_DEMO });
  await assert.rejects(setDomain(env, id, 'www.tuxedolane.com'), { message: NOT_FOR_DEMO });
  await assert.rejects(makeLinkCode(env, id, 'admin'), { message: NOT_FOR_DEMO });
  // Nothing can post to it as KennelOS.
  const r = await call(env, API, '/v1/bundle', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', authorization: `Bearer demo:${id}` } });
  assert.equal(r.status, 401);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM snapshots WHERE site_id = ?').get(id).n, 0);
});

test('it opens only in the admin view: the whole site there, marked Demo; the build and the Site Manager say so', async (t) => {
  const { env, id, site, adminGet } = await demo(t);
  const base = `/admin/${site.subdomain}/site`;
  const home = await adminGet(`${base}/`);
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('x-robots-tag'), 'noindex');
  assert.equal(home.headers.get('cache-control'), 'no-store');
  const html = await home.text();
  assert.match(text(html), /Demo: made from the linked sample, step 1 of 5\. Only you see it, in your admin view\. Back to the build/);
  assert.match(html, /<u>Back to the build<\/u>/);
  assert.match(html, /<meta name="robots" content="noindex">/);
  // Its links stay in the admin view; the template's files stay where they are.
  assert.match(html, new RegExp(`href="${base}/litters"`));
  assert.match(html, /href="\/_kp\/t\/ak\/site\.css/);
  assert.doesNotMatch(html, /href="\/litters"/);
  const litters = text(await (await adminGet(`${base}/litters`)).text());
  assert.match(litters, /The Spice litter\* .*Deposits from March 31, 2027/);
  assert.equal((await adminGet(`${base}/no-such-page`)).status, 404);
  assert.equal((await call(env, M, `${base}/contact`, { method: 'POST', headers: { cookie: (await adminCookie(env)), origin: `https://${M}` }, body: form({}) })).status, 405);

  // Nobody else: without admin, the address isn't there.
  assert.notEqual((await call(env, M, `${base}/`)).status, 200);

  const every = text(await (await adminGet('/admin')).text());
  assert.match(every, /Demo Tuxedo Lane Bostons\* Made from the linked sample · step 1 of 5 · only in your admin view/);
  const rules = await (await adminGet(`/admin/${site.subdomain}/rules`)).text();
  assert.match(rules, /<span class="spill brass">Demo<\/span>/);
  assert.match(rules, /<div class="pv-url">Demo · \/litters<\/div>/);
  assert.match(rules, new RegExp(`href="${base}/">The whole demo site, in your admin view`));
  assert.doesNotMatch(rules, /__preview/);

  // Her Site Manager view of it: no View my site, preview, share or publish.
  const sm = await (await adminGet(`/s/${site.subdomain}/website`)).text();
  assert.match(text(sm), /Demo Step 1 of the linked sample · never published/);
  assert.doesNotMatch(sm, /__preview|View my site|>Publish</);
  assert.match(text(await (await adminGet(`/s/${site.subdomain}`)).text()), /Demo Step 1 of the linked sample/);
  for (const p of ['publish', 'share']) assert.match(text(await (await adminGet(`/s/${site.subdomain}/${p}`)).text()), /Demo site\. This is a demo site/);
  const kos = await (await adminGet(`/s/${site.subdomain}/kennelos`)).text();
  assert.match(text(kos), /linked to the linked sample, not to a KennelOS device/);
  assert.doesNotMatch(kos, /Show a link code|Link another device/);
  assert.equal(id.length, 36);
});

test('usage on /ops leaves demos out', async (t) => {
  const { env } = await demo(t);
  await addSite(env, 'realone', { status: 'live' });
  const u = await usageNumbers(env);
  assert.deepEqual(u.sites, { live: 1 });
});

async function adminCookie(env) {
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  return login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
}

test('on the demo, a bundle\'s notice opens the admin view, not Review and publish; ops offers no Suspend', async (t) => {
  const { env, id, site, ops, adminGet } = await demo(t);
  const today = await (await adminGet(`/s/${site.subdomain}`)).text();
  assert.match(today, /From KennelOS:/);
  assert.doesNotMatch(today, /Review and publish/);
  const page = await (await call(env, M, `/ops/sites/${id}`, { headers: { cookie: ops } })).text();
  assert.doesNotMatch(page, /Suspend/);
  assert.match(page, /Close the demo/);
});
