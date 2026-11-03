import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';

async function ops(extra) {
  const env = await makeEnv(extra);
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const get = (path) => call(env, M, path, { headers: { cookie } });
  const post = (path, body = {}) => call(env, M, path, { method: 'POST', headers: { cookie }, body: new URLSearchParams(body) });
  return { env, get, post };
}

test('a pending domain serves the site; the kennelport.com address still does too', async () => {
  const o = await ops();
  const site = await addSite(o.env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  assert.equal((await o.post(`/ops/sites/${site.id}/domain`, { hostname: 'https://WWW.AKBostons.com/' })).status, 303);
  assert.match(await (await o.get(`/ops/sites/${site.id}`)).text(), /www\.akbostons\.com<\/code><\/a> · pending/);

  const own = await call(o.env, 'www.akbostons.com', '/');
  assert.equal(own.status, 200);
  assert.match(await own.text(), /AK Boston Terriers/);
  assert.equal((await call(o.env, 'akbostons.kennelport.com', '/')).status, 200);

  // The bare name goes to the www. one with the same path.
  const bare = await call(o.env, 'akbostons.com', '/dogs?x=1');
  assert.equal(bare.status, 301);
  assert.equal(bare.headers.get('location'), 'https://www.akbostons.com/dogs?x=1');
  assert.equal((await call(o.env, 'other.com', '/')).status, 404);
});

test('an active domain is the main address: the kennelport.com one redirects, forms still post', async () => {
  const o = await ops();
  const site = await addSite(o.env, 'akbostons');
  await o.post(`/ops/sites/${site.id}/domain`, { hostname: 'www.akbostons.com' });
  assert.equal((await o.post(`/ops/sites/${site.id}/domain/activate`)).status, 303);

  const old = await call(o.env, 'akbostons.kennelport.com', '/dogs/willow?a=b');
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), 'https://www.akbostons.com/dogs/willow?a=b');
  assert.equal((await call(o.env, 'www.akbostons.com', '/')).status, 200);
  assert.notEqual((await call(o.env, 'akbostons.kennelport.com', '/contact', { method: 'POST', body: new URLSearchParams({}) })).status, 301);

  // Staging reaches sites through /__host, so it never redirects.
  const staging = await makeEnv({ ALLOW_HOST_OVERRIDE: '1' });
  const s2 = await addSite(staging, 'akbostons');
  await staging.DB.prepare("INSERT INTO custom_domains (hostname, site_id, status, created_at) VALUES ('www.akbostons.com', ?, 'active', '2026-11-03')").bind(s2.id).run();
  assert.equal((await call(staging, 'kp.workers.dev', '/', { headers: { cookie: 'kp_host=akbostons.kennelport.com' } })).status, 200);

  await o.post(`/ops/sites/${site.id}/domain/pause`);
  assert.equal((await call(o.env, 'akbostons.kennelport.com', '/')).status, 200);
  await o.post(`/ops/sites/${site.id}/domain/remove`);
  assert.equal((await call(o.env, 'www.akbostons.com', '/')).status, 404);
});

test('domains are checked: not ours, not another site\'s, not nonsense', async () => {
  const o = await ops();
  const a = await addSite(o.env, 'akbostons');
  const b = await addSite(o.env, 'thornfield');
  await o.post(`/ops/sites/${a.id}/domain`, { hostname: 'www.akbostons.com' });
  assert.match(await (await o.post(`/ops/sites/${b.id}/domain`, { hostname: 'akbostons.com' })).text(), /another site/);
  assert.match(await (await o.post(`/ops/sites/${b.id}/domain`, { hostname: 'x.kennelport.com' })).text(), /already the site/);
  assert.match(await (await o.post(`/ops/sites/${b.id}/domain`, { hostname: 'not a domain' })).text(), /isn&#39;t a domain|isn't a domain/);
  assert.match(await (await o.post(`/ops/sites/${b.id}/domain/activate`)).text(), /no domain yet/);
});

test('closing a site forgets its domain', async () => {
  const o = await ops();
  const site = await addSite(o.env, 'akbostons');
  await o.post(`/ops/sites/${site.id}/domain`, { hostname: 'www.akbostons.com' });
  await o.post(`/ops/sites/${site.id}/close`, { confirm: 'akbostons' });
  assert.equal((await call(o.env, 'www.akbostons.com', '/')).status, 404);
  assert.equal(await o.env.DB.prepare('SELECT COUNT(*) AS n FROM custom_domains').first('n'), 0);
});
