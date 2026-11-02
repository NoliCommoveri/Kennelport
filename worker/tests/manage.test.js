import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const ORIGIN = `https://${M}`;
const form = (o) => new URLSearchParams(o);
const post = (env, path, body, headers = {}) => call(env, M, path, { method: 'POST', body: form(body), headers: { origin: ORIGIN, ...headers } });
const lastOutbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id DESC LIMIT 1').get();

async function opsCookie(env) {
  const r = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  return r.headers.get('set-cookie').split(';')[0];
}

async function invited(email = 'breeder@example.com', role = 'owner') {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const cookie = await opsCookie(env);
  const res = await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie }, body: form({ email, role }) });
  assert.equal(res.status, 303);
  return { env, site, cookie };
}

async function signIn(env, email = 'breeder@example.com') {
  await post(env, '/signin', { email });
  const code = lastOutbox(env).subject.match(/(\d{6})/)[1];
  const res = await post(env, '/signin/verify', { email, code, label: 'Test phone' });
  assert.equal(res.status, 303);
  return res.headers.get('set-cookie').split(';')[0];
}

test('the invite is "sent" (staging outbox), says where to sign in, and keeps no address', async () => {
  const { env, site, cookie } = await invited('Breeder@Example.com');
  const m = lastOutbox(env);
  assert.equal(m.kind, 'invite');
  assert.match(m.body, /manage AK Boston Terriers's website/);
  assert.match(m.body, /https:\/\/manage\.kennelport\.com/);
  const all = JSON.stringify(env.DB.raw.prepare('SELECT * FROM site_users').all()) + JSON.stringify(env.DB.raw.prepare('SELECT * FROM dev_outbox').all());
  assert.doesNotMatch(all.toLowerCase(), /breeder@example\.com/);
  const opsPage = await (await call(env, M, `/ops/sites/${site.id}`, { headers: { cookie } })).text();
  assert.match(opsPage, /owner<\/td><td class="muted">invited .*not signed in yet/);
  assert.match(await (await call(env, M, '/ops', { headers: { cookie } })).text(), /Staging outbox/);
});

test('sign in with a code, land on the site, sign out', async () => {
  const { env } = await invited();
  assert.match(await (await call(env, M, '/')).text(), /Send me a code/);
  const session = await signIn(env);
  const home = await call(env, M, '/', { headers: { cookie: session } });
  assert.equal(home.status, 303);
  assert.equal(home.headers.get('location'), '/s/akbostons');
  const site = await (await call(env, M, '/s/akbostons', { headers: { cookie: session } })).text();
  assert.match(site, /AK Boston Terriers/);
  assert.match(site, /Not published yet/);
  assert.equal(await env.DB.prepare('SELECT COUNT(*) AS n FROM site_users WHERE joined_at IS NOT NULL').first('n'), 1);
  await post(env, '/signout', {}, { cookie: session });
  assert.equal((await call(env, M, '/s/akbostons', { headers: { cookie: session } })).status, 303);
});

test('an address with no site gets the same answer and no code', async () => {
  const { env } = await invited();
  const before = env.DB.raw.prepare('SELECT COUNT(*) AS n FROM dev_outbox').get().n;
  const res = await post(env, '/signin', { email: 'stranger@example.com' });
  assert.match(await res.text(), /If <strong>stranger@example\.com<\/strong> manages a KennelPort site, a 6-digit code is on its way/);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM dev_outbox').get().n, before);
});

test('wrong codes, reused codes and too many tries are refused', async () => {
  const { env } = await invited();
  await post(env, '/signin', { email: 'breeder@example.com' });
  const code = lastOutbox(env).subject.match(/(\d{6})/)[1];
  const wrong = code === '000000' ? '111111' : '000000';
  assert.match(await (await post(env, '/signin/verify', { email: 'breeder@example.com', code: wrong })).text(), /isn&#39;t right/);
  assert.equal((await post(env, '/signin/verify', { email: 'breeder@example.com', code })).status, 303);
  assert.match(await (await post(env, '/signin/verify', { email: 'breeder@example.com', code })).text(), /expired/);
  await post(env, '/signin', { email: 'breeder@example.com' });
  for (let i = 0; i < 5; i++) await post(env, '/signin/verify', { email: 'breeder@example.com', code: wrong });
  const fresh = lastOutbox(env).subject.match(/(\d{6})/)[1];
  assert.match(await (await post(env, '/signin/verify', { email: 'breeder@example.com', code: fresh })).text(), /Too many tries/);
});

test('codes are rate limited per address', async () => {
  const { env } = await invited();
  for (let i = 0; i < 5; i++) await post(env, '/signin', { email: 'breeder@example.com' });
  assert.match(await (await post(env, '/signin', { email: 'breeder@example.com' })).text(), /Too many codes/);
});

test('a session only reaches its own sites, and a removed person loses access', async () => {
  const { env, site, cookie } = await invited();
  await addSite(env, 'other', { kennel_name: 'Other Kennel' });
  const session = await signIn(env);
  assert.equal((await call(env, M, '/s/other', { headers: { cookie: session } })).status, 404);
  const eh = env.DB.raw.prepare('SELECT email_hash FROM site_users').get().email_hash;
  await call(env, M, `/ops/sites/${site.id}/people/remove`, { method: 'POST', headers: { cookie }, body: form({ email_hash: eh }) });
  assert.equal((await call(env, M, '/s/akbostons', { headers: { cookie: session } })).status, 404);
});

test('forms from another origin are refused', async () => {
  const { env } = await invited();
  const res = await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: 'https://akbostons.kennelport.com' } });
  assert.equal(res.status, 403);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM dev_outbox WHERE kind = 'code'").get().n, 0);
});

test('without a mail provider, sign-in says so instead of pretending', async () => {
  const { env } = await invited();
  delete env.DEV_OUTBOX;
  assert.match(await (await post(env, '/signin', { email: 'breeder@example.com' })).text(), /Email isn&#39;t set up yet/);
});

test('the app installs: manifest, service worker at the root, icons, strict CSP', async () => {
  const env = await makeEnv();
  const man = await (await call(env, M, '/manifest.webmanifest')).json();
  assert.equal(man.name, 'KennelPort Site Manager');
  assert.equal(man.display, 'standalone');
  const sw = await call(env, M, '/sw.js');
  assert.equal(sw.status, 200);
  assert.equal(sw.headers.get('service-worker-allowed'), '/');
  for (const i of man.icons) assert.equal((await call(env, M, i.src)).status, 200, i.src);
  const page = await call(env, M, '/');
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.doesNotMatch(await page.text(), /\sstyle="/);
});
