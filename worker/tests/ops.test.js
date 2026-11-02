import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call } from './helpers/env.js';

const M = 'manage.kennelport.com';

async function signIn(env) {
  const res = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  assert.equal(res.status, 303);
  return res.headers.get('set-cookie').split(';')[0];
}

test('ops is closed without OPS_TOKEN, and never falls open', async () => {
  const env = await makeEnv({ OPS_TOKEN: undefined });
  const res = await call(env, M, '/ops');
  assert.equal(res.status, 503);
  assert.match(await res.text(), /OPS_TOKEN is not set/);
});

test('a wrong token is refused; the right one signs in', async () => {
  const env = await makeEnv();
  const bad = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'nope' }) });
  assert.equal(bad.status, 401);
  assert.equal((await call(env, M, '/ops/migrate', { method: 'POST' })).status, 200); // the login page, not a migration
  const cookie = await signIn(env);
  const page = await (await call(env, M, '/ops', { headers: { cookie } })).text();
  assert.match(page, /Setup checks/);
  assert.match(page, /R2 \(FILES\)<\/td><td class="ok">OK/);
  assert.match(page, /D1 \(DB\)<\/td><td class="ok">OK/);
  assert.match(page, /The database matches this deploy/);
});

test('a forged or expired cookie is not a session', async () => {
  const env = await makeEnv();
  const forged = `ops_session=${Math.floor(Date.now() / 1000) + 3600}.deadbeef`;
  assert.match(await (await call(env, M, '/ops', { headers: { cookie: forged } })).text(), /Ops token/);
});

test('Apply pending migrates a new database, after which sites are served', async () => {
  const env = await makeEnv({}, { migrated: false });
  const cookie = await signIn(env);
  assert.match(await (await call(env, M, '/ops', { headers: { cookie } })).text(), /Apply pending/);
  const run = await (await call(env, M, '/ops/migrate', { method: 'POST', headers: { cookie } })).text();
  assert.match(run, /0001 schema: applied/);
  assert.equal((await call(env, 'akbostons.kennelport.com', '/')).status, 404); // no site yet, but no longer 503
});

test('missing bindings are reported, not thrown', async () => {
  const env = await makeEnv();
  const cookie = await signIn(env);
  delete env.FILES;
  const page = await (await call(env, M, '/ops', { headers: { cookie } })).text();
  assert.match(page, /R2 \(FILES\)<\/td><td class="bad">Problem<\/td><td>not bound/);
});
