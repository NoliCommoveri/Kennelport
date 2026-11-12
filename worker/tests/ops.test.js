import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call } from './helpers/env.js';

const { OPS_FAILS_PER_HOUR } = await import('../src/ops.js');

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

test('opening ops applies a new database\'s migrations; Apply pending reruns a failed one', async () => {
  const env = await makeEnv({}, { migrated: false });
  const cookie = await signIn(env);
  const page = await (await call(env, M, '/ops', { headers: { cookie } })).text();
  assert.match(page, /The database matches this deploy/);
  assert.doesNotMatch(page, /Apply pending/);

  const failing = await makeEnv({}, { migrated: false });
  const batch = failing.DB.batch.bind(failing.DB);
  failing.DB.batch = async () => { throw new Error('broken'); };
  const quiet = console.error;
  console.error = () => {};
  const c2 = await signIn(failing);
  try {
    assert.match(await (await call(failing, M, '/ops', { headers: { cookie: c2 } })).text(), /one still pending here failed[\s\S]*Apply pending/);
  } finally {
    console.error = quiet;
  }
  failing.DB.batch = batch;
  const run = await (await call(failing, M, '/ops/migrate', { method: 'POST', headers: { cookie: c2 } })).text();
  assert.match(run, /0001 schema: applied/);
  assert.equal((await call(failing, 'akbostons.kennelport.com', '/')).status, 404); // no site yet, but no longer 503
});

test('wrong tokens are limited per address; the right one still works from elsewhere', async () => {
  const env = await makeEnv();
  const from = (ip, token) => call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token }), headers: { 'cf-connecting-ip': ip } });
  for (let i = 0; i < OPS_FAILS_PER_HOUR; i++) assert.equal((await from('203.0.113.9', 'guess' + i)).status, 401);
  const locked = await from('203.0.113.9', 'ops-token');
  assert.equal(locked.status, 429);
  assert.match(await locked.text(), /Too many wrong tokens/);
  assert.equal((await from('198.51.100.4', 'ops-token')).status, 303);
  // Signing in doesn't count against anyone.
  for (let i = 0; i < OPS_FAILS_PER_HOUR + 2; i++) assert.equal((await from('198.51.100.4', 'ops-token')).status, 303);
});

test('ops can still be signed in to before the database has any tables', async () => {
  const env = await makeEnv({}, { migrated: false });
  assert.equal((await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'nope' }) })).status, 401);
  assert.equal((await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) })).status, 303);
});

test('missing bindings are reported, not thrown', async () => {
  const env = await makeEnv();
  const cookie = await signIn(env);
  delete env.FILES;
  const page = await (await call(env, M, '/ops', { headers: { cookie } })).text();
  assert.match(page, /R2 \(FILES\)<\/td><td class="bad">Problem<\/td><td>not bound/);
});
