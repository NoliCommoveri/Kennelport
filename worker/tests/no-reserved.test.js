// There is no `reserved` pup status (docs/plans/kennelos-contract.md, "No reserved"):
// a pup with an open sale is Placed in KennelOS. Stored pups aren't rewritten, so a
// pup stored as reserved reads as placed everywhere and is saved as placed next time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { PUPPY_FIELDS, PUPPY_STATUSES, cleanRecord, pupStatus } = await import('../src/content/model.js');
const { PUP_STATUSES, DEFAULT_RULES, ruleKey, rulesFor } = await import('../src/content/rules.js');
const { statusText } = await import('../src/render/parts.js');
const { cleanBundle } = await import('../src/kennelos/bundle.js');

const M = 'manage.kennelport.com';

test('reserved is no status of its own: not offered, not a rule, read as placed', () => {
  assert.equal(PUPPY_STATUSES.includes('reserved'), false);
  assert.equal(PUP_STATUSES.includes('reserved'), false);
  assert.equal('reserved' in DEFAULT_RULES.status, false);
  assert.equal(pupStatus('reserved'), 'placed');
  assert.equal(pupStatus('available'), 'available');
  assert.equal(pupStatus(undefined), undefined);
  assert.equal(ruleKey('reserved'), 'placed');
  assert.equal(ruleKey('coming_soon'), 'undecided');
  assert.equal(statusText('reserved'), statusText('placed'));
  // A site's stored rule for reserved is ignored.
  assert.equal('reserved' in rulesFor({ rules: { status: { reserved: { words: 'Spoken for' } } } }).rules.status, false);
});

test('an older file with a reserved pup imports, as placed', () => {
  const pup = cleanRecord(PUPPY_FIELDS, { slug: 'opal', name: 'Opal', sex: 'female', status: 'reserved' }, 'pup', { partial: true });
  assert.equal(pup.status, 'placed');
  assert.throws(() => cleanRecord(PUPPY_FIELDS, { slug: 'opal', name: 'Opal', sex: 'female', status: 'spoken_for' }, 'pup', { partial: true }));
});

test('KennelOS sending reserved is refused: it never did, and now never will', () => {
  const body = JSON.parse(readFileSync(new URL('./fixtures/linked-sample/bundle-1.json', import.meta.url)));
  assert.doesNotThrow(() => cleanBundle(structuredClone(body)));
  body.litters.find((l) => l.puppies.length).puppies[0].status = 'reserved';
  assert.throws(() => cleanBundle(body));
});

test('in the Site Manager a pup stored as reserved shows and opens as placed, and saves as placed', async () => {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = async (p) => (await call(env, M, `/s/akbostons${p}`, { headers: { cookie } })).text();
  const post = (p, body) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });

  const pup = env.DB.raw.prepare("SELECT id, litter_id FROM puppies WHERE slug = 'opal'").get();
  env.DB.raw.prepare("UPDATE puppies SET status = 'reserved' WHERE id = ?").run(pup.id);

  // The quick list and the pup's own form both start on Placed, never on Available.
  const list = await get('/puppies');
  assert.match(list, /<option value="placed" selected>/);
  assert.doesNotMatch(list, /value="reserved"/);
  const form = await get(`/litters/${pup.litter_id}/puppies/${pup.id}`);
  assert.match(form, /<option value="placed" selected>/);
  assert.doesNotMatch(form, /value="reserved"/);

  // Saved again, it is stored as placed.
  assert.equal((await post(`/puppies/${pup.id}/status`, { status: 'reserved' })).status, 303);
  assert.equal(env.DB.raw.prepare('SELECT status FROM puppies WHERE id = ?').get(pup.id).status, 'placed');
});
