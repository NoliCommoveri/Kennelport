// Tags (docs/plans/kennelos-contract.md Part D, content/tags.js): the owner's tags by
// rule and the ones the breeder may choose, made on the owner's Tags screen; hers
// ticked on a dog's form; a tag as a field (conditions) and a card item (pills).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { buildSnapshot, forgetSnapshots } = await import('../src/publish.js');
const { loadBuild } = await import('../src/content/rules.js');
const { blockRows } = await import('../src/render/parts.js');
const { cleanBlock } = await import('../src/content/blocks.js');
const { renderPage } = await import('../src/render/index.js');
const { cleanTags } = await import('../src/content/tags.js');

const M = 'manage.kennelport.com';
const TODAY = '2026-11-20';
const origin = { origin: `https://${M}` };

async function setUp() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const doc = structuredClone(AK_SAMPLE);
  Object.assign(doc.dogs.find((d) => d.slug === 'willow'), { titles: 'CH GCH' });
  Object.assign(doc.dogs.find((d) => d.slug === 'boone'), { titles: 'CH' });
  await importContent(env, site.id, doc);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  await call(env, M, '/signin', { method: 'POST', headers: origin, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const her = (await call(env, M, '/signin/verify', { method: 'POST', headers: origin, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const admin = (await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) })).headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const owner = (path, body) => call(env, M, `/admin/akbostons${path}`, { method: body ? 'POST' : 'GET', headers: { cookie: admin, ...origin }, body });
  const breeder = (path, body) => call(env, M, `/s/akbostons${path}`, { method: body ? 'POST' : 'GET', headers: { cookie: her, ...origin }, body });
  const tags = async () => cleanTags((await loadBuild(env, site.id)).tags);
  return { env, site, owner, breeder, tags };
}

// The Tags screen's form as it stands, with changes.
async function formOf(owner, changes = {}) {
  const html = await (await owner('/tags')).text();
  const f = new URLSearchParams();
  for (const m of html.matchAll(/<input type="text" name="([^"]+)" value="([^"]*)"/g)) f.set(m[1], m[2].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
  for (const m of html.matchAll(/<select name="([^"]+)">([\s\S]*?)<\/select>/g)) f.set(m[1], (m[2].match(/value="([^"]*)" selected/) ?? m[2].match(/value="([^"]*)"/))[1]);
  for (const [k, v] of Object.entries(changes)) {
    f.delete(k);
    for (const x of [v].flat()) if (x != null) f.append(k, x);
  }
  return f;
}

test('the owner makes tags by rule and tags she may choose; a tag holds by its conditions and shows as pills on a card', async () => {
  const { env, site, owner, breeder, tags } = await setUp();
  assert.equal((await owner('/tags')).status, 200);

  // A tag by rule: "Champion" on dogs whose titles include CH.
  await owner('/tags', await formOf(owner, { act: 'rule+', addkind: 'dog' }));
  const [rule] = (await tags()).rules;
  await owner('/tags', await formOf(owner, { act: `cond+:${rule.id}`, [`b.${rule.id}.addcond`]: 'title', [`t.${rule.id}.words`]: 'Champion', [`t.${rule.id}.pill`]: 'avail' }));
  await owner('/tags', await formOf(owner, { [`b.${rule.id}.where.0.op`]: 'includes', [`b.${rule.id}.where.0.value`]: 'ch' }));
  let T = await tags();
  assert.deepEqual(T.rules.map(({ kind, words, pill, where }) => ({ kind, words, pill, where })), [{ kind: 'dog', words: 'Champion', pill: 'avail', where: [{ field: 'title', op: 'includes', value: 'ch' }] }]);
  // A rule's conditions can't be on tags (round in circles): the field isn't offered.
  assert.doesNotMatch(await (await owner('/tags')).text(), new RegExp(`name="b\\.${rule.id}\\.where\\.0\\.field"[^>]*>[\\s\\S]*?value="tags"`));

  // A tag she may choose.
  await owner('/tags', await formOf(owner, { act: 'own+' }));
  const [mine] = (await tags()).own;
  await owner('/tags', await formOf(owner, { [`own.${mine.id}.words`]: 'Therapy dog' }));
  T = await tags();
  assert.equal(T.own[0].words, 'Therapy dog');

  // She ticks it on Peaches in her Site Manager; her form offers only the owner's.
  const peaches = env.DB.raw.prepare("SELECT * FROM dogs WHERE slug = 'peaches'").get();
  const dogForm = await (await breeder(`/dogs/${peaches.id}`)).text();
  assert.match(dogForm, /Therapy dog/);
  const body = new URLSearchParams({ call_name: peaches.call_name, sex: peaches.sex, slug: peaches.slug, show_on_site: '1', life_stage: 'retired' });
  body.append('tags', mine.id);
  assert.equal((await breeder(`/dogs/${peaches.id}`, body)).status, 303);
  assert.deepEqual(JSON.parse(env.DB.raw.prepare("SELECT tags FROM dogs WHERE slug = 'peaches'").get().tags), [mine.id]);
  const bad = new URLSearchParams(body);
  bad.set('tags', 'not a tag');
  assert.equal((await breeder(`/dogs/${peaches.id}`, bad)).status, 200, 'refused, the form again');

  // As a field: a block's conditions.
  const snap = await buildSnapshot(env, site.id);
  const names = (where) => blockRows(snap, cleanBlock({ id: 'd', type: 'dogs', f: {}, where }), TODAY).map((d) => d.call_name.replace(/\*$/, ''));
  assert.deepEqual(names([{ field: 'tags', op: 'includes', value: 'champion' }]).sort(), ['Boone', 'Willow']);
  assert.deepEqual(names([{ field: 'tags', op: 'includes', value: 'therapy dog' }]), ['Peaches']);

  // As a card item: pills, only where the owner adds Tags to a card.
  const draw = (home) => renderPage({ ...snap, layout: { ...snap.layout, home } }, { path: '/', origin: 'https://x', today: TODAY, preview: true }).html;
  const block = cleanBlock({ id: 'dogs', type: 'dogs', f: {}, where: [], show: { front: ['photo', 'call', 'tags'], back: ['tests'], light: ['call'], beside: ['call'] } });
  assert.match(draw([block]), /<span class="line1 tags"><span class="status avail">Champion<\/span><\/span>/);
  assert.doesNotMatch(draw([cleanBlock({ id: 'dogs', type: 'dogs', f: {}, where: [] })]), /class="line1 tags"/, "today's cards: no tags");

  // Removed by the owner: her tick is kept but nothing shows.
  await owner('/tags', await formOf(owner, { act: `del:${mine.id}` }));
  assert.equal((await tags()).own.length, 0);
  assert.doesNotMatch(await (await breeder(`/dogs/${peaches.id}`)).text(), /Therapy dog/);
  const after = await buildSnapshot(env, site.id);
  assert.deepEqual(blockRows(after, cleanBlock({ id: 'd', type: 'dogs', f: {}, where: [{ field: 'tags', op: 'has_any' }] }), TODAY).map((d) => d.call_name.replace(/\*$/, '')).sort(), ['Boone', 'Willow']);
});

test('tags by rule on pups; a tag with no words never shows', async () => {
  const { env, site, owner, tags } = await setUp();
  await owner('/tags', await formOf(owner, { act: 'rule+', addkind: 'puppy' }));
  const [t] = (await tags()).rules;
  const snap0 = await buildSnapshot(env, site.id);
  const pups = (s, where) => blockRows(s, cleanBlock({ id: 'p', type: 'pups', where }), TODAY).length;
  assert.equal(pups(snap0, [{ field: 'tags', op: 'has_any' }]), 0, 'no words: no tag');
  await owner('/tags', await formOf(owner, { [`t.${t.id}.words`]: 'Show prospect' }));
  const snap = await buildSnapshot(env, site.id);
  assert.equal(pups(snap, [{ field: 'tags', op: 'includes', value: 'show prospect' }]), pups(snap, []), 'no conditions: on every pup');
});
