// Origin and lineage (docs/plans/kennelos-contract.md C4, C7, step 6): KennelOS's
// origin and lineage sections land on a dog; import and import-descended as fields and
// as the Origin item; the Pedigree part of a dog's page; her Pedigree card's Make a dog
// record for a KennelOS ancestor known by name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { buildSnapshot, forgetSnapshots } = await import('../src/publish.js');
const { loadBuild, saveBuild } = await import('../src/content/rules.js');
const { withProfile, cleanProfile, cleanBlock, SHOW_DEFAULT } = await import('../src/content/blocks.js');
const { blockRows, dogCard, recordCtx, originText } = await import('../src/render/parts.js');
const { renderPage } = await import('../src/render/index.js');
const { pedigreeOf, matches } = await import('../src/content/fields.js');

const M = 'manage.kennelport.com';
const API = 'api.kennelport.com';
const KENNEL = 'kennel-1';
const TODAY = '2026-11-20';
const origin = { origin: `https://${M}` };

async function linkedSite() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  await call(env, M, '/signin', { method: 'POST', headers: origin, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', headers: origin, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const get = async (p) => (await call(env, M, `/s/akbostons${p}`, { headers: { cookie } })).text();
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, ...origin }, body: new URLSearchParams(body) });
  const html = await (await post('/kennelos/code')).text();
  const linkCode = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const { token } = await (await call(env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code: linkCode, kennel_id: KENNEL }), headers: { 'content-type': 'application/json' } })).json();
  let n = 0;
  const send = async (dogs) => {
    const r = await call(env, API, '/v1/bundle', { method: 'POST', body: JSON.stringify({ format: 1, bundle_id: `lineage-${++n}-xxxxxx`, kennel_id: KENNEL, dogs, litters: [], pairings: [], heats: [] }), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200, await r.clone().text());
    return r.json();
  };
  const dog = (kos) => env.DB.raw.prepare('SELECT * FROM dogs WHERE site_id = ? AND kennelos_id = ?').get(site.id, kos);
  const byName = (name) => env.DB.raw.prepare('SELECT * FROM dogs WHERE site_id = ? AND call_name = ?').get(site.id, name);
  return { env, site, get, post, send, dog, byName };
}

// Atlas, imported from Hungary, his sire Duna (pedigree only, imported) and dam Lili.
// Pippa, Atlas × Clover; her grandsire Duna. Wren: no lineage sent.
const ATLAS = {
  id: 'k-atlas', call_name: 'Atlas', sex: 'male', status: 'active_breeding', imported: true, import_country: 'Hungary', breed: 'Boston Terrier',
  sire_id: 'k-duna', dam_id: null,
  ancestors: [
    { id: 'k-duna', path: 'sire', call_name: 'Duna', registered_name: 'Dunai Duna', titles: ['HCH'], imported: true, import_country: 'Hungary' },
    { id: 'k-lili', path: 'dam', call_name: 'Lili', titles: [], imported: false },
  ],
};
const CLOVER = { id: 'k-clover', call_name: 'Clover', sex: 'female', status: 'active_breeding', imported: false, ancestors: [] };
const PIPPA = {
  id: 'k-pippa', call_name: 'Pippa', sex: 'female', status: 'active_breeding', imported: false, sire_id: 'k-atlas', dam_id: 'k-clover',
  ancestors: [
    { id: 'k-atlas', path: 'sire', call_name: 'Atlas', titles: ['CH'], imported: true, import_country: 'Hungary' },
    { id: 'k-clover', path: 'dam', call_name: 'Clover', titles: [], imported: false },
    { id: 'k-duna', path: 'sire.sire', call_name: 'Duna', titles: ['HCH'], imported: true, import_country: 'Romania' },
    { id: 'k-lili', path: 'sire.dam', call_name: 'Lili', titles: [], imported: false },
  ],
};
const WREN = { id: 'k-wren', call_name: 'Wren', sex: 'female', status: 'active_breeding' };

test('origin and lineage land on a dog: its origin, breed, parents and ancestors, KennelOS\'s from then on', async () => {
  const { send, dog, get, post } = await linkedSite();
  // Pippa comes first: her sire and dam are made later in the same bundle, and still link.
  await send([PIPPA, ATLAS, CLOVER, WREN]);
  const [atlas, clover, pippa, wren] = ['k-atlas', 'k-clover', 'k-pippa', 'k-wren'].map(dog);
  assert.deepEqual([atlas.imported, atlas.import_country, atlas.breed, atlas.kennelos_origin], [1, 'Hungary', 'Boston Terrier', 1]);
  assert.deepEqual([clover.imported, clover.kennelos_origin], [0, 1]);
  assert.deepEqual([pippa.sire_id, pippa.dam_id, pippa.sire_name], [atlas.id, clover.id, null]);
  // Duna isn't a dog on the site: Atlas's sire is his name.
  assert.deepEqual([atlas.sire_id, atlas.sire_name, atlas.dam_name], [null, 'Duna', 'Lili']);
  assert.deepEqual(JSON.parse(pippa.ancestors).map((a) => a.path), ['sire', 'dam', 'sire.sire', 'sire.dam']);
  // No lineage sent: nothing stored, and her parents stay hers.
  assert.deepEqual([wren.ancestors, wren.kennelos_origin, wren.imported], [null, 0, null]);

  // Her dog form: what KennelOS sent is locked; Wren's parents and origin are hers.
  const form = await get(`/dogs/${atlas.id}`);
  assert.match(form, /<b>Country of origin<\/b><br>Hungary <span class="muted small">· from KennelOS/);
  assert.match(form, /<b>Sire, if not one of your dogs<\/b><br>Duna <span class="muted small">· from KennelOS/);
  assert.doesNotMatch(await get(`/dogs/${wren.id}`), /<b>Country of origin<\/b><br>/);
  await post(`/dogs/${wren.id}`, { call_name: 'Wren', sex: 'female', slug: wren.slug, show_on_site: '1', life_stage: 'breeding', sire_name: 'Moose', imported: '1', import_country: 'Romania' });
  assert.deepEqual([dog('k-wren').sire_name, dog('k-wren').imported, dog('k-wren').import_country], ['Moose', 1, 'Romania']);

  // An older KennelOS (neither section): what's stored stays.
  await send([{ id: 'k-atlas', call_name: 'Atlas', sex: 'male', status: 'active_breeding' }, { id: 'k-pippa', call_name: 'Pippa', sex: 'female', status: 'active_breeding' }]);
  assert.deepEqual([dog('k-atlas').imported, dog('k-atlas').sire_name, dog('k-pippa').sire_id], [1, 'Duna', atlas.id]);
  assert.equal(dog('k-pippa').ancestors, pippa.ancestors);
});

test('a lineage KennelOS knows only in part: a parent it doesn\'t name stays hers', async () => {
  const { send, dog, env } = await linkedSite();
  await send([WREN]);
  env.DB.raw.prepare("UPDATE dogs SET dam_name = 'Her own Mabel' WHERE kennelos_id = 'k-wren'").run();
  await send([{ ...WREN, ancestors: [{ id: 'k-moose', path: 'sire', call_name: 'Moose' }] }]);
  assert.deepEqual([dog('k-wren').sire_name, dog('k-wren').dam_name], ['Moose', 'Her own Mabel']);
});

test('import and import-descended: fields, the owner\'s generations, her switch, and the Origin item', async () => {
  const { send, env, site, dog } = await linkedSite();
  await send([PIPPA, ATLAS, CLOVER]);
  let snap = await buildSnapshot(env, site.id);
  const names = (where, s = snap) => blockRows(s, cleanBlock({ id: 'd', type: 'dogs', where }), TODAY).map((d) => d.call_name).filter((x) => ['Atlas', 'Clover', 'Pippa'].includes(x)).sort();
  assert.deepEqual(names([{ field: 'import', op: 'yes' }]), ['Atlas']);
  // Atlas has an imported sire; Pippa an imported sire and grandsire.
  assert.deepEqual(names([{ field: 'import_descended', op: 'yes' }]), ['Atlas', 'Pippa']);
  assert.deepEqual(names([{ field: 'breed', op: 'is', value: 'boston terrier' }]), ['Atlas']);

  // Origin: the dog's own country, or every different one of its imported ancestors, nearest first.
  const by = (s, n) => s.dogs.find((d) => d.call_name === n);
  assert.equal(originText(snap, by(snap, 'Atlas')), 'Import • Hungary');
  assert.equal(originText(snap, by(snap, 'Pippa')), 'Import Ancestry • Hungary, Romania');
  assert.equal(originText(snap, by(snap, 'Clover')), '');
  // On a card only where the owner puts it.
  assert.doesNotMatch(dogCard(snap, by(snap, 'Pippa')), /Import/);
  const show = { ...structuredClone(SHOW_DEFAULT.dogs), back: ['call', 'origin'] };
  assert.match(dogCard(snap, by(snap, 'Pippa'), { show }), /<ul class="tests"><li><span>Origin<\/span><span>Import Ancestry • Hungary, Romania<\/span><\/li><\/ul>/);

  // The owner's generations: parents only. Pippa's imported sire still counts.
  const build = await loadBuild(env, site.id);
  await saveBuild(env, site.id, { ...build, rules: { dogs: { import_generations: 1 } } });
  snap = await buildSnapshot(env, site.id);
  assert.equal(originText(snap, by(snap, 'Pippa')), 'Import Ancestry • Hungary');
  // Her switch leaves one dog out.
  env.DB.raw.prepare('UPDATE dogs SET import_descended_off = 1 WHERE id = ?').run(dog('k-pippa').id);
  snap = await buildSnapshot(env, site.id);
  assert.deepEqual(names([{ field: 'import_descended', op: 'yes' }]), ['Atlas']);
  // A litter's parents: from an import.
  const rc = recordCtx(snap, TODAY);
  assert.ok(matches('litter', { dam_id: by(snap, 'Pippa').id, sire_id: by(snap, 'Atlas').id, puppies: [] }, [{ field: 'a_parent.import', op: 'yes' }], rc));
});

test('the Pedigree part of a dog\'s page: off by default; a generation at a time, linked where on the site', async () => {
  const { send, env, site } = await linkedSite();
  await send([PIPPA, ATLAS, CLOVER]);
  const page = async () => renderPage(await buildSnapshot(env, site.id), { path: '/dogs/pippa', origin: 'https://x', today: TODAY, preview: true }).html;
  assert.doesNotMatch(await page(), /Grandparents/);
  const pr = cleanProfile('dog', null);
  pr.parts.below.push('pedigree');
  await saveBuild(env, site.id, withProfile(await loadBuild(env, site.id), 'dog', pr));
  const html = await page();
  assert.match(html, /<span class="eyebrow">Pedigree<\/span>/);
  assert.match(html, /<span class="eyebrow">Parents<\/span><ul class="tests"><li><span>Sire<\/span><span>CH <a href="\/dogs\/atlas">Atlas<\/a><\/span><\/li><li><span>Dam<\/span><span><a href="\/dogs\/clover">Clover<\/a><\/span><\/li><\/ul>/);
  assert.match(html, /<span class="eyebrow">Grandparents<\/span><ul class="tests"><li><span>Sire&#39;s sire<\/span><span>HCH Duna<\/span><\/li>/);
  assert.doesNotMatch(html, /k-duna/, 'KennelOS ids stay off the site');
});

test('her records\' pedigree, with no KennelOS: the same part, from her dogs\' sire and dam', async () => {
  forgetSnapshots();
  const env = await makeEnv();
  const s = await addSite(env, 'akped');
  const doc = structuredClone(AK_SAMPLE);
  Object.assign(doc.dogs.find((d) => d.slug === 'boone'), { imported: true, import_country: 'Romania' });
  Object.assign(doc.dogs.find((d) => d.slug === 'ziva'), { sire: 'boone', dam: 'willow' });
  await importContent(env, s.id, doc);
  const snap = await buildSnapshot(env, s.id);
  const ziva = snap.dogs.find((d) => d.slug === 'ziva');
  const rows = pedigreeOf(ziva, recordCtx(snap, TODAY));
  assert.deepEqual(rows.map((r) => [r.path.join('.'), r.call_name.replace(/\*$/, ''), Boolean(r.dog)]), [['sire', 'Boone', true], ['dam', 'Willow', true]]);
  assert.equal(originText(snap, ziva), 'Import Ancestry • Romania');
});

test('her pedigree card: KennelOS\'s ancestors, and Make a dog record for one known by name', async () => {
  const { send, dog, get, post, byName, env, site } = await linkedSite();
  await send([PIPPA, ATLAS, CLOVER]);
  const card = (html) => html.slice(html.indexOf('id="pedigree"'));
  const pippa = dog('k-pippa');
  let html = card(await get(`/dogs/${pippa.id}`));
  assert.match(html, /<b>Atlas<\/b><span>Sire<\/span>/);
  assert.match(html, /<b>Duna<\/b><span>Sire&#39;s sire · from KennelOS<\/span><\/a>\s*<form method="post" action="\/s\/akbostons\/dogs\/[0-9a-f-]{36}\/make-ancestor"><input type="hidden" name="path" value="sire.sire">/);
  const made = await post(`/dogs/${pippa.id}/make-ancestor`, { path: 'sire.sire' });
  const duna = byName('Duna');
  assert.equal(made.headers.get('location'), `/s/akbostons/dogs/${duna.id}?note=made_ancestor`);
  assert.deepEqual([duna.outside, duna.sex, duna.titles, duna.imported, duna.import_country, duna.kennelos_ancestor_id], [1, 'male', 'HCH', 1, 'Romania', 'k-duna']);
  assert.match(card(await get(`/dogs/${pippa.id}`)), /<b>Duna<\/b><span>Sire&#39;s sire<\/span>/);
  // Again: nothing more is made.
  await post(`/dogs/${pippa.id}/make-ancestor`, { path: 'sire.sire' });
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM dogs WHERE call_name = 'Duna'").get().n, 1);
  // Atlas's sire, Duna by name until now: the next update links him.
  await send([PIPPA, ATLAS, CLOVER]);
  assert.deepEqual([dog('k-atlas').sire_id, dog('k-atlas').sire_name], [duna.id, null]);
  // On the site, Pippa's pedigree links to Duna's page only once he is on it (not my dog: he is).
  const snap = await buildSnapshot(env, site.id);
  const rows = pedigreeOf(snap.dogs.find((d) => d.call_name === 'Pippa'), recordCtx(snap, TODAY));
  assert.equal(rows.find((r) => r.path.join('.') === 'sire.sire').dog?.id, duna.id);
});

test('a bundle\'s lineage is checked: places, depth, names', async () => {
  const { cleanBundle } = await import('../src/kennelos/bundle.js');
  const says = (re) => (err) => re.test(err.extra?.message ?? '');
  const b = (ancestors) => ({ format: 1, bundle_id: 'check-lineage-1', kennel_id: KENNEL, dogs: [{ ...WREN, ancestors }], litters: [], pairings: [], heats: [] });
  assert.throws(() => cleanBundle(b([{ path: 'sire', call_name: 'A' }, { path: 'sire', call_name: 'B' }])), says(/sent twice/));
  assert.throws(() => cleanBundle(b([{ path: 'sire.sire.sire.sire.sire', call_name: 'A' }])), says(/four generations/));
  assert.throws(() => cleanBundle(b([{ path: 'sire' }])), says(/a call name or a registered name/));
  assert.throws(() => cleanBundle(b([{ path: 'sire', call_name: 'A', owner: 'x' }])), says(/not a field/));
  const ok = cleanBundle(b([{ path: 'dam.sire', call_name: 'B', imported: false, import_country: 'Peru' }, { path: 'sire', call_name: 'A' }]));
  assert.deepEqual(ok.dogs[0].ancestors.map((a) => [a.path, a.imported, a.import_country]), [['sire', null, null], ['dam.sire', false, null]]);
});
