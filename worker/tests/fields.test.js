// Blocks over any field (docs/plans/kennelos-contract.md step 2: B1, B2, B4): the one
// list of fields (content/fields.js), conditions, order and groups for Dog cards, Litter
// cards and Pup cards, and old blocks reading as the same conditions with identical results.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { newBlock, cleanBlock, HOME_DEFAULT, DOG_STATUS, ANY3, SEXES, STAGES } = await import('../src/content/blocks.js');
const { blockRows, litterStage } = await import('../src/render/parts.js');
const { FIELDS, NOT_FOR_BLOCKS, MODEL_FIELDS, cleanCond, siteColours } = await import('../src/content/fields.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');

const TODAY = '2026-11-20';

async function site() {
  const env = await makeEnv();
  const s = await addSite(env, 'akfields');
  const doc = structuredClone(AK_SAMPLE);
  const set = (slug, v) => Object.assign(doc.dogs.find((d) => d.slug === slug), v);
  set('willow', { titles: 'CH GCH', color: 'Seal & White', date_of_birth: '2020-05-01', status: 'active' });
  set('ziva', { color: 'brindle  &  white', date_of_birth: '2022-01-15', status: 'active', upcoming: true });
  set('peaches', { color: 'Fawn', status: 'retired', date_of_birth: '2018-03-03' });
  set('pearl', { color: 'Black & white', status: 'active', for_sale: true, price: 1500 });
  set('boone', { titles: 'CH', color: 'Black & white', date_of_birth: '2019-07-07', status: 'active' });
  doc.dogs.push({ slug: 'duke', call_name: 'Duke', sex: 'male', outside: true, owner_name: 'Oakridge Bostons', color: 'Blue' });
  // Pearl's litter has an outside sire by name only.
  Object.assign(doc.litters.find((l) => l.slug === 'pearl-2027'), { sire_name: 'Rocky' });
  // Gem's deposits open after TODAY: available soon. Ziva's is past going home: older.
  Object.assign(doc.litters.find((l) => l.slug === 'gem-2026'), { deposits_on: '2026-12-01' });
  doc.litters.find((l) => l.slug === 'gem-2026').puppies[1].color = 'Fawn';
  await importContent(env, s.id, doc);
  const snap = await buildSnapshot(env, s.id);
  const draw = (blocks, p = '/') => renderPage({ ...snap, layout: { ...snap.layout, home: blocks } }, { path: p, origin: 'https://x', today: TODAY, preview: true }).html;
  return { env, s, snap, draw };
}
const rows = (snap, b) => blockRows(snap, cleanBlock(b), TODAY);
// The sample's names carry a * (made up); compared without it.
const names = (snap, b) => rows(snap, b).map((x) => (x.call_name ?? x.name).replace(/\*$/, ''));

test('every model field is in the field list or named as not for blocks, never both', () => {
  for (const [kind, model] of Object.entries(MODEL_FIELDS)) {
    for (const k of Object.keys(model)) {
      const listed = Object.hasOwn(FIELDS[kind], k) || (kind === 'litter' && Object.hasOwn(FIELDS.litter, `dam.${k}`));
      const not = NOT_FOR_BLOCKS[kind].includes(k);
      assert.ok(listed !== not, `${kind}.${k}: ${listed ? 'listed and named not for blocks' : 'in neither list'}`);
    }
    for (const k of NOT_FOR_BLOCKS[kind]) assert.ok(Object.hasOwn(model, k), `${kind}.${k} is not in the model`);
  }
});

// Today's filters, as render/parts.js dogsFor had them before conditions.
function oldDogs(snap, f, order) {
  const flag = (v, has) => v === 'any' || (v === 'only' ? has : !has);
  const list = snap.dogs.filter((d) => f.status.includes(d.status) && (f.sex === 'any' || d.sex === f.sex)
    && flag(f.upcoming, Boolean(d.upcoming)) && flag(f.sale, Boolean(d.for_sale)) && flag(f.away, Boolean(d.lives_away)) && flag(f.outside, Boolean(d.outside)));
  const born = (d) => d.date_of_birth || '9999';
  if (order === 'name') return [...list].sort((a, c) => a.call_name.localeCompare(c.call_name));
  if (order === 'age') return [...list].sort((a, c) => born(a).localeCompare(born(c)));
  if (order === 'young') return [...list].sort((a, c) => (c.date_of_birth || '').localeCompare(a.date_of_birth || ''));
  return list;
}

test('an old Dog cards block reads as the same conditions, with identical dogs in the same order', async () => {
  const { snap } = await site();
  const statuses = [['active'], ['active', 'retired'], ['retired', 'remembered'], Object.keys(DOG_STATUS)];
  let tried = 0;
  for (const status of statuses) for (const sex of Object.keys(SEXES)) for (const upcoming of Object.keys(ANY3)) for (const sale of Object.keys(ANY3))
    for (const outside of Object.keys(ANY3)) for (const order of ['own', 'name', 'age', 'young']) {
      const f = { status, sex, upcoming, sale, away: 'no', outside };
      const b = { id: 'dogs', type: 'dogs', f, order };
      assert.deepEqual(names(snap, b), oldDogs(snap, f, order).map((d) => d.call_name.replace(/\*$/, '')), JSON.stringify(b));
      tried++;
    }
  assert.ok(tried > 1000);
  // Stored again, it's in the new form, and still the same.
  const b = cleanBlock({ id: 'dogs', type: 'dogs', f: { status: ['active'], sex: 'female', upcoming: 'only' }, order: 'young' });
  assert.equal(b.f, undefined);
  assert.equal(b.order, 'date_of_birth:down');
  assert.deepEqual(b.where, [{ field: 'life_stage', op: 'one_of', value: ['upcoming'] }, { field: 'residence', op: 'one_of', value: ['home'] }, { field: 'sex', op: 'is', value: 'female' }]);
  // A filter that kept nothing still keeps nothing.
  assert.deepEqual(names(snap, { id: 'd', type: 'dogs', f: { status: ['retired'], upcoming: 'only' } }), []);
  assert.deepEqual(cleanBlock(b), b);
  // Home's default block is today's: the breeding dogs.
  assert.deepEqual(names(snap, HOME_DEFAULT.find((x) => x.id === 'dogs')), oldDogs(snap, { status: ['active'], sex: 'any', upcoming: 'no', sale: 'no', away: 'no', outside: 'no' }).map((d) => d.call_name.replace(/\*$/, '')));
});

test('an old Litter cards block: its stages read as the stages the site shows, with identical litters', async () => {
  const { snap } = await site();
  assert.deepEqual(Object.fromEntries(snap.litters.map((l) => [l.slug, litterStage(snap, l, TODAY)])),
    { 'gem-2026': 'available_soon', 'ziva-boone-2026': 'older', 'peaches-boone-2027': 'planned', 'pearl-2027': 'planned' });
  const subsets = [['current'], ['planned'], ['past'], ['current', 'planned'], Object.keys(STAGES)];
  for (const stage of subsets) {
    const b = { id: 'litters', type: 'litters', f: { stage } };
    assert.deepEqual(names(snap, b), snap.litters.filter((l) => stage.includes(l.stage)).map((l) => l.name.replace(/\*$/, '')), stage.join());
  }
  assert.deepEqual(names(snap, newBlock('litters', 'l')), snap.litters.filter((l) => l.stage !== 'past').map((l) => l.name.replace(/\*$/, '')));
});

test('conditions: a colour by ticks, titles, numbers, dates, and either parent', async () => {
  const { snap } = await site();
  const dogs = (...where) => names(snap, { id: 'd', type: 'dogs', where });
  // The colour picker's colours: the site's, case and spacing evened out.
  assert.deepEqual(Object.keys(siteColours(snap)), ['black & white', 'blue', 'brindle & white', 'fawn', 'seal & white']);
  assert.deepEqual(dogs({ field: 'color', op: 'one_of', value: ['Seal & White', 'brindle & white'] }), ['Willow', 'Ziva']);
  assert.deepEqual(dogs({ field: 'title', op: 'includes', value: 'ch' }), ['Willow', 'Boone']);
  assert.deepEqual(dogs({ field: 'title', op: 'includes', value: 'gch' }), ['Willow']);
  assert.deepEqual(dogs({ field: 'has_titles', op: 'no' }, { field: 'residence', op: 'is_not', value: 'not_mine' }), ['Ziva', 'Peaches', 'Pearl']);
  assert.deepEqual(dogs({ field: 'age', op: 'at_least', value: '6' }), ['Willow', 'Peaches', 'Boone']);
  assert.deepEqual(dogs({ field: 'date_of_birth', op: 'after', value: '2021-01-01' }), ['Ziva']);
  assert.deepEqual(dogs({ field: 'price', op: 'below', value: '2000' }), ['Pearl']);
  assert.deepEqual(dogs({ field: 'residence', op: 'is', value: 'not_mine' }), ['Duke']);
  assert.deepEqual(dogs({ field: 'life_stage', op: 'one_of', value: ['upcoming', 'for_sale'] }), ['Ziva', 'Pearl']);

  const litters = (...where) => names(snap, { id: 'l', type: 'litters', where });
  assert.deepEqual(litters({ field: 'a_parent.title', op: 'includes', value: 'ch' }), ['The Gem litter', 'Ziva × Boone', 'Peaches × Boone']);
  assert.deepEqual(litters({ field: 'dam.has_titles', op: 'yes' }), ['The Gem litter']);
  // Pearl's sire is Rocky by name only: no condition on his fields holds, "no" included.
  assert.deepEqual(litters({ field: 'sire.has_titles', op: 'no' }), []);
  assert.deepEqual(litters({ field: 'sire.call_name', op: 'is', value: 'rocky' }), ['Pearl']);
  // Standard colours: every pup, or any pup.
  const std = ['black & white', 'seal & white', 'brindle & white'];
  assert.deepEqual(litters({ field: 'pups.color', op: 'all_of', value: std }), ['Ziva × Boone']);
  assert.deepEqual(litters({ field: 'pups.color', op: 'any_of', value: std }), ['The Gem litter', 'Ziva × Boone']);
  assert.deepEqual(litters({ field: 'stage', op: 'is', value: 'available_soon' }), ['The Gem litter']);

  const pups = (...where) => names(snap, { id: 'p', type: 'pups', where });
  assert.deepEqual(pups(), ['Opal', 'Diamond', 'Onyx', 'Contessa'].filter((n) => snap.litters.some((l) => l.puppies.some((p) => p.name === n))));
  assert.deepEqual(pups({ field: 'status', op: 'is', value: 'not_open' }), ['Opal', 'Diamond']);
  assert.deepEqual(pups({ field: 'color', op: 'is', value: 'fawn' }), ['Diamond']);
  assert.deepEqual(pups({ field: 'litter.stage', op: 'is', value: 'older' }), ['Contessa']);
});

test('a condition is cleaned: a wrong ask becomes the first, an unfinished one is kept and leaves nothing out', async () => {
  const { snap } = await site();
  assert.deepEqual(cleanCond('dog', { field: 'color', op: 'yes', value: 'x' }), { field: 'color', op: 'is', value: 'x' });
  assert.deepEqual(cleanCond('dog', { field: 'sex', op: 'is', value: 'other' }), { field: 'sex', op: 'is', value: '' });
  assert.deepEqual(cleanCond('dog', { field: 'date_of_birth', op: 'before', value: 'soon' }), { field: 'date_of_birth', op: 'before', value: '' });
  assert.equal(cleanCond('dog', { field: 'nothing', op: 'is', value: 'x' }), null);
  assert.equal(names(snap, { id: 'd', type: 'dogs', where: [{ field: 'color', op: 'one_of', value: [] }] }).length, snap.dogs.length);
});

test('order by any field, values missing last either way', async () => {
  const { snap } = await site();
  const by = (order) => names(snap, { id: 'd', type: 'dogs', where: [], order });
  assert.deepEqual(by('date_of_birth:up'), ['Peaches', 'Boone', 'Willow', 'Ziva', 'Pearl', 'Duke']);
  assert.deepEqual(by('date_of_birth:down'), ['Ziva', 'Willow', 'Boone', 'Peaches', 'Pearl', 'Duke']);
  assert.deepEqual(by('color:up').slice(0, 2), ['Pearl', 'Boone']);
  assert.equal(cleanBlock({ id: 'd', type: 'dogs', order: 'a_parent.title:up' }).order, 'own');
});

test('groups: a heading per value in the field\'s order, the owner\'s words over it, one limit for all', async () => {
  const { draw } = await site();
  const b = cleanBlock({ ...newBlock('dogs', 'dogs-2'), style: 'flip', group: 'sex', gw: { male: 'Our boys' }, w: { eyebrow: 'Dogs', heading: 'By sex' } });
  const html = draw([b]);
  const sec = html.slice(html.indexOf('By sex'));
  assert.match(sec, /<div class="head" id="g-dogs-2-female"><h3>Girls<\/h3><\/div><div class="grid( narrow-grid)?">[^]*<div class="head mt-26" id="g-dogs-2-male"><h3>Our boys<\/h3><\/div><div class="grid( narrow-grid)?">/);
  assert.ok(sec.indexOf('Willow') < sec.indexOf('Our boys') && sec.indexOf('Boone') > sec.indexOf('Our boys'));
  // Grouped by titles: a dog with two is under both; with none, under Other, last.
  const t = draw([cleanBlock({ ...newBlock('dogs', 'dogs-2'), style: 'flip', where: [], group: 'title', w: { heading: 'By title' } })]);
  assert.deepEqual([...t.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]), ['CH', 'GCH', 'Other']);
  // Words for a group, kept only while it's grouped.
  assert.deepEqual(cleanBlock({ ...b, group: '' }).gw, {});
});

test('Pup cards: the pups its conditions hold for, as the Puppies page\'s flip cards', async () => {
  const { draw } = await site();
  const b = cleanBlock({ ...newBlock('pups', 'pups-2'), where: [{ field: 'color', op: 'one_of', value: ['fawn'] }] });
  const html = draw([b]);
  assert.match(html, /<span class="eyebrow">Puppies<\/span><h2>Available puppies<\/h2>/);
  assert.equal((html.match(/<div class="flip" tabindex="0" role="button" aria-label="Diamond/g) ?? []).length, 1);
  assert.doesNotMatch(html, /aria-label="Opal/);
  // Nothing matching: the block hides.
  assert.doesNotMatch(draw([cleanBlock({ ...b, where: [{ field: 'color', op: 'is', value: 'lilac' }] })]), /Available puppies/);
});

test('an older snapshot whose blocks still have filters draws the same as the new form', async () => {
  const { snap } = await site();
  const old = [{ ...HOME_DEFAULT.find((x) => x.id === 'dogs'), where: undefined, f: { sex: 'female', status: ['active', 'retired'] }, order: 'name' },
    { ...HOME_DEFAULT.find((x) => x.id === 'litters'), where: undefined, f: { stage: ['current'] } }].map((b) => JSON.parse(JSON.stringify(b)));
  const page = (home) => renderPage({ ...snap, layout: { ...snap.layout, home } }, { path: '/', origin: 'https://x', today: TODAY, preview: true }).html;
  assert.equal(page(old), page(old.map(cleanBlock)));
  assert.match(page(old), /Peaches/);
});

test("KennelOS's raw values as fields (contract step 4): a pup's disposition, a litter's KennelOS status, a dog's kinds of health test", async () => {
  const env = await makeEnv();
  const s = await addSite(env, 'akraw');
  await importContent(env, s.id, structuredClone(AK_SAMPLE));
  const db = env.DB.raw;
  const pup = db.prepare("SELECT p.id FROM puppies p JOIN litters l ON l.id = p.litter_id WHERE p.site_id = ? AND p.name LIKE 'Opal%'").get(s.id);
  db.prepare('UPDATE puppies SET disposition = ? WHERE id = ?').run('keeping', pup.id);
  const gem = db.prepare("SELECT id FROM litters WHERE site_id = ? AND slug = 'gem-2026'").get(s.id);
  db.prepare('UPDATE litters SET kennelos_status = ? WHERE id = ?').run('weaning', gem.id);
  const willow = db.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'willow'").get(s.id);
  db.prepare("INSERT INTO health_results (id, site_id, dog_id, test, result, normal, show, sort, test_type) VALUES ('hr1', ?, ?, 'DM', 'Clear', 1, 1, 1, 'genetic_test')").run(s.id, willow.id);
  const snap = await buildSnapshot(env, s.id);
  assert.deepEqual(names(snap, { id: 'p', type: 'pups', where: [{ field: 'disposition', op: 'is', value: 'keeping' }] }), ['Opal']);
  assert.deepEqual(names(snap, { id: 'l', type: 'litters', where: [{ field: 'kennelos_status', op: 'is', value: 'weaning' }] }), ['The Gem litter']);
  const gemPups = snap.litters.find((l) => l.slug === 'gem-2026').puppies.map((p) => p.name.replace(/\*$/, ''));
  assert.deepEqual(names(snap, { id: 'p', type: 'pups', where: [{ field: 'litter.kennelos_status', op: 'is', value: 'weaning' }] }), gemPups);
  assert.deepEqual(names(snap, { id: 'd', type: 'dogs', f: {}, where: [{ field: 'test_kind', op: 'includes', value: 'genetic' }] }), ['Willow']);
  // Not sent yet: no condition on them holds.
  assert.deepEqual(names(snap, { id: 'l', type: 'litters', where: [{ field: 'kennelos_status', op: 'is', value: 'ready' }] }), []);
});

test("display rules over KennelOS's raw values: a litter card's line by its KennelOS status, a dog's health results by kind", async () => {
  const { DEFAULT_RULES } = await import('../src/content/rules.js');
  const env = await makeEnv();
  const s = await addSite(env, 'akshow');
  await importContent(env, s.id, structuredClone(AK_SAMPLE));
  const db = env.DB.raw;
  db.prepare("UPDATE litters SET kennelos_status = 'weaning' WHERE site_id = ? AND slug = 'gem-2026'").run(s.id);
  const willow = db.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'willow'").get(s.id);
  db.prepare('DELETE FROM health_results WHERE dog_id = ?').run(willow.id);
  const ins = db.prepare("INSERT INTO health_results (id, site_id, dog_id, test, result, normal, show, sort, test_type) VALUES (?, ?, ?, ?, 'Clear', 1, 1, ?, ?)");
  ins.run('h1', s.id, willow.id, 'DM', 1, 'genetic_test');
  ins.run('h2', s.id, willow.id, 'Hips', 2, 'ofa_pennhip');
  ins.run('h3', s.id, willow.id, 'Her own note', 3, null);
  const snap = await buildSnapshot(env, s.id);
  const draw = (rules, p) => renderPage({ ...snap, rules }, { path: p, origin: 'https://x', today: TODAY, preview: true }).html;
  const card = (html) => html.match(/<article class="litter">[\s\S]*?<\/article>/g).find((a) => a.includes('Gem'));

  // As before by default: the usual line, one list under Health testing.
  const plain = structuredClone(DEFAULT_RULES);
  assert.match(card(draw(plain, '/')), /<span class="eyebrow">(Coming up|Current litter|Older puppies)<\/span>/);
  const page = draw(plain, '/dogs/willow');
  assert.equal(page.match(/<span class="eyebrow">Health testing<\/span>/g).length, 1);
  assert.doesNotMatch(page, /Genetic testing/);

  const set = structuredClone(DEFAULT_RULES);
  set.words.litter_kos_weaning = 'Weaning now';
  set.dogs.health_groups = true;
  assert.match(card(draw(set, '/')), /<span class="eyebrow">Weaning now<\/span>/);
  const grouped = draw(set, '/dogs/willow');
  const heads = [...grouped.matchAll(/<span class="eyebrow">([^<]+)<\/span><ul class="tests">/g)].map((m) => m[1]);
  assert.deepEqual(heads, ['Health testing', 'Genetic testing', 'OFA / PennHIP'], 'untyped first, then each kind present, in order');
});
