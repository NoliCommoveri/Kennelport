import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call } from './helpers/env.js';
import { webp, jpeg } from './helpers/images.js';

const { checkPhoto } = await import('../src/photos.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const M = 'manage.kennelport.com';

async function ops(extra) {
  const env = await makeEnv(extra);
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const get = (path) => call(env, M, path, { headers: { cookie } });
  const post = (path, body = {}) => call(env, M, path, { method: 'POST', headers: { cookie }, body: body instanceof FormData ? body : new URLSearchParams(body) });
  return { env, get, post };
}

async function newSite(o, subdomain = 'akbostons') {
  const res = await o.post('/ops/sites', { subdomain, kennel_name: 'AK Boston Terriers' });
  assert.equal(res.status, 303);
  return res.headers.get('location').match(/sites\/([0-9a-f-]{36})/)[1];
}

test('photo checks: WebP and JPEG pass; camera data, other types and oversize are refused', () => {
  assert.deepEqual(checkPhoto(webp(1600, 1200)).width, 1600);
  assert.equal(checkPhoto(jpeg(1200, 900)).height, 900);
  assert.throws(() => checkPhoto(webp(800, 600, { exif: true })), /camera data/);
  assert.throws(() => checkPhoto(jpeg(800, 600, { exif: true })), /camera data/);
  assert.throws(() => checkPhoto(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])), /Only WebP or JPEG/);
  assert.throws(() => checkPhoto(webp(5000, 100)), /at most 2400/);
  assert.throws(() => checkPhoto(new Uint8Array(4 * 1024 * 1024).fill(0xff)), /too large/);
});

test('create a site, refuse bad or taken names, and see it listed', async () => {
  const o = await ops();
  await newSite(o);
  assert.match(await (await o.post('/ops/sites', { subdomain: 'akbostons', kennel_name: 'X' })).text(), /already a site/);
  assert.match(await (await o.post('/ops/sites', { subdomain: 'admin', kennel_name: 'X' })).text(), /reserved name/);
  assert.match(await (await o.post('/ops/sites', { subdomain: 'Bad Name', kennel_name: 'X' })).text(), /lower-case/);
  assert.match(await (await o.get('/ops')).text(), /akbostons<\/a>/);
});

test('from ops: sample content, preview link, publish, undo', async () => {
  const o = await ops();
  const id = await newSite(o);
  assert.equal((await o.post(`/ops/sites/${id}/sample`)).status, 303);
  const prev = await (await o.post(`/ops/sites/${id}/preview`)).text();
  const link = prev.match(/href="(https:\/\/akbostons\.kennelport\.com\/__preview\?t=[^"]+)"/)[1].replace(/&amp;/g, '&');
  const opened = await call(o.env, 'akbostons.kennelport.com', new URL(link).pathname + new URL(link).search);
  assert.equal(opened.status, 303);
  assert.equal((await o.post(`/ops/sites/${id}/publish`)).status, 303);
  assert.match(await (await call(o.env, 'akbostons.kennelport.com', '/')).text(), /Small dogs with big hearts/);
  assert.match(await (await o.post(`/ops/sites/${id}/undo`)).text(), /no earlier version/);
  const page = await (await o.get(`/ops/sites/${id}?note=published`)).text();
  assert.match(page, /Published\. Visitors now see this version/);
});

test('content import from ops: bad JSON and bad content are refused with the reason, nothing saved', async () => {
  const o = await ops();
  const id = await newSite(o);
  assert.match(await (await o.post(`/ops/sites/${id}/content`, { content: '{oops' })).text(), /isn&#39;t valid JSON/);
  const bad = await (await o.post(`/ops/sites/${id}/content`, { content: JSON.stringify({ dogs: [{ slug: 'x', call_name: 'X', sex: 'dog' }] }) })).text();
  assert.match(bad, /Nothing was saved\. dogs\[0\]\.sex: one of female, male/);
  assert.equal(await o.env.DB.prepare('SELECT COUNT(*) AS n FROM dogs').first('n'), 0);
  assert.equal((await o.post(`/ops/sites/${id}/content`, { content: JSON.stringify({ dogs: AK_SAMPLE.dogs }) })).status, 303);
  const exported = await (await o.get(`/ops/sites/${id}/content.json`)).json();
  assert.equal(exported.dogs.length, 5);
});

test('photo upload from ops is checked, stored and usable in content', async () => {
  const o = await ops();
  const id = await newSite(o);
  const form = new FormData();
  form.append('full', new Blob([webp(1600, 1200)]), 'full');
  form.append('thumb', new Blob([webp(400, 300)]), 'thumb');
  form.append('alt', 'Willow on autumn leaves');
  const res = await o.post(`/ops/sites/${id}/photos`, form);
  assert.equal(res.status, 200);
  const { id: photoId } = await res.json();
  const bad = new FormData();
  bad.append('full', new Blob([jpeg(800, 600, { exif: true })]), 'full');
  const refused = await o.post(`/ops/sites/${id}/photos`, bad);
  assert.equal(refused.status, 400);
  assert.match((await refused.json()).message, /camera data/);
  assert.equal((await o.get(`/ops/sites/${id}/photos/${photoId}`)).status, 200);
  await o.post(`/ops/sites/${id}/content`, { content: JSON.stringify({ dogs: [{ slug: 'willow', call_name: 'Willow', sex: 'female', photo_id: photoId }] }) });
  await o.post(`/ops/sites/${id}/publish`);
  const html = await (await call(o.env, 'akbostons.kennelport.com', '/dogs/willow')).text();
  assert.match(html, new RegExp(`src="/_kp/p/${photoId}"[^>]*alt="Willow"`));
});

test('closing deletes everything but the marker, shows 410, and holds the name until released', async () => {
  const o = await ops();
  const id = await newSite(o);
  await o.post(`/ops/sites/${id}/sample`);
  const form = new FormData();
  form.append('full', new Blob([webp()]), 'full');
  await o.post(`/ops/sites/${id}/photos`, form);
  await o.post(`/ops/sites/${id}/publish`);
  assert.match(await (await o.post(`/ops/sites/${id}/close`, { confirm: 'wrong' })).text(), /Type akbostons to confirm/);
  assert.equal((await o.post(`/ops/sites/${id}/close`, { confirm: 'akbostons' })).status, 303);
  for (const t of ['dogs', 'litters', 'puppies', 'photos', 'snapshots', 'stories', 'extras', 'site_pages', 'home_blocks']) {
    assert.equal(await o.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first('n'), 0, t);
  }
  assert.equal([...o.env.FILES.store.keys()].filter((k) => k.startsWith(`sites/${id}/`)).length, 0);
  const row = await o.env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first();
  assert.equal(row.status, 'closed');
  assert.equal(row.kennel_name, null);
  const gone = await call(o.env, 'akbostons.kennelport.com', '/dogs/willow');
  assert.equal(gone.status, 410);
  assert.match(await (await o.post('/ops/sites', { subdomain: 'akbostons', kennel_name: 'Someone else' })).text(), /closed site/);
  assert.equal((await o.post(`/ops/sites/${id}/release`)).status, 303);
  assert.equal((await o.post('/ops/sites', { subdomain: 'akbostons', kennel_name: 'Someone else' })).status, 303);
});

test('suspend hides the site from visitors and back on restores it', async () => {
  const o = await ops();
  const id = await newSite(o);
  await o.post(`/ops/sites/${id}/sample`);
  await o.post(`/ops/sites/${id}/publish`);
  await o.post(`/ops/sites/${id}/suspend`);
  assert.equal((await call(o.env, 'akbostons.kennelport.com', '/')).status, 503);
  await o.post(`/ops/sites/${id}/resume`);
  assert.equal((await call(o.env, 'akbostons.kennelport.com', '/')).status, 200);
});

test('on staging, site links go through /__host and ?next', async () => {
  const o = await ops({ ALLOW_HOST_OVERRIDE: '1' });
  const id = await newSite(o);
  assert.match(await (await o.get(`/ops/sites/${id}`)).text(), /href="\/__host\?h=akbostons\.kennelport\.com&amp;next=%2F"/);
  const hop = await call(o.env, 'kp.workers.dev', '/__host?h=akbostons.kennelport.com&next=/litters');
  assert.equal(hop.status, 303);
  assert.equal(hop.headers.get('location'), '/litters');
  assert.equal((await call(o.env, 'kp.workers.dev', '/__host?h=akbostons.kennelport.com&next=//evil.example')).status, 200);
});

test('ops site routes need the ops sign-in', async () => {
  const env = await makeEnv();
  const res = await call(env, M, '/ops/sites', { method: 'POST', body: new URLSearchParams({ subdomain: 'x', kennel_name: 'X' }) });
  assert.match(await res.text(), /Ops token/);
  assert.equal(await env.DB.prepare('SELECT COUNT(*) AS n FROM sites').first('n'), 0);
});
