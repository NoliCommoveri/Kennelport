import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

test('a site subdomain finds its site, and an unknown one is a 404', async () => {
  const env = await makeEnv();
  await addSite(env, 'akbostons', { kennel_name: 'AK <Boston> Terriers' });
  const res = await call(env, 'akbostons.kennelport.com', '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /AK &lt;Boston&gt; Terriers/);
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal((await call(env, 'nobody.kennelport.com', '/')).status, 404);
});

test('a closed site answers 410 on every path', async () => {
  const env = await makeEnv();
  await addSite(env, 'gone', { status: 'closed', kennel_name: null, closed_at: '2026-11-01T00:00:00Z' });
  for (const path of ['/', '/dogs/willow']) {
    const res = await call(env, 'gone.kennelport.com', path);
    assert.equal(res.status, 410);
    assert.match(await res.text(), /no longer hosting with KennelPort/);
  }
});

test('reserved, two-level and unconnected custom hosts get nothing', async () => {
  const env = await makeEnv();
  for (const host of ['admin.kennelport.com', 'www.akbostons.kennelport.com', 'www.akbostons.com', 'sites.kennelport.com']) {
    assert.equal((await call(env, host, '/')).status, 404, host);
  }
});

test('sites answer 503 until migrations are applied; health says so', async () => {
  const env = await makeEnv({}, { migrated: false });
  assert.equal((await call(env, 'akbostons.kennelport.com', '/')).status, 503);
  const health = await (await call(env, 'manage.kennelport.com', '/health')).json();
  assert.deepEqual(health, { ok: false, maintenance: true });
});

test('home, manage and api answer', async () => {
  const env = await makeEnv();
  assert.equal((await call(env, 'kennelport.com', '/')).status, 200);
  assert.equal((await call(env, 'manage.kennelport.com', '/')).status, 200);
  assert.deepEqual(await (await call(env, 'api.kennelport.com', '/health')).json(), { ok: true, maintenance: false });
  assert.equal((await call(env, 'api.kennelport.com', '/nothing')).status, 404);
});

test('staging: /__host switches which host the browser sees; production ignores it', async () => {
  const staging = await makeEnv({ ALLOW_HOST_OVERRIDE: '1' });
  await addSite(staging, 'akbostons');
  const set = await call(staging, 'kp.workers.dev', '/__host?h=akbostons.kennelport.com');
  const cookie = set.headers.get('set-cookie').split(';')[0];
  assert.match(cookie, /^kp_host=akbostons\.kennelport\.com$/);
  const site = await call(staging, 'kp.workers.dev', '/', { headers: { cookie } });
  assert.match(await site.text(), /Test Kennel/);
  // No cookie: staging is the manage host, so /ops is reachable.
  assert.equal((await call(staging, 'kp.workers.dev', '/ops')).status, 200);

  const prod = await makeEnv();
  assert.equal((await call(prod, 'kp.workers.dev', '/__host?h=akbostons.kennelport.com')).status, 404);
});

test('kennelport.com: the front page and the terms, linked from the sign-ins and every site', async () => {
  const env = await makeEnv();
  const home = await call(env, 'kennelport.com', '/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /font-src 'self'/);
  const h = await home.text();
  assert.match(h, /A website for your kennel/);
  assert.match(h, /href="\/terms"/);
  const terms = await (await call(env, 'kennelport.com', '/terms')).text();
  assert.equal((terms.match(/<h2 id="s\d+">/g) || []).length, 22);
  assert.match(terms, /which runs\s+KennelPort|which runs KennelPort/);
  assert.equal((await call(env, 'kennelport.com', '/nothing')).status, 404);
  const privacy = await (await call(env, 'kennelport.com', '/privacy')).text();
  assert.equal((privacy.match(/<h2 id="p\d+">/g) || []).length, 15);
  assert.match(terms, /<a href="\/privacy">privacy policy<\/a>/);
  assert.match(await (await call(env, 'manage.kennelport.com', '/')).text(), /kennelport\.com\/terms/);
  const { importContent } = await import('../src/content/io.js');
  const { AK_SAMPLE } = await import('../src/content/akSample.js');
  const { publish, forgetSnapshots } = await import('../src/publish.js');
  forgetSnapshots();
  const site = await addSite(env, 'akbostons');
  await importContent(env, site.id, AK_SAMPLE);
  await publish(env, site.id, 'test');
  assert.match(await (await call(env, 'akbostons.kennelport.com', '/')).text(), /Made with <a href="https:\/\/kennelport\.com\/">KennelPort<\/a> · <a href="https:\/\/kennelport\.com\/terms">Terms<\/a>/);
});

test('something unexpected going wrong answers a plain page, not a crash', async (t) => {
  const env = await makeEnv();
  await addSite(env, 'akbostons');
  t.mock.method(console, 'error', () => {});
  assert.equal((await call(env, 'akbostons.kennelport.com', '/')).status, 200);
  env.DB.prepare = () => { throw new Error('the database is away'); };
  const page = await call(env, 'akbostons.kennelport.com', '/');
  assert.equal(page.status, 500);
  assert.match(await page.text(), /Something went wrong/);
  assert.match(console.error.mock.calls[0].arguments[0], /unhandled: GET \/: Error: the database is away/);
});
