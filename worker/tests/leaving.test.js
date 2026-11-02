import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { publish, forgetSnapshots } = await import('../src/publish.js');

const M = 'manage.kennelport.com';
const h = { origin: `https://${M}` };

async function as(role = 'owner') {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await publish(env, site.id, 'test');
  await inviteToSite(env, site.id, 'b@example.com', role, { manageUrl: 'x', siteUrl: 'y' });
  await call(env, M, '/signin', { method: 'POST', headers: h, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', headers: h, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const get = (p) => call(env, M, `/s/akbostons${p}`, { headers: { cookie } });
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, ...h }, body: body instanceof FormData ? body : new URLSearchParams(body) });
  return { env, site, get, post };
}

async function addPhoto(t) {
  const form = new FormData();
  form.append('full', new Blob([webp(1600, 1200)]), 'full');
  form.append('thumb', new Blob([webp(400, 300)]), 'thumb');
  form.append('alt', 'Willow');
  return (await (await t.post('/photos/upload', form)).json()).id;
}

test('the copy holds the content, the messages and every photo, at full size', async () => {
  const t = await as();
  const photo = await addPhoto(t);
  t.env.DB.raw.prepare("INSERT INTO inquiries (id, site_id, name, email, message, received_at) VALUES ('m1', ?, 'Megan', 'm@example.com', 'Hi', '2026-11-01T00:00:00Z')").run(t.site.id);
  const m = await (await t.get('/export.json')).json();
  assert.match(m.filename, /^akbostons-kennelport-\d{4}-\d{2}-\d{2}\.zip$/);
  assert.equal(m.content.dogs.length, 5);
  assert.equal(m.messages[0].name, 'Megan');
  assert.equal(m.photos[0].file, `${photo}.webp`);
  const full = await t.get(m.photos[0].url.replace('/s/akbostons', ''));
  assert.equal(full.status, 200);
  assert.equal((await full.arrayBuffer()).byteLength, webp(1600, 1200).length);
});

test('the browser zip writer makes a zip that standard tools open', async () => {
  const sandbox = { document: { getElementById: () => null }, TextEncoder, Blob, Uint8Array, Uint32Array, DataView, ArrayBuffer };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(await readFile(new URL('../public/_kp/m/zip.js', import.meta.url), 'utf8'), sandbox);
  const enc = new TextEncoder();
  const blob = sandbox.kpZip([{ name: 'content.json', data: enc.encode('{"a":1}') }, { name: 'photos/x.webp', data: webp(10, 10) }, { name: 'café.txt', data: enc.encode('é') }]);
  const dir = await mkdtemp(`${tmpdir()}/kpzip-`);
  await writeFile(`${dir}/t.zip`, new Uint8Array(await blob.arrayBuffer()));
  const out = execFileSync('python3', ['-I', '-c', "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print('|'.join(z.namelist())); print(z.read('content.json').decode())", `${dir}/t.zip`]).toString();
  assert.match(out, /content\.json\|photos\/x\.webp\|café\.txt/);
  assert.match(out, /\{"a":1\}/);
});

test('delete my site: owner, fresh sign-in, typed subdomain; then everything is gone', async () => {
  const t = await as();
  await addPhoto(t);
  const page = await (await t.get('/account')).text();
  assert.match(page, /Download a copy/);
  assert.match(page, /Type <strong>akbostons<\/strong> to confirm/);
  assert.match(await (await t.post('/account/delete', { confirm: 'nope' })).text(), /Type akbostons to confirm/);
  const res = await t.post('/account/delete', { confirm: 'akbostons' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/deleted');
  assert.equal((await call(t.env, 'akbostons.kennelport.com', '/')).status, 410);
  for (const table of ['dogs', 'photos', 'site_users', 'inquiries', 'snapshots']) assert.equal(t.env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, table);
  assert.equal([...t.env.FILES.store.keys()].filter((k) => k.startsWith(`sites/${t.site.id}/`)).length, 0);
  assert.equal((await t.get('/account')).status, 404, 'no longer on any site');
});

test('an editor can download a copy but not delete', async () => {
  const t = await as('editor');
  const page = await (await t.get('/account')).text();
  assert.match(page, /Download a copy/);
  assert.doesNotMatch(page, /Delete my site/);
  assert.match(await (await t.post('/account/delete', { confirm: 'akbostons' })).text(), /Only the owner/);
  assert.equal(t.env.DB.raw.prepare('SELECT status FROM sites').get().status, 'live');
});

test('a sign-in older than 15 minutes must sign in again before deleting', async () => {
  const t = await as();
  t.env.DB.raw.prepare("UPDATE sessions SET created_at = '2026-01-01T00:00:00Z'").run();
  const page = await (await t.get('/account')).text();
  assert.match(page, /needs a fresh sign-in/);
  assert.match(await (await t.post('/account/delete', { confirm: 'akbostons' })).text(), /Sign in again first/);
  assert.equal(t.env.DB.raw.prepare('SELECT status FROM sites').get().status, 'live');
});

test('limits set in ops are shown to the breeder and enforced on upload', async () => {
  const t = await as();
  const opsCookie = (await call(t.env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  assert.equal((await call(t.env, M, `/ops/sites/${t.site.id}/limits`, { method: 'POST', headers: { cookie: opsCookie }, body: new URLSearchParams({ storage_mb: '', photos: '1' }) })).status, 303);
  await addPhoto(t);
  const form = new FormData();
  form.append('full', new Blob([webp(800, 600)]), 'full');
  const second = await t.post('/photos/upload', form);
  assert.equal(second.status, 400);
  assert.match((await second.json()).message, /limit of 1 photos/);
  assert.match(await (await t.get('/photos')).text(), /1 photo of 1/);
  assert.match(await (await call(t.env, M, `/ops/sites/${t.site.id}/limits`, { method: 'POST', headers: { cookie: opsCookie }, body: new URLSearchParams({ storage_mb: 'lots', photos: '' }) })).text(), /whole numbers/);
});
