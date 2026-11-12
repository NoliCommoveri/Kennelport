// A dog's sire and dam (migration 0030), and the chain they make: a featured offspring
// she sold is an outside dog ("not my dog") whose sire or dam is her dog, and its own
// offspring chain on from it, so a grand offspring shows on her dog's page too
// (docs/plans/kennelos-contract.md B6, as the owner set it on 2026-11-12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { cleanBlock } = await import('../src/content/blocks.js');
const { blockRows } = await import('../src/render/parts.js');
const { importContent, exportContent } = await import('../src/content/io.js');
const { saveRecord, removeRecord, getRecord, KINDS } = await import('../src/content/records.js');
// A record as its form sends it: its fields only.
const asForm = (r) => Object.fromEntries(Object.keys(KINDS.dogs.fields).map((k) => [k, r[k] ?? null]));
const { AK_SAMPLE } = await import('../src/content/akSample.js');

const TODAY = '2026-11-20';

async function site(edit = () => {}) {
  const env = await makeEnv();
  const s = await addSite(env, 'akparents');
  const doc = structuredClone(AK_SAMPLE);
  // Ziva is Boone's daughter she kept. Rocket is a son she sold and features (not her
  // dog), and Comet is Rocket's son: Boone's grand offspring. Pearl's sire is a name.
  Object.assign(doc.dogs.find((d) => d.slug === 'ziva'), { sire: 'boone', dam: 'willow' });
  Object.assign(doc.dogs.find((d) => d.slug === 'pearl'), { sire_name: 'Rocky of Oakridge' });
  doc.dogs.push(
    { slug: 'rocket', call_name: 'Rocket', sex: 'male', outside: true, owner_name: 'The Lees', sire: 'boone', dam: 'willow', titles: 'CH' },
    { slug: 'comet', call_name: 'Comet', sex: 'male', outside: true, owner_name: 'Sky Bostons', sire: 'rocket', dam_name: 'Luna' },
  );
  edit(doc);
  await importContent(env, s.id, doc);
  const snap = await buildSnapshot(env, s.id);
  const page = (p) => renderPage(snap, { path: p, origin: 'https://x', today: TODAY, preview: true }).html;
  return { env, s, snap, page };
}
const idOf = (snap, slug) => snap.dogs.find((d) => d.slug === slug).id;

test('a dog\'s sire and dam: imported by slug, exported the same, a name for one not on the site', async () => {
  const { env, s, snap } = await site();
  const ziva = snap.dogs.find((d) => d.slug === 'ziva');
  assert.equal(ziva.sire_id, idOf(snap, 'boone'));
  assert.equal(ziva.dam_id, idOf(snap, 'willow'));
  assert.equal(snap.dogs.find((d) => d.slug === 'pearl').sire_name, 'Rocky of Oakridge');
  const back = await exportContent(env, s.id);
  const by = (slug) => back.dogs.find((d) => d.slug === slug);
  assert.equal(by('comet').sire, 'rocket');
  assert.equal(by('comet').dam_name, 'Luna');
  assert.equal(by('ziva').dam, 'willow');
  assert.equal(by('willow').sire, undefined);
  // A parent that isn't in the list, or the dog itself, is refused.
  await assert.rejects(importContent(env, s.id, { ...back, dogs: back.dogs.map((d) => (d.slug === 'comet' ? { ...d, sire: 'nobody' } : d)) }), /no dog with slug "nobody"/);
  await assert.rejects(importContent(env, s.id, { ...back, dogs: back.dogs.map((d) => (d.slug === 'comet' ? { ...d, sire: 'comet' } : d)) }), /own parent/);
});

test('her dog\'s page: its sire and dam among its facts, then offspring and grand offspring', async () => {
  const { page } = await site();
  const ziva = page('/dogs/ziva');
  assert.match(ziva, /<dt>Sire<\/dt><dd><a href="\/dogs\/boone">Boone\*<\/a><\/dd><dt>Dam<\/dt><dd><a href="\/dogs\/willow">Willow<\/a><\/dd>/);
  assert.match(page('/dogs/pearl'), /<dt>Sire<\/dt><dd>Rocky of Oakridge<\/dd>/);
  const boone = page('/dogs/boone');
  const off = boone.slice(boone.indexOf('<span class="eyebrow">Offspring</span>'));
  assert.ok(off.length < boone.length, 'an Offspring part');
  // Ziva (kept) and Rocket (sold, featured) are his offspring; Comet, Rocket's son, his grand offspring.
  const grand = off.indexOf('<span class="eyebrow">Grand offspring</span>');
  assert.ok(grand > 0);
  assert.match(off.slice(0, grand), /href="\/dogs\/ziva"[^]*href="\/dogs\/rocket"/);
  assert.match(off.slice(grand), /href="\/dogs\/comet"[^]*Owned by Sky Bostons/);
  assert.doesNotMatch(off.slice(grand), /href="\/dogs\/rocket"/);
  // Rocket's own page: his sire, and Comet as his offspring.
  const rocket = page('/dogs/rocket');
  assert.match(rocket, /<dt>Sire<\/dt><dd><a href="\/dogs\/boone">/);
  assert.match(rocket, /<span class="eyebrow">Offspring<\/span>[^]*href="\/dogs\/comet"/);
  // A dog with none has no part.
  assert.doesNotMatch(page('/dogs/comet'), /<span class="eyebrow">Offspring<\/span>/);
});

test('blocks: a parent, descends from, life stage and where it lives', async () => {
  const { snap } = await site();
  const names = (where) => blockRows(snap, cleanBlock({ id: 'd', type: 'dogs', where }), TODAY).map((d) => d.call_name.replace(/\*$/, ''));
  assert.deepEqual(names([{ field: 'parent', op: 'includes', value: 'Boone*' }]), ['Ziva', 'Rocket']);
  assert.deepEqual(names([{ field: 'descends_from', op: 'includes', value: 'boone*' }]), ['Ziva', 'Rocket', 'Comet']);
  // Boone's featured offspring and grand offspring she doesn't own.
  assert.deepEqual(names([{ field: 'descends_from', op: 'includes', value: 'boone*' }, { field: 'residence', op: 'is', value: 'not_mine' }]), ['Rocket', 'Comet']);
  assert.deepEqual(names([{ field: 'residence', op: 'one_of', value: ['home'] }, { field: 'sire.call_name', op: 'is', value: 'rocky of oakridge' }]), ['Pearl']);
});

test('a parent not shown on the site is named, never linked; a removed one leaves its offspring', async () => {
  const { env, s } = await site((doc) => { doc.dogs.find((d) => d.slug === 'boone').show_on_site = false; });
  const snap = await buildSnapshot(env, s.id);
  const ziva = snap.dogs.find((d) => d.slug === 'ziva');
  assert.equal(ziva.sire_id, undefined);
  assert.equal(ziva.sire_name, 'Boone*');
  const boone = (await env.DB.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'boone'").bind(s.id).first()).id;
  await removeRecord(env, s.id, 'dogs', boone);
  const left = await env.DB.prepare("SELECT sire_id FROM dogs WHERE site_id = ? AND slug IN ('ziva', 'rocket')").bind(s.id).all();
  assert.deepEqual(left.results.map((r) => r.sire_id), [null, null]);
});

test('saving a dog: never its own parent; one life stage', async () => {
  const { env, s } = await site();
  const comet = (await env.DB.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'comet'").bind(s.id).first()).id;
  const cur = asForm(await getRecord(env, s.id, 'dogs', comet));
  await assert.rejects(saveRecord(env, s.id, 'dogs', comet, { ...cur, sire_id: comet }), /own parent/);
  const pearl = (await env.DB.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'pearl'").bind(s.id).first()).id;
  const p = asForm(await getRecord(env, s.id, 'dogs', pearl));
  const saved = await saveRecord(env, s.id, 'dogs', pearl, { ...p, upcoming: 1, for_sale: 1 });
  assert.deepEqual([saved.upcoming, saved.for_sale], [0, 1]);
  const retired = await saveRecord(env, s.id, 'dogs', pearl, { ...p, status: 'retired', upcoming: 1 });
  assert.deepEqual([retired.upcoming, retired.for_sale], [0, 0]);
});
