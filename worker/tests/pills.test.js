// Pills on her site (a pup's status, tags, a dog looking for a home): one style for the
// site (sites.pill_style, set by the owner on Formats, hers to change on Kennel
// details), and each pill's colour one of its scheme's, named per scheme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { buildSnapshot, forgetSnapshots } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { PILL_COLOURS, pillColours, pillName, SCHEMES } = await import('../src/render/schemes.js');
const { PILL_KEYS, PILL_STYLES, pillKey } = await import('../src/content/model.js');
const { rulesFor } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';
const origin = { origin: `https://${M}` };

test('every scheme names its pill colours, each once; a stored Green or Brass outline reads as ok or held', () => {
  for (const s of SCHEMES) {
    const named = pillColours(s.id);
    assert.ok(named.length >= 4, s.id);
    assert.equal(new Set(named.map(([, , hex]) => hex)).size, named.length, `${s.id}: a colour offered twice`);
    for (const k of PILL_KEYS) assert.ok(pillName(s.id, k), `${s.id}.${k}: no name`);
    assert.deepEqual(Object.keys(PILL_COLOURS[s.id]).filter((k) => !PILL_KEYS.includes(k)), []);
  }
  assert.equal(pillName('midnight', 'brass'), 'Gold', 'a colour left out reads as its twin');
  assert.equal(pillKey('avail'), 'ok');
  assert.equal(pillKey('res'), 'held');
  assert.equal(rulesFor({ rules: { status: { placed: { pill: 'avail' } } } }).rules.status.placed.pill, 'ok');
});

test('the owner sets the pill style on Formats; she changes it on Kennel details; the site draws it', async () => {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, structuredClone(AK_SAMPLE));
  const admin = (await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) })).headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const style = () => env.DB.raw.prepare('SELECT pill_style FROM sites WHERE id = ?').get(site.id).pill_style;
  const draw = async () => renderPage(await buildSnapshot(env, site.id), { path: '/litters/gem-2026', origin: 'https://x', today: '2026-11-20', preview: true }).html;

  assert.equal(style(), 'dot');
  let html = await draw();
  assert.doesNotMatch(html, /data-pills=/, "today's dot needs nothing");
  assert.match(html, /class="status c-(ok|held)"/);

  const formats = await (await call(env, M, '/admin/akbostons/formats', { headers: { cookie: admin } })).text();
  for (const words of Object.values(PILL_STYLES)) assert.ok(formats.includes(words), words);
  const f = new URLSearchParams();
  for (const m of formats.matchAll(/<input type="text" name="([^"]+)" value="([^"]*)"/g)) f.set(m[1], m[2]);
  for (const m of formats.matchAll(/<input type="radio" name="([^"]+)" value="([^"]+)" checked>/g)) f.set(m[1], m[2]);
  f.set('site.pill_style', 'wave');
  assert.equal((await call(env, M, '/admin/akbostons/formats', { method: 'POST', headers: { cookie: admin, ...origin }, body: f })).status, 303);
  assert.equal(style(), 'wave');
  forgetSnapshots();
  assert.match(await draw(), /<html[^>]* data-pills="wave"/);

  // Hers to change, on Kennel details.
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  await call(env, M, '/signin', { method: 'POST', headers: origin, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const her = (await call(env, M, '/signin/verify', { method: 'POST', headers: origin, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const details = await (await call(env, M, '/s/akbostons/details', { headers: { cookie: her } })).text();
  assert.match(details, /name="pill_style"/);
  await call(env, M, '/s/akbostons/details', { method: 'POST', headers: { cookie: her, ...origin }, body: new URLSearchParams({ kennel_name: 'AK Boston Terriers', dark_mode: 'auto', pill_style: 'capsule' }) });
  assert.equal(style(), 'capsule');
  // A save of Kennel details without the field leaves it.
  await call(env, M, '/s/akbostons/details', { method: 'POST', headers: { cookie: her, ...origin }, body: new URLSearchParams({ kennel_name: 'AK Boston Terriers', dark_mode: 'auto' }) });
  assert.equal(style(), 'capsule');

  // The owner's Pups screen offers this scheme's colours by name.
  const pups = await (await call(env, M, '/admin/akbostons/rules', { headers: { cookie: admin } })).text();
  for (const [, name] of pillColours('lawn')) assert.ok(pups.includes(`>${name}</option>`), name);
  assert.doesNotMatch(pups, /Brass outline/);
});
